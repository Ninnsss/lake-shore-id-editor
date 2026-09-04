<?php
header('Content-Type: application/json; charset=utf-8');
/*
 * CORS: only reflect the Origin (with credentials) for known frontend origins.
 * This prevents cross-site credential theft while keeping the Vite dev server
 * (http://localhost:5173) and any production origin in ALLOWED_ORIGINS working.
 * Same-origin requests (production deploy under /lake-shore-id-editor) send no
 * Origin header and therefore need no CORS headers at all.
 * Configure ALLOWED_ORIGINS in config.php / environment for production domains.
 */
$allowedOrigins = defined('ALLOWED_ORIGINS') ? ALLOWED_ORIGINS : [
    'http://localhost:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php.php';

function response($data, int $status = 200): void { http_response_code($status); echo json_encode($data); exit; }
function input(): array { $raw=file_get_contents('php://input'); $json=json_decode($raw,true); return is_array($json)?$json:$_POST; }
function uploadImage(string $field, string $folder): string {
  if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return '';
  $allowedMimes=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'];
  $mime=mime_content_type($_FILES[$field]['tmp_name']);
  if (!isset($allowedMimes[$mime])) response(['success'=>false,'message'=>'Only PNG, JPG or WEBP images are allowed'],422);
  $dir=__DIR__.'/uploads/'.$folder; if (!is_dir($dir)) mkdir($dir,0775,true);
  $filename=$folder.'_'.time().'_'.bin2hex(random_bytes(4)).'.'.$allowedMimes[$mime];
  /* Security: also validate the file extension against the allowed list.
   * Without this an attacker could upload a .php file with image MIME bytes. */
  $ext = strtolower(pathinfo($_FILES[$field]['name'], PATHINFO_EXTENSION));
  $allowedExts = ['png','jpg','jpeg','webp'];
  if (!in_array($ext, $allowedExts, true)) {
    response(['success'=>false,'message'=>'Invalid file extension. Only PNG, JPG or WEBP images are allowed'],422);
  }
  if (!move_uploaded_file($_FILES[$field]['tmp_name'],$dir.'/'.$filename)) response(['success'=>false,'message'=>'Upload failed'],500);
  return 'uploads/'.$folder.'/'.$filename;
}
function uploadDocument(string $field, string $folder): string {
  if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return '';
  $allowedMimes=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp','application/pdf'=>'pdf'];
  $mime=mime_content_type($_FILES[$field]['tmp_name']);
  if (!isset($allowedMimes[$mime])) response(['success'=>false,'message'=>'Only PNG, JPG, WEBP images or PDF receipt documents are allowed'],422);
  $dir=__DIR__.'/uploads/'.$folder; if (!is_dir($dir)) mkdir($dir,0775,true);
  $filename=$folder.'_'.time().'_'.bin2hex(random_bytes(4)).'.'.$allowedMimes[$mime];
  /* Security: validate extension in addition to MIME type */
  $ext = strtolower(pathinfo($_FILES[$field]['name'], PATHINFO_EXTENSION));
  $allowedExts = ['png','jpg','jpeg','webp','pdf'];
  if (!in_array($ext, $allowedExts, true)) {
    response(['success'=>false,'message'=>'Invalid file extension. Only PNG, JPG, WEBP images or PDF are allowed'],422);
  }
  if (!move_uploaded_file($_FILES[$field]['tmp_name'],$dir.'/'.$filename)) response(['success'=>false,'message'=>'Upload failed'],500);
  return 'uploads/'.$folder.'/'.$filename;
}
$action=$_GET['action']??'';
try {
  $pdo=db();

  if ($action==='login' && $_SERVER['REQUEST_METHOD']==='POST') {
    $d=input();
    $username=trim((string)($d['username']??''));
    $password=(string)($d['password']??'');
    if ($username==='' || $password==='') response(['success'=>false,'message'=>'Username and password are required'],422);
    /* BINARY forces a case-sensitive username match (AUTH-010). */
    $stmt=$pdo->prepare('SELECT id,username,password,full_name,role,is_active FROM users WHERE BINARY username=? LIMIT 1');
    $stmt->execute([$username]);
    $user=$stmt->fetch();
    if (!$user || (int)$user['is_active']!==1 || !password_verify($password,$user['password'])) {
      response(['success'=>false,'message'=>'Invalid username or password'],401);
    }
    loginUser($user);
    response(['success'=>true,'data'=>currentUser(),'csrf_token'=>generateCsrfToken()]);
  }

  if ($action==='logout' && $_SERVER['REQUEST_METHOD']==='POST') {
    logoutUser();
    response(['success'=>true]);
  }

  if ($action==='me' && $_SERVER['REQUEST_METHOD']==='GET') {
    $u=currentUser();
    if (!$u) response(['success'=>false,'message'=>'Not authenticated'],401);
    response(['success'=>true,'data'=>$u,'csrf_token'=>generateCsrfToken()]);
  }

  if ($action==='forgotPassword' && $_SERVER['REQUEST_METHOD']==='POST') {
    $d=input(); $username=trim((string)($d['username']??''));
    if($username==='') response(['success'=>false,'message'=>'Enter your username or email'],422);
    $stmt=$pdo->prepare('SELECT id,is_active FROM users WHERE BINARY username=? LIMIT 1');$stmt->execute([$username]);$u=$stmt->fetch();
    if(!$u || (int)$u['is_active']!==1) response(['success'=>true,'message'=>'If the account exists, a reset token has been generated.']);
        $token=bin2hex(random_bytes(16));
    $pdo->prepare('INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))')->execute([(int)$u['id'],hash('sha256',$token)]);
    /* NOTE: The reset token must be sent out-of-band (e.g. email).
     * It is deliberately NOT returned in the API response to prevent token disclosure. */
    response(['success'=>true,'message'=>'If the account exists, a reset token has been generated. Valid for 30 minutes.']);
  }

  if ($action==='resetPassword' && $_SERVER['REQUEST_METHOD']==='POST') {
    $d=input(); $token=(string)($d['token']??''); $password=(string)($d['password']??'');
    if($token===''||strlen($password)<6) response(['success'=>false,'message'=>'A valid token and a password of at least 6 characters are required'],422);
    $stmt=$pdo->prepare('SELECT id,user_id FROM password_resets WHERE token_hash=? AND used=0 AND expires_at>NOW() ORDER BY id DESC LIMIT 1');
    $stmt->execute([hash('sha256',$token)]);$pr=$stmt->fetch();
    if(!$pr) response(['success'=>false,'message'=>'Invalid or expired reset token'],422);
    $pdo->prepare('UPDATE users SET password=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),(int)$pr['user_id']]);
    $pdo->prepare('UPDATE password_resets SET used=1 WHERE id=?')->execute([(int)$pr['id']]);
    response(['success'=>true,'message'=>'Password updated. You can now sign in.']);
  }

  /*
  |--------------------------------------------------------------------------
  | Public student self-service ID creation (no login required)
  |--------------------------------------------------------------------------
  */
  if ($action==='publicSignatory' && $_SERVER['REQUEST_METHOD']==='GET') {
    $type=trim($_GET['type']??'');
    $map=['COLLEGE'=>'Sherill S. Villaluz','JUNIOR_HIGH'=>'Annabelle V. Molina','SENIOR_HIGH'=>'Annabelle V. Molina'];
    $name=$map[$type]??'';
    if ($name==='') response(['success'=>true,'data'=>null]);
    $stmt=$pdo->prepare('SELECT id,full_name,signature_path FROM signatories WHERE full_name=? AND is_active=1 LIMIT 1');
    $stmt->execute([$name]);
    $row=$stmt->fetch();
    response(['success'=>true,'data'=>$row ?: ['id'=>null,'full_name'=>$name,'signature_path'=>'']]);
  }
  if ($action==='studentUploadPhoto' && $_SERVER['REQUEST_METHOD']==='POST') {
    response(['success'=>true,'path'=>uploadImage('photo','students')]);
  }
  if ($action==='studentSaveCard' && $_SERVER['REQUEST_METHOD']==='POST') {
    $data=input();
    $studentName=trim((string)($data['student_name']??''));
    $idType=trim((string)($data['id_type']??''));
    /* Input length validation */
    $course=trim((string)($data['course']??''));
    if ($studentName !== '' && strlen($studentName) > 150) response(['success'=>false,'message'=>'Student name is too long (max 150 characters)'],422);
    if (strlen($idType) > 20) response(['success'=>false,'message'=>'Invalid department'],422);
    if (strlen($course) > 255) response(['success'=>false,'message'=>'Course is too long'],422);
    if ($studentName==='') response(['success'=>false,'message'=>'Please enter the student full name'],422);
    if (!in_array($idType,['COLLEGE','JUNIOR_HIGH','SENIOR_HIGH'],true)) response(['success'=>false,'message'=>'Please select a valid department'],422);
    $fields=['student_name','id_type','course','grade_level','section_name','student_number','student_id_number','lrn','academic_year','school_year','photo_path','address_line1','address_line2','emergency_label','emergency_contact','emergency_phone','terms_title','term_1','term_2','term_3','institution_name','institution_address','mobile_no','telephone_no','email_address','signatory_id','signatory_name','signature_path','template_id'];
    $values=[];foreach($fields as $f)$values[$f]=trim((string)($data[$f]??''));
    /* Duplicate prevention */
    $sn=trim((string)$values['student_number']);
    $sid=trim((string)$values['student_id_number']);
    $lrn=trim((string)$values['lrn']);
    $dupCols=[];$dupParams=[];
    if ($sn !== '')  { $dupCols[]='student_number=?';      $dupParams[]=$sn; }
    if ($sid !== '') { $dupCols[]='student_id_number=?';   $dupParams[]=$sid; }
    if ($lrn !== '') { $dupCols[]='lrn=?';                 $dupParams[]=$lrn; }
    if ($dupCols) {
      array_unshift($dupParams, $studentName);
      $dupCheck=$pdo->prepare('SELECT id FROM id_cards WHERE student_name=? AND ('.implode(' OR ',$dupCols).') LIMIT 1');
      $dupCheck->execute($dupParams);
      $dup = $dupCheck->fetch();
      if ($dup) response(['success'=>false,'message'=>'A student with this name and student number/ID/LRN already exists.',409]);
    }
    $cols=implode(',',$fields);$pars=implode(',',array_map(fn($f)=>":$f",$fields));
    $stmt=$pdo->prepare("INSERT INTO id_cards($cols) VALUES($pars)");$stmt->execute($values);
    $id=(int)$pdo->lastInsertId();
    response(['success'=>true,'id'=>$id,'message'=>'Your ID request has been submitted successfully.']);
  }
    if ($action==='lostIdRequest' && $_SERVER['REQUEST_METHOD']==='POST') {
    $data=input();
    $studentName=trim((string)($data['student_name']??''));
    $idType=trim((string)($data['id_type']??''));
    if ($studentName==='') response(['success'=>false,'message'=>'Please enter the student full name'],422);
    if (!in_array($idType,['COLLEGE','JUNIOR_HIGH','SENIOR_HIGH'],true)) $idType='COLLEGE';
    $course=trim((string)($data['course']??''));
    $gradeLevel=trim((string)($data['grade_level']??''));
    $sectionName=trim((string)($data['section_name']??''));
    $studentNumber=trim((string)($data['student_number']??''));
    $lrn=trim((string)($data['lrn']??''));

    /*
     * The lost ID report must refer to an ID that already exists in the
     * system. The details the student filled in are used as the search
     * reference against the id_cards table (name + student number / ID
     * number / LRN). If no matching ID is created in the system the
     * request is rejected and nothing is saved — including the receipt,
     * which is uploaded ONLY after a matching ID is found.
     */
    $identifier=$studentNumber!==''?$studentNumber:$lrn;
    if ($identifier==='') {
      response(['success'=>false,'message'=>'Please provide the Student / ID Number (or LRN) so your ID can be checked in the system.'],422);
    }
    $stmt=$pdo->prepare('SELECT id,student_name,id_type,student_number,student_id_number,lrn,course,grade_level,section_name FROM id_cards WHERE student_name=? AND (student_number=? OR student_id_number=? OR lrn=?) ORDER BY (id_type=?) DESC, updated_at DESC LIMIT 1');
    $stmt->execute([$studentName,$identifier,$identifier,$identifier,$idType]);
    $m=$stmt->fetch();
    if (!$m) {
      response([
        'success'=>false,
        'message'=>'No ID found in the system. The details you entered do not match any ID created in the ID Management System. Please make sure your ID has already been created in the system before reporting it as lost.',
      ],404);
    }
    $referenceCardId=(int)$m['id'];

    // Upload receipt only AFTER we've confirmed the ID exists in the system
    $receipt=uploadDocument('receipt','receipts');

    $pdo->prepare("INSERT INTO lost_id_requests(student_name,id_type,course,grade_level,section_name,student_number,lrn,reference_card_id,status,receipt_path) VALUES(?,?,?,?,?,?,?,?,'pending',?)")
      ->execute([$studentName,$idType,$course,$gradeLevel,$sectionName,$studentNumber,$lrn,$referenceCardId,$receipt]);
    response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'reference_card_id'=>$referenceCardId,'message'=>'Your lost ID reprint request has been submitted. The administrator will review your request.']);
  }

  requireLogin();

  if ($action==='uploadPhoto' && $_SERVER['REQUEST_METHOD']==='POST') { verifyCsrf(); response(['success'=>true,'path'=>uploadImage('photo','students')]); }
  if ($action==='settings' && $_SERVER['REQUEST_METHOD']==='GET') { $rows=$pdo->query('SELECT setting_key,setting_value FROM system_settings')->fetchAll(); $out=[]; foreach($rows as $r)$out[$r['setting_key']]=$r['setting_value']; response(['success'=>true,'data'=>$out]); }
  if ($action==='signatories' && $_SERVER['REQUEST_METHOD']==='GET') response(['success'=>true,'data'=>$pdo->query('SELECT * FROM signatories WHERE is_active=1 ORDER BY full_name')->fetchAll()]);
    if ($action==='saveSignatory' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $id=(int)($_POST['id']??0); $name=trim($_POST['full_name']??''); $position=trim($_POST['position_title']??''); if($name==='') response(['success'=>false,'message'=>'Signatory name is required'],422);
    $path=uploadImage('signature','signatures') ?: trim($_POST['signature_path']??''); if($path==='') response(['success'=>false,'message'=>'Signature image is required'],422);
    if($id){$pdo->prepare('UPDATE signatories SET full_name=?,position_title=?,signature_path=? WHERE id=?')->execute([$name,$position,$path,$id]);}
    else{$pdo->prepare('INSERT INTO signatories(full_name,position_title,signature_path) VALUES(?,?,?)')->execute([$name,$position,$path]);$id=(int)$pdo->lastInsertId();}
    response(['success'=>true,'id'=>$id]);
  }
  if ($action==='cards' && $_SERVER['REQUEST_METHOD']==='GET') {
    $search=trim($_GET['search']??''); $type=trim($_GET['type']??''); $sql='SELECT * FROM id_cards'; $where=[];$params=[];
    if($search!==''){$where[]='(student_name LIKE ? OR student_number LIKE ? OR student_id_number LIKE ? OR lrn LIKE ?)';$like="%$search%";$params=array_merge($params,[$like,$like,$like,$like]);}
    if($type!==''){$where[]='id_type=?';$params[]=$type;}
    if($where)$sql.=' WHERE '.implode(' AND ',$where); $sql.=' ORDER BY updated_at DESC'; $stmt=$pdo->prepare($sql);$stmt->execute($params);response(['success'=>true,'data'=>$stmt->fetchAll()]);
  }
  if ($action==='card' && $_SERVER['REQUEST_METHOD']==='GET') { $stmt=$pdo->prepare('SELECT * FROM id_cards WHERE id=?');$stmt->execute([(int)($_GET['id']??0)]);$row=$stmt->fetch();if(!$row)response(['success'=>false,'message'=>'Record not found'],404);response(['success'=>true,'data'=>$row]); }
  if ($action==='saveCard' && $_SERVER['REQUEST_METHOD']==='POST') {
    verifyCsrf(); $data=input(); $fields=['student_name','id_type','course','grade_level','section_name','student_number','student_id_number','lrn','academic_year','school_year','photo_path','address_line1','address_line2','emergency_label','emergency_contact','emergency_phone','terms_title','term_1','term_2','term_3','institution_name','institution_address','mobile_no','telephone_no','email_address','signatory_id','signatory_name','signature_path','template_id'];
    $values=[];foreach($fields as $f)$values[$f]=trim((string)($data[$f]??''));$id=(int)($data['id']??0);
    if($id){
      /*
       * ID status lifecycle: created -> done -> edited / printed.
       * Editing a card that was already completed ("done") or already
       * printed automatically flags it as "edited" so staff can see the
       * ID changed after it was finalised / printed.
       */
      $cur=$pdo->prepare('SELECT status FROM id_cards WHERE id=?');$cur->execute([$id]);$curRow=$cur->fetch();
      $curStatus=$curRow?trim((string)$curRow['status']):'created';
      $newStatus=in_array($curStatus,['done','printed'],true)?'edited':($curStatus!==''?$curStatus:'created');
      $values['status']=$newStatus;
      $sets=implode(',',array_map(fn($f)=>"$f=:$f",$fields));
      $values['id']=$id;$stmt=$pdo->prepare("UPDATE id_cards SET $sets, status=:status WHERE id=:id");$stmt->execute($values);
    }else{
      $values['status']='created';
      $allFields=array_merge($fields,['status']);
      $cols=implode(',',$allFields);$pars=implode(',',array_map(fn($f)=>":$f",$allFields));$stmt=$pdo->prepare("INSERT INTO id_cards($cols) VALUES($pars)");$stmt->execute($values);$id=(int)$pdo->lastInsertId();
      $newStatus='created';
    }
    response([
      'success'=>true,
      'id'=>$id,
      'status'=>$newStatus,
      'message'=>($newStatus==='edited')
        ? 'ID updated — status is now "Edited" (changed after completion/printing).'
        : 'ID saved successfully (Status: Created).',
    ]);
  }
  if ($action==='deleteCard' && $_SERVER['REQUEST_METHOD']==='POST') { verifyCsrf(); $d=input();$pdo->prepare('DELETE FROM id_cards WHERE id=?')->execute([(int)($d['id']??0)]);response(['success'=>true]); }
  /*
   * ID status control.
   *  - "done"    : admin marked the ID as completed / ready for printing
   *  - "printed" : records the print job on the Smart ID 51 (timestamp + counter)
   */
  if ($action==='setCardStatus' && $_SERVER['REQUEST_METHOD']==='POST') {
    verifyCsrf(); $d=input(); $id=(int)($d['id']??0); $status=(string)($d['status']??'');
    $allowed=['created','done','edited','printed'];
    if($id<=0||!in_array($status,$allowed,true)) response(['success'=>false,'message'=>'Invalid card id or status'],422);
    if($status==='printed'){
      $pdo->prepare("UPDATE id_cards SET status='printed', printed_at=NOW(), print_count=print_count+1 WHERE id=?")->execute([$id]);
    }else{
      $pdo->prepare('UPDATE id_cards SET status=? WHERE id=?')->execute([$status,$id]);
    }
    $stmt=$pdo->prepare('SELECT id,status,printed_at,print_count FROM id_cards WHERE id=?');$stmt->execute([$id]);
    response(['success'=>true,'data'=>$stmt->fetch(),'message'=>'Status updated']);
  }
  /* ===== ID Template module ===== */
  if ($action==='templates' && $_SERVER['REQUEST_METHOD']==='GET') {
    $rows=$pdo->query("SELECT * FROM id_templates ORDER BY FIELD(id_type,'COLLEGE','JUNIOR_HIGH','SENIOR_HIGH'), is_system DESC, updated_at DESC")->fetchAll();
    foreach($rows as &$r){ $r['fields_json']=($r['fields_json']??'')?json_decode($r['fields_json'],true):[]; }
    response(['success'=>true,'data'=>$rows]);
  }
  if ($action==='saveTemplate' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf();
    $id=(int)($_POST['id']??0);
    $name=trim((string)($_POST['name']??''));

    /* System templates (the built-in Original LSC Design) are protected. */
    if ($id>0) {
      $sv=$pdo->prepare('SELECT is_system FROM id_templates WHERE id=?');
      $sv->execute([$id]);
      $existing=$sv->fetch();
      if ($existing && (int)$existing['is_system']===1) {
        response(['success'=>false,'message'=>'The Original LSC Design is a protected system template and cannot be edited or deleted.'],403);
      }
    }

    $idType=trim((string)($_POST['id_type']??''));
    if($name==='') response(['success'=>false,'message'=>'Template name is required'],422);
    if(!in_array($idType,['COLLEGE','JUNIOR_HIGH','SENIOR_HIGH'],true)) $idType='COLLEGE';
    $fieldsRaw=trim((string)($_POST['fields_json']??'[]'));
    $fieldsArr=json_decode($fieldsRaw,true);
    if(!is_array($fieldsArr)) $fieldsArr=[];
    $front=uploadImage('front_image','templates');
    $back=uploadImage('back_image','templates');
    $prevFront=trim((string)($_POST['front_image_prev']??''));
    $prevBack=trim((string)($_POST['back_image_prev']??''));
    if($front==='') $front=$prevFront;
    if($back==='') $back=$prevBack;
    if($id===0 && $front==='') response(['success'=>false,'message'=>'Please upload the FRONT design image (PNG or JPG) of the template'],422);
    $isActive=isset($_POST['is_active'])&&(string)($_POST['is_active'])==='1'?1:0;
    if($isActive){ $pdo->prepare('UPDATE id_templates SET is_active=0 WHERE id_type=?')->execute([$idType]); }
    $json=json_encode($fieldsArr,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    if($id){
      $pdo->prepare('UPDATE id_templates SET name=?,id_type=?,front_image=?,back_image=?,fields_json=?,is_active=? WHERE id=?')
        ->execute([$name,$idType,$front,$back,$json,$isActive,$id]);
    }else{
      $pdo->prepare('INSERT INTO id_templates(name,id_type,front_image,back_image,fields_json,is_active) VALUES(?,?,?,?,?,?)')
        ->execute([$name,$idType,$front,$back,$json,$isActive]);
      $id=(int)$pdo->lastInsertId();
    }
    response(['success'=>true,'id'=>$id,'message'=>'Template saved successfully']);
  }
  if ($action==='setActiveTemplate' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $d=input();
    $id=(int)($d['id']??0);
    $sv=$pdo->prepare('SELECT id_type FROM id_templates WHERE id=?');
    $sv->execute([$id]);
    $row=$sv->fetch();
    if(!$row) response(['success'=>false,'message'=>'Template not found'],404);
    $pdo->prepare('UPDATE id_templates SET is_active=0 WHERE id_type=?')->execute([$row['id_type']]);
    $pdo->prepare('UPDATE id_templates SET is_active=1 WHERE id=?')->execute([$id]);
    response(['success'=>true,'message'=>'Template set as active']);
  }
  if ($action==='deleteTemplate' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $d=input();
    $id=(int)($d['id']??0);
    $sv=$pdo->prepare('SELECT is_system FROM id_templates WHERE id=?');
    $sv->execute([$id]);
    $existing=$sv->fetch();
    if ($existing && (int)$existing['is_system']===1) {
      response(['success'=>false,'message'=>'The Original LSC Design is a protected system template and cannot be deleted.'],403);
    }
    $pdo->prepare('DELETE FROM id_templates WHERE id=?')->execute([$id]);
    response(['success'=>true,'message'=>'Template deleted']);
  }
  if ($action==='lostIdRequests' && $_SERVER['REQUEST_METHOD']==='GET') {
    $status=trim($_GET['status']??'');
    if ($status!=='') {
      $stmt=$pdo->prepare("SELECT * FROM lost_id_requests WHERE status=? ORDER BY FIELD(status,'pending','approved','reprinted','rejected'), updated_at DESC");
      $stmt->execute([$status]);
    } else {
      $stmt=$pdo->query("SELECT * FROM lost_id_requests ORDER BY FIELD(status,'pending','approved','reprinted','rejected'), updated_at DESC");
    }
    response(['success'=>true,'data'=>$stmt->fetchAll()]);
  }
  if ($action==='lostIdRequest' && $_SERVER['REQUEST_METHOD']==='GET') {
    $stmt=$pdo->prepare('SELECT * FROM lost_id_requests WHERE id=?');
    $stmt->execute([(int)($_GET['id']??0)]);
    $row=$stmt->fetch();
    if (!$row) response(['success'=>false,'message'=>'Request not found'],404);
    response(['success'=>true,'data'=>$row]);
  }
  if ($action==='updateLostIdRequest' && $_SERVER['REQUEST_METHOD']==='POST') {
    verifyCsrf(); $d=input();
    $id=(int)($d['id']??0);
    if ($id<=0) response(['success'=>false,'message'=>'Invalid request id'],422);
    $updates=[];$values=[];
    $allowedStatus=['pending','approved','reprinted','rejected'];
    if (isset($d['status']) && in_array($d['status'],$allowedStatus,true)) { $updates[]='status=?'; $values[]=$d['status']; }
    if (isset($d['reference_card_id'])) { $updates[]='reference_card_id=?'; $values[]=(int)$d['reference_card_id']; }
    if (array_key_exists('notes',$d)) { $updates[]='notes=?'; $values[]=trim((string)$d['notes']); }
    if (!$updates) response(['success'=>false,'message'=>'Nothing to update'],422);
    $values[]=$id;
    $pdo->prepare('UPDATE lost_id_requests SET '.implode(',',$updates).' WHERE id=?')->execute($values);
    response(['success'=>true,'message'=>'Request updated successfully']);
  }
  if ($action==='deleteLostIdRequest' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $d=input();
    $pdo->prepare('DELETE FROM lost_id_requests WHERE id=?')->execute([(int)($d['id']??0)]);
    response(['success'=>true,'message'=>'Request removed']);
  }
  if ($action==='users' && $_SERVER['REQUEST_METHOD']==='GET') {
    requireAdmin();
    response(['success'=>true,'data'=>$pdo->query('SELECT id,username,full_name,role,is_active,created_at FROM users ORDER BY id')->fetchAll()]);
  }
  if ($action==='saveUser' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $d=input();
    $id=(int)($d['id']??0); $username=trim((string)($d['username']??'')); $fullName=trim((string)($d['full_name']??''));
    $role=($d['role']??'staff')==='admin'?'admin':'staff'; $password=(string)($d['password']??'');
    $isActive=isset($d['is_active'])?((int)(bool)$d['is_active']):1;
    if($username===''||$fullName==='') response(['success'=>false,'message'=>'Username and full name are required'],422);
    if($password!==''&&strlen($password)<6) response(['success'=>false,'message'=>'Password must be at least 6 characters'],422);
    if(!$id&&$password==='') response(['success'=>false,'message'=>'Password is required for new users'],422);
    $dup=$pdo->prepare('SELECT id FROM users WHERE username=? AND id<>? LIMIT 1');$dup->execute([$username,$id]);
    if($dup->fetch()) response(['success'=>false,'message'=>'That username is already taken'],422);
    if($id===(int)$_SESSION['user_id']){$isActive=1;$role='admin';}
    if($id){
      if($password!==''){$pdo->prepare('UPDATE users SET username=?,full_name=?,role=?,is_active=?,password=? WHERE id=?')->execute([$username,$fullName,$role,$isActive,password_hash($password,PASSWORD_DEFAULT),$id]);}
      else{$pdo->prepare('UPDATE users SET username=?,full_name=?,role=?,is_active=? WHERE id=?')->execute([$username,$fullName,$role,$isActive,$id]);}
    }else{
      $pdo->prepare('INSERT INTO users(username,password,full_name,role,is_active) VALUES(?,?,?,?,1)')->execute([$username,password_hash($password,PASSWORD_DEFAULT),$fullName,$role]);
      $id=(int)$pdo->lastInsertId();
    }
    response(['success'=>true,'id'=>$id,'message'=>'User saved successfully']);
  }
  if ($action==='deleteUser' && $_SERVER['REQUEST_METHOD']==='POST') {
    requireAdmin(); verifyCsrf(); $d=input(); $id=(int)($d['id']??0);
    if($id===(int)$_SESSION['user_id']) response(['success'=>false,'message'=>'You cannot deactivate your own account'],422);
    $pdo->prepare('UPDATE users SET is_active=0 WHERE id=?')->execute([$id]);
    response(['success'=>true,'message'=>'User deactivated']);
  }
  response(['success'=>false,'message'=>'Unknown action'],404);
} catch(Throwable $e){response(['success'=>false,'message'=>$e->getMessage()],500);}

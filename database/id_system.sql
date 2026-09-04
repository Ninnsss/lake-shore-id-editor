CREATE DATABASE IF NOT EXISTS lake_shore_id_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lake_shore_id_system;

CREATE TABLE IF NOT EXISTS signatories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  position_title VARCHAR(150) DEFAULT '',
  signature_path VARCHAR(255) DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS id_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL DEFAULT '',
  id_type ENUM('COLLEGE','JUNIOR_HIGH','SENIOR_HIGH') NOT NULL DEFAULT 'COLLEGE',
  course VARCHAR(255) DEFAULT '',
  grade_level VARCHAR(20) DEFAULT '',
  section_name VARCHAR(100) DEFAULT '',
  student_number VARCHAR(100) DEFAULT '',
  student_id_number VARCHAR(100) DEFAULT '',
  lrn VARCHAR(100) DEFAULT '',
  academic_year VARCHAR(50) DEFAULT '',
  school_year VARCHAR(50) DEFAULT '',
  photo_path VARCHAR(255) DEFAULT '',
  address_line1 VARCHAR(255) DEFAULT '',
  address_line2 VARCHAR(255) DEFAULT '',
  emergency_label VARCHAR(255) DEFAULT 'In case of emergency, please notify',
  emergency_contact VARCHAR(150) DEFAULT '',
  emergency_phone VARCHAR(80) DEFAULT '',
  terms_title VARCHAR(150) DEFAULT 'Terms and Conditions',
  term_1 TEXT,
  term_2 TEXT,
  term_3 TEXT,
  institution_name VARCHAR(150) DEFAULT 'Lake Shore Colleges',
  institution_address VARCHAR(255) DEFAULT '',
  mobile_no VARCHAR(150) DEFAULT '',
  telephone_no VARCHAR(150) DEFAULT '',
  email_address VARCHAR(150) DEFAULT '',
  signatory_id INT UNSIGNED NULL,
  signatory_name VARCHAR(150) DEFAULT '',
  signature_path VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) DEFAULT '',
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_token (token_hash)
);

INSERT INTO users (username, password, full_name, role, is_active)
SELECT 'mbautista@lakeshore.edu.ph',
       '$2y$12$Wq1wa4ZgknxLgMsDcn3Cau3evnjr6lkhZ9GTEGIrV6nrK2pN8TdwW',
       'Ma. Bautista',
       'admin',
       1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='mbautista@lakeshore.edu.ph');

INSERT INTO system_settings (setting_key, setting_value) VALUES
('institution_name','Lake Shore Colleges'),
('institution_address','A. Bonifacio St., Brgy. Canlalay, City of Biñan, Laguna, Philippines'),
('mobile_no','Mobile No.: 0936-958-2431 / 0962-773-7461'),
('telephone_no','Telephone No.: (049) 511-4328'),
('email_address','E-mail Address: lsei@lakeshore.edu.ph')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

INSERT INTO signatories (full_name, position_title, signature_path)
SELECT 'Annabelle V. Molina','Authorized Signatory','uploads/signatures/annabelle-v-molina.png'
WHERE NOT EXISTS (SELECT 1 FROM signatories WHERE full_name='Annabelle V. Molina');

-- Existing installations: run these if your MySQL/MariaDB version does not support ADD COLUMN IF NOT EXISTS.
-- ALTER TABLE id_cards ADD COLUMN id_type ENUM('COLLEGE','JUNIOR_HIGH','SENIOR_HIGH') NOT NULL DEFAULT 'COLLEGE';
-- ALTER TABLE id_cards ADD COLUMN course VARCHAR(255) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN grade_level VARCHAR(20) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN section_name VARCHAR(100) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN student_number VARCHAR(100) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN student_id_number VARCHAR(100) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN lrn VARCHAR(100) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN academic_year VARCHAR(50) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN school_year VARCHAR(50) DEFAULT '';
-- ALTER TABLE id_cards ADD COLUMN photo_path VARCHAR(255) DEFAULT '';

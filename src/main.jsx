import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import "./styles.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost/lake-shore-id-editor/backend/api.php";
const BACKEND_URL = API_URL.replace(/\/api\.php(?:\?.*)?$/, "");
const logo = "/lsc-logo.png";

const COURSES = [
  "BACHELOR OF SCIENCE IN PSYCHOLOGY",
  "BACHELOR OF SPECIAL NEEDS EDUCATION",
  "BACHELOR OF TECHNOLOGY AND LIVELIHOOD EDUCATION",
  "BACHELOR OF SCIENCE IN ACCOUNTANCY",
  "BACHELOR OF SCIENCE IN REAL ESTATE MANAGEMENT",
  "BACHELOR OF SCIENCE IN TOURISM MANAGEMENT",
  "BACHELOR OF SCIENCE IN MANAGEMENT ACCOUNTING",
  "BACHELOR OF SCIENCE IN CRIMINOLOGY",
];
const gradeColors = {
  "GRADE 7": "#205f38",
  "GRADE 8": "#f0b51f",
  "GRADE 9": "#1968c7",
  "GRADE 10": "#f01616",
  "GRADE 11": "#850074",
  "GRADE 12": "#f47b20",
};
const typeTitles = {
  COLLEGE: "College Department",
  JUNIOR_HIGH: "Basic Education - Junior High School",
  SENIOR_HIGH: "Basic Education - Senior High School",
};

/* ID status lifecycle: created -> done -> edited / printed */
const CARD_STATUS_LABELS = {
  created: "Created",
  done: "Done",
  edited: "Edited",
  printed: "Printed",
};
const cardStatus = (s) => CARD_STATUS_LABELS[s] || "Created";

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEPARTMENT_SIGNATORIES = {
  COLLEGE: "Sherill S. Villaluz",
  JUNIOR_HIGH: "Annabelle V. Molina",
  SENIOR_HIGH: "Annabelle V. Molina",
};
const STUDENT_DEPARTMENTS = [
  {
    type: "COLLEGE",
    title: "College Student",
    desc: "Currently enrolled in a college degree program.",
  },
  {
    type: "JUNIOR_HIGH",
    title: "Basic Education - Junior High School Student",
    desc: "Grade 7 to Grade 10.",
  },
  {
    type: "SENIOR_HIGH",
    title: "Basic Education - Senior High School Student",
    desc: "Grade 11 to Grade 12.",
  },
];

function makeStudentCard(type) {
  return {
    ...emptyCard,
    id_type: type,
    grade_level:
      type === "JUNIOR_HIGH"
        ? "GRADE 7"
        : type === "SENIOR_HIGH"
          ? "GRADE 11"
          : "",
    course: type === "COLLEGE" ? COURSES[0] : "",
  };
}

const emptyCard = {
  id: "",
  student_name: "",
  id_type: "COLLEGE",
  course: COURSES[0],
  grade_level: "GRADE 7",
  section_name: "",
  student_number: "",
  student_id_number: "",
  lrn: "",
  academic_year: "2026-2027",
  school_year: "2026-2027",
  photo_path: "",
  address_line1: "",
  address_line2: "",
  emergency_label: "In case of emergency, please notify",
  emergency_contact: "",
  emergency_phone: "",
  terms_title: "Terms and Conditions",
  term_1:
    "This card is non transferable. It must be worn conspicuously at all times while inside the LSC compound.",
  term_2: "Replacement for damage or lost ID is chargeable to card bearer.",
  term_3: "In case of lost card, please return to:",
  institution_name: "Lake Shore Colleges",
  institution_address:
    "A. Bonifacio St., Brgy. Canlalay, City of Biñan, Laguna, Philippines",
  mobile_no: "Mobile No.: 0936-958-2431 / 0962-773-7461",
  telephone_no: "Telephone No.: (049) 511-4328",
  email_address: "E-mail Address: lsei@lakeshore.edu.ph",
  signatory_id: "",
  signatory_name: "",
  signature_path: "",
  template_id: "",
  status: "created",
  printed_at: null,
  print_count: 0,
};

/* =====================================================================
 * ID Template Module
 * ---------------------------------------------------------------------
 * Templates let an admin upload an existing ID design (PNG/JPG) and get
 * a 100% exact copy as the card background. Only the data "zones" that
 * the admin places on top of that image are drawn as live data:
 *  - the rendered card = template image (exact copy) + zone texts/photos
 *  - one active template per department is auto-matched when creating IDs
 * ===================================================================== */
const TEMPLATE_FIELD_DEFS = [
  { key: "student_name", label: "Student Name", kind: "text" },
  { key: "id_type", label: "Department / ID Type", kind: "select" },
  { key: "course", label: "College Course", kind: "select" },
  { key: "grade_level", label: "Grade Level", kind: "select" },
  { key: "section_name", label: "Section", kind: "text" },
  { key: "grade_section", label: "Grade + Section (combined)", kind: "text" },
  { key: "student_number", label: "Student Number / ID Number", kind: "text" },
  { key: "student_id_number", label: "Student ID Number (college)", kind: "text" },
  { key: "lrn", label: "LRN", kind: "text" },
  { key: "academic_year", label: "Academic Year", kind: "text" },
  { key: "school_year", label: "School Year", kind: "text" },
  { key: "photo", label: "ID Photo", kind: "image" },
  { key: "address_line1", label: "Home Address (Line 1)", kind: "text" },
  { key: "address_line2", label: "Home Address (Line 2)", kind: "text" },
  { key: "emergency_label", label: "Emergency Label", kind: "text" },
  { key: "emergency_contact", label: "Emergency Contact Person", kind: "text" },
  { key: "emergency_phone", label: "Emergency Contact Phone", kind: "text" },
  { key: "terms_title", label: "Terms & Conditions Title", kind: "text" },
  { key: "term_1", label: "Terms & Conditions (line 1)", kind: "textarea" },
  { key: "term_2", label: "Terms & Conditions (line 2)", kind: "textarea" },
  { key: "term_3", label: "Terms & Conditions (line 3)", kind: "textarea" },
  { key: "institution_name", label: "Institution Name", kind: "text" },
  { key: "institution_address", label: "Institution Address", kind: "textarea" },
  { key: "mobile_no", label: "Mobile No.", kind: "text" },
  { key: "telephone_no", label: "Telephone No.", kind: "text" },
  { key: "email_address", label: "E-mail Address", kind: "text" },
  { key: "signatory_name", label: "Authorized Signatory Name", kind: "text" },
  { key: "signature", label: "Signature Image", kind: "image" },
];
const DESIGN_CANVAS_W = 321;
const DESIGN_CANVAS_H = 506;
const TEMPLATE_FONT_FAMILIES = [
  { value: "Montserrat", label: "Montserrat (body)" },
  { value: "Oswald", label: "Oswald (headings)" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
];
const templateDef = (key) =>
  TEMPLATE_FIELD_DEFS.find((d) => d.key === key) || {
    key,
    label: key.replace(/_/g, " "),
    kind: "text",
  };
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
function defaultZone(key, side) {
  const def = templateDef(key);
  const isImg = def.kind === "image";
  return {
    key,
    label: def.label,
    side,
    x: Math.round((DESIGN_CANVAS_W - (isImg ? 130 : 260)) / 2),
    y: Math.round((DESIGN_CANVAS_H - (isImg ? 170 : 48)) / 2),
    w: isImg ? 130 : 260,
    h: isImg ? 170 : 48,
    font_size: isImg ? undefined : 20,
    font_weight: isImg ? undefined : 700,
    font_family: isImg ? undefined : "Oswald",
    transform: isImg ? undefined : "uppercase",
    color: isImg ? undefined : "#ffffff",
    align: isImg ? undefined : "center",
    multiline: false,
    fit: isImg ? "cover" : undefined,
    required: false,
  };
}
function zoneDisplayValue(card, z) {
  if (!card) return "";
  switch (z.key) {
    case "grade_section":
      return `${card.grade_level || ""}${card.section_name ? " – " + card.section_name : ""}`;
    case "id_number":
    case "student_number":
      return card.student_number || card.student_id_number || "";
    case "photo":
    case "signature":
      return "";
    default:
      return card[z.key] ?? "";
  }
}
function zoneImageValue(card, z) {
  if (!card) return "";
  if (z.key === "photo") return card.photo_path || "";
  if (z.key === "signature") return card.signature_path || "";
  return "";
}
function zoneIsImage(z) {
  return templateDef(z.key).kind === "image";
}
function zoneStyle(z) {
  const s = {
    position: "absolute",
    left: z.x + "px",
    top: z.y + "px",
    width: z.w + "px",
    height: z.h + "px",
  };
  if (zoneIsImage(z)) {
    s.overflow = "hidden";
    return s;
  }
  s.fontSize = (z.font_size || 20) + "px";
  s.fontWeight = z.font_weight || 700;
  s.fontFamily = (z.font_family || "Montserrat") + ", sans-serif";
  s.color = z.color || "#ffffff";
  s.textAlign = z.align || "center";
  s.textTransform = z.transform || "none";
  s.lineHeight = 1.08;
  s.display = "flex";
  s.alignItems = "center";
  s.justifyContent =
    z.align === "left" ? "flex-start" : z.align === "right" ? "flex-end" : "center";
  s.whiteSpace = z.multiline ? "pre-wrap" : "nowrap";
  s.overflow = "hidden";
  return s;
}
function blankTemplate() {
  return {
    id: 0,
    name: "",
    id_type: "COLLEGE",
    front_image: "",
    back_image: "",
    fields_json: [],
    is_active: "1",
    is_system: "0",
  };
}
function templateZoneKeys(tpl) {
  const seen = {};
  const out = [];
  (tpl?.fields_json || []).forEach((z) => {
    if (!seen[z.key]) {
      seen[z.key] = true;
      out.push(z);
    }
  });
  return out;
}
async function api(action, options = {}) {
  const opts = { credentials: "include", ...options };
  const headers = { ...(opts.headers || {}) };
  if (csrfToken && !headers["X-CSRF-Token"])
    headers["X-CSRF-Token"] = csrfToken;
  if (
    headers["Content-Type"] === undefined &&
    opts.body &&
    typeof opts.body === "string"
  )
    headers["Content-Type"] = "application/json";
  opts.headers = headers;
  const r = await fetch(`${API_URL}?action=${action}`, opts);
  const j = await r
    .json()
    .catch(() => ({ success: false, message: "Invalid server response" }));
  if (r.status === 401) {
    sessionExpired = true;
    window.dispatchEvent(new Event("lsc-session-expired"));
  }
  if (!j.success) throw new Error(j.message || "Request failed");
  if (j.csrf_token) csrfToken = j.csrf_token;
  return j;
}
let csrfToken = null;
let sessionExpired = false;
const assetUrl = (p) =>
  !p ? "" : /^https?:/i.test(p) ? p : `${BACKEND_URL}/${p.replace(/^\/+/, "")}`;
const Field = ({
  label,
  name,
  value,
  onChange,
  full = false,
  type = "text",
}) => (
  <label className={"field " + (full ? "full" : "")}>
    <span>{label}</span>
    <input
      type={type}
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(name, e.target.value)}
    />
  </label>
);
const Select = ({ label, name, value, onChange, children, full = false }) => (
  <label className={"field " + (full ? "full" : "")}>
    <span>{label}</span>
    <select
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(name, e.target.value)}
    >
      {children}
    </select>
  </label>
);

function FrontCard({ card }) {
  const color = gradeColors[card.grade_level] || "#205f38";
  const isCollege = card.id_type === "COLLEGE";
  const photo = assetUrl(card.photo_path);

  return (
    <div className="smart-card front-card" id="front-card">
      <div className="top-wave" />

      <header className="front-header">
        <div className="brand">LAKE SHORE COLLEGES</div>

        <div className="formerly">
          formerly Lake Shore Educational Institution
        </div>

        <div className="address-small">
          A. Bonifacio St., Brgy. Canlalay, City of Biñan, Laguna, Philippines
        </div>
      </header>

      <div className="department">{typeTitles[card.id_type]}</div>

      <div className="front-main">
        <div className="photo-frame">
          {photo ? (
            <img
              src={photo}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement.classList.add("photo-broken");
              }}
            />
          ) : (
            <div className="photo-placeholder">
              ID
              <br />
              PHOTO
            </div>
          )}
        </div>

        <div className="front-right">
          <img className="school-logo" src={logo} />

          {/* 
             College:
             No Academic Year block.

             Basic Education:
             Keep School Year block.
          */}
          {!isCollege && (
            <div className="year-block">
              <b>{card.school_year}</b>
              <small>SCHOOL YEAR</small>
            </div>
          )}
        </div>
      </div>

      <div
        className="name-band"
        style={{
          background: isCollege ? "#205f38" : color,
        }}
      >
        <div>{card.student_name || "STUDENT NAME"}</div>

        <small>
          {isCollege
            ? card.course || "COURSE"
            : `${card.grade_level || "GRADE"}${
                card.section_name ? " – " + card.section_name : ""
              }`}
        </small>
      </div>

      <div className="number-area">
        {isCollege ? (
          /*
           * COLLEGE
           *
           * Only Student ID.
           * Academic Year removed.
           */
          <div className="student-number college-student-number">
            <span>STUDENT ID</span>
            <b>{card.student_number || "—"}</b>
          </div>
        ) : (
          /*
           * JUNIOR HIGH / SENIOR HIGH
           *
           * Keep existing ID No. + LRN layout.
           */
          <>
            <div className="student-number">
              <span>ID No.</span>
              <b>{card.student_id_number || "—"}</b>
            </div>

            <div className="student-number">
              <span>LRN</span>
              <b>{card.lrn || "—"}</b>
            </div>
          </>
        )}
      </div>

      <div className="bottom-wave" />
    </div>
  );
}

function BackCard({ card }) {
  const sig = assetUrl(card.signature_path);
  return (
    <div className="smart-card back-card" id="back-card">
      <div className="back-address">
        <strong>Address:</strong>
        <div>{card.address_line1}</div>
        <div>{card.address_line2}</div>
      </div>
      <div className="emergency">
        <strong>{card.emergency_label}</strong>
        <div>{card.emergency_contact}</div>
        <div>{card.emergency_phone}</div>
      </div>
      <div className="terms">
        <h3>{card.terms_title}</h3>
        <p>- {card.term_1}</p>
        <p>- {card.term_2}</p>
        <p>- {card.term_3}</p>
      </div>
      <div className="back-school">
        <b>{card.institution_name}</b>
        <div>{card.institution_address}</div>
        <div>{card.mobile_no}</div>
        <div>{card.telephone_no}</div>
        <div>{card.email_address}</div>
      </div>
      {sig && (
        <div className="signature">
          <img
            src={sig}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="signature-line"></div>
          <div>{card.signatory_name}</div>
        </div>
      )}
    </div>
  );
}

/*
 * TemplateCard
 * ------------
 * Renders a card from an uploaded ID-template design.
 *  - The uploaded image itself is the background (100% exact copy).
 *  - Only the data zones defined by the admin are drawn on top.
 */
function TemplateCard({ card, template, side }) {
  const zones = (template?.fields_json || []).filter((z) => z.side === side);
  const img =
    side === "back" ? template?.back_image || "" : template?.front_image || "";
  const src = img ? assetUrl(img) : "";

  return (
    <div
      className={
        "smart-card template-card " +
        (side === "back" ? "back-card-template" : "front-card-template")
      }
      id={side === "back" ? "back-card" : "front-card"}
      data-template-card="1"
    >
      {src && (
        <img className="template-bg" src={src} alt="" crossOrigin="anonymous" />
      )}
      {zones.map((z, i) => {
        const isImg = zoneIsImage(z);
        const show = isImg ? Boolean(zoneImageValue(card, z)) : true;
        const v = zoneDisplayValue(card, z);
        return (
          <div
            className="template-zone"
            style={zoneStyle(z)}
            key={i}
            data-tzone-key={z.key}
          >
            {isImg ? (
              <img
                className="template-zone-img"
                src={assetUrl(zoneImageValue(card, z))}
                alt=""
                crossOrigin="anonymous"
                style={{ objectFit: z.fit || "cover" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : show && v !== "" ? (
              v
            ) : (
              <span className="tzone-empty" style={{ opacity: 0.3 }}>
                –– {templateDef(z.key).label} ––
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function inlineImageAsDataURL(src) {
  try {
    const r = await fetch(src, { credentials: "include" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

/*
 * Renders any card face ("front-card" / "back-card") as a full-resolution
 * CR80 canvas (1276 x 2022 px @ 600 DPI). Shared by PNG/JPG export and by
 * the direct Smart ID 51 dual-side print job.
 */
async function renderCardCanvas(id) {
  const node = document.getElementById(id);
  if (!node) return null;

  /*
   * CR80 CARD SIZE
   * 54 × 85.6 mm
   *
   * At 600 DPI:
   * Width  = 54 / 25.4 × 600 = 1275.59 ≈ 1276 px
   * Height = 85.6 / 25.4 × 600 = 2022.05 ≈ 2022 px
   */

  const targetW = 1276;
  const targetH = 2022;

  /*
   * Your current card design is:
   * 321 × 506 CSS pixels
   *
   * We calculate the rendering scale from the
   * actual target width instead of using 600/96.
   *
   * This means html2canvas renders directly at
   * approximately 1276 × 2011 px instead of
   * rendering at 321 × 506 and then massively
   * enlarging the result.
   */
  const previewW = 321;
  const previewH = 506;

  const scale = targetW / previewW;

  const isTemplate = node.classList && node.classList.contains("template-card");

  const canvas = await html2canvas(node, {
    scale: isTemplate ? 1 : scale,

    useCORS: true,
    allowTaint: false,

    backgroundColor: "#ffffff",

    width: isTemplate ? targetW : previewW,
    height: isTemplate ? targetH : previewH,

    windowWidth: isTemplate ? targetW : previewW,
    windowHeight: isTemplate ? targetH : previewH,

    scrollX: 0,
    scrollY: 0,

    imageTimeout: 15000,

    onclone: async (doc) => {
      const clone = doc.getElementById(id);

      if (!clone) return;

      if (isTemplate) {
        /*
         * 100% EXACT TEMPLATE EXPORT
         * --------------------------
         * Render the card at full CR80 resolution. The template image is
         * the background, so it is drawn exactly as uploaded while the
         * data zones are scaled proportionally from the 321x506 space.
         */
        clone.style.width = targetW + "px";
        clone.style.height = targetH + "px";
        clone.style.transform = "none";
        clone.style.maxWidth = "none";
        clone.style.maxHeight = "none";
        clone.style.boxShadow = "none";
        clone.style.borderRadius = "0";

        const bg = clone.querySelector(".template-bg");
        if (bg) {
          bg.style.width = "100%";
          bg.style.height = "100%";
          bg.style.objectFit = "fill";
        }

        const zones = clone.querySelectorAll(".template-zone");
        zones.forEach((z) => {
          const L = parseFloat(z.style.left || "0") || 0;
          const T = parseFloat(z.style.top || "0") || 0;
          const W = parseFloat(z.style.width || "0") || 0;
          const H = parseFloat(z.style.height || "0") || 0;
          z.style.left = Math.round(L * scale) + "px";
          z.style.top = Math.round(T * scale) + "px";
          z.style.width = Math.round(W * scale) + "px";
          z.style.height = Math.round(H * scale) + "px";
          const fs = parseFloat(z.style.fontSize || "0") || 0;
          if (fs) z.style.fontSize = Math.round(fs * scale) + "px";
          z.style.maxWidth = "none";
          z.style.maxHeight = "none";
          z.style.display = "flex";
          const zi = z.querySelector(".template-zone-img");
          if (zi) {
            zi.style.width = "100%";
            zi.style.height = "100%";
            zi.style.maxWidth = "none";
            zi.style.maxHeight = "none";
          }
        });

        const imgs = clone.querySelectorAll("img");
        for (const img of imgs) {
          const src = img.getAttribute("src");
          if (!src) continue;
          try {
            const dataUrl = await inlineImageAsDataURL(src);
            if (dataUrl) img.src = dataUrl;
          } catch (e) {
            console.warn("Could not inline template image:", src, e);
          }
        }
        return;
      }

      /*
       * Keep the original card design dimensions.
       */
      clone.style.width = previewW + "px";
      clone.style.height = previewH + "px";

      clone.style.transform = "none";

      clone.style.maxWidth = "none";
      clone.style.maxHeight = "none";

      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";

      clone.style.background = "#ffffff";
      clone.style.backgroundImage = "none";

      const wrap = clone.parentElement;

      if (wrap) {
        wrap.style.background = "#ffffff";
        wrap.style.backgroundImage = "none";
        wrap.style.boxShadow = "none";
      }

      /*
       * Prepare images for html2canvas.
       * This helps avoid CORS-related image problems.
       */
      const imgs = clone.querySelectorAll("img");

      for (const img of imgs) {
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";

        /*
         * Preserve the natural image dimensions.
         */
        img.style.objectFit = "contain";

        const src = img.getAttribute("src");

        if (!src) continue;

        try {
          const dataUrl = await inlineImageAsDataURL(src);

          if (dataUrl) {
            img.src = dataUrl;
          }
        } catch (e) {
          console.warn("Could not inline image:", src, e);
        }
      }
    },
  });

  /*
   * html2canvas will produce approximately:
   *
   * 321 × 506 × 3.975
   *
   * ≈ 1276 × 2011
   *
   * We resize only the small height difference needed
   * to achieve the exact CR80 600-DPI pixel dimensions.
   */
  let outputCanvas = canvas;

  if (canvas.width !== targetW || canvas.height !== targetH) {
    outputCanvas = document.createElement("canvas");

    outputCanvas.width = targetW;
    outputCanvas.height = targetH;

    const ctx = outputCanvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to create export canvas.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(canvas, 0, 0, targetW, targetH);
  }

  return outputCanvas;
}

/*
 * Export one card face as a downloadable high-resolution file.
 */
async function exportCard(id, format = "png") {
  const outputCanvas = await renderCardCanvas(id);
  if (!outputCanvas) return;

  const targetW = 1276;
  const targetH = 2022;

  /*
   * Export format
   */
  const mime = format === "jpg" ? "image/jpeg" : "image/png";

  /*
   * JPG quality
   *
   * PNG does not use this value.
   */
  const quality = format === "jpg" ? 0.98 : undefined;

  const dataUrl = outputCanvas.toDataURL(mime, quality);

  /*
   * Download
   */
  const a = document.createElement("a");

  a.href = dataUrl;

  a.download = `${id}_CR80_600dpi_${targetW}x${targetH}.${format === "jpg" ? "jpg" : "png"}`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/*
 * SMART ID 51 — DIRECT DUAL-SIDE PRINT
 * ------------------------------------
 * Renders BOTH faces at full CR80 600-DPI resolution and sends them to the
 * printer as ONE job: page 1 = FRONT, page 2 = BACK.
 *
 * The Smart ID 51 driver controls the media: this printer is configured to
 * print COLOUR on the front side and BLACK & WHITE (K resin) on the back
 * side, so the app only has to deliver the two pages in order and the
 * driver handles duplex + panel selection.
 *
 * The card status is recorded as "printed" (with timestamp + counter) by
 * the caller after the job is sent.
 */
async function printCardDualSide() {
  const frontCanvas = await renderCardCanvas("front-card");
  const backCanvas = await renderCardCanvas("back-card");

  if (!frontCanvas || !backCanvas) {
    throw new Error(
      "Card previews are not ready yet. Please wait for the preview to finish rendering.",
    );
  }

  const frontUrl = frontCanvas.toDataURL("image/png");
  const backUrl = backCanvas.toDataURL("image/png");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Smart ID 51 dual-side print");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Smart ID 51 — Dual Side</title><style>' +
      "@page{size:85.6mm 54mm;margin:0}" +
      "html,body{margin:0;padding:0;background:#fff}" +
      ".face{width:85.6mm;height:54mm;overflow:hidden;page-break-after:always;break-after:page}" +
      ".face.last{page-break-after:auto;break-after:auto}" +
      ".face img{width:100%;height:100%;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
      "</style></head><body>" +
      '<div class="face"><img src="' + frontUrl + '"></div>' +
      '<div class="face last"><img src="' + backUrl + '"></div>' +
      "</body></html>",
  );
  doc.close();

  /* Wait for the document and both faces to fully load before printing. */
  await new Promise((resolve) => {
    if (doc.readyState === "complete") resolve();
    else iframe.onload = resolve;
  });
  await Promise.all(
    Array.from(doc.images || []).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }),
    ),
  );

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  /* Clean up the hidden frame shortly after the print dialog closes. */
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 2000);
}

/*
 * TemplateFieldsForm
 * ------------------
 * The admin ID form is driven by the selected template: only the data the
 * template's zones need is shown (auto-matched with the template design).
 */
function TemplateFieldsForm({
  card,
  template,
  update,
  photoUpload,
  signatureUpload,
  onTypeChange,
}) {
  const zones = templateZoneKeys(template);
  if (!zones.length)
    return (
      <p className="tpl-no-fields">
        This template has no data zones yet. Open the template design editor
        and place zones on the image where the student data should be drawn.
      </p>
    );
  const front = zones.filter((z) => z.side === "front");
  const back = zones.filter((z) => z.side === "back");
  const renderOne = (z) => {
    const def = templateDef(z.key);
    const lab = `${def.label}${z.required ? " *" : ""}`;
    if (def.kind === "image") {
      if (z.key === "photo")
        return (
          <label className="upload field full" key={z.key}>
            <span>{lab}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => photoUpload(e.target.files?.[0])}
            />
            {card.photo_path ? (
              <small>Photo uploaded — will be drawn inside the template photo zone.</small>
            ) : (
              <small>Student photo needed for this template.</small>
            )}
          </label>
        );
      if (z.key === "signature")
        return (
          <label className="upload field full" key={z.key}>
            <span>{lab}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => signatureUpload(e.target.files?.[0])}
            />
            {card.signature_path ? (
              <small>Signature set for {card.signatory_name || "the signatory"}.</small>
            ) : (
              <small>Assigned signatory signature is used automatically; you may override here.</small>
            )}
          </label>
        );
      return <div key={z.key} />;
    }
    if (def.kind === "select") {
      if (z.key === "id_type")
        return (
          <Select
            label={lab}
            name="id_type"
            value={card.id_type}
            onChange={onTypeChange}
            full
            key={z.key}
          >
            <option value="COLLEGE">College Student</option>
            <option value="JUNIOR_HIGH">Junior High School</option>
            <option value="SENIOR_HIGH">Senior High School</option>
          </Select>
        );
      if (z.key === "course")
        return (
          <Select label={lab} name="course" value={card.course} onChange={update} full key={z.key}>
            {COURSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        );
      if (z.key === "grade_level")
        return (
          <Select label={lab} name="grade_level" value={card.grade_level} onChange={update} full key={z.key}>
            {(card.id_type === "JUNIOR_HIGH"
              ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"]
              : ["GRADE 11", "GRADE 12"]
            ).map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        );
    }
    if (def.kind === "textarea")
      return (
        <label className="field full" key={z.key}>
          <span>{lab}</span>
          <textarea
            rows={3}
            name={z.key}
            value={card[z.key] ?? ""}
            onChange={(e) => update(z.key, e.target.value)}
          />
        </label>
      );
    return (
      <Field
        key={z.key}
        label={lab}
        name={z.key}
        value={card[z.key] ?? ""}
        onChange={update}
        full
      />
    );
  };
  return (
    <>
      {front.length > 0 && (
        <>
          <h2>Front of ID — Data Needed</h2>
          <div className="form-grid">{front.map(renderOne)}</div>
        </>
      )}
      {back.length > 0 && (
        <>
          <h2>Back of ID — Data Needed</h2>
          <div className="form-grid">{back.map(renderOne)}</div>
        </>
      )}
    </>
  );
}

/*
 * TemplateDesigner
 * ----------------
 * Full-screen zone editor. The admin uploads the existing ID design image
 * (front + optional back) and drags/resizes data zones directly on top of
 * that 100% exact image. Each zone is then rendered on the final ID.
 */
function TemplateDesigner({ initial, onSave, onCancel }) {
  const [tpl, setTpl] = useState(() => {
    const base = initial ? JSON.parse(JSON.stringify(initial)) : blankTemplate();
    base.fields_json = Array.isArray(base.fields_json) ? base.fields_json : [];
    return base;
  });
  const [side, setSide] = useState("front");
  const [sel, setSel] = useState(-1);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(
    initial?.front_image ? assetUrl(initial.front_image) : "",
  );
  const [backPreview, setBackPreview] = useState(
    initial?.back_image ? assetUrl(initial.back_image) : "",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const canvasRef = useRef(null);

  const zones = tpl.fields_json;
  const setZones = (fn) =>
    setTpl((p) => ({ ...p, fields_json: fn(p.fields_json) }));
  const curPreview = side === "front" ? frontPreview : backPreview;

  function zoneAt(i) {
    return zones[i] || null;
  }
  function defOf(i) {
    const z = zoneAt(i);
    return z ? templateDef(z.key) : null;
  }
  function unusedKey() {
    const taken = {};
    zones.forEach((z) => (taken[z.key] = true));
    const pref =
      side === "front"
        ? [
            "student_name",
            "photo",
            "course",
            "grade_level",
            "section_name",
            "student_number",
            "student_id_number",
            "lrn",
            "school_year",
            "academic_year",
            "id_type",
            "grade_section",
          ]
        : [
            "institution_name",
            "institution_address",
            "mobile_no",
            "telephone_no",
            "email_address",
            "emergency_contact",
            "emergency_phone",
            "terms_title",
            "term_1",
            "term_2",
            "term_3",
            "signatory_name",
            "signature",
          ];
    for (const k of pref) if (!taken[k]) return k;
    const fb = TEMPLATE_FIELD_DEFS.find((d) => !taken[d.key]);
    return fb ? fb.key : "student_name";
  }
  function addZone(kind) {
    if (!curPreview) {
      setErr("First upload the design image for this side of the ID.");
      return;
    }
    const key =
      kind === "image"
        ? side === "front"
          ? "photo"
          : "signature"
        : unusedKey();
    const z = defaultZone(key, side);
    setZones((zs) => [...zs, z]);
    setSel(zones.length);
    setErr("");
  }
  function addZoneAtPoint(e) {
    if (!curPreview || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * DESIGN_CANVAS_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * DESIGN_CANVAS_H);
    const z = defaultZone(unusedKey(), side);
    z.x = Math.round(clamp(x - z.w / 2, 0, DESIGN_CANVAS_W - z.w));
    z.y = Math.round(clamp(y - z.h / 2, 0, DESIGN_CANVAS_H - z.h));
    setZones((zs) => [...zs, z]);
    setSel(zones.length);
  }
  function beginDrag(i, e) {
    e.preventDefault();
    e.stopPropagation();
    const z = zoneAt(i);
    if (!z) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const orig = { x: z.x, y: z.y };
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      setZones((zs) =>
        zs.map((p, idx) =>
          idx === i
            ? {
                ...p,
                x: Math.round(clamp(orig.x + dx, 0, DESIGN_CANVAS_W - p.w)),
                y: Math.round(clamp(orig.y + dy, 0, DESIGN_CANVAS_H - p.h)),
              }
            : p,
        ),
      );
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function beginResize(i, e) {
    e.preventDefault();
    e.stopPropagation();
    const z = zoneAt(i);
    if (!z) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const orig = { w: z.w, h: z.h };
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      setZones((zs) =>
        zs.map((p, idx) =>
          idx === i
            ? {
                ...p,
                w: Math.round(clamp(orig.w + dx, 20, DESIGN_CANVAS_W - p.x)),
                h: Math.round(clamp(orig.h + dy, 20, DESIGN_CANVAS_H - p.y)),
              }
            : p,
        ),
      );
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function updateZone(i, patch) {
    setZones((zs) => zs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function removeZone(i) {
    setZones((zs) => zs.filter((p, idx) => idx !== i));
    setSel(-1);
  }
  function changeKey(i, key) {
    const def = templateDef(key);
    const z = zoneAt(i);
    if (!z) return;
    const oldImg = zoneIsImage(z);
    const newImg = def.kind === "image";
    const nu = { ...z, key, label: def.label };
    if (newImg && !oldImg) {
      nu.font_size = undefined;
      nu.font_weight = undefined;
      nu.font_family = undefined;
      nu.transform = undefined;
      nu.color = undefined;
      nu.align = undefined;
      nu.multiline = false;
      nu.fit = "cover";
      nu.w = 150;
      nu.h = 180;
    } else if (!newImg && oldImg) {
      nu.font_size = 20;
      nu.font_weight = 700;
      nu.font_family = "Oswald";
      nu.transform = "uppercase";
      nu.color = "#ffffff";
      nu.align = "center";
      nu.multiline = false;
      nu.fit = undefined;
      nu.w = 260;
      nu.h = 48;
    }
    updateZone(i, nu);
  }
  async function save() {
    if (!tpl.name.trim()) {
      setErr("Please give this template a name.");
      return;
    }
    if (!tpl.front_image && !frontFile) {
      setErr(
        "Please upload the FRONT design image (PNG/JPG). This image is the 100% exact copy used as the ID background.",
      );
      return;
    }
    const fd = new FormData();
    fd.append("id", tpl.id || "");
    fd.append("name", tpl.name);
    fd.append("id_type", tpl.id_type);
    fd.append("is_active", String(tpl.is_active));
    fd.append("fields_json", JSON.stringify(zones));
    if (tpl.front_image) fd.append("front_image_prev", tpl.front_image);
    if (tpl.back_image) fd.append("back_image_prev", tpl.back_image);
    if (frontFile) fd.append("front_image", frontFile);
    if (backFile) fd.append("back_image", backFile);
    setSaving(true);
    setErr("");
    try {
      await api("saveTemplate", { method: "POST", body: fd });
      onSave(tpl.id || 0);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }
  const curZone = sel >= 0 && sel < zones.length ? zones[sel] : null;
  const curDef = curZone ? templateDef(curZone.key) : null;

  return (
    <div className="td-overlay">
      <div className="td-shell">
        <div className="td-head">
          <h2>ID Template Designer</h2>
          <div className="td-head-actions">
            <button onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
        {err && (
          <div className="alert">
            {err}
            <button onClick={() => setErr("")}>×</button>
          </div>
        )}
        <p className="td-note">
          🖼 The uploaded design is kept <b>100% exact</b> — it becomes the
          card background. Only the yellow <b>data zones</b> you place are
          drawn over it with the student data. Drag zones to move them, drag
          the corner handle to resize, or click the canvas to add a zone.
        </p>
        <div className="td-body">
          <div className="td-canvas-wrap">
            <div className="td-toolbar">
              <button
                className={"td-side " + (side === "front" ? "active" : "")}
                onClick={() => {
                  setSide("front");
                  setSel(-1);
                }}
              >
                Front
              </button>
              <button
                className={"td-side " + (side === "back" ? "active" : "")}
                onClick={() => {
                  setSide("back");
                  setSel(-1);
                }}
              >
                Back
              </button>
              <span className="td-toolbar-spacer" />
              <button type="button" onClick={() => addZone("text")}>
                ＋ Text Zone
              </button>
              <button type="button" onClick={() => addZone("image")}>
                ＋ Photo Zone
              </button>
            </div>
            <div className="td-canvas" ref={canvasRef} onMouseDown={addZoneAtPoint}>
              {curPreview ? (
                <img
                  className="template-bg"
                  src={curPreview}
                  alt="template design"
                />
              ) : (
                <div className="td-canvas-empty">
                  {side === "front"
                    ? "⬆ Upload the FRONT design (PNG/JPG) to start placing data zones"
                    : "Back design not uploaded yet — upload it below, or leave empty to use the default LSC back"}
                </div>
              )}
              {zones.map((z, i) => {
                if (z.side !== side) return null;
                const box = {
                  position: "absolute",
                  left: z.x + "px",
                  top: z.y + "px",
                  width: z.w + "px",
                  height: z.h + "px",
                };
                const def = templateDef(z.key);
                return (
                  <div
                    key={i}
                    className={"td-zone" + (sel === i ? " selected" : "")}
                    style={box}
                    onMouseDown={(e) => beginDrag(i, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSel(i);
                    }}
                    title={def.label + " (drag to move, corner to resize)"}
                  >
                    <span className="td-zone-label">{def.label}</span>
                    {zoneIsImage(z) ? (
                      <span className="td-zone-ph td-zone-ph-img">🖼 photo</span>
                    ) : (
                      <span className="td-zone-ph">{def.label}</span>
                    )}
                    <span
                      className="td-zone-handle"
                      onMouseDown={(e) => beginResize(i, e)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          /* __DESIGNER_CHUNK_C__ */
          <div className="td-panel">
            <h3>Template Settings</h3>
            <div className="field">
              <span>Template Name</span>
              <input
                value={tpl.name}
                onChange={(e) => setTpl((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. College ID 2026 design"
              />
            </div>
            <div className="field">
              <span>Department (auto-match)</span>
              <select
                value={tpl.id_type}
                onChange={(e) => setTpl((p) => ({ ...p, id_type: e.target.value }))}
              >
                <option value="COLLEGE">College</option>
                <option value="JUNIOR_HIGH">Junior High School</option>
                <option value="SENIOR_HIGH">Senior High School</option>
              </select>
            </div>
            <label className="td-active">
              <input
                type="checkbox"
                checked={String(tpl.is_active) === "1"}
                onChange={(e) =>
                  setTpl((p) => ({ ...p, is_active: e.target.checked ? "1" : "0" }))
                }
              />
              Use as active template for {typeTitles[tpl.id_type]} — new IDs of
              this department are automatically created from it
            </label>
            <h3>Design Images (100% exact copy)</h3>
            <label className="upload field">
              <span>Front design (PNG / JPG) *</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFrontFile(f);
                  setFrontPreview(URL.createObjectURL(f));
                }}
              />
              {frontPreview && <small>Front image selected.</small>}
            </label>
            <label className="upload field">
              <span>Back design (PNG / JPG — optional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBackFile(f);
                  setBackPreview(URL.createObjectURL(f));
                }}
              />
              {backPreview && <small>Back image selected.</small>}
            </label>
            {curZone && curDef ? (
              <div className="td-zone-config">
                <h3>Zone Settings</h3>
                <div className="field">
                  <span>Data Field</span>
                  <select
                    value={curZone.key}
                    onChange={(e) => changeKey(sel, e.target.value)}
                  >
                    {TEMPLATE_FIELD_DEFS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="td-active">
                  <input
                    type="checkbox"
                    checked={Boolean(curZone.required)}
                    onChange={(e) => updateZone(sel, { required: e.target.checked })}
                  />
                  Required (highlighted in the ID form)
                </label>
                {curDef.kind === "image" ? (
                  <div className="field">
                    <span>Photo Fit</span>
                    <select
                      value={curZone.fit || "cover"}
                      onChange={(e) => updateZone(sel, { fit: e.target.value })}
                    >
                      <option value="cover">Cover (fill, crop)</option>
                      <option value="contain">Contain (fit inside)</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="td-grid2">
                      <label className="field">
                        <span>Font Size (px)</span>
                        <input
                          type="number"
                          min={6}
                          max={80}
                          value={curZone.font_size || 20}
                          onChange={(e) =>
                            updateZone(sel, { font_size: Number(e.target.value) || 20 })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Font Weight</span>
                        <select
                          value={curZone.font_weight || 700}
                          onChange={(e) =>
                            updateZone(sel, { font_weight: Number(e.target.value) || 700 })
                          }
                        >
                          <option value={400}>400 Regular</option>
                          <option value={500}>500 Medium</option>
                          <option value={600}>600 Semi-bold</option>
                          <option value={700}>700 Bold</option>
                          <option value={800}>800 Extra-bold</option>
                        </select>
                      </label>
                    </div>
                    <div className="td-grid2">
                      <label className="field">
                        <span>Font Family</span>
                        <select
                          value={curZone.font_family || "Montserrat"}
                          onChange={(e) =>
                            updateZone(sel, { font_family: e.target.value })
                          }
                        >
                          {TEMPLATE_FONT_FAMILIES.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Text Color</span>
                        <input
                          type="color"
                          value={curZone.color || "#ffffff"}
                          onChange={(e) =>
                            updateZone(sel, { color: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="td-grid2">
                      <label className="field">
                        <span>Align</span>
                        <select
                          value={curZone.align || "center"}
                          onChange={(e) =>
                            updateZone(sel, { align: e.target.value })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Case</span>
                        <select
                          value={curZone.transform || "none"}
                          onChange={(e) =>
                            updateZone(sel, { transform: e.target.value })
                          }
                        >
                          <option value="none">As typed</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="capitalize">Capitalize</option>
                        </select>
                      </label>
                    </div>
                    <label className="td-active">
                      <input
                        type="checkbox"
                        checked={Boolean(curZone.multiline)}
                        onChange={(e) =>
                          updateZone(sel, { multiline: e.target.checked })
                        }
                      />
                      Allow multiple lines (wrap)
                    </label>
                    <div className="td-grid2">
                      <label className="field">
                        <span>X</span>
                        <input
                          type="number"
                          value={curZone.x}
                          onChange={(e) =>
                            updateZone(sel, {
                              x: Math.round(
                                clamp(Number(e.target.value) || 0, 0, DESIGN_CANVAS_W - curZone.w),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Y</span>
                        <input
                          type="number"
                          value={curZone.y}
                          onChange={(e) =>
                            updateZone(sel, {
                              y: Math.round(
                                clamp(Number(e.target.value) || 0, 0, DESIGN_CANVAS_H - curZone.h),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>W</span>
                        <input
                          type="number"
                          value={curZone.w}
                          onChange={(e) =>
                            updateZone(sel, {
                              w: Math.round(
                                clamp(Number(e.target.value) || 20, 20, DESIGN_CANVAS_W - curZone.x),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>H</span>
                        <input
                          type="number"
                          value={curZone.h}
                          onChange={(e) =>
                            updateZone(sel, {
                              h: Math.round(
                                clamp(Number(e.target.value) || 20, 20, DESIGN_CANVAS_H - curZone.y),
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <button
                      className="danger td-delete"
                      onClick={() => removeZone(sel)}
                    >
                      🗑 Remove this zone
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="td-hint">
                Select a zone on the canvas to configure the data field, font,
                color, alignment and exact position.
              </p>
            )}
          </div>
        </div>

        <div className="td-foot">
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? (
              <>
                <span className="s-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save Template"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [fpUsername, setFpUsername] = useState("");
  const [fpToken, setFpToken] = useState("");
  const [fpPassword, setFpPassword] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpMsg, setFpMsg] = useState("");
  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await api("login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      onLogin(r.data);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }
  async function requestReset(e) {
    e.preventDefault();
    setErr("");
    setFpMsg("");
    setBusy(true);
    try {
      const r = await api("forgotPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fpUsername }),
      });
      if (r.reset_token) {
        setFpToken(r.reset_token);
        setMode("reset");
        setFpMsg(
          "Reset token generated below. It is valid for 30 minutes and can be used once.",
        );
      } else {
        setFpMsg(
          r.message ||
            "If the account exists, a reset token has been generated.",
        );
      }
    } catch (ex) {
      setFpMsg(ex.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirmReset(e) {
    e.preventDefault();
    setErr("");
    setFpMsg("");
    setBusy(true);
    try {
      if (fpPassword !== fpConfirm) throw new Error("Passwords do not match");
      const r = await api("resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fpToken, password: fpPassword }),
      });
      setMode("login");
      setUsername(fpUsername);
      setPassword("");
      setInfo(r.message || "Password updated. You can now sign in.");
    } catch (ex) {
      setFpMsg(ex.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-shell">
      <form
        className="login-card"
        onSubmit={
          mode === "login" ? submit : mode === "forgot" ? requestReset : confirmReset
        }
      >
        <div className="login-brand">
          <div className="login-mark">LSC</div>
          <div>
            <div className="login-title">Lake Shore Colleges</div>
            <div className="login-sub">ID Management System</div>
          </div>
        </div>
        {mode === "login" && (
          <>
            <h1>Sign in</h1>
            <p className="login-help">
              Use your Lake Shore Colleges email to access the ID editor.
            </p>
            {err && (
              <div className="alert" style={{ margin: "0 0 14px" }}>
                {err}
                <button type="button" onClick={() => setErr("")}>
                  ×
                </button>
              </div>
            )}
            {info && (
              <div className="fp-note" style={{ marginBottom: 14 }}>
                {info}
              </div>
            )}
            <label className="field full">
              <span>Email or Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="field full">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button
              className="primary login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
            <div className="login-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode("forgot");
                  setErr("");
                  setInfo("");
                  setFpMsg("");
                }}
              >
                Forgot password?
              </button>
              {onBack && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={onBack}
                >
                  ← Student Portal
                </button>
              )}
            </div>
          </>
        )}
        {mode === "forgot" && (
          <>
            <h1>Forgot password</h1>
            <p className="login-help">
              Enter your username or email to generate a one-time reset token
              (valid for 30 minutes). On setups without e-mail, the token is
              shown here or can be provided by an administrator.
            </p>
            {fpMsg && <div className="fp-note">{fpMsg}</div>}
            <label className="field full">
              <span>Email or Username</span>
              <input
                type="text"
                value={fpUsername}
                onChange={(e) => setFpUsername(e.target.value)}
                required
              />
            </label>
            <button
              className="primary login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? "Generating..." : "Generate Reset Token"}
            </button>
            <div className="login-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode("login");
                  setFpMsg("");
                }}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}
        {mode === "reset" && (
          <>
            <h1>Set new password</h1>
            <p className="login-help">
              Paste your reset token and choose a new password (at least 6
              characters).
            </p>
            {fpMsg && <div className="fp-note">{fpMsg}</div>}
            <label className="field full">
              <span>Reset Token</span>
              <input
                type="text"
                value={fpToken}
                onChange={(e) => setFpToken(e.target.value)}
                required
              />
            </label>
            <label className="field full">
              <span>New Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={fpPassword}
                onChange={(e) => setFpPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <label className="field full">
              <span>Confirm New Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={fpConfirm}
                onChange={(e) => setFpConfirm(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <button
              className="primary login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? "Updating..." : "Update Password"}
            </button>
            <div className="login-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode("login");
                  setFpMsg("");
                }}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}
        <div className="login-foot">
          Protected session. Only authorized administrators may create student
          IDs.
        </div>
      </form>
    </div>
  );
}

/*
 * 3D interactive error toast shown when a student form submission fails.
 * Pop-in entrance + shake, 3D warning badge and a tactile close button.
 */
function StudentAlert({ message, onClose }) {
  return (
    <div className="s-alert" role="alert">
      <span className="s-alert-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="19" height="19">
          <path
            d="M12 3.2 22 20.2 H2 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <line
            x1="12"
            y1="9.6"
            x2="12"
            y2="14.2"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17" r="1.3" fill="currentColor" />
        </svg>
      </span>
      <div className="s-alert-body">{message}</div>
      <button
        type="button"
        className="s-alert-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path
            d="M5 5 19 19 M19 5 5 19"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

/*
 * 3D animated success medal with a confetti burst, shown after a
 * student form has been submitted successfully.
 */
function SuccessMedal() {
  return (
    <div className="s-success-wrap">
      <div className="s-confetti" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="s-medal">
        <svg viewBox="0 0 52 52" aria-hidden="true">
          <circle className="s-medal-ring" cx="26" cy="26" r="23" />
          <path className="s-medal-check" d="M15.5 27.5 23 35 37 18.5" />
        </svg>
      </div>
    </div>
  );
}

function StudentTopBar({ onBack, backLabel, onStaffLogin }) {
  return (
    <div className="student-topbar">
      <div className="student-brand">
        <img
          src={logo}
          alt="Lake Shore Colleges logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div>
          <b>Lake Shore Colleges</b>
          <small>Student ID Services</small>
        </div>
      </div>
      <div className="student-top-actions">
        {onStaffLogin && (
          <button className="ghost-btn" onClick={onStaffLogin}>
            Staff Login
          </button>
        )}
        {onBack && (
          <button className="ghost-btn" onClick={onBack}>
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function StudentPortal({ onStaffLogin }) {
  const [step, setStep] = useState("landing"); // landing | choose | form | lost | lost_done | done
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const [verifiedRefId, setVerifiedRefId] = useState("");
  const [lost, setLost] = useState({
    student_name: "",
    id_type: "COLLEGE",
    course: COURSES[0],
    grade_level: "GRADE 7",
    section_name: "",
    student_number: "",
    lrn: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);

  async function chooseDepartment(type) {
    setErr("");
    const next = makeStudentCard(type);
    setCard(next);
    setStep("form");
    window.scrollTo(0, 0);
    try {
      const r = await api(`publicSignatory&type=${encodeURIComponent(type)}`);
      const s = r.data;
      setCard((p) => ({
        ...p,
        signatory_id: s?.id ?? "",
        signatory_name: s?.full_name || DEPARTMENT_SIGNATORIES[type] || "",
        signature_path: s?.signature_path || "",
      }));
    } catch {
      /*
       * Keep the department signatory name even if the
       * signature record could not be loaded publicly.
       */
      setCard((p) => ({
        ...p,
        signatory_id: "",
        signatory_name: DEPARTMENT_SIGNATORIES[type] || "",
        signature_path: "",
      }));
    }
  }

  const update = (n, v) => setCard((p) => ({ ...p, [n]: v }));
  const updateLost = (n, v) => setLost((p) => ({ ...p, [n]: v }));

  function changeLostType(t) {
    const next = { ...lost, id_type: t };
    if (t === "COLLEGE") {
      next.course = COURSES.includes(next.course) ? next.course : COURSES[0];
      next.grade_level = "";
      next.section_name = "";
    } else {
      next.course = "";
      next.grade_level =
        t === "JUNIOR_HIGH"
          ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"].includes(next.grade_level)
            ? next.grade_level
            : "GRADE 7"
          : ["GRADE 11", "GRADE 12"].includes(next.grade_level)
            ? next.grade_level
            : "GRADE 11";
    }
    setLost(next);
  }

  async function submitLost() {
    if (!lost.student_name.trim()) {
      setErr("Please enter the student full name.");
      window.scrollTo(0, 0);
      return;
    }
    if (lost.id_type === "COLLEGE" && !lost.student_number.trim()) {
      setErr("Please enter the student number.");
      window.scrollTo(0, 0);
      return;
    }
    if (
      lost.id_type !== "COLLEGE" &&
      !lost.student_number.trim() &&
      !lost.lrn.trim()
    ) {
      setErr(
        "Please enter the Student / ID Number (or LRN) so your ID can be checked in the system.",
      );
      window.scrollTo(0, 0);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("student_name", lost.student_name);
      fd.append("id_type", lost.id_type);
      fd.append("course", lost.course);
      fd.append("grade_level", lost.grade_level);
      fd.append("section_name", lost.section_name);
      fd.append("student_number", lost.student_number);
      fd.append("lrn", lost.lrn);
      if (receiptFile) fd.append("receipt", receiptFile);
      const r = await api("lostIdRequest", {
        method: "POST",
        body: fd,
      });
      setSubmittedId(r.id);
      setVerifiedRefId(r.reference_card_id || "");
      setStep("lost_done");
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e.message);
      window.scrollTo(0, 0);
    } finally {
      setBusy(false);
    }
  }

  async function studentPhotoUpload(file) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const r = await api("studentUploadPhoto", { method: "POST", body: fd });
      update("photo_path", r.path);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitId() {
    if (!card.student_name.trim()) {
      setErr("Please enter the student full name before submitting.");
      window.scrollTo(0, 0);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await api("studentSaveCard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      setSubmittedId(r.id);
      setStep("done");
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCard(null);
    setSubmittedId("");
    setVerifiedRefId("");
    setErr("");
    setBusy(false);
    setLost({
      student_name: "",
      id_type: "COLLEGE",
      course: COURSES[0],
      grade_level: "GRADE 7",
      section_name: "",
      student_number: "",
      lrn: "",
    });
    setReceiptFile(null);
    setStep("landing");
    window.scrollTo(0, 0);
  }

  if (step === "landing")
    return (
      <div className="student-shell">
        <StudentTopBar onStaffLogin={onStaffLogin} />
        <main className="student-landing">
          <div className="student-logo-ring">
            <img
              src={logo}
              alt="Lake Shore Colleges logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <h1>Lake Shore Colleges</h1>
          <p className="student-tagline">
            formerly Lake Shore Educational Institution
          </p>
          <p className="student-note">
            Create your official student ID online. Select your department,
            fill out the form and review the live preview — your ID will be
            saved directly to the school's ID Management System.
          </p>
          <div className="student-cta-row">
            <button
              className="primary student-cta"
              onClick={() => {
                setErr("");
                setStep("choose");
              }}
            >
              Create ID
            </button>
            <button
              className="ghost-btn student-cta-alt"
              onClick={() => {
                setErr("");
                setSubmittedId("");
                setStep("lost");
              }}
            >
              Report Lost ID
            </button>
          </div>
        </main>
      </div>
    );

  if (step === "choose")
    return (
      <div className="student-shell">
        <StudentTopBar onBack={reset} backLabel="← Home" onStaffLogin={onStaffLogin} />
        <main className="student-landing">
          <h1>What kind of student are you?</h1>
          <p className="student-note">
            Select your department so we can open the correct ID creation form.
          </p>
          <div className="student-choose">
            {STUDENT_DEPARTMENTS.map((d) => (
              <button
                key={d.type}
                className="choose-card"
                onClick={() => chooseDepartment(d.type)}
              >
                <b>{d.title}</b>
                <span>{d.desc}</span>
              </button>
            ))}
          </div>
          <p className="student-foot">
            <button type="button" className="link-btn" onClick={reset}>
              ← Back
            </button>
          </p>
        </main>
      </div>
    );

  if (step === "form" && card)
    return (
      <div className="student-shell student-editor">
        <StudentTopBar onBack={reset} backLabel="← Cancel" onStaffLogin={onStaffLogin} />
        <main className="content">
          <header className="top">
            <div>
              <h1>Student ID Creation</h1>
              <p>
                {typeTitles[card.id_type]} — fill out your details and review
                the live ID preview.
              </p>
            </div>
            <div className="top-actions">
              <button onClick={reset}>Back</button>
            </div>
          </header>

          {err && <StudentAlert message={err} onClose={() => setErr("")} />}

          <div className="editor-layout">
            <form
              className="editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitId();
              }}
            >
              <h2>Student Details</h2>
              <div className="form-grid">
                <div className="field full">
                  <span>Department / ID Type</span>
                  <input
                    type="text"
                    value={typeTitles[card.id_type] || ""}
                    readOnly
                  />
                </div>
                <Field
                  label="Student Full Name"
                  name="student_name"
                  value={card.student_name}
                  onChange={update}
                  full
                />
                {card.id_type === "COLLEGE" ? (
                  <>
                    <Select
                      label="Course"
                      name="course"
                      value={card.course}
                      onChange={update}
                      full
                    >
                      {COURSES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                    <Field
                      label="Student ID Number"
                      name="student_number"
                      value={card.student_number}
                      onChange={update}
                    />
                    <Field
                      label="Academic Year"
                      name="academic_year"
                      value={card.academic_year}
                      onChange={update}
                    />
                  </>
                ) : (
                  <>
                    <Select
                      label={
                        card.id_type === "JUNIOR_HIGH"
                          ? "Junior High School Grade"
                          : "Senior High School Grade"
                      }
                      name="grade_level"
                      value={card.grade_level}
                      onChange={update}
                      full
                    >
                      {(card.id_type === "JUNIOR_HIGH"
                        ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"]
                        : ["GRADE 11", "GRADE 12"]
                      ).map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </Select>
                    <Field
                      label="Section"
                      name="section_name"
                      value={card.section_name}
                      onChange={update}
                    />
                    <Field
                      label="School Year"
                      name="school_year"
                      value={card.school_year}
                      onChange={update}
                    />
                    <Field
                      label="ID Number"
                      name="student_id_number"
                      value={card.student_id_number}
                      onChange={update}
                    />
                    <Field
                      label="LRN"
                      name="lrn"
                      value={card.lrn}
                      onChange={update}
                    />
                  </>
                )}
                <label className="upload field full">
                  <span>ID Photo Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => studentPhotoUpload(e.target.files?.[0])}
                  />
                  {card.photo_path && (
                    <small>Photo uploaded successfully.</small>
                  )}
                </label>
              </div>

              <h2>Back ID Details</h2>
              <div className="form-grid">
                <Field
                  label="Address Line 1"
                  name="address_line1"
                  value={card.address_line1}
                  onChange={update}
                  full
                />
                <Field
                  label="Address Line 2"
                  name="address_line2"
                  value={card.address_line2}
                  onChange={update}
                  full
                />
                <Field
                  label="Emergency Contact"
                  name="emergency_contact"
                  value={card.emergency_contact}
                  onChange={update}
                />
                <Field
                  label="Emergency Phone"
                  name="emergency_phone"
                  value={card.emergency_phone}
                  onChange={update}
                />
                <div className="field full">
                  <span>Authorized Signatory</span>
                  <input
                    type="text"
                    value={DEPARTMENT_SIGNATORIES[card.id_type] || ""}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-actions">
                <small>
                  Your ID will be saved to the school's ID Management System
                  for review.
                </small>
                <button className="primary" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="s-spin" aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    "Submit ID"
                  )}
                </button>
              </div>
            </form>

            <aside className="preview-panel">
              <div className="preview-head">
                <b>SMART ID 51 PREVIEW</b>
                <span>Front + Back</span>
              </div>
              <div className="preview-card-wrap">
                <FrontCard card={card} />
                <BackCard card={card} />
              </div>
              <div className="export-box">
                <b>Live preview</b>
                <small>
                  This preview shows exactly how your ID will be printed. No
                  download is available here — submit the form and the school
                  will process and release your ID.
                </small>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );

  if (step === "lost")
    return (
      <div className="student-shell student-editor">
        <StudentTopBar onBack={reset} backLabel="← Home" onStaffLogin={onStaffLogin} />
        <main className="content">
          <header className="top">
            <div>
              <h1>Report Lost ID</h1>
              <p>
                Request a reprint of your student ID. Fill in your details and
                attach a copy of your payment receipt (optional). Your details
                are checked against the ID Management System — a request can
                only be submitted if your ID already exists in the system.
              </p>
            </div>
            <div className="top-actions">
              <button onClick={reset}>Cancel</button>
            </div>
          </header>

          {err && <StudentAlert message={err} onClose={() => setErr("")} />}

          <section className="lost-form records">
            <h2>Student Information</h2>
            <div className="form-grid">
              <Field
                label="Student Full Name"
                name="student_name"
                value={lost.student_name}
                onChange={updateLost}
                full
              />
              <Select
                label="Department / ID Type"
                name="id_type"
                value={lost.id_type}
                onChange={(n, v) => {
                  updateLost(n, v);
                  changeLostType(v);
                }}
                full
              >
                <option value="COLLEGE">College Student</option>
                <option value="JUNIOR_HIGH">
                  Basic Education - Junior High School
                </option>
                <option value="SENIOR_HIGH">
                  Basic Education - Senior High School
                </option>
              </Select>

              {lost.id_type === "COLLEGE" ? (
                <>
                  <Select
                    label="College Course"
                    name="course"
                    value={lost.course}
                    onChange={updateLost}
                    full
                  >
                    {COURSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Field
                    label="Student Number"
                    name="student_number"
                    value={lost.student_number}
                    onChange={updateLost}
                    full
                  />
                </>
              ) : (
                <>
                  <Select
                    label={
                      lost.id_type === "JUNIOR_HIGH"
                        ? "Grade Level"
                        : "Grade Level"
                    }
                    name="grade_level"
                    value={lost.grade_level}
                    onChange={updateLost}
                  >
                    {(lost.id_type === "JUNIOR_HIGH"
                      ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"]
                      : ["GRADE 11", "GRADE 12"]
                    ).map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </Select>
                  <Field
                    label="Section"
                    name="section_name"
                    value={lost.section_name}
                    onChange={updateLost}
                  />
                  <Field
                    label="Student / ID Number"
                    name="student_number"
                    value={lost.student_number}
                    onChange={updateLost}
                  />
                  <Field
                    label="LRN (optional)"
                    name="lrn"
                    value={lost.lrn}
                    onChange={updateLost}
                  />
                </>
              )}

              <div className="field full">
                <span>Payment Receipt (optional)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                <small className="upload-hint">
                  {receiptFile
                    ? `Selected: ${receiptFile.name}`
                    : "PNG, JPG, WEBP image or PDF of the reprinting payment receipt."}
                </small>
              </div>
            </div>

            <div className="form-actions">
              <small>
                Your details will be verified against the IDs already created
                in the system.
              </small>
              <button className="primary" onClick={submitLost} disabled={busy}>
                {busy ? (
                  <>
                    <span className="s-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </section>
        </main>
      </div>
    );

  if (step === "lost_done")
    return (
      <div className="student-shell">
        <StudentTopBar onStaffLogin={onStaffLogin} />
        <main className="student-landing">
          <SuccessMedal />
          <h1>Lost ID Request Submitted</h1>
          <p className="student-note">
            Your lost ID reprint request has been submitted to the
            administrator. The school will review your details and payment
            receipt before reprinting your ID. Please wait for confirmation.
          </p>
          {submittedId && (
            <p className="student-ref">
              Request No.: <b>#{submittedId}</b>
            </p>
          )}
          {verifiedRefId && (
            <p className="student-note">
              Your ID was found in the school system (ID record #
              {verifiedRefId}). No need to create a new one.
            </p>
          )}
          <button className="primary student-cta" onClick={reset}>
            Back to Home
          </button>
        </main>
      </div>
    );

  if (step === "done")
    return (
      <div className="student-shell">
        <StudentTopBar onStaffLogin={onStaffLogin} />
        <main className="student-landing">
          <SuccessMedal />
          <h1>ID Request Submitted</h1>
          <p className="student-note">
            Your student ID request has been saved to the Lake Shore Colleges
            ID Management System. Please wait for the school to verify and
            process your ID.
          </p>
          {submittedId && (
            <p className="student-ref">
              Reference No.: <b>#{submittedId}</b>
            </p>
          )}
          <button className="primary student-cta" onClick={reset}>
            Create Another ID
          </button>
          <p className="student-foot">
            <button type="button" className="link-btn" onClick={reset}>
              ← Back to Home
            </button>
          </p>
        </main>
      </div>
    );

  return null;
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [staffLogin, setStaffLogin] = useState(false);
  const [view, setView] = useState("dashboard");
  const [card, setCard] = useState(emptyCard);
  const [cards, setCards] = useState([]);
  const [signatories, setSignatories] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: "",
    username: "",
    full_name: "",
    role: "staff",
    password: "",
    is_active: true,
  });
  const [requests, setRequests] = useState([]);
  const [reqFilter, setReqFilter] = useState("");
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateFilter, setTemplateFilter] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const counts = useMemo(
    () => ({
      COLLEGE: cards.filter((x) => x.id_type === "COLLEGE").length,
      JUNIOR_HIGH: cards.filter((x) => x.id_type === "JUNIOR_HIGH").length,
      SENIOR_HIGH: cards.filter((x) => x.id_type === "SENIOR_HIGH").length,
    }),
    [cards],
  );
  const pendingRequests = useMemo(
    () => requests.filter((x) => x.status === "pending"),
    [requests],
  );
  const shownRequests = useMemo(
    () =>
      requests.filter((x) =>
        `${x.student_name} ${x.course} ${x.grade_level} ${x.section_name} ${x.student_number} ${x.lrn} ${x.status}`
          .toLowerCase()
          .includes(reqFilter.toLowerCase()),
      ),
    [requests, reqFilter],
  );
  const shownTemplates = useMemo(
    () =>
      templates.filter((t) =>
        `${t.name} ${typeTitles[t.id_type] || ""} ${t.id_type}`
          .toLowerCase()
          .includes(templateFilter.toLowerCase()),
      ),
    [templates, templateFilter],
  );
  const activeTemplateFor = (idType) =>
    templates.find((t) => t.id_type === idType && String(t.is_active) === "1") || null;
  async function loadTemplates() {
    try {
      const r = await api("templates");
      setTemplates(r.data);
    } catch (e) {
      /* keep current list */
    }
  }
  async function load() {
    try {
      const [c, s] = await Promise.all([api("cards"), api("signatories")]);

      setCards(c.data);
      setSignatories(s.data);

      /*
       * If currently editing an ID,
       * automatically apply the correct signatory.
       */
      if (card.id_type) {
        applyDepartmentSignatory(card.id_type, s.data);
      }
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function loadUsers() {
    try {
      const r = await api("users");
      setUsers(r.data);
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function loadRequests() {
    try {
      const r = await api("lostIdRequests");
      setRequests(r.data);
    } catch (e) {
      /* nothing - keep current list */
    }
  }
  async function logout() {
    try {
      await api("logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    setStaffLogin(false);
    csrfToken = null;
    setCards([]);
    setSignatories([]);
    setRequests([]);
    setActiveRequestId(null);
    setTemplates([]);
    setEditingTemplate(null);
    setCard(emptyCard);
    setView("dashboard");
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api("me");
        if (!cancelled) setUser(r.data);
      } catch (e) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    const onExpired = () => {
      setUser(null);
      setCards([]);
      setSignatories([]);
      setMsg("Your session has expired. Please sign in again.");
    };
    window.addEventListener("lsc-session-expired", onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener("lsc-session-expired", onExpired);
    };
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user]);
  useEffect(() => {
    if (user && user.role === "admin") loadUsers();
  }, [user]);
  useEffect(() => {
    if (user) loadRequests();
  }, [user]);
  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);
  const update = (n, v) => setCard((p) => ({ ...p, [n]: v }));
  function create(type) {
    const next = {
      ...emptyCard,
      id_type: type,
      grade_level:
        type === "JUNIOR_HIGH"
          ? "GRADE 7"
          : type === "SENIOR_HIGH"
            ? "GRADE 11"
            : "",
      course: type === "COLLEGE" ? COURSES[0] : "",
    };

    const act = activeTemplateFor(type);
    next.template_id = act ? String(act.id) : "";

    setActiveRequestId(null);
    setCard(next);
    setView("editor");
    window.scrollTo(0, 0);

    if (signatories.length > 0) {
      applyDepartmentSignatory(type, signatories);
    }
  }
 function changeType(t) {
  const next = {
    ...card,
    id_type: t,
  };

  if (t === "COLLEGE") {
    next.course = COURSES.includes(next.course)
      ? next.course
      : COURSES[0];

    next.grade_level = "";
    next.section_name = "";
    next.student_id_number = "";
    next.lrn = "";
  }

  if (t === "JUNIOR_HIGH") {
    next.course = "";
    next.grade_level = [
      "GRADE 7",
      "GRADE 8",
      "GRADE 9",
      "GRADE 10",
    ].includes(next.grade_level)
      ? next.grade_level
      : "GRADE 7";
  }

  if (t === "SENIOR_HIGH") {
    next.course = "";
    next.grade_level = [
      "GRADE 11",
      "GRADE 12",
    ].includes(next.grade_level)
      ? next.grade_level
      : "GRADE 11";
  }

  setCard(next);
}
  async function save() {
    try {
      setLoading(true);
      const r = await api("saveCard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      setCard((p) => ({
        ...p,
        id: r.id,
        status: r.status || p.status || "created",
      }));
      if (activeRequestId) {
        try {
          await api("updateLostIdRequest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activeRequestId,
              reference_card_id: r.id,
              status: "approved",
            }),
          });
          setActiveRequestId(null);
          await loadRequests();
        } catch (e) {
          /* keep editing */
        }
      }
      setMsg("ID saved successfully");
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function edit(id) {
    try {
      const r = await api(`card&id=${id}`);
      setActiveRequestId(null);
      setCard(r.data);
      setView("editor");
      window.scrollTo(0, 0);
    } catch (e) {
      setMsg(e.message);
    }
  }
  /* Mark the current ID as completed / ready for printing. */
  async function markCardDone() {
    if (!card.id) return;
    try {
      setLoading(true);
      const r = await api("setCardStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, status: "done" }),
      });
      setCard((p) => ({ ...p, status: r.data.status }));
      setMsg("ID marked as Done — ready for printing.");
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  /*
   * Direct dual-side print on the Smart ID 51.
   * Front page prints in colour and back page in black & white as configured
   * on the printer itself; this job just delivers FRONT then BACK in order.
   * The card is flagged as "printed" (timestamp + counter) after the job.
   */
  async function printDualSide() {
    if (printing) return;
    try {
      setPrinting(true);
      await printCardDualSide();
      if (card.id) {
        const r = await api("setCardStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: card.id, status: "printed" }),
        });
        setCard((p) => ({
          ...p,
          status: r.data.status,
          printed_at: r.data.printed_at,
          print_count: r.data.print_count,
        }));
        setMsg(
          `Print job sent to Smart ID 51 — ID recorded as Printed (#${r.data.print_count}).`,
        );
        await load();
      } else {
        setMsg("Print job sent to Smart ID 51. Save the ID to track its print status.");
      }
    } catch (e) {
      setMsg(e.message);
    } finally {
      setPrinting(false);
    }
  }
  async function editRequest(req) {
    try {
      if (req.reference_card_id) return edit(req.reference_card_id);
      const next = {
        ...emptyCard,
        id_type: req.id_type || "COLLEGE",
        student_name: req.student_name || "",
        course: req.course || "",
        grade_level: req.grade_level || "",
        section_name: req.section_name || "",
        student_number: req.student_number || "",
        lrn: req.lrn || "",
      };
      if (next.id_type === "COLLEGE") {
        next.course = COURSES.includes(next.course) ? next.course : COURSES[0];
        next.grade_level = "";
        next.section_name = "";
        next.student_id_number = "";
        next.lrn = "";
      } else {
        const validGrades =
          next.id_type === "JUNIOR_HIGH"
            ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"]
            : ["GRADE 11", "GRADE 12"];
        next.course = "";
        next.grade_level = validGrades.includes(next.grade_level)
          ? next.grade_level
          : next.id_type === "JUNIOR_HIGH"
            ? "GRADE 7"
            : "GRADE 11";
        next.student_id_number = req.student_number || "";
        next.lrn = req.lrn || "";
        next.student_number = "";
      }
      setActiveRequestId(Number(req.id));
      setCard(next);
      setView("editor");
      window.scrollTo(0, 0);
      if (signatories.length > 0) applyDepartmentSignatory(next.id_type, signatories);
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function setRequestStatus(id, status) {
    if (status === "rejected" && !confirm("Reject this lost ID reprint request?")) return;
    try {
      await api("updateLostIdRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await loadRequests();
      setMsg(`Request #${id} marked as "${status}".`);
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function del(id) {
    if (!confirm("Delete this ID record?")) return;
    try {
      await api("deleteCard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
      setMsg("Record deleted");
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function saveTemplateRecord(id) {
    await loadTemplates();
    setEditingTemplate(null);
    if (id) setMsg("Template saved successfully");
  }
  async function deleteTemplateRecord(id) {
    if (!confirm("Delete this template? This will not affect IDs already created from it."))
      return;
    try {
      await api("deleteTemplate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadTemplates();
      setMsg("Template deleted");
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function setActiveTemplateRecord(id) {
    try {
      await api("setActiveTemplate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadTemplates();
      const t = templates.find((x) => String(x.id) === String(id));
      setMsg(
        `"${t?.name || "Template"}" is now the active template for ${typeTitles[t?.id_type] || ""}.`,
      );
    } catch (e) {
      setMsg(e.message);
    }
  }
  function openTemplateDesigner(t = null) {
    setEditingTemplate(t ? JSON.parse(JSON.stringify(t)) : blankTemplate());
  }
  function openUserForm(u = null) {
    setUserForm(
      u
        ? {
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            role: u.role,
            password: "",
            is_active: String(u.is_active) === "1",
          }
        : {
            id: "",
            username: "",
            full_name: "",
            role: "staff",
            password: "",
            is_active: true,
          },
    );
    setUserFormOpen(true);
    setMsg("");
  }
  const updateUserForm = (n, v) => setUserForm((p) => ({ ...p, [n]: v }));
  async function saveUserForm() {
    try {
      setLoading(true);
      await api("saveUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      setMsg(
        userForm.id
          ? "User account updated successfully"
          : "User account created successfully",
      );
      setUserFormOpen(false);
      await loadUsers();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function deactivateUserAccount(id) {
    if (!confirm("Deactivate this user account? The user will no longer be able to sign in."))
      return;
    try {
      await api("deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadUsers();
      setMsg("User account deactivated");
    } catch (e) {
      setMsg(e.message);
    }
  }
  async function photoUpload(file) {
    if (!file) return;
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("photo", file);
      const r = await api("uploadPhoto", { method: "POST", body: fd });
      update("photo_path", r.path);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  function applyDepartmentSignatory(type, availableSignatories = signatories) {
    const requiredName = DEPARTMENT_SIGNATORIES[type];

    if (!requiredName) {
      return;
    }

    const signatory = availableSignatories.find(
      (s) =>
        String(s.full_name).trim().toLowerCase() ===
        requiredName.trim().toLowerCase(),
    );

    if (signatory) {
      setCard((p) => ({
        ...p,
        signatory_id: signatory.id,
        signatory_name: signatory.full_name,
        signature_path: signatory.signature_path,
      }));
    } else {
      /*
       * Keep the required name even if the database
       * signatory record has not been returned yet.
       */
      setCard((p) => ({
        ...p,
        signatory_id: "",
        signatory_name: requiredName,
        signature_path: "",
      }));
    }
  }
  const shown = cards.filter((x) =>
    `${x.student_name} ${x.student_number} ${x.student_id_number} ${x.lrn}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const shownUsers = users.filter((x) =>
    `${x.full_name} ${x.username} ${x.role}`
      .toLowerCase()
      .includes(userFilter.toLowerCase()),
  );
  if (!authReady)
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="login-mark" style={{ margin: "0 auto 12px" }}>
            LSC
          </div>
          <div>Loading session…</div>
        </div>
      </div>
    );
  if (!user) {
    if (staffLogin)
      return (
        <Login
          onBack={() => setStaffLogin(false)}
          onLogin={(u) => {
            setUser(u);
            setMsg("");
          }}
        />
      );
    return <StudentPortal onStaffLogin={() => setStaffLogin(true)} />;
  }
  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar-brand">
          <div className="app-bar-logo">
            <span className="app-bar-logo-fallback">LSC</span>
            <img
              src={logo}
              alt="Lake Shore Colleges logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="app-bar-title">
            <b>Lake Shore Colleges</b>
            <small>ID Management System</small>
          </div>
        </div>
        <div className="app-bar-user">
          <button
            className="notif-btn"
            onClick={() => {
              setView("requests");
              window.scrollTo(0, 0);
            }}
            title="Lost ID Reprint Requests"
          >
            <span className="notif-icon">🔔</span>
            {pendingRequests.length > 0 && (
              <span className="notif-badge">{pendingRequests.length}</span>
            )}
          </button>
          <div className="user-chip" title={user.username}>
            <span className="user-avatar">
              {(user.full_name || user.username || "U")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </span>
            <span className="user-meta">
              <b>{user.full_name || user.username}</b>
              <small>{user.role === "admin" ? "Administrator" : "Staff"}</small>
            </span>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="content">
        <header className="top">
          <div>
            <h1>
              {view === "dashboard"
                ? "Dashboard"
                : view === "records"
                  ? "Saved IDs"
                  : view === "requests"
                    ? "Lost ID Reprint Requests"
                    : "ID Card Editor"}
            </h1>
            <p>
              {view === "requests"
                ? "Review lost ID reprint requests, view receipts, and re-export updated IDs."
                : "Create, preview, save and export Lake Shore Colleges IDs."}
            </p>
          </div>
          {view === "editor" && (
            <div className="top-actions editor-top-actions">
              <button
                className="primary"
                onClick={save}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="s-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save ID"
                )}
              </button>
              <button
                onClick={() => {
                  setActiveRequestId(null);
                  setView("dashboard");
                }}
              >
                Back
              </button>
            </div>
          )}
        </header>
        {msg && (
          <div className="alert">
            {msg}
            <button onClick={() => setMsg("")}>×</button>
          </div>
        )}
        {view === "dashboard" && (
          <>
            <div className="dashboard-grid">
              <Dash
                title="College"
                count={counts.COLLEGE}
                action={() => create("COLLEGE")}
                desc="Create college student IDs with editable course, student number and photo."
              />
              <Dash
                title="Junior High School"
                count={counts.JUNIOR_HIGH}
                action={() => create("JUNIOR_HIGH")}
                desc="Grade 7 to Grade 10 with color-coded name bands."
              />
              <Dash
                title="Senior High School"
                count={counts.SENIOR_HIGH}
                action={() => create("SENIOR_HIGH")}
                desc="Grade 11 and Grade 12 with separate color-coded layouts."
              />
              <Dash
                title="Saved IDs"
                count={cards.length}
                action={() => {
                  setFilter("");
                  setView("records");
                  window.scrollTo(0, 0);
                }}
                desc="View, search, edit and manage student IDs already saved in the database."
                buttonLabel="View Saved IDs"
              />
              <Dash
                title="Lost ID Requests"
                count={pendingRequests.length}
                action={() => {
                  setReqFilter("");
                  setView("requests");
                  window.scrollTo(0, 0);
                }}
                desc="Reprint requests for lost student IDs including pending notifications and uploaded payment receipts."
                buttonLabel="View Requests"
              />
              {user.role === "admin" && (
                <Dash
                  title="User Accounts"
                  count={users.length}
                  action={() => {
                    setUserFilter("");
                    setView("users");
                    window.scrollTo(0, 0);
                  }}
                  desc="Create and manage accounts for multiple users, assign roles, reset passwords and deactivate access."
                  buttonLabel="Manage Users"
                />
              )}
              {user.role === "admin" && (
                <Dash
                  title="ID Templates"
                  count={templates.length}
                  action={() => {
                    setTemplateFilter("");
                    setView("templates");
                    window.scrollTo(0, 0);
                  }}
                  desc="Upload an existing ID design (PNG/JPG) and use it as a 100% exact-copy template. Place data zones and auto-match by department."
                  buttonLabel="Manage Templates"
                />
              )}
            </div>
            {pendingRequests.length > 0 && (
              <section className="request-alerts">
                <h2>
                  Lost ID Reprint Notifications ({pendingRequests.length})
                </h2>
                {pendingRequests.slice(0, 5).map((r) => (
                  <div className="request-alert-item" key={r.id}>
                    <div className="request-alert-info">
                      <b>{r.student_name}</b>
                      <span>
                        {r.course ||
                          `${r.grade_level} ${r.section_name}`}{" "}
                        • Request #{r.id}
                      </span>
                    </div>
                    <div className="request-alert-actions">
                      {r.receipt_path && (
                        <a
                          href={assetUrl(r.receipt_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="ghost-link"
                        >
                          Receipt
                        </a>
                      )}
                      <button
                        className="primary"
                        onClick={() => editRequest(r)}
                      >
                        View & Edit ID
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
            <section className="dashboard-preview">
              <div>
                <h2>Smart ID 51 / CR80 export</h2>
                <p>
                  Front and back previews use the supplied 642 × 1013 design
                  proportion. Export is rendered at 3× for high-resolution PNG
                  or JPG transfer into the card software.
                </p>
              </div>
              <div className="mini-cards">
                <div>
                  FRONT
                  <br />
                  <small>54 × 85.6 mm</small>
                </div>
                <div>
                  BACK
                  <br />
                  <small>54 × 85.6 mm</small>
                </div>
              </div>
            </section>
          </>
        )}
        {view === "editor" && (
          <div className="editor-layout">
            <section className="editor-form">
              <h2>ID Template</h2>
              <div className="form-grid">
                <div className="field full">
                  <span>Active template for {typeTitles[card.id_type]}</span>
                  <select
                    value={card.template_id || ""}
                    onChange={(e) => update("template_id", e.target.value)}
                  >
                    <option value="">— Default LSC design (no template) —</option>
                    {templates
                      .filter((t) => t.id_type === card.id_type)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {String(t.is_active) === "1" ? " (active)" : ""}
                        </option>
                      ))}
                  </select>
                  <small>
                    {card.template_id
                      ? "The uploaded design is used as a 100% exact copy. Only the data zones are drawn on top."
                      : "No template selected — the built-in LSC design is used."}
                  </small>
                </div>
              </div>
              <h2>Student Details</h2>
              <div className="form-grid">
                <div className="field full">
                  <span>Department / ID Type</span>
                  <input
                    type="text"
                    value={typeTitles[card.id_type] || ""}
                    readOnly
                  />
                </div>
                <Field
                  label="Student Full Name"
                  name="student_name"
                  value={card.student_name}
                  onChange={update}
                  full
                />
                {card.id_type === "COLLEGE" ? (
                  <>
                    <Select
                      label="Course"
                      name="course"
                      value={card.course}
                      onChange={update}
                      full
                    >
                      {COURSES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                    <Field
                      label="Student ID Number"
                      name="student_number"
                      value={card.student_number}
                      onChange={update}
                    />
                  </>
                ) : (
                  <>
                    <Select
                      label={
                        card.id_type === "JUNIOR_HIGH"
                          ? "Junior High School Grade"
                          : "Senior High School Grade"
                      }
                      name="grade_level"
                      value={card.grade_level}
                      onChange={update}
                      full
                    >
                      {(card.id_type === "JUNIOR_HIGH"
                        ? ["GRADE 7", "GRADE 8", "GRADE 9", "GRADE 10"]
                        : ["GRADE 11", "GRADE 12"]
                      ).map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </Select>
                    <Field
                      label="Section"
                      name="section_name"
                      value={card.section_name}
                      onChange={update}
                    />
                    <Field
                      label="School Year"
                      name="school_year"
                      value={card.school_year}
                      onChange={update}
                    />
                    <Field
                      label="ID Number"
                      name="student_id_number"
                      value={card.student_id_number}
                      onChange={update}
                    />
                    <Field
                      label="LRN"
                      name="lrn"
                      value={card.lrn}
                      onChange={update}
                    />
                  </>
                )}
                <label className="upload field full">
                  <span>ID Photo Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => photoUpload(e.target.files?.[0])}
                  />
                  {card.photo_path && (
                    <small>Photo uploaded successfully.</small>
                  )}
                </label>
              </div>
              <h2>Back ID Details</h2>
              <div className="form-grid">
                <Field
                  label="Address Line 1"
                  name="address_line1"
                  value={card.address_line1}
                  onChange={update}
                  full
                />
                <Field
                  label="Address Line 2"
                  name="address_line2"
                  value={card.address_line2}
                  onChange={update}
                  full
                />
                <Field
                  label="Emergency Contact"
                  name="emergency_contact"
                  value={card.emergency_contact}
                  onChange={update}
                />
                <Field
                  label="Emergency Phone"
                  name="emergency_phone"
                  value={card.emergency_phone}
                  onChange={update}
                />
                <div className="field full">
                  <span>Authorized Signatory</span>
                  <input
                    type="text"
                    value={DEPARTMENT_SIGNATORIES[card.id_type] || ""}
                    readOnly
                  />
                </div>
              </div>
            </section>
            <aside className="preview-panel">
              <div className="preview-head">
                <b>SMART ID 51 PREVIEW</b>
                <span>Front + Back</span>
              </div>
              <div className="status-bar">
                <span
                  className={
                    "badge card-status-" + cardStatus(card.status).toLowerCase()
                  }
                >
                  Status: {cardStatus(card.status)}
                </span>
                {card.status === "printed" && card.print_count > 0 && (
                  <small className="print-meta">
                    Printed ×{card.print_count}
                    {card.printed_at
                      ? ` · ${formatDateTime(card.printed_at)}`
                      : ""}
                  </small>
                )}
                {card.id && card.status !== "done" && card.status !== "printed" && (
                  <button
                    className="primary btn-done"
                    onClick={markCardDone}
                    disabled={loading}
                  >
                    ✓ Mark as Done
                  </button>
                )}
              </div>
              <div className="preview-card-wrap">
                {(() => {
                  const tpl = templates.find(
                    (t) => String(t.id) === String(card.template_id),
                  );
                  if (tpl && tpl.front_image) {
                    return (
                      <>
                        <TemplateCard card={card} template={tpl} side="front" />
                        {tpl.back_image ? (
                          <TemplateCard card={card} template={tpl} side="back" />
                        ) : (
                          <BackCard card={card} />
                        )}
                      </>
                    );
                  }
                  return (
                    <>
                      <FrontCard card={card} />
                      <BackCard card={card} />
                    </>
                  );
                })()}
              </div>
              <div className="export-box">
                <b>Direct print — Smart ID 51 (dual side)</b>
                <button
                  className="primary print-btn"
                  onClick={printDualSide}
                  disabled={printing}
                >
                  {printing ? "Preparing print…" : "🖨 Print Front + Back"}
                </button>
                <small>
                  Sends ONE job to the Smart ID 51: page 1 = FRONT (colour),
                  page 2 = BACK (black &amp; white). The printer driver handles
                  duplex and panel selection. Printing records the ID as{" "}
                  <b>Printed</b> with date and counter.
                </small>
              </div>
              <div className="export-box">
                <b>Export for Smart ID software</b>
                <ExportButtons />{" "}
                <small>
                  Output is 1276 × 2022 px at 600 DPI — exact CR80 high-resolution print.
                  Pure white background, no shadows or borders.
                </small>
              </div>
            </aside>
          </div>
        )}
        {view === "records" && (
          <section className="records">
            <div className="record-toolbar">
              <button
                onClick={() => {
                  setFilter("");
                  setView("dashboard");
                  window.scrollTo(0, 0);
                }}
              >
                ← Back to Dashboard
              </button>

              <input
                placeholder="Search student name, ID, LRN..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />

              <button className="primary" onClick={() => create("COLLEGE")}>
                + Create New ID
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Course / Grade</th>
                  <th>ID / LRN</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "28px" }}>
                      {filter
                        ? "No saved IDs match your search."
                        : "No saved student IDs yet."}
                    </td>
                  </tr>
                ) : (
                  shown.map((x) => (
                    <tr key={x.id}>
                      <td>{x.student_name}</td>
                      <td>{typeTitles[x.id_type]}</td>
                      <td>{x.course || `${x.grade_level} ${x.section_name}`}</td>
                      <td>{x.student_number || x.student_id_number || x.lrn}</td>
                      <td>
                        <span
                          className={
                            "badge card-status-" +
                            cardStatus(x.status).toLowerCase()
                          }
                          title={
                            x.status === "printed" && x.printed_at
                              ? `Printed ×${x.print_count} · ${formatDateTime(x.printed_at)}`
                              : undefined
                          }
                        >
                          {cardStatus(x.status)}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => edit(x.id)}>Edit / View</button>
                        <button className="danger" onClick={() => del(x.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}
        {view === "users" && user.role === "admin" && (
          <section className="records">
            <div className="record-toolbar">
              <button
                onClick={() => {
                  setView("dashboard");
                  window.scrollTo(0, 0);
                }}
              >
                ← Back to Dashboard
              </button>
              <input
                placeholder="Search users..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              <button className="primary" onClick={() => openUserForm()}>
                + New User
              </button>
            </div>
            {userFormOpen && (
              <div className="user-form">
                <h2>
                  {userForm.id
                    ? "Edit User Account"
                    : "Create New User Account"}
                </h2>
                <div className="form-grid">
                  <Field
                    label="Full Name"
                    name="full_name"
                    value={userForm.full_name}
                    onChange={updateUserForm}
                  />
                  <Field
                    label="Username / Email"
                    name="username"
                    value={userForm.username}
                    onChange={updateUserForm}
                  />
                  <Select
                    label="Role"
                    name="role"
                    value={userForm.role}
                    onChange={updateUserForm}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </Select>
                  <Field
                    label={
                      userForm.id
                        ? "New Password (leave blank to keep current)"
                        : "Password"
                    }
                    name="password"
                    type="password"
                    value={userForm.password}
                    onChange={updateUserForm}
                  />
                  <label className="field">
                    <span>Status</span>
                    <select
                      value={userForm.is_active ? "1" : "0"}
                      onChange={(e) =>
                        updateUserForm("is_active", e.target.value === "1")
                      }
                    >
                      <option value="1">Active</option>
                      <option value="0">Deactivated</option>
                    </select>
                  </label>
                </div>
                <div className="user-form-actions">
                  <button
                    className="primary"
                    onClick={saveUserForm}
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : userForm.id
                        ? "Update User"
                        : "Create User"}
                  </button>
                  <button onClick={() => setUserFormOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "28px" }}
                    >
                      {userFilter
                        ? "No users match your search."
                        : "No user accounts yet."}
                    </td>
                  </tr>
                ) : (
                  shownUsers.map((u) => {
                    const active = String(u.is_active) === "1";
                    return (
                      <tr key={u.id}>
                        <td>{u.full_name}</td>
                        <td>{u.username}</td>
                        <td>
                          <span className={"badge " + u.role}>
                            {u.role === "admin" ? "Administrator" : "Staff"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={"badge " + (active ? "active" : "inactive")}
                          >
                            {active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => openUserForm(u)}>
                            Edit / Reset Password
                          </button>
                          {active && (
                            <button
                              className="danger"
                              onClick={() => deactivateUserAccount(u.id)}
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        )}
        {view === "requests" && (
          <section className="records">
            <div className="record-toolbar">
              <button
                onClick={() => {
                  setReqFilter("");
                  setView("dashboard");
                  window.scrollTo(0, 0);
                }}
              >
                ← Back to Dashboard
              </button>
              <input
                placeholder="Search name, course, grade, status..."
                value={reqFilter}
                onChange={(e) => setReqFilter(e.target.value)}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Student</th>
                  <th>Course / Grade</th>
                  <th>ID / LRN</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "28px" }}
                    >
                      {reqFilter
                        ? "No lost ID requests match your search."
                        : "No lost ID requests yet."}
                    </td>
                  </tr>
                ) : (
                  shownRequests.map((r) => {
                    const done =
                      r.status === "reprinted" || r.status === "rejected";
                    return (
                      <tr key={r.id}>
                        <td>
                          <b>#{r.id}</b>
                        </td>
                        <td>{r.student_name}</td>
                        <td>
                          {r.course ||
                            `${r.grade_level} ${r.section_name}` || "—"}
                        </td>
                        <td>
                          {r.student_number ||
                            r.student_id_number ||
                            r.lrn ||
                            "—"}
                        </td>
                        <td>
                          <span className={"badge req-" + r.status}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.receipt_path ? (
                            <a
                              href={assetUrl(r.receipt_path)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                        <td>
                          <button onClick={() => editRequest(r)}>
                            Edit ID & Export
                          </button>
                          {r.status !== "approved" && !done && (
                            <button
                              onClick={() => setRequestStatus(r.id, "approved")}
                            >
                              Approve
                            </button>
                          )}
                          {!done && (
                            <button
                              onClick={() =>
                                setRequestStatus(r.id, "reprinted")
                              }
                            >
                              Mark Printed
                            </button>
                          )}
                          {r.status !== "rejected" &&
                            r.status !== "reprinted" && (
                              <button
                                className="danger"
                                onClick={() =>
                                  setRequestStatus(r.id, "rejected")
                                }
                              >
                                Reject
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        )}
        {view === "templates" && user.role === "admin" && (
          <section className="records">
            <div className="record-toolbar">
              <button
                onClick={() => {
                  setTemplateFilter("");
                  setView("dashboard");
                  window.scrollTo(0, 0);
                }}
              >
                ← Back to Dashboard
              </button>
              <input
                placeholder="Search templates..."
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
              />
              <button className="primary" onClick={() => openTemplateDesigner(null)}>
                ＋ New Template
              </button>
            </div>
            {shownTemplates.length === 0 ? (
              <div className="tpl-empty">
                <b>No templates yet.</b>
                <p>
                  Upload an existing ID design (PNG/JPG) to use it as a{" "}
                  <b>100% exact-copy template</b>. Place data zones on the
                  image, and new IDs of that department will automatically use
                  the template.
                </p>
              </div>
            ) : (
              <div className="tpl-grid">
                {shownTemplates.map((t) => {
                  const zones = t.fields_json || [];
                  const isActive = String(t.is_active) === "1";
                  const isSystem = String(t.is_system) === "1";
                  return (
                    <div className="tpl-card" key={t.id}>
                      <div className="tpl-thumb">
                        {t.front_image ? (
                          <img src={assetUrl(t.front_image)} alt={t.name} />
                        ) : (
                          <span className="tpl-thumb-empty">
                            {isSystem ? "Built-in CSS design" : "No image"}
                          </span>
                        )}
                        {isSystem && (
                          <span className="tpl-badge-system">ORIGINAL</span>
                        )}
                        {isActive && <span className="tpl-badge-active">ACTIVE</span>}
                      </div>
                      <div className="tpl-info">
                        <b>{t.name}</b>
                        <span className="tpl-dept">{typeTitles[t.id_type]}</span>
                        <small>
                          {isSystem ? ("The built-in Lake Shore Colleges design — protected and cannot be deleted.") : (<> {zones.length} data zone{zones.length === 1 ? "" : "s"} • {" "} {t.back_image ? "front + back" : "front only"}</>)}
                        </small>
                      </div>
                      <div className="tpl-actions">
                        {isSystem ? (
                          <span className="tpl-protected">
                            🔒 Original template (protected)
                          </span>
                        ) : (
                          <button onClick={() => openTemplateDesigner(t)}>
                            Edit Design
                          </button>
                        )}
                        {!isActive && (
                          <button
                            className="primary"
                            onClick={() => setActiveTemplateRecord(t.id)}
                          >
                            Set Active
                          </button>
                        )}
                        {!isSystem && (
                          <button
                            className="danger"
                            onClick={() => deleteTemplateRecord(t.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {editingTemplate && (
          <TemplateDesigner
            initial={editingTemplate}
            onCancel={() => setEditingTemplate(null)}
            onSave={saveTemplateRecord}
          />
        )}
      </main>
    </div>
  );
}
function Dash({
  title,
  count,
  action,
  desc,
  buttonLabel = "Create ID",
}) {
  return (
    <div className="dash-card">
      <div className="dash-head">
        <span className="dash-count">{count}</span>
        <h2>{title}</h2>
      </div>
      <p>{desc}</p>
      <button className="primary" onClick={action}>
        {buttonLabel}
      </button>
    </div>
  );
}

function ExportButtons() {
  const [busy, setBusy] = useState(null);
  async function go(id, fmt) {
    try {
      setBusy(id + "-" + fmt);
      await exportCard(id, fmt);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="export-grid">
      <button onClick={() => go("front-card", "png")} disabled={!!busy}>
        {busy === "front-card-png" ? "Exporting…" : "Front PNG"}
      </button>
      <button onClick={() => go("back-card", "png")} disabled={!!busy}>
        {busy === "back-card-png" ? "Exporting…" : "Back PNG"}
      </button>
      <button onClick={() => go("front-card", "jpg")} disabled={!!busy}>
        {busy === "front-card-jpg" ? "Exporting…" : "Front JPG"}
      </button>
      <button onClick={() => go("back-card", "jpg")} disabled={!!busy}>
        {busy === "back-card-jpg" ? "Exporting…" : "Back JPG"}
      </button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const FONT = {body:path.join(ASSETS, "PlexThai-Regular.ttf"), bodyB:path.join(ASSETS, "PlexThai-SemiBold.ttf"), head:path.join(ASSETS, "Kanit-Bold.ttf"), headS:path.join(ASSETS, "Kanit-SemiBold.ttf")};

/* certificate/certificate.json — partner organisation and signatures, filled in later (no code change needed)
   { "issuer": "...", "partner": {"name": "...", "logo": "partner.png"} | null, "signatures": [{"name":"...","title":"...","image":"sign1.png"}] } */
export function loadCertConfig(){
  const def = {issuer:"ทีม PROJECT : 2050 · Garena Academy Game Maker", partner:null, signatures:[]};
  try {
    const j = JSON.parse(fs.readFileSync(config.certConfigPath, "utf8"));
    return {...def, ...j, dir:path.dirname(config.certConfigPath)};
  } catch { return {...def, dir:null}; }
}
const thaiDate = d => new Intl.DateTimeFormat("th-TH", {dateStyle:"long", timeZone:config.timeZone}).format(d);
const GRADE = {S:"เกรด S · โลกฟื้นคืน", A:"เกรด A · ทันเวลา", B:"เกรด B · ชนะแบบเฉียดฉิว"};

export function verifyUrl(code, req){
  const base = config.publicUrl || (req ? `${req.protocol}://${req.headers.host}` : "");
  return `${base}/verify/${encodeURIComponent(code)}`;
}

/* A4 landscape certificate → Buffer */
export function certificatePdf(cert, req){
  const cfg = loadCertConfig();
  const doc = new PDFDocument({size:"A4", layout:"landscape", margin:0, info:{Title:`Certificate ${cert.code}`, Author:"PROJECT : 2050"}});
  const chunks = []; doc.on("data", c => chunks.push(c));
  const done = new Promise(res => doc.on("end", () => res(Buffer.concat(chunks))));
  for (const [k, f] of Object.entries(FONT)) doc.registerFont(k, f);
  const W = doc.page.width, H = doc.page.height;
  // background + frame
  doc.rect(0, 0, W, H).fill("#fbfaf5");
  doc.rect(18, 18, W - 36, H - 36).lineWidth(6).stroke("#0e6e66");
  doc.rect(30, 30, W - 60, H - 60).lineWidth(1.2).stroke("#4fd1c5");
  // green corner bands
  doc.save().polygon([0, 0], [150, 0], [0, 150]).fill("#4fd1c5").restore();
  doc.save().polygon([W, H], [W - 150, H], [W, H - 150]).fill("#2f9e6f").restore();
  // logos
  const logo = path.join(ASSETS, "logo.png");
  if (fs.existsSync(logo)) doc.image(logo, W / 2 - 40, 50, {width:80});
  if (cfg.partner && cfg.partner.logo && cfg.dir){ const pl = path.join(cfg.dir, cfg.partner.logo); if (fs.existsSync(pl)) doc.image(pl, W - 170, 52, {fit:[110, 70], align:"right"}); }
  const center = (txt, y, font, size, color = "#0b1a20", opts = {}) => { doc.font(font).fontSize(size).fillColor(color).text(txt, 60, y, {width:W - 120, align:"center", ...opts}); };
  center("เกียรติบัตร", 135, "head", 44, "#0e6e66");
  center("CERTIFICATE OF ACHIEVEMENT", 192, "headS", 12, "#5b7a77", {characterSpacing:3});
  center("ฉบับนี้ให้ไว้เพื่อแสดงว่า", 222, "body", 16, "#33484c");
  center(cert.full_name, 250, "head", 34, "#0b1a20");
  doc.moveTo(W / 2 - 200, 302).lineTo(W / 2 + 200, 302).lineWidth(1).stroke("#9fb8b4");
  center("ได้ปฏิบัติภารกิจในเกม PROJECT : 2050 ภารกิจกู้วิกฤตโลก สำเร็จ", 316, "bodyB", 16, "#0b1a20");
  center("นำโลกสู่การปล่อยคาร์บอนสุทธิเป็นศูนย์ (Net Zero) ได้ก่อนสิ้นปี 2050 ตามเป้าหมายการพัฒนาที่ยั่งยืน ข้อ 13", 342, "body", 13.5, "#33484c");
  if (cert.grade) center(`ระดับผลงาน: ${GRADE[cert.grade] || cert.grade}`, 372, "bodyB", 14, "#b07800");
  center(`ให้ไว้ ณ วันที่ ${thaiDate(new Date(cert.issued_at))}`, 398, "body", 13.5, "#33484c");
  // signatures (or the issuer line)
  const sigs = Array.isArray(cfg.signatures) ? cfg.signatures.slice(0, 3) : [];
  if (sigs.length){
    const gap = (W - 120) / sigs.length;
    sigs.forEach((s, i) => {
      const cx = 60 + gap * i + gap / 2;
      if (s.image && cfg.dir){ const f = path.join(cfg.dir, s.image); if (fs.existsSync(f)) doc.image(f, cx - 60, 430, {fit:[120, 42], align:"center"}); }
      doc.moveTo(cx - 90, 476).lineTo(cx + 90, 476).lineWidth(.8).stroke("#9fb8b4");
      doc.font("bodyB").fontSize(12).fillColor("#0b1a20").text(s.name || "", cx - 120, 481, {width:240, align:"center"});
      doc.font("body").fontSize(10.5).fillColor("#5b7a77").text(s.title || "", cx - 120, 499, {width:240, align:"center"});
    });
  } else {
    center(cfg.partner && cfg.partner.name ? `${cfg.issuer} ร่วมกับ ${cfg.partner.name}` : cfg.issuer, 450, "bodyB", 13, "#0e6e66");
  }
  // footer: code + verification link
  doc.font("body").fontSize(9.5).fillColor("#5b7a77").text(`รหัสเกียรติบัตร ${cert.code}  ·  ตรวจสอบได้ที่ ${verifyUrl(cert.code, req)}`, 60, H - 62, {width:W - 120, align:"center"});
  doc.end();
  return done;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
/* public verification page */
export function verifyHtml(cert, code){
  const ok = !!cert;
  const body = ok
    ? `<div class="ok">✓ เกียรติบัตรนี้ออกโดยเกม PROJECT : 2050 จริง</div>
       <h1>${esc(cert.full_name)}</h1>
       <p>ปฏิบัติภารกิจนำโลกสู่ Net Zero สำเร็จ${cert.grade ? ` · ${esc(GRADE[cert.grade] || cert.grade)}` : ""}</p>
       <p class="m">ออกเมื่อ ${esc(thaiDate(new Date(cert.issued_at)))} · รหัส ${esc(cert.code)}</p>
       <p><a href="/api/certificates/${encodeURIComponent(cert.code)}/pdf">ดาวน์โหลด PDF</a></p>`
    : `<div class="bad">✕ ไม่พบเกียรติบัตรรหัส ${esc(code)}</div><p>ตรวจสอบว่าพิมพ์รหัสถูกต้อง (รูปแบบ P2050-XXXX-XXXX)</p>`;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ตรวจสอบเกียรติบัตร · PROJECT : 2050</title>
<style>body{margin:0;background:#061015;color:#e6f0ee;font-family:"IBM Plex Sans Thai",system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
main{max-width:560px;width:100%;background:#0e1d24;border:1px solid #24414b;border-radius:16px;padding:28px}
h1{font-size:28px;margin:12px 0 6px}.ok{color:#5fd39a;font-weight:600}.bad{color:#ff5a4a;font-weight:600}.m{color:#8fa9a6;font-size:14px}a{color:#4fd1c5}
.brand{font-family:monospace;color:#4fd1c5;font-size:12px;letter-spacing:.1em}</style></head>
<body><main><div class="brand">PROJECT : 2050 · CERTIFICATE CHECK</div>${body}</main></body></html>`;
}

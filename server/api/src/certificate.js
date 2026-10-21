import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const FONT = {body:path.join(ASSETS, "PlexThai-Regular.ttf"), bodyB:path.join(ASSETS, "PlexThai-SemiBold.ttf"), head:path.join(ASSETS, "Kanit-Bold.ttf"), headS:path.join(ASSETS, "Kanit-SemiBold.ttf")};

/* certificate/certificate.json — partner organisation and signatures, filled in later (no code change needed)
   { "issuer": "...", "partner": {"name": "...", "logo": "partner.png"} | null, "signatures": [{"name":"...","title":"...","image":"sign1.png"}] } */
export function loadCertConfig(){
  const def = {issuer:TEAM, partner:null, signatures:[]};
  try {
    const j = JSON.parse(fs.readFileSync(config.certConfigPath, "utf8"));
    return {...def, ...j, dir:path.dirname(config.certConfigPath)};
  } catch { return {...def, dir:null}; }
}
export const TEAM = "ทีม ส่งงานวินาทีสุดท้ายเพราะไส้กรอกหมดแล้วหมดกำลังใจปั่นงาน";
/* what a player who finishes both modes has practised in the game (written as learning outcomes) */
export const OUTCOMES = [
  "อธิบายสาเหตุและผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศ และความสัมพันธ์ระหว่างการปล่อยก๊าซเรือนกระจกกับอุณหภูมิเฉลี่ยของโลกได้",
  "วิเคราะห์และเลือกใช้มาตรการลดก๊าซเรือนกระจกในภาคพลังงาน อุตสาหกรรม คมนาคม เกษตรกรรม และป่าไม้ โดยคำนึงถึงทรัพยากรและแร่ที่จำเป็น",
  "วางแผนเชิงกลยุทธ์ภายใต้ข้อจำกัดด้านงบประมาณ เวลา และการยอมรับของประชาชน พร้อมประเมินผลได้ผลเสียของการตัดสินใจ",
  "เข้าใจบทบาทของความร่วมมือระหว่างประเทศ การทูตด้านสภาพภูมิอากาศ และการปรับตัวเพื่อลดความเสี่ยงจากภัยพิบัติ",
];
const thaiDate = d => new Intl.DateTimeFormat("th-TH", {dateStyle:"long", timeZone:config.timeZone}).format(d);
const GRADE = {S:"เกรด S · โลกฟื้นคืน", A:"เกรด A · ทันเวลา", B:"เกรด B · ชนะแบบเฉียดฉิว"};

export function verifyUrl(code, req){
  const base = config.publicUrl || (req ? `${req.protocol}://${req.headers.host}` : "");
  return `${base}/verify/${encodeURIComponent(code)}`;
}

/* A4 landscape certificate → Buffer */
export async function certificatePdf(cert, req, over = {}){
  const cfg = loadCertConfig();
  if (over.issuer) cfg.issuer = over.issuer;                                   // set on the admin page
  if (over.partner) cfg.partner = {...(cfg.partner || {}), name:over.partner};
  const url = verifyUrl(cert.code, req);
  const qr = await QRCode.toBuffer(url, {margin:1, width:300, color:{dark:"#0b1a20", light:"#ffffff"}});
  const doc = new PDFDocument({size:"A4", layout:"landscape", margin:0, info:{Title:`เกียรติบัตร ${cert.code}`, Author:"Project Zero", Subject:"Project Zero certificate"}});
  const chunks = []; doc.on("data", c => chunks.push(c));
  const done = new Promise(res => doc.on("end", () => res(Buffer.concat(chunks))));
  for (const [k, f] of Object.entries(FONT)) doc.registerFont(k, f);
  const W = doc.page.width, H = doc.page.height;
  // background + frame
  doc.rect(0, 0, W, H).fill("#fbfaf5");
  doc.rect(18, 18, W - 36, H - 36).lineWidth(6).stroke("#0e6e66");
  doc.rect(30, 30, W - 60, H - 60).lineWidth(1.2).stroke("#4fd1c5");
  doc.save().polygon([0, 0], [130, 0], [0, 130]).fill("#4fd1c5").restore();
  doc.save().polygon([W, H], [W - 130, H], [W, H - 130]).fill("#2f9e6f").restore();
  // logos
  const logo = path.join(ASSETS, "logo.png");
  if (fs.existsSync(logo)) doc.image(logo, W / 2 - 32, 42, {width:64});
  if (cfg.partner && cfg.partner.logo && cfg.dir){ const pl = path.join(cfg.dir, cfg.partner.logo); if (fs.existsSync(pl)) doc.image(pl, W - 160, 46, {fit:[100, 60], align:"right"}); }
  const center = (txt, y, font, size, color = "#0b1a20", opts = {}) => { doc.font(font).fontSize(size).fillColor(color).text(txt, 70, y, {width:W - 140, align:"center", ...opts}); };
  center("เกียรติบัตร", 106, "head", 36, "#0e6e66");
  center("CERTIFICATE OF ACHIEVEMENT", 152, "headS", 10.5, "#5b7a77", {characterSpacing:3});
  center("ฉบับนี้ให้ไว้เพื่อแสดงว่า", 172, "body", 13.5, "#33484c");
  center(cert.full_name, 192, "head", 28, "#0b1a20");
  doc.moveTo(W / 2 - 190, 234).lineTo(W / 2 + 190, 234).lineWidth(1).stroke("#9fb8b4");
  center("ได้ผ่านภารกิจในเกม Project Zero ภารกิจกู้วิกฤตโลก ครบทั้งโหมดปกติและโหมด Hard Core", 244, "bodyB", 13.5, "#0b1a20");
  center(`โดยนำโลกสู่การปล่อยคาร์บอนสุทธิเป็นศูนย์ (Net Zero) ได้ก่อนสิ้นปี ค.ศ. 2050 ตามเป้าหมายการพัฒนาที่ยั่งยืน ข้อ 13${cert.grade ? `  ·  ระดับผลงาน ${GRADE[cert.grade] || cert.grade}` : ""}`, 264, "body", 11.5, "#33484c");
  // learning outcomes (two columns; each row as tall as its longer item)
  const boxX = 76, boxY = 286, boxW = W - 152, colW = (boxW - 54) / 2;
  doc.font("body").fontSize(9.4);
  const hOf = t => doc.heightOfString(t, {width:colW - 18, lineGap:.5});
  const rows = [0, 2].map(i => Math.max(hOf(OUTCOMES[i]), hOf(OUTCOMES[i + 1] || "")) + 7);
  const boxH = 32 + rows[0] + rows[1] + 4;
  doc.roundedRect(boxX, boxY, boxW, boxH, 10).fill("#eef7f5");
  doc.font("bodyB").fontSize(11.5).fillColor("#0e6e66").text("ผลการเรียนรู้ที่ได้รับจากการผ่านภารกิจ", boxX + 18, boxY + 9);
  OUTCOMES.forEach((t, i) => {
    const cx = boxX + 18 + (i % 2) * (colW + 18), cy = boxY + 32 + (i < 2 ? 0 : rows[0]);
    doc.circle(cx + 6, cy + 7, 6).fill("#2f9e6f");
    doc.font("bodyB").fontSize(8).fillColor("#ffffff").text(String(i + 1), cx + 2.6, cy + 2.3, {width:7, align:"center"});
    doc.font("body").fontSize(9.4).fillColor("#22383c").text(t, cx + 18, cy, {width:colW - 18, lineGap:.5});
  });
  const y0 = boxY + boxH + 10;
  center(`ให้ไว้ ณ วันที่ ${thaiDate(new Date(cert.issued_at))}`, y0, "body", 12, "#33484c");
  // signatures, or the issuing team
  const sigs = Array.isArray(cfg.signatures) ? cfg.signatures.slice(0, 3) : [], sy = y0 + 22;
  if (sigs.length){
    const left = 70, right = W - 200, gap = (right - left) / sigs.length;
    sigs.forEach((s, i) => {
      const cx = left + gap * i + gap / 2;
      if (s.image && cfg.dir){ const f = path.join(cfg.dir, s.image); if (fs.existsSync(f)) doc.image(f, cx - 55, sy, {fit:[110, 34], align:"center"}); }
      doc.moveTo(cx - 85, sy + 38).lineTo(cx + 85, sy + 38).lineWidth(.8).stroke("#9fb8b4");
      doc.font("bodyB").fontSize(11).fillColor("#0b1a20").text(s.name || "", cx - 110, sy + 42, {width:220, align:"center"});
      doc.font("body").fontSize(9.5).fillColor("#5b7a77").text(s.title || "", cx - 110, sy + 58, {width:220, align:"center"});
    });
  } else {
    doc.font("body").fontSize(10.5).fillColor("#5b7a77").text("ออกโดย", 70, sy + 4, {width:W - 340, align:"center"});
    doc.font("bodyB").fontSize(12.5).fillColor("#0e6e66").text(cfg.issuer || TEAM, 70, sy + 20, {width:W - 340, align:"center"});
    doc.font("body").fontSize(10.5).fillColor("#33484c").text(cfg.partner && cfg.partner.name ? `ร่วมกับ ${cfg.partner.name} · Garena Academy Game Maker` : "Garena Academy Game Maker", 70, sy + 40, {width:W - 340, align:"center"});
  }
  // QR code for checking the certificate online
  const qx = W - 168, qy = Math.min(H - 158, y0);
  doc.roundedRect(qx - 8, qy - 8, 104, 104, 8).lineWidth(1).stroke("#c9dcd8");
  doc.image(qr, qx, qy, {width:88});
  doc.font("body").fontSize(8.5).fillColor("#5b7a77").text("สแกนเพื่อตรวจสอบ", qx - 20, qy + 100, {width:128, align:"center"});
  // footer: code + verification link
  doc.font("body").fontSize(9).fillColor("#5b7a77").text(`รหัสเกียรติบัตร ${cert.code}  ·  ตรวจสอบได้ที่ ${url}`, 60, H - 56, {width:W - 120, align:"center"});
  doc.end();
  return done;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
/* public verification page */
export function verifyHtml(cert, code){
  const ok = !!cert;
  const body = ok
    ? `<div class="ok">✓ เกียรติบัตรนี้ออกโดยเกม Project Zero จริง</div>
       <h1>${esc(cert.full_name)}</h1>
       <p>ผ่านภารกิจนำโลกสู่ Net Zero ครบทั้งโหมดปกติและโหมด Hard Core${cert.grade ? ` · ${esc(GRADE[cert.grade] || cert.grade)}` : ""}</p>
       <p class="m">ผลการเรียนรู้</p><ol class="m">${OUTCOMES.map(o => `<li>${esc(o)}</li>`).join("")}</ol>
       <p class="m">ออกเมื่อ ${esc(thaiDate(new Date(cert.issued_at)))} · รหัส ${esc(cert.code)}</p>
       <p><a href="/api/certificates/${encodeURIComponent(cert.code)}/pdf">ดาวน์โหลด PDF</a></p>`
    : `<div class="bad">✕ ไม่พบเกียรติบัตรรหัส ${esc(code)}</div><p>ตรวจสอบว่าพิมพ์รหัสถูกต้อง (รูปแบบ P2050-XXXX-XXXX)</p>`;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ตรวจสอบเกียรติบัตร · PROJECT ZERO</title>
<style>body{margin:0;background:#061015;color:#e6f0ee;font-family:"IBM Plex Sans Thai",system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
main{max-width:560px;width:100%;background:#0e1d24;border:1px solid #24414b;border-radius:16px;padding:28px}
h1{font-size:28px;margin:12px 0 6px}ol{padding-left:20px;line-height:1.6}.ok{color:#5fd39a;font-weight:600}.bad{color:#ff5a4a;font-weight:600}.m{color:#8fa9a6;font-size:14px}a{color:#4fd1c5}
.brand{font-family:monospace;color:#4fd1c5;font-size:12px;letter-spacing:.1em}</style></head>
<body><main><div class="brand">PROJECT ZERO · CERTIFICATE CHECK</div>${body}</main></body></html>`;
}

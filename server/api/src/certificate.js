import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
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
  // locked against editing (owner password is random and thrown away); printing and copying text still allowed
  const doc = new PDFDocument({size:"A4", layout:"landscape", margin:0, pdfVersion:"1.7",
    ownerPassword:crypto.randomBytes(24).toString("hex"), permissions:{printing:"highResolution", copying:true, modifying:false, annotating:false, fillingForms:false, contentAccessibility:true, documentAssembly:false},
    info:{Title:`ประกาศนียบัตร ${cert.code}`, Author:"Project Zero", Subject:"Project Zero certificate"}});
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
  watermarkUnder(doc, W, H, cert.code);
  // logos
  const logo = path.join(ASSETS, "logo.png");
  if (fs.existsSync(logo)) doc.image(logo, W / 2 - 32, 42, {width:64});
  if (cfg.partner && cfg.partner.logo && cfg.dir){ const pl = path.join(cfg.dir, cfg.partner.logo); if (fs.existsSync(pl)) doc.image(pl, W - 160, 46, {fit:[100, 60], align:"right"}); }
  const center = (txt, y, font, size, color = "#0b1a20", opts = {}) => { doc.font(font).fontSize(size).fillColor(color).text(txt, 70, y, {width:W - 140, align:"center", ...opts}); };
  center("ประกาศนียบัตร", 106, "head", 36, "#0e6e66");
  center("CERTIFICATE OF ACHIEVEMENT", 152, "headS", 10.5, "#5b7a77", {characterSpacing:3});
  center("ฉบับนี้ให้ไว้เพื่อแสดงว่า", 172, "body", 13.5, "#33484c");
  center(cert.full_name, 192, "head", 28, "#0b1a20");
  doc.moveTo(W / 2 - 190, 234).lineTo(W / 2 + 190, 234).lineWidth(1).stroke("#9fb8b4");
  center("ได้ผ่านภารกิจในเกม Project Zero ภารกิจกู้วิกฤตโลก", 244, "bodyB", 13.5, "#0b1a20");
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
    // number centred in its circle: put the digits' middle (half the cap height above the baseline) on the circle's centre
    const ccx = cx + 6, ccy = cy + 7, fs = 8.5;
    doc.circle(ccx, ccy, 6.5).fill("#2f9e6f");
    doc.font("headS").fontSize(fs);
    const f = doc._font, asc = f.ascender / 1000 * fs, cap = (f.capHeight || f.ascender * .7) / 1000 * fs, n = String(i + 1), tw = doc.widthOfString(n);
    doc.fillColor("#ffffff").text(n, ccx - tw / 2, ccy + cap / 2 - asc, {lineBreak:false});
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
    // centred on the page, like the lines above it
    center("ออกโดย", sy + 4, "body", 10.5, "#5b7a77");
    center(cfg.issuer || TEAM, sy + 20, "bodyB", 12.5, "#0e6e66");
    center(cfg.partner && cfg.partner.name ? `ร่วมกับ ${cfg.partner.name} · Garena Academy Game Maker` : "Garena Academy Game Maker", sy + 40, "body", 10.5, "#33484c");
  }
  // QR code for checking the certificate online
  const qx = W - 168, qy = Math.min(H - 158, y0);
  doc.roundedRect(qx - 8, qy - 8, 104, 104, 8).lineWidth(1).stroke("#c9dcd8");
  doc.image(qr, qx, qy, {width:88});
  doc.font("body").fontSize(8.5).fillColor("#5b7a77").text("สแกนเพื่อตรวจสอบ", qx - 20, qy + 100, {width:128, align:"center"});
  // footer: code + verification link
  doc.font("body").fontSize(9).fillColor("#5b7a77").text(`รหัสประกาศนียบัตร ${cert.code}  ·  ตรวจสอบได้ที่ ${url}`, 60, H - 56, {width:W - 120, align:"center"});
  watermarkOver(doc, W, H, cert);
  doc.end();
  return done;
}

/* ---------- anti-forgery watermark ----------
   under the content: a guilloche pattern whose waves are derived from the certificate code (every certificate looks different
   and the pattern can't be copied onto another code), the game logo large and faint, and microtext along the inner frame.
   over the content: a faint diagonal "PROJECT ZERO · <code>" repeated across the page, so any text pasted over the
   name or date breaks the pattern visibly. */
function seedOf(code){ const h = crypto.createHash("sha256").update("p0-wm:" + code).digest(); return i => h[i % h.length] / 255; }
function watermarkUnder(doc, W, H, code){
  const r = seedOf(code);
  doc.save();
  // guilloche: interlaced sine bands across the page, phase/frequency from the code
  doc.rect(36, 36, W - 72, H - 72).clip();
  const bands = 7, f1 = 2 + r(0) * 3, f2 = 5 + r(1) * 4, a1 = 9 + r(2) * 8, a2 = 4 + r(3) * 4, ph = r(4) * Math.PI * 2;
  for (let b = 0; b < bands; b++){
    const yc = 60 + b * (H - 120) / (bands - 1);
    for (let k = 0; k < 6; k++){
      const off = k * Math.PI / 3 + b * .7;
      doc.moveTo(30, yc);
      for (let x = 30; x <= W - 30; x += 3){
        const t = x / W * Math.PI * 2;
        doc.lineTo(x, yc + a1 * Math.sin(f1 * t + off + ph) + a2 * Math.sin(f2 * t - off * 1.7));
      }
      doc.lineWidth(.35).strokeOpacity(.16).stroke(k % 2 ? "#4fd1c5" : "#2f9e6f");
    }
  }
  doc.restore();
  // the game logo, large and faint, in the middle of the page
  const logo = path.join(ASSETS, "logo.png");
  if (fs.existsSync(logo)){ const sz = 330; doc.save(); doc.opacity(.07); doc.image(logo, W / 2 - sz / 2, H / 2 - sz / 2 + 10, {width:sz}); doc.restore(); }
  // microtext on the inner frame (looks like a thin line; a photocopy turns it into a smudge)
  const micro = (`PROJECT ZERO ${code} · `).repeat(60);
  doc.save().font("body").fontSize(2.6).fillColor("#0e6e66").fillOpacity(.85);
  doc.text(micro, 34, 25.6, {width:W - 68, height:4, lineBreak:false, ellipsis:false});
  doc.text(micro, 34, H - 28.4, {width:W - 68, height:4, lineBreak:false, ellipsis:false});
  doc.restore();
}
function watermarkOver(doc, W, H, cert){
  const label = `PROJECT ZERO · ${cert.code}`;
  doc.save();
  doc.rotate(-24, {origin:[W / 2, H / 2]});
  doc.font("headS").fontSize(15).fillColor("#0e6e66").fillOpacity(.045);
  const step = doc.widthOfString(label, {characterSpacing:2}) + 110;
  for (let y = -H * .55, row = 0; y < H * 1.55; y += 78, row++)
    for (let x = -W * .6 + (row % 2) * step / 2; x < W * 1.5; x += step)
      doc.text(label, x, y, {lineBreak:false, characterSpacing:2});
  doc.restore();
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
/* public verification page */
/* fonts and logo come from the game itself (same site: /assets/...) */
const FACES = [["Kanit", "kanit", [600, 700]], ["IBM Plex Sans Thai", "ibm-plex-sans-thai", [400, 600]], ["IBM Plex Mono", "ibm-plex-mono", [500]]]
  .flatMap(([fam, f, ws]) => ws.flatMap(w => ["thai", "latin"].map(sub => f === "ibm-plex-mono" && sub === "thai" ? "" :
    `@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(/assets/fonts/${f}-${sub}-${w}.woff2) format("woff2");${sub === "thai" ? "unicode-range:U+0E01-0E5B,U+200C-200D,U+25CC;" : ""}}`))).join("");
/* public verification page */
export function verifyHtml(cert, code){
  const ok = !!cert;
  const body = ok
    ? `<div class="badge ok"><span>✓</span>ประกาศนียบัตรนี้ออกโดยเกม Project Zero จริง</div>
       <p class="lbl">ผู้ได้รับ</p>
       <h1>${esc(cert.full_name)}</h1>
       <p class="lead">ผ่านภารกิจในเกม Project Zero ภารกิจกู้วิกฤตโลก${cert.grade ? ` · ระดับผลงาน ${esc(GRADE[cert.grade] || cert.grade)}` : ""}</p>
       <div class="grid"><div><small>ออกเมื่อ</small><b>${esc(thaiDate(new Date(cert.issued_at)))}</b></div><div><small>รหัสประกาศนียบัตร</small><b class="mono">${esc(cert.code)}</b></div></div>
       <h2>ผลการเรียนรู้</h2>
       <ol>${OUTCOMES.map(o => `<li>${esc(o)}</li>`).join("")}</ol>
       <a class="btn" href="/api/certificates/${encodeURIComponent(cert.code)}/pdf">ดาวน์โหลด PDF</a>`
    : `<div class="badge bad"><span>✕</span>ไม่พบประกาศนียบัตรรหัสนี้</div>
       <h1 class="mono small">${esc(code)}</h1>
       <p class="lead">ตรวจสอบว่าพิมพ์รหัสถูกต้อง (รูปแบบ P2050-XXXX-XXXX)</p>`;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ตรวจสอบประกาศนียบัตร · PROJECT ZERO</title><link rel="icon" href="/assets/img/ui/logo.png">
<style>${FACES}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;color:#e6f0ee;font:400 16px/1.6 "IBM Plex Sans Thai",system-ui,sans-serif;
  background:radial-gradient(1200px 600px at 15% -10%,rgba(79,209,197,.14),transparent 60%),radial-gradient(900px 500px at 110% 110%,rgba(47,158,111,.16),transparent 60%),#061015}
main{width:100%;max-width:620px;background:rgba(14,29,36,.92);border:1px solid #24414b;border-radius:20px;padding:30px 32px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
header{display:flex;align-items:center;gap:14px;margin-bottom:22px}
header img{width:52px;height:52px}
header b{display:block;font:700 22px/1.1 Kanit,sans-serif;letter-spacing:.04em} header b i{font-style:normal;color:#4fd1c5}
header small{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.12em;color:#8fa9a6}
.badge{display:inline-flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:999px;font-weight:600;font-size:15px}
.badge span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:15px}
.badge.ok{background:rgba(95,211,154,.12);color:#5fd39a} .badge.ok span{background:#5fd39a;color:#06261a}
.badge.bad{background:rgba(255,90,74,.12);color:#ff7466} .badge.bad span{background:#ff5a4a;color:#2b0603}
.lbl{margin:22px 0 0;color:#8fa9a6;font-size:14px}
h1{font:700 34px/1.25 Kanit,sans-serif;margin:2px 0 6px;color:#fff} h1.small{font-size:22px}
.lead{margin:0;color:#c9dcd8}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
.grid div{background:rgba(255,255,255,.04);border:1px solid #1d353d;border-radius:12px;padding:10px 14px}
.grid small{display:block;color:#8fa9a6;font-size:13px} .grid b{font-weight:600}
.mono{font-family:"IBM Plex Mono",monospace;font-weight:500;letter-spacing:.03em}
h2{font:600 18px Kanit,sans-serif;margin:20px 0 8px;color:#4fd1c5}
ol{margin:0;padding-left:22px;color:#c9dcd8;font-size:15px} ol li{margin:4px 0;padding-left:4px}
.btn{display:inline-block;margin-top:24px;padding:12px 22px;border-radius:12px;background:linear-gradient(180deg,#5fe0d3,#2fa99d);color:#04201d;font:600 16px Kanit,sans-serif;text-decoration:none}
.btn:hover{filter:brightness(1.08)}
footer{margin-top:26px;padding-top:16px;border-top:1px solid #1d353d;color:#6f8c88;font-size:13px}
@media (max-width:520px){ main{padding:22px 18px} h1{font-size:28px} .grid{grid-template-columns:1fr} }
</style></head>
<body><main>
<header><img src="/assets/img/ui/logo.png" alt=""><div><b>PROJECT <i>ZERO</i></b><small>ตรวจสอบประกาศนียบัตร</small></div></header>
${body}
<footer>Project Zero · Garena Academy Game Maker</footer>
</main></body></html>`;
}

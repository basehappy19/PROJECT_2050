const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.gda11y) return;
(P.mods = P.mods || {}).gda11y = 1;
/* =========================================================================
   Accessibility (same as the website: web/src/core.js A11y, web/src/narrator.js, the settings rows)
     · text size: normal · large · extra large (the whole interface grows: Kit.setTextSize)
     · colour-blind colours: blue / orange instead of green / red (interface and map)
     · narration + subtitles with the device's own voices (Web Speech API), when it has a voice for the language
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens} = P;
const k = Kit;
const ls = {get:(key, d = null) => { try { const v = localStorage.getItem(key); return v === null ? d : v; } catch(e){ return d; } }, set:(key, v) => { try { localStorage.setItem(key, v); } catch(e){} }};

/* ---------- colour-blind palette ---------- */
const COL0 = {good:Kit.COL.good, bad:Kit.COL.bad, hot:Kit.COL.hot, warn:Kit.COL.warn};
const CB = {good:"#4ea8ff", bad:"#ff9f1c", hot:"#ffbf47", warn:"#f5d547"};
const A11y = P.A11y = {
  get fs(){ return ls.get("p2050-gd-fs", "n"); }, get cb(){ return ls.get("p2050-cb") === "1"; },
  apply(){ Object.assign(Kit.COL, this.cb ? CB : COL0); if (P.Map && P.Map.colorsChanged) P.Map.colorsChanged(); k.dirty(); },
  setFs(v){ Kit.setTextSize(v); k.dirty(); },
  setCb(on){ ls.set("p2050-cb", on ? "1" : "0"); this.apply(); },
};
A11y.apply();

/* ---------- narration ---------- */
const synth = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
const Utter = typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null;
/* 2.3: best voices first: neural "Online (Natural)" (Edge, Windows 11), Google, Apple Premium/Enhanced, named system voices */
const voiceScore = v => { const n = v.name || ""; return (/online|natural|neural/i.test(n) ? 8 : 0) + (/premium/i.test(n) ? 6 : 0) + (/enhanced/i.test(n) ? 5 : 0) + (/google/i.test(n) ? 4 : 0) + (/premwadee|niwat|kanya|narisa|pattara|achara|aria|jenny|guy|samantha|daniel/i.test(n) ? 2 : 0) + (v.localService ? 0 : 1); };
/* 2.3: lines recorded in advance (the website's assets/audio/narr; web/src/narr-files.js, put in by make-project) */
const NARR_FILES = /*NARRFILES*/{};
const TH = /[฀-๿]/;
const clean = s => String(s || "").replace(/\[\[[^\]]*\]\]/g, " ").replace(/[•·▲▼★]/g, " ").replace(/\s+/g, " ").trim();
function chunks(text, max = 150, min = 60){
  const out = [];
  for (const part of String(text || "").replace(/\[\[[^\]]*\]\]/g, " ").replace(/([.!?]|ค่ะ|ครับ|นะคะ|นะครับ)\s+/g, "$1\n").split(/\n+/).map(clean)){
    let line = "";
    for (const w of part.split(" ")){
      if (line && (line.length >= min || (line + " " + w).length > max)){ out.push(line); line = w; }
      else line = line ? line + " " + w : w;
    }
    if (line){ if (out.length && line.length < 18 && (out[out.length - 1] + " " + line).length <= max + 20) out[out.length - 1] += " " + line; else out.push(line); }
  }
  return out.filter(Boolean);
}
const spoken = s => s.replace(/ +/g, (m, i, all) => (TH.test(all[i - 1] || "") && TH.test(all[i + m.length] || "") ? "" : " "));
const redraw = () => { k.dirty("Train"); k.dirty("Modal"); };
const narrKey = (lang, who, text) => { let h = 0x811c9dc5; const s = `${lang}|${who || ""}|${clean(text)}`; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const fileFor = (lang, who, text) => NARR_FILES[narrKey(lang, who, text)] || (who ? NARR_FILES[narrKey(lang, "", text)] : null) || null;
/* the address of a recorded line inside the exported game (GDevelop resource "narr-<file>.mp3") */
const narrUrl = f => { try { const g = Audio.scene.getGame(), rl = g.getResourceLoader(), r = rl.getResource(`narr-${f}.mp3`); return r ? rl.getFullUrl(r.file) : null; } catch(e){ return null; } };
const RATE_NORMAL = .95;
const Narr = P.Narr = {
  supported:!!(synth && Utter),
  on:ls.get("p2050-narr") === "1", subs:ls.get("p2050-subs") !== "0",
  rate:Number(ls.get("p2050-narr-rate3")) || RATE_NORMAL,   // 2.3: slower (1.25 was too fast); new key so the old setting is not kept
  vol:(v => isNaN(v) ? 1 : Math.max(0, Math.min(1, v)))(parseFloat(ls.get("p2050-narr-vol"))),
  RATES:[.8, RATE_NORMAL, 1.1],
  line:"", speaking:false, _id:0, _last:"", _el:null,
  voices(){ return synth ? synth.getVoices() : []; },
  voiceFor(lang = S.lang){ const want = lang === "th" ? "th" : "en", vs = this.voices().filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(want)); return vs.sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null; },
  recorded(lang = S.lang){ return Object.values(NARR_FILES).some(f => f.startsWith(lang + "-")); },
  available(lang = S.lang){ return (this.supported && !!this.voiceFor(lang)) || this.recorded(lang); },
  setOn(v){ this.on = !!v; ls.set("p2050-narr", v ? "1" : "0"); if (!v) this.stop(); k.dirty(); },
  setSubs(v){ this.subs = !!v; ls.set("p2050-subs", v ? "1" : "0"); k.dirty(); },
  setRate(r){ this.rate = r; ls.set("p2050-narr-rate3", String(r)); if (this._el) this._el.playbackRate = r / RATE_NORMAL; k.dirty(); },
  setVol(v){ this.vol = Math.max(0, Math.min(1, v)); ls.set("p2050-narr-vol", String(this.vol)); if (this._el) this._el.volume = this.vol; k.dirty(); },
  /* who = the speaker (story panels), for the recorded voice */
  say(text, {force = false, who = ""} = {}){
    if (!this.on && !force) return false;
    const lines = chunks(text); if (!lines.length) return false;
    const f = fileFor(S.lang, who, text), url = f && narrUrl(f);
    if (url) return this.play(url, lines);
    return this.tts(lines);
  },
  /* a recorded line: the subtitle follows the playback (each piece gets time in proportion to its length) */
  play(url, lines){
    this.stop(false);
    const id = ++this._id, el = new window.Audio(url), tot = lines.reduce((s, q) => s + q.length, 0);
    el.volume = this.vol; el.playbackRate = this.rate / RATE_NORMAL; el.preservesPitch = true;
    this._el = el; this.speaking = true; this.line = lines[0]; redraw();
    el.ontimeupdate = () => {
      if (id !== this._id || !el.duration) return;
      let at = el.currentTime / el.duration * tot, i = 0;
      while (i < lines.length - 1 && at > lines[i].length){ at -= lines[i].length; i++; }
      if (this.line !== lines[i]){ this.line = lines[i]; redraw(); }
    };
    el.onended = () => { if (id !== this._id) return; this._el = null; this.line = ""; this.speaking = false; redraw(); };
    el.onerror = () => { if (id !== this._id) return; this._el = null; this.tts(lines); };
    el.play().catch(() => { if (id === this._id){ this._el = null; this.tts(lines); } });
    return true;
  },
  tts(lines){
    if (!this.supported) return false;
    const v = this.voiceFor(); if (!v) return false;
    this.stop(false);
    const id = ++this._id;
    this.speaking = true;
    lines.forEach((ln, i) => {
      const u = new Utter(spoken(ln)); u.voice = v; u.lang = v.lang; u.rate = this.rate; u.pitch = 1; u.volume = this.vol;
      u.onstart = () => { if (id !== this._id) return; this.line = ln; redraw(); };
      u.onend = u.onerror = () => { if (id !== this._id) return; if (i === lines.length - 1){ this.line = ""; this.speaking = false; redraw(); } };
      synth.speak(u);
    });
    return true;
  },
  /* read a text once when it first appears (story panel, how-to page, event) */
  auto(key, text, who = ""){ if (key === this._last) return; this._last = key; if (this.on) this.say(text, {who}); },
  stop(re = true){ this._id++; if (this._el){ try { this._el.pause(); } catch(e) {} this._el = null; } if (synth && (synth.speaking || synth.pending)) synth.cancel(); const had = this.line || this.speaking; this.line = ""; this.speaking = false; if (re && had) redraw(); },
};
if (synth){ synth.onvoiceschanged = () => k.dirty(); document.addEventListener("visibilitychange", () => { if (document.hidden) Narr.stop(); }); }

/* what is on screen now that narration would read (called every frame; reads each thing once) */
Screens.narrTick = function(){
  if (!Narr.on || !Narr.supported) return;
  const kind = UIM.kind();
  if (kind === "story"){ const st = P.STORY.find(a => a.act === UIM.storyAct); const p = st && st.panels[Math.min(UIM.storyI, st.panels.length - 1)]; if (p) Narr.auto(`story${UIM.storyAct}-${UIM.storyI}`, L(P.panelSay ? P.panelSay(p) : p.say), P.narrWho ? P.narrWho(p) : ""); }
  else if (kind === "tutorial"){ const st = P.TUT[UIM.tutI]; if (st) Narr.auto("tut" + UIM.tutI, `${L(st.title)}. ${st.body[S.lang].join(" ")}`, "adv"); }
  else if (kind === "event"){ const e = P.currentEvent(); if (e) Narr.auto("ev" + (e.id || e.title.th), `${L(e.title)}. ${L(e.desc)}`); }
  else if (Narr._last){ Narr._last = ""; Narr.stop(); }
};
/* a "listen" button next to a text (event, story, how-to) */
W.speakBtn = (l, id, x, y, text, who = "") => {
  if (!Narr.available()) return 0;
  const on = Narr.speaking;
  W.hbtn(l, id, x, y, on ? "square" : "volume-2", () => { if (Narr.speaking) Narr.stop(); else Narr.say(text, {force:true, who}); k.dirty(); }, {s:28, is:15, color:on ? "accent" : "muted"});
  return 28;
};
/* the subtitle line at the bottom (top layer) */
Screens.renderSubs = function(l){
  if (!Narr.subs || !Narr.line) return;
  const w = Math.min(k.W - 80, k.textW(Narr.line, {size:15}) + 40), h = k.textH(Narr.line, {size:15, w:w - 40}) + 16, x = (k.W - w) / 2, y = k.H - 70 - h;
  k.rect(l, x, y, w, h, "#000000", {r:10, a:.78});
  k.text(l, Narr.line, x + 20, y + 8, {size:15, color:"#ffffff", w:w - 40, align:"center"});
};

/* ---------- the settings rows (menu Settings page and the pause window) ---------- */
W.a11yRows = (l, x, y, w) => {
  const th = S.lang === "th", y0 = y;
  // text size
  k.icon(l, "type", x, y + 7, 18, "accent"); k.text(l, th ? "ตัวอักษร" : "Text", x + 28, y + 6, {size:13.5, w:120, max:1});
  W.seg(l, x + w - 246, y + 1, [["n", th ? "ปกติ" : "Normal"], ["l", th ? "ใหญ่" : "Large"], ["xl", th ? "ใหญ่มาก" : "Extra large"]].map(([id, lab]) => ({id:"fs-" + id, label:lab, on:A11y.fs === id, fn:() => { Audio.play("click"); A11y.setFs(id); }})), {w:82, h:30, font:"body", fontOn:"bodyB", size:12});
  y += 36;
  if (Kit.uiScale > 1 && Kit.K < 1.5 * Kit.uiScale - .01) y += k.text(l, th ? "จอนี้กว้างไม่พอ ตัวอักษรจึงใหญ่ขึ้นได้ไม่เต็มที่" : "This screen is not wide enough for the full size", x + 28, y, {size:11, color:"muted", w:w - 28}).h + 4;
  y += W.check(l, "cb", x + 28, y, w - 28, A11y.cb, th ? "สีสำหรับคนตาบอดสี (ฟ้า/ส้ม แทน เขียว/แดง)" : "Colour-blind colours (blue/orange instead of green/red)", () => A11y.setCb(!A11y.cb)) + 8;
  // narration
  k.icon(l, "audio-lines", x, y + 7, 18, "accent"); k.text(l, th ? "เสียงพากย์" : "Narration", x + 28, y + 6, {size:13.5, w:120, max:1}); y += 32;
  if (Narr.available()){
    y += W.check(l, "narr", x + 28, y, w - 28, Narr.on, th ? "อ่านออกเสียง (เรื่องราว วิธีเล่น เหตุการณ์)" : "Read aloud (story, how to play, events)", () => { Narr.setOn(!Narr.on); if (Narr.on) Narr.say(th ? "เปิดเสียงพากย์แล้ว" : "Narration is on", {who:"adv"}); }) + 4;
    y += W.check(l, "subs", x + 28, y, w - 28, Narr.subs, th ? "คำบรรยาย" : "Subtitles", () => Narr.setSubs(!Narr.subs)) + 4;
    if (Narr.on){ W.seg(l, x + 28, y, Narr.RATES.map((r, i) => [r, [th ? "ช้า" : "Slow", th ? "ปกติ" : "Normal", th ? "เร็ว" : "Fast"][i]]).map(([r, lab]) => ({id:"nr-" + r, label:lab, on:Narr.rate === r, fn:() => { Audio.play("click"); Narr.setRate(r); }})), {w:70, h:28, font:"body", fontOn:"bodyB", size:12}); y += 36; }
  } else y += k.text(l, !Narr.supported ? (th ? "เครื่องนี้อ่านออกเสียงไม่ได้" : "This device can't read aloud") : (th ? "เครื่องนี้ยังไม่มีเสียงภาษาไทย (เพิ่มได้ในการตั้งค่าภาษาของเครื่อง)" : "No voice for this language on this device"), x + 28, y, {size:11.5, color:"muted", w:w - 28}).h + 6;
  return y - y0;
};

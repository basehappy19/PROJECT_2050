/* 1.9 · Narration and subtitles.
   Reads the story scenes, the how-to-play pages and (when turned on) dilemma events aloud with the browser's own
   voices (Web Speech API, speechSynthesis), in Thai when the device has a Thai voice. While it speaks, the line being
   read is shown as a subtitle at the bottom of the screen. Both can be turned on and off in the settings.
   Nothing is downloaded: devices without a voice for the game's language simply don't offer narration.
   2.3: lines recorded in advance (assets/audio/narr, listed in narr-files.js by a hash of speaker + text) play
   instead of the device voice; narration volume; slower speeds. */
import {S, ls, bump} from "./core.js";
import {NARR_FILES} from "./narr-files.js";

const synth = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
const Utter = typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null;
const LANG = {th:"th", en:"en"};
/* 2.3: voices that sound best first: the neural "Online (Natural)" voices (Edge, Windows 11), Google voices,
   Apple "Premium/Enhanced", then the named system Thai voices, then anything local */
const voiceScore = v => { const n = v.name || ""; return (/online|natural|neural/i.test(n) ? 8 : 0) + (/premium/i.test(n) ? 6 : 0) + (/enhanced/i.test(n) ? 5 : 0) + (/google/i.test(n) ? 4 : 0) + (/premwadee|niwat|kanya|narisa|pattara|achara|aria|jenny|guy|samantha|daniel/i.test(n) ? 2 : 0) + (v.localService ? 0 : 1); };
/* the key of a recorded line: FNV-1a of "lang|speaker|text" (web/tools/narr-list.mjs makes the same key) */
export const narrKey = (lang, who, text) => { let h = 0x811c9dc5; const s = `${lang}|${who || ""}|${clean(text)}`; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const fileFor = (lang, who, text) => NARR_FILES[narrKey(lang, who, text)] || (who ? NARR_FILES[narrKey(lang, "", text)] : null) || null;
const RATE_NORMAL = .95;

/* strip the game's icon markup ([[icon]], [[$stat]]) and anything that should not be read */
export const clean = s => String(s || "").replace(/\[\[[^\]]*\]\]/g, " ").replace(/[•·▲▼★]/g, " ").replace(/\s+/g, " ").trim();
/* 1.7: split into utterances. Thai puts a space between phrases and speech engines stop at every space, which
   sounded choppy, so phrases are joined into utterances of about 60–150 characters (breaking only at sentence ends
   or at a space once the utterance is long enough) and the spaces between Thai words inside an utterance are
   dropped when speaking. The subtitle shows the same utterance with its spaces. */
const TH = /[\u0E00-\u0E7F]/;
export function chunks(text, max = 150, min = 60){
  const out = [];
  for (const part of String(text || "").replace(/\[\[[^\]]*\]\]/g, " ").replace(/([.!?]|ค่ะ|ครับ|นะคะ|นะครับ)\s+/g, "$1\n").split(/\n+/).map(clean)){   // sentence ends (Thai polite particles too); no look-behind: older iPads
    let line = "";
    for (const w of part.split(" ")){
      if (line && (line.length >= min || (line + " " + w).length > max)){ out.push(line); line = w; }
      else line = line ? line + " " + w : w;
    }
    if (line){ if (out.length && line.length < 18 && (out[out.length - 1] + " " + line).length <= max + 20) out[out.length - 1] += " " + line; else out.push(line); }
  }
  return out.filter(Boolean);
}
/* what the voice reads: no pause between Thai words inside one utterance */
export const spoken = s => s.replace(/ +/g, (m, i, all) => (TH.test(all[i - 1] || "") && TH.test(all[i + m.length] || "") ? "" : " "));

export const Narr = {
  supported:!!(synth && Utter),
  on:ls.get("p2050-narr") === "1",
  subs:ls.get("p2050-subs") !== "0",
  rate:Number(ls.get("p2050-narr-rate3")) || RATE_NORMAL,   // 2.3: slower (1.25 was too fast); new key so the old setting is not kept
  vol:(v => isNaN(v) ? 1 : Math.max(0, Math.min(1, v)))(parseFloat(ls.get("p2050-narr-vol"))),
  RATES:[.8, RATE_NORMAL, 1.1], _el:null,
  line:"",            // the subtitle line being read right now
  speaking:false,
  _q:[], _id:0,
  voices(){ return synth ? synth.getVoices() : []; },
  voiceFor(lang = S.lang){
    const want = LANG[lang] || "en", vs = this.voices().filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(want));
    return vs.sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
  },
  recorded(lang = S.lang){ return Object.values(NARR_FILES).some(f => f.startsWith(lang + "-")); },
  available(lang = S.lang){ return (this.supported && !!this.voiceFor(lang)) || this.recorded(lang); },
  setOn(v){ this.on = !!v; ls.set("p2050-narr", v ? "1" : "0"); if (!v) this.stop(); bump(); },
  setSubs(v){ this.subs = !!v; ls.set("p2050-subs", v ? "1" : "0"); bump(); },
  setRate(r){ this.rate = r; ls.set("p2050-narr-rate3", String(r)); if (this._el) this._el.playbackRate = r / RATE_NORMAL; bump(); },
  setVol(v){ this.vol = Math.max(0, Math.min(1, v)); ls.set("p2050-narr-vol", String(this.vol)); if (this._el) this._el.volume = this.vol; bump(); },
  /* read text aloud (force: even when narration is off, e.g. the "listen" button); who = the speaker (story panels) */
  say(text, {force = false, who = ""} = {}){
    if (!this.on && !force) return false;
    const lines = chunks(text);
    if (!lines.length) return false;
    const f = fileFor(S.lang, who, text);
    if (f) return this.play(f, lines, text);
    return this.tts(lines);
  },
  /* a recorded line: the subtitle follows the playback (each piece gets time in proportion to its length) */
  play(f, lines, text){
    this.stop(false);
    const id = ++this._id, el = new Audio(`assets/audio/narr/${f}.mp3`), tot = lines.reduce((s, l) => s + l.length, 0);
    el.volume = this.vol; el.playbackRate = this.rate / RATE_NORMAL; el.preservesPitch = true;
    this._el = el; this.speaking = true; this.line = lines[0]; bump();
    el.ontimeupdate = () => {
      if (id !== this._id || !el.duration) return;
      let at = el.currentTime / el.duration * tot, i = 0;
      while (i < lines.length - 1 && at > lines[i].length){ at -= lines[i].length; i++; }
      if (this.line !== lines[i]){ this.line = lines[i]; bump(); }
    };
    el.onended = () => { if (id !== this._id) return; this._el = null; this.line = ""; this.speaking = false; bump(); };
    el.onerror = () => { if (id !== this._id) return; this._el = null; this.tts(lines); };   // file missing: the device voice
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
      u.onstart = () => { if (id !== this._id) return; this.line = ln; bump(); };
      u.onend = u.onerror = () => { if (id !== this._id) return; if (i === lines.length - 1){ this.line = ""; this.speaking = false; bump(); } };
      synth.speak(u);
    });
    return true;
  },
  stop(redraw = true){
    this._id++;
    if (this._el){ try { this._el.pause(); } catch(e) {} this._el = null; }
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    const had = this.line || this.speaking; this.line = ""; this.speaking = false;
    if (redraw && had) bump();
  },
};
if (synth){
  // the voice list arrives late on some browsers
  synth.onvoiceschanged = () => bump();
  // no talking in a hidden tab
  document.addEventListener("visibilitychange", () => { if (document.hidden) Narr.stop(); });
}

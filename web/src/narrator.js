/* 1.9 · Narration and subtitles.
   Reads the story scenes, the how-to-play pages and (when turned on) dilemma events aloud with the browser's own
   voices (Web Speech API, speechSynthesis), in Thai when the device has a Thai voice. While it speaks, the line being
   read is shown as a subtitle at the bottom of the screen. Both can be turned on and off in the settings.
   Nothing is downloaded: devices without a voice for the game's language simply don't offer narration. */
import {S, ls, bump} from "./core.js";

const synth = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
const Utter = typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null;
const LANG = {th:"th", en:"en"};
/* voices that sound best first (Google and "Premium/Enhanced" voices, then the system Thai voices) */
const GOOD = /google|premium|enhanced|natural|neural|kanya|pattara|narisa|niwat|achara/i;

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
  rate:Number(ls.get("p2050-narr-rate2")) || 1.25,   // 1.7: faster by default (old 1× sounded slow)
  line:"",            // the subtitle line being read right now
  speaking:false,
  _q:[], _id:0,
  voices(){ return synth ? synth.getVoices() : []; },
  voiceFor(lang = S.lang){
    const want = LANG[lang] || "en", vs = this.voices().filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(want));
    return vs.sort((a, b) => (GOOD.test(b.name) ? 1 : 0) - (GOOD.test(a.name) ? 1 : 0) || (b.localService ? 0 : 1) - (a.localService ? 0 : 1))[0] || null;
  },
  available(lang = S.lang){ return this.supported && !!this.voiceFor(lang); },
  setOn(v){ this.on = !!v; ls.set("p2050-narr", v ? "1" : "0"); if (!v) this.stop(); bump(); },
  setSubs(v){ this.subs = !!v; ls.set("p2050-subs", v ? "1" : "0"); bump(); },
  setRate(r){ this.rate = r; ls.set("p2050-narr-rate2", String(r)); bump(); },
  /* read text aloud (force: even when narration is off, e.g. the "listen" button) */
  say(text, {force = false} = {}){
    if (!this.supported || (!this.on && !force)) return false;
    const v = this.voiceFor(); if (!v) return false;
    this.stop(false);
    const id = ++this._id, lines = chunks(text);
    if (!lines.length) return false;
    this.speaking = true;
    lines.forEach((ln, i) => {
      const u = new Utter(spoken(ln)); u.voice = v; u.lang = v.lang; u.rate = this.rate; u.pitch = 1;
      u.onstart = () => { if (id !== this._id) return; this.line = ln; bump(); };
      u.onend = u.onerror = () => { if (id !== this._id) return; if (i === lines.length - 1){ this.line = ""; this.speaking = false; bump(); } };
      synth.speak(u);
    });
    return true;
  },
  stop(redraw = true){
    this._id++;
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

/* Audio · Web Audio mixer with three buses (music · ambience · effects)
   - effects + ambiences are decoded into AudioBuffers (short files, gapless loops)
   - music streams through <audio> elements, cross-fades between tracks and follows the mood of the game
   Sound credits: assets/audio/CREDITS.txt */
import {P, S, H, UIM, ls} from "./core.js";

const SFX_CORE = ["click", "hover", "tab", "toggle", "open", "close", "select", "error", "start", "page", "whoosh"];
const MUSIC = {
  menu:   ["menu", "field", "soliloquy"],
  calm:   ["game1", "game2", "snow", "city", "eye"],
  tense:  ["decision", "machine", "omens"],
  crisis: ["pursuit", "descent", "lastmin"],
  win:    ["rise"],
  lose:   ["demise", "bleeding"],
};
const VOL = {sfx:.75, amb:.6, music:.55, duck:.35, bed:.35};
const pref = (k, d) => ls.get(k) === null ? d : ls.get(k) !== "0";
const lvl = (k, d) => { const v = parseFloat(ls.get(k)); return isNaN(v) ? d : Math.max(0, Math.min(1, v)); };

const A = {
  ctx:null, ready:false, on:pref("p2050-sfx", true), musicOn:pref("p2050-music", true),
  lvMusic:lvl("p2050-vol-music", .8), lvSfx:lvl("p2050-vol-sfx", .8),
  buf:new Map(), loading:new Map(), amb:null, bed:null, mood:null, track:null, el:[null, null], cur:0, startedAt:0, duckN:0, lastHover:0,
  SFX:[], AMB:[],
  url:n => `assets/audio/${n}.mp3`,
  /* the AudioContext can only start after a tap / key press */
  unlock(){
    if (!this.ctx){
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C();
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.connect(this.master);
      this.gSfx = c.createGain(); this.gAmb = c.createGain(); this.gMus = c.createGain(); this.gBed = c.createGain();
      [this.gSfx, this.gAmb, this.gBed].forEach(g => g.connect(this.comp)); this.gMus.connect(this.master);
      this.applyLevels(true);
      SFX_CORE.forEach(n => this.load("sfx-" + n));
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    this.ready = true;
    if (this.musicOn && this.mood && !this.track) this.setMood(this.mood, true);
  },
  applyLevels(now){
    if (!this.ctx) return;
    const t = this.ctx.currentTime, set = (g, v) => now ? g.gain.setValueAtTime(v, t) : g.gain.setTargetAtTime(v, t, .25);
    set(this.gSfx, this.on ? VOL.sfx * this.lvSfx : 0);
    set(this.gAmb, this.on ? VOL.amb * this.lvSfx : 0);
    set(this.gBed, this.on ? VOL.bed * this.lvSfx : 0);
    set(this.gMus, this.musicOn ? VOL.music * this.lvMusic * (this.duckN > 0 ? VOL.duck : 1) : 0);
  },
  load(name){
    if (this.buf.has(name)) return Promise.resolve(this.buf.get(name));
    if (this.loading.has(name)) return this.loading.get(name);
    const p = fetch(this.url(name)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then(ab => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then(b => { this.buf.set(name, b); this.loading.delete(name); return b; })
      .catch(() => { this.loading.delete(name); return null; });
    this.loading.set(name, p); return p;
  },
  /* one-shot effect; o = {vol, rate, jitter, delay} */
  play(n, o = {}){
    if (!this.on || !this.ctx || this.ctx.state !== "running") return;
    const name = "sfx-" + n;
    const go = b => {
      if (!b) return;
      const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
      src.buffer = b;
      const j = o.jitter ?? (["click", "hover", "tab", "type", "tick", "pop", "select"].includes(n) ? .06 : 0);
      src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * j);
      g.gain.value = o.vol ?? 1;
      src.connect(g); g.connect(this.gSfx); src.start(c.currentTime + (o.delay || 0));
    };
    const b = this.buf.get(name); if (b) go(b); else this.load(name).then(go);
  },
  hover(){ const now = performance.now(); if (now - this.lastHover < 70) return; this.lastHover = now; this.play("hover", {vol:.5}); },
  /* looping layer with fades (ambience = event / hazard soundscape · bed = quiet background under the music) */
  loop(slot, n, vol = 1, fade = .8){
    const cur = this[slot];
    if (cur && cur.n === n && !cur.stopping) return;
    this.stopLoop(slot, fade);
    if (!n || !this.ctx) return;
    const me = {n, stopping:false}; this[slot] = me;
    this.load("amb-" + n).then(b => {
      if (!b || this[slot] !== me) return;
      const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
      src.buffer = b; src.loop = true; if (b.duration > 2){ src.loopStart = .35; src.loopEnd = b.duration - .35; }
      g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(vol, c.currentTime + fade);
      src.connect(g); g.connect(slot === "bed" ? this.gBed : this.gAmb); src.start(c.currentTime, Math.random() * Math.max(0, b.duration - 4));
      me.src = src; me.g = g;
    });
    if (slot === "amb"){ this.duckN = 1; this.applyLevels(); }
  },
  stopLoop(slot, fade = .8){
    const cur = this[slot]; if (!cur) return;
    cur.stopping = true; this[slot] = null;
    if (cur.g && this.ctx){ const t = this.ctx.currentTime; cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + Math.max(.02, fade)); try { cur.src.stop(t + fade + .05); } catch(e){} }
    if (slot === "amb"){ this.duckN = 0; this.applyLevels(); }
  },
  ambience(n, vol = 1){ if (!this.on) return; this.loop("amb", n, vol, .9); },
  stopAmb(ms = 800){ this.stopLoop("amb", ms / 1000); },
  setBed(n, vol = 1){ this.loop("bed", this.on ? n : null, vol, 2); },
  /* ---------- music ---------- */
  pickTrack(mood){
    const list = MUSIC[mood] || MUSIC.calm, last = this.track;
    const opts = list.length > 1 ? list.filter(x => x !== last) : list;
    return opts[Math.floor(Math.random() * opts.length)];
  },
  setMood(mood, force = false){
    const changed = mood !== this.mood; this.mood = mood;
    if (!this.musicOn || !this.ready) return;
    if (!force && !changed && this.track) return;
    // keep a track that has only just started unless the change is big (win / lose / menu)
    const big = ["win", "lose", "menu"].includes(mood) || !this.track;
    if (!force && !big && performance.now() - this.startedAt < 25000) return;
    this.playTrack(this.pickTrack(mood));
  },
  playTrack(name){
    if (!this.ctx) return;
    const c = this.ctx, next = 1 - this.cur, old = this.el[this.cur];
    let el = this.el[next];
    if (!el){
      el = new window.Audio(); el.crossOrigin = "anonymous"; el.preload = "auto";
      const src = c.createMediaElementSource(el), g = c.createGain(); src.connect(g); g.connect(this.gMus);
      el._g = g; this.el[next] = el;
      el.addEventListener("ended", () => { if (this.el[this.cur] === el) this.playTrack(this.pickTrack(this.mood)); });
    }
    const t = c.currentTime, XF = 2.5;
    el.src = this.url("music-" + name); el.currentTime = 0;
    el._g.gain.cancelScheduledValues(t); el._g.gain.setValueAtTime(0, t); el._g.gain.linearRampToValueAtTime(1, t + XF);
    el.play().catch(() => {});
    if (old){ old._g.gain.cancelScheduledValues(t); old._g.gain.setValueAtTime(old._g.gain.value, t); old._g.gain.linearRampToValueAtTime(0, t + XF); setTimeout(() => { if (this.el[this.cur] !== old) old.pause(); }, XF * 1000 + 100); }
    this.cur = next; this.track = name; this.startedAt = performance.now();
  },
  stopMusic(){ for (const el of this.el) if (el){ el.pause(); } this.track = null; },
  /* mood from the state of the world (called every month) */
  gameMood(){
    if (S.over) return S.over === "win" ? "win" : "lose";
    const left = P.TOTAL_TICKS - S.tick;
    if (S.temp >= 2.3 || S.appr < 22 || left <= 18) return "crisis";
    if (S.temp >= 1.75 || S.appr < 40 || S.tick >= 216) return "tense";
    return "calm";
  },
  /* ---------- settings ---------- */
  setLevel(kind, v){
    v = Math.max(0, Math.min(1, v));
    if (kind === "music"){ this.lvMusic = v; ls.set("p2050-vol-music", v); }
    else { this.lvSfx = v; ls.set("p2050-vol-sfx", v); }
    this.applyLevels();
  },
  toggle(){ this.on = !this.on; ls.set("p2050-sfx", this.on ? "1" : "0"); if (!this.on){ this.stopAmb(0); this.setBed(null); } this.applyLevels(); if (this.on) this.play("toggle"); },
  toggleMusic(){
    this.musicOn = !this.musicOn; ls.set("p2050-music", this.musicOn ? "1" : "0");
    this.applyLevels();
    if (!this.musicOn) setTimeout(() => { if (!this.musicOn) this.stopMusic(); }, 400);
    else if (this.mood) this.setMood(this.mood, true);
  },
};
export const Audio = P.Audio = A;

/* hooks used by the engine */
H.sfx = n => A.play(n);
H.amb = n => A.ambience(n);
H.stopAmb = () => A.stopAmb();

/* unlock on the first gesture */
const unlock = () => A.unlock();
["pointerdown", "keydown", "touchend"].forEach(e => window.addEventListener(e, unlock, {capture:true, passive:true}));
document.addEventListener("visibilitychange", () => {
  if (!A.ctx) return;
  if (document.hidden) A.ctx.suspend().catch(() => {}); else if (A.ready) A.ctx.resume().catch(() => {});
});

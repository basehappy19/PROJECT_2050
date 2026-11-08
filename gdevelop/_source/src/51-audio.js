const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.audio) return;
(P.mods = P.mods || {}).audio = 1;
/* =========================================================================
   Audio · the website's recordings (assets/audio at the top of the repo, see CREDITS.txt), mixed like web/src/audio.js
   sfx-*  : one-shot sounds                    → GDevelop sounds (vol / delay like the website)
   amb-*  : event / hazard soundscape          → sound channel 2, looped, faded; the music ducks under it
            quiet place sound under the music  → sound channel 3 ("bed": the continent you zoomed into, the clock at the end)
   music-*: tracks picked by the mood of the game (menu · calm · tense · crisis · win · lose), cross-faded on music channels 1 and 4
   ========================================================================= */
const snd = () => gdjs.evtTools.sound;
const pref = k => { try { return localStorage.getItem(k) !== "0"; } catch(e) { return true; } };
const savePref = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch(e) {} };
const lvl = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : Math.max(0, Math.min(1, v)); } catch(e) { return d; } };
const SFX_HAVE = new Set(["action", "aid", "bell", "bong", "buy", "choose", "click", "close", "coin2", "coin", "confirm", "data", "done", "drop", "error", "event", "fanfare", "glitch", "hover", "impact", "jingle", "levelup", "lose", "miss", "news", "open", "page2", "page", "pause", "pluck", "pop", "powerup", "question", "relDown", "relUp", "save", "sax", "select", "shield", "skillsClose", "skillsOpen", "spawnGreen", "spawnRed", "speed", "start", "tab", "thunder", "tick", "toggle", "type", "unlock", "warn", "whoosh", "win", "year"]);
const AMB_HAVE = new Set(["air", "arctic", "bees", "birds", "boil", "bowl", "campfire", "chimes", "city", "clock", "construction", "crowd", "crows", "explosion", "factory", "farm", "fire", "fireworks", "flood", "forest", "gale", "gulls", "harbor", "heat", "highway", "hum", "jungle", "keyboard", "lab", "market", "morse", "night", "ocean", "office", "radio", "rain", "river", "siren", "space", "storm", "street", "temple", "thunder", "train", "underwater", "wind"]);
const AMB_ALIAS = {sea:"ocean"};
const MUSIC = {
  menu:["menu", "field", "soliloquy"],
  calm:["game1", "game2", "snow", "city", "eye"],
  tense:["decision", "machine", "omens"],
  crisis:["pursuit", "descent", "lastmin"],
  win:["rise"],
  lose:["demise", "bleeding"],
};
const VOL = {sfx:60, amb:48, bed:28, music:44, duck:.35};
const A = {
  SFX:[...SFX_HAVE],   // preloaded on the loading screen (short); the long ambiences load when first played
  AMB:["heat", "factory", "construction", "harbor", "ocean", "storm", "flood", "fire", "wind", "arctic", "crowd", "city", "siren", "forest", "birds", "bees", "lab", "office", "air", "train", "farm", "underwater", "market", "explosion"],
  scene:null, on:pref("p2050-sfx"), musicOn:pref("p2050-music"),
  lvMusic:lvl("p2050-vol-music", 0.8), lvSfx:lvl("p2050-vol-sfx", 0.8),
  loops:{amb:null, bed:null},
  mood:null, track:null, startedAt:0, mus:[], lastHover:0,
  setScene(scene){ this.scene = scene; this.loops = {amb:null, bed:null}; },
  /* one-shot effect; o = {vol, delay} */
  play(n, o = {}){
    if (!this.on || !this.scene || !SFX_HAVE.has(n)) return;
    const go = () => { try { snd().playSound(this.scene, `sfx-${n}.mp3`, false, VOL.sfx * this.lvSfx * (o.vol ?? 1), 1 + (["click", "hover", "tab", "type", "tick", "pop", "select"].includes(n) ? (Math.random() * 2 - 1) * .06 : 0)); } catch(e) {} };
    if (o.delay) setTimeout(go, o.delay * 1000); else go();
  },
  hover(){ const now = performance.now(); if (now - this.lastHover < 70) return; this.lastHover = now; this.play("hover", {vol:.5}); },
  /* looping layer with fades: "amb" on sound channel 2 (the music ducks), "bed" on channel 3 */
  loop(slot, n, vol = 1, fade = .8){
    n = AMB_ALIAS[n] || n;
    const cur = this.loops[slot];
    if (cur && cur.n === n && !cur.stopping) return;
    this.stopLoop(slot, fade);
    if (!n || !AMB_HAVE.has(n) || !this.on || !this.scene) return;
    const ch = slot === "amb" ? 2 : 3;
    this.loops[slot] = {n, ch, v:0, target:(slot === "amb" ? VOL.amb : VOL.bed) * vol, speed:(slot === "amb" ? VOL.amb : VOL.bed) * vol / Math.max(.1, fade), stopping:false, base:vol};
    try { snd().playSoundOnChannel(this.scene, `amb-${n}.mp3`, ch, true, 0, 1); } catch(e) {}
  },
  stopLoop(slot, fade = .8){
    const cur = this.loops[slot]; if (!cur) return;
    if (fade <= 0){ try { snd().stopSoundOnChannel(this.scene, cur.ch); } catch(e) {} this.loops[slot] = null; return; }
    cur.stopping = true; cur.target = 0; cur.speed = Math.max(1, cur.v / fade);
  },
  ambience(n, vol = 1){ if (!this.on) return; this.loop("amb", n, vol, .9); },
  stopAmb(ms = 800){ this.stopLoop("amb", ms / 1000); },
  setBed(n, vol = 1){ this.loop("bed", this.on ? n : null, vol, 2); },
  /* ---------- music ---------- */
  pickTrack(mood){ const list = MUSIC[mood] || MUSIC.calm, last = this.track, opts = list.length > 1 ? list.filter(x => x !== last) : list; return opts[Math.floor(Math.random() * opts.length)]; },
  setMood(mood, force = false){
    const changed = mood !== this.mood; this.mood = mood;
    if (!this.musicOn || !this.scene) return;
    if (!force && !changed && this.track) return;
    const big = ["win", "lose", "menu"].includes(mood) || !this.track;   // keep a track that has only just started unless the change is big
    if (!force && !big && performance.now() - this.startedAt < 25000) return;
    this.playTrack(this.pickTrack(mood));
  },
  musicVol(){ return VOL.music * this.lvMusic * (this.loops.amb && !this.loops.amb.stopping ? VOL.duck : 1); },
  playTrack(name){
    if (!this.scene) return;
    const ch = this.mus.length && this.mus[this.mus.length - 1].ch === 1 ? 4 : 1;
    for (const m of this.mus) m.out = true;   // cross-fade the old one out (2.5 s)
    try { snd().playMusicOnChannel(this.scene, `music-${name}.mp3`, ch, false, 0, 1); } catch(e) {}
    this.mus = this.mus.filter(m => m.ch !== ch); this.mus.push({ch, v:0, out:false, t0:performance.now()});
    this.track = name; this.startedAt = performance.now();
  },
  stopMusic(){ for (const m of this.mus){ try { snd().stopMusicOnChannel(this.scene, m.ch); } catch(e) {} } this.mus = []; this.track = null; },
  /* mood from the state of the world */
  gameMood(){
    const S = P.S;
    if (S.over) return S.over === "win" ? "win" : "lose";
    const left = P.TOTAL_TICKS - S.tick;
    if (S.temp >= 2.3 || S.appr < 22 || left <= 18) return "crisis";
    if (S.temp >= 1.75 || S.appr < 40 || S.tick >= 216) return "tense";
    return "calm";
  },
  /* per frame: fades, cross-fades, the next track when one ends */
  update(dt){
    if (!this.scene) return;
    for (const slot of ["amb", "bed"]){
      const L = this.loops[slot]; if (!L) continue;
      const tgt = L.stopping ? 0 : L.target * this.lvSfx;
      L.v = L.v < tgt ? Math.min(tgt, L.v + L.speed * dt) : Math.max(tgt, L.v - L.speed * dt);
      try { snd().setSoundOnChannelVolume(this.scene, L.ch, L.v); } catch(e) {}
      if (L.stopping && L.v <= 0){ try { snd().stopSoundOnChannel(this.scene, L.ch); } catch(e) {} this.loops[slot] = null; }
    }
    if (!this.mus.length){ if (this.musicOn && this.mood) this.playTrack(this.pickTrack(this.mood)); return; }
    const target = this.musicVol(), step = Math.max(target, 1) / 2.5 * dt;
    for (const m of this.mus){
      const tg = m.out || !this.musicOn ? 0 : target;
      m.v = m.v < tg ? Math.min(tg, m.v + step) : Math.max(tg, m.v - step * 1.6);
      try { snd().setMusicOnChannelVolume(this.scene, m.ch, m.v); } catch(e) {}
      if ((m.out || !this.musicOn) && m.v <= 0){ try { snd().stopMusicOnChannel(this.scene, m.ch); } catch(e) {} m.dead = true; }
    }
    this.mus = this.mus.filter(m => !m.dead);
    const cur = this.mus.find(m => !m.out);
    if (this.musicOn && cur && performance.now() - cur.t0 > 3000){ let playing = true; try { playing = snd().isMusicOnChannelPlaying(this.scene, cur.ch); } catch(e) {} if (!playing) this.playTrack(this.pickTrack(this.mood)); }
  },
  /* ---------- settings ---------- */
  setLevel(kind, v){
    v = Math.max(0, Math.min(1, v));
    if (kind === "music"){ this.lvMusic = v; try { localStorage.setItem("p2050-vol-music", v); } catch(e) {} }
    else { this.lvSfx = v; try { localStorage.setItem("p2050-vol-sfx", v); } catch(e) {} }
  },
  toggle(){ this.on = !this.on; savePref("p2050-sfx", this.on); if (!this.on){ this.stopLoop("amb", 0); this.stopLoop("bed", 0); } else this.play("toggle"); },
  toggleMusic(){ this.musicOn = !this.musicOn; savePref("p2050-music", this.musicOn); if (this.musicOn && this.mood){ this.stopMusic(); this.setMood(this.mood, true); } },
};
P.Audio = A;
const H = P.H = P.H || {};
/* a few engine sounds get a second layer (same as the website) */
H.sfx = n => {
  A.play(n);
  if (n === "buy") A.play("unlock", {vol:.6, delay:.08});
  else if (n === "warn") A.play("glitch", {vol:.35, delay:.15});
  else if (n === "year") A.play("bong", {vol:.5, delay:.1});
  else if (n === "spawnRed") A.play("drop", {vol:.6});
  else if (n === "action") A.play("confirm", {vol:.5, delay:.05});
};
H.amb = n => A.ambience(n);
H.stopAmb = () => A.stopAmb();
/* the quiet place sound under the music and the mood of the music, checked every second (web/src/game.js updateBed) */
const PLACE_BED = {NA:"highway", EU:"street", EA:"city", SA:"jungle", MEAF:"gale", SEA:"river"};
setInterval(() => {
  const S = P.S, Sc = P.Screens; if (!Sc || !A.scene) return;
  if (Sc.kind === "menu"){ A.setBed("space", .8); A.setMood("menu"); return; }
  if (Sc.kind !== "game" || !S.started){ A.setBed(null); return; }
  A.setMood(A.gameMood());
  if (S.over){ A.setBed(null); return; }
  if (P.TOTAL_TICKS - S.tick <= 24 && !S.world) return A.setBed("clock", .55);
  const reg = P.Map && P.Map.isCountryZoom && P.Map.isCountryZoom() && S.sel ? S.sel : null;
  A.setBed(reg ? PLACE_BED[reg] : null, .4);
}, 1000);

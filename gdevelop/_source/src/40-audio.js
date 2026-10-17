const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.audio) return;
(P.mods = P.mods || {}).audio = 1;
/* =========================================================================
   Audio · real recordings (see assets/audio/CREDITS.txt)
   sfx-*  : one-shot interface sounds        → GDevelop "play a sound"
   amb-*  : event ambience, looped on sound channel 2, faded in/out
   music-*: played by the scene events on music channel 1 (global variables MusicOn / MusicVol)
   ========================================================================= */
const snd = () => gdjs.evtTools.sound;
const pref = k => { try { return localStorage.getItem(k) !== "0"; } catch(e) { return true; } };
const savePref = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch(e) {} };
const lvl = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : Math.max(0, Math.min(1, v)); } catch(e) { return d; } };
const VOL = {sfx:60, amb:55, music:30, musicDuck:12};
const A = {
  SFX:["click","open","close","select","speed","pause","buy","action","error","event","choose","pop","aid","miss","spawnGreen","spawnRed","news","year","done","warn","save","start","win","lose"],
  AMB:["heat","factory","construction","harbor","ocean","storm","flood","fire","wind","arctic","crowd","city","siren","forest","birds","bees","lab","office","air","train","farm","underwater","market","explosion"],
  scene:null, on:pref("p2050-sfx"), musicOn:pref("p2050-music"),
  lvMusic:lvl("p2050-vol-music", 0.8), lvSfx:lvl("p2050-vol-sfx", 0.8),
  amb:null, ambVol:0, ambTarget:0, ambStop:false, musVol:null,
  setScene(scene){ this.scene = scene; this.amb = null; this.ambVol = 0; this.syncGlobals(); },
  musicTarget(){ return (this.amb ? VOL.musicDuck : VOL.music) * this.lvMusic; },
  syncGlobals(){
    if (!this.scene) return;
    const gv = this.scene.getGame().getVariables();
    gv.get("MusicOn").setNumber(this.musicOn ? 1 : 0);
    gv.get("MusicVol").setNumber(this.musicTarget());
  },
  play(n){
    if (!this.on || !this.scene) return;
    try { snd().playSound(this.scene, `sfx-${n}.mp3`, false, VOL.sfx * this.lvSfx, 1); } catch(e) {}
  },
  ambience(n){
    this.stopAmb(0);
    if (!this.on || !n || !this.scene) return;
    this.amb = n; this.ambVol = 0; this.ambTarget = VOL.amb * this.lvSfx; this.ambStop = false;
    try { snd().playSoundOnChannel(this.scene, `amb-${n}.mp3`, 2, true, 0, 1); } catch(e) {}
    this.syncGlobals();
  },
  stopAmb(ms = 800){
    if (!this.amb) return;
    if (!ms){ try { snd().stopSoundOnChannel(this.scene, 2); } catch(e) {} this.amb = null; this.ambVol = 0; }
    else { this.ambStop = true; this.ambTarget = 0; this.ambFade = ms / 1000; }
    this.syncGlobals();
  },
  /* per frame: ambience / music volume fades */
  update(dt){
    if (!this.scene) return;
    if (this.amb){
      const speed = (this.ambStop ? VOL.amb / (this.ambFade || .8) : VOL.amb / .7) * dt;
      if (this.ambVol < this.ambTarget) this.ambVol = Math.min(this.ambTarget, this.ambVol + speed);
      else if (this.ambVol > this.ambTarget) this.ambVol = Math.max(this.ambTarget, this.ambVol - speed);
      try { snd().setSoundOnChannelVolume(this.scene, 2, this.ambVol); } catch(e) {}
      if (this.ambStop && this.ambVol <= 0){ try { snd().stopSoundOnChannel(this.scene, 2); } catch(e) {} this.amb = null; this.ambStop = false; this.syncGlobals(); }
    }
    if (this.musicOn){
      const target = (this.amb && !this.ambStop ? VOL.musicDuck : VOL.music) * this.lvMusic;
      if (this.musVol === null) this.musVol = target;
      const step = 30 * dt;
      this.musVol = this.musVol < target ? Math.min(target, this.musVol + step) : Math.max(target, this.musVol - step);
      try { if (snd().isMusicOnChannelPlaying(this.scene, 1)) snd().setMusicOnChannelVolume(this.scene, 1, this.musVol); } catch(e) {}
    }
  },
  setLevel(kind, v){
    v = Math.max(0, Math.min(1, v));
    if (kind === "music"){ this.lvMusic = v; try { localStorage.setItem("p2050-vol-music", v); } catch(e) {} this.musVol = this.musicTarget(); try { snd().setMusicOnChannelVolume(this.scene, 1, this.musVol); } catch(e) {} }
    else { this.lvSfx = v; try { localStorage.setItem("p2050-vol-sfx", v); } catch(e) {} if (this.amb) this.ambTarget = VOL.amb * v; }
    this.syncGlobals();
  },
  toggle(){ this.on = !this.on; savePref("p2050-sfx", this.on); if (!this.on) this.stopAmb(0); else this.play("click"); },
  toggleMusic(){
    this.musicOn = !this.musicOn; savePref("p2050-music", this.musicOn);
    if (!this.musicOn){ try { snd().stopMusicOnChannel(this.scene, 1); } catch(e) {} }
    this.musVol = null; this.syncGlobals();   // the scene events start the next track when MusicOn = 1
  },
};
P.Audio = A;
const H = P.H = P.H || {};
H.sfx = n => A.play(n);
H.amb = n => A.ambience(n);
H.stopAmb = () => A.stopAmb();

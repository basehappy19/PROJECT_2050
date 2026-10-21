/* Graphics quality: low · medium (default) · high.
   "auto" starts on medium and drops to low by itself if the map can't keep up (the player is told once).
   Choosing a level by hand turns the automatic change off. */
import {ls} from "./core.js";

export const GFX_LEVELS = {
  //          pixel ratio cap · map photo · cached map scale · effect frames/s · particles · glass blur · globe
  low:   {dpr:1,   bigImg:false, cache:1,   fxFps:24, particles:.35, blur:false, globeDpr:1,   globeSeg:72,  clouds:false, stars:.45},
  medium:{dpr:1.5, bigImg:true,  cache:1.5, fxFps:30, particles:.7,  blur:false, globeDpr:1.5, globeSeg:128, clouds:true,  stars:.8},
  high:  {dpr:2.5, bigImg:true,  cache:2,   fxFps:60, particles:1,   blur:true,  globeDpr:2,   globeSeg:160, clouds:true,  stars:1},
};
const ORDER = ["low", "medium", "high"];

export const Gfx = {
  pref:"auto", level:"medium", listeners:new Set(),
  init(){
    const p = ls.get("p2050-gfx", "auto");
    this.pref = p === "auto" || GFX_LEVELS[p] ? p : "auto";
    let lv = this.pref === "auto" ? ls.get("p2050-gfx-auto", "medium") : this.pref;
    if (!GFX_LEVELS[lv]) lv = "medium";
    this.apply(lv, true);
  },
  get cfg(){ return GFX_LEVELS[this.level]; },
  dpr(){ return Math.min(window.devicePixelRatio || 1, this.cfg.dpr); },
  /* the player picks a level (or "auto") in the settings */
  choose(p){
    this.pref = p; ls.set("p2050-gfx", p);
    if (p === "auto"){ ls.set("p2050-gfx-auto", null); this.apply("medium"); }
    else this.apply(p);
  },
  apply(lv, quiet){
    this.level = lv;
    document.documentElement.dataset.gfx = lv;
    if (!quiet) this.listeners.forEach(f => { try { f(lv); } catch(e){ console.error(e); } });
  },
  onChange(f){ this.listeners.add(f); return () => this.listeners.delete(f); },
  /* frame-rate watch (called by the map every frame): two slow 4-second windows in a row → one step down */
  _t0:0, _n:0, _slow:0,
  sample(now, dt){
    if (dt > .25){ this._t0 = now; this._n = 0; return; }       // tab was hidden or the game was busy loading
    if (!this._t0){ this._t0 = now; return; }
    this._n++;
    if (now - this._t0 < 4000) return;
    const fps = this._n * 1000 / (now - this._t0); this._t0 = now; this._n = 0;
    if (this.pref !== "auto"){ this._slow = 0; return; }
    if (fps < 24) this._slow++; else this._slow = 0;
    if (this._slow >= 2 && this.level !== "low"){
      this._slow = 0;
      const lv = ORDER[Math.max(0, ORDER.indexOf(this.level) - 1)];
      ls.set("p2050-gfx-auto", lv); this.apply(lv);
      if (this.onAutoDrop) this.onAutoDrop(lv);
    }
  },
};
Gfx.init();

/* Core: the shared engine (rules + data + server client), the UI state object and the re-render signal. */
import "./pre.js";
import P from "./gen/engine.js";
import {useEffect, useReducer} from "preact/hooks";

export {P};
export const S = P.S;
export const H = P.H = P.H || {};
export const t = k => P.t(k);
export const L = o => P.L(o);
export const up = s => (S.lang === "en" ? String(s).split(/(\[\[\$?[a-z0-9-]+\]\])/).map(x => (/^\[\[/.test(x) ? x : x.toUpperCase())).join("") : String(s));
export const ls = {
  get(k, d = null){ try { const v = localStorage.getItem(k); return v === null ? d : v; } catch(e){ return d; } },
  set(k, v){ try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e){} },
};

/* ---------- UI state (same shape as the GDevelop version's UIM) ----------
   screen: "loading" | "menu" | "game"
   modal kinds (top = highest priority): tutorial · pause · learn · story · end · event · skills · charsel */
export const EVENT_LOCK = 1.5;
export const UIM = P.UIM = {
  screen:"loading", sub:null, modal:null, msg:"", err:false, tutI:0, thenIntro:false, prevSpeed:1,
  toastQ:[], evAt:0, storyAct:0, storyI:0, storyT:0, reward:null, charSel:null, modeSel:"normal", learnTab:"cards", accTab:"login",
  transition:null,
  kind(){
    if (this.modal === "tutorial" || this.modal === "pause" || this.modal === "learn") return this.modal;
    if (this.screen !== "game") return this.modal;
    if (this.modal === "story") return "story";
    if (S.over) return "end";
    if (S.event) return "event";
    return this.modal;     // "skills" | "charsel"
  },
  get paused(){ return this.modal === "pause"; },
  get blocking(){ return ["charsel", "pause", "tutorial", "story", "skills", "learn", "market"].includes(this.modal) || !!this.transition; },
  eventLocked(){ return (performance.now() - this.evAt) / 1000 < EVENT_LOCK; },
  eventLockFrac(){ return Math.min(1, (performance.now() - this.evAt) / 1000 / EVENT_LOCK); },
};

/* ---------- re-render signal: anything may call bump(); the app re-renders once per animation frame ---------- */
let version = 0, queued = false;
const subs = new Set();
export function bump(){
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; version++; subs.forEach(f => f(version)); });
}
P._bump = bump;
/* components call useVersion() to re-render on every bump */
export function useVersion(){
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => { subs.add(force); return () => subs.delete(force); }, []);
  return version;
}
export const isTouch = () => !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
P.hasKeyboard = () => !isTouch();
P.up = up;

/* knowledge cards (used by achievements + the server's certificate check) */
const FACT_EVENTS = P.EVENTS.filter(e => e.fact);
export const HZ_IDS = Object.keys(P.HAZARDS);
P.cardTotal = () => FACT_EVENTS.length + HZ_IDS.length;
P.cardCount = () => { const d = P.AchStore.data; return FACT_EVENTS.filter(e => d.seen.includes(e.id)).length + HZ_IDS.filter(h => (d.haz || []).includes(h)).length; };
export {FACT_EVENTS};

/* colours (same palette as the GDevelop version) */
export const COL = {
  bg:"#061015", glass:"#0b181e", panel:"#0e1d24", panel2:"#15272f", line:"#24414b", fg:"#e6f0ee", muted:"#8fa9a6",
  accent:"#4fd1c5", ink:"#04201d", good:"#5fd39a", warn:"#f2b441", hot:"#f07a3c", bad:"#ff5a4a",
  purple:"#c3a6ff", cloud:"#b7c7cf", vuln:"#ff8a7a", gold:"#f2c14e", sky:"#8fd0ff",
};
export const relCol = rel => (rel >= 50 ? "good" : rel >= 0 ? "accent" : rel > -40 ? "warn" : "bad");
export const HZ_COL = {hurricane:"#c3a6ff", typhoon:"#c3a6ff", flood:"#8fd0ff", heat:"#ff8a3c", drought:"#f2c14e", wildfire:"#ff5a4a", saltwater:"#4fd1c5"};
export const asset = p => `assets/${p}`;
export const small = () => Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.deviceMemory && navigator.deviceMemory <= 3);

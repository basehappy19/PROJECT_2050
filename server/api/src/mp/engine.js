/* The game rules for multiplayer: the same engine the browser runs (web/src/engine, bundled by web/build.mjs into
   game-engine.js), each game in its own sandbox. The server is the referee: players only send actions. */
import fs from "node:fs";
import vm from "node:vm";

const CODE = fs.readFileSync(new URL("./game-engine.js", import.meta.url), "utf8");
const script = new vm.Script(CODE, {filename:"game-engine.js"});

/* hooks the browser needs to hear about (sounds, alerts, losses …); everything else stays on the server */
const RELAY = new Set(["sfx", "toast", "hazardStrike", "hazardWarn", "loss", "yearly", "mapFocus", "showEvent", "showEnd"]);

export function makeEngine(seed){
  const store = {};
  const M = Object.create(Math);
  let s = seed >>> 0;
  M.random = () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const ctx = {console:{log(){}, warn(){}, error:console.error}, Math:M, JSON, Date, Object, Array, Set, Map, Number, String, Boolean, Symbol, Promise, setTimeout, clearTimeout, isNaN, parseFloat, parseInt, Intl,
    localStorage:{getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; }},
    location:{protocol:"file:", hostname:"server", search:""}, navigator:{}, performance:{now:() => Date.now()}};
  ctx.window = ctx;
  vm.createContext(ctx);
  script.runInContext(ctx, {timeout:5000});
  const P = ctx.P2050;
  const fx = [];
  for (const name of RELAY) P.H[name] = (...a) => { fx.push([name, ...a.map(x => (x && typeof x === "object" ? JSON.parse(JSON.stringify(x)) : x))]); };
  P.H.dirty = () => {}; P.H.mapRefresh = () => {};
  return {P, S:P.S, fx, take(){ return fx.splice(0, fx.length); }};
}

/* what goes to the browser: the whole state except the parts only the server needs */
export function snapshot(S){
  const o = {};
  for (const k of Object.keys(S)){
    if (k === "log") o.log = S.log.slice(0, 40);
    else if (k === "rng" || k === "seed" || k === "saveId" || k === "saveSlot" || k === "runId") continue;
    else o[k] = S[k];
  }
  return JSON.parse(JSON.stringify(o));
}

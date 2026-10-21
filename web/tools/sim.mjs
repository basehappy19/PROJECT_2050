/* Balance check: plays many games with simple bots (no browser) and reports how often they win.
   Usage: node tools/sim.mjs [games=200] [preset=A] [mode=normal]
   Bots: "good" plays sensibly every month · "casual" misses half the bubbles and picks skills and choices at random */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ENG = path.resolve(HERE, "../src/engine");
const N = +(process.argv[2] || 200), PRESET = process.argv[3] || "A", MODE = process.argv[4] || "normal";

function makeEngine(seed){
  const store = {};
  const ctx = {console, Math, JSON, Date, Object, Array, Set, Map, Number, String, Boolean, Symbol, Promise, setTimeout, clearTimeout, isNaN, parseFloat, parseInt, Intl,
    localStorage:{getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; }},
    location:{protocol:"file:", hostname:"sim"}, navigator:{}, performance:{now:() => Date.now()}};
  ctx.window = ctx; vm.createContext(ctx);
  // deterministic Math.random per game so runs can be repeated
  let s = seed >>> 0; ctx.Math = Object.create(Math); ctx.Math.random = () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  for (const f of fs.readdirSync(ENG).filter(f => /^(1\d|2\d)-.*\.js$/.test(f)).sort()) vm.runInContext(`(function(){${fs.readFileSync(path.join(ENG, f), "utf8")}})();`, ctx, {filename:f});
  return ctx.P2050;
}

const co2Value = (P, n) => { const fx = n.fx || {}; let v = 0; if (fx.co2) v -= fx.co2; if (fx.all) v -= fx.all * 6; if (fx.rco2) v -= Object.values(fx.rco2).reduce((a, b) => a + b, 0); if (fx.sink) v += fx.sink * 1.2; if (fx.damp) v += fx.damp * 8; if (fx.epInc) v += fx.epInc * .15; if (fx.compAll) v += fx.compAll * .08; if (fx.appr) v += fx.appr * .05; return v; };

function play(bot, seed){
  const P = makeEngine(seed), S = P.S;
  if (P.setBalance) P.setBalance(PRESET, process.env.BAL ? JSON.parse(process.env.BAL) : undefined);   // BAL='{"inc":1.1,"cost":.9}' tries a custom preset
  P.startGame("th", {mode:MODE, char:"sci", charLv:1, seed, ab:PRESET});
  const R = () => P.rand();
  for (let i = 0; i < 1200 && !S.over; i++){
    // resolve an open event
    if (S.event){
      const e = P.currentEvent(); let best = -1;
      if (bot === "good"){
        let bs = -1e9;
        e.options.forEach((o, k) => { if (!P.affordable(o.fx)) return; const fx = o.fx; const sc = -(fx.co2 || 0) * 10 - (fx.temp || 0) * 300 - (fx.tip || 0) * 1.2 + (fx.appr || 0) * (S.appr < 40 ? 1.5 : .6) + (fx.ep || 0) * .04 + (fx.pc || 0) * .1 + (fx.relA || 0) * .05 + (fx.relB || 0) * .05 - (fx.cA || 0) * 20 - (fx.cB || 0) * 20; if (sc > bs){ bs = sc; best = k; } });
      } else { const ok = e.options.map((o, k) => k).filter(k => P.affordable(e.options[k].fx)); best = ok.length ? ok[Math.floor(R() * ok.length)] : -1; }
      P.chooseOption(best);
      continue;
    }
    // bubbles
    for (const b of S.bubbles.slice()){ if (bot === "casual" && R() < .5) continue; if (b.type === "green" || S.ep > P.aidCost() + 30) P.popBubble(b.id, 0, 0); }
    // hazards
    for (const h of S.haz){ if (!h.evac && S.ep > P.evacCost() + (bot === "good" ? 40 : 80) && (bot === "good" || R() < .4)) P.evacuate(h.id); }
    // skills
    const ready = P.SKILLS.filter(n => P.nodeState(n) === "ready").map(n => ({n, c:P.nodeCost(n)})).filter(x => (P.canAfford ? P.canAfford(x.n) : S.ep >= x.c.ep && S.pc >= x.c.pc && !P.atCapacity(x.n)));
    // minerals: when the best next skill needs more minerals than we have, buy some from the friendliest producer
    if (P.oreCost && S.oreOn && (bot === "good" || R() < .3)){
      const want = P.SKILLS.filter(n => P.nodeState(n) === "ready" && P.oreCost(n) > (S.ore || 0)).sort((a, b) => co2Value(P, b) - co2Value(P, a))[0];
      if (want && S.ep > P.ORE_BUY.ep + 40){
        const src = S.countries.filter(c => P.oreBuyOk(c) && !(c.cd.ore > 0)).sort((a, b) => b.rel - a.rel)[0];
        if (src){ S.selC = src.id; S.sel = src.reg; P.countryAction("ore"); S.selC = null; }
      }
    }
    if (ready.length){
      let pick;
      if (bot === "good") pick = ready.sort((a, b) => co2Value(P, b.n) / (b.c.ep + b.c.pc * 3) - co2Value(P, a.n) / (a.c.ep + a.c.pc * 3))[0];
      else if (R() < .5) pick = ready[Math.floor(R() * ready.length)];
      if (pick && (bot !== "good" || P.recentBuys() < 3 || S.ep > 250)) P.buyNode(pick.n.id);
    }
    // active skills and abilities
    for (const a of P.abilityList()) if (P.abilityReady(a) && (bot === "good" || R() < .3)){ if (a.target === "country"){ const c = S.countries.filter(x => !x.rest).sort((x, y) => y.co2 - x.co2)[0]; S.selC = c.id; S.sel = c.reg; } P.useAbility(a.id); }
    // regional orders: fund the biggest emitter, diplomacy where on-plan is low
    if (bot === "good" || R() < .3){
      const big = S.regions.slice().sort((a, b) => b.co2 - a.co2)[0]; S.sel = big.id; S.selC = null;
      const fund = P.ACTIONS.find(a => a.id === "fund"), k = P.actionCost(fund, big, false);
      if (!(big.cd.fund > 0) && S.ep > k.ep + 60) P.doAction("fund");
      const low = S.regions.slice().sort((a, b) => a.comp - b.comp)[0]; S.sel = low.id;
      const dip = P.ACTIONS.find(a => a.id === "diplo"), k2 = P.actionCost(dip, low, false);
      if (!(low.cd.diplo > 0) && S.pc > k2.pc + 20 && low.comp < 80) P.doAction("diplo");
    }
    // country orders on the biggest emitters (funding, technology) and bilateral deals
    if (bot === "good"){
      const top = S.countries.filter(c => !c.rest).sort((x, y) => y.co2 - x.co2).slice(0, 6);
      for (const c of top){
        S.selC = c.id; S.sel = c.reg;
        for (const aid of ["tech", "fund", "talk"]){ const a = P.CACTS.find(x => x.id === aid); if (P.cactOk(a, c) && S.ep > P.cactCost(a).ep + 160) P.countryAction(aid); }
        if (c.rel >= 40 && S.ep > 120 && S.pc > 40){ const pp = P.bilatPartners(); if (pp.length) P.bilateral(pp.sort((x, y) => y.co2 - x.co2)[0].id); }
      }
      for (const r of S.regions) if (P.canAlly(r.id)) P.formAlliance(r.id);
      S.selC = null;
    }
    if (process.env.TRACE2 && S.tick % 48 === 0 && !S.event) console.log(S.tick, "ep", Math.round(S.ep), "pc", Math.round(S.pc), "ore", Math.round(S.ore || 0), "rush", P.recentBuys(), P.SKILLS.filter(n => P.nodeState(n) === "ready").map(n => { const c = P.nodeCost(n); return `${n.id}:${c.ep}/${c.pc}/${P.oreCost(n)}${P.atCapacity(n) ? "CAP" : ""}`; }).join(" "));
    P.tick();
    if (process.env.TRACE && S.tick % 24 === 0 && !S.event) console.log(S.tick, P.netCO2().toFixed(1), S.regions.map(r => r.co2.toFixed(1) + '/' + r.comp.toFixed(0)).join(' '), 'ep', Math.round(S.ep), 'skills', Object.keys(S.owned).length, 'bil', S.bilats.length, 'cr', S.crolls.length);
  }
  return {over:S.over, grade:S.grade || "-", tick:S.tick, temp:S.temp, net:P.netCO2(), appr:S.appr, skills:Object.keys(S.owned).length};
}

for (const bot of ["good", "casual"]){
  const res = []; for (let g = 0; g < N; g++) res.push(play(bot, 1000 + g * 7919));
  const cnt = k => res.filter(r => r.over === k).length, wins = res.filter(r => r.over === "win");
  const avg = (a, f) => a.length ? (a.reduce((s, r) => s + f(r), 0) / a.length) : 0;
  const grades = ["S", "A", "B"].map(g => `${g}:${wins.filter(r => r.grade === g).length}`).join(" ");
  console.log(`${bot.padEnd(6)} preset ${PRESET} · win ${(cnt("win") / N * 100).toFixed(0)}% (${grades}) · heat ${cnt("l1")} · impeached ${cnt("l2")} · time ${cnt("l3")} · win year ${(2026 + avg(wins, r => r.tick) / 12).toFixed(1)} · win temp ${avg(wins, r => r.temp).toFixed(2)} · end temp ${avg(res, r => r.temp).toFixed(2)} · skills ${avg(res, r => r.skills).toFixed(0)} · end net ${avg(res, r => r.net).toFixed(1)} · appr ${avg(res, r => r.appr).toFixed(0)}`);
}

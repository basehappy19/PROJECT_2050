/* 2.0 multiplayer games, run by the server (the referee).
   CoopGame   — one world, one budget, four ministries; events and region-wide evacuations go to a 15-second vote.
   VersusGame — one world per player (same seed), a shared temperature, aid / tariffs / pacts between players. */
import { makeEngine, snapshot } from "./engine.js";

const STEP_MS = 200, SEND_MS = 250, BEAT_MS = 3000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const newSeed = () => (Math.random() * 2 ** 31) | 0;
/* arguments for an engine call: a few plain values only */
const okArgs = a => Array.isArray(a) && a.length <= 4 && a.every(x => x === null || typeof x === "string" && x.length <= 40 || typeof x === "number" && Number.isFinite(x) || typeof x === "boolean" || Array.isArray(x) && x.length <= 2 && x.every(Number.isFinite));

class Base {
  constructor(room, send){ this.room = room; this.send = send; this.last = Date.now(); this.acc = 0; this.sentAt = 0; this.dirty = true; this.over = false; this.feed = []; }
  start(){ this.timer = setInterval(() => { try { this.step(); } catch (e){ console.error("mp step", e); } }, STEP_MS); }
  stop(){ clearInterval(this.timer); this.timer = null; }
  dt(){ const now = Date.now(), d = Math.min(1, (now - this.last) / 1000); this.last = now; return d; }
  /* use the player's selection for the action (which continent / country it is about) */
  select(S, P, m){ S.sel = m.sel && P.RMETA[m.sel] ? m.sel : S.sel; S.selC = m.selC && P.C(m.selC) ? m.selC : null; }
  note(uid, fn, arg, ok){ this.feed.unshift({uid, fn, arg:typeof arg === "string" || typeof arg === "number" ? arg : null, ok, at:Date.now()}); if (this.feed.length > 12) this.feed.length = 12; }
}

/* ---------------- Co-op: the Joint Taskforce ---------------- */
export class CoopGame extends Base {
  constructor(room, send){
    super(room, send);
    this.kind = "coop";
    const ids = room.order.slice();
    this.seed = newSeed();
    this.E = makeEngine(this.seed); const P = this.P = this.E.P;
    P.setBalance("MP", P.MP.coopBalance(ids.length));
    P.startGame(room.lang || "th", {mode:room.diff === "hard" ? "hard" : "normal", char:room.char || "sci", charLv:1, seed:this.seed, ab:"MP"});
    const S = this.S = P.S;
    S.mp = {kind:"coop", n:ids.length}; S.speed = 1;
    this.E.take();
    this.roles = P.MP.assignRoles(ids, Object.fromEntries(ids.map(id => [id, (room.players.get(id) || {}).roles || []])));
    this.vote = null;
  }
  get spm(){ return this.P.secPerMonth(this.S.speed); }
  step(){
    const dt = this.dt(), S = this.S, P = this.P, now = Date.now();
    if (!this.over){
      if (this.vote){ if (now >= this.vote.deadline || this.allVoted()) this.resolveVote(); }
      else if (S.speed > 0 && !S.event && !S.over && this.room.anyOnline()){
        this.acc += dt;
        if (this.acc >= this.spm){ this.acc -= this.spm; if (this.acc > this.spm) this.acc = 0; P.tick(); this.dirty = true; this.after(); }
      }
    }
    if ((this.dirty && now - this.sentAt >= SEND_MS) || now - this.sentAt >= BEAT_MS) this.broadcast();
  }
  after(){
    const S = this.S;
    if (S.event && !this.vote) this.openVote({kind:"event", id:S.event});
    if (S.over && !this.over){ this.over = true; this.dirty = true; this.broadcast(); this.room.gameEnded(this.result()); }
  }
  /* ---- votes ---- */
  openVote(v){ this.vote = {...v, deadline:Date.now() + this.P.MP.VOTE_SEC * 1000, votes:{}}; this.dirty = true; }
  voters(){ return this.room.order.filter(id => this.room.isOnline(id)); }
  allVoted(){ const v = this.voters(); return v.length > 0 && v.every(id => id in this.vote.votes); }
  castVote(uid, m){
    const v = this.vote; if (!v || !this.room.players.has(uid)) return {error:"no_vote"};
    if (v.kind === "event"){
      const e = this.P.currentEvent(); if (!e) return {error:"no_vote"};
      const i = Number(m.opt), all = e.options.every(o => !this.P.affordable(o.fx));
      if (!(Number.isInteger(i) && (i >= 0 && i < e.options.length && this.P.affordable(e.options[i].fx) || i === -1 && all))) return {error:"bad_option"};
      v.votes[uid] = i;
    } else v.votes[uid] = !!m.yes;
    this.dirty = true; return {ok:true};
  }
  resolveVote(){
    const v = this.vote, P = this.P, S = this.S; this.vote = null; this.dirty = true;
    if (v.kind === "event"){
      const e = P.currentEvent(); if (!e){ return; }
      const cnt = {}; Object.values(v.votes).forEach(i => { cnt[i] = (cnt[i] || 0) + 1; });
      let pick = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || a - b)[0];
      if (pick === undefined){ pick = e.options.findIndex(o => P.affordable(o.fx)); }
      P.chooseOption(pick);
      this.lastVote = {kind:"event", title:e.title, pick, label:pick >= 0 ? e.options[pick].label : P.UI.postpone, votes:v.votes};
    } else if (v.kind === "evac"){
      const yes = Object.values(v.votes).filter(Boolean).length, no = Object.values(v.votes).length - yes;
      const pass = yes >= no && yes > 0;
      if (pass) for (const h of S.haz.filter(h => !h.evac && P.C(h.c).reg === v.reg)) P.evacuate(h.id);
      this.lastVote = {kind:"evac", reg:v.reg, pass, votes:v.votes};
    }
    this.after();
  }
  /* ---- player actions ---- */
  act(uid, m){
    const P = this.P, S = this.S; if (this.over || S.over) return {error:"over"};
    const fn = String(m.fn || ""), args = m.args || [];
    if (fn === "evacAll"){   // a region-wide evacuation is put to a vote
      if (!(this.roles[uid] || []).includes("disaster")) return {error:"not_your_role", role:"disaster"};
      if (this.vote) return {error:"vote_open"};
      const reg = String(args[0] || ""); const hs = S.haz.filter(h => !h.evac && P.C(h.c).reg === reg);
      if (!P.RMETA[reg] || hs.length < 2) return {error:"bad_action"};
      this.openVote({kind:"evac", reg, n:hs.length, cost:hs.length * P.evacCost(), by:uid}); this.vote.votes[uid] = true;
      return {ok:true};
    }
    if (!P.MP.ACTS.includes(fn) || !okArgs(args)) return {error:"bad_action"};
    this.select(S, P, m);
    const role = P.MP.roleFor(fn, args);
    if (!role) return {error:"bad_action"};
    if (role !== "any" && !(this.roles[uid] || []).includes(role)) return {error:"not_your_role", role};
    if (fn === "popBubble"){ args[1] = 0; args[2] = 0; }
    let r; try { r = P[fn](...args); } catch (e){ return {error:"failed"}; }
    this.note(uid, fn, args[0], r !== false); this.dirty = true; this.after();
    return {ok:r !== false};
  }
  setSpeed(uid, v){ if (uid !== this.room.host || ![0, 1, 2].includes(v)) return {error:"host_only"}; this.P.setSpeed(v); this.dirty = true; return {ok:true}; }
  /* ---- what the browsers get ---- */
  publicVote(){
    const v = this.vote; if (!v) return null;
    return {kind:v.kind, id:v.id || null, reg:v.reg || null, n:v.n || 0, cost:v.cost || 0, by:v.by || null, left:Math.max(0, Math.ceil((v.deadline - Date.now()) / 1000)), votes:v.votes};
  }
  state(){
    return {t:"game.state", mode:"coop", S:snapshot(this.S), fx:[], roles:this.roles, vote:this.publicVote(), lastVote:this.lastVote || null, feed:this.feed.slice(0, 6),
      progress:this.S.speed ? clamp(this.acc / this.spm, 0, 1) : 0, over:this.over};
  }
  broadcast(){
    const msg = this.state(); msg.fx = this.E.take();
    this.send(null, msg); this.sentAt = Date.now(); this.dirty = false;
  }
  full(uid){ const m = this.state(); this.send(uid, m); }
  result(){ const S = this.S; return {ending:S.over, tick:S.tick, temp:+S.temp.toFixed(2), net:+this.P.netCO2().toFixed(2), score:this.P.score(), goodYears:this.P.goodYears ? this.P.goodYears() : 0}; }
}

/* ---------------- Versus: the Regional Race ---------------- */
export class VersusGame extends Base {
  constructor(room, send){
    super(room, send);
    this.kind = "versus";
    this.seed = newSeed();
    this.w = new Map();
    for (const uid of room.order){
      const p = room.players.get(uid), E = makeEngine(this.seed), P = E.P;
      P.startGame(room.lang || "th", {mode:room.diff === "hard" ? "hard" : "normal", char:"sci", charLv:1, seed:this.seed, ab:"A"});
      P.S.mp = {kind:"versus"}; P.S.speed = 1;
      P.MP.applyBloc(p.bloc || "SEA");
      E.take();
      this.w.set(uid, {uid, E, P, S:P.S, bloc:p.bloc || "SEA", cd:{}, tariffs:[], evAt:0, out:false});
    }
    this.T = 1.2; this.tip = 10; this.speed = 1; this.pacts = []; this.winner = null;
  }
  worlds(){ return [...this.w.values()]; }
  get spm(){ const any = this.worlds()[0]; return any ? any.P.secPerMonth(this.speed) : 4.5; }
  step(){
    const dt = this.dt(), now = Date.now();
    if (!this.over){
      // a player with an event to answer holds the clock for up to 15 s; after that the first option is chosen for them
      const waiting = this.worlds().filter(w => w.S.event && !w.S.over);
      for (const w of waiting){
        if (!w.evAt) w.evAt = now;
        if (now - w.evAt > w.P.MP.VOTE_SEC * 1000 || !this.room.isOnline(w.uid)){ const e = w.P.currentEvent(); const i = e ? e.options.findIndex(o => w.P.affordable(o.fx)) : -1; w.P.chooseOption(i); w.evAt = 0; this.dirty = true; }
      }
      this.pacts = this.pacts.filter(p => now - p.at < 20000);
      if (!waiting.length && this.speed > 0 && this.room.anyOnline()){
        this.acc += dt;
        if (this.acc >= this.spm){ this.acc -= this.spm; if (this.acc > this.spm) this.acc = 0; this.tickAll(); }
      }
    }
    if ((this.dirty && now - this.sentAt >= SEND_MS) || now - this.sentAt >= BEAT_MS) this.broadcast();
  }
  tickAll(){
    const live = this.worlds().filter(w => !w.S.over);
    const t0 = live.map(w => w.S.temp), p0 = live.map(w => w.S.tip);
    for (const w of live){
      // carbon tariffs: the player under one pays every month, the one who set it gets part of it
      w.tariffs = w.tariffs.filter(tf => tf.left > 0);
      for (const tf of w.tariffs){
        const V = w.P.MP.VS.tariff, e0 = w.S.ep; w.S.ep = Math.max(0, w.S.ep - V.take); tf.left--;
        w.E.fx.push(["loss", {k:"vsTariff", from:this.room.nameOf(tf.from), ep:w.S.ep - e0}]);
        const src = this.w.get(tf.from); if (src && !src.S.over) src.S.ep += V.gain;
      }
      w.P.tick();
    }
    // one planet: everyone's warming this month, shared out
    if (live.length){
      this.T += mean(live.map((w, i) => w.S.temp - t0[i]));
      this.tip = clamp(this.tip + mean(live.map((w, i) => w.S.tip - p0[i])), 0, 100);
    }
    for (const w of this.worlds()){
      w.S.temp = this.T; w.S.tip = this.tip;
      const h = w.S.hist; if (h && h.length) h[h.length - 1].temp = this.T;
      if (!w.S.over) w.P.checkEnd();
    }
    this.dirty = true; this.after();
  }
  after(){
    if (this.over) return;
    const ws = this.worlds();
    const win = ws.filter(w => w.S.over === "win").sort((a, b) => a.S.tick - b.S.tick)[0];
    if (win) this.winner = win.uid;
    if (win || ws.every(w => w.S.over)){ this.over = true; this.dirty = true; this.broadcast(); this.room.gameEnded(this.result()); }
  }
  act(uid, m){
    const w = this.w.get(uid); if (!w || this.over || w.S.over) return {error:"over"};
    const fn = String(m.fn || ""), args = m.args || [], P = w.P, S = w.S;
    if (fn === "vsAid" || fn === "vsTariff" || fn === "vsPact" || fn === "vsPactAnswer") return this.vsAct(w, fn, args);
    if (fn === "chooseOption"){ const i = Number(args[0]); if (!S.event || !Number.isInteger(i)) return {error:"bad_action"}; const e = P.currentEvent(); if (!(i === -1 || (i >= 0 && i < e.options.length))) return {error:"bad_action"}; P.chooseOption(i); w.evAt = 0; this.dirty = true; return {ok:true}; }
    if (!P.MP.ACTS.includes(fn) || !okArgs(args)) return {error:"bad_action"};
    this.select(S, P, m);
    if (fn === "popBubble"){ args[1] = 0; args[2] = 0; }
    let r; try { r = P[fn](...args); } catch (e){ return {error:"failed"}; }
    this.dirty = true; this.after();
    return {ok:r !== false};
  }
  vsAct(w, fn, args){
    const V = w.P.MP.VS, S = w.S, now = S.tick;
    const target = this.w.get(Number(args[0])) || [...this.w.values()].find(x => this.room.nameOf(x.uid) === args[0]);
    const toast = (to, icon, title, msg) => to.E.fx.push(["toast", {id:"vs" + Date.now() + Math.random(), icon, title, msg}]);
    const me = this.room.nameOf(w.uid);
    if (fn === "vsPactAnswer"){
      const p = this.pacts.find(q => q.to === w.uid && (!target || q.from === target.uid)); if (!p) return {error:"no_offer"};
      this.pacts = this.pacts.filter(q => q !== p);
      const from = this.w.get(p.from); if (!from || from.S.over) return {error:"over"};
      if (args[1]){
        for (const x of [w, from]){ x.P.MP.pactCut(); x.cd.pact = x.S.tick + V.pact.cd; x.P.addLog(`[[handshake]] ${x.P.L(V.pact.name)}: ${this.room.nameOf(x === w ? from.uid : w.uid)}`, "gd"); }
        toast(from, "handshake", from.P.L(V.pact.name), me);
      } else toast(from, "x", from.P.L(V.pact.name), `${me} ✕`);
      this.dirty = true; return {ok:true};
    }
    if (!target || target === w || target.S.over) return {error:"bad_target"};
    if ((w.cd[fn] || 0) > now) return {error:"cooldown"};
    if (fn === "vsAid"){
      if (S.ep < V.aid.ep) return {error:"not_enough"};
      S.ep -= V.aid.ep; S.pc += V.aid.pc; target.S.ep += V.aid.gain; w.cd[fn] = now + V.aid.cd;
      w.P.addLog(`[[hand-coins]] ${w.P.L(V.aid.name)} → ${this.room.nameOf(target.uid)}`, "gd"); target.P.addLog(`[[hand-coins]] ${me}: +${V.aid.gain}`, "gd");
      toast(target, "hand-coins", target.P.L(V.aid.name), `${me} +${V.aid.gain}`);
    } else if (fn === "vsTariff"){
      if (S.pc < V.tariff.pc) return {error:"not_enough"};
      if (target.P.netCO2() <= w.P.netCO2()) return {error:"not_bigger"};
      S.pc -= V.tariff.pc; target.tariffs.push({from:w.uid, left:V.tariff.months}); w.cd[fn] = now + V.tariff.cd;
      w.P.addLog(`[[ban]] ${w.P.L(V.tariff.name)} → ${this.room.nameOf(target.uid)}`, "tc"); target.P.addLog(`[[ban]] ${me}: ${target.P.L(V.tariff.name)}`, "al");
      toast(target, "ban", target.P.L(V.tariff.name), me);
    } else if (fn === "vsPact"){
      if (S.pc < V.pact.pc) return {error:"not_enough"};
      if ((target.cd.pact || 0) > target.S.tick) return {error:"cooldown"};
      if (this.pacts.some(p => p.from === w.uid)) return {error:"pending"};
      S.pc -= V.pact.pc; w.cd[fn] = now + V.pact.cd;
      this.pacts.push({from:w.uid, to:target.uid, at:Date.now()});
    }
    this.dirty = true; return {ok:true};
  }
  setSpeed(uid, v){ if (uid !== this.room.host || ![0, 1, 2].includes(v)) return {error:"host_only"}; this.speed = v; for (const w of this.worlds()) w.S.speed = v; this.dirty = true; return {ok:true}; }
  ranking(){
    const ws = this.worlds().map(w => ({id:w.uid, username:this.room.nameOf(w.uid), displayName:this.room.displayOf(w.uid), bloc:w.bloc, net:+w.P.netCO2().toFixed(2), appr:Math.round(w.S.appr), skills:Object.keys(w.S.owned).length,
      over:w.S.over || null, tick:w.S.tick, score:w.P.score(), online:this.room.isOnline(w.uid), tariffs:w.tariffs.length}));
    ws.sort((a, b) => (b.over === "win") - (a.over === "win") || (a.over === "win" ? a.tick - b.tick : 0) || (a.over === "l2") - (b.over === "l2") || a.net - b.net);
    const live = ws.filter(x => x.over !== "l2"), top = live.length ? live.reduce((m, x) => (x.net > m.net ? x : m)) : null;
    ws.forEach((x, i) => { x.rank = i + 1; x.biggest = !!top && x.id === top.id && live.length > 1; });
    return ws;
  }
  broadcast(){
    const rk = this.ranking(), now = Date.now();
    for (const w of this.worlds()){
      const S = w.S;
      this.send(w.uid, {t:"game.state", mode:"versus", S:snapshot(S), fx:w.E.take(), ranking:rk, T:+this.T.toFixed(3), cd:w.cd, winner:this.winner, over:this.over,
        offers:this.pacts.filter(p => p.to === w.uid).map(p => ({from:p.from, username:this.room.nameOf(p.from), left:Math.max(0, 20 - Math.round((now - p.at) / 1000))})),
        evLeft:S.event && w.evAt ? Math.max(0, Math.ceil((w.evAt + w.P.MP.VOTE_SEC * 1000 - now) / 1000)) : null,
        progress:this.speed ? clamp(this.acc / this.spm, 0, 1) : 0});
    }
    this.sentAt = now; this.dirty = false;
  }
  full(uid){ this.dirty = true; this.broadcast(); }
  result(){ return {winner:this.winner ? this.room.nameOf(this.winner) : null, ranking:this.ranking(), T:+this.T.toFixed(2)}; }
}

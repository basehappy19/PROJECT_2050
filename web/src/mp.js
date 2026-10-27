/* 2.0 multiplayer client: the WebSocket to the game server, friends, rooms, and the game itself.
   In a multiplayer game the server runs the rules. This side shows the state it sends, and turns the player's
   clicks into actions for the server (applied here at once for a quick response, then corrected by the server). */
import {P, S, H, UIM, bump, L, t} from "./core.js";
import {Audio} from "./audio.js";

const T = (th, en) => ({th, en});
export const MPT = {
  needLogin:T("เล่นหลายคนต้องเข้าสู่ระบบก่อน", "Sign in to play with others"),
  offline:T("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่…", "Can't reach the server, trying again…"),
  notRole:T("นี่เป็นงานของกระทรวง", "That's a job for"),
  hostOnly:T("เฉพาะหัวหน้าห้องเท่านั้น", "Only the host can do that"),
  invited:T("ส่งคำเชิญแล้ว", "Invite sent"),
  inviteFrom:T("ชวนคุณเล่น", "invites you to play"),
  friendReq:T("ขอเป็นเพื่อนกับคุณ", "wants to be your friend"),
  friendOk:T("เป็นเพื่อนกันแล้ว", "is now your friend"),
  err:{
    no_room:T("ไม่พบห้องนี้", "Room not found"), room_full:T("ห้องเต็มแล้ว", "The room is full"), in_game:T("ห้องนี้กำลังเล่นอยู่", "That room is already playing"),
    kicked:T("คุณถูกเชิญออกจากห้องนี้", "You were removed from this room"), need_players:T("ต้องมีผู้เล่นอย่างน้อย 2 คน", "You need at least 2 players"),
    not_ready:T("ผู้เล่นยังไม่พร้อมทุกคน", "Not everyone is ready"), host_only:T("เฉพาะหัวหน้าห้องเท่านั้น", "Only the host can do that"),
    not_friend:T("ชวนได้เฉพาะเพื่อน", "You can only invite friends"), offline:T("เพื่อนออฟไลน์อยู่", "Your friend is offline"),
    not_found:T("ไม่พบผู้ใช้นี้", "No such player"), self:T("เพิ่มตัวเองไม่ได้", "That's you!"), already_friends:T("เป็นเพื่อนกันอยู่แล้ว", "Already friends"),
    already_requested:T("ส่งคำขอไปแล้ว", "Request already sent"), not_enough:T("เงินหรือแต้มไม่พอ", "Not enough money or points"), cooldown:T("ยังใช้ไม่ได้ ต้องรอ", "Not yet: cooling down"),
    not_bigger:T("ใช้ได้กับคนที่ปล่อย CO₂ มากกว่าคุณเท่านั้น", "Only on someone emitting more than you"), pending:T("รอคำตอบอยู่", "Waiting for an answer"),
    server_full:T("เซิร์ฟเวอร์เต็ม ลองใหม่ภายหลัง", "The server is full, try later"), slow_down:T("ช้าลงหน่อย", "Slow down a little"), vote_open:T("กำลังโหวตเรื่องอื่นอยู่", "Another vote is open"),
  },
};
const errText = c => (MPT.err[c] ? L(MPT.err[c]) : c);
const say = (title, msg, icon = "users") => { UIM.toastQ.push({id:"mp" + Date.now() + Math.random(), icon, title, msg}); bump(); };

export const Mp = {
  ws:null, status:"off", me:null, want:false, tries:0,
  friends:{friends:[], incoming:[], outgoing:[]}, found:[], rooms:[], room:null, invites:[], bubbles:{}, game:null, msg:"",
  /* ---------------- connection ---------------- */
  canUse(){ return !!(P.Net && P.Net.online && P.Net.user); },
  async connect(){
    this.want = true;
    if (!this.canUse() || (this.ws && this.ws.readyState <= 1)) return;
    this.status = "connecting"; bump();
    try { await P.Net.req("GET", "/me"); } catch(e){}   // refreshes the access token when it has expired
    if (!P.Net.access){ this.status = "off"; bump(); return; }
    const u = new URL(P.Net.base + "/ws", location.href); u.protocol = u.protocol === "https:" ? "wss:" : "ws:"; u.searchParams.set("token", P.Net.access);
    let ws; try { ws = new WebSocket(u.toString()); } catch(e){ this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.tries = 0; this.status = "online"; this.loadFriends(); bump(); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch(x){ return; } try { this.on(m); } catch(x){ console.error("mp", m.t, x); } };
    ws.onclose = () => { if (this.ws === ws) this.ws = null; this.status = "off"; bump(); if (this.want) this.retry(); };
    ws.onerror = () => {};
  },
  retry(){ clearTimeout(this._rt); const d = [1000, 2000, 4000, 8000, 15000][Math.min(4, this.tries++)]; this._rt = setTimeout(() => { if (this.want) this.connect(); }, d); },
  disconnect(){ this.want = false; clearTimeout(this._rt); if (this.ws) this.ws.close(); this.ws = null; this.status = "off"; this.room = null; bump(); },
  send(tp, o = {}){ if (this.ws && this.ws.readyState === 1){ this.ws.send(JSON.stringify({t:tp, ...o})); return true; } return false; },
  /* ---------------- messages from the server ---------------- */
  on(m){
    switch (m.t){
      case "hello": this.me = m.me; break;
      case "lobby.rooms": this.rooms = m.rooms; break;
      case "room":
        this.room = m.room;
        if (UIM.screen === "menu" && UIM.sub !== "room" && m.room.state !== "playing") { UIM.sub = "room"; }
        if (m.room.state === "ended" && this.game) this.game.ended = true;
        break;
      case "room.left": this.room = null; if (UIM.sub === "room") UIM.sub = "mp"; if (m.why === "kicked") this.msg = errText("kicked"); if (S.mp) this.exitGame(); break;
      case "room.chat": case "room.emote": this.bubbles[m.from] = {q:m.q, e:m.e, at:performance.now()}; Audio.play("pop", {vol:.4}); setTimeout(bump, 4100); break;
      case "invite": if (!this.invites.some(i => i.code === m.code)) this.invites.push({...m, at:Date.now()}); Audio.play("jingle", {vol:.7}); break;
      case "invited": this.msg = `${L(MPT.invited)}: ${m.username}`; break;
      case "presence": { const f = this.friends.friends.find(x => x.username === m.username); if (f){ f.online = m.online; f.where = m.where; f.room = m.room; } break; }
      case "friends.changed": this.loadFriends(); break;
      case "friend.request": say(m.username, L(MPT.friendReq), "user-plus"); this.loadFriends(); break;
      case "friend.accepted": say(m.username, L(MPT.friendOk), "user-check"); this.loadFriends(); break;
      case "game.start": this.startGame(m); break;
      case "game.state": this.applyState(m); break;
      case "error": this.msg = errText(m.code); if (m.code === "not_your_role" && m.role) this.msg = `${L(MPT.notRole)} ${L(P.MP.ROLE[m.role].name)}`; if (S.mp) say(L(P.UI.mpTitle), this.msg, "circle-alert"); Audio.play("error"); break;
    }
    bump();
  },
  /* ---------------- friends (REST) ---------------- */
  async loadFriends(){ try { this.friends = await P.Net.req("GET", "/friends"); bump(); } catch(e){} },
  async search(q){ q = String(q || "").trim().toLowerCase(); if (!/^[a-z0-9_]{1,16}$/.test(q)){ this.found = []; bump(); return; } try { this.found = (await P.Net.req("GET", "/users/search?q=" + encodeURIComponent(q))).users; } catch(e){ this.found = []; } bump(); },
  async friendReq(username){ try { this.friends = await P.Net.req("POST", "/friends/request", {username}); this.msg = ""; Audio.play("confirm"); } catch(e){ this.msg = errText(e.error); Audio.play("error"); } bump(); },
  async respond(username, accept){ try { this.friends = await P.Net.req("POST", "/friends/respond", {username, accept}); } catch(e){ this.msg = errText(e.error); } bump(); },
  async unfriend(username){ try { this.friends = await P.Net.req("DELETE", "/friends/" + encodeURIComponent(username)); } catch(e){} bump(); },
  /* ---------------- rooms ---------------- */
  list(){ this.send("lobby.list"); },
  create(o){ this.msg = ""; this.send("room.create", {...o, lang:S.lang}); },
  join(code){ this.msg = ""; this.send("room.join", {code}); this.invites = this.invites.filter(i => i.code !== code); },
  leave(){ this.send("room.leave"); this.room = null; if (UIM.sub === "room") UIM.sub = "mp"; bump(); },
  ready(v){ this.send("room.ready", {ready:v}); },
  pick(o){ this.send("room.pick", o); },
  settings(o){ this.send("room.settings", o); },
  kick(id){ this.send("room.kick", {id}); },
  invite(username){ this.send("room.invite", {username}); },
  chat(q){ this.send("room.chat", {q}); },
  emote(e){ this.send("room.emote", {e}); },
  start(){ this.msg = ""; this.send("room.start"); },
  again(){ this.send("room.again"); },
  isHost(){ return !!(this.room && this.me && this.room.host === this.me.id); },
  myRoles(){ return (this.game && this.game.roles && this.me && this.game.roles[this.me.id]) || []; },
  nameOf(id){ const p = this.room && this.room.players.find(x => x.id === id); return p ? p.displayName : "?"; },

  /* ---------------- the game ---------------- */
  startGame(m){
    this.game = {mode:m.mode, roles:{}, vote:null, ranking:null, ended:false}; this._endShown = false;
    UIM.losses = []; UIM.alerts = []; UIM.train = null;
    const go = () => { UIM.modal = null; UIM.reward = null; S.started = true; S.tab = null; P.Map && P.Map.resetView && P.Map.resetView(); Audio.setMood("calm", true); bump(); };
    if (UIM.screen === "game") go(); else P.Game.enterGame(go);
  },
  applyState(m){
    if (!this.game) this.game = {mode:m.mode, roles:{}};
    const g = this.game;
    Object.assign(g, {mode:m.mode, roles:m.roles || g.roles, vote:m.vote || null, lastVote:m.lastVote || null, feed:m.feed || [], ranking:m.ranking || null, T:m.T, cd:m.cd || {}, offers:m.offers || [], evLeft:m.evLeft, winner:m.winner, over:m.over, progress:m.progress || 0, at:performance.now()});
    // replace the state, keeping what this player is looking at
    const keep = {lang:S.lang, tab:S.tab, sel:S.sel, selC:S.selC, noSel:S.noSel, skillCat:S.skillCat, node:S.node};
    const wasEvent = S.event, wasOver = S.over;
    Object.keys(S).forEach(k => delete S[k]);
    Object.assign(S, m.S, keep, {started:true, mp:{...(m.S.mp || {}), kind:m.mode}});
    if (S.event && S.event !== wasEvent){ UIM.evAt = performance.now(); UIM.evMin = false; Audio.play("question", {delay:.2, vol:.7}); }
    if ((S.over && !wasOver || m.over && !this._endShown) && H.showEnd){ this._endShown = true; H.showEnd(); }
    for (const f of m.fx || []) this.replay(f);
    if (P.Map && P.Map.refresh) P.Map.refresh();
    bump();
  },
  /* sounds, alerts and losses that happened on the server */
  replay([name, ...a]){
    if (name === "showEvent" || name === "showEnd") return;
    if (name === "toast" && a[0] && !a[0].msg) return;   // achievements are not earned in multiplayer
    if (name === "mapFocus") return;
    const f = H[name]; if (f) try { f(...a); } catch(e){}
  },
  /* an action from the interface: check the ministry, apply it here at once, send it to the server */
  act(fn, args, orig){
    const g = this.game;
    if (fn === "chooseOption"){
      if (g && g.mode === "coop"){ this.send("game.vote", {opt:args[0]}); if (g.vote && this.me) g.vote.votes = {...g.vote.votes, [this.me.id]:args[0]}; bump(); return; }
      this.send("game.act", {fn, args:[args[0]]}); return;
    }
    if (fn === "setSpeed"){ if (!this.isHost()){ say(L(P.UI.mpTitle), L(MPT.hostOnly), "lock"); Audio.play("error"); return; } this.send("game.speed", {v:args[0]}); S.speed = args[0]; bump(); return; }
    if (g && g.mode === "coop"){
      const role = P.MP.roleFor(fn, args);
      if (role && role !== "any" && !this.myRoles().includes(role)){
        say(L(P.UI.mpTitle), `${L(MPT.notRole)} ${L(P.MP.ROLE[role].name)}`, P.MP.ROLE[role].icon); Audio.play("error");
        return false;
      }
    }
    // apply here for a quick response (sounds come from the server, so they are muted here)
    const mute = ["sfx", "toast", "loss", "hazardStrike", "hazardWarn", "yearly"], saved = {};
    mute.forEach(k => { saved[k] = H[k]; H[k] = () => {}; });
    let r; try { r = orig(...args); } finally { mute.forEach(k => { H[k] = saved[k]; }); }
    if (r === false) return false;
    const a = fn === "popBubble" ? [args[0]] : args;
    this.send("game.act", {fn, args:a, sel:S.sel, selC:S.selC});
    return r === undefined ? true : r;
  },
  vsAct(fn, target, extra){ this.send("game.act", {fn, args:[target, extra]}); },
  evacAll(reg){ this.send("game.act", {fn:"evacAll", args:[reg]}); },
  voteYes(yes){ this.send("game.vote", {yes}); if (this.game && this.game.vote && this.me) this.game.vote.votes = {...this.game.vote.votes, [this.me.id]:yes}; bump(); },
  /* leave the game (back to the menu) */
  exitGame(){ this.game = null; S.mp = null; S.started = false; S.over = null; UIM.modal = null; if (UIM.screen === "game") P.Game.toMenu(); },
  leaveGame(){ this.leave(); this.exitGame(); },
};
P.Mp = Mp;

/* in a multiplayer game, the interface's calls go through Mp.act */
const PROXY = [...P.MP.ACTS, "chooseOption", "setSpeed"];
for (const fn of PROXY){
  const orig = P[fn]; if (typeof orig !== "function") continue;
  P[fn] = function(...a){ return S.mp ? Mp.act(fn, a, orig) : orig.apply(this, a); };
}

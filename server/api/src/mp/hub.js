/* 2.0 multiplayer hub: one WebSocket per browser tab at /api/ws?token=<access token>
   · presence (online / in a room / playing) for friends
   · rooms: public (listed in the lobby) or private (join with a 6-letter code); host settings, ready, kick, invites
   · quick messages and emotes only (no free text: safe for school)
   · the game itself runs in games.js; a player who drops out can come back to the same room for 2 minutes */
import { WebSocketServer } from "ws";
import { CoopGame, VersusGame } from "./games.js";
import { friendIds } from "./friends.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ROOMS = 200, GRACE_MS = 120000, MSG_RATE = 40;   // per 5 seconds
const MIN_PLAYERS = Math.max(1, Number(process.env.MP_MIN_PLAYERS) || 2);
const MODES = ["coop", "versus"], DIFFS = ["normal", "hard"], CHARS = ["sci", "dip", "eco", "act", "oce", "eng"];
const newCode = rooms => { for (;;){ let c = ""; for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; if (!rooms.has(c)) return c; } };

class Room {
  constructor(hub, host, o){
    this.hub = hub; this.code = newCode(hub.rooms); this.host = host.id;
    this.mode = MODES.includes(o.mode) ? o.mode : "coop";
    this.max = Math.max(2, Math.min(4, Number(o.max) || 4));
    this.public = o.public !== false; this.diff = DIFFS.includes(o.diff) ? o.diff : "normal";
    this.char = CHARS.includes(o.char) ? o.char : "sci"; this.lang = o.lang === "en" ? "en" : "th";
    this.state = "lobby"; this.players = new Map(); this.order = []; this.kicked = new Set(); this.game = null; this.created = Date.now(); this.emptySince = 0;
    this.result = null; this.dbId = null;
  }
  add(u){
    if (!this.players.has(u.id)){ this.players.set(u.id, {id:u.id, username:u.username, displayName:u.displayName, ready:u.id === this.host, roles:[], bloc:null}); this.order.push(u.id); }
  }
  remove(uid){
    this.players.delete(uid); this.order = this.order.filter(x => x !== uid);
    if (this.host === uid && this.order.length) this.host = this.order.find(id => this.isOnline(id)) || this.order[0];
  }
  isOnline(uid){ const c = this.hub.users.get(uid); return !!(c && c.conns.size && c.room === this.code); }
  anyOnline(){ return this.order.some(id => this.isOnline(id)); }
  nameOf(uid){ const p = this.players.get(uid); return p ? p.username : "?"; }
  displayOf(uid){ const p = this.players.get(uid); return p ? p.displayName : "?"; }
  view(){
    return {code:this.code, mode:this.mode, host:this.host, max:this.max, public:this.public, diff:this.diff, char:this.char, state:this.state, result:this.result,
      players:this.order.map(id => { const p = this.players.get(id); return {id, username:p.username, displayName:p.displayName, ready:p.ready, roles:p.roles, bloc:p.bloc, online:this.isOnline(id), host:id === this.host}; })};
  }
  listing(){ const h = this.players.get(this.host); return {code:this.code, mode:this.mode, host:h ? h.displayName : "?", n:this.players.size, max:this.max, diff:this.diff, state:this.state}; }
  send(uid, msg){ if (uid === null){ for (const id of this.order) this.hub.toUser(id, msg, this.code); } else this.hub.toUser(uid, msg, this.code); }
  changed(){ this.send(null, {t:"room", room:this.view()}); this.hub.lobbyChanged(); }
  gameEnded(result){
    this.state = "ended"; this.result = result;
    this.changed();
    this.hub.saveGame(this).catch(e => console.error("mp save", e));
    setTimeout(() => { if (this.game){ this.game.stop(); } }, 1500);
  }
}

export function createHub(app, pool, {readAccess, originAllowed}){
  const wss = new WebSocketServer({noServer:true, maxPayload:16 * 1024, perMessageDeflate:{threshold:2048}});
  const hub = {
    users:new Map(),     // uid → {id, username, displayName, conns:Set, room:code|null, friends:Set|null}
    rooms:new Map(),
    lobbyTimer:null,
    nameOf(uid){ const u = this.users.get(uid); return u ? u.username : null; },
    presenceOf(uid){ const u = this.users.get(uid); if (!u || !u.conns.size) return {online:false, where:null}; const r = u.room && this.rooms.get(u.room); return {online:true, where:r ? (r.state === "playing" ? "playing" : "room") : "online", room:r && r.public && r.state === "lobby" ? r.code : null}; },
    toUser(uid, msg, onlyRoom){
      const u = this.users.get(uid); if (!u) return;
      if (onlyRoom && u.room !== onlyRoom) return;
      const s = JSON.stringify(msg);
      for (const ws of u.conns) if (ws.readyState === 1) ws.send(s);
    },
    notify(uid, msg){ this.toUser(uid, msg); },
    async loadFriends(u){ try { u.friends = new Set(await friendIds(pool, u.id)); } catch { u.friends = new Set(); } },
    /* tell online friends where this player is now */
    presenceChanged(uid){
      const u = this.users.get(uid); if (!u || !u.friends) return;
      const p = {t:"presence", username:u.username, ...this.presenceOf(uid)};
      for (const f of u.friends){ const fu = this.users.get(f); if (fu && fu.conns.size) this.toUser(f, p); }
    },
    async friendsChanged(a, b){
      for (const id of [a, b]){ const u = this.users.get(id); if (u){ await this.loadFriends(u); this.toUser(id, {t:"friends.changed"}); } }
    },
    lobbyChanged(){
      if (this.lobbyTimer) return;
      this.lobbyTimer = setTimeout(() => {
        this.lobbyTimer = null;
        const msg = JSON.stringify({t:"lobby.rooms", rooms:this.publicRooms()});
        for (const u of this.users.values()) if (!u.room && u.lobby) for (const ws of u.conns) if (ws.readyState === 1) ws.send(msg);
      }, 300);
    },
    publicRooms(){ return [...this.rooms.values()].filter(r => r.public && r.state === "lobby" && r.players.size < r.max).slice(0, 50).map(r => r.listing()); },
    async saveGame(room){
      const g = room.game; if (!g) return;
      const players = room.order.map(id => { const p = room.players.get(id); return {id, username:p.username, roles:g.roles ? g.roles[id] : undefined, bloc:room.mode === "versus" ? p.bloc : undefined}; });
      await pool.query("INSERT INTO mp_games(mode, players, ending, tick, finished_at) VALUES ($1, $2, $3, $4, now())",
        [room.mode, JSON.stringify(players), room.mode === "coop" ? (room.result && room.result.ending) : (room.result && room.result.winner ? "win" : "none"), g.S ? g.S.tick : null]);
    },
    leaveRoom(u, why){
      const r = u.room && this.rooms.get(u.room); u.room = null;
      if (!r) return;
      if (r.state === "lobby" || r.state === "ended") r.remove(u.id);
      if (!r.players.size){ this.closeRoom(r); }
      else r.changed();
      this.presenceChanged(u.id);
      if (why) this.toUser(u.id, {t:"room.left", why});
    },
    closeRoom(r){ if (r.game) r.game.stop(); this.rooms.delete(r.code); for (const id of r.order){ const u = this.users.get(id); if (u && u.room === r.code) u.room = null; } this.lobbyChanged(); },
  };

  /* ---------------- messages ---------------- */
  const err = (ws, code, extra = {}) => ws.readyState === 1 && ws.send(JSON.stringify({t:"error", code, ...extra}));
  const room = u => (u.room ? hub.rooms.get(u.room) : null);
  const H = {
    "lobby.list"(u, ws){ u.lobby = true; ws.send(JSON.stringify({t:"lobby.rooms", rooms:hub.publicRooms()})); },
    "lobby.leave"(u){ u.lobby = false; },
    "room.create"(u, ws, m){
      if (hub.rooms.size >= MAX_ROOMS) return err(ws, "server_full");
      if (u.room) hub.leaveRoom(u);
      const r = new Room(hub, u, m); hub.rooms.set(r.code, r); r.add(u); u.room = r.code;
      r.changed(); hub.presenceChanged(u.id);
    },
    "room.join"(u, ws, m){
      const r = hub.rooms.get(String(m.code || "").toUpperCase().trim());
      if (!r) return err(ws, "no_room");
      if (r.players.has(u.id)){ u.room = r.code; r.changed(); if (r.game && r.state === "playing"){ hub.toUser(u.id, {t:"game.start", mode:r.mode, room:r.view()}); r.game.full(u.id); } return; }
      if (r.kicked.has(u.id)) return err(ws, "kicked");
      if (r.state !== "lobby") return err(ws, "in_game");
      if (r.players.size >= r.max) return err(ws, "room_full");
      if (u.room) hub.leaveRoom(u);
      r.add(u); u.room = r.code; r.changed(); hub.presenceChanged(u.id);
    },
    "room.leave"(u){ hub.leaveRoom(u); },
    "room.ready"(u, ws, m){ const r = room(u); if (!r || r.state !== "lobby") return; r.players.get(u.id).ready = !!m.ready; r.changed(); },
    "room.settings"(u, ws, m){
      const r = room(u); if (!r || r.host !== u.id || r.state !== "lobby") return err(ws, "host_only");
      if (MODES.includes(m.mode)) r.mode = m.mode;
      if (m.max) r.max = Math.max(Math.max(2, r.players.size), Math.min(4, Number(m.max) || 4));
      if (typeof m.public === "boolean") r.public = m.public;
      if (DIFFS.includes(m.diff)) r.diff = m.diff;
      if (CHARS.includes(m.char)) r.char = m.char;
      for (const p of r.players.values()) if (p.id !== r.host) p.ready = false;   // the rules changed: everyone confirms again
      r.changed();
    },
    "room.kick"(u, ws, m){
      const r = room(u); if (!r || r.host !== u.id) return err(ws, "host_only");
      const id = Number(m.id); if (id === u.id || !r.players.has(id)) return;
      r.kicked.add(id); r.remove(id); const k = hub.users.get(id); if (k && k.room === r.code){ k.room = null; hub.toUser(id, {t:"room.left", why:"kicked"}); hub.presenceChanged(id); }
      r.changed();
    },
    "room.invite"(u, ws, m){
      const r = room(u); if (!r) return err(ws, "no_room");
      const f = [...hub.users.values()].find(x => x.username === String(m.username || "").toLowerCase());
      if (!f || !u.friends || !u.friends.has(f.id)) return err(ws, "not_friend");
      if (!f.conns.size) return err(ws, "offline");
      hub.toUser(f.id, {t:"invite", from:u.username, fromName:u.displayName, code:r.code, mode:r.mode});
      ws.send(JSON.stringify({t:"invited", username:f.username}));
    },
    "room.chat"(u, ws, m){ const r = room(u); if (!r) return; const q = Number(m.q); if (!Number.isInteger(q) || q < 0 || q > 11) return; r.send(null, {t:"room.chat", from:u.id, q}); },
    "room.emote"(u, ws, m){ const r = room(u); if (!r) return; const e = Number(m.e); if (!Number.isInteger(e) || e < 0 || e > 7) return; r.send(null, {t:"room.emote", from:u.id, e}); },
    "room.start"(u, ws){
      const r = room(u); if (!r || r.host !== u.id) return err(ws, "host_only");
      if (r.state === "playing") return;
      const ids = r.order.filter(id => r.isOnline(id));
      if (ids.length < MIN_PLAYERS) return err(ws, "need_players");
      if (r.order.some(id => r.isOnline(id) && !r.players.get(id).ready && id !== r.host)) return err(ws, "not_ready");
      for (const id of [...r.order]) if (!r.isOnline(id)) r.remove(id);
      for (const p of r.players.values()){ p.roles = []; p.bloc = null; }   // chosen in the game now (games.js · pick)
      try { r.game = r.mode === "versus" ? new VersusGame(r, (to, msg) => r.send(to, msg)) : new CoopGame(r, (to, msg) => r.send(to, msg)); }
      catch (e){ console.error("mp start", e); return err(ws, "start_failed"); }
      r.state = "playing"; r.result = null;
      r.send(null, {t:"game.start", mode:r.mode, room:r.view()});
      r.game.start(); r.changed();
      for (const id of r.order) hub.presenceChanged(id);
    },
    "room.again"(u, ws){   // back to the room after a game
      const r = room(u); if (!r || r.host !== u.id || r.state !== "ended") return;
      if (r.game) r.game.stop(); r.game = null; r.state = "lobby"; r.result = null;
      for (const p of r.players.values()) p.ready = p.id === r.host;
      for (const id of [...r.order]) if (!r.isOnline(id)) r.remove(id);
      r.changed();
    },
    "game.act"(u, ws, m){ const r = room(u); if (!r || !r.game || r.state !== "playing") return err(ws, "no_game"); const res = r.game.act(u.id, m); if (res && res.error) err(ws, res.error, {role:res.role, fn:m.fn}); },
    "game.pick"(u, ws, m){ const r = room(u); if (!r || !r.game || r.state !== "playing") return; const res = r.game.pick(u.id, m); if (res && res.error) err(ws, res.error); },
    "game.vote"(u, ws, m){ const r = room(u); if (!r || !r.game || !r.game.castVote) return; const res = r.game.castVote(u.id, m); if (res && res.error) err(ws, res.error); },
    "game.speed"(u, ws, m){ const r = room(u); if (!r || !r.game) return; const res = r.game.setSpeed(u.id, Number(m.v)); if (res && res.error) err(ws, res.error); },
    ping(u, ws){ ws.send('{"t":"pong"}'); },
  };

  /* ---------------- connections ---------------- */
  async function onConn(ws, uid){
    const row = (await pool.query("SELECT id, username, display_name, banned FROM users WHERE id = $1", [uid])).rows[0];
    if (!row || row.banned){ ws.close(4003, "forbidden"); return; }
    let u = hub.users.get(uid);
    if (!u){ u = {id:uid, username:row.username, displayName:row.display_name, conns:new Set(), room:null, friends:null, lobby:false}; hub.users.set(uid, u); }
    u.displayName = row.display_name;
    u.conns.add(ws); ws.isAlive = true; ws.rate = {n:0, t:Date.now()};
    if (!u.friends) await hub.loadFriends(u);
    ws.send(JSON.stringify({t:"hello", me:{id:u.id, username:u.username, displayName:u.displayName}}));
    // back in a room you were in (a dropped connection or a reload)
    const r = room(u) || [...hub.rooms.values()].find(x => x.players.has(uid) && x.state === "playing");
    if (r){ u.room = r.code; r.changed(); if (r.game && r.state === "playing"){ hub.toUser(uid, {t:"game.start", mode:r.mode, room:r.view(), rejoin:true}); r.game.full(uid); } }
    hub.presenceChanged(uid);
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("message", data => {
      const now = Date.now(); if (now - ws.rate.t > 5000){ ws.rate = {n:0, t:now}; } if (++ws.rate.n > MSG_RATE) return err(ws, "slow_down");
      let m; try { m = JSON.parse(String(data)); } catch { return; }
      const f = m && H[m.t]; if (!f) return;
      try { f(u, ws, m); } catch (e){ console.error("mp message", m.t, e); err(ws, "server"); }
    });
    ws.on("close", () => {
      u.conns.delete(ws);
      if (u.conns.size) return;
      const r = room(u);
      if (r){
        if (r.host === uid){ const nh = r.order.find(id => id !== uid && r.isOnline(id)); if (nh) r.host = nh; }   // the host left: the next player takes over
        if (r.state === "lobby"){ setTimeout(() => { if (!u.conns.size && u.room === r.code) hub.leaveRoom(u); }, 15000); }
        r.changed();
      }
      hub.presenceChanged(uid);
    });
  }
  app.server.on("upgrade", async (req, socket, head) => {
    let url; try { url = new URL(req.url, "http://x"); } catch { socket.destroy(); return; }
    if (url.pathname !== "/api/ws"){ return; }   // not ours
    if (req.headers.origin && originAllowed && !originAllowed(req.headers.origin)){ socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return; }
    let uid; try { uid = await readAccess(url.searchParams.get("token") || ""); } catch { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => { onConn(ws, Number(uid)).catch(e => { console.error("mp conn", e); try { ws.close(1011); } catch {} }); });
  });
  /* keep-alive and clean-up */
  const sweep = setInterval(() => {
    for (const ws of wss.clients){ if (!ws.isAlive){ ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} }
    const now = Date.now();
    for (const r of hub.rooms.values()){
      if (r.anyOnline()){ r.emptySince = 0; continue; }
      if (!r.emptySince) r.emptySince = now;
      else if (now - r.emptySince > GRACE_MS) hub.closeRoom(r);
    }
    for (const [id, u] of hub.users) if (!u.conns.size && !u.room) hub.users.delete(id);
  }, 25000);
  app.addHook("onClose", async () => { clearInterval(sweep); for (const r of hub.rooms.values()) if (r.game) r.game.stop(); for (const ws of wss.clients) ws.terminate(); wss.close(); });
  return hub;
}

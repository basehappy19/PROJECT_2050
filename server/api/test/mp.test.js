// 2.0 friends + multiplayer, against a real PostgreSQL and a real WebSocket: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2050mp-"));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050_test";
process.env.CERT_CONFIG = path.join(dir, "nope.json");
const { makePool, migrate } = await import("../src/db.js");
const { buildApp } = await import("../src/app.js");
let app, pool, base;
const users = {};

before(async () => {
  pool = makePool(process.env.DATABASE_URL);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool, {info(){}});
  app = buildApp(pool, {logger:false});
  await app.listen({port:0, host:"127.0.0.1"});
  base = `127.0.0.1:${app.server.address().port}`;
});
after(async () => { for (const u of Object.values(users)) if (u.ws) u.ws.close(); await app.close(); await pool.end(); fs.rmSync(dir, {recursive:true, force:true}); });

const call = async (method, url, body, token) => {
  const r = await app.inject({method, url, payload:body, headers:token ? {authorization:"Bearer " + token} : {}});
  let j = null; try { j = r.json(); } catch {}
  return {status:r.statusCode, body:j};
};
/* a WebSocket client that remembers every message and can wait for one */
function client(token){
  const ws = new WebSocket(`ws://${base}/api/ws?token=${token}`);
  const c = {ws, msgs:[], waiters:[]};
  ws.on("message", d => { const m = JSON.parse(String(d)); c.msgs.push(m); c.waiters = c.waiters.filter(w => { if (w.f(m)){ w.res(m); return false; } return true; }); });
  c.send = (t, o = {}) => ws.send(JSON.stringify({t, ...o}));
  c.wait = (f, ms = 6000) => new Promise((res, rej) => { const old = c.msgs.find(f); if (old){ c.msgs = c.msgs.filter(x => x !== old); return res(old); } const w = {f, res}; c.waiters.push(w); setTimeout(() => rej(new Error("timeout waiting for " + f.toString().slice(0, 120) + " · last: " + JSON.stringify(c.msgs.slice(-3).map(m => m.t === "error" ? m : m.t)))), ms); });
  c.err = code => c.wait(m => m.t === "error" && m.code === code);
  c.open = new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  return c;
}
async function makeUser(name){
  const r = await call("POST", "/api/auth/register", {username:name, email:`${name}@school.ac.th`, password:"secret123", displayName:name.toUpperCase()});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  users[name] = {tok:r.body.access};
  return users[name];
}

test("friends: search, request, accept, list, remove", async () => {
  const a = await makeUser("alice"), b = await makeUser("bob"), c = await makeUser("carol");
  let r = await call("GET", "/api/users/search?q=bo", null, a.tok); assert.deepEqual(r.body.users.map(u => u.username), ["bob"]);
  r = await call("POST", "/api/friends/request", {username:"bob"}, a.tok); assert.equal(r.status, 200); assert.deepEqual(r.body.outgoing.map(u => u.username), ["bob"]);
  r = await call("POST", "/api/friends/request", {username:"bob"}, a.tok); assert.equal(r.body.error, "already_requested");
  r = await call("POST", "/api/friends/request", {username:"alice"}, a.tok); assert.equal(r.body.error, "self");
  r = await call("POST", "/api/friends/request", {username:"nobody"}, a.tok); assert.equal(r.status, 404);
  r = await call("GET", "/api/friends", null, b.tok); assert.deepEqual(r.body.incoming.map(u => u.username), ["alice"]);
  r = await call("POST", "/api/friends/respond", {username:"alice", accept:true}, b.tok); assert.equal(r.status, 200); assert.deepEqual(r.body.friends.map(u => u.username), ["alice"]);
  r = await call("GET", "/api/friends", null, a.tok); assert.deepEqual(r.body.friends.map(u => u.username), ["bob"]); assert.equal(r.body.friends[0].online, false);
  // a request back to someone who already asked you is a yes
  await call("POST", "/api/friends/request", {username:"carol"}, b.tok);
  r = await call("POST", "/api/friends/request", {username:"bob"}, c.tok); assert.equal(r.body.accepted, true);
  r = await call("DELETE", "/api/friends/carol", null, b.tok); assert.deepEqual(r.body.friends.map(u => u.username), ["alice"]);
  r = await call("GET", "/api/friends", null); assert.equal(r.status, 401);
});

test("websocket: a bad token is refused", async () => {
  const c = client("garbage");
  await assert.rejects(c.open);
});

test("co-op: room, ready, start, ministries, host speed, a vote", async t => {
  const A = client(users.alice.tok), B = client(users.bob.tok);
  t.after(() => { A.ws.close(); B.ws.close(); });
  await A.open; await B.open;
  await A.wait(m => m.t === "hello"); await B.wait(m => m.t === "hello");
  // presence: bob sees alice online
  A.send("room.create", {mode:"coop", max:2, public:false, diff:"normal"});
  const room = (await A.wait(m => m.t === "room")).room;
  assert.equal(room.mode, "coop"); assert.equal(room.code.length, 6); assert.equal(room.public, false);
  A.send("room.invite", {username:"bob"});
  const inv = await B.wait(m => m.t === "invite"); assert.equal(inv.code, room.code);
  B.send("room.join", {code:room.code});
  await A.wait(m => m.t === "room" && m.room.players.length === 2);
  A.send("room.start"); await A.err("not_ready");
  B.send("room.ready", {ready:true});
  await A.wait(m => m.t === "room" && m.room.players.every(p => p.ready));
  A.send("room.start");
  await A.wait(m => m.t === "game.start"); await B.wait(m => m.t === "game.start");
  // ministries are picked in the game, before the clock starts
  const p0 = await B.wait(m => m.t === "game.state" && m.phase === "pick"); assert.ok(p0.left > 0);
  B.send("game.act", {fn:"buyNode", args:["D1"]}); await B.err("picking");
  B.send("game.pick", {roles:["diplo", "people"]});
  await A.wait(m => m.t === "game.state" && m.picks && Object.values(m.picks).some(p => p.roles.includes("diplo")));
  A.send("game.pick", {roles:["diplo"]});   // taken by bob: refused quietly
  A.send("game.pick", {ready:true}); B.send("game.pick", {ready:true});
  const st = await B.wait(m => m.t === "game.state" && m.phase === "play");
  assert.deepEqual(st.roles[Object.keys(st.roles).find(k => st.roles[k].includes("diplo"))].sort(), ["diplo", "people"]);
  // bob can't approve an energy skill (energy belongs to alice)
  B.send("game.act", {fn:"buyNode", args:["E1"]});
  const e = await B.err("not_your_role"); assert.equal(e.role, "energy");
  // alice can (with enough money)
  const r0 = app.hub.rooms.get(room.code); r0.game.S.ep = 999; r0.game.S.pc = 99;
  A.send("game.act", {fn:"buyNode", args:["E1"]});
  await A.wait(m => m.t === "game.state" && m.S.owned && m.S.owned.E1);
  // only the host changes the speed
  B.send("game.speed", {v:2}); await B.err("host_only");
  A.send("game.speed", {v:0});
  await A.wait(m => m.t === "game.state" && m.S.speed === 0);
  // an event goes to a vote; both vote, the majority wins
  const r = app.hub.rooms.get(room.code), g = r.game;
  g.S.event = "EVT_48"; g.S.cev = null; g.after();
  const v = await B.wait(m => m.t === "game.state" && m.vote && m.vote.kind === "event");
  assert.ok(v.vote.left > 0);
  A.send("game.vote", {opt:1}); B.send("game.vote", {opt:1});
  const done = await A.wait(m => m.t === "game.state" && !m.S.event && m.lastVote);
  assert.equal(done.lastVote.pick, 1);
  // a not-allowed engine call is refused
  A.send("game.act", {fn:"startGame", args:["th"]}); await A.err("bad_action");
  A.ws.close(); B.ws.close();
});

test("versus: one world each, one shared temperature, aid between players", async t => {
  const A = client(users.alice.tok), B = client(users.bob.tok);
  t.after(() => { A.ws.close(); B.ws.close(); });
  await A.open; await B.open; await A.wait(m => m.t === "hello"); await B.wait(m => m.t === "hello");
  A.send("room.create", {mode:"versus", max:2, public:true});
  const room = (await A.wait(m => m.t === "room" && m.room.mode === "versus")).room;
  B.send("lobby.list"); const lst = await B.wait(m => m.t === "lobby.rooms"); assert.ok(lst.rooms.some(x => x.code === room.code));
  B.send("room.join", {code:room.code}); await A.wait(m => m.t === "room" && m.room.code === room.code && m.room.players.length === 2);
  B.send("room.ready", {ready:true});
  await A.wait(m => m.t === "room" && m.room.code === room.code && m.room.players.every(p => p.ready));
  A.send("room.start");
  await B.wait(m => m.t === "game.state" && m.mode === "versus" && m.phase === "pick");
  B.send("game.pick", {bloc:"EU"});
  await A.wait(m => m.t === "game.state" && m.picks && Object.values(m.picks).some(p => p.bloc === "EU"));
  A.send("game.pick", {bloc:"EU"});   // alice is too late for EU
  B.send("game.pick", {ready:true}); A.send("game.pick", {ready:true});
  const sa = await A.wait(m => m.t === "game.state" && m.mode === "versus" && m.phase === "play"), sb = await B.wait(m => m.t === "game.state" && m.mode === "versus" && m.phase === "play");
  assert.equal(Object.values(sa.picks).filter(p => p.bloc === "EU").length, 1);
  assert.equal(sa.mode, "versus"); assert.equal(sa.ranking.length, 2);
  const g = app.hub.rooms.get(room.code).game;
  for (let i = 0; i < 5; i++){ for (const w of g.worlds()) if (w.S.event) w.P.chooseOption(0); g.tickAll(); }
  const temps = g.worlds().map(w => w.S.temp); assert.equal(temps[0], temps[1]); assert.ok(temps[0] > 1.2);
  const a = [...g.w.values()].find(w => w.bloc !== "EU"), b = [...g.w.values()].find(w => w.bloc === "EU");
  a.S.ep = 100; const before = b.S.ep;
  A.send("game.act", {fn:"vsAid", args:[b.uid]});
  await B.wait(m => m.t === "game.state" && m.mode === "versus" && m.S.ep >= before + 30);
  A.send("game.act", {fn:"vsAid", args:[b.uid]}); await A.err("cooldown");
  A.ws.close(); B.ws.close();
});

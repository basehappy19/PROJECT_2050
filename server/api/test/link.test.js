// Sign in from an app through the website (/api/auth/link/*). Runs without a database: a small fake pool answers
// the few queries these routes make. The full flow against PostgreSQL is also in api.test.js.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
const { buildApp } = await import("../src/app.js");
const { accessToken } = await import("../src/auth.js");

const users = {7:{id:7, username:"kru", email:"kru@school.th", display_name:"ครู", renamed:false, role:"player", flags:null, banned:false}};
function answer(sql, params = []){
  if (/FROM game_config/.test(sql)) return [];
  if (/SELECT banned FROM users/.test(sql)) return users[params[0]] ? [{banned:users[params[0]].banned}] : [];
  if (/FROM users WHERE id/.test(sql)) return users[params[0]] ? [users[params[0]]] : [];
  if (/FROM game_results/.test(sql)) return [{normal:false, hard:false}];
  if (/wallet_ledger/.test(sql)) return [{b:0}];
  return [];
}
const pool = {
  query:async (sql, params) => ({rows:answer(sql, params)}),
  connect:async () => ({query:async (sql, params) => ({rows:answer(sql, params)}), release(){}}),
};
let app;
before(async () => { app = buildApp(pool, {logger:false}); await app.ready(); });
after(async () => { await app.close(); });
const call = async (url, body, token) => {
  const r = await app.inject({method:"POST", url, payload:body, headers:token ? {authorization:"Bearer " + token} : {}});
  return {status:r.statusCode, body:r.json()};
};

test("game gets a session after the player confirms the code on the website", async () => {
  const s = await call("/api/auth/link/start", {});
  assert.equal(s.status, 200); assert.match(s.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/); assert.ok(s.body.device.length >= 40);
  let p = await call("/api/auth/link/poll", {device:s.body.device});
  assert.deepEqual(p.body, {pending:true});
  // confirming needs a signed-in player
  assert.equal((await call("/api/auth/link/confirm", {code:s.body.code})).status, 401);
  const tok = await accessToken(7);
  const c = await call("/api/auth/link/confirm", {code:s.body.code.toLowerCase().replace("-", " ")}, tok);   // typed loosely still matches
  assert.equal(c.status, 200, JSON.stringify(c.body));
  p = await call("/api/auth/link/poll", {device:s.body.device});
  assert.equal(p.status, 200, JSON.stringify(p.body)); assert.ok(p.body.access && p.body.refresh); assert.equal(p.body.user.username, "kru");
  // one use only
  assert.equal((await call("/api/auth/link/poll", {device:s.body.device})).status, 404);
  assert.equal((await call("/api/auth/link/confirm", {code:s.body.code}, tok)).status, 404);
});
test("wrong code or device id gets nothing", async () => {
  const tok = await accessToken(7);
  assert.equal((await call("/api/auth/link/confirm", {code:"AAAA-AAAA"}, tok)).status, 404);
  assert.equal((await call("/api/auth/link/poll", {device:"not-a-device"})).status, 404);
  const s = await call("/api/auth/link/start", {});
  assert.equal((await call("/api/auth/link/poll", {device:s.body.code})).status, 404);   // the short code is not the device id
});
test("a code confirmed by one player can't be taken over by another", async () => {
  users[8] = {...users[7], id:8, username:"other"};
  const s = await call("/api/auth/link/start", {});
  assert.equal((await call("/api/auth/link/confirm", {code:s.body.code}, await accessToken(7))).status, 200);
  assert.equal((await call("/api/auth/link/confirm", {code:s.body.code}, await accessToken(8))).status, 409);
  const p = await call("/api/auth/link/poll", {device:s.body.device});
  assert.equal(p.body.user.username, "kru");
});

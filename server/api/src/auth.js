import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";

const key = new TextEncoder().encode(config.jwtSecret);
export const ACCESS_TTL = "15m";
export const REFRESH_DAYS = 365;   // stay signed in for a year (renewed every time the game refreshes), until the player signs out

export const hashPassword = pw => hash(pw, {memoryCost:19456, timeCost:2, parallelism:1});
export const checkPassword = (h, pw) => (h ? verify(h, pw).catch(() => false) : Promise.resolve(false));

export async function accessToken(userId){
  return new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject(String(userId)).setIssuedAt().setExpirationTime(ACCESS_TTL).setAudience("p2050").sign(key);
}
export async function readAccess(token){
  const {payload} = await jwtVerify(token, key, {audience:"p2050"});
  return Number(payload.sub);
}
/* short-lived ticket used between "signed in with Google" and "picked a username" */
export async function googleTicket(g){
  return new SignJWT({email:g.email || null, name:g.name || null}).setProtectedHeader({alg:"HS256"}).setSubject(g.sub).setIssuedAt().setExpirationTime("15m").setAudience("p2050-google").sign(key);
}
export async function readGoogleTicket(t){ const {payload} = await jwtVerify(t, key, {audience:"p2050-google"}); return {sub:payload.sub, email:payload.email, name:payload.name}; }

const sha = s => crypto.createHash("sha256").update(s).digest("hex");
export async function issueRefresh(db, userId){
  const token = crypto.randomBytes(36).toString("base64url");
  await db.query("INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)", [userId, sha(token), String(REFRESH_DAYS)]);
  return token;
}
/* refresh tokens rotate: using one issues a new pair, and the old one stays valid for one more minute only
   (so two tabs, or the game and the admin page, refreshing at the same moment don't sign the player out) */
export async function useRefresh(db, token){
  await db.query("DELETE FROM refresh_tokens WHERE expires_at < now()");
  const r = await db.query("UPDATE refresh_tokens SET expires_at = LEAST(expires_at, now() + interval '1 minute') WHERE token_hash = $1 AND expires_at > now() RETURNING user_id", [sha(String(token || ""))]);
  return r.rows[0] ? r.rows[0].user_id : null;
}
export async function revokeRefresh(db, token){ await db.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [sha(String(token || ""))]); }

/* Google ID token check (only when a Google client id is set on the admin page) */
const gclients = new Map();
export async function verifyGoogle(idToken, clientId){
  if (!clientId) return null;
  if (!gclients.has(clientId)){ const {OAuth2Client} = await import("google-auth-library"); gclients.set(clientId, new OAuth2Client(clientId)); }
  const ticket = await gclients.get(clientId).verifyIdToken({idToken, audience:clientId});
  const p = ticket.getPayload();
  if (!p || !p.sub) return null;
  return {sub:p.sub, email:p.email_verified ? (p.email || "").toLowerCase() : null, name:p.name || null};
}
export const newCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.randomBytes(8);
  const s = Array.from(b, x => A[x % A.length]).join("");
  return `P2050-${s.slice(0, 4)}-${s.slice(4)}`;
};

import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";

const key = new TextEncoder().encode(config.jwtSecret);
export const ACCESS_TTL = "15m";
export const REFRESH_DAYS = 60;

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
/* refresh tokens are single-use: the old one is deleted when a new pair is issued */
export async function useRefresh(db, token){
  const r = await db.query("DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING user_id, expires_at", [sha(String(token || ""))]);
  const row = r.rows[0];
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return row.user_id;
}
export async function revokeRefresh(db, token){ await db.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [sha(String(token || ""))]); }

/* Google ID token check (only when GOOGLE_CLIENT_ID is set) */
let gclient = null;
export async function verifyGoogle(idToken){
  if (!config.googleClientId) return null;
  if (!gclient){ const {OAuth2Client} = await import("google-auth-library"); gclient = new OAuth2Client(config.googleClientId); }
  const ticket = await gclient.verifyIdToken({idToken, audience:config.googleClientId});
  const p = ticket.getPayload();
  if (!p || !p.sub) return null;
  return {sub:p.sub, email:p.email_verified ? (p.email || "").toLowerCase() : null, name:p.name || null};
}
export const newCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.randomBytes(8);
  const s = Array.from(b, x => A[x % A.length]).join("");
  return `P2050-${s.slice(0, 4)}-${s.slice(4)}`;
};

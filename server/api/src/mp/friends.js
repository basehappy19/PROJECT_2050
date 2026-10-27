/* 2.0 friends: search by username, requests, accept / decline, remove. Online status comes from the hub (hub.js). */
const NAME = /^[a-z0-9_]{1,16}$/;
const MAX_FRIENDS = 100;

export async function friendIds(db, uid){
  return (await db.query("SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'", [uid])).rows.map(r => r.friend_id);
}
export async function listFriends(db, uid, hub){
  const rows = (await db.query(`SELECT u.id, u.username, u.display_name, f.status, 'out' AS dir, f.created_at FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1
    UNION ALL SELECT u.id, u.username, u.display_name, f.status, 'in' AS dir, f.created_at FROM friendships f JOIN users u ON u.id = f.user_id WHERE f.friend_id = $1 AND f.status = 'pending'
    ORDER BY created_at`, [uid])).rows;
  const one = r => ({username:r.username, displayName:r.display_name});
  return {
    friends:rows.filter(r => r.dir === "out" && r.status === "accepted").map(r => ({...one(r), ...(hub ? hub.presenceOf(r.id) : {online:false, where:null})}))
      .sort((a, b) => (b.online - a.online) || a.username.localeCompare(b.username)),
    incoming:rows.filter(r => r.dir === "in").map(one),
    outgoing:rows.filter(r => r.dir === "out" && r.status === "pending").map(one),
  };
}

export function registerFriends(app, pool, hub, {tx, fail}){
  const AUTH = {config:{auth:true}};
  const byName = async (db, name) => (await db.query("SELECT id, username, display_name, banned FROM users WHERE username = $1", [name])).rows[0];
  const cleanName = v => String(v || "").trim().toLowerCase();

  app.get("/api/friends", AUTH, async req => listFriends(pool, req.uid, hub));

  app.get("/api/users/search", AUTH, async (req, reply) => {
    const q = cleanName(req.query.q);
    if (!NAME.test(q)) return {users:[]};
    const rows = (await pool.query("SELECT username, display_name FROM users WHERE username LIKE $1 AND id <> $2 AND NOT banned ORDER BY length(username), username LIMIT 8", [q.replace(/_/g, "\\_") + "%", req.uid])).rows;
    return {users:rows.map(r => ({username:r.username, displayName:r.display_name}))};
  });

  app.post("/api/friends/request", {config:{auth:true, rateLimit:{max:20, timeWindow:"1 minute"}}}, async (req, reply) => {
    const name = cleanName((req.body || {}).username);
    if (!NAME.test(name)) return fail(reply, 400, "bad_username");
    const r = await tx(pool, async db => {
      const u = await byName(db, name);
      if (!u || u.banned) return {err:[404, "not_found"]};
      if (u.id === req.uid) return {err:[400, "self"]};
      const mine = (await db.query("SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2", [req.uid, u.id])).rows[0];
      if (mine && mine.status === "accepted") return {err:[409, "already_friends"]};
      if (mine) return {err:[409, "already_requested"]};
      const n = (await db.query("SELECT COUNT(*)::int AS n FROM friendships WHERE user_id = $1", [req.uid])).rows[0].n;
      if (n >= MAX_FRIENDS) return {err:[400, "too_many"]};
      const theirs = (await db.query("SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2 FOR UPDATE", [u.id, req.uid])).rows[0];
      if (theirs){   // they already asked me: this is a yes
        await db.query("UPDATE friendships SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2", [u.id, req.uid]);
        await db.query("INSERT INTO friendships(user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'", [req.uid, u.id]);
        return {accepted:true, other:u};
      }
      await db.query("INSERT INTO friendships(user_id, friend_id, status) VALUES ($1, $2, 'pending')", [req.uid, u.id]);
      return {requested:true, other:u};
    });
    if (r.err) return fail(reply, r.err[0], r.err[1]);
    if (hub){
      if (r.accepted){ hub.friendsChanged(req.uid, r.other.id); hub.notify(r.other.id, {t:"friend.accepted", username:hub.nameOf(req.uid)}); }
      else hub.notify(r.other.id, {t:"friend.request", username:hub.nameOf(req.uid)});
    }
    return {ok:true, accepted:!!r.accepted, ...(await listFriends(pool, req.uid, hub))};
  });

  app.post("/api/friends/respond", AUTH, async (req, reply) => {
    const name = cleanName((req.body || {}).username), accept = !!(req.body || {}).accept;
    if (!NAME.test(name)) return fail(reply, 400, "bad_username");
    const r = await tx(pool, async db => {
      const u = await byName(db, name); if (!u) return {err:[404, "not_found"]};
      const row = (await db.query("SELECT status FROM friendships WHERE user_id = $1 AND friend_id = $2 FOR UPDATE", [u.id, req.uid])).rows[0];
      if (!row || row.status !== "pending") return {err:[404, "no_request"]};
      if (accept){
        await db.query("UPDATE friendships SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2", [u.id, req.uid]);
        await db.query("INSERT INTO friendships(user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'", [req.uid, u.id]);
      } else await db.query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [u.id, req.uid]);
      return {other:u};
    });
    if (r.err) return fail(reply, r.err[0], r.err[1]);
    if (hub && accept){ hub.friendsChanged(req.uid, r.other.id); hub.notify(r.other.id, {t:"friend.accepted", username:hub.nameOf(req.uid)}); }
    return {ok:true, ...(await listFriends(pool, req.uid, hub))};
  });

  app.delete("/api/friends/:username", AUTH, async (req, reply) => {
    const name = cleanName(req.params.username);
    if (!NAME.test(name)) return fail(reply, 400, "bad_username");
    const u = await byName(pool, name); if (!u) return fail(reply, 404, "not_found");
    await pool.query("DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)", [req.uid, u.id]);
    if (hub) hub.friendsChanged(req.uid, u.id);
    return {ok:true, ...(await listFriends(pool, req.uid, hub))};
  });
}

const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.net) return;
(P.mods = P.mods || {}).net = 1;
/* =========================================================================
   Net · talks to the game server (server/ folder: Node.js API + PostgreSQL in Docker)
   Accounts (username/email + password, or Google), Terra, shop, leaderboard, cloud saves, certificates.
   The game still works fully offline / as a guest: then only the starter character, no Terra or ranking.
   Server address: window.P2050_API, or localStorage "p2050-api", else "/api" on the same site
   (and http://localhost:8080/api when the game runs from GDevelop's preview).
   ========================================================================= */
const {S, t, L} = P;
const H = P.H = P.H || {};
const OWNER = "p2050-saves-owner", GUEST = "p2050-saves-guest";   // who the slots on this device belong to · the guest set put aside while signed in
const ls = {get:k => { try { return localStorage.getItem(k); } catch(e) { return null; } }, set:(k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e) {} }};
const dirty = () => P.Kit && P.Kit.dirty();
const msg = (m, err) => { if (P.UIM){ P.UIM.msg = m; P.UIM.err = !!err; } dirty(); };
const errText = e => { const c = e && e.error; const key = "err_" + c; return (P.UI[key] ? t(key) : (e && e.message) || t("err_generic")); };

function candidates(){
  const out = [];
  if (window.P2050_API) out.push(window.P2050_API);
  const saved = ls.get("p2050-api"); if (saved) out.push(saved);
  const app = window.P2050_APP || location.host === "appassets.androidplatform.net";   // Android app: files come from the APK, so only the real server
  if (/^https?:$/.test(location.protocol) && !app) out.push("/api");
  if (!app) out.push("http://localhost:8080/api");
  return [...new Set(out)];
}
/* same merge as server/api/src/progress.js: lists joined, counters keep the larger value, achievements keep the first time */
function mergeInto(d, o){
  for (const k of ["seen", "haz", "charsDone"]) if (Array.isArray(o[k])){ const cur = d[k] = d[k] || []; for (const x of o[k]) if (!cur.includes(x)) cur.push(x); }
  for (const k of ["greens", "aids", "evac", "cev", "daily"]) if (o[k] !== undefined) d[k] = Math.max(d[k] || 0, o[k] || 0);
  for (const k of ["got", "ends"]) if (o[k]){ const m = d[k] = d[k] || {}; for (const [id, v] of Object.entries(o[k])) m[id] = m[id] ? (k === "got" ? Math.min(m[id], v) : Math.max(m[id], v)) : v; }
}
const Net = {
  base:null, online:false, checking:false, cfg:null, user:null, owned:new Set(), chars:{}, busy:false, cloud:null,
  board:null, boardMode:"normal", boardPeriod:"week", certs:null, pendingGoogle:null,
  get access(){ return ls.get("p2050-at"); }, get refreshTok(){ return ls.get("p2050-rt"); },
  setTokens(a, r){ ls.set("p2050-at", a); ls.set("p2050-rt", r); },
  async req(method, path, body, auth = true, retry = true){
    if (!this.base) throw {error:"offline"};
    const h = {"Content-Type":"application/json"};
    if (auth && this.access) h.Authorization = "Bearer " + this.access;
    let r;
    try { r = await fetch(this.base + path, {method, headers:h, body:body ? JSON.stringify(body) : undefined}); }
    catch(e){ throw {error:"offline"}; }
    if (r.status === 401 && auth && retry && this.refreshTok){ if (await this.doRefresh()) return this.req(method, path, body, auth, false); }
    let j = null; try { j = await r.json(); } catch(e) {}
    if (!r.ok) throw (j || {error:"http" + r.status});
    return j;
  },
  /* one refresh at a time (several requests can hit 401 together); only a refused token signs the player out, never a network or server hiccup */
  doRefresh(){
    if (this._refreshing) return this._refreshing;
    this._refreshing = (async () => {
      try { const j = await this.req("POST", "/auth/refresh", {refresh:this.refreshTok}, false); this.setTokens(j.access, j.refresh); return true; }
      catch(e){ if (e.error === "unauthorized"){ this.setTokens(null, null); this.user = null; } return false; }
      finally { setTimeout(() => { this._refreshing = null; }, 0); }
    })();
    return this._refreshing;
  },
  /* find the server and load config + the signed-in player */
  async init(){
    if (this._init) return this._init;
    this._init = (async () => {
      this.checking = true; dirty();
      for (const b of candidates()){
        try {
          const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 3500);
          const r = await fetch(b + "/config", {signal:ctl.signal}); clearTimeout(tm);
          if (r.ok){ const j = await r.json(); if (j && j.game === "p2050"){ this.base = b; this.cfg = j; this.online = true; break; } }
        } catch(e) {}
      }
      this.checking = false;
      if (this.online && this.access){ await this.me(); if (this.user){ this.syncAch(); this.syncProgress(); this.loadCloud(); this.loadSeason(); } }   // 1.1: opening the game already signed in syncs progress and save slots right away
      if (this.online && this.cfg.googleClientId) this.loadGoogle();
      if (!this.online){
        const p = this._init; setTimeout(() => { if (this._init === p) this._init = null; }, 0);   // next refresh() looks for the server again
        if (this.access && (this._initTries = (this._initTries || 0) + 1) <= 6){ clearTimeout(this._initT); this._initT = setTimeout(() => this.refresh(), 15000); }
      } else this._initTries = 0;
      dirty();
    })();
    return this._init;
  },
  async refresh(){ await this.init(); if (this.online && this.user){ await this.me(); this.syncAch(); this.syncProgress(); this.loadCloud(); } dirty(); },
  async me(){
    try { const j = await this.req("GET", "/me"); this.applyMe(j); }
    catch(e){ if (e.error !== "offline"){ this.user = null; this.owned = new Set(); } }
  },
  applyMe(j){ if (!j) return; if (j.user) this.user = j.user; if (j.owned) this.owned = new Set(j.owned); if (j.chars) this.chars = j.chars; dirty(); },
  owns(item){
    if (item === "char_sci") return true;
    return !!this.user && this.owned.has(item);
  },
  charXp(id){
    if (this.user) return (this.chars[id] || 0);
    try { return (JSON.parse(ls.get("p2050-xp") || "{}")[id]) || 0; } catch(e) { return 0; }
  },
  addGuestXp(id, xp){ let o = {}; try { o = JSON.parse(ls.get("p2050-xp") || "{}") || {}; } catch(e) {} o[id] = (o[id] || 0) + xp; ls.set("p2050-xp", JSON.stringify(o)); },
  maxLevel(){ return Math.max(...P.CHARS.map(c => P.levelOf(this.charXp(c.id)))); },
  async auth(path, body){
    this.busy = true; msg("");
    try { const j = await this.req("POST", path, body, false); return this.afterAuth(j); }
    catch(e){ msg(errText(e), true); return false; }
    finally { this.busy = false; dirty(); }
  },
  afterAuth(j){
    if (j.needUsername){ this.pendingGoogle = j.ticket; msg(""); return false; }
    this.setTokens(j.access, j.refresh); this.pendingGoogle = null; this.applyMe(j);
    msg(`${t("welcome")} ${j.user.displayName}`); this.syncAch(); this.syncProgress(); this.loadCloud(); P.Audio.play("start");
    return true;
  },
  register(o){
    if (!/^[a-z0-9_]{3,16}$/.test(o.username)) return msg(t("err_bad_username"), true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return msg(t("err_bad_email"), true);
    if ((o.password || "").length < 8) return msg(t("err_weak_password"), true);
    if (!o.displayName) o.displayName = o.username;
    return this.auth("/auth/register", o);
  },
  login(login, password){ if (!login || !password) return msg(t("err_missing"), true); return this.auth("/auth/login", {login, password}); },
  googleCredential(idToken){ return this.auth("/auth/google", {idToken}); },
  googleComplete(username){ if (!/^[a-z0-9_]{3,16}$/.test(username)) return msg(t("err_bad_username"), true); return this.auth("/auth/google/complete", {ticket:this.pendingGoogle, username}); },
  /* 2.4: sign in from an app through the website (server: /auth/link/*). link = {device, code, url, until, state} */
  link:null,
  siteUrl(){ return /^https?:/.test(this.base || "") ? this.base.replace(/\/api\/?$/, "") : (typeof location !== "undefined" ? location.origin : ""); },
  openUrl(url){ if (P.openUrl) P.openUrl(url); else window.open(url, "_blank", "noopener"); },
  async linkStart(){
    this.linkCancel(); this.busy = true; msg("");
    try {
      const j = await this.req("POST", "/auth/link/start", {}, false);
      const url = `${this.siteUrl()}/?link=${encodeURIComponent(j.code)}`;
      this.link = {device:j.device, code:j.code, url, until:Date.now() + j.expiresIn * 1000, state:"wait"};
      this.openUrl(url);
      const tick = async () => {
        const L = this.link; if (!L || L.device !== j.device) return;
        if (Date.now() > L.until){ this.link = null; msg(t("err_link_expired"), true); return; }
        try {
          const r = await this.req("POST", "/auth/link/poll", {device:L.device}, false);
          if (this.link !== L) return;
          if (r.pending){ L.timer = setTimeout(tick, 2500); return; }
          this.link = null; this.afterAuth(r); dirty();
        } catch(e){
          if (this.link !== L) return;
          if (e.error === "offline" || e.error === "rate_limited"){ L.timer = setTimeout(tick, 5000); return; }   // network hiccup: keep waiting
          this.link = null; msg(errText(e), true);
        }
      };
      this.link.timer = setTimeout(tick, 2500);
    } catch(e){ msg(errText(e), true); }
    finally { this.busy = false; dirty(); }
  },
  linkCancel(){ if (this.link && this.link.timer) clearTimeout(this.link.timer); this.link = null; dirty(); },
  /* on the website: the signed-in player lets the game in */
  async linkConfirm(code){
    this.busy = true; msg("");
    try { await this.req("POST", "/auth/link/confirm", {code}); msg(t("linkDone")); return true; }
    catch(e){ msg(errText(e), true); return false; }
    finally { this.busy = false; dirty(); }
  },
  async logout(){ try { await this.req("POST", "/auth/logout", {refresh:this.refreshTok}, false); } catch(e) {} this.setTokens(null, null); this.user = null; this.owned = new Set(); this.chars = {}; this.cloud = null; this.guestSaves(); msg(t("signedOut")); },
  /* signed out: put the guest's own slots back (the account's slots are in the cloud) */
  guestSaves(){
    if (ls.get(OWNER) === null) return;
    let g = {}; try { g = JSON.parse(ls.get(GUEST) || "{}") || {}; } catch(e) {}
    P.putSaves(g); ls.set(GUEST, null); ls.set(OWNER, null); this.fixSlot(g);
  },
  /* the game in memory keeps pointing at its own slot, wherever it is now */
  fixSlot(all){
    if (!S.started || !S.saveSlot) return;
    const k = P.SLOTS.find(x => all[x] && all[x].meta && all[x].meta.id && all[x].meta.id === S.saveId);
    S.saveSlot = k || null;
  },
  async rename(name){
    name = (name || "").trim(); if (name.length < 2 || name.length > 20) return msg(t("err_bad_display"), true);
    this.busy = true;
    try { const j = await this.req("POST", "/me/display-name", {displayName:name}); this.applyMe(j); msg(t("renamed")); }
    catch(e){ msg(errText(e), true); } finally { this.busy = false; dirty(); }
  },
  /* 3.8: change the password (current + new twice); accounts made with Google can set one without the current box */
  async changePassword(current, password, again){
    const has = !this.user || this.user.hasPassword !== false;
    if (has && !current) return msg(t("err_missing"), true), false;
    if ((password || "").length < 8) return msg(t("err_weak_password"), true), false;
    if (password !== again) return msg(t("err_pw_mismatch"), true), false;
    this.busy = true;
    try { const j = await this.req("POST", "/me/password", {current:current || "", password}); this.setTokens(j.access, j.refresh); this.applyMe(j); msg(t("pwDone")); return true; }
    catch(e){ msg(errText(e), true); return false; } finally { this.busy = false; dirty(); }
  },
  async buy(item){
    this.busy = true;
    try { const j = await this.req("POST", "/shop/buy", {item}); this.applyMe(j); msg(t("bought")); P.Audio.play("buy"); }
    catch(e){ msg(errText(e), true); P.Audio.play("error"); } finally { this.busy = false; dirty(); }
  },
  /* ---- game runs ---- */
  async startRun(){
    S.runId = null; await this.init();
    if (!this.user) return;
    try { const j = await this.req("POST", "/runs", {mode:S.mode, char:S.char, seed:S.seed, ab:S.ab, world:!!S.world}); if (S.started && !S.over) S.runId = j.runId; } catch(e) {}
  },
  /* ---- play statistics for the A/B balance test (guests too; no personal data) ---- */
  async statStart(){
    S.statId = null; await this.init(); if (!this.online) return;
    try { const j = await this.req("POST", "/stats/start", {ab:S.ab || "A", mode:S.mode, world:!!S.world, ver:P.VERSION_NAME}, !!this.user); if (S.started) S.statId = j.id; } catch(e) {}
  },
  statUpdate(final){
    if (!this.online || !S.statId) return;
    const o = {tick:S.tick, temp:+S.temp.toFixed(3), net:+P.netCO2().toFixed(2), appr:+S.appr.toFixed(1), realSec:Math.round(S.realSec), skills:Object.keys(S.owned).length, ore:Math.round(S.oreUsed || 0)};
    if (final && S.over) o.ending = S.over;
    this.req("POST", `/stats/${S.statId}`, o, false).catch(() => {});
  },
  async finishRun(){
    this.statUpdate(true);
    const UIM = P.UIM, xp = P.xpFor(), sum = P.summary();
    if (!this.user || !sum.runId){
      this.addGuestXp(S.char, xp); UIM.reward = this.user ? {error:true, xp} : {guest:true, xp};
      if (this.user && !sum.runId) UIM.reward.note = t("rewardNoRun");
      if (!this.user) UIM.reward.xp = xp;
      dirty(); P.Ach.check(); return;
    }
    try {
      const j = await this.req("POST", `/runs/${sum.runId}/finish`, sum);
      UIM.reward = {terra:j.terra, xp:j.xp, level:j.level, levelUp:j.levelUp, note:j.note ? (P.UI["note_" + j.note] ? t("note_" + j.note) : j.note) : ""};
      if (j.user) this.user = j.user; if (j.chars) this.chars = j.chars;
    } catch(e){ UIM.reward = {error:true, xp:0}; }
    this.syncProgress(); P.Ach.check(); if (this.user) this.loadSeason(); dirty();
  },
  /* ---- achievements & learning progress (server pays Terra once per achievement) ---- */
  syncAch(){
    if (!this.user) return;
    clearTimeout(this._achT);
    this._achT = setTimeout(async () => {
      const ids = Object.keys(P.AchStore.data.got);
      try { const j = await this.req("POST", "/achievements", {ids}); if (j.user) this.user = j.user; if (j.awarded) this.toastTerra(j.awarded); dirty(); } catch(e) {}
    }, 800);
  },
  toastTerra(n){ if (n > 0 && P.UIM) P.UIM.toastQ.push({icon:"terra", title:t("terraGot"), msg:`+${n} ${t("gemsWord")}`}); },
  /* progress follows the account: send this device's progress, get back the merge of every device + the server's own records
     (achievements, wins). Called on sign-in, on refresh and a few seconds after anything changes. */
  async syncProgress(){
    if (!this.user) return;
    const d = P.AchStore.data, mine = {seen:d.seen, haz:d.haz, charsDone:d.charsDone, greens:d.greens, aids:d.aids, evac:d.evac, cev:d.cev, daily:d.daily, got:d.got, ends:d.ends, tut:ls.get("p2050-tut") === "1" ? 1 : 0, trained:ls.get("p2050-trained") === "1" ? 1 : 0};   // 2.0: training mode done
    try {
      const j = await this.req("PUT", "/progress", {cards:P.cardCount(), data:mine});
      if (j && j.data){ mergeInto(P.AchStore.data, j.data); P.AchStore.save(true); if (j.data.tut) ls.set("p2050-tut", "1"); if (j.data.trained) ls.set("p2050-trained", "1"); dirty(); }
    } catch(e) {}
  },
  progressChanged(){ if (!this.user) return; clearTimeout(this._progT); this._progT = setTimeout(() => this.syncProgress(), 4000); },
  /* ---- cloud saves: the 3 slots follow the account. Each write here is sent up a few seconds later.
     The slots on this device are tagged with their account (p2050-saves-owner; none = guest):
     - same account → per slot the newer copy wins, both ways (one account on several devices)
     - guest or another account's slots → the account's cloud slots win. Guest games only move into slots the
       account has free (and are sent up); the guest set is kept aside (p2050-saves-guest) and comes back on sign-out.
     A deleted slot is kept as a "deleted at" marker. A failed sync changes nothing and is tried again. ---- */
  cloudQueue(slot){
    if (!this.user || ls.get(OWNER) !== this.user.username) return;   // not merged with this account yet: loadCloud sends it
    (this._sq = this._sq || {})[slot] = 1; clearTimeout(this._sqT);
    this._sqT = setTimeout(() => { const q = Object.keys(this._sq); this._sq = {}; q.forEach(k => this.cloudPush(k)); }, 6000);
  },
  async cloudPush(slot){
    if (!this.user) return false;
    const all = P.rawSaves(), s = all && all[slot]; if (!s || !s.meta) return false;
    try { await this.req("PUT", `/saves/${slot}`, {meta:s.meta, state:s.S || {}}); return true; }
    catch(e){ if (e.error !== "unauthorized"){ clearTimeout(this._pushT); this._pushT = setTimeout(() => this.cloudPush(slot), 20000); } return false; }
  },
  /* one sync at a time; a call during a sync runs it once more afterwards (was dropped before) */
  loadCloud(){
    if (!this.user) return Promise.resolve();
    if (this._syncing){ this._again = true; return this._syncing; }
    this._syncing = (async () => { do { this._again = false; await this.syncSaves(); } while (this._again && this.user); })()
      .finally(() => { this._syncing = null; dirty(); });
    return this._syncing;
  },
  async syncSaves(){
    const me = this.user && this.user.username; if (!me) return;
    const retry = () => { clearTimeout(this._cloudT); this._cloudT = setTimeout(() => this.loadCloud(), 15000); };
    const playing = S.started && !S.over && P.UIM && P.UIM.screen === "game";
    const owner = ls.get(OWNER), mine = owner === me;
    if (!mine && playing) return;   // takes over the slots: wait until back at the menu (game.js refreshes there)
    let cloud; try { cloud = await this.req("GET", "/saves") || {}; } catch(e){ if (e.error !== "unauthorized") retry(); return; }
    const all = P.rawSaves() || {}, out = {}, push = [];
    const fetchSlot = async slot => { const j = await this.req("GET", `/saves/${slot}`); return j && j.state && P.validSave(j.state) ? {meta:j.meta, S:j.state} : null; };
    try {
      for (const slot of P.SLOTS){
        const c = cloud[slot] && cloud[slot].meta, l = all[slot] && all[slot].meta;
        const newerC = c && (!l || (c.at || 0) > (l.at || 0)), sameGame = c && l && c.id && c.id === l.id;
        if (mine || sameGame){
          if (newerC){
            if (playing && S.saveSlot === slot){ out[slot] = all[slot]; continue; }   // never swap the game being played
            out[slot] = c.del ? {meta:c, S:null} : (await fetchSlot(slot)) || all[slot] || null;
          } else { out[slot] = all[slot] || null; if (l && (!c || (l.at || 0) > (c.at || 0))) push.push(slot); }
        } else out[slot] = c && !c.del ? await fetchSlot(slot) : null;   // the account's slot wins
      }
    } catch(e){ if (e.error !== "unauthorized") retry(); return; }   // nothing changed yet
    if (!mine){
      const live = sv => sv && sv.meta && !sv.meta.del && sv.S && P.validSave(sv.S);
      const placed = new Set(P.SLOTS.map(k => out[k] && out[k].meta && out[k].meta.id).filter(Boolean));
      if (owner === null){
        if (P.SLOTS.some(k => live(all[k]))) ls.set(GUEST, JSON.stringify(all));   // put the guest set aside
        // guest games move into the account's free slots, newest first
        const left = P.SLOTS.filter(k => live(all[k]) && !placed.has(all[k].meta.id)).sort((x, y) => (all[y].meta.at || 0) - (all[x].meta.at || 0));
        for (const k of left){ const free = P.SLOTS.find(x => !live(out[x])); if (!free) break; out[free] = all[k]; push.push(free); }
      }
      // another account's slots stay in that account's cloud
    }
    P.putSaves(out); ls.set(OWNER, me); this.fixSlot(out);
    this.cloud = cloud;
    for (const k of push) this.cloudPush(k);
  },
  /* ---- leaderboard ---- */
  async loadBoard(){
    await this.init(); const m = this.boardMode, p = this.boardMode === "daily" ? "day" : this.boardPeriod;
    this.board = {loading:true}; dirty();
    try { const j = await this.req("GET", `/leaderboard?mode=${m}&period=${p}`); if (this.boardMode === m) this.board = j; }
    catch(e){ this.board = {error:true}; }
    dirty();
  },
  /* ---- certificates ---- */
  async loadCerts(){ await this.init(); if (!this.user) return; try { this.certs = await this.req("GET", "/certificates"); } catch(e){ this.certs = {error:true}; } dirty(); },
  async requestCert(fullName){
    this.busy = true;
    try { const j = await this.req("POST", "/certificates", {fullName}); this.certs = j; msg(t("certDone")); P.Audio.play("win"); }
    catch(e){ msg(errText(e), true); } finally { this.busy = false; dirty(); }
  },
  /* ---- 1.8: weekly missions and the season pass ---- */
  async loadSeason(){ await this.init(); if (!this.user) return; try { this.season = await this.req("GET", "/season"); } catch(e){ this.season = {error:true}; } dirty(); },
  async claimTier(tier){
    this.busy = true;
    try { const j = await this.req("POST", "/season/claim", {tier}); this.season = j; this.applyMe(j); msg(t("seasonGot")); P.Audio.play("buy"); }
    catch(e){ msg(errText(e), true); P.Audio.play("error"); } finally { this.busy = false; dirty(); }
  },
  async claimMission(mission){
    this.busy = true;
    try { const j = await this.req("POST", "/weekly/claim", {mission}); this.season = j; this.applyMe(j); msg(t("seasonGot")); P.Audio.play("coin"); }
    catch(e){ msg(errText(e), true); P.Audio.play("error"); } finally { this.busy = false; dirty(); }
  },
  /* how many rewards are waiting (dot on the menu tile) */
  seasonReady(){ const s = this.season; if (!s || !s.season) return 0; return s.season.tiers.filter(x => x.reached && !x.claimed).length + s.weekly.missions.filter(m => m.done && !m.claimed).length; },
  certUrl(code){ return `${this.base}/certificates/${encodeURIComponent(code)}/pdf`; },
  /* ---- Google sign-in button (an HTML element placed over the game canvas) ---- */
  loadGoogle(){
    if (this._g || !this.cfg.googleClientId) return; this._g = 1;
    const sc = document.createElement("script"); sc.src = "https://accounts.google.com/gsi/client"; sc.async = true;
    sc.onload = () => {
      try {
        google.accounts.id.initialize({client_id:this.cfg.googleClientId, callback:r => this.googleCredential(r.credential)});
        const d = this._gDiv = document.createElement("div");
        Object.assign(d.style, {position:"fixed", zIndex:50, display:"none"});
        document.body.appendChild(d);
        google.accounts.id.renderButton(d, {theme:"filled_black", size:"large", shape:"rectangular", text:"continue_with", width:400});   // invisible, on top of our own button (menu.jsx GoogleBtn)
        this._gReady = true; dirty();
      } catch(e) { console.warn("Google sign-in", e); }
    };
    document.head.appendChild(sc);
  },
  googleOverlay(rect){
    const d = this._gDiv; if (!d) return;
    if (!rect || this.user || !this._gReady){ if (d.style.display !== "none") d.style.display = "none"; return; }
    const cv = P.Kit.canvas; if (!cv) return;
    // GDevelop: the screen is P.Kit.H (720) design units tall and as wide as it needs (Kit.W), so scale by the height
    const b = cv.getBoundingClientRect(), s = b.height / (P.Kit.H || 720);
    const vis = !rect.clip || (rect.y >= rect.clip.y && rect.y + rect.h <= rect.clip.y + rect.clip.h);
    d.style.display = vis ? "block" : "none";
    d.style.left = (b.left + rect.x * s) + "px"; d.style.top = (b.top + rect.y * s) + "px";
    d.style.transform = `scale(${rect.w * s / 400})`; d.style.transformOrigin = "0 0";   // rendered 400 px wide (loadGoogle) → exactly the box
  },
};
P.Net = Net;
/* character outfit: base · alt (bought in the shop) · gold (level 10) */
P.outfitPref = () => ls.get("p2050-outfit") || "base";
P.outfitOf = id => { const p = P.outfitPref(); if (p === "alt" && Net.owns("outfit")) return "alt"; if (p === "gold" && P.levelOf(Net.charXp(id)) >= 10) return "gold"; return "base"; };
H.achUnlocked = () => Net.syncAch();
H.autosaved = () => {};
H.slotWritten = slot => Net.cloudQueue(slot);
Net.init();

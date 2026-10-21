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
const ls = {get:k => { try { return localStorage.getItem(k); } catch(e) { return null; } }, set:(k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e) {} }};
const dirty = () => P.Kit && P.Kit.dirty();
const msg = (m, err) => { if (P.UIM){ P.UIM.msg = m; P.UIM.err = !!err; } dirty(); };
const errText = e => { const c = e && e.error; const key = "err_" + c; return (P.UI[key] ? t(key) : (e && e.message) || t("err_generic")); };

function candidates(){
  const out = [];
  if (window.P2050_API) out.push(window.P2050_API);
  const saved = ls.get("p2050-api"); if (saved) out.push(saved);
  if (/^https?:$/.test(location.protocol)) out.push("/api");
  out.push("http://localhost:8080/api");
  return [...new Set(out)];
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
  async doRefresh(){
    try { const j = await this.req("POST", "/auth/refresh", {refresh:this.refreshTok}, false); this.setTokens(j.access, j.refresh); return true; }
    catch(e){ if (e.error !== "offline"){ this.setTokens(null, null); this.user = null; } return false; }
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
      if (this.online && this.access) await this.me();
      if (this.online && this.cfg.googleClientId) this.loadGoogle();
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
  async logout(){ try { await this.req("POST", "/auth/logout", {refresh:this.refreshTok}, false); } catch(e) {} this.setTokens(null, null); this.user = null; this.owned = new Set(); this.chars = {}; this.cloud = null; msg(t("signedOut")); },
  async rename(name){
    name = (name || "").trim(); if (name.length < 2 || name.length > 20) return msg(t("err_bad_display"), true);
    this.busy = true;
    try { const j = await this.req("POST", "/me/display-name", {displayName:name}); this.applyMe(j); msg(t("renamed")); }
    catch(e){ msg(errText(e), true); } finally { this.busy = false; dirty(); }
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
    try { const j = await this.req("POST", "/stats/start", {ab:S.ab || "A", mode:S.mode, world:!!S.world}, !!this.user); if (S.started) S.statId = j.id; } catch(e) {}
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
    this.syncProgress(); P.Ach.check(); dirty();
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
  toastTerra(n){ if (n > 0 && P.UIM) P.UIM.toastQ.push({icon:"terra", title:t("terraGot"), msg:`+${n} Gems`}); },
  async syncProgress(){ if (!this.user) return; try { await this.req("PUT", "/progress", {cards:P.cardCount()}); } catch(e) {} },
  /* ---- cloud saves ---- */
  async loadCloud(){ if (!this.user) return; try { this.cloud = await this.req("GET", "/saves"); dirty(); } catch(e) {} },
  async cloudSave(slot){
    if (!this.user) return false;
    const all = P.readSaves(); const s = all && all[slot]; if (!s) return false;
    try { await this.req("PUT", `/saves/${slot}`, {meta:s.meta, state:s.S}); (this.cloud = this.cloud || {})[slot] = {meta:s.meta}; return true; } catch(e) { return false; }
  },
  async cloudLoad(slot){ try { const j = await this.req("GET", `/saves/${slot}`); return j.state; } catch(e) { return null; } },
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
        google.accounts.id.renderButton(d, {theme:"filled_black", size:"large", shape:"pill", text:"continue_with", width:300});
        this._gReady = true; dirty();
      } catch(e) { console.warn("Google sign-in", e); }
    };
    document.head.appendChild(sc);
  },
  googleOverlay(rect){
    const d = this._gDiv; if (!d) return;
    if (!rect || this.user || !this._gReady){ if (d.style.display !== "none") d.style.display = "none"; return; }
    const cv = P.Kit.canvas; if (!cv) return;
    const b = cv.getBoundingClientRect(), s = b.width / 1280;
    const vis = !rect.clip || (rect.y >= rect.clip.y && rect.y + rect.h <= rect.clip.y + rect.clip.h);
    d.style.display = vis ? "block" : "none";
    d.style.left = (b.left + rect.x * s) + "px"; d.style.top = (b.top + rect.y * s) + "px";
    d.style.transform = `scale(${Math.min(1.4, Math.max(.6, s * 1.05))})`; d.style.transformOrigin = "0 0";
  },
};
P.Net = Net;
/* character outfit: base · alt (bought in the shop) · gold (level 10) */
P.outfitPref = () => ls.get("p2050-outfit") || "base";
P.outfitOf = id => { const p = P.outfitPref(); if (p === "alt" && Net.owns("outfit")) return "alt"; if (p === "gold" && P.levelOf(Net.charXp(id)) >= 10) return "gold"; return "base"; };
H.achUnlocked = () => Net.syncAch();
H.autosaved = () => {};
Net.init();

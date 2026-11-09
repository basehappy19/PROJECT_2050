const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.menu) return;
(P.mods = P.mods || {}).menu = 1;
/* =========================================================================
   Screens · loading card, main menu (new game / continue / load / learning / achievements / how to play /
   shop / leaderboard / certificate / account), achievement toasts
   ========================================================================= */
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, ACH, SHOP, CHARS, CHAR, PRICE} = P;
const k = Kit;

/* ---------------- loading ---------------- */
Screens.preloadExtra = function(){
  if (P._extra) return P._extra;
  const g = this.scene.getGame(), fm = g.getFontManager(), sm = g.getSoundManager();
  const fonts = [...new Set(Object.values(Kit.FONT))], sounds = [...Audio.SFX.map(n => `sfx-${n}.mp3`), ...Audio.AMB.map(n => `amb-${n}.mp3`)];
  const st = P._extra = {total:fonts.length + sounds.length, done:0, fonts:0, nf:fonts.length};
  const fin = () => { st.done++; };
  fonts.forEach(f => Promise.resolve().then(() => fm.loadResource(f)).catch(() => {}).finally(() => { fin(); st.fonts++; if (st.fonts === fonts.length) Kit.resetFonts(); }));
  sounds.forEach(s => Promise.resolve().then(() => sm.loadResource(s)).catch(() => {}).finally(fin));
  return st;
};
Screens.loaderUpdate = function(dt){
  const g = this.scene.getGame(), ex = this.preloadExtra();
  let p = 1;
  try { p = (g.getSceneLoadingProgress("Menu") + g.getSceneLoadingProgress("Game")) / 2; } catch(e) {}
  if (!(p >= 0)) p = 1;
  p = p * 0.6 + (ex.done / ex.total) * 0.4;
  const shown = this._ldShown || 0, np = Math.min(p, shown + dt * 2.5);
  if (Math.abs(np - shown) > 0.001){ this._ldShown = np; k.dirty("Loader"); }
  const ready = np >= 0.999;
  if (ready !== this._ldReady){ this._ldReady = ready; k.dirty("Loader"); }
};
Screens.renderLoader = function(l){
  if (!P._extra || P._extra.fonts < P._extra.nf) return;
  const w = 440, x = (k.W - w) / 2, y = 210, p = this._ldShown || 0;
  k.sprite(l, "Logo", "Logo", (k.W - 150) / 2, y - 120, 150, 150);
  k.text(l, "GLOBAL CLIMATE TASKFORCE · 2026 – 2050", x, y + 40, {font:"mono", size:11, color:"accent", w, align:"center"});
  const parts = [["PROJECT ", {font:"logo", size:52}], ["ZERO", {font:"logo", size:52, color:"accent"}]];
  W.runs(l, x + (w - W.runsW(parts)) / 2, y + 62, parts);
  const by = y + 148;
  k.rect(l, x, by, w, 10, "panel2", {r:5});
  if (p > 0.01) k.hgrad(l, x, by, Math.max(10, w * p), 10, [[0, "#1f9e78"], [1, "#4fd1c5"]], {r:5});
  const stage = p < .15 ? t("ldFonts") : p < .35 ? t("ldGlobe") : p < .9 ? t("ldAudio") : p < .999 ? t("ldImg") : t("ldReady");
  k.text(l, p >= .999 ? t("ldReady") : `${t("loading")} · ${stage}`, x, by + 18, {size:12.5, color:"muted"});
  const pct = `${Math.round(p * 100)}%`;
  k.text(l, pct, x + w - k.textW(pct, {font:"mono", size:12.5}), by + 18, {font:"mono", size:12.5, color:"muted"});
  if (this._ldReady){
    const lab = t("enter"), bw = k.textW(lab, {font:"dispS", size:15}) + 40;
    W.btn(l, "enter", x + (w - bw) / 2, by + 52, lab, () => { Audio.play("start"); try { localStorage.setItem("p2050-entered", "1"); } catch(e) {} Screens.goScene("Menu"); }, {w:bw, h:42, size:15, sound:false});
    k.hit(l, "enterAll", 0, 0, k.W, k.H, () => { Audio.play("start"); Screens.goScene("Menu"); }, {cursor:false});
    l.hits.unshift(l.hits.pop());
  }
  k.text(l, t("disclaimer"), 0, k.H - 30, {size:11.5, color:"muted", w:k.W, align:"center"});
};

/* ---------------- main menu ---------------- */
const SUBW = {load:430, ach:640, account:480, shop:640, board:640, cert:540};
Screens.renderMenu = function(l){
  if (this.kind !== "menu"){ k.clearSlave("MenuScroll"); return; }
  const sub = UIM.sub, w = SUBW[sub] || 430, x = 56;
  const shade = (this.scene.getObjects("MenuShade") || [])[0];
  if (shade) shade.setWidth((w + (w > 430 ? 420 : 200)) * k.K);
  let ch = 0; UIM._googleRect = null;
  k.rect(l, x - 24, 16, w + 48, k.H - 32, "glass", {r:18, a:.9, stroke:"line", bg:true});
  k.slave("MenuScroll", s => {
    ch = this.menuCard(s, w);
    const top = 40;   // 3.x: content starts at the top of the panel, like the website
    // scroll inside the panel only (it runs from y 16 to H − 16), so long pages never draw over its border
    s.frame(x, top, {x:0, y:24, w:x + w + 40, h:k.H - 48}, ch + (top - 24) + 16);
  });
  Screens.menuPanelRight = x + w + 24;   // where the globe may start (73-earth.js)
  if (P.Net) P.Net.googleOverlay(UIM._googleRect);
  this.accountChip(l);
};
/* top-right: account + Terra, or a sign-in button */
Screens.accountChip = function(l){
  const N = P.Net, y = 16;
  if (!N.online){
    const txt = N.checking ? t("netChecking") : `[[wifi-off]] ${t("netOffline")}`, w = k.textW(txt, {size:12}) + 26;
    k.rect(l, (k.W - 16) - w, y, w, 32, "glass", {r:16, stroke:"line", a:.9, bg:true});
    k.text(l, txt, (k.W - 16) - w + 13, y + 6, {size:12, color:"muted", iconColor:"muted"});
    return;
  }
  if (!N.user){
    const lab = `[[log-in]] ${t("signIn")}`, w = W.btnW(lab);
    W.btn(l, "chip-login", (k.W - 16) - w, y, lab, () => { UIM.sub = "account"; UIM.accTab = "login"; UIM.msg = ""; k.dirty(); });
    return;
  }
  const name = N.user.displayName, tw = k.textW(name, {font:"bodyB", size:13}), terra = String(N.user.terra);
  const w = 16 + tw + 16 + 22 + k.textW(terra, {font:"monoB", size:14}) + 16, id = "chip-acc", hov = k.isHover(l, id);
  k.rect(l, (k.W - 16) - w, y, w, 36, "glass", {r:18, stroke:hov ? "accent" : "line", a:.92, bg:true});
  k.text(l, name, (k.W - 16) - w + 16, y + 7, {font:"bodyB", size:13});
  W.terra(l, (k.W - 16) - w + 16 + tw + 16, y + 8, terra, {size:14, color:"good"});
  k.hit(l, id, (k.W - 16) - w, y, w, 36, () => { Audio.play("click"); UIM.sub = "account"; UIM.msg = ""; k.dirty(); });
};
const back = () => 0;   // 3.x: every sub-page has its back arrow at the top (menuCard), so no second one at the bottom
const msgLine = (l, y, w) => UIM.msg ? k.text(l, UIM.msg, 0, y, {size:12.5, color:UIM.err ? "bad" : "good", w}).h + 8 : 0;
const go = sub => () => { UIM.sub = sub; UIM.msg = ""; UIM.err = false; const s = k.L("MenuScroll"); if (s) s.scroll = 0; if (sub === "board") P.Net.loadBoard(); if (sub === "season") P.Net.loadSeason(); if (sub === "cert") P.Net.loadCerts(); if (sub === "shop" || sub === "account") P.Net.refresh(); k.dirty(); };

/* 3.x: laid out like the website's menu panel (web/src/ui/menu.jsx): logo + title, SDG 13 tag, "what's new" pill,
   one big mission button, Endless World, then a dock of 8 icon tiles; sign-in is the chip at the top right.
   Sub-pages have a back arrow and their title at the top. */
const SUB_TITLES = {load:"mLoad", ach:"mAch", account:"mAccount", shop:"mShop", board:"mBoard", cert:"mCert", updates:"mUpd", season:"mSeason", settings:"mSettingsS"};
const SEEN_KEY = "p2050.seenVersion";
const seenVer = () => { try { return localStorage.getItem(SEEN_KEY); } catch(e){ return null; } };
Screens.menuCard = function(l, w){
  const sub = UIM.sub; let y = 0;
  if (sub){
    // back arrow + page title (close / back always at the top)
    const hov = k.isHover(l, "subback");
    k.rect(l, 0, y, 36, 36, "panel", {r:10, a:.92, stroke:hov ? "accent" : "line", bg:true});
    k.icon(l, "chevron-left", 8, y + 8, 20, hov ? "accent" : "fg");
    k.hit(l, "subback", 0, y, 36, 36, () => { Audio.play("click"); UIM.sub = sub === "cert" ? "ach" : null; UIM.msg = ""; k.dirty(); const s = k.L("MenuScroll"); if (s) s.scroll = 0; });
    k.text(l, t(SUB_TITLES[sub]), 48, y + 5, {font:"dispS", size:20, w:w - 48, max:1});
    y += 36 + 18;
    if (sub === "updates") try { localStorage.setItem(SEEN_KEY, P.VERSION_NAME); } catch(e){}
  } else {
    // logo + title
    k.sprite(l, "Logo", "Logo", 0, y, 46, 46);
    W.runs(l, 58, y + 6, [["PROJECT ", {font:"logo", size:34, lh:1}], ["ZERO", {font:"logo", size:34, color:"accent", lh:1}]]);
    y += 46 + 12;
    // SDG 13 tag
    k.rect(l, 0, y, 30, 30, "#3f7e44", {r:4});
    k.text(l, "13", 0, y + 1, {font:"monoB", size:10, color:"#ffffff", w:30, align:"center"});
    k.icon(l, "eye", 8, y + 13, 14, "#ffffff");
    y += Math.max(30, k.text(l, t("mTag"), 40, y + 1, {size:12, color:"muted", w:w - 40}).h) + 14;
    // what's new pill
    const c = P.CHANGELOG && P.CHANGELOG[0], fresh = seenVer() !== P.VERSION_NAME;
    if (c){
      const lab = L(c.name), vw = k.textW(`v${P.VERSION_NAME}`, {font:"monoB", size:12});
      const pw = Math.min(w, (fresh ? 14 : 0) + vw + 10 + k.textW(lab, {font:"bodyB", size:12.5}) + 46), hov = k.isHover(l, "whatsnew");
      k.rect(l, 0, y, pw, 30, "panel", {r:15, a:.92, stroke:hov || fresh ? "accent" : "line", bg:true});
      let px = 12; if (fresh){ k.circle(l, px + 3, y + 15, 4, "accent"); px += 14; }
      k.text(l, `v${P.VERSION_NAME}`, px, y + 7, {font:"monoB", size:12, color:"accent"}); px += vw + 10;
      k.text(l, lab, px, y + 6, {font:"bodyB", size:12.5, w:pw - px - 26, max:1});
      k.icon(l, "chevron-right", pw - 22, y + 8, 14, "muted");
      k.hit(l, "whatsnew", 0, y, pw, 30, () => { Audio.play("click"); go("updates")(); });
      y += 30 + 14;
    }
  }
  if (sub === "load") y = this.subLoad(l, y, w);
  else if (sub === "ach"){
    W.btn(l, "certbtn", 0, y, `[[award]] ${t("mCert")}`, go("cert"), {kind:"ghost", w}); y += 36 + 10;   // the certificate page sits inside achievements, like the website
    y += this.achList(l, 0, y, w) + 12;
  }
  else if (sub === "account") y = this.subAccount(l, y, w);
  else if (sub === "shop") y = this.subShop(l, y, w);
  else if (sub === "board") y = this.subBoard(l, y, w);
  else if (sub === "cert") y = this.subCert(l, y, w);
  else if (sub === "updates") y = this.subUpdates(l, y, w);
  else if (sub === "season") y = this.subSeason(l, y, w);
  else if (sub === "settings") y = this.subSettings(l, y, w);
  else {
    const saves = P.readSaves(), lk = P.latestSlot(), auto = lk && saves[lk], world = !!(P.worldUnlocked && P.worldUnlocked());
    // big buttons: continue (when there is a save) or the mission, then new game / Endless World
    const big = (id, x, by, bw, bh, ic, title, subTxt, primary, dis, fn) => {
      const hov = !dis && k.isHover(l, id);
      const fill = primary ? (hov ? k.mix("accent", "#ffffff", .18) : "accent") : (hov ? "panel2" : "panel");
      k.rect(l, x, by, bw, bh, fill, {r:12, a:primary ? 1 : .92, stroke:primary ? "accent" : hov ? "accent" : "line", bg:true});
      const a = dis ? .45 : 1, ink = primary ? "ink" : "fg", ty = subTxt ? by + bh / 2 - 19 : by + bh / 2 - 12;
      k.icon(l, ic, x + 16, by + (bh - 24) / 2, 24, primary ? "ink" : dis ? "muted" : "accent", a);
      k.text(l, title, x + 52, ty, {font:"dispS", size:bh >= 56 ? 18 : 15.5, color:ink, a, w:bw - 84, max:1});
      if (subTxt) k.text(l, subTxt, x + 52, ty + 24, {font:"mono", size:11.5, color:primary ? "ink" : "muted", a:primary ? .75 : a, w:bw - 84, max:1});
      if (!dis) k.icon(l, "chevron-right", x + bw - 30, by + (bh - 18) / 2, 18, primary ? "ink" : "muted", .8);
      k.hit(l, id, x, by, bw, bh, () => { Audio.play("start"); fn(); }, {disabled:!!dis});
    };
    const newGame = () => { UIM.worldSel = false; Screens.newGame(); };
    const worldGame = () => { UIM.worldSel = true; Screens.newGame(true); };
    const cont = () => { const s2 = P.readSaves(), k2 = P.latestSlot(); if (!k2 || !Screens.loadSave(s2[k2].S, k2)){ UIM.msg = t("oldSave"); UIM.err = true; k.dirty(); } };
    if (auto){
      big("continue", 0, y, w, 60, "play", t("mCont"), `${P.modeName(auto.meta)} · ${P.dateStr(auto.meta.tick)}`, true, false, cont); y += 60 + 8;
      const hw = (w - 8) / 2;
      big("new", 0, y, hw, 44, "globe", t("mNew"), null, false, false, newGame);
      big("world", hw + 8, y, hw, 44, world ? "infinity" : "lock", t("mWorldS2"), null, false, !world, worldGame); y += 44 + 14;
    } else {
      big("new", 0, y, w, 60, "globe", t("mNew"), null, true, false, newGame); y += 60 + 8;
      big("world", 0, y, w, 44, world ? "infinity" : "lock", t("mWorldS2"), null, false, !world, worldGame); y += 44 + 14;
    }
    y += msgLine(l, y, w);
    // dock: 4 × 2 icon tiles
    const dock = [
      {id:"loadmenu", ic:"save", t1:t("mLoadS"), fn:go("load")},
      {id:"learn", ic:"book-open", t1:t("mLearnS"), fn:() => Screens.openLearn("cards")},
      {id:"train", ic:"graduation-cap", t1:L(P.UI2.trainMenu), dot:!(P.Train && P.Train.trained && P.Train.trained()), fn:() => P.Train.start()},
      {id:"ach", ic:"trophy", t1:t("mAchS"), fn:go("ach")},
      {id:"season", ic:"calendar-check", t1:t("mSeasonS"), dot:!!(P.Net.seasonReady && P.Net.seasonReady()), fn:go("season")},
      {id:"board", ic:"medal", t1:t("mBoardS"), fn:go("board")},
      {id:"shop", ic:"shopping-bag", t1:t("mShopS"), fn:go("shop")},
      {id:"settings", ic:"settings", t1:t("mSettingsS"), fn:go("settings")},
    ];
    const gap = 8, tw = (w - gap * 3) / 4, th = 66;
    dock.forEach((it, i) => {
      const tx = (i % 4) * (tw + gap), ty = y + Math.floor(i / 4) * (th + gap), hov = k.isHover(l, it.id);
      k.rect(l, tx, ty, tw, th, hov ? "panel2" : "panel", {r:12, a:.92, stroke:hov ? "accent" : "line", bg:true});
      k.icon(l, it.ic, tx + (tw - 24) / 2, ty + 11, 24, "accent");
      if (it.dot) k.circle(l, tx + tw / 2 + 14, ty + 12, 4, "warn");
      k.text(l, it.t1, tx + 4, ty + 41, {font:"bodyB", size:12, w:tw - 8, align:"center", max:1});
      k.hit(l, it.id, tx, ty, tw, th, () => { Audio.play("click"); it.fn(); });
    });
    y += 2 * (th + gap) - gap;
  }
  if (sub) return y + 16;
  y += 18;
  k.line(l, 0, y, w, y, "line"); y += 14;
  k.text(l, t("teamK"), 0, y, {size:11, color:"muted"}); y += 18;
  y += k.text(l, t("team"), 0, y, {font:"dispS", size:13.5, lh:1.35, w}).h + 4;
  y += k.text(l, `${t("disclaimer")} · Earth imagery: NASA Visible Earth · Sounds & music: CC0 / CC-BY`, 0, y, {size:11, color:"muted", w}).h;
  return y + 16;
};

/* ---------------- load ---------------- */
Screens.subLoad = function(l, y, w){
  const saves = P.readSaves();
  if (saves === null) y += k.text(l, t("noStore"), 0, y, {size:12.5, color:"bad", w}).h + 8;
  else for (const slot of P.SLOTS){
    const ok = saves[slot] && P.validSave(saves[slot].S);
    const m = ok && saves[slot].meta, lines = saves[slot] && !ok ? [t("oldSave")] : P.slotMetaLines(m), sh = 22 + lines.length * 17 + 8;
    W.card(l, 0, y, w, sh, {r:10});
    k.text(l, P.slotName(slot), 12, y + 7, {font:"dispS", size:15});
    lines.forEach((s, i) => k.text(l, s, 12, y + 28 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 110, max:1}));
    const bw = W.btnW(t("load"));
    W.btn(l, "load-" + slot, w - 12 - bw, y + (sh - 36) / 2, t("load"), () => { const s2 = P.readSaves(); if (s2 && s2[slot] && !Screens.loadSave(s2[slot].S, slot)){ UIM.msg = t("oldSave"); UIM.err = true; k.dirty(); } }, {disabled:!ok});
    y += sh + 7;
  }
  if (P.Net.user){
    y += 6; W.h3(l, t("cloudSaves"), 0, y, {w}); y += 22;
    const cs = P.Net.cloud || {};
    for (const slot of ["s1", "s2", "s3"]){
      const c = cs[slot], lines = c ? P.slotMetaLines(c.meta) : [t("empty")], sh = 22 + lines.length * 17 + 8;
      W.card(l, 0, y, w, sh, {r:10});
      k.text(l, `[[cloud]] ${P.slotName(slot)}`, 12, y + 7, {font:"dispS", size:15, iconColor:"accent"});
      lines.forEach((s, i) => k.text(l, s, 12, y + 28 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 110, max:1}));
      const bw = W.btnW(t("load"));
      W.btn(l, "cload-" + slot, w - 12 - bw, y + (sh - 36) / 2, t("load"), () => P.Net.cloudLoad(slot).then(st => { if (!st || !Screens.loadSave(st, slot)){ UIM.msg = t("codeBad"); UIM.err = true; k.dirty(); } }), {disabled:!c, kind:"ghost"});
      y += sh + 7;
    }
  }
  y += 6;
  if (UIM.msg){ y += k.text(l, UIM.msg, 0, y, {size:12.5, color:UIM.err ? "bad" : "good", w}).h + 10; }
  return y + back(l, y);
};

/* ---------------- account: sign in / sign up / profile ---------------- */
const field = (l, y, w, key, label, type = "text", ph = "") => {
  k.text(l, label, 0, y, {size:12, color:"muted"});
  const go2 = k.input(l, 0, y + 18, w, 34, {type, placeholder:ph, key, fontSize:14});
  (UIM.inputs = UIM.inputs || {})[key] = go2;
  return 58;
};
const val = key => { const g = UIM.inputs && UIM.inputs[key]; return g && g.getString ? g.getString().trim() : ""; };
Screens.subAccount = function(l, y, w){
  const N = P.Net;
  if (!N.online){ y += k.text(l, t("netOfflineLong"), 0, y, {size:13, color:"muted", w}).h + 12; return y + back(l, y); }
  if (!N.user && N.link){   // 2.4: waiting for the player to confirm on the website
    const L = N.link, left = Math.max(0, Math.round((L.until - Date.now()) / 1000));
    k.rect(l, 0, y, w, 150, "panel", {r:12, a:.92, stroke:"accent", bg:true});
    k.text(l, t("linkWait"), 16, y + 14, {size:13, color:"muted", w:w - 32, align:"center"});
    k.text(l, L.code, 0, y + 52, {font:"monoB", size:34, color:"accent", w, align:"center"});
    k.text(l, `${t("linkWaiting")}  ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`, 0, y + 114, {size:12, color:"muted", w, align:"center"});
    y += 150 + 12;
    const hw = (w - 8) / 2;
    W.btn(l, "link-open", 0, y, `[[globe]] ${t("linkOpenAgain")}`, () => N.openUrl(L.url), {w:hw, kind:"ghost"});
    W.btn(l, "link-cancel", hw + 8, y, `[[x]] ${t("linkCancel")}`, () => N.linkCancel(), {w:hw, kind:"ghost"});
    y += 46; y += msgLine(l, y, w);
    if (!this._linkTick){ this._linkTick = setInterval(() => { if (P.Net.link) k.dirty(); else { clearInterval(this._linkTick); this._linkTick = null; } }, 1000); }   // the countdown
    return y;
  }
  if (!N.user){
    const tab = UIM.accTab || "login";
    W.tabs(l, 0, y, [{id:"at-login", label:t("signIn"), on:tab === "login", fn:() => { UIM.accTab = "login"; UIM.msg = ""; k.dirty(); }},
                     {id:"at-reg", label:t("signUp"), on:tab === "reg", fn:() => { UIM.accTab = "reg"; UIM.msg = ""; k.dirty(); }}]);
    y += 44;
    if (tab === "login"){
      y += field(l, y, w, "li-user", t("fUserOrEmail"), "text", "username / email");
      y += field(l, y, w, "li-pass", t("fPassword"), "password");
      y += 4;
      W.btn(l, "do-login", 0, y, `[[log-in]] ${t("signIn")}`, () => N.login(val("li-user"), val("li-pass")), {w, h:40, disabled:N.busy});
      y += 48;
      y += k.text(l, t("noReset"), 0, y, {size:11.5, color:"muted", w}).h + 10;
    } else {
      y += field(l, y, w, "rg-user", t("fUsername"), "text", "a–z 0–9 _ (3–16)");
      y += field(l, y, w, "rg-email", t("fEmail"), "email", "name@example.com");
      y += field(l, y, w, "rg-name", t("fDisplay"), "text", t("fDisplayPh"));
      y += field(l, y, w, "rg-pass", t("fPassword"), "password", t("fPassPh"));
      y += W.check(l, "rg-consent", 0, y, w, !!UIM.consent, t("pdpaConsent"), () => { UIM.consent = !UIM.consent; k.dirty(); }) + 10;
      W.btn(l, "do-reg", 0, y, `[[user-plus]] ${t("signUp")}`, () => {
        if (!UIM.consent){ UIM.msg = t("needConsent"); UIM.err = true; k.dirty(); return; }
        N.register({username:val("rg-user"), email:val("rg-email"), displayName:val("rg-name"), password:val("rg-pass")});
      }, {w, h:40, disabled:N.busy});
      y += 48;
      y += k.text(l, t("noReset"), 0, y, {size:11.5, color:"muted", w}).h + 10;
    }
    if (N.cfg && N.cfg.googleClientId){
      k.line(l, 0, y + 10, w, y + 10, "line"); k.rect(l, w / 2 - 22, y + 2, 44, 16, "panel"); k.text(l, t("or"), w / 2 - 22, y + 1, {size:11, color:"muted", w:44, align:"center"});
      y += 26;
      // 2.4: Google won't sign in inside an app (preview / Android / desktop), so this opens the website in the browser
      // and the game waits for the player to confirm there (Net.linkStart, server /auth/link/*)
      W.btn(l, "g-link", 0, y, `[[globe]] ${t("linkGoogle")}`, () => N.linkStart(), {w, h:42, kind:"ghost", disabled:N.busy});
      y += 48;
      y += k.text(l, t("linkWhy"), 0, y, {size:11.5, color:"muted", w}).h + 10;
    }
    if (N.pendingGoogle){
      y += k.text(l, t("googlePickName"), 0, y, {size:13, color:"accent", w}).h + 6;
      y += field(l, y, w, "gg-user", t("fUsername"), "text", "a–z 0–9 _ (3–16)");
      y += W.check(l, "gg-consent", 0, y, w, !!UIM.consent, t("pdpaConsent"), () => { UIM.consent = !UIM.consent; k.dirty(); }) + 8;
      W.btn(l, "gg-done", 0, y, t("signUp"), () => { if (!UIM.consent){ UIM.msg = t("needConsent"); UIM.err = true; k.dirty(); return; } N.googleComplete(val("gg-user")); }, {w, disabled:N.busy});
      y += 46;
    }
    y += msgLine(l, y, w);
    return y + back(l, y);
  }
  /* profile */
  const u = N.user;
  W.card(l, 0, y, w, 92, {fill:"panel2"});
  k.text(l, u.displayName, 16, y + 10, {font:"disp", size:22, w:w - 160, max:1});
  k.text(l, `@${u.username}${u.email ? " · " + u.email : ""}`, 16, y + 44, {font:"mono", size:11.5, color:"muted", w:w - 32, max:1});
  k.text(l, t("balance"), w - 140, y + 12, {size:11, color:"muted", w:124, align:"right"});
  const tw2 = k.textW(String(u.terra), {font:"monoB", size:22}) + 30;
  W.terra(l, w - 16 - tw2, y + 30, u.terra, {size:22, color:"good"});
  k.text(l, t("terraHow"), 16, y + 66, {size:11, color:"muted", w:w - 32, max:1});
  y += 104;
  // levels
  W.h3(l, t("charLevels"), 0, y, {w}); y += 22;
  const cols = 4, gap = 8, cw = (w - (cols - 1) * gap) / cols, chh = 96;   // 4 columns, more rows when there are more characters (like the website)
  CHARS.forEach((c, i) => {
    const cx = (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (chh + gap), xp = N.charXp(c.id), lv = P.levelOf(xp), own = N.owns("char_" + c.id);
    k.rect(l, cx, cy, cw, chh, "panel2", {r:10, stroke:own ? c.color : "line", sa:.6, bg:true});
    W.portrait(l, cx + (cw - 50) / 2, cy + 8, 50, c.id, {a:own ? 1 : .4});
    k.text(l, L(c.name), cx + 4, cy + 60, {size:11, w:cw - 8, align:"center", max:1, color:own ? "fg" : "muted"});
    k.text(l, own ? `Lv ${lv}` : "[[lock]]", cx, cy + 75, {font:"monoB", size:11.5, color:own ? c.color : "muted", w:cw, align:"center"});
  });
  y += Math.ceil(CHARS.length / cols) * (chh + gap) + 8;
  // rename
  W.h3(l, t("renameTitle"), 0, y, {w}); y += 20;
  const free = !u.renamed;
  const cost = free ? t("free") : `${PRICE.rename} ${t("gemsWord")}`;
  const rnLab = `${t("rename")} · ${cost}`, rnW = W.btnW(rnLab);
  (UIM.inputs = UIM.inputs || {})["rn-name"] = k.input(l, 0, y, w - rnW - 10, 36, {type:"text", placeholder:u.displayName, key:"rn-name", fontSize:14});
  W.btn(l, "do-rename", w - rnW, y, rnLab, () => N.rename(val("rn-name")), {w:rnW, disabled:N.busy || (!free && u.terra < PRICE.rename)});
  y += 46;
  // appearance: map theme + outfit
  W.h3(l, t("appearance"), 0, y, {w}); y += 22;
  const curT = (() => { try { return localStorage.getItem("p2050-theme") || ""; } catch(e) { return ""; } })();
  const themes = [["", t("themeDefault")], ["night", t("themeNight")], ["paint", t("themePaint")]];
  let tx = 0;
  for (const [id, lab] of themes){
    const own = !id || N.owns("theme_" + id), on = curT === id || (!own && false);
    tx += W.btn(l, "th-" + (id || "def"), tx, y, `${own ? "" : "[[lock]] "}${lab}`, () => { try { localStorage.setItem("p2050-theme", id); } catch(e) {} k.dirty(); }, {kind:on ? "primary" : "ghost", disabled:!own, size:12.5, h:32}) + 6;
  }
  y += 40;
  const curO = P.outfitPref();
  const outs = [["base", t("outfitBase"), true], ["alt", t("outfitAlt"), N.owns("outfit")], ["gold", t("outfitGold"), N.maxLevel() >= 10]];
  tx = 0;
  for (const [id, lab, own] of outs){
    tx += W.btn(l, "of-" + id, tx, y, `${own ? "" : "[[lock]] "}${lab}`, () => { try { localStorage.setItem("p2050-outfit", id); } catch(e) {} k.dirty(); }, {kind:curO === id ? "primary" : "ghost", disabled:!own, size:12.5, h:32}) + 6;
  }
  y += 44;
  y += msgLine(l, y, w);
  const bw = 40;
  W.btn(l, "logout", w - W.btnW(`[[log-out]] ${t("signOut")}`), y, `[[log-out]] ${t("signOut")}`, () => N.logout(), {kind:"ghost"});
  return y + bw;
};

/* ---------------- shop ---------------- */
Screens.subShop = function(l, y, w){
  const N = P.Net;
  if (!N.online){ y += k.text(l, t("netOfflineLong"), 0, y, {size:13, color:"muted", w}).h + 12; return y + back(l, y); }
  if (!N.user){
    y += k.text(l, t("shopLogin"), 0, y, {size:13.5, color:"muted", w}).h + 10;
    W.btn(l, "shop-login", 0, y, `[[log-in]] ${t("signIn")}`, go("account")); y += 46;
    return y + back(l, y);
  }
  W.card(l, 0, y, w, 50, {fill:"panel2"});
  k.text(l, t("balance"), 14, y + 15, {size:12.5, color:"muted"});
  const amt = String(N.user.terra), aw = k.textW(amt, {font:"monoB", size:20}) + 30;
  W.terra(l, w - 14 - aw, y + 12, amt, {size:20, color:"good"});
  y += 60;
  y += k.text(l, t("shopNote"), 0, y, {size:12, color:"muted", w}).h + 10;
  for (const it of SHOP){
    const own = N.owns(it.id), afford = N.user.terra >= it.price;
    const desc = it.kind === "char" ? L(CHAR[it.id.slice(5)].pas) : L(it.desc);
    const lab = own ? `[[check]] ${t("owned2")}` : `[[$gem]] ${it.price}`, bw = W.btnW(lab) + 6;
    const h1 = k.text(l, L(it.name), 56, y + 10, {font:"dispS", size:15, w:w - 56 - bw - 20}).h;
    const h2 = k.text(l, desc, 56, y + 10 + h1, {size:12, color:"muted", w:w - 56 - bw - 20}).h;
    const ch = Math.max(62, h1 + h2 + 20);
    W.card(l, 0, y, w, ch);
    if (it.kind === "char") W.portrait(l, 10, y + (ch - 38) / 2, 38, it.id.slice(5));
    else { k.rect(l, 10, y + (ch - 38) / 2, 38, 38, "accent", {r:9, a:.14}); k.icon(l, it.icon, 19, y + (ch - 20) / 2, 20, "accent"); }
    W.btn(l, "buy-" + it.id, w - 12 - bw, y + (ch - 36) / 2, lab, () => N.buy(it.id), {w:bw, disabled:own || !afford || N.busy, kind:own ? "ghost" : "gold"});
    y += ch + 7;
  }
  y += msgLine(l, y, w);
  return y + back(l, y);
};

/* ---------------- leaderboard ---------------- */
Screens.subBoard = function(l, y, w){
  const N = P.Net, B = N.board || {};
  if (!N.online){ y += k.text(l, t("netOfflineLong"), 0, y, {size:13, color:"muted", w}).h + 12; return y + back(l, y); }
  const mode = N.boardMode || "normal", period = N.boardPeriod || "week";
  const sw = (m, p) => () => { N.boardMode = m; N.boardPeriod = p; N.loadBoard(); k.dirty(); };
  let tw = W.tabs(l, 0, y, [["normal", "mode_normal"], ["hard", "mode_hard"], ["daily", "mode_daily"]].map(([m, key]) => ({id:"bm-" + m, label:t(key), on:mode === m, fn:sw(m, period)})), {size:12.5});
  if (mode !== "daily") W.seg(l, w - 160, y + 1, [{id:"bp-w", label:t("week"), on:period === "week", fn:sw(mode, "week")}, {id:"bp-a", label:t("allTime"), on:period === "all", fn:sw(mode, "all")}], {w:80, h:30, font:"body", fontOn:"bodyB", size:12});
  y += 44;
  if (mode === "daily") y += k.text(l, `${t("dailyToday")} ${new Date().toISOString().slice(0, 10)}`, 0, y, {font:"mono", size:11.5, color:"muted"}).h + 6;
  if (!B.rows) y += k.text(l, B.error ? t("boardFail") : t("netChecking"), 0, y, {size:13, color:"muted"}).h + 10;
  else if (!B.rows.length) y += k.text(l, t("boardEmpty"), 0, y, {size:13, color:"muted"}).h + 10;
  else {
    const END_IC = {win:"trophy", l1:"flame", l2:"megaphone", l3:"timer"};
    B.rows.forEach((r, i) => {
      const me = N.user && r.username === N.user.username, rh = 34;
      k.rect(l, 0, y, w, rh, me ? "accent" : i % 2 ? null : "panel", {r:7, a:me ? .16 : .7, stroke:r.frame ? "gold" : null, sw:1.5, bg:true});
      const medal = i < 3 ? ["#f2c14e", "#c9d3d6", "#d08a52"][i] : null;
      if (medal) k.circle(l, 22, y + rh / 2, 11, medal, {a:.9});
      k.text(l, String(r.rank), 8, y + 8, {font:"monoB", size:12, color:medal ? "#1a1300" : "muted", w:28, align:"center"});
      if (r.char) k.sprite(l, "Portrait", `${r.char}-base`, 44, y + 4, 26, 26);
      k.text(l, r.displayName, 78, y + 7, {font:r.frame ? "bodyB" : "body", size:13, color:r.frame ? "gold" : "fg", w:w - 78 - 150, max:1});
      k.icon(l, END_IC[r.ending] || "circle", w - 140, y + 9, 16, r.ending === "win" ? "good" : "muted");
      k.text(l, Number(r.score).toLocaleString(), w - 118, y + 7, {font:"monoB", size:13, w:108, align:"right"});
      y += rh + 3;
    });
  }
  if (B.me) { y += 6; k.text(l, `${t("yourRank")}: #${B.me.rank} · ${Number(B.me.score).toLocaleString()}`, 0, y, {font:"monoB", size:13, color:"accent"}); y += 26; }
  else if (N.user && B.rows) { y += 6; k.text(l, t("noRankYet"), 0, y, {size:12.5, color:"muted"}); y += 24; }
  y += 8;
  return y + back(l, y);
};

/* ---------------- season & weekly missions (same as the website) ---------------- */
Screens.subSeason = function(l, y, w){
  const N = P.Net, D = N.season, th = S.lang === "th";
  if (!N.online){ y += k.text(l, t("netOfflineLong"), 0, y, {size:13, color:"muted", w}).h + 12; return y + back(l, y); }
  if (!N.user){ y += k.text(l, t("seasonLogin"), 0, y, {size:13.5, color:"muted", w}).h + 10; W.btn(l, "se-login", 0, y, `[[log-in]] ${t("signIn")}`, go("account")); y += 46; return y + back(l, y); }
  if (!D || D.error || !D.season){ y += k.text(l, D && D.error ? t("boardFail") : t("netChecking"), 0, y, {size:13, color:"muted"}).h + 10; return y + back(l, y); }
  const Z = D.season, fmt = d => new Date(d + "T00:00:00+07:00").toLocaleDateString(th ? "th-TH" : "en-GB", {day:"numeric", month:"short"});
  const next = Z.tiers.find(x => !x.reached), prevXp = next ? next.xp - Z.step : Z.tiers.length * Z.step, into = next ? Math.max(0, D.xp - prevXp) : Z.step;
  const ITEM = id => { const it = P.SHOP.find(x => x.id === id); return it ? L(it.name) : id; };
  // head card
  W.card(l, 0, y, w, 98, {r:12});
  k.icon(l, "calendar-check", 14, y + 12, 20, "accent");
  k.text(l, L(Z.name), 42, y + 10, {font:"dispS", size:16, w:w - 200, max:1});
  k.text(l, `${fmt(Z.start)} – ${fmt(Z.end)}`, w - 150, y + 14, {font:"mono", size:11.5, color:"muted", w:136, align:"right"});
  k.text(l, t("seasonXp"), 14, y + 40, {size:12.5, color:"muted"});
  k.text(l, String(D.xp), w - 114, y + 38, {font:"monoB", size:15, color:"accent", w:100, align:"right"});
  W.meter(l, 14, y + 64, w - 28, 7, Math.min(1, into / Z.step), "accent");
  k.text(l, `${next ? `${t("seasonTier")} ${next.tier}: ${into}/${Z.step} XP` : "★"}`, 14, y + 76, {font:"mono", size:11, color:"muted", w:w - 28, max:1});
  y += 106;
  y += k.text(l, t("seasonHow"), 0, y, {size:11.5, color:"muted", w}).h + 12;
  // weekly missions
  y += W.h3(l, `${t("seasonWeekly")} · ${t("seasonEnds")} ${fmt(D.weekly.ends)}`, 0, y, {w}).h + 8;
  for (const m of D.weekly.missions){
    const h = 58, ready = m.done && !m.claimed;
    W.card(l, 0, y, w, h, {r:10, stroke:ready ? "gold" : null});
    k.icon(l, m.claimed ? "circle-check" : ready ? "gift" : "target", 12, y + 18, 22, m.claimed ? "good" : ready ? "gold" : "accent");
    const lab = m.claimed ? `[[check]] ${t("seasonDone")}` : `${m.terra} Terra`, bw = W.btnW(lab, {size:12.5});
    k.text(l, L(m.name), 44, y + 7, {font:"bodyB", size:13, w:w - 44 - bw - 20, max:1});
    W.meter(l, 44, y + 31, w - 44 - bw - 24, 5, m.progress / m.goal, m.claimed ? "good" : "accent");
    k.text(l, `${m.progress}/${m.goal} · +${m.xp} XP`, 44, y + 39, {font:"mono", size:10.5, color:"muted"});
    W.btn(l, "wk-" + m.id, w - 12 - bw, y + (h - 32) / 2, lab, () => N.claimMission(m.id), {kind:ready ? "primary" : "ghost", size:12.5, h:32, disabled:!ready || N.busy, sound:false});
    y += h + 6;
  }
  y += 8;
  // season pass tiers (two per row)
  y += W.h3(l, t("seasonPass"), 0, y, {w}).h + 8;
  const cw = (w - 8) / 2, chh = 56;
  Z.tiers.forEach((x, i) => {
    const cx = (i % 2) * (cw + 8), cy = y + Math.floor(i / 2) * (chh + 6), ready = x.reached && !x.claimed;
    W.card(l, cx, cy, cw, chh, {r:10, stroke:ready ? "gold" : x.claimed ? "good" : null});
    k.text(l, `${t("seasonTier")} ${x.tier} · ${x.xp} XP`, cx + 10, cy + 6, {font:"mono", size:10.5, color:"muted", w:cw - 70, max:1});
    W.terra(l, cx + 10, cy + 24, x.terra, {size:13, color:x.reached ? "good" : "fg"});
    if (x.item) k.text(l, `[[sparkles]] ${ITEM(x.item)}`, cx + 80, cy + 27, {size:10.5, color:"muted", w:cw - 80 - 60, max:1, iconColor:"gold"});
    const lab = x.claimed ? "[[check]]" : x.reached ? t("seasonClaim") : "[[lock]]", bw = W.btnW(lab, {size:12});
    W.btn(l, "tier-" + x.tier, cx + cw - 10 - bw, cy + (chh - 30) / 2, lab, () => N.claimTier(x.tier), {kind:ready ? "primary" : "ghost", size:12, h:30, disabled:!ready || N.busy, sound:false});
  });
  y += Math.ceil(Z.tiers.length / 2) * (chh + 6) + 6;
  y += msgLine(l, y, w);
  return y + back(l, y);
};

/* ---------------- settings ---------------- */
Screens.subSettings = function(l, y, w){
  const th = S.lang === "th", row = (ic, label) => { k.icon(l, ic, 0, y + 7, 18, "accent"); k.text(l, label, 28, y + 6, {size:13.5, w:150, max:1}); };
  row("languages", th ? "ภาษา" : "Language"); W.langSeg(l, w - 80, y + 1); y += 44;
  y += W.vol(l, 0, y, w) + 12;
  row("monitor", t("gfxLbl"));
  const G = P.Gfx, items = [["low", "gfxLow"], ["high", "gfxHigh"]].map(([id, key]) => ({id:"gfx-" + id, label:t(key), on:G.level === id, fn:() => { Audio.play("click"); G.set(id); k.dirty(); }}));
  W.seg(l, w - 180, y + 1, items, {w:90, h:30, font:"body", fontOn:"bodyB", size:12.5}); y += 38;
  y += k.text(l, th ? "ต่ำ: ปิดเครื่องบิน เรือ และแสงควันบนแผนที่ เหมาะกับเครื่องที่ช้าหรือแบตใกล้หมด" : "Low: no planes, ships or smoke glows on the map, for slow devices or a low battery.", 28, y, {size:11.5, color:"muted", w:w - 28}).h + 14;
  if (W.a11yRows){ y += 4; y += W.a11yRows(l, 0, y, w) + 8; }
  const ver = `${t("updVer")} ${P.VERSION_NAME || (P.CHANGELOG && P.CHANGELOG[0] ? P.CHANGELOG[0].v : "")}`;
  W.btn(l, "set-ver", 0, y, ver, go("updates"), {kind:"ghost", size:12.5, h:32}); y += 44;
  return y + back(l, y);
};

/* ---------------- certificate ---------------- */
Screens.subCert = function(l, y, w){
  const N = P.Net, C = N.certs || {};
  if (!N.online){ y += k.text(l, t("netOfflineLong"), 0, y, {size:13, color:"muted", w}).h + 12; return y + back(l, y); }
  if (!N.user){ y += k.text(l, t("certLogin"), 0, y, {size:13.5, color:"muted", w}).h + 10; W.btn(l, "cert-login", 0, y, `[[log-in]] ${t("signIn")}`, go("account")); y += 46; return y + back(l, y); }
  y += k.text(l, t("certIntro"), 0, y, {size:13, color:"muted", w}).h + 10;
  const el = C.eligibility;
  if (!el) y += k.text(l, t("netChecking"), 0, y, {size:13, color:"muted"}).h + 10;
  else {
    const row = (ok, txt) => { y += k.text(l, `[[${ok ? "circle-check" : "circle"}]] ${txt}`, 0, y, {size:13, color:ok ? "good" : "muted", w, iconColor:ok ? "good" : "muted"}).h + 4; };
    row(el.wins >= 1, `${t("certCondWin")} (${el.wins})`);
    row(el.cards >= el.needCards, `${t("certCondCards")} ${el.needCards} (${el.cards})`);
    y += 8;
    if (el.eligible){
      y += k.text(l, t("certNameHelp"), 0, y, {size:12, color:"muted", w}).h + 6;
      y += field(l, y, w, "ct-name", t("fFullName"), "text", t("fFullNamePh"));
      y += W.check(l, "ct-consent", 0, y, w, !!UIM.certConsent, t("certConsent"), () => { UIM.certConsent = !UIM.certConsent; k.dirty(); }) + 8;
      W.btn(l, "do-cert", 0, y, `[[award]] ${t("certRequest")}`, () => {
        const nm = val("ct-name"); if (nm.length < 3){ UIM.msg = t("certNameShort"); UIM.err = true; k.dirty(); return; }
        if (!UIM.certConsent){ UIM.msg = t("needConsent"); UIM.err = true; k.dirty(); return; }
        N.requestCert(nm);
      }, {w, h:40, kind:"gold", disabled:N.busy});
      y += 48;
    }
  }
  y += msgLine(l, y, w);
  if (C.list && C.list.length){
    W.h3(l, t("certMine"), 0, y, {w}); y += 22;
    for (const c of C.list){
      W.card(l, 0, y, w, 58);
      k.text(l, c.fullName, 12, y + 7, {font:"bodyB", size:14, w:w - 150, max:1});
      k.text(l, `${t("certCode")} ${c.code} · ${new Date(c.issuedAt).toLocaleDateString(S.lang === "th" ? "th-TH" : "en-GB")}`, 12, y + 31, {font:"mono", size:11, color:"muted", w:w - 150, max:1});
      W.btn(l, "pdf-" + c.code, w - 132, y + 11, `[[download]] PDF`, () => window.open(N.certUrl(c.code), "_blank"), {w:120, kind:"ghost"});
      y += 64;
    }
  }
  return y + back(l, y);
};

/* ---------------- achievements list (used by the menu and the learning page) ---------------- */
/* 3.x: update log (newest first; the latest version open, older ones as one line) */
Screens.subUpdates = function(l, y, w){
  (P.CHANGELOG || []).forEach((v, i) => {
    const items = L(v.items) || [];
    k.text(l, `${v.v} · ${L(v.name) || ""}`, 0, y, {font:"dispS", size:16, color:i === 0 ? "accent" : "fg", w}); 
    k.text(l, v.date || "", w - 90, y + 3, {font:"mono", size:11, color:"muted", w:90, align:"right"}); y += 24;
    if (i < 2) for (const it of items){ k.text(l, "•", 4, y, {size:12.5, color:"muted"}); y += k.text(l, it, 18, y, {size:12.5, w:w - 18, lh:1.4}).h + 4; }
    y += 10;
  });
  return y + back(l, y);
};
Screens.achList = function(l, x, y0, w){
  const d = P.AchStore.data, n = P.Ach.count(), pct = Math.round(n / ACH.length * 100);
  let y = y0;
  W.runs(l, x, y, [[String(n), {font:"disp", size:22}], [` / ${ACH.length} · ${pct}%`, {size:13, color:"muted"}]]); y += 32;
  W.meter(l, x, y, w, 5, pct / 100, "accent"); y += 14;
  const cw = (w - 8) / 2, loc = S.lang === "th" ? "th-TH" : "en-GB";
  let col = 0, rowH = 0, rowY = y;
  ACH.forEach((a, i) => {
    const got = d.got[a.id], secret = a.hidden && !got, p = a.prog && !got ? a.prog(d) : null;
    const cx = x + col * (cw + 8), alpha = got ? 1 : .62;
    let ty = rowY + 9;
    ty += k.text(l, secret ? t("achSecret") : L(a.t), cx + 64, ty, {font:"bodyB", size:13.5, w:cw - 74, a:alpha}).h;
    ty += k.text(l, secret ? "???" : L(a.d), cx + 64, ty, {size:12, color:"muted", lh:1.35, w:cw - 74, a:alpha}).h;
    if (got){ ty += k.text(l, `${t("achOn")} ${new Date(got).toLocaleDateString(loc, {dateStyle:"medium"})}`, cx + 64, ty + 1, {font:"mono", size:11, color:"warn"}).h; }
    if (p){ W.meter(l, cx + 64, ty + 4, cw - 74, 5, Math.min(1, p[0] / p[1]), "accent"); ty += 10; ty += k.text(l, `${Math.min(p[0], p[1])} / ${p[1]}`, cx + 64, ty, {font:"mono", size:11, color:"warn", a:alpha}).h; }
    const hh = Math.max(64, ty - rowY + 9);
    a._h = hh; a._x = cx; a._y = rowY;
    rowH = Math.max(rowH, hh);
    if (got) k.hgrad(l, cx + 10, rowY + 10, 44, 44, [[0, "#f2b441"], [1, "#e0612f"]], {r:9});
    else k.rect(l, cx + 10, rowY + 10, 44, 44, "panel2", {r:9, stroke:"line", a:alpha});
    k.icon(l, secret ? "lock" : a.icon, cx + 21, rowY + 21, 22, got ? "#2b1300" : "muted", got ? 1 : alpha);
    col++;
    if (col === 2 || i === ACH.length - 1){
      for (let j = i - col + 1; j <= i; j++){ const b = ACH[j]; k.rect(l, b._x, b._y, cw, rowH, "panel", {r:10, a:.92, stroke:"line", under:true}); }
      rowY += rowH + 8; rowH = 0; col = 0;
    }
  });
  return rowY - y0;
};

/* ---------------- achievement toast ---------------- */
Screens.toastLayerSetup = function(){ UIM.toast = null; UIM.toastT = 0; const l = k.L("Toast"); if (l) l.setOffset(0, 0); };
Screens.toastUpdate = function(dt){
  const l = k.L("Toast"); if (!l) return;
  // wait while a window is open (except the end screen, where the toast shows top-left)
  const kind = UIM.kind();
  if (!UIM.toast && UIM.toastQ.length && (!kind || kind === "end")){ UIM.toast = UIM.toastQ.shift(); UIM.toastT = 0; Audio.play("done"); l.dirty = true; }
  if (!UIM.toast) return;
  UIM.toastT += dt;
  const T = UIM.toastT, inT = .35, hold = 4.2, outT = .4;
  let f = T < inT ? T / inT : T < hold ? 1 : Math.max(0, 1 - (T - hold) / outT);
  f = 1 - Math.pow(1 - f, 3);
  l.setOffset((1 - f) * 380, 0); l.setAlpha(f);
  if (T > hold + outT){ UIM.toast = null; l.dirty = true; }
};
Screens.renderToast = function(l){
  const a = UIM.toast; if (!a) return;
  const w = 340, end = UIM.kind() === "end", x = end ? 16 : (k.W - 16) - w, h = 78, y = end ? 16 : this.kind === "game" ? k.H - 130 - h - 8 : k.H - 16 - h;
  k.rect(l, x, y, w, h, "panel", {r:12, stroke:"warn", sa:.6, bg:true});
  k.hgrad(l, x + 12, y + 13, 52, 52, [[0, "#f2b441"], [1, "#e0612f"]], {r:10});
  k.icon(l, a.icon, x + 25, y + 26, 26, "#2b1300");
  k.text(l, P.up(a.msg ? a.title : t("achUnlocked")), x + 76, y + 10, {size:11, color:"warn"});
  k.text(l, a.msg ? a.msg : L(a.t), x + 76, y + 26, {font:"dispS", size:16, w:w - 88, max:1});
  if (!a.msg) k.text(l, L(a.d), x + 76, y + 50, {size:12, color:"muted", w:w - 88, max:1});
};

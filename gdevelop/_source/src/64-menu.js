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
  const w = 440, x = (1280 - w) / 2, y = 210, p = this._ldShown || 0;
  k.sprite(l, "Logo", "Logo", (1280 - 150) / 2, y - 120, 150, 150);
  k.text(l, "GLOBAL CLIMATE TASKFORCE · 2026 – 2050", x, y + 40, {font:"mono", size:11, color:"accent", w, align:"center"});
  const parts = [["PROJECT ", {font:"logo", size:52}], [":", {font:"logo", size:52, color:"accent"}], [" 2050", {font:"logo", size:52}]];
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
    k.hit(l, "enterAll", 0, 0, 1280, 720, () => { Audio.play("start"); Screens.goScene("Menu"); }, {cursor:false});
    l.hits.unshift(l.hits.pop());
  }
  k.text(l, t("disclaimer"), 0, 690, {size:11.5, color:"muted", w:1280, align:"center"});
};

/* ---------------- main menu ---------------- */
const SUBW = {load:430, ach:640, account:480, shop:640, board:640, cert:540};
Screens.renderMenu = function(l){
  if (this.kind !== "menu"){ k.clearSlave("MenuScroll"); return; }
  const sub = UIM.sub, w = SUBW[sub] || 430, x = 56;
  const shade = (this.scene.getObjects("MenuShade") || [])[0];
  if (shade) shade.setWidth((w + (w > 430 ? 420 : 200)) * k.K);
  let ch = 0; UIM._googleRect = null;
  k.slave("MenuScroll", s => {
    ch = this.menuCard(s, w);
    const top = Math.max(16, (720 - ch) / 2);
    s.frame(x, top, {x:0, y:0, w:x + w + 40, h:720}, ch + Math.max(0, top - 16));
  });
  if (P.Net) P.Net.googleOverlay(UIM._googleRect);
  this.accountChip(l);
};
/* top-right: account + Terra, or a sign-in button */
Screens.accountChip = function(l){
  const N = P.Net, y = 16;
  if (!N.online){
    const txt = N.checking ? t("netChecking") : `[[wifi-off]] ${t("netOffline")}`, w = k.textW(txt, {size:12}) + 26;
    k.rect(l, 1264 - w, y, w, 32, "glass", {r:16, stroke:"line", a:.9, bg:true});
    k.text(l, txt, 1264 - w + 13, y + 6, {size:12, color:"muted", iconColor:"muted"});
    return;
  }
  if (!N.user){
    const lab = `[[log-in]] ${t("signIn")}`, w = W.btnW(lab);
    W.btn(l, "chip-login", 1264 - w, y, lab, () => { UIM.sub = "account"; UIM.accTab = "login"; UIM.msg = ""; k.dirty(); });
    return;
  }
  const name = N.user.displayName, tw = k.textW(name, {font:"bodyB", size:13}), terra = String(N.user.terra);
  const w = 16 + tw + 16 + 22 + k.textW(terra, {font:"monoB", size:14}) + 16, id = "chip-acc", hov = k.isHover(l, id);
  k.rect(l, 1264 - w, y, w, 36, "glass", {r:18, stroke:hov ? "accent" : "line", a:.92, bg:true});
  k.text(l, name, 1264 - w + 16, y + 7, {font:"bodyB", size:13});
  W.terra(l, 1264 - w + 16 + tw + 16, y + 8, terra, {size:14, color:"good"});
  k.hit(l, id, 1264 - w, y, w, 36, () => { Audio.play("click"); UIM.sub = "account"; UIM.msg = ""; k.dirty(); });
};
const back = (l, y) => { W.btn(l, "back", 0, y, t("mBack"), () => { UIM.sub = null; UIM.msg = ""; k.dirty(); const s = k.L("MenuScroll"); if (s) s.scroll = 0; }, {kind:"ghost"}); return 36; };
const msgLine = (l, y, w) => UIM.msg ? k.text(l, UIM.msg, 0, y, {size:12.5, color:UIM.err ? "bad" : "good", w}).h + 8 : 0;
const go = sub => () => { UIM.sub = sub; UIM.msg = ""; UIM.err = false; const s = k.L("MenuScroll"); if (s) s.scroll = 0; if (sub === "board") P.Net.loadBoard(); if (sub === "cert") P.Net.loadCerts(); if (sub === "shop" || sub === "account") P.Net.refresh(); k.dirty(); };

Screens.menuCard = function(l, w){
  const sub = UIM.sub; let y = 0;
  k.text(l, "GLOBAL CLIMATE TASKFORCE · 2026 – 2050", 0, y, {font:"mono", size:11.5, color:"accent"}); y += 22;
  W.runs(l, 0, y, [["PROJECT ", {font:"logo", size:46, lh:1}], [":", {font:"logo", size:46, color:"accent", lh:1}], [" 2050", {font:"logo", size:46, lh:1}]]); y += 46 + 12;
  const TITLES = {load:"mLoad", ach:"mAch", account:"mAccount", shop:"mShop", board:"mBoard", cert:"mCert"};
  const tag2 = sub ? t(TITLES[sub]) : t("mDesc");
  y += k.text(l, tag2, 0, y, {size:sub ? 17 : 14, font:sub ? "dispS" : "body", color:sub ? "fg" : "muted", w:Math.min(w, 400)}).h + 14;
  if (sub === "load") y = this.subLoad(l, y, w);
  else if (sub === "ach"){ y += this.achList(l, 0, y, w) + 12; y += back(l, y); }
  else if (sub === "account") y = this.subAccount(l, y, w);
  else if (sub === "shop") y = this.subShop(l, y, w);
  else if (sub === "board") y = this.subBoard(l, y, w);
  else if (sub === "cert") y = this.subCert(l, y, w);
  else {
    const saves = P.readSaves(), auto = saves && saves.auto, n = P.Ach.count();
    const items = [
      {id:"new", ic:"globe", t1:t("mNew"), t2:t("mNewS"), primary:!auto, fn:() => Screens.newGame()},
      {id:"continue", ic:"play", t1:t("mCont"), t2:auto ? `${P.dateStr(auto.meta.tick)} · ΔT +${auto.meta.temp.toFixed(2)}°C · ${auto.meta.net.toFixed(1)} Gt` : t("mNoSave"), primary:!!auto, dis:!auto, fn:() => { const s2 = P.readSaves(); if (s2 && s2.auto && !Screens.loadSave(s2.auto.S)){ UIM.msg = t("oldSave"); UIM.err = true; k.dirty(); } }},
    ];
    for (const it of items){
      const hh = 54, hov = !it.dis && k.isHover(l, it.id);
      const fill = it.primary ? (hov ? k.mix("accent", "#ffffff", .2) : "accent") : "panel";
      k.rect(l, 0, y, w, hh, fill, {r:12, a:it.primary ? 1 : .92, stroke:it.primary ? "accent" : hov ? "accent" : "line", bg:true});
      const a = it.dis ? .45 : 1, ink = it.primary ? "ink" : "fg";
      k.icon(l, it.ic, 16, y + (hh - 22) / 2, 22, it.primary ? "ink" : "accent", a);
      k.text(l, it.t1, 54, y + 5, {font:"dispS", size:17, color:ink, a});
      k.text(l, it.t2, 54, y + 30, {font:"mono", size:12, color:it.primary ? "ink" : "muted", a:it.primary ? .75 : a, w:w - 70, max:1});
      k.hit(l, it.id, 0, y, w, hh, () => { Audio.play("click"); it.fn(); }, {disabled:!!it.dis});
      y += hh + 7;
    }
    y += msgLine(l, y, w);
    const tiles = [
      {id:"loadmenu", ic:"save", t1:t("mLoad"), fn:go("load")},
      {id:"learn", ic:"book-open", t1:t("mLearn"), t2:`${P.cardCount()}/${P.cardTotal()}`, fn:() => Screens.openLearn("cards")},
      {id:"ach", ic:"trophy", t1:t("mAch"), t2:`${n}/${ACH.length}`, fn:go("ach")},
      {id:"tutorial", ic:"graduation-cap", t1:t("mHow"), fn:() => Screens.openTutorial(0, false)},
      {id:"shop", ic:"shopping-bag", t1:t("mShop"), fn:go("shop")},
      {id:"board", ic:"medal", t1:t("mBoard"), fn:go("board")},
      {id:"cert", ic:"award", t1:t("mCert"), fn:go("cert")},
      {id:"account", ic:"user-round", t1:P.Net.user ? t("mAccount") : t("signIn"), fn:go("account")},
    ];
    const tw = (w - 7) / 2, th = 48;
    tiles.forEach((it, i) => {
      const tx = (i % 2) * (tw + 7), ty = y + Math.floor(i / 2) * (th + 7), hov = k.isHover(l, it.id);
      k.rect(l, tx, ty, tw, th, "panel", {r:11, a:.92, stroke:hov ? "accent" : "line", bg:true});
      k.icon(l, it.ic, tx + 14, ty + 14, 20, "accent");
      k.text(l, it.t1, tx + 44, ty + 12, {font:"dispS", size:14.5, w:tw - 54 - (it.t2 ? 50 : 0), max:1});
      if (it.t2) k.text(l, it.t2, tx + tw - 60, ty + 15, {font:"mono", size:11, color:"muted", w:50, align:"right"});
      k.hit(l, it.id, tx, ty, tw, th, () => { Audio.play("click"); it.fn(); });
    });
    y += Math.ceil(tiles.length / 2) * (th + 7);
  }
  y += 12;
  k.line(l, 0, y, w, y, "line"); y += 12;
  k.text(l, P.up(t("teamK")), 0, y, {font:"mono", size:10.5, color:"muted"}); y += 18;
  y += k.text(l, t("team"), 0, y, {font:"dispS", size:14, lh:1.35, w}).h + 2;
  y += k.text(l, t("disclaimer"), 0, y, {size:11.5, color:"muted", w}).h + 12;
  y += W.vol(l, 0, y, w) + 10;
  const ft = k.text(l, t("mTag"), 0, y + 6, {size:11.5, color:"muted", w:w - 96});
  W.langSeg(l, w - 80, y);
  y += Math.max(30, ft.h + 6);
  return y + 10;
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
    W.btn(l, "load-" + slot, w - 12 - bw, y + (sh - 36) / 2, t("load"), () => { const s2 = P.readSaves(); if (s2 && s2[slot]) Screens.loadSave(s2[slot].S); }, {disabled:!ok});
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
      W.btn(l, "cload-" + slot, w - 12 - bw, y + (sh - 36) / 2, t("load"), () => P.Net.cloudLoad(slot).then(st => { if (!st || !Screens.loadSave(st)){ UIM.msg = t("codeBad"); UIM.err = true; k.dirty(); } }), {disabled:!c, kind:"ghost"});
      y += sh + 7;
    }
  }
  y += 6;
  k.text(l, t("codePaste"), 0, y, {size:12, color:"muted"}); y += 20;
  const inp = k.input(l, 0, y, w, 70, {placeholder:"P2050:...", key:"code"});
  y += 78;
  const bw = W.btn(l, "import", 0, y, t("codeLoad"), () => {
    const o = P.importCode(inp.getString ? inp.getString() : "");
    if (!Screens.loadSave(o)){ UIM.msg = t("codeBad"); UIM.err = true; Audio.play("error"); k.dirty(); }
  }, {kind:"ghost"});
  if (UIM.msg) k.text(l, UIM.msg, bw + 12, y + 2, {size:12.5, color:UIM.err ? "bad" : "good", w:w - bw - 12});
  y += 36 + 14;
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
      const sl = k.L("MenuScroll");
      UIM._googleRect = {x:sl.ox, y:y + sl.oy, w:Math.min(w, 320), h:44, clip:sl.clip};
      k.rect(l, 0, y, Math.min(w, 320), 44, "panel2", {r:8, stroke:"line"});
      k.text(l, t("googleLoading"), 0, y + 12, {size:12, color:"muted", w:Math.min(w, 320), align:"center"});
      y += 54;
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
  const cw = (w - 3 * 8) / 4;
  CHARS.forEach((c, i) => {
    const cx = i * (cw + 8), xp = N.charXp(c.id), lv = P.levelOf(xp), own = N.owns("char_" + c.id);
    k.rect(l, cx, y, cw, 92, "panel2", {r:10, stroke:own ? c.color : "line", sa:.6, bg:true});
    W.portrait(l, cx + (cw - 48) / 2, y + 6, 48, c.id, {a:own ? 1 : .4});
    k.text(l, L(c.name), cx, y + 56, {size:11, w:cw, align:"center", max:1, color:own ? "fg" : "muted"});
    k.text(l, own ? `Lv ${lv}` : "[[lock]]", cx, y + 72, {font:"mono", size:11, color:own ? c.color : "muted", w:cw, align:"center"});
  });
  y += 104;
  // rename
  W.h3(l, t("renameTitle"), 0, y, {w}); y += 20;
  const free = !u.renamed;
  const cost = free ? t("free") : `${PRICE.rename} Terra`;
  (UIM.inputs = UIM.inputs || {})["rn-name"] = k.input(l, 0, y, w - 150, 36, {type:"text", placeholder:u.displayName, key:"rn-name", fontSize:14});
  W.btn(l, "do-rename", w - 140, y, `${t("rename")} · ${cost}`, () => N.rename(val("rn-name")), {w:140, disabled:N.busy || (!free && u.terra < PRICE.rename)});
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
  const bw = back(l, y);
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
    const lab = own ? `[[check]] ${t("owned2")}` : `[[terra]] ${it.price}`, bw = W.btnW(lab) + 6;
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
  const w = 340, end = UIM.kind() === "end", x = end ? 16 : 1264 - w, h = 78, y = end ? 16 : this.kind === "game" ? 720 - 130 - h - 8 : 720 - 16 - h;
  k.rect(l, x, y, w, h, "panel", {r:12, stroke:"warn", sa:.6, bg:true});
  k.hgrad(l, x + 12, y + 13, 52, 52, [[0, "#f2b441"], [1, "#e0612f"]], {r:10});
  k.icon(l, a.icon, x + 25, y + 26, 26, "#2b1300");
  k.text(l, P.up(a.msg ? a.title : t("achUnlocked")), x + 76, y + 10, {size:11, color:"warn"});
  k.text(l, a.msg ? a.msg : L(a.t), x + 76, y + 26, {font:"dispS", size:16, w:w - 88, max:1});
  if (!a.msg) k.text(l, L(a.d), x + 76, y + 50, {size:12, color:"muted", w:w - 88, max:1});
};

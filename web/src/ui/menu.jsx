/* Home screen: 3D globe + menu panel (new game / continue / load / learning / achievements / how to play /
   shop / leaderboard / certificate / account) */
import {useEffect, useRef, useState} from "preact/hooks";
import {P, S, UIM, t, L, up, bump, small} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Globe} from "../globe.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, IconBtn, Tabs, Seg, Check, Terra, Portrait, Volume, GfxSeg, A11ySeg, NarrRow, LangSeg, Msg, H3, SlotInfo} from "./widgets.jsx";
import {SlotRow, ClearSlots} from "./modals.jsx";
import {AchList} from "./learn.jsx";

const N = () => P.Net;
const goSub = sub => () => {
  UIM.sub = sub; UIM.msg = ""; UIM.err = false;
  const p = document.querySelector(".menu-panel .scroll"); if (p) p.scrollTop = 0;
  if (sub === "board") N().loadBoard(); if (sub === "cert") N().loadCerts(); if (sub === "season") N().loadSeason(); if (sub === "shop" || sub === "account") N().refresh();
  bump();
};
const goBack = () => { UIM.sub = null; UIM.msg = ""; bump(); };
const Back = () => null;   // 1.5.4: every sub-page has its back button at the top (SubHead)
function SubHead({title}){
  return <div class="subhead"><IconBtn n="arrow-left" title={t("mBack")} sound="close" onClick={goBack}/><h2>{title}</h2></div>;
}
const Offline = () => <><p class="muted">{t("netOfflineLong")}</p><Back/></>;

/* the globe lives outside Preact so it survives re-renders */
function GlobeView(){
  const ref = useRef();
  useEffect(() => {
    const cv = ref.current;
    if (!G.globe){ G.globe = new Globe(cv, {small:small(), onReady:() => cv.classList.add("ready")}); }
    else { cv.replaceWith(G.globe.canvas); ref.current = G.globe.canvas; G.globe.canvas.classList.add("ready"); }
    const gl = G.globe, fit = () => { const w = window.innerWidth, h = window.innerHeight; if (w >= 900) gl.setFrame(.2, 0, w / h > 1.9 ? 3.6 : 4.0); else if (w > h) gl.setFrame(.22, 0, 4.4); else gl.setFrame(0, -.2, 5.4); };
    fit(); window.addEventListener("resize", fit);
    gl.setHeat(0); gl.start();
    return () => { window.removeEventListener("resize", fit); gl.stop(); };
  }, []);
  return <canvas ref={ref} class="globe" aria-label="Earth"/>;
}

export function Menu(){
  const sub = UIM.sub;
  const TITLES = {load:"mLoad", ach:"mAch", account:"mAccount", shop:"mShop", board:"mBoard", cert:"mCert", updates:"mUpd", season:"mSeason", settings:"mSettings"};
  return <div class={"home " + (UIM.transition ? "leaving" : "")}>
    <GlobeView/>
    <div class="home-vignette"/>
    <AccountChip/>
    <section class={"menu-panel glass-strong " + (sub ? "sub" : "")}>
      <div class="scroll">
        {sub ? <SubHead title={t(TITLES[sub])}/> : <div class="logo">
          <img src="assets/img/ui/logo.png" alt="" width="54" height="54"/>
          <div><small class="mono acc">GLOBAL CLIMATE TASKFORCE · 2026 – 2050</small><h1>PROJECT <b>ZERO</b></h1></div>
        </div>}
        {!sub ? <div class="sdgtag"><img src="assets/img/sdg/goal-13.svg" alt="SDG 13" width="38" height="38"/><span>{t("mTag")}</span></div> : null}
        {!sub && N().cfg && N().cfg.announcement && L(N().cfg.announcement) ? <div class="announce card"><Icon n="megaphone" size={18} color="warn"/><span>{L(N().cfg.announcement)}</span></div> : null}
        {sub === "load" ? <SubLoad/> : sub === "ach" ? <><Btn kind="ghost" block onClick={goSub("cert")}>{`[[award]] ${t("mCert")}`}</Btn><AchList/></> : sub === "account" ? <SubAccount/> : sub === "shop" ? <SubShop/> : sub === "board" ? <SubBoard/> : sub === "cert" ? <SubCert/> : sub === "updates" ? <SubUpdates/> : sub === "season" ? <SubSeason/> : sub === "settings" ? <SubSettings/> : <Main/>}
        {sub ? null : <footer class="mfooter">
          <small class="mono muted">{up(t("teamK"))}</small>
          <p class="team">{t("team")}</p>
          <small class="muted credits">{t("disclaimer")} · Earth imagery: NASA Visible Earth · Sounds &amp; music: CC0 / CC-BY</small>
        </footer>}
      </div>
    </section>
  </div>;
}

function Main(){
  const saves = P.readSaves(), lk = P.latestSlot(), auto = lk && saves[lk], n = P.Ach.count(), world = P.worldUnlocked();
  const dock = [
    {id:"load", ic:"save", t1:t("mLoadS"), fn:goSub("load")},
    {id:"learn", ic:"book-open", t1:t("mLearnS"), fn:() => G.openLearn("cards")},
    {id:"how", ic:"graduation-cap", t1:t("mHowS"), fn:() => G.openTutorial(0, false)},
    {id:"ach", ic:"trophy", t1:t("mAchS"), badge:`${n}/${P.ACH.length}`, fn:goSub("ach")},
    {id:"season", ic:"calendar-check", t1:t("mSeasonS"), dot:N().seasonReady && N().seasonReady(), fn:goSub("season")},
    {id:"board", ic:"medal", t1:t("mBoardS"), fn:goSub("board")},
    {id:"shop", ic:"shopping-bag", t1:t("mShopS"), fn:goSub("shop")},
    {id:"settings", ic:"settings", t1:t("mSettingsS"), fn:goSub("settings")},
  ];
  const big = (cls, ic, title, sub, fn, dis) => <button type="button" class={"bigbtn " + cls} disabled={dis} onPointerEnter={() => !dis && Audio.hover()} onClick={() => { Audio.play("start"); fn(); }}>
    <Icon n={ic} size={26}/><span><b>{title}</b>{sub ? <small class="mono">{sub}</small> : null}</span><Icon n="chevron-right" size={20} cls="chev"/>
  </button>;
  return <>
    <WhatsNew/>
    <div class="bigbtns">
      {auto ? big("primary", "play", t("mCont"), `${P.modeName(auto.meta)} · ${P.dateStr(auto.meta.tick)}`, () => G.loadSlot(lk)) : big("primary", "globe", t("mNew"), null, () => G.newGame())}
      <div class="bigrow">
        {auto ? big("half", "globe", t("mNew"), null, () => G.newGame()) : null}
        {big("half world " + (world ? "" : "locked"), world ? "infinity" : "lock", t("mWorldS2"), null, () => G.newGame(true), !world)}
      </div>
    </div>
    <Msg UIM={UIM}/>
    <div class="dock">{dock.map(it => <button type="button" key={it.id} class="dk" onPointerEnter={() => Audio.hover()} onClick={() => { Audio.play("click"); it.fn(); }}>
      <span class="dki"><Icon n={it.ic} size={24} color="accent"/>{it.dot ? <i class="dkdot"/> : null}</span><span class="dkl">{it.t1}</span>
    </button>)}</div>
  </>;
}

/* 1.5.4: everything adjustable in one place */
function SubSettings(){
  return <div class="setlist">
    <div class="setrow"><Icon n="languages" size={18}/><span class="lbl">{S.lang === "th" ? "ภาษา" : "Language"}</span><LangSeg/></div>
    <Volume/>
    <GfxSeg/>
    <A11ySeg/>
    <NarrRow/>
    <button type="button" class="linkbtn mono" onClick={() => { Audio.play("click"); goSub("updates")(); }}>{`${t("updVer")} ${P.VERSION_NAME}`}</button>
  </div>;
}

/* ---------------- update log ---------------- */
const SEEN_KEY = "p2050.seenVersion";
const seenVer = () => { try { return localStorage.getItem(SEEN_KEY); } catch (e){ return null; } };
function WhatsNew(){
  const c = P.CHANGELOG[0], fresh = seenVer() !== P.VERSION_NAME;
  return <button type="button" class={"whatsnew " + (fresh ? "fresh" : "")} onPointerEnter={() => Audio.hover()} onClick={() => { Audio.play("click"); goSub("updates")(); }}>
    <Icon n="sparkles" size={16} color="accent"/><b class="mono">v{P.VERSION_NAME}</b><span>{L(c.name)}</span>{fresh ? <i class="newdot">NEW</i> : null}
  </button>;
}
function SubUpdates(){
  useEffect(() => { try { localStorage.setItem(SEEN_KEY, P.VERSION_NAME); } catch (e){} }, []);
  const lang = S.lang === "en" ? "en" : "th";
  const fmt = d => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {day:"numeric", month:"short", year:"numeric"}); };
  return <>
    <div class="updlog">{P.CHANGELOG.map((c, i) => <article key={c.v} class={"upd " + (i === 0 ? "latest" : "")}>
      <header><b class="mono">{c.v}</b><h4>{L(c.name)}</h4><small class="muted">{fmt(c.date)}</small></header>
      {(c.subs || []).map(u => <section class="updsub" key={u.v}>
        <header><b class="mono">{u.v}</b><small class="muted">{fmt(u.date)}</small></header>
        <ul>{u.items[lang].map((x, j) => <li key={j}>{x}</li>)}</ul>
      </section>)}
      <ul>{c.items[lang].map((x, j) => <li key={j}>{x}</li>)}</ul>
    </article>)}</div>
    <Back/>
  </>;
}

function AccountChip(){
  const n = N();
  if (!n.online) return <div class="acct glass muted">{n.checking ? t("netChecking") : <Rich t={`[[wifi-off]] ${t("netOffline")}`} iconColor="inherit"/>}</div>;
  if (!n.user) return <div class="acct"><Btn onClick={() => { UIM.accTab = "login"; goSub("account")(); }}>{`[[log-in]] ${t("signIn")}`}</Btn></div>;
  return <button type="button" class="acct glass on" onClick={() => { Audio.play("click"); goSub("account")(); }}><b>{n.user.displayName}</b><Terra n={n.user.terra} cls="good"/></button>;
}

/* ---------------- load ---------------- */
function SubLoad(){
  const saves = P.readSaves();
  return <>
    {saves === null ? <p class="bad">{t("noStore")}</p> : <><div class="slots">{P.SLOTS.map(slot => <SlotRow key={slot} slot={slot} saves={saves}/>)}</div><ClearSlots saves={saves}/></>}
    <Msg UIM={UIM}/>
    <Back/>
  </>;
}

/* ---------------- account ---------------- */
function Field({label, type = "text", ph = "", name, autocomplete}){
  return <label class="field"><span>{label}</span><input name={name} type={type} placeholder={ph} autoComplete={autocomplete} spellcheck={false}/></label>;
}
const form = e => Object.fromEntries(new FormData(e.currentTarget).entries());
/* our own Google button (no white frame): Google's real button sits on top, invisible, so the click still goes through Google's sign-in */
const GLOGO = <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
function GoogleBtn(){
  const ref = useRef();
  useEffect(() => {
    const n = N(); let t0 = null;
    const place = () => { if (n._gDiv && ref.current){ ref.current.appendChild(n._gDiv); n._gDiv.style.display = "block"; n._gDiv.style.position = "static"; return true; } return false; };
    if (!place()) t0 = setInterval(() => { if (place()) clearInterval(t0); }, 400);
    return () => { clearInterval(t0); if (n._gDiv){ n._gDiv.style.display = "none"; document.body.appendChild(n._gDiv); } };
  }, []);
  const ready = N()._gReady;
  return <div class={"gbtn " + (ready ? "ready" : "")} onPointerEnter={() => ready && Audio.hover()}>
    <div class="gface" aria-hidden="true">{GLOGO}<span>{ready ? t("googleContinue") : t("googleLoading")}</span></div>
    <div class="ghit" ref={ref}/>
  </div>;
}
function SubAccount(){
  const n = N();
  if (!n.online) return <Offline/>;
  if (!n.user && n.pendingGoogle){
    /* signed in with Google but no username yet: show only this step, so the normal sign-in forms don't confuse anyone */
    return <>
      <div class="card gdone"><b><Rich t={`[[circle-check]] ${t("gSignedIn")}`} iconColor="good"/></b><span class="muted">{t("googlePickName")}</span></div>
      <form class="form" onSubmit={e => { e.preventDefault(); const f = form(e); if (!UIM.consent){ UIM.msg = t("needConsent"); UIM.err = true; bump(); return; } n.googleComplete((f.user || "").trim()); }}>
        <Field label={t("fUsername")} name="user" ph="a–z 0–9 _ (3–16)" autocomplete="username"/>
        <Check on={!!UIM.consent} onClick={() => { UIM.consent = !UIM.consent; bump(); }}>{t("pdpaConsent")}</Check>
        <Btn type="submit" block size="lg" disabled={n.busy}>{`[[check]] ${t("gConfirm")}`}</Btn>
      </form>
      <Msg UIM={UIM}/>
      <div class="row gap backrow"><Btn kind="ghost" sound="close" onClick={() => { n.pendingGoogle = null; UIM.msg = ""; bump(); }}>{`[[x]] ${t("gCancel")}`}</Btn></div>
    </>;
  }
  if (!n.user){
    const tab = UIM.accTab || "login";
    return <>
      <Tabs items={[{id:"login", label:t("signIn"), on:tab === "login", fn:() => { UIM.accTab = "login"; UIM.msg = ""; bump(); }}, {id:"reg", label:t("signUp"), on:tab === "reg", fn:() => { UIM.accTab = "reg"; UIM.msg = ""; bump(); }}]}/>
      {tab === "login" ? <form class="form" onSubmit={e => { e.preventDefault(); const f = form(e); n.login((f.user || "").trim(), f.pass || ""); }}>
        <Field label={t("fUserOrEmail")} name="user" ph="username / email" autocomplete="username"/>
        <Field label={t("fPassword")} name="pass" type="password" autocomplete="current-password"/>
        <Btn type="submit" block size="lg" disabled={n.busy}>{`[[log-in]] ${t("signIn")}`}</Btn>
        <p class="muted small">{t("noReset")}</p>
      </form> : <form class="form" onSubmit={e => { e.preventDefault(); const f = form(e); if (!UIM.consent){ UIM.msg = t("needConsent"); UIM.err = true; bump(); return; } n.register({username:(f.user || "").trim(), email:(f.email || "").trim(), displayName:(f.name || "").trim(), password:f.pass || ""}); }}>
        <Field label={t("fUsername")} name="user" ph="a–z 0–9 _ (3–16)" autocomplete="username"/>
        <Field label={t("fEmail")} name="email" type="email" ph="name@example.com" autocomplete="email"/>
        <Field label={t("fDisplay")} name="name" ph={t("fDisplayPh")} autocomplete="nickname"/>
        <Field label={t("fPassword")} name="pass" type="password" ph={t("fPassPh")} autocomplete="new-password"/>
        <Check on={!!UIM.consent} onClick={() => { UIM.consent = !UIM.consent; bump(); }}>{t("pdpaConsent")}</Check>
        <Btn type="submit" block size="lg" disabled={n.busy}>{`[[user-plus]] ${t("signUp")}`}</Btn>
        <p class="muted small">{t("noReset")}</p>
      </form>}
      {n.cfg && n.cfg.googleClientId ? <><div class="or"><span>{t("or")}</span></div><GoogleBtn/></> : null}
      <Msg UIM={UIM}/>
      <Back/>
    </>;
  }
  const u = n.user, free = !u.renamed, curT = (() => { try { return localStorage.getItem("p2050-theme") || ""; } catch(e){ return ""; } })(), curO = P.outfitPref();
  return <>
    <div class="card profile">
      <div class="grow"><b class="disp">{u.displayName}</b><small class="mono muted">@{u.username}{u.email ? " · " + u.email : ""}</small><small class="muted">{t("terraHow")}</small></div>
      <div class="bal"><small class="muted">{t("balance")}</small><Terra n={u.terra} cls="good big"/></div>
    </div>
    <H3>{t("charLevels")}</H3>
    <div class="lvls">{P.CHARS.map(c => { const xp = n.charXp(c.id), lv = P.levelOf(xp), own = n.owns("char_" + c.id); return <div class={"lvl card " + (own ? "" : "locked")} key={c.id} style={{"--c":c.color}}>
      <Portrait id={c.id} size={54} dim={!own}/><small>{L(c.name)}</small><b class="mono" style={{color:own ? c.color : undefined}}>{own ? `Lv ${lv}` : <Icon n="lock" size={13}/>}</b></div>; })}</div>
    <H3>{t("renameTitle")}</H3>
    <form class="row gap" onSubmit={e => { e.preventDefault(); n.rename(form(e).name || ""); }}>
      <input class="input grow" name="name" placeholder={u.displayName} maxLength={20}/>
      <Btn type="submit" disabled={n.busy || (!free && u.terra < P.PRICE.rename)}>{`${t("rename")} · ${free ? t("free") : P.PRICE.rename + " " + t("gemsWord")}`}</Btn>
    </form>
    <H3>{t("appearance")}</H3>
    <div class="optrows"><div class="row gap wrap">{[["", t("themeDefault")], ["night", t("themeNight")], ["paint", t("themePaint")]].map(([id, lab]) => { const own = !id || n.owns("theme_" + id); return <Btn key={id || "def"} size="sm" kind={curT === id ? "primary" : "ghost"} disabled={!own} onClick={() => { try { localStorage.setItem("p2050-theme", id); } catch(e){} bump(); }}>{`${own ? "" : "[[lock]] "}${lab}`}</Btn>; })}</div>
    <div class="row gap wrap">{[["base", t("outfitBase"), true], ["alt", t("outfitAlt"), n.owns("outfit")], ["gold", t("outfitGold"), n.maxLevel() >= 10]].map(([id, lab, own]) => <Btn key={id} size="sm" kind={curO === id ? "primary" : "ghost"} disabled={!own} onClick={() => { try { localStorage.setItem("p2050-outfit", id); } catch(e){} bump(); }}>{`${own ? "" : "[[lock]] "}${lab}`}</Btn>)}</div></div>
    <Msg UIM={UIM}/>
    <div class="row gap acctfoot"><Back/><span class="grow"/><Btn kind="ghost" onClick={() => n.logout()}>{`[[log-out]] ${t("signOut")}`}</Btn></div>
  </>;
}

/* ---------------- shop ---------------- */
function SubShop(){
  const n = N();
  if (!n.online) return <Offline/>;
  if (!n.user) return <><p class="muted">{t("shopLogin")}</p><Btn onClick={goSub("account")}>{`[[log-in]] ${t("signIn")}`}</Btn><Back/></>;
  return <>
    <div class="card row"><span class="muted grow">{t("balance")}</span><Terra n={n.user.terra} cls="good big"/></div>
    <p class="muted small">{t("shopNote")}</p>
    <div class="shop">{P.SHOP.map(it => {
      const own = n.owns(it.id), afford = n.user.terra >= P.shopPrice(it), ch = it.kind === "char" ? it.id.slice(5) : null;
      return <div class={"card row shopitem " + (own ? "own" : "")} key={it.id}>
        {ch ? <Portrait id={ch} size={56}/> : <span class="sic"><Icon n={it.icon} size={22} color="accent"/></span>}
        <div class="grow"><b>{L(it.name)}</b><span class="muted small"><Rich t={ch ? L(P.CHAR[ch].pas) : L(it.desc)}/></span></div>
        <Btn kind={own ? "ghost" : "gold"} disabled={own || !afford || n.busy} sound={null} onClick={() => { n.buy(it.id); Audio.play("coin"); }}>{own ? `[[check]] ${t("owned2")}` : `[[terra]] ${P.shopPrice(it)}`}</Btn>
      </div>;
    })}</div>
    <Msg UIM={UIM}/>
    <Back/>
  </>;
}

/* ---------------- 1.8: weekly missions and the season pass ---------------- */
function SubSeason(){
  const n = N(), D = n.season;
  if (!n.online) return <Offline/>;
  if (!n.user) return <><p class="muted">{t("seasonLogin")}</p><Btn onClick={goSub("account")}>{`[[log-in]] ${t("signIn")}`}</Btn><Back/></>;
  if (!D || D.error || !D.season) return <><p class="muted">{D && D.error ? t("boardFail") : t("netChecking")}</p><Back/></>;
  const Z = D.season, th = S.lang === "th", fmt = d => new Date(d + "T00:00:00+07:00").toLocaleDateString(th ? "th-TH" : "en-GB", {day:"numeric", month:"short"});
  const next = Z.tiers.find(x => !x.reached), prevXp = next ? next.xp - Z.step : Z.tiers.length * Z.step, into = next ? Math.max(0, D.xp - prevXp) : Z.step;
  const ITEM = id => { const it = P.SHOP.find(x => x.id === id); return it ? L(it.name) : id; };
  return <>
    <div class="card seasonhead">
      <div class="row"><Icon n="calendar-check" size={22} color="accent"/><b class="grow">{L(Z.name)}</b><small class="muted mono">{fmt(Z.start)} – {fmt(Z.end)}</small></div>
      <div class="row"><span class="muted">{t("seasonXp")}</span><span class="grow"/><b class="mono acc">{D.xp}</b></div>
      <div class="sbar"><i style={{width:`${Math.min(100, into / Z.step * 100)}%`}}/></div>
      <small class="muted">{next ? `${t("seasonTier")} ${next.tier}: ${into}/${Z.step} XP` : "★"} · {t("seasonHow")}</small>
    </div>
    <H3>{`${t("seasonWeekly")} · ${t("seasonEnds")} ${fmt(D.weekly.ends)}`}</H3>
    <div class="missions">{D.weekly.missions.map(m => <div class={"card row mission " + (m.claimed ? "own" : m.done ? "ready" : "")} key={m.id}>
      <Icon n={m.claimed ? "circle-check" : m.done ? "gift" : "target"} size={22} color={m.claimed ? "good" : m.done ? "gold" : "accent"}/>
      <div class="grow"><b>{L(m.name)}</b><div class="mbar"><i style={{width:`${m.progress / m.goal * 100}%`}}/></div><small class="muted mono">{m.progress}/{m.goal} · +{m.xp} XP</small></div>
      <Btn kind={m.done && !m.claimed ? "gold" : "ghost"} disabled={!m.done || m.claimed || n.busy} sound={null} onClick={() => n.claimMission(m.id)}>{m.claimed ? `[[check]] ${t("seasonDone")}` : `[[terra]] ${m.terra}`}</Btn>
    </div>)}</div>
    <H3>{t("seasonPass")}</H3>
    <div class="tiers">{Z.tiers.map(x => <div class={"tier " + (x.claimed ? "own" : x.reached ? "ready" : "")} key={x.tier}>
      <small class="mono muted">{t("seasonTier")} {x.tier}</small>
      <Terra n={x.terra} cls={x.reached ? "good" : ""}/>
      {x.item ? <small class="titem"><Icon n="sparkles" size={12}/> {ITEM(x.item)}</small> : null}
      <small class="mono muted">{x.xp} XP</small>
      <Btn size="sm" kind={x.reached && !x.claimed ? "gold" : "ghost"} disabled={!x.reached || x.claimed || n.busy} sound={null} onClick={() => n.claimTier(x.tier)}>{x.claimed ? "[[check]]" : x.reached ? t("seasonClaim") : "[[lock]]"}</Btn>
    </div>)}</div>
    <Msg UIM={UIM}/>
    <Back/>
  </>;
}

/* ---------------- leaderboard ---------------- */
function SubBoard(){
  const n = N(), B = n.board || {};
  if (!n.online) return <Offline/>;
  const mode = n.boardMode || "normal", period = n.boardPeriod || "week", sw = (m, p) => () => { n.boardMode = m; n.boardPeriod = p; n.loadBoard(); bump(); };
  const END_IC = {win:"trophy", l1:"flame", l2:"megaphone", l3:"timer"};
  return <>
    <div class="row gap wrap">
      <Tabs items={[["normal", "mode_normal"], ["hard", "mode_hard"], ["daily", "mode_daily"]].map(([m, key]) => ({id:m, label:t(key), on:mode === m, fn:sw(m, period)}))}/>
      {mode !== "daily" ? <Seg items={[{id:"w", label:t("week"), on:period === "week", fn:sw(mode, "week")}, {id:"a", label:t("allTime"), on:period === "all", fn:sw(mode, "all")}]}/> : null}
    </div>
    {mode === "daily" ? <p class="mono muted small">{t("dailyToday")} {new Date().toISOString().slice(0, 10)}</p> : null}
    {!B.rows ? <p class="muted">{B.error ? t("boardFail") : t("netChecking")}</p> : !B.rows.length ? <p class="muted">{t("boardEmpty")}</p> :
      <ol class="board">{B.rows.map((r, i) => <li key={i} class={(n.user && r.username === n.user.username ? "me " : "") + (r.frame ? "frame" : "")}>
        <span class={"rk " + (i < 3 ? "m" + i : "")}>{r.rank}</span>
        {r.char ? <Portrait id={r.char} size={30} outfit="base"/> : null}
        <span class="grow nm">{r.displayName}</span>
        <Icon n={END_IC[r.ending] || "circle"} size={16} color={r.ending === "win" ? "good" : "muted"}/>
        <b class="mono">{Number(r.score).toLocaleString()}</b>
      </li>)}</ol>}
    {B.me ? <p class="mono acc">{t("yourRank")}: #{B.me.rank} · {Number(B.me.score).toLocaleString()}</p> : n.user && B.rows ? <p class="muted small">{t("noRankYet")}</p> : null}
    <Back/>
  </>;
}

/* ---------------- certificate ---------------- */
function SubCert(){
  const n = N(), C = n.certs || {};
  if (!n.online) return <Offline/>;
  if (!n.user) return <><p class="muted">{t("certLogin")}</p><Btn onClick={goSub("account")}>{`[[log-in]] ${t("signIn")}`}</Btn><Back/></>;
  const el = C.eligibility;
  return <>
    <p class="muted">{t("certIntro")}</p>
    {!el ? <p class="muted">{t("netChecking")}</p> : <>
      <ul class="conds">
        <li class={el.winsNormal >= 1 ? "good" : "muted"}><Icon n={el.winsNormal >= 1 ? "circle-check" : "circle"} size={16}/> {t("certCondNormal")} ({el.winsNormal || 0})</li>
        <li class={el.winsHard >= 1 ? "good" : "muted"}><Icon n={el.winsHard >= 1 ? "circle-check" : "circle"} size={16}/> {t("certCondHard")} ({el.winsHard || 0})</li>
        <li class={el.cards >= el.needCards ? "good" : "muted"}><Icon n={el.cards >= el.needCards ? "circle-check" : "circle"} size={16}/> {t("certCondCards")} {el.needCards} ({el.cards})</li>
      </ul>
      {el.override === true ? <p class="gold small"><Rich t={`[[sparkles]] ${t("certSpecial")}`} iconColor="inherit"/></p> : null}
      {el.eligible ? <form class="form" onSubmit={e => {
        e.preventDefault(); const nm = (form(e).fullName || "").trim();
        if (nm.length < 3){ UIM.msg = t("certNameShort"); UIM.err = true; bump(); return; }
        if (!UIM.certConsent){ UIM.msg = t("needConsent"); UIM.err = true; bump(); return; }
        n.requestCert(nm);
      }}>
        <p class="muted small">{t("certNameHelp")}</p>
        <Field label={t("fFullName")} name="fullName" ph={t("fFullNamePh")} autocomplete="name"/>
        <Check on={!!UIM.certConsent} onClick={() => { UIM.certConsent = !UIM.certConsent; bump(); }}>{t("certConsent")}</Check>
        <Btn type="submit" kind="gold" block size="lg" disabled={n.busy}>{`[[award]] ${t("certRequest")}`}</Btn>
      </form> : el.issued ? <div class="certdone">
        <p class="good"><Rich t={`[[circle-check]] ${t("certIssued")}`} iconColor="inherit"/></p>
        <Btn block size="lg" disabled>{`[[award]] ${t("certIssuedBtn")}`}</Btn>
      </div> : <Btn block size="lg" disabled>{`[[lock]] ${t("certNotYet")}`}</Btn>}
    </>}
    <Msg UIM={UIM}/>
    {C.list && C.list.length ? <><H3>{t("certMine")}</H3>{C.list.map(c => <div class="card row" key={c.code}>
      <div class="grow"><b>{c.fullName}</b><small class="mono muted">{t("certCode")} {c.code} · {new Date(c.issuedAt).toLocaleDateString(S.lang === "th" ? "th-TH" : "en-GB")}</small></div>
      <Btn kind="ghost" onClick={() => window.open(n.certUrl(c.code), "_blank")}>{"[[download]] PDF"}</Btn>
    </div>)}</> : null}
    <Back/>
  </>;
}

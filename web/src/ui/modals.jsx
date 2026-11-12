/* Pop-up windows: dilemma event, end of game, character select, story, pause, tutorial */
import {useEffect, useState, useRef} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, relCol, bump, ls} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {Btn, IconBtn, Seg, Meter, Portrait, portraitSrc, H3, Terra, Volume, GfxSeg, A11ySeg, NarrRow, LangSeg, Msg, Key, SlotInfo, Check, GroupList, GroupTilt, Speak} from "./widgets.jsx";

import {YearStrip} from "./year.jsx";
import {EndScene, sceneKind} from "./endscene.jsx";
import {MpEnd, VoteDots, VoteHead} from "./mp.jsx";
import {mapCrop, eventPoint, eventSnd, eventImg, SND_ICON, SND_TINT} from "./hero.js";
const mapCropBg = pt => mapCrop(pt, pt ? 3.4 : 1.15, .3).backgroundImage;
const Tag = ({children, color = "warn"}) => <div class={"tag " + color}><Rich t={up(children)} iconColor="inherit"/></div>;
export function Modal({kind, children, onClose, cls = "", wide}){
  return <div class={`veil ${kind}-veil`} onClick={onClose ? e => { if (e.target === e.currentTarget){ onClose(); } } : undefined}>
    <section class={`modal ${kind} ${cls} ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
      {onClose ? <IconBtn n="x" title="Close" cls="mclose" onClick={onClose} sound={null}/> : null}
      {children}
    </section>
  </div>;
}

/* ---------------- dilemma event: choices unlock after 1.5 s ---------------- */
const arrows = (up_, mag) => (up_ ? "▲" : "▼").repeat(mag < 1 ? 1 : mag < 2.5 ? 2 : 3);
export function EventModal(){
  const e = P.currentEvent(); if (!e) return null;
  const locked = UIM.eventLocked(), f = UIM.eventLockFrac(), hard = S.mode === "hard";
  const opts = e.options.map((o, i) => ({o, i, ok:P.affordable(o.fx)}));
  if (opts.every(q => !q.ok)) opts.push({o:{label:{th:P.UI.postpone.th, en:P.UI.postpone.en}, fx:P.POSTPONE}, i:-1, ok:true});
  const where = e.country ? t("evCountryTag") : e.target ? `${t("eventTag")} · ${L(P.RMETA[e.target].name)}` : `${t("eventTag")} · ${t("global")}`;
  const side = (lab, ids, col) => <div class="side"><b class={col}>{lab}</b><div class="chips">{ids.map(id => { const c = P.C(id); return <span class="chip static" key={id} style={{borderColor:COL[col]}}><i style={{background:COL[relCol(c.rel)]}}/>{L(P.COUNTRY[id].name)}<small class={"mono relnum " + relCol(c.rel)} aria-label={t("relation")}><Icon n="$heart" size={14}/>{Math.round(c.rel)}</small></span>; })}</div></div>;
  return <Modal kind="event" cls={e.country ? "vsmodal" : ""}>
    <div class="hero photo" style={{backgroundImage:`url(${eventImg(e.id)}), ${mapCropBg(eventPoint(e))}`, "--tint":SND_TINT[eventSnd(e)] || COL.accent}}>
      <div class="tags"><Tag color={e.country ? "accent" : "warn"}>{`[[${e.country ? "globe" : "siren"}]] ${where}`}</Tag>{e.news ? <Tag color="good">{`[[newspaper]] ${t("realNews")} ${e.news.y}`}</Tag> : null}</div>
      <h2>{L(e.title)}</h2>
    </div>
    <div class="mbody">
      {e.country ? <Versus e={e}/> : <p class="desc"><Rich t={L(e.desc)}/></p>}
      {e.news ? <p class="newsrc muted small"><Icon n="link" size={13}/> {t("source")}: <a href={e.news.url} target="_blank" rel="noopener noreferrer">{e.news.src}</a></p> : null}
      <div class="ask"><Rich t={`[[circle-help]] ${t(e.country ? "evAskCountry" : "evAsk")}`} iconColor="accent"/><Speak text={`${L(e.title)}. ${L(e.desc)}`} btn/>
        <span class="grow"/>{!S.mp ? <Btn kind="ghost" size="sm" onClick={() => { UIM.evMin = true; bump(); }}>{`[[minimize-2]] ${L(P.UI2.evMin)}`}</Btn> : null}</div>
      {S.mp ? <VoteHead/> : null}
      <Meter v={f} color={locked ? "warn" : "accent"} h={4} cls="lockbar"/>
      <div class={"opts" + (e.country ? " vsopts" : "")}>{opts.map(({o, i, ok}) => {
        if (e.country) return <VsOpt key={i} o={o} i={i} ok={ok} locked={locked} hard={hard} e={e}/>;
        const usable = ok && !locked;
        return <button type="button" key={i} class={`opt ${ok ? "" : "no"} ${locked ? "locked" : ""}`} disabled={!usable} onPointerEnter={() => usable && Audio.hover()} onClick={() => { if (!UIM.eventLocked()) P.chooseOption(i); }}>
          <span class="letter">{i === -1 ? "!" : "ABC"[i]}</span>
          <span class="otext">
            <b>{L(o.label)}</b>
            {!hard ? <span class="fx">{P.fxChips(o.fx, e.target).map((c, k) => {
              const lab = (c.txt.includes(t("sideA")) ? t("sideA") : c.txt.includes(t("sideB")) ? t("sideB") : "") + (c.txt.includes(t("delayed")) ? " " + t("later") : "");
              return <span class={"fxchip " + (c.good ? "good" : "bad")} key={k} aria-label={plain(c.txt)}><Icon n={c.icon || "circle"} size={15}/>{lab ? <small>{lab}</small> : null}<b>{arrows(c.up, c.mag || 1)}</b></span>;
            })}</span> : <span class="muted small"><Rich t={`[[eye-off]] ${t("hardHidden")}`} iconColor="inherit"/></span>}
            {!hard && i >= 0 && P.tiltOfOption ? <GroupTilt list={P.tiltOfOption(o, e)}/> : null}
            {!ok ? <span class="bad small">{t("cantAfford")}</span> : null}
          </span>
          {S.mp ? <VoteDots i={i}/> : null}
        </button>;
      })}</div>
    </div>
  </Modal>;
}

/* 3.7.3: dispute between countries — the two sides face each other (VS) with their flags and say one line each.
   No friendship numbers: the choices only say which side will be pleased and which upset. */
const flagSrc = id => P.FLAG2 && P.FLAG2[id] ? `assets/img/flags/${P.FLAG2[id]}.webp` : null;
function VsSide({lab, ids, say, cls, right}){
  return <div class={"vside " + cls + (right ? " r" : "")}>
    <b class="vlab"><Icon n="message-circle" size={15}/>{lab}</b>
    {say ? <div class="vsay">“{L(say)}”</div> : null}
    <div class="vflags">{ids.map(id => <span class="vflag" key={id}>{flagSrc(id) ? <img src={flagSrc(id)} alt="" loading="lazy"/> : <i/>}<small>{L((P.SHORT && P.SHORT[id]) || P.COUNTRY[id].name)}</small></span>)}</div>
  </div>;
}
function Versus({e}){
  const say = (P.CE_SAY || {})[e.id] || {};
  return <div class="versus">
    <VsSide lab={t("sideA")} ids={e.A} say={say.A} cls="good"/>
    <span class="vsb" aria-hidden="true">VS</span>
    <VsSide lab={t("sideB")} ids={e.B} say={say.B} cls="bad" right/>
  </div>;
}
const MOOD = {up:{th:"พอใจ", en:"pleased"}, down:{th:"ไม่พอใจ", en:"upset"}};
function VsOpt({o, i, ok, locked, hard, e}){
  const usable = ok && !locked, chips = !hard ? P.fxChips(o.fx, e.target) : [];
  const sideOf = c => c.icon === "$heart" && c.txt.includes(t("sideA")) ? "A" : c.icon === "$heart" && c.txt.includes(t("sideB")) ? "B" : null;
  const moods = chips.filter(sideOf), rest = chips.filter(c => !sideOf(c));
  return <button type="button" class={`opt vsopt ${ok ? "" : "no"} ${locked ? "locked" : ""}`} disabled={!usable} onPointerEnter={() => usable && Audio.hover()} onClick={() => { if (!UIM.eventLocked()) P.chooseOption(i); }}>
    <span class="vhead"><span class="letter">{i === -1 ? "!" : "ABC"[i]}</span><b>{L(o.label)}</b></span>
    {!hard ? <>
      {moods.length ? <span class="vmoods">{moods.map((c, k) => <span key={k} class="vmood"><span class="muted">{sideOf(c) === "A" ? t("sideA") : t("sideB")}</span> <b class={c.good ? "good" : "bad"}>{L(MOOD[c.good ? "up" : "down"])} {arrows(c.up, c.mag || 1)}</b></span>)}</span> : null}
      <span class="fx">{rest.map((c, k) => <span class={"fxchip " + (c.good ? "good" : "bad")} key={k} aria-label={plain(c.txt)}><Icon n={c.icon || "circle"} size={15}/>{c.txt.includes(t("delayed")) ? <small>{t("later")}</small> : null}<b>{arrows(c.up, c.mag || 1)}</b></span>)}</span>
      {i >= 0 && P.tiltOfOption ? <GroupTilt list={P.tiltOfOption(o, e)}/> : null}
    </> : <span class="muted small"><Rich t={`[[eye-off]] ${t("hardHidden")}`} iconColor="inherit"/></span>}
    {!ok ? <span class="bad small">{t("cantAfford")}</span> : null}
    {S.mp ? <VoteDots i={i}/> : null}
  </button>;
}

/* ---------------- end of game ---------------- */
const QUOTES = {
  win:{th:"เราทำได้! แต่การดูแลโลกใบนี้ไม่มีวันจบ", en:"We did it! But looking after this planet never really ends."},
  l1:{th:"เราช้าไป... ขอให้คนรุ่นต่อไปเรียนรู้จากวันนี้", en:"We were too slow... may the next generation learn from today."},
  l2:{th:"ถ้าประชาชนไม่เชื่อมั่น นโยบายที่ดีที่สุดก็ไปต่อไม่ได้", en:"Without the people's trust, even the best policy goes nowhere."},
  l3:{th:"ใกล้แล้ว แต่ยังไม่พอ ครั้งหน้าเราต้องเร็วกว่านี้", en:"Close, but not enough. Next time we have to move faster."},
};
export const endImg = (o, grade) => `assets/img/endings/${o === "win" ? `end-win-${grade || "A"}` : P.ENDINGS[o].img}.jpg`;
/* 4.0 · the end of the game as a breaking-news broadcast: live footage of the ending (ui/endscene.jsx), the lower third,
   the papers from around the world and a ticker — all on one screen, no scrolling. The whole screen is laid out on a
   fixed stage (1280×720 on wide screens, 400×860 on tall ones) and scaled to fit, so it looks the same everywhere.
   A win doesn't show "Net Zero 100%" (it always is): it shows how early you got there, the warming and how much CO₂ you
   cut. A loss shows how far you got (Net Zero %), what is still left and why it ended. */
const EN_T = {
  live:T("สด", "LIVE"), breaking:T("ข่าวด่วน", "BREAKING"), interview:T("สัมภาษณ์สด", "Live interview"), world:T("พาดหัวจากทั่วโลก", "Headlines around the world"),
  early:T("เร็วกว่ากำหนด", "early"), lastYear:T("ทันในปีสุดท้าย", "in the final year"), yr:T("ปี", "yr"), mo:T("เดือน", "mo"),
  reached:T("ถึงเป้า", "Reached"), temp:T("อุณหภูมิโลก", "Warming"), good:T("ปีที่ดี", "Good years"), cut:T("ลด CO₂ ได้", "CO₂ cut"), perYr:T("Gt/ปี", "Gt/yr"),
  nz:T("ไปถึง Net Zero", "Way to Net Zero"), left:T("CO₂ ยังเหลือ", "CO₂ still left"), appr:T("ความนิยม", "Approval"),
  why:{l1:T("โลกร้อนทะลุ 3°C", "Warming broke 3°C"), l2:T("ความนิยมหมด", "Approval ran out"), l3:T("สิ้นปี 2050 แต่ยังไม่ถึง Net Zero", "End of 2050, still short of Net Zero")},
  story:T("เรื่องของคุณ", "Your story"), papers:T("หนังสือพิมพ์", "Papers"), real:T("สิ่งที่คุณทำได้จริงวันนี้", "What you can do in real life today"),
};
function T(th, en){ return {th, en}; }
function useStage(){
  const calc = () => { const w = window.innerWidth, h = window.innerHeight, wide = w / h >= 1.12; const [sw, sh] = wide ? [1280, 720] : [400, 860]; return {wide, k:Math.min(w / sw, h / sh)}; };
  const [st, set] = useState(calc);
  useEffect(() => { const on = () => set(calc()); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  return st;
}
function useCount(v, dec = 0, dur = 1100, delay = 600){
  const [n, setN] = useState(0);
  useEffect(() => { let raf, t0; const step = now => { if (!t0) t0 = now; const f = Math.min(1, (now - t0 - delay) / dur); if (f > 0) setN(v * (1 - Math.pow(1 - f, 3))); if (f < 1) raf = requestAnimationFrame(step); else setN(v); }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf); }, [v]);
  return n.toFixed(dec);
}
function Num({v, dec = 0, pre = "", suf = "", delay}){ return <>{pre}{useCount(v, dec, 1100, delay)}{suf}</>; }
export function EndModal(){
  if (S.mp) return <MpEnd/>;   // 2.0: the end of a multiplayer game
  const o = S.over, win = o === "win", rw = UIM.reward, th = S.lang === "th";
  const {wide, k} = useStage();
  const [sheet, setSheet] = useState(false);
  const nw = P.endNews ? P.endNews() : {papers:[], ticker:[], early:0, nz:0, net:P.netCO2(), date:P.dateStr()};
  const e2 = S.v2 && P.ending2 ? P.ending2() : null, tier = P.endTier ? P.endTier(P.goodYears ? P.goodYears() : 0) : 1;
  const kind = sceneKind(o, tier), ng = P.goodYears ? P.goodYears() : 0, ny = (S.years || []).length;
  const im = P.impactSummary ? P.impactSummary() : null;
  const earlyTxt = !win ? "" : nw.early >= 12 ? `${L(EN_T.early)} ${Math.floor(nw.early / 12)} ${L(EN_T.yr)}${nw.early % 12 ? ` ${nw.early % 12} ${L(EN_T.mo)}` : ""}` : L(EN_T.lastYear);
  const head = win ? `${t("winTitle")} · ${earlyTxt}` : `${t(o + "Title")} · ${L(EN_T.why[o] || EN_T.why.l3)}`;
  const quote = L(P.endQuote ? P.endQuote() : QUOTES[o]);
  const stats = win ? [
    [L(EN_T.reached), nw.date, null],
    [L(EN_T.temp), <Num v={S.temp} dec={2} pre="+" suf="°C"/>, null],
    [L(EN_T.good), <><Num v={ng}/><small> / {ny}</small></>, "good"],
    im && im.saved > .1 ? [L(EN_T.cut), <><Num v={im.saved} dec={1}/><small> {L(EN_T.perYr)}</small></>, null] : [t("skillsTitle"), `${Object.keys(S.owned).length}/${P.SKILLS.length}`, null],
  ] : [
    [L(EN_T.nz), <Num v={nw.nz} suf="%"/>, "warn"],
    [L(EN_T.left), <><Num v={nw.net} dec={1}/><small> Gt</small></>, null],
    o === "l2" ? [L(EN_T.appr), `${Math.max(0, S.appr).toFixed(0)}%`, "bad"] : [L(EN_T.temp), <Num v={S.temp} dec={2} pre="+" suf="°C"/>, o === "l1" ? "bad" : null],
    [L(EN_T.good), <><Num v={ng}/><small> / {ny}</small></>, null],
  ];
  const chip = win ? <span class="nw-chip gold">{L(P.ENDINGS.win.grades[S.grade || "A"])}</span> : <span class="nw-chip warn">{`${L(EN_T.nz)} ${nw.nz}%`}</span>;
  const lines = [];
  { const st = P.endStory();
    if (im && im.saved > .1) lines.push(th ? `[[leaf]] เทียบกับถ้าไม่ทำอะไรเลย คุณช่วยลด CO₂ ได้ ${im.saved.toFixed(1)} Gt ต่อปี และโลกเย็นกว่า ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C` : `[[leaf]] Compared with doing nothing, you cut CO₂ by ${im.saved.toFixed(1)} Gt a year and kept the world ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C cooler`);
    if (st.best) lines.push(`[[heart-handshake]] ${t("storyBest")}: ${P.cname(st.best)}`);
    if (st.worst) lines.push(`[[${P.HAZARDS[st.worst.type].icon}]] ${t("storyWorst")}: ${L(P.HAZARDS[st.worst.type].name)} · ${P.cname(st.worst.c)} · ${P.dateStr(st.worst.tick)}`);
    st.dec.forEach(d => lines.push(`[[git-branch]] ${L(d.title)} → ${L(d.label)}`));
    const os = P.oreSummary(); if (os.used) lines.push(`[[$ore]] ${t("oreUsed")} ${os.used}${os.top ? ` · ${t("oreMostFrom")} ${P.cname(os.top)} ${os.share}%` : ""}`);
    if (!lines.length) lines.push(t("storyNone")); }
  const reward = <div class={"nw-reward " + (rw && !rw.guest && !rw.error ? "ok" : "")}>
    {!rw ? <span class="muted"><Icon n="loader" size={15} cls="spin"/> {t("rewardWait")}</span>
      : rw.guest ? <span class="muted">{t("rewardGuest")} · XP +{rw.xp}</span>
      : rw.error ? <span class="muted">{t("rewardFail")} · XP +{rw.xp || 0}</span>
      : <><Terra n={`+${rw.terra}`} cls="good"/><b class="acc mono">XP +{rw.xp}</b>{rw.levelUp ? <b class="gold"><Icon n="star" size={14}/> {t("levelUp")} {rw.level}</b> : null}</>}
    <span class="mono muted nw-score">{t("finalScore")} {P.score().toLocaleString()}</span>
  </div>;
  const btns = <div class="nw-btns">
    <Btn kind="ghost" onClick={() => G.toMenu()}>{t("mainMenu")}</Btn>
    <Btn kind={win ? "ghost" : "primary"} onClick={() => G.restart()}>{t("restart")}</Btn>
    {win ? <Btn kind="gold" onClick={() => G.continueWorld()}>{`[[infinity]] ${t("playOn")}`}</Btn> : null}
  </div>;
  const paperList = d0 => <div class="nw-papers">{nw.papers.map((p, i) => <article key={p.id} class={"nw-paper p-" + p.id} style={{animationDelay:`${d0 + i * .2}s`}}>
    <b class="nw-pname">{p.name}</b><p class="nw-phead" lang={p.id === "jp" ? "ja" : p.id === "wt" ? "en" : "th"}>{p.head}</p>{p.gloss ? <small class="nw-gloss">“{p.gloss}”</small> : null}
  </article>)}</div>;
  const papers = paperList(1.6);
  const tv = <section class="nw-tv">
    <EndScene kind={kind} th={th} nz={nw.nz} date={nw.date}/>
    <div class="nw-scan"/>
    <div class="nw-top"><span class="nw-live">● {L(EN_T.live)}</span><span class="mono">GCT NEWS · {nw.date} · {t("mode_" + S.mode)}</span></div>
    <figure class="nw-pip"><img src={portraitSrc(S.char, P.outfitOf ? P.outfitOf(S.char) : undefined)} alt=""/><figcaption>{L(EN_T.interview)} · {L(P.CHAR[S.char].person)}</figcaption></figure>
    <div class="nw-l3">
      <div class="nw-l3a"><span class="nw-bk">{L(EN_T.breaking)}</span><h2 class="nw-head">{head}</h2></div>
      <div class="nw-l3b">{chip}<span class="nw-quote"><Typewriter text={`“${quote}”`}/></span></div>
    </div>
  </section>;
  const statBox = <div class="nw-stats">{stats.map(([a, b, c], i) => <div class={"nw-stat " + (c || "")} key={i} style={{animationDelay:`${.9 + i * .12}s`}}><span>{a}</span><b>{b}</b></div>)}</div>;
  const ticker = nw.ticker.length ? <div class="nw-ticker" aria-hidden="true"><span class="nw-tk">GCT NEWS</span><div class="nw-tkrun">{[0, 1].map(r => <span key={r}>{nw.ticker.map((x, i) => <span key={i}>{x}</span>)}</span>)}</div></div> : null;
  const story = e2 ? <div class="nw-e2"><b class={win ? "good" : "bad"}>{L(e2.title)}</b><p>{L(e2.body)}</p></div> : <div class="nw-e2"><p>{t(win ? "winBody" + (S.grade || "A") : o + "Body")}</p></div>;
  const moreBtn = <button type="button" class="nw-more" onClick={() => { Audio.play("page"); setSheet(true); }}>{wide ? L(EN_T.story) : `${L(EN_T.papers)} · ${L(EN_T.story)}`} ›</button>;
  return <div class={"veil end-veil news " + (win ? "win" : "lose")}>
    <div class={"nw-stage " + (wide ? "wide" : "tall")} style={{transform:`translate(-50%, -50%) scale(${k})`}} role="dialog" aria-modal="true" aria-label={head}>
      {wide ? <>
        {tv}
        <aside class="nw-side"><div class="nw-h">{L(EN_T.world)}</div>{papers}{statBox}</aside>
        <div class="nw-under">{story}{moreBtn}</div>
        {ticker}
        <div class="nw-bar">{reward}{btns}</div>
      </> : <>
        {tv}
        <div class="nw-body">{story}
          <div class="nw-qrow"><img src={portraitSrc(S.char, P.outfitOf ? P.outfitOf(S.char) : undefined)} alt=""/><span><b>{L(P.CHAR[S.char].person)}</b>“{quote}”</span></div>
          {nw.papers.length ? <div class="nw-papers one">{(() => { const p0 = nw.papers[0]; return <article class="nw-paper p-wt"><b class="nw-pname">{p0.name}</b><p class="nw-phead" lang="en">{p0.head}</p>{p0.gloss ? <small class="nw-gloss">“{p0.gloss}”</small> : null}</article>; })()}</div> : null}
          {statBox}</div>
        {ticker}
        <div class="nw-bar">{reward}<div class="nw-row">{moreBtn}</div>{btns}</div>
      </>}
      {sheet ? <div class="nw-sheet" role="dialog" aria-label={L(EN_T.story)}>
        <IconBtn n="x" title="Close" cls="mclose" onClick={() => setSheet(false)} sound="close"/>
        {!wide ? <><H3>{L(EN_T.world)}</H3>{paperList(.05)}</> : null}
        <H3>{L(EN_T.story)}</H3>
        <ul class="story-lines">{lines.map((x, i) => <li key={i}><Rich t={x} iconColor="accent"/></li>)}</ul>
        {P.realActions ? <><H3>{L(EN_T.real)}</H3><ul class="reallife">{P.realActions().map((a, i) => <li key={i}><Icon n={a.icon} size={20}/><span>{L(a.t)}</span></li>)}</ul></> : null}
      </div> : null}
    </div>
  </div>;
}

/* ---------------- character select + mode ---------------- */
export function CharSel(){
  const sel = UIM.charSel || "sci";
  const modes = [["fast", "zap"], ["normal", "globe"], ["hard", "skull"], ["daily", "calendar-check"]];   // 2.0: Fast mode
  return <Modal kind="charsel" wide onClose={() => G.toMenu()}>
    <Tag color="accent">{t("introTag")}</Tag>
    <h2>{t("charTitle")}</h2>
    <p class="muted">{t("charSub")}</p>
    <div class="chars">{P.CHARS.map(c => {
      const owned = P.Net.owns("char_" + c.id), on = sel === c.id, xp = P.Net.charXp(c.id), lv = P.levelOf(xp), nx = P.LEVELS[lv] ?? null, pv = P.LEVELS[lv - 1];
      return <button type="button" key={c.id} class={`charcard ${on ? "on" : ""} ${owned ? "" : "locked"}`} style={{"--c":c.color}} onPointerEnter={() => Audio.hover()}
        onClick={() => { Audio.play(owned ? "select" : "error"); if (owned){ UIM.charSel = c.id; UIM.msg = ""; } else UIM.msg = t("charLocked"); bump(); }}>
        <div class="photo"><img src={portraitSrc(c.id, P.outfitOf(c.id))} alt="" draggable="false"/>{!owned ? <span class="lock"><Icon n="lock" size={18}/></span> : null}<span class="lvl mono">Lv {lv}</span></div>
        <div class="info">
          <b class="nm">{L(c.name)}</b>
          <span class="person mono" style={{color:c.color}}>{L(c.person)}</span>
          {c.bio ? <span class="bio">{L(c.bio)}</span> : null}
          <Meter v={nx ? (xp - pv) / (nx - pv) : 1} color={c.color} h={4}/>
          <span class="pas"><Rich t={L(c.pas)}/></span>
          <ul class="acts">{c.acts.map(ab => <li key={ab.id}><Icon n={ab.icon} size={14} color={c.color}/>{L(ab.name)}{ab.lv ? <small class="muted"> (Lv{ab.lv})</small> : null}</li>)}</ul>
          {!owned ? <span class="price" aria-label={P.Net.user ? t("buyInShop") : t("loginToBuy")}><Icon n="terra"/> {P.shopPrice({id:"char_" + c.id, price:c.price})}</span> : null}
        </div>
      </button>;
    })}</div>
    <H3>{t("modeTitle")}</H3>
    <div class="modes">{modes.map(([m, ic]) => { const locked = m === "hard" && !P.hardUnlocked(); return <button type="button" key={m} class={`mode ${UIM.modeSel === m ? "on " + m : ""} ${locked ? "locked" : ""}`} onPointerEnter={() => Audio.hover()} onClick={() => { if (locked){ Audio.play("error"); UIM.msg = t("hardLockedMsg"); UIM.err = true; bump(); return; } Audio.play("toggle"); UIM.modeSel = m; UIM.msg = ""; bump(); }}>
      <Icon n={locked ? "lock" : ic} size={22}/><span><b>{t("mode_" + m)}</b><small>{locked ? t("hardLocked") : t("modeD_" + m)}</small></span>
    </button>; })}</div>
    <Msg UIM={UIM}/>
    <div class="mfoot">
      <Btn kind="ghost" onClick={() => G.openTutorial(0, true)}>{`[[graduation-cap]] ${t("tutMenu")}`}</Btn>
      <Btn size="lg" sound={null} onClick={() => G.startGame(UIM.charSel || "sci", UIM.modeSel)}>{`${t("start")} [[play]]`}</Btn>
    </div>
  </Modal>;
}

/* ---------------- story: cinematic panels with a typewriter ---------------- */
const graphemes = s => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter("th", {granularity:"grapheme"}).segment(s)].map(x => x.segment) : [...s]);
function Typewriter({text, onDone}){
  const g = useRef(graphemes(text)); const [n, setN] = useState(0);
  useEffect(() => {
    g.current = graphemes(text); setN(0);
    let i = 0;
    const id = setInterval(() => { i += 2; setN(i); if (i % 6 === 0) Audio.play("type", {vol:.35}); if (i >= g.current.length){ clearInterval(id); onDone && onDone(); } }, 28);
    return () => clearInterval(id);
  }, [text]);
  return <span>{g.current.slice(0, n).join("")}<span class="ghost-text">{g.current.slice(n).join("")}</span></span>;
}
export function Story(){
  const st = P.STORY.find(a => a.act === UIM.storyAct) || P.STORY[0];
  const last = UIM.storyI >= st.panels.length - 1;
  return <div class="veil story-veil" onClick={e => { if (e.target === e.currentTarget) G.storyNext(); }}>
    <div class="storybg" style={mapCrop(P.countryPoint("THA"), st.act === 1 ? 1.2 : st.act === 2 ? 2 : 3, .56, st.act === 3 ? "night" : "day")}/>
    <section class="modal story" role="dialog" aria-modal="true">
      <Tag color="accent">{`[[book-open]] ${t("storyTag")}`}</Tag>
      <h2>{L(st.title)}</h2>
      <div class="panels">{st.panels.map((p, i) => {
        if (i > UIM.storyI) return null;
        const w = P.panelWho ? P.panelWho(p) : p.who, me = w === "me", who = me ? S.char : w, npc = P.NPC && P.NPC[w], cur = i === UIM.storyI;
        const col = me ? P.CHAR[S.char].color : npc ? npc.color : COL.purple, say = L(P.panelSay ? P.panelSay(p) : p.say);
        return <div class={`panel ${me ? "me" : "adv"} ${npc ? "npc" : ""} ${cur ? "cur" : "old"}`} key={i} style={{"--bg":p.bg}}>
          <Portrait id={who} size={cur ? 92 : 56} ring={col}/>
          <div class="speech">
            <b style={{color:col}}>{me ? L(P.CHAR[S.char].person) : npc ? L(npc.name) : L(P.ADVISOR.name)}</b>
            <p>{cur ? <Typewriter text={say}/> : say}</p>
          </div>
          <Icon n={p.icon} size={64} cls="panel-ic"/>
        </div>;
      })}</div>
      <div class="mfoot">
        <Btn kind="ghost" onClick={() => G.storySkip()}>{t("tutSkip")}</Btn>
        <Speak text={L(P.panelSay ? P.panelSay(st.panels[Math.min(UIM.storyI, st.panels.length - 1)]) : st.panels[Math.min(UIM.storyI, st.panels.length - 1)].say)} who={P.narrWho ? P.narrWho(st.panels[Math.min(UIM.storyI, st.panels.length - 1)]) : ""} btn/>
        <span class="grow"/>
        <Btn onClick={() => G.storyNext()} sound={null}>{last ? `${t("storyGo")} [[play]]` : `${t("tutNext")} [[chevron-right]]`}</Btn>
      </div>
    </section>
  </div>;
}

/* ---------------- save slots (pause window, home screen "Load", slot picker) ----------------
   each slot shows its mode; a game can save over its own slot or one of the same mode, never a game of another mode */
export function SlotRow({slot, saves, inGame, pick}){
  const s = saves && saves[slot], m = s && s.meta, ok = s && P.validSave(s.S), cur = inGame && S.started && S.saveSlot === slot && m && m.id === S.saveId;
  const canSave = inGame && P.slotFree(slot, saves) && !(S.mode === "hard" && slot !== S.saveSlot);
  const [ask, setAsk] = useState(false);
  const save = () => {
    P.Ach.unlock("saver"); const k = P.slotName(slot), done = P.writeSlot(slot, false);
    UIM.msg = done ? `${t("saved")} · ${k}${P.Net.user ? " · " + t("cloudOk") : ""}` : t("noStore"); UIM.err = !done; bump();
  };
  return <div class={"card slotrow " + (cur ? "cur" : "")}>
    <SlotInfo name={P.slotName(slot, m)} meta={ok ? m : null} bad={s && !ok ? t("oldSave") : null} cur={cur}/>
    <div class="slotbtns">
      {pick ? (m && !P.slotFree(slot, saves) ? null : <Btn kind="primary" onClick={() => pick(slot)}>{m ? `[[save]] ${t("slotUseOver")}` : `[[save]] ${t("slotUse")}`}</Btn>) : null}
      {inGame && !pick ? <Btn kind="ghost" sound="save" disabled={!canSave} title={!canSave && m ? t("slotOtherMode") : ""} onClick={save}>{`[[save]] ${t("save")}`}</Btn> : null}
      {!pick && ok && !cur ? <Btn kind={inGame ? "ghost" : "primary"} sound="start" onClick={() => G.loadSlot(slot)}>{`[[folder-open]] ${t("load")}`}</Btn> : null}
      {!pick && m ? (ask ? <><Btn kind="danger" onClick={() => { P.deleteSlot(slot); setAsk(false); UIM.msg = `${t("slotDeleted")} · ${P.slotName(slot)}`; UIM.err = false; bump(); }}>{`[[trash-2]] ${t("slotDelSure")}`}</Btn><IconBtn n="x" title={t("cancel")} onClick={() => setAsk(false)}/></>
        : <IconBtn n="trash-2" title={t("slotDel")} onClick={() => setAsk(true)}/>) : null}
    </div>
    {inGame && m && !canSave && !cur ? <small class="muted slotnote">{S.mode === "hard" ? t("hardNoManual") : t("slotOtherMode")}</small> : null}
  </div>;
}
/* 1.5.4: delete every save slot at once (asks first) */
export function ClearSlots({saves}){
  const [ask, setAsk] = useState(false), n = P.SLOTS.filter(k => saves && saves[k] && saves[k].meta).length;
  if (!n) return null;
  return <div class="clearslots">{ask ? <><span class="bad small">{t("slotClearSure").replace("{N}", n)}</span>
    <Btn kind="danger" onClick={() => { P.SLOTS.forEach(k => { if (saves[k] && saves[k].meta) P.deleteSlot(k); }); setAsk(false); UIM.msg = t("slotCleared"); UIM.err = false; bump(); }}>{`[[trash-2]] ${t("slotDelSure")}`}</Btn>
    <Btn kind="ghost" onClick={() => setAsk(false)}>{t("cancel")}</Btn></>
    : <Btn kind="ghost" onClick={() => setAsk(true)}>{`[[trash-2]] ${t("slotClear")}`}</Btn>}</div>;
}
/* all 3 slots are taken when a new game starts: choose one of the same mode to replace, or delete one, or play without autosave */
export function SlotPick(){
  const saves = P.readSaves() || {}, o = UIM.pendingStart || {};
  const [, set] = useState(0);
  return <Modal kind="slotpick" onClose={() => { UIM.modal = "charsel"; bump(); }}>
    <Tag>{`[[save]] ${t("slotFullTag")}`}</Tag>
    <h2>{t("slotFullTitle")}</h2>
    <p class="muted">{t("slotFullMsg").replace("{M}", P.modeName(o))}</p>
    <div class="slots">{P.SLOTS.map(slot => {
      const m = saves[slot] && saves[slot].meta, same = !m || P.modeKey(m) === P.modeKey(o);
      return <div class="card slotrow" key={slot}>
        <SlotInfo name={P.slotName(slot, m)} meta={m}/>
        <div class="slotbtns">{same ? <Btn kind="primary" onClick={() => G.beginGame({...o, slot})}>{m ? `[[save]] ${t("slotUseOver")}` : `[[save]] ${t("slotUse")}`}</Btn>
          : <Btn kind="ghost" onClick={() => { P.deleteSlot(slot); set(x => x + 1); bump(); }}>{`[[trash-2]] ${t("slotDel")}`}</Btn>}</div>
      </div>;
    })}</div>
    <div class="mfoot"><Btn kind="ghost" onClick={() => G.beginGame({...o, slot:null})}>{t("slotNoSave")}</Btn></div>
  </Modal>;
}

/* ---------------- pause ---------------- */
export function Pause(){
  const saves = P.readSaves(), th = S.lang === "th", tab = UIM.pzTab || "saves";
  const go = k => () => { UIM.pzTab = k; bump(); };
  const act = (ic, label, fn, on) => <button type="button" class={"pzact " + (on ? "on" : "")} onClick={() => { Audio.play("click"); fn(); }}><Icon n={ic} size={20}/><span>{label}</span></button>;
  return <Modal kind="pause" wide onClose={() => G.resume()}>
    <div class="pzgrid">
      <aside class="pzside">
        <Tag>{`${P.dateStr()} · ${t("mode_" + S.mode)}`}</Tag>
        <h2>{t("pTitle")}</h2>
        <small class="mono muted"><Icon n="timer" size={13}/> {P.fmtTime(S.realSec)}</small>
        <Btn size="lg" block onClick={() => G.resume()}>{`[[play]] ${t("pResume")}`}</Btn>
        <div class="pzacts">
          {!S.mp ? act("save", th ? "บันทึก" : "Saves", go("saves"), tab === "saves") : null}
          {act("settings", th ? "ตั้งค่า" : "Settings", go("settings"), tab === "settings")}
          {act("graduation-cap", th ? "วิธีเล่น" : "How to", () => G.openTutorial(0, false))}
          {act("book-open", th ? "เรียนรู้" : "Learn", () => G.openLearn())}
          {P.hasKeyboard() ? act("keyboard", th ? "ปุ่มลัด" : "Keys", () => G.openKeys()) : null}
          {document.fullscreenEnabled ? act(document.fullscreenElement ? "minimize" : "maximize", th ? "เต็มจอ" : "Full", () => G.fullscreen()) : null}
          {act("log-out", th ? "เมนูหลัก" : "Menu", () => (S.mp && P.Mp ? P.Mp.leaveGame() : G.toMenu()))}
        </div>
      </aside>
      <section class="pzmain">
        {tab === "settings" || S.mp ? <div class="setlist">
          <div class="setrow"><Icon n="languages" size={18}/><span class="lbl">{th ? "ภาษา" : "Language"}</span><LangSeg/></div>
          <Volume/><GfxSeg/><A11ySeg/><NarrRow/>
        </div> : saves === null ? <p class="bad small">{t("noStore")}</p> : <><div class="slots">{P.SLOTS.map(slot => <SlotRow key={slot} slot={slot} saves={saves} inGame/>)}</div><ClearSlots saves={saves}/></>}
        <Msg UIM={UIM}/>
      </section>
    </div>
  </Modal>;
}

/* ---------------- tutorial (screenshots of the real game) ---------------- */
export function Tutorial(){
  const n = P.TUT.length, i = UIM.tutI, st = P.TUT[i], last = i === n - 1;
  return <Modal kind="tutorial" onClose={() => G.tutAct("skip")}>
    <div class="tutimg"><img src={`assets/img/tut/${st.img}`} alt="" key={st.img}/></div>
    <div class="mbody">
      <span class="mono acc small">{i + 1} / {n}</span>
      <h2>{L(st.title)}</h2>
      <ul class="bullets">{st.body[S.lang].map((b, k) => <li key={k}><Rich t={b}/></li>)}</ul>
      <div class="dots">{P.TUT.map((_, d) => <i key={d} class={d === i ? "on" : ""}/>)}</div>
      <div class="mfoot">
        <Btn kind="ghost" onClick={() => G.tutAct("skip")}>{t("tutSkip")}</Btn>
        <Speak text={`${L(st.title)}. ${st.body[S.lang].join(" ")}`} who="adv" btn/>
        <span class="grow"/>
        {i ? <Btn kind="ghost" sound={null} onClick={() => G.tutAct("back")}>{`[[chevron-left]] ${t("tutBack")}`}</Btn> : null}
        <Btn sound={null} onClick={() => G.tutAct(last ? "done" : "next")}>{last ? t("tutDone") : `${t("tutNext")} [[chevron-right]]`}</Btn>
      </div>
    </div>
  </Modal>;
}

/* ---------------- Continuous World: the world minerals market ---------------- */
/* small price chart for the last 24 months */
function Spark({data, color, min, max}){
  if (!data || data.length < 2) return <svg class="spark" viewBox="0 0 120 36"/>;
  const lo = min ?? Math.min(...data), hi = max ?? Math.max(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * 116 + 2).toFixed(1)},${(32 - (v - lo) / span * 28).toFixed(1)}`).join(" ");
  const last = pts.split(" ").pop().split(",");
  return <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx={last[0]} cy={last[1]} r="2.6" fill={color}/></svg>;
}
/* 3.3 · Resources market, design A: one table row per mineral —
   have (and raw waiting) · price + change · trend · refining per month (+ build) · buy 10 / sell 10 */
function RefCell({g}){
  const lv = (S.refLv || {})[g] || 0, b = (S.refBuild || {})[g], tl = P.tollers(g), k = P.refCost(g), max = P.refLevel(g) >= P.REF_MAX_LV;
  const tip = `${t("refOurs")} ${lv}/${P.REF_MAX_LV}${tl.length ? " · " + t("refFriends") + ": " + P.joinNames(tl.map(c => c.id)) : ""}`;
  return <span class="mref" aria-label={tip}><Icon n="factory" size={15}/><b class="mono">{P.refCap(g).toFixed(1)}</b>
    {max ? null : b ? <small class="muted"><Icon n="hammer" size={12}/>{b}</small>
      : <button type="button" class="mini" disabled={!P.canBuild(g)} aria-label={`${t("refBuild")} · ${t("ep")} ${k.ep} · ${t("pc")} ${k.pc}`} onClick={() => { if (P.buildRefinery(g)) Audio.play("buy"); }}><Icon n="plus" size={13}/></button>}
  </span>;
}
/* 3.7.5 · design 1: raw → refining belt → ready · price with last month's price · trend line green (up) / red (down)
   · the two countries that sent us the most · instant buy (dear) / sell */
function Belt({g, raw}){
  return <span class={"mbelt" + (raw ? " on" : "")} aria-hidden="true" style={{"--rc":P.MAT[g].col}}>
    <span class="track">{raw ? [0, 1, 2, 3].map(i => <i key={i} style={{animationDelay:`${i * .55}s`}}/>) : null}</span>
    <span class="mach"><Icon n="factory" size={15}/></span>
  </span>;
}
function TopFrom({g}){
  const all = P.matTop ? P.matTop(g, 8) : [], tot = all.reduce((s, x) => s + x.n, 0), list = all.filter(x => x.id.length === 3 && P.FLAG2 && P.FLAG2[x.id]).slice(0, 2);
  if (!list.length) return <span class="mfrom muted small">{S.lang === "th" ? "ในประเทศ" : "Home"}</span>;
  return <span class="mfrom" aria-label={list.map(x => `${P.cname(x.id)} ${Math.round(x.n / tot * 100)}%`).join(", ")}>
    {list.map(x => <span key={x.id}><img src={`assets/img/flags/${P.FLAG2[x.id]}.webp`} alt=""/><b class="mono">{Math.round(x.n / tot * 100)}%</b></span>)}
  </span>;
}
export function Market(){
  const close = () => { UIM.modal = null; bump(); };
  P.marketInit();
  const th = S.lang === "th", lot = P.MKT_LOT, ep = P.IC.ep, UP = "#5fd39a", DOWN = "#ff6b5c";
  return <Modal kind="market" wide onClose={close}>
    <div class="mkhead"><h2><Icon n="$mat-bat" size={28}/> {th ? "ตลาดทรัพยากร" : "Resources market"}</h2><span class="mkcash"><Rich t={`${ep} ${Math.floor(S.ep)}`}/></span></div>
    <div class="mtbl">
      <div class="mkr th"><span>{th ? "แร่" : "Mineral"}</span><span>{th ? "แร่ดิบ → แปรรูป → พร้อมใช้" : "Raw → refining → ready"}</span><span>{th ? "ราคาตลาด" : "Price"}</span><span class="msp">{th ? "แนวโน้ม" : "Trend"}</span><span>{th ? "ได้มาจากไหนมากสุด" : "Mostly from"}</span><span/></div>
      {P.MAT_IDS.map(g => {
        const G = P.MAT[g], pr = P.mktPrice(g), hist = (S.mktHist || {})[g] || [], prev = hist.length > 1 ? hist[hist.length - 2] : pr;
        const chg = prev ? (pr - prev) / prev * 100 : 0, up = chg >= 0, k10 = P.mktLotCost(g, lot), raw = P.rawFor ? P.rawFor(g) : 0;
        return <div class="mkr" key={g} style={{"--rc":G.col}} aria-label={L(G.sub)}>
          <span class="rn"><Icon n={G.icon} size={34}/><span class="rnt"><b>{L(G.name)}</b>{P.refCap ? <RefCell g={g}/> : null}</span></span>
          <span class="mpipe">
            <b class={"mono mraw" + (raw ? "" : " none")} aria-label={`${th ? "แร่ดิบรอแปรรูป" : "Raw, waiting"} ${raw}${raw ? ` · ~${P.monthsToRefine(g)} ${t("months")}` : ""}`}>{raw}</b>
            <Belt g={g} raw={raw}/>
            <b class="mono mhave" aria-label={th ? "พร้อมใช้" : "Ready"}>{Math.floor(S.mat[g])}</b>
          </span>
          <span class="mpr"><span class="mono"><Rich t={`${ep} ${pr.toFixed(1)}`}/></span>
            {Math.abs(chg) >= .5 ? <small class={"mono " + (up ? "up" : "down")}>{prev.toFixed(1)} {up ? "▲" : "▼"}{Math.abs(chg).toFixed(0)}%</small> : <small class="muted">{th ? "เท่าเดิม" : "no change"}</small>}</span>
          <span class="msp"><Spark data={hist} color={up ? UP : DOWN}/></span>
          <TopFrom g={g}/>
          <span class="mbb">
            <Btn kind="ghost" size="sm" cls="mbuy" disabled={S.ep < k10} sound={null} onClick={() => { if (P.mktBuy(g, lot)) Audio.play("coin"); }}><Rich t={`${th ? "ซื้อทันที" : "Buy now"} ${lot} · ${ep} ${k10}`} iconColor="inherit"/></Btn>
            <Btn kind="ghost" size="sm" disabled={S.mat[g] < lot} sound={null} onClick={() => { if (P.mktSell(g, lot)) Audio.play("coin"); }}>{`${th ? "ขาย" : "Sell"} ${lot} · +${P.mktSellGain(g, lot)}`}</Btn>
          </span>
        </div>;
      })}
    </div>
    <p class="ptip2 muted"><Icon n="info" size={14}/>{th ? "ตัวเลขสีส้ม = แร่ดิบรอแปรรูป · ตัวเลขใหญ่ = พร้อมใช้ · ซื้อทันทีแพงกว่าซื้อจากประเทศราว 2–3 เท่า (แตะประเทศบนแผนที่เพื่อซื้อ)" : "Orange = raw, waiting to be refined · big number = ready · buying now costs 2–3× more than buying from a country (tap a country on the map)"}</p>
  </Modal>;
}

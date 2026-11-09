/* Right-hand drawer (bottom sheet on phones): Region / Country, Stats, News */
import {P, S, t, L, up, COL, relCol, UIM, bump, RSHORT} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {Btn, IconBtn, RelBar, Meter, H3, GroupList, GroupTilt} from "./widgets.jsx";

const IC = () => P.IC;
const costLabel = c => [c.ep ? `${IC().ep} ${c.ep}` : "", c.pc ? `${IC().pc} ${c.pc}` : "", c.ore ? `${IC().ore} ${c.ore}` : ""].filter(Boolean).join("  ");
/* what a country has (real resources), what it sends us, and how far it has gone with green technology */
function Resources({c, noGreen}){
  const refs = P.refinesList ? P.refinesList(c.id) : [];
  const cr = P.CRES[c.id], imp = P.IMPORTERS.includes(c.id), src = S.oreOn && P.oreSources().find(x => x.id === c.id), ban = (S.oreBan || {})[c.id];
  return <>
    {!noGreen ? <div class="card greencard" aria-label={t("greenHelp")}>
      <div class="row"><span class="muted"><Rich t={`[[leaf]] ${t("greenTech")}`} iconColor="good"/></span><b class="mono good">{Math.round(c.green || 0)}%</b></div>
      <Meter v={(c.green || 0) / 100} color="good" h={6}/>
    </div> : null}
    {cr || imp || refs.length ? <>
      {!noGreen ? <H3>{t("resTitle")}</H3> : null}
      {cr ? <div class="restiles">{cr.r.map(k => { const R = P.RES[k], g = P.groupOf && P.groupOf(k), ready = g && refs.includes(g); return <div class="rt" key={k} aria-label={L(R.fact)} style={{"--rc":R.col}}>
        <Icon n={"$res-" + k} size={38}/><span>{L(R.name).replace(/\s*\(.*\)$/, "")}</span>
        {g ? <em class={"rtag " + (ready ? "ok" : "raw")}>{ready ? t("resReady") : t("resRaw")}</em> : null}
      </div>; })}</div> : null}
      {S.oreOn ? <div class="rstat">
        {cr && cr.w ? <div class="rs"><Icon n="truck" size={16}/><span>{t("resSends")}</span>
          {ban ? <b class="bad">{t("resBanned")} {ban} {t("months")}</b>
            : src ? <b class="good">+{P.matSources().filter(x => x.id === c.id).reduce((a, x) => a + x.amt, 0).toFixed(2)}{t("perMo")}</b>
            : <b class="warn"><Icon n="$heart" size={13}/> {t("resNeed")} 0</b>}</div> : null}
        {refs.length ? <div class="rs"><Icon n="factory" size={16}/><span>{t("resToll")}</span>
          {c.rel >= P.REF_TOLL_REL && !c.hostile && !ban ? <b class="good">+{P.REF_TOLL_CAP}{t("perMo")}</b> : <b class="warn"><Icon n="$heart" size={13}/> {t("resNeed")} {P.REF_TOLL_REL}</b>}</div> : null}
        {imp ? <div class="rs"><Icon n="ship" size={16}/><span class="muted">{t("resImports")}</span></div> : null}
      </div> : null}
    </> : null}
  </>;
}

export function Drawer(){
  if (!S.tab) return null;
  const titles = {region:S.selC ? "dCountry" : "dRegion", stats:"dStats", news:"dNews"};
  return <aside class="drawer glass" key="drawer">
    <div class="dhead">
      {S.tab === "region" && S.selC ? <IconBtn n="arrow-left" title={t("dRegion")} onClick={() => { S.selC = null; GameMap.focus(S.sel, false); P.changed(); }}/> : null}
      <h2>{up(t(titles[S.tab]))}</h2>
      <IconBtn n="x" title="Close" onClick={() => G.closeTab()} sound={null}/>
    </div>
    <div class="scroll">
      {S.tab === "region" ? (S.selC ? <PaneCountry/> : <PaneRegion/>) : S.tab === "stats" ? <PaneStats/> : <PaneNews/>}
    </div>
  </aside>;
}

let chipSel = null;   // scroll the chosen region's chip into view only when the choice changes
function RegionButtons(){
  return <div class="regbtns rowscroll">{S.regions.map(r => {
    const c = P.heatRGB(P.regionHeatValue(r)), on = r.id === S.sel && !S.selC;
    return <button type="button" key={r.id} class={on ? "on" : ""} ref={el => { if (el && on && chipSel !== r.id){ chipSel = r.id; requestAnimationFrame(() => el.scrollIntoView({inline:"center", block:"nearest", behavior:"smooth"})); } }} onPointerEnter={() => Audio.hover()} onClick={() => G.selectRegion(r.id, true)}>
      <span>{L(RSHORT[r.id])}</span><i style={{background:`rgb(${c.join(",")})`}}/>
    </button>;
  })}</div>;
}
const StatGrid = ({stats}) => <div class="statgrid">{stats.map(([a, b, col], i) => <div key={i} class="stat"><span><Rich t={a}/></span><b class={col || ""}>{b}</b></div>)}</div>;
/* ---------- 3.2 (design C): friendship ring, one line per order with its effects as chips ---------- */
const FX_IC = [[/มิตรภาพ|friendship/i, "$heart"], [/CO₂/, "$co2"], [/ปรับตัว|adaptation|เสียหาย|damage/i, "shield"], [/ทรัพยากร|mineral/i, "gem"],
  [/ทำตามแผน|on-plan/i, "clipboard-check"], [/ความนิยม|approval/i, "$appr"], [/เปราะบาง|vulnerab/i, "shield"], [/คว่ำบาตร|sanction/i, "ban"]];
/* the order's own description, cut into short effect chips (so they always match the game data) */
function fxChips(desc){
  const txt = plain(desc).replace(/\s*\([^)]*\)/g, "")
    .replace(/ทรัพยากรที่ประเทศนี้มี/g, "ทรัพยากร").replace(/ภัยในประเทศนี้/g, "ภัย").replace(/มิตรภาพกับประเทศนี้/g, "มิตรภาพ").replace(/(ของ)?ประเทศนี้/g, "")
    .replace(/this country's minerals/gi, "Minerals").replace(/ with this country/gi, "").replace(/this country's\s*/gi, "").replace(/\s+/g, " ").trim();
  const parts = txt.split(/\s*(?:,|;|และ|\sand\s|\sbut\s)\s*|(?<=[\d%])\s(?=มิตรภาพ|ความนิยม|ทำตามแผน|CO₂)|\s(?=แต่)/i).map(x => x.replace(/^(แต่|but|and)\s+|^แต่/i, "").trim()).filter(Boolean);
  return parts.slice(0, 5).map(x => {
    const bad = /คว่ำบาตร|sanction|ตอบโต้/i.test(x) || (/CO₂/.test(x) ? /\+\d/.test(x) : (/−|-\d/.test(x) && /มิตรภาพ|ทำตามแผน|ความนิยม|friendship|on-plan|approval/i.test(x)));
    const icon = (FX_IC.find(([re]) => re.test(x)) || [0, "sparkles"])[1];
    return {t:x, bad, icon};
  });
}
/* Rich text plus [b]bold[/b] */
const RichB = ({t:txt, iconColor}) => <span>{String(txt).split(/\[b\](.*?)\[\/b\]/).map((p, i) => i % 2 ? <b key={i} class="fg">{p}</b> : <Rich key={i} t={p} iconColor={iconColor}/>)}</span>;
const Chips = ({desc}) => <div class="fxs">{fxChips(desc).map((c, i) => <span key={i} class={"fx " + (c.bad ? "bad" : "good")}><Icon n={c.icon} size={12}/>{c.t}</span>)}</div>;
function OrderLine({icon, name, desc, cost, cd, ok, onClick, tilt, data}){
  return <div class={"oline " + (ok ? "" : "dim")} aria-label={plain(desc)} data-cact={data}>
    <Icon n={icon} size={18} cls="olic"/>
    <div class="olm"><b>{name}</b><Chips desc={desc}/>{tilt ? <GroupTilt list={tilt}/> : null}</div>
    <Btn kind={ok ? "primary" : "ghost"} disabled={!ok} sound={null} onClick={onClick}>{cd ? `${t("cooldown")} ${cd}` : costLabel(cost)}</Btn>
  </div>;
}
function RelRing({rel}){
  const col = relCol(rel);
  return <div class={"relring " + col} style={{"--p":Math.min(100, Math.abs(rel)), "--rc":COL[col]}} aria-label={t(rel >= 50 ? "relHigh" : rel >= 0 ? "relMid" : "relLow")}>
    <b class="mono">{rel >= 0 ? "+" : ""}{Math.round(rel)}</b><small>{t("relation")}</small>
  </div>;
}
const TT = (th, en) => (S.lang === "th" ? th : en);

const ACT_IC = {fund:"zap", diplo:"globe", adapt:"shield-plus", tariff:"landmark"};
function OrderCards({scope}){
  const r = P.R(S.sel);
  return <div class="olist">{P.ACTIONS.map(a => {
    const cc = scope === "country", c = P.actionCost(a, r, cc), cd = r.cd[a.id] || 0, ok = !cd && S.ep >= c.ep && S.pc >= c.pc;
    return <OrderLine key={a.id} icon={a.icon || ACT_IC[a.id] || "megaphone"} name={L(a.name)} desc={cc ? L(P.UI["cact_" + a.id]) : L(a.desc)} cost={c} cd={cd} ok={ok}
      tilt={P.tiltOfAction ? P.tiltOfAction(a.id) : null} onClick={() => P.doAction(a.id, scope)}/>;
  })}</div>;
}

function PaneRegion(){
  const meta = P.RMETA[S.sel], r = P.R(S.sel), al = S.alli[S.sel];
  const list = P.regCountries(S.sel).slice().sort((a, b) => b.co2 - a.co2), tot = r.co2 || 1;
  return <>
    <div class="pstick"><RegionButtons/></div>
    <h3 class="title big">{L(meta.name)}</h3>
    <p class="muted sub statline"><RichB t={`${t("co2Now")} [b]${r.co2.toFixed(2)} Gt[/b] · ${t("compliance")} [b]${r.comp.toFixed(0)}%[/b] · ${t("vuln")} [b]${r.vuln.toFixed(0)}%[/b]`}/></p>
    {al ? <div class="card good-b"><b class="good"><Rich t={`[[handshake]] ${t("allyOn")}`} iconColor="inherit"/></b><span class="muted">{P.joinNames(al.members)}</span></div>
      : S.owned.D3 ? <div class="card row">
        <div class="grow"><b><Rich t={`[[handshake]] ${t("allyForm")}`}/></b><span class="muted">{t("allyNeed")} ({P.allyCandidates(S.sel).length}/3)</span></div>
        <Btn disabled={!P.canAlly(S.sel)} kind={P.canAlly(S.sel) ? "primary" : "ghost"} onClick={() => { P.formAlliance(S.sel); Audio.play("bell"); }}>{`${IC().pc} ${P.ALLY_COST.pc}`}</Btn>
      </div> : null}
    <H3>{`${TT("คำสั่งเฉพาะทวีป", "Orders for the region of")} ${L(meta.name)}`}</H3>
    <OrderCards scope="region"/>
    <H3>{`${TT("ประเทศในทวีป", "Countries")} (${list.length})`}</H3>
    <div class="clist">{list.map(c => {
      const hz = !c.rest && S.haz.find(h => h.c === c.id);
      return <button type="button" key={c.id} class="crow" onPointerEnter={() => Audio.hover()} onClick={() => G.selectCountry(c.id)}>
        <span class="nm"><b>{c.rest ? P.cname(c.id) : L(P.COUNTRY[c.id].name)}</b><small class="mono muted">{P.fmtCO2(c.co2)} · {Math.round(c.co2 / tot * 100)}%</small></span>
        {hz ? <Icon n={P.HAZARDS[hz.type].icon} size={15} color="bad"/> : null}
        {!c.rest ? <><RelBar rel={c.rel}/><b class={"mono rel " + relCol(c.rel)}>{Math.round(c.rel)}</b></> : <Icon n="chevron-right" size={16} color="muted"/>}
      </button>;
    })}</div>
  </>;
}

/* Continuous World: ambassadors and the home base */
function BaseCard({c}){
  const W = P.W2, amb = (S.amb || []).includes(c.id), hq = S.hq === c.id, ka = P.w2cost(P.AMB_COST), kh = P.w2cost(P.HQ_COST);
  return <div class="card basecard">
    <b><Rich t={`[[flag]] ${L(W.title)}`} iconColor="accent"/></b>
    {hq ? <p class="good small"><Rich t={`[[landmark]] ${L(W.hqHere)}`} iconColor="inherit"/></p> : null}
    {amb ? <p class="good small"><Rich t={`[[flag]] ${L(W.ambHere)}`} iconColor="inherit"/></p> : null}
    <div class="row gap wrap">
      {amb ? <Btn kind="ghost" onClick={() => P.ambRecall(c.id)}>{L(W.ambRecall)}</Btn>
        : <Btn kind={P.ambOk(c) ? "primary" : "ghost"} disabled={!P.ambOk(c)} onClick={() => { if (P.ambSend(c.id)) Audio.play("bell", {vol:.7}); }}>{`${L(W.ambSend)} · ${IC().pc} ${ka.pc} · ${(S.amb || []).length}/${P.AMB_MAX}`}</Btn>}
      {!hq ? <Btn kind={P.hqOk(c) ? "primary" : "ghost"} disabled={!P.hqOk(c)} onClick={() => { if (P.moveHQ(c.id)) Audio.play("bell", {vol:.7}); }}>{S.hqCd > 0 ? `${L(W.hqWait)} ${S.hqCd} ${t("months")}` : `${L(W.hqSet)} · ${IC().ep} ${kh.ep} ${IC().pc} ${kh.pc}`}</Btn> : null}
    </div>
    {!amb && (S.amb || []).length >= P.AMB_MAX ? <small class="warn">{L(W.ambFull)}</small> : null}
    <small class="muted helpline"><span aria-label={L(W.ambHelp)}><Icon n="info" size={13}/> {TT("ทูตทำอะไร", "What envoys do")}</span>{!hq ? <span aria-label={L(W.hqHelp)}><Icon n="info" size={13}/> {TT("ฐานบัญชาการ", "Home base")}</span> : null}</small>
  </div>;
}

/* 1.1: bilateral agreement as one clear card: what it does, whether it can be made now, and the deals already signed */
function Bilateral({c, afford}){
  const ps = c.rel >= 40 ? P.bilatPartners().sort((a, b) => b.rel - a.rel).slice(0, 12) : [], ready = ps.length > 0;
  const deals = (S.bilats || []).filter(k => k.split("|").includes(c.id)).map(k => k.split("|").find(x => x !== c.id));
  return <div class={"card bilat " + (ready ? "ready" : "")}>
    <div class="row"><b><Rich t={`[[handshake]] ${t("bilatTitle")}`} iconColor={ready ? "good" : "accent"}/></b><span class="grow"/>{ready ? <span class="sitag world">{t("bilatReady")}</span> : null}</div>
    <div class="bfx">
      <span class="fxchip good"><Icon n="$co2" size={16}/>{t("bilatFxCo2")}</span>
      <span class="fxchip good"><Icon n="$money" size={16}/>{t("bilatFxMoney")}</span>
      <span class="fxchip good"><Icon n="$heart" size={16}/>{t("bilatFxRel")}</span>
    </div>
    {c.rel < 40 ? <p class="warn small"><Rich t={t("bilatNeedRel2").replace("{R}", Math.round(c.rel))} iconColor="inherit"/></p>
      : !ready ? <p class="muted small">{t("bilatNone")}</p>
      : <><p class="small">{t("bilatPick")} · <Rich t={`${IC().ep} ${P.BILAT_COST.ep}  ${IC().pc} ${P.BILAT_COST.pc}`}/></p>
        <div class="chips">{ps.map(p => <button type="button" key={p.id} class="chip big" disabled={!afford} onClick={() => { P.bilateral(p.id); Audio.play("bell", {vol:.7}); }}>
          <i style={{background:COL[relCol(p.rel)]}}/>{L(P.COUNTRY[p.id].name)}<small class={"mono relnum " + relCol(p.rel)}><Icon n="$heart" size={13}/>{Math.round(p.rel)}</small></button>)}</div>
        {!afford ? <p class="bad small">{t("cantAfford")}</p> : null}</>}
    {deals.length ? <p class="good small"><Rich t={`[[circle-check]] ${t("bilatHave")} ${P.joinNames(deals)}`} iconColor="inherit"/></p> : null}
  </div>;
}

function PaneCountry(){
  const c = P.C(S.selC); if (!c){ S.selC = null; return null; }
  const r = P.R(c.reg), meta = c.rest ? null : P.COUNTRY[c.id], hz = S.haz.find(h => h.c === c.id);
  const share = c.co2 / (r.co2 || 1), member = S.alli[c.reg] && S.alli[c.reg].members.includes(c.id);
  const afford = S.ep >= P.BILAT_COST.ep && S.pc >= P.BILAT_COST.pc;
  const sanct = (S.sanct || {})[c.id] > 0, name = P.cname(c.id), BIL = 40;
  /* 3.2 (design C + the friendship ring of design A): name and numbers on top, then every order as one line */
  return <>
    <div class="chead">
      <div class="grow">
        <h3 class="title big cflagt">{P.FLAG2 && P.FLAG2[c.id] ? <img class="cflag" src={`assets/img/flags/${P.FLAG2[c.id]}.webp`} alt=""/> : null}<span>{name}</span></h3>
        <p class="muted sub"><Rich t={L(P.RMETA[c.reg].name) + (member ? ` · [[handshake]] ${t("allyMember")}` : "")} iconColor="good"/></p>
        <p class="muted sub statline"><RichB t={`CO₂ [b]${P.fmtCO2(c.co2)}[/b] · ${t("shareOfRegion")} [b]${Math.round(share * 100)}%[/b]` + (c.rest ? "" : ` · ${t("risk")} [b]${meta.risk}%[/b] · ${t("adapt")} [b]${Math.round(c.adapt)}[/b] · [[leaf]] [b]${Math.round(c.green || 0)}%[/b]`)} iconColor="good"/></p>
      </div>
      {!c.rest ? <RelRing rel={c.rel}/> : null}
    </div>
    {!c.rest && (c.rel <= P.HOSTILE || sanct) ? <div class="cwarn">
      {c.rel <= P.HOSTILE ? <small class="bad"><Rich t={`[[angry]] ${t("relHostile")}`} iconColor="inherit"/></small> : null}
      {sanct ? <small class="bad"><Rich t={`[[ban]] ${t("relSanct")} ${S.sanct[c.id]} ${t("months")} · ${IC().ep} −${P.sanctCost(c)}${t("perMo")}`} iconColor="inherit"/></small> : null}
    </div> : null}
    {hz ? <div class="card row bad-b">
      <div class="grow"><b class="bad"><Rich t={`[[${P.HAZARDS[hz.type].icon}]] ${t("forecast")}: ${L(P.HAZARDS[hz.type].name)} · ${Math.max(0, hz.at - S.tick)} ${t("months")}`} iconColor="inherit"/></b></div>
      <Btn kind={hz.evac ? "ghost" : "danger"} disabled={hz.evac || S.ep < P.evacCost()} onClick={() => { if (P.evacuate(hz.id)) Audio.play("shield"); }}>{hz.evac ? `[[check]] ${t("evacuated")}` : `${t("evacuate")} · ${IC().ep} ${P.evacCost()}`}</Btn>
    </div> : null}
    {c.rest ? <>
      <H3>{`${TT("คำสั่งเฉพาะทวีป", "Orders for the region of")} ${L(P.RMETA[c.reg].name)}`}</H3>
      <OrderCards scope="region"/>
    </> : <>
      {c.rel < BIL ? <div class="goalbar" aria-label={t("bilatTitle")}>
        <Icon n="target" size={15}/><span><RichB t={TT(`เป้าหมายถัดไป: มิตรภาพ [b]${BIL}[/b] เพื่อปลดล็อก [b]ข้อตกลงทวิภาคี[/b]`, `Next: friendship [b]${BIL}[/b] unlocks a [b]bilateral agreement[/b]`)}/></span>
        <i class="gb"><b style={{width:`${Math.max(0, Math.min(1, c.rel / BIL)) * 100}%`}}/></i>
      </div> : null}
      <H3>{`${TT("สั่งการกับ", "Orders with")} ${name}`}</H3>
      <div class="olist">{P.CACTS.filter(a => !a.req || S.owned[a.req]).map(a => {
        const k = P.cactCost(a), cd = c.cd[a.id] || 0, ok = P.cactOk(a, c);
        return <OrderLine key={a.id} data={a.id} icon={a.icon} name={L(a.name)} desc={L(a.desc)} cost={k} cd={cd} ok={ok}
          onClick={() => { const before = c.rel; P.countryAction(a.id); if (c.rel > before) Audio.play("relUp", {delay:.1}); }}/>;
      })}</div>
      {c.rel >= BIL ? <Bilateral c={c} afford={afford}/> : null}
      <H3>{`${TT("คำสั่งเฉพาะประเทศ", "Orders for")} ${name}`}</H3>
      <OrderCards scope="country"/>
      <details class="more" open={UIM.cInfo || undefined} onToggle={e => { UIM.cInfo = e.currentTarget.open; }}>
        <summary><Icon n="chevron-right" size={15} cls="chev"/>{TT("ทรัพยากรและภัยที่เกิดบ่อย", "Resources and common hazards")}</summary>
        <Resources c={c} noGreen/>
        {meta ? <div class="hzchips"><small class="muted">{t("hazardsHere")}</small>{meta.hz.map(h => <span key={h}><Icon n={P.HAZARDS[h].icon} size={15}/>{L(P.HAZARDS[h].name)}</span>)}</div> : null}
      </details>
      {S.world ? <BaseCard c={c}/> : null}
    </>}
  </>;
}

const STRIPE = ["#08306b","#2171b5","#6baed6","#c6dbef","#fee0d2","#fc9272","#ef3b2c","#a50f15","#67000d"];
function tempColor(v){ const x = Math.max(0, Math.min(1, (v - .9) / 1.8)) * (STRIPE.length - 1), i = Math.floor(x); return STRIPE[Math.min(i, STRIPE.length - 1)]; }
function LineChart({data, data2, min, max, ticks, color, refs = []}){
  const W = 380, Hh = 150, pad = {l:34, r:10, t:10, b:20}, wd = W - pad.l - pad.r, hd = Hh - pad.t - pad.b;
  const span = Math.max(P.TOTAL_TICKS, data.length - 1, (data2 || []).length - 1), y0 = 2026, yEnd = y0 + Math.ceil(span / 12);
  const sx = i => pad.l + i / span * wd, sy = v => pad.t + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * hd;
  const line = d => d.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const pts = line(data), base = sy(Math.max(min, 0));
  const step = Math.max(8, Math.ceil((yEnd - y0) / 3 / 4) * 4), years = []; for (let y = y0; y <= yEnd; y += step) years.push(y);
  return <svg class="chart" viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none">
    {ticks.map(v => <g key={v}><line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} class="grid"/><text x={3} y={sy(v) + 4}>{v}</text></g>)}
    {years.map(y => <text key={y} x={sx((y - y0) * 12) - 12} y={Hh - 4}>{y}</text>)}
    {refs.map(r => <line key={r.v} x1={pad.l} x2={W - pad.r} y1={sy(r.v)} y2={sy(r.v)} stroke={COL[r.c]} stroke-dasharray="4 4" stroke-width="1"/>)}
    {data2 && data2.length > 1 ? <polyline points={line(data2)} fill="none" stroke={COL.muted} stroke-width="1.6" stroke-dasharray="5 4" opacity=".9"/> : null}
    {data.length > 1 ? <><polygon points={`${pts} ${sx(data.length - 1)},${base} ${sx(0)},${base}`} fill={COL[color]} opacity=".15"/><polyline points={pts} fill="none" stroke={COL[color]} stroke-width="2"/><circle cx={sx(data.length - 1)} cy={sy(data[data.length - 1])} r="4" fill={COL[color]}/></> : null}
  </svg>;
}
/* phase 5: what the player's work changed */
function Impact(){
  const im = P.impactSummary(), th = S.lang === "th", tl = (S.tl || []).slice(-12).reverse();
  return <>
    <div class="card impact">
      <small class="muted">{th ? "CO₂ ที่คุณช่วยลดได้ (เทียบกับถ้าไม่ทำอะไรเลย)" : "CO₂ you prevented (compared with doing nothing)"}</small>
      <b class="mono good big">−{im.saved.toFixed(1)} <small>Gt/{th ? "ปี" : "yr"}</small></b>
      <small class="muted">{th ? `ถ้าไม่ทำอะไรเลย ตอนนี้โลกจะปล่อย ${im.bau.toFixed(1)} Gt/ปี และร้อนขึ้นถึง +${im.bauTemp.toFixed(2)}°C (ตอนนี้ +${S.temp.toFixed(2)}°C)` : `Doing nothing, the world would now emit ${im.bau.toFixed(1)} Gt/yr and be +${im.bauTemp.toFixed(2)}°C warmer (now +${S.temp.toFixed(2)}°C)`}</small>
    </div>
    <H3>{th ? "ส่วนที่ช่วยลด CO₂" : "Where the cuts came from"}</H3>
    {im.parts.map(x => <div class="barrow wide" key={x.k}><span><Rich t={`[[${x.icon}]] ${L(x.t)}`} iconColor={x.col}/></span><Meter v={im.total ? x.v / im.total : 0} color={x.col} h={8}/><span class="mono">{im.total ? Math.round(x.v / im.total * 100) : 0}%</span></div>)}
    {tl.length ? <><H3>{th ? "ไทม์ไลน์" : "Timeline"}</H3>
      <ul class="tline">{tl.map((e, i) => { const x = P.timelineText(e); return <li key={i}><span class="mono muted">{P.dateStr(e.tk)}</span><Rich t={`[[${x.icon}]] ${x.txt}`} iconColor={x.col}/></li>; })}</ul></> : null}
  </>;
}
/* 1.6: statistics in four short tabs instead of one long page */
const ST_TABS = [["sum", "chart-line", T2("ภาพรวม", "Overview")], ["money", "wallet", T2("การเงิน", "Money")], ["people", "users", T2("ประชาชน", "People")], ["world", "globe", T2("โลก", "World")]];
function T2(th, en){ return {th, en}; }
/* 3.7.5 · statistics, design 2: one story to scroll down (no tabs) — the year in one sentence · four numbers ·
   CO₂ chart · what cut CO₂ · where money came from and went · where our minerals came from · more details folded */
function YearLine(){
  const th = S.lang === "th", h = S.hist, a = h.length > 12 ? h[h.length - 13].net : (h[0] ? h[0].net : P.netCO2()), d = P.netCO2() - a;
  const friends = S.countries.filter(c => !c.rest && c.rel >= 40).length, raw = P.MAT_IDS ? P.MAT_IDS.reduce((s, g) => s + (P.rawFor ? P.rawFor(g) : 0), 0) : 0;
  const head = th ? `CO₂ ${d <= 0 ? "ลดลง" : "เพิ่มขึ้น"} ${Math.abs(d).toFixed(1)} Gt ในรอบ 12 เดือน · ความนิยม ${Math.round(S.appr)}%` : `CO₂ ${d <= 0 ? "fell" : "rose"} ${Math.abs(d).toFixed(1)} Gt in 12 months · approval ${Math.round(S.appr)}%`;
  const tips = [];
  if (d > 0) tips.push(th ? "ปลดล็อกสกิลพลังงานสะอาดเพิ่ม" : "unlock more clean-energy skills");
  if (friends < 3) tips.push(th ? "ทำข้อตกลงกับมิตรอีกสักประเทศ" : "make a deal with one more friend");
  if (S.appr < 50) tips.push(th ? "ดูแลความนิยมก่อนออกนโยบายแรง ๆ" : "win back approval before tough policies");
  if (raw > 12) tips.push(th ? "ขยายโรงแปรรูป แร่ดิบค้างเยอะ" : "grow the refinery, raw minerals are piling up");
  return <div class="card stline"><small>{th ? `ปี ${2026 + Math.floor(S.tick / 12)} ในประโยคเดียว` : `${2026 + Math.floor(S.tick / 12)} in one line`}</small><b>{head}</b>{tips.length ? <span class="muted">{(th ? "ลอง: " : "Try: ") + tips.slice(0, 2).join(" · ")}</span> : null}</div>;
}
function StNums(){
  const th = S.lang === "th", friends = S.countries.filter(c => !c.rest && c.rel >= 40).length, net = P.netCO2();
  const it = [["$co2", net.toFixed(1), "Gt CO₂", net > 20 ? "bad" : net > 8 ? "warn" : "good"], ["$temp", `+${S.temp.toFixed(2)}`, th ? "°C โลก" : "°C warming", S.temp >= 2 ? "bad" : S.temp >= 1.5 ? "warn" : "good"],
    ["$appr", `${Math.round(S.appr)}%`, th ? "ความนิยม" : "approval", S.appr < 35 ? "bad" : "good"], ["$heart", friends, th ? "ประเทศมิตร" : "friends", "accent"]];
  return <div class="stnums">{it.map(([ic, v, l, c], i) => <div key={i}><Icon n={ic} size={18}/><b class={"mono " + c}>{v}</b><small>{l}</small></div>)}</div>;
}
function MoneyBar(){
  const th = S.lang === "th"; if (!P.ledgerSum) return null;
  const d = P.ledgerSum("year", "ep"), tot = d.tIn + d.tOut || 1, COLS = ["#5fd39a", "#8fd0ff", "#4fd1c5", "#c3a6ff", "#f2c14e"];
  const top = d.inc.slice(0, 4), big = d.out[0], nm = x => L((P.LEDGER_CATS[x.cat] || P.LEDGER_CATS.other).t);
  return <div class="stmoney">
    <div class="row"><b class="good mono">{th ? "เข้า" : "In"} +{d.tIn.toLocaleString()}</b><span class="grow"/><b class="bad mono">{th ? "ออก" : "Out"} −{d.tOut.toLocaleString()}</b></div>
    <div class="stbar">{top.map((x, i) => <i key={x.cat} style={{flex:x.v, background:COLS[i]}}/>)}{d.inc.length > 4 ? <i style={{flex:d.inc.slice(4).reduce((s, x) => s + x.v, 0), background:"#36606b"}}/> : null}{d.tOut ? <i style={{flex:d.tOut, background:"#ff6b5c"}}/> : null}</div>
    <small class="muted">{top.map((x, i) => `${nm(x)} ${Math.round(x.v / (d.tIn || 1) * 100)}%`).join(" · ")}{big ? ` · ${th ? "รายจ่ายใหญ่สุด" : "biggest cost"}: ${nm(big)}` : ""}</small>
  </div>;
}
function MatFrom(){
  const th = S.lang === "th"; if (!P.matTop) return null;
  const list = P.matTop(null, 6);
  if (!list.length) return <p class="muted small">{th ? "ยังไม่ได้รับทรัพยากรจากประเทศไหน" : "No minerals received yet"}</p>;
  const name = id => id === "home" ? (th ? "เหมืองในประเทศ" : "Our own mines") : id === "MKT" ? (th ? "ซื้อจากตลาด" : "Bought on the market") : P.cname(id);
  const pic = id => id === "home" ? <span class="stfi"><Icon n="pickaxe" size={16}/></span> : id === "MKT" ? <span class="stfi gold"><Icon n="store" size={16}/></span> : P.FLAG2 && P.FLAG2[id] ? <img class="stflag" src={`assets/img/flags/${P.FLAG2[id]}.webp`} alt=""/> : <span class="stfi"/>;
  return <div class="stfrom">{list.map(x => <button type="button" key={x.id} class="stfr" disabled={x.id.length !== 3} onClick={() => { if (x.id.length === 3){ Audio.play("click"); G.selectCountry(x.id); } }}>
    {pic(x.id)}<span class="grow"><b>{name(x.id)}</b><span class="stg">{P.MAT_IDS.filter(g => (x.by[g] || 0) >= .5).map(g => <span key={g}><Icon n={P.MAT[g].icon} size={15}/>{Math.round(x.by[g])}</span>)}</span></span><b class="mono">{Math.round(x.n)}</b>
  </button>)}</div>;
}
function PaneStats(){
  const g = P.grossCO2() || 1, th = S.lang === "th";
  return <>
    {S.report && !S.report.read ? <Report/> : null}
    <YearLine/>
    <StNums/>
    <H3>{t("chartCo2")}</H3>
    <p class="muted small legend"><i class="lg solid"/>{th ? "โลกของคุณ" : "Your world"} <i class="lg dash"/>{th ? "ถ้าไม่ทำอะไรเลย" : "If nothing was done"}</p>
    <LineChart data={S.hist.map(h => h.net)} data2={S.bau ? S.bau.hist : null} min={-5} max={60} ticks={[0, 15, 30, 45, 60]} color="hot" refs={[{v:0, c:"good"}]}/>
    <div class="stripes">{S.hist.map((h, i) => <i key={i} style={{background:tempColor(h.temp), width:`${100 / (Math.max(P.TOTAL_TICKS, S.hist.length - 1) + 1)}%`}}/>)}</div>
    <Impact/>
    <H3>{th ? "เงินมาจากไหน ไปไหน (ปีนี้)" : "Where money came from and went (this year)"}</H3>
    <MoneyBar/>
    {S.oreOn ? <><H3>{th ? "ทรัพยากรได้มาจากประเทศไหน (ทั้งเกม)" : "Where our minerals came from (whole game)"}</H3><MatFrom/></> : null}
    <details class="stmore"><summary><Icon n="chevron-down" size={16}/>{th ? "ดูรายละเอียดเพิ่ม: เงิน · ประชาชน · โลก · อุณหภูมิ" : "More: money · people · world · temperature"}</summary>
      <H3>{th ? "การเงิน" : "Money"}</H3><Money/>
      {S.groups ? <><H3>{th ? "ประชาชน" : "People"}</H3><div class="glist mini" onClick={() => { Audio.play("open"); UIM.modal = "politics"; bump(); }}><GroupList/></div></> : null}
      <H3>{t("chartTemp")}</H3>
      <LineChart data={S.hist.map(h => h.temp)} min={1} max={3} ticks={[1, 1.5, 2, 2.5, 3]} color="accent" refs={[{v:1.5, c:"warn"}, {v:2, c:"bad"}]}/>
      <H3>{t("shares")}</H3>
      {S.regions.map(r => <div class="barrow wide" key={r.id}><span>{L(RSHORT[r.id])}</span><Meter v={r.co2 / g} color="hot" h={8}/><span class="mono">{r.co2.toFixed(2)}</span></div>)}
      <H3>{t("topEmitters")}</H3>
      {S.countries.filter(x => !x.rest).sort((a, b) => b.co2 - a.co2).slice(0, 8).map(c => <div class="barrow wide" key={c.id}><span>{L(P.COUNTRY[c.id].name)}</span><Meter v={c.co2 / g} color="warn" h={8}/><span class="mono">{c.co2.toFixed(2)}</span></div>)}
      <p class="mono muted small"><Icon n="timer" size={12}/> {P.fmtTime(S.realSec)}</p>
    </details>
  </>;
}
/* 1.6: where money (or policy points) came from and went, for this year, last year or the whole game */
function Money(){
  const th = S.lang === "th", per = S.mnPer || "year", cur = S.mnCur || "ep", d = P.ledgerSum ? P.ledgerSum(per, cur) : {inc:[], out:[], tIn:0, tOut:0};
  const max = Math.max(1, ...d.inc.map(x => x.v), ...d.out.map(x => x.v)), net = d.tIn - d.tOut, ic = cur === "ep" ? "$money" : "$policy";
  const seg = (k, v, label) => <button type="button" class={"chip " + ((k === "per" ? per : cur) === v ? "on" : "")} onClick={() => { S[k === "per" ? "mnPer" : "mnCur"] = v; Audio.play("click"); P.changed(); }}>{label}</button>;
  const rows = (list, cls) => list.length ? list.map(x => { const C = P.LEDGER_CATS[x.cat] || P.LEDGER_CATS.other; return <div class={"mrow " + cls} key={x.cat}>
    <Icon n={C.icon} size={16}/><span class="ln">{L(C.t)}</span><span class="mono lv">{cls === "in" ? "+" : "−"}{x.v.toLocaleString()}</span><i class="lb"><b style={{width:`${x.v / max * 100}%`}}/></i>
  </div>; }) : <p class="muted small">—</p>;
  return <div class="money">
    <div class="row gap wrap mnsegs">
      <div class="chips">{seg("per", "year", th ? "ปีนี้" : "This year")}{seg("per", "last", th ? "ปีที่แล้ว" : "Last year")}{seg("per", "all", th ? "ทั้งเกม" : "Whole game")}</div>
      <span class="grow"/>
      <div class="chips">{seg("cur", "ep", <Icon n="$money" size={18}/>)}{seg("cur", "pc", <Icon n="$policy" size={18}/>)}</div>
    </div>
    <div class="mnsum">
      <div class="good"><small>{th ? "ได้" : "In"}</small><b class="mono">+{d.tIn.toLocaleString()}</b></div>
      <div class="bad"><small>{th ? "ใช้" : "Out"}</small><b class="mono">−{d.tOut.toLocaleString()}</b></div>
      <div class={net >= 0 ? "good" : "bad"}><small>{th ? "สุทธิ" : "Net"}</small><b class="mono"><Icon n={ic} size={18}/>{net >= 0 ? "+" : "−"}{Math.abs(net).toLocaleString()}</b></div>
    </div>
    <H3>{th ? "ได้มาจาก" : "Came from"}</H3>
    {rows(d.inc, "in")}
    <H3>{th ? "ใช้ไปกับ" : "Spent on"}</H3>
    {rows(d.out, "out")}
  </div>;
}
/* 1.1: news with filters; season forecasts (purple) are real and worth policy points the first time you open the panel */
const NEWS_F = [["all", "list", "nfAll"], ["in", "radar", "nfIntel"], ["al", "siren", "nfDanger"], ["gd", "circle-check", "nfGood"], ["ev", "lightbulb", "nfDecide"], ["nw", "newspaper", "nfWorld"]];
function PaneNews(){
  const C = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg", in:"purple"}, f = S.newsF || "all";
  const list = S.log.filter(lg => f === "all" || lg.cls === f || (f === "gd" && lg.cls === "tc")).slice(0, 120);
  const intel = S.intel && S.tick <= S.intel.until ? S.intel : null;
  return <>
    {intel ? <div class="card intelcard"><b><Rich t={`[[radar]] ${t("nfIntelNow")}: ${L(P.RMETA[intel.reg].name)}`} iconColor="purple"/></b><small class="muted">{t("nfIntelHelp")} · {intel.until - S.tick} {t("months")}</small></div> : null}
    <div class="chips nfilter">{NEWS_F.map(([id, ic, k]) => <button type="button" key={id} class={"chip " + (f === id ? "on" : "")} onClick={() => { S.newsF = id; Audio.play("click"); P.changed(); }}><Icon n={ic} size={14}/>{t(k)}</button>)}</div>
    {list.length ? <ul class="news">{list.map((lg, i) => <li key={S.log.length - i} class={lg.cls === "in" ? "intel" : ""}><span class="mono muted">{P.dateStr(lg.tk)}</span><Rich t={lg.txt} cls={C[lg.cls] || "fg"} iconColor="inherit"/></li>)}</ul> : <p class="muted small">{t("nfEmpty")}</p>}
  </>;
}
/* 1.1: the yearly report, waiting in the statistics panel every January */
function Report(){
  const r = S.report; if (!r) return null;
  const th = S.lang === "th", arrow = v => (v <= 0 ? "▼" : "▲");
  const tips = [];
  if (r.nAngry) tips.push(`[[angry]] ${t("rpAngry").replace("{N}", r.nAngry)} ${P.joinNames(r.angry)}`);
  if (r.sanct.length) tips.push(`[[ban]] ${t("rpSanct")} ${P.joinNames(r.sanct)}`);
  tips.push(`[[map]] ${t("rpLag")} ${L(P.RMETA[r.lag].name)}`);
  if (r.appr < 35) tips.push(`[[$appr]] ${t("rpAppr")}`);
  if (r.friends < 10) tips.push(`[[handshake]] ${t("rpFriends").replace("{N}", r.friends)}`);
  return <div class={"card report " + (r.read ? "" : "fresh")}>
    <div class="row"><b><Rich t={`[[file-chart-column]] ${t("rpTitle")} ${r.y}`} iconColor="accent"/></b><span class="grow"/>{!r.read ? <i class="newdot">NEW</i> : null}</div>
    <div class="rpgrid">
      <span><Rich t={t("co2")} iconColor="inherit"/><b class={r.dNet <= 0 ? "good" : "bad"}>{r.net.toFixed(1)} Gt <small>{arrow(r.dNet)} {Math.abs(r.dNet).toFixed(1)}</small></b></span>
      <span><Rich t={t("temp")} iconColor="inherit"/><b class={r.temp >= 2 ? "bad" : r.temp >= 1.5 ? "warn" : "good"}>+{r.temp.toFixed(2)}°C <small>{arrow(-r.dTemp)}</small></b></span>
      <span><Rich t={t("appr")} iconColor="inherit"/><b class={r.appr < 35 ? "bad" : "good"}>{r.appr.toFixed(0)}%</b></span>
      <span>{th ? "ประเทศที่เป็นมิตร (40+)" : "Friendly (40+)"}<b>{r.friends}</b></span>
    </div>
    <ul class="rptips">{tips.map((x, i) => <li key={i}><Rich t={x} iconColor="inherit"/></li>)}</ul>
    {!r.read ? <Btn onClick={() => { P.readReport(); Audio.play("coin"); }}>{`[[check]] ${t("rpRead")} · ${IC().pc} +${r.reward}`}</Btn> : <small class="muted">{t("rpDone")}</small>}
  </div>;
}

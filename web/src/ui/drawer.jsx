/* Right-hand drawer (bottom sheet on phones): Region / Country, Stats, News */
import {P, S, t, L, up, COL, relCol} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, IconBtn, RelBar, Meter, H3, Key} from "./widgets.jsx";

const IC = () => P.IC;
const costLabel = c => [c.ep ? `${IC().ep} ${c.ep}` : "", c.pc ? `${IC().pc} ${c.pc}` : ""].filter(Boolean).join("  ");

export function Drawer(){
  if (!S.tab) return null;
  const titles = {region:S.selC ? "dCountry" : "dRegion", stats:"dStats", news:"dNews"};
  return <aside class="drawer glass" key="drawer">
    <div class="dhead">
      {S.tab === "region" && S.selC ? <IconBtn n="arrow-left" title={t("dRegion")} onClick={() => { S.selC = null; GameMap.focus(S.sel, false); P.changed(); }}/> : null}
      <h2>{up(t(titles[S.tab]))}</h2>
      <Key k="Esc"/>
      <IconBtn n="x" title="Close" onClick={() => G.closeTab()} sound={null}/>
    </div>
    <div class="scroll">
      {S.tab === "region" ? (S.selC ? <PaneCountry/> : <PaneRegion/>) : S.tab === "stats" ? <PaneStats/> : <PaneNews/>}
    </div>
  </aside>;
}

function RegionButtons(){
  return <div class="regbtns">{S.regions.map(r => {
    const c = P.heatRGB(P.regionHeatValue(r));
    return <button type="button" key={r.id} class={r.id === S.sel && !S.selC ? "on" : ""} onPointerEnter={() => Audio.hover()} onClick={() => G.selectRegion(r.id, true)}>
      <span class="mono">{r.id}</span><i style={{background:`rgb(${c.join(",")})`}}/>
    </button>;
  })}</div>;
}
const StatGrid = ({stats}) => <div class="statgrid">{stats.map(([a, b, col], i) => <div key={i} class="stat"><span><Rich t={a}/></span><b class={col || ""}>{b}</b></div>)}</div>;

function OrderCards({scope}){
  const r = P.R(S.sel);
  return <div class="cards">{P.ACTIONS.map(a => {
    const cc = scope === "country", c = P.actionCost(a, r, cc), cd = r.cd[a.id] || 0, ok = !cd && S.ep >= c.ep && S.pc >= c.pc;
    return <div class="card row" key={a.id}>
      <div class="grow"><b>{L(a.name)}</b><span class="muted"><Rich t={cc ? L(P.UI["cact_" + a.id]) : L(a.desc)}/></span></div>
      <Btn kind={ok ? "primary" : "ghost"} disabled={!ok} sound={null} onClick={() => P.doAction(a.id, scope)}>{cd ? `${t("cooldown")} ${cd}` : costLabel(c)}</Btn>
    </div>;
  })}</div>;
}

function PaneRegion(){
  const meta = P.RMETA[S.sel], r = P.R(S.sel), al = S.alli[S.sel];
  const list = P.regCountries(S.sel).slice().sort((a, b) => b.co2 - a.co2), tot = r.co2 || 1;
  return <>
    <RegionButtons/>
    <h3 class="title">{L(meta.name)}</h3>
    <StatGrid stats={[[t("co2Now"), `${r.co2.toFixed(2)} Gt`, "hot"], [t("co2Start"), `${r.co2_0.toFixed(1)} Gt`], [t("compliance"), `${r.comp.toFixed(0)}%`], [t("vuln"), `${r.vuln.toFixed(0)}%`, r.vuln > 60 ? "bad" : ""]]}/>
    {al ? <div class="card good-b"><b class="good"><Rich t={`[[handshake]] ${t("allyOn")}`} iconColor="inherit"/></b><span class="muted">{P.joinNames(al.members)}</span></div>
      : S.owned.D3 ? <div class="card row">
        <div class="grow"><b><Rich t={`[[handshake]] ${t("allyForm")}`}/></b><span class="muted">{t("allyNeed")} ({P.allyCandidates(S.sel).length}/3)</span></div>
        <Btn disabled={!P.canAlly(S.sel)} kind={P.canAlly(S.sel) ? "primary" : "ghost"} onClick={() => { P.formAlliance(S.sel); Audio.play("bell"); }}>{`${IC().pc} ${P.ALLY_COST.pc}`}</Btn>
      </div> : null}
    <H3>{t("countriesIn")}</H3>
    <div class="clist">{list.map(c => {
      const hz = !c.rest && S.haz.find(h => h.c === c.id);
      return <button type="button" key={c.id} class="crow" onPointerEnter={() => Audio.hover()} onClick={() => G.selectCountry(c.id)}>
        <span class="nm"><b>{c.rest ? P.cname(c.id) : L(P.COUNTRY[c.id].name)}</b><small class="mono muted">{c.co2.toFixed(2)} Gt · {Math.round(c.co2 / tot * 100)}%</small></span>
        {hz ? <Icon n={P.HAZARDS[hz.type].icon} size={15} color="bad"/> : null}
        {!c.rest ? <><RelBar rel={c.rel}/><b class={"mono rel " + relCol(c.rel)}>{Math.round(c.rel)}</b></> : <Icon n="chevron-right" size={16} color="muted"/>}
      </button>;
    })}</div>
    <H3>{t("ordersRegion")}</H3>
    <OrderCards scope="region"/>
  </>;
}

function PaneCountry(){
  const c = P.C(S.selC); if (!c){ S.selC = null; return null; }
  const r = P.R(c.reg), meta = c.rest ? null : P.COUNTRY[c.id], hz = S.haz.find(h => h.c === c.id);
  const share = c.co2 / (r.co2 || 1), member = S.alli[c.reg] && S.alli[c.reg].members.includes(c.id);
  const afford = S.ep >= P.BILAT_COST.ep && S.pc >= P.BILAT_COST.pc;
  return <>
    <h3 class="title big">{P.cname(c.id)}</h3>
    <p class="muted sub"><Rich t={L(P.RMETA[c.reg].name) + (member ? ` · [[handshake]] ${t("allyMember")}` : "")} iconColor="good"/></p>
    {!c.rest ? <div class="card relcard">
      <div class="row"><span class="muted">{t("relation")}</span><b class={"mono big " + relCol(c.rel)}>{c.rel >= 0 ? "+" : ""}{Math.round(c.rel)}</b></div>
      <RelBar rel={c.rel}/>
      <small class="muted">{t(c.rel >= 50 ? "relHigh" : c.rel >= 0 ? "relMid" : "relLow")}</small>
    </div> : null}
    <StatGrid stats={[[t("co2Now"), `${c.co2.toFixed(2)} Gt`, "hot"], [t("shareOfRegion"), `${Math.round(share * 100)}%`], [t("risk"), c.rest ? "—" : `${meta.risk}%`, meta && meta.risk >= 65 ? "bad" : ""], [t("adapt"), `${Math.round(c.adapt)}`]]}/>
    {meta ? <p class="muted small"><Rich t={`${t("hazardsHere")}: ${meta.hz.map(h => `[[${P.HAZARDS[h].icon}]] ${L(P.HAZARDS[h].name)}`).join("   ")}`} iconColor="warn"/></p> : null}
    {hz ? <div class="card row bad-b">
      <div class="grow"><b class="bad"><Rich t={`[[${P.HAZARDS[hz.type].icon}]] ${t("forecast")}: ${L(P.HAZARDS[hz.type].name)} · ${Math.max(0, hz.at - S.tick)} ${t("months")}`} iconColor="inherit"/></b></div>
      <Btn kind={hz.evac ? "ghost" : "danger"} disabled={hz.evac || S.ep < P.evacCost()} onClick={() => { if (P.evacuate(hz.id)) Audio.play("shield"); }}>{hz.evac ? `[[check]] ${t("evacuated")}` : `${t("evacuate")} · ${IC().ep} ${P.evacCost()}`}</Btn>
    </div> : null}
    {!c.rest ? <>
      <H3>{t("ordersCountry")}</H3>
      <div class="cards">{P.CACTS.filter(a => !a.req || S.owned[a.req]).map(a => {
        const k = P.cactCost(a), cd = c.cd[a.id] || 0, ok = P.cactOk(a, c);
        return <div class="card row" key={a.id}>
          <div class="grow"><b><Rich t={`[[${a.icon}]] ${L(a.name)}`} iconColor="accent"/></b><span class="muted"><Rich t={L(a.desc)}/></span></div>
          <Btn kind={ok ? "primary" : "ghost"} disabled={!ok} sound={null} onClick={() => { const before = c.rel; P.countryAction(a.id); if (c.rel > before) Audio.play("relUp", {delay:.1}); }}>{cd ? `${t("cooldown")} ${cd}` : costLabel(k)}</Btn>
        </div>;
      })}</div>
      <H3>{t("bilatTitle")}</H3>
      <p class="muted small"><Rich t={`${t("bilatDesc")} · ${IC().ep} ${P.BILAT_COST.ep} ${IC().pc} ${P.BILAT_COST.pc}`}/></p>
      {c.rel < 40 ? <p class="warn small">{t("bilatNeedRel")}</p> : (() => {
        const ps = P.bilatPartners().sort((a, b) => b.rel - a.rel).slice(0, 12);
        if (!ps.length) return <p class="muted small">{t("bilatNone")}</p>;
        return <div class="chips">{ps.map(p => <button type="button" key={p.id} class="chip" disabled={!afford} onClick={() => { P.bilateral(p.id); Audio.play("bell", {vol:.7}); }}>
          <i style={{background:COL[relCol(p.rel)]}}/>{L(P.COUNTRY[p.id].name)}</button>)}</div>;
      })()}
    </> : null}
    <H3>{`${t("ordersRegion")} · ${c.rest ? L(P.RMETA[c.reg].name) : t("thisCountryOnly")}`}</H3>
    <OrderCards scope={c.rest ? "region" : "country"}/>
  </>;
}

const STRIPE = ["#08306b","#2171b5","#6baed6","#c6dbef","#fee0d2","#fc9272","#ef3b2c","#a50f15","#67000d"];
function tempColor(v){ const x = Math.max(0, Math.min(1, (v - .9) / 1.8)) * (STRIPE.length - 1), i = Math.floor(x); return STRIPE[Math.min(i, STRIPE.length - 1)]; }
function LineChart({data, min, max, ticks, color, refs = []}){
  const W = 380, Hh = 150, pad = {l:34, r:10, t:10, b:20}, wd = W - pad.l - pad.r, hd = Hh - pad.t - pad.b;
  const sx = i => pad.l + i / P.TOTAL_TICKS * wd, sy = v => pad.t + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * hd;
  const pts = data.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const base = sy(Math.max(min, 0));
  return <svg class="chart" viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none">
    {ticks.map(v => <g key={v}><line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} class="grid"/><text x={3} y={sy(v) + 4}>{v}</text></g>)}
    {[2026, 2034, 2042, 2050].map(y => <text key={y} x={sx((y - 2026) * 12) - 12} y={Hh - 4}>{y}</text>)}
    {refs.map(r => <line key={r.v} x1={pad.l} x2={W - pad.r} y1={sy(r.v)} y2={sy(r.v)} stroke={COL[r.c]} stroke-dasharray="4 4" stroke-width="1"/>)}
    {data.length > 1 ? <><polygon points={`${pts} ${sx(data.length - 1)},${base} ${sx(0)},${base}`} fill={COL[color]} opacity=".15"/><polyline points={pts} fill="none" stroke={COL[color]} stroke-width="2"/><circle cx={sx(data.length - 1)} cy={sy(data[data.length - 1])} r="4" fill={COL[color]}/></> : null}
  </svg>;
}
function PaneStats(){
  const g = P.grossCO2() || 1;
  return <>
    <H3>{t("chartCo2")}</H3>
    <LineChart data={S.hist.map(h => h.net)} min={-5} max={45} ticks={[0, 10, 20, 30, 40]} color="hot" refs={[{v:0, c:"good"}]}/>
    <H3>{t("chartTemp")}</H3>
    <LineChart data={S.hist.map(h => h.temp)} min={1} max={3} ticks={[1, 1.5, 2, 2.5, 3]} color="accent" refs={[{v:1.5, c:"warn"}, {v:2, c:"bad"}]}/>
    <H3>{t("shares")}</H3>
    {S.regions.map(r => <div class="barrow" key={r.id}><span class="mono">{r.id}</span><Meter v={r.co2 / g} color="hot" h={8}/><span class="mono">{r.co2.toFixed(2)}</span></div>)}
    <H3>{t("topEmitters")}</H3>
    {S.countries.filter(x => !x.rest).sort((a, b) => b.co2 - a.co2).slice(0, 8).map(c => <div class="barrow wide" key={c.id}><span>{L(P.COUNTRY[c.id].name)}</span><Meter v={c.co2 / g} color="warn" h={8}/><span class="mono">{c.co2.toFixed(2)}</span></div>)}
    <H3>{S.lang === "th" ? "แถบอุณหภูมิรายเดือน" : "Warming stripes"}</H3>
    <div class="stripes">{S.hist.map((h, i) => <i key={i} style={{background:tempColor(h.temp), width:`${100 / (P.TOTAL_TICKS + 1)}%`}}/>)}</div>
    <p class="mono muted small">{t("timePlayed")}: {P.fmtTime(S.realSec)}</p>
  </>;
}
function PaneNews(){
  const C = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg"};
  return <ul class="news">{S.log.slice(0, 100).map((lg, i) => <li key={S.log.length - i}><span class="mono muted">{P.dateStr(lg.tk)}</span><Rich t={lg.txt} cls={C[lg.cls] || "fg"} iconColor="inherit"/></li>)}</ul>;
}

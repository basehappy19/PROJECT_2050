/* Skill screen (full screen, like Plague Inc). Hexagon grid of one category · details of the chosen skill · category tabs.
   Opening it pauses the game. Close with ✕, Esc, T or by tapping outside the window.
   Only owned skills and the NEXT skills you can buy are shown; anything further away is shown dimmed with a lock (2.1: name and picture visible, details after the earlier skill). */
import ICONS from "../gen/icons.js";
import {P, S, UIM, t, L, up, COL, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Icon, Rich} from "./icon.jsx";
import {RoleBadge} from "./rolebadge.jsx";
import {Btn, IconBtn, Pill, Meter, Key, GroupTilt} from "./widgets.jsx";

const R = 50, COLW = 168, ROWH = 142;   // 1.7: a little more room for two-line names
const hexPts = (cx, cy, r) => Array.from({length:6}, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const centre = n => [92 + n.pos[0] * COLW, 70 + n.pos[1] * ROWH + (n.pos[0] % 2 ? 26 : 0)];
const visible = n => S.owned[n.id] || n.req.every(q => S.owned[q]);
const SvgIcon = ({n, x, y, s, color, op = 1}) => <g transform={`translate(${x} ${y}) scale(${s / 24})`} fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity={op} dangerouslySetInnerHTML={{__html:ICONS[n] || ICONS.circle}}/>;

export function Skills(){
  const cat = S.skillCat || "energy";
  const nodes = P.SKILLS.filter(n => n.cat === cat);
  const maxX = Math.max(...nodes.map(n => centre(n)[0])) + 92, maxY = Math.max(...nodes.map(n => centre(n)[1])) + R + 44;
  const busy = P.busyIds().length;
  const pick = id => { Audio.play("select"); S.node = id; bump(); };
  /* 3.1: a full-screen page (not a window over the map) · 3.2: close (✕) top-right like every window; Esc / T still close it */
  return <div class="skills-page">
    <section class="skills" role="region" aria-label={t("skillsTitle")}>
      <header class="sk-head">
        <h2><Icon n="network" size={22} color="accent"/>{t("skillsTitle")}</h2>
        <div class="sk-res">
          <span><Rich t={`${P.IC.ep} `}/><b>{Math.floor(S.ep)}</b></span>
          <span><Rich t={`${P.IC.pc} `}/><b>{Math.floor(S.pc)}</b></span>
          {S.oreOn ? <span><Rich t={`${P.IC.ore} `}/><b>{P.isFullRes() ? P.matTotal() : Math.floor(S.ore)}</b></span> : null}
          <span class={busy >= P.MAX_PROJECTS ? "warn" : "muted"}><Icon n="loader" size={15}/> {t("inProgress")} {busy}/{P.MAX_PROJECTS}</span>
          {P.recentBuys() ? <span class="bad"><Icon n="chart-line" size={15}/> {t("rush")} +{P.recentBuys() * 20}%</span> : null}
          {S.buff.instant ? <span class="good"><Icon n="lightbulb" size={15}/> {t("buffInstant")}</span> : S.buff.disc ? <span class="good"><Icon n="flask-round" size={15}/> {t("buffDisc")}</span> : null}
        </div>
        <IconBtn n="x" title={(S.lang === "th" ? "ปิด" : "Close") + " (Esc)"} onClick={() => G.closeSkills()} sound={null} cls="big skclose"/>
      </header>
      <div class="sk-body">
        <div class="sk-grid">
          <svg viewBox={`0 0 ${maxX} ${maxY}`} preserveAspectRatio="xMidYMid meet">
            {nodes.flatMap(n => n.req.map(q => {
              const qn = P.SKILL[q]; if (!qn || qn.cat !== cat || (!visible(n) && !S.owned[q])) return null;
              const [x1, y1] = centre(qn), [x2, y2] = centre(n), ang = Math.atan2(y2 - y1, x2 - x1), r0 = R - 2;
              const st = S.owned[n.id] ? "good" : S.owned[q] ? "accent" : "line";
              const ax = x2 - Math.cos(ang) * (r0 + 2), ay = y2 - Math.sin(ang) * (r0 + 2);
              return <g key={q + n.id} class={"edge " + st}>
                <line x1={x1 + Math.cos(ang) * r0} y1={y1 + Math.sin(ang) * r0} x2={x2 - Math.cos(ang) * (r0 + 6)} y2={y2 - Math.sin(ang) * (r0 + 6)}/>
                <polygon points={`${ax},${ay} ${ax - Math.cos(ang - .45) * 10},${ay - Math.sin(ang - .45) * 10} ${ax - Math.cos(ang + .45) * 10},${ay - Math.sin(ang + .45) * 10}`}/>
              </g>;
            }))}
            {nodes.map(n => {
              const [cx, cy] = centre(n), vis = visible(n), own = !!S.owned[n.id], c = P.nodeCost(n), p = P.rollProgress(n.id), sel = S.node === n.id;
              const afford = vis && !own && P.canAfford(n);
              const lab = vis ? (p !== null ? `${Math.round(p * 100)}%` : own ? (n.type === "active" ? (S.actCd[n.id] ? `${S.actCd[n.id]} ${t("moShort")}` : t("ready")) : "✓") : `${c.ep}·${c.pc}`) : "";
              /* 2.1.5: a skill that is still in progress is gold (green only once it has its full effect), with a ring that fills up */
              return <g key={n.id} data-node={n.id} class={`hex ${own ? "own" : vis ? (afford ? "afford" : "vis") : "hid"} ${p !== null ? "roll" : ""} ${n.type} ${sel ? "sel" : ""}`} onClick={() => pick(n.id)} onPointerEnter={() => Audio.hover()} tabIndex={0} role="button" aria-label={L(n.name)} onKeyDown={e => { if (e.key === "Enter") pick(n.id); }}>
                {afford ? <polygon class="halo" points={hexPts(cx, cy, R + 8)}/> : null}
                <polygon class="body" points={hexPts(cx, cy, R)}/>
                {p !== null ? <><polygon class="ringbg" points={hexPts(cx, cy, R + 10)}/><polygon class="ring" points={hexPts(cx, cy, R + 10)} pathLength="100" style={{strokeDasharray:`${Math.max(1, p * 100).toFixed(1)} 100`}}/></> : null}
                {sel ? <polygon class="selring" points={hexPts(cx, cy, R + 5)}/> : null}
                <image href={`assets/img/ui/3d/sk-${n.id}.webp`} x={cx - 25} y={cy - 33} width="50" height="50" opacity={own || afford ? 1 : vis ? .7 : .3}/>
                {!vis ? <SvgIcon n="lock" x={cx - 8} y={cy + 13} s={16} color={COL.muted}/> : null}
                <text x={cx} y={cy + 25} class="lab">{lab}</text>
                {n.type === "active" ? <SvgIcon n="zap" x={cx + R - 24} y={cy - R + 9} s={13} color={own ? COL.gold : COL.muted}/> : null}
                {vis && n.trade ? <SvgIcon n="scale" x={cx - R + 11} y={cy - R + 9} s={13} color={COL.warn}/> : null}
                {vis && n.resp ? <SvgIcon n="shield" x={cx - R + 11} y={cy - R + 9} s={13} color={COL.sky}/> : null}
                <foreignObject x={cx - 80} y={cy + R + 2} width="160" height="40"><div class="hexname" xmlns="http://www.w3.org/1999/xhtml">{L(n.name)}</div></foreignObject>
              </g>;
            })}
          </svg>
          <div class="rollouts">{S.rollouts.length ? S.rollouts.slice(0, 6).map((ro, i) => {
            const n = P.SKILL[ro.id];
            return <div class="ro" key={i}><Icon n={n.icon} size={16} color="gold"/><span>{L(n.name)}</span><Meter v={1 - ro.left / ro.months} color="gold" h={4}/><small class="mono">{ro.left} {t("moShort")}</small></div>;
          }) : <span class="muted small">{t("noRollouts")}</span>}</div>
        </div>
        <Detail cat={cat}/>
      </div>
      <nav class="sk-cats">{P.SKILL_CATS.map(c => {
        const list = P.SKILLS.filter(n => n.cat === c.id), own = list.filter(n => S.owned[n.id]).length;
        const ready = list.filter(n => !S.owned[n.id] && visible(n) && P.canAfford(n)).length;
        return <button type="button" key={c.id} class={cat === c.id ? "on" : ""} onPointerEnter={() => Audio.hover()} onClick={() => {
          Audio.play("tab"); S.skillCat = c.id;
          const first = P.SKILLS.find(n => n.cat === c.id && !S.owned[n.id] && visible(n)) || P.SKILLS.find(n => n.cat === c.id); S.node = first.id; bump();
        }}>
          <Icon n={c.icon} size={20}/><span><b>{L(c.name)}</b><small class="mono">{own}/{list.length}</small></span>{ready ? <i class="badge">{ready}</i> : null}
          {P.SDG_OF && P.SDG_OF[c.id] ? <span class="sdgs">{P.SDG_OF[c.id].map(g => <img key={g} src={`assets/img/sdg/goal-${g}.svg`} alt={`SDG ${g}`} draggable="false"/>)}</span> : null}
        </button>;
      })}</nav>
    </section>
  </div>;
}

/* what a skill changes: one row per value, green = good for you, red = bad for you */
export function Effects({chips}){
  if (!chips.length) return null;
  return <div class="effects">{chips.map((c, i) => <div class={"eff " + (c.good ? "good" : "bad")} key={i}>
    <Icon n={c.icon || "$" + c.stat} size={26}/>
    <span class="el">{c.label}</span>
    <b class="ev"><i>{c.up ? "▲" : "▼"}</i>{c.val}</b>
  </div>)}</div>;
}

function Detail({cat}){
  const n = P.SKILL[S.node] && P.SKILL[S.node].cat === cat ? P.SKILL[S.node] : P.SKILLS.find(q => q.cat === cat);
  const vis = visible(n), own = !!S.owned[n.id], c = P.nodeCost(n), st = P.nodeState(n);
  if (!vis){
    const req = n.req.filter(q => !S.owned[q]).map(q => L(P.SKILL[q].name));
    return <div class="sk-detail"><div class="dtop"><span class="dicon d3 hid"><img src={`assets/img/ui/3d/sk-${n.id}.webp`} alt="" width="56" height="56" draggable="false"/></span><div class="grow"><h3>{L(n.name)}</h3></div></div><p class="muted"><Icon n="lock" size={15}/> {t("hiddenHint")} {req.join(", ")}</p></div>;
  }
  const tags = [n.type === "active" ? "active" : "passive", n.trade && "trade", n.resp && "resp", n.target === "country" && "country"].filter(Boolean);
  const oc = P.oreCost(n), full = st === "ready" && P.atCapacity(n), can = st === "ready" && !full && P.canAfford(n);
  const a = own && n.type === "active" ? P.abilityList().find(q => q.id === n.id) : null, cd = S.actCd[n.id] || 0, p = P.rollProgress(n.id);
  /* 2.1.7 (design K1): sections · what you get, what it costs you (only when it does), how each group feels, what you need, when */
  const chips = P.skillChips(n), gain = chips.filter(q => q.good), lose = chips.filter(q => !q.good);
  const tilt = P.tiltOfSkill ? P.tiltOfSkill(n.id) : [];
  const need = !own ? [["ep", "$money", t("ep"), S.ep, c.ep], ["pc", "$policy", t("pc"), S.pc, c.pc],
    ...(P.isFullRes() ? Object.entries(P.matCost(n) || {}).map(([g, v]) => [g, P.MAT[g].icon, L(P.MAT[g].name), S.mat[g] || 0, v]) : oc ? [["ore", "$ore", t("ore"), S.ore || 0, oc]] : [])].filter(r => r[4] > 0) : [];
  const shortList = need.filter(r => r[3] < r[4]).map(r => `${plainName(r[2])} ${Math.ceil(r[4] - r[3])}`);
  return <div class="sk-detail k1" key={n.id}>
    <div class="dtop">
      <span class={"dicon d3 " + (own ? "own" : "")}><img src={`assets/img/ui/3d/sk-${n.id}.webp`} alt="" width="56" height="56" draggable="false"/></span>
      <div class="grow"><h3>{L(n.name)}</h3><div class="pills">{tags.map(tg => <Pill key={tg} t={L(P.SKILL_TYPE[tg])} kind={tg === "trade" ? "warn" : tg === "active" ? "gold" : tg === "resp" ? "acc" : ""}/>)}</div></div>
      {P.SDG_OF && P.SDG_OF[n.cat] ? <div class="sksdg">{P.SDG_OF[n.cat].map(g => <img key={g} src={`assets/img/sdg/goal-${g}.svg`} alt={`SDG ${g}`} title={`SDG ${g}`} draggable="false"/>)}</div> : null}
    </div>
    {gain.length ? <div class="sksec gain"><h4>{t("skGain")}</h4><Effects chips={gain}/></div> : null}
    {lose.length ? <div class="sksec lose"><h4>{t("skLose")}</h4><Effects chips={lose}/></div> : null}
    {n.type === "active" || !chips.length ? <p class="desc muted"><Rich t={L(n.desc)}/></p> : null}
    {tilt.length ? <div class="sksec"><h4>{t("skGroups")}</h4><GroupBars list={tilt}/></div> : null}
    {need.length ? <div class="sksec need"><h4>{t("skNeed")}</h4><div class="skneed">{need.map(([k, ic, nm, have, v]) => { const ok = have >= v;
      return <span class={"skn " + (ok ? "ok" : "short")} key={k} title={plainName(nm)} aria-label={`${plainName(nm)} ${Math.floor(have)} / ${v}`}>
        <Icon n={ic} size={20}/><b class="mono">{Math.floor(have)}/{v}</b>{!ok ? <small>{t("skShort")} {Math.ceil(v - have)}</small> : null}
      </span>; })}</div></div> : null}
    <p class="skcond"><span>{t("needs")}: <b class={n.req.length && n.req.every(q => S.owned[q]) ? "good" : ""}>{n.req.length ? n.req.map(q => L(P.SKILL[q].name) + (S.owned[q] ? " ✓" : "")).join(" + ") : t("none")}</b></span>
      <span>{n.type === "active" ? <>{t("cooldownLen")} <b>{n.cd} {t("months")}</b></> : n.months ? <>{t("skFullIn")} <b>{n.months} {t("months")}</b></> : <b>{t("skNow")}</b>}</span></p>
    {/* 2.1.7: the buy / use button (or the progress) always sits at the bottom of the panel */}
    <div class="skfoot">
    {!own ? <>
      {S.mp && S.mp.kind === "coop" && P.Mp && !P.Mp.myRoles().includes(P.MP.CAT_ROLE[n.cat]) ? <p class="mpskrole"><RoleBadge id={P.MP.CAT_ROLE[n.cat]} size={22}/> {S.lang === "th" ? "สกิลนี้เป็นงานของกระทรวง" : "This skill belongs to"} <b>{L(P.MP.ROLE[P.MP.CAT_ROLE[n.cat]].name)}</b></p> : null}
      {full ? <p class="bad small">{t("capFull")}</p> : st === "locked" ? <p class="warn small">{t("needReq")}</p>
        : !can && S.oreOn && P.matCost(n) && !P.matOk(n) && P.rawFor ? Object.entries(P.matCost(n)).filter(([g, v]) => (S.mat[g] || 0) < v && P.rawFor(g) > 0).map(([g]) => <small class="muted" key={g}><Rich t={`[[${P.MAT[g].icon}]] ${t("refWaiting").replace("{N}", P.rawFor(g)).replace("{M}", P.monthsToRefine(g))}`} iconColor="inherit"/></small>)
        : null}
      {(() => { const matShort = !can && S.oreOn && P.matCost(n) && !P.matOk(n) && !full && st !== "locked";
        // one line: the unlock button says what is missing (one thing by name, several as "not enough"); the market sits beside it
        return <div class="skbtns">
          <Btn block size="lg" disabled={!can} sound={null} onClick={() => { if (P.buyNode(n.id)){ if (P.SKILL_SND && P.SKILL_SND[n.id]) Audio.snippet(P.SKILL_SND[n.id]); bump(); } }}>{can || full || st === "locked" || !shortList.length ? `[[lock-open]] ${t("unlock")}` : shortList.length === 1 ? `${t("skShortBtn")} ${shortList[0]}` : t("cantAfford")}</Btn>
          {matShort ? <Btn kind="gold" sound="open" onClick={() => { G.closeSkills(); UIM.modal = "market"; bump(); }}>{`[[store]] ${t("toMarket")}`}</Btn> : null}
        </div>; })()}
    </> : n.type === "active" ? <>
      <Btn block size="lg" kind="gold" disabled={!(a && P.abilityReady(a))} onClick={() => { if (P.useAbility(n.id)){ Audio.play("powerup", {vol:.6}); bump(); } }}>{cd ? `${t("cooldown")} ${cd} ${t("months")}` : `[[zap]] ${t("useNow")}`}</Btn>
      {!cd && n.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? <p class="warn small">{t("needCountry")}</p> : n.target === "country" && S.selC ? <p class="muted small">{t("target")}: {P.cname(S.selC)}</p> : null}
    </> : p !== null ? <div class="state roll"><Icon n="hourglass" size={18}/><span>{t("rollingOut")} {Math.round(p * 100)}%<small>{t("rollLeft").replace("{N}", Math.max(...S.rollouts.filter(r => r.id === n.id).map(r => r.left)))}</small></span><Meter v={p} color="gold" h={5}/></div>
      : <p class="state good"><Icon n="check" size={18}/> {t("owned")}</p>}
    </div>
  </div>;
}
/* "[[$money]] เงิน" → "เงิن" (the name without its icon tag) */
const plainName = s2 => String(s2).replace(/\[\[[^\]]*\]\]\s*/g, "");
/* 2.1.7 (design K3): how each group feels about a skill, as a bar either side of the middle */
function GroupBars({list}){
  return <div class="skgbars">{list.map(({g, v}) => { const G = P.GROUP[g], w = Math.min(50, Math.abs(v) / 6 * 50), up = v > 0;
    return <div class="skgbar" key={g}>
      <Icon n={G.icon} size={16} color={G.color}/><span>{L(G.name).replace(/^ภาค/, "")}</span>
      <div class="skgtrack"><i class={up ? "up" : "down"} style={{width:`${w}%`, [up ? "left" : "right"]:"50%"}}/></div>
      <b class={"mono " + (up ? "good" : "bad")}>{up ? "+" : "−"}{Math.max(1, Math.round(Math.abs(v)))}</b>
    </div>; })}</div>;
}

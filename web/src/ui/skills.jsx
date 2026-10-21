/* Skill screen (full screen, like Plague Inc). Hexagon grid of one category · details of the chosen skill · category tabs.
   Opening it pauses the game. Close with ✕, Esc, T or by tapping outside the window.
   Only owned skills and the NEXT skills you can buy are shown; anything further away is "???". */
import ICONS from "../gen/icons.js";
import {P, S, UIM, t, L, up, COL, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, IconBtn, Pill, Meter, Key} from "./widgets.jsx";

const R = 50, COLW = 168, ROWH = 128;
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
  return <div class="veil skills-veil" onClick={e => { if (e.target === e.currentTarget) G.closeSkills(); }}>
    <section class="skills glass-strong" role="dialog" aria-label={t("skillsTitle")}>
      <header class="sk-head">
        <h2><Icon n="network" size={22} color="accent"/>{up(t("skillsTitle"))}</h2>
        <div class="sk-res">
          <span><Rich t={`${P.IC.ep} `}/><b>{Math.floor(S.ep)}</b><small>+{P.epGain()}{t("perMo")}</small></span>
          <span><Rich t={`${P.IC.pc} `}/><b>{Math.floor(S.pc)}</b><small>+{P.pcGain()}{t("perMo")}</small></span>
          {S.oreOn ? <span><Rich t={`${P.IC.ore} `}/><b>{P.isFullRes() ? P.matTotal() : Math.floor(S.ore)}</b><small>+{Math.round(P.oreGain())}{t("perMo")}</small></span> : null}
          <span class={busy >= P.MAX_PROJECTS ? "warn" : "muted"}><Icon n="loader" size={15}/> {t("inProgress")} {busy}/{P.MAX_PROJECTS}</span>
          {P.recentBuys() ? <span class="bad"><Icon n="chart-line" size={15}/> {t("rush")} +{P.recentBuys() * 20}%</span> : null}
          {S.buff.instant ? <span class="good"><Icon n="lightbulb" size={15}/> {t("buffInstant")}</span> : S.buff.disc ? <span class="good"><Icon n="flask-round" size={15}/> {t("buffDisc")}</span> : null}
        </div>
        <span class="muted small paused"><Icon n="pause" size={13}/> {t("pausedHere")}</span>
        <Key k="T"/><Key k="Esc"/>
        <IconBtn n="x" title="Close" onClick={() => G.closeSkills()} sound={null} cls="big"/>
      </header>
      <div class="sk-body">
        <div class="sk-grid">
          <svg viewBox={`0 0 ${maxX} ${maxY}`} preserveAspectRatio="xMidYMid meet">
            <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
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
              const lab = vis ? (p !== null ? `${Math.round(p * 100)}%` : own ? (n.type === "active" ? (S.actCd[n.id] ? `${S.actCd[n.id]} ${t("moShort")}` : t("ready")) : "✓") : `${c.ep}·${c.pc}`) : "???";
              return <g key={n.id} class={`hex ${own ? "own" : vis ? (afford ? "afford" : "vis") : "hid"} ${n.type} ${sel ? "sel" : ""}`} onClick={() => pick(n.id)} onPointerEnter={() => Audio.hover()} tabIndex={0} role="button" aria-label={vis ? L(n.name) : t("hiddenSkill")} onKeyDown={e => { if (e.key === "Enter") pick(n.id); }}>
                {afford ? <polygon class="halo" points={hexPts(cx, cy, R + 8)}/> : null}
                <polygon class="body" points={hexPts(cx, cy, R)}/>
                {p !== null ? <polygon class="prog" points={hexPts(cx, cy, R - 5)} style={{opacity:.15 + .35 * p}}/> : null}
                {sel ? <polygon class="selring" points={hexPts(cx, cy, R + 5)}/> : null}
                <SvgIcon n={vis ? n.icon : "circle-help"} x={cx - 16} y={cy - 25} s={32} color={own ? "#fff" : vis ? (afford ? COL.accent : COL.fg) : COL.muted} op={vis ? 1 : .35}/>
                <text x={cx} y={cy + 25} class="lab">{lab}</text>
                {n.type === "active" ? <SvgIcon n="zap" x={cx + R - 24} y={cy - R + 9} s={13} color={own ? COL.gold : COL.muted}/> : null}
                {vis && n.trade ? <SvgIcon n="scale" x={cx - R + 11} y={cy - R + 9} s={13} color={COL.warn}/> : null}
                {vis && n.resp ? <SvgIcon n="shield" x={cx - R + 11} y={cy - R + 9} s={13} color={COL.sky}/> : null}
                <foreignObject x={cx - 80} y={cy + R + 2} width="160" height="40"><div class="hexname" xmlns="http://www.w3.org/1999/xhtml">{vis ? L(n.name) : t("hiddenSkill")}</div></foreignObject>
              </g>;
            })}
          </svg>
          <div class="rollouts">{S.rollouts.length ? S.rollouts.slice(0, 6).map((ro, i) => {
            const n = P.SKILL[ro.id];
            return <div class="ro" key={i}><Icon n={n.icon} size={16} color="accent"/><span>{L(n.name)}</span><Meter v={1 - ro.left / ro.months} h={4}/><small class="mono">{ro.left} {t("moShort")}</small></div>;
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
    const req = n.req.filter(q => !S.owned[q]).map(q => (visible(P.SKILL[q]) ? L(P.SKILL[q].name) : "???"));
    return <div class="sk-detail"><div class="dtop"><span class="dicon hid"><Icon n="circle-help" size={36}/></span><h3>{t("hiddenSkill")}</h3></div><p class="muted">{t("hiddenHint")} {req.join(", ")}</p></div>;
  }
  const tags = [n.type === "active" ? "active" : "passive", n.trade && "trade", n.resp && "resp", n.target === "country" && "country"].filter(Boolean);
  const oc = P.oreCost(n), full = st === "ready" && P.atCapacity(n), can = st === "ready" && !full && P.canAfford(n);
  const a = own && n.type === "active" ? P.abilityList().find(q => q.id === n.id) : null, cd = S.actCd[n.id] || 0, p = P.rollProgress(n.id);
  return <div class="sk-detail" key={n.id}>
    <div class="dtop">
      <span class={"dicon " + (own ? "own" : "")}><Icon n={n.icon} size={36}/></span>
      <div><h3>{L(n.name)}</h3><div class="pills">{tags.map(tg => <Pill key={tg} t={L(P.SKILL_TYPE[tg])} kind={tg === "trade" ? "warn" : tg === "active" ? "gold" : tg === "resp" ? "acc" : ""}/>)}</div></div>
    </div>
    <Effects chips={P.skillChips(n)}/>
    <p class="desc muted"><Rich t={L(n.desc)}/></p>
    <div class="pills">
      {!own ? <><Pill t={`${P.IC.ep} ${c.ep}`} kind={S.ep >= c.ep ? "acc" : "bad"}/><Pill t={`${P.IC.pc} ${c.pc}`} kind={S.pc >= c.pc ? "acc" : "bad"}/>{P.isFullRes() ? Object.entries(P.matCost(n) || {}).map(([g, v]) => <Pill key={g} t={`[[${P.MAT[g].icon}]] ${v}`} kind={(S.mat[g] || 0) >= v ? "acc" : "bad"}/>) : oc ? <Pill t={`${P.IC.ore} ${oc}`} kind={(S.ore || 0) >= oc ? "acc" : "bad"}/> : null}</> : null}
      <Pill t={`${t("needs")}: ${n.req.length ? n.req.map(q => L(P.SKILL[q].name)).join(" + ") : t("none")}`}/>
      {n.months ? <Pill t={`${t("rollout")} ${n.months} ${t("months")}`}/> : null}
      {n.type === "active" ? <Pill t={`${t("cooldownLen")} ${n.cd} ${t("months")}`} kind="gold"/> : null}
    </div>
    {!own ? <>
      <Btn block size="lg" disabled={!can} sound={null} onClick={() => { if (P.buyNode(n.id)) bump(); }}>{`[[lock-open]] ${t("unlock")}`}</Btn>
      {full ? <p class="bad small">{t("capFull")}</p> : st === "locked" ? <p class="warn small">{t("needReq")}</p> : !can ? <p class="bad small">{t("cantAfford")}</p> : null}
    </> : n.type === "active" ? <>
      <Btn block size="lg" kind="gold" disabled={!(a && P.abilityReady(a))} onClick={() => { if (P.useAbility(n.id)){ Audio.play("powerup", {vol:.6}); bump(); } }}>{cd ? `${t("cooldown")} ${cd} ${t("months")}` : `[[zap]] ${t("useNow")}`}</Btn>
      {!cd && n.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? <p class="warn small">{t("needCountry")}</p> : n.target === "country" && S.selC ? <p class="muted small">{t("target")}: {P.cname(S.selC)}</p> : null}
    </> : <p class={"state " + (p !== null ? "acc" : "good")}><Icon n={p !== null ? "loader" : "check"} size={18}/> {p !== null ? `${t("rollingOut")} ${Math.round(p * 100)}%` : t("owned")}</p>}
    <p class="muted small tip"><Rich t={t("skillTip")} iconColor="inherit"/></p>
  </div>;
}

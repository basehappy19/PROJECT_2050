/* 2.0 · Approval, redesigned: one number per group (with its name on it), how far the next step is,
   and things you can do right here to please each group */
import {P, S, UIM, L, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn} from "./widgets.jsx";
import {Modal} from "./modals.jsx";

const T = (th, en) => ({th, en});
const W = {
  title:T("ความนิยม", "Approval"),
  total:T("ความนิยมรวม", "Overall approval"),
  how:T("คือค่าเฉลี่ยความพอใจของคน 4 กลุ่ม กลุ่มที่คนเยอะกว่ามีผลมากกว่า", "is the average mood of 4 groups of people; bigger groups count for more"),
  zeroSum:T("ทำให้กลุ่มหนึ่งพอใจขึ้น กลุ่มอื่นจะลดลงนิดหน่อย ถ้าอยากให้ความนิยมรวมขึ้น ดูด้านล่างสุด", "Pleasing one group costs the others a little. To raise the overall number, see the bottom"),
  share:T("ของประชากร", "of the people"),
  mood:T("ความพอใจ", "Mood"),
  year:T("ใน 1 ปี", "this year"),
  protest:T("ประท้วง", "Protest"), backing:T("สนับสนุน", "Backing"),
  st:{back:T("สนับสนุนคุณ", "Backing you"), ok:T("เฉยๆ", "Neutral"), low:T("เริ่มไม่พอใจ", "Unhappy"), angry:T("ไม่พอใจมาก", "Very angry")},
  isBacking:T("กำลังสนับสนุนคุณ", "Backing you now"),
  toBack:T("อีก {n}% จะสนับสนุนคุณ", "{n}% more and they back you"),
  willGet:T("ได้", "you get"),
  angryNow:T("เสี่ยงประท้วงทุกเดือน", "Protests any month now"),
  toCalm:T("ต้องขึ้นอีก {n}% ถึงจะสงบ", "{n}% more to calm them"),
  nearAngry:T("อีก {n}% จะไม่พอใจมากจนประท้วง", "{n}% lower and they protest"),
  now:T("ตอนนี้", "Now"),
  income:T("รายได้", "income"), policy:T("แต้มนโยบาย", "policy points"),
  doThis:T("ทำแบบนี้แล้วพอใจขึ้น", "This would please them"),
  approve:T("อนุมัติ", "Approve"), view:T("ดูสกิล", "See skill"), use:T("ใช้เลย", "Use"),
  locked:T("ต้องปลดล็อกสกิลก่อนหน้า", "Unlock the skill before it first"), noMoney:T("เงินหรือแต้มยังไม่พอ", "Not enough money or points yet"),
  busy:T("โครงการเต็ม รอให้เสร็จก่อน", "Too many projects running"), notMine:T("งานของกระทรวงอื่น", "Another ministry's job"),
  ability:T("ความสามารถ", "Ability"),
  nothing:T("ตอนนี้ไม่มีสกิลที่ช่วยกลุ่มนี้แล้ว เลือกตัวเลือกเหตุการณ์ที่กลุ่มนี้ชอบแทน", "No skills left that help this group: pick event choices they like"),
  hates:T("ไม่ชอบ", "Dislikes"),
  tipTitle:T("เพิ่มความนิยมรวม (ทุกกลุ่มขึ้นพร้อมกัน)", "Raise overall approval (every group at once)"),
  tipRed:T("ช่วยจุดสีแดงให้ทันเวลา", "Answer red calls for help in time"),
  tipRedNow:T("รออยู่ {n} จุด", "{n} waiting"), tipGo:T("ไปที่จุดนั้น", "Go there"),
  tipAdapt:T("สั่ง \"ปรับตัวรับภัย\" ในภูมิภาค", "Order \"Adapt\" in a region"),
  tipEvent:T("เลือกตัวเลือกเหตุการณ์ที่มี", "Event choices showing"),
  tipMiss:T("ปล่อยจุดแดงหมดเวลา", "Letting a red call expire"),
  urgent:T("ด่วน", "Urgent"), close:T("ใกล้แล้ว", "Almost"), allGood:T("ทุกกลุ่มไม่มีปัญหา", "Every group is fine"),
  allGoodSub:T("รักษาไว้ และหาโอกาสให้กลุ่มที่ใกล้สนับสนุนข้ามเส้น", "Keep it up, and push a group that is close to backing you"),
};
const fill = (o, n) => L(o).replace("{n}", n);
const MOOD = {back:["smile", "good"], ok:["meh", "muted"], low:["frown", "warn"], angry:["angry", "bad"]};
const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v));

/* the reward a group gives when it backs you, without the "Backing you:" label */
const reward = G => L(G.good).replace(/^[^:]*:\s*/, "");
const threat = G => L(G.bad).replace(/^[^:]*:\s*/, "");

/* can this player approve a skill now? (multiplayer co-op: only your own ministries) */
function skillCheck(n){
  if (P.nodeState(n) === "locked") return {ok:false, why:W.locked};
  if (S.mp && S.mp.kind === "coop" && P.Mp && P.MP && !P.Mp.myRoles().includes(P.MP.CAT_ROLE[n.cat])) return {ok:false, why:W.notMine};
  const c = P.nodeCost(n);
  if (S.ep < c.ep || S.pc < c.pc || (P.oreCost && P.oreCost(n) > (S.ore || 0)) || (P.matOk && !P.matOk(n))) return {ok:false, why:W.noMoney, c};
  if (P.atCapacity(n)) return {ok:false, why:W.busy, c};
  return {ok:true, c};
}
/* the best things to do for group g: abilities ready now, then skills (buyable, ready, locked), best gain first */
export function adviceFor(g, max = 3){
  const out = [];
  if (P.abilityList) for (const a of P.abilityList()){
    const t = P.tiltOfAbility ? P.tiltOfAbility(a.id) : []; const mine = t.find(x => x.g === g);
    if (mine && mine.v >= 1 && P.abilityReady(a)) out.push({kind:"abil", id:a.id, icon:a.icon, name:a.name, gain:mine.v, side:t.filter(x => x.g !== g && x.v <= -1), rank:0});
  }
  for (const n of P.SKILLS){
    if (S.owned[n.id]) continue;
    const t = P.tiltOfSkill(n.id), mine = t.find(x => x.g === g);
    if (!mine || mine.v < 1) continue;
    const chk = skillCheck(n), st = P.nodeState(n);
    // locked skills count too (further down): the nearer they are, the better
    const near = st !== "locked" || n.req.every(q => S.owned[q] || P.nodeState(P.SKILLS.find(x => x.id === q)) === "ready");
    out.push({kind:"skill", id:n.id, icon:n.icon, name:n.name, gain:mine.v, side:t.filter(x => x.g !== g && x.v <= -1), chk, rank:chk.ok ? 1 : st === "ready" ? 2 : near ? 3 : 4});
  }
  out.sort((a, b) => a.rank - b.rank || b.gain - a.gain);
  return out.slice(0, max);
}
function openSkill(id){
  const n = P.SKILLS.find(x => x.id === id); if (!n) return;
  UIM.modal = null; S.skillCat = n.cat; S.node = id; bump(); G.openSkills();
}
function doAdvice(a){
  if (a.kind === "abil"){ if (P.useAbility(a.id)) Audio.play("action"); return; }
  if (a.chk && a.chk.ok){ if (P.buyNode(a.id) !== false) Audio.play("buy"); return; }
  openSkill(a.id);
}

function Advice({a}){
  const th = S.lang === "th";
  const btn = a.kind === "abil" ? `[[sparkles]] ${L(W.use)}` : a.chk.ok ? `[[check]] ${L(W.approve)}` : `[[network]] ${L(W.view)}`;
  const c = a.kind === "skill" && a.chk.c;
  return <div class={"padv " + (a.kind === "abil" || a.chk.ok ? "can" : "")}>
    <Icon n={a.icon || "circle"} size={18} cls="padv-ic"/>
    <span class="grow padv-t">
      <b>{L(a.name)}{a.kind === "abil" ? <small class="muted"> · {L(W.ability)}</small> : null}</b>
      <small>
        <span class="good mono">{sgn(a.gain)}</span>
        {a.side.map(x => <span key={x.g} class="padv-side" title={L(P.GROUP[x.g].name)}><Icon n={P.GROUP[x.g].icon} size={11}/>{sgn(x.v)}</span>)}
        {c && (a.chk.ok || a.chk.why === W.noMoney) ? <span class={"padv-cost " + (a.chk.ok ? "" : "bad")}><Rich t={`${P.IC.ep}${c.ep}${c.pc ? ` ${P.IC.pc}${c.pc}` : ""}`} iconColor="inherit"/></span> : null}
        {a.kind === "skill" && !a.chk.ok ? <span class="muted">{L(a.chk.why)}</span> : null}
      </small>
    </span>
    <Btn size="sm" kind={a.kind === "abil" || a.chk.ok ? "primary" : "ghost"} sound={null} onClick={() => doAdvice(a)}>{btn}</Btn>
  </div>;
}

/* the bar: red zone (protests) and green zone (backing), with where the group is now */
function Zones({v, back}){
  return <div class="pzone">
    <div class="pzone-bar">
      <span class="pz-red" style={{width:`${P.GROUP_ANGRY}%`}}/>
      <span class="pz-green" style={{left:`${back}%`}}/>
      <i style={{width:`${v}%`}}/>
      <b class="pz-pin" style={{left:`${v}%`}}/>
    </div>
    <div class="pzone-lab"><small class="bad" style={{width:`${P.GROUP_ANGRY}%`}}>{L(W.protest)}</small><span class="grow"/><small class="good" style={{width:`${100 - back}%`}}>{L(W.backing)}</small></div>
  </div>;
}

function GroupCard({Gd}){
  const g = Gd.id, v = S.groups[g], st = P.groupState(g), [face, col] = MOOD[st], goal = P.groupGoal(g);
  const h = (S.grpHist || {})[g] || [], d = h.length > 1 ? v - h[Math.max(0, h.length - 13)] : 0;
  const back = Math.min(99, Math.max(P.GROUP_BACK, goal.mean + 6));
  const adv = adviceFor(g);
  // the line that says what is next for this group
  let next;
  if (st === "back") next = <p class="pnext good"><Icon n="circle-check" size={15}/><span><b>{L(W.isBacking)}</b> · {reward(Gd)}</span></p>;
  else if (st === "angry") next = <p class="pnext bad"><Icon n="megaphone" size={15}/><span><b>{L(W.angryNow)}</b>: {threat(Gd)} · {fill(W.toCalm, Math.ceil(goal.toCalm))}</span></p>;
  else if (goal.toAngry < 10) next = <p class="pnext warn"><Icon n="triangle-alert" size={15}/><span><b>{fill(W.nearAngry, Math.max(1, Math.floor(goal.toAngry)))}</b> · {threat(Gd)}</span></p>;
  else next = <p class="pnext"><Icon n="target" size={15}/><span><b>{fill(W.toBack, Math.ceil(goal.toBack))}</b> · {L(W.willGet)} {reward(Gd)}</span></p>;
  // industry sets income, the young set policy points: show what it does right now
  const m = g === "ind" && P.incMult ? [P.incMult(), W.income, P.IC.ep] : g === "youth" && P.pcMult ? [P.pcMult(), W.policy, P.IC.pc] : null;
  return <article class={"pgroup " + st} style={{"--gc":Gd.color}}>
    <header>
      <span class="pg-ic"><Icon n={Gd.icon} size={22}/></span>
      <span class="grow"><b>{L(Gd.name)}</b><small class="muted">{Math.round(Gd.w * 100)}% {L(W.share)}</small></span>
      <span class={"pmood " + col}><Icon n={face} size={16}/>{L(W.st[st])}</span>
    </header>
    <div class="pnum"><b class="mono">{v.toFixed(0)}%</b><span><small class="muted">{L(W.mood)}</small>
      {Math.abs(d) >= 1 ? <small class={"mono " + (d > 0 ? "good" : "bad")}>{d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)} {L(W.year)}</small> : null}</span></div>
    <Zones v={v} back={back}/>
    {next}
    {m && Math.abs(m[0] - 1) >= .005 ? <p class={"pnow " + (m[0] > 1 ? "good" : "bad")}><Rich t={`${L(W.now)}: ${m[2]} ${L(m[1])} ${m[0] > 1 ? "+" : "−"}${Math.round(Math.abs(m[0] - 1) * 100)}%`} iconColor="inherit"/></p> : null}
    <div class="padvs"><small class="ph">{L(W.doThis)}</small>
      {adv.length ? adv.map(a => <Advice key={a.kind + a.id} a={a}/>) : <small class="muted">{L(W.nothing)}</small>}
    </div>
    <p class="phates"><Icon n="thumbs-down" size={13}/><span>{L(W.hates)}: {L(Gd.hates)}</span></p>
  </article>;
}

/* the one thing to look at first */
function Headline(){
  const gs = P.GROUPS.map(Gd => ({Gd, st:P.groupState(Gd.id), goal:P.groupGoal(Gd.id)}));
  const angry = gs.filter(x => x.st === "angry").sort((a, b) => a.goal.v - b.goal.v)[0];
  const near = gs.filter(x => x.st !== "back" && x.st !== "angry" && x.goal.toBack <= 12).sort((a, b) => a.goal.toBack - b.goal.toBack)[0];
  const pick = angry || near; if (!pick) return <div class="phead ok"><Icon n="smile" size={22}/><span><b>{L(W.allGood)}</b><small>{L(W.allGoodSub)}</small></span></div>;
  const a = adviceFor(pick.Gd.id, 1)[0];
  return <div class={"phead " + (angry ? "bad" : "good")} style={{"--gc":pick.Gd.color}}>
    <Icon n={angry ? "siren" : "target"} size={22}/>
    <span class="grow"><b>{L(angry ? W.urgent : W.close)}: {L(pick.Gd.name)}</b>
      <small>{angry ? `${L(W.angryNow)} · ${fill(W.toCalm, Math.ceil(pick.goal.toCalm))}` : `${fill(W.toBack, Math.ceil(pick.goal.toBack))} · ${L(W.willGet)} ${reward(pick.Gd)}`}</small></span>
    {a ? <Advice a={a}/> : null}
  </div>;
}

/* ways to raise every group at once */
function TotalTips(){
  const reds = (S.bubbles || []).filter(b => b.type === "red");
  const go = () => { const b = reds.slice().sort((x, y) => x.ttl - y.ttl)[0]; if (!b) return; UIM.modal = null; bump(); if (b.cid) GameMap.focusCountry(b.cid); else GameMap.focus(b.reg, true); };
  const up = P.APPR_UP || 1, dn = P.APPR_DOWN || 1, pct = v => `${v > 0 ? "+" : "−"}${(Math.abs(v)).toFixed(v % 1 ? 1 : 0)}%`;
  return <section class="ptips"><b class="ph"><Icon n="trending-up" size={15}/> {L(W.tipTitle)}</b>
    <div class="ptiprow">
      <div class="ptip"><Icon n="hand-heart" size={18} cls="bad"/><span class="grow"><b>{L(W.tipRed)}</b><small class="good mono">{pct(up)}</small>
        {reds.length ? <small class="warn"> · {fill(W.tipRedNow, reds.length)}</small> : null}</span>
        {reds.length ? <Btn size="sm" kind="primary" sound={null} onClick={go}>{`[[map-pin]] ${L(W.tipGo)}`}</Btn> : null}</div>
      <div class="ptip"><Icon n="shield" size={18}/><span class="grow"><b>{L(W.tipAdapt)}</b><small class="good mono">{pct(up)}</small></span></div>
      <div class="ptip"><Rich t={`[[$appr]]`}/><span class="grow"><b><Rich t={`${L(W.tipEvent)} [[$appr]] +`}/></b></span></div>
      <div class="ptip neg"><Icon n="timer-off" size={18} cls="bad"/><span class="grow"><b>{L(W.tipMiss)}</b><small class="bad mono">{pct(-2 * dn)}</small></span></div>
    </div>
  </section>;
}

export function Politics(){
  const close = () => { UIM.modal = null; bump(); };
  if (!S.groups) return null;
  return <Modal kind="politics" wide onClose={close}>
    <div class="ptop">
      <h2><Icon n="$appr" size={30}/> {L(W.title)} <span class="mono">{S.appr.toFixed(0)}%</span></h2>
      <p class="muted"><b>{L(W.total)}</b> {L(W.how)}<br/><small>{L(W.zeroSum)}</small></p>
    </div>
    <Headline/>
    <div class="pgroups">{P.GROUPS.map(Gd => <GroupCard key={Gd.id} Gd={Gd}/>)}</div>
    <TotalTips/>
  </Modal>;
}

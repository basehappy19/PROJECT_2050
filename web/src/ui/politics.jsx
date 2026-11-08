/* 3.3 · Approval, design B: one bar split by group size, then one row per group
   (face · % · bar with protest / backing zones · how far to backing) and what each group dislikes.
   No advice on what to buy: the player decides. */
import {P, S, UIM, L, bump} from "../core.js";
import {Icon} from "./icon.jsx";
import {Modal} from "./modals.jsx";

const T = (th, en) => ({th, en});
const W = {
  title:T("ความนิยม", "Approval"),
  who:T("ใครมีผลกับความนิยมมากแค่ไหน", "Who counts for how much"),
  backing:T("สนับสนุน", "Backing"), protest:T("ประท้วง", "Protest"),
  toBack:T("อีก {n}%", "{n}% to go"),
  hates:T("ไม่ชอบ", "Dislikes"),
  tip:T("กลุ่มที่ถึง {b}% จะสนับสนุนคุณและให้โบนัส · ต่ำกว่า {a}% จะประท้วง", "A group at {b}% backs you and gives a bonus · below {a}% it protests"),
  year:T("ใน 1 ปี", "in a year"),
};
const fill = (o, n) => L(o).replace("{n}", n);
const FACE = {back:["laugh", "good"], ok:["smile", "muted"], low:["frown", "warn"], angry:["angry", "bad"]};
const after = s => s.replace(/^[^:]*:\s*/, "");

function Zone({v, back, col}){
  return <span class="zb2">
    <span class="zbad" style={{width:`${P.GROUP_ANGRY}%`}}/><span class="zgood" style={{left:`${back}%`}}/>
    <b style={{width:`${v}%`, background:col}}/><em style={{left:`${back}%`}}/>
  </span>;
}

function Row({Gd}){
  const g = Gd.id, v = S.groups[g], st = P.groupState(g), goal = P.groupGoal(g), [face, fc] = FACE[st];
  const back = Math.min(99, Math.max(P.GROUP_BACK, goal.mean + 6));
  const h = (S.grpHist || {})[g] || [], d = h.length > 1 ? v - h[Math.max(0, h.length - 13)] : 0;
  const status = st === "back" ? <span class="pneed good">{L(W.backing)}</span>
    : st === "angry" ? <span class="pneed bad"><Icon n="megaphone" size={13}/> {L(W.protest)}</span>
    : <span class="pneed">{fill(W.toBack, Math.ceil(goal.toBack))}</span>;
  return <div class={"prow2 " + st} style={{"--gc":Gd.color}} title={st === "angry" ? after(L(Gd.bad)) : after(L(Gd.good))}>
    <span class="pn"><Icon n={Gd.icon} size={18} color={Gd.color}/><b>{L(Gd.name)}</b></span>
    <Icon n={face} size={22} cls={"pface " + fc}/>
    <span class="pv mono" style={{color:Gd.color}}>{v.toFixed(0)}%{Math.abs(d) >= 1 ? <small class={d > 0 ? "good" : "bad"} title={L(W.year)}>{d > 0 ? "▲" : "▼"}{Math.abs(d).toFixed(0)}</small> : null}</span>
    <Zone v={v} back={back} col={Gd.color}/>
    {status}
  </div>;
}

export function Politics(){
  const close = () => { UIM.modal = null; bump(); };
  if (!S.groups) return null;
  const ac = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  return <Modal kind="politics" wide onClose={close}>
    <div class="appr2">
      <h2><Icon n="$appr" size={28}/> {L(W.title)} <b class={"mono " + ac}>{S.appr.toFixed(0)}%</b></h2>
      <small class="muted">{L(W.who)}</small>
      <div class="pstack">{P.GROUPS.map(Gd => <i key={Gd.id} style={{width:`${Gd.w * 100}%`, background:Gd.color}} title={L(Gd.name)}><Icon n={Gd.icon} size={14}/> {Math.round(Gd.w * 100)}%</i>)}</div>
      <div class="prows2">{P.GROUPS.map(Gd => <Row key={Gd.id} Gd={Gd}/>)}</div>
      <div class="phates2"><Icon n="frown" size={15} color="bad"/><small class="muted">{L(W.hates)}:</small>
        {P.GROUPS.flatMap(Gd => L(Gd.hates).split(/\s*[·,]\s*/).filter(Boolean).map(x => <span key={Gd.id + x} style={{"--gc":Gd.color}}><Icon n={Gd.icon} size={12} color={Gd.color}/>{x}</span>))}</div>
      <p class="ptip2 muted"><Icon n="info" size={14}/>{L(W.tip).replace("{b}", P.GROUP_BACK).replace("{a}", P.GROUP_ANGRY)}</p>
    </div>
  </Modal>;
}

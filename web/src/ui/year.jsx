/* 2.0: the yearly review (every January) and the opening scene of a new game */
import {useEffect, useState} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, Portrait} from "./widgets.jsx";

/* 25 squares, 2026 … 2050: good · bad · still to come */
export function YearStrip({cur, big}){
  const ys = S.years || [], by = {}; ys.forEach(x => { by[x.y] = x; });
  return <div class={"ystrip " + (big ? "big" : "")}>{Array.from({length:25}, (_, i) => {
    const y = 2026 + i, r = by[y];
    return <i key={y} class={(r ? (r.g ? "g" : "b") : "") + (y === cur ? " cur" : "")} aria-label={r ? `${y}: ${r.s}/100` : String(y)}>{big && (i % 6 === 0 || y === cur) ? <small>{y}</small> : null}</i>;
  })}</div>;
}
function Ring({v, good}){
  const R = 46, C = 2 * Math.PI * R, [n, setN] = useState(0);
  useEffect(() => { let raf, t0 = performance.now(); const step = now => { const p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3); setN(Math.round(v * e)); if (p < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf); }, [v]);
  const col = good ? COL.good : COL.bad;
  return <svg class="yring" viewBox="0 0 120 120" width="132" height="132">
    <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.08)" stroke-width="11"/>
    <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2" stroke-dasharray="2 4" transform="rotate(-90 60 60)" style={{strokeDashoffset:0}}/>
    <circle cx="60" cy="60" r={R} fill="none" stroke={col} stroke-width="11" stroke-linecap="round" stroke-dasharray={`${C * n / 100} ${C}`} transform="rotate(-90 60 60)"/>
    <line x1="60" y1="8" x2="60" y2="20" stroke="#fff" stroke-width="2" transform="rotate(180 60 60)" opacity=".5"/>
    <text x="60" y="62" text-anchor="middle" dominant-baseline="middle" fill="#fff" style={{font:"700 34px var(--mono)"}}>{n}</text>
    <text x="60" y="88" text-anchor="middle" fill={col} style={{font:"600 11px var(--disp)"}}>/ 100</text>
  </svg>;
}
export function YearModal(){
  const r = UIM.yearRec; if (!r) return null;
  if (r.span) return <Year5 r={r}/>;
  const st = P.yearStory(r), T2 = P.UI2, good = !!r.g, who = st.who, news = who === "news";
  const npc = P.NPC[who], name = news ? "THE WORLD TIMES" : npc ? L(npc.name) : who === "adv" ? L(P.ADVISOR.name) : "";
  const col = news ? COL.fg : npc ? npc.color : COL.purple;
  const ng = (S.years || []).filter(x => x.g).length;
  return <div class="veil year-veil" onClick={e => { if (e.target === e.currentTarget && performance.now() - (UIM.yearAt || 0) > 700) G.closeYear(); }}>
    <section class={"modal year " + (good ? "good" : "bad")} role="dialog" aria-modal="true">
      <div class="yhead">
        <div>
          <div class={"tag " + (good ? "good" : "bad")}><Rich t={up(`[[${good ? "trending-up" : "trending-down"}]] ${L(T2.yrTitle)} ${r.y}`)} iconColor="inherit"/></div>
          <h2>{good ? L(T2.yrGood) : L(T2.yrBad)}</h2>
          <div class="ynums">
            <span><small><Rich t={t("co2")}/></small><b class="mono">{r.net.toFixed(1)} Gt</b></span>
            <span><small>{L(T2.yrTarget)}</small><b class="mono">≤ {r.tgt.toFixed(1)} Gt</b></span>
            <span><small>{L(T2.yrCut)}</small><b class={"mono " + (r.cut > 0 ? "good" : "bad")}>{r.cut > 0 ? "−" : "+"}{Math.abs(r.cut).toFixed(1)} Gt</b></span>
          </div>
        </div>
        <Ring v={r.s} good={good}/>
      </div>
      <div class={"ystory " + (news ? "news" : "")} style={{"--sc":col}}>
        {news ? <span class="ynews"><Icon n="newspaper" size={34}/></span> : <Portrait id={who} size={74} ring={col}/>}
        <div><b style={{color:col}}>{name}</b><p>“{L(st)}”</p></div>
      </div>
      <div class={"yreward " + (good ? "good" : "bad")}>
        <Icon n={good ? "hand-coins" : "shield-alert"} size={20}/>
        <span>{good ? L(T2.yrRewardGood) : L(T2.yrRewardBad)}</span>
        <span class="grow"/>
        {r.ep ? <b class="mono good"><Rich t={`${P.IC.ep} +${r.ep}`} iconColor="inherit"/></b> : null}
        {r.pc ? <b class="mono good"><Rich t={`${P.IC.pc} +${r.pc}`} iconColor="inherit"/></b> : null}
        {r.appr ? <b class={"mono " + (r.appr > 0 ? "good" : "bad")}><Rich t={`${P.IC.appr} ${r.appr > 0 ? "+" : "−"}${Math.abs(r.appr).toFixed(1)}%`} iconColor="inherit"/></b> : null}
      </div>
      <div class="yfoot">
        <div class="grow"><small class="muted">{L(T2.yrGoodYears)} <b class="good mono">{ng}</b> / {(S.years || []).length}</small><YearStrip cur={r.y}/></div>
        <Btn onClick={() => G.closeYear()} sound={null}>{`${L(T2.yrNext)} [[chevron-right]]`}</Btn>
      </div>
      <p class="muted tiny yhow">{L(T2.yrHow)}</p>
    </section>
  </div>;
}

/* 2.1.6: the 5-year review: the average score, one tile per year (score, good or bad), CO₂ against the target, what the 5 years cut and paid */
function Year5({r}){
  const st = P.yearStory(r), T2 = P.UI2, good = !!r.g, who = st.who, news = who === "news";
  const npc = P.NPC[who], name = news ? "THE WORLD TIMES" : npc ? L(npc.name) : who === "adv" ? L(P.ADVISOR.name) : "";
  const col = news ? COL.fg : npc ? npc.color : COL.purple;
  const ng = (S.years || []).filter(x => x.g).length;
  return <div class="veil year-veil" onClick={e => { if (e.target === e.currentTarget && performance.now() - (UIM.yearAt || 0) > 700) G.closeYear(); }}>
    <section class={"modal year y5 " + (good ? "good" : "bad")} role="dialog" aria-modal="true">
      <div class="yhead">
        <div>
          <div class={"tag " + (good ? "good" : "bad")}><Rich t={up(`[[calendar-check]] ${L(T2.yr5Title)} ${r.y0}–${r.y}`)} iconColor="inherit"/></div>
          <h2>{good ? L(T2.yr5Good) : L(T2.yr5Bad)}</h2>
          <div class="ynums">
            <span><small><Rich t={t("co2")}/></small><b class="mono">{r.net.toFixed(1)} Gt</b></span>
            <span><small>{L(T2.yrTarget)}</small><b class="mono">≤ {r.tgt.toFixed(1)} Gt</b></span>
            <span><small>{L(T2.yr5Cut)}</small><b class={"mono " + (r.cut > 0 ? "good" : "bad")}>{r.cut > 0 ? "−" : "+"}{Math.abs(r.cut).toFixed(1)} Gt</b></span>
          </div>
        </div>
        <div class="y5ring"><Ring v={r.s} good={good}/><small>{L(T2.yr5Avg)}</small></div>
      </div>
      <div class="y5years">{r.list.map((x, i) => <div key={x.y} class={"y5y " + (x.g ? "g" : "b")} style={{animationDelay:`${.15 + i * .08}s`}}>
        <small>{x.y}</small><b class="mono">{x.s}</b><Icon n={x.g ? "trending-up" : "trending-down"} size={14}/>
      </div>)}</div>
      <div class={"ystory " + (news ? "news" : "")} style={{"--sc":col}}>
        {news ? <span class="ynews"><Icon n="newspaper" size={34}/></span> : <Portrait id={who} size={74} ring={col}/>}
        <div><b style={{color:col}}>{name}</b><p>“{L(st)}”</p></div>
      </div>
      <div class={"yreward " + (good ? "good" : "bad")}>
        <Icon n={good ? "hand-coins" : "shield-alert"} size={20}/>
        <span>{good ? L(T2.yr5RewardGood) : L(T2.yr5RewardBad)}</span>
        <span class="grow"/>
        {r.ep ? <b class="mono good"><Rich t={`${P.IC.ep} +${r.ep}`} iconColor="inherit"/></b> : null}
        {r.pc ? <b class="mono good"><Rich t={`${P.IC.pc} +${r.pc}`} iconColor="inherit"/></b> : null}
        {r.appr ? <b class={"mono " + (r.appr > 0 ? "good" : "bad")}><Rich t={`${P.IC.appr} ${r.appr > 0 ? "+" : "−"}${Math.abs(r.appr).toFixed(1)}%`} iconColor="inherit"/></b> : null}
      </div>
      <div class="yfoot">
        <div class="grow"><small class="muted">{L(T2.yrGoodYears)} <b class="good mono">{ng}</b> / {(S.years || []).length}</small><YearStrip cur={r.y}/></div>
        <Btn onClick={() => G.closeYear()} sound={null}>{`${L(T2.yr5Next)} [[chevron-right]]`}</Btn>
      </div>
      <p class="muted tiny yhow">{L(T2.yr5How)}</p>
    </section>
  </div>;
}

/* ---------------- the opening scene: a few seconds that tell you what's at stake, then straight into the game ---------------- */
const INTRO = {
  date:{th:"1 มกราคม 2026", en:"1 January 2026"},
  heads:[
    {icon:"thermometer", th:"โลกร้อนขึ้นแล้ว +1.2°C", en:"The world is already +1.2°C warmer"},
    {icon:"factory", th:"ทั่วโลกปล่อย CO₂ 36,000 ล้านตันต่อปี", en:"36 billion tonnes of CO₂ a year"},
    {icon:"cloud-lightning", th:"พายุ น้ำท่วม ภัยแล้ง มาถี่ขึ้นทุกปี", en:"Storms, floods and droughts every year"},
  ],
  chosen:{th:"ทุกประเทศลงมติเลือกคุณ", en:"Every nation voted for you"},
  role:{th:"ผู้อำนวยการคณะทำงานภูมิอากาศโลก (GCT)", en:"Director of the Global Climate Taskforce"},
  goal:{th:"25 ปี · พาโลกไปถึง Net Zero ก่อนสิ้นปี 2050", en:"25 years · bring the world to Net Zero by the end of 2050"},
  go:{th:"เริ่มภารกิจ", en:"Begin the mission"},
};
export function Intro(){
  const [st, setSt] = useState(0);
  useEffect(() => {
    const at = [700, 1500, 2300, 3100, 4300, 5600];
    const ids = at.map((ms, i) => setTimeout(() => { setSt(i + 1); Audio.play(i < 4 ? "news" : i === 4 ? "whoosh" : "bong", {vol:.5}); if (i === 4) GameMap.resetView(); }, ms));
    return () => ids.forEach(clearTimeout);
  }, []);
  const ch = P.CHAR[S.char], line = P.introLine ? P.introLine() : null;
  const done = () => { UIM.modal = null; Audio.play("start"); GameMap.resetView(); G.afterModal(); bump(); };
  return <div class="veil intro-veil">
    <div class="intro">
      <small class={"idate mono " + (st >= 1 ? "on" : "")}>{L(INTRO.date)}</small>
      <div class="iheads">{INTRO.heads.map((h, i) => <div key={i} class={"ihead " + (st >= i + 2 ? "on" : "")}><Icon n={h.icon} size={22}/><span>{L(h)}</span></div>)}</div>
      <div class={"ichosen " + (st >= 5 ? "on" : "")}>
        <Portrait id={S.char} size={96}/>
        <div>
          <small class="mono acc">{up(L(INTRO.chosen))}</small>
          <h2>{L(ch.person)}</h2>
          <span class="muted">{L(INTRO.role)}</span>
          {line ? <p>“{L(line)}”</p> : null}
        </div>
      </div>
      <div class={"igoal " + (st >= 6 ? "on" : "")}><Icon n="flag" size={22}/><b>{L(INTRO.goal)}</b></div>
      <div class="ifoot">
        {st < 6 ? <Btn kind="ghost" size="sm" onClick={done}>{L(P.UI2.introSkip)}</Btn> : <Btn size="lg" onClick={done} sound={null}>{`${L(INTRO.go)} [[play]]`}</Btn>}
      </div>
    </div>
  </div>;
}

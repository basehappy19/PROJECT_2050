/* Learning page: knowledge cards ("Did you know?" facts unlocked by events), local weather, endings gallery, achievements */
import {P, S, UIM, t, L, up, bump, FACT_EVENTS, HZ_IDS} from "../core.js";
import {G} from "../game.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, Tabs, Meter} from "./widgets.jsx";
import {Modal, endImg} from "./modals.jsx";
import {SND_ICON, SND_TINT, eventImg} from "./hero.js";
import {HZ_COL} from "../core.js";

const END_KEYS = ["winS", "winA", "winB", "l3", "l2", "l1"];

export function AchList(){
  const d = P.AchStore.data, n = P.Ach.count(), pct = Math.round(n / P.ACH.length * 100), loc = S.lang === "th" ? "th-TH" : "en-GB";
  return <div class="achs">
    <div class="achtop"><b class="disp">{n}</b><span class="muted"> / {P.ACH.length} · {pct}%</span></div>
    <Meter v={pct / 100} h={5}/>
    <div class="grid2">{P.ACH.map(a => {
      const got = d.got[a.id], secret = a.hidden && !got, p = a.prog && !got ? a.prog(d) : null;
      return <div class={"ach card " + (got ? "got" : "")} key={a.id}>
        <span class="aic"><Icon n={secret ? "lock" : a.icon} size={22}/></span>
        <div class="grow">
          <b>{secret ? t("achSecret") : L(a.t)}</b>
          <span class="muted small">{secret ? "???" : <Rich t={L(a.d)}/>}</span>
          {got ? <small class="mono warn">{t("achOn")} {new Date(got).toLocaleDateString(loc, {dateStyle:"medium"})}</small> : null}
          {p ? <><Meter v={Math.min(1, p[0] / p[1])} h={4}/><small class="mono warn">{Math.min(p[0], p[1])} / {p[1]}</small></> : null}
        </div>
      </div>;
    })}</div>
  </div>;
}

export function Learn(){
  const tab = UIM.learnTab || "cards", d = P.AchStore.data;
  const set = k => () => { UIM.learnTab = k; const m = document.querySelector(".modal.learn"); if (m) m.scrollTop = 0; bump(); };
  let body;
  if (tab === "cards"){
    const got = FACT_EVENTS.filter(e => d.seen.includes(e.id));
    const list = [...got, ...FACT_EVENTS.filter(e => !d.seen.includes(e.id)).slice(0, Math.max(0, 6 - got.length))];
    body = <>
      <p class="muted small">{t("lCardsHelp")} · {got.length}/{FACT_EVENTS.length}</p>
      <div class="grid2">{list.map(e => { const on = d.seen.includes(e.id); return <div class={"fact card " + (on ? "" : "locked")} key={e.id}>
        {on ? <div class="fimg" style={{"--tint":SND_TINT[e.snd] || "#4fd1c5", backgroundImage:`url(${eventImg(e.id)})`}}/> : null}
        <b><Rich t={on ? `[[lightbulb]] ${L(e.title)}` : `[[lock]] ${t("lLocked")}`} iconColor={on ? "warn" : "muted"}/></b>
        <span class="muted small">{on ? L(e.fact) : t("lLockedHelp")}</span>
        {on && e.news ? <a class="small src" href={e.news.url} target="_blank" rel="noopener noreferrer"><Icon n="link" size={12}/> {e.news.src} · {e.news.y}</a> : null}
      </div>; })}</div>
    </>;
  } else if (tab === "res"){
    const who = k => Object.entries(P.CRES).filter(([, v]) => v.r.includes(k)).map(([id]) => P.cname(id));
    body = <>
      <p class="muted small">{t("lResHelp")}</p>
      <div class="grid2">{Object.entries(P.RES).map(([k, R]) => <div class="rescard card" key={k} style={{"--rc":R.col}}>
        <div class="rtop"><span class="ric"><Icon n={R.icon} size={24}/></span><div><b>{L(R.name)}</b><small class="muted">{L(R.use)}</small></div></div>
        <span class="small">{L(R.fact)}</span>
        {who(k).length ? <small class="muted"><Icon n="map-pin" size={12}/> {who(k).slice(0, 6).join(", ")}</small> : null}
        <a class="small src" href={R.src} target="_blank" rel="noopener noreferrer"><Icon n="link" size={12}/> {t("source")}</a>
      </div>)}</div>
    </>;
  } else if (tab === "haz"){
    body = <>
      <p class="muted small">{t("lHazHelp")}</p>
      <div class="hzlist">{HZ_IDS.map(id => { const Z = P.HAZARDS[id], on = (d.haz || []).includes(id); return <div class={"hz card " + (on ? "" : "locked")} key={id}>
        <div class="hzimg" style={on ? {"--tint":HZ_COL[id]} : null}><Icon n={on ? Z.icon : "lock"} size={30}/></div>
        <div class="grow"><b>{L(Z.name)}</b><span class="muted small">{on ? L(Z.fact) : t("lHazLocked")}</span></div>
      </div>; })}</div>
    </>;
  } else if (tab === "end"){
    body = <>
      <p class="muted small">{t("lEndHelp")}</p>
      <div class="grid3">{END_KEYS.map(key => { const on = !!(d.ends || {})[key], win = key.startsWith("win"); return <figure class={"endcard " + (on ? "" : "locked")} key={key}>
        <div class="eimg" style={on ? {backgroundImage:`url(${endImg(win ? "win" : key, win ? key.slice(3) : null)})`} : null}>{on ? null : <Icon n="lock" size={26}/>}</div>
        <figcaption>{on ? (win ? L(P.ENDINGS.win.grades[key.slice(3)]) : t(key + "Title")) : "???"}</figcaption>
      </figure>; })}</div>
    </>;
  } else body = <AchList/>;
  return <Modal kind="learn" onClose={() => G.closeLearn()} wide>
    <h2><Icon n="book-open" size={24} color="accent"/> {up(t("mLearn"))}</h2>
    <Tabs items={[
      {id:"cards", label:`[[lightbulb]] ${t("lCards")}`, on:tab === "cards", fn:set("cards")},
      {id:"res", label:`[[$ore]] ${t("lRes")}`, on:tab === "res", fn:set("res")},
      {id:"haz", label:`[[cloud-lightning]] ${t("lHazards")}`, on:tab === "haz", fn:set("haz")},
      {id:"end", label:`[[image]] ${t("lEndings")}`, on:tab === "end", fn:set("end")},
      {id:"ach", label:`[[trophy]] ${t("mAch")}`, on:tab === "ach", fn:set("ach")},
    ]}/>
    {body}
    <div class="mfoot"><Btn kind="ghost" onClick={() => G.closeLearn()}>{t("mBack")}</Btn></div>
  </Modal>;
}

/* Pop-up windows: dilemma event, end of game, character select, story, pause, tutorial */
import {useEffect, useState, useRef} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, relCol, bump, ls} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {Btn, IconBtn, Seg, Meter, Portrait, portraitSrc, H3, Terra, Volume, GfxSeg, A11ySeg, NarrRow, LangSeg, Msg, Key, SlotInfo, Check, GroupList, GroupTilt, Speak} from "./widgets.jsx";

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
  const side = (lab, ids, col) => <div class="side"><b class={col}>{lab}</b><div class="chips">{ids.map(id => { const c = P.C(id); return <span class="chip static" key={id} style={{borderColor:COL[col]}}><i style={{background:COL[relCol(c.rel)]}}/>{L(P.COUNTRY[id].name)}<small class={"mono relnum " + relCol(c.rel)} title={t("relation")}><Icon n="$heart" size={14}/>{Math.round(c.rel)}</small></span>; })}</div></div>;
  return <Modal kind="event">
    <div class="hero photo" style={{backgroundImage:`url(${eventImg(e.id)}), ${mapCropBg(eventPoint(e))}`, "--tint":SND_TINT[eventSnd(e)] || COL.accent}}>
      <div class="tags"><Tag color={e.country ? "accent" : "warn"}>{`[[${e.country ? "globe" : "siren"}]] ${where}`}</Tag>{e.news ? <Tag color="good">{`[[newspaper]] ${t("realNews")} ${e.news.y}`}</Tag> : null}</div>
      <h2>{L(e.title)}</h2>
    </div>
    <div class="mbody">
      {e.country ? <><div class="sides">{side(t("sideA"), e.A, "good")}{side(t("sideB"), e.B, "bad")}</div>
        <p class="muted small rellegend"><Rich t={t("relLegend")} iconColor="inherit"/></p></> : null}
      <p class="desc"><Rich t={L(e.desc)}/></p>
      {e.news ? <p class="newsrc muted small"><Icon n="link" size={13}/> {t("source")}: <a href={e.news.url} target="_blank" rel="noopener noreferrer">{e.news.src}</a></p> : null}
      <div class="ask"><Rich t={`[[circle-help]] ${t(e.country ? "evAskCountry" : "evAsk")}`} iconColor="accent"/><Speak text={`${L(e.title)}. ${L(e.desc)} ${opts.map(({o, i}) => (i === -1 ? "" : "ABC"[i] + ". ") + L(o.label)).join(". ")}`} btn/>{P.hasKeyboard() ? <small class="mono muted">{t("evKeys")}</small> : null}</div>
      <Meter v={f} color={locked ? "warn" : "accent"} h={4} cls="lockbar"/>
      <div class="opts">{opts.map(({o, i, ok}) => {
        const usable = ok && !locked;
        return <button type="button" key={i} class={`opt ${ok ? "" : "no"} ${locked ? "locked" : ""}`} disabled={!usable} onPointerEnter={() => usable && Audio.hover()} onClick={() => { if (!UIM.eventLocked()) P.chooseOption(i); }}>
          <span class="letter">{i === -1 ? "!" : "ABC"[i]}</span>
          <span class="otext">
            <b>{L(o.label)}</b>
            {!hard ? <span class="fx">{P.fxChips(o.fx, e.target).map((c, k) => {
              const lab = (c.txt.includes(t("sideA")) ? t("sideA") : c.txt.includes(t("sideB")) ? t("sideB") : "") + (c.txt.includes(t("delayed")) ? " " + t("later") : "");
              return <span class={"fxchip " + (c.good ? "good" : "bad")} key={k} title={plain(c.txt)}><Icon n={c.icon || "circle"} size={15}/>{lab ? <small>{lab}</small> : null}<b>{arrows(c.up, c.mag || 1)}</b></span>;
            })}</span> : <span class="muted small"><Rich t={`[[eye-off]] ${t("hardHidden")}`} iconColor="inherit"/></span>}
            {!hard && i >= 0 && P.tiltOfOption ? <GroupTilt list={P.tiltOfOption(o, e)}/> : null}
            {!ok ? <span class="bad small">{t("cantAfford")}</span> : null}
          </span>
        </button>;
      })}</div>
    </div>
  </Modal>;
}

/* ---------------- end of game ---------------- */
const QUOTES = {
  win:{th:"เราทำได้! แต่การดูแลโลกใบนี้ไม่มีวันจบ", en:"We did it! But looking after this planet never really ends."},
  l1:{th:"เราช้าไป... ขอให้คนรุ่นต่อไปเรียนรู้จากวันนี้", en:"We were too slow... may the next generation learn from today."},
  l2:{th:"ถ้าประชาชนไม่เชื่อมั่น นโยบายที่ดีที่สุดก็ไปต่อไม่ได้", en:"Without the people's trust, even the best policy goes nowhere."},
  l3:{th:"ใกล้แล้ว แต่ยังไม่พอ ครั้งหน้าเราต้องเร็วกว่านี้", en:"Close, but not enough. Next time we have to move faster."},
};
export const endImg = (o, grade) => `assets/img/endings/${o === "win" ? `end-win-${grade || "A"}` : P.ENDINGS[o].img}.jpg`;
export function EndModal(){
  const o = S.over, win = o === "win", net = P.netCO2(), st = P.endStory(), rw = UIM.reward;
  const stats = [[t("temp"), `+${S.temp.toFixed(2)}°C`], [t("co2"), `${net.toFixed(1)} Gt`], [t("appr"), `${S.appr.toFixed(0)}%`], ["Net Zero", `${Math.round(Math.max(0, Math.min(1, (36 - net) / 36)) * 100)}%`], [t("skillsTitle"), `${Object.keys(S.owned).length}/${P.SKILLS.length}`], [t("timePlayed"), P.fmtTime(S.realSec)]];
  const lines = [];
  if (st.best) lines.push(`[[heart-handshake]] ${t("storyBest")}: ${P.cname(st.best)}`);
  if (st.worst) lines.push(`[[${P.HAZARDS[st.worst.type].icon}]] ${t("storyWorst")}: ${L(P.HAZARDS[st.worst.type].name)} · ${P.cname(st.worst.c)} · ${P.dateStr(st.worst.tick)}`);
  st.dec.forEach(d => lines.push(`[[git-branch]] ${L(d.title)} → ${L(d.label)}`));
  { const os = P.oreSummary(); if (os.used) lines.push(`[[$ore]] ${t("oreUsed")} ${os.used}${os.top ? ` · ${t("oreMostFrom")} ${P.cname(os.top)} ${os.share}%` : ""}`); }
  { const im = P.impactSummary && P.impactSummary(); if (im && im.saved > .1) lines.unshift(S.lang === "th" ? `[[leaf]] เทียบกับถ้าไม่ทำอะไรเลย คุณช่วยลด CO₂ ได้ ${im.saved.toFixed(1)} Gt ต่อปี และโลกเย็นกว่า ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C` : `[[leaf]] Compared with doing nothing, you cut CO₂ by ${im.saved.toFixed(1)} Gt a year and kept the world ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C cooler`); }
  if (!lines.length) lines.push(t("storyNone"));
  return <div class="veil end-veil">
    <div class="endart" style={{backgroundImage:`url(${endImg(o, S.grade)})`}}/>
    <section class={"modal end " + (win ? "win" : "lose")} role="dialog" aria-modal="true">
      <Tag color={win ? "good" : "bad"}>{`${P.dateStr()} · ${t("mode_" + S.mode)}`}</Tag>
      <h2 class="endtitle">{t(win ? "winTitle" : o + "Title")}</h2>
      {win ? <p class="gold grade">{L(P.ENDINGS.win.grades[S.grade || "A"])}</p> : null}
      <p>{t(win ? "winBody" + (S.grade || "A") : o + "Body")}</p>
      <div class="quote"><Portrait id={S.char} size={56}/><div><b style={{color:P.CHAR[S.char].color}}>{L(P.CHAR[S.char].person)}</b><p>“{L(QUOTES[o])}”</p></div></div>
      <div class="statgrid three">{stats.map(([a, b], i) => <div class="stat" key={i}><span><Rich t={up(a)}/></span><b>{b}</b></div>)}</div>
      <H3>{t("yourStory")}</H3>
      <ul class="story-lines">{lines.map((s, i) => <li key={i}><Rich t={s} iconColor="accent"/></li>)}</ul>
      <div class={"reward " + (rw && !rw.guest && !rw.error ? "ok" : "")}>
        {!rw ? <span class="muted"><Icon n="loader" size={16} cls="spin"/> {t("rewardWait")}</span>
          : rw.guest ? <span class="muted">{t("rewardGuest")} · XP +{rw.xp}</span>
          : rw.error ? <span class="muted">{t("rewardFail")} · XP +{rw.xp || 0}</span>
          : <><Terra n={`+${rw.terra}`} cls="good big"/><b class="acc mono">XP +{rw.xp}</b>{rw.levelUp ? <b class="gold"><Icon n="star" size={15}/> {t("levelUp")} {rw.level}</b> : null}{rw.note ? <small class="muted">{rw.note}</small> : null}</>}
      </div>
      <div class="endfoot">
        <div><small class="muted">{up(t("finalScore"))}</small><div class="score">{P.score().toLocaleString()}</div></div>
        <div class="btns"><Btn kind="ghost" onClick={() => G.toMenu()}>{t("mainMenu")}</Btn><Btn kind={win ? "ghost" : "primary"} onClick={() => G.restart()}>{t("restart")}</Btn>{win ? <Btn kind="gold" onClick={() => G.continueWorld()}>{`[[infinity]] ${t("playOn")}`}</Btn> : null}</div>
      </div>
    </section>
  </div>;
}

/* ---------------- character select + mode ---------------- */
export function CharSel(){
  const sel = UIM.charSel || "sci";
  const modes = [["normal", "globe"], ["hard", "skull"], ["daily", "calendar-check"]];
  return <Modal kind="charsel" wide>
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
          <Meter v={nx ? (xp - pv) / (nx - pv) : 1} color={c.color} h={4}/>
          <span class="pas"><Rich t={L(c.pas)}/></span>
          <ul class="acts">{c.acts.map(ab => <li key={ab.id}><Icon n={ab.icon} size={14} color={c.color}/>{L(ab.name)}{ab.lv ? <small class="muted"> (Lv{ab.lv})</small> : null}</li>)}</ul>
          {!owned ? <span class="price"><Icon n="terra"/> {P.shopPrice({id:"char_" + c.id, price:c.price})} · {P.Net.user ? t("buyInShop") : t("loginToBuy")}</span> : null}
        </div>
      </button>;
    })}</div>
    <H3>{t("modeTitle")}</H3>
    <div class="modes">{modes.map(([m, ic]) => { const locked = m === "hard" && !P.hardUnlocked(); return <button type="button" key={m} class={`mode ${UIM.modeSel === m ? "on " + m : ""} ${locked ? "locked" : ""}`} onPointerEnter={() => Audio.hover()} onClick={() => { if (locked){ Audio.play("error"); UIM.msg = t("hardLockedMsg"); UIM.err = true; bump(); return; } Audio.play("toggle"); UIM.modeSel = m; UIM.msg = ""; bump(); }}>
      <Icon n={locked ? "lock" : ic} size={22}/><span><b>{t("mode_" + m)}</b><small>{locked ? t("hardLocked") : t("modeD_" + m)}</small></span>
    </button>; })}</div>
    <Msg UIM={UIM}/>
    <div class="mfoot">
      <Btn kind="ghost" onClick={() => G.toMenu()}>{t("mainMenu")}</Btn>
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
        const me = p.who === "me", who = me ? S.char : "adv", cur = i === UIM.storyI;
        return <div class={`panel ${me ? "me" : "adv"} ${cur ? "cur" : "old"}`} key={i} style={{"--bg":p.bg}}>
          <Portrait id={who} size={cur ? 92 : 56} ring={me ? P.CHAR[S.char].color : COL.purple}/>
          <div class="speech">
            <b style={{color:me ? P.CHAR[S.char].color : COL.purple}}>{me ? L(P.CHAR[S.char].person) : L(P.ADVISOR.name)}</b>
            <p>{cur ? <Typewriter text={L(p.say)}/> : L(p.say)}</p>
          </div>
          <Icon n={p.icon} size={64} cls="panel-ic"/>
        </div>;
      })}</div>
      <div class="mfoot">
        <Btn kind="ghost" onClick={() => G.storySkip()}>{t("tutSkip")}</Btn>
        <Speak text={L(st.panels[Math.min(UIM.storyI, st.panels.length - 1)].say)} btn/>
        {P.hasKeyboard() ? <small class="mono muted grow">{t("storyKeys")}</small> : <span class="grow"/>}
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
      {!inGame && m ? (ask ? <Btn kind="danger" onClick={() => { P.deleteSlot(slot); setAsk(false); UIM.msg = `${t("slotDeleted")} · ${P.slotName(slot)}`; UIM.err = false; bump(); }}>{t("slotDelSure")}</Btn>
        : <IconBtn n="trash-2" title={t("slotDel")} onClick={() => setAsk(true)}/>) : null}
    </div>
    {inGame && m && !canSave && !cur ? <small class="muted slotnote">{S.mode === "hard" ? t("hardNoManual") : t("slotOtherMode")}</small> : null}
  </div>;
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
  const saves = P.readSaves();
  return <Modal kind="pause" onClose={() => G.resume()}>
    <Tag>{`${P.dateStr()} · ${t("mode_" + S.mode)}`}</Tag>
    <h2>{t("pTitle")}</h2>
    <p class="mono muted small"><Icon n="timer" size={14}/> {t("timePlayed")} {P.fmtTime(S.realSec)}</p>
    <div class="row gap"><Btn size="lg" onClick={() => G.resume()}>{`[[play]] ${t("pResume")}`}</Btn></div>
    <div class="card pzset">
      <div class="row gap"><b class="pzh"><Icon n="settings" size={16}/> {S.lang === "th" ? "ตั้งค่า" : "Settings"}</b><span class="grow"/><LangSeg/></div>
      <Volume/>
      <GfxSeg/>
      <A11ySeg/>
      <NarrRow/>
    </div>
    <b class="pzh"><Icon n="save" size={16}/> {S.lang === "th" ? "ช่องบันทึก" : "Save slots"}</b>
    {saves === null ? <p class="bad small">{t("noStore")}</p> : <>
      <p class="muted small slothelp"><Rich t={`[[info]] ${S.mode === "hard" ? t("hardSaves") : t("slotHelp")}`} iconColor="inherit"/></p>
      <div class="slots">{P.SLOTS.map(slot => <SlotRow key={slot} slot={slot} saves={saves} inGame/>)}</div>
    </>}
    <Msg UIM={UIM}/>
    <div class="row gap wrap pzfoot">
      <Btn kind="ghost" onClick={() => G.openTutorial(0, false)}>{`[[graduation-cap]] ${t("tutMenu")}`}</Btn>
      <Btn kind="ghost" onClick={() => G.openLearn()}>{`[[book-open]] ${t("mLearn")}`}</Btn>
      {document.fullscreenEnabled ? <Btn kind="ghost" onClick={() => G.fullscreen()}>{`[[${document.fullscreenElement ? "minimize" : "maximize"}]] ${S.lang === "th" ? "เต็มจอ" : "Fullscreen"}`}</Btn> : null}
      <span class="grow"/>
      <Btn kind="ghost" onClick={() => G.toMenu()}>{`[[log-out]] ${t("pMain")}`}</Btn>
    </div>
    {P.hasKeyboard() ? <p class="mono muted small keys">{t("keysHelp")}</p> : null}
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
        <Speak text={`${L(st.title)}. ${st.body[S.lang].join(" ")}`} btn/>
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
/* 1.6: politics at home — the four groups behind the approval number */
export function Politics(){
  const close = () => { UIM.modal = null; bump(); };
  const th = S.lang === "th", w = P.GROUPS.map(G => `${L(G.name)} ${Math.round(G.w * 100)}%`).join(" · ");
  return <Modal kind="politics" wide onClose={close}>
    <Tag color="accent">{th ? "[[landmark]] การเมืองในประเทศ" : "[[landmark]] Politics at home"}</Tag>
    <h2>{th ? "ความนิยม" : "Approval"} <span class="mono">{S.appr.toFixed(0)}%</span></h2>
    <p class="muted small">{th ? `ความนิยมรวมคือค่าเฉลี่ยของ 4 กลุ่ม (${w}) ทุกการตัดสินใจมีคนได้และคนเสีย ดูสัญลักษณ์ ▲ ▼ ใต้ตัวเลือกในเหตุการณ์และในสกิล ว่ากลุ่มไหนจะพอใจหรือไม่พอใจ` : `Approval is the average of four groups (${w}). Every decision has winners and losers: the ▲ ▼ marks under event choices and skills show who will be pleased or upset.`}</p>
    <GroupList full extra={g => <Spark data={(S.grpHist || {})[g]} color={P.GROUP[g].color} min={0} max={100}/>}/>
    <p class="muted small"><Rich t={th ? "[[info]] กลุ่มที่ 'สนับสนุน' ต้องพอใจ 70% ขึ้นไปและมากกว่าค่าเฉลี่ย ความต่างระหว่างกลุ่มจะค่อยๆ จางลงเอง ถ้าทำให้กลุ่มไหนโกรธ ยังเอาใจกลับมาได้" : "[[info]] A group backs you at 70%+ and above the average. Differences between groups fade slowly on their own, so an angry group can be won back."} iconColor="inherit"/></p>
  </Modal>;
}
/* 1.7: raw minerals waiting, refining speed, our refinery and friendly refiners */
function Refinery({g}){
  const th = S.lang === "th", lv = P.refLevel(g), b = (S.refBuild || {})[g], tl = P.tollers(g), k = P.refCost(g), max = lv >= P.REF_MAX_LV;
  return <div class="mkref">
    <div class="mkrefrow">
      <span title={t("refRawHelp")}><Icon n="pickaxe" size={15}/>{t("refRaw")} <b class="mono">{P.rawFor(g)}</b></span>
      <Icon n="arrow-right" size={14} cls="muted"/>
      <span><Icon n="factory" size={15}/>{t("refSpeed")} <b class="mono">{P.refCap(g).toFixed(1)}</b><small class="muted">{t("perMo")}</small></span>
    </div>
    <small class="muted">{`${t("refOurs")} ${(S.refLv || {})[g] || 0}/${P.REF_MAX_LV}`}{b ? ` · ${t("refBuilding")} ${b} ${t("months")}` : ""}{tl.length ? ` · ${t("refFriends")}: ${P.joinNames(tl.map(c => c.id))}` : ""}</small>
    <div class="mkrefb">
      <Btn kind="ghost" size="sm" disabled={!P.canBuild(g)} sound={null} onClick={() => { if (P.buildRefinery(g)) Audio.play("buy"); }}><Rich t={max ? `[[factory]] ${t("refMax")}` : b ? `[[hammer]] ${t("refBuilding")} ${b} ${t("months")}` : `[[factory]] ${t("refBuild")} · ${P.IC.ep} ${k.ep}  ${P.IC.pc} ${k.pc}`} iconColor="inherit"/></Btn>
      {!max && !b && P.refTilt ? <GroupTilt list={P.refTilt()}/> : null}
    </div>
  </div>;
}
/* 1.1: world minerals market — one card per group: stock, price trend, what it's for, buy/sell */
export function Market(){
  const close = () => { UIM.modal = null; bump(); };
  P.marketInit();
  const th = S.lang === "th", gain = P.matGain(), lot = P.MKT_LOT, ep = P.IC.ep;
  return <Modal kind="market" wide onClose={close}>
    <Tag color="warn">{th ? "[[$ore]] ทรัพยากร 5 กลุ่ม" : "[[$ore]] 5 resource groups"}</Tag>
    <h2>{th ? "ตลาดทรัพยากรโลก" : "World resources market"}</h2>
    <div class="mkhead">
      <span class="mkcash"><Rich t={`${ep} ${Math.floor(S.ep)}`}/></span>
      <small class="muted">{th ? "ราคาเปลี่ยนทุกเดือน ตามความต้องการของโลก ข่าวตลาด การห้ามส่งออก และการซื้อขายของเรา ซื้อตอนถูก ขายตอนแพง" : "Prices change every month with world demand, market news, export bans and our own trading. Buy low, sell high."} <Rich t={t("refIntro")} iconColor="inherit"/></small>
    </div>
    <div class="mkgrid">{P.MAT_IDS.map(g => {
      const G = P.MAT[g], pr = P.mktPrice(g), hist = (S.mktHist || {})[g] || [], prev = hist.length > 1 ? hist[hist.length - 2] : pr;
      const chg = prev ? (pr - prev) / prev * 100 : 0, lvl = S.mkt[g] / 1, short = P.matShort(g), users = P.matUsers(g).slice(0, 3);
      const k10 = P.mktLotCost(g, lot), kN = short ? P.mktLotCost(g, short.need) : 0;
      return <div class="mkcard" key={g} style={{"--rc":G.col}}>
        <div class="mktop">
          <Icon n={G.icon} size={52}/>
          <div class="grow"><b>{L(G.name)}</b><small class="muted">{L(G.sub)}</small></div>
          <div class="mkstock"><b class="mono">{Math.floor(S.mat[g])}</b><small class="muted">{P.refCap ? t("refStock") : th ? "มีอยู่" : "in stock"} · +{gain[g].toFixed(1)}{t("perMo")}</small></div>
        </div>
        <div class="mkprice">
          <div><small class="muted">{th ? "ราคาต่อหน่วย" : "Price per unit"}</small>
            <b class="mono"><Rich t={`${ep} ${pr.toFixed(1)}`}/></b>
            <span class={"chg " + (chg > .5 ? "up" : chg < -.5 ? "down" : "")}>{chg > .5 ? "▲" : chg < -.5 ? "▼" : "•"} {Math.abs(chg).toFixed(0)}%</span>
            <span class={"lvl " + (lvl > 1.15 ? "hi" : lvl < .9 ? "lo" : "")}>{lvl > 1.15 ? (th ? "แพง" : "high") : lvl < .9 ? (th ? "ถูก" : "cheap") : (th ? "ปกติ" : "normal")}</span>
          </div>
          <Spark data={hist} color={G.col}/>
        </div>
        {P.refCap ? <Refinery g={g}/> : null}
        {short ? <div class="mkneed"><Icon n="triangle-alert" size={15}/>{th ? `ขาดอีก ${short.need} สำหรับ` : `${short.need} short for`} <b>{L(short.n.name)}</b></div>
          : users.length ? <div class="mkuse muted">{th ? "ใช้ทำ" : "Used for"}: {users.map(n => L(n.name)).join(", ")}</div> : <div class="mkuse muted">{th ? "ตอนนี้ยังไม่มีสกิลที่ต้องใช้" : "No skill needs it right now"}</div>}
        <div class="mkbtns">
          <Btn kind="primary" disabled={S.ep < k10} sound={null} onClick={() => { if (P.mktBuy(g, lot)) Audio.play("coin"); }}><Rich t={`${th ? "ซื้อ" : "Buy"} ${lot} · ${ep} ${k10}`} iconColor="inherit"/></Btn>
          {short ? <Btn kind="gold" disabled={S.ep < kN} sound={null} onClick={() => { if (P.mktBuy(g, short.need)) Audio.play("coin"); }}><Rich t={`${th ? "ซื้อที่ขาด" : "Buy missing"} ${short.need} · ${ep} ${kN}`} iconColor="inherit"/></Btn> : null}
          <Btn kind="ghost" disabled={S.mat[g] < lot} sound={null} onClick={() => { if (P.mktSell(g, lot)) Audio.play("coin"); }}><Rich t={`${th ? "ขาย" : "Sell"} ${lot} · +${P.mktSellGain(g, lot)}`} iconColor="inherit"/></Btn>
        </div>
      </div>;
    })}</div>
    <div class="mfoot"><span class="grow"/><Btn onClick={close}>{th ? "กลับเข้าเกม" : "Back to the game"}</Btn></div>
  </Modal>;
}

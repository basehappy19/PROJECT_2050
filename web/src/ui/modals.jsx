/* Pop-up windows: dilemma event, end of game, character select, story, pause, tutorial */
import {useEffect, useState, useRef} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, relCol, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {Btn, IconBtn, Seg, Meter, Portrait, portraitSrc, H3, Terra, Volume, GfxSeg, LangSeg, Msg, Key, SlotInfo} from "./widgets.jsx";

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
  const side = (lab, ids, col) => <div class="side"><b class={col}>{lab}</b><div class="chips">{ids.map(id => { const c = P.C(id); return <span class="chip static" key={id} style={{borderColor:COL[col]}}><i style={{background:COL[relCol(c.rel)]}}/>{L(P.COUNTRY[id].name)}<small class={"mono " + relCol(c.rel)}>{Math.round(c.rel)}</small></span>; })}</div></div>;
  return <Modal kind="event">
    <div class="hero photo" style={{backgroundImage:`url(${eventImg(e.id)}), ${mapCropBg(eventPoint(e))}`, "--tint":SND_TINT[eventSnd(e)] || COL.accent}}>
      <div class="tags"><Tag color={e.country ? "accent" : "warn"}>{`[[${e.country ? "globe" : "siren"}]] ${where}`}</Tag>{e.news ? <Tag color="good">{`[[newspaper]] ${t("realNews")} ${e.news.y}`}</Tag> : null}</div>
      <h2>{L(e.title)}</h2>
    </div>
    <div class="mbody">
      {e.country ? <div class="sides">{side(t("sideA"), e.A, "good")}{side(t("sideB"), e.B, "bad")}</div> : null}
      <p class="desc"><Rich t={L(e.desc)}/></p>
      {e.news ? <p class="newsrc muted small"><Icon n="link" size={13}/> {t("source")}: <a href={e.news.url} target="_blank" rel="noopener noreferrer">{e.news.src}</a></p> : null}
      <div class="ask"><Rich t={`[[circle-help]] ${t(e.country ? "evAskCountry" : "evAsk")}`} iconColor="accent"/>{P.hasKeyboard() ? <small class="mono muted">{t("evKeys")}</small> : null}</div>
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
        {P.hasKeyboard() ? <small class="mono muted grow">{t("storyKeys")}</small> : <span class="grow"/>}
        <Btn onClick={() => G.storyNext()} sound={null}>{last ? `${t("storyGo")} [[play]]` : `${t("tutNext")} [[chevron-right]]`}</Btn>
      </div>
    </section>
  </div>;
}

/* ---------------- pause ---------------- */
export function Pause(){
  const saves = P.readSaves();
  return <Modal kind="pause" onClose={() => G.resume()}>
    <Tag>{`${P.dateStr()} · ${t("mode_" + S.mode)}`}</Tag>
    <h2>{t("pTitle")}</h2>
    <p class="mono muted small"><Icon n="timer" size={14}/> {t("timePlayed")} {P.fmtTime(S.realSec)}</p>
    <div class="row gap"><Btn size="lg" onClick={() => G.resume()}>{`[[play]] ${t("pResume")}`}</Btn><span class="grow"/><LangSeg/></div>
    <Volume/>
    <GfxSeg/>
    {S.mode === "hard" ? <p class="warn small"><Rich t={`[[skull]] ${t("hardSaves")}`} iconColor="inherit"/></p>
      : saves === null ? <p class="bad small">{t("noStore")}</p>
      : <div class="slots">{["s1", "s2", "s3"].map(slot => {
        const m = saves[slot] && saves[slot].meta;
        return <div class="card slotrow" key={slot}>
          <SlotInfo name={P.slotName(slot)} meta={m}/>
          <Btn kind="ghost" sound="save" onClick={() => {
            P.Ach.unlock("saver"); const ok = P.writeSlot(slot);
            UIM.msg = ok ? `${t("saved")} · ${P.slotName(slot)}` : t("noStore"); UIM.err = !ok;
            if (ok && P.Net.user) P.Net.cloudSave(slot).then(r => { if (r){ UIM.msg = `${t("saved")} · ${P.slotName(slot)} · ${t("cloudOk")}`; bump(); } });
            bump();
          }}>{`[[save]] ${t("save")}`}</Btn>
        </div>;
      })}</div>}
    <Msg UIM={UIM}/>
    <div class="row gap wrap">
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
        <span class="grow"/>
        {i ? <Btn kind="ghost" sound={null} onClick={() => G.tutAct("back")}>{`[[chevron-left]] ${t("tutBack")}`}</Btn> : null}
        <Btn sound={null} onClick={() => G.tutAct(last ? "done" : "next")}>{last ? t("tutDone") : `${t("tutNext")} [[chevron-right]]`}</Btn>
      </div>
    </div>
  </Modal>;
}

/* ---------------- Continuous World: the world minerals market ---------------- */
export function Market(){
  const close = () => { UIM.modal = null; bump(); };
  P.marketInit();
  const th = S.lang === "th", gain = P.matGain(), lot = P.MKT_LOT;
  const users = g => P.SKILLS.filter(n => !S.owned[n.id] && P.matCost(n) && P.matCost(n)[g]).slice(0, 3).map(n => L(n.name));
  return <Modal kind="market" wide onClose={close}>
    <Tag color="warn">{th ? "โลกต่อเนื่อง" : "Continuous World"}</Tag>
    <h2>{th ? "ตลาดแร่โลก" : "World minerals market"}</h2>
    <p class="muted">{th ? "แร่แยกเป็น 5 กลุ่ม แต่ละสกิลใช้ไม่เหมือนกัน ประเทศที่เป็นมิตรส่งมาให้ทุกเดือน ขาดเมื่อไรซื้อจากตลาดได้ ราคาขึ้นเมื่อเราซื้อมากหรือมีประเทศห้ามส่งออก แล้วค่อย ๆ กลับสู่ปกติ" : "Minerals come in 5 groups and each skill needs a different mix. Friendly countries send some every month; buy the rest here. Prices rise when you buy a lot or a producer bans exports, then drift back."}</p>
    <div class="mkt">{P.MAT_IDS.map(g => {
      const G = P.MAT[g], pr = P.mktPrice(g), idx = S.mkt[g], u = users(g);
      return <div class="mktrow" key={g} style={{"--rc":G.col}}>
        <span class="mic"><Icon n={G.icon} size={22} style={{color:G.col}}/></span>
        <div class="grow"><b>{L(G.name)}</b><small class="muted">{L(G.sub)}</small>{u.length ? <small class="muted">{th ? "ใช้กับ" : "Needed for"}: {u.join(", ")}</small> : null}</div>
        <div class="mstock"><small class="muted">{th ? "มีอยู่" : "Stock"}</small><b class="mono">{Math.floor(S.mat[g])}</b><small class="muted">+{gain[g].toFixed(1)}{t("perMo")}</small></div>
        <div class="mprice"><small class="muted">{th ? "ราคา/หน่วย" : "Price/unit"}</small><b class="mono"><Rich t={`${P.IC.ep} ${pr}`}/></b><small class={idx > 1.15 ? "bad" : idx < .9 ? "good" : "muted"}>{idx > 1.15 ? (th ? "แพง" : "high") : idx < .9 ? (th ? "ถูก" : "low") : (th ? "ปกติ" : "normal")}</small></div>
        <div class="row gap">
          <Btn kind="primary" disabled={S.ep < pr * lot} sound={null} onClick={() => { if (P.mktBuy(g)) Audio.play("coin"); }}>{`${th ? "ซื้อ" : "Buy"} ${lot} · ${P.IC.ep} ${pr * lot}`}</Btn>
          <Btn kind="ghost" disabled={S.mat[g] < lot} sound={null} onClick={() => { if (P.mktSell(g)) Audio.play("coin"); }}>{`${th ? "ขาย" : "Sell"} ${lot}`}</Btn>
        </div>
      </div>;
    })}</div>
    <div class="mfoot"><span class="muted small"><Rich t={`${P.IC.ep} ${Math.floor(S.ep)}`}/></span><Btn onClick={close}>{th ? "กลับเข้าเกม" : "Back to the game"}</Btn></div>
  </Modal>;
}

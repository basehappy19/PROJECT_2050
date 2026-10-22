/* Small shared widgets */
import {P, S, t, L, up, COL, relCol} from "../core.js";
import {Audio} from "../audio.js";
import {Icon, Rich} from "./icon.jsx";
import {Gfx} from "../gfx.js";
import {Narr} from "../narrator.js";
import {useEffect} from "preact/hooks";

const snd = (fn, s = "click") => e => { if (s) Audio.play(s); fn && fn(e); };
const hov = () => Audio.hover();

export function Btn({children, onClick, kind = "primary", disabled, sound = "click", cls = "", size, title, style, type = "button", block}){
  return <button type={type} class={`btn btn-${kind}${size ? " btn-" + size : ""}${block ? " btn-block" : ""} ${cls}`} disabled={disabled} title={title} style={style}
    onPointerEnter={disabled ? undefined : hov} onClick={disabled ? undefined : snd(onClick, sound)}>{typeof children === "string" ? <Rich t={children} iconColor="inherit"/> : children}</button>;
}
export function IconBtn({n, onClick, title, cls = "", on, disabled, sound = "click", size = 18, badge}){
  return <button type="button" class={`ibtn ${on ? "on" : ""} ${cls}`} title={title} aria-label={title} disabled={disabled} onPointerEnter={disabled ? undefined : hov} onClick={disabled ? undefined : snd(onClick, sound)}>
    <Icon n={n} size={size}/>{badge ? <span class="badge">{badge}</span> : null}
  </button>;
}
/* segmented control: items [{id, label?, icon?, on, fn, dis}] */
export function Seg({items, cls = ""}){
  return <div class={"seg " + cls}>{items.map(it =>
    <button type="button" key={it.id} class={it.on ? "on" : ""} disabled={it.dis} onPointerEnter={hov} onClick={snd(it.fn, it.sound ?? "toggle")} title={it.title}>{it.icon ? <Icon n={it.icon} size={15}/> : it.label}</button>)}</div>;
}
/* text tabs: items [{id, label, on, fn, badge}] */
export function Tabs({items, cls = ""}){
  return <div class={"tabs " + cls} role="tablist">{items.map(it =>
    <button type="button" role="tab" key={it.id} class={it.on ? "on" : ""} onPointerEnter={hov} onClick={snd(it.fn, "tab")}><Rich t={it.label} iconColor="inherit"/>{it.badge ? <span class="badge">{it.badge}</span> : null}</button>)}</div>;
}
export const Pill = ({t: txt, kind = "", cls = ""}) => <span class={`pill pill-${kind || "plain"} ${cls}`}><Rich t={txt} iconColor="inherit"/></span>;
export const Meter = ({v, color = "accent", h = 6, cls = ""}) => <div class={"meter " + cls} style={{height:h}}><i style={{width:`${Math.max(0, Math.min(1, v)) * 100}%`, background:COL[color] || color}}/></div>;
export function RelBar({rel}){
  const f = Math.max(-1, Math.min(1, rel / 100)), col = COL[relCol(rel)];
  return <div class="relbar"><i style={f >= 0 ? {left:"50%", width:`${f * 50}%`, background:col} : {right:"50%", width:`${-f * 50}%`, background:col}}/><b/></div>;
}
export function Slider({v, onSet, label}){
  return <input type="range" class="slider" min="0" max="1" step="0.05" value={v} aria-label={label} style={{"--v":`${v * 100}%`}}
    onInput={e => onSet(parseFloat(e.currentTarget.value))} onChange={() => Audio.play("tick")}/>;
}
export function Check({on, onClick, children}){
  return <label class={"check" + (on ? " on" : "")} onClick={e => { e.preventDefault(); Audio.play("toggle"); onClick(); }}>
    <span class="box">{on ? <Icon n="check" size={14}/> : null}</span><span><Rich t={children}/></span></label>;
}
export const Terra = ({n, cls = "", size}) => <span class={"terra-amt " + cls} style={size ? {fontSize:size} : null}><Icon n="terra"/>{n}</span>;
export const Key = ({k}) => P.hasKeyboard() ? <kbd>{k}</kbd> : null;
export const H3 = ({children, cls = ""}) => <h3 class={"h3 " + cls}><Rich t={up(children)} iconColor="inherit"/></h3>;

/* character portrait (photo) — round or card */
export function portraitSrc(id, outfit){
  if (id === "adv") return "assets/img/portraits/adv.jpg";
  return `assets/img/portraits/${id}-${outfit || (P.outfitOf ? P.outfitOf(id) : "base")}.jpg`;
}
export function Portrait({id, size = 48, ring, cls = "", outfit, dim, lv}){
  const ch = P.CHAR[id], col = ring || (ch ? ch.color : COL.purple), o = outfit || (id !== "adv" && P.outfitOf ? P.outfitOf(id) : "base");
  return <span class={`portrait ${o === "gold" ? "gold" : ""} ${dim ? "dim" : ""} ${cls}`} style={{width:size, height:size, "--ring":col}}>
    <img src={portraitSrc(id, o)} alt={ch ? L(ch.person) : ""} loading="lazy" draggable="false"/>{lv ? <b class="lv">{lv}</b> : null}</span>;
}
export function Volume(){
  const row = (kind, icon, iconOff, on, lv, label) => <div class="volrow" key={kind}>
    <IconBtn n={on && lv > 0 ? icon : iconOff} title={label} onClick={() => (kind === "music" ? Audio.toggleMusic() : Audio.toggle())} sound={null}/>
    <span class="lbl">{label}</span>
    <Slider v={lv} label={label} onSet={v => { Audio.setLevel(kind, v); P._bump(); }}/>
    <span class="num">{Math.round(lv * 100)}%</span>
  </div>;
  return <div class="vol">{row("music", "music", "music-off", Audio.musicOn, Audio.lvMusic, t("musicLbl"))}{row("sfx", "volume-2", "volume-x", Audio.on, Audio.lvSfx, t("sfxLbl"))}</div>;
}
export const LangSeg = () => <Seg cls="lang" items={[
  {id:"th", label:"TH", on:S.lang === "th", fn:() => { P.setLang("th"); document.documentElement.lang = "th"; }},
  {id:"en", label:"EN", on:S.lang === "en", fn:() => { P.setLang("en"); document.documentElement.lang = "en"; }},
]}/>;
export const Msg = ({UIM}) => UIM.msg ? <p class={"msg " + (UIM.err ? "bad" : "good")} role="status">{UIM.msg}</p> : null;
/* graphics quality: auto · low · medium · high */
export function GfxSeg(){
  const items = [["auto", "gfxAuto"], ["low", "gfxLow"], ["medium", "gfxMed"], ["high", "gfxHigh"]].map(([id, k]) => ({id, label:t(k), on:Gfx.pref === id, fn:() => { Gfx.choose(id); P._bump(); }}));
  const th = S.lang === "th", M = P.Map, glOn = (() => { try { return localStorage.getItem("p2050-mapgl") !== "0"; } catch (e){ return true; } })();
  const glNote = M && M.base && glOn && !M.usingGL() ? (th ? "เครื่องนี้ใช้ WebGL 2 ไม่ได้ จึงวาดแบบเดิม" : "WebGL 2 isn't available here, so the map uses the old renderer") : null;
  return <><div class="gfxrow"><Icon n="monitor" size={18}/><span class="lbl">{t("gfxLbl")}</span><Seg cls="gfx" items={items}/>{Gfx.pref === "auto" ? <small class="muted">{t("gfx_" + Gfx.level)}</small> : null}</div>
    <div class="gfxrow"><Icon n="cpu" size={18}/><Check on={glOn} onClick={() => { if (M && M.setGL) M.setGL(!glOn); else { try { localStorage.setItem("p2050-mapgl", glOn ? "0" : "1"); } catch (e){} } P._bump(); }}>{th ? "วาดแผนที่ด้วยการ์ดจอ (GPU)" : "Draw the map on the GPU"}</Check>{glNote ? <small class="muted">{glNote}</small> : null}</div></>;
}

/* 1.9: reads `text` aloud when it appears (if narration is on); with `btn`, also shows a listen / stop button */
export function Speak({text, btn, auto = true}){
  useEffect(() => { if (auto) Narr.say(text); return () => Narr.stop(); }, [text]);
  if (!btn || !Narr.available()) return null;
  const th = S.lang === "th";
  return <IconBtn n={Narr.speaking ? "square" : "volume-2"} cls="speakbtn" title={Narr.speaking ? (th ? "หยุดอ่าน" : "Stop reading") : (th ? "ฟังข้อความนี้" : "Listen")} sound={null}
    onClick={e => { if (e && e.stopPropagation) e.stopPropagation(); if (Narr.speaking) Narr.stop(); else Narr.say(text, {force:true}); }}/>;
}
/* 1.9: narration and subtitles settings */
export function NarrRow(){
  const th = S.lang === "th", ok = Narr.available();
  const rates = [[.85, th ? "ช้า" : "Slow"], [1, th ? "ปกติ" : "Normal"], [1.15, th ? "เร็ว" : "Fast"]].map(([r, label]) => ({id:"r" + r, label, on:Narr.rate === r, fn:() => Narr.setRate(r)}));
  return <div class="gfxrow narr"><Icon n="audio-lines" size={18}/><span class="lbl">{th ? "เสียงพากย์" : "Narration"}</span>
    {ok ? <><Check on={Narr.on} onClick={() => { Narr.setOn(!Narr.on); if (Narr.on) Narr.say(th ? "เปิดเสียงพากย์แล้ว" : "Narration is on"); }}>{th ? "อ่านออกเสียง" : "Read aloud"}</Check>
      <Check on={Narr.subs} onClick={() => Narr.setSubs(!Narr.subs)}>{th ? "คำบรรยาย" : "Subtitles"}</Check>
      {Narr.on ? <Seg cls="gfx" items={rates}/> : null}</>
      : <small class="muted">{!Narr.supported ? (th ? "เบราว์เซอร์นี้อ่านออกเสียงไม่ได้" : "This browser can't read aloud") : (th ? "เครื่องนี้ยังไม่มีเสียงภาษาไทย (เพิ่มได้ในการตั้งค่าภาษาของเครื่อง)" : "No voice for this language on this device")}</small>}
  </div>;
}
/* 1.1.4: text size and colour-blind mode (pause menu and home screen) */
export function A11ySeg(){
  const A = P.A11y, th = S.lang === "th";
  const items = [["n", th ? "ปกติ" : "Normal"], ["l", th ? "ใหญ่" : "Large"], ["xl", th ? "ใหญ่มาก" : "Extra large"]].map(([id, label]) => ({id, label, on:A.fs === id, fn:() => A.setFs(id)}));
  return <div class="gfxrow a11y"><Icon n="type" size={18}/><span class="lbl">{th ? "ตัวอักษร" : "Text"}</span><Seg cls="gfx" items={items}/>
    <Check on={A.cb} onClick={() => A.setCb(!A.cb)}>{th ? "สีสำหรับคนตาบอดสี" : "Colour-blind colours"}</Check></div>;
}

/* A save slot at a glance: when in the game, how far to 2050, how close to Net Zero, temperature and approval */
const MODE_CLS = {hard:"hard", daily:"daily", world:"world", normal:"normal"};
export function SlotInfo({name, meta, icon, bad, cur}){
  if (!meta) return <div class="slotinfo empty"><b>{name}</b><small class="muted">{bad || t("empty")}</small></div>;
  const m = meta, th = S.lang === "th";
  const yearP = Math.max(0, Math.min(1, m.tick / (P.TOTAL_TICKS || 300))), nzP = Math.max(0, Math.min(1, (36 - m.net) / 36));
  const tCol = m.temp >= 2.5 ? "bad" : m.temp >= 2 ? "hot" : m.temp >= 1.5 ? "warn" : "good", aCol = m.appr >= 50 ? "good" : m.appr >= 25 ? "warn" : "bad";
  const when = new Date(m.at).toLocaleString(th ? "th-TH" : "en-GB", {dateStyle:"medium", timeStyle:"short"});
  return <div class="slotinfo">
    <div class="sitop">
      {m.char ? <Portrait id={m.char} size={34}/> : icon ? <Icon n={icon} size={20} color="accent"/> : null}
      <b>{name}</b>
      <span class={"sitag " + MODE_CLS[P.modeKey(m)]}>{P.modeName(m)}</span>
      {cur ? <span class="sitag cur">{t("slotThisGame")}</span> : null}
      <span class="grow"/><span class="mono sidate">{P.dateStr(m.tick)}</span>
    </div>
    <div class="sibars">
      <div class="sibar"><span>{th ? "เวลา" : "Time"}</span><Meter v={yearP} color="sky" h={6}/><small class="mono">{Math.round(yearP * 100)}%</small></div>
      <div class="sibar"><span>Net Zero</span><Meter v={nzP} color={nzP >= .99 ? "good" : "accent"} h={6}/><small class="mono">{Math.round(nzP * 100)}%</small></div>
    </div>
    <div class="sichips">
      <span class={"sichip " + tCol}><Icon n="thermometer" size={13}/>+{m.temp.toFixed(2)}°C</span>
      <span class="sichip"><Icon n="cloud" size={13}/>{m.net.toFixed(1)} Gt</span>
      <span class={"sichip " + aCol}><Icon n="smile" size={13}/>{m.appr.toFixed(0)}%</span>
      <span class="grow"/><small class="muted">{th ? "บันทึก" : "Saved"} {when}</small>
    </div>
  </div>;
}

/* 1.6: what a choice, skill or order does to the four groups at home (icons with ▲ / ▼) */
export function GroupTilt({list, cls = ""}){
  if (!list || !list.length) return null;
  return <span class={"gtilt " + cls}>{list.map(({g, v}) => {
    const G = P.GROUP[g], n = Math.abs(v) >= 4 ? 2 : 1;
    return <span key={g} class={"gt " + (v > 0 ? "up" : "down")} title={`${L(G.name)} ${v > 0 ? "▲" : "▼"}`}><Icon n={G.icon} size={13}/><b>{(v > 0 ? "▲" : "▼").repeat(n)}</b></span>;
  })}</span>;
}
/* 1.6: the four groups — bar, state and (full) what they like and hate */
export function GroupList({full, onPick, extra}){
  const th = S.lang === "th", gs = S.groups; if (!gs) return null;
  const ST = {back:["good", th ? "สนับสนุน" : "Backing you"], ok:["fg", th ? "เฉยๆ" : "Neutral"], low:["warn", th ? "เริ่มไม่พอใจ" : "Unhappy"], angry:["bad", th ? "ไม่พอใจมาก" : "Very angry"]};
  return <div class={"glist " + (full ? "full" : "")}>{P.GROUPS.map(G => {
    const v = gs[G.id], st = P.groupState(G.id), [c, lab] = ST[st];
    return <div class={"grow1 " + st} key={G.id} style={{"--gc":G.color}} onClick={onPick}>
      <div class="ghead"><Icon n={G.icon} size={full ? 22 : 16} cls="gic"/><b>{L(G.name)}</b><small class="muted mono">{Math.round(G.w * 100)}%</small><span class="grow"/><span class={"gst " + c}>{lab}</span><b class="mono gv">{v.toFixed(0)}%</b></div>
      <div class="gbar"><i style={{width:`${v}%`}}/><s style={{left:`${P.GROUP_ANGRY}%`}}/><s class="b" style={{left:`${P.GROUP_BACK}%`}}/></div>
      {full ? <div class="gtxt">
        <span><Icon n="thumbs-up" size={13}/> {L(G.likes)}</span>
        <span><Icon n="thumbs-down" size={13}/> {L(G.hates)}</span>
        <span class={st === "back" ? "good" : st === "angry" ? "bad" : "muted"}><Icon n={st === "angry" ? "megaphone" : "sparkles"} size={13}/> {L(st === "angry" ? G.bad : G.good)}</span>
      </div> : null}
      {extra ? extra(G.id) : null}
    </div>;
  })}</div>;
}

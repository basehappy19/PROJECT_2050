/* Small shared widgets */
import {P, S, t, L, up, COL, relCol} from "../core.js";
import {Audio} from "../audio.js";
import {Icon, Rich} from "./icon.jsx";
import {Gfx} from "../gfx.js";

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
  return <div class="gfxrow"><Icon n="monitor" size={18}/><span class="lbl">{t("gfxLbl")}</span><Seg cls="gfx" items={items}/>{Gfx.pref === "auto" ? <small class="muted">{t("gfx_" + Gfx.level)}</small> : null}</div>;
}

/* 3.8: the shop (design "B", picked from five): the balance at the top, category chips with counts, one clean list grouped
   by category with what each item does, the price on the right, what you still need when you can't afford it, and a
   second tap to confirm a purchase (so nothing is bought by accident). */
import {useState, useEffect} from "preact/hooks";
import {P, UIM, L, bump, t} from "../core.js";
import {Audio} from "../audio.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, Terra, Portrait} from "./widgets.jsx";

const T2 = (th, en) => ({th, en});
const TX = {
  all:T2("ทั้งหมด", "All"), chars:T2("ตัวละคร", "Characters"), boost:T2("ปลดล็อก", "Unlocks"), look:T2("ตกแต่ง", "Looks"),
  need:T2("ขาดอีก", "Need"), confirm:T2("ยืนยัน", "Confirm"), owned:T2("มีแล้ว", "Owned"), passive:T2("ติดตัว", "Passive"), acts:T2("ท่าพิเศษ", "Specials"),
  earn:T2("ได้จากการเล่นจบเกม ซีซั่น และภารกิจรายสัปดาห์", "Earned by finishing games, the season pass and weekly missions"),
};
const N = () => P.Net;
const cat = it => it.kind === "char" ? "chars" : it.kind === "unlock" ? "boost" : "look";
const CATS = ["chars", "boost", "look"];
const charOf = it => (it.kind === "char" ? P.CHAR[it.id.slice(5)] : null);
const descOf = it => { const ch = charOf(it); return ch ? L(ch.pas) : L(it.desc || ""); };
const titleOf = it => { const ch = charOf(it); return ch ? L(ch.name) : L(it.name); };
const price = it => P.shopPrice(it);
const CAT_COL = {chars:"var(--purple)", boost:"var(--sky)", look:"var(--gold)"};

/* buy with a second tap to confirm */
function Buy({it, size, block, cls = ""}){
  const n = N(), own = n.owns(it.id), p = price(it), lack = Math.max(0, p - n.user.terra);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(id); }, [armed]);
  if (own) return <Btn kind="ghost" size={size} block={block} disabled cls={"sbuy own " + cls}>{`[[check]] ${L(TX.owned)}`}</Btn>;
  if (lack) return <Btn kind="ghost" size={size} block={block} disabled cls={"sbuy lack " + cls}>{`${L(TX.need)} [[terra]] ${lack}`}</Btn>;
  return <Btn kind={armed ? "primary" : "gold"} size={size} block={block} disabled={n.busy} sound={null} cls={"sbuy " + (armed ? "armed " : "") + cls}
    onClick={() => { if (!armed){ setArmed(true); Audio.play("click"); return; } setArmed(false); n.buy(it.id); Audio.play("coin"); }}>
    {armed ? `[[check]] ${L(TX.confirm)} · ${p}` : `[[terra]] ${p}`}</Btn>;
}
/* picture of an item: the character's portrait, or an icon on a tinted tile */
function Thumb({it, size = 56}){
  const ch = charOf(it);
  if (ch) return <Portrait id={ch.id} size={size}/>;
  return <span class="sthumb" style={{width:size, height:size, "--c":CAT_COL[cat(it)]}}><Icon n={it.icon} size={Math.round(size * .42)}/></span>;
}
function Balance({compact}){
  const n = N();
  return <div class={"sbal" + (compact ? " compact" : "")}>
    <span class="sbal-ic"><Icon n="terra" size={compact ? 20 : 26}/></span>
    <div class="grow"><small class="muted">{t("balance")}</small><b class="mono">{n.user.terra.toLocaleString()}</b></div>
    {compact ? null : <small class="muted sbal-note">{L(TX.earn)}</small>}
  </div>;
}
function Acts({ch, full}){
  return <div class={"sacts" + (full ? " full" : "")}>{ch.acts.map(a => <span class="sact" key={a.id} style={{"--c":ch.color}}>
    <Icon n={a.icon} size={14}/>{full ? <span><b>{L(a.name)}</b><small class="muted">{L(a.desc)}</small></span> : <span>{L(a.name)}</span>}
  </span>)}</div>;
}
function CatTabs({cur, set, counts}){
  return <div class="scats" role="tablist">{["all", ...CATS].map(c => <button type="button" role="tab" key={c} class={cur === c ? "on" : ""}
    onClick={() => { Audio.play("tab"); set(c); }}>{L(TX[c])}{counts ? <i>{counts[c]}</i> : null}</button>)}</div>;
}
const useCat = () => { const [c, setC] = useState(UIM.shopCat || "all"); return [c, v => { UIM.shopCat = v; setC(v); }]; };
const items = c => P.SHOP.filter(it => c === "all" || cat(it) === c);

export function Shop(){
  const [c, setC] = useCat(), counts = Object.fromEntries(["all", ...CATS].map(k => [k, items(k).length]));
  const groups = c === "all" ? CATS : [c];
  return <div class="shopv shB">
    <Balance compact/>
    <CatTabs cur={c} set={setC} counts={counts}/>
    {groups.map(g => <section key={g}>
      {c === "all" ? <h4 class="shB-h" style={{"--c":CAT_COL[g]}}>{L(TX[g])}<span class="muted mono">{items(g).filter(it => N().owns(it.id)).length}/{items(g).length}</span></h4> : null}
      {items(g).map(it => { const ch = charOf(it); return <div class={"shB-row" + (N().owns(it.id) ? " own" : "")} key={it.id}>
        <Thumb it={it} size={52}/>
        <div class="grow"><b>{titleOf(it)}</b><small class="muted"><Rich t={descOf(it)}/></small>{ch ? <Acts ch={ch}/> : null}</div>
        <Buy it={it}/>
      </div>; })}
    </section>)}
  </div>;
}


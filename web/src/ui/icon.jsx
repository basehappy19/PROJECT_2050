/* Icons (lucide, inlined SVG) and rich text with [[icon]] tokens */
import ICONS from "../gen/icons.js";
import {COL} from "../core.js";

const ICON_COL = {leaf:"good", sprout:"good", landmark:"purple", users:"accent", thermometer:"hot", cloud:"cloud", handshake:"warn", "shield-alert":"vuln", siren:"bad", newspaper:"muted"};
const col = c => (c ? COL[c] || c : undefined);

export function Icon({n, size, color, cls = "", style, sw}){
  if (n && n[0] === "$") return <img class={"ic ic3d " + cls} src={`assets/img/ui/3d/${n.slice(1)}.webp`} alt="" draggable="false" style={{width:size, height:size, ...style}}/>;
  if (n === "terra") return <img class={"ic terra " + cls} src="assets/img/ui/3d/gem.webp" alt="" style={{width:size, height:size, ...style}}/>;
  const inner = ICONS[n] || ICONS["circle"] || "";
  return <svg class={"ic " + cls} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={col(color) || "currentColor"} stroke-width={sw || 2} stroke-linecap="round" stroke-linejoin="round" style={style} aria-hidden="true" dangerouslySetInnerHTML={{__html:inner}}/>;
}

/* "text [[$money]] more" → text + inline icons. iconColor: one colour for all icons; otherwise the usual colour per icon. */
export function Rich({t: text, iconColor, cls = "", tag: Tag = "span", style}){
  const s = String(text ?? "");
  if (!s.includes("[[")) return <Tag class={cls} style={style}>{s}</Tag>;
  const parts = s.split(/(\[\[\$?[a-z0-9-]+\]\])/);
  return <Tag class={cls} style={style}>{parts.map((p, i) => {
    const m = /^\[\[(\$?[a-z0-9-]+)\]\]$/.exec(p);
    if (!m) return p;
    return <Icon key={i} n={m[1]} cls="inl" color={iconColor === "inherit" ? undefined : iconColor || ICON_COL[m[1]]}/>;
  })}</Tag>;
}
export const plain = s => String(s ?? "").replace(/\[\[\$?[a-z0-9-]+\]\]\s?/g, "");

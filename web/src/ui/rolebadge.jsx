/* 2.0 · the four ministries' badges: each has its own shape, colour and picture, so they can be told apart at a glance
   (and by shape alone, for colour-blind players)
   Energy & Industry  — yellow hexagon, a lightning bolt over a factory
   Diplomacy          — blue circle, a handshake over the globe
   Disasters & Cities — red shield, a siren over a house
   People & Nature    — green leaf, a sprout with people */
import ICONS from "../gen/icons.js";

const BADGE = {
  energy:  {shape:"M32 2 L58 17 V47 L32 62 L6 47 V17 Z", c1:"#ffd25a", c2:"#e39a12", ink:"#3a2400", main:"zap", sub:"factory"},
  diplo:   {shape:"M32 2 A30 30 0 1 1 31.99 2 Z", c1:"#7cc8ff", c2:"#2a6fc9", ink:"#06223f", main:"handshake", sub:"globe"},
  disaster:{shape:"M32 2 L57 10 V30 C57 46 46 56 32 62 C18 56 7 46 7 30 V10 Z", c1:"#ff8a70", c2:"#d63a2a", ink:"#3d0a04", main:"siren", sub:"house"},
  people:  {shape:"M60 4 C60 40 46 61 20 61 C9 61 3 55 3 44 C3 18 28 4 60 4 Z", c1:"#7fe0a0", c2:"#2a9d5c", ink:"#04301a", main:"sprout", sub:"users"},
};
export const ROLE_ICONS = ["zap", "factory", "handshake", "globe", "siren", "house", "sprout", "users"];
let n = 0;
export function RoleBadge({id, size = 28, dim, cls = ""}){
  const b = BADGE[id]; if (!b) return null;
  const g = "rb" + id + (n = (n + 1) % 1e6);
  const shape = b.shape;
  return <svg class={"rolebadge " + cls} width={size} height={size} viewBox="0 0 64 64" style={{opacity:dim ? .35 : 1}} aria-hidden="true">
    <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color={b.c1}/><stop offset="1" stop-color={b.c2}/></linearGradient></defs>
    <path d={shape} fill={`url(#${g})`} stroke={b.ink} stroke-opacity=".55" stroke-width="2.5"/>
    <path d={shape} fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.5" transform="translate(32 32) scale(.86) translate(-32 -32)"/>
    <svg x="13" y="11" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={b.ink} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{__html:ICONS[b.main] || ""}}/>
    <circle cx="48" cy="48" r="12" fill="#fff" stroke={b.ink} stroke-width="2"/>
    <svg x="40" y="40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={b.c2} stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{__html:ICONS[b.sub] || ""}}/>
  </svg>;
}

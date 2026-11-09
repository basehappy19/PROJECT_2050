/* 3.5: the game's own tooltips (top-bar values, character, abilities).
   Mouse: hover shows, leaving hides. Touch / pen (iPad): a tap shows, a second tap on the same thing hides,
   and a tap anywhere else, the mouse wheel, Esc, switching apps or 8 seconds also hide it — so a tooltip can never stay stuck.
   Only one tooltip is open at a time. The element that owns tooltip `id` carries data-tip={id}. */
import {bump} from "../core.js";

let cur = null, timer = 0, lastType = "mouse", installed = false;
const AUTO_HIDE = 8000;

export const tipOpen = id => cur === id;
/* how the last press was made: "mouse", "touch" or "pen" */
export const lastPointer = () => lastType;

export function showTip(id, auto){
  install();
  if (cur !== id){ cur = id; bump(); }
  clearTimeout(timer);
  if (auto) timer = setTimeout(() => hideTip(id), AUTO_HIDE);
}
export function hideTip(id){
  if (id != null && cur !== id) return;
  clearTimeout(timer);
  if (cur !== null){ cur = null; bump(); }
}
export function toggleTip(id){ if (cur === id) hideTip(id); else showTip(id, lastType !== "mouse"); }

function install(){
  if (installed || typeof document === "undefined") return;
  installed = true;
  // capture phase, so it runs before the element's own click: a press outside the open tooltip's owner closes it
  document.addEventListener("pointerdown", e => {
    lastType = e.pointerType || "mouse";
    if (cur === null) return;
    const own = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
    if (!own || own.getAttribute("data-tip") !== cur) hideTip();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); }, true);
  document.addEventListener("wheel", () => hideTip(), {capture:true, passive:true});
  document.addEventListener("visibilitychange", () => { if (document.hidden) hideTip(); });
  window.addEventListener("blur", () => hideTip());
}

/* props for the element that owns tooltip `id`. onTap: what a tap/click does instead of showing the tooltip (e.g. open a window) */
export function tipProps(id, onTap){
  install();
  return {
    "data-tip":id,
    onPointerEnter:e => { if (e.pointerType === "mouse") showTip(id); },
    onPointerLeave:e => { if (e.pointerType === "mouse") hideTip(id); },
    onClick:e => {
      if (onTap){ hideTip(); onTap(e); return; }
      if (lastType === "mouse") return;   // a mouse already sees it on hover
      toggleTip(id);
    },
  };
}

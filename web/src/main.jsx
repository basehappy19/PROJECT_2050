/* Project Zero — web version entry */
import "./style.css";
import {render} from "preact";
import {P, S} from "./core.js";
import "./audio.js";
import "./game.js";
import {App} from "./app.jsx";

if (!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){ r = Math.min(typeof r === "number" ? r : 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this; };
}
document.documentElement.lang = S.lang || "th";
/* 3.4: the page arrives with a readable start screen (#boot, for search engines and slow networks); the game replaces it */
const root = document.getElementById("app");
root.textContent = "";
render(<App/>, root);
/* 1.1.5: a new version is picked up while the game is open: the service worker checks for updates when the tab comes back
   and every 20 minutes; when the new one takes over, the menu reloads at once and a game in progress offers "Update now" (it saves first) */
if ("serviceWorker" in navigator && location.protocol === "https:"){
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(reg => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 20 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (had) P.updateReady(); });
}
P.updateReady = () => {
  const UIM = P.UIM;
  if (UIM.screen !== "game" || !S.started || S.over){ location.reload(); return; }
  UIM.updateReady = true; P._bump();
};
P.updateNow = () => { try { P.autosave(); } catch(e){} setTimeout(() => location.reload(), 150); };
window.P2050 = P;
/* 3.5: no browser tooltips anywhere — the game draws its own. A title attribute that slips in (from any component)
   is moved to aria-label, so screen readers still get the text but the browser shows no tooltip */
{
  const strip = el => {
    const v = el.getAttribute("title"); if (v === null) return;
    el.removeAttribute("title");
    if (v && (!el.hasAttribute("aria-label") || el.dataset.tl)){ el.setAttribute("aria-label", v); el.dataset.tl = "1"; }
  };
  new MutationObserver(ms => {
    for (const m of ms){
      if (m.type === "attributes"){ if (m.target.nodeType === 1) strip(m.target); continue; }
      for (const n of m.addedNodes) if (n.nodeType === 1){ strip(n); n.querySelectorAll("[title]").forEach(strip); }
    }
  }).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:["title"]});
  document.querySelectorAll("body [title]").forEach(strip);
}

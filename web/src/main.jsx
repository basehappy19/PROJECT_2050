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
render(<App/>, document.getElementById("app"));
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

/* Project : 2050 — web version entry */
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
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
window.P2050 = P;

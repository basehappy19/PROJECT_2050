/* Picture headers made from the satellite map (no photos): a zoomed crop of the place an event is about,
   tinted, with a big icon for the kind of event. */
import {P} from "../core.js";
import {ll} from "../geo.js";
import {MAP} from "../geo.js";

export const SND_ICON = {heat:"thermometer-sun", forest:"trees", arctic:"snowflake", harbor:"ship", storm:"cloud-lightning", lab:"flask-conical", crowd:"megaphone",
  construction:"construction", explosion:"flame", underwater:"fish", fire:"flame", air:"plane", office:"landmark", wind:"wind", bees:"flower", ocean:"waves",
  flood:"cloud-rain-wind", factory:"factory", farm:"wheat", city:"building-2", market:"chart-candlestick", train:"train-front", birds:"bird", siren:"siren",
  river:"droplets", jungle:"trees", keyboard:"cpu"};
export const SND_TINT = {heat:"#f07a3c", fire:"#ff5a4a", explosion:"#ff5a4a", storm:"#c3a6ff", flood:"#8fd0ff", ocean:"#4fd1c5", underwater:"#4fd1c5", arctic:"#bfe8ff",
  forest:"#5fd39a", farm:"#9be89a", bees:"#f2c14e", birds:"#5fd39a", wind:"#e2c27a", siren:"#ff5a4a", crowd:"#f2b441", factory:"#b7c7cf", city:"#8fd0ff",
  market:"#f2c14e", lab:"#4fd1c5", office:"#c3a6ff", harbor:"#8fd0ff", air:"#8fd0ff", train:"#4fd1c5", construction:"#f2b441"};
const CE_SND = {CE_BATTERY:"factory", CE_COAL:"factory", CE_DAM:"flood", CE_FOREST:"forest", CE_CBAM:"market", CE_REFUGEE:"crowd", CE_SEABED:"underwater", CE_NUKE:"lab",
  CE_ARCTIC:"arctic", CE_LOSS:"office", CE_SOLARWAR:"market", CE_GEOENG:"lab", CE_MARINE:"ocean", CE_PALM:"farm", CE_DATA:"city", CE_RAIL:"train"};
/* painted picture for each event (assets/img/events/<id>.webp) */
export const eventImg = id => `assets/img/events/${id}.webp`;
export const eventSnd = e => (e.country ? CE_SND[e.id] : e.snd) || "office";

/* CSS background for a crop of the map centred on map point [x, y]; aspect = container height / width */
export function mapCrop(pt, zoom = 3, aspect = .3, theme = "day"){
  const Z = zoom, u = pt ? pt[0] / MAP.W : .5, v = pt ? pt[1] / MAP.H : .5, ih = Z * MAP.H / MAP.W;
  const px = Z > 1 ? Math.max(0, Math.min(1, (u * Z - .5) / (Z - 1))) : .5;
  const py = ih > aspect ? Math.max(0, Math.min(1, (v * ih - aspect / 2) / (ih - aspect))) : .5;
  return {backgroundImage:`url(assets/img/map-${theme}-s.jpg)`, backgroundSize:`${Z * 100}% auto`, backgroundPosition:`${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%`};
}
export function eventPoint(e){
  if (e.country && e.A && e.A.length) return P.countryPoint(e.A[0]);
  if (e.target){ const m = P.RMETA[e.target]; return ll(m.lab[0], m.lab[1]); }
  return null;
}

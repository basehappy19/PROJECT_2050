const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.place) return;
(P.mods = P.mods || {}).place = 1;
/* =========================================================================
   Phase 4 · Placing builds yourself (Continuous World only)
   In Mission 2050 builds are pinned automatically. In Continuous World, wind, solar, floating solar,
   geothermal and small reactors become "to place" tokens: the map shows a hex grid coloured by how
   suitable each cell is, and the player taps a cell. A good spot cuts more CO₂ in that country and
   spreads green technology faster; "place automatically" puts the rest in average spots.
   Suitability is an estimate from latitude, the satellite picture (desert / forest / snow) and coasts —
   not survey data — and the game says so.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const PLACEABLE = ["wind", "solar", "floatsolar", "geo", "nuclear"];
const TXT = {
  bar:T("รอวางบนแผนที่", "Waiting to be placed"), pick:T("แตะช่องบนแผนที่เพื่อวาง", "Tap a cell on the map to place"),
  auto:T("วางอัตโนมัติ", "Place automatically"), done:T("เสร็จ", "Done"), place:T("วาง", "Place"),
  good:T("เหมาะมาก", "Great spot"), ok:T("พอใช้", "OK"), poor:T("ไม่ค่อยเหมาะ", "Poor spot"),
  note:T("ความเหมาะสมประมาณจากละติจูด ภาพดาวเทียม (ทะเลทราย ป่า หิมะ) และชายฝั่ง", "Suitability is estimated from latitude, the satellite picture (desert, forest, snow) and coasts"),
  placed:T("วาง", "Placed"),
};
function placeInit(){ if (S.world) S.toPlace = S.toPlace || []; }
/* in Continuous World, placeable kinds become tokens instead of automatic pins */
const _place = P.placeBuilds;
P.placeBuilds = n => {
  const b = n.build; if (!b || !S.world) return _place(n);
  placeInit();
  const auto = {...b};
  const tok = (k, cnt) => { const t = S.toPlace.find(x => x.k === k && x.sk === n.id); if (t) t.n += cnt; else S.toPlace.push({k, sk:n.id, n:cnt, where:k === b.k ? b.where : b.where2}); };
  let any = false;
  if (PLACEABLE.includes(b.k)){ tok(b.k, b.n); auto.n = 0; any = true; }
  if (b.k2 && PLACEABLE.includes(b.k2)){ tok(b.k2, b.n); auto.k2 = null; any = true; }
  if (auto.n || auto.k2) _place({...n, build:auto});
  if (any && P.H && P.H.toast) P.H.toast({id:"place" + n.id, icon:"map-pin", title:L(TXT.bar), msg:L(TXT.pick)});
};
/* a placed build: one-off cut in that country's CO₂ and a push of green technology, both scaled by suitability */
function placeAt(k, cid, xy, suit){
  placeInit();
  const t = S.toPlace.find(x => x.k === k && x.n > 0); if (!t) return false;
  const c = P.C(cid); if (!c) return false;   // rest-of-region areas count too (the Sahara is one of the best solar sites)
  t.n--; S.toPlace = S.toPlace.filter(x => x.n > 0);
  S.pins = S.pins || []; S.pinId = S.pinId || 0;
  S.pins.push({id:++S.pinId, k, c:cid, sk:t.sk, sd:Math.floor(P.rand() * 1e6), t:S.tick, done:P.rollProgress(t.sk) === null, xy, s:+suit.toFixed(2)});
  P.addCountryCO2(c, -c.co2 * .012 * (.4 + suit));
  if (P.addGreen) P.addGreen(cid, 3 * suit);
  P.addLog(`[[map-pin]] ${L(TXT.placed)} ${kindName(k)} · ${P.cname(cid)} · ${L(suit >= .7 ? TXT.good : suit >= .45 ? TXT.ok : TXT.poor)}`, suit >= .45 ? "gd" : "tc");
  P.changed(); return true;
}
function placeAuto(){
  placeInit();
  S.toPlace.forEach(t => { if (t.n > 0) _place({id:t.sk, months:P.rollProgress(t.sk) === null ? 0 : 1, build:{k:t.k, where:t.where || [], n:t.n}}); });
  S.toPlace = []; P.changed();
}
const kindName = k => (P.KIND_NAME && P.KIND_NAME[k] ? L(P.KIND_NAME[k]) : k);
/* suitability 0…1 for a cell: lat in degrees, look = {arid 0…1, green 0…1, snow 0…1, coast bool}, cid = country */
function suitability(k, lat, look, cid){
  const a = Math.abs(lat), cosl = Math.cos(a * Math.PI / 180), cl = (v) => Math.max(0, Math.min(1, v));
  if (k === "solar") return cl(1.15 * (Math.pow(cosl, 1.5) * (.62 + .38 * look.arid) - look.green * .08) - look.snow * .5);   // sunshine: Sahara ≈ .9, Congo ≈ .65, France ≈ .4, UK ≈ .3
  if (k === "floatsolar") return cl(Math.pow(cosl, 1.2) * (.5 + .3 * look.green) * (look.coast ? 1 : .85));
  if (k === "wind") return cl((.25 + .75 * Math.min(1, Math.max(0, (a - 18) / 34))) * (look.coast ? 1 : .72) + look.arid * .1 - look.green * .15);
  if (k === "geo"){ const hot = ["USA", "IDN", "PHL", "TUR", "NZL", "KEN", "MEX", "JPN", "ISL", "ITA", "ETH", "CHL", "PER"]; return cl((hot.includes(cid) ? .75 : .25) + (look.coast ? .1 : 0)); }
  if (k === "nuclear") return cl(.45 + (look.coast ? .35 : 0) + (1 - look.snow) * .1);
  return .5;
}
Object.assign(P, {PLACEABLE, PLACE_TXT:TXT, placeInit, placeAt, placeAuto, suitability});

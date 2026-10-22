const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.achV1) return;
(P.mods = P.mods || {}).achV1 = 1;
/* ===== Achievements added in version 1.0 (minerals, builds on the map, green technology, real news, Continuous World).
   Server rewards: server/api/src/game-rules.js ACH_TERRA must list the same ids. ===== */
const S = P.S, T = (th, en) => ({th, en});
const NEWS_IDS = () => P.EVENTS.filter(e => /^NW_/.test(e.id)).map(e => e.id);
P.ACH.push(
  {id:"ore1",     icon:"gem",           t:T("ทรัพยากรชิ้นแรก", "First Resources"),            d:T("เริ่มใช้ทรัพยากรครั้งแรก (ซื้อสกิลแรก)", "Start using minerals (buy your first skill)")},
  {id:"ore5c",    icon:"ship",          t:T("ไม่พึ่งใครคนเดียว", "Many Suppliers"),     d:T("ได้ทรัพยากรจาก 5 ประเทศขึ้นไปพร้อมกัน", "Get minerals from 5+ countries at once")},
  {id:"pins30",   icon:"map-pin",       t:T("เปลี่ยนโฉมแผนที่", "A New Map"),            d:T("มีสิ่งที่สร้างบนแผนที่ 30 แห่งในเกมเดียว", "Have 30 builds on the map in one game")},
  {id:"green10",  icon:"leaf",          t:T("เทคโนโลยีไร้พรมแดน", "Tech Without Borders"), d:T("10 ประเทศมีเทคโนโลยีสีเขียว 60% ขึ้นไปพร้อมกัน", "10 countries at 60%+ green technology at once")},
  {id:"news10",   icon:"newspaper",     t:T("ทันข่าวโลก", "On the News"),                d:T("พบเหตุการณ์จากข่าวจริง 10 เรื่อง (นับทุกเกม)", "See 10 real-news events (all games)"), prog:d => [d.seen.filter(id => /^NW_/.test(id)).length, 10]},
  {id:"world1",   icon:"infinity",      t:T("ปีแรกของโลกใหม่", "A Year in the World"),    d:T("เล่นโหมดโลกต่อเนื่องครบ 1 ปี", "Play a full year of Continuous World")},
  {id:"thrive",   icon:"sparkles",      t:T("ยุครุ่งเรือง", "The Thriving Age"),         d:T("พาโลกต่อเนื่องเข้าสู่ยุครุ่งเรือง (ต่ำกว่า +1.5°C หลัง Net Zero)", "Bring a Continuous World into the Thriving Age (below +1.5°C after Net Zero)")},
);
P.achExtra = (unlock, d) => {
  if (d.seen.filter(id => /^NW_/.test(id)).length >= 10) unlock("news10");
  if (!S || !S.started || !S.countries) return;
  if (S.oreOn) unlock("ore1");
  if (P.oreSources && P.oreSources().length >= 5) unlock("ore5c");
  if ((S.pins || []).length >= 30) unlock("pins30");
  if (S.countries.filter(c => !c.rest && (c.green || 0) >= 60).length >= 10) unlock("green10");
  if (S.world && S.tick - (S.worldStart || 0) >= 12) unlock("world1");
  if (S.world && S.era === "thrive") unlock("thrive");
};
P.newsIds = NEWS_IDS;

/* Hard Core opens after the first Mission 2050 win in the normal mode (this device, or the signed-in account) */
P.hardUnlocked = () => !!(P.AchStore && P.AchStore.data.got.win) || !!(P.Net && P.Net.user && P.Net.user.cleared && P.Net.user.cleared.normal);

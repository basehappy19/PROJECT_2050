const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v17) return;
(P.mods = P.mods || {}).v17 = 1;
/* =========================================================================
   Version 1.7 · The mineral supply chain
   · Minerals dug out of the ground are RAW: skills can only use REFINED minerals.
   · Raw minerals go through refineries: our own (a small one to start with, more can be built)
     and those of friendly countries that refine (toll refining: friendship 40+ lends capacity).
   · Countries that refine a group (China above all) send it ready to use; other producers send it raw.
   · The world market sells refined minerals; it is the quick but dear way round.
   · A refinery costs money to build, a little every month to run, pleases industry and annoys city people.
   Real-world basis: IEA "Global Critical Minerals Outlook" — China refines most of the world's
   graphite, rare earths, cobalt, lithium and polysilicon; Indonesia most nickel.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);
const GIDS = () => P.MAT_IDS;

/* which countries refine which groups */
const REFINE = {
  CHN:["bat", "ree", "cu", "si"], IDN:["bat"], JPN:["bat", "cu"], KOR:["bat"], FIN:["bat"], RUS:["bat", "u"],
  MYS:["ree", "si"], USA:["ree", "si", "u"], CHL:["cu"], DEU:["cu", "si"], POL:["cu"], NOR:["si"],
  FRA:["u"], GBR:["u"], CAN:["u"],
};
const HOME_CAP = 1.5, LV_CAP = 3, TOLL_CAP = 1, TOLL_REL = 40, BUILD_MONTHS = 6, UPKEEP = 1, MAX_LV = 4;
const refines = (cid, g) => (REFINE[cid] || []).includes(g);
const ok = c => c && !c.rest && !((S.oreBan || {})[c.id] > 0) && !c.hostile;

function supplyInit(){
  S.raw = S.raw || {bat:0, ree:0, cu:0, si:0, u:0};
  S.refLv = S.refLv || {bat:0, ree:0, cu:0, si:0, u:0};
  S.refBuild = S.refBuild || {};
}
/* friendly refiner countries that lend capacity for group g */
const tollers = g => S.countries.filter(c => refines(c.id, g) && ok(c) && c.rel >= TOLL_REL);
function refCap(g){
  supplyInit();
  return HOME_CAP + LV_CAP * (S.refLv[g] || 0) + TOLL_CAP * tollers(g).length;
}
/* what arrives this month, raw or refined (replaces the plain matGain in the market tick) */
function matSplit(){
  supplyInit();
  const raw = {}, ref = {}, home = ((P.ORE_HOME ?? .6) + (S.oreInc || 0)) / GIDS().length, cut = (S.orePrice || 0) > 0 ? .7 : 1;
  GIDS().forEach(g => { raw[g] = home; ref[g] = 0; });
  P.matSources().forEach(x => { if (refines(x.id, x.g)) ref[x.g] += x.amt * cut; else raw[x.g] += x.amt * cut; });
  return {raw, ref};
}
/* minerals from a bubble or an order: ready to use if that country refines them */
function arrives(cid, g, n){
  supplyInit();
  if (refines(cid, g)) S.mat[g] += n; else S.raw[g] += n;
}
function refineTick(){
  supplyInit();
  for (const g of GIDS()){
    // refineries under construction
    if (S.refBuild[g] > 0 && --S.refBuild[g] === 0){
      S.refLv[g]++; delete S.refBuild[g];
      P.addLog(`[[factory]] ${L(T("โรงแยกแร่สร้างเสร็จ", "Refinery finished"))}: ${L(P.MAT[g].name)} · +${LV_CAP}${P.t("perMo")}`, "gd");
      hook("sfx", "coin");
    }
    const n = Math.min(S.raw[g], refCap(g));
    if (n > 0){ S.raw[g] -= n; S.mat[g] += n; }
  }
  const lv = GIDS().reduce((s, g) => s + (S.refLv[g] || 0), 0);
  if (lv){ const e0 = S.ep; S.ep = Math.max(0, S.ep - lv * UPKEEP); if (P.ledgerTag) P.ledgerTag("refinery", S.ep - e0, 0); }
}
Object.assign(P.UI, {
  resReady:T("พร้อมใช้", "ready"), resRaw:T("ต้องแปรรูป", "needs refining"), resSends:T("ส่งให้เรา", "Sends us"), resBanned:T("ระงับ", "Stopped"),
  resNeed:T("ต้องถึง", "needs"), resToll:T("ช่วยแปรรูปให้เรา", "Refines for us"), resImports:T("ประเทศนี้ต้องนำเข้าแร่", "Imports its minerals"),
  invReady:T("พร้อมใช้", "Ready"), invRaw:T("รอแปรรูป", "Waiting"), invSpeed:T("แปรรูปได้", "Refines"),
  refHas:T("มีโรงแยกแร่", "Refines"), refReady:T("ส่งทรัพยากรเหล่านี้แบบพร้อมใช้", "sends these ready to use"),
  refTollOn:T("ช่วยแยกแร่ดิบให้เรา", "refines our raw minerals"), refTollOff:T("มิตรภาพ {N}+ จะช่วยแยกแร่ดิบให้เรา", "at friendship {N}+ it refines our raw minerals"),
  refRaw:T("แร่ดิบรอแยก", "Raw, waiting"), refRawHelp:T("แร่ที่ขุดได้ ต้องผ่านโรงแยกแร่ก่อนจึงใช้ได้", "Dug-up minerals must be refined before use"),
  refSpeed:T("แยกได้", "Refining"), refOurs:T("โรงแยกแร่ของเรา ระดับ", "Our refinery, level"), refBuilding:T("กำลังสร้าง", "Building"),
  refFriends:T("ประเทศที่ช่วยแยก", "Friends refining"), refMax:T("โรงแยกแร่ระดับสูงสุดแล้ว", "Refinery at top level"),
  refBuild:T("สร้างโรงแยกแร่", "Build a refinery"),
  refIntro:T("[[pickaxe]] แร่ที่ขุดได้เป็นแร่ดิบ ต้องผ่านโรงแยกแร่ก่อนใช้ ประเทศที่มีโรงแยกแร่ (เช่น จีน) ส่งทรัพยากรพร้อมใช้ และตลาดขายทรัพยากรพร้อมใช้", "[[pickaxe]] Dug-up minerals are raw and must be refined before use. Countries with refineries (such as China) send them ready to use, and the market sells them ready to use."),
  refStock:T("พร้อมใช้", "ready"), refWaiting:T("มีแร่ดิบรอแยก {N} (ราว {M} เดือน)", "{N} raw waiting to be refined (about {M} months)"),
});

/* building a refinery */
const levelOf = g => (S.refLv ? S.refLv[g] || 0 : 0) + (S.refBuild && S.refBuild[g] > 0 ? 1 : 0);
function refCost(g){
  const k = (P.bal ? P.bal().cost : 1) * (1 + .5 * levelOf(g));
  return {ep:Math.round(90 * k), pc:Math.round(10 * k)};
}
const canBuild = g => S.oreOn && !(S.refBuild && S.refBuild[g] > 0) && levelOf(g) < MAX_LV && S.ep >= refCost(g).ep && S.pc >= refCost(g).pc;
function buildRefinery(g){
  supplyInit();
  if (!canBuild(g)) return false;
  const k = refCost(g); S.ep -= k.ep; S.pc -= k.pc; S.refBuild[g] = BUILD_MONTHS;
  P.addLog(`[[factory]] ${L(T("เริ่มสร้างโรงแยกแร่", "Refinery started"))}: ${L(P.MAT[g].name)} · ${BUILD_MONTHS} ${P.t("months")}`, "tc");
  hook("sfx", "buy"); P.changed();
  return true;
}
/* raw stock that would cover a skill once refined (for the "short of minerals" hint) */
const rawFor = g => (S.raw ? Math.floor(S.raw[g] || 0) : 0);
const refinesList = cid => REFINE[cid] || [];
const monthsToRefine = g => { const c = refCap(g); return c > 0 ? Math.ceil(rawFor(g) / c) : 99; };

/* the light mineral value (before minerals split into groups) is unaffected; old saves start with empty raw stocks */
const _init = P.v1Init;
P.v1Init = () => { if (_init) _init(); if (S.mat) supplyInit(); };

/* 1.6 politics: a refinery pleases industry and annoys city people */
const REF_TILT = {ind:3, city:-2};
const build = P.withGroupTilt ? P.withGroupTilt(buildRefinery, () => REF_TILT) : buildRefinery;
const refTilt = () => (P.groupPreview ? P.groupPreview(REF_TILT) : []);

Object.assign(P, {REFINE, refines, refCap, tollers, matSplit, arrives, refineTick, refCost, canBuild, buildRefinery:build, refTilt, refLevel:levelOf, rawFor, refinesList, monthsToRefine,
  REF_HOME_CAP:HOME_CAP, REF_LV_CAP:LV_CAP, REF_TOLL_CAP:TOLL_CAP, REF_TOLL_REL:TOLL_REL, REF_UPKEEP:UPKEEP, REF_MAX_LV:MAX_LV, REF_MONTHS:BUILD_MONTHS});

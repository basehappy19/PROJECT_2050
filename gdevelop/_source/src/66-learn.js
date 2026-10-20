const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.learn) return;
(P.mods = P.mods || {}).learn = 1;
/* =========================================================================
   Screens · Learning page: knowledge cards ("Did you know?" facts unlocked by events),
   local weather cards, endings gallery and achievements. Opens from the menu and the pause window.
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens, EVENTS, HAZARDS, ENDINGS} = P;
const k = Kit;
const FACT_EVENTS = EVENTS.filter(e => e.fact);
const HZ_IDS = Object.keys(HAZARDS);
const END_KEYS = ["winS", "winA", "winB", "l3", "l2", "l1"];
P.cardTotal = () => FACT_EVENTS.length + HZ_IDS.length;
P.cardCount = () => { const d = P.AchStore.data; return FACT_EVENTS.filter(e => d.seen.includes(e.id)).length + HZ_IDS.filter(h => (d.haz || []).includes(h)).length; };

Screens.mLearn = function(l, pw){
  const x = 22, w = pw - 44; let y = 18;
  const tab = UIM.learnTab || "cards";
  k.text(l, `[[book-open]] ${P.up(t("mLearn"))}`, x, y, {font:"disp", size:22, iconColor:"accent"}); y += 40;
  W.tabs(l, x, y, [
    {id:"lt-cards", label:`[[lightbulb]] ${t("lCards")}`, on:tab === "cards", fn:() => { UIM.learnTab = "cards"; k.L("ModalScroll").scroll = 0; k.dirty(); }},
    {id:"lt-haz", label:`[[cloud-lightning]] ${t("lHazards")}`, on:tab === "haz", fn:() => { UIM.learnTab = "haz"; k.L("ModalScroll").scroll = 0; k.dirty(); }},
    {id:"lt-end", label:`[[image]] ${t("lEndings")}`, on:tab === "end", fn:() => { UIM.learnTab = "end"; k.L("ModalScroll").scroll = 0; k.dirty(); }},
    {id:"lt-ach", label:`[[trophy]] ${t("mAch")}`, on:tab === "ach", fn:() => { UIM.learnTab = "ach"; k.L("ModalScroll").scroll = 0; k.dirty(); }},
  ]);
  y += 46;
  const d = P.AchStore.data;
  if (tab === "cards"){
    const got = FACT_EVENTS.filter(e => d.seen.includes(e.id));
    y += k.text(l, `${t("lCardsHelp")} · ${got.length}/${FACT_EVENTS.length}`, x, y, {size:12.5, color:"muted", w}).h + 10;
    const cw = (w - 10) / 2; let col = 0, rowY = y, rowH = 0;
    const list = [...got, ...FACT_EVENTS.filter(e => !d.seen.includes(e.id)).slice(0, Math.max(0, 6 - got.length))];
    list.forEach((e, i) => {
      const on = d.seen.includes(e.id), cx = x + col * (cw + 10);
      let ty = rowY + 12;
      ty += k.text(l, on ? `[[lightbulb]] ${L(e.title)}` : `[[lock]] ${t("lLocked")}`, cx + 12, ty, {font:"bodyB", size:13.5, w:cw - 24, color:on ? "fg" : "muted", iconColor:on ? "warn" : "muted"}).h + 4;
      ty += k.text(l, on ? L(e.fact) : t("lLockedHelp"), cx + 12, ty, {size:12.5, color:"muted", w:cw - 24, lh:1.4}).h;
      const hh = ty - rowY + 12; e._h = hh; e._x = cx; e._y = rowY; rowH = Math.max(rowH, hh);
      col++;
      if (col === 2 || i === list.length - 1){ for (let j = i - col + 1; j <= i; j++){ const b = list[j]; k.rect(l, b._x, b._y, cw, rowH, d.seen.includes(b.id) ? "panel2" : "bg", {r:10, stroke:"line", under:true}); } rowY += rowH + 10; rowH = 0; col = 0; }
    });
    y = rowY;
  } else if (tab === "haz"){
    y += k.text(l, t("lHazHelp"), x, y, {size:12.5, color:"muted", w}).h + 10;
    for (const id of HZ_IDS){
      const Z = HAZARDS[id], on = (d.haz || []).includes(id);
      const th = k.text(null, on ? L(Z.fact) : t("lHazLocked"), 0, 0, {size:12.5, w:w - 90, measure:true}).h;
      const ch = Math.max(64, th + 40);
      W.card(l, x, y, w, ch, {fill:on ? "panel2" : "bg"});
      k.rect(l, x + 12, y + (ch - 44) / 2, 44, 44, on ? "accent" : "line", {r:10, a:.16});
      k.icon(l, Z.icon, x + 22, y + (ch - 24) / 2, 24, on ? "accent" : "muted");
      k.text(l, L(Z.name), x + 70, y + 9, {font:"bodyB", size:14, color:on ? "fg" : "muted"});
      k.text(l, on ? L(Z.fact) : t("lHazLocked"), x + 70, y + 30, {size:12.5, color:"muted", w:w - 90, lh:1.4});
      y += ch + 8;
    }
  } else if (tab === "end"){
    y += k.text(l, t("lEndHelp"), x, y, {size:12.5, color:"muted", w}).h + 10;
    const cw = (w - 20) / 3, chh = cw * 9 / 16;
    END_KEYS.forEach((key, i) => {
      const cx = x + (i % 3) * (cw + 10), cy = y + Math.floor(i / 3) * (chh + 46), on = !!(d.ends || {})[key];
      const anim = key.startsWith("win") ? `end-win-${key.slice(3)}` : ENDINGS[key].img;
      k.rect(l, cx, cy, cw, chh, "bg", {r:8, stroke:"line", bg:true});
      if (on) k.sprite(l, "EndArt", anim, cx + 2, cy + 2, cw - 4, chh - 4);
      else k.icon(l, "lock", cx + cw / 2 - 14, cy + chh / 2 - 14, 28, "muted");
      const title = key.startsWith("win") ? L(ENDINGS.win.grades[key.slice(3)]) : t(key + "Title");
      k.text(l, on ? title : "???", cx, cy + chh + 6, {font:"bodyB", size:12.5, w:cw, align:"center", max:2, color:on ? "fg" : "muted"});
    });
    y += 2 * (chh + 46);
  } else {
    y += this.achList(l, x, y, w) + 8;
  }
  W.btn(l, "lclose", x, y + 6, t("mBack"), () => Screens.closeLearn(), {kind:"ghost"});
  return y + 6 + 36 + 20;
};
P.ready = true;

// Builds the GDevelop 5 project (game.json) for Project : 2050 and optionally exports it to HTML5.
//   node make-project.mjs [--export]
import { gd, loadProject, saveProject, exportProject } from "gdcore-tools";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "/home/claude/p2050";
const OUT = `${ROOT}/out`;                 // project folder (game.json + assets/)
const SRC = `${ROOT}/src`;
const META = JSON.parse(fs.readFileSync(`${ROOT}/assetgen/mapmeta.json`, "utf8"));
const LUCIDE = JSON.parse(fs.readFileSync("/home/claude/src/lucide.json", "utf8"));
const uuid = () => crypto.randomUUID();

/* ------------------------------------------------------------------ resources */
const resources = [];
const img = (name, file) => resources.push({file, kind:"image", metadata:"", name, smoothed:true, userAdded:true});
const audio = (name, file, music) => resources.push({file, kind:"audio", metadata:"", name, preloadAsMusic:!!music, preloadAsSound:!music, preloadInCache:false, userAdded:true});
const font = (name, file) => resources.push({file, kind:"font", metadata:"", name, userAdded:true});
for (const f of fs.readdirSync(`${OUT}/assets/map`).sort()) img(`map/${f}`, `assets/map/${f}`);
for (const f of fs.readdirSync(`${OUT}/assets/ui`).sort()) img(`ui/${f}`, `assets/ui/${f}`);
const ICONS = fs.readdirSync(`${OUT}/assets/icons`).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)).sort();
for (const n of ICONS) img(`icons/${n}.png`, `assets/icons/${n}.png`);
const TUTS = fs.readdirSync(`${OUT}/assets/tutorial`).filter(f => /\.(jpg|png)$/.test(f)).sort();
for (const f of TUTS) img(`tutorial/${f}`, `assets/tutorial/${f}`);
for (const f of fs.readdirSync(`${OUT}/assets/fonts`).filter(f => f.endsWith(".ttf")).sort()) font(f.slice(0, -4), `assets/fonts/${f}`);
for (const f of fs.readdirSync(`${OUT}/assets/audio`).filter(f => f.endsWith(".mp3")).sort()) audio(f, `assets/audio/${f}`, f.startsWith("music-"));

/* ------------------------------------------------------------------ objects */
const frame = (image, ox = 0, oy = 0) => ({hasCustomCollisionMask:false, image, points:[], originPoint:{name:"origine", x:ox, y:oy}, centerPoint:{automatic:true, name:"centre", x:0, y:0}, customCollisionMask:[]});
const anim = (name, image, ox, oy) => ({name, useMultipleDirections:false, directions:[{looping:false, timeBetweenFrames:0.08, sprites:[frame(image, ox, oy)]}]});
const vars = list => list.map(([name, type, value]) => ({name, type, value}));
const sprite = (name, anims, variables = [], extra = {}) => ({adaptCollisionMaskAutomatically:false, assetStoreId:"", name, type:"Sprite", updateIfNotVisible:false, variables:vars(variables), effects:[], behaviors:[], animations:anims, ...extra});
const textObj = (name, fontRes, size, color) => ({
  assetStoreId:"", bold:false, italic:false, name, smoothed:true, type:"TextObject::Text", underlined:false, variables:[], effects:[], behaviors:[],
  string:"Text", font:fontRes, textAlignment:"left", characterSize:size, color:{r:color[0], g:color[1], b:color[2]},
  content:{bold:false, isOutlineEnabled:false, isShadowEnabled:false, italic:false, outlineColor:"0;0;0", outlineThickness:2, shadowAngle:90, shadowBlurRadius:2, shadowColor:"0;0;0", shadowDistance:4, shadowOpacity:127, smoothed:true, underlined:false, text:"Text", font:fontRes, textAlignment:"left", verticalTextAlignment:"top", characterSize:size, lineHeight:0, color:color.join(";")},
});
const painter = name => ({assetStoreId:"", name, type:"PrimitiveDrawing::Drawer", variables:[], effects:[], behaviors:[], fillOpacity:255, outlineSize:0, outlineOpacity:255, absoluteCoordinates:true, clearBetweenFrames:false, antialiasing:"none", fillColor:{r:255, g:255, b:255}, outlineColor:{r:0, g:0, b:0}});
const textInput = name => ({assetStoreId:"", name, type:"TextInput::TextInputObject", variables:[], effects:[], behaviors:[],
  content:{initialValue:"", placeholder:"", fontResourceName:"PlexMono-Medium", fontSize:16, inputType:"text area", textColor:"224;235;232", fillColor:"5;11;16", fillOpacity:255, borderColor:"35;64;74", borderOpacity:255, borderWidth:1, readOnly:false, disabled:false, spellCheck:false, paddingX:8, paddingY:6, textAlign:"left", maxLength:0}});

const REGS = ["NA", "EU", "EA", "SA", "MEAF", "SEA"];
const globalObjects = [
  painter("UIPainter"),
  textObj("UIText", "PlexThai-Regular", 21, [224, 235, 232]),
  sprite("UIIcon", ICONS.map(n => anim(n, `icons/${n}.png`))),
  sprite("TutImage", TUTS.map(f => anim(f.replace(/\.(jpg|png)$/, ""), `tutorial/${f}`))),
  textInput("CodeInput"),
  sprite("Backdrop", [anim("Backdrop", "ui/backdrop.jpg")]),
];
const mapObjects = () => [
  sprite("Ocean", [anim("Ocean", "map/ocean.png")]),
  sprite("MapRim", [anim("MapRim", "map/rim.png")]),
  sprite("ArcticIce", [anim("ArcticIce", "map/ice.png")]),
  sprite("Region", REGS.map(r => anim(r, `map/region-${r}.png`)), [["Reg", "string", ""]]),
  sprite("RegionLine", REGS.map(r => anim(r, `map/line-${r}.png`)), [["Reg", "string", ""]]),
  sprite("Plume", [anim("Plume", "ui/glow.png", 48, 48)], [["Reg", "string", ""], ["W", "number", 1], ["Phase", "number", 0], ["Base", "number", 0.5]]),
  sprite("Bubble", [anim("green", "ui/bubble-green.png", 80, 143), anim("red", "ui/bubble-red.png", 80, 143)], [["Id", "number", 0], ["BaseY", "number", 0], ["Phase", "number", 0]]),
];

/* ------------------------------------------------------------------ instances */
const inst = (name, layer, x, y, o = {}) => ({angle:0, customSize:o.w !== undefined, height:o.h || 0, width:o.w || 0, keepRatio:true, layer, name, persistentUuid:uuid(), x, y, zOrder:o.z || 0,
  numberProperties:o.anim !== undefined ? [{name:"animation", value:o.anim}] : [], stringProperties:[], initialVariables:o.vars ? vars(o.vars) : []});
const SS = META.meta.SS, MAP_TOP = 84;
const ROB = [[1.0000,0.0000],[0.9986,0.0620],[0.9954,0.1240],[0.9900,0.1860],[0.9822,0.2480],[0.9730,0.3100],[0.9600,0.3720],[0.9427,0.4340],[0.9216,0.4958],[0.8962,0.5571],[0.8679,0.6176],[0.8350,0.6769],[0.7986,0.7346],[0.7597,0.7903],[0.7186,0.8435],[0.6732,0.8936],[0.6213,0.9394],[0.5722,0.9761],[0.5322,1.0000]];
function toWorld(lat, lon){ const M = META.meta; let l = lon - M.LON0; while (l < -180) l += 360; while (l > 180) l -= 360;
  const a = Math.min(90, Math.abs(lat)) / 5, i = Math.min(17, Math.floor(a)), f = a - i;
  const X = ROB[i][0] + (ROB[i+1][0] - ROB[i][0]) * f, Y = ROB[i][1] + (ROB[i+1][1] - ROB[i][1]) * f;
  return [(0.8487 * X * l * Math.PI / 180 + M.XR) * M.U / SS, MAP_TOP + (M.YT - 1.3523 * Y * Math.sign(lat)) * M.U / SS]; }
// cities from the game data (same table as in 10-data-a.js)
const CITIES = new Function(fs.readFileSync(`${SRC}/10-data-a.js`, "utf8").match(/const CITIES = \{[\s\S]*?\n\};/)[0] + "; return CITIES;")();
function mapInstances(){
  const out = [], pad = META.ocean.pad;
  out.push(inst("Ocean", "", -pad / SS, MAP_TOP - pad / SS, {w:(META.meta.SW + 2 * pad) / SS, h:(META.meta.SH + 2 * pad) / SS, z:0}));
  out.push(inst("MapRim", "", -pad / SS, MAP_TOP - pad / SS, {w:(META.meta.SW + 2 * pad) / SS, h:(META.meta.SH + 2 * pad) / SS, z:1}));
  out.push(inst("ArcticIce", "", 0, MAP_TOP, {w:META.meta.SW / SS, h:META.ice.h / SS, z:2}));
  REGS.forEach((r, i) => { const b = META.regions[r].bbox; out.push(inst("Region", "", b[0] / SS, MAP_TOP + b[1] / SS, {w:(b[2] - b[0]) / SS, h:(b[3] - b[1]) / SS, z:10, anim:i, vars:[["Reg", "string", r]]})); });
  REGS.forEach((r, i) => { const b = META.lines[r].bbox; out.push(inst("RegionLine", "", b[0] / SS, MAP_TOP + b[1] / SS, {w:(b[2] - b[0]) / SS, h:(b[3] - b[1]) / SS, z:20, anim:i, vars:[["Reg", "string", r]]})); });
  for (const [reg, list] of Object.entries(CITIES)) for (const c of list){
    const [x, y] = toWorld(c[0], c[1]);
    out.push(inst("Plume", "", +x.toFixed(1), +y.toFixed(1), {z:30, vars:[["Reg", "string", reg], ["W", "number", c[2]], ["Phase", "number", +(Math.random() * 6.28).toFixed(2)]]}));
  }
  return out;
}

/* ------------------------------------------------------------------ events helpers */
const C = (type, params, inverted = false) => ({type:{value:type, ...(inverted ? {inverted:true} : {})}, parameters:params});
const A = (type, params) => ({type:{value:type}, parameters:params});
const std = (conditions, actions, events = []) => ({type:"BuiltinCommonInstructions::Standard", conditions, actions, ...(events.length ? {events} : {})});
const js = (code, objects = "") => ({type:"BuiltinCommonInstructions::JsCode", inlineCode:code, parameterObjects:objects, useStrict:true, eventsSheetExpanded:false});
const comment = (text, color = [255, 230, 109]) => ({type:"BuiltinCommonInstructions::Comment", color:{r:color[0], g:color[1], b:color[2], textR:0, textG:0, textB:0}, comment:text});
const group = (name, events, color = [74, 176, 228]) => ({type:"BuiltinCommonInstructions::Group", colorR:color[0], colorG:color[1], colorB:color[2], creationTime:0, name, source:"", events, parameters:[]});
const forEach = (object, conditions, actions) => ({type:"BuiltinCommonInstructions::ForEach", object, conditions, actions});
const link = target => ({type:"BuiltinCommonInstructions::Link", include:{includeConfig:0}, target});
const atStart = C("DepartScene", [""]);
const released = C("MouseButtonReleased", ["", "Left"]);
const keyPressed = k => C("KeyFromTextPressed", ["", k]);
const numVar = (v, op, val) => C("NumberVariable", [v, op, String(val)]);
const strVar = (v, op, val) => C("StringVariable", [v, op, val]);
const setNum = (v, op, val) => A("SetNumberVariable", [v, op, String(val)]);
const changeScene = name => A("Scene", ["", `"${name}"`, "no"]);
const once = C("BuiltinCommonInstructions::Once", []);
const guard = "const P = window.P2050; if (!P || !P.ready) return;\n";

/* ------------------------------------------------------------------ core JS (external events "Core") */
const MODULES = [
  ["10-data-a.js", "Data · ข้อความ TH/EN, ภูมิภาค, เมือง, การสั่งการรายภูมิภาค, ผังเทคโนโลยี"],
  ["11-data-events.js", "Data · เหตุการณ์ตัดสินใจ 152 เรื่อง"],
  ["12-data-c.js", "Data · ข่าวทั่วไป, หน้าคู่มือ, ความสำเร็จ"],
  ["20-engine.js", "Engine · การจำลองรายเดือน, เศรษฐกิจ, เหตุการณ์, การบันทึก, ความสำเร็จ"],
  ["30-ui-kit.js", "UI toolkit · วาดแผง/ข้อความ/ไอคอนด้วย UIPainter, UIText, UIIcon"],
  ["40-audio.js", "Audio · เสียงเอฟเฟกต์และเสียงบรรยากาศของเหตุการณ์"],
  ["50-map.js", "Map · แผนที่โลก 2D, สีภูมิภาค, ควันมลพิษ, ฟอง, กล้อง"],
  ["60-screens.js", "Screens · วิดเจ็ต, สถานะหน้าจอ, ตั้งค่าฉาก, ลูปทุกเฟรม"],
  ["61-hud.js", "Screens · HUD และป้ายภูมิภาค"],
  ["62-drawer.js", "Screens · แผงเทคโนโลยี / ภูมิภาค / สถิติ / ข่าว"],
  ["63-modals.js", "Screens · หน้าต่างเริ่มภารกิจ, เหตุการณ์, จบเกม, หยุดเกม, คู่มือ"],
  ["64-menu.js", "Screens · หน้าโหลด, เมนูหลัก, แจ้งเตือนความสำเร็จ"],
];
const tutSizes = {};
{ // read jpeg/png sizes
  for (const f of TUTS){
    const b = fs.readFileSync(`${OUT}/assets/tutorial/${f}`); let w = 0, h = 0;
    if (f.endsWith(".png")){ w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
    else { let i = 2; while (i < b.length){ if (b[i] !== 0xFF){ i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC){ h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; } i += 2 + len; } }
    tutSizes[f.replace(/\.(jpg|png)$/, "")] = [w, h];
  }
}
const mapMetaSmall = {meta:META.meta, grid:META.grid};
const coreEvents = [
  comment("PROJECT : 2050 — โค้ดหลักของเกม (JavaScript)\nบล็อกด้านล่างทำงานครั้งเดียวตอนเริ่มฉาก Loading แล้วสร้าง window.P2050 ไว้ใช้ทั้งเกม\n• Data = ข้อความ TH/EN, ภูมิภาค, ผังเทคโนโลยี, เหตุการณ์ 152 เรื่อง, ข่าว, คู่มือ, ความสำเร็จ (แก้ตัวเลข/ข้อความได้ที่นี่)\n• Engine = กติกาการจำลองรายเดือน (เหมือนเวอร์ชันเว็บทุกอย่าง)\n• UI/Screens = วาดหน้าจอด้วยออบเจกต์ UIPainter, UIText, UIIcon, TutImage\nส่วนจังหวะเวลา การคลิก คีย์บอร์ด ดนตรี และการเปลี่ยนฉาก อยู่ใน Events ของแต่ละฉาก"),
  std([atStart], [], MODULES.map(([f, title]) => {
    let code = fs.readFileSync(`${SRC}/${f}`, "utf8");
    code = code.replace("/*MAPMETA*/null", JSON.stringify(mapMetaSmall)).replace("/*TUTSIZES*/{}", JSON.stringify(tutSizes));
    return js(`/* ${title} */\n` + code);
  })),
];

/* ------------------------------------------------------------------ scenes */
const LAYER = (name, base = false) => ({ambientLightColorB:200, ambientLightColorG:200, ambientLightColorR:200, camera2DPlaneMaxDrawingDistance:5000, camera3DFarPlaneDistance:10000, camera3DFieldOfView:45, camera3DNearPlaneDistance:3, cameraType:"", followBaseLayerCamera:false, isLightingLayer:false, isLocked:false, name, renderingType:"", visibility:true,
  cameras:[{defaultSize:true, defaultViewport:true, height:0, viewportBottom:1, viewportLeft:0, viewportRight:1, viewportTop:0, width:0}], effects:[]});
const sceneVars = list => vars(list);
function scene(name, layers, objects, instances, events, variables){
  return {b:16, disableInputWhenNotFocused:true, mangledName:name, name, r:5, standardSortMethod:true, stopSoundsOnStartup:true, title:"", v:11,
    uiSettings:{grid:false, gridType:"rectangular", gridWidth:32, gridHeight:32, gridOffsetX:0, gridOffsetY:0, gridColor:10401023, gridAlpha:0.8, snap:false, zoomFactor:0.5, windowMask:true},
    objectsGroups:[], variables:sceneVars(variables), instances, objects, events, layers:layers.map(n => LAYER(n)), behaviorsSharedData:[]};
}
const backdrop = () => inst("Backdrop", "Backdrop", 0, 0, {w:1920, h:1080});
const commonVars = [["GoTo", "string", ""], ["UIConsumed", "number", 0]];
const frameJs = js(guard + "P.Screens.frame(runtimeScene);");
const releaseJs = js(guard + "runtimeScene.getVariables().get(\"UIConsumed\").setNumber(P.Screens.release(runtimeScene));");
const goEvents = names => names.map(n => std([strVar("GoTo", "=", `"${n}"`)], [A("SetStringVariable", ["GoTo", "=", '""']), changeScene(n)]));
const plumePulse = forEach("Plume", [], [A("ChangeScale", ["Plume", "=", "Plume.Variable(Base) * (1 + 0.18 * sin(TimeFromStart() * 2.4 + Plume.Variable(Phase)))"])]);

const loadingScene = scene("Loading", ["Backdrop", "", "Loader", "Toast"], [], [backdrop()], [
  comment("ฉากโหลด: แสดงการ์ด PROJECT : 2050 ระหว่างโหลดภาพและเสียงของฉากอื่นเบื้องหลัง\nแล้วรอให้ผู้เล่นแตะหนึ่งครั้ง (เบราว์เซอร์อนุญาตให้เล่นเสียงหลังผู้เล่นแตะหน้าจอเท่านั้น)"),
  link("Core"),
  std([atStart], [], [js("window.P2050.Screens.setup(runtimeScene, \"loading\");")]),
  frameJs,
  std([released], [], [releaseJs]),
  ...goEvents(["Menu"]),
], commonVars);

const menuScene = scene("Menu", ["Backdrop", "", "MapUI", "Menu", "MenuScroll", "Modal", "ModalScroll", "Toast"], [...mapObjects(), sprite("MenuShade", [anim("MenuShade", "ui/menu-shade.png")])], [backdrop(), ...mapInstances(), inst("MenuShade", "Menu", 0, 0, {w:900, h:1080, z:-10})], [
  comment("เมนูหลัก: เกมใหม่ · เล่นต่อ · โหลดเกม (ช่องบันทึก + รหัสเซฟ) · ความสำเร็จ · วิธีเล่น — แผนที่โลกลอยอยู่ด้านหลัง"),
  std([atStart], [], [js("if (!window.P2050 || !window.P2050.ready) { runtimeScene.getVariables().get(\"GoTo\").setString(\"Loading\"); return; }\nwindow.P2050.Screens.setup(runtimeScene, \"menu\");")]),
  frameJs,
  group("การควบคุม (คลิก แตะ คีย์บอร์ด)", [
    std([released], [], [releaseJs]),
    std([keyPressed("Escape")], [], [js(guard + "P.Screens.key(\"esc\");")]),
  ]),
  group("แอนิเมชันบนแผนที่", [plumePulse]),
  group("ดนตรีประกอบ", [
    std([numVar("MusicOn", "=", 1), C("MusicStopped", ["", "1"]), once], [A("PlayMusicOnChannel", ["", "music-menu.mp3", "1", "yes", "MusicVol", "1"])]),
  ]),
  group("เปลี่ยนฉาก", goEvents(["Game", "Loading"])),
], commonVars);

const gameScene = scene("Game", ["Backdrop", "", "MapUI", "HUD", "Drawer", "DrawerScroll", "Modal", "ModalScroll", "Toast"], mapObjects(), [backdrop(), ...mapInstances()], [
  comment("ฉากเล่นเกม: 1 tick = 1 เดือนในเกม (ความเร็ว 1× = 4 วินาที, 2× = 2 วินาที) รวม 300 เดือน ม.ค. 2026 → ธ.ค. 2050\nตัวแปรฉาก Running = 1 เมื่อเวลาควรเดิน (ไม่ได้หยุด และไม่มีหน้าต่างตัดสินใจเปิดอยู่)"),
  std([atStart], [A("ResetTimer", ["", "\"tick\""])], [js("if (!window.P2050 || !window.P2050.ready) { runtimeScene.getVariables().get(\"GoTo\").setString(\"Loading\"); return; }\nwindow.P2050.Screens.setup(runtimeScene, \"game\");")]),
  frameJs,
  group("นาฬิกาเกม (เดินทีละเดือน)", [
    std([numVar("Running", "=", 1), C("CompareTimer", ["", "\"tick\"", ">=", "TickSeconds"])], [A("ResetTimer", ["", "\"tick\""])], [js(guard + "P.tick();")]),
    std([numVar("Running", "=", 0)], [A("ResetTimer", ["", "\"tick\""])]),
  ]),
  group("การควบคุม (คลิก แตะ คีย์บอร์ด)", [
    comment("ลำดับการรับคลิก/แตะ: ปุ่มและแผงต่าง ๆ ก่อน → ฟองบนแผนที่ → ภูมิภาคบนแผนที่"),
    std([released], [], [releaseJs]),
    std([released, numVar("UIConsumed", "=", 0), C("SourisSurObjet", ["Bubble", "", "yes", ""])], [setNum("UIConsumed", "=", 1)], [js(guard + "if (objects.length) P.Map.popBubbleObject(objects[0]);", "Bubble")]),
    std([released, numVar("UIConsumed", "=", 0)], [], [js(guard + "P.Map.click();")]),
    std([keyPressed("Space")], [], [js(guard + "P.Screens.key(\"space\");")]),
    std([keyPressed("Escape")], [], [js(guard + "P.Screens.key(\"esc\");")]),
  ]),
  group("แอนิเมชันบนแผนที่", [
    plumePulse,
    forEach("Bubble", [], [A("MettreY", ["Bubble", "=", "Bubble.Variable(BaseY) + sin(TimeFromStart() * 4.5 + Bubble.Variable(Phase)) * 5"])]),
  ]),
  group("ดนตรีประกอบ (สลับ 2 เพลง)", [
    std([numVar("MusicOn", "=", 1), C("MusicStopped", ["", "1"]), once], [setNum("Track", "=", "1 - Track")], [
      std([numVar("Track", "=", 1)], [A("PlayMusicOnChannel", ["", "music-game1.mp3", "1", "no", "MusicVol", "1"])]),
      std([numVar("Track", "=", 0)], [A("PlayMusicOnChannel", ["", "music-game2.mp3", "1", "no", "MusicVol", "1"])]),
    ]),
  ]),
  group("เปลี่ยนฉาก", goEvents(["Menu", "Loading"])),
], [...commonVars, ["Running", "number", 0], ["TickSeconds", "number", 4], ["Track", "number", 0]]);

/* ------------------------------------------------------------------ project */
const project = {
  firstLayout:"Loading",
  gdVersion:{build:269, major:5, minor:6, revision:0},
  properties:{
    adaptGameResolutionAtRuntime:false, antialiasingMode:"MSAA", antialisingEnabledOnMobile:true, folderProject:false, orientation:"landscape",
    packageName:"com.project2050.climategame", pixelsRounding:false, projectUuid:uuid(), scaleMode:"linear", sizeOnStartupMode:"", templateSlug:"", version:"1.0.0",
    name:"Project : 2050", description:"เกมวางแผนกลยุทธ์ นำโลกสู่ Net Zero ก่อนสิ้นปี 2050 (SDG 13) — Garena Academy Game Maker",
    author:"ทีมส่งงานวินาทีสุดท้ายเพราะไส้กรอกในสะดวกซื้อหมดแล้วหมดกำลังใจในการปั่นโปรเจกต์",
    windowWidth:1920, windowHeight:1080, latestCompilationDirectory:"", maxFPS:60, minFPS:20, verticalSync:false, platformSpecificAssets:{},
    loadingScreen:{backgroundColor:0x050b10, backgroundFadeInDuration:0.2, backgroundImageResourceName:"", gdevelopLogoStyle:"light", logoAndProgressFadeInDuration:0.2, logoAndProgressLogoFadeInDelay:0, minDuration:1, progressBarColor:0x8fd0ff, progressBarHeight:12, progressBarMaxWidth:300, progressBarMinWidth:40, progressBarWidthPercent:30, showGDevelopSplash:true, showProgressBar:true},
    watermark:{placement:"bottom-left", showWatermark:true},
    authorIds:[], authorUsernames:[], categories:["strategy", "simulation", "educational"], playableDevices:["keyboard", "mobile"], extensionProperties:[],
    platforms:[{name:"GDevelop JS platform"}], currentPlatform:"GDevelop JS platform",
  },
  resources:{resources},
  objects:globalObjects,
  objectsFolderStructure:{folderName:"__ROOT"},
  objectsGroups:[],
  variables:vars([["MusicOn", "number", 1], ["MusicVol", "number", 24]]),
  layouts:[loadingScene, menuScene, gameScene],
  externalEvents:[{associatedLayout:"Loading", lastChangeTimeStamp:0, name:"Core", events:coreEvents}],
  eventsFunctionsExtensions:[],
  externalLayouts:[],
};

/* ------------------------------------------------------------------ write, normalise through GDevelop's own serializer, export */
const raw = `${OUT}/game.raw.json`;
fs.writeFileSync(raw, JSON.stringify(project));
const ser = gd.Serializer.fromJSObject(project);
const p = gd.ProjectHelper.createNewGDJSProject();
p.unserializeFrom(ser);
p.setProjectFile(`${OUT}/game.json`);
// sanity: count what GDevelop understood
console.log("layouts:", p.getLayoutsCount(), "resources:", p.getResourcesManager().getAllResourceNames().size(), "global objects:", p.getObjects().getObjectsCount(), "external events:", p.getExternalEventsCount());
for (let i = 0; i < p.getLayoutsCount(); i++){ const l = p.getLayoutAt(i); console.log(" scene", l.getName(), "objects", l.getObjects().getObjectsCount(), "instances", l.getInitialInstances().getInstancesCount(), "events", l.getEvents().getEventsCount(), "layers", l.getLayersCount()); }
fs.writeFileSync(`${OUT}/game.json`, "{}");
await saveProject(p, `${OUT}/game.json`);
fs.unlinkSync(raw);
console.log("saved game.json", fs.statSync(`${OUT}/game.json`).size);
if (process.argv.includes("--export")){
  const loaded = await loadProject(`${OUT}/game.json`);
  const dir = `${ROOT}/export`; fs.rmSync(dir, {recursive:true, force:true}); fs.mkdirSync(dir, {recursive:true});
  exportProject(loaded, dir);
  console.log("exported to", dir, fs.readdirSync(dir).length, "files");
}

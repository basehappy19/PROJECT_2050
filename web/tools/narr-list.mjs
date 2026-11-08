/* 2.3 · the narration lines that get a recorded voice (story scenes + how-to pages), one voice per speaker.
   node web/tools/narr-list.mjs            → prints the list (key, file name, speaker, voice, text) as JSON
   node web/tools/narr-list.mjs --files    → writes web/src/narr-files.js for the mp3 files that exist in assets/audio/narr
   File names: <lang>-<speaker>-<key>.mp3 · key = FNV-1a of "lang|speaker|clean text" (narrKey in web/src/narrator.js).
   Lines with numbers filled in during play ({x}) and lines made by functions are not recorded: the device voice reads those. */
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), WEB = path.resolve(HERE, ".."), REPO = path.resolve(WEB, "..");
const dir = path.join(WEB, "src/engine"), files = fs.readdirSync(dir).filter(f => /^\d/.test(f) && f !== "39-mp.js").sort();
Object.assign(globalThis, {window:globalThis, location:{host:"x"}, localStorage:{getItem(){ return null; }, setItem(){}}, document:{addEventListener(){}}});
vm.runInThisContext(files.map(f => "(function(){" + fs.readFileSync(path.join(dir, f), "utf8") + "\n})();").join("\n"));
const P = globalThis.P2050, S = P.S;
const clean = s => String(s || "").replace(/\[\[[^\]]*\]\]/g, " ").replace(/[•·▲▼★]/g, " ").replace(/\s+/g, " ").trim();
const key = (lang, who, text) => { let h = 0x811c9dc5; const s = `${lang}|${who || ""}|${clean(text)}`; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
/* ElevenLabs voices (eleven_v4) per speaker */
export const VOICES = {
  th:{adv:"8NwLQzLG93MiNxGxKyvC", fon:"7XW5JhaNn90bnFojQ5DA", dip:"MYZYcGOqrkYQcwDunXl7", eco:"MYZYcGOqrkYQcwDunXl7", oce:"MYZYcGOqrkYQcwDunXl7", sci:"MkPcayJBS159p48OGSAT", eng:"wwlSjZ6z5ZVMXPlwGV6Q", act:"ezkLs9Yt73bdKnjZ9EBR", opp:"jucSqawHKM1rUNf78oZQ", lung:"xYmBpJREC3WfqEFpbPvO"},
  en:{adv:"1FmDfZG0Nx2dCk793S1a", fon:"ijbjxuucMt4vnA0kA9IO", dip:"BcIZ7kngidiArTkRyUAp", eco:"0ggs85h7hrWz8ExXnsBc", oce:"IJxm2BPzAbIAYPy6kY6Q", sci:"GoV1V2hQd1doxcYR2SuA", eng:"zD5RRa1ndly0YgnhdKgR", act:"HdyLvJaQ6mJsXjr6mdX4", opp:"t1yzxMpe9zK42bXmI1T2", lung:"KYpkPJwl1dpLc9QpMwnO"},
};
const items = new Map();
const add = (lang, who, text) => { text = clean(text); if (!text || /\{\w\}/.test(text)) return; const k = key(lang, who, text); if (!items.has(k)) items.set(k, {key:k, file:`${lang}-${who}-${k}`, lang, who, voice:VOICES[lang][who], text}); };
for (const st of P.STORY) st.panels.forEach(p => {
  if (typeof p.say === "function" || typeof p.who === "function") return;
  for (const ch of Object.keys(P.CHAR)){ S.char = ch; const s = P.panelSay(p), w = p.who === "me" ? ch : (p.who || "adv"); for (const l of ["th", "en"]) if (s[l]) add(l, w, s[l]); }
});
for (const st of P.TUT) for (const l of ["th", "en"]) add(l, "adv", `${st.title[l]}. ${st.body[l].join(" ")}`);
add("th", "adv", "เปิดเสียงพากย์แล้ว"); add("en", "adv", "Narration is on");
const list = [...items.values()];
if (process.argv.includes("--files")){
  const have = new Set(fs.existsSync(path.join(REPO, "assets/audio/narr")) ? fs.readdirSync(path.join(REPO, "assets/audio/narr")) : []);
  const map = Object.fromEntries(list.filter(x => have.has(x.file + ".mp3")).map(x => [x.key, x.file]));
  fs.writeFileSync(path.join(WEB, "src/narr-files.js"), "/* recorded narration lines (assets/audio/narr): key = narrKey(lang, speaker, text) → file name. Made by web/tools/narr-list.mjs --files. */\r\nexport const NARR_FILES = " + JSON.stringify(map, null, 1).replace(/\n/g, "\r\n") + ";\r\n");
  console.log(`narr-files.js: ${Object.keys(map).length} of ${list.length} lines recorded`);
} else console.log(JSON.stringify(list, null, 1));

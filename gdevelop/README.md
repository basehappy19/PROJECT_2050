# Project Zero — เวอร์ชัน GDevelop (กำลังพอร์ตเป็น 3.x)

เกมทั้งหมดอยู่ในโปรเจกต์ GDevelop 5 นี้ (สร้างจาก GDevelop 5.6.269 ควรเปิดด้วยเวอร์ชันนี้หรือใหม่กว่า) เวอร์ชันเว็บอยู่ใน `../web/`

**กติกาเกมและข้อมูลใช้ไฟล์ชุดเดียวกับเว็บ** คือ `../web/src/engine/1x–3x-*.js` (ยกเว้น `39-mp.js` โหมดหลายคนที่ปิดไว้) ตอน build จะดึงไฟล์เหล่านี้เข้า `game.json` เอง แก้กติกาที่เดียวได้ทั้งสองเวอร์ชัน ส่วนหน้าจอของ GDevelop อยู่ใน `_source/src/5x–6x-*.js`

### สถานะการพอร์ต
| ช่วง | เนื้อหา | สถานะ |
|---|---|---|
| 1 | ใช้กติกาเกมชุดเดียวกับเว็บ, ไอคอน 3D, เส้นเขตแดนประเทศใหม่ (160+ ประเทศ) | เสร็จ |
| 2 | แผนที่ 3D เงยได้ + เครื่องบิน/เรือ 3D | เสร็จ |
| 3 | HUD 3.3, หน้าประเทศ/ทวีปแบบ C, ตลาดทรัพยากร (แบบ A), ความนิยม (แบบ B), สรุปรายปี, ค่าแร่ของสกิล | เสร็จ |
| 4 | เมนู, โหมดฝึก, โหมดเร็ว, บัญชี, ร้านค้า, ความสำเร็จ, ตั้งค่า | ยังไม่ทำ |
| 5 | เสียง, มือถือ, ความเร็ว, ทดสอบเทียบกับเว็บ | ยังไม่ทำ |

หน้าต่าง 3.3 (ตลาด ความนิยม สรุปรายปี) อยู่ใน `_source/src/67-windows.js`; สกิลใช้ทรัพยากรแบบเว็บแล้ว (`P.GD_MINERALS = true` ใน `60-screens.js`)

## แผนที่ 3D (ช่วง 2)
- layer หลัก (`""`) ของฉาก Menu/Game เป็น layer 3D; กล้องเงยขึ้นเมื่อซูม (สูงสุด 38° ที่ซูม 2.6) แบบเว็บ
- ชิ้นแผนที่ยังเป็น sprite ของ GDevelop (สี ขนาด การซ่อนทำงานเหมือนเดิม) แต่ถูกซ่อน และ `52-map.js` สร้างระนาบ three.js เลียนแบบทีละชิ้น (`Mirror`) เส้นเขตแดนและประเทศที่เลือกเป็นเส้น/mesh ของ three.js
- `Map.toScreen` / `toWorldFromScreen` ฉายผ่านกล้อง 3D จริง ป้ายชื่อและไอคอนบน layer UI จึงตั้งตรงเสมอ
- ซูมด้วยล้อเมาส์แบบนุ่ม ซูมออกสุดแล้วกลับกลางเสมอ (ล้อ ปุ่ม ถ่างนิ้ว ลาก)
- `53-traffic.js` เครื่องบินและเรือเป็นโมเดล 3D (สร้างด้วยโค้ด) บนเส้นทางจริงจากกติกาเกม มีเงา ควัน และเส้นทางอ้อมแอฟริกาเมื่อคลองปิด
- object `Anchor3D` (ลูกบาศก์ 3D ที่ไม่แสดง) มีไว้ให้ GDevelop ใส่ three.js ตอน export

## ไฟล์ APK (Android)
```bash
cd gdevelop/_source/build && node make-project.mjs --export
bash ../apk/build-apk.sh 2.0.0        # ได้ gdevelop/ProjectZero-2.0.0.apk
```
ไม่ต้องใช้ Android Studio: แอปเป็น WebView เต็มจอ (`_source/apk/java/`) ที่เปิดเกมจาก assets ผ่าน https://appassets.androidplatform.net/ ใช้ Java 17+, curl, zip, python3 (Pillow) สคริปต์ดาวน์โหลด apktool, dx และ uber-apk-signer ให้ครั้งแรก
- ค่าเริ่มต้นเซ็นด้วย debug key; ถ้าจะลง Play Store ให้ตั้ง `P2050_KEYSTORE` (และ `P2050_KS_ALIAS`) เป็น keystore จริง
- server: ตั้ง `P2050_API` ได้ (ค่าเริ่มต้น https://project-zero.basehappy19.site/api) และ server ต้องยอมรับ origin `https://appassets.androidplatform.net`

## วิธีเปิด
1. เปิด GDevelop → **Open a project** → เลือก `game.json` ในโฟลเดอร์นี้
2. กด **Preview** (▶) เกมจะเริ่มที่ฉาก `Loading` แล้วแตะหนึ่งครั้งเพื่อเข้าเมนู
3. ถ้าจะใช้บัญชีผู้เล่นตอน Preview ให้เปิด server ไว้ (`../server`) เกมจะลองต่อ `http://localhost:8080/api` ให้เอง

## แก้เกมตรงไหน
โค้ดอยู่ใน External events ชื่อ **Core** (บล็อก JavaScript 18 บล็อก) และมีสำเนาเป็นไฟล์อยู่ใน `_source/src/`

| ไฟล์ / บล็อก | เนื้อหา |
|---|---|
| `../web/src/engine/*` | กติกาเกมและข้อมูลทั้งหมด (ใช้ร่วมกับเว็บ) |
| `50-ui-kit.js` | สี (`COL`), ฟอนต์, ตัววาด UI, ไอคอน (`[[ชื่อ]]` = ไอคอนเส้น, `[[$ชื่อ]]` = ไอคอน 3D จาก `assets/icons3d`) |
| `51-audio.js` | เสียงเอฟเฟกต์และเสียงบรรยากาศ |
| `52-map.js` | แผนที่ 2D, ซูม/เลื่อน/ถ่างนิ้ว, เส้นเขตแดนประเทศ, การแตะเลือก |
| `60`–`66-*.js` | หน้าจอ: HUD, แผงประเทศ, หน้าต่างอีเวนต์, ฉากจบ, เลือกตัวละคร, เมนู, หน้าสกิล, หน้าเรียนรู้ |

**ตัวเลขที่ปรับสมดุลบ่อย** อยู่ในไฟล์กติกาของเว็บ (`../web/src/engine/`): ราคาสกิล `13-data-skills.js` · ภัย `20-engine.js` และ `HAZARDS` ใน `14-data-world.js` · งบเริ่มต้น `MODES` ใน `20-engine.js`

ถ้าแก้ใน GDevelop โดยตรง `game.json` จะเป็นฉบับล่าสุด แต่ถ้าสั่ง build ใหม่จาก `_source` โค้ดใน `game.json` จะถูกเขียนทับด้วยไฟล์ใน `_source/src` ควรเลือกแก้ที่เดียว (แนะนำให้แก้ที่ `_source/src`)

## สร้าง game.json ใหม่
ต้องมี Node.js 20 ขึ้นไป

```bash
cd gdevelop/_source/build
npm install
node make-project.mjs --export     # เขียน ../../game.json และ export HTML5 ไว้ทดสอบที่ build/export/
```

- `node gdqa.mjs` เปิดเกมที่ export แล้วในเบราว์เซอร์ เล่นให้อัตโนมัติ ถ่ายภาพหน้าจอ และบอก error (`STEPS=game,full` เล่นจนจบเกม)
- `node gen-assets.mjs --icons-geo` สร้างเฉพาะไอคอนและเส้นเขตแดนประเทศใหม่ (ไม่แตะรูปตัวละคร/ฉากจบ)
- `node gen-assets.mjs` สร้างไอคอน, รูปตัวละคร, ภาพฉากจบ, โลโก้ และเส้นเขตแดนประเทศ (`assetgen/countrygeo.json`) ใหม่ ใช้เมื่อเพิ่มไอคอน Lucide ใหม่ในโค้ดหรือแก้ภาพ
- `node tutshots.mjs` ถ่ายภาพหน้าคู่มือใหม่จากเกมจริง แล้วสั่ง build อีกครั้ง
- เวอร์ชันเว็บ build ด้วย `cd ../../web && npm install && node build.mjs` (ดู `../web/README.md`)

## โครงสร้างโปรเจกต์
| ส่วน | อยู่ที่ไหน |
|---|---|
| ฉาก | `Loading`, `Menu`, `Game` ความละเอียด 1920×1080 (UI ออกแบบที่ 1280×720 แล้วขยาย ×1.5) |
| แผนที่ | ออบเจกต์ `Ocean`, `MapRim`, `ArcticIce`, `Region` ×6, `RegionLine`, `Plume`, `Bubble` และเส้นเขตแดนวาดด้วย `UIPainter` |
| UI | `UIPainter`, `UIText`, `UIIcon` (ไอคอน Lucide), `Portrait` (รูปตัวละคร), `EndArt` (ภาพฉากจบ), `Logo`, `TutImage`, `CodeInput` (ช่องกรอกข้อความ) |
| ทรัพยากร | `assets/` = map, ui, icons, portraits, endings, tutorial, fonts (Kanit, IBM Plex Sans Thai, IBM Plex Mono, Chakra Petch · OFL), audio |

## คีย์ลัด (PC)
T สกิล · R ภูมิภาค · S สถิติ · N ข่าว · Space หยุด/เล่น · 1 2 3 ความเร็ว · H ดูทั้งโลก · + − ซูม · Esc ปิดหน้าต่าง · ในหน้าต่างอีเวนต์กด 1 2 3 เพื่อเลือก

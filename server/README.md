# PROJECT : 2050 · Game server

Server ของเกม ทำหน้าที่เก็บบัญชีผู้เล่น, Terra, ร้านค้า, ตารางอันดับ, เซฟบนคลาวด์ และเกียรติบัตร รันด้วย Docker Compose มี 3 container

| container | หน้าที่ |
|---|---|
| `db` | PostgreSQL 16 เก็บข้อมูลไว้ใน volume `pgdata` (ลบ container แล้วข้อมูลยังอยู่) |
| `api` | Node.js + Fastify (โค้ดอยู่ใน `api/`) สร้างตารางฐานข้อมูลให้เองตอนเริ่มทำงาน |
| `web` | Nginx เสิร์ฟเกมเวอร์ชันเว็บ (`../index.html` + `../assets/`) และส่งต่อ `/api` กับ `/verify` ไปที่ api |

## เริ่มใช้งาน (เครื่องที่ลง Docker Desktop แล้ว)

```bash
cd server
cp .env.example .env          # Windows: copy .env.example .env
# แก้ .env: POSTGRES_PASSWORD และ JWT_SECRET (ใช้ตัวอักษรกับตัวเลข ยาว ๆ)
docker compose up -d --build
```

เปิด http://localhost:8080 เกมจะต่อ server ให้เองอัตโนมัติ มุมขวาบนของเมนูจะมีปุ่ม "เข้าสู่ระบบ" แทนคำว่า "ออฟไลน์"

- ดูสถานะ: `docker compose ps`
- ดู log ของ API: `docker compose logs -f api`
- หยุด server: `docker compose down` (ข้อมูลยังอยู่) · ถ้าจะลบข้อมูลทั้งหมด: `docker compose down -v`
- อัปเดตเกม: build เวอร์ชันเว็บใหม่ (`cd web && node build.mjs` ดู `../web/README.md`) แล้วรีเฟรชหน้าเว็บ ไม่ต้องรีสตาร์ต server เพราะ Nginx อ่านไฟล์จากโฟลเดอร์โปรเจกต์ตรง ๆ
- อัปเดตโค้ด API: `docker compose up -d --build api`

## Google Sign-In

1. เข้า Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → ประเภท **Web application**
2. ที่ **Authorized JavaScript origins** ใส่ที่อยู่ที่เปิดเกม เช่น `http://localhost:8080` และโดเมนจริง (ต้องเป็น https ยกเว้น localhost)
3. คัดลอก Client ID ไปใส่ใน `.env` ที่ `GOOGLE_CLIENT_ID=...` แล้วสั่ง `docker compose up -d api`

ถ้าช่องนี้ว่าง ปุ่ม Google ในเกมจะซ่อนไว้ ส่วนระบบอื่นใช้ได้ปกติ

## งานผู้ดูแล

| งาน | คำสั่ง (รันในโฟลเดอร์ `server`) |
|---|---|
| ตั้งรหัสผ่านใหม่ให้ผู้เล่น (เกมไม่มีระบบรีเซ็ตเอง) | `docker compose exec api node scripts/reset-password.js <username หรือ email> <รหัสใหม่>` |
| เพิ่ม Terra เช่น ให้เป็นรางวัล (ใส่ค่าติดลบเพื่อหัก) | `docker compose exec api node scripts/give-terra.js <username> 100 "รางวัลแข่งขัน"` |
| สำรองฐานข้อมูล (Linux/macOS) | `sh scripts/backup.sh` → ได้ไฟล์ใน `backups/` |
| สำรองฐานข้อมูล (Windows PowerShell) | `.\scripts\backup.ps1` |
| เปิดฐานข้อมูลดูเอง | `docker compose exec db psql -U p2050 p2050` |

## เกียรติบัตร

ตั้งค่าหน่วยงาน partner และลายเซ็นได้ใน `certificate/certificate.json` โดยไม่ต้องแก้โค้ด (ดู `certificate/README.md`)

- ผู้เล่นจะขอเกียรติบัตรได้เมื่อชนะแบบ Net Zero อย่างน้อย 1 ครั้ง และปลดล็อกการ์ดความรู้ครบตามจำนวนที่ตั้งไว้ใน `CERT_MIN_CARDS` (ค่าเริ่มต้น 20)
- ผู้เล่นกรอกชื่อจริงตอนกดขอเกียรติบัตร ระบบสร้าง PDF ที่มีรหัสตรวจสอบ
- ใครก็ตรวจสอบเกียรติบัตรได้ที่ `/verify/<รหัส>` ตั้ง `PUBLIC_URL` ใน `.env` เพื่อให้ลิงก์ใน PDF เป็นโดเมนจริง

## Terra และการกันเงินเฟ้อ

ทุกยอดรับและจ่ายบันทึกไว้ในตาราง `wallet_ledger` ยอดคงเหลือคือผลรวมของตารางนี้ ตรวจย้อนหลังได้ว่าได้มาจากไหน

- Terra ออกให้เฉพาะตอนจบเกม คำนวณบน server จากผลที่เกมส่งมา และ server ตรวจว่าผลนั้นเป็นไปได้จริง
  - ชนะแบบ Net Zero 30 · หมดเวลา 12 · ถูกถอดถอน 6 · โลกร้อนเกิน 4 และมีโบนัสผลงานอีก 0–15
  - Hard Core คูณ 1.5 · เพดานต่อเกม 45 (Hard Core 67)
- เกมที่สั้นกว่า 5 นาที (`MIN_GAME_SECONDS`) ไม่ได้ Terra
- ใน 1 วัน (เวลาไทย) เกมที่ 1–3 ได้เต็ม, เกมที่ 4–6 ได้ครึ่งเดียว, ตั้งแต่เกมที่ 7 ได้ 10%
- ผลที่เป็นไปไม่ได้ เช่น เล่นเร็วกว่าความเร็วสูงสุด หรือประกาศว่าชนะทั้งที่ CO₂ ยังไม่ถึง 0 จะถูกติดธง ไม่ได้ Terra และไม่ขึ้นตารางอันดับ
- ความสำเร็จแต่ละอันจ่าย Terra ได้ครั้งเดียว (5 / 10 / 20)
- ราคาสินค้าและกติกาทั้งหมดอยู่ใน `api/src/game-rules.js` ถ้าแก้ราคา ให้แก้ `gdevelop/_source/src/14-data-world.js` ให้ตรงกันด้วย

## วางเกมไว้ที่อื่น (เช่น GitHub Pages) แต่ใช้ server นี้

1. build เกมพร้อมบอกที่อยู่ server: `cd web && P2050_API=https://<โดเมน server>/api node build.mjs`
2. ใน `.env` ตั้ง `CORS_ORIGIN=https://basehappy19.github.io`
3. server ต้องเปิดผ่าน https ไม่อย่างนั้นเบราว์เซอร์จะบล็อก (ใช้ reverse proxy ที่มี SSL เช่น Caddy หรือ Cloudflare Tunnel วางหน้า port 8080)

## ทดสอบ API

ต้องมี PostgreSQL ที่ลบข้อมูลทิ้งได้ (จะล้าง schema ทั้งหมด)

```bash
cd api && npm install
TEST_DATABASE_URL=postgres://p2050:p2050@localhost:5432/p2050_test npm test
```

## API (สรุป)

| method | path | หมายเหตุ |
|---|---|---|
| GET | `/api/config` | สถานะ server, Google Client ID, ราคา |
| POST | `/api/auth/register` `/auth/login` `/auth/google` `/auth/google/complete` `/auth/refresh` `/auth/logout` | access token อายุ 15 นาที, refresh token อายุ 60 วัน (ใช้ได้ครั้งเดียว) |
| GET | `/api/me` · POST `/api/me/display-name` | เปลี่ยน displayName ครั้งแรกฟรี ครั้งต่อไป 49 Terra |
| POST | `/api/shop/buy` | `{item}` |
| POST | `/api/runs` · `/api/runs/:id/finish` | เริ่มเกม / ส่งผลเพื่อรับ Terra และ XP |
| GET | `/api/leaderboard?mode=normal\|hard\|daily&period=week\|all` | คะแนนสูงสุดของแต่ละคน 50 อันดับ |
| POST | `/api/achievements` · PUT `/api/progress` | |
| GET/PUT | `/api/saves/:slot` | เซฟบนคลาวด์ s1–s3 |
| GET/POST | `/api/certificates` · GET `/api/certificates/:code/pdf` · GET `/verify/:code` | |

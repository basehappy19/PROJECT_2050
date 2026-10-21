# ติดตั้งบน VPS แบบไม่ใช้ Docker

ใช้ได้กับ Ubuntu 24.04 / Debian 12 · ทุกคำสั่งรันในฐานะผู้ใช้ที่ sudo ได้ · ตัวอย่างใช้โฟลเดอร์ `/opt/project2050` และโดเมน `p2050.example.ac.th`

## Tech stack

| ส่วน | ใช้อะไร | หมายเหตุ |
|---|---|---|
| ตัวเกม (หน้าเว็บ) | HTML + JS + CSS ที่ build แล้ว (Preact, three.js, canvas; build ด้วย esbuild) | เป็นไฟล์ static ล้วน ไม่ต้องมี Node ตอนเสิร์ฟ |
| Web server | Nginx | เสิร์ฟเกม, หน้า `/admin`, ส่งต่อ `/api` และ `/verify` ไปที่ API |
| API | Node.js 22 LTS + Fastify | บัญชี เพชร ร้านค้า อันดับ เซฟคลาวด์ เกียรติบัตร (PDF ด้วย pdfkit) |
| ฐานข้อมูล | PostgreSQL 16 | |
| จัดการฐานข้อมูล | Prisma 7 (Prisma Migrate + Prisma Studio) | schema อยู่ที่ `api/prisma/schema.prisma` |
| รัน API ค้างไว้ | systemd (`vps/p2050-api.service`) | รีสตาร์ตเองถ้าล่ม |
| HTTPS | Certbot (Let's Encrypt) หรือ Cloudflare | ต้องเป็น https ถึงจะใช้ Google Sign-In และติดตั้งเป็นแอปได้ |
| build เกม (ทำครั้งเดียวต่อการอัปเดต) | Node.js 22 + npm | `web/build.mjs` |

## 1. ติดตั้งโปรแกรม

```bash
sudo apt update && sudo apt install -y nginx postgresql git curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v      # ต้องได้ v22.x
```

## 2. ฐานข้อมูล

```bash
sudo -u postgres psql -c "CREATE USER p2050 WITH PASSWORD 'ตั้งรหัสยาว ๆ ตัวอักษรกับตัวเลข';"
sudo -u postgres psql -c "CREATE DATABASE p2050 OWNER p2050;"
```

PostgreSQL ฟังแค่ localhost อยู่แล้ว ไม่ต้องเปิดพอร์ต 5432 ออกเน็ต

## 3. โค้ดและผู้ใช้สำหรับรัน API

```bash
sudo useradd --system --home /opt/project2050 --shell /usr/sbin/nologin p2050
sudo git clone <repo ของคุณ> /opt/project2050      # หรือก็อปโฟลเดอร์ PROJECT_2050 ขึ้นไป
sudo chown -R $USER:p2050 /opt/project2050
cd /opt/project2050/server/api && npm ci --omit=dev
```

## 4. ตั้งค่า

```bash
cd /opt/project2050/server
cp .env.example .env && chmod 640 .env
openssl rand -hex 32      # เอาไปใส่ JWT_SECRET
nano .env
```

ค่าที่ต้องมีใน `.env`:

```
DATABASE_URL=postgres://p2050:<รหัสจากข้อ 2>@localhost:5432/p2050
JWT_SECRET=<ผลจาก openssl>
CORS_ORIGIN=https://p2050.example.ac.th
PUBLIC_URL=https://p2050.example.ac.th
```

(`POSTGRES_*` และ `WEB_PORT` ใช้เฉพาะ Docker ไม่ต้องสนใจ)

## 5. ตารางในฐานข้อมูล (Prisma)

```bash
cd /opt/project2050/server/api
set -a; . ../.env; set +a
npx prisma migrate deploy      # สร้าง/อัปเดตตารางทั้งหมด
npx prisma migrate status      # ต้องขึ้นว่า up to date
```

API รัน `prisma migrate deploy` ให้เองทุกครั้งที่เริ่ม ข้อนี้จึงเป็นแค่การเช็กก่อน ถ้าย้ายฐานข้อมูลเดิมจากเวอร์ชัน Docker มา API จะรับตารางเดิมเข้าระบบ Prisma ให้เอง ไม่สร้างซ้ำ

## 6. รัน API ด้วย systemd

```bash
sudo cp /opt/project2050/server/vps/p2050-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now p2050-api
journalctl -u p2050-api -n 30      # ต้องเห็น "Server listening at http://127.0.0.1:3000"
curl -s http://127.0.0.1:3000/api/health
```

## 7. ตัวเกมและ Nginx

ล็อกให้เกมรันได้แค่โดเมนนี้ (build บน VPS เลย):

```bash
cd /opt/project2050/web && npm ci
P2050_DOMAINS=p2050.example.ac.th node build.mjs
```

```bash
sudo cp /opt/project2050/server/vps/nginx-p2050.conf /etc/nginx/sites-available/p2050
sudo nano /etc/nginx/sites-available/p2050          # แก้ server_name เป็นโดเมนจริง
sudo ln -s /etc/nginx/sites-available/p2050 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

ไฟล์ตั้งค่านี้เปิดให้เข้าได้เฉพาะไฟล์เกม ส่วนอื่นในโฟลเดอร์ (โค้ด, `server/.env`) จะได้ 404

## 8. HTTPS และไฟร์วอลล์

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d p2050.example.ac.th
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

ถ้าใช้ Cloudflare Tunnel แทน ไม่ต้องใช้ certbot ให้ชี้ tunnel ไปที่ `http://localhost:80`

## 9. ผู้ดูแล

สมัครบัญชีในเกมก่อน แล้ว:

```bash
cd /opt/project2050/server/api && set -a; . ../.env; set +a
node scripts/make-admin.js <username>
```

เข้า `https://p2050.example.ac.th/admin/`

## Prisma Studio: ดูและแก้ข้อมูลในฐานข้อมูลผ่านหน้าเว็บ

บน VPS:

```bash
cd /opt/project2050/server/api && set -a; . ../.env; set +a
npm run db:studio                 # เปิดที่พอร์ต 5555 บนเครื่อง VPS เท่านั้น
```

บนคอมของคุณ เปิดอุโมงค์ SSH แล้วเข้า http://localhost:5555

```bash
ssh -L 5555:localhost:5555 <user>@<vps>
```

อย่าเปิดพอร์ต 5555 ออกอินเทอร์เน็ต เพราะ Studio แก้ข้อมูลได้ทุกตารางโดยไม่ต้องล็อกอิน · ถ้าจะแจกเพชรหรือให้ของ ให้ใช้หน้า `/admin` แทน เพราะมีบันทึกว่าใครแก้อะไร

## เปลี่ยนโครงสร้างฐานข้อมูล (ฝั่งพัฒนา)

1. แก้ `api/prisma/schema.prisma`
2. ใช้ฐานข้อมูลทดลอง (ไม่ใช่ตัวจริง): `npm run db:new -- add-something` → ได้โฟลเดอร์ใหม่ใน `prisma/migrations/`
3. ตรวจไฟล์ SQL ที่ได้ แล้ว commit
4. บน VPS: `git pull` แล้ว `sudo systemctl restart p2050-api` (API รัน migration ใหม่ให้เอง)

API ยังคุยกับฐานข้อมูลด้วย SQL ตรง ๆ (`pg`) ทุกคำสั่งผ่านการทดสอบแล้ว Prisma ใช้จัดการ schema, migration และ Studio

## อัปเดตเวอร์ชัน

```bash
cd /opt/project2050 && git pull
cd server/api && npm ci --omit=dev && sudo systemctl restart p2050-api
cd ../../web && npm ci && P2050_DOMAINS=p2050.example.ac.th node build.mjs
```

## สำรองฐานข้อมูลทุกคืน

```bash
sudo mkdir -p /var/backups/p2050 && sudo chown postgres /var/backups/p2050
sudo crontab -u postgres -e
# เพิ่มบรรทัดนี้: เก็บไว้ 14 วัน
0 3 * * * pg_dump -Fc p2050 > /var/backups/p2050/p2050-$(date +\%F).dump && find /var/backups/p2050 -mtime +14 -delete
```

กู้คืน: `pg_restore -d p2050 --clean /var/backups/p2050/p2050-YYYY-MM-DD.dump`

# ติดตั้งบน VPS แบบไม่ใช้ Docker

ใช้ได้กับ Ubuntu 24.04 / Debian 12 · ตัวอย่างใช้โฟลเดอร์ `/opt/project2050` และโดเมน `game.example.ac.th`

ทุกอย่างรันจากโฟลเดอร์บนสุดของโปรเจกต์ด้วย 3 คำสั่ง:

```bash
npm run setup     # ติดตั้ง package ของเกมและ API
npm run build     # build ตัวเกม
npm start         # เปิดทุก service: เกม + หน้า admin + API (ตั้งพอร์ตใน .env)
```

## Tech stack

| ส่วน | ใช้อะไร |
|---|---|
| ตัวเกม | ไฟล์ static ที่ build แล้ว (Preact, three.js, canvas; build ด้วย esbuild) |
| เสิร์ฟเกมและหน้า admin | Node.js (`scripts/start.mjs`) ส่งต่อ `/api` และ `/verify` ไปที่ API ให้ด้วย |
| API | Node.js 22 + Fastify |
| ฐานข้อมูล | PostgreSQL 16 จัดการด้วย Prisma 7 (Migrate + Studio) |
| รันค้างไว้ | systemd (`server/vps/project-zero.service`) |
| โดเมนและ HTTPS | Nginx ของคุณเอง (`server/vps/nginx-proxy.conf`) + Certbot |

## พอร์ต (ตั้งใน `.env`)

| ตัวแปร | ค่าเริ่มต้น | คืออะไร |
|---|---|---|
| `WEB_PORT` | 8080 | เกม + `/admin/` + ส่งต่อ `/api` `/verify` → reverse proxy มาที่พอร์ตนี้พอร์ตเดียวก็พอ |
| `API_PORT` | 3000 | API ตรง ๆ (จะให้ Nginx ส่ง `/api` มาที่นี่เองก็ได้) |
| `ADMIN_PORT` | (ว่าง) | ถ้าใส่ หน้า admin จะเปิดที่พอร์ตนี้แยกอีกทาง |
| `STUDIO_PORT` | 5555 | Prisma Studio (`npm run studio`) ฟังแค่ 127.0.0.1 เสมอ |
| `HOST` | 127.0.0.1 | ฟังแค่ในเครื่อง (ให้ Nginx เป็นทางเข้าเดียว) · `0.0.0.0` = เปิดทุกวง |

## ขั้นตอน

**1. ติดตั้งโปรแกรม**

```bash
sudo apt update && sudo apt install -y nginx postgresql git curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**2. ฐานข้อมูล**

```bash
DBPASS=$(openssl rand -hex 16); echo $DBPASS
sudo -u postgres psql -c "CREATE USER p2050 WITH PASSWORD '$DBPASS';"
sudo -u postgres psql -c "CREATE DATABASE p2050 OWNER p2050;"
```

**3. โค้ด**

```bash
sudo useradd --system --home /opt/project2050 --shell /usr/sbin/nologin p2050
sudo git clone https://github.com/<user>/<repo>.git /opt/project2050
sudo chown -R $USER:p2050 /opt/project2050
cd /opt/project2050 && npm run setup
```

**4. ตั้งค่า**

```bash
cp .env.example .env && chmod 640 .env && sudo chgrp p2050 .env
nano .env
```

อย่างน้อยต้องใส่:

```
PUBLIC_URL=https://game.example.ac.th
GAME_DOMAINS=game.example.ac.th
DATABASE_URL=postgres://p2050:<DBPASS>@localhost:5432/p2050
JWT_SECRET=<ผลจาก openssl rand -hex 32>
```

**5. build และลองรัน**

```bash
npm run build
npm start          # ตารางในฐานข้อมูลถูกสร้างเองตอนเริ่ม · กด Ctrl+C เพื่อหยุด
curl -s http://127.0.0.1:8080/api/health      # (อีกหน้าต่าง) ต้องได้ {"ok":true}
```

**6. รันค้างไว้ด้วย systemd**

```bash
sudo cp server/vps/project-zero.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now project-zero
journalctl -u project-zero -f
```

**7. Nginx + HTTPS**

```bash
sudo cp server/vps/nginx-proxy.conf /etc/nginx/sites-available/project-zero
sudo nano /etc/nginx/sites-available/project-zero      # แก้ server_name และพอร์ตให้ตรง WEB_PORT
sudo ln -s /etc/nginx/sites-available/project-zero /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d game.example.ac.th --redirect
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
```

**8. ผู้ดูแล** · สมัครบัญชีในเกมก่อน แล้ว `npm run make-admin -- <username>` · เข้า `https://game.example.ac.th/admin/`

## คำสั่งอื่น

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run migrate` | อัปเดตตารางฐานข้อมูล (ปกติ `npm start` ทำให้เอง) |
| `npm run db:status` | ดูว่าฐานข้อมูลตรงกับ schema ไหม |
| `npm run studio` | Prisma Studio ดู/แก้ข้อมูลผ่านเว็บ ที่ 127.0.0.1:STUDIO_PORT · จากคอมตัวเอง: `ssh -L 5555:localhost:5555 <user>@<vps>` แล้วเปิด http://localhost:5555 |
| `npm run make-admin -- <username>` | ตั้งผู้ดูแล |

อย่าเปิด Prisma Studio ออกอินเทอร์เน็ต เพราะแก้ได้ทุกตารางโดยไม่ต้องล็อกอิน ถ้าจะให้ของหรือเพชร ให้ใช้หน้า `/admin` ซึ่งมีบันทึกว่าใครแก้อะไร

## อัปเดตเวอร์ชัน

```bash
cd /opt/project2050 && git pull && npm run setup && npm run build && sudo systemctl restart project-zero
```

## เปลี่ยนโครงสร้างฐานข้อมูล (ฝั่งพัฒนา)

แก้ `server/api/prisma/schema.prisma` → บนเครื่องพัฒนา `cd server/api && npx prisma migrate dev --name <ชื่อ>` → commit โฟลเดอร์ใหม่ใน `prisma/migrations/` → บน VPS อัปเดตเวอร์ชันตามด้านบน

## สำรองฐานข้อมูลทุกคืน (เก็บ 14 วัน)

```bash
sudo mkdir -p /var/backups/p2050 && sudo chown postgres /var/backups/p2050
(sudo crontab -u postgres -l 2>/dev/null; echo '0 3 * * * pg_dump -Fc p2050 > /var/backups/p2050/p2050-$(date +\%F).dump && find /var/backups/p2050 -mtime +14 -delete') | sudo crontab -u postgres -
```

กู้คืน: `pg_restore -d p2050 --clean /var/backups/p2050/p2050-YYYY-MM-DD.dump`

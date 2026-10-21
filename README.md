# Project Zero

เกมวางแผนกลยุทธ์กู้วิกฤตโลกร้อน (Garena Academy Game Maker · SDG 13) · เวอร์ชัน 1.0

## รันทุกอย่างด้วยคำสั่งเดียว (ไม่ใช้ Docker)

ต้องมี Node.js 22+ และ PostgreSQL 16

```bash
cp .env.example .env      # แล้วแก้ DATABASE_URL, JWT_SECRET, PUBLIC_URL และพอร์ต
npm run setup             # ติดตั้ง package
npm run build             # build ตัวเกม
npm start                 # เกม (WEB_PORT) + หน้า admin (/admin/ หรือ ADMIN_PORT) + API (API_PORT)
```

reverse proxy มาที่ `WEB_PORT` พอร์ตเดียวก็ใช้ได้ทั้งเกม หน้า admin และ API · คู่มือติดตั้งบน VPS: [server/DEPLOY-VPS.md](server/DEPLOY-VPS.md)

| โฟลเดอร์ | คืออะไร |
|---|---|
| `web/` | โค้ดเกมเวอร์ชันเว็บ ([web/README.md](web/README.md)) |
| `server/api/` | API (Node.js + Fastify) และฐานข้อมูล (Prisma) |
| `server/admin/` | หน้าผู้ดูแล |
| `server/` | ไฟล์สำหรับ Docker และ VPS ([server/README.md](server/README.md)) |
| `assets/` | ภาพ เสียง ฟอนต์ และไฟล์เกมที่ build แล้ว |
| `scripts/` | `npm run build` / `npm start` |
| `gdevelop/` | เวอร์ชัน GDevelop (ไม่อัปเดตแล้ว) |

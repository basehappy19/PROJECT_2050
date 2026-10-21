# ตั้งค่าเกียรติบัตร

แก้ไฟล์ `certificate.json` ได้โดยไม่ต้องแก้โค้ด แล้วสั่ง `docker compose restart api`

เมื่อได้หน่วยงาน partner แล้ว ให้วางไฟล์โลโก้และลายเซ็น (PNG พื้นหลังโปร่งใส) ไว้ในโฟลเดอร์นี้ แล้วแก้เป็น

```json
{
  "issuer": "ทีม Project Zero · Garena Academy Game Maker",
  "partner": { "name": "ชื่อหน่วยงาน", "logo": "partner-logo.png" },
  "signatures": [
    { "name": "ชื่อผู้ลงนาม", "title": "ตำแหน่ง", "image": "sign1.png" },
    { "name": "ชื่อผู้ลงนาม", "title": "ตำแหน่ง", "image": "sign2.png" }
  ]
}
```

- ใส่ลายเซ็นได้สูงสุด 3 คน
- ถ้า `partner` เป็น `null` และไม่มีลายเซ็น เกียรติบัตรจะออกในนามทีม (ค่า `issuer`)

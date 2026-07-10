# คู่มือ: เก็บข้อมูลแบบประเมินลง Google Sheet

ทำครั้งเดียว ~5 นาที หลังจากนี้ทุกคนที่กรอกฟอร์มจะถูกบันทึกเข้า Google Sheet เดียวกันอัตโนมัติ (แบบ real-time ไม่ต้อง export/import เอง)

---

## ขั้นที่ 1 — สร้าง Google Sheet
1. เข้า https://sheets.google.com → **สร้างสเปรดชีตเปล่า** 1 ไฟล์
2. ตั้งชื่อไฟล์ เช่น `แบบประเมิน Demo Herbal ERP`

## ขั้นที่ 2 — วางโค้ด Apps Script
1. ในไฟล์ Sheet นั้น ไปที่เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. ลบโค้ดเดิม `function myFunction() {}` ออกให้หมด
3. เปิดไฟล์ **`google-apps-script.gs`** (อยู่ใน repo นี้) คัดลอกทั้งหมด → วางลงไป
4. กด **บันทึก** (ไอคอนแผ่นดิสก์ 💾)

## ขั้นที่ 3 — Deploy เป็น Web App
1. มุมขวาบน กด **Deploy → New deployment**
2. กดไอคอนเฟือง ⚙️ ข้าง "Select type" → เลือก **Web app**
3. ตั้งค่า:
   - **Description:** อะไรก็ได้ เช่น `demo-eval v1`
   - **Execute as:** `Me` (อีเมลของคุณ)
   - **Who has access:** **Anyone** ⚠️ (สำคัญ — ถ้าไม่ใช่ Anyone ฟอร์มจะส่งข้อมูลไม่ได้)
4. กด **Deploy**
5. ครั้งแรกจะให้ **Authorize access** → เลือกบัญชี Google ของคุณ
   - ถ้าเจอหน้า "Google hasn't verified this app" → กด **Advanced → Go to (ชื่อโปรเจกต์) (unsafe)** → **Allow**
   (ปลอดภัย เพราะเป็นสคริปต์ของคุณเอง)
6. คัดลอก **Web app URL** ที่ได้ (ลงท้ายด้วย `/exec`)
   ตัวอย่าง: `https://script.google.com/macros/s/AKfycb..../exec`

## ขั้นที่ 4 — ใส่ URL ลงในฟอร์ม
1. เปิดไฟล์ **`index.html`** หาบรรทัด (ประมาณกลางไฟล์ ใน `<script>`):
   ```js
   const ENDPOINT = ""; // e.g. "https://script.google.com/macros/s/XXXX/exec"
   ```
2. วาง URL ที่คัดลอกมา:
   ```js
   const ENDPOINT = "https://script.google.com/macros/s/AKfycb..../exec";
   ```
3. บันทึก แล้ว commit + push ขึ้น GitHub (หรือแจ้งผมให้ push ให้)

## ขั้นที่ 5 — ทดสอบ
1. เปิดฟอร์มที่ https://santibms.github.io/Herbal-ERP-DEMO/ → กรอกทดลอง → กดส่ง
2. กลับไปดู Google Sheet → จะมีชีตชื่อ **`DemoEvaluations`** พร้อมข้อมูลแถวใหม่โผล่ขึ้นมา ✅

---

## หมายเหตุสำคัญ
- **ข้อมูลถูกเก็บ 2 ที่พร้อมกัน:** ทั้งใน Google Sheet และใน localStorage ของเครื่องที่กรอก
  ดังนั้นแม้เน็ตหลุดชั่วขณะ ข้อมูลก็ยังอยู่ในเครื่อง และหน้า `admin.html` ยังใช้ดูได้
- ฟอร์มส่งแบบ `no-cors` — เบราว์เซอร์จะ **ไม่แจ้ง error แม้ส่งสำเร็จ** เป็นเรื่องปกติ ให้ยืนยันจากการที่แถวขึ้นใน Sheet จริง
- ถ้าแก้โค้ด `.gs` ภายหลัง ต้อง **Deploy → Manage deployments → แก้ deployment เดิม → Version: New version** (อย่าสร้าง deployment ใหม่ เพราะ URL จะเปลี่ยน)
- อยากได้ Dashboard สรุปใน Sheet (กราฟ/pivot) แจ้งผมได้ เดี๋ยวเพิ่มให้

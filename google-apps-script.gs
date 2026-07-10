/**
 * HERBAL ERP — แบบประเมินหลังการ Demo
 * Google Apps Script: รับข้อมูลจากฟอร์ม (index.html) แล้วบันทึกลง Google Sheet
 *
 * วิธีติดตั้ง (ดูละเอียดใน SETUP-GoogleSheet.md):
 *  1) สร้าง Google Sheet ใหม่ 1 ไฟล์
 *  2) เมนู Extensions → Apps Script → วางโค้ดนี้ทับทั้งหมด → Save
 *  3) Deploy → New deployment → type: Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  4) คัดลอก "Web app URL" (ลงท้าย /exec) เอาไปใส่ในตัวแปร ENDPOINT ใน index.html
 */

const SHEET_NAME = 'DemoEvaluations';

// 8 โมดูล (ต้องตรงกับ index.html)
const MODULES = [
  ['warehouse', 'คลังสินค้า'], ['production', 'การผลิต'],
  ['qc', 'คุณภาพ (QC)'], ['gmp', 'คุณภาพ GMP'],
  ['purchasing', 'จัดซื้อ'], ['sales', 'ขาย'],
  ['hr', 'บุคลากร'], ['accounting', 'บัญชี'],
];

const HEADERS = [
  'เวลาบันทึก', 'เวลาที่ตอบ', 'ประเภทหน่วยงาน', 'หน่วยงาน', 'ผู้ประเมิน', 'ตำแหน่ง', 'เบอร์โทร',
  ...MODULES.map(m => 'คะแนน:' + m[1]),
  'สนใจนำไปใช้', 'ระบบสำคัญสุด', 'หัวข้อที่สำคัญ',
  'NPS (0-10)', 'ระดับความสนใจ', 'วันติดต่อกลับ', 'ช่วงเวลา',
  'อยากให้พัฒนา', 'ระบบที่ยังขาด', 'ยินยอม PDPA',
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
      .setBackground('#2e6b3e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

// รับข้อมูลจากฟอร์ม (fetch POST, mode: no-cors ส่งเป็น text/plain)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sh = getSheet_();
    const r = data.ratings || {};
    const row = [
      new Date(),
      data.ts || '',
      data.orgType || '',
      data.org || '',
      data.name || '',
      data.role || '',
      "'" + (data.phone || ''),                  // นำหน้าด้วย ' กันตัดเลข 0
      ...MODULES.map(m => {
        const v = r[m[0]];
        return v === 0 ? 'ไม่ได้ดู' : (v == null ? '' : v);
      }),
      (data.interest || []).join(' | '),
      data.topPriority || '',
      (data.priorities || []).join(' | '),
      (data.nps == null ? '' : data.nps),
      data.interestLevel || '',
      data.followDate || '',
      data.followTime || '',
      data.improve || '',
      data.missing || '',
      data.pdpa ? 'ยินยอม' : '',
    ];
    sh.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ให้ทดสอบเปิด URL ด้วย GET ได้ (เช็คว่า deploy ทำงาน)
function doGet() {
  return json_({ ok: true, service: 'Herbal ERP Demo Evaluation', time: new Date() });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

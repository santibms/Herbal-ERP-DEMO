/**
 * HERBAL ERP — แบบประเมินหลังการ Demo
 * Google Apps Script: รับข้อมูลจากฟอร์ม (index.html) แล้วบันทึกลง Google Sheet
 *
 * ── วิธีติดตั้ง (แบบง่ายสุด — ให้สคริปต์สร้าง Sheet เองในโฟลเดอร์ของคุณ) ──
 *  1) เข้า https://script.google.com → New project → วางโค้ดนี้ทับทั้งหมด → Save
 *  2) เลือกฟังก์ชัน "setup" ในแถบด้านบน → กด Run (▶)
 *       - ครั้งแรกจะให้ Authorize → อนุญาตด้วยบัญชี Google ของคุณ
 *       - สคริปต์จะสร้างไฟล์ Sheet ชื่อ "แบบประเมิน Demo Herbal ERP"
 *         ไว้ในโฟลเดอร์ Drive ที่กำหนดใน DRIVE_FOLDER_ID ให้อัตโนมัติ
 *  3) Deploy → New deployment → type: Web app
 *       - Execute as: Me       - Who has access: Anyone
 *  4) คัดลอก "Web app URL" (ลงท้าย /exec) → ส่งให้ผมใส่ใน ENDPOINT ของ index.html
 *
 * (ดูละเอียดใน SETUP-GoogleSheet.md)
 */

// โฟลเดอร์ Drive ปลายทางที่จะเก็บไฟล์ Sheet (จากลิงก์ที่คุณส่งมา)
// https://drive.google.com/drive/folders/19zQGPne37FRK8IuwoXG2_rDz-PnU3Zha
const DRIVE_FOLDER_ID = '19zQGPne37FRK8IuwoXG2_rDz-PnU3Zha';
const SPREADSHEET_NAME = 'แบบประเมิน Demo Herbal ERP';
const SHEET_NAME = 'DemoEvaluations';

/**
 * รันครั้งเดียวเพื่อสร้างไฟล์ Sheet ในโฟลเดอร์ที่กำหนด + ใส่หัวตาราง
 * แล้วจดจำ Spreadsheet ID ไว้ให้ doPost ใช้ต่อ
 */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    ssId = ss.getId();
    props.setProperty('SPREADSHEET_ID', ssId);
    // ย้ายไฟล์ที่เพิ่งสร้างเข้าโฟลเดอร์ปลายทาง
    try {
      const file = DriveApp.getFileById(ssId);
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file); // เอาออกจาก My Drive (root)
    } catch (e) {
      Logger.log('ย้ายเข้าโฟลเดอร์ไม่สำเร็จ (ไฟล์ยังอยู่ใน My Drive): ' + e);
    }
  }
  getSheet_(ss); // สร้างหัวตาราง
  const url = ss.getUrl();
  Logger.log('พร้อมใช้งาน! เปิด Sheet ได้ที่: ' + url);
  return url;
}

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

// คืนค่า Spreadsheet ที่ผูกไว้ (ต้องรัน setup() ก่อน 1 ครั้ง)
function getSpreadsheet_() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) throw new Error('ยังไม่ได้ตั้งค่า — กรุณา Run ฟังก์ชัน setup() ก่อน 1 ครั้ง');
  return SpreadsheetApp.openById(ssId);
}

function getSheet_(ss) {
  ss = ss || getSpreadsheet_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    // ลบชีตเริ่มต้น "Sheet1"/"ชีต1" ที่ว่างเปล่าออก ถ้ามี
    ss.getSheets().forEach(s => {
      const n = s.getName();
      if ((n === 'Sheet1' || n === 'ชีต1') && s.getLastRow() === 0 && ss.getSheets().length > 1) {
        ss.deleteSheet(s);
      }
    });
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

/**
 * GET:
 *   ?action=list                → คืนข้อมูลแบบประเมินทั้งหมด (ให้ admin.html ดึงไปแสดง)
 *   ?action=list&callback=fnName → คืนเป็น JSONP (เลี่ยงปัญหา CORS บน GitHub Pages)
 *   (ไม่ใส่ action)              → ping เช็คว่า deploy ทำงาน
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  if (p.action === 'list') {
    try {
      out = { ok: true, rows: listRows_() };
    } catch (err) {
      out = { ok: false, error: String(err) };
    }
  } else {
    out = { ok: true, service: 'Herbal ERP Demo Evaluation', time: new Date() };
  }
  if (p.callback) {
    return ContentService
      .createTextOutput(p.callback + '(' + JSON.stringify(out) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(out);
}

// อ่านทุกแถวใน Sheet แล้วแปลงกลับเป็นรูปแบบเดียวกับที่ฟอร์มส่งมา
function listRows_() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const n = HEADERS.length;
  const vals = sh.getRange(2, 1, last - 1, n).getValues();
  const disp = sh.getRange(2, 1, last - 1, n).getDisplayValues();

  const iso = v => (v instanceof Date ? v.toISOString() : String(v || ''));
  const num = v => (v === '' || v == null ? null : Number(v));
  const list = s => String(s || '').split(' | ').map(x => x.trim()).filter(Boolean);

  return vals.map((v, r) => {
    const d = disp[r];
    let i = 0;
    const savedAt = iso(v[i++]);
    const ts = iso(v[i++]) || savedAt;
    const orgType = d[i++], org = d[i++], name = d[i++], role = d[i++], phone = d[i++];
    const ratings = {};
    MODULES.forEach(m => {
      const raw = d[i++];
      ratings[m[0]] = raw === 'ไม่ได้ดู' ? 0 : (raw === '' ? null : Number(raw));
    });
    const interest = d[i++], topPriority = d[i++], priorities = d[i++];
    const nps = num(v[i++]), interestLevel = d[i++];
    const followDate = d[i++], followTime = d[i++];
    const improve = d[i++], missing = d[i++], pdpa = d[i++];
    return {
      ts, savedAt, orgType, org, name, role, phone, ratings,
      interest: list(interest), topPriority, priorities: list(priorities),
      nps, interestLevel, followDate, followTime, improve, missing,
      pdpa: pdpa === 'ยินยอม',
    };
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const code = fs.readFileSync(path.join(process.cwd(), 'src/pages/index.js'), 'utf8');
const marker = 'const TEMPLATE_B64 = "';
const start = code.indexOf(marker);
if (start === -1) {
  console.error('TEMPLATE_B64 marker not found');
  process.exit(1);
}
const end = code.indexOf('";', start + marker.length);
if (end === -1) {
  console.error('template end marker not found');
  process.exit(1);
}
const b64 = code.slice(start + marker.length, end).replace(/\s+/g, '');
const bytes = Buffer.from(b64, 'base64');
fs.writeFileSync('tmp_template.xlsx', bytes);
console.log('tmp_template.xlsx written', bytes.length);
try {
  const wb = XLSX.read(bytes, { type: 'buffer' });
  console.log('Workbook loaded:', wb.SheetNames);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
  console.log('First rows:', JSON.stringify(data.slice(0, 5)));
} catch (err) {
  console.error('Error reading tmp_template.xlsx:', err.message);
  process.exit(1);
}

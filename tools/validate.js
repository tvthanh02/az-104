#!/usr/bin/env node
/* Kiểm tra nội dung: node tools/validate.js [moduleId ...]
 * - cú pháp JS của từng file content/modules/<id>.js
 * - đúng schema, id khớp curriculum, unit khớp tên trên Learn
 * - đáp án quiz hợp lệ, số lượng tối thiểu
 * - cân bằng thẻ HTML cơ bản
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'content/curriculum.js'), 'utf8'), ctx);
const CUR = ctx.window.AZ_CURRICULUM;
const MODS = {};
CUR.paths.forEach(p => p.modules.forEach(m => { MODS[m.id] = m; }));

const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(MODS);
const MIN = { sections: 3, keyFacts: 6, traps: 4, flashcards: 10, quiz: 12 };
const TAGS = ['div', 'table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'pre', 'code', 'strong', 'em', 'h4', 'p', 'section', 'details', 'summary', 'a', 'span', 'li', 'td', 'th'];

let errors = 0, warnings = 0, checked = 0, missing = [];
const err = (id, msg) => { errors++; console.log(`  ✗ [${id}] ${msg}`); };
const warn = (id, msg) => { warnings++; console.log(`  ! [${id}] ${msg}`); };

function balance(id, where, html) {
  if (typeof html !== 'string') return;
  for (const t of TAGS) {
    const open = (html.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'gi')) || []).length;
    const close = (html.match(new RegExp(`</${t}>`, 'gi')) || []).length;
    if (open !== close) err(id, `${where}: thẻ <${t}> mở ${open} / đóng ${close}`);
  }
  if (/\$\{/.test(html)) warn(id, `${where}: còn chuỗi "\${" — kiểm tra template literal`);
  for (const t of ['figure', 'figcaption', 'svg', 'text', 'label']) {
    const open = (html.match(new RegExp(`<${t}(\\s[^>]*)?>`, 'gi')) || []).length;
    const close = (html.match(new RegExp(`</${t}>`, 'gi')) || []).length;
    if (open !== close) err(id, `${where}: thẻ <${t}> mở ${open} / đóng ${close}`);
  }
  for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
    const src = (m[0].match(/src="([^"]+)"/) || [])[1];
    if (!src) { err(id, `${where}: <img> thiếu src`); continue; }
    if (/^https?:/i.test(src)) { err(id, `${where}: ảnh phải tải về assets/img/, không hotlink: ${src}`); continue; }
    if (!fs.existsSync(path.join(root, src))) err(id, `${where}: không tìm thấy ảnh ${src}`);
    if (!/alt="[^"]+"/.test(m[0])) err(id, `${where}: <img> thiếu alt`);
  }
  if (/<svg[\s>]/i.test(html) && !/<svg[^>]*class="dg"/i.test(html)) warn(id, `${where}: <svg> nên có class="dg" để dùng màu theo theme`);
}

for (const id of ids) {
  const m = MODS[id];
  if (!m) { err(id, 'không có trong curriculum'); continue; }
  const file = path.join(root, 'content/modules', id + '.js');
  if (!fs.existsSync(file)) { missing.push(id); continue; }
  checked++;
  const box = { window: {}, AZ: null, out: null };
  box.AZ = { addModule: x => { box.out = x; } };
  box.window.AZ = box.AZ;
  vm.createContext(box);
  const src = fs.readFileSync(file, 'utf8');
  src.split(/\r?\n/).forEach((line, i) => {
    if (/(^|[^\\])\\$/.test(line)) err(id, `dòng ${i + 1}: dấu \\ cuối dòng sẽ bị nuốt trong template literal — viết \\\\`);
  });
  try { vm.runInContext(src, box, { filename: file }); }
  catch (e) { err(id, 'lỗi cú pháp/chạy: ' + e.message); continue; }
  const c = box.out;
  if (!c) { err(id, 'không gọi AZ.addModule'); continue; }
  if (c.id !== id) err(id, `id "${c.id}" không khớp tên file`);
  if (!Array.isArray(c.sections) || c.sections.length < MIN.sections) err(id, 'sections thiếu hoặc quá ít');
  const sids = new Set();
  const covered = new Set();
  (c.sections || []).forEach((s, i) => {
    const w = `section #${i + 1} (${s.id})`;
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) err(id, `${w}: id phải là kebab-case`);
    if (sids.has(s.id)) err(id, `${w}: trùng id`);
    sids.add(s.id);
    if (!s.title) err(id, `${w}: thiếu title`);
    if (!s.html || s.html.length < 400) warn(id, `${w}: nội dung ngắn (${(s.html || '').length} ký tự)`);
    if (s.extra) { if (s.unit) warn(id, `${w}: mục extra không cần unit`); }
    else if (!m.units.includes(s.unit)) err(id, `${w}: unit "${s.unit}" không khớp tên unit trên Learn`);
    else covered.add(s.unit);
    balance(id, w, s.html);
  });
  m.units.filter(u => !covered.has(u) && !/^Exercise/i.test(u)).forEach(u => warn(id, `unit chưa có mục riêng: "${u}"`));
  for (const k of ['keyFacts', 'traps', 'flashcards', 'quiz']) {
    if (!Array.isArray(c[k]) || c[k].length < MIN[k]) err(id, `${k}: cần ≥ ${MIN[k]} (đang có ${(c[k] || []).length})`);
  }
  (c.keyFacts || []).forEach((f, i) => balance(id, `keyFacts[${i}]`, f));
  (c.traps || []).forEach((f, i) => balance(id, `traps[${i}]`, f));
  balance(id, 'cheatsheet', c.cheatsheet || '');
  (c.flashcards || []).forEach((f, i) => { if (!f.front || !f.back) err(id, `flashcards[${i}] thiếu front/back`); });
  (c.quiz || []).forEach((q, i) => {
    const w = `quiz[${i}]`;
    if (!q.q || !Array.isArray(q.options) || q.options.length < 2) return err(id, `${w}: thiếu q/options`);
    if (!Array.isArray(q.answer) || !q.answer.length) return err(id, `${w}: answer phải là mảng chỉ số`);
    if (q.answer.some(a => !Number.isInteger(a) || a < 0 || a >= q.options.length)) err(id, `${w}: answer ngoài phạm vi`);
    if (new Set(q.answer).size !== q.answer.length) err(id, `${w}: answer trùng`);
    if (!q.explain) warn(id, `${w}: thiếu giải thích`);
    balance(id, w, q.q + q.options.join('') + (q.explain || ''));
  });
  const dist = (c.quiz || []).map(q => q.answer[0]);
  const top = Math.max(0, ...[0, 1, 2, 3].map(v => dist.filter(x => x === v).length));
  if (dist.length >= 8 && top / dist.length > 0.5) warn(id, 'đáp án đúng dồn vào một vị trí — nên phân bố đều A/B/C/D');
  console.log(`✓ ${id}: ${(c.sections || []).length} mục · ${(c.keyFacts || []).length} facts · ${(c.traps || []).length} bẫy · ${(c.flashcards || []).length} thẻ · ${(c.quiz || []).length} câu`);
}
if (missing.length) console.log(`\nChưa có nội dung (${missing.length}): ${missing.join(', ')}`);
console.log(`\nĐã kiểm tra ${checked} module · ${errors} lỗi · ${warnings} cảnh báo`);
process.exit(errors ? 1 : 0);

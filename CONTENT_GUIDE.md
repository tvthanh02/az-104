# Hướng dẫn biên soạn nội dung module

Mỗi module là một file `content/modules/<id>.js` (id lấy từ `content/curriculum.js`, ví dụ `p3m4`).
File mẫu chuẩn: `content/modules/p1m1.js`. Hãy đọc nó trước khi viết.

Kiểm tra sau khi viết: `node tools/validate.js <id>`. Yêu cầu: **0 lỗi, 0 cảnh báo**.

## Schema

```js
AZ.addModule({
  id: 'p3m4',
  summary: '1–3 câu: module nói về gì, vì sao quan trọng với đề thi (HTML inline được)',
  objectives: ['4–6 mục tiêu, bắt đầu bằng động từ'],
  sections: [
    { id: 'kebab-id', unit: '<tên unit Learn, khớp CHÍNH XÁC với curriculum.js>', title: 'Tiêu đề tiếng Việt', html: `...` },
    { id: 'kebab-id', extra: true, title: 'Chủ đề mở rộng', html: `...` }   // mỗi mục trong extras[] của curriculum
  ],
  keyFacts: ['8–12 con số / sự thật phải nhớ (HTML inline)'],
  traps: ['5–8 bẫy thi hay gặp'],
  cheatsheet: `<table>…</table>`,       // bảng tóm tắt 1 màn hình
  flashcards: [{ front: '...', back: '...' }],   // 12–20 thẻ
  quiz: [{ q: '...', options: ['...', '...', '...', '...'], answer: [2], explain: '...' }]  // 12–15 câu
});
```

## Nguyên tắc nội dung
- **Tiếng Việt**, giữ nguyên thuật ngữ tiếng Anh của Azure (resource group, peering, SKU, tier…). Lần đầu có thể giải thích nghĩa.
- **Learn chỉ là sườn**: mỗi unit phải được đào sâu từ tài liệu chính thức (learn.microsoft.com/azure/...). Cần có: giới hạn và con số, so sánh SKU/tier, lệnh CLI/PowerShell, tình huống thực tế, bẫy thi.
- **Chính xác là ưu tiên số 1.** Không chắc một con số thì kiểm tra tài liệu Microsoft hoặc bỏ đi. Dùng tên sản phẩm hiện hành (Microsoft Entra ID, không dùng Azure AD; có thể ghi "trước đây là Azure AD").
- Unit dạng *Exercise* có thể gộp vào section lý thuyết liên quan. Nếu viết riêng thì trình bày các bước thực hành bằng `<ol class="steps">`.
- Mỗi mục trong `extras` của curriculum phải có một section `extra: true`.
- Độ dài mỗi section khoảng 1.500–5.000 ký tự HTML. Chia nhỏ bằng `<h4>`.

## HTML được phép trong `html`
- `<p> <ul> <ol> <li> <strong> <em> <code> <kbd> <h4> <table><thead><tbody><tr><th><td> <pre><code>`
- Callout: `<div class="callout note|tip|warn|exam"><strong>Tiêu đề</strong>Nội dung…</div>` (`exam` = góc thi / bẫy thi)
- So sánh song song: `<div class="compare"><div><strong>A</strong>…</div><div><strong>B</strong>…</div></div>`
- Các bước: `<ol class="steps"><li>…</li></ol>`
- Sơ đồ chữ: `<pre class="diagram">…</pre>`
- KHÔNG dùng `<h1>`–`<h3>`, `<script>`, `<style>`, inline style, hay ảnh ngoài.

## Hình ảnh, sơ đồ và thực hành portal
Mẫu chuẩn: section `how-it-works` trong `content/modules/p1m1.js`. Hãy đọc nó trước khi làm.

**1. Sơ đồ SVG tự vẽ** (ưu tiên cho kiến trúc, luồng dữ liệu, so sánh):
```html
<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Mô tả sơ đồ">
  <rect class="box-a" x=".." y=".." width=".." height=".." rx="10"/>
  <text x=".." y=".." text-anchor="middle" class="t-b">Nhãn</text>
  <line class="ln" x1=".." y1=".." x2=".." y2=".." marker-end="url(#arr)"/>
</svg>
<figcaption>Hình N. Chú thích ngắn: sơ đồ nói lên điều gì.</figcaption>
</figure>
```
- Chỉ dùng class, **không** dùng màu cứng (fill/stroke hex), để sơ đồ đổi màu theo giao diện sáng/tối.
- Khung: `box` (trung tính), `box-a` (xanh, chủ thể), `box-s` (xanh lá, cho phép/OK), `box-w` (vàng, storage/cảnh báo), `box-x` (đỏ, chặn/lỗi), `box-e` (tím), `zone` (viền nét đứt: region/VNet/subnet).
- Đường: `ln`, `ln-a`, `ln-s`, `ln-x` (+ `dash`). Mũi tên: `marker-end="url(#arr)"`, `#arr-a`, `#arr-s`, `#arr-x` (đã định nghĩa sẵn trong index.html).
- Chữ: mặc định 14px; `t-sm` (12px), `t-b` (đậm), `t-mute`, `t-a`, `t-s`, `t-w`, `t-x`.
- viewBox rộng khoảng 640–720. Chừa khoảng cách để chữ không đè lên nhau; ước lượng mỗi ký tự rộng khoảng 7,5px (14px) hoặc 6,5px (12px).

**2. Khối thực hành trên Azure portal**:
```html
<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tên bài thực hành</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mô tả bước<br><span class="path">Azure portal › Virtual networks › + Create</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create virtual network</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Security</span><span>IP addresses</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-demo</span></div>
        <div class="pf"><label>Enable Azure Bastion</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label></label><span class="pv note">Ghi chú nhỏ</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
  </ol></div>
</div>
```
`.pv` là ô nhập; thêm `sel` (dropdown), `chk` (checkbox), `radio`, `note` (chữ chú thích). Tên menu, tab và trường phải **đúng với portal hiện tại** (đối chiếu hướng dẫn quickstart trên Microsoft Learn); giá trị mẫu thì tự đặt.

**3. Ảnh chụp từ Microsoft Learn** (chỉ khi thật sự giúp hiểu, ví dụ màn hình cấu hình phức tạp):
- Tài liệu Microsoft Learn dùng giấy phép CC BY 4.0. Tải ảnh về `assets/img/<module-id>/<tên>.png`; **không hotlink**.
- Mở ảnh xem trước (Read) để chắc ảnh đúng nội dung và không quá cũ.
- `<figure class="fig"><img src="assets/img/p3m4/peering.png" alt="Mô tả" loading="lazy"><figcaption>Hình N. … Nguồn: <a href="URL trang gốc" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>`

Đánh số hình liên tục trong mỗi section (Hình 1, Hình 2…).

## Lưu ý kỹ thuật (template literal)
- Trong chuỗi backtick: **không** dùng ký tự backtick, **không** dùng `${`. Với Bicep, viết `$&#123;name&#125;` hoặc dùng nối chuỗi.
- Ký tự `<` `>` trong văn bản/code phải viết `&lt;` `&gt;`. `&` thì viết `&amp;` khi cần.
- Chuỗi trong nháy đơn (`keyFacts`, `quiz`…) phải escape `\'`.
- Dấu `\` ở **cuối dòng** (line continuation của lệnh `az`) phải viết `\\`, nếu không JS sẽ nuốt luôn ký tự xuống dòng và lệnh bị dính thành một dòng. Validator báo lỗi trường hợp này.

## Câu hỏi luyện tập (quiz)
- Viết theo phong cách đề AZ-104: có tình huống (công ty, tài nguyên, yêu cầu), hỏi giải pháp đúng hoặc ít công sức/chi phí nhất.
- Gồm vài câu chọn nhiều đáp án (`answer: [0, 2]`, câu hỏi ghi "(Chọn 2)").
- **Phân bố đáp án đúng đều** giữa các vị trí; không để quá nửa số câu cùng một vị trí.
- `explain` giải thích vì sao đúng **và vì sao các lựa chọn khác sai**. Không nhắc tới chữ cái A/B/C/D vì có thể thay đổi.

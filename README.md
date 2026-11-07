# AZ-104 Sổ tay ôn thi

Website tĩnh (HTML/CSS/JS thuần, không cần build) để ôn thi **Microsoft Azure Administrator (AZ-104)** bằng tiếng Việt.
Sườn nội dung bám theo 6 learning path / 28 module của Microsoft Learn, mỗi unit được đào sâu thêm kiến thức thi.

## Chạy
Mở trực tiếp `index.html` bằng trình duyệt. Có thể chạy qua server tĩnh nếu muốn:

```
npx serve .        # hoặc: python -m http.server 8000
```

## Tính năng
- Lộ trình 6 path → 28 module, mỗi module có 4 tab: **Bài học · Ghi nhớ & bẫy thi · Flashcard · Luyện câu hỏi**
- Tiến trình học: đánh dấu từng mục, điểm quiz tốt nhất, module hoàn thành (học hết mục + quiz ≥ 70%), chuỗi ngày học
- Ôn flashcard toàn bộ (lọc theo "cần ôn" / "chưa xem" / lộ trình), luyện đề trộn, đánh dấu mục, tìm kiếm không dấu
- Sao lưu / khôi phục tiến trình ra file JSON (dữ liệu lưu trong localStorage của trình duyệt)

## Cấu trúc
```
index.html
assets/css/style.css
assets/js/app.js
content/curriculum.js          # sườn: path, module, unit Learn, chủ đề mở rộng
content/modules/<id>.js        # nội dung từng module (p1m1 … p6m3)
content/questions/bank.js      # ngân hàng câu hỏi (từ PDF) — tùy chọn
tools/validate.js              # kiểm tra nội dung: node tools/validate.js [id…]
CONTENT_GUIDE.md               # quy chuẩn biên soạn
```

## Ngân hàng câu hỏi
`content/questions/bank.js` có dạng:

```js
AZ.addQuestions([
  { id: 'Q001', mod: 'p3m4', q: '…', options: ['…', '…'], answer: [1], explain: '…' }
]);
```

Ngân hàng đề là **mục độc lập** (`#/bank`): xem đủ 639 câu, lọc theo chủ đề / loại câu / trạng thái đáp án / kết quả, làm từng câu, thi thử có hẹn giờ.
Trường `mod` chỉ dùng để lọc theo chủ đề; phần "Luyện câu hỏi" của mỗi module chỉ dùng câu soạn theo bài học (`quiz` trong file module).

### Tạo lại ngân hàng từ PDF (`tools/bank/`)
```
python -I tools/bank/parse.py assets/az-104_9120.pdf tools/bank/data/questions.json <thư-mục-ảnh-tạm>
# (phân loại module + kiểm tra đáp án → tools/bank/data/map_*.json: {n, mod, status, vi, note})
python -I tools/bank/build_bank.py tools/bank/data/questions.json tools/bank/data <thư-mục-ảnh-tạm> .
```
- `status`: `ok` · `outdated` (dựa trên tính năng đã ngừng/thay đổi) · `disputed` (đáp án trong đề có thể sai). `note` giải thích lý do.
- Muốn sửa phân loại của một câu: sửa `tools/bank/data/map_*.json` rồi chạy lại `build_bank.py`.
- Ngân hàng đề trích từ tài liệu của bên thứ ba, chỉ dùng cho mục đích ôn tập cá nhân. Đừng publish công khai.

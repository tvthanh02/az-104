/* AZ-104 Sổ tay ôn thi — ứng dụng một trang, không cần build.
 * Nội dung module: content/modules/<id>.js gọi AZ.addModule({...}).
 * Tiến trình học lưu trong localStorage (có xuất/nhập file để sao lưu).
 */
(function () {
  'use strict';

  var CUR = window.AZ_CURRICULUM;
  var CONTENT = {};
  var BANK = [];
  window.AZ = {
    addModule: function (m) { if (m && m.id) CONTENT[m.id] = m; },
    addQuestions: function (list) { if (Array.isArray(list)) BANK = BANK.concat(list); }
  };

  /* ---------- Chỉ mục curriculum ---------- */
  var MODS = [];
  var MOD = {};
  var PATH = {};
  CUR.paths.forEach(function (p) {
    PATH[p.id] = p;
    p.modules.forEach(function (m, i) {
      m.path = p; m.num = i + 1; m.index = MODS.length;
      MODS.push(m); MOD[m.id] = m;
    });
  });

  /* ---------- Lưu trữ tiến trình ---------- */
  var KEY = 'az104.progress.v1';
  function fresh() { return { sections: {}, quiz: {}, bookmarks: {}, cards: {}, activity: {}, practice: [], qstats: {}, last: null }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var s = raw ? JSON.parse(raw) : {};
      var f = fresh();
      Object.keys(f).forEach(function (k) { if (s[k] === undefined) s[k] = f[k]; });
      return s;
    } catch (e) { return fresh(); }
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bỏ qua */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function touch() { var t = today(); S.activity[t] = (S.activity[t] || 0) + 1; }

  /* ---------- Tiện ích ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function strip(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Tính tiến trình ---------- */
  function secKey(mid, sid) { return mid + ':' + sid; }
  function modStats(mid) {
    var c = CONTENT[mid];
    var total = c ? c.sections.length : 0, done = 0;
    if (c) c.sections.forEach(function (s) { if (S.sections[secKey(mid, s.id)]) done++; });
    var q = S.quiz[mid];
    var complete = total > 0 && done === total && (!c.quiz || !c.quiz.length || (q && q.best >= 70));
    return { total: total, done: done, pct: pct(done, total), quiz: q, hasContent: !!c, complete: complete };
  }
  function pathStats(pid) {
    var t = 0, d = 0, comp = 0, ready = 0;
    PATH[pid].modules.forEach(function (m) { var s = modStats(m.id); t += s.total; d += s.done; if (s.complete) comp++; if (s.hasContent) ready++; });
    return { total: t, done: d, pct: pct(d, t), complete: comp, count: PATH[pid].modules.length, ready: ready };
  }
  function allStats() {
    var t = 0, d = 0, comp = 0, qs = [], ready = 0;
    MODS.forEach(function (m) { var s = modStats(m.id); t += s.total; d += s.done; if (s.complete) comp++; if (s.hasContent) ready++; if (s.quiz) qs.push(s.quiz.best); });
    var avg = qs.length ? Math.round(qs.reduce(function (a, b) { return a + b; }, 0) / qs.length) : null;
    return { total: t, done: d, pct: pct(d, t), complete: comp, quizAvg: avg, quizCount: qs.length, ready: ready };
  }
  function streak() {
    var n = 0, d = new Date();
    if (!S.activity[today()]) d.setDate(d.getDate() - 1);
    for (;;) {
      var k = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (S.activity[k]) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  /* ---------- UI nhỏ ---------- */
  function bar(p, done) { return '<div class="bar' + (done ? ' done' : '') + '"><i style="width:' + p + '%"></i></div>'; }
  function ring(p) {
    var r = 54, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<svg class="ring" viewBox="0 0 132 132" role="img" aria-label="Hoàn thành ' + p + '%">' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="12"/>' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="' + (p === 100 ? 'var(--success)' : 'var(--accent)') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 66 66)"/>' +
      '<text x="66" y="64" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)">' + p + '%</text>' +
      '<text x="66" y="86" text-anchor="middle" font-size="11" fill="var(--muted)">hoàn thành</text></svg>';
  }
  function dot(s) {
    if (!s.hasContent) return '<svg class="dot" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="3 3"/></svg>';
    if (s.complete) return '<svg class="dot" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="var(--success)"/><path d="M5 9.5l2.6 2.5L13 6.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    var c = 2 * Math.PI * 7, off = c * (1 - s.pct / 100);
    return '<svg class="dot" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--surface-2)" stroke-width="3"/><circle cx="9" cy="9" r="7" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 9 9)"/></svg>';
  }
  function modName(m) { return m.vi || m.title; }

  /* ---------- Sidebar ---------- */
  var ROUTE = { name: 'home' };
  function renderSidebar() {
    var sb = $('#sidebar'), top = sb.scrollTop;
    var curMid = ROUTE.name === 'module' ? ROUTE.mid : null;
    var curPid = curMid ? MOD[curMid].path.id : (ROUTE.name === 'path' ? ROUTE.pid : null);
    var link = function (href, icon, label, name) { return '<a class="nav-link' + (ROUTE.name === name || (name === 'bank' && ROUTE.name === 'bankq') ? ' active' : '') + '" href="' + href + '"><span>' + icon + '</span>' + label + '</a>'; };
    var h = '<div class="nav-links">' +
      link('#/', '🏠', 'Tổng quan', 'home') +
      link('#/review', '🃏', 'Ôn tập flashcard', 'review') +
      link('#/bank', '🗂️', 'Ngân hàng đề' + (BANK.length ? ' <span class="nav-pct">' + BANK.length + ' câu</span>' : ''), 'bank') +
      link('#/practice', '📝', 'Luyện tổng hợp', 'practice') +
      link('#/bookmarks', '🔖', 'Mục đã đánh dấu', 'bookmarks') +
      link('#/settings', '⚙️', 'Cài đặt & sao lưu', 'settings') +
      '</div><div class="nav-title">Lộ trình học</div>';
    CUR.paths.forEach(function (p, i) {
      var ps = pathStats(p.id);
      var open = p.id === curPid || (!curPid && i === 0);
      h += '<details class="nav-path"' + (open ? ' open' : '') + '><summary><span>' + p.icon + '</span><span>' + (i + 1) + '. ' + esc(p.title) + '</span><span class="chev">▶</span></summary><div class="nav-mods">' +
        '<a class="nav-mod' + (ROUTE.name === 'path' && ROUTE.pid === p.id ? ' active' : '') + '" href="#/path/' + p.id + '"><span class="muted">Tổng quan lộ trình</span><span class="nav-pct">' + ps.pct + '%</span></a>';
      p.modules.forEach(function (m) {
        var s = modStats(m.id);
        h += '<a class="nav-mod' + (m.id === curMid ? ' active' : '') + '" href="#/m/' + m.id + '">' + dot(s) + '<span>' + esc(modName(m)) + '</span></a>';
      });
      h += '</div></details>';
    });
    sb.innerHTML = h;
    sb.scrollTop = top;
  }

  /* ---------- Trang Tổng quan ---------- */
  function viewHome() {
    var a = allStats();
    var last = S.last && MOD[S.last.mid] ? MOD[S.last.mid] : null;
    var next = null;
    for (var i = 0; i < MODS.length; i++) { var st = modStats(MODS[i].id); if (st.hasContent && !st.complete) { next = MODS[i]; break; } }
    var resume = last && !modStats(last.id).complete ? last : next;
    var h = '<div class="page-head"><h1>Ôn thi AZ-104: Microsoft Azure Administrator</h1>' +
      '<p>Sườn nội dung bám theo 6 learning path chính thức trên Microsoft Learn, mỗi unit được đào sâu thêm kiến thức thi. Mục có nhãn <span class="badge extra">➕ Mở rộng</span> nằm ngoài Learn nhưng có trong đề cương thi.</p></div>';
    h += '<div class="card hero"><div>' + ring(a.pct) + '</div><div>' +
      '<h2 style="margin-bottom:4px">' + (a.done ? 'Tiếp tục hành trình của bạn' : 'Bắt đầu học thôi!') + '</h2>' +
      '<p class="muted" style="margin:0 0 14px">Đã học ' + a.done + '/' + a.total + ' mục kiến thức · ' + a.complete + '/' + MODS.length + ' module hoàn thành' + (a.ready < MODS.length ? ' · ' + a.ready + '/' + MODS.length + ' module đã có nội dung' : '') + '</p>' +
      '<div class="btn-row">' + (resume ? '<a class="btn btn-primary" href="#/m/' + resume.id + '">▶ ' + (a.done ? 'Học tiếp' : 'Bắt đầu') + ': ' + esc(modName(resume)) + '</a>' : '') +
      '<a class="btn" href="#/review">🃏 Ôn flashcard</a><a class="btn" href="#/practice">📝 Luyện đề</a></div></div></div>';
    h += '<div class="grid grid-4" style="margin-top:16px">' +
      stat(a.done + '/' + a.total, 'Mục đã học') +
      stat(a.complete + '/' + MODS.length, 'Module hoàn thành') +
      stat(a.quizAvg == null ? '–' : a.quizAvg + '%', 'Điểm quiz trung bình' + (a.quizCount ? ' (' + a.quizCount + ' module)' : '')) +
      stat(streak() + ' ngày', 'Chuỗi ngày học liên tiếp') + '</div>';
    if (BANK.length) {
      var bsh = bankStats();
      h += '<a class="card path-card" href="#/bank" style="margin-top:16px;flex-direction:row;align-items:center;gap:16px"><span class="ico" style="font-size:2rem">🗂️</span><div style="flex:1"><h3>Ngân hàng đề: ' + bsh.total + ' câu từ file PDF</h3><div class="muted small">Đã làm ' + bsh.done + '/' + bsh.total + ' · đang đúng ' + bsh.right + ' · đang sai ' + bsh.wrong + ' · xem từng câu, lọc theo chủ đề, thi thử 50 câu / 100 phút</div>' + bar(pct(bsh.done, bsh.total)) + '</div><span class="btn btn-primary">Mở →</span></a>';
    }
    h += '<div class="section-title"><h2>Lộ trình học</h2><span class="muted small">Module hoàn thành = học hết các mục + quiz ≥ 70%</span></div><div class="grid grid-paths">';
    CUR.paths.forEach(function (p, i) {
      var ps = pathStats(p.id);
      h += '<a class="card path-card" href="#/path/' + p.id + '"><div class="top"><span class="ico">' + p.icon + '</span><div><h3>' + (i + 1) + '. ' + esc(p.title) + '</h3><div class="muted small">' + esc(p.learnTitle) + '</div></div></div>' +
        bar(ps.pct, ps.pct === 100) + '<div class="meta"><span>' + ps.complete + '/' + ps.count + ' module · ' + ps.pct + '%</span>' + (p.weight ? '<span class="badge exam">Đề thi ' + p.weight + '</span>' : '<span class="badge">Nền tảng</span>') + '</div></a>';
    });
    h += '</div>';
    h += '<div class="section-title"><h2>Cấu trúc đề thi</h2></div><div class="card"><table class="domain-table"><thead><tr><th>Domain (skills measured)</th><th>Trọng số</th><th>Lộ trình tương ứng</th></tr></thead><tbody>';
    CUR.paths.filter(function (p) { return p.weight; }).forEach(function (p) {
      h += '<tr><td>' + esc(p.domain) + '</td><td><strong>' + p.weight + '</strong></td><td><a href="#/path/' + p.id + '">' + esc(p.title) + '</a></td></tr>';
    });
    h += '</tbody></table><p class="muted small" style="margin:12px 0 0">Điểm đạt: ' + CUR.exam.passScore + '/1000. Trọng số theo study guide; hãy kiểm tra lại <a href="' + CUR.exam.url + '" target="_blank" rel="noopener">trang chứng chỉ</a> trước khi thi vì Microsoft cập nhật định kỳ.</p></div>';
    return h;
  }
  function stat(n, l) { return '<div class="card stat"><div class="num">' + n + '</div><div class="lbl">' + l + '</div></div>'; }

  /* ---------- Trang Lộ trình ---------- */
  function viewPath(pid) {
    var p = PATH[pid]; if (!p) return notFound();
    var ps = pathStats(pid), idx = CUR.paths.indexOf(p) + 1;
    var h = '<div class="crumbs"><a href="#/">Tổng quan</a> / Lộ trình ' + idx + '</div>' +
      '<div class="page-head"><h1>' + p.icon + ' ' + esc(p.title) + '</h1><p>' + esc(p.learnTitle) + ' · <a href="' + p.url + '" target="_blank" rel="noopener">Xem trên Microsoft Learn ↗</a></p></div>' +
      '<div class="card" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:20px"><div style="flex:1;min-width:220px"><div class="small muted">Tiến độ lộ trình</div>' + bar(ps.pct, ps.pct === 100) + '<div class="small" style="margin-top:6px">' + ps.done + '/' + ps.total + ' mục · ' + ps.complete + '/' + ps.count + ' module hoàn thành</div></div>' +
      '<div><div class="small muted">Domain thi</div><strong>' + esc(p.domain) + '</strong>' + (p.weight ? ' <span class="badge exam">' + p.weight + '</span>' : '') + '</div></div><div class="mod-list">';
    p.modules.forEach(function (m) {
      var s = modStats(m.id);
      var sub = s.hasContent ? (s.total + ' mục · ' + (m.extras.length ? m.extras.length + ' chủ đề mở rộng · ' : '') + (s.quiz ? 'quiz tốt nhất ' + s.quiz.best + '%' : 'chưa làm quiz')) : 'Nội dung đang được biên soạn';
      h += '<a class="card mod-row' + (s.complete ? ' complete' : '') + '" href="#/m/' + m.id + '"><div class="mod-num">' + (s.complete ? '✓' : m.num) + '</div><div><h3>' + esc(modName(m)) + '</h3><div class="sub">' + esc(m.title) + '</div><div class="sub">' + sub + '</div></div>' +
        '<div class="prog">' + bar(s.pct, s.complete) + '<div class="small muted" style="margin-top:4px">' + s.pct + '%</div></div></a>';
    });
    return h + '</div>';
  }

  /* ---------- Trang Module ---------- */
  var TABS = [['learn', '📖 Bài học'], ['notes', '📌 Ghi nhớ & bẫy thi'], ['cards', '🃏 Flashcard'], ['quiz', '✅ Luyện câu hỏi']];
  function viewModule(mid, tab) {
    var m = MOD[mid]; if (!m) return notFound();
    var c = CONTENT[mid];
    tab = tab || 'learn';
    S.last = { mid: mid, t: Date.now() }; save();
    var s = modStats(mid), pIdx = CUR.paths.indexOf(m.path) + 1;
    var h = '<div class="crumbs"><a href="#/">Tổng quan</a> / <a href="#/path/' + m.path.id + '">' + pIdx + '. ' + esc(m.path.title) + '</a> / Module ' + m.num + '</div>' +
      '<div class="mod-head"><h1>' + esc(modName(m)) + '</h1><div class="en">' + esc(m.title) + '</div>' +
      '<div class="mod-meta"><span id="modProgBar">' + bar(s.pct, s.complete) + '</span><span id="modProgTxt">' + progText(s) + '</span>' +
      '<a href="' + m.url + '" target="_blank" rel="noopener">Microsoft Learn ↗</a></div></div>';
    if (!c) return h + placeholder(m) + pager(m);
    var counts = { learn: c.sections.length, notes: (c.keyFacts || []).length + (c.traps || []).length, cards: (c.flashcards || []).length, quiz: moduleQuestions(mid).length };
    h += '<nav class="tabs">' + TABS.map(function (t) {
      return '<a class="tab' + (t[0] === tab ? ' active' : '') + '" href="#/m/' + mid + '/' + t[0] + '">' + t[1] + '<span class="count">' + counts[t[0]] + '</span></a>';
    }).join('') + '</nav>';
    if (tab === 'learn') h += learnTab(m, c);
    else if (tab === 'notes') h += notesTab(c);
    else if (tab === 'cards') h += '<div id="deckHost"></div>';
    else if (tab === 'quiz') {
      var own = (c.quiz || []).length;
      h += '<div class="card" style="margin-bottom:16px"><strong>Luyện câu hỏi cuối module</strong><div class="muted small">' + own + ' câu soạn theo nội dung bài học của module này. Đạt ≥ 70% thì module được tính hoàn thành. Nộp bài để xem đáp án và giải thích.</div></div><div id="quizHost"></div>';
    }
    return h + pager(m);
  }
  function progText(s) { return s.done + '/' + s.total + ' mục' + (s.quiz ? ' · quiz ' + s.quiz.best + '%' : '') + (s.complete ? ' · <span class="badge success">✓ Hoàn thành</span>' : ''); }
  function placeholder(m) {
    return '<div class="card" style="margin-top:20px"><h3>🚧 Nội dung đang được biên soạn</h3><p class="muted">Các unit sẽ được đào sâu trong module này:</p><ul>' +
      m.units.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') +
      m.extras.map(function (u) { return '<li><span class="badge extra">➕ Mở rộng</span> ' + esc(u) + '</li>'; }).join('') + '</ul></div>';
  }
  function learnTab(m, c) {
    var h = '<div class="learn"><div class="content">';
    if (c.summary) h += '<p style="font-size:1.02rem;color:var(--text-2)">' + c.summary + '</p>';
    if (c.objectives && c.objectives.length) h += '<div class="card objectives"><h3>🎯 Sau module này bạn sẽ</h3><ul>' + c.objectives.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul></div>';
    c.sections.forEach(function (sec, i) {
      var k = secKey(m.id, sec.id), done = !!S.sections[k], bm = !!S.bookmarks[k];
      h += '<section class="card unit' + (done ? ' done' : '') + '" id="sec-' + sec.id + '" data-key="' + k + '">' +
        '<div class="unit-head"><h3>' + (i + 1) + '. ' + esc(sec.title) + '</h3><button class="bm-btn' + (bm ? ' on' : '') + '" data-act="bookmark" data-key="' + k + '" title="Đánh dấu để ôn lại" aria-label="Đánh dấu">' + (bm ? '★' : '☆') + '</button></div>' +
        '<div class="unit-src">' + (sec.extra ? '<span class="badge extra">➕ Mở rộng ngoài Learn</span>' : '<span class="badge accent">Learn unit</span> ' + esc(sec.unit || '')) + '</div>' +
        '<div class="unit-body">' + sec.html + '</div>' +
        '<div class="unit-foot"><button class="btn btn-sm ' + (done ? 'btn-success' : 'btn-primary') + '" data-act="toggle-sec" data-key="' + k + '">' + (done ? '✓ Đã học xong' : 'Đánh dấu đã học') + '</button></div></section>';
    });
    var qn = moduleQuestions(m.id).length, qb = S.quiz[m.id];
    h += '<div class="card objectives" style="margin-top:28px;text-align:center"><h3 style="font-size:1.1rem">✅ Luyện câu hỏi cuối module</h3><p style="margin-top:0">' + qn + ' câu hỏi dạng đề thi cho module này' + (qb ? ' · điểm cao nhất của bạn: <strong>' + qb.best + '%</strong> (' + qb.attempts + ' lần làm)' : '') + '. Đạt ≥ 70% để hoàn thành module.</p><div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="#/m/' + m.id + '/quiz">' + (qb ? 'Luyện lại' : 'Bắt đầu luyện') + ' →</a><a class="btn" href="#/m/' + m.id + '/notes">📌 Ghi nhớ & bẫy thi</a><a class="btn" href="#/m/' + m.id + '/cards">🃏 Flashcard</a></div></div>';
    h += '</div><aside class="toc"><h4>Nội dung</h4>' + c.sections.map(function (sec) {
      var done = !!S.sections[secKey(m.id, sec.id)];
      return '<a href="#" data-act="scroll" data-target="sec-' + sec.id + '" data-tock="' + secKey(m.id, sec.id) + '" class="' + (done ? 'done' : '') + '"><span class="ck">' + (done ? '✓' : '○') + '</span><span>' + esc(sec.title) + (sec.extra ? ' ➕' : '') + '</span></a>';
    }).join('') + '</aside></div>';
    return h;
  }
  function notesTab(c) {
    var h = '';
    if (c.keyFacts && c.keyFacts.length) {
      h += '<h2>📌 Con số & sự thật phải nhớ</h2><div class="facts">' + c.keyFacts.map(function (f, i) { return '<div class="card fact"><span class="n">' + (i + 1) + '</span><div>' + f + '</div></div>'; }).join('') + '</div>';
    }
    if (c.traps && c.traps.length) {
      h += '<h2 style="margin-top:32px">🎯 Bẫy thi thường gặp</h2><div class="facts">' + c.traps.map(function (f, i) { return '<div class="card fact trap"><span class="n">' + (i + 1) + '</span><div>' + f + '</div></div>'; }).join('') + '</div>';
    }
    if (c.cheatsheet) h += '<h2 style="margin-top:32px">🧾 Cheat sheet</h2><div class="card unit-body">' + c.cheatsheet + '</div>';
    return h || '<div class="empty">Chưa có ghi chú.</div>';
  }
  function pager(m) {
    var prev = MODS[m.index - 1], next = MODS[m.index + 1];
    return '<div class="pager">' + (prev ? '<a class="card" href="#/m/' + prev.id + '"><div class="k">← Module trước</div>' + esc(modName(prev)) + '</a>' : '<span></span>') +
      (next ? '<a class="card next" href="#/m/' + next.id + '"><div class="k">Module tiếp →</div>' + esc(modName(next)) + '</a>' : '') + '</div>';
  }

  /* ---------- Flashcard ---------- */
  var DECK = null;
  function buildDeck(cards, title) { DECK = { cards: cards, pos: 0, flipped: false, title: title }; }
  function renderDeck() {
    var host = $('#deckHost'); if (!host) return;
    if (!DECK || !DECK.cards.length) { host.innerHTML = '<div class="empty">Không có thẻ nào trong bộ này. 🎉</div>'; return; }
    var cd = DECK.cards[DECK.pos], st = S.cards[cd.key];
    var known = DECK.cards.filter(function (x) { return S.cards[x.key] === 'known'; }).length;
    host.innerHTML = '<div class="deck"><div class="deck-ctrl" style="margin:0 0 12px"><span class="muted small">Thẻ ' + (DECK.pos + 1) + '/' + DECK.cards.length + (cd.mod ? ' · ' + esc(modName(MOD[cd.mod])) : '') + '</span><span class="small">Đã nhớ: <strong>' + known + '</strong>/' + DECK.cards.length + '</span></div>' +
      '<div class="flash' + (DECK.flipped ? ' flipped' : '') + '" data-act="flip" tabindex="0" aria-label="Lật thẻ"><div class="flash-inner">' +
      '<div class="flash-face"><span class="lbl">Câu hỏi' + (st ? ' · ' + (st === 'known' ? '✓ đã nhớ' : '↻ cần ôn') : '') + '</span><div class="txt">' + cd.front + '</div><div class="muted small" style="margin-top:16px">Nhấn để lật (phím Space)</div></div>' +
      '<div class="flash-face back"><span class="lbl">Đáp án</span><div class="txt">' + cd.back + '</div></div></div></div>' +
      '<div class="deck-ctrl"><button class="btn" data-act="card-prev"' + (DECK.pos === 0 ? ' disabled' : '') + '>← Trước</button>' +
      '<div class="btn-row"><button class="btn" data-act="card-mark" data-v="again">↻ Chưa nhớ</button><button class="btn btn-success" data-act="card-mark" data-v="known">✓ Đã nhớ</button></div>' +
      '<button class="btn" data-act="card-next"' + (DECK.pos >= DECK.cards.length - 1 ? ' disabled' : '') + '>Sau →</button></div>' +
      '<div class="btn-row" style="justify-content:center;margin-top:12px"><button class="btn btn-sm" data-act="card-shuffle">🔀 Xáo trộn</button></div></div>';
  }
  function moduleCards(mid) {
    var c = CONTENT[mid]; if (!c || !c.flashcards) return [];
    return c.flashcards.map(function (f, i) { return { key: mid + ':' + i, front: f.front, back: f.back, mod: mid }; });
  }

  /* ---------- Quiz ---------- */
  var QUIZ = null, TIMER = null, MQSRC = 'own';
  var TYPE_LBL = { hotspot: 'Hotspot', dragdrop: 'Drag & drop', yesno: 'Yes / No' };
  function stopTimer() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }
  function startQuiz(questions, ctx) { stopTimer(); QUIZ = { qs: questions, ctx: ctx, graded: false }; }
  function qBadges(q) {
    var b = '';
    if (q.src === 'bank') b += '<span class="badge">Đề #' + q.n + '</span> ';
    if (TYPE_LBL[q.type]) b += '<span class="badge accent">' + TYPE_LBL[q.type] + '</span> ';
    if (q.status === 'outdated') b += '<span class="badge extra">🕒 Có thể lỗi thời</span> ';
    if (q.status === 'disputed') b += '<span class="badge danger">⚠ Đáp án gây tranh cãi</span> ';
    if (q.mod && MOD[q.mod] && !QUIZ.ctx.mid) b += '<span class="badge">' + esc(modName(MOD[q.mod])) + '</span>';
    return b;
  }
  function renderQuiz(host) {
    if (!host || !QUIZ) return;
    if (!QUIZ.qs.length) { host.innerHTML = '<div class="card empty">Không có câu hỏi nào phù hợp bộ lọc.</div>'; return; }
    var h = '<form class="quiz" id="quizForm">';
    QUIZ.qs.forEach(function (q, i) {
      var bd = qBadges(q);
      h += '<div class="card q" data-i="' + i + '"><div class="q-head"><span class="q-num">Câu ' + (i + 1) + '.</span><div class="q-tags">' + bd + '</div></div>';
      if (q.options) {
        var multi = q.answer.length > 1, type = multi ? 'checkbox' : 'radio';
        h += '<div class="q-body q-text">' + q.q + (multi ? ' <span class="badge accent">Chọn ' + q.answer.length + ' đáp án</span>' : '') + '</div><div class="opts">';
        q.options.forEach(function (o, j) {
          h += '<label class="opt" data-j="' + j + '"><input type="' + type + '" name="q' + i + '" value="' + j + '"><span>' + String.fromCharCode(65 + j) + '. ' + o + '</span></label>';
        });
        h += '</div>';
      } else {
        h += '<div class="q-body">' + q.q + '</div><div class="reveal-box"><button type="button" class="btn btn-sm" data-act="reveal" data-i="' + i + '">👁 Xem đáp án & tự chấm</button>' +
          '<div class="ans-area" hidden><div class="ans-lbl">Đáp án</div>' + (q.answerHtml || '') +
          '<div class="opts self"><label class="opt"><input type="radio" name="q' + i + '" value="1"><span>✓ Tôi làm đúng</span></label><label class="opt"><input type="radio" name="q' + i + '" value="0"><span>✗ Tôi làm sai</span></label></div></div></div>';
      }
      h += '<div class="explain"></div></div>';
    });
    h += '<div class="card quiz-bar"><span class="muted small" id="quizInfo">' + QUIZ.qs.length + ' câu · trả lời xong hãy nộp bài để xem giải thích</span><div class="btn-row"><span class="score" id="quizTimer"></span><button type="button" class="btn" data-act="quiz-reset">↺ Làm lại</button><button type="submit" class="btn btn-primary">Nộp bài</button></div></div></form>';
    host.innerHTML = h;
    if (QUIZ.ctx.timer) {
      QUIZ.deadline = Date.now() + QUIZ.ctx.timer * 60000;
      var tick = function () {
        var left = Math.max(0, QUIZ.deadline - Date.now()), el = $('#quizTimer');
        if (!el) { stopTimer(); return; }
        el.textContent = '⏱ ' + Math.floor(left / 60000) + ':' + pad(Math.floor(left / 1000) % 60);
        if (!left) { stopTimer(); alert('Hết giờ! Bài làm được nộp tự động.'); gradeQuiz(); }
      };
      tick(); TIMER = setInterval(tick, 1000);
    }
  }
  function explainHtml(q, ok, ansTxt) {
    var h = '<span class="q-res ' + (ok ? 'ok">✓ Đúng' : 'bad">✗ Sai') + '</span>' + (ansTxt ? ' Đáp án: <strong>' + ansTxt + '</strong>' : '');
    if (q.note) h += '<div class="callout ' + (q.status === 'disputed' ? 'warn"><strong>Đáp án trong đề có thể sai</strong>' : 'note"><strong>Có thể đã lỗi thời</strong>') + esc(q.note) + '</div>';
    if (q.vi) h += '<div style="margin-top:8px"><strong>Giải thích:</strong> ' + esc(q.vi) + '</div>';
    if (q.source && /^https:\/\/learn\.microsoft\.com\//.test(q.source)) h += '<div class="small" style="margin-top:6px">' + (q.verified ? '<span class="badge success">✓ Đã đối chiếu tài liệu</span> ' : '') + 'Nguồn: <a href="' + esc(q.source) + '" target="_blank" rel="noopener">Microsoft Learn ↗</a></div>';
    if (q.explain) h += q.src === 'bank' ? '<details class="orig"><summary>Giải thích gốc trong đề (tiếng Anh)</summary>' + q.explain + '</details>' : '<div style="margin-top:6px">' + q.explain + '</div>';
    return h;
  }
  function gradeQuiz() {
    if (!QUIZ || QUIZ.graded) return;
    stopTimer();
    var right = 0;
    QUIZ.qs.forEach(function (q, i) {
      var box = $('.q[data-i="' + i + '"]'), ok, ansTxt = '';
      if (q.options) {
        var chosen = $all('input[name="q' + i + '"]:checked', box).map(function (x) { return +x.value; }).sort();
        var ans = q.answer.slice().sort();
        ok = chosen.length === ans.length && chosen.every(function (v, k) { return v === ans[k]; });
        $all('.opt', box).forEach(function (el) {
          var j = +el.getAttribute('data-j');
          if (ans.indexOf(j) >= 0) el.classList.add('correct');
          else if (chosen.indexOf(j) >= 0) el.classList.add('wrong');
          $('input', el).disabled = true;
        });
        ansTxt = ans.map(function (a) { return String.fromCharCode(65 + a); }).join(', ');
      } else {
        var v = $('input[name="q' + i + '"]:checked', box);
        ok = !!v && v.value === '1';
        $('.ans-area', box).hidden = false;
        var rb = $('[data-act="reveal"]', box); if (rb) rb.remove();
        $all('input', box).forEach(function (x) { x.disabled = true; });
        if (!v) ansTxt = 'chưa tự chấm (tính là sai)';
      }
      if (ok) right++;
      if (q.id) { var st = S.qstats[q.id] || { r: 0, w: 0 }; if (ok) st.r++; else st.w++; st.last = ok ? 1 : 0; S.qstats[q.id] = st; }
      box.classList.add('graded');
      $('.explain', box).innerHTML = explainHtml(q, ok, ansTxt);
    });
    QUIZ.graded = true;
    var score = pct(right, QUIZ.qs.length);
    if (QUIZ.ctx.mid && QUIZ.ctx.src === 'own') {
      var prev = S.quiz[QUIZ.ctx.mid] || { best: 0, attempts: 0 };
      S.quiz[QUIZ.ctx.mid] = { best: Math.max(prev.best, score), last: score, attempts: prev.attempts + 1, at: Date.now() };
    } else if (!QUIZ.ctx.mid && !QUIZ.ctx.single) {
      S.practice.unshift({ at: Date.now(), right: right, total: QUIZ.qs.length, scope: QUIZ.ctx.scope, label: QUIZ.ctx.label });
      S.practice = S.practice.slice(0, 50);
    }
    touch(); save();
    if (QUIZ.ctx.single) {
      $('#quizInfo').innerHTML = '<span class="score" style="color:' + (right ? 'var(--success)' : 'var(--danger)') + '">' + (right ? '✓ Đúng' : '✗ Sai') + '</span>' +
        (QUIZ.ctx.next ? ' <a class="btn btn-sm btn-primary" href="#/bank/' + QUIZ.ctx.next + '">Câu tiếp #' + QUIZ.ctx.next + ' →</a>' : '');
    } else
    $('#quizInfo').innerHTML = '<span class="score" style="color:' + (score >= 70 ? 'var(--success)' : 'var(--danger)') + '">' + right + '/' + QUIZ.qs.length + ' · ' + score + '%</span> ' + (score >= 70 ? '— Đạt! 🎉' : '— Dưới 70%, hãy xem lại các câu sai.');
    renderSidebar(); refreshModHead();
    $('#quizInfo').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  /* Câu hỏi của module = chỉ câu soạn theo bài học (ngân hàng đề PDF là mục riêng) */
  function moduleQuestions(mid) {
    var c = CONTENT[mid];
    return c && c.quiz ? c.quiz.map(function (q, i) { return Object.assign({ mod: mid, id: mid + '-q' + i, src: 'own' }, q); }) : [];
  }

  /* ---------- Ôn tập, Luyện đề, Đánh dấu ---------- */
  var REVIEW_MODE = 'all';
  function viewReview() {
    var h = '<div class="page-head"><h1>🃏 Ôn tập flashcard</h1><p>Gom thẻ từ tất cả module đã có nội dung. Đánh dấu "Chưa nhớ" để thẻ quay lại trong chế độ <em>Cần ôn</em>.</p></div>' +
      '<div class="btn-row" style="margin-bottom:20px"><div class="seg">' +
      [['all', 'Tất cả'], ['again', 'Cần ôn'], ['new', 'Chưa xem']].map(function (x) { return '<button data-act="review-mode" data-v="' + x[0] + '" class="' + (REVIEW_MODE === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') +
      '</div><select id="reviewPath"><option value="">Mọi lộ trình</option>' + CUR.paths.map(function (p, i) { return '<option value="' + p.id + '">' + (i + 1) + '. ' + esc(p.title) + '</option>'; }).join('') + '</select></div><div id="deckHost"></div>';
    return h;
  }
  function reviewDeck() {
    var pid = $('#reviewPath') ? $('#reviewPath').value : '';
    var cards = [];
    MODS.forEach(function (m) { if (!pid || m.path.id === pid) cards = cards.concat(moduleCards(m.id)); });
    if (REVIEW_MODE === 'again') cards = cards.filter(function (c) { return S.cards[c.key] === 'again'; });
    if (REVIEW_MODE === 'new') cards = cards.filter(function (c) { return !S.cards[c.key]; });
    buildDeck(shuffle(cards)); renderDeck();
  }
  /* ---------- Ngân hàng đề ---------- */
  var BANKMAP = {}, BANKLIST = null, BANKNAV = {}, BANK_PAGE = 40;
  var TYPE_NAME = { mcq: 'Trắc nghiệm', yesno: 'Yes / No', hotspot: 'Hotspot', dragdrop: 'Drag & drop' };
  function qText(q) { if (q._t == null) q._t = strip(q.q); return q._t; }
  function bankFilter(f) {
    var terms = norm(f.q || '').split(/\s+/).filter(Boolean);
    return BANK.filter(function (q) {
      if (f.mod && q.mod !== f.mod && !(PATH[f.mod] && MOD[q.mod] && MOD[q.mod].path.id === f.mod)) return false;
      if (f.type && q.type !== f.type) return false;
      if (f.status && (q.status || 'ok') !== f.status) return false;
      var st = S.qstats[q.id];
      if (f.state === 'new' && st) return false;
      if (f.state === 'wrong' && !(st && st.last === 0)) return false;
      if (f.state === 'right' && !(st && st.last === 1)) return false;
      if (terms.length) {
        if (!q._n) q._n = norm(qText(q) + ' ' + (q.vi || '') + ' #' + q.n);
        for (var i = 0; i < terms.length; i++) if (q._n.indexOf(terms[i]) < 0) return false;
      }
      return true;
    });
  }
  function bankHash(f) {
    var parts = [];
    ['mod', 'type', 'status', 'state', 'q', 'page'].forEach(function (k) { if (f[k]) parts.push(k + '=' + encodeURIComponent(f[k])); });
    return '#/bank' + (parts.length ? '?' + parts.join('&') : '');
  }
  function viewBank(f) {
    f = f || {};
    if (!BANK.length) return '<div class="page-head"><h1>🗂️ Ngân hàng đề</h1></div><div class="card empty">Chưa có ngân hàng đề (content/questions/bank.js).</div>';
    var list = bankFilter(f);
    BANKLIST = list.map(function (q) { return q.n; });
    var bs = bankStats();
    var old = BANK.filter(function (q) { return q.status === 'outdated'; }).length, dis = BANK.filter(function (q) { return q.status === 'disputed'; }).length;
    var firstNew = BANK.filter(function (q) { return !S.qstats[q.id]; })[0];
    var opt = function (v, l, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>'; };
    var h = '<div class="page-head"><h1>🗂️ Ngân hàng đề</h1><p>' + bs.total + ' câu trích từ file PDF của bạn. Mỗi câu được gắn module, có giải thích tiếng Việt; câu lỗi thời hoặc có đáp án đáng ngờ được đánh dấu riêng.</p></div>' +
      '<div class="grid grid-4">' + stat(bs.done + '/' + bs.total, 'Đã làm') + stat('<span style="color:var(--success)">' + bs.right + '</span>', 'Đang đúng') + stat('<span style="color:var(--danger)">' + bs.wrong + '</span>', 'Đang sai') + stat(old + ' · ' + dis, '🕒 Lỗi thời · ⚠ Tranh cãi') + '</div>' +
      '<div class="btn-row" style="margin:16px 0">' + (firstNew ? '<a class="btn btn-primary" href="#/bank/' + firstNew.n + '">▶ Làm tiếp từ câu chưa làm (#' + firstNew.n + ')</a>' : '') +
      (bs.wrong ? '<a class="btn" href="' + bankHash({ state: 'wrong' }) + '">↻ Xem ' + bs.wrong + ' câu đang sai</a>' : '') + '<a class="btn" href="#bank-exam" data-act="scroll" data-target="bank-exam">⏱ Thi thử</a></div>';
    var mods = opt('', 'Tất cả module', f.mod || '') + CUR.paths.map(function (p, i) {
      return '<optgroup label="' + (i + 1) + '. ' + esc(p.title) + '">' + opt(p.id, 'Cả lộ trình ' + (i + 1), f.mod) + p.modules.map(function (m) {
        return opt(m.id, '— ' + esc(modName(m)) + ' (' + BANK.filter(function (q) { return q.mod === m.id; }).length + ')', f.mod);
      }).join('') + '</optgroup>';
    }).join('');
    h += '<div class="card bank-filters"><form id="bankSearch" class="grid grid-4" style="align-items:end">' +
      '<div class="field"><label for="bf-mod">Chủ đề</label><select id="bf-mod">' + mods + '</select></div>' +
      '<div class="field"><label for="bf-type">Loại câu</label><select id="bf-type">' + opt('', 'Tất cả', f.type || '') + Object.keys(TYPE_NAME).map(function (k) { return opt(k, TYPE_NAME[k], f.type); }).join('') + '</select></div>' +
      '<div class="field"><label for="bf-status">Trạng thái đáp án</label><select id="bf-status">' + opt('', 'Tất cả', f.status || '') + opt('ok', '✅ Bình thường', f.status) + opt('outdated', '🕒 Có thể lỗi thời', f.status) + opt('disputed', '⚠ Gây tranh cãi', f.status) + '</select></div>' +
      '<div class="field"><label for="bf-state">Kết quả của bạn</label><select id="bf-state">' + opt('', 'Tất cả', f.state || '') + opt('new', 'Chưa làm', f.state) + opt('wrong', 'Đang sai', f.state) + opt('right', 'Đang đúng', f.state) + '</select></div>' +
      '<div class="field" style="grid-column:1/-1"><label for="bf-q">Tìm trong nội dung câu hỏi (không dấu cũng được, hoặc #số câu)</label><input id="bf-q" type="search" value="' + esc(f.q || '') + '" placeholder="vd: peering, SAS, availability set, #120" style="height:38px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);padding:0 12px;font:inherit"></div>' +
      '</form></div>';
    var size = f.page === 'all' ? list.length || 1 : BANK_PAGE;
    var page = f.page === 'all' ? 1 : Math.max(1, +f.page || 1), pages = Math.max(1, Math.ceil(list.length / size));
    if (page > pages) page = pages;
    h += '<div class="section-title"><h2 style="font-size:1.1rem">' + list.length + ' câu' + (pages > 1 ? ' · trang ' + page + '/' + pages : '') + '</h2><div class="btn-row">' +
      (f.page === 'all' ? '<a class="small" href="' + bankHash(Object.assign({}, f, { page: '' })) + '">Chia trang</a>' : (list.length > BANK_PAGE ? '<a class="small" href="' + bankHash(Object.assign({}, f, { page: 'all' })) + '">Hiện tất cả ' + list.length + ' câu</a>' : '')) +
      (Object.keys(f).some(function (k) { return f[k] && k !== 'page'; }) ? '<a class="small" href="#/bank">✕ Bỏ lọc</a>' : '') + '</div></div>';
    if (!list.length) return h + bankExamPanel() + '<div class="card empty">Không có câu nào khớp bộ lọc.</div>';
    h += '<div class="bank-list">';
    list.slice((page - 1) * size, page * size).forEach(function (q) {
      var st = S.qstats[q.id], res = !st ? '<span class="bres">—</span>' : st.last ? '<span class="bres ok">✓</span>' : '<span class="bres bad">✗</span>';
      var t = qText(q).replace(/^Note:\s*The question is included in a number of questions.*?(?:requirements|the goal)\.\s*/i, '').replace(/^(HOTSPOT|DRAG DROP)\s*-?\s*/i, '');
      var sol = qText(q).match(/Solution:\s*(.*?)(?:Does the solution meet the goal\?|$)/i);
      t = t.length > 170 ? t.slice(0, 170) + '…' : t;
      if (sol) t += ' — Solution: ' + (sol[1].length > 110 ? sol[1].slice(0, 110) + '…' : sol[1]);
      h += '<a class="card bank-row" href="#/bank/' + q.n + '"><span class="bn">#' + q.n + '</span><div class="bt"><div class="q-tags"><span class="badge accent">' + TYPE_NAME[q.type] + '</span>' +
        (q.status === 'outdated' ? '<span class="badge extra">🕒 Lỗi thời</span>' : '') + (q.status === 'disputed' ? '<span class="badge danger">⚠ Tranh cãi</span>' : '') +
        (q.mod && MOD[q.mod] ? '<span class="badge">' + esc(modName(MOD[q.mod])) + '</span>' : '') + '</div><div class="snip">' + esc(t) + '</div></div>' + res + '</a>';
    });
    h += '</div>';
    if (pages > 1) {
      h += '<div class="btn-row" style="justify-content:center;margin-top:20px">';
      for (var i = 1; i <= pages; i++) h += '<a class="btn btn-sm' + (i === page ? ' btn-primary' : '') + '" href="' + bankHash(Object.assign({}, f, { page: i > 1 ? i : '' })) + '">' + i + '</a>';
      h += '<a class="btn btn-sm" href="' + bankHash(Object.assign({}, f, { page: 'all' })) + '">Tất cả</a></div>';
    }
    return h + bankExamPanel();
  }
  function bankExamPanel() {
    var opt = function (v, l) { return '<option value="' + v + '">' + l + '</option>'; };
    return '<div class="section-title" id="bank-exam"><h2>⏱ Luyện / thi thử với ngân hàng đề</h2></div><div class="card" style="margin-bottom:20px"><div class="grid grid-4" style="align-items:end">' +
      '<div class="field"><label for="bxMode">Cách chọn câu</label><select id="bxMode">' + opt('random', 'Ngẫu nhiên') + opt('new', 'Câu chưa làm') + opt('wrong', 'Câu đang làm sai') + opt('seq', 'Theo thứ tự đề') + '</select></div>' +
      '<div class="field"><label for="bxFrom">Từ câu số (theo thứ tự)</label><input id="bxFrom" type="number" min="1" max="' + BANK.length + '" value="1"></div>' +
      '<div class="field"><label for="bxN">Số câu</label><input id="bxN" type="number" min="1" max="' + BANK.length + '" value="50"></div>' +
      '<div class="field"><label for="bxTime">Hẹn giờ (phút, 0 = không)</label><input id="bxTime" type="number" min="0" max="300" value="100"></div></div>' +
      '<div class="btn-row" style="margin-top:14px"><label class="small"><input type="checkbox" id="bxSkip"> Bỏ câu lỗi thời / gây tranh cãi</label><button class="btn btn-primary" data-act="bank-start">Bắt đầu</button><span class="muted small">Mặc định: 50 câu / 100 phút, gần giống đề thật.</span></div></div><div id="quizHost"></div>';
  }
  function viewBankQ(n) {
    var q = BANKMAP[n]; if (!q) return notFound();
    var list = BANKLIST && BANKLIST.indexOf(n) >= 0 ? BANKLIST : BANK.map(function (x) { return x.n; });
    var i = list.indexOf(n);
    BANKNAV = { prev: list[i - 1], next: list[i + 1] };
    var nav = '<div class="btn-row bank-nav">' + (BANKNAV.prev ? '<a class="btn" href="#/bank/' + BANKNAV.prev + '">← #' + BANKNAV.prev + '</a>' : '<span></span>') +
      '<span class="muted small">' + (i + 1) + ' / ' + list.length + (list.length < BANK.length ? ' (đang lọc)' : '') + '</span>' +
      (BANKNAV.next ? '<a class="btn" href="#/bank/' + BANKNAV.next + '">#' + BANKNAV.next + ' →</a>' : '<span></span>') + '</div>';
    return '<div class="crumbs"><a href="#/">Tổng quan</a> / <a href="#/bank">Ngân hàng đề</a> / Câu #' + n + '</div>' + nav + '<div id="quizHost"></div>' + nav +
      '<p class="muted small" style="text-align:center">Phím tắt: <kbd>←</kbd> <kbd>→</kbd> chuyển câu · <kbd>Enter</kbd> nộp bài</p>';
  }
  function bankStats() {
    var done = 0, wrong = 0, right = 0;
    BANK.forEach(function (q) { var s = S.qstats[q.id]; if (s) { done++; if (s.last === 0) wrong++; else right++; } });
    return { total: BANK.length, done: done, wrong: wrong, right: right };
  }
  function viewPractice() {
    var own = 0; MODS.forEach(function (m) { own += moduleQuestions(m.id).length; });
    var opt = function (v, l) { return '<option value="' + v + '">' + l + '</option>'; };
    var scopes = opt('', 'Tất cả module') + CUR.paths.map(function (p, i) {
      return '<optgroup label="' + (i + 1) + '. ' + esc(p.title) + '">' + opt(p.id, 'Cả lộ trình ' + (i + 1)) + p.modules.map(function (m) { return opt(m.id, '— ' + esc(modName(m)) + ' (' + moduleQuestions(m.id).length + ')'); }).join('') + '</optgroup>';
    }).join('');
    var h = '<div class="page-head"><h1>📝 Luyện tổng hợp</h1><p>Trộn ' + own + ' câu soạn theo bài học của 28 module để ôn chéo nhiều chủ đề. Câu hỏi từ file PDF nằm ở mục riêng <a href="#/bank">🗂️ Ngân hàng đề</a>.</p></div>';
    h += '<div class="card" style="margin-bottom:20px"><div class="grid grid-2" style="align-items:end">' +
      '<div class="field"><label for="pfScope">Phạm vi</label><select id="pfScope">' + scopes + '</select></div>' +
      '<div class="field"><label for="pfMode">Cách chọn câu</label><select id="pfMode">' + opt('random', 'Ngẫu nhiên') + opt('new', 'Câu chưa làm') + opt('wrong', 'Câu đang làm sai') + '</select></div>' +
      '<div class="field"><label for="pfN">Số câu</label><input id="pfN" type="number" min="1" max="200" value="20"></div>' +
      '<div class="field"><label for="pfTime">Hẹn giờ (phút, 0 = không)</label><input id="pfTime" type="number" min="0" max="300" value="0"></div></div>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn btn-primary" data-act="practice-start">Bắt đầu</button></div></div><div id="quizHost"></div>';
    if (S.practice.length) {
      h += '<div class="section-title"><h2>Lịch sử luyện đề</h2></div><div class="card"><table class="domain-table"><thead><tr><th>Thời gian</th><th>Phạm vi</th><th>Kết quả</th></tr></thead><tbody>' +
        S.practice.slice(0, 10).map(function (r) { return '<tr><td>' + new Date(r.at).toLocaleString('vi-VN') + '</td><td>' + esc(r.label || (r.scope && PATH[r.scope] ? PATH[r.scope].title : 'Tất cả')) + '</td><td><strong>' + r.right + '/' + r.total + '</strong> (' + pct(r.right, r.total) + '%)</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    return h;
  }
  function viewBookmarks() {
    var keys = Object.keys(S.bookmarks);
    var h = '<div class="page-head"><h1>🔖 Mục đã đánh dấu</h1><p>Nhấn ☆ ở góc mỗi mục kiến thức để lưu vào đây.</p></div>';
    if (!keys.length) return h + '<div class="card empty">Chưa có mục nào được đánh dấu.</div>';
    keys.forEach(function (k) {
      var p = k.split(':'), m = MOD[p[0]], c = CONTENT[p[0]];
      var sec = c && c.sections.filter(function (s) { return s.id === p[1]; })[0];
      if (!m || !sec) return;
      h += '<a class="card result" href="#/m/' + m.id + '/learn/' + sec.id + '"><div class="t">' + esc(sec.title) + '</div><div class="s">' + esc(modName(m)) + ' · ' + esc(m.path.title) + '</div></a>';
    });
    return h;
  }

  /* ---------- Tìm kiếm ---------- */
  var INDEX = null;
  function buildIndex() {
    INDEX = [];
    MODS.forEach(function (m) {
      var c = CONTENT[m.id]; if (!c) return;
      c.sections.forEach(function (s) { var t = strip(s.html); INDEX.push({ mid: m.id, sid: s.id, title: s.title, text: t, n: norm(s.title + ' ' + t) }); });
    });
  }
  function viewSearch(q) {
    if (!INDEX) buildIndex();
    var terms = norm(q).split(/\s+/).filter(Boolean);
    var h = '<div class="page-head"><h1>Kết quả tìm kiếm</h1><p>Từ khóa: <strong>' + esc(q) + '</strong></p></div>';
    if (!terms.length) return h;
    var res = INDEX.map(function (e) {
      var sc = 0; terms.forEach(function (t) { var i = e.n.indexOf(t); if (i >= 0) sc += 1 + (norm(e.title).indexOf(t) >= 0 ? 3 : 0); else sc -= 100; });
      return { e: e, sc: sc };
    }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 40);
    if (!res.length) return h + '<div class="card empty">Không tìm thấy. Thử từ khóa khác (không dấu cũng được).</div>';
    res.forEach(function (r) {
      var e = r.e, i = e.n.indexOf(terms[0]), start = Math.max(0, i - 80);
      var snip = (start ? '…' : '') + esc(e.text.substr(start, 220)) + '…';
      h += '<a class="card result" href="#/m/' + e.mid + '/learn/' + e.sid + '"><div class="t">' + esc(e.title) + '</div><div class="small muted">' + esc(modName(MOD[e.mid])) + '</div><div class="s">' + snip + '</div></a>';
    });
    return h;
  }

  /* ---------- Cài đặt ---------- */
  function viewSettings() {
    return '<div class="page-head"><h1>⚙️ Cài đặt & sao lưu</h1><p>Tiến trình học lưu trong trình duyệt này. Hãy xuất file định kỳ để không mất dữ liệu khi xóa cache hoặc đổi máy.</p></div>' +
      '<div class="grid grid-2"><div class="card"><h3>Sao lưu tiến trình</h3><p class="muted small">Tải file JSON chứa toàn bộ tiến trình, điểm quiz, thẻ và đánh dấu.</p><button class="btn btn-primary" data-act="export">⬇ Xuất file</button></div>' +
      '<div class="card"><h3>Khôi phục</h3><p class="muted small">Nạp lại file đã xuất. Dữ liệu hiện tại sẽ bị thay thế.</p><label class="btn">⬆ Chọn file<input type="file" id="importFile" accept="application/json" hidden></label></div>' +
      '<div class="card"><h3>Giao diện</h3><div class="seg">' + [['', 'Theo hệ thống'], ['light', 'Sáng'], ['dark', 'Tối']].map(function (x) { return '<button data-act="set-theme" data-v="' + x[0] + '" class="' + ((document.documentElement.getAttribute('data-theme') || '') === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>Xóa tiến trình</h3><p class="muted small">Bắt đầu lại từ đầu. Không thể hoàn tác.</p><button class="btn" style="color:var(--danger)" data-act="reset">Xóa toàn bộ</button></div></div>';
  }

  function notFound() { return '<div class="empty"><h2>Không tìm thấy trang</h2><a href="#/">Về trang tổng quan</a></div>'; }

  /* ---------- Router ---------- */
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?');
    var path = qi >= 0 ? h.slice(0, qi) : h, query = qi >= 0 ? h.slice(qi + 1) : '';
    var p = path.split('/').filter(Boolean).map(decodeURIComponent);
    var q = {}; query.split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    if (!p.length) return { name: 'home' };
    if (p[0] === 'path') return { name: 'path', pid: p[1] };
    if (p[0] === 'm') return { name: 'module', mid: p[1], tab: p[2] || 'learn', sid: p[3] };
    if (p[0] === 'search') return { name: 'search', q: q.q || '' };
    if (p[0] === 'bank') return p[1] ? { name: 'bankq', n: +p[1] } : { name: 'bank', f: q };
    return { name: p[0] };
  }
  function route() {
    stopTimer();
    ROUTE = parse();
    var main = $('#main'), html;
    switch (ROUTE.name) {
      case 'home': html = viewHome(); break;
      case 'path': html = viewPath(ROUTE.pid); break;
      case 'module': html = viewModule(ROUTE.mid, ROUTE.tab); break;
      case 'review': html = viewReview(); break;
      case 'practice': html = viewPractice(); break;
      case 'bank': html = viewBank(ROUTE.f); break;
      case 'bankq': html = viewBankQ(ROUTE.n); break;
      case 'bookmarks': html = viewBookmarks(); break;
      case 'settings': html = viewSettings(); break;
      case 'search': html = viewSearch(ROUTE.q); break;
      default: html = notFound();
    }
    main.innerHTML = html;
    document.body.classList.remove('nav-open');
    renderSidebar();
    if (ROUTE.name === 'module' && CONTENT[ROUTE.mid]) {
      if (ROUTE.tab === 'cards') { buildDeck(moduleCards(ROUTE.mid)); renderDeck(); }
      if (ROUTE.tab === 'quiz') { startQuiz(moduleQuestions(ROUTE.mid), { mid: ROUTE.mid, src: 'own' }); renderQuiz($('#quizHost')); }
    }
    if (ROUTE.name === 'review') reviewDeck();
    if (ROUTE.name === 'bankq' && BANKMAP[ROUTE.n]) { startQuiz([BANKMAP[ROUTE.n]], { single: true, next: BANKNAV.next }); renderQuiz($('#quizHost')); }
    var titles = { bank: 'Ngân hàng đề', bankq: 'Câu #' + ROUTE.n, home: 'Tổng quan', review: 'Ôn tập', practice: 'Luyện đề', bookmarks: 'Đánh dấu', settings: 'Cài đặt', search: 'Tìm kiếm' };
    document.title = (ROUTE.name === 'module' && MOD[ROUTE.mid] ? modName(MOD[ROUTE.mid]) : ROUTE.name === 'path' && PATH[ROUTE.pid] ? PATH[ROUTE.pid].title : titles[ROUTE.name] || 'AZ-104') + ' · AZ-104 Sổ tay ôn thi';
    if (ROUTE.sid) { var el = document.getElementById('sec-' + ROUTE.sid); if (el) { el.scrollIntoView(); return; } }
    window.scrollTo(0, 0);
  }

  function refreshModHead() {
    if (ROUTE.name !== 'module') return;
    var s = modStats(ROUTE.mid);
    var b = $('#modProgBar'), t = $('#modProgTxt');
    if (b) b.innerHTML = bar(s.pct, s.complete);
    if (t) t.innerHTML = progText(s);
  }

  /* ---------- Sự kiện ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    switch (act) {
      case 'menu': document.body.classList.toggle('nav-open'); break;
      case 'theme': {
        var cur = document.documentElement.getAttribute('data-theme');
        var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(dark ? 'light' : 'dark'); break;
      }
      case 'set-theme': setTheme(el.getAttribute('data-v')); route(); break;
      case 'toggle-sec': {
        var k = el.getAttribute('data-key');
        if (S.sections[k]) delete S.sections[k]; else { S.sections[k] = Date.now(); touch(); }
        save();
        var done = !!S.sections[k], sec = el.closest('.unit');
        sec.classList.toggle('done', done);
        el.className = 'btn btn-sm ' + (done ? 'btn-success' : 'btn-primary');
        el.textContent = done ? '✓ Đã học xong' : 'Đánh dấu đã học';
        var tl = $('[data-tock="' + k + '"]');
        if (tl) { tl.classList.toggle('done', done); $('.ck', tl).textContent = done ? '✓' : '○'; }
        renderSidebar(); refreshModHead();
        if (done) { var nx = sec.nextElementSibling; if (nx && nx.classList.contains('unit') && !nx.classList.contains('done')) nx.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        break;
      }
      case 'bookmark': {
        var bk = el.getAttribute('data-key');
        if (S.bookmarks[bk]) delete S.bookmarks[bk]; else S.bookmarks[bk] = Date.now();
        save(); el.classList.toggle('on', !!S.bookmarks[bk]); el.textContent = S.bookmarks[bk] ? '★' : '☆'; break;
      }
      case 'scroll': ev.preventDefault(); var tg = document.getElementById(el.getAttribute('data-target')); if (tg) tg.scrollIntoView({ behavior: 'smooth' }); break;
      case 'flip': DECK.flipped = !DECK.flipped; el.classList.toggle('flipped', DECK.flipped); break;
      case 'card-prev': if (DECK.pos > 0) { DECK.pos--; DECK.flipped = false; renderDeck(); } break;
      case 'card-next': if (DECK.pos < DECK.cards.length - 1) { DECK.pos++; DECK.flipped = false; renderDeck(); } break;
      case 'card-mark': {
        S.cards[DECK.cards[DECK.pos].key] = el.getAttribute('data-v'); touch(); save();
        if (DECK.pos < DECK.cards.length - 1) { DECK.pos++; DECK.flipped = false; }
        renderDeck(); break;
      }
      case 'card-shuffle': DECK.cards = shuffle(DECK.cards); DECK.pos = 0; DECK.flipped = false; renderDeck(); break;
      case 'review-mode': REVIEW_MODE = el.getAttribute('data-v'); $all('[data-act="review-mode"]').forEach(function (b) { b.classList.toggle('on', b === el); }); reviewDeck(); break;
      case 'quiz-reset': startQuiz(QUIZ.ctx.mid ? moduleQuestions(QUIZ.ctx.mid) : (QUIZ.ctx.single ? QUIZ.qs : shuffle(QUIZ.qs)), QUIZ.ctx); renderQuiz($('#quizHost')); $('#quizHost').scrollIntoView(); break;
      case 'reveal': {
        var qb = el.closest('.q'); $('.ans-area', qb).hidden = false; el.remove(); break;
      }
      case 'practice-start': {
        var scope = $('#pfScope').value, mode = $('#pfMode').value;
        var n = Math.max(1, Math.min(200, +$('#pfN').value || 20)), mins = Math.max(0, +$('#pfTime').value || 0);
        var pool = [];
        MODS.forEach(function (m) { if (!scope || scope === m.path.id || scope === m.id) pool = pool.concat(moduleQuestions(m.id)); });
        if (mode === 'wrong') pool = pool.filter(function (q) { return S.qstats[q.id] && S.qstats[q.id].last === 0; });
        if (mode === 'new') pool = pool.filter(function (q) { return !S.qstats[q.id]; });
        pool = shuffle(pool).slice(0, n);
        var lbl = 'Câu theo bài học · ' + (scope ? (PATH[scope] ? PATH[scope].title : modName(MOD[scope])) : 'Tất cả');
        startQuiz(pool, { scope: scope || null, label: lbl, timer: mins }); renderQuiz($('#quizHost'));
        if (pool.length) $('#quizHost').scrollIntoView({ behavior: 'smooth' });
        break;
      }
      case 'bank-start': {
        var bn = Math.max(1, Math.min(BANK.length, +$('#bxN').value || 50)), bm = Math.max(0, +$('#bxTime').value || 0), bmode = $('#bxMode').value;
        var bpool = BANK.slice();
        if ($('#bxSkip').checked) bpool = bpool.filter(function (q) { return q.status === 'ok' || !q.status; });
        if (bmode === 'new') bpool = bpool.filter(function (q) { return !S.qstats[q.id]; });
        if (bmode === 'wrong') bpool = bpool.filter(function (q) { return S.qstats[q.id] && S.qstats[q.id].last === 0; });
        if (bmode === 'seq') { var bf = +$('#bxFrom').value || 1; bpool = bpool.filter(function (q) { return q.n >= bf; }).slice(0, bn); }
        else bpool = shuffle(bpool).slice(0, bn);
        startQuiz(bpool, { label: 'Ngân hàng đề · ' + $('#bxMode').selectedOptions[0].textContent, timer: bm, bank: true });
        renderQuiz($('#quizHost'));
        if (bpool.length) $('#quizHost').scrollIntoView({ behavior: 'smooth' });
        break;
      }
      case 'export': {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'az104-tien-trinh-' + today() + '.json'; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); break;
      }
      case 'reset': if (confirm('Xóa toàn bộ tiến trình học? Không thể hoàn tác.')) { S = fresh(); save(); route(); } break;
    }
  });
  document.addEventListener('submit', function (ev) {
    if (ev.target.id === 'quizForm') { ev.preventDefault(); gradeQuiz(); }
    if (ev.target.id === 'bankSearch') { ev.preventDefault(); applyBankFilter(); }
    if (ev.target.id === 'searchForm') {
      ev.preventDefault(); var q = $('#searchInput').value.trim();
      if (q) location.hash = '#/search?q=' + encodeURIComponent(q);
    }
  });
  function applyBankFilter() {
    location.hash = bankHash({ mod: $('#bf-mod').value, type: $('#bf-type').value, status: $('#bf-status').value, state: $('#bf-state').value, q: $('#bf-q').value.trim() });
  }
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'reviewPath') reviewDeck();
    if (/^bf-(mod|type|status|state)$/.test(ev.target.id)) applyBankFilter();
    if (ev.target.id === 'importFile' && ev.target.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (!d.sections) throw 0; S = Object.assign(fresh(), d); save(); alert('Đã khôi phục tiến trình.'); route(); }
        catch (e) { alert('File không hợp lệ.'); }
      };
      r.readAsText(ev.target.files[0]);
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ROUTE.name === 'bankq' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (ev.key === 'ArrowRight' && BANKNAV.next) location.hash = '#/bank/' + BANKNAV.next;
      if (ev.key === 'ArrowLeft' && BANKNAV.prev) location.hash = '#/bank/' + BANKNAV.prev;
      if (ev.key === 'Enter' && QUIZ && !QUIZ.graded) { ev.preventDefault(); gradeQuiz(); }
      return;
    }
    if (!DECK || !$('#deckHost .flash')) return;
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (ev.key === ' ') { ev.preventDefault(); $('#deckHost .flash').click(); }
    if (ev.key === 'ArrowRight') { var n = $('[data-act="card-next"]'); if (n && !n.disabled) n.click(); }
    if (ev.key === 'ArrowLeft') { var p = $('[data-act="card-prev"]'); if (p && !p.disabled) p.click(); }
  });
  function setTheme(v) {
    if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme');
    try { if (v) localStorage.setItem('az104.theme', v); else localStorage.removeItem('az104.theme'); } catch (e) { /* bỏ qua */ }
  }
  window.addEventListener('hashchange', route);

  /* ---------- Nạp nội dung module rồi khởi động ---------- */
  function loadScript(src) {
    return new Promise(function (res) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s);
    });
  }
  var jobs = MODS.map(function (m) { return loadScript('content/modules/' + m.id + '.js'); });
  jobs.push(loadScript('content/questions/bank.js'));
  Promise.all(jobs).then(function () {
    BANK.forEach(function (q) { BANKMAP[q.n] = q; });
    route();
  });
})();

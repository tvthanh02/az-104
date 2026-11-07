AZ.addModule({
  id: 'p2m6',
  summary: 'Microsoft Entra <strong>self-service password reset (SSPR)</strong> cho phép người dùng tự đổi, đặt lại mật khẩu và mở khóa tài khoản mà không cần gọi helpdesk. Đề AZ-104 hay hỏi: bật SSPR cho ai (None / Selected / All), cần bao nhiêu phương thức xác thực, admin bị áp chính sách gì, cần license nào, khi nào phải bật <strong>password writeback</strong>, và cách tùy biến <strong>company branding</strong>. Module mở rộng thêm MFA và Conditional Access ở mức đủ cho AZ-104.',
  objectives: [
    'Giải thích SSPR gồm những chức năng gì và luồng kiểm tra khi người dùng đặt lại mật khẩu',
    'Cấu hình SSPR: phạm vi None / Selected / All, số phương thức (1 hoặc 2), phương thức cho phép, đăng ký, thông báo',
    'Phân biệt chính sách SSPR cho người dùng thường và chính sách two-gate bắt buộc cho admin',
    'Xác định license cần cho SSPR cloud-only và SSPR có writeback',
    'Cấu hình password writeback qua Microsoft Entra Connect / cloud sync và company branding',
    'Chọn đúng giữa security defaults, per-user MFA và Conditional Access'
  ],
  sections: [
    {
      id: 'what-is-sspr',
      unit: 'What is self-service password reset in Microsoft Entra ID?',
      title: 'SSPR là gì và hoạt động như thế nào?',
      html: `
<p><strong>SSPR</strong> giúp người dùng tự xử lý khi quên mật khẩu hoặc bị khóa tài khoản, giảm tải helpdesk. SSPR gồm:</p>
<ul>
  <li><strong>Password change</strong>: biết mật khẩu cũ, muốn đổi sang mật khẩu mới.</li>
  <li><strong>Password reset</strong>: quên mật khẩu, xác minh danh tính bằng phương thức đã đăng ký rồi đặt mật khẩu mới.</li>
  <li><strong>Account unlock</strong>: mở khóa tài khoản (kể cả tài khoản on-premises khi có writeback).</li>
  <li><strong>Password writeback</strong>: ghi mật khẩu mới từ cloud về Active Directory on-premises.</li>
</ul>

<h4>Người dùng đặt lại mật khẩu ở đâu?</h4>
<ul>
  <li>Liên kết <strong>Can't access your account?</strong> / <strong>Forgot my password</strong> trên trang đăng nhập.</li>
  <li>Trực tiếp: <code>https://aka.ms/sspr</code> (<code>passwordreset.microsoftonline.com</code>).</li>
  <li>Đăng ký phương thức: <code>https://aka.ms/ssprsetup</code> hoặc trang <em>Security info</em> (<code>https://aka.ms/mysecurityinfo</code>, đăng ký kết hợp MFA + SSPR).</li>
  <li>Màn hình đăng nhập Windows (liên kết "Reset password" trên thiết bị Microsoft Entra joined / hybrid joined khi được cấu hình).</li>
</ul>

<h4>Microsoft Entra ID kiểm tra những gì khi người dùng vào trang SSPR?</h4>
<ol class="steps">
  <li>Hiển thị theo ngôn ngữ trình duyệt; người dùng nhập user ID và giải captcha.</li>
  <li>Người dùng có được bật SSPR không? Không → "liên hệ admin".</li>
  <li>Người dùng đã đăng ký đủ số phương thức mà chính sách yêu cầu (1 hoặc 2) chưa? Chưa → "liên hệ admin".</li>
  <li>Người dùng có Microsoft Entra admin role không? Có → áp <strong>chính sách two-gate</strong> mạnh của admin.</li>
  <li>Mật khẩu được quản lý ở đâu? Nếu là tài khoản đồng bộ từ on-premises (PHS, PTA, federation): chỉ cho reset khi <strong>password writeback</strong> đã bật; nếu không → "liên hệ admin".</li>
</ol>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 392" role="img" aria-label="Luồng kiểm tra khi người dùng dùng self-service password reset">
  <rect class="box" x="40" y="20" width="300" height="40" rx="8"/>
  <text x="190" y="45" text-anchor="middle">Nhập user ID + captcha</text>
  <rect class="box" x="40" y="84" width="300" height="40" rx="8"/>
  <text x="190" y="109" text-anchor="middle">SSPR bật cho user này?</text>
  <rect class="box" x="40" y="148" width="300" height="40" rx="8"/>
  <text x="190" y="173" text-anchor="middle">Đã đăng ký đủ phương thức?</text>
  <rect class="box" x="40" y="212" width="300" height="40" rx="8"/>
  <text x="190" y="237" text-anchor="middle">Có Microsoft Entra admin role?</text>
  <rect class="box" x="40" y="276" width="300" height="40" rx="8"/>
  <text x="190" y="301" text-anchor="middle">Tài khoản đồng bộ từ AD on-prem?</text>
  <rect class="box-s" x="40" y="340" width="300" height="40" rx="8"/>
  <text x="190" y="365" text-anchor="middle" class="t-b t-s">Xác minh → đặt mật khẩu mới</text>

  <line class="ln-s" x1="190" y1="60" x2="190" y2="80" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="190" y1="124" x2="190" y2="144" marker-end="url(#arr-s)"/>
  <text x="200" y="139" class="t-sm t-s">có</text>
  <line class="ln-s" x1="190" y1="188" x2="190" y2="208" marker-end="url(#arr-s)"/>
  <text x="200" y="203" class="t-sm t-s">có</text>
  <line class="ln-s" x1="190" y1="252" x2="190" y2="272" marker-end="url(#arr-s)"/>
  <text x="200" y="267" class="t-sm t-s">tiếp tục</text>
  <line class="ln-s" x1="190" y1="316" x2="190" y2="336" marker-end="url(#arr-s)"/>
  <text x="200" y="331" class="t-sm t-s">không, hoặc có writeback</text>

  <rect class="box-x" x="400" y="84" width="310" height="40" rx="8"/>
  <text x="555" y="109" text-anchor="middle" class="t-sm">không → "Liên hệ admin"</text>
  <rect class="box-x" x="400" y="148" width="310" height="40" rx="8"/>
  <text x="555" y="173" text-anchor="middle" class="t-sm">chưa đủ 1 hoặc 2 phương thức → "Liên hệ admin"</text>
  <rect class="box-w" x="400" y="212" width="310" height="40" rx="8"/>
  <text x="555" y="229" text-anchor="middle" class="t-sm">có → chính sách two-gate: 2 phương thức,</text>
  <text x="555" y="245" text-anchor="middle" class="t-sm">không dùng security questions</text>
  <rect class="box-x" x="400" y="276" width="310" height="40" rx="8"/>
  <text x="555" y="293" text-anchor="middle" class="t-sm">có nhưng chưa bật password writeback</text>
  <text x="555" y="309" text-anchor="middle" class="t-sm">→ "Liên hệ admin"</text>

  <line class="ln-x" x1="340" y1="104" x2="396" y2="104" marker-end="url(#arr-x)"/>
  <line class="ln-x" x1="340" y1="168" x2="396" y2="168" marker-end="url(#arr-x)"/>
  <line class="ln dash" x1="340" y1="232" x2="396" y2="232" marker-end="url(#arr)"/>
  <line class="ln-x" x1="340" y1="296" x2="396" y2="296" marker-end="url(#arr-x)"/>
</svg>
<figcaption>Hình 1. Microsoft Entra ID kiểm tra lần lượt trước khi cho đặt lại mật khẩu. Admin không bị chặn mà bị áp chính sách two-gate rồi đi tiếp; user đồng bộ từ AD chỉ reset được khi bật writeback.</figcaption>
</figure>

<h4>License</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Entra ID Free</th><th>M365 Business Standard</th><th>M365 Business Premium</th><th>Entra ID P1 / P2</th></tr></thead>
  <tbody>
    <tr><td>Cloud user <strong>đổi</strong> mật khẩu (biết mật khẩu cũ)</td><td>Có</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>Cloud user <strong>đặt lại</strong> mật khẩu (quên)</td><td>Không</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>Hybrid user đổi / đặt lại kèm <strong>writeback</strong></td><td>Không</td><td>Không</td><td>Có</td><td>Có</td></tr>
  </tbody>
</table>
<p>Mỗi người dùng được hưởng lợi từ SSPR cần có license phù hợp.</p>

<h4>Chính sách mật khẩu cloud cần nhớ</h4>
<ul>
  <li>Mật khẩu 8–256 ký tự, cần 3 trong 4 loại: chữ thường, chữ hoa, số, ký hiệu.</li>
  <li>Smart lockout mặc định khóa sau <strong>10</strong> lần sai, khóa 1 phút và tăng dần.</li>
  <li>Tenant tạo từ 2021 trở đi mặc định mật khẩu <strong>không hết hạn</strong>; tenant cũ hơn mặc định 90 ngày.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Người dùng đồng bộ từ AD on-premises thấy thông báo liên hệ admin khi dùng SSPR, trong khi user cloud-only thì dùng được" → chưa bật <strong>password writeback</strong>. "Tenant chỉ có Entra ID Free, user quên mật khẩu tự reset được không?" → <strong>không</strong>; cần P1/P2 hoặc Microsoft 365 Business Standard trở lên.</div>
`
    },
    {
      id: 'implement-sspr',
      unit: 'Implement Microsoft Entra self-service password reset',
      title: 'Triển khai SSPR: các thiết lập quan trọng',
      html: `
<p>Cấu hình ở <strong>Microsoft Entra admin center → Entra ID → Password reset</strong>. Vai trò tối thiểu để cấu hình: <strong>Authentication Policy Administrator</strong> (Global Administrator cũng làm được).</p>

<h4>Properties: bật cho ai?</h4>
<table>
  <thead><tr><th>Giá trị</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><strong>None</strong></td><td>Không người dùng nào dùng SSPR (admin vẫn có chính sách riêng)</td></tr>
    <tr><td><strong>Selected</strong></td><td>Chỉ thành viên của group được chọn; phù hợp pilot</td></tr>
    <tr><td><strong>All</strong></td><td>Mọi người dùng trong tenant</td></tr>
  </tbody>
</table>

<h4>Authentication methods</h4>
<ul>
  <li><strong>Number of methods required to reset</strong>: <strong>1</strong> hoặc <strong>2</strong>. Khuyến nghị cho phép nhiều phương thức hơn số yêu cầu để người dùng có lựa chọn dự phòng.</li>
  <li>Phương thức cho SSPR: thông báo Microsoft Authenticator, mã OATH (software / hardware), SMS, voice call (office phone là tùy chọn trong Voice calls), email OTP, và <strong>security questions</strong> (security questions không bao giờ dùng được cho admin).</li>
  <li><strong>Từ 30/09/2025</strong>, không còn quản lý phương thức trong chính sách SSPR (và MFA) legacy: phương thức được bật/nhắm theo group ở <strong>Entra ID › Authentication methods › Policies</strong>. Ngoại lệ: <strong>security questions</strong> vẫn chỉ bật được ở trang <em>Password reset › Authentication methods</em>. Trang này cũng vẫn giữ thiết lập <strong>Number of methods required to reset</strong>.</li>
  <li>Authenticator, software OATH và hardware OATH được tính là <strong>một</strong> phương thức: không kết hợp chúng để đủ yêu cầu 2 phương thức. Không thể chọn Authenticator làm phương thức duy nhất khi yêu cầu 1 phương thức.</li>
  <li>Đổi chính sách từ 1 lên 2 phương thức: người chỉ đăng ký 1 phương thức sẽ <strong>không reset được</strong> cho tới khi đăng ký thêm.</li>
</ul>

<h4>Registration</h4>
<ul>
  <li><strong>Require users to register when signing in</strong>: Yes → người dùng được nhắc đăng ký khi đăng nhập (có thể bấm hủy nhưng sẽ bị nhắc lại mỗi lần đăng nhập cho tới khi đăng ký).</li>
  <li><strong>Number of days before users are asked to re-confirm their authentication information</strong>: <strong>0–730</strong> ngày; 0 = không bao giờ hỏi lại.</li>
</ul>

<h4>Notifications và Customization</h4>
<ul>
  <li><strong>Notify users on password resets</strong>: email cho chính người dùng khi mật khẩu của họ bị đặt lại.</li>
  <li><strong>Notify all admins when other admins reset their passwords</strong>: email cho Global Administrators.</li>
  <li><strong>Customize helpdesk link</strong>: URL hoặc email helpdesk hiển thị khi người dùng không tự reset được.</li>
</ul>

<h4>On-premises integration</h4>
<ul>
  <li><strong>Enable password write back for synced users</strong> (Yes/No): bật/tắt writeback mà không cần cấu hình lại Entra Connect.</li>
  <li><strong>Allow users to unlock accounts without resetting their password</strong>: tách mở khóa khỏi đặt lại mật khẩu.</li>
</ul>

<h4>Chính sách SSPR cho admin (two-gate)</h4>
<div class="compare">
  <div><strong>Người dùng thường</strong>Theo cấu hình của bạn: None / Selected / All, 1 hoặc 2 phương thức, phương thức được chọn.</div>
  <div><strong>Tài khoản có Entra admin role</strong>Mặc định <strong>được bật</strong> SSPR và luôn áp chính sách <strong>two-gate</strong>: cần <strong>2</strong> phương thức (email, Authenticator, điện thoại…), <strong>cấm security questions</strong>. Không đổi được chính sách này; chỉ có thể tắt SSPR cho admin (thuộc tính <code>AllowedToUseSspr</code>).</div>
</div>
<p>Chính sách one-gate (1 phương thức) chỉ áp cho admin trong 30 ngày đầu của tenant trial, hoặc khi tenant chưa có custom domain và chưa đồng bộ với Entra Connect.</p>

<div class="callout warn"><strong>Kiểm thử đúng cách</strong>Luôn test SSPR bằng tài khoản <strong>không có admin role</strong>. Admin luôn bị áp chính sách two-gate nên kết quả test bằng tài khoản admin không phản ánh trải nghiệm người dùng.</div>

<div class="callout exam"><strong>Bẫy thi</strong>"Đặt SSPR = None nhưng Global Administrator vẫn reset được mật khẩu qua SSPR" → đúng, vì admin có chính sách riêng, mặc định bật. "Admin cấu hình 1 phương thức nhưng tài khoản admin vẫn phải xác minh 2 lần" → chính sách <strong>two-gate</strong>.</div>
`
    },
    {
      id: 'setup-sspr',
      unit: 'Exercise - Set up self-service password reset',
      title: 'Thực hành: bật SSPR cho một nhóm pilot',
      html: `
<p>Kịch bản: bật SSPR cho nhóm <code>SSPR-Pilot</code>, yêu cầu 2 phương thức, bắt buộc đăng ký khi đăng nhập.</p>

<ol class="steps">
  <li>Đăng nhập <strong>Microsoft Entra admin center</strong> với Authentication Policy Administrator (hoặc Global Administrator).</li>
  <li>Tạo security group <code>SSPR-Pilot</code> (Entra ID → Groups → New group, membership type Assigned) và thêm người dùng thử (không có admin role). Đảm bảo họ có license phù hợp (vd. Entra ID P1).</li>
  <li>Vào <strong>Entra ID → Password reset → Properties</strong>: chọn <strong>Selected</strong>, chọn group <code>SSPR-Pilot</code>, Save.</li>
  <li><strong>Authentication methods</strong> (trong Password reset): <em>Number of methods required to reset</em> = <strong>2</strong>. Save.</li>
  <li>Bật phương thức cho người dùng ở <strong>Entra ID → Authentication methods → Policies</strong>: vd. Microsoft Authenticator, Email OTP, SMS (nhắm All users hoặc group <code>SSPR-Pilot</code>). Từ 30/09/2025 đây là nơi duy nhất quản lý phương thức (trừ security questions).</li>
  <li><strong>Registration</strong>: <em>Require users to register when signing in</em> = Yes; số ngày re-confirm = 180 (hoặc giá trị chính sách công ty). Save.</li>
  <li><strong>Notifications</strong>: bật thông báo cho người dùng và cho admin. <strong>Customization</strong>: nhập link/email helpdesk.</li>
  <li>Mở cửa sổ InPrivate, đăng nhập bằng user thử → được yêu cầu đăng ký phương thức tại <em>Security info</em>.</li>
  <li>Đăng xuất, vào <code>https://aka.ms/sspr</code>, nhập user, captcha, xác minh 2 phương thức, đặt mật khẩu mới.</li>
  <li>Kiểm tra <strong>Password reset → Audit logs</strong> và báo cáo <strong>Usage &amp; insights</strong> (Authentication methods activity) để xem đăng ký và lượt reset.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: bật SSPR cho nhóm SSPR-Pilot</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập <code>https://entra.microsoft.com</code> với Authentication Policy Administrator:<br><span class="path">Microsoft Entra admin center › Entra ID › Password reset › Properties</span></li>
    <li>Trang <strong>Properties</strong>: chọn phạm vi và group (portal chỉ cho chọn <strong>một</strong> group; group lồng nhau được hỗ trợ):
      <div class="blade">
        <div class="blade-title">Password reset | Properties</div>
        <div class="pf"><label>Self service password reset enabled</label><span class="pv radio">Selected</span></div>
        <div class="pf"><label>Select group</label><span class="pv">SSPR-Pilot</span></div>
        <div class="pf"><label></label><span class="pv note">Admin luôn được bật SSPR và phải dùng 2 phương thức, bất kể lựa chọn ở đây</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Trang <strong>Authentication methods</strong> của Password reset: chỉ còn đặt số phương thức cần xác minh (và security questions nếu tổ chức vẫn dùng):
      <div class="blade">
        <div class="blade-title">Password reset | Authentication methods</div>
        <div class="pf"><label>Number of methods required to reset</label><span class="pv radio">2</span></div>
        <div class="pf"><label></label><span class="pv note">Từ 30/09/2025 không bật/tắt phương thức ở đây được nữa (trừ security questions); thiết lập Number of methods required to reset vẫn có hiệu lực</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Bật phương thức trong Authentication methods policy (áp dụng cho cả đăng nhập lẫn SSPR):<br><span class="path">Microsoft Entra admin center › Entra ID › Authentication methods › Policies</span>
      <div class="blade">
        <div class="blade-title">Authentication methods | Policies</div>
        <div class="pf"><label>Microsoft Authenticator</label><span class="pv">Enabled · Target: SSPR-Pilot</span></div>
        <div class="pf"><label>Email OTP</label><span class="pv">Enabled · Target: SSPR-Pilot</span></div>
        <div class="pf"><label>SMS</label><span class="pv">Enabled · Target: SSPR-Pilot</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn từng phương thức, bật Enable, chọn All users hoặc group ở mục Include, rồi Save</span></div>
      </div>
    </li>
    <li>Trang <strong>Registration</strong>:
      <div class="blade">
        <div class="blade-title">Password reset | Registration</div>
        <div class="pf"><label>Require users to register when signing in?</label><span class="pv radio">Yes</span></div>
        <div class="pf"><label>Number of days before users are asked to reconfirm their authentication information</label><span class="pv">180</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Trang <strong>Notifications</strong>: <em>Notify users on password resets?</em> = Yes; <em>Notify all admins when other admins reset their password?</em> = Yes. Trang <strong>Customization</strong>: <em>Customize helpdesk link</em> = Yes, nhập <em>Custom helpdesk email or URL</em>. Mỗi trang đều bấm <strong>Save</strong>.</li>
    <li>Thử bằng user không phải admin trong cửa sổ InPrivate: đăng ký tại <code>https://aka.ms/ssprsetup</code>, rồi reset tại <code>https://aka.ms/sspr</code>.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m6/sspr-properties-selected.png" alt="Trang Password reset Properties trong Microsoft Entra admin center với lựa chọn None, Selected, All và liên kết No groups selected" loading="lazy"><figcaption>Hình 1. Trang <em>Password reset › Properties</em>: chọn <strong>Selected</strong> rồi bấm <em>No groups selected</em> để chọn group. Menu bên trái chứa các trang Authentication methods, Registration, Notifications, Customization, On-premises integration, Administrator Policy và báo cáo Audit logs / Usage &amp; insights. Nguồn: <a href="https://learn.microsoft.com/entra/identity/authentication/tutorial-enable-sspr" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Mở rộng sau pilot</h4>
<ul>
  <li>Chuyển phạm vi từ Selected sang <strong>All</strong>.</li>
  <li>Bật <strong>combined registration</strong> để người dùng đăng ký MFA và SSPR một lần.</li>
  <li>Truyền thông cho người dùng URL <code>aka.ms/sspr</code> và <code>aka.ms/mysecurityinfo</code>.</li>
  <li>Với môi trường hybrid: bật password writeback trước khi mở rộng cho user đồng bộ.</li>
</ul>

<div class="callout tip"><strong>Mẹo</strong>Người dùng đăng ký phương thức trước khi họ cần dùng. Nếu một người quên mật khẩu mà chưa từng đăng ký phương thức thì SSPR không giúp được; admin phải reset thủ công.</div>
`
    },
    {
      id: 'branding',
      unit: 'Exercise - Customize directory branding',
      title: 'Thực hành: tùy biến company branding trang đăng nhập',
      html: `
<p><strong>Company branding</strong> giúp trang đăng nhập Microsoft Entra mang logo, hình nền và thông điệp của công ty, giúp người dùng nhận ra trang thật (giảm nguy cơ phishing) và cung cấp hướng dẫn như số điện thoại helpdesk.</p>

<h4>Yêu cầu</h4>
<ul>
  <li>License: <strong>Microsoft Entra ID P1 hoặc P2</strong>, Microsoft 365 Business Standard, hoặc SharePoint (Plan 1).</li>
  <li>Role tối thiểu: <strong>Organizational Branding Administrator</strong>.</li>
</ul>

<h4>Thành phần có thể tùy biến</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Kích thước / giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Favicon</td><td>32×32 px, tối đa 5 KB</td></tr>
    <tr><td>Background image</td><td>1920×1080 px, tối đa 300 KB (kèm page background color dự phòng)</td></tr>
    <tr><td>Banner logo</td><td>245×36 px, tối đa 50 KB</td></tr>
    <tr><td>Square logo (light / dark theme)</td><td>240×240 px, tối đa 50 KB</td></tr>
    <tr><td>Header logo</td><td>245×36 px, tối đa 10 KB</td></tr>
    <tr><td>Sign-in page text</td><td>Unicode, tối đa 1.024 ký tự, không đưa thông tin nhạy cảm (trang công khai)</td></tr>
    <tr><td>Khác</td><td>Username hint, footer (Privacy &amp; Cookies, Terms of Use), template layout, liên kết <strong>Show self-service password reset</strong></td></tr>
  </tbody>
</table>
<p>Định dạng ảnh khuyến nghị PNG (JPG cũng được). Custom CSS đang bị Microsoft thu hẹp dần và không còn khả dụng cho tenant mới.</p>

<h4>Các bước</h4>
<ol class="steps">
  <li>Microsoft Entra admin center → <strong>Entra ID → Custom Branding</strong> → <strong>Default sign-in experience</strong> → Edit / Configure.</li>
  <li><strong>Basics</strong>: favicon, background image, background color.</li>
  <li><strong>Layout</strong>: chọn template (full-screen hoặc partial-screen background), bật header / footer.</li>
  <li><strong>Sign-in form</strong>: banner logo, square logo, username hint, sign-in page text (vd. "Helpdesk: 1900 xxxx"), tùy chọn hiển thị liên kết SSPR.</li>
  <li><strong>Review + create</strong>. Thay đổi có thể mất một khoảng thời gian để hiển thị.</li>
  <li>Tùy chọn: <strong>Add browser language</strong> để tạo branding riêng cho từng ngôn ngữ trình duyệt (ghi đè branding mặc định cho ngôn ngữ đó).</li>
</ol>

<figure class="fig"><img src="assets/img/p2m6/branding-sign-in-page-map.png" alt="Trang đăng nhập có company branding, đánh số 15 thành phần: favicon, header, header logo, background image, page background color, banner logo, sign-in page title, description, username hint, liên kết SSPR, sign-in page text, footer links, footer, template" loading="lazy"><figcaption>Hình 1. Vị trí 15 thành phần company branding trên trang đăng nhập: favicon (1), header và header logo (2–3), background image / color (4–5), banner logo (6), username hint (9), liên kết SSPR (10), sign-in page text (11), footer (12–14) và template (15). Nguồn: <a href="https://learn.microsoft.com/entra/fundamentals/how-to-customize-branding" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: tùy biến Default sign-in experience</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập với Organizational Branding Administrator:<br><span class="path">Microsoft Entra admin center › Entra ID › Custom Branding › Default sign-in experience › Edit</span></li>
    <li>Tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Customize default sign-in experience</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Layout</span><span>Header</span><span>Footer</span><span>Sign-in form</span><span>Review</span></div>
        <div class="pf"><label>Favicon</label><span class="pv">contoso-favicon.png (32×32, ≤ 5 KB)</span></div>
        <div class="pf"><label>Background image</label><span class="pv">contoso-bg.png (1920×1080, ≤ 300 KB)</span></div>
        <div class="pf"><label>Page background color</label><span class="pv">#0F4C81</span></div>
        <div class="pbtns"><span class="pbtn">Review + create</span><span class="pbtn primary">Next: Layout</span></div>
      </div>
    </li>
    <li>Tab <strong>Layout</strong>: chọn template <em>Full-screen</em> hoặc <em>Partial-screen background</em>, bật <em>Show header</em> / <em>Show footer</em> nếu muốn dùng hai tab tiếp theo.</li>
    <li>Tab <strong>Sign-in form</strong>:
      <div class="blade">
        <div class="blade-title">Sign-in form</div>
        <div class="pf"><label>Banner logo</label><span class="pv">contoso-banner.png (245×36, ≤ 50 KB)</span></div>
        <div class="pf"><label>Square logo (light theme)</label><span class="pv">contoso-square.png (240×240)</span></div>
        <div class="pf"><label>Username hint text</label><span class="pv">ten.ban@contoso.com</span></div>
        <div class="pf"><label>Sign-in page text</label><span class="pv">Helpdesk: 1900 1234 (tối đa 1.024 ký tự)</span></div>
        <div class="pf"><label>Show self-service password reset (SSPR)</label><span class="pv chk">Bật</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Review</strong> › <strong>Create</strong>. Kiểm tra bằng URL có domain hint, vd. <code>https://myapps.microsoft.com/?whr=contoso.com</code>.</li>
  </ol></div>
</div>

<h4>Khi nào người dùng thấy branding?</h4>
<ul>
  <li>Với ứng dụng đa tenant như <code>myapps.microsoft.com</code>, branding xuất hiện <strong>sau khi người dùng nhập email / số điện thoại</strong> và bấm Next.</li>
  <li>Dùng URL có domain hint (vd. <code>https://myapps.microsoft.com/?whr=contoso.com</code>, <code>https://passwordreset.microsoftonline.com/?whr=contoso.com</code>) để branding hiển thị ngay từ màn hình đầu.</li>
  <li>Branding không áp cho tài khoản Microsoft cá nhân; người dùng B2B thấy branding của tenant nhà của họ.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Hiển thị số điện thoại helpdesk trên trang đăng nhập" → <strong>Sign-in page text</strong> trong company branding. "Tenant Entra ID Free không thấy tùy chọn branding" → cần <strong>P1/P2</strong> (hoặc license Microsoft 365 phù hợp). Muốn trang đăng nhập hiển thị tiếng Việt riêng → <strong>Add browser language</strong>.</div>
`
    },
    {
      id: 'password-writeback',
      extra: true,
      title: 'Password writeback',
      html: `
<p><strong>Password writeback</strong> ghi mật khẩu được đổi / đặt lại trên cloud về <strong>Active Directory Domain Services (AD DS)</strong> on-premises theo thời gian thực. Bắt buộc nếu muốn người dùng <em>đồng bộ</em> từ AD dùng SSPR.</p>

<h4>Cơ chế triển khai</h4>
<div class="compare">
  <div><strong>Microsoft Entra Connect (Sync)</strong>Bật trong wizard: <em>Optional features → Password writeback</em>. Sau đó bật <em>Enable password write back for synced users</em> trong Password reset → On-premises integration.</div>
  <div><strong>Microsoft Entra Connect cloud sync</strong>Agent nhẹ, có thể chạy nhiều agent để tăng sẵn sàng, hỗ trợ cả domain rời rạc (sau sáp nhập công ty). Bật writeback trong cấu hình cloud sync.</div>
</div>
<p>Hai cơ chế có thể chạy song song cho các domain khác nhau.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 292" role="img" aria-label="Đường đi của mật khẩu khi password writeback: người dùng, Microsoft Entra ID, Service Bus relay, agent on-premises, AD DS">
  <rect class="zone" x="10" y="10" width="700" height="122" rx="12"/>
  <text x="26" y="30" class="t-sm t-mute">Cloud</text>
  <rect class="zone" x="10" y="168" width="700" height="116" rx="12"/>
  <text x="26" y="188" class="t-sm t-mute">On-premises</text>

  <rect class="box" x="30" y="42" width="160" height="70" rx="10"/>
  <text x="110" y="70" text-anchor="middle" class="t-b">Người dùng</text>
  <text x="110" y="90" text-anchor="middle" class="t-sm t-mute">aka.ms/sspr</text>
  <rect class="box-a" x="250" y="42" width="190" height="70" rx="10"/>
  <text x="345" y="70" text-anchor="middle" class="t-b">Microsoft Entra ID</text>
  <text x="345" y="90" text-anchor="middle" class="t-sm t-mute">mã hóa mật khẩu mới</text>
  <rect class="box-e" x="500" y="42" width="200" height="70" rx="10"/>
  <text x="600" y="70" text-anchor="middle" class="t-b">Service Bus relay</text>
  <text x="600" y="90" text-anchor="middle" class="t-sm t-mute">riêng cho tenant</text>

  <line class="ln-a" x1="190" y1="77" x2="246" y2="77" marker-end="url(#arr-a)"/>
  <text x="218" y="67" text-anchor="middle" class="t-sm t-a">HTTPS</text>
  <line class="ln-a" x1="440" y1="77" x2="496" y2="77" marker-end="url(#arr-a)"/>
  <text x="468" y="67" text-anchor="middle" class="t-sm t-a">TLS</text>

  <rect class="box-w" x="500" y="200" width="200" height="70" rx="10"/>
  <text x="600" y="228" text-anchor="middle" class="t-b">Entra Connect</text>
  <text x="600" y="248" text-anchor="middle" class="t-sm t-mute">hoặc cloud sync agent</text>
  <rect class="box" x="250" y="200" width="190" height="70" rx="10"/>
  <text x="345" y="228" text-anchor="middle" class="t-b">AD DS</text>
  <text x="345" y="248" text-anchor="middle" class="t-sm t-mute">áp chính sách AD</text>

  <line class="ln-s" x1="575" y1="200" x2="575" y2="116" marker-end="url(#arr-s)"/>
  <text x="565" y="154" text-anchor="end" class="t-sm t-s">outbound TCP 443</text>
  <line class="ln dash" x1="625" y1="112" x2="625" y2="196" marker-end="url(#arr)"/>
  <text x="632" y="154" class="t-sm t-mute">yêu cầu reset</text>
  <line class="ln-a" x1="500" y1="214" x2="444" y2="214" marker-end="url(#arr-a)"/>
  <text x="472" y="193" text-anchor="middle" class="t-sm t-a">SetPassword</text>

  <text x="130" y="154" text-anchor="middle" class="t-sm t-w">Firewall: không cần mở inbound</text>
  <text x="130" y="232" text-anchor="middle" class="t-sm t-mute">kết quả trả về ngay</text>
  <text x="130" y="250" text-anchor="middle" class="t-sm t-mute">(đồng bộ, synchronous)</text>
</svg>
<figcaption>Hình 1. Agent on-premises chủ động mở kết nối <strong>outbound 443</strong> tới Service Bus relay riêng của tenant, nhận yêu cầu đã mã hóa rồi gọi SetPassword trên AD DS, nên chính sách mật khẩu on-premises được áp và người dùng biết kết quả ngay.</figcaption>
</figure>

<h4>Đặc điểm</h4>
<ul>
  <li>Hỗ trợ cả 3 mô hình: <strong>password hash sync (PHS)</strong>, <strong>pass-through authentication (PTA)</strong>, <strong>federation (AD FS)</strong>.</li>
  <li><strong>Không cần mở cổng inbound</strong>: dùng <strong>Azure Service Bus relay</strong>, mọi kết nối là <strong>outbound TCP 443</strong>.</li>
  <li><strong>Đồng bộ (synchronous)</strong>: người dùng biết ngay nếu mật khẩu không đạt chính sách.</li>
  <li><strong>Áp chính sách mật khẩu AD on-premises</strong>: lịch sử, độ phức tạp, tuổi tối thiểu, password filter. Nếu chính sách on-prem yếu hơn cloud, chính sách on-prem được áp.</li>
  <li>License: <strong>Entra ID P1/P2</strong> hoặc <strong>Microsoft 365 Business Premium</strong>.</li>
  <li>Tài khoản AD DS connector cần quyền: <em>Reset password</em>, <em>Change password</em>, quyền ghi <code>lockoutTime</code> và <code>pwdLastSet</code> trên các OU chứa user.</li>
</ul>

<h4>Thao tác nào được writeback?</h4>
<table>
  <thead><tr><th>Được ghi về AD</th><th>Không được ghi về AD</th></tr></thead>
  <tbody>
    <tr><td>User tự đổi mật khẩu (tự nguyện hoặc khi hết hạn)</td><td>Admin reset mật khẩu user từ <strong>Microsoft 365 admin center</strong></td></tr>
    <tr><td>User reset qua <code>passwordreset.microsoftonline.com</code></td><td>Reset qua PowerShell v1/v2 (MSOnline / AzureAD module cũ)</td></tr>
    <tr><td>Admin reset mật khẩu user từ <strong>Microsoft Entra admin center</strong> hoặc Microsoft Graph API</td><td>Tài khoản thuộc <strong>protected groups</strong> on-premises (vd. Domain Admins) không reset qua writeback</td></tr>
  </tbody>
</table>

<h4>Khắc phục sự cố nhanh</h4>
<ul>
  <li>Người dùng hybrid nhận "liên hệ admin" → writeback chưa bật hoặc dịch vụ writeback không chạy.</li>
  <li>Reset báo lỗi chính sách → mật khẩu không đạt chính sách AD on-premises.</li>
  <li>Kiểm tra trạng thái trong Entra admin center (Password reset → On-premises integration) và event log trên server Entra Connect.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Cần mở firewall inbound nào cho password writeback?" → <strong>không cần</strong>, chỉ outbound 443. "Công ty dùng PTA, có dùng SSPR với writeback được không?" → <strong>được</strong>. License tối thiểu cho writeback: <strong>Entra ID P1</strong> (hoặc M365 Business Premium), không phải Business Standard.</div>
`
    },
    {
      id: 'mfa-ca',
      extra: true,
      title: 'Multifactor authentication và Conditional Access (mức AZ-104)',
      html: `
<h4>Các cách bật MFA</h4>
<table>
  <thead><tr><th>Cách</th><th>License</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>Security defaults</strong></td><td>Free</td><td>Bật sẵn cho tenant mới; buộc mọi người đăng ký MFA (Authenticator), yêu cầu MFA cho admin và khi cần, <strong>chặn legacy authentication</strong>. Bật/tắt toàn tenant, không tùy biến.</td></tr>
    <tr><td><strong>Conditional Access</strong></td><td><strong>Entra ID P1</strong></td><td>Chính sách If–Then linh hoạt theo user, app, vị trí, thiết bị. Phải <strong>tắt security defaults</strong> trước khi dùng.</td></tr>
    <tr><td>Risk-based Conditional Access (sign-in risk / user risk)</td><td><strong>Entra ID P2</strong></td><td>Dùng tín hiệu Microsoft Entra ID Protection.</td></tr>
    <tr><td>Per-user MFA (legacy)</td><td>Free</td><td>Trạng thái Disabled / Enabled / Enforced cho từng user; Microsoft khuyến nghị chuyển sang Conditional Access.</td></tr>
  </tbody>
</table>
<p>Microsoft <strong>bắt buộc MFA</strong> cho tài khoản user khi quản lý Azure (chỉ ở Azure public cloud, không có opt-out):</p>
<ul>
  <li><strong>Phase 1</strong> (triển khai dần từ 10/2024): đăng nhập Azure portal, Microsoft Entra admin center, Intune admin center; Microsoft 365 admin center từ 02/2025.</li>
  <li><strong>Phase 2</strong> (triển khai dần từ 01/10/2025): Azure CLI, Azure PowerShell, Azure mobile app, công cụ IaC, REST API / SDK khi thực hiện thao tác <em>create, update, delete</em> (thao tác đọc không cần MFA). Global Administrator có thể xin hoãn Phase 2 tối đa tới 01/07/2026.</li>
  <li><strong>Workload identity</strong> (managed identity, service principal) <strong>không</strong> bị ảnh hưởng, nên script tự động nên dùng <strong>managed identity / service principal</strong> thay vì tài khoản user.</li>
</ul>

<h4>Phương thức xác thực</h4>
<ul>
  <li>Mạnh nhất (phishing-resistant): <strong>passkey (FIDO2)</strong>, Windows Hello for Business, certificate-based authentication.</li>
  <li>Phổ biến: <strong>Microsoft Authenticator</strong> (push có number matching, passwordless), OATH token.</li>
  <li>Yếu hơn: SMS, voice call.</li>
  <li>Phương thức được quản lý tập trung ở <strong>Authentication methods policy</strong> (thay thế cài đặt phương thức trong chính sách MFA/SSPR legacy).</li>
</ul>

<h4>Cấu trúc Conditional Access policy</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 252" role="img" aria-label="Cấu trúc Conditional Access policy: Assignments (IF) và Access controls (THEN)">
  <rect class="box-a" x="10" y="20" width="320" height="214" rx="12"/>
  <text x="170" y="46" text-anchor="middle" class="t-b t-a">IF · Assignments</text>
  <rect class="box" x="24" y="62" width="292" height="30" rx="6"/>
  <text x="170" y="82" text-anchor="middle" class="t-sm">Users / groups / roles (include, exclude)</text>
  <rect class="box" x="24" y="100" width="292" height="30" rx="6"/>
  <text x="170" y="120" text-anchor="middle" class="t-sm">Target resources: cloud apps, user actions</text>
  <rect class="box" x="24" y="138" width="292" height="48" rx="6"/>
  <text x="170" y="158" text-anchor="middle" class="t-sm">Conditions: user risk, sign-in risk,</text>
  <text x="170" y="175" text-anchor="middle" class="t-sm">device platforms, locations, client apps</text>
  <text x="170" y="222" text-anchor="middle" class="t-sm t-mute">đánh giá sau yếu tố xác thực thứ nhất</text>

  <line class="ln-a" x1="330" y1="127" x2="386" y2="127" marker-end="url(#arr-a)"/>
  <text x="358" y="117" text-anchor="middle" class="t-sm t-a">THEN</text>

  <rect class="box-s" x="390" y="20" width="320" height="214" rx="12"/>
  <text x="550" y="46" text-anchor="middle" class="t-b t-s">THEN · Access controls</text>
  <rect class="box-x" x="404" y="62" width="292" height="30" rx="6"/>
  <text x="550" y="82" text-anchor="middle" class="t-sm">Grant: Block access</text>
  <rect class="box" x="404" y="100" width="292" height="48" rx="6"/>
  <text x="550" y="120" text-anchor="middle" class="t-sm">Grant access + Require MFA / auth strength /</text>
  <text x="550" y="137" text-anchor="middle" class="t-sm">compliant device / hybrid joined / app…</text>
  <rect class="box" x="404" y="156" width="292" height="46" rx="6"/>
  <text x="550" y="175" text-anchor="middle" class="t-sm">Session: sign-in frequency,</text><text x="550" y="192" text-anchor="middle" class="t-sm">persistent browser session</text>
  <text x="550" y="222" text-anchor="middle" class="t-sm t-mute">trạng thái: Report-only · On · Off</text>
</svg>
<figcaption>Hình 1. Mỗi Conditional Access policy là một câu lệnh If–Then. Nhiều policy cùng áp thì mọi yêu cầu đều phải đạt, và <strong>Block</strong> luôn thắng.</figcaption>
</figure>
<ul>
  <li><strong>Named locations</strong>: dải IP tin cậy hoặc quốc gia/khu vực, dùng trong điều kiện Locations.</li>
  <li>Trạng thái policy: <strong>Report-only</strong> (chỉ ghi log để đánh giá tác động), <strong>On</strong>, <strong>Off</strong>.</li>
  <li><strong>What If</strong> tool: mô phỏng policy nào áp cho một lần đăng nhập giả định.</li>
  <li>CA được đánh giá <strong>sau</strong> xác thực yếu tố thứ nhất; nhiều policy cùng áp thì mọi yêu cầu đều phải đạt; <strong>Block</strong> thắng.</li>
  <li>Luôn <strong>exclude tài khoản break-glass</strong> (emergency access) khỏi policy chặn để không tự khóa tenant.</li>
</ul>

<h4>Policy mẫu hay gặp</h4>
<ul>
  <li>Require MFA cho mọi admin role.</li>
  <li>Require MFA cho <strong>Windows Azure Service Management API</strong> (portal, CLI, PowerShell) đối với mọi user.</li>
  <li>Block legacy authentication (Client apps: Exchange ActiveSync và other clients).</li>
  <li>Require MFA khi đăng nhập từ ngoài named location "Văn phòng".</li>
  <li>Yêu cầu thiết bị compliant (Intune) để truy cập Microsoft 365.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Yêu cầu MFA chỉ khi người dùng ở ngoài văn phòng" → <strong>Conditional Access</strong> + named location (cần P1), không phải security defaults. "Bật Conditional Access nhưng tùy chọn bị mờ" → tắt <strong>security defaults</strong> trước. "Chính sách dựa trên sign-in risk" → cần <strong>P2</strong>.</div>
`
    }
  ],
  keyFacts: [
    'SSPR có 3 lựa chọn phạm vi: <strong>None</strong>, <strong>Selected</strong> (group được chọn, thường dùng cho pilot), <strong>All</strong>.',
    'Số phương thức cần để reset: <strong>1 hoặc 2</strong>. Authenticator, software OATH và hardware OATH tính là <strong>một</strong> phương thức.',
    'Tài khoản có Entra admin role mặc định được bật SSPR và luôn bị áp chính sách <strong>two-gate</strong> (2 phương thức, <strong>không</strong> security questions), không thay đổi được.',
    'Re-confirm thông tin xác thực: <strong>0–730 ngày</strong> (0 = không hỏi lại); chỉ có khi bật "Require users to register when signing in".',
    'License: Entra ID Free chỉ cho <strong>đổi</strong> mật khẩu; <strong>reset</strong> cho cloud user cần M365 Business Standard trở lên hoặc P1/P2; <strong>writeback</strong> cần P1/P2 hoặc M365 Business Premium.',
    'Password writeback hỗ trợ PHS, PTA, federation; qua Entra Connect hoặc cloud sync; chỉ cần <strong>outbound 443</strong> (Azure Service Bus relay), không cần inbound.',
    'Writeback áp chính sách mật khẩu AD on-premises; admin reset từ <strong>Entra admin center</strong> được writeback, reset từ <strong>Microsoft 365 admin center</strong> thì không.',
    'Company branding cần Entra ID P1/P2 (hoặc M365 Business Standard / SharePoint Plan 1); role tối thiểu <strong>Organizational Branding Administrator</strong>; background 1920×1080, ≤ 300 KB.',
    'Security defaults miễn phí nhưng không tùy biến; Conditional Access cần <strong>P1</strong>, risk-based cần <strong>P2</strong>; phải tắt security defaults để dùng Conditional Access.',
    'URL cần nhớ: <code>aka.ms/sspr</code> (reset), <code>aka.ms/ssprsetup</code> và <code>aka.ms/mysecurityinfo</code> (đăng ký).'
  ],
  traps: [
    'Test SSPR bằng tài khoản Global Administrator rồi kết luận cấu hình 1 phương thức không hoạt động. Admin luôn bị chính sách two-gate; hãy test bằng user thường.',
    'Đặt SSPR = None và nghĩ admin cũng không tự reset được. Admin có chính sách riêng, mặc định bật.',
    'Bật SSPR cho user đồng bộ từ AD mà quên <strong>password writeback</strong>. User sẽ nhận thông báo liên hệ admin.',
    'Mở cổng inbound trên firewall cho writeback. Không cần, chỉ outbound 443.',
    'Chọn Microsoft 365 Business Standard cho kịch bản writeback. Cần Business Premium hoặc Entra ID P1/P2.',
    'Dùng security questions cho admin. Chính sách admin cấm security questions.',
    'Bật Conditional Access mà không tắt security defaults, hoặc dùng security defaults khi cần điều kiện theo vị trí. Security defaults không tùy biến.',
    'Quên exclude tài khoản break-glass khỏi policy Block, dẫn tới tự khóa toàn tenant.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Phạm vi SSPR</td><td>None / Selected / All</td></tr>
    <tr><td>Số phương thức để reset</td><td>1 hoặc 2</td></tr>
    <tr><td>Chính sách admin</td><td>Two-gate, 2 phương thức, không security questions</td></tr>
    <tr><td>Re-confirm</td><td>0–730 ngày</td></tr>
    <tr><td>License reset cloud user</td><td>M365 Business Standard+ hoặc Entra ID P1/P2</td></tr>
    <tr><td>License writeback</td><td>Entra ID P1/P2 hoặc M365 Business Premium</td></tr>
    <tr><td>Writeback</td><td>Entra Connect / cloud sync · PHS, PTA, AD FS · outbound 443</td></tr>
    <tr><td>Branding</td><td>P1/P2 · Organizational Branding Administrator · ảnh nền 1920×1080 ≤ 300 KB</td></tr>
    <tr><td>MFA</td><td>Security defaults (Free) · Conditional Access (P1) · risk-based (P2)</td></tr>
    <tr><td>URL</td><td><code>aka.ms/sspr</code> · <code>aka.ms/mysecurityinfo</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Ba giá trị của "Self service password reset enabled"?', back: '<strong>None</strong>, <strong>Selected</strong> (chỉ thành viên group được chọn), <strong>All</strong>.' },
    { front: 'Số phương thức có thể yêu cầu để reset mật khẩu?', back: '<strong>1</strong> hoặc <strong>2</strong>.' },
    { front: 'Chính sách SSPR áp cho tài khoản admin?', back: '<strong>Two-gate</strong>: 2 phương thức, cấm security questions; mặc định bật và không thay đổi được.' },
    { front: 'Authenticator + OATH token có tính là 2 phương thức không?', back: '<strong>Không</strong>. Authenticator, software OATH, hardware OATH tính chung là một phương thức.' },
    { front: 'Khoảng giá trị re-confirm thông tin xác thực?', back: '<strong>0–730 ngày</strong>; 0 nghĩa là không bao giờ hỏi lại.' },
    { front: 'Entra ID Free có cho cloud user reset mật khẩu đã quên không?', back: '<strong>Không</strong>, chỉ cho đổi mật khẩu khi biết mật khẩu cũ. Reset cần M365 Business Standard+ hoặc P1/P2.' },
    { front: 'License cần cho SSPR có writeback?', back: '<strong>Entra ID P1/P2</strong> hoặc <strong>Microsoft 365 Business Premium</strong>.' },
    { front: 'Password writeback cần mở cổng nào?', back: 'Không cần inbound; chỉ <strong>outbound TCP 443</strong> tới Azure Service Bus relay.' },
    { front: 'Writeback hỗ trợ mô hình xác thực hybrid nào?', back: '<strong>PHS</strong>, <strong>PTA</strong> và <strong>federation (AD FS)</strong>.' },
    { front: 'Admin reset mật khẩu từ đâu thì KHÔNG được writeback?', back: '<strong>Microsoft 365 admin center</strong> và PowerShell v1/v2 cũ. Entra admin center và Graph API thì được.' },
    { front: 'Writeback áp chính sách mật khẩu nào?', back: 'Chính sách <strong>AD on-premises</strong> (lịch sử, độ phức tạp, tuổi, password filter).' },
    { front: 'Role tối thiểu để cấu hình company branding?', back: '<strong>Organizational Branding Administrator</strong>.' },
    { front: 'Hiển thị số helpdesk trên trang đăng nhập bằng cách nào?', back: 'Company branding → <strong>Sign-in page text</strong> (tối đa 1.024 ký tự).' },
    { front: 'Kích thước ảnh nền company branding?', back: '<strong>1920×1080 px</strong>, tối đa <strong>300 KB</strong>.' },
    { front: 'URL để người dùng reset mật khẩu?', back: '<code>https://aka.ms/sspr</code> (passwordreset.microsoftonline.com).' },
    { front: 'Conditional Access cần license gì?', back: '<strong>Entra ID P1</strong>; chính sách dựa trên risk cần <strong>P2</strong>.' },
    { front: 'Security defaults và Conditional Access dùng cùng lúc được không?', back: '<strong>Không</strong>. Phải tắt security defaults trước khi bật Conditional Access policy.' },
    { front: 'Chế độ nào để thử Conditional Access policy mà không ảnh hưởng người dùng?', back: '<strong>Report-only</strong> (và công cụ <strong>What If</strong> để mô phỏng).' }
  ],
  quiz: [
    {
      q: 'Contoso muốn thử nghiệm SSPR cho 50 nhân viên phòng Sales trước khi triển khai toàn công ty. Bạn nên cấu hình gì?',
      options: ['Đặt SSPR = All và gán license cho 50 người', 'Tạo group chứa 50 người và đặt SSPR = Selected với group đó', 'Đặt SSPR = None và bật per-user MFA cho 50 người', 'Tạo Conditional Access policy cho 50 người'],
      answer: [1],
      explain: 'Chế độ Selected giới hạn SSPR cho thành viên một group, phù hợp pilot. All bật cho toàn bộ tenant. None tắt SSPR cho người dùng. MFA và Conditional Access không bật SSPR.'
    },
    {
      q: 'Bạn cấu hình SSPR yêu cầu 1 phương thức. Khi test bằng tài khoản Global Administrator, hệ thống vẫn yêu cầu 2 phương thức và không cho dùng security questions. Nguyên nhân?',
      options: ['Cấu hình chưa được lưu', 'Tenant đang dùng security defaults', 'Tài khoản admin luôn bị áp chính sách two-gate', 'Cần license Entra ID P2'],
      answer: [2],
      explain: 'Tài khoản có Entra admin role bị áp chính sách two-gate mạnh mặc định, không phụ thuộc cấu hình người dùng và không đổi được. Security defaults không ảnh hưởng số phương thức SSPR; license P2 không liên quan.'
    },
    {
      q: 'Người dùng đồng bộ từ AD on-premises bằng Microsoft Entra Connect (password hash sync) nhận thông báo "liên hệ quản trị viên" khi dùng SSPR, trong khi user cloud-only dùng bình thường. Bạn cần làm gì?',
      options: ['Bật password writeback trong Entra Connect và trong cài đặt On-premises integration của SSPR', 'Chuyển từ PHS sang pass-through authentication', 'Đặt SSPR = All', 'Bật security defaults'],
      answer: [0],
      explain: 'Mật khẩu của user đồng bộ được quản lý on-premises; SSPR chỉ cho phép reset khi writeback được bật. Đổi sang PTA không giải quyết (PTA vẫn cần writeback). Phạm vi All và security defaults không liên quan.'
    },
    {
      q: 'Tổ chức có 500 user đồng bộ từ AD và muốn họ reset mật khẩu qua SSPR với writeback. License nào đáp ứng? (Chọn 2)',
      options: ['Microsoft Entra ID Free', 'Microsoft 365 Business Standard', 'Microsoft Entra ID P1', 'Microsoft 365 Business Premium'],
      answer: [2, 3],
      explain: 'SSPR có on-premises writeback cần Entra ID P1/P2 hoặc Microsoft 365 Business Premium. Business Standard chỉ hỗ trợ reset cho cloud user. Entra ID Free chỉ cho đổi mật khẩu.'
    },
    {
      q: 'Đội bảo mật hỏi cần mở cổng inbound nào trên firewall on-premises để password writeback hoạt động. Câu trả lời đúng?',
      options: ['TCP 443 inbound', 'TCP 3389 inbound', 'TCP 389 (LDAP) inbound từ Internet', 'Không cần cổng inbound; chỉ cần outbound TCP 443'],
      answer: [3],
      explain: 'Writeback dùng Azure Service Bus relay; agent on-premises chủ động kết nối ra ngoài qua 443. Không cần mở bất kỳ cổng inbound nào.'
    },
    {
      q: 'Bạn đổi chính sách SSPR từ yêu cầu 1 phương thức sang 2 phương thức. User A chỉ đăng ký số điện thoại. Điều gì xảy ra khi User A quên mật khẩu?',
      options: ['User A vẫn reset được bằng số điện thoại', 'User A không reset được cho tới khi đăng ký thêm phương thức', 'User A tự động được dùng security questions', 'User A được chuyển sang chính sách admin'],
      answer: [1],
      explain: 'Khi đăng ký ít phương thức hơn số yêu cầu, người dùng không thể reset và phải nhờ admin. Hệ thống không tự thêm phương thức hay chuyển chính sách.'
    },
    {
      q: 'Bạn muốn số điện thoại helpdesk và logo công ty xuất hiện trên trang đăng nhập Microsoft Entra. Bạn cần gì? (Chọn 2)',
      options: ['Cấu hình company branding: banner logo và sign-in page text', 'Vai trò Organizational Branding Administrator (hoặc cao hơn)', 'Cấu hình Customize helpdesk link trong SSPR', 'Một Conditional Access policy với Terms of use'],
      answer: [0, 1],
      explain: 'Logo và văn bản trên trang đăng nhập thuộc company branding, và role tối thiểu để cấu hình là Organizational Branding Administrator. Helpdesk link của SSPR chỉ hiện khi người dùng không reset được. Terms of use của Conditional Access là chức năng khác.'
    },
    {
      q: 'Sau khi cấu hình company branding, người dùng vào <code>https://myapps.microsoft.com</code> không thấy logo công ty ở màn hình đầu tiên. Cách nào giúp branding hiển thị ngay?',
      options: ['Đổi license sang P2', 'Xóa cookie trình duyệt', 'Thêm domain hint, ví dụ <code>https://myapps.microsoft.com/?whr=contoso.com</code>', 'Tạo branding cho ngôn ngữ tiếng Anh'],
      answer: [2],
      explain: 'Với ứng dụng đa tenant, Microsoft Entra chỉ biết tenant sau khi người dùng nhập email; tham số <code>whr</code> (domain hint) giúp áp branding ngay màn hình đầu. License P2 hay branding theo ngôn ngữ không thay đổi hành vi này.'
    },
    {
      q: 'Admin reset mật khẩu cho user hybrid từ Microsoft 365 admin center, nhưng user vẫn chỉ đăng nhập được máy tính trong domain bằng mật khẩu cũ. Writeback đã bật. Nguyên nhân?',
      options: ['Reset từ Microsoft 365 admin center không được writeback; hãy reset từ Microsoft Entra admin center', 'Writeback chỉ hỗ trợ federation', 'Cần đợi chu kỳ sync 30 phút', 'User nằm ngoài phạm vi SSPR Selected'],
      answer: [0],
      explain: 'Admin reset từ Microsoft Entra admin center (hoặc Graph API) được writeback; reset từ Microsoft 365 admin center thì không. Writeback hỗ trợ PHS, PTA và federation, và là thao tác đồng bộ, không chờ chu kỳ sync. Phạm vi SSPR không áp dụng cho admin reset.'
    },
    {
      q: 'Tenant có Entra ID P1. Bạn cần yêu cầu MFA chỉ khi người dùng đăng nhập từ ngoài mạng văn phòng (dải IP công khai cố định). Giải pháp nào?',
      options: ['Bật security defaults', 'Bật per-user MFA trạng thái Enforced cho mọi user', 'Bật SSPR với 2 phương thức', 'Tạo named location cho dải IP văn phòng và Conditional Access policy yêu cầu MFA với mọi location trừ named location đó'],
      answer: [3],
      explain: 'Conditional Access với điều kiện Locations cho phép miễn MFA ở vị trí tin cậy. Security defaults và per-user MFA không phân biệt vị trí theo cách này. SSPR không áp MFA khi đăng nhập.'
    },
    {
      q: 'Bạn tạo Conditional Access policy nhưng không bật được (nút On bị vô hiệu, có cảnh báo). Tenant mới tạo gần đây. Bạn cần làm gì trước?',
      options: ['Mua license P2', 'Tắt security defaults', 'Bật per-user MFA', 'Thêm custom domain'],
      answer: [1],
      explain: 'Security defaults bật sẵn trên tenant mới và không dùng song song với Conditional Access; phải tắt trước. Conditional Access chỉ cần P1. Per-user MFA và custom domain không liên quan.'
    },
    {
      q: 'Bạn muốn yêu cầu người dùng xác nhận lại thông tin xác thực SSPR mỗi 6 tháng. Phát biểu nào ĐÚNG?',
      options: ['Đặt "Number of days before users are asked to re-confirm" = 180, kèm bật "Require users to register when signing in"', 'Không thể cấu hình, giá trị cố định 90 ngày', 'Giá trị tối đa là 365 ngày nên không đặt được 180', 'Chỉ cấu hình được bằng Conditional Access'],
      answer: [0],
      explain: 'Giá trị re-confirm nằm trong khoảng 0–730 ngày và chỉ có hiệu lực khi bật yêu cầu đăng ký khi đăng nhập. Không phải giá trị cố định và không cấu hình qua Conditional Access.'
    },
    {
      q: 'Công ty muốn chặn legacy authentication và yêu cầu MFA cho admin nhưng chỉ có Microsoft Entra ID Free, không cần tùy biến. Giải pháp ít chi phí nhất?',
      options: ['Conditional Access policy', 'Microsoft Entra ID Protection', 'Bật security defaults', 'Mua Microsoft 365 Business Premium'],
      answer: [2],
      explain: 'Security defaults miễn phí, chặn legacy authentication và yêu cầu MFA cho admin. Conditional Access cần P1, ID Protection cần P2, và mua thêm license tốn chi phí không cần thiết.'
    },
    {
      q: 'Bạn chuẩn bị bật Conditional Access policy chặn truy cập từ các quốc gia không được phép. Bạn muốn đánh giá tác động trước và tránh tự khóa tenant. Bạn nên làm gì? (Chọn 2)',
      options: ['Đặt policy ở chế độ Report-only trước khi bật On', 'Bật security defaults song song', 'Exclude tài khoản emergency access (break-glass) khỏi policy', 'Áp policy cho mọi user kể cả break-glass để đảm bảo an toàn'],
      answer: [0, 2],
      explain: 'Report-only ghi lại kết quả mà không thực thi, giúp đánh giá tác động. Tài khoản break-glass phải được exclude để luôn có đường vào tenant. Security defaults không dùng song song với Conditional Access; áp policy cho break-glass có thể khóa toàn tenant.'
    }
  ]
});

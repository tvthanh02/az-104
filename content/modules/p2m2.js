AZ.addModule({
  id: 'p2m2',
  summary: 'Module này là phần "tay chân" của quản trị danh tính: tạo và quản lý <strong>user</strong> (member/guest, cloud/đồng bộ), khôi phục user đã xóa, <strong>group</strong> (Security/Microsoft 365, assigned/dynamic), gán <strong>license</strong> theo user và theo group, đăng ký <strong>thiết bị</strong>, <strong>custom security attributes</strong>, <strong>administrative units</strong> và cộng tác <strong>B2B</strong>. Đây là nhóm câu hỏi chiếm tỷ trọng lớn trong miền "Manage Azure identities and governance" của AZ-104.',
  objectives: [
    'Tạo, chỉnh sửa, xóa và khôi phục user trong Microsoft Entra ID; phân biệt member/guest và cloud/synced',
    'Tạo group Security và Microsoft 365 với membership assigned hoặc dynamic; viết dynamic membership rule',
    'Gán và gỡ license trực tiếp và theo group, xử lý lỗi license',
    'Phân biệt Microsoft Entra registered, joined, hybrid joined và cấu hình device settings',
    'Định nghĩa custom security attributes và giao quyền quản trị bằng administrative units',
    'Mời guest (B2B collaboration) và thực hiện bulk operations bằng CSV'
  ],
  sections: [
    {
      id: 'users',
      unit: 'Create, configure, and manage users',
      title: 'Tạo và quản lý user',
      html: `
<p>Mỗi người dùng trong Microsoft Entra ID là một <strong>user object</strong>. Hai thuộc tính phân loại quan trọng nhất:</p>
<div class="compare">
  <div><strong>userType: Member hoặc Guest</strong><em>Member</em> là người trong tổ chức, có quyền mặc định rộng hơn (đọc được danh bạ, tạo group…). <em>Guest</em> là người ngoài được mời (B2B), quyền mặc định bị hạn chế.</div>
  <div><strong>Nguồn (source of authority)</strong><em>Cloud</em>: tạo trực tiếp trong Entra ID, quản lý hoàn toàn trên cloud. <em>Synced</em>: tạo trong AD DS và đồng bộ bằng Microsoft Entra Connect hoặc Cloud Sync; phải sửa ở on-premises.</div>
</div>

<h4>Tạo user</h4>
<ul>
  <li>Vai trò tối thiểu: <strong>User Administrator</strong> (Global Administrator cũng làm được nhưng vi phạm least privilege).</li>
  <li>Thông tin bắt buộc: <strong>User principal name (UPN)</strong> dạng <code>ten@domain</code> (domain phải là domain đã xác minh hoặc <code>onmicrosoft.com</code>), <strong>display name</strong>, mật khẩu ban đầu (tự sinh hoặc tự đặt, bắt đổi ở lần đăng nhập đầu).</li>
  <li>Thuộc tính hay dùng: <em>job title, department, manager, company name</em> (phục vụ dynamic group), <strong>usage location</strong> (bắt buộc để gán license).</li>
</ul>
<pre><code># Azure CLI
az ad user create --display-name "Chris Green" \\
  --user-principal-name chris@contoso.com --password "P@ssw0rd-Temp1" \\
  --force-change-password-next-sign-in true

# Microsoft Graph PowerShell
Connect-MgGraph -Scopes "User.ReadWrite.All"
$pw = @{ Password = "P@ssw0rd-Temp1"; ForceChangePasswordNextSignIn = $true }
New-MgUser -DisplayName "Chris Green" -UserPrincipalName chris@contoso.com \\
  -MailNickname chris -AccountEnabled -PasswordProfile $pw -UsageLocation VN
Update-MgUser -UserId chris@contoso.com -Department "Sales" -JobTitle "Account Manager"</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: tạo user mới</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập <code>entra.microsoft.com</code> với vai trò tối thiểu <strong>User Administrator</strong>, mở:<br><span class="path">Microsoft Entra admin center › Entra ID › Users › New user › Create new user</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create new user</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Properties</span><span>Assignments</span><span>Review + create</span></div>
        <div class="blade-sec">Identity</div>
        <div class="pf"><label class="req">User principal name</label><span class="pv">chris @ contoso.com</span></div>
        <div class="pf"><label>Mail nickname</label><span class="pv chk">Derive from user principal name</span></div>
        <div class="pf"><label class="req">Display name</label><span class="pv">Chris Green</span></div>
        <div class="pf"><label class="req">Password</label><span class="pv chk">Auto-generate password</span></div>
        <div class="pf"><label>Account enabled</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label></label><span class="pv note">Domain sau @ chỉ liệt kê domain đã xác minh và onmicrosoft.com. Bỏ chọn Account enabled tương đương "Block sign in" của giao diện cũ</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next: Properties</span></div>
      </div>
    </li>
    <li>Tab <strong>Properties</strong>: điền các nhóm <em>Identity</em> (First name, Last name, <strong>User type</strong> = Member hoặc Guest), <em>Job information</em> (Job title, Department, Manager: dữ liệu cho dynamic group), <em>Contact information</em>, <em>Parental controls</em> và <em>Settings</em> (<strong>Usage location</strong> = Vietnam, cần để gán license trực tiếp).</li>
    <li>Tab <strong>Assignments</strong> (tùy chọn): <strong>+ Add administrative unit</strong> (tối đa 1), <strong>+ Add group</strong> hoặc <strong>+ Add role</strong> (tối đa 20). Gán role cần Privileged Role Administrator.</li>
    <li>Bấm <strong>Review + create</strong> rồi <strong>Create</strong>. Nếu để tự sinh mật khẩu, hãy sao chép mật khẩu tạm hiển thị ở tab Basics trước khi bấm Create.</li>
  </ol></div>
</div>

<h4>Các thao tác quản lý thường gặp</h4>
<table>
  <thead><tr><th>Tình huống</th><th>Thao tác</th></tr></thead>
  <tbody>
    <tr><td>Nhân viên tạm nghỉ, giữ nguyên dữ liệu</td><td><strong>Block sign-in</strong> (<code>accountEnabled = false</code>)</td></tr>
    <tr><td>Nghi ngờ lộ tài khoản</td><td>Reset password + <strong>Revoke sessions</strong> (thu hồi refresh token)</td></tr>
    <tr><td>Đổi tên đăng nhập</td><td>Sửa UPN (user synced phải sửa ở AD DS)</td></tr>
    <tr><td>Nhân viên nghỉ việc</td><td>Delete user (soft delete 30 ngày)</td></tr>
    <tr><td>Xem lịch sử đăng nhập</td><td>Sign-in logs của user</td></tr>
  </tbody>
</table>

<h4>Quyền mặc định của user</h4>
<p>Trong <em>User settings</em> có thể hạn chế: user thường có được đăng ký ứng dụng không, có được truy cập Microsoft Entra admin center không (<em>Restrict access to Microsoft Entra admin center</em>), có được tạo tenant không. User non-admin chỉ tạo được tối đa <strong>250</strong> đối tượng directory.</p>

<div class="callout warn"><strong>User đồng bộ</strong>Các thuộc tính như tên, UPN, department của user synced bị khóa trên portal. Xóa user synced trên Entra ID trong khi user vẫn còn ở AD DS thì chu kỳ đồng bộ kế tiếp có thể tạo lại user. Cách đúng là xóa hoặc chuyển user ra khỏi phạm vi đồng bộ ở on-premises.</div>
<div class="callout exam"><strong>Góc thi</strong>"Tạo user với ít đặc quyền nhất" → <strong>User Administrator</strong>. "Không gán được license cho user mới" → thường do thiếu <strong>usage location</strong>. "Sửa department của user đồng bộ từ AD" → sửa trong <strong>AD DS on-premises</strong>, không sửa trên portal.</div>
`
    },
    {
      id: 'restore-users',
      unit: 'Exercise - restore or remove deleted users',
      title: 'Khôi phục hoặc xóa vĩnh viễn user',
      html: `
<p>Khi xóa, user chuyển vào trạng thái <strong>soft-deleted</strong> trong <strong>30 ngày</strong>. Trong thời gian này có thể khôi phục với <strong>đầy đủ thuộc tính</strong>, group membership và license. Sau 30 ngày, quá trình xóa vĩnh viễn tự chạy và không dừng được.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 190" role="img" aria-label="Vòng đời user khi xóa: Active, Delete user chuyển sang soft-deleted 30 ngày, Restore user quay lại Active, sau 30 ngày hoặc Delete permanently thì bị xóa vĩnh viễn">
  <rect class="box-s" x="10" y="60" width="150" height="64" rx="10"/>
  <text x="85" y="88" text-anchor="middle" class="t-b">Active</text>
  <text x="85" y="108" text-anchor="middle" class="t-sm t-mute">All users</text>
  <rect class="box-w" x="255" y="60" width="200" height="64" rx="10"/>
  <text x="355" y="88" text-anchor="middle" class="t-b">Soft-deleted</text>
  <text x="355" y="108" text-anchor="middle" class="t-sm t-mute">Deleted users · 30 ngày</text>
  <rect class="box-x" x="550" y="60" width="160" height="64" rx="10"/>
  <text x="630" y="88" text-anchor="middle" class="t-b t-x">Xóa vĩnh viễn</text>
  <text x="630" y="108" text-anchor="middle" class="t-sm t-mute">không ai khôi phục được</text>

  <line class="ln" x1="160" y1="80" x2="251" y2="80" marker-end="url(#arr)"/>
  <text x="207" y="70" text-anchor="middle" class="t-sm">Delete user</text>
  <line class="ln-s dash" x1="255" y1="106" x2="164" y2="106" marker-end="url(#arr-s)"/>
  <text x="207" y="146" text-anchor="middle" class="t-sm t-s">Restore user</text>
  <line class="ln-x" x1="455" y1="80" x2="546" y2="80" marker-end="url(#arr-x)"/>
  <text x="500" y="70" text-anchor="middle" class="t-sm">sau 30 ngày</text>
  <line class="ln-x dash" x1="455" y1="106" x2="546" y2="106" marker-end="url(#arr-x)"/>
  <text x="500" y="146" text-anchor="middle" class="t-sm t-x">Delete permanently</text>

  <text x="360" y="178" text-anchor="middle" class="t-sm t-mute">Security group không có giai đoạn soft-delete: xóa là mất ngay</text>
</svg>
<figcaption>Hình 1. User bị xóa nằm 30 ngày ở trạng thái soft-deleted (trang <em>Deleted users</em>). Trong thời gian đó có thể <em>Restore user</em> với đầy đủ thuộc tính, group và license; hết 30 ngày, hoặc khi admin bấm <em>Delete permanently</em>, user mất hẳn.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: khôi phục hoặc xóa vĩnh viễn user</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập với vai trò tối thiểu <strong>User Administrator</strong>, mở danh sách user đã xóa dưới 30 ngày:<br><span class="path">Microsoft Entra admin center › Entra ID › Users › Deleted users</span><br>Nếu không thấy mục này, gõ "Deleted users" vào ô tìm kiếm của admin center.</li>
    <li>Tìm và chọn user cần xử lý, rồi chọn thao tác trên thanh lệnh:
      <div class="blade">
        <div class="blade-title">Deleted users</div>
        <div class="pbtns"><span class="pbtn primary">Restore user</span><span class="pbtn">Delete permanently</span></div>
        <div class="pf"><label>Display name</label><span class="pv chk">Mary Parker</span></div>
        <div class="pf"><label>User principal name</label><span class="pv note">mary@contoso.com</span></div>
        <div class="pf"><label></label><span class="pv note">Danh sách có cột ngày xóa, giúp biết còn bao nhiêu ngày để khôi phục</span></div>
      </div>
    </li>
    <li><strong>Restore user</strong>: user quay lại <em>All users</em> với thuộc tính, group membership và license (kể cả khi đã hết license trống).</li>
    <li><strong>Delete permanently</strong>: xác nhận để xóa ngay, không chờ 30 ngày. Thao tác này không thể hoàn tác.</li>
  </ol></div>
</div>

<h4>Bằng Microsoft Graph PowerShell</h4>
<pre><code># Liệt kê user đã xóa
Get-MgDirectoryDeletedItemAsUser -All | Select-Object Id, DisplayName, DeletedDateTime

# Khôi phục
Restore-MgDirectoryDeletedItem -DirectoryObjectId &lt;objectId&gt;

# Xóa vĩnh viễn
Remove-MgDirectoryDeletedItem -DirectoryObjectId &lt;objectId&gt;</code></pre>

<h4>Những điểm cần nhớ</h4>
<ul>
  <li>License được khôi phục <strong>kể cả khi không còn license trống</strong>: tổ chức có thể tạm thời vượt số license đã mua.</li>
  <li>Đã xóa vĩnh viễn thì <strong>không ai khôi phục được</strong>, kể cả Microsoft Support; phải tạo user mới và nhập lại thông tin.</li>
  <li>Không khôi phục được nếu đã có user khác dùng cùng UPN hoặc proxy address (xung đột).</li>
  <li><strong>User synced</strong>: Entra ID không phải nguồn quản lý. Khôi phục bằng <strong>AD Recycle Bin</strong> ở on-premises rồi chờ đồng bộ (user được "soft match" lại với đối tượng đã xóa).</li>
  <li>Đối tượng đã xóa nhưng còn khôi phục được vẫn tính vào hạn mức đối tượng của tenant.</li>
</ul>

<h4>So sánh với group</h4>
<table>
  <thead><tr><th>Đối tượng</th><th>Khôi phục được?</th></tr></thead>
  <tbody>
    <tr><td>User</td><td>Có, trong 30 ngày</td></tr>
    <tr><td>Microsoft 365 group</td><td>Có, trong 30 ngày (kèm mailbox, SharePoint, Teams)</td></tr>
    <tr><td>Security group</td><td><strong>Không</strong>: xóa là mất vĩnh viễn</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>"User bị xóa cách đây 20 ngày, khôi phục với ít công nhất" → <strong>Restore</strong> từ Deleted users. "Bị xóa cách đây 45 ngày" → không khôi phục được, phải tạo mới. "Security group bị xóa nhầm" → tạo lại group và thêm lại thành viên.</div>
`
    },
    {
      id: 'groups',
      unit: 'Create, configure, and manage groups',
      title: 'Group: loại group và kiểu membership',
      html: `
<h4>Hai loại group</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>Security</th><th>Microsoft 365</th></tr></thead>
  <tbody>
    <tr><td>Mục đích</td><td>Cấp quyền truy cập tài nguyên (Azure RBAC, ứng dụng, license, Conditional Access)</td><td>Cộng tác: mailbox chung, lịch, SharePoint site, Teams, Planner</td></tr>
    <tr><td>Thành viên</td><td>User, <strong>device</strong>, service principal, group khác (nested)</td><td><strong>Chỉ user</strong> (kể cả guest); không chứa group hay device</td></tr>
    <tr><td>Owner</td><td>User, service principal</td><td>User</td></tr>
    <tr><td>Khôi phục khi xóa</td><td>Không</td><td>Có, trong 30 ngày</td></tr>
  </tbody>
</table>
<p>Group có thể bật <strong>Microsoft Entra roles can be assigned to the group</strong> (role-assignable group) để gán Entra role cho group. Tùy chọn này <strong>chỉ đặt được lúc tạo</strong>, không đổi về sau, membership phải là <strong>assigned</strong>, và tối đa <strong>500</strong> role-assignable group mỗi tenant.</p>

<h4>Ba kiểu membership</h4>
<ul>
  <li><strong>Assigned</strong>: owner hoặc admin thêm/bớt thành viên thủ công.</li>
  <li><strong>Dynamic user</strong>: thành viên được thêm/bớt tự động theo rule trên thuộc tính user.</li>
  <li><strong>Dynamic device</strong>: theo thuộc tính device; chỉ dùng cho <strong>Security group</strong>.</li>
</ul>
<p>Một rule không thể vừa chọn user vừa chọn device. Không thể thêm/bớt thành viên thủ công vào dynamic group. Có thể đổi group từ assigned sang dynamic (thành viên hiện có sẽ được tính lại theo rule) và ngược lại.</p>

<h4>Cú pháp dynamic membership rule</h4>
<p>Dạng chung: <code>thuộc_tính toán_tử giá_trị</code>, ví dụ <code>user.department -eq "Sales"</code>. Toán tử: <code>-eq -ne -startsWith -notStartsWith -contains -notContains -match -notMatch -in -notIn</code>; kết hợp bằng <code>-and -or -not</code>; tập hợp dùng <code>-any -all</code>.</p>
<pre><code>(user.department -eq "Sales") -and (user.country -eq "Vietnam")
user.jobTitle -startsWith "Manager"
user.department -in ["Sales","Marketing"]
(user.objectId -ne null) -and (user.userType -eq "Member")      # mọi member, loại guest
user.userType -eq "Guest"                                         # mọi guest
Direct Reports for "&lt;objectId của manager&gt;"                       # nhân viên trực tiếp của một manager
(user.proxyAddresses -any (_ -startsWith "contoso"))

device.deviceOSType -eq "Windows"
device.deviceTrustType -eq "AzureAD"          # Entra joined (ServerAD = hybrid, Workplace = registered)
device.deviceOwnership -eq "Company"</code></pre>
<ul>
  <li>So sánh với null: <code>user.department -eq null</code> (không đặt null trong ngoặc kép).</li>
  <li>Rule builder trên portal hỗ trợ tối đa 5 biểu thức; rule phức tạp hơn hoặc rule cho device phải viết trong text box. Độ dài rule tối đa 3.072 ký tự.</li>
  <li>Tối đa <strong>15.000</strong> dynamic group (tính chung với dynamic administrative unit) mỗi tenant.</li>
  <li>Dynamic group cần <strong>Microsoft Entra ID P1</strong> cho mỗi user là thành viên; device không cần license.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Dynamic group: rule department bằng Sales và userType bằng Member được đánh giá trên từng user; An và Dũng khớp nên vào group, Bình là guest và Chi thuộc HR nên bị loại">
  <rect class="box-s" x="10" y="25" width="200" height="40" rx="8"/>
  <text x="110" y="50" text-anchor="middle" class="t-sm">An · Sales · Member</text>
  <rect class="box" x="10" y="75" width="200" height="40" rx="8"/>
  <text x="110" y="100" text-anchor="middle" class="t-sm">Bình · Sales · Guest</text>
  <rect class="box" x="10" y="125" width="200" height="40" rx="8"/>
  <text x="110" y="150" text-anchor="middle" class="t-sm">Chi · HR · Member</text>
  <rect class="box-s" x="10" y="175" width="200" height="40" rx="8"/>
  <text x="110" y="200" text-anchor="middle" class="t-sm">Dũng · Sales · Member</text>

  <rect class="box-a" x="260" y="75" width="200" height="90" rx="10"/>
  <text x="360" y="100" text-anchor="middle" class="t-b t-a">Membership rule</text>
  <text x="360" y="124" text-anchor="middle" class="t-sm">department -eq "Sales"</text>
  <text x="360" y="144" text-anchor="middle" class="t-sm">-and userType -eq "Member"</text>

  <line class="ln" x1="210" y1="45" x2="256" y2="88" marker-end="url(#arr)"/>
  <line class="ln" x1="210" y1="95" x2="256" y2="108" marker-end="url(#arr)"/>
  <line class="ln" x1="210" y1="145" x2="256" y2="132" marker-end="url(#arr)"/>
  <line class="ln" x1="210" y1="195" x2="256" y2="152" marker-end="url(#arr)"/>

  <rect class="zone" x="510" y="35" width="200" height="170" rx="12"/>
  <text x="610" y="58" text-anchor="middle" class="t-b">DG-Sales (dynamic)</text>
  <rect class="box-s" x="535" y="72" width="150" height="36" rx="8"/>
  <text x="610" y="95" text-anchor="middle" class="t-sm">An</text>
  <rect class="box-s" x="535" y="118" width="150" height="36" rx="8"/>
  <text x="610" y="141" text-anchor="middle" class="t-sm">Dũng</text>
  <text x="610" y="186" text-anchor="middle" class="t-sm t-mute">Bình, Chi: không khớp</text>
  <line class="ln-s" x1="460" y1="120" x2="506" y2="120" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. Rule được đánh giá trên <strong>từng</strong> user trong tenant. Khi thuộc tính thay đổi (ví dụ Chi chuyển sang Sales), membership tự cập nhật sau khi rule được xử lý lại; không ai thêm hay bớt thành viên thủ công được.</figcaption>
</figure>

<h4>Tạo group bằng lệnh</h4>
<pre><code>az ad group create --display-name "SG-Sales" --mail-nickname sg-sales
az ad group member add --group "SG-Sales" --member-id &lt;userObjectId&gt;

New-MgGroup -DisplayName "DG-Sales" -MailEnabled:$false -MailNickname dgsales -SecurityEnabled \\
  -GroupTypes "DynamicMembership" -MembershipRule 'user.department -eq "Sales"' \\
  -MembershipRuleProcessingState "On"</code></pre>

<h4>Thực hành (Exercise - add groups)</h4>
<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: tạo dynamic security group</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập với vai trò tối thiểu <strong>Groups Administrator</strong> (hoặc User Administrator), mở:<br><span class="path">Microsoft Entra admin center › Entra ID › Groups › All groups › New group</span></li>
    <li>Điền trang <strong>New Group</strong>:
      <div class="blade">
        <div class="blade-title">New Group</div>
        <div class="pf"><label class="req">Group type</label><span class="pv sel">Security</span></div>
        <div class="pf"><label class="req">Group name</label><span class="pv">DG-Sales</span></div>
        <div class="pf"><label>Group description</label><span class="pv">Nhân viên phòng Sales (tự động)</span></div>
        <div class="pf"><label>Microsoft Entra roles can be assigned to the group</label><span class="pv radio">No</span></div>
        <div class="pf"><label class="req">Membership type</label><span class="pv sel">Dynamic User</span></div>
        <div class="pf"><label>Owners</label><span class="pv note">No owners selected</span></div>
        <div class="pf"><label>Dynamic user members</label><span class="pv note">Add dynamic query</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn Microsoft 365 sẽ hiện thêm Group email address. Bật "roles can be assigned" thì Membership type bị khóa ở Assigned</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span></div>
      </div>
    </li>
    <li>Bấm <strong>Add dynamic query</strong>. Trong <strong>Dynamic membership rules</strong>, dùng rule builder (cột And/Or, Property, Operator, Value; tối đa 5 biểu thức) hoặc sửa thẳng ô <strong>Rule syntax</strong> (Hình 2), ví dụ <code>(user.department -eq "Sales") -and (user.userType -eq "Member")</code>. Tab <strong>Validate Rules</strong> cho phép thử rule với vài user cụ thể. Bấm <strong>Save</strong>.</li>
    <li>Quay lại trang New Group, bấm <strong>Create</strong>.</li>
    <li>Mở group vừa tạo, trang <em>Overview</em> hiển thị <strong>Dynamic rule processing status</strong> (Evaluating, Processing, Update complete, Processing error, Update paused, Not started) và <strong>Last membership change</strong>. Mục <em>Members</em> sẽ không có nút thêm thủ công.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m2/dynamic-rule-builder.png" alt="Trang Dynamic membership rules với rule builder gồm các cột And/Or, Property, Operator, Value, nút Add expression và ô Rule syntax" loading="lazy"><figcaption>Hình 2. Trang <strong>Dynamic membership rules</strong>: phần trên là rule builder (mỗi dòng một biểu thức, nút <em>Add expression</em>), phần dưới là ô <em>Rule syntax</em> phản ánh rule đầy đủ. Rule phức tạp (hơn 5 biểu thức, Direct Reports, <code>-any</code>/<code>-all</code>) phải viết trong ô này. Nguồn: <a href="https://learn.microsoft.com/entra/identity/users/groups-create-rule" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>
<div class="callout exam"><strong>Góc thi</strong>"Gán quyền RBAC cho thiết bị" hoặc "group chứa device" → <strong>Security</strong>. "Group có mailbox và Teams" → <strong>Microsoft 365</strong>. "Không thêm thủ công được user vào group" → group đang là <strong>dynamic</strong>. Muốn chỉ member (không guest) thì thêm điều kiện <code>user.userType -eq "Member"</code>.</div>
`
    },
    {
      id: 'devices',
      unit: 'Configure and manage device registration',
      title: 'Đăng ký thiết bị: registered, joined, hybrid joined',
      html: `
<p><strong>Device identity</strong> là đối tượng thiết bị trong Entra ID, điều kiện tiên quyết cho Conditional Access dựa trên thiết bị và quản lý bằng Microsoft Intune. Có ba cách để thiết bị có danh tính:</p>
<table>
  <thead><tr><th>Tiêu chí</th><th>Microsoft Entra registered</th><th>Microsoft Entra joined</th><th>Microsoft Entra hybrid joined</th></tr></thead>
  <tbody>
    <tr><td>Kịch bản</td><td>BYOD, thiết bị cá nhân, điện thoại</td><td>Thiết bị của tổ chức, cloud-first</td><td>Thiết bị của tổ chức đã join AD DS on-premises</td></tr>
    <tr><td>Sở hữu</td><td>Cá nhân hoặc tổ chức</td><td>Tổ chức</td><td>Tổ chức</td></tr>
    <tr><td>Đăng nhập thiết bị bằng</td><td>Tài khoản cục bộ / cá nhân (thêm work account)</td><td>Tài khoản Entra ID</td><td>Tài khoản AD DS (đồng bộ lên Entra ID)</td></tr>
    <tr><td>Hệ điều hành</td><td>Windows 10/11, iOS, Android, macOS</td><td>Windows 10/11 (không phải Home), Windows Server 2019+ chạy trên VM Azure</td><td>Windows 10/11, Windows Server hỗ trợ (đã domain join)</td></tr>
    <tr><td>Yêu cầu thêm</td><td>Không</td><td>Không cần AD DS</td><td>Cần AD DS và Microsoft Entra Connect (hoặc Cloud Sync) để đồng bộ đối tượng máy</td></tr>
    <tr><td><code>deviceTrustType</code></td><td><code>Workplace</code></td><td><code>AzureAD</code></td><td><code>ServerAD</code></td></tr>
  </tbody>
</table>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Ba cách thiết bị có danh tính trong Entra ID: registered cho BYOD, joined cho máy công ty cloud-first, hybrid joined cho máy đã join AD DS và được đồng bộ qua Entra Connect">
  <rect class="box-a" x="260" y="15" width="200" height="44" rx="10"/>
  <text x="360" y="42" text-anchor="middle" class="t-b t-a">Microsoft Entra ID</text>

  <rect class="box" x="20" y="120" width="200" height="80" rx="10"/>
  <text x="120" y="145" text-anchor="middle" class="t-b">Entra registered</text>
  <text x="120" y="165" text-anchor="middle" class="t-sm t-mute">BYOD · tài khoản cá nhân</text>
  <text x="120" y="185" text-anchor="middle" class="t-sm t-a">trustType: Workplace</text>

  <rect class="box-s" x="260" y="120" width="200" height="80" rx="10"/>
  <text x="360" y="145" text-anchor="middle" class="t-b">Entra joined</text>
  <text x="360" y="165" text-anchor="middle" class="t-sm t-mute">máy công ty · cloud-first</text>
  <text x="360" y="185" text-anchor="middle" class="t-sm t-a">trustType: AzureAD</text>

  <rect class="box-w" x="500" y="120" width="200" height="80" rx="10"/>
  <text x="600" y="145" text-anchor="middle" class="t-b">Hybrid joined</text>
  <text x="600" y="165" text-anchor="middle" class="t-sm t-mute">máy đã join AD DS</text>
  <text x="600" y="185" text-anchor="middle" class="t-sm t-a">trustType: ServerAD</text>

  <rect class="box" x="530" y="230" width="140" height="50" rx="8"/>
  <text x="600" y="251" text-anchor="middle" class="t-b">AD DS on-prem</text>
  <text x="600" y="270" text-anchor="middle" class="t-sm t-mute">+ Entra Connect</text>

  <line class="ln dash" x1="120" y1="120" x2="290" y2="63" marker-end="url(#arr)"/>
  <text x="150" y="78" text-anchor="middle" class="t-sm t-mute">thêm work account</text>
  <line class="ln-s" x1="360" y1="120" x2="360" y2="63" marker-end="url(#arr-s)"/>
  <line class="ln-a" x1="600" y1="120" x2="430" y2="63" marker-end="url(#arr-a)"/>
  <text x="600" y="80" text-anchor="middle" class="t-sm t-mute">đồng bộ đối tượng máy</text>
  <line class="ln" x1="600" y1="200" x2="600" y2="226" marker-end="url(#arr)"/>
  <text x="560" y="218" text-anchor="end" class="t-sm t-mute">domain join</text>
</svg>
<figcaption>Hình 1. Registered: thiết bị cá nhân chỉ "đăng ký" work account. Joined: máy công ty đăng nhập thẳng bằng tài khoản Entra ID, không cần AD DS. Hybrid joined: máy join AD DS on-premises, đối tượng máy được Entra Connect (hoặc Cloud Sync) đồng bộ lên Entra ID nên tồn tại ở cả hai nơi.</figcaption>
</figure>

<p>Thiết bị Entra joined vẫn có SSO tới tài nguyên on-premises nếu có đường kết nối tới domain controller. Hybrid join được coi là bước chuyển tiếp trước khi lên Entra join. Kiểm tra trạng thái trên máy Windows bằng <code>dsregcmd /status</code> (các trường <code>AzureAdJoined</code>, <code>DomainJoined</code>, <code>WorkplaceJoined</code>).</p>

<h4>Device settings (Entra ID &gt; Devices &gt; Device settings)</h4>
<table>
  <thead><tr><th>Cài đặt</th><th>Ý nghĩa / mặc định</th></tr></thead>
  <tbody>
    <tr><td>Users may join devices to Microsoft Entra</td><td>All / Selected / None. Mặc định <strong>All</strong>. Không áp dụng cho hybrid join</td></tr>
    <tr><td>Users may register their devices</td><td>Cho phép BYOD đăng ký; nếu đã dùng Intune hoặc MDM cho Microsoft 365 thì bắt buộc là All</td></tr>
    <tr><td>Require MFA to register or join devices</td><td>Mặc định <strong>No</strong>. Microsoft khuyến nghị dùng Conditional Access với user action <em>Register or join devices</em> thay vì toggle này</td></tr>
    <tr><td>Maximum number of devices per user</td><td>Mặc định <strong>50</strong>, tối đa 100 hoặc Unlimited; áp dụng cho joined và registered, không áp dụng cho hybrid joined</td></tr>
    <tr><td>Additional local administrators on Entra joined devices</td><td>User được gán role <em>Microsoft Entra Joined Device Local Administrator</em>, có quyền admin cục bộ trên mọi máy Entra joined</td></tr>
    <tr><td>Microsoft Entra LAPS</td><td>Quản lý và xoay vòng mật khẩu admin cục bộ của máy Windows</td></tr>
  </tbody>
</table>

<h4>Quản lý thiết bị</h4>
<ul>
  <li><strong>Disable</strong>: thiết bị không xác thực được với Entra ID, refresh token và Primary Refresh Token bị thu hồi. Cần <em>Cloud Device Administrator</em> hoặc <em>Intune Administrator</em>.</li>
  <li><strong>Delete</strong>: không khôi phục được, xóa cả BitLocker recovery key lưu kèm. Nên disable trước, xóa sau (quy trình dọn <em>stale device</em> dựa trên <code>approximateLastSignInDateTime</code>).</li>
  <li>Xem <strong>BitLocker recovery key</strong>: chủ sở hữu thiết bị hoặc Cloud Device Administrator, Helpdesk Administrator, Intune Administrator, Security Administrator/Reader.</li>
  <li>Đọc và sửa device settings cần <strong>Cloud Device Administrator</strong>.</li>
</ul>
<pre><code>Get-MgDevice -All | Select-Object DisplayName, OperatingSystem, TrustType, ApproximateLastSignInDateTime
Update-MgDevice -DeviceId &lt;objectId&gt; -AccountEnabled:$false</code></pre>
<div class="callout exam"><strong>Góc thi</strong>"Nhân viên dùng điện thoại cá nhân truy cập email công ty" → <strong>registered</strong>. "Laptop mới của công ty, không có AD on-prem" → <strong>joined</strong>. "Máy đã join domain on-prem, muốn dùng Conditional Access yêu cầu thiết bị" → <strong>hybrid joined</strong>. User báo không thêm được thiết bị mới → kiểm tra <em>Maximum number of devices</em>.</div>
`
    },
    {
      id: 'licenses',
      unit: 'Manage licenses',
      title: 'Quản lý license: trực tiếp và theo group',
      html: `
<p>Nhiều dịch vụ cloud của Microsoft (Microsoft 365, Entra ID P1/P2, Intune…) yêu cầu license cho từng user. Một <strong>product</strong> (SKU, ví dụ Microsoft 365 E3) gồm nhiều <strong>service plan</strong> (Exchange Online, SharePoint, Teams…) có thể bật/tắt riêng. Việc gán license hiện chủ yếu làm trong <strong>Microsoft 365 admin center</strong> (Billing &gt; Licenses), ngoài ra có thể dùng Microsoft Graph PowerShell.</p>

<h4>Usage location: điều kiện bắt buộc</h4>
<p>Một số dịch vụ không có ở mọi quốc gia, nên user phải có <strong>usage location</strong> trước khi được gán license trực tiếp. Với <strong>group-based licensing</strong>, user chưa có usage location sẽ <strong>nhận usage location của tenant</strong>.</p>

<h4>Hai cách gán</h4>
<div class="compare">
  <div><strong>Gán trực tiếp (direct)</strong>Gán cho từng user. Dùng cho trường hợp lẻ. Gỡ trực tiếp trên user.</div>
  <div><strong>Gán theo group (inherited)</strong>Gán license cho group; mọi thành viên tự nhận, rời group thì tự mất. Cần <strong>Microsoft Entra ID P1</strong> trở lên cho mỗi user hưởng lợi (một số gói như Office 365 E3 hoặc Microsoft 365 Business Premium cũng đủ điều kiện, nhất là khi chỉ gán license Office).</div>
</div>
<ul>
  <li>Dùng được với Security group, mail-enabled security group và Microsoft 365 group; kết hợp <strong>dynamic group</strong> để cấp license hoàn toàn tự động theo department, country…</li>
  <li><strong>Không hỗ trợ nested group</strong>: chỉ thành viên trực tiếp của group được gán license.</li>
  <li>License kế thừa từ group <strong>không gỡ được trên user</strong>; phải gỡ user khỏi group hoặc gỡ license khỏi group. User có thể vừa có license trực tiếp vừa kế thừa cùng một product mà chỉ tiêu tốn <strong>một</strong> license.</li>
  <li>Có thể tắt service plan theo group (ví dụ group A có E3 nhưng tắt Yammer).</li>
  <li>Chuyển user giữa hai group có license: <strong>thêm vào group mới trước</strong>, xác nhận license, rồi mới gỡ khỏi group cũ để tránh mất dịch vụ.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 245" role="img" aria-label="License Microsoft 365 E3 gán cho group GRP-Sales: User A và User B nhận license; group lồng GRP-HN không truyền license nên User C không nhận; User D được gán trực tiếp">
  <rect class="box-e" x="10" y="90" width="150" height="60" rx="10"/>
  <text x="85" y="116" text-anchor="middle" class="t-b">Microsoft 365 E3</text>
  <text x="85" y="135" text-anchor="middle" class="t-sm t-mute">product (SKU)</text>
  <rect class="box-a" x="220" y="90" width="150" height="60" rx="10"/>
  <text x="295" y="116" text-anchor="middle" class="t-b t-a">GRP-Sales</text>
  <text x="295" y="135" text-anchor="middle" class="t-sm t-mute">cần Entra ID P1</text>
  <line class="ln-a" x1="160" y1="120" x2="216" y2="120" marker-end="url(#arr-a)"/>
  <text x="188" y="110" text-anchor="middle" class="t-sm t-a">gán</text>

  <rect class="box-s" x="440" y="20" width="120" height="40" rx="8"/>
  <text x="500" y="45" text-anchor="middle" class="t-b">User A</text>
  <rect class="box-s" x="440" y="72" width="120" height="40" rx="8"/>
  <text x="500" y="97" text-anchor="middle" class="t-b">User B</text>
  <rect class="box" x="440" y="124" width="120" height="40" rx="8"/>
  <text x="500" y="149" text-anchor="middle" class="t-sm t-b">GRP-HN (lồng)</text>
  <rect class="box-x" x="600" y="124" width="110" height="40" rx="8"/>
  <text x="655" y="149" text-anchor="middle" class="t-b t-x">User C</text>
  <line class="ln-s" x1="370" y1="105" x2="436" y2="44" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="370" y1="115" x2="436" y2="93" marker-end="url(#arr-s)"/>
  <line class="ln" x1="370" y1="130" x2="436" y2="143" marker-end="url(#arr)"/>
  <line class="ln-x dash" x1="560" y1="144" x2="596" y2="144" marker-end="url(#arr-x)"/>

  <rect class="box-s" x="440" y="185" width="120" height="40" rx="8"/>
  <text x="500" y="210" text-anchor="middle" class="t-b">User D</text>
  <path class="ln dash" d="M85 150 V205 H436" marker-end="url(#arr)"/>
  <text x="260" y="198" text-anchor="middle" class="t-sm t-mute">gán trực tiếp (cần usage location)</text>
</svg>
<figcaption>Hình 1. User A, B là thành viên trực tiếp của GRP-Sales nên kế thừa license. User C chỉ thuộc group lồng GRP-HN nên <strong>không</strong> nhận license (group-based licensing không hỗ trợ nested group). User D nhận license gán trực tiếp; nếu D cũng vào GRP-Sales thì vẫn chỉ tiêu tốn một license E3.</figcaption>
</figure>

<h4>Lỗi group-based licensing thường gặp</h4>
<table>
  <thead><tr><th>Lỗi</th><th>Cách xử lý</th></tr></thead>
  <tbody>
    <tr><td>Not enough licenses</td><td>Mua thêm hoặc thu hồi license gán trực tiếp không dùng</td></tr>
    <tr><td>Conflicting service plans (ví dụ Exchange Online Plan 1 và Plan 2)</td><td>Tắt một service plan hoặc gỡ license trực tiếp trùng</td></tr>
    <tr><td>Usage location not allowed</td><td>Đặt usage location hợp lệ cho user</td></tr>
    <tr><td>Duplicate proxy addresses</td><td>Sửa địa chỉ trùng rồi <strong>Reprocess</strong></td></tr>
    <tr><td>Dependency (add-on cần product nền)</td><td>Gán product nền và add-on trong cùng group</td></tr>
  </tbody>
</table>
<p>Lỗi license theo group không hiện ngay mà được ghi lên user object; xem tại tab <em>Errors &amp; issues</em> của product hoặc thông báo trên trang group, sửa xong thì <strong>Reprocess</strong>.</p>

<h4>Lệnh tham khảo</h4>
<pre><code>Get-MgSubscribedSku | Select-Object SkuPartNumber, SkuId, ConsumedUnits
Update-MgUser -UserId chris@contoso.com -UsageLocation VN
Set-MgUserLicense -UserId chris@contoso.com -AddLicenses @(@{SkuId = "&lt;skuId&gt;"}) -RemoveLicenses @()
Set-MgGroupLicense -GroupId &lt;groupId&gt; -AddLicenses @(@{SkuId = "&lt;skuId&gt;"}) -RemoveLicenses @()</code></pre>

<h4>Thực hành (Exercise - change user / group license assignments)</h4>
<ol class="steps">
  <li>Mở user, đặt <em>Usage location</em> nếu còn trống.</li>
  <li>Gán trực tiếp: Microsoft 365 admin center &gt; Billing &gt; Licenses &gt; chọn product &gt; Assign licenses &gt; chọn user, bật/tắt từng app.</li>
  <li>Gán theo group: cùng trang, chọn group thay vì user; theo dõi trạng thái xử lý trên group.</li>
  <li>Đổi license của group (thêm product mới hoặc tắt service plan) và kiểm tra user thành viên nhận thay đổi.</li>
  <li>Thử gỡ license kế thừa trên trang user để thấy thao tác bị chặn.</li>
</ol>
<div class="callout exam"><strong>Góc thi</strong>"Tự động cấp license E5 cho mọi user thuộc phòng Sales, kể cả user mới" → <strong>dynamic group</strong> theo department + <strong>group-based licensing</strong> (cần P1). "Gán license cho group cha nhưng user trong group con không nhận" → do <strong>không hỗ trợ nested group</strong>.</div>
`
    },
    {
      id: 'custom-security-attributes',
      unit: 'Create custom security attributes',
      title: 'Custom security attributes',
      html: `
<p><strong>Custom security attributes</strong> là các cặp key-value do doanh nghiệp tự định nghĩa và gán cho đối tượng Entra ID. Khác với extension attribute thông thường, quyền đọc/ghi chúng được kiểm soát chặt bằng role riêng, nên phù hợp để lưu <strong>dữ liệu nhạy cảm</strong> và dùng cho <strong>phân quyền</strong>.</p>

<h4>Đặc điểm</h4>
<ul>
  <li>Gán được cho <strong>user</strong> và <strong>enterprise application (service principal)</strong>, kể cả user đồng bộ từ AD DS.</li>
  <li>Kiểu dữ liệu: <strong>Boolean, Integer, String</strong>; một giá trị hoặc nhiều giá trị; giá trị tự do hoặc <strong>predefined</strong>.</li>
  <li>Mỗi attribute thuộc một <strong>attribute set</strong> (nhóm logic, đơn vị để giao quyền).</li>
  <li>Dùng cho <strong>Azure ABAC</strong>: thêm điều kiện vào role assignment, ví dụ chỉ cho user có <code>Project = Alpine</code> đọc blob có index tag <code>Project = Alpine</code>.</li>
  <li>Không dùng được trong Entra Domain Services, SAML claim, JWT claim.</li>
  <li><strong>Miễn phí</strong>, có ở mọi phiên bản Entra ID.</li>
  <li>Không xóa được attribute; chỉ <strong>deactivate</strong>. Một số thuộc tính (tên, kiểu dữ liệu, đa giá trị) không sửa được sau khi tạo.</li>
</ul>

<h4>Role chuyên biệt</h4>
<table>
  <thead><tr><th>Role</th><th>Quyền</th></tr></thead>
  <tbody>
    <tr><td>Attribute Definition Administrator</td><td>Tạo, quản lý attribute set và định nghĩa attribute</td></tr>
    <tr><td>Attribute Assignment Administrator</td><td>Gán, sửa giá trị attribute cho user và application</td></tr>
    <tr><td>Attribute Definition Reader / Attribute Assignment Reader</td><td>Chỉ đọc định nghĩa / đọc giá trị</td></tr>
    <tr><td>Attribute Log Reader / Attribute Log Administrator</td><td>Đọc audit log của attribute / cấu hình diagnostic settings</td></tr>
  </tbody>
</table>
<p>Các role này gán được ở <strong>phạm vi tenant</strong> hoặc <strong>phạm vi attribute set</strong>. Người gán các role này cần tối thiểu <em>Privileged Role Administrator</em>.</p>
<div class="callout warn"><strong>Quan trọng</strong>Mặc định <strong>Global Administrator và các admin khác không có quyền</strong> đọc, định nghĩa hay gán custom security attributes. Global Administrator muốn làm phải tự gán thêm role Attribute ... tương ứng.</div>

<h4>Giới hạn</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Attribute đang active mỗi tenant</td><td>500</td></tr>
    <tr><td>Attribute set mỗi tenant</td><td>500</td></tr>
    <tr><td>Predefined value mỗi attribute</td><td>100</td></tr>
    <tr><td>Giá trị gán trên một đối tượng</td><td>50</td></tr>
    <tr><td>Độ dài tên attribute / attribute set</td><td>32 ký tự, không dấu cách, không bắt đầu bằng số</td></tr>
  </tbody>
</table>

<h4>Quy trình</h4>
<ol class="steps">
  <li>Gán cho mình role Attribute Definition Administrator và Attribute Assignment Administrator.</li>
  <li>Entra admin center &gt; <strong>Custom security attributes</strong> &gt; <em>Add attribute set</em> (ví dụ <code>Engineering</code>).</li>
  <li>Trong set, <em>Add attribute</em>: tên <code>Project</code>, kiểu String, cho phép nhiều giá trị, chỉ dùng predefined values (Alpine, Baker).</li>
  <li>Mở user &gt; <em>Custom security attributes</em> &gt; gán <code>Engineering.Project = Alpine</code>.</li>
  <li>Lọc user theo attribute, hoặc thêm condition vào Azure role assignment.</li>
</ol>
<div class="callout exam"><strong>Góc thi</strong>"Global Administrator không thấy hoặc không sửa được custom security attribute" → thiếu role <strong>Attribute Assignment Administrator</strong> (gán giá trị) hoặc <strong>Attribute Definition Administrator</strong> (định nghĩa). Đừng chọn đáp án "nâng lên P2".</div>
`
    },
    {
      id: 'automatic-user-creation',
      unit: 'Explore automatic user creation',
      title: 'Tự động tạo user (provisioning)',
      html: `
<p>Tạo user thủ công không phù hợp với tổ chức lớn. Entra ID hỗ trợ nhiều luồng tạo và cập nhật user tự động:</p>
<table>
  <thead><tr><th>Luồng</th><th>Nguồn → Đích</th><th>License</th></tr></thead>
  <tbody>
    <tr><td>Microsoft Entra Connect Sync / Cloud Sync</td><td>AD DS on-premises → Entra ID</td><td>Miễn phí (Connect Health cần P1)</td></tr>
    <tr><td>HR-driven provisioning</td><td>Hệ thống HR (Workday, SAP SuccessFactors) → AD DS hoặc Entra ID</td><td>P1</td></tr>
    <tr><td>API-driven inbound provisioning</td><td>Bất kỳ hệ thống nào gửi dữ liệu qua API (SCIM) → AD DS hoặc Entra ID</td><td>P1</td></tr>
    <tr><td>App provisioning (outbound, SCIM)</td><td>Entra ID → ứng dụng SaaS (ServiceNow, Salesforce, Dropbox…)</td><td>Provisioning user: Free; provisioning group: P1</td></tr>
    <tr><td>Cross-tenant synchronization</td><td>Tenant A → Tenant B (B2B user)</td><td>P1 cho user được đồng bộ ở tenant nguồn</td></tr>
  </tbody>
</table>

<h4>App provisioning (SCIM)</h4>
<ul>
  <li><strong>SCIM</strong> (System for Cross-domain Identity Management) là chuẩn mở để trao đổi danh tính.</li>
  <li>Cấu hình trong <strong>Enterprise applications</strong> &gt; ứng dụng &gt; <strong>Provisioning</strong>: chọn chế độ <em>Automatic</em>, nhập Tenant URL và token của ứng dụng, cấu hình <em>attribute mappings</em> và <em>scope</em> (chỉ user/group được gán hay toàn bộ).</li>
  <li>Chu kỳ đầu (initial cycle) đồng bộ toàn bộ; các chu kỳ incremental sau đó chạy định kỳ (thường khoảng 40 phút; khoảng thời gian cụ thể do từng ứng dụng quy định, và giảm dần khi job bị <em>quarantine</em>). Có thể <em>Provision on demand</em> một user để thử ngay.</li>
  <li>Khi user bị gỡ khỏi ứng dụng hoặc bị disable/xóa trong Entra ID, tài khoản trong ứng dụng bị disable tương ứng (deprovisioning).</li>
  <li>Theo dõi trong <strong>Provisioning logs</strong> (cần P1 hoặc P2 để xem log).</li>
</ul>

<h4>Microsoft Entra Connect Sync</h4>
<ul>
  <li>Chu kỳ đồng bộ mặc định <strong>30 phút</strong>. Ép đồng bộ ngay trên server Connect: <code>Start-ADSyncSyncCycle -PolicyType Delta</code> (hoặc <code>Initial</code> cho đồng bộ đầy đủ).</li>
  <li>Có thể lọc theo domain, OU hoặc thuộc tính để chỉ đồng bộ một phần đối tượng.</li>
</ul>

<h4>Self-service sign-up và các cách khác</h4>
<ul>
  <li>Người ngoài có thể tự đăng ký qua <em>self-service sign-up user flow</em> của External ID cho ứng dụng được chỉ định.</li>
  <li>Bulk create bằng CSV hoặc script Microsoft Graph cho đợt tạo hàng loạt một lần.</li>
</ul>
<div class="callout exam"><strong>Góc thi</strong>"Khi HR nhập nhân viên mới vào Workday, tài khoản được tạo tự động" → <strong>HR-driven provisioning</strong>. "Tự tạo và vô hiệu hóa tài khoản trong ứng dụng SaaS theo Entra ID" → <strong>automatic provisioning (SCIM)</strong> trong Enterprise applications. "Đồng bộ ngay thay đổi từ AD on-prem" → <code>Start-ADSyncSyncCycle -PolicyType Delta</code>.</div>
`
    },
    {
      id: 'b2b-guests',
      extra: true,
      title: 'Guest user và B2B collaboration',
      html: `
<p><strong>B2B collaboration</strong> cho phép mời người ngoài (đối tác, nhà cung cấp) dùng chính danh tính của họ (tài khoản Entra ID tổ chức khác, Microsoft account, Google, email one-time passcode…) để truy cập ứng dụng và tài nguyên của bạn. Họ xuất hiện trong tenant của bạn dưới dạng <strong>guest</strong> (<code>userType = Guest</code>), UPN có dạng <code>ten_domain.com#EXT#@contoso.onmicrosoft.com</code>.</p>

<h4>Mời guest</h4>
<ol class="steps">
  <li>Users &gt; <strong>New user</strong> &gt; <strong>Invite external user</strong>: nhập email, tên hiển thị, thông điệp mời, có thể thêm vào group/role ngay.</li>
  <li>Guest nhận email, nhấn link và hoàn tất <strong>redemption</strong> (đồng ý quyền). Trước khi chấp nhận, trạng thái lời mời là <em>Pending acceptance</em>.</li>
  <li>Gán quyền cho guest như user bình thường: group, enterprise app, Azure RBAC.</li>
</ol>
<pre><code>New-MgInvitation -InvitedUserEmailAddress partner@fabrikam.com \\
  -InviteRedirectUrl "https://myapps.microsoft.com" -SendInvitationMessage:$true
az rest --method post --url https://graph.microsoft.com/v1.0/invitations \\
  --body '{"invitedUserEmailAddress":"partner@fabrikam.com","inviteRedirectUrl":"https://myapps.microsoft.com"}'</code></pre>

<h4>External collaboration settings</h4>
<ul>
  <li><strong>Guest user access</strong>: mức quyền của guest với directory (giống member, giới hạn mặc định, hoặc hạn chế nhất).</li>
  <li><strong>Guest invite settings</strong>: ai được mời guest, từ "mọi người kể cả guest" tới "không ai, kể cả admin". Mặc định mọi người trong tổ chức, kể cả guest và non-admin, đều mời được. Vai trò <strong>Guest Inviter</strong> cho phép mời mà không cần quyền admin khác.</li>
  <li><strong>Collaboration restrictions</strong>: <em>allow list</em> chỉ cho mời từ các domain được chỉ định, hoặc <em>deny list</em> chặn domain cụ thể.</li>
</ul>
<h4>Cross-tenant access settings</h4>
<p>Áp dụng với tổ chức khác dùng Entra ID: cấu hình <strong>inbound</strong> (người ngoài vào tenant bạn) và <strong>outbound</strong> (user của bạn đi ra), chọn có <strong>tin cậy MFA và trạng thái thiết bị</strong> từ tenant kia hay không. <strong>B2B direct connect</strong> (dùng cho Teams shared channels) không tạo guest object trong tenant của bạn.</p>

<h4>Chi phí và giới hạn</h4>
<ul>
  <li>Tính phí theo <strong>monthly active users (MAU)</strong>; 50.000 MAU đầu tiên miễn phí khi tenant đã liên kết subscription Azure cho External ID.</li>
  <li>Tenant không có license trả phí và cũ hơn 30 ngày: tối đa 100 lời mời mỗi ngày.</li>
  <li>Đổi guest thành member: sửa thuộc tính <code>userType</code> (hoặc dùng tính năng chuyển đổi external user thành internal).</li>
  <li>Mời hàng loạt: <em>Bulk invite</em> bằng CSV.</li>
</ul>
<div class="callout exam"><strong>Góc thi</strong>"Chỉ cho phép mời guest từ fabrikam.com" → <strong>allow list</strong> trong collaboration restrictions. "User thường không được mời guest nhưng nhóm Partner Managers được" → hạn chế guest invite settings và gán role <strong>Guest Inviter</strong>. "Guest dùng MFA ở tenant của họ, không muốn bắt MFA lần nữa" → bật trust MFA trong <strong>cross-tenant access settings</strong> (inbound).</div>
`
    },
    {
      id: 'bulk-operations',
      extra: true,
      title: 'Bulk operations bằng CSV',
      html: `
<p>Microsoft Entra admin center hỗ trợ thao tác hàng loạt bằng file CSV. Luôn tải <strong>CSV template</strong> từ chính trang thao tác, vì cột và thứ tự cột phải đúng định dạng.</p>
<table>
  <thead><tr><th>Đối tượng</th><th>Thao tác hàng loạt</th></tr></thead>
  <tbody>
    <tr><td>Users</td><td>Bulk create, Bulk invite (guest), Bulk delete, Download users</td></tr>
    <tr><td>Groups</td><td>Import members, Remove members, Download members, Download groups</td></tr>
    <tr><td>Devices</td><td>Download devices</td></tr>
  </tbody>
</table>

<h4>Bulk create user</h4>
<ol class="steps">
  <li>Users &gt; <strong>Bulk operations</strong> &gt; <strong>Bulk create</strong> &gt; <em>Download</em> CSV template.</li>
  <li>Điền dữ liệu từ dòng thứ ba. <strong>Không xóa hai dòng đầu</strong> (dòng version và dòng tiêu đề) và không thêm cột lạ. Cột bắt buộc: <em>Name [displayName]</em>, <em>User name [userPrincipalName]</em>, <em>Initial password [passwordProfile]</em>, <em>Block sign in [accountEnabled]</em>.</li>
  <li>Upload file, chờ kiểm tra hợp lệ, rồi <em>Submit</em>.</li>
  <li>Theo dõi kết quả ở <strong>Bulk operation results</strong>; tải file kết quả để xem dòng nào lỗi.</li>
</ol>
<p>Bulk invite có template riêng với cột địa chỉ email cần mời và redirect URL. Bulk delete chỉ cần cột UPN.</p>

<h4>Giới hạn và lưu ý</h4>
<ul>
  <li>Mỗi thao tác bulk phải hoàn tất trong khoảng <strong>1 giờ</strong>; tenant lớn nên chia CSV thành nhiều đợt nhỏ.</li>
  <li>Vai trò: User Administrator (user), Groups Administrator hoặc owner group (member), Guest Inviter hoặc tương đương (invite).</li>
  <li>User tạo hàng loạt vẫn cần usage location và license như bình thường.</li>
  <li>Thay thế cho tenant lớn hoặc cần lặp lại: script Microsoft Graph PowerShell.</li>
</ul>
<pre><code>Import-Csv .\\users.csv | ForEach-Object {
  New-MgUser -DisplayName $_.DisplayName -UserPrincipalName $_.UPN -MailNickname $_.Alias \\
    -AccountEnabled -PasswordProfile @{ Password = $_.Password; ForceChangePasswordNextSignIn = $true }
}
Get-MgUser -All -Property DisplayName,UserPrincipalName,UserType | Export-Csv users-export.csv -NoTypeInformation</code></pre>
<div class="callout exam"><strong>Góc thi</strong>"Tạo 500 user từ file CSV với ít công nhất, không viết script" → <strong>Bulk create</strong> trên portal. "Mời 200 đối tác cùng lúc" → <strong>Bulk invite</strong>. Lỗi upload thường do sửa hoặc xóa hai dòng đầu của template.</div>
`
    },
    {
      id: 'administrative-units',
      extra: true,
      title: 'Administrative units',
      html: `
<p><strong>Administrative unit (AU)</strong> là "thùng chứa" logic trong Entra ID chứa <strong>user, group hoặc device</strong>, dùng để <strong>giới hạn phạm vi</strong> của một Microsoft Entra role. Ví dụ: giao role Helpdesk Administrator cho đội IT chi nhánh Hà Nội chỉ trên AU "Hanoi", để họ chỉ reset mật khẩu user Hà Nội.</p>
<pre class="diagram">Tenant
 ├── AU "Hanoi"  : user Hà Nội  ◀── Helpdesk Administrator (scope: AU Hanoi) = IT Hà Nội
 └── AU "HCMC"   : user TP.HCM  ◀── User Administrator    (scope: AU HCMC)  = IT HCM</pre>

<h4>Đặc điểm</h4>
<ul>
  <li>AU <strong>không lồng nhau</strong> được (no nesting).</li>
  <li>Một đối tượng có thể thuộc tối đa <strong>30</strong> AU (ví dụ vừa thuộc AU theo địa lý vừa theo phòng ban).</li>
  <li>Thêm <strong>group</strong> vào AU chỉ đưa <em>bản thân group</em> vào phạm vi (sửa tên, sửa membership), <strong>không</strong> đưa các thành viên của group. Muốn quản lý user trong group thì phải thêm user trực tiếp vào AU.</li>
  <li>Membership của AU có thể <strong>assigned</strong> hoặc <strong>dynamic</strong> (rule cho user hoặc device; không có dynamic cho group).</li>
  <li>AU chỉ giới hạn <em>quyền quản lý</em>; không ngăn user đọc danh bạ ngoài AU theo quyền mặc định.</li>
  <li><strong>Restricted management AU</strong>: đối tượng bên trong chỉ admin được gán ở phạm vi AU đó mới sửa được, kể cả tenant-level admin (trừ khi được gán role trên AU). Tối đa 100 restricted management AU mỗi tenant.</li>
  <li>Role phổ biến gán theo AU: User Administrator, Helpdesk Administrator, Groups Administrator, Authentication Administrator, License Administrator, Cloud Device Administrator…</li>
</ul>

<h4>License và quyền</h4>
<ul>
  <li>Tạo AU: dùng được với bản <strong>Free</strong>.</li>
  <li>Mỗi <strong>admin được gán role theo phạm vi AU</strong> cần license <strong>P1</strong>; thành viên AU chỉ cần Free.</li>
  <li>Dùng dynamic membership cho AU: mỗi thành viên cần <strong>P1</strong>.</li>
  <li>Tạo AU và gán role theo AU cần tối thiểu <strong>Privileged Role Administrator</strong>.</li>
</ul>
<pre><code>$au = New-MgDirectoryAdministrativeUnit -DisplayName "Hanoi" -Description "Chi nhánh Hà Nội"
New-MgDirectoryAdministrativeUnitMemberByRef -AdministrativeUnitId $au.Id \\
  -OdataId "https://graph.microsoft.com/v1.0/users/&lt;userId&gt;"</code></pre>
<div class="callout exam"><strong>Góc thi</strong>"Cho đội IT chi nhánh reset mật khẩu chỉ user chi nhánh, ít đặc quyền nhất" → tạo <strong>administrative unit</strong> + gán <strong>Helpdesk Administrator</strong> với scope AU. Không chọn resource group hay management group: đó là phạm vi Azure RBAC cho tài nguyên Azure, không áp dụng cho user Entra ID.</div>
`
    }
  ],
  keyFacts: [
    'User bị xóa ở trạng thái soft-delete <strong>30 ngày</strong>, khôi phục đầy đủ thuộc tính và license; sau đó xóa vĩnh viễn, không ai khôi phục được.',
    'Microsoft 365 group khôi phục được trong <strong>30 ngày</strong>; <strong>Security group xóa là mất vĩnh viễn</strong>.',
    'Microsoft 365 group <strong>chỉ chứa user</strong>; Security group chứa user, device, service principal, group lồng nhau. Dynamic device group chỉ là Security group.',
    'Dynamic group cần <strong>P1</strong> cho mỗi user thành viên; tối đa <strong>15.000</strong> dynamic group (tính cả dynamic AU) mỗi tenant; không thêm thủ công được.',
    'Group-based licensing cần <strong>P1</strong> (hoặc gói đủ điều kiện như Office 365 E3),<strong>không hỗ trợ nested group</strong>, user thiếu usage location sẽ nhận usage location của tenant.',
    'Gán license trực tiếp yêu cầu user có <strong>usage location</strong>.',
    'deviceTrustType: <code>AzureAD</code> = Entra joined, <code>ServerAD</code> = hybrid joined, <code>Workplace</code> = registered.',
    'Device settings: tối đa <strong>50</strong> thiết bị mỗi user (mặc định, tối đa 100 hoặc Unlimited); "Users may join devices" mặc định All.',
    'Custom security attributes: miễn phí; gán cho user và service principal; Global Administrator <strong>mặc định không có quyền</strong>; tối đa 500 attribute active.',
    'Administrative unit: không lồng nhau; admin theo AU cần <strong>P1</strong>; thêm group vào AU <strong>không</strong> đưa thành viên của group vào phạm vi.',
    'Role-assignable group: chỉ đặt lúc tạo, membership assigned, tối đa 500 mỗi tenant.',
    'Bulk operation phải xong trong khoảng <strong>1 giờ</strong>; không xóa hai dòng đầu của CSV template.'
  ],
  traps: [
    'Cố khôi phục <strong>security group</strong> đã xóa: không có tính năng này, chỉ Microsoft 365 group mới restore được.',
    'Gán license cho group cha và nghĩ user trong group con cũng nhận: group-based licensing <strong>không hỗ trợ nested group</strong>.',
    'Xóa license kế thừa trực tiếp trên user: không làm được, phải gỡ user khỏi group hoặc gỡ license khỏi group.',
    'Chọn Microsoft 365 group cho dynamic <strong>device</strong> group, hoặc để chứa group khác: Microsoft 365 group chỉ chứa user.',
    'Nghĩ Global Administrator tự có quyền với custom security attributes: phải gán thêm <strong>Attribute Definition/Assignment Administrator</strong>.',
    'Thêm group vào administrative unit và nghĩ admin AU quản lý được user trong group đó: phải thêm <strong>user trực tiếp</strong> vào AU.',
    'Dùng resource group hoặc management group để giới hạn admin quản lý user: phạm vi đúng là <strong>administrative unit</strong>.',
    'Sửa hoặc xóa user synced trên portal: thay đổi phải làm ở <strong>AD DS on-premises</strong>, nếu không đồng bộ sẽ ghi đè hoặc tạo lại.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Xóa user</td><td>Soft delete 30 ngày; restore bởi User Administrator; xóa vĩnh viễn không khôi phục</td></tr>
    <tr><td>Group</td><td>Security (user/device/SP/group) · Microsoft 365 (chỉ user, restore 30 ngày)</td></tr>
    <tr><td>Membership</td><td>Assigned · Dynamic user · Dynamic device (Security); dynamic cần P1</td></tr>
    <tr><td>Rule</td><td><code>user.department -eq "Sales"</code> · <code>-in [...]</code> · <code>-and/-or/-not</code> · <code>-any/-all</code></td></tr>
    <tr><td>License</td><td>Cần usage location; group-based cần P1, không nested; reprocess khi lỗi</td></tr>
    <tr><td>Device</td><td>Registered (BYOD) · Joined (cloud, công ty) · Hybrid joined (AD DS + Entra)</td></tr>
    <tr><td>Device settings</td><td>Tối đa 50 thiết bị/user (mặc định) · MFA toggle mặc định No</td></tr>
    <tr><td>Custom security attributes</td><td>Free · user + service principal · role Attribute Definition/Assignment Admin</td></tr>
    <tr><td>Administrative unit</td><td>User/group/device · không lồng · admin cần P1 · ≤ 30 AU mỗi đối tượng</td></tr>
    <tr><td>B2B</td><td>userType Guest · allow/deny domain · Guest Inviter · cross-tenant access settings</td></tr>
    <tr><td>Provisioning</td><td>Connect Sync 30 phút · HR-driven (P1) · SCIM ra SaaS</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'User bị xóa được giữ bao lâu để khôi phục?', back: '<strong>30 ngày</strong> (soft delete). Sau đó xóa vĩnh viễn tự động.' },
    { front: 'Vai trò tối thiểu để tạo và khôi phục user?', back: '<strong>User Administrator</strong>.' },
    { front: 'Security group bị xóa có khôi phục được không?', back: '<strong>Không</strong>. Chỉ Microsoft 365 group khôi phục được (30 ngày).' },
    { front: 'Microsoft 365 group chứa được device không?', back: '<strong>Không</strong>, chỉ user. Device phải dùng Security group.' },
    { front: 'Rule chọn mọi user là member (không gồm guest)?', back: '<code>(user.objectId -ne null) -and (user.userType -eq "Member")</code>' },
    { front: 'Rule chọn thiết bị Microsoft Entra joined?', back: '<code>device.deviceTrustType -eq "AzureAD"</code>' },
    { front: 'License cần cho dynamic group?', back: '<strong>Microsoft Entra ID P1</strong> cho mỗi user thành viên; device không cần.' },
    { front: 'Điều kiện bắt buộc trước khi gán license trực tiếp cho user?', back: 'User phải có <strong>usage location</strong>.' },
    { front: 'Group-based licensing có hỗ trợ nested group không?', back: '<strong>Không</strong>. Chỉ thành viên trực tiếp nhận license.' },
    { front: 'Ba trạng thái danh tính thiết bị?', back: '<strong>Registered</strong> (BYOD), <strong>Joined</strong> (thiết bị công ty, cloud), <strong>Hybrid joined</strong> (đã join AD DS và đăng ký Entra ID).' },
    { front: 'Giá trị mặc định Maximum number of devices per user?', back: '<strong>50</strong> (có thể tới 100 hoặc Unlimited).' },
    { front: 'Global Administrator có quyền với custom security attributes không?', back: '<strong>Không</strong> theo mặc định. Cần Attribute Definition Administrator / Attribute Assignment Administrator.' },
    { front: 'Custom security attributes gán được cho đối tượng nào?', back: '<strong>User</strong> và <strong>enterprise application (service principal)</strong>.' },
    { front: 'Administrative unit có lồng nhau được không?', back: '<strong>Không</strong>.' },
    { front: 'Thêm group vào AU thì admin AU quản lý được user trong group không?', back: '<strong>Không</strong>. Chỉ quản lý được bản thân group; user phải được thêm trực tiếp vào AU.' },
    { front: 'Chỉ cho phép mời guest từ một số domain?', back: 'External collaboration settings &gt; <strong>Collaboration restrictions</strong> &gt; allow list.' },
    { front: 'Role cho phép mời guest mà không cần quyền admin khác?', back: '<strong>Guest Inviter</strong>.' },
    { front: 'Lệnh ép Microsoft Entra Connect đồng bộ ngay?', back: '<code>Start-ADSyncSyncCycle -PolicyType Delta</code>' }
  ],
  quiz: [
    {
      q: 'Một user bị xóa nhầm khỏi Microsoft Entra ID cách đây 12 ngày. User được tạo trực tiếp trên cloud. Bạn cần khôi phục user cùng group membership và license với ít công sức nhất. Bạn làm gì?',
      options: ['Tạo user mới cùng UPN rồi thêm lại vào group', 'Restore user từ trang Deleted users', 'Mở ticket Microsoft Support để khôi phục từ backup', 'Khôi phục từ AD Recycle Bin rồi chạy đồng bộ'],
      answer: [1],
      explain: 'User bị xóa dưới 30 ngày được khôi phục đầy đủ thuộc tính, membership và license từ Deleted users. Tạo user mới mất toàn bộ liên kết cũ. Microsoft Support không khôi phục được hơn những gì portal làm. AD Recycle Bin chỉ áp dụng cho user đồng bộ từ on-premises.'
    },
    {
      q: 'Bạn cần một group mà mọi user có department là "Sales" hoặc "Marketing" tự động trở thành thành viên, và group này dùng để gán quyền RBAC trên một resource group. Bạn cấu hình thế nào? (Chọn 2)',
      options: ['Group type: Microsoft 365, membership: Assigned', 'Group type: Security', 'Membership: Dynamic user với rule <code>user.department -in ["Sales","Marketing"]</code>', 'Membership: Dynamic device với rule <code>device.department -eq "Sales"</code>'],
      answer: [1, 2],
      explain: 'Security group phù hợp để gán quyền, và dynamic user rule với toán tử <code>-in</code> chọn cả hai phòng ban. Membership Assigned không tự động. Thuộc tính department là của user, không phải device, nên rule dynamic device là sai.'
    },
    {
      q: 'Bạn muốn tạo group chứa toàn bộ laptop Windows đã Microsoft Entra joined để áp policy Intune. Loại group và rule nào đúng?',
      options: ['Microsoft 365 group, rule <code>device.deviceOSType -eq "Windows"</code>', 'Security group, rule <code>user.deviceTrustType -eq "AzureAD"</code>', 'Security group, dynamic device, rule <code>(device.deviceOSType -eq "Windows") -and (device.deviceTrustType -eq "AzureAD")</code>', 'Security group, dynamic device, rule <code>device.deviceTrustType -eq "Workplace"</code>'],
      answer: [2],
      explain: 'Dynamic device group chỉ có ở Security group; <code>deviceTrustType</code> bằng AzureAD là Entra joined. Microsoft 365 group không chứa device. deviceTrustType không phải thuộc tính của user. Workplace tương ứng thiết bị registered (BYOD), không phải joined.'
    },
    {
      q: 'Bạn gán license Microsoft 365 E3 cho group GroupA. GroupA có thành viên là User1 và group GroupB (GroupB chứa User2). Ai nhận được license?',
      options: ['Chỉ User1', 'User1 và User2', 'Chỉ User2', 'Không ai, vì GroupA chứa group lồng nhau nên việc gán thất bại'],
      answer: [0],
      explain: 'Group-based licensing không hỗ trợ nested group: chỉ thành viên trực tiếp (User1) nhận license. User2 nằm trong group lồng nên không nhận. Việc gán không thất bại vì có group lồng; group lồng chỉ đơn giản bị bỏ qua.'
    },
    {
      q: 'Bạn cố gán license Microsoft 365 E5 trực tiếp cho user mới tạo nhưng thao tác bị từ chối. Tenant còn license trống. Nguyên nhân khả dĩ nhất là gì?',
      options: ['User chưa đăng nhập lần nào', 'User chưa được thêm vào group nào', 'Tenant cần Microsoft Entra ID P2', 'User chưa có usage location'],
      answer: [3],
      explain: 'Gán license trực tiếp yêu cầu user có usage location vì một số dịch vụ không khả dụng ở mọi quốc gia. Việc user đăng nhập hay thuộc group không ảnh hưởng gán trực tiếp, và license Microsoft 365 không yêu cầu P2.'
    },
    {
      q: 'Công ty muốn đội IT chi nhánh Đà Nẵng chỉ reset được mật khẩu cho user Đà Nẵng, theo nguyên tắc ít đặc quyền nhất. Bạn làm gì? (Chọn 2)',
      options: ['Tạo administrative unit chứa user Đà Nẵng', 'Gán role Helpdesk Administrator cho đội IT với scope là administrative unit đó', 'Gán role User Administrator cho đội IT ở phạm vi tenant', 'Tạo resource group "DaNang" và gán role Contributor cho đội IT'],
      answer: [0, 1],
      explain: 'Administrative unit giới hạn phạm vi Entra role; Helpdesk Administrator đủ để reset mật khẩu user thường. User Administrator ở phạm vi tenant cấp quá nhiều quyền. Resource group và Contributor là Azure RBAC cho tài nguyên Azure, không quản lý được user Entra ID.'
    },
    {
      q: 'Bạn thêm group SG-Hanoi (chứa 50 user) vào administrative unit AU-Hanoi và gán User Administrator cho Admin1 với scope AU-Hanoi. Admin1 có thể làm gì?',
      options: ['Reset mật khẩu cho cả 50 user trong SG-Hanoi', 'Đổi tên SG-Hanoi và quản lý thành viên của nó, nhưng không sửa thuộc tính của 50 user', 'Quản lý mọi user trong tenant', 'Không làm được gì vì AU không chứa được group'],
      answer: [1],
      explain: 'Thêm group vào AU chỉ đưa bản thân group vào phạm vi: Admin1 sửa được tên và membership của group, nhưng không sửa thuộc tính hay reset mật khẩu của thành viên trừ khi user được thêm trực tiếp vào AU. Phạm vi không mở rộng ra toàn tenant, và AU chứa được user, group, device.'
    },
    {
      q: 'Bạn là Global Administrator. Bạn cần định nghĩa custom security attribute "Project" và gán giá trị cho user, nhưng không thấy tùy chọn tạo attribute set. Bạn cần làm gì?',
      options: ['Mua license Microsoft Entra ID P2', 'Bật Access management for Azure resources', 'Gán cho mình role Attribute Definition Administrator và Attribute Assignment Administrator', 'Chuyển sang dùng extension attribute vì Global Administrator không thể dùng custom security attributes'],
      answer: [2],
      explain: 'Global Administrator mặc định không có quyền với custom security attributes; cần role Attribute Definition Administrator để định nghĩa và Attribute Assignment Administrator để gán. Tính năng này miễn phí nên không cần P2. Elevate access chỉ liên quan Azure RBAC. Global Administrator vẫn dùng được sau khi tự gán role.'
    },
    {
      q: 'Nhân viên muốn dùng điện thoại Android cá nhân để truy cập email công ty, và công ty muốn áp Conditional Access dựa trên thiết bị. Thiết bị nên có danh tính kiểu nào?',
      options: ['Microsoft Entra registered', 'Microsoft Entra joined', 'Microsoft Entra hybrid joined', 'Domain join vào Microsoft Entra Domain Services'],
      answer: [0],
      explain: 'Thiết bị cá nhân (BYOD) và di động dùng Microsoft Entra registered. Entra joined dành cho thiết bị Windows của tổ chức đăng nhập bằng tài khoản Entra ID. Hybrid join yêu cầu máy Windows đã join AD DS. Domain join vào managed domain không áp dụng cho điện thoại Android.'
    },
    {
      q: 'Một user báo không thể đăng ký thêm thiết bị mới vào Microsoft Entra ID. User này đã có rất nhiều thiết bị registered cũ. Bạn kiểm tra cài đặt nào đầu tiên?',
      options: ['Require multifactor authentication to register or join devices', 'Maximum number of devices per user', 'Enterprise State Roaming', 'Additional local administrators on Microsoft Entra joined devices'],
      answer: [1],
      explain: 'Khi user chạm giới hạn Maximum number of devices (mặc định 50), họ không thêm được thiết bị cho tới khi xóa bớt. Toggle MFA chỉ yêu cầu thêm bước xác thực chứ không chặn theo số lượng. Enterprise State Roaming và local administrators không liên quan đến việc đăng ký thiết bị.'
    },
    {
      q: 'Công ty chỉ muốn cho phép mời guest có email thuộc domain fabrikam.com và tailspin.com. Bạn cấu hình ở đâu?',
      options: ['Cross-tenant access settings, outbound', 'Conditional Access policy chặn guest', 'User settings, Restrict access to Microsoft Entra admin center', 'External collaboration settings, Collaboration restrictions, allow only specified domains'],
      answer: [3],
      explain: 'Collaboration restrictions với allow list giới hạn domain được mời. Outbound cross-tenant access kiểm soát user của bạn đi ra tổ chức khác. Conditional Access kiểm soát đăng nhập chứ không kiểm soát lời mời. Restrict access to admin center không liên quan đến B2B.'
    },
    {
      q: 'Bạn cần tạo 800 user từ danh sách Excel do phòng nhân sự gửi, với ít công sức nhất và không viết script. Bạn làm gì?',
      options: ['Dùng Bulk create với CSV template tải từ trang Users', 'Tạo từng user trên portal', 'Cài Microsoft Entra Connect để đồng bộ file Excel', 'Dùng Bulk invite'],
      answer: [0],
      explain: 'Bulk create nhận CSV theo template và tạo hàng loạt user member. Tạo thủ công tốn công. Entra Connect đồng bộ từ AD DS chứ không đọc file Excel. Bulk invite dùng để mời guest bên ngoài, không tạo member.'
    },
    {
      q: 'Bạn muốn khi phòng nhân sự nhập nhân viên mới vào Workday, tài khoản Entra ID được tạo tự động, và tài khoản tương ứng trong ServiceNow cũng được tạo tự động. Bạn cần những gì? (Chọn 2)',
      options: ['HR-driven provisioning từ Workday vào Microsoft Entra ID', 'Bulk create mỗi tuần từ file xuất của Workday', 'Automatic provisioning (SCIM) cho ứng dụng ServiceNow trong Enterprise applications', 'Cross-tenant synchronization giữa Workday và ServiceNow'],
      answer: [0, 2],
      explain: 'HR-driven provisioning tạo user từ hệ thống HR, còn app provisioning (SCIM) tự tạo và vô hiệu hóa tài khoản trong ứng dụng SaaS. Bulk create hằng tuần là thủ công và không tức thời. Cross-tenant synchronization dùng giữa hai tenant Entra ID, không phải giữa ứng dụng.'
    },
    {
      q: 'User2 nhận license Microsoft 365 E3 kế thừa từ group SG-Licensed. Bạn mở trang license của User2 và cố gỡ E3 nhưng không được. Cách đúng để User2 không còn license E3 là gì?',
      options: ['Xóa rồi khôi phục User2', 'Đặt usage location của User2 thành trống', 'Gỡ User2 khỏi SG-Licensed (hoặc gỡ E3 khỏi group)', 'Gán thêm license E5 trực tiếp để thay thế'],
      answer: [2],
      explain: 'License kế thừa từ group chỉ gỡ được bằng cách gỡ user khỏi group hoặc gỡ license khỏi group. Xóa rồi khôi phục user sẽ khôi phục lại cả license. Xóa usage location gây lỗi chứ không gỡ license theo cách chuẩn. Gán thêm E5 không gỡ E3.'
    }
  ]
});

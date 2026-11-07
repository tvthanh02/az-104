AZ.addModule({
  id: 'p2m5',
  summary: 'Azure role-based access control (Azure RBAC) quyết định <strong>ai</strong> được làm <strong>gì</strong> trên <strong>resource nào</strong>. Đây là một trong những chủ đề nặng điểm nhất của domain "Manage Azure identities and governance": đề AZ-104 hỏi về chọn built-in role đúng với nguyên tắc least privilege, scope và kế thừa, custom role JSON, deny assignment và sự khác biệt giữa Azure RBAC với Microsoft Entra roles.',
  objectives: [
    'Giải thích bốn thành phần của role assignment: security principal, role definition, scope, assignment',
    'Chọn built-in role phù hợp (Owner, Contributor, Reader, User Access Administrator, role theo dịch vụ) theo least privilege',
    'Liệt kê, kiểm tra và gán quyền bằng portal, Azure CLI và Azure PowerShell',
    'Tra cứu thay đổi role trong activity log',
    'Viết custom role JSON (Actions, NotActions, DataActions, AssignableScopes) và hiểu thứ tự đánh giá quyền với deny assignment',
    'Phân biệt Azure RBAC với Microsoft Entra roles và cơ chế elevate access của Global Administrator'
  ],
  sections: [
    {
      id: 'what-is-rbac',
      unit: 'What is Azure RBAC?',
      title: 'Azure RBAC là gì? Bốn khái niệm cốt lõi và built-in roles',
      html: `
<p><strong>Azure RBAC</strong> là hệ thống phân quyền xây dựng trên <strong>Azure Resource Manager</strong>. Quyền được cấp bằng cách tạo <strong>role assignment</strong>, và bị thu hồi bằng cách xóa role assignment. Sử dụng RBAC miễn phí.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 268" role="img" aria-label="Role assignment gồm security principal, role definition và scope">
  <rect class="box-a" x="10" y="20" width="200" height="150" rx="10"/>
  <text x="110" y="44" text-anchor="middle" class="t-b">Security principal</text>
  <text x="110" y="62" text-anchor="middle" class="t-sm t-a">AI?</text>
  <text x="110" y="88" text-anchor="middle" class="t-sm">User</text>
  <text x="110" y="108" text-anchor="middle" class="t-sm">Group</text>
  <text x="110" y="128" text-anchor="middle" class="t-sm">Service principal</text>
  <text x="110" y="148" text-anchor="middle" class="t-sm">Managed identity</text>

  <line class="ln" x1="224" y1="95" x2="240" y2="95"/><line class="ln" x1="232" y1="87" x2="232" y2="103"/>

  <rect class="box-e" x="255" y="20" width="200" height="150" rx="10"/>
  <text x="355" y="44" text-anchor="middle" class="t-b">Role definition</text>
  <text x="355" y="62" text-anchor="middle" class="t-sm t-a">LÀM GÌ?</text>
  <text x="355" y="88" text-anchor="middle" class="t-sm">Owner, Contributor</text>
  <text x="355" y="108" text-anchor="middle" class="t-sm">Reader</text>
  <text x="355" y="128" text-anchor="middle" class="t-sm">VM Contributor</text>
  <text x="355" y="148" text-anchor="middle" class="t-sm">custom role…</text>

  <line class="ln" x1="469" y1="95" x2="485" y2="95"/><line class="ln" x1="477" y1="87" x2="477" y2="103"/>

  <rect class="box-w" x="500" y="20" width="210" height="150" rx="10"/>
  <text x="605" y="44" text-anchor="middle" class="t-b">Scope</text>
  <text x="605" y="62" text-anchor="middle" class="t-sm t-a">Ở ĐÂU?</text>
  <text x="605" y="88" text-anchor="middle" class="t-sm">Management group</text>
  <text x="605" y="108" text-anchor="middle" class="t-sm">Subscription</text>
  <text x="605" y="128" text-anchor="middle" class="t-sm">Resource group</text>
  <text x="605" y="148" text-anchor="middle" class="t-sm">Resource</text>

  <line class="ln" x1="110" y1="170" x2="280" y2="207" marker-end="url(#arr)"/>
  <line class="ln" x1="355" y1="170" x2="355" y2="206" marker-end="url(#arr)"/>
  <line class="ln" x1="605" y1="170" x2="440" y2="207" marker-end="url(#arr)"/>
  <rect class="box-s" x="210" y="211" width="300" height="50" rx="10"/>
  <text x="360" y="233" text-anchor="middle" class="t-b">Role assignment</text>
  <text x="360" y="251" text-anchor="middle" class="t-sm">vd. alice · VM Contributor · rg-app</text>
</svg>
<figcaption>Hình 1. Một role assignment trả lời ba câu hỏi: ai (principal), được làm gì (role definition) và ở đâu (scope). Thu hồi quyền = xóa role assignment.</figcaption>
</figure>

<h4>1. Security principal</h4>
<ul>
  <li><strong>User</strong>: tài khoản trong Microsoft Entra ID (kể cả guest B2B).</li>
  <li><strong>Group</strong>: thành viên nhận quyền của group; <strong>bắc cầu</strong> (group lồng group vẫn nhận quyền). Gán cho group là best practice, cũng giúp không chạm giới hạn 5.000 role assignment mỗi subscription.</li>
  <li><strong>Service principal</strong>: danh tính của ứng dụng / pipeline.</li>
  <li><strong>Managed identity</strong>: danh tính do Azure quản lý cho VM, Function, Logic App… (system-assigned hoặc user-assigned).</li>
</ul>

<h4>2. Role definition</h4>
<p>Tập quyền gồm <code>Actions</code> / <code>NotActions</code> (control plane) và <code>DataActions</code> / <code>NotDataActions</code> (data plane). Quyền hiệu lực = <code>Actions − NotActions</code> và <code>DataActions − NotDataActions</code>.</p>

<h4>3. Scope</h4>
<p>Bốn cấp: <strong>management group → subscription → resource group → resource</strong>. Gán ở cấp cha thì kế thừa xuống mọi cấp con.</p>

<h4>4. Mô hình cộng dồn (additive)</h4>
<p>Quyền hiệu lực là <strong>tổng</strong> tất cả role assignment. Ví dụ Contributor ở subscription + Reader ở RG1 → trên RG1 người đó vẫn là Contributor. Không có cách "trừ bớt" quyền bằng role assignment; chỉ <strong>deny assignment</strong> mới chặn được.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 256" role="img" aria-label="Role assignment ở subscription và resource group được kế thừa và cộng dồn xuống VM">
  <rect class="box" x="10" y="20" width="220" height="40" rx="8"/>
  <text x="120" y="45" text-anchor="middle" class="t-b">Management group</text>
  <rect class="box-a" x="10" y="80" width="220" height="40" rx="8"/>
  <text x="120" y="105" text-anchor="middle" class="t-b">Subscription</text>
  <rect class="box-a" x="10" y="140" width="220" height="40" rx="8"/>
  <text x="120" y="165" text-anchor="middle" class="t-b">rg-app</text>
  <rect class="box-s" x="10" y="200" width="220" height="40" rx="8"/>
  <text x="120" y="225" text-anchor="middle" class="t-b">vm1</text>
  <line class="ln" x1="120" y1="60" x2="120" y2="76" marker-end="url(#arr)"/>
  <line class="ln" x1="120" y1="120" x2="120" y2="136" marker-end="url(#arr)"/>
  <line class="ln" x1="120" y1="180" x2="120" y2="196" marker-end="url(#arr)"/>
  <text x="140" y="72" class="t-sm t-mute">kế thừa</text>

  <rect class="box-e" x="300" y="83" width="220" height="34" rx="8"/>
  <text x="410" y="105" text-anchor="middle" class="t-sm">alice: Contributor</text>
  <rect class="box" x="300" y="143" width="220" height="34" rx="8"/>
  <text x="410" y="165" text-anchor="middle" class="t-sm">alice: Reader</text>
  <line class="ln" x1="300" y1="100" x2="234" y2="100" marker-end="url(#arr)"/>
  <line class="ln" x1="300" y1="160" x2="234" y2="160" marker-end="url(#arr)"/>

  <rect class="box-s" x="550" y="170" width="160" height="72" rx="10"/>
  <text x="630" y="193" text-anchor="middle" class="t-b">Quyền trên vm1</text>
  <text x="630" y="213" text-anchor="middle" class="t-b t-s">Contributor</text>
  <text x="630" y="232" text-anchor="middle" class="t-sm">Reader không hạ quyền</text>
  <line class="ln-s" x1="230" y1="220" x2="546" y2="220" marker-end="url(#arr-s)"/>
  <text x="390" y="212" text-anchor="middle" class="t-sm t-s">Contributor ∪ Reader</text>
</svg>
<figcaption>Hình 2. Contributor gán ở subscription được kế thừa xuống <code>rg-app</code> và <code>vm1</code>. Thêm Reader ở <code>rg-app</code> chỉ cộng thêm quyền đọc, quyền hiệu lực vẫn là Contributor.</figcaption>
</figure>

<h4>Bốn built-in role nền tảng</h4>
<table>
  <thead><tr><th>Role</th><th>Quản lý resource</th><th>Gán quyền cho người khác</th></tr></thead>
  <tbody>
    <tr><td><strong>Owner</strong></td><td>Toàn quyền</td><td>Có</td></tr>
    <tr><td><strong>Contributor</strong></td><td>Toàn quyền (tạo/sửa/xóa)</td><td><strong>Không</strong> (không gán role, không quản lý lock, không quản lý Azure Policy assignment)</td></tr>
    <tr><td><strong>Reader</strong></td><td>Chỉ xem</td><td>Không</td></tr>
    <tr><td><strong>User Access Administrator</strong></td><td>Không</td><td>Có (quản lý quyền truy cập)</td></tr>
  </tbody>
</table>
<p><strong>Role Based Access Control Administrator</strong>: chỉ quản lý role assignment (không quản lý lock hay policy như User Access Administrator), có thể kèm <em>condition</em> giới hạn role nào được gán cho ai, phù hợp để ủy quyền an toàn.</p>

<h4>Built-in role theo dịch vụ hay ra thi</h4>
<table>
  <thead><tr><th>Role</th><th>Cho phép</th></tr></thead>
  <tbody>
    <tr><td>Virtual Machine Contributor</td><td>Quản lý VM, nhưng <strong>không</strong> đăng nhập vào VM và không quản lý VNet / storage account mà VM nối tới</td></tr>
    <tr><td>Virtual Machine Administrator Login / User Login</td><td>Đăng nhập VM bằng Microsoft Entra ID với quyền admin / user thường</td></tr>
    <tr><td>Network Contributor</td><td>Quản lý tài nguyên mạng (VNet, NSG, load balancer…)</td></tr>
    <tr><td>Storage Account Contributor</td><td>Quản lý storage account (kể cả lấy key), không cấp data action</td></tr>
    <tr><td>Storage Blob Data Reader / Contributor / Owner</td><td>Đọc / ghi blob bằng danh tính Entra (data plane)</td></tr>
    <tr><td>Backup Contributor / Backup Operator / Backup Reader</td><td>Quản lý / vận hành / xem Azure Backup</td></tr>
    <tr><td>Monitoring Reader / Monitoring Contributor</td><td>Xem / cấu hình dữ liệu giám sát</td></tr>
    <tr><td>Tag Contributor</td><td>Quản lý tag mà không cần quyền trên resource</td></tr>
    <tr><td>DevTest Labs User, Website Contributor, Key Vault Secrets User…</td><td>Quyền hẹp theo dịch vụ</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Cho phép người dùng quản lý VM nhưng không cấp quyền gì khác, theo least privilege" → <strong>Virtual Machine Contributor</strong> ở scope RG, không phải Contributor. "Cho phép đọc blob bằng tài khoản Entra" → <strong>Storage Blob Data Reader</strong>; Reader hoặc Contributor <strong>không</strong> có data action đọc blob.</div>
`
    },
    {
      id: 'list-access',
      unit: 'Exercise - List access using Azure RBAC and the Azure portal',
      title: 'Liệt kê và kiểm tra quyền truy cập',
      html: `
<h4>Trên Azure portal</h4>
<ol class="steps">
  <li>Mở scope cần xem (subscription, resource group hoặc resource) → <strong>Access control (IAM)</strong>.</li>
  <li>Tab <strong>Role assignments</strong>: liệt kê ai có role gì; cột <em>Scope</em> cho biết assignment ở chính scope này hay <strong>kế thừa</strong> từ cha ("This resource", "Inherited" / "Subscription (Inherited)").</li>
  <li>Tab <strong>Roles</strong>: danh sách built-in và custom role, xem số assignment của từng role, xem chi tiết Permissions / JSON.</li>
  <li>Nút <strong>Check access</strong>: chọn user / group / service principal / managed identity để xem các role assignment và deny assignment có hiệu lực ở scope này. <strong>View my access</strong> để xem quyền của chính bạn.</li>
  <li>Tab <strong>Deny assignments</strong>: xem deny assignment áp lên scope.</li>
</ol>
<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: kiểm tra quyền của một user tại resource group</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở resource group rồi vào Access control (IAM), tab <strong>Check access</strong>:<br><span class="path">Azure portal › Resource groups › rg-app › Access control (IAM) › Check access</span></li>
    <li>Bấm <strong>View my access</strong> để xem quyền của chính bạn, hoặc bấm <strong>Check access</strong> để xem quyền của người khác:
      <div class="blade">
        <div class="blade-title">Check access</div>
        <div class="pf"><label>Loại</label><span class="pv radio">User, group, or service principal</span></div>
        <div class="pf"><label></label><span class="pv">Managed identity</span></div>
        <div class="pf"><label>Search</label><span class="pv">alice@contoso.com</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn user trong kết quả để mở pane assignments</span></div>
      </div>
    </li>
    <li>Pane assignments liệt kê <strong>Role assignments</strong> và <strong>Deny assignments</strong> có hiệu lực tại scope này: gán trực tiếp và kế thừa từ scope cha. Assignment ở scope <em>con</em> (vd. trên một VM trong RG) <strong>không</strong> được liệt kê. Có PIM thì xem thêm tab <em>Eligible assignments</em>.</li>
    <li>Quay lại tab <strong>Role assignments</strong>, cột <em>Scope</em> cho biết assignment là <em>This resource</em> hay kế thừa (vd. <em>Subscription (Inherited)</em>).</li>
  </ol></div>
</div>

<p>Trang IAM ở subscription có biểu đồ số role assignment so với giới hạn <strong>5.000</strong> (management group: 500).</p>

<h4>Azure CLI</h4>
<pre><code># Mọi assignment trong subscription (kể cả ở RG/resource)
az role assignment list --all -o table

# Của một user, gồm cả kế thừa và qua group
az role assignment list --assignee alice@contoso.com --all --include-inherited --include-groups -o table

# Tại một RG
az role assignment list --resource-group rg-app -o table

# Xem định nghĩa role
az role definition list --name "Virtual Machine Contributor"
az role definition list --custom-role-only true -o table</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>Get-AzRoleAssignment -SignInName alice@contoso.com -ExpandPrincipalGroups
Get-AzRoleAssignment -ResourceGroupName rg-app
Get-AzRoleDefinition -Name "Contributor" | Select-Object -ExpandProperty Actions
Get-AzRoleDefinition -Name "Contributor" | Select-Object -ExpandProperty NotActions
Get-AzDenyAssignment -ResourceGroupName rg-app</code></pre>

<h4>Đọc NotActions của Contributor</h4>
<p>Contributor có <code>Actions: *</code> nhưng <code>NotActions</code> gồm <code>Microsoft.Authorization/*/Delete</code>, <code>Microsoft.Authorization/*/Write</code> (và vài hành động khác như chia sẻ image gallery). Vì vậy Contributor <strong>không</strong> gán role, không tạo / xóa lock và không tạo policy assignment.</p>

<div class="callout tip"><strong>Mẹo xử lý sự cố</strong>Người dùng báo "không thấy resource": dùng <strong>Check access</strong> ở scope đó. Nếu assignment vừa được tạo, có thể mất vài phút (tối đa khoảng 10 phút) do cache của Resource Manager; yêu cầu người dùng đăng xuất / đăng nhập lại hoặc refresh portal.</div>
`
    },
    {
      id: 'grant-access',
      unit: 'Exercise - Grant access using Azure RBAC and the Azure portal',
      title: 'Gán và thu hồi quyền',
      html: `
<h4>Các bước trên portal</h4>
<ol class="steps">
  <li>Mở scope đích (vd. resource group <code>rg-app</code>) → <strong>Access control (IAM)</strong> → <strong>Add</strong> → <strong>Add role assignment</strong>.</li>
  <li>Tab <strong>Role</strong>: chọn trong <em>Job function roles</em> (vd. Virtual Machine Contributor) hoặc <em>Privileged administrator roles</em> (Owner, Contributor, User Access Administrator, RBAC Administrator…).</li>
  <li>Tab <strong>Members</strong>: chọn <em>User, group, or service principal</em> hoặc <em>Managed identity</em>, thêm thành viên.</li>
  <li>Với role đặc quyền có thể thêm <strong>Conditions</strong> (vd. giới hạn những role mà người được ủy quyền có thể gán).</li>
  <li>Nếu có Microsoft Entra ID P2 + PIM: chọn kiểu <strong>Eligible</strong> (phải kích hoạt khi dùng, có thời hạn) hoặc <strong>Active</strong>.</li>
  <li><strong>Review + assign</strong>. Thu hồi: chọn assignment trong tab Role assignments → <strong>Remove</strong>. Assignment <em>kế thừa</em> phải xóa ở scope cha.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: gán Virtual Machine Contributor cho một group ở resource group</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở scope cần cấp quyền:<br><span class="path">Azure portal › Resource groups › rg-app › Access control (IAM) › + Add › Add role assignment</span></li>
    <li>Tab <strong>Role</strong>: ở sub-tab <em>Job function roles</em>, tìm và chọn role (Owner, Contributor, User Access Administrator… nằm ở sub-tab <em>Privileged administrator roles</em>):
      <div class="blade">
        <div class="blade-title">Add role assignment</div>
        <div class="blade-tabs"><span class="on">Role</span><span>Members</span><span>Conditions</span><span>Review + assign</span></div>
        <div class="pf"><label>Loại role</label><span class="pv radio">Job function roles</span></div>
        <div class="pf"><label></label><span class="pv">Privileged administrator roles</span></div>
        <div class="pf"><label>Search</label><span class="pv">Virtual Machine Contributor</span></div>
        <div class="pf"><label></label><span class="pv note">Tab Conditions chỉ xuất hiện với role hỗ trợ condition (vd. Owner, RBAC Administrator, Storage Blob Data *)</span></div>
        <div class="pbtns"><span class="pbtn">Review + assign</span><span class="pbtn primary">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Members</strong>: chọn đối tượng nhận quyền:
      <div class="blade">
        <div class="blade-title">Add role assignment › Members</div>
        <div class="pf"><label>Assign access to</label><span class="pv radio">User, group, or service principal</span></div>
        <div class="pf"><label></label><span class="pv">Managed identity</span></div>
        <div class="pf"><label>Members</label><span class="pv">+ Select members → grp-vm-operators</span></div>
        <div class="pf"><label>Description</label><span class="pv">Ops team quản lý VM của app</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + assign</span><span class="pbtn">Previous</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Nếu tenant có Microsoft Entra ID P2 / ID Governance, tab <strong>Assignment type</strong> xuất hiện: chọn <em>Eligible</em> hoặc <em>Active</em>, thời hạn <em>Permanent</em> hoặc <em>Time bound</em>.</li>
    <li>Tab <strong>Review + assign</strong> › bấm <strong>Review + assign</strong>. Assignment mới xuất hiện trong tab <em>Role assignments</em> sau vài giây.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m5/add-role-assignment-role-tab.png" alt="Trang Add role assignment, tab Role với hai sub-tab Job function roles và Privileged administrator roles, ô tìm kiếm và danh sách role" loading="lazy"><figcaption>Hình 1. Tab <em>Role</em> của trang Add role assignment: role đặc quyền (Owner, Contributor, User Access Administrator, RBAC Administrator) được tách sang sub-tab <em>Privileged administrator roles</em>; cột <em>Details › View</em> cho xem permissions của role. Nguồn: <a href="https://learn.microsoft.com/azure/role-based-access-control/role-assignments-portal" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Azure CLI</h4>
<pre><code># Gán cho user ở RG
az role assignment create --assignee alice@contoso.com \\
  --role "Virtual Machine Contributor" --resource-group rg-app

# Gán cho group ở subscription (dùng object ID)
az role assignment create --assignee-object-id &lt;groupObjectId&gt; --assignee-principal-type Group \\
  --role Reader --scope /subscriptions/&lt;subId&gt;

# Gán cho managed identity ở một storage account
az role assignment create --assignee &lt;principalId&gt; --role "Storage Blob Data Contributor" \\
  --scope /subscriptions/&lt;subId&gt;/resourceGroups/rg-app/providers/Microsoft.Storage/storageAccounts/stapp01

# Thu hồi
az role assignment delete --assignee alice@contoso.com --role "Virtual Machine Contributor" --resource-group rg-app</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>New-AzRoleAssignment -SignInName alice@contoso.com -RoleDefinitionName "Virtual Machine Contributor" -ResourceGroupName rg-app
New-AzRoleAssignment -ObjectId &lt;groupObjectId&gt; -RoleDefinitionName Reader -Scope "/subscriptions/&lt;subId&gt;"
Remove-AzRoleAssignment -SignInName alice@contoso.com -RoleDefinitionName "Virtual Machine Contributor" -ResourceGroupName rg-app</code></pre>

<h4>Ai được gán role?</h4>
<p>Cần quyền <code>Microsoft.Authorization/roleAssignments/write</code> tại scope: <strong>Owner</strong>, <strong>User Access Administrator</strong>, <strong>Role Based Access Control Administrator</strong>. Contributor <strong>không</strong> gán được.</p>

<h4>Best practices</h4>
<ul>
  <li><strong>Least privilege</strong>: chọn role hẹp nhất, scope thấp nhất đủ dùng.</li>
  <li>Gán cho <strong>group</strong> thay vì từng user.</li>
  <li>Giới hạn số Owner trên subscription (khuyến nghị tối đa 3) và dùng PIM cho quyền đặc quyền.</li>
  <li>Dùng role ID (GUID) trong script vì tên role có thể đổi.</li>
</ul>

<div class="callout exam"><strong>Bẫy thi</strong>Gán Reader ở RG1 cho người đã có Contributor ở subscription <strong>không</strong> hạ quyền họ xuống Reader trên RG1 (mô hình cộng dồn). Muốn họ chỉ đọc RG1 thì phải bỏ Contributor ở subscription và gán lại ở các scope cần thiết.</div>
`
    },
    {
      id: 'activity-logs',
      unit: 'Exercise - View activity logs for Azure RBAC changes',
      title: 'Theo dõi thay đổi RBAC trong activity log',
      html: `
<p>Mọi thao tác control plane, bao gồm tạo / xóa role assignment và tạo / sửa / xóa custom role, được ghi vào <strong>Azure Activity Log</strong> của subscription.</p>

<h4>Các operation cần biết</h4>
<table>
  <thead><tr><th>Operation</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><code>Microsoft.Authorization/roleAssignments/write</code></td><td>Create role assignment</td></tr>
    <tr><td><code>Microsoft.Authorization/roleAssignments/delete</code></td><td>Delete role assignment</td></tr>
    <tr><td><code>Microsoft.Authorization/roleDefinitions/write</code></td><td>Tạo / cập nhật custom role</td></tr>
    <tr><td><code>Microsoft.Authorization/roleDefinitions/delete</code></td><td>Xóa custom role</td></tr>
  </tbody>
</table>

<h4>Các bước trên portal</h4>
<ol class="steps">
  <li>Mở <strong>Monitor → Activity log</strong> (hoặc Activity log của subscription / resource group).</li>
  <li>Đặt <strong>Timespan</strong> (tối đa 90 ngày) và lọc <strong>Operation</strong> = <em>Create role assignment</em> / <em>Delete role assignment</em>.</li>
  <li>Mở sự kiện → tab <strong>JSON</strong> / <strong>Change history</strong> để xem <em>caller</em> (ai thực hiện), principal được gán, role definition ID và scope.</li>
  <li>Có thể <strong>Download as CSV</strong> hoặc tạo <strong>activity log alert</strong> khi có role assignment mới.</li>
</ol>

<h4>Command line</h4>
<pre><code>az monitor activity-log list --offset 7d \\
  --query "[?operationName.value=='Microsoft.Authorization/roleAssignments/write'].{time:eventTimestamp, caller:caller, status:status.value}" -o table

Get-AzActivityLog -StartTime (Get-Date).AddDays(-7) |
  Where-Object { $_.Authorization.Action -like 'Microsoft.Authorization/roleAssignments/*' } |
  Select-Object EventTimestamp, Caller, @{n='Action';e={$_.Authorization.Action}}</code></pre>

<h4>Lưu giữ lâu hơn 90 ngày</h4>
<p>Activity log chỉ giữ <strong>90 ngày</strong>. Để lưu lâu hơn hoặc truy vấn KQL, tạo <strong>diagnostic setting</strong> gửi activity log tới <strong>Log Analytics workspace</strong> (bảng <code>AzureActivity</code>), storage account hoặc Event Hubs.</p>
<pre><code>AzureActivity
| where OperationNameValue has "Microsoft.Authorization/roleAssignments"
| project TimeGenerated, Caller, OperationNameValue, ActivityStatusValue, _ResourceId</code></pre>

<div class="callout note"><strong>Phân biệt nguồn log</strong>Thay đổi <strong>Azure RBAC</strong> nằm trong <strong>Azure Activity Log</strong>. Thay đổi <strong>Microsoft Entra roles</strong> (vd. gán Global Administrator, User Administrator) nằm trong <strong>Microsoft Entra audit logs</strong>.</div>

<div class="callout exam"><strong>Góc thi</strong>"Xác định ai đã gán Owner cho user X trên subscription tuần trước" → <strong>Activity log</strong>, lọc operation <em>Create role assignment</em>. "Ai đã thêm user vào Global Administrator" → <strong>Microsoft Entra audit logs</strong>.</div>
`
    },
    {
      id: 'custom-roles',
      extra: true,
      title: 'Custom role (JSON)',
      html: `
<p>Khi built-in role không vừa yêu cầu, tạo <strong>custom role</strong>. Custom role dùng chung được cho mọi subscription trong cùng tenant (trong phạm vi <code>AssignableScopes</code>).</p>

<h4>Cấu trúc JSON</h4>
<pre><code>{
  "Name": "Virtual Machine Operator",
  "IsCustom": true,
  "Description": "Can monitor, start and restart virtual machines.",
  "Actions": [
    "Microsoft.Compute/*/read",
    "Microsoft.Network/*/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Support/*"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/&lt;subId1&gt;",
    "/subscriptions/&lt;subId2&gt;/resourceGroups/rg-ops"
  ]
}</code></pre>

<table>
  <thead><tr><th>Thuộc tính</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><code>Actions</code></td><td>Hành động control plane được phép, định dạng <code>{Provider}/{resourceType}/{action}</code>, vd. <code>Microsoft.Compute/virtualMachines/read</code></td></tr>
    <tr><td><code>NotActions</code></td><td>Hành động bị <strong>trừ ra</strong> khỏi Actions. <strong>Không phải deny</strong>: nếu role khác cấp quyền đó thì người dùng vẫn có.</td></tr>
    <tr><td><code>DataActions</code> / <code>NotDataActions</code></td><td>Hành động data plane, vd. <code>Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read</code></td></tr>
    <tr><td><code>AssignableScopes</code></td><td>Nơi role có thể được gán (và ai được tạo / sửa role)</td></tr>
  </tbody>
</table>

<h4>Giới hạn quan trọng</h4>
<ul>
  <li>Tối đa <strong>5.000 custom role</strong> mỗi tenant.</li>
  <li><code>AssignableScopes</code> không được là root <code>"/"</code> và không chứa wildcard <code>*</code>.</li>
  <li>Chỉ <strong>một management group</strong> trong <code>AssignableScopes</code>.</li>
  <li>Role có <code>DataActions</code> <strong>không gán được ở scope management group</strong> (gán ở subscription bên trong thì được).</li>
  <li>Mỗi chuỗi action chỉ có <strong>một</strong> wildcard.</li>
  <li>Phải xóa mọi role assignment dùng custom role trước khi xóa role (lỗi <code>RoleDefinitionHasAssignments</code>).</li>
</ul>

<h4>Tạo / cập nhật</h4>
<p>Cần <code>Microsoft.Authorization/roleDefinitions/write</code> trên <strong>mọi</strong> scope trong <code>AssignableScopes</code>: Owner hoặc User Access Administrator.</p>
<pre><code># Cách nhanh: xuất built-in role làm mẫu
Get-AzRoleDefinition "Virtual Machine Contributor" | ConvertTo-Json | Out-File vmop.json
# sửa Name, bỏ Id, đặt IsCustom=true, sửa Actions/AssignableScopes rồi:
New-AzRoleDefinition -InputFile ./vmop.json
Set-AzRoleDefinition -InputFile ./vmop.json      # cập nhật (cần Id)

az role definition create --role-definition @vmop.json
az role definition update --role-definition @vmop.json
az role definition delete --name "Virtual Machine Operator"</code></pre>
<p>Trên portal: IAM → <strong>Add → Add custom role</strong> với 3 lựa chọn bắt đầu: <em>Clone a role</em>, <em>Start from scratch</em>, <em>Start from JSON</em>.</p>

<div class="callout exam"><strong>Bẫy thi</strong>Câu hỏi "điền vào JSON để role không xóa được VM": thêm <code>Microsoft.Compute/virtualMachines/delete</code> vào <strong>NotActions</strong> (khi Actions có wildcard). Muốn role dùng được ở subscription mới, thêm subscription đó vào <strong>AssignableScopes</strong>. Role cho phép đọc blob phải dùng <strong>DataActions</strong>, không phải Actions.</div>
`
    },
    {
      id: 'rbac-vs-entra',
      extra: true,
      title: 'Azure RBAC và Microsoft Entra roles',
      html: `
<p>Azure có hai hệ thống role tách biệt, hay bị nhầm trong đề thi.</p>
<table>
  <thead><tr><th></th><th>Azure RBAC roles</th><th>Microsoft Entra roles</th></tr></thead>
  <tbody>
    <tr><td>Quản lý gì</td><td>Azure resource: VM, storage, VNet…</td><td>Đối tượng directory: user, group, license, domain, app registration, cài đặt tenant</td></tr>
    <tr><td>Scope</td><td>MG, subscription, RG, resource</td><td>Tenant, administrative unit, một app registration</td></tr>
    <tr><td>Ví dụ</td><td>Owner, Contributor, Reader, User Access Administrator</td><td>Global Administrator, User Administrator, Helpdesk Administrator, Billing Administrator</td></tr>
    <tr><td>Nơi quản lý</td><td>Azure portal → Access control (IAM)</td><td>Microsoft Entra admin center → Roles &amp; admins</td></tr>
    <tr><td>Custom role</td><td>Có</td><td>Có (yêu cầu Microsoft Entra ID P1 trở lên)</td></tr>
    <tr><td>Nhật ký</td><td>Azure Activity Log</td><td>Microsoft Entra audit logs</td></tr>
  </tbody>
</table>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 262" role="img" aria-label="Microsoft Entra roles và Azure RBAC là hai hệ thống tách biệt, nối với nhau qua elevate access">
  <rect class="box-e" x="10" y="20" width="300" height="200" rx="12"/>
  <text x="160" y="46" text-anchor="middle" class="t-b">Microsoft Entra roles</text>
  <text x="160" y="64" text-anchor="middle" class="t-sm t-mute">Entra admin center › Roles &amp; admins</text>
  <rect class="box" x="30" y="78" width="260" height="28" rx="6"/>
  <text x="160" y="97" text-anchor="middle" class="t-sm">Global Administrator</text>
  <rect class="box" x="30" y="112" width="260" height="28" rx="6"/>
  <text x="160" y="131" text-anchor="middle" class="t-sm">User Administrator</text>
  <rect class="box" x="30" y="146" width="260" height="28" rx="6"/>
  <text x="160" y="165" text-anchor="middle" class="t-sm">Helpdesk Administrator</text>
  <text x="160" y="194" text-anchor="middle" class="t-sm">quản lý: user, group, license, domain</text>
  <text x="160" y="211" text-anchor="middle" class="t-sm t-mute">log: Microsoft Entra audit logs</text>

  <rect class="box-a" x="410" y="20" width="300" height="200" rx="12"/>
  <text x="560" y="46" text-anchor="middle" class="t-b">Azure RBAC</text>
  <text x="560" y="64" text-anchor="middle" class="t-sm t-mute">Azure portal › Access control (IAM)</text>
  <rect class="box" x="430" y="78" width="260" height="28" rx="6"/>
  <text x="560" y="97" text-anchor="middle" class="t-sm">Owner</text>
  <rect class="box" x="430" y="112" width="260" height="28" rx="6"/>
  <text x="560" y="131" text-anchor="middle" class="t-sm">Contributor</text>
  <rect class="box" x="430" y="146" width="260" height="28" rx="6"/>
  <text x="560" y="165" text-anchor="middle" class="t-sm">User Access Administrator</text>
  <text x="560" y="194" text-anchor="middle" class="t-sm">quản lý: VM, storage, VNet…</text>
  <text x="560" y="211" text-anchor="middle" class="t-sm t-mute">log: Azure Activity Log</text>

  <text x="360" y="66" text-anchor="middle" class="t-sm t-a">elevate</text>
  <text x="360" y="80" text-anchor="middle" class="t-sm t-a">access</text>
  <path class="ln-a dash" d="M290 92 C 330 92, 330 160, 426 160" marker-end="url(#arr-a)"/>
  <text x="360" y="250" text-anchor="middle" class="t-sm t-mute">Mặc định không chồng lấn: Global Admin không tự có quyền trên subscription; Owner không tạo được user</text>
</svg>
<figcaption>Hình 1. Hai hệ thống role độc lập. Cầu nối duy nhất: Global Administrator bật <em>Access management for Azure resources</em> để tự nhận <strong>User Access Administrator</strong> ở root scope <code>/</code>.</figcaption>
</figure>

<p>Mặc định hai hệ thống <strong>không chồng lên nhau</strong>: Global Administrator <strong>không</strong> tự có quyền trên subscription; Owner subscription <strong>không</strong> tạo được user trong Entra ID.</p>

<h4>Elevate access của Global Administrator</h4>
<ol class="steps">
  <li>Đăng nhập với Global Administrator → Microsoft Entra ID → <strong>Properties</strong>.</li>
  <li>Bật <strong>Access management for Azure resources</strong> = <em>Yes</em> → Save.</li>
  <li>Tài khoản nhận role <strong>User Access Administrator</strong> ở scope root <code>/</code> (mọi management group và subscription của tenant).</li>
  <li>Tự gán quyền cần thiết (vd. Owner ở một subscription bị "mất chủ") rồi <strong>tắt lại</strong> elevate access ngay sau khi xong.</li>
</ol>
<pre><code># Elevate bằng REST qua Azure CLI
az rest --method post --url "/providers/Microsoft.Authorization/elevateAccess?api-version=2016-07-01"
# Liệt kê assignment ở root
az role assignment list --role "User Access Administrator" --scope "/"</code></pre>

<h4>Tình huống điển hình</h4>
<ul>
  <li>Người duy nhất có Owner trên subscription đã nghỉ việc → Global Administrator elevate access, tự gán Owner (hoặc gán cho admin mới), rồi tắt elevate.</li>
  <li>Cần cho nhân viên helpdesk reset mật khẩu user → <strong>Entra role</strong> Helpdesk Administrator / Password Administrator, không phải Azure RBAC.</li>
  <li>Cần cho người dùng tạo VM → <strong>Azure RBAC</strong> (Virtual Machine Contributor), không phải Entra role.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"User Administrator có quản lý được VM không?" → <strong>Không</strong>. "Global Administrator cần quản lý mọi subscription" → bật <strong>elevate access</strong> để nhận <strong>User Access Administrator</strong> ở root scope (không phải Owner).</div>
`
    },
    {
      id: 'deny-evaluation',
      extra: true,
      title: 'Deny assignments và thứ tự đánh giá quyền',
      html: `
<h4>Deny assignment là gì?</h4>
<p>Deny assignment gắn một tập hành động <strong>bị cấm</strong> với principal tại một scope. Nó <strong>thắng</strong> mọi role assignment, kể cả Owner.</p>
<ul>
  <li>Hiện tại <strong>bạn không tạo trực tiếp</strong> được deny assignment (bản do khách hàng quản lý mới ở private preview). Azure tạo và quản lý chúng, ví dụ khi bạn dùng <strong>deployment stacks</strong> với <em>deny settings</em> (DenyDelete / DenyWriteAndDelete) hoặc với <strong>managed applications</strong> (managed resource group bị khóa).</li>
  <li>Thuộc tính đặc biệt: <code>ExcludePrincipals</code> (loại trừ một số principal), <code>DoNotApplyToChildScopes</code>, principal đặc biệt <strong>All Principals</strong> (GUID toàn số 0).</li>
  <li>Xem trong IAM → tab <strong>Deny assignments</strong>, hoặc <code>Get-AzDenyAssignment</code>.</li>
</ul>

<table>
  <thead><tr><th>Khả năng</th><th>Role assignment</th><th>Deny assignment</th></tr></thead>
  <tbody>
    <tr><td>Cấp quyền</td><td>Có</td><td>Không</td></tr>
    <tr><td>Chặn quyền</td><td>Không</td><td>Có</td></tr>
    <tr><td>Tự tạo trực tiếp</td><td>Có</td><td>Không (Azure quản lý)</td></tr>
    <tr><td>Loại trừ principal</td><td>Không</td><td>Có</td></tr>
    <tr><td>Ngăn kế thừa xuống scope con</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>

<h4>Azure RBAC quyết định truy cập như thế nào?</h4>
<ol class="steps">
  <li>User / service principal lấy token cho Azure Resource Manager; token chứa group membership (kể cả bắc cầu).</li>
  <li>Gọi REST API tới ARM kèm token.</li>
  <li>ARM lấy mọi role assignment và deny assignment áp lên resource.</li>
  <li><strong>Nếu có deny assignment áp dụng → chặn.</strong> Nếu không, tiếp tục.</li>
  <li>Xác định các role của user (trực tiếp và qua group) tại resource.</li>
  <li>Tính quyền: <code>Actions − NotActions</code>, <code>DataActions − NotDataActions</code>. Nếu không role nào chứa hành động → từ chối.</li>
  <li>Nếu role assignment có <strong>condition</strong> (ABAC, vd. theo blob index tag) → đánh giá condition; đạt thì cho phép.</li>
</ol>

<h4>Sau RBAC còn gì có thể chặn?</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 390" role="img" aria-label="Chuỗi kiểm tra một request: deny assignment, role assignment, condition, Azure Policy, resource lock">
  <line class="ln-a" x1="132" y1="20" x2="132" y2="188"/>
  <text x="66" y="90" text-anchor="middle" class="t-b t-a">Azure RBAC</text>
  <text x="66" y="108" text-anchor="middle" class="t-sm t-mute">(bước 1–3)</text>
  <line class="ln" x1="132" y1="212" x2="132" y2="316"/>
  <text x="66" y="260" text-anchor="middle" class="t-b">Sau RBAC</text>
  <text x="66" y="278" text-anchor="middle" class="t-sm t-mute">(bước 4–5)</text>

  <rect class="box" x="150" y="20" width="260" height="40" rx="8"/>
  <text x="280" y="45" text-anchor="middle">1. Deny assignment khớp?</text>
  <rect class="box" x="150" y="84" width="260" height="40" rx="8"/>
  <text x="280" y="109" text-anchor="middle">2. Role cho phép action?</text>
  <rect class="box" x="150" y="148" width="260" height="40" rx="8"/>
  <text x="280" y="173" text-anchor="middle">3. Condition (ABAC) đạt?</text>
  <rect class="box" x="150" y="212" width="260" height="40" rx="8"/>
  <text x="280" y="237" text-anchor="middle">4. Azure Policy Deny?</text>
  <rect class="box" x="150" y="276" width="260" height="40" rx="8"/>
  <text x="280" y="301" text-anchor="middle">5. Resource lock?</text>
  <rect class="box-s" x="150" y="340" width="260" height="40" rx="8"/>
  <text x="280" y="365" text-anchor="middle" class="t-b t-s">Cho phép</text>

  <line class="ln-s" x1="280" y1="60" x2="280" y2="80" marker-end="url(#arr-s)"/>
  <text x="290" y="75" class="t-sm t-s">không</text>
  <line class="ln-s" x1="280" y1="124" x2="280" y2="144" marker-end="url(#arr-s)"/>
  <text x="290" y="139" class="t-sm t-s">có</text>
  <line class="ln-s" x1="280" y1="188" x2="280" y2="208" marker-end="url(#arr-s)"/>
  <text x="290" y="203" class="t-sm t-s">đạt / không có</text>
  <line class="ln-s" x1="280" y1="252" x2="280" y2="272" marker-end="url(#arr-s)"/>
  <text x="290" y="267" class="t-sm t-s">không</text>
  <line class="ln-s" x1="280" y1="316" x2="280" y2="336" marker-end="url(#arr-s)"/>
  <text x="290" y="331" class="t-sm t-s">không</text>

  <rect class="box-x" x="470" y="20" width="240" height="40" rx="8"/>
  <text x="590" y="45" text-anchor="middle" class="t-sm">có → chặn (kể cả Owner)</text>
  <rect class="box-x" x="470" y="84" width="240" height="40" rx="8"/>
  <text x="590" y="109" text-anchor="middle" class="t-sm">không → 403 AuthorizationFailed</text>
  <rect class="box-x" x="470" y="148" width="240" height="40" rx="8"/>
  <text x="590" y="173" text-anchor="middle" class="t-sm">không đạt → từ chối</text>
  <rect class="box-x" x="470" y="212" width="240" height="40" rx="8"/>
  <text x="590" y="237" text-anchor="middle" class="t-sm">có → RequestDisallowedByPolicy</text>
  <rect class="box-x" x="470" y="276" width="240" height="40" rx="8"/>
  <text x="590" y="301" text-anchor="middle" class="t-sm">có → lỗi ScopeLocked</text>

  <line class="ln-x" x1="410" y1="40" x2="466" y2="40" marker-end="url(#arr-x)"/>
  <line class="ln-x" x1="410" y1="104" x2="466" y2="104" marker-end="url(#arr-x)"/>
  <line class="ln-x" x1="410" y1="168" x2="466" y2="168" marker-end="url(#arr-x)"/>
  <line class="ln-x" x1="410" y1="232" x2="466" y2="232" marker-end="url(#arr-x)"/>
  <line class="ln-x" x1="410" y1="296" x2="466" y2="296" marker-end="url(#arr-x)"/>
</svg>
<figcaption>Hình 1. Chuỗi kiểm tra (minh họa) cho một thao tác control plane. Bước 1–3 là Azure RBAC; bước 4–5 là các cơ chế governance khác. Vì vậy có role Owner chưa đủ để chắc chắn thao tác thành công.</figcaption>
</figure>
<p>Vì vậy Owner vẫn có thể bị chặn bởi <strong>deny assignment</strong>, <strong>Azure Policy</strong> hoặc <strong>resource lock</strong>.</p>

<div class="callout exam"><strong>Bẫy thi</strong>"NotActions có chặn quyền được cấp bởi role khác không?" → <strong>Không</strong>, chỉ deny assignment mới chặn. "Bạn là Owner nhưng không xóa được resource trong managed resource group của một managed application" → do <strong>deny assignment</strong> mà Azure tạo.</div>
`
    }
  ],
  keyFacts: [
    'Role assignment = <strong>security principal</strong> (user, group, service principal, managed identity) + <strong>role definition</strong> + <strong>scope</strong> (MG, subscription, RG, resource).',
    'RBAC là mô hình <strong>cộng dồn</strong>: quyền hiệu lực là tổng các role assignment; gán role thấp hơn ở scope con không hạ quyền.',
    '<strong>Owner</strong>: toàn quyền + gán role. <strong>Contributor</strong>: toàn quyền trừ gán role / lock. <strong>Reader</strong>: chỉ xem. <strong>User Access Administrator</strong>: chỉ quản lý quyền truy cập.',
    'Giới hạn: <strong>5.000</strong> role assignment mỗi subscription (không tăng được), <strong>500</strong> mỗi management group, <strong>5.000</strong> custom role mỗi tenant.',
    'Custom role: <code>AssignableScopes</code> không được là <code>/</code>, không wildcard, tối đa <strong>một</strong> management group; role có <code>DataActions</code> không gán được ở scope management group.',
    '<code>NotActions</code> chỉ trừ khỏi <code>Actions</code> của chính role đó, <strong>không phải deny</strong>.',
    'Deny assignment thắng role assignment; hiện do Azure tạo (deployment stacks, managed applications), bạn không tạo trực tiếp.',
    'Thay đổi Azure RBAC ghi vào <strong>Activity Log</strong> (lưu 90 ngày); thay đổi Entra role ghi vào <strong>Microsoft Entra audit logs</strong>.',
    'Global Administrator bật <strong>Access management for Azure resources</strong> để nhận <strong>User Access Administrator</strong> ở root scope <code>/</code>.',
    'Đọc dữ liệu blob bằng Entra ID cần role data plane như <strong>Storage Blob Data Reader</strong>; Owner/Contributor/Reader không tự có data action.'
  ],
  traps: [
    'Gán Reader ở RG để "hạ quyền" người đã có Contributor ở subscription. Không có tác dụng vì RBAC cộng dồn.',
    'Chọn Contributor khi đề yêu cầu người dùng phải <strong>gán quyền</strong> cho người khác. Cần Owner, User Access Administrator hoặc RBAC Administrator.',
    'Chọn Owner khi chỉ cần quản lý VM. Least privilege là <strong>Virtual Machine Contributor</strong> ở scope phù hợp.',
    'Nghĩ Global Administrator mặc định quản lý mọi subscription. Phải <strong>elevate access</strong>.',
    'Dùng Entra role (User Administrator) để cấp quyền trên Azure resource, hoặc dùng Azure RBAC để cho reset mật khẩu user. Hai hệ thống tách biệt.',
    'Nghĩ NotActions là deny tuyệt đối. Nó chỉ trừ trong phạm vi role đó; role khác vẫn có thể cấp lại.',
    'Gán custom role có DataActions ở management group. Không được; phải gán ở subscription hoặc thấp hơn.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Nhu cầu</th><th>Role / công cụ</th></tr></thead>
  <tbody>
    <tr><td>Toàn quyền + gán quyền</td><td>Owner</td></tr>
    <tr><td>Toàn quyền, không gán quyền</td><td>Contributor</td></tr>
    <tr><td>Chỉ gán quyền</td><td>User Access Administrator / RBAC Administrator</td></tr>
    <tr><td>Chỉ xem</td><td>Reader</td></tr>
    <tr><td>Quản lý VM (không login, không VNet)</td><td>Virtual Machine Contributor</td></tr>
    <tr><td>Đọc blob bằng Entra ID</td><td>Storage Blob Data Reader</td></tr>
    <tr><td>Quản lý tag</td><td>Tag Contributor</td></tr>
    <tr><td>Giới hạn</td><td>5.000 RA/subscription · 500 RA/MG · 5.000 custom role/tenant</td></tr>
    <tr><td>Gán quyền</td><td><code>az role assignment create</code> / <code>New-AzRoleAssignment</code></td></tr>
    <tr><td>Custom role</td><td><code>az role definition create</code> / <code>New-AzRoleDefinition</code></td></tr>
    <tr><td>Ai đã gán role?</td><td>Activity Log (90 ngày) → Log Analytics để lưu lâu</td></tr>
    <tr><td>GA quản lý mọi subscription</td><td>Elevate access → UAA ở <code>/</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Bốn loại security principal trong Azure RBAC?', back: 'User, group, service principal, managed identity.' },
    { front: 'Bốn cấp scope của Azure RBAC?', back: 'Management group, subscription, resource group, resource.' },
    { front: 'Contributor khác Owner ở điểm nào?', back: 'Contributor <strong>không gán được role</strong> (NotActions loại trừ <code>Microsoft.Authorization/*/Write</code> và <code>/Delete</code>), nên cũng không quản lý lock.' },
    { front: 'User Access Administrator làm được gì?', back: 'Quản lý quyền truy cập (role assignment) của người khác; không quản lý resource.' },
    { front: 'Mô hình cộng dồn trong RBAC nghĩa là gì?', back: 'Quyền hiệu lực = <strong>tổng</strong> mọi role assignment của user (trực tiếp và qua group, ở mọi scope cha).' },
    { front: 'Giới hạn role assignment?', back: '<strong>5.000</strong> mỗi subscription, <strong>500</strong> mỗi management group (cố định).' },
    { front: 'Giới hạn custom role?', back: '<strong>5.000</strong> mỗi tenant.' },
    { front: 'NotActions có phải deny không?', back: '<strong>Không</strong>. Chỉ trừ khỏi Actions của role đó; role khác vẫn có thể cấp lại quyền.' },
    { front: 'Custom role có DataActions gán được ở management group không?', back: '<strong>Không</strong>. Gán ở subscription / RG / resource.' },
    { front: 'AssignableScopes có thể là "/" không?', back: '<strong>Không</strong>, và cũng không được dùng wildcard; tối đa một management group.' },
    { front: 'Deny assignment do ai tạo?', back: '<strong>Azure</strong> (vd. deployment stacks có deny settings, managed applications). Bạn không tạo trực tiếp.' },
    { front: 'Deny assignment hay role assignment thắng?', back: '<strong>Deny assignment</strong> được kiểm tra trước và chặn truy cập, kể cả với Owner.' },
    { front: 'Xem ai đã tạo role assignment ở đâu?', back: '<strong>Activity Log</strong> (operation <code>Microsoft.Authorization/roleAssignments/write</code>), lưu 90 ngày.' },
    { front: 'Global Administrator làm sao quản lý mọi subscription?', back: 'Bật <strong>Access management for Azure resources</strong> → nhận <strong>User Access Administrator</strong> ở root <code>/</code>.' },
    { front: 'Role nào cho phép quản lý VM nhưng không login vào VM?', back: '<strong>Virtual Machine Contributor</strong>. Login bằng Entra ID cần Virtual Machine Administrator Login / User Login.' },
    { front: 'Lệnh CLI liệt kê mọi quyền của user kể cả qua group?', back: '<code>az role assignment list --assignee &lt;upn&gt; --all --include-inherited --include-groups</code>' },
    { front: 'Lệnh tạo custom role từ file JSON?', back: '<code>az role definition create --role-definition @role.json</code> / <code>New-AzRoleDefinition -InputFile role.json</code>' }
  ],
  quiz: [
    {
      q: 'Nhóm Ops cần khởi động, dừng và thay đổi kích thước các VM trong RG-Web, nhưng không được quản lý virtual network hay storage account. Bạn cần áp dụng least privilege. Bạn gán role nào ở scope RG-Web?',
      options: ['Contributor', 'Owner', 'Virtual Machine Contributor', 'Network Contributor'],
      answer: [2],
      explain: 'Virtual Machine Contributor cho phép quản lý VM nhưng không quản lý VNet hay storage account mà VM nối tới. Contributor và Owner quá rộng. Network Contributor chỉ quản lý mạng, không quản lý VM.'
    },
    {
      q: 'User1 có role Contributor ở subscription Sub1. Bạn gán thêm Reader cho User1 ở RG1 trong Sub1. User1 có thể làm gì trên RG1?',
      options: ['Tạo và xóa resource trong RG1', 'Chỉ xem resource trong RG1', 'Không truy cập được RG1 vì hai role xung đột', 'Gán role cho người khác trên RG1'],
      answer: [0],
      explain: 'RBAC cộng dồn: Contributor kế thừa từ subscription vẫn có hiệu lực trên RG1, Reader không hạ quyền. Không có xung đột gây mất quyền. Contributor không gán được role.'
    },
    {
      q: 'Bạn cần một nhân viên có thể gán role cho người khác trên subscription Sub1 nhưng không được tạo, sửa hay xóa resource. Bạn gán role nào? (Chọn 2, mỗi đáp án là một giải pháp hoàn chỉnh)',
      options: ['Contributor', 'User Access Administrator', 'Role Based Access Control Administrator', 'Owner'],
      answer: [1, 2],
      explain: 'User Access Administrator và Role Based Access Control Administrator đều quản lý role assignment mà không quản lý resource. Contributor không gán được role. Owner gán được role nhưng cũng toàn quyền trên resource, vượt yêu cầu.'
    },
    {
      q: 'Một ứng dụng chạy trên VM có system-assigned managed identity cần đọc blob trong storage account ST1 bằng Microsoft Entra ID, theo least privilege. Bạn gán gì cho managed identity ở scope ST1?',
      options: ['Reader', 'Storage Account Contributor', 'Contributor', 'Storage Blob Data Reader'],
      answer: [3],
      explain: 'Đọc blob là data action; Storage Blob Data Reader cung cấp đúng quyền này. Reader và Contributor chỉ có quyền control plane. Storage Account Contributor quản lý account (có thể lấy key) nên vượt quá least privilege.'
    },
    {
      q: 'Bạn tạo custom role có <code>DataActions</code> đọc blob và đặt <code>AssignableScopes</code> là management group MG1. Khi gán role ở MG1, thao tác thất bại. Bạn nên làm gì?',
      options: ['Gán custom role ở từng subscription bên trong MG1', 'Đổi AssignableScopes thành "/"', 'Thêm wildcard * vào AssignableScopes', 'Chuyển các DataActions sang NotActions'],
      answer: [0],
      explain: 'Custom role có DataActions không gán được ở scope management group, nhưng có thể gán ở các subscription bên trong MG1. AssignableScopes không được là "/" và không dùng wildcard. Chuyển sang NotActions làm mất mục đích của role.'
    },
    {
      q: 'Bạn viết custom role với <code>"Actions": ["Microsoft.Compute/*"]</code> và muốn role này không xóa được VM. Bạn thêm gì?',
      options: ['<code>"DataActions": ["Microsoft.Compute/virtualMachines/delete"]</code>', '<code>"NotActions": ["Microsoft.Compute/virtualMachines/delete"]</code>', '<code>"AssignableScopes": ["Microsoft.Compute/virtualMachines/delete"]</code>', '<code>"NotDataActions": ["Microsoft.Compute/*"]</code>'],
      answer: [1],
      explain: 'Xóa VM là hành động control plane; NotActions trừ nó ra khỏi Actions có wildcard. DataActions/NotDataActions dành cho data plane. AssignableScopes chứa scope, không chứa action.'
    },
    {
      q: 'Người duy nhất có quyền Owner trên subscription Sub-Legacy đã nghỉ việc. Bạn là Global Administrator nhưng không thấy Sub-Legacy. Bạn cần lấy lại quyền quản lý với ít bước nhất. Bạn làm gì trước tiên?',
      options: ['Reset mật khẩu tài khoản của nhân viên cũ và đăng nhập bằng tài khoản đó', 'Mở ticket để Microsoft chuyển quyền Owner', 'Bật Access management for Azure resources trong Microsoft Entra ID Properties', 'Gán cho mình Entra role Privileged Role Administrator'],
      answer: [2],
      explain: 'Elevate access cho Global Administrator role User Access Administrator ở root scope, từ đó tự gán Owner trên Sub-Legacy. Dùng tài khoản người khác vi phạm nguyên tắc bảo mật. Privileged Role Administrator chỉ quản lý Entra role. Không cần Microsoft Support.'
    },
    {
      q: 'Kiểm toán viên muốn biết ai đã gán role Owner trên subscription Sub1 vào tuần trước. Bạn xem ở đâu?',
      options: ['Microsoft Entra sign-in logs', 'Microsoft Entra audit logs', 'Azure Advisor', 'Activity Log của Sub1, lọc operation Create role assignment'],
      answer: [3],
      explain: 'Thay đổi Azure RBAC là thao tác control plane, được ghi vào Activity Log (operation <code>Microsoft.Authorization/roleAssignments/write</code>). Entra audit logs ghi thay đổi Entra role và đối tượng directory. Sign-in logs ghi đăng nhập. Advisor không lưu nhật ký.'
    },
    {
      q: 'Công ty phải lưu nhật ký thay đổi role assignment trong 2 năm và truy vấn bằng KQL. Bạn cấu hình gì?',
      options: ['Tăng thời gian lưu Activity Log lên 2 năm trong cài đặt subscription', 'Tạo diagnostic setting gửi Activity Log về Log Analytics workspace với retention phù hợp', 'Bật Microsoft Entra ID P2', 'Xuất Activity Log thủ công mỗi tháng sang CSV'],
      answer: [1],
      explain: 'Activity Log chỉ giữ 90 ngày và không chỉnh được. Diagnostic setting gửi dữ liệu vào Log Analytics (bảng AzureActivity) cho phép lưu lâu và truy vấn KQL. Entra ID P2 không liên quan. Xuất CSV thủ công không đáp ứng truy vấn KQL và dễ sót.'
    },
    {
      q: 'Bạn là Owner của subscription nhưng không thể xóa một resource nằm trong managed resource group của một managed application. Trong IAM có tab Deny assignments hiển thị một mục "System protected". Phát biểu nào ĐÚNG? (Chọn 2)',
      options: ['Deny assignment được ưu tiên hơn role assignment Owner', 'Bạn có thể xóa deny assignment này rồi xóa resource', 'Deny assignment này do Azure tạo và quản lý', 'Gán thêm User Access Administrator sẽ vượt qua deny assignment'],
      answer: [0, 2],
      explain: 'Deny assignment được kiểm tra trước và chặn truy cập kể cả với Owner. Deny assignment kiểu này do Azure tạo (System protected) nên không chỉnh sửa hay xóa được; gán thêm role không vượt qua được. Cách đúng là thao tác qua chính managed application.'
    },
    {
      q: 'Helpdesk cần reset mật khẩu cho người dùng không phải admin trong Microsoft Entra ID. Bạn cấp quyền gì?',
      options: ['Entra role Helpdesk Administrator (hoặc Password Administrator)', 'Azure RBAC role Contributor ở subscription', 'Azure RBAC role User Access Administrator', 'Azure RBAC role Owner ở tenant root group'],
      answer: [0],
      explain: 'Reset mật khẩu là thao tác trên đối tượng directory, thuộc Microsoft Entra roles. Các Azure RBAC role chỉ quản lý Azure resource, không quản lý user trong Entra ID.'
    },
    {
      q: 'Bạn muốn cùng một custom role được dùng ở Sub1 và Sub2 trong cùng tenant. Role hiện chỉ có <code>/subscriptions/Sub1</code> trong AssignableScopes. Bạn cần làm gì?',
      options: ['Tạo bản sao role ở Sub2', 'Thêm <code>/subscriptions/Sub2</code> vào AssignableScopes và cập nhật role', 'Di chuyển Sub2 vào cùng resource group với Sub1', 'Đổi role thành built-in'],
      answer: [1],
      explain: 'AssignableScopes xác định nơi custom role gán được; thêm Sub2 và chạy <code>az role definition update</code> / <code>Set-AzRoleDefinition</code>. Tạo bản sao tốn quản lý và tốn hạn mức custom role. Subscription không nằm trong resource group. Không thể đổi custom role thành built-in.'
    },
    {
      q: 'User2 vừa được gán role Reader trên RG1 nhưng ngay lập tức vẫn báo không thấy resource. Cấu hình đúng. Nguyên nhân hợp lý và cách xử lý?',
      options: ['Phải gán thêm Contributor', 'Reader không xem được resource group', 'Role assignment cần vài phút để có hiệu lực; refresh hoặc đăng xuất / đăng nhập lại', 'Phải bật PIM trước khi dùng Reader'],
      answer: [2],
      explain: 'Resource Manager có cache nên thay đổi role assignment có thể mất vài phút (tối đa khoảng 10 phút) mới có hiệu lực; người dùng nên refresh hoặc đăng nhập lại. Reader đủ để xem. PIM không bắt buộc.'
    },
    {
      q: 'Phát biểu nào về Azure RBAC và Microsoft Entra roles là ĐÚNG?',
      options: ['Global Administrator mặc định là Owner của mọi subscription', 'Owner của subscription có thể tạo user mới trong Microsoft Entra ID', 'Azure RBAC role có thể gán ở scope administrative unit', 'Mặc định hai hệ thống tách biệt; Global Administrator chỉ có quyền Azure sau khi elevate access'],
      answer: [3],
      explain: 'Azure RBAC quản lý Azure resource, Entra roles quản lý directory, mặc định không chồng nhau. Global Administrator không tự có quyền trên subscription; Owner không quản lý user Entra; administrative unit là scope của Entra roles, không phải Azure RBAC.'
    }
  ]
});

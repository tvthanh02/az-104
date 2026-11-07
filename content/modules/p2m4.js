AZ.addModule({
  id: 'p2m4',
  summary: 'Azure Policy là công cụ quản trị (governance) chính của Azure: đặt "lan can" để resource luôn tuân thủ quy định công ty, đánh giá compliance trên quy mô lớn và tự khắc phục resource sai cấu hình. Module này kèm theo các công cụ governance anh em hay xuất hiện cùng nhau trong đề AZ-104: <strong>resource lock</strong>, <strong>tag</strong>, <strong>Cost Management + budget</strong> và <strong>Azure Advisor</strong>.',
  objectives: [
    'Giải thích vai trò của Azure Policy trong Cloud Adoption Framework (Govern) và sự khác nhau giữa Policy và RBAC',
    'Phân biệt policy definition, initiative, assignment, scope, exclusion, exemption và parameter',
    'Chọn đúng effect (Deny, Audit, Append, Modify, DeployIfNotExists, AuditIfNotExists, DenyAction, Disabled) và hiểu thứ tự đánh giá',
    'Cấu hình remediation task với managed identity và biết khi nào compliance được đánh giá lại',
    'Dùng resource lock, tag (và policy kế thừa tag), budget và Azure Advisor để bảo vệ và kiểm soát chi phí'
  ],
  sections: [
    {
      id: 'caf-governance',
      unit: 'Cloud adoption guidance for Azure',
      title: 'Cloud Adoption Framework và vai trò của Azure Policy',
      html: `
<p><strong>Microsoft Cloud Adoption Framework (CAF) for Azure</strong> là bộ hướng dẫn end-to-end để doanh nghiệp đưa workload lên cloud. CAF gồm các phương pháp (methodology) như Strategy, Plan, Ready, Adopt, <strong>Govern</strong>, Secure, Manage. Với admin, phần quan trọng nhất là <strong>Govern</strong>: quản lý cách tổ chức sử dụng cloud.</p>

<h4>5 bước cloud governance (CAF Govern)</h4>
<ol class="steps">
  <li><strong>Build a governance team</strong>: lập nhóm chịu trách nhiệm định nghĩa và báo cáo governance.</li>
  <li><strong>Assess cloud risks</strong>: đánh giá rủi ro compliance, security, vận hành, chi phí, dữ liệu, resource, AI.</li>
  <li><strong>Document cloud governance policies</strong>: viết thành văn bản những gì được / không được làm.</li>
  <li><strong>Enforce cloud governance policies</strong>: tự động hóa bằng công cụ (Azure Policy, RBAC, lock, budget) kết hợp kiểm tra thủ công.</li>
  <li><strong>Monitor cloud governance</strong>: theo dõi liên tục và lặp lại bước 2–5.</li>
</ol>

<h4>Các discipline governance và công cụ Azure tương ứng</h4>
<table>
  <thead><tr><th>Discipline</th><th>Mục tiêu</th><th>Công cụ Azure</th></tr></thead>
  <tbody>
    <tr><td>Cost management</td><td>Kiểm soát chi tiêu</td><td>Cost Management, budget, Advisor (Cost), tag</td></tr>
    <tr><td>Security baseline</td><td>Áp chuẩn bảo mật</td><td>Azure Policy, Microsoft Defender for Cloud</td></tr>
    <tr><td>Resource consistency</td><td>Cấu hình nhất quán, dễ tìm</td><td>Azure Policy, tag, naming convention, lock</td></tr>
    <tr><td>Identity baseline</td><td>Quyền nhất quán</td><td>Azure RBAC, Microsoft Entra ID, PIM</td></tr>
    <tr><td>Deployment acceleration</td><td>Triển khai chuẩn hóa</td><td>ARM/Bicep, landing zone, policy-as-code</td></tr>
  </tbody>
</table>

<h4>Azure Policy làm được gì?</h4>
<ul>
  <li>Chỉ cho phép triển khai ở region được duyệt (data residency).</li>
  <li>Chỉ cho phép một số VM size / storage SKU.</li>
  <li>Bắt buộc hoặc tự gắn tag.</li>
  <li>Bắt buộc gửi diagnostic log về Log Analytics workspace.</li>
  <li>Đánh giá cả resource <strong>đã tồn tại</strong> trước khi có policy (đánh dấu non-compliant, không xóa).</li>
</ul>

<div class="compare">
  <div><strong>Azure RBAC</strong>Trả lời "<em>ai</em> được làm hành động gì ở scope nào". Tập trung vào hành động của người dùng.</div>
  <div><strong>Azure Policy</strong>Trả lời "resource <em>phải trông như thế nào</em>". Dù bạn là Owner, nếu resource kết quả vi phạm policy Deny thì vẫn bị chặn.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Đảm bảo chỉ dùng VM size Standard_D2s_v5 trong subscription" → <strong>Azure Policy</strong> (Allowed virtual machine size SKUs), không phải RBAC. "Ngăn user X tạo VM" → <strong>RBAC</strong>. Thiết kế tốt cân bằng giữa <em>kiểm soát</em> và <em>tốc độ</em>: bắt đầu bằng Audit trước khi chuyển sang Deny.</div>
`
    },
    {
      id: 'design-principles',
      unit: 'Azure Policy design principles',
      title: 'Nguyên tắc thiết kế: hệ phân cấp, control plane và luồng đánh giá',
      html: `
<h4>Thiết kế theo hệ phân cấp</h4>
<p>Azure có 4 cấp quản lý: <strong>management group → subscription → resource group → resource</strong>. Policy gán ở cấp cao được kế thừa xuống mọi cấp dưới. Khuyến nghị:</p>
<ul>
  <li>Lưu <strong>definition</strong> ở cấp cao (management group hoặc subscription) để tái sử dụng; gán <strong>assignment</strong> ở cấp phù hợp bên dưới. Definition lưu ở MG có thể gán cho mọi subscription/RG bên trong MG đó.</li>
  <li>Dùng <strong>initiative</strong> ngay cả khi mới có một policy, để sau này thêm policy mà không tăng số assignment.</li>
  <li>Bắt đầu với <strong>Audit / AuditIfNotExists</strong>, đánh giá tác động, rồi mới chuyển sang <strong>Deny / Modify / DeployIfNotExists</strong>.</li>
  <li>Quản lý policy dưới dạng code (policy-as-code) có review.</li>
</ul>

<h4>Policy hoạt động ở đâu?</h4>
<p>Azure Policy tích hợp với <strong>Azure Resource Manager</strong>, tức là <strong>control plane</strong>. Request tạo/sửa resource đi qua ARM: xác thực → <strong>RBAC</strong> → <strong>Azure Policy</strong> → resource provider. Nếu RBAC từ chối thì Policy thậm chí không được gọi.</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 200" role="img" aria-label="Request đi qua Azure Resource Manager, RBAC, Azure Policy rồi tới resource provider">
  <text x="360" y="26" text-anchor="middle" class="t-sm t-mute">Control plane: mọi request đi qua management.azure.com</text>
  <rect class="box" x="10" y="56" width="100" height="56" rx="8"/>
  <text x="60" y="80" text-anchor="middle" class="t-b">Client</text>
  <text x="60" y="98" text-anchor="middle" class="t-sm t-mute">portal, CLI…</text>
  <rect class="box-a" x="136" y="56" width="135" height="56" rx="8"/>
  <text x="203" y="80" text-anchor="middle" class="t-b">ARM</text>
  <text x="203" y="98" text-anchor="middle" class="t-sm t-mute">xác thực token</text>
  <rect class="box-a" x="297" y="56" width="100" height="56" rx="8"/>
  <text x="347" y="80" text-anchor="middle" class="t-b">Azure RBAC</text>
  <text x="347" y="98" text-anchor="middle" class="t-sm t-mute">có quyền?</text>
  <rect class="box-e" x="423" y="56" width="120" height="56" rx="8"/>
  <text x="483" y="80" text-anchor="middle" class="t-b">Azure Policy</text>
  <text x="483" y="98" text-anchor="middle" class="t-sm t-mute">Modify, Deny…</text>
  <rect class="box-s" x="569" y="56" width="140" height="56" rx="8"/>
  <text x="639" y="80" text-anchor="middle" class="t-b">Resource provider</text>
  <text x="639" y="98" text-anchor="middle" class="t-sm t-mute">tạo / sửa resource</text>

  <line class="ln" x1="110" y1="84" x2="132" y2="84" marker-end="url(#arr)"/>
  <line class="ln" x1="271" y1="84" x2="293" y2="84" marker-end="url(#arr)"/>
  <line class="ln" x1="397" y1="84" x2="419" y2="84" marker-end="url(#arr)"/>
  <line class="ln-s" x1="543" y1="84" x2="565" y2="84" marker-end="url(#arr-s)"/>

  <line class="ln-x" x1="347" y1="112" x2="347" y2="146" marker-end="url(#arr-x)"/>
  <rect class="box-x" x="277" y="150" width="140" height="36" rx="8"/>
  <text x="347" y="173" text-anchor="middle" class="t-sm">403 · không đủ quyền</text>
  <line class="ln-x" x1="483" y1="112" x2="483" y2="146" marker-end="url(#arr-x)"/>
  <rect class="box-x" x="433" y="150" width="200" height="36" rx="8"/>
  <text x="533" y="173" text-anchor="middle" class="t-sm">403 RequestDisallowedByPolicy</text>
</svg>
<figcaption>Hình 1. Azure Policy chỉ được gọi khi RBAC đã cho phép. Policy có thể sửa request (Modify/Append) hoặc chặn nó (Deny) trước khi request tới resource provider.</figcaption>
</figure>
<p>Một số <strong>Resource Provider mode</strong> mở rộng policy xuống data plane: <code>Microsoft.Kubernetes.Data</code> (AKS), <code>Microsoft.KeyVault.Data</code> (certificate/key trong vault), <code>Microsoft.Network.Data</code> (Azure Virtual Network Manager)…</p>

<h4>Greenfield và brownfield</h4>
<div class="compare">
  <div><strong>Greenfield (policy có trước)</strong>Mỗi request tạo/cập nhật được đánh giá <strong>ngay lúc request</strong>. Với update, Policy ghép phần thay đổi vào trạng thái hiện tại rồi đánh giá trạng thái đích. Deny chặn ngay.</div>
  <div><strong>Brownfield (resource có trước)</strong>Resource đã tồn tại được đánh giá bằng <strong>compliance scan</strong> (tự động mỗi 24 giờ hoặc chạy thủ công). Resource vi phạm chỉ bị <strong>đánh dấu non-compliant</strong>, <strong>không bị xóa</strong>.</div>
</div>

<h4>Policy là hệ thống "explicit deny"</h4>
<p>Các assignment được đánh giá độc lập và kết quả là <strong>cộng dồn, hạn chế nhất</strong>. Bạn <strong>không thể</strong> "nới lỏng" một policy Deny ở MG bằng cách gán policy dễ dãi hơn ở subscription con. Cách đúng: <strong>exclude</strong> scope con khỏi assignment ở trên (hoặc tạo exemption), rồi gán policy khác cho scope con.</p>

<div class="callout exam"><strong>Bẫy thi</strong>Policy ở MG chỉ cho phép region East US, policy ở subscription cho phép West US. Tạo resource ở West US trong subscription đó → <strong>bị chặn</strong>, vì policy ở MG vẫn áp dụng. Policy gán ở MG nhưng chỉ resource ở cấp subscription/RG trở xuống được đánh giá.</div>
`
    },
    {
      id: 'policy-resources',
      unit: 'Azure Policy resources',
      title: 'Các đối tượng của Azure Policy: definition, initiative, assignment, exemption',
      html: `
<table>
  <thead><tr><th>Đối tượng</th><th>Ý nghĩa</th><th>Lưu / gán ở đâu</th></tr></thead>
  <tbody>
    <tr><td>Policy definition</td><td>Một quy tắc JSON: điều kiện + effect</td><td>Lưu ở MG hoặc subscription (built-in có sẵn)</td></tr>
    <tr><td>Initiative (policySetDefinition)</td><td>Nhóm nhiều definition phục vụ một mục tiêu (vd. CIS, ISO 27001, Microsoft cloud security benchmark)</td><td>MG hoặc subscription</td></tr>
    <tr><td>Assignment</td><td>Áp definition/initiative lên một scope, truyền giá trị parameter</td><td>MG, subscription, RG, resource</td></tr>
    <tr><td>Exclusion (notScopes)</td><td>Loại scope con khỏi assignment ngay lúc gán</td><td>Thuộc tính của assignment</td></tr>
    <tr><td>Exemption</td><td>Miễn trừ một scope khỏi assignment, có category (<strong>Waiver</strong> / <strong>Mitigated</strong>) và ngày hết hạn</td><td>Đối tượng riêng; resource hiển thị trạng thái <em>Exempt</em></td></tr>
    <tr><td>Remediation task</td><td>Sửa resource đã tồn tại cho policy Modify / DeployIfNotExists</td><td>Trên một assignment</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 312" role="img" aria-label="Initiative được gán vào management group, kế thừa xuống subscription, với một exclusion và một exemption">
  <rect class="box-e" x="10" y="20" width="230" height="122" rx="10"/>
  <text x="125" y="44" text-anchor="middle" class="t-b">Initiative</text>
  <text x="125" y="61" text-anchor="middle" class="t-sm t-mute">nhóm policy definition</text>
  <rect class="box" x="22" y="74" width="206" height="26" rx="6"/>
  <text x="125" y="91" text-anchor="middle" class="t-sm">Allowed locations</text>
  <rect class="box" x="22" y="106" width="206" height="26" rx="6"/>
  <text x="125" y="123" text-anchor="middle" class="t-sm">Require a tag on resources</text>

  <rect class="box-a" x="275" y="45" width="170" height="72" rx="10"/>
  <text x="360" y="70" text-anchor="middle" class="t-b">Assignment</text>
  <text x="360" y="88" text-anchor="middle" class="t-sm">parameters,</text>
  <text x="360" y="104" text-anchor="middle" class="t-sm">enforcement mode</text>

  <rect class="box-a" x="480" y="53" width="200" height="56" rx="10"/>
  <text x="580" y="77" text-anchor="middle" class="t-b">mg-corp</text>
  <text x="580" y="95" text-anchor="middle" class="t-sm t-mute">scope của assignment</text>

  <line class="ln-a" x1="240" y1="81" x2="271" y2="81" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="445" y1="81" x2="476" y2="81" marker-end="url(#arr-a)"/>

  <rect class="box" x="380" y="160" width="160" height="44" rx="8"/>
  <text x="460" y="187" text-anchor="middle" class="t-b">sub-prod</text>
  <rect class="box" x="560" y="160" width="150" height="44" rx="8"/>
  <text x="635" y="187" text-anchor="middle" class="t-b">sub-dev</text>
  <line class="ln" x1="560" y1="109" x2="470" y2="156" marker-end="url(#arr)"/>
  <line class="ln" x1="600" y1="109" x2="628" y2="156" marker-end="url(#arr)"/>

  <rect class="box-w" x="380" y="240" width="160" height="62" rx="8"/>
  <text x="460" y="262" text-anchor="middle" class="t-b">vm-legacy</text>
  <text x="460" y="279" text-anchor="middle" class="t-sm">Exemption · Waiver</text>
  <text x="460" y="295" text-anchor="middle" class="t-sm t-mute">có ngày hết hạn</text>
  <rect class="box-x" x="560" y="240" width="150" height="62" rx="8"/>
  <text x="635" y="262" text-anchor="middle" class="t-b">rg-sandbox</text>
  <text x="635" y="279" text-anchor="middle" class="t-sm">Exclusion</text>
  <text x="635" y="295" text-anchor="middle" class="t-sm t-mute">(notScopes)</text>
  <line class="ln" x1="460" y1="204" x2="460" y2="236" marker-end="url(#arr)"/>
  <line class="ln" x1="635" y1="204" x2="635" y2="236" marker-end="url(#arr)"/>

  <rect class="box" x="10" y="170" width="340" height="132" rx="10"/>
  <text x="22" y="194" class="t-sm"><tspan class="t-b">Definition</tspan>: 1 quy tắc (if → effect)</text>
  <text x="22" y="216" class="t-sm"><tspan class="t-b">Initiative</tspan>: nhiều definition, 1 assignment</text>
  <text x="22" y="238" class="t-sm"><tspan class="t-b">Assignment</tspan>: gắn vào scope, kế thừa xuống</text>
  <text x="22" y="260" class="t-sm"><tspan class="t-b">Exclusion</tspan>: loại scope con ngay lúc gán</text>
  <text x="22" y="282" class="t-sm"><tspan class="t-b">Exemption</tspan>: miễn trừ riêng, Waiver/Mitigated</text>
</svg>
<figcaption>Hình 1. Một initiative được gán ở <code>mg-corp</code> nên áp cho cả <code>sub-prod</code> và <code>sub-dev</code>. <code>rg-sandbox</code> bị loại bằng exclusion (không được đánh giá), còn <code>vm-legacy</code> vẫn được đánh giá nhưng hiển thị trạng thái <em>Exempt</em>.</figcaption>
</figure>

<h4>Parameter</h4>
<p>Parameter giúp tái sử dụng definition: một definition "Allowed locations" với parameter <code>listOfAllowedLocations</code> có thể gán cho subscription A với [eastus] và subscription B với [westeurope]. Initiative có thể đẩy parameter của policy con lên thành parameter của initiative.</p>

<h4>Enforcement mode</h4>
<p>Assignment có <code>enforcementMode</code>: <strong>Default</strong> (thực thi) hoặc <strong>DoNotEnforce</strong> (vẫn đánh giá compliance nhưng không chặn/không sửa, dùng để thử "what-if" trước khi bật thật).</p>

<h4>Remediation và managed identity</h4>
<ul>
  <li>Chỉ <strong>Modify</strong> và <strong>DeployIfNotExists</strong> có remediation.</li>
  <li>Assignment chứa các effect này cần một <strong>managed identity</strong> (system-assigned hoặc user-assigned). Identity được cấp các role trong <code>roleDefinitionIds</code> của definition. Người gán cần quyền gán role (Owner / User Access Administrator) để portal tự cấp quyền cho identity.</li>
  <li>Resource <strong>mới</strong> được sửa tự động khi tạo/cập nhật. Resource <strong>đã tồn tại</strong> chỉ được sửa khi bạn chạy <strong>remediation task</strong> (tối đa 50.000 resource mỗi task).</li>
</ul>
<pre><code># Gán policy có Modify/DINE kèm system-assigned identity
az policy assignment create --name inherit-env-tag \\
  --policy "&lt;definition-name-or-id&gt;" \\
  --scope /subscriptions/&lt;subId&gt; \\
  --params '{"tagName":{"value":"env"}}' \\
  --mi-system-assigned --location eastus

# Tạo remediation task cho resource đã tồn tại
az policy remediation create --name fix-env-tag --policy-assignment inherit-env-tag

# PowerShell
Start-AzPolicyRemediation -Name fix-env-tag -PolicyAssignmentId &lt;assignmentId&gt;</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: gán policy Modify và tạo remediation task</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở Azure Policy và vào danh sách assignment:<br><span class="path">Azure portal › Policy › Assignments › Assign policy</span> (trong menu trái của Policy, mục Assignments thường nằm dưới nhóm Authoring)</li>
    <li>Tab <strong>Basics</strong>: chọn scope bằng nút <strong>…</strong>, rồi chọn definition built-in <em>Inherit a tag from the resource group if missing</em>:
      <div class="blade">
        <div class="blade-title">Assign policy</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Parameters</span><span>Remediation</span><span>Non-compliance messages</span><span>Review + create</span></div>
        <div class="blade-sec">Scope</div>
        <div class="pf"><label class="req">Scope</label><span class="pv">sub-prod-01</span></div>
        <div class="pf"><label>Exclusions</label><span class="pv">sub-prod-01/rg-sandbox</span></div>
        <div class="blade-sec">Basics</div>
        <div class="pf"><label class="req">Policy definition</label><span class="pv">Inherit a tag from the resource group if missing</span></div>
        <div class="pf"><label class="req">Assignment name</label><span class="pv">inherit-env-tag</span></div>
        <div class="pf"><label>Policy enforcement</label><span class="pv radio">Enabled</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Parameters</strong>: <em>Tag Name</em> = <code>env</code>.</li>
    <li>Tab <strong>Remediation</strong>: vì definition có effect Modify, phải có managed identity. Đánh dấu tạo remediation task để sửa luôn các resource đã tồn tại:
      <div class="blade">
        <div class="blade-title">Assign policy › Remediation</div>
        <div class="pf"><label>Create a remediation task</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Create a Managed Identity</label><span class="pv chk">Bật (bắt buộc với Modify / DINE)</span></div>
        <div class="pf"><label>Type of Managed Identity</label><span class="pv radio">System assigned managed identity</span></div>
        <div class="pf"><label class="req">System assigned identity location</label><span class="pv sel">East US</span></div>
        <div class="pf"><label>Permissions</label><span class="pv note">Portal tự cấp role trong roleDefinitionIds (vd. Tag Contributor / Contributor) cho identity</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Non-compliance messages</strong>: nhập thông điệp, vd. "Resource phải có tag env". Sau đó <strong>Review + create</strong> › <strong>Create</strong>.</li>
    <li>Nếu bỏ qua bước tạo remediation lúc gán: <span class="path">Policy › Remediation › Policies to remediate</span> chọn assignment › <strong>Remediate</strong>. Theo dõi ở tab <em>Remediation tasks</em>.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m4/policy-remediation-tab.png" alt="Tab Remediation của trang gán policy: tạo system assigned managed identity ở East US và danh sách quyền sẽ cấp" loading="lazy"><figcaption>Hình 2. Phần Managed Identity trên tab Remediation: chọn system-assigned hoặc user-assigned, vị trí của identity, và mục <em>Permissions</em> liệt kê role mà portal sẽ tự cấp. Nguồn: <a href="https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Giới hạn số lượng</h4>
<table>
  <thead><tr><th>Đối tượng</th><th>Tối đa</th></tr></thead>
  <tbody>
    <tr><td>Policy definition mỗi scope</td><td>500</td></tr>
    <tr><td>Initiative mỗi scope</td><td>200</td></tr>
    <tr><td>Assignment mỗi scope</td><td>200</td></tr>
    <tr><td>Policy trong một initiative</td><td>1.000</td></tr>
    <tr><td>Exclusion (notScopes) mỗi assignment</td><td>400</td></tr>
    <tr><td>Exemption mỗi scope</td><td>1.000</td></tr>
  </tbody>
</table>

<h4>Quyền</h4>
<ul>
  <li><strong>Resource Policy Contributor</strong>: tạo definition và assignment.</li>
  <li><strong>Contributor</strong>: có thể kích hoạt remediation nhưng <strong>không</strong> tạo/sửa definition và assignment.</li>
  <li>Cấp quyền cho managed identity của assignment Modify/DINE cần <strong>User Access Administrator</strong> hoặc Owner.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Policy DeployIfNotExists đã gán nhưng các VM cũ vẫn non-compliant" → tạo <strong>remediation task</strong>. "Gán policy bị lỗi thiếu identity" → assignment có Modify/DINE phải có <strong>managed identity</strong>.</div>
`
    },
    {
      id: 'policy-definitions',
      unit: 'Azure Policy definitions',
      title: 'Cấu trúc policy definition và các effect',
      html: `
<h4>Cấu trúc JSON</h4>
<pre><code>{
  "properties": {
    "displayName": "Require env tag on resources",
    "mode": "Indexed",
    "parameters": {
      "tagName": { "type": "String", "metadata": { "displayName": "Tag name" } }
    },
    "policyRule": {
      "if":   { "field": "[concat('tags[', parameters('tagName'), ']')]", "exists": "false" },
      "then": { "effect": "deny" }
    }
  }
}</code></pre>
<ul>
  <li><strong>mode</strong>: <code>All</code> đánh giá mọi resource type, kể cả resource group và subscription; <code>Indexed</code> chỉ đánh giá resource type hỗ trợ tag và location (dùng cho policy về tag/location để không báo sai trên resource không hỗ trợ tag).</li>
  <li><strong>policyRule</strong>: khối <code>if</code> dùng <code>field</code>, alias (vd. <code>Microsoft.Compute/virtualMachines/sku.name</code>), toán tử logic <code>allOf</code>, <code>anyOf</code>, <code>not</code>; khối <code>then</code> chứa <code>effect</code>.</li>
  <li>Mỗi definition có <strong>đúng một</strong> effect (thường được tham số hóa để chọn lúc gán).</li>
</ul>

<h4>Các effect</h4>
<table>
  <thead><tr><th>Effect</th><th>Hành vi</th><th>Ví dụ</th></tr></thead>
  <tbody>
    <tr><td><strong>Disabled</strong></td><td>Tắt policy, không đánh giá</td><td>Tạm tắt một policy trong initiative</td></tr>
    <tr><td><strong>Append</strong></td><td>Thêm trường vào request khi tạo/cập nhật</td><td>Thêm IP rule vào storage account</td></tr>
    <tr><td><strong>Modify</strong></td><td>Thêm/thay/xóa thuộc tính hoặc tag; có remediation</td><td>Kế thừa tag env từ RG</td></tr>
    <tr><td><strong>Deny</strong></td><td>Chặn request tạo/cập nhật vi phạm (lỗi 403); resource cũ bị đánh dấu non-compliant</td><td>Allowed locations, Allowed VM SKUs</td></tr>
    <tr><td><strong>Audit</strong></td><td>Cho phép nhưng ghi cảnh báo vào activity log, đánh dấu non-compliant</td><td>Audit VM không dùng managed disk</td></tr>
    <tr><td><strong>AuditIfNotExists</strong></td><td>Audit nếu <em>resource liên quan</em> (con/extension) không tồn tại</td><td>Audit VM chưa cài extension giám sát</td></tr>
    <tr><td><strong>DeployIfNotExists</strong></td><td>Triển khai template khi resource liên quan không tồn tại; có remediation</td><td>Tự bật diagnostic settings gửi về Log Analytics</td></tr>
    <tr><td><strong>DenyAction</strong></td><td>Chặn một <em>hành động</em> trên resource (hiện dùng cho <code>delete</code>)</td><td>Chặn xóa các resource có tag critical=true</td></tr>
    <tr><td>Manual</td><td>Tự khai báo compliance (attestation)</td><td>Kiểm soát quy trình không tự động hóa được</td></tr>
  </tbody>
</table>

<h4>Thứ tự đánh giá (Resource Manager mode)</h4>
<ol class="steps">
  <li><strong>Disabled</strong> được kiểm tra trước để biết có đánh giá rule không.</li>
  <li><strong>Append</strong> và <strong>Modify</strong>: có thể thay đổi request, nên chạy trước để thay đổi đó có thể giúp request không bị Deny/Audit.</li>
  <li><strong>Deny</strong>: chạy trước Audit để tránh ghi log hai lần cho resource bị chặn.</li>
  <li><strong>Audit</strong>, sau đó Manual, <strong>AuditIfNotExists</strong>.</li>
  <li><strong>DenyAction</strong> được đánh giá cuối cùng.</li>
  <li>Sau khi resource provider trả về thành công: <strong>AuditIfNotExists</strong> và <strong>DeployIfNotExists</strong> chạy để xem có cần ghi log thêm hoặc triển khai thêm.</li>
</ol>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 236" role="img" aria-label="Thứ tự đánh giá effect của Azure Policy">
  <text x="166" y="30" text-anchor="middle" class="t-sm t-mute">1</text>
  <text x="309" y="30" text-anchor="middle" class="t-sm t-mute">2</text>
  <text x="436" y="30" text-anchor="middle" class="t-sm t-mute">3</text>
  <text x="538" y="30" text-anchor="middle" class="t-sm t-mute">4</text>
  <text x="655" y="30" text-anchor="middle" class="t-sm t-mute">5</text>

  <rect class="box" x="10" y="40" width="90" height="52" rx="8"/>
  <text x="55" y="62" text-anchor="middle" class="t-b">Request</text>
  <text x="55" y="80" text-anchor="middle" class="t-sm t-mute">PUT / PATCH</text>
  <rect class="box" x="116" y="40" width="100" height="52" rx="8"/>
  <text x="166" y="62" text-anchor="middle" class="t-b">Disabled?</text>
  <text x="166" y="80" text-anchor="middle" class="t-sm t-mute">bỏ qua rule</text>
  <rect class="box-a" x="244" y="40" width="130" height="52" rx="8"/>
  <text x="309" y="62" text-anchor="middle" class="t-b">Append / Modify</text>
  <text x="309" y="80" text-anchor="middle" class="t-sm t-mute">sửa request</text>
  <rect class="box-x" x="396" y="40" width="80" height="52" rx="8"/>
  <text x="436" y="62" text-anchor="middle" class="t-b">Deny</text>
  <text x="436" y="80" text-anchor="middle" class="t-sm">chặn (403)</text>
  <rect class="box-w" x="498" y="40" width="80" height="52" rx="8"/>
  <text x="538" y="62" text-anchor="middle" class="t-b">Audit</text>
  <text x="538" y="80" text-anchor="middle" class="t-sm">cảnh báo</text>
  <rect class="box-x" x="600" y="40" width="110" height="52" rx="8"/>
  <text x="655" y="62" text-anchor="middle" class="t-b">DenyAction</text>
  <text x="655" y="80" text-anchor="middle" class="t-sm">chặn delete</text>

  <line class="ln" x1="100" y1="66" x2="112" y2="66" marker-end="url(#arr)"/>
  <line class="ln" x1="216" y1="66" x2="240" y2="66" marker-end="url(#arr)"/>
  <line class="ln" x1="374" y1="66" x2="392" y2="66" marker-end="url(#arr)"/>
  <line class="ln" x1="476" y1="66" x2="494" y2="66" marker-end="url(#arr)"/>
  <line class="ln" x1="578" y1="66" x2="596" y2="66" marker-end="url(#arr)"/>

  <line class="ln-s" x1="655" y1="92" x2="655" y2="136" marker-end="url(#arr-s)"/>
  <text x="664" y="119" class="t-sm t-s">OK</text>
  <rect class="box-s" x="520" y="140" width="190" height="52" rx="8"/>
  <text x="615" y="162" text-anchor="middle" class="t-b">Resource provider</text>
  <text x="615" y="180" text-anchor="middle" class="t-sm t-mute">tạo / cập nhật thành công</text>
  <line class="ln-s" x1="520" y1="166" x2="486" y2="166" marker-end="url(#arr-s)"/>
  <text x="366" y="130" text-anchor="middle" class="t-sm t-mute">6</text>
  <rect class="box-e" x="250" y="140" width="232" height="52" rx="8"/>
  <text x="366" y="162" text-anchor="middle" class="t-b">AuditIfNotExists / DINE</text>
  <text x="366" y="180" text-anchor="middle" class="t-sm t-mute">kiểm tra resource liên quan</text>

  <text x="360" y="222" text-anchor="middle" class="t-sm t-mute">Hàng trên: đánh giá khi ARM nhận request · Hàng dưới: chạy sau khi resource provider trả về thành công</text>
</svg>
<figcaption>Hình 1. Modify chạy <strong>trước</strong> Deny nên có thể "cứu" một request (vd. thêm tag còn thiếu). AuditIfNotExists và DeployIfNotExists chỉ chạy sau khi resource đã được tạo/cập nhật xong. Ở bước 4, sau Audit còn Manual và AuditIfNotExists, rồi mới tới DenyAction.</figcaption>
</figure>

<div class="callout tip"><strong>Mẹo chọn effect</strong>Cần <em>chặn</em> → Deny. Cần <em>báo cáo</em> → Audit. Cần <em>tự sửa thuộc tính/tag</em> → Modify. Cần <em>tự triển khai resource kèm theo</em> (extension, diagnostic setting) → DeployIfNotExists. Cần <em>chặn xóa</em> nhưng vẫn cho sửa → DenyAction (hoặc resource lock CanNotDelete).</div>

<pre><code># Tạo definition và assignment
az policy definition create --name require-env-tag --mode Indexed \\
  --rules rules.json --params params.json
az policy assignment create --name req-env --policy require-env-tag \\
  --scope /subscriptions/&lt;subId&gt;/resourceGroups/rg-app --params '{"tagName":{"value":"env"}}'

New-AzPolicyAssignment -Name req-env -PolicyDefinition (Get-AzPolicyDefinition -Name require-env-tag) -Scope "/subscriptions/&lt;subId&gt;"</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>Deny <strong>không xóa</strong> resource đã tồn tại. Audit <strong>không chặn</strong>. Modify và DeployIfNotExists không tự sửa resource cũ nếu không có remediation task. Nếu cùng resource bị một policy Deny và một policy Modify cùng nhắm, Modify chạy trước Deny.</div>
`
    },
    {
      id: 'policy-evaluation',
      unit: 'Evaluation of resources through Azure Policy',
      title: 'Đánh giá compliance: khi nào, bao lâu và xem ở đâu',
      html: `
<h4>Các sự kiện kích hoạt đánh giá</h4>
<table>
  <thead><tr><th>Sự kiện</th><th>Thời gian</th></tr></thead>
  <tbody>
    <tr><td>Gán mới (hoặc cập nhật) policy / initiative</td><td>Khoảng <strong>5 phút</strong> để assignment áp dụng vào scope, sau đó chu kỳ đánh giá bắt đầu; thời gian hoàn tất không cố định</td></tr>
    <tr><td>Resource được tạo / cập nhật trong scope</td><td>Kết quả của resource đó có sau khoảng <strong>15 phút</strong>; không kích hoạt đánh giá resource khác</td></tr>
    <tr><td>Subscription được tạo / di chuyển trong cây MG (policy nhắm resource type subscription)</td><td>Khoảng <strong>30 phút</strong></td></tr>
    <tr><td>Exemption được tạo / sửa / xóa</td><td>Đánh giá lại assignment tương ứng trong scope exemption</td></tr>
    <tr><td>Chu kỳ compliance chuẩn</td><td><strong>Mỗi 24 giờ</strong></td></tr>
    <tr><td>On-demand scan</td><td>Chạy bất đồng bộ khi bạn yêu cầu</td></tr>
  </tbody>
</table>

<h4>Chạy scan thủ công</h4>
<pre><code># Azure CLI: mặc định cả subscription hiện tại
az policy state trigger-scan
az policy state trigger-scan --resource-group rg-app --no-wait

# Azure PowerShell
Start-AzPolicyComplianceScan -ResourceGroupName rg-app
$job = Start-AzPolicyComplianceScan -AsJob</code></pre>

<h4>Trạng thái compliance</h4>
<ul>
  <li><strong>Compliant</strong> / <strong>Non-compliant</strong>: kết quả đánh giá.</li>
  <li><strong>Exempt</strong>: thuộc phạm vi một exemption.</li>
  <li><strong>Conflicting</strong>: hai policy có rule mâu thuẫn (vd. hai Modify đặt cùng tag khác giá trị).</li>
  <li><strong>Not started</strong>: chưa đánh giá xong chu kỳ đầu.</li>
  <li><strong>Unknown</strong>: thường gặp với effect Manual chưa attestation.</li>
</ul>
<p>Mức compliance của initiative tính theo resource: resource chỉ compliant khi tuân thủ <strong>mọi</strong> policy áp lên nó.</p>

<h4>Xem kết quả</h4>
<ul>
  <li>Portal: <strong>Policy → Compliance</strong>, lọc theo assignment, xem từng resource, mở activity log liên quan.</li>
  <li>CLI / PowerShell: <code>az policy state list</code>, <code>az policy state summarize</code>, <code>Get-AzPolicyState</code>, <code>Get-AzPolicyStateSummary</code>.</li>
  <li><strong>Azure Resource Graph</strong> (bảng <code>policyresources</code>) để truy vấn compliance trên nhiều subscription.</li>
  <li>Activity log (bảng <code>AzureActivity</code> trong Log Analytics) để cảnh báo khi có sự kiện non-compliant.</li>
</ul>

<h4>Lưu ý đặc biệt</h4>
<ul>
  <li>Resource thuộc provider <code>Microsoft.Resources</code> được miễn đánh giá, <strong>trừ</strong> subscription và resource group.</li>
  <li>Request <code>PATCH</code> chỉ sửa tag chỉ kích hoạt các policy có điều kiện liên quan đến tag.</li>
  <li>Policy luôn dùng phiên bản <strong>mới nhất</strong> của definition; sửa definition sẽ ảnh hưởng mọi assignment đang dùng nó.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Vừa gán policy, cần thấy kết quả compliance sớm nhất" → chạy <code>az policy state trigger-scan</code> / <code>Start-AzPolicyComplianceScan</code>. Nếu không làm gì, resource cũ được đánh giá trong chu kỳ sau khi gán hoặc trong chu kỳ 24 giờ.</div>
`
    },
    {
      id: 'resource-locks',
      extra: true,
      title: 'Resource locks: CanNotDelete và ReadOnly',
      html: `
<div class="compare">
  <div><strong>CanNotDelete (portal: Delete)</strong>Người có quyền vẫn đọc và <strong>sửa</strong> được resource, nhưng <strong>không xóa</strong> được.</div>
  <div><strong>ReadOnly (portal: Read-only)</strong>Chỉ đọc: không sửa, không xóa. Tương tự giới hạn mọi người xuống quyền của <strong>Reader</strong>.</div>
</div>

<h4>Đặc điểm</h4>
<ul>
  <li>Lock áp cho <strong>mọi người dùng và mọi role</strong>, kể cả Owner. Muốn thao tác phải <strong>gỡ lock trước</strong>.</li>
  <li>Đặt được ở <strong>subscription, resource group, resource</strong>; <strong>không</strong> đặt ở management group.</li>
  <li><strong>Kế thừa</strong>: lock ở cha áp cho mọi resource con, kể cả resource tạo sau. Lock hạn chế nhất thắng.</li>
  <li>Một resource có lock CanNotDelete trong RG → xóa RG sẽ thất bại <strong>toàn bộ</strong> (không xóa một phần).</li>
  <li>Lock chỉ áp cho <strong>control plane</strong> (<code>management.azure.com</code>), không chặn data plane: lock trên storage account không ngăn xóa blob; lock trên SQL server không ngăn xóa dữ liệu trong database.</li>
  <li>Lock không chặn việc hủy (cancel) subscription.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 262" role="img" aria-label="Lock CanNotDelete trên resource group được kế thừa xuống các resource">
  <rect class="box" x="60" y="20" width="200" height="50" rx="8"/>
  <text x="160" y="41" text-anchor="middle" class="t-b">Subscription</text>
  <text x="160" y="59" text-anchor="middle" class="t-sm t-mute">không có lock</text>
  <rect class="box-w" x="60" y="110" width="200" height="60" rx="8"/>
  <text x="160" y="134" text-anchor="middle" class="t-b">rg-prod</text>
  <text x="160" y="154" text-anchor="middle" class="t-sm">lock: CanNotDelete</text>
  <line class="ln" x1="160" y1="70" x2="160" y2="106" marker-end="url(#arr)"/>

  <rect class="box-x" x="350" y="20" width="300" height="70" rx="8"/>
  <text x="500" y="42" text-anchor="middle" class="t-b">vm1</text>
  <text x="500" y="60" text-anchor="middle" class="t-sm">kế thừa CanNotDelete từ RG</text>
  <text x="500" y="78" text-anchor="middle" class="t-sm">+ lock ReadOnly riêng → hiệu lực ReadOnly</text>
  <rect class="box-w" x="350" y="110" width="300" height="60" rx="8"/>
  <text x="500" y="134" text-anchor="middle" class="t-b">stprod01</text>
  <text x="500" y="154" text-anchor="middle" class="t-sm">kế thừa CanNotDelete: sửa được, không xóa</text>

  <line class="ln-a" x1="260" y1="128" x2="346" y2="66" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="260" y1="140" x2="346" y2="140" marker-end="url(#arr-a)"/>
  <text x="303" y="160" text-anchor="middle" class="t-sm t-a">kế thừa</text>

  <rect class="box-x" x="10" y="196" width="340" height="56" rx="10"/>
  <text x="180" y="219" text-anchor="middle" class="t-b">Xóa rg-prod: thất bại toàn bộ</text>
  <text x="180" y="239" text-anchor="middle" class="t-sm">không xóa một phần resource nào</text>
  <rect class="box-s" x="370" y="196" width="340" height="56" rx="10"/>
  <text x="540" y="219" text-anchor="middle" class="t-b">Xóa blob trong stprod01: vẫn được</text>
  <text x="540" y="239" text-anchor="middle" class="t-sm">lock chỉ chặn control plane</text>
</svg>
<figcaption>Hình 1. Lock ở cấp cha áp cho mọi resource con (kể cả resource tạo sau), lock hạn chế nhất thắng. Lock không phân biệt role: Owner cũng phải gỡ lock trước khi xóa.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: thêm lock Delete cho resource group</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở resource group cần bảo vệ, vào mục Locks (ở subscription mục này tên là <em>Resource locks</em>):<br><span class="path">Azure portal › Resource groups › rg-prod › Settings › Locks</span></li>
    <li>Bấm <strong>+ Add</strong> và điền:
      <div class="blade">
        <div class="blade-title">Add lock</div>
        <div class="pf"><label class="req">Lock name</label><span class="pv">lock-rg-prod</span></div>
        <div class="pf"><label class="req">Lock type</label><span class="pv sel">Delete</span></div>
        <div class="pf"><label></label><span class="pv note">Portal: Delete / Read-only = CLI: CanNotDelete / ReadOnly</span></div>
        <div class="pf"><label>Notes</label><span class="pv">Không xóa RG production</span></div>
        <div class="pbtns"><span class="pbtn primary">OK</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Kiểm tra: thử xóa một VM trong <code>rg-prod</code>, portal báo lỗi do lock (ScopeLocked). Mở trang Locks của chính VM, lock của RG hiện với cột Scope là resource group cha.</li>
    <li>Gỡ lock: ở trang Locks của RG bấm biểu tượng <strong>Delete</strong> trên dòng lock. Cần role Owner hoặc User Access Administrator.</li>
  </ol></div>
</div>

<h4>Ai tạo / xóa được lock?</h4>
<p>Cần quyền <code>Microsoft.Authorization/locks/*</code> (hoặc <code>Microsoft.Authorization/*</code>): <strong>Owner</strong> và <strong>User Access Administrator</strong>. <strong>Contributor không</strong> tạo hay xóa được lock.</p>

<h4>Tác dụng phụ hay ra thi (ReadOnly chặn cả request POST)</h4>
<ul>
  <li>ReadOnly trên <strong>storage account</strong> → không <strong>list keys</strong> được (List Keys là POST); người dùng không có key phải dùng Microsoft Entra credential để truy cập blob/queue. Cũng không tạo được blob container qua control plane và không gán RBAC role ở scope storage account.</li>
  <li>ReadOnly trên RG chứa <strong>VM</strong> → không <strong>start / restart</strong> VM được.</li>
  <li>ReadOnly trên RG chứa <strong>App Service plan</strong> → không scale up/out.</li>
  <li>ReadOnly trên RG → không move resource vào/ra RG đó.</li>
  <li>ReadOnly trên <strong>subscription</strong> → Azure Advisor không lưu được kết quả.</li>
  <li>CanNotDelete trên RG → ARM không tự xóa deployment history cũ; khi đạt <strong>800 deployment</strong> thì deployment mới thất bại.</li>
  <li>CanNotDelete trên RG do <strong>Azure Backup</strong> tạo (chứa restore point) → backup có thể lỗi vì không dọn được restore point.</li>
  <li>CanNotDelete trên resource / RG → không xóa được role assignment ở đó.</li>
</ul>

<h4>Lệnh</h4>
<pre><code># Azure CLI
az lock create --name lock-rg --lock-type CanNotDelete --resource-group rg-prod
az lock create --name lock-sa --lock-type ReadOnly -g rg-prod --resource-name stprod01 --resource-type Microsoft.Storage/storageAccounts
az lock list --resource-group rg-prod -o table
az lock delete --name lock-rg --resource-group rg-prod

# Azure PowerShell
New-AzResourceLock -LockName lock-rg -LockLevel CanNotDelete -ResourceGroupName rg-prod
Get-AzResourceLock -ResourceGroupName rg-prod
Remove-AzResourceLock -LockName lock-rg -ResourceGroupName rg-prod</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>"Ngăn xóa nhầm nhưng vẫn cho đổi cấu hình" → <strong>CanNotDelete</strong>. "Người dùng có Owner không xóa được resource" → kiểm tra <strong>lock</strong>. Ứng dụng lấy connection string bằng account key bị lỗi sau khi đặt ReadOnly lên storage account → do lock chặn <strong>list keys</strong>.</div>
`
    },
    {
      id: 'tags',
      extra: true,
      title: 'Tags và kế thừa tag',
      html: `
<p><strong>Tag</strong> là cặp <code>tên = giá trị</code> gắn lên resource, resource group, subscription để phân loại (môi trường, cost center, chủ sở hữu…) và nhóm chi phí trong Cost Management.</p>

<h4>Giới hạn và quy tắc</h4>
<table>
  <thead><tr><th>Quy tắc</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Số tag mỗi resource / RG / subscription</td><td><strong>50</strong> cặp (cần thêm thì dùng chuỗi JSON làm value)</td></tr>
    <tr><td>Độ dài tên / giá trị</td><td>512 / 256 ký tự (storage account: tên 128)</td></tr>
    <tr><td>Ký tự cấm trong tên</td><td><code>&lt; &gt; % &amp; \\ ? /</code></td></tr>
    <tr><td>Phân biệt hoa thường</td><td>Tên tag <strong>không</strong> phân biệt khi thao tác; giá trị <strong>có</strong> phân biệt</td></tr>
    <tr><td>Management group</td><td><strong>Không</strong> gắn tag được</td></tr>
    <tr><td>Resource classic</td><td>Không hỗ trợ tag</td></tr>
  </tbody>
</table>
<p>Một số dịch vụ chỉ hỗ trợ 15 tag (vd. Azure Automation, Azure CDN, bản ghi Azure DNS). Tag lưu dạng văn bản thường: <strong>không</strong> đặt dữ liệu nhạy cảm.</p>

<h4>Tag KHÔNG kế thừa</h4>
<p>Resource <strong>không</strong> tự nhận tag của resource group hoặc subscription. Muốn kế thừa, dùng <strong>Azure Policy</strong> (built-in):</p>
<table>
  <thead><tr><th>Built-in policy</th><th>Effect</th><th>Tác dụng</th></tr></thead>
  <tbody>
    <tr><td>Require a tag on resources / on resource groups</td><td>Deny</td><td>Chặn tạo nếu thiếu tag</td></tr>
    <tr><td>Add a tag to resources</td><td>Modify</td><td>Thêm tag với giá trị mặc định nếu thiếu</td></tr>
    <tr><td>Add or replace a tag on resources</td><td>Modify</td><td>Thêm hoặc ghi đè giá trị</td></tr>
    <tr><td>Inherit a tag from the resource group if missing</td><td>Modify</td><td>Sao tag của RG xuống resource nếu resource chưa có</td></tr>
    <tr><td>Inherit a tag from the subscription if missing</td><td>Modify</td><td>Sao tag của subscription xuống resource</td></tr>
  </tbody>
</table>
<p>Các policy Modify cần managed identity (role Contributor / Tag Contributor) và <strong>remediation task</strong> để gắn tag cho resource đã tồn tại.</p>

<h4>Quyền</h4>
<ul>
  <li><strong>Tag Contributor</strong>: quản lý tag trên mọi entity mà không có quyền với chính resource.</li>
  <li><strong>Contributor</strong> (hoặc contributor của loại resource): ghi được resource nên cũng gắn được tag.</li>
</ul>

<h4>Lệnh (chú ý merge vs replace)</h4>
<pre><code># Azure CLI
az tag update --resource-id &lt;id&gt; --operation Merge --tags env=prod costcenter=1001   # giữ tag cũ
az tag update --resource-id &lt;id&gt; --operation Replace --tags env=prod                 # xóa tag khác
az tag update --resource-id &lt;id&gt; --operation Delete --tags costcenter=1001
az group update -n rg-app --tags env=prod dept=it      # thay toàn bộ tag của RG
az resource list --tag env=prod -o table

# Azure PowerShell
Update-AzTag -ResourceId $id -Tag @{env='prod'} -Operation Merge
New-AzTag -ResourceId $id -Tag @{env='prod'}             # ghi đè toàn bộ
Get-AzResource -TagName env -TagValue prod</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>"Gắn tag cho RG rồi, báo cáo chi phí theo tag vẫn thiếu resource" → tag <strong>không kế thừa</strong>; dùng policy <em>Inherit a tag from the resource group</em> + remediation. Lệnh "replace" sẽ <strong>xóa</strong> các tag không được liệt kê.</div>
`
    },
    {
      id: 'cost-advisor',
      extra: true,
      title: 'Cost Management, budgets và Azure Advisor',
      html: `
<h4>Microsoft Cost Management</h4>
<ul>
  <li><strong>Cost analysis</strong>: xem chi phí theo scope (MG, subscription, RG, billing account), nhóm theo service, location, resource, <strong>tag</strong>.</li>
  <li><strong>Exports</strong>: xuất dữ liệu chi phí định kỳ (ngày/tuần/tháng) vào storage account.</li>
  <li><strong>Cost alerts</strong>: budget alert, credit alert, department spending quota alert (EA), anomaly alert.</li>
  <li>Dữ liệu chi phí thường có sẵn sau 8–24 giờ; budget được đánh giá so với dữ liệu này mỗi 24 giờ, và email cảnh báo thường được gửi trong vòng 1 giờ sau lần đánh giá, nên alert <strong>không</strong> tức thời.</li>
</ul>

<h4>Budgets</h4>
<ul>
  <li>Tạo ở scope MG, subscription, RG (và các billing scope). Có thể lọc theo RG, resource, service, <strong>tag</strong>.</li>
  <li>Chu kỳ reset: Monthly, Quarterly, Annually (một số loại hợp đồng có thêm theo billing period). Có ngày bắt đầu / hết hạn.</li>
  <li>Điều kiện cảnh báo theo % ngưỡng của chi phí <strong>Actual</strong> (thực tế) hoặc <strong>Forecasted</strong> (dự báo).</li>
  <li>Khi chạm ngưỡng: gửi email và/hoặc kích hoạt <strong>action group</strong> (gọi Automation runbook, Logic App, Function, webhook) để tự động hành động, ví dụ deallocate VM dev.</li>
  <li><strong>Budget không tự dừng resource</strong>. Muốn dừng phải tự động hóa qua action group.</li>
</ul>
<pre><code>az consumption budget create --budget-name bud-dev --amount 500 \\
  --category cost --time-grain monthly \\
  --start-date 2026-12-01 --end-date 2027-11-30 --resource-group rg-dev
New-AzConsumptionBudget -Name bud-dev -Amount 500 -Category Cost -TimeGrain Monthly -StartDate 2026-12-01 -ResourceGroupName rg-dev</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo budget tháng cho resource group</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở resource group rồi chọn Budgets (hoặc vào Cost Management và đổi scope bằng nút <em>Scope</em>):<br><span class="path">Azure portal › Resource groups › rg-dev › Cost Management › Budgets › + Add</span></li>
    <li>Bước <strong>Create a budget</strong>: kiểm tra scope, thêm filter nếu cần (vd. theo tag <code>env</code>), điền chi tiết:
      <div class="blade">
        <div class="blade-title">Create budget</div>
        <div class="blade-tabs"><span class="on">Create a budget</span><span>Set alerts</span></div>
        <div class="pf"><label>Scope</label><span class="pv">rg-dev</span></div>
        <div class="blade-sec">Budget Details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">bud-rg-dev</span></div>
        <div class="pf"><label class="req">Reset period</label><span class="pv sel">Monthly</span></div>
        <div class="pf"><label class="req">Creation date</label><span class="pv">2026-12-01</span></div>
        <div class="pf"><label class="req">Expiration date</label><span class="pv">2027-11-30</span></div>
        <div class="blade-sec">Budget Amount</div>
        <div class="pf"><label class="req">Amount ($)</label><span class="pv">500</span></div>
        <div class="pbtns"><span class="pbtn primary">Next</span></div>
      </div>
    </li>
    <li>Bước <strong>Set alerts</strong>: thêm điều kiện cảnh báo (tối đa 5 ngưỡng và 5 email):
      <div class="blade">
        <div class="blade-title">Set alerts</div>
        <div class="blade-sec">Alert conditions</div>
        <div class="pf"><label>Type</label><span class="pv sel">Actual</span></div>
        <div class="pf"><label>% of budget</label><span class="pv">90</span></div>
        <div class="pf"><label>Type</label><span class="pv sel">Forecasted</span></div>
        <div class="pf"><label>% of budget</label><span class="pv">100</span></div>
        <div class="pf"><label>Action group</label><span class="pv sel">ag-stop-dev-vms</span></div>
        <div class="blade-sec">Alert recipients (email)</div>
        <div class="pf"><label class="req">Email</label><span class="pv">finops@contoso.com</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span><span class="pbtn">Previous</span></div>
      </div>
    </li>
    <li>Budget chỉ <strong>cảnh báo</strong>. Muốn tự động deallocate VM khi vượt ngưỡng, chọn một <strong>action group</strong> gọi runbook / Logic App (action group chỉ hỗ trợ budget ở scope subscription và resource group).</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m4/budget-set-alerts.png" alt="Bước Set alerts khi tạo budget: hai điều kiện Actual 90% và Forecasted 100%, email nhận cảnh báo và biểu đồ chi phí theo tháng" loading="lazy"><figcaption>Hình 1. Bước <em>Set alerts</em>: mỗi điều kiện chọn <strong>Type</strong> (Actual hoặc Forecasted) và <strong>% of budget</strong>; cột Amount tự tính. Biểu đồ bên phải cho thấy chi phí thực tế, dự báo và các đường ngưỡng. Nguồn: <a href="https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Cách giảm chi phí hay ra thi</h4>
<ul>
  <li><strong>Azure Reservations</strong> (1 hoặc 3 năm) cho VM/SQL chạy ổn định; <strong>Azure savings plan for compute</strong> cho cam kết chi tiêu linh hoạt.</li>
  <li><strong>Azure Hybrid Benefit</strong>: dùng license Windows Server / SQL Server sẵn có.</li>
  <li><strong>Spot VM</strong> cho workload chịu được gián đoạn.</li>
  <li>Deallocate / auto-shutdown VM dev; right-size VM ít dùng; xóa disk và public IP mồ côi.</li>
  <li><strong>Pricing calculator</strong> ước tính chi phí trước khi triển khai; <strong>TCO calculator</strong> so sánh on-premises với Azure.</li>
</ul>

<h4>Azure Advisor</h4>
<p>Dịch vụ <strong>miễn phí</strong> phân tích cấu hình và telemetry để đưa khuyến nghị theo <strong>5 nhóm</strong> (theo Well-Architected Framework):</p>
<table>
  <thead><tr><th>Nhóm</th><th>Ví dụ khuyến nghị</th></tr></thead>
  <tbody>
    <tr><td>Cost</td><td>Right-size / shutdown VM sử dụng thấp, mua reservation</td></tr>
    <tr><td>Security</td><td>Tích hợp khuyến nghị của Microsoft Defender for Cloud</td></tr>
    <tr><td>Reliability</td><td>Bật backup, dùng availability zone, bật soft delete</td></tr>
    <tr><td>Operational excellence</td><td>Thực hành vận hành, Service Health alert</td></tr>
    <tr><td>Performance</td><td>Nâng cấp disk, tối ưu cấu hình</td></tr>
  </tbody>
</table>
<ul>
  <li><strong>Advisor score</strong> tổng hợp mức độ tối ưu; có thể tạo <strong>Advisor alert</strong> và gửi digest định kỳ.</li>
  <li>Có thể cấu hình ngưỡng CPU cho khuyến nghị "VM ít dùng" và giới hạn subscription/RG được phân tích.</li>
  <li>Advisor <strong>chỉ khuyến nghị</strong>, không tự sửa (một số khuyến nghị có "Quick Fix").</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Nhận email khi chi phí RG dự báo vượt 80% hạn mức tháng" → <strong>budget</strong> với alert Forecasted 80%. "Tự động tắt VM khi vượt budget" → budget + <strong>action group</strong> gọi runbook. "Tìm VM chạy dưới công suất để tiết kiệm" → <strong>Azure Advisor (Cost)</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Thứ tự đánh giá effect: <strong>Disabled → Append/Modify → Deny → Audit → (Manual, AuditIfNotExists) → DenyAction</strong>; sau khi resource provider trả về thành công thì <strong>AuditIfNotExists / DeployIfNotExists</strong> chạy.',
    'Chỉ <strong>Modify</strong> và <strong>DeployIfNotExists</strong> có remediation; assignment cần <strong>managed identity</strong>; resource cũ cần <strong>remediation task</strong> (≤ 50.000 resource/task).',
    'Đánh giá compliance: gán mới ~<strong>5 phút</strong> để áp dụng; resource tạo/cập nhật ~<strong>15 phút</strong>; chu kỳ chuẩn <strong>mỗi 24 giờ</strong>; scan thủ công <code>az policy state trigger-scan</code> / <code>Start-AzPolicyComplianceScan</code>.',
    'Policy là "explicit deny", kết quả cộng dồn hạn chế nhất; muốn nới lỏng ở scope con phải <strong>exclude</strong> hoặc <strong>exemption</strong>.',
    'Giới hạn policy: 500 definition, 200 initiative, 200 assignment mỗi scope; 1.000 policy mỗi initiative; 400 notScopes mỗi assignment.',
    'Lock: <strong>CanNotDelete</strong> (sửa được, không xóa) và <strong>ReadOnly</strong> (như Reader); kế thừa xuống; áp cho cả Owner; chỉ chặn control plane.',
    'Tạo/xóa lock cần <code>Microsoft.Authorization/locks/*</code>: <strong>Owner</strong> hoặc <strong>User Access Administrator</strong>; Contributor không làm được.',
    'ReadOnly trên storage account chặn <strong>list keys</strong>; ReadOnly trên RG chặn start/restart VM và scale App Service plan.',
    'Tag: tối đa <strong>50</strong> cặp mỗi resource/RG/subscription; tên 512, giá trị 256 ký tự; <strong>không kế thừa</strong>; không gắn được cho management group.',
    'Budget chỉ cảnh báo (Actual hoặc Forecasted), <strong>không tự dừng resource</strong>; dùng action group để tự động hóa. Advisor có 5 nhóm: Cost, Security, Reliability, Operational excellence, Performance.'
  ],
  traps: [
    'Nghĩ policy Deny sẽ xóa resource đang vi phạm. Sai: resource cũ chỉ bị đánh dấu <strong>non-compliant</strong>.',
    'Gán policy DeployIfNotExists/Modify rồi chờ resource cũ tự được sửa. Phải tạo <strong>remediation task</strong>.',
    'Gán policy "dễ dãi" ở subscription để vượt qua policy Deny ở management group. Không được: phải exclude subscription khỏi assignment ở MG.',
    'Cho rằng Contributor gỡ được resource lock. Chỉ Owner / User Access Administrator (hoặc role có <code>Microsoft.Authorization/locks/*</code>).',
    'Nghĩ lock trên storage account bảo vệ dữ liệu blob. Lock chỉ chặn control plane; dùng soft delete / immutability để bảo vệ dữ liệu.',
    'Nghĩ tag của resource group tự áp xuống resource. Tag <strong>không kế thừa</strong>, cần policy Modify.',
    'Kỳ vọng budget tự tắt VM khi vượt hạn mức. Budget chỉ gửi alert; tự động hóa cần action group + runbook / Logic App.',
    'Dùng Audit khi đề yêu cầu "ngăn chặn". Audit chỉ ghi log; "ngăn chặn" là Deny (hoặc DenyAction cho thao tác xóa).'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Nhu cầu</th><th>Giải pháp</th></tr></thead>
  <tbody>
    <tr><td>Chặn resource sai cấu hình</td><td>Policy <strong>Deny</strong></td></tr>
    <tr><td>Chỉ báo cáo</td><td>Policy <strong>Audit</strong> / AuditIfNotExists</td></tr>
    <tr><td>Tự sửa tag / thuộc tính</td><td>Policy <strong>Modify</strong> + managed identity + remediation</td></tr>
    <tr><td>Tự triển khai extension / diagnostic</td><td>Policy <strong>DeployIfNotExists</strong> + remediation</td></tr>
    <tr><td>Chặn xóa (policy)</td><td><strong>DenyAction</strong></td></tr>
    <tr><td>Chặn xóa (mọi user)</td><td>Lock <strong>CanNotDelete</strong></td></tr>
    <tr><td>Đóng băng cấu hình</td><td>Lock <strong>ReadOnly</strong> (coi chừng list keys, start VM)</td></tr>
    <tr><td>Kế thừa tag</td><td>Policy <em>Inherit a tag from the resource group / subscription</em></td></tr>
    <tr><td>Cảnh báo chi phí</td><td>Budget (Actual / Forecasted) + action group</td></tr>
    <tr><td>Khuyến nghị tối ưu</td><td>Azure Advisor (5 nhóm)</td></tr>
    <tr><td>Thời gian đánh giá</td><td>Gán ~5 phút · resource ~15 phút · chu kỳ 24 giờ · trigger-scan</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Initiative là gì?', back: 'Một <strong>policySetDefinition</strong>: nhóm nhiều policy definition phục vụ một mục tiêu, gán như một đơn vị.' },
    { front: 'Exclusion khác exemption thế nào?', back: '<strong>Exclusion</strong> (notScopes) là thuộc tính của assignment, scope bị loại hoàn toàn. <strong>Exemption</strong> là đối tượng riêng có category Waiver/Mitigated, ngày hết hạn; resource hiện trạng thái <em>Exempt</em>.' },
    { front: 'Effect nào hỗ trợ remediation task?', back: '<strong>Modify</strong> và <strong>DeployIfNotExists</strong>.' },
    { front: 'Assignment có Modify/DINE cần thêm gì?', back: 'Một <strong>managed identity</strong> (system- hoặc user-assigned) được cấp các role trong <code>roleDefinitionIds</code>.' },
    { front: 'Thứ tự đánh giá effect?', back: 'Disabled → Append/Modify → Deny → Audit → AuditIfNotExists → DenyAction; sau khi provider thành công: AuditIfNotExists/DeployIfNotExists.' },
    { front: 'Chu kỳ compliance chuẩn của Azure Policy?', back: '<strong>Mỗi 24 giờ</strong>. Gán mới cần khoảng 5 phút để áp dụng; resource tạo/cập nhật có kết quả sau khoảng 15 phút.' },
    { front: 'Lệnh chạy compliance scan thủ công?', back: '<code>az policy state trigger-scan</code> hoặc <code>Start-AzPolicyComplianceScan</code>.' },
    { front: 'enforcementMode DoNotEnforce dùng để làm gì?', back: 'Đánh giá compliance mà <strong>không</strong> chặn hay sửa resource; thử nghiệm tác động trước khi bật thật.' },
    { front: 'mode Indexed khác All thế nào?', back: '<strong>Indexed</strong> chỉ đánh giá resource type hỗ trợ tag và location (dùng cho policy tag/location). <strong>All</strong> đánh giá mọi type, kể cả RG và subscription.' },
    { front: 'CanNotDelete vs ReadOnly?', back: '<strong>CanNotDelete</strong>: sửa được, không xóa. <strong>ReadOnly</strong>: không sửa, không xóa (như Reader).' },
    { front: 'Ai tạo/xóa được resource lock?', back: '<strong>Owner</strong> và <strong>User Access Administrator</strong> (quyền <code>Microsoft.Authorization/locks/*</code>). Contributor không.' },
    { front: 'ReadOnly lock trên storage account gây ra gì?', back: 'Không <strong>list account keys</strong> được (POST bị chặn), không tạo container qua control plane, không gán RBAC ở scope đó.' },
    { front: 'Giới hạn tag?', back: '<strong>50</strong> cặp mỗi resource/RG/subscription; tên 512 ký tự (storage 128), giá trị 256 ký tự.' },
    { front: 'Tag có kế thừa từ RG xuống resource không?', back: '<strong>Không</strong>. Dùng policy <em>Inherit a tag from the resource group</em> (Modify) + remediation.' },
    { front: 'Role chỉ quản lý tag mà không cần quyền trên resource?', back: '<strong>Tag Contributor</strong>.' },
    { front: 'Budget alert dựa trên những loại chi phí nào?', back: '<strong>Actual</strong> (thực tế) và <strong>Forecasted</strong> (dự báo), theo % ngưỡng.' },
    { front: 'Budget có tự dừng resource không?', back: '<strong>Không</strong>. Dùng action group gọi runbook / Logic App để tự động hóa.' },
    { front: '5 nhóm khuyến nghị của Azure Advisor?', back: 'Cost, Security, Reliability, Operational excellence, Performance.' }
  ],
  quiz: [
    {
      q: 'Công ty yêu cầu mọi storage account mới chỉ được dùng SKU Standard_LRS hoặc Standard_ZRS. Các storage account cũ dùng SKU khác phải được liệt kê nhưng không bị ảnh hưởng. Bạn nên dùng gì?',
      options: ['Resource lock ReadOnly trên subscription', 'Custom RBAC role chặn SKU khác', 'Azure Policy Allowed storage account SKUs với effect Deny', 'Azure Advisor'],
      answer: [2],
      explain: 'Policy Deny chặn request tạo storage account với SKU không được phép; storage account cũ chỉ bị đánh dấu non-compliant và hiển thị trong báo cáo compliance, không bị sửa hay xóa. Lock ReadOnly chặn mọi thay đổi. RBAC không lọc theo thuộc tính SKU. Advisor chỉ đưa khuyến nghị.'
    },
    {
      q: 'Bạn gán một policy DeployIfNotExists để bật diagnostic settings cho mọi Key Vault trong subscription. Hai ngày sau, các Key Vault tạo trước khi gán vẫn non-compliant. Bạn cần làm gì?',
      options: ['Tạo remediation task cho assignment', 'Đổi effect sang Audit', 'Chạy <code>az policy state trigger-scan</code> và chờ', 'Xóa và gán lại policy'],
      answer: [0],
      explain: 'DeployIfNotExists chỉ tự triển khai cho resource được tạo/cập nhật sau khi gán. Resource đã tồn tại cần remediation task. Trigger-scan chỉ đánh giá lại trạng thái, không sửa. Đổi sang Audit hay gán lại cũng không triển khai diagnostic settings.'
    },
    {
      q: 'Bạn tạo assignment cho policy built-in "Inherit a tag from the resource group if missing" qua Azure CLI và nhận lỗi. Nguyên nhân có khả năng nhất?',
      options: ['Policy chỉ gán được ở management group', 'Assignment chưa có managed identity (thiếu <code>--mi-system-assigned</code> và <code>--location</code>)', 'Tag không thể kế thừa bằng policy', 'Cần mode All thay vì Indexed'],
      answer: [1],
      explain: 'Policy có effect Modify (hoặc DeployIfNotExists) yêu cầu assignment có managed identity để thực hiện thay đổi; với CLI cần <code>--mi-system-assigned</code> (hoặc user-assigned) và <code>--location</code>. Policy này gán được ở nhiều scope và đúng là cách để kế thừa tag.'
    },
    {
      q: 'Ở management group MG-Corp có policy Allowed locations (Deny) chỉ cho East US. Subscription Sub-EU dưới MG-Corp cần triển khai ở West Europe. Bạn nên làm gì?',
      options: ['Gán thêm policy Allowed locations cho West Europe ở Sub-EU', 'Đặt policy ở Sub-EU với effect Audit', 'Gán Owner cho nhóm EU trên Sub-EU', 'Thêm Sub-EU vào exclusion (hoặc tạo exemption) của assignment ở MG-Corp, rồi gán policy phù hợp cho Sub-EU'],
      answer: [3],
      explain: 'Policy là hệ explicit deny, kết quả cộng dồn hạn chế nhất; policy ở subscription không thể nới lỏng policy Deny được kế thừa từ MG. Phải loại Sub-EU khỏi assignment ở trên. Owner vẫn bị policy chặn.'
    },
    {
      q: 'Một policy có effect Modify (thêm tag) và một policy có effect Deny (yêu cầu tag) cùng áp vào resource group. Người dùng tạo VM không có tag. Thứ tự Azure Policy xử lý là gì?',
      options: ['Deny chạy trước nên VM bị chặn ngay', 'Audit chạy đầu tiên, sau đó Modify', 'Modify chạy trước Deny, nên tag được thêm vào request trước khi Deny kiểm tra', 'Hai policy xung đột nên cả hai bị bỏ qua'],
      answer: [2],
      explain: 'Thứ tự là Disabled, rồi Append/Modify, rồi Deny, rồi Audit. Vì Modify thêm tag vào request trước, điều kiện Deny có thể không còn bị kích hoạt. Không có policy nào bị bỏ qua vì "xung đột" kiểu này.'
    },
    {
      q: 'Bạn vừa gán một initiative ở subscription và muốn thấy kết quả compliance sớm nhất có thể cho RG-App. Bạn nên chạy lệnh nào? (Chọn 2)',
      options: ['<code>az policy state trigger-scan --resource-group RG-App</code>', '<code>az policy remediation create</code>', '<code>Start-AzPolicyComplianceScan -ResourceGroupName RG-App</code>', '<code>az policy assignment update --enforcement-mode Default</code>'],
      answer: [0, 2],
      explain: 'Cả hai lệnh khởi chạy on-demand evaluation scan cho resource group. Remediation create sửa resource, không phải đánh giá. Đổi enforcement mode không kích hoạt scan nhanh hơn.'
    },
    {
      q: 'Bạn cần ngăn mọi người, kể cả Owner, xóa nhầm RG-Prod, nhưng đội vận hành vẫn phải sửa được cấu hình resource trong đó. Giải pháp nào?',
      options: ['Lock ReadOnly trên RG-Prod', 'Lock CanNotDelete trên RG-Prod', 'Gán role Reader cho đội vận hành', 'Policy Audit trên RG-Prod'],
      answer: [1],
      explain: 'CanNotDelete cho phép đọc và sửa nhưng chặn xóa, áp cho mọi user kể cả Owner. ReadOnly chặn cả sửa. Reader không cho sửa. Audit không chặn gì.'
    },
    {
      q: 'Sau khi đặt lock ReadOnly lên storage account ST1, admin không còn xem được access key của ST1 trên Azure portal. Người dùng hỏi liệu ứng dụng có còn đọc/ghi blob được không. Phát biểu nào ĐÚNG? (Chọn 2)',
      options: ['Lock ReadOnly chặn thao tác list keys vì đó là request POST trên control plane', 'Lock ReadOnly chặn mọi thao tác đọc/ghi blob', 'Đọc/ghi blob là thao tác data plane nên không bị lock chặn', 'Chỉ cần đổi lock sang ReadOnly ở resource group là list keys được'],
      answer: [0, 2],
      explain: 'Lock chỉ áp cho control plane; List Keys là POST nên bị ReadOnly chặn. Thao tác dữ liệu blob đi qua endpoint data plane nên không bị ảnh hưởng. Lock ở RG được kế thừa xuống storage account nên vẫn chặn list keys.'
    },
    {
      q: 'Người dùng có role Contributor trên subscription cần gỡ lock CanNotDelete trên một VM để xóa VM. Thao tác gỡ lock thất bại. Vì sao?',
      options: ['Lock chỉ gỡ được bởi Global Administrator', 'Phải xóa VM trước rồi mới gỡ lock', 'Lock trên VM được kế thừa từ management group', 'Contributor không có quyền <code>Microsoft.Authorization/locks/*</code>; cần Owner hoặc User Access Administrator'],
      answer: [3],
      explain: 'Contributor loại trừ các hành động ghi/xóa trong Microsoft.Authorization, nên không quản lý được lock. Owner và User Access Administrator có quyền này. Global Administrator là role Entra, không liên quan trực tiếp. Lock không đặt được ở management group.'
    },
    {
      q: 'Bạn gắn tag CostCenter=1001 cho RG-Finance. Báo cáo Cost analysis nhóm theo tag CostCenter không hiển thị chi phí của các VM trong RG-Finance. Cách khắc phục với ít công sức nhất cho cả resource hiện có và tương lai?',
      options: ['Gán policy "Inherit a tag from the resource group if missing" và chạy remediation task', 'Gắn tag thủ công cho từng VM', 'Di chuyển các VM sang RG mới', 'Đặt lock ReadOnly trên RG-Finance'],
      answer: [0],
      explain: 'Tag không kế thừa. Policy Modify sẽ tự gắn tag cho resource mới; remediation task gắn cho resource hiện có. Gắn thủ công không áp dụng cho resource tương lai. Di chuyển hay lock không thêm tag.'
    },
    {
      q: 'Lệnh nào thêm tag <code>env=prod</code> vào storage account mà KHÔNG xóa các tag hiện có?',
      options: ['<code>az tag update --resource-id $id --operation Replace --tags env=prod</code>', '<code>New-AzTag -ResourceId $id -Tag @{env=\'prod\'}</code>', '<code>az tag update --resource-id $id --operation Merge --tags env=prod</code>', '<code>az tag update --resource-id $id --operation Delete --tags env=prod</code>'],
      answer: [2],
      explain: 'Operation Merge thêm hoặc cập nhật tag mà giữ nguyên tag khác. Replace và <code>New-AzTag</code> ghi đè toàn bộ tập tag. Delete xóa tag được liệt kê.'
    },
    {
      q: 'Bạn cần nhận email khi chi phí dự báo của subscription trong tháng vượt 90% mức 2.000 USD, và tự động deallocate các VM có tag env=dev khi chi phí thực tế vượt 100%. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Budget với alert Forecasted 90% gửi email', 'Azure Advisor alert nhóm Cost', 'Budget alert Actual 100% kích hoạt action group gọi Automation runbook', 'Policy Deny cho VM khi vượt budget'],
      answer: [0, 2],
      explain: 'Budget hỗ trợ alert theo chi phí Forecasted và Actual; action group cho phép gọi runbook để deallocate VM. Advisor đưa khuyến nghị, không theo dõi ngưỡng chi phí. Azure Policy không đánh giá dữ liệu chi phí.'
    },
    {
      q: 'Bạn muốn tìm các VM đang chạy dưới công suất để giảm chi phí, không cần cài thêm công cụ. Bạn dùng dịch vụ nào?',
      options: ['Azure Policy', 'Pricing calculator', 'Microsoft Entra ID', 'Azure Advisor (Cost recommendations)'],
      answer: [3],
      explain: 'Azure Advisor miễn phí, phân tích telemetry sử dụng và khuyến nghị right-size hoặc shutdown VM ít dùng. Pricing calculator chỉ ước tính trước khi triển khai. Policy không phân tích mức sử dụng.'
    },
    {
      q: 'Bạn muốn thử một policy Deny mới trên subscription Production để xem resource nào sẽ bị ảnh hưởng, mà chưa chặn bất kỳ triển khai nào. Cách làm phù hợp nhất?',
      options: ['Gán policy ở một subscription trống', 'Gán policy với enforcementMode DoNotEnforce', 'Gán policy với effect Disabled', 'Tạo exemption cho toàn bộ subscription'],
      answer: [1],
      explain: 'DoNotEnforce vẫn đánh giá và báo cáo compliance nhưng không chặn request. Disabled thì không đánh giá gì. Exemption làm resource thành Exempt nên không thấy được tác động. Subscription trống không có resource để đánh giá.'
    }
  ]
});

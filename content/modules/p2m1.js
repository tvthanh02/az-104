AZ.addModule({
  id: 'p2m1',
  summary: '<strong>Microsoft Entra ID</strong> (trước đây là Azure Active Directory) là dịch vụ quản lý danh tính và truy cập trên cloud của Microsoft, nền tảng xác thực cho Azure, Microsoft 365 và hàng nghìn ứng dụng SaaS. Đề AZ-104 thường hỏi điểm khác nhau giữa Entra ID và AD DS, tính năng nào cần bản <strong>P1</strong> hay <strong>P2</strong>, khi nào dùng <strong>Microsoft Entra Domain Services</strong>, và quan hệ giữa tenant với subscription.',
  objectives: [
    'Mô tả Microsoft Entra ID và các khả năng chính: xác thực, SSO, quản lý ứng dụng, thiết bị, danh tính hybrid',
    'So sánh Microsoft Entra ID với Active Directory Domain Services (giao thức, cấu trúc, cách quản lý)',
    'Phân biệt app registration, enterprise application và các kiểu single sign-on',
    'Xác định tính năng thuộc Free, P1, P2 và Microsoft Entra ID Governance',
    'Giải thích Microsoft Entra Domain Services: dùng khi nào, SKU, giới hạn quản trị',
    'Hiểu quan hệ tenant – directory – subscription và hệ quả khi chuyển subscription sang tenant khác'
  ],
  sections: [
    {
      id: 'examine-entra',
      unit: 'Examine Microsoft Entra ID',
      title: 'Microsoft Entra ID là gì?',
      html: `
<p><strong>Microsoft Entra ID</strong> là dịch vụ <em>Identity as a Service</em> (IDaaS) đa tenant, chạy toàn cầu trên cloud. Nó lưu danh tính (user, group, device, application, service principal) và cấp token để các danh tính đó truy cập tài nguyên: Azure portal, Microsoft 365, ứng dụng SaaS, ứng dụng nội bộ.</p>

<h4>Các khả năng chính</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Ví dụ tính năng</th></tr></thead>
  <tbody>
    <tr><td>Xác thực</td><td>Đăng nhập một lần (SSO), Microsoft Entra multifactor authentication (MFA), passwordless (Windows Hello for Business, FIDO2, Microsoft Authenticator), self-service password reset (SSPR), smart lockout</td></tr>
    <tr><td>Quản lý ứng dụng</td><td>App gallery, app registration, application proxy cho web app nội bộ, My Apps portal</td></tr>
    <tr><td>Kiểm soát truy cập</td><td>Conditional Access, Microsoft Entra roles, administrative units</td></tr>
    <tr><td>Bảo vệ danh tính</td><td>Microsoft Entra ID Protection (phát hiện rủi ro đăng nhập/người dùng)</td></tr>
    <tr><td>Quản trị danh tính</td><td>Privileged Identity Management (PIM), access reviews, entitlement management</td></tr>
    <tr><td>Danh tính hybrid</td><td>Microsoft Entra Connect Sync, Microsoft Entra Cloud Sync: đồng bộ từ AD DS on-premises</td></tr>
    <tr><td>Thiết bị</td><td>Microsoft Entra registered / joined / hybrid joined, tích hợp Intune</td></tr>
    <tr><td>Cộng tác bên ngoài</td><td>B2B collaboration (guest), Microsoft Entra External ID</td></tr>
  </tbody>
</table>

<h4>Họ sản phẩm Microsoft Entra</h4>
<p>"Microsoft Entra" là tên họ sản phẩm; <strong>Microsoft Entra ID</strong> là dịch vụ danh tính cốt lõi. Các sản phẩm khác: Microsoft Entra ID Governance, Microsoft Entra External ID, Microsoft Entra Verified ID, Microsoft Entra Workload ID, Microsoft Entra Private Access, Microsoft Entra Internet Access. Trang quản trị chính là <strong>Microsoft Entra admin center</strong> (<code>entra.microsoft.com</code>); Azure portal vẫn có trang Microsoft Entra ID.</p>

<h4>Thuật ngữ cần nắm</h4>
<ul>
  <li><strong>Identity</strong>: đối tượng có thể được xác thực (user, application, service principal, managed identity, device).</li>
  <li><strong>Account</strong>: identity kèm dữ liệu thuộc tính (tên, email, phòng ban…).</li>
  <li><strong>Tenant</strong> (= <strong>directory</strong>): một phiên bản Entra ID riêng của một tổ chức, có domain mặc định <code>&lt;tên&gt;.onmicrosoft.com</code>.</li>
  <li><strong>Microsoft Entra roles</strong> (Global Administrator, User Administrator…) quản lý <em>đối tượng trong directory</em>; khác với <strong>Azure RBAC roles</strong> (Owner, Contributor…) quản lý <em>tài nguyên Azure</em>.</li>
</ul>

<h4>Giới hạn dịch vụ đáng nhớ</h4>
<ul>
  <li>Bản Free: tối đa <strong>50.000 đối tượng</strong> mỗi tenant; tenant có ít nhất một <strong>verified domain</strong> được nâng lên <strong>300.000</strong>.</li>
  <li>Người dùng không phải admin tạo được tối đa <strong>250</strong> đối tượng (tính cả đối tượng đã xóa còn khôi phục được).</li>
  <li>Một user có thể thuộc tối đa <strong>500 tenant</strong> (member hoặc guest); tạo tối đa <strong>200 tenant</strong>.</li>
  <li>Tối đa <strong>5.000</strong> managed domain name mỗi tenant.</li>
</ul>

<h4>Công cụ quản trị</h4>
<pre><code># Microsoft Graph PowerShell (module MSOnline và AzureAD đã ngừng hỗ trợ)
Connect-MgGraph -Scopes "User.Read.All","Group.Read.All"
Get-MgUser -Top 10
Get-MgOrganization | Select-Object DisplayName, VerifiedDomains

# Azure CLI
az ad user list --query "[].userPrincipalName" -o tsv
az ad signed-in-user show</code></pre>
<div class="callout exam"><strong>Góc thi</strong>Đề dùng tên mới <em>Microsoft Entra ID</em> nhưng tài liệu cũ vẫn ghi Azure AD; hai tên là một sản phẩm. Câu hỏi về "ai được quản lý user/group" thường xoay quanh Microsoft Entra roles, còn "ai được tạo VM" là Azure RBAC.</div>
`
    },
    {
      id: 'entra-vs-adds',
      unit: 'Compare Microsoft Entra ID and Active Directory Domain Services',
      title: 'So sánh Microsoft Entra ID và AD DS',
      html: `
<p><strong>Active Directory Domain Services (AD DS)</strong> là dịch vụ thư mục truyền thống chạy trên Windows Server (domain controller). Entra ID <strong>không phải</strong> "AD DS trên cloud": hai dịch vụ thiết kế cho hai môi trường khác nhau.</p>
<table>
  <thead><tr><th>Tiêu chí</th><th>AD DS (on-premises)</th><th>Microsoft Entra ID</th></tr></thead>
  <tbody>
    <tr><td>Giao thức xác thực</td><td>Kerberos, NTLM</td><td>OpenID Connect, OAuth 2.0, SAML 2.0, WS-Federation qua HTTPS</td></tr>
    <tr><td>Truy vấn thư mục</td><td>LDAP</td><td>Microsoft Graph (REST API qua HTTPS)</td></tr>
    <tr><td>Cấu trúc</td><td>Phân cấp: forest, domain, tree, <strong>OU</strong>, trust</td><td><strong>Phẳng</strong>: không có OU, không có forest/domain theo nghĩa AD; nhóm logic bằng group và administrative unit</td></tr>
    <tr><td>Quản lý cấu hình</td><td><strong>Group Policy (GPO)</strong></td><td>Không có GPO; dùng Microsoft Intune và Conditional Access</td></tr>
    <tr><td>Máy tính</td><td>Domain join, computer object</td><td>Microsoft Entra join / registration, quản lý bằng Intune</td></tr>
    <tr><td>Hạ tầng</td><td>Bạn tự vận hành domain controller</td><td>Dịch vụ do Microsoft vận hành, đa tenant</td></tr>
    <tr><td>Cộng tác bên ngoài</td><td>Trust giữa các forest</td><td>B2B collaboration, federation, cross-tenant access settings</td></tr>
  </tbody>
</table>

<h4>Danh tính hybrid</h4>
<p>Đa số doanh nghiệp có cả hai. User được tạo trong AD DS rồi đồng bộ lên Entra ID bằng:</p>
<ul>
  <li><strong>Microsoft Entra Connect Sync</strong>: agent cài trên Windows Server on-premises, nhiều tùy chọn (password writeback, device writeback, lọc theo OU, hybrid join).</li>
  <li><strong>Microsoft Entra Cloud Sync</strong>: agent nhẹ, cấu hình nằm trên cloud, hỗ trợ nhiều forest bị ngắt kết nối; một số tính năng nâng cao vẫn chỉ có ở Connect Sync.</li>
</ul>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 260" role="img" aria-label="AD DS on-premises có cấu trúc phân cấp forest, domain, OU, dùng Kerberos, LDAP, GPO; Entra Connect đồng bộ lên Microsoft Entra ID có cấu trúc phẳng, dùng OIDC, SAML, Graph và cấp SSO cho Microsoft 365, Azure, SaaS">
  <rect class="zone" x="10" y="20" width="230" height="220" rx="12"/>
  <text x="125" y="42" text-anchor="middle" class="t-sm t-mute">On-premises</text>
  <rect class="box" x="30" y="56" width="190" height="168" rx="10"/>
  <text x="125" y="80" text-anchor="middle" class="t-b">AD DS</text>
  <rect class="box-w" x="85" y="92" width="80" height="26" rx="6"/>
  <text x="125" y="110" text-anchor="middle" class="t-sm">Forest</text>
  <rect class="box-w" x="85" y="130" width="80" height="26" rx="6"/>
  <text x="125" y="148" text-anchor="middle" class="t-sm">Domain</text>
  <rect class="box-w" x="85" y="168" width="80" height="26" rx="6"/>
  <text x="125" y="186" text-anchor="middle" class="t-sm">OU</text>
  <line class="ln" x1="125" y1="118" x2="125" y2="130"/>
  <line class="ln" x1="125" y1="156" x2="125" y2="168"/>
  <text x="125" y="212" text-anchor="middle" class="t-sm t-mute">Kerberos · LDAP · GPO</text>

  <rect class="box-e" x="280" y="95" width="160" height="70" rx="10"/>
  <text x="360" y="124" text-anchor="middle" class="t-b">Entra Connect</text>
  <text x="360" y="144" text-anchor="middle" class="t-sm t-mute">Sync / Cloud Sync</text>
  <text x="360" y="82" text-anchor="middle" class="t-sm">đồng bộ user, group</text>
  <text x="360" y="185" text-anchor="middle" class="t-sm t-mute">PHS / PTA / Federation</text>
  <line class="ln-a" x1="220" y1="130" x2="276" y2="130" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="440" y1="130" x2="501" y2="130" marker-end="url(#arr-a)"/>

  <rect class="zone" x="490" y="20" width="220" height="220" rx="12"/>
  <text x="600" y="42" text-anchor="middle" class="t-sm t-mute">Cloud</text>
  <rect class="box-a" x="505" y="56" width="190" height="94" rx="10"/>
  <text x="600" y="82" text-anchor="middle" class="t-b t-a">Microsoft Entra ID</text>
  <text x="600" y="104" text-anchor="middle" class="t-sm">phẳng: user, group, AU</text>
  <text x="600" y="126" text-anchor="middle" class="t-sm t-mute">OIDC · SAML · Graph</text>
  <rect class="box-s" x="510" y="180" width="55" height="40" rx="8"/>
  <text x="537" y="205" text-anchor="middle" class="t-sm">M365</text>
  <rect class="box-s" x="572" y="180" width="56" height="40" rx="8"/>
  <text x="600" y="205" text-anchor="middle" class="t-sm">Azure</text>
  <rect class="box-s" x="635" y="180" width="55" height="40" rx="8"/>
  <text x="662" y="205" text-anchor="middle" class="t-sm">SaaS</text>
  <line class="ln-s" x1="537" y1="150" x2="537" y2="176" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="600" y1="150" x2="600" y2="176" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="662" y1="150" x2="662" y2="176" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. AD DS phân cấp (forest › domain › OU) và nói Kerberos/LDAP; Entra ID phẳng và nói giao thức web. Microsoft Entra Connect Sync hoặc Cloud Sync đồng bộ user, group từ AD DS lên Entra ID (AD DS là nguồn quản lý; chỉ một số dữ liệu như mật khẩu được <em>writeback</em> ngược lại nếu bật); phương thức đăng nhập (PHS, PTA, federation) quyết định nơi mật khẩu được kiểm tra.</figcaption>
</figure>

<p>Phương thức đăng nhập của user đồng bộ:</p>
<table>
  <thead><tr><th>Phương thức</th><th>Cách hoạt động</th><th>Lưu ý</th></tr></thead>
  <tbody>
    <tr><td>Password hash synchronization (PHS)</td><td>Đồng bộ hash của hash mật khẩu lên Entra ID; Entra ID tự xác thực</td><td>Đơn giản nhất, vẫn đăng nhập được khi on-prem gặp sự cố; cần cho leaked credential detection</td></tr>
    <tr><td>Pass-through authentication (PTA)</td><td>Entra ID chuyển yêu cầu xác thực tới agent on-premises</td><td>Mật khẩu không rời khỏi on-prem; phụ thuộc agent hoạt động</td></tr>
    <tr><td>Federation (AD FS)</td><td>Entra ID chuyển hướng tới hệ thống federation</td><td>Phức tạp nhất, dùng khi cần yêu cầu đặc biệt (smart card on-prem…)</td></tr>
  </tbody>
</table>
<div class="callout note"><strong>Nguồn quản lý (source of authority)</strong>User đồng bộ từ AD DS phải được sửa ở AD DS; phần lớn thuộc tính bị khóa trên Entra ID. Xóa user đồng bộ trong Entra ID mà user vẫn còn on-prem thì chu kỳ đồng bộ kế tiếp có thể tạo lại.</div>
<div class="callout exam"><strong>Góc thi</strong>Ứng dụng cũ cần <strong>LDAP, Kerberos, NTLM hoặc Group Policy</strong> thì Entra ID một mình không đáp ứng được. Phương án là Microsoft Entra Domain Services (managed) hoặc tự dựng domain controller trên VM Azure. Đừng chọn "tạo OU trong Entra ID" vì Entra ID không có OU.</div>
`
    },
    {
      id: 'cloud-apps',
      unit: 'Examine Microsoft Entra ID as a directory service for cloud apps',
      title: 'Entra ID làm dịch vụ danh tính cho ứng dụng cloud',
      html: `
<p>Entra ID là identity provider cho ứng dụng của Microsoft (Microsoft 365, Azure), hàng nghìn ứng dụng SaaS trong <strong>app gallery</strong> (Salesforce, ServiceNow, Dropbox…) và ứng dụng do tổ chức tự phát triển.</p>

<h4>App registration và enterprise application</h4>
<div class="compare">
  <div><strong>App registration (application object)</strong>Định nghĩa "toàn cục" của ứng dụng: client ID, redirect URI, secret/certificate, API permissions. Tạo trong tenant <em>chủ quản</em> của ứng dụng.</div>
  <div><strong>Enterprise application (service principal)</strong>Bản thể hiện cục bộ của ứng dụng trong <em>mỗi</em> tenant sử dụng nó. Nơi cấu hình SSO, gán user/group, consent, Conditional Access.</div>
</div>
<p>Ứng dụng <strong>multi-tenant</strong> có một application object ở tenant gốc và một service principal ở mỗi tenant đã consent. <strong>Managed identity</strong> cũng là một dạng service principal do Azure tự quản lý credential.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 230" role="img" aria-label="Ứng dụng multi-tenant: một application object ở tenant chủ quản, mỗi tenant sử dụng có một service principal riêng">
  <rect class="zone" x="10" y="20" width="420" height="160" rx="12"/>
  <text x="220" y="42" text-anchor="middle" class="t-sm t-mute">Tenant A (tenant chủ quản)</text>
  <rect class="box-a" x="30" y="62" width="180" height="78" rx="10"/>
  <text x="120" y="88" text-anchor="middle" class="t-b">App registration</text>
  <text x="120" y="108" text-anchor="middle" class="t-sm t-mute">application object</text>
  <text x="120" y="126" text-anchor="middle" class="t-sm t-mute">client ID · secret · URI</text>
  <rect class="box-s" x="255" y="62" width="160" height="78" rx="10"/>
  <text x="335" y="88" text-anchor="middle" class="t-b">Enterprise app</text>
  <text x="335" y="108" text-anchor="middle" class="t-sm t-mute">service principal</text>
  <text x="335" y="126" text-anchor="middle" class="t-sm t-mute">SSO · gán user · consent</text>

  <rect class="zone" x="470" y="20" width="240" height="160" rx="12"/>
  <text x="590" y="42" text-anchor="middle" class="t-sm t-mute">Tenant B (đã consent)</text>
  <rect class="box-s" x="505" y="62" width="170" height="78" rx="10"/>
  <text x="590" y="88" text-anchor="middle" class="t-b">Enterprise app</text>
  <text x="590" y="108" text-anchor="middle" class="t-sm t-mute">service principal</text>
  <text x="590" y="126" text-anchor="middle" class="t-sm t-mute">SSO · gán user · consent</text>

  <line class="ln-a" x1="210" y1="101" x2="251" y2="101" marker-end="url(#arr-a)"/>
  <path class="ln-a dash" d="M120 140 V198 H590 V144" marker-end="url(#arr-a)"/>
  <text x="355" y="218" text-anchor="middle" class="t-sm t-a">tạo từ cùng một application object (cùng client ID)</text>
</svg>
<figcaption>Hình 1. Một ứng dụng multi-tenant chỉ có <strong>một</strong> application object (App registrations) ở tenant chủ quản, nhưng có <strong>một service principal</strong> (Enterprise applications) ở mỗi tenant dùng nó. Cấu hình SSO, gán user và Conditional Access nằm ở service principal của từng tenant.</figcaption>
</figure>

<h4>Các kiểu single sign-on</h4>
<table>
  <thead><tr><th>Kiểu SSO</th><th>Dùng khi</th></tr></thead>
  <tbody>
    <tr><td>OpenID Connect / OAuth 2.0</td><td>Ứng dụng hiện đại, ứng dụng tự phát triển</td></tr>
    <tr><td>SAML 2.0</td><td>Ứng dụng SaaS doanh nghiệp hỗ trợ SAML</td></tr>
    <tr><td>Password-based</td><td>Ứng dụng chỉ có form đăng nhập; Entra ID lưu và tự điền thông tin đăng nhập qua extension trình duyệt</td></tr>
    <tr><td>Linked</td><td>Chỉ đặt đường dẫn tới ứng dụng trên My Apps, SSO do hệ thống khác đảm nhiệm</td></tr>
    <tr><td>Header-based / Integrated Windows Authentication</td><td>Ứng dụng web on-premises, publish qua <strong>Microsoft Entra application proxy</strong> (cần P1)</td></tr>
  </tbody>
</table>

<h4>Quản lý truy cập ứng dụng</h4>
<ul>
  <li><strong>User assignment required</strong>: bật để chỉ user/group được gán mới đăng nhập được ứng dụng. Gán theo group cần bản P1 trở lên.</li>
  <li><strong>Consent</strong>: user hoặc admin đồng ý cấp quyền (API permissions) cho ứng dụng. Admin có thể chặn user tự consent và bật <em>admin consent workflow</em>.</li>
  <li><strong>Automatic provisioning (SCIM)</strong>: tự tạo, cập nhật, vô hiệu hóa tài khoản trong ứng dụng SaaS khi user thay đổi trong Entra ID.</li>
  <li><strong>My Apps</strong> (<code>myapps.microsoft.com</code>): portal cho người dùng thấy và mở các ứng dụng được gán.</li>
</ul>

<h4>Lệnh tham khảo</h4>
<pre><code># Tạo app registration và service principal
az ad app create --display-name "contoso-api"
az ad sp create --id &lt;appId&gt;

# Service principal có quyền RBAC trên resource group (dùng cho CI/CD)
az ad sp create-for-rbac --name sp-deploy --role Contributor \\
  --scopes /subscriptions/&lt;sub-id&gt;/resourceGroups/rg-app</code></pre>
<div class="callout exam"><strong>Góc thi</strong>"Cho phép người dùng truy cập web app nội bộ từ Internet bằng tài khoản Entra ID mà không mở cổng inbound" thì chọn <strong>application proxy</strong>. "Cấu hình SSO cho một app SaaS trong tenant" làm tại <strong>Enterprise applications</strong>, không phải App registrations.</div>
`
    },
    {
      id: 'p1-p2',
      unit: 'Compare Microsoft Entra ID P1 and P2 plans',
      title: 'Các phiên bản: Free, P1, P2 và ID Governance',
      html: `
<p>Microsoft Entra ID cấp phép <strong>theo người dùng</strong>. Bản <strong>Free</strong> đi kèm mọi subscription Microsoft cloud (Azure, Microsoft 365…). <strong>P1</strong> và <strong>P2</strong> mua riêng hoặc nằm trong gói Microsoft 365.</p>

<h4>Ma trận tính năng (mức AZ-104)</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Free</th><th>P1</th><th>P2</th></tr></thead>
  <tbody>
    <tr><td>Quản lý user, group, SSO cơ bản, B2B collaboration</td><td>✔</td><td>✔</td><td>✔</td></tr>
    <tr><td>Security defaults (MFA cơ bản cho toàn tenant)</td><td>✔</td><td>✔</td><td>✔</td></tr>
    <tr><td>Self-service password reset cho user cloud</td><td>✔</td><td>✔</td><td>✔</td></tr>
    <tr><td>Microsoft Entra Connect Sync (đồng bộ)</td><td>✔</td><td>✔</td><td>✔</td></tr>
    <tr><td>Custom security attributes, audit log, sign-in log</td><td>✔</td><td>✔</td><td>✔</td></tr>
    <tr><td><strong>Conditional Access</strong></td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td><strong>Dynamic membership group</strong></td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td><strong>Group-based licensing</strong>, gán ứng dụng theo group</td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td>SSPR với <strong>password writeback</strong> về on-premises</td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td>Application proxy, Microsoft Entra Connect Health</td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td>Custom Microsoft Entra roles, admin được gán role theo administrative unit</td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td>MFA nâng cao: trusted IPs, fraud alert, MFA reports</td><td></td><td>✔</td><td>✔</td></tr>
    <tr><td><strong>Microsoft Entra ID Protection</strong>, risk-based Conditional Access (sign-in risk, user risk)</td><td></td><td></td><td>✔</td></tr>
    <tr><td><strong>Privileged Identity Management (PIM)</strong>: just-in-time, eligible assignment</td><td></td><td></td><td>✔</td></tr>
    <tr><td><strong>Access reviews</strong>, entitlement management (mức cơ bản)</td><td></td><td></td><td>✔</td></tr>
  </tbody>
</table>

<h4>Gói nào bao gồm P1/P2?</h4>
<ul>
  <li><strong>P1</strong>: Microsoft 365 E3, F1, F3, Business Premium, Enterprise Mobility + Security E3.</li>
  <li><strong>P2</strong>: Microsoft 365 E5, Enterprise Mobility + Security E5.</li>
  <li><strong>Microsoft Entra ID Governance</strong>: gói bổ sung cho các tính năng quản trị nâng cao (lifecycle workflows, access review nâng cao…). <strong>Microsoft Entra Suite</strong> gộp Private Access, Internet Access, ID Governance, ID Protection, Verified ID.</li>
</ul>

<h4>Cách nhớ nhanh</h4>
<pre class="diagram">Free  : danh tính cơ bản + SSO + security defaults
P1    : "tự động hóa & điều kiện"  → Conditional Access, dynamic group,
        group-based licensing, writeback, app proxy, custom role
P2    : P1 + "rủi ro & đặc quyền" → ID Protection (risk), PIM, access reviews</pre>

<div class="callout note"><strong>Yêu cầu license thực tế</strong>Dynamic group cần đủ license P1 cho <em>mỗi user là thành viên</em> của ít nhất một dynamic group (không bắt buộc gán license trực tiếp cho user, nhưng số license phải đủ). Thiết bị trong dynamic device group không cần license. Khi license Conditional Access hết hạn, policy không tự bị xóa nhưng không sửa được nữa.</div>
<div class="callout exam"><strong>Góc thi</strong>Từ khóa <em>"risk"</em>, <em>"just-in-time"</em>, <em>"eligible"</em>, <em>"access review"</em> → <strong>P2</strong>. Từ khóa <em>"Conditional Access"</em> (không có rủi ro), <em>"dynamic group"</em>, <em>"group-based licensing"</em>, <em>"password writeback"</em> → tối thiểu <strong>P1</strong>. Đề hỏi "giải pháp chi phí thấp nhất" thì chọn bản thấp nhất đáp ứng yêu cầu.</div>
`
    },
    {
      id: 'domain-services',
      unit: 'Examine Microsoft Entra Domain Services',
      title: 'Microsoft Entra Domain Services',
      html: `
<p><strong>Microsoft Entra Domain Services</strong> (trước đây là Azure AD DS) cung cấp <strong>managed domain</strong>: domain AD tương thích với các tính năng truyền thống (domain join, Group Policy, LDAP, Kerberos, NTLM) mà bạn <strong>không phải triển khai, vá lỗi hay sao lưu domain controller</strong>.</p>

<h4>Khi nào dùng</h4>
<ul>
  <li>"Lift and shift" ứng dụng cũ lên Azure VM, ứng dụng cần LDAP bind, Kerberos/NTLM hoặc Group Policy.</li>
  <li>Domain join VM Azure mà không muốn dựng site-to-site VPN về domain controller on-premises hay tự chạy DC trên VM.</li>
  <li>Ứng dụng, dịch vụ cần xác thực Windows tích hợp (ví dụ một số kịch bản Azure Files, Azure Virtual Desktop).</li>
</ul>

<h4>Cách hoạt động</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="AD DS on-premises đồng bộ lên Entra ID qua Entra Connect; Entra ID đồng bộ một chiều vào managed domain gồm 2 DC trong VNet; VM và ứng dụng LDAP, Kerberos dùng managed domain">
  <rect class="box" x="10" y="70" width="120" height="60" rx="10"/>
  <text x="70" y="96" text-anchor="middle" class="t-b">AD DS</text>
  <text x="70" y="115" text-anchor="middle" class="t-sm t-mute">on-prem (tùy chọn)</text>
  <rect class="box-a" x="165" y="70" width="150" height="60" rx="10"/>
  <text x="240" y="96" text-anchor="middle" class="t-b t-a">Microsoft Entra ID</text>
  <text x="240" y="115" text-anchor="middle" class="t-sm t-mute">user · group · hash</text>
  <line class="ln" x1="130" y1="100" x2="161" y2="100" marker-end="url(#arr)"/>
  <text x="147" y="152" text-anchor="middle" class="t-sm t-mute">Entra Connect · PHS</text>

  <rect class="zone" x="395" y="20" width="315" height="210" rx="12"/>
  <text x="552" y="40" text-anchor="middle" class="t-sm t-mute">VNet Azure</text>
  <rect class="box-e" x="410" y="50" width="140" height="160" rx="10"/>
  <text x="480" y="72" text-anchor="middle" class="t-b">Managed domain</text>
  <rect class="box" x="420" y="86" width="120" height="36" rx="6"/>
  <text x="480" y="109" text-anchor="middle" class="t-sm">DC 1</text>
  <rect class="box" x="420" y="134" width="120" height="36" rx="6"/>
  <text x="480" y="157" text-anchor="middle" class="t-sm">DC 2</text>
  <text x="480" y="194" text-anchor="middle" class="t-sm t-mute">Microsoft vận hành</text>
  <line class="ln-a" x1="315" y1="100" x2="406" y2="100" marker-end="url(#arr-a)"/>
  <text x="352" y="90" text-anchor="middle" class="t-sm t-a">một chiều</text>

  <rect class="box-s" x="580" y="60" width="115" height="50" rx="8"/>
  <text x="637" y="82" text-anchor="middle" class="t-b">VM</text>
  <text x="637" y="100" text-anchor="middle" class="t-sm t-mute">domain join</text>
  <rect class="box-s" x="580" y="140" width="115" height="50" rx="8"/>
  <text x="637" y="162" text-anchor="middle" class="t-b">App cũ</text>
  <text x="637" y="180" text-anchor="middle" class="t-sm t-mute">LDAP · Kerberos</text>
  <line class="ln-s" x1="580" y1="85" x2="554" y2="95" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="580" y1="165" x2="554" y2="155" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. User, group và password hash đi từ AD DS (nếu có) lên Entra ID, rồi đồng bộ <strong>một chiều</strong> xuống managed domain gồm hai DC do Microsoft vận hành trong một subnet của VNet. VM và ứng dụng cũ trong VNet (hoặc VNet peered) join domain và xác thực bằng LDAP, Kerberos, NTLM như với AD truyền thống.</figcaption>
</figure>
<ul>
  <li>Mỗi managed domain gồm <strong>hai domain controller</strong> để dự phòng; bạn <strong>không đăng nhập</strong> được vào DC. Quản trị qua một VM đã join domain, cài công cụ RSAT (ADAC, DNS, GPMC).</li>
  <li>Đồng bộ <strong>một chiều</strong> từ Entra ID vào managed domain. Đối tượng tạo trực tiếp trong managed domain (ví dụ service account, OU tùy chỉnh) không đồng bộ ngược lên Entra ID.</li>
  <li>Một forest chỉ chứa <strong>một domain</strong>. Mỗi tenant Entra ID chỉ có <strong>một</strong> managed domain (có thể mở rộng bằng replica set ở region khác).</li>
  <li>Có thể tạo <strong>forest trust</strong> (một chiều hoặc hai chiều) với AD DS on-premises.</li>
</ul>

<h4>Password hash: điểm hay bị hỏi</h4>
<ul>
  <li>Entra ID chỉ tạo hash dạng NTLM/Kerberos <strong>sau khi</strong> bật Domain Services.</li>
  <li><strong>User cloud-only</strong> phải <strong>đổi mật khẩu</strong> rồi mới đăng nhập được managed domain.</li>
  <li><strong>User đồng bộ từ on-prem</strong>: phải bật <strong>password hash synchronization</strong> trong Microsoft Entra Connect để đồng bộ hash cũ (legacy hash).</li>
</ul>

<h4>Quyền quản trị bị giới hạn</h4>
<ul>
  <li>Thành viên group <strong>AAD DC Administrators</strong> có quyền quản trị managed domain (join máy, quản lý GPO, OU tùy chỉnh, DNS).</li>
  <li><strong>Không</strong> có quyền <strong>Domain Admins</strong> hay <strong>Enterprise Admins</strong>; không mở rộng được schema; không truy cập trực tiếp DC.</li>
  <li>GPO dựng sẵn cho container <code>AADDC Users</code> và <code>AADDC Computers</code>; có thể tạo GPO tùy chỉnh.</li>
</ul>

<h4>SKU</h4>
<table>
  <thead><tr><th>SKU</th><th>Đối tượng (khuyến nghị)</th><th>Xác thực/giờ (khuyến nghị)</th><th>Tần suất backup</th></tr></thead>
  <tbody>
    <tr><td>Standard</td><td>đến 25.000</td><td>đến 3.000</td><td>5 ngày/lần</td></tr>
    <tr><td>Enterprise</td><td>25.001 – 100.000</td><td>3.001 – 10.000</td><td>3 ngày/lần</td></tr>
    <tr><td>Premium</td><td>100.001 – 500.000</td><td>10.001 – 70.000</td><td>Hằng ngày</td></tr>
  </tbody>
</table>
<p>Đây là mức khuyến nghị chứ không phải giới hạn cứng; có thể đổi SKU sau khi tạo. Tính phí theo giờ.</p>

<div class="compare">
  <div><strong>Entra Domain Services</strong>PaaS, không phải vá/backup DC, quyền quản trị hạn chế, không có schema extension, một domain duy nhất.</div>
  <div><strong>Tự chạy DC trên VM Azure</strong>Toàn quyền (Domain Admins, schema, nhiều domain, trust tùy ý) nhưng bạn tự chịu trách nhiệm vận hành, vá lỗi, sao lưu, HA.</div>
</div>
<div class="callout exam"><strong>Góc thi</strong>Yêu cầu "domain join VM, ít công quản trị nhất" → Entra Domain Services. Yêu cầu "mở rộng schema" hoặc "cần quyền Domain Admins" → phải tự dựng DC trên VM. User cloud-only không đăng nhập được vào VM đã join managed domain → bắt họ <strong>đổi mật khẩu</strong>.</div>
`
    },
    {
      id: 'tenant-subscription',
      extra: true,
      title: 'Tenant, directory và quan hệ với subscription',
      html: `
<h4>Khái niệm</h4>
<ul>
  <li><strong>Tenant</strong>: một phiên bản Microsoft Entra ID riêng biệt, đại diện cho một tổ chức. Trong ngữ cảnh Azure, "tenant" và "directory" dùng thay thế nhau. Mỗi tenant có <strong>Tenant ID</strong> (GUID).</li>
  <li><strong>Initial domain</strong> <code>contoso.onmicrosoft.com</code> được tạo cùng tenant, <strong>không xóa được</strong>. Thêm <strong>custom domain</strong> (ví dụ <code>contoso.com</code>) bằng cách tạo bản ghi DNS <strong>TXT</strong> (hoặc MX) để xác minh quyền sở hữu.</li>
  <li><strong>Subscription</strong>: đơn vị thanh toán và ranh giới quản lý tài nguyên Azure.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Microsoft Entra admin center: thêm và xác minh custom domain</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Đăng nhập <code>entra.microsoft.com</code> với vai trò tối thiểu <strong>Domain Name Administrator</strong>, mở:<br><span class="path">Microsoft Entra admin center › Entra ID › Domain names › + Add custom domain</span></li>
    <li>Nhập tên domain đầy đủ, có cả phần đuôi (.com, .vn…):
      <div class="blade">
        <div class="blade-title">Add custom domain</div>
        <div class="pf"><label class="req">Custom domain name</label><span class="pv">contoso.com</span></div>
        <div class="pbtns"><span class="pbtn primary">Add domain</span></div>
      </div>
    </li>
    <li>Trang <strong>contoso.com</strong> hiện thông tin bản ghi DNS cần tạo (Hình 1). Chọn <strong>TXT</strong> (hoặc MX), sao chép <em>Alias or host name</em> (<code>@</code>), <em>Destination or points to address</em> (<code>MS=ms…</code>) và <em>TTL</em>.</li>
    <li>Sang nhà đăng ký domain (hoặc Azure DNS nếu domain được ủy quyền ở đó), tạo bản ghi TXT với đúng các giá trị trên, TTL 3600.</li>
    <li>Quay lại <span class="path">Entra ID › Domain names › contoso.com</span>, bấm <strong>Verify</strong>. Nếu báo lỗi, chờ DNS lan truyền (có thể hơn một giờ) rồi thử lại.</li>
    <li>Tùy chọn: <strong>Make primary</strong> để user mới mặc định dùng domain này, rồi đổi UPN suffix của user hiện có sang <code>@contoso.com</code>.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p2m1/custom-domain-dns.png" alt="Trang contoso.com trong Entra ID hiển thị Record type TXT, Alias or host name @, Destination MS=ms64983159, TTL 3600 và nút Verify" loading="lazy"><figcaption>Hình 1. Thông tin bản ghi TXT cần tạo ở nhà đăng ký domain trước khi bấm <em>Verify</em>. Một domain chỉ xác minh được trong <strong>một</strong> tenant tại một thời điểm. Nguồn: <a href="https://learn.microsoft.com/entra/fundamentals/add-custom-domain" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Quan hệ</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Tenant Contoso có directory và root management group chứa ba subscription; Sub 3 được Change directory sang tenant Fabrikam và mất RBAC">
  <rect class="zone" x="10" y="20" width="470" height="235" rx="12"/>
  <text x="245" y="42" text-anchor="middle" class="t-sm t-mute">Tenant Contoso</text>
  <rect class="box-a" x="25" y="56" width="440" height="48" rx="10"/>
  <text x="245" y="76" text-anchor="middle" class="t-b t-a">Directory (Entra ID)</text>
  <text x="245" y="94" text-anchor="middle" class="t-sm t-mute">users · groups · apps · managed identities</text>
  <rect class="box" x="150" y="128" width="190" height="36" rx="8"/>
  <text x="245" y="151" text-anchor="middle" class="t-sm t-b">Root management group</text>
  <rect class="box-w" x="40" y="196" width="120" height="44" rx="8"/>
  <text x="100" y="223" text-anchor="middle" class="t-b">Sub 1</text>
  <rect class="box-w" x="185" y="196" width="120" height="44" rx="8"/>
  <text x="245" y="223" text-anchor="middle" class="t-b">Sub 2</text>
  <rect class="box-w" x="330" y="196" width="120" height="44" rx="8"/>
  <text x="390" y="223" text-anchor="middle" class="t-b">Sub 3</text>
  <line class="ln" x1="245" y1="104" x2="245" y2="128"/>
  <line class="ln" x1="245" y1="164" x2="100" y2="196"/>
  <line class="ln" x1="245" y1="164" x2="245" y2="196"/>
  <line class="ln" x1="245" y1="164" x2="390" y2="196"/>

  <rect class="zone" x="520" y="20" width="190" height="235" rx="12"/>
  <text x="615" y="42" text-anchor="middle" class="t-sm t-mute">Tenant Fabrikam</text>
  <rect class="box-a" x="535" y="56" width="160" height="48" rx="10"/>
  <text x="615" y="85" text-anchor="middle" class="t-b t-a">Directory B</text>
  <rect class="box-x" x="555" y="196" width="140" height="44" rx="8"/>
  <text x="625" y="214" text-anchor="middle" class="t-b">Sub 3</text>
  <text x="625" y="231" text-anchor="middle" class="t-sm t-x">RBAC, MI bị mất</text>
  <line class="ln-x dash" x1="450" y1="218" x2="551" y2="218" marker-end="url(#arr-x)"/>
  <text x="500" y="276" text-anchor="middle" class="t-sm t-x">Change directory</text>
</svg>
<figcaption>Hình 2. Một tenant chứa nhiều subscription (qua root management group), nhưng mỗi subscription chỉ tin cậy <strong>một</strong> directory. Khi Sub 3 được <em>Change directory</em> sang tenant khác, tài nguyên vẫn chạy nguyên vẹn, còn mọi role assignment và managed identity gắn với directory cũ đều mất.</figcaption>
</figure>
<ul>
  <li>Một subscription <strong>tin cậy đúng một</strong> tenant tại một thời điểm, để xác thực user, service principal, managed identity.</li>
  <li>Một tenant có thể có <strong>nhiều</strong> subscription.</li>
  <li>Root management group của cây management group gắn với tenant.</li>
  <li>Một user (member hoặc guest) có thể thuộc tối đa <strong>500</strong> tenant; chuyển giữa các tenant bằng <em>Switch directory</em> trên portal hoặc <code>az login --tenant &lt;id&gt;</code>.</li>
</ul>

<h4>Chuyển subscription sang tenant khác (Change directory)</h4>
<p>Thao tác thực hiện tại Subscription &gt; <em>Change directory</em> (người làm cần là Owner của subscription và có tài khoản trong cả tenant nguồn lẫn tenant đích). Hệ quả quan trọng:</p>
<ul>
  <li><strong>Toàn bộ Azure RBAC role assignment bị xóa vĩnh viễn</strong>, kể cả của Owner; custom role cũng bị xóa. Phải gán lại quyền ở tenant mới.</li>
  <li><strong>Managed identity</strong> (system-assigned và user-assigned) không còn hợp lệ; phải bật lại hoặc tạo lại.</li>
  <li><strong>Key Vault</strong> giữ tenant ID cũ: phải cập nhật tenant ID và tạo lại access policy.</li>
  <li>Tài nguyên dùng xác thực Entra ID (Azure SQL với Entra admin, AKS tích hợp Entra ID…) cần cấu hình lại.</li>
  <li>Tài nguyên (VM, storage…) <strong>không bị di chuyển</strong> và không bị gián đoạn chạy; chỉ quan hệ tin cậy danh tính thay đổi.</li>
</ul>

<h4>Global Administrator và tài nguyên Azure</h4>
<p>Global Administrator mặc định <strong>không có quyền</strong> trên subscription. Khi cần (ví dụ lấy lại quyền subscription bị "mồ côi"), bật <em>Access management for Azure resources</em> trong Properties của Entra ID: tài khoản được gán <strong>User Access Administrator</strong> tại root scope (<code>/</code>), từ đó tự gán quyền cần thiết. Nên tắt ngay sau khi dùng.</p>
<pre><code>az rest --method post --url "/providers/Microsoft.Authorization/elevateAccess?api-version=2016-07-01"
az account list --query "[].{name:name, tenant:tenantId}" -o table</code></pre>
<div class="callout exam"><strong>Góc thi</strong>"Sau khi chuyển subscription sang tenant mới, user không còn truy cập được tài nguyên" → do role assignment đã bị xóa; cần gán lại RBAC. "Thêm domain contoso.com cho user đăng nhập" → thêm custom domain, xác minh bằng bản ghi <strong>TXT</strong>, rồi đổi UPN suffix của user.</div>
`
    }
  ],
  keyFacts: [
    'Microsoft Entra ID là tên mới của Azure Active Directory; Microsoft Entra Domain Services là tên mới của Azure AD DS.',
    'Entra ID dùng <strong>OIDC, OAuth 2.0, SAML, WS-Fed</strong> qua HTTPS và Microsoft Graph; AD DS dùng <strong>Kerberos, NTLM, LDAP</strong>, có OU và Group Policy.',
    'Entra ID có cấu trúc <strong>phẳng</strong>: không OU, không GPO. Gom nhóm bằng group và administrative unit.',
    'Bản Free: tối đa <strong>50.000</strong> đối tượng; có verified domain thì <strong>300.000</strong>. User non-admin tạo tối đa <strong>250</strong> đối tượng.',
    '<strong>P1</strong>: Conditional Access, dynamic group, group-based licensing, password writeback, application proxy, custom role, Connect Health.',
    '<strong>P2</strong> = P1 + <strong>ID Protection</strong> (risk-based policy), <strong>PIM</strong>, <strong>access reviews</strong>.',
    'P1 có trong Microsoft 365 E3 / Business Premium / EMS E3; P2 có trong Microsoft 365 E5 / EMS E5.',
    'Entra Domain Services: <strong>2 DC</strong> do Microsoft quản lý, đồng bộ <strong>một chiều</strong> từ Entra ID, một managed domain mỗi tenant, quản trị qua group <strong>AAD DC Administrators</strong> (không có Domain Admins/Enterprise Admins).',
    'User cloud-only phải <strong>đổi mật khẩu</strong> sau khi bật Domain Services; user đồng bộ cần <strong>password hash sync</strong>.',
    'Một subscription tin cậy <strong>đúng một</strong> tenant; một tenant có nhiều subscription. Chuyển subscription sang tenant khác sẽ <strong>xóa mọi RBAC role assignment</strong>.'
  ],
  traps: [
    'Cho rằng Entra ID hỗ trợ LDAP/Kerberos/Group Policy như AD DS. Muốn có các tính năng đó phải dùng <strong>Entra Domain Services</strong> hoặc DC tự dựng.',
    'Chọn P2 cho yêu cầu chỉ cần Conditional Access hay dynamic group. P1 là đủ và rẻ hơn; P2 chỉ cần khi có <em>risk</em>, PIM hoặc access reviews.',
    'Nghĩ rằng Global Administrator tự động có quyền Owner trên mọi subscription. Phải <strong>elevate access</strong> mới có User Access Administrator ở root scope.',
    'Nghĩ rằng chuyển subscription sang tenant khác sẽ di chuyển hoặc xóa tài nguyên. Tài nguyên giữ nguyên, nhưng <strong>RBAC assignment và managed identity</strong> bị mất.',
    'Nghĩ rằng trong Entra Domain Services có thể thêm user vào Domain Admins hoặc mở rộng schema. Không được: chỉ có <strong>AAD DC Administrators</strong> với quyền hạn chế.',
    'Quên rằng đồng bộ vào managed domain là <strong>một chiều</strong>: đối tượng tạo trong managed domain không xuất hiện trong Entra ID.',
    'Nhầm Enterprise applications với App registrations: cấu hình SSO và gán user cho app SaaS làm ở <strong>Enterprise applications</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Giao thức Entra ID</td><td>OIDC, OAuth 2.0, SAML, WS-Fed; truy vấn bằng Microsoft Graph</td></tr>
    <tr><td>Giao thức AD DS</td><td>Kerberos, NTLM, LDAP; có OU, GPO, forest/trust</td></tr>
    <tr><td>Free</td><td>User/group, SSO, security defaults, SSPR cloud, B2B, Connect Sync; 50.000 đối tượng (300.000 nếu có verified domain)</td></tr>
    <tr><td>P1</td><td>Conditional Access, dynamic group, group licensing, writeback, app proxy, custom role</td></tr>
    <tr><td>P2</td><td>P1 + ID Protection (risk), PIM, access reviews</td></tr>
    <tr><td>Entra Domain Services</td><td>2 DC managed, sync 1 chiều, AAD DC Administrators, SKU Standard/Enterprise/Premium</td></tr>
    <tr><td>Tenant – subscription</td><td>1 tenant : N subscription; subscription tin cậy 1 tenant</td></tr>
    <tr><td>Change directory</td><td>Mất RBAC assignment, custom role, managed identity; Key Vault cần đổi tenant ID</td></tr>
    <tr><td>Custom domain</td><td>Xác minh bằng bản ghi DNS TXT (hoặc MX)</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Microsoft Entra ID trước đây tên là gì?', back: '<strong>Azure Active Directory</strong> (Azure AD).' },
    { front: 'Entra ID có OU và Group Policy không?', back: '<strong>Không</strong>. Cấu trúc phẳng; dùng group, administrative unit, Intune và Conditional Access.' },
    { front: 'Giao thức xác thực chính của Entra ID?', back: 'OpenID Connect, OAuth 2.0, SAML 2.0, WS-Federation (qua HTTPS).' },
    { front: 'Giới hạn đối tượng của tenant Free?', back: '<strong>50.000</strong>; tenant có ít nhất một verified domain: <strong>300.000</strong>.' },
    { front: 'Tính năng nào cần P2?', back: 'Microsoft Entra <strong>ID Protection</strong> (risk-based Conditional Access), <strong>PIM</strong>, <strong>access reviews</strong>.' },
    { front: 'Conditional Access cần bản nào?', back: '<strong>P1</strong> trở lên (risk-based policy cần P2).' },
    { front: 'Dynamic group cần license gì?', back: '<strong>P1</strong> cho mỗi user là thành viên của dynamic group. Device trong dynamic group không cần license.' },
    { front: 'App registration khác Enterprise application thế nào?', back: 'App registration = <strong>application object</strong> (định nghĩa toàn cục). Enterprise application = <strong>service principal</strong> trong từng tenant, nơi cấu hình SSO và gán user.' },
    { front: 'Publish web app on-premises cho user từ Internet với đăng nhập Entra ID?', back: '<strong>Microsoft Entra application proxy</strong> (cần P1).' },
    { front: 'Entra Domain Services có mấy domain controller?', back: '<strong>Hai</strong>, do Microsoft vận hành; bạn không đăng nhập được vào DC.' },
    { front: 'Group quản trị của Entra Domain Services?', back: '<strong>AAD DC Administrators</strong>. Không có Domain Admins / Enterprise Admins.' },
    { front: 'User cloud-only không đăng nhập được vào managed domain. Cách khắc phục?', back: 'Cho user <strong>đổi mật khẩu</strong> để Entra ID sinh hash NTLM/Kerberos.' },
    { front: 'Chiều đồng bộ giữa Entra ID và managed domain?', back: '<strong>Một chiều</strong>: từ Entra ID vào managed domain.' },
    { front: 'Một subscription tin cậy bao nhiêu tenant?', back: '<strong>Một</strong>. Một tenant có thể có nhiều subscription.' },
    { front: 'Chuyển subscription sang tenant khác làm mất gì?', back: 'Mọi <strong>Azure RBAC role assignment</strong>, custom role, managed identity; Key Vault phải cập nhật tenant ID.' },
    { front: 'Global Administrator cần làm gì để quản lý mọi subscription?', back: 'Bật <strong>Access management for Azure resources</strong> (elevate access) để có User Access Administrator tại root scope <code>/</code>.' }
  ],
  quiz: [
    {
      q: 'Công ty bạn chuyển một ứng dụng cũ lên VM Azure. Ứng dụng xác thực người dùng bằng LDAP bind và Kerberos. Bạn muốn ít công vận hành nhất và không tự quản lý domain controller. Bạn chọn giải pháp nào?',
      options: ['Cấu hình ứng dụng dùng Microsoft Entra ID trực tiếp qua LDAP', 'Microsoft Entra Domain Services', 'Triển khai hai VM Windows Server làm domain controller', 'Microsoft Entra application proxy'],
      answer: [1],
      explain: 'Entra Domain Services cung cấp managed domain hỗ trợ LDAP, Kerberos, NTLM và domain join mà Microsoft vận hành DC. Entra ID không hỗ trợ LDAP. Tự dựng DC trên VM đáp ứng chức năng nhưng tốn công vận hành. Application proxy dùng để publish web app, không cung cấp LDAP/Kerberos.'
    },
    {
      q: 'Bạn cần yêu cầu MFA khi người dùng đăng nhập từ ngoài mạng công ty, và chặn đăng nhập khi Microsoft phát hiện sign-in risk cao. Phiên bản Microsoft Entra ID tối thiểu là gì?',
      options: ['Free', 'P1', 'P2', 'Free kèm security defaults'],
      answer: [2],
      explain: 'Conditional Access theo vị trí cần P1, nhưng chính sách dựa trên sign-in risk thuộc Microsoft Entra ID Protection nên cần P2. Free và security defaults không cho tạo chính sách theo điều kiện vị trí hay rủi ro.'
    },
    {
      q: 'Bạn muốn user tự động được thêm vào group theo thuộc tính department và nhận license Microsoft 365 qua group đó. Yêu cầu chi phí thấp nhất. Bạn cần phiên bản nào?',
      options: ['Microsoft Entra ID P1', 'Microsoft Entra ID P2', 'Microsoft Entra ID Free', 'Microsoft Entra ID Governance'],
      answer: [0],
      explain: 'Dynamic membership group và group-based licensing đều thuộc P1. P2 và ID Governance cũng có nhưng đắt hơn, không cần thiết. Bản Free không hỗ trợ dynamic group.'
    },
    {
      q: 'Phát biểu nào về Microsoft Entra ID là ĐÚNG? (Chọn 2)',
      options: ['Quản trị viên có thể tạo OU và liên kết Group Policy', 'Truy vấn thư mục được thực hiện qua Microsoft Graph bằng HTTPS', 'Hỗ trợ SAML 2.0 và OpenID Connect cho single sign-on', 'Có thể mở rộng schema giống AD DS và dùng LDAP'],
      answer: [1, 2],
      explain: 'Entra ID dùng Microsoft Graph (REST qua HTTPS) và các giao thức web như SAML, OIDC. Entra ID có cấu trúc phẳng, không có OU hay GPO, và không hỗ trợ LDAP truy vấn trực tiếp như AD DS.'
    },
    {
      q: 'Sau khi bật Microsoft Entra Domain Services, một user tạo trực tiếp trên cloud (cloud-only) không đăng nhập được vào VM đã join managed domain. User đồng bộ từ on-premises thì đăng nhập được. Bạn nên làm gì?',
      options: ['Thêm user vào group AAD DC Administrators', 'Bật password hash synchronization trong Microsoft Entra Connect', 'Gán license P2 cho user', 'Yêu cầu user đổi mật khẩu'],
      answer: [3],
      explain: 'User cloud-only phải đổi mật khẩu để Entra ID sinh hash NTLM/Kerberos và đồng bộ vào managed domain. Password hash sync chỉ áp dụng cho user đồng bộ từ on-premises. Thêm vào AAD DC Administrators cấp quyền quản trị chứ không giải quyết thiếu hash, còn license không liên quan.'
    },
    {
      q: 'Một quản trị viên muốn mở rộng schema Active Directory để cài một ứng dụng doanh nghiệp, và cần quyền Enterprise Admins. Hạ tầng hiện dùng Microsoft Entra Domain Services. Phương án nào phù hợp?',
      options: ['Thêm quản trị viên vào AAD DC Administrators', 'Nâng SKU managed domain lên Premium', 'Triển khai domain controller AD DS tự quản lý trên VM Azure', 'Bật Access management for Azure resources'],
      answer: [2],
      explain: 'Managed domain không cho mở rộng schema và không cấp quyền Domain Admins/Enterprise Admins, kể cả ở SKU Premium hay với AAD DC Administrators. Chỉ DC tự quản lý mới có toàn quyền. Elevate access liên quan đến Azure RBAC, không liên quan AD.'
    },
    {
      q: 'Tenant của bạn có 3 subscription. Bạn chuyển Subscription2 sang một tenant khác bằng Change directory. Điều gì xảy ra? (Chọn 2)',
      options: ['Mọi Azure RBAC role assignment trên Subscription2 bị xóa', 'Các VM trong Subscription2 bị dừng cho đến khi gán lại quyền', 'Managed identity của tài nguyên trong Subscription2 phải được bật lại hoặc tạo lại', 'Subscription1 và Subscription3 cũng được chuyển theo'],
      answer: [0, 2],
      explain: 'Khi đổi directory, role assignment (và custom role) bị xóa, managed identity không còn hợp lệ. Tài nguyên vẫn chạy bình thường, không bị dừng. Mỗi subscription được chuyển độc lập nên các subscription khác không bị ảnh hưởng.'
    },
    {
      q: 'Bạn là Global Administrator nhưng không thấy subscription nào trên Azure portal. Owner cũ của subscription đã nghỉ việc. Bạn cần lấy lại quyền quản lý với ít công sức nhất. Bạn làm gì trước tiên?',
      options: ['Bật Access management for Azure resources trong Properties của Microsoft Entra ID', 'Tạo ticket yêu cầu Microsoft chuyển quyền billing', 'Đặt lại mật khẩu của Owner cũ', 'Gán cho chính mình vai trò Privileged Role Administrator'],
      answer: [0],
      explain: 'Elevate access gán User Access Administrator tại root scope, cho phép tự gán Owner trên subscription. Đặt lại mật khẩu tài khoản người khác vi phạm nguyên tắc bảo mật. Privileged Role Administrator là Entra role, không cấp quyền Azure RBAC. Ticket hỗ trợ tốn thời gian hơn.'
    },
    {
      q: 'Bạn muốn người dùng đăng nhập bằng <code>user@contoso.com</code> thay vì <code>user@contoso.onmicrosoft.com</code>. Bạn cần làm gì? (Chọn 2)',
      options: ['Xóa domain contoso.onmicrosoft.com', 'Thêm custom domain contoso.com và xác minh bằng bản ghi DNS TXT', 'Tạo tenant mới tên contoso.com', 'Đổi UPN suffix của user sang contoso.com'],
      answer: [1, 3],
      explain: 'Thêm và xác minh custom domain (TXT hoặc MX), rồi cập nhật UPN của user. Initial domain onmicrosoft.com không xóa được. Tạo tenant mới là không cần thiết và tách rời user khỏi tổ chức hiện tại.'
    },
    {
      q: 'Bạn cần cấu hình SAML single sign-on cho ứng dụng SaaS ServiceNow và chỉ cho phép group Sales truy cập. Bạn làm việc ở đâu?',
      options: ['App registrations', 'Microsoft Entra Domain Services', 'Microsoft Entra Connect', 'Enterprise applications'],
      answer: [3],
      explain: 'Ứng dụng gallery như ServiceNow được thêm vào Enterprise applications (service principal), nơi cấu hình SAML SSO, bật user assignment required và gán group. App registrations dùng cho ứng dụng do tổ chức phát triển. Domain Services và Entra Connect không quản lý SSO ứng dụng SaaS.'
    },
    {
      q: 'Công ty cần quản trị viên chỉ kích hoạt vai trò Global Administrator khi cần, có thời hạn và phải phê duyệt. Tính năng nào và license nào?',
      options: ['Conditional Access, P1', 'Privileged Identity Management, P2', 'Administrative units, Free', 'Security defaults, Free'],
      answer: [1],
      explain: 'Just-in-time, eligible assignment, thời hạn và phê duyệt là tính năng của PIM, cần P2 (hoặc ID Governance). Conditional Access kiểm soát điều kiện đăng nhập, không quản lý kích hoạt role. Administrative units giới hạn phạm vi quản trị. Security defaults chỉ bật MFA cơ bản.'
    },
    {
      q: 'Phát biểu nào về tenant và subscription là ĐÚNG?',
      options: ['Một subscription có thể tin cậy nhiều tenant cùng lúc', 'Một tenant chỉ có một subscription', 'Một tenant có thể có nhiều subscription, mỗi subscription tin cậy đúng một tenant', 'Subscription và tenant là cùng một khái niệm'],
      answer: [2],
      explain: 'Quan hệ là một tenant – nhiều subscription; mỗi subscription chỉ tin cậy một tenant tại một thời điểm. Tenant là ranh giới danh tính, subscription là ranh giới thanh toán và quản lý tài nguyên.'
    },
    {
      q: 'Bạn dùng Microsoft Entra Domain Services. Một admin tạo service account <code>svc-app</code> trực tiếp trong managed domain bằng ADAC. Account này có xuất hiện trong Microsoft Entra ID không?',
      options: ['Có, sau chu kỳ đồng bộ 30 phút', 'Có, nếu bật password hash sync', 'Có, nếu account nằm trong OU AADDC Users', 'Không, vì đồng bộ chỉ một chiều từ Entra ID vào managed domain'],
      answer: [3],
      explain: 'Đồng bộ giữa Entra ID và managed domain là một chiều. Đối tượng tạo trong managed domain không được đồng bộ ngược lên Entra ID, bất kể OU hay cấu hình password hash sync.'
    },
    {
      q: 'Bạn đang thiết kế đăng nhập cho user đồng bộ từ AD DS. Yêu cầu: user vẫn đăng nhập được Microsoft 365 khi toàn bộ hạ tầng on-premises mất kết nối, và cấu hình đơn giản nhất. Bạn chọn phương thức nào?',
      options: ['Password hash synchronization', 'Pass-through authentication', 'Federation với AD FS', 'Seamless SSO không kèm phương thức khác'],
      answer: [0],
      explain: 'Với PHS, Entra ID tự xác thực bằng hash đã đồng bộ nên không phụ thuộc on-premises khi đăng nhập. PTA cần agent on-prem hoạt động, AD FS cần hạ tầng federation on-prem. Seamless SSO chỉ là tính năng bổ sung cho PHS/PTA, không phải phương thức xác thực độc lập.'
    }
  ]
});

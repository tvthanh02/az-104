AZ.addModule({
  id: 'p2m3',
  summary: 'Module này dựng "bản đồ" của Azure: hạ tầng vật lý (region, region pair, availability zone, sovereign region) và hạ tầng quản lý (tenant → management group → subscription → resource group → resource). Đề AZ-104 hỏi rất nhiều về <strong>scope và kế thừa</strong>, <strong>giới hạn của management group</strong> và <strong>chuyện gì xảy ra khi di chuyển resource</strong> giữa resource group / subscription.',
  objectives: [
    'Phân biệt region, region pair, availability zone và sovereign region; chọn đúng mô hình triển khai zonal / zone-redundant',
    'Giải thích mối quan hệ giữa tài khoản Azure, Microsoft Entra tenant, subscription và billing',
    'Mô tả hệ phân cấp management group → subscription → resource group → resource và cơ chế kế thừa RBAC / Policy',
    'Nhớ các giới hạn quan trọng: 10.000 management group, 6 cấp độ sâu, 980 resource group mỗi subscription, 800 resource mỗi lần move',
    'Di chuyển resource giữa resource group / subscription đúng cách: điều kiện, khóa trong khi move, resource ID thay đổi, role assignment bị mất'
  ],
  sections: [
    {
      id: 'what-is-azure',
      unit: 'What is Microsoft Azure',
      title: 'Microsoft Azure là gì và mô hình dịch vụ',
      html: `
<p><strong>Microsoft Azure</strong> là nền tảng cloud công cộng với hàng trăm dịch vụ (compute, storage, networking, database, AI, identity…). Bạn quản lý mọi thứ qua <strong>Azure Resource Manager (ARM)</strong>: portal, Azure CLI, Azure PowerShell, REST API, ARM template / Bicep đều gửi request tới cùng một endpoint <code>https://management.azure.com</code>.</p>

<h4>Mô hình dịch vụ và trách nhiệm chia sẻ</h4>
<table>
  <thead><tr><th>Mô hình</th><th>Ví dụ trên Azure</th><th>Bạn chịu trách nhiệm</th></tr></thead>
  <tbody>
    <tr><td>IaaS</td><td>Virtual Machines, managed disks, VNet</td><td>Hệ điều hành, bản vá, runtime, ứng dụng, dữ liệu, cấu hình mạng</td></tr>
    <tr><td>PaaS</td><td>App Service, Azure SQL Database, Azure Storage</td><td>Ứng dụng, dữ liệu, cấu hình truy cập</td></tr>
    <tr><td>SaaS</td><td>Microsoft 365, Dynamics 365</td><td>Dữ liệu, tài khoản người dùng, thiết bị truy cập</td></tr>
  </tbody>
</table>
<p>Với <strong>mọi</strong> mô hình, khách hàng luôn chịu trách nhiệm về <strong>dữ liệu, tài khoản/identity và thiết bị</strong>. Microsoft luôn chịu trách nhiệm về datacenter vật lý, mạng vật lý và host.</p>

<h4>Control plane và data plane</h4>
<div class="compare">
  <div><strong>Control plane</strong>Quản lý resource: tạo VM, đổi SKU, gán role, đặt lock. Đi qua <code>management.azure.com</code>, chịu tác động của <strong>RBAC, Azure Policy, resource lock</strong>.</div>
  <div><strong>Data plane</strong>Dùng chức năng của resource: đọc/ghi blob, truy vấn SQL, đọc secret Key Vault. Đi thẳng tới endpoint dịch vụ (vd. <code>myaccount.blob.core.windows.net</code>). Resource lock <strong>không</strong> chặn data plane.</div>
</div>

<h4>Các nhóm dịch vụ admin hay gặp trong AZ-104</h4>
<ul>
  <li><strong>Identity &amp; governance</strong>: Microsoft Entra ID, Azure RBAC, Azure Policy, management group, tag, lock, Cost Management.</li>
  <li><strong>Storage</strong>: storage account (Blob, Files, Queue, Table), redundancy LRS/ZRS/GRS/GZRS.</li>
  <li><strong>Compute</strong>: VM, Virtual Machine Scale Sets, App Service, Azure Container Instances, Azure Container Apps.</li>
  <li><strong>Networking</strong>: VNet, NSG, peering, VPN Gateway, Load Balancer, Application Gateway, Azure DNS.</li>
  <li><strong>Monitor &amp; backup</strong>: Azure Monitor, Log Analytics, Azure Backup, Azure Site Recovery.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Khi đề hỏi "cách nào nhất quán và lặp lại được để triển khai hạ tầng", đáp án thường là <strong>ARM template / Bicep</strong> vì mọi công cụ đều đi qua cùng lớp Azure Resource Manager. Khi đề hỏi lock có ngăn ai đó xóa blob không: <strong>không</strong>, vì xóa blob là thao tác data plane.</div>
`
    },
    {
      id: 'accounts',
      unit: 'Get started with Azure accounts',
      title: 'Tài khoản Azure, tenant, subscription và billing',
      html: `
<p>Để dùng Azure bạn cần một <strong>tài khoản Azure</strong>, tức là một danh tính trong <strong>Microsoft Entra ID</strong> (trước đây là Azure AD) có quyền trên ít nhất một <strong>subscription</strong>.</p>

<pre class="diagram">Microsoft Entra tenant (directory, 1 tenant ID)
   │  tin cậy (trust)
   ├── Subscription A  ── billing qua billing account / billing profile
   ├── Subscription B
   └── Subscription C
Mỗi subscription tin cậy ĐÚNG MỘT tenant; một tenant có NHIỀU subscription.</pre>

<h4>Các loại tài khoản / offer</h4>
<table>
  <thead><tr><th>Loại</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td>Azure free account</td><td>Credit dùng thử (USD 200, quy đổi theo tiền tệ thanh toán) trong 30 ngày đầu và một lượng dịch vụ miễn phí giới hạn trong 12 tháng; cần thẻ để xác minh danh tính.</td></tr>
    <tr><td>Azure for Students</td><td>Credit cho sinh viên, không cần thẻ tín dụng.</td></tr>
    <tr><td>Pay-as-you-go (PAYG)</td><td>Trả theo mức dùng, hóa đơn hằng tháng.</td></tr>
    <tr><td>Microsoft Customer Agreement (MCA)</td><td>Hợp đồng thương mại hiện đại; cấu trúc billing account → billing profile → invoice section.</td></tr>
    <tr><td>Enterprise Agreement (EA)</td><td>Cam kết dài hạn cho doanh nghiệp lớn; enrollment → department → account → subscription.</td></tr>
    <tr><td>Cloud Solution Provider (CSP)</td><td>Mua qua đối tác Microsoft; đối tác quản lý billing.</td></tr>
  </tbody>
</table>

<h4>Subscription là ranh giới gì?</h4>
<ul>
  <li><strong>Billing boundary</strong>: mỗi subscription có hóa đơn/báo cáo chi phí riêng. Muốn tách chi phí Dev và Prod rõ ràng thì tách subscription.</li>
  <li><strong>Access control boundary</strong>: RBAC và Azure Policy gán ở subscription áp dụng cho mọi resource group bên dưới.</li>
  <li><strong>Scale / quota boundary</strong>: quota (vd. số vCPU mỗi region, 980 resource group mỗi subscription) tính theo subscription. Chạm quota thì xin tăng quota hoặc thêm subscription.</li>
</ul>

<h4>Lý do tạo thêm subscription</h4>
<ul>
  <li>Tách môi trường (dev/test/prod) để áp policy và quyền khác nhau.</li>
  <li>Tách theo phòng ban / dự án để báo cáo chi phí.</li>
  <li>Vượt giới hạn quota của một subscription.</li>
  <li>Cô lập workload có yêu cầu compliance riêng.</li>
</ul>

<h4>Đổi tenant của subscription (change directory)</h4>
<p>Có thể chuyển một subscription sang tenant khác, nhưng: <strong>toàn bộ Azure role assignment và custom role của subscription bị xóa</strong>, managed identity và Key Vault (gắn tenant ID) phải cấu hình lại. Đây là thao tác hiếm, cần lên kế hoạch.</p>

<pre><code># Xem tenant hiện tại và danh sách subscription
az account show --query "{tenant:tenantId, sub:name}" -o table
az account list -o table
Get-AzSubscription | Select-Object Name, Id, TenantId</code></pre>

<div class="callout note"><strong>Classic administrator đã nghỉ hưu</strong>Các vai trò cổ điển Service Administrator / Co-Administrator đã bị Microsoft cho ngừng hỗ trợ từ 31/08/2024; từ 12/2025 Azure tự chuyển người còn giữ vai trò này thành Owner ở scope subscription, và đến 05/2026 tab Classic administrators bị gỡ khỏi portal. Quyền trên subscription giờ được quản lý hoàn toàn bằng <strong>Azure RBAC</strong> (Owner, Contributor…). Riêng <em>Account Administrator</em> (người dùng chính của billing account) <strong>không</strong> bị loại bỏ.</div>

<div class="callout exam"><strong>Góc thi</strong>"Một subscription có thể liên kết với bao nhiêu tenant?" → <strong>một</strong>. "Một tenant có thể có bao nhiêu subscription?" → <strong>nhiều</strong>. Di chuyển resource giữa hai subscription chỉ làm được khi <strong>cả hai cùng tenant</strong>.</div>
`
    },
    {
      id: 'physical-infra',
      unit: 'Describe Azure physical infrastructure',
      title: 'Hạ tầng vật lý: region, availability zone, region pair, sovereign region',
      html: `
<figure class="fig">
<svg class="dg" viewBox="0 0 720 320" role="img" aria-label="Geography chứa hai region ghép cặp, mỗi region có ba availability zone">
  <rect class="zone" x="10" y="10" width="700" height="300" rx="14"/>
  <text x="28" y="34" class="t-sm t-mute">Geography: Asia Pacific (ranh giới data residency)</text>

  <rect class="box-a" x="25" y="48" width="300" height="200" rx="12"/>
  <text x="175" y="74" text-anchor="middle" class="t-b t-a">Southeast Asia (Singapore)</text>
  <text x="175" y="92" text-anchor="middle" class="t-sm t-mute">region = nhóm datacenter, mạng độ trễ thấp</text>
  <rect class="box" x="33" y="106" width="88" height="66" rx="8"/>
  <text x="77" y="134" text-anchor="middle" class="t-b">Zone 1</text>
  <text x="77" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <rect class="box" x="131" y="106" width="88" height="66" rx="8"/>
  <text x="175" y="134" text-anchor="middle" class="t-b">Zone 2</text>
  <text x="175" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <rect class="box" x="229" y="106" width="88" height="66" rx="8"/>
  <text x="273" y="134" text-anchor="middle" class="t-b">Zone 3</text>
  <text x="273" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <text x="175" y="200" text-anchor="middle" class="t-sm">mỗi zone: ≥ 1 datacenter</text>
  <text x="175" y="220" text-anchor="middle" class="t-sm">điện, làm mát, mạng độc lập</text>

  <rect class="box-a" x="395" y="48" width="300" height="200" rx="12"/>
  <text x="545" y="74" text-anchor="middle" class="t-b t-a">East Asia (Hong Kong)</text>
  <text x="545" y="92" text-anchor="middle" class="t-sm t-mute">region cặp, thường cùng geography</text>
  <rect class="box" x="403" y="106" width="88" height="66" rx="8"/>
  <text x="447" y="134" text-anchor="middle" class="t-b">Zone 1</text>
  <text x="447" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <rect class="box" x="501" y="106" width="88" height="66" rx="8"/>
  <text x="545" y="134" text-anchor="middle" class="t-b">Zone 2</text>
  <text x="545" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <rect class="box" x="599" y="106" width="88" height="66" rx="8"/>
  <text x="643" y="134" text-anchor="middle" class="t-b">Zone 3</text>
  <text x="643" y="154" text-anchor="middle" class="t-sm t-mute">datacenter</text>
  <text x="545" y="200" text-anchor="middle" class="t-sm">cập nhật nền tảng lần lượt</text>
  <text x="545" y="220" text-anchor="middle" class="t-sm">từng region trong cặp</text>

  <text x="360" y="128" text-anchor="middle" class="t-sm t-a">region</text>
  <text x="360" y="143" text-anchor="middle" class="t-sm t-a">pair</text>
  <line class="ln-a" x1="329" y1="160" x2="391" y2="160" marker-start="url(#arr-a)" marker-end="url(#arr-a)"/>

  <text x="360" y="274" text-anchor="middle" class="t-sm t-mute">Zonal: ghim vào 1 zone · Zone-redundant (ZRS, Standard LB/Public IP): trải trên các zone</text>
  <text x="360" y="294" text-anchor="middle" class="t-sm t-mute">GRS / GZRS: sao chép dữ liệu sang region cặp</text>
</svg>
<figcaption>Hình 1. Availability zone bảo vệ khỏi sự cố <em>một datacenter</em> trong cùng region; region pair (Southeast Asia ⇄ East Asia) bảo vệ khỏi sự cố <em>cả region</em> và là đích sao chép của GRS/GZRS.</figcaption>
</figure>

<h4>Region</h4>
<ul>
  <li>Region là vùng địa lý chứa một hoặc nhiều datacenter. Khi tạo resource bạn chọn region (trừ dịch vụ global như Microsoft Entra ID, Azure DNS, Front Door, Traffic Manager).</li>
  <li>Không phải dịch vụ / VM size nào cũng có ở mọi region. Chọn region dựa trên: vị trí người dùng (độ trễ), data residency, dịch vụ có sẵn, giá.</li>
</ul>

<h4>Availability zone (AZ)</h4>
<ul>
  <li>Mỗi region hỗ trợ AZ có <strong>tối thiểu 3 zone</strong> tách biệt vật lý, mỗi zone có nguồn điện, làm mát và mạng độc lập.</li>
  <li>Bảo vệ khỏi sự cố cấp datacenter. SLA VM: 2+ VM trải trên 2+ zone đạt <strong>99,99%</strong>; availability set đạt 99,95%.</li>
  <li>Số zone logic (1, 2, 3) trong subscription của bạn có thể ánh xạ tới zone vật lý khác với subscription khác.</li>
</ul>
<table>
  <thead><tr><th>Kiểu triển khai</th><th>Ý nghĩa</th><th>Ví dụ</th></tr></thead>
  <tbody>
    <tr><td>Zonal</td><td>Ghim resource vào một zone cụ thể</td><td>VM ở zone 1, managed disk zonal</td></tr>
    <tr><td>Zone-redundant</td><td>Nền tảng tự nhân bản qua nhiều zone</td><td>Storage ZRS, Standard Load Balancer / Public IP Standard zone-redundant</td></tr>
    <tr><td>Non-zonal (regional)</td><td>Không cam kết zone</td><td>Resource tạo không chọn zone</td></tr>
  </tbody>
</table>

<h4>Region pair</h4>
<ul>
  <li>Nhiều region được ghép cặp với một region khác <strong>trong cùng geography</strong> (ngoại lệ nổi tiếng: Brazil South ghép với South Central US, nhưng chỉ <em>một chiều</em>: South Central US lại ghép với North Central US). Phần lớn cặp là đối xứng (vd. East US ⇄ West US).</li>
  <li>Lợi ích: cập nhật nền tảng được triển khai <strong>lần lượt từng region trong cặp</strong>; khi có sự cố diện rộng, một region trong mỗi cặp được ưu tiên khôi phục; một số dịch vụ dùng cặp để nhân bản (vd. <strong>GRS/GZRS</strong> của storage sao chép sang region cặp).</li>
  <li>Một số region mới hơn <strong>không có cặp</strong> và dựa vào availability zone để đạt độ sẵn sàng cao.</li>
</ul>

<h4>Sovereign region</h4>
<ul>
  <li><strong>Azure Government</strong>: dành cho cơ quan chính phủ Mỹ và đối tác, tách biệt vật lý và logic, nhân sự được thẩm tra.</li>
  <li><strong>Azure operated by 21Vianet</strong> (Azure tại Trung Quốc): do 21Vianet vận hành, Microsoft không trực tiếp vận hành.</li>
  <li>Sovereign cloud có endpoint, portal và tenant riêng, không dùng chung tài khoản với Azure toàn cầu.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Bảo vệ ứng dụng khỏi sự cố của <em>một datacenter</em>" → <strong>availability zone</strong>. "Bảo vệ khỏi sự cố của <em>cả region</em>" → triển khai sang <strong>region khác</strong> (thường là region pair) với GRS / Azure Site Recovery. Availability set chỉ bảo vệ trong <em>một</em> datacenter (fault domain / update domain).</div>
`
    },
    {
      id: 'management-infra',
      unit: 'Describe Azure management infrastructure',
      title: 'Hạ tầng quản lý: resource, resource group, subscription, management group',
      html: `
<figure class="fig">
<svg class="dg" viewBox="0 0 720 396" role="img" aria-label="Hệ phân cấp tenant root group, management group, subscription, resource group, resource và cơ chế kế thừa của RBAC, Policy, lock, tag">
  <text x="420" y="20" text-anchor="middle" class="t-b">RBAC</text>
  <text x="500" y="20" text-anchor="middle" class="t-b">Policy</text>
  <text x="580" y="20" text-anchor="middle" class="t-b">Lock</text>
  <text x="660" y="20" text-anchor="middle" class="t-b">Tag</text>
  <text x="660" y="36" text-anchor="middle" class="t-sm t-x">không kế thừa</text>

  <rect class="box-e" x="40" y="44" width="260" height="44" rx="8"/>
  <text x="170" y="63" text-anchor="middle" class="t-b">Tenant root group</text>
  <text x="170" y="80" text-anchor="middle" class="t-sm t-mute">ID = tenant ID</text>
  <rect class="box-a" x="40" y="112" width="260" height="44" rx="8"/>
  <text x="170" y="131" text-anchor="middle" class="t-b">Management group</text>
  <text x="170" y="148" text-anchor="middle" class="t-sm t-mute">tối đa 6 cấp dưới root</text>
  <rect class="box-a" x="40" y="180" width="260" height="44" rx="8"/>
  <text x="170" y="199" text-anchor="middle" class="t-b">Subscription</text>
  <text x="170" y="216" text-anchor="middle" class="t-sm t-mute">ranh giới billing và quota</text>
  <rect class="box" x="40" y="248" width="260" height="44" rx="8"/>
  <text x="170" y="267" text-anchor="middle" class="t-b">Resource group</text>
  <text x="170" y="284" text-anchor="middle" class="t-sm t-mute">cùng vòng đời, không lồng nhau</text>
  <rect class="box" x="40" y="316" width="260" height="44" rx="8"/>
  <text x="170" y="335" text-anchor="middle" class="t-b">Resource</text>
  <text x="170" y="352" text-anchor="middle" class="t-sm t-mute">VM, VNet, storage account…</text>

  <line class="ln" x1="170" y1="88" x2="170" y2="108" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="156" x2="170" y2="176" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="224" x2="170" y2="244" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="292" x2="170" y2="312" marker-end="url(#arr)"/>

  <line class="zone" x1="310" y1="66" x2="700" y2="66"/>
  <line class="zone" x1="310" y1="134" x2="700" y2="134"/>
  <line class="zone" x1="310" y1="202" x2="700" y2="202"/>
  <line class="zone" x1="310" y1="270" x2="700" y2="270"/>
  <line class="zone" x1="310" y1="338" x2="700" y2="338"/>

  <line class="ln-a" x1="420" y1="73" x2="420" y2="362" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="500" y1="73" x2="500" y2="362" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="580" y1="209" x2="580" y2="362" marker-end="url(#arr-a)"/>

  <circle class="box-a" cx="420" cy="66" r="7"/><circle class="box-a" cx="420" cy="134" r="7"/><circle class="box-a" cx="420" cy="202" r="7"/><circle class="box-a" cx="420" cy="270" r="7"/><circle class="box-a" cx="420" cy="338" r="7"/>
  <circle class="box-a" cx="500" cy="66" r="7"/><circle class="box-a" cx="500" cy="134" r="7"/><circle class="box-a" cx="500" cy="202" r="7"/><circle class="box-a" cx="500" cy="270" r="7"/><circle class="box-a" cx="500" cy="338" r="7"/>
  <circle class="box-a" cx="580" cy="202" r="7"/><circle class="box-a" cx="580" cy="270" r="7"/><circle class="box-a" cx="580" cy="338" r="7"/>
  <circle class="box-w" cx="660" cy="202" r="7"/><circle class="box-w" cx="660" cy="270" r="7"/><circle class="box-w" cx="660" cy="338" r="7"/>
  <rect class="box" x="556" y="56" width="48" height="20" rx="6"/><text x="580" y="70" text-anchor="middle" class="t-sm t-mute">không</text>
  <rect class="box" x="556" y="124" width="48" height="20" rx="6"/><text x="580" y="138" text-anchor="middle" class="t-sm t-mute">không</text>
  <rect class="box" x="636" y="56" width="48" height="20" rx="6"/><text x="660" y="70" text-anchor="middle" class="t-sm t-mute">không</text>
  <rect class="box" x="636" y="124" width="48" height="20" rx="6"/><text x="660" y="138" text-anchor="middle" class="t-sm t-mute">không</text>

  <text x="360" y="388" text-anchor="middle" class="t-sm t-mute">● đặt được ở cấp này · mũi tên: kế thừa xuống mọi cấp con · ô “không”: không hỗ trợ ở cấp này</text>
</svg>
<figcaption>Hình 1. RBAC và Azure Policy gán được ở mọi cấp và kế thừa xuống; lock chỉ đặt từ subscription trở xuống (vẫn kế thừa); tag gắn được ở subscription, RG, resource nhưng <strong>không</strong> tự kế thừa (cần Policy).</figcaption>
</figure>

<h4>Resource</h4>
<p>Thực thể quản lý được: VM, disk, NIC, VNet, storage account, Key Vault… Mỗi resource có <strong>resource ID</strong> dạng:</p>
<pre><code>/subscriptions/&lt;subId&gt;/resourceGroups/&lt;rg&gt;/providers/Microsoft.Compute/virtualMachines/vm1</code></pre>

<h4>Resource group (RG)</h4>
<ul>
  <li>Mỗi resource thuộc <strong>đúng một</strong> RG. RG <strong>không lồng nhau</strong> được.</li>
  <li>RG có location riêng (nơi lưu <em>metadata</em>), nhưng resource bên trong có thể ở <strong>region khác</strong>. Nếu region của RG gặp sự cố, bạn không cập nhật được metadata của resource dù resource vẫn chạy.</li>
  <li>Xóa RG = xóa <strong>toàn bộ</strong> resource bên trong. Gom các resource có <strong>cùng vòng đời</strong> vào một RG.</li>
  <li><strong>Không đổi tên</strong> RG được. Giới hạn: <strong>980 RG</strong> mỗi subscription.</li>
  <li>RG là scope phổ biến để gán RBAC, Policy, lock, budget.</li>
</ul>

<h4>Subscription và management group</h4>
<ul>
  <li>Subscription gom RG; là ranh giới billing và quota.</li>
  <li>Management group gom nhiều subscription để áp RBAC / Policy hàng loạt (chi tiết ở mục mở rộng).</li>
</ul>

<h4>Lệnh cơ bản</h4>
<pre><code># Azure CLI
az group create --name rg-app-prod --location southeastasia --tags env=prod
az group list --query "[].{name:name, loc:location}" -o table
az resource list -g rg-app-prod -o table
az group delete --name rg-app-prod --yes --no-wait

# Azure PowerShell
New-AzResourceGroup -Name rg-app-prod -Location southeastasia -Tag @{env='prod'}
Get-AzResource -ResourceGroupName rg-app-prod
Remove-AzResourceGroup -Name rg-app-prod -Force</code></pre>

<h4>Scope và kế thừa</h4>
<table>
  <thead><tr><th>Cơ chế</th><th>Scope áp được</th><th>Kế thừa xuống dưới?</th></tr></thead>
  <tbody>
    <tr><td>Azure RBAC</td><td>MG, subscription, RG, resource</td><td>Có</td></tr>
    <tr><td>Azure Policy</td><td>MG, subscription, RG, resource</td><td>Có (có thể exclude scope con)</td></tr>
    <tr><td>Resource lock</td><td>Subscription, RG, resource (<strong>không</strong> đặt ở MG)</td><td>Có</td></tr>
    <tr><td>Tag</td><td>Subscription, RG, resource (<strong>không</strong> đặt ở MG)</td><td><strong>Không</strong> (cần Policy để kế thừa)</td></tr>
    <tr><td>Budget</td><td>MG, subscription, RG (và billing scope)</td><td>Tính tổng chi phí trong scope</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi "cần áp cùng policy cho 30 subscription với ít công sức nhất" → gom các subscription vào <strong>một management group</strong> rồi gán policy ở đó. Câu hỏi "RG ở East US, VM có thể ở West Europe không?" → <strong>có</strong>.</div>
`
    },
    {
      id: 'management-groups',
      extra: true,
      title: 'Management groups: giới hạn, phân cấp và quyền',
      html: `
<h4>Các con số bắt buộc nhớ</h4>
<table>
  <thead><tr><th>Mục</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Số management group mỗi directory (tenant)</td><td><strong>10.000</strong></td></tr>
    <tr><td>Độ sâu cây</td><td><strong>6 cấp</strong>, <em>không tính</em> root và cấp subscription</td></tr>
    <tr><td>Số parent của mỗi MG / subscription</td><td><strong>Đúng 1</strong></td></tr>
    <tr><td>Số con của mỗi MG</td><td>Nhiều</td></tr>
    <tr><td>Role assignment mỗi management group</td><td>500 (cố định)</td></tr>
  </tbody>
</table>

<h4>Tenant root group</h4>
<ul>
  <li>Mỗi tenant có đúng một root MG, tên hiển thị mặc định <strong>Tenant root group</strong>, ID <strong>bằng tenant ID</strong>. Không thể di chuyển hay xóa.</li>
  <li><strong>Không ai</strong> có quyền mặc định trên root MG. <strong>Global Administrator</strong> phải <em>elevate access</em> (Microsoft Entra ID → Properties → "Access management for Azure resources" = Yes) để nhận <strong>User Access Administrator</strong> tại scope root <code>/</code>, rồi gán quyền cho người khác.</li>
  <li>Subscription mới mặc định nằm dưới root MG (có thể đổi "default management group" trong <em>Hierarchy settings</em>; ở đó cũng bật được yêu cầu quyền để tạo MG mới).</li>
</ul>

<h4>ID và tên hiển thị</h4>
<p>Mỗi MG có <strong>ID (name)</strong> không đổi được sau khi tạo và <strong>display name</strong> đổi được. Custom role và script phải tham chiếu <strong>ID</strong>: <code>/providers/Microsoft.Management/managementGroups/&lt;id&gt;</code>.</p>

<h4>Quyền thao tác</h4>
<table>
  <thead><tr><th>Role</th><th>Tạo / đổi tên / xóa MG</th><th>Gán quyền</th><th>Gán policy</th></tr></thead>
  <tbody>
    <tr><td>Owner</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>Contributor</td><td>Có</td><td>Không</td><td>Không</td></tr>
    <tr><td>Management Group Contributor</td><td>Có</td><td>Không</td><td>Không</td></tr>
    <tr><td>Management Group Reader / Reader</td><td>Chỉ đọc</td><td>Không</td><td>Không</td></tr>
    <tr><td>Resource Policy Contributor</td><td>Không</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>
<p><strong>Di chuyển subscription sang MG khác</strong> cần: quyền ghi MG + quyền ghi role assignment trên <em>subscription</em> (vd. Owner của subscription), và quyền ghi MG trên <em>parent cũ</em> và <em>parent mới</em> (Owner / Contributor / Management Group Contributor). Ngoại lệ: nếu parent cũ hoặc mới là root MG thì không cần quyền trên root.</p>

<h4>Lệnh</h4>
<pre><code># Azure CLI
az account management-group create --name mg-prod --display-name "Production"
az account management-group update --name mg-prod --parent mg-corp
az account management-group subscription add --name mg-prod --subscription &lt;subId&gt;

# Azure PowerShell
New-AzManagementGroup -GroupName mg-prod -DisplayName "Production"
New-AzManagementGroupSubscription -GroupName mg-prod -SubscriptionId &lt;subId&gt;</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo management group và đưa subscription vào</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở dịch vụ Management groups:<br><span class="path">Azure portal › All services › Management + governance › Management groups</span></li>
    <li>Bấm nút tạo management group (quickstart trên Learn ghi là <strong>+ Add management group</strong>; portal mới có thể hiển thị là <strong>+ Create</strong>). Lần tạo MG đầu tiên trong tenant có thể mất tới 15 phút vì dịch vụ phải khởi tạo cây.
      <div class="blade">
        <div class="blade-title">Create management group</div>
        <div class="pf"><label>Tùy chọn</label><span class="pv radio">Create new</span></div>
        <div class="pf"><label></label><span class="pv">Use existing</span></div>
        <div class="pf"><label class="req">Management group ID</label><span class="pv">mg-prod</span></div>
        <div class="pf"><label>Management group display name</label><span class="pv">Production</span></div>
        <div class="pf"><label></label><span class="pv note">ID không đổi được sau khi tạo; display name đổi được bất cứ lúc nào</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Mở MG vừa tạo (<code>Production</code>), bấm <strong>Add subscription</strong> trên thanh lệnh:
      <div class="blade">
        <div class="blade-title">Add subscription</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">sub-prod-01 (xxxxxxxx-…)</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Muốn chuyển subscription sang MG khác: ở MG cha hiện tại, bấm <strong>…</strong> cuối dòng subscription › <strong>Move</strong> › chọn <em>New parent management group ID</em> › <strong>Save</strong>.</li>
    <li>Kiểm tra quyền kế thừa: mở subscription › <strong>Access control (IAM)</strong> › tab <strong>Role assignments</strong>; assignment gán ở MG hiển thị là kế thừa. Nếu cây chưa cập nhật, refresh trình duyệt (cache tới 30 phút).</li>
  </ol></div>
</div>

<div class="callout warn"><strong>Lưu ý</strong>Azure Resource Manager cache cây MG tới khoảng 30 phút, nên portal có thể chưa hiển thị ngay sau khi move. Tag và resource lock <strong>không</strong> áp được trên management group.</div>

<div class="callout exam"><strong>Bẫy thi</strong>"Tối đa bao nhiêu cấp?" → <strong>6</strong> (không tính root). Một subscription <strong>không thể</strong> thuộc hai MG cùng lúc. Custom role chỉ được khai báo <strong>một</strong> management group trong <code>AssignableScopes</code>.</div>
`
    },
    {
      id: 'move-resources',
      extra: true,
      title: 'Di chuyển resource giữa resource group / subscription',
      html: `
<p>Di chuyển (move) chỉ đổi <strong>resource group / subscription</strong> chứa resource. Nó <strong>không đổi region</strong> (muốn đổi region dùng <strong>Azure Resource Mover</strong> hoặc tạo lại). Resource vẫn chạy bình thường, không downtime.</p>

<h4>Điều kiện trước khi move</h4>
<ol>
  <li>Subscription nguồn và đích đều <strong>Active</strong> và <strong>cùng Microsoft Entra tenant</strong>.</li>
  <li>Resource type <strong>hỗ trợ move</strong> (xem bảng "move support"). Một số dịch vụ có giới hạn riêng (App Service, VM, networking, Recovery Services vault…).</li>
  <li>Subscription đích đã <strong>register resource provider</strong> tương ứng (<code>az provider register --namespace Microsoft.Compute</code>).</li>
  <li>Subscription đích còn đủ <strong>quota</strong>.</li>
  <li>Quyền tối thiểu: <code>Microsoft.Resources/subscriptions/resourceGroups/moveResources/action</code> trên RG nguồn và <code>Microsoft.Resources/subscriptions/resourceGroups/write</code> trên RG đích.</li>
  <li>Khi move <strong>sang subscription khác</strong>: resource và các resource phụ thuộc phải ở <strong>cùng một RG</strong> và move <strong>cùng lúc</strong> (vd. VM + managed disk + NIC + VNet + public IP…).</li>
  <li><strong>ReadOnly lock</strong> trên RG nguồn, RG đích hoặc subscription sẽ chặn move.</li>
</ol>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 310" role="img" aria-label="Di chuyển VM cùng disk và NIC từ rg-old ở subscription A sang rg-new ở subscription B">
  <rect class="zone" x="10" y="10" width="300" height="220" rx="12"/>
  <text x="160" y="32" text-anchor="middle" class="t-sm t-mute">Subscription A (tenant Contoso)</text>
  <rect class="box-w" x="25" y="44" width="270" height="172" rx="10"/>
  <text x="160" y="66" text-anchor="middle" class="t-b">rg-old</text>
  <text x="160" y="83" text-anchor="middle" class="t-sm t-w">bị khóa trong lúc move (≤ 4 giờ)</text>
  <rect class="box" x="45" y="96" width="230" height="30" rx="6"/>
  <text x="160" y="116" text-anchor="middle" class="t-sm">vm1 (Microsoft.Compute)</text>
  <rect class="box" x="45" y="134" width="230" height="30" rx="6"/>
  <text x="160" y="154" text-anchor="middle" class="t-sm">vm1-osdisk (managed disk)</text>
  <rect class="box" x="45" y="172" width="230" height="30" rx="6"/>
  <text x="160" y="192" text-anchor="middle" class="t-sm">vm1-nic, vnet, public IP…</text>

  <rect class="zone" x="410" y="10" width="300" height="220" rx="12"/>
  <text x="560" y="32" text-anchor="middle" class="t-sm t-mute">Subscription B (cùng tenant Contoso)</text>
  <rect class="box-w" x="425" y="44" width="270" height="172" rx="10"/>
  <text x="560" y="66" text-anchor="middle" class="t-b">rg-new</text>
  <text x="560" y="83" text-anchor="middle" class="t-sm t-w">bị khóa trong lúc move (≤ 4 giờ)</text>
  <rect class="box-s" x="445" y="96" width="230" height="30" rx="6"/>
  <text x="560" y="116" text-anchor="middle" class="t-sm">vm1 (region không đổi)</text>
  <rect class="box-s" x="445" y="134" width="230" height="30" rx="6"/>
  <text x="560" y="154" text-anchor="middle" class="t-sm">vm1-osdisk</text>
  <rect class="box-s" x="445" y="172" width="230" height="30" rx="6"/>
  <text x="560" y="192" text-anchor="middle" class="t-sm">vm1-nic, vnet, public IP…</text>

  <text x="360" y="118" text-anchor="middle" class="t-sm t-a">move cùng</text>
  <text x="360" y="132" text-anchor="middle" class="t-sm t-a">một request</text>
  <line class="ln-a" x1="300" y1="148" x2="421" y2="148" marker-end="url(#arr-a)"/>
  <text x="360" y="168" text-anchor="middle" class="t-sm t-mute">≤ 800 resource</text>

  <rect class="box-x" x="10" y="246" width="340" height="56" rx="10"/>
  <text x="180" y="270" text-anchor="middle" class="t-b t-x">Role assignment gán trực tiếp trên vm1</text>
  <text x="180" y="290" text-anchor="middle" class="t-sm">không đi theo (orphaned), phải gán lại</text>
  <rect class="box-a" x="370" y="246" width="340" height="56" rx="10"/>
  <text x="540" y="270" text-anchor="middle" class="t-b t-a">Resource ID thay đổi</text>
  <text x="540" y="290" text-anchor="middle" class="t-sm">/subscriptions/B/resourceGroups/rg-new/…</text>
</svg>
<figcaption>Hình 1. Move sang subscription khác: VM và mọi resource phụ thuộc phải nằm chung một RG nguồn và đi trong cùng một request. Cả hai RG bị khóa trong lúc move; sau move, resource ID đổi và role assignment gắn trực tiếp không đi theo.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: di chuyển resource sang resource group khác</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở resource group nguồn và đánh dấu các resource cần move (hoặc checkbox đầu bảng để chọn tất cả):<br><span class="path">Azure portal › Resource groups › rg-old › Overview</span></li>
    <li>Bấm <strong>Move</strong> trên thanh lệnh. Menu này có ba lựa chọn: chuyển sang <em>resource group</em> khác, sang <em>subscription</em> khác, hoặc sang <em>region</em> khác (lựa chọn cuối dùng Azure Resource Mover).</li>
    <li>Chọn đích. Source tự điền; chỉ định subscription (nếu đổi subscription) và resource group đích:
      <div class="blade">
        <div class="blade-title">Move resources</div>
        <div class="blade-sec">Target</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">sub-prod-01</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-new</span></div>
        <div class="pf"><label></label><span class="pv note">Có thể bấm Create new để tạo RG đích ngay tại đây</span></div>
        <div class="pbtns"><span class="pbtn primary">Next</span></div>
      </div>
    </li>
    <li>Portal tự <strong>validate</strong> (kiểm tra resource type hỗ trợ move, resource phụ thuộc, provider đã register, policy ở đích). Chờ tất cả báo <em>Succeeded</em> rồi bấm <strong>Next</strong>.</li>
    <li>Ở bước cuối, đánh dấu ô xác nhận rằng công cụ và script tham chiếu resource ID cũ cần cập nhật, rồi bấm <strong>Move</strong>. Theo dõi kết quả ở <em>Notifications</em>.</li>
  </ol></div>
</div>

<h4>Trong khi move</h4>
<ul>
  <li>Cả <strong>RG nguồn và RG đích bị khóa</strong>: không tạo, xóa, cập nhật resource (vd. không đổi size VM) và không xóa được RG. Khóa có thể kéo dài <strong>tối đa 4 giờ</strong>.</li>
  <li>Hai RG này không tham gia move khác đồng thời.</li>
  <li>Tối đa <strong>800 resource</strong> trong một lần move (vượt sẽ bị từ chối ngay).</li>
  <li>Chỉ chỉ định resource cha; resource con (vd. VM extension) đi theo cha.</li>
</ul>

<h4>Sau khi move: cái gì đổi, cái gì mất?</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Kết quả</th></tr></thead>
  <tbody>
    <tr><td>Resource ID</td><td><strong>Thay đổi</strong> (đổi phần subscription và/hoặc resourceGroups). Cập nhật script, dashboard, template, alert tham chiếu ID cũ.</td></tr>
    <tr><td>Region</td><td>Không đổi</td></tr>
    <tr><td>Tag của chính resource</td><td>Đi theo resource</td></tr>
    <tr><td>Role assignment gán trực tiếp trên resource</td><td><strong>Không đi theo</strong>, trở thành orphaned; phải gán lại</td></tr>
    <tr><td>RBAC / Policy / tag kế thừa từ RG nguồn</td><td>Không còn; resource nhận RBAC / Policy của RG đích</td></tr>
    <tr><td>Policy của scope đích</td><td>Được kiểm tra khi validate; vi phạm sẽ lỗi <code>RequestDisallowedByPolicy</code></td></tr>
  </tbody>
</table>
<p><strong>Không thể move cả resource group sang subscription khác</strong>; bạn move <em>toàn bộ resource</em> sang một RG ở subscription đích.</p>

<h4>Lệnh</h4>
<pre><code># Azure CLI: move sang RG khác (thêm --destination-subscription-id để đổi subscription)
vm=$(az resource show -g rg-old -n vm1 --resource-type Microsoft.Compute/virtualMachines --query id -o tsv)
az resource move --destination-group rg-new --ids $vm

# Kiểm tra trước (không thực sự move)
az resource invoke-action --action validateMoveResources --ids "/subscriptions/&lt;sub&gt;/resourceGroups/rg-old" --request-body "..."

# Azure PowerShell
$r = Get-AzResource -ResourceGroupName rg-old -Name vm1
Move-AzResource -DestinationResourceGroupName rg-new -ResourceId $r.ResourceId
Move-AzResource -DestinationSubscriptionId &lt;subId&gt; -DestinationResourceGroupName rg-new -ResourceId $r.ResourceId</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>Lỗi <code>MissingMoveDependentResources</code> nghĩa là thiếu resource phụ thuộc trong request. Lỗi "subscription isn't registered for a resource type" → register provider ở subscription đích. Move giữa hai tenant khác nhau là <strong>không làm được</strong> bằng move: phải chuyển subscription sang tenant đó trước hoặc tạo lại resource.</div>
`
    }
  ],
  keyFacts: [
    'Region hỗ trợ availability zone có <strong>tối thiểu 3 zone</strong>; VM trải trên 2+ zone có SLA <strong>99,99%</strong>.',
    'Region pair nằm trong cùng geography (ngoại lệ: Brazil South → South Central US, ghép một chiều); cập nhật nền tảng được triển khai lần lượt từng region của cặp; GRS sao chép sang region cặp.',
    'Sovereign cloud: <strong>Azure Government</strong> (Mỹ) và <strong>Azure operated by 21Vianet</strong> (Trung Quốc).',
    'Một subscription tin cậy <strong>đúng một</strong> Microsoft Entra tenant; một tenant có nhiều subscription.',
    'Management group: <strong>10.000</strong> MG mỗi tenant, sâu tối đa <strong>6 cấp</strong> (không tính root và subscription), mỗi MG/subscription chỉ có <strong>1 parent</strong>.',
    'Root management group có ID = tenant ID; không ai có quyền mặc định; Global Administrator phải <strong>elevate access</strong> để nhận User Access Administrator ở scope <code>/</code>.',
    'Tối đa <strong>980 resource group</strong> mỗi subscription; RG không lồng nhau và không đổi tên được; resource có thể ở region khác RG.',
    'Khi move: RG nguồn và đích bị khóa tối đa <strong>4 giờ</strong>; tối đa <strong>800 resource</strong> mỗi lần move; <strong>resource ID thay đổi</strong>, region không đổi.',
    'Move giữa subscription yêu cầu cùng tenant, provider đã register ở đích, resource phụ thuộc move cùng lúc; ReadOnly lock chặn move.',
    'Role assignment gán trực tiếp trên resource <strong>không đi theo</strong> khi move; tag của chính resource thì đi theo.'
  ],
  traps: [
    'Nhầm "6 cấp" là tính cả root. Thực tế root và cấp subscription <strong>không</strong> được tính vào giới hạn 6 cấp.',
    'Cho rằng move resource sẽ đổi region. Sai: move chỉ đổi RG/subscription; đổi region cần <strong>Azure Resource Mover</strong> hoặc triển khai lại.',
    'Nghĩ có thể move nguyên một resource group sang subscription khác. Phải move <strong>các resource</strong> vào một RG có sẵn ở subscription đích.',
    'Nghĩ RG bị khóa khi move nghĩa là VM ngừng chạy. Resource vẫn hoạt động; chỉ các thao tác tạo/sửa/xóa trong hai RG bị chặn.',
    'Đặt resource lock hoặc tag ở management group. Lock và tag chỉ đặt được ở subscription, RG, resource.',
    'Cho rằng Global Administrator mặc định có quyền trên mọi subscription. Phải <strong>elevate access</strong> mới có User Access Administrator ở root.',
    'Chọn availability set để chống sự cố mất cả datacenter. Availability set chỉ phân tán trong một datacenter; cần <strong>availability zone</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Zone trong region hỗ trợ AZ</td><td>≥ 3</td></tr>
    <tr><td>SLA VM qua 2+ zone / availability set</td><td>99,99% / 99,95%</td></tr>
    <tr><td>Management group</td><td>10.000 / tenant · 6 cấp (không tính root) · 1 parent</td></tr>
    <tr><td>Root MG</td><td>ID = tenant ID · elevate access để quản lý</td></tr>
    <tr><td>Resource group / subscription</td><td>980</td></tr>
    <tr><td>Move</td><td>Cùng tenant · khóa RG ≤ 4 giờ · ≤ 800 resource · resource ID đổi</td></tr>
    <tr><td>Lệnh move</td><td><code>az resource move</code> / <code>Move-AzResource</code></td></tr>
    <tr><td>Kế thừa</td><td>RBAC, Policy, Lock: có · Tag: không</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Region hỗ trợ availability zone có tối thiểu bao nhiêu zone?', back: '<strong>3</strong> zone tách biệt vật lý, mỗi zone có điện, làm mát, mạng độc lập.' },
    { front: 'Region pair mang lại lợi ích gì?', back: 'Cập nhật nền tảng lần lượt từng region; ưu tiên khôi phục một region trong cặp khi sự cố diện rộng; dịch vụ như GRS nhân bản sang region cặp.' },
    { front: 'Hai sovereign cloud chính của Azure?', back: '<strong>Azure Government</strong> (Mỹ) và <strong>Azure operated by 21Vianet</strong> (Trung Quốc).' },
    { front: 'Một subscription liên kết được với bao nhiêu tenant?', back: '<strong>Một</strong>. Một tenant có thể chứa nhiều subscription.' },
    { front: 'Giới hạn management group?', back: '<strong>10.000</strong> MG mỗi tenant, sâu <strong>6 cấp</strong> (không tính root và subscription), mỗi node 1 parent.' },
    { front: 'ID của tenant root group là gì?', back: 'Bằng <strong>tenant ID</strong> của Microsoft Entra.' },
    { front: 'Làm sao Global Administrator quản lý được root management group?', back: 'Bật <strong>Access management for Azure resources</strong> (elevate access) để nhận User Access Administrator ở scope <code>/</code>.' },
    { front: 'Số resource group tối đa mỗi subscription?', back: '<strong>980</strong>.' },
    { front: 'Khi move resource, RG nguồn/đích bị khóa bao lâu?', back: 'Tối đa <strong>4 giờ</strong>; không tạo/sửa/xóa resource trong hai RG đó, nhưng resource vẫn chạy.' },
    { front: 'Tối đa bao nhiêu resource trong một lần move?', back: '<strong>800</strong>.' },
    { front: 'Sau khi move, resource ID có đổi không?', back: '<strong>Có</strong>. Phải cập nhật script, dashboard, template dùng ID cũ.' },
    { front: 'Role assignment gán trực tiếp trên resource có đi theo khi move không?', back: '<strong>Không</strong>. Nó trở thành orphaned, phải gán lại ở vị trí mới.' },
    { front: 'Lỗi "subscription isn\'t registered for a resource type" khi move?', back: 'Register resource provider ở <strong>subscription đích</strong>: <code>az provider register --namespace ...</code>' },
    { front: 'Muốn đổi region của resource thì dùng gì?', back: '<strong>Azure Resource Mover</strong> (hoặc triển khai lại). Move giữa RG/subscription không đổi region.' },
    { front: 'Role nào tạo được MG nhưng không gán được quyền/policy?', back: '<strong>Management Group Contributor</strong> (và Contributor).' },
    { front: 'Đổi directory (tenant) của subscription thì role assignment ra sao?', back: '<strong>Bị xóa toàn bộ</strong>, kể cả custom role; phải gán lại trong tenant mới.' }
  ],
  quiz: [
    {
      q: 'Công ty có 40 subscription cho các phòng ban. Bạn cần đảm bảo mọi resource mới chỉ được tạo ở hai region được phép, với ít công sức quản trị nhất. Bạn nên làm gì?',
      options: ['Gán policy Allowed locations trên từng subscription', 'Tạo một management group chứa 40 subscription và gán policy Allowed locations ở management group', 'Đặt resource lock ReadOnly trên các region không được phép', 'Tạo custom RBAC role chỉ cho phép hai region'],
      answer: [1],
      explain: 'Policy gán ở management group được kế thừa xuống mọi subscription bên dưới, chỉ cần một assignment. Gán từng subscription tốn 40 lần thao tác. Lock không áp cho region và không chặn tạo resource mới theo vị trí. RBAC không lọc theo thuộc tính location của resource.'
    },
    {
      q: 'Bạn thiết kế cây management group cho một tập đoàn. Phát biểu nào ĐÚNG? (Chọn 2)',
      options: ['Cây có thể sâu tối đa 6 cấp, không tính root và cấp subscription', 'Một subscription có thể thuộc hai management group để chia sẻ policy', 'Một tenant hỗ trợ tối đa 10.000 management group', 'Có thể đặt resource lock CanNotDelete trên management group'],
      answer: [0, 2],
      explain: 'Giới hạn là 6 cấp (không tính root và subscription) và 10.000 MG mỗi tenant. Mỗi subscription chỉ có đúng một parent. Lock chỉ đặt được ở subscription, resource group và resource, không đặt ở management group.'
    },
    {
      q: 'Bạn là Global Administrator của tenant nhưng không thấy quyền quản lý tenant root group. Bạn cần gán Owner trên root management group cho một admin khác. Việc đầu tiên cần làm là gì?',
      options: ['Gán vai trò Privileged Role Administrator cho chính mình', 'Tạo một management group mới làm parent của root', 'Bật Access management for Azure resources (elevate access) trong Microsoft Entra ID', 'Liên hệ Microsoft Support để chuyển quyền root'],
      answer: [2],
      explain: 'Không ai có quyền mặc định trên root MG. Global Administrator elevate access để nhận User Access Administrator ở scope gốc, sau đó gán role cho người khác. Privileged Role Administrator là role Microsoft Entra, không cấp quyền Azure RBAC. Root không thể có parent; không cần Support.'
    },
    {
      q: 'Bạn di chuyển VM1 (kèm disk, NIC) từ RG1 sang RG2 trong cùng subscription. Trong khi thao tác đang chạy, người dùng có thể làm gì?',
      options: ['Đổi size của VM1', 'Tạo storage account mới trong RG1', 'Xóa RG2', 'Kết nối RDP vào VM1 và sử dụng bình thường'],
      answer: [3],
      explain: 'Move khóa cả RG nguồn và đích: không tạo, cập nhật hay xóa resource và không xóa RG. Tuy nhiên resource vẫn chạy nên ứng dụng và kết nối tới VM1 không bị gián đoạn.'
    },
    {
      q: 'Sau khi move storage account từ subscription Sub1 sang Sub2 (cùng tenant), điều nào sau đây xảy ra? (Chọn 2)',
      options: ['Resource ID của storage account thay đổi', 'Storage account được sao chép sang region pair', 'Role assignment gán trực tiếp trên storage account phải được tạo lại', 'Tag của storage account bị xóa'],
      answer: [0, 2],
      explain: 'Resource ID chứa subscription ID và tên RG nên thay đổi. Role assignment gán trực tiếp trên resource không đi theo và phải gán lại. Move không đổi region, không nhân bản dữ liệu. Tag là thuộc tính của chính resource nên đi theo.'
    },
    {
      q: 'Bạn cần move resource từ subscription thuộc tenant Contoso sang subscription thuộc tenant Fabrikam. Lệnh <code>az resource move</code> thất bại. Nguyên nhân là gì?',
      options: ['Hai subscription không cùng Microsoft Entra tenant', 'Chưa tạo management group chung', 'Resource có tag', 'Không dùng Azure PowerShell'],
      answer: [0],
      explain: 'Move giữa subscription yêu cầu cả hai cùng một tenant. Management group không liên quan đến điều kiện move; tag không cản trở; CLI và PowerShell có cùng khả năng.'
    },
    {
      q: 'Khi move VM sang subscription mới, bạn nhận lỗi rằng subscription đích chưa được đăng ký cho resource type. Cách khắc phục?',
      options: ['Gán Owner cho bạn trên subscription nguồn', 'Tạo lại VM ở subscription đích', 'Xóa lock trên subscription nguồn', 'Register resource provider (vd. Microsoft.Compute) ở subscription đích'],
      answer: [3],
      explain: 'Lỗi này xuất hiện khi subscription đích chưa từng dùng resource type đó. Chạy <code>az provider register</code> hoặc <code>Register-AzResourceProvider</code> ở subscription đích. Quyền ở nguồn và lock không gây ra lỗi này; tạo lại VM là không cần thiết.'
    },
    {
      q: 'RG-Prod có resource lock ReadOnly. Bạn cần move một web app từ RG-Prod sang RG-Archive. Điều gì xảy ra?',
      options: ['Move thành công vì lock chỉ chặn xóa', 'Move bị chặn do lock ReadOnly trên RG nguồn', 'Move thành công và lock đi theo web app', 'Move thành công nhưng web app bị dừng'],
      answer: [1],
      explain: 'Read-only lock trên RG nguồn, RG đích hoặc subscription chặn việc move resource vào hoặc ra. Phải gỡ lock trước. Lock ReadOnly chặn cả cập nhật, không chỉ xóa.'
    },
    {
      q: 'Ứng dụng chạy trên hai VM ở region East US. Bạn cần đảm bảo ứng dụng vẫn hoạt động nếu một datacenter trong region bị mất điện, SLA cao nhất có thể. Bạn chọn gì?',
      options: ['Đặt hai VM trong một availability set', 'Đặt hai VM ở hai region pair', 'Đặt hai VM ở hai availability zone khác nhau', 'Dùng một VM với Premium SSD'],
      answer: [2],
      explain: 'Availability zone tách biệt về điện, làm mát, mạng nên chống được sự cố một datacenter và cho SLA 99,99%. Availability set chỉ phân tán trong một datacenter (99,95%). Triển khai hai region là giải pháp chống sự cố cả region, vượt yêu cầu và phức tạp hơn. Một VM không đáp ứng.'
    },
    {
      q: 'Phát biểu nào về resource group là ĐÚNG?',
      options: ['Resource trong RG phải cùng region với RG', 'Có thể đổi tên RG khi không có resource bên trong', 'Một resource có thể thuộc hai RG', 'Xóa RG sẽ xóa mọi resource bên trong'],
      answer: [3],
      explain: 'Xóa RG xóa toàn bộ resource bên trong. Resource có thể ở region khác RG (RG chỉ lưu metadata ở region của nó). RG không đổi tên được, kể cả khi rỗng. Mỗi resource thuộc đúng một RG.'
    },
    {
      q: 'Bạn cần chuyển subscription Sub-Dev từ management group MG-A sang MG-B. Bạn có Owner trên Sub-Dev và Management Group Contributor trên MG-B. Còn thiếu quyền nào?',
      options: ['Quyền ghi management group trên MG-A (parent hiện tại)', 'Global Administrator trong Microsoft Entra ID', 'Owner trên tenant root group', 'Không thiếu quyền nào'],
      answer: [0],
      explain: 'Move cần quyền ghi management group trên cả parent hiện tại lẫn parent mới, cùng quyền trên subscription. Quyền trên tenant root group không cần thiết (kể cả khi root là parent cũ hoặc mới, yêu cầu quyền cũng được miễn). Global Administrator không phải điều kiện.'
    },
    {
      q: 'Bạn cần move một VM dùng managed disk và NIC sang subscription khác. Disk và NIC đang nằm ở RG khác với VM. Bạn nên làm gì?',
      options: ['Move VM trước, rồi move disk và NIC sau', 'Gom VM, disk, NIC vào cùng một RG, rồi move tất cả cùng lúc sang subscription đích', 'Snapshot disk rồi tạo VM mới là cách duy nhất', 'Move không hỗ trợ VM'],
      answer: [1],
      explain: 'Với move giữa subscription, resource và resource phụ thuộc phải nằm cùng RG và được move cùng nhau. Quy trình chuẩn: gom vào một RG, move sang subscription đích, sau đó có thể phân bổ lại RG. Move riêng lẻ sẽ lỗi MissingMoveDependentResources. VM có hỗ trợ move.'
    },
    {
      q: 'Công ty cần tách riêng chi phí và quyền truy cập cho môi trường Production và Development, đồng thời tránh để quota vCPU của Dev ảnh hưởng tới Prod. Giải pháp phù hợp nhất?',
      options: ['Hai resource group trong cùng subscription', 'Hai tag env=prod và env=dev', 'Hai subscription riêng, có thể đặt dưới một management group', 'Hai region khác nhau trong cùng subscription'],
      answer: [2],
      explain: 'Subscription là ranh giới billing, access control và quota. Resource group và tag giúp tổ chức nhưng quota vẫn dùng chung trong subscription. Khác region không tách chi phí hay quyền.'
    }
  ]
});

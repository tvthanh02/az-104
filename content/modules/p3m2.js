AZ.addModule({
  id: 'p3m2',
  summary: 'Network security group (NSG) là tường lửa lớp 3/4 có trạng thái (stateful) của Azure, gắn vào subnet hoặc NIC để cho phép/chặn lưu lượng theo 5-tuple. Module này đi sâu vào thứ tự xử lý rule, default rules, service tag, application security group (ASG), cách đọc effective security rules, và hai chủ đề hay đi kèm trong đề: Azure Bastion và service endpoint vs private endpoint.',
  objectives: [
    'Giải thích cách NSG gắn vào subnet và NIC, và thứ tự đánh giá inbound/outbound khi có cả hai',
    'Đọc và viết NSG rule: priority 100–4096, default rules 65000/65001/65500, service tag, augmented rule',
    'Dùng effective security rules và IP flow verify để chẩn đoán lưu lượng bị chặn',
    'Thiết kế rule theo tầng ứng dụng bằng application security group và nắm ràng buộc cùng VNet',
    'Chọn SKU Azure Bastion phù hợp và cấu hình AzureBastionSubnet',
    'So sánh service endpoint và private endpoint (phạm vi, DNS, truy cập từ on-premises, chi phí)'
  ],
  sections: [
    {
      id: 'implement-nsg',
      unit: 'Implement network security groups',
      title: 'NSG là gì và gắn vào đâu?',
      html: `
<p><strong>Network security group (NSG)</strong> chứa danh sách <strong>security rule</strong> cho phép (Allow) hoặc chặn (Deny) lưu lượng inbound/outbound dựa trên <strong>5-tuple</strong>: source IP, source port, destination IP, destination port, protocol. NSG là resource độc lập, thuộc một region và chỉ gắn được vào subnet/NIC <strong>cùng region</strong>.</p>

<h4>Gắn NSG ở đâu?</h4>
<div class="compare">
  <div><strong>Subnet</strong>Áp dụng cho mọi tài nguyên trong subnet, kể cả VM tạo sau. Cách khuyến nghị để quản lý tập trung, ít rule hơn.</div>
  <div><strong>Network interface (NIC)</strong>Áp dụng cho riêng một NIC. Dùng khi một VM cần ngoại lệ so với cả subnet.</div>
</div>
<ul>
  <li>Mỗi subnet và mỗi NIC gắn <strong>tối đa một NSG</strong>.</li>
  <li>Một NSG có thể gắn vào <strong>nhiều</strong> subnet và NIC cùng lúc.</li>
  <li>Không có NSG nào → mọi lưu lượng được phép (trong giới hạn routing). Riêng Standard public IP/Standard LB thì inbound mặc định bị chặn nếu không có NSG cho phép.</li>
  <li>Không gắn NSG vào <code>GatewaySubnet</code>. <code>AzureBastionSubnet</code> có thể gắn NSG nhưng phải đủ rule bắt buộc.</li>
</ul>

<h4>Thứ tự xử lý khi có cả NSG subnet và NSG NIC</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 230" role="img" aria-label="Thứ tự NSG inbound: subnet rồi NIC; outbound: NIC rồi subnet">
  <text x="20" y="63" class="t-b t-a">INBOUND</text>
  <rect class="box" x="110" y="30" width="110" height="56" rx="10"/>
  <text x="165" y="54" text-anchor="middle" class="t-b">Nguồn</text>
  <text x="165" y="72" text-anchor="middle" class="t-sm t-mute">Internet/VNet</text>
  <rect class="box-w" x="260" y="30" width="140" height="56" rx="10"/>
  <text x="330" y="54" text-anchor="middle" class="t-b">NSG subnet</text>
  <text x="330" y="72" text-anchor="middle" class="t-sm">① xét trước</text>
  <rect class="box-w" x="440" y="30" width="140" height="56" rx="10"/>
  <text x="510" y="54" text-anchor="middle" class="t-b">NSG NIC</text>
  <text x="510" y="72" text-anchor="middle" class="t-sm">② xét sau</text>
  <rect class="box-a" x="620" y="30" width="80" height="56" rx="10"/>
  <text x="660" y="63" text-anchor="middle" class="t-b">VM</text>
  <line class="ln-a" x1="220" y1="58" x2="256" y2="58" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="400" y1="58" x2="436" y2="58" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="580" y1="58" x2="616" y2="58" marker-end="url(#arr-a)"/>

  <text x="20" y="163" class="t-b t-a">OUTBOUND</text>
  <rect class="box-a" x="110" y="130" width="110" height="56" rx="10"/>
  <text x="165" y="163" text-anchor="middle" class="t-b">VM</text>
  <rect class="box-w" x="260" y="130" width="140" height="56" rx="10"/>
  <text x="330" y="154" text-anchor="middle" class="t-b">NSG NIC</text>
  <text x="330" y="172" text-anchor="middle" class="t-sm">① xét trước</text>
  <rect class="box-w" x="440" y="130" width="140" height="56" rx="10"/>
  <text x="510" y="154" text-anchor="middle" class="t-b">NSG subnet</text>
  <text x="510" y="172" text-anchor="middle" class="t-sm">② xét sau</text>
  <rect class="box" x="620" y="130" width="80" height="56" rx="10"/>
  <text x="660" y="163" text-anchor="middle" class="t-b">Đích</text>
  <line class="ln-a" x1="220" y1="158" x2="256" y2="158" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="400" y1="158" x2="436" y2="158" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="580" y1="158" x2="616" y2="158" marker-end="url(#arr-a)"/>

  <text x="360" y="216" text-anchor="middle" class="t-sm t-x t-b">Phải Allow ở CẢ HAI NSG; chỉ một NSG Deny là gói tin bị chặn.</text>
</svg>
<figcaption>Hình 1. NSG gần nguồn được xét trước: inbound đi qua NSG của subnet rồi tới NSG của NIC; outbound thì ngược lại.</figcaption>
</figure>
<p>Lưu lượng phải được <strong>Allow ở cả hai</strong> NSG mới đi qua. Chỉ cần một NSG Deny là bị chặn.</p>
<ul>
  <li>Inbound: subnet NSG Allow nhưng NIC NSG Deny → bị chặn tại NIC.</li>
  <li>Inbound: subnet NSG Deny → không bao giờ tới NIC NSG.</li>
  <li>Lưu lượng <strong>giữa hai VM trong cùng subnet</strong> vẫn bị NSG của subnet đánh giá (outbound của nguồn và inbound của đích).</li>
</ul>

<h4>Stateful</h4>
<p>NSG lưu <strong>flow record</strong> cho mỗi kết nối. Nếu inbound 443 được phép, gói tin trả lời tự động được cho qua, không cần rule outbound tương ứng (và ngược lại). Khi bạn xóa/sửa rule, <strong>kết nối đang có không bị ngắt</strong>; chỉ kết nối mới chịu rule mới.</p>

<h4>Lưu lượng nền tảng Azure</h4>
<p>Các dịch vụ hạ tầng qua <code>168.63.129.16</code> và <code>169.254.169.254</code> (DHCP, DNS, IMDS, health probe) mặc định không bị NSG chặn, trừ khi bạn chặn rõ bằng service tag tương ứng.</p>

<h4>Lệnh cơ bản</h4>
<pre><code>az network nsg create -g rg-net -n nsg-web
# Gắn vào subnet
az network vnet subnet update -g rg-net --vnet-name vnet-prod -n snet-web --network-security-group nsg-web
# Gắn vào NIC
az network nic update -g rg-net -n vm1-nic --network-security-group nsg-web</code></pre>

<div class="callout exam"><strong>Góc thi</strong>Câu "subnet NSG cho phép 80, NIC NSG không có rule nào cho 80, Internet vào được không?" → <strong>Không</strong>, vì NIC NSG vẫn còn default rule <code>DenyAllInBound</code>. Phải Allow ở cả hai cấp.</div>
`
    },
    {
      id: 'nsg-rules',
      unit: 'Determine network security group rules',
      title: 'Security rule, priority và default rules',
      html: `
<h4>Thuộc tính của một rule</h4>
<table>
  <thead><tr><th>Thuộc tính</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Name</td><td>Duy nhất trong NSG, tối đa 80 ký tự</td></tr>
    <tr><td>Priority</td><td><strong>100 – 4096</strong>; số nhỏ hơn được xét trước</td></tr>
    <tr><td>Source / Destination</td><td>Any, IP, CIDR, <strong>service tag</strong>, <strong>application security group</strong></td></tr>
    <tr><td>Protocol</td><td>TCP, UDP, ICMP, ESP, AH, Any</td></tr>
    <tr><td>Port range</td><td>Một port, dải (10000-10005) hoặc danh sách (80, 443)</td></tr>
    <tr><td>Direction</td><td>Inbound hoặc Outbound</td></tr>
    <tr><td>Action</td><td>Allow hoặc Deny</td></tr>
  </tbody>
</table>
<p>Rule được xét theo thứ tự priority. <strong>Khớp rule nào thì dừng ở rule đó</strong>; các rule phía sau không được xét. Không thể có hai rule cùng priority và cùng direction trong một NSG.</p>

<h4>Default rules (không xóa được, chỉ ghi đè bằng priority thấp hơn)</h4>
<table>
  <thead><tr><th>Hướng</th><th>Tên</th><th>Priority</th><th>Source → Destination</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>Inbound</td><td>AllowVnetInBound</td><td>65000</td><td>VirtualNetwork → VirtualNetwork</td><td>Allow</td></tr>
    <tr><td>Inbound</td><td>AllowAzureLoadBalancerInBound</td><td>65001</td><td>AzureLoadBalancer → Any</td><td>Allow</td></tr>
    <tr><td>Inbound</td><td>DenyAllInBound</td><td>65500</td><td>Any → Any</td><td>Deny</td></tr>
    <tr><td>Outbound</td><td>AllowVnetOutBound</td><td>65000</td><td>VirtualNetwork → VirtualNetwork</td><td>Allow</td></tr>
    <tr><td>Outbound</td><td>AllowInternetOutBound</td><td>65001</td><td>Any → Internet</td><td>Allow</td></tr>
    <tr><td>Outbound</td><td>DenyAllOutBound</td><td>65500</td><td>Any → Any</td><td>Deny</td></tr>
  </tbody>
</table>
<p>Hệ quả: theo mặc định, mọi VM trong VNet (và VNet peering, on-premises qua gateway, vì đều nằm trong tag <code>VirtualNetwork</code>) nói chuyện được với nhau; Internet <strong>không</strong> vào được; VM ra Internet được.</p>

<h4>Service tag</h4>
<p><strong>Service tag</strong> đại diện cho một nhóm prefix IP do Microsoft quản lý và tự cập nhật. Hay gặp:</p>
<ul>
  <li><code>VirtualNetwork</code>: address space VNet, VNet peering, dải on-premises qua gateway, IP <code>168.63.129.16</code>.</li>
  <li><code>Internet</code>: mọi IP công cộng ngoài VNet.</li>
  <li><code>AzureLoadBalancer</code>: nguồn health probe của load balancer.</li>
  <li><code>Storage</code>, <code>Sql</code>, <code>AzureKeyVault</code>, <code>AzureMonitor</code>…; nhiều tag có biến thể theo region như <code>Storage.WestEurope</code>.</li>
  <li><code>GatewayManager</code>, <code>AzureCloud</code>, <code>AzureTrafficManager</code>, <code>AzureFrontDoor.Backend</code>.</li>
</ul>

<h4>Augmented security rules</h4>
<p>Một rule có thể chứa <strong>nhiều IP/CIDR</strong> và <strong>nhiều port/dải port</strong>, giúp giảm số rule. Tuy nhiên <strong>không</strong> đặt được nhiều service tag hay nhiều ASG trong cùng một trường của một rule.</p>

<h4>Ví dụ đọc rule</h4>
<table>
  <thead><tr><th>Priority</th><th>Tên</th><th>Port</th><th>Source</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>100</td><td>Deny-RDP-All</td><td>3389</td><td>Any</td><td>Deny</td></tr>
    <tr><td>200</td><td>Allow-RDP-Admin</td><td>3389</td><td>203.0.113.10</td><td>Allow</td></tr>
  </tbody>
</table>
<p>Admin từ 203.0.113.10 <strong>bị chặn</strong>, vì rule 100 khớp trước. Muốn cho admin vào thì rule Allow phải có priority <strong>nhỏ hơn</strong> 100… nhưng 100 đã là mức thấp nhất, nên phải đổi rule Deny sang priority lớn hơn (ví dụ 300).</p>

<div class="callout exam"><strong>Bẫy thi</strong>Nhầm chiều priority: <strong>số nhỏ = ưu tiên cao</strong>. Rule priority 4096 là rule bị xét cuối cùng trong các rule tự tạo, nhưng vẫn trước default rules (65000+).</div>
`
    },
    {
      id: 'effective-rules',
      unit: 'Determine network security group effective rules',
      title: 'Effective security rules và chẩn đoán',
      html: `
<p>Khi một VM có NSG ở cả subnet và NIC, tự đọc từng NSG rất dễ nhầm. Azure cung cấp <strong>effective security rules</strong>: tổng hợp mọi rule thực sự áp dụng lên một NIC, đã mở rộng service tag thành dải IP cụ thể.</p>

<h4>Xem effective security rules</h4>
<ul>
  <li>Portal: <em>VM &gt; Networking &gt; Network settings &gt; Effective security rules</em>, hoặc <em>Network interface &gt; Effective security rules</em>.</li>
  <li>VM phải đang <strong>chạy</strong> (Running) thì mới xem được.</li>
  <li>Kết quả hiển thị riêng phần của NSG subnet và NSG NIC, có thể tải về CSV.</li>
</ul>
<pre><code>az network nic list-effective-nsg -g rg-net -n vm1-nic

Get-AzEffectiveNetworkSecurityGroup -NetworkInterfaceName vm1-nic -ResourceGroupName rg-net</code></pre>

<h4>Công cụ Network Watcher liên quan</h4>
<table>
  <thead><tr><th>Công cụ</th><th>Trả lời câu hỏi</th></tr></thead>
  <tbody>
    <tr><td><strong>IP flow verify</strong></td><td>Một gói tin (5-tuple) tới/từ VM được Allow hay Deny, và <strong>bởi rule nào</strong>?</td></tr>
    <tr><td><strong>NSG diagnostics</strong></td><td>Đánh giá lưu lượng qua mọi NSG trên đường đi, gợi ý rule cần thêm.</td></tr>
    <tr><td><strong>Effective routes</strong></td><td>Lưu lượng đi theo route nào (hữu ích khi nghi do UDR chứ không phải NSG).</td></tr>
    <tr><td><strong>Connection troubleshoot</strong></td><td>Kiểm tra kết nối đầu cuối tới một IP/FQDN/port.</td></tr>
    <tr><td><strong>VNet flow logs</strong></td><td>Ghi log luồng để phân tích. NSG flow logs không cho tạo mới và sẽ retire 30/09/2027.</td></tr>
  </tbody>
</table>

<h4>Ví dụ đánh giá</h4>
<p>VM1 trong Subnet1. NSG-Subnet1: priority 100 Allow TCP 80 từ Internet. NSG-NIC1: priority 200 Deny TCP 80 từ Any; priority 300 Allow TCP 443 từ Internet.</p>
<ul>
  <li>HTTP (80) từ Internet: qua subnet (Allow 100) → tới NIC, khớp Deny 200 → <strong>bị chặn</strong>.</li>
  <li>HTTPS (443) từ Internet: subnet NSG không có rule 443 → rơi vào <code>DenyAllInBound</code> 65500 → <strong>bị chặn</strong> trước khi tới NIC.</li>
  <li>RDP (3389) từ VM khác trong VNet: subnet NSG khớp <code>AllowVnetInBound</code> → NIC NSG cũng khớp <code>AllowVnetInBound</code> → <strong>được phép</strong>.</li>
</ul>

<div class="callout tip"><strong>Quy trình chẩn đoán gợi ý</strong>1) IP flow verify để biết rule nào chặn. 2) Effective security rules để thấy toàn cảnh. 3) Nếu NSG cho phép mà vẫn không tới → kiểm tra effective routes (UDR, NVA) và firewall trong hệ điều hành.</div>
<div class="callout exam"><strong>Góc thi</strong>"Cần xác định rule NSG nào đang chặn lưu lượng tới VM, ít công sức nhất" → <strong>IP flow verify</strong>. "Cần xem tổng hợp mọi rule áp dụng cho NIC" → <strong>Effective security rules</strong>.</div>
`
    },
    {
      id: 'create-rules',
      unit: 'Create network security group rules',
      title: 'Tạo NSG rule',
      html: `
<p>Trên portal: <em>NSG &gt; Inbound security rules / Outbound security rules &gt; Add</em>. Portal có sẵn danh sách <strong>Service</strong> (HTTP, HTTPS, RDP, SSH, MS SQL…) để tự điền port và protocol.</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo NSG, thêm rule HTTPS và gắn vào subnet</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tạo NSG (khi tìm kiếm, chọn <strong>Network security groups</strong>, không chọn bản <em>classic</em>):<br><span class="path">Azure portal › Network security groups › + Create</span>
      <div class="blade">
        <div class="blade-title">Create network security group</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-net</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Network security group name</label><span class="pv">nsg-web</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">Southeast Asia</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Mở <code>nsg-web</code>, thêm rule inbound:<br><span class="path">nsg-web › Settings › Inbound security rules › + Add</span>
      <div class="blade">
        <div class="blade-title">Add inbound security rule</div>
        <div class="pf"><label>Source</label><span class="pv sel">Service Tag</span></div>
        <div class="pf"><label>Source service tag</label><span class="pv sel">Internet</span></div>
        <div class="pf"><label>Source port ranges</label><span class="pv">*</span></div>
        <div class="pf"><label>Destination</label><span class="pv sel">Any</span></div>
        <div class="pf"><label>Service</label><span class="pv sel">HTTPS</span></div>
        <div class="pf"><label>Destination port ranges</label><span class="pv">443</span></div>
        <div class="pf"><label>Protocol</label><span class="pv radio">TCP</span></div>
        <div class="pf"><label>Action</label><span class="pv radio">Allow</span></div>
        <div class="pf"><label class="req">Priority</label><span class="pv">100</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">Allow-HTTPS-Internet</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn Service = HTTPS thì portal tự điền port 443 và protocol TCP.</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Gắn NSG vào subnet:<br><span class="path">nsg-web › Settings › Subnets › + Associate</span>
      <div class="blade">
        <div class="blade-title">Associate subnet</div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-prod (rg-net)</span></div>
        <div class="pf"><label class="req">Subnet</label><span class="pv sel">snet-web</span></div>
        <div class="pbtns"><span class="pbtn primary">OK</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Kiểm chứng: mở một VM trong <code>snet-web</code> › <strong>Networking</strong> › <strong>Network settings</strong>, xem phần rule của NSG subnet và <em>Effective security rules</em>.</li>
  </ol>
  </div>
</div>

<h4>Azure CLI</h4>
<pre><code># Cho phép HTTP/HTTPS từ Internet (augmented: nhiều port trong một rule)
az network nsg rule create -g rg-net --nsg-name nsg-web -n Allow-Web \\
  --priority 100 --direction Inbound --access Allow --protocol Tcp \\
  --source-address-prefixes Internet --source-port-ranges '*' \\
  --destination-address-prefixes '*' --destination-port-ranges 80 443

# Chỉ cho RDP từ hai dải IP văn phòng
az network nsg rule create -g rg-net --nsg-name nsg-web -n Allow-RDP-Office \\
  --priority 110 --access Allow --protocol Tcp --direction Inbound \\
  --source-address-prefixes 203.0.113.0/27 198.51.100.0/28 \\
  --destination-port-ranges 3389

# Chặn VM ra Internet nhưng vẫn cho đi Storage
az network nsg rule create -g rg-net --nsg-name nsg-web -n Allow-Storage-Out \\
  --priority 100 --direction Outbound --access Allow \\
  --destination-address-prefixes Storage --destination-port-ranges 443 --protocol Tcp
az network nsg rule create -g rg-net --nsg-name nsg-web -n Deny-Internet-Out \\
  --priority 200 --direction Outbound --access Deny \\
  --destination-address-prefixes Internet --destination-port-ranges '*' --protocol '*'</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>$rule = New-AzNetworkSecurityRuleConfig -Name Allow-HTTPS -Priority 100 -Direction Inbound -Access Allow -Protocol Tcp -SourceAddressPrefix Internet -SourcePortRange * -DestinationAddressPrefix * -DestinationPortRange 443
New-AzNetworkSecurityGroup -Name nsg-web -ResourceGroupName rg-net -Location southeastasia -SecurityRules $rule

# Thêm rule vào NSG có sẵn
$nsg = Get-AzNetworkSecurityGroup -Name nsg-web -ResourceGroupName rg-net
Add-AzNetworkSecurityRuleConfig -NetworkSecurityGroup $nsg -Name Allow-SSH -Priority 120 -Direction Inbound -Access Allow -Protocol Tcp -SourceAddressPrefix 203.0.113.0/27 -SourcePortRange * -DestinationAddressPrefix * -DestinationPortRange 22
$nsg | Set-AzNetworkSecurityGroup</code></pre>

<h4>Thực hành tốt</h4>
<ul>
  <li>Đánh số priority <strong>cách quãng</strong> (100, 110, 120…) để chèn rule sau này.</li>
  <li>Ưu tiên <strong>service tag</strong> và <strong>ASG</strong> thay cho IP cứng.</li>
  <li>Không mở RDP/SSH ra Internet; dùng <strong>Azure Bastion</strong> hoặc Just-in-time VM access (Defender for Cloud).</li>
  <li>Destination trong rule inbound là <strong>private IP</strong> của VM (NSG xử lý sau khi Azure dịch public IP sang private IP).</li>
  <li>Giới hạn hiện hành (trang Azure limits): tối đa <strong>5.000 NSG</strong> mỗi subscription mỗi region; tối đa <strong>2.000 rule mỗi NSG</strong> (mô hình classic cũ: 1.000).</li>
</ul>

<div class="callout warn"><strong>Lưu ý cổng 25</strong>Outbound SMTP trực tiếp trên TCP 25 bị chặn ở nền tảng với hầu hết loại subscription (Pay-as-you-go, MSDN, Free trial, CSP…), bất kể NSG cho phép. Dùng dịch vụ SMTP relay (thường cổng 587).</div>
`
    },
    {
      id: 'asg',
      unit: 'Implement application security groups',
      title: 'Application security group (ASG)',
      html: `
<p><strong>Application security group (ASG)</strong> cho phép nhóm các NIC theo <em>vai trò ứng dụng</em> (web, logic, db) và dùng tên nhóm làm source/destination trong NSG rule thay vì IP. Khi thêm VM mới, chỉ cần gắn NIC vào ASG, rule tự áp dụng.</p>

<h4>Ví dụ ba tầng</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Ba ASG web, logic, db và các luồng được phép theo cổng">
  <rect class="zone" x="150" y="20" width="560" height="255" rx="12"/>
  <text x="165" y="42" class="t-sm t-mute">VNet · một NSG gắn trên subnet, rule dùng ASG làm source/destination</text>

  <rect class="box" x="10" y="95" width="90" height="50" rx="10"/>
  <text x="55" y="125" text-anchor="middle" class="t-b">Internet</text>

  <rect class="box-a" x="170" y="60" width="150" height="120" rx="10"/>
  <text x="245" y="86" text-anchor="middle" class="t-b t-a">AsgWeb</text>
  <rect class="box" x="185" y="100" width="120" height="28" rx="6"/>
  <text x="245" y="119" text-anchor="middle" class="t-sm">NIC1 · web1</text>
  <rect class="box" x="185" y="138" width="120" height="28" rx="6"/>
  <text x="245" y="157" text-anchor="middle" class="t-sm">NIC2 · web2</text>

  <rect class="box-a" x="365" y="60" width="150" height="120" rx="10"/>
  <text x="440" y="86" text-anchor="middle" class="t-b t-a">AsgLogic</text>
  <rect class="box" x="380" y="100" width="120" height="28" rx="6"/>
  <text x="440" y="119" text-anchor="middle" class="t-sm">NIC3 · app1</text>

  <rect class="box-a" x="560" y="60" width="140" height="120" rx="10"/>
  <text x="630" y="86" text-anchor="middle" class="t-b t-a">AsgDb</text>
  <rect class="box" x="575" y="100" width="110" height="28" rx="6"/>
  <text x="630" y="119" text-anchor="middle" class="t-sm">NIC4 · sql1</text>

  <line class="ln-s" x1="100" y1="120" x2="166" y2="120" marker-end="url(#arr-s)"/>
  <text x="124" y="110" text-anchor="middle" class="t-sm t-s">80, 443</text>
  <line class="ln-s" x1="320" y1="120" x2="361" y2="120" marker-end="url(#arr-s)"/>
  <text x="342" y="110" text-anchor="middle" class="t-sm t-s">8080</text>
  <line class="ln-s" x1="515" y1="120" x2="556" y2="120" marker-end="url(#arr-s)"/>
  <text x="537" y="110" text-anchor="middle" class="t-sm t-s">1433</text>

  <rect class="box" x="365" y="215" width="150" height="40" rx="8"/>
  <text x="440" y="240" text-anchor="middle" class="t-sm">VM khác trong VNet</text>
  <line class="ln-x dash" x1="515" y1="235" x2="598" y2="184" marker-end="url(#arr-x)"/>
  <text x="540" y="254" class="t-sm t-x">Deny 120</text>
</svg>
<figcaption>Hình 1. NIC được gom theo vai trò. Rule tham chiếu tên ASG nên VM mới chỉ cần gắn NIC vào đúng ASG. Rule Deny 120 chặn các VM khác trong VNet (vốn được <code>AllowVnetInBound</code> cho phép) truy cập DB.</figcaption>
</figure>
<table>
  <thead><tr><th>Priority</th><th>Source</th><th>Destination</th><th>Port</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>100</td><td>Internet</td><td>AsgWeb</td><td>80, 443</td><td>Allow</td></tr>
    <tr><td>110</td><td>AsgLogic</td><td>AsgDb</td><td>1433</td><td>Allow</td></tr>
    <tr><td>120</td><td>Any</td><td>AsgDb</td><td>1433</td><td>Deny</td></tr>
  </tbody>
</table>
<p>Rule 120 cần thiết vì <code>AllowVnetInBound</code> (65000) mặc định cho mọi VM trong VNet truy cập DB.</p>

<h4>Ràng buộc quan trọng</h4>
<ul>
  <li>Mọi NIC trong một ASG phải thuộc <strong>cùng một VNet</strong> với NIC đầu tiên được gắn vào ASG.</li>
  <li>Nếu một rule dùng ASG cho <strong>cả source và destination</strong>, NIC của cả hai ASG phải ở <strong>cùng VNet</strong>.</li>
  <li>Một NIC có thể thuộc <strong>nhiều ASG</strong> (tối đa 20 ASG mỗi IP configuration).</li>
  <li>Một NSG tham chiếu tối đa <strong>100 ASG</strong> trên toàn bộ rule.</li>
  <li>ASG phải cùng region với NIC.</li>
  <li>Rule chỉ ảnh hưởng NIC là thành viên ASG; NIC khác trong cùng subnet không bị ảnh hưởng bởi rule đó.</li>
</ul>

<h4>Lệnh</h4>
<pre><code>az network asg create -g rg-net -n AsgWeb -l southeastasia

az network nic ip-config update -g rg-net --nic-name web1-nic -n ipconfig1 \\
  --application-security-groups AsgWeb

az network nsg rule create -g rg-net --nsg-name nsg-app -n Allow-Web \\
  --priority 100 --access Allow --protocol Tcp --direction Inbound \\
  --source-address-prefixes Internet --destination-asgs AsgWeb \\
  --destination-port-ranges 80 443</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo ASG và gắn NIC của VM</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tạo ASG:<br><span class="path">Azure portal › Application security groups › + Create</span>
      <div class="blade">
        <div class="blade-title">Create an application security group</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-net</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">AsgWeb</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">Southeast Asia</span></div>
        <div class="pf"><label></label><span class="pv note">Region phải trùng region của VM/NIC sẽ gắn vào.</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Gắn NIC của VM web vào ASG:<br><span class="path">Virtual machines › web1 › Networking › Application security groups › Add application security groups</span>
      <div class="blade">
        <div class="blade-title">Add application security groups</div>
        <div class="pf"><label>Application security groups</label><span class="pv chk">AsgWeb</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Trong NSG của subnet, tạo rule inbound với <strong>Destination</strong> = <em>Application security group</em>, <strong>Destination application security groups</strong> = <code>AsgWeb</code>, <strong>Destination port ranges</strong> = <code>80,443</code>, Protocol TCP, Action Allow.</li>
    <li>Lặp lại bước 2 cho <code>web2</code>: không cần sửa rule nào, VM mới tự được rule áp dụng.</li>
  </ol>
  </div>
</div>

<h4>Exercise: triển khai mạng ảo có NSG và ASG</h4>
<ol class="steps">
  <li>Tạo VNet với hai subnet (ví dụ <code>snet-web</code>, <code>snet-mgmt</code>) và hai VM.</li>
  <li>Tạo ASG <code>asg-web</code> và gắn NIC của VM web vào ASG.</li>
  <li>Tạo NSG, thêm rule Allow 80/443 từ Internet tới <code>asg-web</code>, gắn NSG vào <code>snet-web</code>.</li>
  <li>Tạo rule outbound Deny Internet cho VM quản trị (priority 4096) để kiểm thử.</li>
  <li>Kiểm tra bằng effective security rules và IP flow verify.</li>
</ol>

<div class="callout exam"><strong>Góc thi</strong>"Thêm VM web mới mà không phải sửa NSG rule" → dùng <strong>ASG</strong>. "Gắn NIC ở VNet2 vào ASG đang có NIC ở VNet1" → <strong>không được</strong>.</div>
`
    },
    {
      id: 'bastion',
      extra: true,
      title: 'Azure Bastion',
      html: `
<p><strong>Azure Bastion</strong> là dịch vụ PaaS cho phép RDP/SSH vào VM qua <strong>trình duyệt bằng TLS 443</strong> (hoặc native client), VM <strong>không cần public IP</strong> và không phải mở 3389/22 ra Internet. Bastion được triển khai <strong>một lần mỗi VNet</strong> và dùng được cho VM trong VNet đó và VNet peering (trừ Developer SKU).</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 280" role="img" aria-label="Topology Azure Bastion: admin qua TLS 443 tới Bastion, Bastion RDP/SSH tới private IP của VM">
  <rect class="box" x="10" y="105" width="110" height="60" rx="10"/>
  <text x="65" y="131" text-anchor="middle" class="t-b">Admin</text>
  <text x="65" y="150" text-anchor="middle" class="t-sm t-mute">trình duyệt</text>

  <rect class="zone" x="170" y="20" width="360" height="245" rx="12"/>
  <text x="185" y="40" class="t-sm t-mute">vnet-prod</text>

  <rect class="box-w" x="190" y="55" width="150" height="110" rx="10"/>
  <text x="265" y="75" text-anchor="middle" class="t-sm t-b">AzureBastionSubnet</text>
  <text x="265" y="92" text-anchor="middle" class="t-sm">/26 trở lên</text>
  <rect class="box-a" x="205" y="102" width="120" height="50" rx="8"/>
  <text x="265" y="124" text-anchor="middle" class="t-b">Bastion</text>
  <text x="265" y="142" text-anchor="middle" class="t-sm">+ public IP Std</text>

  <rect class="zone" x="380" y="55" width="130" height="190" rx="10"/>
  <text x="445" y="75" text-anchor="middle" class="t-sm t-mute">snet-app</text>
  <rect class="box" x="395" y="90" width="100" height="44" rx="8"/>
  <text x="445" y="109" text-anchor="middle" class="t-b">VM1</text>
  <text x="445" y="126" text-anchor="middle" class="t-sm">10.0.1.4</text>
  <rect class="box" x="395" y="150" width="100" height="44" rx="8"/>
  <text x="445" y="169" text-anchor="middle" class="t-b">VM2</text>
  <text x="445" y="186" text-anchor="middle" class="t-sm">10.0.1.5</text>
  <text x="445" y="225" text-anchor="middle" class="t-sm t-mute">không public IP</text>

  <rect class="zone" x="570" y="70" width="140" height="140" rx="10"/>
  <text x="640" y="90" text-anchor="middle" class="t-sm t-mute">VNet peering</text>
  <rect class="box" x="590" y="120" width="100" height="44" rx="8"/>
  <text x="640" y="139" text-anchor="middle" class="t-b">VM3</text>
  <text x="640" y="156" text-anchor="middle" class="t-sm">10.1.0.4</text>
  <text x="614" y="192" class="t-sm t-mute">Basic trở lên</text>

  <line class="ln-a" x1="120" y1="133" x2="201" y2="127" marker-end="url(#arr-a)"/>
  <text x="145" y="120" text-anchor="middle" class="t-sm t-a">TLS 443</text>
  <line class="ln-s" x1="325" y1="120" x2="391" y2="112" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="325" y1="134" x2="391" y2="170" marker-end="url(#arr-s)"/>
  <path class="ln-s dash" d="M316 152 V252 H602 V168" marker-end="url(#arr-s)"/>
  <text x="306" y="200" text-anchor="end" class="t-sm t-s">RDP/SSH · private IP</text>
  <text x="560" y="272" text-anchor="middle" class="t-sm t-s">qua peering</text>
</svg>
<figcaption>Hình 1. Admin chỉ cần kết nối TLS 443 tới Bastion; Bastion mở phiên RDP/SSH tới <strong>private IP</strong> của VM trong cùng VNet hoặc VNet peering. VM không cần public IP, không phải mở 3389/22 ra Internet.</figcaption>
</figure>

<h4>So sánh SKU</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Developer</th><th>Basic</th><th>Standard</th><th>Premium</th></tr></thead>
  <tbody>
    <tr><td>Chi phí</td><td>Miễn phí</td><td>Trả theo giờ</td><td>Trả theo giờ</td><td>Trả theo giờ</td></tr>
    <tr><td>Cần AzureBastionSubnet</td><td>Không</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>Cần public IP</td><td>Không</td><td>Có</td><td>Có</td><td>Có (trừ private-only)</td></tr>
    <tr><td>VM trong VNet peering</td><td>Không</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>Số instance</td><td>Dùng chung, 1 VM một lúc</td><td>2 cố định</td><td>2–50 (host scaling)</td><td>2–50</td></tr>
    <tr><td>Native client (az CLI), upload/download file</td><td>Không</td><td>Không</td><td>Có</td><td>Có</td></tr>
    <tr><td>IP-based connection, shareable link, custom port</td><td>Không</td><td>Không</td><td>Có</td><td>Có</td></tr>
    <tr><td>Session recording, private-only deployment</td><td>Không</td><td>Không</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>
<p>Mỗi instance phục vụ khoảng 20 phiên RDP hoặc 40 phiên SSH đồng thời. Có thể <strong>nâng</strong> SKU nhưng <strong>không hạ</strong> SKU (phải xóa và tạo lại).</p>

<h4>Yêu cầu triển khai (Basic trở lên)</h4>
<ul>
  <li>Subnet tên <code>AzureBastionSubnet</code>, kích thước <strong>/26 hoặc lớn hơn</strong>, cùng VNet và resource group với bastion, không chứa tài nguyên khác.</li>
  <li>Public IP <strong>Standard, Static</strong>.</li>
  <li>Người dùng cần quyền Reader trên VM, NIC (và VNet peering nếu có) cùng Reader trên resource Bastion.</li>
</ul>

<h4>NSG trên AzureBastionSubnet (nếu gắn)</h4>
<table>
  <thead><tr><th>Hướng</th><th>Rule cần có</th></tr></thead>
  <tbody>
    <tr><td>Inbound</td><td>443 từ <code>Internet</code>; 443 từ <code>GatewayManager</code>; 443 từ <code>AzureLoadBalancer</code>; 8080, 5701 từ <code>VirtualNetwork</code> (data plane nội bộ Bastion)</td></tr>
    <tr><td>Outbound</td><td>22, 3389 tới <code>VirtualNetwork</code>; 443 tới <code>AzureCloud</code>; 8080, 5701 tới <code>VirtualNetwork</code>; 80 tới <code>Internet</code></td></tr>
  </tbody>
</table>
<p>NSG của <strong>VM đích</strong> chỉ cần cho phép RDP/SSH từ dải của AzureBastionSubnet (mặc định <code>AllowVnetInBound</code> đã đủ).</p>

<pre><code>az network bastion create -g rg-net -n bas-prod --vnet-name vnet-prod \\
  --public-ip-address pip-bastion --sku Standard -l southeastasia

# Native client (Standard trở lên)
az network bastion ssh -g rg-net -n bas-prod --target-resource-id &lt;vm-id&gt; \\
  --auth-type ssh-key --username azureuser --ssh-key ~/.ssh/id_rsa</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Admin cần RDP vào VM không có public IP, không mở cổng 3389 ra Internet" → <strong>Azure Bastion</strong>. "Cần kết nối bằng mstsc/SSH client trên máy hoặc upload file" → <strong>Standard</strong>. "Cần ghi lại phiên làm việc" → <strong>Premium</strong>.</div>
`
    },
    {
      id: 'se-vs-pe',
      extra: true,
      title: 'Service endpoints vs Private endpoints',
      html: `
<p>Cả hai giúp VM trong VNet truy cập dịch vụ PaaS (Storage, SQL, Key Vault…) an toàn hơn, nhưng cơ chế khác hẳn nhau.</p>

<h4>Service endpoint</h4>
<ul>
  <li>Bật <strong>ở cấp subnet</strong> cho một <em>loại dịch vụ</em> (ví dụ <code>Microsoft.Storage</code>).</li>
  <li>Lưu lượng từ subnet tới dịch vụ đi tối ưu trên backbone Azure, và dịch vụ nhìn thấy <strong>private IP nguồn của VNet</strong> thay vì public IP.</li>
  <li>Dịch vụ vẫn dùng <strong>public endpoint</strong> (DNS vẫn phân giải ra public IP). Trên dịch vụ, bạn thêm <strong>virtual network rule</strong> để chỉ cho subnet đó truy cập.</li>
  <li>Không tốn phí. Không dùng được từ on-premises (on-prem vẫn đi bằng public IP).</li>
  <li>Muốn giới hạn tới <em>storage account cụ thể</em> (chống rò rỉ dữ liệu) thì dùng thêm <strong>service endpoint policy</strong>.</li>
</ul>

<h4>Private endpoint (Azure Private Link)</h4>
<ul>
  <li>Tạo một <strong>NIC có private IP</strong> trong subnet của bạn, ánh xạ tới <strong>một resource cụ thể</strong> (một storage account, và một sub-resource như <code>blob</code>, <code>file</code>).</li>
  <li>Truy cập được từ <strong>VNet peering, on-premises qua VPN/ExpressRoute</strong>.</li>
  <li>Có thể tắt hoàn toàn public network access của dịch vụ.</li>
  <li>Cần <strong>DNS</strong>: tên <code>mystorage.blob.core.windows.net</code> phải phân giải ra private IP, thường qua private DNS zone <code>privatelink.blob.core.windows.net</code> link vào VNet.</li>
  <li>Tính phí theo giờ và theo dữ liệu.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="So sánh đường đi và DNS của service endpoint và private endpoint">
  <text x="180" y="24" text-anchor="middle" class="t-b t-a">Service endpoint</text>
  <rect class="zone" x="10" y="40" width="140" height="120" rx="10"/>
  <text x="80" y="58" text-anchor="middle" class="t-sm t-mute">snet-app</text>
  <rect class="box" x="25" y="72" width="110" height="40" rx="8"/>
  <text x="80" y="89" text-anchor="middle" class="t-b">VM</text>
  <text x="80" y="105" text-anchor="middle" class="t-sm">10.0.1.4</text>
  <text x="80" y="140" text-anchor="middle" class="t-sm t-a">Microsoft.Storage</text>
  <rect class="box-w" x="220" y="52" width="130" height="80" rx="10"/>
  <text x="285" y="80" text-anchor="middle" class="t-b">Storage</text>
  <text x="285" y="99" text-anchor="middle" class="t-sm">public endpoint</text>
  <text x="285" y="117" text-anchor="middle" class="t-sm">VNet rule: snet-app</text>
  <line class="ln-s" x1="135" y1="92" x2="216" y2="92" marker-end="url(#arr-s)"/>
  <text x="184" y="84" text-anchor="middle" class="t-sm t-s">backbone</text>
  <text x="180" y="192" text-anchor="middle" class="t-sm">nslookup → vẫn ra <tspan class="t-b">public IP</tspan></text>
  <text x="180" y="212" text-anchor="middle" class="t-sm">Phạm vi: cả loại dịch vụ, theo subnet</text>
  <text x="180" y="232" text-anchor="middle" class="t-sm t-x">On-premises: không dùng được</text>
  <text x="180" y="252" text-anchor="middle" class="t-sm t-s">Miễn phí</text>

  <line class="ln dash" x1="360" y1="20" x2="360" y2="280"/>

  <text x="540" y="24" text-anchor="middle" class="t-b t-a">Private endpoint</text>
  <rect class="zone" x="370" y="40" width="220" height="150" rx="10"/>
  <text x="380" y="58" class="t-sm t-mute">vnet-prod</text>
  <rect class="box" x="385" y="70" width="80" height="40" rx="8"/>
  <text x="425" y="87" text-anchor="middle" class="t-b">VM</text>
  <text x="425" y="103" text-anchor="middle" class="t-sm">10.0.1.4</text>
  <rect class="box-a" x="495" y="70" width="80" height="40" rx="8"/>
  <text x="535" y="87" text-anchor="middle" class="t-b">PE</text>
  <text x="535" y="103" text-anchor="middle" class="t-sm">10.0.2.5</text>
  <line class="ln-s" x1="465" y1="90" x2="491" y2="90" marker-end="url(#arr-s)"/>
  <rect class="box-e" x="385" y="130" width="190" height="46" rx="8"/>
  <text x="480" y="149" text-anchor="middle" class="t-sm t-b">Private DNS zone</text>
  <text x="480" y="166" text-anchor="middle" class="t-sm">privatelink.blob… → 10.0.2.5</text>
  <rect class="box-w" x="620" y="60" width="90" height="60" rx="10"/>
  <text x="665" y="85" text-anchor="middle" class="t-b">Storage</text>
  <text x="665" y="103" text-anchor="middle" class="t-sm">1 account</text>
  <line class="ln-s" x1="575" y1="90" x2="616" y2="90" marker-end="url(#arr-s)"/>
  <rect class="box" x="385" y="225" width="120" height="44" rx="8"/>
  <text x="445" y="244" text-anchor="middle" class="t-b">On-premises</text>
  <text x="445" y="261" text-anchor="middle" class="t-sm">VPN / ER</text>
  <line class="ln-s" x1="445" y1="225" x2="445" y2="194" marker-end="url(#arr-s)"/>
  <text x="455" y="212" class="t-sm t-s">truy cập được</text>
  <text x="520" y="242" class="t-sm">Phạm vi: 1 resource</text>
  <text x="520" y="262" class="t-sm t-x">Có phí</text>
</svg>
<figcaption>Hình 1. Service endpoint vẫn đi tới <em>public endpoint</em> của dịch vụ (chỉ đổi đường đi và IP nguồn). Private endpoint đặt một NIC private trong VNet, cần private DNS zone để tên dịch vụ phân giải ra IP private, và dùng được từ on-premises.</figcaption>
</figure>

<h4>Bảng so sánh</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>Service endpoint</th><th>Private endpoint</th></tr></thead>
  <tbody>
    <tr><td>Đích đến</td><td>Public IP của dịch vụ</td><td>Private IP trong VNet của bạn</td></tr>
    <tr><td>Phạm vi</td><td>Cả loại dịch vụ, cấu hình theo subnet</td><td>Một resource cụ thể</td></tr>
    <tr><td>Truy cập từ on-premises</td><td>Không</td><td>Có (VPN/ExpressRoute)</td></tr>
    <tr><td>Truy cập từ VNet peering</td><td>Không trực tiếp (phải bật endpoint ở subnet nguồn)</td><td>Có</td></tr>
    <tr><td>DNS</td><td>Không đổi</td><td>Cần private DNS zone hoặc DNS tùy chỉnh</td></tr>
    <tr><td>Chống data exfiltration</td><td>Cần service endpoint policy</td><td>Có sẵn (gắn với một resource)</td></tr>
    <tr><td>Chi phí</td><td>Miễn phí</td><td>Có phí</td></tr>
    <tr><td>Tắt public access của dịch vụ</td><td>Không (vẫn dùng public endpoint)</td><td>Có</td></tr>
  </tbody>
</table>

<h4>Lệnh</h4>
<pre><code># Service endpoint + network rule trên storage account
az network vnet subnet update -g rg-net --vnet-name vnet-prod -n snet-app \\
  --service-endpoints Microsoft.Storage
az storage account network-rule add -g rg-data --account-name stprod01 \\
  --vnet-name vnet-prod --subnet snet-app

# Private endpoint cho blob
az network private-endpoint create -g rg-net -n pe-stprod01-blob \\
  --vnet-name vnet-prod --subnet snet-pe \\
  --private-connection-resource-id &lt;storage-account-id&gt; \\
  --group-id blob --connection-name stprod01-blob</code></pre>

<div class="callout warn"><strong>DNS là lỗi phổ biến nhất</strong>Tạo private endpoint xong mà VM vẫn đi ra public IP → kiểm tra <code>nslookup mystorage.blob.core.windows.net</code>. Nếu không trả về <code>10.x.x.x</code> thì private DNS zone chưa được link vào VNet, hoặc VNet dùng custom DNS chưa forward về <code>168.63.129.16</code>.</div>
<div class="callout exam"><strong>Góc thi</strong>"Máy on-premises qua VPN cần truy cập storage bằng IP private" → <strong>private endpoint</strong>. "Chỉ subnet A được truy cập storage, miễn phí, ít cấu hình" → <strong>service endpoint</strong> + virtual network rule.</div>
`
    }
  ],
  keyFacts: [
    'NSG gắn vào <strong>subnet</strong> và/hoặc <strong>NIC</strong>; mỗi subnet/NIC tối đa <strong>1 NSG</strong>; một NSG gắn được nhiều nơi; NSG cùng region với tài nguyên.',
    'Inbound: <strong>NSG subnet trước, rồi NSG NIC</strong>. Outbound: <strong>NSG NIC trước, rồi NSG subnet</strong>. Phải Allow ở cả hai.',
    'Priority <strong>100–4096</strong>, số nhỏ xét trước, khớp là dừng.',
    'Default rules: <strong>65000</strong> AllowVnet, <strong>65001</strong> AllowAzureLoadBalancer (inbound) / AllowInternet (outbound), <strong>65500</strong> DenyAll. Không xóa được, chỉ ghi đè.',
    'NSG là <strong>stateful</strong>: chiều trả lời tự được cho phép; sửa rule không cắt kết nối đang có.',
    'Service tag <code>VirtualNetwork</code> gồm address space VNet, VNet peering và dải on-premises qua gateway.',
    'ASG: mọi NIC trong ASG phải <strong>cùng một VNet</strong>; rule dùng ASG ở cả source và destination thì hai ASG phải cùng VNet.',
    'Effective security rules chỉ xem được khi VM <strong>Running</strong>; IP flow verify cho biết rule nào Allow/Deny một 5-tuple.',
    'Azure Bastion: <code>AzureBastionSubnet</code> <strong>/26+</strong>, public IP <strong>Standard Static</strong>; SKU Developer, Basic (2 instance), Standard/Premium (2–50 instance). Chỉ nâng SKU, không hạ.',
    'Native client, shareable link, IP-based connection cần Bastion <strong>Standard</strong>; session recording và private-only cần <strong>Premium</strong>.',
    'Service endpoint: cấp subnet, đích vẫn là public endpoint, miễn phí, không dùng cho on-premises. Private endpoint: private IP trong VNet, một resource cụ thể, cần private DNS zone, dùng được từ on-premises.'
  ],
  traps: [
    'Cho rằng NSG subnet Allow là đủ: nếu NIC có NSG mà không có rule Allow, <code>DenyAllInBound</code> của NIC vẫn chặn.',
    'Nhầm thứ tự priority: rule Deny priority 100 sẽ thắng rule Allow priority 200 cho cùng lưu lượng.',
    'Nghĩ rằng phải tạo rule outbound cho gói tin trả lời: NSG là stateful, không cần.',
    'Thêm NIC từ VNet khác vào cùng ASG: không được, mọi NIC trong ASG phải cùng VNet.',
    'Tạo private endpoint nhưng quên DNS: tên dịch vụ vẫn phân giải ra public IP nên lưu lượng không đi qua private endpoint.',
    'Chọn service endpoint cho yêu cầu truy cập từ on-premises: service endpoint chỉ áp dụng cho lưu lượng xuất phát từ subnet Azure.',
    'Dùng Bastion Basic hoặc Developer khi đề yêu cầu native client/upload file: cần <strong>Standard</strong> trở lên. Developer không hỗ trợ VNet peering.',
    'Gắn NSG vào <code>GatewaySubnet</code>: không được khuyến nghị và có thể làm VPN gateway hỏng.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Gắn NSG</td><td>Subnet và/hoặc NIC, mỗi nơi tối đa 1</td></tr>
    <tr><td>Thứ tự</td><td>In: subnet → NIC · Out: NIC → subnet</td></tr>
    <tr><td>Priority</td><td>100–4096, nhỏ = ưu tiên cao</td></tr>
    <tr><td>Default rules</td><td>65000 VNet · 65001 LB (in) / Internet (out) · 65500 DenyAll</td></tr>
    <tr><td>Chẩn đoán</td><td>IP flow verify (rule nào), Effective security rules (tổng hợp, VM chạy)</td></tr>
    <tr><td>ASG</td><td>Nhóm NIC theo vai trò, cùng VNet</td></tr>
    <tr><td>Bastion</td><td>AzureBastionSubnet /26+, PIP Standard Static; Standard: native client, shareable link; Premium: recording, private-only</td></tr>
    <tr><td>Service endpoint</td><td>Subnet → public endpoint, free, không on-prem</td></tr>
    <tr><td>Private endpoint</td><td>Private IP, 1 resource, cần privatelink DNS zone, on-prem OK</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Thứ tự NSG khi lưu lượng inbound tới VM có NSG ở cả subnet và NIC?', back: '<strong>NSG subnet</strong> trước, sau đó <strong>NSG NIC</strong>. Outbound thì ngược lại.' },
    { front: 'Dải priority của NSG rule tự tạo?', back: '<strong>100 – 4096</strong>. Số nhỏ được xét trước.' },
    { front: 'Ba default inbound rule?', back: 'AllowVnetInBound (65000), AllowAzureLoadBalancerInBound (65001), DenyAllInBound (65500).' },
    { front: 'Ba default outbound rule?', back: 'AllowVnetOutBound (65000), AllowInternetOutBound (65001), DenyAllOutBound (65500).' },
    { front: 'NSG stateful nghĩa là gì?', back: 'Đã cho phép một chiều thì gói tin trả lời của kết nối đó tự được cho qua, không cần rule chiều ngược lại.' },
    { front: 'Augmented security rule là gì?', back: 'Rule chứa nhiều IP/CIDR và nhiều port trong một rule. Không gộp được nhiều service tag/ASG trong cùng trường.' },
    { front: 'Ràng buộc chính của ASG?', back: 'Mọi NIC trong ASG phải thuộc <strong>cùng một VNet</strong>.' },
    { front: 'Công cụ cho biết rule NSG nào chặn một gói tin cụ thể?', back: '<strong>IP flow verify</strong> (Network Watcher).' },
    { front: 'Điều kiện để xem effective security rules?', back: 'VM phải đang <strong>Running</strong>.' },
    { front: 'Yêu cầu subnet và public IP của Azure Bastion?', back: '<code>AzureBastionSubnet</code> /26 trở lên; public IP <strong>Standard, Static</strong>.' },
    { front: 'Bastion SKU nào hỗ trợ native client và shareable link?', back: '<strong>Standard</strong> và Premium.' },
    { front: 'Bastion SKU nào có session recording?', back: '<strong>Premium</strong>.' },
    { front: 'Bastion Developer có những hạn chế gì?', back: 'Miễn phí, dùng chung, 1 kết nối VM một lúc, không hỗ trợ VNet peering, không cần AzureBastionSubnet.' },
    { front: 'Private endpoint cho blob cần private DNS zone tên gì?', back: '<code>privatelink.blob.core.windows.net</code>, link vào VNet.' },
    { front: 'Service endpoint có giúp on-premises truy cập storage qua IP private không?', back: '<strong>Không</strong>. Cần private endpoint.' },
    { front: 'Lệnh CLI xem effective NSG của NIC?', back: '<code>az network nic list-effective-nsg -g RG -n NIC</code>' }
  ],
  quiz: [
    {
      q: 'VM1 nằm trong Subnet1. NSG1 gắn vào Subnet1 có rule priority 100 Allow TCP 80 từ Internet. NSG2 gắn vào NIC của VM1 chỉ có default rules. Người dùng Internet truy cập HTTP tới public IP của VM1. Kết quả?',
      options: ['Được phép vì NSG1 cho phép', 'Bị chặn bởi DenyAllInBound của NSG2', 'Được phép vì NIC NSG chỉ áp dụng cho outbound', 'Bị chặn bởi DenyAllInBound của NSG1'],
      answer: [1],
      explain: 'Inbound qua NSG subnet trước (Allow 80) rồi NSG NIC; NSG2 không có rule Allow nên khớp DenyAllInBound 65500. NIC NSG áp dụng cả hai chiều. NSG1 đã khớp rule Allow 100 nên không rơi xuống DenyAll của NSG1.'
    },
    {
      q: 'NSG1 có hai rule inbound: priority 200 Allow TCP 3389 từ 203.0.113.5; priority 150 Deny TCP 3389 từ Any. Admin từ 203.0.113.5 kết nối RDP. Bạn cần cho admin vào mà vẫn chặn những người khác. Bạn làm gì?',
      options: ['Đổi rule Allow sang priority 100', 'Thêm rule Allow 3389 từ Internet với priority 4096', 'Gắn thêm một NSG thứ hai vào NIC của VM', 'Đổi rule Allow sang priority 300'],
      answer: [0],
      explain: 'Rule Allow cần priority nhỏ hơn rule Deny để được xét trước; 100 nhỏ hơn 150 nên admin được vào, người khác vẫn khớp rule Deny. Đổi Allow sang 300 hay thêm rule 4096 thì rule Deny 150 vẫn khớp trước. Một NIC chỉ gắn được một NSG, và dù có NSG khác thì Deny ở NSG1 vẫn chặn.'
    },
    {
      q: 'Bạn có 20 VM web trong VNet1 và sẽ thêm VM thường xuyên. Bạn muốn rule NSG cho phép HTTPS tới các VM web mà không phải sửa rule khi thêm VM, và không ảnh hưởng VM khác cùng subnet. Bạn nên dùng gì?',
      options: ['Service tag <code>VirtualNetwork</code>', 'Augmented rule liệt kê IP các VM', 'Application security group làm destination', 'NSG riêng cho từng NIC'],
      answer: [2],
      explain: 'ASG nhóm NIC theo vai trò; thêm VM chỉ cần gắn NIC vào ASG. Service tag VirtualNetwork áp cho toàn bộ VNet; augmented rule liệt kê IP phải sửa mỗi lần thêm VM; NSG cho từng NIC tốn công quản lý.'
    },
    {
      q: 'Bạn tạo ASG1 và gắn NIC của VM1 (VNet1). Sau đó gắn NIC của VM2 (VNet2, đã peering với VNet1) vào ASG1. Điều gì xảy ra?',
      options: ['Thành công vì hai VNet đã peering', 'Thành công nếu hai VNet cùng region', 'Thành công nếu ASG1 có tag VirtualNetwork', 'Thất bại vì mọi NIC trong ASG phải thuộc cùng VNet với NIC đầu tiên'],
      answer: [3],
      explain: 'ASG yêu cầu mọi NIC thuộc cùng VNet với NIC đầu tiên được gắn. Peering hay cùng region không thay đổi ràng buộc này; ASG không có khái niệm tag VirtualNetwork.'
    },
    {
      q: 'Người dùng báo không truy cập được VM5 qua cổng 8443. Bạn cần xác định nhanh rule NSG nào đang chặn lưu lượng. Bạn dùng công cụ nào?',
      options: ['Network Watcher IP flow verify', 'Azure Monitor metrics của VM', 'Connection monitor', 'NSG flow logs mới'],
      answer: [0],
      explain: 'IP flow verify kiểm tra một 5-tuple và trả về Allow/Deny kèm tên rule. Metrics VM không cho biết rule NSG; Connection monitor theo dõi kết nối theo thời gian; NSG flow logs không cho tạo mới và cũng phải chờ dữ liệu.'
    },
    {
      q: 'Bạn cần cho quản trị viên RDP/SSH vào các VM không có public IP, sử dụng ứng dụng RDP/SSH gốc trên máy tính của họ, và upload file lên VM. Giải pháp tốn ít chi phí nhất đáp ứng yêu cầu?',
      options: ['Azure Bastion Developer', 'Azure Bastion Basic', 'Azure Bastion Standard', 'Azure Bastion Premium'],
      answer: [2],
      explain: 'Native client và upload/download file yêu cầu Bastion Standard trở lên; Standard rẻ hơn Premium. Developer và Basic không hỗ trợ native client hay truyền file. Premium thêm session recording và private-only, không cần ở đây.'
    },
    {
      q: 'Bạn chuẩn bị triển khai Azure Bastion Standard vào VNet1. Yêu cầu nào bắt buộc? (Chọn 2)',
      options: ['Subnet tên <code>AzureBastionSubnet</code> kích thước /26 hoặc lớn hơn', 'Public IP Standard, Static', 'Mọi VM đích phải có public IP', 'NSG trên mọi VM phải mở 3389 từ Internet'],
      answer: [0, 1],
      explain: 'Bastion (Basic trở lên) cần AzureBastionSubnet /26+ và public IP Standard Static (trừ Premium private-only). VM đích không cần public IP và không cần mở RDP ra Internet; chỉ cần cho phép từ dải AzureBastionSubnet, điều mà AllowVnetInBound đã làm.'
    },
    {
      q: 'Máy chủ on-premises kết nối Azure qua Site-to-Site VPN cần truy cập storage account stdata01 bằng địa chỉ IP private, và public network access của storage account phải bị tắt. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Service endpoint Microsoft.Storage trên GatewaySubnet', 'Private endpoint cho stdata01 trong VNet', 'Service endpoint policy', 'Phân giải DNS tên stdata01 ra private IP (private DNS zone + forwarding từ on-premises)'],
      answer: [1, 3],
      explain: 'Private endpoint cấp private IP truy cập được qua VPN, và DNS phải phân giải tên storage ra private IP đó. Service endpoint chỉ áp dụng cho lưu lượng từ subnet Azure và vẫn dùng public endpoint; service endpoint policy chỉ giới hạn tài khoản đích cho service endpoint.'
    },
    {
      q: 'Bạn muốn VM trong SubnetA truy cập Azure SQL Database, còn subnet khác thì không. Giải pháp phải miễn phí và không thay đổi DNS. Bạn chọn gì?',
      options: ['Private endpoint cho SQL server', 'Azure Bastion', 'NSG với service tag Sql trên mọi subnet', 'Service endpoint Microsoft.Sql trên SubnetA và virtual network rule trên SQL server'],
      answer: [3],
      explain: 'Service endpoint miễn phí, không đổi DNS, và virtual network rule chỉ cho phép SubnetA. Private endpoint có phí và cần DNS; Bastion không liên quan; NSG chỉ điều khiển phía nguồn, không ngăn subnet khác nếu bạn quên rule và không khóa phía SQL.'
    },
    {
      q: 'Bạn tạo private endpoint cho storage account nhưng VM trong VNet vẫn phân giải <code>stdata01.blob.core.windows.net</code> ra public IP. VNet dùng Azure-provided DNS. Nguyên nhân khả dĩ nhất?',
      options: ['Private DNS zone <code>privatelink.blob.core.windows.net</code> chưa được link vào VNet', 'Chưa bật service endpoint Microsoft.Storage', 'NSG chặn cổng 53', 'Storage account dùng SKU Standard'],
      answer: [0],
      explain: 'Private endpoint cần private DNS zone privatelink tương ứng được link vào VNet để tên dịch vụ phân giải ra private IP. Service endpoint không liên quan tới DNS; DNS tới 168.63.129.16 không bị NSG chặn mặc định; SKU storage không ảnh hưởng.'
    },
    {
      q: 'Phát biểu nào về NSG là ĐÚNG? (Chọn 2)',
      options: ['Một NIC có thể gắn hai NSG', 'Một NSG có thể gắn vào nhiều subnet', 'Xóa một rule Allow sẽ cắt ngay các kết nối đang có', 'Không cần rule outbound cho gói tin trả lời của kết nối inbound đã được cho phép'],
      answer: [1, 3],
      explain: 'Một NSG gắn được vào nhiều subnet/NIC, và NSG là stateful nên chiều trả lời tự được phép. Mỗi NIC chỉ gắn tối đa một NSG; thay đổi rule chỉ ảnh hưởng kết nối mới, kết nối đang có không bị cắt.'
    },
    {
      q: 'Bạn muốn chặn mọi VM trong Subnet1 truy cập Internet nhưng vẫn cho phép truy cập Azure Storage. Cấu hình outbound nào đúng?',
      options: ['Priority 100 Deny Internet; priority 200 Allow Storage', 'Priority 100 Allow Storage; priority 200 Deny Internet', 'Chỉ một rule priority 100 Deny Any', 'Xóa default rule AllowInternetOutBound'],
      answer: [1],
      explain: 'Storage là một phần của Internet (public IP), nên rule Allow Storage phải có priority nhỏ hơn rule Deny Internet. Đặt Deny trước sẽ chặn luôn Storage; Deny Any chặn cả lưu lượng VNet; default rule không xóa được.'
    },
    {
      q: 'Công ty cần ghi lại toàn bộ phiên RDP của nhà thầu vào VM để kiểm toán, và Bastion không được có public IP. Bạn chọn SKU nào?',
      options: ['Basic', 'Standard', 'Developer', 'Premium'],
      answer: [3],
      explain: 'Session recording và private-only deployment chỉ có ở Premium. Standard có native client, shareable link nhưng không ghi phiên; Basic và Developer càng ít tính năng hơn.'
    },
    {
      q: 'VM1 và VM2 cùng ở Subnet1. NSG gắn vào Subnet1 có rule priority 100 Deny Any từ VirtualNetwork tới VirtualNetwork (inbound). VM1 ping VM2 được không?',
      options: ['Được, vì lưu lượng trong cùng subnet không qua NSG', 'Được, vì AllowVnetInBound có priority cao hơn', 'Không, vì NSG subnet vẫn đánh giá lưu lượng giữa các VM trong cùng subnet', 'Không, vì ICMP luôn bị Azure chặn'],
      answer: [2],
      explain: 'NSG gắn vào subnet đánh giá cả lưu lượng giữa các VM trong cùng subnet; rule Deny 100 được xét trước AllowVnetInBound 65000 (số lớn hơn nghĩa là ưu tiên thấp hơn). ICMP không bị Azure chặn mặc định trong VNet.'
    }
  ]
});

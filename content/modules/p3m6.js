AZ.addModule({
  id: 'p3m6',
  summary: '<strong>Azure Load Balancer</strong> phân phối lưu lượng TCP/UDP ở tầng 4 (transport layer) tới các VM trong backend pool, giúp ứng dụng có tính sẵn sàng cao và mở rộng được. Đề AZ-104 thường hỏi về public vs internal, SKU Standard (Basic đã bị khai tử), các thành phần (frontend, backend pool, health probe, rule, inbound NAT, outbound rule), chế độ phân phối và cách xử lý khi health probe thất bại.',
  objectives: [
    'Giải thích Azure Load Balancer hoạt động ở tầng 4 và khác gì với dịch vụ cân bằng tải tầng 7',
    'Cấu hình đầy đủ các thành phần: frontend IP, backend pool, health probe, load-balancing rule, inbound NAT rule, outbound rule',
    'Phân biệt public và internal load balancer, SKU Standard và Basic (đã retire 30/09/2025)',
    'Chọn đúng chế độ phân phối: 5-tuple hash, session persistence Client IP hoặc Client IP and protocol',
    'Xử lý sự cố: health probe thất bại, NSG chặn 168.63.129.16, Standard LB "secure by default"'
  ],
  sections: [
    {
      id: 'what-is-lb',
      unit: 'What is Azure Load Balancer?',
      title: 'Azure Load Balancer là gì?',
      html: `
<p><strong>Azure Load Balancer</strong> là dịch vụ cân bằng tải <strong>tầng 4 (TCP/UDP)</strong> được quản lý hoàn toàn. Nó nhận luồng (flow) đến <strong>frontend</strong> và phân phối tới các instance khỏe mạnh trong <strong>backend pool</strong> (VM, Virtual Machine Scale Set, hoặc địa chỉ IP). Load Balancer <strong>không đọc nội dung HTTP</strong>: không định tuyến theo URL, không terminate TLS, không có WAF. Đó là việc của Application Gateway hoặc Front Door.</p>

<h4>Đặc điểm chính</h4>
<ul>
  <li><strong>Pass-through</strong>: không phải proxy; VM backend nhìn thấy IP nguồn thật của client (khác với Application Gateway).</li>
  <li>Hiệu năng cao, độ trễ cực thấp, hỗ trợ hàng triệu luồng; mọi giao thức chạy trên TCP/UDP (HTTP, RDP, SQL, DNS, game UDP…).</li>
  <li>Là dịch vụ <strong>regional</strong>. Muốn cân bằng giữa các region bằng IP anycast tĩnh, dùng <strong>Global tier</strong> (cross-region load balancer) của Standard public LB.</li>
  <li>Hỗ trợ <strong>availability zones</strong>: frontend <em>zone-redundant</em> (sống sót khi mất một zone) hoặc <em>zonal</em> (gắn với một zone).</li>
</ul>

<h4>Hai loại theo frontend</h4>
<div class="compare">
  <div><strong>Public load balancer</strong>Frontend là <strong>public IP</strong>. Cân bằng traffic từ Internet vào VM, đồng thời có thể cung cấp kết nối outbound (SNAT) cho VM qua outbound rules.</div>
  <div><strong>Internal (private) load balancer</strong>Frontend là <strong>IP private</strong> trong một subnet. Dùng cho tầng nội bộ (app tier, database tier), traffic từ VNet, VNet peering hoặc on-premises qua VPN/ExpressRoute.</div>
</div>

<h4>Ba SKU</h4>
<table>
  <thead><tr><th>SKU</th><th>Tình trạng</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><strong>Standard</strong></td><td>SKU mặc định, khuyến nghị</td><td>Mọi workload production, có SLA 99,99%</td></tr>
    <tr><td><strong>Basic</strong></td><td><strong>Đã retire ngày 30/09/2025</strong></td><td>Không còn dùng cho triển khai mới; phải nâng cấp lên Standard</td></tr>
    <tr><td><strong>Gateway</strong></td><td>Chuyên dụng</td><td>Chèn NVA bên thứ ba (firewall, IDS) một cách trong suốt vào đường đi của traffic</td></tr>
  </tbody>
</table>

<h4>Tạo nhanh một public LB Standard</h4>
<pre><code>az network public-ip create -g rg1 -n lb-pip --sku Standard --zone 1 2 3
az network lb create -g rg1 -n lb-web --sku Standard \\
  --public-ip-address lb-pip --frontend-ip-name fe-web --backend-pool-name bp-web
az network lb probe create -g rg1 --lb-name lb-web -n hp-http --protocol Http --port 80 --path /
az network lb rule create -g rg1 --lb-name lb-web -n rule-http --protocol Tcp \\
  --frontend-port 80 --backend-port 80 --frontend-ip-name fe-web \\
  --backend-pool-name bp-web --probe-name hp-http --disable-outbound-snat true</code></pre>
<p><code>--disable-outbound-snat true</code> là cách làm được khuyến nghị: không dùng SNAT ngầm của rule inbound, mà cấu hình outbound tường minh bằng outbound rule hoặc NAT Gateway.</p>

<figure class="fig"><img src="assets/img/p3m6/create-standard-lb-basics.png" alt="Tab Basics của trang Create load balancer với các trường Subscription, Resource group, Name, Region, SKU (Standard, Gateway), Type (Public, Internal) và Tier (Regional, Global)" loading="lazy"><figcaption>Hình 1. Tab <strong>Basics</strong> khi tạo load balancer: SKU chỉ còn <em>Standard</em> và <em>Gateway</em> (Basic đã retire), <em>Type</em> chọn Public/Internal, <em>Tier</em> chọn Regional/Global. Nguồn: <a href="https://learn.microsoft.com/azure/load-balancer/quickstart-load-balancer-standard-public-portal" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo public Load Balancer Standard với backend pool, health probe và rule</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở trang tạo load balancer:<br><span class="path">Azure portal › Load balancers › + Create › Standard Load Balancer</span></li>
    <li>Điền tab <strong>Basics</strong> (xem Hình 1):
      <div class="blade">
        <div class="blade-title">Create load balancer</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Frontend IP configuration</span><span>Backend pools</span><span>Inbound rules</span><span>Outbound rules</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-lb</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">lb-web</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">East US</span></div>
        <div class="pf"><label class="req">SKU</label><span class="pv radio">Standard</span></div>
        <div class="pf"><label class="req">Type</label><span class="pv radio">Public</span></div>
        <div class="pf"><label class="req">Tier</label><span class="pv radio">Regional</span></div>
        <div class="pbtns"><span class="pbtn primary">Next : Frontend IP configuration &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Frontend IP configuration</strong> › <em>+ Add a frontend IP configuration</em>:
      <div class="blade">
        <div class="blade-title">Add frontend IP configuration</div>
        <div class="pf"><label class="req">Name</label><span class="pv">fe-web</span></div>
        <div class="pf"><label>IP version</label><span class="pv radio">IPv4</span></div>
        <div class="pf"><label>IP type</label><span class="pv radio">IP address</span></div>
        <div class="pf"><label class="req">Public IP address</label><span class="pv sel">(New) lb-pip</span></div>
        <div class="pf"><label></label><span class="pv note">Create new › Availability zone: Zone-redundant · Routing preference: Microsoft Network</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Tab <strong>Backend pools</strong> › <em>+ Add a backend pool</em>:
      <div class="blade">
        <div class="blade-title">Add backend pool</div>
        <div class="pf"><label class="req">Name</label><span class="pv">bp-web</span></div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-web</span></div>
        <div class="pf"><label>Backend Pool Configuration</label><span class="pv radio">IP Address</span></div>
        <div class="pf"><label></label><span class="pv note">Hai lựa chọn: NIC hoặc IP Address. Có thể để pool trống và thêm VM sau (khi tạo VM chọn Load balancing › Azure load balancer)</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Tab <strong>Inbound rules</strong> › <em>+ Add a load balancing rule</em>. Health probe tạo ngay tại đây bằng <em>Create new</em>:
      <div class="blade">
        <div class="blade-title">Add load balancing rule</div>
        <div class="pf"><label class="req">Name</label><span class="pv">rule-http</span></div>
        <div class="pf"><label class="req">IP Version</label><span class="pv radio">IPv4</span></div>
        <div class="pf"><label class="req">Frontend IP address</label><span class="pv sel">fe-web (To be created)</span></div>
        <div class="pf"><label class="req">Backend pool</label><span class="pv sel">bp-web</span></div>
        <div class="pf"><label class="req">Protocol</label><span class="pv radio">TCP</span></div>
        <div class="pf"><label class="req">Port</label><span class="pv">80</span></div>
        <div class="pf"><label class="req">Backend port</label><span class="pv">80</span></div>
        <div class="pf"><label class="req">Health probe</label><span class="pv sel">Create new › hp-http · HTTP · /</span></div>
        <div class="pf"><label>Session persistence</label><span class="pv sel">None</span></div>
        <div class="pf"><label>Idle timeout (minutes)</label><span class="pv">4</span></div>
        <div class="pf"><label>Enable TCP reset</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Enable Floating IP</label><span class="pv">Tắt</span></div>
        <div class="pf"><label>Outbound source network address translation (SNAT)</label><span class="pv radio">(Recommended) Use outbound rules…</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Bấm <strong>Review + create</strong> › <strong>Create</strong>. Sau đó tạo NSG cho subnet/NIC của VM backend cho phép TCP 80 từ Internet: public Standard LB <em>secure by default</em>, không có NSG allow thì traffic không tới VM.</li>
    <li>Kiểm tra: mở public IP <code>lb-pip</code>, dán địa chỉ vào trình duyệt; xem trạng thái probe tại trang <strong>Insights</strong> của <code>lb-web</code> hoặc metric <em>Health Probe Status</em>.</li>
  </ol></div>
</div>

<div class="callout exam"><strong>Góc thi</strong>Từ khóa <strong>TCP/UDP, tầng 4, RDP, cổng không phải HTTP, độ trễ thấp</strong> → Load Balancer. Từ khóa <strong>URL path, cookie affinity, TLS offload, WAF</strong> → Application Gateway. Load Balancer không phải đáp án khi đề yêu cầu định tuyến theo URL.</div>
`
    },
    {
      id: 'how-lb-works',
      unit: 'How Azure Load Balancer works',
      title: 'Azure Load Balancer hoạt động như thế nào?',
      html: `
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Luồng của Azure Load Balancer: client tới frontend IP, load-balancing rule chuyển tới các VM khỏe trong backend pool, health probe từ 168.63.129.16 loại VM lỗi">
  <rect class="box" x="10" y="85" width="100" height="60" rx="10"/>
  <text x="60" y="111" text-anchor="middle" class="t-b">Client</text>
  <text x="60" y="130" text-anchor="middle" class="t-sm t-mute">Internet</text>

  <rect class="box-a" x="150" y="10" width="280" height="270" rx="12"/>
  <text x="290" y="34" text-anchor="middle" class="t-b t-a">Load Balancer (Standard)</text>
  <rect class="box" x="170" y="50" width="240" height="56" rx="8"/>
  <text x="290" y="73" text-anchor="middle" class="t-b">Frontend IP configuration</text>
  <text x="290" y="93" text-anchor="middle" class="t-sm t-mute">public IP Standard · :80</text>
  <rect class="box" x="170" y="122" width="240" height="56" rx="8"/>
  <text x="290" y="145" text-anchor="middle" class="t-b">Load-balancing rule</text>
  <text x="290" y="165" text-anchor="middle" class="t-sm t-mute">TCP 80 → backend 80 · 5-tuple</text>
  <rect class="box-w" x="170" y="194" width="240" height="70" rx="8"/>
  <text x="290" y="217" text-anchor="middle" class="t-b t-w">Health probe</text>
  <text x="290" y="236" text-anchor="middle" class="t-sm">HTTP GET / · chỉ 200 là OK</text>
  <text x="290" y="254" text-anchor="middle" class="t-sm">nguồn 168.63.129.16</text>
  <line class="ln" x1="290" y1="106" x2="290" y2="118" marker-end="url(#arr)"/>

  <rect class="zone" x="470" y="10" width="240" height="270" rx="12"/>
  <text x="590" y="34" text-anchor="middle" class="t-b">Backend pool</text>
  <rect class="box-s" x="490" y="50" width="200" height="56" rx="8"/>
  <text x="590" y="73" text-anchor="middle" class="t-b">VM1 · 10.0.0.4</text>
  <text x="590" y="93" text-anchor="middle" class="t-sm t-s">probe OK → nhận flow</text>
  <rect class="box-s" x="490" y="122" width="200" height="56" rx="8"/>
  <text x="590" y="145" text-anchor="middle" class="t-b">VM2 · 10.0.0.5</text>
  <text x="590" y="165" text-anchor="middle" class="t-sm t-s">probe OK → nhận flow</text>
  <rect class="box-x" x="490" y="194" width="200" height="70" rx="8"/>
  <text x="590" y="222" text-anchor="middle" class="t-b">VM3 · 10.0.0.6</text>
  <text x="590" y="244" text-anchor="middle" class="t-sm t-x">probe fail → không flow mới</text>

  <line class="ln-a" x1="110" y1="110" x2="166" y2="84" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="410" y1="142" x2="486" y2="82" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="410" y1="150" x2="486" y2="150" marker-end="url(#arr-a)"/>
  <line class="ln dash" x1="410" y1="229" x2="466" y2="229" marker-end="url(#arr)"/>
  <text x="450" y="221" text-anchor="middle" class="t-sm t-mute">probe</text>
</svg>
<figcaption>Hình 1. Rule ánh xạ frontend IP:port tới backend pool:port. Health probe (nguồn 168.63.129.16, service tag AzureLoadBalancer) kiểm tra từng instance; VM probe fail bị loại khỏi phân phối flow mới nhưng vẫn nằm trong pool.</figcaption>
</figure>

<h4>Các thành phần</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Vai trò</th></tr></thead>
  <tbody>
    <tr><td><strong>Frontend IP configuration</strong></td><td>Điểm nhận traffic: public IP (public LB) hoặc private IP (internal LB). Một LB có thể có nhiều frontend.</td></tr>
    <tr><td><strong>Backend pool</strong></td><td>Nhóm VM/VMSS instance nhận traffic. Standard: NIC-based hoặc IP-based, mọi VM trong <strong>một VNet</strong>, tối đa <strong>5.000</strong> instance.</td></tr>
    <tr><td><strong>Health probe</strong></td><td>Kiểm tra sức khỏe instance bằng TCP, HTTP hoặc HTTPS. Instance probe fail sẽ không nhận <em>flow mới</em>.</td></tr>
    <tr><td><strong>Load-balancing rule</strong></td><td>Ánh xạ frontend IP + port + protocol → backend pool + port, kèm health probe và chế độ phân phối.</td></tr>
    <tr><td><strong>Inbound NAT rule</strong></td><td>Chuyển một cổng frontend tới <strong>một VM cụ thể</strong> (ví dụ 50001 → VM1:3389). Không cần health probe.</td></tr>
    <tr><td><strong>Outbound rule</strong></td><td>Cấu hình SNAT tường minh để VM trong backend pool ra Internet qua public IP của LB (chỉ Standard).</td></tr>
  </tbody>
</table>

<h4>Health probe chi tiết</h4>
<ul>
  <li>Giao thức: <strong>TCP</strong> (bắt tay 3 bước thành công là OK), <strong>HTTP/HTTPS</strong> (GET tới path; chỉ <strong>HTTP 200</strong> là healthy, mọi mã khác như 403, 404, 500 là fail). Timeout của HTTP/HTTPS probe là 30 giây.</li>
  <li>Interval: portal mặc định 5 giây; khi tạo bằng ARM/CLI/PowerShell mặc định 15 giây, tối thiểu 5 giây. <em>Threshold</em> là số lần liên tiếp thành công/thất bại để đổi trạng thái.</li>
  <li>Mọi probe IPv4 xuất phát từ <strong>168.63.129.16</strong>, được đại diện bởi service tag <strong>AzureLoadBalancer</strong>. Rule mặc định <code>AllowAzureLoadBalancerInBound</code> của NSG đã cho phép.</li>
  <li>Khi <em>mọi</em> instance probe down: Standard giữ các luồng TCP đang có, nhưng không gửi flow mới.</li>
</ul>

<h4>Chế độ phân phối (distribution mode)</h4>
<table>
  <thead><tr><th>Chế độ</th><th>Hash</th><th>Portal (Session persistence)</th><th>Giá trị API/CLI</th></tr></thead>
  <tbody>
    <tr><td>Hash-based (mặc định)</td><td>5-tuple: source IP, source port, destination IP, destination port, protocol</td><td>None</td><td><code>Default</code></td></tr>
    <tr><td>Client IP</td><td>2-tuple: source IP, destination IP</td><td>Client IP</td><td><code>SourceIP</code></td></tr>
    <tr><td>Client IP and protocol</td><td>3-tuple: source IP, destination IP, protocol</td><td>Client IP and protocol</td><td><code>SourceIPProtocol</code></td></tr>
  </tbody>
</table>
<p>Với 5-tuple, mỗi phiên TCP mới thường đổi source port nên có thể sang VM khác. Session persistence đưa mọi kết nối từ cùng một client IP về cùng VM (ví dụ ứng dụng lưu session trong bộ nhớ, Remote Desktop Gateway dùng 3-tuple). Đổi chế độ không gây downtime.</p>
<pre><code>az network lb rule update -g rg1 --lb-name lb-web -n rule-http --load-distribution SourceIP</code></pre>

<h4>Tính năng nâng cao của rule (Standard)</h4>
<ul>
  <li><strong>HA ports</strong>: rule trên <em>internal</em> Standard LB với protocol <strong>All</strong> và port <strong>0</strong>, cân bằng mọi cổng TCP/UDP. Dùng cho NVA HA.</li>
  <li><strong>Floating IP</strong> (Direct Server Return): VM nhận gói tin với đích là frontend IP. Cần cho SQL Server Always On availability group listener hoặc nhiều frontend dùng chung backend port.</li>
  <li><strong>Idle timeout</strong> (mặc định 4 phút; Standard LB cho phép 4–100 phút với load-balancing rule và inbound NAT rule, 4–120 phút với outbound rule) và <strong>TCP reset on idle</strong> để ứng dụng biết kết nối đã bị đóng.</li>
</ul>

<h4>Inbound NAT rule và outbound rule</h4>
<pre><code># RDP vào VM1 qua cổng 50001 của frontend
az network lb inbound-nat-rule create -g rg1 --lb-name lb-web -n rdp-vm1 \\
  --protocol Tcp --frontend-port 50001 --backend-port 3389 --frontend-ip-name fe-web
az network nic ip-config inbound-nat-rule add -g rg1 --nic-name vm1-nic \\
  --ip-config-name ipconfig1 --lb-name lb-web --inbound-nat-rule rdp-vm1

# Outbound SNAT cho backend pool
az network lb outbound-rule create -g rg1 --lb-name lb-web -n ob-all \\
  --frontend-ip-configs fe-web --address-pool bp-web --protocol All --outbound-ports 10000</code></pre>
<div class="callout tip"><strong>Thực tế</strong>Thay vì mở RDP/SSH qua inbound NAT rule ra Internet, nên dùng <strong>Azure Bastion</strong>. Với outbound, <strong>NAT Gateway</strong> là cách được khuyến nghị nhất vì tránh cạn cổng SNAT.</div>
`
    },
    {
      id: 'when-to-use-lb',
      unit: 'When to use Azure Load Balancer',
      title: 'Khi nào dùng Azure Load Balancer?',
      html: `
<h4>Tình huống phù hợp</h4>
<ul>
  <li><strong>Ứng dụng web nhiều VM không cần tính năng L7</strong>: cân bằng HTTP/HTTPS ở tầng 4, TLS do VM tự xử lý.</li>
  <li><strong>Ứng dụng nhiều tầng</strong>: public LB cho tầng web, internal LB cho tầng business logic/database.</li>
  <li><strong>Giao thức không phải HTTP</strong>: RDP farm, SQL Server, DNS, syslog, game server UDP, IoT.</li>
  <li><strong>Port forwarding</strong> tới từng VM bằng inbound NAT rule.</li>
  <li><strong>Outbound connectivity</strong> cho VM không có public IP (outbound rules).</li>
  <li><strong>NVA high availability</strong> bằng HA ports trên internal LB.</li>
  <li><strong>Hybrid</strong>: client on-premises truy cập internal LB qua VPN/ExpressRoute.</li>
</ul>

<h4>Không phù hợp khi</h4>
<ul>
  <li>Cần định tuyến theo <strong>URL path</strong> hoặc <strong>host header</strong>, cookie-based affinity, rewrite header → <strong>Application Gateway</strong>.</li>
  <li>Cần <strong>WAF</strong> bảo vệ OWASP Top 10 → Application Gateway WAF hoặc Front Door.</li>
  <li>Cần cân bằng <strong>toàn cầu</strong> cho web, có caching/CDN → <strong>Front Door</strong>; cân bằng toàn cầu theo DNS cho mọi giao thức → <strong>Traffic Manager</strong>.</li>
</ul>

<h4>Ví dụ thiết kế ba tầng</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="Thiết kế ba tầng: Internet tới public LB, tầng web, internal LB, tầng app, internal LB với Floating IP, SQL">
  <rect class="box" x="10" y="20" width="110" height="60" rx="10"/>
  <text x="65" y="55" text-anchor="middle" class="t-b">Internet</text>

  <rect class="zone" x="150" y="8" width="560" height="234" rx="12"/>
  <text x="166" y="236" class="t-sm t-mute">VNet</text>

  <rect class="box-a" x="170" y="20" width="160" height="60" rx="10"/>
  <text x="250" y="45" text-anchor="middle" class="t-b t-a">Public LB</text>
  <text x="250" y="65" text-anchor="middle" class="t-sm">zone-redundant · :443</text>
  <rect class="box-s" x="370" y="20" width="140" height="60" rx="10"/>
  <text x="440" y="45" text-anchor="middle" class="t-b">Web VMs</text>
  <text x="440" y="65" text-anchor="middle" class="t-sm">zone 1 · 2 · 3</text>
  <rect class="box-a" x="550" y="20" width="150" height="60" rx="10"/>
  <text x="625" y="45" text-anchor="middle" class="t-b t-a">Internal LB</text>
  <text x="625" y="65" text-anchor="middle" class="t-sm">10.0.2.10 · :8080</text>

  <rect class="box-s" x="550" y="160" width="150" height="60" rx="10"/>
  <text x="625" y="185" text-anchor="middle" class="t-b">App VMs</text>
  <text x="625" y="205" text-anchor="middle" class="t-sm">app-pool</text>
  <rect class="box-a" x="330" y="160" width="180" height="60" rx="10"/>
  <text x="420" y="185" text-anchor="middle" class="t-b t-a">Internal LB</text>
  <text x="420" y="205" text-anchor="middle" class="t-sm">10.0.3.10 · Floating IP</text>
  <rect class="box-w" x="170" y="160" width="120" height="60" rx="10"/>
  <text x="230" y="185" text-anchor="middle" class="t-b">SQL AG</text>
  <text x="230" y="205" text-anchor="middle" class="t-sm">listener :1433</text>

  <line class="ln-a" x1="120" y1="50" x2="166" y2="50" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="330" y1="50" x2="366" y2="50" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="510" y1="50" x2="546" y2="50" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="625" y1="80" x2="625" y2="156" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="550" y1="190" x2="514" y2="190" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="330" y1="190" x2="294" y2="190" marker-end="url(#arr-a)"/>
  <text x="395" y="125" text-anchor="middle" class="t-sm t-mute">public LB cho tầng Internet, internal LB cho các tầng bên trong</text>
</svg>
<figcaption>Hình 1. Ứng dụng ba tầng: một <strong>public LB</strong> nhận traffic Internet cho tầng web, các <strong>internal LB</strong> (frontend IP private) cân bằng tầng app và listener SQL Server Always On (cần Floating IP).</figcaption>
</figure>

<h4>Tính sẵn sàng và SLA</h4>
<ul>
  <li>Standard LB có SLA <strong>99,99%</strong> (cho data path) khi có ít nhất hai VM khỏe mạnh trong backend pool.</li>
  <li>Kết hợp frontend zone-redundant với VM phân bổ qua nhiều availability zone để chịu được sự cố mất một datacenter.</li>
  <li>Backend pool có thể chứa VM thuộc availability set, VMSS, hoặc VM đơn lẻ, miễn là cùng một VNet.</li>
</ul>

<h4>Theo dõi</h4>
<p>Standard LB xuất <strong>metrics đa chiều</strong> lên Azure Monitor: <em>Data Path Availability</em> (frontend còn phục vụ không), <em>Health Probe Status</em> (instance nào khỏe), <em>SNAT Connection Count</em>, <em>Byte/Packet Count</em>. Trang <strong>Insights</strong> của Load Balancer vẽ sơ đồ phụ thuộc và tình trạng từng thành phần.</p>
<div class="callout exam"><strong>Góc thi</strong>"Cần cân bằng tải cho các VM chạy ứng dụng TCP tùy chỉnh trên cổng 5000, chi phí thấp nhất" → <strong>Load Balancer Standard</strong>. "Cần chỉ định VM xử lý mọi request từ một người dùng" ở tầng 4 → session persistence <strong>Client IP</strong>.</div>
`
    },
    {
      id: 'public-internal-sku',
      extra: true,
      title: 'Public vs Internal LB, SKU Basic vs Standard',
      html: `
<h4>So sánh SKU (theo tài liệu Microsoft)</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>Standard</th><th>Basic (đã retire 30/09/2025)</th></tr></thead>
  <tbody>
    <tr><td>Backend pool size</td><td><strong>5.000</strong> instance</td><td>300 IP configuration, một availability set</td></tr>
    <tr><td>Backend pool endpoint</td><td>Bất kỳ VM/VMSS nào trong <strong>một VNet</strong></td><td>VM trong <strong>một availability set</strong> hoặc một VMSS</td></tr>
    <tr><td>Kiểu backend</td><td>NIC-based, IP-based</td><td>NIC-based</td></tr>
    <tr><td>Health probe</td><td>TCP, HTTP, <strong>HTTPS</strong></td><td>TCP, HTTP</td></tr>
    <tr><td>Availability zones</td><td>Zone-redundant / zonal</td><td>Không hỗ trợ</td></tr>
    <tr><td>Bảo mật</td><td><strong>Secure by default</strong>: đóng với inbound trừ khi NSG cho phép</td><td>Mở mặc định, NSG tùy chọn</td></tr>
    <tr><td>Outbound rules</td><td>Có</td><td>Không</td></tr>
    <tr><td>HA ports</td><td>Có (internal LB)</td><td>Không</td></tr>
    <tr><td>Rules (LB + inbound NAT) mỗi LB</td><td>1.500</td><td>250</td></tr>
    <tr><td>Diagnostics</td><td>Azure Monitor multi-dimensional metrics</td><td>Không</td></tr>
    <tr><td>Global VNet peering tới ILB</td><td>Có</td><td>Không</td></tr>
    <tr><td>SLA</td><td><strong>99,99%</strong></td><td>Không có</td></tr>
  </tbody>
</table>

<h4>Những ràng buộc hay bị hỏi</h4>
<ul>
  <li>Public Standard LB bắt buộc dùng <strong>public IP SKU Standard</strong>. Không trộn SKU giữa LB và public IP.</li>
  <li>Một VM, availability set hoặc VMSS chỉ tham chiếu được <strong>một SKU</strong> LB, không dùng đồng thời cả hai.</li>
  <li>Standard LB có thể di chuyển giữa resource group nhưng <strong>không di chuyển sang subscription khác</strong>.</li>
  <li>Không thể đổi SKU tại chỗ trong portal; Microsoft cung cấp script PowerShell nâng cấp Basic → Standard.</li>
</ul>

<h4>Secure by default: hệ quả thực tế</h4>
<div class="compare">
  <div><strong>Public Standard LB</strong>Traffic từ Internet tới backend bị chặn cho tới khi có <strong>NSG</strong> (trên subnet hoặc NIC) cho phép cổng dịch vụ. Không có NSG nào thì traffic inbound vẫn bị chặn.</div>
  <div><strong>Internal Standard LB</strong>Traffic từ trong VNet tới ILB được phép (theo rule mặc định AllowVnetInBound). VM chỉ nằm sau ILB Standard <strong>không có outbound Internet</strong> qua LB; cần NAT Gateway, public IP hoặc public LB có outbound rule.</div>
</div>

<h4>Public vs Internal</h4>
<table>
  <thead><tr><th></th><th>Public LB</th><th>Internal LB</th></tr></thead>
  <tbody>
    <tr><td>Frontend</td><td>Public IP (Standard)</td><td>Private IP tĩnh hoặc động trong một subnet</td></tr>
    <tr><td>Nguồn traffic</td><td>Internet</td><td>VNet, peering, on-premises qua VPN/ExpressRoute</td></tr>
    <tr><td>Outbound SNAT</td><td>Có, qua outbound rules</td><td>Không</td></tr>
    <tr><td>HA ports</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>
<pre><code># Internal LB với frontend IP tĩnh
az network lb create -g rg1 -n ilb-app --sku Standard --vnet-name vnet1 --subnet app \\
  --private-ip-address 10.0.2.10 --frontend-ip-name fe-app --backend-pool-name bp-app</code></pre>
<div class="callout exam"><strong>Bẫy thi</strong>Đề cũ có thể nhắc Basic LB "miễn phí". Hiện tại Basic đã retire; mọi đáp án yêu cầu availability zones, HTTPS probe, SLA, outbound rules, HA ports hoặc backend &gt; 300 VM đều chỉ về <strong>Standard</strong>.</div>
`
    },
    {
      id: 'troubleshoot-lb',
      extra: true,
      title: 'Xử lý sự cố load balancing',
      html: `
<h4>Health probe bị down</h4>
<table>
  <thead><tr><th>Nguyên nhân</th><th>Cách kiểm tra / khắc phục</th></tr></thead>
  <tbody>
    <tr><td>Ứng dụng trên VM không lắng nghe cổng probe</td><td>Trên VM: <code>netstat -an</code> / <code>ss -lnt</code>. Probe port phải mở và đúng protocol.</td></tr>
    <tr><td>HTTP probe nhận mã khác 200 (301 redirect, 401, 404…)</td><td>Trỏ probe tới một path trả 200 (ví dụ <code>/health</code>). Redirect HTTP→HTTPS khiến HTTP probe fail.</td></tr>
    <tr><td>NSG chặn 168.63.129.16</td><td>Không ghi đè rule <code>AllowAzureLoadBalancerInBound</code> bằng rule Deny có ưu tiên cao hơn; dùng service tag <strong>AzureLoadBalancer</strong> nếu cần rule riêng.</td></tr>
    <tr><td>Firewall trong OS chặn probe</td><td>Mở cổng probe trong Windows Firewall / iptables cho nguồn 168.63.129.16.</td></tr>
    <tr><td>VM đã dừng</td><td>Instance dừng sẽ không được probe cho đến khi chạy lại.</td></tr>
  </tbody>
</table>

<h4>Traffic không tới được backend dù probe OK</h4>
<ul>
  <li><strong>Standard LB + thiếu NSG allow</strong>: public Standard LB secure by default; cần NSG cho phép cổng dịch vụ từ Internet (hoặc nguồn mong muốn).</li>
  <li><strong>Rule sai cổng/protocol</strong>: frontend port và backend port, TCP/UDP phải khớp ứng dụng.</li>
  <li><strong>Gọi ILB từ chính VM trong backend pool</strong>: nếu luồng được chọn trở lại chính VM gửi, kết nối thất bại. Đây là giới hạn đã được ghi nhận của internal LB; tránh để client nằm trong backend pool của chính ILB đó.</li>
  <li><strong>UDR</strong> đẩy traffic trả về qua NVA gây định tuyến bất đối xứng.</li>
</ul>

<h4>Kết nối outbound bị lỗi</h4>
<ul>
  <li>Cạn cổng SNAT (<em>SNAT port exhaustion</em>): xem metric <strong>SNAT Connection Count</strong> với trạng thái Failed. Giải pháp: <strong>NAT Gateway</strong>, thêm frontend IP cho outbound rule, cấp thêm cổng, tái sử dụng kết nối (connection pooling).</li>
  <li>VM chỉ nằm sau ILB Standard không ra Internet được: thêm NAT Gateway cho subnet.</li>
</ul>

<h4>Công cụ chẩn đoán</h4>
<ol class="steps">
  <li>Load Balancer → <strong>Insights</strong> / Metrics: <em>Health Probe Status</em> theo từng backend IP, <em>Data Path Availability</em> cho frontend.</li>
  <li>Network Watcher <strong>IP flow verify</strong> / <strong>NSG diagnostics</strong>: kiểm tra NSG có cho phép 168.63.129.16 tới cổng probe hay không.</li>
  <li><strong>Effective security rules</strong> trên NIC của VM backend: xem rule tổng hợp từ NSG subnet và NIC.</li>
  <li><strong>Packet capture</strong> trên VM backend (lọc nguồn 168.63.129.16) để xác nhận probe đến nhưng VM không trả lời.</li>
</ol>
<div class="callout tip"><strong>Mẹo bảo trì</strong>Muốn rút một VM khỏi vòng phân phối để bảo trì mà không xóa khỏi backend pool: làm cho health probe của VM đó fail (ví dụ trả mã khác 200 tại <code>/health</code>). Luồng TCP đang có vẫn được giữ, chỉ không có flow mới.</div>
<div class="callout exam"><strong>Góc thi</strong>"Sau khi thêm NSG rule Deny All inbound ưu tiên 100, mọi VM backend bị đánh dấu unhealthy" → nguyên nhân: NSG chặn probe từ <strong>168.63.129.16 / AzureLoadBalancer</strong>. Khắc phục: thêm rule Allow nguồn AzureLoadBalancer với ưu tiên cao hơn (số nhỏ hơn).</div>
`
    }
  ],
  keyFacts: [
    'Azure Load Balancer hoạt động ở <strong>tầng 4 (TCP/UDP)</strong>, không đọc HTTP, không terminate TLS, không có WAF.',
    'SKU: <strong>Standard</strong> (khuyến nghị), <strong>Gateway</strong> (chèn NVA), <strong>Basic</strong> đã <strong>retire ngày 30/09/2025</strong>.',
    'Standard: backend pool tới <strong>5.000</strong> instance trong một VNet; Basic: 300 và một availability set.',
    'Standard LB có SLA <strong>99,99%</strong>, hỗ trợ availability zones, HTTPS probe, outbound rules, HA ports.',
    'Standard LB <strong>secure by default</strong>: inbound bị chặn cho tới khi NSG cho phép.',
    'Health probe nguồn từ <strong>168.63.129.16</strong> (service tag <strong>AzureLoadBalancer</strong>); HTTP probe chỉ coi <strong>200</strong> là healthy.',
    'Phân phối mặc định là <strong>5-tuple hash</strong>; session persistence: <strong>Client IP</strong> (2-tuple, <code>SourceIP</code>) hoặc <strong>Client IP and protocol</strong> (3-tuple, <code>SourceIPProtocol</code>).',
    '<strong>Inbound NAT rule</strong> ánh xạ một cổng frontend tới một VM cụ thể, không cần health probe.',
    '<strong>HA ports</strong> chỉ có trên <strong>internal</strong> Standard LB: protocol All, port 0, dùng cho NVA.',
    'Public Standard LB phải dùng <strong>public IP Standard</strong>; một VM/availability set/VMSS chỉ dùng một SKU LB.'
  ],
  traps: [
    'Chọn Load Balancer cho yêu cầu định tuyến theo URL path hoặc cần WAF. Đó là Application Gateway.',
    'Quên NSG khi dùng public Standard LB: Standard đóng mặc định, phải có NSG cho phép traffic inbound.',
    'Tạo NSG Deny All inbound ưu tiên cao làm chặn probe từ <strong>168.63.129.16</strong>, khiến mọi backend bị đánh dấu unhealthy.',
    'Nghĩ rằng HTTP probe chấp nhận mọi mã 2xx/3xx. Load Balancer chỉ chấp nhận <strong>200</strong>; redirect 301/302 là fail.',
    'Cho rằng VM sau internal Standard LB tự có outbound Internet. Cần NAT Gateway, public IP hoặc outbound rule của public LB.',
    'Dùng HA ports trên public LB. HA ports chỉ có cho internal Standard LB.',
    'Gán public IP Basic cho Standard LB hoặc trộn VM giữa hai SKU LB: không được phép.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Tầng</td><td>L4 TCP/UDP, pass-through, regional (Global tier cho cross-region)</td></tr>
    <tr><td>SKU</td><td>Standard (SLA 99,99%), Gateway (NVA), Basic retired 30/09/2025</td></tr>
    <tr><td>Backend pool</td><td>Standard 5.000 / một VNet; Basic 300 / một availability set</td></tr>
    <tr><td>Health probe</td><td>TCP, HTTP, HTTPS; nguồn 168.63.129.16 (AzureLoadBalancer); HTTP 200</td></tr>
    <tr><td>Distribution</td><td>Default 5-tuple · SourceIP 2-tuple · SourceIPProtocol 3-tuple</td></tr>
    <tr><td>Inbound NAT rule</td><td>Cổng frontend → 1 VM (RDP/SSH), không cần probe</td></tr>
    <tr><td>Outbound rule</td><td>SNAT cho backend pool (Standard public LB)</td></tr>
    <tr><td>HA ports</td><td>Internal Standard, protocol All, port 0, NVA HA</td></tr>
    <tr><td>Secure by default</td><td>Standard: phải có NSG allow inbound</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Azure Load Balancer hoạt động ở tầng nào?', back: '<strong>Tầng 4</strong> (TCP/UDP). Không định tuyến theo URL, không TLS offload, không WAF.' },
    { front: 'Basic Load Balancer retire khi nào?', back: '<strong>30/09/2025</strong>. Phải nâng cấp lên Standard.' },
    { front: 'Kích thước backend pool tối đa của Standard LB?', back: '<strong>5.000</strong> instance (Basic: 300).' },
    { front: 'SLA của Standard Load Balancer?', back: '<strong>99,99%</strong>. Basic không có SLA.' },
    { front: 'IP nguồn của health probe?', back: '<strong>168.63.129.16</strong>, service tag <strong>AzureLoadBalancer</strong>.' },
    { front: 'HTTP probe coi mã nào là healthy?', back: 'Chỉ <strong>HTTP 200</strong>. Mã khác (kể cả 301, 404) là fail.' },
    { front: 'Chế độ phân phối mặc định?', back: '<strong>5-tuple hash</strong>: source IP, source port, destination IP, destination port, protocol.' },
    { front: 'Session persistence có những loại nào?', back: '<strong>Client IP</strong> (2-tuple, SourceIP) và <strong>Client IP and protocol</strong> (3-tuple, SourceIPProtocol).' },
    { front: 'Inbound NAT rule dùng để làm gì?', back: 'Chuyển một cổng frontend tới <strong>một VM cụ thể</strong>, ví dụ 50001 → VM1:3389. Không cần health probe.' },
    { front: 'HA ports là gì, dùng ở đâu?', back: 'Rule protocol All, port 0 trên <strong>internal Standard LB</strong>, cân bằng mọi cổng; dùng cho NVA HA.' },
    { front: '"Secure by default" của Standard LB nghĩa là gì?', back: 'Traffic inbound bị đóng cho tới khi <strong>NSG</strong> cho phép.' },
    { front: 'Outbound rule có trên SKU nào?', back: 'Chỉ <strong>Standard</strong> (public LB). Cấu hình SNAT tường minh cho backend pool.' },
    { front: 'Floating IP dùng khi nào?', back: 'SQL Server Always On AG listener, hoặc nhiều frontend dùng chung backend port (Direct Server Return).' },
    { front: 'Metric nào cho biết backend instance nào khỏe?', back: '<strong>Health Probe Status</strong>. <em>Data Path Availability</em> cho biết frontend còn phục vụ.' },
    { front: 'Public Standard LB dùng public IP SKU nào?', back: '<strong>Standard</strong>. Không trộn SKU.' }
  ],
  quiz: [
    {
      q: 'Bạn triển khai public Standard Load Balancer với 3 VM web trong backend pool. Health probe đều healthy nhưng người dùng Internet không truy cập được cổng 443. Subnet và NIC chưa có NSG nào. Bạn cần làm gì?',
      options: ['Đổi sang Basic Load Balancer', 'Tạo NSG cho phép inbound TCP 443 và gắn vào subnet hoặc NIC của VM', 'Thêm inbound NAT rule cho từng VM', 'Bật Floating IP trên load-balancing rule'],
      answer: [1],
      explain: 'Standard LB secure by default: traffic inbound bị chặn cho tới khi NSG cho phép. Basic đã retire. Inbound NAT rule ánh xạ tới từng VM, không giải quyết việc thiếu NSG. Floating IP không liên quan đến việc mở cổng.'
    },
    {
      q: 'Một quản trị viên thêm NSG rule Deny mọi inbound với priority 100 vào subnet backend. Ngay sau đó tất cả VM trong backend pool bị đánh dấu unhealthy. Nguyên nhân là gì?',
      options: ['Rule chặn health probe từ 168.63.129.16', 'Load Balancer cần public IP trên từng VM', 'NSG làm tắt IP forwarding', 'Load Balancer yêu cầu NSG ở cấp NIC thay vì subnet'],
      answer: [0],
      explain: 'Rule Deny ưu tiên 100 ghi đè rule mặc định AllowAzureLoadBalancerInBound (65001), chặn probe từ 168.63.129.16. VM backend không cần public IP. NSG không liên quan IP forwarding. NSG ở subnet hay NIC đều dùng được.'
    },
    {
      q: 'Ứng dụng của bạn lưu session người dùng trong bộ nhớ của từng VM. Bạn cần mọi kết nối từ cùng một client IP đến cùng một VM qua Azure Load Balancer. Bạn cấu hình gì?',
      options: ['Distribution mode Default (5-tuple)', 'Bật Floating IP', 'Session persistence Client IP', 'Tăng idle timeout lên 30 phút'],
      answer: [2],
      explain: 'Session persistence Client IP (SourceIP, 2-tuple) gửi mọi kết nối từ cùng IP nguồn về cùng VM. 5-tuple đổi VM khi source port thay đổi. Floating IP và idle timeout không quyết định chọn VM.'
    },
    {
      q: 'Bạn cần cân bằng tải mọi cổng TCP và UDP tới một cặp NVA firewall đặt trong VNet. Giải pháp nào phù hợp?',
      options: ['Public Standard Load Balancer với một rule cho mỗi cổng', 'Application Gateway với multi-site listener', 'Traffic Manager với routing Priority', 'Internal Standard Load Balancer với rule HA ports'],
      answer: [3],
      explain: 'HA ports (protocol All, port 0) trên internal Standard LB cân bằng mọi cổng và giao thức, là mô hình chuẩn cho NVA HA. Tạo rule cho từng cổng không khả thi và public LB không hỗ trợ HA ports. Application Gateway chỉ xử lý HTTP/HTTPS. Traffic Manager dựa trên DNS.'
    },
    {
      q: 'Bạn cần RDP tới từng VM trong backend pool của một public LB bằng cổng riêng (VM1: 50001, VM2: 50002) mà không gán public IP cho VM. Bạn cấu hình gì?',
      options: ['Inbound NAT rules', 'Outbound rules', 'Load-balancing rule với session persistence', 'Health probe TCP 3389'],
      answer: [0],
      explain: 'Inbound NAT rule ánh xạ một cổng frontend tới một VM cụ thể. Outbound rule dành cho SNAT ra Internet. Load-balancing rule phân phối tới cả pool chứ không tới VM chỉ định. Health probe chỉ kiểm tra sức khỏe.'
    },
    {
      q: 'Yêu cầu nào buộc bạn phải dùng Load Balancer SKU Standard thay vì Basic? (Chọn 2)',
      options: ['Frontend zone-redundant qua availability zones', 'Cân bằng traffic TCP', 'Health probe HTTPS', 'Backend là VM trong cùng VNet'],
      answer: [0, 2],
      explain: 'Availability zones và HTTPS probe chỉ có ở Standard. Cân bằng TCP và backend trong cùng VNet đều làm được với cả hai SKU (Basic còn giới hạn hơn nhưng vẫn hỗ trợ TCP).'
    },
    {
      q: 'HTTP health probe trỏ tới <code>/</code> trên cổng 80. Web server cấu hình redirect mọi request HTTP sang HTTPS (mã 301). Điều gì xảy ra?',
      options: ['Probe healthy vì 301 là phản hồi hợp lệ', 'Probe tự đi theo redirect sang HTTPS', 'Probe fail vì Load Balancer chỉ chấp nhận HTTP 200', 'Load Balancer tự chuyển probe sang TCP'],
      answer: [2],
      explain: 'Load Balancer HTTP probe chỉ coi mã 200 là healthy; mọi mã khác kể cả 301 là fail. Probe không đi theo redirect và không tự đổi giao thức.'
    },
    {
      q: 'Các VM nằm trong backend pool của internal Standard Load Balancer, không có public IP. Chúng không tải được bản cập nhật từ Internet. Giải pháp được khuyến nghị là gì?',
      options: ['Bật HA ports', 'Chuyển sang Basic Load Balancer', 'Thêm inbound NAT rule', 'Gắn NAT Gateway vào subnet của VM'],
      answer: [3],
      explain: 'Internal Standard LB không cung cấp outbound; NAT Gateway là cách khuyến nghị để có outbound Internet. HA ports là cho cân bằng tải inbound. Basic đã retire. Inbound NAT rule chỉ xử lý chiều vào.'
    },
    {
      q: 'Bạn cần cân bằng tải ứng dụng web và chuyển request <code>/images/*</code> tới pool riêng, <code>/api/*</code> tới pool khác. Bạn nên dùng gì?',
      options: ['Application Gateway', 'Azure Load Balancer Standard với hai rule', 'Azure Load Balancer Gateway SKU', 'Inbound NAT rules'],
      answer: [0],
      explain: 'Định tuyến theo URL path là tính năng tầng 7 của Application Gateway. Load Balancer ở tầng 4 không đọc URL nên không thể phân biệt path, bất kể SKU. Inbound NAT rule chỉ ánh xạ cổng.'
    },
    {
      q: 'Bạn muốn dùng NSG rule riêng để cho phép health probe của Load Balancer mà không phải nhập IP cụ thể. Bạn dùng gì làm source?',
      options: ['Service tag VirtualNetwork', 'Service tag AzureLoadBalancer', 'Service tag Internet', 'Application security group của backend'],
      answer: [1],
      explain: 'Service tag AzureLoadBalancer đại diện cho IP nguồn của probe (168.63.129.16). VirtualNetwork và Internet không bao gồm đúng nguồn probe. Application security group dùng để nhóm VM của bạn, không đại diện cho hạ tầng Azure.'
    },
    {
      q: 'Bạn có public IP SKU Basic và muốn gán nó làm frontend cho một Standard Load Balancer mới. Kết quả là gì?',
      options: ['Thành công, SKU public IP không quan trọng', 'Thành công nhưng mất SLA', 'Thất bại; Standard LB yêu cầu public IP SKU Standard', 'Thành công nếu bật availability zones'],
      answer: [2],
      explain: 'SKU của public IP phải khớp SKU của Load Balancer; Standard LB chỉ nhận public IP Standard. Các lựa chọn còn lại giả định có thể trộn SKU, điều Azure không cho phép.'
    },
    {
      q: 'Bạn cần chọn phương án cân bằng tải cho cụm SQL Server Always On availability group sau internal Load Balancer. Thiết lập nào trên load-balancing rule là cần thiết?',
      options: ['Session persistence Client IP and protocol', 'Floating IP (Direct Server Return)', 'Idle timeout 30 phút', 'Outbound rule'],
      answer: [1],
      explain: 'AG listener cần Floating IP để VM nhận gói tin có đích là frontend IP. Session persistence, idle timeout và outbound rule không đáp ứng yêu cầu này.'
    },
    {
      q: 'Bạn muốn biết backend VM nào của Standard Load Balancer đang bị đánh dấu down, theo thời gian. Bạn xem gì? (Chọn 2)',
      options: ['Metric Health Probe Status trên Azure Monitor', 'Load Balancer Insights', 'Activity log của resource group', 'Effective routes của NIC'],
      answer: [0, 1],
      explain: 'Metric Health Probe Status (đa chiều theo backend IP) và trang Insights hiển thị sức khỏe từng instance. Activity log ghi thao tác quản trị, không phải trạng thái probe. Effective routes cho thấy định tuyến, không phải sức khỏe backend.'
    },
    {
      q: 'Một client nằm trong backend pool của internal Load Balancer ILB1 gọi tới frontend IP của chính ILB1, và thỉnh thoảng kết nối thất bại. Nguyên nhân hợp lý nhất là gì?',
      options: ['NSG chặn traffic trong VNet', 'Cần public IP cho ILB1', 'Health probe đang dùng TCP', 'Khi luồng được ánh xạ trở lại chính VM gửi, kết nối tới frontend ILB sẽ thất bại'],
      answer: [3],
      explain: 'Đây là giới hạn đã được ghi nhận: VM backend truy cập frontend của chính ILB sẽ thất bại khi luồng được chọn quay về chính nó, nên lỗi mang tính chập chờn. NSG mặc định cho phép traffic trong VNet. ILB không dùng public IP. Probe TCP là cấu hình hợp lệ.'
    }
  ]
});

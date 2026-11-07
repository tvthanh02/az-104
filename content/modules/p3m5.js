AZ.addModule({
  id: 'p3m5',
  summary: 'Mỗi subnet trong Azure đều có một bảng định tuyến do hệ thống tạo sẵn (system routes). Module này giải thích cách Azure chọn đường đi cho gói tin, cách ghi đè bằng <strong>user-defined route (UDR)</strong> trong <strong>route table</strong>, và cách ép lưu lượng đi qua một <strong>network virtual appliance (NVA)</strong> như firewall. Đề AZ-104 rất hay hỏi về next hop type, thứ tự ưu tiên route và điều kiện IP forwarding.',
  objectives: [
    'Liệt kê các system route mặc định và các route tùy chọn (peering, gateway, service endpoint)',
    'Tạo route table, thêm UDR với đúng next hop type và gắn route table vào subnet',
    'Giải thích cách Azure chọn route: longest prefix match, sau đó UDR &gt; BGP &gt; system route',
    'Triển khai NVA: bật IP forwarding trên NIC (Azure) và trong hệ điều hành, đặt NVA ở subnet riêng',
    'Cấu hình forced tunneling và kiểm tra effective routes để xử lý sự cố định tuyến'
  ],
  sections: [
    {
      id: 'routing-capabilities',
      unit: 'Identify routing capabilities of an Azure virtual network',
      title: 'Khả năng định tuyến của Azure virtual network',
      html: `
<p>Azure tự động tạo một bảng route cho <strong>mỗi subnet</strong> và thêm vào đó các <strong>system route</strong> (route hệ thống). Bạn <strong>không thể tạo hay xóa</strong> system route, nhưng có thể <strong>ghi đè</strong> một số route bằng custom route. Chính nhờ system route mà các subnet trong cùng VNet nói chuyện được với nhau ngay mà không cần cấu hình gì.</p>

<h4>System route mặc định</h4>
<table>
  <thead><tr><th>Address prefix</th><th>Next hop type</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td>Address space của VNet (ví dụ 10.1.0.0/16)</td><td>Virtual network</td><td>Định tuyến giữa các subnet trong VNet</td></tr>
    <tr><td>0.0.0.0/0</td><td>Internet</td><td>Mọi đích không khớp route khác thì ra Internet (riêng đích là dịch vụ Azure thì đi trên backbone của Microsoft)</td></tr>
    <tr><td>10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (RFC 1918), 100.64.0.0/10 (RFC 6598)</td><td>None</td><td>Gói tin bị <strong>hủy (drop)</strong>. Nếu dải đó nằm trong address space của VNet, Azure tự đổi next hop thành Virtual network</td></tr>
  </tbody>
</table>

<h4>Route tùy chọn (optional default routes)</h4>
<ul>
  <li><strong>Virtual network peering</strong>: khi peering, mỗi dải address space của VNet bên kia được thêm vào mọi subnet.</li>
  <li><strong>Virtual network gateway</strong>: khi có VPN/ExpressRoute gateway, các prefix học được qua BGP hoặc khai báo trong local network gateway được thêm vào (source = Virtual network gateway).</li>
  <li><strong>VirtualNetworkServiceEndpoint</strong>: khi bật service endpoint cho một subnet, public IP của dịch vụ được thêm <em>chỉ vào subnet đó</em>. Route này <strong>không thể bị ghi đè</strong>.</li>
</ul>

<h4>Custom route: UDR và BGP</h4>
<p>Có hai nguồn custom route:</p>
<div class="compare">
  <div><strong>User-defined route (UDR)</strong>Route tĩnh bạn khai báo trong tài nguyên <strong>route table</strong>. Trang <em>Azure subscription and service limits</em> (nguồn chuẩn về giới hạn) ghi tối đa <strong>1.000 UDR mỗi route table</strong>. Lưu ý: trang tổng quan routing vẫn ghi "mặc định 400, lên 1.000 khi dùng routing configuration của Azure Virtual Network Manager"; hai trang chưa đồng bộ, nên lấy con số 1.000 của trang limits.</div>
  <div><strong>BGP route</strong>Học từ on-premises qua VPN gateway (BGP tùy chọn) hoặc ExpressRoute (BGP bắt buộc). Có thể tắt việc lan truyền route gateway vào một subnet bằng thuộc tính <em>Propagate gateway routes</em> của route table.</div>
</div>

<h4>Next hop type dùng được trong UDR</h4>
<table>
  <thead><tr><th>Next hop type (portal)</th><th>Giá trị CLI/PowerShell</th><th>Khi nào dùng</th></tr></thead>
  <tbody>
    <tr><td>Virtual appliance</td><td><code>VirtualAppliance</code></td><td>Đẩy traffic qua NVA/firewall. Bắt buộc nhập <strong>next hop IP address</strong> (IP private của NIC NVA hoặc frontend IP của internal load balancer)</td></tr>
    <tr><td>Virtual network gateway</td><td><code>VirtualNetworkGateway</code></td><td>Đẩy traffic về VPN gateway. <strong>Chỉ hỗ trợ VPN gateway</strong>, không dùng cho ExpressRoute</td></tr>
    <tr><td>Virtual network</td><td><code>VnetLocal</code></td><td>Giữ traffic trong VNet, ghi đè một route rộng hơn (ví dụ giữ traffic nội subnet không đi qua NVA)</td></tr>
    <tr><td>Internet</td><td><code>Internet</code></td><td>Gửi thẳng ra Internet, ví dụ cho một dải cụ thể khi đã có route 0.0.0.0/0 tới NVA</td></tr>
    <tr><td>None</td><td><code>None</code></td><td>Hủy gói tin tới prefix đó (chặn ở tầng định tuyến)</td></tr>
  </tbody>
</table>
<p><strong>Virtual network peering</strong> và <strong>VirtualNetworkServiceEndpoint</strong> <em>không</em> chọn được làm next hop trong UDR. Address prefix của UDR có thể là một <strong>service tag</strong> (ví dụ <code>Storage</code>, <code>AzureMonitor</code>), tối đa 25 route dùng service tag mỗi route table.</p>

<h4>Tạo route table và gắn vào subnet</h4>
<p>Route table là tài nguyên độc lập, phải ở <strong>cùng region và cùng subscription</strong> với VNet. Một subnet gắn <strong>0 hoặc 1</strong> route table; một route table gắn được cho <strong>nhiều subnet</strong>. Route table có tác dụng với traffic <strong>đi ra (outbound) từ subnet</strong> được gắn.</p>
<pre><code># Azure CLI
az network route-table create -g rg1 -n rt-private --disable-bgp-route-propagation false
az network route-table route create -g rg1 --route-table-name rt-private -n to-dmz \\
  --address-prefix 10.0.2.0/24 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network vnet subnet update -g rg1 --vnet-name vnet1 -n private --route-table rt-private

# Azure PowerShell
$rt = New-AzRouteTable -ResourceGroupName rg1 -Name rt-private -Location eastus
Add-AzRouteConfig -RouteTable $rt -Name to-dmz -AddressPrefix 10.0.2.0/24 -NextHopType VirtualAppliance -NextHopIpAddress 10.0.1.4
$rt | Set-AzRouteTable
$vnet = Get-AzVirtualNetwork -ResourceGroupName rg1 -Name vnet1
Set-AzVirtualNetworkSubnetConfig -VirtualNetwork $vnet -Name private -AddressPrefix 10.0.1.0/24 -RouteTable $rt
$vnet | Set-AzVirtualNetwork</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo route table, thêm UDR và gắn vào subnet</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Tìm dịch vụ Route tables và tạo mới:<br><span class="path">Azure portal › Route tables › + Create</span></li>
    <li>Điền trang <strong>Create Route table</strong>. Region phải trùng region của VNet:
      <div class="blade">
        <div class="blade-title">Create Route table</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">learn-rg</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">East US</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">publictable</span></div>
        <div class="pf"><label>Propagate gateway routes</label><span class="pv radio">Yes</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn No nếu không muốn route học từ VPN/ExpressRoute gateway xuất hiện trong subnet</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Mở route table vừa tạo, thêm một UDR:<br><span class="path">publictable › Settings › Routes › + Add</span>
      <div class="blade">
        <div class="blade-title">Add route</div>
        <div class="pf"><label class="req">Route name</label><span class="pv">productionsubnet</span></div>
        <div class="pf"><label class="req">Destination type</label><span class="pv sel">IP Addresses</span></div>
        <div class="pf"><label class="req">Destination IP addresses/CIDR ranges</label><span class="pv">10.0.1.0/24</span></div>
        <div class="pf"><label class="req">Next hop type</label><span class="pv sel">Virtual appliance</span></div>
        <div class="pf"><label class="req">Next hop address</label><span class="pv">10.0.2.4</span></div>
        <div class="pf"><label></label><span class="pv note">Destination type còn có Service Tag (ví dụ Storage). Ô Next hop address chỉ hiện khi chọn Virtual appliance</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span></div>
      </div>
    </li>
    <li>Gắn route table vào <strong>subnet nguồn</strong> của traffic:<br><span class="path">publictable › Settings › Subnets › + Associate</span>
      <div class="blade">
        <div class="blade-title">Associate subnet</div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet (learn-rg)</span></div>
        <div class="pf"><label class="req">Subnet</label><span class="pv sel">publicsubnet</span></div>
        <div class="pbtns"><span class="pbtn primary">OK</span></div>
      </div>
    </li>
    <li>Kiểm tra kết quả trên NIC của một VM trong publicsubnet (VM phải đang chạy):<br><span class="path">Network interface › Help › Effective routes</span><br>Route <em>User</em> mới phải ở trạng thái <strong>Active</strong>.</li>
  </ol></div>
</div>

<h4>Effective routes</h4>
<p>Để xem route thực sự áp dụng cho một VM, mở NIC của VM → <strong>Effective routes</strong> (VM phải đang chạy). Cột <em>State</em> cho biết route nào <strong>Active</strong> và route nào <strong>Invalid</strong> (bị UDR ghi đè).</p>
<pre><code>az network nic show-effective-route-table -g rg1 -n vm1-nic -o table
Get-AzEffectiveRouteTable -ResourceGroupName rg1 -NetworkInterfaceName vm1-nic</code></pre>
<figure class="fig"><img src="assets/img/p3m5/effective-routes-custom.png" alt="Trang Effective routes của NIC: route mặc định 0.0.0.0/0 tới Internet ở trạng thái Invalid, route User 0.0.0.0/0 tới Virtual appliance 10.0.0.5 ở trạng thái Active" loading="lazy"><figcaption>Hình 1. Effective routes sau khi gắn route table <code>myRouteTable</code>: UDR <code>0.0.0.0/0 → Virtual appliance 10.0.0.5</code> là <strong>Active</strong>, còn system route <code>0.0.0.0/0 → Internet</code> cùng prefix chuyển sang <strong>Invalid</strong>. Nguồn: <a href="https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<div class="callout warn"><strong>GatewaySubnet</strong>Không tắt <em>gateway route propagation</em> trên GatewaySubnet, và không gắn route table chứa route 0.0.0.0/0 vào GatewaySubnet của VPN gateway: gateway có thể ngừng hoạt động.</div>
<div class="callout exam"><strong>Góc thi</strong>Câu hỏi "VM ở subnet A không ping được VM ở subnet B dù không có NSG chặn" → kiểm tra route table của subnet A có UDR next hop <strong>None</strong> hoặc trỏ tới NVA đang tắt. Câu hỏi "cần tạo route để các subnet trong VNet liên lạc với nhau" → <strong>không cần</strong>, system route đã làm việc đó.</div>
`
    },
    {
      id: 'exercise-custom-routes',
      unit: 'Exercise - Create custom routes',
      title: 'Thực hành: tạo custom route cho kiến trúc 3 subnet',
      html: `
<p>Bài lab trên Learn dựng một VNet có 3 subnet: <strong>publicsubnet</strong>, <strong>privatesubnet</strong> và <strong>dmzsubnet</strong> (nơi đặt NVA). Mục tiêu: mọi traffic từ public subnet sang private subnet phải đi qua NVA.</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="VNet có ba subnet: traffic từ publicsubnet tới privatesubnet đi qua NVA trong dmzsubnet nhờ route table publictable, chiều ngược lại đi thẳng">
  <rect class="zone" x="10" y="10" width="700" height="280" rx="12"/>
  <text x="26" y="32" class="t-sm t-mute">vnet · 10.0.0.0/16</text>

  <rect class="box-a" x="30" y="44" width="180" height="50" rx="8"/>
  <text x="120" y="64" text-anchor="middle" class="t-b t-a">publictable</text>
  <text x="120" y="83" text-anchor="middle" class="t-sm">10.0.1.0/24 → 10.0.2.4</text>
  <line class="ln dash" x1="120" y1="94" x2="120" y2="120"/>
  <text x="128" y="111" class="t-sm t-mute">gắn vào subnet</text>

  <rect class="box" x="30" y="120" width="180" height="90" rx="10"/>
  <text x="120" y="146" text-anchor="middle" class="t-b">publicsubnet</text>
  <text x="120" y="165" text-anchor="middle" class="t-sm t-mute">10.0.0.0/24</text>
  <text x="120" y="191" text-anchor="middle">VM public</text>

  <rect class="box-e" x="270" y="120" width="180" height="90" rx="10"/>
  <text x="360" y="146" text-anchor="middle" class="t-b">dmzsubnet</text>
  <text x="360" y="165" text-anchor="middle" class="t-sm t-mute">10.0.2.0/24</text>
  <text x="360" y="191" text-anchor="middle">NVA 10.0.2.4</text>

  <rect class="box" x="510" y="120" width="180" height="90" rx="10"/>
  <text x="600" y="146" text-anchor="middle" class="t-b">privatesubnet</text>
  <text x="600" y="165" text-anchor="middle" class="t-sm t-mute">10.0.1.0/24</text>
  <text x="600" y="191" text-anchor="middle">VM private</text>

  <line class="ln-a" x1="210" y1="165" x2="266" y2="165" marker-end="url(#arr-a)"/>
  <text x="238" y="156" text-anchor="middle" class="t-sm t-a">UDR</text>
  <line class="ln-a" x1="450" y1="165" x2="506" y2="165" marker-end="url(#arr-a)"/>
  <text x="478" y="156" text-anchor="middle" class="t-sm t-a">forward</text>

  <path class="ln-s dash" d="M600 210 V246 H120 V214" marker-end="url(#arr-s)"/>
  <text x="360" y="272" text-anchor="middle" class="t-sm t-s">Chiều về: privatesubnet không gắn route table → system route, đi thẳng (1 hop)</text>
</svg>
<figcaption>Hình 1. Route table gắn vào <strong>subnet nguồn</strong> (publicsubnet) nên chỉ chiều public → private bị ép qua NVA (2 hop). Chiều private → public dùng system route và đi thẳng. Muốn cả hai chiều qua NVA, phải gắn thêm route table cho privatesubnet.</figcaption>
</figure>
<ol class="steps">
  <li>Tạo route table <code>publictable</code> (cùng region với VNet). Có thể bỏ chọn <em>Propagate gateway routes</em> nếu không muốn route từ gateway xuất hiện.</li>
  <li>Thêm route <code>productionsubnet</code>: address prefix <code>10.0.1.0/24</code>, next hop type <strong>VirtualAppliance</strong>, next hop IP <code>10.0.2.4</code>.</li>
  <li>Tạo VNet và 3 subnet theo sơ đồ.</li>
  <li>Gắn route table vào <strong>publicsubnet</strong> (subnet nguồn của traffic), không gắn vào dmzsubnet.</li>
</ol>
<pre><code>az network route-table create -g learn-rg -n publictable --disable-bgp-route-propagation false
az network route-table route create -g learn-rg --route-table-name publictable \\
  -n productionsubnet --address-prefix 10.0.1.0/24 \\
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.2.4
az network vnet subnet update -g learn-rg --vnet-name vnet -n publicsubnet --route-table publictable</code></pre>

<h4>Những điều bài lab muốn bạn rút ra</h4>
<ul>
  <li>Route table gắn vào <strong>subnet nguồn</strong>. Muốn traffic chiều về (private → public) cũng qua NVA thì phải gắn thêm một route table cho privatesubnet với prefix 10.0.0.0/24 → NVA. Nếu chỉ định tuyến một chiều, firewall có trạng thái (stateful) sẽ gặp <strong>asymmetric routing</strong> và có thể drop gói tin.</li>
  <li>UDR trỏ tới <code>10.0.1.0/24</code> dài hơn system route <code>10.0.0.0/16</code> nên được chọn (longest prefix match).</li>
  <li>Bạn có thể tạo route trỏ tới một IP chưa tồn tại; Azure không kiểm tra. Khi NVA tắt, traffic bị "rơi vào hố đen".</li>
</ul>

<h4>Vài tình huống UDR phổ biến</h4>
<table>
  <thead><tr><th>Yêu cầu</th><th>UDR</th></tr></thead>
  <tbody>
    <tr><td>Mọi traffic ra Internet qua Azure Firewall</td><td><code>0.0.0.0/0</code> → VirtualAppliance, IP private của firewall</td></tr>
    <tr><td>Traffic giữa spoke A và spoke B đi qua hub firewall</td><td>Mỗi spoke: prefix của spoke kia → VirtualAppliance (IP firewall ở hub)</td></tr>
    <tr><td>Chặn subnet A gửi tới dải 10.50.0.0/16</td><td><code>10.50.0.0/16</code> → None</td></tr>
    <tr><td>Đã ép 0.0.0.0/0 về NVA nhưng muốn Storage đi thẳng</td><td>Prefix = service tag <code>Storage</code> → Internet, hoặc bật service endpoint</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>Đề hay cho bảng gồm nhiều subnet và route table, hỏi "route table RT1 gắn được vào subnet nào". Nhớ: route table và VNet phải <strong>cùng region, cùng subscription</strong>; mỗi subnet tối đa <strong>một</strong> route table; route table có thể gắn cho subnet của <strong>nhiều VNet khác nhau</strong> miễn là cùng region và subscription.</div>
`
    },
    {
      id: 'what-is-nva',
      unit: 'What is an NVA?',
      title: 'Network virtual appliance (NVA) là gì?',
      html: `
<p><strong>Network virtual appliance (NVA)</strong> là một VM chạy phần mềm mạng như firewall, WAN optimizer, router, IDS/IPS, load balancer L7. Có thể là sản phẩm Marketplace (Palo Alto, Fortinet, Check Point, Barracuda…) hoặc một VM Linux/Windows tự cấu hình làm router. <strong>Azure Firewall</strong> là dịch vụ PaaS được quản lý, nhưng về mặt định tuyến được dùng giống hệt một NVA (next hop VirtualAppliance trỏ tới IP private của firewall).</p>

<h4>Điều kiện để một VM chuyển tiếp (forward) gói tin</h4>
<ol>
  <li><strong>IP forwarding trên NIC (cấu hình Azure)</strong>: theo mặc định Azure chỉ giao gói tin tới NIC nếu đích là IP của chính NIC đó, và chặn gói tin gửi ra có source IP không phải của NIC. Bật <em>Enable IP forwarding</em> để tắt kiểm tra source/destination này. Bật trên <strong>mọi NIC</strong> nhận traffic cần chuyển tiếp.</li>
  <li><strong>IP forwarding trong hệ điều hành</strong>: Linux bật <code>net.ipv4.ip_forward=1</code>; Windows bật vai trò Routing and Remote Access hoặc forwarding trên interface. Appliance từ Marketplace thường đã làm sẵn.</li>
</ol>
<pre><code># Bật IP forwarding trên NIC (Azure)
az network nic update -g rg1 -n nva-nic --ip-forwarding true

$nic = Get-AzNetworkInterface -ResourceGroupName rg1 -Name nva-nic
$nic.EnableIPForwarding = $true
$nic | Set-AzNetworkInterface

# Trong Linux
sudo sysctl -w net.ipv4.ip_forward=1</code></pre>

<h4>Thiết kế NVA đúng cách</h4>
<ul>
  <li>Đặt NVA ở <strong>subnet riêng</strong> (ví dụ DMZ). Nếu đặt NVA trong cùng subnet với tài nguyên được định tuyến qua nó, có thể tạo <strong>vòng lặp định tuyến</strong>.</li>
  <li>Next hop IP phải liên lạc trực tiếp được (cùng VNet hoặc VNet peering), không được phải đi qua ExpressRoute gateway hay Virtual WAN.</li>
  <li>Nếu NVA cần đưa traffic ra Internet, nó phải <strong>SNAT</strong> (hoặc proxy) về IP private của chính nó; sau đó Azure NAT ra public IP.</li>
  <li>NVA nhiều NIC: thường có NIC "untrusted" (hướng Internet) và NIC "trusted" (hướng nội bộ), mỗi NIC ở một subnet.</li>
</ul>

<h4>Tính sẵn sàng cao cho NVA</h4>
<p>Một NVA đơn lẻ là điểm lỗi duy nhất. Mô hình khuyến nghị: hai hoặc nhiều NVA đặt sau một <strong>Standard internal load balancer</strong> với rule <strong>HA ports</strong>, rồi UDR trỏ next hop tới <strong>frontend IP của load balancer</strong>. Một lựa chọn khác cho chuỗi NVA bên thứ ba là Gateway Load Balancer.</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 200" role="img" aria-label="Subnet app có UDR 0.0.0.0/0 trỏ tới frontend IP của internal load balancer HA ports, phía sau là hai NVA">
  <rect class="box" x="10" y="65" width="170" height="70" rx="10"/>
  <text x="95" y="93" text-anchor="middle" class="t-b">Subnet app</text>
  <text x="95" y="114" text-anchor="middle" class="t-sm t-mute">UDR 0.0.0.0/0</text>

  <rect class="box-a" x="250" y="55" width="190" height="90" rx="10"/>
  <text x="345" y="85" text-anchor="middle" class="t-b t-a">Internal LB (Standard)</text>
  <text x="345" y="106" text-anchor="middle" class="t-sm">frontend 10.0.9.10</text>
  <text x="345" y="125" text-anchor="middle" class="t-sm">rule HA ports</text>

  <rect class="box-e" x="510" y="20" width="200" height="60" rx="10"/>
  <text x="610" y="45" text-anchor="middle" class="t-b">NVA1</text>
  <text x="610" y="65" text-anchor="middle" class="t-sm">IP forwarding bật</text>
  <rect class="box-e" x="510" y="120" width="200" height="60" rx="10"/>
  <text x="610" y="145" text-anchor="middle" class="t-b">NVA2</text>
  <text x="610" y="165" text-anchor="middle" class="t-sm">IP forwarding bật</text>

  <line class="ln-a" x1="180" y1="100" x2="246" y2="100" marker-end="url(#arr-a)"/>
  <text x="213" y="91" text-anchor="middle" class="t-sm t-a">next hop</text>
  <line class="ln" x1="440" y1="88" x2="506" y2="55" marker-end="url(#arr)"/>
  <line class="ln" x1="440" y1="112" x2="506" y2="145" marker-end="url(#arr)"/>
  <text x="474" y="104" text-anchor="middle" class="t-sm t-mute">probe</text>
</svg>
<figcaption>Hình 1. NVA có tính sẵn sàng cao: UDR trỏ next hop (Virtual appliance) tới <strong>frontend IP của internal LB</strong>; rule HA ports cân bằng mọi cổng TCP/UDP tới các NVA khỏe mạnh.</figcaption>
</figure>

<div class="callout tip"><strong>Mẹo kiểm tra nhanh</strong>Dùng Network Watcher <strong>Next hop</strong> từ VM nguồn tới IP đích: kết quả phải là <code>VirtualAppliance</code> với IP của NVA, kèm ID của route table đang áp dụng.</div>
<div class="callout exam"><strong>Góc thi</strong>"Đã tạo UDR trỏ tới NVA nhưng traffic không đi qua được" → đáp án thường là <strong>bật IP forwarding trên NIC của NVA</strong>. Lưu ý: bật IP forwarding trên NIC của <em>VM nguồn</em> hoặc <em>VM đích</em> là sai, chỉ NIC của thiết bị chuyển tiếp mới cần.</div>
`
    },
    {
      id: 'exercise-nva',
      unit: 'Exercise - Create an NVA and virtual machines',
      title: 'Thực hành: tạo NVA và các VM',
      html: `
<p>Tiếp nối bài lab, bạn tạo VM <code>nva</code> trong <strong>dmzsubnet</strong>, bật IP forwarding cho NIC của nó, rồi bật forwarding trong Ubuntu. Sau đó tạo VM <code>public</code> và <code>private</code> ở hai subnet còn lại.</p>
<ol class="steps">
  <li>Tạo VM NVA trong dmzsubnet:
<pre><code>az vm create -g learn-rg -n nva --vnet-name vnet --subnet dmzsubnet \\
  --image Ubuntu2204 --admin-username azureuser --admin-password &lt;mật-khẩu&gt;</code></pre></li>
  <li>Lấy ID của NIC và bật IP forwarding trên Azure:
<pre><code>NICID=$(az vm nic list -g learn-rg --vm-name nva --query "[].{id:id}" -o tsv)
NICNAME=$(az vm nic show -g learn-rg --vm-name nva --nic $NICID --query "{name:name}" -o tsv)
az network nic update -g learn-rg -n $NICNAME --ip-forwarding true</code></pre></li>
  <li>Bật IP forwarding trong hệ điều hành của NVA (qua SSH):
<pre><code>ssh azureuser@&lt;public-ip-nva&gt; 'sudo sysctl -w net.ipv4.ip_forward=1; exit;'</code></pre>
  Để giữ sau khi khởi động lại, đặt <code>net.ipv4.ip_forward=1</code> trong <code>/etc/sysctl.conf</code>.</li>
  <li>Tạo VM <code>public</code> trong publicsubnet và <code>private</code> trong privatesubnet (bài lab dùng cloud-init cài <code>inetutils-traceroute</code>).</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: bật IP forwarding cho NVA (cả Azure lẫn hệ điều hành)</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở VM NVA, vào trang mạng và bấm tên network interface cạnh <em>Network Interface:</em><br><span class="path">Virtual machines › nva › Networking › Network settings › nva-nic</span></li>
    <li>Trên trang của NIC, mở IP configurations và bật IP forwarding:<br><span class="path">nva-nic › Settings › IP configurations</span>
      <div class="blade">
        <div class="blade-title">nva-nic | IP configurations</div>
        <div class="pf"><label>Enable IP forwarding</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label></label><span class="pv note">Thiết lập ở cấp NIC, áp dụng ngay, không cần khởi động lại VM. Bật trên mọi NIC của NVA nhận traffic cần chuyển tiếp</span></div>
        <div class="pbtns"><span class="pbtn primary">Apply</span></div>
      </div>
    </li>
    <li>Bật forwarding trong Linux mà không cần SSH, dùng Run command:<br><span class="path">Virtual machines › nva › Operations › Run command › RunShellScript</span>
      <div class="blade">
        <div class="blade-title">Run Command Script</div>
        <div class="pf"><label>Script</label><span class="pv">sudo sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf; sudo sysctl -p</span></div>
        <div class="pbtns"><span class="pbtn primary">Run</span></div>
      </div>
    </li>
    <li>Xác nhận: Output hiển thị <code>net.ipv4.ip_forward = 1</code>. Lệnh sửa <code>/etc/sysctl.conf</code> nên giá trị được giữ sau khi khởi động lại.</li>
  </ol></div>
</div>

<h4>Tại sao cần cả hai bước forwarding?</h4>
<div class="compare">
  <div><strong>Chỉ bật trên NIC (Azure)</strong>Azure chịu giao gói tin có đích không phải NVA tới NIC, nhưng kernel Linux thấy đích không phải mình nên <strong>bỏ gói tin</strong>.</div>
  <div><strong>Chỉ bật trong OS</strong>Kernel sẵn sàng chuyển tiếp, nhưng Azure SDN <strong>không bao giờ giao</strong> gói tin đó tới NIC (và chặn gói tin gửi ra với source IP lạ).</div>
</div>

<h4>Kiểm tra lại cấu hình</h4>
<pre><code>az network nic show -g learn-rg -n $NICNAME --query enableIPForwarding
az network nic show-effective-route-table -g learn-rg -n &lt;nic-cua-vm-public&gt; -o table</code></pre>
<div class="callout note"><strong>Lưu ý</strong>Bật/tắt IP forwarding trên NIC không cần khởi động lại VM. Thuộc tính này nằm ở cấp NIC (CLI: <code>--ip-forwarding</code>, PowerShell: <code>EnableIPForwarding</code>), không nằm ở cấp VNet hay subnet.</div>
`
    },
    {
      id: 'exercise-route-nva',
      unit: 'Exercise - Route traffic through the NVA',
      title: 'Thực hành: định tuyến traffic qua NVA và kiểm chứng',
      html: `
<p>Bước cuối của bài lab: dùng <code>traceroute</code> để chứng minh traffic giữa hai subnet đi qua NVA đúng như mong đợi.</p>
<ol class="steps">
  <li>SSH vào VM <code>public</code> và chạy <code>traceroute private --type=icmp</code>. Kết quả có <strong>2 hop</strong>: hop đầu là <code>10.0.2.4</code> (NVA), hop sau là VM private. Đó là vì publicsubnet có UDR 10.0.1.0/24 → 10.0.2.4.</li>
  <li>SSH vào VM <code>private</code> và chạy <code>traceroute public --type=icmp</code>. Kết quả chỉ <strong>1 hop</strong>: traffic đi thẳng, vì privatesubnet <em>không</em> gắn route table nên dùng system route Virtual network.</li>
</ol>
<p>Kết quả này minh họa rõ: route table chỉ ảnh hưởng tới traffic <strong>đi ra</strong> từ subnet được gắn, và định tuyến trong Azure là <strong>một chiều</strong> theo từng subnet.</p>

<h4>Forced tunneling (ép tunnel về on-premises)</h4>
<p><strong>Forced tunneling</strong> là ép toàn bộ traffic hướng Internet từ Azure quay về on-premises (qua VPN hoặc ExpressRoute) để kiểm tra và ghi log trước khi ra Internet. Cách làm:</p>
<ul>
  <li><strong>VPN gateway</strong>: tạo UDR <code>0.0.0.0/0</code> → <code>VirtualNetworkGateway</code> và gắn vào các subnet cần ép. Với VPN gateway route-based không dùng BGP, chỉ định <em>default site</em> (PowerShell <code>Set-AzVirtualNetworkGatewayDefaultSite</code>). Nếu dùng BGP, on-premises chỉ cần quảng bá route 0.0.0.0/0.</li>
  <li><strong>ExpressRoute</strong>: không tạo UDR tới ExpressRoute gateway được; phải để on-premises <strong>quảng bá default route 0.0.0.0/0 qua BGP</strong>.</li>
  <li>Subnet nào cần ra Internet trực tiếp (ví dụ subnet có public endpoint) thì gắn route table khác hoặc không gắn route table.</li>
</ul>
<div class="callout warn"><strong>Ảnh hưởng của 0.0.0.0/0 tới NVA/gateway</strong>Khi ghi đè 0.0.0.0/0, traffic tới public IP của dịch vụ Azure (Storage, SQL…) cũng bị đẩy qua next hop đó, trừ dịch vụ có service endpoint (prefix dài hơn). Tài nguyên trong subnet cũng không còn nhận kết nối trực tiếp từ Internet qua public IP của chúng một cách đối xứng.</div>

<h4>Các lỗi thường gặp khi traffic không qua NVA</h4>
<table>
  <thead><tr><th>Triệu chứng</th><th>Nguyên nhân thường gặp</th></tr></thead>
  <tbody>
    <tr><td>Traffic bị drop tại NVA</td><td>Chưa bật IP forwarding trên NIC hoặc trong OS; firewall trên NVA chặn</td></tr>
    <tr><td>Kết nối TCP chập chờn hoặc bị reset</td><td>Định tuyến bất đối xứng: chiều đi qua NVA, chiều về không</td></tr>
    <tr><td>Route không có hiệu lực</td><td>Route table chưa gắn vào đúng subnet nguồn; có route dài hơn khớp trước</td></tr>
    <tr><td>Next hop hiện IP là None</td><td>NVA đã tắt/bị deallocate hoặc chưa cấu hình xong</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>Công cụ để xác nhận gói tin đi qua thiết bị nào: <strong>Network Watcher Next hop</strong> (cho biết next hop type, IP và route table ID) hoặc xem <strong>Effective routes</strong> trên NIC. Đừng chọn IP flow verify, công cụ đó chỉ kiểm tra NSG.</div>
`
    },
    {
      id: 'route-selection',
      extra: true,
      title: 'Thứ tự chọn route (longest prefix match)',
      html: `
<p>Khi một gói tin rời subnet, Azure chọn route theo <strong>địa chỉ IP đích</strong> qua hai bước:</p>
<ol>
  <li><strong>Longest prefix match</strong>: chọn route có prefix <em>dài nhất</em> (cụ thể nhất) chứa IP đích. /24 thắng /16, /16 thắng /0.</li>
  <li>Nếu có nhiều route <strong>cùng prefix</strong>, ưu tiên theo nguồn: <strong>User-defined route &gt; BGP route &gt; System route</strong>.</li>
</ol>

<h4>Ví dụ</h4>
<table>
  <thead><tr><th>Route</th><th>Nguồn</th><th>Next hop</th></tr></thead>
  <tbody>
    <tr><td>10.0.0.0/16</td><td>Default (system)</td><td>Virtual network</td></tr>
    <tr><td>10.0.0.0/16</td><td>User</td><td>VirtualAppliance 10.0.100.4</td></tr>
    <tr><td>10.0.0.0/24</td><td>User</td><td>Virtual network</td></tr>
    <tr><td>10.10.0.0/16</td><td>Virtual network gateway (BGP)</td><td>Virtual network gateway</td></tr>
    <tr><td>0.0.0.0/0</td><td>User</td><td>VirtualAppliance 10.0.100.4</td></tr>
  </tbody>
</table>
<ul>
  <li>Đích <strong>10.0.0.5</strong> → khớp 10.0.0.0/24 (dài nhất) → đi thẳng trong VNet, không qua NVA.</li>
  <li>Đích <strong>10.0.1.5</strong> → khớp 10.0.0.0/16. Có hai route cùng prefix; UDR thắng system → qua NVA. System route chuyển sang trạng thái <strong>Invalid</strong>.</li>
  <li>Đích <strong>10.10.3.3</strong> → khớp 10.10.0.0/16 (BGP) → đi qua VPN gateway, dù có UDR 0.0.0.0/0, vì /16 dài hơn /0.</li>
  <li>Đích <strong>8.8.8.8</strong> → chỉ khớp 0.0.0.0/0; UDR thắng system → qua NVA.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 280" role="img" aria-label="Ví dụ chọn route cho đích 10.0.1.5: loại route không chứa đích, chọn prefix dài nhất /16, rồi UDR thắng system route cùng prefix">
  <rect class="box" x="10" y="105" width="130" height="70" rx="10"/>
  <text x="75" y="133" text-anchor="middle" class="t-b">Đích</text>
  <text x="75" y="154" text-anchor="middle">10.0.1.5</text>

  <rect class="box" x="190" y="20" width="330" height="50" rx="8"/>
  <text x="205" y="41">10.0.0.0/24 · User → Virtual network</text>
  <text x="205" y="60" class="t-sm t-mute">không chứa 10.0.1.5 → loại</text>

  <rect class="box-s" x="190" y="85" width="330" height="50" rx="8"/>
  <text x="205" y="106" class="t-b">10.0.0.0/16 · User → NVA</text>
  <text x="205" y="125" class="t-sm t-s">khớp /16 (dài nhất), UDR thắng → Active</text>

  <rect class="box-x" x="190" y="150" width="330" height="50" rx="8"/>
  <text x="205" y="171">10.0.0.0/16 · Default → VNet</text>
  <text x="205" y="190" class="t-sm t-x">cùng /16 nhưng system thua UDR → Invalid</text>

  <rect class="box" x="190" y="215" width="330" height="50" rx="8"/>
  <text x="205" y="236">0.0.0.0/0 · User → NVA</text>
  <text x="205" y="255" class="t-sm t-mute">có khớp, nhưng /0 ngắn hơn /16 → loại</text>

  <line class="ln" x1="140" y1="130" x2="186" y2="45" marker-end="url(#arr)"/>
  <line class="ln" x1="140" y1="136" x2="186" y2="110" marker-end="url(#arr)"/>
  <line class="ln" x1="140" y1="144" x2="186" y2="175" marker-end="url(#arr)"/>
  <line class="ln" x1="140" y1="150" x2="186" y2="240" marker-end="url(#arr)"/>

  <rect class="box-a" x="570" y="95" width="140" height="90" rx="10"/>
  <text x="640" y="122" text-anchor="middle" class="t-b t-a">Next hop</text>
  <text x="640" y="144" text-anchor="middle" class="t-sm">VirtualAppliance</text>
  <text x="640" y="164" text-anchor="middle" class="t-sm">10.0.100.4</text>
  <line class="ln-s" x1="520" y1="110" x2="566" y2="135" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. Hai bước cho đích 10.0.1.5: (1) bỏ route không chứa đích và chọn prefix dài nhất (/16); (2) trong hai route /16, nguồn <strong>User</strong> thắng <strong>Default</strong>. Route default bị ghi đè hiện là <em>Invalid</em> trong Effective routes.</figcaption>
</figure>

<div class="callout warn"><strong>Ngoại lệ quan trọng</strong>System route cho traffic <strong>trong VNet, VNet peering và service endpoint</strong> được ưu tiên <em>ngay cả khi BGP route cụ thể hơn</em>. Route có next hop <code>VirtualNetworkServiceEndpoint</code> không thể bị ghi đè kể cả bằng route table.</div>

<h4>Quy trình phân tích một câu hỏi định tuyến</h4>
<ol class="steps">
  <li>Xác định <strong>subnet nguồn</strong> và route table đang gắn vào subnet đó (route table của subnet đích không liên quan đến chiều đi).</li>
  <li>Liệt kê mọi route (system + optional + UDR + BGP) chứa IP đích.</li>
  <li>Chọn prefix dài nhất; nếu bằng nhau thì UDR &gt; BGP &gt; system.</li>
  <li>Xem next hop: None = drop; VirtualAppliance = kiểm tra IP forwarding; VirtualNetworkGateway = kiểm tra gateway.</li>
</ol>

<div class="callout exam"><strong>Bẫy thi</strong>Đề cho UDR 0.0.0.0/0 → NVA và hỏi traffic tới VM ở VNet peering đi đâu. Đáp án: <strong>đi thẳng qua peering</strong>, vì system route peering có prefix dài hơn /0. Muốn ép traffic peering qua NVA, phải tạo UDR với <strong>prefix của VNet peer</strong> (cùng độ dài hoặc dài hơn).</div>
`
    }
  ],
  keyFacts: [
    'Azure tự tạo system route cho mọi subnet: address space VNet → <strong>Virtual network</strong>, 0.0.0.0/0 → <strong>Internet</strong>, các dải private RFC 1918 và 100.64.0.0/10 → <strong>None</strong>.',
    'Next hop type trong UDR: <strong>Virtual appliance, Virtual network gateway, Virtual network, Internet, None</strong>. Không chọn được VNet peering hay service endpoint.',
    'Chọn route: <strong>longest prefix match</strong> trước, cùng prefix thì <strong>UDR &gt; BGP &gt; System</strong>.',
    'Một subnet gắn <strong>0 hoặc 1</strong> route table; một route table gắn được cho nhiều subnet, phải <strong>cùng region và subscription</strong> với VNet.',
    'Route table chỉ tác động lên traffic <strong>đi ra</strong> từ subnet được gắn.',
    'NVA cần <strong>IP forwarding trên NIC</strong> (thiết lập Azure) và <strong>IP forwarding trong hệ điều hành</strong>.',
    'Next hop <strong>Virtual network gateway</strong> trong UDR chỉ hỗ trợ <strong>VPN gateway</strong>; với ExpressRoute phải quảng bá route qua BGP.',
    'Một route table chứa tối đa <strong>1.000 UDR</strong> (trang Azure limits; trang routing overview còn ghi 400 mặc định); tối đa 25 route dùng service tag mỗi route table.',
    'Xem route thực tế: <strong>Effective routes</strong> trên NIC (<code>az network nic show-effective-route-table</code>) hoặc Network Watcher <strong>Next hop</strong>.',
    'Forced tunneling: UDR 0.0.0.0/0 → VirtualNetworkGateway (VPN) hoặc quảng bá 0.0.0.0/0 qua BGP (ExpressRoute).'
  ],
  traps: [
    'Bật IP forwarding trên NIC của VM nguồn hoặc VM đích. Sai: chỉ NIC của <strong>NVA</strong> (thiết bị chuyển tiếp) mới cần.',
    'Gắn route table vào subnet đích thay vì subnet nguồn. Route table chỉ ảnh hưởng traffic <strong>đi ra</strong> khỏi subnet.',
    'Nghĩ rằng UDR 0.0.0.0/0 sẽ "bắt" luôn traffic tới VNet peering hoặc on-premises. Sai: route cụ thể hơn (peering, BGP /16) vẫn thắng.',
    'Đặt NVA trong cùng subnet với các VM được định tuyến qua nó, gây vòng lặp. NVA nên ở subnet riêng.',
    'Chọn UDR next hop Virtual network gateway để ép traffic về <strong>ExpressRoute</strong>. Không hỗ trợ; phải dùng BGP.',
    'Gắn route table có 0.0.0.0/0 vào GatewaySubnet hoặc tắt gateway route propagation trên GatewaySubnet làm hỏng VPN gateway.',
    'Dùng IP flow verify để chẩn đoán định tuyến. IP flow verify chỉ kiểm tra NSG; định tuyến dùng <strong>Next hop</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Thứ tự chọn route</td><td>Longest prefix → UDR &gt; BGP &gt; System</td></tr>
    <tr><td>Next hop UDR</td><td>VirtualAppliance (cần IP), VirtualNetworkGateway (chỉ VPN), VnetLocal, Internet, None</td></tr>
    <tr><td>None</td><td>Drop gói tin</td></tr>
    <tr><td>Route table ↔ subnet</td><td>1 subnet: 0–1 route table; cùng region + subscription</td></tr>
    <tr><td>NVA</td><td>IP forwarding trên NIC + trong OS; subnet riêng; HA = ILB HA ports</td></tr>
    <tr><td>Forced tunneling</td><td>0.0.0.0/0 → VPN gateway (UDR) hoặc BGP default route</td></tr>
    <tr><td>Xem route thực tế</td><td>Effective routes trên NIC; Network Watcher Next hop</td></tr>
    <tr><td>CLI chính</td><td><code>az network route-table create</code>, <code>... route create</code>, <code>az network vnet subnet update --route-table</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Ba system route mặc định chính của mọi subnet?', back: 'Address space VNet → Virtual network; 0.0.0.0/0 → Internet; các dải private (10/8, 172.16/12, 192.168/16, 100.64/10) → None.' },
    { front: 'Next hop type nào hủy gói tin?', back: '<strong>None</strong>' },
    { front: 'Các next hop type dùng được trong UDR?', back: 'Virtual appliance, Virtual network gateway, Virtual network, Internet, None.' },
    { front: 'Azure chọn route thế nào khi có nhiều route khớp?', back: 'Longest prefix match trước; nếu cùng prefix thì UDR &gt; BGP &gt; System.' },
    { front: 'Một subnet gắn được bao nhiêu route table?', back: 'Tối đa <strong>1</strong>. Một route table gắn được cho nhiều subnet cùng region, cùng subscription.' },
    { front: 'Hai thiết lập IP forwarding cần cho NVA?', back: 'Enable IP forwarding trên <strong>NIC</strong> (Azure) và bật forwarding trong <strong>hệ điều hành</strong>.' },
    { front: 'Lệnh CLI bật IP forwarding trên NIC?', back: '<code>az network nic update -g rg -n nic --ip-forwarding true</code>' },
    { front: 'UDR next hop Virtual network gateway có dùng với ExpressRoute được không?', back: 'Không. Chỉ hỗ trợ VPN gateway. Với ExpressRoute phải quảng bá route qua BGP.' },
    { front: 'Forced tunneling là gì?', back: 'Ép traffic hướng Internet từ Azure về on-premises qua VPN/ExpressRoute: UDR 0.0.0.0/0 → VirtualNetworkGateway hoặc quảng bá 0.0.0.0/0 qua BGP.' },
    { front: 'Xem route đang áp dụng cho một VM ở đâu?', back: 'NIC → <strong>Effective routes</strong>, hoặc <code>az network nic show-effective-route-table</code> / <code>Get-AzEffectiveRouteTable</code>.' },
    { front: 'Số UDR tối đa trong một route table?', back: '<strong>1.000</strong> theo trang Azure subscription and service limits (trang routing overview còn ghi 400 mặc định, 1.000 với Azure Virtual Network Manager).' },
    { front: 'Route nào không thể bị UDR ghi đè?', back: 'Route có next hop <strong>VirtualNetworkServiceEndpoint</strong>.' },
    { front: 'Mô hình HA cho NVA?', back: 'Nhiều NVA sau một <strong>Standard internal load balancer</strong> với rule HA ports; UDR trỏ tới frontend IP của ILB.' },
    { front: 'Tùy chọn nào ngăn route từ VPN/ExpressRoute gateway xuất hiện trong subnet?', back: 'Tắt <strong>Propagate gateway routes</strong> trên route table (<code>--disable-bgp-route-propagation true</code>).' },
    { front: 'Address prefix của UDR có thể là service tag không?', back: 'Có, ví dụ <code>Storage</code>; tối đa 25 route dùng service tag mỗi route table.' }
  ],
  quiz: [
    {
      q: 'Bạn có VNet1 với Subnet1 và Subnet2. Bạn triển khai NVA1 ở Subnet3 và tạo route table RT1 có UDR 10.0.2.0/24 → VirtualAppliance (IP của NVA1), gắn vào Subnet1. Traffic từ Subnet1 tới Subnet2 không đến được đích. NSG không chặn gì. Bạn cần làm gì?',
      options: ['Gắn RT1 vào Subnet2', 'Bật IP forwarding trên NIC của NVA1', 'Bật IP forwarding trên NIC của các VM ở Subnet1', 'Tạo VNet peering giữa Subnet1 và Subnet2'],
      answer: [1],
      explain: 'Azure chỉ giao gói tin có đích khác tới NIC của NVA khi NIC đó bật IP forwarding. Gắn RT1 vào Subnet2 chỉ ảnh hưởng chiều đi ra từ Subnet2. VM nguồn không chuyển tiếp gói tin nên không cần IP forwarding. Peering chỉ dùng giữa các VNet, không phải giữa các subnet.'
    },
    {
      q: 'Subnet1 có route table với các route: 10.0.0.0/16 → VirtualAppliance 10.0.100.4 (User), 10.0.0.0/24 → Virtual network (User), 0.0.0.0/0 → Internet (Default). Một VM ở Subnet1 gửi gói tin tới 10.0.0.25. Gói tin đi đâu?',
      options: ['Tới NVA 10.0.100.4', 'Ra Internet', 'Đi trực tiếp trong VNet', 'Bị hủy'],
      answer: [2],
      explain: '10.0.0.25 khớp cả 10.0.0.0/16 và 10.0.0.0/24; Azure chọn prefix dài nhất là /24 với next hop Virtual network. Route tới NVA có prefix ngắn hơn nên không được chọn; 0.0.0.0/0 là prefix ngắn nhất; không có route None nào khớp.'
    },
    {
      q: 'Bạn tạo route table RT1 ở region East US trong Subscription1. Bạn có thể gắn RT1 vào subnet nào? (Chọn 2)',
      options: ['Subnet của VNet1 ở East US, Subscription1', 'Subnet của VNet2 ở West US, Subscription1', 'Subnet của VNet3 ở East US, Subscription1', 'Subnet của VNet4 ở East US, Subscription2'],
      answer: [0, 2],
      explain: 'Route table chỉ gắn được vào subnet của VNet cùng region và cùng subscription, và có thể dùng cho nhiều VNet. VNet2 khác region, VNet4 khác subscription nên không gắn được.'
    },
    {
      q: 'Bạn cần ngăn mọi VM trong SubnetA gửi traffic tới dải 172.20.0.0/16 (một VNet peer), trong khi traffic khác không đổi. Giải pháp ít công sức nhất ở tầng định tuyến là gì?',
      options: ['Xóa VNet peering', 'Tạo UDR 172.20.0.0/16 với next hop Internet', 'Tạo UDR 0.0.0.0/0 với next hop None', 'Tạo UDR 172.20.0.0/16 với next hop None và gắn route table vào SubnetA'],
      answer: [3],
      explain: 'Next hop None hủy gói tin tới đúng prefix, và UDR cùng prefix thắng system route của peering. Xóa peering ảnh hưởng mọi subnet. Next hop Internet đẩy traffic private ra Internet, không chặn được một cách đúng nghĩa. UDR 0.0.0.0/0 → None chặn cả Internet, và không ảnh hưởng traffic peering vì route peering dài hơn.'
    },
    {
      q: 'Công ty muốn mọi traffic từ VNet1 đi ra Internet phải quay về datacenter on-premises qua kết nối ExpressRoute để kiểm tra. Bạn nên làm gì?',
      options: ['Để router on-premises quảng bá route 0.0.0.0/0 qua BGP', 'Tạo UDR 0.0.0.0/0 với next hop Virtual network gateway trỏ tới ExpressRoute gateway', 'Tạo UDR 0.0.0.0/0 với next hop Internet', 'Bật IP forwarding trên ExpressRoute gateway'],
      answer: [0],
      explain: 'Với ExpressRoute, forced tunneling được làm bằng cách quảng bá default route qua BGP. UDR next hop Virtual network gateway chỉ hỗ trợ VPN gateway. Next hop Internet làm ngược yêu cầu. Gateway không có thiết lập IP forwarding.'
    },
    {
      q: 'Bạn cần xác định một VM đang dùng route nào để tới IP 10.20.1.4, gồm next hop type và route table áp dụng. Bạn dùng công cụ nào?',
      options: ['Network Watcher IP flow verify', 'Network Watcher Next hop', 'NSG flow logs', 'Azure Monitor Metrics'],
      answer: [1],
      explain: 'Next hop trả về next hop type, next hop IP và route table ID cho một cặp nguồn/đích. IP flow verify chỉ kiểm tra NSG cho phép hay chặn. Flow logs ghi lại luồng đã qua NSG, không cho biết route. Metrics không phân tích định tuyến.'
    },
    {
      q: 'Bạn đã bật IP forwarding trên NIC của một VM Ubuntu làm router, UDR đã đúng, nhưng gói tin vẫn không được chuyển tiếp. Còn thiếu gì?',
      options: ['Gán public IP cho NVA', 'Đổi NVA sang VM Windows', 'Bật IP forwarding trong hệ điều hành (net.ipv4.ip_forward=1)', 'Tạo NSG cho phép mọi traffic'],
      answer: [2],
      explain: 'IP forwarding trên NIC chỉ cho phép Azure giao gói tin tới NIC; kernel Linux cũng phải bật forwarding mới chuyển tiếp. Public IP không cần cho định tuyến nội bộ. Hệ điều hành nào cũng làm router được. NSG mặc định đã cho phép traffic trong VNet.'
    },
    {
      q: 'Subnet1 có UDR 0.0.0.0/0 → VirtualAppliance (Azure Firewall). VNet1 được peering với VNet2 (10.2.0.0/16). Traffic từ Subnet1 tới một VM ở VNet2 đi thế nào?',
      options: ['Qua Azure Firewall', 'Bị hủy', 'Qua Internet', 'Đi thẳng qua peering'],
      answer: [3],
      explain: 'System route peering 10.2.0.0/16 có prefix dài hơn 0.0.0.0/0 nên được chọn. Muốn đi qua firewall phải thêm UDR 10.2.0.0/16 → VirtualAppliance. Không có route None hay Internet nào khớp với đích này trước route peering.'
    },
    {
      q: 'Bạn muốn traffic ra Internet từ SubnetApp đi qua hai NVA có tính sẵn sàng cao. Kiến trúc nào phù hợp?',
      options: ['Đặt hai NVA sau Standard internal load balancer với HA ports, UDR 0.0.0.0/0 trỏ tới frontend IP của load balancer', 'Tạo hai UDR 0.0.0.0/0 trỏ tới IP của từng NVA', 'Dùng Traffic Manager trước hai NVA', 'Gắn hai route table vào SubnetApp'],
      answer: [0],
      explain: 'Mô hình khuyến nghị là ILB Standard với HA ports cân bằng mọi cổng/giao thức, UDR trỏ tới frontend IP. Hai UDR cùng prefix trong một route table không tạo cân bằng tải. Traffic Manager dựa trên DNS, không định tuyến gói tin. Một subnet chỉ gắn được một route table.'
    },
    {
      q: 'Phát biểu nào về system route là ĐÚNG? (Chọn 2)',
      options: ['Bạn có thể xóa system route 0.0.0.0/0', 'Traffic giữa các subnet trong cùng VNet được định tuyến mặc định mà không cần route table', 'Có thể ghi đè system route bằng UDR cùng prefix', 'System route chỉ được tạo khi gắn route table vào subnet'],
      answer: [1, 2],
      explain: 'System route có sẵn cho mọi subnet và cho phép các subnet liên lạc với nhau. Không thể xóa system route, chỉ có thể ghi đè bằng UDR (UDR thắng khi cùng prefix). System route tồn tại kể cả khi không có route table nào.'
    },
    {
      q: 'Sau khi gắn route table có UDR 0.0.0.0/0 → VirtualNetworkGateway vào GatewaySubnet, kết nối site-to-site VPN bị gián đoạn. Nguyên nhân hợp lý nhất?',
      options: ['VPN gateway yêu cầu NSG trên GatewaySubnet', 'Không nên gắn route table chứa 0.0.0.0/0 vào GatewaySubnet vì gateway có thể ngừng hoạt động', 'Route table phải ở resource group khác', 'GatewaySubnet cần IP forwarding'],
      answer: [1],
      explain: 'Tài liệu Azure khuyến cáo không gắn route table có 0.0.0.0/0 vào GatewaySubnet của VPN gateway vì gateway có thể ngừng hoạt động. NSG trên GatewaySubnet không được khuyến nghị và không bắt buộc. Resource group không ảnh hưởng. IP forwarding là thiết lập của NIC, không phải subnet.'
    },
    {
      q: 'Bạn có UDR 0.0.0.0/0 → NVA trên Subnet1. Bạn muốn traffic từ Subnet1 tới Azure Storage đi thẳng, không qua NVA. Làm cách nào? (Chọn 2)',
      options: ['Bật service endpoint Microsoft.Storage trên Subnet1', 'Thêm UDR với address prefix là service tag Storage và next hop Internet', 'Xóa system route 0.0.0.0/0', 'Thêm UDR 0.0.0.0/0 với next hop None'],
      answer: [0, 1],
      explain: 'Service endpoint thêm route tới prefix của Storage dài hơn 0.0.0.0/0. UDR dùng service tag Storage với next hop Internet cũng có prefix cụ thể hơn và giữ traffic trên backbone. Không thể xóa system route. Next hop None sẽ chặn toàn bộ.'
    },
    {
      q: 'Hai route có cùng prefix 10.10.0.0/16: một route BGP học từ VPN gateway và một UDR next hop VirtualAppliance. Route nào được dùng?',
      options: ['Route BGP', 'Route có metric thấp hơn', 'Cả hai, cân bằng tải ECMP', 'UDR'],
      answer: [3],
      explain: 'Khi cùng prefix, thứ tự ưu tiên là UDR, rồi BGP, rồi system route. Azure không dùng metric để so sánh các nguồn route này, và UDR không cân bằng tải với BGP route.'
    },
    {
      q: 'Lệnh Azure CLI nào tạo route gửi traffic tới 10.0.1.0/24 qua NVA có IP 10.0.2.4?',
      options: ['<code>az network route-table route create -g rg1 --route-table-name rt1 -n r1 --address-prefix 10.0.1.0/24 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.2.4</code>', '<code>az network route-table create -g rg1 -n rt1 --next-hop 10.0.2.4</code>', '<code>az network vnet subnet update -g rg1 --vnet-name v1 -n s1 --next-hop-ip 10.0.2.4</code>', '<code>az network nic update -g rg1 -n nic1 --route 10.0.1.0/24</code>'],
      answer: [0],
      explain: 'Route được tạo bằng <code>az network route-table route create</code> với next hop type VirtualAppliance và IP. Lệnh tạo route table không nhận tham số next hop. <code>subnet update</code> dùng để gắn route table qua <code>--route-table</code>, không khai báo next hop. NIC không chứa route.'
    }
  ]
});

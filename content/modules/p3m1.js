AZ.addModule({
  id: 'p3m1',
  summary: 'Virtual network (VNet) là nền móng của mọi giải pháp mạng trên Azure: mọi VM, private endpoint, gateway đều nằm trong một subnet của một VNet. Module này đi từ quy hoạch address space, chia subnet bằng CIDR, đến public IP (SKU Standard vs Basic đã nghỉ hưu), public IP prefix và private IP tĩnh/động. Đề AZ-104 rất hay hỏi tính số IP dùng được, các subnet đặc biệt và hành vi của public IP.',
  objectives: [
    'Quy hoạch address space cho VNet không chồng lấn với on-premises và các VNet khác',
    'Tính toán CIDR: số địa chỉ, số IP dùng được (trừ 5 IP Azure giữ lại), chia subnet',
    'Tạo VNet và subnet bằng portal, Azure CLI và Azure PowerShell; biết các subnet có tên bắt buộc',
    'So sánh public IP SKU Standard và Basic, phân biệt static/dynamic, zone-redundant/zonal, public IP prefix',
    'Gán private IP tĩnh/động và liên kết public IP với NIC, load balancer, gateway',
    'Hiểu subnet delegation, private subnet và default outbound access'
  ],
  sections: [
    {
      id: 'plan-vnet',
      unit: 'Plan virtual networks',
      title: 'Quy hoạch virtual network',
      html: `
<p><strong>Azure Virtual Network (VNet)</strong> là mạng riêng, cô lập logic của bạn trên Azure. Một VNet thuộc <strong>một subscription và một region</strong> duy nhất, nhưng trải qua mọi availability zone của region đó. VNet là mạng Layer 3 (không hỗ trợ VLAN, broadcast hay multicast).</p>

<h4>VNet dùng để làm gì?</h4>
<ul>
  <li><strong>Giao tiếp giữa tài nguyên Azure</strong>: VM, VM Scale Set, AKS, App Service (VNet integration), private endpoint…</li>
  <li><strong>Giao tiếp với Internet</strong>: outbound qua NAT gateway, public IP, load balancer; inbound qua public IP.</li>
  <li><strong>Kết nối on-premises</strong>: Site-to-Site VPN, Point-to-Site VPN, ExpressRoute.</li>
  <li><strong>Kết nối VNet với VNet</strong>: VNet peering hoặc VPN VNet-to-VNet.</li>
  <li><strong>Lọc và định tuyến lưu lượng</strong>: NSG, Azure Firewall, NVA, route table (UDR).</li>
</ul>

<h4>Address space: chọn dải nào?</h4>
<p>Khi tạo VNet, bạn khai báo một hoặc nhiều <strong>address space</strong> dạng CIDR. Microsoft khuyến nghị dùng dải private theo RFC 1918:</p>
<table>
  <thead><tr><th>Dải</th><th>CIDR</th><th>Số địa chỉ</th></tr></thead>
  <tbody>
    <tr><td>10.0.0.0 – 10.255.255.255</td><td>10.0.0.0/8</td><td>16.777.216</td></tr>
    <tr><td>172.16.0.0 – 172.31.255.255</td><td>172.16.0.0/12</td><td>1.048.576</td></tr>
    <tr><td>192.168.0.0 – 192.168.255.255</td><td>192.168.0.0/16</td><td>65.536</td></tr>
    <tr><td>100.64.0.0 – 100.127.255.255 (RFC 6598, shared address space)</td><td>100.64.0.0/10</td><td>Azure coi như private</td></tr>
  </tbody>
</table>
<p>Các dải <strong>không thể</strong> thêm vào VNet: <code>224.0.0.0/4</code> (multicast), <code>255.255.255.255/32</code> (broadcast), <code>127.0.0.0/8</code> (loopback), <code>169.254.0.0/16</code> (link-local), <code>168.63.129.16/32</code> (IP nội bộ của nền tảng Azure, dùng cho DNS/DHCP/health probe).</p>

<h4>Nguyên tắc quy hoạch</h4>
<ul>
  <li><strong>Không chồng lấn (overlap)</strong> với mạng on-premises và các VNet khác mà bạn có thể kết nối (peering, VPN). Hai VNet có address space chồng nhau <strong>không thể peering</strong>.</li>
  <li><strong>Để dư chỗ</strong>: chọn address space lớn hơn nhu cầu hiện tại; có thể thêm address space hoặc mở rộng sau, nhưng thay đổi subnet đang có tài nguyên thì khó.</li>
  <li><strong>Chia theo vai trò/bảo mật</strong>: web, app, data, management… mỗi tầng một subnet để gắn NSG và route table riêng.</li>
  <li><strong>Dự trù subnet đặc biệt</strong>: GatewaySubnet, AzureFirewallSubnet, AzureBastionSubnet cần kích thước tối thiểu.</li>
  <li><strong>Nhiều VNet hay một VNet?</strong> Tách VNet khi cần cô lập theo môi trường (prod/dev), theo region, theo subscription/đơn vị kinh doanh; nối lại bằng peering (thường theo mô hình hub-spoke).</li>
</ul>

<h4>Giới hạn quan trọng (mặc định, theo trang Azure limits)</h4>
<table>
  <thead><tr><th>Tài nguyên</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>VNet mỗi subscription mỗi region</td><td>1.000</td></tr>
    <tr><td>Subnet mỗi VNet</td><td>3.000</td></tr>
    <tr><td>Private IP mỗi VNet</td><td>65.536</td></tr>
    <tr><td>Kích thước subnet IPv4</td><td>Nhỏ nhất /29, lớn nhất /2</td></tr>
    <tr><td>Subnet IPv6</td><td>Phải đúng /64</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>VNet <strong>không trải qua nhiều region</strong>. VM ở West Europe không thể đặt vào VNet ở East US. Muốn nối hai region thì dùng <strong>global VNet peering</strong> hoặc VPN gateway. Tương tự, NIC của VM phải nằm cùng region với VM, và mọi NIC của một VM phải thuộc <strong>cùng một VNet</strong>.</div>
`
    },
    {
      id: 'create-subnets',
      unit: 'Create subnets',
      title: 'Tạo subnet và các subnet đặc biệt',
      html: `
<p><strong>Subnet</strong> là một dải con trong address space của VNet. Mọi tài nguyên có NIC đều phải nằm trong một subnet. Các subnet trong cùng VNet <strong>không được chồng lấn</strong> và theo mặc định định tuyến được cho nhau (system route), không cần cấu hình gì thêm.</p>

<h4>Những gì cấu hình ở cấp subnet</h4>
<ul>
  <li><strong>Network security group (NSG)</strong>: tối đa một NSG cho mỗi subnet.</li>
  <li><strong>Route table</strong> (user-defined routes): tối đa một route table cho mỗi subnet.</li>
  <li><strong>NAT gateway</strong>: cung cấp outbound Internet với IP cố định.</li>
  <li><strong>Service endpoints</strong> và <strong>service endpoint policies</strong>.</li>
  <li><strong>Subnet delegation</strong>: giao subnet cho một dịch vụ PaaS.</li>
  <li><strong>Private endpoint network policies</strong>: bật/tắt áp dụng NSG/UDR cho private endpoint.</li>
  <li><strong>Private subnet</strong> (tắt <em>default outbound access</em>).</li>
</ul>

<h4>Subnet có tên bắt buộc</h4>
<table>
  <thead><tr><th>Dịch vụ</th><th>Tên subnet</th><th>Kích thước</th></tr></thead>
  <tbody>
    <tr><td>VPN Gateway / ExpressRoute gateway</td><td><code>GatewaySubnet</code></td><td>Khuyến nghị /27 hoặc lớn hơn</td></tr>
    <tr><td>Azure Firewall</td><td><code>AzureFirewallSubnet</code></td><td>/26</td></tr>
    <tr><td>Azure Bastion (Basic/Standard/Premium)</td><td><code>AzureBastionSubnet</code></td><td>/26 hoặc lớn hơn</td></tr>
    <tr><td>Azure Route Server</td><td><code>RouteServerSubnet</code></td><td>/26 hoặc lớn hơn</td></tr>
  </tbody>
</table>
<p>Tên phải đúng chính tả (phân biệt chữ hoa thường trong thực tế triển khai). Không đặt VM hay tài nguyên khác vào các subnet này. Không gắn NSG vào <code>GatewaySubnet</code> (có thể làm gateway ngừng hoạt động).</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="VNet 10.10.0.0/16 chia thành subnet workload và các subnet có tên bắt buộc">
  <rect class="zone" x="10" y="10" width="700" height="280" rx="12"/>
  <text x="30" y="34" class="t-b">vnet-prod · address space 10.10.0.0/16 · Southeast Asia</text>

  <rect class="box-a" x="30" y="50" width="200" height="90" rx="10"/>
  <text x="130" y="80" text-anchor="middle" class="t-b">snet-web</text>
  <text x="130" y="102" text-anchor="middle">10.10.1.0/24</text>
  <text x="130" y="124" text-anchor="middle" class="t-sm t-mute">NSG · 251 IP dùng được</text>
  <rect class="box-a" x="260" y="50" width="200" height="90" rx="10"/>
  <text x="360" y="80" text-anchor="middle" class="t-b">snet-app</text>
  <text x="360" y="102" text-anchor="middle">10.10.2.0/24</text>
  <text x="360" y="124" text-anchor="middle" class="t-sm t-mute">NSG + route table</text>
  <rect class="box-a" x="490" y="50" width="200" height="90" rx="10"/>
  <text x="590" y="80" text-anchor="middle" class="t-b">snet-data</text>
  <text x="590" y="102" text-anchor="middle">10.10.3.0/24</text>
  <text x="590" y="124" text-anchor="middle" class="t-sm t-mute">private endpoint, DB</text>

  <text x="30" y="166" class="t-sm t-w t-b">Subnet có tên bắt buộc (không đặt VM vào)</text>
  <rect class="box-w" x="30" y="175" width="200" height="90" rx="10"/>
  <text x="130" y="205" text-anchor="middle" class="t-b">GatewaySubnet</text>
  <text x="130" y="227" text-anchor="middle">10.10.0.0/27</text>
  <text x="130" y="249" text-anchor="middle" class="t-sm t-mute">VPN/ExpressRoute · ≥ /27</text>
  <rect class="box-w" x="260" y="175" width="200" height="90" rx="10"/>
  <text x="360" y="205" text-anchor="middle" class="t-b">AzureBastionSubnet</text>
  <text x="360" y="227" text-anchor="middle">10.10.0.64/26</text>
  <text x="360" y="249" text-anchor="middle" class="t-sm t-mute">Azure Bastion · ≥ /26</text>
  <rect class="box-w" x="490" y="175" width="200" height="90" rx="10"/>
  <text x="590" y="205" text-anchor="middle" class="t-b">AzureFirewallSubnet</text>
  <text x="590" y="227" text-anchor="middle">10.10.0.128/26</text>
  <text x="590" y="249" text-anchor="middle" class="t-sm t-mute">Azure Firewall · /26</text>
</svg>
<figcaption>Hình 1. Một cách quy hoạch VNet: các subnet workload /24 gắn NSG/route table riêng; các subnet dịch vụ đặc biệt được gom vào dải 10.10.0.0/24 với đúng tên và kích thước tối thiểu. Các dải không chồng lấn nhau và đều nằm trong address space.</figcaption>
</figure>

<h4>Subnet delegation</h4>
<p><strong>Delegation</strong> cho phép một dịch vụ PaaS tạo tài nguyên riêng của nó trong subnet của bạn và áp các chính sách mạng cần thiết. Ví dụ:</p>
<ul>
  <li><code>Microsoft.Web/serverFarms</code>: App Service VNet integration.</li>
  <li><code>Microsoft.Sql/managedInstances</code>: Azure SQL Managed Instance.</li>
  <li><code>Microsoft.ContainerInstance/containerGroups</code>: Azure Container Instances.</li>
  <li><code>Microsoft.DBforPostgreSQL/flexibleServers</code>, <code>Microsoft.DBforMySQL/flexibleServers</code>.</li>
</ul>
<p>Một subnet đã delegate thường chỉ dùng cho dịch vụ đó. Muốn bỏ delegation thì phải xóa hết tài nguyên của dịch vụ trong subnet trước.</p>

<h4>Tạo và sửa subnet bằng CLI</h4>
<pre><code>az network vnet subnet create -g rg-net --vnet-name vnet-prod \\
  -n snet-web --address-prefixes 10.10.1.0/24 \\
  --network-security-group nsg-web

# Delegation cho App Service VNet integration
az network vnet subnet update -g rg-net --vnet-name vnet-prod \\
  -n snet-app --delegations Microsoft.Web/serverFarms

# Biến subnet thành private subnet (tắt default outbound access)
az network vnet subnet update -g rg-net --vnet-name vnet-prod \\
  -n snet-web --default-outbound false</code></pre>

<h4>Thay đổi subnet đang dùng</h4>
<ul>
  <li>Có thể <strong>mở rộng/thu hẹp</strong> dải subnet nếu dải mới vẫn chứa mọi IP đang được cấp phát.</li>
  <li>Không xóa được subnet còn tài nguyên (NIC, private endpoint, gateway…).</li>
  <li>Có thể <strong>chuyển NIC sang subnet khác trong cùng VNet</strong>; không chuyển được NIC sang VNet khác.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi "triển khai Azure Bastion/Firewall nhưng thất bại" thường có đáp án là <strong>subnet sai tên hoặc quá nhỏ</strong>. Nhớ: Bastion cần <code>AzureBastionSubnet</code> tối thiểu <strong>/26</strong>; Firewall cần <code>AzureFirewallSubnet</code> <strong>/26</strong>.</div>
`
    },
    {
      id: 'create-vnet',
      unit: 'Create virtual networks',
      title: 'Tạo virtual network',
      html: `
<p>Bạn có thể tạo VNet bằng portal, Azure CLI, Azure PowerShell, ARM template/Bicep hoặc Terraform. Thông tin bắt buộc: <strong>subscription, resource group, tên, region, address space</strong> và ít nhất một subnet (portal tự gợi ý subnet <code>default</code>).</p>

<h4>Các tab khi tạo trên portal</h4>
<ul>
  <li><strong>Basics</strong>: subscription, resource group, tên, region.</li>
  <li><strong>Security</strong>: bật tùy chọn Azure Bastion, Azure Firewall, DDoS Network Protection ngay lúc tạo.</li>
  <li><strong>IP addresses</strong>: address space IPv4/IPv6, danh sách subnet. Portal mặc định tạo subnet là <strong>private subnet</strong>.</li>
  <li><strong>Tags</strong>, <strong>Review + create</strong>.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo VNet có hai subnet</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tìm <strong>Virtual networks</strong> trên ô tìm kiếm của portal rồi chọn <strong>+ Create</strong>:<br><span class="path">Azure portal › Virtual networks › + Create</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create virtual network</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Security</span><span>IP addresses</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-net</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">vnet-prod</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pbtns"><span class="pbtn">Previous</span><span class="pbtn primary">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Security</strong>: để mặc định (có thể bật Azure Bastion, Azure Firewall, DDoS Network Protection ngay tại đây). Chọn <strong>Next</strong>.</li>
    <li>Tab <strong>IP addresses</strong>: sửa address space thành <code>10.10.0.0/16</code>, bấm vào subnet <code>default</code> để mở pane <strong>Edit subnet</strong>:
      <div class="blade">
        <div class="blade-title">Edit subnet</div>
        <div class="blade-sec">Subnet details</div>
        <div class="pf"><label>Subnet template</label><span class="pv sel">Default</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">snet-web</span></div>
        <div class="pf"><label>Starting address</label><span class="pv">10.10.1.0</span></div>
        <div class="pf"><label>Subnet size</label><span class="pv sel">/24 (256 addresses)</span></div>
        <div class="pf"><label></label><span class="pv note">(Một số tài liệu Learn gọi trường này là Subnet purpose.) Subnet template đổi sang Azure Bastion, Azure Firewall, Virtual Network Gateway… để portal tự đặt tên bắt buộc và kích thước tối thiểu.</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Chọn <strong>+ Add a subnet</strong> để thêm <code>snet-app</code> (10.10.2.0/24) tương tự, rồi <strong>Review + create</strong> › <strong>Create</strong>.</li>
    <li>Kiểm tra: mở VNet › <strong>Settings</strong> › <strong>Subnets</strong> thấy hai subnet; mỗi subnet /24 còn trống có <strong>251</strong> IP dùng được (256 − 5 IP Azure giữ lại).</li>
  </ol>
  </div>
</div>

<h4>Azure CLI</h4>
<pre><code>az group create -n rg-net -l southeastasia

az network vnet create -g rg-net -n vnet-prod -l southeastasia \\
  --address-prefixes 10.10.0.0/16 \\
  --subnet-name snet-web --subnet-prefixes 10.10.1.0/24

# Thêm address space thứ hai
az network vnet update -g rg-net -n vnet-prod \\
  --address-prefixes 10.10.0.0/16 10.20.0.0/16</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>$web = New-AzVirtualNetworkSubnetConfig -Name snet-web -AddressPrefix 10.10.1.0/24
$app = New-AzVirtualNetworkSubnetConfig -Name snet-app -AddressPrefix 10.10.2.0/24
New-AzVirtualNetwork -Name vnet-prod -ResourceGroupName rg-net -Location southeastasia -AddressPrefix 10.10.0.0/16 -Subnet $web, $app

# Thêm subnet vào VNet có sẵn: sửa đối tượng rồi ghi lại
$vnet = Get-AzVirtualNetwork -Name vnet-prod -ResourceGroupName rg-net
Add-AzVirtualNetworkSubnetConfig -Name snet-data -AddressPrefix 10.10.3.0/24 -VirtualNetwork $vnet
$vnet | Set-AzVirtualNetwork</code></pre>
<div class="callout note"><strong>Lưu ý PowerShell</strong>Các cmdlet <code>Add-/Set-AzVirtualNetworkSubnetConfig</code> chỉ sửa đối tượng trong bộ nhớ. Phải chạy <code>Set-AzVirtualNetwork</code> thì thay đổi mới được ghi lên Azure. Đây là chỗ đề thi hay hỏi "bước còn thiếu".</div>

<h4>DNS của VNet</h4>
<p>Mặc định VNet dùng <strong>Azure-provided DNS</strong> (qua IP ảo <code>168.63.129.16</code>), phân giải được tên VM trong <em>cùng VNet</em>. Bạn có thể đặt <strong>custom DNS servers</strong> ở cấp VNet (hoặc ghi đè ở cấp NIC). Sau khi đổi DNS server, VM cần <strong>khởi động lại</strong> (hoặc renew DHCP) để nhận cấu hình mới.</p>

<h4>Default outbound access và private subnet</h4>
<p>Trước đây VM không có phương thức outbound rõ ràng vẫn ra Internet bằng một IP do Microsoft cấp ngầm (<em>default outbound access</em>). Microsoft đang loại bỏ hành vi này:</p>
<ul>
  <li>Với API phát hành sau <strong>31/03/2026</strong>, subnet trong <strong>VNet mới</strong> mặc định có <code>defaultOutboundAccess = false</code> (private subnet). Portal đã mặc định private từ trước.</li>
  <li>VNet có sẵn <strong>không bị thay đổi</strong>.</li>
  <li>VM trong private subnet cần phương thức outbound rõ ràng: <strong>NAT gateway</strong> (khuyến nghị), public IP trên NIC, outbound rules của Standard Load Balancer, hoặc UDR tới Azure Firewall/NVA.</li>
  <li>Đổi subnet giữa private và non-private chỉ có hiệu lực với VM sau khi <strong>stop (deallocate)</strong> rồi start lại.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"VM mới tạo trong subnet không ra được Internet để cài update, không có public IP" → kiểm tra subnet có phải <strong>private subnet</strong> không, và thêm <strong>NAT gateway</strong> cho subnet. Đây là cách ít công sức nhất và cho IP outbound cố định.</div>
`
    },
    {
      id: 'plan-ip',
      unit: 'Plan IP addressing',
      title: 'Quy hoạch địa chỉ IP: private và public',
      html: `
<p>Tài nguyên Azure dùng hai loại IP:</p>
<div class="compare">
  <div><strong>Private IP</strong>Cấp từ dải subnet, dùng để giao tiếp trong VNet, giữa các VNet peering và với on-premises qua VPN/ExpressRoute. Gán cho NIC của VM, frontend của internal load balancer, Application Gateway, private endpoint…</div>
  <div><strong>Public IP</strong>Là một <strong>resource riêng</strong> (Microsoft.Network/publicIPAddresses) có SKU, allocation, zone, DNS label. Dùng để nhận kết nối từ Internet và/hoặc làm IP nguồn khi ra Internet.</div>
</div>

<h4>Cách Azure cấp IP</h4>
<table>
  <thead><tr><th></th><th>Dynamic</th><th>Static</th></tr></thead>
  <tbody>
    <tr><td>Private IP</td><td>Azure chọn địa chỉ trống đầu tiên trong subnet. Địa chỉ gắn với NIC, chỉ thay đổi khi NIC bị xóa, chuyển subnet hoặc đổi allocation.</td><td>Bạn chỉ định một địa chỉ cụ thể còn trống trong subnet.</td></tr>
    <tr><td>Public IP</td><td>Chỉ có ở Basic SKU (đã retire). Cấp khi gắn vào resource, mất khi resource stop/deallocate hoặc xóa.</td><td>Standard SKU luôn là static. IP cố định từ lúc tạo cho tới khi xóa resource public IP.</td></tr>
  </tbody>
</table>

<h4>Khi nào cần IP tĩnh?</h4>
<ul>
  <li>Domain controller, DNS server nội bộ (VM khác trỏ DNS tới IP này).</li>
  <li>Đối tác/firewall bên ngoài cần whitelist IP của bạn.</li>
  <li>Bản ghi DNS A trỏ vào IP, chứng chỉ TLS gắn với IP.</li>
  <li>Ứng dụng có cơ chế bảo mật dựa trên IP.</li>
</ul>

<h4>Public IP: những resource nào dùng được?</h4>
<table>
  <thead><tr><th>Resource</th><th>Gắn ở đâu</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td>Virtual machine</td><td>IP configuration của NIC</td><td>Mỗi IP configuration gắn tối đa 1 public IP</td></tr>
    <tr><td>Public Load Balancer</td><td>Frontend IP configuration</td><td>SKU LB và public IP phải khớp</td></tr>
    <tr><td>VPN / ExpressRoute gateway</td><td>Gateway IP configuration</td><td></td></tr>
    <tr><td>NAT gateway</td><td>Outbound IP</td><td>Chỉ static; tối đa 16 IP</td></tr>
    <tr><td>Application Gateway v2</td><td>Frontend IP</td><td>Static, Standard</td></tr>
    <tr><td>Azure Firewall, Bastion, Route Server, API Management</td><td>Frontend / IP configuration</td><td>Static, Standard</td></tr>
  </tbody>
</table>

<h4>Chi phí</h4>
<p>Public IPv4 có phí theo giờ (kể cả khi chưa gắn vào resource nào đối với Standard); public IPv6 không tính phí. Private IP miễn phí.</p>

<div class="callout tip"><strong>Mẹo</strong>Không cấu hình IP tĩnh <em>bên trong hệ điều hành</em> của VM. Luôn đặt IP (static hay dynamic) ở <strong>NIC trên Azure</strong>; trong OS để DHCP. Nếu đặt tay trong OS mà sai, VM có thể mất kết nối hoàn toàn.</div>
`
    },
    {
      id: 'create-public-ip',
      unit: 'Create public IP addressing',
      title: 'Tạo public IP: SKU, zone, DNS label và prefix',
      html: `
<h4>SKU Standard và Basic</h4>
<p><strong>Basic SKU public IP đã nghỉ hưu ngày 30/09/2025.</strong> Mọi thiết kế mới dùng Standard. Tuy vậy đề thi vẫn có thể hỏi so sánh:</p>
<table>
  <thead><tr><th>Đặc điểm</th><th>Standard</th><th>Basic (retired)</th></tr></thead>
  <tbody>
    <tr><td>Allocation</td><td><strong>Chỉ Static</strong></td><td>IPv4: Static hoặc Dynamic; IPv6: Dynamic</td></tr>
    <tr><td>Bảo mật</td><td><strong>Secure by default</strong>: đóng với inbound, phải có NSG cho phép</td><td>Mở theo mặc định, NSG là tùy chọn</td></tr>
    <tr><td>Availability zones</td><td>Zone-redundant hoặc zonal</td><td>Không hỗ trợ</td></tr>
    <tr><td>Routing preference (Internet)</td><td>Có</td><td>Không</td></tr>
    <tr><td>Global tier (cross-region LB)</td><td>Có</td><td>Không</td></tr>
    <tr><td>Dùng với</td><td>Standard Load Balancer, mọi gateway hiện đại</td><td>Basic Load Balancer</td></tr>
  </tbody>
</table>
<p>Idle timeout cho luồng inbound điều chỉnh được <strong>4–30 phút</strong> (mặc định 4). Ngoài ra có <strong>Standard v2</strong>, hiện chỉ dùng với NAT Gateway v2 và luôn zone-redundant.</p>

<h4>Availability zone của public IP</h4>
<ul>
  <li><strong>Zone-redundant</strong>: tồn tại ở nhiều zone, chịu được sự cố một zone. Các Standard IP trước đây "no-zone" nay đều được coi là zone-redundant ở region có zone.</li>
  <li><strong>Zonal</strong>: gắn với một zone cụ thể, chết theo zone đó.</li>
  <li><strong>Không đổi được zone</strong> sau khi tạo; phải tạo IP mới.</li>
</ul>

<h4>DNS name label</h4>
<p>Gán <code>domainnamelabel</code> để có FQDN <code>&lt;label&gt;.&lt;region&gt;.cloudapp.azure.com</code>, ví dụ <code>contoso.westus.cloudapp.azure.com</code>. Label phải duy nhất trong region. Muốn tên miền riêng thì tạo bản ghi trong Azure DNS (tốt nhất là <strong>alias record</strong> trỏ tới public IP).</p>

<h4>Public IP prefix</h4>
<p><strong>Public IP prefix</strong> là một dải public IP <strong>liên tục</strong> được giữ riêng cho bạn trong một region. Từ prefix, bạn tạo các public IP Standard static.</p>
<ul>
  <li>Kích thước: <strong>/28</strong> (16 IP), /29 (8), /30 (4), /31 (2) cho IPv4; /124–/127 cho IPv6. Lớn hơn /28 phải yêu cầu tăng hạn mức.</li>
  <li>Lợi ích: đối tác chỉ cần <strong>whitelist một dải</strong>; xóa public IP thì địa chỉ trả về prefix để dùng lại.</li>
  <li>Không chọn được dải cụ thể (Azure cấp), không đổi được kích thước sau khi tạo; IP phải cùng region và subscription với prefix.</li>
  <li>Dùng cho VM, Standard LB (frontend hoặc outbound rules), NAT gateway (tối đa /28), VPN Gateway, Application Gateway v2, VM Scale Set (IP mỗi instance).</li>
  <li>Prefix tính vào hạn mức public IP ngay khi tạo (prefix /29 chiếm 8 IP hạn mức).</li>
</ul>
<p>Muốn dùng dải IP công ty sở hữu thì dùng <strong>Custom IP prefix (BYOIP)</strong>.</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo public IP Standard zone-redundant</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tìm <strong>Public IP addresses</strong> rồi chọn <strong>Create</strong>:<br><span class="path">Azure portal › Public IP addresses › + Create</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create public IP address</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>DDoS Protection</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-net</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="blade-sec">Configuration details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">pip-web</span></div>
        <div class="pf"><label class="req">IP Version</label><span class="pv radio">IPv4</span></div>
        <div class="pf"><label class="req">SKU</label><span class="pv radio">Standard</span></div>
        <div class="pf"><label class="req">Availability zone</label><span class="pv sel">Zone-redundant</span></div>
        <div class="pf"><label class="req">Tier</label><span class="pv radio">Regional</span></div>
        <div class="pf"><label class="req">IP address assignment</label><span class="pv radio">Static</span></div>
        <div class="pf"><label class="req">Routing preference</label><span class="pv radio">Microsoft network</span></div>
        <div class="pf"><label class="req">Idle timeout (minutes)</label><span class="pv">4</span></div>
        <div class="pf"><label>DNS name label</label><span class="pv">contoso-web</span></div>
        <div class="pf"><label></label><span class="pv note">FQDN: contoso-web.southeastasia.cloudapp.azure.com</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Quan sát: với SKU <strong>Standard</strong>, ô <em>IP address assignment</em> chỉ còn <strong>Static</strong>; ở region không có zone, trường <em>Availability zone</em> không xuất hiện.</li>
    <li><strong>Review + create</strong> › <strong>Create</strong>. Mở resource vừa tạo, trang <strong>Overview</strong> hiển thị IP đã cấp ngay (vì là static).</li>
  </ol>
  </div>
</div>

<h4>Lệnh tạo</h4>
<pre><code>az network public-ip create -g rg-net -n pip-web \\
  --sku Standard --allocation-method Static \\
  --zone 1 2 3 --dns-name contoso-web

az network public-ip prefix create -g rg-net -n pipp-egress --length 29

New-AzPublicIpAddress -Name pip-web -ResourceGroupName rg-net -Location southeastasia -Sku Standard -AllocationMethod Static -Zone 1,2,3</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>Gắn public IP <strong>Standard</strong> vào VM nhưng không truy cập RDP/SSH được dù VM chạy bình thường → vì Standard <strong>secure by default</strong>, cần NSG (trên NIC hoặc subnet) có rule <em>Allow</em> inbound cổng tương ứng.</div>
`
    },
    {
      id: 'associate-public-ip',
      unit: 'Associate public IP addresses',
      title: 'Liên kết public IP với tài nguyên',
      html: `
<p>Public IP là resource độc lập, vòng đời tách khỏi VM. Bạn có thể gỡ khỏi resource này và gắn sang resource khác (cùng region, cùng SKU phù hợp).</p>

<h4>Liên kết với VM qua NIC</h4>
<p>Public IP không gắn trực tiếp vào VM mà gắn vào <strong>IP configuration của NIC</strong>. Mô hình:</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="VM, NIC, IP configuration, private IP và public IP là resource riêng">
  <rect class="box" x="20" y="95" width="100" height="60" rx="10"/>
  <text x="70" y="130" text-anchor="middle" class="t-b">VM1</text>
  <text x="70" y="178" text-anchor="middle" class="t-sm t-mute">1..n NIC, cùng VNet</text>
  <line class="ln" x1="120" y1="125" x2="156" y2="125" marker-end="url(#arr)"/>

  <rect class="box-a" x="160" y="30" width="300" height="200" rx="12"/>
  <text x="310" y="54" text-anchor="middle" class="t-b t-a">NIC vm1-nic</text>
  <rect class="box" x="180" y="70" width="260" height="70" rx="8"/>
  <text x="310" y="92" text-anchor="middle" class="t-b">ipconfig1 (primary)</text>
  <text x="310" y="112" text-anchor="middle" class="t-sm">Private IP 10.10.1.4 · bắt buộc</text>
  <text x="310" y="129" text-anchor="middle" class="t-sm t-mute">+ public IP (tùy chọn, tối đa 1)</text>
  <rect class="box" x="180" y="150" width="260" height="60" rx="8"/>
  <text x="310" y="174" text-anchor="middle" class="t-b">ipconfig2 (secondary)</text>
  <text x="310" y="194" text-anchor="middle" class="t-sm">Private IP 10.10.1.5</text>

  <rect class="box-w" x="540" y="40" width="160" height="80" rx="10"/>
  <text x="620" y="68" text-anchor="middle" class="t-b">pip-web</text>
  <text x="620" y="88" text-anchor="middle" class="t-sm">resource riêng</text>
  <text x="620" y="106" text-anchor="middle" class="t-sm t-mute">Standard · Static</text>
  <line class="ln-a" x1="540" y1="95" x2="444" y2="95" marker-end="url(#arr-a)"/>
  <text x="491" y="86" text-anchor="middle" class="t-sm t-a">gắn vào</text>

  <line class="ln dash" x1="620" y1="120" x2="620" y2="171" marker-end="url(#arr)"/>
  <text x="628" y="150" class="t-sm t-mute">hoặc gắn vào</text>
  <rect class="box" x="540" y="175" width="160" height="60" rx="10"/>
  <text x="620" y="200" text-anchor="middle" class="t-b">Standard LB</text>
  <text x="620" y="220" text-anchor="middle" class="t-sm">frontend IP config</text>
</svg>
<figcaption>Hình 1. Public IP là resource độc lập, gắn vào một IP configuration của NIC (hoặc vào frontend của load balancer, gateway…). Gỡ ra rồi gắn sang chỗ khác mà IP static không đổi.</figcaption>
</figure>
<ul>
  <li>Mỗi NIC có ít nhất một IP configuration (primary). Một NIC có thể có tới <strong>256 private IP</strong>.</li>
  <li>Mỗi IP configuration chỉ gắn được <strong>một</strong> public IP.</li>
  <li>Public IP và NIC phải <strong>cùng region</strong>.</li>
</ul>
<pre><code># Gắn public IP vào ipconfig1 của NIC
az network nic ip-config update -g rg-net --nic-name vm1-nic \\
  -n ipconfig1 --public-ip-address pip-web

# Gỡ public IP
az network nic ip-config update -g rg-net --nic-name vm1-nic \\
  -n ipconfig1 --remove publicIpAddress</code></pre>
<pre><code># PowerShell
$nic = Get-AzNetworkInterface -Name vm1-nic -ResourceGroupName rg-net
$pip = Get-AzPublicIpAddress -Name pip-web -ResourceGroupName rg-net
$nic | Set-AzNetworkInterfaceIpConfig -Name ipconfig1 -PublicIpAddress $pip -Subnet $nic.IpConfigurations[0].Subnet
$nic | Set-AzNetworkInterface</code></pre>

<h4>Liên kết với dịch vụ khác</h4>
<table>
  <thead><tr><th>Resource</th><th>Yêu cầu public IP</th></tr></thead>
  <tbody>
    <tr><td>Standard Load Balancer</td><td>Standard SKU; không trộn Basic với Standard</td></tr>
    <tr><td>Azure Bastion</td><td>Standard, Static (trừ Developer và Premium private-only)</td></tr>
    <tr><td>NAT gateway</td><td>Standard Static, hoặc public IP prefix</td></tr>
    <tr><td>Azure Firewall</td><td>Standard Static (có thể nhiều IP)</td></tr>
    <tr><td>Application Gateway v2</td><td>Standard Static</td></tr>
  </tbody>
</table>

<h4>Inbound và outbound</h4>
<ul>
  <li><strong>Inbound</strong>: client Internet kết nối tới public IP; NSG xử lý gói tin <em>sau khi</em> Azure dịch public IP sang private IP, nên rule NSG viết theo <strong>private IP</strong> của VM.</li>
  <li><strong>Outbound</strong>: VM có public IP trên NIC sẽ dùng IP đó làm nguồn khi ra Internet. Nếu subnet có <strong>NAT gateway</strong>, NAT gateway được ưu tiên cho outbound.</li>
</ul>

<h4>Upgrade Basic lên Standard</h4>
<p>Public IP Basic phải ở dạng <strong>static</strong> và <strong>được gỡ khỏi resource</strong> trước khi upgrade lên Standard; không có chiều ngược lại. Nếu đang dùng Basic Load Balancer thì phải nâng cấp cả LB, vì SKU LB và public IP phải khớp nhau.</p>

<div class="callout exam"><strong>Góc thi</strong>"Cần giữ nguyên public IP khi xóa và tạo lại VM" → dùng public IP <strong>Static</strong> (resource riêng) rồi gắn lại vào NIC mới. "Cần nhiều VM ra Internet bằng cùng một dải IP cố định để đối tác whitelist" → <strong>NAT gateway</strong> + <strong>public IP prefix</strong>.</div>
`
    },
    {
      id: 'private-ip',
      unit: 'Allocate or assign private IP addresses',
      title: 'Cấp phát private IP',
      html: `
<p>Private IP được cấp cho: NIC của VM, frontend của <strong>internal load balancer</strong>, <strong>Application Gateway</strong> (frontend private), <strong>private endpoint</strong>, VPN/ExpressRoute gateway (phía trong VNet)…</p>

<h4>Dynamic và Static</h4>
<div class="compare">
  <div><strong>Dynamic (mặc định)</strong>Azure DHCP cấp địa chỉ <em>trống đầu tiên</em> trong subnet (sau 5 IP giữ lại). Địa chỉ ở lại với NIC qua các lần restart/deallocate; chỉ đổi khi NIC bị xóa, chuyển sang subnet khác hoặc đổi allocation.</div>
  <div><strong>Static</strong>Bạn chọn địa chỉ cụ thể, phải nằm trong dải subnet, không thuộc 5 IP giữ lại và chưa được dùng. Dùng cho DC, DNS, máy chủ mà ứng dụng khác trỏ cứng IP.</div>
</div>
<p>Không thể "đặt trước" một private IP cho VM sẽ tạo sau; bạn chỉ đặt static cho NIC đã tồn tại hoặc khi tạo NIC.</p>

<h4>Đổi sang static</h4>
<pre><code># Azure CLI: chỉ định IP → allocation tự chuyển sang Static
az network nic ip-config update -g rg-net --nic-name vm1-nic \\
  -n ipconfig1 --private-ip-address 10.10.1.10

# PowerShell
$nic = Get-AzNetworkInterface -Name vm1-nic -ResourceGroupName rg-net
$nic.IpConfigurations[0].PrivateIpAllocationMethod = 'Static'
$nic.IpConfigurations[0].PrivateIpAddress = '10.10.1.10'
Set-AzNetworkInterface -NetworkInterface $nic</code></pre>
<p>Đổi private IP của NIC có thể khiến VM khởi động lại kết nối mạng; nên làm trong cửa sổ bảo trì.</p>

<h4>Nhiều IP cho một VM</h4>
<ul>
  <li>Thêm <strong>IP configuration phụ</strong> (secondary) trên cùng NIC, ví dụ để host nhiều website SSL trên một VM.</li>
  <li>Hoặc thêm <strong>NIC thứ hai</strong> (VM size phải hỗ trợ số NIC đó; VM thường phải deallocate để thêm NIC).</li>
  <li>IP phụ cần được cấu hình thêm trong OS (với Windows/Linux) để dùng được.</li>
</ul>

<h4>Kiểm tra IP còn trống</h4>
<pre><code>az network vnet check-ip-address -g rg-net -n vnet-prod --ip-address 10.10.1.10
# Trả về available: true/false và gợi ý vài IP trống khác

Test-AzPrivateIPAddressAvailability -ResourceGroupName rg-net -VirtualNetworkName vnet-prod -IPAddress 10.10.1.10</code></pre>

<h4>Exercise: tạo và cấu hình VNet</h4>
<ol class="steps">
  <li>Tạo resource group và VNet <code>CoreServicesVnet</code> với address space <code>10.20.0.0/16</code>, các subnet <code>GatewaySubnet</code> (10.20.0.0/27), <code>SharedServicesSubnet</code> (10.20.10.0/24), <code>DatabaseSubnet</code> (10.20.20.0/24), <code>PublicWebServiceSubnet</code> (10.20.30.0/24).</li>
  <li>Tạo VNet thứ hai ở region khác (ví dụ <code>ManufacturingVnet</code> 10.30.0.0/16) với các subnet riêng, đảm bảo không trùng dải.</li>
  <li>Tạo VM trong mỗi VNet, đặt NIC với private IP static cho máy chủ dịch vụ dùng chung.</li>
  <li>Kiểm tra trong <em>Virtual network &gt; Connected devices</em> để xem NIC và IP đã cấp.</li>
</ol>

<div class="callout exam"><strong>Bẫy thi</strong>Chọn IP static <code>10.10.1.3</code> trong subnet <code>10.10.1.0/24</code> sẽ <strong>thất bại</strong> vì .0 đến .3 là địa chỉ Azure giữ lại. IP static đầu tiên hợp lệ là <code>10.10.1.4</code>.</div>
`
    },
    {
      id: 'cidr-reserved',
      extra: true,
      title: 'Tính toán CIDR & 5 địa chỉ IP Azure giữ lại',
      html: `
<h4>CIDR trong 30 giây</h4>
<p>Ký hiệu <code>a.b.c.d/n</code>: <code>n</code> bit đầu là phần mạng, <code>32 - n</code> bit còn lại là phần host. Số địa chỉ = <strong>2^(32 - n)</strong>.</p>
<table>
  <thead><tr><th>Prefix</th><th>Tổng địa chỉ</th><th>Dùng được trên Azure (trừ 5)</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td>/16</td><td>65.536</td><td>65.531</td><td>Address space VNet phổ biến</td></tr>
    <tr><td>/22</td><td>1.024</td><td>1.019</td><td></td></tr>
    <tr><td>/24</td><td>256</td><td><strong>251</strong></td><td>Subnet phổ biến</td></tr>
    <tr><td>/25</td><td>128</td><td>123</td><td></td></tr>
    <tr><td>/26</td><td>64</td><td><strong>59</strong></td><td>AzureBastionSubnet, AzureFirewallSubnet</td></tr>
    <tr><td>/27</td><td>32</td><td><strong>27</strong></td><td>GatewaySubnet khuyến nghị</td></tr>
    <tr><td>/28</td><td>16</td><td>11</td><td></td></tr>
    <tr><td>/29</td><td>8</td><td><strong>3</strong></td><td>Subnet IPv4 nhỏ nhất Azure cho phép</td></tr>
  </tbody>
</table>

<h4>5 địa chỉ Azure giữ lại trong MỖI subnet</h4>
<p>Ví dụ subnet <code>192.168.1.0/24</code>:</p>
<table>
  <thead><tr><th>Địa chỉ</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><code>192.168.1.0</code></td><td>Network address</td></tr>
    <tr><td><code>192.168.1.1</code></td><td>Default gateway của Azure</td></tr>
    <tr><td><code>192.168.1.2</code></td><td>Ánh xạ Azure DNS IP vào không gian VNet</td></tr>
    <tr><td><code>192.168.1.3</code></td><td>Ánh xạ Azure DNS IP vào không gian VNet</td></tr>
    <tr><td><code>192.168.1.255</code></td><td>Network broadcast address</td></tr>
  </tbody>
</table>
<p>Tức là <strong>4 địa chỉ đầu + 1 địa chỉ cuối</strong>. IP đầu tiên cấp được cho VM là <strong>x.x.x.4</strong>.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 120" role="img" aria-label="Subnet /24: 4 địa chỉ đầu và 1 địa chỉ cuối bị Azure giữ lại">
  <text x="360" y="22" text-anchor="middle" class="t-b">Subnet 192.168.1.0/24 · 256 địa chỉ − 5 giữ lại = 251 dùng được</text>
  <rect class="box-x" x="20" y="40" width="56" height="44" rx="4"/>
  <text x="48" y="67" text-anchor="middle" class="t-b">.0</text>
  <rect class="box-x" x="76" y="40" width="56" height="44" rx="4"/>
  <text x="104" y="67" text-anchor="middle" class="t-b">.1</text>
  <rect class="box-x" x="132" y="40" width="56" height="44" rx="4"/>
  <text x="160" y="67" text-anchor="middle" class="t-b">.2</text>
  <rect class="box-x" x="188" y="40" width="56" height="44" rx="4"/>
  <text x="216" y="67" text-anchor="middle" class="t-b">.3</text>
  <rect class="box-s" x="244" y="40" width="400" height="44" rx="4"/>
  <text x="444" y="67" text-anchor="middle" class="t-b">.4 → .254 · cấp được cho NIC/VM</text>
  <rect class="box-x" x="644" y="40" width="56" height="44" rx="4"/>
  <text x="672" y="67" text-anchor="middle" class="t-b">.255</text>
  <text x="48" y="104" text-anchor="middle" class="t-sm t-mute">Network</text>
  <text x="104" y="104" text-anchor="middle" class="t-sm t-mute">Gateway</text>
  <text x="160" y="104" text-anchor="middle" class="t-sm t-mute">DNS</text>
  <text x="216" y="104" text-anchor="middle" class="t-sm t-mute">DNS</text>
  <text x="444" y="104" text-anchor="middle" class="t-sm t-s">251 địa chỉ</text>
  <text x="672" y="104" text-anchor="middle" class="t-sm t-mute">Broadcast</text>
</svg>
<figcaption>Hình 1. Trong mọi subnet, Azure giữ lại địa chỉ network (.0), default gateway (.1), hai địa chỉ ánh xạ Azure DNS (.2, .3) và broadcast (địa chỉ cuối).</figcaption>
</figure>

<h4>Ví dụ 1: chia /24 thành 4 subnet</h4>
<p>VNet <code>10.1.0.0/24</code> cần 4 subnet bằng nhau → mượn 2 bit → <code>/26</code> (64 địa chỉ mỗi subnet):</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 150" role="img" aria-label="Chia 10.1.0.0/24 thành bốn subnet /26">
  <rect class="zone" x="20" y="10" width="680" height="30" rx="6"/>
  <text x="360" y="30" text-anchor="middle" class="t-b">10.1.0.0/24 · 256 địa chỉ · mượn 2 bit → 4 khối 64</text>
  <rect class="box-a" x="20" y="60" width="164" height="76" rx="8"/>
  <text x="102" y="84" text-anchor="middle" class="t-b">10.1.0.0/26</text>
  <text x="102" y="104" text-anchor="middle" class="t-sm">.0 – .63</text>
  <text x="102" y="122" text-anchor="middle" class="t-sm t-s">VM: .4 – .62</text>
  <rect class="box-a" x="192" y="60" width="164" height="76" rx="8"/>
  <text x="274" y="84" text-anchor="middle" class="t-b">10.1.0.64/26</text>
  <text x="274" y="104" text-anchor="middle" class="t-sm">.64 – .127</text>
  <text x="274" y="122" text-anchor="middle" class="t-sm t-s">VM: .68 – .126</text>
  <rect class="box-a" x="364" y="60" width="164" height="76" rx="8"/>
  <text x="446" y="84" text-anchor="middle" class="t-b">10.1.0.128/26</text>
  <text x="446" y="104" text-anchor="middle" class="t-sm">.128 – .191</text>
  <text x="446" y="122" text-anchor="middle" class="t-sm t-s">VM: .132 – .190</text>
  <rect class="box-a" x="536" y="60" width="164" height="76" rx="8"/>
  <text x="618" y="84" text-anchor="middle" class="t-b">10.1.0.192/26</text>
  <text x="618" y="104" text-anchor="middle" class="t-sm">.192 – .255</text>
  <text x="618" y="122" text-anchor="middle" class="t-sm t-s">VM: .196 – .254</text>
</svg>
<figcaption>Hình 2. Bốn subnet /26 nằm liền nhau trong /24; địa chỉ mạng của mỗi subnet là bội số của 64. Mỗi subnet có 59 IP gán được cho VM.</figcaption>
</figure>
<p>Với subnet <code>10.1.0.64/26</code>, 5 IP giữ lại là <code>.64, .65, .66, .67</code> và <code>.127</code>.</p>

<h4>Ví dụ 2: subnet cần bao nhiêu bit?</h4>
<p>Cần chứa <strong>50 VM</strong> và còn dư chỗ scale: 50 + 5 = 55 ≤ 64 → <strong>/26</strong> (59 IP dùng được). Nếu cần 60 VM: 60 + 5 = 65 &gt; 64 → phải dùng <strong>/25</strong> (123 IP).</p>
<p>Cần chứa <strong>27 VM</strong>: /27 có đúng 27 IP dùng được → vừa khít, nhưng không còn chỗ cho scale. Trong đề "đáp ứng yêu cầu, tiết kiệm địa chỉ nhất" thì /27 là đúng.</p>

<h4>Ví dụ 3: subnet có hợp lệ trong address space?</h4>
<p>VNet <code>172.16.0.0/20</code> (172.16.0.0 – 172.16.15.255). Subnet <code>172.16.16.0/24</code> <strong>không hợp lệ</strong> vì nằm ngoài dải. Subnet <code>172.16.8.0/21</code> hợp lệ (172.16.8.0 – 172.16.15.255). Subnet <code>172.16.4.0/22</code> sẽ chồng lấn nếu đã có <code>172.16.4.0/24</code>.</p>

<h4>Ví dụ 4: kiểm tra chồng lấn khi peering</h4>
<p>VNet A <code>10.0.0.0/16</code>, VNet B <code>10.0.128.0/17</code>: B nằm trọn trong A → <strong>chồng lấn</strong>, không peering được. VNet C <code>10.1.0.0/16</code> thì không chồng với A.</p>

<div class="callout tip"><strong>Mẹo tính nhanh</strong>Kích thước khối = 256 chia cho 2^(số bit mượn trong octet). /25 → khối 128; /26 → 64; /27 → 32; /28 → 16; /29 → 8. Địa chỉ mạng của subnet luôn là bội số của kích thước khối.</div>
<div class="callout exam"><strong>Góc thi</strong>Câu "subnet /29 có bao nhiêu IP gán được cho VM?" → <strong>3</strong>. "Subnet /24 có thể chứa tối đa bao nhiêu VM (mỗi VM 1 NIC)?" → <strong>251</strong>.</div>
`
    }
  ],
  keyFacts: [
    'VNet thuộc <strong>một region và một subscription</strong>, trải qua mọi availability zone trong region.',
    'Azure giữ lại <strong>5 IP mỗi subnet</strong>: x.0 (network), x.1 (default gateway), x.2 và x.3 (Azure DNS), và địa chỉ cuối (broadcast).',
    'Subnet IPv4 nhỏ nhất <strong>/29</strong> (3 IP dùng được), lớn nhất /2; subnet IPv6 phải đúng <strong>/64</strong>.',
    'Dải khuyến nghị: RFC 1918 (10/8, 172.16/12, 192.168/16) và 100.64.0.0/10. Không dùng được 224.0.0.0/4, 127.0.0.0/8, 169.254.0.0/16, 168.63.129.16/32, 255.255.255.255/32.',
    '<strong>Basic public IP đã retire ngày 30/09/2025</strong>. Standard public IP luôn <strong>Static</strong>, <strong>secure by default</strong> (cần NSG cho phép inbound), hỗ trợ zone-redundant/zonal.',
    'Public IP không đổi được availability zone sau khi tạo.',
    'Public IP prefix: dải liên tục <strong>/28 đến /31</strong> (16 đến 2 IP IPv4), chỉ cấp public IP <strong>Standard static</strong>, cùng region và subscription.',
    'Subnet bắt buộc: <code>GatewaySubnet</code> (khuyến nghị /27), <code>AzureFirewallSubnet</code> (/26), <code>AzureBastionSubnet</code> (/26 trở lên).',
    'Private IP mặc định <strong>Dynamic</strong> (IP trống đầu tiên, bắt đầu từ x.4); đặt <strong>Static</strong> ở NIC trên Azure, không đặt tay trong OS.',
    'Mỗi IP configuration của NIC gắn tối đa <strong>1 public IP</strong>; public IP gắn vào NIC, không gắn trực tiếp vào VM.',
    'Với API sau 31/03/2026, subnet trong VNet mới mặc định là <strong>private subnet</strong> (không có default outbound access); cần NAT gateway hoặc phương thức outbound rõ ràng.',
    'Giới hạn mặc định: 1.000 VNet mỗi subscription mỗi region, 3.000 subnet mỗi VNet, 65.536 private IP mỗi VNet.'
  ],
  traps: [
    'Quên trừ <strong>5 IP</strong> khi tính số VM: /24 chứa 251 VM chứ không phải 254 hay 256.',
    'Đặt IP static là x.1, x.2 hoặc x.3: các địa chỉ này Azure giữ lại, IP đầu tiên hợp lệ là <strong>x.4</strong>.',
    'Nghĩ rằng gắn public IP Standard là truy cập được ngay. Sai: Standard <strong>đóng inbound mặc định</strong>, phải có NSG Allow.',
    'Chọn Dynamic cho public IP Standard: Standard <strong>chỉ có Static</strong>. Dynamic chỉ tồn tại ở Basic (đã retire).',
    'Đặt tên subnet tùy ý cho Bastion/Firewall/Gateway: phải đúng <code>AzureBastionSubnet</code>, <code>AzureFirewallSubnet</code>, <code>GatewaySubnet</code>.',
    'Cho rằng VNet có thể trải nhiều region, hoặc VM có thể gắn NIC thuộc VNet khác nhau. Sai cả hai.',
    'Trong PowerShell, chạy <code>Add-AzVirtualNetworkSubnetConfig</code> mà quên <code>Set-AzVirtualNetwork</code> nên subnet không được tạo.',
    'Hai VNet có address space chồng lấn vẫn peering được. Sai: overlap thì <strong>không peering được</strong>, phải quy hoạch lại.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>IP giữ lại mỗi subnet</td><td>5: .0, .1, .2, .3 và địa chỉ cuối</td></tr>
    <tr><td>/24 · /26 · /27 · /29</td><td>251 · 59 · 27 · 3 IP dùng được</td></tr>
    <tr><td>Subnet nhỏ nhất / IPv6</td><td>/29 / đúng /64</td></tr>
    <tr><td>Phạm vi VNet</td><td>1 region, 1 subscription, mọi AZ</td></tr>
    <tr><td>Public IP Standard</td><td>Static, secure by default, zone-redundant/zonal</td></tr>
    <tr><td>Basic public IP</td><td>Retired 30/09/2025</td></tr>
    <tr><td>Public IP prefix</td><td>/28–/31, Standard static, cùng region</td></tr>
    <tr><td>Subnet đặc biệt</td><td>GatewaySubnet /27+, AzureFirewallSubnet /26, AzureBastionSubnet /26+</td></tr>
    <tr><td>Private IP</td><td>Dynamic (mặc định) / Static, đặt ở NIC</td></tr>
    <tr><td>Outbound cho private subnet</td><td>NAT gateway (khuyến nghị), public IP, LB outbound rule, UDR → firewall</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: '5 địa chỉ Azure giữ lại trong subnet 10.0.1.0/24?', back: '<code>10.0.1.0</code> (network), <code>.1</code> (default gateway), <code>.2</code> và <code>.3</code> (Azure DNS), <code>.255</code> (broadcast).' },
    { front: 'Subnet /26 có bao nhiêu IP dùng được trên Azure?', back: '64 - 5 = <strong>59</strong>.' },
    { front: 'Subnet IPv4 nhỏ nhất Azure cho phép?', back: '<strong>/29</strong>: 8 địa chỉ, 3 dùng được.' },
    { front: 'Kích thước bắt buộc của subnet IPv6?', back: 'Đúng <strong>/64</strong>.' },
    { front: 'VNet có trải nhiều region không?', back: '<strong>Không</strong>. Một VNet thuộc một region (nhưng trải mọi availability zone). Nối region bằng global peering hoặc VPN.' },
    { front: 'Basic public IP retire khi nào?', back: '<strong>30/09/2025</strong>. Dùng Standard SKU cho mọi triển khai.' },
    { front: 'Allocation method của public IP Standard?', back: '<strong>Chỉ Static</strong>.' },
    { front: '"Secure by default" của Standard public IP nghĩa là gì?', back: 'Inbound bị chặn cho tới khi có <strong>NSG</strong> cho phép lưu lượng.' },
    { front: 'Kích thước public IP prefix IPv4 có sẵn?', back: '/28 (16), /29 (8), /30 (4), /31 (2). Lớn hơn cần yêu cầu tăng hạn mức hoặc dùng BYOIP.' },
    { front: 'Tên và kích thước subnet cho Azure Bastion?', back: '<code>AzureBastionSubnet</code>, tối thiểu <strong>/26</strong>.' },
    { front: 'Tên subnet cho VPN/ExpressRoute gateway?', back: '<code>GatewaySubnet</code>, khuyến nghị /27 hoặc lớn hơn.' },
    { front: 'Subnet delegation dùng để làm gì?', back: 'Giao subnet cho một dịch vụ PaaS (ví dụ <code>Microsoft.Web/serverFarms</code>, SQL Managed Instance) để dịch vụ đó tạo tài nguyên trong subnet.' },
    { front: 'Một IP configuration của NIC gắn tối đa bao nhiêu public IP?', back: '<strong>Một</strong>. Cần nhiều public IP thì thêm IP configuration hoặc NIC.' },
    { front: 'Lệnh CLI kiểm tra private IP còn trống?', back: '<code>az network vnet check-ip-address -g RG -n VNET --ip-address 10.0.1.10</code>' },
    { front: 'Private subnet là gì?', back: 'Subnet có <code>defaultOutboundAccess = false</code>: VM không có default outbound access, cần NAT gateway/public IP/LB outbound rule/firewall để ra Internet.' },
    { front: 'Có đổi được availability zone của public IP sau khi tạo?', back: '<strong>Không</strong>. Phải tạo public IP mới.' }
  ],
  quiz: [
    {
      q: 'Bạn tạo subnet <code>10.5.2.0/27</code> cho một nhóm VM. Mỗi VM có một NIC. Tối đa bao nhiêu VM có thể triển khai vào subnet này?',
      options: ['32', '30', '27', '29'],
      answer: [2],
      explain: '/27 có 32 địa chỉ, Azure giữ lại 5 (4 đầu, 1 cuối), còn 27. Con số 30 là cách tính truyền thống chỉ trừ network và broadcast; 32 là tổng địa chỉ; 29 không ứng với cách tính nào trên Azure.'
    },
    {
      q: 'Bạn cần gán private IP static cho VM DNS1 trong subnet <code>192.168.10.0/24</code>. Địa chỉ nào hợp lệ? (Chọn 2)',
      options: ['<code>192.168.10.4</code>', '<code>192.168.10.3</code>', '<code>192.168.10.200</code>', '<code>192.168.10.255</code>'],
      answer: [0, 2],
      explain: '.4 là IP đầu tiên Azure cho phép cấp và .200 nằm giữa dải. .3 là một trong hai địa chỉ Azure dùng cho DNS, còn .255 là broadcast; cả hai đều thuộc 5 IP giữ lại.'
    },
    {
      q: 'Bạn gắn một public IP Standard vào NIC của VM1. VM1 không có NSG trên NIC lẫn subnet. Người dùng không thể RDP vào VM1 qua Internet. Nguyên nhân là gì?',
      options: ['Public IP Standard phải là Dynamic để nhận RDP', 'Public IP Standard đóng inbound theo mặc định, cần NSG cho phép cổng 3389', 'Cần gắn public IP vào subnet thay vì NIC', 'Phải bật DNS name label trên public IP'],
      answer: [1],
      explain: 'Standard public IP theo mô hình secure by default: inbound bị chặn nếu không có NSG cho phép. Standard không có allocation Dynamic, public IP không gắn vào subnet, và DNS label chỉ tạo FQDN chứ không mở cổng.'
    },
    {
      q: 'Công ty có mạng on-premises <code>10.0.0.0/16</code> và sẽ kết nối qua VPN. Bạn cần tạo VNet mới chứa khoảng 500 VM. Address space nào phù hợp nhất?',
      options: ['<code>10.0.0.0/16</code>', '<code>10.0.128.0/22</code>', '<code>169.254.0.0/16</code>', '<code>10.1.0.0/22</code>'],
      answer: [3],
      explain: '<code>10.1.0.0/22</code> có 1.024 địa chỉ, đủ cho 500 VM, và không chồng lấn với on-premises. <code>10.0.0.0/16</code> và <code>10.0.128.0/22</code> đều nằm trong dải on-premises nên định tuyến VPN sẽ xung đột. <code>169.254.0.0/16</code> là link-local, Azure không cho phép thêm vào VNet.'
    },
    {
      q: 'Bạn triển khai Azure Bastion (SKU Standard) vào VNet1 nhưng triển khai thất bại. VNet1 có subnet <code>BastionSubnet</code> với dải <code>10.1.250.0/27</code>. Bạn cần làm gì? (Chọn 2)',
      options: ['Đổi tên subnet thành <code>AzureBastionSubnet</code>', 'Gắn NSG mặc định vào subnet', 'Đổi kích thước subnet thành /26 hoặc lớn hơn', 'Thêm service endpoint Microsoft.Network'],
      answer: [0, 2],
      explain: 'Bastion (trừ Developer SKU) yêu cầu subnet tên đúng là <code>AzureBastionSubnet</code> và kích thước tối thiểu /26 với các triển khai từ 11/2021. NSG không bắt buộc và không phải nguyên nhân thất bại; không có service endpoint nào cần cho Bastion.'
    },
    {
      q: 'Bạn muốn 10 VM ra Internet bằng một dải IP công khai liên tục, cố định để đối tác chỉ cần whitelist một dải. Giải pháp nào phù hợp nhất?',
      options: ['Gắn public IP Basic dynamic cho từng VM', 'Dùng default outbound access của Azure', 'NAT gateway dùng một public IP prefix', 'Đặt DNS name label giống nhau cho các VM'],
      answer: [2],
      explain: 'NAT gateway gắn với public IP prefix cho outbound từ một dải liên tục và cố định. Basic dynamic đã retire và IP có thể đổi; default outbound access dùng IP do Microsoft sở hữu, có thể đổi bất kỳ lúc nào; DNS label chỉ là tên, không ảnh hưởng IP nguồn.'
    },
    {
      q: 'Bạn chạy PowerShell: <code>$vnet = Get-AzVirtualNetwork -Name VNet1 -ResourceGroupName RG1</code> rồi <code>Add-AzVirtualNetworkSubnetConfig -Name Sub3 -AddressPrefix 10.0.3.0/24 -VirtualNetwork $vnet</code>. Subnet Sub3 không xuất hiện trên portal. Bạn cần chạy thêm lệnh nào?',
      options: ['<code>New-AzVirtualNetwork</code>', '<code>Set-AzVirtualNetwork -VirtualNetwork $vnet</code>', '<code>Update-AzVirtualNetworkSubnetConfig</code>', '<code>Set-AzVirtualNetworkSubnetConfig</code>'],
      answer: [1],
      explain: '<code>Add-AzVirtualNetworkSubnetConfig</code> chỉ sửa đối tượng trong bộ nhớ; <code>Set-AzVirtualNetwork</code> mới ghi thay đổi lên Azure. <code>New-AzVirtualNetwork</code> tạo VNet mới; <code>Set-AzVirtualNetworkSubnetConfig</code> cũng chỉ sửa trong bộ nhớ; cmdlet Update… trong lựa chọn không tồn tại.'
    },
    {
      q: 'VNet1 có address space <code>172.16.0.0/20</code>. Subnet nào có thể thêm vào VNet1?',
      options: ['<code>172.16.16.0/24</code>', '<code>172.16.0.0/30</code>', '<code>172.17.0.0/24</code>', '<code>172.16.8.0/22</code>'],
      answer: [3],
      explain: '/20 bao phủ 172.16.0.0–172.16.15.255; <code>172.16.8.0/22</code> (172.16.8.0–172.16.11.255) nằm trong dải. <code>172.16.16.0/24</code> và <code>172.17.0.0/24</code> nằm ngoài address space; <code>/30</code> nhỏ hơn mức tối thiểu /29 của Azure.'
    },
    {
      q: 'Bạn cần tạo public IP cho Standard Load Balancer zone-redundant ở region có 3 availability zone. Cấu hình nào đúng?',
      options: ['SKU Standard, Static, zone 1, 2, 3', 'SKU Basic, Static, zone-redundant', 'SKU Standard, Dynamic, zone 1', 'SKU Basic, Dynamic, không zone'],
      answer: [0],
      explain: 'Standard LB cần public IP Standard; Standard luôn Static và hỗ trợ zone-redundant (zone 1, 2, 3). Basic không hỗ trợ zone, đã retire và không dùng chung được với Standard LB; Standard không có Dynamic.'
    },
    {
      q: 'Trong một VNet mới tạo bằng API mới nhất, VM1 không có public IP và không ra được Internet để tải update. Subnet không có NAT gateway hay route table. Giải pháp ít công sức nhất cho toàn subnet là gì?',
      options: ['Gắn NSG cho phép outbound Internet', 'Thêm NAT gateway vào subnet', 'Tạo service endpoint Microsoft.Storage', 'Đổi DNS server của VNet sang 8.8.8.8'],
      answer: [1],
      explain: 'Subnet trong VNet mới là private subnet (không có default outbound access), nên cần phương thức outbound rõ ràng; NAT gateway là cách khuyến nghị cho cả subnet. NSG mặc định đã cho phép outbound Internet nhưng không tạo đường ra; service endpoint chỉ cho dịch vụ Azure cụ thể; đổi DNS không giải quyết việc thiếu đường ra.'
    },
    {
      q: 'Bạn cần chia VNet <code>10.8.0.0/24</code> thành đúng 4 subnet bằng nhau. Phát biểu nào đúng? (Chọn 2)',
      options: ['Mỗi subnet là /26', 'Mỗi subnet có 62 IP gán được cho VM', 'Subnet thứ hai bắt đầu tại <code>10.8.0.64</code>', 'Mỗi subnet là /28'],
      answer: [0, 2],
      explain: 'Chia /24 thành 4 phần thì mượn 2 bit, được /26 gồm 64 địa chỉ; các subnet bắt đầu ở .0, .64, .128, .192. Số IP gán được là 64 - 5 = 59 chứ không phải 62 (62 là cách tính ngoài Azure). /28 sẽ cho 16 subnet.'
    },
    {
      q: 'Bạn cần cho App Service dùng VNet integration vào subnet SnetApp. Bạn cần cấu hình gì trên subnet?',
      options: ['Service endpoint Microsoft.Web', 'Private endpoint cho App Service', 'NAT gateway', 'Delegation cho <code>Microsoft.Web/serverFarms</code>'],
      answer: [3],
      explain: 'VNet integration của App Service yêu cầu subnet được delegate cho <code>Microsoft.Web/serverFarms</code>. Service endpoint và private endpoint là cơ chế khác (private endpoint dùng cho inbound tới app); NAT gateway chỉ lo outbound Internet và không thay cho delegation.'
    },
    {
      q: 'Bạn xóa VM1 nhưng muốn VM mới (tạo lại từ disk) giữ nguyên public IP mà khách hàng đã whitelist. Bạn cần làm gì?',
      options: ['Đảm bảo public IP là Static và gắn lại resource public IP đó vào NIC của VM mới', 'Tạo DNS name label trùng tên cũ', 'Yêu cầu Microsoft Support cấp lại IP cũ', 'Không thể giữ IP khi xóa VM'],
      answer: [0],
      explain: 'Public IP là resource độc lập; nếu là Static và không bị xóa cùng VM, có thể gắn lại vào NIC mới với cùng địa chỉ. DNS label chỉ là tên; Support không cấp lại IP đã nhả; phát biểu "không thể giữ IP" là sai.'
    },
    {
      q: 'Phát biểu nào về public IP prefix là ĐÚNG?',
      options: ['Bạn có thể chọn dải IP cụ thể khi tạo prefix', 'Có thể tạo public IP Basic dynamic từ prefix', 'Prefix /29 cung cấp 8 public IP liên tục', 'Có thể mở rộng prefix từ /30 lên /28 sau khi tạo'],
      answer: [2],
      explain: 'Prefix /29 gồm 8 địa chỉ liên tục. Azure tự cấp dải (bạn không chọn dải); chỉ public IP Standard static được tạo từ prefix; kích thước prefix không thay đổi được sau khi tạo.'
    }
  ]
});

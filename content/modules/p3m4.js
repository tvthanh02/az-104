AZ.addModule({
  id: 'p3m4',
  summary: 'VNet peering nối hai virtual network qua backbone Microsoft với độ trễ thấp, không cần gateway hay Internet. Module này đi sâu vào peering cùng region và global, tính không bắc cầu (non-transitive), gateway transit, allow forwarded traffic, service chaining bằng UDR qua NVA, và mô hình hub-spoke. Đây là chủ đề xuất hiện rất thường xuyên trong đề AZ-104 dưới dạng "VM A có kết nối được VM B không?".',
  objectives: [
    'Phân biệt regional peering và global peering, các yêu cầu và ràng buộc (không overlap, không transitive)',
    'Cấu hình peering bằng portal, Azure CLI, PowerShell, kể cả khác subscription/tenant',
    'Giải thích gateway transit và use remote gateways để spoke dùng VPN/ExpressRoute gateway của hub',
    'Thiết kế service chaining với UDR, NVA và tùy chọn allow forwarded traffic',
    'Xây dựng topology hub-spoke và xử lý sự cố peering (trạng thái Initiated/Connected/Disconnected, effective routes)'
  ],
  sections: [
    {
      id: 'peering-uses',
      unit: 'Determine Azure Virtual Network peering uses',
      title: 'VNet peering dùng để làm gì?',
      html: `
<p><strong>Virtual network peering</strong> kết nối hai VNet để tài nguyên ở hai bên giao tiếp bằng <strong>private IP</strong> như thể cùng một mạng. Lưu lượng đi hoàn toàn trên <strong>backbone Microsoft</strong>, không qua Internet, không cần gateway, không mã hóa thêm.</p>

<h4>Hai loại peering</h4>
<div class="compare">
  <div><strong>Regional (virtual network peering)</strong>Hai VNet cùng region. Độ trễ như trong một VNet.</div>
  <div><strong>Global VNet peering</strong>Hai VNet ở region khác nhau (trong cùng một cloud: Azure public, Government hoặc 21Vianet; không peering chéo cloud).</div>
</div>

<h4>Lợi ích</h4>
<ul>
  <li>Độ trễ thấp, băng thông cao; băng thông chỉ bị giới hạn bởi VM size, peering không thêm giới hạn.</li>
  <li>Peering được giữa VNet ở <strong>subscription khác</strong>, thậm chí <strong>Microsoft Entra tenant khác</strong>.</li>
  <li>Tạo peering <strong>không gây downtime</strong> cho tài nguyên.</li>
  <li>Có thể peering VNet Resource Manager với VNet classic.</li>
</ul>

<h4>Yêu cầu và ràng buộc</h4>
<ul>
  <li>Address space hai VNet <strong>không được chồng lấn</strong>.</li>
  <li>Peering <strong>không bắc cầu (non-transitive)</strong>: A–B và B–C không có nghĩa là A nói chuyện được với C (xem Hình 1).</li>
  <li>Peering phải tạo ở <strong>cả hai phía</strong> (portal tạo cả hai link trong một lần).</li>
  <li>Không di chuyển được VNet (sang RG/subscription khác) khi đang có peering: xóa peering, move, rồi tạo lại.</li>
  <li><strong>Azure-provided DNS không phân giải tên</strong> qua peering; dùng private DNS zone hoặc DNS tùy chỉnh.</li>
  <li>Global peering: không truy cập được frontend IP của <strong>Basic Load Balancer</strong> ở VNet bên kia (Standard LB thì được).</li>
  <li>Mỗi VNet tối đa <strong>650 peering</strong> (trang Azure limits hiện hành; tài liệu cũ ghi 500). Muốn lớn hơn dùng <strong>Azure Virtual Network Manager</strong>.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 195" role="img" aria-label="Peering không bắc cầu: A–B và B–C peering nhưng A không tới được C">
  <rect class="box-a" x="20" y="60" width="160" height="80" rx="10"/>
  <text x="100" y="94" text-anchor="middle" class="t-b">VNet A</text>
  <text x="100" y="114" text-anchor="middle" class="t-sm">10.1.0.0/16</text>
  <rect class="box-a" x="280" y="60" width="160" height="80" rx="10"/>
  <text x="360" y="94" text-anchor="middle" class="t-b">VNet B</text>
  <text x="360" y="114" text-anchor="middle" class="t-sm">10.2.0.0/16</text>
  <rect class="box-a" x="540" y="60" width="160" height="80" rx="10"/>
  <text x="620" y="94" text-anchor="middle" class="t-b">VNet C</text>
  <text x="620" y="114" text-anchor="middle" class="t-sm">10.3.0.0/16</text>

  <line class="ln-s" x1="184" y1="100" x2="276" y2="100" marker-start="url(#arr-s)" marker-end="url(#arr-s)"/>
  <text x="230" y="90" text-anchor="middle" class="t-sm t-s">peering ✓</text>
  <line class="ln-s" x1="444" y1="100" x2="536" y2="100" marker-start="url(#arr-s)" marker-end="url(#arr-s)"/>
  <text x="490" y="90" text-anchor="middle" class="t-sm t-s">peering ✓</text>

  <path class="ln-x dash" d="M100 144 V178 H620 V144"/>
  <text x="360" y="168" text-anchor="middle" class="t-sm t-x t-b">A ↔ C: KHÔNG thông qua B (non-transitive)</text>
  <text x="360" y="40" text-anchor="middle" class="t-sm t-mute">Muốn A tới C: peering trực tiếp A–C, hoặc NVA/Azure Firewall ở B + UDR</text>
</svg>
<figcaption>Hình 1. Mỗi peering chỉ nối đúng hai VNet. Route học qua peering B–C không được "chuyển tiếp" sang A.</figcaption>
</figure>

<h4>Chi phí</h4>
<p>Peering tính phí <strong>dữ liệu vào và ra</strong> ở cả hai phía; global peering đắt hơn regional. Lưu lượng trong cùng một VNet không tính phí này.</p>

<h4>Peering hay VPN VNet-to-VNet?</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>VNet peering</th><th>VPN gateway VNet-to-VNet</th></tr></thead>
  <tbody>
    <tr><td>Đường đi</td><td>Backbone Microsoft, private</td><td>IPsec tunnel qua gateway</td></tr>
    <tr><td>Băng thông</td><td>Theo VM, không giới hạn bởi peering</td><td>Giới hạn bởi SKU gateway</td></tr>
    <tr><td>Độ trễ</td><td>Thấp</td><td>Cao hơn</td></tr>
    <tr><td>Mã hóa</td><td>Không thêm (đã nằm trên mạng riêng)</td><td>Có (IPsec)</td></tr>
    <tr><td>Chi phí</td><td>Phí dữ liệu</td><td>Phí gateway theo giờ + dữ liệu</td></tr>
    <tr><td>Thời gian triển khai</td><td>Vài giây</td><td>Tạo gateway mất khá lâu</td></tr>
  </tbody>
</table>
<p>Nếu hai VNet vừa peering vừa có kết nối VPN, lưu lượng giữa chúng đi qua <strong>peering</strong>.</p>

<h4>Subnet peering</h4>
<p>Tính năng mới hơn cho phép chỉ peering <strong>một số subnet</strong> thay vì toàn bộ address space, hữu ích khi các VNet có phần address space chồng lấn ở subnet không cần kết nối.</p>

<div class="callout exam"><strong>Góc thi</strong>"VNet1 peering VNet2, VNet2 peering VNet3. VM ở VNet1 có ping được VM ở VNet3 không?" → <strong>Không</strong> (non-transitive), trừ khi có peering trực tiếp VNet1–VNet3 hoặc định tuyến qua NVA/Azure Firewall ở VNet2 với UDR.</div>
`
    },
    {
      id: 'gateway-transit',
      unit: 'Determine gateway transit and connectivity',
      title: 'Gateway transit và kết nối on-premises',
      html: `
<p>Trong mô hình hub-spoke, chỉ <strong>hub</strong> có VPN gateway hoặc ExpressRoute gateway. Các spoke dùng chung gateway đó để ra on-premises nhờ <strong>gateway transit</strong>, tiết kiệm chi phí và đơn giản quản trị.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 326" role="img" aria-label="Hub có VPN gateway, hai spoke dùng remote gateway qua peering">
  <rect class="box" x="260" y="10" width="200" height="44" rx="10"/>
  <text x="360" y="30" text-anchor="middle" class="t-b">On-premises</text>
  <text x="360" y="46" text-anchor="middle" class="t-sm">S2S VPN / ExpressRoute</text>

  <rect class="box-a" x="230" y="90" width="260" height="80" rx="12"/>
  <text x="245" y="112" class="t-b t-a">vnet-hub</text>
  <rect class="box-w" x="260" y="126" width="200" height="34" rx="8"/>
  <text x="360" y="148" text-anchor="middle" class="t-sm t-b">VPN gateway (GatewaySubnet)</text>
  <line class="ln-a" x1="360" y1="58" x2="360" y2="122" marker-start="url(#arr-a)" marker-end="url(#arr-a)"/>

  <rect class="box-a" x="30" y="220" width="220" height="64" rx="10"/>
  <text x="140" y="242" text-anchor="middle" class="t-b">vnet-spoke1</text>
  <text x="140" y="260" text-anchor="middle" class="t-sm t-s">Use remote gateways ✓</text>
  <text x="140" y="276" text-anchor="middle" class="t-sm t-mute">không có gateway riêng</text>
  <rect class="box-a" x="470" y="220" width="220" height="64" rx="10"/>
  <text x="580" y="242" text-anchor="middle" class="t-b">vnet-spoke2</text>
  <text x="580" y="260" text-anchor="middle" class="t-sm t-s">Use remote gateways ✓</text>
  <text x="580" y="276" text-anchor="middle" class="t-sm t-mute">không có gateway riêng</text>

  <line class="ln-s" x1="280" y1="174" x2="164" y2="216" marker-start="url(#arr-s)" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="440" y1="174" x2="556" y2="216" marker-start="url(#arr-s)" marker-end="url(#arr-s)"/>
  <text x="360" y="200" text-anchor="middle" class="t-sm t-s">Allow gateway transit ✓</text>
  <text x="360" y="216" text-anchor="middle" class="t-sm t-mute">(trên link hub → spoke)</text>

  <path class="ln-x dash" d="M140 288 V300 H580 V288"/>
  <text x="360" y="316" text-anchor="middle" class="t-sm t-x">spoke1 ↔ spoke2: vẫn KHÔNG thông (gateway transit không bắc cầu spoke)</text>
</svg>
<figcaption>Hình 1. Hub giữ gateway duy nhất. Link hub → spoke bật <em>Allow gateway transit</em>, link spoke → hub bật <em>Use remote gateways</em>; spoke học route on-premises qua gateway của hub.</figcaption>
</figure>

<h4>Hai thiết lập phải đi đôi</h4>
<table>
  <thead><tr><th>Phía</th><th>Thiết lập (tên trên portal hiện tại)</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td>Hub → Spoke</td><td><strong>Allow gateway transit</strong> (<em>Allow gateway or route server in hub to forward traffic to the peered virtual network</em>)</td><td>Cho phép VNet peering dùng gateway của hub</td></tr>
    <tr><td>Spoke → Hub</td><td><strong>Use remote gateways</strong> (<em>Enable spoke to use the peered virtual network's remote gateway or route server</em>)</td><td>Spoke dùng gateway của hub, học route on-premises</td></tr>
  </tbody>
</table>

<h4>Quy tắc</h4>
<ul>
  <li>Spoke bật <strong>Use remote gateways</strong> thì <strong>không được có gateway riêng</strong>. Một VNet chỉ dùng một gateway: hoặc của chính nó, hoặc gateway remote.</li>
  <li>Use remote gateways chỉ bật trên <strong>một</strong> peering của VNet đó.</li>
  <li>Hub phải có gateway (hoặc Route Server) <strong>trước</strong> khi bật Allow gateway transit.</li>
  <li>Hỗ trợ cả <strong>regional và global peering</strong>.</li>
  <li>Lưu lượng spoke ↔ gateway tính phí peering ở phía spoke.</li>
  <li>Phía on-premises: thiết bị VPN phải biết dải địa chỉ của spoke (thêm vào traffic selectors/local network nếu dùng policy-based, hoặc học qua BGP).</li>
  <li>Client Point-to-Site phải <strong>tải lại cấu hình VPN client</strong> sau khi peering/topology thay đổi để nhận route mới.</li>
</ul>

<h4>Cấu hình bằng CLI</h4>
<pre><code># Trên hub: cho phép gateway transit
az network vnet peering update -g rg-hub --vnet-name vnet-hub -n hub-to-spoke1 \\
  --set allowGatewayTransit=true

# Trên spoke: dùng gateway của hub
az network vnet peering update -g rg-spoke1 --vnet-name vnet-spoke1 -n spoke1-to-hub \\
  --set useRemoteGateways=true</code></pre>

<h4>Spoke có ra on-premises được không? Bảng kiểm tra nhanh</h4>
<table>
  <thead><tr><th>Điều kiện</th><th>Cần</th></tr></thead>
  <tbody>
    <tr><td>Peering hai phía</td><td>Trạng thái <strong>Connected</strong></td></tr>
    <tr><td>Hub peering</td><td>Allow gateway transit = bật</td></tr>
    <tr><td>Spoke peering</td><td>Use remote gateways = bật</td></tr>
    <tr><td>Spoke có gateway riêng?</td><td>Không</td></tr>
    <tr><td>On-premises biết dải spoke</td><td>Có (BGP hoặc cấu hình tĩnh)</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Spoke cần kết nối on-premises qua VPN gateway của hub, chi phí thấp nhất" → bật <strong>Allow gateway transit</strong> trên hub và <strong>Use remote gateways</strong> trên spoke. Không tạo thêm gateway ở spoke. Lưu ý: gateway transit <strong>không</strong> làm spoke1 nói chuyện được với spoke2.</div>
`
    },
    {
      id: 'create-peering',
      unit: 'Create virtual network peering',
      title: 'Tạo VNet peering',
      html: `
<h4>Quyền cần thiết</h4>
<p>Tài khoản cần role <strong>Network Contributor</strong> trên VNet (hoặc custom role có <code>Microsoft.Network/virtualNetworks/virtualNetworkPeerings/write</code>, <code>read</code>, <code>delete</code>, kèm quyền <code>peer</code> trên VNet đích). Với VNet ở tenant khác, thêm người dùng làm <strong>guest</strong> ở tenant kia và cấp quyền tương ứng; trên portal chọn <em>I know my resource ID</em> và nhập resource ID của VNet đích.</p>

<h4>Các thiết lập của một peering link</h4>
<table>
  <thead><tr><th>Thiết lập</th><th>Mặc định</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><strong>Allow access</strong> (allowVirtualNetworkAccess)</td><td>Bật</td><td>Cho phép lưu lượng tới VNet bên kia. Service tag <code>VirtualNetwork</code> bao gồm VNet peering khi bật. Tắt để tạm ngắt kết nối mà không xóa peering.</td></tr>
    <tr><td><strong>Allow forwarded traffic</strong> (allowForwardedTraffic)</td><td>Tắt</td><td>Nhận lưu lượng <em>không xuất phát</em> từ VNet peering (ví dụ do NVA chuyển tiếp). Không tự tạo UDR hay NVA.</td></tr>
    <tr><td><strong>Allow gateway transit</strong> (allowGatewayTransit)</td><td>Tắt</td><td>Cho VNet bên kia dùng gateway/Route Server của VNet này.</td></tr>
    <tr><td><strong>Use remote gateways</strong> (useRemoteGateways)</td><td>Tắt</td><td>Dùng gateway của VNet bên kia.</td></tr>
  </tbody>
</table>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: peering hub ↔ spoke có gateway transit (tạo cả hai chiều trong một lần)</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Điều kiện: <code>vnet-hub</code> (10.0.0.0/16) đã có VPN gateway; <code>vnet-spoke1</code> (10.1.0.0/16) không có gateway; hai address space không chồng lấn.</li>
    <li>Mở VNet hub và thêm peering:<br><span class="path">Virtual networks › vnet-hub › Settings › Peerings › + Add</span></li>
    <li>Điền trang <strong>Add peering</strong>. Phần <em>Remote</em> mô tả link tạo ở VNet bên kia (spoke → hub), phần <em>Local</em> là link ở VNet đang mở (hub → spoke):
      <div class="blade">
        <div class="blade-title">Add peering</div>
        <div class="blade-sec">Remote virtual network summary</div>
        <div class="pf"><label class="req">Peering link name</label><span class="pv">spoke1-to-hub</span></div>
        <div class="pf"><label>Virtual network deployment model</label><span class="pv radio">Resource manager</span></div>
        <div class="pf"><label>I know my resource ID</label><span class="pv">☐ không chọn</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-spoke1 (rg-spoke1)</span></div>
        <div class="blade-sec">Remote virtual network peering settings</div>
        <div class="pf"><label>Allow 'vnet-spoke1' to access 'vnet-hub'</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Allow 'vnet-spoke1' to receive forwarded traffic from 'vnet-hub'</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Allow gateway or route server in 'vnet-spoke1' to forward traffic to 'vnet-hub'</label><span class="pv">☐ không chọn</span></div>
        <div class="pf"><label>Enable 'vnet-spoke1' to use 'vnet-hub's' remote gateway or route server</label><span class="pv chk">Bật (= Use remote gateways)</span></div>
        <div class="blade-sec">Local virtual network summary</div>
        <div class="pf"><label class="req">Peering link name</label><span class="pv">hub-to-spoke1</span></div>
        <div class="blade-sec">Local virtual network peering settings</div>
        <div class="pf"><label>Allow 'vnet-hub' to access 'vnet-spoke1'</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Allow 'vnet-hub' to receive forwarded traffic from 'vnet-spoke1'</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Allow gateway or route server in 'vnet-hub' to forward traffic to 'vnet-spoke1'</label><span class="pv chk">Bật (= Allow gateway transit)</span></div>
        <div class="pf"><label>Enable 'vnet-hub' to use 'vnet-spoke1's' remote gateway or route server</label><span class="pv">☐ không chọn</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Bấm <strong>Refresh</strong> sau vài giây: cột <em>Peering status</em> chuyển từ <strong>Updating</strong> sang <strong>Connected</strong>. Mở <code>vnet-spoke1</code> › <strong>Peerings</strong> sẽ thấy link <code>spoke1-to-hub</code> cũng đã được tạo.</li>
    <li>Kiểm chứng: trên NIC của một VM trong spoke, xem <strong>Effective routes</strong>: có route next hop <strong>VNet peering</strong> tới 10.0.0.0/16 và route on-premises với next hop <strong>VirtualNetworkGateway</strong>.</li>
  </ol>
  </div>
</div>

<h4>Trạng thái peering</h4>
<table>
  <thead><tr><th>Trạng thái</th><th>Ý nghĩa</th><th>Xử lý</th></tr></thead>
  <tbody>
    <tr><td><strong>Initiated</strong></td><td>Mới tạo link một phía</td><td>Tạo link ở VNet còn lại</td></tr>
    <tr><td><strong>Connected</strong></td><td>Cả hai link đã có; lưu lượng chạy được</td><td>Không cần làm gì</td></tr>
    <tr><td><strong>Disconnected</strong></td><td>Link phía bên kia đã bị xóa (link còn lại mồ côi)</td><td>Xóa link còn lại và tạo lại peering hai phía</td></tr>
  </tbody>
</table>
<p>Peering chỉ hoạt động khi <strong>cả hai</strong> link đều <strong>Connected</strong>. Trên portal hiện nay, xóa peering ở một VNet cũng xóa link ở VNet bên kia.</p>

<h4>Azure CLI</h4>
<pre><code># Cùng subscription: dùng tên VNet; khác RG/subscription: dùng resource ID đầy đủ
az network vnet peering create -g rg-hub -n hub-to-spoke1 --vnet-name vnet-hub \\
  --remote-vnet /subscriptions/&lt;sub&gt;/resourceGroups/rg-spoke1/providers/Microsoft.Network/virtualNetworks/vnet-spoke1 \\
  --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit

az network vnet peering create -g rg-spoke1 -n spoke1-to-hub --vnet-name vnet-spoke1 \\
  --remote-vnet /subscriptions/&lt;sub&gt;/resourceGroups/rg-hub/providers/Microsoft.Network/virtualNetworks/vnet-hub \\
  --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways

az network vnet peering list -g rg-hub --vnet-name vnet-hub -o table
az network vnet peering show -g rg-hub --vnet-name vnet-hub -n hub-to-spoke1 --query peeringState</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>$hub   = Get-AzVirtualNetwork -Name vnet-hub -ResourceGroupName rg-hub
$spoke = Get-AzVirtualNetwork -Name vnet-spoke1 -ResourceGroupName rg-spoke1
Add-AzVirtualNetworkPeering -Name hub-to-spoke1 -VirtualNetwork $hub -RemoteVirtualNetworkId $spoke.Id -AllowGatewayTransit
Add-AzVirtualNetworkPeering -Name spoke1-to-hub -VirtualNetwork $spoke -RemoteVirtualNetworkId $hub.Id -UseRemoteGateways

# Sửa thiết lập
$p = Get-AzVirtualNetworkPeering -VirtualNetworkName vnet-hub -ResourceGroupName rg-hub -Name hub-to-spoke1
$p.AllowForwardedTraffic = $true
Set-AzVirtualNetworkPeering -VirtualNetworkPeering $p</code></pre>

<h4>Thay đổi address space của VNet đang peering</h4>
<p>Có thể thêm, xóa hoặc đổi kích thước address space của VNet đang peering <strong>không downtime</strong>. Sau mỗi thay đổi, chạy thao tác <strong>Sync</strong> trên peering (portal hoặc PowerShell) để VNet bên kia cập nhật dải mới.</p>

<div class="callout exam"><strong>Góc thi</strong>"Tạo peering từ VNet1 sang VNet2, trạng thái là Initiated, VM không ping được nhau" → cần tạo peering <strong>từ VNet2 về VNet1</strong>. "Peering báo Disconnected" → xóa và tạo lại peering ở cả hai phía.</div>
`
    },
    {
      id: 'udr-service-chaining',
      unit: 'Extend peering with user-defined routes and service chaining',
      title: 'Mở rộng peering bằng UDR và service chaining',
      html: `
<p>Vì peering không bắc cầu, muốn spoke1 nói chuyện với spoke2 (hoặc muốn mọi lưu lượng đi qua tường lửa trung tâm) bạn đặt một <strong>NVA</strong> hoặc <strong>Azure Firewall</strong> ở hub và dùng <strong>user-defined route (UDR)</strong> để chỉ next hop. Kỹ thuật này gọi là <strong>service chaining</strong>.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 245" role="img" aria-label="Service chaining: VM-A ở spoke1 đi qua NVA ở hub tới VM-B ở spoke2 nhờ UDR">
  <rect class="zone" x="10" y="40" width="200" height="160" rx="12"/>
  <text x="110" y="62" text-anchor="middle" class="t-b">vnet-spoke1</text>
  <text x="110" y="80" text-anchor="middle" class="t-sm t-mute">10.1.0.0/16</text>
  <rect class="box-a" x="40" y="100" width="140" height="44" rx="8"/>
  <text x="110" y="119" text-anchor="middle" class="t-b">VM-A</text>
  <text x="110" y="136" text-anchor="middle" class="t-sm">10.1.0.4</text>
  <text x="110" y="168" text-anchor="middle" class="t-sm">UDR 10.2.0.0/16 → 10.0.1.4</text>
  <text x="110" y="186" text-anchor="middle" class="t-sm t-s">Allow forwarded traffic ✓</text>

  <rect class="zone" x="260" y="40" width="200" height="160" rx="12"/>
  <text x="360" y="62" text-anchor="middle" class="t-b">vnet-hub</text>
  <text x="360" y="80" text-anchor="middle" class="t-sm t-mute">10.0.0.0/16</text>
  <rect class="box-w" x="272" y="100" width="176" height="44" rx="8"/>
  <text x="360" y="119" text-anchor="middle" class="t-b">NVA / Firewall</text>
  <text x="360" y="136" text-anchor="middle" class="t-sm">10.0.1.4 · IP forwarding</text>
  <text x="360" y="168" text-anchor="middle" class="t-sm">next hop: Virtual appliance</text>

  <rect class="zone" x="510" y="40" width="200" height="160" rx="12"/>
  <text x="610" y="62" text-anchor="middle" class="t-b">vnet-spoke2</text>
  <text x="610" y="80" text-anchor="middle" class="t-sm t-mute">10.2.0.0/16</text>
  <rect class="box-a" x="540" y="100" width="140" height="44" rx="8"/>
  <text x="610" y="119" text-anchor="middle" class="t-b">VM-B</text>
  <text x="610" y="136" text-anchor="middle" class="t-sm">10.2.0.4</text>
  <text x="610" y="168" text-anchor="middle" class="t-sm">UDR 10.1.0.0/16 → 10.0.1.4</text>
  <text x="610" y="186" text-anchor="middle" class="t-sm t-s">Allow forwarded traffic ✓</text>

  <line class="ln-a" x1="180" y1="122" x2="268" y2="122" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="448" y1="122" x2="536" y2="122" marker-end="url(#arr-a)"/>
  <text x="235" y="22" text-anchor="middle" class="t-sm t-mute">peering</text>
  <line class="ln dash" x1="210" y1="28" x2="260" y2="28"/>
  <text x="485" y="22" text-anchor="middle" class="t-sm t-mute">peering</text>
  <line class="ln dash" x1="460" y1="28" x2="510" y2="28"/>
  <text x="360" y="228" text-anchor="middle" class="t-sm t-mute">Không có peering spoke1–spoke2: lưu lượng phải đi vòng qua NVA ở hub</text>
</svg>
<figcaption>Hình 1. UDR trên subnet mỗi spoke đặt next hop là private IP của NVA/Azure Firewall ở hub. Peering phía spoke bật <em>Allow forwarded traffic</em> để chấp nhận gói tin do NVA chuyển tiếp (IP nguồn không thuộc hub).</figcaption>
</figure>

<h4>Các bước cấu hình</h4>
<ol class="steps">
  <li>Peering hub ↔ spoke1 và hub ↔ spoke2 (Connected).</li>
  <li>Triển khai NVA (hoặc Azure Firewall) trong hub. Với VM NVA: bật <strong>IP forwarding</strong> trên NIC (Azure) và bật định tuyến trong hệ điều hành.</li>
  <li>Tạo route table cho subnet ở spoke1: route <code>10.2.0.0/16</code>, next hop type <strong>Virtual appliance</strong>, next hop IP <code>10.0.1.4</code>. Tương tự cho spoke2 với <code>10.1.0.0/16</code>.</li>
  <li>Trên các peering, bật <strong>Allow forwarded traffic</strong> để VNet chấp nhận lưu lượng do NVA chuyển tiếp (lưu lượng tới spoke2 có IP nguồn của spoke1, không phải của hub).</li>
  <li>Cấu hình rule cho phép trên NVA/Firewall và NSG.</li>
</ol>
<pre><code>az network route-table create -g rg-spoke1 -n rt-spoke1
az network route-table route create -g rg-spoke1 --route-table-name rt-spoke1 \\
  -n to-spoke2 --address-prefix 10.2.0.0/16 \\
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network vnet subnet update -g rg-spoke1 --vnet-name vnet-spoke1 -n snet-app \\
  --route-table rt-spoke1

# Bật IP forwarding trên NIC của NVA
az network nic update -g rg-hub -n nva1-nic --ip-forwarding true</code></pre>

<h4>Lưu ý về next hop</h4>
<ul>
  <li>Next hop trong UDR có thể là IP của VM/NVA ở <strong>VNet peering</strong>, hoặc <strong>VPN gateway</strong> (type Virtual network gateway).</li>
  <li><strong>Không</strong> dùng ExpressRoute gateway làm next hop để định tuyến giữa các VNet.</li>
  <li>Route <code>0.0.0.0/0</code> → NVA/Firewall dùng để ép lưu lượng Internet đi qua tường lửa trung tâm (forced tunneling nội bộ).</li>
  <li>Azure chọn route theo <strong>longest prefix match</strong>. Route peering hệ thống (ví dụ 10.2.0.0/16) cụ thể hơn một UDR tổng (10.0.0.0/8), nên UDR tổng có thể bị bỏ qua. Tính năng <em>disable peering route propagation</em> (preview) trên route table giúp xử lý trường hợp này.</li>
</ul>

<h4>Lựa chọn khác cho spoke-to-spoke</h4>
<ul>
  <li><strong>Peering trực tiếp</strong> spoke1 ↔ spoke2: đơn giản, rẻ nhưng số peering tăng nhanh (full mesh).</li>
  <li><strong>VPN gateway ở hub</strong> làm next hop (đi qua gateway).</li>
  <li><strong>Azure Virtual Network Manager</strong> (connectivity configuration hub-spoke với "direct connectivity" hoặc mesh).</li>
  <li><strong>Azure Virtual WAN</strong>: hub do Microsoft quản lý, tự định tuyến transit.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Spoke1 cần đi tới Spoke2 qua Azure Firewall ở hub" → <strong>UDR</strong> trên subnet spoke với next hop là <strong>private IP của firewall</strong>, và bật <strong>Allow forwarded traffic</strong> trên peering. Bật gateway transit <strong>không</strong> giải quyết được spoke-to-spoke.</div>
`
    },
    {
      id: 'hub-spoke-troubleshoot',
      extra: true,
      title: 'Hub-spoke topology & troubleshoot peering',
      html: `
<h4>Hub-spoke là gì?</h4>
<p><strong>Hub</strong> là VNet trung tâm chứa dịch vụ dùng chung: VPN/ExpressRoute gateway, Azure Firewall/NVA, Azure Bastion, DNS (Private Resolver), domain controller. <strong>Spoke</strong> là các VNet workload (theo ứng dụng, môi trường, đơn vị) peering với hub.</p>
<pre class="diagram">                  On-premises
                       ║ VPN / ExpressRoute
              ┌────────╨─────────┐
              │ HUB              │  Gateway · Azure Firewall · Bastion · DNS
              └──┬─────┬──────┬──┘
          peering│     │      │peering
            SPOKE-Prod SPOKE-Dev SPOKE-Shared
   (UDR 0.0.0.0/0 và dải spoke khác → Firewall trong hub)</pre>

<h4>Lợi ích</h4>
<ul>
  <li><strong>Tiết kiệm</strong>: một gateway, một firewall dùng chung cho nhiều spoke.</li>
  <li><strong>Cô lập</strong>: mỗi workload một VNet, có thể ở subscription khác; giao tiếp giữa spoke được kiểm soát tại hub.</li>
  <li><strong>Quản trị tập trung</strong>: đội network quản lý hub, đội ứng dụng quản lý spoke.</li>
</ul>

<h4>Cấu hình peering chuẩn cho hub-spoke có firewall</h4>
<table>
  <thead><tr><th>Link</th><th>Allow access</th><th>Allow forwarded traffic</th><th>Gateway transit</th><th>Use remote gateways</th></tr></thead>
  <tbody>
    <tr><td>Hub → Spoke</td><td>Bật</td><td>Bật</td><td>Bật</td><td>Tắt</td></tr>
    <tr><td>Spoke → Hub</td><td>Bật</td><td>Bật</td><td>Tắt</td><td>Bật (nếu dùng gateway hub)</td></tr>
  </tbody>
</table>

<h4>Quy trình xử lý sự cố</h4>
<ol class="steps">
  <li><strong>Trạng thái peering</strong>: cả hai link phải <strong>Connected</strong>. Initiated → tạo link còn thiếu; Disconnected → xóa và tạo lại.</li>
  <li><strong>Address space</strong>: chồng lấn sẽ không tạo được peering; nếu vừa đổi address space thì chạy <strong>Sync</strong>.</li>
  <li><strong>Effective routes</strong> trên NIC của VM nguồn: phải thấy route next hop type <strong>VNet peering</strong> (hoặc VirtualAppliance nếu có UDR). Nếu không thấy → peering chưa đúng hoặc route bị UDR ghi đè.</li>
  <li><strong>NSG</strong>: dùng IP flow verify/effective security rules; kiểm tra rule Deny chặn dải VNet bên kia.</li>
  <li><strong>Transitive?</strong> Nếu nguồn và đích không peering trực tiếp, phải có NVA + UDR + Allow forwarded traffic.</li>
  <li><strong>Gateway</strong>: spoke ra on-premises cần Allow gateway transit (hub) + Use remote gateways (spoke); spoke không có gateway riêng.</li>
  <li><strong>NVA</strong>: IP forwarding bật trên NIC và trong OS; NVA có route trả về.</li>
  <li><strong>DNS</strong>: ping IP được nhưng ping tên không được → cần private DNS zone link vào các VNet.</li>
  <li><strong>Network Watcher</strong>: <em>Connection troubleshoot</em> và <em>Next hop</em> để xem đường đi thực tế.</li>
</ol>
<pre><code>az network nic show-effective-route-table -g rg-spoke1 -n vmA-nic -o table
az network watcher show-next-hop -g rg-spoke1 --vm vmA \\
  --source-ip 10.1.0.4 --dest-ip 10.2.0.4</code></pre>

<h4>Lỗi thường gặp</h4>
<table>
  <thead><tr><th>Triệu chứng</th><th>Nguyên nhân hay gặp</th></tr></thead>
  <tbody>
    <tr><td>Không tạo được peering</td><td>Address space chồng lấn; thiếu quyền trên VNet đích</td></tr>
    <tr><td>Không bật được Use remote gateways</td><td>Spoke đã có gateway riêng; hub chưa có gateway hoặc chưa bật gateway transit</td></tr>
    <tr><td>Spoke1 không tới Spoke2</td><td>Peering không bắc cầu; thiếu UDR/NVA; thiếu Allow forwarded traffic</td></tr>
    <tr><td>Global peering không tới Basic LB</td><td>Basic LB không hỗ trợ qua global peering; dùng Standard LB</td></tr>
    <tr><td>Không move được VNet</td><td>Đang có peering; xóa peering trước</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Mẹo quy mô lớn</strong>Khi số spoke lớn, dùng <strong>Azure Virtual Network Manager</strong> để tự tạo/quản lý peering hub-spoke (tới 1.000 spoke) hoặc mesh, thay vì tạo tay từng cặp peering.</div>
`
    }
  ],
  keyFacts: [
    'Peering đi trên <strong>backbone Microsoft</strong>, không Internet, không gateway; regional = cùng region, global = khác region.',
    'Peering <strong>không bắc cầu</strong>: A–B, B–C không cho A tới C nếu không có peering trực tiếp hoặc NVA + UDR.',
    'Address space hai VNet <strong>không được chồng lấn</strong>.',
    'Phải tạo link ở <strong>cả hai</strong> VNet; trạng thái <strong>Initiated</strong> (một phía), <strong>Connected</strong> (hai phía), <strong>Disconnected</strong> (link bên kia bị xóa).',
    'Gateway transit: hub bật <strong>Allow gateway transit</strong>, spoke bật <strong>Use remote gateways</strong>; spoke <strong>không được có gateway riêng</strong>. Hoạt động với cả global peering.',
    '<strong>Allow forwarded traffic</strong> (mặc định tắt) cho phép nhận lưu lượng do NVA chuyển tiếp; không tự tạo UDR.',
    'Service chaining: UDR next hop type <strong>Virtual appliance</strong> trỏ tới IP NVA/Firewall ở VNet peering; NIC NVA cần <strong>IP forwarding</strong>.',
    'Peering được giữa subscription khác và <strong>Microsoft Entra tenant khác</strong>; cần Network Contributor (hoặc quyền virtualNetworkPeerings/write).',
    'Azure-provided DNS <strong>không phân giải tên qua peering</strong>; dùng private DNS zone.',
    'Global peering không truy cập được frontend <strong>Basic Load Balancer</strong> ở VNet bên kia.',
    'Không move VNet đang có peering; đổi address space VNet đang peering được, sau đó chạy <strong>Sync</strong>.',
    'Peering tính phí dữ liệu vào/ra ở cả hai phía; global đắt hơn regional.'
  ],
  traps: [
    'Cho rằng hub-spoke tự cho spoke1 nói chuyện với spoke2: sai, cần peering trực tiếp hoặc NVA/Firewall + UDR.',
    'Bật gateway transit để giải quyết spoke-to-spoke: gateway transit chỉ cho spoke dùng gateway hub ra on-premises.',
    'Bật Use remote gateways trên spoke đã có VPN gateway riêng: không được.',
    'Tạo peering một phía rồi kết luận đã xong: trạng thái <strong>Initiated</strong> nghĩa là chưa có lưu lượng.',
    'Quên <strong>Allow forwarded traffic</strong> khi định tuyến qua NVA: gói tin chuyển tiếp bị loại.',
    'Peering hai VNet có dải chồng lấn (ví dụ 10.0.0.0/16 và 10.0.1.0/24): không tạo được.',
    'Nghĩ global peering không hỗ trợ gateway transit: hiện tại có hỗ trợ.',
    'Ping IP qua peering được nhưng tên VM không phân giải: không phải lỗi peering mà là DNS.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Loại</td><td>Regional (cùng region) · Global (khác region)</td></tr>
    <tr><td>Transitive?</td><td>Không</td></tr>
    <tr><td>Overlap address space</td><td>Không được</td></tr>
    <tr><td>Trạng thái</td><td>Initiated → Connected; Disconnected = tạo lại</td></tr>
    <tr><td>Gateway transit</td><td>Hub: Allow gateway transit · Spoke: Use remote gateways (spoke không có GW)</td></tr>
    <tr><td>Qua NVA</td><td>UDR next hop Virtual appliance + IP forwarding + Allow forwarded traffic</td></tr>
    <tr><td>Quyền</td><td>Network Contributor hoặc virtualNetworkPeerings/write</td></tr>
    <tr><td>DNS qua peering</td><td>Private DNS zone (Azure-provided DNS không phân giải)</td></tr>
    <tr><td>Chẩn đoán</td><td>Effective routes (VNet peering), Next hop, Connection troubleshoot</td></tr>
    <tr><td>CLI</td><td><code>az network vnet peering create/update/list/show</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Regional và global VNet peering khác nhau thế nào?', back: 'Regional: hai VNet <strong>cùng region</strong>. Global: hai VNet <strong>khác region</strong> (cùng cloud).' },
    { front: 'VNet peering có tính bắc cầu không?', back: '<strong>Không</strong>. A–B và B–C không cho A tới C.' },
    { front: 'Điều kiện address space để peering?', back: 'Hai VNet <strong>không chồng lấn</strong> address space.' },
    { front: 'Trạng thái Initiated nghĩa là gì?', back: 'Mới tạo link một phía; cần tạo link ở VNet còn lại để thành <strong>Connected</strong>.' },
    { front: 'Trạng thái Disconnected xử lý thế nào?', back: 'Link phía bên kia đã bị xóa; xóa link còn lại và <strong>tạo lại</strong> peering ở cả hai phía.' },
    { front: 'Hai thiết lập để spoke dùng VPN gateway của hub?', back: 'Hub: <strong>Allow gateway transit</strong>. Spoke: <strong>Use remote gateways</strong>.' },
    { front: 'Spoke có gateway riêng có bật Use remote gateways được không?', back: '<strong>Không</strong>. Một VNet chỉ dùng một gateway: của chính nó hoặc remote.' },
    { front: 'Allow forwarded traffic dùng khi nào?', back: 'Khi VNet cần nhận lưu lượng <strong>không xuất phát</strong> từ VNet peering, ví dụ do NVA/Firewall ở hub chuyển tiếp.' },
    { front: 'Service chaining là gì?', back: 'Dùng <strong>UDR</strong> chỉ next hop tới NVA/Firewall (hoặc VPN gateway) ở VNet peering để lưu lượng đi qua thiết bị đó.' },
    { front: 'NVA dạng VM cần bật gì để chuyển tiếp gói tin?', back: '<strong>IP forwarding</strong> trên NIC (Azure) và routing trong hệ điều hành.' },
    { front: 'Có peering VNet ở hai Microsoft Entra tenant khác nhau được không?', back: '<strong>Có</strong>. Cần quyền trên cả hai VNet (thường qua guest user).' },
    { front: 'Role built-in tối thiểu để tạo peering?', back: '<strong>Network Contributor</strong> (hoặc custom role có virtualNetworkPeerings/write).' },
    { front: 'Azure-provided DNS có phân giải tên VM qua peering không?', back: '<strong>Không</strong>. Dùng private DNS zone link vào các VNet.' },
    { front: 'Global peering có hạn chế gì với load balancer?', back: 'Không truy cập được frontend IP của <strong>Basic</strong> LB ở VNet bên kia; Standard LB thì được.' },
    { front: 'Có di chuyển VNet đang peering sang resource group khác được không?', back: '<strong>Không</strong>. Xóa peering, move, rồi tạo lại.' },
    { front: 'Kiểm tra peering đã cài route chưa bằng cách nào?', back: 'Xem <strong>effective routes</strong> trên NIC: phải có route next hop type <strong>VNet peering</strong> cho dải VNet bên kia.' }
  ],
  quiz: [
    {
      q: 'VNet1 peering với VNet2, VNet2 peering với VNet3. Tất cả trạng thái Connected, không có UDR hay NVA. VM ở VNet1 có giao tiếp được với VM ở VNet3 không?',
      options: ['Có, vì peering có tính bắc cầu', 'Có, nếu bật Allow forwarded traffic trên mọi peering', 'Không, vì peering không bắc cầu', 'Không, vì cần global peering'],
      answer: [2],
      explain: 'Peering không bắc cầu; cần peering trực tiếp VNet1–VNet3 hoặc NVA ở VNet2 kèm UDR. Allow forwarded traffic chỉ cho phép nhận lưu lượng chuyển tiếp, không tự tạo đường đi; global hay regional không liên quan.'
    },
    {
      q: 'Bạn tạo peering từ VNetA tới VNetB bằng Azure CLI. Trạng thái peering hiển thị Initiated và VM hai bên không ping được nhau. Bạn cần làm gì?',
      options: ['Tạo peering từ VNetB tới VNetA', 'Bật Allow gateway transit', 'Khởi động lại các VM', 'Thêm NSG cho phép ICMP'],
      answer: [0],
      explain: 'Initiated nghĩa là mới có link một phía; tạo link ngược lại thì cả hai sẽ Connected. Gateway transit không liên quan; khởi động lại VM không tạo link; NSG mặc định đã cho phép lưu lượng VirtualNetwork.'
    },
    {
      q: 'VNet-Hub có VPN gateway kết nối on-premises. VNet-Spoke peering với VNet-Hub. Bạn cần VM trong VNet-Spoke truy cập on-premises với chi phí thấp nhất. Bạn cần làm gì? (Chọn 2)',
      options: ['Tạo VPN gateway trong VNet-Spoke', 'Bật Allow gateway transit trên peering của VNet-Hub', 'Bật Use remote gateways trên peering của VNet-Spoke', 'Bật Allow forwarded traffic trên peering của VNet-Hub'],
      answer: [1, 2],
      explain: 'Gateway transit cần Allow gateway transit ở hub và Use remote gateways ở spoke. Tạo gateway ở spoke tốn chi phí và sẽ ngăn bật Use remote gateways; Allow forwarded traffic phục vụ lưu lượng qua NVA, không phải để dùng gateway.'
    },
    {
      q: 'Bạn cố bật Use remote gateways trên peering của VNet2 nhưng thao tác thất bại. VNet1 (hub) đã có VPN gateway và bật Allow gateway transit. Nguyên nhân khả dĩ nhất?',
      options: ['VNet1 và VNet2 ở hai region khác nhau', 'VNet2 đã có virtual network gateway riêng', 'VNet2 không có NSG', 'VNet2 thuộc subscription khác'],
      answer: [1],
      explain: 'Một VNet không thể dùng remote gateway khi đã có gateway riêng. Gateway transit hỗ trợ global peering và khác subscription; NSG không ảnh hưởng tới thiết lập này.'
    },
    {
      q: 'Bạn có VNet1 <code>10.10.0.0/16</code> và VNet2 <code>10.10.128.0/20</code>. Bạn cố tạo peering nhưng thất bại. Cách khắc phục?',
      options: ['Dùng global peering thay vì regional', 'Gán role Network Contributor', 'Bật Allow forwarded traffic', 'Đổi address space của một VNet để không chồng lấn'],
      answer: [3],
      explain: '<code>10.10.128.0/20</code> nằm trong <code>10.10.0.0/16</code>, nên address space chồng lấn và không thể peering. Loại peering, quyền hay tùy chọn forwarded traffic không giải quyết được chồng lấn.'
    },
    {
      q: 'Topology hub-spoke: Spoke1 và Spoke2 đều peering với Hub. Hub có Azure Firewall IP <code>10.0.1.4</code>. Bạn cần lưu lượng Spoke1 ↔ Spoke2 đi qua firewall. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['UDR trên subnet của mỗi spoke, dải spoke kia với next hop Virtual appliance 10.0.1.4', 'Bật Allow gateway transit trên Hub', 'Bật Allow forwarded traffic trên các peering', 'Tạo private DNS zone link cả ba VNet'],
      answer: [0, 2],
      explain: 'UDR đưa lưu lượng tới firewall, và Allow forwarded traffic cho phép VNet nhận lưu lượng do firewall chuyển tiếp. Gateway transit chỉ dùng chung gateway VPN/ExpressRoute; private DNS zone xử lý phân giải tên, không định tuyến.'
    },
    {
      q: 'Bạn cần peering VNet ở subscription A (tenant Contoso) với VNet ở subscription B (tenant Fabrikam). Phát biểu nào đúng?',
      options: ['Không thể peering giữa hai tenant', 'Được, cần quyền trên cả hai VNet (ví dụ thêm người dùng làm guest ở tenant kia) và dùng resource ID của VNet đích', 'Chỉ được nếu hai VNet cùng region', 'Phải dùng VPN gateway thay cho peering'],
      answer: [1],
      explain: 'Peering hỗ trợ subscription và Microsoft Entra tenant khác nhau, với điều kiện có quyền trên cả hai VNet. Peering cũng hỗ trợ khác region (global), nên không bắt buộc cùng region hay phải dùng VPN.'
    },
    {
      q: 'VM ở VNet1 ping được VM ở VNet2 (đã peering) bằng IP nhưng không phân giải được tên <code>vm2</code>. Cả hai VNet dùng Azure-provided DNS. Bạn cần làm gì?',
      options: ['Xóa và tạo lại peering', 'Bật Allow forwarded traffic', 'Tạo private DNS zone và link cả hai VNet (auto-registration bật)', 'Đổi peering sang global'],
      answer: [2],
      explain: 'Azure-provided DNS không phân giải tên qua peering; private DNS zone link vào cả hai VNet giải quyết điều này. Kết nối IP đã hoạt động nên peering không có lỗi; forwarded traffic và loại peering không liên quan tới DNS.'
    },
    {
      q: 'Bạn cần di chuyển VNet2 (đang peering với VNet1) sang resource group khác. Bạn nên làm gì?',
      options: ['Xóa peering, di chuyển VNet2, rồi tạo lại peering', 'Di chuyển trực tiếp, peering được giữ nguyên', 'Tắt Allow access trên peering rồi di chuyển', 'Chuyển peering sang trạng thái Disconnected rồi di chuyển'],
      answer: [0],
      explain: 'Không thể di chuyển VNet khi đang có peering; phải xóa peering, di chuyển, rồi tạo lại. Tắt Allow access không xóa peering; không có thao tác chủ động đặt trạng thái Disconnected.'
    },
    {
      q: 'Bạn cần tạm thời chặn mọi lưu lượng giữa VNet1 và VNet2 trong một giờ bảo trì rồi bật lại, ít công sức nhất. Bạn làm gì?',
      options: ['Xóa peering rồi tạo lại sau', 'Thay đổi address space của VNet2', 'Bật Use remote gateways', 'Tắt Allow access (allowVirtualNetworkAccess) trên peering'],
      answer: [3],
      explain: 'Tắt Allow access chặn lưu lượng mà vẫn giữ peering, bật lại rất nhanh. Xóa và tạo lại tốn công hơn; đổi address space ảnh hưởng tài nguyên; Use remote gateways không chặn lưu lượng.'
    },
    {
      q: 'Bạn thêm address space <code>10.20.0.0/16</code> vào VNet-Hub đang peering với 5 spoke. VM ở spoke chưa tới được dải mới. Bạn cần làm gì?',
      options: ['Xóa và tạo lại 5 peering', 'Thực hiện Sync trên các peering để cập nhật address space mới', 'Bật Allow gateway transit', 'Khởi động lại VM-Hub'],
      answer: [1],
      explain: 'Sau khi đổi address space của VNet đang peering, chạy Sync để VNet bên kia cập nhật dải mới, không downtime. Xóa và tạo lại không cần thiết; gateway transit và khởi động lại VM không liên quan.'
    },
    {
      q: 'Bạn triển khai NVA (VM Linux) trong hub để định tuyến giữa các spoke. UDR đã trỏ đúng tới NVA nhưng gói tin không được chuyển tiếp. Bạn cần kiểm tra gì? (Chọn 2)',
      options: ['IP forwarding đã bật trên NIC của NVA trong Azure', 'NVA có public IP Standard', 'Hệ điều hành của NVA đã bật chuyển tiếp IP (ip_forward)', 'Hub có VPN gateway'],
      answer: [0, 2],
      explain: 'NVA cần IP forwarding ở cả NIC Azure và trong hệ điều hành. Public IP không cần cho định tuyến nội bộ; VPN gateway không liên quan tới spoke-to-spoke qua NVA.'
    },
    {
      q: 'VNet1 (West Europe) global peering với VNet2 (East US). VM ở VNet1 không truy cập được frontend IP của internal load balancer ở VNet2, trong khi truy cập trực tiếp IP VM backend thì được. Nguyên nhân khả dĩ nhất?',
      options: ['Global peering không hỗ trợ TCP', 'Thiếu Allow gateway transit', 'Load balancer dùng SKU Basic', 'Hai VNet cần cùng subscription'],
      answer: [2],
      explain: 'Qua global peering, không truy cập được frontend của Basic Load Balancer; Standard LB thì được. Global peering hỗ trợ mọi giao thức IP thông thường; gateway transit và subscription không liên quan.'
    },
    {
      q: 'Bạn cần xác minh VM-A ở Spoke1 có route tới Spoke2 qua peering hay qua firewall. Công cụ nào phù hợp nhất?',
      options: ['Activity log của VNet', 'Azure Advisor', 'Effective security rules', 'Effective routes trên NIC của VM-A (hoặc Network Watcher Next hop)'],
      answer: [3],
      explain: 'Effective routes và Next hop cho biết next hop thực tế (VNet peering hay VirtualAppliance). Activity log chỉ ghi thao tác quản trị; Advisor đưa khuyến nghị; effective security rules chỉ cho biết NSG cho phép hay chặn.'
    }
  ]
});

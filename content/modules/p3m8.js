AZ.addModule({
  id: 'p3m8',
  summary: '<strong>Azure Network Watcher</strong> là bộ công cụ giám sát và chẩn đoán mạng cho tài nguyên IaaS (VM, VNet, Load Balancer, Application Gateway, VPN gateway…). Dạng câu hỏi kinh điển của AZ-104 là <em>"bạn nên dùng công cụ nào để xác định X"</em>: IP flow verify, NSG diagnostics, Next hop, Effective security rules, Connection troubleshoot, Packet capture, VPN troubleshoot, Topology, Connection monitor, flow logs và Traffic analytics.',
  objectives: [
    'Giải thích Network Watcher là gì, phạm vi theo region và cơ chế tự động bật',
    'Chọn đúng công cụ chẩn đoán cho từng triệu chứng: NSG chặn, định tuyến sai, kết nối thất bại, VPN lỗi',
    'Phân biệt công cụ "tại một thời điểm" (Connection troubleshoot) và "giám sát liên tục" (Connection monitor)',
    'So sánh NSG flow logs và VNet flow logs, nắm lịch retire của NSG flow logs và yêu cầu của Traffic analytics',
    'Chạy các công cụ bằng Azure CLI và PowerShell'
  ],
  sections: [
    {
      id: 'what-is-nw',
      unit: 'What is Azure Network Watcher?',
      title: 'Azure Network Watcher là gì?',
      html: `
<p><strong>Network Watcher</strong> cung cấp công cụ để <strong>giám sát, chẩn đoán, xem metrics và bật/tắt log</strong> cho tài nguyên mạng IaaS trong Azure. Nó <strong>không</strong> được thiết kế để giám sát PaaS hay phân tích web (dùng Application Insights cho việc đó).</p>

<h4>Ba nhóm công cụ</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Công cụ</th></tr></thead>
  <tbody>
    <tr><td><strong>Monitoring</strong></td><td>Topology, Connection monitor</td></tr>
    <tr><td><strong>Network diagnostic tools</strong> (7 công cụ)</td><td>IP flow verify, NSG diagnostics, Next hop, Effective security rules, Connection troubleshoot, Packet capture, VPN troubleshoot</td></tr>
    <tr><td><strong>Traffic</strong></td><td>Flow logs (NSG flow logs, VNet flow logs), Traffic analytics</td></tr>
  </tbody>
</table>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 310" role="img" aria-label="Bản đồ công cụ Network Watcher theo ba nhóm: Monitoring, Network diagnostic tools và Traffic">
  <rect class="box-a" x="10" y="10" width="200" height="290" rx="12"/>
  <text x="110" y="36" text-anchor="middle" class="t-b t-a">Monitoring</text>
  <rect class="box" x="25" y="50" width="170" height="26" rx="6"/>
  <text x="110" y="68" text-anchor="middle">Topology</text>
  <rect class="box" x="25" y="84" width="170" height="26" rx="6"/>
  <text x="110" y="102" text-anchor="middle">Connection monitor</text>
  <text x="110" y="270" text-anchor="middle" class="t-sm t-mute">sơ đồ + giám sát liên tục</text>

  <rect class="box-s" x="230" y="10" width="260" height="290" rx="12"/>
  <text x="360" y="36" text-anchor="middle" class="t-b t-s">Network diagnostic tools</text>
  <rect class="box" x="245" y="50" width="230" height="26" rx="6"/>
  <text x="360" y="68" text-anchor="middle">IP flow verify</text>
  <rect class="box" x="245" y="84" width="230" height="26" rx="6"/>
  <text x="360" y="102" text-anchor="middle">NSG diagnostics</text>
  <rect class="box" x="245" y="118" width="230" height="26" rx="6"/>
  <text x="360" y="136" text-anchor="middle">Next hop</text>
  <rect class="box" x="245" y="152" width="230" height="26" rx="6"/>
  <text x="360" y="170" text-anchor="middle">Effective security rules</text>
  <rect class="box" x="245" y="186" width="230" height="26" rx="6"/>
  <text x="360" y="204" text-anchor="middle">Connection troubleshoot</text>
  <rect class="box" x="245" y="220" width="230" height="26" rx="6"/>
  <text x="360" y="238" text-anchor="middle">Packet capture</text>
  <rect class="box" x="245" y="254" width="230" height="26" rx="6"/>
  <text x="360" y="272" text-anchor="middle">VPN troubleshoot</text>

  <rect class="box-w" x="510" y="10" width="200" height="290" rx="12"/>
  <text x="610" y="36" text-anchor="middle" class="t-b t-w">Traffic</text>
  <rect class="box" x="525" y="50" width="170" height="26" rx="6"/>
  <text x="610" y="68" text-anchor="middle">Flow logs</text>
  <rect class="box" x="525" y="84" width="170" height="26" rx="6"/>
  <text x="610" y="102" text-anchor="middle">Traffic analytics</text>
  <text x="610" y="252" text-anchor="middle" class="t-sm t-mute">NSG / VNet flow logs</text>
  <text x="610" y="270" text-anchor="middle" class="t-sm t-mute">+ Log Analytics</text>
</svg>
<figcaption>Hình 1. Menu của Network Watcher chia ba nhóm. Nhóm giữa (7 công cụ chẩn đoán) là nơi đề thi hỏi nhiều nhất; nhóm Traffic ghi và phân tích luồng IP theo thời gian.</figcaption>
</figure>

<p>Ngoài ra có <strong>Usage + quotas</strong>: tóm tắt số lượng tài nguyên mạng đã dùng so với giới hạn theo subscription và region.</p>

<h4>Tự động bật theo region</h4>
<ul>
  <li>Khi bạn <strong>tạo hoặc cập nhật một VNet</strong>, Network Watcher được <strong>tự động bật cho region đó</strong>. Việc bật không tính phí và không ảnh hưởng tài nguyên.</li>
  <li>Tài nguyên được tạo tên <code>NetworkWatcher_&lt;region&gt;</code> trong resource group <strong>NetworkWatcherRG</strong>.</li>
  <li>Giới hạn: <strong>1 instance Network Watcher mỗi region mỗi subscription</strong>.</li>
  <li>Có thể opt-out khỏi tự động bật; khi đó phải bật thủ công trước khi dùng công cụ ở region đó.</li>
</ul>
<pre><code># Bật thủ công Network Watcher cho region
az network watcher configure -g NetworkWatcherRG --locations eastus --enabled true

# PowerShell
New-AzNetworkWatcher -Name NetworkWatcher_eastus -ResourceGroupName NetworkWatcherRG -Location eastus</code></pre>

<h4>Network Watcher Agent extension</h4>
<p>Một số công cụ cần VM extension <strong>Network Watcher Agent</strong> (<code>AzureNetworkWatcherExtension</code>) trên VM nguồn: <strong>Packet capture</strong>, <strong>Connection troubleshoot</strong> (với nguồn là VM) và <strong>Connection monitor</strong>. Khi dùng portal, extension thường được cài tự động.</p>

<h4>Giới hạn đáng nhớ</h4>
<table>
  <thead><tr><th>Tài nguyên</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Network Watcher mỗi region mỗi subscription</td><td>1</td></tr>
    <tr><td>Connection monitor mỗi region mỗi subscription</td><td>100</td></tr>
    <tr><td>Packet capture session song song mỗi region mỗi subscription</td><td>10.000</td></tr>
    <tr><td>VPN troubleshoot đồng thời mỗi subscription</td><td>1</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>"Bạn tạo VM ở region mới và không thấy Network Watcher hoạt động" → cần <strong>bật Network Watcher cho region đó</strong> (nếu subscription đã opt-out tự động bật). Network Watcher là tài nguyên <strong>regional</strong>, không phải global.</div>
`
    },
    {
      id: 'how-nw-works',
      unit: 'How Azure Network Watcher works',
      title: 'Các công cụ của Network Watcher hoạt động thế nào?',
      html: `
<h4>Công cụ chẩn đoán</h4>
<table>
  <thead><tr><th>Công cụ</th><th>Trả lời câu hỏi</th><th>Đầu vào / đầu ra</th></tr></thead>
  <tbody>
    <tr><td><strong>IP flow verify</strong></td><td>Một gói tin có bị NSG <strong>cho phép hay chặn</strong> tới/từ VM không? Rule nào?</td><td>VM, NIC, hướng, protocol (TCP/UDP), IP/port local và remote → Allow/Deny + tên rule</td></tr>
    <tr><td><strong>NSG diagnostics</strong></td><td>Giống IP flow verify nhưng rộng hơn</td><td>Đích là VM, VMSS hoặc Application Gateway; nguồn là IP, prefix hoặc service tag; cho xem đánh giá từng NSG và có thể <strong>thêm rule</strong> mới ưu tiên cao hơn</td></tr>
    <tr><td><strong>Next hop</strong></td><td>Gói tin đi tới IP đích sẽ được <strong>định tuyến</strong> tới đâu?</td><td>VM, IP nguồn, IP đích → next hop type, next hop IP, route table ID</td></tr>
    <tr><td><strong>Effective security rules</strong></td><td>Tập rule NSG <strong>thực sự áp dụng</strong> cho một NIC</td><td>Rule từ NSG của NIC, NSG của subnet, và tổng hợp</td></tr>
    <tr><td><strong>Connection troubleshoot</strong></td><td>Có kết nối được từ nguồn tới đích <strong>ngay lúc này</strong> không? Bị chặn ở hop nào?</td><td>Nguồn: VM, VMSS, Application Gateway, Bastion. Đích: VM, FQDN, URI, IPv4. Kết quả: reachable/unreachable, độ trễ, từng hop, lý do (NSG, UDR…)</td></tr>
    <tr><td><strong>Packet capture</strong></td><td>Nội dung gói tin thực tế ra vào VM</td><td>Lọc theo 5-tuple; lưu vào storage account (blob) hoặc đĩa local dạng .cap</td></tr>
    <tr><td><strong>VPN troubleshoot</strong></td><td>VPN gateway hoặc connection có vấn đề gì?</td><td>Kết quả tóm tắt + log chi tiết lưu vào storage account</td></tr>
  </tbody>
</table>

<h4>Lệnh tiêu biểu</h4>
<pre><code># IP flow verify: VM1 có nhận được SSH từ 203.0.113.10 không?
az network watcher test-ip-flow -g rg1 --vm vm1 --direction Inbound --protocol TCP \\
  --local 10.0.0.4:22 --remote 203.0.113.10:60000

# Next hop
az network watcher show-next-hop -g rg1 --vm vm1 --source-ip 10.0.0.4 --dest-ip 10.1.0.5

# Effective security rules của NIC
az network nic list-effective-nsg -g rg1 -n vm1-nic

# Connection troubleshoot
az network watcher test-connectivity -g rg1 --source-resource vm1 \\
  --dest-address www.contoso.com --dest-port 443

# Packet capture
az network watcher packet-capture create -g rg1 --vm vm1 -n cap1 \\
  --storage-account stcap01 --time-limit 600

# VPN troubleshoot
az network watcher troubleshooting start -g rg1 --resource vpngw1 \\
  --resource-type vnetGateway --storage-account stlogs01 \\
  --storage-path https://stlogs01.blob.core.windows.net/vpnlogs</code></pre>
<pre><code># PowerShell tương ứng
Test-AzNetworkWatcherIPFlow ...
Get-AzNetworkWatcherNextHop ...
Get-AzEffectiveNetworkSecurityGroup -NetworkInterfaceName vm1-nic -ResourceGroupName rg1
Test-AzNetworkWatcherConnectivity ...
New-AzNetworkWatcherPacketCapture ...
Start-AzNetworkWatcherResourceTroubleshooting ...</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: IP flow verify, Next hop và Connection troubleshoot</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở Network Watcher; các công cụ nằm trong nhóm chẩn đoán ở menu trái:<br><span class="path">Azure portal › Network Watcher › Network diagnostic tools</span></li>
    <li><strong>IP flow verify</strong>: VM có được phép gửi TCP tới 10.10.10.10:80 không? (VM phải đang chạy mới chọn được)
      <div class="blade">
        <div class="blade-title">Network Watcher | IP flow verify</div>
        <div class="blade-sec">Target resource</div>
        <div class="pf"><label class="req">Virtual machine</label><span class="pv sel">vm1</span></div>
        <div class="pf"><label class="req">Network interface</label><span class="pv sel">vm1-nic</span></div>
        <div class="blade-sec">Packet details</div>
        <div class="pf"><label>Protocol</label><span class="pv radio">TCP</span></div>
        <div class="pf"><label>Direction</label><span class="pv radio">Outbound</span></div>
        <div class="pf"><label class="req">Local port</label><span class="pv">60000</span></div>
        <div class="pf"><label class="req">Remote IP address</label><span class="pv">10.10.10.10</span></div>
        <div class="pf"><label class="req">Remote port</label><span class="pv">80</span></div>
        <div class="pf"><label></label><span class="pv note">Local IP address tự điền theo NIC đã chọn</span></div>
        <div class="pbtns"><span class="pbtn primary">Verify IP flow</span></div>
      </div>
      Kết quả gồm <em>Access allowed/denied</em> và tên <strong>Security Rule</strong> quyết định (Hình 1).</li>
    <li><strong>Next hop</strong>: gói tin từ VM tới một IP đích sẽ đi đâu?
      <div class="blade">
        <div class="blade-title">Network Watcher | Next hop</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg1</span></div>
        <div class="pf"><label class="req">Virtual machine</label><span class="pv sel">vm1</span></div>
        <div class="pf"><label class="req">Network interface</label><span class="pv sel">vm1-nic</span></div>
        <div class="pf"><label class="req">Source IP address</label><span class="pv">10.0.0.4</span></div>
        <div class="pf"><label class="req">Destination IP address</label><span class="pv">13.107.21.200</span></div>
        <div class="pbtns"><span class="pbtn primary">Next hop</span></div>
      </div>
      Kết quả: <em>Next hop type</em>, <em>IP address</em> và <em>Route table ID</em> (<code>System Route</code> nếu không có UDR) (Hình 2).</li>
    <li><strong>Connection troubleshoot</strong>: kiểm tra end-to-end tới một địa chỉ, chạy kèm các bài kiểm tra khác trong một lần:
      <div class="blade">
        <div class="blade-title">Network Watcher | Connection troubleshoot</div>
        <div class="blade-sec">Source</div>
        <div class="pf"><label class="req">Source type</label><span class="pv sel">Virtual machine</span></div>
        <div class="pf"><label class="req">Virtual machine</label><span class="pv sel">vm1</span></div>
        <div class="blade-sec">Destination</div>
        <div class="pf"><label class="req">Destination type</label><span class="pv sel">Specify manually</span></div>
        <div class="pf"><label class="req">URI, FQDN, or IP address</label><span class="pv">www.contoso.com</span></div>
        <div class="blade-sec">Probe Settings</div>
        <div class="pf"><label>Preferred IP version</label><span class="pv radio">IPv4</span></div>
        <div class="pf"><label>Protocol</label><span class="pv radio">TCP</span></div>
        <div class="pf"><label class="req">Destination port</label><span class="pv">443</span></div>
        <div class="pf"><label>Source port</label><span class="pv"></span></div>
        <div class="blade-sec">Connection Diagnostic</div>
        <div class="pf"><label>Diagnostics tests</label><span class="pv chk">Connectivity, NSG diagnostic, Next hop, Port scanner</span></div>
        <div class="pbtns"><span class="pbtn primary">Run diagnostic tests</span></div>
      </div>
      Kết quả cho biết số probe thành công/thất bại, hop gây lỗi (bấm <em>See details</em>) và có thể <em>Export to CSV</em>. Nguồn là VM cần extension Network Watcher Agent (portal tự cài).</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p3m8/ip-flow-verify-deny.png" alt="Trang IP flow verify: VM myVM, giao thức TCP, hướng Outbound, remote IP 10.10.10.10 cổng 80, kết quả Access denied bởi rule DenyAllOutBound" loading="lazy"><figcaption>Hình 1. IP flow verify trả về <strong>Access denied</strong> và tên rule chặn (<code>DenyAllOutBound</code>): 10.10.10.10 không thuộc VNet nên không khớp AllowVnetOutBound. Nguồn: <a href="https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>
<figure class="fig"><img src="assets/img/p3m8/next-hop-virtual-appliance.png" alt="Trang Next hop: VM myVM, source IP 10.0.0.4, destination 13.107.21.200, kết quả Next hop type VirtualAppliance, IP 10.0.0.5 và Route table ID" loading="lazy"><figcaption>Hình 2. Next hop sau khi có UDR <code>0.0.0.0/0 → 10.0.0.5</code>: traffic ra Internet bị đẩy tới <strong>VirtualAppliance</strong>, kèm ID của route table gây ra. Nguồn: <a href="https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Packet capture chi tiết</h4>
<ul>
  <li>Cần extension <code>AzureNetworkWatcherExtension</code> trên VM hoặc VMSS.</li>
  <li><em>Time limit per session</em> mặc định <strong>18.000 giây (5 giờ)</strong>; có thể giới hạn số byte mỗi gói (ví dụ 34 byte chỉ lấy IPv4 header).</li>
  <li>Bộ lọc theo protocol (TCP/UDP/All), IP và port local/remote.</li>
  <li>Có thể kích hoạt tự động bằng <strong>alert</strong> của VM (ví dụ khi lưu lượng tăng bất thường).</li>
</ul>

<h4>Công cụ giám sát</h4>
<ul>
  <li><strong>Topology</strong>: sơ đồ tương tác các tài nguyên mạng và quan hệ giữa chúng, trải qua nhiều subscription, resource group và region.</li>
  <li><strong>Connection monitor</strong>: giám sát kết nối <strong>liên tục</strong> end-to-end (xem mục mở rộng).</li>
</ul>
<div class="callout tip"><strong>Phân biệt nhanh</strong>IP flow verify, NSG diagnostics, Effective security rules → <strong>NSG</strong>. Next hop, Effective routes → <strong>routing</strong>. Connection troubleshoot → <strong>end-to-end một lần</strong>. Connection monitor → <strong>end-to-end liên tục</strong>.</div>
`
    },
    {
      id: 'when-to-use-nw',
      unit: 'When to use Azure Network Watcher',
      title: 'Khi nào dùng công cụ nào? (dạng câu hỏi "which tool")',
      html: `
<table>
  <thead><tr><th>Bạn cần…</th><th>Công cụ</th></tr></thead>
  <tbody>
    <tr><td>Xác định NSG rule nào đang chặn traffic RDP/SSH tới VM</td><td><strong>IP flow verify</strong> (hoặc NSG diagnostics)</td></tr>
    <tr><td>Kiểm tra NSG cho Application Gateway hoặc VMSS, nguồn là service tag, và thêm rule sửa lỗi</td><td><strong>NSG diagnostics</strong></td></tr>
    <tr><td>Xem tất cả rule NSG áp dụng trên một NIC (gộp subnet + NIC)</td><td><strong>Effective security rules</strong></td></tr>
    <tr><td>Xác định traffic tới một IP có đi qua NVA/VPN gateway không, route table nào áp dụng</td><td><strong>Next hop</strong></td></tr>
    <tr><td>Kiểm tra VM có kết nối được tới <code>sql1.contoso.com:1433</code> ngay bây giờ, xem độ trễ và hop bị lỗi</td><td><strong>Connection troubleshoot</strong></td></tr>
    <tr><td>Giám sát độ trễ và tỷ lệ mất gói giữa VM Azure và máy on-premises 24/7, có cảnh báo</td><td><strong>Connection monitor</strong></td></tr>
    <tr><td>Phân tích gói tin để tìm lỗi giao thức hoặc xâm nhập</td><td><strong>Packet capture</strong></td></tr>
    <tr><td>Chẩn đoán site-to-site VPN không lên</td><td><strong>VPN troubleshoot</strong></td></tr>
    <tr><td>Vẽ sơ đồ tài nguyên mạng của VNet</td><td><strong>Topology</strong></td></tr>
    <tr><td>Ghi lại toàn bộ luồng IP (ai kết nối tới đâu, được phép/bị chặn) để kiểm toán</td><td><strong>Flow logs</strong> (VNet flow logs)</td></tr>
    <tr><td>Xem trực quan top talker, cổng mở ra Internet, luồng độc hại</td><td><strong>Traffic analytics</strong></td></tr>
    <tr><td>Xem còn bao nhiêu public IP được tạo trong region</td><td><strong>Usage + quotas</strong></td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 332" role="img" aria-label="Câu hỏi thường gặp và công cụ Network Watcher tương ứng">
  <rect class="box" x="10" y="10" width="410" height="32" rx="8"/>
  <text x="24" y="31">NSG nào đang chặn gói tin tới/từ VM?</text>
  <line class="ln" x1="420" y1="26" x2="466" y2="26" marker-end="url(#arr)"/>
  <rect class="box-x" x="470" y="10" width="240" height="32" rx="8"/>
  <text x="590" y="31" text-anchor="middle" class="t-sm t-b">IP flow verify / NSG diagnostics</text>
  <rect class="box" x="10" y="50" width="410" height="32" rx="8"/>
  <text x="24" y="71">Rule NSG nào đang hiệu lực trên một NIC?</text>
  <line class="ln" x1="420" y1="66" x2="466" y2="66" marker-end="url(#arr)"/>
  <rect class="box-x" x="470" y="50" width="240" height="32" rx="8"/>
  <text x="590" y="71" text-anchor="middle" class="t-sm t-b">Effective security rules</text>
  <rect class="box" x="10" y="90" width="410" height="32" rx="8"/>
  <text x="24" y="111">Gói tin tới IP X đi qua đâu (UDR, NVA, gateway)?</text>
  <line class="ln" x1="420" y1="106" x2="466" y2="106" marker-end="url(#arr)"/>
  <rect class="box-e" x="470" y="90" width="240" height="32" rx="8"/>
  <text x="590" y="111" text-anchor="middle" class="t-sm t-b">Next hop</text>
  <rect class="box" x="10" y="130" width="410" height="32" rx="8"/>
  <text x="24" y="151">Kết nối tới đích được không, hỏng ở hop nào?</text>
  <line class="ln" x1="420" y1="146" x2="466" y2="146" marker-end="url(#arr)"/>
  <rect class="box-s" x="470" y="130" width="240" height="32" rx="8"/>
  <text x="590" y="151" text-anchor="middle" class="t-sm t-b">Connection troubleshoot</text>
  <rect class="box" x="10" y="170" width="410" height="32" rx="8"/>
  <text x="24" y="191">Theo dõi độ trễ, mất gói 24/7, có cảnh báo</text>
  <line class="ln" x1="420" y1="186" x2="466" y2="186" marker-end="url(#arr)"/>
  <rect class="box-s" x="470" y="170" width="240" height="32" rx="8"/>
  <text x="590" y="191" text-anchor="middle" class="t-sm t-b">Connection monitor</text>
  <rect class="box" x="10" y="210" width="410" height="32" rx="8"/>
  <text x="24" y="231">Cần xem nội dung thực của gói tin</text>
  <line class="ln" x1="420" y1="226" x2="466" y2="226" marker-end="url(#arr)"/>
  <rect class="box-w" x="470" y="210" width="240" height="32" rx="8"/>
  <text x="590" y="231" text-anchor="middle" class="t-sm t-b">Packet capture</text>
  <rect class="box" x="10" y="250" width="410" height="32" rx="8"/>
  <text x="24" y="271">Ghi lại mọi luồng IP để kiểm toán, phân tích</text>
  <line class="ln" x1="420" y1="266" x2="466" y2="266" marker-end="url(#arr)"/>
  <rect class="box-w" x="470" y="250" width="240" height="32" rx="8"/>
  <text x="590" y="271" text-anchor="middle" class="t-sm t-b">Flow logs + Traffic analytics</text>
  <rect class="box" x="10" y="290" width="410" height="32" rx="8"/>
  <text x="24" y="311">Site-to-site VPN không lên</text>
  <line class="ln" x1="420" y1="306" x2="466" y2="306" marker-end="url(#arr)"/>
  <rect class="box-a" x="470" y="290" width="240" height="32" rx="8"/>
  <text x="590" y="311" text-anchor="middle" class="t-sm t-b">VPN troubleshoot</text>
</svg>
<figcaption>Hình 1. Đọc câu hỏi, xác định nó thuộc loại nào: lọc NSG (đỏ), định tuyến (tím), kết nối tức thời hoặc liên tục (xanh lá), dữ liệu gói tin/luồng (vàng), hay VPN.</figcaption>
</figure>

<h4>Kịch bản xử lý sự cố mẫu</h4>
<p><em>VM1 (10.0.1.4) không truy cập được web server VM2 (10.0.2.5:443).</em></p>
<ol class="steps">
  <li><strong>Connection troubleshoot</strong> từ VM1 tới 10.0.2.5:443 để biết có reachable không và lỗi ở hop nào.</li>
  <li>Nếu kết quả báo bị chặn bởi NSG: dùng <strong>IP flow verify</strong> (outbound trên VM1, inbound trên VM2) để tìm tên rule; xem <strong>Effective security rules</strong> để hiểu thứ tự ưu tiên.</li>
  <li>Nếu nghi định tuyến: chạy <strong>Next hop</strong> từ VM1 tới 10.0.2.5; nếu next hop là VirtualAppliance hoặc None, kiểm tra UDR.</li>
  <li>Nếu mạng thông nhưng ứng dụng vẫn lỗi: <strong>Packet capture</strong> trên VM2 để xem TLS handshake.</li>
</ol>

<h4>Những công cụ không thuộc Network Watcher hay bị dùng làm "bẫy"</h4>
<ul>
  <li><strong>Azure Advisor</strong>: khuyến nghị tối ưu, không chẩn đoán kết nối.</li>
  <li><strong>Activity log</strong>: ai đã sửa NSG khi nào, không cho biết gói tin bị chặn.</li>
  <li><strong>Azure Monitor metrics của VM</strong>: lưu lượng mạng tổng, không chỉ ra rule.</li>
  <li><strong>Diagnostic settings của NSG</strong>: log sự kiện và bộ đếm rule, không phải flow log.</li>
</ul>
<div class="callout exam"><strong>Góc thi</strong>Cặp hay bị nhầm: <strong>IP flow verify</strong> (NSG, cho phép/chặn) với <strong>Next hop</strong> (routing). Và <strong>Connection troubleshoot</strong> (một lần, tức thời) với <strong>Connection monitor</strong> (liên tục, có lịch sử và cảnh báo). Nếu đề nói "theo thời gian", "liên tục", "cảnh báo khi độ trễ vượt ngưỡng" → Connection monitor.</div>
`
    },
    {
      id: 'connection-monitor-flow-logs',
      extra: true,
      title: 'Connection Monitor và flow logs',
      html: `
<h4>Connection Monitor</h4>
<p><strong>Connection monitor</strong> giám sát kết nối liên tục cho môi trường Azure và hybrid, đo <strong>tỷ lệ kiểm tra thất bại</strong> và <strong>round-trip time</strong> bằng TCP, HTTP hoặc ICMP, vẽ topology từng hop và gửi cảnh báo. Connection monitor (classic) và Network Performance Monitor đã ngừng; dùng Connection monitor hiện tại.</p>
<table>
  <thead><tr><th>Khái niệm</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td>Connection monitor resource</td><td>Tài nguyên theo region, tối đa 100 mỗi region mỗi subscription</td></tr>
    <tr><td>Endpoint</td><td><strong>Nguồn</strong>: Azure VM, VMSS (cần Network Watcher extension), máy on-premises đã <strong>Azure Arc</strong> + Azure Monitor Agent. <strong>Đích</strong>: VM, VMSS, URL, FQDN, IP (không cần agent)</td></tr>
    <tr><td>Test configuration</td><td>Protocol (TCP/HTTP/ICMP), port, tần suất, ngưỡng (checks failed %, RTT)</td></tr>
    <tr><td>Test group</td><td>Tập nguồn + đích + test configuration (tối đa 20 mỗi monitor)</td></tr>
    <tr><td>Test</td><td>Một tổ hợp nguồn × đích × configuration. 3 nguồn × 2 đích × 2 config = 12 test</td></tr>
  </tbody>
</table>
<ul>
  <li>Dữ liệu lưu trong <strong>Log Analytics workspace</strong> và metrics Azure Monitor: <code>ChecksFailedPercent</code>, <code>RoundTripTimeMs</code>, <code>TestResult</code>.</li>
  <li>Trạng thái test: Pass, Warning, Fail, Indeterminate, Not Running. Không đặt ngưỡng thì RTT mặc định cảnh báo ở 750 ms (TCP/ICMP) và checks failed ở 10%.</li>
  <li>Tạo <strong>metric alert</strong> trên ChecksFailedPercent hoặc RoundTripTimeMs để được báo khi kết nối xấu đi.</li>
</ul>

<h4>Flow logs: NSG flow logs và VNet flow logs</h4>
<table>
  <thead><tr><th></th><th>NSG flow logs</th><th>VNet flow logs</th></tr></thead>
  <tbody>
    <tr><td>Phạm vi bật</td><td>Từng NSG</td><td>VNet, subnet hoặc NIC</td></tr>
    <tr><td>Tình trạng</td><td><strong>Không còn cho tạo mới; retire ngày 30/09/2027</strong></td><td>Phương án thay thế được khuyến nghị</td></tr>
    <tr><td>Ghi nhận</td><td>Luồng IP qua NSG, allow/deny theo rule</td><td>Luồng IP qua VNet, gồm cả rule NSG lẫn <strong>security admin rule</strong> của Azure Virtual Network Manager, trạng thái <strong>mã hóa</strong> VNet</td></tr>
    <tr><td>Nhiều cấp NSG</td><td>Phải bật cho NSG ở cả subnet và NIC</td><td>Không cần bật nhiều cấp</td></tr>
    <tr><td>Hỗ trợ VPN gateway, ExpressRoute gateway, Application Gateway v2</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>
<p>Đặc điểm chung: hoạt động ở <strong>tầng 4</strong>, thu thập mỗi <strong>1 phút</strong>, định dạng JSON, không ảnh hưởng hiệu năng. Ghi vào <strong>storage account Standard</strong> (không hỗ trợ Premium) <strong>cùng region</strong> với NSG/VNet; có retention policy (cần general-purpose v2). Tính phí theo GB log thu thập, miễn phí 5 GB/tháng mỗi subscription; dung lượng storage tính riêng.</p>
<pre><code>az network watcher flow-log create -g rg1 -n vnet1-flowlog --location eastus \\
  --vnet vnet1 --storage-account stflow01 \\
  --traffic-analytics true --workspace law-net --interval 10</code></pre>

<h4>Traffic analytics</h4>
<ul>
  <li>Phân tích dữ liệu flow logs và hiển thị trực quan: top talker, cổng mở, luồng từ IP độc hại, phân bố theo region/VNet.</li>
  <li>Cần <strong>Log Analytics workspace</strong>; khoảng xử lý <strong>10 phút</strong> hoặc <strong>60 phút</strong>.</li>
  <li>Tính phí theo GB dữ liệu xử lý, không có free tier.</li>
</ul>
<div class="callout warn"><strong>Lưu ý triển khai</strong>Nếu không bật được flow log và gặp lỗi AuthorizationFailed, kiểm tra resource provider <strong>Microsoft.Insights</strong> đã được đăng ký cho subscription chưa. Log có thể mất khoảng 5 phút mới xuất hiện trong storage account.</div>
<div class="callout exam"><strong>Góc thi</strong>"Cần ghi lại mọi luồng traffic đi vào/ra subnet để kiểm toán" → <strong>flow logs</strong> (ngày nay chọn <strong>VNet flow logs</strong>). "Storage account cho flow log ở region khác" → <strong>không được</strong>, phải cùng region. "Cần dashboard trực quan từ flow logs" → <strong>Traffic analytics</strong> + Log Analytics workspace.</div>
`
    }
  ],
  keyFacts: [
    'Network Watcher được <strong>tự động bật theo region</strong> khi tạo/cập nhật VNet; tài nguyên <code>NetworkWatcher_&lt;region&gt;</code> trong <strong>NetworkWatcherRG</strong>, 1 instance mỗi region mỗi subscription.',
    '<strong>IP flow verify</strong>: NSG cho phép hay chặn một gói tin tới/từ VM, và tên rule quyết định.',
    '<strong>Next hop</strong>: next hop type, next hop IP và route table ID cho một cặp IP nguồn/đích.',
    '<strong>Effective security rules</strong>: tập rule NSG thực tế trên một NIC (gộp NSG subnet và NIC).',
    '<strong>Connection troubleshoot</strong> kiểm tra kết nối tại một thời điểm; <strong>Connection monitor</strong> giám sát liên tục, có metrics và cảnh báo.',
    '<strong>Packet capture</strong> cần extension <code>AzureNetworkWatcherExtension</code>; time limit mặc định 18.000 giây (5 giờ).',
    '<strong>VPN troubleshoot</strong> chẩn đoán virtual network gateway và connection; log ghi vào storage account; 1 thao tác đồng thời mỗi subscription.',
    '<strong>NSG flow logs</strong> không còn cho tạo mới và <strong>retire 30/09/2027</strong>; dùng <strong>VNet flow logs</strong>.',
    'Storage account cho flow logs phải <strong>cùng region</strong> và là <strong>Standard</strong>; flow logs miễn phí 5 GB/tháng mỗi subscription.',
    '<strong>Traffic analytics</strong> cần <strong>Log Analytics workspace</strong>, khoảng xử lý 10 hoặc 60 phút.',
    'Connection monitor: nguồn Azure cần Network Watcher extension; nguồn on-premises cần <strong>Azure Arc</strong> + Azure Monitor Agent.'
  ],
  traps: [
    'Dùng IP flow verify để chẩn đoán định tuyến. IP flow verify chỉ kiểm tra NSG; định tuyến dùng <strong>Next hop</strong>.',
    'Dùng Connection troubleshoot cho yêu cầu giám sát liên tục có cảnh báo. Phải là <strong>Connection monitor</strong>.',
    'Chọn storage account ở region khác hoặc Premium cho flow logs: không được hỗ trợ.',
    'Nghĩ Network Watcher là dịch vụ global. Nó là tài nguyên <strong>theo region</strong>, mỗi region một instance.',
    'Tạo NSG flow logs mới cho subnet. NSG flow logs không còn cho tạo mới; dùng VNet flow logs.',
    'Nhầm Activity log với flow logs: Activity log ghi thao tác quản trị, không ghi luồng traffic.',
    'Bật Traffic analytics mà không có Log Analytics workspace.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Câu hỏi</th><th>Công cụ</th></tr></thead>
  <tbody>
    <tr><td>NSG có chặn gói tin này không, rule nào?</td><td>IP flow verify / NSG diagnostics</td></tr>
    <tr><td>Rule NSG nào đang áp dụng trên NIC?</td><td>Effective security rules</td></tr>
    <tr><td>Gói tin được định tuyến đi đâu?</td><td>Next hop</td></tr>
    <tr><td>Kết nối được không, ngay bây giờ?</td><td>Connection troubleshoot</td></tr>
    <tr><td>Giám sát kết nối liên tục + cảnh báo</td><td>Connection monitor</td></tr>
    <tr><td>Xem nội dung gói tin</td><td>Packet capture (cần extension)</td></tr>
    <tr><td>VPN gateway/connection lỗi</td><td>VPN troubleshoot</td></tr>
    <tr><td>Sơ đồ mạng</td><td>Topology</td></tr>
    <tr><td>Ghi luồng IP để kiểm toán</td><td>VNet flow logs (NSG flow logs retire 30/09/2027)</td></tr>
    <tr><td>Dashboard phân tích luồng</td><td>Traffic analytics + Log Analytics</td></tr>
    <tr><td>Phạm vi</td><td>1 Network Watcher / region / subscription, NetworkWatcherRG</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Network Watcher được bật như thế nào?', back: 'Tự động cho region khi tạo/cập nhật VNet. Tài nguyên <code>NetworkWatcher_&lt;region&gt;</code> trong NetworkWatcherRG.' },
    { front: 'Công cụ nào cho biết NSG rule nào chặn một gói tin tới VM?', back: '<strong>IP flow verify</strong> (hoặc NSG diagnostics).' },
    { front: 'Công cụ nào cho biết next hop và route table áp dụng?', back: '<strong>Next hop</strong>.' },
    { front: 'Xem tổng hợp rule NSG từ subnet và NIC?', back: '<strong>Effective security rules</strong>.' },
    { front: 'NSG diagnostics khác IP flow verify thế nào?', back: 'Hỗ trợ VM, VMSS, Application Gateway; nguồn có thể là IP prefix hoặc service tag; cho phép thêm rule mới.' },
    { front: 'Connection troubleshoot khác Connection monitor?', back: 'Troubleshoot: kiểm tra <strong>một lần</strong>. Monitor: giám sát <strong>liên tục</strong>, metrics, cảnh báo.' },
    { front: 'Packet capture cần gì trên VM?', back: 'Extension <strong>AzureNetworkWatcherExtension</strong> (Network Watcher Agent).' },
    { front: 'Time limit mặc định của packet capture?', back: '<strong>18.000 giây</strong> (5 giờ).' },
    { front: 'Công cụ chẩn đoán site-to-site VPN?', back: '<strong>VPN troubleshoot</strong>; log lưu vào storage account.' },
    { front: 'NSG flow logs retire khi nào?', back: '<strong>30/09/2027</strong>; không còn cho tạo mới. Dùng VNet flow logs.' },
    { front: 'Yêu cầu storage account cho flow logs?', back: '<strong>Cùng region</strong> với NSG/VNet, tier <strong>Standard</strong>, cùng tenant Entra ID.' },
    { front: 'Traffic analytics cần gì?', back: 'Flow logs + <strong>Log Analytics workspace</strong>; xử lý mỗi 10 hoặc 60 phút.' },
    { front: 'Metrics chính của Connection monitor?', back: '<code>ChecksFailedPercent</code> và <code>RoundTripTimeMs</code> (cùng <code>TestResult</code>).' },
    { front: 'Nguồn on-premises trong Connection monitor cần gì?', back: '<strong>Azure Arc</strong> agent và <strong>Azure Monitor Agent</strong>.' },
    { front: 'Số Network Watcher tối đa mỗi region mỗi subscription?', back: '<strong>1</strong>.' },
    { front: 'VNet flow logs ghi được gì mà NSG flow logs không?', back: 'Security admin rule của AVNM, trạng thái mã hóa VNet, traffic qua VPN/ExpressRoute gateway, Application Gateway v2.' }
  ],
  quiz: [
    {
      q: 'Người dùng không RDP được vào VM1. Bạn cần xác định NSG rule nào đang chặn kết nối TCP 3389 từ IP 203.0.113.50 với ít công sức nhất. Bạn dùng công cụ nào?',
      options: ['Next hop', 'IP flow verify', 'Packet capture', 'VPN troubleshoot'],
      answer: [1],
      explain: 'IP flow verify trả về Allow/Deny và tên rule NSG cho một gói tin cụ thể. Next hop chỉ cho biết định tuyến. Packet capture cho thấy gói tin nhưng không chỉ ra rule. VPN troubleshoot dành cho gateway VPN.'
    },
    {
      q: 'VM1 ở Subnet1 phải đi qua firewall NVA khi truy cập 10.20.0.0/16. Bạn cần xác minh traffic từ VM1 tới 10.20.1.4 thực sự có next hop là NVA và biết route table nào đang áp dụng. Bạn dùng công cụ nào?',
      options: ['Next hop', 'Effective security rules', 'IP flow verify', 'Traffic analytics'],
      answer: [0],
      explain: 'Next hop trả về next hop type, IP và route table ID. Effective security rules và IP flow verify liên quan NSG, không phải routing. Traffic analytics phân tích flow logs theo thời gian chứ không trả lời câu hỏi định tuyến tức thì.'
    },
    {
      q: 'Bạn cần giám sát liên tục độ trễ và tỷ lệ mất gói giữa một VM Azure và một máy chủ on-premises, đồng thời nhận cảnh báo khi RTT vượt 100 ms. Bạn dùng gì?',
      options: ['Connection troubleshoot', 'IP flow verify', 'Connection monitor', 'Packet capture'],
      answer: [2],
      explain: 'Connection monitor giám sát liên tục, xuất metrics RoundTripTimeMs và ChecksFailedPercent để tạo cảnh báo. Connection troubleshoot chỉ kiểm tra một lần. IP flow verify không đo độ trễ. Packet capture là phiên có giới hạn thời gian và không tạo cảnh báo RTT.'
    },
    {
      q: 'Nhóm bảo mật yêu cầu ghi lại mọi luồng IP vào và ra khỏi các subnet của VNet1 để kiểm toán. Bạn nên bật gì?',
      options: ['NSG diagnostic settings gửi tới Log Analytics', 'Activity log', 'Connection monitor', 'VNet flow logs'],
      answer: [3],
      explain: 'VNet flow logs ghi lại luồng IP (5-tuple, allow/deny, byte) qua VNet. Diagnostic settings của NSG chỉ ghi sự kiện và bộ đếm rule. Activity log ghi thao tác quản trị. Connection monitor kiểm tra kết nối giữa các endpoint chỉ định.'
    },
    {
      q: 'Bạn cấu hình VNet flow logs cho VNet ở region West Europe. Storage account nào dùng được? (Chọn 2)',
      options: ['StorageV2 Standard ở West Europe, cùng subscription', 'StorageV2 Standard ở North Europe, cùng subscription', 'Premium BlockBlobStorage ở West Europe', 'StorageV2 Standard ở West Europe, subscription khác cùng tenant Entra ID'],
      answer: [0, 3],
      explain: 'Storage account phải cùng region với VNet, là Standard, và ở cùng subscription hoặc subscription thuộc cùng tenant Entra ID. North Europe khác region; Premium không được hỗ trợ.'
    },
    {
      q: 'Kết nối site-to-site VPN giữa Azure và văn phòng bị rớt. Bạn cần chẩn đoán gateway và connection, lưu log chi tiết. Bạn dùng công cụ nào?',
      options: ['VPN troubleshoot', 'Next hop', 'Topology', 'NSG diagnostics'],
      answer: [0],
      explain: 'VPN troubleshoot kiểm tra virtual network gateway và connection, ghi log vào storage account. Next hop chỉ trả về định tuyến. Topology vẽ sơ đồ. NSG diagnostics kiểm tra rule NSG.'
    },
    {
      q: 'Bạn muốn bắt gói tin trên VM2 để phân tích lỗi TLS handshake. Điều kiện tiên quyết là gì?',
      options: ['VM2 phải có public IP', 'Cài extension Network Watcher Agent (AzureNetworkWatcherExtension) trên VM2', 'Bật NSG flow logs', 'Tạo Log Analytics workspace'],
      answer: [1],
      explain: 'Packet capture chạy qua extension Network Watcher Agent trên VM. Public IP không cần. Flow logs và Log Analytics không phải yêu cầu của packet capture; kết quả lưu ở storage account hoặc đĩa local.'
    },
    {
      q: 'Bạn cần xem toàn bộ rule bảo mật đang áp dụng lên NIC của VM3, gồm cả NSG gắn ở subnet và NSG gắn ở NIC. Bạn dùng gì?',
      options: ['Next hop', 'Connection troubleshoot', 'Effective security rules', 'Topology'],
      answer: [2],
      explain: 'Effective security rules hiển thị rule từ NSG của NIC, NSG của subnet và tập tổng hợp. Next hop là routing. Connection troubleshoot kiểm tra kết nối end-to-end. Topology chỉ vẽ sơ đồ.'
    },
    {
      q: 'Bạn cần kiểm tra ngay lập tức VM1 có kết nối được tới <code>api.contoso.com</code> cổng 443 hay không, và nếu không thì bị chặn ở hop nào. Không cần giám sát lâu dài. Bạn chọn công cụ nào?',
      options: ['Connection monitor', 'Traffic analytics', 'IP flow verify', 'Connection troubleshoot'],
      answer: [3],
      explain: 'Connection troubleshoot kiểm tra kết nối tại một thời điểm tới FQDN/URI/IP và cho biết hop lỗi. Connection monitor dành cho giám sát liên tục. Traffic analytics phân tích log lịch sử. IP flow verify chỉ đánh giá NSG, không kiểm tra đích FQDN.'
    },
    {
      q: 'Subscription của bạn đã opt-out khỏi việc tự động bật Network Watcher. Bạn tạo VNet và VM ở region Japan East, nhưng không chạy được IP flow verify cho VM này. Bạn cần làm gì?',
      options: ['Bật Network Watcher cho region Japan East', 'Di chuyển VM sang region có Network Watcher', 'Tạo Network Watcher ở region East US', 'Cài Azure Monitor Agent trên VM'],
      answer: [0],
      explain: 'Network Watcher là tài nguyên theo region; khi đã opt-out phải bật thủ công cho region chứa tài nguyên. Network Watcher ở region khác không phục vụ Japan East. Không cần di chuyển VM. IP flow verify không cần Azure Monitor Agent.'
    },
    {
      q: 'Bạn bật VNet flow logs và muốn có dashboard trực quan về top talker, cổng mở ra Internet và luồng từ IP độc hại. Bạn cần thêm gì? (Chọn 2)',
      options: ['Traffic analytics', 'Log Analytics workspace', 'Packet capture liên tục', 'Azure Advisor'],
      answer: [0, 1],
      explain: 'Traffic analytics xử lý flow logs và hiển thị trực quan; nó yêu cầu Log Analytics workspace. Packet capture không tạo dashboard tổng hợp. Azure Advisor đưa khuyến nghị, không phân tích luồng mạng.'
    },
    {
      q: 'Bạn cần kiểm tra NSG cho một Application Gateway v2 với nguồn là service tag Internet, và tạo nhanh rule mới để sửa lỗi ngay trong công cụ. Bạn dùng công cụ nào?',
      options: ['IP flow verify', 'Effective security rules', 'NSG diagnostics', 'VPN troubleshoot'],
      answer: [2],
      explain: 'NSG diagnostics hỗ trợ VM, VMSS, Application Gateway, nguồn là IP, prefix hoặc service tag, và cho phép thêm rule mới. IP flow verify chỉ cho VM và địa chỉ IP. Effective security rules chỉ xem rule trên NIC. VPN troubleshoot không liên quan.'
    },
    {
      q: 'Một kỹ sư đề xuất tạo NSG flow logs mới cho NSG1. Phát biểu nào là ĐÚNG?',
      options: ['NSG flow logs vẫn là lựa chọn được khuyến nghị đến năm 2030', 'NSG flow logs không còn cho tạo mới và sẽ retire ngày 30/09/2027; nên dùng VNet flow logs', 'NSG flow logs chỉ hỗ trợ storage Premium', 'NSG flow logs ghi được security admin rule của AVNM'],
      answer: [1],
      explain: 'Microsoft đã ngừng cho tạo NSG flow logs mới và lên lịch retire ngày 30/09/2027, khuyến nghị chuyển sang VNet flow logs. Flow logs chỉ hỗ trợ storage Standard. Security admin rule của AVNM chỉ được ghi trong VNet flow logs.'
    },
    {
      q: 'Bạn cần biết đã dùng bao nhiêu public IP và còn bao nhiêu trước khi chạm giới hạn của subscription ở East US. Bạn xem ở đâu trong Network Watcher?',
      options: ['Topology', 'Connection monitor', 'Traffic analytics', 'Usage + quotas'],
      answer: [3],
      explain: 'Usage + quotas tóm tắt số tài nguyên mạng đã triển khai và giới hạn theo subscription và region. Topology vẽ sơ đồ, Connection monitor giám sát kết nối, Traffic analytics phân tích luồng.'
    }
  ]
});

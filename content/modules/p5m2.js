AZ.addModule({
  id: 'p5m2',
  summary: 'Module này trả lời câu hỏi: làm sao để ứng dụng chạy trên VM <strong>không bị gián đoạn</strong> khi Azure bảo trì hoặc phần cứng hỏng, và <strong>tự co giãn</strong> theo tải. Bạn sẽ học availability set (fault domain, update domain), availability zones, SLA của từng phương án, scale dọc/ngang, Virtual Machine Scale Sets (Uniform/Flexible) và autoscale. Đề AZ-104 rất hay hỏi con số FD/UD, SLA và logic đánh giá rule autoscale.',
  objectives: [
    'Phân biệt planned maintenance, unplanned hardware maintenance và unexpected downtime',
    'Cấu hình availability set và giải thích fault domain, update domain cùng các giới hạn',
    'Chọn giữa availability set, availability zones và scale set dựa trên yêu cầu SLA',
    'So sánh vertical scaling và horizontal scaling',
    'Tạo Virtual Machine Scale Sets, chọn orchestration mode và upgrade policy',
    'Cấu hình autoscale: profile, rule, cooldown, min/max/default và hiểu logic đánh giá rule'
  ],
  sections: [
    {
      id: 'maintenance-downtime',
      unit: 'Plan for maintenance and downtime',
      title: 'Lập kế hoạch cho bảo trì và downtime',
      html: `
<p>Microsoft phân biệt ba tình huống làm VM bị ảnh hưởng:</p>
<table>
  <thead><tr><th>Tình huống</th><th>Nguyên nhân</th><th>Azure xử lý thế nào</th></tr></thead>
  <tbody>
    <tr><td><strong>Planned maintenance</strong></td><td>Microsoft cập nhật nền tảng (host OS, firmware, hypervisor) để tăng độ tin cậy, hiệu năng, bảo mật</td><td>Phần lớn dùng <strong>memory-preserving update</strong>: VM chỉ bị tạm dừng trong vài giây, không reboot. Bảo trì cần reboot được thông báo trước và có cửa sổ để bạn tự chủ động thực hiện (self-service).</td></tr>
    <tr><td><strong>Unplanned hardware maintenance</strong></td><td>Nền tảng <em>dự đoán</em> phần cứng sắp hỏng (ổ đĩa, CPU…)</td><td><strong>Live migration</strong>: di chuyển VM đang chạy sang host khỏe, VM chỉ bị tạm dừng rất ngắn. Hiệu năng có thể giảm trước/sau sự kiện.</td></tr>
    <tr><td><strong>Unexpected downtime</strong></td><td>Phần cứng hoặc hạ tầng vật lý hỏng bất ngờ, mất điện, mất mạng</td><td><strong>Service healing</strong>: Azure tự khởi động lại VM trên host khỏe. VM bị reboot, <strong>temp disk mất dữ liệu</strong>.</td></tr>
  </tbody>
</table>

<h4>Công cụ kiểm soát bảo trì</h4>
<ul>
  <li><strong>Scheduled Events</strong>: endpoint metadata bên trong VM (Azure Instance Metadata Service) báo trước các sự kiện như Freeze, Reboot, Redeploy, Preempt (Spot), Terminate để ứng dụng tự drain kết nối, lưu trạng thái.</li>
  <li><strong>Maintenance Configurations</strong>: kiểm soát thời điểm áp dụng bản cập nhật nền tảng cho Dedicated Host hoặc isolated VM, và lên lịch guest patching (qua Azure Update Manager).</li>
  <li><strong>Azure Service Health</strong> / Resource Health: thông báo bảo trì và sự cố ảnh hưởng tới tài nguyên của bạn.</li>
</ul>

<h4>Các nguyên tắc thiết kế</h4>
<ol>
  <li>Chạy <strong>ít nhất 2 VM</strong> cho mỗi tầng ứng dụng, trong availability set hoặc qua nhiều availability zone.</li>
  <li>Mỗi tầng (web, app, data) dùng <strong>availability set/zone riêng</strong>, tránh việc cả hai VM của cùng tầng bị bảo trì cùng lúc.</li>
  <li>Đặt <strong>load balancer</strong> phía trước để chuyển traffic khi một VM gián đoạn.</li>
  <li>Dùng <strong>managed disks</strong> để disk được phân bố theo fault domain.</li>
  <li>Chuẩn bị DR khác region bằng <strong>Azure Site Recovery</strong> nếu yêu cầu chịu được mất cả region.</li>
</ol>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi "ứng dụng phải chạy khi Microsoft bảo trì hạ tầng" → cần <strong>2+ VM</strong> trong availability set (khác update domain) hoặc nhiều zone. Một VM đơn lẻ không bao giờ đảm bảo không downtime khi bảo trì có reboot.</div>
`
    },
    {
      id: 'availability-sets',
      unit: 'Create availability sets',
      title: 'Availability set',
      html: `
<p><strong>Availability set</strong> là nhóm logic các VM được Azure đặt trên <strong>nhiều rack (fault domain)</strong> và <strong>nhiều nhóm cập nhật (update domain)</strong> trong <strong>một datacenter</strong>. Bản thân availability set <strong>miễn phí</strong>; bạn chỉ trả tiền VM.</p>

<h4>Đặc điểm quan trọng</h4>
<ul>
  <li>VM chỉ được đưa vào availability set <strong>lúc tạo</strong>. Không thể thêm VM có sẵn, cũng không chuyển VM sang availability set khác. Muốn đổi: xóa VM (giữ disk) và tạo lại VM từ disk vào set mới.</li>
  <li>Availability set phải nằm <strong>cùng region và cùng resource group</strong> với VM.</li>
  <li>Một VM chỉ thuộc <strong>một</strong> availability set, và không thể vừa ở availability set vừa chỉ định availability zone.</li>
  <li>Tối đa <strong>200 VM</strong> trong một availability set.</li>
  <li>Dùng managed disks → chọn loại <strong>Aligned</strong> (sku <code>Aligned</code>) để storage fault domain khớp compute fault domain.</li>
  <li>Không hỗ trợ <strong>Ultra Disk</strong>.</li>
  <li>Có thể kết hợp <strong>proximity placement group</strong> để giảm độ trễ giữa các VM.</li>
</ul>

<h4>Tạo availability set</h4>
<pre><code># Azure CLI
az vm availability-set create -g rg-app -n avset-web \\
  --platform-fault-domain-count 2 --platform-update-domain-count 5

az vm create -g rg-app -n vm-web01 --image Win2022Datacenter \\
  --availability-set avset-web --size Standard_D2s_v5 --admin-username azadmin

# PowerShell
New-AzAvailabilitySet -ResourceGroupName rg-app -Name avset-web -Location eastus \\
  -PlatformFaultDomainCount 2 -PlatformUpdateDomainCount 5 -Sku Aligned</code></pre>

<h4>Tình huống mẫu</h4>
<p>Ứng dụng 3 tầng: tạo <code>avset-web</code> (2 VM web), <code>avset-app</code> (2 VM app), <code>avset-sql</code> (2 VM SQL Always On). Mỗi tầng có load balancer riêng. Khi Azure bảo trì một update domain, mỗi tầng vẫn còn ít nhất một VM hoạt động.</p>

<div class="callout warn"><strong>Lưu ý</strong>Resize VM trong availability set sang size không có trên cluster hiện tại thì phải <strong>deallocate tất cả VM</strong> trong set. Hãy chọn họ size phù hợp ngay từ đầu.</div>

<div class="callout exam"><strong>Bẫy thi</strong>Đề hay cho tình huống "VM đã chạy, cần thêm vào availability set": đáp án là <strong>tạo lại VM</strong> (redeploy, resize hay move đều không được). Availability set bảo vệ trong <strong>một datacenter</strong>, không bảo vệ khi mất cả datacenter.</div>
`
    },
    {
      id: 'update-fault-domains',
      unit: 'Review update domains and fault domains',
      title: 'Update domain và fault domain',
      html: `
<div class="compare">
  <div><strong>Fault domain (FD)</strong>Nhóm phần cứng dùng chung <strong>nguồn điện và switch mạng</strong> (tương đương một rack). Bảo vệ khỏi <strong>lỗi phần cứng</strong>. Tối đa <strong>3 FD</strong> (tùy region, một số region chỉ có 2). Portal mặc định 2.</div>
  <div><strong>Update domain (UD)</strong>Nhóm VM và phần cứng có thể được <strong>bảo trì/reboot cùng lúc</strong>. Azure bảo trì từng UD một, chờ UD trước hồi phục mới tới UD sau. Mặc định <strong>5 UD</strong>, cấu hình tối đa <strong>20 UD</strong>.</div>
</div>

<h4>Cách Azure phân bố VM</h4>
<p>VM được gán lần lượt vòng tròn (round-robin) vào các FD và UD. Ví dụ availability set có 2 FD, 5 UD và 7 VM:</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 335" role="img" aria-label="Lưới 2 fault domain nhân 5 update domain với 7 VM được phân bố vòng tròn">
  <rect class="box-w" x="15" y="55" width="690" height="46" rx="8"/>
  <rect class="box" x="15" y="109" width="690" height="46" rx="8"/>
  <rect class="box" x="15" y="163" width="690" height="46" rx="8"/>
  <rect class="box" x="15" y="217" width="690" height="46" rx="8"/>
  <rect class="box" x="15" y="271" width="690" height="46" rx="8"/>
  <text x="60" y="83" text-anchor="middle" class="t-b t-w">UD0</text>
  <text x="60" y="137" text-anchor="middle" class="t-b">UD1</text>
  <text x="60" y="191" text-anchor="middle" class="t-b">UD2</text>
  <text x="60" y="245" text-anchor="middle" class="t-b">UD3</text>
  <text x="60" y="299" text-anchor="middle" class="t-b">UD4</text>

  <rect class="zone" x="110" y="15" width="270" height="312" rx="10"/>
  <text x="245" y="40" text-anchor="middle" class="t-b">FD0 · rack 1</text>
  <rect class="zone" x="420" y="15" width="270" height="312" rx="10"/>
  <text x="555" y="40" text-anchor="middle" class="t-b">FD1 · rack 2</text>

  <rect class="box-a" x="195" y="62" width="100" height="32" rx="6"/>
  <text x="245" y="83" text-anchor="middle" class="t-b t-a">VM1</text>
  <rect class="box-a" x="505" y="62" width="100" height="32" rx="6"/>
  <text x="555" y="83" text-anchor="middle" class="t-b t-a">VM6</text>
  <rect class="box-a" x="195" y="116" width="100" height="32" rx="6"/>
  <text x="245" y="137" text-anchor="middle" class="t-b t-a">VM7</text>
  <rect class="box-a" x="505" y="116" width="100" height="32" rx="6"/>
  <text x="555" y="137" text-anchor="middle" class="t-b t-a">VM2</text>
  <rect class="box-a" x="195" y="170" width="100" height="32" rx="6"/>
  <text x="245" y="191" text-anchor="middle" class="t-b t-a">VM3</text>
  <rect class="box-a" x="505" y="224" width="100" height="32" rx="6"/>
  <text x="555" y="245" text-anchor="middle" class="t-b t-a">VM4</text>
  <rect class="box-a" x="195" y="278" width="100" height="32" rx="6"/>
  <text x="245" y="299" text-anchor="middle" class="t-b t-a">VM5</text>
</svg>
<figcaption>Hình 1. Availability set 2 FD × 5 UD với 7 VM. Cột dọc là <strong>fault domain</strong> (rack dùng chung nguồn điện và switch), hàng ngang là <strong>update domain</strong>. VM6 và VM7 quay vòng về UD0 và UD1. Khi Azure bảo trì UD0 (tô vàng), chỉ VM1 và VM6 khởi động lại; khi rack 1 hỏng, mất VM1, VM3, VM5, VM7 nhưng FD1 vẫn chạy.</figcaption>
</figure>
<ul>
  <li>Với 5 UD, VM thứ 6 được đặt cùng UD với VM thứ 1, VM thứ 7 cùng UD với VM thứ 2…</li>
  <li>Khi bảo trì một UD, chỉ các VM trong UD đó bị ảnh hưởng.</li>
  <li>Khi hỏng một FD (rack), chỉ các VM trong FD đó bị ảnh hưởng.</li>
</ul>

<h4>Tính toán hay gặp trong đề</h4>
<table>
  <thead><tr><th>Câu hỏi</th><th>Cách tính</th></tr></thead>
  <tbody>
    <tr><td>Availability set 10 VM, 20 UD: tối đa bao nhiêu VM bị ảnh hưởng khi bảo trì?</td><td>Mỗi UD có tối đa 1 VM → <strong>1 VM</strong></td></tr>
    <tr><td>Availability set 10 VM, 5 UD: tối đa bao nhiêu VM bị ảnh hưởng khi bảo trì?</td><td>10 / 5 = <strong>2 VM</strong> mỗi UD</td></tr>
    <tr><td>Availability set 10 VM, 2 FD: tối đa bao nhiêu VM bị ảnh hưởng khi một rack hỏng?</td><td>10 / 2 = <strong>5 VM</strong></td></tr>
    <tr><td>Cần đảm bảo tối thiểu bao nhiêu VM chạy trong khi bảo trì, với 6 VM và 3 UD?</td><td>6 − 6/3 = <strong>4 VM</strong></td></tr>
  </tbody>
</table>

<h4>So với Virtual Machine Scale Sets</h4>
<ul>
  <li>Scale set <strong>Uniform</strong>: có 5 update domain cố định.</li>
  <li>Scale set <strong>Flexible</strong>: không có update domain; bảo trì được thực hiện lần lượt theo từng fault domain.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Ghi nhớ bộ số: <strong>FD tối đa 3</strong>, <strong>UD mặc định 5, tối đa 20</strong>. Nếu đề hỏi "giảm số VM bị reboot cùng lúc khi bảo trì" → tăng <strong>update domain</strong>, không phải fault domain.</div>
`
    },
    {
      id: 'availability-zones',
      unit: 'Review availability zones',
      title: 'Availability zones',
      html: `
<p><strong>Availability zone</strong> là vị trí vật lý tách biệt trong một region, gồm một hoặc nhiều datacenter có <strong>nguồn điện, làm mát và mạng độc lập</strong>. Region hỗ trợ zone có <strong>tối thiểu 3 zone</strong>, kết nối với nhau bằng mạng độ trễ thấp.</p>

<h4>Hai kiểu dịch vụ theo zone</h4>
<div class="compare">
  <div><strong>Zonal</strong>Tài nguyên gắn cố định vào một zone bạn chỉ định (VM, managed disk, public IP zonal). Muốn HA phải tự triển khai nhiều bản sao ở nhiều zone.</div>
  <div><strong>Zone-redundant</strong>Nền tảng tự nhân bản qua nhiều zone (ZRS storage, Standard Load Balancer zone-redundant, public IP Standard zone-redundant, VPN Gateway AZ SKU…).</div>
</div>

<h4>Thiết kế VM đa zone</h4>
<ol class="steps">
  <li>Tạo VM1 ở zone 1, VM2 ở zone 2, (VM3 ở zone 3).</li>
  <li>Dùng <strong>Standard SKU</strong> Load Balancer với frontend <strong>zone-redundant</strong> (Basic SKU không hỗ trợ zone).</li>
  <li>Public IP dùng <strong>Standard SKU</strong>, zone-redundant.</li>
  <li>Dữ liệu dùng dịch vụ zone-redundant (ZRS, SQL zone-redundant…) hoặc replication ở tầng ứng dụng.</li>
</ol>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="Ba VM zonal ở ba availability zone sau một Standard Load Balancer zone-redundant">
  <rect class="box-a" x="230" y="15" width="260" height="50" rx="10"/>
  <text x="360" y="36" text-anchor="middle" class="t-b t-a">Standard Load Balancer</text>
  <text x="360" y="54" text-anchor="middle" class="t-sm t-mute">frontend zone-redundant</text>

  <rect class="zone" x="10" y="85" width="700" height="205" rx="12"/>
  <text x="22" y="281" class="t-sm t-mute">Region có zone (ví dụ Southeast Asia)</text>

  <rect class="box" x="30" y="115" width="210" height="130" rx="10"/>
  <text x="135" y="140" text-anchor="middle" class="t-b">Zone 1</text>
  <text x="135" y="158" text-anchor="middle" class="t-sm t-mute">điện, làm mát, mạng riêng</text>
  <rect class="box-a" x="75" y="175" width="120" height="50" rx="8"/>
  <text x="135" y="197" text-anchor="middle" class="t-b">vm-web1</text>
  <text x="135" y="214" text-anchor="middle" class="t-sm t-mute">zonal VM</text>

  <rect class="box" x="255" y="115" width="210" height="130" rx="10"/>
  <text x="360" y="140" text-anchor="middle" class="t-b">Zone 2</text>
  <text x="360" y="158" text-anchor="middle" class="t-sm t-mute">điện, làm mát, mạng riêng</text>
  <rect class="box-a" x="300" y="175" width="120" height="50" rx="8"/>
  <text x="360" y="197" text-anchor="middle" class="t-b">vm-web2</text>
  <text x="360" y="214" text-anchor="middle" class="t-sm t-mute">zonal VM</text>

  <rect class="box" x="480" y="115" width="210" height="130" rx="10"/>
  <text x="585" y="140" text-anchor="middle" class="t-b">Zone 3</text>
  <text x="585" y="158" text-anchor="middle" class="t-sm t-mute">điện, làm mát, mạng riêng</text>
  <rect class="box-a" x="525" y="175" width="120" height="50" rx="8"/>
  <text x="585" y="197" text-anchor="middle" class="t-b">vm-web3</text>
  <text x="585" y="214" text-anchor="middle" class="t-sm t-mute">zonal VM</text>

  <rect class="box-s" x="470" y="257" width="225" height="26" rx="6"/>
  <text x="582" y="275" text-anchor="middle" class="t-sm t-b t-s">SLA 99.99% (≥ 2 VM, ≥ 2 zone)</text>

  <line class="ln-a" x1="300" y1="65" x2="137" y2="113" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="360" y1="65" x2="360" y2="113" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="420" y1="65" x2="583" y2="113" marker-end="url(#arr-a)"/>
</svg>
<figcaption>Hình 1. Mỗi VM là tài nguyên <strong>zonal</strong> (gắn cố định vào một zone), còn Load Balancer Standard và public IP Standard là <strong>zone-redundant</strong>. Mất trọn một zone, hai VM còn lại vẫn nhận traffic. Availability set chỉ trải VM qua các rack trong <em>một</em> datacenter nên SLA là 99.95%.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo 3 VM trải trên 3 availability zone</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang tạo VM:<br><span class="path">Azure portal › Virtual machines › + Create › Virtual machine</span></li>
    <li>Trên tab <strong>Basics</strong>, chọn region có zone và chọn nhiều zone cùng lúc:
      <div class="blade">
        <div class="blade-title">Create a virtual machine</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Disks</span><span>Networking</span><span>Management</span><span>Monitoring</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Virtual machine name</label><span class="pv">vm-web</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pf"><label>Availability options</label><span class="pv sel">Availability zone</span></div>
        <div class="pf"><label class="req">Availability zone</label><span class="pv sel">Zones 1, 2, 3</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn 3 zone thì portal tạo 3 VM: vm-web-1, vm-web-2, vm-web-3 (sửa tên được)</span></div>
        <div class="pf"><label class="req">Image</label><span class="pv sel">Ubuntu Server 24.04 LTS - x64 Gen2</span></div>
        <div class="pf"><label class="req">Size</label><span class="pv sel">Standard_D2s_v5 - 2 vcpus, 8 GiB memory</span></div>
      </div>
    </li>
    <li>Danh sách <strong>Availability options</strong> có: <em>No infrastructure redundancy required</em>, <em>Availability zone</em>, <em>Virtual machine scale set</em>, <em>Availability set</em>. Chỉ chọn được một, và chỉ chọn được lúc tạo.</li>
    <li>Sang tab <strong>Networking</strong>, mục <em>Load balancing</em>, tạo luôn load balancer cho 3 VM:
      <div class="blade">
        <div class="blade-title">Create a virtual machine</div>
        <div class="blade-tabs"><span>Basics</span><span>Disks</span><span class="on">Networking</span><span>Management</span><span>Monitoring</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Load balancing</div>
        <div class="pf"><label>Load balancing options</label><span class="pv radio">Azure load balancer</span></div>
        <div class="pf"><label>Select a load balancer</label><span class="pv sel">Create a load balancer</span></div>
        <div class="pf"><label class="req">Load balancer name</label><span class="pv">lb-web</span></div>
        <div class="pf"><label>Type</label><span class="pv radio">Public</span></div>
        <div class="pf"><label>Protocol</label><span class="pv radio">TCP</span></div>
        <div class="pf"><label>Port / Backend port</label><span class="pv">80 / 80</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span></div>
      </div>
    </li>
    <li><strong>Review + create</strong> → <strong>Create</strong>. Với Linux dùng SSH key mới, chọn <strong>Download private key and create resource</strong>.</li>
    <li>Kiểm tra: mở từng VM, trang <strong>Overview</strong> hiển thị <em>Availability zone</em> 1, 2, 3 tương ứng.</li>
  </ol>
  </div>
</div>

<pre><code>az vm create -g rg-app -n vm-web1 --image Ubuntu2204 --zone 1 --generate-ssh-keys
az vm create -g rg-app -n vm-web2 --image Ubuntu2204 --zone 2 --generate-ssh-keys
az vm list-skus -l eastus --zone --size Standard_D2s_v5 -o table   # size có ở zone nào</code></pre>

<h4>Lưu ý thực tế</h4>
<ul>
  <li>Zone <strong>chỉ chọn được lúc tạo VM</strong>. Muốn đưa VM có sẵn vào zone phải tạo lại (hoặc dùng tính năng move VM sang zone qua Azure Site Recovery/Resource Mover).</li>
  <li>Số hiệu zone là <strong>logical</strong>: zone 1 của subscription A có thể là datacenter khác với zone 1 của subscription B.</li>
  <li>Dữ liệu truyền giữa các zone có thể phát sinh chi phí băng thông.</li>
  <li>Không phải region nào cũng có zone, và không phải size nào cũng có ở mọi zone.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Bảo vệ khỏi sự cố cả datacenter, SLA 99.99%" → <strong>availability zones</strong>. Availability set không giúp được trường hợp này. Load balancer phía trước VM đa zone phải là <strong>Standard SKU</strong>.</div>
`
    },
    {
      id: 'vertical-horizontal',
      unit: 'Compare vertical and horizontal scaling',
      title: 'Scale dọc (vertical) và scale ngang (horizontal)',
      html: `
<div class="compare">
  <div><strong>Vertical scaling (scale up / down)</strong>Tăng hoặc giảm <strong>sức mạnh của một VM</strong>: đổi size (vCPU, RAM, disk throughput). Ví dụ D2s_v5 → D8s_v5.</div>
  <div><strong>Horizontal scaling (scale out / in)</strong>Tăng hoặc giảm <strong>số lượng VM</strong> chạy cùng workload. Ví dụ 2 → 6 instance trong scale set.</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="So sánh scale up một VM lớn hơn với scale out thêm VM sau load balancer">
  <rect class="zone" x="10" y="10" width="340" height="230" rx="12"/>
  <text x="180" y="36" text-anchor="middle" class="t-b">Vertical: scale up / down</text>
  <rect class="box" x="35" y="110" width="85" height="60" rx="8"/>
  <text x="77" y="136" text-anchor="middle" class="t-b">D2s_v5</text>
  <text x="77" y="154" text-anchor="middle" class="t-sm t-mute">2 vCPU</text>
  <rect class="box-a" x="195" y="70" width="135" height="140" rx="10"/>
  <text x="262" y="132" text-anchor="middle" class="t-b t-a">D8s_v5</text>
  <text x="262" y="152" text-anchor="middle" class="t-sm t-mute">8 vCPU · 32 GiB</text>
  <line class="ln-a" x1="120" y1="140" x2="193" y2="140" marker-end="url(#arr-a)"/>
  <text x="156" y="130" text-anchor="middle" class="t-sm t-a">resize</text>
  <text x="180" y="230" text-anchor="middle" class="t-sm t-mute">1 VM mạnh hơn · thường phải restart</text>

  <rect class="zone" x="370" y="10" width="340" height="230" rx="12"/>
  <text x="540" y="36" text-anchor="middle" class="t-b">Horizontal: scale out / in</text>
  <rect class="box-a" x="470" y="55" width="140" height="40" rx="8"/>
  <text x="540" y="80" text-anchor="middle" class="t-b t-a">Load balancer</text>
  <rect class="box-s" x="388" y="140" width="62" height="46" rx="8"/>
  <text x="419" y="168" text-anchor="middle" class="t-b">VM1</text>
  <rect class="box-s" x="464" y="140" width="62" height="46" rx="8"/>
  <text x="495" y="168" text-anchor="middle" class="t-b">VM2</text>
  <rect class="box-a dash" x="540" y="140" width="62" height="46" rx="8"/>
  <text x="571" y="168" text-anchor="middle" class="t-b t-a">VM3</text>
  <rect class="box-a dash" x="616" y="140" width="62" height="46" rx="8"/>
  <text x="647" y="168" text-anchor="middle" class="t-b t-a">VM4</text>
  <line class="ln" x1="510" y1="95" x2="422" y2="138" marker-end="url(#arr)"/>
  <line class="ln" x1="530" y1="95" x2="497" y2="138" marker-end="url(#arr)"/>
  <line class="ln-a dash" x1="550" y1="95" x2="569" y2="138" marker-end="url(#arr-a)"/>
  <line class="ln-a dash" x1="570" y1="95" x2="644" y2="138" marker-end="url(#arr-a)"/>
  <text x="533" y="207" text-anchor="middle" class="t-sm t-a">2 → 4 instance (nét đứt: instance mới)</text>
  <text x="540" y="230" text-anchor="middle" class="t-sm t-mute">không downtime · ứng dụng nên stateless</text>
</svg>
<figcaption>Hình 1. Scale up thay VM bằng size lớn hơn (một máy, có giới hạn trần, thường phải restart). Scale out thêm VM giống hệt nhau sau load balancer, đây là kiểu duy nhất mà autoscale làm.</figcaption>
</figure>

<table>
  <thead><tr><th>Tiêu chí</th><th>Vertical</th><th>Horizontal</th></tr></thead>
  <tbody>
    <tr><td>Downtime</td><td>Thường cần <strong>restart</strong> VM (có thể deallocate)</td><td>Không downtime, thêm/bớt instance khi ứng dụng vẫn chạy</td></tr>
    <tr><td>Giới hạn</td><td>Bị chặn bởi size lớn nhất của họ VM và phần cứng</td><td>Gần như không giới hạn (đến giới hạn scale set, quota)</td></tr>
    <tr><td>Yêu cầu ứng dụng</td><td>Không cần thay đổi kiến trúc</td><td>Ứng dụng nên <strong>stateless</strong>, có <strong>load balancer</strong></td></tr>
    <tr><td>Tự động hóa</td><td>Thường làm thủ công hoặc qua runbook</td><td>Autoscale tích hợp sẵn (VMSS, App Service)</td></tr>
    <tr><td>Phù hợp</td><td>Database đơn instance, ứng dụng legacy khó chia</td><td>Web/API, worker xử lý hàng đợi, tải biến động</td></tr>
  </tbody>
</table>

<h4>Lệnh tham khảo</h4>
<pre><code># Vertical: đổi size VM
az vm resize -g rg-app -n vm-sql01 --size Standard_E8s_v5

# Horizontal: đổi số instance của scale set
az vmss scale -g rg-app -n vmss-web --new-capacity 6
Update-AzVmss -ResourceGroupName rg-app -VMScaleSetName vmss-web -SkuCapacity 6</code></pre>

<div class="callout tip"><strong>Tình huống</strong>Website bán hàng tăng tải gấp 5 lần vào dịp khuyến mãi, sau đó giảm lại. Giải pháp tiết kiệm nhất: <strong>horizontal scaling</strong> bằng scale set + autoscale, thay vì mua VM size lớn chạy quanh năm.</div>

<div class="callout exam"><strong>Góc thi</strong>"Scale up/down" = đổi <strong>size/tier</strong>. "Scale out/in" = đổi <strong>số instance</strong>. Đề hay đánh tráo hai cụm này. Scale up VM gần như luôn gây <strong>restart</strong>.</div>
`
    },
    {
      id: 'vmss-overview',
      unit: 'Implement Azure Virtual Machine Scale Sets',
      title: 'Virtual Machine Scale Sets (VMSS)',
      html: `
<p><strong>Virtual Machine Scale Sets</strong> cho phép tạo và quản lý một nhóm VM <strong>cân bằng tải</strong>, số lượng tăng giảm thủ công hoặc tự động theo tải hay lịch. Bản thân scale set miễn phí; bạn trả tiền VM, disk, network bên dưới.</p>

<h4>Lợi ích</h4>
<ul>
  <li>Tất cả instance tạo từ cùng một cấu hình (image, size, extension) → dễ quản lý hàng trăm VM.</li>
  <li>Tự phân bố instance qua fault domain hoặc availability zone.</li>
  <li>Tích hợp <strong>Azure Load Balancer</strong> (layer 4) hoặc <strong>Application Gateway</strong> (layer 7).</li>
  <li>Autoscale, automatic OS image upgrade, automatic instance repair, application health extension.</li>
</ul>

<h4>Orchestration mode</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>Flexible (khuyến nghị)</th><th>Uniform</th></tr></thead>
  <tbody>
    <tr><td>Loại VM</td><td>VM chuẩn (<code>Microsoft.Compute/virtualMachines</code>)</td><td>VM con của scale set, quản lý qua VMSS VM API</td></tr>
    <tr><td>Trộn size/OS, Spot + on-demand</td><td>Có</td><td>Không (instance giống hệt nhau)</td></tr>
    <tr><td>Thêm VM có sẵn vào scale set</td><td>Có</td><td>Không</td></tr>
    <tr><td>Update domain</td><td>Không có (bảo trì theo FD)</td><td>5 UD</td></tr>
    <tr><td>Azure Backup / Site Recovery cho instance</td><td>Có</td><td>Không</td></tr>
    <tr><td>Outbound mặc định</td><td>Không, phải cấu hình outbound rõ ràng (NAT Gateway, LB outbound rule…)</td><td>Có</td></tr>
  </tbody>
</table>
<p>Orchestration mode được chọn <strong>khi tạo</strong> và <strong>không đổi được</strong> sau đó.</p>

<h4>Giới hạn số instance</h4>
<ul>
  <li>Scale set hỗ trợ tối đa <strong>1.000 VM instance</strong>.</li>
  <li>Theo Microsoft Learn, scale set dùng <strong>custom image</strong> tự tạo (managed image) có giới hạn <strong>600 instance</strong>.</li>
  <li>Flexible với size không hỗ trợ memory-preserving update (G, H, L, M, N-series) và phân bố cố định nhiều FD: tối đa 200.</li>
</ul>

<h4>Upgrade policy</h4>
<table>
  <thead><tr><th>Chế độ</th><th>Hành vi khi model scale set thay đổi</th></tr></thead>
  <tbody>
    <tr><td><strong>Manual</strong></td><td>Instance hiện có không tự cập nhật; bạn tự chọn instance để upgrade (<code>az vmss update-instances</code>) hoặc reimage</td></tr>
    <tr><td><strong>Automatic</strong></td><td>Tất cả instance được cập nhật ngay, không theo thứ tự; có thể gây downtime đồng loạt</td></tr>
    <tr><td><strong>Rolling</strong></td><td>Cập nhật theo đợt (batch), có thời gian chờ giữa các đợt và kiểm tra health; an toàn nhất cho production</td></tr>
  </tbody>
</table>

<h4>Các tính năng khác</h4>
<ul>
  <li><strong>Scale-in policy</strong>: Default (cân bằng qua zone/FD rồi xóa instance có ID cao nhất), <strong>NewestVM</strong>, <strong>OldestVM</strong>.</li>
  <li><strong>Instance protection</strong>: bảo vệ instance khỏi bị xóa khi scale in hoặc khỏi các thao tác scale set.</li>
  <li><strong>Overprovisioning</strong> (chỉ Uniform): tạo dư instance rồi xóa bớt để tăng tốc triển khai.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Cập nhật image cho 50 VM trong scale set mà luôn giữ phần lớn instance phục vụ" → upgrade policy <strong>Rolling</strong>. "Đã đổi model nhưng instance chưa đổi" → policy đang là <strong>Manual</strong>, cần upgrade instance. "Cần trộn Spot và on-demand trong cùng scale set" → <strong>Flexible</strong>.</div>
`
    },
    {
      id: 'vmss-create',
      unit: 'Create Virtual Machine Scale Sets',
      title: 'Tạo Virtual Machine Scale Set',
      html: `
<h4>Các tham số khi tạo trên portal</h4>
<ol class="steps">
  <li><strong>Basics</strong>: resource group, tên, region, <strong>availability zone</strong> (1, 2, 3 hoặc không), <strong>orchestration mode</strong> (Flexible/Uniform), security type, image, size.</li>
  <li><strong>Scaling</strong>: <strong>initial instance count</strong>, scaling policy (Manual hoặc Autoscaling), scale-in policy.</li>
  <li><strong>Disks</strong>: loại OS disk, data disk, mã hóa.</li>
  <li><strong>Networking</strong>: VNet/subnet, NIC, NSG, public IP cho từng instance (thường không cần), gắn <strong>Azure Load Balancer</strong> hoặc <strong>Application Gateway</strong>.</li>
  <li><strong>Management</strong>: <strong>upgrade policy</strong>, automatic OS upgrades, boot diagnostics, managed identity.</li>
  <li><strong>Health</strong>: application health monitoring, <strong>automatic repairs</strong> (thay instance unhealthy).</li>
  <li><strong>Advanced</strong>: extensions, custom data / cloud-init, spreading algorithm (max spreading hoặc fixed spreading).</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo scale set Flexible trải 3 zone sau Azure Load Balancer</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang tạo scale set:<br><span class="path">Azure portal › Virtual Machine Scale Sets › + Create</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create a virtual machine scale set</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Spot</span><span>Disks</span><span>Networking</span><span>Management</span><span>Health</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-web</span></div>
        <div class="blade-sec">Scale set details</div>
        <div class="pf"><label class="req">Virtual machine scale set name</label><span class="pv">vmss-web</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pf"><label>Availability zone</label><span class="pv sel">Zones 1, 2, 3</span></div>
        <div class="blade-sec">Orchestration</div>
        <div class="pf"><label>Orchestration mode</label><span class="pv radio">Flexible</span></div>
        <div class="pf"><label>Security type</label><span class="pv sel">Trusted launch virtual machines</span></div>
        <div class="blade-sec">Scaling</div>
        <div class="pf"><label>Scaling mode</label><span class="pv radio">Manual</span></div>
        <div class="pf"><label class="req">Initial instance count</label><span class="pv">3</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Image</label><span class="pv sel">Ubuntu Server 24.04 LTS - x64 Gen2</span></div>
        <div class="pf"><label class="req">Size</label><span class="pv sel">Standard_D2s_v5 - 2 vcpus, 8 GiB memory</span></div>
        <div class="blade-sec">Administrator account</div>
        <div class="pf"><label>Authentication type</label><span class="pv radio">SSH public key</span></div>
        <div class="pf"><label class="req">Username</label><span class="pv">azureuser</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next : Spot &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Spot</strong> và <strong>Disks</strong>: giữ mặc định.</li>
    <li>Tab <strong>Networking</strong>: chọn VNet/subnet, rồi gắn load balancer:
      <div class="blade">
        <div class="blade-title">Create a virtual machine scale set</div>
        <div class="blade-tabs"><span>Basics</span><span>Spot</span><span>Disks</span><span class="on">Networking</span><span>Management</span><span>Health</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Virtual network configuration</div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-web</span></div>
        <div class="pf"><label></label><span class="pv note">NIC của instance dùng subnet snet-web; không cần public IP cho từng instance</span></div>
        <div class="blade-sec">Load balancing</div>
        <div class="pf"><label>Load balancing options</label><span class="pv radio">Azure load balancer</span></div>
        <div class="pf"><label class="req">Select a load balancer</label><span class="pv sel">(new) vmss-web-lb</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">&lt; Previous</span><span class="pbtn">Next : Management &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Management</strong>: chọn <strong>Upgrade policy</strong> (ví dụ <em>Rolling</em>). Tab <strong>Health</strong>: bật application health monitoring nếu muốn <em>automatic repairs</em>.</li>
    <li><strong>Review + create</strong> → <strong>Create</strong>. Sau khi xong, mở <strong>Instances</strong> của scale set để thấy 3 VM, mỗi VM ở một zone.</li>
  </ol>
  </div>
</div>

<h4>Azure CLI</h4>
<pre><code>az vmss create -g rg-web -n vmss-web \\
  --orchestration-mode Flexible \\
  --image Ubuntu2204 --vm-sku Standard_D2s_v5 \\
  --instance-count 3 --zones 1 2 3 \\
  --admin-username azureuser --generate-ssh-keys \\
  --upgrade-policy-mode Rolling \\
  --lb-sku Standard

# Cài ứng dụng bằng extension cho mọi instance
az vmss extension set -g rg-web --vmss-name vmss-web \\
  --name CustomScript --publisher Microsoft.Azure.Extensions \\
  --settings '{"commandToExecute":"apt-get update &amp;&amp; apt-get install -y nginx"}'

# Thay đổi capacity thủ công, liệt kê instance
az vmss scale -g rg-web -n vmss-web --new-capacity 5
az vmss list-instances -g rg-web -n vmss-web -o table</code></pre>

<h4>Azure PowerShell</h4>
<pre><code>$cred = Get-Credential
New-AzVmss -ResourceGroupName rg-web -VMScaleSetName vmss-web -Location eastus \\
  -OrchestrationMode Flexible -ImageName Ubuntu2204 -InstanceCount 3 \\
  -Credential $cred -VirtualNetworkName vnet-web -SubnetName snet-web \\
  -LoadBalancerName lb-web -UpgradePolicyMode Automatic</code></pre>

<h4>Kịch bản: cập nhật ứng dụng</h4>
<ol>
  <li>Tạo image mới trong <strong>Azure Compute Gallery</strong>.</li>
  <li>Cập nhật model scale set trỏ tới image version mới (<code>az vmss update --set virtualMachineProfile.storageProfile.imageReference.id=...</code>).</li>
  <li>Với Rolling: instance được thay theo đợt; với Manual: chạy <code>az vmss update-instances --instance-ids "*"</code> hoặc reimage.</li>
</ol>

<div class="callout warn"><strong>Lưu ý</strong>Scale set Flexible <strong>không có outbound Internet mặc định</strong>. Nếu instance cần tải gói (ví dụ <code>apt-get</code>) mà không có NAT Gateway, public IP hoặc outbound rule của Load Balancer, script cài đặt sẽ lỗi.</div>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi về <strong>instance count</strong> khi tạo scale set khác với <strong>min/max/default</strong> của autoscale: initial count chỉ là số instance lúc tạo; sau đó autoscale điều chỉnh trong khoảng min–max.</div>
`
    },
    {
      id: 'autoscale-concepts',
      unit: 'Implement autoscale',
      title: 'Autoscale: khái niệm và logic',
      html: `
<p><strong>Autoscale</strong> (thuộc Azure Monitor) tự động thêm/bớt instance theo <strong>metric</strong> hoặc <strong>lịch</strong>. Áp dụng cho VM Scale Sets, App Service plan, Cloud Services, API Management và một số dịch vụ khác. Autoscale chỉ làm <strong>horizontal scaling</strong>.</p>

<h4>Cấu trúc một autoscale setting</h4>
<pre class="diagram">Autoscale setting (gắn vào 1 resource: VMSS / App Service plan)
 ├── Profile "Default"      min=2  max=10  default=2
 │     ├── Rule: Percentage CPU &gt; 70% (avg 10 phút)  → +1 instance, cooldown 5 phút
 │     └── Rule: Percentage CPU &lt; 30% (avg 10 phút)  → −1 instance, cooldown 5 phút
 ├── Profile "Cuối tuần"     (recurrence: Thứ 7, CN) min=1 max=3
 └── Profile "Black Friday"  (fixed date)          min=10 max=30
Notifications: email admin, webhook</pre>

<h4>Instance limits</h4>
<ul>
  <li><strong>Minimum</strong>: số instance thấp nhất, autoscale không bao giờ scale in dưới mức này.</li>
  <li><strong>Maximum</strong>: số instance cao nhất, không scale out vượt quá.</li>
  <li><strong>Default</strong>: số instance dùng khi <strong>không đọc được metric</strong> (thiếu dữ liệu). Không phải số instance khởi đầu.</li>
</ul>

<h4>Profile</h4>
<ul>
  <li><strong>Default (regular) profile</strong>: dùng khi không có profile nào khác áp dụng.</li>
  <li><strong>Recurrence profile</strong>: lặp lại theo ngày trong tuần, giờ bắt đầu (ví dụ giờ hành chính).</li>
  <li><strong>Fixed date profile</strong>: một khoảng ngày giờ cụ thể (sự kiện, khuyến mãi).</li>
  <li>Tại một thời điểm chỉ <strong>một profile</strong> có hiệu lực. Thứ tự ưu tiên: fixed date → recurrence → default.</li>
</ul>

<h4>Logic đánh giá rule</h4>
<table>
  <thead><tr><th>Hướng</th><th>Điều kiện kích hoạt</th><th>Khi nhiều rule thỏa</th></tr></thead>
  <tbody>
    <tr><td><strong>Scale out</strong></td><td><strong>Bất kỳ</strong> rule scale-out nào thỏa (OR)</td><td>Chọn hành động cho <strong>số instance lớn nhất</strong></td></tr>
    <tr><td><strong>Scale in</strong></td><td><strong>Tất cả</strong> rule scale-in đều thỏa (AND)</td><td>Chọn hành động để lại <strong>số instance lớn nhất</strong> (an toàn nhất)</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 265" role="img" aria-label="Ngưỡng CPU quyết định scale out, giữ nguyên hoặc scale in, cùng các giới hạn min max default và cooldown">
  <text x="85" y="20" text-anchor="middle" class="t-sm t-mute">CPU trung bình 10 phút</text>
  <rect class="box-x" x="30" y="30" width="110" height="60" rx="8"/>
  <text x="85" y="65" text-anchor="middle" class="t-b t-x">&gt; 70%</text>
  <rect class="box" x="30" y="90" width="110" height="100" rx="0"/>
  <text x="85" y="145" text-anchor="middle" class="t-b">30–70%</text>
  <rect class="box-s" x="30" y="190" width="110" height="60" rx="8"/>
  <text x="85" y="225" text-anchor="middle" class="t-b t-s">&lt; 30%</text>

  <rect class="box-x" x="200" y="36" width="240" height="48" rx="8"/>
  <text x="320" y="56" text-anchor="middle" class="t-b">Scale out +1</text>
  <text x="320" y="74" text-anchor="middle" class="t-sm t-mute">chỉ cần MỘT rule thỏa (OR)</text>
  <rect class="box" x="200" y="116" width="240" height="48" rx="8"/>
  <text x="320" y="136" text-anchor="middle" class="t-b">Giữ nguyên</text>
  <text x="320" y="154" text-anchor="middle" class="t-sm t-mute">không rule nào thỏa</text>
  <rect class="box-s" x="200" y="196" width="240" height="48" rx="8"/>
  <text x="320" y="216" text-anchor="middle" class="t-b">Scale in −1</text>
  <text x="320" y="234" text-anchor="middle" class="t-sm t-mute">MỌI rule scale in thỏa (AND)</text>

  <line class="ln-x" x1="140" y1="60" x2="198" y2="60" marker-end="url(#arr-x)"/>
  <line class="ln" x1="140" y1="140" x2="198" y2="140" marker-end="url(#arr)"/>
  <line class="ln-s" x1="140" y1="220" x2="198" y2="220" marker-end="url(#arr-s)"/>

  <rect class="box-e" x="470" y="30" width="240" height="220" rx="10"/>
  <text x="486" y="56" class="t-b">Giới hạn và an toàn</text>
  <text x="486" y="84" class="t-sm">Minimum 2 ≤ số instance</text>
  <text x="486" y="102" class="t-sm">≤ Maximum 10</text>
  <text x="486" y="128" class="t-sm">Default 2: dùng khi thiếu metric</text>
  <text x="486" y="154" class="t-sm">Cooldown 5 phút giữa 2 lần scale</text>
  <text x="486" y="180" class="t-sm">Trước khi scale in: ước tính</text>
  <text x="486" y="198" class="t-sm">metric sau khi bớt instance</text>
  <text x="486" y="216" class="t-sm">để chống flapping</text>
  <line class="ln dash" x1="440" y1="140" x2="468" y2="140" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Một cặp rule CPU điển hình. Khoảng 30–70% là vùng đệm: không làm gì, nhờ vậy số instance không dao động liên tục. Mọi hành động đều bị kẹp trong khoảng Minimum–Maximum và phải chờ hết cooldown.</figcaption>
</figure>

<h4>Cooldown và chống "flapping"</h4>
<ul>
  <li><strong>Cooldown</strong>: thời gian chờ sau một lần scale trước khi được scale tiếp (mặc định portal <strong>5 phút</strong>), để metric ổn định sau khi instance mới khởi động.</li>
  <li><strong>Flapping</strong>: scale in rồi lập tức scale out lặp đi lặp lại. Trước khi scale in, autoscale <strong>ước tính metric sau khi bớt instance</strong>; nếu kết quả sẽ vượt ngưỡng scale out thì <strong>bỏ qua</strong> scale in.</li>
  <li>Ví dụ: scale out khi CPU &gt; 60%, scale in khi CPU &lt; 50%. Đang có 2 instance, CPU trung bình 45%. Bớt còn 1 instance thì CPU ước tính 90% &gt; 60% → autoscale <strong>không scale in</strong>. Hãy để <strong>khoảng cách đủ lớn</strong> giữa hai ngưỡng (ví dụ &gt;70% và &lt;30%).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Ghi nhớ: <strong>scale out = OR, scale in = AND</strong>. "Default instance count" dùng khi <strong>thiếu metric</strong>. Hai rule có ngưỡng quá gần nhau gây flapping; autoscale có cơ chế tự ngăn bằng cách bỏ qua scale in.</div>
`
    },
    {
      id: 'autoscale-configure',
      unit: 'Configure autoscale',
      title: 'Cấu hình autoscale',
      html: `
<h4>Các thành phần của một rule</h4>
<table>
  <thead><tr><th>Thuộc tính</th><th>Ý nghĩa</th><th>Ví dụ</th></tr></thead>
  <tbody>
    <tr><td>Metric source / name</td><td>Resource và metric theo dõi; có thể là metric của resource khác</td><td>Percentage CPU của VMSS; ApproximateMessageCount của Storage queue</td></tr>
    <tr><td>Time grain statistic</td><td>Cách gộp dữ liệu trong mỗi time grain (1 phút) giữa các instance</td><td>Average, Min, Max, Sum</td></tr>
    <tr><td>Duration</td><td>Cửa sổ thời gian nhìn lại để đánh giá</td><td>10 phút (mặc định portal)</td></tr>
    <tr><td>Time aggregation</td><td>Cách gộp các time grain trong duration</td><td>Average, Minimum, Maximum, Total, Last, Count</td></tr>
    <tr><td>Operator + threshold</td><td>So sánh với ngưỡng</td><td>Greater than 70</td></tr>
    <tr><td>Operation</td><td>Hành động</td><td>Increase count by 2, Increase percent by 20, Increase count to 8; Decrease…</td></tr>
    <tr><td>Cool down</td><td>Thời gian chờ trước lần scale tiếp theo</td><td>5 phút</td></tr>
  </tbody>
</table>

<h4>Metric hay dùng cho VMSS</h4>
<ul>
  <li><strong>Host metrics</strong> (không cần agent): Percentage CPU, Network In/Out Total, Disk Read/Write Bytes, Disk Read/Write Operations/Sec.</li>
  <li><strong>Guest OS metrics</strong> (memory theo performance counter, v.v.): cần cài agent (Azure Monitor Agent / diagnostics extension).</li>
  <li>Metric từ resource khác: độ dài <strong>Service Bus queue</strong>, <strong>Storage queue</strong>, Application Insights.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: custom autoscale theo CPU cho scale set</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở scale set và vào trang Scaling:<br><span class="path">Azure portal › Virtual Machine Scale Sets › vmss-web › Scaling</span></li>
    <li>Chọn <strong>Custom autoscale</strong>. Trong điều kiện mặc định (Default), chọn <strong>Scale based on a metric</strong> và đặt Instance limits:
      <div class="blade">
        <div class="blade-title">vmss-web | Scaling</div>
        <div class="blade-tabs"><span class="on">Configure</span><span>Run history</span><span>JSON</span><span>Notify</span></div>
        <div class="pf"><label>Chế độ</label><span class="pv radio">Custom autoscale</span></div>
        <div class="blade-sec">Default · Auto created default scale condition</div>
        <div class="pf"><label>Scale mode</label><span class="pv radio">Scale based on a metric</span></div>
        <div class="pf"><label>Minimum</label><span class="pv">2</span></div>
        <div class="pf"><label>Maximum</label><span class="pv">10</span></div>
        <div class="pf"><label>Default</label><span class="pv">2</span></div>
        <div class="pf"><label>Rules</label><span class="pv note">+ Add a rule</span></div>
      </div>
    </li>
    <li>Bấm <strong>Add a rule</strong>, tạo rule scale out:
      <div class="blade">
        <div class="blade-title">Scale rule</div>
        <div class="pf"><label>Metric source</label><span class="pv sel">Current resource (vmss-web)</span></div>
        <div class="blade-sec">Criteria</div>
        <div class="pf"><label class="req">Time aggregation</label><span class="pv sel">Average</span></div>
        <div class="pf"><label class="req">Metric namespace</label><span class="pv sel">Virtual Machine Host</span></div>
        <div class="pf"><label>Metric name</label><span class="pv sel">Percentage CPU</span></div>
        <div class="pf"><label class="req">Operator</label><span class="pv sel">Greater than</span></div>
        <div class="pf"><label class="req">Metric threshold to trigger scale action</label><span class="pv">70</span></div>
        <div class="pf"><label class="req">Duration (minutes)</label><span class="pv">10</span></div>
        <div class="pf"><label class="req">Time grain statistic</label><span class="pv sel">Average</span></div>
        <div class="blade-sec">Action</div>
        <div class="pf"><label class="req">Operation</label><span class="pv sel">Increase count by</span></div>
        <div class="pf"><label class="req">Cool down (minutes)</label><span class="pv">5</span></div>
        <div class="pf"><label class="req">Instance count</label><span class="pv">1</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span></div>
      </div>
    </li>
    <li><strong>Add a rule</strong> lần nữa cho scale in: Operator <em>Less than</em>, threshold <em>30</em>, Operation <em>Decrease count by</em> 1. Bấm <strong>Add</strong>.</li>
    <li>(Tùy chọn) <strong>Add a scale condition</strong> → <em>Scale to a specific instance count</em> = 6, Schedule <em>Repeat specific days</em> Thứ 2–Thứ 6, Start time 08:00 để giữ nhiều instance trong giờ làm việc.</li>
    <li>Bấm <strong>Save</strong>. Theo dõi tab <strong>Run history</strong> và trang <strong>Instances</strong> (trạng thái <em>Creating</em> khi scale out, <em>Deleting</em> khi scale in).</li>
  </ol>
  </div>
</div>

<figure class="fig"><img src="assets/img/p5m2/vmss-scale-rule.png" alt="Khung Scale rule trên portal: Metric source, Time aggregation, Metric namespace, Metric name Percentage CPU, Operator Greater than, threshold 70, Duration 10, Operation Increase percent by 20, Cool down 5" loading="lazy"><figcaption>Hình 1. Khung <em>Scale rule</em> thật trên portal. Ví dụ của Microsoft dùng <em>Increase percent by</em> 20%, hợp với scale set lớn; scale set nhỏ nên dùng <em>Increase count by</em> 1–2. Biểu đồ giữa khung hiển thị metric hiện tại so với ngưỡng (đường nét đứt). Nguồn: <a href="https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-portal" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Ví dụ bằng Azure CLI</h4>
<pre><code># Tạo autoscale setting: min 2, max 10, default 2
az monitor autoscale create -g rg-web --name as-vmss-web \\
  --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets \\
  --min-count 2 --max-count 10 --count 2

# Scale out +2 khi CPU trung bình 10 phút &gt; 70%
az monitor autoscale rule create -g rg-web --autoscale-name as-vmss-web \\
  --condition "Percentage CPU &gt; 70 avg 10m" --scale out 2 --cooldown 5

# Scale in −1 khi CPU trung bình 10 phút &lt; 30%
az monitor autoscale rule create -g rg-web --autoscale-name as-vmss-web \\
  --condition "Percentage CPU &lt; 30 avg 10m" --scale in 1 --cooldown 5

# Profile theo lịch: giờ hành chính ngày thường giữ tối thiểu 4
az monitor autoscale profile create -g rg-web --autoscale-name as-vmss-web \\
  -n business-hours --min-count 4 --max-count 10 --count 4 \\
  --recurrence week mon tue wed thu fri --start 08:00 --end 18:00 \\
  --timezone "SE Asia Standard Time"</code></pre>

<h4>Giới hạn và thực hành tốt</h4>
<ul>
  <li>Mỗi autoscale setting tối đa <strong>20 profile</strong>, mỗi profile tối đa <strong>10 rule</strong>.</li>
  <li>Luôn có <strong>cặp rule</strong> scale out và scale in; chỉ có rule scale out thì số instance chỉ tăng mà không giảm.</li>
  <li>Đặt <strong>min ≥ 2</strong> cho production để giữ HA.</li>
  <li>Cấu hình <strong>notification</strong> (email, webhook) và xem <strong>Run history</strong> trong Azure Monitor → Autoscale để chẩn đoán.</li>
  <li>Nếu scale set đã set capacity thủ công rồi bật autoscale, autoscale sẽ đưa số instance về trong khoảng min–max.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Đề hay cho bảng rule rồi hỏi "sau 30 phút có bao nhiêu instance". Cách làm: kiểm tra từng chu kỳ, áp dụng cooldown, nhớ <strong>không vượt max và không dưới min</strong>, và scale in chỉ xảy ra khi <strong>mọi</strong> rule scale in thỏa.</div>
`
    },
    {
      id: 'sla-options',
      extra: true,
      title: 'SLA theo từng phương án',
      html: `
<p>SLA của Azure VM đo <strong>kết nối tới VM (virtual machine connectivity)</strong> theo tháng. Đây là cam kết tài chính (service credit), không phải bảo đảm kỹ thuật tuyệt đối.</p>

<h4>Bảng SLA VM</h4>
<table>
  <thead><tr><th>Cấu hình</th><th>SLA</th><th>Downtime tối đa/tháng (xấp xỉ)</th></tr></thead>
  <tbody>
    <tr><td>VM đơn, mọi OS + data disk là <strong>Premium SSD, Premium SSD v2 hoặc Ultra Disk</strong></td><td><strong>99.9%</strong></td><td>≈ 43,8 phút</td></tr>
    <tr><td>VM đơn, dùng <strong>Standard SSD</strong></td><td><strong>99.5%</strong></td><td>≈ 3,65 giờ</td></tr>
    <tr><td>VM đơn, dùng <strong>Standard HDD</strong></td><td><strong>95%</strong></td><td>≈ 36,5 giờ</td></tr>
    <tr><td>≥ 2 VM trong cùng <strong>availability set</strong> (hoặc dedicated host group)</td><td><strong>99.95%</strong></td><td>≈ 21,9 phút</td></tr>
    <tr><td>≥ 2 VM trải trên ≥ 2 <strong>availability zone</strong> cùng region</td><td><strong>99.99%</strong></td><td>≈ 4,4 phút</td></tr>
    <tr><td>Scale set Flexible/Uniform trải qua FD</td><td>99.95%</td><td>—</td></tr>
    <tr><td>Scale set trải qua nhiều zone</td><td>99.99%</td><td>—</td></tr>
  </tbody>
</table>
<p>SLA VM đơn tính theo disk <strong>kém nhất</strong> đang gắn: một VM có OS disk Premium SSD nhưng data disk Standard HDD thì chỉ có SLA 95%.</p>

<h4>Composite SLA</h4>
<p>Khi ứng dụng phụ thuộc nhiều dịch vụ nối tiếp, SLA tổng = <strong>tích</strong> các SLA. Ví dụ: VM tier 99.99% × Azure SQL Database 99.99% ≈ <strong>99.98%</strong>. Thêm thành phần nối tiếp luôn làm SLA tổng <strong>giảm</strong>. Ngược lại, chạy song song (dự phòng) giúp tăng độ sẵn sàng.</p>

<h4>Chọn phương án theo yêu cầu</h4>
<table>
  <thead><tr><th>Yêu cầu</th><th>Giải pháp tối thiểu</th></tr></thead>
  <tbody>
    <tr><td>99.9%, chi phí thấp nhất</td><td>1 VM, toàn bộ disk Premium SSD</td></tr>
    <tr><td>99.95%, region không có zone</td><td>2 VM trong availability set</td></tr>
    <tr><td>99.99%, chịu được mất một datacenter</td><td>2 VM ở 2 availability zone + Standard Load Balancer</td></tr>
    <tr><td>Chịu được mất cả region</td><td>Triển khai đa region (Traffic Manager / Front Door) hoặc Azure Site Recovery</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Bẫy thi</strong>Một VM đơn <strong>không bao giờ</strong> đạt 99.95% hay 99.99%, kể cả với Ultra Disk. Availability set chỉ có SLA khi có <strong>từ 2 VM trở lên</strong>. Đổi Standard HDD sang Premium SSD là cách rẻ nhất để VM đơn có SLA 99.9%.</div>
`
    }
  ],
  keyFacts: [
    'Fault domain tối đa <strong>3</strong> (tùy region); update domain mặc định <strong>5</strong>, tối đa <strong>20</strong>.',
    'VM chỉ vào availability set <strong>lúc tạo</strong>; không thể thêm VM có sẵn. Availability set miễn phí, tối đa 200 VM.',
    'SLA: VM đơn Premium SSD/Premium SSD v2/Ultra <strong>99.9%</strong>, Standard SSD 99.5%, Standard HDD 95%; availability set <strong>99.95%</strong>; zones <strong>99.99%</strong>.',
    'Region hỗ trợ zone có tối thiểu <strong>3 availability zone</strong>; VM đa zone cần Load Balancer và public IP <strong>Standard SKU</strong>.',
    'Vertical = đổi size (scale up/down, thường restart). Horizontal = đổi số instance (scale out/in).',
    'VMSS tối đa <strong>1.000 instance</strong>; custom managed image: <strong>600</strong> (theo Learn).',
    'Orchestration mode (Flexible/Uniform) chọn lúc tạo, <strong>không đổi được</strong>. Flexible: VM chuẩn, trộn size/Spot, không có outbound mặc định.',
    'Upgrade policy: <strong>Manual</strong>, <strong>Automatic</strong>, <strong>Rolling</strong>.',
    'Autoscale: <strong>scale out khi BẤT KỲ rule thỏa</strong>, <strong>scale in khi TẤT CẢ rule thỏa</strong>.',
    'Cooldown mặc định portal <strong>5 phút</strong>; duration mặc định 10 phút. Default instance count dùng khi <strong>thiếu metric</strong>.',
    'Profile: default, recurrence, fixed date; ưu tiên fixed date → recurrence → default. Tối đa 20 profile, 10 rule/profile.'
  ],
  traps: [
    'Tăng <strong>fault domain</strong> để giảm số VM bị reboot khi bảo trì. Sai: bảo trì theo <strong>update domain</strong>.',
    'Tin rằng availability set bảo vệ khỏi mất cả datacenter. Chỉ <strong>availability zones</strong> làm được điều đó.',
    'Cho rằng một VM đơn với Ultra Disk đạt SLA 99.99%. VM đơn tối đa <strong>99.9%</strong>.',
    'Nhầm <strong>default instance count</strong> là số instance khởi đầu. Nó là số dùng khi autoscale không đọc được metric.',
    'Cho rằng scale in xảy ra khi chỉ một rule scale in thỏa. Scale in cần <strong>tất cả</strong> rule scale in thỏa.',
    'Đặt ngưỡng scale out/in quá gần nhau (ví dụ &gt;60% và &lt;50%) gây flapping; autoscale sẽ bỏ qua scale in.',
    'Đổi model scale set (image mới) nhưng instance không đổi vì upgrade policy là <strong>Manual</strong>.',
    'Nghĩ có thể đổi scale set từ Uniform sang Flexible sau khi tạo. Phải tạo scale set mới.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Fault domain</td><td>Rack (điện + mạng); tối đa 3; chống lỗi phần cứng</td></tr>
    <tr><td>Update domain</td><td>Nhóm reboot cùng lúc; mặc định 5, tối đa 20; chống bảo trì</td></tr>
    <tr><td>Availability set</td><td>Chọn lúc tạo, miễn phí, một datacenter, ≤ 200 VM, SLA 99.95%</td></tr>
    <tr><td>Availability zones</td><td>≥ 3 zone/region, chống mất datacenter, SLA 99.99%, Standard LB/IP</td></tr>
    <tr><td>VM đơn</td><td>Premium/PremV2/Ultra 99.9% · Std SSD 99.5% · Std HDD 95%</td></tr>
    <tr><td>Scale</td><td>Up/down = size · Out/in = số instance</td></tr>
    <tr><td>VMSS</td><td>≤ 1.000 instance (custom image 600); Flexible vs Uniform cố định khi tạo</td></tr>
    <tr><td>Upgrade policy</td><td>Manual · Automatic · Rolling (theo batch)</td></tr>
    <tr><td>Autoscale logic</td><td>Out = OR · In = AND · cooldown 5 phút · default count khi thiếu metric</td></tr>
    <tr><td>Profile</td><td>Fixed date &gt; Recurrence &gt; Default</td></tr>
    <tr><td>Lệnh</td><td><code>az vm availability-set create</code> · <code>az vmss create</code> · <code>az vmss scale</code> · <code>az monitor autoscale create</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Fault domain là gì? Tối đa bao nhiêu?', back: 'Nhóm phần cứng chung nguồn điện và switch mạng (một rack). Tối đa <strong>3</strong> (tùy region).' },
    { front: 'Update domain mặc định và tối đa?', back: 'Mặc định <strong>5</strong>, tối đa <strong>20</strong>.' },
    { front: 'Có thể thêm VM đang chạy vào availability set không?', back: '<strong>Không</strong>. Phải tạo lại VM (có thể giữ disk) và chọn availability set lúc tạo.' },
    { front: 'SLA của 2+ VM trong availability set?', back: '<strong>99.95%</strong>' },
    { front: 'SLA của 2+ VM trên 2+ availability zone?', back: '<strong>99.99%</strong>' },
    { front: 'SLA của VM đơn với toàn bộ disk Premium SSD?', back: '<strong>99.9%</strong> (Standard SSD 99.5%, Standard HDD 95%).' },
    { front: 'Planned maintenance thường ảnh hưởng VM thế nào?', back: 'Đa số dùng <strong>memory-preserving update</strong>: VM tạm dừng vài giây, không reboot.' },
    { front: 'Unexpected downtime được xử lý bằng gì?', back: '<strong>Service healing</strong>: Azure khởi động lại VM trên host khỏe (VM reboot, mất temp disk).' },
    { front: 'Vertical scaling và horizontal scaling?', back: 'Vertical: đổi <strong>size</strong> VM (scale up/down). Horizontal: đổi <strong>số instance</strong> (scale out/in).' },
    { front: 'Hai orchestration mode của VMSS?', back: '<strong>Flexible</strong> (VM chuẩn, trộn size/Spot, khuyến nghị) và <strong>Uniform</strong> (instance giống hệt nhau). Không đổi được sau khi tạo.' },
    { front: 'Số instance tối đa của scale set?', back: '<strong>1.000</strong>; dùng custom managed image: <strong>600</strong>.' },
    { front: 'Ba upgrade policy của VMSS?', back: '<strong>Manual</strong>, <strong>Automatic</strong>, <strong>Rolling</strong>.' },
    { front: 'Autoscale scale out khi nào? Scale in khi nào?', back: 'Scale out khi <strong>bất kỳ</strong> rule scale out thỏa. Scale in khi <strong>tất cả</strong> rule scale in thỏa.' },
    { front: 'Default instance count trong autoscale dùng khi nào?', back: 'Khi <strong>không có/không đọc được metric</strong>.' },
    { front: 'Cooldown mặc định trên portal?', back: '<strong>5 phút</strong>.' },
    { front: 'Thứ tự ưu tiên profile autoscale?', back: '<strong>Fixed date</strong> → <strong>Recurrence</strong> → <strong>Default</strong>.' },
    { front: 'VM đa zone cần SKU load balancer nào?', back: '<strong>Standard</strong> Load Balancer (và public IP Standard). Basic không hỗ trợ zone.' }
  ],
  quiz: [
    {
      q: 'Bạn có 3 VM chạy website trong region East US (có availability zones). Yêu cầu: website vẫn hoạt động nếu một datacenter bị mất điện hoàn toàn. Bạn nên làm gì?',
      options: ['Đặt 3 VM vào một availability set có 3 fault domain', 'Đổi toàn bộ disk sang Premium SSD', 'Triển khai các VM vào các availability zone khác nhau sau một Standard Load Balancer', 'Tăng update domain lên 20'],
      answer: [2],
      explain: 'Availability zones là các datacenter độc lập về điện, làm mát và mạng, nên bảo vệ khi mất cả một datacenter. Availability set chỉ phân bố trong một datacenter. Premium SSD chỉ nâng SLA VM đơn; update domain chỉ liên quan bảo trì.'
    },
    {
      q: 'Availability set AS1 được cấu hình 2 fault domain và 10 update domain, chứa 10 VM. Khi Azure thực hiện planned maintenance, tối đa bao nhiêu VM có thể bị khởi động lại cùng lúc?',
      options: ['1', '2', '5', '10'],
      answer: [0],
      explain: 'Với 10 update domain và 10 VM, mỗi UD chứa một VM; Azure bảo trì từng UD một nên tối đa 1 VM bị ảnh hưởng. Con số 5 là số VM bị ảnh hưởng khi một fault domain (rack) hỏng.'
    },
    {
      q: 'VM1 đang chạy production và không thuộc availability set nào. Bạn cần đưa VM1 vào availability set AS2. Bạn phải làm gì?',
      options: ['Dùng thao tác Move trên portal', 'Resize VM1 rồi chọn AS2', 'Redeploy VM1 vào AS2', 'Xóa VM1 (giữ disk) và tạo VM mới từ disk đó trong AS2'],
      answer: [3],
      explain: 'Availability set chỉ chọn được khi tạo VM. Cách duy nhất là tạo lại VM từ disk hiện có và chỉ định AS2. Move, resize và redeploy đều không thay đổi thành viên availability set.'
    },
    {
      q: 'Bạn chỉ có ngân sách cho một VM duy nhất nhưng cần SLA kết nối 99.9%. VM hiện dùng OS disk Standard SSD và data disk Standard HDD. Bạn nên làm gì?',
      options: ['Chuyển tất cả disk sang Premium SSD', 'Chỉ chuyển OS disk sang Premium SSD', 'Đặt VM vào một availability set', 'Đặt VM vào availability zone 1'],
      answer: [0],
      explain: 'SLA 99.9% cho VM đơn yêu cầu mọi OS và data disk là Premium SSD, Premium SSD v2 hoặc Ultra Disk. Chỉ đổi OS disk là chưa đủ. Availability set hay zone với một VM không đem lại SLA cao hơn.'
    },
    {
      q: 'Phát biểu nào về fault domain và update domain là ĐÚNG? (Chọn 2)',
      options: ['Fault domain là nhóm phần cứng dùng chung nguồn điện và switch mạng', 'Availability set hỗ trợ tối đa 20 fault domain', 'Update domain mặc định là 5 và có thể cấu hình tối đa 20', 'Update domain bảo vệ VM khỏi sự cố mất điện của rack'],
      answer: [0, 2],
      explain: 'Fault domain tương đương rack chung điện và mạng, tối đa 3. Update domain mặc định 5, tối đa 20, dùng cho bảo trì. Con số 20 thuộc về update domain chứ không phải fault domain; mất điện rack là việc của fault domain.'
    },
    {
      q: 'Một ứng dụng xử lý ảnh bị thiếu CPU vào giờ cao điểm. Ứng dụng lưu trạng thái cục bộ và không thể chạy nhiều bản song song. Bạn nên chọn cách mở rộng nào?',
      options: ['Horizontal scaling bằng VM Scale Set', 'Vertical scaling: đổi VM sang size nhiều vCPU hơn', 'Thêm VM vào availability set', 'Cấu hình autoscale theo lịch'],
      answer: [1],
      explain: 'Ứng dụng stateful, không chạy song song được thì chỉ có thể tăng sức mạnh của một VM (scale up). Scale set và autoscale là horizontal scaling, yêu cầu ứng dụng chạy nhiều instance. Availability set không tăng hiệu năng.'
    },
    {
      q: 'Bạn cần tạo một scale set có thể chứa cả VM Spot và VM on-demand với nhiều size khác nhau, đồng thời có thể bảo vệ từng VM bằng Azure Backup. Bạn chọn cấu hình nào?',
      options: ['Uniform orchestration với overprovisioning', 'Uniform orchestration với upgrade policy Rolling', 'Availability set với 3 fault domain', 'Flexible orchestration'],
      answer: [3],
      explain: 'Flexible orchestration quản lý VM chuẩn, cho phép trộn Spot/on-demand và nhiều size, hỗ trợ Azure Backup cho từng VM. Uniform yêu cầu instance giống nhau và không hỗ trợ Azure Backup cho instance. Availability set không có tính năng scale.'
    },
    {
      q: 'Bạn cập nhật model của scale set VMSS1 sang image mới. Một giờ sau, các instance hiện có vẫn chạy image cũ. Nguyên nhân có khả năng nhất là gì?',
      options: ['Upgrade policy của VMSS1 là Manual', 'Autoscale đang tắt', 'VMSS1 dùng Standard Load Balancer', 'Scale-in policy là OldestVM'],
      answer: [0],
      explain: 'Với upgrade policy Manual, instance hiện có không tự cập nhật khi model đổi; bạn phải upgrade hoặc reimage từng instance. Autoscale, load balancer và scale-in policy không quyết định việc áp model mới.'
    },
    {
      q: 'Autoscale của VMSS2 có hai rule scale out: CPU &gt; 75% (thêm 1) và độ dài queue &gt; 500 (thêm 3); và hai rule scale in: CPU &lt; 25% (bớt 1) và queue &lt; 50 (bớt 1). Hiện CPU là 20% và queue là 800. Autoscale sẽ làm gì?',
      options: ['Bớt 1 instance vì CPU &lt; 25%', 'Không làm gì vì các rule mâu thuẫn', 'Thêm 3 instance', 'Thêm 1 instance'],
      answer: [2],
      explain: 'Scale out xảy ra khi bất kỳ rule scale out nào thỏa; rule queue &gt; 500 thỏa và cho số instance lớn nhất (thêm 3). Scale in cần tất cả rule scale in thỏa, ở đây rule queue &lt; 50 không thỏa nên không scale in.'
    },
    {
      q: 'Autoscale setting có min = 2, max = 8, default = 3. Do sự cố, Azure Monitor không thu được metric CPU trong 30 phút. Số instance sẽ là bao nhiêu?',
      options: ['2', '3', '8', 'Giữ nguyên số hiện tại bất kể cấu hình'],
      answer: [1],
      explain: 'Default instance count được dùng khi autoscale không đọc được metric, nên số instance là 3. Min và max chỉ là giới hạn dưới và trên.'
    },
    {
      q: 'Bạn muốn VMSS3 luôn có ít nhất 6 instance từ 8:00 đến 18:00 các ngày thứ Hai đến thứ Sáu, ngoài giờ đó tối thiểu 2 instance, và vẫn scale theo CPU. Bạn cấu hình thế nào? (Chọn 2)',
      options: ['Default profile với min = 2 và rule CPU', 'Đặt upgrade policy là Rolling', 'Recurrence profile thứ Hai–thứ Sáu 8:00–18:00 với min = 6 và rule CPU', 'Tăng update domain lên 6'],
      answer: [0, 2],
      explain: 'Recurrence profile áp dụng theo lịch tuần với min = 6; ngoài giờ đó default profile có min = 2. Cả hai profile đều chứa rule CPU để vẫn scale theo tải. Upgrade policy và update domain không liên quan tới số instance.'
    },
    {
      q: 'Autoscale có rule scale out khi CPU &gt; 60% và scale in khi CPU &lt; 50%. Scale set đang có 2 instance, CPU trung bình 45%. Điều gì xảy ra?',
      options: ['Scale in còn 1 instance', 'Scale out lên 3 instance', 'Scale in rồi scale out liên tục', 'Không scale in vì CPU ước tính sau khi bớt instance sẽ vượt ngưỡng scale out'],
      answer: [3],
      explain: 'Trước khi scale in, autoscale ước tính metric sau khi bớt instance: 45% × 2 / 1 = 90% &gt; 60%, nên bỏ qua scale in để tránh flapping. Không có rule scale out nào thỏa nên cũng không scale out.'
    },
    {
      q: 'Bạn cần một giải pháp cho ứng dụng web có SLA 99.99% với chi phí thấp nhất trong một region có availability zones. Bạn nên triển khai gì?',
      options: ['Một VM với Ultra Disk', 'Hai VM ở hai availability zone khác nhau', 'Hai VM trong cùng availability set', 'Một VM trong zone 1 và bật Azure Backup'],
      answer: [1],
      explain: 'SLA 99.99% áp dụng cho từ 2 VM trải trên từ 2 availability zone. Availability set chỉ có 99.95%; VM đơn tối đa 99.9% dù dùng Ultra Disk; Azure Backup không ảnh hưởng SLA.'
    },
    {
      q: 'Bạn cần ứng dụng trong scale set được cập nhật image mới theo từng đợt 20% instance, chỉ tiếp tục khi các instance đợt trước healthy. Bạn chọn upgrade policy nào?',
      options: ['Manual', 'Automatic', 'Rolling', 'Không cần upgrade policy, dùng autoscale'],
      answer: [2],
      explain: 'Rolling cập nhật theo batch (có thể đặt phần trăm), có thời gian chờ và kiểm tra health giữa các batch. Automatic cập nhật mọi instance cùng lúc, Manual cần thao tác tay; autoscale không cập nhật image.'
    }
  ]
});

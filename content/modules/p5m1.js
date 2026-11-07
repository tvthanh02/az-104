AZ.addModule({
  id: 'p5m1',
  summary: 'Azure Virtual Machine (VM) là dịch vụ IaaS: bạn thuê máy ảo, tự chịu trách nhiệm hệ điều hành, bản vá và ứng dụng. Module này đi từ checklist lập kế hoạch (network, tên, region, size, giá, OS, disk), các cách tạo và kết nối VM, cho tới managed disks, mã hóa, resize/redeploy/move và backup. Đây là nhóm kiến thức chiếm tỷ trọng lớn trong domain <em>Deploy and manage Azure compute resources</em> của AZ-104.',
  objectives: [
    'Lập checklist trước khi tạo VM: VNet, quy tắc đặt tên, region, size family, mô hình giá, hệ điều hành và disk',
    'Tạo VM bằng portal, Azure CLI, PowerShell, ARM/Bicep và kết nối qua RDP, SSH, Azure Bastion hoặc JIT',
    'Phân biệt trạng thái Stopped và Stopped (deallocated), hiểu tác động lên chi phí, IP và temp disk',
    'Chọn đúng loại managed disk, thêm và mở rộng disk, chọn phương án mã hóa (SSE, encryption at host, ADE)',
    'Thực hiện resize, redeploy, di chuyển VM giữa resource group/subscription/region',
    'Giải thích các lựa chọn availability và backup cơ bản cho VM'
  ],
  sections: [
    {
      id: 'checklist',
      unit: 'Compile a checklist for creating an Azure Virtual Machine',
      title: 'Checklist trước khi tạo VM',
      html: `
<p>Tạo VM chỉ mất vài phút, nhưng nhiều quyết định <strong>không đổi được</strong> (hoặc rất khó đổi) sau khi tạo: region, VNet/subnet, availability set, tên. Vì vậy Microsoft khuyến nghị đi qua một checklist trước.</p>

<h4>1. Network</h4>
<ul>
  <li>VM luôn nằm trong một <strong>subnet của virtual network (VNet)</strong> cùng region. Lên kế hoạch dải địa chỉ (address space) trước để tránh chồng lấn với on-premises hoặc VNet khác cần peering.</li>
  <li>Muốn chuyển VM sang VNet khác: thực tế phải <strong>tạo lại VM</strong> (giữ lại disk). Chuyển sang subnet khác <em>trong cùng VNet</em> thì đổi được trên NIC.</li>
  <li>Bảo vệ bằng <strong>Network Security Group (NSG)</strong> ở mức subnet hoặc NIC. Hạn chế mở RDP 3389 / SSH 22 ra Internet.</li>
</ul>

<h4>2. Tên VM</h4>
<ul>
  <li>Tên resource: Windows tối đa <strong>15 ký tự</strong>, Linux tối đa <strong>64 ký tự</strong>. Tên VM cũng thường là computer name trong hệ điều hành.</li>
  <li>Đặt theo quy ước có ý nghĩa, ví dụ <code>vm-web-prod-eus-01</code> (loại – workload – môi trường – region – số thứ tự). Không đổi tên VM sau khi tạo được.</li>
</ul>

<h4>3. Location (region)</h4>
<p>Chọn region gần người dùng, đáp ứng yêu cầu lưu trú dữ liệu (data residency), có đủ size VM mong muốn và có hỗ trợ availability zones nếu cần. Giá VM <strong>khác nhau giữa các region</strong>.</p>

<h4>4. Size (VM series)</h4>
<table>
  <thead><tr><th>Họ (family)</th><th>Loại</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><strong>B</strong></td><td>Burstable</td><td>Tải thấp, thỉnh thoảng tăng vọt (tích lũy CPU credit): dev/test, web nhỏ</td></tr>
    <tr><td><strong>D</strong> (Dsv5, Ddsv5, Dasv5…)</td><td>General purpose</td><td>Cân bằng CPU/RAM: web, app server, database nhỏ–vừa</td></tr>
    <tr><td><strong>F</strong></td><td>Compute optimized</td><td>Tỷ lệ CPU/RAM cao: batch, web traffic vừa, network appliance</td></tr>
    <tr><td><strong>E</strong></td><td>Memory optimized</td><td>Tỷ lệ RAM/CPU cao: database quan hệ, cache, analytics in-memory</td></tr>
    <tr><td><strong>M</strong></td><td>Memory optimized (cực lớn)</td><td>SAP HANA, database rất lớn (đến hàng TB RAM)</td></tr>
    <tr><td><strong>L</strong></td><td>Storage optimized</td><td>Throughput disk/local NVMe cao: NoSQL, data warehouse, big data</td></tr>
    <tr><td><strong>N</strong> (NC, ND, NV)</td><td>GPU</td><td>Render đồ họa, AI training/inference, VDI đồ họa</td></tr>
    <tr><td><strong>H</strong></td><td>High performance compute</td><td>Mô phỏng khoa học, HPC có RDMA</td></tr>
  </tbody>
</table>
<p>Đọc tên size: <code>Standard_D4ds_v5</code> = họ D, 4 vCPU, <strong>d</strong> = có local temp disk, <strong>s</strong> = hỗ trợ Premium Storage, thế hệ v5. Chữ <strong>a</strong> = CPU AMD, <strong>p</strong> = CPU ARM.</p>
<p>Quota vCPU được tính <strong>theo region và theo family</strong> trong mỗi subscription. Hết quota thì tạo VM bị lỗi, phải gửi yêu cầu tăng quota.</p>

<h4>5. Pricing</h4>
<ul>
  <li><strong>Compute</strong> tính theo thời gian VM được cấp phát (allocated). VM <em>deallocated</em> không tính phí compute nhưng <strong>vẫn tính phí disk</strong> và static public IP.</li>
  <li><strong>Storage</strong> (managed disk) tính theo dung lượng provisioned, độc lập với VM.</li>
  <li>Các cách giảm chi phí: <strong>Reserved Instances</strong> (cam kết 1 hoặc 3 năm), <strong>Azure savings plan for compute</strong>, <strong>Azure Spot VM</strong> (giá rẻ, có thể bị thu hồi với thông báo 30 giây), <strong>Azure Hybrid Benefit</strong> (dùng lại license Windows Server/SQL Server có Software Assurance).</li>
  <li>Phí license Windows nằm trong giá compute; Linux phân phối miễn phí thì không có phí license.</li>
</ul>

<h4>6. Operating system và storage</h4>
<ul>
  <li>Chọn image từ Azure Marketplace, Azure Compute Gallery hoặc image tùy chỉnh. Chọn <strong>Generation 1/2</strong> và <strong>security type</strong> (Standard, Trusted Launch, Confidential VM).</li>
  <li>Mỗi VM có ít nhất <strong>OS disk</strong>, có thể có <strong>temp disk</strong> và nhiều <strong>data disk</strong> (số lượng tối đa tùy size). Mặc định dùng <strong>managed disks</strong>.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="Các thành phần của một Azure VM: public IP, VNet, subnet, NSG, NIC và các loại disk">
  <rect class="box" x="10" y="150" width="140" height="56" rx="10"/>
  <text x="80" y="173" text-anchor="middle" class="t-b">Public IP</text>
  <text x="80" y="191" text-anchor="middle" class="t-sm t-mute">tùy chọn</text>

  <rect class="zone" x="170" y="15" width="290" height="270" rx="12"/>
  <text x="182" y="33" class="t-sm t-mute">VNet 10.0.0.0/16</text>
  <rect class="zone" x="185" y="45" width="260" height="230" rx="10"/>
  <text x="197" y="62" class="t-sm t-mute">Subnet 10.0.1.0/24</text>

  <rect class="box-x" x="200" y="75" width="230" height="46" rx="8"/>
  <text x="315" y="94" text-anchor="middle" class="t-b">Network security group</text>
  <text x="315" y="111" text-anchor="middle" class="t-sm t-mute">gắn vào subnet và/hoặc NIC</text>

  <rect class="box-a" x="200" y="150" width="120" height="56" rx="8"/>
  <text x="260" y="173" text-anchor="middle" class="t-b t-a">NIC</text>
  <text x="260" y="191" text-anchor="middle" class="t-sm t-mute">IP 10.0.1.4</text>

  <text x="315" y="250" text-anchor="middle" class="t-sm t-mute">Đổi được subnet, không đổi VNet</text>

  <rect class="box-a" x="500" y="15" width="210" height="270" rx="12"/>
  <text x="605" y="40" text-anchor="middle" class="t-b t-a">Virtual machine</text>
  <text x="605" y="58" text-anchor="middle" class="t-sm t-mute">size Standard_D2s_v5</text>
  <rect class="box" x="512" y="75" width="186" height="50" rx="8"/>
  <text x="605" y="96" text-anchor="middle" class="t-b">OS disk</text>
  <text x="605" y="114" text-anchor="middle" class="t-sm t-mute">managed · C: hoặc /dev/sda</text>
  <rect class="box-w" x="512" y="140" width="186" height="50" rx="8"/>
  <text x="605" y="161" text-anchor="middle" class="t-b t-w">Temp disk</text>
  <text x="605" y="179" text-anchor="middle" class="t-sm t-mute">local host, mất dữ liệu</text>
  <rect class="box-s" x="512" y="205" width="186" height="50" rx="8"/>
  <text x="605" y="226" text-anchor="middle" class="t-b t-s">Data disk(s)</text>
  <text x="605" y="244" text-anchor="middle" class="t-sm t-mute">số lượng tối đa theo size</text>

  <line class="ln" x1="150" y1="178" x2="198" y2="178" marker-end="url(#arr)"/>
  <line class="ln-x dash" x1="260" y1="121" x2="260" y2="148" marker-end="url(#arr-x)"/>
  <line class="ln-a" x1="320" y1="178" x2="498" y2="178" marker-end="url(#arr-a)"/>
  <text x="400" y="170" text-anchor="middle" class="t-sm t-a">gắn NIC</text>
</svg>
<figcaption>Hình 1. VM không nằm trực tiếp trong VNet: nó kết nối qua <strong>NIC</strong>, và NIC mới thuộc một subnet. Public IP và NSG gắn vào NIC (NSG còn có thể gắn vào subnet). OS disk và data disk là managed disk bền vững; temp disk nằm trên host và mất dữ liệu khi VM chuyển host.</figcaption>
</figure>

<div class="callout exam"><strong>Góc thi</strong>"VM cần nhiều RAM cho database in-memory" → họ <strong>E</strong> (hoặc M nếu cực lớn). "Web server tải thấp, chi phí thấp nhất" → <strong>B</strong>. "Training model deep learning" → <strong>N</strong>. "Tạo VM bị lỗi do vượt quota" → tăng quota vCPU <em>cho family đó ở region đó</em>.</div>
`
    },
    {
      id: 'exercise-create-connect',
      unit: 'Exercise - Create a VM using the Azure portal',
      title: 'Thực hành: tạo VM trên portal và kết nối',
      html: `
<h4>Các bước tạo VM trên Azure portal</h4>
<ol class="steps">
  <li>Vào <strong>Virtual machines</strong> → <strong>Create</strong> → <strong>Azure virtual machine</strong>.</li>
  <li>Tab <strong>Basics</strong>: chọn subscription, resource group, tên VM, region, <strong>Availability options</strong> (No redundancy / Availability zone / Availability set / Scale set), security type, image, size.</li>
  <li><strong>Administrator account</strong>: Windows dùng username + password; Linux nên dùng <strong>SSH public key</strong> (portal có thể tạo cặp key mới và cho tải private key <code>.pem</code> một lần duy nhất).</li>
  <li><strong>Inbound port rules</strong>: chọn None hoặc mở RDP (3389) / SSH (22) / HTTP / HTTPS. Môi trường production nên chọn <strong>None</strong> và dùng Bastion.</li>
  <li>Tab <strong>Disks</strong>: loại OS disk (Premium SSD, Standard SSD…), encryption type, bật <strong>encryption at host</strong> nếu cần, thêm data disk.</li>
  <li>Tab <strong>Networking</strong>: VNet, subnet, public IP, NIC NSG, tùy chọn xóa public IP và NIC khi xóa VM, gắn load balancer.</li>
  <li>Tab <strong>Management / Monitoring / Advanced</strong>: managed identity, auto-shutdown, backup, boot diagnostics, extensions, custom data / user data.</li>
  <li><strong>Review + create</strong> → kiểm tra validation → <strong>Create</strong>. Có thể bấm <em>Download a template for automation</em> để lấy ARM template tương ứng.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo VM Windows không có public IP</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang tạo VM:<br><span class="path">Azure portal › Virtual machines › + Create › Virtual machine</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create a virtual machine</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Disks</span><span>Networking</span><span>Management</span><span>Monitoring</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-app</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Virtual machine name</label><span class="pv">vm-web01</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pf"><label>Availability options</label><span class="pv sel">No infrastructure redundancy required</span></div>
        <div class="pf"><label>Security type</label><span class="pv sel">Trusted launch virtual machines</span></div>
        <div class="pf"><label class="req">Image</label><span class="pv sel">Windows Server 2022 Datacenter: Azure Edition - x64 Gen2</span></div>
        <div class="pf"><label class="req">Size</label><span class="pv sel">Standard_D2s_v5 - 2 vcpus, 8 GiB memory</span></div>
        <div class="blade-sec">Administrator account</div>
        <div class="pf"><label class="req">Username</label><span class="pv">azureadmin</span></div>
        <div class="pf"><label class="req">Password</label><span class="pv">••••••••••••</span></div>
        <div class="pf"><label></label><span class="pv note">Tối thiểu 12 ký tự, đủ 3 trong 4 nhóm: chữ thường, chữ hoa, số, ký tự đặc biệt</span></div>
        <div class="blade-sec">Inbound port rules</div>
        <div class="pf"><label class="req">Public inbound ports</label><span class="pv radio">None</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next : Disks &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Disks</strong>: chọn loại OS disk và (nếu cần) bật encryption at host:
      <div class="blade">
        <div class="blade-title">Create a virtual machine</div>
        <div class="blade-tabs"><span>Basics</span><span class="on">Disks</span><span>Networking</span><span>Management</span><span>Monitoring</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">VM disk encryption</div>
        <div class="pf"><label>Encryption at host</label><span class="pv chk">Bật (subscription đã đăng ký feature EncryptionAtHost)</span></div>
        <div class="blade-sec">OS disk</div>
        <div class="pf"><label>OS disk type</label><span class="pv sel">Premium SSD (locally-redundant storage)</span></div>
        <div class="pf"><label>Delete with VM</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label>Key management</label><span class="pv sel">Platform-managed key</span></div>
        <div class="blade-sec">Data disks</div>
        <div class="pf"><label></label><span class="pv note">Create and attach a new disk · Attach an existing disk</span></div>
      </div>
    </li>
    <li>Tab <strong>Networking</strong>: để portal tạo VNet mới, không gán public IP (kết nối sau qua Bastion):
      <div class="blade">
        <div class="blade-title">Create a virtual machine</div>
        <div class="blade-tabs"><span>Basics</span><span>Disks</span><span class="on">Networking</span><span>Management</span><span>Monitoring</span><span>Advanced</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Network interface</div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">(new) rg-app-vnet</span></div>
        <div class="pf"><label class="req">Subnet</label><span class="pv sel">(new) default (10.0.0.0/24)</span></div>
        <div class="pf"><label>Public IP</label><span class="pv sel">None</span></div>
        <div class="pf"><label>NIC network security group</label><span class="pv radio">Basic</span></div>
        <div class="pf"><label>Public inbound ports</label><span class="pv radio">None</span></div>
        <div class="pf"><label>Delete public IP and NIC when VM is deleted</label><span class="pv chk">Bật</span></div>
        <div class="blade-sec">Load balancing</div>
        <div class="pf"><label>Load balancing options</label><span class="pv radio">None</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">&lt; Previous</span><span class="pbtn">Next : Management &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Management</strong>: trong mục <em>Auto-shutdown</em>, chọn <strong>Enable auto-shutdown</strong>, đặt <strong>Shutdown time</strong> 19:00 và <strong>Time zone</strong> (UTC+07:00) để VM tự deallocate mỗi tối.</li>
    <li>Bấm <strong>Review + create</strong>, chờ <em>Validation passed</em> rồi bấm <strong>Create</strong>. Khi deployment xong, chọn <strong>Go to resource</strong>.</li>
    <li>Kết nối: trên trang Overview của VM chọn <strong>Connect</strong>. Với VM không có public IP, dùng <strong>Bastion</strong>; với VM có public IP và mở 3389, dùng <strong>Native RDP</strong> → <strong>Download RDP file</strong>.</li>
  </ol>
  </div>
</div>

<figure class="fig"><img src="assets/img/p5m1/vm-instance-details.png" alt="Mục Instance details trên tab Basics khi tạo VM: Virtual machine name, Region, Availability options, Security type, Image và VM architecture" loading="lazy"><figcaption>Hình 1. Mục <em>Instance details</em> trên tab Basics. Availability options mặc định là <em>No infrastructure redundancy required</em>; muốn dùng zone hay availability set phải chọn ngay ở đây vì không đổi được sau khi tạo. Nguồn: <a href="https://learn.microsoft.com/en-us/azure/virtual-machines/windows/quick-create-portal" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Các cách kết nối VM</h4>
<table>
  <thead><tr><th>Phương án</th><th>Cổng / yêu cầu</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>RDP</strong> (Windows)</td><td>TCP 3389, public IP hoặc VPN/ExpressRoute</td><td>Tải file <code>.rdp</code> từ portal. Mở 3389 ra Internet là rủi ro brute-force.</td></tr>
    <tr><td><strong>SSH</strong> (Linux, cả Windows có OpenSSH)</td><td>TCP 22</td><td><code>ssh -i key.pem azureuser@&lt;ip&gt;</code>. Có thể đăng nhập bằng Microsoft Entra ID qua <code>az ssh vm</code> nếu cài extension AADSSHLoginForLinux.</td></tr>
    <tr><td><strong>Azure Bastion</strong></td><td>Subnet tên chính xác <code>AzureBastionSubnet</code>, tối thiểu <strong>/26</strong></td><td>RDP/SSH qua HTTPS 443 ngay trên portal; VM <strong>không cần public IP</strong>. SKU: Developer, Basic, Standard, Premium. Native client (<code>az network bastion rdp/ssh</code>) cần Standard trở lên.</td></tr>
    <tr><td><strong>Just-in-time (JIT) VM access</strong></td><td>Microsoft Defender for Cloud (Defender for Servers Plan 2)</td><td>Đóng cổng quản trị mặc định; khi người dùng yêu cầu, Defender tạm mở NSG rule cho IP nguồn cụ thể trong thời gian giới hạn (mặc định tối đa 3 giờ) rồi tự đóng lại.</td></tr>
    <tr><td><strong>Serial console</strong> / Run command</td><td>Boot diagnostics bật</td><td>Cứu hộ khi mất kết nối mạng hoặc cấu hình sai firewall trong OS.</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Mẹo xử lý sự cố</strong>Quên mật khẩu admin? Dùng <strong>Reset password</strong> trên portal (dựa vào VMAccess extension) thay vì tạo lại VM. RDP lỗi do cấu hình trong OS? Dùng <strong>Run command</strong> hoặc <strong>Serial console</strong>.</div>

<div class="callout exam"><strong>Góc thi</strong>Yêu cầu "kết nối RDP/SSH mà VM không có public IP, không mở cổng 3389/22 ra Internet" → <strong>Azure Bastion</strong>. Yêu cầu "chỉ mở cổng quản trị khi cần, trong thời gian giới hạn" → <strong>JIT VM access</strong>. Subnet của Bastion phải tên <code>AzureBastionSubnet</code>; đặt tên khác là triển khai thất bại.</div>
`
    },
    {
      id: 'create-manage-options',
      unit: 'Describe the options available to create and manage an Azure Virtual Machine',
      title: 'Các cách tạo và quản lý VM, extensions và trạng thái VM',
      html: `
<h4>Công cụ tạo VM</h4>
<table>
  <thead><tr><th>Công cụ</th><th>Ví dụ</th><th>Khi nào dùng</th></tr></thead>
  <tbody>
    <tr><td>Azure portal</td><td>Wizard Create a virtual machine</td><td>Tạo đơn lẻ, khám phá tùy chọn</td></tr>
    <tr><td>Azure CLI</td><td><code>az vm create</code></td><td>Script Bash, Cloud Shell, pipeline</td></tr>
    <tr><td>Azure PowerShell</td><td><code>New-AzVM</code></td><td>Script PowerShell, môi trường Windows</td></tr>
    <tr><td>ARM template / Bicep</td><td><code>az deployment group create</code></td><td>Hạ tầng dạng code, lặp lại nhiều môi trường, idempotent</td></tr>
    <tr><td>Terraform, REST API, SDK</td><td>—</td><td>Tích hợp công cụ bên thứ ba hoặc ứng dụng</td></tr>
  </tbody>
</table>
<pre><code># Azure CLI: VM Linux, SSH key, không public IP
az vm create -g rg-app -n vm-web01 --image Ubuntu2204 \\
  --size Standard_D2s_v5 --admin-username azureuser \\
  --generate-ssh-keys --public-ip-address "" --zone 1

# Azure PowerShell
$cred = Get-Credential
New-AzVM -ResourceGroupName rg-app -Name vm-win01 -Location eastus \\
  -Image Win2022Datacenter -Size Standard_D2s_v5 -Credential $cred</code></pre>

<h4>VM extensions</h4>
<p>Extension là agent nhỏ chạy <strong>sau khi triển khai</strong> để cấu hình hoặc tự động hóa bên trong VM. Cần <strong>Azure VM Agent</strong> (cài sẵn trong image Marketplace).</p>
<ul>
  <li><strong>Custom Script Extension</strong>: tải và chạy script (PowerShell/Bash) từ Azure Storage hoặc GitHub. Phù hợp cài phần mềm, cấu hình sau triển khai. Script Windows có thời gian chạy tối đa <strong>90 phút</strong>; script cần reboot thì không phù hợp.</li>
  <li><strong>DSC extension</strong> (PowerShell Desired State Configuration), <strong>Azure Monitor Agent</strong>, <strong>VMAccess</strong> (reset password/SSH key), <strong>Microsoft Antimalware</strong>…</li>
  <li>Thay thế cho script khi tạo: <strong>custom data / cloud-init</strong> (Linux, chạy lúc boot đầu tiên).</li>
</ul>
<pre><code>az vm extension set -g rg-app --vm-name vm-win01 \\
  --name CustomScriptExtension --publisher Microsoft.Compute \\
  --settings '{"fileUris":["https://sa.blob.core.windows.net/s/setup.ps1"],"commandToExecute":"powershell -File setup.ps1"}'

Set-AzVMCustomScriptExtension -ResourceGroupName rg-app -VMName vm-win01 \\
  -Name setup -FileUri "https://sa.blob.core.windows.net/s/setup.ps1" -Run "setup.ps1" -Location eastus</code></pre>

<h4>Trạng thái VM và chi phí</h4>
<table>
  <thead><tr><th>Trạng thái</th><th>Tính phí compute?</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td>Running</td><td>Có</td><td>Đang chạy</td></tr>
    <tr><td><strong>Stopped</strong> (allocated)</td><td><strong>Có</strong></td><td>OS đã tắt (shutdown trong OS hoặc <code>az vm stop</code>), phần cứng vẫn giữ cho VM</td></tr>
    <tr><td><strong>Stopped (deallocated)</strong></td><td><strong>Không</strong></td><td>Giải phóng host. Mất <strong>dynamic public IP</strong>, mất dữ liệu <strong>temp disk</strong>; lần start sau có thể chạy trên host khác</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 210" role="img" aria-label="Ba trạng thái VM Running, Stopped allocated, Stopped deallocated và chi phí tương ứng">
  <path class="ln-a" d="M100 68 C100 20, 620 20, 620 68" marker-end="url(#arr-a)"/>
  <text x="360" y="20" text-anchor="middle" class="t-sm t-a">Stop trên portal · az vm deallocate · Auto-shutdown</text>

  <rect class="box-s" x="15" y="70" width="170" height="100" rx="10"/>
  <text x="100" y="95" text-anchor="middle" class="t-b t-s">Running</text>
  <text x="100" y="113" text-anchor="middle" class="t-sm t-mute">(đang chạy)</text>
  <text x="100" y="135" text-anchor="middle" class="t-sm">compute: tính phí</text>
  <text x="100" y="153" text-anchor="middle" class="t-sm">disk: tính phí</text>

  <rect class="box-w" x="275" y="70" width="170" height="100" rx="10"/>
  <text x="360" y="95" text-anchor="middle" class="t-b t-w">Stopped</text>
  <text x="360" y="113" text-anchor="middle" class="t-sm t-mute">(allocated)</text>
  <text x="360" y="135" text-anchor="middle" class="t-sm t-x">compute: VẪN tính phí</text>
  <text x="360" y="153" text-anchor="middle" class="t-sm">giữ host và IP động</text>

  <rect class="box" x="535" y="70" width="170" height="100" rx="10"/>
  <text x="620" y="95" text-anchor="middle" class="t-b">Stopped</text>
  <text x="620" y="113" text-anchor="middle" class="t-sm t-mute">(deallocated)</text>
  <text x="620" y="135" text-anchor="middle" class="t-sm t-s">compute: không tính phí</text>
  <text x="620" y="153" text-anchor="middle" class="t-sm">mất IP động, temp disk</text>

  <line class="ln" x1="185" y1="120" x2="273" y2="120" marker-end="url(#arr)"/>
  <line class="ln-a" x1="445" y1="120" x2="533" y2="120" marker-end="url(#arr-a)"/>
  <text x="230" y="195" text-anchor="middle" class="t-sm t-mute">shutdown trong OS, az vm stop</text>
  <text x="490" y="195" text-anchor="middle" class="t-sm t-a">Stop trên portal, az vm deallocate</text>
</svg>
<figcaption>Hình 1. Chỉ trạng thái <strong>deallocated</strong> mới ngừng tính phí compute; disk vẫn tính phí ở mọi trạng thái. Bấm <strong>Start</strong> từ trạng thái nào cũng đưa VM về Running (từ deallocated, VM có thể được đặt lên host khác).</figcaption>
</figure>
<pre><code>az vm deallocate -g rg-app -n vm-web01      # ngừng tính phí compute
Stop-AzVM -ResourceGroupName rg-app -Name vm-web01   # mặc định cũng deallocate
az vm get-instance-view -g rg-app -n vm-web01 --query "instanceView.statuses[1].displayStatus"</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>Tắt máy từ bên trong Windows (Start → Shut down) chỉ đưa VM về <strong>Stopped</strong>, <em>vẫn tính phí compute</em>. Muốn ngừng tính phí phải <strong>Stop</strong> trên portal (portal deallocate) hoặc dùng lệnh deallocate. Tính năng <strong>Auto-shutdown</strong> trên portal cũng deallocate VM.</div>
`
    },
    {
      id: 'availability',
      unit: 'Manage the availability of your Azure VMs',
      title: 'Tính sẵn sàng của VM (tổng quan)',
      html: `
<p>Một VM đơn lẻ có thể bị gián đoạn khi host gặp lỗi phần cứng (unplanned) hoặc khi Azure bảo trì nền tảng (planned). Azure cung cấp nhiều tầng bảo vệ, chi tiết ở module tiếp theo (p5m2):</p>
<table>
  <thead><tr><th>Phương án</th><th>Bảo vệ khỏi</th><th>SLA kết nối VM</th></tr></thead>
  <tbody>
    <tr><td>VM đơn, mọi disk (OS + data) là Premium SSD hoặc Ultra Disk</td><td>—</td><td>99.9%</td></tr>
    <tr><td>VM đơn, mọi disk là Standard SSD</td><td>—</td><td>99.5%</td></tr>
    <tr><td>VM đơn, mọi disk là Standard HDD</td><td>—</td><td>95%</td></tr>
    <tr><td><strong>Availability set</strong> (≥ 2 VM)</td><td>Lỗi rack (fault domain), bảo trì (update domain) trong một datacenter</td><td>99.95%</td></tr>
    <tr><td><strong>Availability zones</strong> (≥ 2 VM ở ≥ 2 zone)</td><td>Mất cả một datacenter/zone</td><td>99.99%</td></tr>
    <tr><td><strong>Virtual Machine Scale Sets</strong></td><td>Như trên + tự động scale</td><td>Tùy cách phân bố (FD hoặc zone)</td></tr>
    <tr><td><strong>Azure Site Recovery</strong></td><td>Mất cả region (DR)</td><td>Không phải SLA uptime; đo bằng RPO/RTO</td></tr>
  </tbody>
</table>

<h4>Các thành phần hỗ trợ</h4>
<ul>
  <li><strong>Azure Load Balancer</strong> (layer 4) hoặc <strong>Application Gateway</strong> (layer 7) để phân phối traffic giữa các VM. Với zone, dùng <strong>Standard SKU</strong> cho Load Balancer và public IP.</li>
  <li><strong>Managed disks</strong> tự động được đặt ở các storage fault domain tương ứng với compute fault domain của availability set (aligned).</li>
  <li><strong>Service healing</strong>: khi host lỗi, Azure tự khởi động lại VM trên host khỏe.</li>
  <li><strong>Scheduled Events</strong> và <strong>Maintenance Configurations</strong> giúp ứng dụng biết trước/kiểm soát thời điểm bảo trì.</li>
</ul>

<div class="callout warn"><strong>Lưu ý</strong>Availability set và availability zone phải chọn <strong>lúc tạo VM</strong>. Một VM không thể vừa nằm trong availability set vừa nằm trong zone. Muốn đưa VM có sẵn vào availability set thì phải xóa VM (giữ disk) và tạo lại.</div>

<div class="callout exam"><strong>Góc thi</strong>"Bảo vệ khỏi sự cố cả datacenter" → <strong>availability zones</strong>. "Bảo vệ khỏi lỗi rack và bảo trì, region không có zone" → <strong>availability set</strong>. "Bảo vệ khỏi sự cố cả region" → <strong>Azure Site Recovery</strong> sang region khác (hoặc triển khai đa region).</div>
`
    },
    {
      id: 'backup',
      unit: 'Back up your virtual machines',
      title: 'Sao lưu VM',
      html: `
<h4>Các lựa chọn</h4>
<table>
  <thead><tr><th>Phương án</th><th>Mục đích</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>Azure Backup</strong></td><td>Sao lưu và khôi phục (lỗi người dùng, ransomware, xóa nhầm)</td><td>Dữ liệu lưu trong <strong>Recovery Services vault</strong>; theo policy; khôi phục cả VM, disk hoặc file lẻ</td></tr>
    <tr><td><strong>Managed disk snapshot</strong></td><td>Bản chụp nhanh một disk</td><td>Thủ công/script; tính phí theo dung lượng đã dùng; không có policy retention</td></tr>
    <tr><td><strong>Azure Site Recovery</strong></td><td>Disaster recovery</td><td>Replicate liên tục sang region khác, failover/failback; không thay thế backup</td></tr>
  </tbody>
</table>

<h4>Azure Backup cho VM hoạt động thế nào?</h4>
<ul>
  <li>Bật backup → Azure cài extension backup (VMSnapshot cho Windows, VMSnapshotLinux) và chụp snapshot theo lịch.</li>
  <li>Windows: snapshot <strong>application-consistent</strong> nhờ VSS. Linux: mặc định file-consistent, có thể app-consistent bằng pre/post script.</li>
  <li>Snapshot được giữ cục bộ một thời gian (<strong>instant restore</strong>, khôi phục rất nhanh), sau đó chuyển vào vault.</li>
  <li>Vault phải ở <strong>cùng region</strong> với VM được backup.</li>
  <li><strong>Standard policy</strong>: backup 1 lần/ngày. <strong>Enhanced policy</strong>: nhiều lần/ngày (theo giờ); bắt buộc cho VM <strong>Trusted Launch</strong> và cho Premium SSD v2/Ultra disk.</li>
  <li>Không cần tắt VM khi backup.</li>
</ul>

<pre><code># Bật backup cho VM với policy mặc định
az backup protection enable-for-vm -g rg-backup --vault-name rsv-prod \\
  --vm vm-web01 --policy-name DefaultPolicy

# Chạy backup ngay (on-demand)
az backup protection backup-now -g rg-backup --vault-name rsv-prod \\
  --container-name vm-web01 --item-name vm-web01 --retain-until 30-12-2026</code></pre>

<h4>Các kiểu khôi phục</h4>
<ul>
  <li><strong>Create new VM</strong>: tạo VM mới từ restore point.</li>
  <li><strong>Restore disk</strong>: khôi phục disk rồi tự gắn vào VM hoặc tạo VM bằng template.</li>
  <li><strong>Replace existing</strong>: thay disk của VM hiện tại.</li>
  <li><strong>File recovery</strong>: mount restore point như ổ đĩa (script) để lấy file lẻ.</li>
  <li><strong>Cross Region Restore</strong>: khôi phục ở region cặp, cần vault dùng <strong>GRS</strong> và bật tính năng này.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Lỗi hay gặp: không thấy VM trong danh sách khi cấu hình backup vì <strong>vault khác region với VM</strong>. Muốn khôi phục một file bị xóa mà không khôi phục cả VM → <strong>File Recovery</strong>. Chi tiết Azure Backup nằm ở module p6m1.</div>
`
    },
    {
      id: 'managed-disks',
      extra: true,
      title: 'Managed disks: loại disk, thêm và resize disk',
      html: `
<h4>Ba vai trò disk</h4>
<ul>
  <li><strong>OS disk</strong>: chứa hệ điều hành, gắn ở <code>C:</code> (Windows) hoặc <code>/dev/sda</code> (Linux). Dung lượng tối đa <strong>4.095 GiB</strong>.</li>
  <li><strong>Data disk</strong>: chứa dữ liệu ứng dụng; số lượng tối đa phụ thuộc VM size.</li>
  <li><strong>Temporary disk</strong>: ổ local trên host, thường là <code>D:</code> (Windows) hoặc <code>/mnt</code> (Linux). <strong>Mất dữ liệu</strong> khi deallocate, redeploy, resize sang host khác hoặc bảo trì. Chỉ dùng cho pagefile/swap, file tạm. Một số size (không có chữ <strong>d</strong>, ví dụ <code>D2s_v5</code>) không có temp disk.</li>
</ul>

<h4>So sánh các loại managed disk</h4>
<table>
  <thead><tr><th>Loại</th><th>Max size</th><th>Max IOPS</th><th>Max throughput</th><th>Làm OS disk?</th></tr></thead>
  <tbody>
    <tr><td>Ultra Disk</td><td>64 TiB</td><td>400.000</td><td>10.000 MB/s</td><td>Không</td></tr>
    <tr><td>Premium SSD v2</td><td>64 TiB</td><td>80.000</td><td>2.000 MB/s</td><td>Không</td></tr>
    <tr><td>Premium SSD</td><td>32 TiB</td><td>20.000</td><td>900 MB/s</td><td>Có</td></tr>
    <tr><td>Standard SSD</td><td>32 TiB</td><td>6.000</td><td>750 MB/s</td><td>Có</td></tr>
    <tr><td>Standard HDD</td><td>32 TiB</td><td>2.000 (3.000 với performance plus)</td><td>500 MB/s</td><td>Có (sẽ ngừng hỗ trợ làm OS disk từ 8/9/2028)</td></tr>
  </tbody>
</table>
<ul>
  <li><strong>Ultra Disk</strong> và <strong>Premium SSD v2</strong>: chỉnh riêng dung lượng, IOPS, throughput mà không cần restart (tối đa 4 lần/24 giờ); <strong>không hỗ trợ host caching</strong>; không dùng với Azure Compute Gallery. Ultra Disk <strong>không hỗ trợ availability set</strong>. Premium SSD v2 ở đa số region có zone chỉ gắn được vào <strong>VM zonal</strong>.</li>
  <li><strong>Premium SSD</strong> chỉ dùng được với size hỗ trợ premium storage (chữ <strong>s</strong> trong tên size). Kích thước cố định theo bậc P1–P80; có bursting.</li>
  <li>Redundancy: <strong>LRS</strong> mặc định; <strong>ZRS</strong> có cho Premium SSD và Standard SSD (không có cho Ultra).</li>
  <li>Billing: theo kích thước provisioned làm tròn lên bậc gần nhất (200 GiB Standard SSD tính như E15 = 256 GiB).</li>
</ul>

<h4>Thêm data disk</h4>
<pre><code>az vm disk attach -g rg-app --vm-name vm-web01 --name data01 \\
  --new --size-gb 256 --sku Premium_LRS --lun 0

# PowerShell
$vm = Get-AzVM -ResourceGroupName rg-app -Name vm-web01
$vm = Add-AzVMDataDisk -VM $vm -Name data01 -CreateOption Empty -DiskSizeInGB 256 -Lun 0
Update-AzVM -ResourceGroupName rg-app -VM $vm</code></pre>
<p>Sau khi gắn, phải <strong>initialize, partition và format</strong> trong hệ điều hành (Disk Management hoặc <code>parted</code>/<code>mkfs</code>, rồi thêm vào <code>/etc/fstab</code>).</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: gắn data disk mới cho VM Windows</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở VM rồi vào mục Disks:<br><span class="path">Azure portal › Virtual machines › vm-web01 › Settings › Disks</span></li>
    <li>Trong phần <em>Data disks</em>, chọn <strong>Create and attach a new disk</strong>, điền dòng disk mới:
      <div class="blade">
        <div class="blade-title">vm-web01 | Disks</div>
        <div class="blade-sec">Data disks</div>
        <div class="pf"><label>LUN</label><span class="pv sel">0</span></div>
        <div class="pf"><label class="req">Disk name</label><span class="pv">vm-web01_DataDisk_0</span></div>
        <div class="pf"><label>Storage type</label><span class="pv sel">Premium SSD LRS</span></div>
        <div class="pf"><label>Size (GiB)</label><span class="pv">256</span></div>
        <div class="pf"><label>Host caching</label><span class="pv sel">Read-only</span></div>
        <div class="pf"><label></label><span class="pv note">Portal tự hiện Max IOPS và Max throughput theo bậc disk (256 GiB Premium SSD = P15)</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Bấm <strong>Save</strong>. Disk được tạo và gắn nóng (hot-attach) vào VM đang chạy, không cần restart.</li>
    <li>RDP vào VM, mở <code>diskmgmt.msc</code>. Cửa sổ <strong>Initialize Disk</strong> hiện ra: chọn <strong>GPT</strong> (bắt buộc nếu disk từ 2 TiB trở lên) → <strong>OK</strong>.</li>
    <li>Chuột phải vùng <em>Unallocated</em> → <strong>New Simple Volume</strong>, giữ mặc định, gán ký tự ổ (ví dụ <code>F:</code>), format NTFS → <strong>Finish</strong>.</li>
  </ol>
  </div>
</div>

<h4>Mở rộng (resize) disk</h4>
<ul>
  <li>Chỉ <strong>tăng</strong> được, <strong>không thu nhỏ</strong> disk.</li>
  <li>Data disk: hầu hết trường hợp mở rộng được mà không cần dừng VM (expand without downtime). OS disk hoặc trường hợp không hỗ trợ: <strong>deallocate</strong> VM trước.</li>
  <li>Sau khi tăng trên Azure, phải <strong>mở rộng partition/file system</strong> trong OS (Extend Volume / <code>growpart</code> + <code>resize2fs</code>/<code>xfs_growfs</code>).</li>
  <li>Đổi loại disk (ví dụ Standard HDD → Premium SSD) qua <code>az disk update --sku</code>: cần <strong>deallocate VM</strong>.</li>
</ul>
<pre><code>az disk update -g rg-app -n data01 --size-gb 512
az disk update -g rg-app -n data01 --sku Premium_LRS</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong>Lưu file quan trọng lên ổ <code>D:</code> của VM Windows → mất sau khi deallocate/redeploy. Đáp án đúng là thêm <strong>data disk</strong>. Ultra Disk và Premium SSD v2 <strong>không thể</strong> làm OS disk.</div>
`
    },
    {
      id: 'disk-encryption',
      extra: true,
      title: 'Mã hóa disk: SSE, encryption at host và Azure Disk Encryption',
      html: `
<h4>Bốn lớp mã hóa</h4>
<table>
  <thead><tr><th></th><th>Server-side encryption (SSE)</th><th>Encryption at host</th><th>Azure Disk Encryption (ADE)</th></tr></thead>
  <tbody>
    <tr><td>Bật mặc định?</td><td><strong>Luôn bật</strong>, không tắt được</td><td>Không, bật theo VM</td><td>Không, bật bằng extension</td></tr>
    <tr><td>Mã hóa ở đâu</td><td>Trên storage cluster (at rest)</td><td>Trên host vật lý chạy VM, dữ liệu đi tới storage đã mã hóa</td><td>Bên trong guest OS: <strong>BitLocker</strong> (Windows), <strong>DM-Crypt</strong> (Linux)</td></tr>
    <tr><td>Temp disk, cache</td><td>Không</td><td><strong>Có</strong> (temp disk chỉ với platform-managed key)</td><td>Có</td></tr>
    <tr><td>Khóa của khách hàng</td><td>Có, qua <strong>Disk Encryption Set (DES)</strong> + Key Vault</td><td>Có, qua DES</td><td>Có, Key Vault + tùy chọn KEK</td></tr>
    <tr><td>Dùng CPU của VM</td><td>Không</td><td>Không</td><td>Có</td></tr>
  </tbody>
</table>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 305" role="img" aria-label="Ba tầng mã hóa disk: ADE trong guest OS, encryption at host trên host vật lý, SSE trên storage">
  <rect class="box-e" x="20" y="15" width="170" height="80" rx="10"/>
  <text x="105" y="50" text-anchor="middle" class="t-b">Guest OS</text>
  <text x="105" y="68" text-anchor="middle" class="t-sm t-mute">bên trong VM</text>
  <rect class="box" x="220" y="15" width="480" height="80" rx="10"/>
  <text x="236" y="38" class="t-b">Azure Disk Encryption (ADE)</text>
  <text x="236" y="58" class="t-sm">BitLocker (Windows) / DM-Crypt (Linux) · khóa nằm trong Key Vault</text>
  <text x="236" y="78" class="t-sm t-mute">Dùng CPU của VM · retire 15/9/2028</text>

  <rect class="box-a" x="20" y="115" width="170" height="80" rx="10"/>
  <text x="105" y="150" text-anchor="middle" class="t-b t-a">Host vật lý</text>
  <text x="105" y="168" text-anchor="middle" class="t-sm t-mute">chạy VM</text>
  <rect class="box" x="220" y="115" width="480" height="80" rx="10"/>
  <text x="236" y="138" class="t-b">Encryption at host</text>
  <text x="236" y="158" class="t-sm">Mã hóa temp disk và cache của OS/data disk ngay trên host</text>
  <text x="236" y="178" class="t-sm t-mute">Không tốn CPU VM · cần đăng ký feature EncryptionAtHost</text>

  <rect class="box-w" x="20" y="215" width="170" height="80" rx="10"/>
  <text x="105" y="250" text-anchor="middle" class="t-b t-w">Storage</text>
  <text x="105" y="268" text-anchor="middle" class="t-sm t-mute">managed disk at rest</text>
  <rect class="box" x="220" y="215" width="480" height="80" rx="10"/>
  <text x="236" y="238" class="t-b">Server-side encryption (SSE)</text>
  <text x="236" y="258" class="t-sm">Luôn bật cho mọi managed disk, không tắt được</text>
  <text x="236" y="278" class="t-sm t-mute">Khóa: platform-managed (mặc định) hoặc CMK qua Disk Encryption Set</text>

  <line class="ln" x1="105" y1="95" x2="105" y2="113" marker-end="url(#arr)"/>
  <line class="ln" x1="105" y1="195" x2="105" y2="213" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Dữ liệu đi từ guest OS qua host xuống storage; mỗi tầng có một cơ chế mã hóa riêng. SSE luôn có sẵn ở tầng dưới cùng. Encryption at host thêm phần mã hóa cho temp disk và cache mà SSE không phủ tới. ADE mã hóa ngay trong OS nhưng sắp bị khai tử.</figcaption>
</figure>

<p>Ngoài ra có <strong>Confidential disk encryption</strong> cho Confidential VM (khóa gắn với vTPM của VM).</p>

<h4>Azure Disk Encryption: yêu cầu về Key Vault</h4>
<ul>
  <li>Key Vault phải ở <strong>cùng region và cùng subscription</strong> với VM.</li>
  <li>Key Vault phải bật access policy <strong>"Azure Disk Encryption for volume encryption"</strong> (<code>--enabled-for-disk-encryption</code>).</li>
  <li>Không hỗ trợ một số size nhỏ (Basic, A-series cũ) và custom Linux image.</li>
  <li><strong>ADE sẽ ngừng hoạt động (retire) ngày 15/9/2028</strong>. Microsoft khuyến nghị dùng <strong>encryption at host</strong> cho VM mới và di chuyển VM đang dùng ADE trước hạn này.</li>
</ul>
<pre><code>az keyvault create -n kv-ade-eus -g rg-sec -l eastus --enabled-for-disk-encryption true
az vm encryption enable -g rg-app -n vm-win01 --disk-encryption-keyvault kv-ade-eus --volume-type All
az vm encryption show -g rg-app -n vm-win01</code></pre>

<h4>Encryption at host</h4>
<ul>
  <li>Đăng ký feature trên subscription một lần: <code>az feature register --namespace Microsoft.Compute --name EncryptionAtHost</code>.</li>
  <li>Bật khi tạo VM (<code>--encryption-at-host true</code>) hoặc với VM có sẵn thì phải <strong>deallocate</strong> trước khi bật.</li>
  <li>Không dùng đồng thời với ADE trên cùng VM.</li>
</ul>
<pre><code>az vm deallocate -g rg-app -n vm-web01
az vm update -g rg-app -n vm-web01 --set securityProfile.encryptionAtHost=true
az vm start -g rg-app -n vm-web01</code></pre>

<h4>Customer-managed key với SSE</h4>
<ol class="steps">
  <li>Tạo Key Vault (bật <strong>purge protection</strong> và soft delete) và một key.</li>
  <li>Tạo <strong>Disk Encryption Set</strong> trỏ tới key đó; DES có managed identity.</li>
  <li>Cấp cho identity của DES quyền đọc key (Key Vault Crypto Service Encryption User hoặc access policy get/wrap/unwrap).</li>
  <li>Chọn DES khi tạo disk/VM, hoặc gán cho disk có sẵn (cần deallocate).</li>
</ol>

<div class="callout exam"><strong>Góc thi</strong>"Mã hóa cả <strong>temp disk</strong> và cache mà không tốn CPU VM" → <strong>encryption at host</strong>. "Mã hóa bằng BitLocker bên trong OS" → <strong>ADE</strong>, nhớ Key Vault cùng region. "Dùng khóa tự quản lý cho managed disk" → <strong>Disk Encryption Set</strong>. SSE luôn bật sẵn nên câu "bật mã hóa at rest cho managed disk" thường không cần làm gì.</div>
`
    },
    {
      id: 'resize-redeploy-move',
      extra: true,
      title: 'Resize, redeploy và di chuyển VM',
      html: `
<h4>Resize VM</h4>
<ul>
  <li>Đổi size luôn làm VM <strong>khởi động lại</strong> (nếu đang chạy).</li>
  <li>Nếu size mới có trên <strong>cùng hardware cluster</strong> đang chạy VM: resize trực tiếp.</li>
  <li>Nếu size mới <strong>không có</strong> trên cluster hiện tại: phải <strong>deallocate</strong> VM trước rồi mới resize (VM có thể chuyển host, mất temp disk).</li>
  <li>VM trong <strong>availability set</strong>: nếu size mới không có trên cluster của set, phải deallocate <strong>tất cả VM trong availability set</strong>, rồi resize và start lại.</li>
  <li>Đổi từ size có temp disk sang size không có temp disk (hoặc ngược lại) có thể bị chặn hoặc cần thao tác riêng.</li>
</ul>
<pre><code>az vm list-vm-resize-options -g rg-app -n vm-web01 -o table   # size khả dụng trên cluster hiện tại
az vm resize -g rg-app -n vm-web01 --size Standard_E4s_v5

$vm = Get-AzVM -ResourceGroupName rg-app -Name vm-web01
$vm.HardwareProfile.VmSize = "Standard_E4s_v5"
Update-AzVM -VM $vm -ResourceGroupName rg-app</code></pre>

<h4>Redeploy</h4>
<p><strong>Redeploy</strong> tắt VM, chuyển sang <strong>node (host) mới</strong> trong hạ tầng Azure rồi bật lại, giữ nguyên cấu hình và disk. Dùng khi khó xử lý sự cố RDP/SSH hoặc ứng dụng mà nghi do host. Hệ quả: <strong>mất dữ liệu temp disk</strong>, dynamic IP có thể được cập nhật.</p>
<pre><code>az vm redeploy -g rg-app -n vm-web01
Set-AzVM -Redeploy -ResourceGroupName rg-app -Name vm-web01</code></pre>
<p>Phân biệt với <strong>Reapply</strong> (áp lại trạng thái cấu hình VM, sửa lỗi provisioning) và <strong>Restart</strong> (chỉ khởi động lại OS trên cùng host).</p>

<h4>Di chuyển VM</h4>
<table>
  <thead><tr><th>Đích</th><th>Công cụ</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td>Resource group khác (cùng subscription)</td><td>Portal <em>Move</em>, <code>az resource move</code>, <code>Move-AzResource</code></td><td>Region <strong>không đổi</strong>; resource ID đổi. Phải move kèm tài nguyên phụ thuộc (disk, NIC…) theo quy tắc của resource provider.</td></tr>
    <tr><td>Subscription khác (cùng tenant)</td><td>Như trên</td><td>Subscription đích phải đăng ký resource provider Microsoft.Compute và đủ quota. Không move được VM có Key Vault ADE sang subscription khác dễ dàng; VM Marketplace có plan có thể bị hạn chế.</td></tr>
    <tr><td><strong>Region khác</strong></td><td><strong>Azure Resource Mover</strong> (hoặc Azure Site Recovery)</td><td>Resource Mover phân tích phụ thuộc, chuẩn bị, khởi tạo move, commit; xóa nguồn sau khi xong.</td></tr>
  </tbody>
</table>
<pre><code>az resource move --destination-group rg-new \\
  --ids $(az vm show -g rg-app -n vm-web01 --query id -o tsv)
# Kiểm tra trước: Validate move trên portal, hoặc REST validateMoveResources</code></pre>
<p>Trong khi move, cả resource group nguồn và đích bị <strong>khóa thao tác ghi/xóa</strong> (không ảnh hưởng VM đang chạy). Lock kiểu ReadOnly trên RG nguồn/đích sẽ chặn move.</p>

<div class="callout exam"><strong>Bẫy thi</strong>"Chuyển VM sang <strong>region khác</strong>" thì lệnh Move resource group/subscription <strong>không</strong> làm được: dùng <strong>Azure Resource Mover</strong>. "Resize thất bại vì size không có trên cluster" → <strong>deallocate</strong> rồi resize. Redeploy và deallocate đều làm <strong>mất temp disk</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Tên VM: Windows tối đa <strong>15 ký tự</strong>, Linux tối đa <strong>64 ký tự</strong>; không đổi tên sau khi tạo.',
    'Họ VM: <strong>B</strong> burstable, <strong>D</strong> general purpose, <strong>F</strong> compute, <strong>E/M</strong> memory, <strong>L</strong> storage, <strong>N</strong> GPU, <strong>H</strong> HPC.',
    '<strong>Stopped</strong> (shutdown trong OS, <code>az vm stop</code>) vẫn tính phí compute; <strong>Stopped (deallocated)</strong> thì không, nhưng vẫn tính phí disk.',
    '<strong>Temp disk</strong> mất dữ liệu khi deallocate, redeploy hoặc chuyển host. Không lưu dữ liệu quan trọng trên đó.',
    'Ultra Disk: 64 TiB, 400.000 IOPS, 10.000 MB/s. Premium SSD v2: 64 TiB, 80.000 IOPS. Premium SSD: 32 TiB, 20.000 IOPS. Ultra và Premium SSD v2 <strong>không làm OS disk</strong>.',
    'Disk chỉ <strong>tăng</strong> được, không thu nhỏ; sau khi tăng phải mở rộng partition trong OS.',
    '<strong>ADE</strong>: BitLocker/DM-Crypt, Key Vault <strong>cùng region và subscription</strong>, bật enabled-for-disk-encryption; ADE retire ngày <strong>15/9/2028</strong>.',
    '<strong>Encryption at host</strong> mã hóa cả temp disk và cache; cần đăng ký feature <code>EncryptionAtHost</code>; bật cho VM có sẵn cần deallocate.',
    'Azure Bastion cần subnet <code>AzureBastionSubnet</code> tối thiểu <strong>/26</strong>; VM không cần public IP.',
    'Resize sang size không có trên cluster hiện tại → phải <strong>deallocate</strong> (trong availability set: deallocate tất cả VM của set).',
    'Move giữa resource group/subscription không đổi region; sang region khác dùng <strong>Azure Resource Mover</strong>.',
    'Recovery Services vault phải <strong>cùng region</strong> với VM được backup.'
  ],
  traps: [
    'Shutdown VM từ bên trong hệ điều hành rồi nghĩ đã hết tính phí. Thực tế VM ở trạng thái <strong>Stopped (allocated)</strong>, vẫn tính phí compute.',
    'Lưu dữ liệu ứng dụng trên ổ <code>D:</code> / <code>/mnt</code> (temp disk). Dữ liệu biến mất sau deallocate hoặc redeploy.',
    'Cho rằng có thể thêm VM đang chạy vào availability set. Availability set chỉ chọn được <strong>lúc tạo VM</strong>.',
    'Dùng Move resource để chuyển VM sang region khác. Move chỉ đổi resource group/subscription; đổi region cần <strong>Azure Resource Mover</strong> hoặc Site Recovery.',
    'Tạo Key Vault ở region khác với VM rồi bật ADE. ADE yêu cầu Key Vault <strong>cùng region</strong> (và cùng subscription).',
    'Chọn Ultra Disk hoặc Premium SSD v2 làm OS disk. Hai loại này <strong>chỉ làm data disk</strong>.',
    'Nghĩ rằng Azure Site Recovery là giải pháp backup. ASR là <strong>disaster recovery</strong> (replicate và failover); khôi phục file bị xóa nhầm cần <strong>Azure Backup</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Họ VM</td><td>B burst · D general · F compute · E/M memory · L storage · N GPU · H HPC</td></tr>
    <tr><td>Trạng thái</td><td>Stopped = vẫn tính phí · Deallocated = không tính compute, mất temp disk + dynamic public IP</td></tr>
    <tr><td>Disk</td><td>Ultra 400K IOPS · Premium v2 80K · Premium 20K · Std SSD 6K · Std HDD 2K; Ultra/PremV2 không làm OS disk</td></tr>
    <tr><td>Resize disk</td><td>Chỉ tăng; mở rộng partition trong OS; đổi SKU cần deallocate</td></tr>
    <tr><td>Mã hóa</td><td>SSE luôn bật · Encryption at host (temp disk + cache) · ADE (BitLocker/DM-Crypt, KV cùng region, retire 9/2028)</td></tr>
    <tr><td>Kết nối</td><td>RDP 3389 · SSH 22 · Bastion (<code>AzureBastionSubnet</code> /26) · JIT (Defender for Servers P2)</td></tr>
    <tr><td>Extension</td><td>Custom Script Extension: chạy script sau triển khai (Windows tối đa 90 phút)</td></tr>
    <tr><td>Resize VM</td><td>Restart; size ngoài cluster → deallocate (cả availability set)</td></tr>
    <tr><td>Redeploy</td><td>Chuyển host mới, mất temp disk</td></tr>
    <tr><td>Move</td><td>RG/subscription: Move (cùng region) · Region: Azure Resource Mover</td></tr>
    <tr><td>Backup</td><td>Recovery Services vault cùng region; Enhanced policy cho Trusted Launch</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Họ VM nào cho database in-memory cần nhiều RAM?', back: 'Họ <strong>E</strong> (memory optimized); rất lớn như SAP HANA thì họ <strong>M</strong>.' },
    { front: 'Họ VM rẻ cho tải thấp, thỉnh thoảng tăng vọt?', back: '<strong>B-series</strong> (burstable), tích lũy CPU credit khi nhàn rỗi.' },
    { front: 'Chữ "d" và "s" trong Standard_D4ds_v5 nghĩa là gì?', back: '<strong>d</strong> = có local temp disk; <strong>s</strong> = hỗ trợ Premium Storage.' },
    { front: 'Stopped khác Stopped (deallocated) thế nào?', back: 'Stopped: OS tắt nhưng host vẫn giữ, <strong>vẫn tính phí compute</strong>. Deallocated: giải phóng host, <strong>không tính phí compute</strong>, mất temp disk và dynamic public IP.' },
    { front: 'Điều gì xảy ra với temp disk khi redeploy VM?', back: 'Dữ liệu temp disk <strong>bị mất</strong> vì VM chuyển sang host mới.' },
    { front: 'Loại managed disk nào không làm được OS disk?', back: '<strong>Ultra Disk</strong> và <strong>Premium SSD v2</strong>.' },
    { front: 'Giới hạn IOPS của Ultra, Premium SSD v2, Premium SSD?', back: 'Ultra 400.000 · Premium SSD v2 80.000 · Premium SSD 20.000.' },
    { front: 'Thu nhỏ managed disk được không?', back: '<strong>Không</strong>. Chỉ mở rộng được, và sau đó phải mở rộng partition trong OS.' },
    { front: 'Yêu cầu Key Vault cho Azure Disk Encryption?', back: 'Cùng <strong>region</strong> và <strong>subscription</strong> với VM, bật <strong>enabled-for-disk-encryption</strong>.' },
    { front: 'Phương án mã hóa nào bao phủ temp disk và cache, không tốn CPU VM?', back: '<strong>Encryption at host</strong>.' },
    { front: 'Dùng gì để dùng khóa do khách hàng quản lý cho managed disk (SSE)?', back: '<strong>Disk Encryption Set</strong> trỏ tới key trong Key Vault hoặc Managed HSM.' },
    { front: 'Subnet cho Azure Bastion?', back: 'Tên bắt buộc <code>AzureBastionSubnet</code>, kích thước tối thiểu <strong>/26</strong>.' },
    { front: 'JIT VM access thuộc dịch vụ nào?', back: '<strong>Microsoft Defender for Cloud</strong> (Defender for Servers Plan 2); tạm mở NSG rule theo yêu cầu.' },
    { front: 'Extension để chạy script cài phần mềm sau khi tạo VM?', back: '<strong>Custom Script Extension</strong>.' },
    { front: 'Resize thất bại vì size không có trên cluster hiện tại?', back: '<strong>Deallocate</strong> VM rồi resize (trong availability set: deallocate tất cả VM của set).' },
    { front: 'Công cụ chuyển VM sang region khác?', back: '<strong>Azure Resource Mover</strong> (hoặc Azure Site Recovery).' },
    { front: 'Recovery Services vault phải ở đâu so với VM?', back: '<strong>Cùng region</strong> với VM được backup.' }
  ],
  quiz: [
    {
      q: 'Công ty bạn cần chạy một cơ sở dữ liệu SQL Server với bộ đệm lớn trong RAM. Yêu cầu tỷ lệ bộ nhớ trên vCPU cao, chi phí hợp lý. Bạn chọn họ VM nào?',
      options: ['B-series', 'E-series', 'F-series', 'N-series'],
      answer: [1],
      explain: 'E-series là memory optimized, tỷ lệ RAM/vCPU cao, phù hợp database quan hệ và cache. F-series ưu tiên CPU, B-series dành cho tải thấp có burst, N-series là GPU nên đắt và không cần thiết.'
    },
    {
      q: 'Một developer tắt VM1 (Windows) bằng lệnh Shut down bên trong hệ điều hành vào cuối ngày. Cuối tháng hóa đơn compute của VM1 vẫn cao. Bạn cần ngừng phát sinh phí compute khi không dùng với ít công sức nhất. Bạn nên làm gì?',
      options: ['Chuyển OS disk sang Standard HDD', 'Xóa public IP của VM1', 'Đổi VM1 sang B-series', 'Cấu hình Auto-shutdown cho VM1 trên portal'],
      answer: [3],
      explain: 'Shutdown trong OS chỉ đưa VM về trạng thái Stopped (allocated), vẫn tính phí compute. Auto-shutdown deallocate VM theo lịch nên ngừng phí compute. Đổi disk hoặc xóa public IP không ảnh hưởng phí compute; đổi sang B-series chỉ giảm giá mà vẫn tính phí khi VM được cấp phát.'
    },
    {
      q: 'Ứng dụng trên VM2 ghi file log quan trọng vào ổ <code>D:</code>. Sau khi bạn redeploy VM2 để xử lý sự cố RDP, các file log biến mất. Bạn cần đảm bảo log được giữ lại lâu dài. Bạn nên làm gì?',
      options: ['Thêm một managed data disk và ghi log vào đó', 'Bật encryption at host', 'Đổi VM2 sang size có temp disk lớn hơn', 'Tắt boot diagnostics'],
      answer: [0],
      explain: 'Ổ D: là temp disk, mất dữ liệu khi redeploy, deallocate hoặc chuyển host. Data disk là managed disk bền vững. Temp disk lớn hơn vẫn là temp disk; encryption at host và boot diagnostics không liên quan tới tính bền dữ liệu.'
    },
    {
      q: 'Bạn cần cho phép quản trị viên RDP vào các VM Windows trong VNet1. Các VM không được có public IP và cổng 3389 không được mở ra Internet. Bạn nên triển khai gì?',
      options: ['Một NSG cho phép 3389 từ Internet', 'Một public load balancer với NAT rule', 'Azure Bastion trong subnet <code>AzureBastionSubnet</code>', 'Gán public IP Standard SKU cho từng VM'],
      answer: [2],
      explain: 'Azure Bastion cung cấp RDP/SSH qua HTTPS trên portal, VM không cần public IP. NSG mở 3389, NAT rule và public IP đều đưa cổng quản trị ra Internet, vi phạm yêu cầu.'
    },
    {
      q: 'Bạn cần chọn loại disk cho một VM mới. Loại nào có thể dùng làm OS disk? (Chọn 2)',
      options: ['Premium SSD', 'Ultra Disk', 'Standard SSD', 'Premium SSD v2'],
      answer: [0, 2],
      explain: 'Premium SSD và Standard SSD (cùng Standard HDD) dùng được làm OS disk. Ultra Disk và Premium SSD v2 chỉ dùng làm data disk.'
    },
    {
      q: 'Bạn định bật Azure Disk Encryption cho VM3 ở region West Europe. Key Vault hiện có của công ty nằm ở North Europe, cùng subscription. Bạn cần làm gì?',
      options: ['Bật purge protection cho Key Vault ở North Europe', 'Di chuyển VM3 sang North Europe', 'Bật encryption at host trước rồi mới bật ADE', 'Tạo Key Vault mới ở West Europe và bật enabled-for-disk-encryption'],
      answer: [3],
      explain: 'ADE yêu cầu Key Vault cùng region và cùng subscription với VM, đồng thời bật quyền dùng cho disk encryption. Purge protection không giải quyết khác biệt region. Di chuyển VM tốn công và không cần thiết. ADE và encryption at host không dùng chung trên một VM.'
    },
    {
      q: 'Đội bảo mật yêu cầu mã hóa cả temp disk và disk cache của các VM mới, không dùng CPU của VM cho việc mã hóa. Bạn chọn phương án nào?',
      options: ['Azure Disk Encryption với KEK', 'Encryption at host', 'Server-side encryption với platform-managed key (mặc định)', 'BitLocker cấu hình thủ công trong OS'],
      answer: [1],
      explain: 'Encryption at host mã hóa trên host vật lý, bao phủ temp disk và cache, không tốn CPU của VM. SSE mặc định không mã hóa temp disk và cache. ADE và BitLocker chạy trong guest OS nên dùng CPU của VM.'
    },
    {
      q: 'VM4 nằm trong availability set AS1 cùng 3 VM khác. Bạn cần đổi VM4 sang size Standard_M64s, size này không có trên hardware cluster hiện tại. Bạn phải làm gì trước khi resize?',
      options: ['Chỉ cần restart VM4', 'Redeploy VM4', 'Deallocate tất cả VM trong AS1', 'Xóa AS1 và tạo lại'],
      answer: [2],
      explain: 'Khi size mới không có trên cluster của availability set, phải deallocate tất cả VM trong set rồi resize, sau đó start lại. Restart hoặc redeploy không đổi cluster của availability set; xóa AS1 là không cần thiết.'
    },
    {
      q: 'Bạn cần chuyển VM5 từ region East US sang region Southeast Asia với ít rủi ro nhất, có bước kiểm tra phụ thuộc. Bạn dùng công cụ nào?',
      options: ['Azure Resource Mover', 'Lệnh <code>az resource move</code> sang resource group ở Southeast Asia', 'Redeploy VM5', 'Azure Migrate để đánh giá on-premises'],
      answer: [0],
      explain: 'Azure Resource Mover hỗ trợ di chuyển tài nguyên giữa các region, có bước phân tích phụ thuộc, prepare, initiate và commit. <code>az resource move</code> chỉ đổi resource group/subscription, region giữ nguyên. Redeploy chỉ đổi host trong cùng region. Azure Migrate dành cho workload on-premises.'
    },
    {
      q: 'Sau khi tạo VM6 (Windows), bạn cần tự động cài IIS và sao chép file cấu hình bằng một script PowerShell lưu trong Azure Storage. Có những phương án nào phù hợp? (Chọn 2)',
      options: ['Bật boot diagnostics', 'Dùng Custom Script Extension trỏ tới script trong Storage', 'Gán role Contributor cho VM6', 'Dùng Run command chạy script trên VM6'],
      answer: [1, 3],
      explain: 'Custom Script Extension tải và chạy script sau triển khai; Run command cũng chạy được script PowerShell bên trong VM. Boot diagnostics chỉ để chẩn đoán khởi động; gán role RBAC không chạy được script.'
    },
    {
      q: 'Bạn tăng kích thước data disk của VM7 từ 128 GiB lên 512 GiB trên portal. Trong Windows, ổ đĩa vẫn hiển thị 128 GiB. Bạn cần làm gì?',
      options: ['Redeploy VM7', 'Đổi disk sang Premium SSD', 'Mở rộng volume (Extend Volume) trong Disk Management', 'Detach và attach lại disk'],
      answer: [2],
      explain: 'Azure chỉ tăng dung lượng thiết bị; hệ điều hành cần mở rộng partition/volume để dùng phần mới. Redeploy, đổi SKU hay attach lại không mở rộng partition.'
    },
    {
      q: 'Bạn cấu hình Azure Backup cho VM8 ở region Japan East, nhưng VM8 không xuất hiện trong danh sách khi chọn VM trong Recovery Services vault RSV1. Nguyên nhân có khả năng nhất là gì?',
      options: ['VM8 đang chạy nên không backup được', 'VM8 dùng Standard SSD', 'RSV1 dùng LRS thay vì GRS', 'RSV1 nằm ở region khác Japan East'],
      answer: [3],
      explain: 'Vault phải cùng region với VM được backup. Azure Backup sao lưu VM đang chạy bình thường; loại disk Standard SSD và kiểu redundancy LRS của vault không ngăn VM xuất hiện.'
    },
    {
      q: 'Bạn cần chuyển VM9 cùng disk và NIC của nó từ resource group RG-A sang RG-B trong cùng subscription và cùng region. Phát biểu nào đúng?',
      options: ['Phải tạo lại VM9 từ disk trong RG-B', 'Dùng thao tác Move; region của VM9 giữ nguyên và resource ID thay đổi', 'Phải dùng Azure Resource Mover', 'VM9 phải được xóa trước khi move'],
      answer: [1],
      explain: 'Move resource giữa resource group trong cùng subscription được hỗ trợ cho VM và tài nguyên phụ thuộc; region không đổi nhưng resource ID đổi theo resource group mới. Không cần tạo lại hay xóa VM. Resource Mover dùng cho di chuyển giữa region.'
    },
    {
      q: 'Bạn cần cho phép quản trị viên mở cổng RDP vào các VM production chỉ khi có yêu cầu, giới hạn theo IP nguồn và tự động đóng sau một khoảng thời gian. Bạn nên dùng gì?',
      options: ['Just-in-time VM access của Microsoft Defender for Cloud', 'Azure Firewall với DNAT rule cố định', 'Application security group', 'Một NSG rule cho phép 3389 từ mọi nguồn với priority thấp'],
      answer: [0],
      explain: 'JIT VM access giữ cổng quản trị đóng và tạm mở NSG rule theo yêu cầu cho IP cụ thể trong thời gian giới hạn. DNAT rule cố định và NSG rule mở rộng đều luôn mở cổng; application security group chỉ là cách nhóm VM trong NSG rule.'
    }
  ]
});

AZ.addModule({
  id: 'p6m1',
  summary: 'Azure Backup là dịch vụ sao lưu được quản lý hoàn toàn, bảo vệ dữ liệu trên Azure (VM, Azure Files, SQL Server trong VM, Blob, Disk) và on-premises (qua MARS agent, MABS/DPM). Đề AZ-104 hay hỏi <strong>workload nào dùng Recovery Services vault và workload nào dùng Backup vault</strong>, <strong>vault redundancy</strong>, <strong>cross region restore</strong>, <strong>soft delete</strong>, và khi nào dùng Azure Backup thay vì Azure Site Recovery.',
  objectives: [
    'Mô tả Azure Backup và các workload được hỗ trợ trên Azure và on-premises',
    'Giải thích cách hoạt động của MARS agent, MABS/DPM, VM backup extension và các tầng lưu trữ trong vault',
    'Chọn đúng Recovery Services vault hay Backup vault cho từng workload',
    'Cấu hình storage redundancy (LRS/ZRS/GRS), cross region restore và các tính năng bảo mật (soft delete, immutability, MUA)',
    'Phân biệt RPO/RTO và chọn giữa Azure Backup với Azure Site Recovery',
    'Mô tả quy trình replication, test failover, failover và failback của Azure Site Recovery'
  ],
  sections: [
    {
      id: 'what-is-backup',
      unit: 'What is Azure Backup?',
      title: 'Azure Backup là gì?',
      html: `
<p><strong>Azure Backup</strong> là dịch vụ sao lưu dạng PaaS: không cần dựng máy chủ backup, không cần quản lý băng từ hay ổ đĩa. Bạn định nghĩa <strong>backup policy</strong> (lịch và thời gian giữ), Azure Backup lo việc chụp, chuyển và lưu trữ dữ liệu vào <strong>vault</strong> do Microsoft quản lý.</p>

<h4>Workload được hỗ trợ</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Workload</th><th>Cách bảo vệ</th></tr></thead>
  <tbody>
    <tr><td rowspan="6">Trên Azure</td><td><strong>Azure VM</strong> (Windows/Linux)</td><td>VM backup extension, snapshot toàn bộ đĩa, khôi phục VM/đĩa/file</td></tr>
    <tr><td><strong>Azure Files</strong></td><td>Share snapshot (lưu trong storage account) hoặc vaulted backup</td></tr>
    <tr><td><strong>SQL Server / SAP HANA trong Azure VM</strong></td><td>Backup theo workload, có log backup (RPO tới 15 phút), khôi phục point-in-time</td></tr>
    <tr><td><strong>Azure Blobs</strong></td><td>Operational backup (liên tục, trong storage account) và vaulted backup</td></tr>
    <tr><td><strong>Azure Managed Disks</strong></td><td>Incremental snapshot theo lịch, nhiều lần mỗi ngày</td></tr>
    <tr><td>Azure Database for PostgreSQL, AKS…</td><td>Backup vault</td></tr>
    <tr><td rowspan="2">On-premises</td><td>File, folder, system state trên Windows</td><td><strong>MARS agent</strong> gửi thẳng lên Azure</td></tr>
    <tr><td>Hyper-V/VMware VM, SQL Server, SharePoint, Exchange</td><td><strong>MABS</strong> (Microsoft Azure Backup Server) hoặc <strong>System Center DPM</strong></td></tr>
  </tbody>
</table>

<h4>Lợi ích chính</h4>
<ul>
  <li><strong>Offload sao lưu on-premises</strong>: dùng Azure làm đích lưu trữ dài hạn thay băng từ.</li>
  <li><strong>Lưu trữ không giới hạn</strong> về mặt quản trị: không cần lập kế hoạch dung lượng vault; trả tiền theo dung lượng thực dùng và số <em>protected instance</em>.</li>
  <li><strong>Nhiều lựa chọn redundancy</strong>: LRS, ZRS, GRS (và cross region restore).</li>
  <li><strong>Bảo mật</strong>: mã hóa khi truyền và khi lưu (platform-managed key mặc định, tùy chọn customer-managed key), RBAC, soft delete, immutable vault, multi-user authorization.</li>
  <li><strong>Backup nhất quán ứng dụng</strong> (application-consistent) cho Windows qua VSS, và cho Linux qua pre/post script.</li>
  <li><strong>Lưu giữ dài hạn</strong>: theo ngày, tuần, tháng, năm; có tầng <strong>Archive</strong> cho điểm khôi phục lâu năm (VM, SQL trong VM).</li>
  <li><strong>Không tính phí truyền dữ liệu</strong> vào vault (inbound), và không tính phí egress khi restore.</li>
</ul>

<h4>RPO và RTO</h4>
<div class="compare">
  <div><strong>RPO (Recovery Point Objective)</strong>Lượng dữ liệu tối đa chấp nhận mất, đo bằng thời gian. Backup hằng ngày lúc 22h nghĩa là RPO tối đa khoảng 24 giờ.</div>
  <div><strong>RTO (Recovery Time Objective)</strong>Thời gian tối đa chấp nhận để khôi phục dịch vụ. Restore VM từ vault có thể mất hàng chục phút đến hàng giờ tùy dung lượng.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>Azure Backup trả lời câu hỏi "<strong>khôi phục dữ liệu</strong> về một thời điểm trong quá khứ" (xóa nhầm, ransomware, hỏng dữ liệu, lưu giữ để tuân thủ). Nó <strong>không</strong> phải giải pháp giữ ứng dụng chạy liên tục khi cả region gặp sự cố; đó là việc của <strong>Azure Site Recovery</strong>.</div>
`
    },
    {
      id: 'how-backup-works',
      unit: 'How Azure Backup works',
      title: 'Azure Backup hoạt động như thế nào?',
      html: `
<h4>1. MARS agent (Microsoft Azure Recovery Services)</h4>
<ul>
  <li>Cài trên máy Windows (on-premises hoặc Azure VM) để backup <strong>file, folder và system state</strong>. Không hỗ trợ Linux.</li>
  <li>Gửi dữ liệu <strong>trực tiếp</strong> lên Recovery Services vault, không cần máy chủ trung gian.</li>
  <li>Tối đa <strong>3 lần backup mỗi ngày</strong>.</li>
  <li>Đăng ký với vault bằng <strong>vault credentials file</strong> tải từ portal và đặt <strong>passphrase</strong> mã hóa (ký tự ASCII, nên dài và phức tạp). Mất passphrase thì Microsoft cũng không khôi phục được dữ liệu; nên lưu passphrase vào Azure Key Vault.</li>
  <li>Có thể chạy song song với VM backup extension trên Azure VM Windows khi chỉ cần backup một số file/folder cụ thể.</li>
</ul>

<h4>2. MABS / System Center DPM</h4>
<ul>
  <li>Máy chủ backup đặt tại on-premises, bảo vệ Hyper-V VM, VMware VM, SQL Server, SharePoint, Exchange, file server, máy trạm.</li>
  <li>Mô hình <strong>D2D2C</strong>: backup vào đĩa cục bộ của MABS/DPM (khôi phục nhanh), sau đó MARS agent tích hợp sẵn đẩy bản sao lên Azure để lưu dài hạn.</li>
  <li>MABS miễn phí bản quyền (trả phí protected instance và storage của Azure Backup); DPM cần bản quyền System Center.</li>
</ul>

<h4>3. Backup Azure VM</h4>
<ol class="steps">
  <li>Khi bật backup, Azure Backup cài <strong>backup extension</strong> vào VM (VMSnapshot cho Windows, VMSnapshotLinux cho Linux). VM phải đang chạy để cài extension.</li>
  <li>Theo lịch, extension phối hợp chụp <strong>snapshot</strong>: Windows dùng <strong>VSS</strong> để có bản app-consistent; Linux dùng pre/post script nếu có, không thì là file-system consistent.</li>
  <li>Snapshot được giữ ở <strong>snapshot tier</strong> (Instant Restore) để khôi phục nhanh.</li>
  <li>Dữ liệu được chuyển sang <strong>vault tier</strong> (Vault-Standard). Lần đầu là bản đầy đủ; các lần sau là <strong>incremental</strong> (chỉ block thay đổi).</li>
</ol>

<h4>4. Các tầng lưu trữ</h4>
<table>
  <thead><tr><th>Tầng</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>Snapshot tier</strong> (operational)</td><td>Snapshot nằm cạnh tài nguyên gốc; restore nhanh nhất (Instant Restore)</td></tr>
    <tr><td><strong>Vault-Standard</strong></td><td>Dữ liệu trong vault, cô lập khỏi tenant/subscription của bạn, áp dụng redundancy của vault</td></tr>
    <tr><td><strong>Vault-Archive</strong></td><td>Chi phí thấp cho điểm khôi phục dài hạn (tháng, năm); phải rehydrate trước khi restore</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Ba đường dữ liệu vào Recovery Services vault: Azure VM qua snapshot tier, MARS agent gửi trực tiếp, MABS/DPM gửi bản sao từ đĩa cục bộ">
  <rect class="box-a" x="10" y="30" width="170" height="60" rx="10"/>
  <text x="95" y="56" text-anchor="middle" class="t-b">Azure VM</text>
  <text x="95" y="76" text-anchor="middle" class="t-sm t-mute">backup extension</text>
  <rect class="box" x="10" y="120" width="170" height="60" rx="10"/>
  <text x="95" y="146" text-anchor="middle" class="t-b">MARS agent</text>
  <text x="95" y="166" text-anchor="middle" class="t-sm t-mute">file/folder/system state</text>
  <rect class="box" x="10" y="210" width="170" height="60" rx="10"/>
  <text x="95" y="236" text-anchor="middle" class="t-b">MABS / DPM</text>
  <text x="95" y="256" text-anchor="middle" class="t-sm t-mute">đĩa cục bộ trước (D2D2C)</text>

  <rect class="box-s" x="230" y="30" width="170" height="60" rx="10"/>
  <text x="315" y="56" text-anchor="middle" class="t-b">Snapshot tier</text>
  <text x="315" y="76" text-anchor="middle" class="t-sm">Instant Restore</text>

  <rect class="box-a" x="470" y="10" width="240" height="270" rx="12"/>
  <text x="590" y="36" text-anchor="middle" class="t-b t-a">Recovery Services vault</text>
  <rect class="box" x="490" y="60" width="200" height="70" rx="8"/>
  <text x="590" y="88" text-anchor="middle" class="t-b">Vault-Standard</text>
  <text x="590" y="108" text-anchor="middle" class="t-sm t-mute">incremental · LRS/ZRS/GRS</text>
  <rect class="box-e" x="490" y="190" width="200" height="70" rx="8"/>
  <text x="590" y="218" text-anchor="middle" class="t-b">Vault-Archive</text>
  <text x="590" y="238" text-anchor="middle" class="t-sm t-mute">điểm tháng/năm, rehydrate</text>
  <line class="ln dash" x1="590" y1="130" x2="590" y2="186" marker-end="url(#arr)"/>
  <text x="600" y="163" class="t-sm t-mute">chuyển tier</text>

  <line class="ln-a" x1="180" y1="60" x2="226" y2="60" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="400" y1="60" x2="486" y2="85" marker-end="url(#arr-a)"/>
  <text x="443" y="63" text-anchor="middle" class="t-sm t-a">transfer</text>
  <line class="ln" x1="180" y1="150" x2="486" y2="110" marker-end="url(#arr)"/>
  <text x="330" y="120" text-anchor="middle" class="t-sm t-mute">trực tiếp</text>
  <line class="ln" x1="180" y1="240" x2="486" y2="120" marker-end="url(#arr)"/>
  <text x="385" y="200" text-anchor="middle" class="t-sm t-mute">bản sao lên Azure</text>
</svg>
<figcaption>Hình 1. Azure VM được chụp snapshot trước (snapshot tier, khôi phục nhanh) rồi mới chuyển dữ liệu vào vault; MARS agent gửi thẳng vào vault; MABS/DPM backup vào đĩa cục bộ rồi đẩy bản sao lên vault. Điểm khôi phục dài hạn có thể chuyển sang Vault-Archive.</figcaption>
</figure>

<h4>Vault storage redundancy</h4>
<table>
  <thead><tr><th>Loại</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><strong>LRS</strong></td><td>3 bản sao trong một datacenter; rẻ nhất; phù hợp dữ liệu không quan trọng/dev-test</td></tr>
    <tr><td><strong>ZRS</strong></td><td>Sao chép qua các availability zone trong region; đáp ứng yêu cầu dữ liệu nằm trong một region</td></tr>
    <tr><td><strong>GRS</strong> (mặc định)</td><td>Sao chép sang region cặp (paired region); cần cho <strong>Cross Region Restore</strong></td></tr>
  </tbody>
</table>
<div class="callout warn"><strong>Quan trọng</strong>Đặt storage redundancy <strong>trước khi</strong> bảo vệ item đầu tiên. Khi vault đã có item được backup, không đổi được kiểu redundancy nữa (phải tạo vault mới).</div>
<pre><code>az backup vault create -g rg-bk -n rsv-prod -l eastus
az backup vault backup-properties set -g rg-bk -n rsv-prod \\
  --backup-storage-redundancy GeoRedundant --cross-region-restore-flag true</code></pre>

<h4>Cross Region Restore (CRR)</h4>
<p>Bật ở mức vault (cần <strong>GRS</strong>). Cho phép restore dữ liệu ở <strong>region phụ (paired region)</strong> bất kỳ lúc nào bạn muốn, ví dụ để diễn tập hoặc khi region chính gặp sự cố, mà không phải chờ Microsoft tuyên bố thảm họa. Hỗ trợ Azure VM, SQL Server và SAP HANA trong Azure VM.</p>

<h4>Bảo mật dữ liệu backup</h4>
<ul>
  <li><strong>Soft delete</strong>: dữ liệu backup bị xóa được giữ thêm <strong>14 ngày</strong> miễn phí, có thể "undelete". Thời gian soft delete chỉnh được 14–180 ngày (phần vượt 14 ngày tính phí). Với chế độ <em>secure by default</em>, soft delete trên Recovery Services vault được áp dụng bắt buộc và không tắt được nữa.</li>
  <li><strong>Immutable vault</strong>: chặn các thao tác làm giảm bảo vệ (xóa điểm khôi phục trước hạn, giảm retention); có thể khóa vĩnh viễn.</li>
  <li><strong>Multi-user authorization (MUA)</strong>: dùng <strong>Resource Guard</strong> để thao tác nhạy cảm (giảm retention, dừng bảo vệ kèm xóa dữ liệu) cần thêm phê duyệt của người khác.</li>
  <li>RBAC: <strong>Backup Contributor</strong> (quản lý mọi thứ trừ xóa vault và gán quyền), <strong>Backup Operator</strong> (như Contributor nhưng không xóa backup, không tạo/sửa policy), <strong>Backup Reader</strong> (chỉ xem).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Cần khôi phục VM ở region phụ bất kỳ lúc nào" thì vault phải là <strong>GRS + bật Cross Region Restore</strong>. "Vault đang GRS, muốn đổi sang LRS để tiết kiệm nhưng đã có VM được backup" thì phải tạo <strong>vault mới</strong> (hoặc dừng bảo vệ và xóa dữ liệu trước).</div>
`
    },
    {
      id: 'when-to-use',
      unit: 'When to use Azure Backup',
      title: 'Khi nào dùng Azure Backup?',
      html: `
<h4>Các kịch bản phù hợp</h4>
<ul>
  <li><strong>Khôi phục sau xóa nhầm hoặc hỏng dữ liệu</strong>: lấy lại file, đĩa hoặc cả VM từ một điểm khôi phục.</li>
  <li><strong>Ransomware</strong>: dữ liệu trong vault cô lập khỏi môi trường sản xuất, kết hợp soft delete, immutable vault và MUA để kẻ tấn công không xóa được backup.</li>
  <li><strong>Lưu giữ dài hạn để tuân thủ</strong>: giữ bản hằng tháng/hằng năm nhiều năm (dùng tầng Archive để giảm chi phí).</li>
  <li><strong>Thay thế hạ tầng backup on-premises</strong>: dùng MARS/MABS đẩy dữ liệu lên Azure thay vì băng từ.</li>
  <li><strong>Backup workload PaaS/IaaS trên Azure</strong> mà không phải tự viết script snapshot.</li>
</ul>

<h4>Khi nào Azure Backup không phải đáp án tốt nhất?</h4>
<ul>
  <li>Cần <strong>RPO tính bằng giây/phút</strong> và <strong>RTO thấp</strong> cho cả ứng dụng nhiều VM khi region gặp sự cố: dùng <strong>Azure Site Recovery</strong>.</li>
  <li>Dịch vụ PaaS có backup tích hợp sẵn: Azure SQL Database (point-in-time restore tự động), Cosmos DB, App Service (backup riêng), Key Vault (soft delete, backup object).</li>
  <li>Cần bản sao dữ liệu đồng bộ để đọc/ghi ở region khác: dùng tính năng replication của dịch vụ (ví dụ geo-replication của SQL, GRS/RA-GRS của storage).</li>
</ul>

<h4>Azure Backup và Azure Site Recovery</h4>
<table>
  <thead><tr><th></th><th>Azure Backup</th><th>Azure Site Recovery</th></tr></thead>
  <tbody>
    <tr><td>Mục tiêu</td><td>Bảo vệ và khôi phục <strong>dữ liệu</strong> về thời điểm trước đó</td><td><strong>Business continuity</strong>: giữ ứng dụng chạy bằng cách failover sang site khác</td></tr>
    <tr><td>Tần suất</td><td>Theo lịch (hằng ngày, hoặc vài giờ một lần)</td><td>Replication <strong>liên tục</strong>, crash-consistent point mỗi 5 phút</td></tr>
    <tr><td>Thời gian giữ</td><td>Ngày đến nhiều năm</td><td>Tối đa 15 ngày điểm khôi phục</td></tr>
    <tr><td>Khôi phục</td><td>Restore file, đĩa, VM</td><td>Failover cả nhóm VM theo recovery plan</td></tr>
    <tr><td>Ví dụ</td><td>Xóa nhầm file tuần trước, ransomware, tuân thủ 7 năm</td><td>Region East US mất điện, cần chạy ở West US trong vài phút</td></tr>
  </tbody>
</table>
<p>Hai dịch vụ <strong>bổ trợ</strong> nhau: một VM quan trọng thường vừa được Azure Backup (lưu giữ dài hạn) vừa được ASR (DR). Cả hai đều dùng <strong>Recovery Services vault</strong>.</p>

<h4>Chi phí cần cân nhắc</h4>
<ul>
  <li><strong>Protected instance</strong>: phí theo từng máy/workload được bảo vệ, phụ thuộc kích thước.</li>
  <li><strong>Storage</strong>: dung lượng trong vault theo LRS/ZRS/GRS; snapshot tier tính phí như snapshot đĩa.</li>
  <li>Giảm chi phí: chọn LRS cho dev/test, giảm retention không cần thiết, dùng selective disk backup, chuyển điểm dài hạn sang Archive.</li>
</ul>

<h4>Trung tâm quản lý</h4>
<p><strong>Resiliency</strong> (tên mới trên portal; trước đây là Azure Business Continuity Center, và trước nữa là Backup center) là giao diện tập trung để xem tình trạng bảo vệ, job, policy, alert của cả Azure Backup và Site Recovery trên nhiều vault, subscription và region; có thể phát hiện tài nguyên <em>chưa được bảo vệ</em>. Azure Policy có built-in policy để tự động bật backup cho VM theo tag.</p>

<div class="callout exam"><strong>Góc thi</strong>Đề thường mô tả nhu cầu rồi hỏi chọn dịch vụ. Từ khóa "<strong>giữ 7 năm</strong>", "<strong>khôi phục file bị xóa</strong>", "<strong>ransomware</strong>" thì chọn <strong>Azure Backup</strong>. Từ khóa "<strong>region outage</strong>", "<strong>failover</strong>", "<strong>RPO vài phút</strong>", "<strong>DR drill</strong>" thì chọn <strong>Azure Site Recovery</strong>.</div>
`
    },
    {
      id: 'rsv-vs-backup-vault',
      extra: true,
      title: 'Recovery Services vault và Backup vault',
      html: `
<p>Azure Backup dùng hai loại vault. Đây là điểm đề thi rất hay hỏi: <strong>workload nào đi với vault nào</strong>.</p>

<table>
  <thead><tr><th>Recovery Services vault</th><th>Backup vault</th></tr></thead>
  <tbody>
    <tr><td>Azure VM</td><td>Azure Managed Disks</td></tr>
    <tr><td>SQL Server trong Azure VM</td><td>Azure Blobs (operational/vaulted)</td></tr>
    <tr><td>SAP HANA trong Azure VM</td><td>Azure Database for PostgreSQL (server và flexible server)</td></tr>
    <tr><td>Azure Files</td><td>Azure Kubernetes Service (AKS)</td></tr>
    <tr><td>MARS agent (file, folder, system state)</td><td>Azure Data Lake Storage và một số workload mới khác</td></tr>
    <tr><td>MABS / System Center DPM</td><td></td></tr>
    <tr><td><strong>Azure Site Recovery</strong> (replication/DR)</td><td>Không hỗ trợ ASR</td></tr>
  </tbody>
</table>

<h4>Đặc điểm chung</h4>
<ul>
  <li>Cả hai là tài nguyên ARM, nằm trong một region, hỗ trợ RBAC, mã hóa, soft delete, immutability và redundancy LRS/ZRS/GRS.</li>
  <li>Vault <strong>phải cùng region</strong> với tài nguyên được backup (ví dụ VM ở East US cần vault ở East US).</li>
  <li>Chính sách backup (policy) nằm trong vault; mỗi item gắn với một policy.</li>
  <li>Xóa vault: phải dừng bảo vệ, xóa dữ liệu backup (kể cả item đang soft delete), hủy đăng ký server/storage account, xóa private endpoint trước.</li>
</ul>

<h4>Tạo vault</h4>
<pre><code># Recovery Services vault
az backup vault create -g rg-bk -n rsv-eastus -l eastus

# Backup vault (lệnh dataprotection)
az dataprotection backup-vault create -g rg-bk --vault-name bv-eastus -l eastus \\
  --type SystemAssigned \\
  --storage-settings datastore-type="VaultStore" type="LocallyRedundant"

# PowerShell
New-AzRecoveryServicesVault -Name rsv-eastus -ResourceGroupName rg-bk -Location eastus</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo Recovery Services vault và đặt redundancy</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trung tâm quản lý backup và thêm vault (trên portal hiện tại trang này tên là <strong>Resiliency</strong>, trước đây là Business Continuity Center / Backup center; cũng có thể vào thẳng <em>Recovery Services vaults › + Create</em>):<br><span class="path">Azure portal › Resiliency › Vault › + Vault › Recovery Services vault › Continue</span></li>
    <li>Điền thông tin cơ bản:
      <div class="blade">
        <div class="blade-title">Create Recovery Services vault</div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-bk</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Vault name</label><span class="pv">rsv-eastus</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">East US</span></div>
        <div class="pf"><label></label><span class="pv note">Cùng region với VM/workload cần backup; mỗi region một vault</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Bấm <strong>Create</strong>, chờ thông báo triển khai xong.</li>
    <li><strong>Trước khi bảo vệ item đầu tiên</strong>, kiểm tra redundancy:<br><span class="path">rsv-eastus › Settings › Properties › Backup Configuration › Update</span>
      <div class="blade">
        <div class="blade-title">Backup Configuration</div>
        <div class="pf"><label>Storage replication type</label><span class="pv radio">Geo-redundant</span></div>
        <div class="pf"><label></label><span class="pv note">Khác: Locally-redundant (rẻ nhất), Zone-redundant</span></div>
        <div class="pf"><label>Cross Region Restore</label><span class="pv radio">Enable</span></div>
        <div class="pf"><label></label><span class="pv note">Chỉ có khi chọn Geo-redundant; bật rồi không tắt lại được sau khi đã bảo vệ item</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span></div>
      </div>
    </li>
    <li>Cũng trong <em>Properties</em>, xem <strong>Security Settings</strong> (soft delete bật mặc định) và <strong>Cross Subscription Restore</strong> nếu cần.</li>
  </ol>
  </div>
</div>

<h4>Managed identity của Backup vault</h4>
<p>Backup vault dùng <strong>managed identity</strong> để truy cập tài nguyên được bảo vệ. Ví dụ khi backup Azure Disk, phải cấp cho identity của vault vai trò <strong>Disk Backup Reader</strong> trên đĩa và <strong>Disk Snapshot Contributor</strong> trên resource group lưu snapshot; khi backup Blob, cấp <strong>Storage Account Backup Contributor</strong> trên storage account.</p>

<div class="callout exam"><strong>Góc thi</strong>Đề hay cho danh sách tài nguyên (VM, file share, managed disk, blob container, SQL trong VM) ở nhiều region rồi hỏi "cần tối thiểu bao nhiêu vault". Cách giải: nhóm theo <strong>region</strong> và theo <strong>loại vault</strong>. Ví dụ VM East US + Disk East US cần 2 vault (RSV và Backup vault); VM East US + VM West US cần 2 RSV.</div>
`
    },
    {
      id: 'site-recovery',
      extra: true,
      title: 'Azure Site Recovery (ASR)',
      html: `
<p><strong>Azure Site Recovery</strong> là dịch vụ <strong>disaster recovery as a service (DRaaS)</strong>: replicate liên tục máy ảo sang một vị trí phụ, và khi có sự cố thì <strong>failover</strong> để ứng dụng chạy tiếp ở đó.</p>

<h4>Kịch bản hỗ trợ</h4>
<ul>
  <li><strong>Azure VM sang region Azure khác</strong> (Azure-to-Azure), hoặc giữa các availability zone trong cùng region (zone-to-zone, ở một số region).</li>
  <li><strong>VMware VM và máy vật lý</strong> on-premises sang Azure.</li>
  <li><strong>Hyper-V VM</strong> on-premises sang Azure.</li>
</ul>

<h4>Kiến trúc Azure-to-Azure</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Kiến trúc Azure Site Recovery Azure-to-Azure: VM nguồn ghi thay đổi qua cache storage, replicate liên tục sang replica disks ở region đích; failover tạo VM đích; re-protect replicate ngược lại">
  <rect class="zone" x="10" y="10" width="310" height="270" rx="12"/>
  <text x="165" y="36" text-anchor="middle" class="t-b">Region nguồn · East US</text>
  <rect class="box-a" x="35" y="60" width="260" height="60" rx="10"/>
  <text x="165" y="86" text-anchor="middle" class="t-b">VM production</text>
  <text x="165" y="106" text-anchor="middle" class="t-sm t-mute">Mobility service extension</text>
  <rect class="box-w" x="35" y="160" width="260" height="60" rx="10"/>
  <text x="165" y="186" text-anchor="middle" class="t-b">Cache storage account</text>
  <text x="165" y="206" text-anchor="middle" class="t-sm t-mute">đệm thay đổi trước khi gửi</text>
  <line class="ln" x1="165" y1="120" x2="165" y2="156" marker-end="url(#arr)"/>
  <text x="175" y="143" class="t-sm t-mute">ghi thay đổi</text>

  <rect class="zone" x="400" y="10" width="310" height="270" rx="12"/>
  <text x="555" y="36" text-anchor="middle" class="t-b">Region đích · West US</text>
  <rect class="box-a" x="425" y="50" width="260" height="50" rx="10"/>
  <text x="555" y="80" text-anchor="middle" class="t-b">Recovery Services vault</text>
  <rect class="box-w" x="425" y="120" width="260" height="50" rx="10"/>
  <text x="555" y="141" text-anchor="middle" class="t-b">Replica managed disks</text>
  <text x="555" y="159" text-anchor="middle" class="t-sm t-mute">+ recovery point, tối đa 15 ngày</text>
  <rect class="box" x="425" y="200" width="260" height="60" rx="10"/>
  <text x="555" y="226" text-anchor="middle" class="t-b">VM đích + VNet đích</text>
  <text x="555" y="246" text-anchor="middle" class="t-sm t-mute">chỉ được tạo khi failover</text>
  <line class="ln dash" x1="555" y1="170" x2="555" y2="196" marker-end="url(#arr)"/>
  <text x="565" y="188" class="t-sm">failover</text>

  <line class="ln-a" x1="295" y1="190" x2="421" y2="145" marker-end="url(#arr-a)"/>
  <text x="358" y="150" text-anchor="middle" class="t-sm t-a">replicate</text>
  <text x="358" y="190" text-anchor="middle" class="t-sm t-a">liên tục</text>
  <line class="ln-s dash" x1="425" y1="235" x2="299" y2="212" marker-end="url(#arr-s)"/>
  <text x="360" y="248" text-anchor="middle" class="t-sm t-s">re-protect</text>
  <text x="360" y="263" text-anchor="middle" class="t-sm t-s">failback</text>
</svg>
<figcaption>Hình 1. Vault của ASR nằm ở <strong>region đích</strong>. Dữ liệu replicate liên tục vào replica disks; VM đích chỉ xuất hiện khi failover (hoặc test failover). Sau failover, <strong>re-protect</strong> để replicate ngược về region gốc, rồi failback.</figcaption>
</figure>
<ul>
  <li>Recovery Services vault đặt ở <strong>region đích</strong> (khác region nguồn).</li>
  <li><strong>Mobility service extension</strong> được cài tự động vào VM, ghi lại thay đổi trên đĩa.</li>
  <li><strong>Cache storage account</strong> ở region nguồn đệm dữ liệu trước khi đẩy sang region đích.</li>
  <li>VM đích chỉ được tạo khi failover; trước đó bạn chỉ trả phí storage cho replica disk và phí ASR.</li>
  <li>Mỗi instance được miễn phí ASR trong <strong>31 ngày đầu</strong> (vẫn trả storage, compute khi failover).</li>
</ul>

<h4>Replication policy</h4>
<ul>
  <li><strong>Crash-consistent</strong> recovery point được tạo <strong>mỗi 5 phút</strong> (không đổi được).</li>
  <li><strong>App-consistent</strong> snapshot: tắt mặc định; bật với tần suất tối thiểu <strong>1 giờ</strong>. Dùng VSS trên Windows.</li>
  <li><strong>Retention</strong> điểm khôi phục: mặc định <strong>1 ngày</strong>, tối đa <strong>15 ngày</strong> (managed disk).</li>
  <li><strong>Multi-VM consistency</strong>: nhóm tối đa 16 VM có chung điểm khôi phục (ví dụ cụm SQL); tốn CPU, chỉ bật khi cần.</li>
</ul>

<h4>Recovery plan</h4>
<p>Gom các VM thành <strong>nhóm</strong> (tối đa 7 nhóm) để failover theo thứ tự (ví dụ database trước, web sau), chèn <strong>script/Azure Automation runbook</strong> hoặc <strong>manual action</strong> giữa các bước (gán public IP, cập nhật DNS…).</p>

<h4>Vòng đời DR</h4>
<ol class="steps">
  <li><strong>Enable replication</strong>: chọn VM, region đích, VNet đích, cache storage, replication policy. Chờ initial replication hoàn tất.</li>
  <li><strong>Test failover</strong>: tạo VM thử ở region đích trong một <strong>VNet cô lập</strong>, không ảnh hưởng replication hay production. Kiểm tra xong chọn <strong>Cleanup test failover</strong>.</li>
  <li><strong>Failover</strong> (khi có sự cố hoặc chủ động): chọn recovery point (<em>Latest</em> = RPO thấp nhất nhưng RTO cao hơn; <em>Latest processed</em> = RTO thấp; <em>Latest app-consistent</em>; hoặc custom). Failover <strong>không tự động</strong>, bạn phải kích hoạt.</li>
  <li><strong>Commit</strong>: xác nhận failover, xóa các recovery point khác.</li>
  <li><strong>Re-protect</strong>: VM ở region đích bắt đầu replicate ngược về region nguồn (VM sau failover không tự được bảo vệ).</li>
  <li><strong>Failback</strong>: failover ngược về region gốc khi đã khắc phục, rồi re-protect lần nữa.</li>
</ol>
<pre><code># Kiểm tra trạng thái replication bằng PowerShell
$vault = Get-AzRecoveryServicesVault -Name rsv-westus -ResourceGroupName rg-dr
Set-AzRecoveryServicesAsrVaultContext -Vault $vault
Get-AzRecoveryServicesAsrFabric</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Diễn tập DR mà <strong>không ảnh hưởng</strong> production và replication" thì dùng <strong>test failover</strong> vào VNet cô lập. "Sau khi failover, cần bảo vệ VM ở region mới" thì phải <strong>re-protect</strong>. "Nhiều VM phải failover theo thứ tự, kèm script cập nhật DNS" thì dùng <strong>recovery plan</strong>. Vault cho ASR Azure-to-Azure nằm ở <strong>region đích</strong>, khác với vault của Azure Backup phải cùng region với VM.</div>
`
    }
  ],
  keyFacts: [
    'Azure Backup hỗ trợ Azure VM, Azure Files, SQL Server/SAP HANA trong VM, Blob, Managed Disk, PostgreSQL, AKS và on-premises qua MARS, MABS/DPM.',
    '<strong>MARS agent</strong>: chỉ Windows, backup file/folder/system state trực tiếp lên vault, tối đa <strong>3 lần/ngày</strong>, cần passphrase mã hóa (mất passphrase là mất dữ liệu).',
    '<strong>MABS/DPM</strong>: backup Hyper-V, VMware, SQL, SharePoint, Exchange vào đĩa cục bộ rồi lên Azure (D2D2C).',
    '<strong>Recovery Services vault</strong>: Azure VM, SQL/SAP HANA trong VM, Azure Files, MARS, MABS/DPM, Site Recovery.',
    '<strong>Backup vault</strong>: Managed Disks, Blobs, Azure Database for PostgreSQL, AKS.',
    'Vault phải <strong>cùng region</strong> với tài nguyên được backup.',
    'Redundancy mặc định của vault là <strong>GRS</strong>; chỉ đổi được <strong>trước khi bảo vệ item đầu tiên</strong>. Có LRS, ZRS, GRS.',
    '<strong>Cross Region Restore</strong> cần vault GRS, restore ở paired region bất kỳ lúc nào.',
    '<strong>Soft delete</strong> giữ dữ liệu bị xóa thêm <strong>14 ngày</strong> miễn phí; chỉnh được 14–180 ngày; secure by default: không tắt được trên Recovery Services vault.',
    'ASR: crash-consistent point mỗi <strong>5 phút</strong>, app-consistent tối thiểu mỗi 1 giờ, retention mặc định 1 ngày, tối đa <strong>15 ngày</strong>.',
    'ASR miễn phí <strong>31 ngày đầu</strong> cho mỗi instance; vault ASR Azure-to-Azure đặt ở region đích.',
    'Recovery plan tối đa 7 nhóm VM; test failover chạy trong VNet cô lập không ảnh hưởng production.'
  ],
  traps: [
    'Chọn Recovery Services vault để backup <strong>Azure Managed Disk</strong> hoặc <strong>Blob</strong>. Các workload này dùng <strong>Backup vault</strong>.',
    'Tạo một vault ở region khác để backup VM. Vault backup phải <strong>cùng region</strong> với VM (ngược lại, vault ASR thì ở region đích).',
    'Định đổi vault từ GRS sang LRS sau khi đã bảo vệ VM. Phải đặt redundancy <strong>trước</strong> khi backup item đầu tiên.',
    'Bật Cross Region Restore trên vault LRS hoặc ZRS. CRR cần <strong>GRS</strong>.',
    'Dùng Azure Backup khi đề yêu cầu failover cả ứng dụng sang region khác với RPO vài phút. Đó là <strong>Azure Site Recovery</strong>.',
    'Cài MARS agent để backup máy Linux on-premises. MARS chỉ hỗ trợ <strong>Windows</strong>.',
    'Nghĩ rằng VM sau failover của ASR tự động được bảo vệ. Phải chạy <strong>re-protect</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Recovery Services vault</td><td>Azure VM, SQL/SAP HANA trong VM, Azure Files, MARS, MABS/DPM, ASR</td></tr>
    <tr><td>Backup vault</td><td>Managed Disk, Blob, PostgreSQL, AKS</td></tr>
    <tr><td>Vị trí vault (Backup)</td><td>Cùng region với tài nguyên</td></tr>
    <tr><td>Redundancy</td><td>LRS / ZRS / GRS (mặc định); đổi trước khi backup item đầu</td></tr>
    <tr><td>Cross Region Restore</td><td>Cần GRS, restore ở paired region</td></tr>
    <tr><td>Soft delete</td><td>14 ngày miễn phí; chỉnh 14–180 ngày; không tắt được (secure by default)</td></tr>
    <tr><td>MARS agent</td><td>Windows; file/folder/system state; 3 lần/ngày</td></tr>
    <tr><td>MABS/DPM</td><td>Hyper-V, VMware, SQL, SharePoint, Exchange; D2D2C</td></tr>
    <tr><td>ASR recovery point</td><td>Crash-consistent 5 phút; app-consistent ≥ 1 giờ; giữ tối đa 15 ngày</td></tr>
    <tr><td>ASR vòng đời</td><td>Enable → Test failover → Failover → Commit → Re-protect → Failback</td></tr>
    <tr><td>Backup vs ASR</td><td>Khôi phục dữ liệu, lưu dài hạn / Giữ ứng dụng chạy khi region sự cố</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'MARS agent backup được gì và trên OS nào?', back: 'File, folder, system state trên <strong>Windows</strong>. Tối đa 3 lần/ngày, gửi thẳng lên Recovery Services vault.' },
    { front: 'MABS khác MARS agent thế nào?', back: 'MABS là máy chủ backup on-premises bảo vệ Hyper-V/VMware VM, SQL, SharePoint, Exchange; lưu vào đĩa cục bộ rồi đẩy lên Azure (D2D2C). MARS chỉ backup file/folder/system state trực tiếp.' },
    { front: 'Workload nào dùng Backup vault?', back: '<strong>Managed Disks, Blobs, Azure Database for PostgreSQL, AKS</strong>.' },
    { front: 'Workload nào dùng Recovery Services vault?', back: 'Azure VM, SQL Server/SAP HANA trong VM, Azure Files, MARS, MABS/DPM và Azure Site Recovery.' },
    { front: 'Redundancy mặc định của Recovery Services vault?', back: '<strong>GRS</strong>. Đổi được sang LRS/ZRS chỉ trước khi bảo vệ item đầu tiên.' },
    { front: 'Cross Region Restore yêu cầu gì?', back: 'Vault dùng <strong>GRS</strong> và bật CRR; restore ở paired region bất kỳ lúc nào.' },
    { front: 'Soft delete giữ dữ liệu bao lâu?', back: '<strong>14 ngày</strong> bổ sung, miễn phí. Chỉnh được 14–180 ngày (phần vượt 14 ngày tính phí); trên Recovery Services vault không tắt được (secure by default).' },
    { front: 'RPO và RTO là gì?', back: 'RPO: lượng dữ liệu tối đa chấp nhận mất (theo thời gian). RTO: thời gian tối đa để khôi phục dịch vụ.' },
    { front: 'Multi-user authorization (MUA) dùng tài nguyên nào?', back: '<strong>Resource Guard</strong>; thao tác nhạy cảm cần phê duyệt thêm.' },
    { front: 'ASR tạo crash-consistent recovery point bao lâu một lần?', back: 'Mỗi <strong>5 phút</strong> (không đổi được).' },
    { front: 'Retention tối đa của recovery point trong ASR?', back: '<strong>15 ngày</strong> (managed disk); mặc định 1 ngày.' },
    { front: 'Test failover khác failover thế nào?', back: 'Test failover tạo VM trong <strong>VNet cô lập</strong>, không ảnh hưởng replication/production; sau đó cleanup.' },
    { front: 'Sau failover, làm sao để VM được bảo vệ lại?', back: 'Chạy <strong>re-protect</strong> để replicate ngược về region gốc.' },
    { front: 'Recovery plan dùng để làm gì?', back: 'Failover nhiều VM theo nhóm có thứ tự (tối đa 7 nhóm), chèn script/runbook/manual action.' },
    { front: 'Vault cho ASR Azure-to-Azure đặt ở đâu?', back: 'Ở <strong>region đích</strong> (khác region nguồn).' },
    { front: 'Vai trò RBAC nào chạy được backup/restore nhưng không xóa được dữ liệu backup?', back: '<strong>Backup Operator</strong>.' }
  ],
  quiz: [
    {
      q: 'Công ty có các tài nguyên ở East US: VM1 (Azure VM), Disk1 (managed disk độc lập), Share1 (Azure Files) và Blob1 (blob container). Bạn cần backup tất cả bằng Azure Backup với số vault ít nhất. Bạn cần tạo những loại vault nào?',
      options: ['Một Recovery Services vault', 'Một Backup vault', 'Một Recovery Services vault và một Backup vault', 'Bốn vault, mỗi tài nguyên một vault'],
      answer: [2],
      explain: 'VM1 và Share1 dùng Recovery Services vault; Disk1 và Blob1 dùng Backup vault. Vì cùng region, mỗi loại chỉ cần một vault. Một loại vault không đủ cho cả bốn workload, và không cần mỗi tài nguyên một vault.'
    },
    {
      q: 'Bạn có VM ở East US và West Europe. Bạn cần backup cả hai VM bằng Azure Backup. Số Recovery Services vault tối thiểu là bao nhiêu?',
      options: ['1', '2', '3', '4'],
      answer: [1],
      explain: 'Vault phải cùng region với VM được backup, nên cần một vault ở East US và một vault ở West Europe.'
    },
    {
      q: 'Bạn tạo Recovery Services vault và đã backup 20 VM. Ban quản lý muốn giảm chi phí bằng cách chuyển redundancy của vault từ GRS sang LRS. Bạn nên làm gì?',
      options: ['Đổi Storage replication type trong Properties của vault', 'Bật Cross Region Restore', 'Chuyển vault sang resource group khác', 'Tạo vault mới với LRS và cấu hình backup cho các VM vào vault mới'],
      answer: [3],
      explain: 'Storage redundancy chỉ đổi được trước khi vault có item được bảo vệ. Với vault đã có backup, cách thực tế là tạo vault mới với LRS. Cross Region Restore làm tăng chứ không giảm chi phí, còn di chuyển resource group không đổi redundancy.'
    },
    {
      q: 'Bạn cần backup file và folder trên 50 máy chủ Windows Server on-premises lên Azure, không triển khai thêm máy chủ backup nào. Bạn dùng gì?',
      options: ['Microsoft Azure Recovery Services (MARS) agent', 'Microsoft Azure Backup Server (MABS)', 'Azure Site Recovery', 'AzCopy theo lịch'],
      answer: [0],
      explain: 'MARS agent cài trực tiếp trên từng máy Windows và gửi file/folder/system state thẳng lên Recovery Services vault. MABS cần một máy chủ backup. ASR dùng cho disaster recovery chứ không phải backup file. AzCopy không phải giải pháp backup có quản lý điểm khôi phục.'
    },
    {
      q: 'Bạn cần bảo vệ các Hyper-V VM và cơ sở dữ liệu SQL Server on-premises, giữ bản sao gần nhất trên đĩa cục bộ để khôi phục nhanh và bản dài hạn trên Azure. Bạn triển khai gì?',
      options: ['MARS agent trên từng VM', 'Azure Site Recovery', 'Microsoft Azure Backup Server (MABS)', 'Backup vault'],
      answer: [2],
      explain: 'MABS bảo vệ Hyper-V VM và SQL Server, lưu vào đĩa cục bộ rồi đẩy lên Azure (D2D2C). MARS chỉ backup file/folder/system state. ASR là DR. Backup vault không hỗ trợ workload on-premises.'
    },
    {
      q: 'Yêu cầu: có thể restore VM được backup ở East US sang region phụ bất kỳ lúc nào để diễn tập, không chờ Microsoft tuyên bố thảm họa. Bạn cấu hình gì trên Recovery Services vault? (Chọn 2)',
      options: ['Đặt storage redundancy là GRS', 'Đặt storage redundancy là ZRS', 'Bật Cross Region Restore', 'Bật soft delete'],
      answer: [0, 2],
      explain: 'Cross Region Restore yêu cầu GRS và phải được bật ở vault. ZRS chỉ sao chép trong một region. Soft delete bảo vệ dữ liệu khi bị xóa, không liên quan đến restore ở region khác.'
    },
    {
      q: 'Một quản trị viên vô tình dừng bảo vệ và xóa dữ liệu backup của VM1 cách đây 5 ngày. Vault dùng cấu hình soft delete mặc định. Điều gì xảy ra?',
      options: ['Dữ liệu đã mất vĩnh viễn', 'Có thể undelete và khôi phục vì dữ liệu được giữ thêm 14 ngày', 'Chỉ khôi phục được nếu vault dùng GRS', 'Phải mở ticket hỗ trợ Microsoft để lấy lại'],
      answer: [1],
      explain: 'Soft delete giữ dữ liệu backup bị xóa thêm 14 ngày miễn phí, nên sau 5 ngày vẫn undelete được. Tính năng này không phụ thuộc redundancy và không cần ticket hỗ trợ.'
    },
    {
      q: 'Ứng dụng gồm 3 VM ở East US. Yêu cầu: khi East US gặp sự cố, ứng dụng phải chạy lại ở West US với lượng dữ liệu mất tối đa vài phút. Bạn dùng dịch vụ nào?',
      options: ['Azure Backup với chính sách hằng ngày', 'Azure Backup với Cross Region Restore', 'Snapshot đĩa thủ công', 'Azure Site Recovery'],
      answer: [3],
      explain: 'ASR replicate liên tục và tạo crash-consistent point mỗi 5 phút, cho phép failover sang region khác với RPO vài phút. Azure Backup có RPO theo lịch (ít nhất vài giờ) và restore chậm hơn. Snapshot thủ công không đáp ứng tự động hóa.'
    },
    {
      q: 'Bạn cần diễn tập DR hằng quý cho các VM được ASR bảo vệ, không được ảnh hưởng tới VM production và quá trình replication. Bạn làm gì?',
      options: ['Chạy test failover vào một VNet cô lập rồi cleanup', 'Chạy planned failover rồi failback', 'Tắt replication, khởi động VM ở region đích', 'Restore từ Recovery Services vault sang region phụ'],
      answer: [0],
      explain: 'Test failover tạo VM ở region đích trong VNet cô lập, không ảnh hưởng production và replication; xong thì cleanup. Failover thật làm gián đoạn production. Tắt replication làm mất bảo vệ. Restore từ backup không kiểm tra cấu hình ASR.'
    },
    {
      q: 'Bạn đã failover VM từ East US sang West US bằng ASR và commit. Bây giờ bạn cần VM ở West US được bảo vệ và có thể failback về East US sau này. Bước tiếp theo là gì?',
      options: ['Chạy test failover', 'Bật lại Azure Backup', 'Re-protect VM', 'Tạo recovery plan mới'],
      answer: [2],
      explain: 'VM sau failover ở trạng thái không được bảo vệ; re-protect bắt đầu replicate từ West US về East US để có thể failback. Test failover, Azure Backup và recovery plan không thiết lập replication ngược.'
    },
    {
      q: 'Bạn cần failover một ứng dụng nhiều tầng: database phải lên trước, web server lên sau, và cần chạy script cập nhật DNS sau khi web server khởi động. Bạn dùng tính năng nào của ASR?',
      options: ['Multi-VM consistency', 'Recovery plan với các nhóm và script/runbook', 'Replication policy với app-consistent snapshot mỗi giờ', 'Cross Region Restore'],
      answer: [1],
      explain: 'Recovery plan cho phép xếp VM vào các nhóm failover theo thứ tự và chèn script/Automation runbook hoặc manual action. Multi-VM consistency chỉ đồng bộ điểm khôi phục. App-consistent snapshot không điều phối thứ tự. Cross Region Restore là tính năng của Azure Backup.'
    },
    {
      q: 'Phát biểu nào về Azure Backup là ĐÚNG? (Chọn 2)',
      options: ['Azure Backup có thể giữ điểm khôi phục nhiều năm để đáp ứng yêu cầu tuân thủ', 'Azure Backup replicate VM liên tục với RPO 5 phút', 'Dữ liệu backup trong vault được mã hóa khi lưu trữ theo mặc định', 'Vault backup VM có thể đặt ở bất kỳ region nào'],
      answer: [0, 2],
      explain: 'Azure Backup hỗ trợ retention hằng năm nhiều năm và mã hóa dữ liệu bằng platform-managed key mặc định. Replication liên tục RPO 5 phút là của ASR. Vault backup phải cùng region với VM.'
    },
    {
      q: 'Bạn muốn ngăn một quản trị viên bị chiếm quyền giảm retention trong backup policy hoặc dừng bảo vệ kèm xóa dữ liệu backup mà không có phê duyệt từ nhóm bảo mật. Bạn dùng gì?',
      options: ['Resource lock ReadOnly trên vault', 'Gán vai trò Backup Reader cho quản trị viên', 'Multi-user authorization với Resource Guard', 'Chuyển vault sang LRS'],
      answer: [2],
      explain: 'MUA dùng Resource Guard do nhóm khác quản lý; các thao tác nhạy cảm cần thêm quyền trên Resource Guard. Lock ReadOnly chặn cả thao tác backup bình thường. Backup Reader không cho quản trị viên làm việc. Redundancy không liên quan.'
    },
    {
      q: 'Bạn cấu hình ASR cho VM ở North Europe, đích là West Europe. Recovery Services vault cho ASR nên đặt ở đâu?',
      options: ['North Europe', 'West Europe', 'Bất kỳ region nào ngoài hai region trên', 'Không cần vault cho ASR'],
      answer: [1],
      explain: 'Với Azure-to-Azure, vault ASR đặt ở region đích (khác region nguồn) để vẫn quản lý được failover khi region nguồn gặp sự cố. ASR luôn cần Recovery Services vault.'
    }
  ]
});

AZ.addModule({
  id: 'p6m2',
  summary: 'Module này đi sâu vào việc <strong>backup và restore Azure VM</strong>: cơ chế snapshot và Instant Restore, các mức nhất quán dữ liệu, backup policy Standard và Enhanced, và các lựa chọn khôi phục (tạo VM mới, restore disk, replace existing, khôi phục file, cross region restore). Đề AZ-104 thường hỏi chọn kiểu restore phù hợp, yêu cầu về region của vault và cách nhận cảnh báo khi backup thất bại.',
  objectives: [
    'Mô tả quy trình backup Azure VM: extension, snapshot, Instant Restore và chuyển dữ liệu vào vault',
    'Phân biệt application-consistent, file-system consistent và crash-consistent',
    'Tạo backup policy Standard/Enhanced phù hợp với RPO và yêu cầu lưu giữ',
    'Bật backup cho VM, chạy backup on-demand bằng portal, CLI và PowerShell',
    'Chọn đúng phương án restore: tạo VM mới, restore disks, replace existing, file recovery, cross region restore',
    'Cấu hình Backup reports, alert và action group để giám sát backup'
  ],
  sections: [
    {
      id: 'features-scenarios',
      unit: 'Azure Backup features and scenarios',
      title: 'Tính năng và kịch bản backup VM',
      html: `
<p>Azure Backup bảo vệ Azure VM ở <strong>mức toàn bộ máy</strong> (tất cả managed disk) mà không cần agent riêng trong hệ điều hành: chỉ cần backup extension do Azure Backup tự cài. Từ một bản backup, bạn có thể khôi phục <strong>cả VM, từng đĩa, hoặc từng file</strong>.</p>

<h4>Các kịch bản phổ biến</h4>
<ul>
  <li><strong>Xóa nhầm hoặc hỏng dữ liệu</strong>: khôi phục file hoặc đĩa từ điểm khôi phục trước sự cố.</li>
  <li><strong>Ransomware</strong>: dữ liệu trong vault cô lập, kết hợp soft delete và immutable vault.</li>
  <li><strong>Cập nhật hỏng hệ điều hành</strong>: chạy backup on-demand trước khi vá, có sự cố thì replace existing.</li>
  <li><strong>Nhân bản môi trường</strong>: restore disks rồi tạo VM mới để kiểm thử/điều tra.</li>
  <li><strong>Tuân thủ</strong>: giữ điểm hằng tháng/hằng năm nhiều năm (có thể chuyển sang tầng Archive).</li>
</ul>

<h4>Mức nhất quán của snapshot</h4>
<table>
  <thead><tr><th>Loại</th><th>Ý nghĩa</th><th>Khi nào có</th></tr></thead>
  <tbody>
    <tr><td><strong>Application-consistent</strong></td><td>Bắt cả dữ liệu trong bộ nhớ và giao dịch đang dở; ứng dụng (SQL, Exchange…) khởi động lại không cần sửa lỗi</td><td>Windows: <strong>VSS</strong>. Linux: khi có <strong>pre-script/post-script</strong> đóng băng ứng dụng</td></tr>
    <tr><td><strong>File-system consistent</strong></td><td>Hệ thống file nhất quán, ứng dụng có thể cần cơ chế tự phục hồi</td><td>Linux không có pre/post script; Windows khi VSS lỗi</td></tr>
    <tr><td><strong>Crash-consistent</strong></td><td>Giống như rút điện máy: chỉ có dữ liệu đã nằm trên đĩa</td><td>VM đang <strong>tắt (deallocated)</strong> lúc backup, hoặc extension không phản hồi</td></tr>
  </tbody>
</table>

<h4>Tính năng đáng chú ý</h4>
<ul>
  <li><strong>Instant Restore</strong>: snapshot được giữ cạnh đĩa (snapshot tier) để restore nhanh, không chờ dữ liệu trong vault.</li>
  <li><strong>Incremental backup</strong>: chỉ chuyển block thay đổi, giảm thời gian và dung lượng.</li>
  <li><strong>Selective disk backup</strong>: loại trừ data disk không quan trọng để giảm chi phí.</li>
  <li><strong>Backup VM đã tắt</strong>: vẫn backup được (kết quả crash-consistent).</li>
  <li><strong>Hỗ trợ VM mã hóa</strong> (Azure Disk Encryption, SSE với CMK) và Trusted Launch VM.</li>
  <li><strong>Cross Region Restore</strong> khi vault dùng GRS.</li>
</ul>

<h4>Snapshot backup khác snapshot đĩa thủ công thế nào?</h4>
<div class="compare">
  <div><strong>Azure Backup</strong>Theo lịch tự động, app-consistent, nhiều điểm khôi phục, retention dài hạn, dữ liệu lưu trong vault cô lập, có soft delete, khôi phục file-level.</div>
  <div><strong>Snapshot đĩa thủ công</strong>Bản sao một đĩa tại một thời điểm, nằm trong subscription của bạn (xóa được), không tự động hóa, crash-consistent nếu VM đang chạy.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần backup app-consistent cho VM Linux chạy MySQL" thì phải cấu hình <strong>pre-script/post-script</strong>; nếu không, bản backup chỉ là file-system consistent. "VM đã deallocated vẫn có thể backup không?" Có, nhưng là <strong>crash-consistent</strong>.</div>
`
    },
    {
      id: 'backup-vm',
      unit: 'Back up an Azure virtual machine by using Azure Backup',
      title: 'Backup Azure VM: quy trình và backup policy',
      html: `
<h4>Quy trình một job backup</h4>
<ol class="steps">
  <li>Lần đầu bật backup, Azure Backup cài <strong>backup extension</strong> (VMSnapshot cho Windows, VMSnapshotLinux cho Linux). VM cần đang chạy và có Azure VM Agent.</li>
  <li><strong>Giai đoạn 1 – Take snapshot</strong>: chụp snapshot các đĩa. Ngay khi xong, đã có recovery point loại <em>snapshot</em> dùng được để restore.</li>
  <li><strong>Giai đoạn 2 – Transfer data to vault</strong>: dữ liệu được chuyển vào vault; recovery point đổi thành <em>snapshot and vault</em>. Giai đoạn này có thể mất hàng giờ nhưng không ảnh hưởng VM.</li>
  <li>Snapshot được giữ theo thời gian <strong>Instant Restore</strong> trong policy, sau đó bị xóa; dữ liệu trong vault được giữ theo retention.</li>
</ol>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 215" role="img" aria-label="Hai giai đoạn của job backup VM: Take snapshot tạo recovery point dùng cho Instant Restore, Transfer data to vault tạo bản lưu dài hạn">
  <rect class="box-a" x="10" y="75" width="120" height="60" rx="10"/>
  <text x="70" y="101" text-anchor="middle" class="t-b">Azure VM</text>
  <text x="70" y="121" text-anchor="middle" class="t-sm t-mute">VMSnapshot ext.</text>

  <rect class="box-s" x="165" y="15" width="220" height="70" rx="10"/>
  <text x="275" y="42" text-anchor="middle" class="t-b">① Take snapshot</text>
  <text x="275" y="64" text-anchor="middle" class="t-sm">recovery point loại Snapshot</text>
  <rect class="box-a" x="165" y="130" width="220" height="70" rx="10"/>
  <text x="275" y="157" text-anchor="middle" class="t-b">② Transfer data to vault</text>
  <text x="275" y="179" text-anchor="middle" class="t-sm">loại Snapshot and vault</text>
  <line class="ln" x1="275" y1="85" x2="275" y2="126" marker-end="url(#arr)"/>
  <text x="285" y="110" class="t-sm t-mute">có thể mất vài giờ</text>

  <rect class="box-s" x="470" y="15" width="240" height="70" rx="10"/>
  <text x="590" y="42" text-anchor="middle" class="t-b">Instant Restore</text>
  <text x="590" y="64" text-anchor="middle" class="t-sm">từ snapshot · Standard 1–5 ngày</text>
  <rect class="box" x="470" y="130" width="240" height="70" rx="10"/>
  <text x="590" y="157" text-anchor="middle" class="t-b">Restore từ vault</text>
  <text x="590" y="179" text-anchor="middle" class="t-sm">theo retention daily…yearly</text>

  <line class="ln-a" x1="130" y1="90" x2="161" y2="58" marker-end="url(#arr-a)"/>
  <line class="ln-s" x1="385" y1="50" x2="466" y2="50" marker-end="url(#arr-s)"/>
  <line class="ln" x1="385" y1="165" x2="466" y2="165" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Ngay sau giai đoạn ① đã có recovery point dùng được (khôi phục nhanh từ snapshot). Giai đoạn ② chép dữ liệu vào vault để giữ dài hạn; khi snapshot hết hạn Instant Restore, việc restore phải lấy từ vault nên chậm hơn.</figcaption>
</figure>

<h4>Yêu cầu quan trọng</h4>
<ul>
  <li>Recovery Services vault phải <strong>cùng region</strong> với VM.</li>
  <li>Mỗi VM chỉ được bảo vệ bởi <strong>một vault</strong> tại một thời điểm.</li>
  <li>VM cần kết nối outbound tới Azure Backup và Azure Storage (dùng service tag <code>AzureBackup</code>, <code>Storage</code>, <code>AzureActiveDirectory</code> nếu NSG hạn chế).</li>
</ul>

<h4>Backup policy: Standard và Enhanced</h4>
<table>
  <thead><tr><th></th><th>Standard</th><th>Enhanced</th></tr></thead>
  <tbody>
    <tr><td>Tần suất</td><td>Daily (1 lần/ngày) hoặc Weekly</td><td><strong>Hourly</strong> (mỗi 4, 6, 8, 12 hoặc 24 giờ), Daily, Weekly</td></tr>
    <tr><td>Instant Restore (snapshot)</td><td>1–5 ngày, mặc định <strong>2 ngày</strong> (weekly cố định 5 ngày)</td><td>1–30 ngày, mặc định <strong>7 ngày</strong></td></tr>
    <tr><td>Loại snapshot</td><td>Incremental blob snapshot</td><td>Managed disk snapshot (lần đầu full, sau đó incremental), lưu ZRS</td></tr>
    <tr><td>Hỗ trợ</td><td>Đĩa Standard HDD/SSD, Premium SSD</td><td>Thêm <strong>Premium SSD v2, Ultra Disk</strong>, Trusted Launch, multi-disk crash-consistent</td></tr>
    <tr><td>Chuyển đổi</td><td colspan="2">Không thể chuyển VM từ Enhanced về Standard (có hỗ trợ di chuyển Standard sang Enhanced)</td></tr>
  </tbody>
</table>
<p><strong>Retention</strong> gồm các mức daily, weekly, monthly, yearly. Policy mặc định <code>DefaultPolicy</code> backup hằng ngày và giữ 30 ngày. Retention của vault phải dài hơn thời gian giữ snapshot.</p>

<h4>Bật backup</h4>
<p>Portal: từ trang VM chọn <em>Operations &gt; Backup</em>, hoặc từ vault chọn <em>+ Backup &gt; Azure &gt; Virtual machine</em>, chọn policy, chọn VM, <em>Enable backup</em>. Có thể bật ngay khi tạo VM (tab Management).</p>
<pre><code># Azure CLI
az backup protection enable-for-vm -g rg-bk --vault-name rsv-eastus \\
  --vm vm-web01 --policy-name DefaultPolicy

# Backup on-demand, giữ đến ngày chỉ định (dd-mm-yyyy)
az backup protection backup-now -g rg-bk --vault-name rsv-eastus \\
  --container-name vm-web01 --item-name vm-web01 \\
  --backup-management-type AzureIaaSVM --retain-until 31-12-2026

az backup job list -g rg-bk --vault-name rsv-eastus -o table

# Azure PowerShell
$vault = Get-AzRecoveryServicesVault -ResourceGroupName rg-bk -Name rsv-eastus
$pol = Get-AzRecoveryServicesBackupProtectionPolicy -Name DefaultPolicy -VaultId $vault.ID
Enable-AzRecoveryServicesBackupProtection -Policy $pol -Name vm-web01 -ResourceGroupName rg-web -VaultId $vault.ID</code></pre>

<h4>Dừng bảo vệ</h4>
<div class="compare">
  <div><strong>Stop backup and retain backup data</strong>Ngừng tạo bản mới, giữ điểm khôi phục cũ vô thời hạn (vẫn tính phí storage). Có thể resume sau.</div>
  <div><strong>Stop backup and delete backup data</strong>Xóa điểm khôi phục; dữ liệu chuyển sang trạng thái soft delete 14 ngày.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần RPO 4 giờ cho VM" thì phải dùng <strong>Enhanced policy</strong> (Standard chỉ 1 lần/ngày). "VM dùng Premium SSD v2/Ultra Disk" cũng bắt buộc Enhanced. "VM ở West Europe nhưng vault ở North Europe" thì <strong>không bật backup được</strong>; cần vault ở West Europe.</div>
`
    },
    {
      id: 'exercise-backup',
      unit: 'Exercise - Back up an Azure virtual machine',
      title: 'Thực hành: backup một Azure VM',
      html: `
<p>Bài thực hành tạo VM, tạo Recovery Services vault và bật backup, sau đó chạy backup on-demand. Có thể làm toàn bộ trong Cloud Shell.</p>

<ol class="steps">
  <li>Tạo resource group và VM (ví dụ Windows Server):
<pre><code>az group create -n rg-bk-lab -l eastus
az vm create -g rg-bk-lab -n vm-lab01 --image Win2022Datacenter \\
  --admin-username azureuser --admin-password "&lt;mật-khẩu-mạnh&gt;" --size Standard_B2s</code></pre></li>
  <li>Tạo Recovery Services vault <strong>cùng region</strong> với VM, và chỉnh redundancy nếu cần (trước khi bảo vệ item đầu tiên):
<pre><code>az backup vault create -g rg-bk-lab -n rsv-lab -l eastus
az backup vault backup-properties set -g rg-bk-lab -n rsv-lab --backup-storage-redundancy LocallyRedundant</code></pre></li>
  <li>Bật backup với policy mặc định:
<pre><code>az backup protection enable-for-vm -g rg-bk-lab --vault-name rsv-lab --vm vm-lab01 --policy-name DefaultPolicy</code></pre></li>
  <li>Chạy backup ngay (on-demand):
<pre><code>az backup protection backup-now -g rg-bk-lab --vault-name rsv-lab \\
  --container-name vm-lab01 --item-name vm-lab01 --backup-management-type AzureIaaSVM</code></pre></li>
  <li>Theo dõi job: portal <em>Vault &gt; Backup jobs</em>, hoặc <code>az backup job list -g rg-bk-lab --vault-name rsv-lab -o table</code>. Job có hai bước: <em>Take Snapshot</em> và <em>Transfer data to vault</em>.</li>
  <li>Trên trang VM, mục <em>Backup</em> hiển thị trạng thái, recovery point mới nhất và policy đang áp dụng.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: bật backup ngay từ trang VM</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang Backup của VM (cách khác: <em>Resiliency › + Configure protection</em>, hoặc từ vault):<br><span class="path">Azure portal › Virtual machines › vm-lab01 › Backup</span> (mục Backup nằm trong nhóm menu về backup/DR của VM; tên nhóm có thể thay đổi theo phiên bản portal)</li>
    <li>Chọn vault và policy, rồi bấm <strong>Enable backup</strong>:
      <div class="blade">
        <div class="blade-title">vm-lab01 | Backup</div>
        <div class="pf"><label>Recovery Services vault</label><span class="pv radio">Select existing</span></div>
        <div class="pf"><label class="req">Vault</label><span class="pv sel">rsv-lab (rg-bk-lab)</span></div>
        <div class="pf"><label></label><span class="pv note">Chỉ liệt kê vault cùng region với VM</span></div>
        <div class="pf"><label>Policy sub type</label><span class="pv radio">Standard</span></div>
        <div class="pf"><label></label><span class="pv note">Enhanced: nhiều lần mỗi ngày (hourly), cần cho Premium SSD v2/Ultra Disk</span></div>
        <div class="pf"><label class="req">Choose backup policy</label><span class="pv sel">DefaultPolicy</span></div>
        <div class="pf"><label></label><span class="pv note">Daily, giữ 30 ngày, Instant Restore 2 ngày</span></div>
        <div class="pbtns"><span class="pbtn primary">Enable backup</span></div>
      </div>
    </li>
    <li>Sau khi bật (extension được cài tự động), quay lại trang <em>Backup</em> của VM và bấm <strong>Backup now</strong>. Chọn ngày giữ bản on-demand rồi bấm <strong>OK</strong>:
      <div class="blade">
        <div class="blade-title">Backup Now</div>
        <div class="pf"><label class="req">Giữ recovery point đến ngày</label><span class="pv">06/12/2026 (chọn bằng lịch)</span></div>
        <div class="pbtns"><span class="pbtn primary">OK</span></div>
      </div>
    </li>
    <li>Theo dõi job ở <em>Backup jobs</em> (của vault hoặc Resiliency): chi tiết job có hai sub task <strong>Take Snapshot</strong> và <strong>Transfer data to vault</strong>.</li>
  </ol>
  </div>
</div>

<h4>Kiểm tra trong portal</h4>
<table>
  <thead><tr><th>Nơi xem</th><th>Thông tin</th></tr></thead>
  <tbody>
    <tr><td>Vault &gt; Backup items &gt; Azure Virtual Machine</td><td>Danh sách VM được bảo vệ, trạng thái backup gần nhất, pre-check</td></tr>
    <tr><td>Vault &gt; Backup policies</td><td>Lịch, retention, Instant Restore của từng policy</td></tr>
    <tr><td>Vault &gt; Backup jobs</td><td>Tiến độ, thời lượng, lỗi của từng job</td></tr>
    <tr><td>Vault &gt; Properties</td><td>Storage redundancy, Cross Region Restore, security settings (soft delete, MUA)</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Mẹo dọn dẹp</strong>Không xóa được resource group chứa vault khi vault còn item được bảo vệ. Hãy <em>Stop backup and delete backup data</em>, xử lý item ở trạng thái soft delete (hoặc tắt soft delete trong lab), rồi mới xóa vault.</div>
`
    },
    {
      id: 'restore-vm',
      unit: 'Restore virtual machine data',
      title: 'Các phương án khôi phục VM',
      html: `
<p>Từ <em>Backup items</em> hoặc trang Backup của VM, chọn <strong>Restore VM</strong> hoặc <strong>File Recovery</strong>, rồi chọn recovery point. Nếu recovery point còn ở snapshot tier, restore sẽ nhanh hơn nhiều (Instant Restore).</p>

<table>
  <thead><tr><th>Phương án</th><th>Mô tả</th><th>Dùng khi</th></tr></thead>
  <tbody>
    <tr><td><strong>Create new VM</strong></td><td>Tạo nhanh VM cơ bản từ recovery point; chọn tên, resource group, VNet/subnet, staging location. Tên VM không được trùng với VM đang có</td><td>Cần một VM chạy được ngay, không cần tùy biến nhiều</td></tr>
    <tr><td><strong>Restore disks</strong></td><td>Tạo các managed disk vào resource group đích, kèm <strong>template</strong> để tạo VM</td><td>Cần tùy biến VM (đổi size, đưa vào availability set, thêm extension), hoặc gắn đĩa vào VM khác</td></tr>
    <tr><td><strong>Replace existing</strong></td><td>Khôi phục đĩa và <strong>thay thế đĩa của VM hiện tại</strong>, giữ nguyên cấu hình VM (NIC, IP…). VM phải còn tồn tại; cần staging location</td><td>VM vẫn còn nhưng dữ liệu/OS bị hỏng (ví dụ cập nhật lỗi)</td></tr>
    <tr><td><strong>Cross Region Restore</strong></td><td>Restore (VM mới hoặc disks) ở <strong>paired region</strong> từ dữ liệu replicate</td><td>Region chính gặp sự cố hoặc cần diễn tập, vault GRS + CRR</td></tr>
    <tr><td><strong>File Recovery</strong></td><td>Mount recovery point như ổ đĩa để chép từng file</td><td>Chỉ cần lấy lại vài file/folder</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 318" role="img" aria-label="Năm phương án khôi phục từ một recovery point của Azure VM">
  <rect class="box-a" x="10" y="135" width="170" height="50" rx="10"/>
  <text x="95" y="158" text-anchor="middle" class="t-b">Recovery point</text>
  <text x="95" y="176" text-anchor="middle" class="t-sm t-mute">snapshot / vault</text>

  <rect class="box-s" x="260" y="10" width="450" height="50" rx="10"/>
  <text x="275" y="31" class="t-b">Create new VM</text>
  <text x="275" y="49" class="t-sm">VM mới nhanh với cấu hình cơ bản; tên VM chưa tồn tại</text>
  <rect class="box" x="260" y="72" width="450" height="50" rx="10"/>
  <text x="275" y="93" class="t-b">Restore disks</text>
  <text x="275" y="111" class="t-sm">tạo managed disk + template → tùy biến size, availability set</text>
  <rect class="box-w" x="260" y="134" width="450" height="50" rx="10"/>
  <text x="275" y="155" class="t-b">Replace existing</text>
  <text x="275" y="173" class="t-sm">thay đĩa của VM đang có, giữ nguyên NIC/IP và cấu hình</text>
  <rect class="box-e" x="260" y="196" width="450" height="50" rx="10"/>
  <text x="275" y="217" class="t-b">Cross Region Restore</text>
  <text x="275" y="235" class="t-sm">restore ở paired region (vault GRS + bật CRR)</text>
  <rect class="box-a" x="260" y="258" width="450" height="50" rx="10"/>
  <text x="275" y="279" class="t-b">File Recovery</text>
  <text x="275" y="297" class="t-sm">mount recovery point qua iSCSI, chép từng file (hiệu lực 12 giờ)</text>

  <line class="ln" x1="180" y1="160" x2="256" y2="35" marker-end="url(#arr)"/>
  <line class="ln" x1="180" y1="160" x2="256" y2="97" marker-end="url(#arr)"/>
  <line class="ln" x1="180" y1="160" x2="256" y2="159" marker-end="url(#arr)"/>
  <line class="ln" x1="180" y1="160" x2="256" y2="221" marker-end="url(#arr)"/>
  <line class="ln" x1="180" y1="160" x2="256" y2="283" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Cùng một recovery point có thể khôi phục theo năm cách. Chọn theo câu hỏi: cần cả VM mới, cần tùy biến VM, giữ nguyên VM hiện có, khôi phục ở region khác, hay chỉ vài file.</figcaption>
</figure>

<h4>Restore disks và tùy biến</h4>
<pre><code># Liệt kê recovery point
az backup recoverypoint list -g rg-bk --vault-name rsv-eastus \\
  --container-name vm-web01 --item-name vm-web01 --backup-management-type AzureIaaSVM -o table

# Restore disks vào resource group đích
az backup restore restore-disks -g rg-bk --vault-name rsv-eastus \\
  --container-name vm-web01 --item-name vm-web01 --rp-name &lt;rp-name&gt; \\
  --storage-account stbkstaging --target-resource-group rg-restore

# PowerShell
$rp = Get-AzRecoveryServicesBackupRecoveryPoint -Item $item -VaultId $vault.ID
Restore-AzRecoveryServicesBackupItem -RecoveryPoint $rp[0] -StorageAccountName stbkstaging \\
  -StorageAccountResourceGroupName rg-bk -TargetResourceGroupName rg-restore -VaultId $vault.ID</code></pre>
<p>Sau khi job xong, mục <em>Restore job details</em> có link tới <strong>template</strong>; bạn deploy template (có thể sửa tham số) để tạo VM, hoặc tạo VM từ OS disk đã khôi phục rồi gắn data disk.</p>

<h4>File recovery (item-level recovery)</h4>
<ol class="steps">
  <li>Chọn <strong>File Recovery</strong>, chọn recovery point.</li>
  <li>Tải <strong>executable</strong> (Windows) hoặc <strong>Python script</strong> (Linux); script được bảo vệ bằng <strong>mật khẩu</strong> hiển thị trên portal.</li>
  <li>Chạy script với quyền admin trên máy có OS tương thích: script kết nối tới recovery point qua <strong>iSCSI</strong> (cổng outbound 3260) và mount các volume thành ổ đĩa.</li>
  <li>Chép file cần thiết.</li>
  <li>Bấm <strong>Unmount disks</strong> trên portal. Kết nối chỉ đọc và script chỉ có hiệu lực <strong>12 giờ</strong>.</li>
</ol>
<ul>
  <li>Phù hợp khi tổng dung lượng cần khôi phục nhỏ (khuyến nghị ≤ 10 GB).</li>
  <li>Không chạy script trên chính VM nguồn nếu VM có Storage Spaces, dynamic disk spanned/striped, hoặc LVM/RAID (Linux); dùng máy khác có OS tương thích.</li>
  <li>Không hỗ trợ khôi phục file từ backup của VM được mã hóa bằng ADE.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Chỉ cần một file bị xóa, ít công sức nhất" thì <strong>File Recovery</strong>. "VM vẫn tồn tại, cần quay về trạng thái hôm qua mà giữ nguyên NIC/IP" thì <strong>Replace existing</strong>. "Cần VM khôi phục với size khác hoặc đưa vào availability set" thì <strong>Restore disks</strong> rồi dùng template. "Region gốc ngừng hoạt động" thì <strong>Cross Region Restore</strong> (cần GRS).</div>
`
    },
    {
      id: 'exercise-restore',
      unit: 'Exercise - Restore Azure virtual machine data',
      title: 'Thực hành: khôi phục dữ liệu VM',
      html: `
<p>Bài thực hành giả lập việc mất một file trên VM rồi khôi phục bằng File Recovery, sau đó thử restore toàn bộ VM.</p>

<h4>Phần 1: Khôi phục file</h4>
<ol class="steps">
  <li>Đảm bảo VM đã có ít nhất một recovery point (xem <em>Backup items</em>).</li>
  <li>Kết nối RDP/SSH vào VM, xóa thử một file (ví dụ trong <code>C:\\data</code> hoặc <code>/home/azureuser</code>).</li>
  <li>Trên portal: <em>VM &gt; Backup &gt; File Recovery</em>, chọn recovery point trước thời điểm xóa.</li>
  <li><strong>Download Executable</strong> (Windows) hoặc <strong>Download Script</strong> (Linux), sao chép mật khẩu.</li>
  <li>Chạy executable với quyền Administrator (Linux: <code>chmod +x script.py</code> rồi <code>sudo ./script.py</code>), nhập mật khẩu. Các volume của recovery point xuất hiện như ổ đĩa mới.</li>
  <li>Chép file từ ổ đĩa vừa mount về vị trí gốc.</li>
  <li>Quay lại portal, chọn <strong>Unmount Disks</strong>.</li>
</ol>

<figure class="fig"><img src="assets/img/p6m2/file-recovery.png" alt="Trang File Recovery của VM với ba bước: Select restore point, Download Executable kèm mật khẩu, Unmount Disks" loading="lazy"><figcaption>Hình 1. Trang <em>File Recovery</em> trên portal: Step 1 chọn restore point, Step 2 tải executable/script (kèm mật khẩu cần để chạy, ổ đĩa được mount tối đa 12 giờ), Step 3 <strong>Unmount Disks</strong> sau khi chép xong. Nguồn: <a href="https://learn.microsoft.com/azure/backup/backup-azure-restore-files-from-vm" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Phần 2: Khôi phục cả VM</h4>
<ol class="steps">
  <li><em>Vault &gt; Backup items &gt; Azure Virtual Machine &gt; vm-lab01 &gt; Restore VM</em>.</li>
  <li>Chọn recovery point; chọn <strong>Create new</strong> với Restore type <strong>Create new virtual machine</strong>, đặt tên VM mới, chọn VNet/subnet và <strong>staging location</strong> (storage account cùng region).</li>
  <li>Hoặc chọn <strong>Replace existing</strong> để thay đĩa của VM hiện có.</li>
  <li>Bấm <strong>Restore</strong> và theo dõi trong <em>Backup jobs</em> (loại Restore).</li>
  <li>Kiểm tra VM mới hoạt động, rồi xóa để tiết kiệm chi phí.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: màn hình Restore Virtual Machine</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở chức năng restore (cách khác: <em>Resiliency › Recover</em>, chọn Datasource type <em>Azure Virtual machines</em> và protected item):<br><span class="path">Azure portal › Virtual machines › vm-lab01 › Backup › Restore VM</span></li>
    <li>Chọn restore point, cấu hình và bấm <strong>Restore</strong>:
      <div class="blade">
        <div class="blade-title">Restore Virtual Machine</div>
        <div class="pf"><label class="req">Restore point</label><span class="pv">06/11/2026, 02:10 AM · Select</span></div>
        <div class="blade-sec">Restore Configuration</div>
        <div class="pf"><label></label><span class="pv radio">Create new</span></div>
        <div class="pf"><label></label><span class="pv note">Hoặc Replace existing (Restore Type: Replace disk/s)</span></div>
        <div class="pf"><label class="req">Restore Type</label><span class="pv sel">Create new virtual machine</span></div>
        <div class="pf"><label></label><span class="pv note">Hoặc Restore disks để tự tạo VM từ template</span></div>
        <div class="pf"><label class="req">Virtual machine name</label><span class="pv">vm-lab01-restored</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-restore</span></div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-lab</span></div>
        <div class="pf"><label class="req">Subnet</label><span class="pv sel">default</span></div>
        <div class="pf"><label class="req">Staging Location</label><span class="pv sel">stbkstaging</span></div>
        <div class="pf"><label></label><span class="pv note">Storage account cùng region với vault</span></div>
        <div class="pbtns"><span class="pbtn primary">Restore</span></div>
      </div>
    </li>
    <li>Theo dõi job loại <em>Restore</em> trong <strong>Backup jobs</strong>. Chỉ dùng <strong>Replace existing</strong> khi sub task <em>Transfer data to vault</em> của recovery point đó đã hoàn tất.</li>
  </ol>
  </div>
</div>

<h4>Lưu ý khi restore</h4>
<ul>
  <li>VM khôi phục bằng <em>Create new</em> không giữ các extension, public IP hay cấu hình boot diagnostics tùy biến của VM gốc; cần cấu hình lại nếu cần.</li>
  <li>Staging location phải là storage account cùng region với vault và VM đích.</li>
  <li>Quyền tối thiểu để restore: vai trò <strong>Backup Operator</strong> trên vault , <strong>Contributor</strong> ở resource group đích, Virtual Machine Contributor trên VM nguồn và Storage Account Contributor trên staging storage account (khi restore disk/VM mới). Backup Operator <strong>không</strong> được tạo/sửa backup policy hay stop backup (việc của Backup Contributor).</li>
</ul>

<div class="callout tip"><strong>Mẹo</strong>Trước khi patch VM quan trọng, chạy <strong>backup on-demand</strong>. Nếu patch hỏng, dùng recovery point đó với <strong>Replace existing</strong> để quay lại nhanh mà giữ nguyên IP và cấu hình mạng.</div>
`
    },
    {
      id: 'reports-alerts',
      extra: true,
      title: 'Backup reports và alerts',
      html: `
<h4>Giám sát nhanh</h4>
<ul>
  <li><strong>Backup jobs</strong> trong vault: trạng thái từng job backup/restore (InProgress, Completed, Failed), lỗi và khuyến nghị.</li>
  <li><strong>Resiliency</strong> (tên mới trên portal; trước đây là Azure Business Continuity Center / Backup center): xem tập trung job, item, policy, alert trên nhiều vault, subscription, region; phát hiện tài nguyên chưa được bảo vệ.</li>
  <li><strong>Metrics</strong> của vault: <em>Backup Health Events</em>, <em>Restore Health Events</em> dùng được cho metric alert.</li>
</ul>

<h4>Backup Reports</h4>
<p>Backup Reports dùng <strong>Log Analytics</strong> và <strong>Azure Workbooks</strong> để phân tích dài hạn: job, backup item, mức dùng storage, policy, mức tuân thủ policy (policy adherence) và gợi ý tối ưu chi phí.</p>
<ol class="steps">
  <li>Tạo (hoặc dùng) một <strong>Log Analytics workspace</strong>. Workspace có thể khác region/subscription với vault. Tăng retention nếu cần xem dữ liệu dài hơn 30 ngày mặc định.</li>
  <li>Trên mỗi vault, tạo <strong>diagnostic settings</strong> gửi các category của Azure Backup tới workspace (chế độ <strong>resource-specific</strong>). Có built-in <strong>Azure Policy</strong> để cấu hình diagnostic settings cho mọi vault trong một scope.</li>
  <li>Mở <em>Backup Reports</em> trong Resiliency (trước là Business Continuity Center / Backup center), chọn workspace.</li>
</ol>
<div class="callout warn"><strong>Lưu ý</strong>Lần đầu cấu hình, có thể mất tới <strong>24 giờ</strong> để dữ liệu đầu tiên vào workspace, và báo cáo không hiển thị ngày hiện tại. Nên xem báo cáo sau khoảng 2 ngày.</div>

<h4>Alerts cho Azure Backup</h4>
<table>
  <thead><tr><th>Loại</th><th>Ví dụ</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>Built-in Azure Monitor alerts</strong></td><td>Job backup/restore thất bại; cảnh báo bảo mật như xóa dữ liệu backup, tắt soft delete</td><td>Tạo tự động; xem ở Alerts của Azure Monitor hoặc Resiliency. Thay thế cho "classic alerts" cũ</td></tr>
    <tr><td><strong>Metric alerts</strong></td><td>Backup Health Events với trạng thái không khỏe</td><td>Tự tạo alert rule trên metric của vault</td></tr>
    <tr><td><strong>Log search alerts</strong></td><td>Truy vấn bảng <code>AddonAzureBackupJobs</code> trong Log Analytics</td><td>Cần diagnostic settings gửi dữ liệu vào workspace</td></tr>
  </tbody>
</table>

<h4>Nhận thông báo qua email/SMS</h4>
<p>Built-in alert được tạo ra nhưng để <strong>gửi thông báo</strong> bạn cần:</p>
<ol class="steps">
  <li>Tạo <strong>action group</strong> (email, SMS, push, voice, webhook, Logic App, Automation runbook, ITSM…).</li>
  <li>Tạo <strong>alert processing rule</strong> với scope là vault/subscription, filter theo loại alert (ví dụ Backup job failure), action là <em>Apply action group</em>.</li>
</ol>
<pre><code># Ví dụ KQL: các job backup thất bại trong 24 giờ qua
AddonAzureBackupJobs
| where TimeGenerated &gt; ago(24h)
| where JobOperation == "Backup" and JobStatus == "Failed"
| project TimeGenerated, BackupItemUniqueId, JobFailureCode</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Cần báo cáo xu hướng dung lượng backup và tỷ lệ job thành công trong 6 tháng" thì cấu hình <strong>diagnostic settings của vault gửi về Log Analytics</strong> và dùng <strong>Backup Reports</strong>. "Cần email cho đội vận hành khi job backup thất bại" thì dùng <strong>alert processing rule + action group</strong> cho built-in alert (hoặc alert rule có action group).</div>
`
    }
  ],
  keyFacts: [
    'Job backup VM gồm 2 giai đoạn: <strong>Take snapshot</strong> (đã restore được ngay) và <strong>Transfer data to vault</strong>.',
    'Windows dùng <strong>VSS</strong> cho app-consistent; Linux cần <strong>pre/post script</strong>, nếu không là file-system consistent; VM tắt cho bản crash-consistent.',
    'Recovery Services vault phải <strong>cùng region</strong> với VM; mỗi VM chỉ thuộc một vault tại một thời điểm.',
    'Standard policy: 1 lần/ngày hoặc hằng tuần; Instant Restore <strong>1–5 ngày, mặc định 2</strong>.',
    'Enhanced policy: hourly mỗi <strong>4/6/8/12/24 giờ</strong>; Instant Restore <strong>1–30 ngày, mặc định 7</strong>; bắt buộc cho Premium SSD v2, Ultra Disk.',
    'Không chuyển VM từ Enhanced policy về Standard policy được.',
    'Phương án restore: <strong>Create new VM</strong>, <strong>Restore disks</strong> (kèm template), <strong>Replace existing</strong>, <strong>Cross Region Restore</strong>, <strong>File Recovery</strong>.',
    'File Recovery mount recovery point qua <strong>iSCSI</strong>, script có mật khẩu và hiệu lực <strong>12 giờ</strong>; nhớ Unmount disks.',
    'Replace existing cần VM còn tồn tại và staging location; giữ nguyên cấu hình mạng của VM.',
    'Backup Reports cần <strong>diagnostic settings</strong> của vault gửi về <strong>Log Analytics workspace</strong>; dữ liệu đầu tiên có thể mất tới 24 giờ.',
    'Muốn nhận email khi backup thất bại: <strong>action group</strong> + <strong>alert processing rule</strong> (hoặc alert rule có action group).'
  ],
  traps: [
    'Tạo vault ở region khác với VM rồi mong bật backup được. Vault phải <strong>cùng region</strong>.',
    'Chọn Standard policy khi đề yêu cầu nhiều bản backup mỗi ngày. Chỉ <strong>Enhanced policy</strong> hỗ trợ hourly.',
    'Restore cả VM chỉ để lấy lại một file. <strong>File Recovery</strong> nhanh và ít tốn kém hơn.',
    'Chọn Create new VM khi cần đổi size hoặc đưa vào availability set. Nên dùng <strong>Restore disks</strong> + template.',
    'Nghĩ rằng bản backup của VM Linux mặc định là application-consistent. Cần pre/post script; nếu không chỉ là file-system consistent.',
    'Quên Unmount disks sau File Recovery; kết nối mở có thể làm backup tiếp theo của máy chạy script thất bại.',
    'Mong Backup Reports có dữ liệu ngay sau khi cấu hình. Cần diagnostic settings và chờ tới 24 giờ.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần</th><th>Giải pháp</th></tr></thead>
  <tbody>
    <tr><td>RPO vài giờ, Premium SSD v2/Ultra</td><td>Enhanced policy (4/6/8/12/24 giờ)</td></tr>
    <tr><td>Instant Restore</td><td>Standard 1–5 ngày (mặc định 2); Enhanced 1–30 ngày (mặc định 7)</td></tr>
    <tr><td>App-consistent Linux</td><td>Pre-script / post-script</td></tr>
    <tr><td>Lấy lại vài file</td><td>File Recovery (iSCSI, script 12 giờ)</td></tr>
    <tr><td>VM còn, quay lại trạng thái cũ, giữ NIC/IP</td><td>Replace existing</td></tr>
    <tr><td>VM mới với tùy biến (size, AV set)</td><td>Restore disks + template</td></tr>
    <tr><td>VM mới nhanh, cấu hình cơ bản</td><td>Create new VM</td></tr>
    <tr><td>Region gốc sự cố</td><td>Cross Region Restore (GRS + CRR)</td></tr>
    <tr><td>Báo cáo dài hạn</td><td>Diagnostic settings → Log Analytics → Backup Reports</td></tr>
    <tr><td>Email khi job lỗi</td><td>Action group + alert processing rule</td></tr>
    <tr><td>Backup ngay trước khi patch</td><td><code>az backup protection backup-now</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Hai giai đoạn của một job backup Azure VM?', back: '<strong>Take snapshot</strong> và <strong>Transfer data to vault</strong>. Recovery point dùng được ngay sau giai đoạn 1.' },
    { front: 'Windows VM dùng gì để có backup app-consistent?', back: '<strong>VSS</strong> (Volume Shadow Copy Service).' },
    { front: 'Linux VM cần gì để có backup app-consistent?', back: '<strong>Pre-script/post-script</strong>; nếu không có thì là file-system consistent.' },
    { front: 'Backup VM đang deallocated cho ra loại nhất quán nào?', back: '<strong>Crash-consistent</strong>.' },
    { front: 'Instant Restore của Standard policy?', back: '1–5 ngày, mặc định <strong>2 ngày</strong> (weekly cố định 5 ngày).' },
    { front: 'Enhanced policy hỗ trợ tần suất nào?', back: 'Hourly mỗi <strong>4, 6, 8, 12 hoặc 24 giờ</strong>, cùng daily và weekly. Instant Restore 1–30 ngày (mặc định 7).' },
    { front: 'Loại đĩa nào bắt buộc dùng Enhanced policy?', back: '<strong>Premium SSD v2</strong> và <strong>Ultra Disk</strong>.' },
    { front: 'Vault và VM phải thỏa điều kiện gì về vị trí?', back: 'Cùng <strong>region</strong>.' },
    { front: 'Restore disks khác Create new VM ở điểm nào?', back: 'Restore disks tạo managed disk + <strong>template</strong> để tùy biến VM (size, availability set…). Create new VM tạo nhanh VM cấu hình cơ bản.' },
    { front: 'Replace existing yêu cầu gì?', back: 'VM gốc phải <strong>còn tồn tại</strong>; cần staging location. Đĩa được thay, cấu hình VM giữ nguyên.' },
    { front: 'File Recovery hoạt động thế nào?', back: 'Tải script/executable có mật khẩu, chạy để mount recovery point qua <strong>iSCSI</strong> (cổng 3260); hiệu lực <strong>12 giờ</strong>.' },
    { front: 'Cross Region Restore cần gì?', back: 'Vault <strong>GRS</strong> và bật CRR; restore ở paired region.' },
    { front: 'Backup Reports lấy dữ liệu từ đâu?', back: '<strong>Log Analytics workspace</strong>, qua diagnostic settings của vault; hiển thị bằng Azure Workbooks.' },
    { front: 'Làm sao gửi email khi built-in backup alert được tạo?', back: 'Tạo <strong>action group</strong> và <strong>alert processing rule</strong> áp action group cho alert của vault.' },
    { front: 'Lệnh CLI chạy backup on-demand?', back: '<code>az backup protection backup-now ... --backup-management-type AzureIaaSVM</code>' },
    { front: 'Stop backup and retain data khác delete data thế nào?', back: 'Retain: giữ recovery point vô thời hạn, có thể resume. Delete: xóa recovery point (vào soft delete 14 ngày).' }
  ],
  quiz: [
    {
      q: 'VM1 ở West Europe. Bạn có Recovery Services vault RSV1 ở North Europe và RSV2 ở West Europe. Bạn cần bật Azure Backup cho VM1. Bạn dùng vault nào?',
      options: ['RSV1', 'RSV2', 'RSV1 hoặc RSV2 đều được', 'Cần tạo Backup vault mới'],
      answer: [1],
      explain: 'Vault phải cùng region với VM, nên chỉ RSV2 ở West Europe dùng được. Backup vault không hỗ trợ Azure VM.'
    },
    {
      q: 'Yêu cầu: VM chạy ứng dụng quan trọng phải có RPO tối đa 4 giờ bằng Azure Backup. Bạn cấu hình gì?',
      options: ['Standard policy, backup daily', 'Standard policy với Instant Restore 5 ngày', 'Enhanced policy với lịch hourly mỗi 4 giờ', 'Backup on-demand thủ công mỗi 4 giờ'],
      answer: [2],
      explain: 'Chỉ Enhanced policy hỗ trợ backup nhiều lần mỗi ngày (mỗi 4, 6, 8, 12 giờ). Standard chỉ backup 1 lần/ngày; Instant Restore không thay đổi tần suất. Backup thủ công không phải giải pháp tự động đáng tin cậy.'
    },
    {
      q: 'Một người dùng xóa nhầm file báo cáo trên VM Windows hôm qua. VM vẫn hoạt động bình thường và có backup hằng ngày. Cách khôi phục nhanh nhất, ít ảnh hưởng nhất là gì?',
      options: ['Replace existing từ recovery point hôm trước', 'Restore disks và gắn vào VM', 'Create new VM từ recovery point', 'File Recovery: tải executable, mount recovery point và chép file'],
      answer: [3],
      explain: 'File Recovery mount recovery point như ổ đĩa để chép đúng file cần lấy, không ảnh hưởng VM đang chạy. Replace existing sẽ ghi đè toàn bộ đĩa và làm mất dữ liệu mới. Restore disks và Create new VM tốn thời gian và chi phí hơn.'
    },
    {
      q: 'Sau khi cài bản cập nhật, VM2 không khởi động được. VM2 vẫn tồn tại và bạn muốn quay về recovery point trước khi cập nhật mà giữ nguyên NIC và địa chỉ IP. Bạn chọn phương án restore nào?',
      options: ['Replace existing', 'Create new VM', 'File Recovery', 'Cross Region Restore'],
      answer: [0],
      explain: 'Replace existing thay đĩa của VM hiện có bằng đĩa từ recovery point, giữ nguyên cấu hình VM như NIC và IP. Create new VM tạo VM khác với NIC mới. File Recovery chỉ lấy file. Cross Region Restore dùng cho region phụ.'
    },
    {
      q: 'Bạn cần khôi phục VM3 nhưng VM mới phải có size khác và nằm trong một availability set có sẵn. Bạn làm thế nào?',
      options: ['Create new VM rồi đổi size', 'Restore disks, sau đó dùng template được tạo ra để deploy VM với tham số tùy chỉnh', 'Replace existing', 'File Recovery'],
      answer: [1],
      explain: 'Restore disks tạo managed disk kèm template để bạn tùy biến (size, availability set…) khi tạo VM. Không thể đưa VM có sẵn vào availability set sau khi tạo, nên Create new VM không đáp ứng. Replace existing và File Recovery không tạo VM mới.'
    },
    {
      q: 'Bạn backup VM Linux chạy PostgreSQL và cần bản backup application-consistent. Bạn cần làm gì?',
      options: ['Không cần làm gì, Azure Backup luôn app-consistent', 'Cấu hình pre-script và post-script trên VM', 'Tắt VM trước mỗi lần backup', 'Cài MARS agent trên VM'],
      answer: [1],
      explain: 'Với Linux, Azure Backup dùng pre/post script để đóng băng ứng dụng trước snapshot; không có script thì chỉ file-system consistent. Tắt VM chỉ cho crash-consistent. MARS agent không hỗ trợ Linux.'
    },
    {
      q: 'Vault RSV1 dùng GRS và đã bật Cross Region Restore. Region chính East US gặp sự cố kéo dài. Bạn cần chạy lại VM4 nhanh nhất từ dữ liệu backup. Bạn làm gì?',
      options: ['Chờ East US khôi phục rồi restore', 'Restore từ snapshot tier ở East US', 'Tạo vault mới ở West US và backup lại', 'Restore VM4 ở secondary region (West US) bằng Cross Region Restore'],
      answer: [3],
      explain: 'Cross Region Restore cho phép restore ngay ở paired region từ dữ liệu đã replicate, không cần chờ. Snapshot tier nằm ở East US nên không truy cập được. Không thể backup lại VM ở region đang gặp sự cố.'
    },
    {
      q: 'Đội vận hành muốn nhận email mỗi khi một job backup VM trong subscription thất bại. Built-in alert của Azure Backup đã được tạo. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Action group có hành động gửi email', 'Alert processing rule áp action group cho alert của Azure Backup', 'Bật soft delete trên vault', 'Đổi vault sang LRS'],
      answer: [0, 1],
      explain: 'Built-in alert không tự gửi thông báo; cần action group định nghĩa cách gửi (email) và alert processing rule để gắn action group vào các alert phù hợp. Soft delete và redundancy không liên quan đến thông báo.'
    },
    {
      q: 'Bạn cần báo cáo tỷ lệ job backup thành công và mức dùng storage của 30 vault trong 6 tháng qua. Bạn cần làm những gì? (Chọn 2)',
      options: ['Cấu hình diagnostic settings của các vault gửi dữ liệu tới một Log Analytics workspace', 'Đặt retention của Log Analytics workspace đủ dài (ví dụ 180 ngày trở lên)', 'Bật Cross Region Restore trên các vault', 'Xuất Activity log ra storage account'],
      answer: [0, 1],
      explain: 'Backup Reports đọc dữ liệu từ Log Analytics, do đó vault phải gửi diagnostic data tới workspace và workspace phải giữ dữ liệu đủ lâu (mặc định chỉ 30 ngày). Cross Region Restore và Activity log không cung cấp dữ liệu job backup cho báo cáo.'
    },
    {
      q: 'Bạn chạy script File Recovery trên một máy Windows để lấy file từ recovery point. Sau khi chép xong, bạn nên làm gì?',
      options: ['Không cần làm gì, kết nối tự đóng ngay', 'Xóa recovery point', 'Chọn Unmount disks trên portal để đóng kết nối', 'Khởi động lại VM gốc'],
      answer: [2],
      explain: 'Nên chọn Unmount disks để hủy kết nối iSCSI và vô hiệu hóa script ngay; nếu để mở, kết nối tồn tại đến 12 giờ và có thể làm backup của máy chạy script thất bại. Xóa recovery point hay khởi động lại VM gốc là không cần thiết.'
    },
    {
      q: 'VM5 dùng Premium SSD v2 làm data disk. Bạn cấu hình backup và thấy policy Standard không áp dụng được. Nguyên nhân là gì?',
      options: ['Premium SSD v2 chỉ được hỗ trợ với Enhanced policy', 'Vault phải dùng ZRS', 'VM phải tắt khi backup', 'Premium SSD v2 không thể backup bằng Azure Backup'],
      answer: [0],
      explain: 'Premium SSD v2 và Ultra Disk chỉ được hỗ trợ với Enhanced policy. Redundancy của vault và trạng thái VM không phải nguyên nhân, và Azure Backup có hỗ trợ các đĩa này qua Enhanced policy.'
    },
    {
      q: 'Bạn muốn ngừng backup VM6 sắp ngừng sử dụng nhưng vẫn phải giữ các recovery point hiện có cho mục đích kiểm toán. Bạn chọn gì?',
      options: ['Stop backup and delete backup data', 'Xóa VM6 và vault', 'Đổi policy sang retention 1 ngày', 'Stop backup and retain backup data'],
      answer: [3],
      explain: 'Retain backup data ngừng tạo bản mới nhưng giữ recovery point hiện có (vẫn tính phí storage). Delete backup data xóa recovery point. Xóa vault làm mất dữ liệu. Đổi retention 1 ngày làm điểm cũ hết hạn.'
    },
    {
      q: 'Phát biểu nào về Instant Restore là ĐÚNG? (Chọn 2)',
      options: ['Recovery point có thể dùng ngay sau khi snapshot hoàn tất, trước khi dữ liệu vào vault', 'Có thể tắt hoàn toàn Instant Restore', 'Restore từ snapshot tier nhanh hơn restore từ vault tier', 'Snapshot Instant Restore được lưu trong vault ở region phụ'],
      answer: [0, 2],
      explain: 'Recovery point loại snapshot dùng được ngay sau giai đoạn 1 và restore từ snapshot nhanh hơn từ vault. Instant Restore không tắt được (chỉ giảm retention tối thiểu 1 ngày). Snapshot được lưu cạnh đĩa gốc, không phải ở region phụ.'
    },
    {
      q: 'Bạn chuẩn bị cài bản vá lớn cho VM7 vào tối nay. Backup theo lịch chạy lúc 2 giờ sáng. Bạn muốn có điểm khôi phục ngay trước khi vá. Bạn làm gì?',
      options: ['Đổi lịch backup sang giờ hiện tại', 'Chạy Backup now (on-demand) trước khi vá', 'Chụp snapshot đĩa OS thủ công rồi xóa sau', 'Bật Cross Region Restore'],
      answer: [1],
      explain: 'Backup now tạo recovery point on-demand ngay lập tức với thời hạn giữ tùy chọn, không cần đổi policy. Đổi lịch ảnh hưởng mọi VM dùng policy. Snapshot thủ công không có tính năng restore tích hợp. Cross Region Restore không tạo recovery point.'
    }
  ]
});

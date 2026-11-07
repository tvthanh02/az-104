AZ.addModule({
  id: 'p4m4',
  summary: 'Azure Files cung cấp file share được quản lý hoàn toàn, mount được qua SMB hoặc NFS như một file server thông thường. Azure File Sync biến Windows Server on-premises thành bộ nhớ đệm (cache) của Azure file share. Module này so sánh Azure Files với Blob, đi qua tier, quota, mount trên Windows/Linux, snapshot, soft delete, Storage Explorer, File Sync và phân quyền theo danh tính (AD DS, Entra Kerberos). Đề AZ-104 hay hỏi các thành phần của File Sync, cổng 445 và quyền share-level so với NTFS.',
  objectives: [
    'So sánh Azure Files với Blob Storage và chọn đúng dịch vụ cho từng tình huống',
    'Tạo file share, chọn tier/billing model, đặt quota và mount trên Windows, Linux',
    'Dùng share snapshot và soft delete để khôi phục file, thư mục và cả file share',
    'Quản lý dữ liệu storage bằng Azure Storage Explorer với các phương thức kết nối khác nhau',
    'Triển khai Azure File Sync: Storage Sync Service, sync group, cloud endpoint, server endpoint, cloud tiering',
    'Cấu hình identity-based access: AD DS, Microsoft Entra Kerberos, Entra Domain Services; kết hợp role share-level với NTFS ACL'
  ],
  sections: [
    {
      id: 'files-vs-blob',
      unit: 'Compare storage for file shares and blob data',
      title: 'Azure Files hay Blob Storage?',
      html: `
<p><strong>Azure Files</strong> cung cấp file share trên đám mây truy cập qua <strong>SMB</strong> (Windows, Linux, macOS), <strong>NFS 4.1</strong> (Linux) hoặc <strong>REST</strong>. File share được nhiều máy mount <strong>đồng thời</strong>, có thư mục thật và khóa file như file server truyền thống.</p>

<table>
  <thead><tr><th>Tiêu chí</th><th>Azure Files</th><th>Azure Blob Storage</th></tr></thead>
  <tbody>
    <tr><td>Mô hình</td><td>File system phân cấp (thư mục, file, khóa file)</td><td>Object storage phẳng (thư mục ảo bằng dấu <code>/</code>; có thật khi bật hierarchical namespace)</td></tr>
    <tr><td>Giao thức</td><td>SMB 2.1/3.x, NFS 4.1, REST</td><td>REST/HTTPS, NFS 3.0, SFTP (tùy chọn)</td></tr>
    <tr><td>Truy cập</td><td>Mount như ổ đĩa mạng (<code>Z:</code>, <code>/mnt/share</code>)</td><td>Qua URL, SDK, AzCopy; không mount như ổ đĩa (trừ Blobfuse2/NFS 3.0)</td></tr>
    <tr><td>Quy mô</td><td>Share tối đa <strong>100 TiB</strong>, file tối đa <strong>4 TiB</strong></td><td>Account tới hàng PiB; block blob khoảng 190,7 TiB</td></tr>
    <tr><td>Tier</td><td>Premium/SSD; Transaction optimized, Hot, Cool (HDD)</td><td>Hot, Cool, Cold, <strong>Archive</strong></td></tr>
    <tr><td>Phân quyền</td><td>Identity-based (AD DS, Entra Kerberos, Entra DS) + NTFS ACL; account key</td><td>Entra ID RBAC, SAS, Shared Key, anonymous</td></tr>
    <tr><td>Redundancy</td><td>LRS, ZRS, GRS, GZRS (Standard); LRS, ZRS (Premium). <strong>Không có RA-GRS/RA-GZRS</strong></td><td>Mọi kiểu, gồm RA-GRS, RA-GZRS</td></tr>
  </tbody>
</table>

<h4>Khi nào chọn Azure Files</h4>
<ul>
  <li><strong>Thay thế hoặc bổ sung file server</strong> on-premises, NAS.</li>
  <li><strong>Lift-and-shift</strong> ứng dụng cần đường dẫn chia sẻ (UNC path) mà không sửa code.</li>
  <li>Chia sẻ file cấu hình, công cụ, log chẩn đoán giữa nhiều VM.</li>
  <li>Lưu profile người dùng (FSLogix) cho Azure Virtual Desktop.</li>
  <li>Kết hợp Azure File Sync để cache trên Windows Server ở chi nhánh.</li>
</ul>

<h4>Khi nào chọn Blob</h4>
<ul>
  <li>Ứng dụng mới truy cập dữ liệu qua HTTP/SDK; phục vụ ảnh, video, tài liệu trên web.</li>
  <li>Dữ liệu cực lớn, cần tier Archive để giảm chi phí; data lake cho phân tích.</li>
  <li>Backup, lưu trữ dài hạn.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Ứng dụng legacy đọc file qua đường dẫn <code>\\\\server\\share</code>, muốn chuyển lên Azure không sửa code" → <strong>Azure Files</strong>. "Lưu ảnh truy cập qua URL HTTP, chi phí thấp, có Archive" → <strong>Blob</strong>. "File share Standard cần RA-GRS" → <strong>không có</strong>; Azure Files chỉ có GRS/GZRS (không đọc vùng phụ).</div>
`
    },
    {
      id: 'manage-shares',
      unit: 'Manage Azure file shares',
      title: 'Tạo, cấu hình và mount Azure file share',
      html: `
<h4>Tier và billing model</h4>
<table>
  <thead><tr><th>Tier</th><th>Phần cứng</th><th>Loại account</th><th>Phù hợp</th></tr></thead>
  <tbody>
    <tr><td><strong>Premium</strong> (SSD, provisioned)</td><td>SSD</td><td><code>FileStorage</code></td><td>Độ trễ thấp, IOPS cao: database, ứng dụng nhạy độ trễ, AVD profile; bắt buộc nếu cần NFS</td></tr>
    <tr><td><strong>Transaction optimized</strong></td><td>HDD</td><td>GPv2</td><td>Khối lượng giao dịch lớn, không cần độ trễ của Premium</td></tr>
    <tr><td><strong>Hot</strong></td><td>HDD</td><td>GPv2</td><td>File share dùng chung đa mục đích, nhóm làm việc, Azure File Sync</td></tr>
    <tr><td><strong>Cool</strong></td><td>HDD</td><td>GPv2</td><td>Lưu trữ lâu dài/archive online, ít truy cập</td></tr>
  </tbody>
</table>
<ul>
  <li>Transaction optimized, Hot, Cool thuộc mô hình <strong>pay-as-you-go</strong> (trả theo dung lượng dùng + giao dịch). Có thể đổi giữa ba tier này trên share đang chạy.</li>
  <li>Premium kiểu cũ (<strong>provisioned v1</strong>, chỉ SSD) tính theo dung lượng <strong>provisioned</strong> (đặt trước), bất kể dùng bao nhiêu; IOPS/throughput suy ra từ dung lượng. Không chuyển trực tiếp share HDD sang SSD: phải tạo share mới rồi copy.</li>
  <li>Microsoft hiện khuyến nghị mô hình <strong>provisioned v2</strong> (account <code>FileStorage</code>, cả SSD và HDD) cho triển khai mới: tự chọn dung lượng, IOPS, throughput.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo file share (pay-as-you-go) và lấy script mount</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở storage account GPv2, vào danh sách file share:<br><span class="path">Storage account › Data storage › Classic file shares › + Classic file share</span></li>
    <li>Tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">New classic file share</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Backup</span><span>Review + create</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">finance</span></div>
        <div class="pf"><label>Access tier</label><span class="pv sel">Hot</span></div>
        <div class="pf"><label></label><span class="pv note">Mặc định là Transaction optimized (nên giữ trong lúc migrate dữ liệu). Account FileStorage (provisioned) thì thay bằng Provisioned storage (GiB), IOPS, throughput và Protocol SMB/NFS.</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next : Backup</span></div>
      </div>
    </li>
    <li>Tab <strong>Backup</strong>: Azure Backup được bật sẵn cho share SMB (<strong>Enable backup</strong>), dùng vault và policy mặc định hoặc tạo mới. Bỏ chọn nếu chỉ thử nghiệm. Chọn <strong>Review + create</strong> → <strong>Create</strong>.</li>
    <li>Mở share <code>finance</code>, chọn <strong>Connect</strong>, tab <strong>Windows</strong>: chọn <strong>Drive letter</strong> (ví dụ Z) và <strong>Authentication method</strong> (Active Directory hoặc Storage account key), chọn <strong>Show Script</strong> rồi chạy script PowerShell trên máy client. Script tự kiểm tra cổng 445 trước khi mount.</li>
    <li>Đổi quota hoặc tier sau này: trên trang share chọn <strong>Edit quota</strong> / <strong>Change tier</strong>.</li>
  </ol></div>
</div>

<h4>Quota</h4>
<p><strong>Quota</strong> là kích thước tối đa của share (GiB). Khi đạt quota, ghi thêm sẽ lỗi. Share Standard mặc định tối đa 5 TiB; bật <strong>large file shares</strong> trên account để lên <strong>100 TiB</strong> (không tắt lại được).</p>
<pre><code>az storage share-rm create -g rg-files --storage-account contosofiles -n finance \\
  --quota 1024 --access-tier Hot --enabled-protocols SMB
az storage share-rm update -g rg-files --storage-account contosofiles -n finance --quota 2048

New-AzRmStorageShare -ResourceGroupName rg-files -StorageAccountName contosofiles -Name finance -QuotaGiB 1024 -AccessTier Hot</code></pre>

<h4>Cổng 445 và mount trên Windows</h4>
<ul>
  <li>SMB dùng <strong>TCP 445 outbound</strong>. Nhiều ISP và mạng doanh nghiệp chặn cổng này. Kiểm tra: <code>Test-NetConnection -ComputerName contosofiles.file.core.windows.net -Port 445</code>.</li>
  <li>Mount từ ngoài Azure (on-premises, Internet) cần <strong>SMB 3.x</strong> có mã hóa. Windows 7/Server 2008 R2 chỉ có SMB 2.1 nên chỉ mount được từ VM trong cùng region Azure.</li>
  <li>Nếu cổng 445 bị chặn: dùng <strong>VPN (P2S/S2S)</strong> hoặc <strong>ExpressRoute</strong> với private endpoint, dùng <strong>Azure File Sync</strong> (chỉ cần HTTPS 443), hoặc truy cập qua REST (Storage Explorer, portal).</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 284" role="img" aria-label="Bốn cách client tới Azure file share: VM trong Azure qua SMB 445, máy tại nhà bị ISP chặn cổng 445, on-premises qua VPN và private endpoint, Windows Server qua Azure File Sync bằng HTTPS 443">
  <rect class="box-s" x="10" y="16" width="200" height="52" rx="10"/>
  <text x="110" y="38" text-anchor="middle" class="t-b">VM trong Azure</text>
  <text x="110" y="57" text-anchor="middle" class="t-sm t-mute">SMB 3.x hoặc 2.1</text>
  <rect class="box-x" x="10" y="82" width="200" height="52" rx="10"/>
  <text x="110" y="104" text-anchor="middle" class="t-b">Máy tại nhà</text>
  <text x="110" y="123" text-anchor="middle" class="t-sm t-mute">qua mạng ISP</text>
  <rect class="box-a" x="10" y="148" width="200" height="52" rx="10"/>
  <text x="110" y="170" text-anchor="middle" class="t-b">On-premises</text>
  <text x="110" y="189" text-anchor="middle" class="t-sm t-mute">VPN / ExpressRoute</text>
  <rect class="box-a" x="10" y="214" width="200" height="52" rx="10"/>
  <text x="110" y="236" text-anchor="middle" class="t-b">Windows Server</text>
  <text x="110" y="255" text-anchor="middle" class="t-sm t-mute">Azure File Sync agent</text>

  <rect class="box-w" x="520" y="12" width="190" height="258" rx="12"/>
  <text x="615" y="122" text-anchor="middle" class="t-b t-w">Azure file share</text>
  <text x="615" y="144" text-anchor="middle" class="t-sm">SMB: TCP 445</text>
  <text x="615" y="162" text-anchor="middle" class="t-sm">REST / Sync: HTTPS 443</text>

  <line class="ln-s" x1="210" y1="42" x2="516" y2="42" marker-end="url(#arr-s)"/>
  <text x="363" y="34" text-anchor="middle" class="t-sm t-s">SMB · TCP 445 ✓</text>
  <line class="ln-x dash" x1="210" y1="108" x2="336" y2="108" marker-end="url(#arr-x)"/>
  <text x="348" y="112" class="t-sm t-x">✕ ISP chặn cổng 445</text>
  <line class="ln-s" x1="210" y1="174" x2="516" y2="174" marker-end="url(#arr-s)"/>
  <text x="363" y="166" text-anchor="middle" class="t-sm t-s">SMB qua private endpoint ✓</text>
  <line class="ln-a" x1="210" y1="240" x2="516" y2="240" marker-end="url(#arr-a)"/>
  <text x="363" y="232" text-anchor="middle" class="t-sm t-a">đồng bộ qua HTTPS 443 ✓</text>
</svg>
<figcaption>Hình 1. SMB luôn dùng TCP 445 outbound. Khi mạng chặn cổng này, hãy đưa traffic vào đường riêng (VPN/ExpressRoute tới private endpoint) hoặc dùng Azure File Sync để người dùng làm việc với server nội bộ, còn server đồng bộ với Azure qua HTTPS 443.</figcaption>
</figure>
<pre><code># Windows: lưu thông tin đăng nhập rồi map ổ (portal có nút Connect sinh sẵn script)
cmdkey /add:contosofiles.file.core.windows.net /user:localhost\\contosofiles /pass:&lt;storage-key&gt;
New-PSDrive -Name Z -PSProvider FileSystem -Root "\\\\contosofiles.file.core.windows.net\\finance" -Persist
# hoặc
net use Z: \\\\contosofiles.file.core.windows.net\\finance /user:localhost\\contosofiles &lt;storage-key&gt;</code></pre>

<h4>Mount trên Linux</h4>
<pre><code># SMB (cần cifs-utils)
sudo mount -t cifs //contosofiles.file.core.windows.net/finance /mnt/finance \\
  -o vers=3.1.1,credentials=/etc/smbcredentials/contosofiles.cred,dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30

# NFS 4.1 (share Premium/SSD, truy cập qua private endpoint hoặc service endpoint)
sudo mount -t nfs -o vers=4,minorversion=1,sec=sys contosonfs.file.core.windows.net:/contosonfs/data /mnt/data</code></pre>
<p>Để mount tự động khi khởi động, thêm dòng tương ứng vào <code>/etc/fstab</code>.</p>

<h4>SMB vs NFS</h4>
<div class="compare">
  <div><strong>SMB</strong>Windows, Linux, macOS. Hỗ trợ identity-based auth, NTFS ACL, snapshot qua Previous Versions, Azure File Sync, Azure Backup. Có cả HDD và SSD.</div>
  <div><strong>NFS 4.1</strong>Chỉ Linux; chỉ share <strong>SSD (Premium)</strong>. Không xác thực bằng danh tính hay key: bảo vệ bằng <strong>mạng</strong> (private endpoint/service endpoint), quyền POSIX. Không hỗ trợ Azure File Sync, Azure Backup.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Người dùng ở nhà không mount được file share, ping được nhưng lỗi kết nối" → ISP chặn <strong>cổng 445</strong>. Giải pháp: VPN P2S, hoặc Azure File Sync về server nội bộ. "Cần NFS" → tạo account <strong>FileStorage (Premium/SSD)</strong> và tắt <em>Secure transfer required</em> nếu không dùng mã hóa TLS cho NFS.</div>
`
    },
    {
      id: 'share-snapshots',
      unit: 'Create file share snapshots',
      title: 'Share snapshot',
      html: `
<p><strong>Share snapshot</strong> là bản sao <strong>chỉ đọc</strong>, tại một thời điểm, của <strong>toàn bộ file share</strong>. Snapshot được tạo ở cấp share nhưng có thể khôi phục <strong>từng file</strong> hoặc thư mục.</p>

<h4>Đặc điểm</h4>
<ul>
  <li>Tối đa <strong>200 snapshot</strong> mỗi share; khi đủ 200 phải xóa bớt mới tạo mới được. Giữ snapshot tối đa <strong>10 năm</strong>.</li>
  <li><strong>Incremental</strong>: chỉ lưu phần thay đổi so với snapshot trước; bạn chỉ trả tiền cho dữ liệu khác biệt. Snapshot không tính vào quota của share.</li>
  <li>Snapshot có cùng redundancy với share (GRS thì snapshot cũng được sao chép sang region phụ).</li>
  <li><strong>Xóa share thì xóa luôn mọi snapshot</strong>. Snapshot không bảo vệ khỏi việc xóa share hay xóa account: cần <strong>soft delete</strong> và resource lock.</li>
  <li>URI của snapshot có thêm <code>?sharesnapshot=&lt;DateTime&gt;</code>.</li>
  <li><strong>Azure Backup</strong> cho Azure Files (SMB) cũng dựa trên share snapshot và quản lý lịch, retention tự động.</li>
</ul>

<h4>Tạo và quản lý</h4>
<pre><code>az storage share snapshot --name finance --account-name contosofiles
az storage share list --account-name contosofiles --include-snapshots -o table
az storage share delete --account-name contosofiles --name finance --snapshot 2026-11-01T08:00:00.0000000Z

New-AzRmStorageShare -ResourceGroupName rg-files -StorageAccountName contosofiles -Name finance -Snapshot
Get-AzRmStorageShare -ResourceGroupName rg-files -StorageAccountName contosofiles -IncludeSnapshot</code></pre>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 200" role="img" aria-label="Các share snapshot incremental theo thời gian và thao tác khôi phục một file từ snapshot về share đang chạy">
  <line class="ln" x1="40" y1="30" x2="516" y2="30" marker-end="url(#arr)"/>
  <text x="40" y="20" class="t-sm t-mute">thời gian</text>

  <rect class="box-e" x="40" y="50" width="140" height="64" rx="10"/>
  <text x="110" y="74" text-anchor="middle" class="t-b">Snapshot 1</text>
  <text x="110" y="94" text-anchor="middle" class="t-sm t-mute">chỉ đọc, toàn share</text>
  <rect class="box-e" x="200" y="50" width="140" height="64" rx="10"/>
  <text x="270" y="74" text-anchor="middle" class="t-b">Snapshot 2</text>
  <text x="270" y="94" text-anchor="middle" class="t-sm t-mute">+ phần thay đổi</text>
  <rect class="box-e" x="360" y="50" width="140" height="64" rx="10"/>
  <text x="430" y="74" text-anchor="middle" class="t-b">Snapshot 3</text>
  <text x="430" y="94" text-anchor="middle" class="t-sm t-mute">+ phần thay đổi</text>

  <rect class="box-w" x="540" y="42" width="170" height="80" rx="10"/>
  <text x="625" y="68" text-anchor="middle" class="t-b t-w">File share (live)</text>
  <text x="625" y="88" text-anchor="middle" class="t-sm">finance · đọc/ghi</text>
  <text x="625" y="106" text-anchor="middle" class="t-sm t-mute">≤ 200 snapshot</text>

  <path class="ln-s" d="M270 116 C270 178, 625 178, 625 128" marker-end="url(#arr-s)"/>
  <text x="448" y="188" text-anchor="middle" class="t-sm t-s">Restore từng file (portal / Previous Versions)</text>
</svg>
<figcaption>Hình 1. Snapshot chụp cả share nhưng chỉ lưu phần dữ liệu khác biệt (incremental), và có thể khôi phục từng file. Snapshot nằm trong share: xóa share là mất toàn bộ snapshot, vì vậy cần thêm soft delete và resource lock.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo snapshot và khôi phục một file</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở file share, vào trang Snapshots và chọn <strong>+ Add snapshot</strong> (có thể ghi <em>Comment</em> để dễ nhận biết):<br><span class="path">Storage account › Classic file shares › finance › Operations › Snapshots › + Add snapshot</span></li>
    <li>Sửa hoặc xóa thử một file trong share (qua ổ đã mount hoặc Storage browser).</li>
    <li>Quay lại <strong>Snapshots</strong>, mở snapshot vừa tạo, duyệt tới file, mở menu <strong>…</strong> và chọn <strong>Restore</strong>: ghi đè file gốc hoặc khôi phục thành bản sao với tên khác.</li>
    <li>Trên Windows client đã mount share: chuột phải thư mục → <strong>Properties</strong> → tab <strong>Previous Versions</strong> sẽ liệt kê các snapshot.</li>
  </ol></div>
</div>

<h4>Khôi phục file</h4>
<ul>
  <li><strong>Portal</strong>: file share → <strong>Snapshots</strong> → mở snapshot → chọn file → <strong>Restore</strong> (ghi đè file gốc hoặc lưu thành file mới).</li>
  <li><strong>Windows</strong>: chuột phải file/thư mục trên share đã mount → <strong>Properties → Previous Versions</strong> → Open/Restore. Giống Volume Shadow Copy trên file server.</li>
  <li><strong>Linux</strong>: mount snapshot bằng tùy chọn <code>snapshot=@GMT-2026.11.01-08.00.00</code>.</li>
  <li>Copy file từ snapshot bằng AzCopy hoặc Robocopy.</li>
</ul>

<h4>Khi nào dùng snapshot</h4>
<ul>
  <li>Trước khi triển khai phiên bản ứng dụng mới có thể làm hỏng dữ liệu.</li>
  <li>Bảo vệ khỏi xóa nhầm, sửa nhầm file, ransomware ở cấp file.</li>
  <li>Backup định kỳ (khuyến nghị dùng Azure Backup để tự động hóa).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Người dùng xóa nhầm một file trong share, cần tự khôi phục từ Windows" → <strong>Previous Versions</strong> từ share snapshot. "Đã có 200 snapshot, cần tạo thêm" → phải <strong>xóa snapshot cũ</strong>. Snapshot là cấp <strong>share</strong>, không tạo snapshot cho từng file được.</div>
`
    },
    {
      id: 'files-soft-delete',
      unit: 'Implement soft delete for Azure Files',
      title: 'Soft delete cho Azure Files',
      html: `
<p><strong>Soft delete cho Azure Files</strong> bảo vệ ở <strong>cấp file share</strong>: khi share bị xóa, nó chuyển sang trạng thái soft-deleted và có thể khôi phục (undelete) trong thời gian giữ.</p>

<h4>Đặc điểm</h4>
<ul>
  <li>Bật/tắt ở cấp <strong>storage account</strong>, áp dụng cho mọi file share trong account.</li>
  <li>Thời gian giữ: <strong>1–365 ngày</strong>. Account tạo mới qua portal mặc định đã bật soft delete cho file share.</li>
  <li>Khôi phục share cùng <strong>toàn bộ snapshot</strong> của nó.</li>
  <li>Không bảo vệ từng file riêng lẻ: xóa file trong share đang hoạt động thì dùng <strong>snapshot</strong> hoặc Azure Backup để khôi phục.</li>
  <li>Share ở trạng thái soft-deleted vẫn bị <strong>tính phí</strong> (dung lượng dùng với Standard, dung lượng provisioned với Premium).</li>
  <li>Muốn xóa vĩnh viễn ngay trước khi hết hạn: tắt soft delete, khôi phục rồi xóa lại.</li>
</ul>

<h4>Cấu hình và khôi phục</h4>
<pre><code># Bật soft delete 14 ngày
az storage account file-service-properties update -g rg-files -n contosofiles \\
  --enable-delete-retention true --delete-retention-days 14

# Liệt kê share đã xóa và khôi phục
az storage share-rm list -g rg-files --storage-account contosofiles --include-deleted
az storage share-rm restore -g rg-files --storage-account contosofiles -n finance --deleted-version &lt;version&gt;

# PowerShell
Update-AzStorageFileServiceProperty -ResourceGroupName rg-files -StorageAccountName contosofiles -EnableShareDeleteRetentionPolicy $true -ShareRetentionDays 14
Restore-AzRmStorageShare -ResourceGroupName rg-files -StorageAccountName contosofiles -Name finance -DeletedShareVersion &lt;version&gt;</code></pre>
<p>Trong portal: storage account → <strong>File shares</strong> → bật <em>Show deleted shares</em> → chọn share → <strong>Undelete</strong>.</p>

<h4>Lớp bảo vệ đầy đủ cho Azure Files</h4>
<table>
  <thead><tr><th>Rủi ro</th><th>Biện pháp</th></tr></thead>
  <tbody>
    <tr><td>Xóa/sửa nhầm file</td><td>Share snapshot, Azure Backup</td></tr>
    <tr><td>Xóa nhầm cả file share</td><td>Soft delete cho file share</td></tr>
    <tr><td>Xóa nhầm storage account</td><td>Resource lock <code>CanNotDelete</code></td></tr>
    <tr><td>Sự cố region</td><td>GRS/GZRS + account failover</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Admin lỡ xóa file share <code>hr</code> 3 ngày trước; soft delete 7 ngày đang bật" → <strong>Undelete</strong> share. "Cần ngăn xóa storage account" → <strong>resource lock</strong>, không phải soft delete. Soft delete Azure Files là cấp <strong>share</strong>, không phải cấp file.</div>
`
    },
    {
      id: 'storage-explorer',
      unit: 'Use Azure Storage Explorer',
      title: 'Azure Storage Explorer',
      html: `
<p><strong>Azure Storage Explorer</strong> là ứng dụng desktop độc lập (Windows, macOS, Linux) để quản lý dữ liệu storage bằng giao diện đồ họa.</p>

<h4>Làm được gì</h4>
<ul>
  <li>Quản lý <strong>Blob</strong> (container, blob, access tier, snapshot, soft-deleted blob), <strong>Azure Files</strong>, <strong>Queue</strong>, <strong>Table</strong>, <strong>Data Lake Storage Gen2</strong> (cả ACL).</li>
  <li>Upload/download/copy dữ liệu (bên dưới dùng <strong>AzCopy</strong>), kéo thả, copy giữa các account.</li>
  <li>Tạo SAS, quản lý stored access policy, đặt anonymous access level.</li>
  <li>Upload/download <strong>managed disks</strong> (VHD), tạo snapshot disk.</li>
  <li>Làm việc với emulator cục bộ <strong>Azurite</strong> và Azure Stack Hub.</li>
</ul>

<h4>Các cách kết nối</h4>
<table>
  <thead><tr><th>Phương thức</th><th>Phạm vi</th><th>Khi nào dùng</th></tr></thead>
  <tbody>
    <tr><td><strong>Đăng nhập tài khoản Azure (Microsoft Entra ID)</strong></td><td>Mọi subscription/account mà bạn có quyền</td><td>Admin quản lý nhiều account; cần role data plane hoặc quyền list keys</td></tr>
    <tr><td><strong>Account name + key</strong></td><td>Toàn bộ một storage account</td><td>Khi có access key (toàn quyền)</td></tr>
    <tr><td><strong>Connection string</strong></td><td>Một account (key hoặc SAS)</td><td>Thông tin kết nối có sẵn từ ứng dụng</td></tr>
    <tr><td><strong>SAS URL</strong></td><td>Account, container, blob, share, queue hoặc table được cấp</td><td>Người dùng ngoài, chỉ được truy cập phạm vi hẹp; không cần tài khoản Azure</td></tr>
    <tr><td><strong>Local emulator</strong></td><td>Azurite trên máy</td><td>Phát triển, thử nghiệm</td></tr>
  </tbody>
</table>

<h4>Lưu ý vận hành</h4>
<ul>
  <li>Storage Explorer truy cập data plane qua HTTPS (443), nên duyệt được Azure Files cả khi cổng 445 bị chặn.</li>
  <li>Nếu account bật firewall, máy chạy Storage Explorer phải nằm trong IP/VNet được phép hoặc đi qua private endpoint.</li>
  <li>Khi đăng nhập Entra ID mà không có role data plane, Storage Explorer thử dùng access key (nếu bạn có quyền <code>listKeys</code>); không có cả hai thì không xem được dữ liệu.</li>
  <li>Có thể <strong>attach</strong> một tài nguyên riêng lẻ bằng SAS mà không cần đăng nhập.</li>
</ul>

<ol class="steps">
  <li>Mở Storage Explorer → biểu tượng <strong>Connect</strong> (phích cắm).</li>
  <li>Chọn loại tài nguyên (Subscription, Storage account, Blob container, File share…).</li>
  <li>Chọn phương thức xác thực: Microsoft Entra ID, account name and key, SAS hoặc connection string.</li>
  <li>Nhập thông tin, đặt tên hiển thị → Connect. Tài nguyên xuất hiện trong cây <em>Emulator &amp; Attached</em> hoặc dưới subscription.</li>
</ol>

<div class="callout exam"><strong>Góc thi</strong>"Đối tác cần dùng công cụ đồ họa để upload vào một container, không có tài khoản trong tenant" → <strong>Storage Explorer + SAS URL</strong> của container. "Nhà phát triển cần thử nghiệm Blob trên máy mà không tốn phí Azure" → <strong>Azurite</strong>.</div>
`
    },
    {
      id: 'file-sync',
      unit: 'Consider Azure File Sync',
      title: 'Azure File Sync',
      html: `
<p><strong>Azure File Sync</strong> đồng bộ Windows Server on-premises (hoặc VM) với <strong>Azure file share</strong>. Azure file share là bản chính; Windows Server trở thành <strong>bộ nhớ đệm nhanh</strong>, người dùng vẫn truy cập qua SMB, NFS hay FTPS trên server như cũ.</p>

<h4>Lợi ích</h4>
<ul>
  <li><strong>Cloud tiering</strong>: chỉ giữ file "nóng" trên ổ đĩa local, file ít dùng được tier lên Azure, để lại con trỏ (reparse point). Mở file thì tự tải về (recall).</li>
  <li><strong>Multi-site sync</strong>: nhiều server ở các chi nhánh cùng đồng bộ một file share.</li>
  <li><strong>Phục hồi nhanh</strong>: server hỏng thì cài server mới, đăng ký, namespace có ngay và nội dung tải dần.</li>
  <li><strong>Lift-and-shift</strong> và hợp nhất file server; tích hợp Azure Backup ở phía cloud.</li>
  <li>Chỉ cần <strong>HTTPS 443</strong> outbound, không cần mở cổng 445 ra Internet.</li>
</ul>

<h4>Các thành phần</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Mô tả</th><th>Quy tắc</th></tr></thead>
  <tbody>
    <tr><td><strong>Storage Sync Service</strong></td><td>Tài nguyên Azure cấp cao nhất của File Sync</td><td>Chứa nhiều sync group; một server chỉ đăng ký với <strong>một</strong> Storage Sync Service</td></tr>
    <tr><td><strong>Sync group</strong></td><td>Định nghĩa topology đồng bộ cho một tập file</td><td><strong>Một cloud endpoint</strong> + một hoặc nhiều server endpoint</td></tr>
    <tr><td><strong>Cloud endpoint</strong></td><td>Một Azure file share</td><td>Một file share chỉ thuộc <strong>một</strong> sync group</td></tr>
    <tr><td><strong>Registered server</strong></td><td>Windows Server có quan hệ tin cậy với Storage Sync Service</td><td>Có thể là server đơn hoặc failover cluster</td></tr>
    <tr><td><strong>Azure File Sync agent</strong></td><td>Gói cài trên Windows Server: dịch vụ FileSyncSvc, filter driver StorageSync.sys, module PowerShell</td><td>Cài trước khi đăng ký server</td></tr>
    <tr><td><strong>Server endpoint</strong></td><td>Một đường dẫn trên registered server (ví dụ <code>D:\\Shares\\Finance</code> hoặc gốc volume)</td><td>Một server có thể có nhiều server endpoint ở các sync group khác nhau, nhưng không được chồng lấn đường dẫn; không có 2 endpoint của cùng server trong một sync group</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 310" role="img" aria-label="Topology Azure File Sync: Storage Sync Service chứa sync group Finance gồm một cloud endpoint trỏ tới Azure file share và hai server endpoint trên hai Windows Server">
  <rect class="box-a" x="10" y="10" width="700" height="196" rx="12"/>
  <text x="360" y="34" text-anchor="middle" class="t-b t-a">Storage Sync Service</text>
  <text x="360" y="52" text-anchor="middle" class="t-sm t-mute">mỗi server chỉ đăng ký với một Storage Sync Service</text>
  <rect class="zone" x="25" y="64" width="670" height="132" rx="10"/>
  <text x="40" y="84" class="t-sm t-b">Sync group: Finance (1 cloud endpoint + N server endpoint)</text>

  <rect class="box-s" x="40" y="98" width="190" height="82" rx="8"/>
  <text x="135" y="122" text-anchor="middle" class="t-b">Server endpoint</text>
  <text x="135" y="142" text-anchor="middle" class="t-sm">HN-FS01 D:\\Finance</text>
  <text x="135" y="160" text-anchor="middle" class="t-sm t-mute">tiering: giữ 20% trống</text>
  <rect class="box-w" x="265" y="98" width="190" height="82" rx="8"/>
  <text x="360" y="122" text-anchor="middle" class="t-b">Cloud endpoint</text>
  <text x="360" y="142" text-anchor="middle" class="t-sm">Azure file share</text>
  <text x="360" y="160" text-anchor="middle" class="t-sm t-mute">bản đầy đủ, nguồn chính</text>
  <rect class="box-s" x="490" y="98" width="190" height="82" rx="8"/>
  <text x="585" y="122" text-anchor="middle" class="t-b">Server endpoint</text>
  <text x="585" y="142" text-anchor="middle" class="t-sm">HCM-FS01 E:\\Finance</text>
  <text x="585" y="160" text-anchor="middle" class="t-sm t-mute">không bật tiering</text>

  <line class="ln-a" x1="234" y1="139" x2="261" y2="139" marker-start="url(#arr-a)" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="459" y1="139" x2="486" y2="139" marker-start="url(#arr-a)" marker-end="url(#arr-a)"/>

  <rect class="box" x="40" y="236" width="190" height="60" rx="8"/>
  <text x="135" y="261" text-anchor="middle" class="t-b">HN-FS01</text>
  <text x="135" y="280" text-anchor="middle" class="t-sm t-mute">Windows Server + agent</text>
  <rect class="box" x="265" y="236" width="190" height="60" rx="8"/>
  <text x="360" y="261" text-anchor="middle" class="t-b">contosofiles</text>
  <text x="360" y="280" text-anchor="middle" class="t-sm t-mute">storage account · share finance</text>
  <rect class="box" x="490" y="236" width="190" height="60" rx="8"/>
  <text x="585" y="261" text-anchor="middle" class="t-b">HCM-FS01</text>
  <text x="585" y="280" text-anchor="middle" class="t-sm t-mute">Windows Server + agent</text>

  <line class="ln dash" x1="135" y1="180" x2="135" y2="232" marker-end="url(#arr)"/>
  <line class="ln dash" x1="360" y1="180" x2="360" y2="232" marker-end="url(#arr)"/>
  <line class="ln dash" x1="585" y1="180" x2="585" y2="232" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Sync group "Finance" có đúng một cloud endpoint (Azure file share) và hai server endpoint ở hai chi nhánh. Thay đổi ở một server đi lên file share rồi xuống server còn lại; server dùng HTTPS 443. Server endpoint là một đường dẫn trên registered server, không phải bản thân server.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: triển khai Azure File Sync</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Tạo Storage Sync Service:<br><span class="path">Azure portal › Create a resource › Azure File Sync › Create</span>
      <div class="blade">
        <div class="blade-title">Deploy Storage Sync</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-files</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">sss-contoso</span></div>
        <div class="pf"><label class="req">Location</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pf"><label></label><span class="pv note">Nên đặt cùng region với storage account chứa file share.</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span></div>
      </div>
    </li>
    <li>Trên mỗi Windows Server: tắt IE Enhanced Security Configuration, cài <strong>Azure File Sync agent</strong>; hộp thoại <strong>Server Registration</strong> mở ra, đăng nhập rồi chọn <strong>Azure Subscription</strong>, <strong>Resource Group</strong>, <strong>Storage Sync Service</strong> → <strong>Register</strong>.</li>
    <li>Tạo sync group (kèm cloud endpoint):<br><span class="path">Storage Sync Service › Sync › Sync groups › + Create a sync group</span>
      <div class="blade">
        <div class="blade-title">Create a sync group</div>
        <div class="pf"><label class="req">Sync group name</label><span class="pv">Finance</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Storage account</label><span class="pv">Select storage account: contosofiles</span></div>
        <div class="pf"><label class="req">Azure File Share</label><span class="pv sel">finance</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span></div>
      </div>
    </li>
    <li>Mở sync group, chọn <strong>+ Add server endpoint</strong>: chọn <strong>Registered Server</strong>, nhập <strong>Path</strong> (<code>D:\\Finance</code>), bật <strong>Cloud Tiering</strong> với <strong>Volume Free Space Policy</strong> 20% (tùy chọn thêm <strong>Date Policy</strong>), chọn kiểu <strong>Initial Sync</strong> rồi <strong>Create</strong>. Lặp lại cho HCM-FS01.</li>
    <li>Kiểm tra sync group có trạng thái <strong>Healthy</strong>. Account cần để <strong>Allow storage account key access</strong> = Enabled thì File Sync mới hoạt động.</li>
  </ol></div>
</div>

<h4>Triển khai</h4>
<ol class="steps">
  <li>Tạo storage account và Azure file share (SMB).</li>
  <li>Tạo tài nguyên <strong>Storage Sync Service</strong> (cùng region với storage account).</li>
  <li>Trên Windows Server: tắt <em>Internet Explorer Enhanced Security Configuration</em> (cho bước đăng nhập), cài <strong>Azure File Sync agent</strong>.</li>
  <li><strong>Đăng ký server</strong> với Storage Sync Service (Server Registration UI hoặc <code>Register-AzStorageSyncServer</code>).</li>
  <li>Tạo <strong>sync group</strong> và chọn file share làm <strong>cloud endpoint</strong>.</li>
  <li>Thêm <strong>server endpoint</strong> (đường dẫn trên server), cấu hình cloud tiering nếu cần.</li>
</ol>

<h4>Cloud tiering</h4>
<ul>
  <li><strong>Volume free space policy</strong>: giữ tối thiểu X% dung lượng trống trên volume; khi thiếu, file ít truy cập nhất được tier trước.</li>
  <li><strong>Date policy</strong>: tier file không được truy cập trong N ngày.</li>
  <li>Nếu đặt cả hai, volume free space policy được ưu tiên.</li>
  <li>Cloud tiering <strong>không hỗ trợ trên system volume</strong> (ổ C: hệ điều hành).</li>
</ul>

<h4>Thay đổi trực tiếp trên Azure file share</h4>
<p>Thay đổi tạo qua SMB/REST trực tiếp trên file share được phát hiện bởi <strong>change detection job chạy mỗi 24 giờ</strong>. Muốn đồng bộ ngay, chạy <code>Invoke-AzStorageSyncChangeDetection</code>. Thay đổi trên server endpoint thì đồng bộ gần như tức thời.</p>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi đếm tài nguyên: "3 chi nhánh, mỗi nơi một file server, dùng chung 1 share" → 1 Storage Sync Service, 1 sync group, 1 cloud endpoint, <strong>3 server endpoint</strong>. "Thêm file share thứ hai vào sync group đã có" → <strong>không được</strong>, mỗi sync group chỉ một cloud endpoint. "Server đã đăng ký với Storage Sync Service A, muốn dùng thêm Service B" → không được, phải hủy đăng ký trước.</div>
`
    },
    {
      id: 'identity-based-access',
      extra: true,
      title: 'Identity-based access cho Azure Files (AD DS / Entra Kerberos)',
      html: `
<p>Thay vì mount bằng storage account key (toàn quyền), Azure Files (SMB) hỗ trợ xác thực <strong>Kerberos</strong> bằng danh tính người dùng, kết hợp phân quyền hai lớp: <strong>share-level</strong> (Azure RBAC) và <strong>directory/file-level</strong> (Windows ACL/NTFS).</p>

<h4>Ba nguồn danh tính</h4>
<table>
  <thead><tr><th>Nguồn</th><th>Danh tính</th><th>Yêu cầu client</th><th>Tình huống</th></tr></thead>
  <tbody>
    <tr><td><strong>On-premises AD DS</strong></td><td>User AD DS, đồng bộ lên Entra ID bằng Microsoft Entra Connect (để gán role share-level)</td><td>Máy domain-joined, có đường mạng tới domain controller</td><td>Doanh nghiệp đã có AD, thay thế file server</td></tr>
    <tr><td><strong>Microsoft Entra Domain Services</strong></td><td>User trong domain được quản lý</td><td>Máy join vào managed domain</td><td>Không có AD on-premises, cần domain trên Azure</td></tr>
    <tr><td><strong>Microsoft Entra Kerberos</strong></td><td>Hybrid identity (tạo ở AD DS, đồng bộ lên Entra ID)</td><td>Máy <strong>Entra joined</strong> hoặc hybrid joined; <strong>không cần</strong> đường mạng tới domain controller</td><td>Azure Virtual Desktop, người dùng làm việc từ xa</td></tr>
  </tbody>
</table>
<p>Một storage account chỉ bật được <strong>một</strong> nguồn identity cho Azure Files tại một thời điểm.</p>

<h4>Bật AD DS authentication</h4>
<ol class="steps">
  <li>Tải module <strong>AzFilesHybrid</strong> và chạy trên máy domain-joined.</li>
  <li>Chạy <code>Join-AzStorageAccount</code>: tạo trong AD một <strong>computer account</strong> (hoặc service logon account) đại diện cho storage account.</li>
  <li>Kiểm tra bằng <code>Debug-AzStorageAccountAuth</code>.</li>
</ol>
<pre><code>Import-Module AzFilesHybrid
Join-AzStorageAccount -ResourceGroupName rg-files -StorageAccountName contosofiles -DomainAccountType ComputerAccount -OrganizationalUnitDistinguishedName "OU=Storage,DC=contoso,DC=com"</code></pre>

<h4>Lớp 1: share-level permissions (Azure RBAC)</h4>
<table>
  <thead><tr><th>Role</th><th>Quyền trên share qua SMB</th></tr></thead>
  <tbody>
    <tr><td><strong>Storage File Data SMB Share Reader</strong></td><td>Đọc</td></tr>
    <tr><td><strong>Storage File Data SMB Share Contributor</strong></td><td>Đọc, ghi, xóa</td></tr>
    <tr><td><strong>Storage File Data SMB Share Elevated Contributor</strong></td><td>Đọc, ghi, xóa và <strong>sửa NTFS ACL</strong></td></tr>
  </tbody>
</table>
<ul>
  <li>Gán cho user/group <strong>có trong Entra ID</strong> (với AD DS phải được đồng bộ). Gán ở scope file share hoặc account.</li>
  <li><strong>Default share-level permission</strong>: áp dụng một role cho <em>mọi</em> danh tính đã xác thực, tiện khi chỉ muốn dùng NTFS ACL để phân quyền.</li>
</ul>
<pre><code>az role assignment create --assignee finance-team@contoso.com \\
  --role "Storage File Data SMB Share Contributor" \\
  --scope "/subscriptions/&lt;sub&gt;/resourceGroups/rg-files/providers/Microsoft.Storage/storageAccounts/contosofiles/fileServices/default/fileshares/finance"</code></pre>

<h4>Lớp 2: directory/file-level (NTFS ACL)</h4>
<ul>
  <li>Cấu hình bằng <code>icacls</code> hoặc File Explorer (tab Security) sau khi mount share với quyền đủ (account key hoặc role Elevated Contributor).</li>
  <li>Hỗ trợ đầy đủ quyền NTFS: Full control, Modify, Read &amp; execute, kế thừa…</li>
</ul>
<pre><code>icacls Z:\\Payroll /grant "CONTOSO\\Payroll-Team:(OI)(CI)M"</code></pre>

<div class="callout note"><strong>Quyền hiệu lực</strong>Người dùng phải qua <strong>cả hai lớp</strong>. Quyền thực tế là mức <strong>chặt hơn</strong> giữa share-level và NTFS. Ví dụ: có SMB Share Contributor nhưng NTFS chỉ Read → chỉ đọc được.</div>

<h4>Lưu ý khác</h4>
<ul>
  <li>Mount bằng tên FQDN của account (<code>contosofiles.file.core.windows.net</code>), vẫn cần cổng <strong>445</strong>.</li>
  <li>Identity-based auth chỉ cho <strong>SMB</strong>; NFS không hỗ trợ.</li>
  <li>Mount bằng account key bỏ qua mọi phân quyền (superuser): nên hạn chế dùng key cho người dùng cuối.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"User có quyền NTFS Modify nhưng không truy cập được share" → thiếu role <strong>share-level</strong> (ví dụ Storage File Data SMB Share Contributor). "Người dùng cần thay đổi NTFS permission trên share" → <strong>SMB Share Elevated Contributor</strong>. "Máy Entra joined, không có line-of-sight tới DC" → <strong>Microsoft Entra Kerberos</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Azure Files hỗ trợ <strong>SMB</strong>, <strong>NFS 4.1</strong> (chỉ share SSD/Premium, chỉ Linux) và REST; share tối đa <strong>100 TiB</strong>, file tối đa <strong>4 TiB</strong>.',
    'Tier Azure Files: <strong>Premium</strong> (SSD, provisioned, <code>FileStorage</code>), <strong>Transaction optimized</strong>, <strong>Hot</strong>, <strong>Cool</strong> (HDD, pay-as-you-go, GPv2). Mô hình mới <strong>provisioned v2</strong> (<code>FileStorage</code>, SSD hoặc HDD) được khuyến nghị cho triển khai mới.',
    'Azure Files không hỗ trợ <strong>RA-GRS/RA-GZRS</strong>; Premium chỉ LRS/ZRS.',
    'SMB dùng <strong>TCP 445</strong> outbound; mount từ ngoài Azure cần SMB 3.x có mã hóa.',
    'Share snapshot: cấp share, chỉ đọc, incremental, tối đa <strong>200</strong> mỗi share, giữ tối đa 10 năm; xóa share là xóa snapshot.',
    'Soft delete Azure Files: cấp <strong>share</strong>, giữ <strong>1–365 ngày</strong>, share soft-deleted vẫn tính phí.',
    'Storage Explorer kết nối bằng Entra ID, account name + key, connection string, SAS hoặc emulator Azurite; truyền dữ liệu bằng AzCopy.',
    'File Sync: một server đăng ký với <strong>một</strong> Storage Sync Service; mỗi sync group có <strong>một cloud endpoint</strong> và nhiều server endpoint.',
    'File Sync chỉ cần <strong>HTTPS 443</strong>; thay đổi trực tiếp trên Azure file share được phát hiện mỗi <strong>24 giờ</strong>.',
    'Cloud tiering: volume free space policy và date policy; không hỗ trợ trên system volume.',
    'Identity-based: AD DS, Entra Domain Services, Entra Kerberos (một nguồn mỗi account); share-level role + NTFS ACL, quyền hiệu lực là mức chặt hơn.',
    'Role share-level: SMB Share <strong>Reader</strong>, <strong>Contributor</strong>, <strong>Elevated Contributor</strong> (thêm quyền sửa NTFS ACL).'
  ],
  traps: [
    'Chọn RA-GRS cho Azure Files. Azure Files chỉ có LRS, ZRS, GRS, GZRS (Premium: LRS, ZRS).',
    'Nghĩ snapshot bảo vệ khỏi việc xóa share. Xóa share xóa luôn snapshot; cần <strong>soft delete</strong>.',
    'Nghĩ soft delete Azure Files khôi phục được từng file đã xóa. Soft delete là cấp <strong>share</strong>; file lẻ dùng snapshot/Azure Backup.',
    'Thêm hai Azure file share vào cùng một sync group. Mỗi sync group chỉ <strong>một cloud endpoint</strong>.',
    'Mở cổng 445 cho Azure File Sync. File Sync chỉ cần <strong>443</strong>.',
    'Tưởng thay đổi tạo trực tiếp trên Azure file share đồng bộ ngay xuống server. Change detection chạy <strong>24 giờ</strong> một lần.',
    'Gán NTFS ACL mà quên role share-level (hoặc ngược lại). Cần <strong>cả hai lớp</strong>.',
    'Tạo NFS share trên account Standard GPv2. NFS cần account <strong>FileStorage (SSD)</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Giao thức</td><td>SMB (445) · NFS 4.1 (SSD, Linux) · REST (443)</td></tr>
    <tr><td>Kích thước</td><td>Share 100 TiB (large file shares) · file 4 TiB</td></tr>
    <tr><td>Tier</td><td>Premium (SSD) · Transaction optimized · Hot · Cool</td></tr>
    <tr><td>Redundancy</td><td>Standard: LRS/ZRS/GRS/GZRS · Premium: LRS/ZRS · không RA</td></tr>
    <tr><td>Mount Windows</td><td><code>net use Z: \\\\acct.file.core.windows.net\\share</code></td></tr>
    <tr><td>Mount Linux</td><td><code>mount -t cifs //acct.file.core.windows.net/share</code></td></tr>
    <tr><td>Snapshot</td><td>200/share, incremental, Previous Versions</td></tr>
    <tr><td>Soft delete</td><td>Cấp share, 1–365 ngày</td></tr>
    <tr><td>File Sync</td><td>Sync Service → Sync group (1 cloud endpoint + N server endpoint)</td></tr>
    <tr><td>Cloud tiering</td><td>Volume free space / date policy; không trên system volume</td></tr>
    <tr><td>Identity</td><td>AD DS · Entra DS · Entra Kerberos</td></tr>
    <tr><td>Quyền</td><td>SMB Share Reader/Contributor/Elevated Contributor + NTFS ACL</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Azure Files hỗ trợ những giao thức nào?', back: '<strong>SMB</strong> (2.1/3.x), <strong>NFS 4.1</strong> (chỉ SSD, Linux) và <strong>REST</strong>.' },
    { front: 'Kích thước tối đa của một Azure file share?', back: '<strong>100 TiB</strong> (Standard cần bật large file shares).' },
    { front: 'Bốn tier của Azure Files?', back: '<strong>Premium</strong> (SSD), <strong>Transaction optimized</strong>, <strong>Hot</strong>, <strong>Cool</strong> (HDD).' },
    { front: 'Cổng mạng SMB cần?', back: '<strong>TCP 445</strong> outbound.' },
    { front: 'Số share snapshot tối đa mỗi share?', back: '<strong>200</strong>.' },
    { front: 'Snapshot Azure Files có incremental không?', back: '<strong>Có</strong>: chỉ lưu dữ liệu thay đổi so với snapshot trước.' },
    { front: 'Khôi phục file từ snapshot trên Windows bằng cách nào?', back: 'Properties → <strong>Previous Versions</strong> trên share đã mount.' },
    { front: 'Soft delete Azure Files áp dụng ở cấp nào, giữ bao lâu?', back: 'Cấp <strong>file share</strong>, <strong>1–365 ngày</strong>.' },
    { front: 'Các cách kết nối của Storage Explorer?', back: 'Entra ID (đăng nhập Azure), account name + key, connection string, SAS URL, local emulator (Azurite).' },
    { front: 'Sync group gồm những gì?', back: '<strong>Một cloud endpoint</strong> (Azure file share) và một hoặc nhiều <strong>server endpoint</strong>.' },
    { front: 'Một server có thể đăng ký với bao nhiêu Storage Sync Service?', back: '<strong>Một</strong>.' },
    { front: 'Hai chính sách cloud tiering?', back: '<strong>Volume free space policy</strong> và <strong>date policy</strong>.' },
    { front: 'Thay đổi trực tiếp trên Azure file share được File Sync phát hiện khi nào?', back: 'Change detection job chạy mỗi <strong>24 giờ</strong>; ép chạy bằng <code>Invoke-AzStorageSyncChangeDetection</code>.' },
    { front: 'Ba nguồn identity cho Azure Files SMB?', back: '<strong>AD DS</strong>, <strong>Microsoft Entra Domain Services</strong>, <strong>Microsoft Entra Kerberos</strong>.' },
    { front: 'Role share-level cho phép sửa NTFS ACL?', back: '<strong>Storage File Data SMB Share Elevated Contributor</strong>.' },
    { front: 'Quyền hiệu lực khi có cả share-level và NTFS?', back: 'Mức <strong>chặt hơn</strong> trong hai lớp.' },
    { front: 'Module PowerShell để join storage account vào AD DS?', back: '<strong>AzFilesHybrid</strong>, lệnh <code>Join-AzStorageAccount</code>.' }
  ],
  quiz: [
    {
      q: 'Một ứng dụng legacy trên Windows đọc và ghi file qua đường dẫn UNC. Công ty muốn chuyển dữ liệu lên Azure mà không sửa code ứng dụng. Bạn dùng dịch vụ nào?',
      options: ['Azure Blob Storage', 'Azure Files', 'Azure Queue Storage', 'Azure Table Storage'],
      answer: [1],
      explain: 'Azure Files cung cấp share SMB truy cập qua đường dẫn UNC nên ứng dụng chạy được mà không sửa code. Blob truy cập qua REST/URL. Queue và Table không phải lưu trữ file.'
    },
    {
      q: 'Người dùng làm việc tại nhà không mount được Azure file share qua SMB, trong khi VM trên Azure mount bình thường. Lệnh <code>Test-NetConnection -Port 445</code> từ nhà thất bại. Giải pháp nào khắc phục được? (Chọn 2)',
      options: ['Cấu hình Point-to-Site VPN tới VNet có private endpoint của storage account', 'Đổi redundancy của account sang GRS', 'Triển khai Azure File Sync trên file server nội bộ mà người dùng truy cập', 'Tăng quota của file share'],
      answer: [0, 2],
      explain: 'ISP đang chặn cổng 445. VPN P2S đưa traffic SMB đi trong đường hầm tới private endpoint. Azure File Sync đồng bộ qua HTTPS 443 nên người dùng truy cập server nội bộ thay vì mount trực tiếp. Redundancy và quota không liên quan tới cổng mạng.'
    },
    {
      q: 'Bạn cần file share NFS 4.1 cho cluster Linux. Bạn phải làm gì trước tiên?',
      options: ['Tạo account Standard GPv2 và share tier Hot', 'Tạo account FileStorage (Premium/SSD)', 'Bật identity-based access bằng AD DS', 'Cài Azure File Sync agent trên các node Linux'],
      answer: [1],
      explain: 'NFS 4.1 chỉ có trên share SSD trong account FileStorage. Standard GPv2 chỉ hỗ trợ SMB cho Azure Files. NFS không dùng identity-based access. Azure File Sync chỉ chạy trên Windows Server và không hỗ trợ NFS.'
    },
    {
      q: 'File share <code>projects</code> đã có 200 share snapshot. Lịch backup tạo snapshot mới bị lỗi. Bạn nên làm gì?',
      options: ['Tăng quota của share', 'Bật soft delete', 'Xóa các snapshot cũ không còn cần', 'Chuyển share sang tier Premium'],
      answer: [2],
      explain: 'Mỗi share tối đa 200 snapshot; phải xóa bớt mới tạo mới được. Snapshot không tính vào quota. Soft delete và đổi tier không thay đổi giới hạn này.'
    },
    {
      q: 'Một nhân viên xóa nhầm file <code>budget.xlsx</code> trong file share đã mount ổ Z: trên Windows. Share có snapshot hằng ngày. Cách nhanh nhất để nhân viên tự khôi phục?',
      options: ['Undelete file share trong portal', 'Mở Properties của thư mục chứa file, tab Previous Versions, khôi phục từ snapshot', 'Rehydrate file từ Archive', 'Thực hiện account failover'],
      answer: [1],
      explain: 'Share snapshot hiển thị trong tab Previous Versions của Windows, người dùng tự khôi phục được file. Undelete chỉ áp dụng cho cả share bị xóa. Azure Files không có Archive. Failover dành cho sự cố region.'
    },
    {
      q: 'Admin lỡ xóa file share <code>hr</code> hôm qua. Account đã bật soft delete cho file share với thời gian giữ 14 ngày. Điều gì đúng?',
      options: ['Không thể khôi phục vì snapshot đã bị xóa theo share', 'Chỉ khôi phục được file, không khôi phục được share', 'Phải mở support request', 'Có thể undelete share, kèm toàn bộ snapshot của nó'],
      answer: [3],
      explain: 'Soft delete cho Azure Files giữ share bị xóa trong thời gian giữ; undelete khôi phục share cùng snapshot. Soft delete hoạt động ở cấp share, không phải cấp file. Không cần support.'
    },
    {
      q: 'Công ty có 3 chi nhánh, mỗi chi nhánh một Windows file server. Cả ba cần đồng bộ cùng một thư mục <code>Shared</code> với một Azure file share duy nhất. Bạn cần tối thiểu bao nhiêu sync group và server endpoint?',
      options: ['3 sync group và 3 server endpoint', '1 sync group và 1 server endpoint', '1 sync group và 3 server endpoint', '3 sync group và 1 server endpoint'],
      answer: [2],
      explain: 'Một file share (cloud endpoint) chỉ thuộc một sync group, và sync group đó chứa một server endpoint cho mỗi server, tức 3 server endpoint. Ba sync group không dùng chung được một cloud endpoint. Một server endpoint chỉ đại diện một server.'
    },
    {
      q: 'Bạn có sync group SG1 với cloud endpoint là share <code>data1</code>. Bạn muốn đồng bộ thêm share <code>data2</code> xuống cùng server. Bạn nên làm gì?',
      options: ['Tạo sync group mới với cloud endpoint data2 và server endpoint trên thư mục khác (không chồng lấn) của server', 'Thêm data2 làm cloud endpoint thứ hai của SG1', 'Đăng ký server với Storage Sync Service thứ hai', 'Gộp data2 vào data1 bằng object replication'],
      answer: [0],
      explain: 'Mỗi sync group chỉ có một cloud endpoint, nên cần sync group mới; server có thể có nhiều server endpoint ở các sync group khác nhau nếu đường dẫn không chồng lấn. Server chỉ đăng ký với một Storage Sync Service. Object replication chỉ dành cho block blob.'
    },
    {
      q: 'File server có ổ D: 2 TB nhưng dữ liệu Azure file share đã lên 10 TB. Bạn muốn server chỉ giữ dữ liệu hay dùng và luôn còn 20% dung lượng trống. Bạn cấu hình gì?',
      options: ['Tăng quota share lên 10 TB', 'Bật cloud tiering trên server endpoint với volume free space policy 20%', 'Tạo share snapshot hằng ngày', 'Chuyển share sang tier Cool'],
      answer: [1],
      explain: 'Cloud tiering với volume free space policy giữ đủ dung lượng trống bằng cách tier file ít dùng lên Azure. Quota, snapshot và tier của share không ảnh hưởng dung lượng ổ đĩa local.'
    },
    {
      q: 'Một script copy file trực tiếp vào Azure file share qua REST. Sau 2 giờ, các file này chưa xuất hiện trên server endpoint. Bạn cần đồng bộ ngay. Bạn làm gì?',
      options: ['Khởi động lại dịch vụ FileSyncSvc', 'Tạo snapshot của share', 'Chạy <code>Invoke-AzStorageSyncChangeDetection</code> trên cloud endpoint', 'Đăng ký lại server'],
      answer: [2],
      explain: 'Thay đổi trực tiếp trên Azure file share được phát hiện bởi change detection job chạy mỗi 24 giờ; <code>Invoke-AzStorageSyncChangeDetection</code> kích hoạt phát hiện ngay. Khởi động lại agent, tạo snapshot hay đăng ký lại server không kích hoạt quét phía cloud.'
    },
    {
      q: 'Bạn đã bật AD DS authentication cho storage account. Nhóm Finance cần đọc, ghi, xóa file trong share <code>finance</code>, quyền chi tiết theo thư mục sẽ quản lý bằng NTFS. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Gán role Storage File Data SMB Share Contributor cho nhóm Finance (đã đồng bộ lên Entra ID) trên share', 'Gán role Storage Account Contributor cho nhóm Finance', 'Cấu hình NTFS ACL trên các thư mục bằng icacls hoặc File Explorer', 'Tạo service SAS cho nhóm Finance'],
      answer: [0, 2],
      explain: 'Identity-based access cần hai lớp: role share-level (SMB Share Contributor cho đọc/ghi/xóa) và NTFS ACL cho thư mục/file. Storage Account Contributor là management plane và cho phép lấy key, vi phạm least privilege. SAS không dùng cho mount SMB.'
    },
    {
      q: 'User1 có role Storage File Data SMB Share Contributor trên share. NTFS ACL của thư mục <code>Reports</code> chỉ cấp cho User1 quyền Read. User1 làm được gì trong <code>Reports</code>?',
      options: ['Đọc, ghi và xóa', 'Đọc và ghi, không xóa', 'Không truy cập được', 'Chỉ đọc'],
      answer: [3],
      explain: 'Quyền hiệu lực là mức chặt hơn giữa share-level và NTFS. Share-level cho đọc/ghi/xóa nhưng NTFS chỉ cho Read, nên User1 chỉ đọc được. User1 vẫn có quyền đọc nên không bị chặn hoàn toàn.'
    },
    {
      q: 'Người dùng Azure Virtual Desktop dùng máy Microsoft Entra joined, danh tính hybrid, không có kết nối tới domain controller. Họ cần truy cập file share FSLogix bằng danh tính của mình. Bạn bật nguồn identity nào?',
      options: ['On-premises AD DS', 'Microsoft Entra Kerberos', 'Storage account key', 'Anonymous access'],
      answer: [1],
      explain: 'Microsoft Entra Kerberos cấp Kerberos ticket cho danh tính hybrid trên máy Entra joined mà không cần đường mạng tới domain controller. AD DS yêu cầu máy có line-of-sight tới DC. Account key không phải danh tính người dùng. Azure Files không hỗ trợ anonymous.'
    },
    {
      q: 'Đối tác bên ngoài cần một công cụ đồ họa để upload tài liệu vào một file share trong 7 ngày. Họ không có tài khoản trong tenant của bạn. Bạn nên cung cấp gì?',
      options: ['Azure Storage Explorer kết nối bằng SAS URL của file share có hạn 7 ngày', 'Access key của storage account', 'Role Storage File Data SMB Share Contributor', 'Đăng ký server của đối tác với Azure File Sync'],
      answer: [0],
      explain: 'Storage Explorer kết nối được bằng SAS URL, giới hạn phạm vi share, quyền và thời hạn, không cần tài khoản Azure. Access key cho toàn quyền account. Role RBAC cần danh tính trong tenant. File Sync không phải công cụ chia sẻ cho bên ngoài.'
    }
  ]
});

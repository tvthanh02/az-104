AZ.addModule({
  id: 'p4m1',
  summary: 'Storage account là "thùng chứa" cấp cao nhất cho dữ liệu trong Azure Storage: Blob, Files, Queue, Table. Module này dạy cách chọn loại account (Standard GPv2 hay các loại Premium), chọn kiểu redundancy (LRS, ZRS, GRS, GZRS và biến thể RA-), hiểu endpoint và cách khóa truy cập mạng bằng firewall, virtual network rule, private endpoint. Đây là nhóm kiến thức được hỏi rất nhiều trong domain <em>Implement and manage storage</em> của AZ-104.',
  objectives: [
    'Phân biệt các dịch vụ dữ liệu của Azure Storage: Blob, Files, Queue, Table và managed disks',
    'Chọn đúng loại storage account (Standard GPv2, Premium block blobs, Premium file shares, Premium page blobs) theo dịch vụ và redundancy được hỗ trợ',
    'So sánh LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS về số bản sao, độ bền, quyền đọc vùng phụ và failover',
    'Thay đổi redundancy của account đang chạy: khi nào đổi trực tiếp, khi nào cần conversion, khi nào phải migrate thủ công',
    'Đọc và xây dựng URL endpoint; cấu hình firewall, virtual network rule, trusted services và private endpoint',
    'Dùng AzCopy để upload, download, sync và copy server-to-server với Microsoft Entra ID hoặc SAS'
  ],
  sections: [
    {
      id: 'implement-storage',
      unit: 'Implement Azure Storage',
      title: 'Tổng quan Azure Storage',
      html: `
<p><strong>Azure Storage</strong> là nền tảng lưu trữ đám mây được Microsoft quản lý, có các đặc điểm: <strong>bền vững</strong> (luôn có nhiều bản sao), <strong>sẵn sàng cao</strong>, <strong>bảo mật</strong> (mã hóa sẵn mọi dữ liệu), <strong>co giãn</strong> và <strong>truy cập được qua HTTP/HTTPS</strong> từ mọi nơi. Mọi dịch vụ dữ liệu đều nằm bên trong một <strong>storage account</strong>.</p>

<h4>Ba nhóm dữ liệu</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Ví dụ</th><th>Dịch vụ phù hợp</th></tr></thead>
  <tbody>
    <tr><td><strong>Structured</strong> (có cấu trúc)</td><td>Bảng có schema cố định</td><td>Azure SQL Database (không thuộc Azure Storage)</td></tr>
    <tr><td><strong>Semi-structured</strong> (bán cấu trúc)</td><td>JSON, dữ liệu dạng key-attribute, NoSQL</td><td>Azure Table Storage, Azure Cosmos DB</td></tr>
    <tr><td><strong>Unstructured</strong> (phi cấu trúc)</td><td>Ảnh, video, log, file backup, VHD</td><td>Azure Blob Storage, Azure Files</td></tr>
  </tbody>
</table>

<h4>Storage account là gì?</h4>
<ul>
  <li>Là tài nguyên Azure (<code>Microsoft.Storage/storageAccounts</code>) cung cấp <strong>namespace duy nhất toàn cầu</strong> cho dữ liệu của bạn.</li>
  <li>Tên account: <strong>3–24 ký tự</strong>, chỉ gồm <strong>chữ thường và số</strong>, duy nhất trên toàn Azure (vì nó là một phần của DNS name).</li>
  <li>Các thiết lập ở cấp account áp dụng cho mọi dữ liệu bên trong: loại account (kind), performance, redundancy, mạng, mã hóa, default access tier.</li>
  <li>Một subscription mặc định có thể tạo tối đa <strong>250 storage account mỗi region</strong> (có thể xin tăng).</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 270" role="img" aria-label="Cấu trúc storage account gồm bốn dịch vụ Blob, Files, Queue, Table và các đối tượng bên trong">
  <rect class="box-w" x="10" y="8" width="700" height="254" rx="12"/>
  <text x="360" y="32" text-anchor="middle" class="t-b t-w">Storage account: contosodata01</text>
  <text x="360" y="50" text-anchor="middle" class="t-sm t-mute">tên duy nhất toàn cầu · kind · performance · redundancy · networking · encryption</text>

  <rect class="box-a" x="28" y="64" width="160" height="50" rx="8"/>
  <text x="108" y="85" text-anchor="middle" class="t-b">Blob</text>
  <text x="108" y="103" text-anchor="middle" class="t-sm t-mute">blob.core.windows.net</text>
  <rect class="box-a" x="196" y="64" width="160" height="50" rx="8"/>
  <text x="276" y="85" text-anchor="middle" class="t-b">Files</text>
  <text x="276" y="103" text-anchor="middle" class="t-sm t-mute">file.core.windows.net</text>
  <rect class="box-a" x="364" y="64" width="160" height="50" rx="8"/>
  <text x="444" y="85" text-anchor="middle" class="t-b">Queue</text>
  <text x="444" y="103" text-anchor="middle" class="t-sm t-mute">queue.core.windows.net</text>
  <rect class="box-a" x="532" y="64" width="160" height="50" rx="8"/>
  <text x="612" y="85" text-anchor="middle" class="t-b">Table</text>
  <text x="612" y="103" text-anchor="middle" class="t-sm t-mute">table.core.windows.net</text>

  <line class="ln" x1="108" y1="114" x2="108" y2="134" marker-end="url(#arr)"/>
  <line class="ln" x1="276" y1="114" x2="276" y2="134" marker-end="url(#arr)"/>
  <line class="ln" x1="444" y1="114" x2="444" y2="134" marker-end="url(#arr)"/>
  <line class="ln" x1="612" y1="114" x2="612" y2="134" marker-end="url(#arr)"/>

  <rect class="box" x="28" y="138" width="160" height="40" rx="8"/>
  <text x="108" y="163" text-anchor="middle">Container</text>
  <rect class="box" x="196" y="138" width="160" height="40" rx="8"/>
  <text x="276" y="163" text-anchor="middle">File share</text>
  <rect class="box" x="364" y="138" width="160" height="40" rx="8"/>
  <text x="444" y="163" text-anchor="middle">Queue</text>
  <rect class="box" x="532" y="138" width="160" height="40" rx="8"/>
  <text x="612" y="163" text-anchor="middle">Table</text>

  <line class="ln" x1="108" y1="178" x2="108" y2="198" marker-end="url(#arr)"/>
  <line class="ln" x1="276" y1="178" x2="276" y2="198" marker-end="url(#arr)"/>
  <line class="ln" x1="444" y1="178" x2="444" y2="198" marker-end="url(#arr)"/>
  <line class="ln" x1="612" y1="178" x2="612" y2="198" marker-end="url(#arr)"/>

  <rect class="box" x="28" y="202" width="160" height="44" rx="8"/>
  <text x="108" y="221" text-anchor="middle">Blob</text>
  <text x="108" y="238" text-anchor="middle" class="t-sm t-mute">block · append · page</text>
  <rect class="box" x="196" y="202" width="160" height="44" rx="8"/>
  <text x="276" y="221" text-anchor="middle">Directory → File</text>
  <text x="276" y="238" text-anchor="middle" class="t-sm t-mute">SMB · NFS · REST</text>
  <rect class="box" x="364" y="202" width="160" height="44" rx="8"/>
  <text x="444" y="221" text-anchor="middle">Message</text>
  <text x="444" y="238" text-anchor="middle" class="t-sm t-mute">tối đa 64 KB</text>
  <rect class="box" x="532" y="202" width="160" height="44" rx="8"/>
  <text x="612" y="221" text-anchor="middle">Entity</text>
  <text x="612" y="238" text-anchor="middle" class="t-sm t-mute">PartitionKey + RowKey</text>
</svg>
<figcaption>Hình 1. Một storage account (Standard GPv2) chứa cả bốn dịch vụ, mỗi dịch vụ có endpoint riêng dạng <code>&lt;account&gt;.&lt;dịch vụ&gt;.core.windows.net</code>. Thiết lập ở cấp account (redundancy, mạng, mã hóa) áp dụng cho mọi dữ liệu bên trong.</figcaption>
</figure>

<h4>Tạo storage account bằng CLI / PowerShell</h4>
<pre><code># Azure CLI
az storage account create -n contosodata01 -g rg-storage -l eastus \\
  --sku Standard_GRS --kind StorageV2 --access-tier Hot \\
  --min-tls-version TLS1_2 --allow-blob-public-access false

# Azure PowerShell
New-AzStorageAccount -ResourceGroupName rg-storage -Name contosodata01 -Location eastus -SkuName Standard_GRS -Kind StorageV2 -AccessTier Hot</code></pre>
<p>Tham số <code>--sku</code> / <code>-SkuName</code> kết hợp <strong>performance + redundancy</strong>: <code>Standard_LRS</code>, <code>Standard_ZRS</code>, <code>Standard_GRS</code>, <code>Standard_RAGRS</code>, <code>Standard_GZRS</code>, <code>Standard_RAGZRS</code>, <code>Premium_LRS</code>, <code>Premium_ZRS</code>.</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo storage account</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Tìm và mở <strong>Storage accounts</strong>, chọn <strong>Create</strong>:<br><span class="path">Azure portal › Storage accounts › + Create</span></li>
    <li>Điền tab <strong>Basics</strong>. Trang tạo account chia các tùy chọn thành nhiều tab; chỉ Basics là bắt buộc, các tab khác có giá trị mặc định:
      <div class="blade">
        <div class="blade-title">Create a storage account</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Advanced</span><span>Networking</span><span>Data protection</span><span>Security</span><span>Encryption</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-storage</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Storage account name</label><span class="pv">contosodata01</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(US) East US</span></div>
        <div class="pf"><label class="req">Primary service</label><span class="pv sel">Azure Blob Storage or Azure Data Lake Storage</span></div>
        <div class="pf"><label class="req">Performance</label><span class="pv radio">Standard</span></div>
        <div class="pf"><label class="req">Redundancy</label><span class="pv sel">Geo-redundant storage (GRS)</span></div>
        <div class="pf"><label></label><span class="pv chk">Make read access to data available in the event of regional unavailability</span></div>
        <div class="pf"><label></label><span class="pv note">Tick ô này = RA-GRS. Primary service (một số trang Learn gọi là Preferred storage type) chỉ để portal gợi ý, không giới hạn dịch vụ dùng được; riêng chọn Azure Files mới hiện thêm lựa chọn billing provisioned v2.</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Advanced</strong>: chọn <strong>Access tier</strong> mặc định (Hot/Cool), bật <strong>Enable hierarchical namespace</strong> nếu cần Data Lake Storage Gen2 (chỉ chọn được lúc tạo).</li>
    <li>Tab <strong>Security</strong>: giữ <strong>Require secure transfer for REST API operations</strong>, <strong>Minimum TLS version</strong> = Version 1.2; cân nhắc bỏ chọn <strong>Allow enabling anonymous access on individual containers</strong>.</li>
    <li>Chọn <strong>Review + create</strong>, chờ validation passed rồi chọn <strong>Create</strong>. Sau khi tạo, xem lại cấu hình tại <span class="path">Storage account › Settings › Configuration</span>.</li>
  </ol></div>
</div>

<div class="callout note"><strong>Performance không đổi được</strong>Performance (Standard/Premium) và loại account Premium được chọn lúc tạo. Muốn chuyển từ Standard sang Premium (hoặc ngược lại) phải tạo account mới rồi copy dữ liệu (ví dụ bằng AzCopy).</div>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi đặt tên storage account hay cài bẫy bằng chữ hoa, dấu gạch ngang hoặc gạch dưới (<code>Contoso-Data</code>, <code>contoso_data</code>): tất cả đều <strong>không hợp lệ</strong>. Chỉ chữ thường và số, 3–24 ký tự.</div>
`
    },
    {
      id: 'storage-services',
      unit: 'Explore Azure Storage services',
      title: 'Các dịch vụ dữ liệu: Blob, Files, Queue, Table, Disks',
      html: `
<table>
  <thead><tr><th>Dịch vụ</th><th>Mô tả</th><th>Truy cập</th><th>Tình huống điển hình</th></tr></thead>
  <tbody>
    <tr><td><strong>Azure Blob Storage</strong></td><td>Object storage cho dữ liệu phi cấu trúc khối lượng lớn. Tổ chức theo <em>account → container → blob</em>.</td><td>REST/HTTPS, SDK, AzCopy, NFS 3.0, SFTP (tùy chọn)</td><td>Ảnh/video cho web, backup, data lake, log</td></tr>
    <tr><td><strong>Azure Files</strong></td><td>File share được quản lý hoàn toàn, mount được như ổ đĩa mạng.</td><td>SMB 3.x, NFS 4.1, REST</td><td>Thay thế file server, lift-and-shift ứng dụng cần đường dẫn chia sẻ</td></tr>
    <tr><td><strong>Azure Queue Storage</strong></td><td>Hàng đợi message đơn giản, mỗi message tối đa <strong>64 KB</strong>.</td><td>REST/HTTPS</td><td>Tách rời (decouple) các thành phần ứng dụng, xử lý bất đồng bộ</td></tr>
    <tr><td><strong>Azure Table Storage</strong></td><td>NoSQL key-attribute, không schema; khóa là <code>PartitionKey</code> + <code>RowKey</code>.</td><td>REST/OData</td><td>Lưu metadata, hồ sơ người dùng, dữ liệu thiết bị</td></tr>
    <tr><td><strong>Azure managed disks</strong></td><td>Ổ đĩa block-level cho VM, Azure tự quản lý storage bên dưới (page blob).</td><td>Gắn vào VM</td><td>OS disk, data disk của VM</td></tr>
  </tbody>
</table>

<h4>Blob Storage chi tiết hơn</h4>
<ul>
  <li><strong>Container</strong> giống thư mục cấp đầu, chứa không giới hạn số blob. Có thể bật <strong>hierarchical namespace</strong> để biến account thành <strong>Azure Data Lake Storage Gen2</strong> (có thư mục thật, ACL kiểu POSIX).</li>
  <li>Ba loại blob: <strong>block blob</strong> (file thông thường), <strong>append blob</strong> (log, chỉ ghi nối thêm), <strong>page blob</strong> (VHD, truy cập ngẫu nhiên 512 byte).</li>
  <li>Tính năng <strong>static website</strong> phục vụ HTML/CSS/JS từ container đặc biệt <code>$web</code>.</li>
</ul>

<h4>Queue Storage</h4>
<ul>
  <li>Thời gian sống mặc định (TTL) của message là <strong>7 ngày</strong>; có thể đặt <code>-1</code> để không bao giờ hết hạn.</li>
  <li>Một queue có thể chứa hàng triệu message, giới hạn bởi dung lượng account.</li>
  <li>Khác với Azure Service Bus: Queue Storage không đảm bảo thứ tự FIFO, không có topic/subscription. Đề hay hỏi "cần hàng đợi đơn giản, rẻ, lưu &gt; 80 GB message" thì chọn Queue Storage.</li>
</ul>

<h4>Managed disks và storage account</h4>
<p>Managed disk <strong>không nằm</strong> trong storage account do bạn tạo; Azure tự quản lý. Bạn chỉ chọn loại disk (Standard HDD, Standard SSD, Premium SSD, Premium SSD v2, Ultra Disk) và redundancy (LRS hoặc ZRS). Unmanaged disk (VHD là page blob trong storage account của bạn) là mô hình cũ, đã ngừng hỗ trợ.</p>

<pre><code># Tạo container, queue, table, file share
az storage container create --account-name contosodata01 -n images --auth-mode login
az storage queue create     --account-name contosodata01 -n orders  --auth-mode login
az storage table create     --account-name contosodata01 -n devices
az storage share-rm create  -g rg-storage --storage-account contosodata01 -n teamshare --quota 1024</code></pre>

<div class="callout exam"><strong>Góc thi</strong>Ứng dụng cũ cần ổ đĩa mạng dùng giao thức SMB → <strong>Azure Files</strong>. Lưu ảnh/video để web truy cập qua URL → <strong>Blob</strong>. Dữ liệu NoSQL key-value rẻ → <strong>Table</strong>. Thông điệp giữa front-end và worker → <strong>Queue</strong>.</div>
`
    },
    {
      id: 'account-types',
      unit: 'Determine storage account types',
      title: 'Các loại storage account',
      html: `
<p>Loại account (kind + performance) quyết định <strong>dịch vụ nào được hỗ trợ</strong> và <strong>redundancy nào được chọn</strong>.</p>
<table>
  <thead><tr><th>Loại account</th><th>Kind / SKU</th><th>Dịch vụ hỗ trợ</th><th>Redundancy</th><th>Khi nào dùng</th></tr></thead>
  <tbody>
    <tr><td><strong>Standard general-purpose v2</strong></td><td><code>StorageV2</code>, <code>Standard_*</code></td><td>Blob (gồm Data Lake Storage), Files, Queue, Table</td><td>LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS</td><td>Mặc định cho hầu hết tình huống</td></tr>
    <tr><td><strong>Premium block blobs</strong></td><td><code>BlockBlobStorage</code>, <code>Premium_*</code></td><td>Block blob và append blob</td><td>LRS, ZRS</td><td>Tỉ lệ giao dịch cao, object nhỏ, cần độ trễ thấp ổn định</td></tr>
    <tr><td><strong>Premium file shares</strong></td><td><code>FileStorage</code>, <code>Premium_*</code></td><td>Chỉ Azure Files (SMB và NFS)</td><td>LRS, ZRS</td><td>File share hiệu năng cao trên SSD; bắt buộc nếu muốn NFS 4.1</td></tr>
    <tr><td><strong>Premium page blobs</strong></td><td><code>StorageV2</code>, <code>Premium_LRS</code></td><td>Chỉ page blob</td><td>LRS</td><td>VHD/unmanaged disk hiệu năng cao</td></tr>
  </tbody>
</table>

<div class="callout note"><strong>Loại cũ (legacy)</strong>General-purpose v1 (<code>Storage</code>) và Blob Storage (<code>BlobStorage</code>) là loại cũ, không nên tạo mới. Nâng cấp GPv1 lên GPv2 bằng <code>az storage account update --set kind=StorageV2</code> hoặc <code>Set-AzStorageAccount -UpgradeToStorageV2</code>. Nâng cấp là <strong>một chiều</strong>, không quay lại được.</div>

<h4>Standard vs Premium</h4>
<div class="compare">
  <div><strong>Standard</strong>Ổ HDD, tính phí theo dung lượng dùng thực tế + giao dịch. Hỗ trợ đầy đủ access tier (Hot/Cool/Cold/Archive) và mọi kiểu redundancy kể cả geo.</div>
  <div><strong>Premium</strong>Ổ SSD, độ trễ thấp. <strong>Không có geo-redundancy</strong> (chỉ LRS/ZRS; page blob chỉ LRS). Không dùng access tier Hot/Cool/Cold/Archive cho blob.</div>
</div>

<h4>Giới hạn đáng nhớ</h4>
<ul>
  <li>Dung lượng tối đa mặc định của một storage account Standard: <strong>5 PiB</strong> (có thể xin tăng).</li>
  <li>File share Standard mặc định tối đa 5 TiB; bật <strong>large file shares</strong> để lên <strong>100 TiB</strong>. Bật large file shares rồi thì không tắt được.</li>
  <li>Mỗi account có <strong>2 access key</strong> (key1, key2) để xoay vòng.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Cần file share Premium với redundancy GRS" là <strong>không thể</strong>: Premium chỉ có LRS/ZRS. "Cần lưu blob, file, queue và table trong cùng một account" → <strong>Standard GPv2</strong>. "Cần NFS file share" → <strong>FileStorage (Premium file shares)</strong>. "Cần chuyển dữ liệu sang Archive" → phải là <strong>Standard</strong> account với LRS/GRS/RA-GRS.</div>
`
    },
    {
      id: 'replication',
      unit: 'Determine replication strategies',
      title: 'Chiến lược redundancy (replication)',
      html: `
<p>Azure Storage <strong>luôn</strong> lưu nhiều bản sao. Bạn chỉ chọn mức độ: sao chép trong một datacenter, giữa các availability zone, và có sang region phụ (paired region) hay không.</p>
<table>
  <thead><tr><th>Kiểu</th><th>Số bản sao</th><th>Phân bố</th><th>Độ bền / năm</th><th>Đọc ở vùng phụ</th></tr></thead>
  <tbody>
    <tr><td><strong>LRS</strong></td><td>3</td><td>1 datacenter ở region chính</td><td>≥ 11 số 9</td><td>Không</td></tr>
    <tr><td><strong>ZRS</strong></td><td>3</td><td>3 availability zone ở region chính (đồng bộ)</td><td>≥ 12 số 9</td><td>Không</td></tr>
    <tr><td><strong>GRS</strong></td><td>6</td><td>LRS ở region chính + LRS ở region phụ (bất đồng bộ)</td><td>≥ 16 số 9</td><td>Chỉ sau failover</td></tr>
    <tr><td><strong>RA-GRS</strong></td><td>6</td><td>Như GRS</td><td>≥ 16 số 9</td><td><strong>Có</strong>, luôn luôn</td></tr>
    <tr><td><strong>GZRS</strong></td><td>6</td><td>ZRS ở region chính + LRS ở region phụ</td><td>≥ 16 số 9</td><td>Chỉ sau failover</td></tr>
    <tr><td><strong>RA-GZRS</strong></td><td>6</td><td>Như GZRS</td><td>≥ 16 số 9</td><td><strong>Có</strong>, luôn luôn</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 380" role="img" aria-label="Vị trí các bản sao dữ liệu của LRS, ZRS, GRS và GZRS giữa datacenter, availability zone và region phụ">
  <text x="245" y="18" text-anchor="middle" class="t-sm t-b">Region chính (ghi đồng bộ)</text>
  <text x="590" y="18" text-anchor="middle" class="t-sm t-b">Region phụ – paired (luôn LRS)</text>

  <text x="50" y="60" text-anchor="middle" class="t-b">LRS</text>
  <text x="50" y="78" text-anchor="middle" class="t-sm t-mute">3 bản sao</text>
  <rect class="zone" x="100" y="30" width="290" height="64" rx="10"/>
  <rect class="box" x="180" y="40" width="130" height="44" rx="8"/>
  <text x="245" y="57" text-anchor="middle" class="t-sm">1 datacenter</text>
  <rect class="box-w" x="223" y="64" width="12" height="12" rx="2"/>
  <rect class="box-w" x="239" y="64" width="12" height="12" rx="2"/>
  <rect class="box-w" x="255" y="64" width="12" height="12" rx="2"/>
  <text x="590" y="66" text-anchor="middle" class="t-sm t-mute">Không sao chép sang region phụ</text>

  <text x="50" y="140" text-anchor="middle" class="t-b">ZRS</text>
  <text x="50" y="158" text-anchor="middle" class="t-sm t-mute">3 bản sao</text>
  <rect class="zone" x="100" y="110" width="290" height="64" rx="10"/>
  <rect class="box" x="107" y="120" width="84" height="44" rx="8"/>
  <text x="149" y="137" text-anchor="middle" class="t-sm">Zone 1</text>
  <rect class="box-w" x="143" y="144" width="12" height="12" rx="2"/>
  <rect class="box" x="203" y="120" width="84" height="44" rx="8"/>
  <text x="245" y="137" text-anchor="middle" class="t-sm">Zone 2</text>
  <rect class="box-w" x="239" y="144" width="12" height="12" rx="2"/>
  <rect class="box" x="299" y="120" width="84" height="44" rx="8"/>
  <text x="341" y="137" text-anchor="middle" class="t-sm">Zone 3</text>
  <rect class="box-w" x="335" y="144" width="12" height="12" rx="2"/>
  <text x="590" y="146" text-anchor="middle" class="t-sm t-mute">Không sao chép sang region phụ</text>

  <text x="50" y="220" text-anchor="middle" class="t-b">GRS</text>
  <text x="50" y="238" text-anchor="middle" class="t-sm t-mute">6 bản sao</text>
  <rect class="zone" x="100" y="190" width="290" height="64" rx="10"/>
  <rect class="box" x="180" y="200" width="130" height="44" rx="8"/>
  <text x="245" y="217" text-anchor="middle" class="t-sm">1 datacenter</text>
  <rect class="box-w" x="223" y="224" width="12" height="12" rx="2"/>
  <rect class="box-w" x="239" y="224" width="12" height="12" rx="2"/>
  <rect class="box-w" x="255" y="224" width="12" height="12" rx="2"/>
  <line class="ln-a dash" x1="392" y1="222" x2="466" y2="222" marker-end="url(#arr-a)"/>
  <text x="430" y="213" text-anchor="middle" class="t-sm t-a">async</text>
  <rect class="zone" x="470" y="190" width="240" height="64" rx="10"/>
  <rect class="box" x="525" y="200" width="130" height="44" rx="8"/>
  <text x="590" y="217" text-anchor="middle" class="t-sm">1 datacenter</text>
  <rect class="box-w" x="568" y="224" width="12" height="12" rx="2"/>
  <rect class="box-w" x="584" y="224" width="12" height="12" rx="2"/>
  <rect class="box-w" x="600" y="224" width="12" height="12" rx="2"/>

  <text x="50" y="300" text-anchor="middle" class="t-b">GZRS</text>
  <text x="50" y="318" text-anchor="middle" class="t-sm t-mute">6 bản sao</text>
  <rect class="zone" x="100" y="270" width="290" height="64" rx="10"/>
  <rect class="box" x="107" y="280" width="84" height="44" rx="8"/>
  <text x="149" y="297" text-anchor="middle" class="t-sm">Zone 1</text>
  <rect class="box-w" x="143" y="304" width="12" height="12" rx="2"/>
  <rect class="box" x="203" y="280" width="84" height="44" rx="8"/>
  <text x="245" y="297" text-anchor="middle" class="t-sm">Zone 2</text>
  <rect class="box-w" x="239" y="304" width="12" height="12" rx="2"/>
  <rect class="box" x="299" y="280" width="84" height="44" rx="8"/>
  <text x="341" y="297" text-anchor="middle" class="t-sm">Zone 3</text>
  <rect class="box-w" x="335" y="304" width="12" height="12" rx="2"/>
  <line class="ln-a dash" x1="392" y1="302" x2="466" y2="302" marker-end="url(#arr-a)"/>
  <text x="430" y="293" text-anchor="middle" class="t-sm t-a">async</text>
  <rect class="zone" x="470" y="270" width="240" height="64" rx="10"/>
  <rect class="box" x="525" y="280" width="130" height="44" rx="8"/>
  <text x="590" y="297" text-anchor="middle" class="t-sm">1 datacenter</text>
  <rect class="box-w" x="568" y="304" width="12" height="12" rx="2"/>
  <rect class="box-w" x="584" y="304" width="12" height="12" rx="2"/>
  <rect class="box-w" x="600" y="304" width="12" height="12" rx="2"/>

  <rect class="box-s" x="100" y="348" width="610" height="28" rx="8"/>
  <text x="405" y="367" text-anchor="middle" class="t-sm">RA-GRS / RA-GZRS: thêm endpoint chỉ đọc &lt;account&gt;-secondary ở region phụ</text>
</svg>
<figcaption>Hình 1. Mỗi ô vàng là một bản sao. Trong region chính, LRS giữ 3 bản sao trong một datacenter, ZRS rải 3 bản sao qua 3 availability zone. GRS/GZRS sao chép bất đồng bộ thêm 3 bản sao (LRS) sang paired region; biến thể RA- cho phép đọc bản sao đó mà không cần failover.</figcaption>
</figure>

<h4>Chi tiết quan trọng</h4>
<ul>
  <li>Ghi vào region chính là <strong>đồng bộ</strong> (LRS/ZRS); sao chép sang region phụ là <strong>bất đồng bộ</strong>, nên có thể mất dữ liệu gần nhất. RPO thường dưới 15 phút nhưng <strong>không có SLA</strong> cho thời gian sao chép.</li>
  <li>Region phụ luôn dùng <strong>LRS</strong>, kể cả với GZRS.</li>
  <li>Thuộc tính <code>LastSyncTime</code> cho biết dữ liệu ghi trước thời điểm nào chắc chắn đã có ở vùng phụ: <code>az storage account show -n acct --expand geoReplicationStats</code>.</li>
  <li>Thứ tự chi phí từ rẻ đến đắt: <strong>LRS &lt; ZRS &lt; GRS &lt; RA-GRS &lt; GZRS &lt; RA-GZRS</strong>.</li>
</ul>

<h4>Failover</h4>
<ul>
  <li><strong>Customer-managed failover</strong>: bạn chủ động chuyển region phụ thành chính khi region chính gặp sự cố (account GRS/RA-GRS/GZRS/RA-GZRS). Có thể mất dữ liệu chưa kịp sao chép (sau <code>LastSyncTime</code>).</li>
  <li>Sau <strong>unplanned failover</strong>, account trở thành <strong>LRS</strong> ở region chính mới. Phải cấu hình lại geo-redundancy (phát sinh chi phí sao chép lại).</li>
  <li><strong>Microsoft-managed failover</strong> chỉ xảy ra trong thảm họa cấp region; không nên dựa vào nó trong kế hoạch DR.</li>
</ul>
<pre><code>az storage account failover -n contosodata01 -g rg-storage
Invoke-AzStorageAccountFailover -ResourceGroupName rg-storage -Name contosodata01</code></pre>

<h4>Chọn kiểu nào?</h4>
<ul>
  <li>Dữ liệu có thể tái tạo, chi phí thấp nhất → <strong>LRS</strong>.</li>
  <li>Cần chịu được sự cố một datacenter/zone mà vẫn đọc ghi liên tục → <strong>ZRS</strong>.</li>
  <li>Chịu được sự cố cả region → <strong>GRS/GZRS</strong>; cần <em>đọc</em> dữ liệu ngay cả khi region chính sập mà không chờ failover → <strong>RA-GRS/RA-GZRS</strong>.</li>
  <li>Yêu cầu cao nhất (chịu lỗi zone + region + đọc vùng phụ) → <strong>RA-GZRS</strong>.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Câu "chi phí thấp nhất mà vẫn đọc được dữ liệu khi region chính không khả dụng" → <strong>RA-GRS</strong>. Câu "chịu được mất một availability zone, chi phí thấp nhất" → <strong>ZRS</strong>. Nhớ: <strong>Archive tier không hỗ trợ ZRS, GZRS, RA-GZRS</strong>.</div>
`
    },
    {
      id: 'access-storage',
      unit: 'Access storage',
      title: 'Endpoint và cách truy cập storage',
      html: `
<p>Mỗi đối tượng trong Azure Storage có một <strong>URL duy nhất</strong> được ghép từ tên account, loại dịch vụ và đường dẫn đối tượng.</p>
<table>
  <thead><tr><th>Dịch vụ</th><th>Endpoint mặc định</th></tr></thead>
  <tbody>
    <tr><td>Blob</td><td><code>https://&lt;account&gt;.blob.core.windows.net</code></td></tr>
    <tr><td>Data Lake Storage Gen2</td><td><code>https://&lt;account&gt;.dfs.core.windows.net</code></td></tr>
    <tr><td>Files</td><td><code>https://&lt;account&gt;.file.core.windows.net</code></td></tr>
    <tr><td>Queue</td><td><code>https://&lt;account&gt;.queue.core.windows.net</code></td></tr>
    <tr><td>Table</td><td><code>https://&lt;account&gt;.table.core.windows.net</code></td></tr>
    <tr><td>Static website</td><td><code>https://&lt;account&gt;.z&lt;số&gt;.web.core.windows.net</code></td></tr>
  </tbody>
</table>
<p>Ví dụ blob <code>logo.png</code> trong container <code>images</code> của account <code>contosodata01</code>:<br><code>https://contosodata01.blob.core.windows.net/images/logo.png</code></p>
<p>Với RA-GRS/RA-GZRS, endpoint đọc ở vùng phụ thêm hậu tố <code>-secondary</code>: <code>https://contosodata01-secondary.blob.core.windows.net</code>.</p>

<h4>Custom domain</h4>
<p>Có thể ánh xạ tên miền riêng (ví dụ <code>www.contoso.com</code>) tới <strong>Blob endpoint</strong> bằng bản ghi <strong>CNAME</strong>:</p>
<ul>
  <li><strong>Ánh xạ trực tiếp</strong>: tạo CNAME <code>www.contoso.com → contosodata01.blob.core.windows.net</code>. Có thể gián đoạn ngắn trong lúc DNS cập nhật.</li>
  <li><strong>Ánh xạ trung gian qua asverify</strong>: tạo trước CNAME <code>asverify.www.contoso.com → asverify.contosodata01.blob.core.windows.net</code> để Azure xác minh tên miền, sau đó mới đổi CNAME chính, tránh downtime.</li>
  <li>Azure Storage <strong>không hỗ trợ HTTPS với custom domain</strong> trực tiếp. Muốn HTTPS cho tên miền riêng, đặt <strong>Azure Front Door</strong> hoặc <strong>Azure CDN</strong> phía trước.</li>
  <li>Mỗi storage account chỉ gán được <strong>một</strong> custom domain cho Blob.</li>
</ul>

<h4>Các công cụ truy cập dữ liệu</h4>
<ul>
  <li>Azure portal (Storage browser), Azure Storage Explorer</li>
  <li>Azure CLI (<code>az storage ...</code>), Azure PowerShell (<code>Az.Storage</code>), AzCopy</li>
  <li>SDK (.NET, Java, Python, JavaScript, Go) và REST API</li>
</ul>
<p>Lệnh CLI cho data plane cần chỉ định cách xác thực: <code>--auth-mode login</code> (Microsoft Entra ID, cần role data plane như Storage Blob Data Contributor) hoặc <code>--auth-mode key</code> / <code>--account-key</code> / <code>--sas-token</code>.</p>

<div class="callout exam"><strong>Góc thi</strong>Đề có thể cho URL và hỏi dịch vụ: <code>.file.</code> → Azure Files, <code>.dfs.</code> → Data Lake Storage Gen2, <code>-secondary</code> → account đang dùng RA-GRS hoặc RA-GZRS. Tình huống "tên miền riêng, không gián đoạn khi cấu hình" → dùng bản ghi <strong>asverify</strong>.</div>
`
    },
    {
      id: 'secure-endpoints',
      unit: 'Secure storage endpoints',
      title: 'Bảo vệ endpoint: firewall, VNet rule, private endpoint',
      html: `
<p>Mặc định storage account nhận kết nối từ <strong>mọi mạng</strong> (vẫn cần xác thực). Trang <strong>Networking</strong> cho phép thu hẹp phạm vi.</p>

<h4>Public network access</h4>
<ul>
  <li><strong>Enabled from all networks</strong>: mặc định.</li>
  <li><strong>Enabled from selected virtual networks and IP addresses</strong>: bật firewall, đặt default action = <code>Deny</code>, chỉ cho phép VNet/IP/instance được liệt kê.</li>
  <li><strong>Disabled</strong>: chặn hoàn toàn public endpoint; chỉ truy cập qua <strong>private endpoint</strong>.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="Ba đường truy cập tới storage account: client Internet bị firewall chặn, subnet có service endpoint được VNet rule cho phép, on-premises đi qua private endpoint">
  <rect class="box-x" x="10" y="20" width="150" height="54" rx="10"/>
  <text x="85" y="43" text-anchor="middle" class="t-b">Client Internet</text>
  <text x="85" y="62" text-anchor="middle" class="t-sm t-mute">IP không có trong rule</text>

  <rect class="zone" x="180" y="96" width="290" height="190" rx="12"/>
  <text x="196" y="116" class="t-sm t-mute">VNet (Azure)</text>
  <rect class="box-a" x="196" y="128" width="150" height="56" rx="8"/>
  <text x="271" y="151" text-anchor="middle" class="t-b">Subnet app</text>
  <text x="271" y="171" text-anchor="middle" class="t-sm t-mute">service endpoint</text>
  <rect class="box-s" x="196" y="212" width="150" height="56" rx="8"/>
  <text x="271" y="235" text-anchor="middle" class="t-b">Private endpoint</text>
  <text x="271" y="255" text-anchor="middle" class="t-sm t-mute">NIC 10.0.2.5</text>

  <rect class="box" x="10" y="212" width="150" height="56" rx="10"/>
  <text x="85" y="235" text-anchor="middle" class="t-b">On-premises</text>
  <text x="85" y="255" text-anchor="middle" class="t-sm t-mute">VPN / ExpressRoute</text>

  <rect class="box-w" x="520" y="20" width="190" height="266" rx="12"/>
  <text x="615" y="44" text-anchor="middle" class="t-b t-w">Storage account</text>
  <rect class="box" x="532" y="60" width="166" height="72" rx="8"/>
  <text x="615" y="88" text-anchor="middle" class="t-b">Public endpoint</text>
  <text x="615" y="108" text-anchor="middle" class="t-sm t-mute">firewall · default Deny</text>
  <rect class="box" x="532" y="190" width="166" height="72" rx="8"/>
  <text x="615" y="219" text-anchor="middle" class="t-b">Dữ liệu</text>
  <text x="615" y="239" text-anchor="middle" class="t-sm t-mute">1 PE / sub-resource</text>
  <line class="ln" x1="615" y1="132" x2="615" y2="186" marker-end="url(#arr)"/>

  <line class="ln-x dash" x1="160" y1="47" x2="528" y2="80" marker-end="url(#arr-x)"/>
  <text x="340" y="50" text-anchor="middle" class="t-sm t-x">bị chặn (Deny)</text>
  <line class="ln-s" x1="346" y1="150" x2="528" y2="112" marker-end="url(#arr-s)"/>
  <text x="430" y="150" text-anchor="middle" class="t-sm t-s">VNet rule ✓</text>
  <line class="ln-s" x1="160" y1="240" x2="192" y2="240" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="346" y1="240" x2="528" y2="226" marker-end="url(#arr-s)"/>
  <text x="430" y="257" text-anchor="middle" class="t-sm t-s">Private Link</text>
</svg>
<figcaption>Hình 1. Khi firewall đặt default action = Deny, client Internet bị chặn; subnet có service endpoint <code>Microsoft.Storage</code> được VNet rule cho phép nhưng vẫn đi tới <em>public endpoint</em>; máy on-premises qua VPN/ExpressRoute dùng private endpoint (private IP trong VNet) và không phụ thuộc firewall của public endpoint.</figcaption>
</figure>

<h4>Virtual network rules (service endpoint)</h4>
<ol class="steps">
  <li>Bật <strong>service endpoint <code>Microsoft.Storage</code></strong> trên subnet.</li>
  <li>Thêm subnet đó vào danh sách VNet được phép trong firewall của storage account.</li>
  <li>Traffic từ subnet đi theo đường backbone Azure tới <em>public endpoint</em>, nhưng storage nhận diện được nguồn là subnet của bạn.</li>
</ol>
<pre><code>az network vnet subnet update -g rg-net --vnet-name vnet1 -n app \\
  --service-endpoints Microsoft.Storage
az storage account update -n contosodata01 -g rg-storage --default-action Deny
az storage account network-rule add -n contosodata01 -g rg-storage \\
  --vnet-name vnet1 --subnet app
az storage account network-rule add -n contosodata01 -g rg-storage --ip-address 203.0.113.0/24</code></pre>

<h4>IP network rules</h4>
<ul>
  <li>Chỉ dùng cho địa chỉ <strong>public IP</strong>. Không thêm được dải private (10.x, 172.16–31.x, 192.168.x).</li>
  <li>Không hỗ trợ prefix <code>/31</code> và <code>/32</code>: với một IP lẻ, nhập IP đó không kèm prefix.</li>
  <li>Client on-premises đi qua ExpressRoute (Microsoft peering) hoặc NAT: thêm <strong>public IP NAT</strong> của họ.</li>
</ul>

<h4>Exceptions và resource instance rules</h4>
<ul>
  <li><strong>Allow Azure services on the trusted services list</strong>: cho phép các dịch vụ tin cậy như Azure Backup, Azure Site Recovery, Event Grid, Azure Monitor, Azure DevTest Labs… truy cập dù firewall đang bật. Nhiều dịch vụ cần dùng <strong>managed identity</strong> để được tính là trusted.</li>
  <li><strong>Resource instance rules</strong>: cho phép một instance cụ thể (ví dụ một Synapse workspace hay Data Factory) truy cập dựa trên managed identity.</li>
  <li>Cho phép đọc log/metrics từ mọi mạng.</li>
</ul>

<h4>Private endpoint</h4>
<div class="compare">
  <div><strong>Service endpoint</strong>Miễn phí. Traffic vẫn tới <em>public IP</em> của storage. Chỉ cho subnet trong Azure (cùng region, hoặc paired region với account GRS). Không dùng được từ on-premises.</div>
  <div><strong>Private endpoint (Private Link)</strong>Tạo một <strong>NIC có private IP</strong> trong VNet cho từng sub-resource (<code>blob</code>, <code>file</code>, <code>queue</code>, <code>table</code>, <code>dfs</code>, <code>web</code>). Truy cập được từ on-premises qua VPN/ExpressRoute và từ VNet peering. Tính phí theo giờ + GB.</div>
</div>
<ul>
  <li>DNS: dùng Private DNS zone <code>privatelink.blob.core.windows.net</code> (tương tự <code>privatelink.file...</code>). Tên <code>contosodata01.blob.core.windows.net</code> sẽ được phân giải về private IP qua CNAME <code>contosodata01.privatelink.blob.core.windows.net</code>.</li>
  <li>Mỗi dịch vụ cần một private endpoint riêng: có private endpoint cho <code>blob</code> không có nghĩa là Azure Files cũng đi qua private IP.</li>
  <li>Muốn chặn hoàn toàn Internet: tạo private endpoint <strong>và</strong> đặt Public network access = Disabled.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: chỉ cho phép một subnet và một dải IP</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở storage account, vào trang Networking:<br><span class="path">Storage account › Security + networking › Networking</span></li>
    <li>Ở mục public network access chọn <strong>Manage</strong>, chọn <strong>Enable</strong> rồi <strong>Enabled from selected networks</strong>:
      <div class="blade">
        <div class="blade-title">Public network access</div>
        <div class="pf"><label>Public network access</label><span class="pv radio">Enable</span></div>
        <div class="pf"><label></label><span class="pv">Disable</span></div>
        <div class="pf"><label></label><span class="pv">Secured by perimeter</span></div>
        <div class="pf"><label>Public network access scope</label><span class="pv radio">Enabled from selected networks</span></div>
        <div class="pf"><label></label><span class="pv">Enabled from all networks</span></div>
        <div class="pf"><label></label><span class="pv note">Tương đương default action = Deny; chỉ VNet/IP/resource instance được liệt kê mới vào được.</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Ở mục <em>Resource settings: Virtual networks, IP addresses, and exceptions</em> chọn <strong>View</strong>. Dưới <strong>Virtual networks</strong> chọn <strong>Add existing virtual network</strong>:
      <div class="blade">
        <div class="blade-title">Add networks</div>
        <div class="pf"><label class="req">Virtual networks</label><span class="pv sel">vnet1</span></div>
        <div class="pf"><label class="req">Subnets</label><span class="pv sel">app</span></div>
        <div class="pf"><label></label><span class="pv note">Nếu subnet chưa có service endpoint Microsoft.Storage, portal cho phép bật luôn trong thao tác này.</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span></div>
      </div>
    </li>
    <li>Thêm dải IP public của văn phòng (ví dụ <code>203.0.113.0/24</code>) vào danh sách IPv4 addresses, và nếu dùng Azure Backup/Site Recovery thì bật ngoại lệ <strong>Allow Azure services on the trusted services list to access this storage account</strong>. Chọn <strong>Save</strong>.</li>
    <li>Kiểm tra: từ máy không nằm trong danh sách, mở Storage browser sẽ báo lỗi kiểu <em>This request is not authorized to perform this operation</em>. Thay đổi firewall có thể mất tới khoảng một phút để có hiệu lực.</li>
  </ol></div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Máy on-premises truy cập file share qua VPN bằng private IP" → <strong>private endpoint</strong> (service endpoint không làm được). "Chỉ cho VM trong subnet A truy cập, chi phí thấp nhất" → <strong>service endpoint + VNet rule</strong>. "Azure Backup không còn truy cập được sau khi bật firewall" → bật <strong>trusted Microsoft services</strong>.</div>
`
    },
    {
      id: 'change-replication',
      extra: true,
      title: 'Chuyển đổi kiểu replication',
      html: `
<p>Có ba cách thay đổi redundancy của account đang chạy:</p>
<ol>
  <li><strong>Đổi trực tiếp</strong> (portal, CLI, PowerShell): thêm/bớt <strong>geo-redundancy</strong> hoặc <strong>read access</strong>. Gần như tức thời, không downtime.</li>
  <li><strong>Conversion</strong> (trước đây gọi là live migration): thêm/bớt <strong>zone-redundancy</strong>. Không mất dữ liệu, không downtime, nhưng <strong>không có SLA thời gian hoàn thành</strong>; thường bắt đầu trong vòng 72 giờ. Có thể do khách hàng khởi tạo (portal/CLI/PowerShell) hoặc qua support request.</li>
  <li><strong>Manual migration</strong>: tạo account mới và copy dữ liệu (AzCopy, SDK…). Chủ động thời gian nhưng có thể downtime.</li>
</ol>

<h4>Bảng chuyển đổi</h4>
<table>
  <thead><tr><th>Từ ↓ / Sang →</th><th>LRS</th><th>GRS/RA-GRS</th><th>ZRS</th><th>GZRS/RA-GZRS</th></tr></thead>
  <tbody>
    <tr><td><strong>LRS</strong></td><td>–</td><td>Đổi trực tiếp</td><td>Conversion</td><td>Đổi sang GRS trước, rồi conversion</td></tr>
    <tr><td><strong>GRS/RA-GRS</strong></td><td>Đổi trực tiếp</td><td>–</td><td>Đổi sang LRS, rồi conversion</td><td>Conversion</td></tr>
    <tr><td><strong>ZRS</strong></td><td>Conversion</td><td>Đổi sang GZRS, rồi conversion</td><td>–</td><td>Đổi trực tiếp</td></tr>
    <tr><td><strong>GZRS/RA-GZRS</strong></td><td>Đổi sang ZRS, rồi conversion</td><td>Conversion</td><td>Đổi trực tiếp</td><td>–</td></tr>
  </tbody>
</table>
<p>Quy tắc dễ nhớ: thay đổi <strong>geo / RA</strong> là đổi SKU trực tiếp; thay đổi <strong>zone</strong> là conversion. Nếu cần đổi cả hai, làm <strong>hai bước riêng</strong> (thứ tự nào cũng được), và sau một conversion phải chờ ít nhất <strong>24 giờ</strong> mới đổi redundancy tiếp.</p>

<pre><code># Đổi geo/RA trực tiếp
az storage account update -n contosodata01 -g rg-storage --sku Standard_RAGRS
Set-AzStorageAccount -ResourceGroupName rg-storage -Name contosodata01 -SkuName Standard_GRS

# Conversion thêm zone-redundancy (LRS → ZRS)
az storage account migration start --account-name contosodata01 -g rg-storage --sku Standard_ZRS --no-wait
Start-AzStorageAccountMigration -ResourceGroupName rg-storage -AccountName contosodata01 -TargetSku Standard_ZRS</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: đổi redundancy và theo dõi conversion</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở storage account, vào trang Redundancy:<br><span class="path">Storage account › Data management › Redundancy</span></li>
    <li>Chọn kiểu mới trong ô <strong>Redundancy</strong> rồi <strong>Save</strong>:
      <div class="blade">
        <div class="blade-title">contosodata01 | Redundancy</div>
        <div class="pf"><label>Redundancy</label><span class="pv sel">Zone-redundant storage (ZRS)</span></div>
        <div class="pf"><label></label><span class="pv note">Từ LRS sang ZRS là conversion: portal gửi yêu cầu, trạng thái hiện ngay trên trang này.</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Theo dõi trạng thái trên chính trang <strong>Redundancy</strong>: <em>Submitted for conversion</em> → <em>In Progress</em> → <em>Completed</em> (hoặc <em>Failed</em>). Conversion thường bắt đầu trong 72 giờ, không có SLA hoàn thành.</li>
    <li>Đổi geo/RA (ví dụ GRS → RA-GRS) cũng làm ở trang này nhưng có hiệu lực gần như ngay lập tức.</li>
  </ol></div>
</div>

<h4>Giới hạn khi chuyển đổi</h4>
<ul>
  <li>Account có blob ở <strong>Archive</strong>: không chuyển sang ZRS/GZRS/RA-GZRS được (Archive không hỗ trợ zone-redundancy). Chuyển LRS → GRS chỉ được nếu không có blob nào được archive khi account còn ở LRS; nếu không phải rehydrate trước.</li>
  <li><strong>Premium block blob</strong> không hỗ trợ conversion: muốn đổi phải manual migration. <strong>Premium page blob</strong> chỉ có LRS.</li>
  <li>Account <strong>GPv1</strong> phải nâng lên GPv2 trước khi conversion.</li>
  <li>Account LRS sinh ra sau một <strong>failover</strong> không được conversion sang ZRS/GZRS: phải manual migration.</li>
  <li>Account bật NFSv3 cho Blob hoặc có NFS file share dùng public endpoint không conversion được.</li>
  <li>Muốn <strong>đổi region</strong> của account → luôn là manual migration.</li>
</ul>

<h4>Chi phí khi đổi</h4>
<ul>
  <li>Thêm geo-redundancy: tính phí <strong>egress một lần</strong> để sao chép toàn bộ dữ liệu sang region phụ.</li>
  <li>Bỏ RA (RA-GRS → GRS/LRS): vẫn bị tính giá RA-GRS thêm <strong>30 ngày</strong>.</li>
  <li>Bỏ geo-redundancy: không tốn phí đổi, dữ liệu ở vùng phụ bị xóa.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Chuyển account từ LRS sang GZRS" → cần hai bước (LRS→GRS đổi trực tiếp + conversion sang GZRS, hoặc LRS→ZRS conversion + ZRS→GZRS đổi trực tiếp). "Chuyển đổi phải xong trước một ngày cụ thể" → chọn <strong>manual migration</strong> vì conversion không có SLA.</div>
`
    },
    {
      id: 'azcopy',
      extra: true,
      title: 'AzCopy',
      html: `
<p><strong>AzCopy v10</strong> là công cụ dòng lệnh để copy dữ liệu vào, ra hoặc giữa các storage account (Blob và Files), kể cả từ Amazon S3 và Google Cloud Storage. Là file thực thi độc lập, không cần cài đặt; có sẵn trong Cloud Shell.</p>

<h4>Xác thực: chỉ hai cách</h4>
<div class="compare">
  <div><strong>Microsoft Entra ID</strong>Chạy <code>azcopy login</code> (user), <code>azcopy login --identity</code> (managed identity) hoặc service principal. Danh tính cần role <strong>data plane</strong>: <em>Storage Blob Data Reader</em> để download, <em>Storage Blob Data Contributor</em> để upload. Role Owner/Contributor (management plane) <strong>không đủ</strong>.</div>
  <div><strong>SAS token</strong>Gắn <code>?sv=...&amp;sig=...</code> vào cuối URL nguồn/đích trong mỗi lệnh. Phù hợp khi người chạy không có tài khoản Entra trong tenant.</div>
</div>
<p>AzCopy không nhận trực tiếp account key trên dòng lệnh; nếu chỉ có key, hãy tạo SAS từ key đó.</p>

<h4>Các lệnh chính</h4>
<table>
  <thead><tr><th>Lệnh</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>azcopy copy</code></td><td>Copy file/thư mục/blob (local ↔ cloud, cloud ↔ cloud)</td></tr>
    <tr><td><code>azcopy sync</code></td><td>Đồng bộ một chiều nguồn → đích, chỉ copy phần thay đổi (so sánh thời gian sửa đổi); <code>--delete-destination=true</code> để xóa file thừa ở đích</td></tr>
    <tr><td><code>azcopy make</code></td><td>Tạo container hoặc file share</td></tr>
    <tr><td><code>azcopy list</code> / <code>remove</code></td><td>Liệt kê / xóa blob hoặc file</td></tr>
    <tr><td><code>azcopy set-properties</code></td><td>Đổi access tier, metadata, index tag của blob</td></tr>
    <tr><td><code>azcopy jobs list</code> / <code>jobs resume</code></td><td>Xem và tiếp tục job bị gián đoạn</td></tr>
    <tr><td><code>azcopy bench</code></td><td>Đo hiệu năng upload/download</td></tr>
  </tbody>
</table>

<pre><code># Đăng nhập Entra ID
azcopy login --tenant-id &lt;tenant-id&gt;

# Upload cả thư mục lên container
azcopy copy "C:\\data\\reports" "https://contosodata01.blob.core.windows.net/reports" --recursive

# Download một blob dùng SAS
azcopy copy "https://contosodata01.blob.core.windows.net/reports/q1.pdf?&lt;SAS&gt;" "C:\\temp\\q1.pdf"

# Đồng bộ thư mục local lên container (chỉ phần thay đổi)
azcopy sync "C:\\data\\web" 'https://contosodata01.blob.core.windows.net/$web' --recursive --delete-destination=true

# Copy server-to-server giữa hai account
azcopy copy "https://src.blob.core.windows.net/c1?&lt;SAS&gt;" "https://dst.blob.core.windows.net/c1?&lt;SAS&gt;" --recursive

# Upload thẳng vào tier Cool
azcopy copy "C:\\backup\\*" "https://contosodata01.blob.core.windows.net/backup" --block-blob-tier Cool</code></pre>

<h4>Server-to-server copy</h4>
<ul>
  <li>Khi copy giữa hai storage account, AzCopy dùng các API <strong>Put Block From URL</strong> / <strong>Copy Blob From URL</strong>: dữ liệu đi trực tiếp giữa các server Azure Storage, <strong>không đi qua máy chạy AzCopy</strong>. Băng thông máy local không phải nút thắt.</li>
  <li>Đây cũng là cách để chuyển dữ liệu khỏi account Premium block blob sang account Standard có access tier.</li>
</ul>

<h4>Khi nào không dùng AzCopy</h4>
<ul>
  <li>Muốn giao diện đồ họa → <strong>Azure Storage Explorer</strong> (bên dưới cũng dùng AzCopy).</li>
  <li>Hàng chục/hàng trăm TB qua mạng chậm → <strong>Azure Data Box</strong> (thiết bị vật lý).</li>
  <li>Di chuyển quy mô lớn có quản lý tập trung → <strong>Azure Storage Mover</strong>.</li>
  <li>Đồng bộ liên tục file server Windows với Azure Files → <strong>Azure File Sync</strong>.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Người dùng có role <strong>Owner</strong> trên storage account chạy <code>azcopy login</code> rồi upload nhưng bị 403: thiếu role <strong>Storage Blob Data Contributor</strong>. Câu hỏi "lệnh copy chỉ những file đã thay đổi" → <code>azcopy sync</code>.</div>
`
    }
  ],
  keyFacts: [
    'Tên storage account: <strong>3–24 ký tự, chỉ chữ thường và số</strong>, duy nhất toàn cầu.',
    '<strong>Standard GPv2</strong> hỗ trợ Blob, Files, Queue, Table và mọi kiểu redundancy (LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS).',
    'Premium block blobs (<code>BlockBlobStorage</code>) và Premium file shares (<code>FileStorage</code>) chỉ có <strong>LRS/ZRS</strong>; Premium page blobs chỉ có <strong>LRS</strong>.',
    'LRS và ZRS giữ <strong>3 bản sao</strong>; GRS/GZRS giữ <strong>6 bản sao</strong> (3 ở region chính + 3 LRS ở region phụ).',
    'Độ bền: LRS ≥ 11 số 9, ZRS ≥ 12 số 9, GRS/GZRS ≥ 16 số 9.',
    'Chỉ <strong>RA-GRS</strong> và <strong>RA-GZRS</strong> cho đọc vùng phụ khi không failover, qua endpoint <code>&lt;account&gt;-secondary</code>.',
    'Sau unplanned failover, account trở thành <strong>LRS</strong> ở region chính mới.',
    'Đổi geo/RA = đổi SKU trực tiếp; đổi zone = <strong>conversion</strong> (không SLA, thường bắt đầu trong 72 giờ); đổi region = manual migration.',
    '<strong>Archive tier</strong> không được hỗ trợ trên account ZRS, GZRS, RA-GZRS.',
    'Private endpoint cấp <strong>private IP</strong> cho từng sub-resource (blob, file, queue, table, dfs, web); service endpoint vẫn dùng public endpoint.',
    'IP network rule chỉ nhận <strong>public IP</strong>; không dùng prefix /31, /32.',
    'AzCopy chỉ xác thực bằng <strong>Microsoft Entra ID</strong> hoặc <strong>SAS</strong>; với Entra ID cần role data plane như <em>Storage Blob Data Contributor</em>.'
  ],
  traps: [
    'Chọn Premium khi đề yêu cầu GRS/RA-GRS. Premium <strong>không có geo-redundancy</strong>.',
    'Nghĩ GRS cho phép đọc vùng phụ bất cứ lúc nào. Chỉ <strong>RA-</strong>GRS/<strong>RA-</strong>GZRS mới có, GRS chỉ đọc được sau failover.',
    'Tưởng chuyển LRS → ZRS chỉ cần đổi SKU như LRS → GRS. Thêm zone-redundancy cần <strong>conversion</strong> và có thể mất nhiều thời gian, không có SLA.',
    'Dùng service endpoint cho máy on-premises qua VPN. Service endpoint chỉ cho subnet Azure; on-premises cần <strong>private endpoint</strong> hoặc IP rule cho public IP.',
    'Thêm dải IP private (10.0.0.0/16) vào firewall của storage account. IP rule chỉ áp dụng cho public IP; subnet Azure phải dùng VNet rule.',
    'Có role Owner/Contributor là đọc ghi được blob qua Entra ID. Sai: cần role <strong>data plane</strong> (Storage Blob Data …).',
    'Tạo private endpoint cho <code>blob</code> rồi tưởng Azure Files cũng đi qua private IP. Mỗi sub-resource cần <strong>private endpoint riêng</strong>.',
    'Cho rằng custom domain trên Blob endpoint hỗ trợ HTTPS. Cần <strong>Azure Front Door/CDN</strong> để có HTTPS với tên miền riêng.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Tên account</td><td>3–24 ký tự, chữ thường + số, duy nhất toàn cầu</td></tr>
    <tr><td>Standard GPv2</td><td>Blob, Files, Queue, Table; mọi redundancy</td></tr>
    <tr><td>Premium block blob / file shares</td><td>LRS, ZRS</td></tr>
    <tr><td>Premium page blob</td><td>LRS</td></tr>
    <tr><td>LRS / ZRS</td><td>3 bản sao; 1 DC / 3 zone</td></tr>
    <tr><td>GRS / GZRS</td><td>6 bản sao; region phụ là LRS, sao chép bất đồng bộ</td></tr>
    <tr><td>Đọc vùng phụ</td><td>Chỉ RA-GRS, RA-GZRS (<code>-secondary</code>)</td></tr>
    <tr><td>Đổi redundancy</td><td>Geo/RA: đổi SKU; Zone: conversion; Region: manual</td></tr>
    <tr><td>Endpoint</td><td><code>blob</code>, <code>dfs</code>, <code>file</code>, <code>queue</code>, <code>table</code>, <code>web</code> + <code>.core.windows.net</code></td></tr>
    <tr><td>Service endpoint</td><td>Miễn phí, subnet Azure, public IP của storage</td></tr>
    <tr><td>Private endpoint</td><td>Private IP, dùng được từ on-prem, zone <code>privatelink.*</code></td></tr>
    <tr><td>AzCopy</td><td><code>login</code> (Entra) hoặc SAS; <code>copy</code>, <code>sync</code>, server-to-server</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Quy tắc đặt tên storage account?', back: '<strong>3–24 ký tự</strong>, chỉ <strong>chữ thường và số</strong>, duy nhất toàn cầu.' },
    { front: 'Loại account nào hỗ trợ cả Blob, Files, Queue, Table?', back: '<strong>Standard general-purpose v2</strong> (<code>StorageV2</code>).' },
    { front: 'Premium file shares dùng kind nào và redundancy nào?', back: '<code>FileStorage</code>; chỉ <strong>LRS</strong> hoặc <strong>ZRS</strong>.' },
    { front: 'Số bản sao của LRS, ZRS, GRS, GZRS?', back: 'LRS 3, ZRS 3, GRS 6, GZRS 6.' },
    { front: 'Kiểu redundancy nào cho đọc vùng phụ mà không cần failover?', back: '<strong>RA-GRS</strong> và <strong>RA-GZRS</strong>.' },
    { front: 'Endpoint đọc vùng phụ có dạng gì?', back: '<code>https://&lt;account&gt;-secondary.blob.core.windows.net</code>' },
    { front: 'Sau unplanned failover, redundancy của account là gì?', back: '<strong>LRS</strong> ở region chính mới; phải cấu hình lại geo-redundancy.' },
    { front: 'Chuyển LRS → ZRS bằng cách nào?', back: '<strong>Conversion</strong> (customer-initiated qua portal/CLI/PowerShell hoặc support request), không downtime, không SLA thời gian.' },
    { front: 'Chuyển LRS → RA-GRS bằng cách nào?', back: 'Đổi SKU trực tiếp: <code>az storage account update --sku Standard_RAGRS</code>.' },
    { front: 'Redundancy nào không hỗ trợ Archive tier?', back: '<strong>ZRS, GZRS, RA-GZRS</strong>. Archive chỉ có trên LRS, GRS, RA-GRS.' },
    { front: 'Service endpoint khác private endpoint thế nào?', back: 'Service endpoint: miễn phí, traffic tới public IP, chỉ subnet Azure. Private endpoint: NIC private IP trong VNet, dùng được từ on-prem, có phí.' },
    { front: 'Tên Private DNS zone cho private endpoint Blob?', back: '<code>privatelink.blob.core.windows.net</code>' },
    { front: 'Azure Backup không truy cập được storage sau khi bật firewall. Làm gì?', back: 'Bật exception <strong>Allow Azure services on the trusted services list</strong>.' },
    { front: 'Hai cách xác thực AzCopy?', back: '<strong>Microsoft Entra ID</strong> (<code>azcopy login</code>) và <strong>SAS token</strong>.' },
    { front: 'Lệnh AzCopy chỉ copy phần thay đổi?', back: '<code>azcopy sync</code> (thêm <code>--delete-destination=true</code> để xóa file thừa ở đích).' },
    { front: 'Copy server-to-server của AzCopy có đi qua máy local không?', back: 'Không. Dùng API Put Block From URL, dữ liệu đi trực tiếp giữa các server Azure Storage.' }
  ],
  quiz: [
    {
      q: 'Công ty Contoso cần một storage account để lưu blob, queue và file share SMB cho cùng một ứng dụng. Dữ liệu phải được bảo vệ khỏi sự cố toàn region. Bạn nên tạo loại account và redundancy nào?',
      options: ['Premium file shares với ZRS', 'Standard general-purpose v2 với GRS', 'Premium block blobs với LRS', 'Standard general-purpose v2 với ZRS'],
      answer: [1],
      explain: 'Chỉ Standard GPv2 hỗ trợ đồng thời Blob, Queue và Files, và GRS sao chép sang region phụ nên chịu được sự cố region. ZRS chỉ bảo vệ trong một region. Premium file shares chỉ có Azure Files, Premium block blobs chỉ có blob, và cả hai đều không có geo-redundancy.'
    },
    {
      q: 'Bạn cần redundancy có chi phí thấp nhất mà vẫn cho phép ứng dụng đọc dữ liệu khi region chính không khả dụng, không cần chờ failover. Bạn chọn gì?',
      options: ['GRS', 'ZRS', 'RA-GZRS', 'RA-GRS'],
      answer: [3],
      explain: 'RA-GRS cho phép đọc từ endpoint -secondary bất cứ lúc nào và rẻ hơn RA-GZRS. GRS chỉ đọc được vùng phụ sau failover. ZRS không có bản sao ở region khác.'
    },
    {
      q: 'Storage account1 đang dùng LRS. Bạn cần chuyển sang ZRS mà không gây downtime cho ứng dụng. Bạn nên làm gì?',
      options: ['Khởi tạo conversion sang ZRS từ trang Redundancy hoặc bằng <code>az storage account migration start</code>', 'Chạy <code>az storage account update --sku Standard_ZRS</code> và chờ vài giây', 'Xóa account rồi tạo lại với ZRS', 'Bật failover sang region phụ'],
      answer: [0],
      explain: 'Thêm zone-redundancy là một conversion: không mất dữ liệu, không downtime, có thể khởi tạo từ portal, CLI (<code>migration start</code>) hoặc PowerShell (<code>Start-AzStorageAccountMigration</code>). Đổi SKU trực tiếp chỉ áp dụng cho thay đổi geo/RA. Xóa và tạo lại gây downtime và mất dữ liệu. Failover không liên quan, và account LRS không có region phụ.'
    },
    {
      q: 'Bạn cần tạo file share hỗ trợ giao thức NFS 4.1 cho các VM Linux. Bạn phải tạo loại storage account nào?',
      options: ['Standard general-purpose v2', 'Premium block blobs', 'Premium file shares (FileStorage)', 'General-purpose v1'],
      answer: [2],
      explain: 'NFS file share trong Azure Files yêu cầu account FileStorage trên SSD (Premium file shares). Standard GPv2 không hỗ trợ NFS cho Azure Files. Premium block blobs không có Azure Files. GPv1 là loại cũ.'
    },
    {
      q: 'Các máy chủ on-premises kết nối tới Azure qua site-to-site VPN. Bạn cần chúng truy cập Blob Storage qua private IP, và chặn mọi truy cập từ Internet. Bạn cần làm gì? (Chọn 2)',
      options: ['Bật service endpoint Microsoft.Storage trên GatewaySubnet', 'Tạo private endpoint cho sub-resource blob và cấu hình DNS privatelink', 'Thêm dải 10.0.0.0/8 vào IP network rules', 'Đặt Public network access = Disabled'],
      answer: [1, 3],
      explain: 'Private endpoint cấp private IP trong VNet, truy cập được từ on-premises qua VPN; tắt Public network access chặn Internet. Service endpoint không phục vụ client on-premises. IP network rules không nhận dải private.'
    },
    {
      q: 'Sau khi đặt firewall của storage account về "selected networks", job Azure Backup không còn ghi được vào account. Bạn cần khắc phục với ít công sức nhất.',
      options: ['Thêm public IP của Azure Backup vào IP rules', 'Tạo private endpoint cho mỗi vault', 'Chuyển account sang RA-GRS', 'Bật exception "Allow Azure services on the trusted services list"'],
      answer: [3],
      explain: 'Azure Backup thuộc danh sách trusted Microsoft services, bật exception này là đủ. Danh sách IP của dịch vụ thay đổi và khó duy trì. Private endpoint tốn công hơn nhiều. Redundancy không liên quan tới firewall.'
    },
    {
      q: 'Account1 dùng LRS và có nhiều blob ở Archive tier. Bạn muốn chuyển account sang GZRS. Điều gì đúng?',
      options: ['Có thể chuyển ngay, blob Archive được giữ nguyên', 'Không thể giữ blob ở Archive trong account GZRS; phải rehydrate hoặc chuyển các blob đó sang account khác trước', 'Chỉ cần mở support request', 'GZRS chỉ dành cho Premium account'],
      answer: [1],
      explain: 'Archive tier chỉ được hỗ trợ trên LRS, GRS, RA-GRS. Muốn có zone-redundancy phải rehydrate hoặc chuyển blob Archive ra account khác trước. Support request không vượt qua được giới hạn này. GZRS là tùy chọn của Standard GPv2.'
    },
    {
      q: 'Người dùng User1 có role Owner trên storage account. User1 chạy <code>azcopy login</code> rồi <code>azcopy copy</code> để upload file lên container nhưng nhận lỗi 403. Bạn cần cấp quyền tối thiểu để User1 upload được.',
      options: ['Storage Account Contributor', 'Storage Blob Data Reader', 'Storage Blob Data Contributor', 'Reader and Data Access'],
      answer: [2],
      explain: 'Khi xác thực bằng Microsoft Entra ID, AzCopy cần role data plane. Storage Blob Data Contributor cho phép đọc, ghi, xóa blob. Storage Blob Data Reader chỉ đọc. Storage Account Contributor và Owner là management plane. Reader and Data Access cho đọc access key, không phải quyền dữ liệu qua Entra ID.'
    },
    {
      q: 'Bạn cần mỗi đêm đẩy lên container các file mới hoặc đã sửa trong thư mục <code>D:\\Exports</code>, và xóa trên container những file đã bị xóa ở local. Lệnh nào phù hợp?',
      options: ['<code>azcopy sync "D:\\Exports" "https://acct.blob.core.windows.net/exports?&lt;SAS&gt;" --recursive --delete-destination=true</code>', '<code>azcopy copy "D:\\Exports" "https://acct.blob.core.windows.net/exports?&lt;SAS&gt;" --recursive</code>', '<code>azcopy make "https://acct.blob.core.windows.net/exports"</code>', '<code>azcopy remove "https://acct.blob.core.windows.net/exports" --recursive</code>'],
      answer: [0],
      explain: '<code>azcopy sync</code> chỉ chuyển phần thay đổi, và <code>--delete-destination=true</code> xóa file thừa ở đích. <code>copy</code> sao chép toàn bộ, không xóa ở đích. <code>make</code> tạo container. <code>remove</code> chỉ xóa.'
    },
    {
      q: 'Một ứng dụng truy cập URL <code>https://contosodata-secondary.blob.core.windows.net/images/a.png</code> thành công. Bạn kết luận được gì về account contosodata?',
      options: ['Account dùng ZRS', 'Account dùng GRS', 'Account dùng RA-GRS hoặc RA-GZRS', 'Account là Premium block blobs'],
      answer: [2],
      explain: 'Endpoint -secondary chỉ đọc được khi bật read access vùng phụ, tức RA-GRS hoặc RA-GZRS. GRS không cho đọc vùng phụ khi chưa failover. ZRS và Premium không có region phụ.'
    },
    {
      q: 'Bạn cần chỉ cho phép VM trong subnet App của VNet1 (cùng region) truy cập storage account, chi phí thấp nhất. Bạn nên làm gì? (Chọn 2)',
      options: ['Bật service endpoint Microsoft.Storage trên subnet App', 'Tạo private endpoint trong subnet App', 'Thêm subnet App vào virtual network rules và đặt default action là Deny', 'Thêm dải địa chỉ của subnet App vào IP network rules'],
      answer: [0, 2],
      explain: 'Service endpoint miễn phí; kết hợp VNet rule và default action Deny để chỉ subnet App được phép. Private endpoint cũng làm được nhưng tốn phí theo giờ và GB. IP network rules không chấp nhận dải private của subnet.'
    },
    {
      q: 'Bạn đang tạo storage account bằng portal. Tên nào hợp lệ?',
      options: ['<code>Contoso-Logs01</code>', '<code>contoso_logs</code>', '<code>cl</code>', '<code>contosologs2026</code>'],
      answer: [3],
      explain: 'Tên hợp lệ dài 3–24 ký tự, chỉ chữ thường và số. Tên có chữ hoa, gạch ngang hoặc gạch dưới đều sai; <code>cl</code> chỉ có 2 ký tự.'
    },
    {
      q: 'Công ty cần thay đổi redundancy của một account từ LRS sang ZRS và việc này phải hoàn tất trước cuối tuần để đáp ứng kiểm toán. Phương án nào đảm bảo kiểm soát được thời gian?',
      options: ['Mở support request yêu cầu conversion', 'Tạo account ZRS mới và copy dữ liệu bằng AzCopy (manual migration)', 'Khởi tạo customer-initiated conversion', 'Đổi SKU sang Standard_ZRS bằng Set-AzStorageAccount'],
      answer: [1],
      explain: 'Conversion (dù qua support hay khách hàng tự khởi tạo) không có SLA thời gian hoàn thành. Manual migration cho bạn chủ động thời gian, đổi lại có thể downtime. Đổi SKU trực tiếp không áp dụng cho thay đổi zone-redundancy.'
    },
    {
      q: 'Account Storage1 (RA-GRS) bị failover do sự cố ở region chính. Sau failover, trạng thái redundancy của Storage1 là gì?',
      options: ['LRS ở region mới', 'Vẫn RA-GRS', 'GRS', 'ZRS ở region mới'],
      answer: [0],
      explain: 'Sau customer-managed unplanned failover, account trở thành LRS ở region chính mới. Bạn phải cấu hình lại geo-redundancy nếu cần. Account không tự trở thành ZRS và cũng không giữ GRS/RA-GRS.'
    }
  ]
});

AZ.addModule({
  id: 'p4m2',
  summary: 'Azure Blob Storage là object storage cho dữ liệu phi cấu trúc: ảnh, video, backup, log, data lake. Module này đi từ container và mức truy cập công khai, loại blob, access tier Hot/Cool/Cold/Archive, lifecycle management, object replication cho đến các lớp bảo vệ dữ liệu (soft delete, versioning, snapshot, point-in-time restore, immutable storage) và các yếu tố tính giá. Đề AZ-104 hỏi rất nhiều về tier, lifecycle JSON và rehydrate từ Archive.',
  objectives: [
    'Tạo container, chọn mức anonymous access và hiểu thiết lập AllowBlobPublicAccess ở cấp account',
    'Phân biệt block blob, append blob, page blob và giới hạn kích thước của từng loại',
    'Chọn access tier Hot, Cool, Cold, Archive theo tần suất truy cập; tính phí early deletion',
    'Viết lifecycle management rule bằng JSON với filter, action và điều kiện số ngày',
    'Cấu hình object replication và các tính năng bảo vệ dữ liệu: soft delete, versioning, snapshot, point-in-time restore, immutable storage',
    'Rehydrate blob từ Archive và ước tính chi phí Blob Storage'
  ],
  sections: [
    {
      id: 'implement-blob',
      unit: 'Implement Azure Blob Storage',
      title: 'Blob Storage: kiến trúc và loại blob',
      html: `
<p><strong>Azure Blob Storage</strong> lưu dữ liệu dạng object (đối tượng) không có cấu trúc, truy cập qua HTTP/HTTPS. Cấu trúc tài nguyên có ba cấp:</p>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 225" role="img" aria-label="Phân cấp Blob Storage: storage account chứa container, container chứa blob, và cách các phần ghép thành URL">
  <rect class="box-w" x="10" y="30" width="170" height="90" rx="10"/>
  <text x="95" y="64" text-anchor="middle" class="t-b t-w">Storage account</text>
  <text x="95" y="84" text-anchor="middle" class="t-sm">contosomedia</text>
  <text x="95" y="102" text-anchor="middle" class="t-sm t-mute">nhiều container</text>

  <rect class="box-a" x="240" y="30" width="180" height="90" rx="10"/>
  <text x="330" y="60" text-anchor="middle" class="t-b t-a">Container</text>
  <text x="330" y="80" text-anchor="middle" class="t-sm">images</text>
  <text x="330" y="100" text-anchor="middle" class="t-sm t-mute">đặt anonymous access</text>

  <rect class="box-s" x="480" y="10" width="230" height="36" rx="8"/>
  <text x="595" y="33" text-anchor="middle">logo.png</text>
  <rect class="box-s" x="480" y="56" width="230" height="36" rx="8"/>
  <text x="595" y="79" text-anchor="middle">2026/05/banner.jpg</text>
  <rect class="box-s" x="480" y="102" width="230" height="36" rx="8"/>
  <text x="595" y="125" text-anchor="middle">videos/intro.mp4</text>
  <text x="595" y="158" text-anchor="middle" class="t-sm t-mute">Blob: dấu "/" trong tên = thư mục ảo</text>

  <line class="ln" x1="180" y1="75" x2="236" y2="75" marker-end="url(#arr)"/>
  <line class="ln" x1="420" y1="75" x2="476" y2="30" marker-end="url(#arr)"/>
  <line class="ln" x1="420" y1="75" x2="476" y2="74" marker-end="url(#arr)"/>
  <line class="ln" x1="420" y1="75" x2="476" y2="118" marker-end="url(#arr)"/>

  <rect class="box" x="10" y="174" width="700" height="40" rx="8"/>
  <text x="360" y="199" text-anchor="middle">https://<tspan class="t-b t-w">contosomedia</tspan>.blob.core.windows.net/<tspan class="t-b t-a">images</tspan>/<tspan class="t-b t-s">2026/05/banner.jpg</tspan></text>
</svg>
<figcaption>Hình 1. Ba cấp tài nguyên của Blob Storage. URL của một blob ghép từ tên account (vàng), tên container (xanh dương) và tên blob (xanh lá). Không có thư mục thật: <code>2026/05/</code> chỉ là một phần của tên blob (trừ khi bật hierarchical namespace).</figcaption>
</figure>

<h4>Tình huống sử dụng</h4>
<ul>
  <li>Phục vụ ảnh, tài liệu trực tiếp cho trình duyệt; host <strong>static website</strong> (container <code>$web</code>).</li>
  <li>Streaming video và audio.</li>
  <li>Lưu file log, dữ liệu backup, khôi phục thảm họa, lưu trữ dài hạn (archive).</li>
  <li>Data lake cho phân tích (bật hierarchical namespace → Data Lake Storage Gen2).</li>
</ul>

<h4>Ba loại blob</h4>
<table>
  <thead><tr><th>Loại</th><th>Cấu tạo</th><th>Kích thước tối đa</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><strong>Block blob</strong></td><td>Tập hợp các block, upload song song rồi commit</td><td>Khoảng <strong>190,7 TiB</strong> (50.000 block × 4.000 MiB)</td><td>File thông thường: tài liệu, ảnh, video, backup</td></tr>
    <tr><td><strong>Append blob</strong></td><td>Block chỉ được ghi nối vào cuối, không sửa block cũ</td><td>Khoảng <strong>195 GiB</strong> (50.000 block × 4 MiB)</td><td>Log, dữ liệu ghi tuần tự</td></tr>
    <tr><td><strong>Page blob</strong></td><td>Các trang 512 byte, đọc/ghi ngẫu nhiên</td><td><strong>8 TiB</strong></td><td>File VHD (đĩa VM), nền tảng của managed disks</td></tr>
  </tbody>
</table>
<p>Loại blob được xác định <strong>lúc tạo</strong> và không đổi được về sau. Access tier (Hot/Cool/Cold/Archive) <strong>chỉ áp dụng cho block blob</strong>.</p>

<h4>Upload blob</h4>
<pre><code>az storage blob upload --account-name contosomedia -c images -n logo.png -f ./logo.png --auth-mode login
az storage blob upload-batch --account-name contosomedia -d images -s ./site-images --auth-mode login

$ctx = New-AzStorageContext -StorageAccountName contosomedia -UseConnectedAccount
Set-AzStorageBlobContent -File .\\logo.png -Container images -Blob logo.png -Context $ctx</code></pre>

<div class="callout exam"><strong>Góc thi</strong>Ứng dụng ghi log liên tục, chỉ thêm vào cuối file → <strong>append blob</strong>. Lưu VHD cho VM (unmanaged) → <strong>page blob</strong>. Muốn chuyển blob sang Archive → phải là <strong>block blob</strong>.</div>
`
    },
    {
      id: 'containers',
      unit: 'Create blob containers',
      title: 'Container và mức truy cập công khai',
      html: `
<h4>Quy tắc đặt tên container</h4>
<ul>
  <li>Dài <strong>3–63 ký tự</strong>; chỉ gồm chữ thường, số và dấu gạch ngang.</li>
  <li>Bắt đầu bằng chữ hoặc số; không có hai dấu gạch ngang liên tiếp.</li>
  <li>Container đặc biệt: <code>$root</code> (container mặc định của account), <code>$web</code> (static website), <code>$logs</code> (log của Storage Analytics).</li>
</ul>

<h4>Anonymous (public) access level của container</h4>
<table>
  <thead><tr><th>Mức</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><strong>Private (no anonymous access)</strong></td><td>Mặc định. Mọi request phải được xác thực (Entra ID, Shared Key hoặc SAS).</td></tr>
    <tr><td><strong>Blob (anonymous read access for blobs only)</strong></td><td>Ai có URL đều đọc được blob, nhưng <strong>không liệt kê</strong> được danh sách blob trong container.</td></tr>
    <tr><td><strong>Container (anonymous read access for containers and blobs)</strong></td><td>Đọc blob <strong>và liệt kê</strong> toàn bộ blob trong container. Không cho liệt kê các container khác trong account.</td></tr>
  </tbody>
</table>

<h4>Thiết lập cấp account: AllowBlobPublicAccess</h4>
<ul>
  <li>Trong portal là <em>Allow Blob anonymous access</em> (Configuration). Khi đặt <code>false</code>, mọi container bị ép về Private bất kể thiết lập riêng của container.</li>
  <li>Storage account tạo mới hiện nay mặc định <strong>không cho phép</strong> anonymous access. Muốn đặt container ở mức Blob/Container thì phải bật thiết lập này trước.</li>
  <li>Thiết lập cấp account <strong>ghi đè</strong> cấp container: account = false thì không container nào public được.</li>
</ul>
<pre><code># Bật anonymous access ở cấp account
az storage account update -n contosomedia -g rg-media --allow-blob-public-access true

# Tạo container với mức blob
az storage container create --account-name contosomedia -n public-img --public-access blob --auth-mode login

# Đổi mức truy cập container
az storage container set-permission --account-name contosomedia -n public-img --public-access off

# PowerShell
New-AzStorageContainer -Name public-img -Permission Blob -Context $ctx</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo container, upload blob và đổi tier</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở storage account, vào danh sách container và chọn <strong>+ Container</strong>:<br><span class="path">Storage account › Data storage › Containers › + Container</span></li>
    <li>Đặt tên và mức truy cập ẩn danh:
      <div class="blade">
        <div class="blade-title">New container</div>
        <div class="pf"><label class="req">Name</label><span class="pv">images</span></div>
        <div class="pf"><label>Anonymous access level</label><span class="pv sel">Private (no anonymous access)</span></div>
        <div class="pf"><label></label><span class="pv note">Hai mức Blob/Container bị mờ nếu account đang tắt Allow Blob anonymous access.</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Mở container <code>images</code>, chọn <strong>Upload</strong>, chọn file từ máy. Mở rộng phần <strong>Advanced</strong> để chỉnh thêm:
      <div class="blade">
        <div class="blade-title">Upload blob</div>
        <div class="pf"><label class="req">Files</label><span class="pv">banner.jpg</span></div>
        <div class="pf"><label></label><span class="pv chk">Overwrite if files already exist</span></div>
        <div class="blade-sec">Advanced</div>
        <div class="pf"><label>Blob type</label><span class="pv sel">Block blob</span></div>
        <div class="pf"><label>Access tier</label><span class="pv sel">Hot (Inferred)</span></div>
        <div class="pf"><label>Upload to folder</label><span class="pv">2026/05</span></div>
        <div class="pf"><label></label><span class="pv note">Upload to folder chỉ thêm tiền tố "2026/05/" vào tên blob (thư mục ảo).</span></div>
        <div class="pbtns"><span class="pbtn primary">Upload</span></div>
      </div>
    </li>
    <li>Đổi tier: tick chọn blob, chọn <strong>Change tier</strong>, chọn <strong>Access tier</strong> mới (Cool, Cold hoặc Archive) rồi <strong>Save</strong>. Khi đưa blob từ Archive về online, portal hỏi thêm <strong>Rehydrate priority</strong> (Standard/High).</li>
    <li>Xem URL và thuộc tính: chọn blob để mở trang <strong>Overview</strong> (URL, tier, ETag, content type); thử mở URL trong trình duyệt ẩn danh: container Private sẽ trả lỗi <em>ResourceNotFound</em> hoặc <em>PublicAccessNotPermitted</em>.</li>
  </ol></div>
</div>

<h4>Metadata và thuộc tính</h4>
<p>Container và blob có <strong>system properties</strong> (ETag, Last-Modified, Content-Type…) và <strong>user-defined metadata</strong> dạng cặp tên/giá trị. Ngoài ra blob còn có <strong>blob index tags</strong>: các tag được đánh chỉ mục, tìm kiếm được trên toàn account và dùng làm filter cho lifecycle management.</p>

<div class="callout warn"><strong>Lưu ý bảo mật</strong>Anonymous access phù hợp cho nội dung công khai (ảnh website). Với dữ liệu nhạy cảm, hãy để Private và dùng SAS hoặc Microsoft Entra ID. Azure Policy có built-in policy để chặn account cho phép anonymous access.</div>

<div class="callout exam"><strong>Góc thi</strong>"Người dùng ẩn danh cần đọc blob qua URL nhưng không được xem danh sách blob" → mức <strong>Blob</strong>. "Đặt container ở mức Container nhưng vẫn bị lỗi 404/403 khi truy cập ẩn danh" → kiểm tra <strong>AllowBlobPublicAccess</strong> ở cấp account.</div>
`
    },
    {
      id: 'access-tiers',
      unit: 'Assign blob access tiers',
      title: 'Access tier: Hot, Cool, Cold, Archive',
      html: `
<p>Access tier giúp tối ưu chi phí theo tần suất truy cập: tier càng "lạnh" thì <strong>giá lưu trữ càng rẻ</strong> nhưng <strong>giá truy cập và giao dịch càng đắt</strong>.</p>
<table>
  <thead><tr><th></th><th>Hot</th><th>Cool</th><th>Cold</th><th>Archive</th></tr></thead>
  <tbody>
    <tr><td>Trạng thái</td><td>Online</td><td>Online</td><td>Online</td><td><strong>Offline</strong></td></tr>
    <tr><td>Thời gian lưu tối thiểu</td><td>Không</td><td><strong>30 ngày</strong></td><td><strong>90 ngày</strong></td><td><strong>180 ngày</strong></td></tr>
    <tr><td>Độ trễ đọc</td><td>Mili giây</td><td>Mili giây</td><td>Mili giây</td><td><strong>Hàng giờ</strong> (phải rehydrate)</td></tr>
    <tr><td>Availability SLA</td><td>99,9%</td><td>99%</td><td>99%</td><td>99%</td></tr>
    <tr><td>Redundancy hỗ trợ</td><td>Tất cả</td><td>Tất cả</td><td>Tất cả</td><td>Chỉ LRS, GRS, RA-GRS</td></tr>
    <tr><td>Đặt làm default của account</td><td>Có</td><td>Có</td><td>Có</td><td><strong>Không</strong></td></tr>
  </tbody>
</table>

<h4>Default access tier của account</h4>
<ul>
  <li>Account GPv2 có thiết lập <strong>default access tier</strong> (Hot mặc định; có thể đổi thành Cool hoặc Cold). Blob không được đặt tier tường minh sẽ "kế thừa" (portal hiển thị <em>Hot (inferred)</em>).</li>
  <li>Đổi default tier của account sẽ ảnh hưởng mọi blob có tier inferred và phát sinh phí đổi tier cho các blob đó.</li>
  <li>Archive chỉ đặt được ở <strong>cấp blob</strong>.</li>
</ul>

<h4>Early deletion</h4>
<p>Blob bị xóa, ghi đè hoặc chuyển tier trước thời gian tối thiểu sẽ bị tính phí phần còn lại, theo tỉ lệ. Ví dụ: blob chuyển sang Archive rồi xóa sau 45 ngày → trả thêm phí lưu trữ Archive cho 135 ngày (180 − 45). Blob ở Cool bị xóa sau 21 ngày → trả thêm 9 ngày.</p>

<h4>Đổi tier</h4>
<ul>
  <li><strong>Set Blob Tier</strong>: đổi tier tại chỗ. Từ ấm sang lạnh (hoặc giữa các tier online) có hiệu lực ngay; từ Archive sang online cần rehydrate.</li>
  <li><strong>Copy Blob</strong>: copy sang blob mới ở tier khác. Tránh phí early deletion của blob nguồn, nhưng trả phí lưu hai blob.</li>
  <li>Chuyển xuống tier lạnh hơn tính là <em>write</em> ở tier đích; chuyển lên tier ấm hơn tính là <em>read + data retrieval</em> ở tier nguồn.</li>
</ul>
<pre><code>az storage blob set-tier --account-name contosomedia -c backup -n db.bak --tier Archive --auth-mode login
az storage account update -n contosomedia -g rg-media --access-tier Cool
Get-AzStorageBlob -Container backup -Blob db.bak -Context $ctx | ForEach-Object { $_.BlobClient.SetAccessTier("Cool") }</code></pre>

<div class="callout note"><strong>Premium block blob</strong>Account Premium không dùng Hot/Cool/Cold/Archive. Muốn hạ chi phí dữ liệu cũ, phải copy sang account Standard (ví dụ AzCopy server-to-server).</div>

<div class="callout exam"><strong>Góc thi</strong>Dữ liệu truy cập vài lần mỗi năm nhưng khi cần phải đọc ngay → <strong>Cold</strong> (hoặc Cool nếu lưu dưới 90 ngày), <strong>không phải Archive</strong>. Dữ liệu lưu trữ tuân thủ 7 năm, chấp nhận chờ vài giờ → <strong>Archive</strong>. Archive chỉ dùng được với account <strong>LRS/GRS/RA-GRS</strong>.</div>
`
    },
    {
      id: 'lifecycle',
      unit: 'Add blob lifecycle management rules',
      title: 'Lifecycle management rules',
      html: `
<p><strong>Lifecycle management</strong> là chính sách dạng JSON gồm nhiều <em>rule</em>, tự động chuyển tier hoặc xóa blob, version, snapshot theo điều kiện thời gian. Hỗ trợ trên GPv2, Premium block blob và Blob Storage account. Bản thân tính năng <strong>miễn phí</strong>; chỉ trả phí cho các thao tác Set Blob Tier mà nó thực hiện.</p>

<h4>Cấu trúc một rule</h4>
<ul>
  <li><strong>filters</strong>: <code>blobTypes</code> (<code>blockBlob</code>, <code>appendBlob</code>), <code>prefixMatch</code> (bắt đầu bằng <strong>tên container</strong>, tối đa 10 prefix mỗi rule), <code>blobIndexMatch</code> (lọc theo index tag). Nhiều filter được kết hợp bằng AND.</li>
  <li><strong>actions</strong> áp dụng cho <code>baseBlob</code> (phiên bản hiện tại), <code>snapshot</code>, <code>version</code>:
    <ul>
      <li><code>tierToCool</code>, <code>tierToCold</code>, <code>tierToArchive</code>, <code>delete</code></li>
      <li><code>enableAutoTierToHotFromCool</code>: tự đưa blob từ Cool về Hot khi được truy cập (cần last access tracking)</li>
    </ul>
  </li>
  <li><strong>conditions</strong>: <code>daysAfterModificationGreaterThan</code>, <code>daysAfterCreationGreaterThan</code>, <code>daysAfterLastAccessTimeGreaterThan</code>, <code>daysAfterLastTierChangeGreaterThan</code>.</li>
</ul>

<h4>Ví dụ JSON</h4>
<pre><code>{
  "rules": [
    {
      "enabled": true,
      "name": "logs-retention",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": [ "blockBlob" ],
          "prefixMatch": [ "logs/app1" ]
        },
        "actions": {
          "baseBlob": {
            "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 90,
                               "daysAfterLastTierChangeGreaterThan": 7 },
            "delete":        { "daysAfterModificationGreaterThan": 2555 }
          },
          "snapshot": { "delete": { "daysAfterCreationGreaterThan": 90 } },
          "version":  { "delete": { "daysAfterCreationGreaterThan": 90 } }
        }
      }
    }
  ]
}</code></pre>
<p>Ở ví dụ trên, <code>logs/app1</code> nghĩa là container <code>logs</code> và các blob có tên bắt đầu bằng <code>app1</code>.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 215" role="img" aria-label="Vòng đời một blob theo rule mẫu: Hot, sang Cool sau 30 ngày, sang Archive sau 90 ngày, xóa sau 2555 ngày; rehydrate từ Archive phải làm thủ công">
  <line class="ln" x1="20" y1="34" x2="700" y2="34"/>
  <line class="ln" x1="20" y1="28" x2="20" y2="40"/>
  <line class="ln" x1="200" y1="28" x2="200" y2="40"/>
  <line class="ln" x1="380" y1="28" x2="380" y2="40"/>
  <line class="ln" x1="560" y1="28" x2="560" y2="40"/>
  <text x="24" y="22" class="t-sm t-mute">ngày 0</text>
  <text x="204" y="22" class="t-sm t-mute">&gt; 30 ngày</text>
  <text x="384" y="22" class="t-sm t-mute">&gt; 90 ngày</text>
  <text x="564" y="22" class="t-sm t-mute">&gt; 2555 ngày</text>

  <rect class="box-w" x="20" y="50" width="140" height="70" rx="10"/>
  <text x="90" y="74" text-anchor="middle" class="t-b">Hot</text>
  <text x="90" y="94" text-anchor="middle" class="t-sm">upload / sửa</text>
  <text x="90" y="111" text-anchor="middle" class="t-sm t-mute">tier mặc định</text>
  <rect class="box-a" x="200" y="50" width="140" height="70" rx="10"/>
  <text x="270" y="74" text-anchor="middle" class="t-b">Cool</text>
  <text x="270" y="94" text-anchor="middle" class="t-sm t-a">tierToCool</text>
  <text x="270" y="111" text-anchor="middle" class="t-sm t-mute">tối thiểu 30 ngày</text>
  <rect class="box-e" x="380" y="50" width="140" height="70" rx="10"/>
  <text x="450" y="74" text-anchor="middle" class="t-b">Archive</text>
  <text x="450" y="94" text-anchor="middle" class="t-sm t-a">tierToArchive</text>
  <text x="450" y="111" text-anchor="middle" class="t-sm t-mute">offline, ≥ 180 ngày</text>
  <rect class="box" x="560" y="50" width="140" height="70" rx="10"/>
  <text x="630" y="74" text-anchor="middle" class="t-b">Đã xóa</text>
  <text x="630" y="94" text-anchor="middle" class="t-sm t-a">delete</text>
  <text x="630" y="111" text-anchor="middle" class="t-sm t-mute">≈ 7 năm</text>

  <line class="ln" x1="160" y1="85" x2="196" y2="85" marker-end="url(#arr)"/>
  <line class="ln" x1="340" y1="85" x2="376" y2="85" marker-end="url(#arr)"/>
  <line class="ln" x1="520" y1="85" x2="556" y2="85" marker-end="url(#arr)"/>

  <path class="ln-x dash" d="M450 122 C450 172, 90 172, 90 126" marker-end="url(#arr-x)"/>
  <text x="270" y="188" text-anchor="middle" class="t-sm t-x">Rehydrate về online: thủ công (Set Blob Tier / Copy Blob), tới 15 giờ</text>
  <text x="270" y="206" text-anchor="middle" class="t-sm t-mute">lifecycle chỉ đi một chiều sang tier lạnh hơn hoặc xóa</text>
</svg>
<figcaption>Hình 1. Rule <code>logs-retention</code> ở trên, nhìn theo thời gian (trục không theo tỉ lệ). Các mốc tính theo <code>daysAfterModificationGreaterThan</code>; policy chạy mỗi ngày một lần nên blob có thể chuyển tier muộn hơn mốc một chút. Lifecycle không bao giờ đưa blob từ Archive trở lại online.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: thêm lifecycle rule</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở trang Lifecycle management của account, tab <strong>List View</strong>, chọn <strong>Add a rule</strong>:<br><span class="path">Storage account › Data management › Lifecycle management › Add a rule</span></li>
    <li>Tab <strong>Details</strong>:
      <div class="blade">
        <div class="blade-title">Add a rule</div>
        <div class="blade-tabs"><span class="on">Details</span><span>Base blobs</span><span>Filter set</span></div>
        <div class="pf"><label class="req">Rule name</label><span class="pv">logs-retention</span></div>
        <div class="pf"><label class="req">Rule scope</label><span class="pv radio">Limit blobs with filters</span></div>
        <div class="pf"><label class="req">Blob type</label><span class="pv chk">Block blobs</span></div>
        <div class="pf"><label class="req">Blob subtype</label><span class="pv chk">Base blobs</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn Limit blobs with filters thì xuất hiện thêm tab Filter set.</span></div>
        <div class="pbtns"><span class="pbtn primary">Next</span></div>
      </div>
    </li>
    <li>Tab <strong>Base blobs</strong>: khối <em>If</em> chọn <strong>Base blobs were</strong> = Last modified, <strong>More than (days ago)</strong> = 30; khối <em>Then</em> chọn <strong>Move to cool storage</strong>. Thêm các khối điều kiện If/Then tiếp theo (nút thêm điều kiện bên dưới khối Then) cho mốc 90 ngày → <em>Move to archive storage</em> và 2555 ngày → <em>Delete the blob</em>. Lựa chọn <em>Last accessed</em> chỉ dùng được khi đã bật access tracking và Blob type là Block blobs.</li>
    <li>Tab <strong>Filter set</strong>: nhập <strong>Blob prefix</strong> <code>logs/app1</code> (tên container + tiền tố tên blob). Chọn <strong>Add</strong>.</li>
    <li>Mở tab <strong>Code View</strong> để xem JSON portal sinh ra: nó tương đương ví dụ ở trên. Muốn dùng điều kiện last access, tick <strong>Enable access tracking</strong> trên trang Lifecycle management.</li>
  </ol>
  <figure class="fig"><img src="assets/img/p4m2/lifecycle-base-blobs.png" alt="Màn hình Add a rule, tab Base blobs: If Base blobs were Last modified hơn 30 ngày, Then Move to cool storage, kèm danh sách các action" loading="lazy"><figcaption>Hình 2. Tab Base blobs của trình tạo rule: điều kiện <em>If</em> (Last modified / Created / Last accessed + số ngày) và action <em>Then</em> (cool, cold, archive hoặc xóa). Nguồn: <a href="https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>
  </div>
</div>

<h4>Last access time tracking</h4>
<p>Điều kiện <code>daysAfterLastAccessTimeGreaterThan</code> chỉ dùng được khi đã bật theo dõi thời gian truy cập:</p>
<pre><code>az storage account blob-service-properties update -n contosomedia -g rg-media --enable-last-access-tracking true
az storage account management-policy create --account-name contosomedia -g rg-media --policy @policy.json</code></pre>

<h4>Lưu ý vận hành</h4>
<ul>
  <li>Sau khi tạo/sửa policy, có thể mất tới <strong>24 giờ</strong> để có hiệu lực và chạy lần đầu. Policy chạy định kỳ, không tức thời.</li>
  <li>Lifecycle <strong>không rehydrate</strong> được blob từ Archive về online.</li>
  <li>Chuyển tier chỉ áp dụng cho <strong>block blob</strong>; với append blob chỉ có action delete.</li>
  <li>Không tác động tới container hệ thống <code>$logs</code>, <code>$web</code>.</li>
  <li>Nếu blob vừa rehydrate bằng Set Blob Tier, last modified time không đổi nên policy có thể đẩy nó về Archive lại. Thêm <code>daysAfterLastTierChangeGreaterThan</code> để tránh.</li>
  <li>Policy phải đọc/ghi <strong>trọn vẹn</strong> (không cập nhật một phần).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Đề thường cho đoạn JSON và hỏi "blob X sau 40 ngày ở tier nào". Hãy kiểm tra: blob có khớp <code>prefixMatch</code> (gồm cả tên container) và <code>blobTypes</code> không, điều kiện dựa vào <em>modification</em>, <em>creation</em> hay <em>last access</em>. Muốn "chuyển về Hot khi có người đọc lại" → <code>enableAutoTierToHotFromCool</code> + last access tracking.</div>
`
    },
    {
      id: 'object-replication',
      unit: 'Determine blob object replication',
      title: 'Object replication',
      html: `
<p><strong>Object replication</strong> sao chép <strong>bất đồng bộ</strong> các <strong>block blob</strong> từ container nguồn sang container đích ở một storage account khác (cùng hoặc khác region, khác subscription, thậm chí khác tenant nếu cho phép).</p>

<h4>Khi nào dùng</h4>
<ul>
  <li>Giảm độ trễ đọc: đưa dữ liệu tới region gần người dùng.</li>
  <li>Xử lý cùng một tập dữ liệu ở nhiều region.</li>
  <li>Chỉ sao chép kết quả đã xử lý sang region khác; tối ưu chi phí (ví dụ đích dùng lifecycle chuyển sang Archive).</li>
</ul>

<h4>Điều kiện bắt buộc</h4>
<table>
  <thead><tr><th>Yêu cầu</th><th>Account nguồn</th><th>Account đích</th></tr></thead>
  <tbody>
    <tr><td><strong>Blob versioning</strong></td><td>Bật</td><td>Bật</td></tr>
    <tr><td><strong>Change feed</strong></td><td>Bật</td><td>Không bắt buộc</td></tr>
    <tr><td>Loại account</td><td colspan="2">GPv2 hoặc Premium block blob</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 260" role="img" aria-label="Object replication: container data ở account nguồn được sao chép bất đồng bộ sang container data-copy ở account đích theo một policy">
  <rect class="box-w" x="10" y="20" width="280" height="200" rx="12"/>
  <text x="150" y="44" text-anchor="middle" class="t-b t-w">Account nguồn (East US)</text>
  <text x="150" y="62" text-anchor="middle" class="t-sm t-mute">bật versioning + change feed</text>
  <rect class="box-a" x="30" y="80" width="240" height="56" rx="8"/>
  <text x="150" y="103" text-anchor="middle" class="t-b">Container: data</text>
  <text x="150" y="123" text-anchor="middle" class="t-sm t-mute">block blob mới hoặc thay đổi</text>
  <rect class="box" x="30" y="150" width="240" height="56" rx="8"/>
  <text x="150" y="173" text-anchor="middle" class="t-b">Container: logs</text>
  <text x="150" y="193" text-anchor="middle" class="t-sm t-mute">không có rule → không sao chép</text>

  <rect class="box-w" x="430" y="20" width="280" height="200" rx="12"/>
  <text x="570" y="44" text-anchor="middle" class="t-b t-w">Account đích (West Europe)</text>
  <text x="570" y="62" text-anchor="middle" class="t-sm t-mute">bật versioning</text>
  <rect class="box-s" x="450" y="80" width="240" height="56" rx="8"/>
  <text x="570" y="103" text-anchor="middle" class="t-b">Container: data-copy</text>
  <text x="570" y="123" text-anchor="middle" class="t-sm t-mute">chỉ đọc: ghi trả lỗi 409</text>

  <line class="ln-a dash" x1="270" y1="108" x2="446" y2="108" marker-end="url(#arr-a)"/>
  <text x="360" y="98" text-anchor="middle" class="t-sm t-a">async · block blob</text>

  <rect class="box-e" x="10" y="232" width="700" height="24" rx="6"/>
  <text x="360" y="249" text-anchor="middle" class="t-sm">Policy: cùng policy ID ở hai account · tối đa 1.000 rule · mỗi rule = 1 cặp container</text>
</svg>
<figcaption>Hình 1. Object replication hoạt động theo cặp container chứ không theo cả account. Chỉ container có rule mới được sao chép; container đích thành chỉ đọc với thao tác ghi. Account đích có thể ở bất kỳ region nào, khác với GRS luôn dùng paired region.</figcaption>
</figure>

<h4>Giới hạn quan trọng</h4>
<ul>
  <li>Chỉ <strong>block blob</strong>; không hỗ trợ append blob, page blob.</li>
  <li>Không hỗ trợ account bật <strong>hierarchical namespace</strong> (Data Lake Storage Gen2).</li>
  <li>Không sao chép <strong>snapshot</strong>. Blob ở <strong>Archive</strong> (nguồn hoặc đích) làm replication thất bại.</li>
  <li>Một account nguồn sao chép tới tối đa <strong>2 account đích</strong> (một policy cho mỗi đích); một policy có tối đa <strong>1.000 rule</strong>, mỗi rule là một cặp container nguồn – đích.</li>
  <li>Sau khi tạo policy, container đích trở thành <strong>chỉ đọc</strong> với thao tác ghi (lỗi 409); đọc và xóa vẫn được.</li>
  <li>Mặc định chỉ sao chép blob <strong>tạo mới sau</strong> khi có rule; có thể chọn sao chép cả blob có sẵn.</li>
  <li>Đổi tier ở nguồn không làm đổi tier ở đích.</li>
  <li>Account tạo mới mặc định không cho cross-tenant replication (<code>AllowCrossTenantReplication = false</code>).</li>
</ul>

<h4>Quy trình cấu hình</h4>
<ol class="steps">
  <li>Bật versioning trên cả hai account, bật change feed trên account nguồn.</li>
  <li>Tạo container đích (phải tồn tại trước).</li>
  <li>Tạo replication policy trên <strong>account đích</strong> (portal làm tự động cả hai phía), lấy policy ID.</li>
  <li>Gán cùng policy ID đó cho account nguồn. Có thể lọc theo prefix và thời điểm tạo (<code>minCreationTime</code>).</li>
</ol>
<pre><code>az storage account blob-service-properties update -n srcacct -g rg --enable-versioning true --enable-change-feed true
az storage account blob-service-properties update -n dstacct -g rg --enable-versioning true
az storage account or-policy create --account-name dstacct -g rg \\
  --source-account srcacct --destination-account dstacct \\
  --source-container data --destination-container data-copy --min-creation-time "1601-01-01T00:00:00Z"</code></pre>

<div class="compare">
  <div><strong>Object replication</strong>Bạn chọn container, prefix, account đích (bất kỳ region). Đích đọc được ngay, nhưng không ghi được. Chỉ block blob.</div>
  <div><strong>GRS / RA-GRS</strong>Toàn bộ account, region phụ cố định (paired region). Vùng phụ chỉ đọc (RA) hoặc chỉ dùng sau failover.</div>
</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần bật gì trước khi cấu hình object replication?" → <strong>versioning trên cả hai account + change feed trên account nguồn</strong>. Soft delete <em>không</em> phải điều kiện bắt buộc.</div>
`
    },
    {
      id: 'manage-blobs',
      unit: 'Manage blobs',
      title: 'Quản lý blob: upload, công cụ, thuộc tính',
      html: `
<h4>Công cụ upload/download</h4>
<table>
  <thead><tr><th>Công cụ</th><th>Phù hợp khi</th></tr></thead>
  <tbody>
    <tr><td><strong>AzCopy</strong></td><td>Dòng lệnh, copy hiệu năng cao, script, server-to-server</td></tr>
    <tr><td><strong>Azure Storage Explorer</strong></td><td>Giao diện đồ họa trên Windows/macOS/Linux, kéo thả</td></tr>
    <tr><td><strong>Azure portal (Storage browser)</strong></td><td>Thao tác nhanh vài file</td></tr>
    <tr><td><strong>Azure CLI / PowerShell</strong></td><td>Tự động hóa trong script</td></tr>
    <tr><td><strong>Azure Data Factory</strong></td><td>Pipeline ETL, sao chép định kỳ từ nhiều nguồn</td></tr>
    <tr><td><strong>Blobfuse2</strong></td><td>Mount container như file system trên Linux</td></tr>
    <tr><td><strong>Azure Data Box</strong></td><td>Chuyển dữ liệu rất lớn (hàng chục TB trở lên) khi mạng chậm hoặc không có mạng</td></tr>
  </tbody>
</table>

<h4>Thao tác quản lý thường gặp</h4>
<pre><code># Liệt kê blob theo prefix
az storage blob list --account-name contosomedia -c images --prefix 2026/ -o table --auth-mode login

# Tải xuống
az storage blob download --account-name contosomedia -c images -n logo.png -f ./logo.png --auth-mode login

# Đặt metadata và index tag
az storage blob metadata update --account-name contosomedia -c images -n logo.png --metadata owner=marketing --auth-mode login
az storage blob tag set --account-name contosomedia -c images -n logo.png --tags project=web --auth-mode login

# Lease (khóa ghi/xóa) blob 60 giây
az storage blob lease acquire --account-name contosomedia -c images -b logo.png --lease-duration 60 --auth-mode login</code></pre>

<h4>Blob lease</h4>
<p><strong>Lease</strong> tạo khóa độc quyền cho thao tác ghi và xóa: thời hạn <strong>15–60 giây</strong> hoặc <strong>vô hạn</strong>. Khi blob đang có lease, muốn ghi/xóa phải cung cấp lease ID. Container cũng có lease (chặn xóa container).</p>

<h4>Static website</h4>
<ol class="steps">
  <li>Trong storage account (GPv2), mở <strong>Static website</strong> và bật Enabled.</li>
  <li>Nhập <strong>Index document name</strong> (ví dụ <code>index.html</code>) và <strong>Error document path</strong> (ví dụ <code>404.html</code>).</li>
  <li>Azure tạo container <code>$web</code>; upload nội dung tĩnh vào đó.</li>
  <li>Truy cập qua endpoint <code>https://&lt;account&gt;.z&lt;n&gt;.web.core.windows.net</code>. Thêm Azure Front Door/CDN nếu cần custom domain với HTTPS.</li>
</ol>
<p>Nội dung trong <code>$web</code> được đọc công khai qua web endpoint <strong>bất kể</strong> mức access level của container.</p>

<h4>Change feed và blob inventory</h4>
<ul>
  <li><strong>Change feed</strong>: log có thứ tự, chỉ đọc, về mọi thay đổi (tạo, sửa, xóa) trên blob, lưu trong container <code>$blobchangefeed</code>. Cần cho object replication và point-in-time restore.</li>
  <li><strong>Blob inventory</strong>: báo cáo hằng ngày/tuần (CSV hoặc Parquet) liệt kê blob, thuộc tính, tier.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Chuyển 60 TB từ datacenter có băng thông thấp lên Blob" → <strong>Azure Data Box</strong>. "Script copy định kỳ, nhanh, server-to-server" → <strong>AzCopy</strong>. "Nhân viên không rành CLI cần upload/download file" → <strong>Storage Explorer</strong>.</div>
`
    },
    {
      id: 'pricing',
      unit: 'Determine Blob Storage pricing',
      title: 'Các yếu tố tính giá Blob Storage',
      html: `
<p>Hóa đơn Blob Storage gồm nhiều thành phần, không chỉ dung lượng.</p>
<table>
  <thead><tr><th>Thành phần</th><th>Giải thích</th></tr></thead>
  <tbody>
    <tr><td><strong>Performance tier</strong></td><td>Premium (SSD) giá lưu trữ cao hơn, giao dịch rẻ hơn; Standard ngược lại.</td></tr>
    <tr><td><strong>Access tier</strong></td><td>Giá theo GB/tháng giảm dần Hot → Cool → Cold → Archive.</td></tr>
    <tr><td><strong>Redundancy</strong></td><td>LRS &lt; ZRS &lt; GRS &lt; RA-GRS &lt; GZRS &lt; RA-GZRS.</td></tr>
    <tr><td><strong>Transactions (operations)</strong></td><td>Tính theo mỗi 10.000 thao tác (read, write, list…). Tier càng lạnh, phí giao dịch càng cao.</td></tr>
    <tr><td><strong>Data retrieval</strong></td><td>Phí theo GB khi đọc dữ liệu ở Cool, Cold, Archive. Hot không có phí này.</td></tr>
    <tr><td><strong>Geo-replication data transfer</strong></td><td>Phí theo GB sao chép sang region phụ (GRS, RA-GRS, GZRS, RA-GZRS).</td></tr>
    <tr><td><strong>Outbound data transfer</strong></td><td>Dữ liệu ra khỏi region Azure tính phí theo GB. Dữ liệu vào (ingress) miễn phí.</td></tr>
    <tr><td><strong>Early deletion</strong></td><td>Xóa/đổi tier trước 30 (Cool), 90 (Cold), 180 (Archive) ngày.</td></tr>
    <tr><td><strong>Tính năng thêm</strong></td><td>Versioning, snapshot, soft delete tính phí dung lượng của dữ liệu được giữ lại; change feed, blob inventory, index tags cũng có phí.</td></tr>
  </tbody>
</table>

<h4>Tối ưu chi phí</h4>
<ul>
  <li>Dùng <strong>lifecycle management</strong> để tự động hạ tier dữ liệu cũ và xóa dữ liệu hết hạn, version/snapshot cũ.</li>
  <li><strong>Reserved capacity</strong> (cam kết 1 hoặc 3 năm, theo đơn vị 100 TiB hoặc 1 PiB) giảm giá lưu trữ cho Hot, Cool, Archive.</li>
  <li>Chọn region gần người dùng để giảm egress; dùng CDN cho nội dung tĩnh.</li>
  <li>Upload thẳng vào tier phù hợp (<code>--tier Cool</code> hay <code>--block-blob-tier</code> của AzCopy) thay vì upload Hot rồi hạ tier.</li>
  <li>Không đặt default tier Cool cho account có nhiều dữ liệu truy cập thường xuyên: phí đọc sẽ vượt phần tiết kiệm.</li>
</ul>

<h4>Ví dụ ước tính nhanh</h4>
<p>Một dataset 50 TB cần lưu 1 năm, gần như không đọc, chấp nhận chờ vài giờ khi cần: Archive rẻ nhất về lưu trữ, nhưng nếu phải đọc lại toàn bộ thì phí rehydrate (đọc + data retrieval) có thể rất lớn. Với dữ liệu thỉnh thoảng cần đọc ngay, <strong>Cold</strong> thường cân bằng hơn.</p>

<div class="callout exam"><strong>Góc thi</strong>Đề hỏi "giảm chi phí lưu trữ log cũ hơn 90 ngày mà không cần viết code" → <strong>lifecycle management rule</strong>. Câu hỏi về "chi phí khi đọc dữ liệu ở Cool" nhớ có cả <strong>phí giao dịch</strong> và <strong>phí data retrieval</strong> theo GB.</div>
`
    },
    {
      id: 'exercise-public-website',
      unit: 'Exercise - Provide storage for the public website',
      title: 'Thực hành: storage cho website công khai',
      html: `
<p>Kịch bản: công ty cần lưu ảnh sản phẩm cho website công khai. Ảnh phải đọc được ẩn danh, chịu được sự cố region, và có thể khôi phục khi bị xóa nhầm.</p>
<ol class="steps">
  <li>Tạo resource group và storage account <strong>Standard GPv2</strong> với redundancy <strong>RA-GRS</strong> (đọc được ở vùng phụ khi region chính có sự cố).</li>
  <li>Trong <strong>Configuration</strong>, bật <strong>Allow Blob anonymous access</strong>.</li>
  <li>Tạo container <code>public</code> với anonymous access level <strong>Blob</strong> (đọc blob, không liệt kê).</li>
  <li>Upload một file ảnh; mở URL của blob trong trình duyệt ẩn danh để kiểm tra truy cập công khai.</li>
  <li>Trong <strong>Data protection</strong>, bật <strong>soft delete for blobs</strong> (ví dụ 21 ngày) và <strong>soft delete for containers</strong>.</li>
  <li>Xóa blob vừa upload, bật <em>Show deleted blobs</em>, chọn blob và <strong>Undelete</strong>.</li>
  <li>Bật <strong>blob versioning</strong>; upload lại file cùng tên để tạo version mới, sau đó xem tab <em>Versions</em> và đặt một version cũ làm bản hiện tại.</li>
</ol>
<pre><code>az storage account create -n contosoweb01 -g rg-web -l eastus --sku Standard_RAGRS --kind StorageV2 --allow-blob-public-access true
az storage container create --account-name contosoweb01 -n public --public-access blob --auth-mode login
az storage blob upload --account-name contosoweb01 -c public -n product1.jpg -f ./product1.jpg --auth-mode login
az storage account blob-service-properties update -n contosoweb01 -g rg-web \\
  --enable-delete-retention true --delete-retention-days 21 \\
  --enable-container-delete-retention true --container-delete-retention-days 21 \\
  --enable-versioning true</code></pre>

<div class="callout tip"><strong>Mở rộng</strong>Để phục vụ ảnh với tên miền riêng và HTTPS, đặt <strong>Azure Front Door</strong> phía trước. Để giảm chi phí ảnh cũ, thêm lifecycle rule chuyển ảnh không sửa sau 90 ngày sang Cool.</div>
`
    },
    {
      id: 'data-protection',
      extra: true,
      title: 'Soft delete, versioning, snapshot và immutable storage',
      html: `
<h4>Bảng so sánh các lớp bảo vệ</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Bảo vệ khỏi</th><th>Chi tiết</th></tr></thead>
  <tbody>
    <tr><td><strong>Blob soft delete</strong></td><td>Xóa nhầm blob, snapshot (và ghi đè, khi kết hợp)</td><td>Giữ dữ liệu bị xóa <strong>1–365 ngày</strong>; khôi phục bằng Undelete.</td></tr>
    <tr><td><strong>Container soft delete</strong></td><td>Xóa nhầm container</td><td><strong>1–365 ngày</strong>; khôi phục cả container cùng blob bên trong.</td></tr>
    <tr><td><strong>Blob versioning</strong></td><td>Ghi đè, xóa nhầm</td><td>Mỗi lần ghi/xóa tự tạo một <strong>version</strong> chỉ đọc; khôi phục bằng cách đặt version cũ làm current.</td></tr>
    <tr><td><strong>Snapshot</strong></td><td>Thay đổi ngoài ý muốn (thủ công)</td><td>Bản chụp chỉ đọc tại một thời điểm, tạo <strong>thủ công</strong>; URL có <code>?snapshot=&lt;DateTime&gt;</code>.</td></tr>
    <tr><td><strong>Point-in-time restore</strong></td><td>Hỏng dữ liệu diện rộng</td><td>Khôi phục <strong>block blob</strong> trong container về một thời điểm trước.</td></tr>
    <tr><td><strong>Immutable storage (WORM)</strong></td><td>Sửa/xóa, kể cả bởi admin</td><td>Time-based retention hoặc legal hold.</td></tr>
    <tr><td><strong>Resource lock</strong></td><td>Xóa storage account</td><td>Lock <code>CanNotDelete</code> chặn xóa account, không chặn xóa dữ liệu bên trong.</td></tr>
  </tbody>
</table>

<h4>Versioning và snapshot</h4>
<ul>
  <li>Versioning và snapshot tính phí cho các <strong>block khác biệt</strong> (nếu tier không đổi). Version cũ tích lũy rất nhanh với dữ liệu thay đổi thường xuyên: dùng lifecycle để xóa version cũ.</li>
  <li>Versioning không hỗ trợ account có hierarchical namespace.</li>
  <li>Microsoft khuyến nghị bật đồng thời <strong>versioning + blob soft delete + container soft delete</strong>.</li>
</ul>

<h4>Point-in-time restore</h4>
<ul>
  <li>Yêu cầu bật <strong>blob soft delete</strong>, <strong>versioning</strong> và <strong>change feed</strong>.</li>
  <li>Thời gian restore tối đa phải <strong>ngắn hơn</strong> thời gian giữ của soft delete.</li>
  <li>Chỉ cho <strong>block blob</strong> trên Standard GPv2; không hỗ trợ account có hierarchical namespace. Không tương thích với immutable storage.</li>
</ul>
<pre><code>az storage account blob-service-properties update -n acct -g rg \\
  --enable-delete-retention true --delete-retention-days 14 \\
  --enable-versioning true --enable-change-feed true \\
  --enable-restore-policy true --restore-days 7
az storage blob restore --account-name acct -g rg --time-to-restore 2026-11-01T08:00:00Z</code></pre>

<h4>Immutable storage (WORM: Write Once, Read Many)</h4>
<div class="compare">
  <div><strong>Time-based retention</strong>Lưu trong <strong>1 ngày – 146.000 ngày</strong> (400 năm). Trong thời gian này chỉ tạo và đọc, không sửa/xóa. Policy <em>unlocked</em> để thử nghiệm (sửa, xóa được). Khi <strong>locked</strong>: không xóa policy, chỉ <strong>tăng</strong> thời gian, tối đa <strong>5 lần</strong> tăng với policy cấp container.</div>
  <div><strong>Legal hold</strong>Giữ dữ liệu bất biến cho tới khi <strong>gỡ hold</strong> một cách tường minh; không có thời hạn. Cấp container phải gắn một hoặc nhiều <strong>tag</strong> (ví dụ mã vụ kiện).</div>
</div>
<ul>
  <li><strong>Container-level WORM</strong>: policy cho toàn container, không cần versioning, hỗ trợ cả Data Lake Storage.</li>
  <li><strong>Version-level WORM</strong>: policy ở account, container hoặc từng version; <strong>cần versioning</strong>.</li>
  <li>Container có policy locked chỉ xóa được khi <strong>rỗng</strong>; account chứa container như vậy cũng không xóa được cho tới khi hết dữ liệu được bảo vệ.</li>
  <li>Tùy chọn <code>allowProtectedAppendWrites</code> cho phép ghi nối vào append blob dưới policy time-based.</li>
  <li>Không tốn thêm phí lưu trữ; hỗ trợ mọi tier và mọi redundancy.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Tuân thủ SEC 17a-4: lưu 7 năm, không ai sửa/xóa được kể cả admin" → <strong>time-based retention policy, locked</strong>. "Giữ dữ liệu cho vụ kiện chưa biết khi nào kết thúc" → <strong>legal hold</strong>. "Khôi phục cả container về trạng thái 3 ngày trước" → <strong>point-in-time restore</strong>.</div>
`
    },
    {
      id: 'rehydrate',
      extra: true,
      title: 'Rehydrate từ Archive',
      html: `
<p>Blob ở Archive là <strong>offline</strong>: không đọc, không sửa nội dung được (vẫn đọc được metadata, liệt kê, xóa). Muốn đọc phải <strong>rehydrate</strong> về Hot, Cool hoặc Cold.</p>

<h4>Hai cách rehydrate</h4>
<div class="compare">
  <div><strong>Set Blob Tier (đổi tier tại chỗ)</strong>Đổi tier của chính blob đó sang Hot/Cool/Cold. Trong lúc chờ, tier vẫn hiển thị Archive (trạng thái <code>rehydrate-pending-to-hot</code>…). <strong>Không hủy được</strong> sau khi bắt đầu. Có thể chịu phí early deletion nếu chưa đủ 180 ngày.</div>
  <div><strong>Copy Blob (copy sang blob mới)</strong>Tạo blob mới ở tier online, blob gốc vẫn ở Archive. <strong>Tránh phí early deletion</strong>; tên/container đích phải khác. Có thể copy sang account khác <strong>cùng region</strong>. Snapshot/version ở Archive chỉ rehydrate được bằng cách này.</div>
</div>

<h4>Rehydration priority</h4>
<table>
  <thead><tr><th>Priority</th><th>Thời gian</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>Standard</strong> (mặc định)</td><td>Tới <strong>15 giờ</strong> (với object dưới 10 GB)</td><td>Rẻ hơn</td></tr>
    <tr><td><strong>High</strong></td><td>Có thể <strong>dưới 1 giờ</strong> với object dưới 10 GB</td><td>Đắt hơn; dùng khi khẩn cấp. Có thể nâng một yêu cầu Standard đang chờ lên High, <strong>không hạ</strong> từ High xuống Standard.</td></tr>
  </tbody>
</table>
<p>Thông lượng rehydrate với priority cao bị giới hạn ở cấp account (tài liệu nêu khoảng 10 GiB mỗi giờ), nên rehydrate số lượng lớn sẽ lâu hơn nhiều so với mốc "dưới 1 giờ".</p>

<pre><code># Đổi tier tại chỗ, priority High
az storage blob set-tier --account-name acct -c archive -n report.zip --tier Hot --rehydrate-priority High --auth-mode login

# Copy sang blob mới ở tier Cool
az storage blob copy start --account-name acct --destination-container restore --destination-blob report.zip \\
  --source-container archive --source-blob report.zip --tier Cool --rehydrate-priority Standard --auth-mode login</code></pre>

<h4>Nhận thông báo khi xong</h4>
<p>Thay vì liên tục gọi Get Blob Properties, đăng ký <strong>Azure Event Grid</strong> với sự kiện <code>Microsoft.Storage.BlobTierChanged</code> (với Copy Blob còn có <code>BlobCreated</code> khi bắt đầu copy), rồi gọi Azure Function hoặc Logic App.</p>

<h4>Bẫy với lifecycle</h4>
<p>Set Blob Tier không đổi <em>last modified time</em>. Nếu có rule <code>tierToArchive</code> theo <code>daysAfterModificationGreaterThan</code>, blob vừa rehydrate có thể bị đẩy lại vào Archive ở lần chạy kế. Giải pháp: thêm <code>daysAfterLastTierChangeGreaterThan</code> vào rule, hoặc rehydrate bằng Copy Blob.</p>

<div class="callout exam"><strong>Góc thi</strong>"Cần đọc blob Archive trong vòng 1 giờ" → rehydrate với priority <strong>High</strong>. "Rehydrate nhưng tránh phí early deletion" → <strong>Copy Blob</strong> sang tier online. "Dùng lifecycle để đưa blob về Hot" → <strong>không làm được</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Ba loại blob: <strong>block</strong> (≈190,7 TiB), <strong>append</strong> (≈195 GiB, chỉ ghi nối), <strong>page</strong> (8 TiB, trang 512 byte, VHD).',
    'Anonymous access level: <strong>Private</strong>, <strong>Blob</strong> (đọc, không liệt kê), <strong>Container</strong> (đọc + liệt kê). <code>AllowBlobPublicAccess = false</code> ở cấp account ghi đè mọi container.',
    'Thời gian lưu tối thiểu: Cool <strong>30</strong>, Cold <strong>90</strong>, Archive <strong>180</strong> ngày; vi phạm thì tính phí early deletion theo tỉ lệ.',
    'Default access tier của account: Hot, Cool hoặc Cold; <strong>Archive không thể</strong> là default.',
    'Archive chỉ hỗ trợ account <strong>LRS, GRS, RA-GRS</strong>; access tier chỉ áp dụng cho block blob.',
    'Rehydrate: Standard tới <strong>15 giờ</strong>; High có thể <strong>dưới 1 giờ</strong> với object dưới 10 GB.',
    'Lifecycle policy có thể mất tới <strong>24 giờ</strong> để có hiệu lực; <code>prefixMatch</code> bắt đầu bằng tên container; không rehydrate được.',
    'Object replication cần <strong>versioning ở cả hai account</strong> và <strong>change feed ở account nguồn</strong>; chỉ block blob; không hỗ trợ hierarchical namespace.',
    'Blob và container soft delete giữ dữ liệu <strong>1–365 ngày</strong>.',
    'Point-in-time restore cần <strong>soft delete + versioning + change feed</strong>; chỉ block blob.',
    'Time-based retention: <strong>1–146.000 ngày</strong>; policy locked chỉ tăng được, tối đa 5 lần (cấp container), không xóa được.',
    'Version-level WORM cần bật <strong>versioning</strong>; container-level WORM thì không.'
  ],
  traps: [
    'Chọn Archive cho dữ liệu "hiếm khi đọc nhưng khi cần phải có ngay". Archive cần rehydrate hàng giờ; chọn <strong>Cold</strong> hoặc Cool.',
    'Viết <code>prefixMatch</code> thiếu tên container (ví dụ chỉ ghi <code>app1</code>). Prefix phải bắt đầu bằng <strong>tên container</strong>.',
    'Nghĩ lifecycle rule có hiệu lực ngay. Có thể mất tới <strong>24 giờ</strong>.',
    'Dùng lifecycle để rehydrate blob từ Archive. Không được: phải dùng Set Blob Tier hoặc Copy Blob.',
    'Cho rằng soft delete là điều kiện của object replication. Điều kiện là <strong>versioning (cả hai) + change feed (nguồn)</strong>.',
    'Đặt container ở mức Blob/Container nhưng quên account đang có <strong>AllowBlobPublicAccess = false</strong>.',
    'Cấu hình Archive trên account ZRS/GZRS. Archive chỉ chạy trên LRS, GRS, RA-GRS.',
    'Nghĩ policy immutable ở trạng thái <em>unlocked</em> đủ để tuân thủ SEC 17a-4. Phải <strong>lock</strong> policy.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Tên container</td><td>3–63 ký tự, chữ thường, số, gạch ngang</td></tr>
    <tr><td>Public access</td><td>Private / Blob (đọc) / Container (đọc + list); account-level AllowBlobPublicAccess</td></tr>
    <tr><td>Min retention</td><td>Cool 30 · Cold 90 · Archive 180 ngày</td></tr>
    <tr><td>Archive</td><td>Offline, chỉ LRS/GRS/RA-GRS, không là default tier</td></tr>
    <tr><td>Rehydrate</td><td>Standard ≤ 15h · High &lt; 1h (&lt; 10 GB); Set Blob Tier hoặc Copy Blob</td></tr>
    <tr><td>Lifecycle</td><td>JSON: filters (blobTypes, prefixMatch, blobIndexMatch) + actions (tierToCool/Cold/Archive, delete) theo baseBlob/snapshot/version</td></tr>
    <tr><td>Điều kiện lifecycle</td><td>daysAfterModification / Creation / LastAccessTime / LastTierChange GreaterThan</td></tr>
    <tr><td>Object replication</td><td>Versioning 2 phía + change feed nguồn; block blob; đích read-only</td></tr>
    <tr><td>Soft delete</td><td>Blob và container: 1–365 ngày</td></tr>
    <tr><td>Point-in-time restore</td><td>Soft delete + versioning + change feed</td></tr>
    <tr><td>Immutable</td><td>Time-based (1–146.000 ngày, lock) · Legal hold (tag, gỡ thủ công)</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Ba mức anonymous access của container?', back: '<strong>Private</strong> (không ẩn danh), <strong>Blob</strong> (đọc blob, không liệt kê), <strong>Container</strong> (đọc blob và liệt kê blob trong container).' },
    { front: 'Thiết lập nào ở cấp account chặn mọi anonymous access?', back: '<code>AllowBlobPublicAccess = false</code> (portal: Allow Blob anonymous access = Disabled).' },
    { front: 'Loại blob nào dùng cho log ghi nối?', back: '<strong>Append blob</strong> (tối đa khoảng 195 GiB).' },
    { front: 'Kích thước tối đa page blob?', back: '<strong>8 TiB</strong>, các trang 512 byte.' },
    { front: 'Thời gian lưu tối thiểu của Cool, Cold, Archive?', back: '<strong>30, 90, 180</strong> ngày.' },
    { front: 'Tier nào không thể đặt làm default của account?', back: '<strong>Archive</strong>.' },
    { front: 'Redundancy nào hỗ trợ Archive?', back: 'Chỉ <strong>LRS, GRS, RA-GRS</strong>.' },
    { front: 'Rehydrate priority và thời gian?', back: '<strong>Standard</strong>: tới 15 giờ. <strong>High</strong>: có thể dưới 1 giờ với object &lt; 10 GB.' },
    { front: 'Cách rehydrate tránh phí early deletion?', back: '<strong>Copy Blob</strong> sang blob mới ở tier online; blob gốc vẫn ở Archive.' },
    { front: 'Sự kiện Event Grid báo rehydrate xong?', back: '<code>Microsoft.Storage.BlobTierChanged</code>' },
    { front: 'Điều kiện lifecycle dựa vào lần truy cập cuối cần bật gì?', back: '<strong>Last access time tracking</strong> trên blob service.' },
    { front: 'Điều kiện bắt buộc của object replication?', back: '<strong>Versioning</strong> trên account nguồn và đích, <strong>change feed</strong> trên account nguồn.' },
    { front: 'Point-in-time restore cần bật những gì?', back: '<strong>Blob soft delete</strong>, <strong>versioning</strong>, <strong>change feed</strong> (và restore policy).' },
    { front: 'Khoảng thời gian của time-based retention policy?', back: '<strong>1 ngày đến 146.000 ngày</strong> (400 năm).' },
    { front: 'Policy time-based đã lock có thể làm gì?', back: 'Chỉ <strong>tăng</strong> thời gian (tối đa 5 lần với policy cấp container); không giảm, không xóa.' },
    { front: 'Legal hold khác time-based retention thế nào?', back: 'Legal hold không có thời hạn, giữ tới khi được gỡ tường minh; cấp container cần gắn tag.' },
    { front: 'Static website lưu nội dung ở container nào?', back: '<code>$web</code>, endpoint <code>&lt;account&gt;.z&lt;n&gt;.web.core.windows.net</code>.' }
  ],
  quiz: [
    {
      q: 'Bạn có container <code>docs</code> trong account Storage1. Người dùng ẩn danh phải tải được từng file khi biết URL nhưng không được xem danh sách file. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Đặt anonymous access level của container là Blob', 'Đặt anonymous access level của container là Container', 'Bật Allow Blob anonymous access ở cấp storage account', 'Tạo stored access policy cho container'],
      answer: [0, 2],
      explain: 'Mức Blob cho phép đọc blob ẩn danh nhưng không liệt kê, và chỉ có tác dụng khi account cho phép anonymous access. Mức Container cho phép liệt kê nên vi phạm yêu cầu. Stored access policy dùng với SAS, không phải truy cập ẩn danh.'
    },
    {
      q: 'Công ty lưu báo cáo tài chính phải giữ 7 năm. Báo cáo gần như không bao giờ được đọc; khi kiểm toán, có thể chờ tới 1 ngày. Bạn cần chi phí lưu trữ thấp nhất. Bạn chọn tier nào?',
      options: ['Hot', 'Cool', 'Archive', 'Cold'],
      answer: [2],
      explain: 'Archive có giá lưu trữ thấp nhất và độ trễ hàng giờ là chấp nhận được. Cool và Cold đắt hơn về lưu trữ. Hot đắt nhất và dành cho dữ liệu dùng thường xuyên.'
    },
    {
      q: 'Bạn đã chuyển một blob sang Archive 60 ngày trước. Hôm nay bạn đổi nó sang Hot bằng Set Blob Tier. Điều gì xảy ra về chi phí?',
      options: ['Không phát sinh phí nào ngoài phí lưu Hot', 'Chỉ trả phí giao dịch ghi', 'Bị tính phí lưu Archive cho 180 ngày tính từ hôm nay', 'Bị tính phí early deletion tương đương 120 ngày lưu ở Archive, cộng phí đọc và data retrieval'],
      answer: [3],
      explain: 'Archive có thời gian tối thiểu 180 ngày; đổi tier sau 60 ngày bị tính phần còn lại (120 ngày) theo tỉ lệ. Rehydrate còn tính phí thao tác đọc và data retrieval theo GB. Không phải 180 ngày tính từ hôm nay, và không miễn phí.'
    },
    {
      q: 'Một storage account dùng ZRS. Khi bạn cố chuyển một blob sang Archive thì thất bại. Nguyên nhân là gì?',
      options: ['Blob là block blob', 'Archive không được hỗ trợ trên account ZRS', 'Account chưa bật versioning', 'Default access tier của account là Hot'],
      answer: [1],
      explain: 'Archive chỉ hỗ trợ trên LRS, GRS và RA-GRS. Block blob chính là loại hỗ trợ access tier. Versioning và default tier Hot không ngăn việc archive.'
    },
    {
      q: 'Bạn có lifecycle rule với <code>"prefixMatch": ["logs/app"]</code> và <code>"tierToCool": {"daysAfterModificationGreaterThan": 30}</code>. Những blob nào được chuyển sang Cool sau 45 ngày không sửa đổi? (Chọn 2)',
      options: ['Blob <code>web/app.log</code> trong container <code>logs</code>', 'Blob <code>app/2026.log</code> trong container <code>logs</code>', 'Blob <code>logs/app1.log</code> trong container <code>archive</code>', 'Blob <code>app1.log</code> trong container <code>logs</code>'],
      answer: [1, 3],
      explain: 'prefixMatch bắt đầu bằng tên container: <code>logs/app</code> nghĩa là container <code>logs</code>, tên blob bắt đầu bằng <code>app</code>. Cả <code>app1.log</code> và <code>app/2026.log</code> trong container <code>logs</code> đều khớp. Blob trong container <code>archive</code> không khớp dù tên chứa "logs/app". Blob <code>web/app.log</code> không bắt đầu bằng <code>app</code>.'
    },
    {
      q: 'Bạn muốn blob ở Cool tự động trở về Hot ngay khi có người đọc lại. Bạn cần cấu hình gì?',
      options: ['Đổi default access tier của account sang Hot', 'Bật last access time tracking và dùng action <code>enableAutoTierToHotFromCool</code> cùng điều kiện <code>daysAfterLastAccessTimeGreaterThan</code>', 'Tạo Event Grid subscription cho sự kiện BlobCreated', 'Dùng điều kiện <code>daysAfterModificationGreaterThan</code> với action tierToHot'],
      answer: [1],
      explain: '<code>enableAutoTierToHotFromCool</code> dựa trên thời gian truy cập cuối nên cần last access tracking. Đổi default tier không ảnh hưởng blob đã đặt tier tường minh. Không có action <code>tierToHot</code> theo modification. Event Grid BlobCreated không xử lý việc đọc.'
    },
    {
      q: 'Bạn chuẩn bị cấu hình object replication từ StorageA (East US) sang StorageB (West Europe). Bạn cần bật gì trước? (Chọn 2)',
      options: ['Change feed trên StorageA', 'Soft delete trên StorageB', 'Blob versioning trên cả StorageA và StorageB', 'Hierarchical namespace trên StorageA'],
      answer: [0, 2],
      explain: 'Object replication yêu cầu versioning ở cả hai account và change feed ở account nguồn. Soft delete không bắt buộc. Hierarchical namespace thì ngược lại: object replication không hỗ trợ account bật tính năng này.'
    },
    {
      q: 'Một blob ở Archive cần được đọc gấp trong vòng 1 giờ để phục vụ kiểm toán. Blob nặng 2 GB. Bạn nên làm gì?',
      options: ['Rehydrate với priority High', 'Rehydrate với priority Standard', 'Tạo lifecycle rule chuyển blob về Hot', 'Tạo snapshot của blob rồi đọc snapshot'],
      answer: [0],
      explain: 'Priority High có thể hoàn tất dưới 1 giờ với object nhỏ hơn 10 GB. Standard có thể mất tới 15 giờ. Lifecycle không rehydrate được. Snapshot không hỗ trợ cho blob ở Archive và cũng không đọc được.'
    },
    {
      q: 'Bạn cần rehydrate một blob đã ở Archive 30 ngày mà không phải trả phí early deletion. Phương án nào phù hợp?',
      options: ['Set Blob Tier sang Cool', 'Đổi default access tier của account sang Hot', 'Copy blob sang một blob mới ở tier Hot', 'Xóa blob rồi khôi phục bằng soft delete'],
      answer: [2],
      explain: 'Copy Blob tạo blob mới ở tier online, blob nguồn vẫn ở Archive nên không bị tính early deletion. Set Blob Tier đổi tier blob gốc trước 180 ngày nên phát sinh phí. Default tier không áp dụng cho blob ở Archive. Xóa rồi khôi phục không đưa blob ra khỏi Archive.'
    },
    {
      q: 'Phòng pháp chế yêu cầu giữ toàn bộ email lưu trong một container không bị sửa hoặc xóa cho tới khi vụ kiện kết thúc, thời điểm kết thúc chưa xác định. Bạn nên dùng gì?',
      options: ['Time-based retention policy 10 năm', 'Blob soft delete 365 ngày', 'Resource lock CanNotDelete trên storage account', 'Legal hold trên container'],
      answer: [3],
      explain: 'Legal hold giữ dữ liệu bất biến cho tới khi được gỡ, phù hợp khi không biết thời hạn. Time-based retention cần một khoảng thời gian cố định. Soft delete chỉ cho phép khôi phục, không chặn sửa/xóa. Resource lock chỉ chặn xóa account, không bảo vệ dữ liệu bên trong.'
    },
    {
      q: 'Một ứng dụng lỗi đã ghi đè và xóa hàng nghìn block blob trong container trong 2 giờ qua. Bạn cần khôi phục container về trạng thái 3 giờ trước với ít công sức nhất. Account đã bật soft delete, versioning và change feed. Bạn dùng gì?',
      options: ['Undelete từng blob trong portal', 'Point-in-time restore', 'Object replication', 'Rehydrate từ Archive'],
      answer: [1],
      explain: 'Point-in-time restore khôi phục block blob trong container về một thời điểm trước, đúng yêu cầu và các điều kiện đã bật. Undelete từng blob tốn công và không xử lý được ghi đè. Object replication và rehydrate không phải tính năng khôi phục.'
    },
    {
      q: 'Bạn cấu hình time-based retention policy 5 năm cho container và đã lock. Một năm sau, công ty muốn giảm xuống 3 năm. Điều gì đúng?',
      options: ['Có thể giảm vì vẫn trong 5 lần thay đổi', 'Có thể xóa policy rồi tạo lại', 'Không thể giảm; chỉ có thể tăng thời gian retention', 'Chỉ Microsoft Support mới giảm được'],
      answer: [2],
      explain: 'Policy đã lock không thể giảm thời gian và không thể xóa; chỉ được tăng (tối đa 5 lần với policy cấp container). Policy unlocked mới sửa/xóa được. Microsoft Support cũng không ghi đè được, đó là bản chất của WORM tuân thủ.'
    },
    {
      q: 'Bạn cần chuyển 80 TB dữ liệu từ datacenter có kết nối Internet 50 Mbps lên Blob Storage trong vòng 2 tuần. Bạn nên dùng gì?',
      options: ['Azure Storage Explorer', 'AzCopy', 'Azure File Sync', 'Azure Data Box'],
      answer: [3],
      explain: 'Với 50 Mbps, truyền 80 TB qua mạng mất hơn 4 tháng. Data Box là thiết bị vật lý vận chuyển dữ liệu offline. AzCopy và Storage Explorer đều phụ thuộc băng thông mạng. Azure File Sync dành cho Azure Files, không phải Blob.'
    },
    {
      q: 'Bạn bật soft delete cho blob với thời gian giữ 14 ngày, đồng thời muốn bật point-in-time restore. Giá trị restore days nào hợp lệ?',
      options: ['7 ngày', '14 ngày', '30 ngày', '365 ngày'],
      answer: [0],
      explain: 'Thời gian tối đa của point-in-time restore phải ngắn hơn thời gian giữ của soft delete. Chỉ 7 ngày nhỏ hơn 14 ngày. Các giá trị bằng hoặc lớn hơn 14 đều không hợp lệ.'
    }
  ]
});

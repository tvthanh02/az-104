AZ.addModule({
  id: 'p4m3',
  summary: 'Bảo mật Azure Storage gồm hai câu hỏi: <strong>ai được truy cập dữ liệu</strong> (Shared Key, SAS, Microsoft Entra ID, anonymous) và <strong>dữ liệu được bảo vệ ra sao</strong> (mã hóa at rest, key do Microsoft hoặc khách hàng quản lý, HTTPS/TLS, mạng). Đề AZ-104 thường hỏi chọn loại SAS, đọc tham số trong SAS URI, thu hồi SAS bằng stored access policy, cấu hình customer-managed key và phân biệt role data plane với role management plane.',
  objectives: [
    'So sánh các phương thức ủy quyền: Shared Key, SAS, Microsoft Entra ID, anonymous access',
    'Chọn đúng loại SAS (user delegation, service, account) và đọc các tham số sv, ss, srt, sp, st, se, sip, spr, sig trong URI',
    'Dùng stored access policy để quản lý và thu hồi service SAS; xoay vòng access key an toàn',
    'Giải thích Storage Service Encryption, Microsoft-managed key, customer-managed key, infrastructure encryption và encryption scope',
    'Cấu hình customer-managed key với Azure Key Vault và managed identity',
    'Gán đúng role data plane (Storage Blob Data Reader/Contributor/Owner…) và áp dụng best practice bảo mật'
  ],
  sections: [
    {
      id: 'security-strategies',
      unit: 'Review Azure Storage security strategies',
      title: 'Chiến lược bảo mật và các phương thức ủy quyền',
      html: `
<p>Azure Storage bảo vệ dữ liệu theo nhiều lớp: <strong>mã hóa</strong> (at rest và in transit), <strong>xác thực/ủy quyền</strong>, <strong>mạng</strong> (firewall, private endpoint) và <strong>giám sát</strong> (Defender for Storage, log).</p>

<h4>Bốn phương thức ủy quyền truy cập dữ liệu</h4>
<table>
  <thead><tr><th>Phương thức</th><th>Cách hoạt động</th><th>Ưu / nhược</th></tr></thead>
  <tbody>
    <tr><td><strong>Microsoft Entra ID</strong> (khuyến nghị)</td><td>Token OAuth 2.0 của user, group, service principal hoặc managed identity; quyền cấp bằng Azure RBAC (role data plane) và với Data Lake thì thêm ACL.</td><td>Không lộ secret, thu hồi tập trung, có audit, hỗ trợ Conditional Access.</td></tr>
    <tr><td><strong>Shared Key</strong> (account key)</td><td>Ký request bằng một trong hai <strong>access key</strong> 512-bit của account.</td><td>Ai có key là có <strong>toàn quyền</strong> trên mọi dữ liệu của account (như mật khẩu root).</td></tr>
    <tr><td><strong>Shared access signature (SAS)</strong></td><td>URL token có giới hạn quyền, thời gian, IP, giao thức.</td><td>Ủy quyền có giới hạn cho bên thứ ba; khó thu hồi nếu không dùng stored access policy.</td></tr>
    <tr><td><strong>Anonymous</strong></td><td>Đọc công khai blob/container khi bật anonymous access.</td><td>Chỉ dùng cho nội dung công khai.</td></tr>
  </tbody>
</table>

<h4>Hỗ trợ theo dịch vụ</h4>
<table>
  <thead><tr><th>Dịch vụ</th><th>Shared Key</th><th>SAS</th><th>Entra ID</th><th>Anonymous</th></tr></thead>
  <tbody>
    <tr><td>Blob</td><td>Có</td><td>Có</td><td>Có</td><td>Có (đọc)</td></tr>
    <tr><td>Files (SMB)</td><td>Có</td><td>Không</td><td>Identity-based: AD DS, Entra Domain Services, Entra Kerberos</td><td>Không</td></tr>
    <tr><td>Files (REST)</td><td>Có</td><td>Có</td><td>Có (OAuth)</td><td>Không</td></tr>
    <tr><td>Queue</td><td>Có</td><td>Có</td><td>Có</td><td>Không</td></tr>
    <tr><td>Table</td><td>Có</td><td>Có</td><td>Có</td><td>Không</td></tr>
  </tbody>
</table>

<h4>Các thiết lập bảo mật cấp account</h4>
<ul>
  <li><strong>Secure transfer required</strong> (<code>supportsHttpsTrafficOnly</code>): chỉ nhận HTTPS (và SMB có mã hóa). Bật mặc định.</li>
  <li><strong>Minimum TLS version</strong>: đặt <strong>TLS 1.2</strong>.</li>
  <li><strong>Allow storage account key access</strong> (<code>AllowSharedKeyAccess</code>): đặt <code>false</code> để chặn Shared Key, kéo theo chặn mọi account SAS và service SAS (vì ký bằng key). User delegation SAS vẫn dùng được.</li>
  <li><strong>Allow Blob anonymous access</strong>: tắt nếu không cần nội dung công khai.</li>
  <li><strong>Default to Microsoft Entra authorization in the Azure portal</strong>: portal dùng Entra ID thay vì access key khi duyệt dữ liệu.</li>
</ul>
<pre><code>az storage account update -n contososec -g rg-sec \\
  --https-only true --min-tls-version TLS1_2 \\
  --allow-shared-key-access false --allow-blob-public-access false</code></pre>

<h4>Microsoft Defender for Storage</h4>
<p>Lớp phát hiện mối đe dọa: cảnh báo truy cập bất thường (IP lạ, Tor), hoạt động đáng ngờ, upload malware (malware scanning), phát hiện dữ liệu nhạy cảm. Bật ở cấp subscription hoặc từng account.</p>

<div class="callout exam"><strong>Góc thi</strong>Câu "phương thức ủy quyền an toàn nhất, Microsoft khuyến nghị" → <strong>Microsoft Entra ID</strong> (với managed identity cho ứng dụng chạy trên Azure). Tắt <code>AllowSharedKeyAccess</code> thì account SAS và service SAS đều <strong>ngừng hoạt động</strong>.</div>
`
    },
    {
      id: 'sas',
      unit: 'Create shared access signatures',
      title: 'Shared access signature (SAS)',
      html: `
<p><strong>SAS</strong> là chuỗi token gắn vào URL, cho phép truy cập <strong>có giới hạn</strong> vào tài nguyên storage mà không cần chia sẻ account key. Bạn kiểm soát: tài nguyên nào, quyền gì, trong khoảng thời gian nào, từ IP nào, qua giao thức nào.</p>

<h4>Ba loại SAS</h4>
<table>
  <thead><tr><th>Loại</th><th>Ký bằng</th><th>Phạm vi</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>User delegation SAS</strong></td><td><strong>User delegation key</strong> lấy bằng thông tin Microsoft Entra ID</td><td>Chỉ <strong>Blob Storage</strong> (và Data Lake Storage)</td><td><strong>An toàn nhất</strong>, Microsoft khuyến nghị. User delegation key hiệu lực tối đa <strong>7 ngày</strong>. Quyền thực tế = giao của quyền RBAC của người tạo và quyền trong SAS.</td></tr>
    <tr><td><strong>Service SAS</strong></td><td>Account key</td><td>Tài nguyên trong <strong>một dịch vụ</strong>: Blob, Queue, Table hoặc Files</td><td>Có thể gắn với <strong>stored access policy</strong>.</td></tr>
    <tr><td><strong>Account SAS</strong></td><td>Account key</td><td><strong>Một hoặc nhiều dịch vụ</strong>; cả thao tác cấp service (ví dụ Get/Set Service Properties)</td><td>Không dùng được stored access policy.</td></tr>
  </tbody>
</table>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 262" role="img" aria-label="Ba loại SAS và khóa dùng để ký: user delegation key lấy bằng Microsoft Entra ID ký user delegation SAS; account key ký service SAS và account SAS">
  <rect class="box-a" x="10" y="20" width="190" height="56" rx="10"/>
  <text x="105" y="44" text-anchor="middle" class="t-b">Microsoft Entra ID</text>
  <text x="105" y="63" text-anchor="middle" class="t-sm t-mute">user / managed identity</text>
  <rect class="box-a" x="255" y="20" width="190" height="56" rx="10"/>
  <text x="350" y="44" text-anchor="middle" class="t-b">User delegation key</text>
  <text x="350" y="63" text-anchor="middle" class="t-sm t-mute">hiệu lực tối đa 7 ngày</text>
  <rect class="box-s" x="500" y="20" width="210" height="56" rx="10"/>
  <text x="605" y="44" text-anchor="middle" class="t-b">User delegation SAS</text>
  <text x="605" y="63" text-anchor="middle" class="t-sm t-mute">chỉ Blob / Data Lake</text>
  <text x="605" y="96" text-anchor="middle" class="t-sm t-s">quyền = RBAC ∩ quyền trong SAS</text>
  <line class="ln-a" x1="200" y1="48" x2="251" y2="48" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="445" y1="48" x2="496" y2="48" marker-end="url(#arr-a)"/>

  <rect class="box-w" x="10" y="140" width="190" height="56" rx="10"/>
  <text x="105" y="164" text-anchor="middle" class="t-b">Account key</text>
  <text x="105" y="183" text-anchor="middle" class="t-sm t-mute">key1 / key2 (Shared Key)</text>
  <rect class="box" x="500" y="112" width="210" height="56" rx="10"/>
  <text x="605" y="136" text-anchor="middle" class="t-b">Service SAS</text>
  <text x="605" y="155" text-anchor="middle" class="t-sm t-mute">1 dịch vụ · có stored policy</text>
  <rect class="box" x="500" y="196" width="210" height="56" rx="10"/>
  <text x="605" y="220" text-anchor="middle" class="t-b">Account SAS</text>
  <text x="605" y="239" text-anchor="middle" class="t-sm t-mute">nhiều dịch vụ · không policy</text>
  <line class="ln" x1="200" y1="168" x2="496" y2="140" marker-end="url(#arr)"/>
  <line class="ln" x1="200" y1="168" x2="496" y2="224" marker-end="url(#arr)"/>
  <text x="330" y="138" text-anchor="middle" class="t-sm t-mute">ký HMAC-SHA256</text>
</svg>
<figcaption>Hình 1. Loại SAS phụ thuộc vào khóa dùng để ký. User delegation SAS không đụng tới account key nên vẫn hoạt động khi tắt Shared Key; ngược lại, regenerate key1 sẽ vô hiệu hóa mọi service SAS và account SAS đã ký bằng key1.</figcaption>
</figure>

<div class="compare">
  <div><strong>Ad hoc SAS</strong>Thời gian bắt đầu, hết hạn và quyền được ghi trực tiếp trong token. Muốn thu hồi trước hạn chỉ còn cách <strong>xoay vòng account key</strong> đã ký (hoặc thu hồi user delegation key).</div>
  <div><strong>SAS với stored access policy</strong>Token chỉ tham chiếu tới policy (<code>si=</code>). Thu hồi bằng cách sửa hoặc xóa policy, không ảnh hưởng SAS khác. Chỉ áp dụng cho <strong>service SAS</strong>.</div>
</div>

<h4>Tạo SAS</h4>
<pre><code># User delegation SAS cho một blob (đăng nhập Entra ID, cần quyền tạo user delegation key)
az storage blob generate-sas --account-name contososec -c reports -n q1.pdf \\
  --permissions r --expiry 2026-11-08T12:00Z --https-only \\
  --auth-mode login --as-user

# Service SAS cho container, ký bằng account key
az storage container generate-sas --account-name contososec -n reports \\
  --permissions rl --expiry 2026-11-08T12:00Z --account-key &lt;key&gt;

# Account SAS cho blob + file, resource type container + object
az storage account generate-sas --account-name contososec --services bf \\
  --resource-types co --permissions rwl --expiry 2026-11-08T12:00Z --https-only

# PowerShell
$ctx = New-AzStorageContext -StorageAccountName contososec -UseConnectedAccount
New-AzStorageBlobSASToken -Container reports -Blob q1.pdf -Permission r -ExpiryTime (Get-Date).AddHours(4) -Context $ctx</code></pre>
<p>Trong portal: storage account → <strong>Shared access signature</strong> (account SAS), hoặc chuột phải container/blob → <strong>Generate SAS</strong> (service SAS hoặc user delegation SAS tùy <em>Signing method</em>: Account key / User delegation key).</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo SAS cho một blob</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Mở container, chọn blob cần chia sẻ, mở menu <strong>…</strong> và chọn <strong>Generate SAS</strong>:<br><span class="path">Storage account › Data storage › Containers › reports › q1.pdf › … › Generate SAS</span></li>
    <li>Điền các tham số:
      <div class="blade">
        <div class="blade-title">Generate SAS</div>
        <div class="pf"><label>Signing method</label><span class="pv radio">User delegation key</span></div>
        <div class="pf"><label></label><span class="pv">Account key</span></div>
        <div class="pf"><label class="req">Permissions</label><span class="pv sel">Read</span></div>
        <div class="pf"><label class="req">Start</label><span class="pv">07/11/2026 08:00</span></div>
        <div class="pf"><label class="req">Expiry</label><span class="pv">07/11/2026 12:00</span></div>
        <div class="pf"><label>Allowed IP addresses</label><span class="pv">203.0.113.10</span></div>
        <div class="pf"><label>Allowed protocols</label><span class="pv radio">HTTPS only</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn Account key thì có thêm Signing key (Key 1/Key 2) và Stored access policy. User delegation key yêu cầu bạn có role data plane, ví dụ Storage Blob Data Reader trở lên.</span></div>
        <div class="pbtns"><span class="pbtn primary">Generate SAS token and URL</span></div>
      </div>
    </li>
    <li>Sao chép <strong>Blob SAS URL</strong> (URL + token) để gửi cho người nhận. Portal chỉ hiển thị token một lần; nó không được lưu ở đâu cả.</li>
    <li>Kiểm tra: mở URL trong trình duyệt ẩn danh thì tải được file; sửa <code>sp=r</code> thành <code>sp=rw</code> trong URL thì nhận lỗi 403 do chữ ký <code>sig</code> không còn khớp.</li>
    <li>Account SAS: vào <span class="path">Storage account › Security + networking › Shared access signature</span>, chọn <strong>Allowed services</strong>, <strong>Allowed resource types</strong>, <strong>Allowed permissions</strong>, rồi <strong>Generate SAS and connection string</strong>.</li>
  </ol></div>
</div>

<h4>Role để tạo user delegation SAS</h4>
<p>Người tạo cần quyền <code>Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action</code>, có trong các role <strong>Storage Blob Data Contributor/Owner/Reader</strong> và <strong>Storage Blob Delegator</strong>.</p>

<div class="callout warn"><strong>Rủi ro của SAS</strong>SAS bị lộ thì ai cầm cũng dùng được tới khi hết hạn. Luôn dùng HTTPS, thời hạn ngắn, quyền tối thiểu. Xoay vòng account key sẽ vô hiệu hóa <strong>mọi</strong> service SAS và account SAS ký bằng key đó.</div>

<div class="callout exam"><strong>Góc thi</strong>"Cấp quyền tạm cho đối tác đọc một blob, an toàn nhất, không dùng account key" → <strong>user delegation SAS</strong>. "Cần SAS cho Queue hoặc Table" → không dùng được user delegation SAS, chọn <strong>service SAS</strong>. "Một SAS truy cập cả Blob và File" → <strong>account SAS</strong>.</div>
`
    },
    {
      id: 'sas-uri',
      unit: 'Identify URI and SAS parameters',
      title: 'Đọc SAS URI và tham số',
      html: `
<p>SAS URI = <strong>URL tài nguyên</strong> + <strong>SAS token</strong> (chuỗi query bắt đầu bằng <code>?</code>).</p>
<pre class="diagram">https://contososec.blob.core.windows.net/reports/q1.pdf
  ?sv=2022-11-02            ← signed version (phiên bản REST API)
  &amp;sr=b                     ← signed resource: b = blob (service SAS)
  &amp;sp=r                     ← permissions: read
  &amp;st=2026-11-07T08:00:00Z  ← start time (UTC)
  &amp;se=2026-11-07T12:00:00Z  ← expiry time (UTC)
  &amp;sip=203.0.113.10         ← IP / dải IP được phép
  &amp;spr=https                ← protocol: chỉ HTTPS
  &amp;sig=Xyz...%3D            ← chữ ký HMAC-SHA256</pre>

<h4>Bảng tham số</h4>
<table>
  <thead><tr><th>Tham số</th><th>Tên</th><th>Giá trị / ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><code>sv</code></td><td>signedVersion</td><td>Phiên bản Storage service dùng để xử lý request</td></tr>
    <tr><td><code>ss</code></td><td>signedServices (account SAS)</td><td><code>b</code> Blob, <code>f</code> File, <code>q</code> Queue, <code>t</code> Table (ví dụ <code>ss=bf</code>)</td></tr>
    <tr><td><code>srt</code></td><td>signedResourceTypes (account SAS)</td><td><code>s</code> service, <code>c</code> container, <code>o</code> object</td></tr>
    <tr><td><code>sr</code></td><td>signedResource (service SAS)</td><td><code>b</code> blob, <code>c</code> container, <code>bs</code> blob snapshot, <code>bv</code> blob version, <code>d</code> directory, <code>s</code> share, <code>f</code> file</td></tr>
    <tr><td><code>sp</code></td><td>signedPermissions</td><td><code>r</code> read, <code>a</code> add, <code>c</code> create, <code>w</code> write, <code>d</code> delete, <code>l</code> list, <code>u</code> update, <code>p</code> process…</td></tr>
    <tr><td><code>st</code></td><td>signedStart</td><td>Thời điểm bắt đầu (UTC, ISO 8601). Bỏ trống = có hiệu lực ngay</td></tr>
    <tr><td><code>se</code></td><td>signedExpiry</td><td>Thời điểm hết hạn (UTC) – <strong>bắt buộc</strong> nếu không dùng stored access policy</td></tr>
    <tr><td><code>sip</code></td><td>signedIp</td><td>IP hoặc dải IP được phép (ví dụ <code>168.1.5.60-168.1.5.70</code>)</td></tr>
    <tr><td><code>spr</code></td><td>signedProtocol</td><td><code>https</code> hoặc <code>https,http</code> (không có tùy chọn chỉ HTTP)</td></tr>
    <tr><td><code>si</code></td><td>signedIdentifier</td><td>Tên stored access policy được tham chiếu</td></tr>
    <tr><td><code>sig</code></td><td>signature</td><td>Chữ ký HMAC-SHA256 tính trên các trường trên</td></tr>
    <tr><td><code>skoid</code>, <code>sktid</code>, <code>skt</code>, <code>ske</code>, <code>sks</code>, <code>skv</code></td><td>Thông tin user delegation key</td><td>Chỉ có trong <strong>user delegation SAS</strong>: object ID, tenant ID, thời gian và phiên bản của key</td></tr>
  </tbody>
</table>

<h4>Nhận diện loại SAS từ URI</h4>
<ul>
  <li>Có <code>ss</code> và <code>srt</code> → <strong>account SAS</strong>.</li>
  <li>Có <code>sr</code>, không có <code>skoid</code> → <strong>service SAS</strong> (nếu có <code>si</code> → gắn stored access policy).</li>
  <li>Có <code>skoid</code>, <code>sktid</code>… → <strong>user delegation SAS</strong>.</li>
</ul>

<h4>Ví dụ account SAS</h4>
<pre><code>?sv=2022-11-02&amp;ss=bfqt&amp;srt=sco&amp;sp=rwdlacup&amp;se=2026-12-31T23:59:59Z&amp;st=2026-11-07T00:00:00Z&amp;spr=https&amp;sig=...</code></pre>
<p>Token trên cho toàn quyền (gần như) trên cả 4 dịch vụ, mọi loại tài nguyên, trong gần 2 tháng: một ví dụ về SAS <strong>quá rộng</strong> cần tránh.</p>

<div class="callout tip"><strong>Mẹo về thời gian</strong>Do lệch đồng hồ giữa các máy, nên đặt <code>st</code> lùi khoảng 15 phút so với hiện tại, hoặc bỏ trống để SAS có hiệu lực ngay.</div>

<div class="callout exam"><strong>Góc thi</strong>Đề hay đưa một SAS URI và hỏi "người dùng có thể làm gì / từ đâu / tới khi nào". Đọc lần lượt <code>sp</code> (quyền), <code>sip</code> (IP), <code>spr</code> (giao thức), <code>st</code>/<code>se</code> (thời gian). Ví dụ <code>spr=https</code> thì request qua HTTP bị từ chối; client có IP ngoài <code>sip</code> nhận lỗi 403.</div>
`
    },
    {
      id: 'encryption',
      unit: 'Determine Azure Storage encryption',
      title: 'Mã hóa dữ liệu trong Azure Storage',
      html: `
<h4>Storage Service Encryption (SSE) – mã hóa at rest</h4>
<ul>
  <li>Mọi dữ liệu ghi vào Azure Storage được mã hóa tự động bằng <strong>AES 256-bit</strong>, tuân thủ <strong>FIPS 140-2</strong>.</li>
  <li>Áp dụng cho mọi dịch vụ (Blob, Files, Queue, Table, disks), mọi tier, mọi redundancy, cả metadata.</li>
  <li><strong>Luôn bật, không tắt được</strong>, <strong>không tính phí</strong>, minh bạch với ứng dụng.</li>
</ul>

<h4>Lựa chọn quản lý key</h4>
<table>
  <thead><tr><th>Tùy chọn</th><th>Ai quản lý key</th><th>Lưu ở đâu</th><th>Dịch vụ hỗ trợ</th></tr></thead>
  <tbody>
    <tr><td><strong>Microsoft-managed keys</strong> (mặc định)</td><td>Microsoft (tạo, xoay vòng)</td><td>Hạ tầng Microsoft</td><td>Tất cả</td></tr>
    <tr><td><strong>Customer-managed keys (CMK)</strong></td><td>Khách hàng (tạo, xoay vòng, thu hồi, audit)</td><td><strong>Azure Key Vault</strong> hoặc <strong>Key Vault Managed HSM</strong></td><td>Blob, Files; Queue và Table chỉ khi account được tạo với encryption key type cấp account</td></tr>
    <tr><td><strong>Customer-provided keys</strong></td><td>Client gửi key trong từng request</td><td>Phía client (Azure không lưu key)</td><td>Chỉ Blob Storage</td></tr>
  </tbody>
</table>

<h4>Infrastructure encryption (mã hóa kép)</h4>
<ul>
  <li>Thêm lớp mã hóa thứ hai ở tầng hạ tầng, dùng key khác (luôn do Microsoft quản lý), cũng AES-256.</li>
  <li>Phải bật <strong>khi tạo account</strong> (<code>--require-infrastructure-encryption</code>), <strong>không bật/tắt sau</strong> được.</li>
  <li>Dành cho yêu cầu tuân thủ đòi hỏi double encryption.</li>
</ul>

<h4>Encryption scopes</h4>
<ul>
  <li>Quản lý mã hóa ở cấp <strong>container</strong> hoặc <strong>từng blob</strong>: mỗi scope dùng Microsoft-managed key hoặc một CMK riêng.</li>
  <li>Phù hợp cho môi trường <strong>multi-tenant</strong>: dữ liệu mỗi khách hàng mã hóa bằng key riêng trong cùng một account.</li>
  <li>Có thể đặt <strong>default scope</strong> cho container và buộc mọi blob trong container dùng scope đó.</li>
  <li>Blob dùng encryption scope không chuyển sang Archive bằng Set Blob Tier được.</li>
</ul>
<pre><code>az storage account encryption-scope create --account-name contososec -g rg-sec -n tenantA --key-source Microsoft.Storage
az storage container create --account-name contososec -n tenanta-data \\
  --default-encryption-scope tenantA --prevent-encryption-scope-override true --auth-mode login</code></pre>

<h4>Mã hóa in transit</h4>
<ul>
  <li>HTTPS (TLS 1.2+) cho REST; bật <em>Secure transfer required</em>.</li>
  <li>SMB 3.x có mã hóa cho Azure Files; NFS 4.1 hỗ trợ mã hóa in-transit bằng TLS qua công cụ AZNFS.</li>
  <li><strong>Client-side encryption</strong>: ứng dụng tự mã hóa trước khi gửi (SDK hỗ trợ).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Công ty yêu cầu tự kiểm soát và xoay vòng key mã hóa" → <strong>customer-managed key trong Key Vault</strong>. "Cần lớp mã hóa thứ hai cho account mới" → <strong>infrastructure encryption</strong> lúc tạo. "Mỗi khách hàng trong cùng container/account có key riêng" → <strong>encryption scopes</strong>. Không có tùy chọn "tắt mã hóa".</div>
`
    },
    {
      id: 'cmk',
      unit: 'Create customer-managed keys',
      title: 'Cấu hình customer-managed keys',
      html: `
<h4>Yêu cầu</h4>
<ul>
  <li><strong>Key Vault</strong> (hoặc Managed HSM) phải bật <strong>soft delete</strong> và <strong>purge protection</strong>.</li>
  <li>Key loại <strong>RSA</strong> hoặc <strong>RSA-HSM</strong>, kích thước <strong>2048, 3072 hoặc 4096</strong> bit.</li>
  <li>Storage account dùng một <strong>managed identity</strong> (system-assigned hoặc user-assigned) để truy cập key. Identity cần quyền <strong>get, wrapKey, unwrapKey</strong>: với Key Vault dùng RBAC, gán role <strong>Key Vault Crypto Service Encryption User</strong>.</li>
  <li>Khi cấu hình CMK lúc <strong>tạo mới</strong> account, phải dùng <strong>user-assigned managed identity</strong> (system-assigned chưa tồn tại trước khi account được tạo).</li>
  <li>Key Vault có thể ở region hoặc subscription khác với storage account (cùng tenant; cross-tenant cần cấu hình multi-tenant application).</li>
</ul>

<h4>Các bước (account đã tồn tại)</h4>
<ol class="steps">
  <li>Tạo Key Vault với soft delete + purge protection, tạo key RSA.</li>
  <li>Bật system-assigned managed identity cho storage account (hoặc gán user-assigned identity).</li>
  <li>Gán role <em>Key Vault Crypto Service Encryption User</em> cho identity đó trên key vault hoặc key.</li>
  <li>Storage account → <strong>Encryption</strong> → Encryption type: <em>Customer-managed keys</em> → chọn key vault và key (hoặc nhập Key URI) → chọn identity → Save.</li>
</ol>
<pre><code>az keyvault create -n kv-contoso -g rg-sec -l eastus --enable-purge-protection true
az keyvault key create --vault-name kv-contoso -n storage-cmk --kty RSA --size 3072

az storage account update -n contososec -g rg-sec --assign-identity
principalId=$(az storage account show -n contososec -g rg-sec --query identity.principalId -o tsv)
az role assignment create --assignee-object-id $principalId --assignee-principal-type ServicePrincipal \\
  --role "Key Vault Crypto Service Encryption User" \\
  --scope $(az keyvault show -n kv-contoso --query id -o tsv)

az storage account update -n contososec -g rg-sec \\
  --encryption-key-source Microsoft.Keyvault \\
  --encryption-key-vault https://kv-contoso.vault.azure.net \\
  --encryption-key-name storage-cmk</code></pre>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 262" role="img" aria-label="Customer-managed key trong Key Vault bọc account encryption key; storage account dùng managed identity để gọi wrapKey và unwrapKey">
  <rect class="box-w" x="10" y="12" width="290" height="240" rx="12"/>
  <text x="155" y="36" text-anchor="middle" class="t-b t-w">Storage account</text>
  <rect class="box" x="30" y="52" width="250" height="48" rx="8"/>
  <text x="155" y="73" text-anchor="middle" class="t-b">Dữ liệu</text>
  <text x="155" y="91" text-anchor="middle" class="t-sm t-mute">blob · file · queue · table</text>
  <rect class="box-s" x="30" y="128" width="250" height="44" rx="8"/>
  <text x="155" y="155" text-anchor="middle" class="t-b">Account encryption key</text>
  <rect class="box-a" x="30" y="194" width="250" height="44" rx="8"/>
  <text x="155" y="213" text-anchor="middle" class="t-b">Managed identity</text>
  <text x="155" y="230" text-anchor="middle" class="t-sm t-mute">system- hoặc user-assigned</text>
  <line class="ln-s" x1="80" y1="128" x2="80" y2="104" marker-end="url(#arr-s)"/>
  <text x="90" y="120" class="t-sm t-s">mã hóa AES-256</text>

  <rect class="box-e" x="420" y="12" width="290" height="240" rx="12"/>
  <text x="565" y="36" text-anchor="middle" class="t-b">Azure Key Vault</text>
  <text x="565" y="54" text-anchor="middle" class="t-sm t-mute">soft delete + purge protection</text>
  <rect class="box" x="440" y="128" width="250" height="44" rx="8"/>
  <text x="565" y="147" text-anchor="middle" class="t-b">Customer-managed key</text>
  <text x="565" y="164" text-anchor="middle" class="t-sm t-mute">RSA 2048 / 3072 / 4096</text>
  <text x="565" y="206" text-anchor="middle" class="t-sm t-mute">role: Key Vault Crypto</text>
  <text x="565" y="223" text-anchor="middle" class="t-sm t-mute">Service Encryption User</text>

  <line class="ln-a" x1="440" y1="150" x2="284" y2="150" marker-end="url(#arr-a)"/>
  <text x="360" y="142" text-anchor="middle" class="t-sm t-a">wrap AEK</text>
  <line class="ln-s" x1="280" y1="216" x2="416" y2="216" marker-end="url(#arr-s)"/>
  <text x="358" y="208" text-anchor="middle" class="t-sm t-s">wrap/unwrap</text>
</svg>
<figcaption>Hình 1. Envelope encryption: dữ liệu được mã hóa bằng account encryption key (AEK); với CMK, AEK được bọc bằng key RSA của bạn trong Key Vault, truy cập qua managed identity. Xoay vòng CMK chỉ bọc lại AEK, không mã hóa lại dữ liệu. Với Microsoft-managed keys, khối Key Vault do Microsoft giữ và bạn không thấy.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: chuyển account sang customer-managed key</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Chuẩn bị: Key Vault đã bật purge protection, có key RSA; identity sẽ dùng đã được gán role <strong>Key Vault Crypto Service Encryption User</strong> trên key vault.</li>
    <li>Mở trang Encryption của storage account:<br><span class="path">Storage account › Security + networking › Encryption</span></li>
    <li>Chọn <strong>Customer-managed keys</strong> và chỉ định key:
      <div class="blade">
        <div class="blade-title">contososec | Encryption</div>
        <div class="blade-tabs"><span class="on">Encryption</span><span>Encryption scopes</span></div>
        <div class="blade-sec">Encryption selection</div>
        <div class="pf"><label>Encryption type</label><span class="pv radio">Customer-managed keys</span></div>
        <div class="blade-sec">Key selection</div>
        <div class="pf"><label>Encryption key</label><span class="pv radio">Select from key vault</span></div>
        <div class="pf"><label></label><span class="pv">Enter key URI</span></div>
        <div class="pf"><label></label><span class="pv">Select a key vault and key → kv-contoso / storage-cmk</span></div>
        <div class="pf"><label>Identity type</label><span class="pv radio">System-assigned</span></div>
        <div class="pf"><label></label><span class="pv">User-assigned</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn key qua key vault (không ghi version) = tự động dùng version mới nhất. Nhập Key URI có version = phải tự cập nhật khi xoay key.</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Sau khi lưu, trang Encryption hiển thị key đang dùng, trạng thái <em>Automated key rotation</em> và identity (Hình 2). Muốn quay lại, đổi <strong>Encryption type</strong> về <em>Microsoft-managed keys</em>.</li>
  </ol>
  <figure class="fig"><img src="assets/img/p4m3/cmk-auto-rotation.png" alt="Trang Encryption của storage account sau khi bật customer-managed keys: Current key, Automated key rotation Enabled, Key version in use, Identity type System-assigned" loading="lazy"><figcaption>Hình 2. Account đã dùng CMK với tự động cập nhật version: portal hiện Current key, Automated key rotation, Key version in use và managed identity. Nguồn: <a href="https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-configure-existing-account" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>
  </div>
</div>

<h4>Xoay vòng key</h4>
<ul>
  <li><strong>Tự động</strong>: không chỉ định key version → Azure Storage định kỳ kiểm tra và tự dùng phiên bản mới nhất (kết hợp với rotation policy của Key Vault).</li>
  <li><strong>Thủ công</strong>: chỉ định key version cụ thể → khi tạo version mới phải tự cập nhật cấu hình account.</li>
  <li>Xoay key <strong>không mã hóa lại</strong> dữ liệu; chỉ mã hóa lại <em>account encryption key</em> (envelope encryption) nên nhanh và không gián đoạn.</li>
</ul>

<h4>Thu hồi quyền truy cập</h4>
<p>Vô hiệu hóa/xóa key, hoặc gỡ quyền của managed identity → storage account <strong>không đọc/ghi dữ liệu được</strong> (lỗi 403). Khôi phục quyền hoặc key (nhờ soft delete) để truy cập lại. Đây là cách "crypto-shredding" khi cần.</p>

<div class="callout warn"><strong>Cẩn thận</strong>Nếu key bị xóa vĩnh viễn (purge), dữ liệu không thể khôi phục. Đó là lý do bắt buộc purge protection.</div>

<div class="callout exam"><strong>Góc thi</strong>"Cấu hình CMK báo lỗi" → kiểm tra Key Vault đã bật <strong>soft delete và purge protection</strong>, key có phải RSA không, identity có quyền <em>wrapKey/unwrapKey</em> không. "Muốn tự dùng phiên bản key mới khi xoay vòng" → <strong>không chỉ định key version</strong>.</div>
`
    },
    {
      id: 'best-practices',
      unit: 'Apply Azure Storage security best practices',
      title: 'Best practice bảo mật Azure Storage',
      html: `
<h4>Danh sách kiểm tra</h4>
<table>
  <thead><tr><th>Lĩnh vực</th><th>Khuyến nghị</th></tr></thead>
  <tbody>
    <tr><td>Danh tính</td><td>Dùng <strong>Microsoft Entra ID + RBAC</strong>, managed identity cho ứng dụng. Cân nhắc <strong>tắt Shared Key</strong>.</td></tr>
    <tr><td>SAS</td><td>Ưu tiên <strong>user delegation SAS</strong>; thời hạn ngắn; quyền tối thiểu; <code>spr=https</code>; giới hạn IP; dùng stored access policy cho service SAS.</td></tr>
    <tr><td>Access key</td><td>Lưu trong <strong>Key Vault</strong>, không hard-code; xoay vòng định kỳ; đặt <strong>key expiration policy</strong> để nhắc xoay vòng.</td></tr>
    <tr><td>Chính sách hết hạn SAS</td><td>Đặt <strong>SAS expiration policy</strong> trên account để giới hạn thời hạn tối đa. Expiration action: <strong>Log</strong> (mặc định, SAS vượt mức vẫn dùng được nhưng bị ghi log) hoặc <strong>Block</strong> (từ chối request dùng SAS vượt mức).</td></tr>
    <tr><td>Mạng</td><td>Firewall default Deny, private endpoint, tắt public network access khi có thể.</td></tr>
    <tr><td>Giao thức</td><td>Secure transfer required, minimum TLS 1.2.</td></tr>
    <tr><td>Bảo vệ dữ liệu</td><td>Soft delete (blob, container, file share), versioning, resource lock <code>CanNotDelete</code> trên account.</td></tr>
    <tr><td>Giám sát</td><td>Microsoft Defender for Storage, diagnostic logs gửi tới Log Analytics, Azure Monitor alert.</td></tr>
    <tr><td>Quản trị</td><td>Azure Policy: chặn anonymous access, bắt buộc TLS 1.2, bắt buộc private endpoint, kiểm tra CMK.</td></tr>
  </tbody>
</table>

<h4>Xoay vòng access key không gián đoạn</h4>
<ol class="steps">
  <li>Cập nhật mọi ứng dụng dùng <strong>key2</strong> (hoặc connection string của key2) – tốt nhất qua Key Vault.</li>
  <li>Regenerate <strong>key1</strong>.</li>
  <li>Chuyển ứng dụng sang key1 mới.</li>
  <li>Regenerate <strong>key2</strong>.</li>
</ol>
<pre><code>az storage account keys renew -g rg-sec -n contososec --key key1
New-AzStorageAccountKey -ResourceGroupName rg-sec -Name contososec -KeyName key1

# Key expiration policy: nhắc xoay vòng sau 90 ngày
az storage account update -n contososec -g rg-sec --key-expiration-period-in-days 90

# SAS expiration policy: tối đa 1 ngày 12 giờ (định dạng ngày.giờ:phút:giây)
az storage account update -n contososec -g rg-sec --sas-expiration-period 1.12:00:00 --sas-expiration-action Block</code></pre>

<h4>Các tình huống thường gặp</h4>
<ul>
  <li>Ứng dụng web trên App Service cần đọc blob → bật <strong>managed identity</strong> cho App Service, gán <strong>Storage Blob Data Reader</strong> ở scope container. Không cần secret.</li>
  <li>Lộ account key trên GitHub → <strong>regenerate key</strong> ngay (mọi SAS ký bằng key đó cũng mất hiệu lực), rồi điều tra log.</li>
  <li>Người dùng ngoài tổ chức cần upload vào một container trong 24 giờ → SAS với quyền <code>c</code>/<code>w</code> trên container, hết hạn sau 24 giờ, HTTPS.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Thứ tự xoay vòng key đúng là: <strong>chuyển app sang key2 → regenerate key1</strong>. Regenerate key đang được dùng trước sẽ làm ứng dụng gián đoạn.</div>
`
    },
    {
      id: 'exercise-manage-storage',
      unit: 'Exercise: Manage Azure Storage',
      title: 'Thực hành: quản lý và bảo mật storage',
      html: `
<p>Kịch bản: tạo storage cho ứng dụng nội bộ, chỉ cho phép truy cập có kiểm soát, cấp quyền tạm thời bằng SAS và bảo vệ dữ liệu bằng mạng.</p>
<ol class="steps">
  <li>Tạo storage account Standard GPv2 (LRS). Trong <strong>Advanced</strong>: bật <em>Require secure transfer</em>, đặt minimum TLS 1.2, tắt <em>Allow Blob anonymous access</em>.</li>
  <li>Tạo container <code>private</code> (Private, không anonymous access) và upload một file.</li>
  <li>Thử mở URL của blob trong trình duyệt: nhận lỗi <strong>ResourceNotFound/PublicAccessNotPermitted</strong> do không có quyền.</li>
  <li>Chọn blob → <strong>Generate SAS</strong>: chọn signing method, quyền <em>Read</em>, thời hạn 24 giờ, giao thức HTTPS only → <em>Generate SAS token and URL</em>.</li>
  <li>Mở <strong>Blob SAS URL</strong> trong trình duyệt: tải được file. Quan sát các tham số <code>sp</code>, <code>st</code>, <code>se</code>, <code>spr</code>, <code>sig</code>.</li>
  <li>Gán cho tài khoản của bạn role <strong>Storage Blob Data Reader</strong> trên container, rồi đổi <em>Authentication method</em> trong Storage browser sang <em>Microsoft Entra user account</em> để duyệt dữ liệu không cần key.</li>
  <li>Trong <strong>Networking</strong>, chọn <em>Enabled from selected virtual networks and IP addresses</em>, thêm public IP của máy bạn; kiểm tra truy cập từ mạng khác bị chặn.</li>
  <li>Thêm <strong>lifecycle rule</strong> chuyển blob sang Cool sau 30 ngày không sửa đổi để tối ưu chi phí.</li>
</ol>

<div class="callout tip"><strong>Quan sát</strong>Nếu bạn là Owner của account, portal có thể duyệt dữ liệu bằng <em>Access key</em> mà không cần role data plane. Khi đặt <em>Default to Microsoft Entra authorization</em> hoặc tắt Shared Key, chỉ role data plane mới cho xem dữ liệu.</div>
`
    },
    {
      id: 'stored-access-policy',
      extra: true,
      title: 'Stored access policy',
      html: `
<p><strong>Stored access policy</strong> là chính sách được lưu <strong>phía server</strong> trên một container, file share, queue hoặc table. Service SAS tham chiếu tới policy qua tham số <code>si</code> và kế thừa thời gian và/hoặc quyền từ policy.</p>

<h4>Đặc điểm</h4>
<ul>
  <li>Tối đa <strong>5 stored access policy</strong> trên mỗi container, file share, queue hoặc table.</li>
  <li>Policy định nghĩa <strong>start time</strong>, <strong>expiry time</strong>, <strong>permissions</strong>. Một trường chỉ được khai báo ở policy <em>hoặc</em> ở SAS, không cả hai.</li>
  <li>Chỉ dùng với <strong>service SAS</strong>. Không dùng được với account SAS hay user delegation SAS.</li>
  <li>Thay đổi policy có thể mất tới <strong>30 giây</strong> để có hiệu lực.</li>
</ul>

<h4>Thu hồi SAS bằng stored access policy</h4>
<ul>
  <li><strong>Xóa</strong> policy → mọi SAS tham chiếu tới nó lập tức không còn hiệu lực.</li>
  <li><strong>Đổi expiry</strong> về quá khứ → SAS hết hạn.</li>
  <li><strong>Đổi tên</strong> signed identifier → SAS cũ không còn khớp.</li>
  <li>Không cần xoay vòng account key, nên không ảnh hưởng ứng dụng khác.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Hai SAS tham chiếu stored access policy bị vô hiệu khi xóa policy; SAS ad hoc chỉ bị hủy khi regenerate account key">
  <rect class="box" x="10" y="26" width="190" height="50" rx="8"/>
  <text x="105" y="56" text-anchor="middle">SAS A: si=partner-read</text>
  <rect class="box" x="10" y="96" width="190" height="50" rx="8"/>
  <text x="105" y="126" text-anchor="middle">SAS B: si=partner-read</text>
  <rect class="box" x="10" y="176" width="190" height="50" rx="8"/>
  <text x="105" y="206" text-anchor="middle">SAS C: ad hoc (sp, se)</text>

  <rect class="zone" x="250" y="12" width="220" height="148" rx="12"/>
  <text x="360" y="34" text-anchor="middle" class="t-sm t-b">Container: reports</text>
  <rect class="box-e" x="270" y="52" width="180" height="56" rx="8"/>
  <text x="360" y="75" text-anchor="middle" class="t-b">Stored access policy</text>
  <text x="360" y="95" text-anchor="middle" class="t-sm t-mute">partner-read · rl · 31/12</text>
  <text x="360" y="140" text-anchor="middle" class="t-sm t-mute">tối đa 5 policy / container</text>

  <line class="ln" x1="200" y1="51" x2="266" y2="72" marker-end="url(#arr)"/>
  <line class="ln" x1="200" y1="121" x2="266" y2="92" marker-end="url(#arr)"/>

  <rect class="box-x" x="510" y="40" width="200" height="60" rx="10"/>
  <text x="610" y="65" text-anchor="middle" class="t-b">Xóa / sửa policy</text>
  <text x="610" y="85" text-anchor="middle" class="t-sm">SAS A, B mất hiệu lực</text>
  <line class="ln-x" x1="450" y1="80" x2="506" y2="72" marker-end="url(#arr-x)"/>

  <rect class="box-w" x="510" y="166" width="200" height="60" rx="10"/>
  <text x="610" y="191" text-anchor="middle" class="t-b">SAS C vẫn dùng được</text>
  <text x="610" y="211" text-anchor="middle" class="t-sm">phải regenerate account key</text>
  <line class="ln dash" x1="200" y1="201" x2="506" y2="196" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. SAS A và B chỉ chứa tham chiếu <code>si=partner-read</code>, quyền và thời hạn nằm ở policy phía server; xóa hoặc sửa policy là thu hồi được ngay (hiệu lực trong khoảng 30 giây). SAS C ad hoc mang quyền và thời hạn trong token, nên muốn hủy trước hạn phải regenerate account key đã ký, kéo theo mọi SAS khác dùng key đó.</figcaption>
</figure>

<pre><code># Tạo policy chỉ đọc + liệt kê, hết hạn cuối năm
az storage container policy create --account-name contososec -c reports \\
  -n partner-read --permissions rl --expiry 2026-12-31T23:59Z --account-key &lt;key&gt;

# Tạo SAS tham chiếu policy (không chỉ định lại quyền/thời gian)
az storage container generate-sas --account-name contososec -n reports \\
  --policy-name partner-read --account-key &lt;key&gt;

# Thu hồi: xóa policy
az storage container policy delete --account-name contososec -c reports -n partner-read --account-key &lt;key&gt;

# PowerShell
New-AzStorageContainerStoredAccessPolicy -Container reports -Policy partner-read -Permission rl -ExpiryTime (Get-Date).AddDays(30) -Context $ctx
New-AzStorageContainerSASToken -Name reports -Policy partner-read -Context $ctx</code></pre>

<h4>So sánh các cách thu hồi SAS</h4>
<table>
  <thead><tr><th>Loại SAS</th><th>Cách thu hồi trước hạn</th><th>Ảnh hưởng phụ</th></tr></thead>
  <tbody>
    <tr><td>Service SAS gắn stored access policy</td><td>Xóa/sửa policy</td><td>Chỉ các SAS dùng policy đó</td></tr>
    <tr><td>Service SAS / Account SAS ad hoc</td><td>Regenerate account key đã ký</td><td>Mọi SAS và ứng dụng dùng key đó</td></tr>
    <tr><td>User delegation SAS</td><td>Thu hồi mọi user delegation key (<code>az storage account revoke-delegation-keys</code>) hoặc gỡ RBAC của người tạo</td><td>Mọi user delegation SAS của account (khi revoke keys)</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Cần thu hồi SAS đã cấp cho đối tác mà không ảnh hưởng ứng dụng khác" → dùng <strong>stored access policy</strong> (lẽ ra phải tạo SAS gắn policy từ đầu). "Container đã có 5 policy, cần thêm policy thứ 6" → không được, phải xóa bớt.</div>
`
    },
    {
      id: 'entra-data-roles',
      extra: true,
      title: 'Phân quyền bằng Microsoft Entra ID (data plane roles)',
      html: `
<p>Azure RBAC tách biệt <strong>management plane</strong> (quản lý tài nguyên storage account: tạo, xóa, cấu hình) và <strong>data plane</strong> (đọc/ghi dữ liệu bên trong: blob, message, entity).</p>

<div class="compare">
  <div><strong>Management plane</strong>Owner, Contributor, Reader, <strong>Storage Account Contributor</strong>. Không trực tiếp cho quyền dữ liệu qua Entra ID. Tuy nhiên Owner/Contributor/Storage Account Contributor có quyền <code>listKeys</code> → lấy được access key → truy cập dữ liệu bằng Shared Key.</div>
  <div><strong>Data plane</strong>Các role <em>Storage ... Data ...</em>. Cho quyền dữ liệu qua token Entra ID. <strong>Không</strong> cho quyền quản lý account (đổi redundancy, firewall…).</div>
</div>

<h4>Các role data plane quan trọng</h4>
<table>
  <thead><tr><th>Role</th><th>Quyền</th></tr></thead>
  <tbody>
    <tr><td><strong>Storage Blob Data Reader</strong></td><td>Đọc và liệt kê container, blob</td></tr>
    <tr><td><strong>Storage Blob Data Contributor</strong></td><td>Đọc, ghi, xóa container và blob</td></tr>
    <tr><td><strong>Storage Blob Data Owner</strong></td><td>Toàn quyền, gồm quản lý <strong>POSIX ACL</strong> trên Data Lake Storage Gen2</td></tr>
    <tr><td><strong>Storage Blob Delegator</strong></td><td>Lấy user delegation key để tạo user delegation SAS</td></tr>
    <tr><td><strong>Storage Queue Data Reader / Contributor</strong></td><td>Đọc / đọc-ghi-xóa queue và message</td></tr>
    <tr><td><strong>Storage Queue Data Message Sender / Processor</strong></td><td>Chỉ gửi message / đọc và xóa (xử lý) message</td></tr>
    <tr><td><strong>Storage Table Data Reader / Contributor</strong></td><td>Đọc / đọc-ghi-xóa table và entity</td></tr>
    <tr><td><strong>Storage File Data SMB Share Reader / Contributor / Elevated Contributor</strong></td><td>Quyền share-level trên Azure Files qua SMB (Elevated cho phép sửa NTFS ACL)</td></tr>
    <tr><td><strong>Storage File Data Privileged Reader / Contributor</strong></td><td>Truy cập Azure Files qua REST/OAuth, bỏ qua NTFS ACL (dành cho admin/công cụ)</td></tr>
    <tr><td><strong>Reader and Data Access</strong></td><td>Xem tài nguyên + <strong>list keys</strong> (truy cập dữ liệu bằng key, thường dùng trong portal)</td></tr>
  </tbody>
</table>

<h4>Scope gán role</h4>
<p>Management group → subscription → resource group → storage account → <strong>container</strong> (hoặc queue, table, file share). Gán ở scope hẹp nhất có thể. Lưu ý: không gán role data plane ở cấp từng blob được (dùng ACL của Data Lake cho cấp file/thư mục).</p>
<pre><code>az role assignment create --assignee user1@contoso.com \\
  --role "Storage Blob Data Contributor" \\
  --scope "/subscriptions/&lt;sub&gt;/resourceGroups/rg-sec/providers/Microsoft.Storage/storageAccounts/contososec/blobServices/default/containers/reports"

New-AzRoleAssignment -SignInName user1@contoso.com -RoleDefinitionName "Storage Blob Data Reader" -Scope $containerScope</code></pre>

<h4>Portal: Access key hay Microsoft Entra user account?</h4>
<p>Khi duyệt dữ liệu trong portal, nếu bạn có quyền <code>listKeys</code>, portal mặc định dùng access key. Nếu không, hoặc khi chuyển sang <em>Microsoft Entra user account</em>, bạn cần role data plane. Người chỉ có <strong>Reader</strong> thấy được account nhưng <strong>không xem được blob</strong>.</p>

<div class="callout exam"><strong>Góc thi</strong>"User có role Contributor nhưng ứng dụng dùng Entra ID không đọc được blob" → thiếu <strong>Storage Blob Data Reader/Contributor</strong>. "Cấp quyền quản lý ACL trên Data Lake" → <strong>Storage Blob Data Owner</strong>. "Ứng dụng chỉ cần gửi message vào queue" → <strong>Storage Queue Data Message Sender</strong> (least privilege).</div>
`
    }
  ],
  keyFacts: [
    'Microsoft khuyến nghị ủy quyền bằng <strong>Microsoft Entra ID</strong>; Shared Key cho toàn quyền trên toàn account.',
    'Ba loại SAS: <strong>user delegation</strong> (ký bằng Entra, chỉ Blob/Data Lake, an toàn nhất), <strong>service</strong> (1 dịch vụ, account key), <strong>account</strong> (nhiều dịch vụ, account key).',
    'User delegation key có hiệu lực tối đa <strong>7 ngày</strong>.',
    'Tham số SAS: <code>sv</code> version, <code>ss</code> services, <code>srt</code> resource types, <code>sp</code> permissions, <code>st</code>/<code>se</code> start/expiry, <code>sip</code> IP, <code>spr</code> protocol, <code>sig</code> signature, <code>si</code> stored policy.',
    'Tối đa <strong>5 stored access policy</strong> mỗi container/share/queue/table; chỉ dùng với <strong>service SAS</strong>.',
    'Regenerate account key vô hiệu hóa mọi service SAS và account SAS ký bằng key đó.',
    '<code>AllowSharedKeyAccess = false</code> chặn Shared Key, account SAS và service SAS; user delegation SAS vẫn hoạt động.',
    'SSE mã hóa mọi dữ liệu bằng <strong>AES-256</strong>, luôn bật, không tắt được, miễn phí.',
    'CMK: Key Vault/Managed HSM phải bật <strong>soft delete + purge protection</strong>; key RSA/RSA-HSM 2048/3072/4096; identity cần get, wrapKey, unwrapKey.',
    '<strong>Infrastructure encryption</strong> chỉ bật được khi tạo account; <strong>encryption scope</strong> cho phép key riêng theo container/blob.',
    'Role data plane: Storage Blob Data <strong>Reader</strong> (đọc), <strong>Contributor</strong> (đọc/ghi/xóa), <strong>Owner</strong> (thêm quản lý POSIX ACL).'
  ],
  traps: [
    'Nghĩ role <strong>Owner/Contributor</strong> cho quyền đọc blob qua Entra ID. Cần role data plane; Owner chỉ truy cập dữ liệu gián tiếp qua access key.',
    'Chọn user delegation SAS cho Queue, Table hoặc Files. User delegation SAS chỉ hỗ trợ <strong>Blob Storage</strong>.',
    'Gắn stored access policy cho account SAS. Stored access policy chỉ dùng với <strong>service SAS</strong>.',
    'Regenerate key1 khi ứng dụng vẫn đang dùng key1. Phải chuyển ứng dụng sang key2 <strong>trước</strong>.',
    'Bật CMK trên Key Vault chưa bật <strong>purge protection</strong>: cấu hình bị từ chối.',
    'Tưởng có thể bật infrastructure encryption cho account đã tồn tại. Chỉ bật được <strong>khi tạo</strong>.',
    'Cho rằng <code>spr</code> có thể là chỉ <code>http</code>. Giá trị hợp lệ là <code>https</code> hoặc <code>https,http</code>.',
    'Tắt Shared Key rồi ngạc nhiên vì các service SAS cũ ngừng hoạt động.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Chủ đề</th><th>Cần nhớ</th></tr></thead>
  <tbody>
    <tr><td>Ủy quyền</td><td>Entra ID (khuyến nghị) · Shared Key · SAS · Anonymous</td></tr>
    <tr><td>User delegation SAS</td><td>Ký bằng Entra, chỉ Blob/Data Lake, key ≤ 7 ngày</td></tr>
    <tr><td>Service SAS</td><td>1 dịch vụ, account key, dùng được stored access policy (<code>si</code>)</td></tr>
    <tr><td>Account SAS</td><td>Nhiều dịch vụ (<code>ss</code>), loại tài nguyên (<code>srt</code>), account key</td></tr>
    <tr><td>Tham số</td><td><code>sp</code> quyền · <code>st</code>/<code>se</code> thời gian · <code>sip</code> IP · <code>spr</code> https · <code>sig</code> chữ ký</td></tr>
    <tr><td>Stored access policy</td><td>Tối đa 5/container; thu hồi bằng xóa/sửa policy</td></tr>
    <tr><td>Xoay key</td><td>App sang key2 → renew key1 → app sang key1 → renew key2</td></tr>
    <tr><td>SSE</td><td>AES-256, FIPS 140-2, luôn bật, miễn phí</td></tr>
    <tr><td>CMK</td><td>Key Vault + soft delete + purge protection; RSA; managed identity</td></tr>
    <tr><td>Infra encryption</td><td>Mã hóa kép, chỉ bật khi tạo account</td></tr>
    <tr><td>Data roles</td><td>Storage Blob Data Reader / Contributor / Owner; Delegator</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Phương thức ủy quyền Microsoft khuyến nghị cho Blob?', back: '<strong>Microsoft Entra ID</strong> + Azure RBAC (managed identity cho ứng dụng).' },
    { front: 'Ba loại SAS?', back: '<strong>User delegation SAS</strong>, <strong>service SAS</strong>, <strong>account SAS</strong>.' },
    { front: 'SAS nào an toàn nhất và chỉ dùng cho dịch vụ nào?', back: '<strong>User delegation SAS</strong>, ký bằng thông tin Entra ID; chỉ Blob Storage (và Data Lake).' },
    { front: 'Tham số <code>srt</code> và <code>ss</code> xuất hiện ở loại SAS nào?', back: '<strong>Account SAS</strong>: <code>ss</code> = dịch vụ (b,f,q,t), <code>srt</code> = loại tài nguyên (s,c,o).' },
    { front: 'Ý nghĩa <code>sip</code> và <code>spr</code>?', back: '<code>sip</code>: IP/dải IP được phép. <code>spr</code>: giao thức (<code>https</code> hoặc <code>https,http</code>).' },
    { front: 'Tham số nào là chữ ký của SAS?', back: '<code>sig</code> (HMAC-SHA256).' },
    { front: 'Số stored access policy tối đa trên một container?', back: '<strong>5</strong>.' },
    { front: 'Cách thu hồi service SAS ad hoc trước hạn?', back: '<strong>Regenerate account key</strong> đã dùng để ký (ảnh hưởng mọi SAS ký bằng key đó).' },
    { front: 'Thuật toán SSE dùng?', back: '<strong>AES 256-bit</strong>, FIPS 140-2; luôn bật, không tắt được.' },
    { front: 'Yêu cầu Key Vault cho CMK?', back: 'Bật <strong>soft delete</strong> và <strong>purge protection</strong>; key RSA/RSA-HSM 2048/3072/4096.' },
    { front: 'Role Key Vault cho managed identity của storage account khi dùng CMK?', back: '<strong>Key Vault Crypto Service Encryption User</strong> (quyền get, wrapKey, unwrapKey).' },
    { front: 'Infrastructure encryption bật lúc nào?', back: 'Chỉ <strong>khi tạo</strong> storage account; không bật/tắt sau được.' },
    { front: 'Encryption scope dùng để làm gì?', back: 'Dùng key riêng ở cấp <strong>container hoặc blob</strong>, ví dụ tách key theo từng khách hàng.' },
    { front: 'Khác nhau giữa Storage Blob Data Contributor và Owner?', back: 'Owner có thêm quyền quản lý <strong>POSIX ACL</strong> (Data Lake Storage Gen2) và toàn quyền dữ liệu.' },
    { front: 'Tắt AllowSharedKeyAccess ảnh hưởng SAS nào?', back: 'Account SAS và service SAS ngừng hoạt động; <strong>user delegation SAS</strong> vẫn dùng được.' },
    { front: 'Quy trình xoay vòng access key?', back: 'App dùng key2 → regenerate key1 → app dùng key1 → regenerate key2.' }
  ],
  quiz: [
    {
      q: 'Đối tác cần đọc một blob trong 4 giờ. Chính sách bảo mật cấm dùng access key của storage account để ký bất kỳ token nào. Bạn nên cấp gì?',
      options: ['Account SAS', 'Service SAS', 'User delegation SAS', 'Chia sẻ connection string'],
      answer: [2],
      explain: 'User delegation SAS được ký bằng user delegation key lấy qua Microsoft Entra ID, không dùng account key. Account SAS và service SAS đều ký bằng account key. Connection string chứa chính account key.'
    },
    {
      q: 'Bạn cần cấp cho một ứng dụng SAS truy cập cả Blob và Azure Files trong cùng storage account bằng một token duy nhất. Bạn dùng loại SAS nào?',
      options: ['Account SAS', 'Service SAS', 'User delegation SAS', 'Stored access policy'],
      answer: [0],
      explain: 'Account SAS có thể bao gồm nhiều dịch vụ qua tham số <code>ss</code>. Service SAS chỉ cho một dịch vụ. User delegation SAS chỉ cho Blob. Stored access policy không phải là SAS mà là chính sách đi kèm service SAS.'
    },
    {
      q: 'Bạn nhận được SAS URI chứa <code>sp=rl&amp;spr=https&amp;sip=203.0.113.0-203.0.113.255&amp;se=2026-11-10T00:00:00Z</code>. Người dùng có IP 203.0.113.50 truy cập qua HTTPS vào ngày 2026-11-08. Họ làm được gì? (Chọn 2)',
      options: ['Đọc blob', 'Ghi đè blob', 'Liệt kê blob', 'Xóa blob'],
      answer: [0, 2],
      explain: '<code>sp=rl</code> nghĩa là read và list. IP nằm trong dải <code>sip</code>, giao thức là HTTPS và thời điểm trước <code>se</code> nên request hợp lệ. Không có quyền <code>w</code> hay <code>d</code> nên không ghi hoặc xóa được.'
    },
    {
      q: 'Bạn đã phát hành hàng trăm service SAS cho container <code>invoices</code>, tất cả tham chiếu stored access policy <code>vendor</code>. Một SAS bị lộ. Bạn cần vô hiệu hóa các SAS này ngay mà không ảnh hưởng tới ứng dụng khác dùng access key. Bạn làm gì?',
      options: ['Regenerate key1 và key2', 'Đặt AllowSharedKeyAccess = false', 'Xóa container invoices', 'Xóa hoặc sửa expiry của stored access policy vendor'],
      answer: [3],
      explain: 'Xóa hoặc đặt expiry về quá khứ của stored access policy sẽ vô hiệu hóa mọi SAS tham chiếu nó, không đụng tới access key. Regenerate key hay tắt Shared Key ảnh hưởng mọi ứng dụng dùng key. Xóa container làm mất dữ liệu.'
    },
    {
      q: 'Container <code>data</code> đã có 5 stored access policy. Bạn cần thêm một policy mới cho đối tác khác. Bạn nên làm gì?',
      options: ['Tạo thêm policy thứ 6', 'Xóa một policy không dùng rồi tạo policy mới', 'Chuyển sang account SAS gắn policy', 'Tạo policy ở cấp storage account'],
      answer: [1],
      explain: 'Mỗi container chỉ có tối đa 5 stored access policy nên phải xóa bớt một policy. Account SAS không hỗ trợ stored access policy. Không có stored access policy ở cấp account.'
    },
    {
      q: 'Công ty yêu cầu tự quản lý và xoay vòng key dùng để mã hóa dữ liệu at rest trong storage account. Bạn cần cấu hình gì? (Chọn 2)',
      options: ['Customer-managed key lưu trong Azure Key Vault', 'Key Vault có bật soft delete và purge protection', 'Infrastructure encryption trên account đang chạy', 'Tắt Storage Service Encryption để dùng client-side encryption'],
      answer: [0, 1],
      explain: 'CMK trong Key Vault cho phép tự quản lý và xoay vòng key; Key Vault bắt buộc bật soft delete và purge protection. Infrastructure encryption chỉ bật được khi tạo account và vẫn dùng key Microsoft. SSE không thể tắt.'
    },
    {
      q: 'Bạn tạo storage account mới và muốn cấu hình customer-managed key ngay trong lúc tạo. Loại identity nào phải dùng?',
      options: ['System-assigned managed identity của storage account', 'Service principal có client secret', 'User-assigned managed identity', 'Tài khoản Global Administrator'],
      answer: [2],
      explain: 'Khi tạo mới, system-assigned identity của account chưa tồn tại nên phải dùng user-assigned managed identity đã có quyền trên key. Service principal với secret và tài khoản admin không phải cơ chế storage dùng để truy cập key.'
    },
    {
      q: 'Đơn vị kiểm toán yêu cầu dữ liệu trong storage account mới phải được mã hóa hai lớp. Bạn cần làm gì với ít công sức nhất?',
      options: ['Bật infrastructure encryption khi tạo account', 'Tạo hai encryption scope cho mỗi container', 'Bật customer-managed key hai lần với hai key', 'Bật Secure transfer required'],
      answer: [0],
      explain: 'Infrastructure encryption thêm lớp mã hóa thứ hai ở tầng hạ tầng và phải bật khi tạo account. Encryption scope không tạo mã hóa kép. Không thể cấu hình hai CMK chồng nhau. Secure transfer chỉ liên quan mã hóa in transit.'
    },
    {
      q: 'Một nhà cung cấp SaaS lưu dữ liệu của nhiều khách hàng trong cùng storage account và cần mỗi khách hàng được mã hóa bằng key riêng có thể thu hồi độc lập. Bạn dùng gì?',
      options: ['Một CMK cho toàn account', 'Infrastructure encryption', 'Customer-provided key cho Queue', 'Encryption scopes, mỗi scope gắn một customer-managed key'],
      answer: [3],
      explain: 'Encryption scope cho phép mỗi container/blob dùng key riêng, thu hồi độc lập. Một CMK cho toàn account không tách được khách hàng. Infrastructure encryption dùng key Microsoft. Customer-provided key chỉ hỗ trợ Blob, không phải Queue.'
    },
    {
      q: 'User1 có role Contributor trên storage account. Ứng dụng của User1 dùng <code>DefaultAzureCredential</code> (Microsoft Entra ID) để đọc blob nhưng nhận lỗi 403 AuthorizationPermissionMismatch. Bạn cần cấp quyền tối thiểu. Bạn gán role nào?',
      options: ['Owner', 'Storage Blob Data Reader', 'Storage Account Contributor', 'Reader'],
      answer: [1],
      explain: 'Truy cập dữ liệu qua Entra ID cần role data plane; Storage Blob Data Reader cho quyền đọc tối thiểu. Owner, Storage Account Contributor và Reader đều là role management plane, không cấp quyền dữ liệu qua token Entra ID.'
    },
    {
      q: 'Ứng dụng trên App Service cần đọc, ghi và xóa blob trong container <code>uploads</code>. Bạn cần giải pháp không lưu secret, theo nguyên tắc least privilege. Bạn làm gì? (Chọn 2)',
      options: ['Lưu account key trong app settings', 'Bật managed identity cho App Service', 'Gán Storage Blob Data Contributor cho identity ở scope container uploads', 'Gán Storage Blob Data Owner ở scope subscription'],
      answer: [1, 2],
      explain: 'Managed identity loại bỏ secret, và Storage Blob Data Contributor ở scope container đủ quyền đọc/ghi/xóa với phạm vi hẹp nhất. Lưu account key là secret và cho toàn quyền account. Owner ở scope subscription vượt quá nhu cầu.'
    },
    {
      q: 'Ứng dụng A và B đều dùng key1 của storage account. Bạn cần xoay vòng key mà không gây gián đoạn. Bước đầu tiên là gì?',
      options: ['Regenerate key1', 'Regenerate key2', 'Cập nhật A và B sang dùng key2', 'Tắt Shared Key access'],
      answer: [2],
      explain: 'Phải chuyển ứng dụng sang key2 trước, sau đó mới regenerate key1. Regenerate key1 trước làm ứng dụng mất kết nối. Regenerate key2 lúc đầu không giải quyết việc xoay key1. Tắt Shared Key làm cả hai ứng dụng ngừng hoạt động.'
    },
    {
      q: 'Bạn đặt <code>AllowSharedKeyAccess = false</code> cho storage account. Phương thức nào vẫn truy cập được blob?',
      options: ['Service SAS ký bằng key1', 'Account SAS', 'Connection string chứa AccountKey', 'User delegation SAS'],
      answer: [3],
      explain: 'User delegation SAS được ký bằng thông tin Entra ID nên không bị ảnh hưởng. Service SAS, account SAS và connection string đều dựa trên account key nên bị chặn.'
    },
    {
      q: 'Bạn cấu hình CMK nhưng nhận lỗi rằng key vault không đáp ứng yêu cầu. Key vault đã bật soft delete. Nguyên nhân khả dĩ nhất là gì?',
      options: ['Key vault chưa bật purge protection', 'Key vault nằm ở region khác', 'Key có kích thước 3072 bit', 'Storage account dùng GRS'],
      answer: [0],
      explain: 'CMK yêu cầu cả soft delete và purge protection. Key vault có thể ở region khác. RSA 3072 bit là kích thước hợp lệ. Redundancy GRS không ảnh hưởng CMK.'
    },
    {
      q: 'Bạn cần một danh tính chỉ có quyền tạo user delegation SAS (lấy user delegation key), không có quyền đọc hay ghi dữ liệu. Bạn gán role nào?',
      options: ['Storage Blob Data Reader', 'Storage Account Key Operator Service Role', 'Storage Blob Delegator', 'Storage Blob Data Owner'],
      answer: [2],
      explain: 'Storage Blob Delegator chỉ cho quyền lấy user delegation key. Storage Blob Data Reader và Owner còn cho quyền dữ liệu. Storage Account Key Operator Service Role liên quan tới list/regenerate account key.'
    }
  ]
});

AZ.addModule({
  id: 'p3m3',
  summary: 'Azure DNS cho phép host DNS zone (public và private) trên hạ tầng name server toàn cầu của Microsoft, quản lý bằng Azure RBAC, CLI, PowerShell và template. Đề AZ-104 hay hỏi cách delegate domain bằng NS record tại registrar, các loại record, alias record ở zone apex, và private DNS zone với virtual network link và auto-registration.',
  objectives: [
    'Giải thích Azure DNS làm gì và không làm gì (không bán tên miền)',
    'Tạo public DNS zone và delegate domain từ registrar bằng NS record; delegate child zone',
    'Phân biệt record type, record set, TTL, SOA, NS và các quy tắc CNAME',
    'Dùng alias record để trỏ zone apex tới public IP, Traffic Manager, Front Door, CDN và tránh dangling DNS',
    'Cấu hình private DNS zone, virtual network link, auto-registration và hiểu thứ tự phân giải',
    'Thực hiện các thao tác DNS bằng Azure CLI và Azure PowerShell'
  ],
  sections: [
    {
      id: 'what-is-dns',
      unit: 'What is Azure DNS?',
      title: 'Azure DNS là gì?',
      html: `
<p><strong>Azure DNS</strong> là dịch vụ host DNS domain trên mạng name server <strong>anycast toàn cầu</strong> của Microsoft. Bạn quản lý record bằng cùng tài khoản, RBAC, công cụ, hóa đơn và hỗ trợ như mọi dịch vụ Azure khác.</p>

<h4>Các thành phần</h4>
<table>
  <thead><tr><th>Dịch vụ</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><strong>Public DNS zone</strong></td><td>Host tên miền công khai (contoso.com) để Internet phân giải.</td></tr>
    <tr><td><strong>Private DNS zone</strong></td><td>Phân giải tên trong VNet (contoso.internal, privatelink.blob.core.windows.net). Không phân giải được từ Internet.</td></tr>
    <tr><td><strong>Azure DNS Private Resolver</strong></td><td>Inbound/outbound endpoint để on-premises phân giải private zone và VNet forward truy vấn về on-premises, không cần VM DNS.</td></tr>
    <tr><td><strong>Azure-provided DNS</strong></td><td>DNS mặc định của VNet qua <code>168.63.129.16</code>, phân giải tên VM trong cùng VNet.</td></tr>
  </tbody>
</table>

<h4>Lợi ích</h4>
<ul>
  <li><strong>Độ tin cậy và hiệu năng</strong>: anycast, truy vấn được trả lời bởi name server gần nhất.</li>
  <li><strong>Bảo mật</strong>: Azure RBAC (ví dụ role <em>DNS Zone Contributor</em>), activity log, <strong>resource lock</strong> để chống xóa zone/record nhầm.</li>
  <li><strong>Dễ dùng</strong>: portal, REST API, CLI, PowerShell, ARM/Bicep, Terraform; import/export zone file.</li>
  <li><strong>Alias record</strong>: record tham chiếu trực tiếp tới resource Azure.</li>
  <li><strong>DNSSEC</strong>: có thể ký zone public; khi đó hỗ trợ thêm DS, TLSA.</li>
</ul>

<h4>Azure DNS KHÔNG làm gì</h4>
<ul>
  <li><strong>Không bán/đăng ký tên miền.</strong> Mua tên miền qua <strong>App Service domains</strong> hoặc registrar bên thứ ba, rồi delegate sang Azure DNS.</li>
  <li>Không phải DNS đệ quy cho Internet (public zone chỉ là authoritative).</li>
</ul>

<h4>Giới hạn mặc định (public)</h4>
<table>
  <thead><tr><th>Tài nguyên</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Public DNS zone mỗi subscription</td><td>250</td></tr>
    <tr><td>Record set mỗi public zone</td><td>10.000</td></tr>
    <tr><td>Record mỗi record set</td><td>20</td></tr>
    <tr><td>Alias record set trỏ tới một resource Azure</td><td>50</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Công ty muốn mua tên miền mới bằng Azure DNS" → <strong>không được</strong>. Azure DNS chỉ host zone. Bạn có thể tạo zone <code>contoso.com</code> mà không sở hữu tên miền, nhưng zone chỉ có tác dụng trên Internet khi registrar trỏ NS về Azure.</div>
`
    },
    {
      id: 'host-domain',
      unit: 'Configure Azure DNS to host your domain',
      title: 'Cấu hình Azure DNS để host domain',
      html: `
<h4>Bước 1: tạo DNS zone</h4>
<p>DNS zone là resource chứa mọi record của một domain. Tên zone phải duy nhất <strong>trong resource group</strong>; cùng tên có thể tồn tại ở RG/subscription khác (mỗi bản được cấp bộ name server khác nhau, nhưng registrar chỉ trỏ được tới một bộ).</p>
<pre><code>az network dns zone create -g rg-dns -n contoso.com

New-AzDnsZone -Name contoso.com -ResourceGroupName rg-dns</code></pre>

<h4>Bước 2: lấy name server Azure cấp</h4>
<p>Mỗi zone được cấp 4 name server, dạng:</p>
<pre class="diagram">ns1-03.azure-dns.com.
ns2-03.azure-dns.net.
ns3-03.azure-dns.org.
ns4-03.azure-dns.info.</pre>
<pre><code>az network dns zone show -g rg-dns -n contoso.com --query nameServers</code></pre>

<h4>Bước 3: delegate tại registrar</h4>
<p>Vào trang quản trị của <strong>registrar</strong> (nơi mua tên miền), thay NS record của domain bằng <strong>cả 4</strong> name server Azure. Thao tác này tạo <em>delegation</em> từ zone cha (<code>.com</code>) sang Azure DNS.</p>
<ul>
  <li>Dùng <strong>đủ 4</strong> name server để có tính sẵn sàng cao.</li>
  <li>Thay đổi có thể mất từ vài phút tới vài giờ (tùy TTL của NS ở zone cha).</li>
  <li>Kiểm tra: <code>nslookup -type=SOA contoso.com</code> → primary name server phải là một name server <code>azure-dns</code>.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="Chuỗi delegation: resolver hỏi root, TLD .com, rồi name server Azure DNS">
  <rect class="box" x="10" y="100" width="100" height="50" rx="10"/>
  <text x="60" y="130" text-anchor="middle" class="t-b">Client</text>
  <rect class="box" x="150" y="100" width="130" height="50" rx="10"/>
  <text x="215" y="121" text-anchor="middle" class="t-b">DNS resolver</text>
  <text x="215" y="139" text-anchor="middle" class="t-sm t-mute">đệ quy (ISP…)</text>
  <line class="ln" x1="110" y1="125" x2="146" y2="125" marker-end="url(#arr)"/>

  <rect class="box" x="340" y="20" width="200" height="50" rx="10"/>
  <text x="440" y="41" text-anchor="middle" class="t-b">Root ( . )</text>
  <text x="440" y="59" text-anchor="middle" class="t-sm t-mute">trỏ tới name server .com</text>
  <rect class="box" x="340" y="100" width="200" height="50" rx="10"/>
  <text x="440" y="121" text-anchor="middle" class="t-b">.com TLD</text>
  <text x="440" y="139" text-anchor="middle" class="t-sm t-mute">NS contoso.com → azure-dns</text>
  <rect class="box-a" x="340" y="180" width="200" height="60" rx="10"/>
  <text x="440" y="200" text-anchor="middle" class="t-b t-a">Azure DNS</text>
  <text x="440" y="218" text-anchor="middle" class="t-sm">zone contoso.com</text>
  <text x="440" y="234" text-anchor="middle" class="t-sm t-mute">www A 203.0.113.10</text>

  <line class="ln-a" x1="280" y1="112" x2="336" y2="50" marker-end="url(#arr-a)"/>
  <text x="300" y="72" text-anchor="middle" class="t-sm t-a">1</text>
  <line class="ln-a" x1="280" y1="125" x2="336" y2="125" marker-end="url(#arr-a)"/>
  <text x="308" y="117" text-anchor="middle" class="t-sm t-a">2</text>
  <line class="ln-a" x1="280" y1="138" x2="336" y2="200" marker-end="url(#arr-a)"/>
  <text x="300" y="182" text-anchor="middle" class="t-sm t-a">3</text>

  <rect class="box-w" x="590" y="100" width="120" height="50" rx="10"/>
  <text x="650" y="121" text-anchor="middle" class="t-b">Registrar</text>
  <text x="650" y="139" text-anchor="middle" class="t-sm">nhập 4 NS Azure</text>
  <line class="ln dash" x1="590" y1="125" x2="544" y2="125" marker-end="url(#arr)"/>
  <text x="567" y="116" text-anchor="middle" class="t-sm t-mute">ghi NS</text>
</svg>
<figcaption>Hình 1. Resolver lần lượt hỏi root, TLD <code>.com</code> (nơi registrar đã ghi NS trỏ về Azure) rồi tới name server Azure DNS để lấy record. Nếu chưa đổi NS tại registrar, bước 2 vẫn trỏ về DNS cũ và zone Azure không bao giờ được hỏi tới.</figcaption>
</figure>
<div class="callout note"><strong>Glue record</strong>Bạn không cần tạo glue record khi dùng name server của Azure, vì chúng thuộc domain khác (azure-dns.*), không nằm trong domain của bạn.</div>

<h4>Delegate subdomain (child zone)</h4>
<p>Muốn đội khác quản lý <code>partners.contoso.com</code> trong zone riêng:</p>
<ol class="steps">
  <li>Tạo zone <code>partners.contoso.com</code> (có thể ở RG/subscription khác để phân quyền).</li>
  <li>Lấy 4 name server của child zone.</li>
  <li>Trong zone cha <code>contoso.com</code>, tạo <strong>NS record set</strong> tên <code>partners</code> chứa 4 name server đó.</li>
</ol>
<pre><code>az network dns zone create -g rg-dns -n partners.contoso.com --parent-name contoso.com</code></pre>
<p>Tham số <code>--parent-name</code> giúp CLI tự tạo NS record delegation trong zone cha (nếu cùng subscription và bạn có quyền).</p>

<h4>Record set, TTL và các record tự tạo</h4>
<ul>
  <li><strong>Record set</strong>: tập các record cùng <em>tên</em> và cùng <em>loại</em>, ví dụ hai A record cho <code>www</code>. TTL đặt ở cấp record set (1 – 2.147.483.647 giây).</li>
  <li>Tên record là tên <strong>tương đối</strong> (<code>www</code>); <code>@</code> là <strong>zone apex</strong> (chính <code>contoso.com</code>).</li>
  <li><strong>NS record set ở apex</strong>: tự tạo cùng zone, không xóa được; không sửa/xóa được các name server Azure đã điền sẵn (có thể thêm name server khác và đổi TTL).</li>
  <li><strong>SOA record</strong>: tự tạo ở apex, không tạo/xóa riêng được; sửa được mọi thuộc tính trừ <code>host</code>. Serial number <strong>không tự tăng</strong> khi bạn sửa record.</li>
</ul>

<h4>Loại record được hỗ trợ</h4>
<table>
  <thead><tr><th>Loại</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td>A / AAAA</td><td>Tên → IPv4 / IPv6</td></tr>
    <tr><td>CNAME</td><td>Tên → tên khác (bí danh). Chỉ 1 record mỗi set; không tồn tại song song với record khác cùng tên; <strong>không đặt ở apex</strong></td></tr>
    <tr><td>MX</td><td>Mail server (có preference)</td></tr>
    <tr><td>TXT</td><td>Chuỗi văn bản: SPF, DKIM, xác minh domain (SPF phải dùng TXT, loại SPF cũ không hỗ trợ)</td></tr>
    <tr><td>SRV</td><td>Vị trí dịch vụ, tên dạng <code>_sip._tcp</code></td></tr>
    <tr><td>CAA</td><td>CA nào được cấp chứng chỉ cho domain</td></tr>
    <tr><td>NS, SOA, PTR</td><td>Delegation, thông tin zone, reverse lookup</td></tr>
  </tbody>
</table>
<p>Hỗ trợ <strong>wildcard</strong> (<code>*</code> hoặc <code>*.foo</code>) cho mọi loại trừ NS và SOA.</p>

<div class="callout exam"><strong>Bẫy thi</strong>Sau khi tạo zone trong Azure mà Internet vẫn chưa phân giải được → bạn chưa cập nhật <strong>NS record tại registrar</strong>. Tạo NS record bên trong chính zone Azure không giải quyết được việc delegate từ zone cha.</div>
`
    },
    {
      id: 'exercise-a-record',
      unit: 'Exercise - Create a DNS zone and an A record by using Azure DNS',
      title: 'Thực hành: tạo DNS zone và A record',
      html: `
<p>Bài thực hành tạo zone, thêm A record và kiểm tra phân giải trực tiếp với name server Azure (chưa cần delegate thật tại registrar).</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo DNS zone và A record</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tạo resource <strong>DNS zone</strong>:<br><span class="path">Azure portal › Create a resource › DNS zone › Create</span>
      <div class="blade">
        <div class="blade-title">Create DNS zone</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-dns</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label>This zone is a child of an existing zone already hosted in Azure DNS</label><span class="pv">☐ không chọn</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">wideworldimports-lab.com</span></div>
        <div class="pf"><label>Resource group location</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pf"><label></label><span class="pv note">Location chỉ là nơi lưu metadata của resource group; bản thân DNS zone là resource global.</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Mở zone, ghi lại 4 name server ở trang <strong>Overview</strong> (dạng <code>ns1-0x.azure-dns.com</code>).</li>
    <li>Thêm A record:<br><span class="path">wideworldimports-lab.com › Recordsets › + Add</span>
      <div class="blade">
        <div class="blade-title">Add a record set</div>
        <div class="pf"><label class="req">Name</label><span class="pv">www</span></div>
        <div class="pf"><label class="req">Type</label><span class="pv sel">A</span></div>
        <div class="pf"><label>Alias record set</label><span class="pv radio">No</span></div>
        <div class="pf"><label class="req">TTL</label><span class="pv">1</span></div>
        <div class="pf"><label>TTL unit</label><span class="pv sel">Hours</span></div>
        <div class="pf"><label>IP address</label><span class="pv">10.10.10.10</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Mở command prompt: <code>nslookup www.wideworldimports-lab.com ns1-0x.azure-dns.com</code> (thay bằng name server của bạn) và xác nhận kết quả 10.10.10.10. Hỏi thẳng name server Azure nên không cần delegate thật tại registrar.</li>
  </ol>
  </div>
</div>

<h4>Bằng Azure CLI</h4>
<pre><code>az network dns zone create -g rg-dns -n wideworldimports-lab.com

# Thêm A record (tự tạo record set nếu chưa có)
az network dns record-set a add-record -g rg-dns -z wideworldimports-lab.com \\
  -n www -a 10.10.10.10

# Thêm IP thứ hai vào cùng record set
az network dns record-set a add-record -g rg-dns -z wideworldimports-lab.com \\
  -n www -a 10.10.10.11

# CNAME, MX, TXT
az network dns record-set cname set-record -g rg-dns -z wideworldimports-lab.com -n shop -c www.wideworldimports-lab.com
az network dns record-set mx add-record -g rg-dns -z wideworldimports-lab.com -n @ -e mail.wideworldimports-lab.com -p 10
az network dns record-set txt add-record -g rg-dns -z wideworldimports-lab.com -n @ -v "v=spf1 include:spf.protection.outlook.com -all"

# Liệt kê và xem SOA
az network dns record-set list -g rg-dns -z wideworldimports-lab.com -o table
az network dns record-set soa show -g rg-dns -z wideworldimports-lab.com</code></pre>

<h4>Bằng Azure PowerShell</h4>
<pre><code>New-AzDnsRecordSet -Name www -RecordType A -ZoneName wideworldimports-lab.com -ResourceGroupName rg-dns -Ttl 3600 -DnsRecords (New-AzDnsRecordConfig -IPv4Address 10.10.10.10)

# Thêm record vào record set có sẵn
$rs = Get-AzDnsRecordSet -Name www -RecordType A -ZoneName wideworldimports-lab.com -ResourceGroupName rg-dns
Add-AzDnsRecordConfig -RecordSet $rs -Ipv4Address 10.10.10.11
Set-AzDnsRecordSet -RecordSet $rs</code></pre>

<h4>Import/Export zone file</h4>
<pre><code>az network dns zone import -g rg-dns -n contoso.com -f contoso.com.txt
az network dns zone export -g rg-dns -n contoso.com -f backup.txt</code></pre>
<p>Import là cách nhanh nhất để chuyển hàng trăm record từ nhà cung cấp DNS cũ sang Azure DNS trước khi đổi NS tại registrar.</p>

<h4>Etag và ghi đè đồng thời</h4>
<p>Mỗi zone/record set có <strong>Etag</strong>. Azure PowerShell mặc định dùng Etag để chặn ghi đè thay đổi đồng thời; switch <code>-Overwrite</code> bỏ qua kiểm tra này.</p>

<div class="callout tip"><strong>Mẹo</strong>Đặt <strong>resource lock CanNotDelete</strong> trên DNS zone production. Xóa zone là xóa toàn bộ record, ảnh hưởng mọi dịch vụ dùng domain.</div>
`
    },
    {
      id: 'alias-records',
      unit: 'Dynamically resolve resource name by using alias record',
      title: 'Alias record: trỏ động tới resource Azure',
      html: `
<p><strong>Alias record set</strong> là record set A, AAAA hoặc CNAME được "đánh dấu" là alias: thay vì chứa IP/tên cố định, nó <strong>tham chiếu tới một resource Azure</strong>. Khi IP của resource đổi, DNS tự trả về giá trị mới.</p>

<h4>Loại record và đích hỗ trợ</h4>
<table>
  <thead><tr><th>Đích (target)</th><th>Loại record</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td>Public IP (Standard)</td><td>A / AAAA</td><td>Tối đa 50 alias record set trỏ tới một resource</td></tr>
    <tr><td>Traffic Manager profile</td><td>A / AAAA / CNAME</td><td>Ở apex: profile dùng external endpoints. Microsoft khuyên cấu hình mới dùng Traffic Manager Linked Records</td></tr>
    <tr><td>Azure CDN endpoint</td><td>A / AAAA / CNAME</td><td>Website tĩnh trên Storage + CDN (không hỗ trợ CDN từ Akamai ở apex)</td></tr>
    <tr><td>Azure Front Door endpoint</td><td>A / AAAA / CNAME</td><td>Custom domain cho Front Door</td></tr>
    <tr><td>Record set khác trong cùng zone</td><td>Cùng loại</td><td>Ví dụ CNAME alias tới CNAME khác</td></tr>
  </tbody>
</table>

<h4>Vì sao cần alias?</h4>
<div class="compare">
  <div><strong>Vấn đề zone apex</strong>DNS cấm CNAME ở apex (vì apex đã có SOA và NS). Vậy <code>contoso.com</code> không thể CNAME tới <code>contoso.trafficmanager.net</code>. <strong>Alias A record ở apex</strong> giải quyết việc này.</div>
  <div><strong>Dangling DNS</strong>Record thường trỏ tới IP cũ sau khi resource bị xóa; IP đó có thể được cấp cho người khác (rủi ro subdomain takeover). Alias gắn vòng đời record với resource: xóa resource thì record set thành <strong>rỗng</strong>.</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 230" role="img" aria-label="Alias record theo resource; A record thường giữ IP cố định và có thể thành dangling">
  <text x="20" y="20" class="t-sm t-b t-s">Alias record set</text>
  <rect class="box-a" x="20" y="30" width="200" height="70" rx="10"/>
  <text x="120" y="60" text-anchor="middle" class="t-b">@  A  (alias)</text>
  <text x="120" y="80" text-anchor="middle" class="t-sm">targetResource = pip-web</text>
  <rect class="box-w" x="280" y="30" width="150" height="70" rx="10"/>
  <text x="355" y="60" text-anchor="middle" class="t-b">pip-web</text>
  <text x="355" y="80" text-anchor="middle" class="t-sm">resource Azure</text>
  <rect class="box-s" x="490" y="30" width="210" height="70" rx="10"/>
  <text x="595" y="60" text-anchor="middle" class="t-b">IP hiện tại</text>
  <text x="595" y="80" text-anchor="middle" class="t-sm">tự cập nhật khi IP đổi</text>
  <line class="ln-s" x1="220" y1="65" x2="276" y2="65" marker-end="url(#arr-s)"/>
  <text x="248" y="56" text-anchor="middle" class="t-sm t-s">trỏ tới</text>
  <line class="ln-s" x1="430" y1="65" x2="486" y2="65" marker-end="url(#arr-s)"/>
  <text x="458" y="56" text-anchor="middle" class="t-sm t-s">trả về</text>

  <text x="20" y="140" class="t-sm t-b t-x">A record thường</text>
  <rect class="box" x="20" y="150" width="200" height="70" rx="10"/>
  <text x="120" y="180" text-anchor="middle" class="t-b">www  A</text>
  <text x="120" y="200" text-anchor="middle" class="t-sm">203.0.113.10 (ghi cứng)</text>
  <rect class="box-x" x="280" y="150" width="150" height="70" rx="10"/>
  <text x="355" y="180" text-anchor="middle" class="t-b">pip-web bị xóa</text>
  <text x="355" y="200" text-anchor="middle" class="t-sm">IP trả về Azure</text>
  <rect class="box-x" x="490" y="150" width="210" height="70" rx="10"/>
  <text x="595" y="180" text-anchor="middle" class="t-b">Dangling DNS</text>
  <text x="595" y="200" text-anchor="middle" class="t-sm">IP có thể về tay người khác</text>
  <line class="ln-x dash" x1="220" y1="185" x2="276" y2="185" marker-end="url(#arr-x)"/>
  <line class="ln-x dash" x1="430" y1="185" x2="486" y2="185" marker-end="url(#arr-x)"/>
  <text x="458" y="176" text-anchor="middle" class="t-sm t-x">trả về</text>
</svg>
<figcaption>Hình 1. Alias record lưu <em>tham chiếu tới resource</em>, nên luôn trả về IP hiện tại và trở thành rỗng khi resource bị xóa. A record thường lưu giá trị IP cố định: resource mất đi nhưng record vẫn trỏ vào IP cũ (rủi ro subdomain takeover).</figcaption>
</figure>

<h4>Tình huống điển hình</h4>
<ul>
  <li><code>contoso.com</code> (apex) và <code>www.contoso.com</code> cùng trỏ tới một Traffic Manager profile hoặc Front Door.</li>
  <li>Website tĩnh trên Azure Storage + CDN, truy cập bằng <code>contoso.com</code> không cần "www".</li>
  <li>VM có public IP đổi giá trị khi tạo lại: alias A record tự cập nhật.</li>
</ul>

<h4>Lệnh tạo alias</h4>
<pre><code># Alias A record ở apex trỏ tới public IP
az network dns record-set a create -g rg-dns -z contoso.com -n @ \\
  --target-resource /subscriptions/&lt;sub&gt;/resourceGroups/rg-web/providers/Microsoft.Network/publicIPAddresses/pip-web

# PowerShell
$pip = Get-AzPublicIpAddress -Name pip-web -ResourceGroupName rg-web
New-AzDnsRecordSet -Name "@" -RecordType A -ZoneName contoso.com -ResourceGroupName rg-dns -Ttl 3600 -TargetResourceId $pip.Id</code></pre>
<p>Yêu cầu: resource provider <strong>Microsoft.Network</strong> được đăng ký (cả hai subscription nếu zone và resource khác subscription).</p>

<div class="callout exam"><strong>Góc thi</strong>"Trỏ <code>contoso.com</code> (không có www) tới Traffic Manager/Front Door/CDN" → <strong>alias record</strong>, không phải CNAME. "Record DNS phải tự cập nhật khi public IP thay đổi hoặc tránh dangling DNS" → <strong>alias record</strong>.</div>
`
    },
    {
      id: 'exercise-alias',
      unit: 'Exercise - Create alias records for Azure DNS',
      title: 'Thực hành: alias record trỏ tới load balancer',
      html: `
<p>Kịch bản: website chạy trên hai VM sau một <strong>public Standard Load Balancer</strong>. Bạn muốn người dùng vào bằng <code>wideworldimports-lab.com</code> (apex) và DNS tự theo IP frontend của load balancer.</p>

<pre class="diagram">Người dùng ──DNS: wideworldimports-lab.com──▶ Azure DNS
                                          │ alias A @ ──▶ pip-lb (Standard)
                                          ▼
                              Standard Load Balancer (frontend = pip-lb)
                                   ├── VM1 (web)
                                   └── VM2 (web)</pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: alias A record ở zone apex trỏ tới public IP của load balancer</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Triển khai VNet, hai VM web và Standard Load Balancer có public IP <code>pip-lb</code> (bài lab cung cấp script).</li>
    <li>Mở DNS zone, chọn <strong>+ Record set</strong>:<br><span class="path">DNS zones › wideworldimports-lab.com › Overview › + Record set</span></li>
    <li>Điền pane <strong>Add record set</strong>:
      <div class="blade">
        <div class="blade-title">Add record set</div>
        <div class="pf"><label>Name</label><span class="pv">@</span></div>
        <div class="pf"><label>Type</label><span class="pv sel">A</span></div>
        <div class="pf"><label>Alias record set</label><span class="pv radio">Yes</span></div>
        <div class="pf"><label>Alias type</label><span class="pv radio">Azure resource</span></div>
        <div class="pf"><label class="req">Choose a subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Azure resource</label><span class="pv sel">pip-lb</span></div>
        <div class="pf"><label class="req">TTL</label><span class="pv">1</span></div>
        <div class="pf"><label>TTL unit</label><span class="pv sel">Hours</span></div>
        <div class="pf"><label></label><span class="pv note">Alias type = Zone record set dùng khi trỏ tới một record set khác trong cùng zone.</span></div>
        <div class="pbtns"><span class="pbtn primary">OK</span></div>
      </div>
    </li>
    <li>Kiểm tra: <code>nslookup wideworldimports-lab.com &lt;name-server-azure&gt;</code> trả về IP của <code>pip-lb</code>.</li>
    <li>Truy cập IP/tên trên trình duyệt, refresh nhiều lần để thấy phản hồi từ VM1 và VM2.</li>
  </ol>
  </div>
</div>

<figure class="fig"><img src="assets/img/p3m3/alias-record-set.png" alt="Pane Add record set trên Azure portal: Type A – Alias record to IPv4 address, Alias record set Yes, Alias type Azure resource, chọn public IP Web-01-ip" loading="lazy"><figcaption>Hình 1. Pane <em>Add record set</em> khi tạo alias A record trỏ tới một public IP (ví dụ trong tutorial gốc dùng tên <code>web01</code>). Nguồn: <a href="https://learn.microsoft.com/azure/dns/tutorial-alias-pip" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Điều gì xảy ra khi…</h4>
<table>
  <thead><tr><th>Sự kiện</th><th>Alias record</th><th>A record thường</th></tr></thead>
  <tbody>
    <tr><td>Public IP đổi giá trị</td><td>Tự cập nhật</td><td>Phải sửa tay</td></tr>
    <tr><td>Public IP bị xóa</td><td>Record set thành rỗng</td><td>Vẫn trỏ IP cũ (dangling)</td></tr>
    <tr><td>Cần đặt ở apex trỏ tới dịch vụ dùng tên (Traffic Manager)</td><td>Được</td><td>A record không trỏ được tới tên; CNAME bị cấm ở apex</td></tr>
  </tbody>
</table>

<div class="callout note"><strong>TTL của alias</strong>Alias record set vẫn có TTL như record set thường; giá trị trả về luôn lấy theo trạng thái hiện tại của resource đích.</div>
<div class="callout warn"><strong>Dọn dẹp</strong>Xóa resource group của lab để tránh phí VM và load balancer. DNS zone tính phí theo zone mỗi tháng và theo số truy vấn.</div>
`
    },
    {
      id: 'private-dns',
      extra: true,
      title: 'Private DNS zones & auto-registration',
      html: `
<p><strong>Private DNS zone</strong> host record chỉ phân giải được từ các VNet đã <strong>link</strong> với zone. Dùng để đặt tên nội bộ (<code>corp.contoso.internal</code>) và cho private endpoint (<code>privatelink.*</code>) mà không cần dựng DNS server riêng.</p>

<h4>Virtual network link</h4>
<ul>
  <li>Zone là resource <strong>global</strong>; link được tới VNet ở <strong>bất kỳ region</strong>, kể cả VNet thuộc subscription khác.</li>
  <li>Hai loại link: <strong>resolution only</strong> (chỉ phân giải) và <strong>registration</strong> (bật auto-registration).</li>
  <li>VNet peering <strong>không</strong> tự chia sẻ zone: mỗi VNet cần phân giải phải có link riêng.</li>
</ul>

<h4>Auto-registration</h4>
<ul>
  <li>Khi bật trên link, Azure tự tạo <strong>A record</strong> (tên = hostname VM, IP = private IP) cho <strong>VM</strong> trong VNet đó, và tự xóa khi VM bị xóa.</li>
  <li>Chỉ áp dụng cho <strong>virtual machine</strong> (NIC của VM); tài nguyên khác như internal load balancer hay private endpoint phải tạo record thủ công (private endpoint dùng DNS zone group).</li>
  <li>Một VNet chỉ bật auto-registration với <strong>1 private zone</strong>, nhưng có thể link resolution tới nhiều zone.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 275" role="img" aria-label="Private DNS zone link tới vnet-hub có auto-registration, vnet-spoke1 chỉ resolution, vnet-spoke2 không link">
  <rect class="box-e" x="230" y="20" width="260" height="70" rx="10"/>
  <text x="360" y="44" text-anchor="middle" class="t-b">corp.contoso.internal</text>
  <text x="360" y="62" text-anchor="middle" class="t-sm">Private DNS zone · global</text>
  <text x="360" y="80" text-anchor="middle" class="t-sm t-mute">vm-hub1 A 10.0.1.4 (auto)</text>

  <rect class="zone" x="20" y="170" width="200" height="90" rx="10"/>
  <text x="120" y="194" text-anchor="middle" class="t-b">vnet-hub</text>
  <text x="120" y="214" text-anchor="middle" class="t-sm">VM tự có A record</text>
  <text x="120" y="236" text-anchor="middle" class="t-sm t-s">phân giải được ✓</text>
  <rect class="zone" x="260" y="170" width="200" height="90" rx="10"/>
  <text x="360" y="194" text-anchor="middle" class="t-b">vnet-spoke1</text>
  <text x="360" y="214" text-anchor="middle" class="t-sm">không tự đăng ký VM</text>
  <text x="360" y="236" text-anchor="middle" class="t-sm t-s">phân giải được ✓</text>
  <rect class="zone" x="500" y="170" width="200" height="90" rx="10"/>
  <text x="600" y="194" text-anchor="middle" class="t-b">vnet-spoke2</text>
  <text x="600" y="214" text-anchor="middle" class="t-sm">peering với hub, không link</text>
  <text x="600" y="236" text-anchor="middle" class="t-sm t-x">không thấy zone ✕</text>

  <line class="ln-s" x1="300" y1="90" x2="124" y2="166" marker-end="url(#arr-s)"/>
  <text x="196" y="118" text-anchor="end" class="t-sm t-s">link: registration</text>
  <line class="ln-a" x1="360" y1="90" x2="360" y2="166" marker-end="url(#arr-a)"/>
  <text x="368" y="132" class="t-sm t-a">link: resolution</text>
  <line class="ln-x dash" x1="420" y1="90" x2="596" y2="166" marker-end="url(#arr-x)"/>
  <text x="530" y="118" class="t-sm t-x">không có link</text>
</svg>
<figcaption>Hình 1. Chỉ VNet có <strong>virtual network link</strong> mới phân giải được private zone. Link bật auto-registration (vnet-hub) còn tự tạo A record cho VM. VNet peering không chia sẻ zone: vnet-spoke2 phải có link riêng.</figcaption>
</figure>

<h4>Giới hạn</h4>
<table>
  <thead><tr><th>Tài nguyên</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Private DNS zone mỗi subscription</td><td>1.000</td></tr>
    <tr><td>Record set mỗi private zone</td><td>25.000</td></tr>
    <tr><td>Virtual network link mỗi private zone</td><td>1.000</td></tr>
    <tr><td>Link có auto-registration mỗi private zone</td><td>100</td></tr>
    <tr><td>Private zone có auto-registration mà một VNet được link</td><td><strong>1</strong></td></tr>
    <tr><td>Private zone một VNet được link (tổng)</td><td>1.000</td></tr>
  </tbody>
</table>
<p>Hạn chế khác: không tạo zone một nhãn (phải có ít nhất hai nhãn như <code>contoso.local</code>); <strong>không tạo NS delegation</strong> trong private zone (tạo thẳng child zone rồi link); một số tên bị chặn như <code>azure.com</code>, <code>core.windows.net</code>, <code>microsoft.com</code>.</p>

<h4>Thứ tự phân giải</h4>
<ul>
  <li>VNet dùng <strong>Azure-provided DNS</strong> (mặc định): truy vấn private zone đã link trước, rồi tới Azure DNS công cộng.</li>
  <li>VNet dùng <strong>custom DNS server</strong>: private zone <strong>không</strong> được tự động dùng. DNS server tùy chỉnh phải <strong>forward</strong> (conditional forwarder) về <code>168.63.129.16</code>, và VNet chứa DNS server đó phải được link với zone; hoặc dùng <strong>Azure DNS Private Resolver</strong>.</li>
  <li>On-premises muốn phân giải private zone: forward tới <strong>inbound endpoint</strong> của DNS Private Resolver (hoặc VM DNS forwarder trong VNet).</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo private DNS zone và link VNet có auto-registration</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Tìm <strong>Private DNS zones</strong>, chọn <strong>+ Create</strong>:
      <div class="blade">
        <div class="blade-title">Create Private DNS Zone</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-dns</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">corp.contoso.internal</span></div>
        <div class="pf"><label>Resource group location</label><span class="pv sel">(Asia Pacific) Southeast Asia</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Mở zone, thêm link:<br><span class="path">corp.contoso.internal › DNS Management › Virtual Network Links › + Add</span>
      <div class="blade">
        <div class="blade-title">Add Virtual Network Link</div>
        <div class="pf"><label class="req">Link name</label><span class="pv">link-hub</span></div>
        <div class="blade-sec">Virtual network details</div>
        <div class="pf"><label>I know the resource ID of virtual network</label><span class="pv">☐ không chọn</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Virtual Network</label><span class="pv sel">vnet-hub (rg-net)</span></div>
        <div class="blade-sec">Configuration</div>
        <div class="pf"><label>Enable auto registration</label><span class="pv chk">Bật</span></div>
        <div class="pbtns"><span class="pbtn primary">Create</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Thêm link thứ hai <code>link-spoke1</code> tới <code>vnet-spoke1</code>, <strong>không</strong> tick <em>Enable auto registration</em> (chỉ phân giải).</li>
    <li>Tạo một VM trong <code>vnet-hub</code>, rồi mở <strong>DNS Management › Recordsets</strong>: thấy A record của VM với cột <em>Auto registered</em> = <strong>True</strong>.</li>
  </ol>
  </div>
</div>

<h4>Lệnh</h4>
<pre><code>az network private-dns zone create -g rg-dns -n corp.contoso.internal

# Link VNet hub có auto-registration
az network private-dns link vnet create -g rg-dns -z corp.contoso.internal \\
  -n link-hub -v vnet-hub --registration-enabled true

# Link VNet spoke chỉ để phân giải
az network private-dns link vnet create -g rg-dns -z corp.contoso.internal \\
  -n link-spoke1 -v /subscriptions/&lt;sub&gt;/resourceGroups/rg-spoke/providers/Microsoft.Network/virtualNetworks/vnet-spoke1 \\
  --registration-enabled false

# Record thủ công
az network private-dns record-set a add-record -g rg-dns -z corp.contoso.internal -n sql01 -a 10.1.2.10</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"VM ở VNet1 và VNet2 (đã peering) cần phân giải tên nhau, tự động khi tạo VM mới" → tạo <strong>private DNS zone</strong>, link cả hai VNet với <strong>auto-registration</strong> bật. Azure-provided DNS mặc định <strong>không</strong> phân giải tên qua VNet peering. "Bật auto-registration cho VNet1 với zone thứ hai" → không được vì VNet chỉ đăng ký vào <strong>1</strong> zone.</div>
`
    }
  ],
  keyFacts: [
    'Azure DNS <strong>không bán tên miền</strong>; mua qua App Service domains hoặc registrar, rồi delegate sang Azure DNS.',
    'Delegate bằng cách cập nhật <strong>NS record tại registrar</strong> thành cả 4 name server Azure (azure-dns.com/.net/.org/.info).',
    'Delegate subdomain: tạo child zone rồi thêm <strong>NS record set</strong> (tên subdomain) trong zone cha.',
    'Record set = các record cùng tên và cùng loại; TTL đặt ở cấp record set; tối đa 20 record mỗi record set.',
    'SOA và NS ở apex tự tạo cùng zone, không xóa riêng được; SOA sửa được mọi trường trừ <code>host</code>, serial không tự tăng.',
    '<strong>CNAME không được đặt ở zone apex</strong> và không cùng tên với record khác; CNAME/SOA record set chỉ chứa 1 record.',
    'Alias record hỗ trợ loại <strong>A, AAAA, CNAME</strong>; trỏ tới public IP, Traffic Manager, CDN, Front Door, hoặc record set khác cùng zone.',
    'Alias tránh <strong>dangling DNS</strong>: xóa resource đích thì record set thành rỗng; IP đổi thì record tự cập nhật.',
    'Private DNS zone chỉ phân giải từ VNet đã <strong>link</strong>; một VNet chỉ có auto-registration với <strong>1</strong> private zone; mỗi zone tối đa 100 link registration và 1.000 link tổng.',
    'Auto-registration chỉ tạo record cho <strong>VM</strong>, tự xóa record khi VM bị xóa.',
    'VNet dùng custom DNS thì không tự dùng private zone; cần forward về <code>168.63.129.16</code> hoặc dùng DNS Private Resolver.',
    'Giới hạn public: 250 zone mỗi subscription, 10.000 record set mỗi zone (tăng được qua Support).'
  ],
  traps: [
    'Nghĩ rằng tạo zone trong Azure là Internet phân giải được ngay: phải đổi <strong>NS tại registrar</strong>.',
    'Dùng CNAME cho <code>contoso.com</code> trỏ tới Traffic Manager/Front Door: CNAME bị cấm ở apex, dùng <strong>alias record</strong>.',
    'Chọn Azure DNS khi đề yêu cầu "đăng ký tên miền mới": Azure DNS không làm việc đó.',
    'Cho rằng VNet peering tự cho phép phân giải tên VM giữa hai VNet bằng Azure-provided DNS: không, cần private DNS zone hoặc DNS tùy chỉnh.',
    'Bật auto-registration của một VNet cho hai private zone: chỉ được <strong>một</strong>.',
    'Tạo NS delegation bên trong private DNS zone: không hỗ trợ, tạo child zone riêng rồi link VNet.',
    'Quên rằng VNet có custom DNS server sẽ bỏ qua private zone đã link nếu DNS server không forward về 168.63.129.16.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Mua domain</td><td>Không qua Azure DNS (App Service domains / registrar)</td></tr>
    <tr><td>Delegate domain</td><td>NS record tại registrar → 4 name server Azure</td></tr>
    <tr><td>Delegate subdomain</td><td>NS record set trong zone cha</td></tr>
    <tr><td>Kiểm tra</td><td><code>nslookup -type=SOA contoso.com</code></td></tr>
    <tr><td>Record types</td><td>A, AAAA, CAA, CNAME, MX, NS, PTR, SOA, SRV, TXT (+DS, TLSA khi DNSSEC)</td></tr>
    <tr><td>Apex</td><td><code>@</code>; không CNAME → dùng alias</td></tr>
    <tr><td>Alias</td><td>A/AAAA/CNAME → Public IP, Traffic Manager, CDN, Front Door, record set cùng zone</td></tr>
    <tr><td>Private zone</td><td>VNet link; auto-registration: 1 zone/VNet, 100 link/zone; chỉ VM</td></tr>
    <tr><td>Custom DNS + private zone</td><td>Forward về 168.63.129.16 hoặc DNS Private Resolver</td></tr>
    <tr><td>Giới hạn public</td><td>250 zone/sub, 10.000 record set/zone, 20 record/set</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Azure DNS có bán tên miền không?', back: '<strong>Không</strong>. Mua qua App Service domains hoặc registrar bên thứ ba rồi delegate.' },
    { front: 'Làm sao để Internet phân giải zone contoso.com host trên Azure DNS?', back: 'Tại <strong>registrar</strong>, đổi NS record của domain thành 4 name server Azure cấp cho zone.' },
    { front: 'Delegate partners.contoso.com sang zone riêng thế nào?', back: 'Tạo zone <code>partners.contoso.com</code>, rồi tạo <strong>NS record set</strong> tên <code>partners</code> trong zone <code>contoso.com</code> chứa name server của child zone.' },
    { front: 'Record set là gì?', back: 'Tập record cùng <strong>tên</strong> và cùng <strong>loại</strong> trong một zone; TTL áp cho cả set.' },
    { front: 'Có tạo CNAME ở zone apex được không?', back: '<strong>Không</strong>. Apex đã có SOA và NS. Dùng alias record.' },
    { front: 'Thuộc tính nào của SOA không sửa được?', back: '<code>host</code> (trỏ tới primary name server Azure).' },
    { front: 'Alias record hỗ trợ những loại record nào?', back: '<strong>A, AAAA, CNAME</strong>.' },
    { front: 'Alias record trỏ tới được những gì?', back: 'Public IP Standard, Traffic Manager profile, Azure CDN endpoint, Azure Front Door endpoint, record set khác trong cùng zone.' },
    { front: 'Điều gì xảy ra với alias record khi public IP đích bị xóa?', back: 'Record set trở thành <strong>rỗng</strong>, tránh dangling DNS.' },
    { front: 'Một VNet bật auto-registration với tối đa bao nhiêu private zone?', back: '<strong>1</strong>.' },
    { front: 'Auto-registration tạo record cho tài nguyên nào?', back: 'Chỉ <strong>virtual machine</strong> (A record theo hostname, tự xóa khi VM bị xóa).' },
    { front: 'VNet dùng custom DNS server muốn phân giải private zone cần gì?', back: 'Conditional forwarder về <code>168.63.129.16</code> (từ VNet đã link zone) hoặc Azure DNS Private Resolver.' },
    { front: 'Lệnh CLI link VNet vào private zone có auto-registration?', back: '<code>az network private-dns link vnet create -g RG -z ZONE -n LINK -v VNET --registration-enabled true</code>' },
    { front: 'Lệnh kiểm tra domain đã delegate sang Azure chưa?', back: '<code>nslookup -type=SOA contoso.com</code>: primary name server phải là <code>ns1-xx.azure-dns.com</code>.' },
    { front: 'Giới hạn record set mỗi public zone và public zone mỗi subscription?', back: '10.000 record set/zone; 250 zone/subscription (mặc định).' },
    { front: 'Có tạo private DNS zone tên một nhãn như "corp" được không?', back: '<strong>Không</strong>. Cần ít nhất hai nhãn, ví dụ <code>corp.local</code>.' }
  ],
  quiz: [
    {
      q: 'Công ty mua domain <code>fabrikam.com</code> tại một registrar bên ngoài và đã tạo DNS zone <code>fabrikam.com</code> trong Azure DNS với đầy đủ record. Người dùng Internet vẫn phân giải theo DNS cũ. Bạn cần làm gì?',
      options: ['Tạo thêm NS record trong zone Azure trỏ tới name server của registrar', 'Cập nhật NS record tại registrar thành các name server Azure DNS của zone', 'Tạo private DNS zone fabrikam.com', 'Chuyển zone sang resource group khác'],
      answer: [1],
      explain: 'Delegation được thực hiện ở zone cha, qua registrar: NS của domain phải trỏ tới name server Azure. Sửa NS bên trong zone Azure không thay đổi delegation; private zone không phân giải từ Internet; đổi resource group không liên quan.'
    },
    {
      q: 'Bạn cần dùng Azure để đăng ký tên miền mới <code>contoso-shop.com</code>. Giải pháp nào phù hợp?',
      options: ['Tạo public DNS zone trong Azure DNS', 'Tạo private DNS zone', 'Mua qua App Service domains', 'Tạo alias record'],
      answer: [2],
      explain: 'Azure DNS không bán tên miền; App Service domains cho phép mua domain trong Azure. Tạo zone (public hay private) chỉ host record; alias record chỉ là loại record.'
    },
    {
      q: 'Bạn muốn <code>contoso.com</code> (không có www) trỏ tới một Azure Front Door endpoint. Bạn nên tạo record nào?',
      options: ['CNAME record tại @', 'A record tĩnh chứa IP hiện tại của Front Door', 'NS record tại @', 'Alias record tại @ trỏ tới Front Door endpoint'],
      answer: [3],
      explain: 'CNAME không được phép ở zone apex; alias record ở apex giải quyết điều này và tự theo IP của Front Door. A record tĩnh sẽ hỏng khi IP Front Door thay đổi; NS tại apex là của Azure, không dùng để trỏ dịch vụ.'
    },
    {
      q: 'Một VM có public IP Standard được trỏ bởi A record <code>app.contoso.com</code>. Đội vận hành thường xuyên xóa và tạo lại public IP, khiến record trỏ sai. Bạn muốn record tự cập nhật và không bao giờ trỏ tới IP đã bị xóa. Bạn làm gì?',
      options: ['Chuyển record thành alias record trỏ tới resource public IP', 'Giảm TTL xuống 60 giây', 'Dùng CNAME trỏ tới FQDN cloudapp.azure.com', 'Đặt resource lock trên DNS zone'],
      answer: [0],
      explain: 'Alias record gắn với resource public IP: IP đổi thì record cập nhật, resource bị xóa thì record set rỗng. Giảm TTL không làm record tự đổi; CNAME tới FQDN cloudapp vẫn để lại dangling nếu IP bị xóa; lock trên zone không liên quan tới public IP.'
    },
    {
      q: 'Bạn tạo zone <code>contoso.com</code> và muốn đội Partners tự quản lý <code>partners.contoso.com</code> trong subscription riêng của họ. Bạn cần làm gì? (Chọn 2)',
      options: ['Tạo DNS zone <code>partners.contoso.com</code> trong subscription của đội Partners', 'Tạo CNAME <code>partners</code> trong zone contoso.com', 'Tạo NS record set <code>partners</code> trong zone contoso.com chứa name server của zone con', 'Cập nhật NS tại registrar cho partners.contoso.com'],
      answer: [0, 2],
      explain: 'Delegate subdomain gồm tạo child zone và NS record set trong zone cha. CNAME không tạo delegation; registrar chỉ quản lý delegation của contoso.com, không phải subdomain.'
    },
    {
      q: 'VNet1 và VNet2 đã peering. Các VM dùng Azure-provided DNS. Bạn cần VM ở hai VNet phân giải được tên nhau, và record tự tạo khi thêm VM mới. Giải pháp ít công sức nhất?',
      options: ['Tạo private DNS zone, link VNet1 và VNet2 với auto-registration bật', 'Bật "Allow forwarded traffic" trên peering', 'Dựng VM DNS server trong mỗi VNet', 'Tạo public DNS zone và A record cho từng VM'],
      answer: [0],
      explain: 'Private DNS zone link cả hai VNet với auto-registration tạo record tự động và phân giải được từ cả hai. Peering không chia sẻ phân giải tên; VM DNS tốn công vận hành; public zone để lộ IP nội bộ và phải tạo record tay.'
    },
    {
      q: 'VNet1 đã bật auto-registration với private zone <code>corp.contoso.com</code>. Bạn cố tạo link thứ hai từ VNet1 tới <code>lab.contoso.com</code> với auto-registration bật nhưng thất bại. Cách khắc phục?',
      options: ['Xóa VNet peering của VNet1', 'Tạo link tới lab.contoso.com với registration tắt (chỉ phân giải)', 'Tăng hạn mức qua Support', 'Chuyển lab.contoso.com sang cùng region với VNet1'],
      answer: [1],
      explain: 'Một VNet chỉ được auto-registration với một private zone (giới hạn cứng), nhưng có thể link chỉ-phân-giải tới nhiều zone. Peering không liên quan; giới hạn này không tăng qua Support; private zone là resource global.'
    },
    {
      q: 'VNet-Hub dùng custom DNS server (VM Windows DNS 10.0.0.4). Private zone <code>privatelink.blob.core.windows.net</code> đã link với VNet-Hub, nhưng VM vẫn phân giải storage ra public IP. Bạn cần làm gì?',
      options: ['Bật auto-registration trên link', 'Đổi TTL của record trong private zone', 'Trên DNS server, tạo conditional forwarder cho blob.core.windows.net về 168.63.129.16', 'Tạo alias record trỏ tới storage account'],
      answer: [2],
      explain: 'Khi VNet dùng custom DNS, private zone chỉ được dùng nếu DNS server forward truy vấn về Azure DNS 168.63.129.16 (từ VNet đã link). Auto-registration chỉ dành cho VM; TTL không thay đổi cơ chế; alias record không trỏ tới storage account.'
    },
    {
      q: 'Phát biểu nào về record trong Azure DNS là ĐÚNG? (Chọn 2)',
      options: ['TTL được đặt ở cấp record set, áp cho mọi record trong set', 'Một CNAME record set có thể chứa nhiều record', 'NS record set ở apex được tạo tự động và không xóa riêng được', 'Serial number của SOA tự tăng mỗi lần sửa record'],
      answer: [0, 2],
      explain: 'TTL thuộc record set; NS (và SOA) ở apex tự tạo, không xóa riêng được. CNAME record set chỉ chứa một record; serial của SOA không tự tăng trong Azure DNS.'
    },
    {
      q: 'Bạn cần chuyển 400 record từ nhà cung cấp DNS cũ sang Azure DNS với ít công sức nhất trước khi đổi NS. Bạn dùng cách nào?',
      options: ['Tạo từng record trên portal', 'Tạo alias record cho từng tên', 'Dùng Azure Migrate', 'Export zone file từ nhà cung cấp cũ và chạy <code>az network dns zone import</code>'],
      answer: [3],
      explain: 'Import zone file chuyển toàn bộ record trong một lệnh. Tạo tay tốn công; alias record không áp dụng cho record bên ngoài Azure; Azure Migrate dùng để di chuyển máy chủ, không phải DNS zone.'
    },
    {
      q: 'Bạn cần thêm bản ghi SPF cho <code>contoso.com</code> trong Azure DNS. Bạn dùng loại record nào?',
      options: ['SPF', 'MX', 'TXT', 'CAA'],
      answer: [2],
      explain: 'Theo RFC 7208, SPF phải dùng record TXT; Azure DNS không hỗ trợ loại SPF cũ. MX chỉ định mail server; CAA chỉ định CA được cấp chứng chỉ.'
    },
    {
      q: 'Bạn bật auto-registration cho VNet1 với private zone <code>corp.local</code>. Những record nào sẽ được tạo tự động? (Chọn 2)',
      options: ['A record cho VM mới tạo trong VNet1', 'A record cho frontend IP của internal load balancer trong VNet1', 'A record cho private endpoint trong VNet1', 'A record của VM được xóa khi VM bị xóa'],
      answer: [0, 3],
      explain: 'Auto-registration chỉ quản lý record của VM: tạo khi VM được tạo và xóa khi VM bị xóa. Internal load balancer và private endpoint không được auto-register; private endpoint dùng DNS zone group hoặc record thủ công.'
    },
    {
      q: 'Bạn tạo zone <code>contoso.com</code> trong RG1 và một zone cùng tên trong RG2 (cùng subscription). Phát biểu nào đúng?',
      options: ['Không thể, tên zone phải duy nhất trong subscription', 'Hai zone dùng chung một bộ name server', 'Registrar sẽ tự cân bằng tải giữa hai zone', 'Được phép; mỗi zone được cấp bộ name server khác nhau và registrar chỉ trỏ tới một bộ'],
      answer: [3],
      explain: 'Tên zone chỉ cần duy nhất trong resource group; zone cùng tên ở RG khác được cấp name server khác, và chỉ bộ được cấu hình tại registrar mới có hiệu lực trên Internet. Không có cơ chế dùng chung name server hay cân bằng tải giữa hai zone.'
    }
  ]
});

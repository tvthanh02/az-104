AZ.addModule({
  id: 'p3m7',
  summary: '<strong>Azure Application Gateway</strong> là bộ cân bằng tải web <strong>tầng 7 (HTTP/HTTPS)</strong> theo region: định tuyến theo URL path và host name, terminate TLS, giữ phiên bằng cookie, rewrite header và tích hợp <strong>Web Application Firewall (WAF)</strong>. Đề AZ-104 hay hỏi về các thành phần (listener, rule, backend settings, backend pool, probe), subnet riêng, v2 autoscaling, và chọn đúng dịch vụ giữa Load Balancer, Application Gateway, Front Door, Traffic Manager.',
  objectives: [
    'Mô tả Application Gateway và các SKU hiện hành (Standard_v2, WAF_v2; v1 đã retire 28/04/2026)',
    'Giải thích luồng xử lý request qua frontend IP, listener, routing rule, backend settings, backend pool và health probe',
    'Cấu hình path-based routing, multi-site hosting, redirect và rewrite',
    'Hiểu TLS termination và end-to-end TLS, WAF chế độ Detection/Prevention, autoscaling và yêu cầu subnet riêng',
    'Chọn giữa Load Balancer, Application Gateway, Front Door và Traffic Manager theo phạm vi (global/regional) và tầng (L4/L7)'
  ],
  sections: [
    {
      id: 'what-is-appgw',
      unit: 'What is Azure Application Gateway?',
      title: 'Azure Application Gateway là gì?',
      html: `
<p><strong>Application Gateway</strong> là <strong>reverse proxy</strong> tầng 7 do Azure quản lý. Khác với Load Balancer (chuyển tiếp gói tin ở tầng 4), Application Gateway <strong>kết thúc kết nối của client</strong>, đọc request HTTP (URL, host header, cookie…), rồi mở kết nối mới tới backend. Vì vậy backend thấy IP nguồn là IP của Application Gateway; IP client gốc nằm trong header <code>X-Forwarded-For</code>.</p>

<h4>Tính năng chính</h4>
<ul>
  <li><strong>URL path-based routing</strong>: <code>/images/*</code> tới pool A, <code>/video/*</code> tới pool B.</li>
  <li><strong>Multi-site hosting</strong>: nhiều website (<code>contoso.com</code>, <code>fabrikam.com</code>) trên cùng một gateway, phân biệt theo host header.</li>
  <li><strong>TLS/SSL termination</strong> và <strong>end-to-end TLS</strong>; tích hợp chứng chỉ từ <strong>Azure Key Vault</strong>.</li>
  <li><strong>Redirection</strong> (HTTP → HTTPS, sang listener khác hoặc URL ngoài) và <strong>rewrite</strong> HTTP header / URL.</li>
  <li><strong>Cookie-based session affinity</strong>, <strong>connection draining</strong>, WebSocket, HTTP/2, trang lỗi tùy chỉnh.</li>
  <li><strong>Web Application Firewall</strong> (SKU WAF_v2) chống SQL injection, XSS và các lỗ hổng OWASP.</li>
  <li><strong>Autoscaling</strong>, <strong>zone redundancy</strong>, <strong>static VIP</strong> (v2).</li>
</ul>

<h4>SKU</h4>
<table>
  <thead><tr><th>SKU</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>Standard_v2</strong></td><td>Production, autoscaling, zone redundancy, Key Vault, header rewrite, mTLS, Private Link, AGIC cho AKS. SLA 99,95%.</td></tr>
    <tr><td><strong>WAF_v2</strong></td><td>Standard_v2 + Web Application Firewall (WAF policy, custom rules).</td></tr>
    <tr><td>Basic (preview)</td><td>Cho ứng dụng traffic thấp, ít tính năng nâng cao, SLA 99,9%.</td></tr>
    <tr><td>Standard / WAF (v1)</td><td><strong>Đã retire ngày 28/04/2026</strong>, không còn được hỗ trợ; phải migrate lên v2.</td></tr>
  </tbody>
</table>

<h4>Backend hỗ trợ</h4>
<p>Backend pool có thể chứa: NIC của VM, Virtual Machine Scale Set, địa chỉ IP (kể cả IP on-premises đi qua VPN/ExpressRoute hoặc VNet peering), FQDN, và dịch vụ multi-tenant như <strong>App Service</strong>.</p>

<h4>Giới hạn đáng nhớ (v2)</h4>
<table>
  <thead><tr><th>Tài nguyên</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Instance mỗi gateway</td><td>125 (v1: 32)</td></tr>
    <tr><td>HTTP listener</td><td>200 (tối đa 100 listener hoạt động định tuyến traffic)</td></tr>
    <tr><td>Backend pool</td><td>100; mỗi pool 1.200 target</td></tr>
    <tr><td>Routing rule</td><td>400</td></tr>
    <tr><td>Path-based rule mỗi URL map</td><td>100</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>Từ khóa <strong>"route based on URL"</strong>, <strong>"host multiple websites on one IP"</strong>, <strong>"SSL offload"</strong>, <strong>"cookie-based affinity"</strong>, <strong>"protect from SQL injection/XSS"</strong> ở phạm vi một region → <strong>Application Gateway</strong> (WAF_v2 khi có yêu cầu WAF).</div>
`
    },
    {
      id: 'how-appgw-works',
      unit: 'How Azure Application Gateway works',
      title: 'Application Gateway hoạt động như thế nào?',
      html: `
<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="Luồng request qua Application Gateway: client, frontend IP, listener, request routing rule, backend settings, backend pool, health probe">
  <rect class="box" x="10" y="30" width="100" height="64" rx="10"/>
  <text x="60" y="57" text-anchor="middle" class="t-b">Client</text>
  <text x="60" y="77" text-anchor="middle" class="t-sm t-mute">HTTP/HTTPS</text>

  <rect class="box-a" x="150" y="30" width="140" height="64" rx="10"/>
  <text x="220" y="57" text-anchor="middle" class="t-b">Frontend IP</text>
  <text x="220" y="77" text-anchor="middle" class="t-sm">public / private</text>

  <rect class="box-a" x="330" y="30" width="160" height="64" rx="10"/>
  <text x="410" y="57" text-anchor="middle" class="t-b">Listener</text>
  <text x="410" y="77" text-anchor="middle" class="t-sm">IP + port + protocol</text>

  <rect class="box-a" x="530" y="30" width="180" height="64" rx="10"/>
  <text x="620" y="57" text-anchor="middle" class="t-b">Request routing rule</text>
  <text x="620" y="77" text-anchor="middle" class="t-sm">Basic | Path-based</text>

  <rect class="box-a" x="530" y="160" width="180" height="64" rx="10"/>
  <text x="620" y="187" text-anchor="middle" class="t-b">Backend settings</text>
  <text x="620" y="207" text-anchor="middle" class="t-sm">port, protocol, affinity</text>

  <rect class="box-s" x="290" y="160" width="180" height="64" rx="10"/>
  <text x="380" y="187" text-anchor="middle" class="t-b">Backend pool</text>
  <text x="380" y="207" text-anchor="middle" class="t-sm">VM · VMSS · IP · FQDN</text>

  <rect class="box-w" x="50" y="160" width="170" height="64" rx="10"/>
  <text x="135" y="187" text-anchor="middle" class="t-b t-w">Health probe</text>
  <text x="135" y="207" text-anchor="middle" class="t-sm">mặc định: / · 200–399</text>

  <line class="ln-a" x1="110" y1="62" x2="146" y2="62" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="290" y1="62" x2="326" y2="62" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="490" y1="62" x2="526" y2="62" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="620" y1="94" x2="620" y2="156" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="530" y1="192" x2="474" y2="192" marker-end="url(#arr-a)"/>
  <line class="ln dash" x1="220" y1="192" x2="286" y2="192" marker-end="url(#arr)"/>
  <text x="253" y="183" text-anchor="middle" class="t-sm t-mute">kiểm tra</text>
  <text x="610" y="130" text-anchor="end" class="t-sm t-mute">redirect / rewrite (tùy chọn)</text>
</svg>
<figcaption>Hình 1. Request đi qua frontend IP → <strong>listener</strong> (nhận theo IP, port, protocol, host name) → <strong>rule</strong> (chọn đích) → <strong>backend settings</strong> (cách gửi tới backend) → <strong>backend pool</strong>. Health probe quyết định instance nào được nhận request.</figcaption>
</figure>

<h4>Các thành phần</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Chi tiết</th></tr></thead>
  <tbody>
    <tr><td><strong>Frontend IP</strong></td><td>Public IP, private IP hoặc cả hai. v2 dùng public IP Standard tĩnh. Có thể triển khai private-only (Network Isolation).</td></tr>
    <tr><td><strong>Listener</strong></td><td>Lắng nghe trên frontend IP + port + protocol (HTTP/HTTPS). <strong>Basic</strong>: mọi request tới cổng đó, bất kể host. <strong>Multi-site</strong>: chỉ request có host name khớp (hỗ trợ nhiều host name và wildcard như <code>*.contoso.com</code>). Listener HTTPS cần chứng chỉ (.pfx hoặc Key Vault).</td></tr>
    <tr><td><strong>Request routing rule</strong></td><td>Gắn listener với đích. <strong>Basic</strong>: mọi request của listener tới một backend pool. <strong>Path-based</strong>: URL path map chọn pool theo path, có pool mặc định cho path không khớp. v2 dùng <strong>priority</strong> để quyết định thứ tự xét rule.</td></tr>
    <tr><td><strong>Backend settings</strong> (trước đây là HTTP settings)</td><td>Protocol và port tới backend, cookie-based affinity, connection draining, request timeout, override host name (cần cho App Service), custom probe, trusted root certificate cho end-to-end TLS.</td></tr>
    <tr><td><strong>Backend pool</strong></td><td>Tập máy chủ nhận request. Trong pool, Application Gateway phân phối theo kiểu <strong>round-robin</strong> tới các instance khỏe.</td></tr>
    <tr><td><strong>Health probe</strong></td><td><em>Default probe</em> tự động khi không có custom probe: gửi request tới <code>&lt;protocol&gt;://127.0.0.1:&lt;port&gt;/</code> mỗi 30 giây, timeout 30 giây, unhealthy threshold 3, mã <strong>200–399</strong> là healthy. <em>Custom probe</em> cho phép đổi path, host, interval, threshold và mã trạng thái chấp nhận.</td></tr>
  </tbody>
</table>

<h4>Path-based routing và multi-site</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Hai listener multi-site: contoso dùng path-based rule chia theo /images, /api và pool mặc định; fabrikam dùng basic rule tới một pool">
  <rect class="box-a" x="10" y="60" width="200" height="56" rx="10"/>
  <text x="110" y="81" text-anchor="middle" class="t-sm t-mute">Listener multi-site</text>
  <text x="110" y="102" text-anchor="middle" class="t-b">www.contoso.com:443</text>
  <rect class="box-a" x="10" y="220" width="200" height="56" rx="10"/>
  <text x="110" y="241" text-anchor="middle" class="t-sm t-mute">Listener multi-site</text>
  <text x="110" y="262" text-anchor="middle" class="t-b">www.fabrikam.com:443</text>

  <rect class="box" x="250" y="60" width="170" height="56" rx="10"/>
  <text x="335" y="83" text-anchor="middle" class="t-b">Path-based rule</text>
  <text x="335" y="103" text-anchor="middle" class="t-sm t-mute">URL path map</text>
  <rect class="box" x="250" y="220" width="170" height="56" rx="10"/>
  <text x="335" y="253" text-anchor="middle" class="t-b">Basic rule</text>

  <rect class="box-s" x="490" y="10" width="220" height="44" rx="8"/>
  <text x="600" y="37" text-anchor="middle">/images/* → pool-images</text>
  <rect class="box-s" x="490" y="66" width="220" height="44" rx="8"/>
  <text x="600" y="93" text-anchor="middle">/api/* → pool-api</text>
  <rect class="box" x="490" y="122" width="220" height="44" rx="8"/>
  <text x="600" y="149" text-anchor="middle">(mặc định) → pool-web</text>
  <rect class="box-s" x="490" y="226" width="220" height="44" rx="8"/>
  <text x="600" y="253" text-anchor="middle">pool-fabrikam</text>

  <line class="ln-a" x1="210" y1="88" x2="246" y2="88" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="210" y1="248" x2="246" y2="248" marker-end="url(#arr-a)"/>
  <line class="ln" x1="420" y1="82" x2="486" y2="34" marker-end="url(#arr)"/>
  <line class="ln" x1="420" y1="88" x2="486" y2="88" marker-end="url(#arr)"/>
  <line class="ln dash" x1="420" y1="94" x2="486" y2="142" marker-end="url(#arr)"/>
  <line class="ln" x1="420" y1="248" x2="486" y2="248" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 2. Multi-site listener tách traffic theo <strong>host name</strong>; path-based rule tách tiếp theo <strong>URL path</strong>. Path không khớp mục nào sẽ đi tới backend pool mặc định của rule.</figcaption>
</figure>

<h4>TLS termination và end-to-end TLS</h4>
<div class="compare">
  <div><strong>TLS termination (offload)</strong>Chứng chỉ đặt trên listener HTTPS. Gateway giải mã, đọc request rồi gửi HTTP thường tới backend. Giảm tải CPU cho backend và cho phép WAF/định tuyến đọc nội dung.</div>
  <div><strong>End-to-end TLS</strong>Gateway giải mã, xử lý, rồi <strong>mã hóa lại</strong> khi gửi tới backend (backend settings dùng HTTPS). Với v2, nếu chứng chỉ backend do CA nổi tiếng cấp thì không cần upload; nếu tự ký/CA nội bộ thì upload <strong>trusted root certificate</strong>.</div>
</div>
<p>Muốn dùng chứng chỉ trong Key Vault, Application Gateway cần một <strong>user-assigned managed identity</strong> có quyền đọc secret trong Key Vault.</p>

<h4>WAF</h4>
<ul>
  <li>Dựa trên bộ quy tắc được Microsoft quản lý (Default Rule Set / OWASP Core Rule Set) cùng custom rules (chặn IP, geo-filter, rate limit).</li>
  <li>Hai chế độ: <strong>Detection</strong> (chỉ ghi log) và <strong>Prevention</strong> (chặn request vi phạm, trả 403).</li>
  <li>WAF policy gắn ở cấp gateway, cấp listener hoặc cấp path.</li>
</ul>

<h4>Autoscaling và subnet riêng</h4>
<ul>
  <li>v2 có hai chế độ: <strong>autoscaling</strong> (đặt minimum và maximum instance, tối đa 125) hoặc <strong>fixed capacity</strong>.</li>
  <li>Application Gateway cần <strong>subnet riêng</strong>: không chứa tài nguyên nào khác ngoài Application Gateway; không trộn v1 và v2 trong cùng subnet. Khuyến nghị <strong>/24</strong> cho v2 để đủ IP khi autoscale và bảo trì.</li>
  <li>NSG trên subnet phải cho phép inbound từ service tag <strong>GatewayManager</strong> tới cổng <strong>65200–65535</strong> (v2), giữ rule cho phép <strong>AzureLoadBalancer</strong> và không chặn outbound Internet.</li>
  <li>UDR ép 0.0.0.0/0 qua NVA (forced tunneling) <strong>không được hỗ trợ</strong> cho v2 triển khai thông thường.</li>
</ul>
<pre><code>az network application-gateway create -g rg1 -n agw1 --sku WAF_v2 \\
  --vnet-name vnet1 --subnet agw-subnet --public-ip-address agw-pip \\
  --min-capacity 2 --max-capacity 10 --priority 100 \\
  --servers 10.0.1.4 10.0.1.5 --waf-policy waf-pol1</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo Application Gateway v2 với listener, routing rule và path-based routing</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Chuẩn bị VNet có <strong>subnet riêng</strong> cho gateway (ví dụ <code>agw-subnet</code> 10.21.0.0/24) và subnet backend (<code>backend-subnet</code> 10.21.1.0/24). Sau đó mở:<br><span class="path">Azure portal › Application Gateways › + Create › Application Gateway</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create application gateway</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Frontends</span><span>Backends</span><span>Configuration</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-agw</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Application gateway name</label><span class="pv">agw-web</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">East US</span></div>
        <div class="pf"><label class="req">Tier</label><span class="pv sel">Standard V2</span></div>
        <div class="pf"><label>Autoscaling</label><span class="pv radio">Yes</span></div>
        <div class="pf"><label>Minimum instance count</label><span class="pv">2</span></div>
        <div class="pf"><label>Maximum instance count</label><span class="pv">10</span></div>
        <div class="pf"><label></label><span class="pv note">Nhãn các trường scaling có thể khác đôi chút giữa các phiên bản portal; bản chất là bật/tắt autoscaling, số instance tối thiểu và tối đa (maximum mặc định 10 nếu bỏ trống)</span></div>
        <div class="blade-sec">Configure virtual network</div>
        <div class="pf"><label class="req">Virtual network</label><span class="pv sel">vnet-agw</span></div>
        <div class="pf"><label class="req">Subnet</label><span class="pv sel">agw-subnet (10.21.0.0/24)</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn WAF V2 nếu cần Web Application Firewall. Subnet chỉ được chứa Application Gateway</span></div>
        <div class="pbtns"><span class="pbtn primary">Next : Frontends &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Frontends</strong>: <em>Frontend IP address type</em> = <strong>Public</strong>, <em>Public IP address</em> › <strong>Add new</strong> (<code>agw-pip</code>).</li>
    <li>Tab <strong>Backends</strong> › <em>Add a backend pool</em>. Tạo ba pool <code>pool-web</code>, <code>pool-images</code>, <code>pool-api</code>:
      <div class="blade">
        <div class="blade-title">Add a backend pool</div>
        <div class="pf"><label class="req">Name</label><span class="pv">pool-images</span></div>
        <div class="pf"><label>Add backend pool without targets</label><span class="pv radio">No</span></div>
        <div class="pf"><label>Target type</label><span class="pv sel">Virtual machine</span></div>
        <div class="pf"><label>Target</label><span class="pv sel">vm-images-nic</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span></div>
      </div>
    </li>
    <li>Tab <strong>Configuration</strong> › <em>Add a routing rule</em>. Đặt <em>Rule name</em> <code>rule-web</code>, <em>Priority</em> <code>100</code> (1 cao nhất, 20000 thấp nhất), rồi điền tab <strong>Listener</strong>:
      <div class="blade">
        <div class="blade-title">Add a routing rule</div>
        <div class="blade-tabs"><span class="on">Listener</span><span>Backend targets</span></div>
        <div class="pf"><label class="req">Listener name</label><span class="pv">lst-http</span></div>
        <div class="pf"><label class="req">Frontend IP</label><span class="pv sel">Public IPv4</span></div>
        <div class="pf"><label>Protocol</label><span class="pv radio">HTTP</span></div>
        <div class="pf"><label class="req">Port</label><span class="pv">80</span></div>
        <div class="pf"><label>Listener type</label><span class="pv radio">Basic</span></div>
        <div class="pf"><label></label><span class="pv note">Chọn HTTPS cần thêm chứng chỉ (.pfx hoặc Key Vault); chọn Multi site cần nhập host name</span></div>
      </div>
    </li>
    <li>Tab <strong>Backend targets</strong>: chọn pool mặc định và tạo backend settings:
      <div class="blade">
        <div class="blade-title">Add a routing rule › Backend targets</div>
        <div class="pf"><label>Target type</label><span class="pv radio">Backend pool</span></div>
        <div class="pf"><label class="req">Backend target</label><span class="pv sel">pool-web</span></div>
        <div class="pf"><label class="req">Backend settings</label><span class="pv sel">Add new › bs-http80</span></div>
        <div class="pf"><label></label><span class="pv note">Trong Add Backend setting: Backend settings name, Backend port 80; các tùy chọn affinity, draining, timeout, override host name để mặc định</span></div>
      </div>
    </li>
    <li>Cũng trên tab đó, mục <em>Path-based routing</em> › <strong>Add multiple targets to create a path-based rule</strong>:
      <div class="blade">
        <div class="blade-title">Path-based routing › Path based rules</div>
        <div class="pf"><label class="req">Path</label><span class="pv">/images/*</span></div>
        <div class="pf"><label class="req">Target name</label><span class="pv">images</span></div>
        <div class="pf"><label class="req">Backend settings</label><span class="pv sel">bs-http80</span></div>
        <div class="pf"><label class="req">Backend target</label><span class="pv sel">pool-images</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span></div>
      </div>
      Lặp lại cho <code>/api/*</code> → <code>pool-api</code>. Không cần rule <code>/*</code>: path không khớp tự đi tới pool mặc định. Bấm <strong>Add</strong>, rồi <strong>Review + create</strong> › <strong>Create</strong>.</li>
    <li>Sau khi triển khai, kiểm tra trạng thái backend tại trang <strong>Backend health</strong> của <code>agw-web</code> (hoặc <code>az network application-gateway show-backend-health</code>). Instance <em>Unhealthy</em> là nguyên nhân hàng đầu của lỗi 502.</li>
  </ol></div>
</div>
<div class="callout exam"><strong>Bẫy thi</strong>Lỗi <strong>502 Bad Gateway</strong> thường do backend không khỏe: probe fail, NSG/UDR chặn, backend không phản hồi trong request timeout, hoặc chứng chỉ backend không khớp khi dùng end-to-end TLS. Xem trang <strong>Backend health</strong> trước tiên.</div>
`
    },
    {
      id: 'when-to-use-appgw',
      unit: 'When to use Azure Application Gateway',
      title: 'Khi nào dùng Application Gateway?',
      html: `
<h4>Phù hợp khi</h4>
<ul>
  <li>Ứng dụng web <strong>HTTP/HTTPS</strong> trong <strong>một region</strong> cần định tuyến thông minh theo URL hoặc host.</li>
  <li>Cần <strong>WAF</strong> cho ứng dụng nằm trong VNet hoặc on-premises.</li>
  <li>Cần <strong>TLS offload</strong> tập trung, quản lý chứng chỉ trong Key Vault.</li>
  <li>Hợp nhất nhiều website trên một gateway (multi-site) để tiết kiệm chi phí.</li>
  <li>Cần <strong>session affinity</strong> bằng cookie (khác với Load Balancer chỉ có affinity theo IP).</li>
  <li>Làm ingress cho <strong>AKS</strong> (Application Gateway Ingress Controller) hoặc cổng vào cho App Service với <em>access restriction</em>.</li>
  <li>Ứng dụng nội bộ cần cân bằng tải L7 trên <strong>private IP</strong>.</li>
</ul>

<h4>Không phù hợp khi</h4>
<ul>
  <li>Giao thức <strong>không phải HTTP</strong> (RDP, SQL, UDP) → Azure Load Balancer.</li>
  <li>Người dùng <strong>toàn cầu</strong> cần tăng tốc, caching tại edge, failover đa region → <strong>Azure Front Door</strong> (có thể kết hợp Front Door phía trước Application Gateway).</li>
  <li>Chỉ cần định tuyến DNS tới endpoint ở nhiều region → <strong>Traffic Manager</strong>.</li>
</ul>

<h4>Tình huống mẫu</h4>
<table>
  <thead><tr><th>Yêu cầu</th><th>Cấu hình Application Gateway</th></tr></thead>
  <tbody>
    <tr><td>Chuyển mọi HTTP sang HTTPS</td><td>Listener HTTP:80 + rule redirect tới listener HTTPS:443</td></tr>
    <tr><td><code>contoso.com</code> và <code>fabrikam.com</code> dùng chung một public IP</td><td>Hai listener <strong>multi-site</strong> cùng port 443, mỗi listener một host name</td></tr>
    <tr><td><code>/video/*</code> tới VM có GPU</td><td>Rule <strong>path-based</strong> với URL path map</td></tr>
    <tr><td>Backend là App Service</td><td>Backend pool dùng FQDN của App Service, backend settings bật <strong>override host name</strong> (pick host name from backend target)</td></tr>
    <tr><td>Chặn traffic từ một quốc gia</td><td>WAF_v2 + custom rule geo-match</td></tr>
    <tr><td>Bảo trì một VM không làm rớt người dùng</td><td>Bật <strong>connection draining</strong> trong backend settings</td></tr>
  </tbody>
</table>

<h4>Chi phí v2</h4>
<p>v2 tính phí theo <strong>thời gian chạy cố định</strong> cộng với <strong>capacity unit</strong> tiêu thụ (dựa trên compute, số kết nối và throughput). Đặt minimum instance thấp giúp tiết kiệm khi traffic ít, nhưng khi traffic tăng đột biến cần thời gian để scale out; đặt minimum phù hợp với tải nền.</p>
<div class="callout exam"><strong>Góc thi</strong>"Cần cân bằng tải cho web app ở hai region và tự failover khi một region sập" → Application Gateway một mình <strong>không đủ</strong> vì là dịch vụ regional. Đáp án là <strong>Front Door</strong> (HTTP) hoặc <strong>Traffic Manager</strong> (DNS), có thể đặt trước Application Gateway ở mỗi region.</div>
`
    },
    {
      id: 'lb-comparison',
      extra: true,
      title: 'So sánh Load Balancer / App Gateway / Front Door / Traffic Manager',
      html: `
<p>Microsoft phân loại các dịch vụ phân phối tải theo hai trục: <strong>phạm vi</strong> (global hay regional) và <strong>loại traffic</strong> (HTTP(S) hay không phải HTTP).</p>
<table>
  <thead><tr><th></th><th>Azure Load Balancer</th><th>Application Gateway</th><th>Azure Front Door</th><th>Traffic Manager</th></tr></thead>
  <tbody>
    <tr><td>Tầng OSI</td><td>L4 (TCP/UDP)</td><td>L7 (HTTP/HTTPS)</td><td>L7 (HTTP/HTTPS)</td><td>DNS (không nằm trên đường dữ liệu)</td></tr>
    <tr><td>Phạm vi</td><td>Regional (Global tier cho cross-region)</td><td>Regional</td><td>Global (edge của Microsoft, anycast)</td><td>Global</td></tr>
    <tr><td>Cách hoạt động</td><td>Pass-through, hash 5-tuple</td><td>Reverse proxy trong VNet</td><td>Reverse proxy tại edge</td><td>Trả về DNS của endpoint phù hợp; client kết nối trực tiếp</td></tr>
    <tr><td>Path / host routing</td><td>Không</td><td>Có</td><td>Có</td><td>Không</td></tr>
    <tr><td>TLS offload</td><td>Không</td><td>Có</td><td>Có</td><td>Không</td></tr>
    <tr><td>WAF</td><td>Không</td><td>Có (WAF_v2)</td><td>Có</td><td>Không</td></tr>
    <tr><td>Caching / tăng tốc</td><td>Không</td><td>Không</td><td>Có (CDN, split TCP)</td><td>Không</td></tr>
    <tr><td>Session affinity</td><td>Client IP (2/3-tuple)</td><td>Cookie</td><td>Cookie</td><td>Không (phụ thuộc DNS cache)</td></tr>
    <tr><td>Backend</td><td>VM/VMSS/IP trong VNet</td><td>VM, VMSS, IP, FQDN, App Service, on-premises</td><td>Mọi endpoint public (Premium: Private Link origin)</td><td>Mọi endpoint public: Azure, endpoint ngoài, nested profile</td></tr>
    <tr><td>Failover giữa region</td><td>Chỉ Global tier</td><td>Không</td><td>Có, gần như tức thì</td><td>Có, phụ thuộc DNS TTL</td></tr>
  </tbody>
</table>

<h4>Traffic Manager routing methods</h4>
<p><strong>Priority</strong> (active/passive failover), <strong>Weighted</strong> (chia tỷ lệ, triển khai dần), <strong>Performance</strong> (endpoint có độ trễ thấp nhất), <strong>Geographic</strong> (theo vị trí người dùng, phục vụ chủ quyền dữ liệu), <strong>MultiValue</strong> (trả nhiều IP), <strong>Subnet</strong> (theo dải IP nguồn).</p>

<h4>Front Door tiers</h4>
<p><strong>Standard</strong> (phân phối nội dung, WAF cơ bản) và <strong>Premium</strong> (thêm managed WAF rules, bot protection, Private Link tới origin). Front Door (classic) đang trong lộ trình ngừng hỗ trợ, nên chọn Standard/Premium cho triển khai mới.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 330" role="img" aria-label="Ma trận chọn dịch vụ: trục ngang là không phải HTTP (tầng 4) và HTTP(S) (tầng 7), trục dọc là global và regional">
  <text x="285" y="32" text-anchor="middle" class="t-b">Không phải HTTP · tầng 4</text>
  <text x="575" y="32" text-anchor="middle" class="t-b">HTTP(S) · tầng 7</text>
  <text x="70" y="108" text-anchor="middle" class="t-b">Global</text>
  <text x="70" y="128" text-anchor="middle" class="t-sm t-mute">nhiều region</text>
  <text x="70" y="248" text-anchor="middle" class="t-b">Regional</text>
  <text x="70" y="268" text-anchor="middle" class="t-sm t-mute">một region</text>

  <rect class="box-e" x="150" y="50" width="270" height="130" rx="10"/>
  <text x="285" y="82" text-anchor="middle" class="t-b">Traffic Manager</text>
  <text x="285" y="102" text-anchor="middle" class="t-sm">định tuyến bằng DNS, mọi giao thức</text>
  <text x="285" y="138" text-anchor="middle" class="t-b">Load Balancer Global tier</text>
  <text x="285" y="158" text-anchor="middle" class="t-sm">anycast IP, cross-region, TCP/UDP</text>

  <rect class="box-a" x="440" y="50" width="270" height="130" rx="10"/>
  <text x="575" y="100" text-anchor="middle" class="t-b">Azure Front Door</text>
  <text x="575" y="120" text-anchor="middle" class="t-sm">reverse proxy tại edge, WAF,</text>
  <text x="575" y="138" text-anchor="middle" class="t-sm">caching, failover gần như tức thì</text>

  <rect class="box-s" x="150" y="190" width="270" height="130" rx="10"/>
  <text x="285" y="240" text-anchor="middle" class="t-b">Azure Load Balancer</text>
  <text x="285" y="260" text-anchor="middle" class="t-sm">TCP/UDP pass-through, 5-tuple hash</text>
  <text x="285" y="278" text-anchor="middle" class="t-sm">public hoặc internal</text>

  <rect class="box-w" x="440" y="190" width="270" height="130" rx="10"/>
  <text x="575" y="240" text-anchor="middle" class="t-b">Application Gateway</text>
  <text x="575" y="260" text-anchor="middle" class="t-sm">URL/host routing, TLS offload,</text>
  <text x="575" y="278" text-anchor="middle" class="t-sm">WAF_v2, backend private trong VNet</text>
</svg>
<figcaption>Hình 1. Hai câu hỏi đầu tiên khi chọn dịch vụ phân phối tải: traffic có phải HTTP(S) không, và người dùng/backend nằm ở một hay nhiều region. Traffic Manager cũng dùng được cho HTTP(S) đa region, nhưng không phải proxy nên không có WAF hay TLS offload.</figcaption>
</figure>

<h4>Cây quyết định</h4>
<ol class="steps">
  <li>Ứng dụng có phải HTTP(S) không? <strong>Không</strong> → regional: <strong>Load Balancer</strong>; global: <strong>Traffic Manager</strong> hoặc Load Balancer Global tier.</li>
  <li>Là HTTP(S) và người dùng <strong>toàn cầu</strong>, cần caching/tăng tốc/failover nhanh → <strong>Front Door</strong>.</li>
  <li>Là HTTP(S) trong <strong>một region</strong>, cần path routing, WAF, TLS offload, backend private → <strong>Application Gateway</strong>.</li>
  <li>Cần cả hai: Front Door ở edge + Application Gateway (hoặc Load Balancer) trong từng region.</li>
</ol>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="Kiến trúc kết hợp: Front Door toàn cầu phía trước Application Gateway ở hai region, mỗi region có internal load balancer và VMSS">
  <rect class="box" x="200" y="10" width="200" height="44" rx="10"/>
  <text x="300" y="37" text-anchor="middle" class="t-b">Người dùng toàn cầu</text>

  <rect class="box-a" x="180" y="84" width="240" height="50" rx="10"/>
  <text x="300" y="114" text-anchor="middle" class="t-b t-a">Azure Front Door + WAF</text>

  <rect class="zone" x="20" y="160" width="260" height="130" rx="12"/>
  <text x="36" y="176" class="t-sm t-mute">East US</text>
  <rect class="box-w" x="50" y="186" width="200" height="38" rx="8"/>
  <text x="150" y="210" text-anchor="middle" class="t-b">App Gateway</text>
  <rect class="box-s" x="50" y="246" width="200" height="38" rx="8"/>
  <text x="150" y="270" text-anchor="middle" class="t-b">ILB / VMSS</text>

  <rect class="zone" x="320" y="160" width="260" height="130" rx="12"/>
  <text x="336" y="176" class="t-sm t-mute">West Europe</text>
  <rect class="box-w" x="350" y="186" width="200" height="38" rx="8"/>
  <text x="450" y="210" text-anchor="middle" class="t-b">App Gateway</text>
  <rect class="box-s" x="350" y="246" width="200" height="38" rx="8"/>
  <text x="450" y="270" text-anchor="middle" class="t-b">ILB / VMSS</text>

  <line class="ln-a" x1="300" y1="54" x2="300" y2="80" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="250" y1="134" x2="160" y2="184" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="350" y1="134" x2="440" y2="184" marker-end="url(#arr-a)"/>
  <line class="ln" x1="150" y1="224" x2="150" y2="242" marker-end="url(#arr)"/>
  <line class="ln" x1="450" y1="224" x2="450" y2="242" marker-end="url(#arr)"/>

  <text x="600" y="114" class="t-sm t-mute">global · L7</text>
  <text x="600" y="210" class="t-sm t-mute">regional · L7</text>
  <text x="600" y="270" class="t-sm t-mute">regional · L4</text>
</svg>
<figcaption>Hình 2. Kết hợp nhiều tầng: Front Door ở edge lo failover giữa region và WAF toàn cầu; Application Gateway định tuyến L7 trong từng region; internal Load Balancer cân bằng L4 cho tầng bên trong.</figcaption>
</figure>

<div class="callout exam"><strong>Góc thi</strong>Các cặp hay bị nhầm: <strong>Traffic Manager</strong> không phải proxy nên không terminate TLS và không có WAF; <strong>Front Door</strong> là global còn <strong>Application Gateway</strong> là regional; <strong>Load Balancer</strong> không đọc URL. Câu "ứng dụng UDP ở nhiều region, định tuyến người dùng tới region gần nhất" → Traffic Manager (Performance) hoặc Load Balancer Global tier, không phải Front Door.</div>
`
    }
  ],
  keyFacts: [
    'Application Gateway là load balancer <strong>tầng 7 (HTTP/HTTPS)</strong>, <strong>regional</strong>, hoạt động như reverse proxy.',
    'SKU hiện hành: <strong>Standard_v2</strong> và <strong>WAF_v2</strong>; v1 (Standard/WAF) <strong>retire ngày 28/04/2026</strong>.',
    'Thành phần: <strong>frontend IP → listener → routing rule → backend settings → backend pool</strong>, kèm <strong>health probe</strong>.',
    'Listener <strong>Basic</strong> nhận mọi host; listener <strong>Multi-site</strong> lọc theo host name (hỗ trợ wildcard).',
    'Rule <strong>Basic</strong> gửi mọi request tới một pool; rule <strong>Path-based</strong> dùng URL path map.',
    'Cần <strong>subnet riêng</strong> (chỉ chứa Application Gateway); khuyến nghị <strong>/24</strong> cho v2; v2 tối đa <strong>125</strong> instance.',
    'NSG trên subnet v2 phải cho phép <strong>GatewayManager</strong> tới cổng <strong>65200–65535</strong> và không chặn AzureLoadBalancer, outbound Internet.',
    'Default probe: path <code>/</code>, mỗi 30 giây, mã <strong>200–399</strong> là healthy.',
    'WAF chế độ <strong>Detection</strong> (ghi log) và <strong>Prevention</strong> (chặn).',
    'End-to-end TLS: gateway mã hóa lại tới backend; với chứng chỉ backend không do CA nổi tiếng cấp, upload <strong>trusted root certificate</strong> (v2).',
    'Global HTTP → <strong>Front Door</strong>; global DNS mọi giao thức → <strong>Traffic Manager</strong>; regional L4 → <strong>Load Balancer</strong>; regional L7 → <strong>Application Gateway</strong>.'
  ],
  traps: [
    'Chọn Application Gateway cho failover đa region. Nó là dịch vụ <strong>regional</strong>; dùng Front Door hoặc Traffic Manager.',
    'Đặt VM hay tài nguyên khác chung subnet với Application Gateway. Subnet phải <strong>dành riêng</strong>.',
    'Chặn cổng 65200–65535 từ GatewayManager bằng NSG khiến gateway v2 không hoạt động đúng.',
    'Nghĩ Traffic Manager terminate TLS hoặc có WAF. Traffic Manager chỉ trả lời DNS.',
    'Dùng listener Basic khi cần nhiều website trên cùng port. Phải dùng listener <strong>Multi-site</strong>.',
    'Backend là App Service mà không bật override host name, khiến App Service trả 404 do host header sai.',
    'Ép 0.0.0.0/0 từ subnet Application Gateway v2 qua NVA (forced tunneling): không được hỗ trợ ở triển khai thông thường.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Tầng / phạm vi</td><td>L7 HTTP/HTTPS, regional, reverse proxy</td></tr>
    <tr><td>SKU</td><td>Standard_v2, WAF_v2 (Basic preview); v1 retired 28/04/2026</td></tr>
    <tr><td>Luồng xử lý</td><td>Frontend IP → Listener → Rule → Backend settings → Backend pool (+ probe)</td></tr>
    <tr><td>Listener</td><td>Basic (mọi host) · Multi-site (theo host name)</td></tr>
    <tr><td>Rule</td><td>Basic · Path-based (URL path map)</td></tr>
    <tr><td>Subnet</td><td>Riêng, khuyến nghị /24 (v2), tối đa 125 instance</td></tr>
    <tr><td>NSG v2</td><td>GatewayManager → 65200–65535; giữ AzureLoadBalancer; outbound Internet</td></tr>
    <tr><td>Default probe</td><td><code>/</code>, 30 giây, 200–399</td></tr>
    <tr><td>WAF</td><td>Detection / Prevention, managed + custom rules</td></tr>
    <tr><td>Chọn dịch vụ</td><td>Regional L4: LB · Regional L7: AppGW · Global L7: Front Door · Global DNS: Traffic Manager</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Application Gateway hoạt động ở tầng nào và phạm vi nào?', back: '<strong>Tầng 7</strong> (HTTP/HTTPS), <strong>regional</strong>.' },
    { front: 'SKU Application Gateway v1 retire khi nào?', back: '<strong>28/04/2026</strong>. Dùng Standard_v2 hoặc WAF_v2.' },
    { front: 'Thứ tự các thành phần xử lý request?', back: 'Frontend IP → Listener → Routing rule → Backend settings → Backend pool, kèm health probe.' },
    { front: 'Basic listener khác Multi-site listener?', back: 'Basic nhận mọi request tới IP:port; Multi-site chỉ nhận request có <strong>host name</strong> khớp.' },
    { front: 'Rule nào định tuyến /images/* và /api/* tới pool khác nhau?', back: '<strong>Path-based</strong> rule với URL path map.' },
    { front: 'Kích thước subnet khuyến nghị cho Application Gateway v2?', back: '<strong>/24</strong>, subnet dành riêng.' },
    { front: 'Số instance tối đa của v2?', back: '<strong>125</strong> (v1: 32).' },
    { front: 'NSG trên subnet App Gateway v2 phải cho phép gì?', back: 'Inbound từ <strong>GatewayManager</strong> tới cổng <strong>65200–65535</strong>, AzureLoadBalancer, và outbound Internet.' },
    { front: 'Default health probe coi mã nào là healthy?', back: '<strong>200–399</strong>.' },
    { front: 'Hai chế độ của WAF?', back: '<strong>Detection</strong> (chỉ log) và <strong>Prevention</strong> (chặn).' },
    { front: 'End-to-end TLS là gì?', back: 'Gateway giải mã request rồi <strong>mã hóa lại</strong> khi gửi tới backend qua HTTPS.' },
    { front: 'Application Gateway lấy chứng chỉ từ Key Vault bằng gì?', back: '<strong>User-assigned managed identity</strong> có quyền đọc secret.' },
    { front: 'Backend thấy IP nguồn nào khi đi qua Application Gateway?', back: 'IP của Application Gateway. IP client gốc nằm trong header <code>X-Forwarded-For</code>.' },
    { front: 'Dịch vụ cân bằng tải global cho HTTP có caching và WAF?', back: '<strong>Azure Front Door</strong>.' },
    { front: 'Dịch vụ cân bằng tải global dựa trên DNS, mọi giao thức?', back: '<strong>Traffic Manager</strong> (Priority, Weighted, Performance, Geographic, MultiValue, Subnet).' },
    { front: 'Affinity của Application Gateway dựa trên gì?', back: '<strong>Cookie</strong> (cookie-based affinity), khác Load Balancer dựa trên client IP.' }
  ],
  quiz: [
    {
      q: 'Công ty có một web app chạy trên VM ở East US. Request tới <code>/images/*</code> phải tới pool VM lưu trữ ảnh, request <code>/video/*</code> tới pool VM có GPU. Bạn nên dùng gì?',
      options: ['Azure Load Balancer Standard', 'Traffic Manager với routing Weighted', 'Application Gateway với path-based routing rule', 'Azure Load Balancer với inbound NAT rules'],
      answer: [2],
      explain: 'Path-based routing là tính năng L7 của Application Gateway. Load Balancer ở tầng 4 không đọc URL. Traffic Manager định tuyến bằng DNS theo hostname, không theo path.'
    },
    {
      q: 'Bạn cần host <code>contoso.com</code> và <code>fabrikam.com</code> trên cùng một Application Gateway, cùng public IP và cổng 443. Bạn cấu hình gì?',
      options: ['Hai listener Basic trên cổng 443', 'Hai listener Multi-site, mỗi listener một host name', 'Hai frontend public IP', 'Một rule path-based với hai path'],
      answer: [1],
      explain: 'Listener Multi-site phân biệt request theo host header, cho phép nhiều site dùng chung IP và cổng. Hai listener Basic không thể cùng IP:port. Thêm public IP là không cần thiết. Path-based xét path chứ không xét host.'
    },
    {
      q: 'Bạn chuẩn bị triển khai Application Gateway WAF_v2 vào VNet1. VNet1 có subnet AppSubnet chứa 4 VM web. Bạn nên đặt Application Gateway ở đâu?',
      options: ['Trong một subnet mới dành riêng cho Application Gateway, khuyến nghị /24', 'Trong AppSubnet cùng các VM web', 'Trong GatewaySubnet', 'Trong AzureFirewallSubnet'],
      answer: [0],
      explain: 'Application Gateway cần subnet dành riêng, không chứa tài nguyên khác; /24 được khuyến nghị cho v2. AppSubnet đã có VM. GatewaySubnet dành cho VPN/ExpressRoute gateway và AzureFirewallSubnet dành cho Azure Firewall.'
    },
    {
      q: 'Sau khi gắn NSG vào subnet của Application Gateway v2, gateway báo lỗi và backend health hiển thị Unknown. NSG có rule Deny All inbound ưu tiên 200 và chỉ cho phép TCP 443 từ Internet. Bạn cần thêm rule nào?',
      options: ['Allow inbound từ VirtualNetwork tới cổng 3389', 'Allow outbound tới Storage', 'Allow inbound từ Internet tới cổng 80', 'Allow inbound từ service tag GatewayManager tới cổng 65200–65535'],
      answer: [3],
      explain: 'Application Gateway v2 yêu cầu NSG cho phép GatewayManager tới cổng 65200–65535 cho hạ tầng; rule Deny All đã chặn traffic này. Cổng 3389 và 80 không liên quan đến hoạt động của gateway; outbound Storage không phải yêu cầu bắt buộc.'
    },
    {
      q: 'Ứng dụng web cần được bảo vệ khỏi SQL injection và cross-site scripting. Ứng dụng chạy trên VMSS trong một region. Giải pháp ít công sức nhất?',
      options: ['Application Gateway WAF_v2 ở chế độ Prevention', 'NSG chặn cổng 1433', 'Azure Load Balancer Standard với HTTPS probe', 'Traffic Manager với endpoint monitoring'],
      answer: [0],
      explain: 'WAF trên Application Gateway dùng bộ quy tắc được quản lý để phát hiện và chặn SQL injection, XSS; chế độ Prevention mới chặn thực sự. NSG lọc theo IP/cổng, không đọc nội dung HTTP. Load Balancer và Traffic Manager không có WAF.'
    },
    {
      q: 'Bạn bật WAF trên Application Gateway và muốn đánh giá các request bị phát hiện trong một tuần mà không chặn người dùng thật. Bạn chọn chế độ nào?',
      options: ['Prevention', 'Detection', 'Tắt WAF và dùng NSG flow logs', 'Prevention với custom rule Allow All'],
      answer: [1],
      explain: 'Detection ghi log các request khớp quy tắc nhưng không chặn. Prevention sẽ chặn. NSG flow logs không thấy nội dung HTTP. Thêm rule Allow All làm mất ý nghĩa đánh giá.'
    },
    {
      q: 'Người dùng ở châu Âu và châu Á truy cập một website chạy ở West Europe và Southeast Asia. Bạn cần định tuyến người dùng tới region gần nhất, cache nội dung tĩnh tại edge và có WAF. Bạn chọn dịch vụ nào?',
      options: ['Application Gateway WAF_v2', 'Traffic Manager với routing Performance', 'Azure Load Balancer Global tier', 'Azure Front Door Premium'],
      answer: [3],
      explain: 'Front Door là dịch vụ global L7 có caching, WAF và định tuyến tới origin gần nhất. Application Gateway chỉ regional. Traffic Manager chỉ định tuyến DNS, không cache và không có WAF. Load Balancer Global tier là L4.'
    },
    {
      q: 'Bạn cần failover active/passive giữa hai region cho một ứng dụng TCP tùy chỉnh (không phải HTTP) dựa trên DNS. Bạn dùng gì?',
      options: ['Traffic Manager với routing Priority', 'Azure Front Door', 'Application Gateway', 'Application Gateway với hai backend pool'],
      answer: [0],
      explain: 'Traffic Manager hoạt động ở tầng DNS nên hỗ trợ mọi giao thức; routing Priority tạo active/passive. Front Door và Application Gateway chỉ xử lý HTTP(S), và Application Gateway là regional.'
    },
    {
      q: 'Backend pool của Application Gateway trỏ tới một App Service (<code>app1.azurewebsites.net</code>). Mọi request trả về 404 từ App Service. Bạn cần sửa gì?',
      options: ['Thêm App Service vào cùng subnet với gateway', 'Đổi listener sang Basic', 'Bật override host name (pick host name from backend target) trong backend settings', 'Tắt health probe'],
      answer: [2],
      explain: 'App Service là dịch vụ multi-tenant cần host header đúng; override host name khiến gateway gửi host là app1.azurewebsites.net. Không thể đặt App Service vào subnet của gateway. Kiểu listener không ảnh hưởng host header gửi tới backend. Tắt probe không sửa lỗi 404.'
    },
    {
      q: 'Yêu cầu bảo mật: traffic phải được mã hóa từ client tới Application Gateway và từ Application Gateway tới VM backend, đồng thời WAF vẫn kiểm tra được nội dung. Bạn cấu hình gì? (Chọn 2)',
      options: ['Listener HTTPS với chứng chỉ trên Application Gateway', 'Backend settings dùng protocol HTTPS (end-to-end TLS)', 'Listener HTTP và backend settings HTTP', 'Thay Application Gateway bằng Traffic Manager'],
      answer: [0, 1],
      explain: 'Listener HTTPS terminate TLS để WAF đọc request; backend settings HTTPS mã hóa lại tới backend, tạo end-to-end TLS. Dùng HTTP ở bất kỳ chặng nào vi phạm yêu cầu. Traffic Manager không xử lý TLS hay WAF.'
    },
    {
      q: 'Phát biểu nào về Application Gateway v2 là ĐÚNG? (Chọn 2)',
      options: ['Hỗ trợ autoscaling và zone redundancy', 'Có thể đặt chung subnet với Application Gateway v1', 'Hỗ trợ tối đa 125 instance', 'Là dịch vụ global như Front Door'],
      answer: [0, 2],
      explain: 'v2 hỗ trợ autoscaling, zone redundancy và tối đa 125 instance. Không được trộn v1 và v2 trong cùng subnet. Application Gateway là dịch vụ regional.'
    },
    {
      q: 'Bạn cần chuyển mọi request HTTP (cổng 80) sang HTTPS (cổng 443) trên Application Gateway. Bạn cấu hình gì?',
      options: ['Một health probe HTTPS', 'Inbound NAT rule 80 → 443', 'Rewrite header Host', 'Listener HTTP:80 với routing rule kiểu redirect tới listener HTTPS:443'],
      answer: [3],
      explain: 'Redirection của Application Gateway gắn listener nguồn với listener đích. Probe chỉ kiểm tra sức khỏe. Inbound NAT rule là khái niệm của Load Balancer. Rewrite header không đổi giao thức của client.'
    },
    {
      q: 'Người dùng phản ánh lỗi 502 Bad Gateway khi truy cập qua Application Gateway. Bạn nên kiểm tra gì đầu tiên?',
      options: ['Trang Backend health của Application Gateway', 'Bảng route của GatewaySubnet', 'Cấu hình Traffic Manager', 'Activity log của subscription'],
      answer: [0],
      explain: '502 thường xảy ra khi gateway không kết nối được backend khỏe; Backend health cho biết instance nào unhealthy và lý do. GatewaySubnet không liên quan đến Application Gateway. Traffic Manager không có trong kiến trúc. Activity log chỉ ghi thao tác quản trị.'
    },
    {
      q: 'Ứng dụng lưu giỏ hàng trong bộ nhớ của từng web server. Bạn cần mỗi người dùng luôn được đưa về cùng server qua Application Gateway, kể cả khi nhiều người dùng đi chung một proxy NAT. Bạn bật gì?',
      options: ['Session persistence Client IP', 'Cookie-based affinity trong backend settings', 'Connection draining', 'Multi-site listener'],
      answer: [1],
      explain: 'Cookie-based affinity phân biệt từng phiên trình duyệt bằng cookie, không bị ảnh hưởng bởi NAT. Session persistence Client IP là tùy chọn của Load Balancer và sẽ dồn mọi người dùng sau cùng một IP về một server. Connection draining và multi-site listener không tạo affinity.'
    }
  ]
});

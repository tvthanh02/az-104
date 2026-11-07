AZ.addModule({
  id: 'p5m4',
  summary: 'Azure App Service là nền tảng PaaS để chạy web app, API và container mà không phải quản lý máy chủ. Đề AZ-104 hỏi rất nhiều về <strong>tier của App Service plan</strong> (tính năng nào cần Standard trở lên), <strong>deployment slot và swap</strong>, custom domain, chứng chỉ TLS, backup và networking (VNet integration vs private endpoint).',
  objectives: [
    'Chọn đúng tier App Service plan (Free, Shared, Basic, Standard, Premium, Isolated) theo yêu cầu tính năng và chi phí',
    'Tạo web app với runtime stack hoặc container trên Windows/Linux và triển khai bằng Deployment Center, GitHub Actions hoặc zip deploy',
    'Cấu hình deployment slot, swap, swap with preview, auto swap, traffic routing và sticky setting',
    'Bảo mật app bằng Easy Auth, managed identity, HTTPS Only, TLS tối thiểu, access restrictions',
    'Gắn custom domain (CNAME/A + TXT asuid), chứng chỉ managed miễn phí, cấu hình backup/restore',
    'Phân biệt VNet integration (outbound) với private endpoint (inbound) và dùng Application Insights để giám sát'
  ],
  sections: [
    {
      id: 'implement-app-service',
      unit: 'Implement Azure App Service',
      title: 'App Service và App Service plan',
      html: `
<p><strong>Azure App Service</strong> là dịch vụ PaaS dựa trên HTTP để host web app, REST API và back end cho mobile. Microsoft lo hệ điều hành, vá lỗi, cân bằng tải và hạ tầng; bạn chỉ lo code hoặc container. App Service chạy được trên <strong>Windows</strong> và <strong>Linux</strong>, hỗ trợ .NET, Java, Node.js, Python, PHP và cả <strong>custom container</strong> (Web App for Containers).</p>

<h4>App Service plan: "máy chủ" mà bạn thuê</h4>
<p>Mỗi app chạy trong một <strong>App Service plan</strong>. Plan xác định <strong>region</strong>, <strong>hệ điều hành</strong>, <strong>số lượng và kích thước VM worker</strong>, và <strong>pricing tier</strong>. Mọi app trong cùng plan dùng chung tài nguyên compute đó; khi scale out plan, <em>tất cả</em> app trong plan được nhân bản lên các instance mới. Bạn trả tiền theo plan, không theo số app.</p>

<table>
  <thead><tr><th>Tier</th><th>Đặc điểm</th><th>Tính năng chính</th></tr></thead>
  <tbody>
    <tr><td><strong>Free (F1)</strong></td><td>Worker dùng chung, có hạn mức CPU/ngày</td><td>Không custom domain, không SLA, tối đa 10 app/plan. Dùng thử, học tập.</td></tr>
    <tr><td><strong>Shared (D1)</strong></td><td>Worker dùng chung, chỉ Windows</td><td>Có custom domain nhưng <strong>không</strong> có TLS binding.</td></tr>
    <tr><td><strong>Basic (B1–B3)</strong></td><td>VM dành riêng, tối đa 3 instance (scale thủ công)</td><td>Custom domain + SNI SSL, backup, VNet integration. <strong>Không</strong> có deployment slot, không autoscale.</td></tr>
    <tr><td><strong>Standard (S1–S3)</strong></td><td>Tối đa 10 instance</td><td><strong>Autoscale</strong>, <strong>5 deployment slot</strong>, backup, IP SSL. Mức tối thiểu cho production.</td></tr>
    <tr><td><strong>Premium (v3/v4)</strong></td><td>VM mạnh hơn, tối đa 30 instance</td><td><strong>20 slot</strong>, hiệu năng cao, hỗ trợ zone redundancy.</td></tr>
    <tr><td><strong>Isolated (v2)</strong></td><td>Chạy trong <strong>App Service Environment (ASE)</strong> trong VNet của bạn</td><td>Single-tenant, tối đa 100 instance, cô lập mạng hoàn toàn.</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Scale up và scale out</strong><strong>Scale up</strong> = đổi tier/kích thước (S1 lên P1v3) để có thêm CPU, RAM hoặc tính năng. <strong>Scale out</strong> = tăng số instance. Autoscale theo metric (CPU, HTTP queue…) hoặc theo lịch chỉ có từ <strong>Standard</strong> trở lên.</div>

<h4>Khi nào gom app vào chung một plan?</h4>
<ul>
  <li>Các app nhỏ, tải thấp, cùng region và cùng OS: gom chung để tiết kiệm.</li>
  <li>Tách plan khi một app cần scale độc lập, cần tier khác, hoặc tải lớn có thể "bóp" app khác.</li>
  <li>App và plan phải cùng region. Có thể di chuyển app sang plan khác nếu plan đích cùng resource group, region và cùng "webspace" (deployment unit).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi kiểu "cần deployment slot / autoscale với chi phí thấp nhất" thì đáp án là <strong>Standard (S1)</strong>. "Cần custom domain với chi phí thấp nhất" thì <strong>Shared (D1)</strong> là đủ, nhưng muốn có <strong>HTTPS cho custom domain</strong> thì tối thiểu <strong>Basic (B1)</strong>. Linux không có tier Shared.</div>
`
    },
    {
      id: 'create-app',
      unit: 'Create an app with App Service',
      title: 'Tạo web app: runtime stack, OS và container',
      html: `
<p>Khi tạo web app trong portal (<em>Create a resource &gt; Web App</em>), các lựa chọn quan trọng gồm:</p>
<ul>
  <li><strong>Name</strong>: phải duy nhất toàn cầu, tạo ra URL mặc định <code>&lt;tên&gt;.azurewebsites.net</code> (các app mới có thể nhận hostname mặc định dạng có thêm hash và region, nhưng vẫn thuộc miền azurewebsites.net).</li>
  <li><strong>Publish</strong>: <em>Code</em>, <em>Container</em> hoặc <em>Static Web App</em>.</li>
  <li><strong>Runtime stack</strong>: .NET, Java, Node.js, Python, PHP… Danh sách phiên bản khác nhau giữa Windows và Linux.</li>
  <li><strong>Operating System</strong>: Windows hoặc Linux. Một App Service plan chỉ chứa một loại OS.</li>
  <li><strong>Region</strong> và <strong>App Service plan</strong> (chọn có sẵn hoặc tạo mới với tier phù hợp).</li>
  <li>Các tab khác: Deployment (bật GitHub Actions ngay khi tạo), Networking, Monitoring (Application Insights).</li>
</ul>

<h4>Tạo bằng Azure CLI</h4>
<pre><code># Plan Linux tier S1
az appservice plan create -g rg-web -n plan-web --sku S1 --is-linux

# Xem runtime hợp lệ
az webapp list-runtimes --os linux

# Web app chạy Node.js
az webapp create -g rg-web -p plan-web -n contoso-web01 --runtime "NODE:20-lts"

# Web app chạy container từ Azure Container Registry
az webapp create -g rg-web -p plan-web -n contoso-api01 \\
  --deployment-container-image-name myacr.azurecr.io/api:v1</code></pre>

<h4>Web App for Containers</h4>
<p>App Service chạy được image từ Docker Hub, Azure Container Registry hoặc registry riêng. Khi kéo image từ ACR, nên dùng <strong>managed identity</strong> của web app với vai trò <strong>AcrPull</strong> thay vì admin user. Có thể bật <em>continuous deployment</em> để App Service tự kéo image mới khi registry gửi webhook.</p>

<h4>Cấu hình app (Environment variables / Configuration)</h4>
<ul>
  <li><strong>App settings</strong>: được đưa vào app dưới dạng biến môi trường, ghi đè giá trị trong <code>web.config</code>/<code>appsettings.json</code>.</li>
  <li><strong>Connection strings</strong>: tương tự, có kiểu (SQLAzure, MySQL, Custom…).</li>
  <li><strong>General settings</strong>: phiên bản stack, 32/64-bit, <strong>Always On</strong> (giữ app luôn nóng, cần Basic trở lên), WebSockets, HTTP version, FTP state.</li>
  <li><strong>Key Vault reference</strong>: giá trị app setting dạng <code>@Microsoft.KeyVault(SecretUri=...)</code>, app đọc secret qua managed identity.</li>
</ul>
<pre><code>az webapp config appsettings set -g rg-web -n contoso-web01 --settings ENV=prod LOG_LEVEL=info</code></pre>

<div class="callout warn"><strong>Lưu ý</strong>Thay đổi app setting hoặc connection string sẽ <strong>khởi động lại app</strong>. Trên Linux, App Service gửi request tới cổng mà container lắng nghe; nếu container không dùng cổng 80/8080 thì đặt app setting <code>WEBSITES_PORT</code>.</div>

<div class="callout exam"><strong>Góc thi</strong>Không thể đặt app Windows và app Linux trong <strong>cùng một</strong> App Service plan. Nếu đề yêu cầu chạy một app Linux và một app Windows thì cần <strong>ít nhất 2 plan</strong>.</div>
`
    },
    {
      id: 'cicd',
      unit: 'Explore continuous integration and deployment',
      title: 'CI/CD và các phương thức triển khai',
      html: `
<p>App Service hỗ trợ nhiều cách đưa code lên, chia thành hai nhóm: <strong>triển khai liên tục (CI/CD)</strong> từ kho mã nguồn và <strong>triển khai thủ công/đẩy file</strong>.</p>

<h4>Deployment Center</h4>
<p>Mục <em>Deployment &gt; Deployment Center</em> của web app cho phép nối với nguồn mã:</p>
<table>
  <thead><tr><th>Nguồn</th><th>Build provider</th></tr></thead>
  <tbody>
    <tr><td><strong>GitHub</strong></td><td><strong>GitHub Actions</strong> (portal tự sinh file workflow trong <code>.github/workflows</code>) hoặc App Service build service (Kudu)</td></tr>
    <tr><td><strong>Azure Repos</strong></td><td>Azure Pipelines hoặc App Service build service</td></tr>
    <tr><td>Bitbucket, Local Git, External Git</td><td>App Service build service (Kudu)</td></tr>
  </tbody>
</table>
<p>Mỗi lần push lên nhánh đã chọn sẽ tự build và triển khai. Có thể trỏ CI/CD vào một <strong>deployment slot</strong> (ví dụ staging) thay vì production, kết hợp auto swap.</p>

<h4>GitHub Actions xác thực thế nào?</h4>
<ul>
  <li><strong>Publish profile</strong>: file XML chứa thông tin đăng nhập triển khai (dùng basic auth).</li>
  <li><strong>Service principal</strong> hoặc <strong>OpenID Connect (federated credential)</strong> với user-assigned managed identity: khuyến nghị vì không lưu secret lâu dài.</li>
</ul>

<h4>Triển khai thủ công</h4>
<ul>
  <li><strong>Zip deploy</strong>: đẩy file .zip, Kudu giải nén vào <code>wwwroot</code>; có thể tự build nếu bật <code>SCM_DO_BUILD_DURING_DEPLOYMENT</code>.</li>
  <li><strong>Run from package</strong>: app setting <code>WEBSITE_RUN_FROM_PACKAGE=1</code>, gói zip được mount read-only, triển khai nguyên tử và khởi động nhanh hơn.</li>
  <li><strong>FTP/FTPS</strong>: cách cũ; nên đặt FTP state = <em>FTPS only</em> hoặc <em>Disabled</em>.</li>
  <li>Visual Studio / VS Code, Azure CLI, Azure Pipelines, ARM/Bicep.</li>
</ul>
<pre><code># Zip deploy bằng CLI
az webapp deploy -g rg-web -n contoso-web01 --src-path ./app.zip --type zip

# Triển khai vào slot staging
az webapp deploy -g rg-web -n contoso-web01 --slot staging --src-path ./app.zip --type zip

# Cấu hình GitHub Actions từ CLI
az webapp deployment github-actions add -g rg-web -n contoso-web01 \\
  --repo "contoso/webapp" --branch main --login-with-github</code></pre>

<div class="callout tip"><strong>Basic auth publishing credentials</strong>FTP và Web Deploy dùng "basic authentication". Có thể <strong>tắt</strong> SCM/FTP basic auth trong <em>Configuration &gt; General settings</em> để bắt buộc dùng Microsoft Entra ID. Khi đã tắt, publish profile không còn dùng được, nên GitHub Actions phải chuyển sang OIDC/service principal.</div>

<div class="callout exam"><strong>Góc thi</strong>Yêu cầu "mỗi commit lên nhánh main tự động triển khai lên web app, ít công sức nhất" thì chọn <strong>Deployment Center với GitHub Actions</strong>. Yêu cầu "kiểm thử bản mới trước khi đưa vào production, không downtime" thì triển khai vào <strong>staging slot</strong> rồi <strong>swap</strong>.</div>
`
    },
    {
      id: 'deployment-slots',
      unit: 'Create deployment slots',
      title: 'Deployment slot: khái niệm và cơ chế swap',
      html: `
<p><strong>Deployment slot</strong> là một app "sống" thực sự với hostname riêng (<code>&lt;app&gt;-&lt;slot&gt;.azurewebsites.net</code>), chạy trên <strong>cùng App Service plan</strong> với production. Bạn triển khai bản mới vào slot (ví dụ <code>staging</code>), kiểm thử, rồi <strong>swap</strong> với production.</p>

<h4>Yêu cầu và giới hạn</h4>
<ul>
  <li>Chỉ có từ tier <strong>Standard</strong> trở lên: Standard <strong>5 slot</strong>, Premium <strong>20 slot</strong>, Isolated <strong>20 slot</strong>. Basic/Free/Shared không có slot.</li>
  <li>Slot không tính phí riêng, nhưng dùng chung CPU/RAM của plan.</li>
  <li>Không thể hạ tier xuống mức không đủ số slot đang dùng (ví dụ có 6 slot thì không hạ xuống Standard được).</li>
</ul>

<h4>Lợi ích của swap</h4>
<ul>
  <li><strong>Không downtime</strong>: các instance của slot nguồn được làm nóng (warm up) trước khi chuyển routing.</li>
  <li><strong>Rollback nhanh</strong>: sau swap, slot staging giữ bản production cũ (last known good). Có lỗi thì swap lại ngay.</li>
</ul>

<h4>Trình tự swap (staging vào production)</h4>
<ol class="steps">
  <li>Áp dụng các setting <strong>slot-specific</strong> của slot đích (production) lên tất cả instance của slot nguồn, kèm cài đặt continuous deployment và authentication. Việc này làm slot nguồn khởi động lại. (Với <em>swap with preview</em>, thao tác dừng ở đây để bạn kiểm tra.)</li>
  <li>Chờ mọi instance của slot nguồn khởi động xong; nếu một instance lỗi, swap bị hoàn tác.</li>
  <li>Làm nóng: gửi HTTP request tới root (hoặc đường dẫn trong <code>applicationInitialization</code> / <code>WEBSITE_SWAP_WARMUP_PING_PATH</code>).</li>
  <li>Đổi routing rule giữa hai slot: production giờ phục vụ bản đã được làm nóng.</li>
  <li>Slot nguồn (giờ chứa bản cũ) được áp setting và khởi động lại.</li>
</ol>

<h4>Setting nào đi theo nội dung, setting nào ở lại slot?</h4>
<div class="compare">
  <div><strong>Được swap (đi theo app)</strong>Phiên bản framework/stack, 32/64-bit, WebSockets, <strong>app settings và connection strings</strong> (trừ khi đánh dấu sticky), handler mappings, public certificates, WebJobs content, hybrid connections, service endpoints, path mappings.</div>
  <div><strong>Không swap (ở lại slot)</strong>Publishing endpoints, <strong>custom domain</strong>, chứng chỉ private và TLS binding, <strong>scale settings</strong>, WebJobs scheduler, <strong>IP restrictions</strong>, <strong>Always On</strong>, diagnostic log settings, CORS, <strong>managed identity</strong>, <strong>VNet integration</strong>, HTTPS Only/TLS version, setting có hậu tố <code>_EXTENSION_VERSION</code>.</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Swap giữa slot production và slot staging: code và setting thường đổi chỗ, setting gắn với slot ở lại">
  <rect class="box-a" x="20" y="10" width="280" height="270" rx="12"/>
  <text x="160" y="36" text-anchor="middle" class="t-b t-a">Slot production</text>
  <text x="160" y="54" text-anchor="middle" class="t-sm t-mute">contoso-web01.azurewebsites.net</text>
  <rect class="box-s" x="40" y="72" width="240" height="96" rx="8"/>
  <text x="160" y="98" text-anchor="middle" class="t-b">Code v1</text>
  <text x="160" y="120" text-anchor="middle" class="t-sm">app settings, connection strings</text>
  <text x="160" y="138" text-anchor="middle" class="t-sm t-mute">(không đánh dấu slot setting)</text>
  <text x="160" y="156" text-anchor="middle" class="t-sm t-s">đi theo nội dung khi swap</text>
  <rect class="box-w" x="40" y="182" width="240" height="84" rx="8"/>
  <text x="160" y="206" text-anchor="middle" class="t-b">Ở lại slot</text>
  <text x="160" y="226" text-anchor="middle" class="t-sm">custom domain, TLS binding, scale</text>
  <text x="160" y="244" text-anchor="middle" class="t-sm">setting có Deployment slot setting</text>

  <rect class="box" x="420" y="10" width="280" height="270" rx="12"/>
  <text x="560" y="36" text-anchor="middle" class="t-b">Slot staging</text>
  <text x="560" y="54" text-anchor="middle" class="t-sm t-mute">contoso-web01-staging.azurewebsites.net</text>
  <rect class="box-s" x="440" y="72" width="240" height="96" rx="8"/>
  <text x="560" y="98" text-anchor="middle" class="t-b">Code v2</text>
  <text x="560" y="120" text-anchor="middle" class="t-sm">app settings, connection strings</text>
  <text x="560" y="138" text-anchor="middle" class="t-sm t-mute">(không đánh dấu slot setting)</text>
  <text x="560" y="156" text-anchor="middle" class="t-sm t-s">đi theo nội dung khi swap</text>
  <rect class="box-w" x="440" y="182" width="240" height="84" rx="8"/>
  <text x="560" y="206" text-anchor="middle" class="t-b">Ở lại slot</text>
  <text x="560" y="226" text-anchor="middle" class="t-sm">custom domain, TLS binding, scale</text>
  <text x="560" y="244" text-anchor="middle" class="t-sm">setting có Deployment slot setting</text>

  <text x="360" y="98" text-anchor="middle" class="t-b t-a">SWAP</text>
  <line class="ln-a" x1="280" y1="110" x2="436" y2="110" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="440" y1="134" x2="284" y2="134" marker-end="url(#arr-a)"/>
  <text x="360" y="154" text-anchor="middle" class="t-sm t-mute">đổi routing</text>
  <text x="360" y="228" text-anchor="middle" class="t-sm t-x">không đổi chỗ</text>
</svg>
<figcaption>Hình 1. Khi swap, phần xanh lá (code cùng app settings/connection strings thường) đổi chỗ giữa hai slot; phần vàng (custom domain, TLS binding, scale, setting được đánh dấu <strong>Deployment slot setting</strong>) nằm yên ở slot. Sau swap, production chạy v2 còn staging giữ v1 để rollback.</figcaption>
</figure>

<div class="callout exam"><strong>Góc thi: sticky setting</strong>Muốn app setting (ví dụ chuỗi kết nối tới DB test) <strong>ở lại slot</strong> khi swap, tích ô <strong>Deployment slot setting</strong> cho setting đó. Đề hay hỏi: "Sau khi swap, production lại trỏ vào database test. Phải làm gì?" Đáp án: đánh dấu connection string là <strong>deployment slot setting</strong>.</div>
`
    },
    {
      id: 'add-slots',
      unit: 'Add deployment slots',
      title: 'Thêm slot, swap with preview, auto swap và traffic routing',
      html: `
<h4>Tạo slot</h4>
<p>Portal: <em>Deployment &gt; Deployment slots &gt; Add slot</em>. Có thể <strong>clone configuration</strong> từ slot khác (app settings, connection strings, phiên bản stack…), nhưng <strong>nội dung (code) không được clone</strong>: slot mới trống, bạn phải triển khai vào đó.</p>
<pre><code># CLI
az webapp deployment slot create -g rg-web -n contoso-web01 --slot staging --configuration-source contoso-web01

# PowerShell
New-AzWebAppSlot -ResourceGroupName rg-web -Name contoso-web01 -Slot staging -AppServicePlan plan-web</code></pre>

<h4>Swap thường và swap with preview</h4>
<pre><code># Swap ngay
az webapp deployment slot swap -g rg-web -n contoso-web01 --slot staging --target-slot production

# Swap with preview (multi-phase): giai đoạn 1 áp setting production lên staging
az webapp deployment slot swap -g rg-web -n contoso-web01 --slot staging --target-slot production --action preview
# Hoàn tất
az webapp deployment slot swap -g rg-web -n contoso-web01 --slot staging --target-slot production --action swap
# Hủy
az webapp deployment slot swap -g rg-web -n contoso-web01 --slot staging --target-slot production --action reset

# PowerShell
Switch-AzWebAppSlot -ResourceGroupName rg-web -Name contoso-web01 -SourceSlotName staging -DestinationSlotName production</code></pre>
<p><strong>Swap with preview</strong> dừng sau bước áp setting của production lên staging, cho phép bạn kiểm tra staging <em>với cấu hình production</em> trước khi hoàn tất. Không dùng được khi một trong hai slot bật App Service authentication.</p>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo slot staging, giữ sticky setting và swap</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở web app (plan Standard trở lên), vào trang Deployment slots và bấm Add:<br><span class="path">Azure portal › App Services › contoso-web01 › Deployment › Deployment slots › + Add</span></li>
    <li>Điền hộp thoại <strong>Add Slot</strong> rồi bấm <strong>Add</strong>:
      <div class="blade">
        <div class="blade-title">Add Slot</div>
        <div class="pf"><label class="req">Name</label><span class="pv">staging</span></div>
        <div class="pf"><label></label><span class="pv note">Hostname: contoso-web01-staging.azurewebsites.net</span></div>
        <div class="pf"><label>Clone settings from</label><span class="pv sel">contoso-web01</span></div>
        <div class="pf"><label></label><span class="pv note">Chỉ clone cấu hình, slot mới không có code</span></div>
        <div class="pbtns"><span class="pbtn primary">Add</span><span class="pbtn">Close</span></div>
      </div>
    </li>
    <li>Triển khai bản mới vào slot (Deployment Center của slot, hoặc <code>az webapp deploy ... --slot staging</code>). Slot mới có cột <strong>Traffic %</strong> mặc định là 0.</li>
    <li>Giữ connection string trỏ DB test ở lại staging: mở slot staging, vào <em>Settings › Environment variables</em>, sửa setting và tích ô sticky:
      <div class="blade">
        <div class="blade-title">App setting (hộp thoại Add / chỉnh sửa)</div>
        <div class="pf"><label class="req">Name</label><span class="pv">DB_CONNECTION</span></div>
        <div class="pf"><label class="req">Value</label><span class="pv">Server=sql-test.contoso.local;…</span></div>
        <div class="pf"><label>Deployment slot setting</label><span class="pv chk">Bật</span></div>
        <div class="pbtns"><span class="pbtn primary">Apply</span><span class="pbtn">Cancel</span></div>
      </div>
    </li>
    <li>Quay lại <em>Deployment slots</em> của app, bấm <strong>Swap</strong>. Chọn nguồn và đích, xem hai tab <strong>Source slot changes</strong> / <strong>Target slot changes</strong>:
      <div class="blade">
        <div class="blade-title">Swap</div>
        <div class="pf"><label class="req">Source</label><span class="pv sel">contoso-web01-staging</span></div>
        <div class="pf"><label class="req">Target</label><span class="pv sel">contoso-web01 (PRODUCTION)</span></div>
        <div class="pf"><label>Perform swap with preview</label><span class="pv chk">Tùy chọn</span></div>
        <div class="pf"><label></label><span class="pv note">Swap with preview: bấm Start Swap, kiểm tra staging, rồi chọn Complete Swap hoặc Cancel Swap</span></div>
        <div class="pbtns"><span class="pbtn primary">Start Swap</span><span class="pbtn">Close</span></div>
      </div>
    </li>
    <li>Kiểm tra production. Nếu có lỗi, thực hiện <strong>Swap</strong> lại cùng hai slot để quay về bản cũ (last known good). Thao tác swap được ghi trong <em>Activity log</em> với tên <code>Swap Web App Slots</code>.</li>
  </ol>
  </div>
</div>

<figure class="fig"><img src="assets/img/p5m4/swap-dialog.png" alt="Hộp thoại Swap trong Azure portal với Source, Target, ô Perform swap with preview và bảng Config Changes" loading="lazy"><figcaption>Hình 1. Hộp thoại Swap thật trên portal: bảng <em>Config Changes</em> liệt kê setting sẽ thay đổi ở slot nguồn và slot đích trước khi bấm <strong>Start Swap</strong>. Nguồn: <a href="https://learn.microsoft.com/azure/app-service/deploy-staging-slots" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Auto swap</h4>
<p>Bật trên slot nguồn (<em>Configuration &gt; General settings &gt; Auto swap enabled</em>): mỗi lần code được đẩy vào slot đó, App Service tự làm nóng rồi swap vào slot đích. Phù hợp với CI/CD không cần kiểm tra thủ công.</p>
<pre><code>az webapp deployment slot auto-swap -g rg-web -n contoso-web01 --slot staging</code></pre>
<div class="callout warn"><strong>Giới hạn</strong>Auto swap <strong>không hỗ trợ</strong> web app trên Linux và Web App for Containers.</div>

<h4>Traffic routing (testing in production)</h4>
<p>Cột <strong>Traffic %</strong> trên trang Deployment slots cho phép chuyển một phần lưu lượng production sang slot khác (canary/A-B testing):</p>
<pre><code>az webapp traffic-routing set -g rg-web -n contoso-web01 --distribution staging=15</code></pre>
<ul>
  <li>Client được định tuyến sẽ bị "ghim" vào slot qua cookie <code>x-ms-routing-name</code> (giá trị <code>self</code> = production) trong <strong>1 giờ</strong> hoặc tới khi xóa cookie.</li>
  <li>Cho người dùng tự chọn bản beta bằng query string <code>?x-ms-routing-name=staging</code>.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 220" role="img" aria-label="Traffic routing: 85% request vào production, 15% vào staging qua cùng một URL">
  <rect class="box" x="10" y="70" width="140" height="60" rx="10"/>
  <text x="80" y="96" text-anchor="middle" class="t-b">Người dùng</text>
  <text x="80" y="115" text-anchor="middle" class="t-sm t-mute">trình duyệt</text>

  <rect class="box-a" x="210" y="60" width="220" height="80" rx="10"/>
  <text x="320" y="86" text-anchor="middle" class="t-b">Production URL</text>
  <text x="320" y="106" text-anchor="middle" class="t-sm">routing rule: staging = 15%</text>
  <text x="320" y="124" text-anchor="middle" class="t-sm t-mute">cookie x-ms-routing-name</text>

  <rect class="box-s" x="510" y="20" width="200" height="60" rx="10"/>
  <text x="610" y="46" text-anchor="middle" class="t-b">production (self)</text>
  <text x="610" y="66" text-anchor="middle" class="t-sm">85% traffic · bản v1</text>
  <rect class="box-e" x="510" y="120" width="200" height="60" rx="10"/>
  <text x="610" y="146" text-anchor="middle" class="t-b">staging</text>
  <text x="610" y="166" text-anchor="middle" class="t-sm">15% traffic · bản v2</text>

  <line class="ln-a" x1="150" y1="100" x2="206" y2="100" marker-end="url(#arr-a)"/>
  <line class="ln-s" x1="430" y1="88" x2="506" y2="55" marker-end="url(#arr-s)"/>
  <text x="462" y="62" text-anchor="middle" class="t-sm t-s">85%</text>
  <line class="ln" x1="430" y1="112" x2="506" y2="148" marker-end="url(#arr)"/>
  <text x="462" y="148" text-anchor="middle" class="t-sm">15%</text>
  <text x="360" y="206" text-anchor="middle" class="t-sm t-mute">Client đã vào slot nào sẽ được ghim ở slot đó 1 giờ (hoặc tới khi xóa cookie)</text>
</svg>
<figcaption>Hình 2. Traffic % chia ngẫu nhiên request tới cùng một URL production giữa các slot. Đây là cách làm canary/A-B testing ngay trong App Service, không cần Traffic Manager hay Front Door.</figcaption>
</figure>

<h4>Làm nóng tùy chỉnh</h4>
<ul>
  <li><code>WEBSITE_SWAP_WARMUP_PING_PATH</code>: đường dẫn ping khi swap (ví dụ <code>/health</code>).</li>
  <li><code>WEBSITE_SWAP_WARMUP_PING_STATUSES</code>: mã HTTP hợp lệ (ví dụ <code>200,202</code>).</li>
  <li>Phần tử <code>applicationInitialization</code> trong <code>web.config</code> (Windows).</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Chuyển 10% người dùng sang phiên bản mới để thu thập phản hồi" thì dùng <strong>Traffic % trên deployment slot</strong>, không cần Traffic Manager hay Front Door. "Kiểm tra bản mới với cấu hình production trước khi hoàn tất swap" thì dùng <strong>swap with preview</strong>.</div>
`
    },
    {
      id: 'secure-app',
      unit: 'Secure your App Service app',
      title: 'Bảo mật App Service',
      html: `
<h4>Authentication/Authorization (Easy Auth)</h4>
<p>App Service có sẵn module xác thực chạy <strong>trước</strong> code của bạn, không cần sửa code hay thêm SDK. Trên Windows nó chạy như một module trong cùng sandbox; trên Linux/container nó chạy trong một container riêng (middleware).</p>
<ul>
  <li>Identity provider hỗ trợ: <strong>Microsoft Entra ID</strong> (Microsoft identity platform), Facebook, Google, X (Twitter), GitHub, Apple (preview) và bất kỳ nhà cung cấp <strong>OpenID Connect</strong> nào.</li>
  <li>Hành động khi request chưa xác thực: <em>HTTP 302 redirect tới trang đăng nhập</em>, <em>HTTP 401</em>, <em>HTTP 403</em>, <em>HTTP 404</em>, hoặc <em>cho phép anonymous</em> (app tự xử lý).</li>
  <li><strong>Token store</strong>: lưu token của người dùng để app gọi API phía sau (ví dụ Microsoft Graph).</li>
  <li>Thông tin người dùng được chèn vào header như <code>X-MS-CLIENT-PRINCIPAL-NAME</code>.</li>
</ul>

<h4>Managed identity</h4>
<div class="compare">
  <div><strong>System-assigned</strong>Gắn với vòng đời của app (xóa app là mất identity). Mỗi slot có identity riêng (managed identity <strong>không swap</strong>).</div>
  <div><strong>User-assigned</strong>Tài nguyên độc lập, có thể gán cho nhiều app; tồn tại sau khi xóa app.</div>
</div>
<pre><code>az webapp identity assign -g rg-web -n contoso-web01
# Sau đó cấp RBAC, ví dụ Key Vault Secrets User trên key vault, AcrPull trên registry</code></pre>

<h4>Bảo mật kết nối</h4>
<ul>
  <li><strong>HTTPS Only</strong>: chuyển hướng mọi request HTTP sang HTTPS.</li>
  <li><strong>Minimum inbound TLS version</strong>: mặc định 1.2, hỗ trợ 1.3. Đặt cao hơn để chặn client cũ.</li>
  <li><strong>FTP state</strong>: <em>All allowed</em>, <em>FTPS only</em>, <em>Disabled</em>.</li>
  <li><strong>Client certificates</strong> (mutual TLS): Required / Optional / Ignore.</li>
</ul>
<pre><code>az webapp update -g rg-web -n contoso-web01 --https-only true
az webapp config set -g rg-web -n contoso-web01 --min-tls-version 1.2 --ftps-state Disabled</code></pre>

<h4>Access restrictions (lọc inbound)</h4>
<ul>
  <li>Danh sách rule <strong>Allow/Deny</strong> xét theo <strong>priority</strong> (số nhỏ xét trước), giống NSG. Tối đa 512 rule mỗi app.</li>
  <li>Nguồn: dải IPv4/IPv6 (CIDR), subnet có service endpoint <code>Microsoft.Web</code>, hoặc <strong>service tag</strong> (ví dụ <code>AzureFrontDoor.Backend</code>, kèm lọc header <code>X-Azure-FDID</code>).</li>
  <li>Khi có ít nhất một rule Allow, mọi nguồn khác bị <strong>deny ngầm định</strong> (hành vi khi không khớp rule nào có thể cấu hình).</li>
  <li>Site <strong>SCM/Kudu</strong> (<code>&lt;app&gt;.scm.azurewebsites.net</code>) có bộ rule riêng, hoặc chọn dùng chung rule với site chính.</li>
</ul>
<pre><code>az webapp config access-restriction add -g rg-web -n contoso-web01 \\
  --rule-name office --action Allow --ip-address 203.0.113.0/24 --priority 100</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Chỉ cho phép người dùng đã đăng nhập Microsoft Entra ID truy cập, không sửa code" thì bật <strong>App Service Authentication</strong> với provider Microsoft. "App cần đọc secret trong Key Vault mà không lưu thông tin đăng nhập" thì dùng <strong>managed identity</strong> + Key Vault reference. "Chỉ cho Front Door gọi vào app" thì dùng <strong>access restriction với service tag AzureFrontDoor.Backend</strong> và header X-Azure-FDID.</div>
`
    },
    {
      id: 'custom-domains',
      unit: 'Create custom domain names',
      title: 'Custom domain cho App Service',
      html: `
<p>Mặc định app có hostname <code>*.azurewebsites.net</code>. Để dùng tên miền riêng (ví dụ <code>www.contoso.com</code>), app phải ở tier <strong>Shared (D1) trở lên</strong>; tier Free không hỗ trợ custom domain. Mỗi app có thể gắn tới 500 custom domain.</p>

<h4>Các bản ghi DNS cần tạo</h4>
<table>
  <thead><tr><th>Loại tên miền</th><th>Bản ghi ánh xạ</th><th>Bản ghi xác minh</th></tr></thead>
  <tbody>
    <tr><td>Subdomain (<code>www.contoso.com</code>)</td><td><strong>CNAME</strong> <code>www</code> trỏ tới <code>contoso-web01.azurewebsites.net</code></td><td><strong>TXT</strong> <code>asuid.www</code> = Custom Domain Verification ID</td></tr>
    <tr><td>Apex/root (<code>contoso.com</code>)</td><td><strong>A</strong> <code>@</code> trỏ tới IP inbound của app</td><td><strong>TXT</strong> <code>asuid</code> = Custom Domain Verification ID</td></tr>
    <tr><td>Wildcard (<code>*.contoso.com</code>)</td><td><strong>CNAME</strong> <code>*</code> trỏ tới hostname app</td><td><strong>TXT</strong> <code>asuid</code> tương ứng</td></tr>
  </tbody>
</table>
<p><strong>Custom Domain Verification ID</strong> lấy ở trang <em>Custom domains</em> của app. Bản ghi TXT <code>asuid</code> chứng minh bạn sở hữu tên miền và ngăn người khác "chiếm" tên miền đã trỏ về App Service (subdomain takeover).</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 270" role="img" aria-label="Luồng xác minh custom domain: sao chép hostname và Verification ID từ App Service sang hai bản ghi CNAME và TXT trong DNS zone">
  <rect class="box-a" x="10" y="30" width="200" height="190" rx="12"/>
  <text x="110" y="56" text-anchor="middle" class="t-b t-a">App Service</text>
  <text x="110" y="74" text-anchor="middle" class="t-sm t-mute">contoso-web01</text>
  <rect class="box" x="25" y="88" width="170" height="50" rx="8"/>
  <text x="110" y="109" text-anchor="middle" class="t-b">Default hostname</text>
  <text x="110" y="127" text-anchor="middle" class="t-sm t-mute">hoặc IP inbound (cho A)</text>
  <rect class="box" x="25" y="152" width="170" height="50" rx="8"/>
  <text x="110" y="173" text-anchor="middle" class="t-b">Verification ID</text>
  <text x="110" y="191" text-anchor="middle" class="t-sm t-mute">trang Custom domains</text>

  <rect class="box-w" x="290" y="30" width="420" height="190" rx="12"/>
  <text x="500" y="56" text-anchor="middle" class="t-b t-w">DNS zone: contoso.com</text>
  <text x="500" y="74" text-anchor="middle" class="t-sm t-mute">Azure DNS hoặc nhà cung cấp tên miền</text>
  <rect class="box" x="305" y="88" width="390" height="50" rx="8"/>
  <text x="320" y="109" class="t-b">CNAME   www</text>
  <text x="320" y="127" class="t-sm">trỏ tới contoso-web01.azurewebsites.net</text>
  <rect class="box" x="305" y="152" width="390" height="50" rx="8"/>
  <text x="320" y="173" class="t-b">TXT   asuid.www</text>
  <text x="320" y="191" class="t-sm">giá trị = Custom Domain Verification ID</text>

  <line class="ln-a" x1="195" y1="113" x2="301" y2="113" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="195" y1="177" x2="301" y2="177" marker-end="url(#arr-a)"/>
  <text x="248" y="103" text-anchor="middle" class="t-sm t-a">① sao chép</text>
  <text x="360" y="252" text-anchor="middle" class="t-sm">② Validate: App Service tra DNS, thấy cả hai bản ghi  →  ③ Add  →  ④ tạo TLS binding</text>
</svg>
<figcaption>Hình 1. Với subdomain <code>www</code>: một bản ghi <strong>CNAME</strong> để ánh xạ và một bản ghi <strong>TXT asuid.www</strong> để chứng minh quyền sở hữu. Với root domain, thay CNAME bằng bản ghi <strong>A</strong> trỏ tới IP inbound và dùng TXT <code>asuid</code>.</figcaption>
</figure>

<h4>Các bước</h4>
<ol class="steps">
  <li>Đảm bảo plan ở Shared trở lên (Basic trở lên nếu cần HTTPS).</li>
  <li>Vào <em>Custom domains &gt; Add custom domain</em>, chọn nguồn tên miền (App Service Domain hoặc nhà cung cấp khác) và loại chứng chỉ.</li>
  <li>Tạo bản ghi CNAME/A và TXT tại nhà cung cấp DNS (hoặc Azure DNS).</li>
  <li>Bấm <strong>Validate</strong> rồi <strong>Add</strong>. Sau đó tạo TLS binding (xem phần chứng chỉ).</li>
</ol>
<pre><code>az webapp config hostname add -g rg-web --webapp-name contoso-web01 --hostname www.contoso.com
az webapp config hostname get-external-ip -g rg-web --webapp-name contoso-web01   # IP cho bản ghi A</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: gắn www.contoso.com vào web app</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang Custom domains của app (plan Basic trở lên nếu muốn managed certificate):<br><span class="path">Azure portal › App Services › contoso-web01 › Settings › Custom domains › + Add custom domain</span></li>
    <li>Điền hộp thoại, <strong>chưa bấm Validate</strong>:
      <div class="blade">
        <div class="blade-title">Add custom domain</div>
        <div class="pf"><label class="req">Domain provider</label><span class="pv sel">All other domain services</span></div>
        <div class="pf"><label class="req">TLS/SSL certificate</label><span class="pv sel">App Service Managed Certificate</span></div>
        <div class="pf"><label class="req">TLS/SSL type</label><span class="pv sel">SNI SSL</span></div>
        <div class="pf"><label class="req">Domain</label><span class="pv">www.contoso.com</span></div>
        <div class="pf"><label class="req">Hostname record type</label><span class="pv sel">CNAME</span></div>
        <div class="blade-sec">Domain validation</div>
        <div class="pf"><label>CNAME</label><span class="pv note">www → contoso-web01.azurewebsites.net</span></div>
        <div class="pf"><label>TXT</label><span class="pv note">asuid.www → (Verification ID, có nút copy)</span></div>
        <div class="pbtns"><span class="pbtn">Validate</span><span class="pbtn primary">Add</span></div>
      </div>
    </li>
    <li>Tạo hai bản ghi đúng như mục <em>Domain validation</em> ở nhà cung cấp DNS (hoặc trong Azure DNS zone <code>contoso.com</code>).</li>
    <li>Quay lại hộp thoại, bấm <strong>Validate</strong>. Khi cả hai bản ghi có dấu tích xanh, bấm <strong>Add</strong>.</li>
    <li>Domain hiện trong danh sách với trạng thái <em>No binding</em>; sau vài phút managed certificate được cấp và trạng thái chuyển thành <strong>Secured</strong>. Nếu đã chọn <em>Add certificate later</em> thì phải tự thêm chứng chỉ và binding.</li>
  </ol>
  </div>
</div>

<h4>App Service Domain</h4>
<p>Có thể mua tên miền trực tiếp trong Azure (<strong>App Service Domain</strong>); DNS zone được quản lý bằng Azure DNS và bản ghi được tạo tự động khi gắn vào app.</p>

<div class="callout warn"><strong>Lưu ý</strong>Bản ghi A trỏ tới IP inbound; IP này có thể đổi nếu bạn xóa và tạo lại app, hoặc xóa TLS binding kiểu IP. Với subdomain, luôn ưu tiên <strong>CNAME</strong>. Custom domain là setting <strong>không swap</strong> giữa các slot.</div>

<div class="callout exam"><strong>Góc thi</strong>Đề thường đưa ra bảng bản ghi DNS và hỏi cần thêm gì. Nhớ: subdomain = <strong>CNAME + TXT asuid.&lt;sub&gt;</strong>; root domain = <strong>A + TXT asuid</strong>. Root domain không dùng CNAME được (giới hạn của DNS).</div>
`
    },
    {
      id: 'backup-restore',
      unit: 'Back up and restore your App Service app',
      title: 'Backup và restore App Service',
      html: `
<p>App Service có hai loại backup, đều yêu cầu tier <strong>Basic, Standard, Premium hoặc Isolated</strong> (Free/Shared không có). Với Basic, chỉ backup/restore được <strong>production slot</strong>.</p>

<table>
  <thead><tr><th></th><th>Automatic backup</th><th>Custom backup</th></tr></thead>
  <tbody>
    <tr><td>Cấu hình</td><td>Không cần, tự bật</td><td>Phải cấu hình storage account + container</td></tr>
    <tr><td>Tần suất</td><td>Mỗi giờ, không đổi được</td><td>Theo lịch (tối thiểu 2 giờ, tối đa 12 bản/ngày) hoặc on-demand</td></tr>
    <tr><td>Giữ lại</td><td>30 ngày, không đổi được</td><td>0–30 ngày hoặc vô thời hạn</td></tr>
    <tr><td>Dung lượng tối đa</td><td>30 GB</td><td>10 GB (trong đó database liên kết tối đa 4 GB)</td></tr>
    <tr><td>Database liên kết</td><td>Không</td><td>Có (đang được loại bỏ dần, hạn chót 31/3/2028)</td></tr>
    <tr><td>Tải về được</td><td>Không</td><td>Có, dạng blob (.zip + .xml)</td></tr>
    <tr><td>Partial backup / qua VNet</td><td>Không</td><td>Có (<code>_backup.filter</code>; storage có firewall nếu app có VNet integration)</td></tr>
  </tbody>
</table>

<h4>Backup gồm những gì?</h4>
<ul>
  <li><strong>Nội dung app</strong>: thư mục <code>%HOME%</code> (Windows) hoặc <code>/home</code> (Linux); với container là persistent storage.</li>
  <li><strong>Cấu hình app</strong>: app settings, connection strings, log settings, Application Insights, health check.</li>
  <li><strong>Không</strong> khôi phục: custom domain (trừ custom backup trong một số trường hợp), TLS/SSL, managed identity, authentication, networking (private endpoint, VNet integration), scale out, alerts, các deployment slot liên quan, nội dung trong run-from-ZIP package và Azure Files mount.</li>
</ul>

<h4>Restore</h4>
<ul>
  <li>Khôi phục <strong>đè lên app hiện tại</strong>, sang <strong>app mới</strong> hoặc sang <strong>slot</strong> (mới hoặc có sẵn). App/slot đích bị dừng trong lúc restore.</li>
  <li>Mẹo giảm downtime: restore vào staging slot rồi swap vào production.</li>
  <li>Khôi phục sang subscription khác: dùng custom backup, copy file zip/xml sang storage của subscription đích rồi restore từ storage.</li>
</ul>
<pre><code># Liệt kê và restore automatic backup (snapshot)
az webapp config snapshot list -g rg-web -n contoso-web01
az webapp config snapshot restore -g rg-web -n contoso-web01 --time "2026-11-01T08:00:00"

# Custom backup on-demand (container-url là SAS URL của blob container)
az webapp config backup create -g rg-web --webapp-name contoso-web01 \\
  --container-url "https://stbackup.blob.core.windows.net/webbackups?&lt;SAS&gt;" --backup-name bk1</code></pre>

<div class="callout warn"><strong>Lưu ý</strong>Automatic backup được lưu <strong>cùng datacenter</strong> với app, không nên coi là giải pháp disaster recovery. Custom backup cần storage account hỗ trợ xác thực SAS (không hỗ trợ managed identity cho thao tác backup/restore).</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần backup web app theo lịch tự chọn và giữ 90 ngày" thì automatic backup không đáp ứng (cố định 30 ngày); dùng <strong>custom backup</strong> với retention vô thời hạn hoặc quản lý vòng đời ở storage. "App 15 GB nội dung" thì custom backup sẽ thất bại (giới hạn 10 GB) trừ khi loại bớt bằng <code>_backup.filter</code>.</div>
`
    },
    {
      id: 'app-insights',
      unit: 'Use Azure Application Insights',
      title: 'Application Insights cho App Service',
      html: `
<p><strong>Application Insights</strong> là tính năng APM (Application Performance Monitoring) của Azure Monitor: thu thập request, dependency, exception, page view, trace và metric của ứng dụng. Các resource Application Insights hiện nay đều là <strong>workspace-based</strong>: dữ liệu lưu trong một <strong>Log Analytics workspace</strong> (bản classic đã ngừng hỗ trợ).</p>

<h4>Cách bật trên App Service</h4>
<ul>
  <li><strong>Auto-instrumentation (không sửa code)</strong>: bật trong tab <em>Monitoring</em> khi tạo app hoặc trang <em>Application Insights</em> của app. Hỗ trợ .NET, .NET Core, Java, Node.js, Python (mức hỗ trợ khác nhau giữa Windows và Linux).</li>
  <li><strong>SDK / OpenTelemetry (Azure Monitor OpenTelemetry Distro)</strong>: thêm vào code để có telemetry tùy biến.</li>
  <li>App kết nối qua app setting <code>APPLICATIONINSIGHTS_CONNECTION_STRING</code> (khuyến nghị thay cho instrumentation key).</li>
</ul>

<h4>Các tính năng hay dùng</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Dùng để</th></tr></thead>
  <tbody>
    <tr><td><strong>Live Metrics</strong></td><td>Xem request, lỗi, CPU theo thời gian thực (độ trễ khoảng 1 giây)</td></tr>
    <tr><td><strong>Application Map</strong></td><td>Sơ đồ các thành phần và dependency (SQL, HTTP, storage) cùng tỷ lệ lỗi</td></tr>
    <tr><td><strong>Failures / Performance</strong></td><td>Phân tích exception, request chậm, dependency chậm</td></tr>
    <tr><td><strong>Availability tests</strong></td><td>Gọi URL định kỳ từ nhiều vị trí trên thế giới, cảnh báo khi app không phản hồi</td></tr>
    <tr><td><strong>Smart detection</strong></td><td>Tự phát hiện bất thường về tỷ lệ lỗi, hiệu năng</td></tr>
    <tr><td><strong>Transaction search / Logs</strong></td><td>Truy vấn telemetry bằng KQL (bảng <code>AppRequests</code>, <code>AppExceptions</code>…)</td></tr>
  </tbody>
</table>

<h4>Chẩn đoán khác trên App Service</h4>
<ul>
  <li><strong>App Service logs</strong>: application logging, web server logging, detailed error messages, failed request tracing (lưu vào file system hoặc blob).</li>
  <li><strong>Log stream</strong>: xem log thời gian thực (<code>az webapp log tail</code>).</li>
  <li><strong>Diagnose and solve problems</strong>: công cụ tự chẩn đoán của App Service.</li>
  <li><strong>Diagnostic settings</strong>: gửi log nền tảng (AppServiceHTTPLogs, AppServiceConsoleLogs…) tới Log Analytics, storage hoặc Event Hubs.</li>
  <li><strong>Health check</strong>: chỉ định đường dẫn; instance không khỏe bị loại khỏi load balancer.</li>
</ul>
<pre><code>az webapp log config -g rg-web -n contoso-web01 --application-logging filesystem --level information
az webapp log tail -g rg-web -n contoso-web01</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Cần biết app gọi tới dependency nào và cái nào chậm" thì dùng <strong>Application Map</strong>. "Được cảnh báo khi website không truy cập được từ nhiều khu vực" thì dùng <strong>availability test</strong>. "Bật giám sát không sửa code" thì dùng <strong>auto-instrumentation</strong>.</div>
`
    },
    {
      id: 'tls-networking',
      extra: true,
      title: 'TLS/SSL certificate và networking cho App Service',
      html: `
<h4>Các lựa chọn chứng chỉ</h4>
<table>
  <thead><tr><th>Loại</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>App Service managed certificate</strong></td><td><strong>Miễn phí</strong>, do DigiCert cấp, App Service <strong>tự gia hạn</strong>. Cần tier Basic trở lên.</td></tr>
    <tr><td><strong>App Service certificate</strong></td><td>Mua qua Azure, lưu trong Key Vault, có thể export, hỗ trợ wildcard.</td></tr>
    <tr><td><strong>Import từ Key Vault</strong></td><td>Chứng chỉ PKCS12 trong Key Vault; App Service tự đồng bộ bản mới trong vòng 24 giờ.</td></tr>
    <tr><td><strong>Upload private certificate</strong></td><td>File <strong>.pfx có mật khẩu</strong>, chứa đủ chuỗi chứng chỉ trung gian, EKU server authentication.</td></tr>
    <tr><td>Upload public certificate (.cer)</td><td>Chỉ để code gọi ra ngoài, không dùng bảo vệ custom domain.</td></tr>
  </tbody>
</table>

<h4>Giới hạn của managed certificate miễn phí</h4>
<ul>
  <li><strong>Không</strong> hỗ trợ wildcard, <strong>không</strong> export được, không dùng trong App Service Environment, không hỗ trợ private DNS.</li>
  <li>Root domain: phải có bản ghi <strong>A</strong> trỏ trực tiếp tới app, không tích hợp Traffic Manager, app không được bật IP restriction (vì việc cấp/gia hạn cần truy cập từ Internet).</li>
  <li>Subdomain: CNAME phải trỏ <strong>trực tiếp</strong> tới <code>&lt;app&gt;.azurewebsites.net</code> (hoặc trafficmanager.net).</li>
</ul>

<h4>TLS binding</h4>
<ul>
  <li><strong>SNI SSL</strong>: nhiều chứng chỉ trên cùng IP, dựa vào Server Name Indication. Không giới hạn, có từ Basic.</li>
  <li><strong>IP SSL</strong>: gán IP riêng cho app (app-assigned address), có từ Standard. Dùng khi client cũ không hỗ trợ SNI hoặc cần IP inbound riêng.</li>
</ul>
<pre><code># Tạo managed certificate cho hostname rồi bind kiểu SNI
az webapp config ssl create -g rg-web -n contoso-web01 --hostname www.contoso.com
az webapp config ssl bind -g rg-web -n contoso-web01 --certificate-thumbprint &lt;thumbprint&gt; --ssl-type SNI</code></pre>

<h4>Networking: inbound và outbound là hai bài toán riêng</h4>
<div class="compare">
  <div><strong>Inbound (ai gọi vào app)</strong><strong>Access restrictions</strong> (lọc IP/service tag), <strong>service endpoints</strong> (chỉ cho subnet cụ thể), <strong>private endpoint</strong> (app có IP private trong VNet, dùng Private Link), app-assigned address.</div>
  <div><strong>Outbound (app gọi ra đâu)</strong><strong>VNet integration</strong> (app gọi vào tài nguyên trong VNet, VNet peering, VPN/ExpressRoute), <strong>Hybrid Connections</strong> (tới một host:port on-premises qua Azure Relay, cổng 443), gateway-required VNet integration (cũ).</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="Networking của App Service: inbound qua access restrictions hoặc private endpoint, outbound qua VNet integration hoặc Hybrid Connections">
  <text x="150" y="30" text-anchor="middle" class="t-b t-a">Inbound (gọi vào app)</text>
  <text x="570" y="30" text-anchor="middle" class="t-b t-a">Outbound (app gọi ra)</text>

  <rect class="box" x="10" y="75" width="140" height="50" rx="10"/>
  <text x="80" y="105" text-anchor="middle" class="t-b">Internet</text>
  <rect class="box" x="10" y="175" width="140" height="50" rx="10"/>
  <text x="80" y="196" text-anchor="middle" class="t-b">Máy trong VNet</text>
  <text x="80" y="214" text-anchor="middle" class="t-sm t-mute">hoặc on-prem qua VPN</text>

  <rect class="box-a" x="290" y="60" width="140" height="180" rx="12"/>
  <text x="360" y="142" text-anchor="middle" class="t-b">Web app</text>
  <text x="360" y="162" text-anchor="middle" class="t-sm t-mute">App Service</text>

  <rect class="box" x="570" y="75" width="140" height="50" rx="10"/>
  <text x="640" y="96" text-anchor="middle" class="t-b">VM / SQL</text>
  <text x="640" y="114" text-anchor="middle" class="t-sm t-mute">trong VNet, peering</text>
  <rect class="box" x="570" y="175" width="140" height="50" rx="10"/>
  <text x="640" y="196" text-anchor="middle" class="t-b">Máy on-prem</text>
  <text x="640" y="214" text-anchor="middle" class="t-sm t-mute">host:port cụ thể</text>

  <line class="ln-a" x1="150" y1="100" x2="286" y2="100" marker-end="url(#arr-a)"/>
  <text x="218" y="92" text-anchor="middle" class="t-sm t-a">Access restrictions</text>
  <text x="218" y="118" text-anchor="middle" class="t-sm t-mute">lọc IP / service tag</text>
  <line class="ln-s" x1="150" y1="200" x2="286" y2="200" marker-end="url(#arr-s)"/>
  <text x="218" y="192" text-anchor="middle" class="t-sm t-s">Private endpoint</text>
  <text x="218" y="218" text-anchor="middle" class="t-sm t-mute">IP private</text>

  <line class="ln-a" x1="430" y1="100" x2="566" y2="100" marker-end="url(#arr-a)"/>
  <text x="498" y="92" text-anchor="middle" class="t-sm t-a">VNet integration</text>
  <text x="498" y="118" text-anchor="middle" class="t-sm t-mute">subnet riêng</text>
  <line class="ln" x1="430" y1="200" x2="566" y2="200" marker-end="url(#arr)"/>
  <text x="498" y="192" text-anchor="middle" class="t-sm">Hybrid Connections</text>
  <text x="498" y="218" text-anchor="middle" class="t-sm t-mute">Azure Relay, 443</text>
</svg>
<figcaption>Hình 1. Chiều mũi tên quyết định tính năng: request <em>đi vào</em> app dùng access restrictions hoặc private endpoint; request do app <em>gọi ra</em> dùng VNet integration hoặc Hybrid Connections. Private endpoint không giúp app gọi ra VNet, và VNet integration không cho VNet gọi vào app.</figcaption>
</figure>
<ul>
  <li><strong>VNet integration</strong> (regional): cần subnet <strong>trống, dành riêng</strong>, được delegate cho <code>Microsoft.Web/serverFarms</code>; VNet phải <strong>cùng region</strong> với app. Kết hợp NSG/route table/NAT gateway để kiểm soát outbound. Không cho phép ai từ VNet gọi <em>vào</em> app.</li>
  <li><strong>Private endpoint</strong>: chỉ phục vụ <strong>inbound</strong>; cần cấu hình DNS (private DNS zone <code>privatelink.azurewebsites.net</code>) và nên tắt <em>public network access</em>. Không giúp app gọi ra VNet.</li>
  <li><strong>App Service Environment v3</strong> (tier Isolated v2): app nằm hẳn trong VNet của bạn, cả inbound lẫn outbound.</li>
</ul>
<pre><code>az webapp vnet-integration add -g rg-web -n contoso-web01 --vnet vnet-hub --subnet snet-appsvc-int</code></pre>

<div class="callout exam"><strong>Bẫy thi kinh điển</strong>"Web app cần truy cập SQL Server trên VM trong VNet" thì cần <strong>VNet integration</strong> (outbound). "Người dùng nội bộ chỉ truy cập web app qua IP private" thì cần <strong>private endpoint</strong> (inbound). Chọn ngược là sai. "Web app cần gọi một database on-premises mà không có VPN" thì dùng <strong>Hybrid Connections</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Deployment slot cần tier <strong>Standard</strong> trở lên: Standard <strong>5 slot</strong>, Premium và Isolated <strong>20 slot</strong>. Basic không có slot.',
    'Autoscale có từ <strong>Standard</strong>; Basic chỉ scale thủ công tối đa 3 instance. Standard tối đa 10, Premium v3 tối đa 30, Isolated tối đa 100 instance.',
    'Custom domain cần tier <strong>Shared trở lên</strong>; TLS binding cho custom domain và managed certificate miễn phí cần <strong>Basic trở lên</strong>.',
    'Subdomain: <strong>CNAME + TXT asuid.&lt;sub&gt;</strong>. Root domain: <strong>A + TXT asuid</strong>. Giá trị TXT là Custom Domain Verification ID.',
    'Managed certificate miễn phí: tự gia hạn, <strong>không wildcard</strong>, <strong>không export</strong>, không dùng trong ASE.',
    'Automatic backup: mỗi giờ, giữ <strong>30 ngày</strong>, tối đa 30 GB. Custom backup: cần storage account, tối đa <strong>10 GB</strong> (DB 4 GB), lịch tối thiểu 2 giờ.',
    'Backup/restore cần tier Basic trở lên; Basic chỉ backup production slot.',
    'Setting <strong>không swap</strong>: custom domain, TLS binding, scale, Always On, IP restrictions, managed identity, VNet integration. App settings/connection strings được swap trừ khi đánh dấu <strong>Deployment slot setting</strong>.',
    'Auto swap <strong>không hỗ trợ Linux</strong> và Web App for Containers. Swap with preview không dùng được khi bật App Service authentication.',
    'Traffic routing ghim client vào slot bằng cookie <code>x-ms-routing-name</code> (production = <code>self</code>).',
    '<strong>VNet integration = outbound</strong> (subnet riêng, delegate Microsoft.Web/serverFarms, cùng region). <strong>Private endpoint = inbound</strong>.',
    'Một App Service plan chỉ chứa một loại OS; Linux không có tier Shared.'
  ],
  traps: [
    'Chọn Basic khi đề yêu cầu deployment slot hoặc autoscale. Phải là <strong>Standard</strong> trở lên.',
    'Dùng private endpoint để web app truy cập tài nguyên trong VNet. Private endpoint chỉ cho <strong>inbound</strong>; app gọi ra VNet phải dùng <strong>VNet integration</strong>.',
    'Quên đánh dấu <strong>Deployment slot setting</strong>, khiến connection string của staging bị swap sang production.',
    'Nghĩ rằng clone slot sẽ copy cả code. Clone chỉ copy <strong>cấu hình</strong>; slot mới không có nội dung.',
    'Tạo CNAME cho root domain (<code>contoso.com</code>). Root domain phải dùng <strong>bản ghi A</strong> (kèm TXT asuid).',
    'Dùng managed certificate miễn phí cho <code>*.contoso.com</code>. Managed certificate không hỗ trợ wildcard; cần App Service certificate hoặc chứng chỉ riêng.',
    'Coi automatic backup là giải pháp DR. Bản sao lưu nằm cùng datacenter và chỉ giữ 30 ngày.',
    'Định bật auto swap cho web app Linux. Tính năng này chỉ có cho Windows (code-based).'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần</th><th>Tier tối thiểu / Giải pháp</th></tr></thead>
  <tbody>
    <tr><td>Custom domain</td><td>Shared (D1)</td></tr>
    <tr><td>HTTPS cho custom domain, managed cert, backup, VNet integration</td><td>Basic (B1)</td></tr>
    <tr><td>Deployment slot (5), autoscale, IP SSL</td><td>Standard (S1)</td></tr>
    <tr><td>20 slot, tối đa 30 instance</td><td>Premium v3</td></tr>
    <tr><td>Cô lập mạng hoàn toàn, single-tenant</td><td>Isolated v2 (ASE v3)</td></tr>
    <tr><td>Setting ở lại slot khi swap</td><td>Tích "Deployment slot setting"</td></tr>
    <tr><td>Chuyển x% traffic sang bản mới</td><td>Traffic % trên slot (<code>az webapp traffic-routing set</code>)</td></tr>
    <tr><td>Kiểm tra với cấu hình production trước khi swap</td><td>Swap with preview</td></tr>
    <tr><td>Subdomain / root domain</td><td>CNAME + TXT asuid.sub / A + TXT asuid</td></tr>
    <tr><td>App gọi vào VNet / on-prem không VPN</td><td>VNet integration / Hybrid Connections</td></tr>
    <tr><td>Truy cập app qua IP private</td><td>Private endpoint</td></tr>
    <tr><td>Backup tự động / tùy chỉnh</td><td>Mỗi giờ, 30 ngày, 30 GB / lịch ≥ 2 giờ, 10 GB, cần storage</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Tier tối thiểu để có deployment slot?', back: '<strong>Standard</strong> (5 slot). Premium và Isolated có 20 slot.' },
    { front: 'Tier tối thiểu để dùng custom domain? Để bind TLS cho custom domain?', back: 'Custom domain: <strong>Shared (D1)</strong>. TLS binding: <strong>Basic (B1)</strong>.' },
    { front: 'Bản ghi DNS cho www.contoso.com?', back: '<strong>CNAME</strong> www trỏ tới &lt;app&gt;.azurewebsites.net và <strong>TXT asuid.www</strong> chứa Custom Domain Verification ID.' },
    { front: 'Bản ghi DNS cho contoso.com (root)?', back: '<strong>A</strong> trỏ tới IP inbound của app và <strong>TXT asuid</strong> chứa Custom Domain Verification ID.' },
    { front: 'Làm sao để connection string không bị swap?', back: 'Đánh dấu là <strong>Deployment slot setting</strong> (sticky), hoặc CLI <code>--slot-settings</code>.' },
    { front: 'Swap with preview dùng để làm gì?', back: 'Áp cấu hình của slot đích lên slot nguồn rồi <strong>tạm dừng</strong> để bạn kiểm tra, sau đó Complete hoặc Cancel swap.' },
    { front: 'Auto swap có những giới hạn gì?', back: 'Không hỗ trợ <strong>web app Linux</strong> và <strong>Web App for Containers</strong>.' },
    { front: 'Cookie dùng để ghim client vào slot khi routing traffic?', back: '<code>x-ms-routing-name</code>; giá trị <code>self</code> là production. Ghim trong 1 giờ.' },
    { front: 'Automatic backup của App Service: tần suất, thời gian giữ, dung lượng?', back: 'Mỗi giờ, giữ <strong>30 ngày</strong>, tối đa <strong>30 GB</strong>, không cấu hình được, không tải về được.' },
    { front: 'Giới hạn dung lượng custom backup?', back: '<strong>10 GB</strong> tổng, trong đó database liên kết tối đa 4 GB.' },
    { front: 'Managed certificate miễn phí có những hạn chế gì?', back: 'Không wildcard, không export, không dùng trong ASE, không hỗ trợ private DNS; cần Basic trở lên.' },
    { front: 'VNet integration và private endpoint khác nhau thế nào?', back: 'VNet integration: <strong>outbound</strong> từ app vào VNet. Private endpoint: <strong>inbound</strong> tới app qua IP private.' },
    { front: 'Subnet cho VNet integration cần gì?', back: 'Subnet trống, dành riêng, delegate cho <code>Microsoft.Web/serverFarms</code>, VNet cùng region với app.' },
    { front: 'Hybrid Connections dùng khi nào?', back: 'App cần gọi tới một <strong>host:port</strong> on-premises mà không có VPN/ExpressRoute; Hybrid Connection Manager kết nối ra Azure Relay qua cổng 443.' },
    { front: 'Easy Auth có thể trả về gì cho request chưa xác thực?', back: 'Redirect 302 tới trang đăng nhập, HTTP 401, 403, 404, hoặc cho phép anonymous.' },
    { front: 'App setting chứa chuỗi kết nối Application Insights?', back: '<code>APPLICATIONINSIGHTS_CONNECTION_STRING</code>' },
    { front: 'Lệnh CLI chuyển 20% traffic sang slot staging?', back: '<code>az webapp traffic-routing set -g RG -n APP --distribution staging=20</code>' }
  ],
  quiz: [
    {
      q: 'Công ty Contoso cần chạy một web app có thể kiểm thử bản mới trong môi trường staging rồi chuyển vào production không downtime, đồng thời tự scale theo CPU. Chi phí phải thấp nhất. Bạn chọn tier nào cho App Service plan?',
      options: ['Basic B1', 'Standard S1', 'Premium v3 P1v3', 'Isolated v2 I1v2'],
      answer: [1],
      explain: 'Standard là tier thấp nhất có cả deployment slot (5 slot) và autoscale. Basic không có slot và chỉ scale thủ công. Premium v3 và Isolated đáp ứng nhưng đắt hơn.'
    },
    {
      q: 'Bạn swap slot staging vào production của WebApp1. Sau khi swap, production kết nối nhầm tới database kiểm thử vốn được cấu hình trong connection string của staging. Cần làm gì để lần swap sau không lặp lại lỗi này?',
      options: ['Bật auto swap cho slot staging', 'Đánh dấu connection string là Deployment slot setting trên cả hai slot', 'Chuyển connection string vào app setting thay vì connection string', 'Dùng swap with preview'],
      answer: [1],
      explain: 'Setting được đánh dấu Deployment slot setting sẽ ở lại slot khi swap. Auto swap chỉ tự động hóa việc swap. App setting cũng được swap như connection string nếu không sticky. Swap with preview giúp kiểm tra nhưng không ngăn setting bị chuyển.'
    },
    {
      q: 'Bạn cần ánh xạ tên miền www.fabrikam.com tới web app fabrikam-web.azurewebsites.net. Bạn phải tạo những bản ghi DNS nào? (Chọn 2)',
      options: ['Bản ghi A cho www trỏ tới IP inbound của app', 'Bản ghi CNAME cho www trỏ tới fabrikam-web.azurewebsites.net', 'Bản ghi TXT asuid.www chứa Custom Domain Verification ID', 'Bản ghi MX trỏ tới fabrikam-web.azurewebsites.net'],
      answer: [1, 2],
      explain: 'Với subdomain, khuyến nghị dùng CNAME trỏ tới hostname mặc định và TXT asuid.&lt;subdomain&gt; để xác minh sở hữu. Bản ghi A dùng cho root domain. MX dành cho email, không liên quan.'
    },
    {
      q: 'WebApp1 chạy trên App Service cần truy vấn một SQL Server cài trên VM có IP private trong VNet1 cùng region. VM không có IP public. Bạn cấu hình gì trên WebApp1?',
      options: ['Private endpoint trong VNet1', 'Access restriction cho phép subnet của VM', 'VNet integration với một subnet trống trong VNet1', 'Service endpoint Microsoft.Web trên subnet của VM'],
      answer: [2],
      explain: 'App gọi ra tài nguyên trong VNet là luồng outbound, cần VNet integration với subnet riêng được delegate. Private endpoint, access restriction và service endpoint Microsoft.Web đều phục vụ luồng inbound vào app.'
    },
    {
      q: 'Bạn muốn 10% người dùng production được chuyển ngẫu nhiên sang phiên bản beta đang chạy trên slot "beta" của WebApp1 để thu thập phản hồi, với ít công sức nhất. Bạn làm gì?',
      options: ['Tạo Azure Traffic Manager với routing weighted', 'Đặt Traffic % = 10 cho slot beta', 'Tạo Azure Front Door và rule chia tải', 'Swap with preview giữa beta và production'],
      answer: [1],
      explain: 'Deployment slot hỗ trợ sẵn routing theo phần trăm; client được ghim vào slot bằng cookie x-ms-routing-name. Traffic Manager và Front Door làm được nhưng tốn công cấu hình hơn. Swap with preview không chia traffic.'
    },
    {
      q: 'WebApp2 chạy trên Linux App Service plan tier P1v3. Nhóm dev muốn mỗi lần đẩy code vào slot staging thì app tự động được swap vào production. Điều gì đúng?',
      options: ['Bật auto swap trên slot staging', 'Phải nâng lên tier Isolated', 'Auto swap không hỗ trợ web app Linux; cần dùng bước swap trong pipeline CI/CD', 'Bật auto swap trên slot production'],
      answer: [2],
      explain: 'Auto swap không hỗ trợ web app trên Linux và Web App for Containers. Giải pháp là thêm bước swap (az webapp deployment slot swap) vào GitHub Actions hoặc Azure Pipelines. Tier Isolated không thay đổi giới hạn này, và auto swap luôn bật ở slot nguồn chứ không phải production.'
    },
    {
      q: 'Bạn cần bảo vệ www.contoso.com trên WebApp1 bằng HTTPS với chi phí thấp nhất, chứng chỉ phải tự gia hạn. WebApp1 hiện ở tier Shared D1. Bạn cần làm gì? (Chọn 2)',
      options: ['Scale up plan lên Basic B1', 'Tạo App Service managed certificate và tạo TLS binding SNI', 'Mua App Service certificate wildcard', 'Scale up plan lên Premium v3'],
      answer: [0, 1],
      explain: 'TLS binding và managed certificate miễn phí cần tier Basic trở lên, nên B1 là mức rẻ nhất. Managed certificate tự gia hạn và miễn phí. App Service certificate tốn phí; Premium v3 đắt hơn mức cần thiết.'
    },
    {
      q: 'WebApp3 ở tier Standard có 9 GB nội dung. Yêu cầu: backup mỗi 6 giờ và giữ bản sao lưu 90 ngày. Bạn dùng gì?',
      options: ['Automatic backup có sẵn', 'Azure Backup với Recovery Services vault', 'Snapshot ổ đĩa của App Service plan', 'Custom backup vào storage account với lịch 6 giờ, retention vô thời hạn (dọn bản cũ hơn 90 ngày ở storage)'],
      answer: [3],
      explain: 'Custom backup cho phép lịch tùy chọn (tối thiểu 2 giờ) và retention 0–30 ngày hoặc vô thời hạn (không đặt được đúng 90 ngày, nên chọn vô thời hạn rồi dọn bản cũ), dung lượng tối đa 10 GB nên 9 GB vẫn đạt. Automatic backup cố định mỗi giờ và 30 ngày. Recovery Services vault không backup App Service, và App Service plan không có snapshot đĩa.'
    },
    {
      q: 'WebApp4 cần đọc secret trong Azure Key Vault mà không lưu bất kỳ thông tin đăng nhập nào trong code hay cấu hình. Bạn làm những gì? (Chọn 2)',
      options: ['Bật system-assigned managed identity cho WebApp4', 'Lưu client secret của service principal vào app setting', 'Cấp quyền đọc secret (ví dụ Key Vault Secrets User) cho identity của WebApp4', 'Bật HTTPS Only'],
      answer: [0, 2],
      explain: 'Managed identity cho app một danh tính trong Microsoft Entra ID mà không cần secret; sau đó cấp quyền trên Key Vault cho identity đó. Lưu client secret trong app setting vi phạm yêu cầu. HTTPS Only không liên quan đến việc xác thực tới Key Vault.'
    },
    {
      q: 'Bạn muốn chỉ người dùng trong tenant Microsoft Entra của công ty truy cập được WebApp5, và đội phát triển không được sửa code. Giải pháp nào phù hợp nhất?',
      options: ['Bật App Service Authentication với Microsoft identity provider và yêu cầu xác thực', 'Thêm access restriction chỉ cho phép IP văn phòng', 'Tạo private endpoint cho WebApp5', 'Cấu hình CORS chỉ cho phép miền của công ty'],
      answer: [0],
      explain: 'Easy Auth xử lý đăng nhập Microsoft Entra ID trước khi request tới code. Access restriction lọc theo IP, không xác thực người dùng (nhân viên làm việc từ xa sẽ bị chặn). Private endpoint chỉ đổi đường mạng. CORS chỉ áp dụng cho trình duyệt gọi API chéo miền.'
    },
    {
      q: 'Bạn swap slot staging vào production. Những thiết lập nào ở lại slot production (không đi theo nội dung)? (Chọn 2)',
      options: ['Custom domain và TLS binding', 'Phiên bản .NET của app', 'Cấu hình scale out', 'App setting không được đánh dấu sticky'],
      answer: [0, 2],
      explain: 'Custom domain, chứng chỉ private/TLS binding và scale settings là slot-specific nên không swap. Phiên bản framework và app setting không sticky đi theo nội dung khi swap.'
    },
    {
      q: 'Bạn cần cảnh báo khi trang chủ của WebApp6 không phản hồi từ nhiều khu vực địa lý, với ít công sức nhất. Bạn dùng tính năng nào?',
      options: ['Live Metrics trong Application Insights', 'Application Map', 'Diagnostic settings gửi log tới Event Hubs', 'Availability test trong Application Insights kèm alert'],
      answer: [3],
      explain: 'Availability test gọi URL định kỳ từ nhiều vị trí trên thế giới và có thể kích hoạt alert khi thất bại. Live Metrics chỉ để xem thời gian thực, Application Map hiển thị dependency, còn Event Hubs chỉ là đích stream dữ liệu.'
    },
    {
      q: 'Bạn có hai app: App1 viết bằng ASP.NET Framework (chỉ chạy Windows) và App2 là container Linux. Số App Service plan tối thiểu cần tạo là bao nhiêu?',
      options: ['1', '2', '3', '4'],
      answer: [1],
      explain: 'Một App Service plan chỉ có một hệ điều hành, nên app Windows và app Linux phải nằm ở hai plan khác nhau. Một plan cho mỗi OS là đủ.'
    },
    {
      q: 'Công ty muốn chỉ Azure Front Door của họ mới gọi được trực tiếp tới WebApp7; mọi truy cập trực tiếp khác vào *.azurewebsites.net phải bị chặn. Bạn cấu hình gì?',
      options: ['Access restriction cho phép service tag AzureFrontDoor.Backend kèm kiểm tra header X-Azure-FDID', 'VNet integration với subnet của Front Door', 'Bật HTTPS Only', 'Đặt minimum TLS version là 1.3'],
      answer: [0],
      explain: 'Service tag AzureFrontDoor.Backend giới hạn nguồn là Front Door; header X-Azure-FDID bảo đảm chỉ instance Front Door của công ty bạn. VNet integration là outbound. HTTPS Only và TLS version không giới hạn nguồn truy cập.'
    }
  ]
});

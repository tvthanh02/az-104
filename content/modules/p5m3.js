AZ.addModule({
  id: 'p5m3',
  summary: '<strong>App Service plan</strong> là tập tài nguyên compute (OS, region, số instance, size, pricing tier) mà các web app chạy trên đó. Tier của plan quyết định tính năng (custom domain, TLS, deployment slot, autoscale, VNet integration) và số instance tối đa, còn số instance quyết định hóa đơn. Đề AZ-104 rất hay hỏi "tier thấp nhất đáp ứng yêu cầu" và phân biệt scale up với scale out.',
  objectives: [
    'Giải thích App Service plan định nghĩa những gì và quan hệ giữa plan với các app',
    'So sánh các tier Free, Shared, Basic, Standard, Premium v3, Isolated v2 và chọn tier thấp nhất đáp ứng yêu cầu',
    'Hiểu mô hình tính phí: Shared tính theo app, các tier dedicated tính theo instance của plan',
    'Phân biệt scale up (đổi tier/size) và scale out (đổi số instance)',
    'Cấu hình autoscale cho App Service plan với rule, profile và giới hạn instance'
  ],
  sections: [
    {
      id: 'implement-plans',
      unit: 'Implement Azure App Service plans',
      title: 'App Service plan là gì?',
      html: `
<p>Mỗi app trong Azure App Service (web app, API app, một số Azure Functions) <strong>luôn chạy trong một App Service plan</strong>. Khi tạo plan ở một region, Azure cấp phát một nhóm VM (gọi là <em>instance</em> hoặc <em>worker</em>) cho plan đó. Mọi app trong plan chạy trên cùng các instance này.</p>

<h4>Plan định nghĩa</h4>
<ul>
  <li><strong>Operating system</strong>: Windows hoặc Linux. Một plan chỉ chạy một loại OS.</li>
  <li><strong>Region</strong>: app phải ở cùng region với plan.</li>
  <li><strong>Số instance</strong> (VM) trong plan.</li>
  <li><strong>Size</strong> của instance (ví dụ S1/S2/S3, P1v3/P2v3…).</li>
  <li><strong>Pricing tier</strong>: Free, Shared, Basic, Standard, Premium (v2, v3, v4), Isolated v2.</li>
</ul>

<h4>Ba nhóm tier</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Tier</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>Shared compute</strong></td><td>Free (F1), Shared (D1)</td><td>App chạy trên VM <strong>dùng chung với khách hàng khác</strong>; mỗi app có quota phút CPU; <strong>không scale out</strong>. Shared chỉ có cho Windows.</td></tr>
    <tr><td><strong>Dedicated compute</strong></td><td>Basic, Standard, Premium v2/v3/v4</td><td>VM dành riêng cho plan của bạn; chỉ các app trong cùng plan dùng chung instance.</td></tr>
    <tr><td><strong>Isolated</strong></td><td>Isolated v2</td><td>Chạy trong <strong>App Service Environment (ASE v3)</strong> nằm trong VNet của bạn: cô lập cả compute lẫn network, quy mô lớn nhất.</td></tr>
  </tbody>
</table>

<h4>Nhiều app trong một plan</h4>
<ul>
  <li>Tất cả app (và cả <strong>deployment slot</strong>, WebJobs, backup, diagnostic logs) dùng chung CPU/RAM của các instance trong plan.</li>
  <li>Khi scale plan (thủ công hay autoscale), <strong>mọi app trong plan scale cùng nhau</strong>.</li>
  <li><strong>Per-app scaling</strong> (tier dedicated): giới hạn một app chỉ chạy trên một số instance của plan; billing vẫn ở mức plan.</li>
  <li>Gộp nhiều app vào một plan giúp <strong>tiết kiệm</strong>. Tách app ra plan riêng khi: app tốn tài nguyên, cần scale độc lập, cần region khác, hoặc cần tier khác.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 260" role="img" aria-label="Một App Service plan 3 instance, mỗi instance chạy cả ba app">
  <rect class="box-a" x="10" y="10" width="520" height="240" rx="12"/>
  <text x="270" y="36" text-anchor="middle" class="t-b t-a">App Service plan · plan-web</text>
  <text x="270" y="54" text-anchor="middle" class="t-sm t-mute">Linux · Southeast Asia · Standard S1 · 3 instance</text>

  <rect class="box" x="30" y="70" width="150" height="165" rx="10"/>
  <text x="105" y="94" text-anchor="middle" class="t-b">Instance 1</text>
  <rect class="box-s" x="45" y="108" width="120" height="30" rx="6"/>
  <text x="105" y="128" text-anchor="middle" class="t-sm">app-shop</text>
  <rect class="box-s" x="45" y="146" width="120" height="30" rx="6"/>
  <text x="105" y="166" text-anchor="middle" class="t-sm">app-api</text>
  <rect class="box-s" x="45" y="184" width="120" height="30" rx="6"/>
  <text x="105" y="204" text-anchor="middle" class="t-sm">app-admin</text>

  <rect class="box" x="195" y="70" width="150" height="165" rx="10"/>
  <text x="270" y="94" text-anchor="middle" class="t-b">Instance 2</text>
  <rect class="box-s" x="210" y="108" width="120" height="30" rx="6"/>
  <text x="270" y="128" text-anchor="middle" class="t-sm">app-shop</text>
  <rect class="box-s" x="210" y="146" width="120" height="30" rx="6"/>
  <text x="270" y="166" text-anchor="middle" class="t-sm">app-api</text>
  <rect class="box-s" x="210" y="184" width="120" height="30" rx="6"/>
  <text x="270" y="204" text-anchor="middle" class="t-sm">app-admin</text>

  <rect class="box" x="360" y="70" width="150" height="165" rx="10"/>
  <text x="435" y="94" text-anchor="middle" class="t-b">Instance 3</text>
  <rect class="box-s" x="375" y="108" width="120" height="30" rx="6"/>
  <text x="435" y="128" text-anchor="middle" class="t-sm">app-shop</text>
  <rect class="box-s" x="375" y="146" width="120" height="30" rx="6"/>
  <text x="435" y="166" text-anchor="middle" class="t-sm">app-api</text>
  <rect class="box-s" x="375" y="184" width="120" height="30" rx="6"/>
  <text x="435" y="204" text-anchor="middle" class="t-sm">app-admin</text>

  <rect class="box-w" x="550" y="10" width="160" height="110" rx="10"/>
  <text x="565" y="36" class="t-b t-w">Gộp chung plan</text>
  <text x="565" y="60" class="t-sm">cùng region</text>
  <text x="565" y="80" class="t-sm">cùng OS</text>
  <text x="565" y="100" class="t-sm">scale cùng nhau</text>

  <rect class="box-x" x="550" y="140" width="160" height="110" rx="10"/>
  <text x="565" y="166" class="t-b t-x">Chi phí</text>
  <text x="565" y="190" class="t-sm">= số instance × giá</text>
  <text x="565" y="210" class="t-sm">không theo số app</text>
  <text x="565" y="230" class="t-sm">stop app vẫn trả</text>
</svg>
<figcaption>Hình 1. Plan là "máy chủ" của app: mỗi app trong plan chạy trên <strong>tất cả</strong> instance của plan. Scale plan lên 5 instance thì cả ba app cùng chạy trên 5 instance. Plan 3 instance S1 tốn tiền 3 instance S1, dù chứa 1 hay 10 app.</figcaption>
</figure>

<h4>Di chuyển app sang plan khác</h4>
<p>Có thể đổi plan của app (portal: <em>Change App Service plan</em>) khi plan nguồn và đích <strong>cùng resource group, cùng region và cùng loại OS</strong>. Về kỹ thuật, hai plan còn phải nằm cùng một <em>webspace</em> (đơn vị triển khai nội bộ); plan tạo trong cùng resource group + region + OS sẽ vào cùng webspace, nhưng plan đã chuyển từ resource group khác sang thì có thể không. Muốn chuyển app sang region khác thì phải tạo app mới (có thể clone/backup-restore).</p>

<pre><code># Tạo plan Linux Standard S1 với 2 instance, rồi tạo web app trong plan
az appservice plan create -g rg-web -n plan-web --sku S1 --is-linux --number-of-workers 2
az webapp create -g rg-web -p plan-web -n app-contoso-01 --runtime "DOTNETCORE:8.0"

# PowerShell
New-AzAppServicePlan -ResourceGroupName rg-web -Name plan-web -Location eastus \\
  -Tier Standard -WorkerSize Small -NumberofWorkers 2
New-AzWebApp -ResourceGroupName rg-web -Name app-contoso-01 -Location eastus -AppServicePlan plan-web</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo App Service plan rồi chuyển app sang plan đó</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trang tạo plan:<br><span class="path">Azure portal › Create a resource › App Service Plan › Create</span></li>
    <li>Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create App Service Plan</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Tags</span><span>Review + create</span></div>
        <div class="blade-sec">Project Details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource Group</label><span class="pv sel">rg-web</span></div>
        <div class="blade-sec">App Service Plan details</div>
        <div class="pf"><label class="req">Name</label><span class="pv">plan-web</span></div>
        <div class="pf"><label class="req">Operating System</label><span class="pv radio">Linux</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">Southeast Asia</span></div>
        <div class="blade-sec">Pricing Tier</div>
        <div class="pf"><label>Pricing plan</label><span class="pv sel">Standard S1</span></div>
        <div class="pf"><label></label><span class="pv note">Explore pricing plans: xem bảng so sánh vCPU, RAM, storage, số instance tối đa</span></div>
        <div class="blade-sec">Zone redundancy</div>
        <div class="pf"><label>Zone redundancy</label><span class="pv radio">Disabled</span></div>
        <div class="pf"><label></label><span class="pv note">Enabled: tối thiểu 3 instance; chỉ chọn được lúc tạo plan</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">&lt; Previous</span><span class="pbtn">Next : Tags &gt;</span></div>
      </div>
    </li>
    <li>Bấm <strong>Review + create</strong> → <strong>Create</strong>. Plan bắt đầu tính phí ngay cả khi chưa có app nào.</li>
    <li>Chuyển một app có sẵn sang plan mới:<br><span class="path">App Services › app-contoso-01 › App Service plan › Change plan</span><br>Trong khung <strong>Change App Service plan</strong>, danh sách chỉ hiện các plan <em>cùng resource group và cùng region</em> (đổi OS Windows ↔ Linux không được hỗ trợ). Chọn <code>plan-web</code> → <strong>Save</strong>. Nếu app đang bật VNet integration, phải tắt trước khi đổi plan.</li>
  </ol>
  </div>
</div>

<div class="callout exam"><strong>Góc thi</strong>Câu hỏi kiểu "có 3 web app, cần dùng ít App Service plan nhất": app chỉ dùng chung plan khi <strong>cùng region và cùng OS</strong> (một app Windows và một app Linux, hoặc hai region khác nhau, cần plan khác nhau). Stop một web app <strong>không</strong> giảm tiền plan.</div>
`
    },
    {
      id: 'plan-pricing',
      unit: 'Determine Azure App Service plan pricing',
      title: 'Pricing tier và tính năng của từng tier',
      html: `
<h4>So sánh các tier chính</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Free</th><th>Shared</th><th>Basic</th><th>Standard</th><th>Premium v3</th><th>Isolated v2</th></tr></thead>
  <tbody>
    <tr><td>Compute</td><td>Dùng chung</td><td>Dùng chung</td><td>Dedicated</td><td>Dedicated</td><td>Dedicated</td><td>Dedicated + VNet riêng (ASE)</td></tr>
    <tr><td>Số app/plan</td><td>10</td><td>100</td><td>Không giới hạn*</td><td>Không giới hạn*</td><td>Không giới hạn*</td><td>Không giới hạn*</td></tr>
    <tr><td>CPU/ngày</td><td>60 phút</td><td>240 phút</td><td colspan="4">Không giới hạn</td></tr>
    <tr><td>Storage</td><td>1 GB</td><td>1 GB</td><td>10 GB</td><td>50 GB</td><td>250 GB</td><td>1 TB</td></tr>
    <tr><td>Instance tối đa</td><td>—</td><td>—</td><td><strong>3</strong></td><td><strong>10</strong></td><td><strong>30</strong></td><td><strong>100</strong></td></tr>
    <tr><td>Custom domain</td><td><strong>Không</strong></td><td>Có</td><td>Có</td><td>Có</td><td>Có</td><td>Có</td></tr>
    <tr><td>TLS cho custom domain</td><td>Không</td><td><strong>Không</strong></td><td>SNI SSL</td><td>SNI + 1 IP SSL</td><td>SNI + 1 IP SSL</td><td>SNI + 1 IP SSL</td></tr>
    <tr><td>Scale out</td><td>Không</td><td>Không</td><td>Thủ công</td><td>Thủ công + <strong>autoscale</strong></td><td>Autoscale + automatic scaling</td><td>Autoscale</td></tr>
    <tr><td>Deployment slots</td><td>—</td><td>—</td><td>—</td><td><strong>5</strong></td><td><strong>20</strong></td><td><strong>20</strong></td></tr>
    <tr><td>VNet integration</td><td>Không</td><td>Không</td><td>Có</td><td>Có</td><td>Có</td><td>Có (app nằm trong VNet)</td></tr>
  </tbody>
</table>
<p>* Giới hạn thực tế phụ thuộc mức sử dụng tài nguyên và size instance. Free và Shared chỉ hỗ trợ chứng chỉ wildcard của <code>*.azurewebsites.net</code>.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 305" role="img" aria-label="Bậc thang pricing tier App Service từ Free tới Isolated v2 và tính năng mở thêm ở mỗi bậc">
  <text x="354" y="30" text-anchor="middle" class="t-sm t-mute">tier cao hơn: thêm tính năng, thêm instance, giá cao hơn</text>
  <line class="ln" x1="20" y1="45" x2="696" y2="45" marker-end="url(#arr)"/>

  <rect class="box" x="8" y="162" width="112" height="103" rx="8"/>
  <text x="64" y="184" text-anchor="middle" class="t-b">Free</text>
  <text x="64" y="203" text-anchor="middle" class="t-sm">CPU 60 phút</text>
  <text x="64" y="219" text-anchor="middle" class="t-sm">mỗi ngày</text>
  <text x="64" y="237" text-anchor="middle" class="t-sm">không custom</text>
  <text x="64" y="253" text-anchor="middle" class="t-sm">domain</text>

  <rect class="box" x="124" y="150" width="112" height="115" rx="8"/>
  <text x="180" y="172" text-anchor="middle" class="t-b">Shared</text>
  <text x="180" y="192" text-anchor="middle" class="t-sm">+ custom domain</text>
  <text x="180" y="210" text-anchor="middle" class="t-sm">chưa có TLS</text>
  <text x="180" y="228" text-anchor="middle" class="t-sm">chỉ Windows</text>

  <rect class="box-a" x="240" y="140" width="112" height="125" rx="8"/>
  <text x="296" y="162" text-anchor="middle" class="t-b t-a">Basic</text>
  <text x="296" y="182" text-anchor="middle" class="t-sm">+ TLS, VNet</text>
  <text x="296" y="200" text-anchor="middle" class="t-sm">scale tay</text>
  <text x="296" y="218" text-anchor="middle" class="t-sm">tối đa 3</text>

  <rect class="box-s" x="356" y="120" width="112" height="145" rx="8"/>
  <text x="412" y="142" text-anchor="middle" class="t-b t-s">Standard</text>
  <text x="412" y="162" text-anchor="middle" class="t-sm">+ autoscale</text>
  <text x="412" y="180" text-anchor="middle" class="t-sm">+ 5 slot</text>
  <text x="412" y="198" text-anchor="middle" class="t-sm">tối đa 10</text>

  <rect class="box-a" x="472" y="100" width="112" height="165" rx="8"/>
  <text x="528" y="122" text-anchor="middle" class="t-b t-a">Premium v3</text>
  <text x="528" y="142" text-anchor="middle" class="t-sm">20 slot</text>
  <text x="528" y="160" text-anchor="middle" class="t-sm">zone redundancy</text>
  <text x="528" y="178" text-anchor="middle" class="t-sm">automatic</text>
  <text x="528" y="196" text-anchor="middle" class="t-sm">scaling</text>
  <text x="528" y="214" text-anchor="middle" class="t-sm">tối đa 30</text>

  <rect class="box-e" x="588" y="80" width="112" height="185" rx="8"/>
  <text x="644" y="102" text-anchor="middle" class="t-b">Isolated v2</text>
  <text x="644" y="122" text-anchor="middle" class="t-sm">ASE v3 riêng</text>
  <text x="644" y="140" text-anchor="middle" class="t-sm">trong VNet</text>
  <text x="644" y="158" text-anchor="middle" class="t-sm">cô lập mạng</text>
  <text x="644" y="176" text-anchor="middle" class="t-sm">tối đa 100</text>

  <line class="ln" x1="8" y1="275" x2="236" y2="275"/>
  <text x="122" y="293" text-anchor="middle" class="t-sm t-mute">shared compute</text>
  <line class="ln-a" x1="240" y1="275" x2="584" y2="275"/>
  <text x="412" y="293" text-anchor="middle" class="t-sm t-a">dedicated compute</text>
  <line class="ln" x1="588" y1="275" x2="700" y2="275"/>
  <text x="644" y="293" text-anchor="middle" class="t-sm t-mute">isolated</text>
</svg>
<figcaption>Hình 1. Mỗi bậc giữ tính năng của bậc dưới và mở thêm tính năng mới ("tối đa N" là số instance tối đa). Hai mốc hay thi: <strong>Basic</strong> là tier rẻ nhất có TLS cho custom domain; <strong>Standard</strong> là tier rẻ nhất có autoscale và deployment slot.</figcaption>
</figure>

<h4>Tier chọn cho tình huống nào</h4>
<ul>
  <li><strong>Free / Shared</strong>: thử nghiệm, học tập. Không có SLA. Shared cho dùng custom domain nhưng không gắn được TLS.</li>
  <li><strong>Basic</strong>: dev/test, tải thấp; cần custom domain + TLS; scale tay tối đa 3 instance.</li>
  <li><strong>Standard</strong>: production; <strong>tier thấp nhất có autoscale và deployment slots</strong>.</li>
  <li><strong>Premium v3 (và v4)</strong>: hiệu năng cao hơn, nhiều instance hơn (30), 20 slot, zone redundancy, automatic scaling. Premium v3 có thêm các size memory-optimized (Pmv3).</li>
  <li><strong>Isolated v2</strong>: yêu cầu cô lập mạng hoàn toàn, chạy trong ASE v3 của riêng bạn, private inbound/outbound, quy mô đến 100 instance.</li>
</ul>

<h4>Mô hình tính phí</h4>
<table>
  <thead><tr><th>Tier</th><th>Tính phí thế nào</th></tr></thead>
  <tbody>
    <tr><td>Free</td><td>Miễn phí</td></tr>
    <tr><td>Shared</td><td>Tính theo <strong>từng app</strong> (mỗi app có quota phút CPU)</td></tr>
    <tr><td>Basic, Standard, Premium</td><td>Tính theo <strong>từng VM instance</strong> của plan, theo giờ, <strong>bất kể có bao nhiêu app</strong> hay app có đang chạy hay không</td></tr>
    <tr><td>Isolated v2</td><td>Tính theo số <strong>isolated worker</strong> (instance Isolated v2) trong App Service Environment</td></tr>
  </tbody>
</table>
<ul>
  <li>Các tính năng như custom domain, TLS (SNI), deployment slots, backup <strong>không tính phí thêm</strong>. Ngoại lệ: mua <strong>App Service domain</strong>, <strong>App Service certificate</strong>, và kết nối <strong>IP-based TLS</strong> (một số tier Standard trở lên có 1 IP SSL miễn phí).</li>
  <li>Plan 1 instance S1 chứa 5 app tốn bằng plan 1 instance S1 chứa 1 app. Plan 3 instance S1 tốn gấp 3 lần.</li>
  <li>Muốn ngừng tính phí: <strong>xóa plan</strong> hoặc scale xuống Free. Stop app không đủ.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Mẫu câu "tier rẻ nhất hỗ trợ X": custom domain → <strong>Shared</strong>; custom domain + TLS → <strong>Basic</strong>; deployment slots hoặc autoscale → <strong>Standard</strong>; hơn 10 instance hoặc hơn 5 slot → <strong>Premium v3</strong>; cô lập mạng hoàn toàn / hơn 30 instance → <strong>Isolated v2</strong>; VNet integration → <strong>Basic</strong>.</div>
`
    },
    {
      id: 'scale-up-out',
      unit: 'Scale up and scale out Azure App Service',
      title: 'Scale up và scale out App Service',
      html: `
<div class="compare">
  <div><strong>Scale up (vertical)</strong>Đổi <strong>pricing tier / size</strong> của plan: thêm CPU, RAM, disk và mở thêm tính năng (slots, autoscale…). Ví dụ B1 → S1 → P1v3. Scale down là chiều ngược lại.</div>
  <div><strong>Scale out (horizontal)</strong>Tăng <strong>số instance</strong> của plan. Mọi app trong plan chạy trên tất cả instance, traffic được App Service tự cân bằng tải. Có thể thủ công hoặc tự động (autoscale).</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 280" role="img" aria-label="Plan S1 hai instance: scale up đổi sang P1v3, scale out tăng lên bốn instance">
  <rect class="zone" x="10" y="90" width="180" height="100" rx="10"/>
  <text x="100" y="112" text-anchor="middle" class="t-b">Ban đầu: S1 × 2</text>
  <rect class="box" x="28" y="125" width="60" height="50" rx="8"/>
  <text x="58" y="155" text-anchor="middle" class="t-b">S1</text>
  <rect class="box" x="112" y="125" width="60" height="50" rx="8"/>
  <text x="142" y="155" text-anchor="middle" class="t-b">S1</text>

  <rect class="zone" x="300" y="10" width="410" height="120" rx="10"/>
  <text x="505" y="32" text-anchor="middle" class="t-b t-a">Scale up: đổi tier (S1 → P1v3)</text>
  <rect class="box-a" x="320" y="45" width="95" height="70" rx="8"/>
  <text x="367" y="76" text-anchor="middle" class="t-b">P1v3</text>
  <text x="367" y="95" text-anchor="middle" class="t-sm t-mute">2 vCPU · 8 GB</text>
  <rect class="box-a" x="430" y="45" width="95" height="70" rx="8"/>
  <text x="477" y="76" text-anchor="middle" class="t-b">P1v3</text>
  <text x="477" y="95" text-anchor="middle" class="t-sm t-mute">2 vCPU · 8 GB</text>
  <text x="545" y="68" class="t-sm">CPU/RAM lớn hơn</text>
  <text x="545" y="86" class="t-sm">mở thêm tính năng</text>
  <text x="545" y="104" class="t-sm">vẫn 2 instance</text>

  <rect class="zone" x="300" y="150" width="410" height="120" rx="10"/>
  <text x="505" y="172" text-anchor="middle" class="t-b t-s">Scale out: thêm instance (2 → 4)</text>
  <rect class="box-s" x="318" y="190" width="55" height="50" rx="8"/>
  <text x="345" y="220" text-anchor="middle" class="t-b">S1</text>
  <rect class="box-s" x="381" y="190" width="55" height="50" rx="8"/>
  <text x="408" y="220" text-anchor="middle" class="t-b">S1</text>
  <rect class="box-s dash" x="444" y="190" width="55" height="50" rx="8"/>
  <text x="471" y="220" text-anchor="middle" class="t-b t-s">S1</text>
  <rect class="box-s dash" x="507" y="190" width="55" height="50" rx="8"/>
  <text x="534" y="220" text-anchor="middle" class="t-b t-s">S1</text>
  <text x="578" y="205" class="t-sm">thủ công hoặc</text>
  <text x="578" y="223" class="t-sm">autoscale</text>
  <text x="578" y="241" class="t-sm">LB có sẵn</text>

  <line class="ln-a" x1="190" y1="125" x2="298" y2="72" marker-end="url(#arr-a)"/>
  <line class="ln-s" x1="190" y1="155" x2="298" y2="210" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. Cùng một plan S1 × 2: <strong>scale up</strong> giữ số instance nhưng đổi sang size/tier mạnh hơn; <strong>scale out</strong> giữ size nhưng thêm instance (nét đứt). Cả hai áp dụng cho mọi app trong plan.</figcaption>
</figure>

<h4>Đặc điểm của scale up</h4>
<ul>
  <li>Thực hiện trong vài giây, <strong>không cần redeploy code</strong> hay đổi cấu hình app; app có thể restart.</li>
  <li>Áp dụng cho <strong>mọi app trong plan</strong>.</li>
  <li>Scale down có thể bị chặn nếu đang dùng tính năng tier thấp không hỗ trợ (ví dụ đang có deployment slot mà muốn về Basic, hoặc số instance vượt max của tier đích).</li>
  <li>Chuyển giữa một số dòng tier (ví dụ sang Premium v3 từ plan cũ) có thể cần tạo plan mới nếu "stamp" hiện tại không hỗ trợ; portal sẽ báo.</li>
</ul>

<h4>Đặc điểm của scale out</h4>
<ul>
  <li>Free và Shared <strong>không scale out</strong>.</li>
  <li>Basic: scale out <strong>thủ công</strong>, tối đa 3 instance.</li>
  <li>Standard trở lên: thủ công hoặc <strong>autoscale</strong>; tối đa 10 (Standard), 30 (Premium v2/v3/v4), 100 (Isolated v2).</li>
  <li>Ứng dụng nên <strong>stateless</strong>. Mặc định App Service bật <strong>ARR affinity</strong> (cookie session affinity) để giữ người dùng trên cùng instance; tắt đi để phân phối đều hơn nếu app không lưu session cục bộ.</li>
</ul>

<h4>Lệnh tham khảo</h4>
<pre><code># Scale up: đổi tier
az appservice plan update -g rg-web -n plan-web --sku P1V3

# Scale out thủ công: đổi số instance
az appservice plan update -g rg-web -n plan-web --number-of-workers 4

# PowerShell
Set-AzAppServicePlan -ResourceGroupName rg-web -Name plan-web -Tier PremiumV3 -WorkerSize Small
Set-AzAppServicePlan -ResourceGroupName rg-web -Name plan-web -NumberofWorkers 4</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: scale up lên Premium v3 rồi scale out thủ công</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở web app, trong menu trái ở nhóm <em>App Service plan</em> chọn <strong>Scale up (App Service plan)</strong>:<br><span class="path">App Services › app-contoso-01 › Scale up (App Service plan)</span></li>
    <li>Trong bảng pricing plan (có thể chuyển <em>Hardware view</em> / <em>Feature view</em>), chọn <strong>Premium v3 P1V3</strong> rồi bấm <strong>Select</strong>. Thao tác hoàn tất sau vài giây, không cần deploy lại code.</li>
    <li>Mở <strong>Scale out (App Service plan)</strong> và đặt số instance cố định:
      <div class="blade">
        <div class="blade-title">app-contoso-01 | Scale out (App Service plan)</div>
        <div class="blade-sec">Scaling</div>
        <div class="pf"><label>Scale out method</label><span class="pv radio">Manual</span></div>
        <div class="pf"><label></label><span class="pv note">Các lựa chọn khác: Automatic (Premium v2–v4), Rules Based (Standard trở lên)</span></div>
        <div class="pf"><label>Instance count</label><span class="pv">3</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Kiểm tra trên trang <strong>Overview</strong> của plan: <em>Pricing plan</em> là P1v3 và số instance là 3. Mọi app khác trong cùng plan cũng đã được scale theo.</li>
  </ol>
  </div>
</div>

<figure class="fig"><img src="assets/img/p5m3/scale-up-pricing.png" alt="Bảng chọn pricing plan khi scale up: nhóm Dev/Test gồm Free F1 và Basic B1–B3, nhóm Production gồm các size Premium v3, nhóm Legacy gồm Standard S1, S2; cột ACU/vCPU, vCPU, Memory, Remote Storage, Scale" loading="lazy"><figcaption>Hình 2. Màn hình <em>Scale up</em> ở chế độ Hardware view. Cột cuối là số instance tối đa của tier (Basic 3, Standard 10, Premium v3 30). Lưu ý portal hiện xếp Standard S1–S3 vào nhóm <em>Legacy</em> và gợi ý Premium v3 cho production. Nguồn: <a href="https://learn.microsoft.com/en-us/azure/app-service/manage-scale-up" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Tình huống</h4>
<table>
  <thead><tr><th>Vấn đề</th><th>Hướng xử lý</th></tr></thead>
  <tbody>
    <tr><td>App cần thêm RAM cho mỗi request, xử lý nặng</td><td>Scale <strong>up</strong> (size lớn hơn)</td></tr>
    <tr><td>Nhiều người dùng đồng thời, CPU mỗi instance đều cao</td><td>Scale <strong>out</strong></td></tr>
    <tr><td>Cần deployment slot nhưng đang ở Basic</td><td>Scale <strong>up</strong> lên Standard</td></tr>
    <tr><td>Standard đã 10 instance vẫn quá tải</td><td>Scale <strong>up</strong> lên Premium v3 rồi scale out tiếp</td></tr>
    <tr><td>Một app ồn ào làm chậm các app khác cùng plan</td><td>Chuyển app đó sang <strong>plan riêng</strong> (hoặc per-app scaling)</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Bẫy thi</strong>"Scale up" trong App Service là đổi <strong>tier</strong>, không phải thêm instance. Thêm instance cho plan Basic được, nhưng chỉ <strong>thủ công</strong> và tối đa <strong>3</strong>. Đề hỏi "tự động thêm instance khi CPU cao" mà plan đang là Basic → phải scale up lên <strong>Standard</strong> trước.</div>
`
    },
    {
      id: 'autoscale',
      unit: 'Configure Azure App Service autoscale',
      title: 'Cấu hình autoscale cho App Service',
      html: `
<p>Autoscale của App Service dùng chung engine <strong>Azure Monitor autoscale</strong> như VM Scale Sets, và được cấu hình trên <strong>App Service plan</strong> (không phải từng app). Yêu cầu tier <strong>Standard trở lên</strong>.</p>

<h4>Hai lựa chọn trên portal (Scale out (App Service plan))</h4>
<ul>
  <li><strong>Manual</strong>: đặt số instance cố định.</li>
  <li><strong>Rules Based</strong> (custom autoscale): cấu hình profile và rule theo metric/lịch.</li>
  <li><strong>Automatic</strong> (automatic scaling, Premium v2/v3/v4): nền tảng tự scale theo HTTP traffic; bạn chỉ đặt <em>maximum burst</em> và <em>always ready instances</em>, không viết rule.</li>
</ul>

<h4>Thành phần của autoscale setting</h4>
<ul>
  <li><strong>Instance limits</strong>: Minimum, Maximum, Default (dùng khi thiếu metric).</li>
  <li><strong>Profile</strong>: Default, Recurrence (theo ngày trong tuần), Fixed date; ưu tiên fixed date → recurrence → default.</li>
  <li><strong>Rule</strong>: metric + time grain statistic + duration + time aggregation + operator/threshold + operation + cool down.</li>
  <li><strong>Notifications</strong>: email cho admin/co-admin, email tùy chọn, webhook.</li>
</ul>

<h4>Metric của App Service plan hay dùng</h4>
<table>
  <thead><tr><th>Metric</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td>CPU Percentage</td><td>% CPU trung bình qua các instance</td></tr>
    <tr><td>Memory Percentage</td><td>% bộ nhớ sử dụng</td></tr>
    <tr><td>Http Queue Length</td><td>Số request HTTP đang chờ xử lý</td></tr>
    <tr><td>Disk Queue Length</td><td>Số request đọc/ghi disk đang chờ</td></tr>
    <tr><td>Data In / Data Out</td><td>Băng thông vào/ra</td></tr>
  </tbody>
</table>
<p>Cũng có thể scale theo metric của resource khác, ví dụ <strong>số message trong Service Bus queue</strong> hoặc <strong>Storage queue</strong>, và theo metric Application Insights.</p>

<h4>Logic đánh giá</h4>
<ul>
  <li><strong>Scale out</strong> khi <strong>bất kỳ</strong> rule scale out nào thỏa; <strong>scale in</strong> chỉ khi <strong>tất cả</strong> rule scale in thỏa.</li>
  <li><strong>Cool down</strong> (mặc định portal 5 phút) ngăn scale liên tục.</li>
  <li>Luôn tạo <strong>cặp rule</strong> scale out / scale in, ngưỡng cách xa nhau để tránh flapping.</li>
</ul>

<h4>Ví dụ Azure CLI</h4>
<pre><code>PLAN_ID=$(az appservice plan show -g rg-web -n plan-web --query id -o tsv)

az monitor autoscale create -g rg-web -n as-plan-web --resource $PLAN_ID \\
  --min-count 2 --max-count 8 --count 2

az monitor autoscale rule create -g rg-web --autoscale-name as-plan-web \\
  --condition "CpuPercentage &gt; 70 avg 10m" --scale out 1

az monitor autoscale rule create -g rg-web --autoscale-name as-plan-web \\
  --condition "CpuPercentage &lt; 30 avg 10m" --scale in 1</code></pre>

<h4>Các bước trên portal</h4>
<ol class="steps">
  <li>Mở App Service plan (hoặc web app) → <strong>Scale out (App Service plan)</strong>.</li>
  <li>Chọn <strong>Rules Based</strong> → <strong>Manage rules based scaling</strong> → <strong>Custom autoscale</strong>.</li>
  <li>Trong default profile, đặt Minimum/Maximum/Default.</li>
  <li><strong>Add a rule</strong>: chọn metric CPU Percentage, Greater than 70, duration 10 phút, Increase count by 1, cool down 5 phút.</li>
  <li>Thêm rule scale in tương ứng (Less than 30, Decrease count by 1).</li>
  <li>(Tùy chọn) <strong>Add a scale condition</strong> dạng lịch cho giờ cao điểm. <strong>Save</strong>, sau đó theo dõi tab <strong>Run history</strong>.</li>
</ol>

<figure class="fig"><img src="assets/img/p5m3/scale-out-method.png" alt="Trang Scale out (App Service plan) với Scale out method gồm Manual, Automatic, Rules Based; khi chọn Automatic có Maximum burst, Always ready instances và Enforce scale out limit" loading="lazy"><figcaption>Hình 1. Trang <em>Scale out (App Service plan)</em> với ba lựa chọn <strong>Manual</strong>, <strong>Automatic</strong>, <strong>Rules Based</strong>. Khi chọn Automatic (Premium v2–v4), bạn chỉ đặt <em>Maximum burst</em> (mức trần cho plan), <em>Always ready instances</em> (số instance tối thiểu của app) và tùy chọn <em>Enforce scale out limit</em>; không có rule nào để viết. Chỉ nên bật một phương thức scale cho mỗi plan. Nguồn: <a href="https://learn.microsoft.com/en-us/azure/app-service/manage-automatic-scaling" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<div class="callout exam"><strong>Góc thi</strong>Autoscale cho web app cần plan <strong>Standard</strong> trở lên. Plan đang ở Standard tối đa 10 instance: nếu cần autoscale tới 20 instance thì phải scale up lên <strong>Premium v3</strong>. Autoscale áp dụng cho <strong>cả plan</strong>, nên mọi app trong plan cùng tăng số instance.</div>
`
    }
  ],
  keyFacts: [
    'App Service plan định nghĩa <strong>OS, region, số instance, size, pricing tier</strong>. App phải cùng region với plan.',
    'Free (F1): 60 phút CPU/ngày, 10 app, không custom domain. Shared (D1): 240 phút CPU/ngày, 100 app, custom domain nhưng <strong>không TLS</strong>, chỉ Windows.',
    'Instance tối đa: Basic <strong>3</strong>, Standard <strong>10</strong>, Premium v2/v3 <strong>30</strong>, Isolated v2 <strong>100</strong>.',
    'Deployment slots: Standard <strong>5</strong>, Premium <strong>20</strong>, Isolated <strong>20</strong>; Basic trở xuống không có.',
    '<strong>Standard</strong> là tier thấp nhất có <strong>autoscale</strong> và <strong>deployment slots</strong>.',
    '<strong>Basic</strong> là tier thấp nhất có <strong>TLS cho custom domain</strong>, <strong>VNet integration</strong> và scale out (thủ công).',
    'Tier dedicated tính phí theo <strong>số instance của plan</strong>, không theo số app; Shared tính theo từng app; Isolated v2 tính theo isolated worker.',
    'Stop web app không giảm phí; muốn ngừng phí phải xóa plan hoặc chuyển về Free.',
    'Scale up = đổi tier/size; scale out = thêm instance. Scale/autoscale áp dụng cho <strong>mọi app</strong> trong plan.',
    'Chuyển app sang plan khác: cùng <strong>resource group, region và OS</strong>.',
    'Isolated v2 chạy trong <strong>App Service Environment v3</strong>, cô lập compute và network.'
  ],
  traps: [
    'Chọn Shared vì "có custom domain" khi đề yêu cầu <strong>HTTPS/TLS</strong> cho domain đó. Cần tối thiểu <strong>Basic</strong>.',
    'Chọn Basic khi đề yêu cầu <strong>autoscale</strong> hoặc <strong>deployment slot</strong>. Cần tối thiểu <strong>Standard</strong>.',
    'Nghĩ rằng thêm app vào plan dedicated làm tăng chi phí. Chi phí theo <strong>instance</strong>, không theo số app.',
    'Stop web app để tiết kiệm tiền. Plan vẫn tính phí cho instance đang cấp phát.',
    'Nhầm "scale up" là thêm instance. Scale up là đổi <strong>tier/size</strong>; thêm instance là <strong>scale out</strong>.',
    'Đặt app Linux và app Windows chung một plan. Mỗi plan chỉ có <strong>một OS</strong>.',
    'Cần hơn 10 instance nhưng giữ Standard. Phải lên <strong>Premium v3</strong> (30) hoặc <strong>Isolated v2</strong> (100).'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Tier</th><th>Instance max</th><th>Slots</th><th>Autoscale</th><th>Custom domain / TLS</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td>Free F1</td><td>1 (shared)</td><td>—</td><td>Không</td><td>Không / Không</td><td>60 phút CPU/ngày, 10 app, 1 GB</td></tr>
    <tr><td>Shared D1</td><td>1 (shared)</td><td>—</td><td>Không</td><td>Có / Không</td><td>240 phút CPU/ngày, chỉ Windows, tính phí theo app</td></tr>
    <tr><td>Basic</td><td>3</td><td>—</td><td>Không (scale tay)</td><td>Có / SNI</td><td>Dedicated, VNet integration, 10 GB</td></tr>
    <tr><td>Standard</td><td>10</td><td>5</td><td>Có</td><td>Có / SNI + IP</td><td>Production, 50 GB</td></tr>
    <tr><td>Premium v3</td><td>30</td><td>20</td><td>Có + automatic scaling</td><td>Có / SNI + IP</td><td>Zone redundancy, 250 GB</td></tr>
    <tr><td>Isolated v2</td><td>100</td><td>20</td><td>Có</td><td>Có / SNI + IP</td><td>ASE v3 trong VNet riêng, 1 TB</td></tr>
  </tbody>
</table>
<p>Lệnh: <code>az appservice plan create --sku S1 --is-linux</code> · scale up <code>az appservice plan update --sku P1V3</code> · scale out <code>--number-of-workers 4</code> · autoscale <code>az monitor autoscale create</code></p>`,
  flashcards: [
    { front: 'App Service plan định nghĩa những gì?', back: '<strong>OS</strong>, <strong>region</strong>, <strong>số instance</strong>, <strong>size</strong> instance và <strong>pricing tier</strong>.' },
    { front: 'Quota CPU của Free và Shared?', back: 'Free: <strong>60 phút/ngày</strong>. Shared: <strong>240 phút/ngày</strong>.' },
    { front: 'Tier thấp nhất hỗ trợ custom domain?', back: '<strong>Shared</strong> (nhưng không gắn TLS được).' },
    { front: 'Tier thấp nhất hỗ trợ custom domain có TLS?', back: '<strong>Basic</strong> (SNI SSL).' },
    { front: 'Tier thấp nhất có autoscale và deployment slot?', back: '<strong>Standard</strong>.' },
    { front: 'Số deployment slot của Standard và Premium?', back: 'Standard <strong>5</strong>, Premium <strong>20</strong> (Isolated cũng 20).' },
    { front: 'Instance tối đa của Basic, Standard, Premium v3, Isolated v2?', back: '<strong>3</strong>, <strong>10</strong>, <strong>30</strong>, <strong>100</strong>.' },
    { front: 'Tier dedicated tính phí thế nào?', back: 'Theo <strong>từng VM instance</strong> của plan, bất kể số app hay app có chạy không.' },
    { front: 'Shared tier tính phí thế nào?', back: 'Theo <strong>từng app</strong> (mỗi app có quota phút CPU).' },
    { front: 'Scale up khác scale out?', back: 'Scale up: đổi <strong>tier/size</strong>. Scale out: tăng <strong>số instance</strong>.' },
    { front: 'Tier nào chạy trong App Service Environment?', back: '<strong>Isolated v2</strong> (ASE v3), cô lập cả compute lẫn network.' },
    { front: 'Điều kiện chuyển app sang plan khác?', back: 'Hai plan cùng <strong>resource group</strong>, <strong>region</strong> và <strong>OS</strong>.' },
    { front: 'Autoscale App Service cấu hình ở đâu?', back: 'Trên <strong>App Service plan</strong>; áp dụng cho mọi app trong plan.' },
    { front: 'Metric phổ biến để autoscale App Service?', back: 'CPU Percentage, Memory Percentage, Http Queue Length, Disk Queue Length, Data In/Out; hoặc metric resource khác (Service Bus/Storage queue).' },
    { front: 'Automatic scaling (không cần rule) có ở tier nào?', back: '<strong>Premium v2/v3/v4</strong>: scale theo HTTP traffic với maximum burst và always ready instances.' }
  ],
  quiz: [
    {
      q: 'Công ty bạn cần host một web app với custom domain <code>www.contoso.com</code> qua HTTPS. Không cần autoscale hay deployment slot. Bạn chọn tier rẻ nhất nào?',
      options: ['Free', 'Shared', 'Basic', 'Standard'],
      answer: [2],
      explain: 'Basic là tier thấp nhất hỗ trợ gắn TLS/SSL (SNI) cho custom domain. Free không hỗ trợ custom domain; Shared có custom domain nhưng không gắn được TLS. Standard đáp ứng nhưng đắt hơn mức cần.'
    },
    {
      q: 'Bạn cần dùng deployment slot để swap phiên bản staging sang production cho web app, với chi phí thấp nhất. Plan hiện tại là B2. Bạn nên làm gì?',
      options: ['Scale up plan lên Standard', 'Scale out plan lên 3 instance', 'Tạo thêm một plan Basic cho staging', 'Scale up plan lên Premium v3'],
      answer: [0],
      explain: 'Deployment slots có từ tier Standard (5 slot). Scale out không mở thêm tính năng; plan Basic riêng không tạo được slot; Premium v3 đáp ứng nhưng đắt hơn cần thiết.'
    },
    {
      q: 'Plan P1 (Standard S1, 2 instance) đang chứa 3 web app. Bạn triển khai thêm 2 web app cùng region và OS vào plan này. Chi phí compute thay đổi thế nào?',
      options: ['Tăng khoảng 66% vì số app tăng từ 3 lên 5', 'Tăng gấp đôi', 'Không đổi vì phí tính theo số instance của plan', 'Giảm vì được chiết khấu theo số app'],
      answer: [2],
      explain: 'Ở các tier dedicated, phí tính theo số VM instance của plan, không theo số app. Thêm app không đổi chi phí (nhưng các app dùng chung tài nguyên). Chỉ tier Shared tính phí theo từng app.'
    },
    {
      q: 'Web app của bạn chạy trên plan Basic B1. Bạn cần tự động thêm instance khi CPU trên 75%. Bạn phải làm gì trước tiên?',
      options: ['Cấu hình rule autoscale trên plan B1', 'Bật Always On', 'Tăng số instance thủ công lên 3', 'Scale up plan lên Standard hoặc cao hơn'],
      answer: [3],
      explain: 'Autoscale yêu cầu tier Standard trở lên; Basic chỉ hỗ trợ scale out thủ công tối đa 3 instance. Always On chỉ giữ app không bị unload khi nhàn rỗi.'
    },
    {
      q: 'Ứng dụng của bạn cần chạy tới 25 instance khi cao điểm và tự động co giãn. Tier nào đáp ứng với chi phí thấp nhất?',
      options: ['Standard', 'Premium v3', 'Isolated v2', 'Basic'],
      answer: [1],
      explain: 'Premium v3 hỗ trợ tối đa 30 instance và autoscale. Standard tối đa 10, Basic tối đa 3 và không có autoscale. Isolated v2 đáp ứng nhưng đắt hơn và chỉ cần khi yêu cầu cô lập mạng.'
    },
    {
      q: 'Bạn có các app sau: App1 (Windows, East US), App2 (Linux, East US), App3 (Windows, West Europe), App4 (Windows, East US). Cần tối thiểu bao nhiêu App Service plan?',
      options: ['1', '2', '3', '4'],
      answer: [2],
      explain: 'Một plan chỉ có một OS và một region. App1 và App4 dùng chung một plan Windows East US; App2 cần plan Linux East US; App3 cần plan Windows West Europe. Tổng cộng 3 plan.'
    },
    {
      q: 'Đội tài chính muốn ngừng toàn bộ chi phí compute cho một môi trường thử nghiệm gồm plan S1 với 2 web app. Phương án nào đạt yêu cầu? (Chọn 2)',
      options: ['Stop cả hai web app', 'Xóa App Service plan (sau khi xóa hoặc chuyển các app)', 'Tắt ARR affinity', 'Scale down plan về tier Free'],
      answer: [1, 3],
      explain: 'Xóa plan hoặc chuyển về tier Free đều loại bỏ phí compute. Stop app không giải phóng instance nên plan vẫn tính phí. ARR affinity chỉ ảnh hưởng cách phân phối session.'
    },
    {
      q: 'Một ngân hàng yêu cầu web app chạy trên compute dành riêng, nằm trong VNet riêng, không dùng chung hạ tầng front-end với khách hàng khác và cần tới 50 instance. Bạn chọn tier nào?',
      options: ['Isolated v2', 'Premium v3 với VNet integration', 'Standard với private endpoint', 'Basic với access restrictions'],
      answer: [0],
      explain: 'Isolated v2 chạy trong App Service Environment v3 đặt trong VNet của bạn, cô lập cả compute và network, hỗ trợ tới 100 instance. Premium v3 tối đa 30 instance và vẫn dùng hạ tầng front-end chung; Standard và Basic không đáp ứng số instance.'
    },
    {
      q: 'Bạn đổi plan từ S1 sang P1v3 trên portal. Điều gì đúng về thao tác này?',
      options: ['Đây là scale out; số instance tăng lên', 'Bạn phải deploy lại code cho tất cả app', 'Chỉ app được chọn chuyển sang P1v3, các app khác giữ S1', 'Đây là scale up; áp dụng cho mọi app trong plan mà không cần redeploy'],
      answer: [3],
      explain: 'Đổi tier là scale up, áp dụng cho toàn bộ plan nên mọi app trong plan cùng chuyển, và không cần redeploy code. Số instance không đổi khi scale up.'
    },
    {
      q: 'Autoscale của plan có min = 2, max = 10, default = 4, rule scale out khi CPU &gt; 70% và scale in khi CPU &lt; 30%. Metric CPU tạm thời không thu thập được. Plan sẽ chạy bao nhiêu instance?',
      options: ['2', '4', '10', 'Không thay đổi so với hiện tại'],
      answer: [1],
      explain: 'Khi không có metric, autoscale dùng default instance count, ở đây là 4. Min và max chỉ là giới hạn dưới và trên của việc scale.'
    },
    {
      q: 'Bạn cần web app tự động tăng instance khi số message trong một Azure Service Bus queue vượt 1.000. Cách nào đúng?',
      options: ['Tạo rule autoscale trên App Service plan dùng metric của Service Bus queue', 'Không thể; autoscale chỉ dùng metric của chính plan', 'Dùng Azure Traffic Manager', 'Scale up lên Premium v3 là đủ'],
      answer: [0],
      explain: 'Rule autoscale có thể dùng metric của resource khác như Service Bus queue hoặc Storage queue. Traffic Manager là cân bằng tải DNS giữa các endpoint; scale up không tự động thêm instance.'
    },
    {
      q: 'Plan S2 chứa App1 và App2. App1 thường dùng 90% CPU làm App2 chậm. Bạn muốn App2 ổn định và scale độc lập. Bạn nên làm gì?',
      options: ['Scale out plan lên 4 instance', 'Bật ARR affinity cho App2', 'Chuyển App1 sang một App Service plan riêng', 'Đổi App2 sang deployment slot của App1'],
      answer: [2],
      explain: 'Các app trong cùng plan dùng chung instance; tách app tốn tài nguyên ra plan riêng giúp scale độc lập. Scale out tăng chi phí nhưng hai app vẫn tranh tài nguyên; ARR affinity và slot không giải quyết tranh chấp CPU.'
    },
    {
      q: 'Bạn cần chọn tier rẻ nhất cho web app thỏa mãn: VNet integration để gọi API nội bộ, custom domain có TLS, không cần slot hay autoscale. Bạn chọn gì?',
      options: ['Shared', 'Standard', 'Premium v3', 'Basic'],
      answer: [3],
      explain: 'Basic hỗ trợ VNet integration và TLS SNI cho custom domain. Shared không có VNet integration và TLS; Standard và Premium v3 đáp ứng nhưng đắt hơn cần thiết.'
    }
  ]
});

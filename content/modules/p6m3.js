AZ.addModule({
  id: 'p6m3',
  summary: 'Azure Monitor là nền tảng giám sát thống nhất của Azure. Với VM, bạn cần phân biệt <strong>host metrics</strong> (Azure thu tự động) và <strong>guest data</strong> (cần <strong>Azure Monitor Agent</strong> và <strong>data collection rule</strong>), biết dùng metrics explorer, VM insights, Log Analytics với KQL, alert rule, action group, Activity log và diagnostic settings. Đây là phần có trọng số đáng kể trong domain "Monitor and maintain Azure resources" của AZ-104.',
  objectives: [
    'Phân biệt hai loại dữ liệu của Azure Monitor: metrics và logs, cùng các nguồn dữ liệu của VM',
    'Xem và phân tích host metrics bằng metrics explorer (aggregation, filter, splitting, pin)',
    'Bật VM insights / enhanced monitoring với Azure Monitor Agent và data collection rule',
    'Thu thập Windows Event Logs và Syslog vào Log Analytics workspace và truy vấn bằng KQL',
    'Tạo alert rule (metric, log search, activity log), action group và alert processing rule',
    'Dùng Activity log và diagnostic settings để gửi dữ liệu nền tảng tới Log Analytics, storage, Event Hubs'
  ],
  sections: [
    {
      id: 'monitoring-vms',
      unit: 'Monitoring for Azure VMs',
      title: 'Giám sát Azure VM: tổng quan',
      html: `
<p><strong>Azure Monitor</strong> thu thập, phân tích và phản ứng với dữ liệu giám sát từ Azure, on-premises và cloud khác. Mọi dữ liệu quy về hai kho chính:</p>
<div class="compare">
  <div><strong>Metrics</strong>Giá trị số theo chuỗi thời gian (time series), nhẹ, gần thời gian thực. Lưu trong <strong>Azure Monitor Metrics</strong>; platform metrics được giữ <strong>93 ngày</strong>. Xem bằng <strong>metrics explorer</strong>, dùng cho metric alert và autoscale.</div>
  <div><strong>Logs</strong>Bản ghi có cấu trúc (sự kiện, trace, perf counter) nhiều thuộc tính. Lưu trong <strong>Log Analytics workspace</strong>, truy vấn bằng <strong>KQL</strong>. Dùng cho phân tích phức tạp, log search alert, workbook.</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="Nền tảng dữ liệu Azure Monitor: nguồn dữ liệu đổ vào Metrics và Logs, từ đó dùng cho metrics explorer, alert rules, Log Analytics">
  <text x="90" y="16" text-anchor="middle" class="t-sm t-mute">Nguồn dữ liệu</text>
  <text x="350" y="16" text-anchor="middle" class="t-sm t-mute">Kho dữ liệu</text>
  <text x="620" y="16" text-anchor="middle" class="t-sm t-mute">Dùng để</text>

  <rect class="box" x="10" y="28" width="160" height="50" rx="10"/>
  <text x="90" y="49" text-anchor="middle" class="t-b">Platform metrics</text>
  <text x="90" y="67" text-anchor="middle" class="t-sm t-mute">host VM, tự động</text>
  <rect class="box" x="10" y="98" width="160" height="50" rx="10"/>
  <text x="90" y="119" text-anchor="middle" class="t-b">Activity log</text>
  <text x="90" y="137" text-anchor="middle" class="t-sm t-mute">control plane, 90 ngày</text>
  <rect class="box" x="10" y="168" width="160" height="50" rx="10"/>
  <text x="90" y="189" text-anchor="middle" class="t-b">Guest OS</text>
  <text x="90" y="207" text-anchor="middle" class="t-sm t-mute">AMA + DCR</text>
  <rect class="box" x="10" y="238" width="160" height="50" rx="10"/>
  <text x="90" y="259" text-anchor="middle" class="t-b">Ứng dụng</text>
  <text x="90" y="277" text-anchor="middle" class="t-sm t-mute">Application Insights</text>

  <rect class="box-a" x="260" y="40" width="180" height="90" rx="12"/>
  <text x="350" y="72" text-anchor="middle" class="t-b t-a">Metrics</text>
  <text x="350" y="92" text-anchor="middle" class="t-sm">Azure Monitor Metrics</text>
  <text x="350" y="110" text-anchor="middle" class="t-sm t-mute">time series · 93 ngày</text>
  <rect class="box-w" x="260" y="170" width="180" height="90" rx="12"/>
  <text x="350" y="202" text-anchor="middle" class="t-b t-w">Logs</text>
  <text x="350" y="222" text-anchor="middle" class="t-sm">Log Analytics workspace</text>
  <text x="350" y="240" text-anchor="middle" class="t-sm t-mute">bảng + KQL</text>

  <rect class="box" x="530" y="28" width="180" height="50" rx="10"/>
  <text x="620" y="49" text-anchor="middle" class="t-b">Metrics explorer</text>
  <text x="620" y="67" text-anchor="middle" class="t-sm t-mute">biểu đồ, so sánh</text>
  <rect class="box-x" x="530" y="100" width="180" height="90" rx="10"/>
  <text x="620" y="128" text-anchor="middle" class="t-b">Alert rules</text>
  <text x="620" y="148" text-anchor="middle" class="t-sm">→ action group</text>
  <text x="620" y="166" text-anchor="middle" class="t-sm t-mute">email, SMS, runbook…</text>
  <rect class="box" x="530" y="212" width="180" height="76" rx="10"/>
  <text x="620" y="240" text-anchor="middle" class="t-b">Log Analytics (KQL)</text>
  <text x="620" y="260" text-anchor="middle" class="t-sm t-mute">Workbooks, VM insights</text>

  <line class="ln-a" x1="170" y1="53" x2="256" y2="70" marker-end="url(#arr-a)"/>
  <line class="ln dash" x1="170" y1="123" x2="256" y2="195" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="193" x2="256" y2="215" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="263" x2="256" y2="235" marker-end="url(#arr)"/>
  <line class="ln" x1="440" y1="65" x2="526" y2="53" marker-end="url(#arr)"/>
  <line class="ln" x1="440" y1="105" x2="526" y2="130" marker-end="url(#arr)"/>
  <line class="ln" x1="440" y1="190" x2="526" y2="160" marker-end="url(#arr)"/>
  <line class="ln" x1="440" y1="230" x2="526" y2="250" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Mọi dữ liệu giám sát quy về hai kho: <strong>Metrics</strong> (số theo thời gian) và <strong>Logs</strong> (bản ghi trong Log Analytics). Host metrics tự vào Metrics; guest OS cần AMA + DCR; Activity log xem được ngay nhưng muốn truy vấn KQL/giữ lâu thì phải gửi vào workspace bằng diagnostic setting (đường nét đứt). Cả hai kho đều cấp dữ liệu cho alert rule.</figcaption>
</figure>

<h4>Các lớp dữ liệu của một VM</h4>
<table>
  <thead><tr><th>Lớp</th><th>Dữ liệu</th><th>Cách thu thập</th></tr></thead>
  <tbody>
    <tr><td><strong>Host (nền tảng)</strong></td><td>CPU, mạng, disk I/O nhìn từ hypervisor</td><td><strong>Tự động</strong>, miễn phí, không cần agent</td></tr>
    <tr><td><strong>Activity log</strong></td><td>Thao tác quản trị: tạo, khởi động, dừng, xóa, đổi cấu hình VM</td><td>Tự động, miễn phí, giữ <strong>90 ngày</strong></td></tr>
    <tr><td><strong>Boot diagnostics</strong></td><td>Ảnh chụp màn hình console và serial log khi khởi động</td><td>Bật trên VM (managed storage account khuyến nghị)</td></tr>
    <tr><td><strong>Guest OS</strong></td><td>Perf counter trong OS (memory % used, disk free space, process…), Windows Event Logs, Syslog, text log, IIS log</td><td><strong>Azure Monitor Agent (AMA)</strong> + <strong>data collection rule (DCR)</strong></td></tr>
    <tr><td><strong>Ứng dụng</strong></td><td>Request, exception, dependency</td><td>Application Insights / OpenTelemetry</td></tr>
  </tbody>
</table>

<h4>Các công cụ chính</h4>
<ul>
  <li><strong>Overview / Monitoring tab</strong> của VM: biểu đồ host metrics cơ bản.</li>
  <li><strong>Metrics explorer</strong>: phân tích metric chi tiết.</li>
  <li><strong>VM insights / enhanced monitoring</strong>: hiệu năng guest OS, (tùy chọn) bản đồ kết nối.</li>
  <li><strong>Log Analytics</strong>: truy vấn KQL trên guest logs và dữ liệu nền tảng.</li>
  <li><strong>Alerts</strong> + <strong>action groups</strong>: thông báo và tự động hóa.</li>
  <li><strong>Workbooks</strong>, <strong>dashboards</strong>, Grafana: trực quan hóa.</li>
  <li><strong>Recommended alert rules</strong>: portal gợi ý sẵn bộ alert phổ biến cho VM (CPU, memory, disk, network, availability).</li>
</ul>

<h4>Agent: điều cần nhớ</h4>
<ul>
  <li><strong>Azure Monitor Agent (AMA)</strong> là agent hiện hành cho Windows và Linux, cài dưới dạng VM extension; cấu hình hoàn toàn bằng DCR.</li>
  <li><strong>Log Analytics agent</strong> (còn gọi MMA/OMS agent) đã <strong>ngừng hỗ trợ từ 31/8/2024</strong>; sau 2/3/2026 việc upload dữ liệu từ agent này có thể dừng bất kỳ lúc nào. Phải chuyển sang AMA.</li>
  <li>AMA dùng <strong>managed identity</strong> để xác thực; với Azure Arc-enabled servers có thể giám sát máy on-premises và cloud khác bằng cùng cách.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Cần giám sát <strong>% memory đã dùng</strong> hoặc <strong>dung lượng trống của ổ C:</strong>" thì host metrics không đủ, phải cài <strong>Azure Monitor Agent</strong> + DCR (hoặc bật VM insights). "Ai đã tắt VM lúc 2 giờ sáng?" thì xem <strong>Activity log</strong>.</div>
`
    },
    {
      id: 'host-data',
      unit: 'Monitor VM host data',
      title: 'Host metrics và dữ liệu nền tảng của VM',
      html: `
<p>Ngay khi VM được tạo, Azure tự động thu <strong>host metrics</strong> mỗi phút, không cần agent, không tính phí, giữ <strong>93 ngày</strong>. Đây là số đo từ <em>phía host</em> (hypervisor), nên chỉ phản ánh những gì nhìn được từ bên ngoài VM.</p>

<h4>Host metrics phổ biến</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Metric</th></tr></thead>
  <tbody>
    <tr><td>CPU</td><td><code>Percentage CPU</code>, CPU Credits Remaining/Consumed (series B)</td></tr>
    <tr><td>Mạng</td><td><code>Network In Total</code>, <code>Network Out Total</code>, Inbound/Outbound Flows</td></tr>
    <tr><td>Đĩa</td><td><code>Disk Read Bytes</code>, <code>Disk Write Bytes</code>, <code>Disk Read/Write Operations/Sec</code>, OS/Data Disk IOPS/bandwidth consumed %, queue depth</td></tr>
    <tr><td>Bộ nhớ</td><td><code>Available Memory Bytes</code> (nhìn từ host; chi tiết như % used, page file cần guest metrics)</td></tr>
    <tr><td>Sẵn sàng</td><td>VM Availability metric (VM có đang chạy và phản hồi)</td></tr>
  </tbody>
</table>

<h4>Xem nhanh trên portal</h4>
<ul>
  <li>Trang <strong>Overview &gt; Monitoring</strong> của VM: biểu đồ CPU, network, disk bytes, disk operations theo khoảng thời gian chọn.</li>
  <li>Mục <strong>Monitoring &gt; Metrics</strong>: mở metrics explorer với scope là VM.</li>
  <li>Mục <strong>Help &gt; Boot diagnostics</strong>: screenshot và serial log, rất hữu ích khi VM không khởi động hoặc không RDP/SSH được.</li>
  <li><strong>Resource health</strong>: trạng thái sức khỏe của VM theo góc nhìn nền tảng (Available, Unavailable, Degraded) và lịch sử sự cố.</li>
</ul>

<h4>Boot diagnostics</h4>
<ul>
  <li>Bật mặc định khi tạo VM qua portal, dùng <strong>managed storage account</strong> (khuyến nghị) hoặc storage account của bạn.</li>
  <li>Cần cho tính năng <strong>Serial console</strong>.</li>
</ul>
<pre><code>az vm boot-diagnostics enable -g rg-app -n vm-web01
az vm boot-diagnostics get-boot-log -g rg-app -n vm-web01</code></pre>

<h4>Lấy metric bằng CLI/PowerShell</h4>
<pre><code>az monitor metrics list --resource &lt;vm-resource-id&gt; \\
  --metric "Percentage CPU" --interval PT5M --aggregation Average Maximum

az monitor metrics list-definitions --resource &lt;vm-resource-id&gt; -o table

# PowerShell
Get-AzMetric -ResourceId &lt;vm-resource-id&gt; -MetricName "Percentage CPU" -TimeGrain 00:05:00 -AggregationType Average</code></pre>

<div class="callout warn"><strong>Giới hạn của host metrics</strong>Host không nhìn thấy bên trong hệ điều hành: không biết tiến trình nào ngốn CPU, ổ đĩa logic nào sắp đầy, dịch vụ Windows nào bị dừng. Những câu hỏi đó cần <strong>guest data</strong> qua Azure Monitor Agent.</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần biết lượng dữ liệu mạng VM gửi ra ngoài trong tuần qua, không cài thêm gì" thì dùng host metric <strong>Network Out Total</strong> trong metrics explorer. "VM không khởi động, cần xem màn hình lỗi" thì dùng <strong>boot diagnostics</strong>.</div>
`
    },
    {
      id: 'metrics-explorer',
      unit: 'Use metrics explorer to view detailed host metrics',
      title: 'Metrics explorer',
      html: `
<p><strong>Metrics explorer</strong> (Azure Monitor &gt; Metrics, hoặc mục Metrics của tài nguyên) cho phép vẽ biểu đồ, so sánh và phân tích metric.</p>

<h4>Các thành phần của một biểu đồ</h4>
<ol class="steps">
  <li><strong>Scope</strong>: một hoặc nhiều tài nguyên. Có thể chọn nhiều VM cùng loại, cùng region trong một subscription để so sánh.</li>
  <li><strong>Metric namespace</strong>: ví dụ <em>Virtual Machine Host</em> (host metrics) hoặc namespace guest (nếu gửi guest metrics vào Azure Monitor Metrics).</li>
  <li><strong>Metric</strong>: ví dụ Percentage CPU.</li>
  <li><strong>Aggregation</strong>: <strong>Avg</strong>, <strong>Min</strong>, <strong>Max</strong>, <strong>Sum</strong>, <strong>Count</strong>.</li>
  <li><strong>Time range</strong> và <strong>time granularity</strong> (1 phút, 5 phút, 1 giờ…).</li>
</ol>

<h4>Tính năng phân tích</h4>
<ul>
  <li><strong>Add metric</strong>: nhiều metric trên một biểu đồ (ví dụ Disk Read Bytes và Disk Write Bytes).</li>
  <li><strong>Add filter</strong>: lọc theo <strong>dimension</strong> (ví dụ chỉ LUN 0 của data disk).</li>
  <li><strong>Apply splitting</strong>: tách một metric thành nhiều đường theo giá trị dimension (ví dụ theo từng VM hoặc từng LUN).</li>
  <li><strong>Chart type</strong>: line, area, bar, scatter, grid.</li>
  <li><strong>Pin to dashboard</strong> / <strong>Save to workbook</strong>, <strong>Share</strong> (link, Excel).</li>
  <li><strong>New alert rule</strong>: tạo metric alert trực tiếp từ biểu đồ.</li>
</ul>

<h4>Giới hạn thời gian</h4>
<ul>
  <li>Platform metrics được lưu <strong>93 ngày</strong>.</li>
  <li>Một biểu đồ hiển thị tối đa <strong>30 ngày</strong> dữ liệu; muốn xem xa hơn thì dịch khoảng thời gian (vẫn trong 93 ngày).</li>
  <li>Cần lưu lâu hơn hoặc truy vấn phức tạp: dùng <strong>diagnostic settings</strong> gửi metrics vào Log Analytics hoặc storage.</li>
</ul>

<h4>Chọn aggregation đúng</h4>
<table>
  <thead><tr><th>Câu hỏi</th><th>Aggregation</th></tr></thead>
  <tbody>
    <tr><td>CPU trung bình theo thời gian</td><td>Avg</td></tr>
    <tr><td>Phát hiện đỉnh CPU ngắn</td><td>Max</td></tr>
    <tr><td>Tổng dữ liệu mạng gửi đi trong ngày</td><td>Sum (Network Out Total)</td></tr>
    <tr><td>Số lần mẫu được ghi nhận</td><td>Count</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Mẹo</strong>Biểu đồ trung bình với granularity lớn (1 giờ) có thể "làm phẳng" các đỉnh ngắn. Khi điều tra sự cố, giảm granularity xuống 1 phút và dùng <strong>Max</strong>.</div>

<div class="callout exam"><strong>Góc thi</strong>"So sánh CPU của 5 VM trên một biểu đồ, mỗi VM một đường" thì chọn cả 5 VM trong scope (cùng region, cùng subscription) hoặc dùng <strong>splitting</strong>. "Dữ liệu metric 6 tháng trước" thì metrics explorer không còn (giới hạn 93 ngày), cần đã gửi qua diagnostic settings vào Log Analytics/storage.</div>
`
    },
    {
      id: 'vm-insights',
      unit: 'Collect client performance counters by using VM insights',
      title: 'Guest performance: VM insights, Azure Monitor Agent và DCR',
      html: `
<p>Để thấy hiệu năng <strong>bên trong</strong> VM (memory % used, logical disk free space, network theo adapter, process), bạn bật <strong>VM insights</strong>, nay được trình bày trong portal là <strong>enhanced monitoring</strong> của VM. Việc bật sẽ cài <strong>Azure Monitor Agent</strong> và tạo <strong>data collection rule</strong> thu bộ perf counter mặc định.</p>

<h4>Hai cách lưu guest metrics</h4>
<div class="compare">
  <div><strong>Logs-based (cổ điển)</strong>Perf counter được ghi vào Log Analytics workspace (bảng <code>InsightsMetrics</code>), xem qua các workbook Performance của VM insights, truy vấn bằng KQL.</div>
  <div><strong>OpenTelemetry metrics (khuyến nghị cho triển khai mới)</strong>Guest metrics được lưu như metric, xem trực tiếp trong trải nghiệm Monitor của VM và metrics explorer, chi phí thấp hơn logs.</div>
</div>
<p>Tính năng <strong>Map</strong> (bản đồ tiến trình và kết nối mạng giữa các máy) của VM insights cần thêm <strong>Dependency agent</strong>.</p>

<h4>Data collection rule (DCR)</h4>
<ul>
  <li>Định nghĩa <strong>thu gì</strong> (data source: performance counters, Windows Event Logs, Syslog, text/JSON log, IIS log), <strong>gửi đi đâu</strong> (destination: Log Analytics workspace, Azure Monitor Metrics), và tùy chọn <strong>transformation</strong> bằng KQL để lọc/biến đổi trước khi ingest.</li>
  <li>Gắn DCR với máy qua <strong>data collection rule association (DCRA)</strong>; quan hệ nhiều-nhiều: một máy có nhiều DCR, một DCR áp cho nhiều máy.</li>
  <li>Tạo DCR trong portal sẽ tự cài AMA lên các máy được chọn.</li>
  <li>Có thể dùng <strong>Azure Policy</strong> built-in để cài AMA và gắn DCR cho mọi VM trong một scope.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Azure Monitor Agent trên các VM gửi dữ liệu theo data collection rule tới Log Analytics workspace và Azure Monitor Metrics">
  <rect class="zone" x="10" y="20" width="170" height="200" rx="12"/>
  <text x="95" y="40" text-anchor="middle" class="t-sm t-mute">Máy được gắn DCR</text>
  <rect class="box-a" x="25" y="55" width="140" height="60" rx="10"/>
  <text x="95" y="80" text-anchor="middle" class="t-b">vm-web01</text>
  <text x="95" y="100" text-anchor="middle" class="t-sm">AMA extension</text>
  <rect class="box-a" x="25" y="140" width="140" height="60" rx="10"/>
  <text x="95" y="165" text-anchor="middle" class="t-b">vm-lnx01</text>
  <text x="95" y="185" text-anchor="middle" class="t-sm">AMA extension</text>

  <rect class="box-e" x="250" y="20" width="220" height="200" rx="12"/>
  <text x="360" y="46" text-anchor="middle" class="t-b">Data collection rule</text>
  <text x="360" y="64" text-anchor="middle" class="t-sm t-mute">dcr-vm-basic</text>
  <rect class="box" x="265" y="80" width="190" height="36" rx="8"/>
  <text x="360" y="103" text-anchor="middle">Performance counters</text>
  <rect class="box" x="265" y="124" width="190" height="36" rx="8"/>
  <text x="360" y="147" text-anchor="middle">Windows Events / Syslog</text>
  <rect class="box" x="265" y="168" width="190" height="36" rx="8"/>
  <text x="360" y="191" text-anchor="middle">Transformation (KQL)</text>

  <rect class="box-w" x="550" y="30" width="160" height="80" rx="10"/>
  <text x="630" y="58" text-anchor="middle" class="t-b">Log Analytics</text>
  <text x="630" y="78" text-anchor="middle" class="t-sm">Perf, Event, Syslog</text>
  <text x="630" y="96" text-anchor="middle" class="t-sm t-mute">InsightsMetrics</text>
  <rect class="box-s" x="550" y="140" width="160" height="70" rx="10"/>
  <text x="630" y="168" text-anchor="middle" class="t-b">Azure Monitor</text>
  <text x="630" y="188" text-anchor="middle" class="t-sm">Metrics</text>

  <line class="ln-a" x1="180" y1="120" x2="246" y2="120" marker-end="url(#arr-a)"/>
  <text x="213" y="111" text-anchor="middle" class="t-sm t-a">DCRA</text>
  <text x="213" y="136" text-anchor="middle" class="t-sm t-mute">dữ liệu</text>
  <line class="ln-a" x1="470" y1="90" x2="546" y2="70" marker-end="url(#arr-a)"/>
  <line class="ln-s" x1="470" y1="150" x2="546" y2="175" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. DCR mô tả <em>thu gì</em> (data source), <em>lọc/biến đổi thế nào</em> (transformation) và <em>gửi đi đâu</em> (destination). DCR được gắn vào từng máy qua <strong>data collection rule association</strong>; AMA trên máy đọc cấu hình đó để gửi dữ liệu. Một máy có thể gắn nhiều DCR và một DCR dùng cho nhiều máy.</figcaption>
</figure>

<h4>Tạo bằng CLI</h4>
<pre><code># Cài Azure Monitor Agent (Windows) lên VM
az vm extension set -g rg-app --vm-name vm-web01 \\
  --name AzureMonitorWindowsAgent --publisher Microsoft.Azure.Monitor --enable-auto-upgrade true

# Linux: --name AzureMonitorLinuxAgent

# Tạo DCR từ file JSON và gắn vào VM
az monitor data-collection rule create -g rg-mon -n dcr-perf -l eastus --rule-file dcr-perf.json
az monitor data-collection rule association create --name dcra-web01 \\
  --rule-id &lt;dcr-resource-id&gt; --resource &lt;vm-resource-id&gt;</code></pre>

<h4>Perf counter thường gặp</h4>
<table>
  <thead><tr><th>Windows</th><th>Linux</th></tr></thead>
  <tbody>
    <tr><td><code>\\Processor Information(_Total)\\% Processor Time</code></td><td>Processor: % Processor Time</td></tr>
    <tr><td><code>\\Memory\\% Committed Bytes In Use</code>, <code>\\Memory\\Available Bytes</code></td><td>Memory: % Used Memory, Available MBytes</td></tr>
    <tr><td><code>\\LogicalDisk(_Total)\\% Free Space</code></td><td>Logical Disk: % Free Space</td></tr>
  </tbody>
</table>

<h4>Truy vấn ví dụ</h4>
<pre><code>// % dung lượng trống của ổ đĩa logic, theo máy
InsightsMetrics
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| summarize avg(Val) by Computer, bin(TimeGenerated, 1h)

// Perf counter thu bằng DCR tùy chỉnh
Perf
| where ObjectName == "Memory" and CounterName == "% Committed Bytes In Use"
| summarize avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| render timechart</code></pre>

<div class="callout exam"><strong>Góc thi</strong>Agent hiện hành là <strong>Azure Monitor Agent</strong>, cấu hình bằng <strong>data collection rule</strong>. Đáp án nhắc tới "Log Analytics agent (MMA)" hay "workspace-based agent configuration" là cách cũ. Cần <strong>bản đồ phụ thuộc giữa các máy</strong> thì phải có thêm <strong>Dependency agent</strong> (Map của VM insights).</div>
`
    },
    {
      id: 'event-logs',
      unit: 'Collect VM client event logs',
      title: 'Thu thập Windows Event Logs và Syslog',
      html: `
<p>Log của hệ điều hành khách <strong>không</strong> được thu mặc định. Bạn tạo một DCR với data source tương ứng, đích là <strong>Log Analytics workspace</strong>. Việc ingest và lưu trữ log có tính phí theo dung lượng.</p>

<h4>Windows Event Logs</h4>
<ul>
  <li>Chọn log (Application, System, Security) và mức độ (Critical, Error, Warning, Information, Verbose) theo dạng <em>Basic</em>, hoặc viết <strong>XPath</strong> ở dạng <em>Custom</em> để lọc chính xác.</li>
  <li>Dữ liệu vào bảng <strong><code>Event</code></strong>. Security events khi dùng Microsoft Sentinel/Defender vào bảng <code>SecurityEvent</code>.</li>
</ul>
<pre><code>// Ví dụ XPath trong DCR
System!*[System[(Level=1 or Level=2 or Level=3)]]
Application!*[System[(Level=1 or Level=2)]]
Security!*[System[(EventID=4625)]]   // đăng nhập thất bại</code></pre>

<h4>Syslog (Linux)</h4>
<ul>
  <li>Chọn <strong>facility</strong> (auth, authpriv, cron, daemon, kern, syslog, user…) và <strong>mức log tối thiểu</strong> (Debug, Info, Notice, Warning, Error, Critical, Alert, Emergency).</li>
  <li>Dữ liệu vào bảng <strong><code>Syslog</code></strong>.</li>
</ul>

<h4>Các nguồn log khác qua AMA</h4>
<ul>
  <li><strong>Text log / JSON log</strong> tùy chỉnh (cần tạo custom table, ví dụ <code>MyAppLog_CL</code>).</li>
  <li><strong>IIS logs</strong> (bảng <code>W3CIISLog</code>).</li>
  <li>Windows Firewall logs, SNMP traps.</li>
</ul>

<h4>Các bước tạo DCR thu Event Log trong portal</h4>
<ol class="steps">
  <li><em>Monitor &gt; Data Collection Rules &gt; Create</em>; chọn region, platform (Windows/Linux/All).</li>
  <li><strong>Resources</strong>: chọn VM (hoặc resource group/subscription); AMA sẽ được cài.</li>
  <li><strong>Collect and deliver &gt; Add data source</strong>: chọn <em>Windows Event Logs</em> (hoặc <em>Linux Syslog</em>), chọn mức log hoặc XPath.</li>
  <li><strong>Destination</strong>: Azure Monitor Logs, chọn Log Analytics workspace.</li>
  <li>Review + create. Chờ vài phút rồi truy vấn bảng <code>Event</code>/<code>Syslog</code>.</li>
</ol>

<h4>Truy vấn mẫu</h4>
<pre><code>// Lỗi trong System log 24 giờ qua, đếm theo nguồn
Event
| where TimeGenerated &gt; ago(24h)
| where EventLog == "System" and EventLevelName == "Error"
| summarize count() by Computer, Source
| sort by count_ desc

// Syslog mức err trở lên
Syslog
| where SeverityLevel in ("err", "crit", "alert", "emerg")
| project TimeGenerated, Computer, Facility, SyslogMessage
| take 50

// Máy không gửi heartbeat trong 15 phút
Heartbeat
| summarize LastSeen = max(TimeGenerated) by Computer
| where LastSeen &lt; ago(15m)</code></pre>

<div class="callout warn"><strong>Kiểm soát chi phí</strong>Thu toàn bộ Information/Verbose của Security và Application có thể sinh rất nhiều dữ liệu. Dùng XPath hoặc <strong>transformation</strong> trong DCR để chỉ giữ sự kiện cần thiết.</div>

<div class="callout exam"><strong>Góc thi</strong>"Cần thu các sự kiện Error trong System log của 50 VM Windows vào Log Analytics" thì tạo <strong>một DCR</strong> với data source Windows Event Logs và gắn cho cả 50 VM (AMA). "Truy vấn trong Log Analytics không có dữ liệu Syslog" thì kiểm tra DCR đã có data source <strong>Syslog</strong> với facility và mức log phù hợp chưa.</div>
`
    },
    {
      id: 'log-analytics-kql',
      extra: true,
      title: 'Log Analytics workspace và KQL cơ bản',
      html: `
<h4>Log Analytics workspace</h4>
<ul>
  <li>Kho log của Azure Monitor (và Microsoft Sentinel, Defender for Cloud). Mỗi nguồn dữ liệu ghi vào các <strong>bảng</strong> (Event, Syslog, Perf, Heartbeat, AzureActivity, AzureDiagnostics…).</li>
  <li><strong>Retention</strong>: mặc định <strong>30 ngày</strong> (31 ngày đã gồm trong giá ingest); analytics retention tối đa <strong>2 năm (730 ngày)</strong>; tổng retention (kèm long-term) tối đa <strong>12 năm</strong>. Bảng <code>AzureActivity</code> và <code>Usage</code> giữ 90 ngày miễn phí.</li>
  <li><strong>Table plan</strong>: Analytics (truy vấn đầy đủ, alert), Basic và Auxiliary (rẻ hơn, giới hạn truy vấn).</li>
  <li><strong>Access control mode</strong>: <em>workspace-context</em> (quyền trên workspace) hoặc <em>resource-context</em> (người dùng chỉ thấy log của tài nguyên họ có quyền). Vai trò: <strong>Log Analytics Reader</strong>, <strong>Log Analytics Contributor</strong>.</li>
  <li>Chi phí theo GB ingest (pay-as-you-go hoặc commitment tier).</li>
</ul>
<pre><code>az monitor log-analytics workspace create -g rg-mon -n law-prod -l eastus
az monitor log-analytics workspace update -g rg-mon -n law-prod --retention-time 90</code></pre>

<h4>KQL: cú pháp cốt lõi</h4>
<p>Truy vấn bắt đầu bằng tên bảng, các toán tử nối nhau bằng dấu <code>|</code>, dữ liệu chảy từ trái sang phải.</p>
<table>
  <thead><tr><th>Toán tử</th><th>Tác dụng</th><th>Ví dụ</th></tr></thead>
  <tbody>
    <tr><td><code>where</code></td><td>Lọc dòng</td><td><code>where TimeGenerated &gt; ago(1h)</code></td></tr>
    <tr><td><code>project</code></td><td>Chọn/đổi tên cột</td><td><code>project Computer, CounterValue</code></td></tr>
    <tr><td><code>extend</code></td><td>Thêm cột tính toán</td><td><code>extend GB = Bytes / 1e9</code></td></tr>
    <tr><td><code>summarize</code></td><td>Gom nhóm và tính toán</td><td><code>summarize avg(CounterValue) by Computer</code></td></tr>
    <tr><td><code>bin()</code></td><td>Chia thời gian thành khoảng</td><td><code>by bin(TimeGenerated, 5m)</code></td></tr>
    <tr><td><code>take</code> / <code>limit</code></td><td>Lấy N dòng bất kỳ</td><td><code>take 10</code></td></tr>
    <tr><td><code>top</code></td><td>N dòng lớn nhất theo cột</td><td><code>top 5 by count_</code></td></tr>
    <tr><td><code>sort by</code> / <code>order by</code></td><td>Sắp xếp (mặc định giảm dần)</td><td><code>sort by TimeGenerated desc</code></td></tr>
    <tr><td><code>count</code></td><td>Đếm số dòng</td><td><code>Event | count</code></td></tr>
    <tr><td><code>render</code></td><td>Vẽ biểu đồ</td><td><code>render timechart</code></td></tr>
    <tr><td><code>ago()</code></td><td>Thời điểm tương đối</td><td><code>ago(7d)</code>, <code>ago(30m)</code></td></tr>
  </tbody>
</table>

<pre><code>// CPU trung bình 5 phút của từng máy trong 1 giờ qua, vẽ biểu đồ
Perf
| where TimeGenerated &gt; ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| render timechart

// Ai đã xóa tài nguyên trong 7 ngày qua
AzureActivity
| where TimeGenerated &gt; ago(7d)
| where OperationNameValue endswith "/DELETE" and ActivityStatusValue == "Success"
| project TimeGenerated, Caller, ResourceGroup, _ResourceId</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: chạy truy vấn KQL trong Logs</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở Logs của workspace (scope = cả workspace). Nếu mở từ <em>VM › Monitoring › Logs</em> thì scope chỉ là VM đó:<br><span class="path">Azure portal › Log Analytics workspaces › law-prod › Logs</span></li>
    <li>Đóng hộp thoại <em>Queries hub</em> (thư viện truy vấn mẫu) và chuyển trình soạn thảo sang chế độ KQL nếu đang ở chế độ đơn giản:
      <div class="blade">
        <div class="blade-title">law-prod | Logs</div>
        <div class="pf"><label>Scope</label><span class="pv">law-prod</span></div>
        <div class="pf"><label>Chế độ</label><span class="pv sel">KQL mode</span></div>
        <div class="pf"><label>Time range</label><span class="pv sel">Last 24 hours</span></div>
        <div class="pf"><label></label><span class="pv note">Hiện "Set in query" khi truy vấn đã có điều kiện TimeGenerated</span></div>
        <div class="pbtns"><span class="pbtn primary">Run</span><span class="pbtn">Save</span><span class="pbtn">New alert rule</span></div>
      </div>
    </li>
    <li>Dán truy vấn CPU ở trên, bấm <strong>Run</strong> (hoặc <kbd>Shift</kbd>+<kbd>Enter</kbd>). Có <code>render timechart</code> nên kết quả hiện ở dạng biểu đồ; chuyển sang tab <em>Results</em> để xem bảng.</li>
    <li>Thử bỏ dòng <code>where TimeGenerated</code> và đổi Time range trên thanh công cụ để thấy hai cách giới hạn thời gian cho cùng kết quả.</li>
    <li>Bấm <strong>New alert rule</strong> để biến truy vấn thành <strong>log search alert</strong>, hoặc <strong>Save</strong> để lưu thành query dùng lại / ghim vào dashboard.</li>
  </ol>
  </div>
</div>

<div class="callout exam"><strong>Góc thi</strong>Đề hay cho đoạn KQL thiếu một toán tử. Nhớ: <strong>summarize</strong> để đếm/tính trung bình theo nhóm, <strong>project</strong> để chọn cột, <strong>where</strong> để lọc, <strong>render</strong> để vẽ biểu đồ, <strong>take</strong> trả về số dòng bất kỳ (không sắp xếp), <strong>top</strong> trả về N dòng theo thứ tự.</div>
`
    },
    {
      id: 'alerts-action-groups',
      extra: true,
      title: 'Alert rules, action groups và alert processing rules',
      html: `
<p>Một <strong>alert rule</strong> gồm: <strong>scope</strong> (tài nguyên được giám sát), <strong>condition</strong> (signal + logic), <strong>actions</strong> (action group) và chi tiết (tên, <strong>severity</strong> từ <strong>Sev 0</strong> Critical đến <strong>Sev 4</strong> Verbose). Alert đã kích hoạt được lưu <strong>30 ngày</strong>.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Luồng alert: tài nguyên sinh signal, alert rule đánh giá, alert kích hoạt, action group gửi thông báo; alert processing rule có thể chặn hoặc gắn thêm action group">
  <rect class="box" x="10" y="40" width="150" height="80" rx="10"/>
  <text x="85" y="72" text-anchor="middle" class="t-b">Tài nguyên</text>
  <text x="85" y="94" text-anchor="middle" class="t-sm t-mute">metric / log / activity</text>
  <rect class="box-a" x="195" y="40" width="150" height="80" rx="10"/>
  <text x="270" y="66" text-anchor="middle" class="t-b">Alert rule</text>
  <text x="270" y="88" text-anchor="middle" class="t-sm">scope · condition</text>
  <text x="270" y="106" text-anchor="middle" class="t-sm">severity Sev0–Sev4</text>
  <rect class="box-x" x="380" y="40" width="150" height="80" rx="10"/>
  <text x="455" y="72" text-anchor="middle" class="t-b">Alert kích hoạt</text>
  <text x="455" y="94" text-anchor="middle" class="t-sm">Fired · lưu 30 ngày</text>
  <rect class="box-e" x="565" y="40" width="145" height="80" rx="10"/>
  <text x="637" y="66" text-anchor="middle" class="t-b">Action group</text>
  <text x="637" y="88" text-anchor="middle" class="t-sm">email · SMS · voice</text>
  <text x="637" y="106" text-anchor="middle" class="t-sm">runbook · webhook</text>

  <line class="ln" x1="160" y1="80" x2="191" y2="80" marker-end="url(#arr)"/>
  <line class="ln-a" x1="345" y1="80" x2="376" y2="80" marker-end="url(#arr-a)"/>
  <line class="ln" x1="530" y1="80" x2="561" y2="80" marker-end="url(#arr)"/>

  <rect class="box-w" x="360" y="150" width="190" height="75" rx="10"/>
  <text x="455" y="176" text-anchor="middle" class="t-b">Alert processing rule</text>
  <text x="455" y="196" text-anchor="middle" class="t-sm">suppress khi bảo trì</text>
  <text x="455" y="214" text-anchor="middle" class="t-sm">hoặc apply action group</text>
  <line class="ln dash" x1="455" y1="120" x2="455" y2="146" marker-end="url(#arr)"/>
  <text x="465" y="138" class="t-sm t-mute">áp lên</text>
  <line class="ln dash" x1="550" y1="187" x2="620" y2="124" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Alert rule chỉ quyết định <em>khi nào</em> alert kích hoạt; <em>ai được báo và làm gì</em> nằm ở action group. Alert processing rule tác động lên alert đã kích hoạt: tắt thông báo trong khung bảo trì hoặc gắn action group cho nhiều rule cùng lúc.</figcaption>
</figure>

<h4>Các loại alert rule</h4>
<table>
  <thead><tr><th>Loại</th><th>Dựa trên</th><th>Đặc điểm</th></tr></thead>
  <tbody>
    <tr><td><strong>Metric alert</strong></td><td>Platform/custom metric</td><td>Gần thời gian thực; <strong>static</strong> hoặc <strong>dynamic threshold</strong> (học từ dữ liệu); một rule giám sát được nhiều tài nguyên cùng loại, cùng region; stateful (tự resolve)</td></tr>
    <tr><td><strong>Log search alert</strong></td><td>Truy vấn KQL trên Log Analytics</td><td>Chạy theo tần suất; đo số dòng hoặc giá trị tính toán; <strong>split by dimensions</strong> để có alert riêng mỗi tài nguyên; logic phức tạp</td></tr>
    <tr><td><strong>Activity log alert</strong></td><td>Sự kiện trong Activity log</td><td>Thao tác quản trị (ví dụ xóa VM), <strong>Service Health</strong>, <strong>Resource Health</strong>; luôn stateless; miễn phí</td></tr>
    <tr><td>Smart detection, Prometheus alerts</td><td>Application Insights, Prometheus metrics</td><td>Kịch bản ứng dụng và Kubernetes</td></tr>
  </tbody>
</table>

<h4>Action group</h4>
<ul>
  <li><strong>Notifications</strong>: Email, <strong>Email Azure Resource Manager role</strong> (gửi cho thành viên role Owner/Contributor/Reader/Monitoring Contributor/Monitoring Reader của subscription), SMS, Azure app push, Voice.</li>
  <li><strong>Actions</strong>: <strong>Automation runbook</strong>, <strong>Azure Function</strong>, <strong>Logic App</strong> (ví dụ gửi Teams), <strong>Webhook</strong>, <strong>Secure webhook</strong> (Entra ID), <strong>Event Hubs</strong>, <strong>ITSM</strong>.</li>
  <li>Một alert rule gắn tối đa <strong>5 action group</strong>; một action group dùng lại cho nhiều alert rule.</li>
  <li>Có giới hạn tần suất (rate limit) cho SMS, voice, push, email gửi tới cùng một địa chỉ; địa chỉ email mới cần xác minh.</li>
</ul>

<h4>Alert processing rule</h4>
<p>Áp dụng lên alert <strong>đã kích hoạt</strong> trong một scope (subscription, resource group, tài nguyên) với bộ lọc (loại alert, severity, tên rule…):</p>
<ul>
  <li><strong>Suppress notifications</strong>: tắt thông báo trong cửa sổ bảo trì (một lần, hằng ngày, hằng tuần, hằng tháng). Alert vẫn được tạo, chỉ không chạy action group.</li>
  <li><strong>Apply action group</strong>: gắn action group cho nhiều alert rule cùng lúc mà không phải sửa từng rule (ví dụ cho built-in alert của Azure Backup).</li>
</ul>

<pre><code># Action group gửi email
az monitor action-group create -g rg-mon -n ag-ops --short-name ops \\
  --action email ops-mail ops@contoso.com

# Metric alert: CPU trung bình &gt; 80% trong 5 phút
az monitor metrics alert create -g rg-mon -n cpu-high \\
  --scopes &lt;vm-resource-id&gt; --condition "avg Percentage CPU &gt; 80" \\
  --window-size 5m --evaluation-frequency 1m --severity 2 --action ag-ops

# Activity log alert khi có VM bị xóa
az monitor activity-log alert create -g rg-mon -n vm-deleted \\
  --scope /subscriptions/&lt;sub-id&gt; \\
  --condition category=Administrative and operationName=Microsoft.Compute/virtualMachines/delete \\
  --action-group ag-ops</code></pre>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: alert CPU &gt; 80% gửi email qua action group</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở trình tạo alert rule từ chính VM (scope được điền sẵn là VM đó):<br><span class="path">Azure portal › Virtual machines › vm-web01 › Monitoring › Alerts › + Create › Alert rule</span></li>
    <li>Tab <strong>Condition</strong>:
      <div class="blade">
        <div class="blade-title">Create an alert rule</div>
        <div class="blade-tabs"><span>Scope</span><span class="on">Condition</span><span>Actions</span><span>Details</span><span>Tags</span><span>Review + create</span></div>
        <div class="pf"><label class="req">Signal name</label><span class="pv sel">Percentage CPU</span></div>
        <div class="blade-sec">Alert logic</div>
        <div class="pf"><label>Threshold</label><span class="pv radio">Static</span></div>
        <div class="pf"><label class="req">Aggregation type</label><span class="pv sel">Average</span></div>
        <div class="pf"><label class="req">Operator</label><span class="pv sel">Greater than</span></div>
        <div class="pf"><label class="req">Threshold value</label><span class="pv">80</span></div>
        <div class="blade-sec">When to evaluate</div>
        <div class="pf"><label>Check every</label><span class="pv sel">1 minute</span></div>
        <div class="pf"><label>Lookback period</label><span class="pv sel">5 minutes</span></div>
        <div class="pbtns"><span class="pbtn">Next: Actions &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Actions</strong>: chọn action group có sẵn hoặc bấm <strong>+ Create action group</strong>:
      <div class="blade">
        <div class="blade-title">Create action group</div>
        <div class="blade-tabs"><span class="on">Basics</span><span>Notifications</span><span>Actions</span><span>Tags</span><span>Review + create</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-mon</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">Global</span></div>
        <div class="pf"><label class="req">Action group name</label><span class="pv">ag-ops</span></div>
        <div class="pf"><label class="req">Display name</label><span class="pv">ops</span></div>
        <div class="pf"><label></label><span class="pv note">Tên ngắn (tối đa 12 ký tự) hiển thị trong SMS/email</span></div>
        <div class="blade-sec">Tab Notifications</div>
        <div class="pf"><label class="req">Notification type</label><span class="pv sel">Email/SMS message/Push/Voice</span></div>
        <div class="pf"><label class="req">Name</label><span class="pv">ops-mail</span></div>
        <div class="pf"><label></label><span class="pv note">Tích Email, nhập ops@contoso.com; địa chỉ mới phải xác minh bằng mã OTP</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span></div>
      </div>
    </li>
    <li>Tab <strong>Details</strong>: chọn <strong>Severity</strong> (ví dụ mức <em>Warning</em>, tức Sev 2), đặt <strong>Alert rule name</strong> (không đổi tên được sau khi tạo), giữ tích <strong>Enable upon creation</strong> và <strong>Automatically resolve alerts</strong>.</li>
    <li><strong>Review + create</strong> › <strong>Create</strong>. Kiểm tra action group bằng nút <strong>Test</strong> trong <em>Monitor › Alerts › Action groups</em>.</li>
  </ol>
  </div>
</div>

<h4>Quyền</h4>
<p><strong>Monitoring Contributor</strong> tạo và quản lý alert rule, action group; <strong>Monitoring Reader</strong> chỉ xem. Người tạo cần quyền đọc trên tài nguyên đích và quyền ghi trên resource group chứa alert rule.</p>

<div class="callout exam"><strong>Góc thi</strong>"Không muốn nhận thông báo trong khung bảo trì Chủ nhật 1–3 giờ sáng" thì dùng <strong>alert processing rule</strong> loại suppression, không phải tắt/xóa alert rule. "Gửi email cho tất cả Owner của subscription" thì dùng <strong>Email Azure Resource Manager role</strong>. "Tự động restart dịch vụ khi alert bắn" thì dùng action <strong>Automation runbook</strong> hoặc <strong>Azure Function</strong>.</div>
`
    },
    {
      id: 'activity-log-diagnostics',
      extra: true,
      title: 'Activity log và diagnostic settings',
      html: `
<h4>Activity log</h4>
<ul>
  <li>Log ở <strong>mức subscription</strong> ghi các thao tác trên control plane (ARM): ai (Caller), làm gì (Operation), khi nào, trên tài nguyên nào, kết quả.</li>
  <li>Không ghi thao tác data plane (ví dụ đọc blob, đăng nhập vào VM).</li>
  <li>Được giữ <strong>90 ngày</strong>, miễn phí. Muốn giữ lâu hơn hoặc truy vấn KQL thì export bằng <strong>diagnostic setting</strong> của subscription.</li>
  <li>Category: <strong>Administrative</strong>, <strong>Service Health</strong>, <strong>Resource Health</strong>, <strong>Alert</strong>, <strong>Autoscale</strong>, <strong>Recommendation</strong>, <strong>Security</strong>, <strong>Policy</strong>.</li>
</ul>
<pre><code>az monitor activity-log list -g rg-app --offset 7d \\
  --query "[?operationName.value=='Microsoft.Compute/virtualMachines/deallocate/action'].{time:eventTimestamp, who:caller}" -o table

Get-AzActivityLog -ResourceGroupName rg-app -StartTime (Get-Date).AddDays(-7)</code></pre>

<h4>Ba loại log nền tảng</h4>
<table>
  <thead><tr><th>Loại</th><th>Phạm vi</th><th>Thu mặc định?</th></tr></thead>
  <tbody>
    <tr><td><strong>Activity log</strong></td><td>Subscription (control plane)</td><td>Có, giữ 90 ngày</td></tr>
    <tr><td><strong>Resource logs</strong></td><td>Hoạt động bên trong tài nguyên (data plane), ví dụ Key Vault AuditEvent, NSG flow event, Storage read/write</td><td><strong>Không</strong>, cần diagnostic setting</td></tr>
    <tr><td><strong>Microsoft Entra logs</strong></td><td>Sign-in, audit của tenant</td><td>Xem trong Entra; export qua diagnostic settings của Entra ID</td></tr>
  </tbody>
</table>

<h4>Diagnostic settings</h4>
<p>Một diagnostic setting định nghĩa <strong>category</strong> log/metric cần thu (hoặc category group <code>allLogs</code>, <code>audit</code>; metrics là <code>AllMetrics</code>) và <strong>đích</strong>:</p>
<table>
  <thead><tr><th>Đích</th><th>Dùng khi</th><th>Lưu ý</th></tr></thead>
  <tbody>
    <tr><td><strong>Log Analytics workspace</strong></td><td>Truy vấn KQL, log alert, workbook, Sentinel</td><td>Bảng được tạo tự động khi có dữ liệu</td></tr>
    <tr><td><strong>Storage account</strong></td><td>Lưu trữ lâu dài giá rẻ, kiểm toán (có thể dùng immutable storage)</td><td>Phải <strong>cùng region</strong> với tài nguyên (nếu tài nguyên regional); không hỗ trợ Premium storage</td></tr>
    <tr><td><strong>Event Hubs</strong></td><td>Stream ra SIEM bên thứ ba (Splunk, QRadar…) hoặc hệ thống khác</td><td>Phải cùng region với tài nguyên (nếu regional)</td></tr>
    <tr><td>Partner solutions</td><td>Datadog, Elastic, Dynatrace…</td><td>Qua Azure Native ISV Services</td></tr>
  </tbody>
</table>
<ul>
  <li>Mỗi tài nguyên tối đa <strong>5 diagnostic settings</strong>; mỗi setting có tối đa <strong>một đích mỗi loại</strong> (muốn gửi tới 2 workspace thì tạo 2 setting).</li>
  <li>Đích có thể ở subscription khác (cần quyền phù hợp).</li>
  <li>Dữ liệu bắt đầu chảy trong khoảng <strong>90 phút</strong> sau khi tạo.</li>
  <li>Dùng <strong>Azure Policy</strong> (DeployIfNotExists) để bật diagnostic settings hàng loạt.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 235" role="img" aria-label="Một diagnostic setting chọn category log và metric của tài nguyên rồi gửi tới tối đa bốn loại đích: Log Analytics, storage account, Event Hubs, partner solution">
  <rect class="box" x="10" y="90" width="140" height="60" rx="10"/>
  <text x="80" y="116" text-anchor="middle" class="t-b">Key Vault</text>
  <text x="80" y="136" text-anchor="middle" class="t-sm t-mute">kv-prod</text>

  <rect class="box-a" x="200" y="40" width="200" height="160" rx="12"/>
  <text x="300" y="66" text-anchor="middle" class="t-b t-a">Diagnostic setting</text>
  <text x="300" y="96" text-anchor="middle" class="t-sm">Logs: allLogs / audit</text>
  <text x="300" y="116" text-anchor="middle" class="t-sm t-mute">hoặc từng category</text>
  <text x="300" y="146" text-anchor="middle" class="t-sm">Metrics: AllMetrics</text>
  <text x="300" y="176" text-anchor="middle" class="t-sm t-mute">≤ 5 setting / tài nguyên</text>

  <rect class="box-s" x="470" y="10" width="240" height="46" rx="10"/>
  <text x="590" y="30" text-anchor="middle" class="t-b">Log Analytics workspace</text>
  <text x="590" y="47" text-anchor="middle" class="t-sm t-mute">KQL, log alert, Sentinel</text>
  <rect class="box-w" x="470" y="66" width="240" height="46" rx="10"/>
  <text x="590" y="86" text-anchor="middle" class="t-b">Storage account</text>
  <text x="590" y="103" text-anchor="middle" class="t-sm t-mute">lưu lâu dài, cùng region</text>
  <rect class="box-e" x="470" y="122" width="240" height="46" rx="10"/>
  <text x="590" y="142" text-anchor="middle" class="t-b">Event Hubs</text>
  <text x="590" y="159" text-anchor="middle" class="t-sm t-mute">stream ra SIEM bên ngoài</text>
  <rect class="box" x="470" y="178" width="240" height="46" rx="10"/>
  <text x="590" y="198" text-anchor="middle" class="t-b">Partner solution</text>
  <text x="590" y="215" text-anchor="middle" class="t-sm t-mute">Datadog, Elastic…</text>

  <line class="ln-a" x1="150" y1="120" x2="196" y2="120" marker-end="url(#arr-a)"/>
  <line class="ln" x1="400" y1="120" x2="466" y2="33" marker-end="url(#arr)"/>
  <line class="ln" x1="400" y1="120" x2="466" y2="89" marker-end="url(#arr)"/>
  <line class="ln" x1="400" y1="120" x2="466" y2="145" marker-end="url(#arr)"/>
  <line class="ln" x1="400" y1="120" x2="466" y2="201" marker-end="url(#arr)"/>
</svg>
<figcaption>Hình 1. Một diagnostic setting gửi cùng một bộ category tới <strong>tối đa một đích mỗi loại</strong>. Muốn gửi tới hai workspace khác nhau thì tạo thêm setting (tối đa 5 setting cho mỗi tài nguyên).</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: gửi audit log của Key Vault vào Log Analytics</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Mở Diagnostic settings của tài nguyên (hoặc <em>Monitor › Settings › Diagnostic settings</em> rồi chọn tài nguyên):<br><span class="path">Azure portal › Key vaults › kv-prod › Monitoring › Diagnostic settings › + Add diagnostic setting</span></li>
    <li>Chọn dữ liệu và đích rồi bấm <strong>Save</strong>:
      <div class="blade">
        <div class="blade-title">Diagnostic setting</div>
        <div class="pf"><label class="req">Diagnostic setting name</label><span class="pv">kv-diag</span></div>
        <div class="blade-sec">Logs</div>
        <div class="pf"><label>Category groups</label><span class="pv chk">audit</span></div>
        <div class="pf"><label></label><span class="pv note">Hoặc allLogs; chọn category group thì không tích từng category được</span></div>
        <div class="blade-sec">Metrics</div>
        <div class="pf"><label>AllMetrics</label><span class="pv chk">Bật</span></div>
        <div class="blade-sec">Destination details</div>
        <div class="pf"><label>Send to Log Analytics workspace</label><span class="pv chk">Bật</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Log Analytics workspace</label><span class="pv sel">law-prod (eastus)</span></div>
        <div class="pf"><label>Archive to a storage account</label><span class="pv">Không chọn</span></div>
        <div class="pf"><label>Stream to an event hub</label><span class="pv">Không chọn</span></div>
        <div class="pf"><label>Send to partner solution</label><span class="pv">Không chọn</span></div>
        <div class="pbtns"><span class="pbtn primary">Save</span><span class="pbtn">Discard</span></div>
      </div>
    </li>
    <li>Chờ tối đa khoảng 90 phút, sau đó vào workspace › <em>Logs</em> và truy vấn bảng tương ứng (ví dụ <code>AzureDiagnostics</code> hoặc bảng resource-specific nếu dịch vụ hỗ trợ và bạn chọn chế độ đó).</li>
  </ol>
  </div>
</div>
<pre><code>az monitor diagnostic-settings create --name kv-diag \\
  --resource &lt;keyvault-resource-id&gt; \\
  --workspace &lt;workspace-resource-id&gt; \\
  --logs '[{"categoryGroup":"audit","enabled":true}]' \\
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Export Activity log của subscription
az monitor diagnostic-settings subscription create --name sub-activity \\
  --workspace &lt;workspace-resource-id&gt; \\
  --logs '[{"category":"Administrative","enabled":true}]'</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Cần giữ Activity log 1 năm" thì export bằng diagnostic setting tới <strong>Log Analytics</strong> (tăng retention) hoặc <strong>storage account</strong>. "Gửi log Key Vault tới SIEM bên thứ ba" thì đích là <strong>Event Hubs</strong>. "Diagnostic setting không chọn được storage account" thường vì storage <strong>khác region</strong> với tài nguyên.</div>
`
    }
  ],
  keyFacts: [
    'Azure Monitor có hai kho dữ liệu: <strong>Metrics</strong> (số, time series, platform metrics giữ <strong>93 ngày</strong>) và <strong>Logs</strong> (Log Analytics workspace, KQL).',
    '<strong>Host metrics</strong> của VM (CPU, network, disk I/O) được thu tự động, miễn phí, không cần agent; guest data cần <strong>Azure Monitor Agent</strong> + <strong>DCR</strong>.',
    'Log Analytics agent (MMA/OMS) đã ngừng hỗ trợ từ <strong>31/8/2024</strong>; agent hiện hành là <strong>AMA</strong>.',
    'Metrics explorer: aggregation Avg/Min/Max/Sum/Count, filter và splitting theo dimension; một biểu đồ hiển thị tối đa <strong>30 ngày</strong>.',
    'Windows Event Logs vào bảng <code>Event</code>; Syslog vào bảng <code>Syslog</code>; perf counter vào <code>Perf</code> hoặc <code>InsightsMetrics</code> (VM insights).',
    'VM insights Map cần thêm <strong>Dependency agent</strong>.',
    'Log Analytics retention mặc định <strong>30 ngày</strong>, analytics tối đa 2 năm, tổng tối đa <strong>12 năm</strong>.',
    'Activity log giữ <strong>90 ngày</strong>; activity log alert miễn phí và stateless.',
    'Alert severity từ <strong>Sev 0</strong> (Critical) đến <strong>Sev 4</strong> (Verbose); một alert rule gắn tối đa <strong>5 action group</strong>.',
    '<strong>Alert processing rule</strong>: suppress thông báo theo lịch hoặc áp action group hàng loạt cho alert đã kích hoạt.',
    'Diagnostic settings: đích Log Analytics, storage, Event Hubs, partner; tối đa <strong>5 setting/tài nguyên</strong>; storage và Event Hubs phải cùng region với tài nguyên.',
    'Resource logs <strong>không</strong> được thu mặc định; phải tạo diagnostic setting.'
  ],
  traps: [
    'Tìm % memory đã dùng hoặc dung lượng trống ổ đĩa trong host metrics. Cần <strong>guest metrics</strong> qua AMA/VM insights.',
    'Chọn "cài Log Analytics agent (MMA)" để thu log. Agent này đã ngừng hỗ trợ; dùng <strong>Azure Monitor Agent + DCR</strong>.',
    'Tắt hoặc xóa alert rule để tránh thông báo trong giờ bảo trì. Đúng là dùng <strong>alert processing rule</strong> (suppression).',
    'Nghĩ resource logs (ví dụ AuditEvent của Key Vault) được thu tự động. Phải tạo <strong>diagnostic setting</strong>.',
    'Chọn storage account ở region khác làm đích diagnostic setting cho tài nguyên regional. Storage/Event Hubs phải <strong>cùng region</strong>.',
    'Mong xem metric của 6 tháng trước trong metrics explorer. Platform metrics chỉ giữ <strong>93 ngày</strong>.',
    'Dùng <code>take</code> khi cần N giá trị lớn nhất. <code>take</code> trả về dòng bất kỳ; dùng <code>top N by</code> hoặc <code>sort</code> + <code>take</code>.',
    'Nhầm Activity log ghi cả thao tác đăng nhập vào VM hoặc đọc blob. Activity log chỉ ghi thao tác <strong>control plane</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần</th><th>Giải pháp</th></tr></thead>
  <tbody>
    <tr><td>CPU, network, disk I/O của VM</td><td>Host metrics (tự động) + metrics explorer</td></tr>
    <tr><td>Memory % used, disk free, process</td><td>AMA + DCR / VM insights (enhanced monitoring)</td></tr>
    <tr><td>Bản đồ phụ thuộc giữa máy</td><td>VM insights Map + Dependency agent</td></tr>
    <tr><td>Windows events / Syslog</td><td>DCR → Log Analytics (bảng Event / Syslog)</td></tr>
    <tr><td>Ai tắt/xóa VM</td><td>Activity log (90 ngày)</td></tr>
    <tr><td>VM không boot</td><td>Boot diagnostics, serial console</td></tr>
    <tr><td>Alert theo ngưỡng metric</td><td>Metric alert (static/dynamic)</td></tr>
    <tr><td>Alert theo truy vấn KQL</td><td>Log search alert</td></tr>
    <tr><td>Alert khi tài nguyên bị xóa / Service Health</td><td>Activity log alert</td></tr>
    <tr><td>Tắt thông báo khi bảo trì</td><td>Alert processing rule (suppression)</td></tr>
    <tr><td>Stream log ra SIEM</td><td>Diagnostic setting → Event Hubs</td></tr>
    <tr><td>Lưu log giá rẻ lâu dài</td><td>Diagnostic setting → Storage account</td></tr>
    <tr><td>Retention</td><td>Metrics 93 ngày; Activity log 90 ngày; LA mặc định 30 ngày, tối đa 12 năm</td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Hai loại dữ liệu chính của Azure Monitor?', back: '<strong>Metrics</strong> (số theo thời gian, nhẹ, gần thời gian thực) và <strong>Logs</strong> (bản ghi có cấu trúc trong Log Analytics, truy vấn bằng KQL).' },
    { front: 'Platform metrics được giữ bao lâu?', back: '<strong>93 ngày</strong>. Một biểu đồ metrics explorer hiển thị tối đa 30 ngày.' },
    { front: 'Host metrics có cần agent không?', back: '<strong>Không</strong>. Thu tự động, miễn phí.' },
    { front: 'Agent hiện hành để thu guest data?', back: '<strong>Azure Monitor Agent (AMA)</strong>, cấu hình bằng <strong>data collection rule</strong>.' },
    { front: 'DCR định nghĩa những gì?', back: 'Data source (perf counter, Windows events, Syslog, log file), destination (Log Analytics, Azure Monitor Metrics) và transformation tùy chọn.' },
    { front: 'Windows Event Logs và Syslog được lưu ở bảng nào?', back: '<code>Event</code> và <code>Syslog</code>.' },
    { front: 'VM insights Map cần thêm gì?', back: '<strong>Dependency agent</strong>.' },
    { front: 'Retention mặc định và tối đa của Log Analytics?', back: 'Mặc định <strong>30 ngày</strong>; analytics tối đa 2 năm; tổng (long-term) tối đa <strong>12 năm</strong>.' },
    { front: 'Activity log giữ bao lâu và ghi gì?', back: '<strong>90 ngày</strong>; thao tác control plane (tạo, sửa, xóa, start/stop…) ở mức subscription.' },
    { front: 'Ba loại alert rule chính cho VM?', back: '<strong>Metric alert</strong>, <strong>log search alert</strong>, <strong>activity log alert</strong>.' },
    { front: 'Thang severity của alert?', back: '<strong>Sev 0</strong> (Critical), Sev 1 (Error), Sev 2 (Warning), Sev 3 (Informational), <strong>Sev 4</strong> (Verbose).' },
    { front: 'Alert processing rule dùng để làm gì?', back: 'Suppress thông báo theo lịch (bảo trì) hoặc áp action group cho nhiều alert đã kích hoạt trong một scope.' },
    { front: 'Các action type trong action group?', back: 'Automation runbook, Azure Function, Logic App, Webhook, Secure webhook, Event Hubs, ITSM (cùng notification Email/SMS/Push/Voice/ARM role).' },
    { front: 'Đích của diagnostic settings?', back: '<strong>Log Analytics workspace</strong>, <strong>Storage account</strong>, <strong>Event Hubs</strong>, partner solutions.' },
    { front: 'Số diagnostic setting tối đa mỗi tài nguyên?', back: '<strong>5</strong>; mỗi setting tối đa một đích mỗi loại.' },
    { front: 'KQL: take khác top thế nào?', back: '<code>take N</code> trả N dòng bất kỳ; <code>top N by Cột</code> trả N dòng lớn nhất theo cột.' },
    { front: 'KQL: lọc dữ liệu 1 giờ gần nhất?', back: '<code>| where TimeGenerated &gt; ago(1h)</code>' },
    { front: 'Một alert rule gắn được bao nhiêu action group?', back: 'Tối đa <strong>5</strong>.' }
  ],
  quiz: [
    {
      q: 'Bạn cần cảnh báo khi phần trăm bộ nhớ đã dùng bên trong VM Windows vượt 90%. VM hiện chỉ có cấu hình mặc định. Bạn cần làm gì trước tiên?',
      options: ['Tạo metric alert trên host metric Percentage CPU', 'Bật boot diagnostics', 'Cài Azure Monitor Agent và tạo data collection rule thu perf counter bộ nhớ', 'Tạo diagnostic setting gửi Activity log tới Log Analytics'],
      answer: [2],
      explain: 'Phần trăm bộ nhớ đã dùng là dữ liệu guest OS, cần Azure Monitor Agent và DCR (hoặc bật VM insights). Percentage CPU là host metric khác. Boot diagnostics chỉ cho screenshot/serial log. Activity log không chứa perf counter.'
    },
    {
      q: 'Một VM bị deallocate lúc 2 giờ sáng hôm qua. Bạn cần biết ai đã thực hiện thao tác này với ít công sức nhất. Bạn xem ở đâu?',
      options: ['Activity log của VM', 'Metrics explorer với metric Percentage CPU', 'Boot diagnostics', 'Bảng Event trong Log Analytics'],
      answer: [0],
      explain: 'Activity log ghi các thao tác control plane như deallocate, kèm Caller, và được thu tự động 90 ngày. Metrics chỉ cho thấy CPU giảm, không cho biết ai. Boot diagnostics và bảng Event không ghi thao tác ARM.'
    },
    {
      q: 'Bạn cần thu các sự kiện mức Error và Critical trong System log của 40 VM Windows vào một Log Analytics workspace, với cách hiện được khuyến nghị. Bạn làm gì? (Chọn 2)',
      options: ['Cài Log Analytics agent (MMA) và cấu hình Windows event trong workspace', 'Tạo một data collection rule với data source Windows Event Logs và đích là workspace', 'Gắn DCR cho 40 VM (Azure Monitor Agent được cài lên các VM)', 'Tạo diagnostic setting trên từng VM gửi tới workspace'],
      answer: [1, 2],
      explain: 'Cách hiện hành là Azure Monitor Agent với một DCR chứa data source Windows Event Logs, gắn cho tất cả VM. MMA đã ngừng hỗ trợ. Diagnostic setting của VM chỉ xuất platform metrics, không thu event log trong OS.'
    },
    {
      q: 'Đội vận hành không muốn nhận email/SMS từ mọi alert trong resource group RG-Prod vào khung bảo trì mỗi Chủ nhật 01:00–03:00, nhưng các alert vẫn phải được ghi nhận. Bạn cấu hình gì?',
      options: ['Tắt các alert rule mỗi Chủ nhật bằng runbook', 'Xóa action group khỏi các alert rule', 'Giảm severity các alert xuống Sev 4', 'Alert processing rule loại suppress notifications với lịch hằng tuần cho scope RG-Prod'],
      answer: [3],
      explain: 'Alert processing rule suppression chặn action group theo lịch nhưng alert vẫn được tạo và ghi nhận. Tắt rule thì không ghi nhận alert; xóa action group làm mất thông báo vĩnh viễn; đổi severity không ngăn thông báo.'
    },
    {
      q: 'Bạn cần gửi resource logs của Azure Key Vault tới một SIEM bên thứ ba chạy ngoài Azure theo thời gian gần thực. Bạn cấu hình diagnostic setting với đích nào?',
      options: ['Storage account', 'Event Hubs', 'Log Analytics workspace', 'Azure Monitor Metrics'],
      answer: [1],
      explain: 'Event Hubs dùng để stream log ra hệ thống bên ngoài như SIEM. Storage dành cho lưu trữ lâu dài, Log Analytics cho truy vấn trong Azure, còn Azure Monitor Metrics không phải đích cho resource logs.'
    },
    {
      q: 'Bạn tạo diagnostic setting cho một Key Vault ở East US để lưu log vào storage account. Danh sách storage account không hiển thị account stlogs ở West US. Nguyên nhân là gì?',
      options: ['Storage account phải là Premium', 'Phải bật hierarchical namespace', 'Storage account đích phải cùng region với tài nguyên được giám sát', 'Key Vault không hỗ trợ diagnostic settings'],
      answer: [2],
      explain: 'Với tài nguyên regional, storage account và Event Hubs làm đích phải cùng region. Premium storage không được hỗ trợ làm đích, hierarchical namespace không liên quan, và Key Vault có hỗ trợ diagnostic settings.'
    },
    {
      q: 'Hoàn thành truy vấn KQL để tính CPU trung bình theo từng máy trong mỗi khoảng 5 phút: <code>Perf | where CounterName == "% Processor Time" | ____ avg(CounterValue) by Computer, bin(TimeGenerated, 5m)</code>',
      options: ['project', 'extend', 'summarize', 'render'],
      answer: [2],
      explain: 'summarize dùng hàm tổng hợp (avg, count, max…) theo nhóm. project chỉ chọn cột, extend thêm cột tính toán trên từng dòng, render chỉ vẽ biểu đồ.'
    },
    {
      q: 'Bạn muốn nhận cảnh báo khi bất kỳ VM nào trong subscription bị xóa. Chi phí phải thấp nhất. Bạn tạo loại alert rule nào?',
      options: ['Activity log alert với operation Delete Virtual Machine', 'Metric alert trên Percentage CPU bằng 0', 'Log search alert trên bảng Heartbeat', 'Smart detection alert'],
      answer: [0],
      explain: 'Xóa VM là thao tác control plane được ghi vào Activity log; activity log alert bắt đúng sự kiện này và miễn phí. CPU bằng 0 hay mất heartbeat có thể do VM tắt, không chính xác và tốn phí hơn. Smart detection dành cho Application Insights.'
    },
    {
      q: 'Bạn cần giữ Activity log của subscription trong 2 năm và truy vấn được bằng KQL. Bạn làm gì? (Chọn 2)',
      options: ['Tạo diagnostic setting ở mức subscription gửi Activity log tới Log Analytics workspace', 'Đặt retention của bảng AzureActivity (hoặc workspace) đủ 2 năm', 'Tăng retention của Activity log trong portal lên 730 ngày', 'Bật boot diagnostics'],
      answer: [0, 1],
      explain: 'Activity log chỉ giữ 90 ngày và không chỉnh được; cần export qua diagnostic setting tới Log Analytics rồi đặt retention phù hợp. Boot diagnostics không liên quan.'
    },
    {
      q: 'Bạn muốn xem bản đồ các tiến trình và kết nối mạng giữa các VM của một ứng dụng nhiều tầng. Ngoài Azure Monitor Agent, bạn cần gì?',
      options: ['Network Watcher packet capture', 'Dependency agent để dùng tính năng Map của VM insights', 'Application Insights availability test', 'Boot diagnostics'],
      answer: [1],
      explain: 'Tính năng Map của VM insights hiển thị tiến trình và kết nối giữa các máy, cần Dependency agent. Packet capture chỉ bắt gói tin. Availability test kiểm tra URL. Boot diagnostics dành cho sự cố khởi động.'
    },
    {
      q: 'Bạn cần biểu đồ so sánh Percentage CPU của 4 VM, mỗi VM là một đường riêng, các VM cùng region và subscription. Cách nào phù hợp nhất?',
      options: ['Tạo 4 dashboard riêng', 'Xuất metric ra Excel rồi vẽ', 'Dùng Activity log', 'Trong metrics explorer chọn cả 4 VM trong scope (hoặc dùng splitting) với metric Percentage CPU'],
      answer: [3],
      explain: 'Metrics explorer hỗ trợ scope nhiều tài nguyên cùng loại, cùng region và splitting theo tài nguyên để mỗi VM là một đường. Các cách còn lại tốn công hoặc không chứa dữ liệu metric.'
    },
    {
      q: 'Bạn cần gửi email cho tất cả người dùng có vai trò Owner trên subscription khi alert Sev 0 được kích hoạt, và danh sách Owner thay đổi thường xuyên. Bạn cấu hình action group thế nào?',
      options: ['Thêm từng email Owner vào notification Email', 'Dùng notification Email Azure Resource Manager role với role Owner', 'Dùng action Webhook gửi tới danh bạ', 'Dùng ITSM'],
      answer: [1],
      explain: 'Email Azure Resource Manager role gửi tới thành viên của role trên subscription, tự cập nhật khi danh sách Owner thay đổi. Liệt kê từng email phải bảo trì thủ công. Webhook và ITSM không giải quyết yêu cầu một cách trực tiếp.'
    },
    {
      q: 'Phát biểu nào về host metrics của Azure VM là ĐÚNG? (Chọn 2)',
      options: ['Được thu tự động mà không cần cài agent', 'Bao gồm dung lượng trống của từng ổ đĩa logic trong OS', 'Được lưu trong Azure Monitor Metrics và giữ 93 ngày', 'Phải bật diagnostic setting mới xem được trong metrics explorer'],
      answer: [0, 2],
      explain: 'Host metrics được thu tự động, miễn phí và giữ 93 ngày trong Azure Monitor Metrics. Dung lượng trống ổ đĩa logic là guest metric. Diagnostic setting chỉ cần khi muốn gửi metric tới đích khác, không cần để xem trong metrics explorer.'
    },
    {
      q: 'Bạn cần alert khi có hơn 5 lần đăng nhập thất bại (EventID 4625) trên bất kỳ VM nào trong 10 phút, và mỗi VM có alert riêng. Dữ liệu Security event đã có trong Log Analytics. Bạn dùng gì?',
      options: ['Metric alert với dynamic threshold', 'Activity log alert', 'Log search alert với truy vấn đếm EventID 4625 và split by dimension Computer', 'Alert processing rule'],
      answer: [2],
      explain: 'Log search alert chạy KQL trên dữ liệu trong workspace; split by dimension Computer tạo alert riêng cho từng VM. Metric alert không đọc Security event. Activity log không ghi sự kiện đăng nhập trong OS. Alert processing rule không tạo alert.'
    }
  ]
});

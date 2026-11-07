AZ.addModule({
  id: 'p1m1',
  summary: 'Azure Cloud Shell là terminal chạy ngay trên trình duyệt, đã đăng nhập sẵn bằng tài khoản Azure của bạn và cài sẵn Azure CLI, Azure PowerShell cùng hàng chục công cụ khác. Đây là "bàn làm việc" mặc định của Azure Administrator, và đề thi hay hỏi về cách Cloud Shell lưu dữ liệu cũng như các giới hạn của nó.',
  objectives: [
    'Giải thích Cloud Shell là gì, chạy ở đâu và truy cập bằng những cách nào',
    'Hiểu cơ chế lưu trữ: storage account, file share, ảnh <code>$HOME</code> và chế độ ephemeral',
    'Biết các giới hạn quan trọng: timeout 20 phút, máy chủ Linux tạm thời, không mở cổng inbound',
    'Chọn đúng công cụ (Cloud Shell, CLI cài trên máy, portal, IaC) cho từng tình huống',
    'Đọc và viết các lệnh Azure CLI / Azure PowerShell cơ bản hay gặp trong đề thi'
  ],
  sections: [
    {
      id: 'what-is',
      unit: 'What is Azure Cloud Shell?',
      title: 'Azure Cloud Shell là gì?',
      html: `
<p><strong>Azure Cloud Shell</strong> là môi trường dòng lệnh (shell) <em>tương tác, đã xác thực, chạy trên trình duyệt</em> để quản lý tài nguyên Azure. Bạn chọn một trong hai trải nghiệm:</p>
<div class="compare">
  <div><strong>Bash</strong>Dùng Azure CLI (<code>az ...</code>) cùng các công cụ Linux quen thuộc: <code>grep</code>, <code>jq</code>, <code>vim</code>, <code>git</code>…</div>
  <div><strong>PowerShell</strong>Dùng module Azure PowerShell (<code>Az</code>), ví dụ <code>Get-AzVM</code>, <code>New-AzResourceGroup</code>. Vẫn gọi được <code>az</code> từ PowerShell.</div>
</div>
<p>Có thể chuyển giữa Bash và PowerShell ngay trên thanh công cụ mà không mất phiên đăng nhập.</p>

<h4>Các cách truy cập Cloud Shell</h4>
<ul>
  <li>Biểu tượng <kbd>&gt;_</kbd> trên thanh trên cùng của <strong>Azure portal</strong></li>
  <li>Truy cập trực tiếp <code>https://shell.azure.com</code></li>
  <li><strong>Azure mobile app</strong> (iOS/Android)</li>
  <li>Nút <em>Try it</em> trong tài liệu Microsoft Learn</li>
  <li>Windows Terminal (profile Azure Cloud Shell) và Visual Studio Code</li>
</ul>

<h4>Cài sẵn những gì?</h4>
<table>
  <thead><tr><th>Nhóm</th><th>Công cụ tiêu biểu</th></tr></thead>
  <tbody>
    <tr><td>Công cụ Azure</td><td>Azure CLI, Azure PowerShell (Az), AzCopy, Bicep CLI, Service Fabric CLI</td></tr>
    <tr><td>IaC / container</td><td>Terraform, Ansible, Chef InSpec, Puppet Bolt, Packer, kubectl, Helm, Docker</td></tr>
    <tr><td>Soạn thảo</td><td>Cloud Shell editor (gõ <code>code .</code>), vim, nano, emacs</td></tr>
    <tr><td>Ngôn ngữ</td><td>Python, Node.js, .NET, Go, Java</td></tr>
    <tr><td>Quản lý mã nguồn</td><td>git, GitHub CLI</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Vì sao admin hay dùng</strong>Không phải cài đặt hay cập nhật gì, không phải đăng nhập lại, và dùng được từ bất kỳ máy nào có trình duyệt. Microsoft tự cập nhật phiên bản CLI và PowerShell.</div>

<div class="callout exam"><strong>Góc thi</strong>Cloud Shell <strong>miễn phí</strong>. Bạn chỉ trả tiền cho <strong>Azure Files</strong> (file share dùng để lưu dữ liệu) nếu chọn mount storage. Quyền của bạn trong Cloud Shell <strong>chính là quyền RBAC của tài khoản đang đăng nhập</strong>: Cloud Shell không cấp thêm quyền nào.</div>
`
    },
    {
      id: 'how-it-works',
      unit: 'How does Azure Cloud Shell work?',
      title: 'Cloud Shell hoạt động như thế nào?',
      html: `
<h4>Máy chủ tạm thời theo phiên</h4>
<p>Mỗi phiên Cloud Shell chạy trên một <strong>máy chủ tạm thời (container) dành riêng cho từng người dùng</strong>, chạy hệ điều hành <strong>Linux (Azure Linux)</strong>. Cả trải nghiệm PowerShell cũng chạy trên Linux, tức là PowerShell 7 chứ không phải Windows PowerShell.</p>
<ul>
  <li>Phiên tự kết thúc sau <strong>20 phút không có tương tác</strong>. Lệnh chạy lâu mà không có input cũng có thể bị ngắt.</li>
  <li>Khi phiên kết thúc, máy chủ bị thu hồi. Mọi thứ ngoài vùng lưu trữ bền vững (xem bên dưới) <strong>đều mất</strong>.</li>
  <li>Máy chủ không nhận kết nối inbound từ Internet, nên không dùng Cloud Shell để host web server hay dịch vụ lâu dài.</li>
</ul>

<h4>Hai chế độ lưu trữ</h4>
<p>Ở lần đầu mở Cloud Shell, bạn chọn một trong hai chế độ:</p>
<div class="compare">
  <div><strong>Mount storage account (bền vững)</strong>Cloud Shell dùng (hoặc tạo) một <strong>storage account</strong> và một <strong>Azure file share</strong>. File share được mount vào thư mục <code>$HOME/clouddrive</code>. Thư mục <code>$HOME</code> được lưu bền vững dưới dạng một <strong>file ảnh đĩa (<code>.img</code>)</strong> nằm trong file share đó (tài liệu Microsoft nêu <code>$HOME</code> được lưu bằng file share 5 GB).</div>
  <div><strong>Ephemeral session (không cần storage)</strong>Không tạo storage account. Mọi file và cấu hình bị <strong>xóa khi phiên kết thúc</strong>. Phù hợp khi chỉ cần chạy vài lệnh nhanh, hoặc khi chính sách công ty không cho tạo storage account.</div>
</div>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 240" role="img" aria-label="Kiến trúc lưu trữ của Azure Cloud Shell">
  <rect class="box" x="10" y="85" width="150" height="70" rx="10"/>
  <text x="85" y="114" text-anchor="middle" class="t-b">Trình duyệt</text>
  <text x="85" y="134" text-anchor="middle" class="t-sm t-mute">portal · shell.azure.com</text>

  <rect class="box-a" x="215" y="20" width="270" height="200" rx="12"/>
  <text x="350" y="46" text-anchor="middle" class="t-b t-a">Cloud Shell host</text>
  <text x="350" y="64" text-anchor="middle" class="t-sm t-mute">Linux · tạm thời · 1 người dùng / phiên</text>
  <rect class="box" x="235" y="85" width="230" height="48" rx="8"/>
  <text x="350" y="105" text-anchor="middle" class="t-b">$HOME</text>
  <text x="350" y="122" text-anchor="middle" class="t-sm t-mute">lưu bền dạng file ảnh đĩa .img</text>
  <rect class="box-s" x="235" y="150" width="230" height="48" rx="8"/>
  <text x="350" y="170" text-anchor="middle" class="t-b">$HOME/clouddrive</text>
  <text x="350" y="187" text-anchor="middle" class="t-sm t-mute">thư mục mount của file share</text>

  <rect class="box-w" x="550" y="45" width="160" height="160" rx="12"/>
  <text x="630" y="72" text-anchor="middle" class="t-b t-w">Storage account</text>
  <rect class="box" x="565" y="95" width="130" height="95" rx="8"/>
  <text x="630" y="122" text-anchor="middle" class="t-b">Azure file share</text>
  <text x="630" y="146" text-anchor="middle" class="t-sm t-mute">file ảnh $HOME</text>
  <text x="630" y="166" text-anchor="middle" class="t-sm t-mute">+ file của bạn</text>

  <line class="ln-a" x1="160" y1="120" x2="211" y2="120" marker-end="url(#arr-a)"/>
  <text x="186" y="110" text-anchor="middle" class="t-sm t-a">HTTPS</text>
  <line class="ln dash" x1="465" y1="109" x2="561" y2="125" marker-end="url(#arr)"/>
  <text x="512" y="104" text-anchor="middle" class="t-sm t-mute">lưu ảnh</text>
  <line class="ln-s" x1="465" y1="174" x2="561" y2="160" marker-end="url(#arr-s)"/>
  <text x="512" y="190" text-anchor="middle" class="t-sm t-s">SMB mount</text>
</svg>
<figcaption>Hình 1. Ở chế độ có lưu trữ, cả <code>$HOME</code> lẫn <code>clouddrive</code> đều nằm trên Azure file share. Chế độ ephemeral không có khối Storage account, nên mọi dữ liệu mất khi phiên kết thúc.</figcaption>
</figure>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: mở Cloud Shell lần đầu</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Đăng nhập portal, bấm biểu tượng Cloud Shell trên thanh trên cùng:<br><span class="path">Azure portal › thanh trên cùng › &gt;_ Cloud Shell</span></li>
    <li>Chọn trải nghiệm <strong>Bash</strong> hoặc <strong>PowerShell</strong>. Bạn có thể đổi lại bất cứ lúc nào trên thanh công cụ của Cloud Shell.</li>
    <li>Ở màn hình <em>Getting started</em>, chọn chế độ lưu trữ:
      <div class="blade">
        <div class="blade-title">Getting started</div>
        <div class="pf"><label>Chế độ</label><span class="pv radio">Mount storage account</span></div>
        <div class="pf"><label></label><span class="pv">No storage account required (ephemeral)</span></div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pbtns"><span class="pbtn primary">Apply</span></div>
      </div>
    </li>
    <li>Nếu chọn <em>Mount storage account</em>, bạn có thể để Cloud Shell <strong>tự tạo storage account</strong>, hoặc <strong>chọn storage account có sẵn</strong> (chỉ định resource group, tên account và file share):
      <div class="blade">
        <div class="blade-title">Mount storage account</div>
        <div class="pf"><label>Tùy chọn</label><span class="pv radio">Select existing storage account</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-cloudshell</span></div>
        <div class="pf"><label class="req">Storage account</label><span class="pv sel">stcloudshell001</span></div>
        <div class="pf"><label class="req">File share</label><span class="pv sel">cloudshell</span></div>
        <div class="pbtns"><span class="pbtn primary">Select</span></div>
      </div>
    </li>
    <li>Kiểm tra phiên đã đăng nhập đúng subscription: <code>az account show -o table</code> (Bash) hoặc <code>Get-AzContext</code> (PowerShell).</li>
  </ol>
  </div>
</div>

<h4>Lệnh quản lý clouddrive (Bash)</h4>
<pre><code>clouddrive unmount   # tháo file share; lần mở sau sẽ được hỏi lại cấu hình storage
clouddrive unmount -h   # xem trợ giúp
# PowerShell: Get-CloudDrive (xem file share đang dùng), Dismount-CloudDrive (tháo)</code></pre>
<p>Muốn mount một file share khác (hoặc chuyển từ ephemeral sang có storage): mở <strong>Settings › Reset user settings</strong> trong thanh công cụ Cloud Shell, rồi chọn lại storage ở lần khởi động sau. File share cũ không bị xóa.</p>

<h4>Xác thực</h4>
<p>Cloud Shell tự đăng nhập bằng danh tính bạn đã dùng để vào portal (dùng token của phiên portal). Không cần chạy <code>az login</code> hay <code>Connect-AzAccount</code>. Nếu bạn có nhiều subscription, hãy chọn subscription làm việc:</p>
<pre><code># Bash / Azure CLI
az account show --output table
az account set --subscription "Tên hoặc ID subscription"

# PowerShell
Get-AzContext
Set-AzContext -Subscription "Tên hoặc ID subscription"</code></pre>

<h4>Tải file lên / xuống</h4>
<p>Thanh công cụ của Cloud Shell có nút <strong>Upload/Download</strong>. File upload được đặt vào <code>$HOME</code>. Ví dụ: tải một file ARM template từ máy lên rồi chạy <code>az deployment group create</code>.</p>

<h4>Cloud Shell trong virtual network</h4>
<p>Có thể triển khai Cloud Shell vào <strong>một VNet của bạn</strong> để phiên Cloud Shell truy cập được tài nguyên có private IP (VM nội bộ, private endpoint). Kịch bản này cần thêm một subnet dành cho container, một Azure Relay và một storage account. Mức AZ-104 chỉ cần biết <em>tính năng này tồn tại</em> và dùng để làm gì.</p>

<div class="callout warn"><strong>Lưu ý</strong>Storage account của Cloud Shell nên được bảo vệ bằng resource lock hoặc loại trừ khỏi các policy dọn dẹp. Nếu ai đó xóa file share, toàn bộ <code>$HOME</code> của bạn sẽ mất theo.</div>
`
    },
    {
      id: 'when-to-use',
      unit: 'When should you use Azure Cloud Shell?',
      title: 'Khi nào nên (và không nên) dùng Cloud Shell?',
      html: `
<h4>Nên dùng khi</h4>
<ul>
  <li>Cần chạy lệnh quản trị nhanh từ một máy <strong>không cài sẵn công cụ</strong> (máy mượn, máy khách hàng, tablet).</li>
  <li>Muốn luôn có <strong>phiên bản mới nhất</strong> của Azure CLI/PowerShell mà không tự cập nhật.</li>
  <li>Thực hiện tác vụ dùng script ngắn: tạo resource group, triển khai template, truy vấn danh sách tài nguyên, kiểm tra cấu hình.</li>
  <li>Theo hướng dẫn hoặc bài lab trên Microsoft Learn (nút <em>Try it</em>).</li>
</ul>
<h4>Không phù hợp khi</h4>
<ul>
  <li>Tác vụ chạy <strong>lâu hơn 20 phút</strong> không có tương tác, hoặc cần chạy theo lịch. Hãy dùng Azure Automation, GitHub Actions, Azure DevOps hoặc Azure Functions.</li>
  <li>Cần <strong>ứng dụng GUI</strong> hoặc công cụ chỉ chạy trên Windows.</li>
  <li>Cần chạy <strong>Docker daemon</strong>, mở cổng lắng nghe, hoặc dùng làm máy chủ.</li>
  <li>Cần môi trường lâu dài với dữ liệu lớn: dung lượng <code>$HOME</code> có giới hạn.</li>
</ul>

<h4>So sánh các công cụ quản trị</h4>
<table>
  <thead><tr><th>Công cụ</th><th>Điểm mạnh</th><th>Hạn chế</th></tr></thead>
  <tbody>
    <tr><td>Azure portal</td><td>Trực quan, dễ khám phá, xem tổng quan</td><td>Thao tác lặp lại tốn thời gian, khó tự động hóa</td></tr>
    <tr><td>Cloud Shell</td><td>Không cần cài đặt, đăng nhập sẵn, công cụ luôn mới</td><td>Timeout 20 phút, máy tạm thời</td></tr>
    <tr><td>Azure CLI / PowerShell cài trên máy</td><td>Tích hợp script cục bộ, chạy lâu, dùng trong CI/CD</td><td>Phải tự cài đặt, cập nhật và đăng nhập</td></tr>
    <tr><td>ARM template / Bicep</td><td>Khai báo, lặp lại được, idempotent</td><td>Phải học cú pháp</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>Câu hỏi dạng "admin cần chạy script trên máy không cài được phần mềm, tốn ít công sức nhất" thì đáp án thường là <strong>Cloud Shell</strong>. Còn "chạy script hằng đêm" thì Cloud Shell <strong>không</strong> phải đáp án (nên dùng Azure Automation runbook).</div>
`
    },
    {
      id: 'cli-vs-powershell',
      extra: true,
      title: 'Azure CLI và Azure PowerShell: cú pháp cốt lõi',
      html: `
<p>Đề AZ-104 hay có dạng câu <strong>điền vào chỗ trống trong lệnh</strong> hoặc chọn lệnh đúng. Bạn cần nhận ra quy ước đặt tên của hai bộ công cụ.</p>
<div class="compare">
  <div><strong>Azure CLI</strong>Cấu trúc: <code>az &lt;nhóm&gt; [nhóm con] &lt;động từ&gt; --tham-so giá-trị</code>. Các động từ phổ biến: <code>create</code>, <code>list</code>, <code>show</code>, <code>update</code>, <code>delete</code>.</div>
  <div><strong>Azure PowerShell</strong>Cấu trúc: <code>Động từ-AzDanhTừ -ThamSo GiáTrị</code>. Các động từ phổ biến: <code>New</code>, <code>Get</code>, <code>Set</code>, <code>Update</code>, <code>Remove</code>.</div>
</div>
<table>
  <thead><tr><th>Tác vụ</th><th>Azure CLI</th><th>Azure PowerShell</th></tr></thead>
  <tbody>
    <tr><td>Đăng nhập</td><td><code>az login</code></td><td><code>Connect-AzAccount</code></td></tr>
    <tr><td>Chọn subscription</td><td><code>az account set -s &lt;id&gt;</code></td><td><code>Set-AzContext -Subscription &lt;id&gt;</code></td></tr>
    <tr><td>Tạo resource group</td><td><code>az group create -n rg1 -l eastus</code></td><td><code>New-AzResourceGroup -Name rg1 -Location eastus</code></td></tr>
    <tr><td>Liệt kê VM</td><td><code>az vm list -o table</code></td><td><code>Get-AzVM</code></td></tr>
    <tr><td>Tạo VM</td><td><code>az vm create -g rg1 -n vm1 --image Ubuntu2204</code></td><td><code>New-AzVM -ResourceGroupName rg1 -Name vm1 -Image Ubuntu2204</code></td></tr>
    <tr><td>Dừng và giải phóng VM</td><td><code>az vm deallocate -g rg1 -n vm1</code></td><td><code>Stop-AzVM -ResourceGroupName rg1 -Name vm1</code></td></tr>
    <tr><td>Triển khai template</td><td><code>az deployment group create -g rg1 --template-file main.json</code></td><td><code>New-AzResourceGroupDeployment -ResourceGroupName rg1 -TemplateFile main.json</code></td></tr>
    <tr><td>Xóa resource group</td><td><code>az group delete -n rg1 --yes</code></td><td><code>Remove-AzResourceGroup -Name rg1 -Force</code></td></tr>
  </tbody>
</table>

<h4>Định dạng đầu ra và truy vấn (Azure CLI)</h4>
<ul>
  <li><code>--output</code> / <code>-o</code>: <code>json</code> (mặc định), <code>jsonc</code>, <code>table</code>, <code>tsv</code>, <code>yaml</code>, <code>none</code>.</li>
  <li><code>--query</code> dùng cú pháp <strong>JMESPath</strong> để lọc và chọn trường:</li>
</ul>
<pre><code>az vm list --query "[?location=='eastus'].{Ten:name, RG:resourceGroup}" -o table
az vm show -g rg1 -n vm1 --query "hardwareProfile.vmSize" -o tsv</code></pre>

<h4>Pipeline trong PowerShell</h4>
<pre><code>Get-AzVM -Status | Where-Object { $_.PowerState -eq 'VM running' } | Select-Object Name, ResourceGroupName
Get-AzResource -ResourceGroupName rg1 | Remove-AzResource -Force</code></pre>

<div class="callout exam"><strong>Bẫy thi</strong><code>Stop-AzVM</code> mặc định sẽ <strong>deallocate</strong> VM (ngừng tính phí compute). Thêm <code>-StayProvisioned</code> thì VM chỉ dừng hệ điều hành và vẫn bị tính phí. Ở Azure CLI thì ngược lại: <code>az vm stop</code> <strong>chỉ power off</strong> (vẫn tính phí), còn <code>az vm deallocate</code> mới giải phóng tài nguyên compute.</div>
`
    }
  ],
  keyFacts: [
    'Cloud Shell có 2 trải nghiệm: <strong>Bash</strong> (Azure CLI) và <strong>PowerShell</strong> (module Az). Cả hai đều chạy trên <strong>máy chủ Linux</strong> tạm thời.',
    'Phiên Cloud Shell hết hạn sau <strong>20 phút không tương tác</strong>.',
    'Chế độ có lưu trữ: file share được mount tại <code>$HOME/clouddrive</code>, còn <code>$HOME</code> được lưu bền trong một <strong>file ảnh đĩa .img</strong> trên file share.',
    'Chế độ <strong>ephemeral session</strong> không cần storage account. Dữ liệu mất khi kết thúc phiên.',
    'Cloud Shell <strong>miễn phí</strong>; chỉ trả tiền cho Azure Files nếu mount storage.',
    'Truy cập qua portal (biểu tượng &gt;_), <code>shell.azure.com</code>, Azure mobile app, Windows Terminal, VS Code và nút Try it trên Learn.',
    'Quyền trong Cloud Shell = quyền RBAC của tài khoản đang đăng nhập.',
    'Azure CLI <code>az vm stop</code> vẫn tính phí compute; <code>az vm deallocate</code> mới ngừng tính phí. PowerShell <code>Stop-AzVM</code> mặc định deallocate.'
  ],
  traps: [
    'Cho rằng PowerShell trong Cloud Shell chạy trên Windows. Sai: nó chạy PowerShell 7 trên <strong>Linux</strong>, nên các cmdlet chỉ có trên Windows sẽ không dùng được.',
    'Dùng Cloud Shell cho tác vụ định kỳ hoặc chạy lâu. Hãy chọn <strong>Azure Automation</strong> hoặc pipeline CI/CD.',
    'Xóa storage account hoặc file share của Cloud Shell sẽ <strong>mất toàn bộ $HOME</strong>. Không phải "chỉ mất clouddrive".',
    'Nhầm rằng Cloud Shell cấp thêm quyền admin. Mọi lệnh vẫn bị giới hạn bởi RBAC và Azure Policy.',
    'Nhầm tham số <code>-o</code>/<code>--output</code> của CLI với <code>--query</code>: <code>--query</code> dùng để lọc dữ liệu (JMESPath), <code>-o</code> chỉ đổi định dạng hiển thị.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Timeout</td><td>20 phút không tương tác</td></tr>
    <tr><td>Hệ điều hành host</td><td>Linux (Azure Linux), máy tạm thời theo từng người dùng</td></tr>
    <tr><td>Lưu trữ bền</td><td>Azure file share → <code>$HOME/clouddrive</code>; ảnh đĩa <code>$HOME</code> (.img)</td></tr>
    <tr><td>Không cần storage</td><td>Ephemeral session</td></tr>
    <tr><td>Chi phí</td><td>Miễn phí; trả tiền Azure Files</td></tr>
    <tr><td>Đổi subscription</td><td><code>az account set</code> / <code>Set-AzContext</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Cloud Shell có những trải nghiệm shell nào?', back: '<strong>Bash</strong> (Azure CLI) và <strong>PowerShell</strong> (module Az, PowerShell 7). Có thể chuyển qua lại trên thanh công cụ.' },
    { front: 'Phiên Cloud Shell timeout sau bao lâu?', back: '<strong>20 phút</strong> không có tương tác.' },
    { front: 'Hệ điều hành của máy chủ Cloud Shell?', back: '<strong>Linux</strong> (Azure Linux), áp dụng cho cả Bash lẫn PowerShell.' },
    { front: 'Thư mục nào được mount từ Azure file share?', back: '<code>$HOME/clouddrive</code>. Còn <code>$HOME</code> được lưu trong một file ảnh đĩa .img trên cùng file share.' },
    { front: 'Muốn dùng Cloud Shell mà không tạo storage account?', back: 'Chọn <strong>ephemeral session</strong>. Dữ liệu bị xóa khi kết thúc phiên.' },
    { front: 'Chi phí sử dụng Cloud Shell?', back: 'Bản thân Cloud Shell miễn phí; bạn trả tiền cho <strong>Azure Files</strong> nếu mount storage.' },
    { front: 'Lệnh chọn subscription làm việc (CLI và PowerShell)?', back: '<code>az account set --subscription &lt;id&gt;</code> và <code>Set-AzContext -Subscription &lt;id&gt;</code>' },
    { front: 'az vm stop khác az vm deallocate thế nào?', back: '<code>stop</code> chỉ tắt hệ điều hành, <strong>vẫn tính phí</strong> compute. <code>deallocate</code> giải phóng phần cứng nên <strong>ngừng tính phí</strong> compute.' },
    { front: 'Stop-AzVM mặc định làm gì?', back: '<strong>Deallocate</strong> VM. Thêm <code>-StayProvisioned</code> để chỉ tắt mà vẫn giữ phần cứng.' },
    { front: 'Tham số --query của Azure CLI dùng ngôn ngữ truy vấn nào?', back: '<strong>JMESPath</strong>' },
    { front: 'Tác vụ chạy định kỳ hằng đêm nên dùng gì thay vì Cloud Shell?', back: '<strong>Azure Automation runbook</strong>, hoặc pipeline CI/CD / Azure Functions.' },
    { front: 'Lệnh mở trình soạn thảo tích hợp trong Cloud Shell?', back: '<code>code .</code> (Cloud Shell editor dựa trên Monaco)' }
  ],
  quiz: [
    {
      q: 'Bạn dùng một máy tính công cộng không thể cài phần mềm. Bạn cần chạy một script Azure CLI để tạo resource group và vài storage account với ít công sức nhất. Bạn nên dùng gì?',
      options: ['Azure Cloud Shell', 'Cài Azure CLI bằng gói MSI', 'Azure Automation runbook', 'Một VM Windows trên Azure cài sẵn Azure CLI'],
      answer: [0],
      explain: 'Cloud Shell chạy trên trình duyệt, đã đăng nhập sẵn và có Azure CLI, nên không cần cài đặt gì. Automation và VM đều tốn thêm công cấu hình.'
    },
    {
      q: 'Một phiên Cloud Shell đang mở nhưng bạn không thao tác gì. Sau bao lâu phiên sẽ bị ngắt?',
      options: ['5 phút', '10 phút', '20 phút', '60 phút'],
      answer: [2],
      explain: 'Cloud Shell timeout sau 20 phút không có tương tác.'
    },
    {
      q: 'Bạn mở Cloud Shell với chế độ mount storage. Thư mục nào sau đây được ánh xạ trực tiếp tới Azure file share?',
      options: ['<code>/tmp</code>', '<code>/usr/local/bin</code>', '<code>/var/azure</code>', '<code>$HOME/clouddrive</code>'],
      answer: [3],
      explain: 'File share được mount tại <code>$HOME/clouddrive</code>. Thư mục <code>$HOME</code> được lưu bền dưới dạng file ảnh đĩa .img trên file share.'
    },
    {
      q: 'Chính sách công ty cấm tạo storage account mới, nhưng nhân viên vẫn cần dùng Cloud Shell. Giải pháp là gì?',
      options: ['Dùng ephemeral session', 'Không thể dùng Cloud Shell', 'Dùng Cloud Shell trong VNet', 'Mount một Blob container thay cho file share'],
      answer: [0],
      explain: 'Ephemeral session không yêu cầu storage account, đổi lại dữ liệu bị xóa khi phiên kết thúc. Cloud Shell trong VNet vẫn cần storage account.'
    },
    {
      q: 'Phát biểu nào về trải nghiệm PowerShell trong Cloud Shell là ĐÚNG?',
      options: ['Chạy Windows PowerShell 5.1 trên Windows Server', 'Không gọi được lệnh <code>az</code>', 'Chạy PowerShell 7 trên máy chủ Linux', 'Phải chạy <code>Connect-AzAccount</code> trước mỗi lệnh'],
      answer: [2],
      explain: 'Cả Bash và PowerShell trong Cloud Shell đều chạy trên máy chủ Linux; PowerShell là bản 7 (cross-platform). Phiên đã được xác thực sẵn và vẫn gọi được Azure CLI.'
    },
    {
      q: 'Bạn muốn VM1 ngừng phát sinh chi phí compute. Lệnh nào đạt yêu cầu? (Chọn 2)',
      options: ['<code>az vm stop -g RG1 -n VM1</code>', '<code>az vm deallocate -g RG1 -n VM1</code>', '<code>Stop-AzVM -ResourceGroupName RG1 -Name VM1</code>', '<code>Stop-AzVM -ResourceGroupName RG1 -Name VM1 -StayProvisioned</code>'],
      answer: [1, 2],
      explain: '<code>az vm deallocate</code> và <code>Stop-AzVM</code> (mặc định) đều deallocate VM. <code>az vm stop</code> và <code>-StayProvisioned</code> chỉ tắt hệ điều hành, phần cứng vẫn được giữ nên vẫn tính phí.'
    },
    {
      q: 'Một đồng nghiệp lỡ xóa file share mà Cloud Shell của bạn đang dùng. Điều gì xảy ra?',
      options: ['Chỉ mất các file trong <code>$HOME/clouddrive</code>, <code>$HOME</code> vẫn còn', 'Không mất gì, Cloud Shell có bản sao lưu tự động', 'Mất quyền RBAC trên subscription', 'Mất cả <code>$HOME</code> vì file ảnh <code>$HOME</code> cũng nằm trên file share'],
      answer: [3],
      explain: 'File ảnh đĩa chứa <code>$HOME</code> nằm trên chính file share đó, nên xóa file share sẽ mất toàn bộ dữ liệu bền vững của Cloud Shell.'
    },
    {
      q: 'Bạn cần một script dọn dẹp tài nguyên chạy tự động lúc 2 giờ sáng mỗi ngày. Bạn nên dùng gì?',
      options: ['Azure Automation runbook có schedule', 'Azure Cloud Shell với lệnh <code>sleep</code>', 'Azure portal', 'Azure mobile app'],
      answer: [0],
      explain: 'Cloud Shell là công cụ tương tác, timeout sau 20 phút, nên không phù hợp cho tác vụ theo lịch. Azure Automation runbook hỗ trợ schedule.'
    },
    {
      q: 'Lệnh Azure CLI nào chỉ hiển thị kích thước (size) của VM1 dưới dạng văn bản thuần?',
      options: ['<code>az vm show -g RG1 -n VM1 -o table</code>', '<code>az vm show -g RG1 -n VM1 --query hardwareProfile.vmSize -o tsv</code>', '<code>az vm list --size VM1</code>', '<code>Get-AzVM -Name VM1 | Select Size</code>'],
      answer: [1],
      explain: '<code>--query</code> (JMESPath) chọn đúng trường <code>hardwareProfile.vmSize</code>, còn <code>-o tsv</code> in ra giá trị thuần. Lựa chọn dùng <code>Get-AzVM</code> là PowerShell, không phải Azure CLI.'
    },
    {
      q: 'Người dùng có vai trò Reader trên subscription mở Cloud Shell và chạy <code>az group delete -n RG1</code>. Kết quả là gì?',
      options: ['Xóa thành công vì Cloud Shell chạy với quyền hệ thống', 'Thất bại do không đủ quyền (AuthorizationFailed)', 'Xóa thành công nhưng cần xác nhận MFA', 'Cloud Shell không hỗ trợ lệnh xóa'],
      answer: [1],
      explain: 'Cloud Shell dùng danh tính của chính người dùng, nên mọi lệnh bị giới hạn bởi RBAC. Vai trò Reader không có quyền xóa.'
    },
    {
      q: 'Bạn cần một công cụ cho phép chạy cả Azure CLI lẫn Azure PowerShell từ iPad mà không cài thêm ứng dụng nào ngoài trình duyệt. Bạn chọn gì?',
      options: ['Windows Terminal', 'Azure Storage Explorer', 'Azure Data Studio', 'Azure Cloud Shell tại shell.azure.com'],
      answer: [3],
      explain: 'Cloud Shell chạy trên mọi trình duyệt, kể cả trên tablet, và có cả hai trải nghiệm Bash và PowerShell. Các lựa chọn còn lại đều phải cài đặt và không chạy trên iPad.'
    },
    {
      q: 'Bạn chạy một script trong Cloud Shell để tạo file <code>/tmp/report.csv</code>. Ngày hôm sau mở lại Cloud Shell (chế độ có mount storage), file này còn không?',
      options: ['Còn, vì mọi thư mục đều được lưu bền', 'Không, chỉ <code>$HOME</code> (gồm cả <code>clouddrive</code>) được lưu bền', 'Còn, nhưng chỉ trong 7 ngày', 'Không, vì Cloud Shell xóa storage account mỗi ngày'],
      answer: [1],
      explain: 'Máy chủ Cloud Shell là tạm thời. Chỉ <code>$HOME</code> (lưu trong file ảnh đĩa .img) và <code>$HOME/clouddrive</code> (file share) được giữ lại giữa các phiên. Thư mục <code>/tmp</code> mất khi phiên kết thúc.'
    }
  ]
});

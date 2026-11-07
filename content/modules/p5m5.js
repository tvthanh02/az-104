AZ.addModule({
  id: 'p5m5',
  summary: 'Module này so sánh container với VM và giới thiệu hai dịch vụ chạy container serverless: <strong>Azure Container Instances (ACI)</strong> cho container đơn lẻ hoặc nhóm nhỏ chạy nhanh, và <strong>Azure Container Apps</strong> cho microservice cần autoscale, revision và ingress. Đề AZ-104 hay hỏi về <strong>container group</strong>, <strong>restart policy</strong>, mount Azure Files, DNS label và cách chọn giữa ACI, Container Apps và AKS; kèm theo là Azure Container Registry.',
  objectives: [
    'So sánh container với virtual machine về cô lập, kích thước, thời gian khởi động và trường hợp sử dụng',
    'Triển khai container trên ACI với public IP, DNS label, restart policy và biến môi trường',
    'Thiết kế container group nhiều container (sidecar), mount Azure Files và triển khai bằng YAML/ARM',
    'Giải thích Azure Container Apps: environment, revision, ingress, scale theo KEDA và scale to zero',
    'Chọn đúng dịch vụ giữa ACI, Container Apps, App Service và AKS cho từng tình huống',
    'Quản lý Azure Container Registry: SKU, geo-replication, az acr build, admin user và vai trò AcrPull/AcrPush'
  ],
  sections: [
    {
      id: 'containers-vs-vms',
      unit: 'Compare containers to virtual machines',
      title: 'Container và virtual machine',
      html: `
<p><strong>Virtual machine</strong> ảo hóa <em>phần cứng</em>: mỗi VM có hệ điều hành khách đầy đủ (kernel, driver, dịch vụ hệ thống) chạy trên hypervisor. <strong>Container</strong> ảo hóa <em>hệ điều hành</em>: nhiều container dùng chung kernel của máy chủ, mỗi container chỉ đóng gói ứng dụng cùng thư viện phụ thuộc.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 300" role="img" aria-label="So sánh các lớp: VM có guest OS riêng trên hypervisor, container dùng chung kernel của host OS">
  <text x="180" y="24" text-anchor="middle" class="t-b">Virtual machines</text>
  <rect class="box-a" x="20" y="40" width="155" height="44" rx="8"/>
  <text x="97" y="67" text-anchor="middle" class="t-b">App A</text>
  <rect class="box" x="20" y="90" width="155" height="44" rx="8"/>
  <text x="97" y="117" text-anchor="middle">Bins / Libs</text>
  <rect class="box-w" x="20" y="140" width="155" height="60" rx="8"/>
  <text x="97" y="166" text-anchor="middle" class="t-b">Guest OS</text>
  <text x="97" y="184" text-anchor="middle" class="t-sm t-mute">kernel riêng</text>
  <rect class="box-a" x="185" y="40" width="155" height="44" rx="8"/>
  <text x="262" y="67" text-anchor="middle" class="t-b">App B</text>
  <rect class="box" x="185" y="90" width="155" height="44" rx="8"/>
  <text x="262" y="117" text-anchor="middle">Bins / Libs</text>
  <rect class="box-w" x="185" y="140" width="155" height="60" rx="8"/>
  <text x="262" y="166" text-anchor="middle" class="t-b">Guest OS</text>
  <text x="262" y="184" text-anchor="middle" class="t-sm t-mute">kernel riêng</text>
  <rect class="box-e" x="20" y="206" width="320" height="38" rx="8"/>
  <text x="180" y="230" text-anchor="middle" class="t-b">Hypervisor</text>
  <rect class="box" x="20" y="250" width="320" height="38" rx="8"/>
  <text x="180" y="274" text-anchor="middle">Phần cứng</text>

  <text x="540" y="24" text-anchor="middle" class="t-b">Containers</text>
  <text x="540" y="52" text-anchor="middle" class="t-sm t-mute">nhẹ hơn: không có guest OS trong mỗi container</text>
  <rect class="box-a" x="380" y="70" width="100" height="42" rx="8"/>
  <text x="430" y="96" text-anchor="middle" class="t-b">App A</text>
  <rect class="box" x="380" y="116" width="100" height="40" rx="8"/>
  <text x="430" y="141" text-anchor="middle">Bins / Libs</text>
  <rect class="box-a" x="490" y="70" width="100" height="42" rx="8"/>
  <text x="540" y="96" text-anchor="middle" class="t-b">App B</text>
  <rect class="box" x="490" y="116" width="100" height="40" rx="8"/>
  <text x="540" y="141" text-anchor="middle">Bins / Libs</text>
  <rect class="box-a" x="600" y="70" width="100" height="42" rx="8"/>
  <text x="650" y="96" text-anchor="middle" class="t-b">App C</text>
  <rect class="box" x="600" y="116" width="100" height="40" rx="8"/>
  <text x="650" y="141" text-anchor="middle">Bins / Libs</text>
  <rect class="box-e" x="380" y="162" width="320" height="38" rx="8"/>
  <text x="540" y="186" text-anchor="middle" class="t-b">Container runtime (containerd…)</text>
  <rect class="box-w" x="380" y="206" width="320" height="38" rx="8"/>
  <text x="540" y="230" text-anchor="middle" class="t-b">Host OS · 1 kernel dùng chung</text>
  <rect class="box" x="380" y="250" width="320" height="38" rx="8"/>
  <text x="540" y="274" text-anchor="middle">Phần cứng / VM</text>
</svg>
<figcaption>Hình 1. VM ảo hóa phần cứng: mỗi VM mang cả guest OS (kernel riêng) nên nặng và khởi động chậm. Container ảo hóa hệ điều hành: các container chỉ đóng gói app cùng thư viện và dùng chung kernel của host, nên khởi động trong vài giây nhưng cô lập yếu hơn.</figcaption>
</figure>

<table>
  <thead><tr><th>Tiêu chí</th><th>Virtual machine</th><th>Container</th></tr></thead>
  <tbody>
    <tr><td>Cô lập</td><td>Mạnh, ở mức phần cứng ảo; mỗi VM có kernel riêng</td><td>Ở mức tiến trình, dùng chung kernel (nhẹ hơn, cô lập yếu hơn)</td></tr>
    <tr><td>Hệ điều hành</td><td>Bất kỳ OS nào, mỗi VM một OS đầy đủ</td><td>Phải tương thích kernel host (container Linux cần host Linux)</td></tr>
    <tr><td>Kích thước</td><td>Hàng GB</td><td>Thường vài chục đến vài trăm MB</td></tr>
    <tr><td>Khởi động</td><td>Vài phút</td><td>Vài giây</td></tr>
    <tr><td>Triển khai</td><td>Image VM, ARM/Bicep, script cấu hình</td><td>Image container (Dockerfile) từ registry; nhất quán giữa dev/test/prod</td></tr>
    <tr><td>Lưu trữ bền</td><td>Managed disk (OS disk, data disk)</td><td>Mặc định tạm thời; cần mount volume (Azure Files, Azure Disks…)</td></tr>
    <tr><td>Chịu lỗi</td><td>Availability set/zone, VMSS</td><td>Orchestrator tự khởi động lại/tạo container mới</td></tr>
  </tbody>
</table>

<h4>Thuật ngữ cần nắm</h4>
<ul>
  <li><strong>Image</strong>: gói chỉ đọc, gồm nhiều layer, được build từ <strong>Dockerfile</strong>. Đặt tên dạng <code>registry/repository:tag</code>, ví dụ <code>myacr.azurecr.io/web:v2</code>.</li>
  <li><strong>Container</strong>: một instance đang chạy của image.</li>
  <li><strong>Registry</strong>: nơi lưu image (Docker Hub, Azure Container Registry, Microsoft Container Registry <code>mcr.microsoft.com</code>).</li>
  <li><strong>Orchestrator</strong>: công cụ lập lịch, scale và tự phục hồi container (Kubernetes, AKS, Container Apps).</li>
</ul>

<h4>Các dịch vụ chạy container trên Azure</h4>
<table>
  <thead><tr><th>Dịch vụ</th><th>Phù hợp khi</th></tr></thead>
  <tbody>
    <tr><td><strong>Azure Container Instances</strong></td><td>Chạy nhanh một container hoặc nhóm nhỏ, tác vụ theo lô, không cần orchestration</td></tr>
    <tr><td><strong>Azure Container Apps</strong></td><td>Microservice, API, xử lý sự kiện cần autoscale (kể cả về 0), revision, ingress, không muốn quản lý Kubernetes</td></tr>
    <tr><td><strong>Web App for Containers</strong></td><td>Ứng dụng web trong container, muốn các tính năng của App Service (slot, custom domain, Easy Auth)</td></tr>
    <tr><td><strong>Azure Kubernetes Service (AKS)</strong></td><td>Cần toàn quyền Kubernetes API, workload phức tạp, tùy biến mạng/node pool</td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Cần cô lập ở mức hệ điều hành / chạy OS khác kernel host / cần cài phần mềm cấp hệ thống" thì nghiêng về <strong>VM</strong>. "Khởi động trong vài giây, mật độ cao, đóng gói nhất quán" thì là <strong>container</strong>.</div>
`
    },
    {
      id: 'aci',
      unit: 'Review Azure Container Instances',
      title: 'Azure Container Instances (ACI)',
      html: `
<p><strong>Azure Container Instances</strong> là cách nhanh và đơn giản nhất để chạy container trên Azure: không cần tạo VM, không cần quản lý orchestrator. Bạn chỉ định image, CPU, bộ nhớ, và ACI chạy nó trong vài giây. Tính phí <strong>theo giây</strong> dựa trên vCPU và bộ nhớ đã cấp phát.</p>

<h4>Đặc điểm chính</h4>
<ul>
  <li><strong>Khởi động nhanh</strong>: vài giây.</li>
  <li><strong>Public IP và DNS label</strong>: có thể expose container ra Internet với FQDN dạng <code>&lt;dns-label&gt;.&lt;region&gt;.azurecontainer.io</code>.</li>
  <li><strong>Cô lập theo kiểu hypervisor</strong>: mỗi container group chạy cô lập như một VM, an toàn khi chạy đa tenant.</li>
  <li><strong>Tùy chọn tài nguyên</strong>: chỉ định chính xác số vCPU và GB bộ nhớ.</li>
  <li><strong>Lưu trữ bền</strong>: mount <strong>Azure Files</strong> share.</li>
  <li><strong>Linux và Windows</strong>: hỗ trợ cả hai (một số tính năng chỉ có cho Linux).</li>
  <li><strong>Triển khai vào VNet</strong>: container group có thể nằm trong subnet của bạn để giao tiếp private với tài nguyên khác.</li>
</ul>

<h4>Restart policy</h4>
<table>
  <thead><tr><th>Policy</th><th>Hành vi</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><strong>Always</strong> (mặc định)</td><td>Luôn khởi động lại container khi nó dừng</td><td>Web server, dịch vụ chạy liên tục</td></tr>
    <tr><td><strong>OnFailure</strong></td><td>Chỉ khởi động lại khi tiến trình kết thúc với <strong>exit code khác 0</strong>; chạy ít nhất một lần</td><td>Tác vụ theo lô cần thử lại khi lỗi</td></tr>
    <tr><td><strong>Never</strong></td><td>Không khởi động lại khi tiến trình thoát thành công (exit code 0)</td><td>Tác vụ chạy một lần</td></tr>
  </tbody>
</table>
<p>Khi container với policy <code>OnFailure</code>/<code>Never</code> chạy xong, trạng thái là <strong>Terminated</strong> và bạn <strong>ngừng bị tính phí compute</strong>. Lưu ý: IP của container group có thể thay đổi khi group khởi động lại, nên hãy dùng DNS label thay vì IP cố định.</p>

<h4>Lệnh CLI</h4>
<pre><code># Container web public có DNS label
az container create -g rg-aci -n web01 \\
  --image mcr.microsoft.com/azuredocs/aci-helloworld \\
  --os-type Linux --cpu 1 --memory 1.5 \\
  --ports 80 --dns-name-label contoso-web01 --ip-address Public

# Tác vụ chạy một lần, có biến môi trường
az container create -g rg-aci -n job01 \\
  --image mcr.microsoft.com/azuredocs/aci-wordcount:latest \\
  --restart-policy OnFailure \\
  --environment-variables NumWords=5 MinLength=8

az container show -g rg-aci -n job01 --query "containers[0].instanceView.currentState.state"
az container logs -g rg-aci -n job01
az container exec -g rg-aci -n web01 --exec-command "/bin/sh"</code></pre>

<h4>Biến môi trường và secret</h4>
<ul>
  <li><code>--environment-variables</code>: giá trị hiển thị trong cấu hình container.</li>
  <li><code>--secure-environment-variables</code>: giá trị <strong>không hiển thị</strong> trong portal hay output của <code>az container show</code>.</li>
  <li>Kéo image từ registry private (ví dụ ACR): truyền <code>--registry-login-server</code>, <code>--registry-username</code>, <code>--registry-password</code> hoặc dùng managed identity.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>"Chạy một tác vụ xử lý dữ liệu một lần, trả tiền ít nhất, container dừng khi xong" thì dùng ACI với restart policy <strong>OnFailure</strong> hoặc <strong>Never</strong>. Nếu để mặc định <strong>Always</strong>, container sẽ chạy lại liên tục và tiếp tục bị tính phí.</div>
`
    },
    {
      id: 'container-groups',
      unit: 'Implement container groups',
      title: 'Container group trong ACI',
      html: `
<p><strong>Container group</strong> là tài nguyên cấp cao nhất của ACI: một tập hợp container được lập lịch trên <strong>cùng một máy chủ</strong>. Khi bạn tạo "một container" bằng <code>az container create</code>, thực chất bạn đang tạo một container group chứa một container. Khái niệm này giống <strong>pod</strong> trong Kubernetes.</p>

<h4>Các container trong group chia sẻ</h4>
<ul>
  <li><strong>Vòng đời (lifecycle)</strong>: khởi động, dừng, xóa cùng nhau; restart policy áp dụng cho cả group.</li>
  <li><strong>Tài nguyên</strong>: group được cấp tổng tài nguyên bằng tổng resource request của các container.</li>
  <li><strong>Mạng cục bộ</strong>: một IP (public hoặc private), một DNS label; các container gọi nhau qua <code>localhost</code> trên bất kỳ cổng nào.</li>
  <li><strong>Volume lưu trữ</strong>: có thể mount cùng một volume vào nhiều container.</li>
</ul>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 250" role="img" aria-label="Container group gồm container web và sidecar dùng chung IP, gọi nhau qua localhost và mount chung một Azure file share">
  <rect class="box" x="10" y="90" width="110" height="50" rx="10"/>
  <text x="65" y="120" text-anchor="middle" class="t-b">Internet</text>

  <rect class="zone" x="160" y="15" width="550" height="225" rx="12"/>
  <text x="180" y="40" class="t-b">Container group: web-group</text>
  <text x="180" y="58" class="t-sm t-mute">1 IP public · DNS: contoso-web.eastus.azurecontainer.io</text>

  <rect class="box-a" x="190" y="80" width="200" height="70" rx="10"/>
  <text x="290" y="108" text-anchor="middle" class="t-b">web</text>
  <text x="290" y="128" text-anchor="middle" class="t-sm">nginx · port 80</text>
  <rect class="box-a" x="480" y="80" width="200" height="70" rx="10"/>
  <text x="580" y="108" text-anchor="middle" class="t-b">sidecar log</text>
  <text x="580" y="128" text-anchor="middle" class="t-sm">port 5000</text>
  <line class="ln-s" x1="391" y1="115" x2="479" y2="115" marker-start="url(#arr-s)" marker-end="url(#arr-s)"/>
  <text x="435" y="106" text-anchor="middle" class="t-sm t-s">localhost</text>

  <rect class="box-w" x="190" y="180" width="490" height="44" rx="10"/>
  <text x="435" y="207" text-anchor="middle">Volume: Azure file share → /mnt/data (bền vững, dùng chung)</text>
  <line class="ln dash" x1="290" y1="150" x2="290" y2="176" marker-end="url(#arr)"/>
  <line class="ln dash" x1="580" y1="150" x2="580" y2="176" marker-end="url(#arr)"/>

  <line class="ln-a" x1="120" y1="115" x2="186" y2="115" marker-end="url(#arr-a)"/>
  <text x="153" y="106" text-anchor="middle" class="t-sm t-a">TCP 80</text>
</svg>
<figcaption>Hình 1. Các container trong group giống một "pod": chung vòng đời, chung một IP/DNS label (nên không thể expose trùng cổng), gọi nhau qua <code>localhost</code> và có thể mount cùng một volume. Multi-container group chỉ có với container Linux.</figcaption>
</figure>

<h4>Giới hạn và lưu ý quan trọng</h4>
<ul>
  <li><strong>Multi-container group chỉ hỗ trợ container Linux</strong>. Với Windows, mỗi group chỉ có một container.</li>
  <li>Tối thiểu cấp phát cho group: <strong>1 vCPU và 1 GB</strong> bộ nhớ (từng container trong group có thể nhỏ hơn).</li>
  <li>Không thể expose cùng một cổng từ hai container trong group (vì dùng chung IP).</li>
  <li>IP và FQDN được giải phóng khi xóa group.</li>
  <li>Không "scale out" được container group: cần nhiều instance thì tạo nhiều group hoặc dùng Container Apps/AKS.</li>
</ul>

<h4>Triển khai multi-container group</h4>
<p>Azure CLI <code>az container create</code> với tham số dòng lệnh chỉ tạo được group <em>một container</em>. Để tạo group nhiều container, dùng:</p>
<div class="compare">
  <div><strong>YAML file</strong>Ngắn gọn, khuyến nghị khi chỉ triển khai container instances. <code>az container create -g rg -f deploy.yaml</code></div>
  <div><strong>ARM template / Bicep</strong>Khuyến nghị khi cần triển khai thêm tài nguyên khác cùng lúc (ví dụ storage account và file share).</div>
</div>
<pre><code>az container export -g rg-aci -n web-group -f web-group.yaml   # xuất cấu hình ra YAML</code></pre>

<h4>Volume hỗ trợ</h4>
<table>
  <thead><tr><th>Volume</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><strong>Azure file share</strong></td><td>Lưu trữ bền, chia sẻ được. Chỉ mount được vào <strong>container Linux</strong>; cần tên storage account, key và tên share.</td></tr>
    <tr><td><strong>emptyDir</strong></td><td>Thư mục tạm dùng chung giữa các container trong group, mất khi group dừng.</td></tr>
    <tr><td><strong>secret</strong></td><td>Đưa secret vào container dưới dạng file.</td></tr>
    <tr><td><strong>gitRepo</strong></td><td>Clone một repo git vào volume khi khởi tạo.</td></tr>
  </tbody>
</table>
<pre><code>az container create -g rg-aci -n files01 \\
  --image mcr.microsoft.com/azuredocs/aci-hellofiles --ports 80 --dns-name-label contoso-files01 \\
  --azure-file-volume-account-name stacidata \\
  --azure-file-volume-account-key "&lt;storage-key&gt;" \\
  --azure-file-volume-share-name acishare \\
  --azure-file-volume-mount-path /aci/logs/</code></pre>

<h4>Kịch bản điển hình</h4>
<ul>
  <li>Container web + container kéo nội dung mới nhất từ source control.</li>
  <li>Container ứng dụng + container <strong>sidecar</strong> thu thập log/metric ghi ra lưu trữ dài hạn.</li>
  <li>Container ứng dụng + container giám sát định kỳ gọi kiểm tra sức khỏe.</li>
</ul>

<div class="callout exam"><strong>Góc thi</strong>Đề hay cho tình huống "hai container phải dùng chung vòng đời, chung IP và gọi nhau qua localhost, chạy trên Windows" và hỏi có được không. Đáp án: <strong>không</strong>, multi-container group chỉ có trên <strong>Linux</strong>. Muốn container giữ dữ liệu sau khi khởi động lại thì mount <strong>Azure Files</strong>, không phải emptyDir.</div>
`
    },
    {
      id: 'container-apps',
      unit: 'Review Azure Container Apps',
      title: 'Azure Container Apps',
      html: `
<p><strong>Azure Container Apps</strong> là nền tảng serverless chạy ứng dụng container, xây trên Kubernetes cùng các dự án mã nguồn mở <strong>KEDA</strong> (autoscale theo sự kiện), <strong>Dapr</strong> (building block cho microservice) và <strong>Envoy</strong> (ingress). Bạn không truy cập Kubernetes API, không quản lý node; nền tảng lo hết.</p>

<h4>Các khái niệm chính</h4>
<ul>
  <li><strong>Environment</strong>: ranh giới an toàn chứa nhiều container app; các app trong cùng environment dùng chung VNet và đích ghi log (Log Analytics workspace). Có thể dùng VNet của bạn.</li>
  <li><strong>Container app</strong>: một ứng dụng (có thể nhiều container, gồm cả sidecar và init container).</li>
  <li><strong>Revision</strong>: <strong>bản chụp bất biến</strong> của một phiên bản app. Thay đổi phạm vi revision (image, scale rule, biến môi trường của container) tạo revision mới; thay đổi phạm vi app (secret, ingress) thì không.</li>
  <li><strong>Revision mode</strong>: <em>Single</em> (mặc định, chỉ một revision hoạt động, thay thế dần) hoặc <em>Multiple</em> (nhiều revision cùng chạy, chia traffic theo % để blue-green/canary).</li>
  <li><strong>Replica</strong>: một instance đang chạy của revision.</li>
  <li><strong>Container Apps jobs</strong>: tác vụ chạy hữu hạn (thủ công, theo lịch cron, hoặc theo sự kiện).</li>
</ul>

<h4>Ingress</h4>
<ul>
  <li><strong>External</strong>: nhận traffic từ Internet (hoặc từ VNet nếu environment là internal).</li>
  <li><strong>Internal</strong>: chỉ nhận traffic từ các app khác trong cùng environment.</li>
  <li>Hỗ trợ HTTP/HTTPS (TLS terminate tại ingress) và TCP; custom domain, chứng chỉ managed miễn phí, IP restriction.</li>
</ul>

<h4>Scale</h4>
<table>
  <thead><tr><th>Thuộc tính</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Min replicas mặc định</td><td><strong>0</strong> (scale to zero, không tính phí usage khi ở 0)</td></tr>
    <tr><td>Max replicas mặc định</td><td><strong>10</strong> (cấu hình tối đa 1.000)</td></tr>
    <tr><td>Rule mặc định</td><td>HTTP, 10 request đồng thời mỗi replica</td></tr>
    <tr><td>Loại rule</td><td>HTTP, TCP, Custom (CPU, memory, mọi scaler KEDA: Service Bus, Event Hubs, Azure Queue, Kafka, Redis…)</td></tr>
  </tbody>
</table>
<p>Nếu tắt ingress mà không đặt <code>minReplicas</code> ≥ 1 hoặc rule custom, app sẽ scale về 0 và không có gì đánh thức nó dậy.</p>

<pre><code>az containerapp env create -g rg-ca -n env-prod -l eastus

az containerapp create -g rg-ca -n api --environment env-prod \\
  --image myacr.azurecr.io/api:v1 --target-port 8080 --ingress external \\
  --min-replicas 0 --max-replicas 5 \\
  --scale-rule-name http-rule --scale-rule-type http --scale-rule-http-concurrency 50

# Chia traffic giữa hai revision (cần revision mode multiple)
az containerapp revision set-mode -g rg-ca -n api --mode multiple
az containerapp ingress traffic set -g rg-ca -n api --revision-weight api--v1=80 api--v2=20</code></pre>

<h4>Chọn dịch vụ nào?</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 230" role="img" aria-label="So sánh ACI, Container Apps và AKS theo mức đơn giản và mức kiểm soát">
  <rect class="box-s" x="10" y="10" width="220" height="160" rx="12"/>
  <text x="120" y="40" text-anchor="middle" class="t-b">ACI</text>
  <text x="120" y="70" text-anchor="middle" class="t-sm">1 container group</text>
  <text x="120" y="92" text-anchor="middle" class="t-sm">tính tiền theo giây</text>
  <text x="120" y="114" text-anchor="middle" class="t-sm">không autoscale</text>
  <text x="120" y="136" text-anchor="middle" class="t-sm">tác vụ lô, sidecar đơn giản</text>

  <rect class="box-a" x="250" y="10" width="220" height="160" rx="12"/>
  <text x="360" y="40" text-anchor="middle" class="t-b">Container Apps</text>
  <text x="360" y="70" text-anchor="middle" class="t-sm">serverless, chạy trên Kubernetes</text>
  <text x="360" y="92" text-anchor="middle" class="t-sm">KEDA autoscale, scale về 0</text>
  <text x="360" y="114" text-anchor="middle" class="t-sm">revision + chia traffic</text>
  <text x="360" y="136" text-anchor="middle" class="t-sm">không truy cập K8s API</text>

  <rect class="box-e" x="490" y="10" width="220" height="160" rx="12"/>
  <text x="600" y="40" text-anchor="middle" class="t-b">AKS</text>
  <text x="600" y="70" text-anchor="middle" class="t-sm">Kubernetes được quản lý</text>
  <text x="600" y="92" text-anchor="middle" class="t-sm">toàn quyền Kubernetes API</text>
  <text x="600" y="114" text-anchor="middle" class="t-sm">node pool, CRD, operator</text>
  <text x="600" y="136" text-anchor="middle" class="t-sm">bạn vận hành cluster</text>

  <line class="ln" x1="30" y1="194" x2="690" y2="194" marker-start="url(#arr)" marker-end="url(#arr)"/>
  <text x="30" y="220" class="t-sm t-mute">Đơn giản, ít quản trị</text>
  <text x="690" y="220" text-anchor="end" class="t-sm t-mute">Nhiều kiểm soát, nhiều vận hành</text>
</svg>
<figcaption>Hình 1. Đi từ trái sang phải, bạn có nhiều quyền kiểm soát hơn nhưng phải tự vận hành nhiều hơn. Đề thi thường cho yêu cầu "ít công quản trị nhất" để loại AKS, và "autoscale theo sự kiện / về 0" để loại ACI.</figcaption>
</figure>
<table>
  <thead><tr><th>Yêu cầu</th><th>Chọn</th></tr></thead>
  <tbody>
    <tr><td>Chạy nhanh 1 container / tác vụ lô, đơn giản nhất</td><td><strong>ACI</strong></td></tr>
    <tr><td>Microservice, autoscale theo HTTP hoặc hàng đợi, scale về 0, chia traffic theo revision, không quản lý cluster</td><td><strong>Container Apps</strong></td></tr>
    <tr><td>Cần truy cập trực tiếp Kubernetes API, CRD, operator, kiểm soát node pool</td><td><strong>AKS</strong></td></tr>
    <tr><td>Website trong container cần slot, Easy Auth, backup kiểu App Service</td><td><strong>Web App for Containers</strong></td></tr>
  </tbody>
</table>

<div class="callout exam"><strong>Góc thi</strong>"Ứng dụng xử lý message từ Service Bus, phải scale theo độ dài hàng đợi và về 0 khi không có message, không muốn quản lý Kubernetes" thì chọn <strong>Container Apps</strong> (KEDA). ACI không có autoscale; AKS làm được nhưng tốn công quản trị hơn.</div>
`
    },
    {
      id: 'exercise-aci',
      unit: 'Exercise: Implement Container Instances',
      title: 'Thực hành: triển khai container trên ACI',
      html: `
<p>Bài thực hành trên Learn tạo một container group chạy image mẫu, expose qua DNS label và kiểm tra trên trình duyệt. Có thể làm bằng portal hoặc Cloud Shell.</p>

<ol class="steps">
  <li>Tạo resource group: <code>az group create -n rg-aci-lab -l eastus</code>.</li>
  <li>Tạo container với DNS label duy nhất (thêm số ngẫu nhiên để tránh trùng):
<pre><code>DNS=aci-lab-$RANDOM
az container create -g rg-aci-lab -n mycontainer \\
  --image mcr.microsoft.com/azuredocs/aci-helloworld \\
  --os-type Linux --cpu 1 --memory 1 \\
  --ports 80 --dns-name-label $DNS --ip-address Public</code></pre></li>
  <li>Kiểm tra trạng thái và FQDN:
<pre><code>az container show -g rg-aci-lab -n mycontainer \\
  --query "{FQDN:ipAddress.fqdn, State:provisioningState}" -o table</code></pre></li>
  <li>Mở FQDN (dạng <code>aci-lab-1234.eastus.azurecontainer.io</code>) trên trình duyệt để thấy trang chào mừng.</li>
  <li>Xem log và gắn vào luồng output: <code>az container logs -g rg-aci-lab -n mycontainer</code> và <code>az container attach -g rg-aci-lab -n mycontainer</code>.</li>
  <li>Trong portal, xem tab <em>Containers</em> (events, properties, logs, connect) và tab <em>Overview</em> (CPU, memory, network).</li>
  <li>Dọn dẹp: <code>az group delete -n rg-aci-lab --yes --no-wait</code>.</li>
</ol>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: tạo container instance public</div>
  <div class="lab-body">
  <ol class="lab-steps">
    <li>Bắt đầu tạo tài nguyên:<br><span class="path">Azure portal › Create a resource › Containers › Container Instances</span></li>
    <li>Tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Create container instance</div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">(New) rg-aci-lab</span></div>
        <div class="blade-sec">Container details</div>
        <div class="pf"><label class="req">Container name</label><span class="pv">mycontainer</span></div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">(US) East US</span></div>
        <div class="pf"><label>Availability zones</label><span class="pv sel">None</span></div>
        <div class="pf"><label class="req">Image source</label><span class="pv radio">Quickstart images</span></div>
        <div class="pf"><label></label><span class="pv note">Khác: Azure Container Registry, Other registry (Docker Hub, registry private)</span></div>
        <div class="pf"><label class="req">Container image</label><span class="pv sel">mcr.microsoft.com/azuredocs/aci-helloworld:latest (Linux)</span></div>
        <div class="pf"><label class="req">Size</label><span class="pv note">1 vCPU, 1.5 GiB memory · Change size</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Next: Networking &gt;</span></div>
      </div>
    </li>
    <li>Tab <strong>Networking</strong>: đặt DNS name label (duy nhất trong region) và mở cổng:
      <div class="blade">
        <div class="blade-title">Create container instance · Networking</div>
        <div class="pf"><label>Networking type</label><span class="pv radio">Public</span></div>
        <div class="pf"><label></label><span class="pv note">Private = đặt vào subnet của VNet; None = không có IP</span></div>
        <div class="pf"><label>DNS name label</label><span class="pv">aci-lab-1234</span></div>
        <div class="pf"><label>DNS name label scope reuse</label><span class="pv sel">Tenant</span></div>
        <div class="pf"><label>Ports</label><span class="pv">80 · TCP</span></div>
      </div>
    </li>
    <li>(Tùy chọn) Tab <strong>Advanced</strong>: chọn <strong>Restart policy</strong> (On failure / Always / Never), thêm environment variable (có tùy chọn đánh dấu secure), command override. Với web server để mặc định.</li>
    <li>Bấm <strong>Review + create</strong> rồi <strong>Create</strong>. Khi xong, mở container group và ghi lại <strong>FQDN</strong>, chờ <strong>Status</strong> là <em>Running</em> rồi mở FQDN trên trình duyệt.</li>
    <li>Xem log: <em>Settings › Containers › Logs</em>. Dọn dẹp: <em>Overview › Delete</em>.</li>
  </ol>
  </div>
</div>

<h4>Các trường trong portal khi tạo ACI</h4>
<table>
  <thead><tr><th>Tab</th><th>Thiết lập</th></tr></thead>
  <tbody>
    <tr><td>Basics</td><td>Tên container, region, <strong>image source</strong> (Quickstart images, Azure Container Registry, Other registry), OS type, size (vCPU, GB, GPU)</td></tr>
    <tr><td>Networking</td><td>Networking type: <strong>Public</strong>, <strong>Private</strong> (VNet) hoặc <strong>None</strong>; DNS name label; ports (TCP/UDP)</td></tr>
    <tr><td>Advanced</td><td><strong>Restart policy</strong>, biến môi trường (có tùy chọn secure), command override</td></tr>
  </tbody>
</table>

<div class="callout tip"><strong>Mẹo</strong>DNS label phải duy nhất trong region. Nếu bị báo trùng, đổi tên khác. Khi chọn networking type <strong>Private</strong>, container group nằm trong subnet của VNet và không có FQDN public.</div>
`
    },
    {
      id: 'acr',
      extra: true,
      title: 'Azure Container Registry (ACR)',
      html: `
<p><strong>Azure Container Registry</strong> là registry private, được quản lý, tương thích Docker/OCI, dùng để lưu image container, Helm chart và các artifact OCI. Tên registry phải duy nhất toàn cầu (chỉ chữ và số, 5–50 ký tự), tạo ra login server <code>&lt;tên&gt;.azurecr.io</code>.</p>

<h4>So sánh SKU</h4>
<table>
  <thead><tr><th>Tính năng</th><th>Basic</th><th>Standard</th><th>Premium</th></tr></thead>
  <tbody>
    <tr><td>Dung lượng đi kèm</td><td>10 GiB</td><td>100 GiB</td><td>500 GiB</td></tr>
    <tr><td>Webhooks</td><td>2</td><td>10</td><td>500</td></tr>
    <tr><td><strong>Geo-replication</strong></td><td>Không</td><td>Không</td><td><strong>Có</strong></td></tr>
    <tr><td><strong>Private endpoint (Private Link)</strong></td><td>Không</td><td>Không</td><td><strong>Có</strong></td></tr>
    <tr><td>IP access rules (firewall)</td><td>Không</td><td>Không</td><td>Có</td></tr>
    <tr><td>Customer-managed keys, content trust*, retention policy cho manifest untagged</td><td>Không</td><td>Không</td><td>Có</td></tr>
    <tr><td>Anonymous pull</td><td>Không</td><td>Có</td><td>Có</td></tr>
    <tr><td>Availability zones (zone redundancy)</td><td colspan="3">Có ở tất cả SKU tại region hỗ trợ</td></tr>
  </tbody>
</table>
<p>* Docker Content Trust (DCT) đang bị loại bỏ: từ <strong>31/5/2026</strong> không thể bật DCT trên registry mới hoặc registry chưa từng bật; DCT bị gỡ hoàn toàn vào <strong>31/3/2028</strong>. Microsoft khuyến nghị chuyển sang <strong>Notary Project</strong> (Notation) để ký image.</p>
<p>Đổi SKU không gây downtime (<code>az acr update -n myacr --sku Premium</code>). Hạ từ Premium phải xóa các geo-replication (và connected registry) trước.</p>

<h4>Geo-replication (Premium)</h4>
<p>Một registry duy nhất với replica ở nhiều region: một login server, image được đồng bộ tự động, client kéo từ replica gần nhất (giảm độ trễ, không tốn phí egress liên vùng), registry vẫn hoạt động nếu một region gặp sự cố.</p>
<pre><code>az acr create -g rg-acr -n contosoacr --sku Premium
az acr replication create -r contosoacr -l westeurope</code></pre>

<h4>Build và đẩy image</h4>
<pre><code># Cách 1: Docker cục bộ
az acr login -n contosoacr
docker tag web:v1 contosoacr.azurecr.io/web:v1
docker push contosoacr.azurecr.io/web:v1

# Cách 2: ACR Tasks - build trên cloud, không cần Docker trên máy
az acr build -r contosoacr -t web:v1 .

az acr repository list -n contosoacr -o table
az acr repository show-tags -n contosoacr --repository web</code></pre>
<p><code>az acr build</code> (ACR Tasks quick task) gửi build context lên Azure, build bằng Dockerfile và đẩy vào registry; rất hữu ích trong Cloud Shell vì Cloud Shell không có Docker daemon. ACR Tasks còn có thể tự build khi commit mã nguồn hoặc khi base image được cập nhật.</p>

<h4>Xác thực và phân quyền</h4>
<div class="compare">
  <div><strong>Admin user</strong>Tắt mặc định. Một tài khoản duy nhất với 2 mật khẩu, có <strong>toàn quyền push/pull</strong>. Chỉ nên dùng thử nghiệm hoặc với dịch vụ cũ chỉ hỗ trợ username/password. <code>az acr update -n contosoacr --admin-enabled true</code></div>
  <div><strong>Microsoft Entra ID + RBAC</strong>Đăng nhập cá nhân (<code>az acr login</code>), <strong>service principal</strong> hoặc <strong>managed identity</strong> (AKS, App Service, ACI, Container Apps). Phân quyền tối thiểu theo vai trò.</div>
</div>
<table>
  <thead><tr><th>Vai trò</th><th>Quyền</th></tr></thead>
  <tbody>
    <tr><td><strong>AcrPull</strong></td><td>Chỉ kéo image (dùng cho runtime: AKS, App Service, ACI)</td></tr>
    <tr><td><strong>AcrPush</strong></td><td>Kéo và đẩy image (dùng cho pipeline CI)</td></tr>
    <tr><td>AcrDelete</td><td>Xóa image/artifact</td></tr>
    <tr><td>AcrImageSigner</td><td>Ký image (content trust)</td></tr>
    <tr><td>Owner/Contributor</td><td>Quản lý registry (control plane); Owner/Contributor cũng có quyền push/pull</td></tr>
  </tbody>
</table>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 210" role="img" aria-label="Pipeline CI đẩy image vào ACR với vai trò AcrPush; AKS, App Service, ACI kéo image bằng managed identity có vai trò AcrPull">
  <rect class="box" x="10" y="70" width="170" height="80" rx="10"/>
  <text x="95" y="104" text-anchor="middle" class="t-b">CI pipeline / Dev</text>
  <text x="95" y="124" text-anchor="middle" class="t-sm t-a">vai trò AcrPush</text>

  <rect class="box-w" x="270" y="30" width="180" height="160" rx="12"/>
  <text x="360" y="58" text-anchor="middle" class="t-b t-w">contosoacr</text>
  <text x="360" y="76" text-anchor="middle" class="t-sm t-mute">contosoacr.azurecr.io</text>
  <rect class="box" x="290" y="95" width="140" height="75" rx="8"/>
  <text x="360" y="124" text-anchor="middle" class="t-b">repo: web</text>
  <text x="360" y="146" text-anchor="middle" class="t-sm">web:v1 · web:v2</text>

  <line class="ln-a" x1="180" y1="110" x2="266" y2="110" marker-end="url(#arr-a)"/>
  <text x="223" y="101" text-anchor="middle" class="t-sm t-a">push</text>
  <text x="223" y="128" text-anchor="middle" class="t-sm t-mute">az acr build</text>

  <rect class="box-s" x="540" y="20" width="170" height="50" rx="10"/>
  <text x="625" y="42" text-anchor="middle" class="t-b">AKS</text>
  <text x="625" y="60" text-anchor="middle" class="t-sm t-mute">identity có AcrPull</text>
  <rect class="box-s" x="540" y="85" width="170" height="50" rx="10"/>
  <text x="625" y="107" text-anchor="middle" class="t-b">App Service</text>
  <text x="625" y="125" text-anchor="middle" class="t-sm t-mute">identity có AcrPull</text>
  <rect class="box-s" x="540" y="150" width="170" height="50" rx="10"/>
  <text x="625" y="172" text-anchor="middle" class="t-b">ACI / Container Apps</text>
  <text x="625" y="190" text-anchor="middle" class="t-sm t-mute">identity có AcrPull</text>

  <line class="ln-s" x1="450" y1="110" x2="536" y2="45" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="450" y1="110" x2="536" y2="110" marker-end="url(#arr-s)"/>
  <line class="ln-s" x1="450" y1="110" x2="536" y2="175" marker-end="url(#arr-s)"/>
  <text x="500" y="96" text-anchor="middle" class="t-sm t-s">pull</text>
</svg>
<figcaption>Hình 1. Nguyên tắc quyền tối thiểu: pipeline build/đẩy image cần <strong>AcrPush</strong>; dịch vụ chạy container chỉ cần <strong>AcrPull</strong>, cấp cho managed identity của dịch vụ thay vì bật admin user.</figcaption>
</figure>

<p>ACR còn hỗ trợ quyền ở mức repository bằng <strong>token và scope map</strong> (và ở registry bật chế độ ABAC thì có các vai trò dạng "Container Registry Repository Reader/Writer").</p>
<pre><code># Gắn ACR vào AKS (cấp AcrPull cho kubelet identity)
az aks update -g rg-aks -n aks1 --attach-acr contosoacr</code></pre>

<div class="callout exam"><strong>Góc thi</strong>"Cluster AKS ở 3 region cần kéo image từ registry gần nhất, quản lý một registry duy nhất" thì cần <strong>Premium + geo-replication</strong>. "Registry chỉ được truy cập qua IP private" cũng cần <strong>Premium</strong> (private endpoint). "Pipeline cần đẩy image theo nguyên tắc quyền tối thiểu" thì gán <strong>AcrPush</strong>; ứng dụng chỉ chạy image thì gán <strong>AcrPull</strong>.</div>
`
    }
  ],
  keyFacts: [
    'Container dùng chung kernel của host, khởi động trong vài giây; VM có OS khách riêng và cô lập ở mức phần cứng ảo.',
    'Restart policy của ACI: <strong>Always</strong> (mặc định), <strong>OnFailure</strong> (chỉ khi exit code khác 0), <strong>Never</strong>. Container Terminated thì ngừng tính phí compute.',
    'Container group chia sẻ <strong>vòng đời, tài nguyên, mạng cục bộ (một IP, localhost) và volume</strong>; giống pod Kubernetes.',
    'Multi-container group <strong>chỉ hỗ trợ Linux</strong>; triển khai bằng <strong>YAML</strong> hoặc <strong>ARM/Bicep</strong>.',
    'Mount <strong>Azure Files</strong> cho dữ liệu bền; chỉ mount được vào container Linux. Các volume khác: emptyDir, secret, gitRepo.',
    'FQDN của ACI: <code>&lt;dns-label&gt;.&lt;region&gt;.azurecontainer.io</code>. IP có thể đổi khi group khởi động lại.',
    'Container Apps: scale theo <strong>KEDA</strong>, mặc định min <strong>0</strong> / max <strong>10</strong> replica, rule HTTP 10 request đồng thời.',
    'Revision là bản chụp bất biến; revision mode <strong>Single</strong> (mặc định) hoặc <strong>Multiple</strong> (chia traffic theo %).',
    'ACR SKU: Basic 10 GiB, Standard 100 GiB, Premium 500 GiB. <strong>Geo-replication và private endpoint chỉ có ở Premium</strong>.',
    'Admin user của ACR tắt mặc định, có toàn quyền push/pull; production nên dùng managed identity với <strong>AcrPull</strong>/<strong>AcrPush</strong>.',
    '<code>az acr build</code> build image trên cloud (ACR Tasks), không cần Docker cục bộ.'
  ],
  traps: [
    'Để restart policy mặc định <strong>Always</strong> cho tác vụ chạy một lần: container chạy lại liên tục và vẫn bị tính phí.',
    'Định tạo container group nhiều container cho <strong>Windows</strong>. Chỉ Linux hỗ trợ multi-container group.',
    'Nghĩ rằng <code>az container create</code> với tham số dòng lệnh tạo được nhiều container trong một group. Phải dùng <strong>YAML</strong> hoặc ARM template.',
    'Dùng emptyDir để giữ dữ liệu lâu dài. emptyDir mất khi group dừng; dữ liệu bền cần <strong>Azure Files</strong>.',
    'Chọn ACI cho workload cần autoscale theo hàng đợi hoặc scale về 0 theo sự kiện. ACI không có autoscale; dùng <strong>Container Apps</strong>.',
    'Chọn ACR Standard khi cần geo-replication hoặc private endpoint. Cả hai chỉ có ở <strong>Premium</strong>.',
    'Bật admin user của ACR cho AKS/App Service production. Nên dùng managed identity + <strong>AcrPull</strong>.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Restart policy ACI</td><td>Always (mặc định) / OnFailure / Never</td></tr>
    <tr><td>Container group chia sẻ</td><td>Lifecycle, tài nguyên, IP + localhost, volume</td></tr>
    <tr><td>Multi-container group</td><td>Chỉ Linux; YAML hoặc ARM/Bicep</td></tr>
    <tr><td>Volume ACI</td><td>Azure Files (Linux), emptyDir, secret, gitRepo</td></tr>
    <tr><td>FQDN ACI</td><td><code>label.region.azurecontainer.io</code></td></tr>
    <tr><td>Container Apps scale</td><td>KEDA; min 0, max 10 mặc định; HTTP/TCP/custom</td></tr>
    <tr><td>Revision mode</td><td>Single (mặc định) / Multiple (chia traffic)</td></tr>
    <tr><td>Ingress Container Apps</td><td>External / Internal (trong environment)</td></tr>
    <tr><td>ACR Basic / Standard / Premium</td><td>10 / 100 / 500 GiB; geo-replication + private link chỉ Premium</td></tr>
    <tr><td>Vai trò ACR</td><td>AcrPull (kéo), AcrPush (kéo + đẩy), AcrDelete, AcrImageSigner</td></tr>
    <tr><td>Build trên cloud</td><td><code>az acr build -r REG -t img:tag .</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Ba restart policy của ACI? Mặc định là gì?', back: '<strong>Always</strong> (mặc định), <strong>OnFailure</strong>, <strong>Never</strong>.' },
    { front: 'OnFailure khởi động lại container khi nào?', back: 'Khi tiến trình kết thúc với <strong>exit code khác 0</strong>. Container chạy ít nhất một lần.' },
    { front: 'Các container trong một container group chia sẻ những gì?', back: 'Vòng đời, tài nguyên, mạng cục bộ (một IP, DNS label, gọi nhau qua localhost) và volume.' },
    { front: 'Multi-container group hỗ trợ hệ điều hành nào?', back: 'Chỉ <strong>Linux</strong>.' },
    { front: 'Hai cách triển khai multi-container group?', back: '<strong>YAML file</strong> (chỉ có container) hoặc <strong>ARM template/Bicep</strong> (khi cần thêm tài nguyên khác).' },
    { front: 'Volume nào giữ dữ liệu bền cho ACI?', back: '<strong>Azure Files share</strong> (chỉ container Linux).' },
    { front: 'Định dạng FQDN của ACI?', back: '<code>&lt;dns-label&gt;.&lt;region&gt;.azurecontainer.io</code>' },
    { front: 'Tham số để biến môi trường không hiển thị trong portal/CLI?', back: '<code>--secure-environment-variables</code>' },
    { front: 'Container Apps dùng công nghệ gì để autoscale?', back: '<strong>KEDA</strong> (Kubernetes Event-driven Autoscaling). Mặc định min 0, max 10 replica.' },
    { front: 'Revision trong Container Apps là gì?', back: 'Bản chụp <strong>bất biến</strong> của app. Mode Single (mặc định) hoặc Multiple để chia traffic giữa các revision.' },
    { front: 'Ingress internal trong Container Apps nghĩa là gì?', back: 'Chỉ các app trong <strong>cùng environment</strong> gọi được.' },
    { front: 'Khi nào chọn AKS thay vì Container Apps?', back: 'Khi cần truy cập trực tiếp <strong>Kubernetes API</strong>, CRD/operator, kiểm soát node pool.' },
    { front: 'Dung lượng đi kèm của ACR Basic/Standard/Premium?', back: '10 GiB / 100 GiB / 500 GiB.' },
    { front: 'Tính năng ACR chỉ có ở Premium?', back: 'Geo-replication, private endpoint, IP access rules, customer-managed keys, content trust (đang bị loại bỏ: registry mới không bật được từ 31/5/2026), retention policy.' },
    { front: 'AcrPull khác AcrPush?', back: 'AcrPull: chỉ kéo image. AcrPush: kéo và đẩy image.' },
    { front: 'Lệnh build image trên Azure không cần Docker cục bộ?', back: '<code>az acr build -r &lt;registry&gt; -t &lt;image:tag&gt; .</code>' }
  ],
  quiz: [
    {
      q: 'Bạn cần chạy một tác vụ xử lý ảnh đóng gói trong container mỗi khi có yêu cầu. Tác vụ chạy khoảng 10 phút rồi kết thúc. Nếu lỗi thì cần chạy lại. Chi phí phải thấp nhất. Bạn cấu hình ACI thế nào?',
      options: ['Restart policy Always', 'Restart policy Never', 'Restart policy OnFailure', 'Triển khai lên AKS với HPA'],
      answer: [2],
      explain: 'OnFailure chạy lại khi exit code khác 0 và dừng khi thành công, nên chỉ tính phí trong lúc chạy. Always khởi động lại liên tục kể cả khi xong. Never không thử lại khi tiến trình kết thúc bình thường và không đáp ứng yêu cầu chạy lại khi lỗi một cách chủ động. AKS tốn kém và phức tạp hơn nhiều.'
    },
    {
      q: 'Bạn cần triển khai một ứng dụng gồm container web và container sidecar thu thập log. Hai container phải dùng chung vòng đời, chung IP và gọi nhau qua localhost. Cả hai image đều dựa trên Windows Server Core. Điều gì đúng?',
      options: ['Triển khai cả hai trong một container group bằng file YAML', 'Không thể đặt hai container Windows trong cùng một container group của ACI', 'Dùng az container create với hai tham số --image', 'Triển khai bằng ARM template thì được hỗ trợ'],
      answer: [1],
      explain: 'Multi-container group của ACI chỉ hỗ trợ Linux; với Windows mỗi group chỉ có một container, bất kể dùng YAML hay ARM template. az container create không nhận nhiều image.'
    },
    {
      q: 'Bạn triển khai container group gồm hai container Linux. Bạn muốn dùng cách triển khai ngắn gọn nhất, không tạo thêm tài nguyên Azure nào khác. Bạn dùng gì?',
      options: ['File YAML với az container create --file', 'ARM template kèm storage account', 'Azure portal với tab Containers', 'Lệnh az container create với tham số --image lặp lại'],
      answer: [0],
      explain: 'YAML là cách được khuyến nghị khi chỉ triển khai container instances vì ngắn gọn. ARM template phù hợp khi cần triển khai thêm tài nguyên khác. Portal và lệnh CLI với tham số chỉ tạo group một container.'
    },
    {
      q: 'Một container trên ACI ghi file kết quả vào thư mục /data. Khi container group khởi động lại, file bị mất. Bạn cần dữ liệu tồn tại lâu dài. Bạn làm gì?',
      options: ['Mount volume emptyDir vào /data', 'Đổi restart policy sang Never', 'Tăng bộ nhớ của container', 'Mount Azure Files share vào /data'],
      answer: [3],
      explain: 'Azure Files share là volume bền, tồn tại độc lập với vòng đời container group. emptyDir chỉ là thư mục tạm, mất khi group dừng. Restart policy và bộ nhớ không ảnh hưởng đến tính bền của dữ liệu.'
    },
    {
      q: 'Một ứng dụng xử lý message từ Azure Service Bus queue. Ứng dụng phải tự scale theo số message và không chạy replica nào khi hàng đợi rỗng. Nhóm vận hành không muốn quản lý cluster Kubernetes. Dịch vụ nào phù hợp nhất?',
      options: ['Azure Container Instances', 'Azure Container Apps', 'Azure Kubernetes Service', 'Virtual Machine Scale Sets'],
      answer: [1],
      explain: 'Container Apps tích hợp KEDA, scale theo Service Bus queue và scale về 0 mà không cần quản lý cluster. ACI không có autoscale. AKS làm được nhưng phải quản lý cluster. VMSS không chạy container serverless và không scale về 0 theo hàng đợi một cách sẵn có.'
    },
    {
      q: 'Bạn đang dùng Azure Container Apps. Bạn muốn chạy song song revision v1 và v2, chuyển 20% traffic sang v2 để thử nghiệm. Bạn cần làm những gì? (Chọn 2)',
      options: ['Đặt revision mode của app là Multiple', 'Tạo environment thứ hai cho v2', 'Cấu hình traffic weight 80/20 giữa hai revision', 'Đặt min replicas bằng 0'],
      answer: [0, 2],
      explain: 'Chia traffic giữa các revision yêu cầu revision mode Multiple, sau đó đặt weight cho từng revision. Tạo environment thứ hai không cần thiết. Min replicas không liên quan đến chia traffic.'
    },
    {
      q: 'Công ty có cluster AKS ở East US, West Europe và Southeast Asia. Các cluster phải kéo image từ registry gần nhất, nhưng đội DevOps chỉ muốn quản lý một registry và một login server. Bạn cần SKU nào của Azure Container Registry?',
      options: ['Basic', 'Standard', 'Premium', 'Bất kỳ SKU nào, chỉ cần bật zone redundancy'],
      answer: [2],
      explain: 'Geo-replication chỉ có ở Premium: một registry, một login server, replica ở nhiều region. Basic và Standard không hỗ trợ geo-replication. Zone redundancy chỉ bảo vệ trong một region.'
    },
    {
      q: 'Pipeline CI cần đẩy image mới vào contosoacr. Ứng dụng trên App Service chỉ cần kéo image. Bạn áp dụng nguyên tắc quyền tối thiểu. Gán vai trò nào? (Chọn 2)',
      options: ['AcrPush cho service principal của pipeline', 'Owner cho service principal của pipeline', 'AcrPull cho managed identity của App Service', 'Bật admin user và chia sẻ mật khẩu cho cả hai'],
      answer: [0, 2],
      explain: 'AcrPush cho phép kéo và đẩy image, đủ cho pipeline. AcrPull chỉ cho phép kéo, đủ cho App Service. Owner vượt quá nhu cầu. Admin user có toàn quyền và dùng chung một tài khoản, vi phạm quyền tối thiểu.'
    },
    {
      q: 'Bạn đang làm việc trong Azure Cloud Shell và cần build image từ Dockerfile trong thư mục hiện tại rồi đẩy vào registry contosoacr. Cloud Shell không có Docker daemon. Lệnh nào phù hợp?',
      options: ['docker build -t contosoacr.azurecr.io/web:v1 .', 'az acr import -n contosoacr --source web:v1', 'az acr login -n contosoacr', 'az acr build -r contosoacr -t web:v1 .'],
      answer: [3],
      explain: 'az acr build gửi build context lên ACR Tasks để build và đẩy image trên cloud. docker build cần Docker daemon. az acr import chỉ nhập image đã có từ registry khác. az acr login chỉ đăng nhập, không build.'
    },
    {
      q: 'Bạn triển khai một container web trên ACI và muốn người dùng truy cập bằng tên ổn định thay vì IP. Bạn cấu hình gì?',
      options: ['DNS name label cho container group', 'Bản ghi A trỏ tới IP hiện tại của container group', 'Private endpoint', 'Restart policy Never để giữ IP'],
      answer: [0],
      explain: 'DNS name label tạo FQDN dạng label.region.azurecontainer.io gắn với container group. IP có thể thay đổi khi group khởi động lại nên bản ghi A trỏ IP không ổn định. Private endpoint không tạo tên public. Restart policy không giữ IP.'
    },
    {
      q: 'Phát biểu nào về container so với virtual machine là ĐÚNG? (Chọn 2)',
      options: ['Container dùng chung kernel với hệ điều hành host', 'Mỗi container chứa một hệ điều hành khách đầy đủ', 'Container thường khởi động trong vài giây', 'VM luôn khởi động nhanh hơn container'],
      answer: [0, 2],
      explain: 'Container ảo hóa ở mức hệ điều hành, dùng chung kernel host nên nhẹ và khởi động nhanh. VM mới là thứ có hệ điều hành khách đầy đủ và thường mất vài phút để khởi động.'
    },
    {
      q: 'Bạn cần truyền mật khẩu cơ sở dữ liệu vào container ACI sao cho giá trị không hiển thị trong portal hay output của az container show. Bạn dùng tham số nào?',
      options: ['--environment-variables', '--secure-environment-variables', '--command-line', '--labels'],
      answer: [1],
      explain: 'Secure environment variables được đưa vào container nhưng không hiển thị trong thuộc tính của container group. Biến môi trường thường hiển thị công khai. Command line và labels không phải cơ chế bảo mật secret.'
    },
    {
      q: 'Bạn có Azure Container Apps với ingress đã tắt và không có scale rule nào, min replicas để mặc định. Sau một thời gian app ngừng chạy và không tự khởi động lại. Nguyên nhân và cách khắc phục là gì?',
      options: ['Environment hết quota; tạo environment mới', 'Revision bị lỗi; chuyển sang revision mode Multiple', 'App scale về 0 vì min replicas mặc định là 0; đặt min replicas ≥ 1 hoặc thêm scale rule custom', 'Container Apps không hỗ trợ app không có ingress'],
      answer: [2],
      explain: 'Min replicas mặc định là 0; khi tắt ingress và không có scale rule nào khác, không có tín hiệu nào đánh thức app. Cần đặt min replicas từ 1 trở lên hoặc thêm rule custom (ví dụ theo hàng đợi). Các lựa chọn còn lại không phải nguyên nhân.'
    },
    {
      q: 'Công ty yêu cầu registry chỉ được truy cập qua IP private từ VNet, chặn mọi truy cập public. Registry hiện ở SKU Standard. Bạn cần làm gì? (Chọn 2)',
      options: ['Nâng registry lên Premium', 'Tạo private endpoint cho registry và tắt public network access', 'Bật admin user', 'Tạo webhook cho registry'],
      answer: [0, 1],
      explain: 'Private Link/private endpoint và các rule mạng chỉ có ở Premium, nên phải nâng SKU rồi tạo private endpoint và tắt truy cập public. Admin user và webhook không liên quan đến hạn chế mạng.'
    }
  ]
});

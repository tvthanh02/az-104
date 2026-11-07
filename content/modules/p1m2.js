AZ.addModule({
  id: 'p1m2',
  summary: 'ARM template là file JSON <em>khai báo</em> trạng thái mong muốn của hạ tầng; Azure Resource Manager đọc file và tự tạo, cập nhật tài nguyên theo đúng thứ tự. Đề AZ-104 hay cho sẵn một đoạn template rồi hỏi "cái gì sẽ được triển khai", hỏi về chế độ <strong>Incremental vs Complete</strong>, parameter file, Key Vault reference, what-if và Bicep.',
  objectives: [
    'Đọc hiểu cấu trúc ARM template: $schema, contentVersion, parameters, variables, functions, resources, outputs',
    'Sử dụng các hàm template quan trọng: resourceGroup(), resourceId(), concat(), uniqueString(), reference(), copyIndex()',
    'Khai báo parameter có ràng buộc, dùng parameter file và tham chiếu secret trong Key Vault',
    'Phân biệt chế độ triển khai Incremental và Complete, dự đoán kết quả triển khai',
    'Dùng what-if và export template để xem trước và tái sử dụng cấu hình',
    'Đọc và viết Bicep ở mức cơ bản, chuyển đổi qua lại giữa JSON và Bicep'
  ],
  sections: [
    {
      id: 'template-structure',
      unit: 'Explore Azure Resource Manager template structure',
      title: 'Cấu trúc ARM template',
      html: `
<p><strong>Azure Resource Manager (ARM)</strong> là lớp quản lý chung của Azure: mọi yêu cầu từ portal, CLI, PowerShell, REST hay SDK đều đi qua ARM. <strong>ARM template</strong> là file JSON mô tả tài nguyên cần có. Template mang tính <em>khai báo</em> (bạn nói "muốn có gì", không nói "làm thế nào") và <em>idempotent</em>: triển khai lại cùng một template nhiều lần cho cùng một kết quả.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 280" role="img" aria-label="Luồng triển khai ARM template: template và parameter file đi qua công cụ triển khai tới Resource Manager, rồi tạo tài nguyên trong resource group theo thứ tự dependsOn">
  <rect class="box" x="10" y="50" width="160" height="56" rx="10"/>
  <text x="90" y="74" text-anchor="middle" class="t-b">azuredeploy.json</text>
  <text x="90" y="93" text-anchor="middle" class="t-sm t-mute">template (khai báo)</text>
  <rect class="box-w" x="10" y="154" width="160" height="56" rx="10"/>
  <text x="90" y="178" text-anchor="middle" class="t-b">parameters.json</text>
  <text x="90" y="197" text-anchor="middle" class="t-sm t-mute">giá trị theo môi trường</text>

  <rect class="box" x="205" y="102" width="125" height="56" rx="10"/>
  <text x="267" y="126" text-anchor="middle" class="t-b">Công cụ</text>
  <text x="267" y="145" text-anchor="middle" class="t-sm t-mute">CLI · PS · Portal</text>

  <rect class="box-a" x="360" y="25" width="175" height="210" rx="12"/>
  <text x="447" y="52" text-anchor="middle" class="t-b t-a">Resource Manager</text>
  <text x="375" y="90" class="t-sm">① Kiểm tra hợp lệ</text>
  <text x="375" y="122" class="t-sm">② Tính biểu thức [ … ]</text>
  <text x="375" y="154" class="t-sm">③ Sắp xếp dependsOn</text>
  <text x="375" y="186" class="t-sm">④ Gọi resource provider</text>
  <text x="447" y="220" text-anchor="middle" class="t-sm t-mute">ghi deployment history</text>

  <rect class="zone" x="570" y="15" width="140" height="250" rx="10"/>
  <text x="640" y="36" text-anchor="middle" class="t-sm t-mute">Resource group</text>
  <rect class="box-s" x="585" y="50" width="110" height="42" rx="8"/>
  <text x="640" y="76" text-anchor="middle">VNet + subnet</text>
  <rect class="box-s" x="585" y="122" width="110" height="42" rx="8"/>
  <text x="640" y="148" text-anchor="middle">NIC</text>
  <rect class="box-s" x="585" y="194" width="110" height="42" rx="8"/>
  <text x="640" y="220" text-anchor="middle">VM</text>

  <line class="ln" x1="170" y1="78" x2="201" y2="118" marker-end="url(#arr)"/>
  <line class="ln" x1="170" y1="182" x2="201" y2="142" marker-end="url(#arr)"/>
  <line class="ln-a" x1="330" y1="130" x2="356" y2="130" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="535" y1="130" x2="566" y2="130" marker-end="url(#arr-a)"/>
  <line class="ln-s dash" x1="640" y1="92" x2="640" y2="118" marker-end="url(#arr-s)"/>
  <line class="ln-s dash" x1="640" y1="164" x2="640" y2="190" marker-end="url(#arr-s)"/>
</svg>
<figcaption>Hình 1. Template và parameter file được gửi qua một công cụ (CLI, PowerShell, portal, REST) tới Resource Manager. ARM kiểm tra, tính biểu thức, xếp thứ tự theo <code>dependsOn</code> rồi gọi các resource provider. Mũi tên nét đứt trong resource group là thứ tự tạo: NIC chờ VNet, VM chờ NIC; tài nguyên không phụ thuộc nhau được tạo song song.</figcaption>
</figure>

<h4>Các phần (section) của template</h4>
<table>
  <thead><tr><th>Phần</th><th>Bắt buộc?</th><th>Vai trò</th></tr></thead>
  <tbody>
    <tr><td><code>$schema</code></td><td>Có</td><td>URL schema, xác định phạm vi triển khai (resource group, subscription, management group, tenant)</td></tr>
    <tr><td><code>contentVersion</code></td><td>Có</td><td>Phiên bản template do bạn đặt, ví dụ <code>1.0.0.0</code></td></tr>
    <tr><td><code>parameters</code></td><td>Không</td><td>Giá trị nhập vào lúc triển khai (tên, SKU, vị trí…)</td></tr>
    <tr><td><code>variables</code></td><td>Không</td><td>Giá trị tính toán lại nhiều lần trong template</td></tr>
    <tr><td><code>functions</code></td><td>Không</td><td>Hàm do người dùng định nghĩa (user-defined function)</td></tr>
    <tr><td><code>resources</code></td><td>Có</td><td>Danh sách tài nguyên cần tạo hoặc cập nhật</td></tr>
    <tr><td><code>outputs</code></td><td>Không</td><td>Giá trị trả về sau khi triển khai (ví dụ endpoint, resource ID)</td></tr>
  </tbody>
</table>

<h4>Một resource trong template</h4>
<pre><code>{
  "type": "Microsoft.Storage/storageAccounts",
  "apiVersion": "2023-05-01",
  "name": "[variables('storageName')]",
  "location": "[resourceGroup().location]",
  "sku": { "name": "Standard_LRS" },
  "kind": "StorageV2",
  "tags": { "env": "dev" },
  "dependsOn": [],
  "properties": { "minimumTlsVersion": "TLS1_2" }
}</code></pre>
<ul>
  <li><code>type</code> = <em>resource provider namespace</em>/<em>resource type</em>. <code>apiVersion</code> quyết định các thuộc tính hợp lệ.</li>
  <li><code>condition</code> (tùy chọn): <code>true</code>/<code>false</code> quyết định có triển khai resource hay không.</li>
  <li><code>copy</code> (tùy chọn): tạo nhiều bản sao bằng vòng lặp, ví dụ <code>"copy": { "name": "stgLoop", "count": 3 }</code> kết hợp <code>copyIndex()</code>. Tối đa 800 vòng lặp.</li>
</ul>

<h4>Template expression và các hàm hay gặp</h4>
<p>Biểu thức nằm trong ngoặc vuông <code>"[ ... ]"</code> và được ARM tính lúc triển khai.</p>
<table>
  <thead><tr><th>Hàm</th><th>Kết quả</th></tr></thead>
  <tbody>
    <tr><td><code>resourceGroup().location</code></td><td>Region của resource group đích (cách lấy location phổ biến nhất)</td></tr>
    <tr><td><code>subscription().subscriptionId</code></td><td>ID subscription hiện tại</td></tr>
    <tr><td><code>parameters('x')</code> / <code>variables('y')</code></td><td>Đọc giá trị parameter/variable</td></tr>
    <tr><td><code>concat('stg', parameters('env'))</code></td><td>Nối chuỗi (hoặc nối mảng)</td></tr>
    <tr><td><code>uniqueString(resourceGroup().id)</code></td><td>Chuỗi băm <strong>13 ký tự</strong>, <strong>tất định</strong>: cùng đầu vào luôn cho cùng kết quả. Dùng để tạo tên duy nhất toàn cầu</td></tr>
    <tr><td><code>resourceId('Microsoft.Network/virtualNetworks', 'vnet1')</code></td><td>Resource ID đầy đủ của một tài nguyên</td></tr>
    <tr><td><code>reference(resourceId(...))</code></td><td>Đọc trạng thái runtime (ví dụ endpoint) của tài nguyên; tạo phụ thuộc ngầm</td></tr>
    <tr><td><code>toLower()</code>, <code>format()</code>, <code>take()</code></td><td>Xử lý chuỗi (tên storage account phải là chữ thường, 3–24 ký tự)</td></tr>
  </tbody>
</table>
<pre><code>"variables": {
  "storageName": "[toLower(concat('stg', uniqueString(resourceGroup().id)))]"
}</code></pre>

<h4>dependsOn: thứ tự triển khai</h4>
<p>ARM triển khai <strong>song song</strong> mọi tài nguyên không phụ thuộc nhau. Khi tài nguyên B cần A tồn tại trước (ví dụ NIC cần subnet, VM cần NIC), khai báo <code>"dependsOn": ["[resourceId('Microsoft.Network/networkInterfaces', 'nic1')]"]</code>. Không cần <code>dependsOn</code> cho tài nguyên đã tồn tại sẵn ngoài template. Dùng hàm <code>reference()</code> cũng tạo phụ thuộc ngầm.</p>

<h4>Phạm vi triển khai (deployment scope)</h4>
<table>
  <thead><tr><th>Phạm vi</th><th>Azure CLI</th><th>Azure PowerShell</th></tr></thead>
  <tbody>
    <tr><td>Resource group</td><td><code>az deployment group create</code></td><td><code>New-AzResourceGroupDeployment</code></td></tr>
    <tr><td>Subscription</td><td><code>az deployment sub create</code></td><td><code>New-AzSubscriptionDeployment</code> (alias <code>New-AzDeployment</code>)</td></tr>
    <tr><td>Management group</td><td><code>az deployment mg create</code></td><td><code>New-AzManagementGroupDeployment</code></td></tr>
    <tr><td>Tenant</td><td><code>az deployment tenant create</code></td><td><code>New-AzTenantDeployment</code></td></tr>
  </tbody>
</table>
<p>Ví dụ: tạo resource group hoặc gán Azure Policy cho cả subscription thì phải triển khai ở <strong>subscription scope</strong> (và chỉ định <code>--location</code> để lưu metadata của deployment).</p>

<h4>Giới hạn của một template</h4>
<table>
  <thead><tr><th>Thành phần</th><th>Giới hạn</th></tr></thead>
  <tbody>
    <tr><td>Parameters</td><td>256</td></tr>
    <tr><td>Variables</td><td>256</td></tr>
    <tr><td>Resources (tính cả số bản copy)</td><td>800</td></tr>
    <tr><td>Outputs</td><td>64</td></tr>
    <tr><td>Kích thước template / parameter file</td><td>4 MB mỗi file</td></tr>
  </tbody>
</table>
<div class="callout tip"><strong>Vượt giới hạn</strong>Tách thành <em>linked/nested template</em> (resource kiểu <code>Microsoft.Resources/deployments</code>) hoặc gom nhiều giá trị vào một parameter kiểu <code>object</code>.</div>
<div class="callout exam"><strong>Góc thi</strong>Câu hỏi "đảm bảo tên storage account là duy nhất nhưng vẫn ổn định giữa các lần triển khai lại" thì chọn <code>uniqueString(resourceGroup().id)</code>. Đừng chọn <code>newGuid()</code>: hàm này sinh giá trị mới mỗi lần và chỉ dùng được trong <code>defaultValue</code> của parameter.</div>
`
    },
    {
      id: 'create-deploy',
      unit: 'Exercise - Create and deploy an Azure Resource Manager template',
      title: 'Thực hành: tạo và triển khai template',
      html: `
<p>Bài lab trên Learn dùng Visual Studio Code (extension <em>Azure Resource Manager Tools</em> hoặc <em>Bicep</em>) để soạn template và Azure CLI/PowerShell để triển khai. Các bước tương đương:</p>
<ol class="steps">
  <li>Tạo file <code>azuredeploy.json</code>. Trong VS Code gõ snippet <code>arm!</code> để sinh khung template rỗng có đủ <code>$schema</code>, <code>contentVersion</code>, <code>parameters</code>, <code>resources</code>, <code>outputs</code>.</li>
  <li>Thêm một resource storage account vào mảng <code>resources</code> (snippet <code>arm-storage</code>).</li>
  <li>Đăng nhập và chọn subscription: <code>az login</code>, <code>az account set -s &lt;id&gt;</code> (hoặc mở Cloud Shell, upload file).</li>
  <li>Tạo resource group: <code>az group create -n rg-arm -l eastus</code>.</li>
  <li>Triển khai và đặt tên cho deployment:
<pre><code>az deployment group create \\
  --name lab1-$(date +%Y%m%d) \\
  --resource-group rg-arm \\
  --template-file azuredeploy.json

# PowerShell
New-AzResourceGroupDeployment -Name lab1 -ResourceGroupName rg-arm -TemplateFile ./azuredeploy.json</code></pre></li>
  <li>Kiểm tra: portal &gt; resource group &gt; <strong>Deployments</strong> (deployment history), hoặc <code>az deployment group list -g rg-arm -o table</code>.</li>
</ol>

<h4>Cách triển khai khác</h4>
<ul>
  <li><strong>Portal</strong>: <em>Deploy a custom template</em> &gt; <em>Build your own template in the editor</em>, hoặc nút <em>Deploy to Azure</em> trên GitHub (Azure Quickstart Templates).</li>
  <li><strong>Template từ URL</strong>: <code>--template-uri https://...</code> (file phải truy cập được qua HTTPS; nếu nằm trong storage riêng tư thì dùng SAS token).</li>
  <li><strong>Template spec</strong>: lưu template thành tài nguyên Azure (<code>Microsoft.Resources/templateSpecs</code>), có phiên bản và phân quyền RBAC, rồi triển khai bằng <code>--template-spec &lt;resourceId&gt;</code>.</li>
  <li><strong>CI/CD</strong>: GitHub Actions, Azure Pipelines.</li>
</ul>

<div class="lab">
  <div class="lab-head">🧪 Thực hành trên Azure portal: triển khai template tự viết bằng Deploy a custom template</div>
  <div class="lab-body"><ol class="lab-steps">
    <li>Tìm dịch vụ triển khai template tùy chỉnh:<br><span class="path">Azure portal › thanh tìm kiếm › gõ "deploy a custom template" › Deploy a custom template</span></li>
    <li>Trang <strong>Custom deployment</strong> mở ở tab <strong>Select a template</strong>. Mục <strong>Template source</strong> mặc định chọn <strong>Quickstart template</strong> (có thể chọn sẵn một template mẫu), nhưng lần này chọn liên kết <strong>Build your own template in the editor</strong>:
      <div class="blade">
        <div class="blade-title">Custom deployment</div>
        <div class="blade-tabs"><span class="on">Select a template</span><span>Basics</span><span>Review + create</span></div>
        <div class="pf"><label>Template source</label><span class="pv radio">Quickstart template</span></div>
        <div class="pf"><label></label><span class="pv note">Build your own template in the editor</span></div>
      </div>
    </li>
    <li>Trong <strong>Edit template</strong>, dán nội dung <code>azuredeploy.json</code> (hoặc bấm <strong>Load file</strong> để tải file từ máy), rồi bấm <strong>Save</strong>. Khung bên trái liệt kê số Parameters, Variables, Resources mà portal đọc được từ template (Hình 1).</li>
    <li>Portal tự sinh form từ phần <code>parameters</code> của template. Điền tab <strong>Basics</strong>:
      <div class="blade">
        <div class="blade-title">Custom deployment</div>
        <div class="blade-tabs"><span>Select a template</span><span class="on">Basics</span><span>Review + create</span></div>
        <div class="blade-sec">Project details</div>
        <div class="pf"><label class="req">Subscription</label><span class="pv sel">Azure subscription 1</span></div>
        <div class="pf"><label class="req">Resource group</label><span class="pv sel">rg-arm (Create new)</span></div>
        <div class="blade-sec">Instance details</div>
        <div class="pf"><label class="req">Region</label><span class="pv sel">East US</span></div>
        <div class="pf"><label class="req">Storage Prefix</label><span class="pv">lab</span></div>
        <div class="pf"><label>Storage SKU</label><span class="pv sel">Standard_LRS</span></div>
        <div class="pf"><label></label><span class="pv note">Tên trường lấy từ tên parameter; dropdown xuất hiện khi parameter có allowedValues</span></div>
        <div class="pbtns"><span class="pbtn primary">Review + create</span><span class="pbtn">Previous</span><span class="pbtn">Next</span></div>
      </div>
    </li>
    <li>Bấm <strong>Review + create</strong>. Portal chạy validation; khi qua thì bấm <strong>Create</strong>. Theo dõi trạng thái trên trang deployment, xong thì chọn <strong>Go to resource</strong> hoặc tên resource group.</li>
    <li>Xem lịch sử: mở resource group, chọn <strong>Deployments</strong> trong menu bên trái rồi chọn một deployment. Trang tóm tắt hiển thị trạng thái, <em>correlation ID</em> và liên kết <strong>Operation details</strong> (xem thông báo lỗi của từng bước); từ đây cũng có thể xem lại input, output, template đã dùng và triển khai lại.</li>
  </ol></div>
</div>

<figure class="fig"><img src="assets/img/p1m2/edit-template.png" alt="Màn hình Edit template trong Azure portal với template rỗng và các nút Add resource, Quickstart template, Load file, Download" loading="lazy"><figcaption>Hình 1. Màn hình <strong>Edit template</strong> của <em>Deploy a custom template</em>: dán hoặc <em>Load file</em> rồi bấm <em>Save</em>. Nguồn: <a href="https://learn.microsoft.com/azure/azure-resource-manager/templates/quickstart-create-templates-use-the-portal" target="_blank" rel="noopener">Microsoft Learn</a> (CC BY 4.0)</figcaption></figure>

<h4>Deployment history</h4>
<p>Mỗi lần triển khai tạo một bản ghi deployment trong resource group (tên mặc định là tên file template). Giới hạn <strong>800 deployment mỗi resource group</strong>; Azure <strong>tự động xóa</strong> bản ghi cũ khi gần chạm giới hạn. Xóa bản ghi không ảnh hưởng tài nguyên đã tạo. Triển khai trùng tên deployment sẽ ghi đè bản ghi cũ.</p>

<div class="callout warn"><strong>Lưu ý</strong>Triển khai thất bại giữa chừng <strong>không tự rollback</strong> những tài nguyên đã tạo thành công. Có thể dùng tùy chọn <em>rollback on error</em> (<code>--rollback-on-error</code> / <code>-RollbackToLastDeployment</code>) để triển khai lại deployment thành công gần nhất (chỉ cho deployment cấp resource group; deployment cũ được chạy lại ở <em>complete mode</em>).</div>
<div class="callout exam"><strong>Góc thi</strong>Lệnh triển khai vào resource group là <code>az deployment group create</code> (cũ: <code>az group deployment create</code> đã bị loại bỏ). PowerShell là <code>New-AzResourceGroupDeployment</code>, không phải <code>New-AzDeployment</code> (lệnh này dành cho subscription scope).</div>
`
    },
    {
      id: 'parameters-outputs',
      unit: 'Add flexibility to your Azure Resource Manager template by using parameters and outputs',
      title: 'Parameters, parameter file và outputs',
      html: `
<h4>Khai báo parameter</h4>
<pre><code>"parameters": {
  "storageSKU": {
    "type": "string",
    "defaultValue": "Standard_LRS",
    "allowedValues": [ "Standard_LRS", "Standard_GRS", "Standard_ZRS", "Premium_LRS" ],
    "metadata": { "description": "SKU của storage account" }
  },
  "storagePrefix": { "type": "string", "minLength": 3, "maxLength": 11 },
  "instanceCount": { "type": "int", "minValue": 1, "maxValue": 5, "defaultValue": 2 },
  "adminPassword": { "type": "securestring" }
}</code></pre>
<table>
  <thead><tr><th>Kiểu</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><code>string</code>, <code>int</code>, <code>bool</code></td><td>Kiểu cơ bản</td></tr>
    <tr><td><code>object</code>, <code>array</code></td><td>Gom nhiều giá trị (giúp tránh giới hạn 256 parameters)</td></tr>
    <tr><td><code>securestring</code>, <code>secureObject</code></td><td>Giá trị <strong>không được ghi</strong> vào deployment history và không hiển thị trong log. Bắt buộc dùng cho mật khẩu, key</td></tr>
  </tbody>
</table>
<p>Ràng buộc: <code>allowedValues</code>, <code>minValue</code>/<code>maxValue</code> (int), <code>minLength</code>/<code>maxLength</code> (string, array). Giá trị vi phạm sẽ bị chặn ngay ở bước validation, trước khi tạo tài nguyên.</p>

<h4>Parameter file</h4>
<pre><code>{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storagePrefix": { "value": "contoso" },
    "storageSKU":    { "value": "Standard_GRS" }
  }
}</code></pre>
<pre><code>az deployment group create -g rg1 --template-file azuredeploy.json \\
  --parameters @azuredeploy.parameters.dev.json storageSKU=Standard_ZRS

New-AzResourceGroupDeployment -ResourceGroupName rg1 -TemplateFile azuredeploy.json \\
  -TemplateParameterFile azuredeploy.parameters.dev.json</code></pre>
<p>Mỗi môi trường (dev/test/prod) có một parameter file riêng, cùng dùng một template. Với Azure CLI, giá trị inline đặt <strong>sau</strong> file sẽ ghi đè giá trị trong file. Bicep có định dạng riêng <code>.bicepparam</code> (dòng đầu <code>using './main.bicep'</code>).</p>

<h4>Tham chiếu secret trong Azure Key Vault</h4>
<p>Không đặt mật khẩu dạng chữ rõ trong parameter file. Thay vào đó tham chiếu secret:</p>
<pre><code>"adminPassword": {
  "reference": {
    "keyVault": { "id": "/subscriptions/&lt;sub-id&gt;/resourceGroups/rg-sec/providers/Microsoft.KeyVault/vaults/kv-contoso" },
    "secretName": "vmAdminPassword"
  }
}</code></pre>
<p>Điều kiện bắt buộc:</p>
<ul>
  <li>Parameter trong template phải có kiểu <code>securestring</code> (hoặc <code>secureObject</code>).</li>
  <li>Key Vault phải bật <strong>Azure Resource Manager for template deployment</strong> (<code>enabledForTemplateDeployment = true</code>): <code>az keyvault update -n kv-contoso --enabled-for-template-deployment true</code>.</li>
  <li>Người triển khai cần quyền <code>Microsoft.KeyVault/vaults/deploy/action</code> trên vault (có sẵn trong Owner và Contributor).</li>
  <li>Key Vault có thể nằm ở resource group hoặc subscription khác với resource group đích.</li>
  <li>Portal (Deploy a custom template) không hỗ trợ Key Vault reference; hãy triển khai bằng Azure CLI hoặc PowerShell.</li>
  <li>Tham chiếu chỉ đặt được trong <strong>parameter file</strong> (hoặc parameter của nested/linked template), không đặt trực tiếp trong <code>defaultValue</code> của template. Bicep dùng hàm <code>getSecret()</code> khi truyền vào module.</li>
</ul>

<h4>Outputs</h4>
<pre><code>"outputs": {
  "storageEndpoint": {
    "type": "object",
    "value": "[reference(variables('storageName')).primaryEndpoints]"
  },
  "storageId": {
    "type": "string",
    "value": "[resourceId('Microsoft.Storage/storageAccounts', variables('storageName'))]"
  }
}</code></pre>
<p>Đọc output sau khi triển khai: <code>az deployment group show -g rg1 -n lab1 --query properties.outputs</code>. Không xuất secret qua outputs vì giá trị output được lưu trong deployment history.</p>

<h4>Thực hành (Exercise - Add parameters and outputs)</h4>
<ol class="steps">
  <li>Thêm parameter <code>storagePrefix</code> (min 3, max 11) và <code>storageSKU</code> có <code>allowedValues</code>.</li>
  <li>Đổi <code>name</code> thành <code>"[concat(parameters('storagePrefix'), uniqueString(resourceGroup().id))]"</code> và <code>sku.name</code> thành <code>"[parameters('storageSKU')]"</code>.</li>
  <li>Thêm output <code>storageEndpoint</code> dùng <code>reference()</code>.</li>
  <li>Triển khai với <code>--parameters storageSKU=Standard_GRS storagePrefix=lab</code>; thử truyền <code>Basic</code> để thấy lỗi validation do không nằm trong <code>allowedValues</code>.</li>
</ol>
<div class="callout exam"><strong>Góc thi</strong>Kịch bản "mật khẩu admin VM không được lưu dạng plain text trong template hay parameter file" thì đáp án: lưu secret trong Key Vault, bật <em>enabled for template deployment</em> và tham chiếu trong parameter file. Kịch bản "triển khai thất bại do không lấy được secret" thường do chưa bật tùy chọn đó hoặc thiếu quyền <code>deploy/action</code>.</div>
`
    },
    {
      id: 'deployment-modes',
      extra: true,
      title: 'Chế độ triển khai: Incremental và Complete',
      html: `
<p>Chế độ triển khai quyết định ARM xử lý thế nào với tài nguyên <strong>đang có trong resource group nhưng không có trong template</strong>. Mặc định là <strong>Incremental</strong>.</p>
<div class="compare">
  <div><strong>Incremental (mặc định)</strong>Tài nguyên có trong template được tạo hoặc cập nhật. Tài nguyên ngoài template <strong>được giữ nguyên</strong>.</div>
  <div><strong>Complete</strong>Tài nguyên có trong template được tạo hoặc cập nhật. Tài nguyên trong resource group mà <strong>không có trong template sẽ bị xóa</strong>.</div>
</div>

<h4>Ví dụ kinh điển</h4>
<figure class="fig">
<svg class="dg" viewBox="0 0 720 290" role="img" aria-label="Resource group có A, B, C; template có A, B, D. Incremental cho kết quả A, B, C, D. Complete cho kết quả A, B, D và xóa C">
  <rect class="zone" x="10" y="20" width="210" height="95" rx="10"/>
  <text x="115" y="40" text-anchor="middle" class="t-sm t-mute">Resource group hiện có</text>
  <rect class="box" x="25" y="56" width="50" height="42" rx="8"/><text x="50" y="82" text-anchor="middle" class="t-b">A</text>
  <rect class="box" x="90" y="56" width="50" height="42" rx="8"/><text x="115" y="82" text-anchor="middle" class="t-b">B</text>
  <rect class="box" x="155" y="56" width="50" height="42" rx="8"/><text x="180" y="82" text-anchor="middle" class="t-b">C</text>

  <rect class="zone" x="10" y="150" width="210" height="95" rx="10"/>
  <text x="115" y="170" text-anchor="middle" class="t-sm t-mute">Template</text>
  <rect class="box" x="25" y="186" width="50" height="42" rx="8"/><text x="50" y="212" text-anchor="middle" class="t-b">A</text>
  <rect class="box" x="90" y="186" width="50" height="42" rx="8"/><text x="115" y="212" text-anchor="middle" class="t-b">B</text>
  <rect class="box" x="155" y="186" width="50" height="42" rx="8"/><text x="180" y="212" text-anchor="middle" class="t-b">D</text>

  <rect class="box-a" x="265" y="112" width="110" height="42" rx="10"/>
  <text x="320" y="138" text-anchor="middle" class="t-b t-a">ARM</text>
  <line class="ln" x1="220" y1="72" x2="262" y2="118" marker-end="url(#arr)"/>
  <line class="ln" x1="220" y1="198" x2="262" y2="150" marker-end="url(#arr)"/>

  <rect class="zone" x="430" y="20" width="280" height="95" rx="10"/>
  <text x="570" y="40" text-anchor="middle" class="t-sm t-b">Incremental (mặc định)</text>
  <rect class="box" x="450" y="56" width="50" height="42" rx="8"/><text x="475" y="82" text-anchor="middle" class="t-b">A</text>
  <rect class="box" x="515" y="56" width="50" height="42" rx="8"/><text x="540" y="82" text-anchor="middle" class="t-b">B</text>
  <rect class="box-w" x="580" y="56" width="50" height="42" rx="8"/><text x="605" y="82" text-anchor="middle" class="t-b">C</text>
  <rect class="box-s" x="645" y="56" width="50" height="42" rx="8"/><text x="670" y="82" text-anchor="middle" class="t-b">D</text>

  <rect class="zone" x="430" y="150" width="280" height="95" rx="10"/>
  <text x="570" y="170" text-anchor="middle" class="t-sm t-b">Complete</text>
  <rect class="box" x="450" y="186" width="50" height="42" rx="8"/><text x="475" y="212" text-anchor="middle" class="t-b">A</text>
  <rect class="box" x="515" y="186" width="50" height="42" rx="8"/><text x="540" y="212" text-anchor="middle" class="t-b">B</text>
  <rect class="box-s" x="580" y="186" width="50" height="42" rx="8"/><text x="605" y="212" text-anchor="middle" class="t-b">D</text>
  <rect class="box-x" x="645" y="186" width="50" height="42" rx="8"/><text x="670" y="212" text-anchor="middle" class="t-b t-x">C</text>
  <line class="ln-x" x1="650" y1="191" x2="690" y2="223"/>
  <line class="ln-x" x1="690" y1="191" x2="650" y2="223"/>

  <line class="ln-a" x1="375" y1="124" x2="426" y2="80" marker-end="url(#arr-a)"/>
  <line class="ln-a" x1="375" y1="142" x2="426" y2="186" marker-end="url(#arr-a)"/>

  <rect class="box" x="60" y="263" width="14" height="14" rx="3"/><text x="82" y="275" class="t-sm">cập nhật theo template</text>
  <rect class="box-s" x="260" y="263" width="14" height="14" rx="3"/><text x="282" y="275" class="t-sm">tạo mới</text>
  <rect class="box-w" x="390" y="263" width="14" height="14" rx="3"/><text x="412" y="275" class="t-sm">giữ nguyên, không đụng tới</text>
  <rect class="box-x" x="600" y="263" width="14" height="14" rx="3"/><text x="622" y="275" class="t-sm">bị xóa</text>
</svg>
<figcaption>Hình 1. Cùng một resource group (A, B, C) và cùng một template (A, B, D). Incremental giữ C và tạo D. Complete tạo D và <strong>xóa C</strong> vì C không có trong template. A và B ở cả hai chế độ đều được áp lại đúng cấu hình trong template.</figcaption>
</figure>

<h4>Những chi tiết hay bị hỏi</h4>
<ul>
  <li><strong>Incremental vẫn ghi đè thuộc tính</strong>: khi triển khai lại một tài nguyên đã có, mọi thuộc tính được áp lại; thuộc tính bạn không khai báo sẽ trở về giá trị mặc định. Template phải mô tả <em>trạng thái cuối cùng đầy đủ</em>, không phải "phần thay đổi". Ví dụ điển hình: khai báo VNet mà thiếu mảng <code>subnets</code> có thể làm mất subnet.</li>
  <li>Không đổi được <code>location</code> hay <code>type</code> của tài nguyên đã tồn tại bằng cách triển khai lại: deployment báo lỗi.</li>
  <li>Complete mode + resource có <code>condition</code> = <code>false</code>: với API version 2019-05-10 trở lên (CLI/PowerShell hiện tại), tài nguyên đó <strong>bị xóa</strong>.</li>
  <li>Complete mode + vòng lặp <code>copy</code>: tài nguyên không còn nằm trong kết quả vòng lặp sẽ bị xóa.</li>
  <li>Template triển khai vào nhiều resource group: chỉ resource group <strong>đích của lệnh triển khai</strong> bị xóa tài nguyên thừa; resource group phụ không bị ảnh hưởng.</li>
  <li>Resource group có <strong>resource lock</strong>: Complete mode không xóa được tài nguyên.</li>
  <li>Xóa tài nguyên cha thì tài nguyên con bị xóa theo; nhưng một số tài nguyên con (ví dụ bản ghi CNAME trong DNS zone) không tự xóa nếu cha vẫn còn trong template.</li>
</ul>

<h4>Phạm vi hỗ trợ</h4>
<ul>
  <li>Complete mode chỉ dùng cho <strong>resource group deployment</strong> ở template gốc. Linked/nested template phải dùng Incremental.</li>
  <li><strong>Subscription-level deployment không hỗ trợ</strong> Complete mode.</li>
  <li>Portal hiện không hỗ trợ Complete mode: phải dùng CLI, PowerShell hoặc REST.</li>
</ul>
<pre><code>az deployment group create --mode Complete -g rg1 --template-file main.json --confirm-with-what-if
New-AzResourceGroupDeployment -Mode Complete -ResourceGroupName rg1 -TemplateFile main.json -Confirm</code></pre>

<div class="callout warn"><strong>Xu hướng hiện tại</strong>Microsoft khuyến nghị dùng Incremental, và khi cần xóa tài nguyên qua IaC thì dùng <strong>deployment stacks</strong>; Complete mode sẽ dần bị deprecate. Tuy vậy đề AZ-104 vẫn thường hỏi Complete mode, nên phải nắm chắc kết quả của nó.</div>
<div class="callout exam"><strong>Góc thi</strong>Đề cho: RG1 có VNET1, VM1, Storage1; template chỉ chứa Storage1 và thêm Storage2, triển khai Complete. Kết quả: RG1 chỉ còn Storage1 và Storage2. Nếu không ghi mode thì hiểu là Incremental: RG1 có cả bốn tài nguyên. Luôn chạy what-if trước khi dùng Complete.</div>
`
    },
    {
      id: 'bicep',
      extra: true,
      title: 'Bicep: ngôn ngữ thay thế JSON',
      html: `
<p><strong>Bicep</strong> là ngôn ngữ khai báo (DSL) do Microsoft phát triển, cú pháp gọn hơn JSON. File <code>.bicep</code> được <strong>transpile</strong> (biên dịch) sang ARM template JSON trước khi gửi tới Resource Manager, nên mọi resource type và API version mà ARM hỗ trợ đều dùng được ngay trong Bicep. Bicep <strong>không lưu state</strong> (khác Terraform): trạng thái thật luôn nằm trong Azure.</p>

<figure class="fig">
<svg class="dg" viewBox="0 0 720 170" role="img" aria-label="Bicep được build thành ARM JSON rồi gửi tới Resource Manager; decompile chuyển JSON ngược về Bicep">
  <rect class="box-e" x="20" y="40" width="150" height="66" rx="10"/>
  <text x="95" y="68" text-anchor="middle" class="t-b">main.bicep</text>
  <text x="95" y="88" text-anchor="middle" class="t-sm t-mute">bạn viết</text>
  <rect class="box" x="285" y="40" width="150" height="66" rx="10"/>
  <text x="360" y="68" text-anchor="middle" class="t-b">main.json</text>
  <text x="360" y="88" text-anchor="middle" class="t-sm t-mute">ARM template</text>
  <rect class="box-a" x="550" y="40" width="150" height="66" rx="10"/>
  <text x="625" y="68" text-anchor="middle" class="t-b t-a">Resource Manager</text>
  <text x="625" y="88" text-anchor="middle" class="t-sm t-mute">chỉ hiểu JSON</text>

  <line class="ln-a" x1="170" y1="58" x2="281" y2="58" marker-end="url(#arr-a)"/>
  <text x="227" y="48" text-anchor="middle" class="t-sm t-a">az bicep build</text>
  <line class="ln dash" x1="285" y1="90" x2="174" y2="90" marker-end="url(#arr)"/>
  <text x="227" y="108" text-anchor="middle" class="t-sm t-mute">decompile</text>
  <line class="ln-a" x1="435" y1="73" x2="546" y2="73" marker-end="url(#arr-a)"/>
  <text x="490" y="63" text-anchor="middle" class="t-sm t-a">gửi lên</text>

  <text x="360" y="150" text-anchor="middle" class="t-sm t-mute">az deployment group create --template-file main.bicep: CLI tự build ngầm rồi gửi JSON</text>
</svg>
<figcaption>Hình 1. Resource Manager chỉ nhận ARM JSON. Bicep là lớp viết gọn phía trên: <code>az bicep build</code> sinh JSON, <code>az bicep decompile</code> đi chiều ngược lại (best effort). Khi triển khai trực tiếp file <code>.bicep</code>, bước build diễn ra tự động.</figcaption>
</figure>

<h4>Ví dụ Bicep tương đương template storage</h4>
<pre><code>@minLength(3)
@maxLength(11)
param storagePrefix string

@allowed([ 'Standard_LRS', 'Standard_GRS' ])
param storageSKU string = 'Standard_LRS'

param location string = resourceGroup().location

var storageName = toLower('$&#123;storagePrefix&#125;$&#123;uniqueString(resourceGroup().id)&#125;')

resource stg 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: storageSKU }
  kind: 'StorageV2'
}

output endpoint string = stg.properties.primaryEndpoints.blob</code></pre>
<ul>
  <li><code>param</code>, <code>var</code>, <code>resource</code>, <code>output</code>, <code>module</code> là các từ khóa chính. Ràng buộc parameter viết bằng decorator: <code>@allowed</code>, <code>@minLength</code>, <code>@secure()</code>, <code>@description</code>.</li>
  <li>Nội suy chuỗi dùng cú pháp <code>'$&#123;biến&#125;'</code> thay cho <code>concat()</code>.</li>
  <li><strong>Symbolic name</strong> (<code>stg</code>) cho phép truy cập thuộc tính trực tiếp (<code>stg.id</code>, <code>stg.properties...</code>) và Bicep <strong>tự suy ra dependsOn</strong>.</li>
  <li><code>existing</code> tham chiếu tài nguyên có sẵn: <code>resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = { name: 'kv1' }</code>.</li>
  <li><code>module</code> chia nhỏ file và có thể đặt <code>scope</code> sang resource group khác. <code>targetScope = 'subscription'</code> đổi phạm vi triển khai.</li>
  <li>Vòng lặp: <code>[for i in range(0, 3): {...}]</code>; điều kiện: <code>resource x '...' = if (deployIt) {...}</code>.</li>
</ul>

<h4>Lệnh làm việc với Bicep</h4>
<table>
  <thead><tr><th>Mục đích</th><th>Lệnh</th></tr></thead>
  <tbody>
    <tr><td>Triển khai trực tiếp file Bicep</td><td><code>az deployment group create -g rg1 --template-file main.bicep</code> (PowerShell: <code>New-AzResourceGroupDeployment -TemplateFile main.bicep</code>, cần cài Bicep CLI)</td></tr>
    <tr><td>Bicep → JSON</td><td><code>az bicep build --file main.bicep</code> (sinh <code>main.json</code>)</td></tr>
    <tr><td>JSON → Bicep</td><td><code>az bicep decompile --file main.json</code> (chuyển đổi "best effort", có thể cần sửa tay)</td></tr>
    <tr><td>Cài / cập nhật</td><td><code>az bicep install</code>, <code>az bicep upgrade</code></td></tr>
  </tbody>
</table>

<h4>So sánh ARM JSON và Bicep</h4>
<table>
  <thead><tr><th>Tiêu chí</th><th>ARM JSON</th><th>Bicep</th></tr></thead>
  <tbody>
    <tr><td>Cú pháp</td><td>Dài, nhiều dấu ngoặc, biểu thức trong <code>"[ ]"</code></td><td>Ngắn gọn, giống ngôn ngữ lập trình</td></tr>
    <tr><td>dependsOn</td><td>Phải khai báo thủ công phần lớn</td><td>Tự suy ra qua symbolic name</td></tr>
    <tr><td>Module hóa</td><td>Linked/nested template (cần URL truy cập được)</td><td><code>module</code> trỏ tới file cục bộ hoặc registry</td></tr>
    <tr><td>Hỗ trợ resource mới</td><td>Ngay lập tức</td><td>Ngay lập tức (cùng nền tảng ARM)</td></tr>
    <tr><td>State file</td><td>Không</td><td>Không</td></tr>
    <tr><td>Chi phí</td><td>Miễn phí</td><td>Miễn phí, mã nguồn mở</td></tr>
  </tbody>
</table>
<div class="callout exam"><strong>Góc thi</strong>"Chuyển template JSON có sẵn sang Bicep" dùng <code>az bicep decompile</code>; "xem JSON được sinh từ file Bicep" dùng <code>az bicep build</code>. Đề có thể đưa một đoạn Bicep và hỏi giá trị của biến, tên tài nguyên được tạo, hoặc tài nguyên nào triển khai trước.</div>
`
    },
    {
      id: 'export-whatif',
      extra: true,
      title: 'Export template và what-if',
      html: `
<h4>Export template</h4>
<p>Có hai cách lấy template từ tài nguyên đang chạy:</p>
<table>
  <thead><tr><th>Tiêu chí</th><th>Export từ resource group / resource</th><th>Lấy từ deployment history</th></tr></thead>
  <tbody>
    <tr><td>Nội dung</td><td>Ảnh chụp (snapshot) <strong>trạng thái hiện tại</strong>, kể cả thay đổi làm tay sau khi triển khai</td><td>Bản sao <strong>chính xác</strong> của template đã dùng; không có thay đổi làm tay sau đó</td></tr>
    <tr><td>Parameter</td><td>Ít parameter, giá trị phần lớn hard-code</td><td>Giữ nguyên parameter, dễ tái sử dụng</td></tr>
    <tr><td>Chọn tài nguyên</td><td>Chọn được một phần hoặc toàn bộ</td><td>Phải lấy toàn bộ tài nguyên của deployment đó</td></tr>
    <tr><td>Định dạng</td><td>ARM JSON hoặc Bicep</td><td>Chỉ ARM JSON (có thể decompile sang Bicep)</td></tr>
    <tr><td>Khi nào dùng</td><td>Tài nguyên tạo bằng portal, cần ghi lại cấu hình hiện tại</td><td>Muốn template sạch để triển khai lại sang môi trường khác</td></tr>
  </tbody>
</table>
<pre><code>az group export --name rg1 &gt; rg1.json
az deployment group export --resource-group rg1 --name lab1   # từ history
Export-AzResourceGroup -ResourceGroupName rg1 -Path ./rg1.json
Save-AzResourceGroupDeploymentTemplate -ResourceGroupName rg1 -DeploymentName lab1</code></pre>
<p>Giới hạn của export:</p>
<ul>
  <li>Không export được resource group có <strong>hơn 200 tài nguyên</strong>.</li>
  <li>Một số loại tài nguyên không export được (ví dụ Azure Data Factory); một số tham số mật khẩu bị bỏ trống và phải thêm tay.</li>
  <li>Template export thường <strong>cần chỉnh sửa</strong> trước khi triển khai lại; không đảm bảo triển khai được ngay.</li>
</ul>

<h4>What-if: xem trước thay đổi</h4>
<p>What-if dự đoán thay đổi mà <strong>không</strong> sửa tài nguyên nào. Hỗ trợ cả bốn scope và cần cùng quyền như khi triển khai thật.</p>
<pre><code>az deployment group what-if -g rg1 --template-file main.bicep
az deployment group create  -g rg1 --template-file main.bicep --confirm-with-what-if   # hoặc -c

New-AzResourceGroupDeployment -ResourceGroupName rg1 -TemplateFile main.bicep -WhatIf
New-AzResourceGroupDeployment -ResourceGroupName rg1 -TemplateFile main.bicep -Confirm</code></pre>
<table>
  <thead><tr><th>Change type</th><th>Ý nghĩa</th></tr></thead>
  <tbody>
    <tr><td><strong>Create</strong> (+)</td><td>Tài nguyên chưa có, sẽ được tạo</td></tr>
    <tr><td><strong>Delete</strong> (-)</td><td>Chỉ xuất hiện với <strong>Complete mode</strong>: tài nguyên có trong RG nhưng không có trong template</td></tr>
    <tr><td><strong>Modify</strong> (~)</td><td>Tài nguyên có sẵn và thuộc tính sẽ thay đổi</td></tr>
    <tr><td><strong>NoChange</strong></td><td>Triển khai lại nhưng không đổi thuộc tính</td></tr>
    <tr><td><strong>Ignore</strong></td><td>Tài nguyên có trong RG nhưng không có trong template (Incremental), sẽ không bị đụng tới</td></tr>
    <tr><td><strong>NoEffect</strong></td><td>Thuộc tính chỉ đọc, dịch vụ bỏ qua</td></tr>
    <tr><td><strong>Deploy</strong> (!)</td><td>Sẽ triển khai lại nhưng không đủ thông tin để biết có đổi gì (khi dùng <code>ResourceIdOnly</code>)</td></tr>
  </tbody>
</table>
<div class="callout note"><strong>Hạn chế</strong>What-if không phân giải được hàm <code>reference()</code>, nên thuộc tính dùng <code>reference()</code> luôn được báo là "sẽ thay đổi" (nhiễu). What-if mở rộng tối đa 500 nested template; vượt giới hạn thì phần còn lại được đánh dấu Ignore.</div>
<div class="callout exam"><strong>Góc thi</strong>"Kiểm tra trước những tài nguyên nào sẽ bị xóa khi triển khai Complete mode, không thay đổi gì" thì dùng <strong>what-if</strong>. Không nhầm với <code>az deployment group validate</code>: validate chỉ kiểm tra template hợp lệ cú pháp và có triển khai được hay không, không liệt kê thay đổi.</div>
`
    }
  ],
  keyFacts: [
    'Template có 2 phần bắt buộc ngoài <code>$schema</code>: <strong>contentVersion</strong> và <strong>resources</strong>. Các phần tùy chọn: parameters, variables, functions, outputs.',
    'Chế độ triển khai mặc định là <strong>Incremental</strong>. <strong>Complete</strong> xóa tài nguyên trong resource group không có trong template.',
    'Complete mode chỉ áp dụng ở <strong>resource group scope</strong>, template gốc; không hỗ trợ ở subscription scope và trong portal.',
    'Giới hạn template: <strong>256</strong> parameters, <strong>256</strong> variables, <strong>800</strong> resources, <strong>64</strong> outputs, file <strong>4 MB</strong>.',
    'Deployment history: tối đa <strong>800</strong> deployment mỗi resource group, tự động xóa bản ghi cũ.',
    '<code>uniqueString()</code> trả về chuỗi <strong>13 ký tự</strong>, tất định theo đầu vào (thường là <code>resourceGroup().id</code>).',
    'Key Vault reference: secret khai báo trong <strong>parameter file</strong>, parameter kiểu <code>securestring</code>, vault bật <strong>enabledForTemplateDeployment</strong>, người triển khai có <code>Microsoft.KeyVault/vaults/deploy/action</code>.',
    'What-if: <code>az deployment group what-if</code>, <code>--confirm-with-what-if</code> (<code>-c</code>), PowerShell <code>-WhatIf</code> / <code>-Confirm</code>. Change type <strong>Delete</strong> chỉ có ở Complete mode.',
    'Export từ resource group: tối đa <strong>200</strong> tài nguyên; export từ deployment history cho bản sao chính xác của template đã dùng.',
    'Bicep: <code>az bicep build</code> (Bicep → JSON), <code>az bicep decompile</code> (JSON → Bicep); không có state file; tự suy ra dependsOn.'
  ],
  traps: [
    'Nghĩ rằng Incremental chỉ thêm thuộc tính mới. Sai: thuộc tính không khai báo trong template sẽ bị <strong>đặt lại về mặc định</strong> khi triển khai lại tài nguyên.',
    'Quên rằng Complete mode cũng xóa tài nguyên có <code>condition</code> bằng <code>false</code> (API 2019-05-10 trở lên).',
    'Dùng <code>New-AzDeployment</code> để triển khai vào resource group. Lệnh đúng là <code>New-AzResourceGroupDeployment</code>; <code>New-AzDeployment</code> là subscription scope.',
    'Đặt tham chiếu Key Vault trực tiếp trong template thay vì trong <strong>parameter file</strong>, hoặc quên bật <em>enabled for template deployment</em> trên vault.',
    'Nhầm <code>validate</code> với <code>what-if</code>: chỉ what-if liệt kê tài nguyên sẽ được tạo, sửa, xóa.',
    'Cho rằng template export từ resource group luôn triển khai lại được ngay. Thực tế thường thiếu parameter, có thuộc tính thừa và có loại tài nguyên không export được.',
    'Dùng <code>newGuid()</code> hoặc giá trị ngẫu nhiên để đặt tên tài nguyên: mỗi lần triển khai lại sẽ tạo tài nguyên mới. Dùng <code>uniqueString()</code> để tên ổn định.'
  ],
  cheatsheet: `
<table>
  <thead><tr><th>Cần nhớ</th><th>Giá trị</th></tr></thead>
  <tbody>
    <tr><td>Phần bắt buộc</td><td><code>$schema</code>, <code>contentVersion</code>, <code>resources</code></td></tr>
    <tr><td>Mode mặc định</td><td>Incremental (Complete = xóa tài nguyên ngoài template, chỉ RG scope)</td></tr>
    <tr><td>Giới hạn</td><td>256 params · 256 vars · 800 resources · 64 outputs · 4 MB</td></tr>
    <tr><td>Deploy RG</td><td><code>az deployment group create</code> / <code>New-AzResourceGroupDeployment</code></td></tr>
    <tr><td>Deploy subscription</td><td><code>az deployment sub create</code> / <code>New-AzSubscriptionDeployment</code></td></tr>
    <tr><td>Xem trước</td><td><code>what-if</code>, <code>-c</code>, <code>-WhatIf</code>, <code>-Confirm</code></td></tr>
    <tr><td>Tên duy nhất</td><td><code>uniqueString(resourceGroup().id)</code> (13 ký tự)</td></tr>
    <tr><td>Secret</td><td>Key Vault reference trong parameter file + <code>securestring</code></td></tr>
    <tr><td>Export</td><td>RG/resource (snapshot, ≤ 200 tài nguyên) hoặc deployment history (bản gốc)</td></tr>
    <tr><td>Bicep</td><td><code>az bicep build</code> · <code>az bicep decompile</code></td></tr>
  </tbody>
</table>`,
  flashcards: [
    { front: 'Ba phần bắt buộc của ARM template?', back: '<code>$schema</code>, <code>contentVersion</code>, <code>resources</code>.' },
    { front: 'Chế độ triển khai mặc định?', back: '<strong>Incremental</strong>: giữ nguyên tài nguyên không có trong template.' },
    { front: 'Complete mode làm gì?', back: '<strong>Xóa</strong> tài nguyên trong resource group đích mà không có trong template, rồi tạo/cập nhật tài nguyên trong template.' },
    { front: 'Complete mode có dùng được ở subscription scope không?', back: '<strong>Không</strong>. Chỉ resource group deployment (template gốc). Portal cũng không hỗ trợ.' },
    { front: 'Kết quả của uniqueString(resourceGroup().id)?', back: 'Chuỗi băm <strong>13 ký tự</strong>, luôn giống nhau cho cùng resource group.' },
    { front: 'Hàm nào trả về resource ID đầy đủ?', back: '<code>resourceId(\'Microsoft.Network/virtualNetworks\', \'vnet1\')</code>' },
    { front: 'Giới hạn số resource trong một template?', back: '<strong>800</strong> (tính cả số bản copy). Parameters 256, variables 256, outputs 64.' },
    { front: 'Kiểu parameter dành cho mật khẩu?', back: '<code>securestring</code> (hoặc <code>secureObject</code>). Giá trị không ghi vào deployment history.' },
    { front: 'Điều kiện để tham chiếu secret Key Vault khi triển khai?', back: 'Vault bật <strong>enabledForTemplateDeployment</strong>; người triển khai có quyền <code>Microsoft.KeyVault/vaults/deploy/action</code>; tham chiếu đặt trong parameter file; parameter kiểu securestring.' },
    { front: 'Lệnh CLI xem trước thay đổi của deployment?', back: '<code>az deployment group what-if</code>, hoặc <code>az deployment group create --confirm-with-what-if</code> (<code>-c</code>).' },
    { front: 'What-if change type "Delete" xuất hiện khi nào?', back: 'Chỉ khi triển khai ở <strong>Complete mode</strong>.' },
    { front: 'Chuyển template JSON sang Bicep?', back: '<code>az bicep decompile --file main.json</code>' },
    { front: 'Sinh JSON từ file Bicep?', back: '<code>az bicep build --file main.bicep</code>' },
    { front: 'Export từ deployment history khác export từ resource group thế nào?', back: 'History: bản sao chính xác template gốc, có parameter, không có thay đổi làm tay. RG: snapshot trạng thái hiện tại, hard-code nhiều, tối đa 200 tài nguyên.' },
    { front: 'Deployment history giữ tối đa bao nhiêu bản ghi mỗi resource group?', back: '<strong>800</strong>; Azure tự xóa bản ghi cũ khi gần chạm giới hạn.' },
    { front: 'Bicep có state file như Terraform không?', back: '<strong>Không</strong>. Bicep transpile sang ARM JSON; trạng thái nằm trong Azure.' }
  ],
  quiz: [
    {
      q: 'Resource group RG1 chứa VNET1, VM1 và STG1. Bạn triển khai một template chỉ định nghĩa STG1 và STG2 bằng lệnh <code>az deployment group create -g RG1 --template-file t.json</code> (không có tham số khác). Sau khi triển khai, RG1 chứa gì?',
      options: ['Chỉ STG1 và STG2', 'VNET1, VM1, STG1 và STG2', 'VNET1, VM1 và STG1', 'Chỉ STG2'],
      answer: [1],
      explain: 'Không chỉ định <code>--mode</code> thì dùng Incremental: tài nguyên ngoài template được giữ nguyên và STG2 được tạo thêm. Kết quả "chỉ STG1 và STG2" là của Complete mode. Các phương án còn lại bỏ sót tài nguyên mới hoặc xóa nhầm tài nguyên.'
    },
    {
      q: 'Cùng tình huống trên nhưng bạn thêm <code>--mode Complete</code>. Kết quả là gì?',
      options: ['VNET1, VM1, STG1 và STG2', 'Deployment lỗi vì Complete mode không xóa VM', 'Chỉ STG1 và STG2', 'VNET1 và VM1 bị dừng (deallocate) nhưng không bị xóa'],
      answer: [2],
      explain: 'Complete mode xóa mọi tài nguyên trong resource group đích không có trong template, nên VNET1 và VM1 bị xóa. Complete mode không có ngoại lệ cho VM và không có khái niệm "dừng" tài nguyên. Chỉ resource lock mới chặn được việc xóa.'
    },
    {
      q: 'Bạn cần tạo tên storage account duy nhất toàn cầu, nhưng tên phải giữ nguyên khi triển khai lại template vào cùng resource group. Biểu thức nào phù hợp nhất?',
      options: ['<code>[concat(\'stg\', newGuid())]</code>', '<code>[concat(\'stg\', utcNow())]</code>', '<code>[concat(\'stg\', resourceGroup().name)]</code>', '<code>[concat(\'stg\', uniqueString(resourceGroup().id))]</code>'],
      answer: [3],
      explain: '<code>uniqueString()</code> sinh chuỗi 13 ký tự tất định từ resource group ID: duy nhất theo RG và ổn định giữa các lần triển khai. <code>newGuid()</code> và <code>utcNow()</code> đổi mỗi lần nên tạo tài nguyên mới (và chỉ dùng được trong defaultValue của parameter). Tên resource group không đảm bảo duy nhất toàn cầu và có thể chứa ký tự không hợp lệ.'
    },
    {
      q: 'Template triển khai VM cần mật khẩu admin. Yêu cầu bảo mật: mật khẩu không xuất hiện dạng chữ rõ trong template, parameter file hay deployment history. Bạn cần làm gì? (Chọn 2)',
      options: ['Khai báo parameter adminPassword kiểu <code>securestring</code>', 'Đặt mật khẩu trong phần <code>variables</code>', 'Lưu mật khẩu làm secret trong Key Vault và tham chiếu secret trong parameter file', 'Xuất mật khẩu trong <code>outputs</code> để kiểm tra'],
      answer: [0, 2],
      explain: 'Parameter kiểu securestring không được ghi vào deployment history, và Key Vault reference trong parameter file giúp không phải ghi mật khẩu dạng chữ rõ. Đặt trong variables thì mật khẩu nằm ngay trong template. Outputs được lưu trong deployment history nên làm lộ mật khẩu.'
    },
    {
      q: 'Triển khai template có tham chiếu secret Key Vault thất bại với lỗi không truy cập được vault, dù bạn là Owner của subscription. Nguyên nhân khả dĩ nhất là gì?',
      options: ['Vault chưa bật tùy chọn cho phép Azure Resource Manager dùng cho template deployment', 'Key Vault phải nằm cùng resource group với tài nguyên được triển khai', 'Secret phải được đặt ở dạng plain text trong parameter file', 'Phải dùng Complete mode khi tham chiếu Key Vault'],
      answer: [0],
      explain: 'Owner đã có quyền <code>Microsoft.KeyVault/vaults/deploy/action</code>, nên nguyên nhân thường gặp là vault chưa bật <code>enabledForTemplateDeployment</code>. Key Vault có thể ở resource group hoặc subscription khác. Đặt plain text phá vỡ mục đích, còn deployment mode không liên quan.'
    },
    {
      q: 'Trước khi triển khai một template ở Complete mode vào RG-Prod, bạn cần biết chính xác tài nguyên nào sẽ bị xóa mà không làm thay đổi gì. Bạn dùng lệnh nào?',
      options: ['<code>az deployment group validate</code>', '<code>az group export</code>', '<code>az deployment group what-if --mode Complete</code>', '<code>az deployment group list</code>'],
      answer: [2],
      explain: 'What-if dự đoán thay đổi (Create, Delete, Modify…) mà không sửa tài nguyên; change type Delete chỉ xuất hiện với Complete mode. Validate chỉ kiểm tra template có hợp lệ không. Export tạo template từ tài nguyên hiện có, còn list chỉ liệt kê deployment history.'
    },
    {
      q: 'Bạn muốn triển khai một template tạo resource group mới và gán Azure Policy ở cấp subscription. Lệnh PowerShell nào phù hợp?',
      options: ['<code>New-AzResourceGroupDeployment</code>', '<code>New-AzSubscriptionDeployment</code>', '<code>New-AzManagementGroupDeployment</code>', '<code>New-AzTenantDeployment</code>'],
      answer: [1],
      explain: 'Tạo resource group và gán policy cho subscription cần subscription scope: <code>New-AzSubscriptionDeployment</code> (alias <code>New-AzDeployment</code>). Lệnh resource group deployment cần một RG đã tồn tại. Management group và tenant scope dành cho phạm vi rộng hơn.'
    },
    {
      q: 'Một đồng nghiệp tạo nhiều tài nguyên bằng portal và chỉnh sửa tay sau đó. Bạn cần một template phản ánh <strong>cấu hình hiện tại</strong> của chỉ hai tài nguyên trong resource group đó. Bạn làm gì?',
      options: ['Lấy template từ deployment history của resource group', 'Chạy <code>az bicep decompile</code> trên resource group', 'Dùng what-if', 'Chọn hai tài nguyên trong resource group rồi chọn Export template'],
      answer: [3],
      explain: 'Export từ resource group/resource tạo snapshot trạng thái hiện tại và cho chọn một phần tài nguyên. Template trong deployment history chỉ phản ánh lúc triển khai, không có thay đổi làm tay, và phải lấy toàn bộ tài nguyên. Decompile chỉ chuyển file JSON sang Bicep; what-if không sinh template.'
    },
    {
      q: 'Bạn có file <code>main.json</code> và muốn chuyển sang Bicep để dễ bảo trì. Lệnh nào đúng?',
      options: ['<code>az bicep build --file main.json</code>', '<code>az bicep decompile --file main.json</code>', '<code>az deployment group export --file main.json</code>', '<code>az bicep convert --to bicep main.json</code>'],
      answer: [1],
      explain: '<code>az bicep decompile</code> chuyển ARM JSON sang Bicep (best effort). <code>az bicep build</code> làm chiều ngược lại (Bicep → JSON). Lệnh export lấy template từ deployment history chứ không chuyển đổi định dạng, và <code>az bicep convert</code> không tồn tại.'
    },
    {
      q: `Cho đoạn Bicep:<pre><code>param env string = 'dev'
var name = 'stg$&#123;env&#125;01'
resource s 'Microsoft.Storage/storageAccounts@2023-05-01' = if (env == 'prod') {
  name: name
  location: resourceGroup().location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}</code></pre>Bạn triển khai mà không truyền parameter nào. Kết quả là gì?`,
      options: ['Tạo storage account tên stgdev01', 'Tạo storage account tên stgprod01', 'Deployment lỗi vì thiếu parameter env', 'Không tạo storage account nào'],
      answer: [3],
      explain: 'Parameter env có giá trị mặc định dev nên không lỗi. Điều kiện <code>if (env == \'prod\')</code> là false nên tài nguyên không được triển khai. Tên stgdev01 chỉ được dùng nếu điều kiện đúng, còn stgprod01 cần truyền env=prod.'
    },
    {
      q: 'Template định nghĩa VM1 (cần NIC1) và NIC1 (cần VNET1). Cả ba nằm trong cùng template. Bạn cần đảm bảo thứ tự triển khai đúng trong ARM JSON. Bạn làm gì?',
      options: ['Sắp xếp tài nguyên trong mảng resources theo đúng thứ tự', 'Triển khai ở Complete mode', 'Thêm <code>dependsOn</code> trên VM1 trỏ tới NIC1 và trên NIC1 trỏ tới VNET1', 'Tách thành ba deployment riêng và chạy lần lượt'],
      answer: [2],
      explain: 'ARM triển khai song song các tài nguyên không có phụ thuộc, nên thứ tự trong mảng không có ý nghĩa; phải khai báo <code>dependsOn</code> (hoặc dùng <code>reference()</code> tạo phụ thuộc ngầm). Complete mode không liên quan đến thứ tự. Tách deployment chạy được nhưng tốn công hơn, không phải giải pháp tối ưu.'
    },
    {
      q: 'Phát biểu nào về Complete mode là ĐÚNG? (Chọn 2)',
      options: ['Linked và nested template phải dùng Incremental mode', 'Complete mode được dùng mặc định khi triển khai từ portal', 'Complete mode không xóa được tài nguyên nếu resource group có resource lock', 'Complete mode xóa tài nguyên ở mọi resource group được template tham chiếu'],
      answer: [0, 2],
      explain: 'Chỉ template gốc hỗ trợ Complete mode, nested/linked phải là Incremental; lock chặn việc xóa. Mặc định luôn là Incremental và portal không hỗ trợ Complete mode. Khi template trải trên nhiều resource group, chỉ resource group đích của lệnh triển khai bị xóa tài nguyên thừa.'
    },
    {
      q: 'Bạn dùng chung một template cho môi trường dev và prod, khác nhau về SKU và số lượng instance. Cách nào đơn giản và đúng chuẩn nhất?',
      options: ['Tạo hai parameter file riêng cho dev và prod, cùng dùng một template', 'Sao chép template thành hai file và sửa giá trị hard-code', 'Dùng variables có điều kiện dựa trên tên người triển khai', 'Export template từ dev rồi triển khai sang prod'],
      answer: [0],
      explain: 'Parameter file tách giá trị theo môi trường mà vẫn giữ một template duy nhất. Nhân bản template gây trùng lặp, khó bảo trì. Biến dựa trên người triển khai không phải cách làm chuẩn, và template export thường cần chỉnh sửa trước khi dùng lại.'
    },
    {
      q: 'Một storage account đã được triển khai với <code>minimumTlsVersion</code> = TLS1_2 và <code>allowBlobPublicAccess</code> = false. Bạn triển khai lại template (Incremental) chỉ khai báo SKU và kind, bỏ hai thuộc tính kia. Điều gì xảy ra với hai thuộc tính này?',
      options: ['Giữ nguyên vì Incremental không đụng tới thuộc tính không khai báo', 'Deployment báo lỗi vì thiếu thuộc tính', 'Bị đặt lại về giá trị mặc định của resource provider', 'Storage account bị xóa và tạo lại'],
      answer: [2],
      explain: 'Incremental chỉ giữ nguyên các <em>tài nguyên</em> ngoài template; với tài nguyên có trong template, mọi thuộc tính được áp lại và thuộc tính bỏ trống trở về mặc định. Deployment không báo lỗi vì các thuộc tính này không bắt buộc, và ARM không xóa rồi tạo lại tài nguyên.'
    }
  ]
});

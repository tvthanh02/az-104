/* Sườn nội dung AZ-104 — bám theo 6 learning path trên Microsoft Learn (cập nhật 11/2026).
 * units: các unit nội dung trên Learn (đã bỏ Introduction / Module assessment / Summary).
 * extras: chủ đề ➕ mở rộng ngoài Learn nhưng có trong skills outline của kỳ thi.
 */
window.AZ_CURRICULUM = {
  exam: {
    code: 'AZ-104',
    name: 'Microsoft Azure Administrator',
    passScore: 700,
    url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/'
  },
  paths: [
    {
      id: 'p1',
      title: 'Kiến thức nền cho Azure Administrator',
      learnTitle: 'AZ-104: Prerequisites for Azure administrators',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-administrator-prerequisites/',
      domain: 'Nền tảng (xuất hiện rải rác trong các domain)',
      weight: null,
      icon: '🧰',
      modules: [
        {
          id: 'p1m1', title: 'Introduction to Azure Cloud Shell', vi: 'Azure Cloud Shell',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-cloud-shell/',
          units: ['What is Azure Cloud Shell?', 'How does Azure Cloud Shell work?', 'When should you use Azure Cloud Shell?'],
          extras: ['Azure CLI và Azure PowerShell: cú pháp cốt lõi']
        },
        {
          id: 'p1m2', title: 'Deploy Azure infrastructure by using JSON ARM templates', vi: 'Triển khai hạ tầng bằng ARM template',
          url: 'https://learn.microsoft.com/en-us/training/modules/create-azure-resource-manager-template-vs-code/',
          units: ['Explore Azure Resource Manager template structure', 'Exercise - Create and deploy an Azure Resource Manager template', 'Add flexibility to your Azure Resource Manager template by using parameters and outputs', 'Exercise - Add parameters and outputs to your Azure Resource Manager template'],
          extras: ['Deployment mode: Incremental vs Complete', 'Bicep', 'Export template & what-if']
        }
      ]
    },
    {
      id: 'p2',
      title: 'Quản lý danh tính và quản trị (governance)',
      learnTitle: 'AZ-104: Manage identities and governance in Azure',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-manage-identities-governance/',
      domain: 'Manage Azure identities and governance',
      weight: '20–25%',
      icon: '🪪',
      modules: [
        {
          id: 'p2m1', title: 'Understand Microsoft Entra ID', vi: 'Tìm hiểu Microsoft Entra ID',
          url: 'https://learn.microsoft.com/en-us/training/modules/understand-azure-active-directory/',
          units: ['Examine Microsoft Entra ID', 'Compare Microsoft Entra ID and Active Directory Domain Services', 'Examine Microsoft Entra ID as a directory service for cloud apps', 'Compare Microsoft Entra ID P1 and P2 plans', 'Examine Microsoft Entra Domain Services'],
          extras: ['Tenant, directory và mối quan hệ với subscription']
        },
        {
          id: 'p2m2', title: 'Create, configure, and manage identities', vi: 'Tạo và quản lý danh tính',
          url: 'https://learn.microsoft.com/en-us/training/modules/create-configure-manage-identities/',
          units: ['Create, configure, and manage users', 'Exercise - assign licenses to users', 'Exercise - restore or remove deleted users', 'Create, configure, and manage groups', 'Exercise - add groups in Microsoft Entra ID', 'Configure and manage device registration', 'Manage licenses', 'Exercise - change group license assignments', 'Exercise - change user license assignments', 'Create custom security attributes', 'Explore automatic user creation'],
          extras: ['Guest users / B2B collaboration', 'Bulk operations (CSV)', 'Administrative units']
        },
        {
          id: 'p2m3', title: 'Describe the core architectural components of Azure', vi: 'Các thành phần kiến trúc cốt lõi của Azure',
          url: 'https://learn.microsoft.com/en-us/training/modules/describe-core-architectural-components-of-azure/',
          units: ['What is Microsoft Azure', 'Get started with Azure accounts', 'Describe Azure physical infrastructure', 'Describe Azure management infrastructure'],
          extras: ['Management groups (giới hạn, phân cấp)', 'Di chuyển resource giữa resource group / subscription']
        },
        {
          id: 'p2m4', title: 'Azure Policy initiatives', vi: 'Azure Policy và initiative',
          url: 'https://learn.microsoft.com/en-us/training/modules/sovereignty-policy-initiatives/',
          units: ['Cloud adoption guidance for Azure', 'Azure Policy design principles', 'Azure Policy resources', 'Azure Policy definitions', 'Evaluation of resources through Azure Policy'],
          extras: ['Resource locks', 'Tags và kế thừa tag', 'Cost Management, budgets và Azure Advisor']
        },
        {
          id: 'p2m5', title: 'Secure your Azure resources with Azure role-based access control (Azure RBAC)', vi: 'Bảo vệ tài nguyên bằng Azure RBAC',
          url: 'https://learn.microsoft.com/en-us/training/modules/secure-azure-resources-with-rbac/',
          units: ['What is Azure RBAC?', 'Exercise - List access using Azure RBAC and the Azure portal', 'Exercise - Grant access using Azure RBAC and the Azure portal', 'Exercise - View activity logs for Azure RBAC changes'],
          extras: ['Custom role (JSON)', 'Azure RBAC vs Microsoft Entra roles', 'Deny assignments & thứ tự đánh giá quyền']
        },
        {
          id: 'p2m6', title: 'Allow users to reset their password with Microsoft Entra self-service password reset', vi: 'Self-service password reset (SSPR)',
          url: 'https://learn.microsoft.com/en-us/training/modules/allow-users-reset-their-password/',
          units: ['What is self-service password reset in Microsoft Entra ID?', 'Implement Microsoft Entra self-service password reset', 'Exercise - Set up self-service password reset', 'Exercise - Customize directory branding'],
          extras: ['Password writeback', 'Multifactor authentication & Conditional Access (mức AZ-104)']
        }
      ]
    },
    {
      id: 'p3',
      title: 'Cấu hình và quản lý mạng ảo',
      learnTitle: 'AZ-104: Configure and manage virtual networks for Azure administrators',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-manage-virtual-networks/',
      domain: 'Implement and manage virtual networking',
      weight: '15–20%',
      icon: '🌐',
      modules: [
        {
          id: 'p3m1', title: 'Configure virtual networks', vi: 'Cấu hình mạng ảo (VNet)',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-virtual-networks/',
          units: ['Plan virtual networks', 'Create subnets', 'Create virtual networks', 'Plan IP addressing', 'Create public IP addressing', 'Associate public IP addresses', 'Allocate or assign private IP addresses', 'Exercise: Create and configure virtual networks'],
          extras: ['Tính toán CIDR & 5 địa chỉ IP Azure giữ lại']
        },
        {
          id: 'p3m2', title: 'Configure network security groups', vi: 'Network Security Group (NSG)',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-network-security-groups/',
          units: ['Implement network security groups', 'Determine network security group rules', 'Determine network security group effective rules', 'Create network security group rules', 'Implement application security groups', 'Exercise - Implement virtual networking'],
          extras: ['Azure Bastion', 'Service endpoints vs Private endpoints']
        },
        {
          id: 'p3m3', title: 'Host your domain on Azure DNS', vi: 'Azure DNS',
          url: 'https://learn.microsoft.com/en-us/training/modules/host-domain-azure-dns/',
          units: ['What is Azure DNS?', 'Configure Azure DNS to host your domain', 'Exercise - Create a DNS zone and an A record by using Azure DNS', 'Dynamically resolve resource name by using alias record', 'Exercise - Create alias records for Azure DNS'],
          extras: ['Private DNS zones & auto-registration']
        },
        {
          id: 'p3m4', title: 'Configure Azure Virtual Network peering', vi: 'VNet peering',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-vnet-peering/',
          units: ['Determine Azure Virtual Network peering uses', 'Determine gateway transit and connectivity', 'Create virtual network peering', 'Extend peering with user-defined routes and service chaining', 'Exercise - Implement Intersite Connectivity'],
          extras: ['Hub-spoke topology & troubleshoot peering']
        },
        {
          id: 'p3m5', title: 'Manage and control traffic flow in your Azure deployment with routes', vi: 'Điều hướng lưu lượng bằng route',
          url: 'https://learn.microsoft.com/en-us/training/modules/control-network-traffic-flow-with-routes/',
          units: ['Identify routing capabilities of an Azure virtual network', 'Exercise - Create custom routes', 'What is an NVA?', 'Exercise - Create an NVA and virtual machines', 'Exercise - Route traffic through the NVA'],
          extras: ['Thứ tự chọn route (longest prefix match)']
        },
        {
          id: 'p3m6', title: 'Introduction to Azure Load Balancer', vi: 'Azure Load Balancer',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-load-balancer/',
          units: ['What is Azure Load Balancer?', 'How Azure Load Balancer works', 'When to use Azure Load Balancer'],
          extras: ['Public vs Internal LB, SKU Basic vs Standard', 'Troubleshoot load balancing']
        },
        {
          id: 'p3m7', title: 'Introduction to Azure Application Gateway', vi: 'Azure Application Gateway',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-application-gateway/',
          units: ['What is Azure Application Gateway?', 'How Azure Application Gateway works', 'When to use Azure Application Gateway'],
          extras: ['So sánh Load Balancer / App Gateway / Front Door / Traffic Manager']
        },
        {
          id: 'p3m8', title: 'Introduction to Azure Network Watcher', vi: 'Azure Network Watcher',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-network-watcher/',
          units: ['What is Azure Network Watcher?', 'How Azure Network Watcher works', 'When to use Azure Network Watcher'],
          extras: ['Connection Monitor & flow logs']
        }
      ]
    },
    {
      id: 'p4',
      title: 'Triển khai và quản lý lưu trữ',
      learnTitle: 'AZ-104: Implement and manage storage in Azure',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-manage-storage/',
      domain: 'Implement and manage storage',
      weight: '15–20%',
      icon: '🗄️',
      modules: [
        {
          id: 'p4m1', title: 'Configure storage accounts', vi: 'Cấu hình storage account',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts/',
          units: ['Implement Azure Storage', 'Explore Azure Storage services', 'Determine storage account types', 'Determine replication strategies', 'Access storage', 'Secure storage endpoints'],
          extras: ['Chuyển đổi kiểu replication', 'AzCopy']
        },
        {
          id: 'p4m2', title: 'Configure Azure Blob Storage', vi: 'Azure Blob Storage',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-blob-storage/',
          units: ['Implement Azure Blob Storage', 'Create blob containers', 'Assign blob access tiers', 'Add blob lifecycle management rules', 'Determine blob object replication', 'Manage blobs', 'Determine Blob Storage pricing', 'Exercise - Provide storage for the public website'],
          extras: ['Soft delete, versioning, snapshot & immutable storage', 'Rehydrate từ Archive']
        },
        {
          id: 'p4m3', title: 'Configure Azure Storage security', vi: 'Bảo mật Azure Storage',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-storage-security/',
          units: ['Review Azure Storage security strategies', 'Create shared access signatures', 'Identify URI and SAS parameters', 'Determine Azure Storage encryption', 'Create customer-managed keys', 'Apply Azure Storage security best practices', 'Exercise: Manage Azure Storage'],
          extras: ['Stored access policy', 'Phân quyền bằng Microsoft Entra ID (data plane roles)']
        },
        {
          id: 'p4m4', title: 'Configure Azure Files', vi: 'Azure Files & File Sync',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-azure-files-file-sync/',
          units: ['Compare storage for file shares and blob data', 'Manage Azure file shares', 'Create file share snapshots', 'Implement soft delete for Azure Files', 'Use Azure Storage Explorer', 'Consider Azure File Sync'],
          extras: ['Identity-based access cho Azure Files (AD DS / Entra Kerberos)']
        }
      ]
    },
    {
      id: 'p5',
      title: 'Triển khai và quản lý tài nguyên tính toán',
      learnTitle: 'AZ-104: Deploy and manage Azure compute resources',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-manage-compute-resources/',
      domain: 'Deploy and manage Azure compute resources',
      weight: '20–25%',
      icon: '🖥️',
      modules: [
        {
          id: 'p5m1', title: 'Introduction to Azure virtual machines', vi: 'Máy ảo Azure (VM)',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-virtual-machines/',
          units: ['Compile a checklist for creating an Azure Virtual Machine', 'Exercise - Create a VM using the Azure portal', 'Describe the options available to create and manage an Azure Virtual Machine', 'Manage the availability of your Azure VMs', 'Back up your virtual machines'],
          extras: ['Managed disks: loại disk, thêm/resize disk', 'Azure Disk Encryption & encryption at host', 'Resize, redeploy, di chuyển VM']
        },
        {
          id: 'p5m2', title: 'Configure virtual machine availability', vi: 'Tính sẵn sàng của VM & Scale Sets',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-virtual-machine-availability/',
          units: ['Plan for maintenance and downtime', 'Create availability sets', 'Review update domains and fault domains', 'Review availability zones', 'Compare vertical and horizontal scaling', 'Implement Azure Virtual Machine Scale Sets', 'Create Virtual Machine Scale Sets', 'Implement autoscale', 'Configure autoscale'],
          extras: ['SLA theo từng phương án']
        },
        {
          id: 'p5m3', title: 'Configure Azure App Service plans', vi: 'App Service plan',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-app-service-plans/',
          units: ['Implement Azure App Service plans', 'Determine Azure App Service plan pricing', 'Scale up and scale out Azure App Service', 'Configure Azure App Service autoscale'],
          extras: []
        },
        {
          id: 'p5m4', title: 'Configure Azure App Service', vi: 'Azure App Service',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-azure-app-services/',
          units: ['Implement Azure App Service', 'Create an app with App Service', 'Explore continuous integration and deployment', 'Create deployment slots', 'Add deployment slots', 'Secure your App Service app', 'Create custom domain names', 'Back up and restore your App Service app', 'Use Azure Application Insights', 'Exercise: Implement Web Apps'],
          extras: ['TLS/SSL certificate & networking cho App Service']
        },
        {
          id: 'p5m5', title: 'Configure Azure Container Instances', vi: 'Container Instances & Container Apps',
          url: 'https://learn.microsoft.com/en-us/training/modules/configure-azure-container-instances/',
          units: ['Compare containers to virtual machines', 'Review Azure Container Instances', 'Implement container groups', 'Review Azure Container Apps', 'Exercise: Implement Container Instances'],
          extras: ['Azure Container Registry (ACR)']
        }
      ]
    },
    {
      id: 'p6',
      title: 'Giám sát và sao lưu tài nguyên',
      learnTitle: 'AZ-104: Monitor and back up Azure resources',
      url: 'https://learn.microsoft.com/en-us/training/paths/az-104-monitor-backup-resources/',
      domain: 'Monitor and maintain Azure resources',
      weight: '10–15%',
      icon: '📈',
      modules: [
        {
          id: 'p6m1', title: 'Introduction to Azure Backup', vi: 'Azure Backup',
          url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-backup/',
          units: ['What is Azure Backup?', 'How Azure Backup works', 'When to use Azure Backup'],
          extras: ['Recovery Services vault vs Backup vault', 'Azure Site Recovery']
        },
        {
          id: 'p6m2', title: 'Protect your virtual machines by using Azure Backup', vi: 'Sao lưu & khôi phục VM',
          url: 'https://learn.microsoft.com/en-us/training/modules/protect-virtual-machines-with-azure-backup/',
          units: ['Azure Backup features and scenarios', 'Back up an Azure virtual machine by using Azure Backup', 'Exercise - Back up an Azure virtual machine', 'Restore virtual machine data', 'Exercise - Restore Azure virtual machine data'],
          extras: ['Backup reports & alerts']
        },
        {
          id: 'p6m3', title: 'Monitor your Azure virtual machines with Azure Monitor', vi: 'Giám sát VM với Azure Monitor',
          url: 'https://learn.microsoft.com/en-us/training/modules/monitor-azure-vm-using-diagnostic-data/',
          units: ['Monitoring for Azure VMs', 'Monitor VM host data', 'Use metrics explorer to view detailed host metrics', 'Collect client performance counters by using VM insights', 'Collect VM client event logs'],
          extras: ['Log Analytics workspace & KQL cơ bản', 'Alert rules & action groups', 'Activity log, diagnostic settings']
        }
      ]
    }
  ]
};

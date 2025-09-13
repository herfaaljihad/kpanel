const { exec, execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

class SystemOptimizationService {
  constructor() {
    this.minMemoryMB = 512;
    this.recommendedMemoryMB = 1024;
    this.swapSizeMB = 1024;
    this.maxPHPProcesses = 10; // Reduced for 1GB VPS
    this.nginxWorkerProcesses = 1;
    this.mysqlBufferPoolSize = "128M"; // Small buffer for 1GB VPS
  }

  /**
   * Check system requirements for 1GB VPS
   */
  async checkSystemRequirements() {
    try {
      const totalMemory = Math.round(os.totalmem() / 1024 / 1024); // MB
      const freeMemory = Math.round(os.freemem() / 1024 / 1024); // MB
      const cpuCount = os.cpus().length;
      const diskSpace = await this.getAvailableDiskSpace();

      const requirements = {
        memory: {
          total: totalMemory,
          free: freeMemory,
          minimum: this.minMemoryMB,
          recommended: this.recommendedMemoryMB,
          meets_requirement: totalMemory >= this.minMemoryMB,
        },
        cpu: {
          cores: cpuCount,
          minimum: 1,
          meets_requirement: cpuCount >= 1,
        },
        disk: {
          available_gb: Math.round(diskSpace / 1024),
          minimum_gb: 5,
          meets_requirement: diskSpace >= 5120, // 5GB in MB
        },
      };

      return {
        compatible:
          requirements.memory.meets_requirement &&
          requirements.cpu.meets_requirement &&
          requirements.disk.meets_requirement,
        requirements: requirements,
        optimizations_needed: totalMemory <= 1024,
      };
    } catch (error) {
      throw new Error(`Failed to check system requirements: ${error.message}`);
    }
  }

  /**
   * Get available disk space in MB
   */
  async getAvailableDiskSpace() {
    try {
      const output = execSync("df / --output=avail --block-size=1M | tail -1")
        .toString()
        .trim();
      return parseInt(output);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Optimize system for 1GB VPS
   */
  async optimizeFor1GBVPS() {
    try {
      console.log("🔧 Optimizing system for 1GB VPS...");

      const optimizations = [];

      // 1. Setup swap if not exists
      await this.setupSwapFile();
      optimizations.push("Swap file configured");

      // 2. Optimize PHP-FPM for low memory
      await this.optimizePHPFPM();
      optimizations.push("PHP-FPM optimized for low memory");

      // 3. Optimize Nginx for low memory
      await this.optimizeNginx();
      optimizations.push("Nginx optimized for low memory");

      // 4. Optimize MySQL/MariaDB
      await this.optimizeMySQL();
      optimizations.push("MySQL/MariaDB optimized for low memory");

      // 5. Configure system limits
      await this.configureSystemLimits();
      optimizations.push("System limits configured");

      // 6. Setup log rotation
      await this.setupLogRotation();
      optimizations.push("Log rotation configured");

      // 7. Disable unnecessary services
      await this.disableUnnecessaryServices();
      optimizations.push("Unnecessary services disabled");

      // 8. Configure kernel parameters
      await this.optimizeKernelParameters();
      optimizations.push("Kernel parameters optimized");

      return {
        success: true,
        message: "System optimized for 1GB VPS",
        optimizations: optimizations,
      };
    } catch (error) {
      throw new Error(`Failed to optimize system: ${error.message}`);
    }
  }

  /**
   * Setup swap file for additional memory
   */
  async setupSwapFile() {
    try {
      // Check if swap already exists
      const swapInfo = execSync("swapon --show").toString().trim();
      if (swapInfo.includes("/swapfile")) {
        console.log("✅ Swap file already exists");
        return;
      }

      console.log("📁 Creating swap file...");

      // Create 1GB swap file
      execSync(`fallocate -l ${this.swapSizeMB}M /swapfile`);
      execSync("chmod 600 /swapfile");
      execSync("mkswap /swapfile");
      execSync("swapon /swapfile");

      // Make permanent
      const fstabEntry = "/swapfile none swap sw 0 0";
      const fstabContent = await fs.readFile("/etc/fstab", "utf-8");
      if (!fstabContent.includes("/swapfile")) {
        await fs.appendFile("/etc/fstab", `\n${fstabEntry}\n`);
      }

      // Optimize swap usage
      await fs.writeFile(
        "/etc/sysctl.d/99-kpanel-swap.conf",
        `
# KPanel swap optimization
vm.swappiness=10
vm.vfs_cache_pressure=50
`
      );

      console.log("✅ Swap file created and configured");
    } catch (error) {
      console.warn(`⚠️ Failed to setup swap: ${error.message}`);
    }
  }

  /**
   * Optimize PHP-FPM for 1GB VPS
   */
  async optimizePHPFPM() {
    try {
      const phpVersions = ["7.4", "8.0", "8.1", "8.2", "8.3"];

      for (const version of phpVersions) {
        try {
          const poolPath = `/etc/php/${version}/fpm/pool.d/www.conf`;
          const poolExists = await fs
            .access(poolPath)
            .then(() => true)
            .catch(() => false);

          if (poolExists) {
            const optimizedConfig = `
; KPanel optimized configuration for 1GB VPS
[www]
user = www-data
group = www-data
listen = /run/php/php${version}-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management - optimized for low memory
pm = dynamic
pm.max_children = ${this.maxPHPProcesses}
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
pm.max_requests = 500

; Memory optimization
php_admin_value[memory_limit] = 128M
php_admin_value[max_execution_time] = 300
php_admin_value[max_input_time] = 300
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M

; OPcache optimization
php_admin_value[opcache.enable] = 1
php_admin_value[opcache.memory_consumption] = 64
php_admin_value[opcache.interned_strings_buffer] = 8
php_admin_value[opcache.max_accelerated_files] = 4000
php_admin_value[opcache.revalidate_freq] = 60
php_admin_value[opcache.fast_shutdown] = 1

; Error logging
php_admin_value[log_errors] = on
php_admin_value[error_log] = /var/log/php${version}-fpm.log

; Security
php_admin_value[expose_php] = off
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen
`;

            await fs.writeFile(poolPath, optimizedConfig);
            console.log(`✅ PHP ${version}-FPM optimized`);
          }
        } catch (e) {
          // Version not installed, skip
        }
      }

      // Restart PHP-FPM services
      for (const version of phpVersions) {
        try {
          execSync(`systemctl reload php${version}-fpm 2>/dev/null`);
        } catch (e) {
          // Service not running, skip
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to optimize PHP-FPM: ${error.message}`);
    }
  }

  /**
   * Optimize Nginx for 1GB VPS
   */
  async optimizeNginx() {
    try {
      const nginxConfig = `
# KPanel Nginx optimization for 1GB VPS
user www-data;
worker_processes ${this.nginxWorkerProcesses};
worker_rlimit_nofile 1024;

events {
    worker_connections 512;
    multi_accept on;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 30;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Buffer sizes - optimized for low memory
    client_body_buffer_size 16k;
    client_header_buffer_size 1k;
    client_max_body_size 64m;
    large_client_header_buffers 2 1k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript;
    
    # File cache
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    
    # Include mime types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging format
    access_log /var/log/nginx/access.log combined buffer=16k;
    error_log /var/log/nginx/error.log warn;
    
    # Include sites
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
`;

      await fs.writeFile("/etc/nginx/nginx.conf", nginxConfig);

      // Test and reload nginx
      execSync("nginx -t");
      execSync("systemctl reload nginx");

      console.log("✅ Nginx optimized for low memory");
    } catch (error) {
      console.warn(`⚠️ Failed to optimize Nginx: ${error.message}`);
    }
  }

  /**
   * Optimize MySQL/MariaDB for 1GB VPS
   */
  async optimizeMySQL() {
    try {
      const mysqlConfig = `
[mysqld]
# KPanel MySQL optimization for 1GB VPS

# Memory settings
innodb_buffer_pool_size = ${this.mysqlBufferPoolSize}
innodb_log_file_size = 32M
innodb_log_buffer_size = 8M
query_cache_size = 16M
query_cache_limit = 1M
max_connections = 50
table_open_cache = 400
thread_cache_size = 8

# Performance
innodb_file_per_table = 1
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
skip-name-resolve

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Safety
max_allowed_packet = 64M
wait_timeout = 300
interactive_timeout = 300

[mysql]
default-character-set = utf8mb4

[mysqld_safe]
socket = /var/run/mysqld/mysqld.sock
nice = 0
`;

      // Try different MySQL/MariaDB config paths
      const configPaths = [
        "/etc/mysql/mysql.conf.d/mysqld.cnf",
        "/etc/mysql/mariadb.conf.d/50-server.cnf",
        "/etc/mysql/my.cnf",
      ];

      for (const configPath of configPaths) {
        try {
          const configDir = path.dirname(configPath);
          await fs.access(configDir);
          await fs.writeFile(configPath, mysqlConfig);
          console.log(`✅ MySQL config written to ${configPath}`);
          break;
        } catch (e) {
          // Try next path
          continue;
        }
      }

      // Restart MySQL service
      try {
        execSync(
          "systemctl restart mysql 2>/dev/null || systemctl restart mariadb 2>/dev/null"
        );
        console.log("✅ MySQL/MariaDB optimized and restarted");
      } catch (e) {
        console.log("✅ MySQL/MariaDB config optimized (service not running)");
      }
    } catch (error) {
      console.warn(`⚠️ Failed to optimize MySQL: ${error.message}`);
    }
  }

  /**
   * Configure system limits
   */
  async configureSystemLimits() {
    try {
      const limitsConfig = `
# KPanel system limits for 1GB VPS
* soft nofile 4096
* hard nofile 4096
* soft nproc 2048
* hard nproc 2048
www-data soft nofile 4096
www-data hard nofile 4096
mysql soft nofile 4096
mysql hard nofile 4096
`;

      await fs.writeFile("/etc/security/limits.d/99-kpanel.conf", limitsConfig);
      console.log("✅ System limits configured");
    } catch (error) {
      console.warn(`⚠️ Failed to configure system limits: ${error.message}`);
    }
  }

  /**
   * Setup log rotation to save disk space
   */
  async setupLogRotation() {
    try {
      // Nginx log rotation
      const nginxLogrotate = `
/var/log/nginx/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \`cat /var/run/nginx.pid\`
        fi
    endscript
}
`;

      // PHP-FPM log rotation
      const phpLogrotate = `
/var/log/php*-fpm.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /usr/lib/php/php*-fpm-reopenlogs
    endscript
}
`;

      // KPanel log rotation
      const kpanelLogrotate = `
/var/www/kpanel/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
`;

      await fs.writeFile("/etc/logrotate.d/nginx-kpanel", nginxLogrotate);
      await fs.writeFile("/etc/logrotate.d/php-fpm-kpanel", phpLogrotate);
      await fs.writeFile("/etc/logrotate.d/kpanel", kpanelLogrotate);

      console.log("✅ Log rotation configured");
    } catch (error) {
      console.warn(`⚠️ Failed to setup log rotation: ${error.message}`);
    }
  }

  /**
   * Disable unnecessary services to save memory
   */
  async disableUnnecessaryServices() {
    try {
      const unnecessaryServices = [
        "snapd",
        "lxd",
        "bluetooth",
        "ModemManager",
        "cups",
        "cups-browsed",
      ];

      for (const service of unnecessaryServices) {
        try {
          execSync(`systemctl disable ${service} 2>/dev/null`);
          execSync(`systemctl stop ${service} 2>/dev/null`);
          console.log(`✅ Disabled ${service}`);
        } catch (e) {
          // Service doesn't exist, skip
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Failed to disable unnecessary services: ${error.message}`
      );
    }
  }

  /**
   * Optimize kernel parameters for low memory
   */
  async optimizeKernelParameters() {
    try {
      const sysctlConfig = `
# KPanel kernel optimization for 1GB VPS

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50

# Network optimization
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# File system
fs.file-max = 65536
`;

      await fs.writeFile("/etc/sysctl.d/99-kpanel.conf", sysctlConfig);

      // Apply settings
      execSync("sysctl -p /etc/sysctl.d/99-kpanel.conf");

      console.log("✅ Kernel parameters optimized");
    } catch (error) {
      console.warn(`⚠️ Failed to optimize kernel parameters: ${error.message}`);
    }
  }

  /**
   * Monitor system resources
   */
  async getSystemStats() {
    try {
      const stats = {
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
          used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
          usage_percent: Math.round(
            ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
          ),
        },
        cpu: {
          cores: os.cpus().length,
          load: os.loadavg(),
        },
        uptime: Math.round(os.uptime() / 3600), // hours
        swap: await this.getSwapInfo(),
        disk: await this.getDiskInfo(),
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  /**
   * Get swap information
   */
  async getSwapInfo() {
    try {
      const swapInfo = execSync("free -m | grep Swap").toString().split(/\s+/);
      return {
        total: parseInt(swapInfo[1]),
        used: parseInt(swapInfo[2]),
        free: parseInt(swapInfo[3]),
      };
    } catch (error) {
      return { total: 0, used: 0, free: 0 };
    }
  }

  /**
   * Get disk information
   */
  async getDiskInfo() {
    try {
      const diskInfo = execSync(
        "df / --output=size,used,avail --block-size=1M | tail -1"
      )
        .toString()
        .split(/\s+/);
      return {
        total: parseInt(diskInfo[0]),
        used: parseInt(diskInfo[1]),
        available: parseInt(diskInfo[2]),
        usage_percent: Math.round(
          (parseInt(diskInfo[1]) / parseInt(diskInfo[0])) * 100
        ),
      };
    } catch (error) {
      return { total: 0, used: 0, available: 0, usage_percent: 0 };
    }
  }

  /**
   * Get service status for monitoring
   */
  async getServiceStatus() {
    try {
      const services = [
        "nginx",
        "mysql",
        "mariadb",
        "php7.4-fpm",
        "php8.0-fpm",
        "php8.1-fpm",
        "php8.2-fpm",
      ];
      const status = {};

      for (const service of services) {
        try {
          const result = execSync(`systemctl is-active ${service} 2>/dev/null`)
            .toString()
            .trim();
          status[service] = {
            active: result === "active",
            status: result,
          };
        } catch (e) {
          status[service] = {
            active: false,
            status: "not-found",
          };
        }
      }

      return status;
    } catch (error) {
      throw new Error(`Failed to get service status: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files and logs
   */
  async cleanupSystem() {
    try {
      const cleanupTasks = [];

      // Clean package cache
      try {
        execSync("apt-get clean");
        cleanupTasks.push("Package cache cleaned");
      } catch (e) {}

      // Clean log files older than 7 days
      try {
        execSync('find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null');
        cleanupTasks.push("Old log files cleaned");
      } catch (e) {}

      // Clean temp files
      try {
        execSync("find /tmp -type f -atime +3 -delete 2>/dev/null");
        cleanupTasks.push("Temporary files cleaned");
      } catch (e) {}

      return {
        success: true,
        tasks: cleanupTasks,
      };
    } catch (error) {
      throw new Error(`Failed to cleanup system: ${error.message}`);
    }
  }
}

module.exports = SystemOptimizationService;

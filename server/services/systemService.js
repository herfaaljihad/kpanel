// System Service - Advanced System Integration & Management
// server/services/systemService.js

const { exec, spawn } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const { logger } = require("../utils/logger");

const execAsync = promisify(exec);

class SystemService {
  constructor() {
    this.platform = process.platform;
    this.isWindows = this.platform === "win32";
    this.isLinux = this.platform === "linux";
    this.isProduction = process.env.NODE_ENV === "production";

    // System paths based on OS
    this.systemPaths = this.initializeSystemPaths();

    // Service configurations
    this.services = {
      web: this.getWebServerConfig(),
      database: this.getDatabaseConfig(),
      php: this.getPHPConfig(),
      mail: this.getMailServerConfig(),
    };

    // Monitoring configuration
    this.monitoring = {
      interval: parseInt(process.env.MONITORING_INTERVAL) || 30000,
      enabled: process.env.MONITORING_ENABLED !== "false",
      alerts: process.env.MONITORING_ALERTS !== "false",
    };

    // Allowed services for security
    this.allowedServices = [
      "nginx",
      "apache2",
      "httpd",
      "mysql",
      "mariadb",
      "postgresql",
      "php7.4-fpm",
      "php8.0-fpm",
      "php8.1-fpm",
      "php8.2-fpm",
      "postfix",
      "dovecot",
      "bind9",
      "named",
      "redis-server",
      "memcached",
      "fail2ban",
      "ufw",
      "iptables",
    ];

    this.initialize();
  }

  initializeSystemPaths() {
    if (this.isWindows) {
      return {
        systemctl: "sc.exe",
        nginx: "C:\\nginx",
        apache: "C:\\Apache24",
        php: "C:\\php",
        mysql: "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
        mysqldump:
          "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
        certbot: "C:\\ProgramData\\chocolatey\\bin\\certbot.exe",
        webRoot: "C:\\inetpub\\wwwroot",
        backupPath: "C:\\KPanel\\backups",
        logPath: "C:\\KPanel\\logs",
      };
    } else {
      return {
        systemctl: "/bin/systemctl",
        nginx: "/etc/nginx",
        apache: "/etc/apache2",
        php: "/etc/php",
        mysql: "/usr/bin/mysql",
        mysqldump: "/usr/bin/mysqldump",
        certbot: "/usr/bin/certbot",
        fail2ban: "/etc/fail2ban",
        ufw: "/usr/sbin/ufw",
        webRoot: "/var/www",
        backupPath: "/var/backups/kpanel",
        logPath: "/var/log",
      };
    }
  }

  getWebServerConfig() {
    return {
      nginx: {
        configPath: this.isWindows ? "C:\\nginx\\conf" : "/etc/nginx",
        sitesPath: this.isWindows
          ? "C:\\nginx\\conf\\sites"
          : "/etc/nginx/sites-available",
        enabledPath: this.isWindows
          ? "C:\\nginx\\conf\\sites"
          : "/etc/nginx/sites-enabled",
        logPath: this.isWindows ? "C:\\nginx\\logs" : "/var/log/nginx",
      },
      apache: {
        configPath: this.isWindows ? "C:\\Apache24\\conf" : "/etc/apache2",
        sitesPath: this.isWindows
          ? "C:\\Apache24\\conf\\sites"
          : "/etc/apache2/sites-available",
        enabledPath: this.isWindows
          ? "C:\\Apache24\\conf\\sites"
          : "/etc/apache2/sites-enabled",
        logPath: this.isWindows ? "C:\\Apache24\\logs" : "/var/log/apache2",
      },
    };
  }

  getDatabaseConfig() {
    return {
      mysql: {
        configPath: this.isWindows
          ? "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\my.ini"
          : "/etc/mysql/my.cnf",
        dataPath: this.isWindows
          ? "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data"
          : "/var/lib/mysql",
        logPath: this.isWindows
          ? "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data"
          : "/var/log/mysql",
      },
      postgresql: {
        configPath: this.isWindows
          ? "C:\\Program Files\\PostgreSQL\\14\\data\\postgresql.conf"
          : "/etc/postgresql/14/main/postgresql.conf",
        dataPath: this.isWindows
          ? "C:\\Program Files\\PostgreSQL\\14\\data"
          : "/var/lib/postgresql/14/main",
      },
    };
  }

  getPHPConfig() {
    return {
      configPath: this.isWindows ? "C:\\php\\php.ini" : "/etc/php",
      fpmPath: this.isWindows ? null : "/etc/php/8.1/fpm",
      logPath: this.isWindows ? "C:\\php\\logs" : "/var/log/php",
    };
  }

  getMailServerConfig() {
    return {
      postfix: {
        configPath: this.isWindows ? null : "/etc/postfix",
        logPath: this.isWindows ? null : "/var/log/mail.log",
      },
      dovecot: {
        configPath: this.isWindows ? null : "/etc/dovecot",
        logPath: this.isWindows ? null : "/var/log/dovecot.log",
      },
    };
  }

  async initialize() {
    try {
      await this.verifySystemPaths();
      await this.initializeSystemChecks();

      if (this.monitoring.enabled) {
        this.startMonitoring();
      }

      logger.info("Advanced System Service initialized", {
        platform: this.platform,
        monitoring: this.monitoring.enabled,
        services: Object.keys(this.services),
      });
    } catch (error) {
      logger.error("Failed to initialize system service", error);
    }
  }

  async initializeSystemChecks() {
    const checks = [];

    // Check if we're running as root/admin (required for system operations)
    if (this.isLinux) {
      checks.push(this.checkRootAccess());
    }

    // Check essential services
    checks.push(this.checkEssentialServices());

    await Promise.all(checks);
  }

  async checkRootAccess() {
    try {
      const { stdout } = await execAsync("id -u");
      const uid = parseInt(stdout.trim());

      if (uid !== 0 && this.isProduction) {
        logger.warn(
          "System service running without root privileges - some features may be limited"
        );
      }

      return uid === 0;
    } catch (error) {
      logger.error("Failed to check root access", error);
      return false;
    }
  }

  async checkEssentialServices() {
    const essential = ["nginx", "mysql"];
    const results = {};

    for (const service of essential) {
      try {
        const status = await this.getServiceStatus(service);
        results[service] = status;
      } catch (error) {
        results[service] = { status: "unknown", error: error.message };
      }
    }

    logger.info("Essential services check completed", results);
    return results;
  }

  async verifySystemPaths() {
    const pathChecks = [];

    if (this.isLinux) {
      pathChecks.push(
        this.checkPath(this.systemPaths.systemctl, "systemctl"),
        this.checkPath("/usr/bin/which", "which command")
      );
    }

    await Promise.all(pathChecks);
  }

  async checkPath(path, description) {
    try {
      await fs.access(path);
      logger.debug(`✅ ${description} found at ${path}`);
      return true;
    } catch (error) {
      logger.warn(`⚠️ ${description} not found at ${path}`);
      return false;
    }
  }

  // Method required by routes
  async getAllServicesStatus() {
    try {
      const servicesStatus = [];

      for (const serviceName of this.allowedServices) {
        try {
          const status = await this.getServiceStatus(serviceName);
          servicesStatus.push({
            name: serviceName,
            ...status,
          });
        } catch (error) {
          servicesStatus.push({
            name: serviceName,
            status: "unknown",
            error: error.message,
          });
        }
      }

      return servicesStatus;
    } catch (error) {
      logger.error("Failed to get all services status", error);
      throw error;
    }
  }

  async getServiceStatus(serviceName) {
    if (!this.allowedServices.includes(serviceName)) {
      throw new Error(`Service ${serviceName} is not allowed`);
    }

    try {
      let command;

      if (this.isWindows) {
        // Windows Service Control Manager
        command = `sc query "${serviceName}" | findstr STATE`;
      } else {
        // Linux systemctl
        command = `systemctl is-active ${serviceName} && systemctl is-enabled ${serviceName}`;
      }

      const { stdout, stderr } = await execAsync(command);

      if (this.isWindows) {
        const isRunning = stdout.includes("RUNNING");
        return {
          status: isRunning ? "active" : "inactive",
          enabled: true, // Windows services are typically enabled if they exist
          uptime: null,
          memory: null,
          cpu: null,
        };
      } else {
        const lines = stdout.trim().split("\n");
        const isActive = lines[0] === "active";
        const isEnabled = lines[1] === "enabled";

        // Get additional process info
        const processInfo = await this.getServiceProcessInfo(serviceName);

        return {
          status: isActive ? "active" : "inactive",
          enabled: isEnabled,
          uptime: processInfo.uptime,
          memory: processInfo.memory,
          cpu: processInfo.cpu,
          pid: processInfo.pid,
        };
      }
    } catch (error) {
      logger.error(`Failed to get status for service ${serviceName}`, error);
      return {
        status: "unknown",
        enabled: null,
        error: error.message,
      };
    }
  }

  async getServiceProcessInfo(serviceName) {
    try {
      if (this.isWindows) {
        // Windows process info
        const { stdout } = await execAsync(
          `tasklist /FI "IMAGENAME eq ${serviceName}.exe" /FO CSV`
        );
        const lines = stdout.trim().split("\n");

        if (lines.length > 1) {
          const data = lines[1].split(",");
          return {
            pid: parseInt(data[1].replace(/"/g, "")),
            memory: data[4],
            uptime: null,
            cpu: null,
          };
        }
      } else {
        // Linux process info
        const { stdout } = await execAsync(
          `systemctl show ${serviceName} --property=MainPID,MemoryCurrent`
        );
        const lines = stdout.trim().split("\n");
        const data = {};

        lines.forEach((line) => {
          const [key, value] = line.split("=");
          data[key] = value;
        });

        const pid = parseInt(data.MainPID);
        if (pid > 0) {
          // Get CPU and uptime from /proc
          const { stdout: procInfo } = await execAsync(
            `cat /proc/${pid}/stat 2>/dev/null || echo ""`
          );

          return {
            pid: pid,
            memory: data.MemoryCurrent ? parseInt(data.MemoryCurrent) : null,
            uptime: await this.getProcessUptime(pid),
            cpu: await this.getProcessCPU(pid),
          };
        }
      }

      return { pid: null, memory: null, uptime: null, cpu: null };
    } catch (error) {
      return { pid: null, memory: null, uptime: null, cpu: null };
    }
  }

  async getProcessUptime(pid) {
    try {
      const { stdout } = await execAsync(
        `ps -o etime= -p ${pid} 2>/dev/null || echo ""`
      );
      return stdout.trim() || null;
    } catch (error) {
      return null;
    }
  }

  async getProcessCPU(pid) {
    try {
      const { stdout } = await execAsync(
        `ps -o %cpu= -p ${pid} 2>/dev/null || echo ""`
      );
      return parseFloat(stdout.trim()) || null;
    } catch (error) {
      return null;
    }
  }

  async restartService(serviceName) {
    if (!this.allowedServices.includes(serviceName)) {
      throw new Error(`Service ${serviceName} is not allowed`);
    }

    try {
      let command;

      if (this.isWindows) {
        // Windows doesn't have a direct restart, so stop then start
        await this.stopService(serviceName);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await this.startService(serviceName);
      } else {
        command = `systemctl restart ${serviceName}`;
      }

      const { stdout, stderr } = await execAsync(command);

      // Wait a moment and check if service restarted successfully
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const status = await this.getServiceStatus(serviceName);

      logger.info(`Service ${serviceName} restart command executed`, {
        status: status.status,
        command: command,
      });

      return {
        success: status.status === "active",
        status: status,
        output: stdout,
        error: stderr,
      };
    } catch (error) {
      logger.error(`Failed to restart service ${serviceName}`, error);
      throw new Error(
        `Failed to restart service ${serviceName}: ${error.message}`
      );
    }
  }

  async startService(serviceName) {
    if (!this.allowedServices.includes(serviceName)) {
      throw new Error(`Service ${serviceName} is not allowed`);
    }

    try {
      let command;

      if (this.isWindows) {
        command = `sc start "${serviceName}"`;
      } else {
        command = `systemctl start ${serviceName}`;
      }

      const { stdout, stderr } = await execAsync(command);

      // Wait a moment and check if service started successfully
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await this.getServiceStatus(serviceName);

      logger.info(`Service ${serviceName} start command executed`, {
        status: status.status,
        command: command,
      });

      return {
        success: status.status === "active",
        status: status,
        output: stdout,
        error: stderr,
      };
    } catch (error) {
      logger.error(`Failed to start service ${serviceName}`, error);
      throw new Error(
        `Failed to start service ${serviceName}: ${error.message}`
      );
    }
  }

  async stopService(serviceName) {
    if (!this.allowedServices.includes(serviceName)) {
      throw new Error(`Service ${serviceName} is not allowed`);
    }

    try {
      let command;

      if (this.isWindows) {
        command = `sc stop "${serviceName}"`;
      } else {
        command = `systemctl stop ${serviceName}`;
      }

      const { stdout, stderr } = await execAsync(command);

      // Wait a moment and check if service stopped successfully
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await this.getServiceStatus(serviceName);

      logger.info(`Service ${serviceName} stop command executed`, {
        status: status.status,
        command: command,
      });

      return {
        success: status.status === "inactive",
        status: status,
        output: stdout,
        error: stderr,
      };
    } catch (error) {
      logger.error(`Failed to stop service ${serviceName}`, error);
      throw new Error(
        `Failed to stop service ${serviceName}: ${error.message}`
      );
    }
  }

  // Method required by routes - alias for getSystemStatistics
  async getSystemStatistics() {
    try {
      const stats = {
        platform: this.platform,
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length,
        timestamp: new Date().toISOString(),
      };

      // Add platform-specific stats
      if (this.isLinux) {
        stats.disk = await this.getLinuxDiskUsage();
        stats.network = await this.getLinuxNetworkStats();
      } else if (this.isWindows) {
        stats.disk = await this.getWindowsDiskUsage();
        stats.network = await this.getWindowsNetworkStats();
      }

      return stats;
    } catch (error) {
      logger.error("Failed to get system statistics", error);
      throw error;
    }
  }

  async getLinuxDiskUsage() {
    try {
      const { stdout } = await execAsync("df -h / | tail -1");
      const parts = stdout.trim().split(/\s+/);

      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        percentage: parts[4],
      };
    } catch (error) {
      return null;
    }
  }

  async getWindowsDiskUsage() {
    try {
      const { stdout } = await execAsync(
        "wmic logicaldisk get size,freespace,caption /format:csv"
      );
      const lines = stdout.trim().split("\n").slice(1);
      const disks = [];

      for (const line of lines) {
        const parts = line.split(",");
        if (parts.length >= 4 && parts[1]) {
          const total = parseInt(parts[3]);
          const free = parseInt(parts[2]);
          const used = total - free;

          disks.push({
            drive: parts[1],
            total: Math.round(total / (1024 * 1024 * 1024)) + " GB",
            used: Math.round(used / (1024 * 1024 * 1024)) + " GB",
            free: Math.round(free / (1024 * 1024 * 1024)) + " GB",
            percentage: Math.round((used / total) * 100) + "%",
          });
        }
      }

      return disks[0] || null; // Return C: drive info
    } catch (error) {
      return null;
    }
  }

  async getLinuxNetworkStats() {
    try {
      const { stdout } = await execAsync(
        'cat /proc/net/dev | grep -E "(eth|ens|enp|wlan)" | head -1'
      );
      const parts = stdout.trim().split(/\s+/);

      if (parts.length >= 10) {
        return {
          interface: parts[0].replace(":", ""),
          rx_bytes: parseInt(parts[1]),
          tx_bytes: parseInt(parts[9]),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getWindowsNetworkStats() {
    try {
      const { stdout } = await execAsync(
        "wmic path Win32_NetworkAdapter where NetEnabled=true get BytesReceivedPerSec,BytesSentPerSec /format:csv"
      );
      const lines = stdout.trim().split("\n").slice(1);

      if (lines.length > 0) {
        const parts = lines[0].split(",");
        return {
          rx_bytes: parseInt(parts[1]) || 0,
          tx_bytes: parseInt(parts[2]) || 0,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await this.getSystemStatistics();

        // Check for critical conditions
        const memoryUsage =
          ((stats.totalmem - stats.freemem) / stats.totalmem) * 100;
        const loadAverage = stats.loadavg[0];

        if (memoryUsage > 90 && this.monitoring.alerts) {
          logger.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}%`);
        }

        if (loadAverage > stats.cpus * 2 && this.monitoring.alerts) {
          logger.warn(`High load average detected: ${loadAverage.toFixed(2)}`);
        }

        // Store stats for API endpoints
        this.lastStats = stats;
      } catch (error) {
        logger.error("Monitoring check failed", error);
      }
    }, this.monitoring.interval);

    logger.info("System monitoring started", {
      interval: this.monitoring.interval,
      alerts: this.monitoring.alerts,
    });
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("System monitoring stopped");
    }
  }

  getLastStats() {
    return this.lastStats || null;
  }

  async updateSystem() {
    if (!this.isProduction) {
      throw new Error("System updates only available in production mode");
    }

    try {
      let command;

      if (this.isWindows) {
        // Windows Update via PowerShell
        command =
          'powershell "Get-WindowsUpdate -Install -AcceptAll -AutoReboot"';
      } else {
        // Linux package update
        if (await this.checkPath("/usr/bin/apt", "apt")) {
          command = "apt update && apt upgrade -y";
        } else if (await this.checkPath("/usr/bin/yum", "yum")) {
          command = "yum update -y";
        } else if (await this.checkPath("/usr/bin/dnf", "dnf")) {
          command = "dnf update -y";
        } else {
          throw new Error("No supported package manager found");
        }
      }

      logger.info("Starting system update", { command: command });

      // This could take a while, so we use spawn instead of exec
      return new Promise((resolve, reject) => {
        const process = spawn("sh", ["-c", command], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
          logger.debug("Update output:", data.toString().trim());
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
          logger.debug("Update error:", data.toString().trim());
        });

        process.on("close", (code) => {
          if (code === 0) {
            logger.info("System update completed successfully");
            resolve({
              success: true,
              output: stdout,
              error: stderr,
              exitCode: code,
            });
          } else {
            logger.error(`System update failed with exit code ${code}`);
            reject(
              new Error(
                `System update failed with exit code ${code}: ${stderr}`
              )
            );
          }
        });

        process.on("error", (error) => {
          logger.error("System update process error", error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error("Failed to start system update", error);
      throw error;
    }
  }
}

module.exports = SystemService;

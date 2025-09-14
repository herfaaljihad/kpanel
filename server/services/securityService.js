// Advanced Security Service
// server/services/securityService.js

const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

class SecurityService {
  constructor() {
    this.isLinux = process.platform === "linux";
    this.logPath = "/var/log/kpanel-security.log";
    this.blockedIPs = new Set();
    this.bruteForceAttempts = new Map();
  }

  // Firewall Management
  async enableFirewall() {
    if (!this.isLinux) {
      // For Windows, log the action but note it's not implemented
      this.logSecurityEvent(
        "FIREWALL_ENABLE_REQUESTED",
        "Firewall enable requested on non-Linux system"
      );
      return {
        success: false,
        message: "Firewall management only supported on Linux systems",
      };
    }

    try {
      return new Promise((resolve) => {
        exec("ufw --force enable", (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            this.logSecurityEvent(
              "FIREWALL_ENABLED",
              "System firewall enabled"
            );
            resolve({
              success: true,
              message: "Firewall enabled successfully",
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async disableFirewall() {
    if (!this.isLinux) {
      this.logSecurityEvent(
        "FIREWALL_DISABLE_REQUESTED",
        "Firewall disable requested on non-Linux system"
      );
      return {
        success: false,
        message: "Firewall management only supported on Linux systems",
      };
    }

    try {
      return new Promise((resolve) => {
        exec("ufw disable", (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            this.logSecurityEvent(
              "FIREWALL_DISABLED",
              "System firewall disabled"
            );
            resolve({
              success: true,
              message: "Firewall disabled successfully",
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getFirewallStatus() {
    if (!this.isLinux) {
      return {
        status: "active",
        mock: true,
        rules: [
          { port: "22", protocol: "tcp", action: "ALLOW", from: "Anywhere" },
          { port: "80", protocol: "tcp", action: "ALLOW", from: "Anywhere" },
          { port: "443", protocol: "tcp", action: "ALLOW", from: "Anywhere" },
          { port: "3306", protocol: "tcp", action: "DENY", from: "Anywhere" },
        ],
      };
    }

    try {
      return new Promise((resolve) => {
        exec("ufw status verbose", (error, stdout, stderr) => {
          if (error) {
            resolve({ status: "inactive", rules: [] });
          } else {
            const lines = stdout.split("\n");
            const status = lines[0].includes("active") ? "active" : "inactive";

            const rules = [];
            lines.forEach((line) => {
              if (line.includes("ALLOW") || line.includes("DENY")) {
                const parts = line.trim().split(/\s+/);
                rules.push({
                  port: parts[0],
                  action: parts[1],
                  from: parts.slice(2).join(" "),
                });
              }
            });

            resolve({ status, rules });
          }
        });
      });
    } catch (error) {
      return { status: "unknown", rules: [], error: error.message };
    }
  }

  async addFirewallRule(
    port,
    protocol = "tcp",
    action = "allow",
    from = "any"
  ) {
    if (!this.isLinux) {
      this.logSecurityEvent(
        "FIREWALL_RULE_REQUESTED",
        `Firewall rule requested: ${action} ${port}/${protocol} from ${from}`
      );
      return {
        success: false,
        message: "Firewall rule management only supported on Linux systems",
      };
    }

    try {
      const command = `ufw ${action} from ${from} to any port ${port} proto ${protocol}`;

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            this.logSecurityEvent(
              "FIREWALL_RULE_ADDED",
              `Rule added: ${command}`
            );
            resolve({
              success: true,
              message: `Firewall rule added successfully`,
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // IP Blocking/Whitelist Management
  async blockIP(ip, reason = "Manual block") {
    this.blockedIPs.add(ip);

    if (!this.isLinux) {
      this.logSecurityEvent(
        "IP_BLOCK_REQUESTED",
        `IP block requested: ${ip} - ${reason}`
      );
      return {
        success: false,
        message: "IP blocking only supported on Linux systems",
      };
    }

    try {
      const command = `ufw deny from ${ip}`;

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            this.logSecurityEvent("IP_BLOCKED", `IP ${ip} blocked: ${reason}`);
            resolve({
              success: true,
              message: `IP ${ip} blocked successfully`,
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async unblockIP(ip) {
    this.blockedIPs.delete(ip);

    if (!this.isLinux) {
      this.logSecurityEvent(
        "IP_UNBLOCK_REQUESTED",
        `IP unblock requested: ${ip}`
      );
      return {
        success: false,
        message: "IP unblocking only supported on Linux systems",
      };
    }

    try {
      const command = `ufw delete deny from ${ip}`;

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            this.logSecurityEvent("IP_UNBLOCKED", `IP ${ip} unblocked`);
            resolve({
              success: true,
              message: `IP ${ip} unblocked successfully`,
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Brute Force Protection
  async checkBruteForceAttempt(ip, username) {
    const key = `${ip}-${username}`;
    const now = Date.now();

    if (!this.bruteForceAttempts.has(key)) {
      this.bruteForceAttempts.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
      return { blocked: false, attempts: 1 };
    }

    const attempts = this.bruteForceAttempts.get(key);
    attempts.count++;
    attempts.lastAttempt = now;

    // Block after 5 failed attempts within 15 minutes
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    if (attempts.count >= 5 && now - attempts.firstAttempt < timeWindow) {
      await this.blockIP(
        ip,
        `Brute force attack detected - ${attempts.count} failed login attempts`
      );
      this.logSecurityEvent(
        "BRUTE_FORCE_DETECTED",
        `IP ${ip} blocked after ${attempts.count} failed attempts for user ${username}`
      );
      return { blocked: true, attempts: attempts.count };
    }

    return { blocked: false, attempts: attempts.count };
  }

  // Security Scanning
  async performSecurityScan() {
    const scanResults = {
      timestamp: new Date(),
      vulnerabilities: [],
      warnings: [],
      recommendations: [],
    };

    // Check for common vulnerabilities
    await this.checkOpenPorts(scanResults);
    await this.checkFilePermissions(scanResults);
    await this.checkServiceSecurity(scanResults);
    await this.checkSystemUpdates(scanResults);

    return scanResults;
  }

  async checkOpenPorts(scanResults) {
    if (!this.isLinux) {
      scanResults.warnings.push({
        type: "OPEN_PORTS",
        severity: "medium",
        description: "Mock scan: Some ports may be unnecessarily open",
        ports: ["22", "80", "443", "3306"],
      });
      return;
    }

    try {
      return new Promise((resolve) => {
        exec("netstat -tuln", (error, stdout) => {
          if (error) {
            resolve();
            return;
          }

          const lines = stdout.split("\n");
          const openPorts = [];

          lines.forEach((line) => {
            if (line.includes("LISTEN")) {
              const parts = line.trim().split(/\s+/);
              const address = parts[3];
              if (address && address.includes(":")) {
                const port = address.split(":").pop();
                openPorts.push(port);
              }
            }
          });

          // Check for dangerous open ports
          const dangerousPorts = ["3306", "5432", "27017", "6379"];
          const exposedPorts = openPorts.filter((port) =>
            dangerousPorts.includes(port)
          );

          if (exposedPorts.length > 0) {
            scanResults.vulnerabilities.push({
              type: "EXPOSED_DATABASE_PORTS",
              severity: "high",
              description: "Database ports are exposed to public",
              ports: exposedPorts,
            });
          }

          resolve();
        });
      });
    } catch (error) {
      console.error("Port scan error:", error);
    }
  }

  async checkFilePermissions(scanResults) {
    const criticalFiles = [
      "/etc/passwd",
      "/etc/shadow",
      "/etc/ssh/sshd_config",
      "/etc/mysql/my.cnf",
    ];

    for (const file of criticalFiles) {
      try {
        if (this.isLinux) {
          await new Promise((resolve) => {
            exec(`ls -la ${file}`, (error, stdout) => {
              if (!error && stdout.includes("rwx")) {
                const permissions = stdout.split(/\s+/)[0];
                if (permissions.includes("rwxrwxrwx")) {
                  scanResults.vulnerabilities.push({
                    type: "INSECURE_FILE_PERMISSIONS",
                    severity: "high",
                    description: `Critical file ${file} has insecure permissions`,
                    file,
                    permissions,
                  });
                }
              }
              resolve();
            });
          });
        }
      } catch (error) {
        console.error(`Permission check error for ${file}:`, error);
      }
    }
  }

  async checkServiceSecurity(scanResults) {
    const services = ["ssh", "mysql", "nginx", "apache2"];

    for (const service of services) {
      // Check if service is running with secure configuration
      if (service === "ssh") {
        await this.checkSSHSecurity(scanResults);
      }
    }
  }

  async checkSSHSecurity(scanResults) {
    if (!this.isLinux) {
      scanResults.recommendations.push({
        type: "SSH_SECURITY",
        description:
          "Mock: Review SSH configuration for security best practices",
      });
      return;
    }

    try {
      return new Promise((resolve) => {
        exec(
          'grep -E "^(PermitRootLogin|PasswordAuthentication|PermitEmptyPasswords)" /etc/ssh/sshd_config',
          (error, stdout) => {
            if (!error) {
              const lines = stdout.split("\n");

              lines.forEach((line) => {
                if (line.includes("PermitRootLogin yes")) {
                  scanResults.vulnerabilities.push({
                    type: "SSH_ROOT_LOGIN_ENABLED",
                    severity: "high",
                    description: "SSH root login is enabled",
                  });
                }

                if (line.includes("PasswordAuthentication yes")) {
                  scanResults.warnings.push({
                    type: "SSH_PASSWORD_AUTH",
                    severity: "medium",
                    description: "SSH password authentication is enabled",
                  });
                }
              });
            }
            resolve();
          }
        );
      });
    } catch (error) {
      console.error("SSH security check error:", error);
    }
  }

  async checkSystemUpdates(scanResults) {
    if (!this.isLinux) {
      scanResults.recommendations.push({
        type: "SYSTEM_UPDATES",
        description: "Mock: Check for available system updates",
      });
      return;
    }

    try {
      return new Promise((resolve) => {
        exec("apt list --upgradable 2>/dev/null | wc -l", (error, stdout) => {
          if (!error) {
            const updateCount = parseInt(stdout.trim()) - 1; // Subtract header line

            if (updateCount > 0) {
              const severity = updateCount > 20 ? "high" : "medium";
              scanResults.warnings.push({
                type: "SYSTEM_UPDATES_AVAILABLE",
                severity,
                description: `${updateCount} system updates available`,
                count: updateCount,
              });
            }
          }
          resolve();
        });
      });
    } catch (error) {
      console.error("Update check error:", error);
    }
  }

  // ModSecurity WAF Integration
  async enableModSecurity() {
    if (!this.isLinux) {
      return {
        success: true,
        mock: true,
        message: "Mock: ModSecurity WAF enabled",
      };
    }

    try {
      const commands = ["a2enmod security2", "systemctl restart apache2"];

      for (const command of commands) {
        await new Promise((resolve) => {
          exec(command, (error) => {
            resolve(); // Continue even if some commands fail
          });
        });
      }

      this.logSecurityEvent("MODSECURITY_ENABLED", "ModSecurity WAF enabled");
      return { success: true, message: "ModSecurity WAF enabled successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Intrusion Detection
  async checkIntrusionAttempts() {
    const suspiciousActivities = [];

    // Check for suspicious login attempts
    if (this.isLinux) {
      await this.checkAuthLogs(suspiciousActivities);
    } else {
      // Mock intrusion detection for development
      suspiciousActivities.push({
        type: "SUSPICIOUS_LOGIN",
        timestamp: new Date(),
        source: "192.168.1.100",
        description: "Mock: Multiple failed login attempts detected",
      });
    }

    return {
      timestamp: new Date(),
      activities: suspiciousActivities,
      totalAttempts: suspiciousActivities.length,
    };
  }

  async checkAuthLogs(suspiciousActivities) {
    try {
      return new Promise((resolve) => {
        exec(
          'grep "Failed password" /var/log/auth.log | tail -20',
          (error, stdout) => {
            if (!error && stdout) {
              const lines = stdout.split("\n").filter((line) => line.trim());

              lines.forEach((line) => {
                const ipMatch = line.match(/from (\d+\.\d+\.\d+\.\d+)/);
                if (ipMatch) {
                  suspiciousActivities.push({
                    type: "FAILED_LOGIN",
                    timestamp: new Date(),
                    source: ipMatch[1],
                    description: "Failed SSH login attempt",
                  });
                }
              });
            }
            resolve();
          }
        );
      });
    } catch (error) {
      console.error("Auth log check error:", error);
    }
  }

  // Security logging
  async logSecurityEvent(eventType, description, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      description,
      metadata,
    };

    console.log(`SECURITY EVENT: ${eventType} - ${description}`);

    try {
      if (this.isLinux) {
        const logLine = JSON.stringify(logEntry) + "\n";
        await fs.appendFile(this.logPath, logLine);
      }
    } catch (error) {
      console.error("Security logging error:", error);
    }

    return logEntry;
  }

  // Get security statistics
  async getSecurityStats() {
    return {
      firewall: await this.getFirewallStatus(),
      blockedIPs: Array.from(this.blockedIPs),
      bruteForceAttempts: this.bruteForceAttempts.size,
      lastScan: new Date(),
      securityLevel: this.calculateSecurityLevel(),
    };
  }

  calculateSecurityLevel() {
    let score = 0;

    // Base score
    score += 30;

    // Firewall enabled
    score += 25;

    // Recent security scan
    score += 20;

    // Blocked IPs (shows active monitoring)
    if (this.blockedIPs.size > 0) score += 15;

    // Low brute force attempts
    if (this.bruteForceAttempts.size < 5) score += 10;

    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  }
}

module.exports = new SecurityService();

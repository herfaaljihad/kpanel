const si = require("systeminformation");
const { queryHelpers, logActivity } = require("../config/database");
const schedule = require("node-schedule");

class MonitoringService {
  constructor() {
    this.monitoringInterval =
      parseInt(process.env.MONITORING_INTERVAL) || 300000; // 5 minutes
    this.retentionDays = parseInt(process.env.MONITORING_RETENTION_DAYS) || 30;
    this.alertThresholds = {
      cpu: parseInt(process.env.CPU_ALERT_THRESHOLD) || 80,
      memory: parseInt(process.env.MEMORY_ALERT_THRESHOLD) || 90,
      disk: parseInt(process.env.DISK_ALERT_THRESHOLD) || 90,
      load: parseFloat(process.env.LOAD_ALERT_THRESHOLD) || 5.0,
    };

    this.startMonitoring();
  }

  // Start system monitoring
  startMonitoring() {
    console.log("🔍 Starting system monitoring...");

    // Monitor every 5 minutes
    schedule.scheduleJob("*/5 * * * *", () => {
      this.collectSystemMetrics();
    });

    // Clean up old data daily
    schedule.scheduleJob("0 0 * * *", () => {
      this.cleanupOldMetrics();
    });

    // Initial collection
    this.collectSystemMetrics();
  }

  // Collect system metrics
  async collectSystemMetrics() {
    try {
      const timestamp = new Date();

      // Get system information
      const [cpu, memory, disk, network] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
      ]);

      // Try to get load (may not be available on Windows)
      let load = null;
      try {
        if (process.platform !== "win32") {
          load = await si.load();
        }
      } catch (loadError) {
        console.log("Load metrics not available on this platform");
      }

      // Store CPU metrics
      await this.storeMetric(null, null, "cpu", cpu.currentload, timestamp);

      // Store memory metrics
      const memoryUsage = (memory.used / memory.total) * 100;
      await this.storeMetric(null, null, "memory", memoryUsage, timestamp);

      // Store disk metrics for each filesystem
      for (const fs of disk) {
        if (fs.mount && fs.use > 0) {
          await this.storeMetric(null, null, "disk", fs.use, timestamp, {
            mount: fs.mount,
          });
        }
      }

      // Store load average
      await this.storeMetric(null, null, "load", load.avgload, timestamp);

      // Store network metrics
      if (network && network.length > 0) {
        const totalRx = network.reduce(
          (sum, iface) => sum + (iface.rx_sec || 0),
          0
        );
        const totalTx = network.reduce(
          (sum, iface) => sum + (iface.tx_sec || 0),
          0
        );

        await this.storeMetric(null, null, "network_rx", totalRx, timestamp);
        await this.storeMetric(null, null, "network_tx", totalTx, timestamp);
      }

      // Check for alerts
      await this.checkAlerts(cpu, memory, disk, load);
    } catch (error) {
      console.error("Failed to collect system metrics:", error);
    }
  }

  // Store metric in database
  async storeMetric(
    userId,
    domainId,
    metricType,
    value,
    timestamp,
    metadata = {}
  ) {
    try {
      await queryHelpers.safeInsert("resource_usage", {
        user_id: userId,
        domain_id: domainId,
        metric_type: metricType,
        metric_value: value,
        timestamp,
        metadata: JSON.stringify(metadata),
      });
    } catch (error) {
      console.error(`Failed to store metric ${metricType}:`, error);
    }
  }

  // Check alert thresholds
  async checkAlerts(cpu, memory, disk, load) {
    const alerts = [];

    // CPU alert
    if (cpu.currentload > this.alertThresholds.cpu) {
      alerts.push({
        type: "cpu",
        value: cpu.currentload,
        threshold: this.alertThresholds.cpu,
        message: `High CPU usage: ${cpu.currentload.toFixed(2)}%`,
      });
    }

    // Memory alert
    const memoryUsage = (memory.used / memory.total) * 100;
    if (memoryUsage > this.alertThresholds.memory) {
      alerts.push({
        type: "memory",
        value: memoryUsage,
        threshold: this.alertThresholds.memory,
        message: `High memory usage: ${memoryUsage.toFixed(2)}%`,
      });
    }

    // Disk alerts
    for (const fs of disk) {
      if (fs.use > this.alertThresholds.disk) {
        alerts.push({
          type: "disk",
          value: fs.use,
          threshold: this.alertThresholds.disk,
          message: `High disk usage on ${fs.mount}: ${fs.use.toFixed(2)}%`,
        });
      }
    }

    // Load average alert
    if (load.avgload > this.alertThresholds.load) {
      alerts.push({
        type: "load",
        value: load.avgload,
        threshold: this.alertThresholds.load,
        message: `High system load: ${load.avgload.toFixed(2)}`,
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  // Process system alert
  async processAlert(alert) {
    try {
      console.warn(`⚠️ SYSTEM ALERT: ${alert.message}`);

      // Log alert activity
      await logActivity(null, "system_alert", "system", null, alert);

      // Here you could send notifications to administrators
      // await this.sendAlertNotification(alert);
    } catch (error) {
      console.error("Failed to process alert:", error);
    }
  }

  // Get system stats for dashboard
  async getSystemStats() {
    try {
      const [cpu, memory, disk, load, uptime] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.load(),
        si.time(),
      ]);

      return {
        cpu: {
          usage: parseFloat(cpu.currentload.toFixed(2)),
          cores: cpu.cpus?.length || 1,
        },
        memory: {
          total: memory.total,
          used: memory.used,
          free: memory.free,
          usage: parseFloat(((memory.used / memory.total) * 100).toFixed(2)),
        },
        disk: disk.map((fs) => ({
          mount: fs.mount,
          size: fs.size,
          used: fs.used,
          available: fs.available,
          usage: parseFloat(fs.use.toFixed(2)),
        })),
        load: {
          current: parseFloat(load.currentload?.toFixed(2) || 0),
          avg: parseFloat(load.avgload?.toFixed(2) || 0),
        },
        uptime: uptime.uptime,
      };
    } catch (error) {
      console.error("Failed to get system stats:", error);
      return null;
    }
  }

  // Get user resource usage
  async getUserResourceUsage(userId, timeRange = "24h") {
    try {
      let interval, limit;

      switch (timeRange) {
        case "1h":
          interval = "5 MINUTE";
          limit = 12; // 12 points (5-minute intervals)
          break;
        case "24h":
          interval = "1 HOUR";
          limit = 24; // 24 points (hourly)
          break;
        case "7d":
          interval = "6 HOUR";
          limit = 28; // 28 points (6-hour intervals)
          break;
        case "30d":
          interval = "1 DAY";
          limit = 30; // 30 points (daily)
          break;
        default:
          interval = "1 HOUR";
          limit = 24;
      }

      const [usage] = await queryHelpers.pool.execute(
        `
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as time_bucket
        FROM resource_usage 
        WHERE user_id = ? 
          AND timestamp >= DATE_SUB(NOW(), INTERVAL ${limit} ${
          interval.split(" ")[1]
        })
        GROUP BY metric_type, time_bucket
        ORDER BY time_bucket ASC
        LIMIT ?
      `,
        [userId, limit * 10]
      ); // Multiply by estimated metric types

      // Group by metric type
      const metrics = {};
      for (const row of usage) {
        if (!metrics[row.metric_type]) {
          metrics[row.metric_type] = [];
        }
        metrics[row.metric_type].push({
          timestamp: row.time_bucket,
          average: parseFloat(row.avg_value.toFixed(2)),
          maximum: parseFloat(row.max_value.toFixed(2)),
        });
      }

      return metrics;
    } catch (error) {
      console.error(
        `Failed to get user resource usage for user ${userId}:`,
        error
      );
      return {};
    }
  }

  // Monitor domain-specific metrics
  async monitorDomainMetrics(domainId, userId) {
    try {
      // Get domain information
      const [domains] = await queryHelpers.safeSelect("domains", {
        where: { id: domainId, user_id: userId },
      });

      if (domains.length === 0) {
        throw new Error("Domain not found");
      }

      const domain = domains[0];
      const timestamp = new Date();

      // Monitor web server metrics (if available)
      const metrics = await this.getWebServerMetrics(domain.domain_name);

      if (metrics) {
        // Store domain-specific metrics
        await this.storeMetric(
          userId,
          domainId,
          "requests_per_second",
          metrics.requestsPerSecond,
          timestamp
        );
        await this.storeMetric(
          userId,
          domainId,
          "response_time",
          metrics.avgResponseTime,
          timestamp
        );
        await this.storeMetric(
          userId,
          domainId,
          "error_rate",
          metrics.errorRate,
          timestamp
        );
        await this.storeMetric(
          userId,
          domainId,
          "bandwidth",
          metrics.bandwidth,
          timestamp
        );
      }
    } catch (error) {
      console.error(
        `Failed to monitor domain metrics for domain ${domainId}:`,
        error
      );
    }
  }

  // Get web server metrics (placeholder - would integrate with actual web server)
  async getWebServerMetrics(domainName) {
    try {
      // This would integrate with Apache/Nginx stats
      // For now, return mock data
      return {
        requestsPerSecond: Math.random() * 100,
        avgResponseTime: Math.random() * 1000,
        errorRate: Math.random() * 5,
        bandwidth: Math.random() * 1024 * 1024, // bytes per second
      };
    } catch (error) {
      console.error(
        `Failed to get web server metrics for ${domainName}:`,
        error
      );
      return null;
    }
  }

  // Get process information
  async getProcessInfo() {
    try {
      const processes = await si.processes();

      // Filter and sort by CPU usage
      const topProcesses = processes.list
        .filter((p) => p.cpu > 0)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10)
        .map((p) => ({
          pid: p.pid,
          name: p.name,
          cpu: parseFloat(p.cpu.toFixed(2)),
          memory: p.mem,
          command: p.command,
        }));

      return {
        total: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
        top: topProcesses,
      };
    } catch (error) {
      console.error("Failed to get process info:", error);
      return null;
    }
  }

  // Get network information
  async getNetworkInfo() {
    try {
      const [interfaces, stats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats(),
      ]);

      return {
        interfaces: interfaces.map((iface) => ({
          name: iface.iface,
          ip4: iface.ip4,
          ip6: iface.ip6,
          mac: iface.mac,
          internal: iface.internal,
          virtual: iface.virtual,
        })),
        stats: stats.map((stat) => ({
          interface: stat.iface,
          rxBytes: stat.rx_bytes,
          txBytes: stat.tx_bytes,
          rxSec: stat.rx_sec,
          txSec: stat.tx_sec,
        })),
      };
    } catch (error) {
      console.error("Failed to get network info:", error);
      return null;
    }
  }

  // Clean up old metrics
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const result = await queryHelpers.pool.execute(
        "DELETE FROM resource_usage WHERE timestamp < ?",
        [cutoffDate]
      );

      console.log(`✅ Cleaned up ${result[0].affectedRows} old metric records`);
    } catch (error) {
      console.error("Failed to cleanup old metrics:", error);
    }
  }

  // Get resource usage summary
  async getResourceSummary(userId, period = "24h") {
    try {
      let timeInterval;
      switch (period) {
        case "1h":
          timeInterval = "INTERVAL 1 HOUR";
          break;
        case "24h":
          timeInterval = "INTERVAL 1 DAY";
          break;
        case "7d":
          timeInterval = "INTERVAL 7 DAY";
          break;
        case "30d":
          timeInterval = "INTERVAL 30 DAY";
          break;
        default:
          timeInterval = "INTERVAL 1 DAY";
      }

      const [summary] = await queryHelpers.pool.execute(
        `
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value,
          COUNT(*) as data_points
        FROM resource_usage 
        WHERE user_id = ? 
          AND timestamp >= DATE_SUB(NOW(), ${timeInterval})
        GROUP BY metric_type
      `,
        [userId]
      );

      const result = {};
      for (const row of summary) {
        result[row.metric_type] = {
          average: parseFloat(row.avg_value.toFixed(2)),
          maximum: parseFloat(row.max_value.toFixed(2)),
          minimum: parseFloat(row.min_value.toFixed(2)),
          dataPoints: row.data_points,
        };
      }

      return result;
    } catch (error) {
      console.error(
        `Failed to get resource summary for user ${userId}:`,
        error
      );
      return {};
    }
  }

  // Monitor specific user resources
  async monitorUserResources(userId) {
    try {
      const fileSystemService = require("./fileSystemService");

      // Get user disk usage
      const diskUsage = await fileSystemService.getDiskUsage(userId);

      // Get user's domains
      const [domains] = await queryHelpers.safeSelect("domains", {
        where: { user_id: userId, status: "active" },
      });

      // Get user's databases
      const [databases] = await queryHelpers.safeSelect("databases", {
        where: { user_id: userId, status: "active" },
      });

      const timestamp = new Date();

      // Store user-specific metrics
      await this.storeMetric(
        userId,
        null,
        "disk_usage",
        diskUsage.used,
        timestamp
      );
      await this.storeMetric(
        userId,
        null,
        "file_count",
        diskUsage.files,
        timestamp
      );
      await this.storeMetric(
        userId,
        null,
        "domain_count",
        domains.length,
        timestamp
      );
      await this.storeMetric(
        userId,
        null,
        "database_count",
        databases.length,
        timestamp
      );

      // Monitor each domain
      for (const domain of domains) {
        await this.monitorDomainMetrics(domain.id, userId);
      }
    } catch (error) {
      console.error(
        `Failed to monitor user resources for user ${userId}:`,
        error
      );
    }
  }

  // Get alert history
  async getAlertHistory(userId = null, limit = 50) {
    try {
      const whereClause = userId
        ? { user_id: userId, action: "system_alert" }
        : { action: "system_alert" };

      const [alerts] = await queryHelpers.safeSelect("activity_logs", {
        where: whereClause,
        orderBy: "created_at DESC",
        limit,
      });

      return alerts.map((alert) => ({
        id: alert.id,
        timestamp: alert.created_at,
        type: JSON.parse(alert.details || "{}").type || "unknown",
        message: JSON.parse(alert.details || "{}").message || "System alert",
        value: JSON.parse(alert.details || "{}").value,
        threshold: JSON.parse(alert.details || "{}").threshold,
      }));
    } catch (error) {
      console.error("Failed to get alert history:", error);
      return [];
    }
  }
}

module.exports = new MonitoringService();

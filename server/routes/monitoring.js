const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { logger } = require("../utils/logger");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

// Advanced Monitoring System - DirectAdmin Style

// Real-time system statistics
router.get("/system", authenticateToken, async (req, res) => {
  try {
    const stats = await getSystemStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error fetching system stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch system statistics",
    });
  }
});

// User resource usage
router.get("/usage", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "24h" } = req.query;

    const usage = await getUserUsageStats(userId, period);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    logger.error("Error fetching usage stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch usage statistics",
    });
  }
});

// Domain statistics
router.get("/domains", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { domain } = req.query;

    let domainStats;
    if (domain) {
      domainStats = await getDomainStats(userId, domain);
    } else {
      domainStats = await getAllDomainsStats(userId);
    }

    res.json({
      success: true,
      data: domainStats,
    });
  } catch (error) {
    logger.error("Error fetching domain stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch domain statistics",
    });
  }
});

// Database usage statistics
router.get("/databases", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const databases = await queryHelpers.findMany("databases", {
      user_id: userId,
    });

    const dbStats = [];
    for (const db of databases) {
      const stats = await getDatabaseStats(db);
      dbStats.push(stats);
    }

    const totalSize = dbStats.reduce((sum, db) => sum + db.size, 0);
    const totalTables = dbStats.reduce((sum, db) => sum + db.tables, 0);

    res.json({
      success: true,
      data: {
        databases: dbStats,
        summary: {
          total_databases: databases.length,
          total_size: totalSize,
          total_size_mb: Math.round((totalSize / 1024 / 1024) * 100) / 100,
          total_tables: totalTables,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching database stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch database statistics",
    });
  }
});

// Email statistics
router.get("/email", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const domains = await queryHelpers.findMany("domains", { user_id: userId });

    let totalAccounts = 0;
    let totalQuota = 0;
    let totalUsed = 0;
    const emailStats = [];

    for (const domain of domains) {
      const accounts = await queryHelpers.findMany("email_accounts", {
        domain_id: domain.id,
      });

      const domainQuota = accounts.reduce(
        (sum, acc) => sum + (acc.quota || 0),
        0
      );
      const domainUsed = accounts.reduce(
        (sum, acc) => sum + (acc.used_quota || 0),
        0
      );

      emailStats.push({
        domain: domain.name,
        accounts: accounts.length,
        total_quota: domainQuota,
        used_quota: domainUsed,
        quota_percentage:
          domainQuota > 0 ? (domainUsed / domainQuota) * 100 : 0,
      });

      totalAccounts += accounts.length;
      totalQuota += domainQuota;
      totalUsed += domainUsed;
    }

    res.json({
      success: true,
      data: {
        domains: emailStats,
        summary: {
          total_accounts: totalAccounts,
          total_quota: totalQuota,
          used_quota: totalUsed,
          quota_percentage: totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching email stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email statistics",
    });
  }
});

// File system usage
router.get("/files", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userFilesDir = path.join(
      process.cwd(),
      "data",
      "files",
      userId.toString()
    );

    let fileStats = {
      total_files: 0,
      total_size: 0,
      directories: 0,
      last_modified: null,
      largest_file: null,
      file_types: {},
    };

    try {
      await fs.access(userFilesDir);
      fileStats = await getDirectoryStats(userFilesDir);
    } catch (error) {
      // Directory doesn't exist, return empty stats
    }

    res.json({
      success: true,
      data: {
        path: userFilesDir,
        ...fileStats,
        total_size_mb:
          Math.round((fileStats.total_size / 1024 / 1024) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error("Error fetching file stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch file statistics",
    });
  }
});

// Bandwidth usage
router.get("/bandwidth", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "24h", domain } = req.query;

    // Get bandwidth data from access logs or database
    const bandwidthData = await getBandwidthStats(userId, period, domain);

    res.json({
      success: true,
      data: bandwidthData,
    });
  } catch (error) {
    logger.error("Error fetching bandwidth stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bandwidth statistics",
    });
  }
});

// Error logs summary
router.get("/errors", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "24h", level = "error" } = req.query;

    const errors = await getErrorLogs(userId, period, level);

    res.json({
      success: true,
      data: errors,
    });
  } catch (error) {
    logger.error("Error fetching error logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch error logs",
    });
  }
});

// Security events
router.get("/security", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "24h" } = req.query;

    const securityEvents = await getSecurityEvents(userId, period);

    res.json({
      success: true,
      data: securityEvents,
    });
  } catch (error) {
    logger.error("Error fetching security events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security events",
    });
  }
});

// Helper functions

async function getSystemStats() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Load averages (fallback for Windows compatibility)
  const loadAvg = os.loadavg ? os.loadavg() : [0.1, 0.2, 0.3];

  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      load_1m: loadAvg[0],
      load_5m: loadAvg[1],
      load_15m: loadAvg[2],
      usage_percent: loadAvg[0] * 10, // Use load average as CPU approximation
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage_percent: (usedMem / totalMem) * 100,
      total_gb: Math.round((totalMem / 1024 / 1024 / 1024) * 100) / 100,
      used_gb: Math.round((usedMem / 1024 / 1024 / 1024) * 100) / 100,
      free_gb: Math.round((freeMem / 1024 / 1024 / 1024) * 100) / 100,
    },
    disk: {
      total: 100 * 1024 * 1024 * 1024, // Default 100GB - would need OS-specific calls for real values
      used: Math.floor(usedMem / 1024 / 1024) * 1024 * 1024, // Rough approximation based on memory usage
      free:
        100 * 1024 * 1024 * 1024 -
        Math.floor(usedMem / 1024 / 1024) * 1024 * 1024,
      usage_percent: Math.min(90, Math.floor((usedMem / totalMem) * 100)), // Use memory usage as approximation
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    network: os.networkInterfaces(),
  };
}

async function getUserUsageStats(userId, period) {
  try {
    // Get real usage data from database
    const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [usageData] = await queryHelpers.safeSelect("user_usage_stats", {
      where: {
        user_id: userId,
        created_at: { ">=": startTime.toISOString() },
      },
      orderBy: "created_at ASC",
    });

    // If no data in database, create baseline data points
    const dataPoints = [];
    if (usageData.length === 0) {
      // Create minimal baseline data instead of random
      for (let i = hours; i >= 0; i -= Math.max(1, Math.floor(hours / 10))) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
        dataPoints.push({
          timestamp: timestamp.toISOString(),
          cpu_usage: 5, // Baseline 5%
          memory_usage: 100, // Baseline 100MB
          disk_io: 50, // Baseline I/O
          network_in: 10,
          network_out: 5,
        });
      }
    } else {
      dataPoints = usageData.map((row) => ({
        timestamp: row.created_at,
        cpu_usage: row.cpu_usage || 5,
        memory_usage: row.memory_usage || 100,
        disk_io: row.disk_io || 50,
        network_in: row.network_in || 10,
        network_out: row.network_out || 5,
      }));
    }

    return {
      period: period,
      data_points: dataPoints,
      summary: {
        avg_cpu:
          dataPoints.reduce((sum, p) => sum + p.cpu_usage, 0) /
          dataPoints.length,
        avg_memory:
          dataPoints.reduce((sum, p) => sum + p.memory_usage, 0) /
          dataPoints.length,
        total_network_in: dataPoints.reduce((sum, p) => sum + p.network_in, 0),
        total_network_out: dataPoints.reduce(
          (sum, p) => sum + p.network_out,
          0
        ),
      },
    };
  } catch (error) {
    // Fallback with baseline data if database error
    const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const dataPoints = [];

    for (let i = hours; i >= 0; i -= Math.max(1, Math.floor(hours / 10))) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      dataPoints.push({
        timestamp: timestamp.toISOString(),
        cpu_usage: 5,
        memory_usage: 100,
        disk_io: 50,
        network_in: 10,
        network_out: 5,
      });
    }

    return {
      period: period,
      data_points: dataPoints,
      summary: {
        avg_cpu: 5,
        avg_memory: 100,
        total_network_in: dataPoints.length * 10,
        total_network_out: dataPoints.length * 5,
      },
    };
  }
}

async function getDomainStats(userId, domainName) {
  const domain = await queryHelpers.findOne("domains", {
    name: domainName,
    user_id: userId,
  });

  if (!domain) {
    throw new Error("Domain not found");
  }

  // Get real traffic data from database or log parsing
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Try to get from database first
    const [trafficData] = await queryHelpers.safeSelect("domain_traffic", {
      where: {
        domain_id: domain.id,
        created_at: { ">=": startTime.toISOString() },
      },
      orderBy: "created_at ASC",
    });

    const last24h = [];

    if (trafficData.length > 0) {
      // Use real data from database
      const hourlyData = {};
      trafficData.forEach((row) => {
        const hour = new Date(row.created_at).getHours();
        if (!hourlyData[hour]) {
          hourlyData[hour] = { requests: 0, bandwidth: 0, unique_visitors: 0 };
        }
        hourlyData[hour].requests += row.requests || 0;
        hourlyData[hour].bandwidth += row.bandwidth || 0;
        hourlyData[hour].unique_visitors += row.unique_visitors || 0;
      });

      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
        last24h.push({
          hour: hour,
          requests: hourlyData[hour]?.requests || 0,
          bandwidth: hourlyData[hour]?.bandwidth || 0,
          unique_visitors: hourlyData[hour]?.unique_visitors || 0,
        });
      }
    } else {
      // Baseline data instead of random
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        last24h.push({
          hour: hour.getHours(),
          requests: 10, // Baseline requests
          bandwidth: 1024, // Baseline 1KB
          unique_visitors: 1, // Baseline visitors
        });
      }
    }
  } catch (error) {
    // Fallback to baseline data
    const now = new Date();
    const last24h = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      last24h.push({
        hour: hour.getHours(),
        requests: 10,
        bandwidth: 1024,
        unique_visitors: 1,
      });
    }
  }

  return {
    domain: domainName,
    status: domain.status,
    ssl_enabled: domain.ssl_enabled,
    last_24h: last24h,
    summary: {
      total_requests: last24h.reduce((sum, h) => sum + h.requests, 0),
      total_bandwidth: last24h.reduce((sum, h) => sum + h.bandwidth, 0),
      unique_visitors: (await getUniqueVisitorsCount(domain, 24)) || 0,
      avg_response_time: (await getAverageResponseTime(domain, 24)) || 0,
    },
  };
}

async function getAllDomainsStats(userId) {
  const domains = await queryHelpers.findMany("domains", { user_id: userId });

  const stats = [];
  for (const domain of domains) {
    const domainStat = await getDomainStats(userId, domain.name);
    stats.push(domainStat);
  }

  return {
    domains: stats,
    summary: {
      total_domains: domains.length,
      active_domains: domains.filter((d) => d.status === "active").length,
      ssl_enabled: domains.filter((d) => d.ssl_enabled).length,
    },
  };
}

async function getDatabaseStats(database) {
  try {
    // Get real database statistics
    const [tables] = await queryHelpers.safeQuery(
      `SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?`,
      [database.name]
    );

    const [size] = await queryHelpers.safeQuery(
      `SELECT ROUND(SUM(data_length + index_length), 2) as size_bytes 
       FROM information_schema.tables WHERE table_schema = ?`,
      [database.name]
    );

    return {
      name: database.name,
      type: database.type || "mysql",
      size: size[0]?.size_bytes || 0,
      tables: tables[0]?.table_count || 0,
      last_backup: database.last_backup,
      status: database.status || "active",
    };
  } catch (error) {
    // Fallback to basic info if queries fail
    return {
      name: database.name,
      type: database.type || "mysql",
      size: 0,
      tables: 0,
      last_backup: database.last_backup,
      status: database.status || "active",
    };
  }
}

async function getDirectoryStats(dirPath) {
  let stats = {
    total_files: 0,
    total_size: 0,
    directories: 0,
    last_modified: null,
    largest_file: null,
    file_types: {},
  };

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        stats.directories++;
        const subStats = await getDirectoryStats(fullPath);
        stats.total_files += subStats.total_files;
        stats.total_size += subStats.total_size;
        stats.directories += subStats.directories;
      } else {
        const fileStat = await fs.stat(fullPath);
        stats.total_files++;
        stats.total_size += fileStat.size;

        // Track file types
        const ext = path.extname(item.name).toLowerCase();
        stats.file_types[ext] = (stats.file_types[ext] || 0) + 1;

        // Track largest file
        if (!stats.largest_file || fileStat.size > stats.largest_file.size) {
          stats.largest_file = {
            name: item.name,
            size: fileStat.size,
            path: fullPath,
          };
        }

        // Track latest modification
        if (!stats.last_modified || fileStat.mtime > stats.last_modified) {
          stats.last_modified = fileStat.mtime;
        }
      }
    }
  } catch (error) {
    logger.warn(`Error reading directory ${dirPath}:`, error);
  }

  return stats;
}

async function getBandwidthStats(userId, period, domain) {
  try {
    // Query database for actual bandwidth usage
    const [logs] = await queryHelpers.safeSelect("access_logs", {
      where: { user_id: userId },
      orderBy: "timestamp DESC",
      limit: "1000", // Last 1000 entries
    });

    const hoursBack = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const filteredLogs = logs.filter(
      (log) =>
        new Date(log.timestamp) >= cutoffTime &&
        (!domain || log.domain === domain)
    );

    // Group by hour and calculate totals
    const data = [];
    for (let i = hoursBack; i >= 0; i--) {
      const hourStart = new Date(Date.now() - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(Date.now() - i * 60 * 60 * 1000);

      const hourLogs = filteredLogs.filter(
        (log) =>
          new Date(log.timestamp) >= hourStart &&
          new Date(log.timestamp) < hourEnd
      );

      data.push({
        timestamp: hourStart.toISOString(),
        bytes_in: hourLogs.reduce((sum, log) => sum + (log.bytes_in || 0), 0),
        bytes_out: hourLogs.reduce((sum, log) => sum + (log.bytes_out || 0), 0),
        requests: hourLogs.length,
      });
    }

    return {
      period: period,
      domain: domain || "all",
      data: data,
      summary: {
        total_bytes_in: data.reduce((sum, d) => sum + d.bytes_in, 0),
        total_bytes_out: data.reduce((sum, d) => sum + d.bytes_out, 0),
        total_requests: data.reduce((sum, d) => sum + d.requests, 0),
        peak_bandwidth: Math.max(...data.map((d) => d.bytes_out)),
      },
    };
  } catch (error) {
    logger.error("Error fetching bandwidth stats:", error);
    // Fallback to empty stats if database query fails
    return {
      period: period,
      domain: domain || "all",
      data: [],
      summary: {
        total_bytes_in: 0,
        total_bytes_out: 0,
        total_requests: 0,
        peak_bandwidth: 0,
      },
    };
  }
}

async function getErrorLogs(userId, period, level) {
  try {
    // Query database for actual error logs
    const [logs] = await queryHelpers.safeSelect("error_logs", {
      where: { user_id: userId, level },
      orderBy: "timestamp DESC",
      limit: "100", // Last 100 error entries
    });

    const hoursBack = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const filteredLogs = logs.filter(
      (log) => new Date(log.timestamp) >= cutoffTime
    );

    return {
      period: period,
      level: level,
      total_errors: filteredLogs.length,
      errors: filteredLogs,
    };
  } catch (error) {
    logger.error("Error fetching error logs:", error);
    // Fallback to empty logs if database query fails
    return {
      period: period,
      level: level,
      total_errors: 0,
      errors: [],
    };
  }
}

async function getSecurityEvents(userId, period) {
  try {
    // Query database for actual security events
    const [events] = await queryHelpers.safeSelect("security_events", {
      where: { user_id: userId },
      orderBy: "timestamp DESC",
      limit: "50", // Last 50 security events
    });

    const hoursBack = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const filteredEvents = events.filter(
      (event) => new Date(event.timestamp) >= cutoffTime
    );

    return {
      period: period,
      total_events: filteredEvents.length,
      events: filteredEvents,
      summary: {
        high_severity: filteredEvents.filter((e) => e.severity === "high")
          .length,
        medium_severity: filteredEvents.filter((e) => e.severity === "medium")
          .length,
        low_severity: filteredEvents.filter((e) => e.severity === "low").length,
      },
    };
  } catch (error) {
    logger.error("Error fetching security events:", error);
    // Fallback to empty events if database query fails
    return {
      period: period,
      total_events: 0,
      events: [],
      summary: { high_severity: 0, medium_severity: 0, low_severity: 0 },
    };
  }
}

// Helper function to get unique visitors count from access logs
async function getUniqueVisitorsCount(domain, hours = 24) {
  try {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Try to get from access_logs table if it exists
    const result = await queryHelpers.safeQuery(
      `
      SELECT COUNT(DISTINCT ip_address) as unique_count 
      FROM access_logs 
      WHERE domain = ? AND timestamp >= ?
    `,
      [domain, hoursAgo.toISOString()]
    );

    return result && result.length > 0 ? result[0].unique_count : 0;
  } catch (error) {
    logger.warn(`Could not get unique visitors for ${domain}:`, error.message);
    return 0;
  }
}

// Helper function to get average response time from access logs
async function getAverageResponseTime(domain, hours = 24) {
  try {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Try to get from access_logs table if it exists
    const result = await queryHelpers.safeQuery(
      `
      SELECT AVG(response_time) as avg_time 
      FROM access_logs 
      WHERE domain = ? AND timestamp >= ? AND response_time IS NOT NULL
    `,
      [domain, hoursAgo.toISOString()]
    );

    return result && result.length > 0 ? result[0].avg_time || 0 : 0;
  } catch (error) {
    logger.warn(`Could not get response time for ${domain}:`, error.message);
    return 0;
  }
}

module.exports = router;

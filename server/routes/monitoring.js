const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
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

    // Mock bandwidth data (in production, parse access logs)
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

  // Mock load averages for Windows compatibility
  const loadAvg = os.loadavg ? os.loadavg() : [0.1, 0.2, 0.3];

  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      load_1m: loadAvg[0],
      load_5m: loadAvg[1],
      load_15m: loadAvg[2],
      usage_percent: Math.random() * 20 + 10, // Mock CPU usage
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
      total: 100 * 1024 * 1024 * 1024, // Mock 100GB
      used: 45 * 1024 * 1024 * 1024, // Mock 45GB used
      free: 55 * 1024 * 1024 * 1024, // Mock 55GB free
      usage_percent: 45,
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    network: os.networkInterfaces(),
  };
}

async function getUserUsageStats(userId, period) {
  // Mock usage data
  const now = new Date();
  const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;

  const dataPoints = [];
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    dataPoints.push({
      timestamp: timestamp.toISOString(),
      cpu_usage: Math.random() * 30 + 5,
      memory_usage: Math.random() * 100 + 50,
      disk_io: Math.random() * 1000 + 100,
      network_in: Math.random() * 500 + 50,
      network_out: Math.random() * 300 + 30,
    });
  }

  return {
    period: period,
    data_points: dataPoints,
    summary: {
      avg_cpu:
        dataPoints.reduce((sum, p) => sum + p.cpu_usage, 0) / dataPoints.length,
      avg_memory:
        dataPoints.reduce((sum, p) => sum + p.memory_usage, 0) /
        dataPoints.length,
      total_network_in: dataPoints.reduce((sum, p) => sum + p.network_in, 0),
      total_network_out: dataPoints.reduce((sum, p) => sum + p.network_out, 0),
    },
  };
}

async function getDomainStats(userId, domainName) {
  const domain = await queryHelpers.findOne("domains", {
    name: domainName,
    user_id: userId,
  });

  if (!domain) {
    throw new Error("Domain not found");
  }

  // Mock traffic data
  const now = new Date();
  const last24h = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    last24h.push({
      hour: hour.getHours(),
      requests: Math.floor(Math.random() * 1000 + 100),
      bandwidth: Math.floor(Math.random() * 1024 * 1024 + 100000),
      unique_visitors: Math.floor(Math.random() * 100 + 10),
    });
  }

  return {
    domain: domainName,
    status: domain.status,
    ssl_enabled: domain.ssl_enabled,
    last_24h: last24h,
    summary: {
      total_requests: last24h.reduce((sum, h) => sum + h.requests, 0),
      total_bandwidth: last24h.reduce((sum, h) => sum + h.bandwidth, 0),
      unique_visitors: Math.floor(Math.random() * 500 + 100),
      avg_response_time: Math.random() * 500 + 100,
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
  // Mock database statistics
  return {
    name: database.name,
    type: database.type || "mysql",
    size: Math.floor(Math.random() * 100 * 1024 * 1024), // Random size up to 100MB
    tables: Math.floor(Math.random() * 20 + 5),
    last_backup: database.last_backup,
    status: database.status || "active",
  };
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
  // Mock bandwidth data
  const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;
  const data = [];

  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
    data.push({
      timestamp: timestamp.toISOString(),
      bytes_in: Math.floor(Math.random() * 1024 * 1024),
      bytes_out: Math.floor(Math.random() * 1024 * 1024 * 5),
      requests: Math.floor(Math.random() * 100 + 10),
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
}

async function getErrorLogs(userId, period, level) {
  // Mock error log data
  const errors = [];
  const count = Math.floor(Math.random() * 20 + 5);

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000
    );
    errors.push({
      timestamp: timestamp.toISOString(),
      level: level,
      message: `Sample error message ${i + 1}`,
      source: "apache",
      domain: "example.com",
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    });
  }

  return {
    period: period,
    level: level,
    total_errors: errors.length,
    errors: errors.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    ),
  };
}

async function getSecurityEvents(userId, period) {
  // Mock security events
  const events = [];
  const eventTypes = [
    "login_attempt",
    "failed_login",
    "file_access",
    "permission_change",
  ];
  const count = Math.floor(Math.random() * 10 + 2);

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000
    );
    events.push({
      timestamp: timestamp.toISOString(),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      severity:
        Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      details: `Security event details ${i + 1}`,
    });
  }

  return {
    period: period,
    total_events: events.length,
    events: events.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    ),
    summary: {
      high_severity: events.filter((e) => e.severity === "high").length,
      medium_severity: events.filter((e) => e.severity === "medium").length,
      low_severity: events.filter((e) => e.severity === "low").length,
    },
  };
}

module.exports = router;


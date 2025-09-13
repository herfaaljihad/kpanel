const express = require("express");
const router = express.Router();
const os = require("os");

// System monitoring metrics
router.get("/metrics", (req, res) => {
  const metrics = {
    cpu: {
      usage: Math.floor(Math.random() * 80) + 10, // 10-90%
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || "Unknown",
      speed: os.cpus()[0]?.speed || 0,
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
    },
    disk: {
      usage: Math.floor(Math.random() * 70) + 20, // 20-90%
      total: "100GB",
      free: "40GB",
      used: "60GB",
    },
    network: {
      in: Math.floor(Math.random() * 1000) + 100,
      out: Math.floor(Math.random() * 800) + 50,
      connections: Math.floor(Math.random() * 200) + 50,
    },
    load: {
      onemin: os.loadavg()[0],
      fivemin: os.loadavg()[1],
      fifteenmin: os.loadavg()[2],
    },
    processes: {
      total: Math.floor(Math.random() * 200) + 100,
      running: Math.floor(Math.random() * 20) + 5,
      sleeping: Math.floor(Math.random() * 150) + 80,
    },
    uptime: os.uptime(),
  };

  res.json({
    success: true,
    data: metrics,
  });
});

// System logs with filtering
router.get("/logs", (req, res) => {
  const { service = "all", level = "all", limit = 50 } = req.query;

  const logs = [
    {
      timestamp: new Date().toISOString(),
      service: "nginx",
      level: "info",
      message: "Server started successfully",
      details: "Nginx web server is running on port 80",
    },
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      service: "mysql",
      level: "info",
      message: "Database connection established",
      details: "MySQL database is ready to accept connections",
    },
    {
      timestamp: new Date(Date.now() - 600000).toISOString(),
      service: "system",
      level: "warning",
      message: "High memory usage detected",
      details: "Memory usage is above 80%",
    },
    {
      timestamp: new Date(Date.now() - 900000).toISOString(),
      service: "kpanel",
      level: "info",
      message: "User login successful",
      details: "Admin user logged in from 127.0.0.1",
    },
    {
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      service: "php-fpm",
      level: "info",
      message: "PHP-FPM process started",
      details: "PHP-FPM is running with 4 worker processes",
    },
  ];

  // Filter by service and level
  let filteredLogs = logs;
  if (service !== "all") {
    filteredLogs = filteredLogs.filter((log) => log.service === service);
  }
  if (level !== "all") {
    filteredLogs = filteredLogs.filter((log) => log.level === level);
  }

  // Apply limit
  filteredLogs = filteredLogs.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      logs: filteredLogs,
      total: filteredLogs.length,
      filters: {
        service,
        level,
        limit: parseInt(limit),
      },
    },
  });
});

// System alerts
router.get("/alerts", (req, res) => {
  const alerts = [
    {
      id: 1,
      type: "warning",
      title: "High CPU Usage",
      message: "CPU usage has been above 80% for the last 5 minutes",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: "medium",
      resolved: false,
    },
    {
      id: 2,
      type: "info",
      title: "Backup Completed",
      message: "Daily backup completed successfully",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: "low",
      resolved: true,
    },
    {
      id: 3,
      type: "error",
      title: "SSL Certificate Expiring",
      message: "SSL certificate for example.com will expire in 7 days",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      severity: "high",
      resolved: false,
    },
  ];

  res.json({
    success: true,
    data: {
      alerts,
      summary: {
        total: alerts.length,
        unresolved: alerts.filter((a) => !a.resolved).length,
        critical: alerts.filter((a) => a.severity === "high").length,
      },
    },
  });
});

// Real-time system stats
router.get("/stats", (req, res) => {
  const stats = {
    timestamp: new Date().toISOString(),
    cpu: Math.floor(Math.random() * 80) + 10,
    memory: Math.floor(Math.random() * 90) + 10,
    disk: Math.floor(Math.random() * 70) + 20,
    network_in: Math.floor(Math.random() * 1000) + 100,
    network_out: Math.floor(Math.random() * 800) + 50,
    active_connections: Math.floor(Math.random() * 200) + 50,
    response_time: Math.floor(Math.random() * 100) + 10,
  };

  res.json({
    success: true,
    data: stats,
  });
});

module.exports = router;

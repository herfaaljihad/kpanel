/**
const express = require('express');
const router = express.Router();

// Authentication routes
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple mock authentication
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@kpanel.local',
        role: 'admin'
      },
      token: 'mock-jwt-token-' + Date.now()
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

router.get('/auth/me', (req, res) => {
  // Mock user info endpoint
  res.json({
    success: true,
    user: {
      id: 1,
      username: 'admin',
      email: 'admin@kpanel.local',
      role: 'admin'
    }
  });
});

router.post('/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Mock data generatorsasic API Routes for Frontend Compatibility
 * Provides mock responses for routes that frontend expects
 */

const express = require("express");
const router = express.Router();

// Mock data generators
const generateMockStats = () => ({
  domains: Math.floor(Math.random() * 50) + 10,
  databases: Math.floor(Math.random() * 30) + 5,
  emails: Math.floor(Math.random() * 100) + 20,
  diskUsage: Math.floor(Math.random() * 80) + 10,
  cpuUsage: Math.floor(Math.random() * 60) + 10,
  memoryUsage: Math.floor(Math.random() * 70) + 20,
  bandwidth: Math.floor(Math.random() * 500) + 100,
  uptime: Date.now() - Math.floor(Math.random() * 1000000) * 1000,
  activeConnections: Math.floor(Math.random() * 100) + 10,
  lastUpdate: new Date().toISOString(),
});

const generateMockList = (itemType, count = 5) => {
  const items = [];
  for (let i = 1; i <= count; i++) {
    items.push({
      id: i,
      name: `${itemType}-${i}`,
      status: Math.random() > 0.3 ? "active" : "inactive",
      created: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      updated: new Date().toISOString(),
    });
  }
  return items;
};

// Domains routes
router.get("/domains", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("domain", 8).map((item) => ({
      ...item,
      domain: `example${item.id}.com`,
      ssl: Math.random() > 0.5,
      redirects: Math.floor(Math.random() * 5),
      documentRoot: `/var/www/${item.name}`,
    })),
  });
});

router.post("/domains", (req, res) => {
  res.json({
    success: true,
    message: "Domain created successfully",
    data: { id: Date.now(), ...req.body },
  });
});

// Websites routes
router.get("/websites", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("website", 12).map((item) => ({
      ...item,
      domain: `website${item.id}.com`,
      path: `/var/www/website${item.id}`,
      ssl: Math.random() > 0.3,
      status: Math.random() > 0.1 ? "active" : "suspended",
      lastBackup: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      diskUsage: Math.floor(Math.random() * 1000) + 100,
      bandwidth: Math.floor(Math.random() * 5000) + 500,
    })),
  });
});

router.post("/websites", (req, res) => {
  res.json({
    success: true,
    message: "Website created successfully",
    data: { id: Date.now(), ...req.body },
  });
});

// Email routes
router.get("/emails", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("email", 25).map((item) => ({
      ...item,
      email: `email${item.id}@example.com`,
      domain: `example${Math.floor(Math.random() * 5) + 1}.com`,
      quota: `${Math.floor(Math.random() * 500) + 100}MB`,
      used: `${Math.floor(Math.random() * 200) + 10}MB`,
      forwards: Math.floor(Math.random() * 3),
      autoresponder: Math.random() > 0.7,
      lastLogin: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
  });
});

router.post("/emails", (req, res) => {
  res.json({
    success: true,
    message: "Email account created successfully",
    data: { id: Date.now(), ...req.body },
  });
});

// System Config routes
router.get("/system-config/:type", (req, res) => {
  const { type } = req.params;
  const configs = {
    info: {
      server: "nginx/1.20.1",
      php: "8.1.10",
      mysql: "8.0.30",
      os: "Ubuntu 22.04.1 LTS",
    },
    webserver: {
      type: "nginx",
      version: "1.20.1",
      status: "running",
      configs: ["default", "kpanel"],
    },
    php: {
      version: "8.1.10",
      extensions: ["mysql", "gd", "curl", "xml", "json"],
      status: "running",
    },
    services: [
      { name: "nginx", status: "running", uptime: "5 days" },
      { name: "mysql", status: "running", uptime: "5 days" },
      { name: "php8.1-fpm", status: "running", uptime: "5 days" },
    ],
    health: {
      overall: "healthy",
      services: "all running",
      disk: "65% used",
      memory: "45% used",
    },
  };

  res.json({
    success: true,
    data: configs[type] || {},
  });
});

// Security routes
router.get("/security/:type", (req, res) => {
  const { type } = req.params;
  const securityData = {
    firewall: { status: "active", rules: 15, blockedIPs: 3 },
    "ip-blocks": generateMockList("blocked-ip", 3),
    "login-attempts": generateMockList("login-attempt", 10),
    scans: { lastScan: new Date().toISOString(), threats: 0 },
    alerts: generateMockList("security-alert", 2),
    "two-factor": { enabled: false, users: 0 },
    logs: generateMockList("security-log", 20),
    statistics: { blockedAttempts: 45, successfulLogins: 120 },
  };

  res.json({
    success: true,
    data: securityData[type] || [],
  });
});

// SSL routes
router.get("/ssl/:type", (req, res) => {
  const { type } = req.params;
  const sslData = {
    certificates: generateMockList("ssl-cert", 3).map((cert) => ({
      ...cert,
      domain: `example${cert.id}.com`,
      issuer: "Let's Encrypt",
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })),
    statistics: { total: 3, expired: 0, expiring: 1 },
    config: { autoRenew: true, provider: "letsencrypt" },
  };

  res.json({
    success: true,
    data: sslData[type] || {},
  });
});

// FTP routes
router.get("/ftp/:type", (req, res) => {
  const { type } = req.params;
  const ftpData = {
    accounts: generateMockList("ftp-user", 5),
    sessions: generateMockList("ftp-session", 8),
    statistics: { totalAccounts: 5, activeSessions: 2 },
    config: { enabled: true, port: 21, pasv: true },
  };

  res.json({
    success: true,
    data: ftpData[type] || {},
  });
});

// Cron routes
router.get("/cron/:type", (req, res) => {
  const { type } = req.params;
  const cronData = {
    jobs: generateMockList("cron-job", 6).map((job) => ({
      ...job,
      command: "/usr/bin/backup.sh",
      schedule: "0 2 * * *",
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })),
    templates: [
      { id: 1, name: "Daily Backup", schedule: "0 2 * * *" },
      { id: 2, name: "Weekly Cleanup", schedule: "0 3 * * 0" },
      { id: 3, name: "Monthly Report", schedule: "0 4 1 * *" },
    ],
    statistics: { total: 6, active: 4, lastRun: new Date().toISOString() },
  };

  res.json({
    success: true,
    data: cronData[type] || {},
  });
});

// DNS routes
router.get("/dns/:type", (req, res) => {
  const { type } = req.params;
  const dnsData = {
    zones: generateMockList("dns-zone", 4).map((zone) => ({
      ...zone,
      domain: `example${zone.id}.com`,
      records: Math.floor(Math.random() * 10) + 5,
    })),
    templates: [
      { id: 1, name: "Basic Web", description: "Standard web hosting DNS" },
      { id: 2, name: "Email Server", description: "DNS for email hosting" },
      { id: 3, name: "CDN Ready", description: "Optimized for CDN usage" },
    ],
  };

  res.json({
    success: true,
    data: dnsData[type] || {},
  });
});

// Users routes
router.get("/users/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 15,
      activeUsers: 12,
      newUsersToday: 3,
      totalLogins: 128,
      averageLoginTime: "2.5 minutes",
      usersByPackage: [
        { package: "Basic", count: 8 },
        { package: "Standard", count: 4 },
        { package: "Premium", count: 3 },
      ],
      topUsers: generateMockList("user", 5).map((user) => ({
        ...user,
        email: `user${user.id}@example.com`,
        loginCount: Math.floor(Math.random() * 50) + 10,
        lastLogin: new Date(
          Date.now() - Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(),
      })),
    },
  });
});

router.get("/users", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("user", 15).map((user) => ({
      ...user,
      email: `user${user.id}@example.com`,
      package: `package-${Math.floor(Math.random() * 3) + 1}`,
      lastLogin: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: Math.random() > 0.2 ? "active" : "inactive",
    })),
  });
});

// Admin routes - ensure all return proper array/object format
router.get("/admin", (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: 15,
        activeUsers: 12,
        totalPackages: 8,
        activePackages: 6,
        systemLoad: 0.45,
        diskUsage: 65,
      },
      recentActivity: generateMockList("activity", 5).map((activity) => ({
        ...activity,
        action: `Action ${activity.id}`,
        user: `user${activity.id}@example.com`,
        timestamp: new Date(
          Date.now() - Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(),
      })),
    },
  });
});

// Specific admin endpoints MUST come before parameterized route to prevent conflicts
router.get("/admin/dashboard", (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: 15,
        activeUsers: 12,
        totalPackages: 8,
        activePackages: 6,
        systemLoad: 0.45,
        diskUsage: 65,
      },
      recentUsers: generateMockList("user", 5).map((user) => ({
        ...user,
        email: `user${user.id}@example.com`,
        lastLogin: new Date(
          Date.now() - Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(),
      })),
      systemAlerts: [
        {
          id: 1,
          message: "System load is normal",
          type: "info",
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          message: "Backup completed successfully",
          type: "success",
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });
});

router.get("/admin/reports", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("report", 8).map((report) => ({
      ...report,
      title: `Report ${report.id}`,
      type: ["usage", "security", "performance", "backup"][
        Math.floor(Math.random() * 4)
      ],
      generated: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
  });
});

router.get("/admin/:type", (req, res) => {
  const { type } = req.params;
  const adminData = {
    stats: {
      totalUsers: 15,
      activeUsers: 12,
      totalPackages: 8,
      activePackages: 6,
      systemLoad: 0.45,
      diskUsage: 65,
    },
    users: generateMockList("user", 12).map((user) => ({
      ...user,
      email: `user${user.id}@example.com`,
      package: `package-${Math.floor(Math.random() * 3) + 1}`,
      lastLogin: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
    packages: [
      { id: 1, name: "Basic", domains: 5, disk: "10GB", price: "$9.99" },
      { id: 2, name: "Standard", domains: 15, disk: "50GB", price: "$19.99" },
      { id: 3, name: "Premium", domains: -1, disk: "100GB", price: "$39.99" },
    ],
  };

  // Return the correct data based on type, with proper fallbacks
  let responseData;
  if (adminData[type]) {
    responseData = adminData[type];
  } else {
    // Return appropriate fallback based on common admin data types
    if (type === "users" || type === "packages") {
      responseData = []; // Arrays for list endpoints
    } else {
      responseData = {}; // Objects for stats/info endpoints
    }
  }

  res.json({
    success: true,
    data: responseData,
  });
});

// Additional routes that might be called by frontend
router.get("/overview/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      websites: 12,
      domains: 8,
      databases: 15,
      emails: 25,
      backups: 5,
      sslCertificates: 8,
    },
  });
});

router.get("/activity", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("activity", 10).map((activity) => ({
      ...activity,
      action: `System activity ${activity.id}`,
      description: `Activity description for item ${activity.id}`,
      timestamp: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      type: ["login", "backup", "update", "error", "info"][
        Math.floor(Math.random() * 5)
      ],
    })),
  });
});

router.get("/notifications", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("notification", 5).map((notification) => ({
      ...notification,
      title: `Notification ${notification.id}`,
      message: `This is notification message ${notification.id}`,
      type: ["info", "warning", "error", "success"][
        Math.floor(Math.random() * 4)
      ],
      read: Math.random() > 0.5,
      timestamp: new Date(
        Date.now() - Math.random() * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
  });
});

// System stats route (used by Overview)
router.get("/stats", (req, res) => {
  res.json({
    success: true,
    data: generateMockStats(),
  });
});

// System updates route
router.get("/system/updates", (req, res) => {
  res.json({
    success: true,
    data: {
      available: Math.floor(Math.random() * 5),
      security: Math.floor(Math.random() * 2),
      packages: generateMockList("package-update", 3),
      lastCheck: new Date().toISOString(),
    },
  });
});

// System monitoring route
router.get("/system/monitoring", (req, res) => {
  res.json({
    success: true,
    data: {
      cpu: Math.floor(Math.random() * 80) + 10,
      memory: Math.floor(Math.random() * 80) + 10,
      disk: Math.floor(Math.random() * 80) + 10,
      network: {
        in: Math.floor(Math.random() * 1000) + 100,
        out: Math.floor(Math.random() * 800) + 50,
      },
      processes: Math.floor(Math.random() * 200) + 50,
      uptime: Math.floor(Math.random() * 1000000) + 100000,
    },
  });
});

// Backups route
router.get("/backups", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("backup", 7).map((backup) => ({
      ...backup,
      size: `${Math.floor(Math.random() * 500) + 50}MB`,
      type: Math.random() > 0.5 ? "full" : "incremental",
    })),
  });
});

// Email routes
router.get("/email", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("email-account", 10).map((email) => ({
      ...email,
      email: `user${email.id}@example.com`,
      quota: `${Math.floor(Math.random() * 5) + 1}GB`,
      used: `${Math.floor(Math.random() * 800) + 100}MB`,
    })),
  });
});

// Databases route
router.get("/databases", (req, res) => {
  res.json({
    success: true,
    data: generateMockList("database", 6).map((db) => ({
      ...db,
      type: Math.random() > 0.5 ? "MySQL" : "PostgreSQL",
      size: `${Math.floor(Math.random() * 100) + 10}MB`,
      tables: Math.floor(Math.random() * 20) + 5,
    })),
  });
});

// Catch-all for any missing routes - MOVED TO BOTTOM TO PREVENT OVERRIDING SPECIFIC ROUTES
// These should be at the very end so they don't override specific routes above

module.exports = router;

const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Mock data for security features
const mockSecurityStats = {
  firewall: {
    status: "active",
    rules: 15,
    blocked_ips: 3,
    allowed_ips: 8,
  },
  intrusion_detection: {
    status: "active",
    alerts_today: 2,
    blocked_attempts: 12,
  },
  ssl_certificates: {
    active: 5,
    expiring_soon: 1,
    expired: 0,
  },
  two_factor_auth: {
    enabled_users: 8,
    total_users: 12,
    percentage: 67,
  },
};

const mockSecurityLogs = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    type: "firewall_block",
    severity: "medium",
    message: "Blocked IP 192.168.1.100 - too many failed login attempts",
    source_ip: "192.168.1.100",
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: "ssl_renewal",
    severity: "info",
    message: "SSL certificate renewed for domain.com",
    domain: "domain.com",
  },
];

// Get security dashboard overview
router.get("/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        statistics: mockSecurityStats,
        recent_logs: mockSecurityLogs.slice(0, 5),
        alerts: [
          {
            id: 1,
            type: "ssl_expiring",
            message: "SSL certificate for example.com expires in 7 days",
            severity: "warning",
          },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch security dashboard",
      error: error.message,
    });
  }
});

// Firewall Management
router.get("/firewall", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const firewallRules = [
      { id: 1, rule: "ALLOW FROM 192.168.1.0/24", type: "allow", active: true },
      { id: 2, rule: "BLOCK FROM 10.0.0.1", type: "block", active: true },
      { id: 3, rule: "ALLOW PORT 80", type: "port", active: true },
    ];

    res.json({
      success: true,
      data: {
        status: "active",
        rules: firewallRules,
        statistics: mockSecurityStats.firewall,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch firewall settings",
      error: error.message,
    });
  }
});

router.post(
  "/firewall/rules",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { rule, type, description } = req.body;

      // Mock rule creation
      const newRule = {
        id: Date.now(),
        rule,
        type,
        description,
        active: true,
        created_at: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: "Firewall rule added successfully",
        data: newRule,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add firewall rule",
        error: error.message,
      });
    }
  }
);

// IP Blocking Management
router.get(
  "/ip-blocking",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const blockedIPs = [
        {
          id: 1,
          ip: "192.168.1.100",
          reason: "Brute force attack",
          blocked_at: new Date().toISOString(),
        },
        {
          id: 2,
          ip: "10.0.0.50",
          reason: "Suspicious activity",
          blocked_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      res.json({
        success: true,
        data: blockedIPs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch blocked IPs",
        error: error.message,
      });
    }
  }
);

router.post(
  "/ip-blocking",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { ip, reason } = req.body;

      const newBlock = {
        id: Date.now(),
        ip,
        reason,
        blocked_at: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: "IP blocked successfully",
        data: newBlock,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to block IP",
        error: error.message,
      });
    }
  }
);

// Two-Factor Authentication
router.get("/2fa", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const twoFactorStats = {
      enabled_users: 8,
      total_users: 12,
      enforcement_policy: "optional",
      backup_codes_enabled: true,
    };

    res.json({
      success: true,
      data: twoFactorStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch 2FA settings",
      error: error.message,
    });
  }
});

router.post(
  "/2fa/enforce",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { policy } = req.body; // "optional", "required", "admin_only"

      res.json({
        success: true,
        message: `2FA enforcement policy updated to: ${policy}`,
        data: { policy },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update 2FA policy",
        error: error.message,
      });
    }
  }
);

// Security Scans
router.get("/scans", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const scans = [
      {
        id: 1,
        type: "vulnerability",
        status: "completed",
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date().toISOString(),
        findings: 2,
        severity: "medium",
      },
      {
        id: 2,
        type: "malware",
        status: "running",
        started_at: new Date(Date.now() - 1800000).toISOString(),
        progress: 75,
      },
    ];

    res.json({
      success: true,
      data: scans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch security scans",
      error: error.message,
    });
  }
});

router.post("/scans", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, target } = req.body; // type: "vulnerability", "malware", "configuration"

    const newScan = {
      id: Date.now(),
      type,
      target,
      status: "started",
      started_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: "Security scan started",
      data: newScan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to start security scan",
      error: error.message,
    });
  }
});

// Security Alerts
router.get("/alerts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const alerts = [
      {
        id: 1,
        type: "ssl_expiring",
        severity: "warning",
        message: "SSL certificate for example.com expires in 7 days",
        created_at: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 2,
        type: "failed_login",
        severity: "medium",
        message: "Multiple failed login attempts from IP 192.168.1.100",
        created_at: new Date(Date.now() - 1800000).toISOString(),
        acknowledged: true,
      },
    ];

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch security alerts",
      error: error.message,
    });
  }
});

router.put(
  "/alerts/:id/acknowledge",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      res.json({
        success: true,
        message: "Alert acknowledged",
        data: {
          id,
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to acknowledge alert",
        error: error.message,
      });
    }
  }
);

// Security Logs
router.get("/logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, severity } = req.query;

    let filteredLogs = [...mockSecurityLogs];

    if (type) {
      filteredLogs = filteredLogs.filter((log) => log.type === type);
    }

    if (severity) {
      filteredLogs = filteredLogs.filter((log) => log.severity === severity);
    }

    const paginatedLogs = filteredLogs.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total: filteredLogs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: filteredLogs.length > offset + parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch security logs",
      error: error.message,
    });
  }
});

// Security Statistics
router.get("/statistics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockSecurityStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch security statistics",
      error: error.message,
    });
  }
});

module.exports = router;

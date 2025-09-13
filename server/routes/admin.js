const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { queryHelpers } = require("../config/database_sqlite");
const router = express.Router();

// Mock data for new features
const mockPackages = [
  {
    id: 1,
    name: "Basic Plan",
    disk_quota: 1000,
    bandwidth_quota: 10000,
    domain_limit: 5,
    email_limit: 100,
    database_limit: 10,
    ftp_limit: 10,
    subdomain_limit: 10,
    price: 9.99,
    billing_cycle: "monthly",
    status: "active",
    features: {
      ssl_enabled: true,
      backup_enabled: true,
      cron_enabled: true,
      dns_management: true,
      email_forwarding: true,
    },
  },
  {
    id: 2,
    name: "Professional Plan",
    disk_quota: 5000,
    bandwidth_quota: 50000,
    domain_limit: 25,
    email_limit: 500,
    database_limit: 50,
    ftp_limit: 50,
    subdomain_limit: 50,
    price: 19.99,
    billing_cycle: "monthly",
    status: "active",
    features: {
      ssl_enabled: true,
      backup_enabled: true,
      cron_enabled: true,
      dns_management: true,
      email_forwarding: true,
    },
  },
];

const mockResellers = [
  {
    id: 1,
    username: "reseller1",
    email: "reseller1@example.com",
    company_name: "Web Solutions Inc",
    first_name: "John",
    last_name: "Smith",
    phone: "+1234567890",
    commission_rate: 15,
    customer_count: 25,
    monthly_revenue: 450.0,
    status: "active",
    limits: {
      max_users: 100,
      max_domains: 200,
      max_bandwidth: 200000,
      max_disk: 100000,
    },
  },
  {
    id: 2,
    username: "reseller2",
    email: "reseller2@example.com",
    company_name: "Digital Marketing Pro",
    first_name: "Sarah",
    last_name: "Johnson",
    phone: "+1987654321",
    commission_rate: 12,
    customer_count: 15,
    monthly_revenue: 280.0,
    status: "active",
    limits: {
      max_users: 50,
      max_domains: 100,
      max_bandwidth: 100000,
      max_disk: 50000,
    },
  },
];

const mockInvoices = [
  {
    id: 1,
    invoice_number: "INV-2024-001",
    customer_name: "John Doe",
    customer_email: "john@example.com",
    description: "Monthly Hosting Service - Basic Plan",
    amount: 9.99,
    due_date: "2024-02-15",
    status: "paid",
    created_at: "2024-01-15",
  },
  {
    id: 2,
    invoice_number: "INV-2024-002",
    customer_name: "Jane Smith",
    customer_email: "jane@example.com",
    description: "Monthly Hosting Service - Professional Plan",
    amount: 19.99,
    due_date: "2024-02-20",
    status: "pending",
    created_at: "2024-01-20",
  },
];

const mockPayments = [
  {
    id: 1,
    customer_name: "John Doe",
    invoice_id: 1,
    amount: 9.99,
    method: "Credit Card",
    status: "completed",
    created_at: "2024-01-16",
  },
];

const mockAnalytics = {
  total_users: 156,
  total_domains: 342,
  total_revenue: 2850.5,
  server_uptime: 99.8,
  user_growth: 15.3,
  domain_growth: 8.7,
  revenue_growth: 22.1,
  disk_used: 75,
  disk_total: 1000,
  bandwidth_used: 450,
  bandwidth_total: 2000,
  cpu_avg: 65,
  mrr: 2850.5,
  arpu: 18.27,
  churn_rate: 2.1,
  failed_logins: 45,
  blocked_ips: 12,
  avg_response_time: 245,
  error_rate: 0.3,
};

// Get all users (admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userList = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      created_at: user.created_at,
      last_login: user.last_login,
    }));

    res.json(userList);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get system statistics (admin only)
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total users (mock data)
    const totalUsers = users.length;

    // Get total domains (mock data)
    const totalDomains = domains.length;

    // Get total databases (mock data)
    const totalDatabases = databases.length;

    // System stats (mock data)
    const systemStats = {
      totalUsers,
      totalDomains,
      totalDatabases,
      activeUsers: users.filter((u) => u.status === "active").length,
      diskUsage: {
        used: 15.2, // GB
        total: 100.0, // GB
      },
      memoryUsage: {
        used: 4.2, // GB
        total: 8.0, // GB
      },
    };

    res.json(systemStats);
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user status (admin only)
router.patch(
  "/users/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { status } = req.body;

      if (!["active", "suspended", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const [result] = await pool.execute(
        "UPDATE users SET status = ? WHERE id = ?",
        [status, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User status updated successfully" });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete user (admin only)
router.delete(
  "/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Don't allow deleting yourself
      if (userId == req.user.userId) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [
        userId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========== PACKAGE MANAGEMENT ENDPOINTS ==========

// Get all packages
router.get("/packages", authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json(mockPackages);
  } catch (error) {
    console.error("Get packages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new package
router.post("/packages", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newPackage = {
      id: Date.now(),
      ...req.body,
      created_at: new Date().toISOString(),
    };
    mockPackages.push(newPackage);
    res
      .status(201)
      .json({ message: "Package created successfully", package: newPackage });
  } catch (error) {
    console.error("Create package error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update package
router.put(
  "/packages/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const packageIndex = mockPackages.findIndex((p) => p.id === packageId);

      if (packageIndex === -1) {
        return res.status(404).json({ message: "Package not found" });
      }

      mockPackages[packageIndex] = {
        ...mockPackages[packageIndex],
        ...req.body,
      };
      res.json({
        message: "Package updated successfully",
        package: mockPackages[packageIndex],
      });
    } catch (error) {
      console.error("Update package error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete package
router.delete(
  "/packages/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const packageIndex = mockPackages.findIndex((p) => p.id === packageId);

      if (packageIndex === -1) {
        return res.status(404).json({ message: "Package not found" });
      }

      mockPackages.splice(packageIndex, 1);
      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Delete package error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========== RESELLER MANAGEMENT ENDPOINTS ==========

// Get all resellers
router.get("/resellers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json(mockResellers);
  } catch (error) {
    console.error("Get resellers error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get reseller details
router.get(
  "/resellers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const resellerId = parseInt(req.params.id);
      const reseller = mockResellers.find((r) => r.id === resellerId);

      if (!reseller) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      res.json(reseller);
    } catch (error) {
      console.error("Get reseller details error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create new reseller
router.post("/resellers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newReseller = {
      id: Date.now(),
      ...req.body,
      customer_count: 0,
      monthly_revenue: 0,
      created_at: new Date().toISOString(),
    };
    mockResellers.push(newReseller);
    res.status(201).json({
      message: "Reseller created successfully",
      reseller: newReseller,
    });
  } catch (error) {
    console.error("Create reseller error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update reseller
router.put(
  "/resellers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const resellerId = parseInt(req.params.id);
      const resellerIndex = mockResellers.findIndex((r) => r.id === resellerId);

      if (resellerIndex === -1) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      mockResellers[resellerIndex] = {
        ...mockResellers[resellerIndex],
        ...req.body,
      };
      res.json({
        message: "Reseller updated successfully",
        reseller: mockResellers[resellerIndex],
      });
    } catch (error) {
      console.error("Update reseller error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update reseller status
router.patch(
  "/resellers/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const resellerId = parseInt(req.params.id);
      const { status } = req.body;
      const resellerIndex = mockResellers.findIndex((r) => r.id === resellerId);

      if (resellerIndex === -1) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      mockResellers[resellerIndex].status = status;
      res.json({ message: "Reseller status updated successfully" });
    } catch (error) {
      console.error("Update reseller status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete reseller
router.delete(
  "/resellers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const resellerId = parseInt(req.params.id);
      const resellerIndex = mockResellers.findIndex((r) => r.id === resellerId);

      if (resellerIndex === -1) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      mockResellers.splice(resellerIndex, 1);
      res.json({ message: "Reseller deleted successfully" });
    } catch (error) {
      console.error("Delete reseller error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========== BILLING MANAGEMENT ENDPOINTS ==========

// Get billing statistics
router.get(
  "/billing/stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = {
        monthly_revenue: 2850.5,
        outstanding_amount: 450.75,
        outstanding_count: 12,
        current_month: 1850.25,
        current_month_count: 45,
        collection_rate: 94.5,
        collected_amount: 2400.0,
        target_amount: 3000.0,
        revenue_growth: 15.3,
        payment_methods: {
          credit_card: 65,
          paypal: 25,
          bank_transfer: 10,
        },
      };
      res.json(stats);
    } catch (error) {
      console.error("Get billing stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all invoices
router.get(
  "/billing/invoices",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      res.json(mockInvoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create new invoice
router.post(
  "/billing/invoices",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const newInvoice = {
        id: Date.now(),
        invoice_number: `INV-${new Date().getFullYear()}-${String(
          Date.now()
        ).slice(-3)}`,
        customer_name: "Customer Name", // Should be fetched from user_id
        customer_email: "customer@example.com",
        status: "pending",
        created_at: new Date().toISOString(),
        ...req.body,
      };
      mockInvoices.push(newInvoice);
      res
        .status(201)
        .json({ message: "Invoice created successfully", invoice: newInvoice });
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Send invoice
router.post(
  "/billing/invoices/:id/send",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = mockInvoices.find((i) => i.id === invoiceId);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Simulate sending email
      invoice.status = "sent";
      res.json({ message: "Invoice sent successfully" });
    } catch (error) {
      console.error("Send invoice error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update invoice status
router.patch(
  "/billing/invoices/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      const invoice = mockInvoices.find((i) => i.id === invoiceId);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      invoice.status = status;
      res.json({ message: "Invoice status updated successfully" });
    } catch (error) {
      console.error("Update invoice status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all payments
router.get(
  "/billing/payments",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      res.json(mockPayments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========== ANALYTICS & REPORTS ENDPOINTS ==========

// Get analytics data
router.get("/analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const range = req.query.range || "30d";
    // In real implementation, filter data based on range
    res.json(mockAnalytics);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get reports data
router.get("/reports", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const range = req.query.range || "30d";
    const reports = {
      top_users: [
        {
          id: 1,
          username: "user1",
          disk_usage: 850,
          bandwidth_usage: 1200,
          resource_percentage: 85,
        },
        {
          id: 2,
          username: "user2",
          disk_usage: 650,
          bandwidth_usage: 980,
          resource_percentage: 65,
        },
      ],
      resource_usage: [
        {
          name: "Disk Space",
          current: "75 GB",
          total: "1000 GB",
          percentage: 75,
          trend: 5.2,
          status: "healthy",
        },
        {
          name: "Bandwidth",
          current: "450 GB",
          total: "2000 GB",
          percentage: 22.5,
          trend: -2.1,
          status: "healthy",
        },
        {
          name: "CPU Usage",
          current: "65%",
          total: "100%",
          percentage: 65,
          trend: 8.3,
          status: "warning",
        },
      ],
      security_events: [
        {
          description: "Multiple failed login attempts",
          ip: "192.168.1.100",
          severity: "high",
          timestamp: new Date().toISOString(),
        },
        {
          description: "Suspicious file upload detected",
          ip: "192.168.1.205",
          severity: "medium",
          timestamp: new Date().toISOString(),
        },
      ],
      system_health: [
        {
          name: "Web Server (Nginx)",
          status: "online",
          uptime: "99.8",
          last_check: "2 minutes ago",
        },
        {
          name: "Database (MySQL)",
          status: "online",
          uptime: "99.9",
          last_check: "1 minute ago",
        },
        {
          name: "Mail Server",
          status: "warning",
          uptime: "98.5",
          last_check: "5 minutes ago",
        },
      ],
    };
    res.json(reports);
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Export reports
router.get(
  "/reports/export/:type",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const reportType = req.params.type;

      // Simulate CSV export
      let csvData = "";

      switch (reportType) {
        case "resource_usage":
          csvData = "Resource,Current,Total,Percentage,Status\n";
          csvData += "Disk Space,75 GB,1000 GB,75%,healthy\n";
          csvData += "Bandwidth,450 GB,2000 GB,22.5%,healthy\n";
          csvData += "CPU Usage,65%,100%,65%,warning\n";
          break;
        case "financial":
          csvData = "Month,Revenue,Expenses,Profit\n";
          csvData += "January,2850.50,1200.00,1650.50\n";
          csvData += "February,3100.25,1350.00,1750.25\n";
          break;
        default:
          csvData = "No data available for this report type";
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${reportType}_report.csv"`
      );
      res.send(csvData);
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========== SECURITY MANAGEMENT ENDPOINTS ==========

// Get security settings
router.get(
  "/security/settings",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const settings = {
        bruteforce_protection: true,
        ddos_protection: true,
        malware_scanning: true,
        firewall_enabled: true,
        ssl_enforcement: true,
        two_factor_auth: false,
        password_complexity: true,
        login_notifications: true,
      };
      res.json(settings);
    } catch (error) {
      console.error("Get security settings error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update security settings
router.patch(
  "/security/settings",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const updates = req.body;
      // In real implementation, save to database
      res.json({ message: "Security settings updated successfully" });
    } catch (error) {
      console.error("Update security settings error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get blocked IPs
router.get(
  "/security/blocked-ips",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const blockedIPs = [
        {
          id: 1,
          ip_address: "192.168.1.100",
          reason: "Multiple failed login attempts",
          blocked_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          ip_address: "10.0.0.50",
          reason: "Suspicious activity",
          blocked_at: "2024-01-14T15:45:00Z",
        },
      ];
      res.json(blockedIPs);
    } catch (error) {
      console.error("Get blocked IPs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Block IP address
router.post(
  "/security/block-ip",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { ip, reason } = req.body;
      // In real implementation, add to firewall/database
      res.json({ message: "IP address blocked successfully" });
    } catch (error) {
      console.error("Block IP error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Unblock IP address
router.delete(
  "/security/block-ip/:ip",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const ip = req.params.ip;
      // In real implementation, remove from firewall/database
      res.json({ message: "IP address unblocked successfully" });
    } catch (error) {
      console.error("Unblock IP error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get security logs
router.get(
  "/security/logs",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const logs = [
        {
          id: 1,
          timestamp: "2024-01-15T12:30:00Z",
          event_type: "Failed Login",
          ip_address: "192.168.1.100",
          description: "Multiple failed login attempts for user admin",
          severity: "high",
        },
        {
          id: 2,
          timestamp: "2024-01-15T11:15:00Z",
          event_type: "Malware Detected",
          ip_address: "10.0.0.75",
          description: "Malicious file upload detected and blocked",
          severity: "high",
        },
        {
          id: 3,
          timestamp: "2024-01-15T10:45:00Z",
          event_type: "Unusual Activity",
          ip_address: "172.16.0.10",
          description: "Unusual request pattern detected",
          severity: "medium",
        },
      ];
      res.json(logs);
    } catch (error) {
      console.error("Get security logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get scan results
router.get(
  "/security/scan-results",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const results = {
        last_scan: "2024-01-15T08:00:00Z",
        threats_found: 2,
        files_scanned: 8547,
        scanning: false,
      };
      res.json(results);
    } catch (error) {
      console.error("Get scan results error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Start security scan
router.post(
  "/security/scan",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // In real implementation, start actual scan process
      res.json({ message: "Security scan started successfully" });
    } catch (error) {
      console.error("Start security scan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;

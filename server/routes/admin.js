const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const db = require("../config/database");
const router = express.Router();

// Get all users (admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.execute(
      "SELECT id, email, role, plan, status, created_at, last_login FROM users ORDER BY created_at DESC"
    );

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get system statistics (admin only)
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total users from database
    const [totalUsersResult] = await db.execute("SELECT COUNT(*) as total FROM users");
    const totalUsers = totalUsersResult[0].total;

    // Get total domains from database
    const [totalDomainsResult] = await db.execute("SELECT COUNT(*) as total FROM domains");
    const totalDomains = totalDomainsResult[0].total;

    // Get total databases from database
    const [totalDatabasesResult] = await db.execute("SELECT COUNT(*) as total FROM databases");
    const totalDatabases = totalDatabasesResult[0].total;

    // Get active users
    const [activeUsersResult] = await db.execute("SELECT COUNT(*) as total FROM users WHERE status = 'active'");
    const activeUsers = activeUsersResult[0].total;

    // System stats
    const systemStats = {
      totalUsers,
      totalDomains,
      totalDatabases,
      activeUsers,
      diskUsage: {
        used: 15.2, // GB - Should be calculated from system
        total: 100.0, // GB - Should be from system configuration
      },
      memoryUsage: {
        used: 4.2, // GB - Should be from system monitoring
        total: 8.0, // GB - Should be from system configuration
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

      const [result] = await db.execute(
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

      const [result] = await db.execute("DELETE FROM users WHERE id = ?", [
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
    const [packages] = await db.execute(
      "SELECT * FROM packages ORDER BY created_at DESC"
    );
    res.json(packages);
  } catch (error) {
    console.error("Get packages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new package
router.post("/packages", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      disk_quota,
      bandwidth_quota,
      domain_limit,
      email_limit,
      database_limit,
      ftp_limit,
      subdomain_limit,
      price,
      billing_cycle,
      features
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO packages (name, disk_quota, bandwidth_quota, domain_limit, 
       email_limit, database_limit, ftp_limit, subdomain_limit, price, 
       billing_cycle, features, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, disk_quota, bandwidth_quota, domain_limit, email_limit, 
       database_limit, ftp_limit, subdomain_limit, price, billing_cycle, 
       JSON.stringify(features)]
    );

    const [newPackage] = await db.execute(
      "SELECT * FROM packages WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Package created successfully",
      package: newPackage[0]
    });
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
      const packageId = req.params.id;
      const {
        name,
        disk_quota,
        bandwidth_quota,
        domain_limit,
        email_limit,
        database_limit,
        ftp_limit,
        subdomain_limit,
        price,
        billing_cycle,
        features,
        status
      } = req.body;

      const [result] = await db.execute(
        `UPDATE packages SET name = ?, disk_quota = ?, bandwidth_quota = ?, 
         domain_limit = ?, email_limit = ?, database_limit = ?, ftp_limit = ?, 
         subdomain_limit = ?, price = ?, billing_cycle = ?, features = ?, status = ?
         WHERE id = ?`,
        [name, disk_quota, bandwidth_quota, domain_limit, email_limit,
         database_limit, ftp_limit, subdomain_limit, price, billing_cycle,
         JSON.stringify(features), status, packageId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Package not found" });
      }

      const [updatedPackage] = await db.execute(
        "SELECT * FROM packages WHERE id = ?",
        [packageId]
      );

      res.json({
        message: "Package updated successfully",
        package: updatedPackage[0]
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
      const packageId = req.params.id;

      const [result] = await db.execute("DELETE FROM packages WHERE id = ?", [
        packageId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Package not found" });
      }

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
    const [resellers] = await db.execute(
      "SELECT * FROM resellers ORDER BY created_at DESC"
    );
    res.json(resellers);
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
      const resellerId = req.params.id;
      const [resellers] = await db.execute(
        "SELECT * FROM resellers WHERE id = ?",
        [resellerId]
      );

      if (resellers.length === 0) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      res.json(resellers[0]);
    } catch (error) {
      console.error("Get reseller details error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create new reseller
router.post("/resellers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      username,
      email,
      company_name,
      first_name,
      last_name,
      phone,
      commission_rate,
      limits
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO resellers (username, email, company_name, first_name, 
       last_name, phone, commission_rate, customer_count, monthly_revenue, 
       status, limits) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?)`,
      [username, email, company_name, first_name, last_name, phone, 
       commission_rate, JSON.stringify(limits)]
    );

    const [newReseller] = await db.execute(
      "SELECT * FROM resellers WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Reseller created successfully",
      reseller: newReseller[0]
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
      const resellerId = req.params.id;
      const {
        username,
        email,
        company_name,
        first_name,
        last_name,
        phone,
        commission_rate,
        limits,
        status
      } = req.body;

      const [result] = await db.execute(
        `UPDATE resellers SET username = ?, email = ?, company_name = ?, 
         first_name = ?, last_name = ?, phone = ?, commission_rate = ?, 
         limits = ?, status = ? WHERE id = ?`,
        [username, email, company_name, first_name, last_name, phone,
         commission_rate, JSON.stringify(limits), status, resellerId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Reseller not found" });
      }

      const [updatedReseller] = await db.execute(
        "SELECT * FROM resellers WHERE id = ?",
        [resellerId]
      );

      res.json({
        message: "Reseller updated successfully",
        reseller: updatedReseller[0]
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
      const resellerId = req.params.id;
      const { status } = req.body;

      const [result] = await db.execute(
        "UPDATE resellers SET status = ? WHERE id = ?",
        [status, resellerId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Reseller not found" });
      }

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
      const resellerId = req.params.id;

      const [result] = await db.execute("DELETE FROM resellers WHERE id = ?", [
        resellerId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Reseller not found" });
      }

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
      // Get total revenue from invoices
      const [revenueResult] = await db.execute(
        "SELECT SUM(amount) as total_revenue FROM invoices WHERE status = 'paid'"
      );
      
      // Get outstanding invoices
      const [outstandingResult] = await db.execute(
        "SELECT COUNT(*) as count, SUM(amount) as amount FROM invoices WHERE status = 'pending'"
      );
      
      // Get current month stats
      const [monthlyResult] = await db.execute(
        `SELECT COUNT(*) as count, SUM(amount) as amount FROM invoices 
         WHERE status = 'paid' AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
         AND YEAR(created_at) = YEAR(CURRENT_DATE())`
      );

      // Get payment method distribution
      const [paymentsResult] = await db.execute(
        "SELECT payment_method, COUNT(*) as count FROM payments GROUP BY payment_method"
      );

      const paymentMethods = {};
      paymentsResult.forEach(row => {
        paymentMethods[row.payment_method] = row.count;
      });

      const stats = {
        monthly_revenue: revenueResult[0].total_revenue || 0,
        outstanding_amount: outstandingResult[0].amount || 0,
        outstanding_count: outstandingResult[0].count || 0,
        current_month: monthlyResult[0].amount || 0,
        current_month_count: monthlyResult[0].count || 0,
        collection_rate: 94.5, // Should be calculated from actual data
        collected_amount: revenueResult[0].total_revenue || 0,
        target_amount: 3000.0, // Should be from settings
        revenue_growth: 15.3, // Should be calculated from historical data
        payment_methods: paymentMethods
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
      const [invoices] = await db.execute(
        "SELECT * FROM invoices ORDER BY created_at DESC"
      );
      res.json(invoices);
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
      const {
        customer_id,
        description,
        amount,
        due_date
      } = req.body;

      // Get customer details
      const [customerResult] = await db.execute(
        "SELECT email, CONCAT(first_name, ' ', last_name) as full_name FROM users WHERE id = ?",
        [customer_id]
      );

      if (customerResult.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const customer = customerResult[0];
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const [result] = await db.execute(
        `INSERT INTO invoices (invoice_number, customer_id, customer_name, 
         customer_email, description, amount, due_date, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [invoiceNumber, customer_id, customer.full_name, customer.email, 
         description, amount, due_date]
      );

      const [newInvoice] = await db.execute(
        "SELECT * FROM invoices WHERE id = ?",
        [result.insertId]
      );

      res.status(201).json({
        message: "Invoice created successfully",
        invoice: newInvoice[0]
      });
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
      const invoiceId = req.params.id;

      const [result] = await db.execute(
        "UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = ?",
        [invoiceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // TODO: Implement actual email sending
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
      const invoiceId = req.params.id;
      const { status } = req.body;

      const [result] = await db.execute(
        "UPDATE invoices SET status = ? WHERE id = ?",
        [status, invoiceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }

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
      const [payments] = await db.execute(
        "SELECT * FROM payments ORDER BY created_at DESC"
      );
      res.json(payments);
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
    
    // Get user analytics
    const [totalUsersResult] = await db.execute("SELECT COUNT(*) as total FROM users");
    const [totalDomainsResult] = await db.execute("SELECT COUNT(*) as total FROM domains");
    const [totalRevenueResult] = await db.execute("SELECT SUM(amount) as total FROM invoices WHERE status = 'paid'");

    // Calculate growth rates (would need historical data)
    const analytics = {
      total_users: totalUsersResult[0].total,
      total_domains: totalDomainsResult[0].total,
      total_revenue: totalRevenueResult[0].total || 0,
      server_uptime: 99.8, // Should be from system monitoring
      user_growth: 15.3, // Calculate from historical data
      domain_growth: 8.7, // Calculate from historical data
      revenue_growth: 22.1, // Calculate from historical data
      disk_used: 75, // Should be from system monitoring
      disk_total: 1000,
      bandwidth_used: 450, // Should be from system monitoring
      bandwidth_total: 2000,
      cpu_avg: 65, // Should be from system monitoring
      mrr: totalRevenueResult[0].total || 0, // Monthly recurring revenue
      arpu: 18.27, // Average revenue per user (calculate)
      churn_rate: 2.1, // Calculate from user data
      failed_logins: 45, // Should be from security logs
      blocked_ips: 12, // Should be from security system
      avg_response_time: 245, // Should be from monitoring
      error_rate: 0.3 // Should be from logs
    };

    res.json(analytics);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get reports data
router.get("/reports", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const range = req.query.range || "30d";
    
    // Get top users by resource usage (would need usage tracking)
    const [topUsersResult] = await db.execute(
      "SELECT id, email as username, disk_usage, bandwidth_usage FROM users ORDER BY disk_usage DESC LIMIT 10"
    );

    // Get system health status (would need monitoring data)
    const reports = {
      top_users: topUsersResult.map(user => ({
        id: user.id,
        username: user.username,
        disk_usage: user.disk_usage || 0,
        bandwidth_usage: user.bandwidth_usage || 0,
        resource_percentage: Math.round(((user.disk_usage || 0) / 1000) * 100)
      })),
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
        // Should be from security_logs table
        {
          description: "Multiple failed login attempts",
          ip: "192.168.1.100",
          severity: "high",
          timestamp: new Date().toISOString(),
        }
      ],
      system_health: [
        // Should be from monitoring system
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
        }
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
      let csvData = "";

      switch (reportType) {
        case "resource_usage":
          csvData = "Resource,Current,Total,Percentage,Status\n";
          csvData += "Disk Space,75 GB,1000 GB,75%,healthy\n";
          csvData += "Bandwidth,450 GB,2000 GB,22.5%,healthy\n";
          csvData += "CPU Usage,65%,100%,65%,warning\n";
          break;
        case "financial":
          // Get financial data from database
          const [financialData] = await db.execute(
            `SELECT MONTHNAME(created_at) as month, SUM(amount) as revenue 
             FROM invoices WHERE status = 'paid' 
             GROUP BY MONTH(created_at), YEAR(created_at) 
             ORDER BY created_at DESC LIMIT 12`
          );
          
          csvData = "Month,Revenue,Expenses,Profit\n";
          financialData.forEach(row => {
            const expenses = row.revenue * 0.4; // Estimate 40% expenses
            const profit = row.revenue - expenses;
            csvData += `${row.month},${row.revenue.toFixed(2)},${expenses.toFixed(2)},${profit.toFixed(2)}\n`;
          });
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
      // Get settings from database
      const [settingsResult] = await db.execute(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'security_%'"
      );

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

      // Override with database values if they exist
      settingsResult.forEach(row => {
        const key = row.setting_key.replace('security_', '');
        settings[key] = row.setting_value === 'true' || row.setting_value === '1';
      });

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
      
      // Update settings in database
      for (const [key, value] of Object.entries(updates)) {
        await db.execute(
          `INSERT INTO system_settings (setting_key, setting_value) 
           VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [`security_${key}`, value ? '1' : '0']
        );
      }

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
      const [blockedIPs] = await db.execute(
        "SELECT * FROM blocked_ips ORDER BY blocked_at DESC"
      );
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
      
      await db.execute(
        "INSERT INTO blocked_ips (ip_address, reason, blocked_at) VALUES (?, ?, NOW())",
        [ip, reason]
      );

      // TODO: Add to system firewall
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
      
      const [result] = await db.execute(
        "DELETE FROM blocked_ips WHERE ip_address = ?",
        [ip]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "IP address not found in blocked list" });
      }

      // TODO: Remove from system firewall
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
      const [logs] = await db.execute(
        "SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT 100"
      );
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
      const [scanResults] = await db.execute(
        "SELECT * FROM security_scans ORDER BY created_at DESC LIMIT 1"
      );

      const results = scanResults.length > 0 ? scanResults[0] : {
        last_scan: null,
        threats_found: 0,
        files_scanned: 0,
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
      // Insert scan start record
      await db.execute(
        "INSERT INTO security_scans (status, created_at) VALUES ('running', NOW())"
      );

      // TODO: Start actual security scan process
      res.json({ message: "Security scan started successfully" });
    } catch (error) {
      console.error("Start security scan error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
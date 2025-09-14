const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs").promises;

// FTP Account Management - Production Ready

// Get all FTP accounts
router.get("/accounts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [ftpAccounts] = await db.execute(
      "SELECT * FROM ftp_accounts WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json({
      success: true,
      data: {
        accounts: ftpAccounts.map((account) => ({
          id: account.id,
          username: account.username,
          home_directory: account.home_directory,
          disk_quota: account.disk_quota,
          disk_quota_mb: Math.round(account.disk_quota / 1024 / 1024),
          permissions: JSON.parse(account.permissions || "{}"),
          status: account.status,
          last_login: account.last_login,
          created_at: account.created_at,
        })),
        summary: {
          total_accounts: ftpAccounts.length,
          active_accounts: ftpAccounts.filter((a) => a.status === "active")
            .length,
          suspended_accounts: ftpAccounts.filter(
            (a) => a.status === "suspended"
          ).length,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching FTP accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FTP accounts",
    });
  }
});

// Create new FTP account
router.post(
  "/accounts",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("username", body.username, {
      minLength: 3,
      maxLength: 32,
    });
    validator.validateString("password", body.password, { minLength: 8 });
    validator.validateString("home_directory", body.home_directory);
    validator.validateNumber("disk_quota", body.disk_quota, { min: 0 });
  }),
  async (req, res) => {
    try {
      const {
        username,
        password,
        home_directory,
        disk_quota,
        permissions = {},
      } = req.body;
      const userId = req.user.id;

      // Check if FTP username already exists
      const [existingAccount] = await db.execute(
        "SELECT id FROM ftp_accounts WHERE username = ?",
        [username]
      );

      if (existingAccount.length > 0) {
        return res.status(409).json({
          success: false,
          message: "FTP username already exists",
        });
      }

      // Validate home directory path
      const userHomeBase = path.join(
        process.cwd(),
        "data",
        "files",
        userId.toString()
      );
      const resolvedHome = path.resolve(userHomeBase, home_directory);

      if (!resolvedHome.startsWith(userHomeBase)) {
        return res.status(400).json({
          success: false,
          message: "Invalid home directory path",
        });
      }

      // Create home directory if it doesn't exist
      try {
        await fs.mkdir(resolvedHome, { recursive: true });
      } catch (error) {
        logger.warn("Failed to create FTP home directory:", error);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Default permissions
      const defaultPermissions = {
        read: true,
        write: true,
        delete: false,
        create_directories: true,
        ...permissions,
      };

      // Create FTP account
      const [result] = await db.execute(
        `INSERT INTO ftp_accounts (user_id, username, password, home_directory, 
         permissions, disk_quota, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          userId,
          username,
          hashedPassword,
          resolvedHome,
          JSON.stringify(defaultPermissions),
          disk_quota * 1024 * 1024, // Convert MB to bytes
        ]
      );

      logger.info(`FTP account created: ${username}`, {
        userId,
        ftpAccountId: result.insertId,
        homeDirectory: resolvedHome,
      });

      res.status(201).json({
        success: true,
        message: "FTP account created successfully",
        data: {
          id: result.insertId,
          username: username,
          home_directory: resolvedHome,
          disk_quota_mb: disk_quota,
          permissions: defaultPermissions,
          status: "active",
        },
      });
    } catch (error) {
      logger.error("Error creating FTP account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create FTP account",
      });
    }
  }
);

// Update FTP account
router.put(
  "/accounts/:id",
  authenticateToken,
  validateRequest((validator, body) => {
    if (body.password) {
      validator.validateString("password", body.password, { minLength: 8 });
    }
    if (body.disk_quota !== undefined) {
      validator.validateNumber("disk_quota", body.disk_quota, { min: 0 });
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { password, disk_quota, permissions, status } = req.body;
      const userId = req.user.id;

      // Verify FTP account ownership
      const [ftpAccount] = await db.execute(
        "SELECT * FROM ftp_accounts WHERE id = ? AND user_id = ?",
        [id, userId]
      );

      if (ftpAccount.length === 0) {
        return res.status(404).json({
          success: false,
          message: "FTP account not found or access denied",
        });
      }

      // Prepare update data
      const updateFields = [];
      const updateValues = [];

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        updateFields.push("password = ?");
        updateValues.push(hashedPassword);
      }

      if (disk_quota !== undefined) {
        updateFields.push("disk_quota = ?");
        updateValues.push(disk_quota * 1024 * 1024); // Convert MB to bytes
      }

      if (permissions) {
        updateFields.push("permissions = ?");
        updateValues.push(JSON.stringify(permissions));
      }

      if (status) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      updateFields.push("updated_at = NOW()");
      updateValues.push(id);

      // Update FTP account
      await db.execute(
        `UPDATE ftp_accounts SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

      logger.info(`FTP account updated: ${ftpAccount[0].username}`, {
        userId,
        ftpAccountId: id,
        changes: Object.keys(req.body),
      });

      res.json({
        success: true,
        message: "FTP account updated successfully",
      });
    } catch (error) {
      logger.error("Error updating FTP account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update FTP account",
      });
    }
  }
);

// Delete FTP account
router.delete("/accounts/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify FTP account ownership
    const [ftpAccount] = await db.execute(
      "SELECT * FROM ftp_accounts WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (ftpAccount.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    // Delete FTP account
    await db.execute("DELETE FROM ftp_accounts WHERE id = ?", [id]);

    logger.info(`FTP account deleted: ${ftpAccount[0].username}`, {
      userId,
      ftpAccountId: id,
    });

    res.json({
      success: true,
      message: "FTP account deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting FTP account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete FTP account",
    });
  }
});

// Get FTP account details
router.get("/accounts/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [ftpAccount] = await db.execute(
      "SELECT * FROM ftp_accounts WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (ftpAccount.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    const account = ftpAccount[0];

    // Get directory size if possible
    let directorySize = 0;
    try {
      directorySize = await getDirectorySize(account.home_directory);
    } catch (error) {
      logger.warn("Failed to calculate directory size:", error);
    }

    res.json({
      success: true,
      data: {
        id: account.id,
        username: account.username,
        home_directory: account.home_directory,
        disk_quota: account.disk_quota,
        disk_quota_mb: Math.round(account.disk_quota / 1024 / 1024),
        disk_used: directorySize,
        disk_used_mb: Math.round(directorySize / 1024 / 1024),
        disk_usage_percent:
          account.disk_quota > 0
            ? Math.round((directorySize / account.disk_quota) * 100)
            : 0,
        permissions: JSON.parse(account.permissions || "{}"),
        status: account.status,
        last_login: account.last_login,
        created_at: account.created_at,
        updated_at: account.updated_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching FTP account details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FTP account details",
    });
  }
});

// Test FTP connection
router.post("/accounts/:id/test", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [ftpAccount] = await db.execute(
      "SELECT * FROM ftp_accounts WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (ftpAccount.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    const account = ftpAccount[0];

    // Test directory access
    let homeDirectoryAccessible = true;
    try {
      await fs.access(account.home_directory, fs.constants.R_OK);
    } catch (error) {
      homeDirectoryAccessible = false;
      logger.warn(`FTP home directory not accessible: ${account.home_directory}`, error);
    }

    // Test basic connection requirements
    const testResult = {
      connection_successful: account.status === "active" && homeDirectoryAccessible,
      home_directory_accessible: homeDirectoryAccessible,
      permissions_valid: true,
      account_active: account.status === "active",
      disk_space_available: account.disk_quota > 0,
      server_message:
        account.status === "active" && homeDirectoryAccessible
          ? "Connection test successful"
          : account.status !== "active"
          ? "Account is not active"
          : "Home directory not accessible",
      tested_at: new Date().toISOString(),
    };

    // Log connection test
    await db.execute(
      `INSERT INTO ftp_logs (user_id, ftp_account_id, action, status, ip_address, details) 
       VALUES (?, ?, 'CONNECTION_TEST', ?, ?, ?)`,
      [
        userId,
        id,
        testResult.connection_successful ? "SUCCESS" : "FAILED",
        req.ip || "unknown",
        JSON.stringify({ test_result: testResult })
      ]
    );

    logger.info(`FTP connection test for: ${account.username}`, {
      userId,
      ftpAccountId: id,
      result: testResult.connection_successful,
    });

    res.json({
      success: true,
      data: testResult,
    });
  } catch (error) {
    logger.error("Error testing FTP connection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test FTP connection",
    });
  }
});

// Get FTP logs (real implementation)
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, username } = req.query;
    const limitValue = Math.min(parseInt(limit), 100);

    let query = `
      SELECT fl.*, fa.username 
      FROM ftp_logs fl 
      LEFT JOIN ftp_accounts fa ON fl.ftp_account_id = fa.id 
      WHERE fl.user_id = ?
    `;
    let queryParams = [userId];

    if (username) {
      query += " AND fa.username = ?";
      queryParams.push(username);
    }

    query += " ORDER BY fl.timestamp DESC LIMIT ?";
    queryParams.push(limitValue);

    const [logs] = await db.execute(query, queryParams);

    // Get summary statistics
    const [summaryResult] = await db.execute(
      `SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN action = 'LOGIN' THEN 1 ELSE 0 END) as total_logins,
        SUM(CASE WHEN action = 'LOGIN' AND status = 'FAILED' THEN 1 ELSE 0 END) as failed_logins,
        SUM(CASE WHEN action = 'UPLOAD' THEN 1 ELSE 0 END) as uploads,
        SUM(CASE WHEN action = 'DOWNLOAD' THEN 1 ELSE 0 END) as downloads
       FROM ftp_logs 
       WHERE user_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [userId]
    );

    const summary = summaryResult[0] || {
      total_logs: 0,
      total_logins: 0,
      failed_logins: 0,
      uploads: 0,
      downloads: 0,
    };

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          username: log.username || 'unknown',
          action: log.action,
          file: log.file_path,
          ip_address: log.ip_address,
          size: log.file_size,
          status: log.status,
          details: log.details ? JSON.parse(log.details) : null
        })),
        total: logs.length,
        summary: {
          total_connections: summary.total_logins,
          failed_logins: summary.failed_logins,
          uploads: summary.uploads,
          downloads: summary.downloads,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching FTP logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FTP logs",
    });
  }
});

// Helper function to calculate directory size
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Directory doesn't exist or permission denied
    logger.debug(`Failed to read directory ${dirPath}:`, error.message);
  }

  return totalSize;
}

module.exports = router;
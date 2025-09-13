const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs").promises;

// FTP Account Management - DirectAdmin Style

// Get all FTP accounts
router.get("/accounts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const ftpAccounts = await queryHelpers.findMany("ftp_accounts", {
      user_id: userId,
    });

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
      const existingAccount = await queryHelpers.findOne("ftp_accounts", {
        username: username,
      });

      if (existingAccount) {
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
      const ftpAccount = await queryHelpers.create("ftp_accounts", {
        user_id: userId,
        username: username,
        password: hashedPassword,
        home_directory: resolvedHome,
        permissions: JSON.stringify(defaultPermissions),
        disk_quota: disk_quota * 1024 * 1024, // Convert MB to bytes
        status: "active",
        created_at: new Date().toISOString(),
      });

      logger.info(`FTP account created: ${username}`, {
        userId,
        ftpAccountId: ftpAccount.id,
        homeDirectory: resolvedHome,
      });

      res.status(201).json({
        success: true,
        message: "FTP account created successfully",
        data: {
          id: ftpAccount.id,
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
      const ftpAccount = await queryHelpers.findOne("ftp_accounts", {
        id,
        user_id: userId,
      });

      if (!ftpAccount) {
        return res.status(404).json({
          success: false,
          message: "FTP account not found or access denied",
        });
      }

      // Prepare update data
      const updateData = {};

      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      if (disk_quota !== undefined) {
        updateData.disk_quota = disk_quota * 1024 * 1024; // Convert MB to bytes
      }

      if (permissions) {
        updateData.permissions = JSON.stringify(permissions);
      }

      if (status) {
        updateData.status = status;
      }

      updateData.updated_at = new Date().toISOString();

      // Update FTP account
      await queryHelpers.update("ftp_accounts", { id }, updateData);

      logger.info(`FTP account updated: ${ftpAccount.username}`, {
        userId,
        ftpAccountId: id,
        changes: Object.keys(updateData),
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
    const ftpAccount = await queryHelpers.findOne("ftp_accounts", {
      id,
      user_id: userId,
    });

    if (!ftpAccount) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    // Delete FTP account
    await queryHelpers.delete("ftp_accounts", { id });

    logger.info(`FTP account deleted: ${ftpAccount.username}`, {
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

    const ftpAccount = await queryHelpers.findOne("ftp_accounts", {
      id,
      user_id: userId,
    });

    if (!ftpAccount) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    // Get directory size if possible
    let directorySize = 0;
    try {
      directorySize = await getDirectorySize(ftpAccount.home_directory);
    } catch (error) {
      logger.warn("Failed to calculate directory size:", error);
    }

    res.json({
      success: true,
      data: {
        id: ftpAccount.id,
        username: ftpAccount.username,
        home_directory: ftpAccount.home_directory,
        disk_quota: ftpAccount.disk_quota,
        disk_quota_mb: Math.round(ftpAccount.disk_quota / 1024 / 1024),
        disk_used: directorySize,
        disk_used_mb: Math.round(directorySize / 1024 / 1024),
        disk_usage_percent:
          ftpAccount.disk_quota > 0
            ? Math.round((directorySize / ftpAccount.disk_quota) * 100)
            : 0,
        permissions: JSON.parse(ftpAccount.permissions || "{}"),
        status: ftpAccount.status,
        last_login: ftpAccount.last_login,
        created_at: ftpAccount.created_at,
        updated_at: ftpAccount.updated_at,
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

    const ftpAccount = await queryHelpers.findOne("ftp_accounts", {
      id,
      user_id: userId,
    });

    if (!ftpAccount) {
      return res.status(404).json({
        success: false,
        message: "FTP account not found or access denied",
      });
    }

    // Mock FTP connection test
    const testResult = {
      connection_successful: ftpAccount.status === "active",
      home_directory_accessible: true,
      permissions_valid: true,
      response_time: Math.random() * 100 + 50, // Mock response time
      server_message:
        ftpAccount.status === "active"
          ? "230 User logged in successfully"
          : "530 Login incorrect",
      tested_at: new Date().toISOString(),
    };

    logger.info(`FTP connection test for: ${ftpAccount.username}`, {
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

// Get FTP logs (mock implementation)
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, username } = req.query;

    // Mock FTP logs
    const logs = [];
    const logCount = Math.min(parseInt(limit), 100);

    for (let i = 0; i < logCount; i++) {
      const timestamp = new Date(
        Date.now() - i * 60 * 1000 * Math.random() * 60
      );
      logs.push({
        id: i + 1,
        timestamp: timestamp.toISOString(),
        username: username || `user${Math.floor(Math.random() * 5) + 1}`,
        action: ["LOGIN", "LOGOUT", "UPLOAD", "DOWNLOAD", "DELETE"][
          Math.floor(Math.random() * 5)
        ],
        file: Math.random() > 0.5 ? `/home/files/document${i}.txt` : null,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        size: Math.random() > 0.5 ? Math.floor(Math.random() * 1024000) : null,
        status: Math.random() > 0.1 ? "SUCCESS" : "FAILED",
      });
    }

    res.json({
      success: true,
      data: {
        logs: logs.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        ),
        total: logs.length,
        summary: {
          total_connections: logs.filter((l) => l.action === "LOGIN").length,
          failed_logins: logs.filter(
            (l) => l.action === "LOGIN" && l.status === "FAILED"
          ).length,
          uploads: logs.filter((l) => l.action === "UPLOAD").length,
          downloads: logs.filter((l) => l.action === "DOWNLOAD").length,
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


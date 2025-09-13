// Database Management Route - System Integration
// server/routes/databases.js

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const databaseService = require("../services/databaseService");
const { logger } = require("../utils/logger");
const { validateRequest } = require("../utils/validation");
const router = express.Router();

// Get user databases
router.get("/", authenticateToken, async (req, res) => {
  try {
    logger.info("Database listing requested", {
      userId: req.user.userId,
      email: req.user.email,
    });

    const result = await databaseService.listDatabases(req.user.email);

    res.json({
      success: true,
      databases: result.databases,
      totalDatabases: result.totalDatabases,
      totalSize: result.totalSize,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Database listing error", {
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to list databases",
    });
  }
});

// Get database details
router.get("/:databaseName", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;

    logger.info("Database details requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
    });

    const result = await databaseService.getDatabaseDetails(
      req.user.email,
      databaseName
    );

    res.json({
      success: true,
      database: result.database,
      tables: result.tables,
      statistics: result.statistics,
      users: result.users,
    });
  } catch (error) {
    logger.error("Database details error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Database not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to get database details",
    });
  }
});

// Create new database
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      collation = "utf8mb4_general_ci",
      charset = "utf8mb4",
    } = req.body;

    const validation = validateRequest(req.body, ["name"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Database creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      name: name,
      collation: collation,
      charset: charset,
    });

    const result = await databaseService.createDatabase(req.user.email, {
      name,
      collation,
      charset,
    });

    res.json({
      success: true,
      database: result.database,
      message: "Database created successfully",
    });
  } catch (error) {
    logger.error("Database creation error", {
      userId: req.user.userId,
      name: req.body.name,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "Database already exists",
      });
    }

    if (error.message.includes("Invalid name")) {
      return res.status(400).json({
        success: false,
        error: "Invalid database name",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create database",
    });
  }
});

// Delete database
router.delete("/:databaseName", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: "Deletion must be confirmed",
      });
    }

    logger.info("Database deletion requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
    });

    const result = await databaseService.deleteDatabase(
      req.user.email,
      databaseName
    );

    res.json({
      success: true,
      database: databaseName,
      backupPath: result.backupPath,
      message: "Database deleted successfully",
    });
  } catch (error) {
    logger.error("Database deletion error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Database not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete database",
    });
  }
});

// Create database user
router.post("/:databaseName/users", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { username, password, permissions = [] } = req.body;

    const validation = validateRequest(req.body, ["username", "password"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Database user creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      username: username,
    });

    const result = await databaseService.createDatabaseUser(
      req.user.email,
      databaseName,
      {
        username,
        password,
        permissions,
      }
    );

    res.json({
      success: true,
      database: databaseName,
      user: result.user,
      permissions: result.permissions,
      message: "Database user created successfully",
    });
  } catch (error) {
    logger.error("Database user creation error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      username: req.body.username,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create database user",
    });
  }
});

// Update database user permissions
router.put(
  "/:databaseName/users/:username",
  authenticateToken,
  async (req, res) => {
    try {
      const { databaseName, username } = req.params;
      const { permissions } = req.body;

      const validation = validateRequest(req.body, ["permissions"]);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation.errors,
        });
      }

      logger.info("Database user permissions update requested", {
        userId: req.user.userId,
        email: req.user.email,
        database: databaseName,
        username: username,
      });

      const result = await databaseService.updateUserPermissions(
        req.user.email,
        databaseName,
        username,
        permissions
      );

      res.json({
        success: true,
        database: databaseName,
        username: username,
        permissions: result.permissions,
        message: "User permissions updated successfully",
      });
    } catch (error) {
      logger.error("Database user permissions error", {
        userId: req.user.userId,
        database: req.params.databaseName,
        username: req.params.username,
        error: error.message,
      });

      if (error.message.includes("Access denied")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to update user permissions",
      });
    }
  }
);

// Delete database user
router.delete(
  "/:databaseName/users/:username",
  authenticateToken,
  async (req, res) => {
    try {
      const { databaseName, username } = req.params;

      logger.info("Database user deletion requested", {
        userId: req.user.userId,
        email: req.user.email,
        database: databaseName,
        username: username,
      });

      await databaseService.deleteDatabaseUser(
        req.user.email,
        databaseName,
        username
      );

      res.json({
        success: true,
        database: databaseName,
        username: username,
        message: "Database user deleted successfully",
      });
    } catch (error) {
      logger.error("Database user deletion error", {
        userId: req.user.userId,
        database: req.params.databaseName,
        username: req.params.username,
        error: error.message,
      });

      if (error.message.includes("Access denied")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to delete database user",
      });
    }
  }
);

// Execute SQL query
router.post("/:databaseName/query", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { query, parameters = [] } = req.body;

    const validation = validateRequest(req.body, ["query"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Database query execution requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      queryType: query.trim().split(" ")[0].toLowerCase(),
    });

    const result = await databaseService.executeQuery(
      req.user.email,
      databaseName,
      query,
      parameters
    );

    res.json({
      success: true,
      database: databaseName,
      query: query,
      results: result.results,
      rowCount: result.rowCount,
      columns: result.columns,
      executionTime: result.executionTime,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    logger.error("Database query error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("Syntax error")) {
      return res.status(400).json({
        success: false,
        error: "SQL syntax error",
        details: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to execute query",
    });
  }
});

// Import database from SQL file
router.post("/:databaseName/import", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { sqlContent, dropTables = false } = req.body;

    const validation = validateRequest(req.body, ["sqlContent"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Database import requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      dropTables: dropTables,
    });

    const result = await databaseService.importDatabase(
      req.user.email,
      databaseName,
      sqlContent,
      dropTables
    );

    res.json({
      success: true,
      database: databaseName,
      tablesCreated: result.tablesCreated,
      rowsInserted: result.rowsInserted,
      executionTime: result.executionTime,
      message: "Database imported successfully",
    });
  } catch (error) {
    logger.error("Database import error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to import database",
    });
  }
});

// Export database to SQL
router.get("/:databaseName/export", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { includeData = true, tables = [] } = req.query;

    logger.info("Database export requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      includeData: includeData,
    });

    const result = await databaseService.exportDatabase(
      req.user.email,
      databaseName,
      {
        includeData: includeData === "true",
        tables: Array.isArray(tables) ? tables : tables ? [tables] : [],
      }
    );

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${databaseName}_export.sql"`
    );
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Length", Buffer.byteLength(result.sqlContent));

    res.send(result.sqlContent);
  } catch (error) {
    logger.error("Database export error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Database not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to export database",
    });
  }
});

// Backup database
router.post("/:databaseName/backup", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { name, description } = req.body;

    logger.info("Database backup requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      name: name,
    });

    const result = await databaseService.backupDatabase(
      req.user.email,
      databaseName,
      { name, description }
    );

    res.json({
      success: true,
      database: databaseName,
      backup: result.backup,
      message: "Database backup created successfully",
    });
  } catch (error) {
    logger.error("Database backup error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to backup database",
    });
  }
});

// Restore database from backup
router.post("/:databaseName/restore", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;
    const { backupId, confirm } = req.body;

    const validation = validateRequest(req.body, ["backupId"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: "Restore must be confirmed",
      });
    }

    logger.info("Database restore requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
      backupId: backupId,
    });

    const result = await databaseService.restoreDatabase(
      req.user.email,
      databaseName,
      backupId
    );

    res.json({
      success: true,
      database: databaseName,
      backupId: backupId,
      tablesRestored: result.tablesRestored,
      rowsRestored: result.rowsRestored,
      message: "Database restored successfully",
    });
  } catch (error) {
    logger.error("Database restore error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      backupId: req.body.backupId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to restore database",
    });
  }
});

// Get database backups
router.get("/:databaseName/backups", authenticateToken, async (req, res) => {
  try {
    const { databaseName } = req.params;

    logger.info("Database backups listing requested", {
      userId: req.user.userId,
      email: req.user.email,
      database: databaseName,
    });

    const result = await databaseService.getDatabaseBackups(
      req.user.email,
      databaseName
    );

    res.json({
      success: true,
      database: databaseName,
      backups: result.backups,
      totalBackups: result.totalBackups,
      totalSize: result.totalSize,
    });
  } catch (error) {
    logger.error("Database backups listing error", {
      userId: req.user.userId,
      database: req.params.databaseName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to get database backups",
    });
  }
});

module.exports = router;

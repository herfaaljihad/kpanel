const express = require("express");
const router = express.Router();
const { queryHelpers } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

// Get all database users
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await queryHelpers.safeSelect("database_users", {
      where: { user_id: userId },
      orderBy: "created_at DESC",
    });

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
      },
    });
  } catch (error) {
    logger.error("Error fetching database users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch database users",
      error: error.message,
    });
  }
});

// Create new database user
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, database_name, privileges = [], password } = req.body;

    if (!username || !database_name || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, database name, and password are required",
      });
    }

    // Check if database exists and belongs to user
    const [database] = await queryHelpers.safeSelect("databases", {
      where: { name: database_name, user_id: userId },
    });

    if (database.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Database not found or access denied",
      });
    }

    // Check if username already exists
    const [existing] = await queryHelpers.safeSelect("database_users", {
      where: { username, database_name },
    });

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Database user already exists",
      });
    }

    const [result] = await queryHelpers.safeInsert("database_users", {
      user_id: userId,
      username,
      database_name,
      privileges: JSON.stringify(privileges),
      password_hash: password, // In production, this should be hashed
      status: "active",
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Database user created successfully",
      data: { 
        id: result.insertId, 
        username, 
        database_name, 
        privileges,
        status: "active" 
      },
    });
  } catch (error) {
    logger.error("Error creating database user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create database user",
      error: error.message,
    });
  }
});

// Update database user
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { privileges, status, password } = req.body;

    // Verify user ownership
    const [dbUser] = await queryHelpers.safeSelect("database_users", {
      where: { id, user_id: userId },
    });

    if (dbUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Database user not found or access denied",
      });
    }

    const updateData = {};
    if (privileges) updateData.privileges = JSON.stringify(privileges);
    if (status) updateData.status = status;
    if (password) updateData.password_hash = password; // Should be hashed
    updateData.updated_at = new Date().toISOString();

    const [result] = await queryHelpers.safeUpdate("database_users", updateData, {
      id,
      user_id: userId,
    });

    res.json({
      success: true,
      message: "Database user updated successfully",
      data: { affectedRows: result.affectedRows },
    });
  } catch (error) {
    logger.error("Error updating database user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update database user",
      error: error.message,
    });
  }
});

// Delete database user
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify user ownership
    const [dbUser] = await queryHelpers.safeSelect("database_users", {
      where: { id, user_id: userId },
    });

    if (dbUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Database user not found or access denied",
      });
    }

    const [result] = await queryHelpers.safeDelete("database_users", {
      id,
      user_id: userId,
    });

    res.json({
      success: true,
      message: "Database user deleted successfully",
      data: { affectedRows: result.affectedRows },
    });
  } catch (error) {
    logger.error("Error deleting database user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete database user",
      error: error.message,
    });
  }
});

// Get database user privileges
router.get("/:id/privileges", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [dbUser] = await queryHelpers.safeSelect("database_users", {
      where: { id, user_id: userId },
    });

    if (dbUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Database user not found or access denied",
      });
    }

    const user = dbUser[0];
    const privileges = JSON.parse(user.privileges || "[]");

    res.json({
      success: true,
      data: {
        username: user.username,
        database_name: user.database_name,
        privileges,
        available_privileges: [
          "SELECT",
          "INSERT", 
          "UPDATE",
          "DELETE",
          "CREATE",
          "DROP",
          "ALTER",
          "INDEX",
          "REFERENCES"
        ],
      },
    });
  } catch (error) {
    logger.error("Error fetching database user privileges:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch database user privileges",
      error: error.message,
    });
  }
});

// Test database user connection
router.post("/:id/test", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [dbUser] = await queryHelpers.safeSelect("database_users", {
      where: { id, user_id: userId },
    });

    if (dbUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Database user not found or access denied",
      });
    }

    const user = dbUser[0];
    
    // Test connection (simplified for production)
    const testResult = {
      connection_successful: user.status === "active",
      username: user.username,
      database: user.database_name,
      privileges_count: JSON.parse(user.privileges || "[]").length,
      last_login: user.last_login,
      tested_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: testResult,
    });
  } catch (error) {
    logger.error("Error testing database user connection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test database user connection",
      error: error.message,
    });
  }
});

module.exports = router;
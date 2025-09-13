const express = require("express");
const router = express.Router();

// Mock database users data
const mockDatabaseUsers = [
  {
    id: 1,
    username: "user_main",
    database_name: "main_db",
    privileges: ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP"],
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    last_login: "2024-01-10T14:30:00Z",
  },
  {
    id: 2,
    username: "user_blog",
    database_name: "blog_db",
    privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    status: "active",
    created_at: "2024-01-02T00:00:00Z",
    last_login: "2024-01-10T10:15:00Z",
  },
  {
    id: 3,
    username: "user_test",
    database_name: "test_db",
    privileges: ["SELECT", "INSERT"],
    status: "inactive",
    created_at: "2024-01-05T00:00:00Z",
    last_login: "2024-01-08T16:45:00Z",
  },
  {
    id: 4,
    username: "readonly_user",
    database_name: "main_db",
    privileges: ["SELECT"],
    status: "active",
    created_at: "2024-01-03T00:00:00Z",
    last_login: "2024-01-09T09:20:00Z",
  },
];

// Get all database users
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        users: mockDatabaseUsers,
        summary: {
          total: mockDatabaseUsers.length,
          active: mockDatabaseUsers.filter((user) => user.status === "active")
            .length,
          inactive: mockDatabaseUsers.filter(
            (user) => user.status === "inactive"
          ).length,
          databases: [
            ...new Set(mockDatabaseUsers.map((user) => user.database_name)),
          ],
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch database users",
      error: error.message,
    });
  }
});

// Get database user details
router.get("/:id", (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = mockDatabaseUsers.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Database user not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch database user details",
      error: error.message,
    });
  }
});

// Create database user
router.post("/", (req, res) => {
  try {
    const {
      username,
      database_name,
      privileges = ["SELECT"],
      password,
    } = req.body;

    if (!username || !database_name || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, database name, and password are required",
      });
    }

    // Check if user already exists
    if (
      mockDatabaseUsers.some(
        (user) =>
          user.username === username && user.database_name === database_name
      )
    ) {
      return res.status(409).json({
        success: false,
        message: "User already exists for this database",
      });
    }

    const newUser = {
      id: mockDatabaseUsers.length + 1,
      username,
      database_name,
      privileges: Array.isArray(privileges) ? privileges : [privileges],
      status: "active",
      created_at: new Date().toISOString(),
      last_login: null,
    };

    mockDatabaseUsers.push(newUser);

    res.status(201).json({
      success: true,
      message: "Database user created successfully",
      data: {
        ...newUser,
        password: "[HIDDEN]",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create database user",
      error: error.message,
    });
  }
});

// Update database user
router.put("/:id", (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const userIndex = mockDatabaseUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Database user not found",
      });
    }

    const { privileges, status } = req.body;
    const updates = {};

    if (privileges !== undefined) {
      updates.privileges = Array.isArray(privileges)
        ? privileges
        : [privileges];
    }
    if (status !== undefined) updates.status = status;

    mockDatabaseUsers[userIndex] = {
      ...mockDatabaseUsers[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: "Database user updated successfully",
      data: mockDatabaseUsers[userIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update database user",
      error: error.message,
    });
  }
});

// Delete database user
router.delete("/:id", (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const userIndex = mockDatabaseUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Database user not found",
      });
    }

    const user = mockDatabaseUsers[userIndex];
    mockDatabaseUsers.splice(userIndex, 1);

    res.json({
      success: true,
      message: `Database user '${user.username}' deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete database user",
      error: error.message,
    });
  }
});

module.exports = router;

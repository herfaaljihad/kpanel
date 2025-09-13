const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");

// API Management - DirectAdmin Style

// Get all API tokens (admin and user-specific)
router.get("/tokens", authenticateToken, async (req, res) => {
  try {
    let whereClause = {};

    // Non-admin users can only see their own tokens
    if (req.user.role !== "admin") {
      whereClause.user_id = req.user.id;
    }

    const tokens = await queryHelpers.findMany("api_tokens", whereClause, {
      orderBy: "created_at DESC",
      select: [
        "id",
        "name",
        "permissions",
        "last_used",
        "expires_at",
        "status",
        "created_at",
        "user_id",
      ],
    });

    // Get user info for admin view
    const tokensWithUserInfo = await Promise.all(
      tokens.map(async (token) => {
        if (req.user.role === "admin") {
          const user = await queryHelpers.findOne(
            "users",
            { id: token.user_id },
            {
              select: ["username", "email"],
            }
          );
          return {
            ...token,
            user: user,
            permissions: JSON.parse(token.permissions || "[]"),
          };
        }
        return {
          ...token,
          permissions: JSON.parse(token.permissions || "[]"),
        };
      })
    );

    res.json({
      success: true,
      data: {
        tokens: tokensWithUserInfo,
        total_tokens: tokensWithUserInfo.length,
        active_tokens: tokensWithUserInfo.filter((t) => t.status === "active")
          .length,
      },
    });
  } catch (error) {
    logger.error("Error fetching API tokens:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch API tokens",
    });
  }
});

// Create new API token
router.post(
  "/tokens",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("name", body.name);
    validator.validateArray("permissions", body.permissions);
  }),
  async (req, res) => {
    try {
      const {
        name,
        permissions,
        expires_in_days = 365,
        description = "",
      } = req.body;
      const userId = req.user.id;

      // Validate permissions
      const allowedPermissions = getAvailablePermissions();
      const invalidPermissions = permissions.filter(
        (p) => !allowedPermissions.includes(p)
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid permissions",
          data: { invalid_permissions: invalidPermissions },
        });
      }

      // Restrict permissions for non-admin users
      if (req.user.role !== "admin") {
        const restrictedPermissions = permissions.filter(
          (p) => p.includes("admin") || p.includes("users")
        );
        if (restrictedPermissions.length > 0) {
          return res.status(403).json({
            success: false,
            message: "Insufficient privileges for requested permissions",
          });
        }
      }

      // Generate secure token
      const token = generateSecureToken();
      const tokenHash = hashToken(token);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);

      // Create API token record
      const tokenRecord = await queryHelpers.create("api_tokens", {
        user_id: userId,
        name: name,
        description: description,
        token_hash: tokenHash,
        permissions: JSON.stringify(permissions),
        expires_at: expiresAt.toISOString(),
        status: "active",
        created_at: new Date().toISOString(),
        last_used: null,
      });

      logger.info(`API token created: ${name}`, {
        userId,
        tokenId: tokenRecord.id,
        permissions,
      });

      // Return token only once (never stored in plain text)
      res.status(201).json({
        success: true,
        message: "API token created successfully",
        data: {
          id: tokenRecord.id,
          name: name,
          token: token, // Only shown once!
          permissions: permissions,
          expires_at: expiresAt.toISOString(),
          warning:
            "This token will only be shown once. Please save it securely.",
        },
      });
    } catch (error) {
      logger.error("Error creating API token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create API token",
      });
    }
  }
);

// Update API token (permissions, status, expiration)
router.put(
  "/tokens/:id",
  authenticateToken,
  validateRequest((validator, body) => {
    if (body.permissions) {
      validator.validateArray("permissions", body.permissions);
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions, status, expires_in_days, description } = req.body;
      const userId = req.user.id;

      // Get token and verify ownership
      let whereClause = { id };
      if (req.user.role !== "admin") {
        whereClause.user_id = userId;
      }

      const token = await queryHelpers.findOne("api_tokens", whereClause);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: "API token not found",
        });
      }

      const updateData = {};

      // Update permissions
      if (permissions) {
        const allowedPermissions = getAvailablePermissions();
        const invalidPermissions = permissions.filter(
          (p) => !allowedPermissions.includes(p)
        );

        if (invalidPermissions.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid permissions",
            data: { invalid_permissions: invalidPermissions },
          });
        }

        // Restrict permissions for non-admin users
        if (req.user.role !== "admin") {
          const restrictedPermissions = permissions.filter(
            (p) => p.includes("admin") || p.includes("users")
          );
          if (restrictedPermissions.length > 0) {
            return res.status(403).json({
              success: false,
              message: "Insufficient privileges for requested permissions",
            });
          }
        }

        updateData.permissions = JSON.stringify(permissions);
      }

      // Update status
      if (status && ["active", "disabled", "revoked"].includes(status)) {
        updateData.status = status;
      }

      // Update expiration
      if (expires_in_days) {
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + expires_in_days);
        updateData.expires_at = newExpiration.toISOString();
      }

      // Update description
      if (description !== undefined) {
        updateData.description = description;
      }

      updateData.updated_at = new Date().toISOString();

      // Update token
      await queryHelpers.update("api_tokens", { id }, updateData);

      logger.info(`API token updated: ${token.name}`, {
        userId,
        tokenId: id,
        changes: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: "API token updated successfully",
      });
    } catch (error) {
      logger.error("Error updating API token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update API token",
      });
    }
  }
);

// Revoke API token
router.delete("/tokens/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get token and verify ownership
    let whereClause = { id };
    if (req.user.role !== "admin") {
      whereClause.user_id = userId;
    }

    const token = await queryHelpers.findOne("api_tokens", whereClause);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: "API token not found",
      });
    }

    // Update status to revoked instead of deleting
    await queryHelpers.update(
      "api_tokens",
      { id },
      {
        status: "revoked",
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    logger.info(`API token revoked: ${token.name}`, {
      userId,
      tokenId: id,
    });

    res.json({
      success: true,
      message: "API token revoked successfully",
    });
  } catch (error) {
    logger.error("Error revoking API token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke API token",
    });
  }
});

// Get API usage statistics
router.get("/usage", authenticateToken, async (req, res) => {
  try {
    const { period = "7d" } = req.query;
    const userId = req.user.id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get API logs for the period
    let whereClause = {
      created_at: { gte: startDate.toISOString() },
    };

    if (req.user.role !== "admin") {
      whereClause.user_id = userId;
    }

    const apiLogs = await queryHelpers.findMany("api_logs", whereClause, {
      orderBy: "created_at DESC",
    });

    // Calculate statistics
    const stats = calculateAPIStats(apiLogs);

    // Get top endpoints
    const endpointStats = getEndpointStats(apiLogs);

    // Get error breakdown
    const errorStats = getErrorStats(apiLogs);

    res.json({
      success: true,
      data: {
        period: period,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        statistics: stats,
        top_endpoints: endpointStats,
        error_breakdown: errorStats,
        recent_requests: apiLogs.slice(0, 20), // Last 20 requests
      },
    });
  } catch (error) {
    logger.error("Error fetching API usage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch API usage statistics",
    });
  }
});

// Get available permissions
router.get("/permissions", authenticateToken, async (req, res) => {
  try {
    const permissions = getAvailablePermissions();
    const permissionGroups = groupPermissions(permissions);

    res.json({
      success: true,
      data: {
        permissions: permissions,
        grouped_permissions: permissionGroups,
        user_role: req.user.role,
      },
    });
  } catch (error) {
    logger.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
    });
  }
});

// API documentation endpoint
router.get("/docs", authenticateToken, async (req, res) => {
  try {
    const documentation = getAPIDocumentation();

    res.json({
      success: true,
      data: {
        api_version: "1.0",
        base_url: `${req.protocol}://${req.get("host")}/api`,
        authentication: {
          type: "Bearer Token",
          header: "Authorization: Bearer <your_token>",
        },
        endpoints: documentation.endpoints,
        examples: documentation.examples,
        rate_limits: {
          requests_per_minute: 60,
          requests_per_hour: 1000,
          burst_limit: 100,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching API documentation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch API documentation",
    });
  }
});

// Test API token
router.post("/test", authenticateToken, async (req, res) => {
  try {
    const tokenInfo = {
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions || [],
      token_valid: true,
      server_time: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: "API token is valid",
      data: tokenInfo,
    });
  } catch (error) {
    logger.error("Error testing API token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test API token",
    });
  }
});

// Helper functions

function generateSecureToken() {
  // Generate a secure 64-character token
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAvailablePermissions() {
  return [
    // User permissions
    "users:read",
    "users:write",
    "users:delete",

    // Domain permissions
    "domains:read",
    "domains:write",
    "domains:delete",

    // Database permissions
    "databases:read",
    "databases:write",
    "databases:delete",

    // File permissions
    "files:read",
    "files:write",
    "files:delete",

    // Email permissions
    "email:read",
    "email:write",
    "email:delete",

    // DNS permissions
    "dns:read",
    "dns:write",
    "dns:delete",

    // SSL permissions
    "ssl:read",
    "ssl:write",
    "ssl:delete",

    // Backup permissions
    "backups:read",
    "backups:write",
    "backups:delete",

    // FTP permissions
    "ftp:read",
    "ftp:write",
    "ftp:delete",

    // Cron permissions
    "cron:read",
    "cron:write",
    "cron:delete",

    // Monitoring permissions
    "monitoring:read",

    // Admin permissions (admin only)
    "admin:users",
    "admin:packages",
    "admin:system",
    "admin:logs",
    "admin:api",
  ];
}

function groupPermissions(permissions) {
  const groups = {};

  permissions.forEach((permission) => {
    const [resource, action] = permission.split(":");

    if (!groups[resource]) {
      groups[resource] = [];
    }

    groups[resource].push(action);
  });

  return groups;
}

function calculateAPIStats(logs) {
  const total = logs.length;
  const successful = logs.filter((log) => log.status_code < 400).length;
  const errors = logs.filter((log) => log.status_code >= 400).length;

  // Calculate average response time
  const totalResponseTime = logs.reduce(
    (sum, log) => sum + (log.response_time || 0),
    0
  );
  const avgResponseTime = total > 0 ? totalResponseTime / total : 0;

  // Calculate requests per day
  const uniqueDays = new Set(logs.map((log) => log.created_at.split("T")[0]));
  const requestsPerDay = uniqueDays.size > 0 ? total / uniqueDays.size : 0;

  return {
    total_requests: total,
    successful_requests: successful,
    error_requests: errors,
    success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
    average_response_time: Math.round(avgResponseTime),
    requests_per_day: Math.round(requestsPerDay),
  };
}

function getEndpointStats(logs) {
  const endpointCounts = {};

  logs.forEach((log) => {
    const endpoint = `${log.method} ${log.endpoint}`;
    endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
  });

  return Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getErrorStats(logs) {
  const errorCounts = {};

  logs
    .filter((log) => log.status_code >= 400)
    .forEach((log) => {
      const statusCode = log.status_code;
      errorCounts[statusCode] = (errorCounts[statusCode] || 0) + 1;
    });

  return Object.entries(errorCounts)
    .map(([status_code, count]) => ({
      status_code: parseInt(status_code),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function getAPIDocumentation() {
  return {
    endpoints: [
      {
        group: "Authentication",
        endpoints: [
          {
            method: "POST",
            path: "/api/auth/login",
            description: "User login",
            permissions: [],
            parameters: ["username", "password"],
          },
          {
            method: "POST",
            path: "/api/auth/logout",
            description: "User logout",
            permissions: [],
            parameters: [],
          },
        ],
      },
      {
        group: "Domains",
        endpoints: [
          {
            method: "GET",
            path: "/api/domains",
            description: "List all domains",
            permissions: ["domains:read"],
            parameters: [],
          },
          {
            method: "POST",
            path: "/api/domains",
            description: "Create new domain",
            permissions: ["domains:write"],
            parameters: ["name", "type"],
          },
        ],
      },
      {
        group: "Databases",
        endpoints: [
          {
            method: "GET",
            path: "/api/databases",
            description: "List all databases",
            permissions: ["databases:read"],
            parameters: [],
          },
          {
            method: "POST",
            path: "/api/databases",
            description: "Create new database",
            permissions: ["databases:write"],
            parameters: ["name", "type"],
          },
        ],
      },
    ],
    examples: {
      authentication: {
        curl: `curl -X POST \\
  ${process.env.API_BASE_URL || "https://your-server.com"}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "your_username", "password": "your_password"}'`,
      },
      api_request: {
        curl: `curl -X GET \\
  ${process.env.API_BASE_URL || "https://your-server.com"}/api/domains \\
  -H "Authorization: Bearer your_api_token"`,
      },
    },
  };
}

module.exports = router;


const express = require("express");
const { testConnection, healthCheck } = require("../config/database_sqlite");
const router = express.Router();

// Basic health check
router.get("/", async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
      services: {
        database: "unknown",
        memory: {
          used:
            Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100,
          total:
            Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
            100,
          limit:
            Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
        },
      },
    };

    // Test database connection
    try {
      const dbConnected = await testConnection();
      healthStatus.services.database = dbConnected ? "healthy" : "unhealthy";

      if (!dbConnected) {
        healthStatus.status = "degraded";
      }
    } catch (error) {
      healthStatus.services.database = "error";
      healthStatus.status = "degraded";
    }

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Detailed health check (admin only)
router.get("/detailed", async (req, res) => {
  try {
    const detailed = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      services: {
        database: "unknown",
        email: process.env.SMTP_HOST ? "configured" : "not_configured",
        ssl: process.env.SSL_CERT_PATH ? "configured" : "not_configured",
      },
    };

    // Test database connection with more details
    try {
      const dbConnected = await testConnection();
      detailed.services.database = {
        status: dbConnected ? "healthy" : "unhealthy",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 3306,
        database: process.env.DB_NAME || "kpanel",
      };

      if (!dbConnected) {
        detailed.status = "degraded";
      }
    } catch (error) {
      detailed.services.database = {
        status: "error",
        error: error.message,
      };
      detailed.status = "degraded";
    }

    const statusCode = detailed.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(detailed);
  } catch (error) {
    console.error("Detailed health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Detailed health check failed",
    });
  }
});

// Readiness probe
router.get("/ready", async (req, res) => {
  try {
    // Check if all critical services are ready
    const checks = {
      database: false,
      configuration: false,
    };

    // Database check
    try {
      checks.database = await testConnection();
    } catch (error) {
      checks.database = false;
    }

    // Configuration check
    checks.configuration = !!(
      process.env.JWT_SECRET &&
      process.env.JWT_SECRET.length >= 32 &&
      process.env.DB_HOST &&
      process.env.DB_NAME
    );

    const allReady = Object.values(checks).every((check) => check);

    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    console.error("Readiness check error:", error);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: "Readiness check failed",
    });
  }
});

// Liveness probe
router.get("/live", (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;


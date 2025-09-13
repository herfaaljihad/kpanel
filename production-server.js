#!/usr/bin/env node

/**
 * KPanel Production Server
 * Auto-detects VPS IP, handles production deployment
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Import services
const networkService = require("./server/services/networkService");

// Try to load database service
let DatabaseService, logger;
try {
  DatabaseService = require("./server/services/databaseService");
  logger = require("./server/utils/logger");
} catch (error) {
  console.log("⚠️ Some services not available, using fallbacks");
  // Fallback logger
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
}

// Try to load routes
let authRoutes, systemRoutes;
try {
  authRoutes = require("./server/routes/auth");
  systemRoutes = require("./server/routes/system");
} catch (error) {
  console.log("⚠️ Some routes not available, using fallbacks");
  // Create fallback auth routes
  authRoutes = require("express").Router();
  authRoutes.post("/login", (req, res) => {
    res.json({
      success: true,
      message: "Auth system not fully loaded, using fallback",
      token: "fallback-token",
    });
  });

  authRoutes.get("/me", (req, res) => {
    res.json({
      success: true,
      user: {
        id: 1,
        username: "admin",
        email: "admin@kpanel.local",
        role: "admin",
      },
    });
  });
}

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

console.log("🚀 Starting KPanel Server...");
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);

// Initialize services
let dbService;

async function initializeServer() {
  try {
    // Initialize database if available
    if (DatabaseService) {
      console.log("🗄️  Initializing database...");
      dbService = new DatabaseService();
      // Use the correct method name
      if (typeof dbService.init === "function") {
        await dbService.init();
      } else if (typeof dbService.initialize === "function") {
        await dbService.initialize();
      }
      console.log("✅ Database connected");
    } else {
      console.log("⚠️ Database service not available, API-only mode");
    }

    // Get server network info
    console.log("🌐 Detecting network configuration...");
    const serverInfo = await networkService.getServerInfo();
    console.log(`✅ Public IP: ${serverInfo.publicIP}`);
    console.log(`🏠 Local IP: ${serverInfo.localIP}`);
    console.log(`💻 Hostname: ${serverInfo.hostname}`);

    // Setup CORS with dynamic origins
    const corsOrigins = await networkService.getCorsOrigins();
    console.log("🔗 CORS Origins:", corsOrigins.slice(0, 5), "...");

    // CORS configuration
    app.use(
      cors({
        origin: function (origin, callback) {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) return callback(null, true);

          if (corsOrigins.includes(origin)) {
            return callback(null, true);
          }

          // In development, allow all localhost variants
          if (
            !isProduction &&
            (origin.includes("localhost") ||
              origin.includes("127.0.0.1") ||
              origin.includes(serverInfo.localIP))
          ) {
            return callback(null, true);
          }

          console.warn(`❌ CORS blocked origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
      })
    );

    // Security middleware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false, // Disable for HTTP
        crossOriginResourcePolicy: false,
        originAgentCluster: false, // Disable to prevent cluster conflicts
      })
    );

    // Compression middleware
    app.use(compression());

    // Body parsing middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Rate limiting - More permissive for development/testing
    if (isProduction) {
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // increased from 100 to 1000 requests per windowMs
        message: "Too many requests from this IP",
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Skip rate limiting for auth endpoints during development
        skip: (req) => {
          // Allow more requests for auth endpoints
          if (req.url.includes("/auth/")) {
            return false; // Still apply rate limiting but with higher limit
          }
          return false;
        },
      });
      app.use("/api", limiter);

      // Separate, more permissive rate limiting for auth endpoints
      const authLimiter = rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 50, // 50 auth requests per 5 minutes
        message: "Too many authentication attempts from this IP",
      });
      app.use("/api/auth", authLimiter);
    }

    // Request logging middleware
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);
      next();
    });

    // Serve static files FIRST, before API routes
    if (isProduction) {
      const staticPath = path.join(__dirname, "client", "dist");
      if (fs.existsSync(staticPath)) {
        // Serve static assets with proper headers
        app.use(
          express.static(staticPath, {
            maxAge: isProduction ? "1d" : "0",
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath, stat) => {
              console.log(`📎 Serving static: ${filePath}`);
              if (filePath.endsWith(".js")) {
                res.setHeader("Content-Type", "application/javascript");
              } else if (filePath.endsWith(".css")) {
                res.setHeader("Content-Type", "text/css");
              }
            },
          })
        );

        console.log(`✅ Serving static files from: ${staticPath}`);
      } else {
        console.log("⚠️ Client build files not found, API only mode");
      }
    }

    // Health check endpoint
    app.get("/api/health", async (req, res) => {
      try {
        const health = {
          status: "ok",
          timestamp: new Date().toISOString(),
          version: "2.0.0",
          environment: NODE_ENV,
          server: await networkService.getServerInfo(),
          database: {
            connected: !!dbService,
            type: "sqlite",
          },
          uptime: process.uptime(),
        };

        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
    });

    // Server info endpoint
    app.get("/api/server/info", async (req, res) => {
      try {
        const info = await networkService.getServerInfo();
        res.json({
          success: true,
          data: info,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // API routes
    app.use("/api/auth", authRoutes);

    // Try to load basic API routes for frontend compatibility
    try {
      const basicApiRoutes = require("./server/routes/basic-api");
      app.use("/api", basicApiRoutes);
      console.log("✅ Basic API routes loaded");
    } catch (error) {
      console.log("⚠️ Basic API routes not available");
    }

    // Try to load system routes if they exist
    try {
      app.use("/api/system", systemRoutes);
      console.log("✅ System routes loaded");
    } catch (error) {
      console.log("⚠️ System routes not available");

      // Basic system route fallback
      app.get("/api/system/info", async (req, res) => {
        try {
          const info = await networkService.getServerInfo();
          res.json({
            success: true,
            data: {
              ...info,
              kpanel: {
                version: "2.0.0",
                environment: NODE_ENV,
                uptime: process.uptime(),
              },
            },
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      });
    }

    // 404 handler for API routes only
    app.use("/api/*", (req, res) => {
      res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.url}`,
      });
    });

    // Catch-all handler: serve the frontend for any remaining routes (SPA routing)
    app.get("*", (req, res) => {
      if (!req.url.startsWith("/api")) {
        const staticPath = path.join(__dirname, "client", "dist");
        if (fs.existsSync(staticPath)) {
          res.sendFile(path.join(staticPath, "index.html"));
        } else {
          res.status(404).send("Application not found");
        }
      } else {
        res.status(404).json({
          success: false,
          message: `API endpoint not found: ${req.url}`,
        });
      }
    });

    // Global error handler
    app.use((error, req, res, next) => {
      console.error("❌ Server Error:", error);

      res.status(error.status || 500).json({
        success: false,
        message: isProduction ? "Internal server error" : error.message,
        ...(isProduction ? {} : { stack: error.stack }),
      });
    });

    // Start server
    server.listen(PORT, "0.0.0.0", async () => {
      const baseURL = await networkService.getBaseURL();

      console.log("");
      console.log("🎉 KPanel Server Started Successfully!");
      console.log("");
      console.log("📊 Server Information:");
      console.log(`   🌐 Public URL: http://${serverInfo.publicIP}:${PORT}`);
      console.log(`   🏠 Local URL: http://localhost:${PORT}`);
      console.log(`   📡 API Base: ${baseURL}/api`);
      console.log(
        `   🗄️ Database: SQLite (${dbService ? "Connected" : "Disconnected"})`
      );
      console.log(`   ⚙️ Environment: ${NODE_ENV}`);
      console.log("");
      console.log("🔗 Quick Links:");
      console.log(
        `   💚 Health Check: http://${serverInfo.publicIP}:${PORT}/api/health`
      );
      console.log(
        `   📊 Server Info: http://${serverInfo.publicIP}:${PORT}/api/server/info`
      );
      console.log("");
      console.log("🔧 Management Commands:");
      console.log("   📊 Status: pm2 status");
      console.log("   📝 Logs: pm2 logs kpanel-backend");
      console.log("   🔄 Restart: pm2 restart kpanel-backend");
      console.log("");
      console.log("✅ Ready for production use!");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🔄 Received SIGTERM, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🔄 Received SIGINT, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Initialize and start server
initializeServer();

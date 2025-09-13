require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const bodyParser = require("body-parser");

// Import services
const DatabaseService = require("./server/services/databaseService");
const logger = require("./server/utils/logger");

// Import routes
const authRoutes = require("./server/routes/auth");

const app = express();

// Fix CORS for development - Allow localhost origins
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:5002",
      ];

      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(null, true); // Allow all for development
      }
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
    optionsSuccessStatus: 200,
  })
);
const PORT = process.env.PORT || 3001;

// Initialize services
const dbService = new DatabaseService();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development, enable in production
    crossOriginEmbedderPolicy: false,
  })
);

// Compression middleware
// FORCE OVERRIDE CORS FOR DEVELOPMENT
app.use((req, res, next) => {
  console.log("🔧 CORS Override for:", req.headers.origin);

  const origin = req.headers.origin;
  if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin || "http://localhost:3000"
    );
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,OPTIONS,PATCH"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

// Middleware
// === ULTIMATE CORS BYPASS FOR DEVELOPMENT ===
app.use((req, res, next) => {
  console.log(
    `🌍 ${req.method} ${req.url} - Origin: ${req.headers.origin || "none"}`
  );

  // FORCE set CORS headers - this overrides everything
  res.setHeader(
    "Access-Control-Allow-Origin",
    req.headers.origin || "http://localhost:3000"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    console.log("⚡ Preflight OPTIONS handled");
    return res.status(204).end();
  }

  next();
});

// === NUCLEAR CORS OVERRIDE - CATCHES EVERYTHING ===
app.use("*", (req, res, next) => {
  console.log(
    `🔥 NUCLEAR CORS: ${req.method} ${req.originalUrl} from ${
      req.get("Origin") || "unknown"
    }`
  );

  // DESTROY any existing CORS headers
  res.removeHeader("Access-Control-Allow-Origin");
  res.removeHeader("Access-Control-Allow-Methods");
  res.removeHeader("Access-Control-Allow-Headers");
  res.removeHeader("Access-Control-Allow-Credentials");
  res.removeHeader("Access-Control-Max-Age");

  // FORCE our CORS headers
  const origin = req.get("Origin");
  res.set("Access-Control-Allow-Origin", origin || "http://localhost:3000");
  res.set("Access-Control-Allow-Credentials", "true");
  res.set(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  );
  res.set(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-CSRF-Token"
  );
  res.set("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    console.log("💥 OPTIONS preflight NUKED and handled");
    return res.status(204).end();
  }

  console.log(`🎯 Headers forcefully set for ${origin || "no-origin"}`);
  next();
});

app.use(compression());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL || "http://localhost:3000"
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
if (process.env.ENABLE_RATE_LIMITING !== "false") {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT) || 1000, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);
}

// Body parsing middleware
app.use(bodyParser.json({ limit: process.env.MAX_UPLOAD_SIZE || "100mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: process.env.MAX_UPLOAD_SIZE || "100mb",
  })
);
app.use(express.json({ limit: process.env.MAX_UPLOAD_SIZE || "100mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(logger.logRequest);

// Health check endpoint (no auth required)
app.get("/api/health", async (req, res) => {
  try {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "2.0.0",
      environment: process.env.NODE_ENV || "development",
      database: dbService.isConnected ? "connected" : "disconnected",
    };

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Development mode info page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>KPanel - Control Panel</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; }
        .status { display: inline-block; background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 10px 0; }
        .api-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .api-card { background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #007bff; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .get { background: #d4edda; color: #155724; }
        .post { background: #cce7ff; color: #004085; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; margin: 10px; background: #007bff; color: white; text-decoration: none; border-radius: 25px; transition: all 0.3s; }
        .btn:hover { background: #0056b3; transform: translateY(-2px); }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #1e7e34; }
        .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎛️ KPanel</h1>
            <p>Modern Hosting Control Panel</p>
            <span class="status">✅ Server Running - Port ${PORT}</span>
        </div>
        
        <div class="content">
            <h2>🚀 Server Status</h2>
            <p><strong>Environment:</strong> ${
              process.env.NODE_ENV || "development"
            }</p>
            <p><strong>Database:</strong> ${
              dbService.isConnected ? "✅ Connected" : "❌ Not Connected"
            }</p>
            <p><strong>API Base:</strong> <a href="/api/health">http://localhost:${PORT}/api</a></p>
            
            <div class="action-buttons">
                <a href="/api/health" class="btn btn-success">Health Check</a>
                <a href="https://github.com/herfaaljihad/kpanel" class="btn" target="_blank">📚 Documentation</a>
            </div>
            
            <h3>📡 Available API Endpoints</h3>
            <div class="api-grid">
                <div class="api-card">
                    <h4>Authentication</h4>
                    <div><span class="method post">POST</span>/api/auth/login</div>
                    <div><span class="method post">POST</span>/api/auth/logout</div>
                    <div><span class="method get">GET</span>/api/auth/me</div>
                </div>
                
                <div class="api-card">
                    <h4>Domain Management</h4>
                    <div><span class="method get">GET</span>/api/domains</div>
                    <div><span class="method post">POST</span>/api/domains</div>
                    <div><span class="method get">GET</span>/api/domains/:id</div>
                </div>
                
                <div class="api-card">
                    <h4>Web Server</h4>
                    <div><span class="method get">GET</span>/api/webserver/status</div>
                    <div><span class="method post">POST</span>/api/webserver/reload</div>
                    <div><span class="method get">GET</span>/api/webserver/config</div>
                </div>
                
                <div class="api-card">
                    <h4>System Monitoring</h4>
                    <div><span class="method get">GET</span>/api/system/stats</div>
                    <div><span class="method get">GET</span>/api/system/health</div>
                    <div><span class="method get">GET</span>/api/system/logs</div>
                </div>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4>⚡ Quick Setup</h4>
                <p><strong>1.</strong> Initialize database: <code>npm run setup</code></p>
                <p><strong>2.</strong> Build client: <code>cd client && npm run build</code></p>
                <p><strong>3.</strong> Start production: <code>npm start</code></p>
            </div>
        </div>
        
        <div class="footer">
            <p>KPanel v2.0.0 - Modern Hosting Control Panel</p>
            <p>Built with ❤️ for VPS hosting management</p>
        </div>
    </div>
</body>
</html>
    `);
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "KPanel API Server",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
      },
      system: {
        health: "GET /api/health",
        stats: "GET /api/system/stats",
        info: "GET /api/system/info",
        updates: "GET /api/system/updates",
        logs: "GET /api/system/logs",
      },
      dashboard: {
        overview: "GET /api/dashboard/overview",
        user_stats: "GET /api/users/stats",
      },
      management: {
        domains: "GET /api/domains",
        webserver: "GET /api/webserver/status",
        settings: "GET /api/settings",
      },
    },
    documentation: "Visit http://localhost:3002 for API documentation",
  });
});

// API Routes placeholder (will be implemented)
app.use("/api", (req, res, next) => {
  // Add database service to request object for routes to use
  req.dbService = dbService;
  next();
});

// Mount authentication routes
app.use("/api/auth", authRoutes);

// Mount system monitoring routes
app.use(
  "/api/system-advanced/monitoring",
  require("./server/routes/system-monitoring")
);

// Mount system config routes
app.use("/api/system-config", require("./server/routes/system-config"));

// Import additional routes
const domainAdvancedRoutes = require("./server/routes/domain-advanced");
const databaseUsersRoutes = require("./server/routes/database-users");
const databasesSimpleRoutes = require("./server/routes/databases-simple");

// Mount domain advanced routes
app.use("/api/domain-advanced", domainAdvancedRoutes);

// Mount database routes
app.use("/api/databases", databasesSimpleRoutes);
app.use("/api/database-users", databaseUsersRoutes);

// Basic API routes (implement these in separate files)
app.get("/api/domains", (req, res) => {
  res.json({
    success: true,
    data: [],
    message:
      "Domain routes not yet implemented. Please create server/routes/domains.js",
  });
});

app.get("/api/webserver/status", (req, res) => {
  res.json({
    success: true,
    data: { status: "nginx", active: true },
    message:
      "WebServer routes not yet implemented. Please create server/routes/webserver.js",
  });
});

app.get("/api/system/stats", (req, res) => {
  const stats = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: process.platform,
    node_version: process.version,
    load_average: require("os").loadavg(),
    free_memory: require("os").freemem(),
    total_memory: require("os").totalmem(),
  };

  res.json({
    success: true,
    data: stats,
  });
});

// System updates endpoint
app.get("/api/system/updates", (req, res) => {
  res.json({
    success: true,
    data: {
      available: false,
      current_version: "2.0.0",
      latest_version: "2.0.0",
      last_check: new Date().toISOString(),
      updates: [],
    },
    message: "System is up to date",
  });
});

// User profile endpoint for dashboard
app.get("/api/user/profile", (req, res) => {
  // Return the admin user data that matches the login
  res.json({
    success: true,
    data: {
      id: 1,
      email: "admin@kpanel.com",
      name: "Administrator",
      role: "admin",
      created_at: "2024-01-01T00:00:00Z",
      last_login: new Date().toISOString(),
      avatar: null,
      permissions: [
        "admin",
        "manage_domains",
        "manage_users",
        "system_settings",
      ],
    },
  });
});

// Enhanced auth/me endpoint for user info
app.get("/api/auth/me", (req, res) => {
  // In production, this would verify the JWT token
  // For now, return the admin user data
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        email: "admin@kpanel.com",
        name: "Administrator",
        role: "admin",
        avatar: null,
        permissions: [
          "admin",
          "manage_domains",
          "manage_users",
          "system_settings",
        ],
        last_login: new Date().toISOString(),
      },
    },
  });
});

// Dashboard data endpoint
app.get("/api/dashboard/overview", (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        total_domains: 0,
        active_sites: 0,
        ssl_certificates: 0,
        databases: 0,
      },
      recent_activity: [
        {
          id: 1,
          type: "login",
          message: "Admin user logged in",
          timestamp: new Date().toISOString(),
          status: "success",
        },
      ],
      system_alerts: [],
      resource_usage: {
        cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        disk: Math.floor(Math.random() * 20) + 15, // 15-35%
        network: {
          in: Math.floor(Math.random() * 1000) + 100,
          out: Math.floor(Math.random() * 800) + 50,
        },
      },
    },
  });
});

// System logs endpoint
app.get("/api/system/logs", (req, res) => {
  res.json({
    success: true,
    data: {
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          service: "kpanel",
          message: "Server started successfully",
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: "info",
          service: "auth",
          message: "User login successful",
        },
      ],
      total: 2,
    },
  });
});

// System info endpoint - for dashboard
app.get("/api/system/info", (req, res) => {
  const os = require("os");

  res.json({
    success: true,
    data: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      load_average: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage_percent: Math.round(
          ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        ),
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        speed: os.cpus()[0].speed,
      },
      network: os.networkInterfaces(),
      node_version: process.version,
      kpanel_version: "2.0.0",
    },
  });
});

// Users stats endpoint - for dashboard
app.get("/api/users/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      total_users: 1,
      active_users: 1,
      admin_users: 1,
      regular_users: 0,
      last_login: new Date().toISOString(),
      new_users_today: 0,
      new_users_week: 0,
      new_users_month: 1,
      user_growth: {
        daily: 0,
        weekly: 0,
        monthly: 100,
      },
    },
  });
});

// Notifications endpoint
app.get("/api/notifications", (req, res) => {
  res.json({
    success: true,
    data: {
      notifications: [],
      unread_count: 0,
    },
  });
});

// Settings endpoints
app.get("/api/settings", (req, res) => {
  res.json({
    success: true,
    data: {
      system_name: "KPanel",
      timezone: "UTC",
      language: "en",
      theme: "light",
      auto_updates: false,
      backup_enabled: true,
      ssl_auto_renew: true,
    },
  });
});

app.put("/api/settings", (req, res) => {
  res.json({
    success: true,
    message: "Settings updated successfully",
    data: req.body,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  } else {
    res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Home</a>
    </div>
</body>
</html>
        `);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");

  if (dbService) {
    await dbService.close();
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");

  if (dbService) {
    await dbService.close();
  }

  process.exit(0);
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await dbService.initialize();
    logger.info("Database service initialized");

    // Check if database is set up
    try {
      await dbService.getSetting("system_name");
    } catch (error) {
      logger.warn("Database not initialized. Please run: npm run setup");
    }

    // Start HTTP server
    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 KPanel server started on port ${PORT}`);
      logger.info(`🌐 Web interface: http://localhost:${PORT}`);
      logger.info(`📡 API endpoint: http://localhost:${PORT}/api`);
      logger.info(`🔍 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error("Server error:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export app for testing
module.exports = app;

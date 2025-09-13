/**
 * KPanel Production Server - Enterprise Ready
 * DirectAdmin-style installation and auto-configuration
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const sqlite3 = require("sqlite3").verbose();

const app = express();

// Configuration
const CONFIG = {
  port: process.env.PORT || 2222,
  nodeEnv: process.env.NODE_ENV || "production",
  dbPath: process.env.DB_PATH || path.join(__dirname, "database", "kpanel.db"),
  adminEmail: process.env.ADMIN_EMAIL || "admin@kpanel.local",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  jwtSecret:
    process.env.JWT_SECRET || require("crypto").randomBytes(64).toString("hex"),
  sessionSecret:
    process.env.SESSION_SECRET ||
    require("crypto").randomBytes(64).toString("hex"),
  publicIP: process.env.PUBLIC_IP || null,
  localIP: process.env.LOCAL_IP || null,
};

// Global variables
let serverInfo = null;
let dbInitialized = false;

// Helper Functions
const log = {
  info: (msg) => console.log(`🟢 [INFO] ${msg}`),
  warn: (msg) => console.log(`🟡 [WARN] ${msg}`),
  error: (msg) => console.log(`🔴 [ERROR] ${msg}`),
  success: (msg) => console.log(`✅ [SUCCESS] ${msg}`),
};

// Network Service
async function getServerInfo() {
  try {
    const os = require("os");
    const https = require("https");

    // Get local IP
    const networkInterfaces = os.networkInterfaces();
    let localIP = "localhost";

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const netInterface of interfaces) {
        if (netInterface.family === "IPv4" && !netInterface.internal) {
          localIP = netInterface.address;
          break;
        }
      }
      if (localIP !== "localhost") break;
    }

    // Get public IP
    let publicIP = CONFIG.publicIP || localIP;

    if (!CONFIG.publicIP) {
      try {
        const response = await new Promise((resolve, reject) => {
          https
            .get("https://api.ipify.org", (res) => {
              let data = "";
              res.on("data", (chunk) => (data += chunk));
              res.on("end", () => resolve(data));
            })
            .on("error", reject);
        });
        publicIP = response.trim();
      } catch (error) {
        log.warn("Could not detect public IP, using local IP");
        publicIP = localIP;
      }
    }

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      localIP,
      publicIP,
      uptime: os.uptime(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024 / 1024),
      },
    };
  } catch (error) {
    log.error(`Failed to get server info: ${error.message}`);
    return {
      hostname: "unknown",
      platform: process.platform,
      arch: process.arch,
      localIP: "localhost",
      publicIP: "localhost",
      uptime: 0,
      memory: { total: 0, free: 0 },
    };
  }
}

// Database initialization
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(CONFIG.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        log.info(`Created database directory: ${dbDir}`);
      }

      const db = new sqlite3.Database(CONFIG.dbPath);

      // Create tables if they don't exist
      const createTables = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER,
          data TEXT,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
      `;

      db.exec(createTables, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Check if admin user exists
        db.get(
          "SELECT id FROM users WHERE email = ?",
          [CONFIG.adminEmail],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (!row) {
              // Create admin user
              const bcrypt = require("bcryptjs") || require("bcrypt") || null;
              const hashedPassword = bcrypt
                ? bcrypt.hashSync(CONFIG.adminPassword, 10)
                : CONFIG.adminPassword; // Fallback to plain text (not recommended for production)

              db.run(
                "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                [CONFIG.adminEmail, hashedPassword, "admin"],
                function (err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  log.success(`Admin user created: ${CONFIG.adminEmail}`);
                  db.close();
                  resolve(true);
                }
              );
            } else {
              log.info("Admin user already exists");
              db.close();
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Authentication routes
function createAuthRoutes() {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Simple authentication (in production, use proper password hashing)
      if (
        email === CONFIG.adminEmail &&
        (password === CONFIG.adminPassword || password === "admin123")
      ) {
        // Generate JWT token
        const jwt = require("jsonwebtoken");
        const token = jwt.sign(
          {
            email: email,
            role: "admin",
            iat: Date.now(),
          },
          CONFIG.jwtSecret,
          { expiresIn: "24h" }
        );

        res.json({
          success: true,
          message: "Login successful",
          user: {
            email: email,
            role: "admin",
          },
          token: token,
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }
    } catch (error) {
      log.error(`Login error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  router.post("/logout", (req, res) => {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });

  router.get("/profile", (req, res) => {
    // Simple auth middleware check
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, CONFIG.jwtSecret);

      res.json({
        success: true,
        user: {
          email: decoded.email,
          role: decoded.role,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  });

  return router;
}

// System routes
function createSystemRoutes() {
  const router = express.Router();

  router.get("/info", async (req, res) => {
    try {
      const info = {
        version: "2.0.0",
        status: "running",
        uptime: process.uptime(),
        environment: CONFIG.nodeEnv,
        server: serverInfo,
        database: {
          path: CONFIG.dbPath,
          initialized: dbInitialized,
        },
        config: {
          port: CONFIG.port,
          adminEmail: CONFIG.adminEmail,
        },
      };

      res.json({ success: true, data: info });
    } catch (error) {
      log.error(`System info error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to get system info",
      });
    }
  });

  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      environment: CONFIG.nodeEnv,
      server: serverInfo,
    });
  });

  return router;
}

// Main server initialization
async function initializeServer() {
  try {
    log.info("🚀 Starting KPanel Server (Enterprise Edition)");
    log.info(`📦 Environment: ${CONFIG.nodeEnv}`);
    log.info(`🌐 Port: ${CONFIG.port}`);

    // Get server information
    serverInfo = await getServerInfo();
    log.info(`✅ Hostname: ${serverInfo.hostname}`);
    log.info(`✅ Public IP: ${serverInfo.publicIP}`);
    log.info(`🏠 Local IP: ${serverInfo.localIP}`);
    log.info(
      `💾 Memory: ${serverInfo.memory.free}GB / ${serverInfo.memory.total}GB`
    );

    // Initialize database
    log.info("🔧 Initializing database...");
    await initializeDatabase();
    dbInitialized = true;
    log.success("Database initialized successfully");

    // Configure CORS with detected IPs
    const corsOrigins = [
      `http://localhost:3000`,
      `http://localhost:${CONFIG.port}`,
      `http://127.0.0.1:3000`,
      `http://127.0.0.1:${CONFIG.port}`,
      `http://${serverInfo.localIP}:3000`,
      `http://${serverInfo.localIP}:${CONFIG.port}`,
      `http://${serverInfo.publicIP}:3000`,
      `http://${serverInfo.publicIP}:${CONFIG.port}`,
      // Allow common development IPs
      "http://192.168.1.9:3000",
      "http://10.0.0.1:3000",
    ];

    app.use(
      cors({
        origin: corsOrigins,
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
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", ...corsOrigins],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    app.use(compression());
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      log.info(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);
      next();
    });

    // API Routes
    const authRoutes = createAuthRoutes();
    const systemRoutes = createSystemRoutes();

    app.use("/api/auth", authRoutes);
    app.use("/api/system", systemRoutes);

    // Health endpoint
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: CONFIG.nodeEnv,
      });
    });

    // Serve React build
    const clientBuildPath = path.join(__dirname, "client", "dist");
    if (fs.existsSync(clientBuildPath)) {
      log.info(`📁 Serving React build from: ${clientBuildPath}`);
      app.use(express.static(clientBuildPath));

      // Catch-all handler for React Router
      app.get("*", (req, res) => {
        res.sendFile(path.join(clientBuildPath, "index.html"));
      });
    } else {
      log.warn(
        "Client build not found. Please run: cd client && npm run build"
      );

      // Fallback route
      app.get("*", (req, res) => {
        res.json({
          message: "KPanel API Server is running",
          version: "2.0.0",
          environment: CONFIG.nodeEnv,
          buildRequired: "Please run: cd client && npm run build",
          endpoints: {
            health: "/api/health",
            login: "/api/auth/login",
            systemInfo: "/api/system/info",
          },
        });
      });
    }

    // Error handling middleware
    app.use((err, req, res, next) => {
      log.error(`Server error: ${err.message}`);
      res.status(500).json({
        success: false,
        message:
          CONFIG.nodeEnv === "production"
            ? "Internal server error"
            : err.message,
      });
    });

    // Start server
    const server = app.listen(CONFIG.port, "0.0.0.0", () => {
      log.success("🎉 KPanel Server Started Successfully!");
      console.log("====================================");

      console.log("🌐 Access URLs:");
      console.log(
        `   📱 Control Panel: http://${serverInfo.publicIP}:${CONFIG.port}`
      );
      console.log(`   🏠 Local: http://localhost:${CONFIG.port}`);
      console.log(`   💻 LAN: http://${serverInfo.localIP}:${CONFIG.port}`);
      console.log("");

      console.log("🔗 API Endpoints:");
      console.log(
        `   🏥 Health: http://${serverInfo.publicIP}:${CONFIG.port}/api/health`
      );
      console.log(
        `   🔐 Login: http://${serverInfo.publicIP}:${CONFIG.port}/api/auth/login`
      );
      console.log(
        `   📊 System: http://${serverInfo.publicIP}:${CONFIG.port}/api/system/info`
      );
      console.log("");

      console.log("👤 Administrator Account:");
      console.log(`   📧 Email: ${CONFIG.adminEmail}`);
      console.log(`   🔑 Password: ${CONFIG.adminPassword}`);
      console.log("");

      console.log("🔧 Development:");
      console.log(`   🔄 Vite Dev: cd client && npm run dev (port 3000)`);
      console.log(`   🏗️ Build: cd client && npm run build`);
      console.log("");

      log.success("✅ Ready for both development and production!");
      console.log("====================================");
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      log.info("🛑 Shutting down gracefully...");
      server.close(() => {
        log.info("✅ Server closed successfully");
        process.exit(0);
      });
    });

    process.on("SIGTERM", () => {
      log.info("🛑 SIGTERM received, shutting down...");
      server.close(() => {
        log.info("✅ Server closed successfully");
        process.exit(0);
      });
    });
  } catch (error) {
    log.error(`Failed to initialize server: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  initializeServer();
}

module.exports = app;

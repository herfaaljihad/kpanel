/**
 * KPanel Docker HTTP-Only Server
 * Specifically configured for Docker deployments with HTTP-only access
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const compression = require("compression");
const sqlite3 = require("sqlite3").verbose();

const app = express();

// Configuration - Force HTTP
const CONFIG = {
  port: process.env.PORT || 2222,
  host: "0.0.0.0",
  forceHttp: true,
  disableHttps: true,
};

console.log("🐳 KPanel Docker HTTP-Only Server");
console.log("📊 Environment: production (Docker)");
console.log("🔌 Port:", CONFIG.port);
console.log("🔓 Protocol: HTTP ONLY");

// Get public IP
let PUBLIC_IP = "localhost";
let LOCAL_IP = "127.0.0.1";

try {
  const https = require("https");
  https
    .get("https://api.ipify.org", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        PUBLIC_IP = data.trim();
        console.log("✅ Detected public IP:", PUBLIC_IP);
      });
    })
    .on("error", (err) => {
      console.log("⚠️ Could not detect public IP, using localhost");
    });
} catch (error) {
  console.log("⚠️ IP detection failed, using localhost");
}

// Database setup
const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "database", "kpanel.db");
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Database connected");
});

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create admin user if not exists
  const adminPassword = process.env.ADMIN_PASSWORD || "kpanel123";
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
        ["admin", adminPassword]
      );
      console.log("👤 Admin user created");
    }
  });
});

// CORS Origins - HTTP ONLY
const corsOrigins = [
  `http://${PUBLIC_IP}`,
  `http://localhost`,
  `http://127.0.0.1`,
  `http://${PUBLIC_IP}:${CONFIG.port}`,
  `http://localhost:${CONFIG.port}`,
  `http://127.0.0.1:${CONFIG.port}`,
];

console.log("🔗 CORS Origins:", corsOrigins.slice(0, 3), "...");

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// NO Helmet security headers that might force HTTPS
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);

  // Force HTTP headers
  res.setHeader("Strict-Transport-Security", ""); // Remove HSTS
  res.setHeader("Content-Security-Policy", ""); // Remove CSP that might force HTTPS
  next();
});

// Serve static files from client/dist
const clientPath = path.join(__dirname, "client", "dist");
console.log("✅ Serving static files from:", clientPath);

// HTTP-fixing middleware for static assets
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Check if this is a CSS or JS file response
    if (req.path.endsWith(".css") || req.path.endsWith(".js")) {
      if (typeof data === "string") {
        // Replace HTTPS URLs with HTTP in CSS/JS content
        data = data.replace(/https:\/\//g, "http://");
      }
    }
    originalSend.call(this, data);
  };
  next();
});

// Force HTTP in all static responses
app.use(
  express.static(clientPath, {
    setHeaders: (res, path) => {
      // Remove any HTTPS-forcing headers
      res.removeHeader("Strict-Transport-Security");
      res.removeHeader("Content-Security-Policy");
    },
  })
);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "KPanel Docker HTTP",
    protocol: "http",
    port: CONFIG.port,
  });
});

app.get("/api/server/info", (req, res) => {
  res.json({
    name: "KPanel",
    version: "2.0.0",
    environment: "production",
    protocol: "http",
    host: PUBLIC_IP,
    port: CONFIG.port,
    uptime: process.uptime(),
  });
});

// Authentication endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const sessionId = Date.now().toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      db.run(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
        [sessionId, user.id, expiresAt.toISOString()],
        (err) => {
          if (err) {
            return res.status(500).json({ error: "Session creation failed" });
          }

          res.json({
            success: true,
            user: { id: user.id, username: user.username, role: user.role },
            sessionId: sessionId,
          });
        }
      );
    }
  );
});

app.get("/api/dashboard/stats", (req, res) => {
  res.json({
    server: {
      status: "running",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      protocol: "http",
    },
    users: { total: 1 },
    system: {
      platform: process.platform,
      node: process.version,
    },
  });
});

// Catch all route - serve index.html for client-side routing with HTTP fix
app.get("*", (req, res) => {
  const indexPath = path.join(clientPath, "index.html");
  if (fs.existsSync(indexPath)) {
    console.log("📎 Serving HTTP-fixed static:", indexPath);

    // Read the HTML file and replace HTTPS with HTTP
    fs.readFile(indexPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading index.html:", err);
        return res.status(500).send("Error serving page");
      }

      // Replace all HTTPS URLs with HTTP
      let fixedHtml = data
        .replace(/https:\/\//g, "http://") // Replace https:// with http://
        .replace(
          /src="\/([^"]+)"/g,
          `src="http://${PUBLIC_IP}:${CONFIG.port}/$1"`
        ) // Fix relative URLs
        .replace(
          /href="\/([^"]+)"/g,
          `href="http://${PUBLIC_IP}:${CONFIG.port}/$1"`
        ) // Fix relative href
        .replace(
          /url\(\/([^)]+)\)/g,
          `url(http://${PUBLIC_IP}:${CONFIG.port}/$1)`
        ); // Fix CSS URLs

      // Set proper headers for HTTP
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-cache");
      res.removeHeader("Strict-Transport-Security");
      res.removeHeader("Content-Security-Policy");

      res.send(fixedHtml);
    });
  } else {
    res
      .status(404)
      .send(
        "<h1>KPanel</h1><p>Client files not found. Please ensure the application is built.</p>"
      );
  }
});

// Start server - HTTP ONLY
const server = app.listen(CONFIG.port, CONFIG.host, () => {
  console.log("\n🎉 KPanel Docker Server Started Successfully!");
  console.log("\n📊 Server Information:");
  console.log(`   🌐 Public URL: http://${PUBLIC_IP}:${CONFIG.port}`);
  console.log(`   🏠 Local URL: http://localhost:${CONFIG.port}`);
  console.log(`   📡 API Base: http://${PUBLIC_IP}:${CONFIG.port}/api`);
  console.log(`   🗄️  Database: SQLite (Connected)`);
  console.log(`   ⚙️  Environment: production (Docker)`);
  console.log("\n🔗 Quick Links:");
  console.log(
    `   💚 Health Check: http://${PUBLIC_IP}:${CONFIG.port}/api/health`
  );
  console.log(
    `   📊 Server Info: http://${PUBLIC_IP}:${CONFIG.port}/api/server/info`
  );
  console.log("\n✅ Ready for production use!");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🔄 Received SIGINT, shutting down gracefully");
  server.close(() => {
    db.close();
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🔄 Received SIGTERM, shutting down gracefully");
  server.close(() => {
    db.close();
    console.log("✅ Server closed");
    process.exit(0);
  });
});

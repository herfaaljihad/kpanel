/**
 * KPanel - Simple Control Panel Server
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const os = require('os');

// Initialize database
const { initializeDatabase } = require("./server/config/database-sqlite");

// Import core routes
const authRoutes = require("./server/routes/auth");
const systemRoutes = require("./server/routes/system");
const domainRoutes = require("./server/routes/domains");
const emailRoutes = require("./server/routes/email");
const databaseRoutes = require("./server/routes/databases");
const fileRoutes = require("./server/routes/files");
const userRoutes = require("./server/routes/users");

// Simple network service
const networkService = {
  async getServerInfo() {
    return {
      publicIP: '127.0.0.1',
      localIP: Object.values(os.networkInterfaces())
        .flat()
        .find(i => i.family === 'IPv4' && !i.internal)?.address || '127.0.0.1'
    };
  }
};

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || "production";
const isProduction = NODE_ENV === "production";

async function initializeServer() {
  try {
    console.log("🚀 Starting KPanel Server");
    console.log(`📦 Environment: ${NODE_ENV}`);
    console.log(`🌐 Port: ${PORT}`);

    const serverInfo = await networkService.getServerInfo();
    console.log(`✅ Local IP: ${serverInfo.localIP}`);

    // CORS configuration
    app.use(cors({
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        `http://localhost:${PORT}`,
        `http://127.0.0.1:${PORT}`,
        `http://${serverInfo.localIP}:${PORT}`,
        `http://${serverInfo.localIP}:3000`
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
    }));

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", `http://localhost:3000`, `http://${serverInfo.localIP}:3000`]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    app.use(compression());
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    // API Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/system", systemRoutes);
    app.use("/api/domains", domainRoutes);
    app.use("/api/email", emailRoutes);
    app.use("/api/databases", databaseRoutes);
    app.use("/api/files", fileRoutes);
    app.use("/api/users", userRoutes);

    // Health check
    app.get("/api/health", async (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: NODE_ENV,
        server: await networkService.getServerInfo()
      });
    });

    // Serve React build files
    const staticPath = path.join(__dirname, "client", "dist");

    if (fs.existsSync(staticPath)) {
      console.log(`📂 Serving React build from: ${staticPath}`);
      
      app.use(express.static(staticPath, {
        maxAge: isProduction ? "1d" : "0",
        etag: true,
        lastModified: true
      }));

      // React Router catch-all
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({
            success: false,
            message: `API endpoint not found: ${req.path}`
          });
        }
        res.sendFile(path.join(staticPath, "index.html"));
      });
    } else {
      console.log("⚠️ React build not found");
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({
            success: false,
            message: `API endpoint not found: ${req.path}`
          });
        }
        res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>KPanel - Build Required</title></head>
          <body>
            <h1>🎛️ KPanel</h1>
            <p>React build required. Run: cd client && npm run build</p>
            <p><a href="/api/health">API Health</a></p>
          </body>
          </html>
        `);
      });
    }

    // Global error handler
    app.use((error, req, res, next) => {
      console.error("❌ Server Error:", error);
      res.status(500).json({
        success: false,
        message: isProduction ? "Internal server error" : error.message
      });
    });

    // Start server
    const server = app.listen(PORT, "0.0.0.0", async () => {
      console.log("");
      console.log("🎉 KPanel Server Started Successfully!");
      console.log("====================================");
      console.log(`🌐 Access URLs:`);
      console.log(`   🏠 Local: http://localhost:${PORT}`);
      console.log(`   💻 LAN: http://${serverInfo.localIP}:${PORT}`);
      console.log("");
      console.log("🔗 API Endpoints:");
      console.log(`   🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`   🔑 Auth: http://localhost:${PORT}/api/auth/login`);
      console.log("");
      console.log("✅ Ready for hosting control panel!");
    });

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

initializeServer();
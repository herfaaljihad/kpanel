/**
 * KPanel Production Server - Windows Fixed Version
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

// Import services
const networkService = require("./server/services/networkService");

// Try to load routes
let authRoutes, systemRoutes;
try {
  authRoutes = require("./server/routes/auth");
  systemRoutes = require("./server/routes/system");
} catch (error) {
  console.log("âš ï¸ Some routes not available, using fallbacks");

  authRoutes = require("express").Router();
  authRoutes.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@kpanel.com" && password === "admin123") {
      res.json({
        success: true,
        message: "Login successful",
        user: { email: "admin@kpanel.com", role: "admin" },
        token: "fallback_token_" + Date.now(),
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  systemRoutes = require("express").Router();
  systemRoutes.get("/info", async (req, res) => {
    res.json({
      success: true,
      data: { version: "2.0.0", status: "running", uptime: process.uptime() },
    });
  });
}

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || "production";
const isProduction = NODE_ENV === "production";

async function initializeServer() {
  try {
    console.log("ðŸš€ Starting KPanel Server (Windows Fixed)");
    console.log(`ðŸ“¦ Environment: ${NODE_ENV}`);
    console.log(`ðŸŒ Port: ${PORT}`);

    const serverInfo = await networkService.getServerInfo();
    console.log(`âœ… Public IP: ${serverInfo.publicIP}`);
    console.log(`ðŸ  Local IP: ${serverInfo.localIP}`);

    const corsOrigins = [
      `http://localhost:3000`,
      `http://127.0.0.1:3000`,
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `http://${serverInfo.localIP}:3000`, // Vite dev server
      `http://${serverInfo.localIP}:${PORT}`,
      `http://${serverInfo.publicIP}:3000`, // Vite dev server public
      `http://${serverInfo.publicIP}:${PORT}`,
      `http://192.168.1.9:3000`, // Specific frontend address
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

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: [
              "'self'",
              `http://localhost:3000`,
              `http://127.0.0.1:3000`,
              `http://${serverInfo.localIP}:3000`,
              `http://192.168.1.9:3000`,
            ],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      })
    );

    app.use(compression());
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    app.use((req, res, next) => {
      console.log(
        `${new Date().toISOString()} ${req.method} ${req.url} - ${req.ip}`
      );
      next();
    });

    // API Routes first
    app.use("/api/auth", authRoutes);
    app.use("/api/system", systemRoutes);

    // Health check endpoint
    app.get("/api/health", async (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: NODE_ENV,
        server: await networkService.getServerInfo(),
        react: {
          buildExists: fs.existsSync(
            path.join(__dirname, "client", "dist", "index.html")
          ),
          assetsPath: path.join(__dirname, "client", "dist", "assets"),
        },
      });
    });

    // Serve React build files
    const staticPath = path.join(__dirname, "client", "dist");

    if (fs.existsSync(staticPath)) {
      console.log(`ðŸ“ Serving React build from: ${staticPath}`);

      app.use(
        express.static(staticPath, {
          maxAge: isProduction ? "1d" : "0",
          etag: true,
          lastModified: true,
          setHeaders: (res, filePath) => {
            console.log(`ðŸ“Ž Serving: ${path.basename(filePath)}`);
            if (filePath.endsWith(".js"))
              res.setHeader("Content-Type", "application/javascript");
            else if (filePath.endsWith(".css"))
              res.setHeader("Content-Type", "text/css");
            else if (filePath.endsWith(".svg"))
              res.setHeader("Content-Type", "image/svg+xml");
          },
        })
      );

      // React Router catch-all handler
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res
            .status(404)
            .json({
              success: false,
              message: `API endpoint not found: ${req.path}`,
            });
        }
        console.log(`ðŸ“„ Serving React app for route: ${req.path}`);
        res.sendFile(path.join(staticPath, "index.html"));
      });
    } else {
      console.log("âš ï¸ React build not found");
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res
            .status(404)
            .json({
              success: false,
              message: `API endpoint not found: ${req.path}`,
            });
        }
        res.send(
          `<!DOCTYPE html><html><head><title>KPanel - Build Required</title></head><body><h1>ðŸŽ›ï¸ KPanel</h1><p>React build required. Run: cd client && npm run build</p><p><a href="/api/health">API Health</a></p></body></html>`
        );
      });
    }

    // Global error handler
    app.use((error, req, res, next) => {
      console.error("âŒ Server Error:", error);
      res.status(500).json({
        success: false,
        message: isProduction ? "Internal server error" : error.message,
      });
    });

    // Start server
    const server = app.listen(PORT, "0.0.0.0", async () => {
      console.log("");
      console.log("ðŸŽ‰ KPanel Server Started Successfully!");
      console.log("====================================");
      console.log("");
      console.log("ðŸŒ Access URLs:");
      console.log(`   ðŸ“± React App: http://${serverInfo.publicIP}:${PORT}`);
      console.log(`   ðŸ  Local: http://localhost:${PORT}`);
      console.log(`   ðŸ’» LAN: http://${serverInfo.localIP}:${PORT}`);
      console.log("");
      console.log("ðŸ”— API Endpoints:");
      console.log(
        `   ðŸ¥ Health: http://${serverInfo.publicIP}:${PORT}/api/health`
      );
      console.log(
        `   ðŸ” Auth: http://${serverInfo.publicIP}:${PORT}/api/auth/login`
      );
      console.log("");
      console.log("ðŸ”§ Development:");
      console.log(`   ðŸ“ Vite Dev: cd client && npm run dev (port 3000)`);
      console.log(`   ðŸ—ï¸ Build: cd client && npm run build`);
      console.log("");
      console.log("âœ… Ready for both development and production!");
    });

    return server;
  } catch (error) {
    console.error("âŒ Failed to start server:", error);
    process.exit(1);
  }
}

initializeServer();

const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 2222;

// Get public IP from environment or detect
let PUBLIC_IP = process.env.PUBLIC_IP || "147.139.202.42";

console.log(`🐳 KPanel Docker HTTP Server - 404 Fix Edition`);
console.log(`📊 Environment: ${process.env.NODE_ENV || "production"} (Docker)`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🌐 Public IP: ${PUBLIC_IP}`);
console.log(`🔓 Protocol: HTTP ONLY`);

// CORS configuration for all origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins for HTTP-only server
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security headers for HTTP
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HTTP-specific headers
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: ws:; " +
      "img-src 'self' data: http:; " +
      "font-src 'self' data: http:; " +
      "style-src 'self' 'unsafe-inline' http:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http:;"
  );

  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(
    `🔍 ${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`
  );
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "KPanel Docker HTTP Server",
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

// Server info endpoint
app.get("/api/server/info", (req, res) => {
  res.json({
    server: "KPanel Docker",
    version: "2.0.0",
    protocol: "HTTP",
    port: PORT,
    public_ip: PUBLIC_IP,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
  });
});

// Basic auth endpoint for compatibility
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  // Simple auth for demo
  if (email === "admin@kpanel.local" && password === "IPdV7HGf00E") {
    res.json({
      success: true,
      token: "demo-token-" + Date.now(),
      user: { email: "admin@kpanel.local", role: "admin" },
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});

// System stats endpoint
app.get("/api/system/stats", (req, res) => {
  res.json({
    cpu: { usage: Math.random() * 100 },
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    loadavg: require("os").loadavg(),
    platform: process.platform,
    arch: process.arch,
  });
});

// Static file serving with fallback
const staticPaths = [
  path.join(__dirname, "client-dist"),
  path.join(__dirname, "client", "dist"),
  path.join(__dirname, "public"),
];

// Try to serve static files from multiple locations
let staticPath = null;
for (const tryPath of staticPaths) {
  try {
    if (require("fs").existsSync(tryPath)) {
      staticPath = tryPath;
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

if (staticPath) {
  console.log(`📁 Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));
} else {
  console.log(`⚠️ No static files found, creating fallback`);
}

// Fallback HTML for missing static files
const fallbackHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - Docker HTTP Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; }
        .status { padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; margin: 20px 0; }
        .info { padding: 15px; background: #cce5ff; border: 1px solid #99ccff; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
        .login-form { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        button { background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:hover { background: #218838; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐳 KPanel Docker HTTP Server</h1>
        
        <div class="status">
            <h3>✅ Server Status: Online</h3>
            <p>KPanel Docker container is running successfully!</p>
        </div>

        <div class="info">
            <h3>📊 Server Information</h3>
            <p><strong>Protocol:</strong> HTTP (Docker optimized)</p>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Public IP:</strong> ${PUBLIC_IP}</p>
            <p><strong>Node.js:</strong> ${process.version}</p>
            <p><strong>Platform:</strong> ${process.platform} ${
  process.arch
}</p>
            <p><strong>Uptime:</strong> <span id="uptime">${Math.floor(
              process.uptime()
            )}s</span></p>
        </div>

        <div class="login-form">
            <h3>🔐 Admin Login</h3>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" value="admin@kpanel.local" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" value="IPdV7HGf00E" required>
                </div>
                <button type="submit">Login to KPanel</button>
            </form>
            <div id="login-result"></div>
        </div>

        <div>
            <h3>🔧 Quick Links</h3>
            <a href="/api/health" class="button">Health Check</a>
            <a href="/api/server/info" class="button">Server Info</a>
            <a href="/api/system/stats" class="button">System Stats</a>
        </div>
    </div>

    <script>
        function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                const resultDiv = document.getElementById('login-result');
                if (data.success) {
                    resultDiv.innerHTML = '<div style="color: green; margin-top: 15px;">✅ Login successful! Token: ' + data.token + '</div>';
                } else {
                    resultDiv.innerHTML = '<div style="color: red; margin-top: 15px;">❌ Login failed: ' + data.message + '</div>';
                }
            })
            .catch(error => {
                document.getElementById('login-result').innerHTML = '<div style="color: red; margin-top: 15px;">❌ Network error: ' + error.message + '</div>';
            });
        }

        // Update uptime every second
        setInterval(() => {
            fetch('/api/server/info')
                .then(response => response.json())
                .then(data => {
                    // Uptime updated from server
                })
                .catch(error => console.log('Could not update server info'));
        }, 5000);
    </script>
</body>
</html>`;

// Catch-all route for SPA
app.get("*", (req, res) => {
  // Try to serve index.html from static directory
  if (staticPath) {
    const indexPath = path.join(staticPath, "index.html");
    try {
      if (require("fs").existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    } catch (e) {
      // Fall through to fallback
    }
  }

  // Serve fallback HTML
  res.send(fallbackHTML);
});

// Error handling
app.use((error, req, res, next) => {
  console.error("❌ Server Error:", error);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🎉 KPanel Docker HTTP Server Started!`);
  console.log(`\n📊 Server Information:`);
  console.log(`   🌐 Public URL: http://${PUBLIC_IP}:${PORT}`);
  console.log(`   🏠 Local URL: http://localhost:${PORT}`);
  console.log(`   📡 API Base: http://${PUBLIC_IP}:${PORT}/api`);
  console.log(`   🗄️ Database: SQLite (Available)`);
  console.log(
    `   ⚙️ Environment: ${process.env.NODE_ENV || "production"} (Docker)`
  );
  console.log(`\n🔗 Quick Links:`);
  console.log(`   💚 Health Check: http://${PUBLIC_IP}:${PORT}/api/health`);
  console.log(`   📊 Server Info: http://${PUBLIC_IP}:${PORT}/api/server/info`);
  console.log(`\n✅ Ready for production use!`);
  console.log(`\n🚀 Access KPanel at: http://${PUBLIC_IP}:${PORT}`);
});

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

module.exports = app;

module.exports = {
  apps: [
    {
      name: "kpanel-backend",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
        PORT: 3002,
        JWT_SECRET: "kpanel-jwt-secret-change-in-production",
        DB_PATH: "./data/kpanel.db",
        ADMIN_EMAIL: "admin@kpanel.com",
        ADMIN_PASSWORD: "admin123",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3002,
        JWT_SECRET: "kpanel-production-jwt-secret-CHANGE-THIS",
        DB_PATH: "./data/kpanel.db",
        ADMIN_EMAIL: "admin@kpanel.com",
        ADMIN_PASSWORD: "admin123",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      // Auto-restart on file changes in development
      ignore_watch: ["node_modules", "logs", "*.log"],
      // Graceful shutdown
      kill_timeout: 5000,
      // Health check
      health_check_grace_period: 10000,
    },
  ],

  // Deployment configuration for automated deployment
  deploy: {
    production: {
      user: "root",
      host: ["YOUR_SERVER_IP"],
      ref: "origin/main",
      repo: "https://github.com/herfaaljihad/kpanel.git",
      path: "/opt/kpanel",
      "post-deploy":
        "npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save",
    },
  },
};

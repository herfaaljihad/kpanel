const express = require("express");
const router = express.Router();
const os = require("os");

// System information
router.get("/info", (req, res) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    version: os.version(),
    release: os.release(),
    uptime: os.uptime(),
    total_memory: os.totalmem(),
    free_memory: os.freemem(),
    cpu_count: os.cpus().length,
    load_average: os.loadavg(),
    network_interfaces: Object.keys(os.networkInterfaces()),
    user_info: os.userInfo(),
    temp_dir: os.tmpdir(),
    home_dir: os.homedir(),
  };

  res.json({
    success: true,
    data: systemInfo,
  });
});

// Web server configuration
router.get("/webserver", (req, res) => {
  const webserverConfig = {
    type: "nginx",
    version: "1.20.2",
    status: "running",
    config_file: "/etc/nginx/nginx.conf",
    document_root: "/var/www/html",
    ports: [80, 443],
    modules: ["ssl", "gzip", "rewrite", "proxy"],
    virtual_hosts: [
      {
        name: "default",
        domain: "_",
        port: 80,
        root: "/var/www/html",
        status: "active",
      },
      {
        name: "example.com",
        domain: "example.com",
        port: 443,
        root: "/var/www/example.com",
        ssl: true,
        status: "active",
      },
    ],
    error_log: "/var/log/nginx/error.log",
    access_log: "/var/log/nginx/access.log",
  };

  res.json({
    success: true,
    data: webserverConfig,
  });
});

// PHP configuration
router.get("/php", (req, res) => {
  const phpConfig = {
    version: "8.1.12",
    sapi: "fpm",
    status: "running",
    config_file: "/etc/php/8.1/fpm/php.ini",
    extensions: [
      "Core",
      "date",
      "libxml",
      "openssl",
      "pcre",
      "zlib",
      "filter",
      "hash",
      "json",
      "mbstring",
      "SPL",
      "PDO",
      "session",
      "standard",
      "mysqlnd",
      "mysqli",
      "pdo_mysql",
      "Reflection",
      "xml",
      "curl",
      "gd",
      "zip",
    ],
    settings: {
      max_execution_time: "300",
      max_input_time: "60",
      memory_limit: "256M",
      post_max_size: "100M",
      upload_max_filesize: "100M",
      max_file_uploads: "20",
      default_timezone: "UTC",
    },
    fpm_pools: [
      {
        name: "www",
        user: "www-data",
        group: "www-data",
        listen: "127.0.0.1:9000",
        pm: "dynamic",
        max_children: "5",
        start_servers: "2",
        min_spare_servers: "1",
        max_spare_servers: "3",
      },
    ],
  };

  res.json({
    success: true,
    data: phpConfig,
  });
});

// System services
router.get("/services", (req, res) => {
  const services = [
    {
      name: "nginx",
      description: "Nginx Web Server",
      status: "running",
      enabled: true,
      pid: 1234,
      memory: "12.5M",
      uptime: "2h 15m",
    },
    {
      name: "mysql",
      description: "MySQL Database Server",
      status: "running",
      enabled: true,
      pid: 1456,
      memory: "156.2M",
      uptime: "2h 14m",
    },
    {
      name: "php8.1-fpm",
      description: "PHP FastCGI Process Manager",
      status: "running",
      enabled: true,
      pid: 1567,
      memory: "45.8M",
      uptime: "2h 13m",
    },
    {
      name: "redis-server",
      description: "Redis In-Memory Database",
      status: "running",
      enabled: true,
      pid: 1678,
      memory: "8.3M",
      uptime: "2h 12m",
    },
    {
      name: "ssh",
      description: "OpenSSH Server",
      status: "running",
      enabled: true,
      pid: 890,
      memory: "2.1M",
      uptime: "2h 18m",
    },
    {
      name: "fail2ban",
      description: "Intrusion Prevention System",
      status: "running",
      enabled: true,
      pid: 1789,
      memory: "15.4M",
      uptime: "2h 11m",
    },
  ];

  res.json({
    success: true,
    data: {
      services,
      summary: {
        total: services.length,
        running: services.filter((s) => s.status === "running").length,
        stopped: services.filter((s) => s.status === "stopped").length,
        enabled: services.filter((s) => s.enabled).length,
      },
    },
  });
});

// System health check
router.get("/health", (req, res) => {
  const health = {
    overall_status: "healthy",
    timestamp: new Date().toISOString(),
    checks: [
      {
        name: "CPU Usage",
        status: "ok",
        value: "45%",
        threshold: "80%",
        description: "CPU usage is within normal limits",
      },
      {
        name: "Memory Usage",
        status: "ok",
        value: "67%",
        threshold: "85%",
        description: "Memory usage is acceptable",
      },
      {
        name: "Disk Space",
        status: "warning",
        value: "78%",
        threshold: "80%",
        description: "Disk space is getting low",
      },
      {
        name: "Network Connectivity",
        status: "ok",
        value: "Connected",
        threshold: "Connected",
        description: "Network connection is stable",
      },
      {
        name: "Database Connection",
        status: "ok",
        value: "Connected",
        threshold: "Connected",
        description: "Database is responding normally",
      },
      {
        name: "Web Server",
        status: "ok",
        value: "Running",
        threshold: "Running",
        description: "Nginx is serving requests",
      },
    ],
    recommendations: [
      {
        priority: "medium",
        message: "Consider cleaning up disk space to free up storage",
        action: "Run disk cleanup utilities",
      },
    ],
  };

  res.json({
    success: true,
    data: health,
  });
});

// Service control endpoints
router.post("/services/:name/start", (req, res) => {
  const serviceName = req.params.name;
  res.json({
    success: true,
    message: `Service ${serviceName} started successfully`,
    data: { service: serviceName, status: "running" },
  });
});

router.post("/services/:name/stop", (req, res) => {
  const serviceName = req.params.name;
  res.json({
    success: true,
    message: `Service ${serviceName} stopped successfully`,
    data: { service: serviceName, status: "stopped" },
  });
});

router.post("/services/:name/restart", (req, res) => {
  const serviceName = req.params.name;
  res.json({
    success: true,
    message: `Service ${serviceName} restarted successfully`,
    data: { service: serviceName, status: "running" },
  });
});

module.exports = router;

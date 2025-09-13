import {
  Backup as BackupIcon,
  CheckCircle as CheckCircleIcon,
  Speed as CpuIcon,
  Storage as DatabaseIcon,
  Domain as DomainIcon,
  Email as EmailIcon,
  Folder as FolderIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  HttpsRounded as SSLIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import api from "../../utils/api";
import SystemUpdateBanner from "./SystemUpdateBanner";

const Overview = ({ onTabChange }) => {
  const [stats, setStats] = useState({
    domains: 0,
    databases: 0,
    files: 0,
    storage_used: "0 MB",
    storage_limit: "1 GB",
    bandwidth_used: "0 MB",
    bandwidth_limit: "10 GB",
  });

  const [systemMetrics, setSystemMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [liveStats, setLiveStats] = useState({
    cpu: [],
    memory: [],
    network: [],
    visitors: [],
    requests: [],
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Real-time data update function
  const updateLiveData = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();
    const newDataPoint = {
      time: timestamp,
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      network: Math.random() * 1000,
      visitors: Math.floor(Math.random() * 50) + 10,
      requests: Math.floor(Math.random() * 200) + 50,
    };

    setLiveStats((prev) => ({
      cpu: [...prev.cpu.slice(-19), newDataPoint],
      memory: [...prev.memory.slice(-19), newDataPoint],
      network: [...prev.network.slice(-19), newDataPoint],
      visitors: [...prev.visitors.slice(-19), newDataPoint],
      requests: [...prev.requests.slice(-19), newDataPoint],
    }));
  }, []);
  const [systemInfo, setSystemInfo] = useState({
    server_name: "KPanel Server",
    uptime: "5 days, 12 hours",
    cpu_usage: 45,
    memory_usage: 62,
    disk_usage: 78,
    load_average: "1.2, 1.4, 1.1",
    os: "Ubuntu 22.04 LTS",
    kernel: "5.15.0",
    php_version: "8.2.5",
    mysql_version: "8.0.32",
  });
  const [serviceStatus, setServiceStatus] = useState([
    { name: "Apache", status: "running", port: "80,443" },
    { name: "MySQL", status: "running", port: "3306" },
    { name: "FTP", status: "running", port: "21" },
    { name: "SSH", status: "running", port: "22" },
    { name: "DNS", status: "running", port: "53" },
    { name: "Mail", status: "running", port: "25,110,143" },
  ]);

  // Initialize recentActivity with default data
  useEffect(() => {
    setRecentActivity([
      {
        action: "Domain added",
        detail: "example.com",
        time: "2 minutes ago",
        type: "success",
      },
      {
        action: "Database created",
        detail: "myapp_db",
        time: "15 minutes ago",
        type: "info",
      },
      {
        action: "File uploaded",
        detail: "backup.zip (12.5 MB)",
        time: "1 hour ago",
        type: "info",
      },
      {
        action: "SSL installed",
        detail: "secure.example.com",
        time: "3 hours ago",
        type: "success",
      },
      {
        action: "User login",
        detail: "admin@kpanel.local",
        time: "5 hours ago",
        type: "info",
      },
    ]);
  }, []);

  const [accountInfo, setAccountInfo] = useState({
    package_name: "Professional",
    creation_date: "2024-01-15",
    last_login: "2024-09-09 10:30:00",
    ip_address: "192.168.1.100",
    account_type: "Administrator",
  });

  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    const fetchStats = async () => {
      try {
        const response = await api.get("/users/stats");
        console.log("Stats response:", response.data);
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSystemInfo = async () => {
      try {
        const response = await api.get("/system/info");
        setSystemInfo((prev) => ({ ...prev, ...response.data }));
      } catch (error) {
        console.error("Failed to fetch system info:", error);
      }
    };

    fetchStats();
    fetchSystemInfo();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchSystemInfo();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Real-time monitoring effect
  useEffect(() => {
    if (!autoRefresh) return;

    updateLiveData(); // Initial data
    const interval = setInterval(updateLiveData, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, updateLiveData]);

  // Clean white card design
  const StatCard = ({
    title,
    value,
    icon,
    color = "primary",
    subtitle,
    trend,
    onClick,
  }) => (
    <Card
      sx={{
        height: "100%",
        bgcolor: "white",
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        transition: "all 0.3s ease",
        cursor: onClick ? "pointer" : "default",
        "&:hover": {
          transform: onClick ? "translateY(-4px)" : "none",
          borderColor: `${color}.light`,
          boxShadow: onClick ? 4 : 1,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Avatar
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
          {trend && (
            <Chip
              icon={<TrendingUpIcon fontSize="small" />}
              label={trend}
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          )}
        </Box>
        <Typography
          variant="h4"
          fontWeight="bold"
          color={`${color}.main`}
          gutterBottom
        >
          {loading ? "..." : value}
        </Typography>
        <Typography color="text.primary" variant="body1" fontWeight="medium">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // Clean action cards for most commonly used features
  const QuickActionCard = ({
    title,
    description,
    icon,
    color,
    onClick,
    badge,
  }) => (
    <Card
      sx={{
        height: "100%",
        bgcolor: "white",
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: `${color}.main`,
          boxShadow: 4,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          mb={2}
        >
          <Badge
            badgeContent={badge}
            color="error"
            variant="dot"
            invisible={!badge}
          >
            <Avatar
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.main`,
                width: 56,
                height: 56,
              }}
            >
              {icon}
            </Avatar>
          </Badge>
        </Box>
        <Typography
          variant="h6"
          fontWeight="bold"
          gutterBottom
          color="text.primary"
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          color={color}
          startIcon={<LaunchIcon />}
          sx={{
            textTransform: "none",
            fontWeight: "medium",
          }}
        >
          Get Started
        </Button>
      </CardContent>
    </Card>
  );

  // Clean resource usage cards
  const ResourceUsageCard = ({ title, value, max, unit, color, icon }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <Card
        sx={{
          height: "100%",
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.main`,
                mr: 2,
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {value} {unit} of {max} {unit}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Box sx={{ width: "100%", mr: 1 }}>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 2,
                    backgroundColor:
                      percentage > 80
                        ? "error.main"
                        : percentage > 60
                        ? "warning.main"
                        : `${color}.main`,
                  },
                }}
              />
            </Box>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={
                percentage > 80
                  ? "error.main"
                  : percentage > 60
                  ? "warning.main"
                  : `${color}.main`
              }
            >
              {percentage.toFixed(0)}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const ServiceStatusCard = ({ services }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Service Status
        </Typography>
        <List dense>
          {services.map((service, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon>
                <CheckCircleIcon
                  color={service.status === "running" ? "success" : "error"}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body1">{service.name}</Typography>
                    <Chip
                      label={service.status}
                      size="small"
                      color={service.status === "running" ? "success" : "error"}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={`Port: ${service.port}`}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  const ActivityCard = ({ activities }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List dense>
          {activities.map((activity, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor:
                      activity.type === "success"
                        ? "success.main"
                        : activity.type === "warning"
                        ? "warning.main"
                        : "info.main",
                  }}
                >
                  {activity.type === "success" ? (
                    <CheckCircleIcon fontSize="small" />
                  ) : activity.type === "warning" ? (
                    <WarningIcon fontSize="small" />
                  ) : (
                    <InfoIcon fontSize="small" />
                  )}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={activity.action}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      {activity.detail}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ ml: 1 }}
                    >
                      {activity.time}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Helper function to convert storage strings to numbers for percentage calculation
  const parseStorageValue = (storageStr) => {
    if (!storageStr || typeof storageStr !== "string") return 0;
    const match = storageStr.match(/([0-9.]+)\s*(MB|GB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return unit === "GB" ? value * 1024 : value; // Convert to MB
  };

  const usedMB = parseStorageValue(stats.storage_used);
  const totalMB = parseStorageValue(stats.storage_limit);
  const storagePercent = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

  const bandwidthUsedMB = parseStorageValue(stats.bandwidth_used);
  const bandwidthTotalMB = parseStorageValue(stats.bandwidth_limit);

  return (
    <Box sx={{ p: 3, bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      {/* Clean Welcome Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          bgcolor: "white",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
              color="text.primary"
              gutterBottom
            >
              Welcome back, {user?.email?.split("@")[0]}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's an overview of your hosting account
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              Server Status
            </Typography>
            <Chip
              label="Online"
              color="success"
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>

        <SystemUpdateBanner onTabChange={onTabChange} />

        <Alert
          severity="info"
          sx={{
            mt: 2,
            bgcolor: "primary.light",
            "& .MuiAlert-icon": { color: "primary.main" },
          }}
        >
          <Typography variant="body2">
            Your account is on the{" "}
            <strong>{accountInfo.package_name} Plan</strong>. Server uptime:{" "}
            <strong>{systemInfo.uptime}</strong>
          </Typography>
        </Alert>
      </Paper>

      {/* Account Overview Statistics */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="text.primary"
        sx={{ mb: 3 }}
      >
        Account Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Domains"
            value={stats.domains}
            subtitle="Ready to use"
            icon={<DomainIcon />}
            color="primary"
            trend="+2 this month"
            onClick={() => onTabChange && onTabChange("domains")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Databases"
            value={stats.databases}
            subtitle="MySQL & MariaDB"
            icon={<DatabaseIcon />}
            color="secondary"
            trend="+1 this week"
            onClick={() => onTabChange && onTabChange("databases")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Files Uploaded"
            value={stats.files}
            subtitle="Total files"
            icon={<FolderIcon />}
            color="success"
            trend="+15 today"
            onClick={() => onTabChange && onTabChange("websites")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Email Accounts"
            value="12"
            subtitle="Professional emails"
            icon={<EmailIcon />}
            color="info"
            trend="+3 this month"
            onClick={() => onTabChange && onTabChange("email-advanced")}
          />
        </Grid>
      </Grid>

      {/* Real-time System Monitoring */}
      <Box sx={{ mb: 4 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Real-time Monitoring
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Live"
            />
            <Chip
              label={autoRefresh ? "LIVE" : "PAUSED"}
              color={autoRefresh ? "success" : "default"}
              size="small"
              sx={{
                animation: autoRefresh ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.7 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* CPU Usage Real-time */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CpuIcon sx={{ mr: 1, color: "error.main" }} />
                  <Typography variant="h6">CPU Usage</Typography>
                  <Box ml="auto">
                    <Chip
                      label={`${
                        liveStats.cpu[liveStats.cpu.length - 1]?.cpu?.toFixed(
                          1
                        ) || 0
                      }%`}
                      color="error"
                      size="small"
                    />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={liveStats.cpu}>
                    <defs>
                      <linearGradient
                        id="cpuGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f44336"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f44336"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(1)}%`, "CPU"]}
                      labelStyle={{ color: "#666" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      stroke="#f44336"
                      strokeWidth={2}
                      fill="url(#cpuGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Memory Usage Real-time */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <MemoryIcon sx={{ mr: 1, color: "info.main" }} />
                  <Typography variant="h6">Memory Usage</Typography>
                  <Box ml="auto">
                    <Chip
                      label={`${
                        liveStats.memory[
                          liveStats.memory.length - 1
                        ]?.memory?.toFixed(1) || 0
                      }%`}
                      color="info"
                      size="small"
                    />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={liveStats.memory}>
                    <defs>
                      <linearGradient
                        id="memoryGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2196f3"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2196f3"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(1)}%`, "Memory"]}
                      labelStyle={{ color: "#666" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      stroke="#2196f3"
                      strokeWidth={2}
                      fill="url(#memoryGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Live Website Traffic */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon sx={{ mr: 1, color: "success.main" }} />
                  <Typography variant="h6">Live Visitors</Typography>
                  <Box ml="auto">
                    <Chip
                      label={`${
                        liveStats.visitors[liveStats.visitors.length - 1]
                          ?.visitors || 0
                      }`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={liveStats.visitors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Visitors"]}
                      labelStyle={{ color: "#666" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#4caf50"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Request Rate */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <NetworkIcon sx={{ mr: 1, color: "warning.main" }} />
                  <Typography variant="h6">Requests/min</Typography>
                  <Box ml="auto">
                    <Chip
                      label={`${
                        liveStats.requests[liveStats.requests.length - 1]
                          ?.requests || 0
                      }`}
                      color="warning"
                      size="small"
                    />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={150}>
                  <ComposedChart data={liveStats.requests}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Requests"]}
                      labelStyle={{ color: "#666" }}
                    />
                    <Bar dataKey="requests" fill="#ff9800" opacity={0.7} />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="#ff9800"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Most Commonly Used Features */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="text.primary"
        sx={{ mb: 3 }}
      >
        Most Used Features
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="Domain Management"
            description="Add, configure, and manage your domains with SSL support"
            icon={<DomainIcon />}
            color="primary"
            onClick={() => onTabChange && onTabChange("domains")}
            badge={stats.domains > 0 ? stats.domains : null}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="File Manager"
            description="Upload, edit, and organize your website files easily"
            icon={<FolderIcon />}
            color="success"
            onClick={() => onTabChange && onTabChange("websites")}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="Database Manager"
            description="Create and manage MySQL databases for your applications"
            icon={<DatabaseIcon />}
            color="secondary"
            onClick={() => onTabChange && onTabChange("databases")}
            badge={stats.databases > 0 ? stats.databases : null}
          />
        </Grid>
      </Grid>

      {/* Secondary Features */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="Email Accounts"
            description="Create and manage professional email accounts"
            icon={<EmailIcon />}
            color="info"
            onClick={() => onTabChange && onTabChange("email-advanced")}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="SSL Certificates"
            description="Secure your domains with free SSL certificates"
            icon={<SSLIcon />}
            color="warning"
            onClick={() => onTabChange && onTabChange("ssl")}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <QuickActionCard
            title="Backup & Restore"
            description="Keep your data safe with automated backups"
            icon={<BackupIcon />}
            color="error"
            onClick={() => onTabChange && onTabChange("backups")}
          />
        </Grid>
      </Grid>

      {/* Resource Usage Monitoring */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="text.primary"
        sx={{ mb: 3 }}
      >
        Resource Usage
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <ResourceUsageCard
            title="CPU Usage"
            value={systemInfo.cpu_usage}
            max={100}
            unit="%"
            color="primary"
            icon={<CpuIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <ResourceUsageCard
            title="Memory"
            value={systemInfo.memory_usage}
            max={100}
            unit="%"
            color="secondary"
            icon={<MemoryIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <ResourceUsageCard
            title="Disk Space"
            value={usedMB}
            max={totalMB}
            unit="MB"
            color="warning"
            icon={<DatabaseIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <ResourceUsageCard
            title="Bandwidth"
            value={bandwidthUsedMB}
            max={bandwidthTotalMB}
            unit="MB"
            color="success"
            icon={<NetworkIcon />}
          />
        </Grid>
      </Grid>

      {/* System Status & Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                color="text.primary"
              >
                <SecurityIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Service Status
              </Typography>
              <List dense>
                {serviceStatus.map((service, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircleIcon
                        color={
                          service.status === "running" ? "success" : "error"
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            component="span"
                          >
                            {service.name}
                          </Typography>
                          <Chip
                            label={service.status}
                            size="small"
                            color={
                              service.status === "running" ? "success" : "error"
                            }
                            variant="outlined"
                          />
                        </span>
                      }
                      secondary={`Port: ${service.port}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                color="text.primary"
              >
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Recent Activity
              </Typography>
              <List dense>
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            activity.type === "success"
                              ? "success.main"
                              : activity.type === "warning"
                              ? "warning.main"
                              : "info.main",
                        }}
                      >
                        {activity.type === "success" ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : activity.type === "warning" ? (
                          <WarningIcon fontSize="small" />
                        ) : (
                          <InfoIcon fontSize="small" />
                        )}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {activity.action}
                        </Typography>
                      }
                      secondary={
                        <span>
                          <Typography variant="body2" component="span">
                            {activity.detail}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            component="span"
                            sx={{ ml: 1 }}
                          >
                            • {activity.time}
                          </Typography>
                        </span>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
              <Button
                variant="outlined"
                size="small"
                onClick={() => onTabChange && onTabChange("monitoring")}
                sx={{ textTransform: "none" }}
              >
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;

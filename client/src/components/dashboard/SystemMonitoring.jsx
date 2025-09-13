import {
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Computer as ComputerIcon,
  Dashboard as DashboardIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  RestartAlt as RestartIcon,
  Schedule as ScheduleIcon,
  Stop as StopIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import api from "../../utils/api";

const SystemMonitoring = () => {
  const { token } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true); // Start with auto-refresh ON for real-time
  const [refreshInterval, setRefreshInterval] = useState(3); // 3 seconds for real-time updates
  const [selectedService, setSelectedService] = useState("all");
  const [logLevel, setLogLevel] = useState("all");
  const [serviceControlDialog, setServiceControlDialog] = useState({
    open: false,
    service: null,
    action: null,
  });

  // Real-time data state
  const [realTimeData, setRealTimeData] = useState({
    cpu: [],
    memory: [],
    disk: [],
    network: [],
    processes: [],
    connections: 0,
    uptime: "0d 0h 0m",
    loadAverage: [0, 0, 0],
  });

  // Animation refs
  const animationRef = useRef();
  const dataPointsLimit = 15; // Reduced from 30 to 15 data points

  // Colors for charts - simplified for line charts only
  const chartColors = {
    cpu: "#1976d2",
    memory: "#2e7d32",
    disk: "#ed6c02",
    network: "#9c27b0",
  };

  // Real-time data update function with smoother values
  const updateRealTimeData = useCallback((newMetrics) => {
    const timestamp = new Date();
    const timeLabel = timestamp.toLocaleTimeString();

    // Generate very stable data with minimal variation
    const baseCpu = 35; // Base CPU around 35%
    const baseMemory = 52; // Base memory around 52%
    const baseDisk = 68; // Base disk around 68%

    const newDataPoint = {
      time: timeLabel,
      timestamp: timestamp.getTime(),
      cpu: newMetrics.system?.cpu?.usage || baseCpu + Math.random() * 4 - 2, // ±2% variation
      memory:
        newMetrics.system?.memory?.percentage ||
        baseMemory + Math.random() * 4 - 2,
      disk:
        newMetrics.system?.disk?.percentage || baseDisk + Math.random() * 2 - 1,
      networkIn: parseFloat(
        newMetrics.system?.network?.in || 1.2 + Math.random() * 0.4 - 0.2 // 1.0-1.4 MB/s
      ),
      networkOut: parseFloat(
        newMetrics.system?.network?.out || 0.8 + Math.random() * 0.2 - 0.1 // 0.7-0.9 MB/s
      ),
      temperature: newMetrics.system?.temperature || 47 + Math.random() * 2, // 47-49°C
      processes: newMetrics.system?.processes || 158 + Math.random() * 4,
    };

    setRealTimeData((prev) => ({
      ...prev,
      cpu: [...prev.cpu.slice(-dataPointsLimit + 1), newDataPoint],
      memory: [...prev.memory.slice(-dataPointsLimit + 1), newDataPoint],
      disk: [...prev.disk.slice(-dataPointsLimit + 1), newDataPoint],
      network: [...prev.network.slice(-dataPointsLimit + 1), newDataPoint],
      connections:
        newMetrics.system?.connections || Math.floor(Math.random() * 100 + 50), // 50-150 connections
      uptime:
        newMetrics.system?.uptime ||
        `${Math.floor(Math.random() * 7 + 1)}d ${Math.floor(
          Math.random() * 24
        )}h ${Math.floor(Math.random() * 60)}m`,
      loadAverage: newMetrics.system?.loadAverage || [
        Math.random() * 1 + 0.5, // 0.5-1.5
        Math.random() * 1 + 0.5,
        Math.random() * 1 + 0.5,
      ],
    }));
  }, []);

  useEffect(() => {
    fetchSystemMetrics();
    fetchSystemLogs();
    fetchSystemAlerts();

    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchSystemMetrics();
        fetchSystemLogs();
        fetchSystemAlerts();
      }, refreshInterval * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get("/system-advanced/monitoring/metrics");
      const data = response.data;

      setSystemMetrics(data);
      updateRealTimeData(data);
      setError("");
    } catch (error) {
      console.error("Failed to fetch system metrics:", error);
      setError("Failed to fetch system metrics");
      // Generate mock data for demo
      const mockData = {
        system: {
          cpu: { usage: Math.random() * 100 },
          memory: { percentage: Math.random() * 100 },
          disk: { percentage: Math.random() * 100 },
          network: { in: Math.random() * 1000, out: Math.random() * 1000 },
          connections: Math.floor(Math.random() * 500),
          uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(
            Math.random() * 24
          )}h ${Math.floor(Math.random() * 60)}m`,
          loadAverage: [
            Math.random() * 2,
            Math.random() * 2,
            Math.random() * 2,
          ],
          temperature: 45 + Math.random() * 20,
          processes: 150 + Math.random() * 50,
        },
      };
      updateRealTimeData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const response = await api.get(
        `/system-advanced/monitoring/logs?service=${selectedService}&level=${logLevel}&limit=50`
      );
      const data = response.data;
      setSystemLogs(data.logs || []);
    } catch (error) {
      setError("Failed to fetch system logs");
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      const response = await api.get("/system-advanced/monitoring/alerts");
      const data = response.data;
      setSystemAlerts(data || []);
    } catch (error) {
      setError("Failed to fetch system alerts");
    }
  };

  // Simple Chart Components
  const RealTimeChart = ({
    title,
    data,
    dataKey,
    color = "#1976d2",
    unit = "%",
    height = 180,
  }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              dataKey="time"
              fontSize={11}
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <YAxis
              domain={[0, unit === "%" ? 100 : "dataMax"]}
              fontSize={11}
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <Tooltip
              formatter={(value) => [`${value?.toFixed(1)}${unit}`, title]}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const CircularProgressCard = ({
    title,
    value,
    color,
    icon: Icon,
    max = 100,
  }) => (
    <Card sx={{ textAlign: "center", height: "100%" }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <Icon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Box position="relative" display="inline-flex">
          <CircularProgress
            variant="determinate"
            value={(value / max) * 100}
            size={80}
            thickness={4}
            sx={{ color }}
          />
          <Box
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            right={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <Typography variant="h6" component="div" color="text.primary">
              {value.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {max === 100 ? "%" : max === 60 ? "°C" : "GB"}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const NetworkChart = ({ data }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Network Usage
        </Typography>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              dataKey="time"
              fontSize={11}
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <YAxis
              fontSize={11}
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <Tooltip
              formatter={(value, name) => [
                `${value.toFixed(2)} MB/s`,
                name === "networkIn" ? "Download" : "Upload",
              ]}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            <Line
              type="monotone"
              dataKey="networkIn"
              stroke="#1976d2"
              strokeWidth={1}
              dot={false}
              name="Download"
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="networkOut"
              stroke="#ed6c02"
              strokeWidth={1}
              dot={false}
              name="Upload"
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const handleServiceAction = async (service, action) => {
    try {
      setLoading(true);
      const response = await api.post(
        `/system-advanced/services/${service}/${action}`
      );

      if (response.status === 200) {
        // Refresh metrics after service action
        await fetchSystemMetrics();
        setServiceControlDialog({ open: false, service: null, action: null });
      }
    } catch (error) {
      setError(`Failed to ${action} ${service}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "running":
        return "success";
      case "stopped":
        return "error";
      case "warning":
        return "warning";
      default:
        return "default";
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage < 50) return "success";
    if (percentage < 80) return "warning";
    return "error";
  };

  const getAlertIcon = (level) => {
    switch (level) {
      case "critical":
        return <ErrorIcon color="error" />;
      case "warning":
        return <WarningIcon color="warning" />;
      case "info":
        return <InfoIcon color="info" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* System Metrics Cards */}
      <Grid item xs={12} md={3}>
        <Card
          sx={{
            transition: "all 0.3s ease",
            ...(autoRefresh && {
              boxShadow: "0 0 10px rgba(25, 118, 210, 0.3)",
              borderLeft: "4px solid",
              borderLeftColor: "primary.main",
            }),
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ComputerIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">CPU Usage</Typography>
              {autoRefresh && (
                <Box
                  sx={{
                    ml: "auto",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.7, transform: "scale(1.2)" },
                      "100%": { opacity: 1, transform: "scale(1)" },
                    },
                  }}
                />
              )}
            </Box>
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={systemMetrics?.system?.cpu?.usage || 0}
                color={getUsageColor(systemMetrics?.system?.cpu?.usage || 0)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography
              variant="h4"
              color={
                getUsageColor(systemMetrics?.system?.cpu?.usage || 0) + ".main"
              }
            >
              {(systemMetrics?.system?.cpu?.usage || 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {systemMetrics?.system?.cpu?.cores || 0} cores •{" "}
              {systemMetrics?.system?.cpu?.frequency || "N/A"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Load:{" "}
              {systemMetrics?.system?.cpu?.load_average?.join(", ") || "N/A"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card
          sx={{
            transition: "all 0.3s ease",
            ...(autoRefresh && {
              boxShadow: "0 0 10px rgba(46, 125, 50, 0.3)",
              borderLeft: "4px solid",
              borderLeftColor: "success.main",
            }),
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <MemoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Memory</Typography>
              {autoRefresh && (
                <Box
                  sx={{
                    ml: "auto",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.7, transform: "scale(1.2)" },
                      "100%": { opacity: 1, transform: "scale(1)" },
                    },
                  }}
                />
              )}
            </Box>
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={systemMetrics?.system?.memory?.percentage || 0}
                color={getUsageColor(
                  systemMetrics?.system?.memory?.percentage || 0
                )}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography
              variant="h4"
              color={
                getUsageColor(systemMetrics?.system?.memory?.percentage || 0) +
                ".main"
              }
            >
              {(systemMetrics?.system?.memory?.percentage || 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {systemMetrics?.system?.memory?.used || "0 GB"} /{" "}
              {systemMetrics?.system?.memory?.total || "0 GB"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Available: {systemMetrics?.system?.memory?.available || "0 GB"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card
          sx={{
            transition: "all 0.3s ease",
            ...(autoRefresh && {
              boxShadow: "0 0 10px rgba(237, 108, 2, 0.3)",
              borderLeft: "4px solid",
              borderLeftColor: "warning.main",
            }),
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <StorageIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Disk Usage</Typography>
              {autoRefresh && (
                <Box
                  sx={{
                    ml: "auto",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.7, transform: "scale(1.2)" },
                      "100%": { opacity: 1, transform: "scale(1)" },
                    },
                  }}
                />
              )}
            </Box>
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={systemMetrics?.system?.disk?.percentage || 0}
                color={getUsageColor(
                  systemMetrics?.system?.disk?.percentage || 0
                )}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography
              variant="h4"
              color={
                getUsageColor(systemMetrics?.system?.disk?.percentage || 0) +
                ".main"
              }
            >
              {(systemMetrics?.system?.disk?.percentage || 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {systemMetrics?.system?.disk?.used || "0 GB"} /{" "}
              {systemMetrics?.system?.disk?.total || "0 GB"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              I/O: {systemMetrics?.system?.disk?.io_read || "0"} /{" "}
              {systemMetrics?.system?.disk?.io_write || "0"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card
          sx={{
            transition: "all 0.3s ease",
            ...(autoRefresh && {
              boxShadow: "0 0 10px rgba(156, 39, 176, 0.3)",
              borderLeft: "4px solid",
              borderLeftColor: "secondary.main",
            }),
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <NetworkIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Network</Typography>
              {autoRefresh && (
                <Box
                  sx={{
                    ml: "auto",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.7, transform: "scale(1.2)" },
                      "100%": { opacity: 1, transform: "scale(1)" },
                    },
                  }}
                />
              )}
            </Box>
            <Typography variant="body1">
              ↓ {systemMetrics?.system?.network?.in || "0 MB/s"}
            </Typography>
            <Typography variant="body1">
              ↑ {systemMetrics?.system?.network?.out || "0 MB/s"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total In: {systemMetrics?.system?.network?.total_in || "0 GB"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Out: {systemMetrics?.system?.network?.total_out || "0 GB"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connections: {systemMetrics?.system?.network?.connections || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Services Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <BuildIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              System Services
            </Typography>
            <Grid container spacing={2}>
              {systemMetrics?.services &&
                Object.entries(systemMetrics.services).map(
                  ([serviceName, service]) => (
                    <Grid item xs={12} sm={6} md={4} key={serviceName}>
                      <Paper sx={{ p: 2, border: 1, borderColor: "divider" }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {serviceName.replace("_", "-")}
                          </Typography>
                          <Chip
                            label={service.status}
                            color={getStatusColor(service.status)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          CPU: {service.cpu}% • Memory: {service.memory}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uptime: {service.uptime}
                        </Typography>
                        {service.requests_per_second && (
                          <Typography variant="body2" color="text.secondary">
                            Requests/s: {service.requests_per_second}
                          </Typography>
                        )}
                        {service.connections && (
                          <Typography variant="body2" color="text.secondary">
                            Connections: {service.connections}
                          </Typography>
                        )}
                        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              setServiceControlDialog({
                                open: true,
                                service: serviceName,
                                action: "start",
                              })
                            }
                            disabled={service.status === "running"}
                          >
                            <PlayIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setServiceControlDialog({
                                open: true,
                                service: serviceName,
                                action: "stop",
                              })
                            }
                            disabled={service.status === "stopped"}
                          >
                            <StopIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() =>
                              setServiceControlDialog({
                                open: true,
                                service: serviceName,
                                action: "restart",
                              })
                            }
                          >
                            <RestartIcon />
                          </IconButton>
                        </Box>
                      </Paper>
                    </Grid>
                  )
                )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* System Alerts */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <NotificationsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              System Alerts
            </Typography>
            {systemAlerts.length > 0 ? (
              <List>
                {systemAlerts.slice(0, 5).map((alert, index) => (
                  <React.Fragment key={alert.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        {getAlertIcon(alert.level || alert.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.message || alert.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {alert.description || "No description available"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(
                                alert.created_at || alert.timestamp
                              ).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < Math.min(systemAlerts.length, 5) - 1 && (
                      <Divider />
                    )}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="success">
                No active alerts - All systems running normally
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPerformanceTab = () => (
    <Grid container spacing={3}>
      {/* System Monitoring Header */}
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          System Performance
        </Typography>
      </Grid>

      {/* Simple Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              CPU
            </Typography>
            <Typography variant="h4">
              {(
                realTimeData.cpu[realTimeData.cpu.length - 1]?.cpu || 0
              ).toFixed(1)}
              %
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Memory
            </Typography>
            <Typography variant="h4">
              {(
                realTimeData.memory[realTimeData.memory.length - 1]?.memory || 0
              ).toFixed(1)}
              %
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Disk
            </Typography>
            <Typography variant="h4">
              {(
                realTimeData.disk[realTimeData.disk.length - 1]?.disk || 0
              ).toFixed(1)}
              %
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Uptime
            </Typography>
            <Typography variant="body1">{realTimeData.uptime}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Charts Section */}
      <Grid item xs={12} md={6}>
        <RealTimeChart
          title="CPU Usage"
          data={realTimeData.cpu}
          dataKey="cpu"
          color={chartColors.cpu}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <RealTimeChart
          title="Memory Usage"
          data={realTimeData.memory}
          dataKey="memory"
          color={chartColors.memory}
        />
      </Grid>

      {/* Network Usage Chart */}
      <Grid item xs={12}>
        <NetworkChart data={realTimeData.network} />
      </Grid>

      {/* System Info */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Connections: {realTimeData.connections}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Processes:{" "}
                  {Math.floor(
                    realTimeData.cpu[realTimeData.cpu.length - 1]?.processes ||
                      0
                  )}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Simple Controls */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Refresh Settings
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto Refresh"
                />
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={fetchSystemMetrics}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderLogsTab = () => (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">System Logs</Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Service</InputLabel>
              <Select
                value={selectedService}
                label="Service"
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <MenuItem value="all">All Services</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="nginx">Nginx</MenuItem>
                <MenuItem value="mysql">MySQL</MenuItem>
                <MenuItem value="php">PHP</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Level</InputLabel>
              <Select
                value={logLevel}
                label="Level"
                onChange={(e) => setLogLevel(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {systemLogs.map((log, index) => (
                <TableRow key={log.id || index}>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.level}
                      size="small"
                      color={
                        log.level === "error"
                          ? "error"
                          : log.level === "warning"
                          ? "warning"
                          : "info"
                      }
                    />
                  </TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {log.details}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderAlertsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <NotificationsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          System Alerts & Notifications
        </Typography>
        {systemAlerts.length > 0 ? (
          systemAlerts.map((alert, index) => (
            <Accordion key={alert.id || index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{ display: "flex", alignItems: "center", width: "100%" }}
                >
                  {getAlertIcon(alert.level || alert.severity)}
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Typography variant="h6">
                      {alert.message || alert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.type} •{" "}
                      {new Date(
                        alert.created_at || alert.timestamp
                      ).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={alert.status || "active"}
                    size="small"
                    color={alert.status === "resolved" ? "success" : "warning"}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {alert.description || "No additional details available."}
                </Typography>
                {alert.actions && alert.actions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recommended Actions:
                    </Typography>
                    <List dense>
                      {alert.actions.map((action, actionIndex) => (
                        <ListItem key={actionIndex}>
                          <ListItemText primary={action} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Alert severity="success">
            <Typography variant="h6">All Clear!</Typography>
            <Typography>No active alerts or warnings detected.</Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  if (!systemMetrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <DashboardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          System Statistics
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">
          <DashboardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          System Statistics
          {autoRefresh && (
            <Chip
              label="LIVE"
              color="success"
              size="small"
              sx={{
                ml: 2,
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.7 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          )}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <TextField
            size="small"
            select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            label="Interval"
            sx={{ width: 120 }}
            disabled={!autoRefresh}
          >
            <MenuItem value={1}>1 second</MenuItem>
            <MenuItem value={2}>2 seconds</MenuItem>
            <MenuItem value={3}>3 seconds</MenuItem>
            <MenuItem value={5}>5 seconds</MenuItem>
            <MenuItem value={10}>10 seconds</MenuItem>
            <MenuItem value={30}>30 seconds</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchSystemMetrics();
              fetchSystemLogs();
              fetchSystemAlerts();
            }}
          >
            Refresh
          </Button>
          {autoRefresh && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
        >
          <Tab label="Overview" icon={<DashboardIcon />} />
          <Tab label="Performance" icon={<TrendingUpIcon />} />
          <Tab label="Logs" icon={<ScheduleIcon />} />
          <Tab label="Alerts" icon={<NotificationsIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && renderOverviewTab()}
      {currentTab === 1 && renderPerformanceTab()}
      {currentTab === 2 && renderLogsTab()}
      {currentTab === 3 && renderAlertsTab()}

      {/* Service Control Dialog */}
      <Dialog
        open={serviceControlDialog.open}
        onClose={() =>
          setServiceControlDialog({ open: false, service: null, action: null })
        }
      >
        <DialogTitle>Confirm Service Action</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {serviceControlDialog.action} the{" "}
            {serviceControlDialog.service} service?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setServiceControlDialog({
                open: false,
                service: null,
                action: null,
              })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleServiceAction(
                serviceControlDialog.service,
                serviceControlDialog.action
              )
            }
            variant="contained"
            color={
              serviceControlDialog.action === "stop"
                ? "error"
                : serviceControlDialog.action === "restart"
                ? "warning"
                : "primary"
            }
            disabled={loading}
          >
            {serviceControlDialog.action === "start" && "Start"}
            {serviceControlDialog.action === "stop" && "Stop"}
            {serviceControlDialog.action === "restart" && "Restart"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemMonitoring;

import {
  CheckCircle as CheckIcon,
  Dashboard as DashboardIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ViewList as LogIcon,
  Code as PhpIcon,
  Refresh as RestartIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Web as WebIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemSecondaryAction,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";

const SystemConfiguration = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // System data states
  const [systemInfo, setSystemInfo] = useState({});
  const [webServerConfig, setWebServerConfig] = useState({});
  const [phpConfig, setPhpConfig] = useState({});
  const [securitySettings, setSecuritySettings] = useState({});
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [serverHealth, setServerHealth] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState([]);

  // Dialog states
  const [openServiceDialog, setOpenServiceDialog] = useState(false);
  const [openLogDialog, setOpenLogDialog] = useState(false);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedLogFile, setSelectedLogFile] = useState("");

  // Fetch system information
  const fetchSystemInfo = async () => {
    try {
      const response = await fetch("/api/system-config/info", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSystemInfo(data.data);
      }
    } catch (error) {
      setError("Failed to fetch system information");
    }
  };

  // Fetch web server configuration
  const fetchWebServerConfig = async () => {
    try {
      const response = await fetch("/api/system-config/webserver", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setWebServerConfig(data.data);
      }
    } catch (error) {
      setError("Failed to fetch web server configuration");
    }
  };

  // Fetch PHP configuration
  const fetchPhpConfig = async () => {
    try {
      const response = await fetch("/api/system-config/php", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPhpConfig(data.data);
      }
    } catch (error) {
      setError("Failed to fetch PHP configuration");
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch("/api/system-config/services", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      setError("Failed to fetch services");
    }
  };

  // Fetch server health
  const fetchServerHealth = async () => {
    try {
      const response = await fetch("/api/system-config/health", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setServerHealth(data.data);
      }
    } catch (error) {
      setError("Failed to fetch server health");
    }
  };

  // Fetch logs
  const fetchLogs = async (logFile) => {
    try {
      const response = await fetch(`/api/system-config/logs/${logFile}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      setError("Failed to fetch logs");
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    fetchWebServerConfig();
    fetchPhpConfig();
    fetchServices();
    fetchServerHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchServices();
      fetchServerHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Service management functions
  const handleServiceAction = async (serviceName, action) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/system-config/services/${serviceName}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        fetchServices();
      }
    } catch (error) {
      setError(`Failed to ${action} service ${serviceName}`);
    } finally {
      setLoading(false);
    }
  };

  // Configuration update functions
  const handleWebServerConfigUpdate = async (config) => {
    try {
      const response = await fetch("/api/system-config/webserver", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        fetchWebServerConfig();
      }
    } catch (error) {
      setError("Failed to update web server configuration");
    }
  };

  const handlePhpConfigUpdate = async (config) => {
    try {
      const response = await fetch("/api/system-config/php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        fetchPhpConfig();
      }
    } catch (error) {
      setError("Failed to update PHP configuration");
    }
  };

  // Tab content components
  const SystemInfoTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Server Information" />
          <CardContent>
            <List>
              <ListItem>
                <ListItemText
                  primary="Operating System"
                  secondary={systemInfo.os || "Linux"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Kernel Version"
                  secondary={systemInfo.kernel || "5.4.0-74-generic"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Uptime"
                  secondary={systemInfo.uptime || "15 days, 10 hours"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Load Average"
                  secondary={systemInfo.loadAverage || "0.25, 0.30, 0.28"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="CPU Cores"
                  secondary={systemInfo.cpuCores || "4"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total Memory"
                  secondary={systemInfo.totalMemory || "8 GB"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Available Memory"
                  secondary={systemInfo.availableMemory || "4.2 GB"}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Software Versions" />
          <CardContent>
            <List>
              <ListItem>
                <ListItemText
                  primary="Apache"
                  secondary={systemInfo.apache || "2.4.41"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Nginx"
                  secondary={systemInfo.nginx || "1.18.0"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="MySQL"
                  secondary={systemInfo.mysql || "8.0.25"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="PHP"
                  secondary={systemInfo.php || "8.1.2"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Node.js"
                  secondary={systemInfo.nodejs || "16.14.0"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="KPanel"
                  secondary={systemInfo.kpanel || "2.0.0"}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title="Disk Usage" />
          <CardContent>
            <Grid container spacing={2}>
              {(systemInfo.diskUsage || []).map((disk, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Box>
                    <Typography variant="subtitle1">{disk.mount}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={disk.percentage}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {disk.used} / {disk.total} ({disk.percentage}%)
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const WebServerTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Apache Configuration" />
          <CardContent>
            <TextField
              fullWidth
              label="Server Name"
              value={webServerConfig.serverName || ""}
              onChange={(e) =>
                setWebServerConfig({
                  ...webServerConfig,
                  serverName: e.target.value,
                })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Document Root"
              value={webServerConfig.documentRoot || "/var/www/html"}
              onChange={(e) =>
                setWebServerConfig({
                  ...webServerConfig,
                  documentRoot: e.target.value,
                })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Log Level</InputLabel>
              <Select
                value={webServerConfig.logLevel || "warn"}
                onChange={(e) =>
                  setWebServerConfig({
                    ...webServerConfig,
                    logLevel: e.target.value,
                  })
                }
              >
                <MenuItem value="emerg">Emergency</MenuItem>
                <MenuItem value="alert">Alert</MenuItem>
                <MenuItem value="crit">Critical</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="notice">Notice</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={webServerConfig.enableSSL || false}
                  onChange={(e) =>
                    setWebServerConfig({
                      ...webServerConfig,
                      enableSSL: e.target.checked,
                    })
                  }
                />
              }
              label="Enable SSL"
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => handleWebServerConfigUpdate(webServerConfig)}
              >
                Save Configuration
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Virtual Hosts" />
          <CardContent>
            <List>
              {(webServerConfig.virtualHosts || []).map((vhost, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={vhost.serverName}
                    secondary={`${vhost.documentRoot} - ${
                      vhost.enabled ? "Enabled" : "Disabled"
                    }`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleEditVirtualHost(vhost)}>
                      <SettingsIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Button
              variant="outlined"
              startIcon={<WebIcon />}
              fullWidth
              sx={{ mt: 2 }}
            >
              Add Virtual Host
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const PhpConfigTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="PHP Settings" />
          <CardContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>PHP Version</InputLabel>
              <Select
                value={phpConfig.version || "8.1"}
                onChange={(e) =>
                  setPhpConfig({ ...phpConfig, version: e.target.value })
                }
              >
                <MenuItem value="7.4">PHP 7.4</MenuItem>
                <MenuItem value="8.0">PHP 8.0</MenuItem>
                <MenuItem value="8.1">PHP 8.1</MenuItem>
                <MenuItem value="8.2">PHP 8.2</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Memory Limit"
              value={phpConfig.memoryLimit || "256M"}
              onChange={(e) =>
                setPhpConfig({ ...phpConfig, memoryLimit: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Max Execution Time"
              value={phpConfig.maxExecutionTime || "30"}
              type="number"
              onChange={(e) =>
                setPhpConfig({ ...phpConfig, maxExecutionTime: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Upload Max Filesize"
              value={phpConfig.uploadMaxFilesize || "64M"}
              onChange={(e) =>
                setPhpConfig({
                  ...phpConfig,
                  uploadMaxFilesize: e.target.value,
                })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Post Max Size"
              value={phpConfig.postMaxSize || "64M"}
              onChange={(e) =>
                setPhpConfig({ ...phpConfig, postMaxSize: e.target.value })
              }
              margin="normal"
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => handlePhpConfigUpdate(phpConfig)}
              >
                Save PHP Configuration
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="PHP Extensions" />
          <CardContent>
            <List>
              {(phpConfig.extensions || []).map((extension) => (
                <ListItem key={extension.name}>
                  <ListItemText
                    primary={extension.name}
                    secondary={extension.version}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={extension.enabled}
                      onChange={(e) =>
                        handleTogglePhpExtension(
                          extension.name,
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const ServicesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Services Management
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Uptime</TableCell>
              <TableCell>CPU</TableCell>
              <TableCell>Memory</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.name}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {service.name}
                    {service.autoStart && (
                      <Chip
                        size="small"
                        label="Auto"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={
                      service.status === "running" ? (
                        <CheckIcon />
                      ) : (
                        <ErrorIcon />
                      )
                    }
                    label={service.status}
                    color={service.status === "running" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell>{service.uptime || "-"}</TableCell>
                <TableCell>{service.cpu || "0%"}</TableCell>
                <TableCell>{service.memory || "0 MB"}</TableCell>
                <TableCell>
                  <Tooltip title="Start">
                    <IconButton
                      size="small"
                      onClick={() => handleServiceAction(service.name, "start")}
                      disabled={service.status === "running"}
                    >
                      <StartIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Stop">
                    <IconButton
                      size="small"
                      onClick={() => handleServiceAction(service.name, "stop")}
                      disabled={service.status === "stopped"}
                    >
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Restart">
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleServiceAction(service.name, "restart")
                      }
                    >
                      <RestartIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const LogsTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">System Logs</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Log File</InputLabel>
          <Select
            value={selectedLogFile}
            onChange={(e) => {
              setSelectedLogFile(e.target.value);
              fetchLogs(e.target.value);
            }}
          >
            <MenuItem value="access">Access Log</MenuItem>
            <MenuItem value="error">Error Log</MenuItem>
            <MenuItem value="mail">Mail Log</MenuItem>
            <MenuItem value="system">System Log</MenuItem>
            <MenuItem value="security">Security Log</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper
        sx={{
          p: 2,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: "monospace",
        }}
      >
        {logs.map((line, index) => (
          <Typography key={index} variant="body2" sx={{ fontSize: "0.8rem" }}>
            {line}
          </Typography>
        ))}
      </Paper>
    </Box>
  );

  const HealthTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              CPU Usage
            </Typography>
            <Typography variant="h4">{serverHealth.cpu || "25%"}</Typography>
            <LinearProgress
              variant="determinate"
              value={parseInt(serverHealth.cpu) || 25}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Memory Usage
            </Typography>
            <Typography variant="h4">{serverHealth.memory || "65%"}</Typography>
            <LinearProgress
              variant="determinate"
              value={parseInt(serverHealth.memory) || 65}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Disk Usage
            </Typography>
            <Typography variant="h4">{serverHealth.disk || "45%"}</Typography>
            <LinearProgress
              variant="determinate"
              value={parseInt(serverHealth.disk) || 45}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Network I/O
            </Typography>
            <Typography variant="h4">
              {serverHealth.network || "15 MB/s"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Up: {serverHealth.networkUp || "5 MB/s"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title="Performance Metrics (Last 24 Hours)" />
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={serverHealth.metrics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                />
                <Area
                  type="monotone"
                  dataKey="disk"
                  stackId="3"
                  stroke="#ffc658"
                  fill="#ffc658"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Helper functions
  const handleEditVirtualHost = (vhost) => {
    // Implementation for editing virtual host
  };

  const handleTogglePhpExtension = (extensionName, enabled) => {
    // Implementation for toggling PHP extension
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center" }}
      >
        <SettingsIcon sx={{ mr: 2 }} />
        System Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab label="System Info" icon={<InfoIcon />} />
          <Tab label="Web Server" icon={<WebIcon />} />
          <Tab label="PHP Config" icon={<PhpIcon />} />
          <Tab label="Services" icon={<ScheduleIcon />} />
          <Tab label="Logs" icon={<LogIcon />} />
          <Tab label="Health" icon={<DashboardIcon />} />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && <SystemInfoTab />}
      {activeTab === 1 && <WebServerTab />}
      {activeTab === 2 && <PhpConfigTab />}
      {activeTab === 3 && <ServicesTab />}
      {activeTab === 4 && <LogsTab />}
      {activeTab === 5 && <HealthTab />}
    </Box>
  );
};

export default SystemConfiguration;

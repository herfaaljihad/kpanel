// System Management Component
// client/src/components/admin/SystemManagement.jsx

import {
  Backup as BackupIcon,
  CloudQueue as CloudIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  GetApp as InstallerIcon,
  Analytics as MonitoringIcon,
  Storage as QuotaIcon,
  Refresh as RestartIcon,
  Security as SecurityIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Web as WebIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
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
import { useEffect, useState } from "react";
import api from "../../utils/api";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`system-tabpanel-${index}`}
      aria-labelledby={`system-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function SystemManagement() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for different sections
  const [metrics, setMetrics] = useState(null);
  const [services, setServices] = useState([]);
  const [quotas, setQuotas] = useState({});
  const [securityStatus, setSecurityStatus] = useState(null);
  const [packages, setPackages] = useState({});
  const [cloudProviders, setCloudProviders] = useState({});
  const [backupPlans, setBackupPlans] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [virtualHosts, setVirtualHosts] = useState([]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogData, setDialogData] = useState({});

  useEffect(() => {
    loadInitialData();
    // Set up auto-refresh for metrics
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadServices(),
        loadSecurityStatus(),
        loadPackages(),
        loadCloudProviders(),
      ]);
    } catch (error) {
      setError("Failed to load system data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await api.get("/system-advanced/monitoring/metrics");
      setMetrics(response.data.metrics);
    } catch (error) {
      console.error("Failed to load metrics:", error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await api.get("/system/services");
      setServices(response.data.services);
    } catch (error) {
      console.error("Failed to load services:", error);
    }
  };

  const loadSecurityStatus = async () => {
    try {
      const response = await api.get("/system-advanced/security/status");
      setSecurityStatus(response.data);
    } catch (error) {
      console.error("Failed to load security status:", error);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await api.get("/system-advanced/installer/packages");
      setPackages(response.data.packages);
    } catch (error) {
      console.error("Failed to load packages:", error);
    }
  };

  const loadCloudProviders = async () => {
    try {
      const response = await api.get("/system-advanced/cloud/providers");
      setCloudProviders(response.data.providers);
    } catch (error) {
      console.error("Failed to load cloud providers:", error);
    }
  };

  const handleServiceAction = async (service, action) => {
    try {
      setLoading(true);
      await api.post(`/system/services/${service}/${action}`);
      setSuccess(`Service ${service} ${action}ed successfully`);
      await loadServices();
    } catch (error) {
      setError(`Failed to ${action} ${service}: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPackage = async (packageKey, category) => {
    try {
      setLoading(true);
      const response = await api.post("/system-advanced/installer/install", {
        packageKey,
        category,
      });
      setSuccess(`Package installation started: ${response.data.installId}`);
      setDialogOpen(false);
    } catch (error) {
      setError("Failed to install package: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type, data = {}) => {
    setDialogType(type);
    setDialogData(data);
    setDialogOpen(true);
  };

  const renderMetricsTab = () => (
    <Grid container spacing={3}>
      {/* System Overview Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              CPU Usage
            </Typography>
            <Typography variant="h4" color="primary">
              {metrics?.cpu?.usage?.toFixed(1) || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics?.cpu?.usage || 0}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Memory Usage
            </Typography>
            <Typography variant="h4" color="primary">
              {metrics?.memory?.percentage?.toFixed(1) || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics?.memory?.percentage || 0}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" display="block">
              {metrics?.memory?.used?.toFixed(1) || 0}GB /{" "}
              {metrics?.memory?.total?.toFixed(1) || 0}GB
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Disk Usage
            </Typography>
            <Typography variant="h4" color="primary">
              {metrics?.disk?.[0]?.percentage?.toFixed(1) || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={metrics?.disk?.[0]?.percentage || 0}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Load Average
            </Typography>
            <Typography variant="h4" color="primary">
              {metrics?.cpu?.loadAverage?.["1min"]?.toFixed(2) || 0}
            </Typography>
            <Typography variant="caption" display="block">
              1m: {metrics?.cpu?.loadAverage?.["1min"]?.toFixed(2) || 0} | 5m:{" "}
              {metrics?.cpu?.loadAverage?.["5min"]?.toFixed(2) || 0} | 15m:{" "}
              {metrics?.cpu?.loadAverage?.["15min"]?.toFixed(2) || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Services Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Services
              <Button size="small" onClick={loadServices} sx={{ ml: 2 }}>
                <RestartIcon sx={{ mr: 1 }} />
                Refresh
              </Button>
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Uptime</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(services || []).map((service) => (
                    <TableRow key={service.name}>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={service.status}
                          color={
                            service.status === "running" ? "success" : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{service.uptime}</TableCell>
                      <TableCell>
                        {service.status === "running" ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleServiceAction(service.name, "stop")
                              }
                            >
                              <StopIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleServiceAction(service.name, "restart")
                              }
                            >
                              <RestartIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleServiceAction(service.name, "start")
                            }
                          >
                            <StartIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSecurityTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ mr: 1 }} />
              Security Status
            </Typography>
            {securityStatus && (
              <List>
                <ListItem>
                  <ListItemText
                    primary="Firewall Status"
                    secondary={
                      <Chip
                        label={securityStatus.firewall?.status || "Unknown"}
                        color={
                          securityStatus.firewall?.status === "active"
                            ? "success"
                            : "error"
                        }
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fail2Ban"
                    secondary={
                      <Chip
                        label={securityStatus.fail2ban?.status || "Unknown"}
                        color={
                          securityStatus.fail2ban?.status === "active"
                            ? "success"
                            : "error"
                        }
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Blocked IPs"
                    secondary={`${
                      securityStatus.blockedIPs?.length || 0
                    } IPs blocked`}
                  />
                </ListItem>
              </List>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={() => openDialog("security-scan")}
              sx={{ mt: 1 }}
            >
              Run Security Scan
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <QuotaIcon sx={{ mr: 1 }} />
              Quota Management
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => openDialog("quota-settings")}
            >
              Configure Quotas
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderInstallerTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          <InstallerIcon sx={{ mr: 1 }} />
          Package Installer
        </Typography>
        {Object.entries(packages || {}).map(([category, categoryPackages]) => (
          <Accordion key={category}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography
                variant="subtitle1"
                sx={{ textTransform: "capitalize" }}
              >
                {category.replace("-", " ")} (
                {Object.keys(categoryPackages || {}).length} packages)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {Object.entries(categoryPackages || {}).map(([key, pkg]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{pkg.name}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          {pkg.description}
                        </Typography>
                        <Chip label={pkg.version} size="small" sx={{ mr: 1 }} />
                        <Chip label={pkg.category} size="small" />
                        <Button
                          variant="contained"
                          size="small"
                          sx={{ mt: 1, display: "block" }}
                          onClick={() => handleInstallPackage(key, category)}
                        >
                          Install
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Grid>
    </Grid>
  );

  const renderCloudTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          <CloudIcon sx={{ mr: 1 }} />
          Cloud Integration
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(cloudProviders || {}).map(([key, provider]) => (
            <Grid item xs={12} md={4} key={key}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">{provider.name}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Type: {provider.type}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    {(provider.features || []).map((feature) => (
                      <Chip
                        key={feature}
                        label={feature}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                  <Chip
                    label={
                      provider.configured ? "Configured" : "Not Configured"
                    }
                    color={provider.configured ? "success" : "default"}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, display: "block" }}
                    onClick={() =>
                      openDialog("cloud-configure", {
                        provider: key,
                        ...provider,
                      })
                    }
                  >
                    {provider.configured ? "Reconfigure" : "Configure"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );

  const renderDialog = () => {
    switch (dialogType) {
      case "security-scan":
        return (
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Security Scan</DialogTitle>
            <DialogContent>
              <Typography>Select scan type:</Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Scan Type</InputLabel>
                <Select
                  value={dialogData.scanType || ""}
                  onChange={(e) =>
                    setDialogData({ ...dialogData, scanType: e.target.value })
                  }
                >
                  <MenuItem value="quick">Quick Scan</MenuItem>
                  <MenuItem value="full">Full System Scan</MenuItem>
                  <MenuItem value="malware">Malware Scan</MenuItem>
                  <MenuItem value="vulnerability">Vulnerability Scan</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="contained">Start Scan</Button>
            </DialogActions>
          </Dialog>
        );

      case "cloud-configure":
        return (
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Configure {dialogData.name}</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                Configure your {dialogData.name} integration
              </Typography>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                sx={{ mt: 2 }}
                value={dialogData.apiKey || ""}
                onChange={(e) =>
                  setDialogData({ ...dialogData, apiKey: e.target.value })
                }
              />
              {dialogData.type === "dns" && (
                <TextField
                  fullWidth
                  label="Email (for Cloudflare)"
                  sx={{ mt: 2 }}
                  value={dialogData.email || ""}
                  onChange={(e) =>
                    setDialogData({ ...dialogData, email: e.target.value })
                  }
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="contained">Configure</Button>
            </DialogActions>
          </Dialog>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          <AlertTitle>Success</AlertTitle>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<MonitoringIcon />} label="System Monitoring" />
          <Tab icon={<SecurityIcon />} label="Security & Quotas" />
          <Tab icon={<InstallerIcon />} label="Package Installer" />
          <Tab icon={<CloudIcon />} label="Cloud Integration" />
          <Tab icon={<BackupIcon />} label="Enhanced Backup" />
          <Tab icon={<EmailIcon />} label="Email Server" />
          <Tab icon={<WebIcon />} label="Web Server" />
        </Tabs>

        {loading && <LinearProgress />}

        <TabPanel value={currentTab} index={0}>
          {renderMetricsTab()}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {renderSecurityTab()}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {renderInstallerTab()}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {renderCloudTab()}
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <Typography variant="h6">Enhanced Backup System</Typography>
          <Typography>
            Backup plans, cloud storage, automated scheduling
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <Typography variant="h6">Email Server Management</Typography>
          <Typography>
            Email accounts, forwarders, DKIM/SPF configuration
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={6}>
          <Typography variant="h6">Web Server Configuration</Typography>
          <Typography>
            Virtual hosts, SSL certificates, PHP version management
          </Typography>
        </TabPanel>
      </Paper>

      {renderDialog()}
    </Box>
  );
}

export default SystemManagement;

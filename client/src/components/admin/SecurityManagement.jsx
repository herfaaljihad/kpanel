import {
  Add as AddIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
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
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const SecurityManagement = () => {
  const [securitySettings, setSecuritySettings] = useState({
    bruteforce_protection: true,
    ddos_protection: true,
    malware_scanning: true,
    firewall_enabled: true,
    ssl_enforcement: true,
    two_factor_auth: false,
    password_complexity: true,
    login_notifications: true,
  });

  const [blockedIPs, setBlockedIPs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [openIPDialog, setOpenIPDialog] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [scanResults, setScanResults] = useState({
    last_scan: null,
    threats_found: 0,
    files_scanned: 0,
    scanning: false,
  });

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const [settingsRes, ipsRes, logsRes, scanRes] = await Promise.all([
        api.get("/admin/security/settings"),
        api.get("/admin/security/blocked-ips"),
        api.get("/admin/security/logs"),
        api.get("/admin/security/scan-results"),
      ]);

      setSecuritySettings(settingsRes.data || securitySettings);
      setBlockedIPs(ipsRes.data || []);
      setSecurityLogs(logsRes.data || []);
      setScanResults(scanRes.data || scanResults);
    } catch (error) {
      toast.error("Failed to fetch security data");
    }
  };

  const updateSecuritySetting = async (setting, value) => {
    try {
      await api.patch("/admin/security/settings", { [setting]: value });
      setSecuritySettings((prev) => ({ ...prev, [setting]: value }));
      toast.success("Security setting updated");
    } catch (error) {
      toast.error("Failed to update security setting");
    }
  };

  const blockIP = async () => {
    if (!newIP) return;

    try {
      await api.post("/admin/security/block-ip", {
        ip: newIP,
        reason: "Manual block",
      });
      setOpenIPDialog(false);
      setNewIP("");
      fetchSecurityData();
      toast.success("IP address blocked successfully");
    } catch (error) {
      toast.error("Failed to block IP address");
    }
  };

  const unblockIP = async (ip) => {
    try {
      await api.delete(`/admin/security/block-ip/${ip}`);
      fetchSecurityData();
      toast.success("IP address unblocked successfully");
    } catch (error) {
      toast.error("Failed to unblock IP address");
    }
  };

  const startSecurityScan = async () => {
    try {
      setScanResults((prev) => ({ ...prev, scanning: true }));
      await api.post("/admin/security/scan");
      toast.success("Security scan started");

      // Simulate scan progress
      setTimeout(() => {
        setScanResults({
          last_scan: new Date().toISOString(),
          threats_found: Math.floor(Math.random() * 5),
          files_scanned: Math.floor(Math.random() * 10000) + 5000,
          scanning: false,
        });
      }, 5000);
    } catch (error) {
      setScanResults((prev) => ({ ...prev, scanning: false }));
      toast.error("Failed to start security scan");
    }
  };

  const StatCard = ({ title, value, icon, color = "primary", subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h6">{value}</Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Security Management</Typography>
        <Button
          variant="contained"
          startIcon={<SecurityIcon />}
          onClick={startSecurityScan}
          disabled={scanResults.scanning}
        >
          {scanResults.scanning ? "Scanning..." : "Run Security Scan"}
        </Button>
      </Box>

      {/* Security Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Blocked IPs"
            value={blockedIPs.length}
            icon={<BlockIcon fontSize="large" />}
            color="error"
            subtitle="Currently blocked"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Security Events"
            value={securityLogs.length}
            icon={<WarningIcon fontSize="large" />}
            color="warning"
            subtitle="Last 24 hours"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Threats Found"
            value={scanResults.threats_found}
            icon={<ShieldIcon fontSize="large" />}
            color={scanResults.threats_found > 0 ? "error" : "success"}
            subtitle="Last scan"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Protection Level"
            value={
              Object.values(securitySettings).filter(Boolean).length + "/8"
            }
            icon={<SecurityIcon fontSize="large" />}
            color="info"
            subtitle="Active protections"
          />
        </Grid>
      </Grid>

      {/* Scan Progress */}
      {scanResults.scanning && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Security scan in progress...
          </Typography>
          <LinearProgress />
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="security tabs"
        >
          <Tab label="Security Settings" />
          <Tab label="Blocked IPs" />
          <Tab label="Security Logs" />
          <Tab label="Firewall Rules" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Protection Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Brute Force Protection"
                    secondary="Block IPs after multiple failed login attempts"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.bruteforce_protection}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "bruteforce_protection",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="DDoS Protection"
                    secondary="Detect and mitigate DDoS attacks"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.ddos_protection}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "ddos_protection",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Malware Scanning"
                    secondary="Automatically scan uploaded files for malware"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.malware_scanning}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "malware_scanning",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Firewall"
                    secondary="Enable web application firewall"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.firewall_enabled}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "firewall_enabled",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Authentication Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="SSL Enforcement"
                    secondary="Force HTTPS for all connections"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.ssl_enforcement}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "ssl_enforcement",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Two-Factor Authentication"
                    secondary="Require 2FA for admin accounts"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.two_factor_auth}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "two_factor_auth",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Password Complexity"
                    secondary="Enforce strong password requirements"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.password_complexity}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "password_complexity",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Login Notifications"
                    secondary="Send email alerts for admin logins"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={securitySettings.login_notifications}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "login_notifications",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Blocked IP Addresses</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenIPDialog(true)}
            >
              Block IP
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Blocked Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {blockedIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {ip.ip_address}
                      </Typography>
                    </TableCell>
                    <TableCell>{ip.reason}</TableCell>
                    <TableCell>
                      {new Date(ip.blocked_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip label="Blocked" color="error" size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => unblockIP(ip.ip_address)}
                        color="success"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Recent Security Events
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Severity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {securityLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.event_type}</TableCell>
                    <TableCell>{log.ip_address}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.severity}
                        color={
                          log.severity === "high"
                            ? "error"
                            : log.severity === "medium"
                            ? "warning"
                            : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Firewall Rules
          </Typography>
          <Typography color="textSecondary">
            Firewall rule management will be implemented here.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Block IP Dialog */}
      <Dialog open={openIPDialog} onClose={() => setOpenIPDialog(false)}>
        <DialogTitle>Block IP Address</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="IP Address"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="192.168.1.100"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIPDialog(false)}>Cancel</Button>
          <Button onClick={blockIP} variant="contained" color="error">
            Block IP
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityManagement;

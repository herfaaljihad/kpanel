import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  Security as FirewallIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  BugReport as ScannerIcon,
  Security as SecurityIcon,
  LockOpen as UnlockIcon,
  VpnKey as VpnKeyIcon,
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
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
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
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Cell,
  Tooltip as ChartTooltip,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";

const SecurityManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Security data states
  const [firewallRules, setFirewallRules] = useState([]);
  const [ipBlacklist, setIpBlacklist] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [securityScans, setSecurityScans] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [twoFactorSettings, setTwoFactorSettings] = useState({});
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityStats, setSecurityStats] = useState({});

  // Dialog states
  const [openRuleDialog, setOpenRuleDialog] = useState(false);
  const [openIpDialog, setOpenIpDialog] = useState(false);
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [openAlertDialog, setOpenAlertDialog] = useState(false);

  // Form states
  const [newRule, setNewRule] = useState({
    name: "",
    action: "allow",
    source: "",
    destination: "",
    port: "",
    protocol: "tcp",
    enabled: true,
  });

  const [newIpBlock, setNewIpBlock] = useState({
    ip: "",
    reason: "",
    expiresAt: "",
    permanent: false,
  });

  const [scanConfig, setScanConfig] = useState({
    type: "full",
    targets: [],
    schedule: false,
  });

  // Fetch functions
  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [
        firewallRes,
        ipBlockRes,
        loginRes,
        scansRes,
        alertsRes,
        twoFactorRes,
        logsRes,
        statsRes,
      ] = await Promise.all([
        fetch("/api/security/firewall", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/ip-blocks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/login-attempts", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/scans", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/alerts", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/two-factor", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/logs", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/security/statistics", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      const [firewall, ipBlocks, login, scans, alerts, twoFactor, logs, stats] =
        await Promise.all([
          firewallRes.json(),
          ipBlockRes.json(),
          loginRes.json(),
          scansRes.json(),
          alertsRes.json(),
          twoFactorRes.json(),
          logsRes.json(),
          statsRes.json(),
        ]);

      setFirewallRules(firewall.data || []);
      setIpBlacklist(ipBlocks.data || []);
      setLoginAttempts(login.data || []);
      setSecurityScans(scans.data || []);
      setSecurityAlerts(alerts.data || []);
      setTwoFactorSettings(twoFactor.data || {});
      setSecurityLogs(logs.data || []);
      setSecurityStats(stats.data || {});
    } catch (error) {
      setError("Failed to fetch security data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Firewall management functions
  const handleAddFirewallRule = async () => {
    try {
      const response = await fetch("/api/security/firewall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newRule),
      });

      if (response.ok) {
        setOpenRuleDialog(false);
        setNewRule({
          name: "",
          action: "allow",
          source: "",
          destination: "",
          port: "",
          protocol: "tcp",
          enabled: true,
        });
        fetchSecurityData();
      }
    } catch (error) {
      setError("Failed to add firewall rule");
    }
  };

  const handleToggleFirewallRule = async (ruleId, enabled) => {
    try {
      await fetch(`/api/security/firewall/${ruleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ enabled }),
      });
      fetchSecurityData();
    } catch (error) {
      setError("Failed to update firewall rule");
    }
  };

  // IP blocking functions
  const handleBlockIp = async () => {
    try {
      const response = await fetch("/api/security/ip-blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newIpBlock),
      });

      if (response.ok) {
        setOpenIpDialog(false);
        setNewIpBlock({
          ip: "",
          reason: "",
          expiresAt: "",
          permanent: false,
        });
        fetchSecurityData();
      }
    } catch (error) {
      setError("Failed to block IP address");
    }
  };

  const handleUnblockIp = async (ipId) => {
    try {
      await fetch(`/api/security/ip-blocks/${ipId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchSecurityData();
    } catch (error) {
      setError("Failed to unblock IP address");
    }
  };

  // Security scan functions
  const handleStartScan = async () => {
    try {
      const response = await fetch("/api/security/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(scanConfig),
      });

      if (response.ok) {
        setOpenScanDialog(false);
        fetchSecurityData();
      }
    } catch (error) {
      setError("Failed to start security scan");
    }
  };

  // Tab content components
  const FirewallTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Firewall Rules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenRuleDialog(true)}
        >
          Add Rule
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Port</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {firewallRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>
                  <Chip
                    label={rule.action}
                    color={rule.action === "allow" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell>{rule.source}</TableCell>
                <TableCell>{rule.destination}</TableCell>
                <TableCell>{rule.port}</TableCell>
                <TableCell>{rule.protocol.toUpperCase()}</TableCell>
                <TableCell>
                  <Switch
                    checked={rule.enabled}
                    onChange={(e) =>
                      handleToggleFirewallRule(rule.id, e.target.checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteFirewallRule(rule.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const IpBlockingTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">IP Address Blocking</Typography>
        <Button
          variant="contained"
          startIcon={<BlockIcon />}
          onClick={() => setOpenIpDialog(true)}
        >
          Block IP
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Blocked IP Addresses" />
            <CardContent>
              <List>
                {ipBlacklist.map((ip) => (
                  <ListItem key={ip.id}>
                    <ListItemAvatar>
                      <Avatar>
                        <BlockIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={ip.ip}
                      secondary={`${ip.reason} - ${
                        ip.permanent ? "Permanent" : `Expires: ${ip.expiresAt}`
                      }`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleUnblockIp(ip.id)}>
                        <UnlockIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Recent Login Attempts" />
            <CardContent>
              <List>
                {loginAttempts.slice(0, 5).map((attempt, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar>
                        {attempt.success ? (
                          <CheckIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={attempt.ip}
                      secondary={`${attempt.user} - ${attempt.timestamp}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const SecurityScansTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Security Scans</Typography>
        <Button
          variant="contained"
          startIcon={<ScannerIcon />}
          onClick={() => setOpenScanDialog(true)}
        >
          Start Scan
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Scan History" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Threats Found</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell>{scan.type}</TableCell>
                        <TableCell>{scan.startTime}</TableCell>
                        <TableCell>{scan.duration}</TableCell>
                        <TableCell>
                          <Chip
                            label={scan.status}
                            color={
                              scan.status === "completed"
                                ? "success"
                                : scan.status === "running"
                                ? "info"
                                : "error"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={scan.threatsFound} color="error">
                            <SecurityIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleViewScanDetails(scan)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Security Score" />
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h2" color="primary">
                  {securityStats.securityScore || 85}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  /100
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={securityStats.securityScore || 85}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Good security posture
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const TwoFactorTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Two-Factor Authentication
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="2FA Settings" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorSettings.enabled}
                    onChange={(e) => handleToggleTwoFactor(e.target.checked)}
                  />
                }
                label="Enable Two-Factor Authentication"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Default 2FA Method</InputLabel>
                <Select
                  value={twoFactorSettings.defaultMethod || "totp"}
                  onChange={(e) => handleUpdateTwoFactorMethod(e.target.value)}
                >
                  <MenuItem value="totp">Authenticator App</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorSettings.enforceForAdmin}
                    onChange={(e) =>
                      handleToggleAdminTwoFactor(e.target.checked)
                    }
                  />
                }
                label="Enforce 2FA for Admin Users"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorSettings.rememberDevice}
                    onChange={(e) =>
                      handleToggleRememberDevice(e.target.checked)
                    }
                  />
                }
                label="Remember Trusted Devices"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="2FA Statistics" />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Users with 2FA Enabled"
                    secondary={`${twoFactorSettings.usersEnabled || 0} of ${
                      twoFactorSettings.totalUsers || 0
                    }`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Success Rate"
                    secondary={`${twoFactorSettings.successRate || 98}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Failed Attempts (24h)"
                    secondary={twoFactorSettings.failedAttempts || 0}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const SecurityAlertsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Alerts & Notifications
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Recent Alerts" />
            <CardContent>
              <List>
                {securityAlerts.map((alert) => (
                  <ListItem key={alert.id}>
                    <ListItemAvatar>
                      <Avatar>
                        {alert.severity === "critical" ? (
                          <ErrorIcon color="error" />
                        ) : alert.severity === "warning" ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <InfoIcon color="info" />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={alert.title}
                      secondary={`${alert.description} - ${alert.timestamp}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleDismissAlert(alert.id)}>
                        <CheckIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Alert Statistics" />
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={securityStats.alertsByType || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {(securityStats.alertsByType || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][
                            index % 4
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const SecurityLogsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Audit Logs
      </Typography>

      <Paper
        sx={{
          p: 2,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: "monospace",
          maxHeight: 400,
          overflow: "auto",
        }}
      >
        {securityLogs.map((log, index) => (
          <Typography key={index} variant="body2" sx={{ fontSize: "0.8rem" }}>
            {log}
          </Typography>
        ))}
      </Paper>
    </Box>
  );

  // Helper functions
  const handleDeleteFirewallRule = (ruleId) => {
    // Implementation for deleting firewall rule
  };

  const handleViewScanDetails = (scan) => {
    // Implementation for viewing scan details
  };

  const handleToggleTwoFactor = (enabled) => {
    setTwoFactorSettings((prev) => ({ ...prev, enabled }));
  };

  const handleUpdateTwoFactorMethod = (method) => {
    setTwoFactorSettings((prev) => ({ ...prev, defaultMethod: method }));
  };

  const handleToggleAdminTwoFactor = (enforceForAdmin) => {
    setTwoFactorSettings((prev) => ({ ...prev, enforceForAdmin }));
  };

  const handleToggleRememberDevice = (rememberDevice) => {
    setTwoFactorSettings((prev) => ({ ...prev, rememberDevice }));
  };

  const handleDismissAlert = (alertId) => {
    setSecurityAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center" }}
      >
        <SecurityIcon sx={{ mr: 2 }} />
        Security Management
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
          <Tab label="Firewall" icon={<FirewallIcon />} />
          <Tab label="IP Blocking" icon={<BlockIcon />} />
          <Tab label="Security Scans" icon={<ScannerIcon />} />
          <Tab label="Two-Factor Auth" icon={<VpnKeyIcon />} />
          <Tab label="Security Alerts" icon={<NotificationsIcon />} />
          <Tab label="Audit Logs" icon={<AnalyticsIcon />} />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && <FirewallTab />}
      {activeTab === 1 && <IpBlockingTab />}
      {activeTab === 2 && <SecurityScansTab />}
      {activeTab === 3 && <TwoFactorTab />}
      {activeTab === 4 && <SecurityAlertsTab />}
      {activeTab === 5 && <SecurityLogsTab />}

      {/* Add Firewall Rule Dialog */}
      <Dialog
        open={openRuleDialog}
        onClose={() => setOpenRuleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Firewall Rule</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rule Name"
            fullWidth
            variant="outlined"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Action</InputLabel>
            <Select
              value={newRule.action}
              onChange={(e) =>
                setNewRule({ ...newRule, action: e.target.value })
              }
            >
              <MenuItem value="allow">Allow</MenuItem>
              <MenuItem value="deny">Deny</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Source IP/CIDR"
            fullWidth
            variant="outlined"
            value={newRule.source}
            onChange={(e) => setNewRule({ ...newRule, source: e.target.value })}
            placeholder="192.168.1.0/24 or any"
          />
          <TextField
            margin="dense"
            label="Destination IP/CIDR"
            fullWidth
            variant="outlined"
            value={newRule.destination}
            onChange={(e) =>
              setNewRule({ ...newRule, destination: e.target.value })
            }
            placeholder="192.168.1.0/24 or any"
          />
          <TextField
            margin="dense"
            label="Port"
            fullWidth
            variant="outlined"
            value={newRule.port}
            onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
            placeholder="80, 443, 1000-2000, any"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Protocol</InputLabel>
            <Select
              value={newRule.protocol}
              onChange={(e) =>
                setNewRule({ ...newRule, protocol: e.target.value })
              }
            >
              <MenuItem value="tcp">TCP</MenuItem>
              <MenuItem value="udp">UDP</MenuItem>
              <MenuItem value="icmp">ICMP</MenuItem>
              <MenuItem value="any">Any</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleAddFirewallRule} variant="contained">
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block IP Dialog */}
      <Dialog
        open={openIpDialog}
        onClose={() => setOpenIpDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Block IP Address</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="IP Address"
            fullWidth
            variant="outlined"
            value={newIpBlock.ip}
            onChange={(e) =>
              setNewIpBlock({ ...newIpBlock, ip: e.target.value })
            }
            placeholder="192.168.1.100"
          />
          <TextField
            margin="dense"
            label="Reason"
            fullWidth
            variant="outlined"
            value={newIpBlock.reason}
            onChange={(e) =>
              setNewIpBlock({ ...newIpBlock, reason: e.target.value })
            }
            placeholder="Malicious activity, spam, etc."
          />
          <TextField
            margin="dense"
            label="Expires At"
            type="datetime-local"
            fullWidth
            variant="outlined"
            value={newIpBlock.expiresAt}
            onChange={(e) =>
              setNewIpBlock({ ...newIpBlock, expiresAt: e.target.value })
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={newIpBlock.permanent}
                onChange={(e) =>
                  setNewIpBlock({ ...newIpBlock, permanent: e.target.checked })
                }
              />
            }
            label="Permanent Block"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIpDialog(false)}>Cancel</Button>
          <Button onClick={handleBlockIp} variant="contained">
            Block IP
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityManagement;

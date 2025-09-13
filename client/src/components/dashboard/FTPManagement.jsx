import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  LinkOff as DisconnectIcon,
  Edit as EditIcon,
  FolderSpecial as FTPIcon,
  NetworkCheck as NetworkIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayCircle as TestIcon,
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
  Divider,
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
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const FTPManagement = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  const [newAccount, setNewAccount] = useState({
    username: "",
    password: "",
    home_directory: "/domains/",
    disk_quota: 1000,
    permissions: {
      read: true,
      write: true,
      delete: false,
      create_directories: true,
      upload: true,
      download: true,
    },
    ip_restrictions: "",
    max_connections: 5,
    bandwidth_limit: 0,
    ssl_enabled: true,
    description: "",
  });

  useEffect(() => {
    fetchFTPData();
  }, []);

  const fetchFTPData = async () => {
    try {
      setLoading(true);
      const [accountsRes, sessionsRes, statsRes, configRes] = await Promise.all(
        [
          fetch("/api/ftp/accounts", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/ftp/sessions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/ftp/statistics", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/ftp/config", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]
      );

      const [accountsData, sessionsData, statsData, configData] =
        await Promise.all([
          accountsRes.json(),
          sessionsRes.json(),
          statsRes.json(),
          configRes.json(),
        ]);

      if (accountsData.success) setAccounts(accountsData.data.accounts);
      if (sessionsData.success) setSessions(sessionsData.data.sessions);
      if (statsData.success) setStatistics(statsData.data);
      if (configData.success) setConfig(configData.data);
    } catch (error) {
      setError("Failed to fetch FTP data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ftp/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAccount),
      });

      const data = await response.json();
      if (data.success) {
        setOpenDialog(false);
        setNewAccount({
          username: "",
          password: "",
          home_directory: "/domains/",
          disk_quota: 1000,
          permissions: {
            read: true,
            write: true,
            delete: false,
            create_directories: true,
            upload: true,
            download: true,
          },
          ip_restrictions: "",
          max_connections: 5,
          bandwidth_limit: 0,
          ssl_enabled: true,
          description: "",
        });
        setSuccess("FTP account created successfully");
        fetchFTPData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to create FTP account");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ftp/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingAccount),
      });

      const data = await response.json();
      if (data.success) {
        setEditingAccount(null);
        setSuccess("FTP account updated successfully");
        fetchFTPData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to update FTP account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this FTP account?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/ftp/accounts/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("FTP account deleted successfully");
        fetchFTPData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to delete FTP account");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (accountId) => {
    try {
      const response = await fetch(`/api/ftp/accounts/${accountId}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTestResults((prev) => ({ ...prev, [accountId]: data.data }));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to test FTP connection");
    }
  };

  const handleDisconnectSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/ftp/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("FTP session disconnected");
        fetchFTPData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to disconnect FTP session");
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: "20px 0" }}>
      {value === index && children}
    </div>
  );

  if (loading && accounts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <FTPIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          FTP Account Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">
          <FTPIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          FTP Account Management
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchFTPData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Account
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Accounts
              </Typography>
              <Typography variant="h4">
                {statistics.accounts?.total || 0}
              </Typography>
              <Typography variant="body2">
                {statistics.accounts?.active || 0} active,{" "}
                {statistics.accounts?.suspended || 0} suspended
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Disk Usage
              </Typography>
              <Typography variant="h4">
                {statistics.disk_usage?.percentage || 0}%
              </Typography>
              <Typography variant="body2">
                {formatBytes(
                  (statistics.disk_usage?.total_used || 0) * 1024 * 1024
                )}{" "}
                /{" "}
                {formatBytes(
                  (statistics.disk_usage?.total_quota || 0) * 1024 * 1024
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Sessions
              </Typography>
              <Typography variant="h4">
                {statistics.connections?.current_sessions || 0}
              </Typography>
              <Typography variant="body2">
                {statistics.connections?.total_logins || 0} total logins
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Bandwidth Used
              </Typography>
              <Typography variant="h4">
                {formatBytes(statistics.bandwidth?.total_transferred || 0)}
              </Typography>
              <Typography variant="body2">
                ↑ {formatBytes(statistics.bandwidth?.total_uploaded || 0)} ↓{" "}
                {formatBytes(statistics.bandwidth?.total_downloaded || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab icon={<FTPIcon />} label="Accounts" />
          <Tab icon={<NetworkIcon />} label="Active Sessions" />
          <Tab icon={<AnalyticsIcon />} label="Statistics" />
          <Tab icon={<SettingsIcon />} label="Server Config" />
        </Tabs>

        {/* Accounts Tab */}
        <TabPanel value={activeTab} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Home Directory</TableCell>
                  <TableCell>Disk Usage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {account.username}
                        </Typography>
                        {account.ssl_enabled && (
                          <Chip
                            label="SSL"
                            size="small"
                            color="success"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {account.home_directory}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={account.disk_usage_percent}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2">
                          {formatBytes(account.disk_used * 1024 * 1024)} /{" "}
                          {formatBytes(account.disk_quota * 1024 * 1024)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.status}
                        color={
                          account.status === "active" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(account.last_login)}</TableCell>
                    <TableCell>
                      <Tooltip title="Test Connection">
                        <IconButton
                          size="small"
                          onClick={() => handleTestConnection(account.id)}
                        >
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => setEditingAccount(account)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAccount(account.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Connection Test Results
              </Typography>
              {Object.entries(testResults).map(([accountId, result]) => (
                <Alert
                  key={accountId}
                  severity={result.connection_successful ? "success" : "error"}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2">
                    <strong>Account ID {accountId}:</strong>{" "}
                    {result.server_message}
                    {result.connection_successful && (
                      <span> (Response: {result.response_time}ms)</span>
                    )}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* Active Sessions Tab */}
        <TabPanel value={activeTab} index={1}>
          <List>
            {sessions.map((session) => (
              <React.Fragment key={session.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body1" fontWeight="bold">
                          {session.username}
                        </Typography>
                        <Chip label={session.connection_type} size="small" />
                        <Chip
                          label={session.status}
                          color="success"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          IP: {session.ip_address} | Directory:{" "}
                          {session.current_directory}
                        </Typography>
                        <Typography variant="body2">
                          Connected: {formatDate(session.connected_at)} |
                          Transferred: {formatBytes(session.bytes_transferred)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      startIcon={<DisconnectIcon />}
                      onClick={() => handleDisconnectSession(session.id)}
                      color="error"
                      size="small"
                    >
                      Disconnect
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
            {sessions.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                No active FTP sessions
              </Typography>
            )}
          </List>
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Account Statistics
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Accounts"
                        secondary={statistics.accounts?.total || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Active Accounts"
                        secondary={statistics.accounts?.active || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Suspended Accounts"
                        secondary={statistics.accounts?.suspended || 0}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Statistics
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="SSL Enabled Accounts"
                        secondary={
                          statistics.security?.ssl_enabled_accounts || 0
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="IP Restricted Accounts"
                        secondary={
                          statistics.security?.ip_restricted_accounts || 0
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Server Config Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Server Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Server Type"
                        secondary={config.server_type || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Version"
                        secondary={config.version || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            label={config.status || "Unknown"}
                            color={
                              config.status === "running" ? "success" : "error"
                            }
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Standard Port"
                        secondary={config.port || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="SSL Port"
                        secondary={config.ssl_port || "N/A"}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configuration
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Max Clients"
                        secondary={config.max_clients || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Max Per IP"
                        secondary={config.max_per_ip || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Passive Ports"
                        secondary={config.passive_ports || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="SSL Enabled"
                        secondary={
                          <Chip
                            label={config.ssl_enabled ? "Yes" : "No"}
                            color={config.ssl_enabled ? "success" : "error"}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Anonymous Access"
                        secondary={
                          <Chip
                            label={
                              config.anonymous_enabled ? "Enabled" : "Disabled"
                            }
                            color={
                              config.anonymous_enabled ? "warning" : "success"
                            }
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create Account Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New FTP Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={newAccount.username}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newAccount.password}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Home Directory"
                value={newAccount.home_directory}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    home_directory: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Disk Quota (MB)"
                type="number"
                value={newAccount.disk_quota}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    disk_quota: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Connections"
                type="number"
                value={newAccount.max_connections}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    max_connections: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="IP Restrictions (CIDR format, optional)"
                value={newAccount.ip_restrictions}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    ip_restrictions: e.target.value,
                  }))
                }
                placeholder="192.168.1.0/24"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newAccount.description}
                onChange={(e) =>
                  setNewAccount((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newAccount.ssl_enabled}
                    onChange={(e) =>
                      setNewAccount((prev) => ({
                        ...prev,
                        ssl_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Enable SSL/TLS"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAccount} variant="contained">
            Create Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit FTP Account</DialogTitle>
        <DialogContent>
          {editingAccount && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={editingAccount.username}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editingAccount.status}
                    onChange={(e) =>
                      setEditingAccount((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Home Directory"
                  value={editingAccount.home_directory}
                  onChange={(e) =>
                    setEditingAccount((prev) => ({
                      ...prev,
                      home_directory: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Disk Quota (MB)"
                  type="number"
                  value={editingAccount.disk_quota}
                  onChange={(e) =>
                    setEditingAccount((prev) => ({
                      ...prev,
                      disk_quota: parseInt(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Connections"
                  type="number"
                  value={editingAccount.max_connections}
                  onChange={(e) =>
                    setEditingAccount((prev) => ({
                      ...prev,
                      max_connections: parseInt(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="IP Restrictions"
                  value={editingAccount.ip_restrictions}
                  onChange={(e) =>
                    setEditingAccount((prev) => ({
                      ...prev,
                      ip_restrictions: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={editingAccount.description}
                  onChange={(e) =>
                    setEditingAccount((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingAccount.ssl_enabled}
                      onChange={(e) =>
                        setEditingAccount((prev) => ({
                          ...prev,
                          ssl_enabled: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Enable SSL/TLS"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAccount(null)}>Cancel</Button>
          <Button onClick={handleUpdateAccount} variant="contained">
            Update Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FTPManagement;

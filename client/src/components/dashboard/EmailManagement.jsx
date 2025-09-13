import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  FilterList as FilterIcon,
  Forward as ForwardIcon,
  Group as GroupIcon,
  Reply as ReplyIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
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
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";

const EmailManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [emailFilters, setEmailFilters] = useState([]);
  const [forwarders, setForwarders] = useState([]);
  const [autoresponders, setAutoresponders] = useState([]);
  const [mailingLists, setMailingLists] = useState([]);
  const [emailStats, setEmailStats] = useState({});
  const [securitySettings, setSecuritySettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dialog states
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [openForwarderDialog, setOpenForwarderDialog] = useState(false);
  const [openAutoresponderDialog, setOpenAutoresponderDialog] = useState(false);
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);

  // Form states
  const [newAccount, setNewAccount] = useState({
    username: "",
    password: "",
    quota: 1000,
    enabled: true,
  });

  const [newFilter, setNewFilter] = useState({
    name: "",
    conditions: [],
    actions: [],
    enabled: true,
  });

  const [newForwarder, setNewForwarder] = useState({
    source: "",
    destinations: [""],
    enabled: true,
  });

  const [newAutoresponder, setNewAutoresponder] = useState({
    email: "",
    subject: "",
    message: "",
    startDate: "",
    endDate: "",
    enabled: true,
  });

  const [newMailingList, setNewMailingList] = useState({
    name: "",
    description: "",
    subscribers: [],
    moderated: false,
  });

  const [bulkOperation, setBulkOperation] = useState({
    type: "create",
    accounts: "",
    domain: "",
    defaultPassword: "",
  });

  // Fetch functions
  const fetchDomains = async () => {
    try {
      const response = await fetch("/api/domains", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDomains(data.data);
        if (data.data.length > 0 && !selectedDomain) {
          setSelectedDomain(data.data[0].name);
        }
      }
    } catch (error) {
      setError("Failed to fetch domains");
    }
  };

  const fetchEmailData = async (domain) => {
    if (!domain) return;
    setLoading(true);
    try {
      // Fetch all email-related data
      const [
        accountsRes,
        filtersRes,
        forwardersRes,
        autorespondersRes,
        listsRes,
        statsRes,
        securityRes,
      ] = await Promise.all([
        fetch(`/api/email-advanced/accounts/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/filters/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/forwarders/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/autoresponders/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/mailing-lists/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/statistics/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`/api/email-advanced/security/${domain}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      const [
        accounts,
        filters,
        forwarders,
        autoresponders,
        lists,
        stats,
        security,
      ] = await Promise.all([
        accountsRes.json(),
        filtersRes.json(),
        forwardersRes.json(),
        autorespondersRes.json(),
        listsRes.json(),
        statsRes.json(),
        securityRes.json(),
      ]);

      setEmailAccounts(accounts.data || []);
      setEmailFilters(filters.data || []);
      setForwarders(forwarders.data || []);
      setAutoresponders(autoresponders.data || []);
      setMailingLists(lists.data || []);
      setEmailStats(stats.data || {});
      setSecuritySettings(security.data || {});
    } catch (error) {
      setError("Failed to fetch email data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchEmailData(selectedDomain);
    }
  }, [selectedDomain]);

  // Create functions
  const handleCreateAccount = async () => {
    try {
      const response = await fetch(
        `/api/email-advanced/accounts/${selectedDomain}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(newAccount),
        }
      );

      if (response.ok) {
        setOpenAccountDialog(false);
        setNewAccount({
          username: "",
          password: "",
          quota: 1000,
          enabled: true,
        });
        fetchEmailData(selectedDomain);
      }
    } catch (error) {
      setError("Failed to create email account");
    }
  };

  const handleCreateFilter = async () => {
    try {
      const response = await fetch(
        `/api/email-advanced/filters/${selectedDomain}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(newFilter),
        }
      );

      if (response.ok) {
        setOpenFilterDialog(false);
        setNewFilter({ name: "", conditions: [], actions: [], enabled: true });
        fetchEmailData(selectedDomain);
      }
    } catch (error) {
      setError("Failed to create email filter");
    }
  };

  const handleBulkOperations = async () => {
    try {
      const response = await fetch(`/api/email-advanced/bulk-operations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...bulkOperation,
          domain: selectedDomain,
        }),
      });

      if (response.ok) {
        setOpenBulkDialog(false);
        setBulkOperation({
          type: "create",
          accounts: "",
          domain: "",
          defaultPassword: "",
        });
        fetchEmailData(selectedDomain);
      }
    } catch (error) {
      setError("Failed to perform bulk operation");
    }
  };

  // Tab content components
  const EmailAccountsTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Email Accounts</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpenBulkDialog(true)}
            sx={{ mr: 1 }}
          >
            Bulk Operations
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAccountDialog(true)}
          >
            Create Account
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email Address</TableCell>
              <TableCell>Quota</TableCell>
              <TableCell>Used</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emailAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.email}</TableCell>
                <TableCell>{account.quota} MB</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <LinearProgress
                      variant="determinate"
                      value={(account.used / account.quota) * 100}
                      sx={{ width: 100, mr: 1 }}
                    />
                    {account.used} MB
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={account.enabled ? "Active" : "Disabled"}
                    color={account.enabled ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell>{account.lastLogin || "Never"}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleEditAccount(account)}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteAccount(account.id)}
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

  const EmailFiltersTab = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Email Filters & Rules</Typography>
        <Button
          variant="contained"
          startIcon={<FilterIcon />}
          onClick={() => setOpenFilterDialog(true)}
        >
          Create Filter
        </Button>
      </Box>

      <Grid container spacing={2}>
        {emailFilters.map((filter) => (
          <Grid item xs={12} md={6} key={filter.id}>
            <Card>
              <CardHeader
                title={filter.name}
                action={
                  <Switch
                    checked={filter.enabled}
                    onChange={(e) =>
                      handleToggleFilter(filter.id, e.target.checked)
                    }
                  />
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Conditions: {filter.conditions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actions: {filter.actions.length}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button size="small" onClick={() => handleEditFilter(filter)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleDeleteFilter(filter.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const EmailAnalyticsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Email Analytics & Statistics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Accounts
              </Typography>
              <Typography variant="h4">
                {emailStats.totalAccounts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Emails Sent Today
              </Typography>
              <Typography variant="h4">{emailStats.sentToday || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Emails Received
              </Typography>
              <Typography variant="h4">
                {emailStats.receivedToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Spam Blocked
              </Typography>
              <Typography variant="h4">
                {emailStats.spamBlocked || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Email Traffic (Last 7 Days)" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={emailStats.weeklyTraffic || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#8884d8"
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="received"
                    stroke="#82ca9d"
                    name="Received"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Storage Usage" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emailStats.storageBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {(emailStats.storageBreakdown || []).map((entry, index) => (
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const SecurityTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Email Security Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Spam Protection" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.spamAssassinEnabled}
                    onChange={(e) =>
                      handleSecuritySettingChange(
                        "spamAssassinEnabled",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Enable SpamAssassin"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.autoLearnSpam}
                    onChange={(e) =>
                      handleSecuritySettingChange(
                        "autoLearnSpam",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Auto-learn Spam"
              />
              <TextField
                fullWidth
                label="Spam Score Threshold"
                value={securitySettings.spamThreshold || 5}
                type="number"
                margin="normal"
                onChange={(e) =>
                  handleSecuritySettingChange("spamThreshold", e.target.value)
                }
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Authentication" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.dkimEnabled}
                    onChange={(e) =>
                      handleSecuritySettingChange(
                        "dkimEnabled",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Enable DKIM"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.spfEnabled}
                    onChange={(e) =>
                      handleSecuritySettingChange(
                        "spfEnabled",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Enable SPF"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={securitySettings.dmarcEnabled}
                    onChange={(e) =>
                      handleSecuritySettingChange(
                        "dmarcEnabled",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Enable DMARC"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Email Security Log" />
            <CardContent>
              <List>
                {(securitySettings.securityLog || []).map((entry, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar>
                        <SecurityIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={entry.event}
                      secondary={`${entry.timestamp} - ${entry.details}`}
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

  // Helper functions
  const handleEditAccount = (account) => {
    // Implementation for editing account
  };

  const handleDeleteAccount = (accountId) => {
    // Implementation for deleting account
  };

  const handleToggleFilter = (filterId, enabled) => {
    // Implementation for toggling filter
  };

  const handleEditFilter = (filter) => {
    // Implementation for editing filter
  };

  const handleDeleteFilter = (filterId) => {
    // Implementation for deleting filter
  };

  const handleSecuritySettingChange = (setting, value) => {
    setSecuritySettings((prev) => ({ ...prev, [setting]: value }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center" }}
      >
        <EmailIcon sx={{ mr: 2 }} />
        Advanced Email Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Domain</InputLabel>
          <Select
            value={selectedDomain}
            label="Select Domain"
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            {domains.map((domain) => (
              <MenuItem key={domain.id} value={domain.name}>
                {domain.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Email Accounts" icon={<EmailIcon />} />
          <Tab label="Filters & Rules" icon={<FilterIcon />} />
          <Tab label="Forwarders" icon={<ForwardIcon />} />
          <Tab label="Autoresponders" icon={<ReplyIcon />} />
          <Tab label="Mailing Lists" icon={<GroupIcon />} />
          <Tab label="Analytics" icon={<AnalyticsIcon />} />
          <Tab label="Security" icon={<SecurityIcon />} />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && <EmailAccountsTab />}
      {activeTab === 1 && <EmailFiltersTab />}
      {activeTab === 5 && <EmailAnalyticsTab />}
      {activeTab === 6 && <SecurityTab />}

      {/* Create Account Dialog */}
      <Dialog
        open={openAccountDialog}
        onClose={() => setOpenAccountDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Email Account</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={newAccount.username}
            onChange={(e) =>
              setNewAccount({ ...newAccount, username: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newAccount.password}
            onChange={(e) =>
              setNewAccount({ ...newAccount, password: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Quota (MB)"
            type="number"
            fullWidth
            variant="outlined"
            value={newAccount.quota}
            onChange={(e) =>
              setNewAccount({ ...newAccount, quota: parseInt(e.target.value) })
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={newAccount.enabled}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, enabled: e.target.checked })
                }
              />
            }
            label="Enable Account"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccountDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAccount} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <Dialog
        open={openBulkDialog}
        onClose={() => setOpenBulkDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Email Operations</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Operation Type</InputLabel>
            <Select
              value={bulkOperation.type}
              onChange={(e) =>
                setBulkOperation({ ...bulkOperation, type: e.target.value })
              }
            >
              <MenuItem value="create">Create Multiple Accounts</MenuItem>
              <MenuItem value="delete">Delete Multiple Accounts</MenuItem>
              <MenuItem value="enable">Enable Accounts</MenuItem>
              <MenuItem value="disable">Disable Accounts</MenuItem>
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Email Accounts (one per line)"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={bulkOperation.accounts}
            onChange={(e) =>
              setBulkOperation({ ...bulkOperation, accounts: e.target.value })
            }
            placeholder="user1@domain.com&#10;user2@domain.com&#10;user3@domain.com"
          />

          {bulkOperation.type === "create" && (
            <TextField
              margin="dense"
              label="Default Password"
              type="password"
              fullWidth
              variant="outlined"
              value={bulkOperation.defaultPassword}
              onChange={(e) =>
                setBulkOperation({
                  ...bulkOperation,
                  defaultPassword: e.target.value,
                })
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkOperations} variant="contained">
            Execute
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailManagement;

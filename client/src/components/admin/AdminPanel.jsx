import {
  Payment as BillingIcon,
  Business as BusinessIcon,
  Storage as DatabaseIcon,
  Domain as DomainIcon,
  MoreVert as MoreVertIcon,
  People as PeopleIcon,
  Assignment as PlanIcon,
  Settings as SystemIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import {
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
  Menu,
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
import { toast } from "react-toastify";
import api from "../../utils/api";
import BillingManagement from "./BillingManagement";
import PackageManagement from "./PackageManagement";
import ReportsAnalytics from "./ReportsAnalytics";
import ResellerManagement from "./ResellerManagement";
import SecurityManagement from "./SecurityManagement";
import SystemManagement from "./SystemManagement";
import WebAppInstaller from "./WebAppInstaller";

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDomains: 0,
    totalDatabases: 0,
    activeUsers: 0,
    totalPackages: 0,
    totalResellers: 0,
    systemLoad: 0,
    totalRevenue: 0,
  });
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openPackageDialog, setOpenPackageDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "user",
    plan: "",
    status: "active",
  });
  const [newPackage, setNewPackage] = useState({
    name: "",
    disk_quota: 1000,
    bandwidth_quota: 10000,
    domain_limit: 5,
    email_limit: 100,
    database_limit: 10,
    price: 9.99,
  });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPackages();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/stats");
      // Backend returns { success: true, data: {...} }
      setStats(response.data.data || {});
    } catch (error) {
      toast.error("Failed to fetch statistics");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      // Backend returns { success: true, data: [...] }
      setUsers(response.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await api.get("/admin/packages");
      // Backend returns { success: true, data: [...] }
      setPackages(response.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch packages");
    }
  };

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/admin/users/${selectedUser.id}/status`, { status });
      toast.success(`User status updated to ${status}`);
      fetchUsers();
      handleMenuClose();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete user ${selectedUser.email}?`
      )
    ) {
      try {
        await api.delete(`/admin/users/${selectedUser.id}`);
        toast.success("User deleted successfully");
        fetchUsers();
        fetchStats();
        handleMenuClose();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete user");
      }
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/admin/users", newUser);
      toast.success("User created successfully");
      setOpenUserDialog(false);
      setNewUser({
        email: "",
        password: "",
        role: "user",
        plan: "",
        status: "active",
      });
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleCreatePackage = async () => {
    try {
      await api.post("/admin/packages", newPackage);
      toast.success("Package created successfully");
      setOpenPackageDialog(false);
      setNewPackage({
        name: "",
        disk_quota: 1000,
        bandwidth_quota: 10000,
        domain_limit: 5,
        email_limit: 100,
        database_limit: 10,
        price: 9.99,
      });
      fetchPackages();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create package");
    }
  };

  const StatCard = ({ title, value, icon, color = "primary" }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Domains"
            value={stats.totalDomains}
            icon={<DomainIcon fontSize="large" />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Databases"
            value={stats.totalDatabases}
            icon={<DatabaseIcon fontSize="large" />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<TrendingUpIcon fontSize="large" />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Packages"
            value={stats.totalPackages || 0}
            icon={<PlanIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resellers"
            value={stats.totalResellers || 0}
            icon={<BusinessIcon fontSize="large" />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="System Load"
            value={`${stats.systemLoad || 0}%`}
            icon={<SystemIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue"
            value={`$${stats.totalRevenue || 0}`}
            icon={<BillingIcon fontSize="large" />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Admin Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="👥 User Management" />
          <Tab label="📦 Package Management" />
          <Tab label="🏪 Reseller Management" />
          <Tab label="🔧 System Management" />
          <Tab label="🛡️ Security Management" />
          <Tab label="💰 Billing & Revenue" />
          <Tab label="📊 Reports & Analytics" />
          <Tab label="📱 App Installer" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Paper>
          <Box
            p={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">User Management</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenUserDialog(true)}
            >
              Add New User
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === "admin" ? "primary" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.plan}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        color={
                          user.status === "active"
                            ? "success"
                            : user.status === "suspended"
                            ? "error"
                            : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuClick(e, user)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Package Management Tab */}
      {currentTab === 1 && <PackageManagement />}

      {/* Reseller Management Tab */}
      {currentTab === 2 && <ResellerManagement />}

      {/* System Management Tab */}
      {currentTab === 3 && <SystemManagement />}

      {/* Security Management Tab */}
      {currentTab === 4 && <SecurityManagement />}

      {/* Billing Management Tab */}
      {currentTab === 5 && <BillingManagement />}

      {/* Reports & Analytics Tab */}
      {currentTab === 6 && <ReportsAnalytics />}

      {/* Web App Installer Tab */}
      {currentTab === 7 && <WebAppInstaller />}

      {/* User Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange("active")}>
          Set Active
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange("suspended")}>
          Suspend
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange("inactive")}>
          Set Inactive
        </MenuItem>
        <MenuItem onClick={handleDeleteUser} sx={{ color: "error.main" }}>
          Delete User
        </MenuItem>
      </Menu>

      {/* Add User Dialog */}
      <Dialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser((prev) => ({ ...prev, email: e.target.value }))
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser((prev) => ({ ...prev, password: e.target.value }))
            }
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, role: e.target.value }))
              }
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="reseller">Reseller</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Plan</InputLabel>
            <Select
              value={newUser.plan}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, plan: e.target.value }))
              }
            >
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={newUser.status}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;

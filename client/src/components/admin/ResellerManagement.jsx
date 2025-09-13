import {
  AccountTree as AccountTreeIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
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

const ResellerManagement = () => {
  const [resellers, setResellers] = useState([]);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [resellerData, setResellerData] = useState({
    username: "",
    email: "",
    password: "",
    company_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    package_id: "",
    reseller_ips: [],
    nameservers: {
      ns1: "",
      ns2: "",
    },
    limits: {
      max_users: 50,
      max_domains: 100,
      max_bandwidth: 100000,
      max_disk: 50000,
    },
    commission_rate: 10,
    status: "active",
    auto_suspend: false,
    send_email: true,
  });

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const response = await api.get("/admin/resellers");
      setResellers(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch resellers");
    } finally {
      setLoading(false);
    }
  };

  const fetchResellerDetails = async (resellerId) => {
    try {
      const response = await api.get(`/admin/resellers/${resellerId}`);
      setSelectedReseller(response.data);
    } catch (error) {
      toast.error("Failed to fetch reseller details");
    }
  };

  const handleSaveReseller = async () => {
    try {
      if (editingReseller) {
        await api.put(`/admin/resellers/${editingReseller.id}`, resellerData);
        toast.success("Reseller updated successfully");
      } else {
        await api.post("/admin/resellers", resellerData);
        toast.success("Reseller created successfully");
      }
      setOpenDialog(false);
      setEditingReseller(null);
      resetForm();
      fetchResellers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save reseller");
    }
  };

  const handleEditReseller = (reseller) => {
    setEditingReseller(reseller);
    setResellerData({
      ...reseller,
      password: "", // Don't pre-fill password
      limits: reseller.limits || {
        max_users: 50,
        max_domains: 100,
        max_bandwidth: 100000,
        max_disk: 50000,
      },
    });
    setOpenDialog(true);
  };

  const handleDeleteReseller = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this reseller? This will also affect all their customers."
      )
    ) {
      try {
        await api.delete(`/admin/resellers/${id}`);
        toast.success("Reseller deleted successfully");
        fetchResellers();
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to delete reseller"
        );
      }
    }
  };

  const handleSuspendReseller = async (id, suspend = true) => {
    try {
      await api.patch(`/admin/resellers/${id}/status`, {
        status: suspend ? "suspended" : "active",
      });
      toast.success(
        `Reseller ${suspend ? "suspended" : "activated"} successfully`
      );
      fetchResellers();
    } catch (error) {
      toast.error(`Failed to ${suspend ? "suspend" : "activate"} reseller`);
    }
  };

  const resetForm = () => {
    setResellerData({
      username: "",
      email: "",
      password: "",
      company_name: "",
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      package_id: "",
      reseller_ips: [],
      nameservers: {
        ns1: "",
        ns2: "",
      },
      limits: {
        max_users: 50,
        max_domains: 100,
        max_bandwidth: 100000,
        max_disk: 50000,
      },
      commission_rate: 10,
      status: "active",
      auto_suspend: false,
      send_email: true,
    });
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
        <Typography variant="h5">Reseller Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Create Reseller
        </Button>
      </Box>

      {/* Reseller Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Resellers"
            value={resellers.length}
            icon={<BusinessIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Resellers"
            value={resellers.filter((r) => r.status === "active").length}
            icon={<PersonIcon fontSize="large" />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={resellers.reduce(
              (sum, r) => sum + (r.customer_count || 0),
              0
            )}
            icon={<GroupIcon fontSize="large" />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${resellers
              .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)
              .toFixed(2)}`}
            icon={<MoneyIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="reseller tabs"
        >
          <Tab label="All Resellers" />
          <Tab label="Reseller Details" disabled={!selectedReseller} />
          <Tab label="Commission Reports" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reseller</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Customers</TableCell>
                  <TableCell>Commission</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resellers.map((reseller) => (
                  <TableRow key={reseller.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {reseller.first_name?.[0]}
                          {reseller.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {reseller.username}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {reseller.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{reseller.company_name || "N/A"}</TableCell>
                    <TableCell>{reseller.customer_count || 0}</TableCell>
                    <TableCell>{reseller.commission_rate || 0}%</TableCell>
                    <TableCell>
                      <Typography
                        variant="body1"
                        fontWeight="bold"
                        color="primary"
                      >
                        ${reseller.monthly_revenue || 0}/mo
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reseller.status}
                        color={
                          reseller.status === "active" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          fetchResellerDetails(reseller.id);
                          setTabValue(1);
                        }}
                        color="info"
                      >
                        <AccountTreeIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditReseller(reseller)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleSuspendReseller(
                            reseller.id,
                            reseller.status === "active"
                          )
                        }
                        color={
                          reseller.status === "active" ? "warning" : "success"
                        }
                      >
                        {reseller.status === "active" ? "Suspend" : "Activate"}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReseller(reseller.id)}
                        color="error"
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

        <TabPanel value={tabValue} index={1}>
          {selectedReseller && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Reseller Information
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Username"
                      secondary={selectedReseller.username}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={selectedReseller.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Company"
                      secondary={selectedReseller.company_name || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Commission Rate"
                      secondary={`${selectedReseller.commission_rate || 0}%`}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Resource Limits
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Max Users"
                      secondary={
                        selectedReseller.limits?.max_users || "Unlimited"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Max Domains"
                      secondary={
                        selectedReseller.limits?.max_domains || "Unlimited"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Max Bandwidth"
                      secondary={`${
                        selectedReseller.limits?.max_bandwidth || 0
                      } MB`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Max Disk Space"
                      secondary={`${selectedReseller.limits?.max_disk || 0} MB`}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Commission Reports
          </Typography>
          <Typography color="textSecondary">
            Commission tracking and payout reports will be displayed here.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Create/Edit Reseller Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingReseller ? "Edit Reseller" : "Create New Reseller"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={resellerData.username}
                onChange={(e) =>
                  setResellerData((prev) => ({
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
                label="Email"
                type="email"
                value={resellerData.email}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    email: e.target.value,
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
                value={resellerData.password}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                required={!editingReseller}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={resellerData.company_name}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    company_name: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={resellerData.first_name}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={resellerData.last_name}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Commission Rate (%)"
                type="number"
                value={resellerData.commission_rate}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    commission_rate: parseFloat(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Users"
                type="number"
                value={resellerData.limits.max_users}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    limits: {
                      ...prev.limits,
                      max_users: parseInt(e.target.value),
                    },
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Domains"
                type="number"
                value={resellerData.limits.max_domains}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    limits: {
                      ...prev.limits,
                      max_domains: parseInt(e.target.value),
                    },
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Bandwidth (MB)"
                type="number"
                value={resellerData.limits.max_bandwidth}
                onChange={(e) =>
                  setResellerData((prev) => ({
                    ...prev,
                    limits: {
                      ...prev.limits,
                      max_bandwidth: parseInt(e.target.value),
                    },
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={resellerData.send_email}
                    onChange={(e) =>
                      setResellerData((prev) => ({
                        ...prev,
                        send_email: e.target.checked,
                      }))
                    }
                  />
                }
                label="Send welcome email"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveReseller} variant="contained">
            {editingReseller ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResellerManagement;

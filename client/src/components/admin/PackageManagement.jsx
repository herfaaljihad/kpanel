import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Assignment as PackageIcon,
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
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const PackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageData, setPackageData] = useState({
    name: "",
    disk_quota: 1000,
    bandwidth_quota: 10000,
    domain_limit: 5,
    email_limit: 100,
    database_limit: 10,
    ftp_limit: 10,
    subdomain_limit: 10,
    price: 9.99,
    billing_cycle: "monthly",
    status: "active",
    features: {
      ssl_enabled: true,
      backup_enabled: true,
      cron_enabled: true,
      dns_management: true,
      email_forwarding: true,
    },
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get("/admin/packages");
      setPackages(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePackage = async () => {
    try {
      if (editingPackage) {
        await api.put(`/admin/packages/${editingPackage.id}`, packageData);
        toast.success("Package updated successfully");
      } else {
        await api.post("/admin/packages", packageData);
        toast.success("Package created successfully");
      }
      setOpenDialog(false);
      setEditingPackage(null);
      resetForm();
      fetchPackages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save package");
    }
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageData({
      ...pkg,
      features: pkg.features || {
        ssl_enabled: true,
        backup_enabled: true,
        cron_enabled: true,
        dns_management: true,
        email_forwarding: true,
      },
    });
    setOpenDialog(true);
  };

  const handleDeletePackage = async (id) => {
    if (window.confirm("Are you sure you want to delete this package?")) {
      try {
        await api.delete(`/admin/packages/${id}`);
        toast.success("Package deleted successfully");
        fetchPackages();
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to delete package"
        );
      }
    }
  };

  const resetForm = () => {
    setPackageData({
      name: "",
      disk_quota: 1000,
      bandwidth_quota: 10000,
      domain_limit: 5,
      email_limit: 100,
      database_limit: 10,
      ftp_limit: 10,
      subdomain_limit: 10,
      price: 9.99,
      billing_cycle: "monthly",
      status: "active",
      features: {
        ssl_enabled: true,
        backup_enabled: true,
        cron_enabled: true,
        dns_management: true,
        email_forwarding: true,
      },
    });
  };

  const ResourceCard = ({ title, value, icon, color = "primary" }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h6">{value}</Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Package Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Create Package
        </Button>
      </Box>

      {/* Package Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <ResourceCard
            title="Total Packages"
            value={packages.length}
            icon={<PackageIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ResourceCard
            title="Active Packages"
            value={packages.filter((p) => p.status === "active").length}
            icon={<PackageIcon fontSize="large" />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ResourceCard
            title="Revenue/Month"
            value={`$${packages
              .reduce((sum, p) => sum + (p.price || 0), 0)
              .toFixed(2)}`}
            icon={<PackageIcon fontSize="large" />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ResourceCard
            title="Avg Price"
            value={`$${
              packages.length > 0
                ? (
                    packages.reduce((sum, p) => sum + (p.price || 0), 0) /
                    packages.length
                  ).toFixed(2)
                : "0.00"
            }`}
            icon={<PackageIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Packages Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Package Name</TableCell>
                <TableCell>Disk Quota</TableCell>
                <TableCell>Bandwidth</TableCell>
                <TableCell>Domains</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Databases</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {pkg.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {pkg.billing_cycle || "monthly"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {pkg.disk_quota ? `${pkg.disk_quota} MB` : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    {pkg.bandwidth_quota
                      ? `${pkg.bandwidth_quota} MB`
                      : "Unlimited"}
                  </TableCell>
                  <TableCell>{pkg.domain_limit || "Unlimited"}</TableCell>
                  <TableCell>{pkg.email_limit || "Unlimited"}</TableCell>
                  <TableCell>{pkg.database_limit || "Unlimited"}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="primary"
                    >
                      ${pkg.price}/mo
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pkg.status}
                      color={pkg.status === "active" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditPackage(pkg)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePackage(pkg.id)}
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
      </Paper>

      {/* Create/Edit Package Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPackage ? "Edit Package" : "Create New Package"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Package Name"
                value={packageData.name}
                onChange={(e) =>
                  setPackageData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price (USD)"
                type="number"
                value={packageData.price}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value),
                  }))
                }
                InputProps={{ startAdornment: "$" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Disk Quota (MB)"
                type="number"
                value={packageData.disk_quota}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    disk_quota: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bandwidth Quota (MB)"
                type="number"
                value={packageData.bandwidth_quota}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    bandwidth_quota: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Domain Limit"
                type="number"
                value={packageData.domain_limit}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    domain_limit: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Limit"
                type="number"
                value={packageData.email_limit}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    email_limit: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Database Limit"
                type="number"
                value={packageData.database_limit}
                onChange={(e) =>
                  setPackageData((prev) => ({
                    ...prev,
                    database_limit: parseInt(e.target.value),
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Billing Cycle</InputLabel>
                <Select
                  value={packageData.billing_cycle}
                  onChange={(e) =>
                    setPackageData((prev) => ({
                      ...prev,
                      billing_cycle: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Features
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={packageData.features.ssl_enabled}
                        onChange={(e) =>
                          setPackageData((prev) => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              ssl_enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                    }
                    label="SSL Certificates"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={packageData.features.backup_enabled}
                        onChange={(e) =>
                          setPackageData((prev) => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              backup_enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                    }
                    label="Backup & Restore"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={packageData.features.cron_enabled}
                        onChange={(e) =>
                          setPackageData((prev) => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              cron_enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                    }
                    label="Cron Jobs"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={packageData.features.dns_management}
                        onChange={(e) =>
                          setPackageData((prev) => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              dns_management: e.target.checked,
                            },
                          }))
                        }
                      />
                    }
                    label="DNS Management"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePackage} variant="contained">
            {editingPackage ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackageManagement;

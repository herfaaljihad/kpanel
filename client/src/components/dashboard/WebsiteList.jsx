// Website List Component - Similar to Hostinger
// client/src/components/dashboard/WebsiteList.jsx

import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Backup as BackupIcon,
  Build as BuildIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Launch as LaunchIcon,
  MoreVert as MoreIcon,
  Public as PublicIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Lock as SSLIcon,
  Storage as StorageIcon,
  Traffic as TrafficIcon,
  Language as WebsiteIcon,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const WebsiteList = () => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [addWebsiteDialog, setAddWebsiteDialog] = useState(false);
  const [websiteDetailsDialog, setWebsiteDetailsDialog] = useState(false);
  const [newWebsite, setNewWebsite] = useState({
    domain: "",
    type: "wordpress",
    subdirectory: "",
    ssl: true,
    autoInstall: false,
  });

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);

      // Combine data from domains and installed apps
      const [domainsResponse, installedAppsResponse] = await Promise.all([
        api.get("/domains"),
        api
          .get("/web-installer/installed")
          .catch(() => ({ data: { installed: [] } })),
      ]);

      const domains = domainsResponse.data.domains || [];
      const installedApps = installedAppsResponse.data.installed || [];

      // Create comprehensive website list
      const websiteList = domains.map((domain) => {
        const installedApp = installedApps.find(
          (app) =>
            app.domain === domain.domain || domain.domain.includes(app.domain)
        );

        return {
          id: domain.id,
          domain: domain.domain,
          status: domain.status,
          ssl: domain.ssl_status || "disabled",
          application: installedApp
            ? {
                name: installedApp.app,
                version: installedApp.version,
                installDate: installedApp.installDate,
                category: installedApp.category,
              }
            : null,
          documentRoot: domain.document_root || `/public_html/${domain.domain}`,
          phpVersion: domain.php_version || "8.1",
          diskUsage: Math.floor(Math.random() * 500) + 100, // MB - Mock data
          bandwidth: Math.floor(Math.random() * 1000) + 200, // MB - Mock data
          visitors: Math.floor(Math.random() * 1000) + 50, // Mock data
          uptime: 99.9 - Math.random() * 0.5, // Mock data
          lastBackup: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ),
          createdAt: domain.created_at,
        };
      });

      setWebsites(websiteList);
    } catch (error) {
      console.error("Failed to fetch websites:", error);
      toast.error("Failed to load websites");
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event, website) => {
    setAnchorEl(event.currentTarget);
    setSelectedWebsite(website);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWebsite(null);
  };

  const openFileManager = async (website) => {
    try {
      // Check filebrowser status
      const statusResponse = await api.get("/filebrowser/status");

      if (!statusResponse.data.running) {
        // Start filebrowser if not running
        toast.info("Starting File Manager...");
        await api.post("/filebrowser/start");

        // Wait a moment for filebrowser to start
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Get filebrowser URL
      const urlResponse = await api.get("/filebrowser/url");
      const filebrowserUrl = urlResponse.data.url;

      // Open file manager for specific website
      const websiteFileManagerUrl = `${filebrowserUrl}/#/websites/${website.domain}/public_html`;

      // Open in new window
      const fileManagerWindow = window.open(
        websiteFileManagerUrl,
        `filemanager_${website.domain}`,
        "width=1200,height=800,scrollbars=yes,resizable=yes"
      );

      if (!fileManagerWindow) {
        toast.error("Please allow popups to open File Manager");
      } else {
        toast.success(`File Manager opened for ${website.domain}`);
      }

      handleMenuClose();
    } catch (error) {
      console.error("Failed to open file manager:", error);
      toast.error("Failed to open File Manager");
    }
  };

  const createWebsiteDirectory = async (website) => {
    try {
      await api.post("/filebrowser/create-website", {
        domain: website.domain,
      });

      toast.success(`Website directory created for ${website.domain}`);
      handleMenuClose();
    } catch (error) {
      console.error("Failed to create website directory:", error);
      toast.error("Failed to create website directory");
    }
  };

  const handleAddWebsite = async () => {
    try {
      if (newWebsite.autoInstall && newWebsite.type !== "custom") {
        // Install application automatically
        const installResponse = await api.post("/web-installer/install", {
          appKey: newWebsite.type,
          category: getAppCategory(newWebsite.type),
          options: {
            domain: newWebsite.domain,
            subdirectory: newWebsite.subdirectory,
            adminEmail: "admin@" + newWebsite.domain,
            adminPassword: generatePassword(),
            siteName: newWebsite.domain + " Site",
          },
        });

        if (installResponse.data.success) {
          toast.success(
            `Website with ${newWebsite.type} installed successfully!`
          );
        }
      } else {
        // Create domain only
        await api.post("/domains", {
          domain: newWebsite.domain,
          ssl: newWebsite.ssl,
        });
        toast.success("Website created successfully!");
      }

      setAddWebsiteDialog(false);
      setNewWebsite({
        domain: "",
        type: "wordpress",
        subdirectory: "",
        ssl: true,
        autoInstall: false,
      });
      fetchWebsites();
    } catch (error) {
      console.error("Failed to create website:", error);
      toast.error("Failed to create website");
    }
  };

  const getAppCategory = (appType) => {
    const categories = {
      wordpress: "content-management",
      joomla: "content-management",
      drupal: "content-management",
      woocommerce: "e-commerce",
      magento: "e-commerce",
      phpbb: "forums",
    };
    return categories[appType] || "content-management";
  };

  const generatePassword = () => {
    return Math.random().toString(36).slice(-12) + "A1!";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "suspended":
        return "warning";
      case "pending":
        return "info";
      default:
        return "error";
    }
  };

  const getSSLColor = (ssl) => {
    switch (ssl) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      default:
        return "error";
    }
  };

  const renderWebsiteCard = (website) => (
    <Grid item xs={12} md={6} lg={4} key={website.id}>
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Box display="flex" alignItems="center">
              <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                <WebsiteIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" noWrap>
                  {website.domain}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {website.application
                    ? website.application.name
                    : "Static Website"}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={(e) => handleMenuClick(e, website)}>
              <MoreIcon />
            </IconButton>
          </Box>

          <Box mb={2}>
            <Grid container spacing={1}>
              <Grid item>
                <Chip
                  label={website.status}
                  color={getStatusColor(website.status)}
                  size="small"
                />
              </Grid>
              <Grid item>
                <Chip
                  label={`SSL: ${website.ssl}`}
                  color={getSSLColor(website.ssl)}
                  size="small"
                  icon={<SSLIcon />}
                />
              </Grid>
              {website.application && (
                <Grid item>
                  <Chip
                    label={`v${website.application.version}`}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
          </Box>

          <Box mb={2}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <StorageIcon
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    {website.diskUsage} MB
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <TrafficIcon
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    {website.bandwidth} MB
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <AnalyticsIcon
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    {website.visitors} visits
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <SpeedIcon
                    fontSize="small"
                    sx={{ mr: 1, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    {website.uptime.toFixed(1)}% uptime
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {website.application && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {website.application.name} installed on{" "}
                {new Date(website.application.installDate).toLocaleDateString()}
              </Typography>
            </Alert>
          )}

          <Box>
            <Typography variant="body2" color="text.secondary">
              PHP {website.phpVersion} • Last backup:{" "}
              {website.lastBackup.toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>

        <CardActions>
          <Button
            size="small"
            startIcon={<LaunchIcon />}
            href={`http://${website.domain}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit
          </Button>
          <Button
            size="small"
            startIcon={<FolderIcon />}
            onClick={() => openFileManager(website)}
            color="primary"
          >
            File Manager
          </Button>
          <Button
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => {
              setSelectedWebsite(website);
              setWebsiteDetailsDialog(true);
            }}
          >
            Manage
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderWebsiteDetailsDialog = () => (
    <Dialog
      open={websiteDetailsDialog}
      onClose={() => setWebsiteDetailsDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <WebsiteIcon sx={{ mr: 2 }} />
          Website Details: {selectedWebsite?.domain}
        </Box>
      </DialogTitle>

      <DialogContent>
        {selectedWebsite && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    General Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <PublicIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Domain"
                        secondary={selectedWebsite.domain}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckIcon
                          color={getStatusColor(selectedWebsite.status)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary="Status"
                        secondary={selectedWebsite.status}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <SSLIcon color={getSSLColor(selectedWebsite.ssl)} />
                      </ListItemIcon>
                      <ListItemText
                        primary="SSL Certificate"
                        secondary={selectedWebsite.ssl}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <BuildIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="PHP Version"
                        secondary={selectedWebsite.phpVersion}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Resource Usage
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="body2" gutterBottom>
                      Disk Usage: {selectedWebsite.diskUsage} MB
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(selectedWebsite.diskUsage / 1000) * 100}
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="body2" gutterBottom>
                      Bandwidth: {selectedWebsite.bandwidth} MB
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(selectedWebsite.bandwidth / 2000) * 100}
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="body2" gutterBottom>
                      Uptime: {selectedWebsite.uptime.toFixed(1)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedWebsite.uptime}
                      color="success"
                    />
                  </Box>
                </Paper>
              </Grid>

              {selectedWebsite.application && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Installed Application
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Application</TableCell>
                            <TableCell>
                              {selectedWebsite.application.name}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Version</TableCell>
                            <TableCell>
                              {selectedWebsite.application.version}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>
                              {selectedWebsite.application.category}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Install Date</TableCell>
                            <TableCell>
                              {new Date(
                                selectedWebsite.application.installDate
                              ).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setWebsiteDetailsDialog(false)}>Close</Button>
        <Button
          variant="outlined"
          onClick={() => {
            openFileManager(selectedWebsite);
            setWebsiteDetailsDialog(false);
          }}
          startIcon={<FolderIcon />}
        >
          File Manager
        </Button>
        <Button
          variant="contained"
          href={`http://${selectedWebsite?.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<LaunchIcon />}
        >
          Visit Website
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderAddWebsiteDialog = () => (
    <Dialog
      open={addWebsiteDialog}
      onClose={() => setAddWebsiteDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Add New Website</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Domain Name"
            value={newWebsite.domain}
            onChange={(e) =>
              setNewWebsite((prev) => ({ ...prev, domain: e.target.value }))
            }
            placeholder="example.com"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Website Type</InputLabel>
            <Select
              value={newWebsite.type}
              onChange={(e) =>
                setNewWebsite((prev) => ({ ...prev, type: e.target.value }))
              }
              label="Website Type"
            >
              <MenuItem value="custom">Custom/Static Website</MenuItem>
              <MenuItem value="wordpress">WordPress</MenuItem>
              <MenuItem value="joomla">Joomla</MenuItem>
              <MenuItem value="drupal">Drupal</MenuItem>
              <MenuItem value="woocommerce">WooCommerce</MenuItem>
            </Select>
          </FormControl>

          {newWebsite.type !== "custom" && (
            <TextField
              fullWidth
              label="Subdirectory (optional)"
              value={newWebsite.subdirectory}
              onChange={(e) =>
                setNewWebsite((prev) => ({
                  ...prev,
                  subdirectory: e.target.value,
                }))
              }
              placeholder="blog"
              helperText="Leave empty to install in root directory"
              sx={{ mb: 2 }}
            />
          )}

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center">
              <input
                type="checkbox"
                checked={newWebsite.ssl}
                onChange={(e) =>
                  setNewWebsite((prev) => ({ ...prev, ssl: e.target.checked }))
                }
              />
              <Typography sx={{ ml: 1 }}>Enable SSL Certificate</Typography>
            </Box>
          </FormControl>

          {newWebsite.type !== "custom" && (
            <FormControl component="fieldset">
              <Box display="flex" alignItems="center">
                <input
                  type="checkbox"
                  checked={newWebsite.autoInstall}
                  onChange={(e) =>
                    setNewWebsite((prev) => ({
                      ...prev,
                      autoInstall: e.target.checked,
                    }))
                  }
                />
                <Typography sx={{ ml: 1 }}>
                  Auto-install {newWebsite.type}
                </Typography>
              </Box>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddWebsiteDialog(false)}>Cancel</Button>
        <Button
          onClick={handleAddWebsite}
          variant="contained"
          disabled={!newWebsite.domain}
        >
          Create Website
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">My Websites ({websites.length})</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWebsites}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddWebsiteDialog(true)}
          >
            Add Website
          </Button>
        </Box>
      </Box>

      {websites.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <WebsiteIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No websites found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first website to get started with hosting.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddWebsiteDialog(true)}
          >
            Add Your First Website
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {websites.map(renderWebsiteCard)}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            window.open(`http://${selectedWebsite?.domain}`, "_blank");
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <LaunchIcon />
          </ListItemIcon>
          Visit Website
        </MenuItem>
        <MenuItem onClick={() => openFileManager(selectedWebsite)}>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          File Manager
        </MenuItem>
        <MenuItem onClick={() => createWebsiteDirectory(selectedWebsite)}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          Create Directory
        </MenuItem>
        <MenuItem
          onClick={() => {
            setWebsiteDetailsDialog(true);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          Manage Website
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <BackupIcon />
          </ListItemIcon>
          Create Backup
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <AnalyticsIcon />
          </ListItemIcon>
          View Analytics
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          Delete Website
        </MenuItem>
      </Menu>

      {renderAddWebsiteDialog()}
      {renderWebsiteDetailsDialog()}
    </Box>
  );
};

export default WebsiteList;

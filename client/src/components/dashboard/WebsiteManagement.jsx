// Website Management Component - Integrated with Domain Management
// client/src/components/dashboard/WebsiteManagement.jsx

import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Backup as BackupIcon,
  Build as BuildIcon,
  CheckCircle as CheckIcon,
  CloudDownload as CloudDownloadIcon,
  Code as CodeIcon,
  Dashboard as DashboardIcon,
  Delete as DeleteIcon,
  Dns as DNSIcon,
  Domain as DomainIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  GetApp as GetAppIcon,
  Launch as LaunchIcon,
  Mail as MailIcon,
  MoreVert as MoreIcon,
  Public as PublicIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Lock as SSLIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Traffic as TrafficIcon,
  CloudUpload as UploadIcon,
  Warning as WarningIcon,
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
  FormControlLabel,
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

const WebsiteManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [websites, setWebsites] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [addWebsiteDialog, setAddWebsiteDialog] = useState(false);
  const [websiteDetailsDialog, setWebsiteDetailsDialog] = useState(false);
  const [newWebsite, setNewWebsite] = useState({
    domain: "",
    subdomain: "",
    type: "wordpress",
    subdirectory: "",
    ssl: true,
    autoInstall: true,
    selectedDomain: "",
  });
  const [backupDialog, setBackupDialog] = useState(false);
  const [cloneDialog, setCloneDialog] = useState(false);
  const [subdomainDialog, setSubdomainDialog] = useState(false);
  const [stagingDialog, setStagingDialog] = useState(false);
  const [migrationDialog, setMigrationDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [domainsResponse, installedAppsResponse] = await Promise.all([
        api.get("/domains"),
        api
          .get("/web-installer/installed")
          .catch(() => ({ data: { installed: [] } })),
      ]);

      const domainsData = domainsResponse.data.domains || [];
      const installedApps = installedAppsResponse.data.installed || [];

      setDomains(domainsData);

      // Create comprehensive website list with domain integration
      const websiteList = domainsData.map((domain) => {
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
          diskUsage: Math.floor(Math.random() * 500) + 100,
          bandwidth: Math.floor(Math.random() * 1000) + 200,
          visitors: Math.floor(Math.random() * 1000) + 50,
          uptime: 99.9 - Math.random() * 0.5,
          lastBackup: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ),
          createdAt: domain.created_at,
          subdomains: domain.subdomains || [],
          hasDatabase: Math.random() > 0.3,
          hasEmail: Math.random() > 0.5,
        };
      });

      setWebsites(websiteList);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load website data");
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

  const openFileManager = async (website) => {
    try {
      const statusResponse = await api.get("/filebrowser/status");

      if (!statusResponse.data.running) {
        toast.info("Starting File Manager...");
        await api.post("/filebrowser/start");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const urlResponse = await api.get("/filebrowser/url");
      const filebrowserUrl = urlResponse.data.url;
      const websiteFileManagerUrl = `${filebrowserUrl}/#/websites/${website.domain}/public_html`;

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

  const handleAddWebsite = async () => {
    try {
      if (newWebsite.autoInstall && newWebsite.type !== "custom") {
        const installResponse = await api.post("/web-installer/install", {
          appKey: newWebsite.type,
          category: getAppCategory(newWebsite.type),
          options: {
            domain: newWebsite.selectedDomain || newWebsite.domain,
            subdirectory: newWebsite.subdirectory,
            adminEmail: `admin@${
              newWebsite.selectedDomain || newWebsite.domain
            }`,
            adminPassword: generatePassword(),
            siteName: `${newWebsite.selectedDomain || newWebsite.domain} Site`,
          },
        });

        if (installResponse.data.success) {
          toast.success(
            `Website with ${newWebsite.type} installed successfully!`
          );
        }
      } else {
        await api.post("/domains", {
          domain: newWebsite.selectedDomain || newWebsite.domain,
          ssl: newWebsite.ssl,
        });
        toast.success("Website created successfully!");
      }

      setAddWebsiteDialog(false);
      setNewWebsite({
        domain: "",
        subdomain: "",
        type: "wordpress",
        subdirectory: "",
        ssl: true,
        autoInstall: true,
        selectedDomain: "",
      });
      fetchData();
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

  const createBackup = async (website) => {
    try {
      toast.info(`Creating backup for ${website.domain}...`);
      await api.post("/backups/create", {
        domain: website.domain,
        type: "full",
      });
      toast.success("Backup created successfully!");
      handleMenuClose();
    } catch (error) {
      console.error("Failed to create backup:", error);
      toast.error("Failed to create backup");
    }
  };

  // Tab Components
  const OverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                <WebsiteIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">{websites.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Websites
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: "success.main", mr: 2 }}>
                <DomainIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">{domains.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Available Domains
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: "warning.main", mr: 2 }}>
                <SSLIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">
                  {websites.filter((w) => w.ssl === "active").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  SSL Secured
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddWebsiteDialog(true)}
                >
                  Add Website
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<BackupIcon />}
                  onClick={() => setBackupDialog(true)}
                >
                  Bulk Backup
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                >
                  Security Scan
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AnalyticsIcon />}
                >
                  Analytics Report
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={() => setStagingDialog(true)}
                >
                  Create Staging
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => setMigrationDialog(true)}
                >
                  Site Migration
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DomainIcon />}
                  onClick={() => setSubdomainDialog(true)}
                >
                  Manage Subdomains
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<TimelineIcon />}
                >
                  Performance Monitor
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const WebsitesTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">All Websites ({websites.length})</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
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
          {websites.map((website) => (
            <Grid item xs={12} md={6} lg={4} key={website.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
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
                      {website.hasDatabase && (
                        <Grid item>
                          <Chip
                            label="Database"
                            color="info"
                            size="small"
                            icon={<StorageIcon />}
                          />
                        </Grid>
                      )}
                      {website.hasEmail && (
                        <Grid item>
                          <Chip
                            label="Email"
                            color="secondary"
                            size="small"
                            icon={<MailIcon />}
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
                        {new Date(
                          website.application.installDate
                        ).toLocaleDateString()}
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
                    Files
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
          ))}
        </Grid>
      )}
    </Box>
  );

  const DomainsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Domain Integration
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Domain</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>SSL</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {domains.map((domain) => {
              const website = websites.find((w) => w.domain === domain.domain);
              return (
                <TableRow key={domain.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <DomainIcon sx={{ mr: 1 }} />
                      {domain.domain}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={domain.status}
                      color={getStatusColor(domain.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={domain.ssl_status || "disabled"}
                      color={getSSLColor(domain.ssl_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {website ? (
                      <Box display="flex" alignItems="center">
                        <CheckIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {website.application
                            ? website.application.name
                            : "Static"}
                        </Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <WarningIcon color="warning" sx={{ mr: 1 }} />
                        <Typography variant="body2">No website</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {!website ? (
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setNewWebsite((prev) => ({
                              ...prev,
                              selectedDomain: domain.domain,
                            }));
                            setAddWebsiteDialog(true);
                          }}
                        >
                          Add Website
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          onClick={() => {
                            setSelectedWebsite({ domain: domain.domain });
                            setMigrationDialog(true);
                          }}
                        >
                          Import
                        </Button>
                      </Box>
                    ) : (
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FolderIcon />}
                          onClick={() => openFileManager(website)}
                        >
                          Files
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BackupIcon />}
                          onClick={() => createBackup(website)}
                        >
                          Backup
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Add Website Dialog
  const renderAddWebsiteDialog = () => (
    <Dialog
      open={addWebsiteDialog}
      onClose={() => setAddWebsiteDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Add New Website</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Choose from your existing domains or create a new one.
              Hostinger-style integration ensures seamless website management.
            </Typography>
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Domain</InputLabel>
            <Select
              value={newWebsite.selectedDomain}
              onChange={(e) =>
                setNewWebsite((prev) => ({
                  ...prev,
                  selectedDomain: e.target.value,
                }))
              }
              label="Select Domain"
            >
              <MenuItem value="">
                <em>Create new domain</em>
              </MenuItem>
              {domains
                .filter((d) => !websites.find((w) => w.domain === d.domain))
                .map((domain) => (
                  <MenuItem key={domain.id} value={domain.domain}>
                    {domain.domain} ({domain.status})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {!newWebsite.selectedDomain && (
            <TextField
              fullWidth
              label="New Domain Name"
              value={newWebsite.domain}
              onChange={(e) =>
                setNewWebsite((prev) => ({ ...prev, domain: e.target.value }))
              }
              placeholder="example.com"
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            label="Subdomain (optional)"
            value={newWebsite.subdomain}
            onChange={(e) =>
              setNewWebsite((prev) => ({ ...prev, subdomain: e.target.value }))
            }
            placeholder="www, blog, shop"
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

          <FormControlLabel
            control={
              <Switch
                checked={newWebsite.ssl}
                onChange={(e) =>
                  setNewWebsite((prev) => ({ ...prev, ssl: e.target.checked }))
                }
              />
            }
            label="Enable SSL Certificate"
            sx={{ mb: 2 }}
          />

          {newWebsite.type !== "custom" && (
            <FormControlLabel
              control={
                <Switch
                  checked={newWebsite.autoInstall}
                  onChange={(e) =>
                    setNewWebsite((prev) => ({
                      ...prev,
                      autoInstall: e.target.checked,
                    }))
                  }
                />
              }
              label="Auto-install application"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddWebsiteDialog(false)}>Cancel</Button>
        <Button
          onClick={handleAddWebsite}
          variant="contained"
          disabled={!newWebsite.selectedDomain && !newWebsite.domain}
        >
          Create Website
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Website Details Dialog
  const renderWebsiteDetailsDialog = () => (
    <Dialog
      open={websiteDetailsDialog}
      onClose={() => setWebsiteDetailsDialog(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <WebsiteIcon sx={{ mr: 2 }} />
          Website Management: {selectedWebsite?.domain}
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedWebsite && (
          <Box>
            <Tabs value={0} sx={{ mb: 3 }}>
              <Tab label="General" icon={<SettingsIcon />} />
              <Tab label="Files" icon={<FolderIcon />} />
              <Tab label="Database" icon={<StorageIcon />} />
              <Tab label="Email" icon={<MailIcon />} />
              <Tab label="DNS" icon={<DNSIcon />} />
              <Tab label="SSL" icon={<SSLIcon />} />
              <Tab label="Staging" icon={<CodeIcon />} />
              <Tab label="Analytics" icon={<AnalyticsIcon />} />
            </Tabs>

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

  // Context Menu
  const renderContextMenu = () => (
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
      <MenuItem onClick={() => createBackup(selectedWebsite)}>
        <ListItemIcon>
          <BackupIcon />
        </ListItemIcon>
        Create Backup
      </MenuItem>
      <MenuItem
        onClick={() => {
          setStagingDialog(true);
          handleMenuClose();
        }}
      >
        <ListItemIcon>
          <CodeIcon />
        </ListItemIcon>
        Create Staging Site
      </MenuItem>
      <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
          <AnalyticsIcon />
        </ListItemIcon>
        View Analytics
      </MenuItem>
      <Divider />
      <MenuItem
        onClick={() => {
          setCloneDialog(true);
          handleMenuClose();
        }}
      >
        <ListItemIcon>
          <GetAppIcon />
        </ListItemIcon>
        Clone Website
      </MenuItem>
      <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
          <DeleteIcon />
        </ListItemIcon>
        Delete Website
      </MenuItem>
    </Menu>
  );

  // Advanced Feature Dialogs
  const renderStagingDialog = () => (
    <Dialog
      open={stagingDialog}
      onClose={() => setStagingDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Create Staging Environment</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Create a staging copy of your website for testing changes safely
            before going live.
          </Typography>
        </Alert>
        <TextField
          fullWidth
          label="Staging Domain"
          value={`staging.${selectedWebsite?.domain || ""}`}
          disabled
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Copy database"
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Copy files"
        />
        <FormControlLabel control={<Switch />} label="Password protection" />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setStagingDialog(false)}>Cancel</Button>
        <Button variant="contained">Create Staging</Button>
      </DialogActions>
    </Dialog>
  );

  const renderSubdomainDialog = () => (
    <Dialog
      open={subdomainDialog}
      onClose={() => setSubdomainDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Subdomain Management</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Create and manage subdomains for{" "}
              {selectedWebsite?.domain || "your website"}.
            </Typography>
          </Alert>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Subdomain"
                placeholder="blog, shop, app"
                helperText="Enter subdomain name"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Document Root"
                placeholder="/public_html/subdomain"
                helperText="Directory path"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ height: "56px" }}
              >
                Add
              </Button>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Existing Subdomains
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subdomain</TableCell>
                  <TableCell>Document Root</TableCell>
                  <TableCell>SSL</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    www.{selectedWebsite?.domain || "example.com"}
                  </TableCell>
                  <TableCell>/public_html</TableCell>
                  <TableCell>
                    <Chip label="Active" color="success" size="small" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSubdomainDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const renderMigrationDialog = () => (
    <Dialog
      open={migrationDialog}
      onClose={() => setMigrationDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Website Migration Tool</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Migrate your website from another hosting provider. Supports cPanel,
            DirectAdmin, and manual backups.
          </Typography>
        </Alert>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Migration Source</InputLabel>
          <Select defaultValue="cpanel" label="Migration Source">
            <MenuItem value="cpanel">cPanel Backup</MenuItem>
            <MenuItem value="directadmin">DirectAdmin Backup</MenuItem>
            <MenuItem value="plesk">Plesk Backup</MenuItem>
            <MenuItem value="manual">Manual Upload</MenuItem>
            <MenuItem value="url">Download from URL</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Source URL or File Path"
          placeholder="https://example.com/backup.tar.gz"
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Migrate files"
          sx={{ display: "block", mb: 1 }}
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Migrate databases"
          sx={{ display: "block", mb: 1 }}
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Migrate email accounts"
          sx={{ display: "block", mb: 1 }}
        />
        <FormControlLabel
          control={<Switch />}
          label="Keep original domain structure"
          sx={{ display: "block" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setMigrationDialog(false)}>Cancel</Button>
        <Button variant="contained" startIcon={<CloudDownloadIcon />}>
          Start Migration
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderCloneDialog = () => (
    <Dialog
      open={cloneDialog}
      onClose={() => setCloneDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Clone Website</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Create an exact copy of {selectedWebsite?.domain} on a new domain.
          </Typography>
        </Alert>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Target Domain</InputLabel>
          <Select label="Target Domain">
            {domains
              .filter((d) => !websites.find((w) => w.domain === d.domain))
              .map((domain) => (
                <MenuItem key={domain.id} value={domain.domain}>
                  {domain.domain}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Clone files"
          sx={{ display: "block", mb: 1 }}
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Clone database"
          sx={{ display: "block", mb: 1 }}
        />
        <FormControlLabel
          control={<Switch />}
          label="Clone email accounts"
          sx={{ display: "block" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCloneDialog(false)}>Cancel</Button>
        <Button variant="contained" startIcon={<GetAppIcon />}>
          Clone Website
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
        <Typography variant="h4">Website Management</Typography>
        <Chip
          label={`${websites.length} websites • ${domains.length} domains`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Overview" icon={<DashboardIcon />} />
          <Tab label="Websites" icon={<WebsiteIcon />} />
          <Tab label="Domain Integration" icon={<DomainIcon />} />
        </Tabs>
      </Box>

      {activeTab === 0 && <OverviewTab />}
      {activeTab === 1 && <WebsitesTab />}
      {activeTab === 2 && <DomainsTab />}

      {renderAddWebsiteDialog()}
      {renderWebsiteDetailsDialog()}
      {renderContextMenu()}
      {renderStagingDialog()}
      {renderSubdomainDialog()}
      {renderMigrationDialog()}
      {renderCloneDialog()}
    </Box>
  );
};

export default WebsiteManagement;

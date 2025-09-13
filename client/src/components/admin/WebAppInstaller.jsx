// Web Application Installer Component (Softaculous Alternative)
// client/src/components/admin/WebAppInstaller.jsx

import {
  Apps as AppsIcon,
  Article as ArticleIcon,
  Backup as BackupIcon,
  Build as BuildIcon,
  Category as CategoryIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Forum as ForumIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ShoppingCart as ShoppingCartIcon,
  Web as WebIcon,
  Work as WorkIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import api from "../../utils/api";

const WebAppInstaller = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [apps, setApps] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installDialog, setInstallDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [installForm, setInstallForm] = useState({
    domain: "",
    subdirectory: "",
    dbName: "",
    dbUser: "",
    dbPassword: "",
    adminEmail: "",
    adminPassword: "",
    siteName: "",
  });
  const [installProgress, setInstallProgress] = useState({});
  const [requirements, setRequirements] = useState(null);
  const [stats, setStats] = useState({});

  // Category icons mapping
  const categoryIcons = {
    "content-management": <WebIcon />,
    "e-commerce": <ShoppingCartIcon />,
    forums: <ForumIcon />,
    blogs: <ArticleIcon />,
    "project-management": <WorkIcon />,
    utilities: <BuildIcon />,
  };

  // Category colors
  const categoryColors = {
    "content-management": "#2196F3",
    "e-commerce": "#4CAF50",
    forums: "#FF9800",
    blogs: "#9C27B0",
    "project-management": "#F44336",
    utilities: "#607D8B",
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load available apps
      const appsResponse = await api.get("/web-installer/apps");
      if (appsResponse.data.success) {
        setApps(appsResponse.data.apps);
        setCategories(appsResponse.data.categories);
      }

      // Load installed apps
      const installedResponse = await api.get("/web-installer/installed");
      if (installedResponse.data.success) {
        setInstalledApps(installedResponse.data.installed);
      }

      // Load statistics
      const statsResponse = await api.get("/web-installer/stats");
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      const response = await api.get(
        `/web-installer/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.data.success) {
        setSearchResults(response.data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleInstallClick = async (appKey, category) => {
    try {
      // Get app details and check requirements
      const appResponse = await api.get(
        `/web-installer/apps/${category}/${appKey}`
      );
      if (appResponse.data.success) {
        setSelectedApp({ ...appResponse.data.app, appKey, category });

        // Check requirements
        const reqResponse = await api.post(
          "/web-installer/check-requirements",
          {
            appKey,
            category,
          }
        );

        if (reqResponse.data.success) {
          setRequirements(reqResponse.data);
        }

        // Reset form
        setInstallForm({
          domain: "",
          subdirectory: appKey,
          dbName: `${appKey}_db`,
          dbUser: `${appKey}_user`,
          dbPassword: generatePassword(),
          adminEmail: "",
          adminPassword: generatePassword(),
          siteName: appResponse.data.app.name + " Site",
        });

        setInstallDialog(true);
      }
    } catch (error) {
      console.error("Failed to get app details:", error);
    }
  };

  const handleInstall = async () => {
    try {
      setInstalling(true);

      const response = await api.post("/web-installer/install", {
        appKey: selectedApp.appKey,
        category: selectedApp.category,
        options: installForm,
      });

      if (response.data.success) {
        const installId = response.data.installId;
        setInstallDialog(false);

        // Monitor installation progress
        monitorInstallation(installId);

        // Refresh data
        loadData();
      }
    } catch (error) {
      console.error("Installation failed:", error);
    } finally {
      setInstalling(false);
    }
  };

  const monitorInstallation = async (installId) => {
    const checkProgress = async () => {
      try {
        const response = await api.get(
          `/web-installer/install/${installId}/status`
        );
        if (response.data.success) {
          const status = response.data;
          setInstallProgress((prev) => ({
            ...prev,
            [installId]: status,
          }));

          if (status.status === "completed" || status.status === "failed") {
            setTimeout(() => {
              setInstallProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[installId];
                return newProgress;
              });
              loadData(); // Refresh installed apps
            }, 3000);
          } else {
            setTimeout(checkProgress, 2000);
          }
        }
      } catch (error) {
        console.error("Failed to check installation status:", error);
      }
    };

    checkProgress();
  };

  const handleUninstall = async (installId) => {
    if (
      window.confirm(
        "Are you sure you want to uninstall this application? This action cannot be undone."
      )
    ) {
      try {
        const response = await api.delete(
          `/web-installer/uninstall/${installId}`
        );
        if (response.data.success) {
          loadData();
        }
      } catch (error) {
        console.error("Uninstallation failed:", error);
      }
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getCategoryApps = (category) => {
    return apps[category] || {};
  };

  const renderAppCard = (appKey, appInfo, category) => (
    <Grid item xs={12} sm={6} md={4} key={`${category}-${appKey}`}>
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              src={appInfo.icon}
              alt={appInfo.name}
              sx={{ width: 48, height: 48, mr: 2 }}
            >
              {appInfo.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" component="h3">
                {appInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                v{appInfo.version}
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            {appInfo.description}
          </Typography>

          <Box mb={2}>
            <Chip
              label={appInfo.category}
              size="small"
              sx={{
                backgroundColor: categoryColors[category],
                color: "white",
                mr: 1,
              }}
            />
            <Chip
              label={`PHP ${appInfo.requirements.php}`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Chip
              label={appInfo.requirements.diskSpace}
              size="small"
              variant="outlined"
            />
          </Box>

          {appInfo.features && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Features:
              </Typography>
              <List dense>
                {appInfo.features.slice(0, 3).map((feature, index) => (
                  <ListItem key={index} sx={{ py: 0, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>

        <CardActions>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleInstallClick(appKey, category)}
            variant="contained"
            color="primary"
          >
            Install
          </Button>
          <Button
            size="small"
            startIcon={<InfoIcon />}
            href={appInfo.demo}
            target="_blank"
            rel="noopener noreferrer"
          >
            Demo
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderInstalledAppCard = (app) => (
    <Grid item xs={12} sm={6} md={4} key={app.id}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ mr: 2, bgcolor: categoryColors[app.category] }}>
              {app.app.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">{app.app}</Typography>
              <Typography variant="body2" color="text.secondary">
                {app.domain}/{app.subdirectory}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1} mb={2}>
            <Chip label={app.category} size="small" />
            <Chip label={`v${app.version}`} size="small" variant="outlined" />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Installed: {new Date(app.installDate).toLocaleDateString()}
          </Typography>
        </CardContent>

        <CardActions>
          <Button
            size="small"
            startIcon={<LaunchIcon />}
            href={`http://${app.domain}/${app.subdirectory}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open
          </Button>
          <Button
            size="small"
            startIcon={<BackupIcon />}
            onClick={() => {
              /* TODO: Implement backup */
            }}
          >
            Backup
          </Button>
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => handleUninstall(app.id)}
            color="error"
          >
            Remove
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderInstallProgress = () => {
    return Object.entries(installProgress).map(([installId, progress]) => (
      <Alert
        key={installId}
        severity={progress.status === "failed" ? "error" : "info"}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="body2">
            {progress.status === "completed"
              ? "Installation completed!"
              : progress.status === "failed"
              ? "Installation failed!"
              : `Installing... ${progress.status}`}
          </Typography>
          {progress.status !== "completed" && progress.status !== "failed" && (
            <LinearProgress
              variant="determinate"
              value={progress.progress}
              sx={{ mt: 1 }}
            />
          )}
          {progress.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Error: {progress.error}
            </Typography>
          )}
        </Box>
      </Alert>
    ));
  };

  const renderOverview = () => (
    <Box>
      <Typography variant="h4" gutterBottom>
        Web Application Installer
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Install popular web applications with just one click. Our installer
        supports over {stats.totalAvailable || 0} applications across{" "}
        {stats.categories || 0} categories.
      </Typography>

      {Object.keys(installProgress).length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Active Installations
          </Typography>
          {renderInstallProgress()}
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AppsIcon sx={{ fontSize: 40, color: "primary.main", mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {stats.totalAvailable || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Apps
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <DownloadIcon
                  sx={{ fontSize: 40, color: "success.main", mr: 2 }}
                />
                <Box>
                  <Typography variant="h4">
                    {stats.totalInstalled || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Installed Apps
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CategoryIcon
                  sx={{ fontSize: 40, color: "warning.main", mr: 2 }}
                />
                <Box>
                  <Typography variant="h4">{stats.categories || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Categories
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WebIcon sx={{ fontSize: 40, color: "info.main", mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {stats.mostPopular || "WordPress"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Most Popular
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Popular Categories
      </Typography>
      <Grid container spacing={2}>
        {categories.map((category) => (
          <Grid item xs={12} sm={6} md={4} key={category}>
            <Card
              sx={{ cursor: "pointer" }}
              onClick={() => {
                setSelectedCategory(category);
                setActiveTab(1);
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center">
                  {categoryIcons[category]}
                  <Box ml={2}>
                    <Typography variant="h6">
                      {category
                        .replace("-", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.categoryBreakdown?.[category] || 0} applications
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderInstallDialog = () => (
    <Dialog
      open={installDialog}
      onClose={() => setInstallDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Avatar src={selectedApp?.icon} sx={{ mr: 2 }}>
            {selectedApp?.name?.charAt(0)}
          </Avatar>
          Install {selectedApp?.name}
        </Box>
      </DialogTitle>

      <DialogContent>
        {requirements && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              System Requirements
            </Typography>
            <Alert severity={requirements.check.success ? "success" : "error"}>
              {requirements.check.success
                ? "All requirements are met!"
                : "Some requirements are not met:"}
              {!requirements.check.success && (
                <List dense>
                  {requirements.check.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Alert>
          </Box>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Installation Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  value={installForm.domain}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      domain: e.target.value,
                    }))
                  }
                  placeholder="example.com (optional)"
                  helperText="Leave empty to use default domain"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Subdirectory"
                  value={installForm.subdirectory}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      subdirectory: e.target.value,
                    }))
                  }
                  required
                  helperText="Directory name where app will be installed"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={installForm.siteName}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      siteName: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Admin Email"
                  type="email"
                  value={installForm.adminEmail}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      adminEmail: e.target.value,
                    }))
                  }
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Database Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="info" sx={{ mb: 2 }}>
              Database will be created automatically with these settings.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database Name"
                  value={installForm.dbName}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      dbName: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database User"
                  value={installForm.dbUser}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      dbUser: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database Password"
                  type="password"
                  value={installForm.dbPassword}
                  onChange={(e) =>
                    setInstallForm((prev) => ({
                      ...prev,
                      dbPassword: e.target.value,
                    }))
                  }
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() =>
                          setInstallForm((prev) => ({
                            ...prev,
                            dbPassword: generatePassword(),
                          }))
                        }
                      >
                        <SettingsIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setInstallDialog(false)}>Cancel</Button>
        <Button
          onClick={handleInstall}
          variant="contained"
          disabled={
            installing ||
            !installForm.subdirectory ||
            (requirements && !requirements.check.success)
          }
          startIcon={
            installing ? <CircularProgress size={20} /> : <DownloadIcon />
          }
        >
          {installing ? "Installing..." : "Install"}
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
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Overview" />
          <Tab label="Browse Apps" />
          <Tab label="Installed Apps" />
          <Tab label="Search" />
        </Tabs>
      </Box>

      {activeTab === 0 && renderOverview()}

      {activeTab === 1 && (
        <Box>
          <Box display="flex" alignItems="center" mb={3}>
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedCategory ? (
            <Box>
              <Typography variant="h5" gutterBottom>
                {selectedCategory
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                Applications
              </Typography>
              <Grid container spacing={3}>
                {Object.entries(getCategoryApps(selectedCategory)).map(
                  ([appKey, appInfo]) =>
                    renderAppCard(appKey, appInfo, selectedCategory)
                )}
              </Grid>
            </Box>
          ) : (
            categories.map((category) => (
              <Box key={category} mb={4}>
                <Typography variant="h5" gutterBottom>
                  {category
                    .replace("-", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(getCategoryApps(category)).map(
                    ([appKey, appInfo]) =>
                      renderAppCard(appKey, appInfo, category)
                  )}
                </Grid>
              </Box>
            ))
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Installed Applications ({installedApps.length})
          </Typography>
          {installedApps.length === 0 ? (
            <Alert severity="info">
              No applications installed yet. Go to the Browse Apps tab to
              install your first application.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {installedApps.map(renderInstalledAppCard)}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Box mb={3}>
            <TextField
              fullWidth
              label="Search Applications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter application name, description, or features..."
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />
          </Box>

          {searchResults.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Search Results ({searchResults.length})
              </Typography>
              <Grid container spacing={3}>
                {searchResults.map((result) =>
                  renderAppCard(result.appKey, result, result.category)
                )}
              </Grid>
            </Box>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <Alert severity="info">
              No applications found matching "{searchQuery}".
            </Alert>
          )}
        </Box>
      )}

      {renderInstallDialog()}
    </Box>
  );
};

export default WebAppInstaller;

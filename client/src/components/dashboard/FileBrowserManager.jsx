import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Launch as LaunchIcon,
  Error as OfflineIcon,
  CheckCircle as OnlineIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  CloudUpload as UploadIcon,
  Language as WebsiteIcon,
} from "@mui/icons-material";
import {
  Alert,
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
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const FileBrowserManager = () => {
  const [loading, setLoading] = useState(true);
  const [filebrowserStatus, setFilebrowserStatus] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [createWebsiteOpen, setCreateWebsiteOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [creatingWebsite, setCreatingWebsite] = useState(false);

  useEffect(() => {
    checkFilebrowserStatus();
    fetchWebsites();
  }, []);

  const checkFilebrowserStatus = async () => {
    try {
      const response = await api.get("/filebrowser/status");
      setFilebrowserStatus(response.data);
    } catch (error) {
      console.error("Error checking filebrowser status:", error);
      setFilebrowserStatus({ running: false });
    } finally {
      setLoading(false);
    }
  };

  const fetchWebsites = async () => {
    try {
      const response = await api.get("/filebrowser/websites");
      setWebsites(response.data);
    } catch (error) {
      console.error("Error fetching websites:", error);
      toast.error("Failed to fetch websites");
    }
  };

  const startFilebrowser = async () => {
    setLoading(true);
    try {
      const response = await api.post("/filebrowser/start");
      setFilebrowserStatus({
        running: true,
        url: response.data.url,
        port: response.data.port,
      });
      toast.success("File Manager started successfully");
    } catch (error) {
      console.error("Error starting filebrowser:", error);
      toast.error("Failed to start File Manager");
    } finally {
      setLoading(false);
    }
  };

  const stopFilebrowser = async () => {
    setLoading(true);
    try {
      await api.post("/filebrowser/stop");
      setFilebrowserStatus({ running: false });
      toast.success("File Manager stopped");
    } catch (error) {
      console.error("Error stopping filebrowser:", error);
      toast.error("Failed to stop File Manager");
    } finally {
      setLoading(false);
    }
  };

  const openFilebrowser = () => {
    if (filebrowserStatus?.running && filebrowserStatus?.url) {
      window.open(filebrowserStatus.url, "_blank", "width=1200,height=800");
    }
  };

  const createWebsite = async () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    setCreatingWebsite(true);
    try {
      await api.post("/filebrowser/create-website", {
        domain: newDomain.trim(),
      });

      setNewDomain("");
      setCreateWebsiteOpen(false);
      fetchWebsites();
      toast.success(`Website directory created for ${newDomain}`);
    } catch (error) {
      console.error("Error creating website:", error);
      toast.error("Failed to create website directory");
    } finally {
      setCreatingWebsite(false);
    }
  };

  const openWebsiteFolder = (domain) => {
    if (filebrowserStatus?.running) {
      // In a real implementation, this would navigate to the specific folder
      const websiteUrl = `${filebrowserStatus.url}/#/websites/${domain}/public_html`;
      window.open(websiteUrl, "_blank", "width=1200,height=800");
    } else {
      toast.error("File Manager is not running. Please start it first.");
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const FilebrowserControls = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <CodeIcon sx={{ mr: 2, fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h6">Advanced File Manager</Typography>
              <Typography variant="body2" color="text.secondary">
                Powered by Filebrowser - Professional file management system
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={
                filebrowserStatus?.running ? <OnlineIcon /> : <OfflineIcon />
              }
              label={filebrowserStatus?.running ? "Running" : "Stopped"}
              color={filebrowserStatus?.running ? "success" : "error"}
              variant="outlined"
            />

            {filebrowserStatus?.running ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<LaunchIcon />}
                  onClick={openFilebrowser}
                  disabled={loading}
                >
                  Open File Manager
                </Button>
                <Tooltip title="Stop File Manager">
                  <IconButton
                    onClick={stopFilebrowser}
                    disabled={loading}
                    color="error"
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={
                  loading ? <CircularProgress size={20} /> : <StartIcon />
                }
                onClick={startFilebrowser}
                disabled={loading}
              >
                Start File Manager
              </Button>
            )}

            <Tooltip title="Refresh Status">
              <IconButton onClick={checkFilebrowserStatus} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const WebsiteList = () => (
    <Grid container spacing={3}>
      {websites.map((website) => (
        <Grid item xs={12} md={6} lg={4} key={website.domain}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WebsiteIcon sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="h6">{website.domain}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {website.fileCount} files in public_html
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" gap={1} mb={2}>
                <Chip
                  size="small"
                  label={
                    website.hasPublicHtml ? "Public HTML" : "No Public HTML"
                  }
                  color={website.hasPublicHtml ? "success" : "warning"}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Created: {new Date(website.created).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modified: {new Date(website.modified).toLocaleDateString()}
              </Typography>
            </CardContent>

            <CardActions>
              <Button
                size="small"
                startIcon={<FolderIcon />}
                onClick={() => openWebsiteFolder(website.domain)}
                disabled={!filebrowserStatus?.running}
              >
                Manage Files
              </Button>
              <Button
                size="small"
                startIcon={<LaunchIcon />}
                href={`http://${website.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Site
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}

      {websites.length === 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <WebsiteIcon
              sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              No websites found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Create your first website directory to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateWebsiteOpen(true)}
            >
              Create Website Directory
            </Button>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const QuickActions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>

        <List>
          <ListItem button onClick={() => setCreateWebsiteOpen(true)}>
            <ListItemIcon>
              <AddIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Create Website Directory"
              secondary="Set up a new website folder structure"
            />
          </ListItem>

          <ListItem
            button
            onClick={openFilebrowser}
            disabled={!filebrowserStatus?.running}
          >
            <ListItemIcon>
              <CodeIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Open Code Editor"
              secondary="Edit files with syntax highlighting"
            />
          </ListItem>

          <ListItem
            button
            onClick={openFilebrowser}
            disabled={!filebrowserStatus?.running}
          >
            <ListItemIcon>
              <UploadIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Upload Files"
              secondary="Upload multiple files and folders"
            />
          </ListItem>

          <ListItem
            button
            onClick={openFilebrowser}
            disabled={!filebrowserStatus?.running}
          >
            <ListItemIcon>
              <ArchiveIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Extract Archives"
              secondary="Extract ZIP, TAR, and other archives"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );

  if (loading && !filebrowserStatus) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          File Manager
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateWebsiteOpen(true)}
        >
          New Website
        </Button>
      </Box>

      {/* Filebrowser Controls */}
      <FilebrowserControls />

      {/* Feature Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Advanced File Management:</strong> This file manager provides
          professional-grade features including code editing with syntax
          highlighting, file preview, archive extraction, and direct website
          file management - similar to Hostinger and cPanel file managers.
        </Typography>
      </Alert>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`Websites (${websites.length})`} />
          <Tab label="Quick Actions" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <WebsiteList />}
      {activeTab === 1 && <QuickActions />}

      {/* Create Website Dialog */}
      <Dialog
        open={createWebsiteOpen}
        onClose={() => setCreateWebsiteOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Website Directory</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Create a new website directory structure with public_html, logs, and
            backups folders.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Domain Name"
            placeholder="example.com"
            fullWidth
            variant="outlined"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            disabled={creatingWebsite}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateWebsiteOpen(false)}
            disabled={creatingWebsite}
          >
            Cancel
          </Button>
          <Button
            onClick={createWebsite}
            variant="contained"
            disabled={creatingWebsite || !newDomain.trim()}
            startIcon={
              creatingWebsite ? <CircularProgress size={20} /> : <AddIcon />
            }
          >
            Create Directory
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileBrowserManager;

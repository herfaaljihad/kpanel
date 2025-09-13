import {
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  SystemUpdate as UpdateIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useActiveInstallations } from "../../hooks/useActiveInstallations";
import api from "../../utils/api";
import PersistentInstallationTerminal from "./PersistentInstallationTerminal";

const SystemUpdates = () => {
  const [availableUpdates, setAvailableUpdates] = useState([]);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [selectedUpdates, setSelectedUpdates] = useState([]);
  const [autoCheck, setAutoCheck] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [installDialog, setInstallDialog] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [packagesToInstall, setPackagesToInstall] = useState([]);

  // Use active installations hook
  const {
    hasActiveInstallation,
    currentInstallation,
    checkActiveInstallations,
  } = useActiveInstallations();

  // Auto-check for updates every 6 hours
  useEffect(() => {
    checkForUpdates();
    if (autoCheck) {
      const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoCheck]);

  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/system/updates");
      setAvailableUpdates(response.data.data?.updates || []);
      setLastCheck(new Date());

      // Also fetch system info
      const systemResponse = await api.get("/system/info");
      setSystemInfo(systemResponse.data || {});
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpdateHistory = useCallback(async () => {
    try {
      const response = await api.get("/system/updates/history");
      setUpdateHistory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch update history:", error);
    }
  }, []);

  const handleUpdateSelection = (packageName, checked) => {
    if (checked) {
      setSelectedUpdates([...selectedUpdates, packageName]);
    } else {
      setSelectedUpdates(
        selectedUpdates.filter((name) => name !== packageName)
      );
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUpdates(availableUpdates.map((update) => update.name));
    } else {
      setSelectedUpdates([]);
    }
  };

  const handleSelectSecurityOnly = () => {
    const securityUpdates = availableUpdates
      .filter((update) => update.security)
      .map((update) => update.name);
    setSelectedUpdates(securityUpdates);
  };

  const installUpdates = async () => {
    if (selectedUpdates.length === 0) return;

    // Get selected packages details for terminal
    const selectedPackages = availableUpdates.filter((update) =>
      selectedUpdates.includes(update.id)
    );

    setPackagesToInstall(selectedPackages);
    setInstallDialog(false);
    setTerminalOpen(true);
  };

  const handleInstallationComplete = async () => {
    setTerminalOpen(false);
    setInstalling(false);

    // Refresh updates list and active installations
    await checkForUpdates();
    await fetchUpdateHistory();
    await checkActiveInstallations();
    setSelectedUpdates([]);
    setPackagesToInstall([]);
  };

  // Show active installation indicator
  const showActiveInstallationBanner = () => {
    if (!hasActiveInstallation) return null;

    return (
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => setTerminalOpen(true)}
          >
            View Progress
          </Button>
        }
      >
        Installation in progress:{" "}
        {currentInstallation?.currentPackage || "Preparing..."}(
        {currentInstallation?.completedPackages || 0} /{" "}
        {currentInstallation?.totalPackages || 0} packages)
      </Alert>
    );
  };

  const getSeverityColor = (update) => {
    if (update.security) return "error";
    if (update.name.includes("php") || update.name.includes("mysql"))
      return "warning";
    return "info";
  };

  const getSeverityIcon = (update) => {
    if (update.security) return <SecurityIcon />;
    if (update.name.includes("php") || update.name.includes("mysql"))
      return <WarningIcon />;
    return <InfoIcon />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (size) => {
    return size || "Unknown";
  };

  useEffect(() => {
    fetchUpdateHistory();
  }, [fetchUpdateHistory]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Active Installation Banner */}
      {showActiveInstallationBanner()}

      {/* Header with Actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">
          <UpdateIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          System Updates
          {availableUpdates.length > 0 && (
            <Badge
              badgeContent={availableUpdates.length}
              color="error"
              sx={{ ml: 2 }}
            >
              <Chip label="Updates Available" color="warning" size="small" />
            </Badge>
          )}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoCheck}
                onChange={(e) => setAutoCheck(e.target.checked)}
                size="small"
              />
            }
            label="Auto-check"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={checkForUpdates}
            disabled={loading}
          >
            Check Now
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setShowHistory(!showHistory)}
          >
            History
          </Button>
        </Box>
      </Box>

      {/* Last Check Info */}
      {lastCheck && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Last checked: {formatDate(lastCheck)}
          {systemInfo && (
            <span style={{ marginLeft: 16 }}>
              OS: {systemInfo.os} | Kernel: {systemInfo.kernel}
            </span>
          )}
        </Alert>
      )}

      {/* Available Updates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">
              Available Updates ({availableUpdates.length})
            </Typography>

            {availableUpdates.length > 0 && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  onClick={() =>
                    handleSelectAll(
                      selectedUpdates.length !== availableUpdates.length
                    )
                  }
                >
                  {selectedUpdates.length === availableUpdates.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  size="small"
                  color="warning"
                  onClick={handleSelectSecurityOnly}
                >
                  Security Only
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  disabled={selectedUpdates.length === 0}
                  onClick={() => setInstallDialog(true)}
                >
                  Install Selected ({selectedUpdates.length})
                </Button>
              </Box>
            )}
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {installing && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LinearProgress sx={{ flex: 1 }} />
                <Typography variant="body2">Installing updates...</Typography>
              </Box>
            </Alert>
          )}

          {availableUpdates.length === 0 && !loading ? (
            <Alert severity="success">
              <CheckCircleIcon sx={{ mr: 1 }} />
              System is up to date! No updates available.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={
                          selectedUpdates.length === availableUpdates.length
                        }
                        indeterminate={
                          selectedUpdates.length > 0 &&
                          selectedUpdates.length < availableUpdates.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>Package</TableCell>
                    <TableCell>Current Version</TableCell>
                    <TableCell>Available Version</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableUpdates.map((update) => (
                    <TableRow key={update.name}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUpdates.includes(update.name)}
                          onChange={(e) =>
                            handleUpdateSelection(update.name, e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {getSeverityIcon(update)}
                          <Typography variant="body2" fontWeight="medium">
                            {update.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {update.currentVersion}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {update.availableVersion}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={update.security ? "Security" : "Regular"}
                          color={getSeverityColor(update)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatSize(update.size)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Install this update">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedUpdates([update.name]);
                              setInstallDialog(true);
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Update History */}
      {showHistory && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Update History
            </Typography>

            <List>
              {updateHistory.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No update history available" />
                </ListItem>
              ) : (
                updateHistory.slice(0, 10).map((item, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${item.package} updated to ${item.version}`}
                      secondary={`${formatDate(item.date)} - ${item.status}`}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Install Confirmation Dialog */}
      <Dialog
        open={installDialog}
        onClose={() => setInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Update Installation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to install {selectedUpdates.length} update(s):
          </Typography>
          <List dense>
            {selectedUpdates.map((packageName) => {
              const update = availableUpdates.find(
                (u) => u.name === packageName
              );
              return (
                <ListItem key={packageName}>
                  <ListItemIcon>
                    {update?.security ? (
                      <SecurityIcon color="error" />
                    ) : (
                      <InfoIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={packageName}
                    secondary={`${update?.currentVersion} → ${update?.availableVersion}`}
                  />
                </ListItem>
              );
            })}
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This process may take several minutes and might restart some
            services.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={installUpdates}
            disabled={installing}
          >
            Install Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Persistent Installation Terminal */}
      <PersistentInstallationTerminal
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        packages={packagesToInstall}
        onComplete={handleInstallationComplete}
        existingJobId={currentInstallation?.id}
      />
    </Box>
  );
};

export default SystemUpdates;

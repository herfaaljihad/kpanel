import {
  Add as AddIcon,
  Backup as BackupIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PlayArrow as PlayIcon,
  Restore as RestoreIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
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
import { useAuth } from "../../hooks/useAuth";
import api from "../../utils/api";

const BackupManagement = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [backups, setBackups] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);

  // Form states
  const [newBackup, setNewBackup] = useState({
    name: "",
    type: "full",
    description: "",
    compression: "gzip",
    encryption: false,
    destinations: ["local"],
  });

  const [newSchedule, setNewSchedule] = useState({
    name: "",
    type: "full",
    frequency: "daily",
    time: "02:00",
    retention: 30,
    enabled: true,
  });

  const [backupSettings, setBackupSettings] = useState({
    maxBackups: 10,
    compressionLevel: 6,
    encryptionEnabled: false,
    cloudStorage: false,
    cloudProvider: "aws",
    localPath: "/backups",
    notifications: true,
  });

  const [restoreOptions, setRestoreOptions] = useState({
    backupId: "",
    restoreType: "full",
    destination: "current",
    overwriteFiles: false,
  });

  useEffect(() => {
    fetchBackups();
    fetchSchedules();
    fetchBackupSettings();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get("/system-advanced/backups");
      if (response.data.success) {
        setBackups(response.data.data);
      }
    } catch (error) {
      setError("Failed to fetch backups");
      console.error("Backup fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await api.get("/system-advanced/backups/schedule");
      if (response.data.success) {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error("Schedule fetch error:", error);
    }
  };

  const fetchBackupSettings = async () => {
    try {
      const response = await api.get("/system-advanced/backups/settings");
      if (response.data.success) {
        setBackupSettings(response.data.data);
      }
    } catch (error) {
      console.error("Settings fetch error:", error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      setBackupProgress(0);

      const response = await api.post(
        "/system-advanced/backups/create",
        newBackup
      );

      if (response.data.success) {
        setSuccess("Backup started successfully");
        setOpenCreateDialog(false);
        // Simulate progress
        const progressInterval = setInterval(() => {
          setBackupProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              fetchBackups();
              return 100;
            }
            return prev + 10;
          });
        }, 1000);

        setNewBackup({
          name: "",
          type: "full",
          description: "",
          compression: "gzip",
          encryption: false,
          destinations: ["local"],
        });
      }
    } catch (error) {
      setError("Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const response = await api.post(
        "/system-advanced/backups/schedule",
        newSchedule
      );

      if (response.data.success) {
        setSuccess("Backup schedule created successfully");
        setOpenScheduleDialog(false);
        fetchSchedules();
        setNewSchedule({
          name: "",
          type: "full",
          frequency: "daily",
          time: "02:00",
          retention: 30,
          enabled: true,
        });
      }
    } catch (error) {
      setError("Failed to create schedule");
    }
  };

  const handleRestoreBackup = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/system-advanced/backups/${restoreOptions.backupId}/restore`,
        restoreOptions
      );

      if (response.data.success) {
        setSuccess("Backup restoration started");
        setOpenRestoreDialog(false);
      }
    } catch (error) {
      setError("Failed to start restoration");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (window.confirm("Are you sure you want to delete this backup?")) {
      try {
        await api.delete(`/system-advanced/backups/${backupId}`);
        setSuccess("Backup deleted successfully");
        fetchBackups();
      } catch (error) {
        setError("Failed to delete backup");
      }
    }
  };

  const handleDownloadBackup = async (backupId) => {
    try {
      const response = await api.get(
        `/system-advanced/backups/${backupId}/download`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `backup-${backupId}.tar.gz`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError("Failed to download backup");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { color: "success", icon: <CheckIcon /> },
      running: { color: "info", icon: <PlayIcon /> },
      failed: { color: "error", icon: <ErrorIcon /> },
      queued: { color: "warning", icon: <WarningIcon /> },
    };

    const config = statusConfig[status] || {
      color: "default",
      icon: <InfoIcon />,
    };

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const renderBackupList = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Backup Files</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          CREATE BACKUP
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {backupProgress > 0 && backupProgress < 100 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Backup in Progress
            </Typography>
            <LinearProgress variant="determinate" value={backupProgress} />
            <Typography variant="body2" color="text.secondary" mt={1}>
              {backupProgress}% completed
            </Typography>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" color="text.secondary">
                    No backups found. Create your first backup to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <BackupIcon sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {backup.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {backup.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={backup.type} size="small" />
                  </TableCell>
                  <TableCell>{formatFileSize(backup.size)}</TableCell>
                  <TableCell>
                    {new Date(backup.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusChip(backup.status)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadBackup(backup.id)}
                      title="Download"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setRestoreOptions({
                          ...restoreOptions,
                          backupId: backup.id,
                        });
                        setOpenRestoreDialog(true);
                      }}
                      title="Restore"
                    >
                      <RestoreIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteBackup(backup.id)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSchedules = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Backup Schedules</Typography>
        <Button
          variant="contained"
          startIcon={<ScheduleIcon />}
          onClick={() => setOpenScheduleDialog(true)}
        >
          CREATE SCHEDULE
        </Button>
      </Box>

      <Grid container spacing={2}>
        {schedules.map((schedule) => (
          <Grid item xs={12} md={6} key={schedule.id}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">{schedule.name}</Typography>
                  <Switch
                    checked={schedule.enabled}
                    onChange={(e) => {
                      // Handle enable/disable schedule
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Type: {schedule.type} | Frequency: {schedule.frequency}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Time: {schedule.time} | Retention: {schedule.retention} days
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Next run: {schedule.next_run}
                </Typography>
                <Box mt={2}>
                  <IconButton size="small" title="Edit">
                    <SettingsIcon />
                  </IconButton>
                  <IconButton size="small" title="Delete" color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderHistory = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Backup History
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell>
                  {new Date(backup.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{backup.type}</TableCell>
                <TableCell>{getStatusChip(backup.status)}</TableCell>
                <TableCell>{backup.duration || "N/A"}</TableCell>
                <TableCell>{formatFileSize(backup.size)}</TableCell>
                <TableCell>
                  <IconButton size="small">
                    <InfoIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Backup Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Maximum Backups"
                  type="number"
                  value={backupSettings.maxBackups}
                  onChange={(e) =>
                    setBackupSettings({
                      ...backupSettings,
                      maxBackups: parseInt(e.target.value),
                    })
                  }
                />
              </Box>
              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Local Backup Path"
                  value={backupSettings.localPath}
                  onChange={(e) =>
                    setBackupSettings({
                      ...backupSettings,
                      localPath: e.target.value,
                    })
                  }
                />
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={backupSettings.encryptionEnabled}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        encryptionEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label="Enable Encryption"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={backupSettings.notifications}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        notifications: e.target.checked,
                      })
                    }
                  />
                }
                label="Email Notifications"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cloud Storage
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={backupSettings.cloudStorage}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        cloudStorage: e.target.checked,
                      })
                    }
                  />
                }
                label="Enable Cloud Backup"
              />
              {backupSettings.cloudStorage && (
                <Box mt={2}>
                  <FormControl fullWidth>
                    <InputLabel>Cloud Provider</InputLabel>
                    <Select
                      value={backupSettings.cloudProvider}
                      onChange={(e) =>
                        setBackupSettings({
                          ...backupSettings,
                          cloudProvider: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="aws">Amazon S3</MenuItem>
                      <MenuItem value="google">Google Cloud</MenuItem>
                      <MenuItem value="azure">Azure Storage</MenuItem>
                      <MenuItem value="dropbox">Dropbox</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box mt={3}>
        <Button variant="contained" onClick={() => setOpenSettingsDialog(true)}>
          Save Settings
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <BackupIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Backup Management
      </Typography>

      <Paper sx={{ width: "100%", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Backups" />
          <Tab label="Schedules" />
          <Tab label="History" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && renderBackupList()}
      {activeTab === 1 && renderSchedules()}
      {activeTab === 2 && renderHistory()}
      {activeTab === 3 && renderSettings()}

      {/* Create Backup Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Backup</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              fullWidth
              label="Backup Name"
              value={newBackup.name}
              onChange={(e) =>
                setNewBackup({ ...newBackup, name: e.target.value })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Backup Type</InputLabel>
              <Select
                value={newBackup.type}
                onChange={(e) =>
                  setNewBackup({ ...newBackup, type: e.target.value })
                }
              >
                <MenuItem value="full">Full Backup</MenuItem>
                <MenuItem value="incremental">Incremental</MenuItem>
                <MenuItem value="database">Database Only</MenuItem>
                <MenuItem value="files">Files Only</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newBackup.description}
              onChange={(e) =>
                setNewBackup({ ...newBackup, description: e.target.value })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Compression</InputLabel>
              <Select
                value={newBackup.compression}
                onChange={(e) =>
                  setNewBackup({ ...newBackup, compression: e.target.value })
                }
              >
                <MenuItem value="none">No Compression</MenuItem>
                <MenuItem value="gzip">GZip</MenuItem>
                <MenuItem value="bzip2">BZip2</MenuItem>
                <MenuItem value="lzma">LZMA</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={newBackup.encryption}
                  onChange={(e) =>
                    setNewBackup({ ...newBackup, encryption: e.target.checked })
                  }
                />
              }
              label="Enable Encryption"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateBackup}
            disabled={!newBackup.name || loading}
          >
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Schedule Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Backup Schedule</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              fullWidth
              label="Schedule Name"
              value={newSchedule.name}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, name: e.target.value })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Backup Type</InputLabel>
              <Select
                value={newSchedule.type}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, type: e.target.value })
                }
              >
                <MenuItem value="full">Full Backup</MenuItem>
                <MenuItem value="incremental">Incremental</MenuItem>
                <MenuItem value="database">Database Only</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Frequency</InputLabel>
              <Select
                value={newSchedule.frequency}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, frequency: e.target.value })
                }
              >
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Backup Time"
              type="time"
              value={newSchedule.time}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, time: e.target.value })
              }
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Retention (days)"
              type="number"
              value={newSchedule.retention}
              onChange={(e) =>
                setNewSchedule({
                  ...newSchedule,
                  retention: parseInt(e.target.value),
                })
              }
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSchedule}
            disabled={!newSchedule.name}
          >
            Create Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={openRestoreDialog}
        onClose={() => setOpenRestoreDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will restore the selected backup. Current data may be
            overwritten.
          </Alert>
          <FormControl fullWidth margin="normal">
            <InputLabel>Restore Type</InputLabel>
            <Select
              value={restoreOptions.restoreType}
              onChange={(e) =>
                setRestoreOptions({
                  ...restoreOptions,
                  restoreType: e.target.value,
                })
              }
            >
              <MenuItem value="full">Full Restore</MenuItem>
              <MenuItem value="selective">Selective Restore</MenuItem>
              <MenuItem value="database">Database Only</MenuItem>
              <MenuItem value="files">Files Only</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={restoreOptions.overwriteFiles}
                onChange={(e) =>
                  setRestoreOptions({
                    ...restoreOptions,
                    overwriteFiles: e.target.checked,
                  })
                }
              />
            }
            label="Overwrite existing files"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRestoreDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestoreBackup}
            disabled={loading}
          >
            Start Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManagement;

import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  PlayArrow as RunIcon,
  Schedule as ScheduleIcon,
  Timeline as StatsIcon,
  Assignment as TemplateIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
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
import api from "../../utils/api";

const CronJobsManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dialog states
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuJob, setMenuJob] = useState(null);

  // Form states
  const [jobForm, setJobForm] = useState({
    name: "",
    command: "",
    schedule: "",
    email_output: false,
    email_errors: true,
    timeout: "3600",
    description: "",
  });

  const cronPresets = [
    { value: "* * * * *", label: "Every minute" },
    { value: "*/5 * * * *", label: "Every 5 minutes" },
    { value: "*/15 * * * *", label: "Every 15 minutes" },
    { value: "*/30 * * * *", label: "Every 30 minutes" },
    { value: "0 * * * *", label: "Every hour" },
    { value: "0 */2 * * *", label: "Every 2 hours" },
    { value: "0 */6 * * *", label: "Every 6 hours" },
    { value: "0 */12 * * *", label: "Every 12 hours" },
    { value: "0 0 * * *", label: "Daily at midnight" },
    { value: "0 2 * * *", label: "Daily at 2:00 AM" },
    { value: "0 0 * * 0", label: "Weekly (Sunday)" },
    { value: "0 0 1 * *", label: "Monthly (1st day)" },
  ];

  const timeoutOptions = [
    { value: "60", label: "1 minute" },
    { value: "300", label: "5 minutes" },
    { value: "600", label: "10 minutes" },
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "7200", label: "2 hours" },
    { value: "14400", label: "4 hours" },
    { value: "28800", label: "8 hours" },
  ];

  useEffect(() => {
    fetchJobs();
    fetchTemplates();
    fetchStatistics();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get("/cron/jobs");
      setJobs(response.data.jobs || []);
    } catch (error) {
      setError("Failed to fetch cron jobs");
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/cron/templates");
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/cron/statistics");
      setStatistics(response.data.stats || {});
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchJobLogs = async (jobId) => {
    try {
      const response = await api.get(`/cron/jobs/${jobId}/logs`);
      setLogs(response.data.logs || []);
    } catch (error) {
      setError("Failed to fetch job logs");
    }
  };

  const handleCreateJob = async () => {
    try {
      await api.post("/cron/jobs", jobForm);
      setSuccess("Cron job created successfully");
      setOpenJobDialog(false);
      resetJobForm();
      fetchJobs();
      fetchStatistics();
    } catch (error) {
      setError("Failed to create cron job");
    }
  };

  const handleUpdateJob = async () => {
    try {
      await api.put(`/cron/jobs/${editingJob.id}`, jobForm);
      setSuccess("Cron job updated successfully");
      setOpenJobDialog(false);
      resetJobForm();
      fetchJobs();
    } catch (error) {
      setError("Failed to update cron job");
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Are you sure you want to delete this cron job?")) {
      try {
        await api.delete(`/cron/jobs/${jobId}`);
        setSuccess("Cron job deleted successfully");
        fetchJobs();
        fetchStatistics();
      } catch (error) {
        setError("Failed to delete cron job");
      }
    }
    setAnchorEl(null);
  };

  const handleToggleJob = async (jobId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      await api.post(`/cron/jobs/${jobId}/toggle`, { status: newStatus });
      setSuccess(
        `Cron job ${newStatus === "active" ? "enabled" : "paused"} successfully`
      );
      fetchJobs();
    } catch (error) {
      setError("Failed to toggle cron job");
    }
    setAnchorEl(null);
  };

  const handleRunJob = async (jobId) => {
    try {
      await api.post(`/cron/jobs/${jobId}/run`);
      setSuccess("Cron job executed manually");
      fetchJobs();
    } catch (error) {
      setError("Failed to run cron job");
    }
    setAnchorEl(null);
  };

  const handleViewLogs = (job) => {
    setSelectedJob(job);
    fetchJobLogs(job.id);
    setOpenLogsDialog(true);
    setAnchorEl(null);
  };

  const handleApplyTemplate = (template) => {
    setJobForm({
      name: template.name,
      command: template.command,
      schedule: template.schedule,
      email_output: template.email_output,
      email_errors: template.email_errors,
      timeout: template.timeout.toString(),
      description: template.description,
    });
    setOpenTemplateDialog(false);
    setOpenJobDialog(true);
  };

  const resetJobForm = () => {
    setJobForm({
      name: "",
      command: "",
      schedule: "",
      email_output: false,
      email_errors: true,
      timeout: "3600",
      description: "",
    });
    setEditingJob(null);
  };

  const openJobFormDialog = (job = null) => {
    if (job) {
      setEditingJob(job);
      setJobForm({
        name: job.name,
        command: job.command,
        schedule: job.schedule,
        email_output: job.email_output,
        email_errors: job.email_errors,
        timeout: job.timeout.toString(),
        description: job.description || "",
      });
    } else {
      resetJobForm();
    }
    setOpenJobDialog(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "paused":
        return <PauseIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case "success":
        return <CheckCircleIcon color="success" />;
      case "error":
        return <ErrorIcon color="error" />;
      case "stopped":
        return <PauseIcon color="warning" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor(
      (seconds % 3600) / 60
    )}m`;
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <ScheduleIcon />
        Cron Jobs Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Cron Jobs" icon={<ScheduleIcon />} />
          <Tab label="Statistics" icon={<StatsIcon />} />
          <Tab label="Templates" icon={<TemplateIcon />} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6">Cron Jobs</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<TemplateIcon />}
                  onClick={() => setOpenTemplateDialog(true)}
                >
                  Templates
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchJobs}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openJobFormDialog()}
                >
                  Add Cron Job
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Command</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Run</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Success Rate</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {job.name}
                          </Typography>
                          {job.description && (
                            <Typography variant="body2" color="text.secondary">
                              {job.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {job.schedule_display}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {job.schedule}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {job.command}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {getStatusIcon(job.status)}
                          <Chip
                            label={job.status}
                            size="small"
                            color={
                              job.status === "active" ? "success" : "warning"
                            }
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {job.last_run ? (
                          <Box>
                            <Typography variant="body2">
                              {new Date(job.last_run).toLocaleString()}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {getResultIcon(job.last_result)}
                              <Typography variant="caption">
                                {job.last_result}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Never run
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.next_run ? (
                          <Typography variant="body2">
                            {new Date(job.next_run).toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Paused
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {job.run_count > 0
                              ? `${Math.round(
                                  (job.success_count / job.run_count) * 100
                                )}%`
                              : "N/A"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {job.success_count}/{job.run_count}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setMenuJob(job);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cron Jobs Statistics
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Jobs
                    </Typography>
                    <Typography variant="h4">
                      {statistics.total_jobs || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Active Jobs
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statistics.active_jobs || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Success Rate
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statistics.success_rate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Failed Executions
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {statistics.failed_executions || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <Typography variant="subtitle2">Next Execution</Typography>
                    <Typography variant="body2">
                      {statistics.next_execution
                        ? new Date(statistics.next_execution).toLocaleString()
                        : "No scheduled jobs"}
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="success">
                    <Typography variant="subtitle2">
                      Most Frequent Job
                    </Typography>
                    <Typography variant="body2">
                      {statistics.most_frequent || "N/A"}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cron Job Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Pre-configured cron job templates for common tasks
            </Typography>

            {templates.map((template) => (
              <Accordion key={template.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{template.name}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        {template.description}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Command:</Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          bgcolor: "grey.100",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {template.command}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Schedule:</Typography>
                      <Typography variant="body2">
                        {template.schedule} -{" "}
                        {cronPresets.find((p) => p.value === template.schedule)
                          ?.label || "Custom schedule"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                          label={`Timeout: ${formatDuration(template.timeout)}`}
                          size="small"
                          variant="outlined"
                        />
                        {template.email_output && (
                          <Chip
                            label="Email Output"
                            size="small"
                            color="primary"
                          />
                        )}
                        {template.email_errors && (
                          <Chip
                            label="Email Errors"
                            size="small"
                            color="warning"
                          />
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        Use This Template
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </TabPanel>
      </Paper>

      {/* Job Form Dialog */}
      <Dialog
        open={openJobDialog}
        onClose={() => setOpenJobDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingJob ? "Edit Cron Job" : "Add Cron Job"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Name"
                value={jobForm.name}
                onChange={(e) =>
                  setJobForm({ ...jobForm, name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Command"
                value={jobForm.command}
                onChange={(e) =>
                  setJobForm({ ...jobForm, command: e.target.value })
                }
                required
                helperText="Full path to script or command to execute"
                sx={{ fontFamily: "monospace" }}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>Schedule Preset</InputLabel>
                <Select
                  value={jobForm.schedule}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, schedule: e.target.value })
                  }
                  label="Schedule Preset"
                >
                  {cronPresets.map((preset) => (
                    <MenuItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Custom Cron"
                value={jobForm.schedule}
                onChange={(e) =>
                  setJobForm({ ...jobForm, schedule: e.target.value })
                }
                helperText="min hour day month weekday"
                sx={{ fontFamily: "monospace" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Timeout</InputLabel>
                <Select
                  value={jobForm.timeout}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, timeout: e.target.value })
                  }
                  label="Timeout"
                >
                  {timeoutOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ pt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={jobForm.email_output}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,
                          email_output: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Email Output"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={jobForm.email_errors}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,
                          email_errors: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Email Errors"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={jobForm.description}
                onChange={(e) =>
                  setJobForm({ ...jobForm, description: e.target.value })
                }
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJobDialog(false)}>Cancel</Button>
          <Button
            onClick={editingJob ? handleUpdateJob : handleCreateJob}
            variant="contained"
          >
            {editingJob ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog
        open={openTemplateDialog}
        onClose={() => setOpenTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Template</DialogTitle>
        <DialogContent>
          {templates.map((template) => (
            <Button
              key={template.id}
              fullWidth
              variant="outlined"
              sx={{ mt: 1, justifyContent: "flex-start", textAlign: "left" }}
              onClick={() => handleApplyTemplate(template)}
            >
              <Box>
                <Typography variant="subtitle1">{template.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </Box>
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTemplateDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog
        open={openLogsDialog}
        onClose={() => setOpenLogsDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Execution Logs - {selectedJob?.name}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Executed At</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Exit Code</TableCell>
                  <TableCell>Output</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.executed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{formatDuration(log.duration)}</TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {getResultIcon(log.status)}
                        <Chip
                          label={log.status}
                          size="small"
                          color={log.status === "success" ? "success" : "error"}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{log.exit_code}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.output}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            openJobFormDialog(menuJob);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleToggleJob(menuJob?.id, menuJob?.status)}>
          <ListItemIcon>
            {menuJob?.status === "active" ? <PauseIcon /> : <RunIcon />}
          </ListItemIcon>
          <ListItemText>
            {menuJob?.status === "active" ? "Pause" : "Enable"}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleRunJob(menuJob?.id)}>
          <ListItemIcon>
            <RunIcon />
          </ListItemIcon>
          <ListItemText>Run Now</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewLogs(menuJob)}>
          <ListItemIcon>
            <HistoryIcon />
          </ListItemIcon>
          <ListItemText>View Logs</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDeleteJob(menuJob?.id)}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CronJobsManagement;

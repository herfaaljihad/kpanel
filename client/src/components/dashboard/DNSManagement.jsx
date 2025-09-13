import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Dns as DnsIcon,
  Domain as DomainIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
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

const DNSManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [records, setRecords] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dialog states
  const [openRecordDialog, setOpenRecordDialog] = useState(false);
  const [openZoneDialog, setOpenZoneDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingZone, setEditingZone] = useState(null);

  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuRecord, setMenuRecord] = useState(null);

  // Form states
  const [recordForm, setRecordForm] = useState({
    name: "",
    type: "A",
    value: "",
    ttl: "3600",
    priority: "",
    weight: "",
    port: "",
    comment: "",
  });

  const [zoneForm, setZoneForm] = useState({
    domain: "",
  });

  const recordTypes = [
    "A",
    "AAAA",
    "CNAME",
    "MX",
    "TXT",
    "NS",
    "SRV",
    "PTR",
    "SOA",
  ];
  const ttlOptions = [
    { value: "300", label: "5 minutes" },
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "7200", label: "2 hours" },
    { value: "14400", label: "4 hours" },
    { value: "28800", label: "8 hours" },
    { value: "43200", label: "12 hours" },
    { value: "86400", label: "1 day" },
    { value: "172800", label: "2 days" },
    { value: "604800", label: "1 week" },
  ];

  useEffect(() => {
    fetchZones();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedZone) {
      fetchRecords(selectedZone.domain);
    }
  }, [selectedZone]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await api.get("/dns/zones");
      setZones(response.data.zones || []);
      if (
        response.data.zones &&
        response.data.zones.length > 0 &&
        !selectedZone
      ) {
        setSelectedZone(response.data.zones[0]);
      }
    } catch (error) {
      setError("Failed to fetch DNS zones");
      console.error("Error fetching zones:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (domain) => {
    setLoading(true);
    try {
      const response = await api.get(`/dns/records/${domain}`);
      setRecords(response.data.records || []);
    } catch (error) {
      setError("Failed to fetch DNS records");
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/dns/templates");
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleCreateRecord = async () => {
    try {
      await api.post("/dns/records", {
        zone_id: selectedZone?.id,
        ...recordForm,
      });
      setSuccess("DNS record created successfully");
      setOpenRecordDialog(false);
      resetRecordForm();
      fetchRecords(selectedZone.domain);
    } catch (error) {
      setError("Failed to create DNS record");
    }
  };

  const handleUpdateRecord = async () => {
    try {
      await api.put(`/dns/records/${editingRecord.id}`, recordForm);
      setSuccess("DNS record updated successfully");
      setOpenRecordDialog(false);
      resetRecordForm();
      fetchRecords(selectedZone.domain);
    } catch (error) {
      setError("Failed to update DNS record");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm("Are you sure you want to delete this DNS record?")) {
      try {
        await api.delete(`/dns/records/${recordId}`);
        setSuccess("DNS record deleted successfully");
        fetchRecords(selectedZone.domain);
      } catch (error) {
        setError("Failed to delete DNS record");
      }
    }
    setAnchorEl(null);
  };

  const handleCreateZone = async () => {
    try {
      await api.post("/dns/zones", zoneForm);
      setSuccess("DNS zone created successfully");
      setOpenZoneDialog(false);
      setZoneForm({ domain: "" });
      fetchZones();
    } catch (error) {
      setError("Failed to create DNS zone");
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this DNS zone? This will remove all DNS records."
      )
    ) {
      try {
        await api.delete(`/dns/zones/${zoneId}`);
        setSuccess("DNS zone deleted successfully");
        fetchZones();
        if (selectedZone?.id === zoneId) {
          setSelectedZone(null);
          setRecords([]);
        }
      } catch (error) {
        setError("Failed to delete DNS zone");
      }
    }
  };

  const handleToggleDNSSEC = async (zoneId, currentStatus) => {
    try {
      await api.post(`/dns/zones/${zoneId}/dnssec`, { enable: !currentStatus });
      setSuccess(
        `DNSSEC ${!currentStatus ? "enabled" : "disabled"} successfully`
      );
      fetchZones();
    } catch (error) {
      setError("Failed to toggle DNSSEC");
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (!selectedZone) return;

    try {
      await api.post(`/dns/zones/${selectedZone.id}/apply-template`, {
        template_id: templateId,
      });
      setSuccess("DNS template applied successfully");
      setOpenTemplateDialog(false);
      fetchRecords(selectedZone.domain);
    } catch (error) {
      setError("Failed to apply DNS template");
    }
  };

  const resetRecordForm = () => {
    setRecordForm({
      name: "",
      type: "A",
      value: "",
      ttl: "3600",
      priority: "",
      weight: "",
      port: "",
      comment: "",
    });
    setEditingRecord(null);
  };

  const openRecordFormDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setRecordForm({
        name: record.name,
        type: record.type,
        value: record.value,
        ttl: record.ttl.toString(),
        priority: record.priority?.toString() || "",
        weight: record.weight?.toString() || "",
        port: record.port?.toString() || "",
        comment: record.comment || "",
      });
    } else {
      resetRecordForm();
    }
    setOpenRecordDialog(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "pending":
        return <WarningIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const formatTTL = (ttl) => {
    const option = ttlOptions.find((opt) => opt.value === ttl.toString());
    return option ? option.label : `${ttl}s`;
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
        <DnsIcon />
        DNS Management
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
          <Tab label="DNS Zones" icon={<DomainIcon />} />
          <Tab label="DNS Records" icon={<DnsIcon />} />
          <Tab label="Templates" icon={<TemplateIcon />} />
          <Tab label="Settings" icon={<SecurityIcon />} />
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
              <Typography variant="h6">DNS Zones</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchZones}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenZoneDialog(true)}
                >
                  Create Zone
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {zones.map((zone) => (
                <Grid item xs={12} md={6} lg={4} key={zone.id}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      border: selectedZone?.id === zone.id ? 2 : 1,
                      borderColor:
                        selectedZone?.id === zone.id
                          ? "primary.main"
                          : "divider",
                    }}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6" component="div">
                          {zone.domain}
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {getStatusIcon(zone.status)}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteZone(zone.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                        <Chip
                          label={zone.status}
                          size="small"
                          color={
                            zone.status === "active" ? "success" : "warning"
                          }
                        />
                        <Chip
                          label={`${zone.records_count} records`}
                          size="small"
                          variant="outlined"
                        />
                        {zone.dnssec_enabled && (
                          <Chip label="DNSSEC" size="small" color="primary" />
                        )}
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Nameservers: {zone.nameservers.join(", ")}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Last modified:{" "}
                        {new Date(zone.last_modified).toLocaleString()}
                      </Typography>

                      <Box sx={{ mt: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={zone.dnssec_enabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleDNSSEC(
                                  zone.id,
                                  zone.dnssec_enabled
                                );
                              }}
                              size="small"
                            />
                          }
                          label="DNSSEC"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6">
                DNS Records {selectedZone && `for ${selectedZone.domain}`}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<TemplateIcon />}
                  onClick={() => setOpenTemplateDialog(true)}
                  disabled={!selectedZone}
                >
                  Apply Template
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() =>
                    selectedZone && fetchRecords(selectedZone.domain)
                  }
                  disabled={loading || !selectedZone}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openRecordFormDialog()}
                  disabled={!selectedZone}
                >
                  Add Record
                </Button>
              </Box>
            </Box>

            {!selectedZone ? (
              <Alert severity="info">
                Please select a DNS zone to view its records
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>TTL</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Comment</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {record.name === "@"
                            ? selectedZone.domain
                            : `${record.name}.${selectedZone.domain}`}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.type}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ maxWidth: 300, wordBreak: "break-all" }}
                        >
                          {record.value}
                        </TableCell>
                        <TableCell>{formatTTL(record.ttl)}</TableCell>
                        <TableCell>{record.priority || "-"}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {getStatusIcon(record.status)}
                            <Typography variant="body2" color="text.secondary">
                              {record.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{record.comment || "-"}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setMenuRecord(record);
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
            )}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              DNS Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Pre-configured DNS record templates for common hosting scenarios
            </Typography>

            {templates.map((template) => (
              <Accordion key={template.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{template.name}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {template.description}
                  </Typography>

                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>TTL</TableCell>
                          <TableCell>Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {template.records.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={record.type}
                                size="small"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>{record.value}</TableCell>
                            <TableCell>{formatTTL(record.ttl)}</TableCell>
                            <TableCell>{record.priority || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box
                    sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={!selectedZone}
                    >
                      Apply to {selectedZone?.domain || "Selected Zone"}
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              DNS Settings
            </Typography>
            <Alert severity="info">
              Advanced DNS settings and configuration options will be available
              in this section.
            </Alert>
          </Box>
        </TabPanel>
      </Paper>

      {/* Record Form Dialog */}
      <Dialog
        open={openRecordDialog}
        onClose={() => setOpenRecordDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRecord ? "Edit DNS Record" : "Add DNS Record"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={recordForm.name}
                onChange={(e) =>
                  setRecordForm({ ...recordForm, name: e.target.value })
                }
                helperText="Use @ for root domain or subdomain name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={recordForm.type}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, type: e.target.value })
                  }
                  label="Type"
                >
                  {recordTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Value"
                value={recordForm.value}
                onChange={(e) =>
                  setRecordForm({ ...recordForm, value: e.target.value })
                }
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>TTL</InputLabel>
                <Select
                  value={recordForm.ttl}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, ttl: e.target.value })
                  }
                  label="TTL"
                >
                  {ttlOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {(recordForm.type === "MX" || recordForm.type === "SRV") && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Priority"
                  type="number"
                  value={recordForm.priority}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, priority: e.target.value })
                  }
                />
              </Grid>
            )}
            {recordForm.type === "SRV" && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Weight"
                    type="number"
                    value={recordForm.weight}
                    onChange={(e) =>
                      setRecordForm({ ...recordForm, weight: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Port"
                    type="number"
                    value={recordForm.port}
                    onChange={(e) =>
                      setRecordForm({ ...recordForm, port: e.target.value })
                    }
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Comment"
                value={recordForm.comment}
                onChange={(e) =>
                  setRecordForm({ ...recordForm, comment: e.target.value })
                }
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecordDialog(false)}>Cancel</Button>
          <Button
            onClick={editingRecord ? handleUpdateRecord : handleCreateRecord}
            variant="contained"
          >
            {editingRecord ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Zone Form Dialog */}
      <Dialog
        open={openZoneDialog}
        onClose={() => setOpenZoneDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create DNS Zone</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Domain"
            value={zoneForm.domain}
            onChange={(e) =>
              setZoneForm({ ...zoneForm, domain: e.target.value })
            }
            placeholder="example.com"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenZoneDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateZone} variant="contained">
            Create Zone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog
        open={openTemplateDialog}
        onClose={() => setOpenTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Apply DNS Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select a template to apply to {selectedZone?.domain}
          </Typography>
          {templates.map((template) => (
            <Button
              key={template.id}
              fullWidth
              variant="outlined"
              sx={{ mt: 1, justifyContent: "flex-start" }}
              onClick={() => handleApplyTemplate(template.id)}
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

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            openRecordFormDialog(menuRecord);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDeleteRecord(menuRecord?.id)}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DNSManagement;

import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Security as CertIcon,
  CheckCircle as CheckIcon,
  Description as CSRIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Sync as RenewIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Lock as SSLIcon,
  Assessment as StatsIcon,
  PlayCircle as TestIcon,
  Verified as VerifiedIcon,
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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const SSLManagement = () => {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [configuration, setConfiguration] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openCSRDialog, setOpenCSRDialog] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const [newCertificate, setNewCertificate] = useState({
    domain_name: "",
    type: "lets_encrypt",
    domains: [],
    auto_renew: true,
    wildcard: false,
    validation_method: "http-01",
    force_https: true,
    hsts_enabled: true,
    certificate_data: "",
    private_key_data: "",
    certificate_chain_data: "",
  });

  const [csrData, setCSRData] = useState({
    common_name: "",
    organization: "",
    organizational_unit: "",
    locality: "",
    state: "",
    country: "",
    san_domains: [],
    key_size: 2048,
  });

  const certificateTypes = [
    {
      value: "lets_encrypt",
      label: "Let's Encrypt (Free)",
      description: "Automated free SSL certificates",
    },
    {
      value: "self_signed",
      label: "Self-Signed",
      description: "Development/testing only",
    },
    {
      value: "custom",
      label: "Custom Certificate",
      description: "Upload your own certificate",
    },
  ];

  const validationMethods = [
    {
      value: "http-01",
      label: "HTTP Validation",
      description: "File-based validation",
    },
    {
      value: "dns-01",
      label: "DNS Validation",
      description: "DNS TXT record validation",
    },
  ];

  useEffect(() => {
    fetchSSLData();
  }, []);

  const fetchSSLData = async () => {
    try {
      setLoading(true);
      const [certsRes, statsRes, configRes] = await Promise.all([
        fetch("/api/ssl/certificates", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/ssl/statistics", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/ssl/config", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [certsData, statsData, configData] = await Promise.all([
        certsRes.json(),
        statsRes.json(),
        configRes.json(),
      ]);

      if (certsData.success) setCertificates(certsData.data.certificates);
      if (statsData.success) setStatistics(statsData.data);
      if (configData.success) setConfiguration(configData.data);
    } catch (error) {
      setError("Failed to fetch SSL data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ssl/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCertificate),
      });

      const data = await response.json();
      if (data.success) {
        setOpenDialog(false);
        setActiveStep(0);
        setNewCertificate({
          domain_name: "",
          type: "lets_encrypt",
          domains: [],
          auto_renew: true,
          wildcard: false,
          validation_method: "http-01",
          force_https: true,
          hsts_enabled: true,
          certificate_data: "",
          private_key_data: "",
          certificate_chain_data: "",
        });
        setSuccess("SSL certificate requested successfully");
        fetchSSLData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to create SSL certificate");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewCertificate = async (certId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ssl/certificates/${certId}/renew`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("SSL certificate renewal initiated");
        fetchSSLData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to renew SSL certificate");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertificate = async (certId) => {
    if (
      !window.confirm("Are you sure you want to delete this SSL certificate?")
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/ssl/certificates/${certId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("SSL certificate deleted successfully");
        fetchSSLData();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to delete SSL certificate");
    } finally {
      setLoading(false);
    }
  };

  const handleTestCertificate = async (certId) => {
    try {
      const response = await fetch(`/api/ssl/certificates/${certId}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTestResults((prev) => ({ ...prev, [certId]: data.data }));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to test SSL certificate");
    }
  };

  const handleGenerateCSR = async () => {
    try {
      const response = await fetch("/api/ssl/csr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(csrData),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("CSR generated successfully");
        // You would typically download or display the CSR here
        console.log("Generated CSR:", data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to generate CSR");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <VerifiedIcon color="success" />;
      case "pending":
        return <InfoIcon color="info" />;
      case "expired":
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "lets_encrypt":
        return <CertIcon color="success" />;
      case "self_signed":
        return <SecurityIcon color="warning" />;
      case "custom":
        return <SecurityIcon color="primary" />;
      default:
        return <SecurityIcon />;
    }
  };

  const getDaysUntilExpiry = (expiresAt) => {
    if (!expiresAt) return null;
    const days = Math.ceil(
      (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getExpiryChip = (expiresAt) => {
    const days = getDaysUntilExpiry(expiresAt);
    if (days === null) return <Chip label="No expiry" size="small" />;

    if (days < 0) {
      return <Chip label="Expired" color="error" size="small" />;
    } else if (days <= 7) {
      return <Chip label={`${days} days`} color="error" size="small" />;
    } else if (days <= 30) {
      return <Chip label={`${days} days`} color="warning" size="small" />;
    } else {
      return <Chip label={`${days} days`} color="success" size="small" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: "20px 0" }}>
      {value === index && children}
    </div>
  );

  const CertificateWizardStep = ({ step }) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Certificate Type</InputLabel>
                <Select
                  value={newCertificate.type}
                  onChange={(e) =>
                    setNewCertificate((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                >
                  {certificateTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Domain Name"
                value={newCertificate.domain_name}
                onChange={(e) =>
                  setNewCertificate((prev) => ({
                    ...prev,
                    domain_name: e.target.value,
                  }))
                }
                placeholder="example.com"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newCertificate.wildcard}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        wildcard: e.target.checked,
                      }))
                    }
                  />
                }
                label="Wildcard Certificate (*.domain.com)"
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            {newCertificate.type === "lets_encrypt" && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Validation Method</InputLabel>
                  <Select
                    value={newCertificate.validation_method}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        validation_method: e.target.value,
                      }))
                    }
                  >
                    {validationMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {newCertificate.type === "custom" && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Certificate Data"
                    multiline
                    rows={6}
                    value={newCertificate.certificate_data}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        certificate_data: e.target.value,
                      }))
                    }
                    placeholder="-----BEGIN CERTIFICATE-----..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Private Key"
                    multiline
                    rows={6}
                    value={newCertificate.private_key_data}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        private_key_data: e.target.value,
                      }))
                    }
                    placeholder="-----BEGIN PRIVATE KEY-----..."
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newCertificate.auto_renew}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        auto_renew: e.target.checked,
                      }))
                    }
                  />
                }
                label="Auto-Renewal"
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newCertificate.force_https}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        force_https: e.target.checked,
                      }))
                    }
                  />
                }
                label="Force HTTPS Redirect"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newCertificate.hsts_enabled}
                    onChange={(e) =>
                      setNewCertificate((prev) => ({
                        ...prev,
                        hsts_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Enable HSTS (HTTP Strict Transport Security)"
              />
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  if (loading && certificates.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <SSLIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          SSL Certificate Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">
          <SSLIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          SSL Certificate Management
        </Typography>
        <Box>
          <Button
            startIcon={<CSRIcon />}
            onClick={() => setOpenCSRDialog(true)}
            sx={{ mr: 1 }}
          >
            Generate CSR
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchSSLData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Request Certificate
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Certificates
              </Typography>
              <Typography variant="h4">
                {statistics.certificates?.total || 0}
              </Typography>
              <Typography variant="body2">
                {statistics.certificates?.active || 0} active,{" "}
                {statistics.certificates?.pending || 0} pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography
                variant="h4"
                color={
                  statistics.certificates?.expiring_soon > 0
                    ? "warning.main"
                    : "text.primary"
                }
              >
                {statistics.certificates?.expiring_soon || 0}
              </Typography>
              <Typography variant="body2">Within 30 days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Auto-Renewal
              </Typography>
              <Typography variant="h4">
                {statistics.security?.auto_renew_enabled || 0}
              </Typography>
              <Typography variant="body2">
                Certificates with auto-renewal
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Security Features
              </Typography>
              <Typography variant="h4">
                {statistics.security?.hsts_enabled || 0}
              </Typography>
              <Typography variant="body2">HSTS enabled certificates</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab icon={<CertIcon />} label="Certificates" />
          <Tab icon={<StatsIcon />} label="Statistics" />
          <Tab icon={<SettingsIcon />} label="Configuration" />
        </Tabs>

        {/* Certificates Tab */}
        <TabPanel value={activeTab} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Domain</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Security</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {getTypeIcon(cert.type)}
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {cert.domain_name}
                          </Typography>
                          {cert.wildcard && (
                            <Chip
                              label="Wildcard"
                              size="small"
                              color="info"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                          {cert.san_domains && cert.san_domains.length > 1 && (
                            <Chip
                              label={`+${cert.san_domains.length - 1} domains`}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5, ml: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {cert.certificate_authority}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {cert.algorithm} {cert.key_size}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {getStatusIcon(cert.status)}
                        <Chip
                          label={cert.status}
                          color={
                            cert.status === "active"
                              ? "success"
                              : cert.status === "pending"
                              ? "info"
                              : "error"
                          }
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {getExpiryChip(cert.expires_at)}
                        {cert.expires_at && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {formatDate(cert.expires_at)}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {cert.auto_renew && (
                          <Chip
                            label="Auto-Renew"
                            size="small"
                            color="success"
                          />
                        )}
                        {cert.hsts_enabled && (
                          <Chip label="HSTS" size="small" color="primary" />
                        )}
                        {cert.force_https && (
                          <Chip
                            label="Force HTTPS"
                            size="small"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="Test Certificate">
                          <IconButton
                            size="small"
                            onClick={() => handleTestCertificate(cert.id)}
                          >
                            <TestIcon />
                          </IconButton>
                        </Tooltip>
                        {cert.type !== "self_signed" && (
                          <Tooltip title="Renew Certificate">
                            <IconButton
                              size="small"
                              onClick={() => handleRenewCertificate(cert.id)}
                              disabled={cert.status === "pending"}
                            >
                              <RenewIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => setEditingCert(cert)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                SSL Test Results
              </Typography>
              {Object.entries(testResults).map(([certId, result]) => (
                <Accordion key={certId} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography variant="h6">{result.domain}</Typography>
                      <Chip
                        label={`Grade: ${result.ssl_grade}`}
                        color={
                          result.ssl_grade.startsWith("A") ? "success" : "error"
                        }
                      />
                      <Typography variant="body2" color="textSecondary">
                        Response Time: {result.response_time}ms
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Protocol Support
                        </Typography>
                        {Object.entries(result.protocol_support).map(
                          ([protocol, supported]) => (
                            <Box
                              key={protocol}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {supported ? (
                                <CheckIcon color="success" />
                              ) : (
                                <CancelIcon color="error" />
                              )}
                              <Typography variant="body2">
                                {protocol}
                              </Typography>
                            </Box>
                          )
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Security Features
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Chip
                            label={`Cipher Strength: ${result.cipher_strength}`}
                            size="small"
                            color="success"
                          />
                          <Chip
                            label={`Key Exchange: ${result.key_exchange}`}
                            size="small"
                            color="info"
                          />
                          {result.hsts_enabled && (
                            <Chip
                              label="HSTS Enabled"
                              size="small"
                              color="primary"
                            />
                          )}
                          {result.ocsp_stapling && (
                            <Chip
                              label="OCSP Stapling"
                              size="small"
                              color="secondary"
                            />
                          )}
                        </Box>
                      </Grid>
                      {result.recommendations.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Recommendations
                          </Typography>
                          {result.recommendations.map((rec, index) => (
                            <Alert key={index} severity="info" sx={{ mb: 1 }}>
                              {rec}
                            </Alert>
                          ))}
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Certificate Types
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Let's Encrypt"
                        secondary={`${
                          statistics.types?.lets_encrypt || 0
                        } certificates`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Self-Signed"
                        secondary={`${
                          statistics.types?.self_signed || 0
                        } certificates`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Custom"
                        secondary={`${
                          statistics.types?.custom || 0
                        } certificates`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upcoming Renewals
                  </Typography>
                  <List>
                    {statistics.renewal?.next_renewals?.map(
                      (renewal, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={renewal.domain}
                            secondary={`${renewal.days_left} days left`}
                          />
                          <ListItemSecondaryAction>
                            {getExpiryChip(renewal.expires_at)}
                          </ListItemSecondaryAction>
                        </ListItem>
                      )
                    ) || (
                      <ListItem>
                        <ListItemText secondary="No upcoming renewals" />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Configuration Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Let's Encrypt Settings
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch checked={configuration.lets_encrypt?.enabled} />
                      }
                      label="Enable Let's Encrypt"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="Email"
                    value={configuration.lets_encrypt?.email || ""}
                    margin="normal"
                    disabled
                  />
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={configuration.lets_encrypt?.auto_renew}
                        />
                      }
                      label="Auto-Renewal"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Default Security Settings
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={configuration.default_settings?.force_https}
                        />
                      }
                      label="Force HTTPS by Default"
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={configuration.default_settings?.hsts_enabled}
                        />
                      }
                      label="Enable HSTS by Default"
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            configuration.default_settings?.ocsp_stapling
                          }
                        />
                      }
                      label="OCSP Stapling"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Request Certificate Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Request SSL Certificate</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>Certificate Type</StepLabel>
              </Step>
              <Step>
                <StepLabel>Configuration</StepLabel>
              </Step>
              <Step>
                <StepLabel>Security Settings</StepLabel>
              </Step>
            </Stepper>

            <CertificateWizardStep step={activeStep} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep((prev) => prev - 1)}>
              Back
            </Button>
          )}
          {activeStep < 2 ? (
            <Button
              variant="contained"
              onClick={() => setActiveStep((prev) => prev + 1)}
              disabled={!newCertificate.domain_name}
            >
              Next
            </Button>
          ) : (
            <Button variant="contained" onClick={handleCreateCertificate}>
              Request Certificate
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Generate CSR Dialog */}
      <Dialog
        open={openCSRDialog}
        onClose={() => setOpenCSRDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Generate Certificate Signing Request (CSR)</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Common Name"
                value={csrData.common_name}
                onChange={(e) =>
                  setCSRData((prev) => ({
                    ...prev,
                    common_name: e.target.value,
                  }))
                }
                placeholder="example.com"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Organization"
                value={csrData.organization}
                onChange={(e) =>
                  setCSRData((prev) => ({
                    ...prev,
                    organization: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Organizational Unit"
                value={csrData.organizational_unit}
                onChange={(e) =>
                  setCSRData((prev) => ({
                    ...prev,
                    organizational_unit: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Locality"
                value={csrData.locality}
                onChange={(e) =>
                  setCSRData((prev) => ({ ...prev, locality: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={csrData.state}
                onChange={(e) =>
                  setCSRData((prev) => ({ ...prev, state: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country Code"
                value={csrData.country}
                onChange={(e) =>
                  setCSRData((prev) => ({
                    ...prev,
                    country: e.target.value.toUpperCase(),
                  }))
                }
                inputProps={{ maxLength: 2 }}
                placeholder="US"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Key Size</InputLabel>
                <Select
                  value={csrData.key_size}
                  onChange={(e) =>
                    setCSRData((prev) => ({
                      ...prev,
                      key_size: e.target.value,
                    }))
                  }
                >
                  <MenuItem value={2048}>2048 bits (Recommended)</MenuItem>
                  <MenuItem value={3072}>3072 bits</MenuItem>
                  <MenuItem value={4096}>4096 bits</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCSRDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGenerateCSR}
            disabled={!csrData.common_name}
          >
            Generate CSR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SSLManagement;

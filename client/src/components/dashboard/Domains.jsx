import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Dns as DnsIcon,
  Domain as DomainIcon,
  Edit as EditIcon,
  Folder as FileIcon,
  Forward as RedirectIcon,
  Security as SslIcon,
  BarChart as StatsIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const Domains = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [domains, setDomains] = useState([]);
  const [subdomains, setSubdomains] = useState([]);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [sslCertificates, setSslCertificates] = useState([]);
  const [domainStats, setDomainStats] = useState({});
  const [redirects, setRedirects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [domainDialog, setDomainDialog] = useState({
    open: false,
    mode: "add",
    data: {},
  });
  const [subdomainDialog, setSubdomainDialog] = useState({
    open: false,
    mode: "add",
    data: {},
  });
  const [dnsDialog, setDnsDialog] = useState({
    open: false,
    mode: "add",
    data: {},
  });
  const [sslDialog, setSslDialog] = useState({
    open: false,
    mode: "add",
    data: {},
  });
  const [redirectDialog, setRedirectDialog] = useState({
    open: false,
    mode: "add",
    data: {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDomains(),
        fetchSubdomains(),
        fetchDnsRecords(),
        fetchSslCertificates(),
        fetchDomainStats(),
        fetchRedirects(),
      ]);
    } catch (error) {
      toast.error("Failed to fetch domain data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await api.get("/domain-advanced/domains");
      setDomains(response.data.domains || []);
    } catch (error) {
      console.error("Fetch domains error:", error);
    }
  };

  const fetchSubdomains = async () => {
    try {
      const response = await api.get("/domain-advanced/subdomains");
      setSubdomains(response.data.subdomains || []);
    } catch (error) {
      console.error("Fetch subdomains error:", error);
    }
  };

  const fetchDnsRecords = async () => {
    try {
      const response = await api.get("/domain-advanced/dns");
      setDnsRecords(response.data.records || []);
    } catch (error) {
      console.error("Fetch DNS records error:", error);
    }
  };

  const fetchSslCertificates = async () => {
    try {
      const response = await api.get("/domain-advanced/ssl");
      setSslCertificates(response.data.certificates || []);
    } catch (error) {
      console.error("Fetch SSL certificates error:", error);
    }
  };

  const fetchDomainStats = async () => {
    try {
      const response = await api.get("/domain-advanced/stats");
      setDomainStats(response.data.stats || {});
    } catch (error) {
      console.error("Fetch domain stats error:", error);
    }
  };

  const fetchRedirects = async () => {
    try {
      const response = await api.get("/domain-advanced/redirects");
      setRedirects(response.data.redirects || []);
    } catch (error) {
      console.error("Fetch redirects error:", error);
    }
  };

  // Domain Management Functions
  const handleCreateDomain = async (domainData) => {
    try {
      await api.post("/domain-advanced/domains", domainData);
      toast.success("Domain created successfully");
      setDomainDialog({ open: false, mode: "add", data: {} });
      fetchDomains();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create domain");
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this domain? This will also delete all associated subdomains and DNS records."
      )
    ) {
      try {
        await api.delete(`/domain-advanced/domains/${domainId}`);
        toast.success("Domain deleted successfully");
        fetchDomains();
      } catch (error) {
        toast.error("Failed to delete domain");
      }
    }
  };

  // Subdomain Functions
  const handleCreateSubdomain = async (subdomainData) => {
    try {
      await api.post("/domain-advanced/subdomains", subdomainData);
      toast.success("Subdomain created successfully");
      setSubdomainDialog({ open: false, mode: "add", data: {} });
      fetchSubdomains();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create subdomain"
      );
    }
  };

  // DNS Functions
  const handleCreateDnsRecord = async (dnsData) => {
    try {
      await api.post("/domain-advanced/dns", dnsData);
      toast.success("DNS record created successfully");
      setDnsDialog({ open: false, mode: "add", data: {} });
      fetchDnsRecords();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create DNS record"
      );
    }
  };

  // SSL Functions
  const handleRequestSsl = async (sslData) => {
    try {
      await api.post("/domain-advanced/ssl", sslData);
      toast.success("SSL certificate requested successfully");
      setSslDialog({ open: false, mode: "add", data: {} });
      fetchSslCertificates();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to request SSL certificate"
      );
    }
  };

  // Redirect Functions
  const handleCreateRedirect = async (redirectData) => {
    try {
      await api.post("/domain-advanced/redirects", redirectData);
      toast.success("Redirect created successfully");
      setRedirectDialog({ open: false, mode: "add", data: {} });
      fetchRedirects();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create redirect");
    }
  };

  const renderDomainsTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Domain Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDomainDialog({ open: true, mode: "add", data: {} })}
        >
          Add Domain
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Domain</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Document Root</TableCell>
              <TableCell>PHP Version</TableCell>
              <TableCell>SSL Status</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Traffic (MB)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {domains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {domain.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {domain.ip_address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={domain.type}
                    color={domain.type === "main" ? "primary" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {domain.document_root}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={`PHP ${domain.php_version}`} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={domain.ssl_status}
                    color={
                      domain.ssl_status === "active" ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={domain.status}
                    color={domain.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {domain.bandwidth_used} / {domain.bandwidth_limit}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={domain.bandwidth_percentage}
                    sx={{ mt: 1 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit Domain">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setDomainDialog({
                          open: true,
                          mode: "edit",
                          data: domain,
                        })
                      }
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="DNS Management">
                    <IconButton size="small">
                      <DnsIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="SSL Certificate">
                    <IconButton size="small">
                      <SslIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Domain">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDomain(domain.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSubdomainsTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Subdomain Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            setSubdomainDialog({ open: true, mode: "add", data: {} })
          }
        >
          Create Subdomain
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subdomain</TableCell>
              <TableCell>Parent Domain</TableCell>
              <TableCell>Document Root</TableCell>
              <TableCell>SSL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subdomains.map((subdomain) => (
              <TableRow key={subdomain.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {subdomain.name}.{subdomain.domain}
                  </Typography>
                </TableCell>
                <TableCell>{subdomain.domain}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {subdomain.document_root}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={subdomain.ssl_enabled ? "Enabled" : "Disabled"}
                    color={subdomain.ssl_enabled ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={subdomain.status}
                    color={
                      subdomain.status === "active" ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderDnsTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">DNS Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDnsDialog({ open: true, mode: "add", data: {} })}
        >
          Add DNS Record
        </Button>
      </Box>

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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dnsRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.name}</TableCell>
                <TableCell>
                  <Chip label={record.type} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {record.value}
                  </Typography>
                </TableCell>
                <TableCell>{record.ttl}</TableCell>
                <TableCell>{record.priority || "-"}</TableCell>
                <TableCell>
                  <Chip
                    label={record.status}
                    color={record.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSslTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">SSL Certificate Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setSslDialog({ open: true, mode: "add", data: {} })}
        >
          Request SSL
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sslCertificates.map((cert) => (
          <Grid item xs={12} md={6} key={cert.id}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">{cert.domain}</Typography>
                  <Chip
                    label={cert.status}
                    color={
                      cert.status === "active"
                        ? "success"
                        : cert.status === "pending"
                        ? "warning"
                        : "error"
                    }
                  />
                </Box>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Issuer: {cert.issuer}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Valid From: {new Date(cert.valid_from).toLocaleDateString()}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Valid Until: {new Date(cert.valid_until).toLocaleDateString()}
                </Typography>

                <Box mt={2}>
                  <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                    Renew
                  </Button>
                  <Button size="small" variant="outlined" color="error">
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderStatsTab = () => (
    <Box>
      <Typography variant="h6" mb={3}>
        Domain Statistics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {domainStats.total_domains || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Domains
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {domainStats.active_domains || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Domains
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {domainStats.ssl_enabled || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                SSL Enabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {domainStats.total_bandwidth || "0 GB"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Bandwidth
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderRedirectsTab = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Domain Redirects</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            setRedirectDialog({ open: true, mode: "add", data: {} })
          }
        >
          Add Redirect
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {redirects.map((redirect) => (
              <TableRow key={redirect.id}>
                <TableCell>{redirect.source}</TableCell>
                <TableCell>{redirect.destination}</TableCell>
                <TableCell>
                  <Chip label={redirect.type} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={redirect.status}
                    color={redirect.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  if (loading) {
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
      <Typography variant="h4" gutterBottom>
        Domain Management
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab icon={<DomainIcon />} label="Domains" />
        <Tab icon={<FileIcon />} label="Subdomains" />
        <Tab icon={<DnsIcon />} label="DNS Records" />
        <Tab icon={<SslIcon />} label="SSL Certificates" />
        <Tab icon={<StatsIcon />} label="Statistics" />
        <Tab icon={<RedirectIcon />} label="Redirects" />
      </Tabs>

      {activeTab === 0 && renderDomainsTab()}
      {activeTab === 1 && renderSubdomainsTab()}
      {activeTab === 2 && renderDnsTab()}
      {activeTab === 3 && renderSslTab()}
      {activeTab === 4 && renderStatsTab()}
      {activeTab === 5 && renderRedirectsTab()}

      {/* Domain Create/Edit Dialog */}
      <Dialog
        open={domainDialog.open}
        onClose={() => setDomainDialog({ open: false, mode: "add", data: {} })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {domainDialog.mode === "add" ? "Add New Domain" : "Edit Domain"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                margin="dense"
                label="Domain Name"
                placeholder="example.com"
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Domain Type</InputLabel>
                <Select defaultValue="addon">
                  <MenuItem value="main">Main Domain</MenuItem>
                  <MenuItem value="addon">Addon Domain</MenuItem>
                  <MenuItem value="parked">Parked Domain</MenuItem>
                  <MenuItem value="subdomain">Subdomain</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Document Root"
                placeholder="/home/user/public_html/example.com"
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>PHP Version</InputLabel>
                <Select defaultValue="8.1">
                  <MenuItem value="7.4">PHP 7.4</MenuItem>
                  <MenuItem value="8.0">PHP 8.0</MenuItem>
                  <MenuItem value="8.1">PHP 8.1</MenuItem>
                  <MenuItem value="8.2">PHP 8.2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch />}
                label="Enable SSL (Let's Encrypt)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDomainDialog({ open: false, mode: "add", data: {} })
            }
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={() => handleCreateDomain({})}>
            {domainDialog.mode === "add" ? "Create" : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Domains;

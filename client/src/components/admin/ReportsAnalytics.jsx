import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Domain as DomainIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const ReportsAnalytics = () => {
  const [analytics, setAnalytics] = useState({});
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const [analyticsRes, reportsRes] = await Promise.all([
        api.get(`/admin/analytics?range=${timeRange}`),
        api.get(`/admin/reports?range=${timeRange}`),
      ]);

      setAnalytics(analyticsRes.data || {});
      setReports(reportsRes.data || {});
    } catch (error) {
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportType) => {
    try {
      const response = await api.get(`/admin/reports/export/${reportType}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}_${timeRange}_${Date.now()}.csv`;
      link.click();

      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color = "primary",
    trend,
    subtitle,
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h6">{value}</Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend >= 0 ? (
                  <TrendingUpIcon fontSize="small" color="success" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="error" />
                )}
                <Typography
                  variant="caption"
                  color={trend >= 0 ? "success.main" : "error.main"}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  const ProgressCard = ({ title, current, total, color = "primary" }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">
              {current} / {total}
            </Typography>
            <Typography variant="body2">{percentage.toFixed(1)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Analytics & Reports</Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={analytics.total_users || 0}
            icon={<PeopleIcon fontSize="large" />}
            color="primary"
            trend={analytics.user_growth}
            subtitle="Active accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Domains"
            value={analytics.total_domains || 0}
            icon={<DomainIcon fontSize="large" />}
            color="info"
            trend={analytics.domain_growth}
            subtitle="Hosted domains"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`$${analytics.total_revenue || 0}`}
            icon={<TrendingUpIcon fontSize="large" />}
            color="success"
            trend={analytics.revenue_growth}
            subtitle={timeRange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Server Uptime"
            value={`${analytics.server_uptime || 99.9}%`}
            icon={<CheckCircleIcon fontSize="large" />}
            color="success"
            subtitle="Last 30 days"
          />
        </Grid>
      </Grid>

      {/* Resource Usage */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <ProgressCard
            title="Disk Usage"
            current={analytics.disk_used || 0}
            total={analytics.disk_total || 100}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ProgressCard
            title="Bandwidth Usage"
            current={analytics.bandwidth_used || 0}
            total={analytics.bandwidth_total || 100}
            color="info"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ProgressCard
            title="CPU Usage"
            current={analytics.cpu_avg || 0}
            total={100}
            color={analytics.cpu_avg > 80 ? "error" : "success"}
          />
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="analytics tabs"
        >
          <Tab label="User Analytics" />
          <Tab label="Resource Usage" />
          <Tab label="Security Reports" />
          <Tab label="Financial Reports" />
          <Tab label="System Health" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                User Growth Trend
              </Typography>
              <Box
                height={300}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color="textSecondary">
                  User growth chart will be displayed here
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Top Users by Resource Usage
              </Typography>
              <List>
                {(reports.top_users || []).map((user, index) => (
                  <ListItem key={user.id}>
                    <Avatar sx={{ mr: 2 }}>{user.username?.[0]}</Avatar>
                    <ListItemText
                      primary={user.username}
                      secondary={`${user.disk_usage}MB disk, ${user.bandwidth_usage}MB bandwidth`}
                    />
                    <Chip
                      label={`${user.resource_percentage}%`}
                      color={
                        user.resource_percentage > 80 ? "error" : "default"
                      }
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Resource Usage Report</Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => exportReport("resource_usage")}
                >
                  Export CSV
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Resource</TableCell>
                      <TableCell>Current Usage</TableCell>
                      <TableCell>Total Capacity</TableCell>
                      <TableCell>Usage %</TableCell>
                      <TableCell>Trend</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reports.resource_usage || []).map((resource) => (
                      <TableRow key={resource.name}>
                        <TableCell>{resource.name}</TableCell>
                        <TableCell>{resource.current}</TableCell>
                        <TableCell>{resource.total}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LinearProgress
                              variant="determinate"
                              value={resource.percentage}
                              sx={{ width: 60, mr: 1 }}
                            />
                            {resource.percentage}%
                          </Box>
                        </TableCell>
                        <TableCell>
                          {resource.trend >= 0 ? (
                            <TrendingUpIcon color="success" />
                          ) : (
                            <TrendingDownIcon color="error" />
                          )}
                          {Math.abs(resource.trend)}%
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={resource.status}
                            color={
                              resource.status === "healthy"
                                ? "success"
                                : "warning"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Security Events
              </Typography>
              <List>
                {(reports.security_events || []).map((event, index) => (
                  <ListItem key={index}>
                    <Box sx={{ mr: 2 }}>
                      {event.severity === "high" ? (
                        <ErrorIcon color="error" />
                      ) : event.severity === "medium" ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <CheckCircleIcon color="success" />
                      )}
                    </Box>
                    <ListItemText
                      primary={event.description}
                      secondary={`${event.ip} - ${new Date(
                        event.timestamp
                      ).toLocaleString()}`}
                    />
                    <Chip
                      label={event.severity}
                      color={
                        event.severity === "high"
                          ? "error"
                          : event.severity === "medium"
                          ? "warning"
                          : "default"
                      }
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Security Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <StatCard
                    title="Failed Login Attempts"
                    value={analytics.failed_logins || 0}
                    icon={<SecurityIcon fontSize="large" />}
                    color="error"
                    subtitle="Last 24 hours"
                  />
                </Grid>
                <Grid item xs={12}>
                  <StatCard
                    title="Blocked IPs"
                    value={analytics.blocked_ips || 0}
                    icon={<ErrorIcon fontSize="large" />}
                    color="warning"
                    subtitle="Currently blocked"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Financial Summary</Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => exportReport("financial")}
                >
                  Export Report
                </Button>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Monthly Recurring Revenue"
                    value={`$${analytics.mrr || 0}`}
                    icon={<TrendingUpIcon fontSize="large" />}
                    color="success"
                    trend={analytics.mrr_growth}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Average Revenue Per User"
                    value={`$${analytics.arpu || 0}`}
                    icon={<AssessmentIcon fontSize="large" />}
                    color="info"
                    trend={analytics.arpu_growth}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatCard
                    title="Churn Rate"
                    value={`${analytics.churn_rate || 0}%`}
                    icon={<TrendingDownIcon fontSize="large" />}
                    color="warning"
                    trend={analytics.churn_trend}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <List>
                {(reports.system_health || []).map((service, index) => (
                  <ListItem key={index}>
                    <Box sx={{ mr: 2 }}>
                      {service.status === "online" ? (
                        <CheckCircleIcon color="success" />
                      ) : service.status === "warning" ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </Box>
                    <ListItemText
                      primary={service.name}
                      secondary={`Uptime: ${service.uptime}% | Last check: ${service.last_check}`}
                    />
                    <Chip
                      label={service.status}
                      color={
                        service.status === "online"
                          ? "success"
                          : service.status === "warning"
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <StatCard
                    title="Average Response Time"
                    value={`${analytics.avg_response_time || 0}ms`}
                    icon={<SpeedIcon fontSize="large" />}
                    color="info"
                    subtitle="Last 24 hours"
                  />
                </Grid>
                <Grid item xs={12}>
                  <StatCard
                    title="Error Rate"
                    value={`${analytics.error_rate || 0}%`}
                    icon={<ErrorIcon fontSize="large" />}
                    color={analytics.error_rate > 1 ? "error" : "success"}
                    subtitle="HTTP 5xx errors"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ReportsAnalytics;

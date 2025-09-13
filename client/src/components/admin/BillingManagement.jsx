import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
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

const BillingManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [billingStats, setBillingStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    user_id: "",
    description: "Monthly Hosting Service",
    amount: 0,
    due_date: "",
    items: [],
  });

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [invoicesRes, paymentsRes, statsRes] = await Promise.all([
        api.get("/admin/billing/invoices"),
        api.get("/admin/billing/payments"),
        api.get("/admin/billing/stats"),
      ]);

      setInvoices(invoicesRes.data || []);
      setPayments(paymentsRes.data || []);
      setBillingStats(statsRes.data || {});
    } catch (error) {
      toast.error("Failed to fetch billing data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      await api.post("/admin/billing/invoices", invoiceData);
      toast.success("Invoice created successfully");
      setOpenInvoiceDialog(false);
      resetInvoiceForm();
      fetchBillingData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await api.post(`/admin/billing/invoices/${invoiceId}/send`);
      toast.success("Invoice sent successfully");
      fetchBillingData();
    } catch (error) {
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await api.patch(`/admin/billing/invoices/${invoiceId}/status`, {
        status: "paid",
      });
      toast.success("Invoice marked as paid");
      fetchBillingData();
    } catch (error) {
      toast.error("Failed to update invoice status");
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceData({
      user_id: "",
      description: "Monthly Hosting Service",
      amount: 0,
      due_date: "",
      items: [],
    });
  };

  const StatCard = ({
    title,
    value,
    icon,
    color = "primary",
    subtitle,
    trend,
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
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUpIcon
                  fontSize="small"
                  color={trend > 0 ? "success" : "error"}
                />
                <Typography
                  variant="caption"
                  color={trend > 0 ? "success.main" : "error.main"}
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

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      case "draft":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Billing & Invoices</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetInvoiceForm();
            setOpenInvoiceDialog(true);
          }}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Billing Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${billingStats.monthly_revenue || 0}`}
            icon={<MoneyIcon fontSize="large" />}
            color="success"
            trend={billingStats.revenue_growth}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Outstanding"
            value={`$${billingStats.outstanding_amount || 0}`}
            icon={<WarningIcon fontSize="large" />}
            color="warning"
            subtitle={`${billingStats.outstanding_count || 0} invoices`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="This Month"
            value={`$${billingStats.current_month || 0}`}
            icon={<ReceiptIcon fontSize="large" />}
            color="primary"
            subtitle={`${billingStats.current_month_count || 0} invoices`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Collection Rate"
            value={`${billingStats.collection_rate || 0}%`}
            icon={<CheckCircleIcon fontSize="large" />}
            color="info"
            subtitle="Last 30 days"
          />
        </Grid>
      </Grid>

      {/* Collection Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Collection Progress This Month
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">
                Collected: ${billingStats.collected_amount || 0}
              </Typography>
              <Typography variant="body2">
                Target: ${billingStats.target_amount || 0}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={
                ((billingStats.collected_amount || 0) /
                  (billingStats.target_amount || 1)) *
                100
              }
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="billing tabs"
        >
          <Tab label="Invoices" />
          <Tab label="Payments" />
          <Tab label="Reports" />
          <Tab label="Settings" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        #{invoice.invoice_number || invoice.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                          {invoice.customer_name?.[0] || "?"}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {invoice.customer_name || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {invoice.customer_email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        ${invoice.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          new Date(invoice.due_date) < new Date()
                            ? "error"
                            : "textPrimary"
                        }
                      >
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleSendInvoice(invoice.id)}
                        color="primary"
                        disabled={invoice.status === "draft"}
                      >
                        <SendIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMarkPaid(invoice.id)}
                        color="success"
                        disabled={invoice.status === "paid"}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          /* Download PDF */
                        }}
                        color="info"
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setInvoiceData(invoice);
                          setOpenInvoiceDialog(true);
                        }}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        #{payment.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.customer_name}</TableCell>
                    <TableCell>#{payment.invoice_id}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body1"
                        fontWeight="bold"
                        color="success.main"
                      >
                        ${payment.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.method || "Credit Card"}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={
                          payment.status === "completed" ? "success" : "warning"
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Revenue Trends
              </Typography>
              <Box
                height={300}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color="textSecondary">
                  Revenue chart will be displayed here
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Payment Methods
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Credit Card"
                    secondary={`${
                      billingStats.payment_methods?.credit_card || 0
                    }%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="PayPal"
                    secondary={`${billingStats.payment_methods?.paypal || 0}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Bank Transfer"
                    secondary={`${
                      billingStats.payment_methods?.bank_transfer || 0
                    }%`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Billing Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Payment Gateways
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="PayPal"
                    secondary="Configure PayPal integration"
                  />
                  <Button variant="outlined" size="small">
                    Configure
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Stripe"
                    secondary="Configure Stripe integration"
                  />
                  <Button variant="outlined" size="small">
                    Configure
                  </Button>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Invoice Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Auto-send invoices"
                    secondary="Automatically send invoices when created"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Late fee percentage"
                    secondary="5% of invoice amount"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create/Edit Invoice Dialog */}
      <Dialog
        open={openInvoiceDialog}
        onClose={() => setOpenInvoiceDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedInvoice ? "Edit Invoice" : "Create New Invoice"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer User ID"
                value={invoiceData.user_id}
                onChange={(e) =>
                  setInvoiceData((prev) => ({
                    ...prev,
                    user_id: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (USD)"
                type="number"
                value={invoiceData.amount}
                onChange={(e) =>
                  setInvoiceData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value),
                  }))
                }
                InputProps={{ startAdornment: "$" }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={invoiceData.description}
                onChange={(e) =>
                  setInvoiceData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={invoiceData.due_date}
                onChange={(e) =>
                  setInvoiceData((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvoiceDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInvoice} variant="contained">
            {selectedInvoice ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingManagement;

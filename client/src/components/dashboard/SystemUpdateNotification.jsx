import {
  Close as CloseIcon,
  KeyboardArrowUp as CollapseIcon,
  GetApp as DownloadIcon,
  KeyboardArrowDown as ExpandIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  SystemUpdate as UpdateIcon,
} from "@mui/icons-material";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Fade,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import api from "../../utils/api";

const SystemUpdateNotification = ({ onTabChange }) => {
  const [availableUpdates, setAvailableUpdates] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  useEffect(() => {
    checkForUpdates();
    // Check for updates every 30 minutes like hosting panels
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    setLoading(true);
    try {
      const response = await api.get("/system/updates");
      const updates = response.data || [];
      setAvailableUpdates(updates);
      setLastCheckTime(new Date().toLocaleString());

      // If there are new security updates, show the banner again
      const securityUpdates = updates.filter((u) => u.security_update);
      if (securityUpdates.length > 0 && dismissed) {
        setDismissed(false);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInstallSecurity = async () => {
    const securityUpdates = availableUpdates.filter((u) => u.security_update);
    await installUpdates(securityUpdates.map((u) => u.id));
  };

  const installUpdates = async (updateIds) => {
    setInstalling(true);
    setInstallProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setInstallProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await api.post("/system/updates/install", {
        update_ids: updateIds,
      });

      clearInterval(progressInterval);
      setInstallProgress(100);

      if (response.data.success) {
        // Remove installed updates from available list
        setAvailableUpdates((prev) =>
          prev.filter((update) => !updateIds.includes(update.id))
        );

        setTimeout(() => {
          setInstalling(false);
          setInstallProgress(0);
          checkForUpdates(); // Refresh the list
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to install updates:", error);
      setInstalling(false);
      setInstallProgress(0);
    }
  };

  const securityUpdatesCount = availableUpdates.filter(
    (u) => u.security_update
  ).length;
  const regularUpdatesCount = availableUpdates.filter(
    (u) => !u.security_update
  ).length;
  const totalUpdatesCount = availableUpdates.length;

  if (totalUpdatesCount === 0 || dismissed) {
    return null;
  }

  const renderUpdateDetails = () => (
    <Box sx={{ mt: 2 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableUpdates.slice(0, 5).map((update) => (
              <TableRow key={update.id}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {update.security_update && (
                      <SecurityIcon color="error" fontSize="small" />
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {update.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {update.current_version}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="primary">
                    {update.available_version}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={update.security_update ? "Security" : "Regular"}
                    color={update.security_update ? "error" : "default"}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{update.size}</Typography>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => installUpdates([update.id])}
                    disabled={installing}
                    startIcon={<DownloadIcon />}
                  >
                    Install
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {availableUpdates.length > 5 && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            variant="text"
            onClick={() => onTabChange && onTabChange("system-updates")}
          >
            View All {availableUpdates.length} Updates
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <Fade in={!dismissed}>
        <Card
          sx={{
            mb: 3,
            border: securityUpdatesCount > 0 ? "2px solid" : "1px solid",
            borderColor:
              securityUpdatesCount > 0 ? "error.main" : "warning.main",
            bgcolor: securityUpdatesCount > 0 ? "error.50" : "warning.50",
          }}
        >
          <CardContent sx={{ pb: 2 }}>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Badge
                  badgeContent={totalUpdatesCount}
                  color={securityUpdatesCount > 0 ? "error" : "warning"}
                  max={99}
                >
                  <UpdateIcon
                    color={securityUpdatesCount > 0 ? "error" : "warning"}
                    fontSize="large"
                  />
                </Badge>

                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    System Updates Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {securityUpdatesCount > 0 ? (
                      <>
                        <SecurityIcon
                          fontSize="small"
                          sx={{ mr: 0.5, verticalAlign: "middle" }}
                        />
                        {securityUpdatesCount} critical security updates require
                        immediate attention
                      </>
                    ) : (
                      `${regularUpdatesCount} system packages have updates available`
                    )}
                  </Typography>
                  {lastCheckTime && (
                    <Typography variant="caption" color="text.secondary">
                      Last checked: {lastCheckTime}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Manual Check">
                  <IconButton
                    size="small"
                    onClick={checkForUpdates}
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={expanded ? "Collapse" : "Expand"}>
                  <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <CollapseIcon /> : <ExpandIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Dismiss">
                  <IconButton size="small" onClick={() => setDismissed(true)}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Progress Bar */}
            {installing && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Installing updates... {installProgress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={installProgress}
                  color={securityUpdatesCount > 0 ? "error" : "warning"}
                />
              </Box>
            )}

            {/* Quick Actions */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {securityUpdatesCount > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleQuickInstallSecurity}
                  disabled={installing}
                  startIcon={<SecurityIcon />}
                >
                  Install Security Updates ({securityUpdatesCount})
                </Button>
              )}

              <Button
                variant="outlined"
                color={securityUpdatesCount > 0 ? "error" : "warning"}
                onClick={() => onTabChange && onTabChange("system-updates")}
                startIcon={<UpdateIcon />}
              >
                Manage All Updates
              </Button>

              <Button
                variant="text"
                onClick={checkForUpdates}
                disabled={loading}
                startIcon={<RefreshIcon />}
              >
                Check for Updates
              </Button>
            </Box>

            {/* Update Details */}
            <Collapse in={expanded}>{renderUpdateDetails()}</Collapse>

            {/* Summary Chips */}
            {!expanded && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {availableUpdates.slice(0, 8).map((update) => (
                  <Chip
                    key={update.id}
                    label={`${update.name} ${update.available_version}`}
                    size="small"
                    color={update.security_update ? "error" : "default"}
                    variant="outlined"
                    icon={
                      update.security_update ? <SecurityIcon /> : <UpdateIcon />
                    }
                  />
                ))}
                {availableUpdates.length > 8 && (
                  <Chip
                    label={`+${availableUpdates.length - 8} more`}
                    size="small"
                    variant="outlined"
                    onClick={() => setExpanded(true)}
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Fade>
    </>
  );
};

export default SystemUpdateNotification;

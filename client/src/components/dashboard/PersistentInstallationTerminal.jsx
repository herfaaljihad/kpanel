import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Minimize as MinimizeIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Terminal as TerminalIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../utils/api";

const PersistentInstallationTerminal = ({
  open,
  onClose,
  packages = [],
  onComplete,
  existingJobId = null,
}) => {
  const [jobId, setJobId] = useState(existingJobId);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("initializing");
  const [progress, setProgress] = useState(0);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [completedPackages, setCompletedPackages] = useState(0);
  const [totalPackages, setTotalPackages] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastLogIndex, setLastLogIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState(null);

  const terminalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [autoScroll]);

  // Start installation
  const startInstallation = useCallback(async () => {
    if (jobId || packages.length === 0) return;

    try {
      setStatus("starting");
      const response = await api.post("/installation/start", { packages });

      if (response.data.success) {
        setJobId(response.data.jobId);
        setStatus("running");
        // Store job ID in localStorage for persistence
        localStorage.setItem(
          "kpanel_current_installation",
          response.data.jobId
        );
      } else {
        throw new Error(
          response.data.message || "Failed to start installation"
        );
      }
    } catch (error) {
      console.error("Failed to start installation:", error);
      setError(error.message);
      setStatus("failed");
    }
  }, [jobId, packages]);

  // Poll for updates
  const pollUpdates = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await api.get(
        `/installation/realtime/${jobId}?lastLogIndex=${lastLogIndex}`
      );

      if (response.data.success) {
        const {
          logs: newLogs,
          status: newStatus,
          progress: newProgress,
          currentPackage: newCurrentPackage,
          completedPackages: newCompletedPackages,
          totalPackages: newTotalPackages,
          totalLogs,
        } = response.data;

        // Update logs
        if (newLogs && newLogs.length > 0) {
          setLogs((prevLogs) => [...prevLogs, ...newLogs]);
          setLastLogIndex(totalLogs);
        }

        // Update status and progress
        setStatus(newStatus);
        setProgress(newProgress);
        setCurrentPackage(newCurrentPackage);
        setCompletedPackages(newCompletedPackages);
        setTotalPackages(newTotalPackages);

        // Check if installation is complete
        if (
          newStatus === "completed" ||
          newStatus === "failed" ||
          newStatus === "cancelled"
        ) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // Remove from localStorage
          localStorage.removeItem("kpanel_current_installation");

          if (newStatus === "completed" && onComplete) {
            setTimeout(() => onComplete(), 2000);
          }
        }
      }
    } catch (error) {
      console.error("Failed to poll updates:", error);
      if (error.response?.status === 404) {
        // Job not found, might be completed or expired
        setStatus("completed");
        localStorage.removeItem("kpanel_current_installation");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }
  }, [jobId, lastLogIndex, onComplete]);

  // Cancel installation
  const cancelInstallation = useCallback(async () => {
    if (!jobId || status !== "running") return;

    try {
      await api.post(`/installation/cancel/${jobId}`);
      setStatus("cancelling");
    } catch (error) {
      console.error("Failed to cancel installation:", error);
    }
  }, [jobId, status]);

  // Resume existing installation
  const resumeInstallation = useCallback(async (existingJobId) => {
    try {
      const response = await api.get(`/installation/logs/${existingJobId}`);

      if (response.data.success) {
        setJobId(existingJobId);
        setLogs(response.data.logs || []);
        setStatus(response.data.status);
        setProgress(response.data.progress);
        setCurrentPackage(response.data.currentPackage);
        setCompletedPackages(response.data.completedPackages);
        setTotalPackages(response.data.totalPackages);
        setLastLogIndex(response.data.totalLogs);

        // Start polling if still running
        if (response.data.status === "running") {
          startPolling();
        }
      }
    } catch (error) {
      console.error("Failed to resume installation:", error);
      // If can't resume, remove from localStorage
      localStorage.removeItem("kpanel_current_installation");
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(pollUpdates, 1000);
  }, [pollUpdates]);

  // Initialize
  useEffect(() => {
    if (open) {
      // Check for existing installation in localStorage
      const existingJobId = localStorage.getItem("kpanel_current_installation");

      if (existingJobId && !jobId) {
        resumeInstallation(existingJobId);
      } else if (!existingJobId && !jobId && packages.length > 0) {
        startInstallation();
      }
    }
  }, [open, jobId, packages, resumeInstallation, startInstallation]);

  // Start polling when jobId is set
  useEffect(() => {
    if (jobId && status === "running") {
      startPolling();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, status, startPolling]);

  // Auto-scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  // Handle terminal scroll
  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  // Handle close
  const handleClose = () => {
    // Don't stop the installation, just close the dialog
    if (status === "running") {
      // Keep job ID in localStorage so it can be resumed
      if (jobId) {
        localStorage.setItem("kpanel_current_installation", jobId);
      }
    }
    onClose();
  };

  // Format log message
  const formatLogMessage = (log) => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    return `[${time}] ${log.message}`;
  };

  // Get log color based on level
  const getLogColor = (level) => {
    switch (level) {
      case "error":
        return "#ff6b6b";
      case "warning":
        return "#ffa726";
      case "success":
        return "#66bb6a";
      case "info":
      default:
        return "#e0e0e0";
    }
  };

  // Get status chip color
  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "primary";
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "cancelled":
        return "default";
      default:
        return "default";
    }
  };

  const canCancel = status === "running" && jobId;
  const isActive = ["running", "starting", "initializing"].includes(status);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isFullscreen ? false : "md"}
      fullWidth={!isFullscreen}
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          height: isMinimized ? "60px" : isFullscreen ? "100vh" : "600px",
          minHeight: isMinimized ? "60px" : "400px",
          bgcolor: "#1e1e1e",
          color: "#e0e0e0",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: "#2d2d2d",
          color: "#e0e0e0",
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: isMinimized ? "pointer" : "default",
        }}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon />
          <Typography variant="h6">KPanel Installation Terminal</Typography>
          <Chip
            label={status.toUpperCase()}
            color={getStatusColor()}
            size="small"
          />
          {isActive && (
            <PlayIcon
              sx={{
                color: "#4caf50",
                fontSize: 16,
                animation: "pulse 1s infinite",
              }}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            size="small"
            onClick={() => setIsMinimized(!isMinimized)}
            sx={{ color: "#e0e0e0" }}
          >
            <MinimizeIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setIsFullscreen(!isFullscreen)}
            sx={{ color: "#e0e0e0" }}
          >
            <FullscreenIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: "#e0e0e0" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {!isMinimized && (
        <>
          {/* Progress Bar */}
          <Box sx={{ px: 2, py: 1, bgcolor: "#2d2d2d" }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2">
                {currentPackage
                  ? `Installing: ${currentPackage}`
                  : "Preparing..."}
              </Typography>
              <Typography variant="body2">
                {completedPackages} / {totalPackages} packages
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                "& .MuiLinearProgress-bar": {
                  bgcolor: "#4caf50",
                },
              }}
            />
          </Box>

          <Divider sx={{ bgcolor: "#404040" }} />

          {/* Terminal Content */}
          <DialogContent
            sx={{
              p: 0,
              bgcolor: "#1e1e1e",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Paper
              ref={terminalRef}
              onScroll={handleScroll}
              sx={{
                flex: 1,
                bgcolor: "#1e1e1e",
                color: "#e0e0e0",
                p: 2,
                fontFamily: "monospace",
                fontSize: "14px",
                lineHeight: 1.4,
                overflow: "auto",
                border: "none",
                boxShadow: "none",
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#2d2d2d",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#555",
                  borderRadius: "4px",
                },
              }}
            >
              {error && (
                <Typography sx={{ color: "#ff6b6b", mb: 2 }}>
                  Error: {error}
                </Typography>
              )}

              {logs.map((log, index) => (
                <Typography
                  key={index}
                  sx={{
                    color: getLogColor(log.level),
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    mb: 0.5,
                    wordBreak: "break-all",
                  }}
                >
                  {formatLogMessage(log)}
                </Typography>
              ))}

              {isActive && (
                <Typography
                  sx={{
                    color: "#4caf50",
                    fontFamily: "monospace",
                    animation: "blink 1s infinite",
                  }}
                >
                  ▋
                </Typography>
              )}
            </Paper>
          </DialogContent>

          {/* Actions */}
          <DialogActions sx={{ bgcolor: "#2d2d2d", gap: 1 }}>
            {canCancel && (
              <Button
                onClick={cancelInstallation}
                startIcon={<StopIcon />}
                color="error"
                variant="outlined"
              >
                Cancel Installation
              </Button>
            )}

            <Button
              onClick={handleClose}
              variant="contained"
              color={isActive ? "secondary" : "primary"}
            >
              {isActive ? "Run in Background" : "Close"}
            </Button>
          </DialogActions>
        </>
      )}

      <style jsx>{`
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Dialog>
  );
};

export default PersistentInstallationTerminal;

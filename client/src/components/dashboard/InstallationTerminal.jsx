import {
  Close as CloseIcon,
  FullscreenExit as FullscreenExitIcon,
  Fullscreen as FullscreenIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

const InstallationTerminal = ({ open, onClose, packages = [], onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState("");
  const logEndRef = useRef(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const simulateInstallation = async () => {
    if (packages.length === 0) return;

    setIsRunning(true);
    setLogs([]);
    setProgress(0);

    // Initial logs
    const initialLogs = [
      "========================== KPanel System Update ==========================",
      `Starting installation of ${packages.length} package(s)...`,
      `Date: ${new Date().toLocaleString()}`,
      `User: admin@kpanel.local`,
      "========================================================================",
      "",
    ];

    for (const log of initialLogs) {
      setLogs((prev) => [
        ...prev,
        { text: log, type: "info", timestamp: new Date() },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Process each package
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      setCurrentPackage(pkg.name);

      const packageLogs = [
        `[${i + 1}/${packages.length}] Processing: ${pkg.name}`,
        `Current version: ${pkg.current_version}`,
        `Target version: ${pkg.available_version}`,
        `Package size: ${pkg.size}`,
        "",
      ];

      for (const log of packageLogs) {
        setLogs((prev) => [
          ...prev,
          { text: log, type: "info", timestamp: new Date() },
        ]);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Downloading phase
      setLogs((prev) => [
        ...prev,
        {
          text: `Downloading ${pkg.name}...`,
          type: "download",
          timestamp: new Date(),
        },
      ]);
      for (let j = 0; j <= 100; j += 20) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (j < 100) {
          setLogs((prev) => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1] = {
              text: `Downloading ${pkg.name}... ${j}%`,
              type: "download",
              timestamp: new Date(),
            };
            return newLogs;
          });
        }
      }
      setLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1] = {
          text: `✓ Downloaded ${pkg.name} successfully`,
          type: "success",
          timestamp: new Date(),
        };
        return newLogs;
      });

      // Installing phase
      setLogs((prev) => [
        ...prev,
        {
          text: `Installing ${pkg.name}...`,
          type: "install",
          timestamp: new Date(),
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Installation steps
      const installSteps = [
        "Preparing installation...",
        "Checking dependencies...",
        "Extracting files...",
        "Configuring package...",
        "Updating system files...",
        "Running post-installation scripts...",
      ];

      for (const step of installSteps) {
        setLogs((prev) => [
          ...prev,
          { text: `  ${step}`, type: "step", timestamp: new Date() },
        ]);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (pkg.security_update) {
        setLogs((prev) => [
          ...prev,
          {
            text: `⚡ Security update applied for ${pkg.name}`,
            type: "security",
            timestamp: new Date(),
          },
        ]);
      }

      if (pkg.requires_reboot) {
        setLogs((prev) => [
          ...prev,
          {
            text: `⚠️  ${pkg.name} requires system reboot`,
            type: "warning",
            timestamp: new Date(),
          },
        ]);
      }

      setLogs((prev) => [
        ...prev,
        {
          text: `✓ ${pkg.name} ${pkg.available_version} installed successfully`,
          type: "success",
          timestamp: new Date(),
        },
      ]);

      setLogs((prev) => [
        ...prev,
        { text: "", type: "info", timestamp: new Date() },
      ]);

      // Update progress
      setProgress(((i + 1) / packages.length) * 100);
    }

    // Final logs
    const finalLogs = [
      "========================================================================",
      "✓ All updates installed successfully!",
      `Total packages updated: ${packages.length}`,
      `Installation completed at: ${new Date().toLocaleString()}`,
      "",
      "Summary:",
      ...packages.map(
        (pkg) =>
          `  ✓ ${pkg.name}: ${pkg.current_version} → ${pkg.available_version}`
      ),
      "",
      "System update completed successfully!",
      "========================================================================",
    ];

    for (const log of finalLogs) {
      setLogs((prev) => [
        ...prev,
        {
          text: log,
          type: log.includes("✓") ? "success" : "info",
          timestamp: new Date(),
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsRunning(false);
    setCurrentPackage("");

    // Call completion callback
    if (onComplete) {
      setTimeout(() => onComplete(), 2000);
    }
  };

  useEffect(() => {
    if (open && packages.length > 0) {
      simulateInstallation();
    }
  }, [open, packages]);

  const getLogColor = (type) => {
    switch (type) {
      case "success":
        return "#4caf50";
      case "error":
        return "#f44336";
      case "warning":
        return "#ff9800";
      case "download":
        return "#2196f3";
      case "install":
        return "#9c27b0";
      case "security":
        return "#ff5722";
      case "step":
        return "#607d8b";
      default:
        return "#ffffff";
    }
  };

  const handleClose = () => {
    if (!isRunning) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isFullscreen ? false : "lg"}
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          minHeight: isFullscreen ? "100vh" : "600px",
          backgroundColor: "#1e1e1e",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#2d2d2d",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #444",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6">KPanel Installation Terminal</Typography>
          {currentPackage && (
            <Typography variant="body2" sx={{ ml: 2, color: "#90caf9" }}>
              Installing: {currentPackage}
            </Typography>
          )}
        </Box>
        <Box>
          <IconButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            sx={{ color: "#ffffff", mr: 1 }}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton
            onClick={handleClose}
            disabled={isRunning}
            sx={{ color: isRunning ? "#666" : "#ffffff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          backgroundColor: "#1e1e1e",
          color: "#ffffff",
          fontFamily: "Consolas, Monaco, monospace",
          fontSize: "12px",
          padding: 0,
          height: isFullscreen ? "calc(100vh - 120px)" : "500px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            overflowY: "auto",
            padding: 2,
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#2d2d2d",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#555",
              borderRadius: "4px",
            },
          }}
        >
          {logs.map((log, index) => (
            <Box
              key={index}
              sx={{
                marginBottom: "2px",
                wordBreak: "break-word",
                color: getLogColor(log.type),
                fontWeight:
                  log.type === "success" || log.type === "error"
                    ? "bold"
                    : "normal",
              }}
            >
              {log.text}
            </Box>
          ))}
          <div ref={logEndRef} />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          backgroundColor: "#2d2d2d",
          borderTop: "1px solid #444",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", color: "#ffffff" }}>
          {isRunning && (
            <>
              <Typography variant="body2" sx={{ mr: 2 }}>
                Progress: {Math.round(progress)}%
              </Typography>
              <Box
                sx={{
                  width: 200,
                  height: 8,
                  backgroundColor: "#444",
                  borderRadius: 4,
                  overflow: "hidden",
                  mr: 2,
                }}
              >
                <Box
                  sx={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#4caf50",
                    transition: "width 0.3s ease",
                  }}
                />
              </Box>
            </>
          )}
        </Box>
        <Button
          onClick={handleClose}
          disabled={isRunning}
          variant="contained"
          color="primary"
        >
          {isRunning ? "Installing..." : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallationTerminal;

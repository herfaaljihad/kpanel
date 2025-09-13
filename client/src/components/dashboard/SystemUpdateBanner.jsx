import { Alert, Box, Button, Typography } from "@mui/material";
import { useSystemUpdates } from "../../hooks/useSystemUpdates";

function SystemUpdateBanner({ onTabChange }) {
  const { updatesAvailable } = useSystemUpdates();

  // Only show banner if there are updates available
  if (updatesAvailable === 0) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body1">
          {updatesAvailable} system update{updatesAvailable > 1 ? "s" : ""}{" "}
          available
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onTabChange && onTabChange("system-updates")}
        >
          View Updates
        </Button>
      </Box>
    </Alert>
  );
}

export default SystemUpdateBanner;

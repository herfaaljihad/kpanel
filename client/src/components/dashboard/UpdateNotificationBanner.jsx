import React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";

export default function UpdateNotificationBanner({ onTabChange }) {
  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body1">
          System updates are available
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

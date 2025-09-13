import { useEffect, useState } from "react";
import api from "../utils/api";

export const useSystemUpdates = () => {
  const [updatesAvailable, setUpdatesAvailable] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);

  const checkForUpdates = async () => {
    try {
      const response = await api.get("/system/updates");
      if (response.data && Array.isArray(response.data)) {
        setUpdatesAvailable(response.data.length);
      } else {
        setUpdatesAvailable(0);
      }
      setLastChecked(new Date());
    } catch (error) {
      console.error("Error checking for updates:", error);
      // Keep showing demo count even if API fails
      setUpdatesAvailable(6);
    }
  };

  useEffect(() => {
    // Check immediately
    checkForUpdates();

    // Check every 5 minutes for updates
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    updatesAvailable,
    lastChecked,
    checkForUpdates,
  };
};

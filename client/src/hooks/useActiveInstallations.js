import { useCallback, useEffect, useState } from "react";
import api from "../utils/api";

export const useActiveInstallations = () => {
  const [activeInstallations, setActiveInstallations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check for active installations
  const checkActiveInstallations = useCallback(async () => {
    try {
      setLoading(true);

      // Check localStorage for current installation
      const currentJobId = localStorage.getItem("kpanel_current_installation");
      if (currentJobId) {
        const response = await api.get(`/installation/status/${currentJobId}`);
        if (response.data.success) {
          const job = response.data.job;
          if (["running", "starting"].includes(job.status)) {
            setActiveInstallations([job]);
            return;
          } else {
            // Installation completed or failed, remove from localStorage
            localStorage.removeItem("kpanel_current_installation");
          }
        } else {
          // Job not found, remove from localStorage
          localStorage.removeItem("kpanel_current_installation");
        }
      }

      // Get installation history to check for any recent running jobs
      const historyResponse = await api.get("/installation/history");
      if (historyResponse.data.success) {
        const runningJobs = historyResponse.data.jobs.filter((job) =>
          ["running", "starting"].includes(job.status)
        );
        setActiveInstallations(runningJobs);

        // If there's a running job, save it to localStorage
        if (runningJobs.length > 0) {
          localStorage.setItem(
            "kpanel_current_installation",
            runningJobs[0].id
          );
        }
      }
    } catch (error) {
      console.error("Failed to check active installations:", error);
      setActiveInstallations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get installation status
  const getInstallationStatus = useCallback(async (jobId) => {
    try {
      const response = await api.get(`/installation/status/${jobId}`);
      return response.data.success ? response.data.job : null;
    } catch (error) {
      console.error("Failed to get installation status:", error);
      return null;
    }
  }, []);

  // Check if there's an active installation
  const hasActiveInstallation = activeInstallations.length > 0;

  // Get the current active installation
  const currentInstallation = activeInstallations[0] || null;

  // Initialize on mount
  useEffect(() => {
    checkActiveInstallations();

    // Check every 30 seconds for active installations
    const interval = setInterval(checkActiveInstallations, 30000);

    return () => clearInterval(interval);
  }, [checkActiveInstallations]);

  return {
    activeInstallations,
    hasActiveInstallation,
    currentInstallation,
    loading,
    checkActiveInstallations,
    getInstallationStatus,
  };
};

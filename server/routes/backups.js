// Backup Management Route - System Integration
// server/routes/backups.js

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const backupService = require("../services/backupService");
const { logger } = require("../utils/logger");
const { validateRequest } = require("../utils/validation");
const router = express.Router();

// Get all backups for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;

    logger.info("Backup listing requested", {
      userId: req.user.userId,
      email: req.user.email,
      type: type,
      status: status,
      limit: limit,
    });

    const result = await backupService.listBackups(req.user.email, {
      type,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      backups: result.backups,
      totalBackups: result.totalBackups,
      totalSize: result.totalSize,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.totalBackups,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Backup listing error", {
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to list backups",
    });
  }
});

// Get backup details
router.get("/:backupId", authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;

    logger.info("Backup details requested", {
      userId: req.user.userId,
      email: req.user.email,
      backupId: backupId,
    });

    const result = await backupService.getBackupDetails(
      req.user.email,
      backupId
    );

    res.json({
      success: true,
      backup: result.backup,
    });
  } catch (error) {
    logger.error("Backup details error", {
      userId: req.user.userId,
      backupId: req.params.backupId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to get backup details",
    });
  }
});

// Create new backup
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      type,
      target,
      name,
      description,
      includeFiles = true,
      includeDatabases = true,
      compression = "gzip",
      encryption = false,
    } = req.body;

    const validation = validateRequest(req.body, ["type", "target", "name"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Backup creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      type: type,
      target: target,
      name: name,
    });

    const result = await backupService.createBackup(req.user.email, {
      type,
      target,
      name,
      description,
      includeFiles,
      includeDatabases,
      compression,
      encryption,
    });

    res.json({
      success: true,
      backup: result.backup,
      message: "Backup creation started",
    });
  } catch (error) {
    logger.error("Backup creation error", {
      userId: req.user.userId,
      type: req.body.type,
      target: req.body.target,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("Invalid target")) {
      return res.status(400).json({
        success: false,
        error: "Invalid backup target",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create backup",
    });
  }
});

// Restore from backup
router.post("/:backupId/restore", authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;
    const {
      target,
      confirm,
      restoreFiles = true,
      restoreDatabases = true,
      overwrite = false,
    } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: "Restore must be confirmed",
      });
    }

    logger.info("Backup restore requested", {
      userId: req.user.userId,
      email: req.user.email,
      backupId: backupId,
      target: target,
    });

    const result = await backupService.restoreBackup(req.user.email, backupId, {
      target,
      restoreFiles,
      restoreDatabases,
      overwrite,
    });

    res.json({
      success: true,
      backupId: backupId,
      restoreJob: result.restoreJob,
      message: "Restore operation started",
    });
  } catch (error) {
    logger.error("Backup restore error", {
      userId: req.user.userId,
      backupId: req.params.backupId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to restore backup",
    });
  }
});

// Delete backup
router.delete("/:backupId", authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: "Deletion must be confirmed",
      });
    }

    logger.info("Backup deletion requested", {
      userId: req.user.userId,
      email: req.user.email,
      backupId: backupId,
    });

    await backupService.deleteBackup(req.user.email, backupId);

    res.json({
      success: true,
      backupId: backupId,
      message: "Backup deleted successfully",
    });
  } catch (error) {
    logger.error("Backup deletion error", {
      userId: req.user.userId,
      backupId: req.params.backupId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete backup",
    });
  }
});

// Download backup
router.get("/:backupId/download", authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;

    logger.info("Backup download requested", {
      userId: req.user.userId,
      email: req.user.email,
      backupId: backupId,
    });

    const result = await backupService.downloadBackup(req.user.email, backupId);

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Length", result.size);

    // Stream backup file to response
    result.stream.pipe(res);
  } catch (error) {
    logger.error("Backup download error", {
      userId: req.user.userId,
      backupId: req.params.backupId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Backup not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to download backup",
    });
  }
});

// Get backup schedules
router.get("/schedules", authenticateToken, async (req, res) => {
  try {
    logger.info("Backup schedules requested", {
      userId: req.user.userId,
      email: req.user.email,
    });

    const result = await backupService.getBackupSchedules(req.user.email);

    res.json({
      success: true,
      schedules: result.schedules,
      totalSchedules: result.totalSchedules,
      activeSchedules: result.activeSchedules,
    });
  } catch (error) {
    logger.error("Backup schedules error", {
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to get backup schedules",
    });
  }
});

// Create backup schedule
router.post("/schedules", authenticateToken, async (req, res) => {
  try {
    const { name, cronExpression, type, target, settings = {} } = req.body;

    const validation = validateRequest(req.body, [
      "name",
      "cronExpression",
      "type",
      "target",
    ]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Backup schedule creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      name: name,
      cronExpression: cronExpression,
      type: type,
    });

    const result = await backupService.createBackupSchedule(req.user.email, {
      name,
      cronExpression,
      type,
      target,
      settings,
    });

    res.json({
      success: true,
      schedule: result.schedule,
      message: "Backup schedule created successfully",
    });
  } catch (error) {
    logger.error("Backup schedule creation error", {
      userId: req.user.userId,
      name: req.body.name,
      error: error.message,
    });

    if (error.message.includes("Invalid cron")) {
      return res.status(400).json({
        success: false,
        error: "Invalid cron expression",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create backup schedule",
    });
  }
});

// Update backup schedule
router.put("/schedules/:scheduleId", authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { name, cronExpression, enabled, settings = {} } = req.body;

    logger.info("Backup schedule update requested", {
      userId: req.user.userId,
      email: req.user.email,
      scheduleId: scheduleId,
    });

    const result = await backupService.updateBackupSchedule(
      req.user.email,
      scheduleId,
      {
        name,
        cronExpression,
        enabled,
        settings,
      }
    );

    res.json({
      success: true,
      schedule: result.schedule,
      message: "Backup schedule updated successfully",
    });
  } catch (error) {
    logger.error("Backup schedule update error", {
      userId: req.user.userId,
      scheduleId: req.params.scheduleId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update backup schedule",
    });
  }
});

// Delete backup schedule
router.delete("/schedules/:scheduleId", authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    logger.info("Backup schedule deletion requested", {
      userId: req.user.userId,
      email: req.user.email,
      scheduleId: scheduleId,
    });

    await backupService.deleteBackupSchedule(req.user.email, scheduleId);

    res.json({
      success: true,
      scheduleId: scheduleId,
      message: "Backup schedule deleted successfully",
    });
  } catch (error) {
    logger.error("Backup schedule deletion error", {
      userId: req.user.userId,
      scheduleId: req.params.scheduleId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Schedule not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete backup schedule",
    });
  }
});

// Get backup jobs/status
router.get("/jobs", authenticateToken, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    logger.info("Backup jobs requested", {
      userId: req.user.userId,
      email: req.user.email,
      status: status,
    });

    const result = await backupService.getBackupJobs(req.user.email, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      jobs: result.jobs,
      totalJobs: result.totalJobs,
      runningJobs: result.runningJobs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.totalJobs,
      },
    });
  } catch (error) {
    logger.error("Backup jobs error", {
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to get backup jobs",
    });
  }
});

// Cancel backup job
router.post("/jobs/:jobId/cancel", authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;

    logger.info("Backup job cancellation requested", {
      userId: req.user.userId,
      email: req.user.email,
      jobId: jobId,
    });

    await backupService.cancelBackupJob(req.user.email, jobId);

    res.json({
      success: true,
      jobId: jobId,
      message: "Backup job cancelled successfully",
    });
  } catch (error) {
    logger.error("Backup job cancellation error", {
      userId: req.user.userId,
      jobId: req.params.jobId,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to cancel backup job",
    });
  }
});

module.exports = router;

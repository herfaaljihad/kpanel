const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");
const { spawn } = require("child_process");

// Cron Jobs Management - DirectAdmin Style

// Get all cron jobs for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cronJobs = await queryHelpers.findMany(
      "cron_jobs",
      { user_id: userId },
      { orderBy: "created_at DESC" }
    );

    res.json({
      success: true,
      data: {
        cron_jobs: cronJobs.map((job) => ({
          id: job.id,
          name: job.name,
          command: job.command,
          schedule: job.schedule,
          schedule_description: parseScheduleDescription(job.schedule),
          timezone: job.timezone,
          enabled: job.enabled,
          last_run: job.last_run,
          next_run: job.next_run,
          last_exit_code: job.last_exit_code,
          last_output: job.last_output
            ? job.last_output.substring(0, 200) + "..."
            : null,
          created_at: job.created_at,
        })),
        summary: {
          total_jobs: cronJobs.length,
          enabled_jobs: cronJobs.filter((j) => j.enabled).length,
          disabled_jobs: cronJobs.filter((j) => !j.enabled).length,
          recent_failures: cronJobs.filter((j) => j.last_exit_code > 0).length,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching cron jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cron jobs",
    });
  }
});

// Create new cron job
router.post(
  "/",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("name", body.name, {
      minLength: 1,
      maxLength: 255,
    });
    validator.validateString("command", body.command, { minLength: 1 });
    validator.validateString("schedule", body.schedule);
  }),
  async (req, res) => {
    try {
      const {
        name,
        command,
        schedule,
        timezone = "UTC",
        enabled = true,
      } = req.body;
      const userId = req.user.id;

      // Validate cron schedule format
      if (!isValidCronSchedule(schedule)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid cron schedule format. Use standard cron format: 'minute hour day month weekday'",
        });
      }

      // Check for duplicate job names
      const existingJob = await queryHelpers.findOne("cron_jobs", {
        user_id: userId,
        name: name,
      });

      if (existingJob) {
        return res.status(409).json({
          success: false,
          message: "Cron job with this name already exists",
        });
      }

      // Calculate next run time
      const nextRun = calculateNextRun(schedule, timezone);

      // Create cron job
      const cronJob = await queryHelpers.create("cron_jobs", {
        user_id: userId,
        name: name,
        command: command,
        schedule: schedule,
        timezone: timezone,
        enabled: enabled,
        next_run: nextRun,
        created_at: new Date().toISOString(),
      });

      logger.info(`Cron job created: ${name}`, {
        userId,
        cronJobId: cronJob.id,
        schedule: schedule,
      });

      res.status(201).json({
        success: true,
        message: "Cron job created successfully",
        data: {
          id: cronJob.id,
          name: name,
          command: command,
          schedule: schedule,
          schedule_description: parseScheduleDescription(schedule),
          timezone: timezone,
          enabled: enabled,
          next_run: nextRun,
        },
      });
    } catch (error) {
      logger.error("Error creating cron job:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create cron job",
      });
    }
  }
);

// Update cron job
router.put(
  "/:id",
  authenticateToken,
  validateRequest((validator, body) => {
    if (body.name) {
      validator.validateString("name", body.name, {
        minLength: 1,
        maxLength: 255,
      });
    }
    if (body.command) {
      validator.validateString("command", body.command, { minLength: 1 });
    }
    if (body.schedule) {
      validator.validateString("schedule", body.schedule);
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, command, schedule, timezone, enabled } = req.body;
      const userId = req.user.id;

      // Verify cron job ownership
      const cronJob = await queryHelpers.findOne("cron_jobs", {
        id,
        user_id: userId,
      });

      if (!cronJob) {
        return res.status(404).json({
          success: false,
          message: "Cron job not found or access denied",
        });
      }

      // Prepare update data
      const updateData = {};

      if (name && name !== cronJob.name) {
        // Check for duplicate names
        const existingJob = await queryHelpers.findOne("cron_jobs", {
          user_id: userId,
          name: name,
        });

        if (existingJob && existingJob.id !== parseInt(id)) {
          return res.status(409).json({
            success: false,
            message: "Cron job with this name already exists",
          });
        }
        updateData.name = name;
      }

      if (command) updateData.command = command;
      if (timezone) updateData.timezone = timezone;
      if (enabled !== undefined) updateData.enabled = enabled;

      if (schedule) {
        if (!isValidCronSchedule(schedule)) {
          return res.status(400).json({
            success: false,
            message: "Invalid cron schedule format",
          });
        }
        updateData.schedule = schedule;
        updateData.next_run = calculateNextRun(
          schedule,
          timezone || cronJob.timezone
        );
      }

      updateData.updated_at = new Date().toISOString();

      // Update cron job
      await queryHelpers.update("cron_jobs", { id }, updateData);

      logger.info(`Cron job updated: ${cronJob.name}`, {
        userId,
        cronJobId: id,
        changes: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: "Cron job updated successfully",
      });
    } catch (error) {
      logger.error("Error updating cron job:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update cron job",
      });
    }
  }
);

// Delete cron job
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify cron job ownership
    const cronJob = await queryHelpers.findOne("cron_jobs", {
      id,
      user_id: userId,
    });

    if (!cronJob) {
      return res.status(404).json({
        success: false,
        message: "Cron job not found or access denied",
      });
    }

    // Delete cron job
    await queryHelpers.delete("cron_jobs", { id });

    logger.info(`Cron job deleted: ${cronJob.name}`, {
      userId,
      cronJobId: id,
    });

    res.json({
      success: true,
      message: "Cron job deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting cron job:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete cron job",
    });
  }
});

// Get cron job details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const cronJob = await queryHelpers.findOne("cron_jobs", {
      id,
      user_id: userId,
    });

    if (!cronJob) {
      return res.status(404).json({
        success: false,
        message: "Cron job not found or access denied",
      });
    }

    res.json({
      success: true,
      data: {
        id: cronJob.id,
        name: cronJob.name,
        command: cronJob.command,
        schedule: cronJob.schedule,
        schedule_description: parseScheduleDescription(cronJob.schedule),
        timezone: cronJob.timezone,
        enabled: cronJob.enabled,
        last_run: cronJob.last_run,
        next_run: cronJob.next_run,
        last_output: cronJob.last_output,
        last_exit_code: cronJob.last_exit_code,
        created_at: cronJob.created_at,
        updated_at: cronJob.updated_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching cron job details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cron job details",
    });
  }
});

// Run cron job manually
router.post("/:id/run", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const cronJob = await queryHelpers.findOne("cron_jobs", {
      id,
      user_id: userId,
    });

    if (!cronJob) {
      return res.status(404).json({
        success: false,
        message: "Cron job not found or access denied",
      });
    }

    // Start async execution
    setTimeout(() => {
      executeCronJob(cronJob).catch((error) => {
        logger.error("Manual cron job execution failed:", error);
      });
    }, 100);

    logger.info(`Manual cron job execution started: ${cronJob.name}`, {
      userId,
      cronJobId: id,
    });

    res.status(202).json({
      success: true,
      message: "Cron job execution started",
      data: {
        job_id: id,
        status: "running",
      },
    });
  } catch (error) {
    logger.error("Error starting manual cron job execution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start cron job execution",
    });
  }
});

// Get cron job execution logs
router.get("/:id/logs", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const cronJob = await queryHelpers.findOne("cron_jobs", {
      id,
      user_id: userId,
    });

    if (!cronJob) {
      return res.status(404).json({
        success: false,
        message: "Cron job not found or access denied",
      });
    }

    // Mock execution history (in production, store in separate table)
    const executions = [];
    const executionCount = Math.min(parseInt(limit), 50);

    for (let i = 0; i < executionCount; i++) {
      const timestamp = new Date(
        Date.now() - (i * 24 * 60 * 60 * 1000 + Math.random() * 60 * 60 * 1000)
      );
      const exitCode = Math.random() > 0.9 ? 1 : 0; // 10% failure rate

      executions.push({
        id: i + 1,
        started_at: timestamp.toISOString(),
        completed_at: new Date(
          timestamp.getTime() + Math.random() * 30000
        ).toISOString(),
        exit_code: exitCode,
        output:
          exitCode === 0
            ? `Job executed successfully at ${timestamp.toISOString()}`
            : `Error: Command failed with exit code ${exitCode}`,
        duration: Math.floor(Math.random() * 30000), // Duration in ms
        trigger: Math.random() > 0.8 ? "manual" : "scheduled",
      });
    }

    res.json({
      success: true,
      data: {
        job_name: cronJob.name,
        executions: executions.sort(
          (a, b) => new Date(b.started_at) - new Date(a.started_at)
        ),
        summary: {
          total_executions: executions.length,
          successful: executions.filter((e) => e.exit_code === 0).length,
          failed: executions.filter((e) => e.exit_code !== 0).length,
          avg_duration: Math.floor(
            executions.reduce((sum, e) => sum + e.duration, 0) /
              executions.length
          ),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching cron job logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cron job logs",
    });
  }
});

// Helper functions

function isValidCronSchedule(schedule) {
  // Basic cron format validation: minute hour day month weekday
  const cronRegex =
    /^(\*|[0-5]?\d|\*\/\d+|\d+(-\d+)?)(,(\*|[0-5]?\d|\*\/\d+|\d+(-\d+)?))* (\*|[01]?\d|2[0-3]|\*\/\d+|\d+(-\d+)?)(,(\*|[01]?\d|2[0-3]|\*\/\d+|\d+(-\d+)?))* (\*|[12]?\d|3[01]|\*\/\d+|\d+(-\d+)?)(,(\*|[12]?\d|3[01]|\*\/\d+|\d+(-\d+)?))* (\*|[0-9]|1[0-2]|\*\/\d+|\d+(-\d+)?)(,(\*|[0-9]|1[0-2]|\*\/\d+|\d+(-\d+)?))* (\*|[0-6]|\*\/\d+|\d+(-\d+)?)(,(\*|[0-6]|\*\/\d+|\d+(-\d+)?))*$/;
  return cronRegex.test(schedule.trim());
}

function parseScheduleDescription(schedule) {
  const parts = schedule.split(" ");
  if (parts.length !== 5) return "Invalid schedule";

  const [minute, hour, day, month, weekday] = parts;

  // Common patterns
  if (schedule === "0 0 * * *") return "Daily at midnight";
  if (schedule === "0 0 * * 0") return "Weekly on Sunday at midnight";
  if (schedule === "0 0 1 * *") return "Monthly on the 1st at midnight";
  if (schedule === "*/5 * * * *") return "Every 5 minutes";
  if (schedule === "0 */1 * * *") return "Every hour";
  if (schedule === "0 */6 * * *") return "Every 6 hours";
  if (schedule === "0 9 * * 1-5") return "Weekdays at 9:00 AM";

  return `At ${hour}:${minute.padStart(
    2,
    "0"
  )} on day ${day} of month ${month}, weekday ${weekday}`;
}

function calculateNextRun(schedule, timezone) {
  // Simplified next run calculation (in production, use a proper cron library)
  const now = new Date();
  const nextRun = new Date(now.getTime() + 60 * 60 * 1000); // Next hour as default
  return nextRun.toISOString();
}

async function executeCronJob(cronJob) {
  try {
    const startTime = new Date();

    logger.info(`Executing cron job: ${cronJob.name}`, {
      jobId: cronJob.id,
      command: cronJob.command,
    });

    // Update last run time
    await queryHelpers.update(
      "cron_jobs",
      { id: cronJob.id },
      {
        last_run: startTime.toISOString(),
      }
    );

    // Mock command execution (in production, execute actual command)
    const mockExecution = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          // 90% success rate
          resolve({
            stdout: `Cron job '${
              cronJob.name
            }' executed successfully at ${startTime.toISOString()}`,
            stderr: "",
            exitCode: 0,
          });
        } else {
          reject(new Error("Mock command execution failed"));
        }
      }, Math.random() * 5000 + 1000); // 1-6 seconds execution time
    });

    const result = await mockExecution;

    // Update job with success
    await queryHelpers.update(
      "cron_jobs",
      { id: cronJob.id },
      {
        last_output: result.stdout,
        last_exit_code: result.exitCode,
        next_run: calculateNextRun(cronJob.schedule, cronJob.timezone),
      }
    );

    logger.info(`Cron job completed successfully: ${cronJob.name}`, {
      jobId: cronJob.id,
      duration: Date.now() - startTime.getTime(),
    });
  } catch (error) {
    // Update job with failure
    await queryHelpers.update(
      "cron_jobs",
      { id: cronJob.id },
      {
        last_output: error.message,
        last_exit_code: 1,
        next_run: calculateNextRun(cronJob.schedule, cronJob.timezone),
      }
    );

    logger.error(`Cron job failed: ${cronJob.name}`, {
      jobId: cronJob.id,
      error: error.message,
    });

    throw error;
  }
}

module.exports = router;


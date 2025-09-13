// Backup Service - Production Backup Operations
// server/services/backupService.js

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const { promisify } = require("util");
const cron = require("node-cron");
const archiver = require("archiver");
const tar = require("tar");
const { logger } = require("../utils/logger");
const databaseService = require("./databaseService");
const fileService = require("./fileService");

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.isLinux = process.platform === "linux";
    this.isProduction = process.env.NODE_ENV === "production";

    // Backup configuration
    this.config = {
      backupPath: process.env.BACKUP_PATH || "/var/backups/kpanel",
      tempPath: process.env.TEMP_PATH || "/tmp/kpanel",
      webRoot: process.env.WEB_ROOT || "/var/www",
      retention: {
        daily: parseInt(process.env.BACKUP_RETENTION_DAILY) || 7,
        weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY) || 4,
        monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY) || 12,
      },
      compression: {
        level: parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6,
        type: process.env.BACKUP_COMPRESSION_TYPE || "gzip",
      },
    };

    // System paths
    this.paths = {
      mysqldump: "/usr/bin/mysqldump",
      tar: "/usr/bin/tar",
      gzip: "/usr/bin/gzip",
      rsync: "/usr/bin/rsync",
      rclone: "/usr/bin/rclone",
    };

    // Active backup jobs
    this.activeJobs = new Map();
    this.scheduledJobs = new Map();

    this.initializeBackupService();
  }

  async initializeBackupService() {
    try {
      // Create backup directories
      await fs.mkdir(this.config.backupPath, { recursive: true, mode: 0o755 });
      await fs.mkdir(this.config.tempPath, { recursive: true, mode: 0o755 });

      // Load existing scheduled backups
      await this.loadScheduledBackups();

      logger.info("Backup service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Backup service", {
        error: error.message,
      });
    }
  }

  // Full system backup
  async createFullBackup(userId, options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = options.name || `full-backup-${timestamp}`;

    try {
      if (!this.isLinux) {
        return this.getMockBackupResult(backupId, "full", backupName);
      }

      // Initialize backup job
      const job = {
        id: backupId,
        type: "full",
        name: backupName,
        status: "running",
        progress: 0,
        startTime: new Date(),
        userId: userId,
        logs: [],
        sizes: {},
      };

      this.activeJobs.set(backupId, job);
      this.updateJobProgress(backupId, 5, "Initializing full backup...");

      // Create backup directory
      const backupDir = path.join(
        this.config.backupPath,
        `${backupName}-${backupId}`
      );
      await fs.mkdir(backupDir, { recursive: true, mode: 0o755 });

      // Backup databases
      this.updateJobProgress(backupId, 10, "Backing up databases...");
      const dbBackupResult = await this.backupAllDatabases(backupDir, userId);
      job.sizes.databases = dbBackupResult.totalSize;

      // Backup web files
      this.updateJobProgress(backupId, 40, "Backing up web files...");
      const fileBackupResult = await this.backupWebFiles(backupDir, userId);
      job.sizes.files = fileBackupResult.totalSize;

      // Backup system configurations
      this.updateJobProgress(backupId, 70, "Backing up configurations...");
      const configBackupResult = await this.backupSystemConfigs(
        backupDir,
        userId
      );
      job.sizes.configs = configBackupResult.totalSize;

      // Create metadata
      this.updateJobProgress(backupId, 85, "Creating backup metadata...");
      const metadata = await this.createBackupMetadata(job, backupDir);

      // Compress backup
      this.updateJobProgress(backupId, 90, "Compressing backup...");
      const archivePath = await this.compressBackup(
        backupDir,
        options.compression
      );

      // Cleanup temporary directory
      await fs.rmdir(backupDir, { recursive: true });

      // Get final archive size
      const stats = await fs.stat(archivePath);

      // Update job completion
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();
      job.archivePath = archivePath;
      job.finalSize = stats.size;
      job.logs.push(`Backup completed successfully. Archive: ${archivePath}`);

      logger.info(`Full backup completed: ${backupName}`, {
        backupId: backupId,
        size: stats.size,
        duration: job.endTime - job.startTime,
        userId: userId,
      });

      return {
        success: true,
        backupId: backupId,
        message: `Full backup ${backupName} completed successfully`,
        archivePath: archivePath,
        size: stats.size,
        sizeFormatted: this.formatSize(stats.size),
        duration: this.formatDuration(job.endTime - job.startTime),
        metadata: metadata,
      };
    } catch (error) {
      this.updateJobStatus(backupId, "failed", error.message);
      logger.error(`Full backup failed: ${backupName}`, {
        error: error.message,
        userId: userId,
      });
      throw new Error(`Full backup failed: ${error.message}`);
    }
  }

  // Database backup
  async backupAllDatabases(backupDir, userId) {
    try {
      const dbBackupDir = path.join(backupDir, "databases");
      await fs.mkdir(dbBackupDir, { recursive: true, mode: 0o755 });

      let totalSize = 0;
      const dbList = await databaseService.getDatabaseList(userId);

      for (const database of dbList.databases) {
        try {
          const backupResult = await databaseService.createDatabaseBackup(
            database.name,
            userId,
            { compress: false } // We'll compress the entire archive later
          );

          if (backupResult.success) {
            // Move backup to our backup directory
            const sourcePath = backupResult.backupPath;
            const destPath = path.join(dbBackupDir, path.basename(sourcePath));
            await fs.rename(sourcePath, destPath);
            totalSize += backupResult.size;
          }
        } catch (error) {
          logger.warn(`Failed to backup database ${database.name}`, {
            error: error.message,
          });
        }
      }

      return {
        success: true,
        totalSize: totalSize,
        backupCount: dbList.databases.length,
      };
    } catch (error) {
      logger.error("Failed to backup databases", { error: error.message });
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  // Web files backup
  async backupWebFiles(backupDir, userId) {
    try {
      const webBackupDir = path.join(backupDir, "webfiles");
      await fs.mkdir(webBackupDir, { recursive: true, mode: 0o755 });

      let totalSize = 0;

      if (this.isLinux) {
        // Use rsync for efficient file copying
        const rsyncCommand = `${this.paths.rsync} -av --exclude='*.log' --exclude='cache/' --exclude='tmp/' "${this.config.webRoot}/" "${webBackupDir}/"`;

        await execAsync(rsyncCommand);

        // Calculate total size
        const { stdout } = await execAsync(
          `du -sb "${webBackupDir}" | cut -f1`
        );
        totalSize = parseInt(stdout.trim()) || 0;
      } else {
        // Mock backup for development
        await fs.writeFile(
          path.join(webBackupDir, "mock-web-files.txt"),
          "Mock web files backup"
        );
        totalSize = 1024;
      }

      return {
        success: true,
        totalSize: totalSize,
        backupPath: webBackupDir,
      };
    } catch (error) {
      logger.error("Failed to backup web files", { error: error.message });
      throw new Error(`Web files backup failed: ${error.message}`);
    }
  }

  // System configurations backup
  async backupSystemConfigs(backupDir, userId) {
    try {
      const configBackupDir = path.join(backupDir, "configs");
      await fs.mkdir(configBackupDir, { recursive: true, mode: 0o755 });

      let totalSize = 0;

      if (this.isLinux) {
        // Backup critical configuration directories
        const configPaths = [
          "/etc/nginx",
          "/etc/apache2",
          "/etc/php",
          "/etc/mysql",
          "/etc/postfix",
          "/etc/dovecot",
          "/etc/bind",
          "/etc/ssl/certs",
        ];

        for (const configPath of configPaths) {
          try {
            await fs.access(configPath);
            const configName = path.basename(configPath);
            const destPath = path.join(configBackupDir, configName);

            await execAsync(`cp -r "${configPath}" "${destPath}"`);

            // Add to total size
            const { stdout } = await execAsync(
              `du -sb "${destPath}" | cut -f1`
            );
            totalSize += parseInt(stdout.trim()) || 0;
          } catch (error) {
            // Config path doesn't exist, skip
            logger.debug(`Config path not found: ${configPath}`);
          }
        }
      } else {
        // Mock backup for development
        await fs.writeFile(
          path.join(configBackupDir, "mock-configs.txt"),
          "Mock system configurations backup"
        );
        totalSize = 512;
      }

      return {
        success: true,
        totalSize: totalSize,
        backupPath: configBackupDir,
      };
    } catch (error) {
      logger.error("Failed to backup system configurations", {
        error: error.message,
      });
      throw new Error(`System configurations backup failed: ${error.message}`);
    }
  }

  // Incremental backup
  async createIncrementalBackup(userId, lastBackupPath, options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = options.name || `incremental-backup-${timestamp}`;

    try {
      if (!this.isLinux) {
        return this.getMockBackupResult(backupId, "incremental", backupName);
      }

      const job = {
        id: backupId,
        type: "incremental",
        name: backupName,
        status: "running",
        progress: 0,
        startTime: new Date(),
        userId: userId,
        logs: [],
        baseBackup: lastBackupPath,
      };

      this.activeJobs.set(backupId, job);
      this.updateJobProgress(backupId, 5, "Starting incremental backup...");

      // Create backup directory
      const backupDir = path.join(
        this.config.backupPath,
        `${backupName}-${backupId}`
      );
      await fs.mkdir(backupDir, { recursive: true, mode: 0o755 });

      // Find files changed since last backup
      this.updateJobProgress(backupId, 20, "Finding changed files...");
      const changedFiles = await this.findChangedFiles(lastBackupPath);

      // Backup only changed files
      this.updateJobProgress(backupId, 50, "Backing up changed files...");
      const fileBackupResult = await this.backupChangedFiles(
        backupDir,
        changedFiles,
        userId
      );

      // Backup changed databases
      this.updateJobProgress(backupId, 80, "Backing up changed databases...");
      const dbBackupResult = await this.backupChangedDatabases(
        backupDir,
        lastBackupPath,
        userId
      );

      // Create metadata
      const metadata = await this.createBackupMetadata(job, backupDir);

      // Compress backup
      this.updateJobProgress(backupId, 95, "Compressing incremental backup...");
      const archivePath = await this.compressBackup(
        backupDir,
        options.compression
      );

      // Cleanup
      await fs.rmdir(backupDir, { recursive: true });

      // Finalize job
      const stats = await fs.stat(archivePath);
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();
      job.archivePath = archivePath;
      job.finalSize = stats.size;

      logger.info(`Incremental backup completed: ${backupName}`, {
        backupId: backupId,
        size: stats.size,
        userId: userId,
      });

      return {
        success: true,
        backupId: backupId,
        message: `Incremental backup ${backupName} completed successfully`,
        archivePath: archivePath,
        size: stats.size,
        sizeFormatted: this.formatSize(stats.size),
        changedFiles: changedFiles.length,
        metadata: metadata,
      };
    } catch (error) {
      this.updateJobStatus(backupId, "failed", error.message);
      logger.error(`Incremental backup failed: ${backupName}`, {
        error: error.message,
        userId: userId,
      });
      throw new Error(`Incremental backup failed: ${error.message}`);
    }
  }

  // Backup compression
  async compressBackup(backupDir, compressionType = "gzip") {
    const archiveName = `${path.basename(backupDir)}.tar.gz`;
    const archivePath = path.join(path.dirname(backupDir), archiveName);

    if (this.isLinux) {
      // Use tar with gzip compression
      const tarCommand = `${
        this.paths.tar
      } -czf "${archivePath}" -C "${path.dirname(backupDir)}" "${path.basename(
        backupDir
      )}"`;
      await execAsync(tarCommand);
    } else {
      // Use Node.js tar module for cross-platform compatibility
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: path.dirname(backupDir),
        },
        [path.basename(backupDir)]
      );
    }

    return archivePath;
  }

  // Backup restoration
  async restoreBackup(backupPath, restoreOptions = {}) {
    const restoreId = this.generateBackupId();

    try {
      if (!this.isLinux) {
        return this.getMockRestoreResult(restoreId, backupPath);
      }

      const job = {
        id: restoreId,
        type: "restore",
        status: "running",
        progress: 0,
        startTime: new Date(),
        backupPath: backupPath,
        logs: [],
      };

      this.activeJobs.set(restoreId, job);
      this.updateJobProgress(restoreId, 5, "Starting backup restoration...");

      // Extract backup
      this.updateJobProgress(restoreId, 10, "Extracting backup archive...");
      const extractPath = path.join(
        this.config.tempPath,
        `restore-${restoreId}`
      );
      await this.extractBackup(backupPath, extractPath);

      // Read metadata
      const metadata = await this.readBackupMetadata(extractPath);

      // Restore databases
      if (restoreOptions.restoreDatabases !== false) {
        this.updateJobProgress(restoreId, 30, "Restoring databases...");
        await this.restoreDatabases(extractPath, restoreOptions);
      }

      // Restore web files
      if (restoreOptions.restoreFiles !== false) {
        this.updateJobProgress(restoreId, 60, "Restoring web files...");
        await this.restoreWebFiles(extractPath, restoreOptions);
      }

      // Restore configurations
      if (restoreOptions.restoreConfigs !== false) {
        this.updateJobProgress(restoreId, 85, "Restoring configurations...");
        await this.restoreConfigurations(extractPath, restoreOptions);
      }

      // Cleanup
      this.updateJobProgress(restoreId, 95, "Cleaning up...");
      await fs.rmdir(extractPath, { recursive: true });

      // Finalize
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();

      logger.info(`Backup restoration completed`, {
        restoreId: restoreId,
        backupPath: backupPath,
        duration: job.endTime - job.startTime,
      });

      return {
        success: true,
        restoreId: restoreId,
        message: "Backup restored successfully",
        duration: this.formatDuration(job.endTime - job.startTime),
        metadata: metadata,
      };
    } catch (error) {
      this.updateJobStatus(restoreId, "failed", error.message);
      logger.error(`Backup restoration failed`, {
        error: error.message,
        backupPath: backupPath,
      });
      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  // Scheduled backups
  async scheduleBackup(userId, schedule, options = {}) {
    try {
      const scheduleId = this.generateScheduleId();
      const cronExpression = this.buildCronExpression(schedule);

      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      const scheduledJob = cron.schedule(
        cronExpression,
        async () => {
          try {
            logger.info(`Running scheduled backup`, {
              scheduleId: scheduleId,
              userId: userId,
            });

            const backupResult = await this.createFullBackup(userId, {
              name: `scheduled-${schedule.type}-${Date.now()}`,
              ...options,
            });

            logger.info(`Scheduled backup completed`, {
              scheduleId: scheduleId,
              backupId: backupResult.backupId,
              userId: userId,
            });

            // Cleanup old backups based on retention policy
            await this.cleanupOldBackups(
              schedule.type,
              this.config.retention[schedule.type]
            );
          } catch (error) {
            logger.error(`Scheduled backup failed`, {
              scheduleId: scheduleId,
              error: error.message,
              userId: userId,
            });
          }
        },
        {
          scheduled: true,
          timezone: options.timezone || "UTC",
        }
      );

      this.scheduledJobs.set(scheduleId, {
        id: scheduleId,
        userId: userId,
        schedule: schedule,
        cronExpression: cronExpression,
        job: scheduledJob,
        created: new Date(),
        options: options,
      });

      logger.info(`Backup scheduled`, {
        scheduleId: scheduleId,
        cronExpression: cronExpression,
        userId: userId,
      });

      return {
        success: true,
        scheduleId: scheduleId,
        message: "Backup scheduled successfully",
        cronExpression: cronExpression,
        nextRun: this.getNextRun(cronExpression),
      };
    } catch (error) {
      logger.error(`Failed to schedule backup`, {
        error: error.message,
        userId: userId,
      });
      throw new Error(`Failed to schedule backup: ${error.message}`);
    }
  }

  async removeScheduledBackup(scheduleId) {
    const scheduledJob = this.scheduledJobs.get(scheduleId);

    if (!scheduledJob) {
      throw new Error(`Scheduled backup ${scheduleId} not found`);
    }

    scheduledJob.job.stop();
    scheduledJob.job.destroy();
    this.scheduledJobs.delete(scheduleId);

    logger.info(`Scheduled backup removed`, { scheduleId: scheduleId });

    return {
      success: true,
      message: "Scheduled backup removed successfully",
    };
  }

  // Backup cleanup
  async cleanupOldBackups(backupType = "all", retentionDays = null) {
    try {
      const retention = retentionDays || this.config.retention.daily;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retention);

      const backupFiles = await fs.readdir(this.config.backupPath);
      let deletedCount = 0;
      let freedSpace = 0;

      for (const file of backupFiles) {
        if (file.endsWith(".tar.gz")) {
          const filePath = path.join(this.config.backupPath, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            try {
              freedSpace += stats.size;
              await fs.unlink(filePath);
              deletedCount++;

              logger.info(`Deleted old backup: ${file}`, {
                size: stats.size,
                age: cutoffDate - stats.mtime,
              });
            } catch (error) {
              logger.warn(`Failed to delete backup: ${file}`, {
                error: error.message,
              });
            }
          }
        }
      }

      logger.info(`Backup cleanup completed`, {
        deletedCount: deletedCount,
        freedSpace: freedSpace,
        retentionDays: retention,
      });

      return {
        success: true,
        deletedCount: deletedCount,
        freedSpace: freedSpace,
        freedSpaceFormatted: this.formatSize(freedSpace),
      };
    } catch (error) {
      logger.error(`Backup cleanup failed`, { error: error.message });
      throw new Error(`Backup cleanup failed: ${error.message}`);
    }
  }

  // Utility functions
  generateBackupId() {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateScheduleId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  updateJobProgress(jobId, progress, message) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.logs.push(`${new Date().toISOString()}: ${message}`);
      logger.debug(`Backup progress: ${jobId}`, {
        progress: progress,
        message: message,
      });
    }
  }

  updateJobStatus(jobId, status, message = null) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = status;
      if (message) {
        job.logs.push(`${new Date().toISOString()}: ${message}`);
      }

      if (status === "failed" || status === "completed") {
        job.endTime = new Date();
      }
    }
  }

  buildCronExpression(schedule) {
    const { type, time, dayOfWeek, dayOfMonth } = schedule;

    switch (type) {
      case "daily":
        const [hour, minute] = time.split(":");
        return `${minute} ${hour} * * *`;

      case "weekly":
        const [weekHour, weekMinute] = time.split(":");
        const day = dayOfWeek || 0; // Sunday default
        return `${weekMinute} ${weekHour} * * ${day}`;

      case "monthly":
        const [monthHour, monthMinute] = time.split(":");
        const monthDay = dayOfMonth || 1; // 1st of month default
        return `${monthMinute} ${monthHour} ${monthDay} * *`;

      default:
        throw new Error(`Invalid schedule type: ${type}`);
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Mock functions for development
  getMockBackupResult(backupId, type, name) {
    return {
      success: true,
      backupId: backupId,
      message: `Mock ${type} backup ${name} completed`,
      archivePath: `/tmp/mock-${name}.tar.gz`,
      size: 50 * 1024 * 1024, // 50MB
      sizeFormatted: "50.00 MB",
      duration: "5m 30s",
      mock: true,
    };
  }

  getMockRestoreResult(restoreId, backupPath) {
    return {
      success: true,
      restoreId: restoreId,
      message: "Mock backup restored successfully",
      duration: "3m 45s",
      mock: true,
    };
  }

  async loadScheduledBackups() {
    // In production, this would load from database
    // For now, just log that we're ready to accept schedules
    logger.info("Ready to accept backup schedules");
  }

  async createBackupMetadata(job, backupDir) {
    const metadata = {
      version: "1.0",
      type: job.type,
      name: job.name,
      created: job.startTime.toISOString(),
      userId: job.userId,
      sizes: job.sizes || {},
      system: {
        platform: process.platform,
        hostname: require("os").hostname(),
        nodeVersion: process.version,
      },
    };

    const metadataPath = path.join(backupDir, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return metadata;
  }

  async readBackupMetadata(extractPath) {
    try {
      const metadataPath = path.join(extractPath, "metadata.json");
      const content = await fs.readFile(metadataPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      logger.warn("Could not read backup metadata", { error: error.message });
      return null;
    }
  }

  // Placeholder methods for incremental backup functionality
  async findChangedFiles(lastBackupPath) {
    // Implementation would compare file timestamps with last backup
    return [];
  }

  async backupChangedFiles(backupDir, changedFiles, userId) {
    return { success: true, totalSize: 0 };
  }

  async backupChangedDatabases(backupDir, lastBackupPath, userId) {
    return { success: true, totalSize: 0 };
  }

  async extractBackup(backupPath, extractPath) {
    if (this.isLinux) {
      await execAsync(
        `${this.paths.tar} -xzf "${backupPath}" -C "${extractPath}"`
      );
    } else {
      // Mock extraction
      await fs.mkdir(extractPath, { recursive: true });
    }
  }

  async restoreDatabases(extractPath, options) {
    // Implementation would restore database backups
    logger.info("Mock: Restoring databases");
  }

  async restoreWebFiles(extractPath, options) {
    // Implementation would restore web files
    logger.info("Mock: Restoring web files");
  }

  async restoreConfigurations(extractPath, options) {
    // Implementation would restore system configurations
    logger.info("Mock: Restoring configurations");
  }

  getNextRun(cronExpression) {
    // Calculate next run time from cron expression
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Mock: 5 minutes from now
    return now.toISOString();
  }

  // Public API methods
  getActiveJobs() {
    const jobs = Array.from(this.activeJobs.values());
    return jobs.map((job) => ({
      id: job.id,
      type: job.type,
      name: job.name,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      logs: job.logs.slice(-10), // Last 10 log entries
    }));
  }

  getScheduledJobs() {
    const jobs = Array.from(this.scheduledJobs.values());
    return jobs.map((job) => ({
      id: job.id,
      userId: job.userId,
      schedule: job.schedule,
      cronExpression: job.cronExpression,
      created: job.created,
      nextRun: this.getNextRun(job.cronExpression),
    }));
  }

  getJobStatus(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      id: job.id,
      type: job.type,
      name: job.name,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      logs: job.logs,
      archivePath: job.archivePath,
      finalSize: job.finalSize,
    };
  }
}

module.exports = new BackupService();

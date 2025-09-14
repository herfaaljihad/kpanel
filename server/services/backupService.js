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
const db = require("../config/database");

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.isLinux = process.platform === "linux";
    this.isWindows = process.platform === "win32";
    this.isProduction = process.env.NODE_ENV === "production";

    // Backup configuration
    this.config = {
      backupPath: process.env.BACKUP_PATH || (this.isWindows ? "C:\\KPanel\\backups" : "/var/backups/kpanel"),
      tempPath: process.env.TEMP_PATH || (this.isWindows ? "C:\\temp\\kpanel" : "/tmp/kpanel"),
      webRoot: process.env.WEB_ROOT || (this.isWindows ? "C:\\inetpub\\wwwroot" : "/var/www"),
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

    // System paths - cross platform
    this.paths = {
      mysqldump: this.isWindows ? "mysqldump.exe" : "/usr/bin/mysqldump",
      tar: this.isWindows ? "tar.exe" : "/usr/bin/tar",
      gzip: this.isWindows ? "gzip.exe" : "/usr/bin/gzip",
      rsync: this.isWindows ? null : "/usr/bin/rsync", // Not available on Windows
    };

    // Active backup jobs
    this.activeJobs = new Map();
    this.scheduledJobs = new Map();

    this.initializeBackupService();
  }

  async initializeBackupService() {
    try {
      // Create backup directories
      await fs.mkdir(this.config.backupPath, { recursive: true });
      await fs.mkdir(this.config.tempPath, { recursive: true });

      // Load existing scheduled backups from database
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
      await fs.mkdir(backupDir, { recursive: true });

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
      await fs.rm(backupDir, { recursive: true, force: true });

      // Get final archive size
      const stats = await fs.stat(archivePath);

      // Update job completion
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();
      job.archivePath = archivePath;
      job.finalSize = stats.size;
      job.logs.push(`Backup completed successfully. Archive: ${archivePath}`);

      // Save backup record to database
      await this.saveBackupRecord(job);

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
      await fs.mkdir(dbBackupDir, { recursive: true });

      let totalSize = 0;
      
      // Get user's databases from database
      const [databases] = await db.execute(
        "SELECT name FROM databases WHERE user_id = ? AND status = 'active'",
        [userId]
      );

      for (const database of databases) {
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
        backupCount: databases.length,
      };
    } catch (error) {
      logger.error("Failed to backup databases", { error: error.message });
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  // Web files backup - Cross-platform implementation
  async backupWebFiles(backupDir, userId) {
    try {
      const webBackupDir = path.join(backupDir, "webfiles");
      await fs.mkdir(webBackupDir, { recursive: true });

      let totalSize = 0;

      // Get user's web directories from database
      const [userDomains] = await db.execute(
        "SELECT document_root FROM domains WHERE user_id = ? AND status = 'active'",
        [userId]
      );

      for (const domain of userDomains) {
        try {
          if (this.isLinux && this.paths.rsync) {
            // Use rsync for efficient file copying on Linux
            const rsyncCommand = `${this.paths.rsync} -av --exclude='*.log' --exclude='cache/' --exclude='tmp/' "${domain.document_root}/" "${webBackupDir}/"`;
            await execAsync(rsyncCommand);
          } else {
            // Use Node.js native methods for cross-platform support
            await this.copyDirectoryRecursive(domain.document_root, webBackupDir);
          }

          // Calculate size
          const dirSize = await this.calculateDirectorySize(webBackupDir);
          totalSize += dirSize;
        } catch (error) {
          logger.warn(`Failed to backup web files for domain ${domain.document_root}`, {
            error: error.message,
          });
        }
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

  // System configurations backup - Cross-platform
  async backupSystemConfigs(backupDir, userId) {
    try {
      const configBackupDir = path.join(backupDir, "configs");
      await fs.mkdir(configBackupDir, { recursive: true });

      let totalSize = 0;

      // Define config paths based on platform
      const configPaths = this.isWindows
        ? [
            "C:\\Windows\\System32\\inetsrv\\config",
            "C:\\Program Files\\MySQL\\MySQL Server 8.0\\my.ini",
            process.env.APPDATA + "\\KPanel\\config"
          ]
        : [
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

          if (this.isLinux) {
            await execAsync(`cp -r "${configPath}" "${destPath}"`);
          } else {
            // Use Node.js for Windows
            const stats = await fs.stat(configPath);
            if (stats.isDirectory()) {
              await this.copyDirectoryRecursive(configPath, destPath);
            } else {
              await fs.copyFile(configPath, destPath);
            }
          }

          // Add to total size
          const size = await this.calculateDirectorySize(destPath);
          totalSize += size;
        } catch (error) {
          // Config path doesn't exist, skip
          logger.debug(`Config path not found: ${configPath}`);
        }
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

  // Cross-platform directory copying
  async copyDirectoryRecursive(src, dest) {
    try {
      await fs.mkdir(dest, { recursive: true });
      const items = await fs.readdir(src, { withFileTypes: true });

      for (const item of items) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);

        // Skip unwanted files
        if (item.name.endsWith('.log') || item.name === 'cache' || item.name === 'tmp') {
          continue;
        }

        if (item.isDirectory()) {
          await this.copyDirectoryRecursive(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      logger.warn(`Failed to copy directory ${src}`, { error: error.message });
    }
  }

  // Cross-platform directory size calculation
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.debug(`Failed to calculate size for ${dirPath}:`, error.message);
    }

    return totalSize;
  }

  // Incremental backup
  async createIncrementalBackup(userId, lastBackupPath, options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = options.name || `incremental-backup-${timestamp}`;

    try {
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
      await fs.mkdir(backupDir, { recursive: true });

      // Find files changed since last backup
      this.updateJobProgress(backupId, 20, "Finding changed files...");
      const changedFiles = await this.findChangedFiles(lastBackupPath, userId);

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
      await fs.rm(backupDir, { recursive: true, force: true });

      // Finalize job
      const stats = await fs.stat(archivePath);
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();
      job.archivePath = archivePath;
      job.finalSize = stats.size;

      // Save to database
      await this.saveBackupRecord(job);

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

  // Backup compression - Cross-platform
  async compressBackup(backupDir, compressionType = "gzip") {
    const archiveName = `${path.basename(backupDir)}.tar.gz`;
    const archivePath = path.join(path.dirname(backupDir), archiveName);

    try {
      // Use Node.js tar module for cross-platform compatibility
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: path.dirname(backupDir),
        },
        [path.basename(backupDir)]
      );

      return archivePath;
    } catch (error) {
      logger.error("Failed to compress backup", { error: error.message });
      throw new Error(`Backup compression failed: ${error.message}`);
    }
  }

  // Backup restoration - Cross-platform
  async restoreBackup(backupPath, restoreOptions = {}) {
    const restoreId = this.generateBackupId();

    try {
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
      await fs.rm(extractPath, { recursive: true, force: true });

      // Complete job
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();

      logger.info(`Backup restoration completed: ${backupPath}`, {
        restoreId: restoreId,
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
      logger.error(`Backup restoration failed: ${backupPath}`, {
        error: error.message,
      });
      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  // Save backup record to database
  async saveBackupRecord(job) {
    try {
      await db.execute(
        `INSERT INTO backups (user_id, backup_id, name, type, status, 
         file_path, file_size, created_at, completed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          job.userId,
          job.id,
          job.name,
          job.type,
          job.status,
          job.archivePath || null,
          job.finalSize || 0,
          job.startTime,
          job.endTime || null
        ]
      );
    } catch (error) {
      logger.error("Failed to save backup record to database", {
        error: error.message,
      });
    }
  }

  // Load scheduled backups from database
  async loadScheduledBackups() {
    try {
      const [schedules] = await db.execute(
        "SELECT * FROM backup_schedules WHERE status = 'active'"
      );

      for (const schedule of schedules) {
        this.scheduleBackup(
          schedule.user_id,
          schedule.cron_expression,
          {
            type: schedule.backup_type,
            name: schedule.name,
          },
          schedule.id
        );
      }

      logger.info(`Loaded ${schedules.length} backup schedules`);
    } catch (error) {
      logger.error("Failed to load scheduled backups", {
        error: error.message,
      });
    }
  }

  // Schedule backup
  scheduleBackup(userId, cronExpression, options = {}, scheduleId = null) {
    const job = cron.schedule(
      cronExpression,
      async () => {
        try {
          logger.info(`Executing scheduled backup for user ${userId}`);
          
          if (options.type === "incremental") {
            // Get last backup for incremental
            const [lastBackup] = await db.execute(
              "SELECT file_path FROM backups WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
              [userId]
            );
            
            if (lastBackup.length > 0) {
              await this.createIncrementalBackup(userId, lastBackup[0].file_path, options);
            } else {
              // No previous backup, create full backup instead
              await this.createFullBackup(userId, options);
            }
          } else {
            await this.createFullBackup(userId, options);
          }
        } catch (error) {
          logger.error(`Scheduled backup failed for user ${userId}`, {
            error: error.message,
          });
        }
      },
      {
        scheduled: false,
      }
    );

    const jobInfo = {
      id: scheduleId || this.generateBackupId(),
      userId: userId,
      schedule: job,
      cronExpression: cronExpression,
      options: options,
      created: new Date(),
    };

    this.scheduledJobs.set(jobInfo.id, jobInfo);
    job.start();

    return jobInfo.id;
  }

  // Utility methods
  generateBackupId() {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateJobProgress(jobId, progress, message) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.logs.push(`${new Date().toISOString()}: ${message}`);
      logger.info(`Backup ${jobId}: ${progress}% - ${message}`);
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

  formatSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
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

  // Real implementations for incremental backup functionality
  async findChangedFiles(lastBackupPath, userId) {
    // Get last backup time from database
    const [lastBackup] = await db.execute(
      "SELECT created_at FROM backups WHERE file_path = ? AND user_id = ?",
      [lastBackupPath, userId]
    );

    if (lastBackup.length === 0) {
      return [];
    }

    const lastBackupTime = new Date(lastBackup[0].created_at);
    const changedFiles = [];

    // Get user's domains to check for changed files
    const [domains] = await db.execute(
      "SELECT document_root FROM domains WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    for (const domain of domains) {
      try {
        await this.findChangedFilesInDirectory(domain.document_root, lastBackupTime, changedFiles);
      } catch (error) {
        logger.warn(`Failed to check changes in ${domain.document_root}`, {
          error: error.message,
        });
      }
    }

    return changedFiles;
  }

  async findChangedFilesInDirectory(dirPath, lastBackupTime, changedFiles) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await this.findChangedFilesInDirectory(fullPath, lastBackupTime, changedFiles);
        } else {
          const stats = await fs.stat(fullPath);
          if (stats.mtime > lastBackupTime) {
            changedFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to read directory ${dirPath}:`, error.message);
    }
  }

  async backupChangedFiles(backupDir, changedFiles, userId) {
    const changedBackupDir = path.join(backupDir, "changed_files");
    await fs.mkdir(changedBackupDir, { recursive: true });

    let totalSize = 0;

    for (const filePath of changedFiles) {
      try {
        const relativePath = path.relative(this.config.webRoot, filePath);
        const destPath = path.join(changedBackupDir, relativePath);
        
        // Ensure destination directory exists
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        
        // Copy file
        await fs.copyFile(filePath, destPath);
        
        const stats = await fs.stat(destPath);
        totalSize += stats.size;
      } catch (error) {
        logger.warn(`Failed to backup changed file ${filePath}`, {
          error: error.message,
        });
      }
    }

    return { success: true, totalSize };
  }

  async backupChangedDatabases(backupDir, lastBackupPath, userId) {
    // For incremental database backups, we could implement binary log parsing
    // For now, we'll backup all databases again (they compress well if unchanged)
    return await this.backupAllDatabases(backupDir, userId);
  }

  async extractBackup(backupPath, extractPath) {
    await fs.mkdir(extractPath, { recursive: true });
    
    try {
      // Use Node.js tar for cross-platform extraction
      await tar.extract({
        file: backupPath,
        cwd: extractPath,
      });
    } catch (error) {
      logger.error("Failed to extract backup", { error: error.message });
      throw new Error(`Backup extraction failed: ${error.message}`);
    }
  }

  async restoreDatabases(extractPath, options) {
    const dbBackupDir = path.join(extractPath, "databases");
    
    try {
      const backupFiles = await fs.readdir(dbBackupDir);
      
      for (const backupFile of backupFiles) {
        if (backupFile.endsWith('.sql') || backupFile.endsWith('.sql.gz')) {
          try {
            const backupPath = path.join(dbBackupDir, backupFile);
            const dbName = backupFile.replace(/\.(sql|sql\.gz)$/, '');
            
            // Use database service to restore
            await databaseService.restoreDatabaseFromBackup(dbName, backupPath);
            
            logger.info(`Restored database: ${dbName}`);
          } catch (error) {
            logger.error(`Failed to restore database from ${backupFile}`, {
              error: error.message,
            });
          }
        }
      }
    } catch (error) {
      logger.error("Failed to restore databases", { error: error.message });
      throw new Error(`Database restoration failed: ${error.message}`);
    }
  }

  async restoreWebFiles(extractPath, options) {
    const webBackupDir = path.join(extractPath, "webfiles");
    
    try {
      // Copy files back to web root
      await this.copyDirectoryRecursive(webBackupDir, this.config.webRoot);
      logger.info("Web files restored successfully");
    } catch (error) {
      logger.error("Failed to restore web files", { error: error.message });
      throw new Error(`Web files restoration failed: ${error.message}`);
    }
  }

  async restoreConfigurations(extractPath, options) {
    const configBackupDir = path.join(extractPath, "configs");
    
    try {
      const configItems = await fs.readdir(configBackupDir);
      
      for (const item of configItems) {
        try {
          const srcPath = path.join(configBackupDir, item);
          const destPath = this.isWindows
            ? path.join("C:", "Program Files", "KPanel", "config", item)
            : path.join("/etc", item);
          
          await this.copyDirectoryRecursive(srcPath, destPath);
          logger.info(`Restored configuration: ${item}`);
        } catch (error) {
          logger.warn(`Failed to restore configuration ${item}`, {
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to restore configurations", { error: error.message });
      throw new Error(`Configuration restoration failed: ${error.message}`);
    }
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

  getNextRun(cronExpression) {
    try {
      // Simple next run calculation
      const now = new Date();
      now.setMinutes(now.getMinutes() + 60); // Add 1 hour as default
      return now.toISOString();
    } catch (error) {
      logger.warn("Failed to calculate next run time", { error: error.message });
      return null;
    }
  }
}

module.exports = new BackupService();
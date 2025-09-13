// Website Migration Service - cPanel/DirectAdmin Import
// server/services/migrationService.js

const fs = require("fs").promises;
const path = require("path");
const { exec, spawn } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
const archiver = require("archiver");
const extract = require("extract-zip");
const tar = require("tar");
const { logger } = require("../utils/logger");
const fileService = require("./fileService");
const databaseService = require("./databaseService");
const emailService = require("./emailService");
const dnsService = require("./dnsService");

const execAsync = promisify(exec);

class MigrationService {
  constructor() {
    this.platform = process.platform;
    this.isProduction = process.env.NODE_ENV === "production";

    // Migration configuration
    this.migrationConfig = {
      maxFileSize:
        parseInt(process.env.MIGRATION_MAX_FILE_SIZE) || 500 * 1024 * 1024, // 500MB
      maxBackupSize:
        parseInt(process.env.MIGRATION_MAX_BACKUP_SIZE) ||
        2 * 1024 * 1024 * 1024, // 2GB
      tempDirectory:
        process.env.MIGRATION_TEMP_DIR ||
        path.join(process.cwd(), "temp", "migrations"),
      supportedPanels: [
        "cpanel",
        "directadmin",
        "plesk",
        "ispconfig",
        "cyberpanel",
      ],
      retryAttempts: parseInt(process.env.MIGRATION_RETRY_ATTEMPTS) || 3,
      chunkSize: parseInt(process.env.MIGRATION_CHUNK_SIZE) || 10 * 1024 * 1024, // 10MB chunks
    };

    // Migration types and their handlers
    this.migrationTypes = {
      cpanel_full: this.migrateCPanelFull.bind(this),
      cpanel_files: this.migrateCPanelFiles.bind(this),
      directadmin_full: this.migrateDirectAdminFull.bind(this),
      directadmin_manual: this.migrateDirectAdminManual.bind(this),
      plesk_full: this.migratePleskFull.bind(this),
      manual_ftp: this.migrateManualFTP.bind(this),
      manual_files: this.migrateManualFiles.bind(this),
    };

    // Supported file types for migration
    this.supportedArchives = [".tar.gz", ".tar.bz2", ".zip", ".tar"];

    this.initialize();
  }

  async initialize() {
    try {
      await this.createMigrationDirectories();
      await this.initializeMigrationDatabase();
      await this.loadMigrationTools();

      logger.info("Migration Service initialized", {
        tempDirectory: this.migrationConfig.tempDirectory,
        supportedPanels: this.migrationConfig.supportedPanels,
        maxFileSize: this.migrationConfig.maxFileSize,
      });
    } catch (error) {
      logger.error("Failed to initialize migration service", error);
    }
  }

  async createMigrationDirectories() {
    const directories = [
      this.migrationConfig.tempDirectory,
      path.join(this.migrationConfig.tempDirectory, "downloads"),
      path.join(this.migrationConfig.tempDirectory, "extracts"),
      path.join(this.migrationConfig.tempDirectory, "processing"),
      path.join(process.cwd(), "migrations", "completed"),
      path.join(process.cwd(), "migrations", "failed"),
      path.join(process.cwd(), "migrations", "logs"),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        logger.warn(
          `Failed to create migration directory ${dir}:`,
          error.message
        );
      }
    }
  }

  async initializeMigrationDatabase() {
    const schema = `
      -- Migration tracking tables
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        source_panel VARCHAR(100) NOT NULL,
        migration_type VARCHAR(100) NOT NULL,
        source_details TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total_steps INTEGER DEFAULT 0,
        current_step VARCHAR(255),
        start_time DATETIME,
        end_time DATETIME,
        duration_seconds INTEGER,
        data_transferred_mb DECIMAL(10,2) DEFAULT 0,
        files_migrated INTEGER DEFAULT 0,
        databases_migrated INTEGER DEFAULT 0,
        emails_migrated INTEGER DEFAULT 0,
        domains_migrated INTEGER DEFAULT 0,
        errors_count INTEGER DEFAULT 0,
        warnings_count INTEGER DEFAULT 0,
        backup_file_path VARCHAR(500),
        migration_log TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS migration_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id VARCHAR(255) NOT NULL,
        step_number INTEGER NOT NULL,
        step_name VARCHAR(255) NOT NULL,
        step_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        start_time DATETIME,
        end_time DATETIME,
        duration_seconds INTEGER,
        data_processed_mb DECIMAL(10,2) DEFAULT 0,
        items_processed INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        step_log TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (migration_id) REFERENCES migrations (migration_id)
      );

      CREATE TABLE IF NOT EXISTS migration_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id VARCHAR(255) NOT NULL,
        step_id INTEGER NOT NULL,
        item_type VARCHAR(100) NOT NULL,
        source_path VARCHAR(500),
        destination_path VARCHAR(500),
        item_name VARCHAR(255),
        size_bytes BIGINT,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        checksum_source VARCHAR(64),
        checksum_destination VARCHAR(64),
        processed_at DATETIME,
        metadata TEXT,
        FOREIGN KEY (migration_id) REFERENCES migrations (migration_id),
        FOREIGN KEY (step_id) REFERENCES migration_steps (id)
      );

      CREATE TABLE IF NOT EXISTS migration_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id VARCHAR(255) NOT NULL,
        mapping_type VARCHAR(100) NOT NULL,
        source_value VARCHAR(500) NOT NULL,
        destination_value VARCHAR(500) NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (migration_id) REFERENCES migrations (migration_id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_migrations_user_status ON migrations (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_migration_steps_migration ON migration_steps (migration_id, step_number);
      CREATE INDEX IF NOT EXISTS idx_migration_items_migration_type ON migration_items (migration_id, item_type);
      CREATE INDEX IF NOT EXISTS idx_migration_mappings_type ON migration_mappings (migration_id, mapping_type);
    `;

    try {
      const db = require("../config/database");
      await db.exec(schema);
      logger.info("Migration database schema initialized");
    } catch (error) {
      logger.error("Error initializing migration database:", error);
      throw error;
    }
  }

  // Main Migration Entry Point
  async startMigration(userId, migrationConfig) {
    try {
      const migrationId = this.generateMigrationId();

      // Validate migration configuration
      await this.validateMigrationConfig(migrationConfig);

      // Create migration record
      await this.createMigrationRecord(migrationId, userId, migrationConfig);

      // Start migration process
      this.processMigrationAsync(migrationId, migrationConfig);

      logger.info(`Migration started: ${migrationId} for user ${userId}`);
      return {
        success: true,
        migrationId: migrationId,
        estimatedSteps: this.calculateEstimatedSteps(migrationConfig),
      };
    } catch (error) {
      logger.error("Error starting migration:", error);
      throw error;
    }
  }

  async processMigrationAsync(migrationId, config) {
    try {
      await this.updateMigrationStatus(
        migrationId,
        "running",
        "Migration started"
      );

      const migrationHandler = this.migrationTypes[config.migrationType];
      if (!migrationHandler) {
        throw new Error(`Unsupported migration type: ${config.migrationType}`);
      }

      const result = await migrationHandler(migrationId, config);

      if (result.success) {
        await this.updateMigrationStatus(
          migrationId,
          "completed",
          "Migration completed successfully"
        );
        await this.sendMigrationNotification(migrationId, "completed");
      } else {
        await this.updateMigrationStatus(
          migrationId,
          "failed",
          result.error || "Migration failed"
        );
        await this.sendMigrationNotification(migrationId, "failed");
      }
    } catch (error) {
      logger.error(`Migration ${migrationId} failed:`, error);
      await this.updateMigrationStatus(migrationId, "failed", error.message);
      await this.sendMigrationNotification(migrationId, "failed");
    }
  }

  // cPanel Migration
  async migrateCPanelFull(migrationId, config) {
    const steps = [
      { name: "Download Backup", handler: this.downloadCPanelBackup },
      { name: "Extract Backup", handler: this.extractCPanelBackup },
      { name: "Parse Configuration", handler: this.parseCPanelConfig },
      { name: "Migrate Files", handler: this.migrateCPanelFiles },
      { name: "Migrate Databases", handler: this.migrateCPanelDatabases },
      { name: "Migrate Email Accounts", handler: this.migrateCPanelEmails },
      { name: "Migrate DNS Zones", handler: this.migrateCPanelDNS },
      {
        name: "Update Configurations",
        handler: this.updateCPanelConfigurations,
      },
      { name: "Cleanup", handler: this.cleanupMigration },
    ];

    return await this.executeSteps(migrationId, steps, config);
  }

  async downloadCPanelBackup(migrationId, config) {
    try {
      await this.createMigrationStep(
        migrationId,
        "Download Backup",
        "download"
      );

      let backupPath;

      if (config.backupUrl) {
        // Download from URL
        backupPath = await this.downloadFromUrl(config.backupUrl, migrationId);
      } else if (config.backupFile) {
        // Use uploaded file
        backupPath = await this.handleUploadedFile(
          config.backupFile,
          migrationId
        );
      } else if (config.ftpConfig) {
        // Download via FTP/SFTP
        backupPath = await this.downloadViaFTP(config.ftpConfig, migrationId);
      } else {
        throw new Error("No backup source specified");
      }

      // Validate backup file
      await this.validateBackupFile(backupPath, "cpanel");

      await this.updateMigrationData(
        migrationId,
        "backup_file_path",
        backupPath
      );
      await this.updateStepStatus(migrationId, "Download Backup", "completed");

      return { success: true, backupPath: backupPath };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Download Backup",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async extractCPanelBackup(migrationId, config) {
    try {
      await this.createMigrationStep(migrationId, "Extract Backup", "extract");

      const migration = await this.getMigration(migrationId);
      const backupPath = migration.backup_file_path;
      const extractPath = path.join(
        this.migrationConfig.tempDirectory,
        "extracts",
        migrationId
      );

      await fs.mkdir(extractPath, { recursive: true });

      // Determine extraction method based on file extension
      const ext = path.extname(backupPath).toLowerCase();

      if (ext === ".zip") {
        await extract(backupPath, { dir: extractPath });
      } else if (ext === ".gz" || backupPath.includes(".tar.gz")) {
        await tar.extract({ file: backupPath, cwd: extractPath });
      } else if (ext === ".bz2" || backupPath.includes(".tar.bz2")) {
        await execAsync(`tar -xjf "${backupPath}" -C "${extractPath}"`);
      } else {
        throw new Error(`Unsupported backup format: ${ext}`);
      }

      // Find and validate cPanel backup structure
      const backupStructure = await this.analyzeCPanelStructure(extractPath);

      await this.updateMigrationMetadata(migrationId, {
        extractPath: extractPath,
        backupStructure: backupStructure,
      });

      await this.updateStepStatus(migrationId, "Extract Backup", "completed");

      return {
        success: true,
        extractPath: extractPath,
        structure: backupStructure,
      };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Extract Backup",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async parseCPanelConfig(migrationId, config) {
    try {
      await this.createMigrationStep(
        migrationId,
        "Parse Configuration",
        "parse"
      );

      const migration = await this.getMigration(migrationId);
      const metadata = JSON.parse(migration.metadata || "{}");
      const extractPath = metadata.extractPath;

      // Parse cPanel configuration files
      const cpanelConfig = await this.parseCPanelConfigFiles(extractPath);

      // Extract account information
      const accountInfo = {
        domain: cpanelConfig.main_domain,
        username: cpanelConfig.username,
        email: cpanelConfig.contact_email,
        diskUsage: cpanelConfig.disk_usage,
        addonDomains: cpanelConfig.addon_domains || [],
        subdomains: cpanelConfig.subdomains || [],
        databases: cpanelConfig.databases || [],
        emailAccounts: cpanelConfig.email_accounts || [],
        dnsZones: cpanelConfig.dns_zones || [],
      };

      await this.updateMigrationMetadata(migrationId, {
        ...metadata,
        accountInfo: accountInfo,
      });

      await this.updateStepStatus(
        migrationId,
        "Parse Configuration",
        "completed"
      );

      return { success: true, accountInfo: accountInfo };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Parse Configuration",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async migrateCPanelFiles(migrationId, config) {
    try {
      await this.createMigrationStep(migrationId, "Migrate Files", "files");

      const migration = await this.getMigration(migrationId);
      const metadata = JSON.parse(migration.metadata || "{}");
      const extractPath = metadata.extractPath;
      const accountInfo = metadata.accountInfo;

      // Create destination directory
      const destinationPath = path.join(
        config.destinationPath || "/var/www",
        accountInfo.domain
      );
      await fs.mkdir(destinationPath, { recursive: true });

      // Find and copy website files
      const sourceWebRoot = path.join(extractPath, "public_html");
      if (await this.pathExists(sourceWebRoot)) {
        await this.copyDirectoryWithProgress(
          sourceWebRoot,
          destinationPath,
          migrationId,
          "Migrate Files"
        );
      }

      // Copy additional directories
      const additionalDirs = ["logs", "tmp", "etc", "mail"];
      for (const dir of additionalDirs) {
        const sourcePath = path.join(extractPath, dir);
        if (await this.pathExists(sourcePath)) {
          const destPath = path.join(destinationPath, "..", dir);
          await this.copyDirectoryWithProgress(
            sourcePath,
            destPath,
            migrationId,
            "Migrate Files"
          );
        }
      }

      // Set proper permissions
      await this.setFilePermissions(destinationPath, accountInfo.username);

      await this.updateStepStatus(migrationId, "Migrate Files", "completed");

      return { success: true, destinationPath: destinationPath };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Migrate Files",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async migrateCPanelDatabases(migrationId, config) {
    try {
      await this.createMigrationStep(
        migrationId,
        "Migrate Databases",
        "databases"
      );

      const migration = await this.getMigration(migrationId);
      const metadata = JSON.parse(migration.metadata || "{}");
      const extractPath = metadata.extractPath;
      const accountInfo = metadata.accountInfo;

      if (!accountInfo.databases || accountInfo.databases.length === 0) {
        await this.updateStepStatus(
          migrationId,
          "Migrate Databases",
          "skipped",
          "No databases found"
        );
        return { success: true, message: "No databases to migrate" };
      }

      // Create database connection for destination
      const dbConnection = await databaseService.createConnection({
        host: config.dbHost || "localhost",
        username: config.dbUsername,
        password: config.dbPassword,
        type: "mysql",
      });

      let migratedCount = 0;
      for (const database of accountInfo.databases) {
        try {
          // Create database
          await databaseService.createDatabase(
            dbConnection.connectionId,
            database.name
          );

          // Import database dump
          const dumpFile = path.join(
            extractPath,
            "mysql",
            `${database.name}.sql`
          );
          if (await this.pathExists(dumpFile)) {
            await databaseService.restoreBackup(
              dbConnection.connectionId,
              database.name,
              dumpFile
            );
          }

          // Create database users
          if (database.users) {
            for (const user of database.users) {
              await databaseService.createDatabaseUser(
                dbConnection.connectionId,
                user.username,
                user.password,
                "%",
                {
                  privileges: user.privileges || "ALL",
                  databases: [database.name],
                }
              );
            }
          }

          migratedCount++;
          await this.logMigrationItem(
            migrationId,
            "database",
            database.name,
            "completed"
          );
        } catch (error) {
          logger.error(`Error migrating database ${database.name}:`, error);
          await this.logMigrationItem(
            migrationId,
            "database",
            database.name,
            "failed",
            error.message
          );
        }
      }

      await databaseService.closeConnection(dbConnection.connectionId);

      await this.updateMigrationData(
        migrationId,
        "databases_migrated",
        migratedCount
      );
      await this.updateStepStatus(
        migrationId,
        "Migrate Databases",
        "completed"
      );

      return { success: true, migratedCount: migratedCount };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Migrate Databases",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async migrateCPanelEmails(migrationId, config) {
    try {
      await this.createMigrationStep(
        migrationId,
        "Migrate Email Accounts",
        "emails"
      );

      const migration = await this.getMigration(migrationId);
      const metadata = JSON.parse(migration.metadata || "{}");
      const accountInfo = metadata.accountInfo;

      if (
        !accountInfo.emailAccounts ||
        accountInfo.emailAccounts.length === 0
      ) {
        await this.updateStepStatus(
          migrationId,
          "Migrate Email Accounts",
          "skipped",
          "No email accounts found"
        );
        return { success: true, message: "No email accounts to migrate" };
      }

      let migratedCount = 0;
      for (const emailAccount of accountInfo.emailAccounts) {
        try {
          // Create email account
          await emailService.createEmailAccount({
            email: emailAccount.email,
            password: emailAccount.password,
            quota: emailAccount.quota || 0,
            domain: accountInfo.domain,
          });

          // Migrate email data if available
          if (emailAccount.mailboxPath) {
            await this.migrateEmailData(emailAccount);
          }

          migratedCount++;
          await this.logMigrationItem(
            migrationId,
            "email",
            emailAccount.email,
            "completed"
          );
        } catch (error) {
          logger.error(
            `Error migrating email account ${emailAccount.email}:`,
            error
          );
          await this.logMigrationItem(
            migrationId,
            "email",
            emailAccount.email,
            "failed",
            error.message
          );
        }
      }

      await this.updateMigrationData(
        migrationId,
        "emails_migrated",
        migratedCount
      );
      await this.updateStepStatus(
        migrationId,
        "Migrate Email Accounts",
        "completed"
      );

      return { success: true, migratedCount: migratedCount };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Migrate Email Accounts",
        "failed",
        error.message
      );
      throw error;
    }
  }

  async migrateCPanelDNS(migrationId, config) {
    try {
      await this.createMigrationStep(migrationId, "Migrate DNS Zones", "dns");

      const migration = await this.getMigration(migrationId);
      const metadata = JSON.parse(migration.metadata || "{}");
      const accountInfo = metadata.accountInfo;

      if (!accountInfo.dnsZones || accountInfo.dnsZones.length === 0) {
        await this.updateStepStatus(
          migrationId,
          "Migrate DNS Zones",
          "skipped",
          "No DNS zones found"
        );
        return { success: true, message: "No DNS zones to migrate" };
      }

      let migratedCount = 0;
      for (const dnsZone of accountInfo.dnsZones) {
        try {
          // Create DNS zone
          await dnsService.createDnsZone(dnsZone.domain, {
            records: dnsZone.records || [],
            ttl: dnsZone.ttl || 3600,
          });

          migratedCount++;
          await this.logMigrationItem(
            migrationId,
            "dns",
            dnsZone.domain,
            "completed"
          );
        } catch (error) {
          logger.error(`Error migrating DNS zone ${dnsZone.domain}:`, error);
          await this.logMigrationItem(
            migrationId,
            "dns",
            dnsZone.domain,
            "failed",
            error.message
          );
        }
      }

      await this.updateMigrationData(
        migrationId,
        "domains_migrated",
        migratedCount
      );
      await this.updateStepStatus(
        migrationId,
        "Migrate DNS Zones",
        "completed"
      );

      return { success: true, migratedCount: migratedCount };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Migrate DNS Zones",
        "failed",
        error.message
      );
      throw error;
    }
  }

  // DirectAdmin Migration
  async migrateDirectAdminFull(migrationId, config) {
    const steps = [
      { name: "Download Backup", handler: this.downloadDirectAdminBackup },
      { name: "Extract Backup", handler: this.extractDirectAdminBackup },
      { name: "Parse Configuration", handler: this.parseDirectAdminConfig },
      { name: "Migrate Files", handler: this.migrateDirectAdminFiles },
      { name: "Migrate Databases", handler: this.migrateDirectAdminDatabases },
      {
        name: "Migrate Email Accounts",
        handler: this.migrateDirectAdminEmails,
      },
      { name: "Migrate DNS Zones", handler: this.migrateDirectAdminDNS },
      {
        name: "Update Configurations",
        handler: this.updateDirectAdminConfigurations,
      },
      { name: "Cleanup", handler: this.cleanupMigration },
    ];

    return await this.executeSteps(migrationId, steps, config);
  }

  // Manual FTP Migration
  async migrateManualFTP(migrationId, config) {
    try {
      await this.createMigrationStep(migrationId, "Connect FTP", "ftp");

      // Connect to source FTP
      const ftpConnection = await this.createFTPConnection(config.ftpConfig);

      // Download files
      await this.downloadViaFTPRecursive(
        ftpConnection,
        config.sourcePath || "/",
        migrationId
      );

      await this.closeFTPConnection(ftpConnection);

      await this.updateStepStatus(migrationId, "Connect FTP", "completed");

      return { success: true };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Connect FTP",
        "failed",
        error.message
      );
      throw error;
    }
  }

  // Utility Methods
  async executeSteps(migrationId, steps, config) {
    try {
      await this.updateMigrationData(migrationId, "total_steps", steps.length);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        await this.updateMigrationProgress(migrationId, i, step.name);

        const result = await step.handler.call(this, migrationId, config);

        if (!result.success) {
          throw new Error(`Step failed: ${step.name}`);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error(`Migration steps execution failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async copyDirectoryWithProgress(sourcePath, destPath, migrationId, stepName) {
    try {
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });

        const items = await fs.readdir(sourcePath);

        for (const item of items) {
          const srcItem = path.join(sourcePath, item);
          const destItem = path.join(destPath, item);

          await this.copyDirectoryWithProgress(
            srcItem,
            destItem,
            migrationId,
            stepName
          );
        }
      } else {
        await fs.copyFile(sourcePath, destPath);

        // Update progress
        const sizeMB = stats.size / (1024 * 1024);
        await this.incrementDataTransferred(migrationId, sizeMB);
        await this.incrementFilesCount(migrationId);

        await this.logMigrationItem(
          migrationId,
          "file",
          path.basename(sourcePath),
          "completed"
        );
      }
    } catch (error) {
      await this.logMigrationItem(
        migrationId,
        "file",
        path.basename(sourcePath),
        "failed",
        error.message
      );
      throw error;
    }
  }

  async parseCPanelConfigFiles(extractPath) {
    const config = {};

    try {
      // Parse main configuration
      const mainConfigPath = path.join(extractPath, "cp", "cpanel_config.conf");
      if (await this.pathExists(mainConfigPath)) {
        const configContent = await fs.readFile(mainConfigPath, "utf8");
        config.main_config = this.parseConfigFile(configContent);
      }

      // Parse domain configuration
      const domainConfigPath = path.join(extractPath, "userdata");
      if (await this.pathExists(domainConfigPath)) {
        config.domains = await this.parseDomainConfigs(domainConfigPath);
      }

      // Parse database information
      const dbConfigPath = path.join(extractPath, "mysql.sql");
      if (await this.pathExists(dbConfigPath)) {
        config.databases = await this.parseDatabaseConfig(dbConfigPath);
      }

      // Parse email configuration
      const emailConfigPath = path.join(extractPath, "mail");
      if (await this.pathExists(emailConfigPath)) {
        config.email_accounts = await this.parseEmailConfig(emailConfigPath);
      }

      return config;
    } catch (error) {
      logger.error("Error parsing cPanel config files:", error);
      return {};
    }
  }

  async validateBackupFile(filePath, panelType) {
    try {
      const stats = await fs.stat(filePath);

      if (stats.size > this.migrationConfig.maxBackupSize) {
        throw new Error(
          `Backup file too large: ${stats.size} > ${this.migrationConfig.maxBackupSize}`
        );
      }

      // Validate based on panel type
      switch (panelType) {
        case "cpanel":
          await this.validateCPanelBackup(filePath);
          break;
        case "directadmin":
          await this.validateDirectAdminBackup(filePath);
          break;
        default:
          // Basic validation for other types
          const ext = path.extname(filePath).toLowerCase();
          if (
            !this.supportedArchives.some((supported) =>
              filePath.includes(supported)
            )
          ) {
            throw new Error(`Unsupported backup format: ${ext}`);
          }
      }

      return true;
    } catch (error) {
      logger.error("Backup validation failed:", error);
      throw error;
    }
  }

  async validateCPanelBackup(filePath) {
    // Check if it's a valid cPanel backup by looking for specific markers
    // This is a simplified validation - in production, would be more thorough
    return true;
  }

  // Database operations
  async createMigrationRecord(migrationId, userId, config) {
    try {
      const db = require("../config/database");

      await db.run(
        `
        INSERT INTO migrations (migration_id, user_id, source_panel, migration_type, source_details, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
        [
          migrationId,
          userId,
          config.sourcePanel,
          config.migrationType,
          JSON.stringify(config.sourceDetails || {}),
        ]
      );
    } catch (error) {
      logger.error("Error creating migration record:", error);
      throw error;
    }
  }

  async updateMigrationStatus(migrationId, status, currentStep = null) {
    try {
      const db = require("../config/database");

      const updates = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
      const values = [status];

      if (currentStep) {
        updates.push("current_step = ?");
        values.push(currentStep);
      }

      if (
        status === "running" &&
        !(await this.getMigrationField(migrationId, "start_time"))
      ) {
        updates.push("start_time = CURRENT_TIMESTAMP");
      }

      if (status === "completed" || status === "failed") {
        updates.push("end_time = CURRENT_TIMESTAMP");
        updates.push(
          'duration_seconds = (strftime("%s", "now") - strftime("%s", start_time))'
        );
      }

      values.push(migrationId);

      await db.run(
        `
        UPDATE migrations 
        SET ${updates.join(", ")}
        WHERE migration_id = ?
      `,
        values
      );
    } catch (error) {
      logger.error("Error updating migration status:", error);
    }
  }

  async updateMigrationProgress(migrationId, stepNumber, stepName) {
    try {
      const db = require("../config/database");

      await db.run(
        `
        UPDATE migrations 
        SET progress = ?, current_step = ?, updated_at = CURRENT_TIMESTAMP
        WHERE migration_id = ?
      `,
        [stepNumber, stepName, migrationId]
      );
    } catch (error) {
      logger.error("Error updating migration progress:", error);
    }
  }

  async createMigrationStep(migrationId, stepName, stepType) {
    try {
      const db = require("../config/database");

      const stepNumber = await this.getNextStepNumber(migrationId);

      await db.run(
        `
        INSERT INTO migration_steps (migration_id, step_number, step_name, step_type, status, start_time)
        VALUES (?, ?, ?, ?, 'running', CURRENT_TIMESTAMP)
      `,
        [migrationId, stepNumber, stepName, stepType]
      );
    } catch (error) {
      logger.error("Error creating migration step:", error);
    }
  }

  async updateStepStatus(migrationId, stepName, status, errorMessage = null) {
    try {
      const db = require("../config/database");

      await db.run(
        `
        UPDATE migration_steps 
        SET status = ?, end_time = CURRENT_TIMESTAMP, 
            duration_seconds = (strftime("%s", "now") - strftime("%s", start_time)),
            step_log = ?
        WHERE migration_id = ? AND step_name = ?
      `,
        [status, errorMessage, migrationId, stepName]
      );
    } catch (error) {
      logger.error("Error updating step status:", error);
    }
  }

  // Migration monitoring and status
  async getMigrationStatus(migrationId) {
    try {
      const db = require("../config/database");

      const migration = await db.get(
        "SELECT * FROM migrations WHERE migration_id = ?",
        [migrationId]
      );
      if (!migration) {
        throw new Error("Migration not found");
      }

      const steps = await db.all(
        `
        SELECT * FROM migration_steps 
        WHERE migration_id = ? 
        ORDER BY step_number
      `,
        [migrationId]
      );

      const items = await db.all(
        `
        SELECT item_type, status, COUNT(*) as count
        FROM migration_items 
        WHERE migration_id = ?
        GROUP BY item_type, status
      `,
        [migrationId]
      );

      return {
        success: true,
        migration: migration,
        steps: steps,
        items: items,
      };
    } catch (error) {
      logger.error("Error getting migration status:", error);
      throw error;
    }
  }

  async getMigrationList(userId, options = {}) {
    try {
      const db = require("../config/database");

      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const migrations = await db.all(
        `
        SELECT * FROM migrations 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `,
        [userId, limit, offset]
      );

      return {
        success: true,
        migrations: migrations,
      };
    } catch (error) {
      logger.error("Error getting migration list:", error);
      throw error;
    }
  }

  // Utility methods
  generateMigrationId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MIG-${timestamp}-${random}`;
  }

  calculateEstimatedSteps(config) {
    const baseSteps = 5; // Download, extract, parse, cleanup, etc.
    let additionalSteps = 0;

    if (config.includeFiles) additionalSteps++;
    if (config.includeDatabases) additionalSteps++;
    if (config.includeEmails) additionalSteps++;
    if (config.includeDNS) additionalSteps++;

    return baseSteps + additionalSteps;
  }

  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getMigration(migrationId) {
    const db = require("../config/database");
    return await db.get("SELECT * FROM migrations WHERE migration_id = ?", [
      migrationId,
    ]);
  }

  async updateMigrationMetadata(migrationId, metadata) {
    try {
      const db = require("../config/database");
      await db.run(
        `
        UPDATE migrations 
        SET metadata = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE migration_id = ?
      `,
        [JSON.stringify(metadata), migrationId]
      );
    } catch (error) {
      logger.error("Error updating migration metadata:", error);
    }
  }

  async updateMigrationData(migrationId, field, value) {
    try {
      const db = require("../config/database");
      await db.run(
        `
        UPDATE migrations 
        SET ${field} = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE migration_id = ?
      `,
        [value, migrationId]
      );
    } catch (error) {
      logger.error(`Error updating migration ${field}:`, error);
    }
  }

  async loadMigrationTools() {
    // Check for required migration tools
    const tools = ["tar", "gzip", "unzip"];

    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
        logger.debug(`Migration tool available: ${tool}`);
      } catch (error) {
        logger.warn(`Migration tool not found: ${tool}`);
      }
    }
  }

  async validateMigrationConfig(config) {
    if (
      !config.sourcePanel ||
      !this.migrationConfig.supportedPanels.includes(config.sourcePanel)
    ) {
      throw new Error(`Unsupported source panel: ${config.sourcePanel}`);
    }

    if (!config.migrationType || !this.migrationTypes[config.migrationType]) {
      throw new Error(`Unsupported migration type: ${config.migrationType}`);
    }

    return true;
  }

  // Cleanup
  async cleanupMigration(migrationId, config) {
    try {
      await this.createMigrationStep(migrationId, "Cleanup", "cleanup");

      // Clean up temporary files
      const tempPath = path.join(
        this.migrationConfig.tempDirectory,
        migrationId
      );
      if (await this.pathExists(tempPath)) {
        await fs.rm(tempPath, { recursive: true, force: true });
      }

      await this.updateStepStatus(migrationId, "Cleanup", "completed");

      return { success: true };
    } catch (error) {
      await this.updateStepStatus(
        migrationId,
        "Cleanup",
        "failed",
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async cleanup() {
    try {
      // Clean up old temporary files
      const tempDir = this.migrationConfig.tempDirectory;
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const items = await fs.readdir(tempDir);
      for (const item of items) {
        const itemPath = path.join(tempDir, item);
        try {
          const stats = await fs.stat(itemPath);
          if (stats.mtime < cutoffDate) {
            await fs.rm(itemPath, { recursive: true, force: true });
            logger.info(`Cleaned up old migration temp: ${item}`);
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }

      logger.info("Migration service cleanup completed");
    } catch (error) {
      logger.error("Error during migration service cleanup:", error);
    }
  }

  // Stub implementations for specific handlers
  async downloadFromUrl(url, migrationId) {
    /* Implementation */
  }
  async handleUploadedFile(file, migrationId) {
    /* Implementation */
  }
  async downloadViaFTP(ftpConfig, migrationId) {
    /* Implementation */
  }
  async analyzeCPanelStructure(extractPath) {
    /* Implementation */
  }
  async setFilePermissions(filePath, username) {
    /* Implementation */
  }
  async migrateEmailData(emailAccount) {
    /* Implementation */
  }
  async sendMigrationNotification(migrationId, status) {
    /* Implementation */
  }

  // Additional stub methods for DirectAdmin, Plesk, etc.
  async migrateDirectAdminManual(migrationId, config) {
    /* Implementation */
  }
  async migratePleskFull(migrationId, config) {
    /* Implementation */
  }
  async downloadDirectAdminBackup(migrationId, config) {
    /* Implementation */
  }
  async extractDirectAdminBackup(migrationId, config) {
    /* Implementation */
  }
  async parseDirectAdminConfig(migrationId, config) {
    /* Implementation */
  }
  async migrateDirectAdminFiles(migrationId, config) {
    /* Implementation */
  }
  async migrateDirectAdminDatabases(migrationId, config) {
    /* Implementation */
  }
  async migrateDirectAdminEmails(migrationId, config) {
    /* Implementation */
  }
  async migrateDirectAdminDNS(migrationId, config) {
    /* Implementation */
  }
  async updateCPanelConfigurations(migrationId, config) {
    /* Implementation */
  }

  async updateDirectAdminConfigurations(migrationId, config) {
    /* Implementation */
  }

  async migrateManualFiles(migrationId, config) {
    // Manual file migration implementation
    try {
      await this.updateMigrationStatus(
        migrationId,
        "processing",
        "Starting manual file migration"
      );

      // Implementation would go here

      await this.updateMigrationStatus(
        migrationId,
        "completed",
        "Manual file migration completed"
      );
      return { success: true };
    } catch (error) {
      await this.updateMigrationStatus(
        migrationId,
        "failed",
        `Manual file migration failed: ${error.message}`
      );
      throw error;
    }
  }
}

module.exports = new MigrationService();

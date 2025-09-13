// File System Service - Production File Operations
// server/services/fileService.js

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const { promisify } = require("util");
const archiver = require("archiver");
const unzipper = require("unzipper");
const tar = require("tar");
const mime = require("mime-types");
const { logger } = require("../utils/logger");

const execAsync = promisify(exec);

class FileService {
  constructor() {
    this.isLinux = process.platform === "linux";
    this.isProduction = process.env.NODE_ENV === "production";

    // Base paths for security
    this.basePaths = {
      webRoot: process.env.WEB_ROOT || "/var/www",
      userHome: process.env.USER_HOME || "/home",
      backupPath: process.env.BACKUP_PATH || "/var/backups/kpanel",
      tempPath: process.env.TEMP_PATH || "/tmp/kpanel",
    };

    // Security restrictions
    this.restrictedPaths = [
      "/etc/passwd",
      "/etc/shadow",
      "/etc/hosts",
      "/etc/sudoers",
      "/root",
      "/var/log/auth.log",
      "/var/log/secure",
      "/proc",
      "/sys",
      "/dev",
    ];

    // Allowed file extensions for uploads
    this.allowedExtensions = [
      ".txt",
      ".html",
      ".htm",
      ".css",
      ".js",
      ".json",
      ".xml",
      ".php",
      ".py",
      ".sh",
      ".conf",
      ".cfg",
      ".ini",
      ".log",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".ico",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".zip",
      ".tar",
      ".gz",
    ];

    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB

    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.basePaths.tempPath, { recursive: true, mode: 0o755 });

      // Ensure backup directory exists
      await fs.mkdir(this.basePaths.backupPath, {
        recursive: true,
        mode: 0o755,
      });

      logger.info("File service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize File service", {
        error: error.message,
      });
    }
  }

  // Security validation
  validatePath(filePath) {
    const normalizedPath = path.normalize(filePath);

    // Check if path is within allowed base paths
    const isAllowed = Object.values(this.basePaths).some((basePath) =>
      normalizedPath.startsWith(path.normalize(basePath))
    );

    if (!isAllowed) {
      throw new Error(`Access denied: Path outside allowed directories`);
    }

    // Check restricted paths
    const isRestricted = this.restrictedPaths.some((restrictedPath) =>
      normalizedPath.startsWith(restrictedPath)
    );

    if (isRestricted) {
      throw new Error(`Access denied: Path is restricted`);
    }

    return normalizedPath;
  }

  validateFileExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext && !this.allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed: ${ext}`);
    }
    return true;
  }

  // File operations
  async listDirectory(dirPath, userId = null) {
    try {
      const validatedPath = this.validatePath(dirPath);

      if (!this.isLinux) {
        return this.getMockDirectoryListing(dirPath);
      }

      const items = await fs.readdir(validatedPath);
      const fileList = [];

      for (const item of items) {
        try {
          const itemPath = path.join(validatedPath, item);
          const stats = await fs.stat(itemPath);

          // Get file permissions and ownership (Linux only)
          let permissions = "";
          let owner = "";
          let group = "";

          if (this.isLinux) {
            try {
              const { stdout } = await execAsync(
                `ls -la "${itemPath}" | head -1`
              );
              const parts = stdout.trim().split(/\s+/);
              permissions = parts[0];
              owner = parts[2];
              group = parts[3];
            } catch (error) {
              logger.debug(`Could not get permissions for ${itemPath}`, {
                error: error.message,
              });
            }
          }

          fileList.push({
            name: item,
            path: itemPath,
            type: stats.isDirectory() ? "directory" : "file",
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            modified: stats.mtime.toISOString(),
            permissions: permissions,
            owner: owner,
            group: group,
            mimeType: stats.isFile()
              ? mime.lookup(item) || "application/octet-stream"
              : null,
            isReadable: true, // Will be determined by actual permissions
            isWritable: true, // Will be determined by actual permissions
            isExecutable: permissions.includes("x"),
          });
        } catch (error) {
          logger.debug(`Error processing item ${item}`, {
            error: error.message,
          });
        }
      }

      return {
        path: validatedPath,
        items: fileList.sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }),
        totalItems: fileList.length,
        parentPath: path.dirname(validatedPath),
      };
    } catch (error) {
      logger.error(`Failed to list directory ${dirPath}`, {
        error: error.message,
      });
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async readFile(filePath, userId = null) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.isLinux) {
        return {
          content: `Mock content for ${path.basename(filePath)}`,
          size: 1024,
          encoding: "utf8",
          mock: true,
        };
      }

      const stats = await fs.stat(validatedPath);

      if (stats.isDirectory()) {
        throw new Error("Cannot read directory as file");
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(
          `File too large: ${this.formatFileSize(
            stats.size
          )} (max: ${this.formatFileSize(this.maxFileSize)})`
        );
      }

      const content = await fs.readFile(validatedPath, "utf8");

      return {
        content: content,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        modified: stats.mtime.toISOString(),
        encoding: "utf8",
        mimeType: mime.lookup(filePath) || "text/plain",
      };
    } catch (error) {
      logger.error(`Failed to read file ${filePath}`, { error: error.message });
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, content, userId = null) {
    try {
      const validatedPath = this.validatePath(filePath);
      this.validateFileExtension(path.basename(filePath));

      if (!this.isLinux) {
        logger.info(`Mock: Writing file ${filePath}`);
        return {
          success: true,
          message: `Mock file ${path.basename(filePath)} saved`,
          size: content.length,
        };
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });

      // Check if file exists for backup
      let backupCreated = false;
      try {
        await fs.access(validatedPath);
        // Create backup of existing file
        const backupPath = `${validatedPath}.backup.${Date.now()}`;
        await fs.copyFile(validatedPath, backupPath);
        backupCreated = true;
        logger.info(`Backup created: ${backupPath}`);
      } catch (error) {
        // File doesn't exist, no backup needed
      }

      // Write the file
      await fs.writeFile(validatedPath, content, "utf8");

      // Set appropriate permissions
      if (this.isLinux) {
        await execAsync(`chmod 644 "${validatedPath}"`);

        if (userId) {
          // Try to set ownership to user
          try {
            await execAsync(`chown ${userId}:${userId} "${validatedPath}"`);
          } catch (error) {
            logger.debug(`Could not change ownership of ${validatedPath}`, {
              error: error.message,
            });
          }
        }
      }

      const stats = await fs.stat(validatedPath);

      logger.info(`File written successfully: ${validatedPath}`, {
        size: stats.size,
        userId: userId,
        backupCreated: backupCreated,
      });

      return {
        success: true,
        message: `File ${path.basename(filePath)} saved successfully`,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        backupCreated: backupCreated,
      };
    } catch (error) {
      logger.error(`Failed to write file ${filePath}`, {
        error: error.message,
      });
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async deleteFile(filePath, userId = null) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.isLinux) {
        logger.info(`Mock: Deleting file ${filePath}`);
        return {
          success: true,
          message: `Mock file ${path.basename(filePath)} deleted`,
        };
      }

      const stats = await fs.stat(validatedPath);

      if (stats.isDirectory()) {
        // Delete directory recursively
        await fs.rmdir(validatedPath, { recursive: true });
        logger.info(`Directory deleted: ${validatedPath}`, { userId: userId });
      } else {
        // Delete file
        await fs.unlink(validatedPath);
        logger.info(`File deleted: ${validatedPath}`, { userId: userId });
      }

      return {
        success: true,
        message: `${stats.isDirectory() ? "Directory" : "File"} ${path.basename(
          filePath
        )} deleted successfully`,
      };
    } catch (error) {
      logger.error(`Failed to delete ${filePath}`, { error: error.message });
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  async createDirectory(dirPath, userId = null) {
    try {
      const validatedPath = this.validatePath(dirPath);

      if (!this.isLinux) {
        logger.info(`Mock: Creating directory ${dirPath}`);
        return {
          success: true,
          message: `Mock directory ${path.basename(dirPath)} created`,
        };
      }

      await fs.mkdir(validatedPath, { recursive: true, mode: 0o755 });

      // Set ownership if user specified
      if (this.isLinux && userId) {
        try {
          await execAsync(`chown ${userId}:${userId} "${validatedPath}"`);
        } catch (error) {
          logger.debug(`Could not change ownership of ${validatedPath}`, {
            error: error.message,
          });
        }
      }

      logger.info(`Directory created: ${validatedPath}`, { userId: userId });

      return {
        success: true,
        message: `Directory ${path.basename(dirPath)} created successfully`,
      };
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}`, {
        error: error.message,
      });
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async renameFile(oldPath, newPath, userId = null) {
    try {
      const validatedOldPath = this.validatePath(oldPath);
      const validatedNewPath = this.validatePath(newPath);
      this.validateFileExtension(path.basename(newPath));

      if (!this.isLinux) {
        logger.info(`Mock: Renaming ${oldPath} to ${newPath}`);
        return {
          success: true,
          message: `Mock file renamed from ${path.basename(
            oldPath
          )} to ${path.basename(newPath)}`,
        };
      }

      await fs.rename(validatedOldPath, validatedNewPath);

      logger.info(`File renamed: ${validatedOldPath} -> ${validatedNewPath}`, {
        userId: userId,
      });

      return {
        success: true,
        message: `Renamed ${path.basename(oldPath)} to ${path.basename(
          newPath
        )} successfully`,
      };
    } catch (error) {
      logger.error(`Failed to rename ${oldPath} to ${newPath}`, {
        error: error.message,
      });
      throw new Error(`Failed to rename: ${error.message}`);
    }
  }

  async copyFile(sourcePath, destinationPath, userId = null) {
    try {
      const validatedSourcePath = this.validatePath(sourcePath);
      const validatedDestPath = this.validatePath(destinationPath);
      this.validateFileExtension(path.basename(destinationPath));

      if (!this.isLinux) {
        logger.info(`Mock: Copying ${sourcePath} to ${destinationPath}`);
        return {
          success: true,
          message: `Mock file copied from ${path.basename(
            sourcePath
          )} to ${path.basename(destinationPath)}`,
        };
      }

      const stats = await fs.stat(validatedSourcePath);

      if (stats.isDirectory()) {
        // Copy directory recursively using cp command
        await execAsync(
          `cp -r "${validatedSourcePath}" "${validatedDestPath}"`
        );
      } else {
        // Copy file
        await fs.copyFile(validatedSourcePath, validatedDestPath);
      }

      // Set ownership if user specified
      if (this.isLinux && userId) {
        try {
          await execAsync(
            `chown -R ${userId}:${userId} "${validatedDestPath}"`
          );
        } catch (error) {
          logger.debug(`Could not change ownership of ${validatedDestPath}`, {
            error: error.message,
          });
        }
      }

      logger.info(
        `File copied: ${validatedSourcePath} -> ${validatedDestPath}`,
        { userId: userId }
      );

      return {
        success: true,
        message: `${
          stats.isDirectory() ? "Directory" : "File"
        } copied successfully`,
      };
    } catch (error) {
      logger.error(`Failed to copy ${sourcePath} to ${destinationPath}`, {
        error: error.message,
      });
      throw new Error(`Failed to copy: ${error.message}`);
    }
  }

  // Archive operations
  async createArchive(sourcePath, archivePath, format = "zip", userId = null) {
    try {
      const validatedSourcePath = this.validatePath(sourcePath);
      const validatedArchivePath = this.validatePath(archivePath);

      if (!this.isLinux) {
        logger.info(`Mock: Creating ${format} archive ${archivePath}`);
        return {
          success: true,
          message: `Mock ${format} archive created`,
          archivePath: archivePath,
          size: 1024 * 1024, // 1MB mock size
        };
      }

      if (format === "zip") {
        await this.createZipArchive(validatedSourcePath, validatedArchivePath);
      } else if (format === "tar.gz") {
        await this.createTarArchive(validatedSourcePath, validatedArchivePath);
      } else {
        throw new Error(`Unsupported archive format: ${format}`);
      }

      const stats = await fs.stat(validatedArchivePath);

      // Set ownership if user specified
      if (this.isLinux && userId) {
        try {
          await execAsync(
            `chown ${userId}:${userId} "${validatedArchivePath}"`
          );
        } catch (error) {
          logger.debug(
            `Could not change ownership of ${validatedArchivePath}`,
            { error: error.message }
          );
        }
      }

      logger.info(`Archive created: ${validatedArchivePath}`, {
        format: format,
        size: stats.size,
        userId: userId,
      });

      return {
        success: true,
        message: `${format} archive created successfully`,
        archivePath: validatedArchivePath,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
      };
    } catch (error) {
      logger.error(`Failed to create archive ${archivePath}`, {
        error: error.message,
      });
      throw new Error(`Failed to create archive: ${error.message}`);
    }
  }

  async createZipArchive(sourcePath, archivePath) {
    return new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(archivePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        resolve();
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);

      const stats = fsSync.statSync(sourcePath);
      if (stats.isDirectory()) {
        archive.directory(sourcePath, false);
      } else {
        archive.file(sourcePath, { name: path.basename(sourcePath) });
      }

      archive.finalize();
    });
  }

  async createTarArchive(sourcePath, archivePath) {
    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: path.dirname(sourcePath),
        },
        [path.basename(sourcePath)]
      );
    } else {
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: path.dirname(sourcePath),
        },
        [path.basename(sourcePath)]
      );
    }
  }

  async extractArchive(archivePath, extractPath, userId = null) {
    try {
      const validatedArchivePath = this.validatePath(archivePath);
      const validatedExtractPath = this.validatePath(extractPath);

      if (!this.isLinux) {
        logger.info(`Mock: Extracting archive ${archivePath}`);
        return {
          success: true,
          message: "Mock archive extracted",
          extractedFiles: 5,
        };
      }

      // Ensure extract directory exists
      await fs.mkdir(validatedExtractPath, { recursive: true, mode: 0o755 });

      const ext = path.extname(archivePath).toLowerCase();
      let extractedFiles = 0;

      if (ext === ".zip") {
        extractedFiles = await this.extractZipArchive(
          validatedArchivePath,
          validatedExtractPath
        );
      } else if (ext === ".gz" || archivePath.includes(".tar.gz")) {
        extractedFiles = await this.extractTarArchive(
          validatedArchivePath,
          validatedExtractPath
        );
      } else {
        throw new Error(`Unsupported archive format: ${ext}`);
      }

      // Set ownership if user specified
      if (this.isLinux && userId) {
        try {
          await execAsync(
            `chown -R ${userId}:${userId} "${validatedExtractPath}"`
          );
        } catch (error) {
          logger.debug(
            `Could not change ownership of ${validatedExtractPath}`,
            { error: error.message }
          );
        }
      }

      logger.info(`Archive extracted: ${validatedArchivePath}`, {
        extractPath: validatedExtractPath,
        extractedFiles: extractedFiles,
        userId: userId,
      });

      return {
        success: true,
        message: "Archive extracted successfully",
        extractedFiles: extractedFiles,
        extractPath: validatedExtractPath,
      };
    } catch (error) {
      logger.error(`Failed to extract archive ${archivePath}`, {
        error: error.message,
      });
      throw new Error(`Failed to extract archive: ${error.message}`);
    }
  }

  async extractZipArchive(archivePath, extractPath) {
    return new Promise((resolve, reject) => {
      let fileCount = 0;

      fsSync
        .createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on("entry", () => fileCount++)
        .on("close", () => resolve(fileCount))
        .on("error", reject);
    });
  }

  async extractTarArchive(archivePath, extractPath) {
    const fileList = await tar.list({ file: archivePath });

    await tar.extract({
      file: archivePath,
      cwd: extractPath,
    });

    return fileList.length;
  }

  // File permissions management
  async changePermissions(filePath, permissions, userId = null) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.isLinux) {
        logger.info(
          `Mock: Changing permissions for ${filePath} to ${permissions}`
        );
        return {
          success: true,
          message: `Mock permissions changed to ${permissions}`,
        };
      }

      // Validate permissions format (e.g., 755, 644)
      if (!/^[0-7]{3}$/.test(permissions)) {
        throw new Error(
          "Invalid permissions format. Use octal format (e.g., 755, 644)"
        );
      }

      await execAsync(`chmod ${permissions} "${validatedPath}"`);

      logger.info(`Permissions changed: ${validatedPath} -> ${permissions}`, {
        userId: userId,
      });

      return {
        success: true,
        message: `Permissions changed to ${permissions} successfully`,
      };
    } catch (error) {
      logger.error(`Failed to change permissions for ${filePath}`, {
        error: error.message,
      });
      throw new Error(`Failed to change permissions: ${error.message}`);
    }
  }

  async changeOwnership(filePath, owner, group = null, userId = null) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.isLinux) {
        logger.info(
          `Mock: Changing ownership for ${filePath} to ${owner}:${
            group || owner
          }`
        );
        return {
          success: true,
          message: `Mock ownership changed to ${owner}:${group || owner}`,
        };
      }

      const ownerGroup = group ? `${owner}:${group}` : owner;
      await execAsync(`chown -R ${ownerGroup} "${validatedPath}"`);

      logger.info(`Ownership changed: ${validatedPath} -> ${ownerGroup}`, {
        userId: userId,
      });

      return {
        success: true,
        message: `Ownership changed to ${ownerGroup} successfully`,
      };
    } catch (error) {
      logger.error(`Failed to change ownership for ${filePath}`, {
        error: error.message,
      });
      throw new Error(`Failed to change ownership: ${error.message}`);
    }
  }

  // Utility functions
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  getMockDirectoryListing(dirPath) {
    const mockItems = [
      {
        name: "index.html",
        path: path.join(dirPath, "index.html"),
        type: "file",
        size: 2048,
        sizeFormatted: "2 KB",
        modified: new Date().toISOString(),
        permissions: "-rw-r--r--",
        owner: "www-data",
        group: "www-data",
        mimeType: "text/html",
        isReadable: true,
        isWritable: true,
        isExecutable: false,
      },
      {
        name: "assets",
        path: path.join(dirPath, "assets"),
        type: "directory",
        size: 4096,
        sizeFormatted: "4 KB",
        modified: new Date().toISOString(),
        permissions: "drwxr-xr-x",
        owner: "www-data",
        group: "www-data",
        mimeType: null,
        isReadable: true,
        isWritable: true,
        isExecutable: true,
      },
    ];

    return {
      path: dirPath,
      items: mockItems,
      totalItems: mockItems.length,
      parentPath: path.dirname(dirPath),
      mock: true,
    };
  }
}

module.exports = new FileService();

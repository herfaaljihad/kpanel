// File System Service - Production File Operations (Cross-Platform)
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
    this.isWindows = process.platform === "win32";
    this.isProduction = process.env.NODE_ENV === "production";

    // Base paths for security - Cross-platform
    this.basePaths = {
      webRoot: process.env.WEB_ROOT || (this.isWindows ? "C:\\inetpub\\wwwroot" : "/var/www"),
      userHome: process.env.USER_HOME || (this.isWindows ? "C:\\Users" : "/home"),
      backupPath: process.env.BACKUP_PATH || (this.isWindows ? "C:\\KPanel\\backups" : "/var/backups/kpanel"),
      tempPath: process.env.TEMP_PATH || (this.isWindows ? "C:\\temp\\kpanel" : "/tmp/kpanel"),
    };

    // Security restrictions - Cross-platform
    this.restrictedPaths = this.isWindows ? [
      "C:\\Windows\\System32",
      "C:\\Windows\\SysWOW64", 
      "C:\\Program Files",
      "C:\\Program Files (x86)",
      "C:\\Users\\Administrator",
      "C:\\ProgramData"
    ] : [
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
      ".txt", ".html", ".htm", ".css", ".js", ".json", ".xml", ".yaml", ".yml",
      ".php", ".py", ".rb", ".pl", ".sh", ".bat", ".cmd", ".ps1",
      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico",
      ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm",
      ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
      ".zip", ".rar", ".tar", ".gz", ".bz2", ".7z",
      ".sql", ".csv", ".log", ".conf", ".cfg", ".ini",
    ];

    // Maximum file size (100MB default)
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024;

    this.initializeFileService();
  }

  async initializeFileService() {
    try {
      // Create required directories
      await fs.mkdir(this.basePaths.tempPath, { recursive: true });
      await fs.mkdir(this.basePaths.backupPath, { recursive: true });
      
      logger.info("File service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize File service", {
        error: error.message,
      });
    }
  }

  // Path validation and security
  validatePath(filePath, basePath = null) {
    if (!filePath || typeof filePath !== "string") {
      throw new Error("Invalid file path");
    }

    const resolvedPath = path.resolve(basePath || this.basePaths.webRoot, filePath);
    const normalizedPath = path.normalize(resolvedPath);

    // Check for path traversal
    if (normalizedPath.includes("..")) {
      throw new Error("Path traversal detected");
    }

    // Check restricted paths
    for (const restrictedPath of this.restrictedPaths) {
      if (normalizedPath.startsWith(restrictedPath)) {
        throw new Error(`Access to ${restrictedPath} is restricted`);
      }
    }

    // Ensure path is within allowed base paths
    const allowedBases = Object.values(this.basePaths);
    const isAllowed = allowedBases.some(basePath => 
      normalizedPath.startsWith(path.resolve(basePath))
    );

    if (!isAllowed) {
      throw new Error("Path is outside allowed directories");
    }

    return normalizedPath;
  }

  validateFileExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (this.allowedExtensions.length > 0 && !this.allowedExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} is not allowed`);
    }
    return true;
  }

  // Cross-platform file permissions
  async getFilePermissions(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (this.isWindows) {
        // Windows basic permissions
        return {
          mode: stats.mode,
          permissions: this.formatWindowsPermissions(stats.mode),
          owner: "user", // Windows doesn't have easy owner detection
          group: "users",
          isReadable: true, // Assume readable if we can stat it
          isWritable: !stats.mode || (stats.mode & 0o200) !== 0,
          isExecutable: path.extname(filePath).match(/\.(exe|bat|cmd|ps1)$/i) !== null,
        };
      } else {
        // Linux/Unix permissions
        const mode = stats.mode;
        return {
          mode: mode,
          permissions: this.formatUnixPermissions(mode),
          owner: stats.uid.toString(), // Would need user lookup for name
          group: stats.gid.toString(), // Would need group lookup for name
          isReadable: (mode & 0o400) !== 0,
          isWritable: (mode & 0o200) !== 0,
          isExecutable: (mode & 0o100) !== 0,
        };
      }
    } catch (error) {
      logger.warn(`Failed to get permissions for ${filePath}`, { error: error.message });
      return {
        mode: 0,
        permissions: "unknown",
        owner: "unknown",
        group: "unknown",
        isReadable: false,
        isWritable: false,
        isExecutable: false,
      };
    }
  }

  formatUnixPermissions(mode) {
    const permissions = [];
    
    // File type
    if ((mode & 0o040000) !== 0) permissions.push('d');
    else if ((mode & 0o120000) !== 0) permissions.push('l');
    else permissions.push('-');
    
    // Owner permissions
    permissions.push((mode & 0o400) ? 'r' : '-');
    permissions.push((mode & 0o200) ? 'w' : '-');
    permissions.push((mode & 0o100) ? 'x' : '-');
    
    // Group permissions
    permissions.push((mode & 0o040) ? 'r' : '-');
    permissions.push((mode & 0o020) ? 'w' : '-');
    permissions.push((mode & 0o010) ? 'x' : '-');
    
    // Other permissions
    permissions.push((mode & 0o004) ? 'r' : '-');
    permissions.push((mode & 0o002) ? 'w' : '-');
    permissions.push((mode & 0o001) ? 'x' : '-');
    
    return permissions.join('');
  }

  formatWindowsPermissions(mode) {
    // Simplified Windows permissions
    let permissions = '-';
    permissions += (mode & 0o400) ? 'r' : '-';
    permissions += (mode & 0o200) ? 'w' : '-';
    permissions += 'x'; // Assume executable based on extension
    permissions += '------'; // Simplified group/other
    return permissions;
  }

  // File operations
  async listDirectory(dirPath, userId = null) {
    try {
      const validatedPath = this.validatePath(dirPath);
      const items = await fs.readdir(validatedPath, { withFileTypes: true });
      const fileList = [];

      for (const item of items) {
        try {
          const itemPath = path.join(validatedPath, item.name);
          const stats = await fs.stat(itemPath);
          const permissions = await this.getFilePermissions(itemPath);

          const fileInfo = {
            name: item.name,
            path: itemPath,
            relativePath: path.relative(this.basePaths.webRoot, itemPath),
            type: item.isDirectory() ? "directory" : "file",
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            modified: stats.mtime.toISOString(),
            created: stats.birthtime ? stats.birthtime.toISOString() : stats.ctime.toISOString(),
            permissions: permissions.permissions,
            owner: permissions.owner,
            group: permissions.group,
            mimeType: item.isDirectory() ? null : mime.lookup(item.name) || "application/octet-stream",
            isReadable: permissions.isReadable,
            isWritable: permissions.isWritable,
            isExecutable: permissions.isExecutable,
            isHidden: item.name.startsWith('.'),
          };

          fileList.push(fileInfo);
        } catch (error) {
          logger.warn(`Failed to process item ${item.name}`, { error: error.message });
        }
      }

      // Sort: directories first, then by name
      fileList.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        path: validatedPath,
        relativePath: path.relative(this.basePaths.webRoot, validatedPath),
        items: fileList,
        totalItems: fileList.length,
        totalSize: fileList.reduce((sum, item) => sum + item.size, 0),
        parentPath: path.dirname(validatedPath),
        canNavigateUp: validatedPath !== this.basePaths.webRoot,
      };
    } catch (error) {
      logger.error(`Failed to list directory ${dirPath}`, { error: error.message });
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async readFile(filePath, encoding = "utf8") {
    try {
      const validatedPath = this.validatePath(filePath);
      this.validateFileExtension(filePath);

      const stats = await fs.stat(validatedPath);
      
      if (stats.size > this.maxFileSize) {
        throw new Error("File too large to read");
      }

      const content = await fs.readFile(validatedPath, encoding);
      const mimeType = mime.lookup(filePath) || "text/plain";

      return {
        success: true,
        content: content,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        mimeType: mimeType,
        lastModified: stats.mtime.toISOString(),
        encoding: encoding,
      };
    } catch (error) {
      logger.error(`Failed to read file ${filePath}`, { error: error.message });
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, content, options = {}) {
    try {
      const validatedPath = this.validatePath(filePath);
      this.validateFileExtension(filePath);

      const encoding = options.encoding || "utf8";
      const backup = options.backup || false;

      // Create backup if requested
      if (backup) {
        try {
          await fs.access(validatedPath);
          const backupPath = `${validatedPath}.backup.${Date.now()}`;
          await fs.copyFile(validatedPath, backupPath);
          logger.info(`Backup created: ${backupPath}`);
        } catch (error) {
          // File doesn't exist, no backup needed
        }
      }

      // Ensure directory exists
      const dirPath = path.dirname(validatedPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(validatedPath, content, encoding);

      const stats = await fs.stat(validatedPath);

      logger.info(`File written successfully: ${filePath}`, {
        size: stats.size,
        encoding: encoding,
      });

      return {
        success: true,
        message: `File ${path.basename(filePath)} saved successfully`,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        lastModified: stats.mtime.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to write file ${filePath}`, { error: error.message });
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    try {
      const validatedPath = this.validatePath(filePath);
      
      const stats = await fs.stat(validatedPath);
      
      if (stats.isDirectory()) {
        await fs.rm(validatedPath, { recursive: true, force: true });
      } else {
        await fs.unlink(validatedPath);
      }

      logger.info(`File/directory deleted: ${filePath}`);

      return {
        success: true,
        message: `${stats.isDirectory() ? 'Directory' : 'File'} ${path.basename(filePath)} deleted successfully`,
      };
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}`, { error: error.message });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async createDirectory(dirPath) {
    try {
      const validatedPath = this.validatePath(dirPath);
      
      await fs.mkdir(validatedPath, { recursive: true });

      logger.info(`Directory created: ${dirPath}`);

      return {
        success: true,
        message: `Directory ${path.basename(dirPath)} created successfully`,
        path: validatedPath,
      };
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}`, { error: error.message });
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async renameFile(oldPath, newPath) {
    try {
      const validatedOldPath = this.validatePath(oldPath);
      const validatedNewPath = this.validatePath(newPath);
      
      this.validateFileExtension(newPath);

      // Check if destination already exists
      try {
        await fs.access(validatedNewPath);
        throw new Error("Destination file already exists");
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, which is what we want
      }

      await fs.rename(validatedOldPath, validatedNewPath);

      logger.info(`File renamed: ${oldPath} -> ${newPath}`);

      return {
        success: true,
        message: `File renamed from ${path.basename(oldPath)} to ${path.basename(newPath)}`,
        newPath: validatedNewPath,
      };
    } catch (error) {
      logger.error(`Failed to rename file ${oldPath}`, { error: error.message });
      throw new Error(`Failed to rename file: ${error.message}`);
    }
  }

  async copyFile(sourcePath, destinationPath) {
    try {
      const validatedSourcePath = this.validatePath(sourcePath);
      const validatedDestPath = this.validatePath(destinationPath);
      
      this.validateFileExtension(destinationPath);

      // Ensure destination directory exists
      const destDir = path.dirname(validatedDestPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file or directory
      const sourceStats = await fs.stat(validatedSourcePath);
      
      if (sourceStats.isDirectory()) {
        await this.copyDirectoryRecursive(validatedSourcePath, validatedDestPath);
      } else {
        await fs.copyFile(validatedSourcePath, validatedDestPath);
      }

      const destStats = await fs.stat(validatedDestPath);

      logger.info(`File/directory copied: ${sourcePath} -> ${destinationPath}`);

      return {
        success: true,
        message: `${sourceStats.isDirectory() ? 'Directory' : 'File'} copied from ${path.basename(sourcePath)} to ${path.basename(destinationPath)}`,
        size: destStats.size,
        sizeFormatted: this.formatFileSize(destStats.size),
      };
    } catch (error) {
      logger.error(`Failed to copy file ${sourcePath}`, { error: error.message });
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  async copyDirectoryRecursive(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const items = await fs.readdir(src, { withFileTypes: true });

    for (const item of items) {
      const srcPath = path.join(src, item.name);
      const destPath = path.join(dest, item.name);

      if (item.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Archive operations
  async createArchive(sourcePaths, archivePath, format = "zip") {
    try {
      const validatedArchivePath = this.validatePath(archivePath);
      const validatedSourcePaths = sourcePaths.map(p => this.validatePath(p));

      if (!["zip", "tar", "tar.gz"].includes(format)) {
        throw new Error("Unsupported archive format");
      }

      // Ensure archive directory exists
      const archiveDir = path.dirname(validatedArchivePath);
      await fs.mkdir(archiveDir, { recursive: true });

      let archiveSize = 0;

      if (format === "zip") {
        archiveSize = await this.createZipArchive(validatedSourcePaths, validatedArchivePath);
      } else if (format.startsWith("tar")) {
        archiveSize = await this.createTarArchive(validatedSourcePaths, validatedArchivePath, format === "tar.gz");
      }

      logger.info(`Archive created: ${archivePath}`, { format, size: archiveSize });

      return {
        success: true,
        message: `${format.toUpperCase()} archive created successfully`,
        archivePath: validatedArchivePath,
        format: format,
        size: archiveSize,
        sizeFormatted: this.formatFileSize(archiveSize),
      };
    } catch (error) {
      logger.error(`Failed to create archive ${archivePath}`, { error: error.message });
      throw new Error(`Failed to create archive: ${error.message}`);
    }
  }

  async createZipArchive(sourcePaths, archivePath) {
    return new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(archivePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        resolve(archive.pointer());
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      for (const sourcePath of sourcePaths) {
        const stats = fsSync.statSync(sourcePath);
        const baseName = path.basename(sourcePath);

        if (stats.isDirectory()) {
          archive.directory(sourcePath, baseName);
        } else {
          archive.file(sourcePath, { name: baseName });
        }
      }

      archive.finalize();
    });
  }

  async createTarArchive(sourcePaths, archivePath, gzip = false) {
    const options = {
      gzip: gzip,
      file: archivePath,
    };

    // For tar, we need to change directory to include relative paths
    const baseDir = path.dirname(sourcePaths[0]);
    const relativePaths = sourcePaths.map(p => path.relative(baseDir, p));

    options.cwd = baseDir;

    await tar.create(options, relativePaths);
    
    const stats = await fs.stat(archivePath);
    return stats.size;
  }

  async extractArchive(archivePath, destinationPath) {
    try {
      const validatedArchivePath = this.validatePath(archivePath);
      const validatedDestPath = this.validatePath(destinationPath);

      // Ensure destination directory exists
      await fs.mkdir(validatedDestPath, { recursive: true });

      const archiveExt = path.extname(archivePath).toLowerCase();
      let extractedSize = 0;

      if (archiveExt === ".zip") {
        extractedSize = await this.extractZipArchive(validatedArchivePath, validatedDestPath);
      } else if (archiveExt === ".tar" || archivePath.endsWith('.tar.gz')) {
        extractedSize = await this.extractTarArchive(validatedArchivePath, validatedDestPath);
      } else {
        throw new Error("Unsupported archive format");
      }

      logger.info(`Archive extracted: ${archivePath}`, { 
        destination: destinationPath, 
        size: extractedSize 
      });

      return {
        success: true,
        message: "Archive extracted successfully",
        extractedPath: validatedDestPath,
        extractedSize: extractedSize,
        sizeFormatted: this.formatFileSize(extractedSize),
      };
    } catch (error) {
      logger.error(`Failed to extract archive ${archivePath}`, { error: error.message });
      throw new Error(`Failed to extract archive: ${error.message}`);
    }
  }

  async extractZipArchive(archivePath, destinationPath) {
    return new Promise((resolve, reject) => {
      let extractedSize = 0;

      fsSync.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: destinationPath }))
        .on('entry', (entry) => {
          extractedSize += entry.size || 0;
        })
        .on('close', () => {
          resolve(extractedSize);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  async extractTarArchive(archivePath, destinationPath) {
    await tar.extract({
      file: archivePath,
      cwd: destinationPath,
    });

    // Calculate extracted size
    return await this.calculateDirectorySize(destinationPath);
  }

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

  // File permissions (cross-platform)
  async changePermissions(filePath, permissions) {
    try {
      const validatedPath = this.validatePath(filePath);
      
      if (this.isLinux) {
        // On Linux, use chmod with octal permissions
        const octalPerms = parseInt(permissions, 8);
        await fs.chmod(validatedPath, octalPerms);
      } else {
        // On Windows, limited permission changes
        const stats = await fs.stat(validatedPath);
        if (permissions.includes('w')) {
          // Make writable
          await fs.chmod(validatedPath, stats.mode | 0o200);
        } else {
          // Make read-only
          await fs.chmod(validatedPath, stats.mode & ~0o200);
        }
      }

      logger.info(`Permissions changed for ${filePath} to ${permissions}`);

      return {
        success: true,
        message: `Permissions changed successfully`,
        permissions: permissions,
      };
    } catch (error) {
      logger.error(`Failed to change permissions for ${filePath}`, { error: error.message });
      throw new Error(`Failed to change permissions: ${error.message}`);
    }
  }

  // File upload handling
  async handleUpload(file, destinationPath, options = {}) {
    try {
      const validatedDestPath = this.validatePath(destinationPath);
      this.validateFileExtension(file.originalname || file.name);

      // Check file size
      if (file.size > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.formatFileSize(this.maxFileSize)}`);
      }

      // Ensure destination directory exists
      const destDir = path.dirname(validatedDestPath);
      await fs.mkdir(destDir, { recursive: true });

      // Move uploaded file to destination
      if (file.buffer) {
        await fs.writeFile(validatedDestPath, file.buffer);
      } else if (file.path) {
        await fs.rename(file.path, validatedDestPath);
      } else {
        throw new Error("Invalid file upload data");
      }

      const stats = await fs.stat(validatedDestPath);

      logger.info(`File uploaded: ${file.originalname || file.name}`, {
        destination: validatedDestPath,
        size: stats.size,
      });

      return {
        success: true,
        message: `File ${file.originalname || file.name} uploaded successfully`,
        filePath: validatedDestPath,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        mimeType: mime.lookup(file.originalname || file.name) || "application/octet-stream",
      };
    } catch (error) {
      logger.error(`Failed to upload file`, { error: error.message });
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Utility methods
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Get file/directory info
  async getFileInfo(filePath) {
    try {
      const validatedPath = this.validatePath(filePath);
      const stats = await fs.stat(validatedPath);
      const permissions = await this.getFilePermissions(validatedPath);

      return {
        name: path.basename(filePath),
        path: validatedPath,
        relativePath: path.relative(this.basePaths.webRoot, validatedPath),
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime ? stats.birthtime.toISOString() : stats.ctime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: permissions.permissions,
        owner: permissions.owner,
        group: permissions.group,
        mimeType: stats.isDirectory() ? null : mime.lookup(filePath) || "application/octet-stream",
        isReadable: permissions.isReadable,
        isWritable: permissions.isWritable,
        isExecutable: permissions.isExecutable,
        isHidden: path.basename(filePath).startsWith('.'),
      };
    } catch (error) {
      logger.error(`Failed to get file info for ${filePath}`, { error: error.message });
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  // Search files
  async searchFiles(searchTerm, searchPath = null, options = {}) {
    try {
      const basePath = searchPath ? this.validatePath(searchPath) : this.basePaths.webRoot;
      const results = [];
      const maxResults = options.maxResults || 100;
      const fileTypesOnly = options.fileTypesOnly || false;

      await this.searchInDirectory(basePath, searchTerm, results, maxResults, fileTypesOnly);

      logger.info(`File search completed: "${searchTerm}" in ${basePath}`, {
        results: results.length,
      });

      return {
        searchTerm: searchTerm,
        searchPath: basePath,
        results: results,
        totalResults: results.length,
      };
    } catch (error) {
      logger.error(`Failed to search files for "${searchTerm}"`, { error: error.message });
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  async searchInDirectory(dirPath, searchTerm, results, maxResults, fileTypesOnly) {
    if (results.length >= maxResults) {
      return;
    }

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        if (results.length >= maxResults) {
          break;
        }

        const itemPath = path.join(dirPath, item.name);
        
        // Check if name matches search term
        if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          if (!fileTypesOnly || item.isFile()) {
            const stats = await fs.stat(itemPath);
            results.push({
              name: item.name,
              path: itemPath,
              relativePath: path.relative(this.basePaths.webRoot, itemPath),
              type: item.isDirectory() ? "directory" : "file",
              size: stats.size,
              sizeFormatted: this.formatFileSize(stats.size),
              modified: stats.mtime.toISOString(),
            });
          }
        }

        // Recursively search directories
        if (item.isDirectory()) {
          await this.searchInDirectory(itemPath, searchTerm, results, maxResults, fileTypesOnly);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      logger.debug(`Cannot read directory ${dirPath}:`, error.message);
    }
  }
}

module.exports = new FileService();
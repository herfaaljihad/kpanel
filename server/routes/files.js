// File Management Route - System Integration
// server/routes/files.js

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const fileService = require("../services/fileService");
const { logger } = require("../utils/logger");
const { validateRequest } = require("../utils/validation");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = `/home/${req.user.email}/uploads`;
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${Date.now()}_${sanitized}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10,
  },
});

// Get file listing
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { path: requestedPath = "." } = req.query;

    logger.info("File listing requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: requestedPath,
    });

    const result = await fileService.listFiles(req.user.email, requestedPath);

    res.json({
      success: true,
      current_path: result.currentPath,
      parent_path: result.parentPath,
      files: result.files,
      totalFiles: result.files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("File listing error", {
      userId: req.user.userId,
      path: req.query.path,
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
        error: "Directory not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to list files",
    });
  }
});

// Read file content
router.get("/read", authenticateToken, async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path is required",
      });
    }

    logger.info("File read requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: filePath,
    });

    const result = await fileService.readFile(req.user.email, filePath);

    res.json({
      success: true,
      path: filePath,
      content: result.content,
      encoding: result.encoding,
      size: result.size,
      mimeType: result.mimeType,
      lastModified: result.lastModified,
    });
  } catch (error) {
    logger.error("File read error", {
      userId: req.user.userId,
      path: req.query.path,
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
        error: "File not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to read file",
    });
  }
});

// Write file content
router.post("/write", authenticateToken, async (req, res) => {
  try {
    const { path: filePath, content, encoding = "utf8" } = req.body;

    const validation = validateRequest(req.body, ["path", "content"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("File write requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: filePath,
      size: content.length,
    });

    const result = await fileService.writeFile(
      req.user.email,
      filePath,
      content,
      encoding
    );

    res.json({
      success: true,
      path: filePath,
      size: result.size,
      encoding: encoding,
      lastModified: result.lastModified,
      message: "File saved successfully",
    });
  } catch (error) {
    logger.error("File write error", {
      userId: req.user.userId,
      path: req.body.path,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to write file",
    });
  }
});

// Upload files
router.post(
  "/upload",
  authenticateToken,
  upload.array("files"),
  async (req, res) => {
    try {
      const { path: targetPath = "." } = req.body;

      logger.info("File upload requested", {
        userId: req.user.userId,
        email: req.user.email,
        targetPath: targetPath,
        fileCount: req.files?.length || 0,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files provided",
        });
      }

      const result = await fileService.uploadFiles(
        req.user.email,
        req.files,
        targetPath
      );

      res.json({
        success: true,
        uploadedFiles: result.uploadedFiles,
        totalFiles: result.totalFiles,
        totalSize: result.totalSize,
        targetPath: targetPath,
        message: `Successfully uploaded ${result.totalFiles} file(s)`,
      });
    } catch (error) {
      logger.error("File upload error", {
        userId: req.user.userId,
        error: error.message,
      });

      if (error.message.includes("Access denied")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      if (error.message.includes("File too large")) {
        return res.status(413).json({
          success: false,
          error: "File too large",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to upload files",
      });
    }
  }
);

// Delete file or directory
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const { path: targetPath } = req.body;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: "Path is required",
      });
    }

    logger.info("File delete requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: targetPath,
    });

    const result = await fileService.deleteFile(req.user.email, targetPath);

    res.json({
      success: true,
      path: targetPath,
      type: result.type,
      message: `Successfully deleted ${result.type}`,
    });
  } catch (error) {
    logger.error("File delete error", {
      userId: req.user.userId,
      path: req.body.path,
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
        error: "File or directory not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete file",
    });
  }
});

// Create directory
router.post("/mkdir", authenticateToken, async (req, res) => {
  try {
    const { path: dirPath, name } = req.body;

    const validation = validateRequest(req.body, ["name"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Directory creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: dirPath,
      name: name,
    });

    const result = await fileService.createDirectory(
      req.user.email,
      dirPath,
      name
    );

    res.json({
      success: true,
      path: result.path,
      name: name,
      fullPath: result.fullPath,
      message: "Directory created successfully",
    });
  } catch (error) {
    logger.error("Directory creation error", {
      userId: req.user.userId,
      path: req.body.path,
      name: req.body.name,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "Directory already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create directory",
    });
  }
});

// Rename file or directory
router.post("/rename", authenticateToken, async (req, res) => {
  try {
    const { path: targetPath, newName } = req.body;

    const validation = validateRequest(req.body, ["path", "newName"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("File rename requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: targetPath,
      newName: newName,
    });

    const result = await fileService.renameFile(
      req.user.email,
      targetPath,
      newName
    );

    res.json({
      success: true,
      oldPath: targetPath,
      newPath: result.newPath,
      newName: newName,
      message: "File renamed successfully",
    });
  } catch (error) {
    logger.error("File rename error", {
      userId: req.user.userId,
      path: req.body.path,
      newName: req.body.newName,
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
        error: "File not found",
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "File with that name already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to rename file",
    });
  }
});

// Copy file or directory
router.post("/copy", authenticateToken, async (req, res) => {
  try {
    const { source, destination } = req.body;

    const validation = validateRequest(req.body, ["source", "destination"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("File copy requested", {
      userId: req.user.userId,
      email: req.user.email,
      source: source,
      destination: destination,
    });

    const result = await fileService.copyFile(
      req.user.email,
      source,
      destination
    );

    res.json({
      success: true,
      source: source,
      destination: destination,
      size: result.size,
      type: result.type,
      message: "File copied successfully",
    });
  } catch (error) {
    logger.error("File copy error", {
      userId: req.user.userId,
      source: req.body.source,
      destination: req.body.destination,
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
        error: "Source file not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to copy file",
    });
  }
});

// Move file or directory
router.post("/move", authenticateToken, async (req, res) => {
  try {
    const { source, destination } = req.body;

    const validation = validateRequest(req.body, ["source", "destination"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("File move requested", {
      userId: req.user.userId,
      email: req.user.email,
      source: source,
      destination: destination,
    });

    const result = await fileService.moveFile(
      req.user.email,
      source,
      destination
    );

    res.json({
      success: true,
      source: source,
      destination: destination,
      type: result.type,
      message: "File moved successfully",
    });
  } catch (error) {
    logger.error("File move error", {
      userId: req.user.userId,
      source: req.body.source,
      destination: req.body.destination,
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
        error: "Source file not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to move file",
    });
  }
});

// Change file permissions
router.post("/permissions", authenticateToken, async (req, res) => {
  try {
    const { path: targetPath, permissions } = req.body;

    const validation = validateRequest(req.body, ["path", "permissions"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("File permissions change requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: targetPath,
      permissions: permissions,
    });

    const result = await fileService.changePermissions(
      req.user.email,
      targetPath,
      permissions
    );

    res.json({
      success: true,
      path: targetPath,
      oldPermissions: result.oldPermissions,
      newPermissions: result.newPermissions,
      message: "Permissions changed successfully",
    });
  } catch (error) {
    logger.error("File permissions error", {
      userId: req.user.userId,
      path: req.body.path,
      permissions: req.body.permissions,
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
        error: "File not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to change permissions",
    });
  }
});

// Create archive (zip/tar)
router.post("/archive", authenticateToken, async (req, res) => {
  try {
    const { paths, archiveName, format = "zip" } = req.body;

    const validation = validateRequest(req.body, ["paths", "archiveName"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Archive creation requested", {
      userId: req.user.userId,
      email: req.user.email,
      paths: paths,
      archiveName: archiveName,
      format: format,
    });

    const result = await fileService.createArchive(
      req.user.email,
      paths,
      archiveName,
      format
    );

    res.json({
      success: true,
      archivePath: result.archivePath,
      archiveName: archiveName,
      format: format,
      size: result.size,
      fileCount: result.fileCount,
      message: "Archive created successfully",
    });
  } catch (error) {
    logger.error("Archive creation error", {
      userId: req.user.userId,
      paths: req.body.paths,
      archiveName: req.body.archiveName,
      error: error.message,
    });

    if (error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create archive",
    });
  }
});

// Extract archive
router.post("/extract", authenticateToken, async (req, res) => {
  try {
    const { archivePath, destination } = req.body;

    const validation = validateRequest(req.body, ["archivePath"]);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    logger.info("Archive extraction requested", {
      userId: req.user.userId,
      email: req.user.email,
      archivePath: archivePath,
      destination: destination,
    });

    const result = await fileService.extractArchive(
      req.user.email,
      archivePath,
      destination
    );

    res.json({
      success: true,
      archivePath: archivePath,
      destination: result.destination,
      extractedFiles: result.extractedFiles,
      fileCount: result.fileCount,
      message: "Archive extracted successfully",
    });
  } catch (error) {
    logger.error("Archive extraction error", {
      userId: req.user.userId,
      archivePath: req.body.archivePath,
      destination: req.body.destination,
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
        error: "Archive file not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to extract archive",
    });
  }
});

// Download file
router.get("/download", authenticateToken, async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path is required",
      });
    }

    logger.info("File download requested", {
      userId: req.user.userId,
      email: req.user.email,
      path: filePath,
    });

    const result = await fileService.downloadFile(req.user.email, filePath);

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Length", result.size);

    // Stream file to response
    result.stream.pipe(res);
  } catch (error) {
    logger.error("File download error", {
      userId: req.user.userId,
      path: req.query.path,
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
        error: "File not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to download file",
    });
  }
});

module.exports = router;

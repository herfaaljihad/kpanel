const { logger } = require("../utils/logger");

// Enhanced error handling and response management
class ErrorHandler {
  // Main error handling middleware
  static handle(err, req, res, next) {
    // Set default values
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "Internal Server Error";
    let code = err.code || "INTERNAL_ERROR";
    let details = err.details || null;

    // Handle specific error types
    switch (err.name) {
      case "ValidationError":
        statusCode = 400;
        message = "Validation failed";
        code = "VALIDATION_ERROR";
        details = err.errors;
        break;

      case "CastError":
        statusCode = 400;
        message = "Invalid data format";
        code = "INVALID_FORMAT";
        break;

      case "JsonWebTokenError":
        statusCode = 401;
        message = "Invalid authentication token";
        code = "INVALID_TOKEN";
        break;

      case "TokenExpiredError":
        statusCode = 401;
        message = "Authentication token expired";
        code = "TOKEN_EXPIRED";
        break;

      case "MulterError":
        statusCode = 400;
        message = ErrorHandler.getMulterErrorMessage(err.code);
        code = "FILE_UPLOAD_ERROR";
        break;

      case "MongoError":
      case "MongoServerError":
        if (err.code === 11000) {
          statusCode = 409;
          message = "Resource already exists";
          code = "DUPLICATE_RESOURCE";
          details = ErrorHandler.extractDuplicateKeyInfo(err);
        }
        break;

      case "SequelizeValidationError":
        statusCode = 400;
        message = "Database validation failed";
        code = "DB_VALIDATION_ERROR";
        details = err.errors.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        }));
        break;

      case "SequelizeUniqueConstraintError":
        statusCode = 409;
        message = "Resource already exists";
        code = "DUPLICATE_RESOURCE";
        details = err.errors.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        }));
        break;

      case "SequelizeForeignKeyConstraintError":
        statusCode = 400;
        message = "Invalid reference to related resource";
        code = "FOREIGN_KEY_ERROR";
        break;

      case "SequelizeConnectionError":
        statusCode = 503;
        message = "Database connection failed";
        code = "DB_CONNECTION_ERROR";
        break;
    }

    // Handle MySQL specific errors
    if (err.code) {
      switch (err.code) {
        case "ER_DUP_ENTRY":
          statusCode = 409;
          message = "Resource already exists";
          code = "DUPLICATE_RESOURCE";
          break;

        case "ER_NO_REFERENCED_ROW":
        case "ER_NO_REFERENCED_ROW_2":
          statusCode = 400;
          message = "Invalid reference to related resource";
          code = "FOREIGN_KEY_ERROR";
          break;

        case "ER_BAD_FIELD_ERROR":
          statusCode = 400;
          message = "Invalid field specified";
          code = "INVALID_FIELD";
          break;

        case "ER_PARSE_ERROR":
          statusCode = 400;
          message = "Invalid query syntax";
          code = "QUERY_SYNTAX_ERROR";
          break;

        case "ECONNREFUSED":
          statusCode = 503;
          message = "Database connection refused";
          code = "DB_CONNECTION_REFUSED";
          break;

        case "PROTOCOL_CONNECTION_LOST":
          statusCode = 503;
          message = "Database connection lost";
          code = "DB_CONNECTION_LOST";
          break;
      }
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === "production" && statusCode === 500) {
      message = "An unexpected error occurred";
      details = null;
    }

    // Log the error
    const logData = {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        userId: req.user?.id,
      },
      statusCode,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      logger.error("Server error occurred", logData);
    } else {
      logger.warn("Client error occurred", logData);
    }

    // Send error response
    const response = {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };

    if (details) {
      response.details = details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === "development") {
      response.stack = err.stack;
      response.originalError = {
        name: err.name,
        message: err.message,
        code: err.code,
      };
    }

    res.status(statusCode).json(response);
  }

  // Handle async errors
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // 404 handler
  static notFound(req, res) {
    const response = {
      success: false,
      message: "Endpoint not found",
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
      requestId: req.id,
      availableEndpoints: ErrorHandler.getAvailableEndpoints(),
    };

    logger.warn("404 - Endpoint not found", {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(404).json(response);
  }

  // Uncaught exception handler
  static handleUncaughtException() {
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception", {
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
        timestamp: new Date().toISOString(),
      });

      // Graceful shutdown
      process.exit(1);
    });
  }

  // Unhandled promise rejection handler
  static handleUnhandledRejection() {
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Promise Rejection", {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        timestamp: new Date().toISOString(),
      });

      // Graceful shutdown
      process.exit(1);
    });
  }

  // Helper methods
  static getMulterErrorMessage(code) {
    const messages = {
      LIMIT_FILE_SIZE: "File size exceeds limit",
      LIMIT_FILE_COUNT: "Too many files uploaded",
      LIMIT_FIELD_KEY: "Field name too long",
      LIMIT_FIELD_VALUE: "Field value too long",
      LIMIT_FIELD_COUNT: "Too many fields",
      LIMIT_UNEXPECTED_FILE: "Unexpected file uploaded",
      MISSING_FIELD_NAME: "Field name is missing",
    };

    return messages[code] || "File upload error";
  }

  static extractDuplicateKeyInfo(err) {
    try {
      const keyValue = err.keyValue || {};
      return Object.keys(keyValue).map((key) => ({
        field: key,
        value: keyValue[key],
      }));
    } catch (e) {
      return null;
    }
  }

  static getAvailableEndpoints() {
    return {
      auth: ["/api/auth/login", "/api/auth/register", "/api/auth/logout"],
      users: ["/api/users", "/api/users/:id"],
      domains: ["/api/domains", "/api/domains/:id"],
      databases: ["/api/databases", "/api/databases/:id"],
      files: ["/api/files", "/api/files/upload"],
      admin: ["/api/admin/users", "/api/admin/system"],
    };
  }

  // Custom error classes
  static createError(statusCode, message, code = null, details = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
  }

  static ValidationError(message, details = null) {
    return ErrorHandler.createError(400, message, "VALIDATION_ERROR", details);
  }

  static NotFoundError(resource = "Resource") {
    return ErrorHandler.createError(404, `${resource} not found`, "NOT_FOUND");
  }

  static UnauthorizedError(message = "Authentication required") {
    return ErrorHandler.createError(401, message, "UNAUTHORIZED");
  }

  static ForbiddenError(message = "Access denied") {
    return ErrorHandler.createError(403, message, "FORBIDDEN");
  }

  static ConflictError(message = "Resource already exists") {
    return ErrorHandler.createError(409, message, "CONFLICT");
  }

  static ServerError(message = "Internal server error") {
    return ErrorHandler.createError(500, message, "INTERNAL_ERROR");
  }

  static ServiceUnavailableError(message = "Service temporarily unavailable") {
    return ErrorHandler.createError(503, message, "SERVICE_UNAVAILABLE");
  }
}

module.exports = ErrorHandler;

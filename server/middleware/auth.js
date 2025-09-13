const jwt = require("jsonwebtoken");

// Validate JWT secret on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access token required",
        code: "TOKEN_MISSING",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            message: "Token has expired",
            code: "TOKEN_EXPIRED",
          });
        }
        if (err.name === "JsonWebTokenError") {
          return res.status(403).json({
            message: "Invalid token",
            code: "TOKEN_INVALID",
          });
        }
        return res.status(403).json({
          message: "Token verification failed",
          code: "TOKEN_VERIFICATION_FAILED",
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      message: "Authentication service error",
      code: "AUTH_SERVICE_ERROR",
    });
  }
};

const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
        code: "ADMIN_ACCESS_REQUIRED",
      });
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({
      message: "Authorization service error",
      code: "AUTHZ_SERVICE_ERROR",
    });
  }
};

const requireUserOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const targetUserId = req.params.userId || req.params.id;

    // Admin can access any user's data
    if (req.user.role === "admin") {
      return next();
    }

    // User can only access their own data
    if (
      req.user.userId &&
      targetUserId &&
      req.user.userId.toString() === targetUserId.toString()
    ) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied",
      code: "ACCESS_DENIED",
    });
  } catch (error) {
    console.error("User authorization error:", error);
    return res.status(500).json({
      message: "Authorization service error",
      code: "AUTHZ_SERVICE_ERROR",
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUserOrAdmin,
};

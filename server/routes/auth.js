const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Use production database config
const databaseConfig = require("../config/database");
const { queryHelpers } = databaseConfig;

const { logger } = require("../utils/logger");
const { validateRequest } = require("../utils/validation");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Login endpoint with comprehensive security
router.post(
  "/login",
  validateRequest((validator, body) => {
    validator.validateEmail(body.email, "email");
    validator.validateString(body.password, "password", { minLength: 6 });
  }),
  async (req, res) => {
    const loginAttempt = {
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    };

    try {
      console.log("🔐 Login attempt started");
      const { email, password } = req.body;

      logger.info("Login attempt", loginAttempt);

      console.log("🔐 About to call queryHelpers.safeSelect");
      console.log("🔐 queryHelpers =", typeof queryHelpers);

      // Find user in database
      let result;
      try {
        console.log("🔐 Calling safeSelect with email:", email);
        result = await queryHelpers.safeSelect("users", {
          where: { email },
        });
        console.log("🔐 Query result:", result);
      } catch (queryError) {
        console.error("❌ Database query error:", queryError);
        console.error("❌ Stack:", queryError.stack);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: queryError.message,
        });
      }

      console.log("🔐 Final result =", result);

      if (!result || result.length === 0) {
        console.log("🔐 User not found");
        logger.warn("Login failed: User not found", loginAttempt);
        // Simulate bcrypt delay to prevent user enumeration
        await new Promise((resolve) => setTimeout(resolve, 100));
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const user = result[0];
      console.log("🔐 Found user:", {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        logger.warn("Login failed: Account locked", {
          ...loginAttempt,
          userId: user.id,
          lockedUntil: user.locked_until,
        });
        return res.status(423).json({
          success: false,
          message: "Account temporarily locked due to multiple failed attempts",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        let lockUntil = null;

        // Lock account after 5 failed attempts for 15 minutes
        if (failedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          logger.warn("Account locked due to failed attempts", {
            ...loginAttempt,
            userId: user.id,
            attempts: failedAttempts,
          });
        }

        await queryHelpers.safeUpdate(
          "users",
          {
            failed_login_attempts: failedAttempts,
            locked_until: lockUntil,
          },
          { id: user.id }
        );

        logger.warn("Login failed: Invalid password", {
          ...loginAttempt,
          userId: user.id,
          attempts: failedAttempts,
        });

        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Reset failed login attempts on successful login
      await queryHelpers.safeUpdate(
        "users",
        {
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date(),
          last_login_ip: req.ip,
        },
        { id: user.id }
      );

      // Generate JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      // Log successful login
      logger.info("Login successful", {
        ...loginAttempt,
        userId: user.id,
        role: user.role,
      });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: user.id,
        action: "login",
        details: JSON.stringify({
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        }),
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success",
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          plan: user.plan,
          email_verified: user.email_verified,
        },
      });
    } catch (error) {
      logger.error("Login error", { ...loginAttempt, error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Register endpoint (admin only)
router.post(
  "/register",
  authenticateToken,
  validateRequest({
    email: { required: true, type: "email" },
    password: { required: true, type: "password" },
    first_name: { required: true, minLength: 2 },
    last_name: { required: true, minLength: 2 },
    role: { required: false, enum: ["user", "admin", "reseller"] },
    plan: { required: false, enum: ["basic", "pro", "business", "enterprise"] },
  }),
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const {
        email,
        password,
        first_name,
        last_name,
        phone,
        company,
        role = "user",
        plan = "basic",
      } = req.body;

      // Check if user already exists
      const [existingUsers] = await queryHelpers.safeSelect("users", {
        where: { email },
      });

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const userData = {
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        phone: phone || null,
        company: company || null,
        role,
        plan,
        status: "active",
        email_verified: 1, // Auto-verify for admin created accounts
        created_at: new Date(),
      };

      const [result] = await queryHelpers.safeInsert("users", userData);

      logger.info("User created", {
        adminId: req.user.userId,
        newUserId: result.insertId,
        email,
        role,
      });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: req.user.userId,
        action: "user_created",
        resource_type: "user",
        resource_id: result.insertId,
        details: JSON.stringify({ email, role, plan }),
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success",
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: result.insertId,
          email,
          first_name,
          last_name,
          role,
          plan,
        },
      });
    } catch (error) {
      logger.error("Registration error", {
        adminId: req.user?.userId,
        email: req.body.email,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get current user info
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await queryHelpers.safeSelect("users", {
      where: { id: req.user.userId, status: "active" },
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        plan: user.plan,
        status: user.status,
        email_verified: user.email_verified,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    });
  } catch (error) {
    logger.error("Get user info error", {
      userId: req.user.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Change password
router.post(
  "/change-password",
  authenticateToken,
  validateRequest({
    current_password: { required: true },
    new_password: { required: true, type: "password" },
  }),
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      // Get current user
      const [users] = await queryHelpers.safeSelect("users", {
        where: { id: req.user.userId },
      });

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = users[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        current_password,
        user.password_hash
      );

      if (!isValidPassword) {
        logger.warn("Password change failed: Invalid current password", {
          userId: req.user.userId,
        });
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 12);

      // Update password
      await queryHelpers.safeUpdate(
        "users",
        {
          password_hash: newPasswordHash,
          updated_at: new Date(),
        },
        { id: user.id }
      );

      logger.info("Password changed successfully", { userId: user.id });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: user.id,
        action: "password_changed",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success",
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Password change error", {
        userId: req.user.userId,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Logout endpoint
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // Log activity
    await queryHelpers.safeInsert("activity_logs", {
      user_id: req.user.userId,
      action: "logout",
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
      status: "success",
    });

    logger.info("User logged out", { userId: req.user.userId });

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout error", {
      userId: req.user.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Forgot password (initiate reset)
router.post(
  "/forgot-password",
  validateRequest({
    email: { required: true, type: "email" },
  }),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Find user
      const [users] = await queryHelpers.safeSelect("users", {
        where: { email, status: "active" },
      });

      // Always return success to prevent user enumeration
      if (users.length === 0) {
        logger.warn("Password reset requested for non-existent user", {
          email,
        });
        return res.json({
          success: true,
          message: "If the email exists, a password reset link will be sent",
        });
      }

      const user = users[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await queryHelpers.safeUpdate(
        "users",
        {
          password_reset_token: resetToken,
          password_reset_expires: resetExpires,
        },
        { id: user.id }
      );

      // TODO: Send email with reset link
      // In production, integrate with email service

      logger.info("Password reset requested", {
        userId: user.id,
        email: user.email,
      });

      res.json({
        success: true,
        message: "If the email exists, a password reset link will be sent",
      });
    } catch (error) {
      logger.error("Forgot password error", {
        email: req.body.email,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Reset password
router.post(
  "/reset-password",
  validateRequest({
    token: { required: true },
    new_password: { required: true, type: "password" },
  }),
  async (req, res) => {
    try {
      const { token, new_password } = req.body;

      // Find user with valid reset token
      const [users] = await queryHelpers.safeSelect("users", {
        where: {
          password_reset_token: token,
          status: "active",
        },
      });

      if (users.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      const user = users[0];

      // Check if token has expired
      if (new Date(user.password_reset_expires) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Reset token has expired",
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 12);

      // Update password and clear reset token
      await queryHelpers.safeUpdate(
        "users",
        {
          password_hash: newPasswordHash,
          password_reset_token: null,
          password_reset_expires: null,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date(),
        },
        { id: user.id }
      );

      logger.info("Password reset completed", { userId: user.id });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: user.id,
        action: "password_reset",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success",
      });

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      logger.error("Password reset error", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Verify token endpoint
router.post("/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;

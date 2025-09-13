const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");

// Email Management Routes - DirectAdmin Style

// Get all email accounts for a domain
router.get("/accounts/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.id;

    // Verify domain ownership
    const domainCheck = await queryHelpers.findOne("domains", {
      name: domain,
      user_id: userId,
    });

    if (!domainCheck) {
      return res.status(404).json({
        success: false,
        message: "Domain not found or access denied",
      });
    }

    const emailAccounts = await queryHelpers.findMany("email_accounts", {
      domain_id: domainCheck.id,
    });

    res.json({
      success: true,
      data: {
        domain: domain,
        accounts: emailAccounts.map((account) => ({
          id: account.id,
          username: account.username,
          email: `${account.username}@${domain}`,
          quota: account.quota,
          used_quota: account.used_quota,
          status: account.status,
          created_at: account.created_at,
          last_login: account.last_login,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching email accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email accounts",
    });
  }
});

// Create new email account
router.post(
  "/accounts",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("username", body.username, {
      minLength: 1,
      maxLength: 64,
    });
    validator.validateString("password", body.password, { minLength: 8 });
    validator.validateNumber("quota", body.quota, { min: 1, max: 10240 });
  }),
  async (req, res) => {
    try {
      const { domain, username, password, quota } = req.body;
      const userId = req.user.id;

      // Verify domain ownership
      const domainRecord = await queryHelpers.findOne("domains", {
        name: domain,
        user_id: userId,
      });

      if (!domainRecord) {
        return res.status(404).json({
          success: false,
          message: "Domain not found or access denied",
        });
      }

      // Check if email account already exists
      const existingAccount = await queryHelpers.findOne("email_accounts", {
        username: username,
        domain_id: domainRecord.id,
      });

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          message: "Email account already exists",
        });
      }

      // Hash password
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create email account
      const emailAccount = await queryHelpers.create("email_accounts", {
        domain_id: domainRecord.id,
        username: username,
        password: hashedPassword,
        quota: quota,
        used_quota: 0,
        status: "active",
        created_at: new Date().toISOString(),
      });

      logger.info(`Email account created: ${username}@${domain}`, {
        userId,
        emailId: emailAccount.id,
      });

      res.status(201).json({
        success: true,
        message: "Email account created successfully",
        data: {
          id: emailAccount.id,
          email: `${username}@${domain}`,
          quota: quota,
          status: "active",
        },
      });
    } catch (error) {
      logger.error("Error creating email account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create email account",
      });
    }
  }
);

// Update email account
router.put(
  "/accounts/:id",
  authenticateToken,
  validateRequest((validator, body) => {
    if (body.password) {
      validator.validateString("password", body.password, { minLength: 8 });
    }
    if (body.quota) {
      validator.validateNumber("quota", body.quota, { min: 1, max: 10240 });
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { password, quota, status } = req.body;
      const userId = req.user.id;

      // Verify email account ownership
      const emailAccount = await queryHelpers.findOne("email_accounts", { id });
      if (!emailAccount) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const domainRecord = await queryHelpers.findOne("domains", {
        id: emailAccount.domain_id,
        user_id: userId,
      });

      if (!domainRecord) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Prepare update data
      const updateData = {};
      if (password) {
        const bcrypt = require("bcryptjs");
        updateData.password = await bcrypt.hash(password, 12);
      }
      if (quota) updateData.quota = quota;
      if (status) updateData.status = status;

      // Update email account
      await queryHelpers.update("email_accounts", { id }, updateData);

      logger.info(
        `Email account updated: ${emailAccount.username}@${domainRecord.name}`,
        {
          userId,
          emailId: id,
          changes: Object.keys(updateData),
        }
      );

      res.json({
        success: true,
        message: "Email account updated successfully",
      });
    } catch (error) {
      logger.error("Error updating email account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update email account",
      });
    }
  }
);

// Delete email account
router.delete("/accounts/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify email account ownership
    const emailAccount = await queryHelpers.findOne("email_accounts", { id });
    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    const domainRecord = await queryHelpers.findOne("domains", {
      id: emailAccount.domain_id,
      user_id: userId,
    });

    if (!domainRecord) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Delete email account
    await queryHelpers.delete("email_accounts", { id });

    logger.info(
      `Email account deleted: ${emailAccount.username}@${domainRecord.name}`,
      {
        userId,
        emailId: id,
      }
    );

    res.json({
      success: true,
      message: "Email account deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting email account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete email account",
    });
  }
});

// Email Forwarders Management

// Get forwarders for domain
router.get("/forwarders/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.id;

    // Verify domain ownership
    const domainRecord = await queryHelpers.findOne("domains", {
      name: domain,
      user_id: userId,
    });

    if (!domainRecord) {
      return res.status(404).json({
        success: false,
        message: "Domain not found or access denied",
      });
    }

    const forwarders = await queryHelpers.findMany("email_forwarders", {
      domain_id: domainRecord.id,
    });

    res.json({
      success: true,
      data: {
        domain: domain,
        forwarders: forwarders,
      },
    });
  } catch (error) {
    logger.error("Error fetching email forwarders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email forwarders",
    });
  }
});

// Create email forwarder
router.post(
  "/forwarders",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("source", body.source);
    validator.validateEmail("destination", body.destination);
  }),
  async (req, res) => {
    try {
      const { domain, source, destination } = req.body;
      const userId = req.user.id;

      // Verify domain ownership
      const domainRecord = await queryHelpers.findOne("domains", {
        name: domain,
        user_id: userId,
      });

      if (!domainRecord) {
        return res.status(404).json({
          success: false,
          message: "Domain not found or access denied",
        });
      }

      // Create forwarder
      const forwarder = await queryHelpers.create("email_forwarders", {
        domain_id: domainRecord.id,
        source: source,
        destination: destination,
        status: "active",
        created_at: new Date().toISOString(),
      });

      logger.info(
        `Email forwarder created: ${source}@${domain} -> ${destination}`,
        {
          userId,
          forwarderId: forwarder.id,
        }
      );

      res.status(201).json({
        success: true,
        message: "Email forwarder created successfully",
        data: forwarder,
      });
    } catch (error) {
      logger.error("Error creating email forwarder:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create email forwarder",
      });
    }
  }
);

// Email Auto-responders

// Get auto-responders for domain
router.get("/autoresponders/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.id;

    // Verify domain ownership
    const domainRecord = await queryHelpers.findOne("domains", {
      name: domain,
      user_id: userId,
    });

    if (!domainRecord) {
      return res.status(404).json({
        success: false,
        message: "Domain not found or access denied",
      });
    }

    const autoresponders = await queryHelpers.findMany("email_autoresponders", {
      domain_id: domainRecord.id,
    });

    res.json({
      success: true,
      data: {
        domain: domain,
        autoresponders: autoresponders,
      },
    });
  } catch (error) {
    logger.error("Error fetching auto-responders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch auto-responders",
    });
  }
});

// Create auto-responder
router.post(
  "/autoresponders",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("email", body.email);
    validator.validateString("subject", body.subject);
    validator.validateString("message", body.message);
  }),
  async (req, res) => {
    try {
      const { domain, email, subject, message, start_date, end_date } =
        req.body;
      const userId = req.user.id;

      // Verify domain ownership
      const domainRecord = await queryHelpers.findOne("domains", {
        name: domain,
        user_id: userId,
      });

      if (!domainRecord) {
        return res.status(404).json({
          success: false,
          message: "Domain not found or access denied",
        });
      }

      // Create auto-responder
      const autoresponder = await queryHelpers.create("email_autoresponders", {
        domain_id: domainRecord.id,
        email: email,
        subject: subject,
        message: message,
        start_date: start_date,
        end_date: end_date,
        status: "active",
        created_at: new Date().toISOString(),
      });

      logger.info(`Auto-responder created for: ${email}`, {
        userId,
        autoresponderId: autoresponder.id,
      });

      res.status(201).json({
        success: true,
        message: "Auto-responder created successfully",
        data: autoresponder,
      });
    } catch (error) {
      logger.error("Error creating auto-responder:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create auto-responder",
      });
    }
  }
);

module.exports = router;


const express = require("express");
const { pool, queryHelpers } = require("../config/database_sqlite");
const { logger } = require("../utils/logger");
const { validateRequest } = require("../utils/validation");
const { authenticateToken } = require("../middleware/auth");
const dns = require("dns").promises;
const router = express.Router();

// Get user domains
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [domains] = await queryHelpers.safeSelect("user_domains", {
      where: { user_id: req.user.userId },
      orderBy: "created_at DESC"
    });

    // Enhance with DNS status check
    for (let domain of domains) {
      try {
        // Check if domain points to our server
        const records = await dns.resolve4(domain.name);
        domain.dns_status = records.length > 0 ? "active" : "inactive";
        domain.ip_addresses = records;
      } catch (dnsError) {
        domain.dns_status = "error";
        domain.ip_addresses = [];
      }
    }

    res.json({
      success: true,
      domains
    });

  } catch (error) {
    logger.error("Get domains error", { 
      userId: req.user.userId,
      error: error.message 
    });
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// Add domain
router.post("/", 
  authenticateToken,
  validateRequest({
    name: { required: true, type: "domain" },
    type: { required: false, enum: ["main", "subdomain", "addon", "parked"] },
    document_root: { required: false, maxLength: 255 }
  }),
  async (req, res) => {
    try {
      const { 
        name, 
        type = "addon", 
        document_root = `/home/${req.user.email}/${name}` 
      } = req.body;

      // Check if user has reached domain limit
      const [userInfo] = await queryHelpers.safeSelect("users", {
        where: { id: req.user.userId }
      });

      if (userInfo.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      const user = userInfo[0];
      const [existingDomains] = await queryHelpers.safeSelect("user_domains", {
        where: { user_id: req.user.userId }
      });

      // Domain limits by plan
      const domainLimits = {
        basic: 1,
        pro: 5,
        business: 25,
        enterprise: 100
      };

      const limit = domainLimits[user.plan] || 1;
      if (existingDomains.length >= limit) {
        return res.status(403).json({ 
          success: false,
          message: `Domain limit reached. Your ${user.plan} plan allows ${limit} domain(s)` 
        });
      }

      // Check if domain already exists
      const [existingByName] = await queryHelpers.safeSelect("user_domains", {
        where: { name }
      });

      if (existingByName.length > 0) {
        return res.status(409).json({ 
          success: false,
          message: "Domain already exists in the system" 
        });
      }

      // Create domain record
      const domainData = {
        user_id: req.user.userId,
        name,
        type,
        document_root,
        status: "pending",
        ssl_status: "none",
        created_at: new Date()
      };

      const [result] = await queryHelpers.safeInsert("user_domains", domainData);

      logger.info("Domain added", { 
        userId: req.user.userId,
        domainId: result.insertId,
        name 
      });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: req.user.userId,
        action: "domain_added",
        resource_type: "domain",
        resource_id: result.insertId,
        details: JSON.stringify({ name, type, document_root }),
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success"
      });

      res.status(201).json({
        success: true,
        message: "Domain added successfully",
        domain: {
          id: result.insertId,
          name,
          type,
          document_root,
          status: "pending",
          ssl_status: "none",
          created_at: domainData.created_at
        }
      });

    } catch (error) {
      logger.error("Add domain error", { 
        userId: req.user.userId,
        name: req.body.name,
        error: error.message 
      });
      res.status(500).json({ 
        success: false,
        message: "Failed to add domain" 
      });
    }
  }
);

// Delete domain
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const domainId = req.params.id;

    // Find domain
    const [domains] = await queryHelpers.safeSelect("user_domains", {
      where: { id: domainId, user_id: req.user.userId }
    });

    if (domains.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Domain not found" 
      });
    }

    const domain = domains[0];

    // Delete domain record
    await queryHelpers.safeDelete("user_domains", { id: domainId });

    logger.info("Domain deleted", { 
      userId: req.user.userId,
      domainId,
      name: domain.name 
    });

    // Log activity
    await queryHelpers.safeInsert("activity_logs", {
      user_id: req.user.userId,
      action: "domain_deleted",
      resource_type: "domain",
      resource_id: domainId,
      details: JSON.stringify({ name: domain.name }),
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
      status: "success"
    });

    res.json({
      success: true,
      message: "Domain deleted successfully"
    });

  } catch (error) {
    logger.error("Delete domain error", { 
      userId: req.user.userId,
      domainId: req.params.id,
      error: error.message 
    });
    res.status(500).json({ 
      success: false,
      message: "Failed to delete domain" 
    });
  }
});

// Get domain details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const domainId = req.params.id;

    // Find domain
    const [domains] = await queryHelpers.safeSelect("user_domains", {
      where: { id: domainId, user_id: req.user.userId }
    });

    if (domains.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Domain not found" 
      });
    }

    const domain = domains[0];

    // Get DNS records
    try {
      const aRecords = await dns.resolve4(domain.name);
      const aaaaRecords = await dns.resolve6(domain.name).catch(() => []);
      const mxRecords = await dns.resolveMx(domain.name).catch(() => []);
      const txtRecords = await dns.resolveTxt(domain.name).catch(() => []);

      domain.dns_records = {
        a: aRecords,
        aaaa: aaaaRecords,
        mx: mxRecords,
        txt: txtRecords.flat()
      };
    } catch (dnsError) {
      domain.dns_records = {
        a: [],
        aaaa: [],
        mx: [],
        txt: []
      };
    }

    // Get SSL certificate info if available
    // TODO: Implement SSL certificate checking

    res.json({
      success: true,
      domain
    });

  } catch (error) {
    logger.error("Get domain details error", { 
      userId: req.user.userId,
      domainId: req.params.id,
      error: error.message 
    });
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// Update domain settings
router.put("/:id", 
  authenticateToken,
  validateRequest({
    document_root: { required: false, maxLength: 255 },
    status: { required: false, enum: ["active", "suspended", "pending"] },
    ssl_status: { required: false, enum: ["none", "pending", "active", "error"] }
  }),
  async (req, res) => {
    try {
      const domainId = req.params.id;
      const updates = {};

      // Only update provided fields
      if (req.body.document_root !== undefined) updates.document_root = req.body.document_root;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.ssl_status !== undefined) updates.ssl_status = req.body.ssl_status;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "No valid fields to update" 
        });
      }

      // Find domain first
      const [domains] = await queryHelpers.safeSelect("user_domains", {
        where: { id: domainId, user_id: req.user.userId }
      });

      if (domains.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Domain not found" 
        });
      }

      updates.updated_at = new Date();

      // Update domain
      await queryHelpers.safeUpdate("user_domains", updates, { 
        id: domainId, 
        user_id: req.user.userId 
      });

      logger.info("Domain updated", { 
        userId: req.user.userId,
        domainId,
        updates 
      });

      // Log activity
      await queryHelpers.safeInsert("activity_logs", {
        user_id: req.user.userId,
        action: "domain_updated",
        resource_type: "domain",
        resource_id: domainId,
        details: JSON.stringify(updates),
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        status: "success"
      });

      res.json({
        success: true,
        message: "Domain updated successfully"
      });

    } catch (error) {
      logger.error("Update domain error", { 
        userId: req.user.userId,
        domainId: req.params.id,
        error: error.message 
      });
      res.status(500).json({ 
        success: false,
        message: "Failed to update domain" 
      });
    }
  }
);

// Install SSL certificate
router.post("/:id/ssl", authenticateToken, async (req, res) => {
  try {
    const domainId = req.params.id;

    // Find domain
    const [domains] = await queryHelpers.safeSelect("user_domains", {
      where: { id: domainId, user_id: req.user.userId }
    });

    if (domains.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Domain not found" 
      });
    }

    const domain = domains[0];

    // Update SSL status to pending
    await queryHelpers.safeUpdate("user_domains", {
      ssl_status: "pending",
      updated_at: new Date()
    }, { id: domainId });

    // TODO: Implement actual SSL certificate installation
    // For now, simulate successful installation
    setTimeout(async () => {
      try {
        await queryHelpers.safeUpdate("user_domains", {
          ssl_status: "active",
          ssl_issued_at: new Date(),
          ssl_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          updated_at: new Date()
        }, { id: domainId });

        logger.info("SSL certificate installed", { 
          userId: req.user.userId,
          domainId,
          domain: domain.name 
        });
      } catch (error) {
        logger.error("SSL installation failed", { 
          userId: req.user.userId,
          domainId,
          error: error.message 
        });
      }
    }, 5000);

    res.json({
      success: true,
      message: "SSL certificate installation initiated"
    });

  } catch (error) {
    logger.error("SSL installation error", { 
      userId: req.user.userId,
      domainId: req.params.id,
      error: error.message 
    });
    res.status(500).json({ 
      success: false,
      message: "Failed to install SSL certificate" 
    });
  }
});

// Check domain availability
router.post("/check", 
  authenticateToken,
  validateRequest({
    name: { required: true, type: "domain" }
  }),
  async (req, res) => {
    try {
      const { name } = req.body;

      // Check if domain exists in our system
      const [existingDomains] = await queryHelpers.safeSelect("user_domains", {
        where: { name }
      });

      const isAvailable = existingDomains.length === 0;

      // Check DNS resolution
      let hasRecords = false;
      try {
        const records = await dns.resolve4(name);
        hasRecords = records.length > 0;
      } catch (dnsError) {
        hasRecords = false;
      }

      res.json({
        success: true,
        domain: name,
        available: isAvailable,
        has_dns_records: hasRecords,
        status: isAvailable ? "available" : "taken"
      });

    } catch (error) {
      logger.error("Domain check error", { 
        userId: req.user.userId,
        domain: req.body.name,
        error: error.message 
    });
      res.status(500).json({ 
        success: false,
        message: "Failed to check domain" 
      });
    }
  }
);

module.exports = router;


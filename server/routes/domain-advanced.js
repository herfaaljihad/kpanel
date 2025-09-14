const express = require("express");
const { queryHelpers } = require("../config/database");
const { authenticateToken, requirePermissions } = require("../middleware/auth");
const { logger } = require("../utils/logger");

const router = express.Router();

// Get all domains with advanced features
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get domains from database
    const [domains] = await queryHelpers.safeSelect("domains", {
      where: { user_id: userId },
      orderBy: "created_at DESC",
    });

    // Get domain statistics
    const stats = {
      total: domains.length,
      active: domains.filter(d => d.status === 'active').length,
      pending: domains.filter(d => d.status === 'pending').length,
      suspended: domains.filter(d => d.status === 'suspended').length
    };

    res.json({
      success: true,
      data: {
        domains,
        ...stats
      }
    });
  } catch (error) {
    logger.error("Failed to get domains:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get domains",
      error: error.message
    });
  }
});

// Create new domain
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type = 'addon' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Domain name is required"
      });
    }

    // Check if domain already exists
    const [existing] = await queryHelpers.safeSelect("domains", {
      where: { name }
    });

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Domain already exists"
      });
    }

    // Create domain
    const result = await queryHelpers.safeInsert("domains", {
      user_id: userId,
      name,
      type,
      status: 'pending',
      ssl_status: 'none',
      dns_status: 'pending',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        type,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error("Failed to create domain:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create domain",
      error: error.message
    });
  }
});

// Update domain
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;
    const { status, ssl_status, dns_status } = req.body;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Update domain
    const updateData = {};
    if (status) updateData.status = status;
    if (ssl_status) updateData.ssl_status = ssl_status;
    if (dns_status) updateData.dns_status = dns_status;
    updateData.updated_at = new Date().toISOString();

    await queryHelpers.safeUpdate("domains", updateData, {
      where: { id: domainId, user_id: userId }
    });

    res.json({
      success: true,
      message: "Domain updated successfully"
    });
  } catch (error) {
    logger.error("Failed to update domain:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update domain",
      error: error.message
    });
  }
});

// Delete domain
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Delete domain
    await queryHelpers.safeDelete("domains", {
      where: { id: domainId, user_id: userId }
    });

    res.json({
      success: true,
      message: "Domain deleted successfully"
    });
  } catch (error) {
    logger.error("Failed to delete domain:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete domain",
      error: error.message
    });
  }
});

// Get subdomains for a domain
router.get("/:id/subdomains", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Get subdomains
    const [subdomains] = await queryHelpers.safeSelect("subdomains", {
      where: { domain_id: domainId },
      orderBy: "created_at DESC"
    });

    res.json({
      success: true,
      data: {
        subdomains,
        total: subdomains.length,
        active: subdomains.filter(s => s.status === 'active').length
      }
    });
  } catch (error) {
    logger.error("Failed to get subdomains:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subdomains",
      error: error.message
    });
  }
});

// Create subdomain
router.post("/:id/subdomains", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;
    const { name, document_root } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Subdomain name is required"
      });
    }

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Create subdomain
    const result = await queryHelpers.safeInsert("subdomains", {
      domain_id: domainId,
      name,
      document_root: document_root || `/public_html/${name}`,
      status: 'active',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        document_root: document_root || `/public_html/${name}`,
        status: 'active'
      }
    });
  } catch (error) {
    logger.error("Failed to create subdomain:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create subdomain",
      error: error.message
    });
  }
});

// Get DNS records for a domain
router.get("/:id/dns", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Get DNS records
    const [dnsRecords] = await queryHelpers.safeSelect("dns_records", {
      where: { domain_id: domainId },
      orderBy: "type, name"
    });

    res.json({
      success: true,
      data: {
        records: dnsRecords,
        total: dnsRecords.length
      }
    });
  } catch (error) {
    logger.error("Failed to get DNS records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get DNS records",
      error: error.message
    });
  }
});

// Create DNS record
router.post("/:id/dns", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;
    const { type, name, value, ttl = 3600, priority = 0 } = req.body;

    if (!type || !name || !value) {
      return res.status(400).json({
        success: false,
        message: "Type, name, and value are required"
      });
    }

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Create DNS record
    const result = await queryHelpers.safeInsert("dns_records", {
      domain_id: domainId,
      type: type.toUpperCase(),
      name,
      value,
      ttl,
      priority,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        type: type.toUpperCase(),
        name,
        value,
        ttl,
        priority
      }
    });
  } catch (error) {
    logger.error("Failed to create DNS record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DNS record",
      error: error.message
    });
  }
});

// Get SSL certificates for a domain
router.get("/:id/ssl", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Get SSL certificates
    const [certificates] = await queryHelpers.safeSelect("ssl_certificates", {
      where: { domain_id: domainId },
      orderBy: "created_at DESC"
    });

    res.json({
      success: true,
      data: {
        certificates,
        total: certificates.length,
        active: certificates.filter(c => c.status === 'active').length
      }
    });
  } catch (error) {
    logger.error("Failed to get SSL certificates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get SSL certificates",
      error: error.message
    });
  }
});

// Create SSL certificate
router.post("/:id/ssl", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const domainId = req.params.id;
    const { type = 'letsencrypt', email } = req.body;

    // Verify domain ownership
    const [domain] = await queryHelpers.safeSelect("domains", {
      where: { id: domainId, user_id: userId }
    });

    if (domain.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Domain not found"
      });
    }

    // Create SSL certificate request
    const result = await queryHelpers.safeInsert("ssl_certificates", {
      domain_id: domainId,
      type,
      email: email || req.user.email,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        type,
        status: 'pending',
        message: 'SSL certificate request created'
      }
    });
  } catch (error) {
    logger.error("Failed to create SSL certificate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create SSL certificate",
      error: error.message
    });
  }
});

module.exports = router;
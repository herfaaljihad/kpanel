const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");

// DNS Management - DirectAdmin Style

// Get DNS records for a domain
router.get("/records/:domain", authenticateToken, async (req, res) => {
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

    const dnsRecords = await queryHelpers.findMany(
      "dns_records",
      { domain_id: domainRecord.id },
      { orderBy: "type ASC, name ASC" }
    );

    // Group records by type
    const recordsByType = dnsRecords.reduce((acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = [];
      }
      acc[record.type].push(record);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        domain: domain,
        records: dnsRecords,
        records_by_type: recordsByType,
        summary: {
          total_records: dnsRecords.length,
          active_records: dnsRecords.filter((r) => r.status === "active")
            .length,
          record_types: Object.keys(recordsByType),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching DNS records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DNS records",
    });
  }
});

// Create DNS record
router.post(
  "/records",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("type", body.type);
    validator.validateString("name", body.name);
    validator.validateString("value", body.value);
    validator.validateNumber("ttl", body.ttl, { min: 1, max: 86400 });
  }),
  async (req, res) => {
    try {
      const {
        domain,
        type,
        name,
        value,
        ttl = 3600,
        priority = 0,
        weight = 0,
        port = 0,
      } = req.body;
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

      // Validate DNS record type
      const validTypes = [
        "A",
        "AAAA",
        "CNAME",
        "MX",
        "TXT",
        "NS",
        "SRV",
        "PTR",
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid DNS record type",
        });
      }

      // Validate record value based on type
      const validation = validateDNSRecord(type, value);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      // Check for conflicting records
      const conflictCheck = await checkDNSConflicts(
        domainRecord.id,
        type,
        name,
        value
      );
      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          message: conflictCheck.message,
        });
      }

      // Create DNS record
      const dnsRecord = await queryHelpers.create("dns_records", {
        domain_id: domainRecord.id,
        type: type,
        name: name,
        value: value,
        ttl: ttl,
        priority: priority,
        weight: weight,
        port: port,
        status: "active",
        created_at: new Date().toISOString(),
      });

      logger.info(`DNS record created: ${type} ${name} -> ${value}`, {
        userId,
        domainId: domainRecord.id,
        dnsRecordId: dnsRecord.id,
      });

      res.status(201).json({
        success: true,
        message: "DNS record created successfully",
        data: {
          id: dnsRecord.id,
          type: type,
          name: name,
          value: value,
          ttl: ttl,
          priority: priority,
          weight: weight,
          port: port,
          status: "active",
        },
      });
    } catch (error) {
      logger.error("Error creating DNS record:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create DNS record",
      });
    }
  }
);

// Update DNS record
router.put(
  "/records/:id",
  authenticateToken,
  validateRequest((validator, body) => {
    if (body.value) {
      validator.validateString("value", body.value);
    }
    if (body.ttl) {
      validator.validateNumber("ttl", body.ttl, { min: 1, max: 86400 });
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, value, ttl, priority, weight, port, status } = req.body;
      const userId = req.user.id;

      // Get DNS record and verify ownership
      const dnsRecord = await queryHelpers.findOne("dns_records", { id });
      if (!dnsRecord) {
        return res.status(404).json({
          success: false,
          message: "DNS record not found",
        });
      }

      const domain = await queryHelpers.findOne("domains", {
        id: dnsRecord.domain_id,
        user_id: userId,
      });

      if (!domain) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Prepare update data
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (value !== undefined) {
        const validation = validateDNSRecord(dnsRecord.type, value);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
          });
        }
        updateData.value = value;
      }
      if (ttl !== undefined) updateData.ttl = ttl;
      if (priority !== undefined) updateData.priority = priority;
      if (weight !== undefined) updateData.weight = weight;
      if (port !== undefined) updateData.port = port;
      if (status !== undefined) updateData.status = status;

      updateData.updated_at = new Date().toISOString();

      // Update DNS record
      await queryHelpers.update("dns_records", { id }, updateData);

      logger.info(`DNS record updated: ${dnsRecord.type} ${dnsRecord.name}`, {
        userId,
        dnsRecordId: id,
        changes: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: "DNS record updated successfully",
      });
    } catch (error) {
      logger.error("Error updating DNS record:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update DNS record",
      });
    }
  }
);

// Delete DNS record
router.delete("/records/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get DNS record and verify ownership
    const dnsRecord = await queryHelpers.findOne("dns_records", { id });
    if (!dnsRecord) {
      return res.status(404).json({
        success: false,
        message: "DNS record not found",
      });
    }

    const domain = await queryHelpers.findOne("domains", {
      id: dnsRecord.domain_id,
      user_id: userId,
    });

    if (!domain) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Delete DNS record
    await queryHelpers.delete("dns_records", { id });

    logger.info(`DNS record deleted: ${dnsRecord.type} ${dnsRecord.name}`, {
      userId,
      dnsRecordId: id,
    });

    res.json({
      success: true,
      message: "DNS record deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting DNS record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete DNS record",
    });
  }
});

// Get DNS templates
router.get("/templates", authenticateToken, async (req, res) => {
  try {
    const templates = getDNSTemplates();

    res.json({
      success: true,
      data: {
        templates: templates,
      },
    });
  } catch (error) {
    logger.error("Error fetching DNS templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DNS templates",
    });
  }
});

// Apply DNS template
router.post(
  "/templates/apply",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("template", body.template);
  }),
  async (req, res) => {
    try {
      const { domain, template, server_ip } = req.body;
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

      // Get template
      const templates = getDNSTemplates();
      const selectedTemplate = templates.find((t) => t.name === template);

      if (!selectedTemplate) {
        return res.status(404).json({
          success: false,
          message: "DNS template not found",
        });
      }

      // Clear existing records (optional)
      if (req.body.clear_existing) {
        await queryHelpers.delete("dns_records", {
          domain_id: domainRecord.id,
        });
      }

      // Apply template records
      const createdRecords = [];
      for (const recordTemplate of selectedTemplate.records) {
        const recordData = {
          domain_id: domainRecord.id,
          type: recordTemplate.type,
          name: recordTemplate.name.replace("{domain}", domain),
          value: recordTemplate.value
            .replace("{server_ip}", server_ip || "127.0.0.1")
            .replace("{domain}", domain),
          ttl: recordTemplate.ttl || 3600,
          priority: recordTemplate.priority || 0,
          weight: recordTemplate.weight || 0,
          port: recordTemplate.port || 0,
          status: "active",
          created_at: new Date().toISOString(),
        };

        const dnsRecord = await queryHelpers.create("dns_records", recordData);
        createdRecords.push(dnsRecord);
      }

      logger.info(`DNS template applied: ${template} for domain ${domain}`, {
        userId,
        domainId: domainRecord.id,
        recordsCreated: createdRecords.length,
      });

      res.status(201).json({
        success: true,
        message: `DNS template '${template}' applied successfully`,
        data: {
          template: template,
          records_created: createdRecords.length,
          records: createdRecords,
        },
      });
    } catch (error) {
      logger.error("Error applying DNS template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply DNS template",
      });
    }
  }
);

// Check DNS propagation
router.get("/propagation/:domain", authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const { record_type = "A" } = req.query;
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

    // Mock DNS propagation check
    const propagationData = await checkDNSPropagation(domain, record_type);

    res.json({
      success: true,
      data: propagationData,
    });
  } catch (error) {
    logger.error("Error checking DNS propagation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check DNS propagation",
    });
  }
});

// Helper functions

function validateDNSRecord(type, value) {
  switch (type) {
    case "A":
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return {
        valid: ipv4Regex.test(value),
        message: "Invalid IPv4 address format",
      };

    case "AAAA":
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return {
        valid: ipv6Regex.test(value) || value.includes("::"),
        message: "Invalid IPv6 address format",
      };

    case "CNAME":
      const domainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      return {
        valid: domainRegex.test(value),
        message: "Invalid domain name format",
      };

    case "MX":
      return {
        valid: domainRegex.test(value),
        message: "Invalid mail server domain format",
      };

    case "TXT":
      return {
        valid: value.length <= 255,
        message: "TXT record value too long (max 255 characters)",
      };

    case "NS":
      return {
        valid: domainRegex.test(value),
        message: "Invalid nameserver domain format",
      };

    default:
      return { valid: true };
  }
}

async function checkDNSConflicts(domainId, type, name, value) {
  // Check for CNAME conflicts
  if (type === "CNAME") {
    const existingRecords = await queryHelpers.findMany("dns_records", {
      domain_id: domainId,
      name: name,
    });

    if (existingRecords.length > 0) {
      return {
        hasConflict: true,
        message:
          "CNAME records cannot coexist with other record types for the same name",
      };
    }
  }

  // Check for duplicate A/AAAA records
  if (type === "A" || type === "AAAA") {
    const existingCNAME = await queryHelpers.findOne("dns_records", {
      domain_id: domainId,
      type: "CNAME",
      name: name,
    });

    if (existingCNAME) {
      return {
        hasConflict: true,
        message: `Cannot add ${type} record when CNAME exists for the same name`,
      };
    }
  }

  return { hasConflict: false };
}

function getDNSTemplates() {
  return [
    {
      name: "basic_web",
      description: "Basic web hosting setup",
      records: [
        { type: "A", name: "{domain}", value: "{server_ip}", ttl: 3600 },
        { type: "A", name: "www.{domain}", value: "{server_ip}", ttl: 3600 },
        {
          type: "MX",
          name: "{domain}",
          value: "mail.{domain}",
          priority: 10,
          ttl: 3600,
        },
      ],
    },
    {
      name: "email_only",
      description: "Email hosting only",
      records: [
        {
          type: "MX",
          name: "{domain}",
          value: "mail.{domain}",
          priority: 10,
          ttl: 3600,
        },
        { type: "A", name: "mail.{domain}", value: "{server_ip}", ttl: 3600 },
        { type: "TXT", name: "{domain}", value: "v=spf1 a mx ~all", ttl: 3600 },
      ],
    },
    {
      name: "full_hosting",
      description: "Complete hosting setup with subdomains",
      records: [
        { type: "A", name: "{domain}", value: "{server_ip}", ttl: 3600 },
        { type: "A", name: "www.{domain}", value: "{server_ip}", ttl: 3600 },
        { type: "A", name: "mail.{domain}", value: "{server_ip}", ttl: 3600 },
        { type: "A", name: "ftp.{domain}", value: "{server_ip}", ttl: 3600 },
        {
          type: "MX",
          name: "{domain}",
          value: "mail.{domain}",
          priority: 10,
          ttl: 3600,
        },
        { type: "TXT", name: "{domain}", value: "v=spf1 a mx ~all", ttl: 3600 },
        {
          type: "CNAME",
          name: "webmail.{domain}",
          value: "mail.{domain}",
          ttl: 3600,
        },
      ],
    },
    {
      name: "cdn_optimized",
      description: "CDN-optimized setup",
      records: [
        { type: "A", name: "{domain}", value: "{server_ip}", ttl: 300 },
        { type: "CNAME", name: "www.{domain}", value: "{domain}", ttl: 300 },
        {
          type: "CNAME",
          name: "cdn.{domain}",
          value: "cdn.example.com",
          ttl: 3600,
        },
        {
          type: "MX",
          name: "{domain}",
          value: "mail.{domain}",
          priority: 10,
          ttl: 3600,
        },
      ],
    },
  ];
}

async function checkDNSPropagation(domain, recordType) {
  // Mock DNS propagation check
  const nameservers = [
    "8.8.8.8",
    "8.8.4.4", // Google
    "1.1.1.1",
    "1.0.0.1", // Cloudflare
    "208.67.222.222",
    "208.67.220.220", // OpenDNS
    "9.9.9.9",
    "149.112.112.112", // Quad9
  ];

  const results = [];

  for (const ns of nameservers) {
    // Mock result
    const propagated = Math.random() > 0.2; // 80% propagation rate
    const value = propagated ? "192.168.1.100" : null;
    const responseTime = Math.floor(Math.random() * 200 + 50);

    results.push({
      nameserver: ns,
      location: getNameserverLocation(ns),
      propagated: propagated,
      value: value,
      response_time: responseTime,
      status: propagated ? "success" : "failed",
      error: propagated ? null : "NXDOMAIN",
    });
  }

  const propagatedCount = results.filter((r) => r.propagated).length;
  const propagationPercentage = Math.round(
    (propagatedCount / results.length) * 100
  );

  return {
    domain: domain,
    record_type: recordType,
    propagation_percentage: propagationPercentage,
    fully_propagated: propagationPercentage === 100,
    results: results,
    checked_at: new Date().toISOString(),
    summary: {
      total_nameservers: results.length,
      propagated_nameservers: propagatedCount,
      avg_response_time: Math.round(
        results.reduce((sum, r) => sum + r.response_time, 0) / results.length
      ),
    },
  };
}

function getNameserverLocation(ip) {
  const locations = {
    "8.8.8.8": "Google DNS (Mountain View, CA)",
    "8.8.4.4": "Google DNS (Mountain View, CA)",
    "1.1.1.1": "Cloudflare (San Francisco, CA)",
    "1.0.0.1": "Cloudflare (San Francisco, CA)",
    "208.67.222.222": "OpenDNS (San Francisco, CA)",
    "208.67.220.220": "OpenDNS (San Francisco, CA)",
    "9.9.9.9": "Quad9 (New York, NY)",
    "149.112.112.112": "Quad9 (New York, NY)",
  };

  return locations[ip] || "Unknown";
}

module.exports = router;


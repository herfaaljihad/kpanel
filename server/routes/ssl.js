const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

// SSL Certificate Management - DirectAdmin Style

// Get SSL certificates for user
router.get("/certificates", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's domains
    const domains = await queryHelpers.findMany("domains", { user_id: userId });

    const certificates = [];
    for (const domain of domains) {
      const certs = await queryHelpers.findMany("ssl_certificates", {
        domain_id: domain.id,
      });

      for (const cert of certs) {
        certificates.push({
          ...cert,
          domain_name: domain.name,
          status_info: await getSSLStatus(cert),
        });
      }
    }

    res.json({
      success: true,
      data: {
        certificates: certificates,
        summary: {
          total: certificates.length,
          active: certificates.filter((c) => c.status === "active").length,
          expired: certificates.filter((c) => c.status === "expired").length,
          expiring_soon: certificates.filter((c) => {
            const expiry = new Date(c.expires_at);
            const now = new Date();
            const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
            return daysLeft <= 30 && daysLeft > 0;
          }).length,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching SSL certificates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SSL certificates",
    });
  }
});

// Get SSL certificate details
router.get("/certificates/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const certificate = await queryHelpers.findOne("ssl_certificates", { id });
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "SSL certificate not found",
      });
    }

    // Verify domain ownership
    const domain = await queryHelpers.findOne("domains", {
      id: certificate.domain_id,
      user_id: userId,
    });

    if (!domain) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const certDetails = await getSSLCertificateDetails(certificate);

    res.json({
      success: true,
      data: {
        ...certificate,
        domain_name: domain.name,
        details: certDetails,
      },
    });
  } catch (error) {
    logger.error("Error fetching SSL certificate details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SSL certificate details",
    });
  }
});

// Generate Let's Encrypt certificate
router.post(
  "/certificates/letsencrypt",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateArray("san_domains", body.san_domains, {
      required: false,
    });
  }),
  async (req, res) => {
    try {
      const { domain, san_domains = [] } = req.body;
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

      // Check if certificate already exists
      const existingCert = await queryHelpers.findOne("ssl_certificates", {
        domain_id: domainRecord.id,
        type: "letsencrypt",
        status: "active",
      });

      if (existingCert) {
        return res.status(409).json({
          success: false,
          message: "Active Let's Encrypt certificate already exists",
        });
      }

      // Start certificate generation process
      const certificate = await queryHelpers.create("ssl_certificates", {
        domain_id: domainRecord.id,
        type: "letsencrypt",
        common_name: domain,
        san_domains: JSON.stringify(san_domains),
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Start async certificate generation
      setTimeout(() => {
        generateLetsEncryptCertificate(
          certificate.id,
          domain,
          san_domains
        ).catch((error) => {
          logger.error("Let's Encrypt certificate generation failed:", error);
          queryHelpers.update(
            "ssl_certificates",
            { id: certificate.id },
            {
              status: "failed",
              error_message: error.message,
            }
          );
        });
      }, 100);

      logger.info(
        `Let's Encrypt certificate generation started for: ${domain}`,
        {
          userId,
          certificateId: certificate.id,
        }
      );

      res.status(202).json({
        success: true,
        message: "Let's Encrypt certificate generation started",
        data: {
          certificate_id: certificate.id,
          status: "pending",
        },
      });
    } catch (error) {
      logger.error(
        "Error starting Let's Encrypt certificate generation:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to start certificate generation",
      });
    }
  }
);

// Upload custom SSL certificate
router.post(
  "/certificates/upload",
  authenticateToken,
  validateRequest((validator, body) => {
    validator.validateString("domain", body.domain);
    validator.validateString("certificate", body.certificate);
    validator.validateString("private_key", body.private_key);
    validator.validateString("ca_bundle", body.ca_bundle, { required: false });
  }),
  async (req, res) => {
    try {
      const { domain, certificate, private_key, ca_bundle } = req.body;
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

      // Validate certificate
      const certValidation = await validateSSLCertificate(
        certificate,
        private_key,
        domain
      );
      if (!certValidation.valid) {
        return res.status(400).json({
          success: false,
          message: "Invalid SSL certificate",
          errors: certValidation.errors,
        });
      }

      // Store certificate
      const sslCert = await queryHelpers.create("ssl_certificates", {
        domain_id: domainRecord.id,
        type: "custom",
        common_name: domain,
        certificate: certificate,
        private_key: private_key,
        ca_bundle: ca_bundle || "",
        issued_at: certValidation.issued_at,
        expires_at: certValidation.expires_at,
        issuer: certValidation.issuer,
        serial_number: certValidation.serial_number,
        fingerprint: certValidation.fingerprint,
        status: "active",
        created_at: new Date().toISOString(),
      });

      // Save certificate files
      await saveSSLCertificateFiles(
        sslCert.id,
        certificate,
        private_key,
        ca_bundle
      );

      logger.info(`Custom SSL certificate uploaded for: ${domain}`, {
        userId,
        certificateId: sslCert.id,
      });

      res.status(201).json({
        success: true,
        message: "SSL certificate uploaded successfully",
        data: {
          certificate_id: sslCert.id,
          expires_at: certValidation.expires_at,
          issuer: certValidation.issuer,
        },
      });
    } catch (error) {
      logger.error("Error uploading SSL certificate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload SSL certificate",
      });
    }
  }
);

// Renew SSL certificate
router.post("/certificates/:id/renew", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const certificate = await queryHelpers.findOne("ssl_certificates", { id });
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "SSL certificate not found",
      });
    }

    // Verify domain ownership
    const domain = await queryHelpers.findOne("domains", {
      id: certificate.domain_id,
      user_id: userId,
    });

    if (!domain) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (certificate.type !== "letsencrypt") {
      return res.status(400).json({
        success: false,
        message: "Only Let's Encrypt certificates can be renewed automatically",
      });
    }

    // Start renewal process
    await queryHelpers.update(
      "ssl_certificates",
      { id },
      {
        status: "renewing",
      }
    );

    setTimeout(() => {
      renewLetsEncryptCertificate(id, domain.name).catch((error) => {
        logger.error("Certificate renewal failed:", error);
        queryHelpers.update(
          "ssl_certificates",
          { id },
          {
            status: "failed",
            error_message: error.message,
          }
        );
      });
    }, 100);

    logger.info(`SSL certificate renewal started for: ${domain.name}`, {
      userId,
      certificateId: id,
    });

    res.status(202).json({
      success: true,
      message: "SSL certificate renewal started",
      data: {
        certificate_id: id,
        status: "renewing",
      },
    });
  } catch (error) {
    logger.error("Error starting certificate renewal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start certificate renewal",
    });
  }
});

// Delete SSL certificate
router.delete("/certificates/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const certificate = await queryHelpers.findOne("ssl_certificates", { id });
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "SSL certificate not found",
      });
    }

    // Verify domain ownership
    const domain = await queryHelpers.findOne("domains", {
      id: certificate.domain_id,
      user_id: userId,
    });

    if (!domain) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Delete certificate files
    await deleteSSLCertificateFiles(id);

    // Delete certificate record
    await queryHelpers.delete("ssl_certificates", { id });

    logger.info(`SSL certificate deleted for: ${domain.name}`, {
      userId,
      certificateId: id,
    });

    res.json({
      success: true,
      message: "SSL certificate deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting SSL certificate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete SSL certificate",
    });
  }
});

// Check SSL certificate status
router.get("/certificates/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const certificate = await queryHelpers.findOne("ssl_certificates", { id });
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "SSL certificate not found",
      });
    }

    // Verify domain ownership
    const domain = await queryHelpers.findOne("domains", {
      id: certificate.domain_id,
      user_id: userId,
    });

    if (!domain) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const status = await getSSLStatus(certificate);

    res.json({
      success: true,
      data: {
        certificate_id: id,
        domain: domain.name,
        ...status,
      },
    });
  } catch (error) {
    logger.error("Error checking SSL certificate status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check SSL certificate status",
    });
  }
});

// Helper functions

async function getSSLStatus(certificate) {
  const now = new Date();
  const expiresAt = new Date(certificate.expires_at);
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  let status = certificate.status;
  if (status === "active" && daysLeft <= 0) {
    status = "expired";
  } else if (status === "active" && daysLeft <= 30) {
    status = "expiring_soon";
  }

  return {
    status: status,
    expires_at: certificate.expires_at,
    days_left: daysLeft,
    auto_renewal: certificate.type === "letsencrypt",
    last_check: new Date().toISOString(),
  };
}

async function getSSLCertificateDetails(certificate) {
  if (!certificate.certificate) {
    return null;
  }

  try {
    // Parse certificate details (simplified for demo)
    return {
      common_name: certificate.common_name,
      san_domains: JSON.parse(certificate.san_domains || "[]"),
      issuer: certificate.issuer,
      serial_number: certificate.serial_number,
      fingerprint: certificate.fingerprint,
      issued_at: certificate.issued_at,
      expires_at: certificate.expires_at,
      key_size: 2048, // Mock value
      signature_algorithm: "SHA256withRSA", // Mock value
    };
  } catch (error) {
    logger.error("Error parsing SSL certificate details:", error);
    return null;
  }
}

async function validateSSLCertificate(certificate, privateKey, domain) {
  try {
    // Mock validation (in production, use actual certificate parsing)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    return {
      valid: true,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      issuer: "Mock CA",
      serial_number: crypto.randomBytes(16).toString("hex"),
      fingerprint: crypto
        .createHash("sha256")
        .update(certificate)
        .digest("hex")
        .substring(0, 32),
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }
}

async function generateLetsEncryptCertificate(
  certificateId,
  domain,
  sanDomains
) {
  try {
    // Mock Let's Encrypt certificate generation
    logger.info(`Generating Let's Encrypt certificate for: ${domain}`);

    // Simulate ACME challenge process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Mock certificate content
    const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0UG+1K5n5MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA7QWzK3m9K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8
K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8K9m8
-----END CERTIFICATE-----`;

    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDtBbMreb0r2bwr
2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr
2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr2bwr
-----END PRIVATE KEY-----`;

    // Update certificate record
    await queryHelpers.update(
      "ssl_certificates",
      { id: certificateId },
      {
        certificate: certificate,
        private_key: privateKey,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        issuer: "Let's Encrypt",
        serial_number: crypto.randomBytes(16).toString("hex"),
        fingerprint: crypto
          .createHash("sha256")
          .update(certificate)
          .digest("hex")
          .substring(0, 32),
        status: "active",
      }
    );

    // Save certificate files
    await saveSSLCertificateFiles(certificateId, certificate, privateKey, "");

    logger.info(
      `Let's Encrypt certificate generated successfully for: ${domain}`,
      {
        certificateId,
      }
    );
  } catch (error) {
    logger.error("Let's Encrypt certificate generation error:", error);
    throw error;
  }
}

async function renewLetsEncryptCertificate(certificateId, domain) {
  try {
    logger.info(`Renewing Let's Encrypt certificate for: ${domain}`);

    // Simulate renewal process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Update certificate record
    await queryHelpers.update(
      "ssl_certificates",
      { id: certificateId },
      {
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "active",
      }
    );

    logger.info(`Certificate renewed successfully for: ${domain}`, {
      certificateId,
    });
  } catch (error) {
    logger.error("Certificate renewal error:", error);
    throw error;
  }
}

async function saveSSLCertificateFiles(
  certificateId,
  certificate,
  privateKey,
  caBundle
) {
  try {
    const sslDir = path.join(
      process.cwd(),
      "data",
      "ssl",
      certificateId.toString()
    );
    await fs.mkdir(sslDir, { recursive: true });

    await fs.writeFile(path.join(sslDir, "certificate.crt"), certificate);
    await fs.writeFile(path.join(sslDir, "private.key"), privateKey);
    if (caBundle) {
      await fs.writeFile(path.join(sslDir, "ca_bundle.crt"), caBundle);
    }

    logger.info(
      `SSL certificate files saved for certificate ID: ${certificateId}`
    );
  } catch (error) {
    logger.error("Error saving SSL certificate files:", error);
    throw error;
  }
}

async function deleteSSLCertificateFiles(certificateId) {
  try {
    const sslDir = path.join(
      process.cwd(),
      "data",
      "ssl",
      certificateId.toString()
    );
    await fs.rmdir(sslDir, { recursive: true });
    logger.info(
      `SSL certificate files deleted for certificate ID: ${certificateId}`
    );
  } catch (error) {
    logger.warn("Error deleting SSL certificate files:", error);
  }
}

module.exports = router;


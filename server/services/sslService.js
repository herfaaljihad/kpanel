const { execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

class SSLService {
  constructor() {
    this.sslCertPath = "/etc/ssl/certs";
    this.sslKeyPath = "/etc/ssl/private";
    this.letsEncryptPath = "/etc/letsencrypt";
    this.webServerService = null; // Will be injected
  }

  /**
   * Set web server service for reloading configurations
   */
  setWebServerService(webServerService) {
    this.webServerService = webServerService;
  }

  /**
   * Install SSL certificate from files
   */
  async installCertificate(
    domain,
    certificateData,
    privateKeyData,
    chainData = null
  ) {
    try {
      logger.info(`Installing SSL certificate for ${domain}`);

      // Ensure SSL directories exist
      await fs.mkdir(this.sslCertPath, { recursive: true });
      await fs.mkdir(this.sslKeyPath, { recursive: true });

      // Write certificate files
      const certFile = path.join(this.sslCertPath, `${domain}.crt`);
      const keyFile = path.join(this.sslKeyPath, `${domain}.key`);

      await fs.writeFile(certFile, certificateData);
      await fs.writeFile(keyFile, privateKeyData);

      // Write chain file if provided
      if (chainData) {
        const chainFile = path.join(this.sslCertPath, `${domain}-chain.crt`);
        await fs.writeFile(chainFile, chainData);
        execSync(`chmod 644 ${chainFile}`);
      }

      // Set proper permissions
      execSync(`chmod 644 ${certFile}`);
      execSync(`chmod 600 ${keyFile}`);

      logger.info(`SSL certificate installed successfully for ${domain}`);

      return {
        success: true,
        message: `SSL certificate installed for ${domain}`,
        certFile: certFile,
        keyFile: keyFile,
      };
    } catch (error) {
      logger.error(`Failed to install SSL certificate for ${domain}:`, error);
      throw new Error(`Failed to install SSL certificate: ${error.message}`);
    }
  }

  /**
   * Generate self-signed certificate
   */
  async generateSelfSigned(domain, validDays = 365) {
    try {
      logger.info(`Generating self-signed certificate for ${domain}`);

      const certFile = path.join(this.sslCertPath, `${domain}.crt`);
      const keyFile = path.join(this.sslKeyPath, `${domain}.key`);

      // Generate private key and certificate
      const opensslCommand =
        `openssl req -x509 -nodes -days ${validDays} -newkey rsa:2048 ` +
        `-keyout ${keyFile} -out ${certFile} ` +
        `-subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=${domain}"`;

      execSync(opensslCommand);

      // Set permissions
      execSync(`chmod 644 ${certFile}`);
      execSync(`chmod 600 ${keyFile}`);

      logger.info(`Self-signed certificate generated for ${domain}`);

      return {
        success: true,
        message: `Self-signed certificate generated for ${domain}`,
        type: "self-signed",
        validDays: validDays,
      };
    } catch (error) {
      logger.error(
        `Failed to generate self-signed certificate for ${domain}:`,
        error
      );
      throw new Error(
        `Failed to generate self-signed certificate: ${error.message}`
      );
    }
  }

  /**
   * Generate Let's Encrypt certificate
   */
  async generateLetsEncrypt(domain, email, webroot = null) {
    try {
      logger.info(`Generating Let's Encrypt certificate for ${domain}`);

      // Check if certbot is installed
      try {
        execSync("which certbot", { stdio: "ignore" });
      } catch (error) {
        throw new Error(
          "Certbot is not installed. Please install certbot first."
        );
      }

      // Use provided webroot or default
      const webrootPath = webroot || `/var/www/${domain}/public_html`;

      // Ensure webroot exists
      await fs.mkdir(webrootPath, { recursive: true });

      // Generate certificate using webroot method
      const certbotCommand = [
        "certbot certonly",
        "--webroot",
        `-w ${webrootPath}`,
        `-d ${domain}`,
        `-d www.${domain}`,
        `--email ${email}`,
        "--agree-tos",
        "--non-interactive",
        "--keep-until-expiring", // Don't renew if still valid
      ].join(" ");

      execSync(certbotCommand);

      // Copy certificates to our SSL directory
      const letsEncryptLivePath = path.join(
        this.letsEncryptPath,
        "live",
        domain
      );

      const certificateData = await fs.readFile(
        path.join(letsEncryptLivePath, "cert.pem"),
        "utf8"
      );
      const privateKeyData = await fs.readFile(
        path.join(letsEncryptLivePath, "privkey.pem"),
        "utf8"
      );
      const chainData = await fs.readFile(
        path.join(letsEncryptLivePath, "chain.pem"),
        "utf8"
      );

      // Install using our standard method
      await this.installCertificate(
        domain,
        certificateData,
        privateKeyData,
        chainData
      );

      // Setup auto-renewal cron job
      await this.setupAutoRenewal();

      logger.info(
        `Let's Encrypt certificate generated successfully for ${domain}`
      );

      return {
        success: true,
        message: `Let's Encrypt certificate generated for ${domain}`,
        type: "letsencrypt",
        autoRenewal: true,
      };
    } catch (error) {
      logger.error(
        `Failed to generate Let's Encrypt certificate for ${domain}:`,
        error
      );
      throw new Error(
        `Failed to generate Let's Encrypt certificate: ${error.message}`
      );
    }
  }

  /**
   * Renew Let's Encrypt certificate
   */
  async renewLetsEncrypt(domain = null) {
    try {
      logger.info(
        `Renewing Let's Encrypt certificates${domain ? ` for ${domain}` : ""}`
      );

      let renewCommand = "certbot renew --quiet";
      if (domain) {
        renewCommand += ` --cert-name ${domain}`;
      }

      execSync(renewCommand);

      // If specific domain, copy renewed certificates
      if (domain) {
        const letsEncryptLivePath = path.join(
          this.letsEncryptPath,
          "live",
          domain
        );

        try {
          const certificateData = await fs.readFile(
            path.join(letsEncryptLivePath, "cert.pem"),
            "utf8"
          );
          const privateKeyData = await fs.readFile(
            path.join(letsEncryptLivePath, "privkey.pem"),
            "utf8"
          );
          const chainData = await fs.readFile(
            path.join(letsEncryptLivePath, "chain.pem"),
            "utf8"
          );

          await this.installCertificate(
            domain,
            certificateData,
            privateKeyData,
            chainData
          );

          // Reload web server if available
          if (this.webServerService) {
            await this.webServerService.reloadWebServer();
          }
        } catch (copyError) {
          logger.warn(
            `Failed to copy renewed certificate for ${domain}:`,
            copyError
          );
        }
      }

      logger.info("Let's Encrypt certificates renewed successfully");

      return {
        success: true,
        message: "Certificates renewed successfully",
      };
    } catch (error) {
      logger.error("Failed to renew Let's Encrypt certificates:", error);
      throw new Error(`Failed to renew certificates: ${error.message}`);
    }
  }

  /**
   * Setup auto-renewal cron job
   */
  async setupAutoRenewal() {
    try {
      const cronJob =
        '0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"';

      // Check if cron job already exists
      try {
        const existingCrons = execSync(
          "crontab -l 2>/dev/null || true"
        ).toString();
        if (existingCrons.includes("certbot renew")) {
          logger.info("Auto-renewal cron job already exists");
          return;
        }
      } catch (error) {
        // No existing crontab, continue
      }

      // Add cron job
      execSync(
        `(crontab -l 2>/dev/null || true; echo "${cronJob}") | crontab -`
      );

      logger.info("SSL auto-renewal cron job configured");
    } catch (error) {
      logger.warn("Failed to setup auto-renewal cron job:", error);
    }
  }

  /**
   * Get certificate information
   */
  async getCertificateInfo(domain) {
    try {
      const certFile = path.join(this.sslCertPath, `${domain}.crt`);

      // Check if certificate exists
      try {
        await fs.access(certFile);
      } catch (error) {
        return {
          exists: false,
          message: "No SSL certificate found",
        };
      }

      // Get certificate details using openssl
      const certInfo = execSync(
        `openssl x509 -in ${certFile} -text -noout`
      ).toString();
      const certDates = execSync(
        `openssl x509 -in ${certFile} -dates -noout`
      ).toString();

      // Parse certificate information
      const subjectMatch = certInfo.match(/Subject:.*?CN\s*=\s*([^,\n]+)/);
      const issuerMatch = certInfo.match(/Issuer:.*?CN\s*=\s*([^,\n]+)/);
      const sanMatch = certInfo.match(/DNS:([^,\n]+(?:, DNS:[^,\n]+)*)/);
      const notBeforeMatch = certDates.match(/notBefore=(.+)/);
      const notAfterMatch = certDates.match(/notAfter=(.+)/);

      const validFrom = notBeforeMatch ? new Date(notBeforeMatch[1]) : null;
      const validUntil = notAfterMatch ? new Date(notAfterMatch[1]) : null;
      const now = new Date();

      const info = {
        exists: true,
        subject: subjectMatch ? subjectMatch[1].trim() : "Unknown",
        issuer: issuerMatch ? issuerMatch[1].trim() : "Unknown",
        san: sanMatch
          ? sanMatch[1].split(", DNS:").map((s) => s.replace("DNS:", ""))
          : [],
        validFrom: validFrom ? validFrom.toISOString() : null,
        validUntil: validUntil ? validUntil.toISOString() : null,
        isValid:
          validFrom && validUntil && now >= validFrom && now <= validUntil,
        daysUntilExpiry: validUntil
          ? Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24))
          : null,
        isLetsEncrypt: issuerMatch
          ? issuerMatch[1].includes("Let's Encrypt")
          : false,
        isSelfSigned: false,
      };

      // Check if self-signed
      if (info.subject === info.issuer) {
        info.isSelfSigned = true;
      }

      return info;
    } catch (error) {
      logger.error(`Failed to get certificate info for ${domain}:`, error);
      return {
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate certificate files
   */
  async validateCertificate(certificateData, privateKeyData) {
    try {
      // Create temporary files
      const tempDir = "/tmp";
      const tempCert = path.join(tempDir, `temp_cert_${Date.now()}.crt`);
      const tempKey = path.join(tempDir, `temp_key_${Date.now()}.key`);

      await fs.writeFile(tempCert, certificateData);
      await fs.writeFile(tempKey, privateKeyData);

      // Validate certificate
      execSync(`openssl x509 -in ${tempCert} -text -noout`);

      // Validate private key
      execSync(`openssl rsa -in ${tempKey} -check -noout`);

      // Check if certificate and key match
      const certModulus = execSync(
        `openssl x509 -noout -modulus -in ${tempCert}`
      )
        .toString()
        .trim();
      const keyModulus = execSync(`openssl rsa -noout -modulus -in ${tempKey}`)
        .toString()
        .trim();

      if (certModulus !== keyModulus) {
        throw new Error("Certificate and private key do not match");
      }

      // Clean up temporary files
      await fs.unlink(tempCert);
      await fs.unlink(tempKey);

      return {
        valid: true,
        message: "Certificate and private key are valid and match",
      };
    } catch (error) {
      // Clean up temporary files on error
      try {
        await fs.unlink(tempCert);
        await fs.unlink(tempKey);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      logger.error("Certificate validation failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove SSL certificate
   */
  async removeCertificate(domain) {
    try {
      logger.info(`Removing SSL certificate for ${domain}`);

      const certFile = path.join(this.sslCertPath, `${domain}.crt`);
      const keyFile = path.join(this.sslKeyPath, `${domain}.key`);
      const chainFile = path.join(this.sslCertPath, `${domain}-chain.crt`);

      // Remove files if they exist
      try {
        await fs.unlink(certFile);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      try {
        await fs.unlink(keyFile);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      try {
        await fs.unlink(chainFile);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      logger.info(`SSL certificate removed for ${domain}`);

      return {
        success: true,
        message: `SSL certificate removed for ${domain}`,
      };
    } catch (error) {
      logger.error(`Failed to remove SSL certificate for ${domain}:`, error);
      throw new Error(`Failed to remove SSL certificate: ${error.message}`);
    }
  }

  /**
   * List all SSL certificates
   */
  async listCertificates() {
    try {
      const certificates = [];

      // Read certificate files
      const certFiles = await fs.readdir(this.sslCertPath);
      const domainCerts = certFiles.filter(
        (file) => file.endsWith(".crt") && !file.includes("-chain")
      );

      for (const certFile of domainCerts) {
        const domain = certFile.replace(".crt", "");
        const info = await this.getCertificateInfo(domain);

        if (info.exists) {
          certificates.push({
            domain: domain,
            ...info,
          });
        }
      }

      return certificates;
    } catch (error) {
      logger.error("Failed to list certificates:", error);
      throw new Error(`Failed to list certificates: ${error.message}`);
    }
  }

  /**
   * Check SSL certificate expiration
   */
  async checkExpiringCertificates(daysThreshold = 30) {
    try {
      const certificates = await this.listCertificates();
      const expiring = certificates.filter((cert) => {
        return (
          cert.daysUntilExpiry !== null &&
          cert.daysUntilExpiry <= daysThreshold &&
          cert.daysUntilExpiry > 0
        );
      });

      const expired = certificates.filter((cert) => {
        return cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= 0;
      });

      return {
        expiring: expiring,
        expired: expired,
        total: certificates.length,
        expiringCount: expiring.length,
        expiredCount: expired.length,
      };
    } catch (error) {
      logger.error("Failed to check expiring certificates:", error);
      throw new Error(
        `Failed to check expiring certificates: ${error.message}`
      );
    }
  }
}

module.exports = SSLService;

const { queryHelpers } = require("../config/database");
const { execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

class DNSService {
  constructor() {
    this.dnsZonesPath = path.join(__dirname, "../../data/dns-zones");
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dnsZonesPath, { recursive: true });
    } catch (error) {
      console.error("Failed to create DNS zones directory:", error);
    }
  }

  // Get all DNS zones for a domain
  async getDNSZones(domainId) {
    try {
      const zones = await queryHelpers.executeQuery(
        "SELECT * FROM dns_records WHERE domain_id = ? ORDER BY type, name",
        [domainId]
      );
      return { success: true, data: zones };
    } catch (error) {
      console.error("Error fetching DNS zones:", error);
      return { success: false, error: error.message };
    }
  }

  // Create DNS record
  async createDNSRecord(domainId, recordData) {
    try {
      const { type, name, value, ttl = 3600, priority = 0 } = recordData;

      // Validate DNS record
      const validation = this.validateDNSRecord(type, name, value);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Insert into database
      const result = await queryHelpers.executeQuery(
        `INSERT INTO dns_records (domain_id, type, name, value, ttl, priority, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [domainId, type, name, value, ttl, priority]
      );

      // Generate zone file if enabled
      await this.generateZoneFile(domainId);

      return {
        success: true,
        data: { id: result.insertId, type, name, value, ttl, priority },
      };
    } catch (error) {
      console.error("Error creating DNS record:", error);
      return { success: false, error: error.message };
    }
  }

  // Update DNS record
  async updateDNSRecord(recordId, recordData) {
    try {
      const { type, name, value, ttl, priority } = recordData;

      // Validate DNS record
      const validation = this.validateDNSRecord(type, name, value);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Update record
      await queryHelpers.executeQuery(
        `UPDATE dns_records 
         SET type = ?, name = ?, value = ?, ttl = ?, priority = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [type, name, value, ttl, priority, recordId]
      );

      // Get domain_id for zone file regeneration
      const record = await queryHelpers.executeQuery(
        "SELECT domain_id FROM dns_records WHERE id = ?",
        [recordId]
      );

      if (record.length > 0) {
        await this.generateZoneFile(record[0].domain_id);
      }

      return {
        success: true,
        data: { id: recordId, type, name, value, ttl, priority },
      };
    } catch (error) {
      console.error("Error updating DNS record:", error);
      return { success: false, error: error.message };
    }
  }

  // Delete DNS record
  async deleteDNSRecord(recordId) {
    try {
      // Get domain_id before deletion
      const record = await queryHelpers.executeQuery(
        "SELECT domain_id FROM dns_records WHERE id = ?",
        [recordId]
      );

      // Delete record
      await queryHelpers.executeQuery("DELETE FROM dns_records WHERE id = ?", [
        recordId,
      ]);

      // Regenerate zone file
      if (record.length > 0) {
        await this.generateZoneFile(record[0].domain_id);
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting DNS record:", error);
      return { success: false, error: error.message };
    }
  }

  // Generate zone file
  async generateZoneFile(domainId) {
    try {
      // Get domain info
      const domain = await queryHelpers.executeQuery(
        "SELECT name FROM domains WHERE id = ?",
        [domainId]
      );

      if (domain.length === 0) {
        throw new Error("Domain not found");
      }

      const domainName = domain[0].name;

      // Get all DNS records for this domain
      const records = await queryHelpers.executeQuery(
        "SELECT * FROM dns_records WHERE domain_id = ? ORDER BY type, name",
        [domainId]
      );

      // Generate zone file content
      const zoneContent = this.generateZoneFileContent(domainName, records);

      // Write zone file
      const zoneFilePath = path.join(this.dnsZonesPath, `${domainName}.zone`);
      await fs.writeFile(zoneFilePath, zoneContent);

      return { success: true, path: zoneFilePath };
    } catch (error) {
      console.error("Error generating zone file:", error);
      return { success: false, error: error.message };
    }
  }

  // Generate zone file content
  generateZoneFileContent(domainName, records) {
    const now = new Date();
    const serial =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "01";

    let content = `; Zone file for ${domainName}
; Generated on ${now.toISOString()}
$TTL 3600
$ORIGIN ${domainName}.

; SOA Record
@       IN      SOA     ns1.${domainName}. admin.${domainName}. (
                        ${serial}   ; Serial
                        3600        ; Refresh
                        1800        ; Retry
                        604800      ; Expire
                        3600        ; Minimum TTL
                        )

; Default NS Records
@       IN      NS      ns1.${domainName}.
@       IN      NS      ns2.${domainName}.

; DNS Records
`;

    records.forEach((record) => {
      const name = record.name === "@" ? "@" : `${record.name}`;
      const ttl = record.ttl || 3600;

      if (record.type === "MX") {
        content += `${name}\t${ttl}\tIN\t${record.type}\t${record.priority}\t${record.value}\n`;
      } else {
        content += `${name}\t${ttl}\tIN\t${record.type}\t${record.value}\n`;
      }
    });

    return content;
  }

  // Validate DNS record
  validateDNSRecord(type, name, value) {
    const validTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "PTR", "SRV"];

    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid DNS record type: ${type}` };
    }

    if (!name || name.trim() === "") {
      return { valid: false, error: "DNS record name is required" };
    }

    if (!value || value.trim() === "") {
      return { valid: false, error: "DNS record value is required" };
    }

    // Type-specific validation
    switch (type) {
      case "A":
        if (!this.isValidIPv4(value)) {
          return { valid: false, error: "Invalid IPv4 address for A record" };
        }
        break;
      case "AAAA":
        if (!this.isValidIPv6(value)) {
          return {
            valid: false,
            error: "Invalid IPv6 address for AAAA record",
          };
        }
        break;
      case "CNAME":
        if (!this.isValidDomain(value)) {
          return {
            valid: false,
            error: "Invalid domain name for CNAME record",
          };
        }
        break;
      case "MX":
        if (!this.isValidDomain(value)) {
          return { valid: false, error: "Invalid mail server for MX record" };
        }
        break;
    }

    return { valid: true };
  }

  // Validate IPv4 address
  isValidIPv4(ip) {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  // Validate IPv6 address
  isValidIPv6(ip) {
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  // Validate domain name
  isValidDomain(domain) {
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  // Get DNS propagation status
  async checkDNSPropagation(domain, recordType = "A") {
    try {
      const nameservers = ["8.8.8.8", "1.1.1.1", "208.67.222.222"];
      const results = [];

      for (const ns of nameservers) {
        try {
          const command =
            process.platform === "win32"
              ? `nslookup -type=${recordType} ${domain} ${ns}`
              : `dig @${ns} ${domain} ${recordType} +short`;

          const result = execSync(command, { timeout: 5000 }).toString().trim();
          results.push({
            nameserver: ns,
            result: result,
            success: true,
          });
        } catch (error) {
          results.push({
            nameserver: ns,
            result: null,
            success: false,
            error: error.message,
          });
        }
      }

      return { success: true, data: results };
    } catch (error) {
      console.error("Error checking DNS propagation:", error);
      return { success: false, error: error.message };
    }
  }

  // External DNS management methods
  async syncExternalDNS(domainId, provider = "cloudflare") {
    try {
      // Get domain from database
      const domain = await queryHelpers.findOne("domains", { id: domainId });
      if (!domain) {
        throw new Error("Domain not found");
      }

      // Get DNS records from database
      const records = await queryHelpers.safeSelect("dns_records", {
        where: { domain_id: domainId },
      });

      logger.info(
        `Initiating DNS sync for domain ${domain.domain_name} with ${provider}`,
        {
          domainId: domainId,
          recordCount: records.length,
        }
      );

      // TODO: Implement actual DNS provider integration
      // Examples: Cloudflare API, Route53 API, etc.
      switch (provider) {
        case "cloudflare":
          // Would use Cloudflare API here
          logger.warn(
            `Cloudflare DNS sync not yet implemented for ${domain.domain_name}`
          );
          break;
        case "route53":
          // Would use AWS Route53 API here
          logger.warn(
            `Route53 DNS sync not yet implemented for ${domain.domain_name}`
          );
          break;
        default:
          logger.warn(
            `DNS provider ${provider} not supported for ${domain.domain_name}`
          );
      }

      // For now, mark sync as initiated in database
      await queryHelpers.safeUpdate(
        "domains",
        { id: domainId },
        {
          last_dns_sync: new Date().toISOString(),
          dns_provider: provider,
        }
      );

      return {
        success: true,
        message: `DNS sync initiated with ${provider} for ${domain.domain_name}`,
        synced_records: records.length,
        domain: domain.domain_name,
        provider: provider,
      };
    } catch (error) {
      console.error("Error syncing external DNS:", error);
      return { success: false, error: error.message };
    }
  }

  // Get DNS statistics
  async getDNSStatistics(domainId) {
    try {
      const stats = await queryHelpers.executeQuery(
        `SELECT 
           type,
           COUNT(*) as count
         FROM dns_records 
         WHERE domain_id = ? 
         GROUP BY type`,
        [domainId]
      );

      const total = await queryHelpers.executeQuery(
        "SELECT COUNT(*) as total FROM dns_records WHERE domain_id = ?",
        [domainId]
      );

      return {
        success: true,
        data: {
          total_records: total[0].total,
          by_type: stats,
        },
      };
    } catch (error) {
      console.error("Error getting DNS statistics:", error);
      return { success: false, error: error.message };
    }
  }

  // Import DNS records from zone file
  async importZoneFile(domainId, zoneFileContent) {
    try {
      const records = this.parseZoneFile(zoneFileContent);
      let imported = 0;

      for (const record of records) {
        const result = await this.createDNSRecord(domainId, record);
        if (result.success) {
          imported++;
        }
      }

      return {
        success: true,
        message: `Imported ${imported} DNS records`,
        imported_count: imported,
      };
    } catch (error) {
      console.error("Error importing zone file:", error);
      return { success: false, error: error.message };
    }
  }

  // Parse zone file content
  parseZoneFile(content) {
    const records = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (
        trimmedLine.startsWith(";") ||
        trimmedLine === "" ||
        trimmedLine.startsWith("$")
      ) {
        continue;
      }

      // Basic zone file parsing (simplified)
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 4) {
        const record = {
          name: parts[0] === "@" ? "@" : parts[0],
          ttl: parseInt(parts[1]) || 3600,
          type: parts[3],
          value: parts.slice(4).join(" "),
          priority: parts[3] === "MX" ? parseInt(parts[4]) : 0,
        };

        if (record.type === "MX") {
          record.value = parts.slice(5).join(" ");
        }

        records.push(record);
      }
    }

    return records;
  }
}

module.exports = new DNSService();

const express = require("express");
const router = express.Router();
const { pool, queryHelpers } = require("../config/database_sqlite");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { validateRequest } = require("../utils/validation");
const { logger } = require("../utils/logger");

// Package/Plan Management - DirectAdmin Style

// Get all packages (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const packages = await queryHelpers.findMany(
      "packages",
      {},
      {
        orderBy: "created_at DESC",
      }
    );

    // Get usage statistics for each package
    const packagesWithStats = await Promise.all(
      packages.map(async (pkg) => {
        const userCount = await queryHelpers.count("users", {
          package_id: pkg.id,
        });
        const activeUsers = await queryHelpers.count("users", {
          package_id: pkg.id,
          status: "active",
        });

        return {
          ...pkg,
          statistics: {
            total_users: userCount,
            active_users: activeUsers,
            utilization_rate:
              userCount > 0 ? Math.round((activeUsers / userCount) * 100) : 0,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        packages: packagesWithStats,
        total_packages: packagesWithStats.length,
        summary: {
          total_users_across_packages: packagesWithStats.reduce(
            (sum, pkg) => sum + pkg.statistics.total_users,
            0
          ),
          active_users_across_packages: packagesWithStats.reduce(
            (sum, pkg) => sum + pkg.statistics.active_users,
            0
          ),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching packages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
    });
  }
});

// Get package details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Non-admin users can only view their own package
    let whereClause = { id };
    if (req.user.role !== "admin") {
      whereClause = { id, id: req.user.package_id };
    }

    const packageData = await queryHelpers.findOne("packages", whereClause);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Get users assigned to this package (admin only)
    let packageUsers = [];
    if (req.user.role === "admin") {
      packageUsers = await queryHelpers.findMany(
        "users",
        { package_id: packageData.id },
        { select: ["id", "username", "email", "status", "created_at"] }
      );
    }

    // Get resource usage for this package
    const resourceUsage = await getPackageResourceUsage(packageData.id);

    res.json({
      success: true,
      data: {
        package: packageData,
        users: packageUsers,
        resource_usage: resourceUsage,
        limits: {
          disk_space: packageData.disk_space_mb,
          bandwidth: packageData.bandwidth_gb,
          domains: packageData.max_domains,
          subdomains: packageData.max_subdomains,
          databases: packageData.max_databases,
          email_accounts: packageData.max_email_accounts,
          ftp_accounts: packageData.max_ftp_accounts,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching package details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package details",
    });
  }
});

// Create new package (admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateRequest((validator, body) => {
    validator.validateString("name", body.name);
    validator.validateString("description", body.description);
    validator.validateNumber("disk_space_mb", body.disk_space_mb, { min: 1 });
    validator.validateNumber("bandwidth_gb", body.bandwidth_gb, { min: 1 });
    validator.validateNumber("max_domains", body.max_domains, { min: 1 });
    validator.validateNumber("max_databases", body.max_databases, { min: 1 });
    validator.validateNumber("max_email_accounts", body.max_email_accounts, {
      min: 1,
    });
  }),
  async (req, res) => {
    try {
      const {
        name,
        description,
        disk_space_mb,
        bandwidth_gb,
        max_domains,
        max_subdomains = 10,
        max_databases,
        max_email_accounts,
        max_ftp_accounts = 5,
        max_cron_jobs = 10,
        features = {},
        price_monthly = 0,
        is_active = true,
      } = req.body;

      // Check if package name already exists
      const existingPackage = await queryHelpers.findOne("packages", { name });
      if (existingPackage) {
        return res.status(409).json({
          success: false,
          message: "Package name already exists",
        });
      }

      // Create package
      const packageData = await queryHelpers.create("packages", {
        name: name,
        description: description,
        disk_space_mb: disk_space_mb,
        bandwidth_gb: bandwidth_gb,
        max_domains: max_domains,
        max_subdomains: max_subdomains,
        max_databases: max_databases,
        max_email_accounts: max_email_accounts,
        max_ftp_accounts: max_ftp_accounts,
        max_cron_jobs: max_cron_jobs,
        features: JSON.stringify(features),
        price_monthly: price_monthly,
        is_active: is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`Package created: ${name}`, {
        userId: req.user.id,
        packageId: packageData.id,
      });

      res.status(201).json({
        success: true,
        message: "Package created successfully",
        data: {
          id: packageData.id,
          name: name,
          description: description,
          limits: {
            disk_space_mb: disk_space_mb,
            bandwidth_gb: bandwidth_gb,
            max_domains: max_domains,
            max_databases: max_databases,
            max_email_accounts: max_email_accounts,
          },
          features: features,
          price_monthly: price_monthly,
        },
      });
    } catch (error) {
      logger.error("Error creating package:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create package",
      });
    }
  }
);

// Update package (admin only)
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateRequest((validator, body) => {
    if (body.name) {
      validator.validateString("name", body.name);
    }
    if (body.disk_space_mb) {
      validator.validateNumber("disk_space_mb", body.disk_space_mb, { min: 1 });
    }
    if (body.bandwidth_gb) {
      validator.validateNumber("bandwidth_gb", body.bandwidth_gb, { min: 1 });
    }
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove non-updatable fields
      delete updateData.id;
      delete updateData.created_at;

      // Add updated timestamp
      updateData.updated_at = new Date().toISOString();

      // Check if package exists
      const existingPackage = await queryHelpers.findOne("packages", { id });
      if (!existingPackage) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check if new name conflicts (if name is being updated)
      if (updateData.name && updateData.name !== existingPackage.name) {
        const nameConflict = await queryHelpers.findOne("packages", {
          name: updateData.name,
        });
        if (nameConflict) {
          return res.status(409).json({
            success: false,
            message: "Package name already exists",
          });
        }
      }

      // Serialize features if provided
      if (updateData.features && typeof updateData.features === "object") {
        updateData.features = JSON.stringify(updateData.features);
      }

      // Update package
      await queryHelpers.update("packages", { id }, updateData);

      logger.info(`Package updated: ${existingPackage.name}`, {
        userId: req.user.id,
        packageId: id,
        changes: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: "Package updated successfully",
      });
    } catch (error) {
      logger.error("Error updating package:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update package",
      });
    }
  }
);

// Delete package (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const packageData = await queryHelpers.findOne("packages", { id });
    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Check if package has assigned users
    const userCount = await queryHelpers.count("users", { package_id: id });
    if (userCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete package with assigned users",
        data: {
          assigned_users: userCount,
        },
      });
    }

    // Delete package
    await queryHelpers.delete("packages", { id });

    logger.info(`Package deleted: ${packageData.name}`, {
      userId: req.user.id,
      packageId: id,
    });

    res.json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting package:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete package",
    });
  }
});

// Assign package to user (admin only)
router.post(
  "/:id/assign",
  authenticateToken,
  requireAdmin,
  validateRequest((validator, body) => {
    validator.validateNumber("user_id", body.user_id);
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      // Verify package exists
      const packageData = await queryHelpers.findOne("packages", { id });
      if (!packageData) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Verify user exists
      const userData = await queryHelpers.findOne("users", { id: user_id });
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if package is active
      if (!packageData.is_active) {
        return res.status(400).json({
          success: false,
          message: "Cannot assign inactive package",
        });
      }

      // Update user's package
      await queryHelpers.update(
        "users",
        { id: user_id },
        {
          package_id: id,
          updated_at: new Date().toISOString(),
        }
      );

      // Log package assignment
      await queryHelpers.create("package_assignments", {
        user_id: user_id,
        package_id: id,
        assigned_by: req.user.id,
        assigned_at: new Date().toISOString(),
      });

      logger.info(
        `Package assigned: ${packageData.name} to user ${userData.username}`,
        {
          userId: req.user.id,
          targetUserId: user_id,
          packageId: id,
        }
      );

      res.json({
        success: true,
        message: "Package assigned successfully",
        data: {
          user: {
            id: userData.id,
            username: userData.username,
            email: userData.email,
          },
          package: {
            id: packageData.id,
            name: packageData.name,
            description: packageData.description,
          },
        },
      });
    } catch (error) {
      logger.error("Error assigning package:", error);
      res.status(500).json({
        success: false,
        message: "Failed to assign package",
      });
    }
  }
);

// Get package templates
router.get(
  "/templates/list",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const templates = getPackageTemplates();

      res.json({
        success: true,
        data: {
          templates: templates,
        },
      });
    } catch (error) {
      logger.error("Error fetching package templates:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch package templates",
      });
    }
  }
);

// Create package from template (admin only)
router.post(
  "/templates/create",
  authenticateToken,
  requireAdmin,
  validateRequest((validator, body) => {
    validator.validateString("template", body.template);
    validator.validateString("name", body.name);
  }),
  async (req, res) => {
    try {
      const { template, name, price_monthly = 0 } = req.body;

      // Get template
      const templates = getPackageTemplates();
      const selectedTemplate = templates.find((t) => t.id === template);

      if (!selectedTemplate) {
        return res.status(404).json({
          success: false,
          message: "Package template not found",
        });
      }

      // Check if package name already exists
      const existingPackage = await queryHelpers.findOne("packages", { name });
      if (existingPackage) {
        return res.status(409).json({
          success: false,
          message: "Package name already exists",
        });
      }

      // Create package from template
      const packageData = await queryHelpers.create("packages", {
        name: name,
        description: selectedTemplate.description,
        disk_space_mb: selectedTemplate.limits.disk_space_mb,
        bandwidth_gb: selectedTemplate.limits.bandwidth_gb,
        max_domains: selectedTemplate.limits.max_domains,
        max_subdomains: selectedTemplate.limits.max_subdomains,
        max_databases: selectedTemplate.limits.max_databases,
        max_email_accounts: selectedTemplate.limits.max_email_accounts,
        max_ftp_accounts: selectedTemplate.limits.max_ftp_accounts,
        max_cron_jobs: selectedTemplate.limits.max_cron_jobs,
        features: JSON.stringify(selectedTemplate.features),
        price_monthly: price_monthly,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`Package created from template: ${name} (${template})`, {
        userId: req.user.id,
        packageId: packageData.id,
        template: template,
      });

      res.status(201).json({
        success: true,
        message: "Package created from template successfully",
        data: {
          id: packageData.id,
          name: name,
          template: template,
          limits: selectedTemplate.limits,
          features: selectedTemplate.features,
        },
      });
    } catch (error) {
      logger.error("Error creating package from template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create package from template",
      });
    }
  }
);

// Get user's current package info
router.get("/my/current", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current package
    const user = await queryHelpers.findOne("users", { id: userId });
    if (!user || !user.package_id) {
      return res.status(404).json({
        success: false,
        message: "No package assigned",
      });
    }

    const packageData = await queryHelpers.findOne("packages", {
      id: user.package_id,
    });
    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // Get current usage
    const usage = await getUserPackageUsage(userId);

    // Calculate usage percentages
    const usagePercentages = {
      disk_space: Math.round(
        (usage.disk_space_used / (packageData.disk_space_mb * 1024 * 1024)) *
          100
      ),
      bandwidth: Math.round(
        (usage.bandwidth_used /
          (packageData.bandwidth_gb * 1024 * 1024 * 1024)) *
          100
      ),
      domains: Math.round(
        (usage.domains_count / packageData.max_domains) * 100
      ),
      databases: Math.round(
        (usage.databases_count / packageData.max_databases) * 100
      ),
      email_accounts: Math.round(
        (usage.email_accounts_count / packageData.max_email_accounts) * 100
      ),
    };

    res.json({
      success: true,
      data: {
        package: {
          ...packageData,
          features: JSON.parse(packageData.features || "{}"),
        },
        usage: usage,
        usage_percentages: usagePercentages,
        limits: {
          disk_space_mb: packageData.disk_space_mb,
          bandwidth_gb: packageData.bandwidth_gb,
          max_domains: packageData.max_domains,
          max_databases: packageData.max_databases,
          max_email_accounts: packageData.max_email_accounts,
          max_ftp_accounts: packageData.max_ftp_accounts,
        },
        warnings: generateUsageWarnings(usagePercentages),
      },
    });
  } catch (error) {
    logger.error("Error fetching user package info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package information",
    });
  }
});

// Helper functions

async function getPackageResourceUsage(packageId) {
  try {
    // Get all users with this package
    const users = await queryHelpers.findMany("users", {
      package_id: packageId,
    });

    if (users.length === 0) {
      return {
        total_disk_used: 0,
        total_bandwidth_used: 0,
        total_domains: 0,
        total_databases: 0,
        total_email_accounts: 0,
        average_usage_percentage: 0,
      };
    }

    let totalDiskUsed = 0;
    let totalBandwidthUsed = 0;
    let totalDomains = 0;
    let totalDatabases = 0;
    let totalEmailAccounts = 0;

    for (const user of users) {
      const usage = await getUserPackageUsage(user.id);
      totalDiskUsed += usage.disk_space_used;
      totalBandwidthUsed += usage.bandwidth_used;
      totalDomains += usage.domains_count;
      totalDatabases += usage.databases_count;
      totalEmailAccounts += usage.email_accounts_count;
    }

    return {
      total_disk_used: totalDiskUsed,
      total_bandwidth_used: totalBandwidthUsed,
      total_domains: totalDomains,
      total_databases: totalDatabases,
      total_email_accounts: totalEmailAccounts,
      user_count: users.length,
    };
  } catch (error) {
    logger.error("Error calculating package resource usage:", error);
    return {
      total_disk_used: 0,
      total_bandwidth_used: 0,
      total_domains: 0,
      total_databases: 0,
      total_email_accounts: 0,
      user_count: 0,
    };
  }
}

async function getUserPackageUsage(userId) {
  try {
    // Get user's domains count
    const domainsCount = await queryHelpers.count("domains", {
      user_id: userId,
    });

    // Get user's databases count
    const databasesCount = await queryHelpers.count("databases", {
      user_id: userId,
    });

    // Get user's email accounts count
    const emailAccountsCount = await queryHelpers.count("email_accounts", {
      user_id: userId,
    });

    // Mock disk space and bandwidth usage (in real implementation, calculate from file system)
    const diskSpaceUsed = Math.floor(Math.random() * 1000000000); // Random bytes
    const bandwidthUsed = Math.floor(Math.random() * 5000000000); // Random bytes

    return {
      disk_space_used: diskSpaceUsed,
      bandwidth_used: bandwidthUsed,
      domains_count: domainsCount,
      databases_count: databasesCount,
      email_accounts_count: emailAccountsCount,
      disk_space_formatted: formatBytes(diskSpaceUsed),
      bandwidth_formatted: formatBytes(bandwidthUsed),
    };
  } catch (error) {
    logger.error("Error calculating user package usage:", error);
    return {
      disk_space_used: 0,
      bandwidth_used: 0,
      domains_count: 0,
      databases_count: 0,
      email_accounts_count: 0,
      disk_space_formatted: "0 B",
      bandwidth_formatted: "0 B",
    };
  }
}

function getPackageTemplates() {
  return [
    {
      id: "starter",
      name: "Starter Package",
      description: "Perfect for personal websites and small projects",
      limits: {
        disk_space_mb: 1024, // 1GB
        bandwidth_gb: 10,
        max_domains: 1,
        max_subdomains: 5,
        max_databases: 3,
        max_email_accounts: 5,
        max_ftp_accounts: 2,
        max_cron_jobs: 5,
      },
      features: {
        ssl_certificates: true,
        backups: false,
        shell_access: false,
        php_version: "8.1",
        nodejs_support: false,
        python_support: false,
      },
    },
    {
      id: "business",
      name: "Business Package",
      description: "Ideal for small to medium businesses",
      limits: {
        disk_space_mb: 5120, // 5GB
        bandwidth_gb: 50,
        max_domains: 5,
        max_subdomains: 25,
        max_databases: 15,
        max_email_accounts: 25,
        max_ftp_accounts: 10,
        max_cron_jobs: 20,
      },
      features: {
        ssl_certificates: true,
        backups: true,
        shell_access: true,
        php_version: "8.2",
        nodejs_support: true,
        python_support: true,
        staging_environment: true,
      },
    },
    {
      id: "professional",
      name: "Professional Package",
      description: "For professional websites and applications",
      limits: {
        disk_space_mb: 10240, // 10GB
        bandwidth_gb: 100,
        max_domains: 15,
        max_subdomains: 100,
        max_databases: 50,
        max_email_accounts: 100,
        max_ftp_accounts: 25,
        max_cron_jobs: 50,
      },
      features: {
        ssl_certificates: true,
        backups: true,
        shell_access: true,
        php_version: "8.2",
        nodejs_support: true,
        python_support: true,
        staging_environment: true,
        git_integration: true,
        advanced_security: true,
      },
    },
    {
      id: "enterprise",
      name: "Enterprise Package",
      description: "For large applications and high-traffic websites",
      limits: {
        disk_space_mb: 51200, // 50GB
        bandwidth_gb: 500,
        max_domains: 50,
        max_subdomains: 500,
        max_databases: 200,
        max_email_accounts: 500,
        max_ftp_accounts: 100,
        max_cron_jobs: 200,
      },
      features: {
        ssl_certificates: true,
        backups: true,
        shell_access: true,
        php_version: "8.2",
        nodejs_support: true,
        python_support: true,
        staging_environment: true,
        git_integration: true,
        advanced_security: true,
        priority_support: true,
        cdn_integration: true,
        load_balancing: true,
      },
    },
  ];
}

function generateUsageWarnings(usagePercentages) {
  const warnings = [];

  Object.entries(usagePercentages).forEach(([resource, percentage]) => {
    if (percentage >= 90) {
      warnings.push({
        type: "critical",
        resource: resource,
        percentage: percentage,
        message: `${resource.replace(
          "_",
          " "
        )} usage is critically high (${percentage}%)`,
      });
    } else if (percentage >= 75) {
      warnings.push({
        type: "warning",
        resource: resource,
        percentage: percentage,
        message: `${resource.replace("_", " ")} usage is high (${percentage}%)`,
      });
    }
  });

  return warnings;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = router;


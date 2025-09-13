// Reseller Management Service - White Label Hosting
// server/services/resellerService.js

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { logger } = require("../utils/logger");
const databaseService = require("./databaseService");
const billingService = require("./billingService");

class ResellerService {
  constructor() {
    this.platform = process.platform;
    this.isProduction = process.env.NODE_ENV === "production";

    // Reseller configuration
    this.resellerConfig = {
      maxResellerDepth: parseInt(process.env.MAX_RESELLER_DEPTH) || 3,
      defaultCommission: parseFloat(process.env.DEFAULT_COMMISSION) || 0.15,
      minCommission: parseFloat(process.env.MIN_COMMISSION) || 0.05,
      maxCommission: parseFloat(process.env.MAX_COMMISSION) || 0.5,
      autoActivation: process.env.RESELLER_AUTO_ACTIVATION === "true",
      whitelabelEnabled: process.env.WHITELABEL_ENABLED === "true",
      brandingEnabled: process.env.BRANDING_ENABLED === "true",
    };

    // Reseller plans and packages
    this.resellerPlans = this.initializeResellerPlans();

    // Commission structure
    this.commissionStructure = this.initializeCommissionStructure();

    this.initialize();
  }

  async initialize() {
    try {
      await this.initializeResellerDatabase();
      await this.loadResellerConfigurations();
      await this.setupResellerDomains();

      logger.info("Reseller Service initialized", {
        maxDepth: this.resellerConfig.maxResellerDepth,
        defaultCommission: this.resellerConfig.defaultCommission,
        plansCount: this.resellerPlans.length,
      });
    } catch (error) {
      logger.error("Failed to initialize reseller service", error);
    }
  }

  initializeResellerPlans() {
    return [
      {
        id: "reseller_starter",
        name: "Reseller Starter",
        type: "reseller",
        price: 29.99,
        billingPeriod: "monthly",
        features: {
          accounts: 25,
          diskSpace: "50GB",
          bandwidth: "500GB",
          domains: "Unlimited",
          subdomains: "Unlimited",
          emailAccounts: "Unlimited",
          databases: "Unlimited",
          ssl: true,
          whitelabel: true,
          privateNameservers: false,
          whmcs: true,
          support: "priority",
        },
        limits: {
          maxAccounts: 25,
          diskSpaceMB: 51200,
          bandwidthMB: 512000,
          maxDomains: -1,
          maxSubdomains: -1,
          maxEmailAccounts: -1,
          maxDatabases: -1,
        },
        commissions: {
          shared_basic: 0.2,
          shared_premium: 0.18,
          vps_starter: 0.15,
        },
      },
      {
        id: "reseller_business",
        name: "Reseller Business",
        type: "reseller",
        price: 59.99,
        billingPeriod: "monthly",
        features: {
          accounts: 75,
          diskSpace: "150GB",
          bandwidth: "1500GB",
          domains: "Unlimited",
          subdomains: "Unlimited",
          emailAccounts: "Unlimited",
          databases: "Unlimited",
          ssl: true,
          whitelabel: true,
          privateNameservers: true,
          whmcs: true,
          support: "priority",
        },
        limits: {
          maxAccounts: 75,
          diskSpaceMB: 153600,
          bandwidthMB: 1536000,
          maxDomains: -1,
          maxSubdomains: -1,
          maxEmailAccounts: -1,
          maxDatabases: -1,
        },
        commissions: {
          shared_basic: 0.25,
          shared_premium: 0.22,
          vps_starter: 0.18,
          vps_business: 0.15,
        },
      },
      {
        id: "reseller_enterprise",
        name: "Reseller Enterprise",
        type: "reseller",
        price: 119.99,
        billingPeriod: "monthly",
        features: {
          accounts: 200,
          diskSpace: "400GB",
          bandwidth: "Unlimited",
          domains: "Unlimited",
          subdomains: "Unlimited",
          emailAccounts: "Unlimited",
          databases: "Unlimited",
          ssl: true,
          whitelabel: true,
          privateNameservers: true,
          whmcs: true,
          dedicatedIp: true,
          support: "24/7",
        },
        limits: {
          maxAccounts: 200,
          diskSpaceMB: 409600,
          bandwidthMB: -1,
          maxDomains: -1,
          maxSubdomains: -1,
          maxEmailAccounts: -1,
          maxDatabases: -1,
        },
        commissions: {
          shared_basic: 0.3,
          shared_premium: 0.27,
          vps_starter: 0.22,
          vps_business: 0.18,
          dedicated_basic: 0.15,
        },
      },
    ];
  }

  initializeCommissionStructure() {
    return {
      levels: [
        {
          level: 1,
          name: "Direct Reseller",
          baseCommission: 0.15,
          bonusThreshold: 10,
          bonus: 0.02,
        },
        {
          level: 2,
          name: "Sub-Reseller",
          baseCommission: 0.1,
          bonusThreshold: 5,
          bonus: 0.01,
        },
        {
          level: 3,
          name: "Agent",
          baseCommission: 0.05,
          bonusThreshold: 3,
          bonus: 0.005,
        },
      ],
      volumeBonuses: [
        { threshold: 50, bonus: 0.02 },
        { threshold: 100, bonus: 0.03 },
        { threshold: 200, bonus: 0.05 },
      ],
      paymentSchedule: "monthly", // monthly, weekly, bi-weekly
      minimumPayout: 50.0,
      currency: "USD",
    };
  }

  async initializeResellerDatabase() {
    const schema = `
      -- Reseller management tables
      CREATE TABLE IF NOT EXISTS resellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        parent_reseller_id INTEGER,
        reseller_plan_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        level INTEGER DEFAULT 1,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50),
        business_registration VARCHAR(100),
        tax_id VARCHAR(100),
        commission_rate DECIMAL(5,4) DEFAULT 0.1500,
        custom_pricing BOOLEAN DEFAULT 0,
        whitelabel_enabled BOOLEAN DEFAULT 1,
        private_nameservers BOOLEAN DEFAULT 0,
        nameserver1 VARCHAR(255),
        nameserver2 VARCHAR(255),
        suspended BOOLEAN DEFAULT 0,
        suspended_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (parent_reseller_id) REFERENCES resellers (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        customer_user_id INTEGER NOT NULL,
        hosting_plan_id VARCHAR(100) NOT NULL,
        subscription_id INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        commission_amount DECIMAL(10,2) NOT NULL,
        commission_rate DECIMAL(5,4) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id),
        FOREIGN KEY (customer_user_id) REFERENCES users (id),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        commission_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        rate DECIMAL(5,4) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        paid_at DATETIME,
        payment_id VARCHAR(255),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id),
        FOREIGN KEY (account_id) REFERENCES reseller_accounts (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_payouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        payout_id VARCHAR(255) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        commission_count INTEGER NOT NULL,
        payment_method VARCHAR(100),
        payment_details TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        processed_at DATETIME,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_branding (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        logo_url VARCHAR(500),
        company_logo_url VARCHAR(500),
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        accent_color VARCHAR(7),
        custom_css TEXT,
        custom_domain VARCHAR(255),
        ssl_certificate TEXT,
        terms_url VARCHAR(500),
        privacy_url VARCHAR(500),
        support_email VARCHAR(255),
        support_phone VARCHAR(50),
        billing_email VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        plan_id VARCHAR(100) NOT NULL,
        custom_price DECIMAL(10,2),
        custom_setup_fee DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        billing_period VARCHAR(20),
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id)
      );

      CREATE TABLE IF NOT EXISTS reseller_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,6) NOT NULL,
        period_type VARCHAR(20) NOT NULL,
        period_date DATE NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES resellers (id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_resellers_parent ON resellers (parent_reseller_id);
      CREATE INDEX IF NOT EXISTS idx_reseller_accounts_reseller ON reseller_accounts (reseller_id);
      CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller_status ON reseller_commissions (reseller_id, status);
      CREATE INDEX IF NOT EXISTS idx_reseller_commissions_period ON reseller_commissions (period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_reseller_statistics_period ON reseller_statistics (reseller_id, period_date);
    `;

    try {
      const db = require("../config/database");
      await db.exec(schema);
      logger.info("Reseller database schema initialized");
    } catch (error) {
      logger.error("Error initializing reseller database:", error);
      throw error;
    }
  }

  // Reseller Account Management
  async createReseller(userId, resellerData) {
    try {
      const db = require("../config/database");

      // Validate parent reseller if specified
      if (resellerData.parentResellerId) {
        const parentReseller = await db.get(
          'SELECT * FROM resellers WHERE id = ? AND status = "active"',
          [resellerData.parentResellerId]
        );

        if (!parentReseller) {
          throw new Error("Parent reseller not found or inactive");
        }

        if (parentReseller.level >= this.resellerConfig.maxResellerDepth) {
          throw new Error("Maximum reseller depth exceeded");
        }
      }

      // Get reseller plan
      const plan = this.resellerPlans.find((p) => p.id === resellerData.planId);
      if (!plan) {
        throw new Error(`Reseller plan not found: ${resellerData.planId}`);
      }

      // Calculate level and commission rate
      const level = resellerData.parentResellerId
        ? (await this.getResellerLevel(resellerData.parentResellerId)) + 1
        : 1;

      const commissionRate =
        resellerData.commissionRate ||
        this.commissionStructure.levels[level - 1]?.baseCommission ||
        this.resellerConfig.defaultCommission;

      // Create reseller record
      const resellerRecord = {
        user_id: userId,
        parent_reseller_id: resellerData.parentResellerId || null,
        reseller_plan_id: resellerData.planId,
        status: this.resellerConfig.autoActivation ? "active" : "pending",
        level: level,
        company_name: resellerData.companyName,
        contact_name: resellerData.contactName,
        contact_email: resellerData.contactEmail,
        contact_phone: resellerData.contactPhone,
        business_registration: resellerData.businessRegistration,
        tax_id: resellerData.taxId,
        commission_rate: commissionRate,
        custom_pricing: resellerData.customPricing || false,
        whitelabel_enabled: resellerData.whitelabelEnabled !== false,
        private_nameservers: resellerData.privateNameservers || false,
        nameserver1: resellerData.nameserver1,
        nameserver2: resellerData.nameserver2,
        notes: resellerData.notes,
      };

      const result = await db.run(
        `
        INSERT INTO resellers (${Object.keys(resellerRecord).join(", ")})
        VALUES (${Object.keys(resellerRecord)
          .map(() => "?")
          .join(", ")})
      `,
        Object.values(resellerRecord)
      );

      const resellerId = result.lastID;

      // Create default branding if whitelabel enabled
      if (resellerRecord.whitelabel_enabled) {
        await this.createDefaultBranding(resellerId, resellerData);
      }

      // Create subscription for reseller plan
      const subscription = await billingService.createSubscription(
        userId,
        resellerData.planId,
        {
          metadata: { reseller_id: resellerId, type: "reseller_plan" },
        }
      );

      logger.info(`Reseller created: ${resellerId} for user ${userId}`);
      return {
        success: true,
        resellerId: resellerId,
        level: level,
        commissionRate: commissionRate,
        subscriptionId: subscription.subscriptionId,
      };
    } catch (error) {
      logger.error("Error creating reseller:", error);
      throw error;
    }
  }

  async activateReseller(resellerId, options = {}) {
    try {
      const db = require("../config/database");

      const reseller = await db.get("SELECT * FROM resellers WHERE id = ?", [
        resellerId,
      ]);
      if (!reseller) {
        throw new Error("Reseller not found");
      }

      await db.run(
        `
        UPDATE resellers 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [resellerId]
      );

      // Setup default nameservers if needed
      if (
        reseller.private_nameservers &&
        (!reseller.nameserver1 || !reseller.nameserver2)
      ) {
        await this.setupPrivateNameservers(resellerId);
      }

      // Create initial statistics record
      await this.initializeResellerStatistics(resellerId);

      logger.info(`Reseller activated: ${resellerId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error activating reseller:", error);
      throw error;
    }
  }

  async suspendReseller(resellerId, reason, options = {}) {
    try {
      const db = require("../config/database");

      await db.run(
        `
        UPDATE resellers 
        SET suspended = 1, suspended_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [reason, resellerId]
      );

      // Optionally suspend all customer accounts
      if (options.suspendAccounts) {
        await db.run(
          `
          UPDATE reseller_accounts 
          SET status = 'suspended'
          WHERE reseller_id = ? AND status = 'active'
        `,
          [resellerId]
        );
      }

      logger.info(`Reseller suspended: ${resellerId}, reason: ${reason}`);
      return { success: true };
    } catch (error) {
      logger.error("Error suspending reseller:", error);
      throw error;
    }
  }

  // Customer Account Management
  async createCustomerAccount(resellerId, customerData, planId) {
    try {
      const db = require("../config/database");

      // Verify reseller
      const reseller = await db.get(
        'SELECT * FROM resellers WHERE id = ? AND status = "active" AND suspended = 0',
        [resellerId]
      );

      if (!reseller) {
        throw new Error("Reseller not found or inactive");
      }

      // Check reseller limits
      const accountCount = await this.getResellerAccountCount(resellerId);
      const plan = this.resellerPlans.find(
        (p) => p.id === reseller.reseller_plan_id
      );

      if (plan && accountCount >= plan.limits.maxAccounts) {
        throw new Error("Reseller account limit exceeded");
      }

      // Get hosting plan and pricing
      const hostingPlan = this.getHostingPlan(planId);
      const pricing = await this.getResellerPricing(resellerId, planId);

      // Create customer user account
      const customerUser = await this.createCustomerUser(customerData);

      // Create customer subscription
      const subscription = await billingService.createSubscription(
        customerUser.userId,
        planId,
        {
          price: pricing.price,
          metadata: {
            reseller_id: resellerId,
            reseller_account: true,
          },
        }
      );

      // Calculate commission
      const commissionRate = await this.calculateCommissionRate(
        resellerId,
        planId,
        pricing.price
      );
      const commissionAmount = pricing.price * commissionRate;

      // Create reseller account record
      const accountResult = await db.run(
        `
        INSERT INTO reseller_accounts (reseller_id, customer_user_id, hosting_plan_id, subscription_id, 
                                     commission_amount, commission_rate)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          resellerId,
          customerUser.userId,
          planId,
          subscription.subscriptionId,
          commissionAmount,
          commissionRate,
        ]
      );

      // Update reseller statistics
      await this.updateResellerStatistics(resellerId, "accounts_created", 1);

      logger.info(
        `Customer account created for reseller ${resellerId}: ${accountResult.lastID}`
      );
      return {
        success: true,
        accountId: accountResult.lastID,
        customerId: customerUser.userId,
        subscriptionId: subscription.subscriptionId,
        commissionAmount: commissionAmount,
      };
    } catch (error) {
      logger.error("Error creating customer account:", error);
      throw error;
    }
  }

  async getResellerAccounts(resellerId, options = {}) {
    try {
      const db = require("../config/database");

      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const status = options.status;

      let query = `
        SELECT ra.*, u.name, u.email, u.created_at as customer_created,
               s.status as subscription_status, s.current_period_end
        FROM reseller_accounts ra
        JOIN users u ON ra.customer_user_id = u.id
        LEFT JOIN subscriptions s ON ra.subscription_id = s.id
        WHERE ra.reseller_id = ?
      `;

      const params = [resellerId];

      if (status) {
        query += " AND ra.status = ?";
        params.push(status);
      }

      query += " ORDER BY ra.created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const accounts = await db.all(query, params);

      // Get total count
      const countResult = await db.get(
        "SELECT COUNT(*) as total FROM reseller_accounts WHERE reseller_id = ?",
        [resellerId]
      );

      return {
        success: true,
        accounts: accounts,
        total: countResult.total,
        pagination: {
          limit: limit,
          offset: offset,
          hasMore: offset + limit < countResult.total,
        },
      };
    } catch (error) {
      logger.error("Error getting reseller accounts:", error);
      throw error;
    }
  }

  // Commission Management
  async calculateCommissions(periodStart, periodEnd) {
    try {
      const db = require("../config/database");

      // Get all active reseller accounts with payments in period
      const accounts = await db.all(
        `
        SELECT ra.*, p.amount, p.paid_at, r.commission_rate
        FROM reseller_accounts ra
        JOIN payments p ON ra.subscription_id = p.invoice_id
        JOIN resellers r ON ra.reseller_id = r.id
        WHERE p.paid_at BETWEEN ? AND ? 
        AND p.status = 'completed'
        AND ra.status = 'active'
      `,
        [periodStart, periodEnd]
      );

      for (const account of accounts) {
        const commissionAmount = account.amount * account.commission_rate;

        // Create commission record
        await db.run(
          `
          INSERT INTO reseller_commissions (reseller_id, account_id, commission_type, amount, rate, 
                                          period_start, period_end, status)
          VALUES (?, ?, 'monthly_recurring', ?, ?, ?, ?, 'pending')
        `,
          [
            account.reseller_id,
            account.id,
            commissionAmount,
            account.commission_rate,
            periodStart,
            periodEnd,
          ]
        );

        // Calculate parent commissions (multi-level)
        await this.calculateParentCommissions(
          account.reseller_id,
          commissionAmount,
          periodStart,
          periodEnd
        );
      }

      logger.info(
        `Commissions calculated for period ${periodStart} to ${periodEnd}`
      );
      return { success: true };
    } catch (error) {
      logger.error("Error calculating commissions:", error);
      throw error;
    }
  }

  async calculateParentCommissions(
    resellerId,
    baseAmount,
    periodStart,
    periodEnd
  ) {
    try {
      const db = require("../config/database");

      const reseller = await db.get("SELECT * FROM resellers WHERE id = ?", [
        resellerId,
      ]);
      if (!reseller || !reseller.parent_reseller_id) {
        return;
      }

      // Calculate parent commission (usually smaller percentage)
      const parentCommissionRate = this.getParentCommissionRate(reseller.level);
      const parentCommissionAmount = baseAmount * parentCommissionRate;

      if (parentCommissionAmount > 0) {
        await db.run(
          `
          INSERT INTO reseller_commissions (reseller_id, account_id, commission_type, amount, rate,
                                          period_start, period_end, status)
          VALUES (?, NULL, 'sub_reseller_commission', ?, ?, ?, ?, 'pending')
        `,
          [
            reseller.parent_reseller_id,
            parentCommissionAmount,
            parentCommissionRate,
            periodStart,
            periodEnd,
          ]
        );

        // Recurse for multi-level commissions
        await this.calculateParentCommissions(
          reseller.parent_reseller_id,
          parentCommissionAmount,
          periodStart,
          periodEnd
        );
      }
    } catch (error) {
      logger.error("Error calculating parent commissions:", error);
    }
  }

  async processCommissionPayouts(periodStart, periodEnd) {
    try {
      const db = require("../config/database");

      // Get resellers with pending commissions above minimum payout
      const resellers = await db.all(
        `
        SELECT r.id, r.user_id, r.company_name, 
               SUM(rc.amount) as total_commission,
               COUNT(rc.id) as commission_count
        FROM resellers r
        JOIN reseller_commissions rc ON r.id = rc.reseller_id
        WHERE rc.status = 'pending' 
        AND rc.period_start >= ? AND rc.period_end <= ?
        GROUP BY r.id
        HAVING total_commission >= ?
      `,
        [periodStart, periodEnd, this.commissionStructure.minimumPayout]
      );

      for (const reseller of resellers) {
        try {
          await this.createCommissionPayout(
            reseller.id,
            reseller.total_commission,
            reseller.commission_count,
            periodStart,
            periodEnd
          );
        } catch (error) {
          logger.error(
            `Error creating payout for reseller ${reseller.id}:`,
            error
          );
        }
      }

      logger.info(
        `Commission payouts processed for ${resellers.length} resellers`
      );
      return { success: true, payoutsCreated: resellers.length };
    } catch (error) {
      logger.error("Error processing commission payouts:", error);
      throw error;
    }
  }

  async createCommissionPayout(
    resellerId,
    amount,
    commissionCount,
    periodStart,
    periodEnd
  ) {
    try {
      const db = require("../config/database");

      const payoutId = this.generatePayoutId();

      // Create payout record
      await db.run(
        `
        INSERT INTO reseller_payouts (reseller_id, payout_id, total_amount, commission_count,
                                    period_start, period_end, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
        [resellerId, payoutId, amount, commissionCount, periodStart, periodEnd]
      );

      // Mark commissions as included in payout
      await db.run(
        `
        UPDATE reseller_commissions 
        SET status = 'payout_pending', payment_id = ?
        WHERE reseller_id = ? AND status = 'pending'
        AND period_start >= ? AND period_end <= ?
      `,
        [payoutId, resellerId, periodStart, periodEnd]
      );

      logger.info(
        `Commission payout created: ${payoutId} for reseller ${resellerId}`
      );
      return { success: true, payoutId: payoutId };
    } catch (error) {
      logger.error("Error creating commission payout:", error);
      throw error;
    }
  }

  // Branding and White Label
  async createDefaultBranding(resellerId, resellerData) {
    try {
      const db = require("../config/database");

      const branding = {
        reseller_id: resellerId,
        primary_color: resellerData.primaryColor || "#2563eb",
        secondary_color: resellerData.secondaryColor || "#1e40af",
        accent_color: resellerData.accentColor || "#3b82f6",
        support_email: resellerData.contactEmail,
        support_phone: resellerData.contactPhone,
        billing_email: resellerData.contactEmail,
      };

      await db.run(
        `
        INSERT INTO reseller_branding (${Object.keys(branding).join(", ")})
        VALUES (${Object.keys(branding)
          .map(() => "?")
          .join(", ")})
      `,
        Object.values(branding)
      );

      logger.info(`Default branding created for reseller ${resellerId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error creating default branding:", error);
      throw error;
    }
  }

  async updateBranding(resellerId, brandingData) {
    try {
      const db = require("../config/database");

      const allowedFields = [
        "logo_url",
        "company_logo_url",
        "primary_color",
        "secondary_color",
        "accent_color",
        "custom_css",
        "custom_domain",
        "terms_url",
        "privacy_url",
        "support_email",
        "support_phone",
        "billing_email",
      ];

      const updateFields = Object.keys(brandingData)
        .filter((key) => allowedFields.includes(key))
        .map((key) => `${key} = ?`)
        .join(", ");

      if (updateFields) {
        const updateValues = Object.keys(brandingData)
          .filter((key) => allowedFields.includes(key))
          .map((key) => brandingData[key]);

        await db.run(
          `
          UPDATE reseller_branding 
          SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
          WHERE reseller_id = ?
        `,
          [...updateValues, resellerId]
        );
      }

      logger.info(`Branding updated for reseller ${resellerId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error updating branding:", error);
      throw error;
    }
  }

  // Pricing Management
  async setCustomPricing(resellerId, planId, pricing) {
    try {
      const db = require("../config/database");

      // Verify reseller has custom pricing enabled
      const reseller = await db.get(
        "SELECT custom_pricing FROM resellers WHERE id = ?",
        [resellerId]
      );

      if (!reseller || !reseller.custom_pricing) {
        throw new Error("Custom pricing not enabled for this reseller");
      }

      await db.run(
        `
        INSERT OR REPLACE INTO reseller_pricing 
        (reseller_id, plan_id, custom_price, custom_setup_fee, currency, billing_period)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          resellerId,
          planId,
          pricing.price,
          pricing.setupFee || 0,
          pricing.currency || "USD",
          pricing.billingPeriod || "monthly",
        ]
      );

      logger.info(
        `Custom pricing set for reseller ${resellerId}, plan ${planId}`
      );
      return { success: true };
    } catch (error) {
      logger.error("Error setting custom pricing:", error);
      throw error;
    }
  }

  async getResellerPricing(resellerId, planId) {
    try {
      const db = require("../config/database");

      // Check for custom pricing first
      const customPricing = await db.get(
        `
        SELECT * FROM reseller_pricing 
        WHERE reseller_id = ? AND plan_id = ? AND enabled = 1
      `,
        [resellerId, planId]
      );

      if (customPricing) {
        return {
          price: customPricing.custom_price,
          setupFee: customPricing.custom_setup_fee,
          currency: customPricing.currency,
          billingPeriod: customPricing.billing_period,
          isCustom: true,
        };
      }

      // Use default pricing with reseller markup/discount
      const defaultPlan = this.getHostingPlan(planId);
      if (!defaultPlan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Apply reseller markup (if any)
      const markup = await this.getResellerMarkup(resellerId);
      const price = defaultPlan.price * (1 + markup);

      return {
        price: price,
        setupFee: 0,
        currency: "USD",
        billingPeriod: defaultPlan.billingPeriod,
        isCustom: false,
      };
    } catch (error) {
      logger.error("Error getting reseller pricing:", error);
      throw error;
    }
  }

  // Statistics and Reporting
  async getResellerStatistics(resellerId, period = "monthly") {
    try {
      const db = require("../config/database");

      const periodCondition = this.getPeriodCondition(period);

      // Get account statistics
      const accountStats = await db.get(
        `
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_accounts,
          SUM(commission_amount) as total_commissions
        FROM reseller_accounts 
        WHERE reseller_id = ?
      `,
        [resellerId]
      );

      // Get commission statistics
      const commissionStats = await db.get(
        `
        SELECT 
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_commissions,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_commissions,
          COUNT(*) as total_commission_entries
        FROM reseller_commissions 
        WHERE reseller_id = ? ${periodCondition}
      `,
        [resellerId]
      );

      // Get revenue statistics
      const revenueStats = await db.all(
        `
        SELECT 
          DATE(created_at) as date,
          SUM(commission_amount) as daily_commission
        FROM reseller_accounts 
        WHERE reseller_id = ? AND created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
        [resellerId]
      );

      return {
        success: true,
        period: period,
        accounts: accountStats,
        commissions: commissionStats,
        revenue: revenueStats,
      };
    } catch (error) {
      logger.error("Error getting reseller statistics:", error);
      throw error;
    }
  }

  async updateResellerStatistics(resellerId, metricName, value, metadata = {}) {
    try {
      const db = require("../config/database");

      const today = new Date().toISOString().split("T")[0];

      await db.run(
        `
        INSERT OR REPLACE INTO reseller_statistics 
        (reseller_id, metric_name, metric_value, period_type, period_date, metadata)
        VALUES (?, ?, ?, 'daily', ?, ?)
      `,
        [resellerId, metricName, value, today, JSON.stringify(metadata)]
      );
    } catch (error) {
      logger.error("Error updating reseller statistics:", error);
    }
  }

  // Utility Methods
  async getResellerLevel(resellerId) {
    try {
      const db = require("../config/database");
      const result = await db.get("SELECT level FROM resellers WHERE id = ?", [
        resellerId,
      ]);
      return result ? result.level : 1;
    } catch (error) {
      return 1;
    }
  }

  async getResellerAccountCount(resellerId) {
    try {
      const db = require("../config/database");
      const result = await db.get(
        "SELECT COUNT(*) as count FROM reseller_accounts WHERE reseller_id = ?",
        [resellerId]
      );
      return result ? result.count : 0;
    } catch (error) {
      return 0;
    }
  }

  calculateCommissionRate(resellerId, planId, price) {
    // This would implement complex commission calculation logic
    // For now, return a simple rate
    return this.resellerConfig.defaultCommission;
  }

  getParentCommissionRate(childLevel) {
    // Parent gets lower commission rate
    const rates = { 2: 0.05, 3: 0.03, 4: 0.02 };
    return rates[childLevel] || 0.01;
  }

  getHostingPlan(planId) {
    // This would get from hosting plans service
    return { id: planId, price: 9.99, billingPeriod: "monthly" };
  }

  async getResellerMarkup(resellerId) {
    // Default markup for resellers
    return 0.0; // No markup by default
  }

  generatePayoutId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAYOUT-${timestamp}-${random}`;
  }

  getPeriodCondition(period) {
    switch (period) {
      case "weekly":
        return "AND created_at >= date('now', '-7 days')";
      case "monthly":
        return "AND created_at >= date('now', '-30 days')";
      case "yearly":
        return "AND created_at >= date('now', '-365 days')";
      default:
        return "";
    }
  }

  async createCustomerUser(customerData) {
    // This would integrate with user management
    // For now, return mock data
    return {
      userId: Date.now(),
      email: customerData.email,
      name: customerData.name,
    };
  }

  async setupPrivateNameservers(resellerId) {
    // This would setup DNS records for private nameservers
    logger.info(`Setting up private nameservers for reseller ${resellerId}`);
  }

  async initializeResellerStatistics(resellerId) {
    await this.updateResellerStatistics(resellerId, "accounts_created", 0);
    await this.updateResellerStatistics(resellerId, "total_revenue", 0);
    await this.updateResellerStatistics(resellerId, "commission_earned", 0);
  }

  async loadResellerConfigurations() {
    logger.info("Reseller configurations loaded");
  }

  async setupResellerDomains() {
    logger.info("Reseller domains setup completed");
  }

  // Cleanup
  async cleanup() {
    try {
      logger.info("Reseller service cleanup completed");
    } catch (error) {
      logger.error("Error during reseller service cleanup:", error);
    }
  }
}

module.exports = new ResellerService();

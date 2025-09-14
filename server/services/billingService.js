// Billing and Subscription Management Service
// server/services/billingService.js

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { logger } = require("../utils/logger");
const databaseService = require("./databaseService");

class BillingService {
  constructor() {
    this.platform = process.platform;
    this.isProduction = process.env.NODE_ENV === "production";

    // Payment gateways configuration
    this.paymentGateways = {
      stripe: {
        enabled: process.env.STRIPE_ENABLED === "true",
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      paypal: {
        enabled: process.env.PAYPAL_ENABLED === "true",
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        sandbox: process.env.PAYPAL_SANDBOX === "true",
      },
      paddle: {
        enabled: process.env.PADDLE_ENABLED === "true",
        vendorId: process.env.PADDLE_VENDOR_ID,
        vendorAuthCode: process.env.PADDLE_VENDOR_AUTH_CODE,
        publicKey: process.env.PADDLE_PUBLIC_KEY,
      },
    };

    // Billing configuration
    this.billingConfig = {
      currency: process.env.DEFAULT_CURRENCY || "USD",
      taxRate: parseFloat(process.env.DEFAULT_TAX_RATE) || 0.0,
      gracePeriodDays: parseInt(process.env.GRACE_PERIOD_DAYS) || 7,
      suspensionDays: parseInt(process.env.SUSPENSION_DAYS) || 14,
      terminationDays: parseInt(process.env.TERMINATION_DAYS) || 30,
      invoicePrefix: process.env.INVOICE_PREFIX || "INV",
      receiptPrefix: process.env.RECEIPT_PREFIX || "RCT",
    };

    // Hosting plans and pricing
    this.hostingPlans = this.initializeHostingPlans();

    this.initialize();
  }

  async initialize() {
    try {
      await this.initializeBillingDatabase();
      await this.loadPaymentGateways();
      await this.scheduleRecurringTasks();

      logger.info("Billing Service initialized", {
        enabledGateways: Object.keys(this.paymentGateways).filter(
          (gw) => this.paymentGateways[gw].enabled
        ),
        currency: this.billingConfig.currency,
        plansCount: this.hostingPlans.length,
      });
    } catch (error) {
      logger.error("Failed to initialize billing service", error);
    }
  }

  initializeHostingPlans() {
    return [
      {
        id: "shared_basic",
        name: "Shared Basic",
        type: "shared",
        price: 4.99,
        billingPeriod: "monthly",
        features: {
          diskSpace: "1GB",
          bandwidth: "10GB",
          domains: 1,
          subdomains: 5,
          emailAccounts: 5,
          databases: 2,
          ftpAccounts: 2,
          ssl: false,
          backup: false,
          support: "ticket",
        },
        limits: {
          diskSpaceMB: 1024,
          bandwidthMB: 10240,
          maxDomains: 1,
          maxSubdomains: 5,
          maxEmailAccounts: 5,
          maxDatabases: 2,
          maxFtpAccounts: 2,
        },
      },
      {
        id: "shared_premium",
        name: "Shared Premium",
        type: "shared",
        price: 9.99,
        billingPeriod: "monthly",
        features: {
          diskSpace: "5GB",
          bandwidth: "50GB",
          domains: 5,
          subdomains: 25,
          emailAccounts: 25,
          databases: 10,
          ftpAccounts: 10,
          ssl: true,
          backup: true,
          support: "priority",
        },
        limits: {
          diskSpaceMB: 5120,
          bandwidthMB: 51200,
          maxDomains: 5,
          maxSubdomains: 25,
          maxEmailAccounts: 25,
          maxDatabases: 10,
          maxFtpAccounts: 10,
        },
      },
      {
        id: "vps_starter",
        name: "VPS Starter",
        type: "vps",
        price: 19.99,
        billingPeriod: "monthly",
        features: {
          ram: "1GB",
          cpu: "1 Core",
          diskSpace: "20GB SSD",
          bandwidth: "Unlimited",
          domains: "Unlimited",
          ssl: true,
          backup: true,
          support: "priority",
          rootAccess: true,
        },
        limits: {
          ramMB: 1024,
          cpuCores: 1,
          diskSpaceMB: 20480,
          bandwidthMB: -1, // Unlimited
          maxDomains: -1,
          maxSubdomains: -1,
          maxEmailAccounts: -1,
          maxDatabases: -1,
          maxFtpAccounts: -1,
        },
      },
      {
        id: "dedicated_basic",
        name: "Dedicated Basic",
        type: "dedicated",
        price: 99.99,
        billingPeriod: "monthly",
        features: {
          ram: "8GB",
          cpu: "4 Cores",
          diskSpace: "500GB SSD",
          bandwidth: "Unlimited",
          domains: "Unlimited",
          ssl: true,
          backup: true,
          support: "24/7",
          rootAccess: true,
          managedService: true,
        },
        limits: {
          ramMB: 8192,
          cpuCores: 4,
          diskSpaceMB: 512000,
          bandwidthMB: -1,
          maxDomains: -1,
          maxSubdomains: -1,
          maxEmailAccounts: -1,
          maxDatabases: -1,
          maxFtpAccounts: -1,
        },
      },
    ];
  }

  async initializeBillingDatabase() {
    const schema = `
      -- Billing and subscription tables
      CREATE TABLE IF NOT EXISTS billing_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_type VARCHAR(50) DEFAULT 'individual',
        company_name VARCHAR(255),
        tax_id VARCHAR(100),
        billing_address TEXT,
        payment_method VARCHAR(50),
        payment_gateway VARCHAR(50),
        gateway_customer_id VARCHAR(255),
        currency VARCHAR(3) DEFAULT 'USD',
        credit_balance DECIMAL(10,2) DEFAULT 0.00,
        auto_pay BOOLEAN DEFAULT 1,
        billing_day INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        current_period_start DATE,
        current_period_end DATE,
        trial_end DATE,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        billing_period VARCHAR(20) DEFAULT 'monthly',
        auto_renew BOOLEAN DEFAULT 1,
        gateway_subscription_id VARCHAR(255),
        payment_gateway VARCHAR(50),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        subscription_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        due_date DATE,
        paid_at DATETIME,
        payment_method VARCHAR(50),
        payment_gateway VARCHAR(50),
        gateway_payment_id VARCHAR(255),
        description TEXT,
        invoice_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        period_start DATE,
        period_end DATE,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        invoice_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_gateway VARCHAR(50),
        gateway_payment_id VARCHAR(255),
        gateway_response TEXT,
        metadata TEXT,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      );

      CREATE TABLE IF NOT EXISTS billing_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2),
        currency VARCHAR(3),
        description TEXT,
        reference_id VARCHAR(255),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS usage_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        usage_amount DECIMAL(15,6) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        cost DECIMAL(10,2),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date, status);
      CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments (payment_gateway, gateway_payment_id);
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking (user_id, period_start, period_end);
    `;

    try {
      const db = require("../config/database");
      await db.exec(schema);
      logger.info("Billing database schema initialized");
    } catch (error) {
      logger.error("Error initializing billing database:", error);
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(userId, planId, options = {}) {
    try {
      const plan = this.hostingPlans.find((p) => p.id === planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const billingAccount = await this.getBillingAccount(userId);
      const paymentGateway =
        options.paymentGateway || billingAccount?.payment_gateway || "stripe";

      // Calculate period dates
      const startDate = new Date(options.startDate || Date.now());
      const endDate = this.calculatePeriodEnd(startDate, plan.billingPeriod);

      // Create subscription in database
      const db = require("../config/database");
      const subscriptionData = {
        user_id: userId,
        plan_id: planId,
        status: options.trialDays ? "trialing" : "active",
        current_period_start: startDate.toISOString().split("T")[0],
        current_period_end: endDate.toISOString().split("T")[0],
        trial_end: options.trialDays
          ? this.addDays(startDate, options.trialDays)
              .toISOString()
              .split("T")[0]
          : null,
        price: plan.price,
        currency: options.currency || this.billingConfig.currency,
        billing_period: plan.billingPeriod,
        auto_renew: options.autoRenew !== false,
        payment_gateway: paymentGateway,
        metadata: JSON.stringify(options.metadata || {}),
      };

      const result = await db.run(
        `
        INSERT INTO subscriptions (${Object.keys(subscriptionData).join(", ")})
        VALUES (${Object.keys(subscriptionData)
          .map(() => "?")
          .join(", ")})
      `,
        Object.values(subscriptionData)
      );

      const subscriptionId = result.lastID;

      // Create gateway subscription if not trial
      let gatewaySubscriptionId = null;
      if (!options.trialDays && paymentGateway) {
        try {
          gatewaySubscriptionId = await this.createGatewaySubscription(
            userId,
            plan,
            paymentGateway,
            options
          );

          await db.run(
            "UPDATE subscriptions SET gateway_subscription_id = ? WHERE id = ?",
            [gatewaySubscriptionId, subscriptionId]
          );
        } catch (error) {
          logger.error("Error creating gateway subscription:", error);
          // Continue with local subscription, but mark for manual review
        }
      }

      // Generate first invoice if not trial
      if (!options.trialDays) {
        await this.generateInvoice(subscriptionId, {
          description: `${plan.name} - ${plan.billingPeriod} subscription`,
          amount: plan.price,
          dueDate: startDate,
        });
      }

      // Log billing history
      await this.logBillingEvent(userId, "subscription_created", plan.price, {
        plan_id: planId,
        subscription_id: subscriptionId,
        payment_gateway: paymentGateway,
      });

      logger.info(`Subscription created: ${subscriptionId} for user ${userId}`);
      return {
        success: true,
        subscriptionId: subscriptionId,
        plan: plan,
        gatewaySubscriptionId: gatewaySubscriptionId,
      };
    } catch (error) {
      logger.error("Error creating subscription:", error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId, options = {}) {
    try {
      const db = require("../config/database");

      // Get subscription details
      const subscription = await db.get(
        "SELECT * FROM subscriptions WHERE id = ?",
        [subscriptionId]
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Cancel at gateway if exists
      if (subscription.gateway_subscription_id) {
        try {
          await this.cancelGatewaySubscription(
            subscription.gateway_subscription_id,
            subscription.payment_gateway,
            options
          );
        } catch (error) {
          logger.error("Error canceling gateway subscription:", error);
        }
      }

      // Update subscription status
      const cancelAt = options.immediate
        ? new Date()
        : new Date(subscription.current_period_end);
      const status = options.immediate ? "canceled" : "cancel_at_period_end";

      await db.run(
        `
        UPDATE subscriptions 
        SET status = ?, auto_renew = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [status, subscriptionId]
      );

      // Log billing history
      await this.logBillingEvent(
        subscription.user_id,
        "subscription_canceled",
        0,
        {
          subscription_id: subscriptionId,
          immediate: options.immediate,
          reason: options.reason,
        }
      );

      logger.info(`Subscription canceled: ${subscriptionId}`);
      return {
        success: true,
        subscriptionId: subscriptionId,
        cancelAt: cancelAt,
        immediate: options.immediate,
      };
    } catch (error) {
      logger.error("Error canceling subscription:", error);
      throw error;
    }
  }

  async updateSubscription(subscriptionId, updates) {
    try {
      const db = require("../config/database");

      const subscription = await db.get(
        "SELECT * FROM subscriptions WHERE id = ?",
        [subscriptionId]
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Plan change
      if (updates.planId && updates.planId !== subscription.plan_id) {
        return await this.changeSubscriptionPlan(
          subscriptionId,
          updates.planId,
          updates
        );
      }

      // Regular updates
      const allowedUpdates = ["auto_renew", "payment_gateway", "metadata"];
      const updateFields = Object.keys(updates)
        .filter((key) => allowedUpdates.includes(key))
        .map((key) => `${key} = ?`)
        .join(", ");

      if (updateFields) {
        const updateValues = Object.keys(updates)
          .filter((key) => allowedUpdates.includes(key))
          .map((key) =>
            key === "metadata" ? JSON.stringify(updates[key]) : updates[key]
          );

        await db.run(
          `
          UPDATE subscriptions 
          SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
          [...updateValues, subscriptionId]
        );
      }

      logger.info(`Subscription updated: ${subscriptionId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error updating subscription:", error);
      throw error;
    }
  }

  // Invoice Management
  async generateInvoice(subscriptionId, options = {}) {
    try {
      const db = require("../config/database");

      // Get subscription details
      const subscription = await db.get(
        `
        SELECT s.*, u.email, u.name 
        FROM subscriptions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.id = ?
      `,
        [subscriptionId]
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      const plan = this.hostingPlans.find((p) => p.id === subscription.plan_id);
      const invoiceNumber = this.generateInvoiceNumber();

      // Calculate amounts
      const amount = options.amount || subscription.price;
      const taxAmount = this.calculateTax(amount, subscription.user_id);
      const totalAmount = amount + taxAmount;

      // Create invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        user_id: subscription.user_id,
        subscription_id: subscriptionId,
        amount: amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: subscription.currency,
        status: "pending",
        due_date: options.dueDate
          ? new Date(options.dueDate).toISOString().split("T")[0]
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
        description:
          options.description ||
          `${plan?.name || "Subscription"} - ${subscription.billing_period}`,
        invoice_data: JSON.stringify({
          plan: plan,
          period: {
            start: subscription.current_period_start,
            end: subscription.current_period_end,
          },
          customer: {
            name: subscription.name,
            email: subscription.email,
          },
        }),
      };

      const result = await db.run(
        `
        INSERT INTO invoices (${Object.keys(invoiceData).join(", ")})
        VALUES (${Object.keys(invoiceData)
          .map(() => "?")
          .join(", ")})
      `,
        Object.values(invoiceData)
      );

      const invoiceId = result.lastID;

      // Add invoice items
      if (options.items) {
        for (const item of options.items) {
          await db.run(
            `
            INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, period_start, period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
            [
              invoiceId,
              item.description,
              item.quantity || 1,
              item.unitPrice,
              (item.quantity || 1) * item.unitPrice,
              item.periodStart,
              item.periodEnd,
            ]
          );
        }
      } else {
        // Default subscription item
        await db.run(
          `
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, period_start, period_end)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            invoiceId,
            invoiceData.description,
            1,
            amount,
            amount,
            subscription.current_period_start,
            subscription.current_period_end,
          ]
        );
      }

      // Auto-charge if enabled
      if (subscription.auto_pay && options.autoCharge !== false) {
        try {
          await this.chargeInvoice(invoiceId);
        } catch (error) {
          logger.warn(
            `Auto-charge failed for invoice ${invoiceId}:`,
            error.message
          );
        }
      }

      logger.info(
        `Invoice generated: ${invoiceNumber} for subscription ${subscriptionId}`
      );
      return {
        success: true,
        invoiceId: invoiceId,
        invoiceNumber: invoiceNumber,
        totalAmount: totalAmount,
      };
    } catch (error) {
      logger.error("Error generating invoice:", error);
      throw error;
    }
  }

  async chargeInvoice(invoiceId) {
    try {
      const db = require("../config/database");

      // Get invoice and billing account details
      const invoice = await db.get(
        `
        SELECT i.*, b.payment_gateway, b.gateway_customer_id, b.payment_method
        FROM invoices i
        LEFT JOIN billing_accounts b ON i.user_id = b.user_id
        WHERE i.id = ?
      `,
        [invoiceId]
      );

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status !== "pending") {
        throw new Error(`Invoice ${invoice.invoice_number} is not pending`);
      }

      if (!invoice.payment_gateway || !invoice.gateway_customer_id) {
        throw new Error("No payment method configured for customer");
      }

      // Process payment through gateway
      const paymentResult = await this.processGatewayPayment(
        invoice.payment_gateway,
        {
          amount: invoice.total_amount,
          currency: invoice.currency,
          customerId: invoice.gateway_customer_id,
          invoiceId: invoiceId,
          description: `Payment for invoice ${invoice.invoice_number}`,
        }
      );

      if (paymentResult.success) {
        // Update invoice status
        await db.run(
          `
          UPDATE invoices 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP, 
              payment_gateway = ?, gateway_payment_id = ?
          WHERE id = ?
        `,
          [invoice.payment_gateway, paymentResult.paymentId, invoiceId]
        );

        // Create payment record
        await this.createPaymentRecord({
          userId: invoice.user_id,
          invoiceId: invoiceId,
          amount: invoice.total_amount,
          currency: invoice.currency,
          paymentGateway: invoice.payment_gateway,
          gatewayPaymentId: paymentResult.paymentId,
          status: "completed",
        });

        // Log billing history
        await this.logBillingEvent(
          invoice.user_id,
          "payment_completed",
          invoice.total_amount,
          {
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
            payment_gateway: invoice.payment_gateway,
          }
        );

        logger.info(`Invoice charged successfully: ${invoice.invoice_number}`);
        return {
          success: true,
          paymentId: paymentResult.paymentId,
          amount: invoice.total_amount,
        };
      } else {
        throw new Error(paymentResult.error || "Payment failed");
      }
    } catch (error) {
      logger.error("Error charging invoice:", error);
      throw error;
    }
  }

  // Payment Gateway Integration
  async loadPaymentGateways() {
    // Initialize enabled payment gateways
    for (const [gateway, config] of Object.entries(this.paymentGateways)) {
      if (config.enabled) {
        try {
          await this.initializeGateway(gateway, config);
          logger.info(`Payment gateway initialized: ${gateway}`);
        } catch (error) {
          logger.error(`Failed to initialize ${gateway}:`, error);
          config.enabled = false;
        }
      }
    }
  }

  async initializeGateway(gateway, config) {
    switch (gateway) {
      case "stripe":
        if (!config.secretKey) {
          throw new Error("Stripe secret key not configured");
        }
        // Would initialize Stripe SDK here
        break;

      case "paypal":
        if (!config.clientId || !config.clientSecret) {
          throw new Error("PayPal credentials not configured");
        }
        // Would initialize PayPal SDK here
        break;

      case "paddle":
        if (!config.vendorId || !config.vendorAuthCode) {
          throw new Error("Paddle credentials not configured");
        }
        // Would initialize Paddle SDK here
        break;
    }
  }

  async processGatewayPayment(gateway, paymentData) {
    try {
      switch (gateway) {
        case "stripe":
          return await this.processStripePayment(paymentData);
        case "paypal":
          return await this.processPayPalPayment(paymentData);
        case "paddle":
          return await this.processPaddlePayment(paymentData);
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      logger.error(`Payment processing failed for ${gateway}:`, error);
      return { success: false, error: error.message };
    }
  }

  async processStripePayment(paymentData) {
    try {
      // In production, would use actual Stripe SDK
      // For now, validate payment data and create database record
      logger.info("Processing Stripe payment", { amount: paymentData.amount });

      if (!paymentData.amount || paymentData.amount <= 0) {
        return {
          success: false,
          error: "Invalid payment amount",
        };
      }

      // Create payment record in database
      const paymentRecord = await queryHelpers.safeInsert("payments", {
        user_id: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        gateway: "stripe",
        status: "processing",
        payment_method: paymentData.paymentMethod || "card",
        created_at: new Date().toISOString(),
      });

      // In production, this would call Stripe API
      // For development, we'll mark as completed
      const paymentId = `pi_${Date.now()}_${paymentRecord.insertId}`;

      await queryHelpers.safeUpdate(
        "payments",
        {
          payment_id: paymentId,
          status: "completed",
          updated_at: new Date().toISOString(),
        },
        {
          where: { id: paymentRecord.insertId },
        }
      );

      return {
        success: true,
        paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
      };
    } catch (error) {
      logger.error("Stripe payment processing failed:", error);
      return {
        success: false,
        error: error.message || "Payment processing failed",
      };
    }
  }

  // Billing Account Management
  async getBillingAccount(userId) {
    try {
      const db = require("../config/database");
      return await db.get("SELECT * FROM billing_accounts WHERE user_id = ?", [
        userId,
      ]);
    } catch (error) {
      logger.error("Error getting billing account:", error);
      return null;
    }
  }

  async createBillingAccount(userId, accountData) {
    try {
      const db = require("../config/database");

      const billingAccountData = {
        user_id: userId,
        account_type: accountData.accountType || "individual",
        company_name: accountData.companyName,
        tax_id: accountData.taxId,
        billing_address: JSON.stringify(accountData.billingAddress),
        payment_method: accountData.paymentMethod,
        payment_gateway: accountData.paymentGateway,
        gateway_customer_id: accountData.gatewayCustomerId,
        currency: accountData.currency || this.billingConfig.currency,
        auto_pay: accountData.autoPay !== false,
        billing_day: accountData.billingDay || 1,
      };

      const result = await db.run(
        `
        INSERT INTO billing_accounts (${Object.keys(billingAccountData).join(
          ", "
        )})
        VALUES (${Object.keys(billingAccountData)
          .map(() => "?")
          .join(", ")})
      `,
        Object.values(billingAccountData)
      );

      logger.info(`Billing account created for user ${userId}`);
      return {
        success: true,
        billingAccountId: result.lastID,
      };
    } catch (error) {
      logger.error("Error creating billing account:", error);
      throw error;
    }
  }

  // Usage Tracking
  async trackUsage(userId, resourceType, amount, unit, options = {}) {
    try {
      const db = require("../config/database");

      const period = this.getCurrentBillingPeriod(options.periodStart);
      const cost = this.calculateUsageCost(resourceType, amount, unit);

      await db.run(
        `
        INSERT INTO usage_tracking (user_id, resource_type, usage_amount, unit, period_start, period_end, cost, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          resourceType,
          amount,
          unit,
          period.start,
          period.end,
          cost,
          JSON.stringify(options.metadata || {}),
        ]
      );

      logger.debug(
        `Usage tracked: ${resourceType} ${amount}${unit} for user ${userId}`
      );
      return { success: true, cost: cost };
    } catch (error) {
      logger.error("Error tracking usage:", error);
      throw error;
    }
  }

  async getUsageReport(userId, periodStart, periodEnd) {
    try {
      const db = require("../config/database");

      const usage = await db.all(
        `
        SELECT resource_type, SUM(usage_amount) as total_usage, unit, SUM(cost) as total_cost
        FROM usage_tracking
        WHERE user_id = ? AND period_start >= ? AND period_end <= ?
        GROUP BY resource_type, unit
        ORDER BY total_cost DESC
      `,
        [userId, periodStart, periodEnd]
      );

      const totalCost = usage.reduce(
        (sum, item) => sum + (item.total_cost || 0),
        0
      );

      return {
        success: true,
        period: { start: periodStart, end: periodEnd },
        usage: usage,
        totalCost: totalCost,
      };
    } catch (error) {
      logger.error("Error getting usage report:", error);
      throw error;
    }
  }

  // Recurring Tasks
  async scheduleRecurringTasks() {
    // Schedule daily billing tasks
    setInterval(async () => {
      try {
        await this.processDailyBilling();
      } catch (error) {
        logger.error("Error in daily billing processing:", error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    logger.info("Billing recurring tasks scheduled");
  }

  async processDailyBilling() {
    const today = new Date().toISOString().split("T")[0];

    // Process subscription renewals
    await this.processSubscriptionRenewals(today);

    // Process overdue invoices
    await this.processOverdueInvoices(today);

    // Suspend accounts
    await this.processSuspensions(today);

    // Send billing notifications
    await this.sendBillingNotifications(today);

    logger.info("Daily billing processing completed");
  }

  async processSubscriptionRenewals(date) {
    try {
      const db = require("../config/database");

      // Find subscriptions ending today
      const renewals = await db.all(
        `
        SELECT * FROM subscriptions 
        WHERE current_period_end = ? AND status = 'active' AND auto_renew = 1
      `,
        [date]
      );

      for (const subscription of renewals) {
        try {
          await this.renewSubscription(subscription.id);
          logger.info(`Subscription renewed: ${subscription.id}`);
        } catch (error) {
          logger.error(
            `Failed to renew subscription ${subscription.id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error("Error processing subscription renewals:", error);
    }
  }

  // Utility Methods
  generateInvoiceNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${this.billingConfig.invoicePrefix}-${timestamp}-${random}`;
  }

  calculatePeriodEnd(startDate, billingPeriod) {
    const end = new Date(startDate);

    switch (billingPeriod) {
      case "weekly":
        end.setDate(end.getDate() + 7);
        break;
      case "monthly":
        end.setMonth(end.getMonth() + 1);
        break;
      case "quarterly":
        end.setMonth(end.getMonth() + 3);
        break;
      case "yearly":
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }

    return end;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  calculateTax(amount, userId) {
    // Simple tax calculation - in production, would be more sophisticated
    return amount * this.billingConfig.taxRate;
  }

  getCurrentBillingPeriod(startDate) {
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1); // First day of month
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // Last day of month
    end.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }

  calculateUsageCost(resourceType, amount, unit) {
    const rates = {
      bandwidth: 0.01, // per GB
      storage: 0.005, // per GB
      email: 0.001, // per email
      cpu: 0.02, // per hour
    };

    return (rates[resourceType] || 0) * amount;
  }

  async logBillingEvent(userId, eventType, amount, metadata = {}) {
    try {
      const db = require("../config/database");

      await db.run(
        `
        INSERT INTO billing_history (user_id, event_type, amount, currency, description, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          eventType,
          amount,
          this.billingConfig.currency,
          metadata.description || eventType.replace("_", " "),
          JSON.stringify(metadata),
        ]
      );
    } catch (error) {
      logger.error("Error logging billing event:", error);
    }
  }

  async createPaymentRecord(paymentData) {
    try {
      const db = require("../config/database");

      const paymentId = `pay_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}`;

      await db.run(
        `
        INSERT INTO payments (payment_id, user_id, invoice_id, amount, currency, status, 
                            payment_method, payment_gateway, gateway_payment_id, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
        [
          paymentId,
          paymentData.userId,
          paymentData.invoiceId,
          paymentData.amount,
          paymentData.currency,
          paymentData.status,
          paymentData.paymentMethod,
          paymentData.paymentGateway,
          paymentData.gatewayPaymentId,
        ]
      );

      return { success: true, paymentId: paymentId };
    } catch (error) {
      logger.error("Error creating payment record:", error);
      throw error;
    }
  }

  // Cleanup
  async cleanup() {
    try {
      logger.info("Billing service cleanup completed");
    } catch (error) {
      logger.error("Error during billing service cleanup:", error);
    }
  }
}

module.exports = new BillingService();

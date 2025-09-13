// Database Service - SQLite Implementation
// server/services/databaseService.js

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs").promises;
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");

class DatabaseService {
  constructor() {
    this.dbPath =
      process.env.DATABASE_PATH || path.join(__dirname, "../../data/kpanel.db");
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      return new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error("Failed to connect to database:", err);
            reject(err);
          } else {
            logger.info("Connected to SQLite database");
            this.isConnected = true;
            this.db.run("PRAGMA foreign_keys = ON");
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error("Database initialization failed:", error);
      throw error;
    }
  }

  /**
   * Run database migrations/setup
   */
  async runMigrations() {
    try {
      const schemaPath = path.join(__dirname, "../../database/schema.sql");
      const schema = await fs.readFile(schemaPath, "utf8");

      return new Promise((resolve, reject) => {
        // Split the schema into individual statements
        const statements = schema
          .split(";")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

        const executeNext = (index) => {
          if (index >= statements.length) {
            logger.info("Database migrations completed successfully");
            resolve();
            return;
          }

          const statement = statements[index] + ";";
          if (statement.trim().length <= 1) {
            executeNext(index + 1);
            return;
          }

          const isIndexStatement = statement.includes("CREATE INDEX");

          this.db.run(statement, (err) => {
            if (err) {
              // For index statements, log but don't fail completely
              if (isIndexStatement) {
                logger.warn(
                  `Warning: Failed to create index ${index + 1}: ${err.message}`
                );
                executeNext(index + 1);
              } else {
                logger.error(`Failed to execute statement ${index + 1}:`, err);
                logger.error(`Statement: ${statement}`);
                reject(err);
              }
            } else {
              logger.info(`Statement ${index + 1} executed successfully`);
              executeNext(index + 1);
            }
          });
        };

        executeNext(0);
      });
    } catch (error) {
      logger.error("Migration execution failed:", error);
      throw error;
    }
  }

  /**
   * Create default admin user
   */
  async createAdminUser(email, password, name = "Administrator") {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      return new Promise((resolve, reject) => {
        const query = `
                    INSERT OR REPLACE INTO users (email, password, name, role, email_verified)
                    VALUES (?, ?, ?, 'admin', 1)
                `;

        this.db.run(query, [email, hashedPassword, name], function (err) {
          if (err) {
            logger.error("Failed to create admin user:", err);
            reject(err);
          } else {
            logger.info(`Admin user created/updated: ${email}`);
            resolve({ id: this.lastID, email, name });
          }
        });
      });
    } catch (error) {
      logger.error("Admin user creation failed:", error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE email = ?";

      this.db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE id = ?";

      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      const { email, password, name, role = "customer" } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);

      return new Promise((resolve, reject) => {
        const query = `
                    INSERT INTO users (email, password, name, role)
                    VALUES (?, ?, ?, ?)
                `;

        this.db.run(query, [email, hashedPassword, name, role], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              email,
              name,
              role,
            });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute raw query
   */
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Execute single row query
   */
  async queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Get/Set system settings
   */
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT setting_value, setting_type FROM settings WHERE setting_key = ?";

      this.db.get(query, [key], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          let value = row.setting_value;

          // Parse value based on type
          switch (row.setting_type) {
            case "number":
              value = parseFloat(value);
              break;
            case "boolean":
              value = value === "true";
              break;
            case "json":
              try {
                value = JSON.parse(value);
              } catch (e) {
                value = null;
              }
              break;
          }

          resolve(value);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db && this.isConnected) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error("Error closing database:", err);
          } else {
            logger.info("Database connection closed");
          }
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
}

module.exports = DatabaseService;

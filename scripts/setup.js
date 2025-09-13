#!/usr/bin/env node

/**
 * KPanel Database Setup Script
 * Initializes SQLite database and creates default admin user
 */

const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const { promisify } = require("util");

// Promisify database methods
const dbRun = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function setupDatabase() {
  console.log("🗄️  Setting up KPanel database...");

  // Deteksi otomatis IP publik VPS untuk akses panel
  let publicIP = "localhost";
  try {
    const { execSync } = require("child_process");
    publicIP = execSync("curl -s ifconfig.me", { timeout: 3000 })
      .toString()
      .trim();
    if (!publicIP || publicIP === "") {
      const os = require("os");
      const interfaces = os.networkInterfaces();
      if (interfaces.eth0) {
        for (const iface of interfaces.eth0) {
          if (iface.family === "IPv4" && !iface.internal) {
            publicIP = iface.address;
            break;
          }
        }
      }
    }
  } catch (e) {
    publicIP = "localhost";
  }

  // Ensure data directory exists
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("✅ Created data directory");
  }

  const dbPath = path.join(dataDir, "kpanel.db");

  // Remove existing database if it exists (with better error handling)
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log("🔄 Removed existing database");
    } catch (error) {
      if (error.code === "EACCES") {
        console.log(
          "⚠️  Database file is locked, trying to close connections..."
        );
        // Try to wait a moment for connections to close
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          fs.unlinkSync(dbPath);
          console.log("🔄 Removed existing database (after retry)");
        } catch (retryError) {
          console.log(
            "⚠️  Could not remove existing database, will overwrite instead"
          );
        }
      } else {
        console.log(
          `⚠️  Could not remove database (${error.code}), continuing with existing file`
        );
      }
    }
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");

    let schema;
    if (fs.existsSync(schemaPath)) {
      schema = fs.readFileSync(schemaPath, "utf8");
    } else {
      // Fallback schema if file doesn't exist
      schema = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) DEFAULT 'Admin User',
          role VARCHAR(50) DEFAULT 'admin',
          status VARCHAR(20) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME NULL,
          two_factor_enabled BOOLEAN DEFAULT FALSE,
          email_verified BOOLEAN DEFAULT TRUE
        );

        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_name VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER,
          document_root VARCHAR(500),
          status VARCHAR(20) DEFAULT 'active',
          ssl_enabled BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS databases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          database_name VARCHAR(255) NOT NULL,
          user_id INTEGER,
          db_user VARCHAR(255),
          db_password VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key VARCHAR(255) UNIQUE NOT NULL,
          setting_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;
    }

    // Split and execute schema statements
    const statements = schema
      .split(";")
      .filter((stmt) => stmt.trim())
      .map((stmt) => stmt.trim() + ";");

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() && statement.trim() !== ";") {
        try {
          await dbRun(db, statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (err) {
          console.log(
            `⚠️ Statement ${i + 1} error:`,
            statement.substring(0, 100)
          );
          throw err;
        }
      }
    }

    console.log("✅ Database schema created");

    // Check what tables were created
    const tables = await dbRun(
      db,
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log("📋 Tables in database:", tables);

    // Create admin user first
    const adminEmail = process.env.ADMIN_EMAIL || "admin@kpanel.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    await dbRun(
      db,
      `
      INSERT INTO users (email, password, name, role, status, email_verified)
      VALUES (?, ?, 'Admin User', 'admin', 'active', 1)
    `,
      [adminEmail, hashedPassword]
    );

    console.log("✅ Admin user created");
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);

    // Create system_settings table manually if it doesn't exist
    await dbRun(
      db,
      `
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    console.log("✅ System settings table verified");

    // Insert default system settings
    const defaultSettings = [
      { key: "server_name", value: "KPanel Server" },
      { key: "admin_email", value: adminEmail },
      { key: "max_domains", value: "100" },
      { key: "max_databases", value: "50" },
      { key: "max_email_accounts", value: "200" },
      { key: "backup_enabled", value: "true" },
      { key: "monitoring_enabled", value: "true" },
      { key: "ssl_enabled", value: "true" },
      { key: "version", value: "2.0.0" },
      { key: "installation_date", value: new Date().toISOString() },
    ];

    for (const setting of defaultSettings) {
      await dbRun(
        db,
        `
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES (?, ?)
      `,
        [setting.key, setting.value]
      );
    }

    console.log("✅ System settings configured");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }

  console.log("🎉 Database setup completed successfully!");
  console.log("");
  console.log("🔧 Next steps:");
  console.log("   1. Run: npm start");
  console.log(`   2. Access: http://${publicIP}:3002`);
  console.log("   3. Login: admin@kpanel.com / admin123");
  console.log("");
  console.log("⚠️  Remember to change the admin password after first login!");
}

// Run setup
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase;

require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcrypt");

async function setupDatabase() {
  const dbPath = path.join(__dirname, "data", "kpanel.db");
  const schemaPath = path.join(__dirname, "database", "schema.sql");

  try {
    // Read the schema file
    const schema = await fs.readFile(schemaPath, "utf8");

    // Create database connection
    const db = new sqlite3.Database(dbPath);

    console.log("📊 Setting up database...");

    // Execute the schema
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) {
          console.error("Schema execution error:", err);
          reject(err);
        } else {
          console.log("✅ Schema created successfully");
          resolve();
        }
      });
    });

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminEmail = "admin@kpanel.com";
    const adminPassword = "admin123";
    const adminName = "Administrator";

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await new Promise((resolve, reject) => {
      const query = `INSERT OR REPLACE INTO users (email, password, name, role, email_verified) VALUES (?, ?, ?, 'admin', 1)`;

      db.run(query, [adminEmail, hashedPassword, adminName], function (err) {
        if (err) {
          reject(err);
        } else {
          console.log("✅ Admin user created");
          resolve();
        }
      });
    });

    // Test the setup
    await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE role = "admin"', (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          console.log("✅ Database setup verified");
          console.log("📧 Admin email:", row.email);
          resolve();
        } else {
          reject(new Error("Admin user not found"));
        }
      });
    });

    db.close();

    console.log("\n🎉 KPanel database setup completed successfully!");
    console.log("📧 Admin Email: admin@kpanel.com");
    console.log("🔐 Admin Password: admin123");
    console.log("🚀 You can now start the server with: npm start");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

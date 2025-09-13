require("dotenv").config();
const DatabaseService = require("./server/services/databaseService");
const bcrypt = require("bcrypt");

async function setupAdmin() {
  const db = new DatabaseService();

  try {
    await db.initialize();
    console.log("Database connected");

    // Check if users table exists and has data
    const users = await new Promise((resolve, reject) => {
      db.db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
          console.log("Users table may not exist:", err.message);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    });

    console.log("Existing users:", users.length);

    if (users.length === 0) {
      // Create admin user
      const adminEmail = "admin@kpanel.com";
      const adminPassword = "admin123";
      const adminName = "Administrator";

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await new Promise((resolve, reject) => {
        const query = `
          INSERT OR REPLACE INTO users (email, password, name, role, email_verified)
          VALUES (?, ?, ?, 'admin', 1)
        `;

        db.db.run(
          query,
          [adminEmail, hashedPassword, adminName],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      console.log("✅ Admin user created successfully");
      console.log("📧 Email: admin@kpanel.com");
      console.log("🔐 Password: admin123");
    } else {
      console.log("✅ Admin user already exists");
    }

    // Create basic settings
    await new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO settings (setting_key, setting_value, setting_type, category)
        VALUES 
        ('system_name', 'KPanel', 'string', 'general'),
        ('system_version', '2.0.0', 'string', 'general'),
        ('admin_email', 'admin@kpanel.com', 'string', 'general'),
        ('jwt_secret', '${
          process.env.JWT_SECRET || "your-very-long-jwt-secret-key-here"
        }', 'string', 'security')
      `;

      db.db.exec(query, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("✅ System settings configured");
    console.log("🎉 KPanel setup completed successfully!");
    console.log("🌐 You can now start the server with: npm start");
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    if (db.db) {
      db.db.close();
    }
  }
}

setupAdmin();

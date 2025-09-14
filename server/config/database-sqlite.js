const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Ensure data directory exists
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite database path
const dbPath = path.join(dataDir, "kpanel.db");

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// Initialize database schema
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(50) DEFAULT 'basic',
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Domains table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'addon',
        document_root VARCHAR(500),
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(name)
      )
    `);

    // Email accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        quota INTEGER DEFAULT 1024,
        used_quota INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        FOREIGN KEY (domain_id) REFERENCES user_domains (id)
      )
    `);

    // Databases table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_databases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'mysql',
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Database users table
    db.run(`
      CREATE TABLE IF NOT EXISTS database_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_id INTEGER NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        privileges TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (database_id) REFERENCES user_databases (id)
      )
    `);

    // Create default admin user if not exists
    db.get("SELECT id FROM users WHERE email = ?", ["admin@kpanel.com"], (err, row) => {
      if (err) {
        console.error("Error checking admin user:", err);
        return;
      }
      
      if (!row) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = bcrypt.hashSync("admin123", 10);
        
        db.run(
          "INSERT INTO users (email, username, password_hash, plan) VALUES (?, ?, ?, ?)",
          ["admin@kpanel.com", "admin", hashedPassword, "enterprise"],
          (err) => {
            if (err) {
              console.error("Error creating admin user:", err);
            } else {
              console.log("✅ Default admin user created");
            }
          }
        );
      }
    });

    resolve();
  });
};

// Query helpers
const queryHelpers = {
  safeSelect: (table, options = {}) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM ${table}`;
      const params = [];

      if (options.where) {
        const whereClause = Object.keys(options.where)
          .map(key => `${key} = ?`)
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(options.where));
      }

      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve([rows || []]);
        }
      });
    });
  },

  safeInsert: (table, data) => {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => "?").join(", ");
      const query = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
      
      db.run(query, Object.values(data), function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        }
      });
    });
  },

  safeUpdate: (table, data, where) => {
    return new Promise((resolve, reject) => {
      const setClause = Object.keys(data)
        .map(key => `${key} = ?`)
        .join(", ");
      const whereClause = Object.keys(where)
        .map(key => `${key} = ?`)
        .join(" AND ");
      
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      const params = [...Object.values(data), ...Object.values(where)];
      
      db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ affectedRows: this.changes });
        }
      });
    });
  },

  safeDelete: (table, where) => {
    return new Promise((resolve, reject) => {
      const whereClause = Object.keys(where)
        .map(key => `${key} = ?`)
        .join(" AND ");
      
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      
      db.run(query, Object.values(where), function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ affectedRows: this.changes });
        }
      });
    });
  }
};

// Initialize database on module load
initializeDatabase().catch(console.error);

module.exports = {
  db,
  queryHelpers,
  initializeDatabase
};
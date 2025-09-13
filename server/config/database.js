const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const { logger } = require("../utils/logger");

// Validate required environment variables
const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error("Missing required database environment variables", {
    missingVars,
  });
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}

// Database configuration with enhanced security and performance
const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  charset: "utf8mb4",
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  timezone: "Z",
};

const pool = mysql.createPool(config);

// Enhanced connection testing with retry logic and detailed logging
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      logger.info("Database connection test successful", {
        host: config.host,
        database: config.database,
        attempt: i + 1,
      });
      return true;
    } catch (error) {
      logger.warn(`Database connection attempt ${i + 1} failed`, {
        error: error.message,
        host: config.host,
        database: config.database,
        attempt: i + 1,
        maxAttempts: retries,
      });

      if (i === retries - 1) {
        logger.error("All database connection attempts failed", {
          error: error.message,
          host: config.host,
          database: config.database,
          totalAttempts: retries,
        });
        throw new Error(
          `Database connection failed after ${retries} attempts: ${error.message}`
        );
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  return false;
};

// Health check function for monitoring
const healthCheck = async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT 1 as healthy");
    connection.release();

    const stats = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      connections: {
        active: pool._allConnections.length,
        free: pool._freeConnections.length,
        limit: config.connectionLimit,
      },
      test_query: rows[0].healthy === 1,
    };

    return stats;
  } catch (error) {
    logger.error("Database health check failed", { error: error.message });
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
};

// Enhanced query execution with logging and monitoring
const executeQuery = async (query, params = [], options = {}) => {
  const startTime = Date.now();
  const queryId = Math.random().toString(36).substr(2, 9);

  logger.debug("Executing database query", {
    queryId,
    query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
    paramCount: params.length,
  });

  try {
    const [results] = await pool.execute(query, params);
    const duration = Date.now() - startTime;

    logger.debug("Query executed successfully", {
      queryId,
      duration,
      resultCount: Array.isArray(results) ? results.length : 1,
    });

    return results;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("Query execution failed", {
      queryId,
      duration,
      error: error.message,
      sqlState: error.sqlState,
      errno: error.errno,
      query: query.substring(0, 200),
    });

    throw error;
  }
};

// Transaction wrapper with automatic rollback
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  const transactionId = Math.random().toString(36).substr(2, 9);

  logger.debug("Starting database transaction", {
    transactionId,
    queryCount: queries.length,
  });

  try {
    await connection.beginTransaction();

    const results = [];
    for (let i = 0; i < queries.length; i++) {
      const { query, params = [] } = queries[i];
      const [result] = await connection.execute(query, params);
      results.push(result);
    }

    await connection.commit();

    logger.info("Transaction completed successfully", {
      transactionId,
      queryCount: queries.length,
    });

    return results;
  } catch (error) {
    await connection.rollback();

    logger.error("Transaction failed and rolled back", {
      transactionId,
      error: error.message,
      sqlState: error.sqlState,
      errno: error.errno,
    });

    throw error;
  } finally {
    connection.release();
  }
};

// Schema initialization and migration
const initializeSchema = async () => {
  try {
    const schemaPath = path.join(
      __dirname,
      "..",
      "database",
      "schema_production.sql"
    );

    if (!fs.existsSync(schemaPath)) {
      logger.warn("Production schema file not found, skipping initialization", {
        schemaPath,
      });
      return false;
    }

    const schema = fs.readFileSync(schemaPath, "utf8");
    const statements = schema
      .split(";")
      .filter((stmt) => stmt.trim().length > 0);

    logger.info("Initializing database schema", {
      statementCount: statements.length,
    });

    for (const statement of statements) {
      if (statement.trim()) {
        await executeQuery(statement.trim());
      }
    }

    logger.info("Database schema initialized successfully");
    return true;
  } catch (error) {
    logger.error("Schema initialization failed", { error: error.message });
    throw error;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    logger.info("Database connection pool closed successfully");
  } catch (error) {
    logger.error("Error closing database connection pool", {
      error: error.message,
    });
  }
};

// Connection pool event handlers
pool.on("connection", (connection) => {
  logger.debug("New database connection established", {
    connectionId: connection.threadId,
    totalConnections: pool._allConnections.length,
  });
});

pool.on("error", (error) => {
  logger.error("Database pool error", {
    error: error.message,
    code: error.code,
    fatal: error.fatal,
  });
});

// Query helpers for common operations
const queryHelpers = {
  // Safe SELECT with WHERE conditions
  async safeSelect(table, options = {}) {
    const { where = {}, orderBy = "", limit = "", fields = "*" } = options;

    let query = `SELECT ${fields} FROM ${table}`;
    const params = [];

    if (Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => {
          params.push(where[key]);
          return `${key} = ?`;
        })
        .join(" AND ");
      query += ` WHERE ${whereClause}`;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    return await pool.execute(query, params);
  },

  // Safe INSERT
  async safeInsert(table, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => "?").join(", ");

    const query = `INSERT INTO ${table} (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;
    return await pool.execute(query, values);
  },

  // Safe UPDATE
  async safeUpdate(table, data, where) {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(" AND ");

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(where)];

    return await pool.execute(query, params);
  },

  // Safe DELETE
  async safeDelete(table, where) {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const params = Object.values(where);

    return await pool.execute(query, params);
  },
};

// Import mock database for demo mode
const { mockDatabase } = require("./database_mock");

// Mock query helpers for demo mode
const mockQueryHelpers = {
  async safeSelect(table, options = {}) {
    const { where = {} } = options;
    
    console.log(`Mock safeSelect called - table: ${table}, where:`, where);
    
    if (table === "users") {
      if (where.email && where.status) {
        console.log(`Looking for user with email: ${where.email}, status: ${where.status}`);
        const users = await mockDatabase.findUserByEmail(where.email);
        console.log(`Found users:`, users);
        return [users]; // users is already an array, so wrap it with another array for mysql format
      }
      if (where.email) { // Just email without status
        console.log(`Looking for user with email: ${where.email}`);
        const users = await mockDatabase.findUserByEmail(where.email);
        console.log(`Found users:`, users);
        return [users]; // users is already an array, so wrap it with another array for mysql format
      }
      if (where.id) {
        const user = await mockDatabase.getUserById(where.id);
        return [user];
      }
      const users = await mockDatabase.getAllUsers();
      return [users];
    }
    
    return [[]]; // Default empty result for other tables
  },

  async safeInsert(table, data) {
    if (table === "users") {
      const result = await mockDatabase.createUser(data);
      return [{ insertId: result.insertId }];
    }
    return [{ insertId: 1 }];
  },

  async safeUpdate(table, data, where) {
    if (table === "users" && where.id) {
      const result = await mockDatabase.updateUser(where.id, data);
      return [{ affectedRows: result.affectedRows }];
    }
    return [{ affectedRows: 1 }];
  },

  async safeDelete(table, where) {
    if (table === "users" && where.id) {
      const result = await mockDatabase.deleteUser(where.id);
      return [{ affectedRows: result.affectedRows }];
    }
    return [{ affectedRows: 1 }];
  }
};

// Debug logging before module export
console.log("🔍 DEBUG: DEMO_MODE environment variable:", process.env.DEMO_MODE);
console.log("🔍 DEBUG: DEMO_MODE === 'true':", process.env.DEMO_MODE === 'true');

module.exports = {
  pool: process.env.DEMO_MODE === 'true' ? null : pool,
  queryHelpers: process.env.DEMO_MODE === 'true' ? (() => {
    console.log('🎭 DEMO_MODE detected - using mock queryHelpers');
    return mockQueryHelpers;
  })() : (() => {
    console.log('🏭 PRODUCTION_MODE detected - using real queryHelpers');
    return queryHelpers;
  })(),
  testConnection,
  healthCheck,
  executeQuery,
  executeTransaction,
  initializeSchema,
  closePool,
  config: {
    host: config.host,
    port: config.port,
    database: config.database,
    connectionLimit: config.connectionLimit,
  },
};

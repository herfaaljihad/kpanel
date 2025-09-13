-- KPanel Database Schema
-- Basic schema for hosting control panel

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table (administrators and customers)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires DATETIME NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verify_token VARCHAR(255) NULL
);

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(255) NULL,
    document_root VARCHAR(500) NOT NULL,
    php_version VARCHAR(10) DEFAULT '8.1',
    ssl_enabled BOOLEAN DEFAULT FALSE,
    ssl_cert_path VARCHAR(500) NULL,
    ssl_key_path VARCHAR(500) NULL,
    ssl_auto_renew BOOLEAN DEFAULT FALSE,
    redirect_www BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    bandwidth_limit INTEGER DEFAULT 0,
    disk_limit INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Database instances
CREATE TABLE IF NOT EXISTS databases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    domain_id INTEGER NULL,
    database_name VARCHAR(255) NOT NULL,
    database_type VARCHAR(20) DEFAULT 'mysql',
    host VARCHAR(255) DEFAULT 'localhost',
    port INTEGER DEFAULT 3306,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    charset VARCHAR(50) DEFAULT 'utf8mb4',
    collation VARCHAR(100) DEFAULT 'utf8mb4_unicode_ci',
    size_mb INTEGER DEFAULT 0,
    max_size_mb INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_backup DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
);

-- System settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT NULL,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    additional_data TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_databases_user_id ON databases(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Insert default system settings
INSERT OR REPLACE INTO settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
('system_name', 'KPanel', 'string', 'System name', 'general', true),
('system_version', '2.0.0', 'string', 'System version', 'general', true),
('enable_registration', 'false', 'boolean', 'Allow user registration', 'auth', false),
('max_domains_per_user', '10', 'number', 'Maximum domains per user', 'limits', false),
('max_databases_per_user', '5', 'number', 'Maximum databases per user', 'limits', false),
('session_timeout', '24', 'number', 'Session timeout in hours', 'auth', false),
('enable_api', 'true', 'boolean', 'Enable API access', 'api', false),
('maintenance_mode', 'false', 'boolean', 'System maintenance mode', 'system', true);

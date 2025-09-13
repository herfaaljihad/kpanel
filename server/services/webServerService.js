const { exec, execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

class WebServerService {
  constructor() {
    this.apacheConfigPath = "/etc/apache2/sites-available/";
    this.nginxConfigPath = "/etc/nginx/sites-available/";
    this.webServerType = process.env.WEBSERVER_TYPE || "nginx"; // nginx or apache
    this.sslCertPath = "/etc/ssl/certs";
    this.sslKeyPath = "/etc/ssl/private";
  }

  /**
   * Create Virtual Host for domain
   */
  async createVirtualHost(domain, config = {}) {
    try {
      // Validate domain name
      if (!this.isValidDomain(domain)) {
        throw new Error(`Invalid domain name: ${domain}`);
      }

      const vhostConfig = {
        domain: domain,
        documentRoot: config.documentRoot || `/var/www/${domain}/public_html`,
        phpVersion: config.phpVersion || "8.1",
        sslEnabled: config.sslEnabled || false,
        redirectWww:
          config.redirectWww !== undefined ? config.redirectWww : true,
        customDirectives: config.customDirectives || [],
        userId: config.userId || null,
        serverAlias: config.serverAlias || [`www.${domain}`],
      };

      // Check if domain already exists
      const existingVhosts = await this.listVirtualHosts();
      if (existingVhosts.includes(domain)) {
        throw new Error(`Virtual host for ${domain} already exists`);
      }

      logger.info(`Creating virtual host for domain: ${domain}`);

      // Create document root directory first
      await this.createDocumentRoot(vhostConfig.documentRoot);

      // Create virtual host configuration
      if (this.webServerType === "apache") {
        await this.createApacheVirtualHost(vhostConfig);
      } else {
        await this.createNginxVirtualHost(vhostConfig);
      }

      // Configure PHP-FPM pool
      await this.configurePHPFPMPool(
        domain,
        vhostConfig.phpVersion,
        vhostConfig.userId
      );

      // Enable site
      await this.enableSite(domain);

      // Test configuration
      await this.testConfiguration();

      logger.info(`Virtual host created successfully for ${domain}`);

      return {
        success: true,
        message: `Virtual host created for ${domain}`,
        config: vhostConfig,
      };
    } catch (error) {
      logger.error(`Failed to create virtual host for ${domain}:`, error);
      throw new Error(`Failed to create virtual host: ${error.message}`);
    }
  }

  /**
   * Create Apache Virtual Host Configuration
   */
  async createApacheVirtualHost(config) {
    const vhostTemplate = `
<VirtualHost *:80>
    ServerName ${config.domain}
    ServerAlias www.${config.domain}
    DocumentRoot ${config.documentRoot}
    
    <Directory ${config.documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # PHP Configuration
    <FilesMatch \\.php$>
        SetHandler "proxy:unix:/var/run/php/php${config.phpVersion}-fpm-${
      config.domain
    }.sock|fcgi://localhost"
    </FilesMatch>
    
    # Custom Directives
    ${config.customDirectives.join("\n    ")}
    
    ErrorLog \${APACHE_LOG_DIR}/${config.domain}_error.log
    CustomLog \${APACHE_LOG_DIR}/${config.domain}_access.log combined
</VirtualHost>

${
  config.sslEnabled
    ? `
<VirtualHost *:443>
    ServerName ${config.domain}
    ServerAlias www.${config.domain}
    DocumentRoot ${config.documentRoot}
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/${config.domain}.crt
    SSLCertificateKeyFile /etc/ssl/private/${config.domain}.key
    
    <Directory ${config.documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    <FilesMatch \\.php$>
        SetHandler "proxy:unix:/var/run/php/php${config.phpVersion}-fpm-${config.domain}.sock|fcgi://localhost"
    </FilesMatch>
    
    ErrorLog \${APACHE_LOG_DIR}/${config.domain}_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/${config.domain}_ssl_access.log combined
</VirtualHost>`
    : ""
}
`;

    const configPath = path.join(
      this.apacheConfigPath,
      `${config.domain}.conf`
    );
    await fs.writeFile(configPath, vhostTemplate);
  }

  /**
   * Create Nginx Virtual Host Configuration
   */
  async createNginxVirtualHost(config) {
    const vhostTemplate = `
server {
    listen 80;
    server_name ${config.domain} www.${config.domain};
    root ${config.documentRoot};
    index index.php index.html index.htm;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Deny access to hidden files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Main location block
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP handling
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php${config.phpVersion}-fpm-${
      config.domain
    }.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static file handling
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    access_log /var/log/nginx/${config.domain}_access.log;
    error_log /var/log/nginx/${config.domain}_error.log;
}

${
  config.sslEnabled
    ? `
server {
    listen 443 ssl http2;
    server_name ${config.domain} www.${config.domain};
    root ${config.documentRoot};
    index index.php index.html index.htm;
    
    ssl_certificate /etc/ssl/certs/${config.domain}.crt;
    ssl_certificate_key /etc/ssl/private/${config.domain}.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Include same location blocks as HTTP
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php${config.phpVersion}-fpm-${config.domain}.sock;
    }
    
    access_log /var/log/nginx/${config.domain}_ssl_access.log;
    error_log /var/log/nginx/${config.domain}_ssl_error.log;
}`
    : ""
}
`;

    const configPath = path.join(this.nginxConfigPath, `${config.domain}.conf`);
    await fs.writeFile(configPath, vhostTemplate);
  }

  /**
   * Configure PHP-FPM Pool for domain
   */
  async configurePHPFPMPool(domain, phpVersion) {
    const poolConfig = `
[${domain}]
user = www-data
group = www-data

listen = /var/run/php/php${phpVersion}-fpm-${domain}.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

php_admin_value[error_log] = /var/log/php${phpVersion}-fpm-${domain}.log
php_admin_flag[log_errors] = on

; Security
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen
php_admin_value[open_basedir] = /var/www/${domain}:/tmp:/usr/share/php
`;

    const poolPath = `/etc/php/${phpVersion}/fpm/pool.d/${domain}.conf`;
    await fs.writeFile(poolPath, poolConfig);

    // Restart PHP-FPM
    execSync(`systemctl reload php${phpVersion}-fpm`);
  }

  /**
   * Create document root directory structure
   */
  async createDocumentRoot(documentRoot) {
    try {
      // Create main directory
      await fs.mkdir(documentRoot, { recursive: true, mode: 0o755 });

      // Create subdirectories
      await fs.mkdir(path.join(documentRoot, "logs"), { recursive: true });
      await fs.mkdir(path.join(documentRoot, "tmp"), { recursive: true });

      // Create default index.php
      const defaultIndex = `<?php
phpinfo();
?>`;
      await fs.writeFile(path.join(documentRoot, "index.php"), defaultIndex);

      // Set ownership
      execSync(`chown -R www-data:www-data ${documentRoot}`);
    } catch (error) {
      throw new Error(`Failed to create document root: ${error.message}`);
    }
  }

  /**
   * Enable site (Apache/Nginx)
   */
  async enableSite(domain) {
    try {
      if (this.webServerType === "apache") {
        execSync(`a2ensite ${domain}.conf`);
        execSync("systemctl reload apache2");
      } else {
        const enabledPath = `/etc/nginx/sites-enabled/${domain}.conf`;
        const availablePath = `/etc/nginx/sites-available/${domain}.conf`;

        // Create symlink
        execSync(`ln -sf ${availablePath} ${enabledPath}`);
        execSync("nginx -t && systemctl reload nginx");
      }
    } catch (error) {
      throw new Error(`Failed to enable site: ${error.message}`);
    }
  }

  /**
   * Disable site
   */
  async disableSite(domain) {
    try {
      if (this.webServerType === "apache") {
        execSync(`a2dissite ${domain}.conf`);
        execSync("systemctl reload apache2");
      } else {
        const enabledPath = `/etc/nginx/sites-enabled/${domain}.conf`;
        execSync(`rm -f ${enabledPath}`);
        execSync("systemctl reload nginx");
      }
    } catch (error) {
      throw new Error(`Failed to disable site: ${error.message}`);
    }
  }

  /**
   * Delete virtual host completely
   */
  async deleteVirtualHost(domain) {
    try {
      // Disable site first
      await this.disableSite(domain);

      // Remove configuration files
      if (this.webServerType === "apache") {
        await fs.unlink(`${this.apacheConfigPath}/${domain}.conf`);
      } else {
        await fs.unlink(`${this.nginxConfigPath}/${domain}.conf`);
      }

      // Remove PHP-FPM pool
      const phpVersions = ["7.4", "8.0", "8.1", "8.2"];
      for (const version of phpVersions) {
        try {
          await fs.unlink(`/etc/php/${version}/fpm/pool.d/${domain}.conf`);
          execSync(`systemctl reload php${version}-fpm`);
        } catch (e) {
          // Pool doesn't exist for this version, continue
        }
      }

      return {
        success: true,
        message: `Virtual host deleted for ${domain}`,
      };
    } catch (error) {
      throw new Error(`Failed to delete virtual host: ${error.message}`);
    }
  }

  /**
   * List all virtual hosts
   */
  async listVirtualHosts() {
    try {
      const configPath =
        this.webServerType === "apache"
          ? this.apacheConfigPath
          : this.nginxConfigPath;

      const files = await fs.readdir(configPath);
      const vhosts = files
        .filter((file) => file.endsWith(".conf"))
        .map((file) => file.replace(".conf", ""));

      return vhosts;
    } catch (error) {
      throw new Error(`Failed to list virtual hosts: ${error.message}`);
    }
  }

  /**
   * Get virtual host configuration
   */
  async getVirtualHostConfig(domain) {
    try {
      const configPath =
        this.webServerType === "apache"
          ? `${this.apacheConfigPath}/${domain}.conf`
          : `${this.nginxConfigPath}/${domain}.conf`;

      const config = await fs.readFile(configPath, "utf-8");
      return config;
    } catch (error) {
      throw new Error(`Failed to get virtual host config: ${error.message}`);
    }
  }

  /**
   * Test web server configuration
   */
  async testConfiguration() {
    try {
      if (this.webServerType === "apache") {
        execSync("apache2ctl configtest");
      } else {
        execSync("nginx -t");
      }
      return { success: true, message: "Configuration is valid" };
    } catch (error) {
      throw new Error(`Configuration test failed: ${error.message}`);
    }
  }

  /**
   * Get web server status
   */
  async getServerStatus() {
    try {
      const serviceName = this.webServerType === "apache" ? "apache2" : "nginx";
      const status = execSync(`systemctl is-active ${serviceName}`)
        .toString()
        .trim();

      return {
        service: serviceName,
        status: status,
        active: status === "active",
      };
    } catch (error) {
      return {
        service: serviceName,
        status: "inactive",
        active: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate domain name format
   */
  isValidDomain(domain) {
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Install SSL certificate for domain
   */
  async installSSLCertificate(
    domain,
    certificateData,
    privateKeyData,
    chainData = null
  ) {
    try {
      logger.info(`Installing SSL certificate for ${domain}`);

      // Ensure SSL directories exist
      await fs.mkdir(this.sslCertPath, { recursive: true });
      await fs.mkdir(this.sslKeyPath, { recursive: true });

      // Write certificate files
      const certFile = path.join(this.sslCertPath, `${domain}.crt`);
      const keyFile = path.join(this.sslKeyPath, `${domain}.key`);
      const chainFile = path.join(this.sslCertPath, `${domain}-chain.crt`);

      await fs.writeFile(certFile, certificateData);
      await fs.writeFile(keyFile, privateKeyData);

      if (chainData) {
        await fs.writeFile(chainFile, chainData);
      }

      // Set proper permissions
      execSync(`chmod 644 ${certFile}`);
      execSync(`chmod 600 ${keyFile}`);
      if (chainData) {
        execSync(`chmod 644 ${chainFile}`);
      }

      // Update virtual host to enable SSL
      await this.enableSSLForDomain(domain);

      logger.info(`SSL certificate installed successfully for ${domain}`);
      return {
        success: true,
        message: `SSL certificate installed for ${domain}`,
      };
    } catch (error) {
      logger.error(`Failed to install SSL certificate for ${domain}:`, error);
      throw new Error(`Failed to install SSL certificate: ${error.message}`);
    }
  }

  /**
   * Generate Let's Encrypt SSL certificate
   */
  async generateLetsEncryptSSL(domain, email) {
    try {
      logger.info(`Generating Let's Encrypt SSL certificate for ${domain}`);

      // Check if certbot is installed
      try {
        execSync("which certbot", { stdio: "ignore" });
      } catch (error) {
        throw new Error(
          "Certbot is not installed. Please install certbot first."
        );
      }

      // Generate certificate using webroot method
      const webrootPath = `/var/www/${domain}/public_html`;
      const certbotCommand = `certbot certonly --webroot -w ${webrootPath} -d ${domain} -d www.${domain} --email ${email} --agree-tos --non-interactive`;

      execSync(certbotCommand);

      // Copy certificates to our SSL directory
      const letsEncryptPath = `/etc/letsencrypt/live/${domain}`;
      await this.installSSLCertificate(
        domain,
        await fs.readFile(path.join(letsEncryptPath, "cert.pem"), "utf8"),
        await fs.readFile(path.join(letsEncryptPath, "privkey.pem"), "utf8"),
        await fs.readFile(path.join(letsEncryptPath, "chain.pem"), "utf8")
      );

      logger.info(`Let's Encrypt SSL certificate generated for ${domain}`);
      return {
        success: true,
        message: `Let's Encrypt SSL certificate generated for ${domain}`,
      };
    } catch (error) {
      logger.error(
        `Failed to generate Let's Encrypt SSL for ${domain}:`,
        error
      );
      throw new Error(`Failed to generate Let's Encrypt SSL: ${error.message}`);
    }
  }

  /**
   * Enable SSL for existing domain
   */
  async enableSSLForDomain(domain) {
    try {
      // Read existing configuration
      const configPath =
        this.webServerType === "apache"
          ? `${this.apacheConfigPath}/${domain}.conf`
          : `${this.nginxConfigPath}/${domain}.conf`;

      let config = await fs.readFile(configPath, "utf-8");

      // Check if SSL block already exists
      if (config.includes("ssl_certificate") || config.includes("SSLEngine")) {
        logger.info(`SSL already enabled for ${domain}`);
        return;
      }

      // Add SSL configuration
      if (this.webServerType === "apache") {
        config += `\n\n<VirtualHost *:443>
    ServerName ${domain}
    ServerAlias www.${domain}
    DocumentRoot /var/www/${domain}/public_html
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/${domain}.crt
    SSLCertificateKeyFile /etc/ssl/private/${domain}.key
    SSLCertificateChainFile /etc/ssl/certs/${domain}-chain.crt
    
    <Directory /var/www/${domain}/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog \${APACHE_LOG_DIR}/${domain}_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/${domain}_ssl_access.log combined
</VirtualHost>`;
      } else {
        // For Nginx, we need to add SSL server block
        config += `\n\nserver {
    listen 443 ssl http2;
    server_name ${domain} www.${domain};
    root /var/www/${domain}/public_html;
    index index.php index.html index.htm;
    
    ssl_certificate /etc/ssl/certs/${domain}.crt;
    ssl_certificate_key /etc/ssl/private/${domain}.key;
    ssl_trusted_certificate /etc/ssl/certs/${domain}-chain.crt;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm-${domain}.sock;
    }
    
    access_log /var/log/nginx/${domain}_ssl_access.log;
    error_log /var/log/nginx/${domain}_ssl_error.log;
}`;
      }

      await fs.writeFile(configPath, config);

      // Reload web server
      await this.reloadWebServer();

      logger.info(`SSL enabled for ${domain}`);
    } catch (error) {
      logger.error(`Failed to enable SSL for ${domain}:`, error);
      throw new Error(`Failed to enable SSL: ${error.message}`);
    }
  }

  /**
   * Disable SSL for domain
   */
  async disableSSLForDomain(domain) {
    try {
      const configPath =
        this.webServerType === "apache"
          ? `${this.apacheConfigPath}/${domain}.conf`
          : `${this.nginxConfigPath}/${domain}.conf`;

      let config = await fs.readFile(configPath, "utf-8");

      if (this.webServerType === "apache") {
        // Remove SSL VirtualHost block
        config = config.replace(
          /<VirtualHost \*:443>[\s\S]*?<\/VirtualHost>/g,
          ""
        );
      } else {
        // Remove SSL server block
        config = config.replace(/server\s*{\s*listen\s+443[\s\S]*?}/g, "");
      }

      await fs.writeFile(configPath, config);
      await this.reloadWebServer();

      logger.info(`SSL disabled for ${domain}`);
      return { success: true, message: `SSL disabled for ${domain}` };
    } catch (error) {
      logger.error(`Failed to disable SSL for ${domain}:`, error);
      throw new Error(`Failed to disable SSL: ${error.message}`);
    }
  }

  /**
   * Reload web server
   */
  async reloadWebServer() {
    try {
      const serviceName = this.webServerType === "apache" ? "apache2" : "nginx";

      // Test configuration first
      await this.testConfiguration();

      // Reload service
      execSync(`systemctl reload ${serviceName}`);

      logger.info(`${serviceName} reloaded successfully`);
    } catch (error) {
      logger.error("Failed to reload web server:", error);
      throw new Error(`Failed to reload web server: ${error.message}`);
    }
  }

  /**
   * Get SSL certificate information
   */
  async getSSLCertInfo(domain) {
    try {
      const certFile = path.join(this.sslCertPath, `${domain}.crt`);

      // Check if certificate file exists
      try {
        await fs.access(certFile);
      } catch (error) {
        return { ssl_enabled: false, message: "No SSL certificate found" };
      }

      // Get certificate information using openssl
      const certInfo = execSync(
        `openssl x509 -in ${certFile} -text -noout`
      ).toString();
      const certDates = execSync(
        `openssl x509 -in ${certFile} -dates -noout`
      ).toString();

      // Parse certificate info
      const subjectMatch = certInfo.match(/Subject:.*CN\s*=\s*([^,\n]+)/);
      const issuerMatch = certInfo.match(/Issuer:.*CN\s*=\s*([^,\n]+)/);
      const notBeforeMatch = certDates.match(/notBefore=(.+)/);
      const notAfterMatch = certDates.match(/notAfter=(.+)/);

      return {
        ssl_enabled: true,
        subject: subjectMatch ? subjectMatch[1].trim() : "Unknown",
        issuer: issuerMatch ? issuerMatch[1].trim() : "Unknown",
        valid_from: notBeforeMatch
          ? new Date(notBeforeMatch[1]).toISOString()
          : null,
        valid_until: notAfterMatch
          ? new Date(notAfterMatch[1]).toISOString()
          : null,
        days_until_expiry: notAfterMatch
          ? Math.ceil(
              (new Date(notAfterMatch[1]) - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null,
      };
    } catch (error) {
      logger.error(`Failed to get SSL certificate info for ${domain}:`, error);
      return { ssl_enabled: false, error: error.message };
    }
  }

  /**
   * Update domain configuration
   */
  async updateDomainConfig(domain, updates) {
    try {
      logger.info(`Updating configuration for domain: ${domain}`);

      const configPath =
        this.webServerType === "apache"
          ? `${this.apacheConfigPath}/${domain}.conf`
          : `${this.nginxConfigPath}/${domain}.conf`;

      let config = await fs.readFile(configPath, "utf-8");

      // Update document root if specified
      if (updates.documentRoot) {
        if (this.webServerType === "apache") {
          config = config.replace(
            /DocumentRoot .+/,
            `DocumentRoot ${updates.documentRoot}`
          );
        } else {
          config = config.replace(/root .+;/, `root ${updates.documentRoot};`);
        }
      }

      // Update PHP version if specified
      if (updates.phpVersion) {
        const currentPhpPattern = /php[\d.]+/g;
        config = config.replace(currentPhpPattern, `php${updates.phpVersion}`);
      }

      await fs.writeFile(configPath, config);
      await this.testConfiguration();
      await this.reloadWebServer();

      logger.info(`Configuration updated for ${domain}`);
      return { success: true, message: `Configuration updated for ${domain}` };
    } catch (error) {
      logger.error(`Failed to update configuration for ${domain}:`, error);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }
}

module.exports = WebServerService;

const { exec, execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

class PHPService {
  constructor() {
    this.availableVersions = ["7.4", "8.0", "8.1", "8.2", "8.3"];
    this.defaultVersion = "8.1";
    this.phpConfigPath = "/etc/php";
    this.fpmPoolPath = "/etc/php/{version}/fpm/pool.d";
  }

  /**
   * Get available PHP versions
   */
  async getAvailableVersions() {
    try {
      const installed = [];

      for (const version of this.availableVersions) {
        try {
          execSync(`php${version} --version`, { stdio: "ignore" });
          installed.push(version);
        } catch (e) {
          // Version not installed
        }
      }

      return installed;
    } catch (error) {
      throw new Error(`Failed to get PHP versions: ${error.message}`);
    }
  }

  /**
   * Install PHP version
   */
  async installPHPVersion(version) {
    try {
      if (!this.availableVersions.includes(version)) {
        throw new Error(`PHP version ${version} is not supported`);
      }

      // Add PHP repository
      execSync("apt-get update");
      execSync("apt-get install -y software-properties-common");
      execSync("add-apt-repository -y ppa:ondrej/php");
      execSync("apt-get update");

      // Install PHP and common extensions
      const packages = [
        `php${version}`,
        `php${version}-fpm`,
        `php${version}-mysql`,
        `php${version}-curl`,
        `php${version}-gd`,
        `php${version}-mbstring`,
        `php${version}-xml`,
        `php${version}-zip`,
        `php${version}-intl`,
        `php${version}-bcmath`,
        `php${version}-soap`,
        `php${version}-imagick`,
      ];

      execSync(`apt-get install -y ${packages.join(" ")}`);

      // Enable and start PHP-FPM
      execSync(`systemctl enable php${version}-fpm`);
      execSync(`systemctl start php${version}-fpm`);

      return {
        success: true,
        message: `PHP ${version} installed successfully`,
        version: version,
      };
    } catch (error) {
      throw new Error(`Failed to install PHP ${version}: ${error.message}`);
    }
  }

  /**
   * Switch domain to different PHP version
   */
  async switchPHPVersion(domain, version) {
    try {
      if (!this.availableVersions.includes(version)) {
        throw new Error(`PHP version ${version} is not supported`);
      }

      // Check if version is installed
      const installed = await this.getAvailableVersions();
      if (!installed.includes(version)) {
        throw new Error(`PHP ${version} is not installed. Install it first.`);
      }

      // Update virtual host configuration
      await this.updateVirtualHostPHP(domain, version);

      // Create/Update PHP-FPM pool for this domain
      await this.createFPMPool(domain, version);

      // Restart web server
      await this.restartWebServer();

      return {
        success: true,
        message: `Domain ${domain} switched to PHP ${version}`,
        domain: domain,
        phpVersion: version,
      };
    } catch (error) {
      throw new Error(`Failed to switch PHP version: ${error.message}`);
    }
  }

  /**
   * Update virtual host PHP configuration
   */
  async updateVirtualHostPHP(domain, version) {
    try {
      const webServerType = process.env.WEBSERVER_TYPE || "apache";

      if (webServerType === "apache") {
        await this.updateApacheVirtualHostPHP(domain, version);
      } else {
        await this.updateNginxVirtualHostPHP(domain, version);
      }
    } catch (error) {
      throw new Error(`Failed to update virtual host PHP: ${error.message}`);
    }
  }

  /**
   * Update Apache virtual host for PHP version
   */
  async updateApacheVirtualHostPHP(domain, version) {
    const configPath = `/etc/apache2/sites-available/${domain}.conf`;

    try {
      let config = await fs.readFile(configPath, "utf-8");

      // Update PHP handler
      const phpHandlerRegex =
        /SetHandler "proxy:unix:\/var\/run\/php\/php[\d.]+-fpm-.*\.sock\|fcgi:\/\/localhost"/g;
      const newHandler = `SetHandler "proxy:unix:/var/run/php/php${version}-fpm-${domain}.sock|fcgi://localhost"`;

      config = config.replace(phpHandlerRegex, newHandler);

      await fs.writeFile(configPath, config);
    } catch (error) {
      throw new Error(`Failed to update Apache config: ${error.message}`);
    }
  }

  /**
   * Update Nginx virtual host for PHP version
   */
  async updateNginxVirtualHostPHP(domain, version) {
    const configPath = `/etc/nginx/sites-available/${domain}.conf`;

    try {
      let config = await fs.readFile(configPath, "utf-8");

      // Update PHP-FPM socket path
      const fpmSocketRegex =
        /fastcgi_pass unix:\/var\/run\/php\/php[\d.]+-fpm-.*\.sock;/g;
      const newSocket = `fastcgi_pass unix:/var/run/php/php${version}-fpm-${domain}.sock;`;

      config = config.replace(fpmSocketRegex, newSocket);

      await fs.writeFile(configPath, config);
    } catch (error) {
      throw new Error(`Failed to update Nginx config: ${error.message}`);
    }
  }

  /**
   * Create PHP-FPM pool for domain
   */
  async createFPMPool(domain, version) {
    const poolConfig = `
[${domain}]
user = www-data
group = www-data

listen = /var/run/php/php${version}-fpm-${domain}.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

; Custom PHP settings for this domain
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 300
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M

; Error logging
php_admin_value[error_log] = /var/log/php${version}-fpm-${domain}.log
php_admin_flag[log_errors] = on

; Security settings
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source
php_admin_value[open_basedir] = /var/www/${domain}:/tmp:/usr/share/php

; Session settings
php_admin_value[session.save_path] = /var/lib/php/sessions-${domain}
php_admin_value[soap.wsdl_cache_dir] = /tmp
`;

    const poolPath = `/etc/php/${version}/fpm/pool.d/${domain}.conf`;

    try {
      // Create session directory
      await fs.mkdir(`/var/lib/php/sessions-${domain}`, {
        recursive: true,
        mode: 0o755,
      });
      execSync(`chown www-data:www-data /var/lib/php/sessions-${domain}`);

      // Write pool configuration
      await fs.writeFile(poolPath, poolConfig);

      // Restart PHP-FPM
      execSync(`systemctl reload php${version}-fpm`);
    } catch (error) {
      throw new Error(`Failed to create FPM pool: ${error.message}`);
    }
  }

  /**
   * Edit PHP.ini for specific domain
   */
  async editDomainPHPIni(domain, version, settings) {
    try {
      const poolPath = `/etc/php/${version}/fpm/pool.d/${domain}.conf`;
      let poolConfig = await fs.readFile(poolPath, "utf-8");

      // Update PHP settings in pool configuration
      for (const [key, value] of Object.entries(settings)) {
        const settingRegex = new RegExp(
          `php_admin_value\\[${key}\\] = .*`,
          "g"
        );
        const newSetting = `php_admin_value[${key}] = ${value}`;

        if (poolConfig.includes(`php_admin_value[${key}]`)) {
          poolConfig = poolConfig.replace(settingRegex, newSetting);
        } else {
          // Add new setting
          poolConfig += `\nphp_admin_value[${key}] = ${value}`;
        }
      }

      await fs.writeFile(poolPath, poolConfig);

      // Reload PHP-FPM
      execSync(`systemctl reload php${version}-fpm`);

      return {
        success: true,
        message: `PHP settings updated for ${domain}`,
        settings: settings,
      };
    } catch (error) {
      throw new Error(`Failed to update PHP settings: ${error.message}`);
    }
  }

  /**
   * Get current PHP version for domain
   */
  async getDomainPHPVersion(domain) {
    try {
      const webServerType = process.env.WEBSERVER_TYPE || "apache";
      const configPath =
        webServerType === "apache"
          ? `/etc/apache2/sites-available/${domain}.conf`
          : `/etc/nginx/sites-available/${domain}.conf`;

      const config = await fs.readFile(configPath, "utf-8");

      // Extract PHP version from configuration
      const match = config.match(/php([\d.]+)-fpm/);
      return match ? match[1] : null;
    } catch (error) {
      throw new Error(`Failed to get PHP version: ${error.message}`);
    }
  }

  /**
   * Get PHP extensions for version
   */
  async getPHPExtensions(version) {
    try {
      const extensionsOutput = execSync(`php${version} -m`).toString();
      const extensions = extensionsOutput
        .split("\n")
        .filter((ext) => ext.trim() && !ext.includes("["))
        .map((ext) => ext.trim());

      return extensions;
    } catch (error) {
      throw new Error(`Failed to get PHP extensions: ${error.message}`);
    }
  }

  /**
   * Install PHP extension
   */
  async installPHPExtension(version, extension) {
    try {
      // Common extension mappings
      const extensionPackages = {
        gd: `php${version}-gd`,
        curl: `php${version}-curl`,
        mysql: `php${version}-mysql`,
        mysqli: `php${version}-mysql`,
        pdo_mysql: `php${version}-mysql`,
        mbstring: `php${version}-mbstring`,
        xml: `php${version}-xml`,
        zip: `php${version}-zip`,
        intl: `php${version}-intl`,
        bcmath: `php${version}-bcmath`,
        soap: `php${version}-soap`,
        imagick: `php${version}-imagick`,
        redis: `php${version}-redis`,
        memcached: `php${version}-memcached`,
      };

      const packageName =
        extensionPackages[extension] || `php${version}-${extension}`;

      execSync(`apt-get update && apt-get install -y ${packageName}`);
      execSync(`systemctl reload php${version}-fpm`);

      return {
        success: true,
        message: `PHP extension ${extension} installed for PHP ${version}`,
      };
    } catch (error) {
      throw new Error(`Failed to install extension: ${error.message}`);
    }
  }

  /**
   * Remove PHP extension
   */
  async removePHPExtension(version, extension) {
    try {
      const extensionPackages = {
        gd: `php${version}-gd`,
        curl: `php${version}-curl`,
        imagick: `php${version}-imagick`,
        redis: `php${version}-redis`,
        memcached: `php${version}-memcached`,
      };

      const packageName =
        extensionPackages[extension] || `php${version}-${extension}`;

      execSync(`apt-get remove -y ${packageName}`);
      execSync(`systemctl reload php${version}-fpm`);

      return {
        success: true,
        message: `PHP extension ${extension} removed from PHP ${version}`,
      };
    } catch (error) {
      throw new Error(`Failed to remove extension: ${error.message}`);
    }
  }

  /**
   * Get PHP-FPM status
   */
  async getFPMStatus(version) {
    try {
      const status = execSync(`systemctl is-active php${version}-fpm`)
        .toString()
        .trim();
      const pools = await this.getFPMPools(version);

      return {
        version: version,
        status: status,
        active: status === "active",
        pools: pools,
      };
    } catch (error) {
      return {
        version: version,
        status: "inactive",
        active: false,
        error: error.message,
      };
    }
  }

  /**
   * Get FPM pools for version
   */
  async getFPMPools(version) {
    try {
      const poolDir = `/etc/php/${version}/fpm/pool.d`;
      const files = await fs.readdir(poolDir);

      return files
        .filter((file) => file.endsWith(".conf") && file !== "www.conf")
        .map((file) => file.replace(".conf", ""));
    } catch (error) {
      return [];
    }
  }

  /**
   * Restart web server
   */
  async restartWebServer() {
    try {
      const webServerType = process.env.WEBSERVER_TYPE || "apache";
      const service = webServerType === "apache" ? "apache2" : "nginx";

      execSync(`systemctl reload ${service}`);
    } catch (error) {
      throw new Error(`Failed to restart web server: ${error.message}`);
    }
  }

  /**
   * Get PHP configuration summary
   */
  async getPHPSummary() {
    try {
      const availableVersions = await this.getAvailableVersions();
      const phpSummary = {};

      for (const version of availableVersions) {
        const status = await this.getFPMStatus(version);
        const extensions = await this.getPHPExtensions(version);

        phpSummary[version] = {
          status: status,
          extensions: extensions,
          pools: status.pools || [],
        };
      }

      return phpSummary;
    } catch (error) {
      throw new Error(`Failed to get PHP summary: ${error.message}`);
    }
  }
}

module.exports = PHPService;

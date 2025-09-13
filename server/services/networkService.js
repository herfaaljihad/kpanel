/**
 * Network Service - IP Detection and Network Utilities
 * Automatically detects server public IP for production use
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const axios = require("axios");
const os = require("os");

const execAsync = promisify(exec);

class NetworkService {
  constructor() {
    this.cachedIP = null;
    this.lastIPCheck = null;
    this.ipCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get server public IP address with multiple fallback methods
   * @returns {Promise<string>} Public IP address
   */
  async getPublicIP() {
    // Return cached IP if still valid
    if (
      this.cachedIP &&
      this.lastIPCheck &&
      Date.now() - this.lastIPCheck < this.ipCacheTTL
    ) {
      return this.cachedIP;
    }

    const methods = [
      () => this.getIPFromService("https://ifconfig.me/ip"),
      () => this.getIPFromService("https://api.ipify.org"),
      () => this.getIPFromService("https://icanhazip.com"),
      () => this.getIPFromService("https://checkip.amazonaws.com"),
      () => this.getIPFromCurl(),
      () => this.getLocalIP(),
    ];

    for (const method of methods) {
      try {
        const ip = await method();
        if (this.isValidIP(ip)) {
          this.cachedIP = ip.trim();
          this.lastIPCheck = Date.now();
          console.log(`✅ Detected public IP: ${this.cachedIP}`);
          return this.cachedIP;
        }
      } catch (error) {
        console.warn(`IP detection method failed: ${error.message}`);
        continue;
      }
    }

    // Fallback to localhost if all methods fail
    console.warn("⚠️ Could not detect public IP, using localhost");
    return "127.0.0.1";
  }

  /**
   * Get IP from external service
   * @param {string} url Service URL
   * @returns {Promise<string>} IP address
   */
  async getIPFromService(url) {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "KPanel/2.0.0",
      },
    });
    return response.data.trim();
  }

  /**
   * Get IP using curl command (Linux/Unix systems)
   * @returns {Promise<string>} IP address
   */
  async getIPFromCurl() {
    const { stdout } = await execAsync("curl -s --max-time 5 ifconfig.me");
    return stdout.trim();
  }

  /**
   * Get local network IP (fallback for development)
   * @returns {string} Local IP address
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal, loopback and link-local addresses
        if (
          iface.family === "IPv4" &&
          !iface.internal &&
          !iface.address.startsWith("169.254.")
        ) {
          return iface.address;
        }
      }
    }

    return "127.0.0.1";
  }

  /**
   * Validate IP address format
   * @param {string} ip IP address to validate
   * @returns {boolean} Is valid IP
   */
  isValidIP(ip) {
    if (!ip || typeof ip !== "string") return false;

    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip.trim());
  }

  /**
   * Get server information including IP
   * @returns {Promise<Object>} Server info object
   */
  async getServerInfo() {
    const publicIP = await this.getPublicIP();
    const localIP = this.getLocalIP();

    return {
      publicIP,
      localIP,
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      network: {
        interfaces: os.networkInterfaces(),
      },
    };
  }

  /**
   * Generate CORS origins based on detected IPs
   * @returns {Promise<Array>} Array of allowed origins
   */
  async getCorsOrigins() {
    const publicIP = await this.getPublicIP();
    const localIP = this.getLocalIP();

    const origins = [
      // Production origins
      `http://${publicIP}`,
      `https://${publicIP}`,
      `http://${publicIP}:80`,
      `https://${publicIP}:443`,
      `http://${publicIP}:3002`,
      `https://${publicIP}:3002`,

      // Local development origins
      `http://${localIP}`,
      `http://${localIP}:3000`,
      `http://${localIP}:3001`,
      `http://${localIP}:3002`,
      `http://${localIP}:5000`,

      // Localhost origins
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:5000",
    ];

    // Remove duplicates and return
    return [...new Set(origins)];
  }

  /**
   * Check if running in production environment
   * @returns {boolean} Is production
   */
  isProduction() {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Get environment-appropriate base URL
   * @returns {Promise<string>} Base URL
   */
  async getBaseURL() {
    if (this.isProduction()) {
      const publicIP = await this.getPublicIP();
      return `http://${publicIP}`;
    } else {
      return "http://localhost:3002";
    }
  }

  /**
   * Clear cached IP (force refresh)
   */
  clearIPCache() {
    this.cachedIP = null;
    this.lastIPCheck = null;
    console.log("🔄 IP cache cleared");
  }
}

// Export singleton instance
module.exports = new NetworkService();

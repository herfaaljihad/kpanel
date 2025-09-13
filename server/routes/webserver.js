const express = require("express");
const router = express.Router();
const WebServerService = require("../services/webServerService");
const PHPService = require("../services/phpService");
const auth = require("../middleware/auth");

const webServerService = new WebServerService();
const phpService = new PHPService();

/**
 * @route GET /api/webserver/status
 * @desc Get web server status
 */
router.get("/status", auth, async (req, res) => {
  try {
    const status = await webServerService.getServerStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route GET /api/webserver/vhosts
 * @desc List all virtual hosts
 */
router.get("/vhosts", auth, async (req, res) => {
  try {
    const vhosts = await webServerService.listVirtualHosts();
    const vhostDetails = [];

    for (const domain of vhosts) {
      try {
        const phpVersion = await phpService.getDomainPHPVersion(domain);
        vhostDetails.push({
          domain: domain,
          phpVersion: phpVersion,
          status: "active", // Could be enhanced with actual status check
        });
      } catch (e) {
        vhostDetails.push({
          domain: domain,
          phpVersion: null,
          status: "unknown",
        });
      }
    }

    res.json({
      success: true,
      data: vhostDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/vhosts
 * @desc Create new virtual host
 */
router.post("/vhosts", auth, async (req, res) => {
  try {
    const {
      domain,
      documentRoot,
      phpVersion,
      sslEnabled,
      redirectWww,
      customDirectives,
    } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Domain is required",
      });
    }

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        success: false,
        message: "Invalid domain format",
      });
    }

    const config = {
      documentRoot,
      phpVersion: phpVersion || "8.1",
      sslEnabled: sslEnabled || false,
      redirectWww: redirectWww !== undefined ? redirectWww : true,
      customDirectives: customDirectives || [],
    };

    const result = await webServerService.createVirtualHost(domain, config);

    res.json({
      success: true,
      message: result.message,
      data: {
        domain: domain,
        config: result.config,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route GET /api/webserver/vhosts/:domain
 * @desc Get virtual host configuration
 */
router.get("/vhosts/:domain", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const config = await webServerService.getVirtualHostConfig(domain);
    const phpVersion = await phpService.getDomainPHPVersion(domain);

    res.json({
      success: true,
      data: {
        domain: domain,
        config: config,
        phpVersion: phpVersion,
      },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route PUT /api/webserver/vhosts/:domain/php
 * @desc Switch PHP version for domain
 */
router.put("/vhosts/:domain/php", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: "PHP version is required",
      });
    }

    const result = await phpService.switchPHPVersion(domain, version);

    res.json({
      success: true,
      message: result.message,
      data: {
        domain: domain,
        phpVersion: version,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route PUT /api/webserver/vhosts/:domain/php-settings
 * @desc Update PHP settings for domain
 */
router.put("/vhosts/:domain/php-settings", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        success: false,
        message: "PHP settings object is required",
      });
    }

    // Get current PHP version
    const phpVersion = await phpService.getDomainPHPVersion(domain);
    if (!phpVersion) {
      return res.status(404).json({
        success: false,
        message: "PHP version not found for domain",
      });
    }

    const result = await phpService.editDomainPHPIni(
      domain,
      phpVersion,
      settings
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        domain: domain,
        phpVersion: phpVersion,
        updatedSettings: settings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route DELETE /api/webserver/vhosts/:domain
 * @desc Delete virtual host
 */
router.delete("/vhosts/:domain", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await webServerService.deleteVirtualHost(domain);

    res.json({
      success: true,
      message: result.message,
      data: {
        domain: domain,
        deleted: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/vhosts/:domain/enable
 * @desc Enable virtual host
 */
router.post("/vhosts/:domain/enable", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    await webServerService.enableSite(domain);

    res.json({
      success: true,
      message: `Virtual host ${domain} enabled successfully`,
      data: {
        domain: domain,
        enabled: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/vhosts/:domain/disable
 * @desc Disable virtual host
 */
router.post("/vhosts/:domain/disable", auth, async (req, res) => {
  try {
    const { domain } = req.params;
    await webServerService.disableSite(domain);

    res.json({
      success: true,
      message: `Virtual host ${domain} disabled successfully`,
      data: {
        domain: domain,
        enabled: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route GET /api/webserver/php/versions
 * @desc Get available PHP versions
 */
router.get("/php/versions", auth, async (req, res) => {
  try {
    const availableVersions = await phpService.getAvailableVersions();
    const allVersions = phpService.availableVersions;

    const versionsData = allVersions.map((version) => ({
      version: version,
      installed: availableVersions.includes(version),
      default: version === phpService.defaultVersion,
    }));

    res.json({
      success: true,
      data: {
        versions: versionsData,
        installed: availableVersions,
        default: phpService.defaultVersion,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/php/versions/:version/install
 * @desc Install PHP version
 */
router.post("/php/versions/:version/install", auth, async (req, res) => {
  try {
    const { version } = req.params;
    const result = await phpService.installPHPVersion(version);

    res.json({
      success: true,
      message: result.message,
      data: {
        version: version,
        installed: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route GET /api/webserver/php/versions/:version/extensions
 * @desc Get PHP extensions for version
 */
router.get("/php/versions/:version/extensions", auth, async (req, res) => {
  try {
    const { version } = req.params;
    const extensions = await phpService.getPHPExtensions(version);

    res.json({
      success: true,
      data: {
        version: version,
        extensions: extensions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/php/versions/:version/extensions/:extension
 * @desc Install PHP extension
 */
router.post(
  "/php/versions/:version/extensions/:extension",
  auth,
  async (req, res) => {
    try {
      const { version, extension } = req.params;
      const result = await phpService.installPHPExtension(version, extension);

      res.json({
        success: true,
        message: result.message,
        data: {
          version: version,
          extension: extension,
          installed: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route DELETE /api/webserver/php/versions/:version/extensions/:extension
 * @desc Remove PHP extension
 */
router.delete(
  "/php/versions/:version/extensions/:extension",
  auth,
  async (req, res) => {
    try {
      const { version, extension } = req.params;
      const result = await phpService.removePHPExtension(version, extension);

      res.json({
        success: true,
        message: result.message,
        data: {
          version: version,
          extension: extension,
          installed: false,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route GET /api/webserver/php/summary
 * @desc Get PHP configuration summary
 */
router.get("/php/summary", auth, async (req, res) => {
  try {
    const summary = await phpService.getPHPSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route POST /api/webserver/test-config
 * @desc Test web server configuration
 */
router.post("/test-config", auth, async (req, res) => {
  try {
    const result = await webServerService.testConfiguration();

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();

// Mock data for domain advanced features
const mockDomains = [
  {
    id: 1,
    name: "example.com",
    type: "primary",
    status: "active",
    ssl_status: "active",
    created_at: "2024-01-01T00:00:00Z",
    dns_status: "active",
    ip_address: "192.168.1.100",
  },
  {
    id: 2,
    name: "demo.example.com",
    type: "subdomain",
    parent_domain: "example.com",
    status: "active",
    ssl_status: "pending",
    created_at: "2024-01-02T00:00:00Z",
  },
];

const mockSubdomains = [
  {
    id: 1,
    name: "www",
    domain: "example.com",
    full_name: "www.example.com",
    type: "subdomain",
    status: "active",
    document_root: "/home/user/www.example.com",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "api",
    domain: "example.com",
    full_name: "api.example.com",
    type: "subdomain",
    status: "active",
    document_root: "/home/user/api.example.com",
    created_at: "2024-01-02T00:00:00Z",
  },
];

const mockDnsRecords = [
  {
    id: 1,
    domain: "example.com",
    name: "@",
    type: "A",
    value: "192.168.1.100",
    ttl: 3600,
    priority: null,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    domain: "example.com",
    name: "www",
    type: "CNAME",
    value: "example.com",
    ttl: 3600,
    priority: null,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    domain: "example.com",
    name: "@",
    type: "MX",
    value: "mail.example.com",
    ttl: 3600,
    priority: 10,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
];

const mockSslCertificates = [
  {
    id: 1,
    domain: "example.com",
    issuer: "Let's Encrypt",
    status: "active",
    issued_at: "2024-01-01T00:00:00Z",
    expires_at: "2024-04-01T00:00:00Z",
    auto_renew: true,
    type: "domain_validated",
  },
  {
    id: 2,
    domain: "www.example.com",
    issuer: "Let's Encrypt",
    status: "active",
    issued_at: "2024-01-01T00:00:00Z",
    expires_at: "2024-04-01T00:00:00Z",
    auto_renew: true,
    type: "domain_validated",
  },
];

const mockDomainStats = {
  total_requests: 15420,
  unique_visitors: 3245,
  bandwidth_used: "2.1 GB",
  uptime_percentage: 99.9,
  avg_response_time: "234ms",
  ssl_grade: "A+",
  page_load_time: "1.2s",
  bounce_rate: "23%",
};

const mockRedirects = [
  {
    id: 1,
    domain: "example.com",
    source_path: "/old-page",
    destination: "/new-page",
    type: "301",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    domain: "example.com",
    source_path: "/blog",
    destination: "https://blog.example.com",
    type: "302",
    status: "active",
    created_at: "2024-01-02T00:00:00Z",
  },
];

// Get all domains
router.get("/domains", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        domains: mockDomains,
        total: mockDomains.length,
        active: mockDomains.filter((d) => d.status === "active").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch domains",
      error: error.message,
    });
  }
});

// Create domain
router.post("/domains", (req, res) => {
  try {
    const { name, type = "primary", document_root } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Domain name is required",
      });
    }

    const newDomain = {
      id: mockDomains.length + 1,
      name,
      type,
      status: "pending",
      ssl_status: "none",
      created_at: new Date().toISOString(),
      dns_status: "pending",
      document_root: document_root || `/home/user/${name}`,
    };

    mockDomains.push(newDomain);

    res.status(201).json({
      success: true,
      message: "Domain created successfully",
      data: newDomain,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create domain",
      error: error.message,
    });
  }
});

// Delete domain
router.delete("/domains/:id", (req, res) => {
  try {
    const domainId = parseInt(req.params.id);
    const domainIndex = mockDomains.findIndex((d) => d.id === domainId);

    if (domainIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    mockDomains.splice(domainIndex, 1);

    res.json({
      success: true,
      message: "Domain deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete domain",
      error: error.message,
    });
  }
});

// Get all subdomains
router.get("/subdomains", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        subdomains: mockSubdomains,
        total: mockSubdomains.length,
        active: mockSubdomains.filter((s) => s.status === "active").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subdomains",
      error: error.message,
    });
  }
});

// Create subdomain
router.post("/subdomains", (req, res) => {
  try {
    const { name, domain, document_root } = req.body;

    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain name and domain are required",
      });
    }

    const newSubdomain = {
      id: mockSubdomains.length + 1,
      name,
      domain,
      full_name: `${name}.${domain}`,
      type: "subdomain",
      status: "active",
      document_root: document_root || `/home/user/${name}.${domain}`,
      created_at: new Date().toISOString(),
    };

    mockSubdomains.push(newSubdomain);

    res.status(201).json({
      success: true,
      message: "Subdomain created successfully",
      data: newSubdomain,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create subdomain",
      error: error.message,
    });
  }
});

// Get DNS records
router.get("/dns", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        records: mockDnsRecords,
        total: mockDnsRecords.length,
        types: [...new Set(mockDnsRecords.map((r) => r.type))],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch DNS records",
      error: error.message,
    });
  }
});

// Create DNS record
router.post("/dns", (req, res) => {
  try {
    const { domain, name, type, value, ttl = 3600, priority } = req.body;

    if (!domain || !name || !type || !value) {
      return res.status(400).json({
        success: false,
        message: "Domain, name, type, and value are required",
      });
    }

    const newRecord = {
      id: mockDnsRecords.length + 1,
      domain,
      name,
      type,
      value,
      ttl: parseInt(ttl),
      priority: priority ? parseInt(priority) : null,
      status: "active",
      created_at: new Date().toISOString(),
    };

    mockDnsRecords.push(newRecord);

    res.status(201).json({
      success: true,
      message: "DNS record created successfully",
      data: newRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create DNS record",
      error: error.message,
    });
  }
});

// Get SSL certificates
router.get("/ssl", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        certificates: mockSslCertificates,
        total: mockSslCertificates.length,
        active: mockSslCertificates.filter((c) => c.status === "active").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch SSL certificates",
      error: error.message,
    });
  }
});

// Install SSL certificate
router.post("/ssl", (req, res) => {
  try {
    const { domain, auto_renew = true } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Domain is required",
      });
    }

    const newCertificate = {
      id: mockSslCertificates.length + 1,
      domain,
      issuer: "Let's Encrypt",
      status: "active",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      auto_renew,
      type: "domain_validated",
    };

    mockSslCertificates.push(newCertificate);

    res.status(201).json({
      success: true,
      message: "SSL certificate installed successfully",
      data: newCertificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to install SSL certificate",
      error: error.message,
    });
  }
});

// Get domain statistics
router.get("/stats", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        stats: mockDomainStats,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch domain statistics",
      error: error.message,
    });
  }
});

// Get redirects
router.get("/redirects", (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        redirects: mockRedirects,
        total: mockRedirects.length,
        active: mockRedirects.filter((r) => r.status === "active").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch redirects",
      error: error.message,
    });
  }
});

// Create redirect
router.post("/redirects", (req, res) => {
  try {
    const { domain, source_path, destination, type = "301" } = req.body;

    if (!domain || !source_path || !destination) {
      return res.status(400).json({
        success: false,
        message: "Domain, source path, and destination are required",
      });
    }

    const newRedirect = {
      id: mockRedirects.length + 1,
      domain,
      source_path,
      destination,
      type,
      status: "active",
      created_at: new Date().toISOString(),
    };

    mockRedirects.push(newRedirect);

    res.status(201).json({
      success: true,
      message: "Redirect created successfully",
      data: newRedirect,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create redirect",
      error: error.message,
    });
  }
});

module.exports = router;

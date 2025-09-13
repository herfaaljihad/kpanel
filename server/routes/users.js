const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { queryHelpers } = require("../config/database_sqlite");
const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await queryHelpers.executeQuery(
      "SELECT id, email, name, role, plan, status, created_at, last_login FROM users WHERE id = ?",
      [req.user.userId]
    );

    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role,
      plan: user[0].plan,
      status: user[0].status,
      created_at: user[0].created_at,
      last_login: user[0].last_login,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user domains
router.get("/domains", authenticateToken, async (req, res) => {
  try {
    const domains = await queryHelpers.executeQuery(
      "SELECT * FROM domains WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.userId]
    );
    res.json(domains);
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user databases
router.get("/databases", authenticateToken, async (req, res) => {
  try {
    const databases = await queryHelpers.executeQuery(
      "SELECT * FROM databases WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.userId]
    );
    res.json(databases);
  } catch (error) {
    console.error("Error fetching user databases:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user statistics
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Stats request for user:", req.user);
    const userId = req.user.userId;
    console.log("🔍 Using userId:", userId);

    // Get domains count
    console.log("🔍 Querying domains...");
    const domains = await queryHelpers.executeQuery(
      "SELECT COUNT(*) as count FROM domains WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    console.log("🔍 Domains result:", domains);

    // Get databases count
    console.log("🔍 Querying databases...");
    const databases = await queryHelpers.executeQuery(
      "SELECT COUNT(*) as count FROM databases WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    console.log("🔍 Databases result:", databases);

    // Get user plan info
    console.log("🔍 Querying user plan...");
    const user = await queryHelpers.executeQuery(
      "SELECT plan FROM users WHERE id = ?",
      [userId]
    );
    console.log("🔍 User result:", user);

    // Calculate stats based on actual data
    const stats = {
      domains: domains[0]?.count || 0,
      databases: databases[0]?.count || 0,
      files: 0, // Would be calculated from file system
      disk_used: "0 MB", // Would be calculated from file system
      disk_quota: user[0]?.plan === "premium" ? "5000 MB" : "1000 MB",
      bandwidth_used: "0 MB", // From monitoring
      bandwidth_quota: user[0]?.plan === "premium" ? "50 GB" : "10 GB",
      email_accounts: 0, // Would be calculated from email accounts
      subdomains: 0, // Would be calculated from subdomains
      ssl_certificates: 0, // Would be calculated from SSL certificates
    };

    console.log("🔍 Sending stats:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ Error fetching user stats:", error);
    console.error("❌ Stack:", error.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;

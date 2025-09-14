// CORS Configuration for KPanel - Production Ready
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      // Development origins (only include in development)
      ...(process.env.NODE_ENV === "development"
        ? [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://localhost:5000",
            "http://localhost:5001",
            "http://localhost:5002",
          ]
        : []),

      // Production origins - Add your actual domains here
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : []),
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  // Additional security headers
  maxAge: process.env.NODE_ENV === "production" ? 86400 : 600, // Cache preflight for 24h in prod, 10min in dev
};

module.exports = corsOptions;

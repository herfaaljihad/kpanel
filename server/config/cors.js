// CORS Configuration for KPanel Development
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5002",
  ],
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
};

module.exports = corsOptions;

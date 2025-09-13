import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Attempting login with:", { email, password: "***" });
      await login(email, password);
      navigate("/");
    } catch (error) {
      console.log("Login error:", error);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setResetMessage("");

    try {
      // Simulate API call for reset password
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        }/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail }),
        }
      );

      if (response.ok) {
        setResetMessage(
          "Password reset instructions have been sent to your email."
        );
        setResetEmail("");
        // Auto close reset form after 3 seconds
        setTimeout(() => {
          setShowResetForm(false);
          setResetMessage("");
        }, 3000);
      } else {
        const data = await response.json();
        setError(
          data.message || "Failed to send reset email. Please try again."
        );
      }
    } catch (error) {
      console.log("Reset password error:", error);
      setError(
        "Failed to send reset email. Please check your connection and try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleShowResetForm = () => {
    setShowResetForm(true);
    setError("");
    setResetMessage("");
  };

  const handleBackToLogin = () => {
    setShowResetForm(false);
    setError("");
    setResetMessage("");
    setResetEmail("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", // Dark gradient like sidebar
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 3,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={1}
          sx={{
            p: 6,
            borderRadius: 1,
            backgroundColor: "white",
            border: "1px solid #ddd",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: "bold",
                color: "#60a5fa", // Light blue accent like app theme
                fontFamily: "'Segoe UI', sans-serif",
                letterSpacing: "-0.5px",
                mb: 2,
              }}
            >
              KPanel
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 500, color: "#334155", mb: 1 }}
            >
              Welcome Back
            </Typography>
            <Typography variant="body1" sx={{ color: "#64748b" }}>
              Sign in to your hosting control panel
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 1,
                backgroundColor: "#ffe6e6",
                border: "1px solid #ffcccc",
                color: "#d32f2f",
              }}
            >
              {error}
            </Alert>
          )}

          {resetMessage && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 1,
                backgroundColor: "#e8f5e8",
                border: "1px solid #c8e6c9",
                color: "#2e7d32",
              }}
            >
              {resetMessage}
            </Alert>
          )}

          {/* Form Container - Conditional Reset or Login */}
          {showResetForm ? (
            /* Reset Password Form */
            <Box component="form" onSubmit={handleResetPassword}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, color: "#333", fontWeight: 600 }}
                >
                  Reset Password
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: "#666" }}>
                  Enter your email address and we'll send you instructions to
                  reset your password.
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "#333", fontWeight: 500 }}
                >
                  Email Address
                </Typography>
                <TextField
                  required
                  fullWidth
                  id="resetEmail"
                  name="resetEmail"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="Enter your email address."
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "#999" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      backgroundColor: "#fafafa",
                      "& fieldset": {
                        borderColor: "#ddd",
                      },
                      "&:hover fieldset": {
                        borderColor: "#60a5fa",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#60a5fa",
                      },
                    },
                  }}
                />
              </Box>

              {/* Reset Password Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={resetLoading}
                sx={{
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: 1,
                  backgroundColor: "#60a5fa",
                  textTransform: "none",
                  mb: 2,
                  "&:hover": {
                    backgroundColor: "#3b82f6",
                  },
                  "&:disabled": {
                    backgroundColor: "#ccc",
                  },
                }}
              >
                {resetLoading ? "Sending..." : "Send Reset Instructions"}
              </Button>

              {/* Back to Login */}
              <Box sx={{ textAlign: "center" }}>
                <Link
                  component="button"
                  type="button"
                  onClick={handleBackToLogin}
                  variant="body2"
                  sx={{
                    color: "#60a5fa",
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  ← Back to Login
                </Link>
              </Box>
            </Box>
          ) : (
            /* Login Form */
            <Box component="form" onSubmit={handleSubmit}>
              {/* Username Field */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "#333", fontWeight: 500 }}
                >
                  Username
                </Typography>
                <TextField
                  required
                  fullWidth
                  id="email"
                  name="email"
                  autoComplete="email"
                  autoFocus={!showResetForm}
                  placeholder="Enter your username."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "#999" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      backgroundColor: "#fafafa",
                      "& fieldset": {
                        borderColor: "#ddd",
                      },
                      "&:hover fieldset": {
                        borderColor: "#60a5fa",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#60a5fa",
                      },
                    },
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "#333", fontWeight: 500 }}
                >
                  Password
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  placeholder="Enter your account password."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "#999" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                          sx={{ color: "#999" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      backgroundColor: "#fafafa",
                      "& fieldset": {
                        borderColor: "#ddd",
                      },
                      "&:hover fieldset": {
                        borderColor: "#60a5fa",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#60a5fa",
                      },
                    },
                  }}
                />
              </Box>

              {/* Login Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: 1,
                  backgroundColor: "#60a5fa",
                  textTransform: "none",
                  mb: 2,
                  "&:hover": {
                    backgroundColor: "#3b82f6",
                  },
                  "&:disabled": {
                    backgroundColor: "#ccc",
                  },
                }}
              >
                {loading ? "Signing in..." : "Log in"}
              </Button>

              {/* Reset Password Link */}
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Link
                  component="button"
                  type="button"
                  onClick={handleShowResetForm}
                  variant="body2"
                  sx={{
                    color: "#60a5fa",
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Reset Password
                </Link>
              </Box>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography variant="body2" sx={{ color: "#999", mb: 1 }}>
              Demo credentials: admin@kpanel.local / admin123
            </Typography>
            <Typography variant="body2" sx={{ color: "#999" }}>
              Copyright © 2025 KPanel. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log(
        "Making login API request to:",
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        }/auth/login`
      );
      console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);

      const response = await api.post("/auth/login", { email, password });
      console.log("Login response:", response.data);

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      setUser(user);
      setIsAuthenticated(true);

      console.log("Login successful - User set:", user);
      console.log("Login successful - isAuthenticated:", true);

      return response.data;
    } catch (error) {
      console.error("Login API error:", error);
      throw error.response?.data || error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

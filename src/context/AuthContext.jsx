import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

const getApiUrl = (url) => {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  
  const isNative = window.Capacitor || (window.location.origin.includes("localhost") && !window.location.port);
  if (isNative) {
    // Replace with your computer's Wi-Fi IP address (e.g. http://192.168.1.100:5000) for physical phone testing,
    // or use http://10.0.2.2:5000 for Android Emulator.
    return `http://10.0.2.2:5000${url}`;
  }
  return url;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Generate unique ID for toasts
  const showToast = (message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check if token exists on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        
        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify if JWT is expired by decoding the payload
          const payload = JSON.parse(atob(token.split(".")[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          
          if (isExpired) {
            logout();
            showToast("Session expired, please login again", "error");
          } else {
            setUser(parsedUser);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        const userData = {
          id: resData.data._id,
          name: resData.data.name,
          phone: resData.data.phone,
          email: email,
          role: resData.data.role,
        };
        
        localStorage.setItem("token", resData.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        showToast("Logged in successfully!", "success");
        return { success: true };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "Network connection failed" };
    }
  };

  const register = async (name, email, phone, password, role) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        showToast(resData.message || "Registration successful!", "success");
        return { success: true, data: resData.data };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      console.error("Register error:", err);
      return { success: false, message: "Network connection failed" };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        showToast("Email verified successfully! You can now log in.", "success");
        return { success: true };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      console.error("OTP Verification error:", err);
      return { success: false, message: "Network connection failed" };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/forgot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        showToast("Password reset link/token generated!", "success");
        return { success: true, data: resData.data };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      return { success: false, message: "Network connection failed" };
    }
  };

  const resetPassword = async (email, token, password) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        showToast("Password reset successfully!", "success");
        return { success: true };
      } else {
        return { success: false, message: resData.message };
      }
    } catch (err) {
      console.error("Reset password error:", err);
      return { success: false, message: "Network connection failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    showToast("Logged out successfully", "info");
  };

  // Helper function to call protected API endpoints
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(getApiUrl(url), {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      logout();
      showToast("Session expired, please login again", "error");
      throw new Error("Unauthorized");
    }
    
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        toasts,
        showToast,
        removeToast,
        login,
        register,
        verifyOtp,
        forgotPassword,
        resetPassword,
        logout,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

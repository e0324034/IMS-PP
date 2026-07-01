import React from "react";
import { useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [isDark, setIsDark] = React.useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/inventory":
        return "Inventory Catalog";
      case "/transactions":
        return "Activity Transactions Log";
      case "/profile":
        return "My Profile";
      default:
        return "Inventory Management";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="navbar">
      <div className="navbar-title">{getPageTitle()}</div>
      
      <div className="navbar-right">
        <button 
          onClick={toggleTheme} 
          className="btn-icon" 
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--text-primary)", 
            cursor: "pointer", 
            padding: "0.5rem", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            borderRadius: "50%",
            transition: "background var(--transition-fast)" 
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          {isDark ? <Sun size={20} style={{ color: "var(--warning)" }} /> : <Moon size={20} style={{ color: "var(--accent-primary)" }} />}
        </button>

        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar">{getInitials(user.name)}</div>
            <div className="user-info-text">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role ? `${user.role} Member` : "Staff Member"}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

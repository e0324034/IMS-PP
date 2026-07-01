import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Truck,
  Users,
  Warehouse,
  ArrowUpDown,
  ShoppingBag,
  TrendingUp,
  History,
  Settings,
  Bell,
  User,
  LogOut,
  PackageOpen,
  UserCog,
  ArrowLeftRight,
  RotateCcw,
  Trash2,
  Cpu,
  Coins,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    logout();
    navigate("/login");
  };

  // Enforces role permissions on frontend side navigation menu
  const getNavLinks = () => {
    const role = user?.role || "Staff";

    const allLinks = [
      { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Products", path: "/products", icon: <Package size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Categories", path: "/categories", icon: <FolderTree size={18} />, roles: ["Admin", "Manager"] },
      { name: "Suppliers", path: "/suppliers", icon: <Truck size={18} />, roles: ["Admin", "Manager"] },
      { name: "Customers", path: "/customers", icon: <Users size={18} />, roles: ["Admin", "Manager"] },
      { name: "Warehouses", path: "/warehouses", icon: <Warehouse size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Inventory Ledger", path: "/inventory", icon: <ArrowUpDown size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Stock Transfers", path: "/transfers", icon: <ArrowLeftRight size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Returns Manager", path: "/returns", icon: <RotateCcw size={18} />, roles: ["Admin", "Manager"] },
      { name: "Damage / Wastage", path: "/wastage", icon: <Trash2 size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Purchase Orders", path: "/purchases", icon: <ShoppingBag size={18} />, roles: ["Admin", "Manager"] },
      { name: "Sales Orders", path: "/sales", icon: <TrendingUp size={18} />, roles: ["Admin", "Manager"] },
      { name: "Expenses", path: "/expenses", icon: <Coins size={18} />, roles: ["Admin", "Manager"] },
      { name: "AI Analytics", path: "/ai-analytics", icon: <Cpu size={18} />, roles: ["Admin", "Manager"] },
      { name: "Reports & Stats", path: "/reports", icon: <History size={18} />, roles: ["Admin", "Manager"] },
      { name: "User Manager", path: "/users", icon: <UserCog size={18} />, roles: ["Admin"] },
      { name: "System Settings", path: "/settings", icon: <Settings size={18} />, roles: ["Admin"] },
      { name: "Help & Support", path: "/support", icon: <HelpCircle size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "Alerts Tray", path: "/notifications", icon: <Bell size={18} />, roles: ["Admin", "Manager", "Staff"] },
      { name: "My Profile", path: "/profile", icon: <User size={18} />, roles: ["Admin", "Manager", "Staff"] },
    ];

    return allLinks.filter(link => link.roles.includes(role));
  };

  return (
    <aside className="sidebar" style={{ overflowY: "auto" }}>
      <div className="sidebar-logo">
        <PackageOpen size={28} style={{ color: "var(--accent-primary)" }} />
        <div className="sidebar-logo-text">
          <span>Instatenders</span> IMS
        </div>
      </div>
      
      <ul className="sidebar-menu" style={{ paddingBottom: "1rem" }}>
        {getNavLinks().map((item) => (
          <li key={item.name} className="sidebar-item">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              end={item.path === "/"}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer" style={{ position: "sticky", bottom: 0, backgroundColor: "var(--bg-secondary)", zIndex: 10 }}>
        <button
          onClick={handleLogoutClick}
          className="sidebar-link"
          style={{
            width: "100%",
            border: "none",
            background: "none",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
          }}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

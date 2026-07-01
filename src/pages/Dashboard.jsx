import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  CircleDollarSign,
  AlertTriangle,
  ArchiveX,
  History,
  TrendingUp,
  Award,
  ShoppingCart,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Percent,
  Download,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { fetchWithAuth, showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await fetchWithAuth("/api/dashboard/stats");
      const resData = await response.json();
      if (resData.status === "success") {
        setStats(resData.data);
      }
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      showToast("Could not load dashboard statistics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExcelExport = () => {
    try {
      showToast("Generating Excel file...", "info");
      
      let csvContent = "";
      
      const escapeValue = (val) => {
        if (val === undefined || val === null) return "";
        let valString = String(val).replace(/"/g, '""');
        if (valString.includes(",") || valString.includes("\n") || valString.includes('"')) {
          valString = `"${valString}"`;
        }
        return valString;
      };

      // 1. Title/Header Section
      csvContent += `"INVENTORY MANAGEMENT SYSTEM - DASHBOARD DETAILS REPORT"\r\n`;
      csvContent += `"Generated on:","${new Date().toLocaleString()}"\r\n\r\n`;

      // 2. KPI Summary Section
      csvContent += `"I. DASHBOARD KEY PERFORMANCE INDICATORS (KPIs)"\r\n`;
      csvContent += `"Metric","Value","Detail"\r\n`;
      
      const invVal = stats?.inventory?.valuation || 0;
      const revVal = stats?.sales?.revenue || 0;
      const profitVal = stats?.sales?.profit || 0;
      const totalProds = stats?.inventory?.totalProducts || 0;
      const activeStock = stats?.inventory?.availableStock || 0;
      const lowStock = stats?.inventory?.lowStock || 0;
      const outOfStock = stats?.inventory?.outOfStock || 0;
      const todaySales = stats?.sales?.todaySales || 0;
      const totalPOs = stats?.purchases?.totalPOs || 0;
      const pendingDeliveries = stats?.purchases?.pendingDeliveries || 0;

      csvContent += `"Total Products",${totalProds},"${activeStock} active in stock"\r\n`;
      csvContent += `"Inventory Value","₹${invVal.toFixed(2)}","Total cost valuation"\r\n`;
      csvContent += `"Total Revenue","₹${revVal.toFixed(2)}","Today sales: ₹${todaySales.toFixed(2)}"\r\n`;
      csvContent += `"Net Profit","₹${profitVal.toFixed(2)}","COGS logic applied"\r\n`;
      csvContent += `"Low Stock Items",${lowStock},"Reorder suggestion trigger"\r\n`;
      csvContent += `"Out Of Stock",${outOfStock},"Zero balance count"\r\n`;
      csvContent += `"Purchase Orders",${totalPOs},"${pendingDeliveries} deliveries pending"\r\n\r\n`;

      // 3. Monthly Sales Trend Section
      csvContent += `"II. MONTHLY SALES TREND"\r\n`;
      csvContent += `"Month","Sales (₹)"\r\n`;
      if (stats?.charts?.monthlySales && stats.charts.monthlySales.length > 0) {
        stats.charts.monthlySales.forEach(m => {
          csvContent += `"${m.month}",${m.sales.toFixed(2)}\r\n`;
        });
      } else {
        csvContent += `"No data available",""\r\n`;
      }
      csvContent += `\r\n`;

      // 4. Top Selling Products Section
      csvContent += `"III. TOP SELLING PRODUCTS"\r\n`;
      csvContent += `"Rank","Product Name","Quantity Sold (Units)"\r\n`;
      if (stats?.charts?.topSelling && stats.charts.topSelling.length > 0) {
        stats.charts.topSelling.forEach((prod, index) => {
          csvContent += `${index + 1},${escapeValue(prod.name)},${prod.value}\r\n`;
        });
      } else {
        csvContent += `"No data available","",""\r\n`;
      }
      csvContent += `\r\n`;

      // 5. Recent Activity Ledger Section
      csvContent += `"IV. RECENT STOCK MOVEMENTS LEDGER"\r\n`;
      csvContent += `"Product","Type","Quantity","Warehouse / Locations","Reason","Date & Time"\r\n`;
      if (stats?.recentTransactions && stats.recentTransactions.length > 0) {
        stats.recentTransactions.forEach(tx => {
          const warehouseDetail = (tx.warehouse || "") + (tx.toWarehouse ? ` -> ${tx.toWarehouse}` : "");
          csvContent += `${escapeValue(tx.productName)},"${tx.type || ""}",${tx.quantity || 0},${escapeValue(warehouseDetail)},${escapeValue(tx.reason || "")},"${new Date(tx.createdAt).toLocaleString()}"\r\n`;
        });
      } else {
        csvContent += `"No recent transactions logged","","","","",""\r\n`;
      }
      
      // Download link trigger
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard_details_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast("Dashboard details exported successfully to Excel/CSV!", "success");
    } catch (error) {
      console.error("Dashboard export error:", error);
      showToast("Failed to export dashboard details", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // 1. KPI Widget Definitions
  const invVal = stats?.inventory?.valuation || 0;
  const revVal = stats?.sales?.revenue || 0;
  const profitVal = stats?.sales?.profit || 0;

  const cards = [
    {
      title: "Total Products",
      value: stats?.inventory?.totalProducts || 0,
      subtext: `${stats?.inventory?.availableStock || 0} active in stock`,
      icon: <Package size={22} />,
      colorClass: "primary",
    },
    {
      title: "Inventory Value",
      value: `₹${invVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: "Total cost valuation",
      icon: <CircleDollarSign size={22} />,
      colorClass: "success",
    },
    {
      title: "Total Revenue",
      value: `₹${revVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: `Today: ₹${(stats?.sales?.todaySales || 0).toLocaleString()}`,
      icon: <TrendingUp size={22} />,
      colorClass: "success",
    },
    {
      title: "Net Profit",
      value: `₹${profitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: `COGS logic applied`,
      icon: <Percent size={22} />,
      colorClass: "primary",
    },
    {
      title: "Low Stock Items",
      value: stats?.inventory?.lowStock || 0,
      subtext: "Reorder suggestion trigger",
      icon: <AlertTriangle size={22} />,
      colorClass: "warning",
    },
    {
      title: "Out Of Stock",
      value: stats?.inventory?.outOfStock || 0,
      subtext: "Zero balance count",
      icon: <ArchiveX size={22} />,
      colorClass: "danger",
    },
    {
      title: "Purchase Orders",
      value: stats?.purchases?.totalPOs || 0,
      subtext: `${stats?.purchases?.pendingDeliveries || 0} deliveries pending`,
      icon: <ShoppingCart size={22} />,
      colorClass: "warning",
    },
  ];

  // Helper: Find maximum sales value to scale monthly bars
  const maxSales = stats?.charts?.monthlySales 
    ? Math.max(...stats.charts.monthlySales.map(m => m.sales), 1000) 
    : 1000;

  return (
    <div>
      {/* Dashboard Header with Export Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Overview Metrics
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Real-time business performance indicators & catalog analysis
          </p>
        </div>
        <button 
          onClick={handleExcelExport} 
          className="btn-secondary" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            background: "rgba(255, 255, 255, 0.03)", 
            borderColor: "var(--border-color)",
            padding: "0.6rem 1.2rem",
            fontSize: "0.9rem",
            borderRadius: "10px"
          }}
        >
          <Download size={16} style={{ color: "var(--accent-secondary)" }} />
          Export to Excel
        </button>
      </div>

      {/* Grid widgets */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {cards.map((card) => (
          <div key={card.title} className="kpi-card">
            <div className={`kpi-icon-wrapper ${card.colorClass}`}>{card.icon}</div>
            <div className="kpi-details">
              <div className="kpi-title">{card.title}</div>
              <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{card.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {card.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts split */}
      <div className="dashboard-split" style={{ marginTop: "2rem" }}>
        {/* Monthly Sales bar chart (Vertical CSS bars) */}
        <div className="content-box" style={{ display: "flex", flexDirection: "column", height: "360px" }}>
          <h3 className="content-box-title" style={{ marginBottom: "2rem" }}>
            <TrendingUp size={18} style={{ color: "var(--accent-secondary)" }} />
            Monthly Sales Trend (₹)
          </h3>
          
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "space-between", padding: "0 1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            {stats?.charts?.monthlySales?.map((m) => {
              const barHeight = Math.max(5, Math.round((m.sales / maxSales) * 100));
              return (
                <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: "55px" }}>
                  {/* Tooltip on hover style bar */}
                  <div style={{ position: "relative", width: "100%", height: "200px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        height: `${barHeight}%`, 
                        width: "28px", 
                        borderRadius: "6px 6px 0 0", 
                        transition: "height 0.8s ease",
                        position: "relative",
                        cursor: "pointer",
                      }}
                      title={`₹${m.sales.toFixed(2)}`}
                    >
                      <div className="bar-tooltip" style={{ display: "none" }}>₹{m.sales}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem", textAlign: "center", whiteSpace: "nowrap" }}>
                    {m.month.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top selling products (Progress bars) */}
        <div className="content-box" style={{ height: "360px" }}>
          <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
            <Award size={18} style={{ color: "var(--accent-primary)" }} />
            Top Selling Products (Qty)
          </h3>

          {stats?.charts?.topSelling && stats.charts.topSelling.length > 0 ? (
            <div className="category-progress-list" style={{ gap: "1.5rem" }}>
              {stats.charts.topSelling.map((prod, idx) => {
                const maxQty = stats.charts.topSelling[0].value || 1;
                const percent = Math.round((prod.value / maxQty) * 100);
                return (
                  <div key={prod.name} className="category-progress-item">
                    <div className="category-label">
                      <span className="category-name">
                        <span style={{ color: "var(--accent-secondary)", marginRight: "0.5rem" }}>#{idx+1}</span>
                        {prod.name}
                      </span>
                      <span className="category-stats" style={{ fontWeight: 600 }}>{prod.value} units</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: "10px" }}>
                      <div className="progress-bar-fill" style={{ width: `${percent}%`, background: "linear-gradient(90deg, var(--accent-primary-hover), var(--accent-secondary))" }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
              No sales recorded. Log customer payments to compute stats.
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="content-box">
        <div className="content-box-header">
          <h3 className="content-box-title">
            <History size={18} style={{ color: "var(--accent-primary)" }} />
            Recent Stock Movements Ledger
          </h3>
          <Link to="/inventory" style={{ fontSize: "0.85rem", color: "var(--accent-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Open Stock Ledger <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Warehouse</th>
                  <th>Reason</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td style={{ fontWeight: 600 }}>{tx.productName}</td>
                    <td>
                      <span className={`badge ${tx.type === "IN" ? "success" : tx.type === "OUT" ? "danger" : tx.type === "TRANSFER" ? "primary" : "warning"}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                    <td>{tx.warehouse} {tx.toWarehouse ? `→ ${tx.toWarehouse}` : ""}</td>
                    <td style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{tx.reason}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No recent movements logged.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

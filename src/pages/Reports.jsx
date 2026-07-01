import React, { useState, useEffect } from "react";
import { TrendingUp, BarChart2, DollarSign, PieChart, ShieldAlert, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Reports = () => {
  const { fetchWithAuth, showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/dashboard/stats");
      const resData = await response.json();
      if (resData.status === "success") {
        setStats(resData.data);
      }
    } catch (error) {
      console.error("Load stats error:", error);
      showToast("Could not load financial stats", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExport = () => {
    try {
      showToast("Generating Financial Report Excel...", "info");
      
      let csvContent = "";
      
      const escapeValue = (val) => {
        if (val === undefined || val === null) return "";
        let valString = String(val).replace(/"/g, '""');
        if (valString.includes(",") || valString.includes("\n") || valString.includes('"')) {
          valString = `"${valString}"`;
        }
        return valString;
      };

      // Header
      csvContent += `"FINANCIAL PERFORMANCE & VALUATION REPORT"\r\n`;
      csvContent += `"Generated on:","${new Date().toLocaleString()}"\r\n\r\n`;

      // 1. KPI
      csvContent += `"I. KEY FINANCIAL METRICS"\r\n`;
      csvContent += `"Metric","Value","Description"\r\n`;
      csvContent += `"Gross Revenue","₹${revenue.toFixed(2)}","Total invoiced payments"\r\n`;
      csvContent += `"Cost of Goods Sold (COGS)","₹${cogs.toFixed(2)}","Purchase/Cost basis of sold goods"\r\n`;
      csvContent += `"Net Profit","₹${profit.toFixed(2)}","Revenue minus product COGS"\r\n`;
      csvContent += `"Profit Margin","${profitMargin}%","Net profit margin percentage"\r\n`;
      csvContent += `"Stock Valuation","₹${valuation.toFixed(2)}","Asset valuation cost basis"\r\n\r\n`;

      // 2. Category
      csvContent += `"II. CATEGORY STOCK VALUATION BREAKDOWN"\r\n`;
      csvContent += `"Category Name","Valuation (₹)","Share (%)"\r\n`;
      (stats?.categoryData || []).forEach(cat => {
        const totalVal = valuation || 1;
        const percent = Math.round((cat.value / totalVal) * 100);
        csvContent += `${escapeValue(cat.name)},${cat.value.toFixed(2)},"${percent}%"\r\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Financial report exported successfully!", "success");
    } catch (error) {
      console.error("Reports export error:", error);
      showToast("Export failed", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const valuation = stats?.inventory?.valuation || 0;
  const revenue = stats?.sales?.revenue || 0;
  const profit = stats?.sales?.profit || 0;
  const cogs = Math.max(0, revenue - profit);
  
  // Calculate Profit Margin
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 12px", fontSize: "0.9rem", borderRadius: "10px" }}>
          <Download size={16} style={{ color: "var(--accent-secondary)" }} />
          Export to Excel
        </button>
      </div>

      {/* Financial stats cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrapper success" style={{ color: "var(--accent-secondary)", backgroundColor: "rgba(6, 182, 212, 0.1)" }}>
            <DollarSign size={24} />
          </div>
          <div className="kpi-details">
            <div className="kpi-title">Gross Revenue</div>
            <div className="kpi-value">₹{revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Total invoiced payments</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper success">
            <DollarSign size={24} />
          </div>
          <div className="kpi-details">
            <div className="kpi-title">Net Profit</div>
            <div className="kpi-value">₹{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Revenue minus product COGS</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper primary">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-details">
            <div className="kpi-title">Profit Margin</div>
            <div className="kpi-value">{profitMargin}%</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Net profit margin percentage</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper warning">
            <PieChart size={24} />
          </div>
          <div className="kpi-details">
            <div className="kpi-title">Stock Valuation</div>
            <div className="kpi-value">₹{valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Asset valuation cost basis</div>
          </div>
        </div>
      </div>

      <div className="dashboard-split" style={{ marginTop: "2rem" }}>
        {/* Category distribution visual report */}
        <div className="content-box">
          <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
            <BarChart2 size={18} style={{ color: "var(--accent-secondary)" }} />
            Category Stock Valuation Breakdown
          </h3>

          {stats?.categoryData && stats.categoryData.length > 0 ? (
            <div className="category-progress-list" style={{ gap: "1.5rem" }}>
              {stats.categoryData.map((cat) => {
                const totalVal = stats.inventory.valuation || 1;
                const percent = Math.round((cat.value / totalVal) * 100);
                return (
                  <div key={cat.name} className="category-progress-item">
                    <div className="category-label">
                      <span className="category-name">{cat.name}</span>
                      <span className="category-stats">
                        ${cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percent}%)
                      </span>
                    </div>
                    <div className="progress-bar-container" style={{ height: "10px" }}>
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
              No category metrics logged. Create products with categories.
            </div>
          )}
        </div>

        {/* COGS vs Profit Cost Chart Progress */}
        <div className="content-box">
          <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
            Financial Margin breakdown
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                <span>Total Revenue</span>
                <strong>₹{revenue.toLocaleString()}</strong>
              </div>
              <div className="progress-bar-container" style={{ height: "12px" }}>
                <div className="progress-bar-fill" style={{ width: "100%", background: "var(--accent-secondary)" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                <span>Cost of Goods Sold (COGS)</span>
                <strong>₹{cogs.toLocaleString()}</strong>
              </div>
              <div className="progress-bar-container" style={{ height: "12px" }}>
                <div className="progress-bar-fill" style={{ width: `${revenue > 0 ? Math.round((cogs/revenue)*100) : 0}%`, background: "var(--danger)" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                <span>Net Profit Contribution</span>
                <strong>₹{profit.toLocaleString()}</strong>
              </div>
              <div className="progress-bar-container" style={{ height: "12px" }}>
                <div className="progress-bar-fill" style={{ width: `${revenue > 0 ? Math.round((profit/revenue)*100) : 0}%`, background: "var(--success)" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

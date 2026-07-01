import React, { useState, useEffect } from "react";
import { Cpu, AlertTriangle, AlertCircle, RefreshCw, ShoppingBag, Clock, TrendingUp, Award, Activity, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const AIAnalytics = () => {
  const { fetchWithAuth, showToast } = useAuth();

  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/ai/predictions");
      const resData = await response.json();
      if (resData.status === "success") {
        setPredictions(resData.data);
      }
    } catch (error) {
      console.error("Load AI predictions error:", error);
      showToast("Could not load AI forecasting predictions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const handleExport = () => {
    try {
      showToast("Generating AI Analytics Excel Report...", "info");
      
      let csvContent = "";
      
      const escapeValue = (val) => {
        if (val === undefined || val === null) return "";
        let valString = String(val).replace(/"/g, '""');
        if (valString.includes(",") || valString.includes("\n") || valString.includes('"')) {
          valString = `"${valString}"`;
        }
        return valString;
      };

      // 1. Header
      csvContent += `"AI INVENTORY FORECASTING & PERFORMANCE REPORT"\r\n`;
      csvContent += `"Generated on:","${new Date().toLocaleString()}"\r\n\r\n`;

      // 2. Out of stock forecast
      csvContent += `"I. DEMAND RUN-RATE & REORDER SUGGESTIONS"\r\n`;
      csvContent += `"Product Name","SKU","Category","Current Stock","Daily Run Rate","Days until Stockout","Suggested Reorder Qty","Recommended Supplier"\r\n`;
      (predictions?.demandPredictions || []).forEach(p => {
        csvContent += `${escapeValue(p.name)},"${p.sku}","${p.category}",${p.currentStock},${p.dailyRunRate},"${p.daysUntilOutOfStock || 'Stable'}",${p.suggestedReorderQty},${escapeValue(p.recommendedSupplier)}\r\n`;
      });
      csvContent += "\r\n";

      // 3. Slow Moving
      csvContent += `"II. SLOW MOVING INVENTORY (UNSOLD FOR 30+ DAYS)"\r\n`;
      csvContent += `"Product Name","SKU","Category","Current Stock","Days Unsold"\r\n`;
      (predictions?.slowMoving || []).forEach(p => {
        csvContent += `${escapeValue(p.name)},"${p.sku}","${p.category}",${p.currentStock},${p.daysUnsold}\r\n`;
      });
      csvContent += "\r\n";

      // 4. Expiry Risks
      csvContent += `"III. STOCK EXPIRY RISKS"\r\n`;
      csvContent += `"Product Name","SKU","Category","Current Stock","Batch No","Expiry Date","Days until Expiry"\r\n`;
      (predictions?.expiryRisks || []).forEach(p => {
        csvContent += `${escapeValue(p.name)},"${p.sku}","${p.category}",${p.currentStock},"${p.batchNumber || ''}","${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : ''}",${p.daysUntilExpiry || 0}\r\n`;
      });
      csvContent += "\r\n";

      // 5. Suppliers
      csvContent += `"IV. SUPPLIER SCORECARD PERFORMANCE"\r\n`;
      csvContent += `"Supplier Name","Avg Lead Time (Days)","On-Time Delivery Rate","Grade"\r\n`;
      (predictions?.suppliers || []).forEach(s => {
        csvContent += `${escapeValue(s.name)},${s.avgLeadTime || 0},"${s.onTimeRate || 0}%","${s.grade || ''}"\r\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai_inventory_intelligence_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("AI Analytics report exported successfully!", "success");
    } catch (error) {
      console.error("AI Export error:", error);
      showToast("Export failed", "error");
    }
  };

  const handleAutoReorder = async (p) => {
    try {
      setSubmitting(true);
      // Auto-generate a purchase order from low stock alert
      const response = await fetchWithAuth("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierName: p.recommendedSupplier || "Nellai Spices & Organics Ltd.",
          warehouse: "Chennai Central Depot",
          items: [{
            product: p.productId,
            productName: p.name,
            quantity: p.suggestedReorderQty,
            costPrice: 50 // placeholder cost
          }],
          remarks: `AI Generated Reorder recommendation for SKU ${p.sku}`
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(`Auto-created Purchase Order for ${p.name}!`, "success");
        loadPredictions();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Auto reorder error:", error);
      showToast("Failed to trigger reorder PO", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={24} style={{ color: "var(--accent-primary)" }} />
          <h2 style={{ margin: 0 }}>AI Predictions & Demand Intelligence</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}>
            <Download size={16} /> Export to Excel
          </button>
          <button className="btn-secondary" onClick={loadPredictions} style={{ padding: "0.6rem" }} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spinner" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <div className="spinner" style={{ width: "45px", height: "45px" }}></div>
        </div>
      ) : predictions ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Top Level KPI Widgets */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
            <div className="kpi-card">
              <div className="kpi-icon-wrapper danger">
                <AlertCircle size={24} />
              </div>
              <div className="kpi-details">
                <div className="kpi-title">Out of Stock Risks</div>
                <div className="kpi-value">{predictions.demandPredictions.filter(p => p.currentStock === 0).length} Items</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Immediate replenishment needed</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon-wrapper warning">
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-details">
                <div className="kpi-title">Low Stock Items</div>
                <div className="kpi-value">{predictions.demandPredictions.filter(p => p.currentStock > 0 && p.currentStock <= 15).length} Items</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Stock levels below reorder alarm</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon-wrapper success" style={{ color: "var(--accent-secondary)", backgroundColor: "rgba(6, 182, 212, 0.1)" }}>
                <TrendingUp size={24} />
              </div>
              <div className="kpi-details">
                <div className="kpi-title">Active Top Sellers</div>
                <div className="kpi-value">{predictions.topSellers.length} Items</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>High velocity inventory</div>
              </div>
            </div>
          </div>

          {/* Section 1: Demand Run-Rate & Reorder suggestions */}
          <div className="content-box">
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <ShoppingBag size={18} style={{ color: "var(--accent-primary)" }} />
              AI Stockout Forecast & Reorder Planner
            </h3>
            
            <div className="table-responsive">
              <table className="custom-table" style={{ fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Sales Run-Rate (Daily)</th>
                    <th>Days Until Out of Stock</th>
                    <th>Suggested Reorder Qty</th>
                    <th>Recommended Supplier</th>
                    <th style={{ textAlign: "right" }}>Auto-Replenish</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.demandPredictions.map((p, idx) => {
                    const isUrgent = p.currentStock === 0 || (typeof p.daysUntilOutOfStock === "number" && p.daysUntilOutOfStock <= 7);
                    return (
                      <tr key={idx} style={{ backgroundColor: isUrgent ? "rgba(239, 68, 68, 0.02)" : "transparent" }}>
                        <td>
                          <strong>{p.name}</strong>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>SKU: {p.sku} | Category: {p.category}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: p.currentStock === 0 ? "var(--danger)" : (p.currentStock <= 15 ? "var(--warning)" : "var(--text-primary)") }}>
                          {p.currentStock} units
                        </td>
                        <td>{p.dailyRunRate} units/day</td>
                        <td>
                          {p.currentStock === 0 ? (
                            <span className="badge danger">Out of Stock</span>
                          ) : (
                            typeof p.daysUntilOutOfStock === "number" ? (
                              <span className="badge" style={{ 
                                backgroundColor: p.daysUntilOutOfStock <= 5 ? "rgba(239, 68, 68, 0.15)" : "rgba(234, 179, 8, 0.15)",
                                color: p.daysUntilOutOfStock <= 5 ? "var(--danger)" : "var(--warning)"
                              }}>
                                Runout: {p.daysUntilOutOfStock} days
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Stable</span>
                            )
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {p.suggestedReorderQty > 0 ? (
                            <span style={{ color: "var(--accent-secondary)" }}>+ {p.suggestedReorderQty} units</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>0</span>
                          )}
                        </td>
                        <td>{p.recommendedSupplier}</td>
                        <td style={{ textAlign: "right" }}>
                          {p.suggestedReorderQty > 0 ? (
                            <button className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }} onClick={() => handleAutoReorder(p)} disabled={submitting}>
                              Order PO
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Stock OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            
            {/* Expiry Risk Warnings */}
            <div className="content-box">
              <h3 className="content-box-title" style={{ marginBottom: "1rem" }}>
                <Clock size={18} style={{ color: "var(--warning)" }} />
                Expiry Risk Alerts (Food / Groceries)
              </h3>
              
              {predictions.expiryRisks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {predictions.expiryRisks.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "rgba(234,179,8,0.02)" }}>
                      <div>
                        <strong>{item.name}</strong>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Stock: {item.quantity} units | Age: {item.ageInDays} days unsold</span>
                      </div>
                      <span className={`badge ${item.riskLevel === "HIGH" ? "danger" : "warning"}`} style={{ height: "fit-content" }}>
                        {item.riskLevel} RISK
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No imminent grocery expiry risks detected. Stock velocity is normal.
                </div>
              )}
            </div>

            {/* Slow Moving Inventory */}
            <div className="content-box">
              <h3 className="content-box-title" style={{ marginBottom: "1rem" }}>
                <Activity size={18} style={{ color: "var(--text-secondary)" }} />
                Slow-Moving Stock Detector (&gt;30 Days)
              </h3>
              
              {predictions.slowMovingProducts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {predictions.slowMovingProducts.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                      <div>
                        <strong>{item.name}</strong>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>SKU: {item.sku} | In-stock: {item.currentStock} units</span>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "right" }}>
                        Unsold for {item.daysInStock} days
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No slow-moving stocks detected.
                </div>
              )}
            </div>

          </div>

          {/* Supplier Performance Grading */}
          <div className="content-box">
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <Award size={18} style={{ color: "var(--accent-secondary)" }} />
              Supplier Intelligence & Scorecard Predictions
            </h3>

            <div className="table-responsive">
              <table className="custom-table" style={{ fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    <th>Supplier Partner</th>
                    <th>Average PO Lead-time</th>
                    <th>Satisfaction Score</th>
                    <th style={{ textAlign: "right" }}>AI Rating Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.supplierPerformance.map((sup, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{sup.name}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Clock size={14} style={{ color: "var(--text-muted)" }} />
                          {sup.avgLeadTimeDays} days delivery average
                        </span>
                      </td>
                      <td>{sup.rating} / 5 Rating</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="badge" style={{ 
                          fontSize: "1rem",
                          fontWeight: "bold",
                          backgroundColor: sup.performanceGrade.startsWith("A") ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                          color: sup.performanceGrade.startsWith("A") ? "var(--success)" : "var(--warning)",
                          padding: "0.25rem 0.75rem"
                        }}>
                          Grade {sup.performanceGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
          No analytics data loaded.
        </div>
      )}
    </div>
  );
};

export default AIAnalytics;

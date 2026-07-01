import React, { useState, useEffect } from "react";
import { Bell, AlertTriangle, ArchiveX, ShieldCheck, ArrowRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Notifications = () => {
  const { fetchWithAuth, showToast } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/products");
      const resData = await response.json();
      if (resData.status === "success") {
        setProducts(resData.data);
      }
    } catch (error) {
      console.error("Load products error:", error);
      showToast("Could not load products alerts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleExport = () => {
    try {
      const alertData = [
        ...outOfStockAlerts.map(p => ({ ...p, status: "Out Of Stock" })),
        ...lowStockAlerts.map(p => ({ ...p, status: "Low Stock" })),
        ...excessStockAlerts.map(p => ({ ...p, status: "Excess Stock" }))
      ];
      const headers = ['name', 'sku', 'quantity', 'minimumStock', 'maximumStock', 'status'];
      exportToCSV(alertData, headers, `stock_alerts_${Date.now()}.csv`, showToast);
    } catch (e) {
      console.error(e);
      showToast("Export failed", "error");
    }
  };

  // Compute Alerts on the fly
  const outOfStockAlerts = products.filter(p => p.quantity === 0);
  const lowStockAlerts = products.filter(p => p.quantity > 0 && p.quantity <= p.minimumStock);
  const excessStockAlerts = products.filter(p => p.quantity >= p.maximumStock);

  const totalAlerts = outOfStockAlerts.length + lowStockAlerts.length + excessStockAlerts.length;

  return (
    <div>
      <div className="content-box">
        <div className="content-box-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 className="content-box-title" style={{ margin: 0 }}>
            <Bell size={18} style={{ color: "var(--accent-primary)" }} />
            System Stock Alerts Tray ({totalAlerts} active)
          </h3>
          <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <Download size={14} /> Export to Excel
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : totalAlerts > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Out of Stock Alerts */}
            {outOfStockAlerts.map(p => (
              <div key={p._id} className="test-fallback-banner" style={{ borderColor: "rgba(239, 68, 68, 0.25)", backgroundColor: "rgba(239, 68, 68, 0.05)", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <ArchiveX size={20} style={{ color: "var(--danger)" }} />
                  <div>
                    <strong style={{ color: "var(--danger)" }}>Out Of Stock: {p.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      SKU: {p.sku} &bull; Current Quantity: <strong>0 units</strong>
                    </div>
                  </div>
                </div>
                <Link to="/inventory" className="auth-link" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Restock <ArrowRight size={14} />
                </Link>
              </div>
            ))}

            {/* Low Stock Alerts */}
            {lowStockAlerts.map(p => (
              <div key={p._id} className="test-fallback-banner" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <AlertTriangle size={20} style={{ color: "var(--warning)" }} />
                  <div>
                    <strong style={{ color: "var(--warning)" }}>Low Stock Alert: {p.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      SKU: {p.sku} &bull; Current Quantity: <strong>{p.quantity} units</strong> (Min Limit: {p.minimumStock})
                    </div>
                  </div>
                </div>
                <Link to="/inventory" className="auth-link" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Restock <ArrowRight size={14} />
                </Link>
              </div>
            ))}

            {/* Excess Capacity Alerts */}
            {excessStockAlerts.map(p => (
              <div key={p._id} className="test-fallback-banner" style={{ borderColor: "rgba(139, 92, 246, 0.25)", backgroundColor: "rgba(139, 92, 246, 0.05)", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <ShieldCheck size={20} style={{ color: "var(--accent-primary)" }} />
                  <div>
                    <strong style={{ color: "var(--accent-primary)" }}>Warehouse Capacity Alert: {p.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      SKU: {p.sku} &bull; Quantity: <strong>{p.quantity} units</strong> exceeds max limit capacity of {p.maximumStock}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>At capacity</span>
              </div>
            ))}

          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            <ShieldCheck size={48} style={{ color: "var(--success)", marginBottom: "1rem", display: "inline-block" }} />
            <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>All stock levels healthy!</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>No low stock or out of stock items detected in your catalog.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

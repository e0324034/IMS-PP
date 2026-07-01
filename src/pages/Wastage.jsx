import React, { useState, useEffect } from "react";
import { Trash2, Plus, Eye, RefreshCw, X, AlertTriangle, AlertOctagon, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Wastage = () => {
  const { fetchWithAuth, showToast } = useAuth();

  const [damages, setDamages] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Defective");
  const [remarks, setRemarks] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      
      const dmgRes = await fetchWithAuth("/api/damage");
      const dmgData = await dmgRes.json();
      if (dmgData.status === "success") {
        setDamages(dmgData.data);
      }

      const prodRes = await fetchWithAuth("/api/products");
      const prodData = await prodRes.json();
      if (prodData.status === "success") {
        setProducts(prodData.data);
      }

      const whRes = await fetchWithAuth("/api/warehouses");
      const whData = await whRes.json();
      if (whData.status === "success") {
        setWarehouses(whData.data);
      }

    } catch (error) {
      console.error("Load damages error:", error);
      showToast("Could not load damage logs data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = () => {
    const headers = ['productName', 'quantity', 'warehouse', 'reason', 'remarks', 'createdAt'];
    exportToCSV(damages, headers, `wastage_logs_${Date.now()}.csv`, showToast);
  };

  const handleCreateDamage = async (e) => {
    e.preventDefault();

    if (!selectedProduct || !selectedWarehouse || !quantity || !reason) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    const prod = products.find(p => p._id === selectedProduct);
    if (!prod) return;

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/damage", {
        method: "POST",
        body: JSON.stringify({
          product: selectedProduct,
          productName: prod.name,
          warehouse: selectedWarehouse,
          quantity: Number(quantity),
          reason,
          remarks
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Wastage record created successfully", "success");
        setIsAddModalOpen(false);
        // Clear fields
        setSelectedProduct("");
        setSelectedWarehouse("");
        setQuantity("");
        setReason("Defective");
        setRemarks("");
        loadData();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Record wastage error:", error);
      showToast("Failed to record wastage", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Aggregate wastage quantities by reason
  const getReasonStats = () => {
    const stats = {
      Expired: 0,
      Broken: 0,
      Lost: 0,
      Defective: 0,
      "Water Damage": 0
    };

    damages.forEach(d => {
      if (stats[d.reason] !== undefined) {
        stats[d.reason] += d.quantity;
      }
    });

    const maxVal = Math.max(...Object.values(stats), 1);
    return Object.entries(stats).map(([k, v]) => ({
      name: k,
      count: v,
      percentage: Math.round((v / maxVal) * 100)
    }));
  };

  const getReasonColor = (r) => {
    switch (r) {
      case "Expired": return "var(--danger)";
      case "Broken": return "#f97316"; // orange
      case "Water Damage": return "var(--accent-secondary)";
      case "Lost": return "var(--text-secondary)";
      default: return "var(--accent-primary-hover)";
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        
        {/* Main Wastage Table list */}
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <Trash2 size={18} style={{ color: "var(--danger)" }} />
              Product Wastage & Damage Logs
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
              </button>
              <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", backgroundColor: "var(--danger)" }}>
                <Plus size={16} /> Log Damage
              </button>
              <button className="btn-secondary" onClick={loadData} style={{ padding: "0.5rem" }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : damages.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ref Code</th>
                    <th>Product Name</th>
                    <th>Warehouse Location</th>
                    <th>Wasted Qty</th>
                    <th>Damage Reason</th>
                    <th>Reported By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {damages.map((dmg) => (
                    <tr key={dmg._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{dmg.wastageNumber}</td>
                      <td style={{ fontWeight: 600 }}>{dmg.productName}</td>
                      <td>{dmg.warehouse}</td>
                      <td style={{ color: "var(--danger)", fontWeight: 700 }}>{dmg.quantity} units</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", color: getReasonColor(dmg.reason), border: `1px solid ${getReasonColor(dmg.reason)}` }}>
                          {dmg.reason}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{dmg.reportedBy}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {new Date(dmg.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No product damages logged. All stock is in perfect condition!
            </div>
          )}
        </div>

        {/* Sidebar Breakdown widgets */}
        <div>
          <div className="content-box">
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
              Wastage Breakdown
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {getReasonStats().map((stat) => (
                <div key={stat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                    <span>{stat.name}</span>
                    <strong style={{ color: getReasonColor(stat.name) }}>{stat.count} units</strong>
                  </div>
                  <div className="progress-bar-container" style={{ height: "8px" }}>
                    <div className="progress-bar-fill" style={{ width: `${stat.percentage}%`, background: getReasonColor(stat.name) }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "2.5rem", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "rgba(239, 68, 68, 0.03)" }}>
              <AlertOctagon size={24} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <strong>Attention:</strong> Wasted items are instantly written off from active warehouse stock and the main catalog counts.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Log Damage Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Stock Damage / Wastage</h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDamage}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Wasted Product *</label>
                  <select className="form-input" style={{ paddingLeft: "1rem" }} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku}) - Stock: {p.quantity}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Warehouse Depot Location *</label>
                  <select className="form-input" style={{ paddingLeft: "1rem" }} value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} required>
                    <option value="">-- Select Warehouse Depot --</option>
                    {warehouses.map(wh => (
                      <option key={wh._id} value={wh.warehouseName}>{wh.warehouseName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Quantity to Deduct *</label>
                    <input type="number" min="1" className="form-input" style={{ paddingLeft: "1rem" }} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Wastage Reason *</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={reason} onChange={(e) => setReason(e.target.value)} required>
                      <option value="Expired">Expired Stock</option>
                      <option value="Broken">Broken / Damaged</option>
                      <option value="Lost">Lost / Inventory Shrink</option>
                      <option value="Defective">Defective / Manufacturing Fault</option>
                      <option value="Water Damage">Water / Weather Damage</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Internal Remarks</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "70px", resize: "none" }} placeholder="Describe damages, report incident number, disposal method..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto", backgroundColor: "var(--danger)", borderColor: "var(--danger)" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Confirm Stock Write-off"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wastage;

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Plus, Eye, RefreshCw, X, Check, Truck, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Transfers = () => {
  const { fetchWithAuth, showToast, user } = useAuth();
  const isStaff = user?.role === "Staff";
  const isAdminOrManager = ["Admin", "Manager"].includes(user?.role);

  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("list"); // "list" or "create"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState("");
  const [items, setItems] = useState([{ product: "", productName: "", sku: "", quantity: 1 }]);
  const [remarks, setRemarks] = useState("");

  // Detail Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load transfers
      const transRes = await fetchWithAuth("/api/transfers");
      const transData = await transRes.json();
      if (transData.status === "success") {
        setTransfers(transData.data);
      }

      // Load warehouses
      const whRes = await fetchWithAuth("/api/warehouses");
      const whData = await whRes.json();
      if (whData.status === "success") {
        setWarehouses(whData.data);
      }

      // Load products
      const prodRes = await fetchWithAuth("/api/products");
      const prodData = await prodRes.json();
      if (prodData.status === "success") {
        setProducts(prodData.data);
      }

    } catch (error) {
      console.error("Load transfers data error:", error);
      showToast("Could not load transfers dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = () => {
    const headers = ['transferNumber', 'sourceWarehouse', 'destinationWarehouse', 'status', 'remarks', 'createdAt'];
    exportToCSV(transfers, headers, `stock_transfers_${Date.now()}.csv`, showToast);
  };

  const handleAddField = () => {
    setItems([...items, { product: "", productName: "", sku: "", quantity: 1 }]);
  };

  const handleRemoveField = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleItemProductChange = (index, prodId) => {
    const selectedProd = products.find(p => p._id === prodId);
    if (!selectedProd) return;

    const updated = [...items];
    updated[index] = {
      product: prodId,
      productName: selectedProd.name,
      sku: selectedProd.sku,
      quantity: updated[index].quantity
    };
    setItems(updated);
  };

  const handleItemQtyChange = (index, val) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, Number(val));
    setItems(updated);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!sourceWarehouse || !destinationWarehouse) {
      showToast("Please select source and destination warehouses", "warning");
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      showToast("Source and destination warehouses must be different", "warning");
      return;
    }

    // Filter out invalid items
    const validItems = items.filter(i => i.product !== "");
    if (!validItems.length) {
      showToast("Please add at least one valid product", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          sourceWarehouse,
          destinationWarehouse,
          items: validItems,
          remarks
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Transfer request created successfully", "success");
        setSourceWarehouse("");
        setDestinationWarehouse("");
        setItems([{ product: "", productName: "", sku: "", quantity: 1 }]);
        setRemarks("");
        setActiveTab("list");
        loadData();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Create transfer error:", error);
      showToast("Failed to create transfer request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (transferId, nextStatus) => {
    try {
      const response = await fetchWithAuth(`/api/transfers/${transferId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(`Transfer marked as ${nextStatus}!`, "success");
        setIsViewModalOpen(false);
        loadData();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Update transfer status error:", error);
      showToast("Failed to update status", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <span className="badge warning">Pending Approval</span>;
      case "Approved":
        return <span className="badge primary">Approved</span>;
      case "In Transit":
        return <span className="badge" style={{ backgroundColor: "rgba(249, 115, 22, 0.15)", color: "#f97316", border: "1px solid rgba(249, 115, 22, 0.3)" }}>In Transit</span>;
      case "Received":
        return <span className="badge success">Completed</span>;
      default:
        return <span className="badge danger">Cancelled</span>;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("list")}
          className="btn-secondary"
          style={{
            background: activeTab === "list" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "list" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "list" ? "white" : "var(--text-secondary)",
          }}
        >
          Transfer Requests Log
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className="btn-secondary"
          style={{
            background: activeTab === "create" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "create" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "create" ? "white" : "var(--text-secondary)",
          }}
        >
          New Stock Transfer
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <ArrowLeftRight size={18} style={{ color: "var(--accent-primary)" }} />
              Inter-Warehouse Stock Transfers
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
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
          ) : transfers.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Transfer ID</th>
                    <th>Source Warehouse</th>
                    <th>Destination Warehouse</th>
                    <th>Items Count</th>
                    <th>Status</th>
                    <th>Date Raised</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{tr.transferNumber}</td>
                      <td>{tr.sourceWarehouse}</td>
                      <td>{tr.destinationWarehouse}</td>
                      <td>{tr.items.reduce((sum, item) => sum + item.quantity, 0)} units</td>
                      <td>{getStatusBadge(tr.status)}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {new Date(tr.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-icon edit" onClick={() => { setActiveTransfer(tr); setIsViewModalOpen(true); }} title="View details">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No transfer requests logged in this system.
            </div>
          )}
        </div>
      ) : (
        <div className="content-box" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="content-box-header">
            <h3 className="content-box-title">
              <ArrowLeftRight size={18} style={{ color: "var(--accent-secondary)" }} />
              Initiate Stock Transfer Request
            </h3>
          </div>
          <form onSubmit={handleCreateRequest}>
            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="form-label">Source Warehouse *</label>
                <select className="form-input" style={{ paddingLeft: "1rem" }} value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)} required>
                  <option value="">-- Select Source Depot --</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh.warehouseName}>{wh.warehouseName} ({wh.location})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Destination Warehouse *</label>
                <select className="form-input" style={{ paddingLeft: "1rem" }} value={destinationWarehouse} onChange={(e) => setDestinationWarehouse(e.target.value)} required>
                  <option value="">-- Select Destination Depot --</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh.warehouseName}>{wh.warehouseName} ({wh.location})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Transfer Items Catalog *</span>
                <button type="button" className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={handleAddField}>
                  + Add Row
                </button>
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                {items.map((item, index) => (
                  <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ flex: 2.5 }}>
                      <select className="form-input" style={{ paddingLeft: "0.75rem" }} value={item.product} onChange={(e) => handleItemProductChange(index, e.target.value)} required>
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.sku}) - Stock: {p.quantity}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="number" min="1" className="form-input" style={{ paddingLeft: "0.75rem" }} placeholder="Qty" value={item.quantity} onChange={(e) => handleItemQtyChange(index, e.target.value)} required />
                    </div>
                    <button type="button" className="btn-icon delete" style={{ height: "42px", width: "42px" }} disabled={items.length === 1} onClick={() => handleRemoveField(index)}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label">Transfer Remarks</label>
              <textarea className="form-input" style={{ paddingLeft: "1rem", height: "80px", resize: "none" }} placeholder="Reason for transfer, handling guidelines..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab("list")}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                {submitting ? <span className="spinner"></span> : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && activeTransfer && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Stock Transfer Details</h3>
              <button className="btn-icon" onClick={() => setIsViewModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Transfer ID</span>
                  <strong style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{activeTransfer.transferNumber}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Current Status</span>
                  {getStatusBadge(activeTransfer.status)}
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Source Depot</span>
                  <strong>{activeTransfer.sourceWarehouse}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Destination Depot</span>
                  <strong>{activeTransfer.destinationWarehouse}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Raised By</span>
                  <span style={{ fontSize: "0.9rem" }}>{activeTransfer.createdBy}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Date Created</span>
                  <span style={{ fontSize: "0.9rem" }}>{new Date(activeTransfer.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginBottom: "1rem" }}>
                <h4 style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-primary)" }}>Transfer Items List</h4>
                <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: "right" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTransfer.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ fontFamily: "monospace" }}>{item.sku}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{item.quantity} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeTransfer.remarks && (
                <div style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", marginBottom: "1rem", fontSize: "0.85rem" }}>
                  <strong>Remarks:</strong> {activeTransfer.remarks}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>

              {isAdminOrManager && activeTransfer.status === "Pending" && (
                <>
                  <button className="btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => handleStatusUpdate(activeTransfer._id, "Cancelled")}>
                    Reject
                  </button>
                  <button className="btn-primary" style={{ width: "auto" }} onClick={() => handleStatusUpdate(activeTransfer._id, "Approved")}>
                    <Check size={14} /> Approve Transfer
                  </button>
                </>
              )}

              {isAdminOrManager && activeTransfer.status === "Approved" && (
                <button className="btn-primary" style={{ width: "auto", background: "linear-gradient(135deg, #f97316, #ea580c)" }} onClick={() => handleStatusUpdate(activeTransfer._id, "In Transit")}>
                  <Truck size={14} /> Ship (Mark In Transit)
                </button>
              )}

              {isAdminOrManager && activeTransfer.status === "In Transit" && (
                <button className="btn-primary" style={{ width: "auto", background: "var(--success)" }} onClick={() => handleStatusUpdate(activeTransfer._id, "Received")}>
                  <CheckCircle2 size={14} /> Confirm Goods Received
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;

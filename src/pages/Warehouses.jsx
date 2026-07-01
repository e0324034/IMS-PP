import React, { useState, useEffect } from "react";
import { Plus, X, ArrowLeftRight, Navigation, Trash2, Edit2, ArrowRight, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Warehouses = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isWModalOpen, setIsWModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [expandedWarehouseId, setExpandedWarehouseId] = useState(null);

  // Form states
  const [warehouseName, setWarehouseName] = useState("");
  const [location, setLocation] = useState("");
  const [activeW, setActiveW] = useState(null);
  
  // Transfer states
  const [transferProduct, setTransferProduct] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [transferReason, setTransferReason] = useState("");
  
  const [submitting, setSubmitting] = useState(false);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/warehouses");
      const resData = await response.json();
      if (resData.status === "success") {
        setWarehouses(resData.data);
      }
    } catch (error) {
      console.error("Load warehouses error:", error);
      showToast("Could not load warehouses", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetchWithAuth("/api/products");
      const resData = await response.json();
      if (resData.status === "success") {
        setProducts(resData.data);
      }
    } catch (error) {
      console.error("Load products error:", error);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadProducts();
  }, []);

  const handleExport = () => {
    const headers = ['warehouseName', 'location'];
    exportToCSV(warehouses, headers, `warehouses_${Date.now()}.csv`, showToast);
  };

  const handleWSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseName || !location) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const url = activeW ? `/api/warehouses/${activeW._id}` : "/api/warehouses";
      const method = activeW ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ warehouseName, location }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(activeW ? "Warehouse details updated" : "Warehouse created successfully", "success");
        setIsWModalOpen(false);
        resetForm();
        loadWarehouses();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Save warehouse error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferProduct || !transferQty || !fromWarehouse || !toWarehouse || !transferReason) {
      showToast("Please enter all stock transfer details", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/warehouses/transfer", {
        method: "POST",
        body: JSON.stringify({
          productId: transferProduct,
          quantity: Number(transferQty),
          fromWarehouseName: fromWarehouse,
          toWarehouseName: toWarehouse,
          reason: transferReason,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(resData.message, "success");
        setIsTransferModalOpen(false);
        resetTransferForm();
        loadWarehouses();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Stock transfer error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (w) => {
    if (window.confirm(`Are you sure you want to delete warehouse "${w.warehouseName}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/warehouses/${w._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Warehouse deleted successfully", "success");
          loadWarehouses();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete warehouse error:", error);
      }
    }
  };

  const openEditModal = (w) => {
    setActiveW(w);
    setWarehouseName(w.warehouseName);
    setLocation(w.location);
    setIsWModalOpen(true);
  };

  const openTransferModal = () => {
    setFromWarehouse("");
    setToWarehouse("");
    setTransferProduct("");
    setTransferQty("");
    setTransferReason("");
    setIsTransferModalOpen(true);
  };

  const resetForm = () => {
    setWarehouseName("");
    setLocation("");
    setActiveW(null);
  };

  const resetTransferForm = () => {
    setTransferProduct("");
    setTransferQty("");
    setFromWarehouse("");
    setToWarehouse("");
    setTransferReason("");
  };

  // Find products currently allocated in a specific warehouse name to filter transfer product dropdown
  const getFromWarehouseProducts = () => {
    if (!fromWarehouse) return [];
    const sourceW = warehouses.find(w => w.warehouseName === fromWarehouse);
    if (!sourceW) return [];
    return sourceW.stockAllocation.filter(alloc => alloc.quantity > 0);
  };

  return (
    <div>
      <div className="actions-bar" style={{ justifyContent: "flex-end", gap: "1rem", display: "flex", alignItems: "center" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)", padding: "0.75rem 1.25rem" }}>
          <Download size={16} /> Export to Excel
        </button>

        <button className="btn-secondary" onClick={openTransferModal} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeftRight size={16} /> Transfer Stock
        </button>

        {!isOperator && (
          <button className="btn-primary" onClick={() => { resetForm(); setIsWModalOpen(true); }} style={{ width: "auto" }}>
            <Plus size={18} /> Create Warehouse
          </button>
        )}
      </div>

      {/* Warehouses list grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : warehouses.length > 0 ? (
          warehouses.map((w) => {
            const isExpanded = expandedWarehouseId === w._id;
            const totalItems = w.stockAllocation.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={w._id} className="content-box" style={{ paddingBottom: isExpanded ? "1.75rem" : "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Navigation size={18} style={{ color: "var(--accent-secondary)" }} />
                      {w.warehouseName}
                    </h3>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Location: {w.location} &bull; Total Allocated Qty: <strong>{totalItems} items</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setExpandedWarehouseId(isExpanded ? null : w._id)}
                      style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                    >
                      {isExpanded ? "Collapse Stock" : "Expand Stock Allocations"}
                    </button>

                    {!isOperator && (
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn-icon edit" onClick={() => openEditModal(w)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDeleteClick(w)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded stock allocation list table */}
                {isExpanded && (
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                    {w.stockAllocation && w.stockAllocation.length > 0 ? (
                      <table className="custom-table" style={{ fontSize: "0.9rem" }}>
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Quantity Allocated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {w.stockAllocation.map((alloc) => {
                            if (!alloc.product) return null;
                            return (
                              <tr key={alloc._id}>
                                <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>
                                  {alloc.product.sku}
                                </td>
                                <td style={{ fontWeight: 600 }}>{alloc.product.name}</td>
                                <td>{alloc.product.category}</td>
                                <td>₹{alloc.product.sellingPrice.toFixed(2)}</td>
                                <td style={{ fontWeight: 700, fontSize: "1rem" }}>{alloc.quantity} units</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        No stock currently allocated to this warehouse.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            No warehouses registered.
          </div>
        )}
      </div>

      {/* CREATE / EDIT WAREHOUSE MODAL */}
      {isWModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{activeW ? "Edit Warehouse Settings" : "Create Warehouse"}</h3>
              <button className="modal-close-btn" onClick={() => setIsWModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleWSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Warehouse Name *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. North Hub Chennai" value={warehouseName} onChange={(e)=>setWarehouseName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Location Address *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Ambattur Industrial Estate" value={location} onChange={(e)=>setLocation(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsWModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAREHOUSE TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "580px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ArrowLeftRight size={18} />
                Inter-Warehouse Stock Transfer
              </h3>
              <button className="modal-close-btn" onClick={() => setIsTransferModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label className="form-label">Source Warehouse *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={fromWarehouse} onChange={(e)=>{setFromWarehouse(e.target.value); setTransferProduct("");}} required>
                      <option value="">Select Source</option>
                      {warehouses.map(w=>(
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Destination Warehouse *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={toWarehouse} onChange={(e)=>setToWarehouse(e.target.value)} required>
                      <option value="">Select Destination</option>
                      {warehouses.filter(w=>w.warehouseName !== fromWarehouse).map(w=>(
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Product to Transfer *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={transferProduct} onChange={(e)=>setTransferProduct(e.target.value)} disabled={!fromWarehouse} required>
                      <option value="">Select Product</option>
                      {getFromWarehouseProducts().map(alloc => (
                        <option key={alloc.product._id} value={alloc.product._id}>
                          {alloc.product.name} (Avail: {alloc.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Qty to Transfer *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ paddingLeft: "1rem" }}
                      placeholder="e.g. 5"
                      value={transferQty}
                      onChange={(e)=>setTransferQty(e.target.value)}
                      disabled={!transferProduct}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason / Reference *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Stock balancing / Branch reallocation" value={transferReason} onChange={(e)=>setTransferReason(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;

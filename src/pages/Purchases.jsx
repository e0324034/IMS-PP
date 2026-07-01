import React, { useState, useEffect } from "react";
import { Plus, X, Eye, CheckCircle, Ban, ArrowDown, ClipboardList, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Purchases = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activePO, setActivePO] = useState(null);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("Main Warehouse");
  const [remarks, setRemarks] = useState("");
  const [poItems, setPoItems] = useState([{ productId: "", quantity: 1, costPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/purchases");
      const resData = await response.json();
      if (resData.status === "success") {
        setPurchases(resData.data);
      }
    } catch (error) {
      console.error("Load purchases error:", error);
      showToast("Could not load purchase orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownsData = async () => {
    try {
      const supRes = await fetchWithAuth("/api/suppliers");
      const supData = await supRes.json();
      if (supData.status === "success") setSuppliers(supData.data);

      const prodRes = await fetchWithAuth("/api/products");
      const prodData = await prodRes.json();
      if (prodData.status === "success") setProducts(prodData.data);

      const wRes = await fetchWithAuth("/api/warehouses");
      const wData = await wRes.json();
      if (wData.status === "success") setWarehouses(wData.data);
    } catch (error) {
      console.error("Load dropdowns error:", error);
    }
  };

  useEffect(() => {
    loadPurchases();
    loadDropdownsData();
  }, []);

  const handleExport = () => {
    const headers = ['poNumber', 'supplierName', 'warehouse', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'createdAt'];
    exportToCSV(purchases, headers, `purchase_orders_${Date.now()}.csv`, showToast);
  };

  const handleAddItemRow = () => {
    setPoItems([...poItems, { productId: "", quantity: 1, costPrice: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const handleItemFieldChange = (index, field, val) => {
    const updated = [...poItems];
    updated[index][field] = val;

    // Auto-fill costPrice if product is selected
    if (field === "productId" && val) {
      const prod = products.find(p => p._id === val);
      if (prod) {
        updated[index].costPrice = prod.costPrice;
      }
    }
    setPoItems(updated);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || poItems.some(i => !i.productId || i.quantity <= 0)) {
      showToast("Please select supplier and enter valid items/quantities", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: selectedSupplier,
          warehouse: selectedWarehouse,
          items: poItems,
          remarks,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Purchase Order draft created", "success");
        setIsCreateModalOpen(false);
        resetForm();
        loadPurchases();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Create PO error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePO = async (poId) => {
    try {
      const response = await fetchWithAuth(`/api/purchases/${poId}/approve`, { method: "PUT" });
      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Purchase Order approved", "success");
        loadPurchases();
        if (activePO && activePO._id === poId) setIsViewModalOpen(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Approve PO error:", error);
    }
  };

  const handleReceivePO = async (poId) => {
    try {
      showToast("Processing intake stock allocations...", "info");
      const response = await fetchWithAuth(`/api/purchases/${poId}/receive`, { method: "PUT" });
      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Goods received! Stocks allocated successfully.", "success");
        loadPurchases();
        if (activePO && activePO._id === poId) setIsViewModalOpen(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Receive PO error:", error);
    }
  };

  const handleCancelPO = async (poId) => {
    if (window.confirm("Are you sure you want to cancel this Purchase Order?")) {
      try {
        const response = await fetchWithAuth(`/api/purchases/${poId}/cancel`, { method: "PUT" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Purchase Order cancelled", "success");
          loadPurchases();
          if (activePO && activePO._id === poId) setIsViewModalOpen(false);
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Cancel PO error:", error);
      }
    }
  };

  const openViewModal = (po) => {
    setActivePO(po);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setSelectedSupplier("");
    setSelectedWarehouse("Main Warehouse");
    setRemarks("");
    setPoItems([{ productId: "", quantity: 1, costPrice: 0 }]);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Draft":
        return <span className="badge warning">Draft</span>;
      case "Approved":
        return <span className="badge primary">Approved</span>;
      case "Completed":
        return <span className="badge success">Completed</span>;
      case "Cancelled":
        return <span className="badge danger">Cancelled</span>;
      default:
        return <span className="badge info">{status}</span>;
    }
  };

  return (
    <div>
      <div className="actions-bar" style={{ justifyContent: "flex-end", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
          <Download size={16} /> Export to Excel
        </button>
        {!isOperator && (
          <button className="btn-primary" onClick={() => { resetForm(); setIsCreateModalOpen(true); }} style={{ width: "auto" }}>
            <Plus size={18} /> Create PO Draft
          </button>
        )}
      </div>

      <div className="content-box">
        <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
          <ClipboardList size={18} style={{ color: "var(--accent-primary)" }} />
          Purchase Orders Directory
        </h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : purchases.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Target Warehouse</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((po) => (
                  <tr key={po._id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{po.poNumber}</td>
                    <td>{po.supplierName}</td>
                    <td>{po.warehouse}</td>
                    <td style={{ fontWeight: 600 }}>₹{po.totalAmount.toFixed(2)}</td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                        <button className="btn-icon edit" title="View details" onClick={() => openViewModal(po)}>
                          <Eye size={14} />
                        </button>
                        {!isOperator && po.status === "Draft" && (
                          <>
                            <button className="btn-icon adjust" title="Approve order" onClick={() => handleApprovePO(po._id)}>
                              <CheckCircle size={14} />
                            </button>
                            <button className="btn-icon delete" title="Cancel order" onClick={() => handleCancelPO(po._id)}>
                              <Ban size={14} />
                            </button>
                          </>
                        )}
                        {po.status === "Approved" && (
                          <button className="btn-icon adjust" style={{ color: "var(--success)" }} title="Receive Goods stock intake" onClick={() => handleReceivePO(po._id)}>
                            <ArrowDown size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            No purchase orders created.
          </div>
        )}
      </div>

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "680px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Purchase Order Draft</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Supplier *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={selectedSupplier} onChange={(e)=>setSelectedSupplier(e.target.value)} required>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s._id} value={s._id}>{s.supplierName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Target Warehouse *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={selectedWarehouse} onChange={(e)=>setSelectedWarehouse(e.target.value)} required>
                      {warehouses.map(w => (
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Remarks</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Q3 replenishment shipment" value={remarks} onChange={(e)=>setRemarks(e.target.value)} />
                </div>

                {/* Items selection rows */}
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Products List *</label>
                    <button type="button" className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }} onClick={handleAddItemRow}>
                      + Add Item Row
                    </button>
                  </div>

                  {poItems.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", alignItems: "flex-end" }}>
                      <div style={{ flex: 2 }}>
                        <span className="form-label" style={{ fontSize: "0.75rem" }}>Product</span>
                        <select className="filter-select" style={{ width: "100%", padding: "0.75rem" }} value={item.productId} onChange={(e)=>handleItemFieldChange(index, "productId", e.target.value)} required>
                          <option value="">Select Item</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="form-label" style={{ fontSize: "0.75rem" }}>Quantity</span>
                        <input type="number" min="1" className="form-input" style={{ paddingLeft: "1rem", paddingRight: "0.5rem" }} value={item.quantity} onChange={(e)=>handleItemFieldChange(index, "quantity", e.target.value)} required />
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <span className="form-label" style={{ fontSize: "0.75rem" }}>Cost Price (₹)</span>
                        <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} value={item.costPrice} onChange={(e)=>handleItemFieldChange(index, "costPrice", e.target.value)} required />
                      </div>
                      <button type="button" className="btn-icon delete" style={{ height: "42px", width: "42px" }} disabled={poItems.length === 1} onClick={()=>handleRemoveItemRow(index)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save PO Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PURCHASE ORDER MODAL */}
      {isViewModalOpen && activePO && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Purchase Order Details: {activePO.poNumber}</h3>
              <button className="modal-close-btn" onClick={() => setIsViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>SUPPLIER PROFILE</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{activePO.supplierName}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                    Target Warehouse: <strong>{activePO.warehouse}</strong>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>STATUS & DATE</div>
                  <div>{getStatusBadge(activePO.status)}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                    Created: {new Date(activePO.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {activePO.remarks && (
                <div style={{ backgroundColor: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
                  <strong>Remarks:</strong> {activePO.remarks}
                </div>
              )}

              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>Items Summary</h4>
              <table className="custom-table" style={{ fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activePO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.costPrice.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>₹{(item.quantity * item.costPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "transparent" }}>
                    <td colSpan={2}></td>
                    <td style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "0.8rem" }}>Grand Total:</td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontSize: "1.1rem", color: "var(--accent-secondary)" }}>
                      ₹{activePO.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
              
              {!isOperator && activePO.status === "Draft" && (
                <>
                  <button className="btn-primary" style={{ width: "auto", display: "flex", gap: "0.25rem" }} onClick={() => handleApprovePO(activePO._id)}>
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button className="btn-secondary" style={{ color: "var(--danger)" }} onClick={() => handleCancelPO(activePO._id)}>Cancel PO</button>
                </>
              )}

              {activePO.status === "Approved" && (
                <button className="btn-primary" style={{ width: "auto", display: "flex", gap: "0.25rem", backgroundColor: "var(--success)" }} onClick={() => handleReceivePO(activePO._id)}>
                  <ArrowDown size={16} /> Receive Goods
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

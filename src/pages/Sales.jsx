import React, { useState, useEffect } from "react";
import { Plus, X, Eye, CheckCircle, Ban, ArrowUp, ClipboardList, ShieldAlert, CreditCard, Download, QrCode } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Sales = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [activeSO, setActiveSO] = useState(null);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("Main Warehouse");
  const [remarks, setRemarks] = useState("");
  const [soItems, setSoItems] = useState([{ productId: "", quantity: 1, sellingPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [hoveredImage, setHoveredImage] = useState(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/sales");
      const resData = await response.json();
      if (resData.status === "success") {
        setSales(resData.data);
      }
    } catch (error) {
      console.error("Load sales error:", error);
      showToast("Could not load sales orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownsData = async () => {
    try {
      const custRes = await fetchWithAuth("/api/customers");
      const custData = await custRes.json();
      if (custData.status === "success") setCustomers(custData.data);

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
    loadSales();
    loadDropdownsData();
  }, []);

  const handleExport = () => {
    const headers = ['soNumber', 'customerName', 'warehouse', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'createdAt'];
    exportToCSV(sales, headers, `sales_orders_${Date.now()}.csv`, showToast);
  };

  const handleAddItemRow = () => {
    setSoItems([...soItems, { productId: "", quantity: 1, sellingPrice: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (soItems.length === 1) return;
    setSoItems(soItems.filter((_, idx) => idx !== index));
  };

  const handleItemFieldChange = (index, field, val) => {
    const updated = [...soItems];
    updated[index][field] = val;

    // Auto-fill sellingPrice if product is selected
    if (field === "productId" && val) {
      const prod = products.find(p => p._id === val);
      if (prod) {
        updated[index].sellingPrice = prod.sellingPrice;
      }
    }
    setSoItems(updated);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || soItems.some(i => !i.productId || i.quantity <= 0)) {
      showToast("Please select customer and enter valid products/quantities", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer,
          warehouse: selectedWarehouse,
          items: soItems,
          remarks,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Sales Order draft registered", "success");
        setIsCreateModalOpen(false);
        resetForm();
        loadSales();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Create SO error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSO = async (soId) => {
    try {
      showToast("Validating warehouse stock allocations...", "info");
      const response = await fetchWithAuth(`/api/sales/${soId}/confirm`, { method: "PUT" });
      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Stock validated. Sales Order confirmed.", "success");
        loadSales();
        if (activeSO && activeSO._id === soId) setIsInvoiceModalOpen(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Confirm SO error:", error);
    }
  };

  const handleDeliverSO = async (soId) => {
    try {
      showToast("Dispatching stock allocations...", "info");
      const response = await fetchWithAuth(`/api/sales/${soId}/deliver`, { method: "PUT" });
      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Goods dispatched! Stock ledger updated.", "success");
        loadSales();
        if (activeSO && activeSO._id === soId) setIsInvoiceModalOpen(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Deliver SO error:", error);
    }
  };

  const handlePaySO = async (soId) => {
    try {
      const response = await fetchWithAuth(`/api/sales/${soId}/pay`, { method: "PUT" });
      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Payment collected! Sales Order marked complete.", "success");
        loadSales();
        if (activeSO && activeSO._id === soId) setIsInvoiceModalOpen(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Pay SO error:", error);
    }
  };

  const handleCancelSO = async (soId) => {
    if (window.confirm("Are you sure you want to cancel this Sales Order?")) {
      try {
        const response = await fetchWithAuth(`/api/sales/${soId}/cancel`, { method: "PUT" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Sales Order cancelled", "success");
          loadSales();
          if (activeSO && activeSO._id === soId) setIsInvoiceModalOpen(false);
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Cancel SO error:", error);
      }
    }
  };

  const openInvoiceModal = (so) => {
    setActiveSO(so);
    setIsInvoiceModalOpen(true);
  };

  const resetForm = () => {
    setSelectedCustomer("");
    setSelectedWarehouse("Main Warehouse");
    setRemarks("");
    setSoItems([{ productId: "", quantity: 1, sellingPrice: 0 }]);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Draft":
        return <span className="badge warning">Draft</span>;
      case "Confirmed":
        return <span className="badge primary">Confirmed</span>;
      case "Delivered":
        return <span className="badge success" style={{ backgroundColor: "rgba(6, 182, 212, 0.15)", color: "var(--accent-secondary)" }}>Delivered</span>;
      case "Paid":
        return <span className="badge success">Paid</span>;
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
        <button className="btn-primary" onClick={() => { resetForm(); setIsCreateModalOpen(true); }} style={{ width: "auto" }}>
          <Plus size={18} /> Create Sales Order
        </button>
      </div>

      <div className="content-box">
        <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
          <ClipboardList size={18} style={{ color: "var(--accent-primary)" }} />
          Sales Orders Directory
        </h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : sales.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SO Number</th>
                  <th>Customer</th>
                  <th>Warehouse Source</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((so) => (
                  <tr key={so._id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{so.soNumber}</td>
                    <td>{so.customerName}</td>
                    <td>{so.warehouse}</td>
                    <td style={{ fontWeight: 600 }}>₹{so.totalAmount.toFixed(2)}</td>
                    <td>{getStatusBadge(so.status)}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(so.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                        <button className="btn-icon edit" title="View details / Invoice" onClick={() => openInvoiceModal(so)}>
                          <Eye size={14} />
                        </button>
                        {!isOperator && so.status === "Draft" && (
                          <>
                            <button className="btn-icon adjust" title="Validate & Confirm allocation" onClick={() => handleConfirmSO(so._id)}>
                              <CheckCircle size={14} />
                            </button>
                            <button className="btn-icon delete" title="Cancel order" onClick={() => handleCancelSO(so._id)}>
                              <Ban size={14} />
                            </button>
                          </>
                        )}
                        {so.status === "Confirmed" && (
                          <button className="btn-icon adjust" style={{ color: "var(--accent-secondary)" }} title="Deliver Goods stock dispatch" onClick={() => handleDeliverSO(so._id)}>
                            <ArrowUp size={14} />
                          </button>
                        )}
                        {so.status === "Delivered" && (
                          <button className="btn-icon adjust" style={{ color: "var(--success)" }} title="Collect Payment" onClick={() => handlePaySO(so._id)}>
                            <CreditCard size={14} />
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
            No sales orders registered.
          </div>
        )}
      </div>

      {/* CREATE SALES ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "680px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Sales Order</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Customer *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={selectedCustomer} onChange={(e)=>setSelectedCustomer(e.target.value)} required>
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Warehouse Source *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={selectedWarehouse} onChange={(e)=>setSelectedWarehouse(e.target.value)} required>
                      {warehouses.map(w => (
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Remarks</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Expedited shipping" value={remarks} onChange={(e)=>setRemarks(e.target.value)} />
                </div>

                {/* Items selection rows */}
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Add Products List *</label>
                    <button type="button" className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }} onClick={handleAddItemRow}>
                      + Add Item Row
                    </button>
                  </div>

                  {soItems.map((item, index) => (
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
                        <span className="form-label" style={{ fontSize: "0.75rem" }}>Selling Price (₹)</span>
                        <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} value={item.sellingPrice} onChange={(e)=>handleItemFieldChange(index, "sellingPrice", e.target.value)} required />
                      </div>
                      <button type="button" className="btn-icon delete" style={{ height: "42px", width: "42px" }} disabled={soItems.length === 1} onClick={()=>handleRemoveItemRow(index)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Sales Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE SIMULATOR MODAL */}
      {isInvoiceModalOpen && activeSO && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Invoice: {activeSO.soNumber}</h3>
              <button className="modal-close-btn" onClick={() => setIsInvoiceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Invoice Layout Template */}
              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "2rem", borderRadius: "14px", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                
                {/* Invoice Header */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <h2 style={{ color: "var(--accent-primary)", fontSize: "1.3rem", fontWeight: 800 }}>INSTATENDERS ENTERPRISES</h2>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      GSTIN: 33AABCA1234F1Z0 <br />
                      Chennai, Tamil Nadu
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-secondary)" }}>TAX INVOICE</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Date: {new Date(activeSO.createdAt).toLocaleDateString()} <br />
                      Status: <strong>{activeSO.status.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>

                {/* Billing details */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Billed To:</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem" }}>{activeSO.customerName}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      GSTIN: {customers.find(c => c._id === activeSO.customer)?.gstNumber || "Unregistered"} <br />
                      Address: {customers.find(c => c._id === activeSO.customer)?.address || "N/A"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Ship From:</div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginTop: "0.25rem" }}>{activeSO.warehouse}</div>
                  </div>
                </div>

                {/* Items listing table */}
                <table className="custom-table" style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "var(--text-secondary)" }}>Item Description</th>
                      <th style={{ color: "var(--text-secondary)" }}>Qty</th>
                      <th style={{ color: "var(--text-secondary)" }}>Price</th>
                      <th style={{ textAlign: "right", color: "var(--text-secondary)" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSO.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.sellingPrice.toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>₹{(item.quantity * item.sellingPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary calculation totals */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  {/* Payment UPI QR Code preview if status is Delivered */}
                  {activeSO.status === "Delivered" && activeSO.paymentQR ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <img 
                        src={activeSO.paymentQR} 
                        alt="UPI Payment QR Code" 
                        onClick={() => setExpandedImage({ src: activeSO.paymentQR, name: "UPI Payment QR Code" })}
                        style={{ width: "90px", height: "90px", cursor: "pointer", transition: "transform 0.2s ease" }} 
                        title="Hover to preview / Click to expand"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredImage({
                            src: activeSO.paymentQR,
                            name: "UPI Payment QR Code",
                            top: rect.top,
                            left: rect.left,
                            right: rect.right
                          });
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          setHoveredImage(null);
                        }}
                      />
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <QrCode size={10} /> Scan UPI to Pay
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {activeSO.remarks && <span><strong>Remarks:</strong> {activeSO.remarks}</span>}
                    </div>
                  )}

                  <div style={{ width: "240px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Sub Total:</span>
                      <span>₹{activeSO.subTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>GST Tax (18%):</span>
                      <span>₹{activeSO.taxAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem", marginTop: "0.5rem", fontWeight: 800 }}>
                      <span style={{ color: "var(--accent-secondary)" }}>Grand Total:</span>
                      <span style={{ color: "var(--accent-secondary)", fontSize: "1.1rem" }}>₹{activeSO.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <div className="modal-footer">
              {activeSO.invoicePdf && (
                <a href={`/api${activeSO.invoicePdf}`} target="_blank" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <Download size={14} /> Download PDF
                </a>
              )}
              <button className="btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>Close</button>
              
              {!isOperator && activeSO.status === "Draft" && (
                <>
                  <button className="btn-primary" style={{ width: "auto" }} onClick={() => handleConfirmSO(activeSO._id)}>
                    Confirm Order
                  </button>
                  <button className="btn-secondary" style={{ color: "var(--danger)" }} onClick={() => handleCancelSO(activeSO._id)}>Cancel Order</button>
                </>
              )}

              {activeSO.status === "Confirmed" && (
                <button className="btn-primary" style={{ width: "auto", display: "flex", gap: "0.25rem", backgroundColor: "var(--accent-secondary)" }} onClick={() => handleDeliverSO(activeSO._id)}>
                  <ArrowUp size={16} /> Dispatch Delivery
                </button>
              )}

              {activeSO.status === "Delivered" && (
                <button className="btn-primary" style={{ width: "auto", display: "flex", gap: "0.25rem", backgroundColor: "var(--success)" }} onClick={() => handlePaySO(activeSO._id)}>
                  <CreditCard size={16} /> Collect Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="modal-overlay" onClick={() => setExpandedImage(null)} style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: "500px", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: "none", padding: "1rem 1.5rem 0.5rem" }}>
              <h3 className="modal-title" style={{ fontSize: "1.1rem" }}>{expandedImage.name}</h3>
              <button className="btn-icon" onClick={() => setExpandedImage(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem", background: "rgba(0,0,0,0.2)" }}>
              <img 
                src={expandedImage.src} 
                alt={expandedImage.name} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "60vh", 
                  objectFit: "contain", 
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                  border: "1px solid var(--border-color)"
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Hover Image Preview Card */}
      {hoveredImage && (
        <div 
          style={{
            position: "fixed",
            top: `${Math.max(10, Math.min(hoveredImage.top - 90, window.innerHeight - 260))}px`,
            left: `${hoveredImage.right + 220 + 15 > window.innerWidth ? hoveredImage.left - 240 : hoveredImage.right + 15}px`,
            zIndex: 1200,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            padding: "0.5rem",
            pointerEvents: "none",
            animation: "modalScale 0.15s ease-out"
          }}
        >
          <img 
            src={hoveredImage.src} 
            alt={hoveredImage.name} 
            style={{ 
              width: "200px", 
              height: "200px", 
              objectFit: "cover", 
              borderRadius: "8px",
              display: "block" 
            }} 
          />
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", textAlign: "center", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hoveredImage.name}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

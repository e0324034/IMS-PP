import React, { useState, useEffect } from "react";
import { RotateCcw, Plus, Eye, RefreshCw, X, Check, FileText, AlertCircle, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Returns = () => {
  const { fetchWithAuth, showToast } = useAuth();

  const [customerReturns, setCustomerReturns] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [activeTab, setActiveTab] = useState("customer-list"); // "customer-list", "supplier-list", "record-customer", "record-supplier"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States (Customer Return)
  const [soNumber, setSoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerItems, setCustomerItems] = useState([]);
  const [totalRefund, setTotalRefund] = useState(0);
  const [customerReason, setCustomerReason] = useState("");

  // Form States (Supplier Return)
  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierItems, setSupplierItems] = useState([]);
  const [totalReturnVal, setTotalReturnVal] = useState(0);
  const [supplierReason, setSupplierReason] = useState("");

  // View modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeReturn, setActiveReturn] = useState(null);
  const [activeReturnType, setActiveReturnType] = useState("customer");

  const loadData = async () => {
    try {
      setLoading(true);
      
      const crRes = await fetchWithAuth("/api/returns/customer");
      const crData = await crRes.json();
      if (crData.status === "success") {
        setCustomerReturns(crData.data);
      }

      const srRes = await fetchWithAuth("/api/returns/supplier");
      const srData = await srRes.json();
      if (srData.status === "success") {
        setSupplierReturns(srData.data);
      }

      const soRes = await fetchWithAuth("/api/sales");
      const soData = await soRes.json();
      if (soData.status === "success") {
        setSalesOrders(soData.data.filter(o => o.status === "Delivered" || o.status === "Paid"));
      }

      const poRes = await fetchWithAuth("/api/purchases");
      const poData = await poRes.json();
      if (poData.status === "success") {
        setPurchaseOrders(poData.data.filter(o => o.status === "Completed"));
      }

    } catch (error) {
      console.error("Load returns error:", error);
      showToast("Could not load returns logs data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCustomer = () => {
    const headers = ['returnNumber', 'salesOrderNumber', 'customerName', 'totalRefund', 'reason', 'createdAt'];
    exportToCSV(customerReturns, headers, `customer_returns_${Date.now()}.csv`, showToast);
  };

  const handleExportSupplier = () => {
    const headers = ['returnNumber', 'purchaseOrderNumber', 'supplierName', 'totalReturnAmount', 'reason', 'createdAt'];
    exportToCSV(supplierReturns, headers, `supplier_returns_${Date.now()}.csv`, showToast);
  };

  const handleSoChange = (soNo) => {
    setSoNumber(soNo);
    const selectedSo = salesOrders.find(o => o.soNumber === soNo);
    if (selectedSo) {
      setCustomerName(selectedSo.customerName);
      // Initialize return rows from sales order items
      const rows = selectedSo.items.map(item => ({
        product: item.product,
        productName: item.productName,
        quantity: 0,
        maxQty: item.quantity,
        price: item.sellingPrice,
        condition: "Good"
      }));
      setCustomerItems(rows);
    } else {
      setCustomerName("");
      setCustomerItems([]);
    }
  };

  const handlePoChange = (poNo) => {
    setPoNumber(poNo);
    const selectedPo = purchaseOrders.find(o => o.poNumber === poNo);
    if (selectedPo) {
      setSupplierName(selectedPo.supplierName);
      // Initialize return rows from purchase order items
      const rows = selectedPo.items.map(item => ({
        product: item.product,
        productName: item.productName,
        quantity: 0,
        maxQty: item.quantity,
        price: item.costPrice
      }));
      setSupplierItems(rows);
    } else {
      setSupplierName("");
      setSupplierItems([]);
    }
  };

  const handleCustRowQtyChange = (index, qtyVal) => {
    const updated = [...customerItems];
    const qty = Math.min(updated[index].maxQty, Math.max(0, Number(qtyVal)));
    updated[index].quantity = qty;
    setCustomerItems(updated);

    // Auto calculate total refund
    const refund = updated.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setTotalRefund(refund);
  };

  const handleCustRowConditionChange = (index, cond) => {
    const updated = [...customerItems];
    updated[index].condition = cond;
    setCustomerItems(updated);
  };

  const handleSuppRowQtyChange = (index, qtyVal) => {
    const updated = [...supplierItems];
    const qty = Math.min(updated[index].maxQty, Math.max(0, Number(qtyVal)));
    updated[index].quantity = qty;
    setSupplierItems(updated);

    // Auto calculate return value
    const returnVal = updated.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setTotalReturnVal(returnVal);
  };

  const submitCustomerReturn = async (e) => {
    e.preventDefault();

    const returnItems = customerItems.filter(i => i.quantity > 0).map(i => ({
      product: i.product,
      productName: i.productName,
      quantity: i.quantity,
      refundAmount: i.quantity * i.price,
      condition: i.condition
    }));

    if (!returnItems.length) {
      showToast("Please return at least 1 unit of a product", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/returns/customer", {
        method: "POST",
        body: JSON.stringify({
          salesOrderNumber: soNumber,
          customerName,
          items: returnItems,
          totalRefundAmount: totalRefund,
          reason: customerReason
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Customer return processed successfully", "success");
        setSoNumber("");
        setCustomerName("");
        setCustomerItems([]);
        setCustomerReason("");
        setTotalRefund(0);
        setActiveTab("customer-list");
        loadData();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Submit customer return error:", error);
      showToast("Failed to record customer return", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSupplierReturn = async (e) => {
    e.preventDefault();

    const returnItems = supplierItems.filter(i => i.quantity > 0).map(i => ({
      product: i.product,
      productName: i.productName,
      quantity: i.quantity,
      costPrice: i.price,
      reason: "Damaged / Expired"
    }));

    if (!returnItems.length) {
      showToast("Please return at least 1 unit of a product", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/returns/supplier", {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderNumber: poNumber,
          supplierName,
          items: returnItems,
          totalReturnAmount: totalReturnVal,
          reason: supplierReason
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Supplier return processed successfully", "success");
        setPoNumber("");
        setSupplierName("");
        setSupplierItems([]);
        setSupplierReason("");
        setTotalReturnVal(0);
        setActiveTab("supplier-list");
        loadData();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Submit supplier return error:", error);
      showToast("Failed to record supplier return", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("customer-list")}
          className="btn-secondary"
          style={{
            background: activeTab === "customer-list" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "customer-list" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "customer-list" ? "white" : "var(--text-secondary)",
          }}
        >
          Customer Returns Log
        </button>
        <button
          onClick={() => setActiveTab("supplier-list")}
          className="btn-secondary"
          style={{
            background: activeTab === "supplier-list" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "supplier-list" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "supplier-list" ? "white" : "var(--text-secondary)",
          }}
        >
          Supplier Returns Log
        </button>
        <button
          onClick={() => setActiveTab("record-customer")}
          className="btn-secondary"
          style={{
            background: activeTab === "record-customer" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "record-customer" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "record-customer" ? "white" : "var(--text-secondary)",
          }}
        >
          Record Cust Return
        </button>
        <button
          onClick={() => setActiveTab("record-supplier")}
          className="btn-secondary"
          style={{
            background: activeTab === "record-supplier" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "record-supplier" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "record-supplier" ? "white" : "var(--text-secondary)",
          }}
        >
          Record Supp Return
        </button>
      </div>

      {activeTab === "customer-list" && (
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <RotateCcw size={18} style={{ color: "var(--accent-primary)" }} />
              Customer Returns Records
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExportCustomer} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
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
          ) : customerReturns.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Return Code</th>
                    <th>Sales Order</th>
                    <th>Customer Name</th>
                    <th>Refund Value</th>
                    <th>Reason</th>
                    <th>Date Processed</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReturns.map((cr) => (
                    <tr key={cr._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{cr.returnNumber}</td>
                      <td style={{ fontFamily: "monospace" }}>{cr.salesOrderNumber}</td>
                      <td>{cr.customerName}</td>
                      <td style={{ fontWeight: 600 }}>₹{cr.totalRefundAmount.toFixed(2)}</td>
                      <td>{cr.reason}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {new Date(cr.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-icon edit" onClick={() => { setActiveReturn(cr); setActiveReturnType("customer"); setIsViewModalOpen(true); }} title="View details">
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
              No customer returns recorded.
            </div>
          )}
        </div>
      )}

      {activeTab === "supplier-list" && (
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <RotateCcw size={18} style={{ color: "var(--accent-secondary)" }} />
              Supplier Returns Records
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExportSupplier} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
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
          ) : supplierReturns.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Return Code</th>
                    <th>Purchase Order</th>
                    <th>Supplier Name</th>
                    <th>Return Value</th>
                    <th>Reason</th>
                    <th>Date Processed</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierReturns.map((sr) => (
                    <tr key={sr._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{sr.returnNumber}</td>
                      <td style={{ fontFamily: "monospace" }}>{sr.purchaseOrderNumber}</td>
                      <td>{sr.supplierName}</td>
                      <td style={{ fontWeight: 600 }}>₹{sr.totalReturnAmount.toFixed(2)}</td>
                      <td>{sr.reason}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {new Date(sr.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-icon edit" onClick={() => { setActiveReturn(sr); setActiveReturnType("supplier"); setIsViewModalOpen(true); }} title="View details">
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
              No supplier returns recorded.
            </div>
          )}
        </div>
      )}

      {activeTab === "record-customer" && (
        <div className="content-box" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="content-box-header">
            <h3 className="content-box-title">
              <RotateCcw size={18} style={{ color: "var(--accent-primary)" }} />
              Log Customer Return
            </h3>
          </div>
          <form onSubmit={submitCustomerReturn}>
            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="form-label">Delivered Sales Order *</label>
                <select className="form-input" style={{ paddingLeft: "1rem" }} value={soNumber} onChange={(e) => handleSoChange(e.target.value)} required>
                  <option value="">-- Select SO Number --</option>
                  {salesOrders.map(so => (
                    <option key={so._id} value={so.soNumber}>{so.soNumber} ({so.customerName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Customer Name</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={customerName} disabled />
              </div>
            </div>

            {customerItems.length > 0 && (
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Return Quantities & Conditions *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                  {customerItems.map((item, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: "1rem", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Purchased Qty: {item.maxQty} units @ ₹{item.price}</span>
                      </div>
                      <div>
                        <input type="number" min="0" max={item.maxQty} className="form-input" style={{ paddingLeft: "0.5rem" }} placeholder="Return Qty" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => handleCustRowQtyChange(index, e.target.value)} />
                      </div>
                      <div>
                        <select className="form-input" style={{ paddingLeft: "0.5rem" }} value={item.condition} onChange={(e) => handleCustRowConditionChange(index, e.target.value)} disabled={item.quantity === 0}>
                          <option value="Good">Restockable (Good)</option>
                          <option value="Damaged">Damaged (Wastage Hub)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="form-label">Calculated Refund Value (INR)</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem", fontWeight: "bold", color: "var(--accent-secondary)" }} value={`₹${totalRefund.toFixed(2)}`} disabled />
              </div>
              <div>
                <label className="form-label">Reason for Return *</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Size didn't fit, wrong color, customer cancelled" value={customerReason} onChange={(e) => setCustomerReason(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab("customer-list")}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                {submitting ? <span className="spinner"></span> : "Process Return"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "record-supplier" && (
        <div className="content-box" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="content-box-header">
            <h3 className="content-box-title">
              <RotateCcw size={18} style={{ color: "var(--accent-secondary)" }} />
              Log Supplier Return
            </h3>
          </div>
          <form onSubmit={submitSupplierReturn}>
            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="form-label">Completed Purchase Order *</label>
                <select className="form-input" style={{ paddingLeft: "1rem" }} value={poNumber} onChange={(e) => handlePoChange(e.target.value)} required>
                  <option value="">-- Select PO Number --</option>
                  {purchaseOrders.map(po => (
                    <option key={po._id} value={po.poNumber}>{po.poNumber} ({po.supplierName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Supplier Name</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={supplierName} disabled />
              </div>
            </div>

            {supplierItems.length > 0 && (
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Return Quantities (Items will be deducted from warehouse) *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                  {supplierItems.map((item, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1rem", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Received Qty: {item.maxQty} units @ ₹{item.price}</span>
                      </div>
                      <div>
                        <input type="number" min="0" max={item.maxQty} className="form-input" style={{ paddingLeft: "0.5rem" }} placeholder="Return Qty" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => handleSuppRowQtyChange(index, e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="form-label">Return Value (INR)</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem", fontWeight: "bold", color: "var(--accent-secondary)" }} value={`₹${totalReturnVal.toFixed(2)}`} disabled />
              </div>
              <div>
                <label className="form-label">Reason for Supplier Return *</label>
                <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Expired batch, defective manufacturing" value={supplierReason} onChange={(e) => setSupplierReason(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab("supplier-list")}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                {submitting ? <span className="spinner"></span> : "Process Return"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details View Modal */}
      {isViewModalOpen && activeReturn && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Return Details Log</h3>
              <button className="btn-icon" onClick={() => setIsViewModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Return Reference</span>
                  <strong style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{activeReturn.returnNumber}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Order Reference</span>
                  <strong style={{ fontFamily: "monospace" }}>{activeReturnType === "customer" ? activeReturn.salesOrderNumber : activeReturn.purchaseOrderNumber}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Name</span>
                  <strong>{activeReturnType === "customer" ? activeReturn.customerName : activeReturn.supplierName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Date Recorded</span>
                  <span>{new Date(activeReturn.date).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Total Value</span>
                  <strong style={{ color: "var(--accent-secondary)" }}>₹{activeReturnType === "customer" ? activeReturn.totalRefundAmount.toFixed(2) : activeReturn.totalReturnAmount.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Reason</span>
                  <span>{activeReturn.reason}</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>Returned Products List</h4>
                <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      {activeReturnType === "customer" && <th>Condition</th>}
                      <th style={{ textAlign: "right" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReturn.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>{item.quantity} units</td>
                        {activeReturnType === "customer" && (
                          <td>
                            {item.condition === "Good" ? (
                              <span className="badge success">Restocked</span>
                            ) : (
                              <span className="badge danger">Damaged (Scrapped)</span>
                            )}
                          </td>
                        )}
                        <td style={{ textAlign: "right", fontWeight: 700 }}>₹{activeReturnType === "customer" ? item.refundAmount.toFixed(2) : (item.quantity * item.costPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;

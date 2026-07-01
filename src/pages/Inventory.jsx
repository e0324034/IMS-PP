import React, { useState, useEffect } from "react";
import { Search, Plus, ArrowUpDown, X, Calendar, ClipboardList, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Inventory = () => {
  const { fetchWithAuth, showToast } = useAuth();

  // State lists
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchProduct, setSearchProduct] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterWarehouse, setFilterWarehouse] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [adjustType, setAdjustType] = useState("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: filterType,
        product: searchProduct,
        warehouse: filterWarehouse,
        dateFrom,
        dateTo,
      });

      const response = await fetchWithAuth(`/api/transactions?${params.toString()}`);
      const resData = await response.json();
      if (resData.status === "success") {
        setTransactions(resData.data);
      }
    } catch (error) {
      console.error("Load transactions error:", error);
      showToast("Could not load transaction logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      // Load products for dropdown
      const prodRes = await fetchWithAuth("/api/products");
      const prodData = await prodRes.json();
      if (prodData.status === "success") setProducts(prodData.data);

      // Load warehouses for dropdown
      const wRes = await fetchWithAuth("/api/warehouses");
      const wData = await wRes.json();
      if (wData.status === "success") setWarehouses(wData.data);
    } catch (error) {
      console.error("Load initial data error:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchProduct, filterType, filterWarehouse, dateFrom, dateTo]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleExport = () => {
    const headers = ['productName', 'type', 'quantity', 'warehouse', 'toWarehouse', 'user', 'reference', 'reason', 'createdAt'];
    exportToCSV(transactions, headers, `inventory_audit_ledger_${Date.now()}.csv`, showToast);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !selectedWarehouse || !adjustQty || !adjustReason) {
      showToast("Please enter all adjustment details", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth(`/api/products/${selectedProduct}/adjust-stock`, {
        method: "POST",
        body: JSON.stringify({
          type: adjustType,
          quantity: Number(adjustQty),
          warehouseName: selectedWarehouse,
          reason: adjustReason,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Stock adjustment logged successfully", "success");
        setIsAdjustModalOpen(false);
        resetForm();
        loadTransactions();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Manual adjustment error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct("");
    setSelectedWarehouse("");
    setAdjustType("IN");
    setAdjustQty("");
    setAdjustReason("");
  };

  return (
    <div>
      {/* Filters & Actions */}
      <div className="actions-bar">
        <div className="search-input-container" style={{ max: "320px" }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product name..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
          />
        </div>

        <div className="filters-group" style={{ flexWrap: "wrap" }}>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="IN">Stock In (+)</option>
            <option value="OUT">Stock Out (-)</option>
            <option value="ADJUST">Correction</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <select
            className="filter-select"
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
          >
            <option value="All">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
            ))}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="date"
              className="filter-select"
              style={{ padding: "0.5rem", fontSize: "0.85rem" }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>to</span>
            <input
              type="date"
              className="filter-select"
              style={{ padding: "0.5rem", fontSize: "0.85rem" }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>
            <Download size={16} /> Export to Excel
          </button>

          <button className="btn-primary" onClick={() => { resetForm(); setIsAdjustModalOpen(true); }} style={{ width: "auto", whiteSpace: "nowrap" }}>
            <Plus size={18} /> Adjust Stock
          </button>
        </div>
      </div>

      {/* Ledger lists box */}
      <div className="content-box">
        <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
          <ClipboardList size={18} style={{ color: "var(--accent-primary)" }} />
          Inventory Ledger History
        </h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Warehouse Location</th>
                  <th>Operator</th>
                  <th>Reference</th>
                  <th>Reason / Comment</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td style={{ fontWeight: 600 }}>{tx.productName}</td>
                    <td>
                      <span className={`badge ${tx.type === "IN" ? "success" : tx.type === "OUT" ? "danger" : tx.type === "TRANSFER" ? "primary" : "warning"}`}>
                        {tx.type === "IN" ? "Stock In" : tx.type === "OUT" ? "Stock Out" : tx.type === "TRANSFER" ? "Transfer" : "Correction"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                    <td>
                      {tx.warehouse}
                      {tx.toWarehouse ? ` → ${tx.toWarehouse}` : ""}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{tx.user}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{tx.reference}</td>
                    <td style={{ color: "var(--text-secondary)", fontStyle: "italic", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.reason}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(tx.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            No stock ledger movements logged matching search criteria.
          </div>
        )}
      </div>

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "540px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Manual Stock Correction</h3>
              <button className="modal-close-btn" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Product *</label>
                  <select className="filter-select" style={{ width: "100%" }} value={selectedProduct} onChange={(e)=>setSelectedProduct(e.target.value)} required>
                    <option value="">Choose product...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Target Warehouse *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={selectedWarehouse} onChange={(e)=>setSelectedWarehouse(e.target.value)} required>
                      <option value="">Choose warehouse...</option>
                      {warehouses.map(w => (
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Adjustment Type *</label>
                    <select className="filter-select" style={{ width: "100%" }} value={adjustType} onChange={(e)=>setAdjustType(e.target.value)} required>
                      <option value="IN">Increase Stock (+)</option>
                      <option value="OUT">Decrease Stock (-)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Quantity to Adjust *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ paddingLeft: "1rem" }}
                      placeholder="e.g. 10"
                      value={adjustQty}
                      onChange={(e)=>setAdjustQty(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason / Comments *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: "1rem" }}
                    placeholder="e.g. Damaged inventory write-off / Spot audit adjustment"
                    value={adjustReason}
                    onChange={(e)=>setAdjustReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

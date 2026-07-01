import React, { useState, useEffect } from "react";
import { Coins, Plus, Trash2, RefreshCw, X, CreditCard, PieChart, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Expenses = () => {
  const { fetchWithAuth, showToast } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [category, setCategory] = useState("Transport");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/expenses");
      const resData = await response.json();
      if (resData.status === "success") {
        setExpenses(resData.data);
      }
    } catch (error) {
      console.error("Load expenses error:", error);
      showToast("Could not load expenses list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleExport = () => {
    const headers = ['expenseNumber', 'category', 'amount', 'description', 'user', 'date'];
    exportToCSV(expenses, headers, `expenses_ledger_${Date.now()}.csv`, showToast);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();

    if (!category || !amount || !description) {
      showToast("Please enter required fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description,
          date: date || undefined
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Expense logged successfully", "success");
        setIsAddModalOpen(false);
        // Clear fields
        setCategory("Transport");
        setAmount("");
        setDescription("");
        setDate("");
        loadExpenses();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Log expense error:", error);
      showToast("Failed to log expense", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense record?")) {
      try {
        const response = await fetchWithAuth(`/api/expenses/${id}`, {
          method: "DELETE"
        });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Expense deleted successfully", "success");
          loadExpenses();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete expense error:", error);
        showToast("Failed to delete expense", "error");
      }
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Transport": return "var(--accent-secondary)";
      case "Warehouse": return "var(--accent-primary)";
      case "Employee": return "var(--success)";
      case "Maintenance": return "#f97316";
      case "Utility": return "#e11d48";
      default: return "var(--text-secondary)";
    }
  };

  // Helper: Aggregate category spending
  const getCategoryStats = () => {
    const stats = {
      Transport: 0,
      Warehouse: 0,
      Employee: 0,
      Maintenance: 0,
      Utility: 0,
      Other: 0
    };

    expenses.forEach(e => {
      if (stats[e.category] !== undefined) {
        stats[e.category] += e.amount;
      }
    });

    const total = Object.values(stats).reduce((sum, v) => sum + v, 0);
    const maxVal = Math.max(...Object.values(stats), 1);

    return {
      total,
      breakdown: Object.entries(stats).map(([k, v]) => ({
        name: k,
        amount: v,
        percentage: total > 0 ? Math.round((v / total) * 100) : 0,
        scale: Math.round((v / maxVal) * 100)
      }))
    };
  };

  const stats = getCategoryStats();

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        
        {/* Main Expenses Table */}
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <CreditCard size={18} style={{ color: "var(--accent-primary)" }} />
              Business Expense Logbook
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
              </button>
              <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem" }}>
                <Plus size={16} /> Log Expense
              </button>
              <button className="btn-secondary" onClick={loadExpenses} style={{ padding: "0.5rem" }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : expenses.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Expense ID</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Recorded By</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{e.expenseNumber}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: "rgba(255,255,255,0.03)", color: getCategoryColor(e.category), border: `1px solid ${getCategoryColor(e.category)}` }}>
                          {e.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--danger)" }}>- ₹{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td>{e.description}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{e.reportedBy}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-icon delete" onClick={() => handleDeleteExpense(e._id)} title="Delete record">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No expenses recorded yet. Accurate profit/loss requires logging operational costs!
            </div>
          )}
        </div>

        {/* Sidebar Spending Summary Chart */}
        <div>
          <div className="content-box">
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <PieChart size={18} style={{ color: "var(--accent-secondary)" }} />
              Spending Distribution
            </h3>
            
            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "2rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Outflow</span>
              <h2 style={{ fontSize: "1.8rem", color: "var(--danger)", margin: "0.25rem 0 0" }}>₹{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {stats.breakdown.map((item) => (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                    <span>{item.name}</span>
                    <strong>₹{item.amount.toLocaleString()} ({item.percentage}%)</strong>
                  </div>
                  <div className="progress-bar-container" style={{ height: "6px" }}>
                    <div className="progress-bar-fill" style={{ width: `${item.scale}%`, background: getCategoryColor(item.name) }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Log Expense Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Log Business Expense</h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select className="form-input" style={{ paddingLeft: "1rem" }} value={category} onChange={(e) => setCategory(e.target.value)} required>
                    <option value="Transport">Transport / Logistics</option>
                    <option value="Warehouse">Warehouse Rent / Storage</option>
                    <option value="Employee">Employee Salaries / Perks</option>
                    <option value="Maintenance">Maintenance & Spares</option>
                    <option value="Utility">Utilities (Power, Water, Net)</option>
                    <option value="Other">Other Miscellaneous Expenses</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Expense Amount (INR) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" className="form-input" style={{ paddingLeft: "1rem" }} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Remarks *</label>
                  <input type="text" placeholder="e.g. Paid diesel charge for transport vehicle" className="form-input" style={{ paddingLeft: "1rem" }} value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expense Date</label>
                  <input type="date" className="form-input" style={{ paddingLeft: "1rem" }} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

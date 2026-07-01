import React, { useState, useEffect } from "react";
import { History, RefreshCw, Calendar, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Transactions = () => {
  const { fetchWithAuth, showToast } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/transactions");
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

  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <div>
      {/* Table Audit Logs */}
      <div className="content-box">
        <div className="content-box-header">
          <h3 className="content-box-title">
            <History size={18} style={{ color: "var(--accent-primary)" }} />
            Stock Adjustments Audit Logs
          </h3>
          <button className="btn-secondary" onClick={loadTransactions} style={{ padding: "0.5rem", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "5rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Operator</th>
                  <th>Reason / Comment</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td style={{ fontWeight: 600 }}>{tx.productName}</td>
                    <td>
                      <span className={`badge ${tx.type === "IN" ? "success" : "danger"}`}>
                        {tx.type === "IN" ? "Stock In" : "Stock Out"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                    <td>{tx.user}</td>
                    <td style={{ color: "var(--text-secondary)", fontStyle: "italic", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.reason}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
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
          <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--text-secondary)" }}>
            <FileText size={48} style={{ color: "var(--border-color)", marginBottom: "1rem" }} />
            <p>No transaction logs are recorded. Start adding products or adjusting stock levels to populate this audit log.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;

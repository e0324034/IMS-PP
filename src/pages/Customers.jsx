import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Mail, Phone, ShieldAlert, CreditCard, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Customers = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("50000");
  const [outstandingBalance, setOutstandingBalance] = useState("0");
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/customers");
      const resData = await response.json();
      if (resData.status === "success") {
        setCustomers(resData.data);
      }
    } catch (error) {
      console.error("Load customers error:", error);
      showToast("Could not load customers directory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleExport = () => {
    const headers = ['name', 'email', 'phone', 'address', 'gstNumber', 'creditLimit', 'outstandingBalance'];
    exportToCSV(customers, headers, `customers_${Date.now()}.csv`, showToast);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !address) {
      showToast("Please enter required fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const url = activeCustomer ? `/api/customers/${activeCustomer._id}` : "/api/customers";
      const method = activeCustomer ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          gstNumber,
          creditLimit: Number(creditLimit),
          outstandingBalance: Number(outstandingBalance),
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(activeCustomer ? "Customer updated successfully" : "Customer registered successfully", "success");
        setIsModalOpen(false);
        resetForm();
        loadCustomers();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Save customer error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (c) => {
    if (window.confirm(`Are you sure you want to delete customer "${c.name}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/customers/${c._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Customer profile deleted successfully", "success");
          loadCustomers();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete customer error:", error);
      }
    }
  };

  const openEditModal = (c) => {
    setActiveCustomer(c);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setAddress(c.address);
    setGstNumber(c.gstNumber || "");
    setCreditLimit(c.creditLimit);
    setOutstandingBalance(c.outstandingBalance);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGstNumber("");
    setCreditLimit("50000");
    setOutstandingBalance("0");
    setActiveCustomer(null);
  };

  return (
    <div>
      <div className="actions-bar" style={{ justifyContent: "flex-end", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
          <Download size={16} /> Export to Excel
        </button>
        {!isOperator && (
          <button className="btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ width: "auto" }}>
            <Plus size={18} /> Register Customer
          </button>
        )}
      </div>

      <div className="content-box">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : customers.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Details</th>
                  <th>GST Number</th>
                  <th>Credit Limit</th>
                  <th>Outstanding Balance</th>
                  <th>Credit Alert</th>
                  {!isOperator && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const creditRatio = c.outstandingBalance / (c.creditLimit || 1);
                  const showCreditWarning = creditRatio > 0.8;
                  
                  return (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
                          <Mail size={12} /> {c.email}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
                          <Phone size={12} /> {c.phone}
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{c.gstNumber || "-"}</td>
                      <td>₹{c.creditLimit.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: c.outstandingBalance > 0 ? "var(--danger)" : "var(--text-primary)" }}>
                        ₹{c.outstandingBalance.toLocaleString()}
                      </td>
                      <td>
                        {showCreditWarning ? (
                          <span className="badge danger" style={{ display: "inline-flex", gap: "0.25rem" }}>
                            <ShieldAlert size={12} /> Over 80% Limit
                          </span>
                        ) : (
                          <span className="badge success">Good Standing</span>
                        )}
                      </td>
                      {!isOperator && (
                        <td style={{ textAlign: "right" }}>
                          <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                            <button className="btn-icon edit" onClick={() => openEditModal(c)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDeleteClick(c)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            No customer profiles saved. Register customers to associate sales orders.
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3 className="modal-title">{activeCustomer ? "Edit Customer Details" : "Register Customer"}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Customer Name *</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Acme Corp" value={name} onChange={(e)=>setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="purchasing@acme.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Phone Number *</label>
                    <input type="tel" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="999-999-9999" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">GSTIN ID / Tax ID</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. GST12345" value={gstNumber} onChange={(e)=>setGstNumber(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Credit Limit (₹)</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={creditLimit} onChange={(e)=>setCreditLimit(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Outstanding Balance (₹)</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={outstandingBalance} onChange={(e)=>setOutstandingBalance(e.target.value)} disabled={!activeCustomer} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Billing Address *</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "80px", resize: "none" }} placeholder="Billing Address..." value={address} onChange={(e)=>setAddress(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

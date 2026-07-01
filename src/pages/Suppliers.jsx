import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Star, Mail, Phone, MapPin, Award, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Suppliers = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/suppliers");
      const resData = await response.json();
      if (resData.status === "success") {
        setSuppliers(resData.data);
      }
    } catch (error) {
      console.error("Load suppliers error:", error);
      showToast("Could not load suppliers profile list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleExport = () => {
    const headers = ['supplierName', 'contactPerson', 'email', 'phone', 'address', 'gstNumber', 'rating'];
    exportToCSV(suppliers, headers, `suppliers_${Date.now()}.csv`, showToast);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName || !contactPerson || !email || !phone || !address) {
      showToast("Please fill in required fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const url = activeSupplier ? `/api/suppliers/${activeSupplier._id}` : "/api/suppliers";
      const method = activeSupplier ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          supplierName,
          contactPerson,
          email,
          phone,
          address,
          gstNumber,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(activeSupplier ? "Supplier updated successfully" : "Supplier registered successfully", "success");
        setIsModalOpen(false);
        resetForm();
        loadSuppliers();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Save supplier error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (s) => {
    if (window.confirm(`Are you sure you want to delete supplier "${s.supplierName}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/suppliers/${s._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Supplier profile deleted", "success");
          loadSuppliers();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete supplier error:", error);
      }
    }
  };

  const openEditModal = (s) => {
    setActiveSupplier(s);
    setSupplierName(s.supplierName);
    setContactPerson(s.contactPerson);
    setEmail(s.email);
    setPhone(s.phone);
    setAddress(s.address);
    setGstNumber(s.gstNumber || "");
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSupplierName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGstNumber("");
    setActiveSupplier(null);
  };

  const renderRatingStars = (ratingNum) => {
    const stars = [];
    const rounded = Math.round(ratingNum);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          style={{
            fill: i <= rounded ? "var(--warning)" : "none",
            color: i <= rounded ? "var(--warning)" : "var(--text-muted)",
            marginRight: "2px",
          }}
        />
      );
    }
    return <div style={{ display: "flex", alignItems: "center" }}>{stars}</div>;
  };

  return (
    <div>
      <div className="actions-bar" style={{ justifyContent: "flex-end", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
          <Download size={16} /> Export to Excel
        </button>
        {!isOperator && (
          <button className="btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ width: "auto" }}>
            <Plus size={18} /> Register Supplier
          </button>
        )}
      </div>

      <div className="content-box">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : suppliers.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Supplier / Contact</th>
                  <th>Contact Details</th>
                  <th>GST Number</th>
                  <th>Total Purchase Orders</th>
                  <th>Total Purchases Value</th>
                  <th>Rating Performance</th>
                  {!isOperator && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.supplierName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Rep: {s.contactPerson}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
                        <Mail size={12} /> {s.email}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
                        <Phone size={12} /> {s.phone}
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{s.gstNumber || "-"}</td>
                    <td style={{ fontWeight: 600 }}>{s.ordersCompleted} completed</td>
                    <td style={{ fontWeight: 600 }}>${s.totalPurchasesValue.toLocaleString()}</td>
                    <td>{renderRatingStars(s.rating)}</td>
                    {!isOperator && (
                      <td style={{ textAlign: "right" }}>
                        <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                          <button className="btn-icon edit" onClick={() => openEditModal(s)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDeleteClick(s)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            No suppliers found. Create a supplier to associate purchase orders.
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3 className="modal-title">{activeSupplier ? "Edit Supplier Profile" : "Register Supplier"}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Supplier Name *</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. ABC Tech Distributors" value={supplierName} onChange={(e)=>setSupplierName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Contact Person *</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. David Lin" value={contactPerson} onChange={(e)=>setContactPerson(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="lin@abc.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Phone Number *</label>
                    <input type="tel" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. 999-999-9999" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN ID / Tax Code</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. GST12345" value={gstNumber} onChange={(e)=>setGstNumber(e.target.value)} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Supplier Address *</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "80px", resize: "none" }} placeholder="Street, State, PIN..." value={address} onChange={(e)=>setAddress(e.target.value)} required />
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

export default Suppliers;

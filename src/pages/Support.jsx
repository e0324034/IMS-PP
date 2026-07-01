import React, { useState, useEffect } from "react";
import { HelpCircle, Plus, Eye, RefreshCw, X, Check, LifeBuoy, ChevronDown, ChevronUp, Star, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Support = () => {
  const { fetchWithAuth, showToast, user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Form states
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const faqs = [

    { q: "Who can approve stock transfer requests?", a: "Only Administrators and Managers have access to approve, ship, and receive inter-warehouse transfers. Staff can view requests and confirm receipt if allocated." },
    { q: "What is the difference between Customer and Supplier returns?", a: "Customer returns process goods returned by buyers, adding back good-condition stock to inventory and recording refunds. Supplier returns handle sending damaged or expired stock back to vendors, deducting quantities." },
    { q: "How does the AI Prediction module calculate low stock?", a: "The AI engine tracks sales invoices from the last 30 days to calculate a daily run-rate. It then divides current stock by this run-rate to project exactly how many days of inventory remain before running out." },
    { q: "How do I backup the entire database?", a: "Go to System Settings (Admin only), click the 'Backup & Restore' tab, and click 'Export JSON Backup' to download a complete backup file containing all collections." }
  ];

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/support");
      const resData = await response.json();
      if (resData.status === "success") {
        setTickets(resData.data);
      }
    } catch (error) {
      console.error("Load tickets error:", error);
      showToast("Could not load support tickets list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleExport = () => {
    const headers = ['ticketNumber', 'subject', 'description', 'status', 'user', 'rating', 'feedback', 'createdAt'];
    exportToCSV(tickets, headers, `support_tickets_${Date.now()}.csv`, showToast);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();

    if (!subject || !description) {
      showToast("Please enter subject and description", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/support", {
        method: "POST",
        body: JSON.stringify({
          subject,
          description,
          rating,
          feedback
        })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Support ticket raised successfully!", "success");
        setIsAddModalOpen(false);
        setSubject("");
        setDescription("");
        setRating(5);
        setFeedback("");
        loadTickets();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Raise ticket error:", error);
      showToast("Failed to submit ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const response = await fetchWithAuth(`/api/support/${ticketId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Resolved" })
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Ticket marked as Resolved!", "success");
        loadTickets();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Resolve ticket error:", error);
      showToast("Failed to resolve ticket", "error");
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Open":
        return <span className="badge warning">Open</span>;
      case "In Progress":
        return <span className="badge primary">In Progress</span>;
      default:
        return <span className="badge success">Resolved</span>;
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }}>
        
        {/* Left Side: FAQ & User Guide */}
        <div>
          {/* FAQ Section */}
          <div className="content-box" style={{ marginBottom: "2rem" }}>
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <HelpCircle size={18} style={{ color: "var(--accent-primary)" }} />
              Frequently Asked Questions (FAQ)
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                    <button 
                      onClick={() => toggleFaq(idx)} 
                      style={{ 
                        width: "100%", 
                        padding: "1rem", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        background: "rgba(255,255,255,0.01)", 
                        border: "none", 
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        textAlign: "left",
                        fontWeight: 600
                      }}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: "1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Guide Section */}
          <div className="content-box">
            <h3 className="content-box-title" style={{ marginBottom: "1rem" }}>
              <LifeBuoy size={18} style={{ color: "var(--accent-secondary)" }} />
              Quick System Operational Guide
            </h3>
            
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              <p>Welcome to the <strong>Instatenders Inventory Management System</strong>. Follow these standard practices:</p>
              <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                <li><strong>Roles & Access</strong>: Admins configure users, taxes, and backups. Managers supervise catalogs, purchases, and sales. Staff handles logistics and reports damages.</li>
                <li><strong>Stock Movements</strong>: Always document transfers before moving goods to ensure warehouse-wise counts match physical stock.</li>
                <li><strong>Discounts & Taxes</strong>: Tax calculations are set store-wide in Settings. Discount percentages set on products are applied automatically to Sales Order items.</li>
                <li><strong>Wastage Audits</strong>: Regularly write off expired or defective items under the Wastage portal to maintain an accurate asset valuation.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side: Helpdesk / Support Tickets */}
        <div className="content-box">
          <div className="content-box-header" style={{ marginBottom: "1.5rem" }}>
            <h3 className="content-box-title">
              <LifeBuoy size={18} style={{ color: "var(--accent-secondary)" }} />
              Support & Helpdesk Tickets
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
              </button>
              <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: "0.5rem 1rem" }}>
                <Plus size={16} /> Raise Ticket
              </button>
              <button className="btn-secondary" onClick={loadTickets} style={{ padding: "0.5rem" }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : tickets.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {tickets.map((t) => (
                <div key={t._id} style={{ border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "8px", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
                    <strong style={{ fontFamily: "monospace" }}>{t.ticketNumber}</strong>
                    {getStatusBadge(t.status)}
                  </div>
                  <h4 style={{ margin: "0.25rem 0", fontSize: "0.95rem" }}>{t.subject}</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.25rem 0 0.75rem" }}>{t.description}</p>
                  
                  {/* Star Rating display if provided */}
                  {t.rating && (
                    <div style={{ display: "flex", gap: "2px", alignItems: "center", marginBottom: "0.5rem" }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < t.rating ? "var(--warning)" : "none"} stroke={i < t.rating ? "var(--warning)" : "var(--text-muted)"} />
                      ))}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>({t.rating}/5)</span>
                    </div>
                  )}

                  {t.feedback && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                      Feedback: {t.feedback}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span>Raised by: {t.user}</span>
                    {isAdmin && t.status !== "Resolved" && (
                      <button className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", borderColor: "var(--success)", color: "var(--success)" }} onClick={() => handleResolveTicket(t._id)}>
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              No support tickets raised yet.
            </div>
          )}
        </div>

      </div>

      {/* Raise Ticket Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Raise Support Ticket / Feedback</h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Issues adding tax rates, printer alignment" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Details / Issue Description *</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "80px", resize: "none" }} placeholder="Provide detailed steps to reproduce the error or feedback requests..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <label className="form-label">Rate your system experience (Stars)</label>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        type="button" 
                        onClick={() => setRating(star)} 
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                      >
                        <Star size={20} fill={star <= rating ? "var(--warning)" : "none"} stroke={star <= rating ? "var(--warning)" : "var(--text-muted)"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Additional Feedback / Suggestions</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. System is fast and clean, suggest dark mode tweaks" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;

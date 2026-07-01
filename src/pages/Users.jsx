import React, { useState, useEffect } from "react";
import { 
  Users as UsersIcon, 
  ShieldAlert, 
  X, 
  RefreshCw, 
  Key, 
  UserCheck, 
  Trash2, 
  ShieldCheck, 
  Activity, 
  UserX, 
  Plus,
  Download
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Users = () => {
  const { fetchWithAuth, showToast } = useAuth();

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "audit"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Active User Context for Modals
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");
  const [newPassword, setNewPassword] = useState("");
  const [userActivity, setUserActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/auth/users");
      const resData = await response.json();
      if (resData.status === "success") {
        setUsers(resData.data);
      }
    } catch (error) {
      console.error("Load users error:", error);
      showToast("Could not load users list", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/audit");
      const resData = await response.json();
      if (resData.status === "success") {
        setAuditLogs(resData.data);
      }
    } catch (error) {
      console.error("Load audit logs error:", error);
      showToast("Could not load compliance logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleExportUsers = () => {
    const headers = ['name', 'email', 'phone', 'role', 'isActive', 'isVerified'];
    exportToCSV(users, headers, `users_directory_${Date.now()}.csv`, showToast);
  };

  const handleExportAudit = () => {
    const headers = ['user', 'action', 'ipAddress', 'createdAt'];
    exportToCSV(auditLogs, headers, `security_compliance_audit_${Date.now()}.csv`, showToast);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !phone || !role) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone, role }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("User account created successfully", "success");
        setIsAddModalOpen(false);
        // Clear fields
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setRole("Staff");
        loadUsers();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Create user error:", error);
      showToast("Failed to create user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u) => {
    const nextActiveState = u.isActive === undefined ? false : !u.isActive;
    const actionText = nextActiveState ? "activate" : "deactivate";
    
    if (window.confirm(`Are you sure you want to ${actionText} user "${u.name}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/auth/users/${u._id}`, {
          method: "PUT",
          body: JSON.stringify({ isActive: nextActiveState }),
        });

        const resData = await response.json();
        if (resData.status === "success") {
          showToast(`User account ${nextActiveState ? "activated" : "deactivated"} successfully`, "success");
          loadUsers();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Toggle user status error:", error);
        showToast("Failed to toggle status", "error");
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetchWithAuth(`/api/auth/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("User role updated successfully", "success");
        loadUsers();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Change role error:", error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth(`/api/auth/users/${selectedUser._id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("User password reset successfully", "success");
        setIsResetModalOpen(false);
        setNewPassword("");
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      showToast("Failed to reset password", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openActivityModal = async (u) => {
    setSelectedUser(u);
    setIsActivityModalOpen(true);
    try {
      setLoadingActivity(true);
      const response = await fetchWithAuth(`/api/auth/users/${u._id}/activity`);
      const resData = await response.json();
      if (resData.status === "success") {
        setUserActivity(resData.data);
      }
    } catch (error) {
      console.error("Load user activity error:", error);
      showToast("Could not load activity logs", "error");
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (window.confirm(`Are you sure you want to delete user "${u.name}" (${u.email})?`)) {
      try {
        const response = await fetchWithAuth(`/api/auth/users/${u._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("User account deleted successfully", "success");
          loadUsers();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete user error:", error);
      }
    }
  };

  return (
    <div>
      {/* Tabs headers */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("users")}
          className="btn-secondary"
          style={{
            background: activeTab === "users" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "users" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "users" ? "white" : "var(--text-secondary)",
          }}
        >
          User Accounts Manager
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className="btn-secondary"
          style={{
            background: activeTab === "audit" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
            border: activeTab === "audit" ? "none" : "1px solid var(--border-color)",
            color: activeTab === "audit" ? "white" : "var(--text-secondary)",
          }}
        >
          Security Audit Logs
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <UsersIcon size={18} style={{ color: "var(--accent-primary)" }} />
              Registered User Profiles
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExportUsers} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
              </button>
              <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem" }}>
                <Plus size={16} /> Add User
              </button>
              <button className="btn-secondary" onClick={loadUsers} style={{ padding: "0.5rem" }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : users.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>System Role</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>
                        <select
                          className="filter-select"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="Staff">Staff</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        {u.isActive !== false ? (
                          <span className="badge success">Active</span>
                        ) : (
                          <span className="badge danger">Deactivated</span>
                        )}
                      </td>
                      <td>
                        {u.isVerified ? (
                          <span className="badge success">Verified</span>
                        ) : (
                          <span className="badge warning">Pending OTP</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="actions-cell" style={{ justifyContent: "flex-end", gap: "0.35rem" }}>
                          <button className="btn-icon edit" title="View activity history" onClick={() => openActivityModal(u)}>
                            <Activity size={14} />
                          </button>
                          <button className="btn-icon edit" title="Reset password" onClick={() => { setSelectedUser(u); setIsResetModalOpen(true); }}>
                            <Key size={14} />
                          </button>
                          <button 
                            className="btn-icon edit" 
                            title={u.isActive !== false ? "Deactivate User" : "Activate User"} 
                            onClick={() => handleToggleStatus(u)}
                            style={{ color: u.isActive !== false ? "var(--danger)" : "var(--success)" }}
                          >
                            {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button className="btn-icon delete" title="Delete User" onClick={() => handleDeleteUser(u)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No users found.
            </div>
          )}
        </div>
      ) : (
        <div className="content-box">
          <div className="content-box-header">
            <h3 className="content-box-title">
              <ShieldCheck size={18} style={{ color: "var(--accent-secondary)" }} />
              Compliance System Log Activity
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleExportAudit} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                <Download size={14} /> Export to Excel
              </button>
              <button className="btn-secondary" onClick={loadAuditLogs} style={{ padding: "0.5rem" }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table" style={{ fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    <th>User / Operator</th>
                    <th>Action Event Description</th>
                    <th>IP Address</th>
                    <th>Time Stamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 600 }}>{log.user}</td>
                      <td>{log.action}</td>
                      <td style={{ fontFamily: "monospace" }}>{log.ipAddress}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No audit logs captured.
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Create User Account</h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" style={{ paddingLeft: "1rem" }} value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input type="tel" className="form-input" style={{ paddingLeft: "1rem" }} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input type="password" placeholder="Min 6 characters" className="form-input" style={{ paddingLeft: "1rem" }} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">System Access Role</label>
                  <select className="form-input" style={{ paddingLeft: "1rem" }} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Staff">Staff (Operations)</option>
                    <option value="Manager">Manager (Supervisory)</option>
                    <option value="Admin">Admin (Full Control)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password</h3>
              <button className="btn-icon" onClick={() => setIsResetModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Resetting password for user: <strong>{selectedUser?.email}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input type="password" placeholder="At least 6 characters" className="form-input" style={{ paddingLeft: "1rem" }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {isActivityModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3 className="modal-title">User Activity Audit Logs</h3>
              <button className="btn-icon" onClick={() => setIsActivityModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Activity logs history for user: <strong>{selectedUser?.email}</strong>
              </p>
              {loadingActivity ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
                  <div className="spinner"></div>
                </div>
              ) : userActivity.length > 0 ? (
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Action Description</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userActivity.map((log) => (
                        <tr key={log._id}>
                          <td>{log.action}</td>
                          <td style={{ fontFamily: "monospace" }}>{log.ipAddress}</td>
                          <td>{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No recent activities logged for this user.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsActivityModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

import { useState } from "react";
import { Mail, Phone, Shield, Lock, Save, Eye, EyeOff, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";


const Profile = () => {
  const { user, fetchWithAuth, showToast } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleExport = () => {
    const headers = ['name', 'email', 'phone', 'role'];
    exportToCSV([user], headers, `my_profile_${Date.now()}.csv`, showToast);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast("Please enter password values", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Password updated successfully!", "success");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Change password error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div>
      <div className="dashboard-split" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
        
        {/* Profile Info Card */}
        <div className="content-box" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            <h3 className="content-box-title" style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
              My Staff Profile
            </h3>
            <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              <Download size={12} /> Export to Excel
            </button>
          </div>

          {user && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <div className="profile-large-avatar" style={{ width: "90px", height: "90px", fontSize: "2.2rem" }}>
                {getInitials(user.name)}
              </div>
              
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>{user.name}</h2>
                <span className="badge success" style={{ marginTop: "0.5rem" }}>{user.role} Member</span>
              </div>

              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem" }}>
                  <Mail size={16} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", display: "block" }}>Email Address</span>
                    <strong>{user.email}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem" }}>
                  <Phone size={16} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", display: "block" }}>Phone Number</span>
                    <strong>{user.phone || "Not provided"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem" }}>
                  <Shield size={16} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", display: "block" }}>Account Role</span>
                    <strong>{user.role} Account</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change password Card */}
        <div className="content-box">
          <h3 className="content-box-title" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            Change Account Password
          </h3>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showOldPassword ? "text" : "password"}
                  className="form-input form-input-password"
                  placeholder="••••••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-input form-input-password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label">Confirm New Password *</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input form-input-password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Save size={18} />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;

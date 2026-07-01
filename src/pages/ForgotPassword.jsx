import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, HelpCircle, ArrowLeft, Key, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [localResetLink, setLocalResetLink] = useState("");

  const { forgotPassword, showToast } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLocalResetLink("");

    if (!email) {
      setErrorMsg("Please enter your email address");
      return;
    }

    setSubmitting(true);
    const result = await forgotPassword(email);
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg("If this account exists, instructions have been generated. Redirecting to reset password...");
      showToast("Verification code generated!", "success");
      
      const testOtpVal = (result.data && !result.data.emailSent && result.data.resetToken) ? result.data.resetToken : "";
      
      if (testOtpVal) {
        const resetUrl = `/reset-password?email=${encodeURIComponent(email)}&token=${testOtpVal}`;
        setLocalResetLink(resetUrl);
      }

      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`, { 
          state: { testOtp: testOtpVal } 
        });
      }, 2000);
    } else {
      setErrorMsg(result.message || "Failed to process request");
      showToast(result.message || "Request failed", "error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span>⚡ Instatenders</span> Inventory
          </div>
          <p className="auth-subtitle">Recover your staff account password</p>
        </div>

        {successMsg && (
          <div className="test-fallback-banner" style={{ borderColor: "rgba(16, 185, 129, 0.2)" }}>
            <div className="test-fallback-title" style={{ color: "var(--success)" }}>
              Success
            </div>
            <p className="test-fallback-text">{successMsg}</p>
          </div>
        )}

        {localResetLink && (
          <div className="test-fallback-banner">
            <div className="test-fallback-title">
              <Key size={16} /> [Local Testing Mode]
            </div>
            <p className="test-fallback-text">
              The email service is disabled. You can directly proceed using this local link:
            </p>
            <Link to={localResetLink} className="auth-link" style={{ fontSize: "0.9rem", display: "inline-block", marginTop: "0.5rem" }}>
              Proceed to Reset Password &rarr;
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="test-fallback-banner" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <div className="test-fallback-title" style={{ color: "var(--danger)" }}>
              <ShieldAlert size={16} /> Error
            </div>
            <p className="test-fallback-text">{errorMsg}</p>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <HelpCircle size={18} />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft size={16} style={{ color: "var(--text-secondary)" }} />
          <Link to="/login" className="auth-link" style={{ marginLeft: 0 }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

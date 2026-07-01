import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Key, ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, showToast } = useAuth();

  // Retrieve email and testOtp from navigation state if available
  const stateEmail = location.state?.email || "";
  const stateTestOtp = location.state?.testOtp || "";

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !otp) {
      setErrorMsg("Please fill in both email and OTP");
      return;
    }

    setSubmitting(true);
    const result = await verifyOtp(email, otp);
    setSubmitting(false);

    if (result.success) {
      navigate("/login");
    } else {
      setErrorMsg(result.message || "Invalid OTP code");
      showToast(result.message || "OTP verification failed", "error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span>⚡ Instatenders</span> Inventory
          </div>
          <p className="auth-subtitle">Verify your staff account</p>
        </div>

        {/* Local testing banner if test OTP is returned */}
        {stateTestOtp && (
          <div className="test-fallback-banner">
            <div className="test-fallback-title">
              <Key size={16} /> [Local Testing Mode]
            </div>
            <p className="test-fallback-text">
              The email service is disabled on this server. Please use the following generated OTP code:
            </p>
            <div className="test-fallback-code">{stateTestOtp}</div>
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
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

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label">Verification OTP Code</label>
            <div className="input-wrapper">
              <Key className="input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                placeholder="Enter 4-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <span className="spinner"></span>
            ) : (
              <>
                <ShieldCheck size={18} />
                Verify Account
              </>
            )}
          </button>
        </form>

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

export default VerifyOtp;

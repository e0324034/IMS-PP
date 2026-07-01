import { useState } from "react";
import { useSearchParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Lock, ShieldCheck, ShieldAlert, ArrowLeft, Eye, EyeOff, Mail, Key } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, showToast } = useAuth();

  const initialEmail = searchParams.get("email") || "";
  const initialToken = searchParams.get("token") || "";
  const stateTestOtp = location.state?.testOtp || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !otp) {
      setErrorMsg("Email and OTP Code are required");
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMsg("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(email, otp, password);
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      showToast("Password updated!", "success");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } else {
      setErrorMsg(result.message || "Failed to reset password");
      showToast(result.message || "Password reset failed", "error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span>⚡ Instatenders</span> Inventory
          </div>
          <p className="auth-subtitle">Choose a new password</p>
        </div>

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

        {successMsg && (
          <div className="test-fallback-banner" style={{ borderColor: "rgba(16, 185, 129, 0.2)" }}>
            <div className="test-fallback-title" style={{ color: "var(--success)" }}>
              Success
            </div>
            <p className="test-fallback-text">{successMsg}</p>
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

            <div className="form-group">
              <label className="form-label">Gmail OTP Code</label>
              <div className="input-wrapper">
                <Key className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input form-input-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label">Confirm New Password</label>
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
                  <ShieldCheck size={18} />
                  Reset Password
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

export default ResetPassword;

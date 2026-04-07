import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPasswordReset } from "./services/Auth";

function ResetPasswordConfirm() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await confirmPasswordReset(uid, token, password);
      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setMessage(error.response?.data?.detail || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Reset Password"}
        </button>

        {message && <p className="already">{message}</p>}
      </form>
    </section>
  );
}

export default ResetPasswordConfirm;

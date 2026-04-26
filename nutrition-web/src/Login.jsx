import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProfile, login } from "./services/Auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      const profileRes = await getProfile();
      const profile = profileRes.data;

      localStorage.setItem("userRole", profile.is_staff || profile.is_superuser ? "admin" : profile.role);

      if (profile.is_staff || profile.is_superuser) {
        navigate("/admin");
      } else if (profile.role === "client") {
        navigate("/user-dashboard");
      } else if (profile.role === "nutritionist") {
        navigate("/nutri-dashboard");
      } else {
        alert("Unknown role, cannot redirect.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Invalid credentials. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="already">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="already">
          Don&apos;t have an account?{" "}
          <Link to="/signup-user">Sign Up as Client</Link> |{" "}
          <Link to="/signup-nutritionist">Sign Up as Nutritionist</Link>
        </p>
      </form>
    </section>
  );
}

export default Login;



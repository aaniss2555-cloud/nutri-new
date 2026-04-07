import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "./services/Auth"; // ✅ use auth service

function UserSignup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    age: "",
    weight: "",
    allergies: "",
    avoid: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await register({
        email: form.email, // ✅ no username field
        password: form.password,
        role: "client",
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        age: form.age,
        weight: form.weight,
        allergies: form.allergies,
        avoid: form.avoid,
      });
      alert("Account created! Please log in.");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data || "Signup failed.";
      alert(JSON.stringify(msg));
    }
  };

  return (
    <section id="user-login" className="login-section">
      {step === 1 && (
        <form className="login-form">
          <h2>Sign up</h2>
          <input
            name="first_name"
            type="text"
            placeholder="First Name"
            value={form.first_name}
            onChange={handleChange}
            required
          />
          <input
            name="last_name"
            type="text"
            placeholder="Last Name"
            value={form.last_name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            name="phone"
            type="text"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
          <button type="button" onClick={() => setStep(2)}>
            Next
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="info-form" onSubmit={handleSubmit}>
          <h2>Health Info</h2>
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={handleChange}
          />
          <input
            name="weight"
            type="number"
            placeholder="Weight (kg)"
            value={form.weight}
            onChange={handleChange}
          />
          <input
            name="allergies"
            type="text"
            placeholder="Foods you cannot eat"
            value={form.allergies}
            onChange={handleChange}
          />
          <textarea
            name="avoid"
            placeholder="Other health notes"
            value={form.avoid}
            onChange={handleChange}
          ></textarea>
          <button type="submit">Submit</button>
        </form>
      )}
    </section>
  );
}

export default UserSignup;

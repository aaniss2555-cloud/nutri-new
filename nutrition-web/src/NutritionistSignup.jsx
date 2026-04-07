import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function NutritionistSignup() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [file, setFile] = useState(null);
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
      const formData = new FormData();
      formData.append("username", form.email);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("role", "nutritionist");
      formData.append("first_name", form.first_name);
      formData.append("last_name", form.last_name);
      formData.append("phone", form.phone);
      if (file) formData.append("certificate", file);

      await axios.post(
        "http://localhost:8000/api/accounts/register/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      alert("Account created! Please log in.");
      navigate("/login");
    } catch {
      alert("Signup failed.");
    }
  };

  return (
    <section id="nutri-login" className="login-section">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Nutritionist Sign up</h2>
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
        <input
          type="file"
          accept=".pdf,.jpg,.png"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Submit</button>
      </form>
    </section>
  );
}

export default NutritionistSignup;

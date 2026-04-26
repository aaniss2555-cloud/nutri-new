import React, { useState } from "react";
import api from "./services/axiosInstance";

function Contact() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await api.post("inquiries/", form);
      setForm({ full_name: "", email: "", subject: "", message: "" });
      setStatus("Message sent to the administrator.");
    } catch (error) {
      console.error("Failed to send inquiry", error);
      setStatus(error.response?.data?.detail || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-page">
      <div className="contact-shell">
        <div className="contact-copy">
          <span className="eyebrow">Contact admin</span>
          <h1>Need help with your nutrition account?</h1>
          <p>
            Send a message to the platform administrator for account, subscription,
            consultation, or technical questions.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full name" required />
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address" required />
          <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" required />
          <textarea name="message" value={form.message} onChange={handleChange} placeholder="Write your message" rows="6" required />
          <button type="submit" className="start-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </button>
          {status && <p className="subscription-message">{status}</p>}
        </form>
      </div>
    </section>
  );
}

export default Contact;

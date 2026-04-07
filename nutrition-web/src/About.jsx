import React from "react";

function About() {
  return (
    <section id="about-section" className="about">
      <h2>About Our Nutrition Platform</h2>
      <p>
        Our site connects <strong>users</strong>, <strong>admins</strong>, and
        <strong> nutritionists</strong> in one place. With the help of AI, you
        can calculate calories directly from food photos, follow personalized
        programs, and track your progress over time.
      </p>

      <div className="about-features">
        <div className="feature-card">
          <h3>👤 User Dashboard</h3>
          <p>
            Access meal plans, upload food photos, and monitor your progress.
          </p>
        </div>
        <div className="feature-card">
          <h3>🧑‍⚕️ Nutritionist Tools</h3>
          <p>
            Create programs, guide users, and review AI calorie calculations.
          </p>
        </div>
        <div className="feature-card">
          <h3>⚙️ Admin Control</h3>
          <p>
            Manage accounts, oversee nutritionist activity, and ensure smooth
            operation.
          </p>
        </div>
        <div className="feature-card">
          <h3>🤖 AI Calorie Calculator</h3>
          <p>
            Upload a photo of your meal and let AI estimate calories instantly.
          </p>
        </div>
      </div>
    </section>
  );
}

export default About;

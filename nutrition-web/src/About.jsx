import React from "react";

const featureCards = [
  {
    title: "Client Experience",
    description:
      "Manage your profile, follow a plan, upload meal photos, and monitor your progress in one place.",
  },
  {
    title: "Nutritionist Workspace",
    description:
      "Review client information, conduct consultations, and create personalized nutrition plans with follow-up notes.",
  },
  {
    title: "AI Meal Tracking",
    description:
      "Submit a food photo and receive AI-assisted detection results that support calorie awareness and habit building.",
  },
];

function About() {
  return (
    <section id="about-section" className="about">
      <div className="about-header">
        <span className="eyebrow">Platform overview</span>
        <h2>One nutrition platform, multiple ways to stay supported.</h2>
        <p>
          Our website brings together clients, nutritionists, subscriptions, and
          AI-assisted meal analysis in one connected workflow. The goal is not
          only to estimate calories, but also to support long-term follow-up and
          healthier decision-making.
        </p>
      </div>

      <div className="about-features">
        {featureCards.map((card) => (
          <article key={card.title} className="feature-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default About;

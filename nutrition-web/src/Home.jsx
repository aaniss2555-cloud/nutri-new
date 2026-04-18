import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import About from "./About";
import plateImage from "../Assets/Plate.png";

const heroStats = [
  { value: "2", label: "Subscription tiers" },
  { value: "AI", label: "Meal estimation flow" },
  { value: "1:1", label: "Nutrition follow-up" },
];

const heroHighlights = [
  "Personalized nutrition plans after consultation",
  "AI-assisted calorie tracking from meal photos",
  "One platform for clients, nutritionists, and subscriptions",
];

function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToAbout = () => {
    const aboutSection = document.getElementById("about-section");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (location.state?.scrollTo === "about-section") {
      setTimeout(() => {
        scrollToAbout();
        navigate(location.pathname, { replace: true, state: {} });
      }, 50);
    }
  }, [location, navigate]);

  return (
    <>
      <main className="home">
        <section className="hero-shell">
          <div className="hero-copy">
            <span className="hero-kicker">Personalized dietary care</span>
            <h1>
              Build healthier habits with guided nutrition and AI-powered meal
              tracking.
            </h1>
            <p className="hero-lead">
              Book consultations, follow structured plans, and explore a smarter
              food-tracking experience designed for real daily life.
            </p>

            <div className="hero-actions">
              <button className="start-btn" onClick={() => navigate("/subscriptions")}>
                Explore Subscriptions
              </button>
              <button
                type="button"
                className="hero-secondary-btn"
                onClick={scrollToAbout}
              >
                See How It Works
              </button>
            </div>

            <div className="hero-highlight-list">
              {heroHighlights.map((item) => (
                <div key={item} className="hero-highlight-item">
                  <span className="hero-highlight-dot"></span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-orb hero-orb-one"></div>
            <div className="hero-orb hero-orb-two"></div>

            <div className="hero-image-card">
              <div className="hero-badge hero-badge-top">
                <strong>Live flow</strong>
                <span>Upload meal, review estimate, keep tracking</span>
              </div>

              <img src={plateImage} alt="Healthy meal on a plate" />

              <div className="hero-badge hero-badge-bottom">
                <strong>Client + Nutritionist</strong>
                <span>Consultation, plan creation, follow-up</span>
              </div>
            </div>
          </div>
        </section>

        <section className="hero-stats-row">
          {heroStats.map((stat) => (
            <article key={stat.label} className="hero-stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>
      </main>
      <About />
    </>
  );
}

export default Home;

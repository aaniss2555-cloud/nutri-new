import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import About from "./About";
import BrandIntro from "./BrandIntro";
import heroIllustration from "./assets/nutritionist-hero.png";

const heroStats = [
  { value: "AI", label: "Food recognition" },
  { value: "1:1", label: "Nutrition follow-up" },
  { value: "2", label: "Access tiers" },
];

const systemSteps = [
  "Subscribe and book consultation",
  "Nutritionist assigns plan",
  "Track meals and progress",
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
      <BrandIntro />
      <main className="home svmb-home">
        <section className="svmb-hero">
          <div className="svmb-hero-copy">
            <span className="svmb-eyebrow">
              Personalized dietary assessment
            </span>
            <h1>Nutrition care, made structured and measurable.</h1>
            <p className="svmb-hero-lead">
              A calm digital space where clients book consultations, receive
              nutrition plans, and use AI-assisted meal tracking to understand
              daily progress.
            </p>

            <div className="hero-actions svmb-actions">
              <button
                className="start-btn"
                onClick={() => navigate("/subscriptions")}
              >
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
          </div>

          <aside
            className="svmb-hero-panel"
            aria-label="Platform workflow preview"
          >
            <div className="svmb-panel-topline">
              <span>SVMB Platform</span>
              <strong>AI + professional guidance</strong>
            </div>

            <div className="svmb-plate-frame">
              <img
                src={heroIllustration}
                alt="Nutritionist writing a personalized nutrition plan"
              />
            </div>

            <div className="svmb-system-steps">
              {systemSteps.map((step, index) => (
                <div key={step} className="svmb-system-step">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="hero-stats-row svmb-stats-row">
          {heroStats.map((stat) => (
            <article key={stat.label} className="hero-stat-card svmb-stat-card">
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

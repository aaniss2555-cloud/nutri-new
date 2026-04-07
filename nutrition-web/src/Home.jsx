import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import About from "./About";
import plateImage from "../Assets/Plate.png";

function Home() {
  const location = useLocation();

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
      }, 50);
    }
  }, [location]);

  return (
    <>
      <main className="home">
        <section className="home-left">
          <h1>Welcome</h1>
          <p>
            Discover personalized consultations, structured subscriptions, and smarter nutrition
            tracking.
          </p>
          <button className="start-btn" onClick={scrollToAbout}>
            Let&apos;s Get Started
          </button>
        </section>

        <section className="home-right">
          <img src={plateImage} alt="Plate of food" />
        </section>
      </main>
      <About />
    </>
  );
}

export default Home;

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "./services/Auth";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const userRole = localStorage.getItem("userRole");

  const dashboardPath =
    userRole === "nutritionist" ? "/nutri-dashboard" : "/user-dashboard";

  const goToHomeSection = (sectionId) => {
    if (location.pathname === "/") {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    navigate("/", { state: { scrollTo: sectionId } });
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <Link to="/" className="logo logo-link">
        Foodie
      </Link>

      <nav className="header-nav">
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/subscriptions">Subscriptions</Link>
          </li>
          <li>
            <button
              type="button"
              className="nav-link-button"
              onClick={() => goToHomeSection("about-section")}
            >
              About
            </button>
          </li>
          {isAuthenticated && (
            <li>
              <Link to={dashboardPath}>Dashboard</Link>
            </li>
          )}
        </ul>

        <div className="header-actions">
          {!isAuthenticated ? (
            <>
              <div className="header-dropdown">
                <button type="button" className="header-action secondary">
                  Sign Up
                </button>
                <div className="header-dropdown-menu">
                  <Link to="/signup-user">Client</Link>
                  <Link to="/signup-nutritionist">Nutritionist</Link>
                </div>
              </div>
              <Link to="/login" className="header-action primary">
                Login
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="header-action primary"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;

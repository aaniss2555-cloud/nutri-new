import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./Header";
import Footer from "./Footer";
import Home from "./Home";
import Login from "./Login";
import UserSignup from "./UserSignup";
import NutritionistSignup from "./NutritionistSignup";
import SubscriptionPlans from "./SubscriptionPlans";
import UserDashboard from "./UserDashboard";
import NutriDashboard from "./NutriDashboard";
import ForgotPassword from "./ForgotPassword";
import ResetPasswordConfirm from "./ResetPasswordConfirm";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup-user" element={<UserSignup />} />
            <Route
              path="/signup-nutritionist"
              element={<NutritionistSignup />}
            />
            <Route path="/subscriptions" element={<SubscriptionPlans />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/reset-password-confirm/:uid/:token"
              element={<ResetPasswordConfirm />}
            />
            <Route
              path="/user-dashboard"
              element={
                <ProtectedRoute allowedRole="client">
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nutri-dashboard"
              element={
                <ProtectedRoute allowedRole="nutritionist">
                  <NutriDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

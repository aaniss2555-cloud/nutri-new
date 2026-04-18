import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";
import { logout } from "./services/Auth";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Title,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

function UserDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingCalories, setPendingCalories] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [profile, setProfile] = useState({});
  const [plans, setPlans] = useState([]);
  const [weeklyCalories, setWeeklyCalories] = useState(Array(7).fill(0));
  const [mealHistory, setMealHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayIndex = new Date().getDay();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profileRes, plansRes] = await Promise.all([
          api.get("me/"),
          api.get("plans/"),
        ]);

        localStorage.setItem("userRole", profileRes.data.role || "client");
        setProfile(profileRes.data);
        setPlans(plansRes.data);
      } catch (err) {
        console.error("Failed to fetch profile/plans", err);
        showToast("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const activeSubscription = profile.active_subscription || null;
  const currentPlan = profile.latest_nutrition_plan || plans[0] || null;
  const subscriptionTier =
    activeSubscription?.subscription_plan?.code || "none";
  const featureAccess =
    activeSubscription?.subscription_plan?.feature_access || {};
  const canUseAiTracking = Boolean(featureAccess.ai_calorie_tracking);

  const chartData = {
    labels: days,
    datasets: [
      {
        label: "Calories",
        data: weeklyCalories,
        backgroundColor: days.map((_, index) =>
          index === todayIndex ? "#68ba7f" : "#2f5d50",
        ),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: true,
      },
    },
    onClick: (_, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setSelectedDay(`${days[index]}: ${weeklyCalories[index]} kcal`);
      }
    },
  };

  const subscriptionStatusLabel = useMemo(() => {
    if (!activeSubscription) {
      return "No subscription";
    }

    return `${activeSubscription.status} - ${activeSubscription.payment_status}`;
  }, [activeSubscription]);

  const resetUploadInput = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleUpload = async (file) => {
    if (!file) {
      resetUploadInput();
      return;
    }

    if (!canUseAiTracking) {
      showToast(
        "AI calorie tracking is not available in your current subscription.",
      );
      resetUploadInput();
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid meal image.");
      resetUploadInput();
      return;
    }

    setAiLoading(true);
    setAiPrediction(null);
    setPendingCalories(null);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post("meal-predict/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const prediction = response.data;
      const firstDetection = prediction.detections?.[0];
      const estimatedCalories =
        prediction.total_estimated_calories_kcal ??
        firstDetection?.estimated_calories_kcal ??
        null;

      setAiPrediction(prediction);
      setPendingCalories(estimatedCalories);
      showToast("AI prediction received.");
    } catch (err) {
      console.error("Failed to predict meal image", err);
      setAiPrediction(null);
      setPendingCalories(null);
      showToast(
        err.response?.data?.detail ||
          "Failed to reach the AI service. Make sure it is running.",
      );
    } finally {
      setAiLoading(false);
      resetUploadInput();
    }
  };

  const confirmUpload = () => {
    if (!preview || !aiPrediction) {
      return;
    }

    const caloriesToAdd = pendingCalories ?? 0;
    const updated = [...weeklyCalories];
    updated[todayIndex] = (updated[todayIndex] || 0) + caloriesToAdd;
    setWeeklyCalories(updated);

    setMealHistory((prev) => [
      {
        id: Date.now(),
        image: preview,
        calories: caloriesToAdd,
        label: aiPrediction.detections?.[0]?.label || "Meal image",
        status: aiPrediction.status,
        day: days[todayIndex],
      },
      ...prev,
    ]);

    setPendingCalories(null);
    setAiPrediction(null);
    setPreview(null);
    resetUploadInput();
    showToast(
      caloriesToAdd > 0
        ? `Added ${caloriesToAdd} kcal to ${days[todayIndex]}`
        : "Meal prediction saved.",
    );
  };

  const saveProfile = async () => {
    try {
      const response = await api.patch("me/", {
        age: profile.age,
        weight: profile.weight,
        allergies: profile.allergies,
        avoid: profile.avoid,
        phone: profile.phone,
      });

      setProfile(response.data);
      showToast("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to update profile", err);
      showToast("Failed to update profile.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderDashboard = () => (
    <div className="overview">
      <div className="card-grid card-grid-spaced">
        <div className="stat-card">
          <h4>Subscription</h4>
          <p>
            {activeSubscription?.subscription_plan?.name || "No subscription"}
          </p>
        </div>
        <div className="stat-card">
          <h4>Nutrition Plan</h4>
          <p>{currentPlan ? currentPlan.title : "No plan assigned"}</p>
        </div>
        <div className="stat-card">
          <h4>Today&apos;s Calories</h4>
          <p>{weeklyCalories[todayIndex] ?? 0} kcal</p>
        </div>
        <div className="stat-card">
          <h4>Weekly Avg</h4>
          <p>
            {Math.round(weeklyCalories.reduce((a, b) => a + b, 0) / 7)} kcal/day
          </p>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <div className="summary-card">
          <h3>Access Layer</h3>
          <p>
            Your current tier is <strong>{subscriptionTier}</strong>.
          </p>
          <p>Status: {subscriptionStatusLabel}</p>
        </div>

        <div className="summary-card">
          <h3>Nutrition Guidance</h3>
          <p>
            {currentPlan
              ? "Your nutritionist has already prepared guidance for you."
              : "Your nutrition plan will appear here after the consultation."}
          </p>
        </div>
      </div>
    </div>
  );

  const renderSubscription = () => (
    <div className="profile-panel">
      <div className="section-heading">
        <h3>My Subscription</h3>
        <p>
          The subscription gives you access to the platform and consultations.
        </p>
      </div>

      {activeSubscription ? (
        <>
          <div className="client-details-grid">
            <div className="detail-card">
              <span>Plan</span>
              <strong>{activeSubscription.subscription_plan.name}</strong>
            </div>
            <div className="detail-card">
              <span>Status</span>
              <strong>{activeSubscription.status}</strong>
            </div>
            <div className="detail-card">
              <span>Payment</span>
              <strong>{activeSubscription.payment_status}</strong>
            </div>
            <div className="detail-card">
              <span>Duration</span>
              <strong>
                {activeSubscription.subscription_plan.duration_days} days
              </strong>
            </div>
            <div className="detail-card">
              <span>Consultations</span>
              <strong>
                {activeSubscription.subscription_plan.consultation_count}
              </strong>
            </div>
            <div className="detail-card">
              <span>Follow-up</span>
              <strong>
                {activeSubscription.subscription_plan.includes_followup
                  ? "Included"
                  : "Not included"}
              </strong>
            </div>
          </div>

          <div className="notes-card">
            <h5>Tier Access</h5>
            <div className="feature-access-grid">
              {Object.entries(
                activeSubscription.subscription_plan.feature_access || {},
              ).map(([key, enabled]) => (
                <div
                  key={key}
                  className={`feature-chip ${enabled ? "enabled" : "locked"}`}
                >
                  <span>{key.replaceAll("_", " ")}</span>
                  <strong>{enabled ? "Included" : "Locked"}</strong>
                </div>
              ))}
            </div>
          </div>

          {activeSubscription.zoom_link && (
            <div className="notes-card">
              <h5>Zoom Consultation</h5>
              <a
                href={activeSubscription.zoom_link}
                target="_blank"
                rel="noreferrer"
                className="inline-link"
              >
                Open meeting link
              </a>
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">
          You do not have an active subscription yet. Choose one from the
          subscriptions page first.
        </p>
      )}
    </div>
  );

  const renderNutritionPlan = () => (
    <div className="profile-panel">
      <div className="section-heading">
        <h3>My Nutrition Plan</h3>
        <p>
          This is the personalized plan your nutritionist creates after the
          consultation.
        </p>
      </div>

      {currentPlan ? (
        <>
          <div className="notes-card">
            <h5>{currentPlan.title}</h5>
            <p>{currentPlan.description}</p>
          </div>

          <div className="client-details-grid">
            <div className="detail-card">
              <span>Daily Target</span>
              <strong>
                {currentPlan.daily_calorie_target
                  ? `${currentPlan.daily_calorie_target} kcal`
                  : "Not specified"}
              </strong>
            </div>
            <div className="detail-card">
              <span>Duration</span>
              <strong>
                {currentPlan.duration_weeks
                  ? `${currentPlan.duration_weeks} weeks`
                  : "Flexible"}
              </strong>
            </div>
            <div className="detail-card">
              <span>Created By</span>
              <strong>{currentPlan.created_by_name || "Nutritionist"}</strong>
            </div>
            <div className="detail-card">
              <span>Status</span>
              <strong>{currentPlan.is_active ? "Active" : "Archived"}</strong>
            </div>
          </div>

          {currentPlan.follow_up_notes && (
            <div className="notes-card">
              <h5>Follow-up Notes</h5>
              <p>{currentPlan.follow_up_notes}</p>
            </div>
          )}

          <details className="progress-dropdown" open>
            <summary>Progress</summary>
            <div className="progress-chart">
              <Bar data={chartData} options={chartOptions} />
              {selectedDay && <p className="selected-day">{selectedDay}</p>}
            </div>
          </details>
        </>
      ) : (
        <p className="empty-state">
          No nutrition plan has been assigned yet. It should appear after your
          consultation.
        </p>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="upload">
      <div className="section-heading">
        <h3>AI Calorie Tracking</h3>
        <p>
          Upload a meal photo to estimate calories. This feature depends on your
          subscription tier.
        </p>
      </div>

      {!canUseAiTracking ? (
        <div className="locked-panel">
          <h4>Feature Locked</h4>
          <p>
            AI calorie tracking is not enabled in your current subscription.
          </p>
        </div>
      ) : (
        <>
          <input
            ref={uploadInputRef}
            type="file"
            id="mealUpload"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files[0])}
            className="upload-input-hidden"
          />
          <label htmlFor="mealUpload" className="upload-btn">
            Select Meal Photo
          </label>

          {preview && (
            <div className="meal-preview">
              <img src={preview} alt="Meal preview" />

              {aiLoading && <p>Sending image to AI service...</p>}

              {aiPrediction && (
                <div className="ai-result-card">
                  <div className="ai-result-header">
                    <span>{aiPrediction.model_name}</span>
                    <strong>{aiPrediction.status}</strong>
                  </div>
                  <p>
                    Estimated Calories: {pendingCalories ?? "Not available yet"}
                    {pendingCalories ? " kcal" : ""}
                  </p>

                  <div className="ai-detection-list">
                    {aiPrediction.detections?.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="ai-detection-item"
                      >
                        <span>{item.label}</span>
                        <strong>{Math.round(item.confidence * 100)}%</strong>
                      </div>
                    ))}
                  </div>

                  <p className="ai-note">
                    This result comes from the standalone FastAPI AI service
                    using the current trained FoodInsSeg model.
                  </p>

                  <button className="confirm-btn" onClick={confirmUpload}>
                    Confirm Result
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="plan-history">
            <div className="section-heading">
              <h5>Recent Meal Estimates</h5>
              <p>Your latest uploads appear here.</p>
            </div>

            {mealHistory.length === 0 ? (
              <p className="empty-state">No meals uploaded yet.</p>
            ) : (
              <div className="meal-history">
                {mealHistory.map((meal) => (
                  <div key={meal.id} className="meal-item">
                    <img src={meal.image} alt="Meal" />
                    <strong>{meal.calories} kcal</strong>
                    <span>{meal.day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="profile-panel">
      <div className="section-heading">
        <h3>Profile</h3>
        <p>
          Keep your health information up to date so your nutritionist can
          personalize your plan.
        </p>
      </div>

      <div className="profile-form-card">
        <div className="profile-form-grid">
          <label className="profile-field">
            <span>Age</span>
            <input
              type="number"
              value={profile.age || ""}
              onChange={(e) => setProfile({ ...profile, age: e.target.value })}
            />
          </label>

          <label className="profile-field">
            <span>Weight</span>
            <input
              type="number"
              value={profile.weight || ""}
              onChange={(e) =>
                setProfile({ ...profile, weight: e.target.value })
              }
            />
          </label>

          <label className="profile-field">
            <span>Phone</span>
            <input
              type="text"
              value={profile.phone || ""}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </label>

          <label className="profile-field profile-field-wide">
            <span>Allergies</span>
            <input
              type="text"
              value={profile.allergies || ""}
              onChange={(e) =>
                setProfile({ ...profile, allergies: e.target.value })
              }
            />
          </label>

          <label className="profile-field profile-field-wide">
            <span>Foods to avoid</span>
            <input
              type="text"
              value={profile.avoid || ""}
              onChange={(e) =>
                setProfile({ ...profile, avoid: e.target.value })
              }
            />
          </label>
        </div>

        <button className="confirm-btn" onClick={saveProfile}>
          Save Profile
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <p>Loading dashboard...</p>;
    }

    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "subscription":
        return renderSubscription();
      case "nutrition-plan":
        return renderNutritionPlan();
      case "upload":
        return renderUpload();
      case "profile":
        return renderProfile();
      default:
        return <p>Select a section from the sidebar.</p>;
    }
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <ul>
          <li
            className={activeSection === "dashboard" ? "active" : ""}
            onClick={() => setActiveSection("dashboard")}
          >
            Dashboard
          </li>
          <li
            className={activeSection === "subscription" ? "active" : ""}
            onClick={() => setActiveSection("subscription")}
          >
            My Subscription
          </li>
          <li
            className={activeSection === "nutrition-plan" ? "active" : ""}
            onClick={() => setActiveSection("nutrition-plan")}
          >
            My Nutrition Plan
          </li>
          <li
            className={activeSection === "upload" ? "active" : ""}
            onClick={() => setActiveSection("upload")}
          >
            AI Tracking
          </li>
          <li
            className={activeSection === "profile" ? "active" : ""}
            onClick={() => setActiveSection("profile")}
          >
            Profile
          </li>
          <li
            onClick={handleLogout}
            style={{ color: "#e57373", marginTop: "auto" }}
          >
            Logout
          </li>
        </ul>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="menu-btn"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="dashboard-header-copy">
            <span className="dashboard-header-kicker">
              Client wellness space
            </span>
            <h2>Welcome {profile.first_name || "User"}</h2>
          </div>
        </header>

        <section className={`dashboard-content section-${activeSection}`}>
          {renderContent()}
        </section>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default UserDashboard;

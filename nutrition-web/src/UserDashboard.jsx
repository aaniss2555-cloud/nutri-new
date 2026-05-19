import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";
import { logout } from "./services/Auth";
import ProgressStrip from "./ProgressStrip";
import mealExampleOne from "./Assets/meal-example-1.jpg";
import mealExampleTwo from "./Assets/meal-example-2.jpg";
import photoCameraIcon from "./Assets/photo-camera.svg";

const PORTION_OPTIONS = [
  { key: "small", label: "Small", multiplier: 0.6 },
  { key: "medium", label: "Medium", multiplier: 1 },
  { key: "large", label: "Large", multiplier: 1.5 },
];

const DEFAULT_PORTION_KEY = "medium";

function UserDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pendingCalories, setPendingCalories] = useState(null);
  const [selectedCropChoices, setSelectedCropChoices] = useState({});
  const [selectedPortions, setSelectedPortions] = useState({});
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [profile, setProfile] = useState({});
  const [profileDraft, setProfileDraft] = useState({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [progressDays, setProgressDays] = useState([]);
  const [progressRange, setProgressRange] = useState("plan");
  const [mealHistory, setMealHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const formatDateTime = (value) => {
    if (!value) {
      return "Not scheduled";
    }

    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

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
        const [
          profileRes,
          plansRes,
          consultationsRes,
          progressRes,
          mealLogsRes,
        ] = await Promise.all([
          api.get("me/"),
          api.get("plans/"),
          api.get("consultations/"),
          api.get(`progress/?range=${progressRange}`),
          api.get("meal-logs/"),
        ]);

        localStorage.setItem("userRole", profileRes.data.role || "client");
        setProfile(profileRes.data);
        setProfileDraft(profileRes.data);
        setPlans(plansRes.data);
        setConsultations(consultationsRes.data);
        setProgressDays(progressRes.data.days || []);
        setMealHistory(
          mealLogsRes.data.map((meal) => ({
            id: meal.id,
            image: meal.image_url,
            calories: meal.calories,
            label: meal.meal_name || "Meal image",
            status: meal.ai_status,
            day: meal.meal_date,
          })),
        );
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
  const hasDashboardAccess = Boolean(activeSubscription);
  const currentPlan = profile.latest_nutrition_plan || plans[0] || null;
  const subscriptionTier =
    activeSubscription?.subscription_plan?.code || "none";
  const featureAccess =
    activeSubscription?.subscription_plan?.feature_access || {};
  const canUseAiTracking = Boolean(featureAccess.ai_calorie_tracking);

  useEffect(() => {
    if (
      !loading &&
      !hasDashboardAccess &&
      !["dashboard", "profile"].includes(activeSection)
    ) {
      setActiveSection("dashboard");
    }
  }, [activeSection, hasDashboardAccess, loading]);

  const todayProgress = progressDays[progressDays.length - 1] || null;
  const todayCalories = todayProgress?.calories || 0;
  const weeklyAverage = progressDays.length
    ? Math.round(
        progressDays.reduce((sum, day) => sum + (day.calories || 0), 0) /
          progressDays.length,
      )
    : 0;

  const refreshProgress = async () => {
    const [progressRes, mealLogsRes] = await Promise.all([
      api.get(`progress/?range=${progressRange}`),
      api.get("meal-logs/"),
    ]);
    setProgressDays(progressRes.data.days || []);
    setMealHistory(
      mealLogsRes.data.map((meal) => ({
        id: meal.id,
        image: meal.image_url,
        calories: meal.calories,
        label: meal.meal_name || "Meal image",
        status: meal.ai_status,
        day: meal.meal_date,
      })),
    );
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

  const openMealPicker = () => {
    setShowUploadGuide(false);
    uploadInputRef.current?.click();
  };

  const tryAnotherMeal = () => {
    setPreview(null);
    setPendingCalories(null);
    setSelectedCropChoices({});
    setSelectedPortions({});
    setAiPrediction(null);
    resetUploadInput();
    setShowUploadGuide(true);
  };
  const getCandidateOptions = (detection) => {
    const candidates = detection.classification_candidates || [];
    if (candidates.length > 0) {
      return candidates.slice(0, 5);
    }

    return [
      {
        label: detection.label,
        confidence: detection.confidence,
        estimated_calories_kcal: detection.estimated_calories_kcal,
      },
    ];
  };

  const getGroupedFoodChoices = (choices = selectedCropChoices) => {
    const grouped = {};

    Object.values(choices).forEach((choice) => {
      if (!choice || choice.ignore) {
        return;
      }

      const label = choice.label?.trim();
      if (!label) {
        return;
      }

      const key = label.toLowerCase();
      const currentCalories = Number(choice.estimated_calories_kcal) || 0;
      const existing = grouped[key];

      if (!existing || currentCalories > existing.baseCalories) {
        grouped[key] = {
          key,
          label,
          baseCalories: currentCalories,
          basePortion: Number(choice.estimated_portion_g) || null,
          nutritionSource: choice.nutrition_source || null,
        };
      }
    });

    return Object.values(grouped);
  };

  const withPortionDefaults = (choices, portions = selectedPortions) => {
    const next = {};
    getGroupedFoodChoices(choices).forEach((food) => {
      next[food.key] = portions[food.key] || DEFAULT_PORTION_KEY;
    });
    return next;
  };

  const calculateSelectedCalories = (choices, portions = selectedPortions) => {
    const groups = getGroupedFoodChoices(choices);

    if (!groups.length) {
      return null;
    }

    const total = groups.reduce((sum, food) => {
      const portionKey = portions[food.key] || DEFAULT_PORTION_KEY;
      const option =
        PORTION_OPTIONS.find((item) => item.key === portionKey) ||
        PORTION_OPTIONS[1];
      return sum + food.baseCalories * option.multiplier;
    }, 0);

    return Math.round(total * 10) / 10;
  };

  const areCropChoicesComplete = (choices = selectedCropChoices) => {
    const detections = aiPrediction?.detections || [];
    return (
      detections.length > 0 && detections.every((_, index) => choices[index])
    );
  };

  const selectCropChoice = (cropIndex, candidate) => {
    setSelectedCropChoices((current) => {
      const next = { ...current, [cropIndex]: candidate };
      const nextPortions = withPortionDefaults(next);
      setSelectedPortions(nextPortions);
      setPendingCalories(
        areCropChoicesComplete(next)
          ? calculateSelectedCalories(next, nextPortions)
          : null,
      );
      return next;
    });
  };

  const selectPortionChoice = (foodKey, portionKey) => {
    setSelectedPortions((current) => {
      const next = { ...current, [foodKey]: portionKey };
      setPendingCalories(
        areCropChoicesComplete()
          ? calculateSelectedCalories(selectedCropChoices, next)
          : null,
      );
      return next;
    });
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
    setSelectedCropChoices({});
    setSelectedPortions({});

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

      setAiPrediction({
        ...prediction,
        status: prediction.status,
      });
      setSelectedCropChoices({});
      setSelectedPortions({});
      setPendingCalories(null);
      showToast("AI prediction received.");
    } catch (err) {
      console.error("Failed to predict meal image", err);
      setAiPrediction(null);
      setPendingCalories(null);
      setSelectedCropChoices({});
      setSelectedPortions({});
      showToast(
        err.response?.data?.detail ||
          "Failed to reach the AI service. Make sure it is running.",
      );
    } finally {
      setAiLoading(false);
      resetUploadInput();
    }
  };

  const confirmUpload = async () => {
    if (!preview || !aiPrediction) {
      return;
    }

    const detections = aiPrediction.detections || [];
    if (detections.length > 0 && !areCropChoicesComplete()) {
      showToast("Select the correct label for each detected food first.");
      return;
    }

    const groupedChoices = getGroupedFoodChoices();
    if (!groupedChoices.length) {
      showToast(
        "No food was selected. Try another photo or choose at least one food.",
      );
      return;
    }

    const caloriesToAdd =
      calculateSelectedCalories(selectedCropChoices, selectedPortions) ?? 0;
    const mealName = groupedChoices
      .map(
        (food) =>
          `${food.label} (${selectedPortions[food.key] || DEFAULT_PORTION_KEY})`,
      )
      .join(", ");

    try {
      await api.post("meal-logs/", {
        meal_name: mealName,
        calories: caloriesToAdd,
        image_url: preview || "",
        ai_status: aiPrediction.status || "saved",
      });
      await refreshProgress();
      showToast(
        caloriesToAdd > 0
          ? `Added ${caloriesToAdd} kcal to today`
          : "Meal prediction saved.",
      );
    } catch (error) {
      console.error("Failed to save meal log", error);
      const errorMessage =
        error.response?.data?.detail ||
        JSON.stringify(error.response?.data || {}) ||
        "Failed to save meal log.";
      showToast(errorMessage);
    }

    setPendingCalories(null);
    setSelectedCropChoices({});
    setSelectedPortions({});
    setAiPrediction(null);
    setPreview(null);
    resetUploadInput();
  };

  const startEditingProfile = () => {
    setProfileDraft(profile);
    setIsEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setProfileDraft(profile);
    setIsEditingProfile(false);
  };

  const updateProfileDraft = (field, value) => {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    setProfileSaving(true);

    try {
      const response = await api.patch("me/", {
        age: profileDraft.age,
        weight: profileDraft.weight,
        allergies: profileDraft.allergies,
        avoid: profileDraft.avoid,
        phone: profileDraft.phone,
      });

      setProfile(response.data);
      setProfileDraft(response.data);
      setIsEditingProfile(false);
      showToast("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to update profile", err);
      showToast("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderDashboard = () => {
    if (!hasDashboardAccess) {
      return (
        <div className="overview dashboard-home-shell subscription-required-shell">
          <section className="role-hero-card client-hero-card subscription-required-panel">
            <div>
              <span className="role-hero-kicker">Subscription required</span>
              <h3>Choose a subscription to unlock your nutrition workspace.</h3>
              <p>
                Your profile stays available, but AI tracking, consultations,
                nutrition plans, and progress tools open after you subscribe to
                Normal or Premium access.
              </p>
              <div className="role-hero-actions">
                <button
                  type="button"
                  className="hero-action-primary"
                  onClick={() => navigate("/subscriptions")}
                >
                  View Subscriptions
                </button>
                <button
                  type="button"
                  className="hero-action-secondary"
                  onClick={() => setActiveSection("profile")}
                >
                  Complete Profile
                </button>
              </div>
            </div>
            <div className="subscription-required-note">
              <span>Available now</span>
              <strong>Profile</strong>
              <p>Keep your health history ready before choosing a plan.</p>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="overview dashboard-home-shell">
        <section className="role-hero-card client-hero-card">
          <div>
            <span className="role-hero-kicker">Today&apos;s focus</span>
            <h3>
              Track your meals, follow your plan, and stay close to your
              nutritionist.
            </h3>
            <p>
              The AI meal camera is the main feature of the platform. Start
              there when you eat, then use your progress and plan cards to
              understand how the day is going.
            </p>
            <div className="role-hero-actions">
              <button
                type="button"
                className="hero-action-primary"
                onClick={() => setActiveSection("upload")}
              >
                Open AI Camera
              </button>
              <button
                type="button"
                className="hero-action-secondary"
                onClick={() => setActiveSection("nutrition-plan")}
              >
                View My Plan
              </button>
            </div>
          </div>
        </section>

        <div className="dashboard-metric-strip">
          <div className="metric-pill">
            <span>Subscription</span>
            <strong>
              {activeSubscription?.subscription_plan?.name || "No subscription"}
            </strong>
          </div>
          <div className="metric-pill">
            <span>Nutrition Plan</span>
            <strong>
              {currentPlan ? currentPlan.title : "No plan assigned"}
            </strong>
          </div>
          <div className="metric-pill">
            <span>Today</span>
            <strong>{todayCalories} kcal</strong>
          </div>
          <div className="metric-pill">
            <span>Weekly Avg</span>
            <strong>{weeklyAverage} kcal/day</strong>
          </div>
        </div>

        <div className="action-card-grid">
          <button
            type="button"
            className="dashboard-action-card action-featured"
            onClick={() => setActiveSection("upload")}
          >
            <strong>Scan A Meal</strong>
            <p>
              Upload food, get AI detections, and save calories into your daily
              history.
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("nutrition-plan")}
          >
            <strong>Follow My Plan</strong>
            <p>
              {currentPlan
                ? "Review targets, notes, and plan progress."
                : "Your assigned nutrition plan will appear here."}
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("consultations")}
          >
            <strong>Zoom Consultations</strong>
            <p>
              See scheduled meetings and join when your nutritionist creates a
              link.
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("subscription")}
          >
            <strong>Access Status</strong>
            <p>
              {subscriptionTier} tier - {subscriptionStatusLabel}
            </p>
          </button>
        </div>

        <ProgressStrip
          days={progressDays}
          title="Quick Progress Preview"
          subtitle="A short look at your meal history. Open AI Tracking or My Nutrition Plan for filters."
        />
      </div>
    );
  };

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
    <div className="profile-panel nutrition-plan-panel">
      <div className="section-heading">
        <h3>My Nutrition Plan</h3>
        <p>
          This is the personalized plan your nutritionist creates after the
          consultation.
        </p>
      </div>

      {currentPlan ? (
        <>
          <article className="nutrition-plan-article">
            <div className="plan-article-main">
              <span className="plan-article-kicker">Current assigned plan</span>
              <h4>{currentPlan.title}</h4>
              <p className="plan-article-description">
                {currentPlan.description || "No description was added yet."}
              </p>

              <div className="plan-article-notes">
                <span>Follow-up notes</span>
                <p>
                  {currentPlan.follow_up_notes ||
                    "Your nutritionist has not added follow-up notes yet."}
                </p>
              </div>
            </div>

            <aside className="plan-article-meta" aria-label="Plan information">
              <div>
                <span>Daily Target</span>
                <strong>
                  {currentPlan.daily_calorie_target
                    ? `${currentPlan.daily_calorie_target} kcal`
                    : "Not specified"}
                </strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>
                  {currentPlan.duration_weeks
                    ? `${currentPlan.duration_weeks} weeks`
                    : "Flexible"}
                </strong>
              </div>
              <div>
                <span>Created By</span>
                <strong>{currentPlan.created_by_name || "Nutritionist"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{currentPlan.is_active ? "Active" : "Archived"}</strong>
              </div>
            </aside>
          </article>
          <ProgressStrip
            days={progressDays}
            title="Calorie Progress"
            subtitle="Each division is one day. Use the filter to see the full plan history or recent days."
            actions={
              <select
                className="progress-range-select"
                value={progressRange}
                onChange={async (event) => {
                  const nextRange = event.target.value;
                  setProgressRange(nextRange);
                  const response = await api.get(
                    `progress/?range=${nextRange}`,
                  );
                  setProgressDays(response.data.days || []);
                }}
              >
                <option value="plan">Current plan</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All logs</option>
              </select>
            }
          />
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
    <div className="upload ai-workspace">
      <div className="section-heading ai-workspace-heading">
        <span className="eyebrow">AI meal tracking</span>
        <h3>Scan a meal and save your progress</h3>
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
          <div className="ai-scan-panel">
            <div className="ai-scan-copy">
              <span className="eyebrow">AI meal scan</span>
              <h4>Add today&apos;s meal</h4>
              <p>
                Use one focused plate photo with good lighting. After the scan,
                confirm the result to add it to your daily calorie history.
              </p>
            </div>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e.target.files[0])}
              className="upload-input-hidden"
            />
            <button
              type="button"
              className="upload-btn ai-upload-main-btn"
              onClick={() => setShowUploadGuide(true)}
            >
              <img
                className="camera-icon"
                src={photoCameraIcon}
                alt=""
                aria-hidden="true"
              />
              Select Meal Photo
            </button>
          </div>

          {showUploadGuide && (
            <div
              className="upload-guide-overlay"
              role="dialog"
              aria-modal="true"
            >
              <div className="upload-guide-modal">
                <button
                  type="button"
                  className="upload-guide-close"
                  onClick={() => setShowUploadGuide(false)}
                  aria-label="Close upload guide"
                >
                  x
                </button>
                <span className="eyebrow">Before you scan</span>
                <h4>Use a photo the AI can actually read</h4>
                <p>
                  Keep the meal visible, avoid heavy blur, and use a simple top
                  or angled view when possible.
                </p>
                <div className="upload-guide-grid">
                  <img src={mealExampleOne} alt="Example meal photo" />
                  <img src={mealExampleTwo} alt="Example meal photo" />
                </div>
                <ul className="upload-guide-rules">
                  <li>Show the full plate or main food area.</li>
                  <li>Use bright lighting and avoid shaky photos.</li>
                  <li>Keep objects like hands or packaging out of the way.</li>
                </ul>
                <button
                  type="button"
                  className="confirm-btn"
                  onClick={openMealPicker}
                >
                  Choose Photo
                </button>
              </div>
            </div>
          )}

          {(preview || aiLoading || aiPrediction) && (
            <div
              className="upload-guide-overlay ai-result-overlay"
              role="dialog"
              aria-modal="true"
            >
              <div className="upload-guide-modal ai-result-modal">
                <button
                  type="button"
                  className="upload-guide-close"
                  onClick={tryAnotherMeal}
                  aria-label="Close result"
                >
                  x
                </button>
                <div className="ai-result-modal-grid">
                  <div className="ai-preview-frame ai-result-modal-preview">
                    {preview ? (
                      <img
                        src={
                          aiPrediction?.annotated_image_base64
                            ? `data:${aiPrediction.annotated_image_mime || "image/jpeg"};base64,${aiPrediction.annotated_image_base64}`
                            : preview
                        }
                        alt="Meal preview"
                      />
                    ) : (
                      <div className="meal-placeholder">Meal</div>
                    )}
                  </div>

                  <div className="ai-result-card ai-result-focus ai-result-modal-content">
                    {aiLoading ? (
                      <div className="ai-loading-state">
                        <span className="eyebrow">Scanning</span>
                        <h4>Sending image to AI service...</h4>
                        <p>
                          The model is checking the meal and preparing
                          detections.
                        </p>
                      </div>
                    ) : aiPrediction ? (
                      <>
                        <div className="ai-result-header">
                          <span>AI meal result</span>
                          <strong>
                            {aiPrediction.detections?.length
                              ? "Food detected"
                              : "No food name found"}
                          </strong>
                        </div>
                        <div className="ai-calorie-hero">
                          <span>Estimated calories</span>
                          <strong>{pendingCalories ?? "--"}</strong>
                          <small>
                            {pendingCalories
                              ? "kcal after selection"
                              : "Select labels first"}
                          </small>
                        </div>

                        {aiPrediction.detections?.length > 0 ? (
                          <div className="ai-crop-review-list">
                            <p className="ai-note">
                              Review each detected crop, choose a food name, or
                              ignore a wrong box. Same foods are grouped before
                              calories are calculated.
                            </p>
                            {aiPrediction.detections.map((item, index) => (
                              <div
                                key={`${item.label}-${index}`}
                                className="ai-crop-review-item"
                              >
                                <div className="ai-crop-review-heading">
                                  <strong>Food {index + 1}</strong>
                                  <span>
                                    box{" "}
                                    {Math.round(
                                      (item.segmentation_confidence ||
                                        item.confidence) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                                <div className="ai-candidate-options">
                                  {getCandidateOptions(item).map(
                                    (candidate) => {
                                      const selected =
                                        !selectedCropChoices[index]?.ignore &&
                                        selectedCropChoices[index]?.label ===
                                          candidate.label;
                                      return (
                                        <button
                                          type="button"
                                          key={`${candidate.label}-${candidate.confidence}`}
                                          className={`ai-candidate-option ${selected ? "selected" : ""}`}
                                          onClick={() =>
                                            selectCropChoice(index, candidate)
                                          }
                                        >
                                          <span>{candidate.label}</span>
                                          <strong>
                                            {Math.round(
                                              candidate.confidence * 100,
                                            )}
                                            %
                                          </strong>
                                          <small>
                                            {candidate.estimated_calories_kcal
                                              ? `${candidate.estimated_calories_kcal} kcal`
                                              : "Calories not found"}
                                          </small>
                                        </button>
                                      );
                                    },
                                  )}
                                  <button
                                    type="button"
                                    className={`ai-candidate-option ignore ${
                                      selectedCropChoices[index]?.ignore
                                        ? "selected"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      selectCropChoice(index, {
                                        label: "Ignore",
                                        confidence: 0,
                                        ignore: true,
                                      })
                                    }
                                  >
                                    <span>Ignore</span>
                                    <strong>Wrong box</strong>
                                    <small>Do not count</small>
                                  </button>
                                </div>
                              </div>
                            ))}

                            {areCropChoicesComplete() &&
                              getGroupedFoodChoices().length > 0 && (
                                <div className="ai-portion-review">
                                  <div className="ai-portion-review-heading">
                                    <strong>Confirm portions</strong>
                                    <span>Same foods are counted once</span>
                                  </div>
                                  {getGroupedFoodChoices().map((food) => (
                                    <div
                                      key={food.key}
                                      className="ai-portion-row"
                                    >
                                      <div>
                                        <strong>{food.label}</strong>
                                        <small>
                                          {food.basePortion
                                            ? `Base portion ${food.basePortion}g`
                                            : "Default portion"}
                                        </small>
                                      </div>
                                      <div className="ai-portion-options">
                                        {PORTION_OPTIONS.map((option) => {
                                          const selectedPortion =
                                            (selectedPortions[food.key] ||
                                              DEFAULT_PORTION_KEY) ===
                                            option.key;
                                          return (
                                            <button
                                              type="button"
                                              key={option.key}
                                              className={
                                                selectedPortion
                                                  ? "selected"
                                                  : ""
                                              }
                                              onClick={() =>
                                                selectPortionChoice(
                                                  food.key,
                                                  option.key,
                                                )
                                              }
                                            >
                                              {option.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ) : (
                          <p className="ai-note">
                            The model did not recognize a food name in this
                            image yet. Try a clearer photo with the meal closer
                            to the camera.
                          </p>
                        )}

                        <div className="ai-result-actions">
                          <button
                            className="confirm-btn"
                            onClick={confirmUpload}
                            disabled={
                              aiPrediction.detections?.length > 0 &&
                              !areCropChoicesComplete()
                            }
                          >
                            Confirm Result
                          </button>
                          <button
                            className="try-again-btn"
                            onClick={tryAnotherMeal}
                          >
                            Try Again
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="ai-loading-state">
                        <span className="eyebrow">Ready</span>
                        <h4>Your meal preview will appear here.</h4>
                        <p>Select a photo to start the scan.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="ai-progress-log-grid">
            <ProgressStrip
              days={progressDays}
              title="Saved Meal Progress"
              subtitle="This updates from confirmed meal logs when the AI result can be matched to the nutrition reference."
              actions={
                <select
                  className="progress-range-select"
                  value={progressRange}
                  onChange={async (event) => {
                    const nextRange = event.target.value;
                    setProgressRange(nextRange);
                    const response = await api.get(
                      `progress/?range=${nextRange}`,
                    );
                    setProgressDays(response.data.days || []);
                  }}
                >
                  <option value="plan">Current plan</option>
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="all">All logs</option>
                </select>
              }
            />
            <div className="plan-history meal-history-panel">
              <div className="section-heading">
                <h5>Recent Meal Estimates</h5>
                <p>Confirmed meals stay in one horizontal history line.</p>
              </div>

              {mealHistory.length === 0 ? (
                <p className="empty-state">No meals uploaded yet.</p>
              ) : (
                <div className="meal-history meal-history-row">
                  {mealHistory.map((meal) => (
                    <div key={meal.id} className="meal-item meal-history-card">
                      {meal.image ? (
                        <img src={meal.image} alt={meal.label || "Meal"} />
                      ) : (
                        <div className="meal-placeholder">Meal</div>
                      )}
                      <div>
                        <strong>{meal.calories} kcal</strong>
                        <span>{meal.day}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderConsultations = () => (
    <div className="profile-panel">
      <div className="section-heading">
        <h3>My Consultations</h3>
        <p>Zoom links created by your nutritionist will appear here.</p>
      </div>

      {consultations.length === 0 ? (
        <p className="empty-state">
          No consultation has been scheduled yet. After your nutritionist
          creates one, the Zoom link will show here.
        </p>
      ) : (
        <div className="consultation-list">
          {consultations.map((consultation) => (
            <div key={consultation.id} className="consultation-card">
              <div>
                <h5>{consultation.topic || "Nutrition consultation"}</h5>
                <p>
                  {consultation.nutritionist_name ||
                    consultation.nutritionist_email ||
                    "Nutritionist"}
                </p>
                <span>{formatDateTime(consultation.scheduled_at)}</span>
              </div>
              <div className="consultation-actions">
                <strong>{consultation.status}</strong>
                {consultation.zoom_join_url &&
                consultation.status === "scheduled" ? (
                  <a
                    href={consultation.zoom_join_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join Zoom
                  </a>
                ) : (
                  <span>
                    {consultation.status === "completed"
                      ? "Completed"
                      : "Link pending"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  const renderProfile = () => {
    const displayValue = (value) => value || "Not provided yet";

    return (
      <div className="profile-panel profile-view-panel profile-polished-panel">
        <div className="profile-top-card">
          <div className="profile-title-copy">
            <span>Client health profile</span>
            <h3>Profile</h3>
            <p>
              This information helps your nutritionist personalize your plan,
              follow-up, and food recommendations.
            </p>
          </div>

          {!isEditingProfile ? (
            <button className="profile-edit-btn" onClick={startEditingProfile}>
              Edit Profile
            </button>
          ) : (
            <span className="profile-editing-pill">Editing mode</span>
          )}
        </div>

        <div className="profile-form-card profile-clean-card">
          <div className="profile-form-grid profile-display-grid">
            <label className="profile-field profile-metric-field">
              <span>Age</span>
              {isEditingProfile ? (
                <input
                  type="number"
                  value={profileDraft.age || ""}
                  onChange={(e) => updateProfileDraft("age", e.target.value)}
                />
              ) : (
                <strong>{displayValue(profile.age)}</strong>
              )}
            </label>

            <label className="profile-field profile-metric-field">
              <span>Weight</span>
              {isEditingProfile ? (
                <input
                  type="number"
                  value={profileDraft.weight || ""}
                  onChange={(e) => updateProfileDraft("weight", e.target.value)}
                />
              ) : (
                <strong>
                  {profile.weight ? `${profile.weight} kg` : "Not provided yet"}
                </strong>
              )}
            </label>

            <label className="profile-field profile-metric-field">
              <span>Phone</span>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileDraft.phone || ""}
                  onChange={(e) => updateProfileDraft("phone", e.target.value)}
                />
              ) : (
                <strong>{displayValue(profile.phone)}</strong>
              )}
            </label>

            <label className="profile-field profile-note-field">
              <span>Allergies</span>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileDraft.allergies || ""}
                  onChange={(e) =>
                    updateProfileDraft("allergies", e.target.value)
                  }
                />
              ) : (
                <strong>{displayValue(profile.allergies)}</strong>
              )}
            </label>

            <label className="profile-field profile-note-field">
              <span>Foods to avoid</span>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={profileDraft.avoid || ""}
                  onChange={(e) => updateProfileDraft("avoid", e.target.value)}
                />
              ) : (
                <strong>{displayValue(profile.avoid)}</strong>
              )}
            </label>
          </div>

          {isEditingProfile && (
            <div className="profile-actions">
              <button
                className="confirm-btn"
                onClick={saveProfile}
                disabled={profileSaving}
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="profile-cancel-btn"
                onClick={cancelProfileEdit}
                disabled={profileSaving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <p>Loading dashboard...</p>;
    }

    if (
      !hasDashboardAccess &&
      !["dashboard", "profile"].includes(activeSection)
    ) {
      return renderDashboard();
    }

    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "subscription":
        return renderSubscription();
      case "nutrition-plan":
        return renderNutritionPlan();
      case "consultations":
        return renderConsultations();
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
          {hasDashboardAccess && (
            <>
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
                className={activeSection === "consultations" ? "active" : ""}
                onClick={() => setActiveSection("consultations")}
              >
                Consultations
              </li>
            </>
          )}
          <li
            className={activeSection === "profile" ? "active" : ""}
            onClick={() => setActiveSection("profile")}
          >
            Profile
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

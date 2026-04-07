import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";

function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const isClient = localStorage.getItem("userRole") === "client";

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get("subscription-plans/");
        setPlans(response.data);

        if (isAuthenticated) {
          const subscriptionResponse = await api.get("my-subscription/");
          setCurrentSubscription(subscriptionResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch subscription plans", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [isAuthenticated]);

  const handleChoosePlan = async (plan) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!isClient) {
      setMessage("Only client accounts can subscribe to access plans.");
      return;
    }

    setSubscribingId(plan.id);
    setMessage("");

    try {
      const response = await api.post("my-subscription/", {
        subscription_plan_id: plan.id,
      });

      setCurrentSubscription(response.data);
      setMessage(
        `${plan.name} selected successfully. You can now continue to your dashboard.`,
      );
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to activate subscription.",
      );
    } finally {
      setSubscribingId(null);
    }
  };

  const featureLabels = {
    ai_calorie_tracking: "AI calorie tracking",
    nutritionist_chat: "Nutritionist chat",
    zoom_consultation: "Zoom consultation",
    followup_support: "Follow-up support",
    priority_support: "Priority support",
  };

  return (
    <section className="subscription-page">
      <div className="subscription-hero">
        <p className="eyebrow">Subscriptions</p>
        <h1>Choose The Access Layer First</h1>
        <p>
          Subscriptions unlock access to consultations and platform services.
          Nutrition plans are created afterward by the nutritionist based on the
          client&apos;s case.
        </p>
        {message && <p className="subscription-message">{message}</p>}
      </div>

      {loading ? (
        <p className="empty-state">Loading subscription plans...</p>
      ) : (
        <div className="subscription-grid">
          {plans.map((plan) => {
            const isCurrentPlan =
              currentSubscription?.subscription_plan?.id === plan.id;

            return (
              <article
                key={plan.id}
                className={`subscription-card subscription-${plan.code} ${isCurrentPlan ? "subscription-current" : ""}`}
              >
                <div className="subscription-card-top">
                  <div>
                    <p className="subscription-tier">{plan.code}</p>
                    <h2>{plan.name}</h2>
                  </div>
                  <span className="subscription-price">{plan.price} DZD</span>
                </div>

                <p className="subscription-description">{plan.description}</p>

                <div className="subscription-meta">
                  <span>{plan.duration_days} days</span>
                  <span>{plan.consultation_count} consultations</span>
                  <span>
                    {plan.includes_followup
                      ? "Follow-up included"
                      : "No follow-up"}
                  </span>
                </div>

                <div className="subscription-features">
                  <h3>Feature access</h3>
                  <ul>
                    {Object.entries(featureLabels).map(
                      ([featureKey, featureLabel]) => (
                        <li key={featureKey}>
                          <span>{featureLabel}</span>
                          <strong>
                            {plan.feature_access?.[featureKey]
                              ? "Included"
                              : "Locked"}
                          </strong>
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                <div className="subscription-actions">
                  {isCurrentPlan ? (
                    <button
                      type="button"
                      className="header-action secondary"
                      disabled
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="header-action primary"
                      onClick={() => handleChoosePlan(plan)}
                      disabled={subscribingId === plan.id}
                    >
                      {subscribingId === plan.id
                        ? "Selecting..."
                        : "Choose Plan"}
                    </button>
                  )}

                  {isAuthenticated && isClient && (
                    <Link
                      to="/user-dashboard"
                      className="header-action secondary"
                    >
                      Go To Dashboard
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SubscriptionPlans;

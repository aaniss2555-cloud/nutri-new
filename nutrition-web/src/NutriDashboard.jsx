import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";
import { logout } from "./services/Auth";

function NutriDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profile, setProfile] = useState({});
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [detailsClientId, setDetailsClientId] = useState(null);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    daily_calorie_target: "",
    duration_weeks: "",
    follow_up_notes: "",
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchDashboardData = async () => {
    try {
      const [profileRes, clientsRes, plansRes] = await Promise.all([
        api.get("me/"),
        api.get("clients/"),
        api.get("plans/"),
      ]);

      localStorage.setItem("userRole", profileRes.data.role || "nutritionist");
      setProfile(profileRes.data);
      setClients(clientsRes.data);
      setPlans(plansRes.data);

      if (!selectedClientId && clientsRes.data.length > 0) {
        setSelectedClientId(clientsRes.data[0].id);
      }
    } catch (error) {
      console.error("Failed to load nutritionist dashboard", error);
      showToast("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const detailsClient = useMemo(() => {
    return clients.find((client) => client.id === detailsClientId) || null;
  }, [clients, detailsClientId]);

  const selectedClientPlans = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    return plans.filter((plan) => plan.assigned_to === selectedClient.id);
  }, [plans, selectedClient]);

  const totalClients = clients.length;
  const totalPlans = plans.length;
  const clientsWithPlans = clients.filter((client) => client.latest_nutrition_plan).length;
  const activeSubscriptions = clients.filter(
    (client) => client.active_subscription?.status === "active",
  ).length;

  const resetPlanForm = () => {
    setPlanForm({
      title: "",
      description: "",
      daily_calorie_target: "",
      duration_weeks: "",
      follow_up_notes: "",
    });
  };

  const openClientDetails = (clientId) => {
    setDetailsClientId(clientId);
  };

  const closeClientDetails = () => {
    setDetailsClientId(null);
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();

    if (!selectedClient) {
      showToast("Select a client first.");
      return;
    }

    if (!planForm.title.trim() || !planForm.description.trim()) {
      showToast("Plan title and description are required.");
      return;
    }

    setSavingPlan(true);

    try {
      const response = await api.post("plans/", {
        title: planForm.title.trim(),
        description: planForm.description.trim(),
        assigned_to: selectedClient.id,
        daily_calorie_target: planForm.daily_calorie_target
          ? Number(planForm.daily_calorie_target)
          : null,
        duration_weeks: planForm.duration_weeks ? Number(planForm.duration_weeks) : null,
        follow_up_notes: planForm.follow_up_notes.trim(),
      });

      setPlans((prev) => [response.data, ...prev]);
      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClient.id
            ? {
                ...client,
                latest_nutrition_plan: response.data,
              }
            : client,
        ),
      );
      resetPlanForm();
      showToast(`Nutrition plan assigned to ${selectedClient.full_name}.`);
    } catch (error) {
      console.error("Failed to create plan", error);
      showToast(error.response?.data?.detail || "Failed to save nutrition plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await api.delete(`plans/${planId}/`);

      const updatedPlans = plans.filter((plan) => plan.id !== planId);
      setPlans(updatedPlans);

      if (selectedClient) {
        const latestRemainingPlan = updatedPlans.find(
          (plan) => plan.assigned_to === selectedClient.id,
        );

        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClient.id
              ? {
                  ...client,
                  latest_nutrition_plan: latestRemainingPlan || null,
                }
              : client,
          ),
        );
      }

      showToast("Nutrition plan deleted.");
    } catch (error) {
      console.error("Failed to delete plan", error);
      showToast(error.response?.data?.detail || "Failed to delete nutrition plan.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderDashboard = () => {
    if (loading) {
      return <p>Loading dashboard...</p>;
    }

    return (
      <div className="nutri-dashboard">
        <div className="card-grid card-grid-spaced">
          <div className="stat-card">
            <h4>Total Clients</h4>
            <p>{totalClients}</p>
          </div>
          <div className="stat-card">
            <h4>Nutrition Plans</h4>
            <p>{totalPlans}</p>
          </div>
          <div className="stat-card">
            <h4>Active Subscriptions</h4>
            <p>{activeSubscriptions}</p>
          </div>
          <div className="stat-card">
            <h4>Clients With Plans</h4>
            <p>{clientsWithPlans}</p>
          </div>
        </div>

        <div className="dashboard-summary-grid">
          <div className="summary-card">
            <h3>Two Different Plan Types</h3>
            <p>
              A <strong>subscription</strong> is the paid access package. It gives the client
              access to consultations and follow-up.
            </p>
            <p>
              A <strong>nutrition plan</strong> is the personalized guidance you create after the
              consultation.
            </p>
          </div>

          <div className="summary-card">
            <h3>Workflow</h3>
            <ol className="workflow-list">
              <li>Client subscribes to the service.</li>
              <li>Consultation happens with the nutritionist.</li>
              <li>You create the personalized nutrition plan.</li>
              <li>The client follows it from their dashboard.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  };

  const renderClients = () => {
    if (loading) {
      return <p>Loading clients...</p>;
    }

    return (
      <div className="nutri-dashboard">
        <div className="section-heading">
          <h3>Clients</h3>
          <p>Click any client card to open their profile, subscription, and latest nutrition plan.</p>
        </div>

        {clients.length === 0 ? (
          <p className="empty-state">No client accounts found yet.</p>
        ) : (
          <div className="client-card-grid">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="client-card-button"
                onClick={() => openClientDetails(client.id)}
              >
                <div className="client-card-top">
                  <h4>{client.full_name}</h4>
                  <span className="user-plan-badge">
                    {client.latest_nutrition_plan ? "Nutrition plan" : "No plan"}
                  </span>
                </div>
                <p>{client.email}</p>
                <small>
                  {client.active_subscription?.subscription_plan?.name || "No active subscription"}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPlans = () => {
    if (loading) {
      return <p>Loading plans...</p>;
    }

    return (
      <div className="nutri-dashboard">
        <div className="plans-layout">
          <div className="clients-list-panel">
            <div className="section-heading">
              <h3>Choose Client</h3>
              <p>Pick who this nutrition plan is for.</p>
            </div>

            {clients.length === 0 ? (
              <p className="empty-state">Create a client account first to start assigning plans.</p>
            ) : (
              <ul className="user-list">
                {clients.map((client) => (
                  <li
                    key={client.id}
                    className={`user-item ${selectedClientId === client.id ? "active" : ""}`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className="user-item-body">
                      <strong>{client.full_name}</strong>
                      <span>{client.email}</span>
                    </div>
                    <span className="user-plan-badge">
                      {client.latest_nutrition_plan ? "Ready" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="user-panel">
            <div className="section-heading">
              <h3>Nutrition Plans</h3>
              <p>
                {selectedClient
                  ? `You are creating a nutrition plan for ${selectedClient.full_name}.`
                  : "Select a client from the left to start writing a nutrition plan."}
              </p>
            </div>

            <div className="notes-card">
              <h5>Subscription vs Nutrition Plan</h5>
              <p>
                The subscription is the paid access layer. The nutrition plan is the clinical
                result of your consultation and follow-up.
              </p>
            </div>

            {selectedClient?.active_subscription && (
              <div className="notes-card">
                <h5>Current Subscription</h5>
                <p>
                  <strong>{selectedClient.active_subscription.subscription_plan.name}</strong>{" "}
                  - {selectedClient.active_subscription.subscription_plan.duration_days} days -{" "}
                  {selectedClient.active_subscription.payment_status}
                </p>
              </div>
            )}

            <form className="plan-editor" onSubmit={handleCreatePlan}>
              <h5>Create New Nutrition Plan</h5>
              <input
                type="text"
                placeholder="Plan title"
                value={planForm.title}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <textarea
                placeholder="Plan description"
                rows="4"
                value={planForm.description}
                onChange={(event) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <div className="plan-form-grid">
                <input
                  type="number"
                  placeholder="Daily calorie target"
                  value={planForm.daily_calorie_target}
                  onChange={(event) =>
                    setPlanForm((prev) => ({
                      ...prev,
                      daily_calorie_target: event.target.value,
                    }))
                  }
                />
                <input
                  type="number"
                  placeholder="Duration (weeks)"
                  value={planForm.duration_weeks}
                  onChange={(event) =>
                    setPlanForm((prev) => ({
                      ...prev,
                      duration_weeks: event.target.value,
                    }))
                  }
                />
              </div>
              <textarea
                placeholder="Follow-up notes"
                rows="3"
                value={planForm.follow_up_notes}
                onChange={(event) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    follow_up_notes: event.target.value,
                  }))
                }
              />
              <button className="assign-btn" type="submit" disabled={savingPlan || !selectedClient}>
                {savingPlan ? "Saving..." : "Save Nutrition Plan"}
              </button>
            </form>

            <div className="plan-history">
              <div className="section-heading">
                <h5>Nutrition Plan History</h5>
                <p>
                  {selectedClient
                    ? `Existing nutrition plans for ${selectedClient.full_name}.`
                    : "Choose a client to see their nutrition plans."}
                </p>
              </div>

              {!selectedClient ? (
                <p className="empty-state">Select a client to view their plans.</p>
              ) : selectedClientPlans.length === 0 ? (
                <p className="empty-state">This client does not have any nutrition plans yet.</p>
              ) : (
                selectedClientPlans.map((plan) => (
                  <div key={plan.id} className="plan-history-card">
                    <div className="plan-history-header">
                      <h6>{plan.title}</h6>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        Delete
                      </button>
                    </div>
                    <p>{plan.description}</p>
                    <div className="plan-meta-row">
                      <span>
                        Calories: {plan.daily_calorie_target ? `${plan.daily_calorie_target} kcal` : "Not set"}
                      </span>
                      <span>
                        Duration: {plan.duration_weeks ? `${plan.duration_weeks} weeks` : "Not set"}
                      </span>
                    </div>
                    {plan.follow_up_notes && <p className="plan-followup">{plan.follow_up_notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="profile-panel">
      <div className="section-heading">
        <h3>Nutritionist Profile</h3>
        <p>Your dashboard is connected to your account information.</p>
      </div>

      <div className="client-details-grid">
        <div className="detail-card">
          <span>Name</span>
          <strong>
            {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Nutritionist"}
          </strong>
        </div>
        <div className="detail-card">
          <span>Email</span>
          <strong>{profile.email || "Not available"}</strong>
        </div>
        <div className="detail-card">
          <span>Phone</span>
          <strong>{profile.phone || "Not provided"}</strong>
        </div>
        <div className="detail-card">
          <span>Role</span>
          <strong>{profile.role || "nutritionist"}</strong>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "clients":
        return renderClients();
      case "plans":
        return renderPlans();
      case "profile":
        return renderProfile();
      default:
        return <p>Select a section from the sidebar.</p>;
    }
  };

  return (
    <>
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
              className={activeSection === "clients" ? "active" : ""}
              onClick={() => setActiveSection("clients")}
            >
              Clients
            </li>
            <li
              className={activeSection === "plans" ? "active" : ""}
              onClick={() => setActiveSection("plans")}
            >
              Nutrition Plans
            </li>
            <li
              className={activeSection === "profile" ? "active" : ""}
              onClick={() => setActiveSection("profile")}
            >
              Profile
            </li>
            <li onClick={handleLogout} style={{ color: "#e57373", marginTop: "auto" }}>
              Logout
            </li>
          </ul>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            <button className="menu-btn" onClick={toggleSidebar} aria-label="Open menu"><span></span><span></span><span></span></button>
            <div className="dashboard-header-copy">
              <span className="dashboard-header-kicker">
                Nutritionist workspace
              </span>
              <h2>Welcome {profile.first_name || "Nutritionist"}</h2>
            </div>
          </header>

          <section className={`dashboard-content section-${activeSection}`}>
            {renderContent()}
          </section>
        </div>
      </div>

      {detailsClient && (
        <div className="modal-backdrop" onClick={closeClientDetails}>
          <div className="client-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h4>{detailsClient.full_name}</h4>
                <p>{detailsClient.email}</p>
              </div>
              <button type="button" className="close-btn" onClick={closeClientDetails}>
                X
              </button>
            </div>

            <div className="client-details-grid">
              <div className="detail-card">
                <span>Phone</span>
                <strong>{detailsClient.phone || "Not provided"}</strong>
              </div>
              <div className="detail-card">
                <span>Age</span>
                <strong>{detailsClient.age || "Not provided"}</strong>
              </div>
              <div className="detail-card">
                <span>Weight</span>
                <strong>
                  {detailsClient.weight ? `${detailsClient.weight} kg` : "Not provided"}
                </strong>
              </div>
              <div className="detail-card">
                <span>Subscription</span>
                <strong>
                  {detailsClient.active_subscription?.subscription_plan?.name || "No subscription"}
                </strong>
              </div>
            </div>

            <div className="notes-card">
              <h5>Payment And Access</h5>
              <p>
                Status: {detailsClient.active_subscription?.status || "Not active"} - Payment:{" "}
                {detailsClient.active_subscription?.payment_status || "Not started"}
              </p>
            </div>

            <div className="notes-card">
              <h5>Allergies</h5>
              <p>{detailsClient.allergies || "None listed"}</p>
            </div>

            <div className="notes-card">
              <h5>Foods To Avoid</h5>
              <p>{detailsClient.avoid || "No food restrictions provided."}</p>
            </div>

            <div className="notes-card">
              <h5>Latest Nutrition Plan</h5>
              <p>
                {detailsClient.latest_nutrition_plan
                  ? detailsClient.latest_nutrition_plan.title
                  : "No nutrition plan yet."}
              </p>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export default NutriDashboard;

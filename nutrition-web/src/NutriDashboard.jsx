import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";
import { logout } from "./services/Auth";
import ProgressStrip from "./ProgressStrip";

function NutriDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profile, setProfile] = useState({});
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planTemplates, setPlanTemplates] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [editingBlogPostId, setEditingBlogPostId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [detailsClientId, setDetailsClientId] = useState(null);
  const [clientProgress, setClientProgress] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [clientProgressRange, setClientProgressRange] = useState("plan");
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    daily_calorie_target: "",
    duration_weeks: "",
    follow_up_notes: "",
  });
  const [consultationForm, setConsultationForm] = useState({
    client: "",
    scheduled_at: "",
    duration_minutes: "30",
    topic: "Nutrition consultation",
    notes: "",
  });
  const [blogDraft, setBlogDraft] = useState({
    title: "",
    category: "nutrition",
    summary: "",
    content: "",
    image: null,
    is_published: true,
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [savingBlogPost, setSavingBlogPost] = useState(false);
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

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchDashboardData = async () => {
    try {
      const [
        profileRes,
        clientsRes,
        plansRes,
        templatesRes,
        consultationsRes,
        blogRes,
      ] = await Promise.all([
        api.get("me/"),
        api.get("clients/"),
        api.get("plans/"),
        api.get("plan-templates/"),
        api.get("consultations/"),
        api.get("blog-posts/"),
      ]);

      localStorage.setItem("userRole", profileRes.data.role || "nutritionist");
      setProfile(profileRes.data);
      setClients(clientsRes.data);
      setPlans(plansRes.data);
      setPlanTemplates(templatesRes.data);
      setConsultations(consultationsRes.data);
      setBlogPosts(blogRes.data);

      if (!selectedClientId && clientsRes.data.length > 0) {
        setSelectedClientId(clientsRes.data[0].id);
        setConsultationForm((prev) => ({
          ...prev,
          client: String(clientsRes.data[0].id),
        }));
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
  const fetchClientProgress = async (clientId, range = clientProgressRange) => {
    if (!clientId) {
      setClientProgress(null);
      return;
    }

    try {
      const response = await api.get(
        `progress/?client_id=${clientId}&range=${range}`,
      );
      setClientProgress(response.data);
    } catch (error) {
      console.error("Failed to load client progress", error);
      setClientProgress(null);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchClientProgress(selectedClientId, clientProgressRange);
    } else {
      setClientProgress(null);
    }
  }, [selectedClientId, clientProgressRange]);

  const totalClients = clients.length;
  const totalPlans = plans.length;
  const clientsWithPlans = clients.filter(
    (client) => client.latest_nutrition_plan,
  ).length;
  const activeSubscriptions = clients.filter(
    (client) => client.active_subscription?.status === "active",
  ).length;
  const upcomingConsultations = consultations.filter(
    (consultation) => consultation.status === "scheduled",
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
    fetchClientProgress(clientId);
  };

  const closeClientDetails = () => {
    setDetailsClientId(null);
    setClientProgress(null);
  };

  const goToPlanAssignment = (clientId) => {
    setSelectedClientId(clientId);
    setActiveSection("plans");
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
        duration_weeks: planForm.duration_weeks
          ? Number(planForm.duration_weeks)
          : null,
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
      showToast(
        error.response?.data?.detail || "Failed to save nutrition plan.",
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreateTemplate = async (event) => {
    event.preventDefault();

    if (!planForm.title.trim() || !planForm.description.trim()) {
      showToast("Template title and description are required.");
      return;
    }

    setSavingPlan(true);

    try {
      const response = await api.post("plan-templates/", {
        title: planForm.title.trim(),
        description: planForm.description.trim(),
        daily_calorie_target: planForm.daily_calorie_target
          ? Number(planForm.daily_calorie_target)
          : null,
        duration_weeks: planForm.duration_weeks
          ? Number(planForm.duration_weeks)
          : null,
        follow_up_notes: planForm.follow_up_notes.trim(),
      });

      setPlanTemplates((prev) => [response.data, ...prev]);
      setSelectedTemplateId(String(response.data.id));
      resetPlanForm();
      showToast("Reusable nutrition plan saved.");
    } catch (error) {
      console.error("Failed to create plan template", error);
      showToast(
        error.response?.data?.detail || "Failed to save reusable plan.",
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAssignExistingTemplate = async () => {
    if (!selectedClient) {
      showToast("Select a client first.");
      return;
    }

    if (!selectedTemplateId) {
      showToast("Choose an existing plan template first.");
      return;
    }

    setSavingPlan(true);

    try {
      const response = await api.post(
        `plan-templates/${selectedTemplateId}/assign/`,
        {
          assigned_to: selectedClient.id,
        },
      );

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
      await fetchClientProgress(selectedClient.id, clientProgressRange);
      showToast(`Existing plan assigned to ${selectedClient.full_name}.`);
    } catch (error) {
      console.error("Failed to assign existing plan", error);
      showToast(
        error.response?.data?.detail || "Failed to assign existing plan.",
      );
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
      showToast(
        error.response?.data?.detail || "Failed to delete nutrition plan.",
      );
    }
  };

  const resetConsultationForm = () => {
    setConsultationForm({
      client: selectedClientId ? String(selectedClientId) : "",
      scheduled_at: "",
      duration_minutes: "30",
      topic: "Nutrition consultation",
      notes: "",
    });
  };

  const handleScheduleConsultation = async (event) => {
    event.preventDefault();

    if (!consultationForm.client || !consultationForm.scheduled_at) {
      showToast("Choose a client and consultation date first.");
      return;
    }

    setSavingConsultation(true);

    try {
      const response = await api.post("consultations/", {
        client: Number(consultationForm.client),
        scheduled_at: new Date(consultationForm.scheduled_at).toISOString(),
        duration_minutes: Number(consultationForm.duration_minutes),
        topic: consultationForm.topic.trim(),
        notes: consultationForm.notes.trim(),
      });

      setConsultations((prev) => [response.data, ...prev]);
      resetConsultationForm();
      showToast("Zoom consultation created.");
    } catch (error) {
      console.error("Failed to create consultation", error);
      const zoomError = error.response?.data?.zoom;
      showToast(
        typeof zoomError === "string"
          ? zoomError
          : zoomError?.message ||
              zoomError?.reason ||
              error.response?.data?.detail ||
              "Failed to create Zoom consultation.",
      );
    } finally {
      setSavingConsultation(false);
    }
  };

  const handleCompleteConsultation = async (consultationId) => {
    try {
      const response = await api.post(
        `consultations/${consultationId}/complete/`,
      );
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.id === consultationId ? response.data : consultation,
        ),
      );
      showToast("Consultation marked as completed.");
    } catch (error) {
      console.error("Failed to complete consultation", error);
      showToast(
        error.response?.data?.detail || "Failed to complete consultation.",
      );
    }
  };

  const resetBlogDraft = () => {
    setBlogDraft({
      title: "",
      category: "nutrition",
      summary: "",
      content: "",
      image: null,
      is_published: true,
    });
  };

  const canEditBlogPost = (post) => {
    return post.author === profile.id || post.author_is_admin || !post.author;
  };

  const canDeleteBlogPost = (post) => {
    return post.author === profile.id;
  };

  const startEditingBlogPost = (post) => {
    setEditingBlogPostId(post.id);
    setBlogDraft({
      title: post.title || "",
      category: post.category || "nutrition",
      summary: post.summary || "",
      content: post.content || "",
      image: null,
      is_published: Boolean(post.is_published),
    });
  };

  const handleDeleteBlogPost = async (postId) => {
    try {
      await api.delete(`blog-posts/${postId}/`);
      setBlogPosts((prev) => prev.filter((post) => post.id !== postId));
      showToast("Blog post deleted.");
    } catch (error) {
      console.error("Failed to delete blog post", error);
      showToast(error.response?.data?.detail || "Failed to delete blog post.");
    }
  };
  const handleCreateBlogPost = async (event) => {
    event.preventDefault();

    if (!blogDraft.title.trim() || !blogDraft.content.trim()) {
      showToast("Blog title and content are required.");
      return;
    }

    setSavingBlogPost(true);

    try {
      const payload = new FormData();
      payload.append("title", blogDraft.title.trim());
      payload.append("category", blogDraft.category);
      payload.append("summary", blogDraft.summary.trim());
      payload.append("content", blogDraft.content.trim());
      payload.append("is_published", blogDraft.is_published ? "true" : "false");
      payload.append("published_at", new Date().toISOString());
      if (blogDraft.image) {
        payload.append("image", blogDraft.image);
      }

      if (editingBlogPostId) {
        const response = await api.patch(
          `blog-posts/${editingBlogPostId}/`,
          payload,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        setBlogPosts((prev) =>
          prev.map((post) =>
            post.id === editingBlogPostId ? response.data : post,
          ),
        );
        showToast("Blog post updated.");
      } else {
        const response = await api.post("blog-posts/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setBlogPosts((prev) => [response.data, ...prev]);
        showToast("Blog post published.");
      }
      resetBlogDraft();
    } catch (error) {
      console.error("Failed to create blog post", error);
      showToast(error.response?.data?.detail || "Failed to save blog post.");
    } finally {
      setSavingBlogPost(false);
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

    const nextConsultation = consultations.find(
      (consultation) => consultation.status === "scheduled",
    );
    const clientSpotlight = selectedClient || clients[0];

    return (
      <div className="nutri-dashboard dashboard-home-shell">
        <section className="role-hero-card nutritionist-hero-card">
          <div>
            <span className="role-hero-kicker">Care command center</span>
            <h3>
              Manage clients, assign plans, and run Zoom follow-ups from one
              place.
            </h3>
            <p>
              This dashboard connects the consultation workflow with reusable
              nutrition plans, patient progress, and educational content.
            </p>
            <div className="role-hero-actions">
              <button
                type="button"
                className="hero-action-primary"
                onClick={() => setActiveSection("clients")}
              >
                Review Clients
              </button>
              <button
                type="button"
                className="hero-action-secondary"
                onClick={() => setActiveSection("plans")}
              >
                Create Or Assign Plan
              </button>
            </div>
          </div>
          <div className="role-hero-visual mini-calendar-card">
            <span>Next Zoom</span>
            <strong>
              {nextConsultation
                ? nextConsultation.client_name || nextConsultation.client_email
                : "No meeting"}
            </strong>
            <p>
              {nextConsultation
                ? formatDateTime(nextConsultation.scheduled_at)
                : "Create a consultation when a client is ready."}
            </p>
          </div>
        </section>

        <div className="dashboard-metric-strip">
          <div className="metric-pill">
            <span>Total Clients</span>
            <strong>{totalClients}</strong>
          </div>
          <div className="metric-pill">
            <span>Assigned Plans</span>
            <strong>{totalPlans}</strong>
          </div>
          <div className="metric-pill">
            <span>Active Subscriptions</span>
            <strong>{activeSubscriptions}</strong>
          </div>
          <div className="metric-pill">
            <span>Upcoming Zoom</span>
            <strong>{upcomingConsultations}</strong>
          </div>
        </div>

        <div className="action-card-grid">
          <button
            type="button"
            className="dashboard-action-card action-featured"
            onClick={() => setActiveSection("clients")}
          >
            <strong>Open Client Profiles</strong>
            <p>
              Check health details, subscription status, latest plan, and
              progress.
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("plans")}
          >
            <strong>Plan Library</strong>
            <p>
              Create reusable plans and assign an existing one when a client is
              ready.
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("consultations")}
          >
            <strong>Schedule Zoom</strong>
            <p>
              Generate meeting links and mark completed sessions after
              follow-up.
            </p>
          </button>
          <button
            type="button"
            className="dashboard-action-card"
            onClick={() => setActiveSection("content")}
          >
            <strong>Publish Content</strong>
            <p>
              Add recipes, guidance, and nutrition news for the public blog.
            </p>
          </button>
        </div>

        <div className="dashboard-summary-grid">
          <div className="summary-card highlight-summary-card">
            <h3>Client Spotlight</h3>
            {clientSpotlight ? (
              <>
                <p>
                  <strong>
                    {clientSpotlight.full_name || clientSpotlight.email}
                  </strong>
                </p>
                <p>
                  {clientSpotlight.latest_nutrition_plan
                    ? `Current plan: ${clientSpotlight.latest_nutrition_plan.title}`
                    : "No nutrition plan assigned yet."}
                </p>
                <button
                  type="button"
                  className="inline-pill-button"
                  onClick={() => {
                    setSelectedClientId(clientSpotlight.id);
                    setActiveSection("plans");
                  }}
                >
                  View Progress And Plans
                </button>
              </>
            ) : (
              <p>No client accounts found yet.</p>
            )}
          </div>
          <div className="summary-card highlight-summary-card">
            <h3>Reusable Plan Library</h3>
            <p>
              You have <strong>{planTemplates.length}</strong> reusable plan
              template{planTemplates.length === 1 ? "" : "s"} ready.
            </p>
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
      <div className="nutri-dashboard clients-workspace-page">
        <div className="section-heading">
          <h3>Clients</h3>
          <p>
            Choose a client to review progress, health details, and their assigned
            nutrition plan.
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="empty-state">No client accounts found yet.</p>
        ) : (
          <div className="clients-workspace-grid">
            <section className="clients-list-panel clients-rail-panel">
              <div className="client-card-grid client-rail-list">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className={`client-card-button ${
                      selectedClientId === client.id ? "active-client-card" : ""
                    }`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className="client-card-top">
                      <h4>{client.full_name}</h4>
                      <span className="user-plan-badge">
                        {client.latest_nutrition_plan ? "Has plan" : "No plan"}
                      </span>
                    </div>
                    <p>{client.email}</p>
                    <small>
                      {client.active_subscription?.subscription_plan?.name ||
                        "No active subscription"}
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <section className="selected-client-panel">
              {selectedClient ? (
                <>
                  <div className="selected-client-hero">
                    <div>
                      <span>Selected client</span>
                      <h4>{selectedClient.full_name}</h4>
                      <p>{selectedClient.email}</p>
                    </div>
                    <button
                      type="button"
                      className="assign-btn"
                      onClick={() => goToPlanAssignment(selectedClient.id)}
                    >
                      {selectedClient.latest_nutrition_plan
                        ? "Change Plan"
                        : "Assign Plan"}
                    </button>
                  </div>

                  <div className="client-plan-summary">
                    <div>
                      <span>Current plan</span>
                      <strong>
                        {selectedClient.latest_nutrition_plan?.title ||
                          "No nutrition plan assigned"}
                      </strong>
                    </div>
                    <div>
                      <span>Subscription</span>
                      <strong>
                        {selectedClient.active_subscription?.subscription_plan?.name ||
                          "No active subscription"}
                      </strong>
                    </div>
                    <div>
                      <span>Health notes</span>
                      <strong>
                        {selectedClient.allergies || selectedClient.avoid
                          ? "Provided"
                          : "Not provided"}
                      </strong>
                    </div>
                  </div>

                  {clientProgress ? (
                    <ProgressStrip
                      days={clientProgress.days || []}
                      title="Client Progress"
                      subtitle="Progress is based on meal logs saved from the client dashboard."
                      actions={
                        <select
                          className="progress-range-select"
                          value={clientProgressRange}
                          onChange={(event) =>
                            setClientProgressRange(event.target.value)
                          }
                        >
                          <option value="plan">Current plan</option>
                          <option value="7">Last 7 days</option>
                          <option value="14">Last 14 days</option>
                          <option value="30">Last 30 days</option>
                          <option value="all">All logs</option>
                        </select>
                      }
                    />
                  ) : (
                    <p className="empty-state">
                      Progress will appear after this client saves meal logs.
                    </p>
                  )}

                  <div className="client-support-grid">
                    <div className="notes-card">
                      <h5>Allergies</h5>
                      <p>{selectedClient.allergies || "None listed."}</p>
                    </div>
                    <div className="notes-card">
                      <h5>Foods to avoid</h5>
                      <p>
                        {selectedClient.avoid ||
                          "No food restrictions provided."}
                      </p>
                    </div>
                  </div>

                  <div className="plan-history compact-client-history">
                    <div className="section-heading">
                      <h5>Assigned Plan History</h5>
                      <p>Previous and current plans assigned to this client.</p>
                    </div>

                    {selectedClientPlans.length === 0 ? (
                      <p className="empty-state">
                        This client does not have any assigned nutrition plans yet.
                      </p>
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
                              {plan.daily_calorie_target
                                ? `${plan.daily_calorie_target} kcal/day`
                                : "Target not set"}
                            </span>
                            <span>
                              {plan.duration_weeks
                                ? `${plan.duration_weeks} weeks`
                                : "Flexible duration"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-state">Select a client to review progress.</p>
              )}
            </section>
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
      <div className="nutri-dashboard plans-focused-page">
        <div className="section-heading">
          <h3>Nutrition Plans</h3>
          <p>
            Manage the reusable plan library here. Use the highlighted assign
            box when a selected client is ready for a plan.
          </p>
        </div>

        <section className="plan-assign-spotlight">
          <div>
            <span>Assign or change plan</span>
            <h4>
              {selectedClient
                ? selectedClient.full_name
                : "Choose a client first"}
            </h4>
            <p>
              {selectedClient?.latest_nutrition_plan
                ? `Current plan: ${selectedClient.latest_nutrition_plan.title}`
                : selectedClient
                  ? "This client has no nutrition plan yet."
                  : "Pick a client from the selector or from the Clients page."}
            </p>
          </div>

          <div className="assign-plan-grid assign-spotlight-form">
            <label>
              <span>Client</span>
              <select
                value={selectedClientId || ""}
                onChange={(event) =>
                  setSelectedClientId(Number(event.target.value) || null)
                }
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} - {client.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Reusable plan</span>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                <option value="">Select reusable plan</option>
                {planTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                    {template.daily_calorie_target
                      ? ` - ${template.daily_calorie_target} kcal`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="assign-btn"
              type="button"
              disabled={savingPlan || !selectedClient || !selectedTemplateId}
              onClick={handleAssignExistingTemplate}
            >
              {savingPlan
                ? "Assigning..."
                : selectedClient?.latest_nutrition_plan
                  ? "Change Client Plan"
                  : "Assign Plan To Client"}
            </button>
          </div>
        </section>

        <div className="plans-workspace plans-simple-workspace">
          <section className="plan-work-card">
            <div className="section-heading compact-heading">
              <h4>Create Reusable Plan</h4>
              <p>
                Save the plan once, then assign it to clients whenever needed.
              </p>
            </div>

            <form
              className="plan-editor clean-plan-editor"
              onSubmit={handleCreateTemplate}
            >
              <input
                type="text"
                placeholder="Plan title"
                value={planForm.title}
                onChange={(event) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
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
              <button
                className="assign-btn"
                type="submit"
                disabled={savingPlan}
              >
                {savingPlan ? "Saving..." : "Save Reusable Plan"}
              </button>
            </form>
          </section>

          <section className="plan-work-card plan-library-card">
            <div className="section-heading compact-heading">
              <h4>Plan Library</h4>
              <p>Quick check of the plans you can assign.</p>
            </div>

            {planTemplates.length === 0 ? (
              <p className="empty-state">No reusable plans yet. Create one first.</p>
            ) : (
              <div className="plan-template-list-clean">
                {planTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`plan-template-row ${
                      selectedTemplateId === String(template.id) ? "selected" : ""
                    }`}
                    onClick={() => setSelectedTemplateId(String(template.id))}
                  >
                    <strong>{template.title}</strong>
                    <span>
                      {template.daily_calorie_target
                        ? `${template.daily_calorie_target} kcal/day`
                        : "No calorie target"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  };
  const renderConsultations = () => (
    <div className="nutri-dashboard">
      <div className="plans-layout">
        <div className="clients-list-panel">
          <div className="section-heading">
            <h3>Create Zoom Consultation</h3>
            <p>
              Schedule the meeting here. Zoom creates the link automatically.
            </p>
          </div>

          <form className="plan-editor" onSubmit={handleScheduleConsultation}>
            <select
              value={consultationForm.client}
              onChange={(event) =>
                setConsultationForm((prev) => ({
                  ...prev,
                  client: event.target.value,
                }))
              }
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={consultationForm.scheduled_at}
              onChange={(event) =>
                setConsultationForm((prev) => ({
                  ...prev,
                  scheduled_at: event.target.value,
                }))
              }
            />
            <select
              value={consultationForm.duration_minutes}
              onChange={(event) =>
                setConsultationForm((prev) => ({
                  ...prev,
                  duration_minutes: event.target.value,
                }))
              }
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
            <input
              type="text"
              placeholder="Meeting topic"
              value={consultationForm.topic}
              onChange={(event) =>
                setConsultationForm((prev) => ({
                  ...prev,
                  topic: event.target.value,
                }))
              }
            />
            <textarea
              rows="3"
              placeholder="Private notes or agenda"
              value={consultationForm.notes}
              onChange={(event) =>
                setConsultationForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
            />
            <button
              className="assign-btn"
              type="submit"
              disabled={savingConsultation}
            >
              {savingConsultation ? "Creating Zoom..." : "Create Zoom Meeting"}
            </button>
          </form>
        </div>

        <div className="user-panel">
          <div className="section-heading">
            <h3>Scheduled Consultations</h3>
            <p>These are the Zoom consultations created from your dashboard.</p>
          </div>

          {consultations.length === 0 ? (
            <p className="empty-state">No consultations scheduled yet.</p>
          ) : (
            <div className="consultation-list">
              {consultations.map((consultation) => (
                <div key={consultation.id} className="consultation-card">
                  <div>
                    <h5>{consultation.topic || "Nutrition consultation"}</h5>
                    <p>
                      {consultation.client_name || consultation.client_email}
                    </p>
                    <span>{formatDateTime(consultation.scheduled_at)}</span>
                  </div>
                  <div className="consultation-actions">
                    <strong>{consultation.status}</strong>
                    {consultation.zoom_join_url &&
                      consultation.status === "scheduled" && (
                        <a
                          href={consultation.zoom_join_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Zoom
                        </a>
                      )}
                    {consultation.status === "scheduled" && (
                      <button
                        type="button"
                        className="complete-btn"
                        onClick={() =>
                          handleCompleteConsultation(consultation.id)
                        }
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContentManagement = () => (
    <div className="nutri-dashboard">
      <div className="plans-layout">
        <div className="clients-list-panel">
          <div className="section-heading">
            <h3>
              {editingBlogPostId
                ? "Edit Blog / Nutrition News"
                : "Create Blog / Nutrition News"}
            </h3>
            <p>
              Share recipes, nutrition education, lifestyle advice, or
              announcements.
            </p>
          </div>

          <form className="plan-editor" onSubmit={handleCreateBlogPost}>
            <input
              type="text"
              placeholder="Post title"
              value={blogDraft.title}
              onChange={(event) =>
                setBlogDraft((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <select
              value={blogDraft.category}
              onChange={(event) =>
                setBlogDraft((prev) => ({
                  ...prev,
                  category: event.target.value,
                }))
              }
            >
              <option value="nutrition">Nutrition</option>
              <option value="recipe">Recipe</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="announcement">Announcement</option>
            </select>
            <textarea
              rows="2"
              placeholder="Short summary"
              value={blogDraft.summary}
              onChange={(event) =>
                setBlogDraft((prev) => ({
                  ...prev,
                  summary: event.target.value,
                }))
              }
            />
            <textarea
              rows="5"
              placeholder="Post content"
              value={blogDraft.content}
              onChange={(event) =>
                setBlogDraft((prev) => ({
                  ...prev,
                  content: event.target.value,
                }))
              }
            />
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setBlogDraft((prev) => ({
                  ...prev,
                  image: event.target.files?.[0] || null,
                }))
              }
            />
            <label className="admin-check">
              <input
                type="checkbox"
                checked={blogDraft.is_published}
                onChange={(event) =>
                  setBlogDraft((prev) => ({
                    ...prev,
                    is_published: event.target.checked,
                  }))
                }
              />
              Publish immediately
            </label>
            <button
              className="assign-btn"
              type="submit"
              disabled={savingBlogPost}
            >
              {savingBlogPost
                ? "Saving..."
                : editingBlogPostId
                  ? "Update Blog Post"
                  : "Save Blog Post"}
            </button>
          </form>
        </div>

        <div className="user-panel">
          <div className="section-heading">
            <h3>Blog / Nutrition News</h3>
            <p>Your posts and published platform content appear here.</p>
          </div>

          {blogPosts.length === 0 ? (
            <p className="empty-state">No blog posts yet.</p>
          ) : (
            <div className="consultation-list">
              {blogPosts.map((post) => (
                <div key={post.id} className="consultation-card">
                  <div>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="admin-post-thumb"
                      />
                    )}
                    <h5>{post.title}</h5>
                    <p>{post.summary || post.content.slice(0, 140)}</p>
                    <span>
                      {post.category} -{" "}
                      {post.is_published ? "Published" : "Draft"} -{" "}
                      {post.author_name}
                    </span>
                  </div>
                  <div className="consultation-actions">
                    {canEditBlogPost(post) && (
                      <button
                        type="button"
                        className="complete-btn"
                        onClick={() => startEditingBlogPost(post)}
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteBlogPost(post) && (
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => handleDeleteBlogPost(post.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
            {[profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(" ") || "Nutritionist"}
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
      case "consultations":
        return renderConsultations();
      case "content":
        return renderContentManagement();
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
              className={activeSection === "consultations" ? "active" : ""}
              onClick={() => setActiveSection("consultations")}
            >
              Consultations
            </li>
            <li
              className={activeSection === "content" ? "active" : ""}
              onClick={() => setActiveSection("content")}
            >
              Content
            </li>
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
          <div
            className="client-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h4>{detailsClient.full_name}</h4>
                <p>{detailsClient.email}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={closeClientDetails}
              >
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
                  {detailsClient.weight
                    ? `${detailsClient.weight} kg`
                    : "Not provided"}
                </strong>
              </div>
              <div className="detail-card">
                <span>Subscription</span>
                <strong>
                  {detailsClient.active_subscription?.subscription_plan?.name ||
                    "No subscription"}
                </strong>
              </div>
            </div>

            <div className="notes-card">
              <h5>Payment And Access</h5>
              <p>
                Status:{" "}
                {detailsClient.active_subscription?.status || "Not active"} -
                Payment:{" "}
                {detailsClient.active_subscription?.payment_status ||
                  "Not started"}
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


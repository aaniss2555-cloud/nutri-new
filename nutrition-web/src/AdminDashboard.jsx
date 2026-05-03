import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/axiosInstance";
import { logout } from "./services/Auth";

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planDraft, setPlanDraft] = useState({});
  const [blogDraft, setBlogDraft] = useState({ title: "", category: "nutrition", summary: "", content: "", is_published: true, image: null });
  const [editingPostId, setEditingPostId] = useState(null);
  const [inquiryFilter, setInquiryFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (value) => {
    if (!value) return "Not set";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  };

  const fetchAdminData = async () => {
    try {
      const [summaryRes, usersRes, plansRes, subscriptionsRes, inquiriesRes, blogRes] = await Promise.all([
        api.get("admin-summary/"),
        api.get("admin-users/"),
        api.get("admin-subscription-plans/"),
        api.get("admin-subscriptions/"),
        api.get("admin-inquiries/"),
        api.get("blog-posts/"),
      ]);
      setSummary(summaryRes.data);
      setUsers(usersRes.data);
      setSubscriptionPlans(plansRes.data);
      setSubscriptions(subscriptionsRes.data);
      setInquiries(inquiriesRes.data);
      setBlogPosts(blogRes.data);
    } catch (error) {
      console.error("Failed to load admin dashboard", error);
      showToast(error.response?.data?.detail || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const updateUser = async (userId, payload) => {
    try {
      const response = await api.patch(`admin-users/${userId}/`, payload);
      setUsers((prev) => prev.map((user) => (user.id === userId ? response.data : user)));
      showToast(response.data.detail || "User updated.");
      fetchAdminData();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update user.");
    }
  };

  const startEditingPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanDraft({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration_days: plan.duration_days,
      consultation_count: plan.consultation_count,
      includes_followup: plan.includes_followup,
      is_active: plan.is_active,
    });
  };

  const savePlan = async (planId) => {
    try {
      const response = await api.patch(`admin-subscription-plans/${planId}/`, {
        name: planDraft.name,
        description: planDraft.description,
        price: planDraft.price,
        duration_days: Number(planDraft.duration_days),
        consultation_count: Number(planDraft.consultation_count),
        includes_followup: Boolean(planDraft.includes_followup),
        is_active: Boolean(planDraft.is_active),
      });
      setSubscriptionPlans((prev) => prev.map((plan) => (plan.id === planId ? response.data : plan)));
      setEditingPlanId(null);
      showToast("Subscription plan updated.");
      fetchAdminData();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update subscription plan.");
    }
  };

  const updateSubscription = async (subscriptionId, payload) => {
    try {
      const response = await api.patch(`admin-subscriptions/${subscriptionId}/`, payload);
      setSubscriptions((prev) => prev.map((subscription) => (subscription.id === subscriptionId ? response.data : subscription)));
      showToast("Subscription updated.");
      fetchAdminData();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update subscription.");
    }
  };

  const markInquiryHandled = async (inquiryId) => {
    try {
      const response = await api.patch(`admin-inquiries/${inquiryId}/`, { status: "handled" });
      setInquiries((prev) => prev.map((inquiry) => (inquiry.id === inquiryId ? response.data : inquiry)));
      showToast("Inquiry marked as handled.");
      fetchAdminData();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update inquiry.");
    }
  };

  const resetBlogDraft = () => {
    setBlogDraft({ title: "", category: "nutrition", summary: "", content: "", is_published: true, image: null });
    setEditingPostId(null);
  };

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setBlogDraft({
      title: post.title,
      category: post.category,
      summary: post.summary,
      content: post.content,
      is_published: post.is_published,
      image: null,
    });
  };

  const saveBlogPost = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("title", blogDraft.title);
      payload.append("category", blogDraft.category);
      payload.append("summary", blogDraft.summary);
      payload.append("content", blogDraft.content);
      payload.append("is_published", blogDraft.is_published ? "true" : "false");
      payload.append("published_at", new Date().toISOString());
      if (blogDraft.image) {
        payload.append("image", blogDraft.image);
      }

      if (editingPostId) {
        const response = await api.patch(`blog-posts/${editingPostId}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setBlogPosts((prev) => prev.map((post) => (post.id === editingPostId ? response.data : post)));
        showToast("Blog post updated.");
      } else {
        const response = await api.post("blog-posts/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setBlogPosts((prev) => [response.data, ...prev]);
        showToast("Blog post created.");
      }
      resetBlogDraft();
      fetchAdminData();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to save blog post.");
    }
  };

  const stats = summary?.stats || {};
  const nutritionists = users.filter((user) => user.role === "nutritionist" || user.is_staff);
  const clients = users.filter((user) => user.role === "client" && !user.is_staff);
  const filteredInquiries = inquiries.filter((inquiry) => inquiryFilter === "all" || inquiry.status === inquiryFilter);

  const renderOverview = () => (
    <div className="admin-dashboard dashboard-home-shell">
      <section className="role-hero-card admin-hero-card">
        <div>
          <span className="role-hero-kicker">Platform control center</span>
          <h3>Supervise accounts, subscriptions, content, and support messages.</h3>
          <p>
            The admin dashboard proves the platform is manageable, not just usable: users,
            subscriptions, blogs, inquiries, and system notes all connect here.
          </p>
          <div className="role-hero-actions">
            <button type="button" className="hero-action-primary" onClick={() => setActiveSection("users")}>
              Manage Users
            </button>
            <button type="button" className="hero-action-secondary" onClick={() => setActiveSection("inquiries")}>
              Handle Inquiries
            </button>
          </div>
        </div>
        <div className="role-hero-visual admin-console-card">
          <span>Open Issues</span>
          <strong>{stats.open_inquiries || 0}</strong>
          <p>{stats.active_subscriptions || 0} active subscriptions monitored.</p>
        </div>
      </section>

      <div className="dashboard-metric-strip">
        <div className="metric-pill"><span>Total Users</span><strong>{stats.total_users || 0}</strong></div>
        <div className="metric-pill"><span>Clients</span><strong>{stats.clients || 0}</strong></div>
        <div className="metric-pill"><span>Nutritionists</span><strong>{stats.nutritionists || 0}</strong></div>
        <div className="metric-pill"><span>Published Posts</span><strong>{stats.published_posts || 0}</strong></div>
      </div>

      <div className="action-card-grid">
        <button type="button" className="dashboard-action-card action-featured" onClick={() => setActiveSection("subscriptions")}>
          <strong>Plans & Payments</strong>
          <p>Edit normal/premium access and update simulated payment states.</p>
        </button>
        <button type="button" className="dashboard-action-card" onClick={() => setActiveSection("content")}>
          <strong>Content Control</strong>
          <p>Create public posts, keep drafts private, and remove unsuitable posts.</p>
        </button>
        <button type="button" className="dashboard-action-card" onClick={() => setActiveSection("activity")}>
          <strong>Platform Activity</strong>
          <p>Review recent consultations and nutrition plans from the system.</p>
        </button>
        <a href={summary?.django_admin_url || "http://localhost:8000/admin/"} target="_blank" rel="noreferrer" className="dashboard-action-card">
          <strong>Django Admin</strong>
          <p>Open the built-in admin panel for deeper database-level control.</p>
        </a>
      </div>
    </div>
  );

  const renderUserRows = (items) => (
    <div className="admin-table-card">
      {items.length === 0 ? <p className="empty-state">No accounts found.</p> : items.map((user) => (
        <div key={user.id} className="admin-row admin-row-wide">
          <div><strong>{user.full_name}</strong><span>{user.email}</span><small>{user.is_superuser ? "Superuser" : user.is_staff ? "Staff admin" : user.role}</small></div>
          <div className="admin-actions">
            {!user.is_superuser && <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}><option value="client">Client</option><option value="nutritionist">Nutritionist</option></select>}
            {!user.is_superuser && <button type="button" className={user.is_active ? "danger-btn" : "complete-btn"} onClick={() => updateUser(user.id, { is_active: !user.is_active })}>{user.is_active ? "Deactivate" : "Activate"}</button>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderUsers = () => <div className="admin-dashboard"><div className="section-heading"><h3>Manage Users</h3><p>View clients, change roles, and activate or deactivate accounts.</p></div>{renderUserRows(clients)}</div>;
  const renderNutritionists = () => <div className="admin-dashboard"><div className="section-heading"><h3>Manage Nutritionists</h3><p>Nutritionists can create nutrition plans and schedule Zoom consultations.</p></div>{renderUserRows(nutritionists)}</div>;

  const renderSubscriptions = () => (
    <div className="admin-dashboard">
      <div className="section-heading"><h3>Manage Plans, Pricing, And Payments</h3><p>Edit public packages and update simulated subscription/payment statuses.</p></div>
      <div className="subscription-grid admin-plan-grid">
        {subscriptionPlans.map((plan) => (
          <div key={plan.id} className="subscription-card">
            {editingPlanId === plan.id ? (
              <div className="admin-plan-editor">
                <input value={planDraft.name || ""} onChange={(event) => setPlanDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <textarea rows="4" value={planDraft.description || ""} onChange={(event) => setPlanDraft((prev) => ({ ...prev, description: event.target.value }))} />
                <input type="number" value={planDraft.price || ""} onChange={(event) => setPlanDraft((prev) => ({ ...prev, price: event.target.value }))} />
                <input type="number" value={planDraft.duration_days || ""} onChange={(event) => setPlanDraft((prev) => ({ ...prev, duration_days: event.target.value }))} />
                <input type="number" value={planDraft.consultation_count || ""} onChange={(event) => setPlanDraft((prev) => ({ ...prev, consultation_count: event.target.value }))} />
                <label className="admin-check"><input type="checkbox" checked={Boolean(planDraft.includes_followup)} onChange={(event) => setPlanDraft((prev) => ({ ...prev, includes_followup: event.target.checked }))} /> Follow-up included</label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(planDraft.is_active)} onChange={(event) => setPlanDraft((prev) => ({ ...prev, is_active: event.target.checked }))} /> Active on website</label>
                <div className="admin-actions"><button type="button" className="complete-btn" onClick={() => savePlan(plan.id)}>Save</button><button type="button" className="danger-btn" onClick={() => setEditingPlanId(null)}>Cancel</button></div>
              </div>
            ) : (
              <><div className="subscription-card-top"><div><p className="subscription-tier">{plan.code}</p><h2>{plan.name}</h2></div><span className="subscription-price">{plan.price}</span></div><p className="subscription-description">{plan.description}</p><div className="subscription-meta"><span>{plan.duration_days} days</span><span>{plan.consultation_count} consultations</span><span>{plan.includes_followup ? "Follow-up" : "No follow-up"}</span><span>{plan.is_active ? "Active" : "Hidden"}</span></div><button type="button" className="assign-btn" onClick={() => startEditingPlan(plan)}>Edit Plan</button></>
            )}
          </div>
        ))}
      </div>
      <div className="section-heading admin-subheading"><h3>Client Subscriptions</h3><p>Payment is simulated, so the admin can manually update status for the demo.</p></div>
      <div className="admin-table-card">
        {subscriptions.length === 0 ? <p className="empty-state">No client subscriptions yet.</p> : subscriptions.map((subscription) => (
          <div key={subscription.id} className="admin-row admin-row-wide">
            <div><strong>{subscription.client_name}</strong><span>{subscription.client_email} - {subscription.subscription_plan_name}</span><small>{subscription.start_date || "No start date"} to {subscription.end_date || "No end date"}</small></div>
            <div className="admin-actions">
              <select value={subscription.status} onChange={(event) => updateSubscription(subscription.id, { status: event.target.value })}><option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select>
              <select value={subscription.payment_status} onChange={(event) => updateSubscription(subscription.id, { payment_status: event.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContentManagement = () => (
    <div className="admin-dashboard">
      <div className="section-heading"><h3>Manage Blog / Nutrition News</h3><p>Create simple educational content, recipes, lifestyle tips, or announcements.</p></div>
      <form className="plan-editor" onSubmit={saveBlogPost}>
        <input placeholder="Post title" value={blogDraft.title} onChange={(event) => setBlogDraft((prev) => ({ ...prev, title: event.target.value }))} required />
        <select value={blogDraft.category} onChange={(event) => setBlogDraft((prev) => ({ ...prev, category: event.target.value }))}><option value="nutrition">Nutrition</option><option value="recipe">Recipe</option><option value="lifestyle">Lifestyle</option><option value="announcement">Announcement</option></select>
        <textarea rows="2" placeholder="Short summary" value={blogDraft.summary} onChange={(event) => setBlogDraft((prev) => ({ ...prev, summary: event.target.value }))} />
        <textarea rows="5" placeholder="Post content" value={blogDraft.content} onChange={(event) => setBlogDraft((prev) => ({ ...prev, content: event.target.value }))} required />
        <input type="file" accept="image/*" onChange={(event) => setBlogDraft((prev) => ({ ...prev, image: event.target.files?.[0] || null }))} />
        <label className="admin-check"><input type="checkbox" checked={blogDraft.is_published} onChange={(event) => setBlogDraft((prev) => ({ ...prev, is_published: event.target.checked }))} /> Published on public blog page</label>
        <div className="admin-actions"><button className="assign-btn" type="submit">{editingPostId ? "Update Post" : "Create Post"}</button>{editingPostId && <button type="button" className="danger-btn" onClick={resetBlogDraft}>Cancel Edit</button>}</div>
      </form>
      <div className="admin-table-card">
        {blogPosts.length === 0 ? <p className="empty-state">No posts yet.</p> : blogPosts.map((post) => (
          <div key={post.id} className="admin-row admin-row-wide">
            <div>{post.image_url && <img src={post.image_url} alt={post.title} className="admin-post-thumb" />}<strong>{post.title}</strong><span>{post.category} - {post.is_published ? "Published" : "Draft"}</span><small>{post.author_name}</small></div>
            <div className="admin-actions">{post.author_role !== "nutritionist" && <button type="button" className="complete-btn" onClick={() => startEditingPost(post)}>Edit</button>}<button type="button" className="danger-btn" onClick={() => api.delete(`blog-posts/${post.id}/`).then(fetchAdminData)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActivity = () => <div className="admin-dashboard"><div className="section-heading"><h3>Platform Activity</h3><p>Recent consultations and nutrition plans.</p></div><div className="dashboard-summary-grid"><div className="summary-card"><h3>Recent Consultations</h3><div className="admin-mini-list">{(summary?.recent_consultations || []).map((consultation) => <div key={consultation.id}><strong>{consultation.client_name}</strong><span>{consultation.status} - {formatDate(consultation.scheduled_at)}</span></div>)}</div></div><div className="summary-card"><h3>Recent Nutrition Plans</h3><div className="admin-mini-list">{(summary?.recent_nutrition_plans || []).map((plan) => <div key={plan.id}><strong>{plan.title}</strong><span>{plan.assigned_to_name || plan.assigned_to_email}</span></div>)}</div></div></div></div>;

  const renderInquiries = () => (
    <div className="admin-dashboard">
      <div className="section-heading"><h3>Handle User Inquiries</h3><p>Messages sent through the Contact Admin page appear here.</p></div>
      <div className="admin-filter-row"><button className={inquiryFilter === "open" ? "complete-btn" : "assign-btn"} onClick={() => setInquiryFilter("open")}>Open</button><button className={inquiryFilter === "handled" ? "complete-btn" : "assign-btn"} onClick={() => setInquiryFilter("handled")}>Handled</button><button className={inquiryFilter === "all" ? "complete-btn" : "assign-btn"} onClick={() => setInquiryFilter("all")}>All</button></div>
      <div className="admin-table-card">
        {filteredInquiries.length === 0 ? <p className="empty-state">No inquiries in this filter.</p> : filteredInquiries.map((inquiry) => (
          <div key={inquiry.id} className="admin-row admin-row-wide inquiry-row"><div><strong>{inquiry.subject}</strong><span>{inquiry.full_name} - {inquiry.email}</span><small>{formatDate(inquiry.created_at)}</small><p>{inquiry.message}</p></div><div className="admin-actions"><span className="user-plan-badge">{inquiry.status}</span>{inquiry.status === "open" && <button type="button" className="complete-btn" onClick={() => markInquiryHandled(inquiry.id)}>Mark Handled</button>}</div></div>
        ))}
      </div>
    </div>
  );

  const renderSystem = () => <div className="admin-dashboard"><div className="section-heading"><h3>System And Security</h3><p>High-level system notes for the project demo.</p></div><div className="dashboard-summary-grid"><div className="summary-card"><h3>Security</h3><p>Admin access uses Django staff/superuser permissions.</p></div><div className="summary-card"><h3>Payments</h3><p>Payment is simulated in this MVP. The admin manually updates payment state.</p></div><div className="summary-card"><h3>Content</h3><p>Blog/news posts are now managed from this dashboard.</p></div><div className="summary-card"><h3>Inquiries</h3><p>Contact Admin messages can be marked handled.</p></div></div></div>;

  const renderContent = () => {
    if (loading) return <p>Loading admin dashboard...</p>;
    if (!summary) return <p className="empty-state">Admin dashboard data is not available.</p>;
    switch (activeSection) {
      case "overview": return renderOverview();
      case "users": return renderUsers();
      case "nutritionists": return renderNutritionists();
      case "subscriptions": return renderSubscriptions();
      case "content": return renderContentManagement();
      case "activity": return renderActivity();
      case "inquiries": return renderInquiries();
      case "system": return renderSystem();
      default: return renderOverview();
    }
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}><ul><li className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")}>Overview</li><li className={activeSection === "users" ? "active" : ""} onClick={() => setActiveSection("users")}>Users</li><li className={activeSection === "nutritionists" ? "active" : ""} onClick={() => setActiveSection("nutritionists")}>Nutritionists</li><li className={activeSection === "subscriptions" ? "active" : ""} onClick={() => setActiveSection("subscriptions")}>Plans & Payment</li><li className={activeSection === "content" ? "active" : ""} onClick={() => setActiveSection("content")}>Content</li><li className={activeSection === "activity" ? "active" : ""} onClick={() => setActiveSection("activity")}>Activity</li><li className={activeSection === "inquiries" ? "active" : ""} onClick={() => setActiveSection("inquiries")}>Inquiries</li><li className={activeSection === "system" ? "active" : ""} onClick={() => setActiveSection("system")}>System</li><li onClick={handleLogout} style={{ color: "#e57373", marginTop: "auto" }}>Logout</li></ul></aside>
      <div className="dashboard-main"><header className="dashboard-header"><button className="menu-btn" onClick={() => setSidebarOpen((prev) => !prev)} aria-label="Open menu"><span></span><span></span><span></span></button><div className="dashboard-header-copy"><span className="dashboard-header-kicker">Administrator control center</span><h2>Admin Dashboard</h2></div></header><section className={`dashboard-content section-${activeSection}`}>{renderContent()}</section></div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default AdminDashboard;







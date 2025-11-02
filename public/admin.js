const userDisplay = document.getElementById("user-display");
const logoutButton = document.getElementById("logout-button");
const refreshButton = document.getElementById("refresh-dashboard");
const loadingState = document.getElementById("loading");
const errorState = document.getElementById("error");
const dashboardContent = document.getElementById("dashboard-content");
let refreshInterval;

const redirectForRole = (role) => {
  switch (role) {
    case "advisor":
      window.location.href = "/advisor.html";
      break;
    case "client":
      window.location.href = "/client.html";
      break;
    default:
      window.location.href = "/index.html";
      break;
  }
};

const ensureAuthenticated = async () => {
  try {
    const response = await fetch("/api/auth/session", { credentials: "include" });
    if (!response.ok) {
      throw new Error("AUTH_REQUIRED");
    }

    const { user } = await response.json();
    if (!user?.role) {
      throw new Error("NO_ROLE");
    }

    if (user.role !== "admin") {
      redirectForRole(user.role);
      return null;
    }

    const label = user.name || user.username || "Admin";
    if (userDisplay) {
      userDisplay.textContent = `${label} · Admin`;
    }
    return user;
  } catch (error) {
    throw error;
  }
};

logoutButton?.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } finally {
    window.location.href = "/index.html";
  }
});

const fetchJson = async (path) => {
  const response = await fetch(`/api/dashboard/${path}`, { credentials: "include" });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request to ${path} failed`);
  }
  return response.json();
};

const fetchDashboardData = async () => {
  const [health, metrics, sessions, cache, alerts, system] = await Promise.all([
    fetchJson("health"),
    fetchJson("performance"),
    fetchJson("sessions"),
    fetchJson("cache"),
    fetchJson("alerts"),
    fetchJson("system")
  ]);

  return { health, metrics, sessions, cache, alerts, system };
};

const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const renderHealthStatus = (health) => {
  const statusClass = health.status === "healthy"
    ? "status-healthy"
    : health.status === "warning"
      ? "status-warning"
      : "status-critical";

  return `
    <div class="metric">
      <span class="metric-label">
        <span class="status-indicator ${statusClass}"></span>
        Overall Status
      </span>
      <span class="metric-value">${health.status.toUpperCase()}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Uptime</span>
      <span class="metric-value">${formatUptime(health.uptime)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Total Requests</span>
      <span class="metric-value">${health.summary.totalRequests}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Error Rate</span>
      <span class="metric-value">${health.summary.errorRate}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Avg Response Time</span>
      <span class="metric-value">${health.summary.averageResponseTime}</span>
    </div>
  `;
};

const renderPerformanceMetrics = (metrics) => `
  <div class="metric">
    <span class="metric-label">Successful Requests</span>
    <span class="metric-value">${metrics.requests.successful}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Failed Requests</span>
    <span class="metric-value">${metrics.requests.failed}</span>
  </div>
  <div class="metric">
    <span class="metric-label">OpenAI Requests</span>
    <span class="metric-value">${metrics.openai.requests}</span>
  </div>
  <div class="metric">
    <span class="metric-label">OpenAI Cache Rate</span>
    <span class="metric-value">${metrics.openai.cacheRate}%</span>
  </div>
  <div class="metric">
    <span class="metric-label">Database Operations</span>
    <span class="metric-value">${metrics.database.reads + metrics.database.writes}</span>
  </div>
`;

const renderSessionStats = (sessions) => `
  <div class="metric">
    <span class="metric-label">Total Sessions</span>
    <span class="metric-value">${sessions.overview.total}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Active Sessions</span>
    <span class="metric-value">${sessions.overview.active}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Completed Sessions</span>
    <span class="metric-value">${sessions.overview.completed}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Completion Rate</span>
    <span class="metric-value">${sessions.trends.completionRate}%</span>
  </div>
  <div class="metric">
    <span class="metric-label">Avg Duration</span>
    <span class="metric-value">${sessions.overview.averageDuration} min</span>
  </div>
`;

const renderCacheStats = (cache) => `
  <div class="metric">
    <span class="metric-label">Session Cache Hit Rate</span>
    <span class="metric-value">${cache.performance.hitRates.session}</span>
  </div>
  <div class="metric">
    <span class="metric-label">OpenAI Cache Hit Rate</span>
    <span class="metric-value">${cache.performance.hitRates.openAi}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Query Cache Hit Rate</span>
    <span class="metric-value">${cache.performance.hitRates.query}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Memory Usage</span>
    <span class="metric-value">${cache.memory.estimatedMB} MB</span>
  </div>
  <div class="metric">
    <span class="metric-label">Evictions</span>
    <span class="metric-value">${cache.performance.evictions}</span>
  </div>
`;

const renderAlerts = (alerts) => {
  if (alerts.alerts.length === 0) {
    return '<p style="text-align: center; color: #666; padding: 2rem;">No active alerts</p>';
  }

  return alerts.alerts
    .map((alert) => {
      const alertClass =
        alert.severity === "critical"
          ? "alert"
          : alert.severity === "warning"
          ? "alert warning"
          : "alert info";

      return `
        <div class="${alertClass}">
          <div class="alert-title">${alert.type.replace(/_/g, ' ').toUpperCase()}</div>
          <div class="alert-message">${alert.message}</div>
          <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
        </div>
      `;
    })
    .join("");
};

const renderSystemResources = (system) => `
  <div class="metric">
    <span class="metric-label">Memory Usage</span>
    <span class="metric-value">${system.resources.memory.heapUsed} MB</span>
  </div>
  <div class="metric">
    <span class="metric-label">Memory Total</span>
    <span class="metric-value">${system.resources.memory.heapTotal} MB</span>
  </div>
  <div class="metric">
    <span class="metric-label">Active Connections</span>
    <span class="metric-value">${system.connections.active}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Peak Connections</span>
    <span class="metric-value">${system.connections.peak}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Node Version</span>
    <span class="metric-value">${system.environment.nodeVersion}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Platform</span>
    <span class="metric-value">${system.environment.platform}</span>
  </div>
`;

const refreshDashboard = async () => {
  if (loadingState) loadingState.style.display = "block";
  if (errorState) errorState.style.display = "none";
  if (dashboardContent) dashboardContent.style.display = "none";

  try {
    const data = await fetchDashboardData();
    document.getElementById("health-status").innerHTML = renderHealthStatus(data.health);
    document.getElementById("performance-metrics").innerHTML = renderPerformanceMetrics(data.metrics);
    document.getElementById("session-stats").innerHTML = renderSessionStats(data.sessions);
    document.getElementById("cache-stats").innerHTML = renderCacheStats(data.cache);
    document.getElementById("alerts-content").innerHTML = renderAlerts(data.alerts);
    document.getElementById("system-content").innerHTML = renderSystemResources(data.system);

    if (loadingState) loadingState.style.display = "none";
    if (dashboardContent) dashboardContent.style.display = "block";
  } catch (error) {
    if (loadingState) loadingState.style.display = "none";
    if (errorState) {
      errorState.style.display = "block";
      errorState.textContent = error.message;
    }
  }
};

const handleTabClick = (event) => {
  const tabName = event.currentTarget.dataset.tab;
  document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));

  document.getElementById(`${tabName}-tab`).classList.add("active");
  event.currentTarget.classList.add("active");
};

const initialiseDashboard = () => {
  refreshButton?.addEventListener("click", () => refreshDashboard());
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", handleTabClick);
  });

  refreshDashboard();
  refreshInterval = setInterval(refreshDashboard, 30000);
};

const bootstrap = async () => {
  const user = await ensureAuthenticated();
  if (!user) {
    return;
  }
  initialiseDashboard();
};

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch(() => {
    window.location.href = "/index.html";
  });
});

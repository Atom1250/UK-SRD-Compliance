const form = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");
const submitButton = form?.querySelector("button[type='submit']");
const usernameInput = document.getElementById("login-username");

const redirectForRole = (role) => {
  switch (role) {
    case "admin":
      window.location.href = "/admin.html";
      break;
    case "advisor":
      window.location.href = "/advisor.html";
      break;
    case "client":
    default:
      window.location.href = "/client.html";
      break;
  }
};

const getActiveSession = async () => {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include"
    });
    if (!response.ok) {
      return null;
    }
    const { user } = await response.json();
    return user || null;
  } catch (error) {
    return null;
  }
};

const setError = (message = "") => {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const username = usernameInput?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!username || !password) {
    setError("Please provide both your email and password.");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Signing in…";
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload.error || "Unable to sign in with those details.";
      setError(message);
      return;
    }

    const { user } = await response.json();
    if (!user?.role) {
      setError("Your account is missing a role assignment.");
      return;
    }

    redirectForRole(user.role);
  } catch (error) {
    setError("We couldn’t reach the server. Please try again.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Sign in";
    }
  }
});

// Auto-redirect if the user already has an active session
(async () => {
  const user = await getActiveSession();
  if (user?.role) {
    redirectForRole(user.role);
  } else {
    usernameInput?.focus();
  }
})();

const messagesList = document.getElementById("messages");
const stageLabel = document.getElementById("stage");
const sessionIdLabel = document.getElementById("session-id");
const sessionDataBlock = document.getElementById("session-data");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("message-input");
const errorBanner = document.getElementById("error");
const sendButton = document.getElementById("send-button");
const reportSection = document.getElementById("report-section");
const reportPreview = document.getElementById("report-preview");
const reportDownload = document.getElementById("report-download");


const addMessage = (author, text) => {
  const item = document.createElement("li");
  item.dataset.author = author;

  const label = document.createElement("small");
  label.textContent = author === "client" ? "You" : "Assistant";

  const body = document.createElement("span");
  body.textContent = text;

  item.appendChild(label);
  item.appendChild(body);
  messagesList.appendChild(item);
  item.scrollIntoView({ behavior: "smooth", block: "end" });
};

const setStage = (stage) => {
  stageLabel.textContent = stage ?? "—";
};

const setSessionId = (sessionId) => {
  sessionIdLabel.textContent = sessionId ?? "—";
};

const updateReport = (session) => {
  const report = session?.data?.report;
  if (report?.preview) {
    reportPreview.textContent = report.preview;
    const downloadUrl = report.doc_url ?? `/api/sessions/${session.id}/report.pdf`;
    reportDownload.href = downloadUrl;
    reportSection.hidden = false;
  } else {
    reportPreview.textContent = "";
    reportDownload.removeAttribute("href");
    reportSection.hidden = true;
  }
};

const setSessionData = (session) => {
  if (!session) return;
  sessionDataBlock.textContent = JSON.stringify(session.data, null, 2);
  setStage(session.stage);
  updateReport(session);
};

const showError = (message) => {
  errorBanner.textContent = message;
  errorBanner.hidden = !message;
};

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = payload.error || response.statusText || "Request failed";
    throw new Error(error);
  }

  return response.json();
};

let currentSessionId = null;

const bootstrap = async () => {
  try {
    const data = await api("/sessions", { method: "POST" });
    currentSessionId = data.session.id;
    setSessionId(currentSessionId);
    setSessionData(data.session);
    data.messages.forEach((message) => addMessage("assistant", message));
  } catch (error) {
    showError(error.message);
    sendButton.disabled = true;
  }
};

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  if (!currentSessionId) {
    showError("Session not ready yet. Please refresh the page.");
    return;
  }

  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  addMessage("client", text);
  messageInput.value = "";
  messageInput.focus();
  sendButton.disabled = true;

  try {
    const eventResponse = await api(`/sessions/${currentSessionId}/events`, {
      method: "POST",
      body: {
        author: "client",
        type: "message",
        content: { text }
      }
    });

    setSessionData(eventResponse.session);
    (eventResponse.messages ?? []).forEach((message) =>

      addMessage("assistant", message)
    );
  } catch (error) {
    showError(error.message);
  } finally {
    sendButton.disabled = false;
  }
});

bootstrap();

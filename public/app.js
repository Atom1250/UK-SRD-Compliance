const messagesList = document.getElementById("messages");
const promptText = document.getElementById("current-prompt");
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
const stageFormContainer = document.getElementById("stage-form");
const educationPackToggle = document.getElementById("view-education-pack");
const educationPackSection = document.getElementById("education-pack");
const educationPackClose = document.getElementById("close-education-pack");
const educationPackReturn = document.getElementById("return-to-questionnaire");

const bodyElement = document.body;

const CLIENT_TYPES = ["individual", "joint", "trust", "company"];
const RISK_SCALE = [1, 2, 3, 4, 5, 6, 7];
const CAPACITY_FOR_LOSS = ["low", "medium", "high"];
const OBJECTIVE_OPTIONS = ["growth", "income", "preservation", "impact", "other"];
const PATHWAY_OPTIONS = [
  "Conventional",
  "Conventional incl. ESG",
  "Sustainability: Improvers",
  "Sustainability: Focus",
  "Sustainability: Impact",
  "Sustainability: Mixed Goals",
  "Ethical",
  "Philanthropy"
];
const REPORTING_FREQUENCY_OPTIONS = [
  "none",
  "quarterly",
  "semiannual",
  "annual"
];

const setActivePrompt = (text) => {
  if (!promptText) return;
  const trimmed = String(text ?? "").trim();
  promptText.textContent = trimmed || "Waiting for the assistant…";
};

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

  if (typeof messagesList.scrollTo === "function") {
    messagesList.scrollTo({
      top: messagesList.scrollHeight,
      behavior: "smooth"
    });
  } else {
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  if (author === "assistant") {
    setActivePrompt(text);
  }
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
let currentSession = null;
let educationPackAutoOpened = false;

const openEducationPack = () => {
  if (!educationPackSection) return;
  educationPackSection.hidden = false;
  if (bodyElement) {
    bodyElement.classList.add("education-pack-open");
  }
  if (educationPackToggle) {
    educationPackToggle.setAttribute("aria-expanded", "true");
  }
  const focusTarget = educationPackSection.querySelector(".education-pack__close") ?? educationPackSection;
  focusTarget.focus();
};

const closeEducationPack = () => {
  if (!educationPackSection) return;
  const wasOpen = educationPackSection.hidden === false;
  educationPackSection.hidden = true;
  if (bodyElement) {
    bodyElement.classList.remove("education-pack-open");
  }
  if (wasOpen && educationPackToggle) {
    educationPackToggle.setAttribute("aria-expanded", "false");
    if (!educationPackToggle.hidden) {
      educationPackToggle.focus();
    } else if (messageInput) {
      messageInput.focus();
    }
  } else if (wasOpen && messageInput) {
    messageInput.focus();
  }
};

const updateEducationPackAvailability = (session) => {
  const delivered =
    session?.stage === "SEGMENT_D_EDUCATION" ||
    session?.data?.sustainability_preferences?.educ_pack_sent === true;

  if (educationPackToggle) {
    educationPackToggle.hidden = !delivered;
    if (delivered) {
      const label =
        session?.stage === "SEGMENT_D_EDUCATION"
          ? "Open ESG education pack"
          : "Review ESG education pack";
      educationPackToggle.textContent = label;
    } else {
      educationPackToggle.setAttribute("aria-expanded", "false");
    }
  }

  if (!delivered) {
    educationPackAutoOpened = false;
    closeEducationPack();
    return;
  }

  if (session?.stage === "SEGMENT_D_EDUCATION" && !educationPackAutoOpened) {
    openEducationPack();
    educationPackAutoOpened = true;
  }
};

educationPackToggle?.addEventListener("click", openEducationPack);
educationPackClose?.addEventListener("click", closeEducationPack);
educationPackReturn?.addEventListener("click", closeEducationPack);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && bodyElement?.classList.contains("education-pack-open")) {
    event.preventDefault();
    closeEducationPack();
  }
});

const parseNumberField = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const numeric = Number.parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const parseList = (value) =>
  String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseExclusionsInput = (value) =>
  String(value ?? "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sectorPart, thresholdPart] = line.split(/[:|-]/, 2);
      const sector = (sectorPart ?? "").trim();
      const threshold = thresholdPart ? parseNumberField(thresholdPart) : null;
      return { sector, threshold };
    });

const formatText = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
};

const formatNumber = (value, { suffix = "", fallback = "—" } = {}) => {
  if (value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}${suffix}` : fallback;
};

const formatListDisplay = (value, fallback = "—") => {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }
  return value.join(", ");
};

const formatBooleanDisplay = (value, fallback = "—") => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return fallback;
};

const formatExclusionDisplay = (exclusions = []) => {
  if (!Array.isArray(exclusions) || exclusions.length === 0) {
    return "None";
  }

  return exclusions
    .map((item) => {
      if (!item) return "";
      const sector = formatText(item.sector ?? "", "");
      if (!sector) return "";
      if (item.threshold === null || item.threshold === undefined) {
        return sector;
      }
      return `${sector} (<${item.threshold}%)`;
    })
    .filter(Boolean)
    .join(", ");
};

const createSummarySection = (title, rows) => {
  const section = document.createElement("div");
  section.className = "confirmation-summary__section";

  const heading = document.createElement("p");
  heading.className = "confirmation-summary__title";
  heading.textContent = title;
  section.appendChild(heading);

  rows
    .filter((row) => row && row.label)
    .forEach((row) => {
      const item = document.createElement("p");
      item.className = "confirmation-summary__item";
      item.textContent = `${row.label}: ${formatText(row.value)}`;
      section.appendChild(item);
    });

  return section;
};

const buildConfirmationSummary = (session) => {
  const container = document.createElement("div");
  container.className = "confirmation-summary";

  const profile = session.data?.client_profile ?? {};
  const knowledge = profile.knowledge_experience ?? {};
  const knowledgeParts = [
    formatText(knowledge.summary, ""),
    formatListDisplay(knowledge.instruments, ""),
    formatText(knowledge.frequency, ""),
    formatText(knowledge.duration, "")
  ].filter(Boolean);

  const horizonDisplay = formatNumber(profile.horizon_years);
  const riskDisplay = formatNumber(profile.risk_tolerance);

  const consent = session.data?.consent ?? {};
  const futureContact = consent.future_contact ?? {};

  const prefs = session.data?.sustainability_preferences ?? {};

  const adviceOutcome = session.data?.advice_outcome ?? {};

  container.append(
    createSummarySection("Client profile", [
      { label: "Client type", value: profile.client_type },
      { label: "Objective", value: profile.objectives },
      {
        label: "Time horizon",
        value: horizonDisplay === "—" ? "—" : `${horizonDisplay} years`
      },
      {
        label: "Risk tolerance",
        value: riskDisplay === "—" ? "—" : `${riskDisplay} / 7`
      },
      { label: "Capacity for loss", value: profile.capacity_for_loss },
      { label: "Liquidity needs", value: profile.liquidity_needs },
      {
        label: "Knowledge & experience",
        value: knowledgeParts.length > 0 ? knowledgeParts.join(" • ") : "—"
      }
    ]),
    createSummarySection("Consent & audit", [
      {
        label: "Data processing",
        value: formatBooleanDisplay(consent.data_processing?.granted)
      },
      {
        label: "E-delivery",
        value: formatBooleanDisplay(consent.e_delivery?.granted)
      },
      {
        label: "Future contact",
        value: formatBooleanDisplay(futureContact.granted)
      },
      {
        label: "Purpose",
        value:
          futureContact.granted === true
            ? futureContact.purpose || "—"
            : "Not applicable"
      }
    ]),
    createSummarySection("Sustainability preferences", [
      { label: "Preference level", value: prefs.preference_level },
      {
        label: "Labels of interest",
        value: formatListDisplay(prefs.labels_interest, "None")
      },
      { label: "Themes", value: formatListDisplay(prefs.themes, "None") },
      {
        label: "Exclusions",
        value: formatExclusionDisplay(prefs.exclusions)
      },
      {
        label: "Impact goals",
        value: formatListDisplay(prefs.impact_goals, "None")
      },
      {
        label: "Engagement importance",
        value: prefs.engagement_importance || "—"
      },
      {
        label: "Reporting preference",
        value: prefs.reporting_frequency_pref || "—"
      },
      {
        label: "Trade-off tolerance",
        value: prefs.tradeoff_tolerance || "—"
      }
    ]),
    createSummarySection("Advice outcome", [
      { label: "Recommendation", value: adviceOutcome.recommendation || "—" },
      { label: "Rationale", value: adviceOutcome.rationale || "—" },
      { label: "Sustainability fit", value: adviceOutcome.sust_fit || "—" },
      { label: "Costs & charges", value: adviceOutcome.costs_summary || "—" }
    ])
  );

  return container;
};

const submitStructuredEvent = async (content, stageData) => {
  if (!currentSessionId) {
    throw new Error("Session not ready yet. Please refresh the page.");
  }

  const body = {
    author: "client",
    type: "data_update",
    content
  };

  if (stageData && Object.keys(stageData).length > 0) {
    body.stageData = stageData;
  }

  const response = await api(`/sessions/${currentSessionId}/events`, {
    method: "POST",
    body
  });

  setSessionData(response.session);
  (response.messages ?? []).forEach((message) => addMessage("assistant", message));
};

const createStructuredSubmitHandler = (form, payloadFactory) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");

    if (!form.reportValidity()) {
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
      const { content, stageData } = payloadFactory();
      await submitStructuredEvent(content, stageData);
    } catch (error) {
      showError(error.message);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
};

const buildExplanationForm = () => {
  const form = document.createElement("form");
  const hint = document.createElement("p");
  hint.className = "structured__hint";
  hint.textContent = "Ready to begin the onboarding sequence? Let me know when to start.";
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Begin onboarding";
  form.append(hint, button);

  createStructuredSubmitHandler(form, () => ({
    content: { ready: true }
  }));

  return form;
};

const buildOnboardingForm = (session) => {
  const profile = session.data?.client_profile ?? {};
  const financial = profile.financial_situation ?? {};

  const form = document.createElement("form");
  form.innerHTML = `
    <fieldset>
      <legend>Suitability profile</legend>
      <label>
        Client type
        <select name="client_type" required>
          <option value="">Select…</option>
          ${CLIENT_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}
        </select>
      </label>
      <label>
        Main investment goal
        <input name="objectives" list="objective-options" placeholder="e.g. growth" required />
        <datalist id="objective-options">
          ${OBJECTIVE_OPTIONS.map((option) => `<option value="${option}"></option>`).join("")}
        </datalist>
      </label>
      <label>
        Investment horizon (years)
        <input name="horizon_years" type="number" min="1" step="1" required />
      </label>
      <label>
        Risk tolerance (1–7)
        <select name="risk_tolerance" required>
          <option value="">Select…</option>
          ${RISK_SCALE.map((risk) => `<option value="${risk}">${risk}</option>`).join("")}
        </select>
      </label>
      <label>
        Capacity for loss
        <select name="capacity_for_loss" required>
          <option value="">Select…</option>
          ${CAPACITY_FOR_LOSS.map((value) => `<option value="${value}">${value}</option>`).join("")}
        </select>
      </label>
      <label>
        Liquidity needs
        <textarea name="liquidity_needs" placeholder="Describe any planned withdrawals" required></textarea>
      </label>
    </fieldset>

    <fieldset>
      <legend>Knowledge & experience</legend>
      <label>
        Summary
        <textarea name="knowledge_summary" placeholder="Describe experience, instruments, and tenure" required></textarea>
      </label>
    </fieldset>

    <fieldset>
      <legend>Financial context (optional)</legend>
      <label>
        <input type="checkbox" name="financial_provided" />
        Capture income, assets, and liabilities
      </label>
      <div class="structured__exclusions" id="financial-details" hidden>
        <label>
          Income (numeric)
          <input name="financial_income" inputmode="decimal" placeholder="e.g. 65000" />
        </label>
        <label>
          Assets (numeric)
          <input name="financial_assets" inputmode="decimal" placeholder="e.g. 250000" />
        </label>
        <label>
          Liabilities (numeric)
          <input name="financial_liabilities" inputmode="decimal" placeholder="e.g. 40000" />
        </label>
        <label>
          Notes
          <textarea name="financial_notes" placeholder="Income £65k, Assets £250k, Liabilities £40k" ></textarea>
        </label>
      </div>
    </fieldset>

    <label id="risk-override" hidden>
      <span>Confirm high risk tolerance despite low capacity for loss</span>
      <input type="checkbox" name="confirm_override" />
    </label>
    <p class="structured__hint" id="risk-override-hint" hidden>
      A confirmation is required when risk tolerance is 5 or higher and capacity for loss is low.
    </p>

    <button type="submit">Save suitability answers</button>
  `;

  const clientType = form.elements.client_type;
  const objectives = form.elements.objectives;
  const horizon = form.elements.horizon_years;
  const risk = form.elements.risk_tolerance;
  const capacity = form.elements.capacity_for_loss;
  const liquidity = form.elements.liquidity_needs;
  const knowledgeSummary = form.elements.knowledge_summary;
  const financialToggle = form.elements.financial_provided;
  const financialContainer = form.querySelector("#financial-details");
  const financialIncome = form.elements.financial_income;
  const financialAssets = form.elements.financial_assets;
  const financialLiabilities = form.elements.financial_liabilities;
  const financialNotes = form.elements.financial_notes;
  const riskOverride = form.querySelector("#risk-override");
  const riskOverrideCheckbox = form.elements.confirm_override;
  const riskOverrideHint = form.querySelector("#risk-override-hint");

  clientType.value = profile.client_type ?? "";
  objectives.value = profile.objectives ?? "";
  if (profile.horizon_years) {
    horizon.value = profile.horizon_years;
  }
  if (profile.risk_tolerance) {
    risk.value = profile.risk_tolerance;
  }
  if (profile.capacity_for_loss) {
    capacity.value = profile.capacity_for_loss;
  }
  liquidity.value = profile.liquidity_needs ?? "";
  knowledgeSummary.value = profile.knowledge_experience?.summary ?? "";

  if (financial.provided) {
    financialToggle.checked = true;
    financialContainer.hidden = false;
    financialIncome.value = financial.income ?? "";
    financialAssets.value = financial.assets ?? "";
    financialLiabilities.value = financial.liabilities ?? "";
    financialNotes.value = financial.notes ?? "";
  }

  const updateFinancialVisibility = () => {
    const shown = financialToggle.checked;
    financialContainer.hidden = !shown;
    financialNotes.required = shown;
  };
  financialToggle.addEventListener("change", updateFinancialVisibility);
  updateFinancialVisibility();

  const updateRiskOverride = () => {
    const requiresOverride = Number(risk.value) >= 5 && capacity.value === "low";
    riskOverride.hidden = !requiresOverride;
    riskOverrideHint.hidden = !requiresOverride;
    riskOverrideCheckbox.required = requiresOverride;
    if (!requiresOverride) {
      riskOverrideCheckbox.checked = false;
    }
  };
  risk.addEventListener("change", updateRiskOverride);
  capacity.addEventListener("change", updateRiskOverride);
  updateRiskOverride();

  createStructuredSubmitHandler(form, () => {
    const answers = {
      client_type: clientType.value,
      objectives: objectives.value,
      horizon_years: horizon.value,
      risk_tolerance: risk.value,
      capacity_for_loss: capacity.value,
      liquidity_needs: liquidity.value,
      knowledge_summary: knowledgeSummary.value,
      financial: financialToggle.checked
        ? {
            provided: true,
            income: parseNumberField(financialIncome.value),
            assets: parseNumberField(financialAssets.value),
            liabilities: parseNumberField(financialLiabilities.value),
            notes: financialNotes.value
          }
        : { provided: false }
    };

    const stageData = {
      client_profile: {
        client_type: answers.client_type,
        objectives: answers.objectives,
        horizon_years: Number.parseInt(answers.horizon_years, 10) || null,
        risk_tolerance: Number.parseInt(answers.risk_tolerance, 10) || null,
        capacity_for_loss: answers.capacity_for_loss,
        liquidity_needs: answers.liquidity_needs,
        knowledge_experience: {
          summary: answers.knowledge_summary,
          instruments: parseList(answers.knowledge_summary),
          frequency: "",
          duration: ""
        },
        financial_situation: answers.financial.provided
          ? {
              provided: true,
              income: answers.financial.income,
              assets: answers.financial.assets,
              liabilities: answers.financial.liabilities,
              notes: answers.financial.notes
            }
          : {
              provided: false,
              income: null,
              assets: null,
              liabilities: null,
              notes: ""
            }
      }
    };

    return {
      content: {
        answers,
        confirm_override: riskOverrideCheckbox.checked
      },
      stageData
    };
  });

  return form;
};

const buildConsentForm = (session) => {
  const consent = session.data?.consent ?? {};
  const futureContact = consent.future_contact ?? {};

  const form = document.createElement("form");
  form.innerHTML = `
    <fieldset>
      <legend>Consent preferences</legend>
      <label>
        <input type="checkbox" name="data_processing" required />
        I consent to my data being processed for this advice session.
      </label>
      <label>
        <input type="checkbox" name="e_delivery" />
        I agree to receive documents electronically (e-delivery).
      </label>
      <label>
        Future contact
        <select name="future_contact">
          <option value="no">No, do not contact me with updates</option>
          <option value="yes">Yes, you may contact me</option>
        </select>
      </label>
      <label id="future-purpose" hidden>
        Purpose of future contact
        <input name="future_purpose" placeholder="e.g. annual review" />
      </label>
    </fieldset>
    <button type="submit">Save consent</button>
  `;

  const dataProcessing = form.elements.data_processing;
  const eDelivery = form.elements.e_delivery;
  const futureSelect = form.elements.future_contact;
  const futurePurposeWrap = form.querySelector("#future-purpose");
  const futurePurpose = form.elements.future_purpose;

  dataProcessing.checked = consent.data_processing?.granted ?? false;
  eDelivery.checked = consent.e_delivery?.granted ?? false;
  futureSelect.value = futureContact.granted ? "yes" : "no";
  futurePurpose.value = futureContact.purpose ?? "";

  const updateFuturePurpose = () => {
    const needsPurpose = futureSelect.value === "yes";
    futurePurposeWrap.hidden = !needsPurpose;
    futurePurpose.required = needsPurpose;
  };
  futureSelect.addEventListener("change", updateFuturePurpose);
  updateFuturePurpose();

  createStructuredSubmitHandler(form, () => {
    if (!dataProcessing.checked) {
      throw new Error("Data processing consent must be granted to continue.");
    }

    return {
      content: {
        consent: {
          data_processing: true,
          e_delivery: eDelivery.checked,
          future_contact: {
            granted: futureSelect.value === "yes",
            purpose: futurePurpose.value
          }
        }
      }
    };
  });

  return form;
};

const buildEducationForm = () => {
  const form = document.createElement("form");
  form.innerHTML = `
    <label>
      <input type="checkbox" name="acknowledged" required />
      I’ve reviewed the education pack and understand the key ESG points.
    </label>
    <label>
      <input type="checkbox" name="wants_summary" />
      Send me the Focus vs Improvers summary as part of the recap.
    </label>
    <button type="submit">Continue to sustainability preferences</button>
  `;

  const acknowledged = form.elements.acknowledged;
  const wantsSummary = form.elements.wants_summary;

  createStructuredSubmitHandler(form, () => ({
    content: {
      acknowledged: acknowledged.checked,
      wants_summary: wantsSummary.checked
    }
  }));

  return form;
};

const buildOptionsForm = (session) => {
  const prefs = session.data?.sustainability_preferences ?? {};

  const form = document.createElement("form");
  form.innerHTML = `
    <fieldset>
      <legend>Sustainability preferences</legend>
      <label>
        Preference level
        <select name="preference_level" required>
          <option value="none">None</option>
          <option value="high_level">High level</option>
          <option value="detailed">Detailed</option>
        </select>
      </label>
      <label>
        SDR label interests (Ctrl/Cmd + click to select multiple)
        <select name="labels_interest" multiple size="5">
          ${PATHWAY_OPTIONS.map((option) => `<option value="${option}">${option}</option>`).join("")}
        </select>
      </label>
      <div id="preference-details">
        <label>
          Themes (comma separated)
          <input name="themes" placeholder="e.g. climate, biodiversity" />
        </label>
        <label>
          Exclusions (one per line, e.g. Fossil fuels:5)
          <textarea name="exclusions" placeholder="Sector:Threshold%"></textarea>
        </label>
        <label>
          Impact goals (comma separated)
          <input name="impact_goals" placeholder="e.g. SDG7 clean energy" />
        </label>
        <label>
          Engagement importance
          <textarea name="engagement_importance" placeholder="Describe stewardship expectations"></textarea>
        </label>
        <label>
          Reporting frequency preference
          <select name="reporting_frequency_pref">
            ${REPORTING_FREQUENCY_OPTIONS.map((option) => `<option value="${option}">${option}</option>`).join("")}
          </select>
        </label>
        <label>
          Trade-off tolerance
          <textarea name="tradeoff_tolerance" placeholder="Explain any performance trade-offs"></textarea>
        </label>
      </div>
    </fieldset>
    <button type="submit">Save preferences</button>
  `;

  const levelSelect = form.elements.preference_level;
  const labelsSelect = form.elements.labels_interest;
  const themesInput = form.elements.themes;
  const exclusionsInput = form.elements.exclusions;
  const impactGoalsInput = form.elements.impact_goals;
  const engagementInput = form.elements.engagement_importance;
  const reportingSelect = form.elements.reporting_frequency_pref;
  const tradeoffInput = form.elements.tradeoff_tolerance;
  const preferenceDetails = form.querySelector("#preference-details");

  levelSelect.value = prefs.preference_level ?? "none";
  Array.from(labelsSelect.options).forEach((option) => {
    option.selected = Array.isArray(prefs.labels_interest)
      ? prefs.labels_interest.some((label) => label === option.value)
      : false;
  });
  themesInput.value = Array.isArray(prefs.themes) ? prefs.themes.join(", ") : "";
  exclusionsInput.value = Array.isArray(prefs.exclusions)
    ? prefs.exclusions
        .map((item) =>
          item.threshold != null ? `${item.sector}:${item.threshold}` : item.sector
        )
        .join("\n")
    : "";
  impactGoalsInput.value = Array.isArray(prefs.impact_goals)
    ? prefs.impact_goals.join(", ")
    : "";
  engagementInput.value = prefs.engagement_importance ?? "";
  reportingSelect.value = prefs.reporting_frequency_pref ?? "none";
  tradeoffInput.value = prefs.tradeoff_tolerance ?? "";

  const updateDetailsVisibility = () => {
    const level = levelSelect.value;
    preferenceDetails.hidden = level === "none";
  };
  levelSelect.addEventListener("change", updateDetailsVisibility);
  updateDetailsVisibility();

  createStructuredSubmitHandler(form, () => {
    const level = levelSelect.value;
    const labels = Array.from(labelsSelect.selectedOptions).map((option) => option.value);
    const themes = parseList(themesInput.value);
    const exclusions = parseExclusionsInput(exclusionsInput.value);
    const impactGoals = parseList(impactGoalsInput.value);
    const engagementImportance = engagementInput.value.trim();
    const reportingPref = reportingSelect.value;
    const tradeoffTolerance = tradeoffInput.value.trim();

    return {
      content: {
        preferences: {
          preference_level: level,
          labels_interest: labels,
          themes,
          exclusions,
          impact_goals: impactGoals,
          engagement_importance: engagementImportance,
          reporting_frequency_pref: reportingPref,
          tradeoff_tolerance: tradeoffTolerance
        }
      }
    };
  });

  return form;
};

const buildConfirmationForm = (session) => {
  const form = document.createElement("form");

  const hint = document.createElement("p");
  hint.className = "structured__hint";
  hint.textContent =
    "Review the captured data below. Confirming will prepare your personalised report.";

  const summary = buildConfirmationSummary(session);

  const checkboxLabel = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "confirmed";
  checkbox.required = true;
  checkboxLabel.appendChild(checkbox);
  checkboxLabel.appendChild(
    document.createTextNode(" I confirm the captured summary is accurate.")
  );

  const notesLabel = document.createElement("label");
  notesLabel.textContent = "Notes for the adviser (optional)";
  const notesField = document.createElement("textarea");
  notesField.name = "edits_requested";
  notesField.placeholder = "Add any clarification or edits";
  notesField.rows = 3;
  notesField.value = session.data?.summary_confirmation?.edits_requested ?? "";
  notesLabel.appendChild(notesField);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Confirm and prepare report";

  form.append(hint, summary, checkboxLabel, notesLabel, submitButton);

  const confirmed = form.elements.confirmed;
  const editsRequested = form.elements.edits_requested;

  createStructuredSubmitHandler(form, () => ({
    content: {
      confirmation: {
        confirmed: confirmed.checked,
        edits_requested: editsRequested.value.trim()
      }
    }
  }));

  return form;
};

const stageFormBuilders = {
  SEGMENT_A_EXPLANATION: buildExplanationForm,
  SEGMENT_B_ONBOARDING: buildOnboardingForm,
  SEGMENT_C_CONSENT: buildConsentForm,
  SEGMENT_D_EDUCATION: buildEducationForm,
  SEGMENT_E_OPTIONS: buildOptionsForm,
  SEGMENT_F_CONFIRMATION: buildConfirmationForm
};

const renderStageForm = (session) => {
  if (!stageFormContainer) return;
  stageFormContainer.innerHTML = "";
  const builder = stageFormBuilders[session.stage];
  if (!builder) {
    const note = document.createElement("p");
    note.className = "structured__hint";
    note.textContent = "No structured inputs are required for this stage.";
    stageFormContainer.appendChild(note);
    return;
  }

  try {
    const form = builder(session);
    stageFormContainer.appendChild(form);
  } catch (error) {
    const note = document.createElement("p");
    note.className = "structured__hint";
    note.textContent = `Unable to render form: ${error.message}`;
    stageFormContainer.appendChild(note);
  }
};

const setSessionData = (session) => {
  if (!session) return;
  currentSession = session;
  sessionDataBlock.textContent = JSON.stringify(session.data, null, 2);
  setStage(session.stage);
  updateReport(session);
  renderStageForm(session);
  updateEducationPackAvailability(session);
};

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

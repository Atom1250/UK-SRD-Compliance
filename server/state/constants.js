export const CONVERSATION_STAGES = [
  "SEGMENT_A_EXPLANATION",
  "SEGMENT_B_ONBOARDING",
  "SEGMENT_C_CONSENT",
  "SEGMENT_D_EDUCATION",
  "SEGMENT_E_OPTIONS",
  "SEGMENT_F_CONFIRMATION",
  "SEGMENT_G_REPORT",
  "SEGMENT_H_DELIVERY",
  "SEGMENT_COMPLETE"
];

export const STAGE_PROMPTS = {
  SEGMENT_A_EXPLANATION:
    "Welcome! I’ll guide you through ESG investing and collect the information your adviser needs. I’ll explain plainly and send a summary at the end. When you're ready, let me know and we'll begin.",
  SEGMENT_B_ONBOARDING:
    "Let's capture the core suitability information I need before any recommendation can be made.",
  SEGMENT_C_CONSENT:
    "Now I need to confirm your consent preferences for regulatory reporting.",
  SEGMENT_D_EDUCATION:
    "I'll walk you through the ESG education pack, including SDR labels and anti-greenwashing safeguards.",
  SEGMENT_E_OPTIONS:
    "Tell me about any sustainability options or labels you’re interested in so I can map them to FCA pathways.",
  SEGMENT_F_CONFIRMATION:
    "Please review and confirm the information you've provided.",
  SEGMENT_G_REPORT:
    "I'm preparing your personalised suitability pack based on everything you've shared.",
  SEGMENT_H_DELIVERY:
    "Here is your personalised pack, including your summary, sustainability preferences, label explainer and next steps.",
  SEGMENT_COMPLETE:
    "This session has been completed and archived. Start a new session if you need to make changes."
};

export const CLIENT_TYPES = ["individual", "joint", "trust", "company"];
export const OBJECTIVE_OPTIONS = [
  "growth",
  "income",
  "preservation",
  "impact",
  "other"
];
export const RISK_SCALE = [1, 2, 3, 4, 5, 6, 7];
export const CAPACITY_FOR_LOSS_VALUES = ["low", "medium", "high"];

export const PREFERENCE_LEVELS = ["none", "high_level", "detailed"];
export const REPORTING_FREQUENCY_OPTIONS = [
  "none",
  "quarterly",
  "semiannual",
  "annual"
];

export const PATHWAY_NAMES = [
  "Conventional",
  "Conventional incl. ESG",
  "Sustainability: Improvers",
  "Sustainability: Focus",
  "Sustainability: Impact",
  "Sustainability: Mixed Goals",
  "Ethical",
  "Philanthropy"
];

export const EVENT_AUTHORS = [
  "client",
  "assistant",
  "adviser",
  "system"
];

export const EVENT_TYPES = ["message", "note", "data_update"];

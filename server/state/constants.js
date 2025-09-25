export const CONVERSATION_STAGES = [
  "S0_CONSENT",
  "S1_IDENTITY_PROFILE",
  "S2_EDUCATION",
  "S3_PREFERENCE_CAPTURE",
  "S4_ADVISER_VALIDATION",
  "S5_PREVIEW_APPROVAL",
  "S6_E_SIGNATURE",
  "S7_ARCHIVE"
];

export const STAGE_PROMPTS = {
  S0_CONSENT:
    "Before we begin, please review our privacy disclosure and confirm that we may process your information.",
  S1_IDENTITY_PROFILE:
    "Let's capture your contact details, investment horizon, attitude to risk (ATR), and capacity for loss (CfL).",
  S2_EDUCATION:
    "Here is an overview of each Preference Pathway. Remember that there is no hierarchy between the strategies.",
  S3_PREFERENCE_CAPTURE:
    "Tell me which pathways you would like to pursue and how you would allocate percentages between them.",
  S4_ADVISER_VALIDATION:
    "An adviser will confirm that your selections align with your ATR, CfL, and product wrappers.",
  S5_PREVIEW_APPROVAL:
    "Please review the draft report before we request your signature.",
  S6_E_SIGNATURE:
    "We are preparing the documentation for e-signature.",
  S7_ARCHIVE:
    "All signed documents and transcripts are archived in line with our compliance policy."
};

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

export const ATR_VALUES = ["Cautious", "Balanced", "Adventurous"];
export const CFL_VALUES = ["Low", "Medium", "High"];
export const STEWARDSHIP_OPTIONS = ["fund_manager", "client_questionnaire"];

export const EVENT_AUTHORS = [
  "client",
  "assistant",
  "adviser",
  "system"
];

export const EVENT_TYPES = ["message", "note", "data_update"];

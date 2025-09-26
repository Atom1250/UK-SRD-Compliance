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

export const PATHWAY_ALIASES = {
  "Conventional": [
    "conventional",
    "traditional",
    "core"
  ],
  "Conventional incl. ESG": [
    "conventional esg",
    "conventional including esg",
    "conventional with esg",
    "esg"
  ],
  "Sustainability: Improvers": [
    "improvers",
    "sustainability improvers",
    "transition"
  ],
  "Sustainability: Focus": [
    "focus",
    "sustainability focus",
    "thematic"
  ],
  "Sustainability: Impact": [
    "impact",
    "sustainability impact",
    "impact investing"
  ],
  "Sustainability: Mixed Goals": [
    "mixed goals",
    "mixed",
    "balanced sustainability"
  ],
  "Ethical": [
    "ethical",
    "values",
    "screened"
  ],
  "Philanthropy": [
    "philanthropy",
    "giving",
    "charitable"
  ]
};

export const PATHWAY_DETAILS = {
  "Conventional":
    "Conventional: diversified mainstream investments aiming for long-term growth without specific sustainability screens.",
  "Conventional incl. ESG":
    "Conventional incl. ESG: traditional portfolios that also integrate environmental, social, and governance (ESG) considerations in research and stewardship.",
  "Sustainability: Improvers":
    "Sustainability – Improvers: targets companies on a journey to improve their sustainability practices with active engagement to accelerate progress.",
  "Sustainability: Focus":
    "Sustainability – Focus: concentrates on sustainability themes such as clean energy or water stewardship while staying diversified across assets aligned to those themes.",
  "Sustainability: Impact":
    "Sustainability – Impact: invests in solutions delivering measurable positive outcomes alongside financial returns, often linked to UN SDGs.",
  "Sustainability: Mixed Goals":
    "Sustainability – Mixed Goals: blends Improvers, Focus, and Impact styles to balance thematic ambition with diversification.",
  "Ethical":
    "Ethical: applies positive and negative screens to reflect faith- or values-based preferences, excluding activities you identify.",
  "Philanthropy":
    "Philanthropy: channels capital into charitable or grant-making vehicles where financial return may be secondary to mission delivery."
};

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

// Education Pack (Basic) + Deep-Dives — runtime helpers
// Provides structured metadata, intents, and module content for the
// 2025-11-01 KBS Preference Pathway specification.

export const EDUCATION_PACK_METADATA = {
  id: "esg_sdr_pack_v2_runtime",
  name: "Education Pack (Basic) + Deep-Dives — KBS Preference Pathway",
  version: "2.1",
  published_at: "2025-11-01",
  owner: "KBS Preference Pathway",
  language: "en-GB",
  doc_type: "chatbot_runtime_module",
  recognition: "This pack recognises the KBS Preference Pathway as the source framework.",
  render_policy: {
    hide_internal_sections: true,
    client_sections_only: true
  },
  ui_defaults: {
    buttons_style: "inline",
    show_return_button_on_deep_dives: true,
    return_button_label: "⬅ Return to Education Pack"
  },
  state_model: {
    keys: ["current_section_id", "in_deep_dive", "breadcrumb"]
  },
  disclaimers_client: [
    "Educational only; not personal advice.",
    "Investments can go down as well as up; you may not get back the amount invested.",
    "Sustainability/ESG data and methodologies evolve over time."
  ]
};

// Preserve legacy accessor for downstream modules (PDF generator, etc.)
EDUCATION_PACK_METADATA.disclaimers = EDUCATION_PACK_METADATA.disclaimers_client;

export const MICRO_MODULES = [
  {
    slug: "esg_basics",
    title: "What is ESG?",
    reply:
      "ESG is a lens for assessing environmental, social and governance factors – it doesn’t automatically make a fund sustainable."
  },
  {
    slug: "sdr_labels",
    title: "SDR labels",
    reply:
      "UK SDR labels: Focus, Improvers, Impact, Mixed Goals – four sustainability objectives clients can explore."
  },
  {
    slug: "anti_greenwashing",
    title: "Anti-Greenwashing",
    reply:
      "Claims must be correct, clear, complete and fair; visuals can’t over-imply sustainability."
  },
  {
    slug: "kbs_choices",
    title: "KBS investment choices",
    reply:
      "Conventional, Conventional + ESG, Sustainability pathways, Ethical and Philanthropy can be combined per product."
  },
  {
    slug: "cobs_9a",
    title: "Suitability duties",
    reply:
      "Advisers gather knowledge, experience, financial position and objectives before giving personalised advice."
  }
];

export const EDUCATION_INTENTS = [
  {
    intent: "help_overview",
    utterances: ["help", "menu", "what can you do", "show topics"],
    reply_short:
      "I can walk you through ESG, UK SDR labels, anti-greenwashing, your KBS Preference Pathway options, and how advisers translate preferences into suitable advice. Pick a topic to start.",
    actions: [{ type: "show_contents" }],
    deep_link: "#contents"
  },
  {
    intent: "esg_basics",
    utterances: ["what is esg", "esg basics", "environmental social governance"],
    reply_short: "Here’s a quick overview of ESG.",
    actions: [{ type: "show_section", id: "esg_basics", deep_dive_id: "deep-dive-esg" }],
    deep_link: "#what-is-esg"
  },
  {
    intent: "sdr_labels",
    utterances: ["what are sdr labels", "uk sustainable labels", "focus vs improvers vs impact vs mixed"],
    reply_short: "Here are the four SDR labels and what they mean.",
    actions: [{ type: "show_section", id: "sdr_labels", deep_dive_id: "deep-dive-sdr" }],
    deep_link: "#sdr-labels-uk-fca"
  },
  {
    intent: "anti_greenwashing",
    utterances: ["anti greenwashing", "greenwashing rules", "fair clear not misleading"],
    reply_short: "These are the headline anti-greenwashing requirements.",
    actions: [{ type: "show_section", id: "anti_greenwashing", deep_dive_id: "deep-dive-agw" }],
    deep_link: "#anti-greenwashing"
  },
  {
    intent: "kbs_pathway_overview",
    utterances: ["preference pathway", "investment choices", "kbs options"],
    reply_short: "Here are the KBS Preference Pathway choices.",
    actions: [{ type: "show_section", id: "kbs_choices", deep_dive_id: "deep-dive-choices" }],
    deep_link: "#investment-choices--kbs-preference-pathway"
  },
  {
    intent: "how_managers_decide",
    utterances: ["how do managers decide it's sustainable", "fund manager role"],
    reply_short: "How managers set objectives, use metrics, and report progress.",
    actions: [{ type: "show_section", id: "managers_decide", deep_dive_id: "deep-dive-managers" }],
    deep_link: "#how-fund-managers-decide-sustainable"
  },
  {
    intent: "suitability",
    utterances: ["suitability rules", "what information do you need"],
    reply_short: "How advisers ensure recommendations are suitable.",
    actions: [{ type: "show_section", id: "cobs_9a", deep_dive_id: "deep-dive-cobs" }],
    deep_link: "#suitability-cobs-9a"
  },
  {
    intent: "product_governance",
    utterances: ["product governance", "target market rules"],
    reply_short: "Target market and distribution responsibilities.",
    actions: [{ type: "show_section", id: "prod_3", deep_dive_id: "deep-dive-prod" }],
    deep_link: "#product-governance-prod-3"
  },
  {
    intent: "design_for_understanding",
    utterances: ["disclosures", "factsheet design"],
    reply_short: "What makes disclosures easier to understand.",
    actions: [{ type: "show_section", id: "design_understanding", deep_dive_id: "deep-dive-design" }],
    deep_link: "#disclosures--design-for-understanding"
  },
  {
    intent: "deep_dive",
    utterances: ["know more", "tell me more", "more details"],
    reply_short: "Here are more details.",
    actions: [{ type: "deep_dive_current" }],
    deep_link: null
  },
  {
    intent: "return_to_pack",
    utterances: ["back", "return", "go back"],
    reply_short: "Back to the Education Pack.",
    actions: [{ type: "return_to_pack" }],
    deep_link: "#contents"
  }
];

const buildKeywordPattern = (phrase) => new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const defaultKeywords = (terms) => terms.map((term) => (
  term instanceof RegExp ? term : buildKeywordPattern(term)
));

const MODULE_DEFINITIONS = [
  {
    slug: "esg_basics",
    title: "What is ESG?",
    anchor: "what-is-esg",
    deep_dive_id: "deep-dive-esg",
    category: "basics",
    keywords: defaultKeywords([
      /what is esg/i,
      /esg basics/i,
      "environmental social governance"
    ]),
    summary:
      "ESG is a lens for evaluating financially material Environmental, Social, and Governance factors. Environmental covers climate & carbon, resource use, pollution and biodiversity. Social covers workforce, supply chains, safety and human rights. Governance includes board oversight, audit, pay, ethics, controls and cyber. ESG integration alone doesn’t make a product sustainable or impact.",
    detailed_explanation:
      "Deep-dive: Environmental — climate scenarios, carbon intensity, biodiversity impacts, water use. Social — fair pay, safety, supply chain standards, data privacy, inclusion. Governance — board independence and skills, audits, remuneration alignment, risk controls. ESG is an analysis lens; sustainability labels still need objectives, criteria and reporting.",
    comprehension_check:
      "Does it make sense that ESG integration is an analysis lens rather than a sustainability label?"
  },
  {
    slug: "sdr_labels",
    title: "SDR Labels (UK FCA)",
    anchor: "sdr-labels-uk-fca",
    deep_dive_id: "deep-dive-sdr",
    category: "regulation",
    keywords: defaultKeywords([
      /sdr labels?/i,
      "focus vs improvers",
      "uk sustainable labels"
    ]),
    summary:
      "The FCA’s optional labels are Focus, Improvers, Impact and Mixed Goals. They help clients understand the sustainability objective of a fund, while unlabeled funds making claims must still explain themselves clearly.",
    detailed_explanation:
      "Deep-dive: Focus — assets aligned to sustainability themes or standards. Improvers — assets expected to improve sustainability over time with stewardship. Impact — solutions aiming for positive, measurable outcomes with a theory of change and KPIs. Mixed Goals — blends of the other pathways. Labels appear on client materials from 31 Jul 2024; from 2 Apr 2025, unlabeled claimants must give simple explanations and say why no label applies. Managers provide annual progress updates.",
    comprehension_check:
      "Can you outline how Focus, Improvers, Impact and Mixed Goals differ in their objectives?"
  },
  {
    slug: "anti_greenwashing",
    title: "Anti-Greenwashing",
    anchor: "anti-greenwashing",
    deep_dive_id: "deep-dive-agw",
    category: "regulation",
    keywords: defaultKeywords([
      /anti[- ]?greenwashing/i,
      /(what is )?greenwashing/i,
      "fair clear not misleading"
    ]),
    summary:
      "Sustainability claims must be correct, clear, complete and fair. Firms hold evidence and ensure visuals or comparisons don’t over-imply sustainability.",
    detailed_explanation:
      "Deep-dive: Claims must be substantiated and reviewed; language should suit the audience; disclosures can’t cherry-pick; comparisons must be meaningful and transparent. Visuals count as claims and should match the sustainability profile. Good practice includes publishing supporting evidence and keeping an audit trail.",
    comprehension_check:
      "Do you see why we insist on evidence and clear wording before making sustainability claims?"
  },
  {
    slug: "kbs_choices",
    title: "Investment Choices — KBS Preference Pathway",
    anchor: "investment-choices--kbs-preference-pathway",
    deep_dive_id: "deep-dive-choices",
    category: "preferences",
    keywords: defaultKeywords([
      /preference pathway/i,
      /investment choices/i,
      "kbs options"
    ]),
    summary:
      "Clients can combine Conventional, Conventional + ESG, Sustainability pathways (Improvers, Focus, Impact, Mixed Goals), Ethical and optional Philanthropy strategies, even per product.",
    detailed_explanation:
      "Deep-dive: Conventional and Conventional + ESG focus on risk/return while integrating ESG analysis. Improvers rely on stewardship milestones; Focus targets thematic exposures; Impact pursues measurable outcomes with KPIs and a theory of change; Mixed Goals blend the pathways with guardrails. Ethical strategies use values-based screens that affect diversification. Philanthropy can complement investments with SDG-linked giving.",
    comprehension_check:
      "Would reviewing how each pathway handles trade-offs help you decide which mix fits your goals?"
  },
  {
    slug: "managers_decide",
    title: "How Fund Managers Decide “Sustainable”",
    anchor: "how-fund-managers-decide-sustainable",
    deep_dive_id: "deep-dive-managers",
    category: "process",
    keywords: defaultKeywords([
      /how do managers decide/i,
      "sustainable investment process",
      "stewardship reporting"
    ]),
    summary:
      "Managers set objectives and policy, use clear metrics and plain numbers, practice stewardship and keep evidence, then share client-friendly progress updates.",
    detailed_explanation:
      "Deep-dive: Objectives and policies align to labels or stated intents; metrics include plain numbers such as pounds per hundred invested, implied temperature or carbon footprints; context and evaluative cues explain what good looks like; stewardship covers priorities, escalation and voting; evidence includes balanced reporting of constraints and negatives; annual updates summarise progress and changes.",
    comprehension_check:
      "Do you want to review the stewardship evidence and metrics managers use to support sustainability claims?"
  },
  {
    slug: "cobs_9a",
    title: "Suitability (COBS 9A)",
    anchor: "suitability-cobs-9a",
    deep_dive_id: "deep-dive-cobs",
    category: "regulation",
    keywords: defaultKeywords([
      /suitability rules?/i,
      "cobs 9a",
      "what information do you need"
    ]),
    summary:
      "Advisers gather knowledge and experience, financial situation (including ability to bear loss) and objectives/risk tolerance. Without sufficient information, no personal recommendation can be given.",
    detailed_explanation:
      "Deep-dive: Suitability reports explain how advice meets preferences and objectives. Periodic statements update clients where relevant. Information on capacity for loss and target market alignment is mandatory before recommending products.",
    comprehension_check:
      "Are you comfortable sharing the information we need to meet COBS 9A before we give advice?"
  },
  {
    slug: "prod_3",
    title: "Product Governance (PROD 3)",
    anchor: "product-governance-prod-3",
    deep_dive_id: "deep-dive-prod",
    category: "regulation",
    keywords: defaultKeywords([
      /product governance/i,
      "prod 3",
      "target market rules"
    ]),
    summary:
      "Manufacturers define and review target markets; distributors must understand products, set their own target market, ensure best-interests distribution and monitor outcomes.",
    detailed_explanation:
      "Deep-dive: Manufacturers handle product testing, conflicts, oversight and competence. Distributors document their target market assessment, monitor sales including outside target market cases, conduct periodic reviews and maintain governance oversight.",
    comprehension_check:
      "Do you want to see how product governance safeguards ensure recommendations stay within the right target market?"
  },
  {
    slug: "design_understanding",
    title: "Disclosures & Design for Understanding",
    anchor: "disclosures--design-for-understanding",
    deep_dive_id: "deep-dive-design",
    category: "process",
    keywords: defaultKeywords([
      /disclosures/i,
      /factsheet design/i,
      "plain numbers"
    ]),
    summary:
      "Behaviourally informed factsheets use plain numbers, context and single-label focus to improve comprehension versus technical documents alone.",
    detailed_explanation:
      "Deep-dive: Provide plain numbers in pounds or frequencies, pre-calculate where possible, add context and evaluative cues, and avoid overwhelming comparisons by focusing on the product’s label. Behavioural research such as FCA Occasional Paper 62 shows these approaches improve understanding.",
    comprehension_check:
      "Would tailored factsheets with plain numbers and context help you compare sustainability options more easily?"
  },
  {
    slug: "glossary",
    title: "Glossary",
    anchor: "glossary",
    deep_dive_id: null,
    category: "reference",
    keywords: defaultKeywords([
      /glossary/i,
      "definitions",
      "what does esg mean"
    ]),
    summary:
      "Key definitions: ESG integration (factoring E/S/G into analysis), stewardship (engagement and voting), theory of change (expected measurable outcomes), implied temperature rise (portfolio warming metric), relative carbon footprint (carbon per unit invested vs benchmark).",
    detailed_explanation:
      "Glossary reference: ESG integration, stewardship, theory of change, implied temperature rise and relative carbon footprint – all provided for quick look-up during conversations.",
    comprehension_check: null
  }
];

export const EDUCATION_MODULES = MODULE_DEFINITIONS.map((definition) => ({
  slug: definition.slug,
  title: definition.title,
  keywords: definition.keywords,
  summary: definition.summary,
  detailed_explanation: definition.detailed_explanation,
  deep_link: definition.anchor ? `#${definition.anchor}` : (definition.deep_dive_id ? `#${definition.deep_dive_id}` : null),
  pdf_available: true,
  comprehension_check: definition.comprehension_check,
  category: definition.category,
  deep_dive_id: definition.deep_dive_id
}));

// Progress tracking --------------------------------------------------------

export const trackEducationalProgress = (session, moduleTitle, interactionType = "viewed") => {
  if (!session || typeof session !== "object") {
    throw new Error("Session context is required to track educational progress.");
  }

  if (!session.data) {
    session.data = {};
  }

  if (!session.data.educational_progress) {
    session.data.educational_progress = {
      modules_accessed: [],
      comprehension_responses: {},
      pdf_downloads: [],
      total_time_spent: 0,
      last_accessed: null
    };
  }

  const progress = session.data.educational_progress;
  const timestamp = new Date().toISOString();

  const existingAccess = progress.modules_accessed.find((item) => item.module === moduleTitle);
  if (existingAccess) {
    existingAccess.access_count += 1;
    existingAccess.last_accessed = timestamp;
    existingAccess.interaction_types = existingAccess.interaction_types || [];
    if (!existingAccess.interaction_types.includes(interactionType)) {
      existingAccess.interaction_types.push(interactionType);
    }
  } else {
    progress.modules_accessed.push({
      module: moduleTitle,
      first_accessed: timestamp,
      last_accessed: timestamp,
      access_count: 1,
      interaction_types: [interactionType]
    });
  }

  progress.last_accessed = timestamp;
  return progress;
};

export const recordComprehensionResponse = (session, moduleTitle, response, correct = null) => {
  if (!session?.data?.educational_progress) {
    trackEducationalProgress(session, moduleTitle, "comprehension_check");
  }

  const progress = session.data.educational_progress;
  if (!progress.comprehension_responses[moduleTitle]) {
    progress.comprehension_responses[moduleTitle] = [];
  }

  progress.comprehension_responses[moduleTitle].push({
    response,
    timestamp: new Date().toISOString(),
    correct,
    attempts: progress.comprehension_responses[moduleTitle].length + 1
  });

  return progress;
};

export const trackPdfDownload = (session, moduleTitle, pdfType = "detailed_explanation") => {
  trackEducationalProgress(session, moduleTitle, "pdf_download");

  const progress = session.data.educational_progress;
  progress.pdf_downloads.push({
    module: moduleTitle,
    pdf_type: pdfType,
    downloaded_at: new Date().toISOString()
  });

  return progress;
};

const hasLabelInterest = (prefs, match) => {
  if (!Array.isArray(prefs?.labels_interest)) return false;
  return prefs.labels_interest.some((label) => label?.toLowerCase().includes(match));
};

const hasThemeInterest = (prefs, match) => {
  if (!Array.isArray(prefs?.themes)) return false;
  return prefs.themes.some((theme) => theme?.toLowerCase().includes(match));
};

export const getEducationalRecommendations = (session) => {
  const profile = session?.data?.client_profile || {};
  const prefs = session?.data?.sustainability_preferences || {};
  const progress = session?.data?.educational_progress || {};

  const recommendations = [];
  const accessedModules = progress.modules_accessed?.map((item) => item.module) || [];

  const moduleLookup = new Map(EDUCATION_MODULES.map((module) => [module.slug, module]));

  const addRecommendation = (slug, reason, priority = "medium") => {
    const module = moduleLookup.get(slug);
    if (!module) return;
    if (accessedModules.includes(module.title)) return;
    if (recommendations.some((item) => item.module === module.title)) return;
    recommendations.push({ module: module.title, reason, priority });
  };

  if (prefs.preference_level === "detailed") {
    addRecommendation(
      "design_understanding",
      "Detailed preference clients benefit from disclosure design guidance.",
      "high"
    );
    addRecommendation(
      "managers_decide",
      "Helps you evaluate how managers evidence sustainability outcomes.",
      "high"
    );
  }

  if (Array.isArray(prefs.labels_interest) && prefs.labels_interest.length > 0) {
    addRecommendation(
      "kbs_choices",
      "Review how the Preference Pathway supports mixing pathways per product.",
      "medium"
    );
  }

  if (hasLabelInterest(prefs, "impact")) {
    addRecommendation(
      "sdr_labels",
      "Impact investors often want the SDR label criteria at-a-glance.",
      "high"
    );
  }

  if (hasLabelInterest(prefs, "improver")) {
    addRecommendation(
      "sdr_labels",
      "Improvers rely on stewardship commitments explained in the SDR deep dive.",
      "medium"
    );
  }

  if (hasLabelInterest(prefs, "focus") || hasLabelInterest(prefs, "mixed")) {
    addRecommendation(
      "sdr_labels",
      "Focus and Mixed Goals clients can revisit how the labels differ and combine.",
      "medium"
    );
  }

  if (hasThemeInterest(prefs, "climate") || hasThemeInterest(prefs, "environment")) {
    addRecommendation(
      "design_understanding",
      "Climate-focused clients value disclosures with clear metrics and context.",
      "medium"
    );
  }

  if (Array.isArray(prefs.exclusions) && prefs.exclusions.length > 0) {
    addRecommendation(
      "kbs_choices",
      "Values-based exclusions appear in the Preference Pathway deep dive.",
      "medium"
    );
  }

  if (!accessedModules.includes(moduleLookup.get("anti_greenwashing")?.title)) {
    addRecommendation(
      "anti_greenwashing",
      "Everyone should understand the FCA’s anti-greenwashing expectations.",
      "medium"
    );
  }

  if (!accessedModules.includes(moduleLookup.get("cobs_9a")?.title) && !profile?.objectives) {
    addRecommendation(
      "cobs_9a",
      "Before advice, review the suitability information we must collect.",
      "medium"
    );
  }

  return recommendations.slice(0, 5);
};

export const generateEducationalSummary = (session) => {
  const progress = session?.data?.educational_progress;
  if (!progress) {
    return "No educational content accessed yet.";
  }

  const mostAccessed = (progress.modules_accessed || [])
    .slice()
    .sort((a, b) => b.access_count - a.access_count)
    .slice(0, 3)
    .map((item) => `${item.module} (${item.access_count} times)`);

  return {
    pack_version: EDUCATION_PACK_METADATA.version,
    total_modules_accessed: progress.modules_accessed?.length || 0,
    most_accessed_modules: mostAccessed,
    comprehension_checks_completed: Object.keys(progress.comprehension_responses || {}).length,
    pdf_downloads: progress.pdf_downloads?.length || 0,
    last_educational_activity: progress.last_accessed
  };
};

// ESG & SDR Educational Pack v2.0 — conversational helpers
// Provides structured metadata, intent routing hints, and detailed modules that
// align with the 2025-10-29 KBS Preference Pathway specification.

export const EDUCATION_PACK_METADATA = {
  id: "esg_sdr_pack_v2",
  name: "ESG & SDR Educational Pack — KBS Preference Pathway (v2.0)",
  version: "2.0",
  published_at: "2025-10-29",
  owner: "KBS Preference Pathway",
  language: "en-GB",
  audience: ["retail_investors", "advisers"],
  disclaimers: [
    "Educational only; not personal advice.",
    "Investments can go down as well as up; you may not get back the amount invested.",
    "Sustainability/ESG data and methodologies evolve over time."
  ],
  routing_defaults: {
    fallback_intent: "help_overview",
    safety: {
      anti_greenwashing: {
        enforce: true,
        rules: ["correct", "clear", "complete", "fair_comparisons"]
      }
    }
  }
};

export const MICRO_MODULES = [
  {
    slug: "esg_basics",
    title: "ESG basics",
    reply:
      "ESG = Environmental, Social, Governance. It’s a risk-and-opportunity lens investors use to assess how companies are run and how they manage environmental & social issues."
  },
  {
    slug: "sdr_labels",
    title: "SDR labels",
    reply:
      "UK labels: Focus, Improvers, Impact, Mixed Goals — four ways funds can set sustainability objectives."
  },
  {
    slug: "anti_greenwashing",
    title: "Anti-greenwashing",
    reply:
      "Claims must be fair, clear, not misleading. Visuals and comparisons must not over-imply sustainability; firms should hold evidence."
  },
  {
    slug: "trade_offs",
    title: "Trade-offs",
    reply:
      "Themes/screens can narrow the investable universe and affect diversification/returns — we’ll flag these so you can decide knowingly."
  },
  {
    slug: "product_governance",
    title: "Product governance",
    reply:
      "Every fund has a defined target market. Recommendations must fit this; outside-target-market sales are captured and reviewed."
  }
];

export const EDUCATION_INTENTS = [
  {
    intent: "help_overview",
    utterances: ["help", "menu", "what can you do", "show topics"],
    reply_short:
      "I can explain ESG, UK SDR labels, anti-greenwashing rules, your KBS Preference Pathway options, and how advisers turn preferences into suitable advice. What would you like to explore?",
    deep_link: null,
    quick_replies: ["What is ESG?", "SDR labels", "Preference Pathway", "Anti-greenwashing", "Suitability"]
  },
  {
    intent: "esg_basics",
    utterances: ["what is esg", "esg basics", "explain environmental social governance"],
    reply_short:
      "ESG is a lens to assess financially material environmental, social and governance factors in investments. It doesn’t automatically mean ‘sustainable’ or ‘impact’.",
    deep_link: "#what-is-esg",
    quick_replies: ["SDR labels", "Preference Pathway"]
  },
  {
    intent: "sdr_labels",
    utterances: [
      "what are sdr labels",
      "uk sustainable labels",
      "focus vs improvers vs impact vs mixed"
    ],
    reply_short:
      "The UK’s optional labels are Focus, Improvers, Impact, and Mixed Goals. Each sets a different sustainability objective. Unlabelled funds making sustainability claims must still explain why no label applies.",
    deep_link: "#sdr-labels-uk-fca",
    quick_replies: ["Improvers vs Focus", "What is Impact?", "Mixed Goals"]
  },
  {
    intent: "anti_greenwashing",
    utterances: ["anti greenwashing", "what counts as greenwashing", "fair clear not misleading"],
    reply_short:
      "Claims must be correct and evidence-based, clear to the intended audience, complete (no cherry-picking), and fair in comparisons. Visuals must not over-imply sustainability.",
    deep_link: "#anti-greenwashing-fg243",
    quick_replies: ["Examples", "Preference Pathway"]
  },
  {
    intent: "kbs_pathway_overview",
    utterances: ["preference pathway", "investment choices", "kbs options"],
    reply_short:
      "Choose from: Conventional, Conventional + ESG, Sustainability (Improvers / Focus / Impact / Mixed Goals), Ethical, and optional Philanthropy. You can mix pathways or apply different ones per product.",
    deep_link: "#kbs-investment-choices-preference-pathway",
    quick_replies: ["Improvers", "Focus", "Impact", "Mixed Goals", "Ethical"]
  },
  {
    intent: "improvers_detail",
    utterances: ["what is improvers", "explain sustainability improvers"],
    reply_short:
      "Invests mainly in assets that may not be sustainable now but aim to improve over time, typically using stewardship and engagement.",
    deep_link: "#sustainability-improvers",
    quick_replies: ["How managers decide", "Focus", "Impact"]
  },
  {
    intent: "focus_detail",
    utterances: ["what is focus", "sustainability focus label"],
    reply_short:
      "Invests mainly in assets that focus on sustainability (themes/standards). Narrower universes may affect diversification.",
    deep_link: "#sustainability-focus",
    quick_replies: ["Improvers", "Impact", "Mixed Goals"]
  },
  {
    intent: "impact_detail",
    utterances: ["what is impact", "sustainability impact label"],
    reply_short:
      "Invests mainly in solutions to sustainability problems with an aim to achieve a positive, measurable impact using a theory of change and KPIs.",
    deep_link: "#sustainability-impact",
    quick_replies: ["How managers decide", "Mixed Goals"]
  },
  {
    intent: "mixed_goals_detail",
    utterances: ["mixed goals label", "how does mixed goals work"],
    reply_short:
      "A blended allocation across Focus, Improvers and Impact approaches. Can be manager-driven or tailored via your preferences.",
    deep_link: "#sustainability-mixed-goals",
    quick_replies: ["Improvers", "Focus", "Impact"]
  },
  {
    intent: "ethical_investing",
    utterances: ["ethical investing", "values based investing"],
    reply_short:
      "Apply personal values via exclusions and/or positive screens (e.g., tobacco or human-rights screens). A restricted universe can affect risk/return.",
    deep_link: "#ethical-investment",
    quick_replies: ["Preference Pathway", "Suitability"]
  },
  {
    intent: "how_managers_decide",
    utterances: ["how do managers decide it's sustainable", "fund manager role"],
    reply_short:
      "Managers set objectives and policies; use clear metrics and plain numbers; practice stewardship (especially for Improvers); keep evidence; and provide client-friendly annual progress updates.",
    deep_link: "#how-fund-managers-decide-sustainable-investments",
    quick_replies: ["Anti-greenwashing", "SDR labels"]
  },
  {
    intent: "suitability",
    utterances: ["suitability rules", "what information do you need about me"],
    reply_short:
      "Advisers assess your knowledge/experience, financial situation (incl. ability to bear loss) and objectives/risk tolerance. If sufficient info isn’t obtained, no personal recommendation can be made.",
    deep_link: "#suitability-cobs-9a",
    quick_replies: ["Preference Pathway", "Product governance"]
  },
  {
    intent: "product_governance",
    utterances: ["product governance", "target market rules"],
    reply_short:
      "Manufacturers define target markets and share product info; distributors must understand products, set their own target market, ensure distribution in clients’ best interests, and review arrangements regularly.",
    deep_link: "#product-governance-prod-3",
    quick_replies: ["Suitability", "Preference Pathway"]
  },
  {
    intent: "tradeoffs",
    utterances: ["are there trade offs", "risks of sustainable funds"],
    reply_short:
      "Themes/screens can narrow the investable universe and affect diversification and risk/return. Outcomes depend on manager selection, portfolio construction, and your chosen preferences.",
    deep_link: "#kbs-investment-choices-preference-pathway",
    quick_replies: ["How managers decide", "Suitability"]
  }
];

const buildKeywordPattern = (phrase) => new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const defaultKeywords = (terms) => terms.map((term) => (
  term instanceof RegExp ? term : buildKeywordPattern(term)
));

export const EDUCATION_MODULES = [
  {
    slug: "esg_basics",
    title: "ESG basics",
    keywords: defaultKeywords([
      /\bwhat is esg\b/i,
      /\besg basics\b/i,
      "environmental social governance"
    ]),
    summary:
      "ESG = Environmental, Social, Governance. It’s the lens investors use to assess financially material sustainability risks and opportunities — not a label that automatically makes a fund ‘green’.",
    detailed_explanation:
      "Environmental factors look at climate impact, resource use, pollution and biodiversity. Social factors consider people-focused issues such as workforce well-being, supply chains and human rights. Governance factors test board oversight, audit quality, pay alignment, ethics, controls and cyber resilience. Using ESG data helps price risks and spot opportunities, but outcomes still depend on the investment strategy and execution.",
    deep_link: "#what-is-esg",
    pdf_available: true,
    comprehension_check:
      "Do you understand that ESG is an analysis lens for risk and opportunity rather than a guarantee of positive impact?",
    category: "fundamentals"
  },
  {
    slug: "sdr_labels",
    title: "SDR Labels (UK FCA)",
    keywords: defaultKeywords([
      /sdr labels?/i,
      "focus vs improvers",
      "uk sustainable labels"
    ]),
    summary:
      "Optional UK labels describe four sustainability objectives: Focus, Improvers, Impact and Mixed Goals. Even without a label, firms making sustainability claims must explain themselves clearly.",
    detailed_explanation:
      "Focus funds invest mainly in assets already aligned with sustainability themes or standards. Improvers back assets that plan to improve sustainability performance through stewardship. Impact funds target solutions that deliver measurable, positive outcomes backed by a theory of change and KPIs. Mixed Goals funds combine the other approaches. Labels arrive on client materials from 31 Jul 2024; from 2 Apr 2025, unlabeled funds with sustainability claims must state why there is no label and still provide clear information.",
    deep_link: "#sdr-labels-uk-fca",
    pdf_available: true,
    comprehension_check:
      "Can you outline how Focus, Improvers, Impact and Mixed Goals differ in their sustainability aims?",
    category: "regulation"
  },
  {
    slug: "anti_greenwashing",
    title: "Anti-Greenwashing (FG24/3)",
    keywords: defaultKeywords([
      /anti[- ]?greenwashing/i,
      /(what is )?greenwashing/i,
      "fair clear not misleading",
      "evidence based claims"
    ]),
    summary:
      "Any sustainability statement must be correct, clear, complete and fair. We avoid exaggeration, provide evidence and make sure visuals do not over-imply sustainability.",
    detailed_explanation:
      "FG24/3 requires claims to be substantiated and reviewed, written in language the audience understands, complete with relevant caveats, and fair when comparing products or metrics. Visuals, colour palettes and icons count as claims too, so we align them to the actual sustainability profile. The rule applies across products, services and marketing communications.",
    deep_link: "#anti-greenwashing-fg243",
    pdf_available: true,
    comprehension_check:
      "Do you see why we must evidence sustainability claims and keep wording fair, clear and not misleading?",
    category: "regulation"
  },
  {
    slug: "kbs_investment_choices",
    title: "KBS Investment Choices (Preference Pathway)",
    keywords: defaultKeywords([
      "preference pathway",
      "kbs options",
      /investment choices/i
    ]),
    summary:
      "The KBS Preference Pathway lets clients combine Conventional, Conventional + ESG, Sustainability labels (Improvers/Focus/Impact/Mixed Goals), Ethical and optional Philanthropy strategies — even mixing them per product.",
    detailed_explanation:
      "Conventional keeps a financial risk/return objective without a sustainability target. Conventional + ESG integrates ESG data in research and risk management while still focusing on financial outcomes. Sustainability pathways map directly to the FCA labels, each with unique trade-offs. Ethical pathways rely on values-based exclusions or positive screens, which can narrow the investable universe. Philanthropy can complement investment choices with giving linked to priority causes or SDGs.",
    deep_link: "#kbs-investment-choices-preference-pathway",
    pdf_available: true,
    comprehension_check:
      "Would you like support picking between Conventional, Sustainability labels, Ethical or Philanthropy options for your portfolio?",
    category: "preferences"
  },
  {
    slug: "sustainability_improvers",
    title: "Sustainability Improvers",
    keywords: defaultKeywords([
      "sustainability improvers",
      "what is improvers",
      "improver funds"
    ]),
    summary:
      "Improvers invest mainly in assets with credible plans to raise their sustainability performance over time, using stewardship to push progress.",
    detailed_explanation:
      "Improvers strategies rely on active ownership. Managers set engagement priorities, track milestones and escalate if progress stalls. Portfolios may include companies earlier in their transition, so impact depends on engagement success and timelines. Clients should expect narrative reporting on progress and stewardship activity.",
    deep_link: "#sustainability-improvers",
    pdf_available: true,
    comprehension_check:
      "Does backing companies that are on a journey to improve — instead of already high performers — align with your objectives?",
    category: "labels"
  },
  {
    slug: "sustainability_focus",
    title: "Sustainability Focus",
    keywords: defaultKeywords([
      "sustainability focus",
      "focus label",
      "focus funds"
    ]),
    summary:
      "Focus strategies invest mainly in assets already aligned with sustainability themes or standards. Expect a narrower universe and potential diversification impacts.",
    detailed_explanation:
      "Focus funds target companies or projects that meet predefined sustainability criteria (such as clean energy, social housing, or verified environmental standards). Because the investable set is smaller, portfolios can have tilts versus broad markets. Managers must evidence how holdings continue to meet the stated sustainability focus.",
    deep_link: "#sustainability-focus",
    pdf_available: true,
    comprehension_check:
      "Are you comfortable concentrating on assets that already meet sustainability criteria, knowing diversification may differ from mainstream benchmarks?",
    category: "labels"
  },
  {
    slug: "sustainability_impact",
    title: "Sustainability Impact",
    keywords: defaultKeywords([
      "sustainability impact",
      "impact label",
      "impact investing"
    ]),
    summary:
      "Impact portfolios invest in solutions to sustainability problems and must show measurable, positive outcomes backed by a theory of change and KPIs.",
    detailed_explanation:
      "Managers define intentional impact objectives, track indicators (e.g., tonnes of CO₂ avoided, beneficiaries reached) and publish annual progress updates. Reporting should include context, limitations and evaluative cues so clients can judge success. Impact strategies may have longer time horizons or higher concentration in thematic sectors.",
    deep_link: "#sustainability-impact",
    pdf_available: true,
    comprehension_check:
      "Would you like investments that demonstrate measurable outcomes alongside financial returns?",
    category: "labels"
  },
  {
    slug: "sustainability_mixed_goals",
    title: "Sustainability Mixed Goals",
    keywords: defaultKeywords([
      "mixed goals",
      "mixed sustainability",
      "blend of focus improvers impact"
    ]),
    summary:
      "Mixed Goals funds blend Focus, Improvers and Impact allocations. The balance can be manager-driven or tailored to the client’s preferences.",
    detailed_explanation:
      "A Mixed Goals approach combines multiple sustainability pathways to manage diversification while still pursuing sustainability outcomes. Managers explain the allocation logic, how each sleeve is monitored, and how conflicts between objectives are handled. Clients should review how the blend aligns with their tolerance for trade-offs and reporting expectations.",
    deep_link: "#sustainability-mixed-goals",
    pdf_available: true,
    comprehension_check:
      "Does a blended sustainability approach appeal because it balances current leaders, improvers and targeted impact?",
    category: "labels"
  },
  {
    slug: "ethical_investing",
    title: "Ethical investing",
    keywords: defaultKeywords([
      "ethical investing",
      "values based investing",
      "negative screening"
    ]),
    summary:
      "Ethical investing applies personal values via exclusions or positive screens. Restricting the universe can change diversification, risk and return.",
    detailed_explanation:
      "Common exclusions include tobacco, controversial weapons, severe human-rights violations and fossil fuels above set revenue thresholds. Positive screens can tilt toward companies with exemplary social or environmental practices. Advisers document chosen criteria, thresholds and acknowledge any trade-offs or monitoring requirements.",
    deep_link: "#ethical-investment",
    pdf_available: true,
    comprehension_check:
      "Do you have specific sectors or behaviours you would like to exclude entirely or set thresholds for?",
    category: "preferences"
  },
  {
    slug: "tradeoffs",
    title: "Trade-offs & diversification",
    keywords: defaultKeywords([
      "sustainable trade offs",
      "risks of esg",
      "diversification impact"
    ]),
    summary:
      "Themes and exclusions can narrow the investable universe, affecting diversification, volatility and performance. Understanding these trade-offs is part of informed consent.",
    detailed_explanation:
      "Sustainable strategies may exhibit tracking error, sector concentration, liquidity constraints or fee differences compared with broad market funds. Benefits include better alignment with values and potential mitigation of long-term sustainability risks. Clients should weigh these factors against objectives and risk tolerance.",
    deep_link: "#kbs-investment-choices-preference-pathway",
    pdf_available: true,
    comprehension_check:
      "Are you comfortable if sustainable preferences cause performance to differ from mainstream benchmarks?",
    category: "risks"
  },
  {
    slug: "manager_decisions",
    title: "How fund managers decide ‘sustainable’ investments",
    keywords: defaultKeywords([
      "how do managers decide",
      "sustainable investment process",
      "stewardship reporting"
    ]),
    summary:
      "Managers set objectives and policies, use clear metrics, practice stewardship, retain evidence and publish client-friendly updates showing progress against KPIs.",
    detailed_explanation:
      "A robust process covers documented objectives, screening policies, stewardship plans, escalation triggers, measurement frameworks (plain numbers such as £ per £100 invested) and balanced reporting. Clients should expect annual updates that explain outcomes, limitations and next steps.",
    deep_link: "#how-fund-managers-decide-sustainable-investments",
    pdf_available: true,
    comprehension_check:
      "Do you want to see the stewardship and reporting evidence managers provide for their sustainability claims?",
    category: "process"
  },
  {
    slug: "suitability_cobs9a",
    title: "Suitability (COBS 9A)",
    keywords: defaultKeywords([
      "suitability rules",
      "cobs 9a",
      "information you need"
    ]),
    summary:
      "Advisers gather knowledge/experience, financial situation and objectives/risk tolerance. Without enough information, no personal recommendation can be delivered.",
    detailed_explanation:
      "Suitability reports explain how advice aligns with your circumstances and sustainability preferences. Periodic statements and reviews keep records current. The ability to bear loss and compatibility with the recommended product’s target market are mandatory checks.",
    deep_link: "#suitability-cobs-9a",
    pdf_available: true,
    comprehension_check:
      "Do you understand why we must capture details about your experience, finances and risk tolerance before advising?",
    category: "regulation"
  },
  {
    slug: "product_governance",
    title: "Product Governance (PROD 3)",
    keywords: defaultKeywords([
      "product governance",
      "prod 3",
      "target market rules"
    ]),
    summary:
      "Manufacturers define and review target markets; distributors must understand products, set their own target market, ensure best-interest distribution and monitor outcomes (including sales outside the target market).",
    detailed_explanation:
      "Manufacturers share product information, manage conflicts, ensure competent oversight and refresh documentation regularly. Distributors document their own target market assessment, controls for outside-target-market sales and governance arrangements. Monitoring includes data capture and MI escalation for remedial action.",
    deep_link: "#product-governance-prod-3",
    pdf_available: true,
    comprehension_check:
      "Are you comfortable that we will only recommend products aligned with both the manufacturer’s and our own target market definitions?",
    category: "regulation"
  },
  {
    slug: "disclosures_design",
    title: "Disclosures & design for understanding",
    keywords: defaultKeywords([
      "design for understanding",
      "plain numbers",
      "disclosure timing"
    ]),
    summary:
      "Behaviourally-informed disclosures use plain numbers, single-label descriptions and evaluative cues to improve comprehension compared with dense KIIDs alone.",
    detailed_explanation:
      "We deliver the right disclosure at the point of decision, pre-calculate figures, and use context (e.g., better/worse indicators) so clients can interpret metrics quickly. Content mirrors FCA research such as Occasional Paper 62, which shows improved understanding when visuals and narratives are balanced.",
    deep_link: "#disclosures--design-for-understanding",
    pdf_available: true,
    comprehension_check:
      "Would tailored factsheets with plain numbers and context help you compare sustainability options more easily?",
    category: "process"
  },
  {
    slug: "sustainable_development_goals",
    title: "Sustainable Development Goals",
    keywords: defaultKeywords([
      "sustainable development goals",
      "sdg alignment",
      "un goals"
    ]),
    summary:
      "The UN’s 17 Sustainable Development Goals provide a framework for categorising positive environmental and social outcomes in impact strategies.",
    detailed_explanation:
      "Impact managers map investments to relevant SDGs, measure beneficiary outcomes and explain contribution, not attribution. Common themes include affordable energy, quality education, healthcare access and reduced inequalities.",
    deep_link: "#glossary",
    pdf_available: true,
    comprehension_check:
      "Which SDGs, if any, resonate most with your sustainability priorities?",
    category: "themes"
  }
];

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

  const addRecommendation = (module, reason, priority = "medium") => {
    if (!accessedModules.includes(module) && !recommendations.some((item) => item.module === module)) {
      recommendations.push({ module, reason, priority });
    }
  };

  if (prefs.preference_level === "detailed") {
    addRecommendation("Disclosures & design for understanding", "Detailed preference clients benefit from enhanced disclosure guidance.", "high");
    addRecommendation("How fund managers decide ‘sustainable’ investments", "Helps detailed clients evaluate stewardship and KPIs.", "high");
  }

  if (hasLabelInterest(prefs, "impact")) {
    addRecommendation("Sustainability Impact", "You expressed interest in Impact pathways.", "high");
    addRecommendation("Sustainable Development Goals", "Impact strategies often map progress to the SDGs.", "medium");
  }

  if (hasLabelInterest(prefs, "improver")) {
    addRecommendation("Sustainability Improvers", "You’re considering Improvers strategies and their stewardship requirements.", "high");
  }

  if (hasLabelInterest(prefs, "focus")) {
    addRecommendation("Sustainability Focus", "You mentioned Focus-labelled solutions.", "high");
  }

  if (hasLabelInterest(prefs, "mixed")) {
    addRecommendation("Sustainability Mixed Goals", "You asked about combining different sustainability objectives.", "medium");
  }

  if (hasThemeInterest(prefs, "climate")) {
    addRecommendation("Trade-offs & diversification", "Climate themes can change diversification; here’s what to expect.", "medium");
  }

  if (Array.isArray(prefs.exclusions) && prefs.exclusions.length > 0) {
    addRecommendation("Ethical investing", "We can document exclusion thresholds and their implications.", "medium");
  }

  if (profile.risk_tolerance >= 5) {
    addRecommendation("Trade-offs & diversification", "Higher risk tolerance warrants a look at diversification effects.", "medium");
  }

  if (!accessedModules.includes("Anti-Greenwashing (FG24/3)")) {
    addRecommendation("Anti-Greenwashing (FG24/3)", "Everyone should understand how we evidence sustainability claims.", "medium");
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

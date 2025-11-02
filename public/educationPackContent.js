export const EDUCATION_PACK_METADATA = {
  id: "esg_sdr_pack_v2_runtime",
  name: "Education Pack (Basic) + Deep-Dives — KBS Preference Pathway",
  version: "2.1",
  published: "2025-11-01",
  owner: "KBS Preference Pathway",
  language: "en-GB",
  recognition: "This pack recognises the KBS Preference Pathway as the source framework.",
  doc_type: "chatbot_runtime_module",
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

const BASIC_SECTIONS = [
  {
    id: "esg_basics",
    anchor: "what-is-esg",
    title: "What is ESG?",
    summary: [
      "ESG is a lens for evaluating financially material Environmental, Social, and Governance factors in investments.",
      "Environmental: climate & carbon, resource use, pollution, biodiversity.",
      "Social: workforce, supply chains, safety & well-being, human rights.",
      "Governance: board oversight, audit, pay, ethics, controls, cyber.",
      "ESG integration alone doesn’t mean a product is “sustainable” or “impact.”"
    ],
    knowMoreTarget: "deep-dive-esg"
  },
  {
    id: "sdr_labels",
    anchor: "sdr-labels-uk-fca",
    title: "SDR Labels (UK FCA)",
    summary: [
      "The FCA introduced four optional labels for funds with explicit sustainability goals:",
      "Focus — assets that focus on sustainability.",
      "Improvers — assets aiming to improve their sustainability over time.",
      "Impact — assets providing solutions with an aim to achieve positive, measurable outcomes.",
      "Mixed Goals — a mix of Focus/Improvers/Impact strategies."
    ],
    knowMoreTarget: "deep-dive-sdr"
  },
  {
    id: "anti_greenwashing",
    anchor: "anti-greenwashing",
    title: "Anti-Greenwashing",
    summary: [
      "Sustainability-related claims must be correct & substantiated, clear, complete (no cherry-picking), and fair/meaningful in comparisons.",
      "Visuals must not over-imply sustainability."
    ],
    knowMoreTarget: "deep-dive-agw"
  },
  {
    id: "kbs_choices",
    anchor: "investment-choices--kbs-preference-pathway",
    title: "Investment Choices — KBS Preference Pathway",
    summary: [
      "Choose one or combine: Conventional, Conventional + ESG, Sustainability (Improvers / Focus / Impact / Mixed Goals), Ethical, optional Philanthropy.",
      "You can assign different pathways to different products (e.g., ISA vs Pension).",
      "Trade-offs: narrower themes/screens may affect diversification and risk/return."
    ],
    knowMoreTarget: "deep-dive-choices"
  },
  {
    id: "managers_decide",
    anchor: "how-fund-managers-decide-sustainable",
    title: "How Fund Managers Decide “Sustainable”",
    summary: [
      "Managers set objectives/policy, use clear metrics and plain numbers, practice stewardship (especially for Improvers), keep evidence, and report progress annually for label users."
    ],
    knowMoreTarget: "deep-dive-managers"
  },
  {
    id: "cobs_9a",
    anchor: "suitability-cobs-9a",
    title: "Suitability (COBS 9A)",
    summary: [
      "Advisers gather knowledge & experience, financial situation/ability to bear loss, and objectives/risk tolerance to make a suitable recommendation.",
      "If enough information isn’t obtained, no personal recommendation can be made."
    ],
    knowMoreTarget: "deep-dive-cobs"
  },
  {
    id: "prod_3",
    anchor: "product-governance-prod-3",
    title: "Product Governance (PROD 3)",
    summary: [
      "Manufacturers define a target market and distribution strategy; distributors must understand products, set their own target markets, ensure best interests, and review arrangements regularly."
    ],
    knowMoreTarget: "deep-dive-prod"
  },
  {
    id: "design_understanding",
    anchor: "disclosures--design-for-understanding",
    title: "Disclosures & Design for Understanding",
    summary: [
      "Client-friendly factsheets with plain numbers, clear context, and single-label focus improve comprehension versus technical documents alone."
    ],
    knowMoreTarget: "deep-dive-design"
  },
  {
    id: "glossary",
    anchor: "glossary",
    title: "Glossary",
    summary: [
      "ESG integration — factoring E/S/G into investment analysis and risk management.",
      "Stewardship — engagement and voting to influence investee companies.",
      "Theory of change — how a strategy expects to create measurable outcomes.",
      "Implied temperature rise — a portfolio-level warming pathway metric.",
      "Relative carbon footprint — carbon per unit invested vs benchmark."
    ],
    knowMoreTarget: null
  }
];

const DEEP_DIVES = [
  {
    id: "deep-dive-esg",
    title: "Deep-Dive: ESG",
    points: [
      "Environmental: climate scenarios, carbon intensity, biodiversity impacts, water use.",
      "Social: fair pay, safety, supply chain standards, data privacy, inclusion.",
      "Governance: board independence/skills, audits, remuneration alignment, risk controls.",
      "Why ESG ≠ “sustainable”: ESG is an analysis lens; sustainability labels require objectives, criteria, and reporting."
    ]
  },
  {
    id: "deep-dive-sdr",
    title: "Deep-Dive: SDR Labels",
    points: [
      "Focus: invests mainly in assets aligned to sustainability themes or standards.",
      "Improvers: invests mainly in assets expected to improve sustainability over time; stewardship is central.",
      "Impact: invests mainly in solutions aiming for positive, measurable outcomes; uses a theory of change and KPIs.",
      "Mixed Goals: invests mainly in a mix of the above.",
      "Timeline cues: labels visible from 31 Jul 2024; from 2 Apr 2025 unlabeled funds making claims must provide simple explanations and why no label statements.",
      "Client updates: label users provide annual progress updates against objectives."
    ]
  },
  {
    id: "deep-dive-agw",
    title: "Deep-Dive: Anti-Greenwashing",
    points: [
      "Claims must be correct & substantiated (evidence held and reviewed).",
      "Clear for the intended audience (explain terms; avoid vague language).",
      "Complete (no cherry-picking; state conditions/limitations; consider lifecycle).",
      "Fair & meaningful comparisons (compare like-with-like; disclose scope/limits).",
      "Visuals matter: images/colours/logos must not over-imply sustainability.",
      "Good practice: publish supporting evidence or frameworks; keep an audit trail."
    ]
  },
  {
    id: "deep-dive-choices",
    title: "Deep-Dive: Investment Choices (KBS)",
    points: [
      "Conventional / Conventional + ESG: financial risk/return objective; ESG integration manages material risks/opportunities.",
      "Improvers: engagement priorities, escalation, and voting; examples of improvement KPIs (e.g., CO2e/intensity trends; safety incidents).",
      "Focus: thematic allocations (e.g., water/health/clean energy/circular economy); diversification considerations.",
      "Impact: theory of change, KPIs (e.g., affordable housing units, CO2e avoided), additionality and measurement challenges.",
      "Mixed Goals: blended approach with guardrails (minimum percentages per pillar, rebalancing rules).",
      "Ethical: values-based screens (e.g., tobacco, controversial weapons, animal testing, human rights); universe effects.",
      "Philanthropy: optional complement (SDG-linked giving strategies)."
    ]
  },
  {
    id: "deep-dive-managers",
    title: "Deep-Dive: How Managers Decide",
    points: [
      "Objectives & policy (label-aligned; exclusions; impact intent).",
      "Metrics & plain numbers (e.g., “£67 of every £100” aligned to a theme; implied temperature; relative carbon footprint).",
      "Context & evaluative cues (benchmarks, ranges, thresholds).",
      "Stewardship (priority issues, escalation steps, voting records).",
      "Evidence & balance (publish constraints and negatives to avoid cherry-picking).",
      "Annual updates (progress vs objectives/KPIs; what changed and why)."
    ]
  },
  {
    id: "deep-dive-cobs",
    title: "Deep-Dive: Suitability (COBS 9A)",
    points: [
      "Gather knowledge & experience, financial situation (including ability to bear loss), objectives/risk tolerance.",
      "No recommendation if sufficient information is not obtained.",
      "Suitability report: explains how the advice meets your preferences/objectives; periodic updates where relevant."
    ]
  },
  {
    id: "deep-dive-prod",
    title: "Deep-Dive: Product Governance (PROD 3)",
    points: [
      "Manufacturers: target market (granular), distribution strategy, product testing, regular reviews, conflicts management, oversight & competence.",
      "Distributors: understand products, own target market, best-interests distribution, monitor sales (including outside target market), periodic reviews, oversight & competence."
    ]
  },
  {
    id: "deep-dive-design",
    title: "Deep-Dive: Disclosures & Design",
    points: [
      "Behaviourally-informed factsheets improve comprehension vs technical documents alone.",
      "Use plain numbers (pounds/frequencies) and pre-calculate where possible.",
      "Provide context and evaluative cues; indicate better/worse visually.",
      "Present the single-label description for the product in hand; avoid overwhelming comparisons."
    ]
  }
];

const INTENTS = [
  {
    intent: "help_overview",
    utterances: ["help", "menu", "what can you do", "show topics"],
    reply_short:
      "I can walk you through ESG, UK SDR labels, anti-greenwashing, your KBS Preference Pathway options, and how advisers translate preferences into suitable advice. Pick a topic to start.",
    actions: [{ type: "show_contents" }]
  },
  {
    intent: "esg_basics",
    utterances: ["what is esg", "esg basics", "environmental social governance"],
    reply_short: "Here’s a quick overview of ESG.",
    actions: [{ type: "show_section", id: "esg_basics", deep_dive_id: "deep-dive-esg" }]
  },
  {
    intent: "sdr_labels",
    utterances: ["what are sdr labels", "uk sustainable labels", "focus vs improvers vs impact vs mixed"],
    reply_short: "Here are the four SDR labels and what they mean.",
    actions: [{ type: "show_section", id: "sdr_labels", deep_dive_id: "deep-dive-sdr" }]
  },
  {
    intent: "anti_greenwashing",
    utterances: ["anti greenwashing", "greenwashing rules", "fair clear not misleading"],
    reply_short: "These are the headline anti-greenwashing requirements.",
    actions: [{ type: "show_section", id: "anti_greenwashing", deep_dive_id: "deep-dive-agw" }]
  },
  {
    intent: "kbs_pathway_overview",
    utterances: ["preference pathway", "investment choices", "kbs options"],
    reply_short: "Here are the KBS Preference Pathway choices.",
    actions: [{ type: "show_section", id: "kbs_choices", deep_dive_id: "deep-dive-choices" }]
  },
  {
    intent: "how_managers_decide",
    utterances: ["how do managers decide it's sustainable", "fund manager role"],
    reply_short: "How managers set objectives, use metrics, and report progress.",
    actions: [{ type: "show_section", id: "managers_decide", deep_dive_id: "deep-dive-managers" }]
  },
  {
    intent: "suitability",
    utterances: ["suitability rules", "what information do you need"],
    reply_short: "How advisers ensure recommendations are suitable.",
    actions: [{ type: "show_section", id: "cobs_9a", deep_dive_id: "deep-dive-cobs" }]
  },
  {
    intent: "product_governance",
    utterances: ["product governance", "target market rules"],
    reply_short: "Target market and distribution responsibilities.",
    actions: [{ type: "show_section", id: "prod_3", deep_dive_id: "deep-dive-prod" }]
  },
  {
    intent: "design_for_understanding",
    utterances: ["disclosures", "factsheet design"],
    reply_short: "What makes disclosures easier to understand.",
    actions: [{ type: "show_section", id: "design_understanding", deep_dive_id: "deep-dive-design" }]
  },
  {
    intent: "deep_dive",
    utterances: ["know more", "tell me more", "more details"],
    reply_short: "Here are more details.",
    actions: [{ type: "deep_dive_current" }]
  },
  {
    intent: "return_to_pack",
    utterances: ["back", "return", "go back"],
    reply_short: "Back to the Education Pack.",
    actions: [{ type: "return_to_pack" }]
  }
];

const buildList = (items) => items.map((item) => `<li>${item}</li>`).join("");

const buildSummaryList = (items) =>
  items.map((item) => `<li>${item}</li>`).join("");

const buildContentsList = () =>
  BASIC_SECTIONS.map((section) => {
    const knowMore = section.knowMoreTarget
      ? ` ▶ <a href="#${section.knowMoreTarget}">Know more</a>`
      : "";
    return `<li><a href="#${section.anchor}">${section.title}</a>${knowMore}</li>`;
  }).join("");

const buildBasicSections = () =>
  BASIC_SECTIONS.map((section) => {
    const summaryList = buildSummaryList(section.summary);
    const knowMoreButton = section.knowMoreTarget
      ? `<p class="education-pack__buttons"><a class="education-pack__button" href="#${section.knowMoreTarget}" role="button">Know more</a></p>`
      : "";
    return `
      <section id="${section.anchor}" class="education-pack__section">
        <h3>${section.title}</h3>
        <ul>${summaryList}</ul>
        ${knowMoreButton}
      </section>
    `;
  }).join("");

const buildDeepDiveSections = () =>
  DEEP_DIVES.map((dive) => `
    <section id="${dive.id}" class="education-pack__section education-pack__section--deep">
      <h3>${dive.title}</h3>
      <ul>${buildSummaryList(dive.points)}</ul>
      <p class="education-pack__buttons"><a class="education-pack__button" href="#contents" role="button">${EDUCATION_PACK_METADATA.ui_defaults.return_button_label}</a></p>
    </section>
  `).join("");

const formatActions = (actions) =>
  actions
    .map((action) => {
      const params = { ...action };
      delete params.type;
      const paramEntries = Object.entries(params)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      return paramEntries ? `${action.type} (${paramEntries})` : action.type;
    })
    .join("; ");

const buildIntents = () =>
  INTENTS.map((intent) => `
    <details>
      <summary><span class="education-pack__intent">${intent.intent}</span></summary>
      <div>
        <p><strong>Utterances:</strong> ${intent.utterances.join(" · ")}</p>
        <p><strong>Short reply:</strong> ${intent.reply_short}</p>
        <p><strong>Actions:</strong> ${formatActions(intent.actions)}</p>
      </div>
    </details>
  `).join("");

export const educationPackHtml = `
  <section class="education-pack__metadata" aria-label="Pack metadata">
    <h3>Pack overview</h3>
    <dl class="education-pack__definition-list">
      <div>
        <dt>Pack ID</dt>
        <dd>${EDUCATION_PACK_METADATA.id}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>${EDUCATION_PACK_METADATA.name}</dd>
      </div>
      <div>
        <dt>Version</dt>
        <dd>${EDUCATION_PACK_METADATA.version} (${EDUCATION_PACK_METADATA.published})</dd>
      </div>
      <div>
        <dt>Owner</dt>
        <dd>${EDUCATION_PACK_METADATA.owner}</dd>
      </div>
      <div>
        <dt>Language</dt>
        <dd>${EDUCATION_PACK_METADATA.language}</dd>
      </div>
      <div>
        <dt>Recognition</dt>
        <dd>${EDUCATION_PACK_METADATA.recognition}</dd>
      </div>
    </dl>
    <div class="education-pack__runtime">
      <h4>Runtime configuration</h4>
      <p><strong>Render policy:</strong> hide internal sections = ${EDUCATION_PACK_METADATA.render_policy.hide_internal_sections ? "yes" : "no"}, client sections only = ${EDUCATION_PACK_METADATA.render_policy.client_sections_only ? "yes" : "no"}</p>
      <p><strong>UI defaults:</strong> buttons style = ${EDUCATION_PACK_METADATA.ui_defaults.buttons_style}; return label = ${EDUCATION_PACK_METADATA.ui_defaults.return_button_label}</p>
      <p><strong>State keys:</strong> ${EDUCATION_PACK_METADATA.state_model.keys.join(", ")}</p>
    </div>
  </section>

  <section class="education-pack__disclaimers" aria-label="Client disclaimers">
    <h3>Client disclaimers</h3>
    <ul>${buildList(EDUCATION_PACK_METADATA.disclaimers_client)}</ul>
  </section>

  <section id="contents" class="education-pack__section" aria-label="Contents">
    <h3>Contents</h3>
    <ol>
      ${buildContentsList()}
    </ol>
  </section>

  <section class="education-pack__section" aria-label="Basic sections">
    <h3>Basic level education</h3>
    ${buildBasicSections()}
  </section>

  <section class="education-pack__section" aria-label="Deep dives">
    <h3>Deep-dive sections</h3>
    ${buildDeepDiveSections()}
  </section>

  <section class="education-pack__section" aria-label="Intents">
    <h3>Client-facing intents</h3>
    <p>Intents emit actions that drive the UI to show a section, open a deep dive, or return to the pack.</p>
    <div class="education-pack__intents">
      ${buildIntents()}
    </div>
  </section>
`;

export const renderEducationPack = (container) => {
  if (!container) {
    return;
  }

  container.innerHTML = educationPackHtml;
  container.dataset.packId = EDUCATION_PACK_METADATA.id;
  container.dataset.packVersion = EDUCATION_PACK_METADATA.version;
};

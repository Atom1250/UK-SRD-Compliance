id: esg_sdr_pack_v2
name: "ESG & SDR Educational Pack — KBS Preference Pathway (v2.0)"
version: "2.0"
date: "2025-10-29"
language: "en-GB"
owner: "KBS Preference Pathway"
doc_type: "chatbot_module_spec"
recognition: "This pack recognises the KBS Preference Pathway as the source framework."
audience: ["retail_investors", "advisers"]
tone: ["clear", "neutral", "client-friendly"]
usage:
  - "Drop-in replacement for prior ESG/SDR bot content"
  - "One file to feed Codex; includes intents, short answers, deep dives, and PDF appendix"
routing_defaults:
  fallback_intent: "help_overview"
  safety:
    anti_greenwashing:
      enforce: true
      rules: ["correct", "clear", "complete", "fair_comparisons"]
  disclaimers:
    - "Educational only; not personal advice."
    - "Investments can go down as well as up; you may not get back the amount invested."
    - "Sustainability/ESG data and methodologies evolve over time."

---

# Table of Contents
- [Micro-Modules (short replies)](#micro-modules-short-replies)
- [Intents & Responses (for Codex routing)](#intents--responses-for-codex-routing)
- [Deep-Dive Educational Content (anchor-linked)](#deep-dive-educational-content-anchor-linked)
  - [What is ESG?](#what-is-esg)
  - [SDR Labels (UK FCA)](#sdr-labels-uk-fca)
  - [Anti-Greenwashing (FG24/3)](#anti-greenwashing-fg243)
  - [KBS Investment Choices (Preference Pathway)](#kbs-investment-choices-preference-pathway)
  - [How Fund Managers Decide “Sustainable” Investments](#how-fund-managers-decide-sustainable-investments)
  - [Suitability (COBS 9A)](#suitability-cobs-9a)
  - [Product Governance (PROD 3)](#product-governance-prod-3)
  - [Disclosures & Design for Understanding](#disclosures--design-for-understanding)
  - [Glossary](#glossary)
- [Appendix: PDF Builder Sections (source text)](#appendix-pdf-builder-sections-source-text)
- [KBS Records & Templates (mapping)](#kbs-records--templates-mapping)
- [Disclaimers & Compliance Guardrails](#disclaimers--compliance-guardrails)
- [Sources (for internal reference)](#sources-for-internal-reference)

---

## Micro-Modules (short replies)

- **ESG basics** → “ESG = Environmental, Social, Governance. It’s a risk‑and‑opportunity lens investors use to assess how companies are run and how they manage environmental & social issues.”
- **SDR labels** → “UK labels: **Focus**, **Improvers**, **Impact**, **Mixed Goals** — four ways funds can set sustainability objectives.”
- **Anti‑greenwashing** → “Claims must be **fair, clear, not misleading**. Visuals and comparisons must not over‑imply sustainability; firms should hold evidence.”
- **Trade‑offs** → “Themes/screens can narrow the investable universe and affect diversification/returns — we’ll flag these so you can decide knowingly.”
- **Product governance** → “Every fund has a defined **target market**. Recommendations must fit this; outside‑target‑market sales are captured and reviewed.”

---

## Intents & Responses (for Codex routing)

> **Implementation note:** Each intent includes *training utterances*, a *short answer*, a *deep‑dive anchor* (for jump navigation), and optional *quick replies*.

### intent: help_overview
utterances:
  - "help"
  - "menu"
  - "what can you do"
  - "show topics"
reply_short: >
  I can explain ESG, UK SDR labels, anti‑greenwashing rules, your KBS Preference Pathway options,
  and how advisers turn preferences into suitable advice. What would you like to explore?
quick_replies: ["What is ESG?", "SDR labels", "Preference Pathway", "Anti‑greenwashing", "Suitability"]

### intent: esg_basics
utterances:
  - "what is esg"
  - "esg basics"
  - "explain environmental social governance"
reply_short: >
  ESG is a lens to assess financially material environmental, social and governance factors in investments.
  It doesn’t automatically mean “sustainable” or “impact” — it’s a process investors use to price risk and find opportunities.
deep_link: "#what-is-esg"
quick_replies: ["SDR labels", "Preference Pathway"]

### intent: sdr_labels
utterances:
  - "what are sdr labels"
  - "uk sustainable labels"
  - "focus vs improvers vs impact vs mixed"
reply_short: >
  The UK’s optional labels are **Focus**, **Improvers**, **Impact**, and **Mixed Goals**. Each sets a different sustainability objective.
  Unlabelled funds making sustainability claims must still provide clear, simple info and say why there’s no label.
deep_link: "#sdr-labels-uk-fca"
quick_replies: ["Improvers vs Focus", "What is Impact?", "Mixed Goals"]

### intent: anti_greenwashing
utterances:
  - "anti greenwashing"
  - "what counts as greenwashing"
  - "fair clear not misleading"
reply_short: >
  Claims must be correct and evidence‑based, clear to the intended audience, complete (no cherry‑picking),
  and fair/meaningful in comparisons. Visuals must not over‑imply sustainability.
deep_link: "#anti-greenwashing-fg243"
quick_replies: ["Examples", "Preference Pathway"]

### intent: kbs_pathway_overview
utterances:
  - "preference pathway"
  - "investment choices"
  - "kbs options"
reply_short: >
  Choose from: Conventional, Conventional + ESG, Sustainability (**Improvers / Focus / Impact / Mixed Goals**),
  Ethical, and optional Philanthropy. You can mix pathways or apply different ones per product.
deep_link: "#kbs-investment-choices-preference-pathway"
quick_replies: ["Improvers", "Focus", "Impact", "Mixed Goals", "Ethical"]

### intent: improvers_detail
utterances:
  - "what is improvers"
  - "explain sustainability improvers"
reply_short: >
  Invests mainly in assets that may not be sustainable now but **aim to improve** over time, typically using stewardship and engagement.
deep_link: "#sustainability-improvers"
quick_replies: ["How managers decide", "Focus", "Impact"]

### intent: focus_detail
utterances:
  - "what is focus"
  - "sustainability focus label"
reply_short: >
  Invests mainly in assets that **focus on sustainability** (themes/standards). Narrower universes may affect diversification.
deep_link: "#sustainability-focus"
quick_replies: ["Improvers", "Impact", "Mixed Goals"]

### intent: impact_detail
utterances:
  - "what is impact"
  - "sustainability impact label"
reply_short: >
  Invests mainly in **solutions** to sustainability problems with an aim to achieve a **positive, measurable impact** using a theory of change and KPIs.
deep_link: "#sustainability-impact"
quick_replies: ["How managers decide", "Mixed Goals"]

### intent: mixed_goals_detail
utterances:
  - "mixed goals label"
  - "how does mixed goals work"
reply_short: >
  A blended allocation across Focus, Improvers and Impact approaches. Can be manager‑driven or tailored via your preferences.
deep_link: "#sustainability-mixed-goals"
quick_replies: ["Improvers", "Focus", "Impact"]

### intent: ethical_investing
utterances:
  - "ethical investing"
  - "values based investing"
reply_short: >
  Apply personal values via exclusions and/or positive screens (e.g., tobacco or human‑rights screens). A restricted universe can affect risk/return.
deep_link: "#ethical-investment"
quick_replies: ["Preference Pathway", "Suitability"]

### intent: how_managers_decide
utterances:
  - "how do managers decide it's sustainable"
  - "fund manager role"
reply_short: >
  Managers set objectives and policies; use clear metrics and plain numbers; practice stewardship (especially for Improvers);
  keep evidence; and provide client‑friendly annual progress updates.
deep_link: "#how-fund-managers-decide-sustainable-investments"
quick_replies: ["Anti‑greenwashing", "SDR labels"]

### intent: suitability
utterances:
  - "suitability rules"
  - "what information do you need about me"
reply_short: >
  Advisers assess your knowledge/experience, financial situation (incl. ability to bear loss) and objectives/risk tolerance.
  If sufficient info isn’t obtained, no personal recommendation can be made. You’ll receive a written suitability report.
deep_link: "#suitability-cobs-9a"
quick_replies: ["Preference Pathway", "Product governance"]

### intent: product_governance
utterances:
  - "product governance"
  - "target market rules"
reply_short: >
  Manufacturers define target markets and share product info; distributors must understand products, set their own target market,
  ensure distribution in clients’ best interests, and review arrangements regularly.
deep_link: "#product-governance-prod-3"
quick_replies: ["Suitability", "Preference Pathway"]

### intent: tradeoffs
utterances:
  - "are there trade offs"
  - "risks of sustainable funds"
reply_short: >
  Thematic screens can narrow the investable universe and affect diversification and risk/return.
  Outcomes depend on manager selection, portfolio construction, and your chosen preferences.
deep_link: "#kbs-investment-choices-preference-pathway"
quick_replies: ["How managers decide", "Suitability"]

---

## Deep-Dive Educational Content (anchor-linked)

### What is ESG?
ESG is a structured way to evaluate financially material factors:
- **Environmental**: climate & carbon, resource use, pollution, biodiversity.
- **Social**: workforce, supply chains, safety & well‑being, human rights.
- **Governance**: board oversight, audit, pay, ethics, controls, cyber.

> ESG integration alone doesn’t make a fund “sustainable” or “impact”; it’s an analysis lens for risk and opportunity.

### SDR Labels (UK FCA)
**Labels (optional, criteria‑based):**
- **Sustainability Focus** — invest mainly in assets that **focus on sustainability**.
- **Sustainability Improvers** — invest mainly in assets that **aim to improve** over time (often via stewardship).
- **Sustainability Impact** — invest mainly in **solutions** with an aim to achieve a **positive, measurable impact**.
- **Sustainability Mixed Goals** — invest mainly in a **mix** of Focus/Improvers/Impact assets.

**Client cues:** Labels visible from **31 Jul 2024**; from **2 Apr 2025**, unlabeled funds making sustainability claims must provide clear, simple explanations and a statement on *why no label*.

### Anti‑Greenwashing (FG24/3)
Product/service claims must be:
- **Correct & substantiated** (evidence held and reviewed).
- **Clear & understandable** (avoid vague terms; explain technical terms).
- **Complete** (no cherry‑picking; state conditions/limitations; consider lifecycle).
- **Fair & meaningful** in comparisons (compare like‑with‑like; disclose scope/limits).  
**Visuals matter**: images/logos/colours must not over‑imply sustainability.

### KBS Investment Choices (Preference Pathway)
KBS framework for aligning client choices and records (may combine strategies and/or set different pathways per product):
- **Conventional** — financial risk/return objective; no explicit sustainability objective.
- **Conventional including ESG** — financial risk/return objective + ESG integration in research/risk management.
- **Sustainability: Improvers** — aim to improve sustainability over time; stewardship/engagement central.
- **Sustainability: Focus** — align to environmental/social themes or standards; narrower universes can affect diversification.
- **Sustainability: Impact** — solutions‑oriented; measurable outcomes with theory of change and KPIs; annual progress updates.
- **Sustainability: Mixed Goals** — blended allocation across Focus/Improvers/Impact.
- **Ethical Investment** — values‑based screens; universe restrictions vary by criteria.
- **Philanthropy** — optional complement (giving linked to priority causes/SDGs).

### How Fund Managers Decide “Sustainable” Investments
Common practices:
- **Objectives & policy** (label‑aligned goals; explain exclusions, stewardship).
- **Metrics & plain numbers** (e.g., “£67 of every £100”, implied temperature rise, relative carbon footprint), with **context** and **evaluative cues**.
- **Stewardship** (engagement priorities, escalation, voting), especially for **Improvers**.
- **Evidence & balance** (keep audit trails; disclose limitations and negatives).
- **Annual updates** (label users provide client‑friendly progress against KPIs).

### Suitability (COBS 9A)
Advisers gather: **knowledge/experience**, **financial situation/ability to bear loss**, **objectives/risk tolerance**.  
- No personal recommendation if sufficient info isn’t obtained.
- Suitability reports explain how advice fits preferences/objectives; periodic statements where relevant.

### Product Governance (PROD 3)
- **Manufacturers**: define target market (granular), align distribution strategy, share product info, review products regularly, manage conflicts, ensure competence & oversight.
- **Distributors**: understand products, set own target market, ensure distribution is in clients’ best interests, monitor sales (incl. outside target market), review arrangements; management oversight and competence apply.

### Disclosures & Design for Understanding
FCA evidence shows behaviourally‑informed factsheets improve comprehension vs KIIDs alone:
- Provide **single‑label** description for the product in hand.
- Use **plain numbers** (pounds/frequencies), pre‑calculate, avoid excess jargon.
- Add **context** and **evaluative cues** for key metrics; indicate better/worse visually.
- Time the disclosure to points of decision; encourage engagement.

### Glossary
- **ESG integration** — considering environmental, social and governance factors in investment analysis/risk management.
- **Stewardship** — engagement and voting to influence investee companies.
- **Theory of change** — how a strategy expects to create measurable outcomes.
- **Implied temperature rise** — a portfolio‑level warming pathway metric.
- **Relative carbon footprint** — carbon per unit invested vs benchmark.

---

## Appendix: PDF Builder Sections (source text)

> Use this section as the source to compile/refresh the client/compliance PDF.

- **Front matter**: ESG & SDR Educational Pack — Detailed Guide (v2.0, KBS Preference Pathway Edition); last updated 2025-10-29.
- **1. What ESG is — and is not**: ESG factors; ESG ≠ automatically sustainable/impact.
- **2. UK SDR labels (client‑friendly overview)**: Focus, Improvers, Impact, Mixed Goals; timeline cues; unlabeled claimants must provide simple info + “why no label” statement.
- **3. Anti‑Greenwashing (FG24/3)**: Correct; Clear; Complete; Fair/meaningful comparisons; visuals must be consistent.
- **4. Investment choices (KBS Preference Pathway)**: Conventional; Conventional+ESG; Improvers; Focus; Impact; Mixed Goals; Ethical; Philanthropy — with notes on trade‑offs and stewardship.
- **5. How fund managers decide**: objectives/policy; plain numbers & metrics; stewardship; evidence & balance; annual updates.
- **6. Suitability (COBS 9A)**: info to obtain; no rec if insufficient info; suitability reports; periodic review statements.
- **7. Product governance (PROD 3)**: manufacturer vs distributor duties; target market; oversight; competence; review.
- **8. Designing disclosures**: one‑page summaries; plain numbers; context; evaluative cues; avoid overwhelming comparisons.
- **9. Key client notices**: risk warnings; screens and diversification; evolving data/methods; educational‑only disclaimer.

---

## KBS Records & Templates (mapping)

- **Informed Choice: Preference Pathway (client guide)** → maps to [KBS Investment Choices](#kbs-investment-choices-preference-pathway)
- **Preference Pathway Record (client & adviser)** → capture chosen pathway(s), % allocations, notes, and signatures.
- **Anti-Greenwashing Checklist (compliance)** → verify claims are **correct, clear, complete, fair**; check visuals and comparisons.

---

## Disclaimers & Compliance Guardrails

- **Educational only; not advice.** Ask your adviser for personalised recommendations.
- **Anti-greenwashing**: ensure product/service claims are **correct, clear, complete, and fair**; visuals must not over-imply sustainability.
- **Trade-offs**: thematic or exclusionary strategies can impact diversification and risk/return.
- **Suitability & target market**: apply COBS 9A and PROD 3 duties when turning preferences into advice.
- **Updates**: sustainability data and methodologies evolve; labels/disclosures may change over time.

---

## Sources (for internal reference)

- UK FCA: **Sustainable investment labels & anti-greenwashing** (labels, timelines, consumer disclosures).  
- UK FCA: **FG24/3 Anti-Greenwashing Guidance** (correct/clear/complete/fair + visuals).  
- UK FCA: **Occasional Paper 62** (factsheet design; plain numbers; single-label display; improved comprehension).  
- FCA Handbook: **COBS 9A** (suitability duties; suitability reports; periodic statements).  
- FCA Handbook: **PROD 3** (product governance; target market; distribution oversight).  
- **KBS Preference Pathway** documents (client education & record templates).

# Conversation Flow Script (Segments A–H)

## Segment A — Explanation
Bot: "Welcome! I’ll guide you through ESG investing and collect the information your adviser needs to act in your best interests. I’ll explain plainly and send a summary at the end."
Log: explanation_shown=true

---

## Segment B — Onboarding (Suitability Core)
Questions (slots):
1. client_type — "Are you investing as an individual, joint, trust, or company?"
2. objectives — "What’s your main goal? (growth/income/preservation/impact/other)"
3. horizon_years — "How long do you expect to keep this money invested?"
4. risk_tolerance — "How comfortable are you with investment risk, from 1 (very low) to 7 (very high)?"
5. capacity_for_loss — "If markets fall, how much loss could you afford without affecting your lifestyle?"
6. liquidity_needs — "Will you need to withdraw funds at specific times?"
7. knowledge_experience — "Have you invested before? Which instruments? How often? For how long?"
8. financial_situation — "Would you like to record income, assets, and liabilities for context?"

Validation rules:
- Block progression if mandatory fields missing.
- Warn if horizon <3y and risk ≥5.
- If capacity_for_loss = low and risk ≥5 → require explicit override.

---

## Segment C — Consent
Bot: "We need your permission to record your answers for regulatory reporting."
1. consent.data_processing (Y/N + timestamp)
2. consent.e_delivery (Y/N)
3. consent.future_contact (Y/N, purpose)

---

## Segment D — Educational (ESG & SDR Pack v2.0)
Content is served from `EDUCATION_PACK_METADATA` (id `esg_sdr_pack_v2`, version 2.0, 2025-10-29).

Delivery order:
1. Confirm micro-module quick reply relevance (ESG basics → SDR labels → Anti-greenwashing → Trade-offs → Product governance).
2. Offer deeper intents when the client asks (per `EDUCATION_INTENTS`, includes deep links and quick replies).
3. Provide deep-dive modules on request:
   - What is ESG?
   - SDR labels (Focus, Improvers, Impact, Mixed Goals and timeline cues).
   - Anti-Greenwashing (FG24/3) obligations.
   - KBS Investment Choices (Conventional, Conventional + ESG, Sustainability pathways, Ethical, Philanthropy).
   - How fund managers decide “sustainable” investments (objectives, metrics, stewardship, evidence, updates).
   - Suitability (COBS 9A) duties.
   - Product Governance (PROD 3) duties.
   - Disclosures & design for understanding (plain numbers, context, single-label display).
   - Trade-offs & diversification, Ethical investing, SDGs and other preference-driven themes.

Compliance hooks:
- Every summary ends with anti-greenwashing and suitability guardrails plus pack disclaimers.
- Log educational requests with module slug, interaction type, and comprehension check outcomes.

Comprehension flow:
1. Bot: "Would you like a quick overview or the full ESG & SDR educational pack (v2.0)?"
2. If client accepts full pack → log `educ_pack_sent=true`, trigger PDF generation via `generateComprehensiveEducationPack()`.
3. After each module: "Does that answer your question?" followed by the module-specific comprehension check where applicable.

---

## Segment E — Options & Labelling (KBS Pathway)
Branching logic:
- If preference_level=none → skip to summary.
- If high_level → collect labels_interest[].
- If detailed → collect labels_interest[], themes[], exclusions[], impact_goals, engagement_importance, reporting_frequency_pref, tradeoff_tolerance.

Validations:
- If Impact chosen → require impact_goals + reporting_frequency_pref != none.
- If exclusions include fossil fuels → force numeric threshold.

---

## Segment F — Data Confirmation
Bot: "Here’s what you told me..." [recap]
User confirms (Yes/Edit).
Store: summary_confirmation.client_summary_confirmed=true

---

## Segment G — Form Completion & Suitability Report
- Map answers to KBS fields: client_profile, sustainability_preferences, advice_outcome, disclosures.
- Auto-generate PDF report from suitability_report_template.md.
- Store PDF hash + timestamp.

---

## Segment H — Delivery
Bot: "I’ve prepared your personalised pack: (1) Summary of your needs, (2) Sustainability preferences, (3) FCA label explainer, (4) Next steps."
Outputs:
- Client Summary PDF
- ESG & SDR Educational Pack v2.0 (comprehensive PDF + module log)
- Disclosure bundle (product docs attached later)

---

## Adaptive Dialogue Enhancements
- Warm tone with acknowledgements ("Thanks for sharing...", "That makes sense.") and confirmation prompts restating the client's goals and horizon.
- Educational detours: when the client asks for explainers (e.g. "Tell me more about Impact investing"), the assistant delivers a short summary, offers a PDF, logs the topic in `educational_requests[]`, then asks, "Would you like to continue where we left off?"
- Compliance clarifications: if the client asks "Why do you need that?", the assistant explains the relevant COBS 9A/PROD requirement, logs the query in `extra_questions[]`, and re-asks the pending suitability question.
- Progress reminder midway through ("We're halfway through. Just a few more questions about your ESG preferences.").
- Additional audit notes recorded in `additional_notes` for adviser context.

---

# Compliance Guardrails
- Consumer Duty: plain language + comprehension checks.
- COBS 9A: suitability fields complete before recommendation.
- PROD 3: target-market match required; block if insufficient manufacturer info.
- Anti-Greenwashing: ESG claims gated by attached disclosures.
- Audit trail: timestamps, policy version, evidence docs stored with hash.

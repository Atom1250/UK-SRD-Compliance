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

## Segment D — Educational (ESG & SDR/AGR)
Modules:
1. What ESG means (factors, not a guarantee).
2. SDR labels: Focus, Improvers, Impact, Mixed Goals.
3. Anti-Greenwashing Rule: only evidence-backed claims.
4. Product disclosures will always be attached.

Comprehension check:
Bot: "Would you like me to summarise the difference between Focus and Improvers?"
Log: educ_pack_sent=true

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
- ESG & SDR explainer (KBS doc)
- Disclosure bundle (product docs attached later)

---

# Compliance Guardrails
- Consumer Duty: plain language + comprehension checks.
- COBS 9A: suitability fields complete before recommendation.
- PROD 3: target-market match required; block if insufficient manufacturer info.
- Anti-Greenwashing: ESG claims gated by attached disclosures.
- Audit trail: timestamps, policy version, evidence docs stored with hash.

export const AUTHORIZED_INVESTMENTS = [
  {
    id: "aurora_green_growth",
    name: "Aurora Green Growth Fund",
    type: "Global Equity Fund",
    provider: "Aurora Asset Management",
    objectives: ["growth", "impact"],
    labels: ["Sustainability: Impact"],
    themes: ["Climate", "Energy transition"],
    exclusions_supported: ["Thermal coal under 5%", "Tobacco 0%"],
    risk_band: [4, 6],
    min_horizon_years: 5,
    preference_levels: ["high_level", "detailed"],
    summary:
      "Global equities focusing on companies delivering measurable climate transition outcomes with active stewardship.",
    charges: "0.78% ongoing charge"
  },
  {
    id: "sterling_sustainable_income",
    name: "Sterling Sustainable Income Bond",
    type: "Global Bond Fund",
    provider: "Sterling Fixed Income Partners",
    objectives: ["income", "preservation"],
    labels: ["Sustainability: Improvers"],
    themes: ["Social", "Climate"],
    exclusions_supported: ["Thermal coal under 10%", "Controversial weapons 0%"],
    risk_band: [2, 4],
    min_horizon_years: 3,
    preference_levels: ["high_level", "detailed"],
    summary:
      "Diversified investment grade bond portfolio engaging issuers on climate transition and workforce standards.",
    charges: "0.52% ongoing charge"
  },
  {
    id: "harbor_balanced_focus",
    name: "Harbor ESG Balanced Focus Portfolio",
    type: "Multi-Asset Model Portfolio",
    provider: "Harbor Advisory Services",
    objectives: ["growth", "preservation"],
    labels: ["Sustainability: Focus"],
    themes: ["Climate", "Biodiversity", "Corporate governance"],
    exclusions_supported: ["Thermal coal under 5%", "Tobacco 0%", "Predatory lending 0%"],
    risk_band: [3, 5],
    min_horizon_years: 4,
    preference_levels: ["high_level", "detailed"],
    summary:
      "Blended equity and bond model emphasising companies already leading on sustainability metrics.",
    charges: "0.68% ongoing charge"
  }
];

export const MARKET_ALTERNATIVES = [
  {
    id: "solstice_global_impact",
    name: "Solstice Global Impact Opportunities",
    type: "Global Equity Fund",
    provider: "Solstice Capital",
    objectives: ["growth", "impact"],
    labels: ["Sustainability: Impact"],
    themes: ["Climate", "Health"],
    exclusions_supported: ["Thermal coal under 0%", "Tobacco 0%"],
    risk_band: [4, 6],
    min_horizon_years: 5,
    preference_levels: ["detailed"],
    summary:
      "Concentrated portfolio targeting companies with verified impact metrics and outcome-linked remuneration.",
    charges: "0.85% ongoing charge"
  },
  {
    id: "northstar_responsible_credit",
    name: "Northstar Responsible Credit Fund",
    type: "Corporate Bond Fund",
    provider: "Northstar Asset Co.",
    objectives: ["income", "preservation"],
    labels: ["Sustainability: Improvers"],
    themes: ["Social", "Climate"],
    exclusions_supported: ["Thermal coal under 20%", "Civilian firearms 0%"],
    risk_band: [2, 4],
    min_horizon_years: 3,
    preference_levels: ["high_level", "detailed"],
    summary:
      "Investment grade credit fund with structured engagement milestones for issuers on net-zero and labour standards.",
    charges: "0.60% ongoing charge"
  }
];

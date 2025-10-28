export const AUTHORIZED_INVESTMENTS = [
  {
    id: "aurora_green_growth",
    name: "Aurora Green Growth Fund",
    type: "Global Equity Fund",
    provider: "Aurora Asset Management",
    objectives: ["growth", "impact"],
    labels: ["Sustainability: Impact"],
    themes: ["Climate", "Energy transition"],
    exclusions: {
      "thermal_coal": { threshold: 5, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" },
      "controversial_weapons": { threshold: 0, unit: "percent" }
    },
    exclusions_supported: ["Thermal coal under 5%", "Tobacco 0%"],
    risk_band: [4, 6],
    min_horizon_years: 5,
    preference_levels: ["high_level", "detailed"],
    summary: "Global equities focusing on companies delivering measurable climate transition outcomes with active stewardship.",
    charges: "0.78% ongoing charge",
    asset_allocation: {
      "equities": 100,
      "bonds": 0,
      "alternatives": 0
    },
    geographic_exposure: {
      "developed_markets": 85,
      "emerging_markets": 15
    },
    sector_weights: {
      "technology": 25,
      "industrials": 20,
      "utilities": 15,
      "materials": 12,
      "consumer_discretionary": 10,
      "healthcare": 8,
      "financials": 5,
      "other": 5
    },
    impact_metrics: {
      "carbon_intensity_reduction": "40% vs benchmark",
      "green_revenue_exposure": "60% minimum",
      "engagement_companies": "100% of holdings"
    },
    liquidity: "daily",
    minimum_investment: 1000,
    currency: "GBP",
    benchmark: "MSCI World Index",
    inception_date: "2019-03-15",
    fund_size: 450000000,
    volatility_3yr: 18.5,
    sharpe_ratio_3yr: 0.85
  },
  {
    id: "sterling_sustainable_income",
    name: "Sterling Sustainable Income Bond",
    type: "Global Bond Fund",
    provider: "Sterling Fixed Income Partners",
    objectives: ["income", "preservation"],
    labels: ["Sustainability: Improvers"],
    themes: ["Social", "Climate"],
    exclusions: {
      "thermal_coal": { threshold: 10, unit: "percent" },
      "controversial_weapons": { threshold: 0, unit: "percent" },
      "tobacco": { threshold: 5, unit: "percent" }
    },
    exclusions_supported: ["Thermal coal under 10%", "Controversial weapons 0%"],
    risk_band: [2, 4],
    min_horizon_years: 3,
    preference_levels: ["high_level", "detailed"],
    summary: "Diversified investment grade bond portfolio engaging issuers on climate transition and workforce standards.",
    charges: "0.52% ongoing charge",
    asset_allocation: {
      "equities": 0,
      "bonds": 95,
      "cash": 5
    },
    geographic_exposure: {
      "developed_markets": 75,
      "emerging_markets": 25
    },
    credit_quality: {
      "aaa": 15,
      "aa": 25,
      "a": 35,
      "bbb": 20,
      "below_investment_grade": 5
    },
    duration: 4.2,
    yield_to_maturity: 3.8,
    liquidity: "daily",
    minimum_investment: 500,
    currency: "GBP",
    benchmark: "Bloomberg Global Aggregate Bond Index",
    inception_date: "2018-09-20",
    fund_size: 280000000,
    volatility_3yr: 4.2,
    sharpe_ratio_3yr: 0.65
  },
  {
    id: "harbor_balanced_focus",
    name: "Harbor ESG Balanced Focus Portfolio",
    type: "Multi-Asset Model Portfolio",
    provider: "Harbor Advisory Services",
    objectives: ["growth", "preservation"],
    labels: ["Sustainability: Focus"],
    themes: ["Climate", "Biodiversity", "Corporate governance"],
    exclusions: {
      "thermal_coal": { threshold: 5, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" },
      "predatory_lending": { threshold: 0, unit: "percent" },
      "controversial_weapons": { threshold: 0, unit: "percent" }
    },
    exclusions_supported: ["Thermal coal under 5%", "Tobacco 0%", "Predatory lending 0%"],
    risk_band: [3, 5],
    min_horizon_years: 4,
    preference_levels: ["high_level", "detailed"],
    summary: "Blended equity and bond model emphasising companies already leading on sustainability metrics.",
    charges: "0.68% ongoing charge",
    asset_allocation: {
      "equities": 60,
      "bonds": 35,
      "alternatives": 5
    },
    geographic_exposure: {
      "developed_markets": 80,
      "emerging_markets": 20
    },
    liquidity: "daily",
    minimum_investment: 1000,
    currency: "GBP",
    benchmark: "60% MSCI World / 40% Bloomberg Global Aggregate",
    inception_date: "2020-01-10",
    fund_size: 320000000,
    volatility_3yr: 12.8,
    sharpe_ratio_3yr: 0.75,
    rebalancing_frequency: "quarterly"
  },
  {
    id: "meridian_climate_solutions",
    name: "Meridian Climate Solutions Fund",
    type: "Thematic Equity Fund",
    provider: "Meridian Investment Partners",
    objectives: ["growth", "impact"],
    labels: ["Sustainability: Impact"],
    themes: ["Climate", "Clean energy", "Water"],
    exclusions: {
      "fossil_fuels": { threshold: 0, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" },
      "controversial_weapons": { threshold: 0, unit: "percent" },
      "gambling": { threshold: 0, unit: "percent" }
    },
    exclusions_supported: ["Fossil fuels 0%", "Tobacco 0%", "Controversial weapons 0%"],
    risk_band: [5, 7],
    min_horizon_years: 7,
    preference_levels: ["detailed"],
    summary: "Concentrated portfolio investing in companies providing climate solutions with measurable environmental impact.",
    charges: "0.95% ongoing charge",
    asset_allocation: {
      "equities": 100,
      "bonds": 0,
      "alternatives": 0
    },
    geographic_exposure: {
      "developed_markets": 70,
      "emerging_markets": 30
    },
    sector_weights: {
      "renewable_energy": 35,
      "energy_efficiency": 20,
      "sustainable_transport": 15,
      "water_technology": 12,
      "waste_management": 10,
      "green_building": 8
    },
    impact_metrics: {
      "carbon_avoided_tonnes": "2.5M tonnes annually",
      "renewable_energy_capacity": "15GW portfolio exposure",
      "water_saved_million_litres": "500M litres annually"
    },
    liquidity: "daily",
    minimum_investment: 2500,
    currency: "GBP",
    benchmark: "MSCI World Index",
    inception_date: "2021-06-01",
    fund_size: 180000000,
    volatility_3yr: 22.1,
    sharpe_ratio_3yr: 0.68
  },
  {
    id: "ethical_income_plus",
    name: "Ethical Income Plus Fund",
    type: "UK Equity Income Fund",
    provider: "Ethical Investment Trust",
    objectives: ["income", "growth"],
    labels: ["Sustainability: Focus"],
    themes: ["Social", "Corporate governance", "Environmental"],
    exclusions: {
      "tobacco": { threshold: 0, unit: "percent" },
      "alcohol": { threshold: 5, unit: "percent" },
      "gambling": { threshold: 0, unit: "percent" },
      "weapons": { threshold: 0, unit: "percent" },
      "fossil_fuels": { threshold: 10, unit: "percent" }
    },
    exclusions_supported: ["Tobacco 0%", "Gambling 0%", "Weapons 0%", "Fossil fuels under 10%"],
    risk_band: [3, 5],
    min_horizon_years: 3,
    preference_levels: ["high_level", "detailed"],
    summary: "UK-focused equity income fund applying ethical screening with strong dividend yield.",
    charges: "0.65% ongoing charge",
    asset_allocation: {
      "equities": 95,
      "cash": 5
    },
    geographic_exposure: {
      "uk": 100
    },
    dividend_yield: 4.2,
    liquidity: "daily",
    minimum_investment: 500,
    currency: "GBP",
    benchmark: "FTSE All-Share Index",
    inception_date: "2015-04-20",
    fund_size: 420000000,
    volatility_3yr: 16.3,
    sharpe_ratio_3yr: 0.58
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
    exclusions: {
      "thermal_coal": { threshold: 0, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" },
      "controversial_weapons": { threshold: 0, unit: "percent" },
      "fossil_fuels": { threshold: 0, unit: "percent" }
    },
    exclusions_supported: ["Thermal coal under 0%", "Tobacco 0%"],
    risk_band: [4, 6],
    min_horizon_years: 5,
    preference_levels: ["detailed"],
    summary: "Concentrated portfolio targeting companies with verified impact metrics and outcome-linked remuneration.",
    charges: "0.85% ongoing charge",
    asset_allocation: {
      "equities": 100,
      "bonds": 0,
      "alternatives": 0
    },
    geographic_exposure: {
      "developed_markets": 60,
      "emerging_markets": 40
    },
    sector_weights: {
      "healthcare": 30,
      "technology": 25,
      "industrials": 20,
      "utilities": 15,
      "consumer_staples": 10
    },
    impact_metrics: {
      "lives_impacted": "50M people annually",
      "carbon_intensity_reduction": "60% vs benchmark",
      "sdg_alignment_score": "85/100"
    },
    liquidity: "daily",
    minimum_investment: 5000,
    currency: "GBP",
    benchmark: "MSCI World Index",
    inception_date: "2020-11-15",
    fund_size: 95000000,
    volatility_3yr: 19.8,
    sharpe_ratio_3yr: 0.72
  },
  {
    id: "northstar_responsible_credit",
    name: "Northstar Responsible Credit Fund",
    type: "Corporate Bond Fund",
    provider: "Northstar Asset Co.",
    objectives: ["income", "preservation"],
    labels: ["Sustainability: Improvers"],
    themes: ["Social", "Climate"],
    exclusions: {
      "thermal_coal": { threshold: 20, unit: "percent" },
      "civilian_firearms": { threshold: 0, unit: "percent" },
      "tobacco": { threshold: 10, unit: "percent" }
    },
    exclusions_supported: ["Thermal coal under 20%", "Civilian firearms 0%"],
    risk_band: [2, 4],
    min_horizon_years: 3,
    preference_levels: ["high_level", "detailed"],
    summary: "Investment grade credit fund with structured engagement milestones for issuers on net-zero and labour standards.",
    charges: "0.60% ongoing charge",
    asset_allocation: {
      "bonds": 90,
      "cash": 10
    },
    geographic_exposure: {
      "developed_markets": 70,
      "emerging_markets": 30
    },
    credit_quality: {
      "aaa": 10,
      "aa": 20,
      "a": 40,
      "bbb": 25,
      "below_investment_grade": 5
    },
    duration: 3.8,
    yield_to_maturity: 4.1,
    liquidity: "daily",
    minimum_investment: 1000,
    currency: "GBP",
    benchmark: "Bloomberg Global Corporate Bond Index",
    inception_date: "2019-08-10",
    fund_size: 150000000,
    volatility_3yr: 5.1,
    sharpe_ratio_3yr: 0.62
  },
  {
    id: "vanguard_esg_developed",
    name: "Vanguard ESG Developed World Fund",
    type: "Global Equity Index Fund",
    provider: "Vanguard Asset Management",
    objectives: ["growth"],
    labels: ["Sustainability: Focus"],
    themes: ["Environmental", "Social", "Corporate governance"],
    exclusions: {
      "controversial_weapons": { threshold: 0, unit: "percent" },
      "civilian_firearms": { threshold: 0, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" },
      "thermal_coal": { threshold: 5, unit: "percent" }
    },
    exclusions_supported: ["Controversial weapons 0%", "Tobacco 0%", "Thermal coal under 5%"],
    risk_band: [4, 6],
    min_horizon_years: 5,
    preference_levels: ["high_level"],
    summary: "Low-cost passive ESG-screened exposure to developed market equities with broad diversification.",
    charges: "0.12% ongoing charge",
    asset_allocation: {
      "equities": 100,
      "bonds": 0
    },
    geographic_exposure: {
      "developed_markets": 100,
      "emerging_markets": 0
    },
    liquidity: "daily",
    minimum_investment: 100,
    currency: "GBP",
    benchmark: "FTSE Developed ESG Index",
    inception_date: "2018-05-22",
    fund_size: 2800000000,
    volatility_3yr: 17.2,
    sharpe_ratio_3yr: 0.81
  },
  {
    id: "blackrock_sustainable_energy",
    name: "BlackRock Sustainable Energy Fund",
    type: "Sector Equity Fund",
    provider: "BlackRock Investment Management",
    objectives: ["growth", "impact"],
    labels: ["Sustainability: Impact"],
    themes: ["Clean energy", "Climate", "Energy transition"],
    exclusions: {
      "fossil_fuels": { threshold: 0, unit: "percent" },
      "nuclear_power": { threshold: 5, unit: "percent" },
      "tobacco": { threshold: 0, unit: "percent" }
    },
    exclusions_supported: ["Fossil fuels 0%", "Nuclear power under 5%"],
    risk_band: [5, 7],
    min_horizon_years: 7,
    preference_levels: ["detailed"],
    summary: "Focused investment in renewable energy and clean technology companies driving the energy transition.",
    charges: "0.75% ongoing charge",
    asset_allocation: {
      "equities": 95,
      "cash": 5
    },
    geographic_exposure: {
      "developed_markets": 75,
      "emerging_markets": 25
    },
    sector_weights: {
      "renewable_energy": 45,
      "energy_storage": 20,
      "smart_grid": 15,
      "electric_vehicles": 12,
      "energy_efficiency": 8
    },
    liquidity: "daily",
    minimum_investment: 1000,
    currency: "GBP",
    benchmark: "S&P Global Clean Energy Index",
    inception_date: "2020-03-01",
    fund_size: 380000000,
    volatility_3yr: 28.5,
    sharpe_ratio_3yr: 0.55
  }
];

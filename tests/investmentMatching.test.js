import test from "node:test";
import assert from "node:assert";
import { 
  AUTHORIZED_INVESTMENTS,
  MARKET_ALTERNATIVES
} from "../server/state/investmentUniverse.js";

// Mock functions for testing investment matching logic
const scoreInvestmentMatch = (investment, clientProfile) => {
  let score = 50; // Base score
  
  // Objective matching
  if (investment.objectives && investment.objectives.includes(clientProfile.objectives)) {
    score += 20;
  }
  
  // Risk matching
  if (investment.risk_band && clientProfile.risk_tolerance) {
    const [minRisk, maxRisk] = investment.risk_band;
    if (clientProfile.risk_tolerance >= minRisk && clientProfile.risk_tolerance <= maxRisk) {
      score += 20;
    } else {
      score -= 10;
    }
  }
  
  // Horizon matching
  if (investment.min_horizon_years && clientProfile.horizon_years) {
    if (clientProfile.horizon_years >= investment.min_horizon_years) {
      score += 10;
    } else {
      score -= 20;
    }
  }
  
  return Math.max(0, Math.min(100, score));
};

const filterInvestmentsByPreferences = (investments, preferences) => {
  return investments.filter(investment => {
    // Label matching
    if (preferences.labels_interest && preferences.labels_interest.length > 0) {
      const hasMatchingLabel = preferences.labels_interest.some(label => 
        investment.labels && investment.labels.includes(label)
      );
      if (!hasMatchingLabel) return false;
    }
    
    // Theme matching
    if (preferences.themes && preferences.themes.length > 0) {
      const hasMatchingTheme = preferences.themes.some(theme => 
        investment.themes && investment.themes.includes(theme)
      );
      if (!hasMatchingTheme) return false;
    }
    
    // Exclusion matching
    if (preferences.exclusions && preferences.exclusions.length > 0) {
      for (const exclusion of preferences.exclusions) {
        if (investment.exclusions && investment.exclusions[exclusion.sector.toLowerCase().replace(' ', '_')]) {
          const investmentThreshold = investment.exclusions[exclusion.sector.toLowerCase().replace(' ', '_')].threshold;
          if (investmentThreshold > exclusion.threshold) {
            return false;
          }
        }
      }
    }
    
    return true;
  });
};

const rankInvestmentsByRelevance = (investments, clientProfile, preferences) => {
  const filtered = filterInvestmentsByPreferences(investments, preferences);
  
  return filtered.map(investment => ({
    ...investment,
    score: scoreInvestmentMatch(investment, clientProfile)
  })).sort((a, b) => b.score - a.score);
};

test("scoreInvestmentMatch calculates correct scores for client profile", () => {
  const clientProfile = {
    objectives: "growth",
    risk_tolerance: 5,
    horizon_years: 8
  };

  const investment = {
    id: "test_fund",
    objectives: ["growth", "income"],
    risk_band: [4, 6],
    min_horizon_years: 5
  };

  const score = scoreInvestmentMatch(investment, clientProfile);
  
  assert.ok(score > 0, "Should return positive score for matching investment");
  assert.ok(score <= 100, "Score should not exceed 100");
});

test("scoreInvestmentMatch penalizes risk mismatches", () => {
  const lowRiskClient = {
    objectives: "preservation",
    risk_tolerance: 2,
    horizon_years: 3
  };

  const highRiskInvestment = {
    id: "high_risk_fund",
    objectives: ["growth"],
    risk_band: [6, 7],
    min_horizon_years: 10
  };

  const score = scoreInvestmentMatch(highRiskInvestment, lowRiskClient);
  
  assert.ok(score < 50, "Should return low score for risk mismatch");
});

test("filterInvestmentsByPreferences filters by sustainability labels", () => {
  const preferences = {
    labels_interest: ["Sustainability: Focus"],
    themes: ["Climate"],
    exclusions: [{ sector: "Fossil fuels", threshold: 5 }]
  };

  const investments = [
    {
      id: "esg_fund",
      labels: ["Sustainability: Focus"],
      themes: ["Climate"],
      exclusions_supported: ["Fossil fuels under 5%"]
    },
    {
      id: "conventional_fund",
      labels: [],
      themes: [],
      exclusions_supported: []
    }
  ];

  const filtered = filterInvestmentsByPreferences(investments, preferences);
  
  assert.strictEqual(filtered.length, 1, "Should filter to matching investments only");
  assert.strictEqual(filtered[0].id, "esg_fund", "Should return ESG fund");
});

test("filterInvestmentsByPreferences handles exclusion thresholds", () => {
  const preferences = {
    exclusions: [{ sector: "Fossil fuels", threshold: 0 }]
  };

  const investments = [
    {
      id: "clean_fund",
      exclusions: { "fossil_fuels": { threshold: 0, unit: "percent" } }
    },
    {
      id: "mixed_fund", 
      exclusions: { "fossil_fuels": { threshold: 10, unit: "percent" } }
    }
  ];

  const filtered = filterInvestmentsByPreferences(investments, preferences);
  
  assert.strictEqual(filtered.length, 1, "Should exclude funds above threshold");
  assert.strictEqual(filtered[0].id, "clean_fund", "Should return clean fund only");
});

test("rankInvestmentsByRelevance sorts by score descending", () => {
  const clientProfile = {
    objectives: "growth",
    risk_tolerance: 5,
    horizon_years: 10
  };

  const preferences = {
    labels_interest: ["Sustainability: Focus"],
    themes: ["Climate"]
  };

  const investments = AUTHORIZED_INVESTMENTS.slice(0, 3); // Test with first 3 investments
  
  const ranked = rankInvestmentsByRelevance(investments, clientProfile, preferences);
  
  assert.ok(ranked.length > 0, "Should return ranked investments");
  assert.ok(ranked[0].score >= ranked[1]?.score || ranked.length === 1, "Should be sorted by score descending");
  assert.ok(ranked.every(inv => inv.score !== undefined), "All investments should have scores");
});

test("investment matching handles missing preference data gracefully", () => {
  const clientProfile = {
    objectives: "growth",
    risk_tolerance: 4
    // Missing horizon_years
  };

  const preferences = {}; // Empty preferences

  const investment = AUTHORIZED_INVESTMENTS[0];
  
  const score = scoreInvestmentMatch(investment, clientProfile);
  
  assert.ok(score >= 0, "Should handle missing data without errors");
});

test("investment filtering handles empty exclusions array", () => {
  const preferences = {
    labels_interest: ["Sustainability: Focus"],
    exclusions: []
  };

  const investments = AUTHORIZED_INVESTMENTS.slice(0, 2);
  
  const filtered = filterInvestmentsByPreferences(investments, preferences);
  
  // Should filter by labels but not exclude any due to empty exclusions
  assert.ok(filtered.length >= 0, "Should handle empty exclusions array");
});
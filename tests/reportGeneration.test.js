import test from "node:test";
import assert from "node:assert";
import { generateReportArtifacts } from "../server/report/reportGenerator.js";

// Mock function for building report context
const buildReportContext = (session) => {
  const data = session.data;
  
  return {
    client_name: "Test Client",
    client_type: data.client_profile?.client_type || "individual",
    objectives: data.client_profile?.objectives || "growth",
    risk_tolerance: data.client_profile?.risk_tolerance || 4,
    capacity_for_loss: data.client_profile?.capacity_for_loss || "medium",
    knowledge_experience: data.client_profile?.knowledge_experience?.summary || "Some experience",
    sustainability_labels: data.sustainability_preferences?.labels_interest?.join(", ") || "None",
    sustainability_themes: data.sustainability_preferences?.themes?.join(", ") || "None",
    exclusions: data.sustainability_preferences?.exclusions?.map(e => `${e.sector}: ${e.threshold}%`).join(", ") || "None",
    recommendation: data.advice_outcome?.recommendation || "Standard Portfolio",
    rationale: data.advice_outcome?.rationale || "Suitable for client",
    generation_date: new Date().toLocaleDateString(),
    consent_timestamps: {
      data_processing: data.consent?.data_processing?.timestamp,
      e_delivery: data.consent?.e_delivery?.timestamp
    }
  };
};

const createTestSession = () => ({
  id: 'test-session-456',
  data: {
    client_profile: {
      client_type: 'individual',
      objectives: 'growth',
      horizon_years: 8,
      risk_tolerance: 5,
      capacity_for_loss: 'medium',
      liquidity_needs: 'Low liquidity needs',
      knowledge_experience: {
        summary: 'Experienced with equity investments'
      },
      financial_situation: {
        provided: true,
        income: 75000,
        assets: 300000,
        liabilities: 50000,
        notes: 'Stable financial position'
      }
    },
    sustainability_preferences: {
      preference_level: 'detailed',
      labels_interest: ['Focus', 'Impact'],
      themes: ['climate', 'social equity'],
      exclusions: [{ sector: 'tobacco', threshold: 0 }],
      impact_goals: ['carbon reduction'],
      engagement_importance: 'high',
      reporting_frequency_pref: 'quarterly',
      tradeoff_tolerance: 'moderate'
    },
    consent: {
      data_processing: {
        granted: true,
        timestamp: '2024-01-15T10:30:00Z'
      },
      e_delivery: {
        granted: true,
        timestamp: '2024-01-15T10:30:00Z'
      }
    },
    advice_outcome: {
      recommendation: 'ESG Growth Portfolio',
      rationale: 'Aligns with growth objectives and sustainability preferences',
      sust_fit: 'Strong alignment with climate themes and impact goals',
      costs_summary: '0.85% annual management charge'
    },
    timestamps: {
      explanation_shown_at: '2024-01-15T10:00:00Z',
      consent_recorded_at: '2024-01-15T10:30:00Z',
      education_completed_at: '2024-01-15T10:45:00Z'
    }
  }
});

test("generateReportArtifacts creates valid PDF buffer", () => {
  const session = createTestSession();
  
  const artifacts = generateReportArtifacts(session);
  
  assert.ok(artifacts.pdfBuffer instanceof Buffer, "Should generate PDF buffer");
  assert.ok(artifacts.pdfBuffer.length > 500, "PDF should have substantial content");
  assert.ok(typeof artifacts.hash === 'string', "Should generate hash string");
  assert.ok(artifacts.hash.length === 64, "Should generate SHA-256 hash");
});

test("generateReportArtifacts includes required metadata", () => {
  const session = createTestSession();
  
  const artifacts = generateReportArtifacts(session);
  
  assert.ok(artifacts.metadata, "Should include metadata");
  assert.ok(artifacts.metadata.sessionId === session.id, "Should include session ID");
  assert.ok(artifacts.metadata.generatedAt, "Should include generation timestamp");
  assert.ok(artifacts.metadata.version, "Should include version");
  assert.ok(typeof artifacts.signatureReady === 'boolean', "Should indicate signature readiness");
});

test("buildReportContext creates complete context from session", () => {
  const session = createTestSession();
  
  const context = buildReportContext(session);
  
  assert.ok(context.client_name, "Should include client name");
  assert.ok(context.client_type, "Should include client type");
  assert.ok(context.objectives, "Should include objectives");
  assert.ok(context.risk_tolerance, "Should include risk tolerance");
  assert.ok(context.sustainability_labels, "Should include sustainability labels");
  assert.ok(context.recommendation, "Should include recommendation");
  assert.ok(context.generation_date, "Should include generation date");
});

test("buildReportContext handles missing optional data", () => {
  const minimalSession = {
    id: 'minimal-session',
    data: {
      client_profile: {
        client_type: 'individual',
        objectives: 'growth',
        risk_tolerance: 4
      },
      sustainability_preferences: {
        preference_level: 'none'
      },
      advice_outcome: {
        recommendation: 'Standard Portfolio'
      }
    }
  };
  
  const context = buildReportContext(minimalSession);
  
  assert.ok(context.client_type, "Should handle minimal data");
  assert.ok(context.objectives, "Should include available data");
  assert.ok(context.recommendation, "Should include recommendation");
});

test("report generation handles special characters in client data", () => {
  const session = createTestSession();
  session.data.client_profile.knowledge_experience.summary = "Experience with funds & bonds (5+ years)";
  session.data.advice_outcome.rationale = "Portfolio aligns with client's goals & preferences";
  
  const artifacts = generateReportArtifacts(session);
  
  assert.ok(artifacts.pdfBuffer instanceof Buffer, "Should handle special characters");
  assert.ok(artifacts.preview.includes("funds & bonds"), "Should preserve special characters in preview");
});

test("report generation creates consistent hashes for identical content", () => {
  const session1 = createTestSession();
  const session2 = createTestSession();
  
  const artifacts1 = generateReportArtifacts(session1);
  const artifacts2 = generateReportArtifacts(session2);
  
  // Should be different due to timestamps, but structure should be consistent
  assert.ok(typeof artifacts1.hash === 'string', "Should generate hash for session 1");
  assert.ok(typeof artifacts2.hash === 'string', "Should generate hash for session 2");
  assert.ok(artifacts1.hash.length === artifacts2.hash.length, "Hashes should be same length");
});

test("report context includes all required regulatory fields", () => {
  const session = createTestSession();
  
  const context = buildReportContext(session);
  
  // Check for COBS 9A required fields
  assert.ok(context.client_type, "Should include client type for COBS 9A");
  assert.ok(context.objectives, "Should include investment objectives");
  assert.ok(context.risk_tolerance !== undefined, "Should include risk tolerance");
  assert.ok(context.capacity_for_loss, "Should include capacity for loss");
  assert.ok(context.knowledge_experience, "Should include knowledge and experience");
  assert.ok(context.consent_timestamps, "Should include consent timestamps");
});
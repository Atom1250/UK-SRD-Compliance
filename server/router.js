import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import {
  createSession,
  getSession,
  listSessions,
  saveSession,
  appendEvent,
  applyDataPatch,
  toPublicSession,
  filterSessions,
  searchSessions,
  archiveOldSessions,
  cleanupArchivedSessions,
  bulkUpdateSessions,
  getSessionStatistics,
  getSessionEnhanced,
  saveSessionEnhanced,
  validateAllSessions,
  getSessionsRequiringAttention
} from "./state/sessionStore.js";
import { validateSessionData } from "./state/validateSession.js";
import {
  EVENT_AUTHORS,
  EVENT_TYPES,
  STAGE_PROMPTS
} from "./state/constants.js";

import {
  sendJSON,
  sendText,
  sendOptions,
  serveStaticFile
} from "./httpUtils.js";
import {
  handleEvent,
  handleFreeFormQuery
} from "./state/conversationEngine.js";
import { generateComplianceSummary } from "./state/complianceSystem.js";
import { evaluateSessionGuardrails, getSessionRiskAssessment, getEscalationQueue, resolveEscalation, enhancedGuardrailSystem } from "./state/enhancedGuardrails.js";
import { validateSessionRegulatoryCompliance, regulatoryChangeManager } from "./state/regulatoryChangeManager.js";
import { generateEducationalPdf } from "./education/pdfGenerator.js";
import { getReportArtifact, storeReportArtifacts, getStorageStats, validateDocumentIntegrity } from "./report/reportStore.js";
import { generateReportArtifacts } from "./report/reportGenerator.js";
import { sessionMonitor } from "./websocket/sessionMonitor.js";
import { performanceMiddleware } from "./monitoring/performanceMonitor.js";
import { registerDashboardRoutes } from "./monitoring/dashboardApi.js";
import logger from "./monitoring/logger.js";

const API_PREFIX = "/api";

const readBody = async (req) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw new Error("Request body too large");
    }
  }

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }
};

const ensureSession = (res, id) => {
  const session = getSession(id);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return null;
  }
  return session;
};

const handleCreateSession = (req, res) => {
  const session = createSession({ ip: req.socket.remoteAddress });
  sendJSON(res, 201, {
    session: toPublicSession(session),
    messages: [STAGE_PROMPTS[session.stage]]
  });
};

const handleGetSession = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  sendJSON(res, 200, {
    session: toPublicSession(session),
    messages: [STAGE_PROMPTS[session.stage]]
  });
};

const handleAppendEvent = async (req, res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;

  const body = await readBody(req);
  const { author, type, content = {}, stageData } = body;

  if (!EVENT_AUTHORS.includes(author)) {
    sendJSON(res, 400, { error: "Invalid event author" });
    return;
  }

  if (!EVENT_TYPES.includes(type)) {
    sendJSON(res, 400, { error: "Invalid event type" });
    return;
  }

  if (typeof content !== "object") {
    sendJSON(res, 400, { error: "Event content must be an object" });
    return;
  }

  if (stageData && typeof stageData !== "object") {
    sendJSON(res, 400, { error: "stageData must be an object when provided" });
    return;
  }

  const event = {
    id: randomUUID(),
    sessionId: session.id,
    author,
    type,
    content,
    createdAt: new Date().toISOString()
  };

  appendEvent(session, event);
  if (stageData) {
    applyDataPatch(session, stageData);
  }
  const result = await handleEvent(session, event);
  saveSession(session);

  sendJSON(res, 201, {
    event,
    session: toPublicSession(session),
    messages: result.messages
  });
};

const handleChat = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!sessionId || typeof sessionId !== "string") {
    sendJSON(res, 400, { error: "session_id is required" });
    return;
  }

  if (!message) {
    sendJSON(res, 400, { error: "message is required" });
    return;
  }

  const session = ensureSession(res, sessionId);
  if (!session) return;

  try {
    const result = await handleFreeFormQuery(session, message);
    saveSession(session);
    sendJSON(res, 200, {
      session: toPublicSession(session),
      messages: result.messages
    });
  } catch (error) {
    const status = error.status ?? 502;
    sendJSON(res, status, {
      error: error.message ?? "Unable to complete compliance chat"
    });
  }
};

const handleMultiModalInput = async (req, res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const body = await readBody(req);
  const { input } = body;

  if (!input || typeof input !== "object") {
    sendJSON(res, 400, { error: "Input data is required and must be an object" });
    return;
  }

  try {
    const { handleMultiModalInput: processMultiModal } = await import("./state/conversationEngine.js");
    const result = await processMultiModal(session, input);
    
    saveSession(session);
    
    sendJSON(res, 200, {
      session: toPublicSession(session),
      messages: result.messages || [],
      inputSuggestions: result.inputSuggestions,
      error: result.error || false,
      recovery: result.recovery
    });
  } catch (error) {
    console.error("Multi-modal input error:", error);
    sendJSON(res, 500, { error: "Failed to process multi-modal input" });
  }
};

const handleGetSessionAnalytics = (res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;

  try {
    const { generateConversationSummary, analyzeConversationEffectiveness } = require("./state/conversationAnalytics.js");
    
    const summary = generateConversationSummary(session);
    const effectiveness = analyzeConversationEffectiveness(session);
    
    const analytics = {
      sessionId,
      summary,
      effectiveness,
      rawData: {
        nlpHistory: session.data?.analytics?.nlp_history || [],
        events: session.data?.analytics?.events || [],
        engagement: session.data?.analytics?.engagement || {},
        detours: session.data?.analytics?.detours || []
      },
      generatedAt: new Date().toISOString()
    };

    sendJSON(res, 200, { analytics });
  } catch (error) {
    console.error("Analytics generation error:", error);
    sendJSON(res, 500, { error: "Failed to generate session analytics" });
  }
};

const handleValidate = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  const validation = validateSessionData(session);
  sendJSON(res, 200, {
    session: toPublicSession(session),
    validation
  });
};

const handleReportGeneration = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const validation = validateSessionData(session);
  if (!validation.valid) {
    sendJSON(res, 422, {
      error: "Session is not ready for report generation",
      issues: validation.issues
    });
    return;
  }

  try {
    // Generate enhanced report with professional formatting
    const reportArtifacts = generateReportArtifacts(session);
    
    // Store report securely with versioning and access control
    const storageResult = storeReportArtifacts(
      sessionId, 
      reportArtifacts.pdfBuffer, 
      reportArtifacts.metadata
    );
    
    if (!storageResult.success) {
      sendJSON(res, 500, {
        error: "Failed to store report securely",
        details: storageResult.error
      });
      return;
    }

    // Update session with enhanced report metadata
    session.data.report = {
      ...session.data.report,
      doc_url: `/api/sessions/${sessionId}/report.pdf?token=${storageResult.accessToken}`,
      status: "draft",
      version: storageResult.version,
      hash: storageResult.hash,
      access_token: storageResult.accessToken,
      signature_ready: reportArtifacts.signatureReady,
      generated_at: new Date().toISOString(),
      metadata: reportArtifacts.metadata
    };
    
    saveSession(session);

    sendJSON(res, 201, {
      report: {
        ...session.data.report,
        preview: reportArtifacts.preview
      },
      session: toPublicSession(session),
      storage: {
        version: storageResult.version,
        hash: storageResult.hash,
        signature_ready: reportArtifacts.signatureReady
      }
    });
    
  } catch (error) {
    sendJSON(res, 500, {
      error: "Failed to generate report",
      details: error.message
    });
  }
};

const handleCreateEnvelope = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const signUrl = `https://example.com/sign/${session.id}`;
  session.data.report.status = "awaiting_signature";
  session.data.report.signed_url = null;
  saveSession(session);

  sendJSON(res, 201, {
    envelope: {
      id: `env_${session.id}`,
      sign_url: signUrl
    },
    session: toPublicSession(session)
  });
};

const handleEnvelopeWebhook = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  if (body.status === "completed" && body.signed_url) {
    session.data.report.status = "completed";
    session.data.report.signed_url = body.signed_url;
  }

  saveSession(session);
  sendText(res, 202, "Webhook received");
};

const handleListCases = (res) => {
  const cases = listSessions().map((session) => ({
    id: session.id,
    stage: session.stage,
    updatedAt: session.updatedAt,
    clientName: session.data.client_profile?.client_type ?? null,
    pathwayCount:
      session.data.sustainability_preferences?.labels_interest?.length ?? 0
  }));

  sendJSON(res, 200, { cases });
};

const handleGetCase = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  sendJSON(res, 200, { case: toPublicSession(session) });
};

const handlePatchCase = async (req, res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;

  const body = await readBody(req);
  const { adviser_notes, fees, overrides } = body;

  const patch = {};
  if (typeof adviser_notes === "string") {
    patch.advice_outcome = {
      ...(patch.advice_outcome ?? {}),
      adviser_notes
    };
  }
  if (fees && typeof fees === "object") {
    const feeDetails = {
      bespoke: Boolean(fees.bespoke),
      explanation: typeof fees.explanation === "string"
        ? fees.explanation
        : session.data.advice_outcome?.fee_details?.explanation ?? ""
    };
    patch.advice_outcome = {
      ...(patch.advice_outcome ?? {}),
      fee_details: feeDetails,
      costs_summary:
        feeDetails.explanation || session.data.advice_outcome?.costs_summary || ""
    };
  }
  if (overrides && typeof overrides === "object") {
    Object.assign(patch, overrides);
  }

  applyDataPatch(session, patch);

  appendEvent(session, {
    id: randomUUID(),
    sessionId: session.id,
    author: "adviser",
    type: "note",
    content: {
      adviser_notes:
        patch.advice_outcome?.adviser_notes ?? adviser_notes ?? null
    },
    createdAt: new Date().toISOString()
  });

  saveSession(session);
  sendJSON(res, 200, { case: toPublicSession(session) });
};

const handleGetComplianceSummary = (res, sessionId) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    const complianceSummary = generateComplianceSummary(session);
    sendJSON(res, 200, { 
      compliance: complianceSummary,
      session_id: sessionId 
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to generate compliance summary" });
  }
};

const handleGetEducationalPdf = (res, sessionId, filename) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    // Extract module title from filename
    const moduleTitle = filename
      .replace('esg-education-', '')
      .replace('.pdf', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const pdfArtifact = generateEducationalPdf(moduleTitle);
    
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfArtifact.filename}"`,
      "Content-Length": pdfArtifact.pdfBuffer.length
    });
    res.end(pdfArtifact.pdfBuffer);
  } catch (error) {
    sendJSON(res, 404, { error: "Educational PDF not found" });
  }
};

// Investment research and advisor integration handlers
const handleGetInvestmentResearchSummary = (res) => {
  const sessions = listSessions();
  const researchSummary = {
    total_sessions: sessions.length,
    sessions_with_research: 0,
    total_research_queries: 0,
    no_match_queries: 0,
    pending_advisor_reviews: 0,
    research_by_type: {},
    recent_activity: []
  };

  sessions.forEach(session => {
    if (session.data?.investment_research?.length > 0) {
      researchSummary.sessions_with_research++;
      researchSummary.total_research_queries += session.data.investment_research.length;
      
      session.data.investment_research.forEach(research => {
        // Count no-match queries
        if (research.match_quality?.no_matches) {
          researchSummary.no_match_queries++;
        }
        
        // Count by query type
        const queryType = research.query_type || 'unknown';
        researchSummary.research_by_type[queryType] = (researchSummary.research_by_type[queryType] || 0) + 1;
        
        // Add to recent activity (last 10)
        if (researchSummary.recent_activity.length < 10) {
          researchSummary.recent_activity.push({
            session_id: session.id,
            query: research.query,
            query_type: research.query_type,
            timestamp: research.at,
            matches_found: (research.search_results?.authorised_matches?.length || 0) + 
                          (research.search_results?.alternative_matches?.length || 0)
          });
        }
      });
    }
    
    // Count pending advisor notifications
    if (session.data?.advisor_notifications?.length > 0) {
      researchSummary.pending_advisor_reviews += session.data.advisor_notifications.filter(
        n => n.requires_action && !n.resolved_at
      ).length;
    }
  });

  // Sort recent activity by timestamp
  researchSummary.recent_activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  sendJSON(res, 200, { research_summary: researchSummary });
};

const handleGetSessionInvestmentResearch = (res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const researchData = {
    session_id: sessionId,
    investment_research: session.data?.investment_research || [],
    investment_recommendations: session.data?.investment_recommendations || [],
    advisor_notifications: session.data?.advisor_notifications?.filter(n => 
      n.type.includes('investment_research')
    ) || [],
    client_profile: {
      objectives: session.data?.client_profile?.objectives,
      risk_tolerance: session.data?.client_profile?.risk_tolerance,
      capacity_for_loss: session.data?.client_profile?.capacity_for_loss,
      horizon_years: session.data?.client_profile?.horizon_years
    },
    sustainability_preferences: session.data?.sustainability_preferences || {}
  };

  sendJSON(res, 200, { research_data: researchData });
};

const handleGetAdvisorNotifications = (res) => {
  const sessions = listSessions();
  const allNotifications = [];

  sessions.forEach(session => {
    if (session.data?.advisor_notifications?.length > 0) {
      session.data.advisor_notifications.forEach(notification => {
        allNotifications.push({
          ...notification,
          session_id: session.id,
          client_name: session.data?.client_profile?.client_type || 'Unknown'
        });
      });
    }
  });

  // Sort by priority and creation date
  allNotifications.sort((a, b) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return new Date(b.created_at) - new Date(a.created_at);
  });

  sendJSON(res, 200, { 
    notifications: allNotifications,
    summary: {
      total: allNotifications.length,
      high_priority: allNotifications.filter(n => n.priority === 'high').length,
      unresolved: allNotifications.filter(n => n.requires_action && !n.resolved_at).length
    }
  });
};

const handleUpdateNotificationStatus = async (req, res, notificationId) => {
  const body = await readBody(req);
  const { status, advisor_notes } = body;
  
  const sessions = listSessions();
  let notificationFound = false;

  for (const session of sessions) {
    if (session.data?.advisor_notifications?.length > 0) {
      const notification = session.data.advisor_notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.resolved_at = new Date().toISOString();
        notification.resolution_status = status;
        if (advisor_notes) {
          notification.advisor_notes = advisor_notes;
        }
        
        saveSession(session);
        notificationFound = true;
        
        sendJSON(res, 200, { 
          message: 'Notification updated successfully',
          notification: notification
        });
        break;
      }
    }
  }

  if (!notificationFound) {
    sendJSON(res, 404, { error: 'Notification not found' });
  }
};

const handleGetPendingRecommendations = (res) => {
  const sessions = listSessions();
  const pendingRecommendations = [];

  sessions.forEach(session => {
    if (session.data?.investment_recommendations?.length > 0) {
      session.data.investment_recommendations.forEach(recommendation => {
        if (recommendation.status === 'pending_advisor_review') {
          pendingRecommendations.push({
            ...recommendation,
            session_id: session.id,
            client_name: session.data?.client_profile?.client_type || 'Unknown',
            session_stage: session.stage
          });
        }
      });
    }
  });

  // Sort by creation date (newest first)
  pendingRecommendations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  sendJSON(res, 200, { 
    pending_recommendations: pendingRecommendations,
    summary: {
      total_pending: pendingRecommendations.length,
      high_priority: pendingRecommendations.filter(r => 
        r.search_results.authorised_matches.length === 0
      ).length
    }
  });
};

const handleGetRecommendationWorkflow = (res, workflowId) => {
  const sessions = listSessions();
  let workflowFound = null;
  let sessionContext = null;

  for (const session of sessions) {
    if (session.data?.investment_recommendations?.length > 0) {
      const workflow = session.data.investment_recommendations.find(r => r.id === workflowId);
      if (workflow) {
        workflowFound = workflow;
        sessionContext = {
          session_id: session.id,
          client_profile: session.data?.client_profile,
          sustainability_preferences: session.data?.sustainability_preferences,
          session_stage: session.stage,
          investment_research_history: session.data?.investment_research || []
        };
        break;
      }
    }
  }

  if (!workflowFound) {
    sendJSON(res, 404, { error: 'Recommendation workflow not found' });
    return;
  }

  sendJSON(res, 200, { 
    workflow: workflowFound,
    session_context: sessionContext
  });
};

const handleUpdateRecommendationWorkflow = async (req, res, workflowId) => {
  const body = await readBody(req);
  const { status, advisor_recommendations, advisor_notes } = body;
  
  const sessions = listSessions();
  let workflowFound = false;

  for (const session of sessions) {
    if (session.data?.investment_recommendations?.length > 0) {
      const workflow = session.data.investment_recommendations.find(r => r.id === workflowId);
      if (workflow) {
        workflow.status = status || workflow.status;
        workflow.updated_at = new Date().toISOString();
        
        if (advisor_recommendations) {
          workflow.advisor_recommendations = advisor_recommendations;
        }
        
        if (advisor_notes) {
          workflow.advisor_notes = advisor_notes;
        }
        
        if (status === 'completed') {
          workflow.completed_at = new Date().toISOString();
        }
        
        saveSession(session);
        workflowFound = true;
        
        sendJSON(res, 200, { 
          message: 'Recommendation workflow updated successfully',
          workflow: workflow
        });
        break;
      }
    }
  }

  if (!workflowFound) {
    sendJSON(res, 404, { error: 'Recommendation workflow not found' });
  }
};

// Comprehensive Session Management API Handlers

const handleListSessionsAdvanced = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;
  
  const filters = {
    stage: params.get('stage'),
    dateFrom: params.get('dateFrom'),
    dateTo: params.get('dateTo'),
    clientType: params.get('clientType'),
    status: params.get('status'),
    limit: params.get('limit') ? parseInt(params.get('limit')) : undefined,
    offset: params.get('offset') ? parseInt(params.get('offset')) : undefined
  };
  
  // Remove null/undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === null || filters[key] === undefined) {
      delete filters[key];
    }
  });
  
  try {
    const sessions = filterSessions(filters);
    const totalCount = listSessions().length;
    
    const response = {
      sessions: sessions.map(session => ({
        id: session.id,
        stage: session.stage,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: getSessionStatus(session),
        progress: getSessionProgress(session),
        clientProfile: {
          clientType: session.data?.client_profile?.client_type || null,
          objectives: session.data?.client_profile?.objectives || null,
          riskTolerance: session.data?.client_profile?.risk_tolerance || null
        },
        sustainabilityPreferences: {
          preferenceLevel: session.data?.sustainability_preferences?.preference_level || 'none',
          labelsInterest: session.data?.sustainability_preferences?.labels_interest || []
        },
        complianceStatus: getComplianceStatus(session),
        lastActivity: getLastActivity(session)
      })),
      pagination: {
        total: totalCount,
        returned: sessions.length,
        offset: filters.offset || 0,
        limit: filters.limit || totalCount
      },
      filters: filters
    };
    
    sendJSON(res, 200, response);
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to list sessions: ${error.message}` });
  }
};

const handleSearchSessions = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;
  
  const searchTerm = params.get('q');
  if (!searchTerm) {
    sendJSON(res, 400, { error: 'Search term (q) is required' });
    return;
  }
  
  const options = {
    caseSensitive: params.get('caseSensitive') === 'true',
    limit: params.get('limit') ? parseInt(params.get('limit')) : 50,
    fields: params.get('fields') ? params.get('fields').split(',') : undefined
  };
  
  try {
    const results = searchSessions(searchTerm, options);
    
    const response = {
      searchTerm,
      results: results.map(result => ({
        session: {
          id: result.session.id,
          stage: result.session.stage,
          createdAt: result.session.createdAt,
          updatedAt: result.session.updatedAt,
          status: getSessionStatus(result.session),
          clientType: result.session.data?.client_profile?.client_type || null
        },
        relevanceScore: result.relevanceScore,
        matchedFields: result.matchedFields
      })),
      totalResults: results.length,
      options
    };
    
    sendJSON(res, 200, response);
  } catch (error) {
    sendJSON(res, 500, { error: `Search failed: ${error.message}` });
  }
};

const handleGetSessionStatus = (res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;
  
  try {
    const enhanced = getSessionEnhanced(sessionId);
    
    const statusInfo = {
      sessionId,
      status: getSessionStatus(session),
      progress: getSessionProgress(session),
      stage: session.stage,
      complianceStatus: getComplianceStatus(session),
      validation: enhanced.validation,
      timestamps: {
        created: session.createdAt,
        updated: session.updatedAt,
        lastActivity: getLastActivity(session)?.timestamp || null
      },
      metrics: {
        eventsCount: session.events?.length || 0,
        completionPercentage: calculateCompletionPercentage(session),
        timeSpent: calculateTimeSpent(session)
      }
    };
    
    sendJSON(res, 200, { statusInfo });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get session status: ${error.message}` });
  }
};

const handleUpdateSessionStatus = async (req, res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;
  
  const body = await readBody(req);
  const { status, notes, priority } = body;
  
  try {
    const updates = {};
    
    if (status) {
      switch (status) {
        case 'active':
          updates.archived = false;
          if (session.data?.timestamps?.session_closed_at) {
            delete session.data.timestamps.session_closed_at;
          }
          break;
        case 'completed':
          updates.timestamps = {
            ...session.data?.timestamps,
            session_closed_at: new Date().toISOString()
          };
          break;
        case 'archived':
          updates.archived = true;
          updates.archived_at = new Date().toISOString();
          break;
      }
    }
    
    if (notes) {
      updates.advisor_status_notes = notes;
    }
    
    if (priority) {
      updates.priority = priority;
    }
    
    applyDataPatch(session, updates);
    
    // Log the status change
    appendEvent(session, {
      id: randomUUID(),
      sessionId: session.id,
      author: "adviser",
      type: "status_change",
      content: {
        status,
        notes,
        priority
      },
      createdAt: new Date().toISOString()
    });
    
    sendJSON(res, 200, {
      message: 'Session status updated successfully',
      session: toPublicSession(session),
      newStatus: getSessionStatus(session)
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to update session status: ${error.message}` });
  }
};

const handleAddAdvisorNote = async (req, res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;
  
  const body = await readBody(req);
  const { note, category, priority, requiresAction } = body;
  
  if (!note || typeof note !== 'string') {
    sendJSON(res, 400, { error: 'Note content is required' });
    return;
  }
  
  try {
    const noteId = randomUUID();
    const timestamp = new Date().toISOString();
    
    // Ensure advisor_notes array exists
    if (!session.data.advisor_notes) {
      session.data.advisor_notes = [];
    }
    
    const advisorNote = {
      id: noteId,
      content: note,
      category: category || 'general',
      priority: priority || 'medium',
      requiresAction: Boolean(requiresAction),
      createdAt: timestamp,
      resolved: false
    };
    
    session.data.advisor_notes.push(advisorNote);
    
    // Also add to events for audit trail
    appendEvent(session, {
      id: randomUUID(),
      sessionId: session.id,
      author: "adviser",
      type: "note_added",
      content: {
        noteId,
        note,
        category,
        priority,
        requiresAction
      },
      createdAt: timestamp
    });
    
    sendJSON(res, 201, {
      message: 'Advisor note added successfully',
      note: advisorNote,
      session: toPublicSession(session)
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to add advisor note: ${error.message}` });
  }
};

const handleUpdateAdvisorNote = async (req, res, sessionId, noteId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;
  
  const body = await readBody(req);
  const { content, category, priority, requiresAction, resolved } = body;
  
  try {
    const note = session.data?.advisor_notes?.find(n => n.id === noteId);
    if (!note) {
      sendJSON(res, 404, { error: 'Advisor note not found' });
      return;
    }
    
    // Update note properties
    if (content !== undefined) note.content = content;
    if (category !== undefined) note.category = category;
    if (priority !== undefined) note.priority = priority;
    if (requiresAction !== undefined) note.requiresAction = Boolean(requiresAction);
    if (resolved !== undefined) {
      note.resolved = Boolean(resolved);
      if (resolved) {
        note.resolvedAt = new Date().toISOString();
      }
    }
    
    note.updatedAt = new Date().toISOString();
    
    saveSession(session);
    
    // Log the update
    appendEvent(session, {
      id: randomUUID(),
      sessionId: session.id,
      author: "adviser",
      type: "note_updated",
      content: {
        noteId,
        updates: { content, category, priority, requiresAction, resolved }
      },
      createdAt: new Date().toISOString()
    });
    
    sendJSON(res, 200, {
      message: 'Advisor note updated successfully',
      note,
      session: toPublicSession(session)
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to update advisor note: ${error.message}` });
  }
};

const handleGetSessionProgress = (res, sessionId) => {
  const session = ensureSession(res, sessionId);
  if (!session) return;
  
  try {
    const progress = getDetailedSessionProgress(session);
    sendJSON(res, 200, { sessionId, progress });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get session progress: ${error.message}` });
  }
};

const handleBulkSessionOperations = async (req, res) => {
  const body = await readBody(req);
  const { operation, criteria, updates, dryRun } = body;
  
  if (!operation) {
    sendJSON(res, 400, { error: 'Operation is required' });
    return;
  }
  
  try {
    let result;
    
    switch (operation) {
      case 'update':
        if (!updates) {
          sendJSON(res, 400, { error: 'Updates are required for update operation' });
          return;
        }
        result = bulkUpdateSessions(criteria || {}, updates, Boolean(dryRun));
        break;
        
      case 'archive':
        const daysOld = criteria?.daysOld || 90;
        result = archiveOldSessions(daysOld, Boolean(dryRun));
        break;
        
      case 'cleanup':
        const cleanupDays = criteria?.daysOld || 365;
        result = cleanupArchivedSessions(cleanupDays, Boolean(dryRun));
        break;
        
      default:
        sendJSON(res, 400, { error: 'Invalid operation' });
        return;
    }
    
    sendJSON(res, 200, {
      operation,
      dryRun: Boolean(dryRun),
      affectedSessions: result,
      count: result.length
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Bulk operation failed: ${error.message}` });
  }
};

const handleGetSessionStatistics = (res) => {
  try {
    const stats = getSessionStatistics();
    sendJSON(res, 200, { statistics: stats });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get statistics: ${error.message}` });
  }
};

const handleValidateAllSessions = async (req, res) => {
  const body = await readBody(req);
  const { includeWarnings, autoMigrate } = body;
  
  try {
    const report = validateAllSessions({
      includeWarnings: Boolean(includeWarnings),
      autoMigrate: Boolean(autoMigrate)
    });
    
    sendJSON(res, 200, { validationReport: report });
  } catch (error) {
    sendJSON(res, 500, { error: `Validation failed: ${error.message}` });
  }
};

const handleGetSessionsRequiringAttention = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;
  
  const criteria = {
    includeWarnings: params.get('includeWarnings') === 'true',
    cobs9aOnly: params.get('cobs9aOnly') === 'true'
  };
  
  try {
    const sessions = getSessionsRequiringAttention(criteria);
    
    const response = {
      sessions: sessions.map(item => ({
        session: {
          id: item.session.id,
          stage: item.session.stage,
          createdAt: item.session.createdAt,
          updatedAt: item.session.updatedAt,
          clientType: item.session.data?.client_profile?.client_type || null
        },
        validation: item.validation,
        priority: item.priority
      })),
      summary: {
        total: sessions.length,
        highPriority: sessions.filter(s => s.priority === 'high').length,
        mediumPriority: sessions.filter(s => s.priority === 'medium').length
      },
      criteria
    };
    
    sendJSON(res, 200, response);
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get sessions requiring attention: ${error.message}` });
  }
};

// Helper functions for session management

const getSessionStatus = (session) => {
  if (session.data?.archived) return 'archived';
  if (session.data?.timestamps?.session_closed_at) return 'completed';
  return 'active';
};

const getSessionProgress = (session) => {
  const stages = [
    'SEGMENT_A_EXPLANATION',
    'SEGMENT_B_ONBOARDING', 
    'SEGMENT_C_CONSENT',
    'SEGMENT_D_EDUCATION',
    'SEGMENT_E_OPTIONS',
    'SEGMENT_F_CONFIRMATION',
    'SEGMENT_G_REPORT',
    'SEGMENT_H_DELIVERY'
  ];
  
  const currentIndex = stages.indexOf(session.stage);
  return {
    currentStage: session.stage,
    stageIndex: currentIndex,
    totalStages: stages.length,
    percentage: currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0
  };
};

const getComplianceStatus = (session) => {
  const enhanced = getSessionEnhanced(session.id);
  return {
    valid: enhanced?.validation?.valid || false,
    cobs9aCompliant: enhanced?.validation?.cobs9aCompliant || false,
    issueCount: enhanced?.validation?.issues?.length || 0,
    warningCount: enhanced?.validation?.warnings?.length || 0
  };
};

const getLastActivity = (session) => {
  if (!session.events || session.events.length === 0) {
    return {
      timestamp: session.updatedAt,
      type: 'session_created',
      author: 'system'
    };
  }
  
  const lastEvent = session.events[session.events.length - 1];
  return {
    timestamp: lastEvent.createdAt,
    type: lastEvent.type,
    author: lastEvent.author
  };
};

const calculateCompletionPercentage = (session) => {
  const progress = getSessionProgress(session);
  return progress.percentage;
};

const calculateTimeSpent = (session) => {
  const start = new Date(session.createdAt);
  const end = session.data?.timestamps?.session_closed_at ? 
    new Date(session.data.timestamps.session_closed_at) : 
    new Date();
  
  return Math.round((end - start) / 1000 / 60); // minutes
};

const getDetailedSessionProgress = (session) => {
  const basic = getSessionProgress(session);
  
  const segmentDetails = {
    explanation: {
      completed: session.data?.audit?.explanation_shown || false,
      timestamp: session.data?.timestamps?.explanation_shown_at
    },
    onboarding: {
      completed: Boolean(session.data?.client_profile?.client_type),
      completedFields: getCompletedOnboardingFields(session)
    },
    consent: {
      completed: Boolean(session.data?.consent?.data_processing?.granted),
      timestamp: session.data?.timestamps?.consent_recorded_at
    },
    education: {
      completed: session.data?.sustainability_preferences?.preference_level !== 'none',
      timestamp: session.data?.timestamps?.education_completed_at,
      educationalRequests: session.data?.educational_requests?.length || 0
    },
    options: {
      completed: Boolean(session.data?.sustainability_preferences?.preference_level),
      preferenceLevel: session.data?.sustainability_preferences?.preference_level
    },
    confirmation: {
      completed: session.data?.summary_confirmation?.client_summary_confirmed || false,
      timestamp: session.data?.summary_confirmation?.confirmed_at
    },
    report: {
      completed: Boolean(session.data?.report?.doc_url),
      timestamp: session.data?.timestamps?.report_generated_at,
      status: session.data?.report?.status
    },
    delivery: {
      completed: session.data?.report?.status === 'completed',
      signedUrl: session.data?.report?.signed_url
    }
  };
  
  return {
    ...basic,
    segments: segmentDetails,
    completionMetrics: {
      totalFields: getTotalRequiredFields(),
      completedFields: getCompletedFields(session),
      missingFields: getMissingFields(session)
    }
  };
};

const getCompletedOnboardingFields = (session) => {
  const profile = session.data?.client_profile || {};
  const completed = [];
  
  if (profile.client_type) completed.push('client_type');
  if (profile.objectives) completed.push('objectives');
  if (profile.horizon_years) completed.push('horizon_years');
  if (profile.risk_tolerance) completed.push('risk_tolerance');
  if (profile.capacity_for_loss) completed.push('capacity_for_loss');
  if (profile.liquidity_needs) completed.push('liquidity_needs');
  if (profile.knowledge_experience?.summary) completed.push('knowledge_experience');
  
  return completed;
};

const getTotalRequiredFields = () => 15; // Approximate count of required fields

const getCompletedFields = (session) => {
  let count = 0;
  
  // Count completed profile fields
  count += getCompletedOnboardingFields(session).length;
  
  // Count consent fields
  if (session.data?.consent?.data_processing?.granted) count++;
  if (session.data?.consent?.e_delivery?.granted) count++;
  
  // Count sustainability preferences
  if (session.data?.sustainability_preferences?.preference_level !== 'none') count++;
  
  // Count confirmation
  if (session.data?.summary_confirmation?.client_summary_confirmed) count++;
  
  return count;
};

const getMissingFields = (session) => {
  const missing = [];
  const profile = session.data?.client_profile || {};
  
  if (!profile.client_type) missing.push('client_type');
  if (!profile.objectives) missing.push('objectives');
  if (!profile.horizon_years) missing.push('horizon_years');
  if (!profile.risk_tolerance) missing.push('risk_tolerance');
  if (!profile.capacity_for_loss) missing.push('capacity_for_loss');
  if (!profile.liquidity_needs) missing.push('liquidity_needs');
  if (!profile.knowledge_experience?.summary) missing.push('knowledge_experience');
  
  if (!session.data?.consent?.data_processing?.granted) missing.push('data_processing_consent');
  if (!session.data?.consent?.e_delivery?.granted) missing.push('e_delivery_consent');
  if (session.data?.sustainability_preferences?.preference_level === 'none') missing.push('sustainability_preferences');
  if (!session.data?.summary_confirmation?.client_summary_confirmed) missing.push('confirmation');
  
  return missing;
};

// WebSocket Management API Handlers

const handleGetWebSocketStats = (res) => {
  try {
    const stats = sessionMonitor.getConnectionStats();
    sendJSON(res, 200, { websocket_stats: stats });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get WebSocket stats: ${error.message}` });
  }
};

const handleTriggerAlert = async (req, res) => {
  const body = await readBody(req);
  const { sessionId, type, priority, title, message, data } = body;
  
  if (!sessionId || !type || !title || !message) {
    sendJSON(res, 400, { 
      error: 'sessionId, type, title, and message are required' 
    });
    return;
  }
  
  try {
    const alertId = sessionMonitor.createAlert({
      sessionId,
      type,
      priority: priority || 'medium',
      title,
      message,
      data: data || {}
    });
    
    sendJSON(res, 201, {
      message: 'Alert created successfully',
      alertId,
      sessionId
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to create alert: ${error.message}` });
  }
};

const handleGetActiveAlerts = (res) => {
  try {
    const alerts = Array.from(sessionMonitor.activeAlerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
    
    sendJSON(res, 200, {
      alerts,
      summary: {
        total: alerts.length,
        high_priority: alerts.filter(a => a.priority === 'high').length,
        medium_priority: alerts.filter(a => a.priority === 'medium').length,
        low_priority: alerts.filter(a => a.priority === 'low').length
      }
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to get active alerts: ${error.message}` });
  }
};

const handleAcknowledgeAlert = async (req, res, alertId) => {
  const body = await readBody(req);
  const { notes } = body;
  
  try {
    const alert = sessionMonitor.activeAlerts.get(alertId);
    if (!alert) {
      sendJSON(res, 404, { error: 'Alert not found' });
      return;
    }
    
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = 'api_user'; // Could be enhanced with user authentication
    
    if (notes) {
      alert.acknowledgmentNotes = notes;
    }
    
    // Broadcast acknowledgment
    sessionMonitor.broadcastToSessionSubscribers(alert.sessionId, {
      type: 'alert_acknowledged',
      alertId,
      sessionId: alert.sessionId,
      acknowledgedBy: 'api_user',
      notes,
      timestamp: alert.acknowledgedAt
    });
    
    sendJSON(res, 200, {
      message: 'Alert acknowledged successfully',
      alert
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to acknowledge alert: ${error.message}` });
  }
};

const handleCleanupAlerts = async (req, res) => {
  const body = await readBody(req);
  const { maxAgeHours } = body;
  
  try {
    const maxAge = (maxAgeHours || 24) * 60 * 60 * 1000; // Convert to milliseconds
    sessionMonitor.cleanupOldAlerts(maxAge);
    
    sendJSON(res, 200, {
      message: 'Alert cleanup completed',
      maxAgeHours: maxAgeHours || 24
    });
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to cleanup alerts: ${error.message}` });
  }
};

const handleBroadcastMessage = async (req, res) => {
  const body = await readBody(req);
  const { sessionId, message, type } = body;
  
  if (!message || !type) {
    sendJSON(res, 400, { error: 'message and type are required' });
    return;
  }
  
  try {
    const broadcastData = {
      type: 'broadcast',
      broadcastType: type,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (sessionId) {
      // Broadcast to specific session subscribers
      sessionMonitor.broadcastToSessionSubscribers(sessionId, broadcastData);
      sendJSON(res, 200, {
        message: 'Message broadcasted to session subscribers',
        sessionId,
        recipientType: 'session_subscribers'
      });
    } else {
      // Broadcast to all global subscribers
      sessionMonitor.broadcastToGlobalSubscribers(broadcastData);
      sendJSON(res, 200, {
        message: 'Message broadcasted to all subscribers',
        recipientType: 'global_subscribers'
      });
    }
  } catch (error) {
    sendJSON(res, 500, { error: `Failed to broadcast message: ${error.message}` });
  }
};

// Enhanced Guardrail and Risk Management Handlers
const handleGetSessionGuardrails = (res, sessionId) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    const guardrailResults = evaluateSessionGuardrails(session);
    
    sendJSON(res, 200, {
      session_id: sessionId,
      guardrail_evaluation: guardrailResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to evaluate guardrails" });
  }
};

const handleEvaluateSessionGuardrails = async (req, res, sessionId) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    const guardrailResults = evaluateSessionGuardrails(session);
    
    // Save updated session with guardrail results
    saveSession(session);
    
    sendJSON(res, 200, {
      session_id: sessionId,
      guardrail_evaluation: guardrailResults,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to evaluate guardrails" });
  }
};

const handleGetSessionRiskAssessment = (res, sessionId) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    const riskAssessment = getSessionRiskAssessment(session);
    
    sendJSON(res, 200, {
      session_id: sessionId,
      risk_assessment: riskAssessment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to get risk assessment" });
  }
};

const handleGetRegulatoryCompliance = (res, sessionId) => {
  const session = getSession(sessionId);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return;
  }

  try {
    const complianceResults = validateSessionRegulatoryCompliance(session);
    
    sendJSON(res, 200, {
      session_id: sessionId,
      regulatory_compliance: complianceResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to validate regulatory compliance" });
  }
};

const handleGetGuardrailReport = (req, res) => {
  try {
    const sessions = listSessions();
    const report = enhancedGuardrailSystem.generateGuardrailReport(sessions);
    
    sendJSON(res, 200, {
      guardrail_report: report,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to generate guardrail report" });
  }
};

const handleGetEscalationQueue = (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const level = url.searchParams.get('level');
    
    const escalations = getEscalationQueue(level);
    
    sendJSON(res, 200, {
      escalations: escalations,
      count: escalations.length,
      filtered_by_level: level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to get escalation queue" });
  }
};

const handleResolveEscalation = async (req, res, sessionId) => {
  try {
    const body = await readBody(req);
    const { resolved_by, resolution } = body;
    
    if (!resolved_by || !resolution) {
      sendJSON(res, 400, { error: "resolved_by and resolution are required" });
      return;
    }
    
    const resolvedEscalation = resolveEscalation(sessionId, resolved_by, resolution);
    
    if (!resolvedEscalation) {
      sendJSON(res, 404, { error: "Escalation not found" });
      return;
    }
    
    sendJSON(res, 200, {
      resolved_escalation: resolvedEscalation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to resolve escalation" });
  }
};

const handleGetRegulatoryChanges = (req, res) => {
  try {
    const pendingChanges = regulatoryChangeManager.getPendingChanges();
    
    sendJSON(res, 200, {
      regulatory_changes: pendingChanges,
      count: pendingChanges.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to get regulatory changes" });
  }
};

const handleRegisterRegulatoryChange = async (req, res) => {
  try {
    const body = await readBody(req);
    
    const changeRecord = regulatoryChangeManager.registerRegulatoryChange(body);
    
    sendJSON(res, 201, {
      regulatory_change: changeRecord,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to register regulatory change" });
  }
};

const handleReviewRegulatoryChange = async (req, res, changeId) => {
  try {
    const body = await readBody(req);
    const { reviewed_by, status, notes } = body;
    
    if (!reviewed_by || !status) {
      sendJSON(res, 400, { error: "reviewed_by and status are required" });
      return;
    }
    
    const reviewedChange = regulatoryChangeManager.reviewRegulatoryChange(
      changeId, reviewed_by, status, notes
    );
    
    if (!reviewedChange) {
      sendJSON(res, 404, { error: "Regulatory change not found" });
      return;
    }
    
    sendJSON(res, 200, {
      reviewed_change: reviewedChange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    sendJSON(res, 500, { error: "Failed to review regulatory change" });
  }
};

export const handleRequest = async (req, res) => {
  // Apply performance monitoring middleware
  performanceMiddleware(req, res, () => {});
  
  // Log request
  logger.logRequest(req, res, 0); // Will be updated with actual response time
  
  if (req.method === "OPTIONS") {
    sendOptions(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (!pathname.startsWith(API_PREFIX)) {
    await serveStaticFile(res, pathname);
    return;
  }

  const apiPath = pathname.slice(API_PREFIX.length) || "/";
  const segments = apiPath.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && apiPath === "/health") {
      sendJSON(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "POST" && apiPath === "/sessions") {
      handleCreateSession(req, res);
      return;
    }

    if (req.method === "POST" && apiPath === "/chat") {
      await handleChat(req, res);
      return;
    }

    if (segments[0] === "sessions" && segments.length >= 2) {
      const sessionId = segments[1];
      const tail = segments.slice(2).join("/");

      if (req.method === "GET" && segments.length === 2) {
        handleGetSession(res, sessionId);
        return;
      }

      if (req.method === "POST" && tail === "events") {
        await handleAppendEvent(req, res, sessionId);
        return;
      }

      if (req.method === "POST" && tail === "multimodal") {
        await handleMultiModalInput(req, res, sessionId);
        return;
      }

      if (req.method === "GET" && tail === "analytics") {
        handleGetSessionAnalytics(res, sessionId);
        return;
      }

      if ((req.method === "POST" || req.method === "GET") && tail === "validate") {
        handleValidate(res, sessionId);
        return;
      }

      if (req.method === "GET" && tail === "report.pdf") {
        const accessToken = url.searchParams.get('token');
        const reportData = getReportArtifact(sessionId, accessToken);
        
        if (!reportData) {
          sendJSON(res, 404, { error: "Report not found or access denied" });
          return;
        }

        // Validate document integrity before serving
        const integrity = validateDocumentIntegrity(sessionId);
        if (!integrity.valid) {
          sendJSON(res, 500, { 
            error: "Document integrity check failed", 
            reason: integrity.reason 
          });
          return;
        }

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="esg-suitability-report-${sessionId}-v${reportData.version}.pdf"`,
          "Content-Length": reportData.buffer.length,
          "X-Document-Hash": reportData.hash,
          "X-Document-Version": reportData.version.toString(),
          "X-Download-Count": reportData.downloadCount.toString()
        });
        res.end(reportData.buffer);
        return;
      }
    }

    if (req.method === "POST" && apiPath === "/reports") {
      await handleReportGeneration(req, res);
      return;
    }

    if (req.method === "POST" && apiPath === "/esign/envelopes") {
      await handleCreateEnvelope(req, res);
      return;
    }

    if (req.method === "POST" && apiPath === "/esign/webhook") {
      await handleEnvelopeWebhook(req, res);
      return;
    }

    if (segments[0] === "adviser" && segments[1] === "cases") {
      if (req.method === "GET" && segments.length === 2) {
        handleListCases(res);
        return;
      }

      if (segments.length === 3) {
        const caseId = segments[2];
        if (req.method === "GET") {
          handleGetCase(res, caseId);
          return;
        }
        if (req.method === "PATCH") {
          await handlePatchCase(req, res, caseId);
          return;
        }
      }
    }

    // Compliance endpoints
    if (segments[0] === "sessions" && segments.length >= 3 && segments[2] === "compliance") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetComplianceSummary(res, sessionId);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 4 && segments[2] === "education") {
      const sessionId = segments[1];
      const filename = segments[3];
      if (req.method === "GET") {
        handleGetEducationalPdf(res, sessionId, filename);
        return;
      }
    }

    // Document management endpoints
    if (segments[0] === "admin" && segments[1] === "documents") {
      if (req.method === "GET" && segments.length === 2) {
        const stats = getStorageStats();
        sendJSON(res, 200, { storage_stats: stats });
        return;
      }
      
      if (segments.length === 4 && segments[2] === "integrity") {
        const sessionId = segments[3];
        if (req.method === "GET") {
          const integrity = validateDocumentIntegrity(sessionId);
          sendJSON(res, 200, { 
            session_id: sessionId,
            integrity_check: integrity 
          });
          return;
        }
      }
    }

    // Investment research and advisor integration endpoints
    if (segments[0] === "adviser" && segments[1] === "investment-research") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetInvestmentResearchSummary(res);
        return;
      }
      
      if (segments.length === 3) {
        const sessionId = segments[2];
        if (req.method === "GET") {
          handleGetSessionInvestmentResearch(res, sessionId);
          return;
        }
      }
    }

    if (segments[0] === "adviser" && segments[1] === "notifications") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetAdvisorNotifications(res);
        return;
      }
      
      if (segments.length === 3) {
        const notificationId = segments[2];
        if (req.method === "PATCH") {
          await handleUpdateNotificationStatus(req, res, notificationId);
          return;
        }
      }
    }

    if (segments[0] === "adviser" && segments[1] === "recommendations") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetPendingRecommendations(res);
        return;
      }
      
      if (segments.length === 3) {
        const workflowId = segments[2];
        if (req.method === "GET") {
          handleGetRecommendationWorkflow(res, workflowId);
          return;
        }
        if (req.method === "PATCH") {
          await handleUpdateRecommendationWorkflow(req, res, workflowId);
          return;
        }
      }
    }

    // Comprehensive Session Management APIs
    if (segments[0] === "sessions" && segments[1] === "advanced") {
      if (req.method === "GET" && segments.length === 2) {
        handleListSessionsAdvanced(req, res);
        return;
      }
    }

    if (segments[0] === "sessions" && segments[1] === "search") {
      if (req.method === "GET" && segments.length === 2) {
        handleSearchSessions(req, res);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 3 && segments[2] === "status") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetSessionStatus(res, sessionId);
        return;
      }
      if (req.method === "PATCH") {
        await handleUpdateSessionStatus(req, res, sessionId);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 3 && segments[2] === "progress") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetSessionProgress(res, sessionId);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 4 && segments[2] === "notes") {
      const sessionId = segments[1];
      if (req.method === "POST" && segments.length === 3) {
        await handleAddAdvisorNote(req, res, sessionId);
        return;
      }
      if (segments.length === 4) {
        const noteId = segments[3];
        if (req.method === "PATCH") {
          await handleUpdateAdvisorNote(req, res, sessionId, noteId);
          return;
        }
      }
    }

    if (segments[0] === "sessions" && segments[1] === "bulk") {
      if (req.method === "POST" && segments.length === 2) {
        await handleBulkSessionOperations(req, res);
        return;
      }
    }

    if (segments[0] === "sessions" && segments[1] === "statistics") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetSessionStatistics(res);
        return;
      }
    }

    if (segments[0] === "sessions" && segments[1] === "validate") {
      if (req.method === "POST" && segments.length === 2) {
        await handleValidateAllSessions(req, res);
        return;
      }
    }

    if (segments[0] === "sessions" && segments[1] === "attention") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetSessionsRequiringAttention(req, res);
        return;
      }
    }

    // WebSocket Management APIs
    if (segments[0] === "websocket") {
      if (segments[1] === "stats") {
        if (req.method === "GET" && segments.length === 2) {
          handleGetWebSocketStats(res);
          return;
        }
      }
      
      if (segments[1] === "alerts") {
        if (req.method === "GET" && segments.length === 2) {
          handleGetActiveAlerts(res);
          return;
        }
        if (req.method === "POST" && segments.length === 2) {
          await handleTriggerAlert(req, res);
          return;
        }
        if (segments.length === 3) {
          const alertId = segments[2];
          if (req.method === "PATCH") {
            await handleAcknowledgeAlert(req, res, alertId);
            return;
          }
        }
        if (segments[2] === "cleanup" && req.method === "POST") {
          await handleCleanupAlerts(req, res);
          return;
        }
      }
      
      if (segments[1] === "broadcast" && req.method === "POST") {
        await handleBroadcastMessage(req, res);
        return;
      }
    }

    // Enhanced Guardrail and Risk Management APIs
    if (segments[0] === "sessions" && segments.length >= 3 && segments[2] === "guardrails") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetSessionGuardrails(res, sessionId);
        return;
      }
      if (req.method === "POST") {
        await handleEvaluateSessionGuardrails(req, res, sessionId);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 4 && segments[2] === "risk-assessment") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetSessionRiskAssessment(res, sessionId);
        return;
      }
    }

    if (segments[0] === "sessions" && segments.length >= 3 && segments[2] === "regulatory-compliance") {
      const sessionId = segments[1];
      if (req.method === "GET") {
        handleGetRegulatoryCompliance(res, sessionId);
        return;
      }
    }

    if (segments[0] === "admin" && segments[1] === "guardrails") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetGuardrailReport(req, res);
        return;
      }
    }

    if (segments[0] === "admin" && segments[1] === "escalations") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetEscalationQueue(req, res);
        return;
      }
      if (segments.length === 3) {
        const sessionId = segments[2];
        if (req.method === "PATCH") {
          await handleResolveEscalation(req, res, sessionId);
          return;
        }
      }
    }

    if (segments[0] === "admin" && segments[1] === "regulatory-changes") {
      if (req.method === "GET" && segments.length === 2) {
        handleGetRegulatoryChanges(req, res);
        return;
      }
      if (req.method === "POST" && segments.length === 2) {
        await handleRegisterRegulatoryChange(req, res);
        return;
      }
      if (segments.length === 3) {
        const changeId = segments[2];
        if (req.method === "PATCH") {
          await handleReviewRegulatoryChange(req, res, changeId);
          return;
        }
      }
    }

    // Dashboard API routes
    if (segments[0] === "dashboard") {
      const dashboardPath = segments.slice(1).join("/");
      
      if (req.method === "GET" && dashboardPath === "health") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getHealth(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "metrics") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getMetrics(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "alerts") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getAlerts(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "performance") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getPerformance(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "sessions") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getSessions(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "logs") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getLogs(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "cache") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getCache(req, res);
        return;
      }
      
      if (req.method === "GET" && dashboardPath === "system") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.getSystem(req, res);
        return;
      }
      
      if (req.method === "POST" && dashboardPath === "cache/clear") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.clearCache(req, res);
        return;
      }
      
      if (req.method === "POST" && dashboardPath === "metrics/reset") {
        const { dashboardRoutes } = await import("./monitoring/dashboardApi.js");
        await dashboardRoutes.resetMetrics(req, res);
        return;
      }
    }

    sendJSON(res, 404, { error: "Route not found" });
  } catch (error) {
    logger.logError(error, { 
      endpoint: apiPath,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.socket.remoteAddress
    });
    
    const status = error.status ?? 500;
    sendJSON(res, status, {
      error: error.message ?? "Unexpected error"
    });
  }
};

/**
 * Advanced conversation analytics for tracking engagement, personalization effectiveness,
 * and conversation flow optimization
 */

import { randomUUID } from "node:crypto";

// Analytics event types
export const ANALYTICS_EVENT_TYPES = {
  CONVERSATION_START: 'conversation_start',
  STAGE_TRANSITION: 'stage_transition',
  DETOUR_TAKEN: 'detour_taken',
  DETOUR_COMPLETED: 'detour_completed',
  PERSONALIZATION_APPLIED: 'personalization_applied',
  INPUT_MODE_CHANGED: 'input_mode_changed',
  ERROR_ENCOUNTERED: 'error_encountered',
  RECOVERY_ATTEMPTED: 'recovery_attempted',
  CONVERSATION_COMPLETED: 'conversation_completed'
};

// Conversation quality metrics
export const QUALITY_METRICS = {
  ENGAGEMENT_SCORE: 'engagement_score',
  PERSONALIZATION_EFFECTIVENESS: 'personalization_effectiveness',
  CONTEXT_PRESERVATION: 'context_preservation',
  ERROR_RECOVERY_SUCCESS: 'error_recovery_success',
  COMPLETION_RATE: 'completion_rate',
  TIME_TO_COMPLETION: 'time_to_completion'
};

/**
 * Tracks conversation analytics events
 */
export const trackAnalyticsEvent = (session, eventType, eventData = {}) => {
  if (!session.data.analytics) {
    session.data.analytics = {};
  }
  
  if (!session.data.analytics.events) {
    session.data.analytics.events = [];
  }

  const analyticsEvent = {
    id: randomUUID(),
    type: eventType,
    timestamp: new Date().toISOString(),
    stage: session.stage,
    data: eventData,
    sessionMetrics: calculateCurrentSessionMetrics(session)
  };

  session.data.analytics.events.push(analyticsEvent);

  // Keep only last 100 analytics events to prevent memory bloat
  if (session.data.analytics.events.length > 100) {
    session.data.analytics.events = session.data.analytics.events.slice(-100);
  }

  return analyticsEvent;
};

/**
 * Calculates current session metrics
 */
const calculateCurrentSessionMetrics = (session) => {
  const events = session.events || [];
  const analyticsEvents = session.data?.analytics?.events || [];
  const nlpHistory = session.data?.analytics?.nlp_history || [];
  
  const startTime = new Date(session.createdAt);
  const currentTime = new Date();
  const sessionDuration = currentTime - startTime;

  // Calculate engagement metrics
  const clientMessages = events.filter(e => e.author === 'client' && e.type === 'message');
  const avgMessageLength = clientMessages.length > 0 
    ? clientMessages.reduce((sum, msg) => sum + (msg.content?.text?.length || 0), 0) / clientMessages.length
    : 0;

  // Calculate detour metrics
  const detourEvents = analyticsEvents.filter(e => 
    e.type === ANALYTICS_EVENT_TYPES.DETOUR_TAKEN || 
    e.type === ANALYTICS_EVENT_TYPES.DETOUR_COMPLETED
  );
  const detourCount = detourEvents.filter(e => e.type === ANALYTICS_EVENT_TYPES.DETOUR_TAKEN).length;
  const completedDetours = detourEvents.filter(e => e.type === ANALYTICS_EVENT_TYPES.DETOUR_COMPLETED).length;

  // Calculate personalization metrics
  const personalizationEvents = analyticsEvents.filter(e => 
    e.type === ANALYTICS_EVENT_TYPES.PERSONALIZATION_APPLIED
  );

  // Calculate error and recovery metrics
  const errorEvents = analyticsEvents.filter(e => e.type === ANALYTICS_EVENT_TYPES.ERROR_ENCOUNTERED);
  const recoveryEvents = analyticsEvents.filter(e => e.type === ANALYTICS_EVENT_TYPES.RECOVERY_ATTEMPTED);

  return {
    sessionDuration: Math.round(sessionDuration / 1000), // in seconds
    totalMessages: events.length,
    clientMessages: clientMessages.length,
    avgMessageLength: Math.round(avgMessageLength),
    detourCount,
    detourCompletionRate: detourCount > 0 ? completedDetours / detourCount : 0,
    personalizationCount: personalizationEvents.length,
    errorCount: errorEvents.length,
    recoveryAttempts: recoveryEvents.length,
    currentStage: session.stage,
    sophisticationLevel: session.context?.clientSophistication?.level || 'unknown',
    engagementLevel: session.data?.analytics?.engagement?.summary?.currentEngagementLevel || 'unknown'
  };
};

/**
 * Analyzes conversation effectiveness and generates insights
 */
export const analyzeConversationEffectiveness = (session) => {
  const analytics = session.data?.analytics || {};
  const events = analytics.events || [];
  const nlpHistory = analytics.nlp_history || [];
  const engagement = analytics.engagement || {};

  const insights = {
    overallScore: 0,
    strengths: [],
    improvements: [],
    recommendations: [],
    metrics: {}
  };

  // Analyze engagement patterns
  const engagementAnalysis = analyzeEngagementPatterns(engagement, nlpHistory);
  insights.metrics.engagement = engagementAnalysis;
  insights.overallScore += engagementAnalysis.score * 0.3;

  // Analyze personalization effectiveness
  const personalizationAnalysis = analyzePersonalizationEffectiveness(events, nlpHistory);
  insights.metrics.personalization = personalizationAnalysis;
  insights.overallScore += personalizationAnalysis.score * 0.25;

  // Analyze context preservation
  const contextAnalysis = analyzeContextPreservation(events, session);
  insights.metrics.contextPreservation = contextAnalysis;
  insights.overallScore += contextAnalysis.score * 0.2;

  // Analyze error handling
  const errorAnalysis = analyzeErrorHandling(events);
  insights.metrics.errorHandling = errorAnalysis;
  insights.overallScore += errorAnalysis.score * 0.15;

  // Analyze conversation flow
  const flowAnalysis = analyzeConversationFlow(session);
  insights.metrics.conversationFlow = flowAnalysis;
  insights.overallScore += flowAnalysis.score * 0.1;

  // Generate insights and recommendations
  generateInsightsAndRecommendations(insights);

  return insights;
};

/**
 * Analyzes engagement patterns throughout the conversation
 */
const analyzeEngagementPatterns = (engagement, nlpHistory) => {
  const analysis = {
    score: 0.5, // Default neutral score
    trend: 'stable',
    patterns: [],
    concerns: []
  };

  if (!engagement.messages || engagement.messages.length === 0) {
    analysis.concerns.push('No engagement data available');
    return analysis;
  }

  const recentMessages = engagement.messages.slice(-10);
  const avgEngagement = recentMessages.reduce((sum, msg) => 
    sum + (msg.sentiment?.engagementScore || 0), 0) / recentMessages.length;

  // Score based on average engagement
  if (avgEngagement >= 3) {
    analysis.score = 0.9;
    analysis.patterns.push('High engagement maintained');
  } else if (avgEngagement >= 2) {
    analysis.score = 0.7;
    analysis.patterns.push('Good engagement levels');
  } else if (avgEngagement >= 1) {
    analysis.score = 0.5;
    analysis.patterns.push('Moderate engagement');
  } else {
    analysis.score = 0.3;
    analysis.concerns.push('Low engagement detected');
  }

  // Analyze engagement trend
  if (recentMessages.length >= 5) {
    const firstHalf = recentMessages.slice(0, Math.floor(recentMessages.length / 2));
    const secondHalf = recentMessages.slice(Math.floor(recentMessages.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, msg) => sum + (msg.sentiment?.engagementScore || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, msg) => sum + (msg.sentiment?.engagementScore || 0), 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 0.5) {
      analysis.trend = 'improving';
      analysis.patterns.push('Engagement improving over time');
    } else if (secondAvg < firstAvg - 0.5) {
      analysis.trend = 'declining';
      analysis.concerns.push('Engagement declining over time');
    }
  }

  return analysis;
};

/**
 * Analyzes the effectiveness of personalization strategies
 */
const analyzePersonalizationEffectiveness = (events, nlpHistory) => {
  const analysis = {
    score: 0.5,
    adaptationsUsed: [],
    effectiveness: {},
    recommendations: []
  };

  const personalizationEvents = events.filter(e => 
    e.type === ANALYTICS_EVENT_TYPES.PERSONALIZATION_APPLIED
  );

  if (personalizationEvents.length === 0) {
    analysis.score = 0.3;
    analysis.recommendations.push('Consider implementing more personalization');
    return analysis;
  }

  // Analyze adaptation types used
  const adaptationTypes = {};
  personalizationEvents.forEach(event => {
    const adaptations = event.data?.adaptations || {};
    Object.keys(adaptations).forEach(key => {
      if (adaptations[key]) {
        adaptationTypes[key] = (adaptationTypes[key] || 0) + 1;
      }
    });
  });

  analysis.adaptationsUsed = Object.keys(adaptationTypes);

  // Score based on variety and frequency of adaptations
  const adaptationVariety = Object.keys(adaptationTypes).length;
  if (adaptationVariety >= 5) {
    analysis.score = 0.9;
  } else if (adaptationVariety >= 3) {
    analysis.score = 0.7;
  } else if (adaptationVariety >= 1) {
    analysis.score = 0.5;
  }

  // Analyze effectiveness based on subsequent engagement
  // This would require correlation analysis between personalization and engagement changes
  analysis.effectiveness = adaptationTypes;

  return analysis;
};

/**
 * Analyzes how well context is preserved across detours
 */
const analyzeContextPreservation = (events, session) => {
  const analysis = {
    score: 0.8, // Default good score
    detourCount: 0,
    successfulReturns: 0,
    contextLosses: 0,
    patterns: []
  };

  const detourStarts = events.filter(e => e.type === ANALYTICS_EVENT_TYPES.DETOUR_TAKEN);
  const detourEnds = events.filter(e => e.type === ANALYTICS_EVENT_TYPES.DETOUR_COMPLETED);

  analysis.detourCount = detourStarts.length;
  analysis.successfulReturns = detourEnds.length;

  if (analysis.detourCount === 0) {
    analysis.patterns.push('No detours taken - linear conversation');
    return analysis;
  }

  // Calculate context preservation rate
  const preservationRate = analysis.successfulReturns / analysis.detourCount;
  analysis.score = preservationRate;

  if (preservationRate >= 0.9) {
    analysis.patterns.push('Excellent context preservation');
  } else if (preservationRate >= 0.7) {
    analysis.patterns.push('Good context preservation');
  } else {
    analysis.patterns.push('Context preservation needs improvement');
  }

  return analysis;
};

/**
 * Analyzes error handling and recovery effectiveness
 */
const analyzeErrorHandling = (events) => {
  const analysis = {
    score: 1.0, // Start with perfect score
    errorCount: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    patterns: []
  };

  const errorEvents = events.filter(e => e.type === ANALYTICS_EVENT_TYPES.ERROR_ENCOUNTERED);
  const recoveryEvents = events.filter(e => e.type === ANALYTICS_EVENT_TYPES.RECOVERY_ATTEMPTED);

  analysis.errorCount = errorEvents.length;
  analysis.recoveryAttempts = recoveryEvents.length;

  if (analysis.errorCount === 0) {
    analysis.patterns.push('No errors encountered');
    return analysis;
  }

  // Analyze recovery success rate
  // This would need more sophisticated tracking of recovery outcomes
  analysis.successfulRecoveries = recoveryEvents.filter(e => 
    e.data?.success === true
  ).length;

  const recoveryRate = analysis.recoveryAttempts > 0 
    ? analysis.successfulRecoveries / analysis.recoveryAttempts 
    : 0;

  // Adjust score based on error frequency and recovery success
  const errorRate = analysis.errorCount / Math.max(events.length, 1);
  analysis.score = Math.max(0, 1 - errorRate * 2) * (0.5 + recoveryRate * 0.5);

  if (recoveryRate >= 0.8) {
    analysis.patterns.push('Excellent error recovery');
  } else if (recoveryRate >= 0.6) {
    analysis.patterns.push('Good error recovery');
  } else {
    analysis.patterns.push('Error recovery needs improvement');
  }

  return analysis;
};

/**
 * Analyzes overall conversation flow efficiency
 */
const analyzeConversationFlow = (session) => {
  const analysis = {
    score: 0.7, // Default good score
    efficiency: 0,
    stageProgression: [],
    bottlenecks: [],
    patterns: []
  };

  const events = session.events || [];
  const stages = [];
  
  // Track stage progression
  events.forEach(event => {
    if (event.type === 'stage_transition' || event.content?.stage) {
      stages.push({
        stage: event.content?.stage || session.stage,
        timestamp: event.createdAt
      });
    }
  });

  if (stages.length < 2) {
    analysis.patterns.push('Limited stage progression data');
    return analysis;
  }

  // Calculate time spent in each stage
  const stageDurations = {};
  for (let i = 0; i < stages.length - 1; i++) {
    const stage = stages[i].stage;
    const duration = new Date(stages[i + 1].timestamp) - new Date(stages[i].timestamp);
    stageDurations[stage] = (stageDurations[stage] || 0) + duration;
  }

  // Identify bottlenecks (stages taking unusually long)
  const avgDuration = Object.values(stageDurations).reduce((sum, dur) => sum + dur, 0) / Object.keys(stageDurations).length;
  
  Object.entries(stageDurations).forEach(([stage, duration]) => {
    if (duration > avgDuration * 2) {
      analysis.bottlenecks.push({
        stage,
        duration: Math.round(duration / 1000), // Convert to seconds
        factor: Math.round(duration / avgDuration * 10) / 10
      });
    }
  });

  // Calculate efficiency score
  const totalTime = new Date() - new Date(session.createdAt);
  const expectedTime = Object.keys(stageDurations).length * 120000; // 2 minutes per stage
  analysis.efficiency = Math.min(1, expectedTime / totalTime);
  analysis.score = analysis.efficiency;

  if (analysis.efficiency >= 0.8) {
    analysis.patterns.push('Efficient conversation flow');
  } else if (analysis.efficiency >= 0.6) {
    analysis.patterns.push('Reasonable conversation flow');
  } else {
    analysis.patterns.push('Conversation flow could be optimized');
  }

  return analysis;
};

/**
 * Generates actionable insights and recommendations
 */
const generateInsightsAndRecommendations = (insights) => {
  // Analyze strengths
  if (insights.metrics.engagement?.score >= 0.7) {
    insights.strengths.push('Strong client engagement maintained');
  }
  
  if (insights.metrics.personalization?.score >= 0.7) {
    insights.strengths.push('Effective personalization strategies');
  }
  
  if (insights.metrics.contextPreservation?.score >= 0.8) {
    insights.strengths.push('Excellent context preservation across detours');
  }

  // Identify improvement areas
  if (insights.metrics.engagement?.score < 0.5) {
    insights.improvements.push('Improve client engagement strategies');
    insights.recommendations.push('Consider more interactive elements or simplified language');
  }
  
  if (insights.metrics.personalization?.score < 0.5) {
    insights.improvements.push('Enhance personalization effectiveness');
    insights.recommendations.push('Implement more sophisticated adaptation strategies');
  }
  
  if (insights.metrics.errorHandling?.errorCount > 0) {
    insights.improvements.push('Reduce error frequency');
    insights.recommendations.push('Improve input validation and error prevention');
  }

  // Generate specific recommendations based on patterns
  if (insights.metrics.conversationFlow?.bottlenecks?.length > 0) {
    const bottleneckStages = insights.metrics.conversationFlow.bottlenecks.map(b => b.stage);
    insights.recommendations.push(`Optimize flow in stages: ${bottleneckStages.join(', ')}`);
  }

  if (insights.overallScore < 0.6) {
    insights.recommendations.push('Consider comprehensive conversation flow review');
  }
};

/**
 * Generates a conversation summary report
 */
export const generateConversationSummary = (session) => {
  const effectiveness = analyzeConversationEffectiveness(session);
  const metrics = calculateCurrentSessionMetrics(session);
  
  return {
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    duration: metrics.sessionDuration,
    stage: session.stage,
    completionStatus: getCompletionStatus(session),
    effectiveness,
    metrics,
    clientProfile: {
      sophisticationLevel: session.context?.clientSophistication?.level,
      inputMode: session.context?.clientSophistication?.inputMode,
      engagementLevel: metrics.engagementLevel
    },
    recommendations: effectiveness.recommendations
  };
};

/**
 * Determines conversation completion status
 */
const getCompletionStatus = (session) => {
  const stage = session.stage;
  
  if (stage === 'SEGMENT_H_DELIVERY' || stage === 'SEGMENT_COMPLETE') {
    return 'completed';
  } else if (stage === 'SEGMENT_G_REPORT') {
    return 'nearly_complete';
  } else if (['SEGMENT_E_OPTIONS', 'SEGMENT_F_CONFIRMATION'].includes(stage)) {
    return 'in_progress_advanced';
  } else if (['SEGMENT_B_ONBOARDING', 'SEGMENT_C_CONSENT', 'SEGMENT_D_EDUCATION'].includes(stage)) {
    return 'in_progress_early';
  } else {
    return 'just_started';
  }
};
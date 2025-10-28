import { randomUUID } from "node:crypto";

/**
 * Enhanced context management system for conversation flow
 * Handles context preservation across detours, sentiment analysis, and engagement tracking
 */

// Context types for different conversation elements
export const CONTEXT_TYPES = {
  CONVERSATION_FLOW: 'conversation_flow',
  DETOUR: 'detour',
  EDUCATIONAL: 'educational',
  INVESTMENT_EXPLORATION: 'investment_exploration',
  COMPLIANCE_QUERY: 'compliance_query',
  ERROR_RECOVERY: 'error_recovery'
};

// Sentiment categories
export const SENTIMENT_CATEGORIES = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral', 
  NEGATIVE: 'negative',
  CONFUSED: 'confused',
  FRUSTRATED: 'frustrated',
  ENGAGED: 'engaged'
};

// Engagement levels
export const ENGAGEMENT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

/**
 * Context stack manager for handling conversation detours
 */
export class ConversationContextStack {
  constructor(session) {
    this.session = session;
    this.initializeContextStack();
  }

  initializeContextStack() {
    if (!this.session.context) {
      this.session.context = {};
    }
    
    if (!this.session.context.contextStack) {
      this.session.context.contextStack = [];
    }

    if (!this.session.context.currentContext) {
      this.session.context.currentContext = {
        type: CONTEXT_TYPES.CONVERSATION_FLOW,
        stage: this.session.stage,
        step: null,
        data: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Pushes a new context onto the stack (entering a detour)
   */
  pushContext(contextType, contextData = {}) {
    const newContext = {
      id: randomUUID(),
      type: contextType,
      stage: this.session.stage,
      parentContext: this.session.context.currentContext,
      data: contextData,
      timestamp: new Date().toISOString(),
      resumePrompt: this.generateResumePrompt()
    };

    this.session.context.contextStack.push(this.session.context.currentContext);
    this.session.context.currentContext = newContext;

    // Track detour analytics
    this.trackDetourEntry(contextType, contextData);

    return newContext;
  }

  /**
   * Pops the current context and returns to the previous one
   */
  popContext() {
    if (this.session.context.contextStack.length === 0) {
      return null; // Already at base context
    }

    const completedContext = this.session.context.currentContext;
    const previousContext = this.session.context.contextStack.pop();
    
    this.session.context.currentContext = previousContext;

    // Track detour completion
    this.trackDetourCompletion(completedContext);

    return previousContext;
  }

  /**
   * Gets the current context depth (number of nested detours)
   */
  getContextDepth() {
    return this.session.context.contextStack.length;
  }

  /**
   * Checks if currently in a detour
   */
  isInDetour() {
    return this.session.context.currentContext.type !== CONTEXT_TYPES.CONVERSATION_FLOW;
  }

  /**
   * Gets the base conversation context
   */
  getBaseContext() {
    if (this.session.context.contextStack.length === 0) {
      return this.session.context.currentContext;
    }
    return this.session.context.contextStack[0];
  }

  /**
   * Generates appropriate resume prompt for returning to main flow
   */
  generateResumePrompt() {
    const stage = this.session.stage;
    const context = this.session.context;

    // Stage-specific resume prompts
    const resumePrompts = {
      'SEGMENT_B_ONBOARDING': this.generateOnboardingResumePrompt(),
      'SEGMENT_C_CONSENT': this.generateConsentResumePrompt(),
      'SEGMENT_D_EDUCATION': this.generateEducationResumePrompt(),
      'SEGMENT_E_OPTIONS': this.generateOptionsResumePrompt(),
      'SEGMENT_F_CONFIRMATION': "Shall I continue with the summary confirmation?",
      'SEGMENT_G_REPORT': "Ready to proceed with report generation?",
      'SEGMENT_H_DELIVERY': "Is there anything else you need help with?"
    };

    return resumePrompts[stage] || "Would you like to continue where we left off?";
  }

  generateOnboardingResumePrompt() {
    const step = this.session.context.onboardingStep || 0;
    const questions = {
      0: "Let's continue with your client type - are you investing as an individual, joint, trust, or company?",
      1: "Back to your investment goals - what's your main objective?",
      2: "Continuing with your investment timeline - how many years do you plan to invest?",
      3: "Let's get your risk comfort level - on a scale of 1-7, how do you feel about investment risk?",
      4: "Now for capacity for loss - how much could you afford to lose without affecting your lifestyle?",
      5: "About liquidity - will you need to withdraw funds at specific times?",
      6: "Regarding experience - can you describe your investment background?",
      7: "For financial context - would you like to record income, assets, and liabilities?",
      8: "Please share your financial details for context."
    };
    return questions[step] || "Let's continue with the suitability questions.";
  }

  generateConsentResumePrompt() {
    const step = this.session.context.consentStep || 0;
    const questions = {
      0: "Back to consent - do you agree to us processing your data for this advice session?",
      1: "For document delivery - do you consent to receive documents electronically?",
      2: "About future contact - can we reach out with relevant updates?",
      3: "What purpose should we note for future contact?"
    };
    return questions[step] || "Let's finish the consent questions.";
  }

  generateEducationResumePrompt() {
    const education = this.session.context.education || {};
    if (!education.acknowledged) {
      return "Have you finished reviewing the ESG education pack?";
    }
    if (education.summaryOffered && !education.summarised) {
      return "Would you like that Focus vs Improvers summary?";
    }
    return "Ready to move on to your sustainability preferences?";
  }

  generateOptionsResumePrompt() {
    const options = this.session.context.options || {};
    if (!options.preferenceLevel) {
      return "Back to preferences - do you have sustainability preferences (none, high_level, or detailed)?";
    }
    const step = options.step || 1;
    const questions = {
      1: "Which FCA SDR labels interest you?",
      2: "Any particular sustainability themes you want to focus on?",
      3: "What exclusions and thresholds would you like?",
      4: "Do you have specific impact goals?",
      5: "How important is active stewardship to you?",
      6: "How often would you like sustainability reporting?",
      7: "What performance trade-offs are you willing to accept?"
    };
    return questions[step] || "Let's continue with your sustainability preferences.";
  }

  trackDetourEntry(contextType, contextData) {
    if (!this.session.data.analytics) {
      this.session.data.analytics = {};
    }
    if (!this.session.data.analytics.detours) {
      this.session.data.analytics.detours = [];
    }

    this.session.data.analytics.detours.push({
      id: randomUUID(),
      type: 'detour_entry',
      contextType,
      stage: this.session.stage,
      timestamp: new Date().toISOString(),
      depth: this.getContextDepth(),
      data: contextData
    });
  }

  trackDetourCompletion(completedContext) {
    if (!this.session.data.analytics?.detours) return;

    this.session.data.analytics.detours.push({
      id: randomUUID(),
      type: 'detour_completion',
      contextType: completedContext.type,
      contextId: completedContext.id,
      stage: this.session.stage,
      timestamp: new Date().toISOString(),
      duration: Date.now() - new Date(completedContext.timestamp).getTime(),
      depth: this.getContextDepth()
    });
  }
}

/**
 * Sentiment analysis for client messages
 */
export const analyzeSentiment = (text, conversationHistory = []) => {
  if (!text || typeof text !== 'string') {
    return {
      category: SENTIMENT_CATEGORIES.NEUTRAL,
      confidence: 0,
      indicators: []
    };
  }

  const normalizedText = text.toLowerCase();
  const indicators = [];
  let sentimentScore = 0;

  // Positive sentiment indicators
  const positivePatterns = [
    { pattern: /\b(great|excellent|perfect|wonderful|fantastic|amazing)\b/g, weight: 3, label: 'strong_positive' },
    { pattern: /\b(good|nice|helpful|clear|understand|got it|makes sense)\b/g, weight: 2, label: 'positive' },
    { pattern: /\b(yes|sure|okay|ok|ready|let's go|continue)\b/g, weight: 1, label: 'agreement' },
    { pattern: /\b(thank you|thanks|appreciate)\b/g, weight: 2, label: 'gratitude' }
  ];

  // Negative sentiment indicators  
  const negativePatterns = [
    { pattern: /\b(confused|lost|don't understand|unclear|complicated)\b/g, weight: -3, label: 'confusion' },
    { pattern: /\b(frustrated|annoyed|difficult|hard|struggle)\b/g, weight: -3, label: 'frustration' },
    { pattern: /\b(no|not|don't|won't|can't|unable)\b/g, weight: -1, label: 'negation' },
    { pattern: /\b(wrong|incorrect|mistake|error)\b/g, weight: -2, label: 'error_indication' }
  ];

  // Engagement indicators
  const engagementPatterns = [
    { pattern: /\?/g, weight: 1, label: 'questioning' },
    { pattern: /\b(why|how|what if|explain|tell me more|elaborate)\b/g, weight: 2, label: 'curiosity' },
    { pattern: /\b(interesting|I see|that's|actually)\b/g, weight: 1, label: 'engagement' }
  ];

  // Process positive patterns
  for (const { pattern, weight, label } of positivePatterns) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      sentimentScore += matches.length * weight;
      indicators.push({ type: 'positive', label, count: matches.length });
    }
  }

  // Process negative patterns
  for (const { pattern, weight, label } of negativePatterns) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      sentimentScore += matches.length * weight;
      indicators.push({ type: 'negative', label, count: matches.length });
    }
  }

  // Process engagement patterns
  let engagementScore = 0;
  for (const { pattern, weight, label } of engagementPatterns) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      engagementScore += matches.length * weight;
      indicators.push({ type: 'engagement', label, count: matches.length });
    }
  }

  // Determine sentiment category
  let category;
  if (sentimentScore >= 3) category = SENTIMENT_CATEGORIES.POSITIVE;
  else if (sentimentScore <= -3) category = SENTIMENT_CATEGORIES.NEGATIVE;
  else if (indicators.some(i => i.label === 'confusion')) category = SENTIMENT_CATEGORIES.CONFUSED;
  else if (indicators.some(i => i.label === 'frustration')) category = SENTIMENT_CATEGORIES.FRUSTRATED;
  else if (engagementScore >= 2) category = SENTIMENT_CATEGORIES.ENGAGED;
  else category = SENTIMENT_CATEGORIES.NEUTRAL;

  // Calculate confidence based on number of indicators
  const confidence = Math.min(indicators.length * 0.2, 1.0);

  return {
    category,
    confidence,
    sentimentScore,
    engagementScore,
    indicators,
    textLength: text.length,
    wordCount: text.split(/\s+/).length
  };
};

/**
 * Tracks client engagement throughout the conversation
 */
export const trackClientEngagement = (session, messageText, sentimentAnalysis) => {
  if (!session.data.analytics) {
    session.data.analytics = {};
  }
  if (!session.data.analytics.engagement) {
    session.data.analytics.engagement = {
      messages: [],
      summary: {
        totalMessages: 0,
        averageSentiment: 0,
        engagementTrend: [],
        detourCount: 0,
        questionCount: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  const engagement = session.data.analytics.engagement;
  
  // Add current message analysis
  const messageAnalysis = {
    timestamp: new Date().toISOString(),
    stage: session.stage,
    messageLength: messageText?.length || 0,
    wordCount: messageText?.split(/\s+/).length || 0,
    sentiment: sentimentAnalysis,
    contextDepth: session.context?.contextStack?.length || 0
  };

  engagement.messages.push(messageAnalysis);

  // Update summary statistics
  engagement.summary.totalMessages++;
  engagement.summary.questionCount += (messageText?.includes('?') ? 1 : 0);
  engagement.summary.detourCount = session.data.analytics.detours?.length || 0;

  // Calculate engagement level
  const recentMessages = engagement.messages.slice(-5);
  const avgEngagement = recentMessages.reduce((sum, msg) => 
    sum + (msg.sentiment?.engagementScore || 0), 0) / recentMessages.length;
  
  let engagementLevel;
  if (avgEngagement >= 4) engagementLevel = ENGAGEMENT_LEVELS.VERY_HIGH;
  else if (avgEngagement >= 2) engagementLevel = ENGAGEMENT_LEVELS.HIGH;
  else if (avgEngagement >= 1) engagementLevel = ENGAGEMENT_LEVELS.MEDIUM;
  else engagementLevel = ENGAGEMENT_LEVELS.LOW;

  engagement.summary.currentEngagementLevel = engagementLevel;
  engagement.summary.lastUpdated = new Date().toISOString();

  // Track engagement trend
  engagement.summary.engagementTrend.push({
    timestamp: new Date().toISOString(),
    level: engagementLevel,
    score: avgEngagement
  });

  // Keep only last 10 trend points
  if (engagement.summary.engagementTrend.length > 10) {
    engagement.summary.engagementTrend = engagement.summary.engagementTrend.slice(-10);
  }

  return engagementLevel;
};

/**
 * Adapts conversation based on client engagement and sentiment
 */
export const adaptConversationStyle = (session, engagementLevel, sentimentAnalysis) => {
  const adaptations = {
    responseStyle: 'standard',
    offerHelp: false,
    simplifyLanguage: false,
    provideEncouragement: false,
    offerAlternatives: false,
    checkUnderstanding: false
  };

  // Adapt based on sentiment
  switch (sentimentAnalysis.category) {
    case SENTIMENT_CATEGORIES.CONFUSED:
      adaptations.responseStyle = 'clarifying';
      adaptations.simplifyLanguage = true;
      adaptations.checkUnderstanding = true;
      adaptations.offerHelp = true;
      break;

    case SENTIMENT_CATEGORIES.FRUSTRATED:
      adaptations.responseStyle = 'supportive';
      adaptations.provideEncouragement = true;
      adaptations.offerAlternatives = true;
      adaptations.simplifyLanguage = true;
      break;

    case SENTIMENT_CATEGORIES.POSITIVE:
      adaptations.responseStyle = 'encouraging';
      adaptations.provideEncouragement = true;
      break;

    case SENTIMENT_CATEGORIES.ENGAGED:
      adaptations.responseStyle = 'detailed';
      break;
  }

  // Adapt based on engagement level
  switch (engagementLevel) {
    case ENGAGEMENT_LEVELS.LOW:
      adaptations.provideEncouragement = true;
      adaptations.offerAlternatives = true;
      adaptations.simplifyLanguage = true;
      break;

    case ENGAGEMENT_LEVELS.VERY_HIGH:
      adaptations.responseStyle = 'detailed';
      break;
  }

  // Store adaptations in session context
  if (!session.context.conversationAdaptations) {
    session.context.conversationAdaptations = {};
  }
  
  session.context.conversationAdaptations = {
    ...adaptations,
    lastUpdated: new Date().toISOString(),
    basedOn: {
      sentiment: sentimentAnalysis.category,
      engagement: engagementLevel
    }
  };

  return adaptations;
};

/**
 * Generates personalized response based on conversation adaptations
 */
export const personalizeResponse = (baseResponse, adaptations, session) => {
  if (!adaptations || !baseResponse) return baseResponse;

  let personalizedResponse = baseResponse;

  // Apply response style modifications
  switch (adaptations.responseStyle) {
    case 'clarifying':
      personalizedResponse = addClarifyingElements(personalizedResponse);
      break;
    case 'supportive':
      personalizedResponse = addSupportiveElements(personalizedResponse);
      break;
    case 'encouraging':
      personalizedResponse = addEncouragingElements(personalizedResponse);
      break;
    case 'detailed':
      personalizedResponse = addDetailedElements(personalizedResponse, session);
      break;
  }

  // Add help offer if needed
  if (adaptations.offerHelp) {
    personalizedResponse += " Let me know if you need any clarification or would like me to explain anything differently.";
  }

  // Add encouragement if needed
  if (adaptations.provideEncouragement) {
    personalizedResponse += " You're doing great - we're making good progress through this.";
  }

  // Offer alternatives if needed
  if (adaptations.offerAlternatives) {
    personalizedResponse += " If this approach isn't working for you, I can try a different way or use the structured form instead.";
  }

  // Add understanding check if needed
  if (adaptations.checkUnderstanding) {
    personalizedResponse += " Does this make sense, or would you like me to explain it differently?";
  }

  return personalizedResponse;
};

const addClarifyingElements = (response) => {
  return `Let me clarify: ${response}`;
};

const addSupportiveElements = (response) => {
  return `I understand this can be complex. ${response}`;
};

const addEncouragingElements = (response) => {
  return `Great! ${response}`;
};

const addDetailedElements = (response, session) => {
  // Add regulatory context for engaged clients
  const stage = session?.stage;
  const contextualInfo = {
    'SEGMENT_B_ONBOARDING': " This information helps ensure we meet FCA suitability requirements.",
    'SEGMENT_C_CONSENT': " These consent requirements are part of data protection regulations.",
    'SEGMENT_D_EDUCATION': " The FCA requires this education under the Anti-Greenwashing Rule.",
    'SEGMENT_E_OPTIONS': " This maps to the SDR label framework for sustainability preferences."
  };

  const context = contextualInfo[stage] || "";
  return `${response}${context}`;
};

/**
 * Manages conversation recovery after errors or interruptions
 */
export const manageConversationRecovery = (session, errorContext) => {
  const contextStack = new ConversationContextStack(session);
  
  // Push error recovery context
  const recoveryContext = contextStack.pushContext(CONTEXT_TYPES.ERROR_RECOVERY, {
    errorType: errorContext.type,
    errorMessage: errorContext.message,
    attemptedAction: errorContext.action,
    timestamp: new Date().toISOString()
  });

  // Generate recovery strategy
  const recoveryStrategy = {
    approach: determineRecoveryApproach(errorContext, session),
    message: generateRecoveryMessage(errorContext, session),
    alternatives: generateRecoveryAlternatives(errorContext, session),
    resumePrompt: contextStack.generateResumePrompt()
  };

  return {
    recoveryContext,
    recoveryStrategy,
    contextStack
  };
};

const determineRecoveryApproach = (errorContext, session) => {
  const sophistication = session?.context?.clientSophistication?.level;
  const engagementLevel = session?.data?.analytics?.engagement?.summary?.currentEngagementLevel;

  if (errorContext.type === 'validation_error') {
    if (sophistication === 'basic' || engagementLevel === ENGAGEMENT_LEVELS.LOW) {
      return 'simplified_retry';
    }
    return 'guided_correction';
  }

  if (errorContext.type === 'technical_error') {
    return 'graceful_fallback';
  }

  return 'standard_retry';
};

const generateRecoveryMessage = (errorContext, session) => {
  const messages = {
    validation_error: "I need to get that information in a slightly different format. Let me help guide you through it.",
    technical_error: "I'm experiencing a technical issue. Let me try a different approach.",
    timeout_error: "It looks like we got disconnected. Let's pick up where we left off.",
    input_error: "I didn't quite catch that. Could you try rephrasing your response?"
  };

  return messages[errorContext.type] || "Let's try that again.";
};

const generateRecoveryAlternatives = (errorContext, session) => {
  const alternatives = [];

  if (errorContext.type === 'validation_error') {
    alternatives.push("Use the structured form for step-by-step guidance");
    alternatives.push("Let me ask the question in a different way");
  }

  if (errorContext.type === 'input_error') {
    alternatives.push("Choose from predefined options");
    alternatives.push("Skip this question for now and come back to it");
  }

  return alternatives;
};
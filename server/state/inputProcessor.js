import { sanitizeInput } from './conversationEngine.js';

/**
 * Enhanced input processing system for multi-modal conversation support
 * Handles both free-text and structured data input with client sophistication detection
 */

// Client sophistication levels based on interaction patterns
export const SOPHISTICATION_LEVELS = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate', 
  ADVANCED: 'advanced'
};

// Input modes supported by the system
export const INPUT_MODES = {
  FREE_TEXT: 'free_text',
  STRUCTURED_FORM: 'structured_form',
  GUIDED_SELECTION: 'guided_selection',
  HYBRID: 'hybrid'
};

// Conversation branching strategies
export const BRANCHING_STRATEGIES = {
  LINEAR: 'linear',           // Standard sequential flow
  ADAPTIVE: 'adaptive',       // Adjusts based on client responses
  EXPERT: 'expert',          // Allows skipping and advanced options
  SIMPLIFIED: 'simplified'    // Reduced complexity for basic users
};

/**
 * Analyzes client input patterns to determine sophistication level
 */
export const detectClientSophistication = (session) => {
  if (!session?.events || !Array.isArray(session.events)) {
    return SOPHISTICATION_LEVELS.BASIC;
  }

  const clientMessages = session.events.filter(
    event => event.author === 'client' && event.type === 'message'
  );

  if (clientMessages.length < 3) {
    return SOPHISTICATION_LEVELS.BASIC;
  }

  let sophisticationScore = 0;
  let totalMessages = 0;

  for (const message of clientMessages) {
    const text = message.content?.text || '';
    if (!text.trim()) continue;

    totalMessages++;
    
    // Length and complexity indicators
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 20) sophisticationScore += 2;
    else if (wordCount > 10) sophisticationScore += 1;

    // Technical terminology usage
    const technicalTerms = [
      /\b(esg|sustainability|governance|stewardship|exclusion|impact|sdg|carbon|emissions)\b/i,
      /\b(portfolio|allocation|diversification|volatility|correlation|benchmark)\b/i,
      /\b(risk\s+tolerance|capacity\s+for\s+loss|liquidity|horizon|suitability)\b/i,
      /\b(focus|improvers|mixed\s+goals|anti[- ]?greenwashing)\b/i
    ];
    
    const technicalMatches = technicalTerms.filter(pattern => pattern.test(text)).length;
    sophisticationScore += technicalMatches;

    // Question sophistication
    if (/\b(why|how|what\s+if|explain|clarify|elaborate)\b/i.test(text)) {
      sophisticationScore += 1;
    }

    // Specific numeric references
    if (/\b\d+%|\b\d+\s*(years?|months?)\b|\b£\d+/i.test(text)) {
      sophisticationScore += 1;
    }

    // Complex sentence structures
    if (text.includes(';') || text.split(',').length > 3) {
      sophisticationScore += 1;
    }
  }

  if (totalMessages === 0) return SOPHISTICATION_LEVELS.BASIC;

  const averageScore = sophisticationScore / totalMessages;
  
  if (averageScore >= 4) return SOPHISTICATION_LEVELS.ADVANCED;
  if (averageScore >= 2) return SOPHISTICATION_LEVELS.INTERMEDIATE;
  return SOPHISTICATION_LEVELS.BASIC;
};

/**
 * Determines optimal input mode based on client sophistication and stage
 */
export const selectInputMode = (session, sophisticationLevel) => {
  const stage = session?.stage || 'SEGMENT_A_EXPLANATION';
  
  // Stage-specific input mode preferences
  const stagePreferences = {
    'SEGMENT_A_EXPLANATION': INPUT_MODES.FREE_TEXT,
    'SEGMENT_B_ONBOARDING': sophisticationLevel === SOPHISTICATION_LEVELS.ADVANCED 
      ? INPUT_MODES.HYBRID : INPUT_MODES.STRUCTURED_FORM,
    'SEGMENT_C_CONSENT': INPUT_MODES.STRUCTURED_FORM,
    'SEGMENT_D_EDUCATION': INPUT_MODES.FREE_TEXT,
    'SEGMENT_E_OPTIONS': sophisticationLevel === SOPHISTICATION_LEVELS.BASIC 
      ? INPUT_MODES.GUIDED_SELECTION : INPUT_MODES.HYBRID,
    'SEGMENT_F_CONFIRMATION': INPUT_MODES.STRUCTURED_FORM,
    'SEGMENT_G_REPORT': INPUT_MODES.FREE_TEXT,
    'SEGMENT_H_DELIVERY': INPUT_MODES.FREE_TEXT
  };

  return stagePreferences[stage] || INPUT_MODES.FREE_TEXT;
};

/**
 * Determines conversation branching strategy based on client sophistication
 */
export const selectBranchingStrategy = (session, sophisticationLevel) => {
  const profile = session?.data?.client_profile || {};
  const hasComplexNeeds = (
    profile.objectives === 'other' ||
    (profile.financial_situation?.provided && profile.financial_situation?.notes?.length > 100) ||
    session?.data?.sustainability_preferences?.preference_level === 'detailed'
  );

  switch (sophisticationLevel) {
    case SOPHISTICATION_LEVELS.ADVANCED:
      return hasComplexNeeds ? BRANCHING_STRATEGIES.EXPERT : BRANCHING_STRATEGIES.ADAPTIVE;
    case SOPHISTICATION_LEVELS.INTERMEDIATE:
      return BRANCHING_STRATEGIES.ADAPTIVE;
    case SOPHISTICATION_LEVELS.BASIC:
    default:
      return hasComplexNeeds ? BRANCHING_STRATEGIES.ADAPTIVE : BRANCHING_STRATEGIES.SIMPLIFIED;
  }
};

/**
 * Processes multi-modal input and determines appropriate handling
 */
export const processMultiModalInput = (session, input) => {
  if (!input || typeof input !== 'object') {
    return { error: 'Invalid input format' };
  }

  const sophisticationLevel = detectClientSophistication(session);
  const inputMode = selectInputMode(session, sophisticationLevel);
  const branchingStrategy = selectBranchingStrategy(session, sophisticationLevel);

  // Update session context with sophistication analysis
  if (!session.context) session.context = {};
  session.context.clientSophistication = {
    level: sophisticationLevel,
    inputMode,
    branchingStrategy,
    lastAnalyzed: new Date().toISOString()
  };

  // Process different input types
  if (input.type === 'text' && input.content) {
    return processTextInput(session, input.content, sophisticationLevel, branchingStrategy);
  }

  if (input.type === 'structured' && input.data) {
    return processStructuredInput(session, input.data, sophisticationLevel);
  }

  if (input.type === 'guided' && input.selection) {
    return processGuidedSelection(session, input.selection, sophisticationLevel);
  }

  return { error: 'Unsupported input type' };
};

/**
 * Processes free-text input with sophistication-aware handling
 */
const processTextInput = (session, text, sophisticationLevel, branchingStrategy) => {
  const sanitizedText = sanitizeInput(text);
  
  if (!sanitizedText) {
    return { error: 'Empty or invalid text input' };
  }

  // Detect if client is providing structured data in free-text format
  const structuredPatterns = [
    /client\s+type:\s*(\w+)/i,
    /objective:\s*([^,\n]+)/i,
    /risk:\s*(\d+)/i,
    /horizon:\s*(\d+)\s*years?/i,
    /capacity:\s*(low|medium|high)/i
  ];

  const structuredMatches = structuredPatterns.filter(pattern => pattern.test(sanitizedText));
  
  if (structuredMatches.length >= 2 && sophisticationLevel !== SOPHISTICATION_LEVELS.BASIC) {
    // Client is providing structured data in text format - extract it
    return extractStructuredFromText(session, sanitizedText);
  }

  // Standard text processing with branching strategy consideration
  return {
    processedInput: {
      type: 'text',
      content: sanitizedText,
      sophisticationLevel,
      branchingStrategy,
      suggestedMode: sophisticationLevel === SOPHISTICATION_LEVELS.ADVANCED ? 'hybrid' : 'standard'
    }
  };
};

/**
 * Processes structured form input
 */
const processStructuredInput = (session, data, sophisticationLevel) => {
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid structured data format' };
  }

  // Validate structured data based on current stage
  const validation = validateStructuredData(session, data);
  if (!validation.valid) {
    return { error: validation.error, details: validation.details };
  }

  return {
    processedInput: {
      type: 'structured',
      data: data,
      sophisticationLevel,
      validated: true
    }
  };
};

/**
 * Processes guided selection input
 */
const processGuidedSelection = (session, selection, sophisticationLevel) => {
  if (!selection || typeof selection !== 'object') {
    return { error: 'Invalid guided selection format' };
  }

  return {
    processedInput: {
      type: 'guided',
      selection: selection,
      sophisticationLevel,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Extracts structured data from free-text input
 */
const extractStructuredFromText = (session, text) => {
  const extracted = {};
  
  // Client type extraction
  const clientTypeMatch = text.match(/client\s+type:\s*(\w+)/i);
  if (clientTypeMatch) {
    extracted.client_type = clientTypeMatch[1].toLowerCase();
  }

  // Objective extraction
  const objectiveMatch = text.match(/objective:\s*([^,\n]+)/i);
  if (objectiveMatch) {
    extracted.objectives = objectiveMatch[1].trim();
  }

  // Risk tolerance extraction
  const riskMatch = text.match(/risk(?:\s+tolerance)?:\s*(\d+)/i);
  if (riskMatch) {
    extracted.risk_tolerance = parseInt(riskMatch[1], 10);
  }

  // Horizon extraction
  const horizonMatch = text.match(/horizon:\s*(\d+)\s*years?/i);
  if (horizonMatch) {
    extracted.horizon_years = parseInt(horizonMatch[1], 10);
  }

  // Capacity for loss extraction
  const capacityMatch = text.match(/capacity(?:\s+for\s+loss)?:\s*(low|medium|high)/i);
  if (capacityMatch) {
    extracted.capacity_for_loss = capacityMatch[1].toLowerCase();
  }

  return {
    processedInput: {
      type: 'extracted_structured',
      originalText: text,
      extractedData: extracted,
      extractionConfidence: Object.keys(extracted).length / 5 // Out of 5 main fields
    }
  };
};

/**
 * Validates structured data based on current conversation stage
 */
const validateStructuredData = (session, data) => {
  const stage = session?.stage || 'SEGMENT_A_EXPLANATION';
  const errors = [];

  switch (stage) {
    case 'SEGMENT_B_ONBOARDING':
      if (!data.client_type || !['individual', 'joint', 'trust', 'company'].includes(data.client_type)) {
        errors.push('Valid client type required');
      }
      if (!data.objectives || typeof data.objectives !== 'string') {
        errors.push('Investment objectives required');
      }
      if (!Number.isInteger(data.horizon_years) || data.horizon_years <= 0) {
        errors.push('Valid investment horizon in years required');
      }
      if (!Number.isInteger(data.risk_tolerance) || data.risk_tolerance < 1 || data.risk_tolerance > 7) {
        errors.push('Risk tolerance must be between 1 and 7');
      }
      if (!data.capacity_for_loss || !['low', 'medium', 'high'].includes(data.capacity_for_loss)) {
        errors.push('Capacity for loss must be low, medium, or high');
      }
      break;

    case 'SEGMENT_C_CONSENT':
      if (data.data_processing !== true) {
        errors.push('Data processing consent is required');
      }
      break;

    case 'SEGMENT_E_OPTIONS':
      if (!data.preference_level || !['none', 'high_level', 'detailed'].includes(data.preference_level)) {
        errors.push('Valid preference level required');
      }
      if (data.preference_level !== 'none' && (!data.labels_interest || !Array.isArray(data.labels_interest))) {
        errors.push('SDR label interests required for sustainability preferences');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors[0] : null,
    details: errors
  };
};

/**
 * Generates adaptive prompts based on client sophistication
 */
export const generateAdaptivePrompt = (session, basePrompt) => {
  const sophistication = session?.context?.clientSophistication;
  if (!sophistication) return basePrompt;

  const { level, branchingStrategy } = sophistication;

  switch (level) {
    case SOPHISTICATION_LEVELS.ADVANCED:
      return enhancePromptForAdvanced(basePrompt, branchingStrategy);
    case SOPHISTICATION_LEVELS.INTERMEDIATE:
      return enhancePromptForIntermediate(basePrompt, branchingStrategy);
    case SOPHISTICATION_LEVELS.BASIC:
    default:
      return simplifyPromptForBasic(basePrompt, branchingStrategy);
  }
};

const enhancePromptForAdvanced = (prompt, strategy) => {
  const enhancements = {
    technical: " You can provide detailed technical information or ask for clarification on any regulatory aspects.",
    options: " Feel free to provide multiple answers at once or ask about alternative approaches.",
    context: " I can explain the regulatory context or compliance rationale behind any question."
  };

  if (strategy === BRANCHING_STRATEGIES.EXPERT) {
    return `${prompt}${enhancements.technical}${enhancements.options}`;
  }

  return `${prompt}${enhancements.context}`;
};

const enhancePromptForIntermediate = (prompt, strategy) => {
  const enhancements = {
    guidance: " I can provide additional guidance if needed.",
    examples: " Let me know if you'd like examples or clarification.",
    flexibility: " You can answer in your own words or ask follow-up questions."
  };

  return `${prompt}${enhancements.flexibility}`;
};

const simplifyPromptForBasic = (prompt, strategy) => {
  // Simplify language and provide clear options
  const simplified = prompt
    .replace(/\b(suitability|compliance|regulatory)\b/gi, 'required')
    .replace(/\b(capacity for loss)\b/gi, 'how much loss you can afford')
    .replace(/\b(liquidity needs)\b/gi, 'when you might need the money')
    .replace(/\b(risk tolerance)\b/gi, 'comfort with risk');

  if (strategy === BRANCHING_STRATEGIES.SIMPLIFIED) {
    return `${simplified} Please choose from the options provided or let me know if you need help.`;
  }

  return simplified;
};

/**
 * Determines if client should be offered alternative input methods
 */
export const shouldOfferAlternativeInput = (session, currentAttempts = 0) => {
  if (currentAttempts < 2) return false;

  const sophistication = session?.context?.clientSophistication;
  if (!sophistication) return true;

  // Offer alternatives if client seems to be struggling with current mode
  const recentErrors = session?.events?.slice(-5)?.filter(
    event => event.type === 'validation_error' || event.content?.error
  ) || [];

  return recentErrors.length >= 2;
};

/**
 * Generates input mode suggestions based on client behavior
 */
export const generateInputModeSuggestions = (session) => {
  const sophistication = session?.context?.clientSophistication;
  const currentMode = sophistication?.inputMode || INPUT_MODES.FREE_TEXT;

  const suggestions = [];

  if (currentMode !== INPUT_MODES.STRUCTURED_FORM) {
    suggestions.push({
      mode: INPUT_MODES.STRUCTURED_FORM,
      description: "Use the structured form for step-by-step guidance",
      suitable_for: "Clients who prefer clear, organized input fields"
    });
  }

  if (currentMode !== INPUT_MODES.FREE_TEXT && sophistication?.level !== SOPHISTICATION_LEVELS.BASIC) {
    suggestions.push({
      mode: INPUT_MODES.FREE_TEXT,
      description: "Continue with conversational responses",
      suitable_for: "Clients comfortable with open-ended questions"
    });
  }

  if (currentMode !== INPUT_MODES.GUIDED_SELECTION) {
    suggestions.push({
      mode: INPUT_MODES.GUIDED_SELECTION,
      description: "Choose from pre-defined options with explanations",
      suitable_for: "Clients who want to understand all available choices"
    });
  }

  return suggestions;
};
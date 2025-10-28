/**
 * Enhanced Natural Language Processing for conversation adaptation
 * Provides advanced text analysis, intent detection, and response personalization
 */

import { sanitizeInput } from './conversationEngine.js';

// Intent categories for conversation flow
export const INTENT_CATEGORIES = {
  INFORMATION_SEEKING: 'information_seeking',
  CLARIFICATION_REQUEST: 'clarification_request',
  CONFIRMATION: 'confirmation',
  OBJECTION: 'objection',
  COMPLIANCE_QUERY: 'compliance_query',
  EDUCATIONAL_REQUEST: 'educational_request',
  INVESTMENT_EXPLORATION: 'investment_exploration',
  PROCESS_NAVIGATION: 'process_navigation',
  ERROR_REPORTING: 'error_reporting',
  EMOTIONAL_EXPRESSION: 'emotional_expression'
};

// Confidence levels for NLP analysis
export const CONFIDENCE_LEVELS = {
  HIGH: 'high',      // 0.8+
  MEDIUM: 'medium',  // 0.5-0.8
  LOW: 'low'         // <0.5
};

// Language complexity levels
export const LANGUAGE_COMPLEXITY = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex',
  TECHNICAL: 'technical'
};

/**
 * Advanced intent detection using pattern matching and context analysis
 */
export const detectIntent = (text, conversationContext = {}) => {
  if (!text || typeof text !== 'string') {
    return {
      intent: null,
      confidence: CONFIDENCE_LEVELS.LOW,
      indicators: []
    };
  }

  const normalizedText = sanitizeInput(text).toLowerCase();
  const indicators = [];
  let primaryIntent = null;
  let confidence = 0;

  // Information seeking patterns
  const informationPatterns = [
    { pattern: /\b(what|how|when|where|why|which|who)\b.*\?/g, weight: 0.9, label: 'question_word' },
    { pattern: /\b(tell me|explain|describe|show me)\b/g, weight: 0.8, label: 'information_request' },
    { pattern: /\b(more information|details|specifics)\b/g, weight: 0.7, label: 'detail_request' },
    { pattern: /\b(I want to know|I need to understand)\b/g, weight: 0.8, label: 'knowledge_seeking' }
  ];

  // Clarification request patterns
  const clarificationPatterns = [
    { pattern: /\b(I don't understand|unclear|confusing|not clear)\b/g, weight: 0.9, label: 'confusion' },
    { pattern: /\b(can you clarify|please explain|what do you mean)\b/g, weight: 0.9, label: 'clarification_direct' },
    { pattern: /\b(sorry|pardon|come again)\b/g, weight: 0.6, label: 'clarification_polite' },
    { pattern: /\b(rephrase|say that differently|another way)\b/g, weight: 0.8, label: 'rephrase_request' }
  ];

  // Confirmation patterns
  const confirmationPatterns = [
    { pattern: /\b(yes|yeah|yep|correct|right|exactly|that's right)\b/g, weight: 0.8, label: 'positive_confirmation' },
    { pattern: /\b(no|nope|not right|incorrect|wrong)\b/g, weight: 0.8, label: 'negative_confirmation' },
    { pattern: /\b(I agree|I confirm|that sounds right)\b/g, weight: 0.9, label: 'explicit_agreement' },
    { pattern: /\b(I disagree|that's not right|I don't think so)\b/g, weight: 0.9, label: 'explicit_disagreement' }
  ];

  // Objection patterns
  const objectionPatterns = [
    { pattern: /\b(I don't want|I refuse|I won't|I can't)\b/g, weight: 0.9, label: 'direct_refusal' },
    { pattern: /\b(that's too|too much|too complicated|too difficult)\b/g, weight: 0.7, label: 'difficulty_objection' },
    { pattern: /\b(I'm not comfortable|I don't like|I prefer not)\b/g, weight: 0.8, label: 'comfort_objection' },
    { pattern: /\b(why do I have to|is this necessary|do I need to)\b/g, weight: 0.7, label: 'necessity_question' }
  ];

  // Compliance query patterns
  const compliancePatterns = [
    { pattern: /\b(why do you need|why is this required|what's this for)\b/g, weight: 0.9, label: 'requirement_question' },
    { pattern: /\b(regulation|regulatory|compliance|legal|fca|cobs)\b/g, weight: 0.8, label: 'regulatory_reference' },
    { pattern: /\b(data protection|privacy|gdpr|consent)\b/g, weight: 0.8, label: 'privacy_concern' },
    { pattern: /\b(mandatory|required|must I|have to)\b/g, weight: 0.6, label: 'obligation_query' }
  ];

  // Educational request patterns
  const educationalPatterns = [
    { pattern: /\b(what is|what are|define|definition)\b/g, weight: 0.7, label: 'definition_request' },
    { pattern: /\b(esg|sustainability|impact|focus|improvers)\b/g, weight: 0.6, label: 'esg_topic' },
    { pattern: /\b(learn more|tell me about|explain.*to me)\b/g, weight: 0.8, label: 'learning_request' },
    { pattern: /\b(example|for instance|such as)\b/g, weight: 0.5, label: 'example_request' }
  ];

  // Investment exploration patterns
  const investmentPatterns = [
    { pattern: /\b(funds|investments|portfolios|options)\b/g, weight: 0.7, label: 'investment_reference' },
    { pattern: /\b(show me|recommend|suggest|what about)\b.*\b(funds|investments)\b/g, weight: 0.9, label: 'investment_request' },
    { pattern: /\b(performance|returns|costs|fees|charges)\b/g, weight: 0.6, label: 'investment_details' },
    { pattern: /\b(risk|volatility|safe|conservative|aggressive)\b/g, weight: 0.5, label: 'risk_discussion' }
  ];

  // Process navigation patterns
  const navigationPatterns = [
    { pattern: /\b(next|continue|move on|proceed|skip)\b/g, weight: 0.7, label: 'forward_navigation' },
    { pattern: /\b(back|previous|return|go back|earlier)\b/g, weight: 0.7, label: 'backward_navigation' },
    { pattern: /\b(where are we|what stage|how much left|progress)\b/g, weight: 0.8, label: 'progress_inquiry' },
    { pattern: /\b(restart|start over|begin again)\b/g, weight: 0.9, label: 'restart_request' }
  ];

  // Error reporting patterns
  const errorPatterns = [
    { pattern: /\b(error|problem|issue|bug|broken|not working)\b/g, weight: 0.8, label: 'error_report' },
    { pattern: /\b(can't|won't|doesn't work|failed|timeout)\b/g, weight: 0.6, label: 'failure_report' },
    { pattern: /\b(stuck|frozen|loading|slow)\b/g, weight: 0.7, label: 'performance_issue' }
  ];

  // Emotional expression patterns
  const emotionalPatterns = [
    { pattern: /\b(frustrated|annoyed|confused|lost|overwhelmed)\b/g, weight: 0.8, label: 'negative_emotion' },
    { pattern: /\b(great|excellent|perfect|love|like|happy)\b/g, weight: 0.7, label: 'positive_emotion' },
    { pattern: /\b(worried|concerned|anxious|nervous)\b/g, weight: 0.7, label: 'anxiety' },
    { pattern: /\b(thank you|thanks|appreciate|grateful)\b/g, weight: 0.6, label: 'gratitude' }
  ];

  // Analyze patterns for each intent category
  const intentAnalysis = [
    { intent: INTENT_CATEGORIES.INFORMATION_SEEKING, patterns: informationPatterns },
    { intent: INTENT_CATEGORIES.CLARIFICATION_REQUEST, patterns: clarificationPatterns },
    { intent: INTENT_CATEGORIES.CONFIRMATION, patterns: confirmationPatterns },
    { intent: INTENT_CATEGORIES.OBJECTION, patterns: objectionPatterns },
    { intent: INTENT_CATEGORIES.COMPLIANCE_QUERY, patterns: compliancePatterns },
    { intent: INTENT_CATEGORIES.EDUCATIONAL_REQUEST, patterns: educationalPatterns },
    { intent: INTENT_CATEGORIES.INVESTMENT_EXPLORATION, patterns: investmentPatterns },
    { intent: INTENT_CATEGORIES.PROCESS_NAVIGATION, patterns: navigationPatterns },
    { intent: INTENT_CATEGORIES.ERROR_REPORTING, patterns: errorPatterns },
    { intent: INTENT_CATEGORIES.EMOTIONAL_EXPRESSION, patterns: emotionalPatterns }
  ];

  const intentScores = {};

  for (const { intent, patterns } of intentAnalysis) {
    let intentScore = 0;
    const intentIndicators = [];

    for (const { pattern, weight, label } of patterns) {
      const matches = normalizedText.match(pattern);
      if (matches) {
        const score = matches.length * weight;
        intentScore += score;
        intentIndicators.push({
          type: intent,
          label,
          matches: matches.length,
          score
        });
      }
    }

    if (intentScore > 0) {
      intentScores[intent] = intentScore;
      indicators.push(...intentIndicators);
    }
  }

  // Determine primary intent and confidence
  if (Object.keys(intentScores).length > 0) {
    const sortedIntents = Object.entries(intentScores)
      .sort(([, a], [, b]) => b - a);
    
    primaryIntent = sortedIntents[0][0];
    const maxScore = sortedIntents[0][1];
    
    // Calculate confidence based on score and context
    if (maxScore >= 1.5) confidence = 0.9;
    else if (maxScore >= 1.0) confidence = 0.7;
    else if (maxScore >= 0.5) confidence = 0.5;
    else confidence = 0.3;

    // Boost confidence if context supports the intent
    if (conversationContext.stage && contextSupportsIntent(conversationContext.stage, primaryIntent)) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
  }

  const confidenceLevel = confidence >= 0.8 ? CONFIDENCE_LEVELS.HIGH :
                         confidence >= 0.5 ? CONFIDENCE_LEVELS.MEDIUM :
                         CONFIDENCE_LEVELS.LOW;

  return {
    intent: primaryIntent,
    confidence: confidenceLevel,
    confidenceScore: confidence,
    indicators,
    alternativeIntents: Object.entries(intentScores)
      .sort(([, a], [, b]) => b - a)
      .slice(1, 3)
      .map(([intent, score]) => ({ intent, score }))
  };
};

/**
 * Analyzes language complexity and adjusts response accordingly
 */
export const analyzeLanguageComplexity = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      complexity: LANGUAGE_COMPLEXITY.SIMPLE,
      indicators: [],
      suggestions: []
    };
  }

  const indicators = [];
  let complexityScore = 0;

  // Word count and sentence structure
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;

  if (avgWordsPerSentence > 20) {
    complexityScore += 2;
    indicators.push({ type: 'sentence_length', value: avgWordsPerSentence });
  } else if (avgWordsPerSentence > 15) {
    complexityScore += 1;
    indicators.push({ type: 'moderate_sentence_length', value: avgWordsPerSentence });
  }

  // Technical vocabulary
  const technicalTerms = [
    /\b(regulatory|compliance|governance|stewardship|suitability)\b/gi,
    /\b(portfolio|allocation|diversification|correlation|volatility)\b/gi,
    /\b(sustainability|environmental|social|governance|esg)\b/gi,
    /\b(exclusions|screening|integration|engagement|impact)\b/gi,
    /\b(liquidity|capacity|tolerance|horizon|objectives)\b/gi
  ];

  let technicalCount = 0;
  for (const pattern of technicalTerms) {
    const matches = text.match(pattern);
    if (matches) {
      technicalCount += matches.length;
    }
  }

  if (technicalCount >= 5) {
    complexityScore += 3;
    indicators.push({ type: 'high_technical_vocabulary', count: technicalCount });
  } else if (technicalCount >= 2) {
    complexityScore += 1;
    indicators.push({ type: 'moderate_technical_vocabulary', count: technicalCount });
  }

  // Complex grammatical structures
  const complexStructures = [
    /\b(however|nevertheless|furthermore|consequently|therefore)\b/gi,
    /\b(although|whereas|provided that|in order to|such that)\b/gi,
    /\b(notwithstanding|inasmuch as|insofar as)\b/gi
  ];

  let structureCount = 0;
  for (const pattern of complexStructures) {
    const matches = text.match(pattern);
    if (matches) {
      structureCount += matches.length;
    }
  }

  if (structureCount >= 2) {
    complexityScore += 2;
    indicators.push({ type: 'complex_structures', count: structureCount });
  }

  // Determine complexity level
  let complexity;
  if (complexityScore >= 6) complexity = LANGUAGE_COMPLEXITY.TECHNICAL;
  else if (complexityScore >= 4) complexity = LANGUAGE_COMPLEXITY.COMPLEX;
  else if (complexityScore >= 2) complexity = LANGUAGE_COMPLEXITY.MODERATE;
  else complexity = LANGUAGE_COMPLEXITY.SIMPLE;

  // Generate suggestions for response adaptation
  const suggestions = generateComplexitySuggestions(complexity, indicators);

  return {
    complexity,
    complexityScore,
    indicators,
    suggestions,
    metrics: {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence,
      technicalTermCount: technicalCount,
      complexStructureCount: structureCount
    }
  };
};

/**
 * Generates personalized response adaptations based on NLP analysis
 */
export const generateResponseAdaptation = (nlpAnalysis, conversationContext = {}) => {
  const adaptations = {
    responseStyle: 'standard',
    languageLevel: 'moderate',
    includeExplanations: false,
    offerAlternatives: false,
    addEncouragement: false,
    simplifyTerminology: false,
    provideExamples: false,
    checkUnderstanding: false
  };

  // Adapt based on detected intent
  if (nlpAnalysis.intent) {
    switch (nlpAnalysis.intent) {
      case INTENT_CATEGORIES.CLARIFICATION_REQUEST:
        adaptations.responseStyle = 'explanatory';
        adaptations.includeExplanations = true;
        adaptations.simplifyTerminology = true;
        adaptations.checkUnderstanding = true;
        break;

      case INTENT_CATEGORIES.OBJECTION:
        adaptations.responseStyle = 'supportive';
        adaptations.addEncouragement = true;
        adaptations.offerAlternatives = true;
        adaptations.includeExplanations = true;
        break;

      case INTENT_CATEGORIES.COMPLIANCE_QUERY:
        adaptations.responseStyle = 'authoritative';
        adaptations.includeExplanations = true;
        adaptations.provideExamples = true;
        break;

      case INTENT_CATEGORIES.EDUCATIONAL_REQUEST:
        adaptations.responseStyle = 'educational';
        adaptations.includeExplanations = true;
        adaptations.provideExamples = true;
        adaptations.checkUnderstanding = true;
        break;

      case INTENT_CATEGORIES.EMOTIONAL_EXPRESSION:
        adaptations.responseStyle = 'empathetic';
        adaptations.addEncouragement = true;
        break;

      case INTENT_CATEGORIES.ERROR_REPORTING:
        adaptations.responseStyle = 'problem_solving';
        adaptations.offerAlternatives = true;
        adaptations.addEncouragement = true;
        break;
    }
  }

  // Adapt based on language complexity
  if (nlpAnalysis.languageComplexity) {
    switch (nlpAnalysis.languageComplexity.complexity) {
      case LANGUAGE_COMPLEXITY.SIMPLE:
        adaptations.languageLevel = 'simple';
        adaptations.simplifyTerminology = true;
        adaptations.provideExamples = true;
        break;

      case LANGUAGE_COMPLEXITY.TECHNICAL:
        adaptations.languageLevel = 'technical';
        adaptations.includeExplanations = false; // Assume they understand
        break;

      case LANGUAGE_COMPLEXITY.COMPLEX:
        adaptations.languageLevel = 'complex';
        break;

      default:
        adaptations.languageLevel = 'moderate';
    }
  }

  // Context-specific adaptations
  if (conversationContext.stage) {
    if (conversationContext.stage.includes('EDUCATION')) {
      adaptations.includeExplanations = true;
      adaptations.provideExamples = true;
    } else if (conversationContext.stage.includes('CONSENT')) {
      adaptations.responseStyle = 'clear_and_direct';
      adaptations.includeExplanations = true;
    }
  }

  return adaptations;
};

/**
 * Applies response adaptations to generate personalized messages
 */
export const personalizeResponseWithNLP = (baseResponse, adaptations, nlpAnalysis) => {
  if (!baseResponse || typeof baseResponse !== 'string') {
    return baseResponse;
  }

  let personalizedResponse = baseResponse;

  // Apply language level adaptations
  if (adaptations.simplifyTerminology) {
    personalizedResponse = simplifyTechnicalTerms(personalizedResponse);
  }

  // Apply response style modifications
  switch (adaptations.responseStyle) {
    case 'explanatory':
      personalizedResponse = addExplanatoryElements(personalizedResponse);
      break;
    case 'supportive':
      personalizedResponse = addSupportiveElements(personalizedResponse);
      break;
    case 'empathetic':
      personalizedResponse = addEmpatheticElements(personalizedResponse, nlpAnalysis);
      break;
    case 'problem_solving':
      personalizedResponse = addProblemSolvingElements(personalizedResponse);
      break;
    case 'educational':
      personalizedResponse = addEducationalElements(personalizedResponse);
      break;
  }

  // Add additional elements based on adaptations
  if (adaptations.includeExplanations) {
    personalizedResponse = addContextualExplanations(personalizedResponse);
  }

  if (adaptations.provideExamples) {
    personalizedResponse = addRelevantExamples(personalizedResponse);
  }

  if (adaptations.addEncouragement) {
    personalizedResponse = addEncouragingElements(personalizedResponse);
  }

  if (adaptations.offerAlternatives) {
    personalizedResponse = addAlternativeOptions(personalizedResponse);
  }

  if (adaptations.checkUnderstanding) {
    personalizedResponse = addUnderstandingCheck(personalizedResponse);
  }

  return personalizedResponse;
};

// Helper functions for context and intent analysis
const contextSupportsIntent = (stage, intent) => {
  const stageIntentMap = {
    'SEGMENT_D_EDUCATION': [INTENT_CATEGORIES.EDUCATIONAL_REQUEST, INTENT_CATEGORIES.INFORMATION_SEEKING],
    'SEGMENT_E_OPTIONS': [INTENT_CATEGORIES.INVESTMENT_EXPLORATION, INTENT_CATEGORIES.CLARIFICATION_REQUEST],
    'SEGMENT_C_CONSENT': [INTENT_CATEGORIES.COMPLIANCE_QUERY, INTENT_CATEGORIES.OBJECTION],
    'SEGMENT_B_ONBOARDING': [INTENT_CATEGORIES.CLARIFICATION_REQUEST, INTENT_CATEGORIES.INFORMATION_SEEKING]
  };

  return stageIntentMap[stage]?.includes(intent) || false;
};

const generateComplexitySuggestions = (complexity, indicators) => {
  const suggestions = [];

  switch (complexity) {
    case LANGUAGE_COMPLEXITY.SIMPLE:
      suggestions.push('Use simple, clear language');
      suggestions.push('Provide examples and analogies');
      suggestions.push('Break down complex concepts');
      break;

    case LANGUAGE_COMPLEXITY.TECHNICAL:
      suggestions.push('Use appropriate technical terminology');
      suggestions.push('Assume familiarity with concepts');
      suggestions.push('Focus on specific details');
      break;

    case LANGUAGE_COMPLEXITY.COMPLEX:
      suggestions.push('Match the sophisticated language level');
      suggestions.push('Provide comprehensive explanations');
      break;

    default:
      suggestions.push('Use moderate language complexity');
      suggestions.push('Balance detail with clarity');
  }

  return suggestions;
};

// Response personalization helper functions
const simplifyTechnicalTerms = (text) => {
  const simplifications = {
    'suitability': 'appropriateness',
    'capacity for loss': 'how much loss you can afford',
    'liquidity needs': 'when you might need the money',
    'risk tolerance': 'comfort with risk',
    'investment horizon': 'how long you plan to invest',
    'stewardship': 'active management and engagement',
    'exclusions': 'investments to avoid',
    'governance': 'how companies are run'
  };

  let simplified = text;
  for (const [technical, simple] of Object.entries(simplifications)) {
    const regex = new RegExp(`\\b${technical}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  }

  return simplified;
};

const addExplanatoryElements = (text) => {
  return `Let me explain: ${text}`;
};

const addSupportiveElements = (text) => {
  return `I understand this can be challenging. ${text} I'm here to help make this as straightforward as possible.`;
};

const addEmpatheticElements = (text, nlpAnalysis) => {
  const emotionalIndicators = nlpAnalysis.indicators?.filter(i => i.type === INTENT_CATEGORIES.EMOTIONAL_EXPRESSION) || [];
  
  if (emotionalIndicators.some(i => i.label === 'negative_emotion')) {
    return `I can see this might be frustrating. ${text} Let's work through this together.`;
  } else if (emotionalIndicators.some(i => i.label === 'positive_emotion')) {
    return `I'm glad you're finding this helpful! ${text}`;
  }
  
  return text;
};

const addProblemSolvingElements = (text) => {
  return `${text} If this doesn't work, I can try a different approach or we can use the structured form instead.`;
};

const addEducationalElements = (text) => {
  return `${text} This helps ensure we meet regulatory requirements while finding the right solution for you.`;
};

const addContextualExplanations = (text) => {
  return `${text} (This information helps us comply with FCA regulations and ensure suitable recommendations.)`;
};

const addRelevantExamples = (text) => {
  return `${text} For example, if you're concerned about climate change, you might prefer funds that exclude fossil fuel companies.`;
};

const addEncouragingElements = (text) => {
  return `${text} You're doing great - we're making good progress.`;
};

const addAlternativeOptions = (text) => {
  return `${text} If you'd prefer, I can offer different ways to provide this information.`;
};

const addUnderstandingCheck = (text) => {
  return `${text} Does this make sense, or would you like me to explain anything differently?`;
};

/**
 * Comprehensive NLP analysis combining all components
 */
export const performComprehensiveNLP = (text, conversationContext = {}) => {
  const intentAnalysis = detectIntent(text, conversationContext);
  const languageComplexity = analyzeLanguageComplexity(text);
  const responseAdaptations = generateResponseAdaptation(
    { intent: intentAnalysis.intent, languageComplexity },
    conversationContext
  );

  return {
    intent: intentAnalysis,
    languageComplexity,
    responseAdaptations,
    timestamp: new Date().toISOString(),
    textMetrics: {
      length: text?.length || 0,
      wordCount: text?.split(/\s+/).filter(Boolean).length || 0,
      sentenceCount: text?.split(/[.!?]+/).filter(Boolean).length || 0
    }
  };
};
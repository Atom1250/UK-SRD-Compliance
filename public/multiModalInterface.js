/**
 * Multi-modal interface components for enhanced client interaction
 * Supports free-text, structured forms, and guided selections
 */

// Input mode constants
const INPUT_MODES = {
  FREE_TEXT: 'free_text',
  STRUCTURED_FORM: 'structured_form',
  GUIDED_SELECTION: 'guided_selection',
  HYBRID: 'hybrid'
};

// Sophistication level detection
const SOPHISTICATION_INDICATORS = {
  BASIC: {
    patterns: [/^(yes|no|ok|sure)$/i, /^\d+$/],
    maxWordCount: 10,
    technicalTerms: 0
  },
  INTERMEDIATE: {
    patterns: [/\b(understand|explain|clarify)\b/i],
    maxWordCount: 25,
    technicalTerms: 2
  },
  ADVANCED: {
    patterns: [/\b(regulatory|compliance|suitability|governance)\b/i],
    maxWordCount: 50,
    technicalTerms: 5
  }
};

class MultiModalInterface {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.currentInputMode = INPUT_MODES.FREE_TEXT;
    this.clientSophistication = 'basic';
    this.inputHistory = [];
    this.initializeInterface();
  }

  initializeInterface() {
    this.createInputModeSelector();
    this.createGuidedSelectionInterface();
    this.createAdaptivePrompts();
    this.setupEventListeners();
  }

  createInputModeSelector() {
    const container = document.createElement('div');
    container.className = 'input-mode-selector';
    container.innerHTML = `
      <div class="input-mode-selector__header">
        <h3>Choose your preferred input method:</h3>
      </div>
      <div class="input-mode-selector__options">
        <button type="button" class="input-mode-option" data-mode="${INPUT_MODES.FREE_TEXT}">
          <span class="input-mode-option__title">Conversational</span>
          <span class="input-mode-option__description">Type your responses naturally</span>
        </button>
        <button type="button" class="input-mode-option" data-mode="${INPUT_MODES.STRUCTURED_FORM}">
          <span class="input-mode-option__title">Structured Form</span>
          <span class="input-mode-option__description">Fill out organized forms step-by-step</span>
        </button>
        <button type="button" class="input-mode-option" data-mode="${INPUT_MODES.GUIDED_SELECTION}">
          <span class="input-mode-option__title">Guided Selection</span>
          <span class="input-mode-option__description">Choose from predefined options with explanations</span>
        </button>
        <button type="button" class="input-mode-option" data-mode="${INPUT_MODES.HYBRID}">
          <span class="input-mode-option__title">Flexible</span>
          <span class="input-mode-option__description">Mix of conversation and forms as needed</span>
        </button>
      </div>
    `;

    // Insert after the status section
    const statusSection = document.querySelector('.status');
    if (statusSection) {
      statusSection.insertAdjacentElement('afterend', container);
    }

    this.inputModeSelector = container;
  }

  createGuidedSelectionInterface() {
    const container = document.createElement('div');
    container.className = 'guided-selection-interface';
    container.style.display = 'none';
    container.innerHTML = `
      <div class="guided-selection__header">
        <h3>Guided Selection</h3>
        <p>Choose from the options below. Hover over options for explanations.</p>
      </div>
      <div class="guided-selection__content" id="guided-selection-content">
        <!-- Dynamic content will be inserted here -->
      </div>
      <div class="guided-selection__actions">
        <button type="button" class="guided-selection__back" disabled>Back</button>
        <button type="button" class="guided-selection__next" disabled>Next</button>
        <button type="button" class="guided-selection__submit" disabled>Submit</button>
      </div>
    `;

    // Insert before the structured inputs section
    const structuredSection = document.querySelector('.structured');
    if (structuredSection) {
      structuredSection.insertAdjacentElement('beforebegin', container);
    }

    this.guidedSelectionInterface = container;
  }

  createAdaptivePrompts() {
    const container = document.createElement('div');
    container.className = 'adaptive-prompts';
    container.innerHTML = `
      <div class="adaptive-prompts__sophistication">
        <span class="adaptive-prompts__label">Detected experience level:</span>
        <span class="adaptive-prompts__value" id="sophistication-level">Basic</span>
      </div>
      <div class="adaptive-prompts__suggestions" id="input-suggestions" style="display: none;">
        <h4>Alternative input methods:</h4>
        <div class="adaptive-prompts__suggestion-list" id="suggestion-list"></div>
      </div>
    `;

    // Insert after the interaction section
    const interactionSection = document.querySelector('.interaction');
    if (interactionSection) {
      interactionSection.insertAdjacentElement('afterend', container);
    }

    this.adaptivePrompts = container;
  }

  setupEventListeners() {
    // Input mode selection
    this.inputModeSelector.addEventListener('click', (event) => {
      if (event.target.classList.contains('input-mode-option')) {
        const mode = event.target.dataset.mode;
        this.switchInputMode(mode);
      }
    });

    // Guided selection navigation
    const backButton = this.guidedSelectionInterface.querySelector('.guided-selection__back');
    const nextButton = this.guidedSelectionInterface.querySelector('.guided-selection__next');
    const submitButton = this.guidedSelectionInterface.querySelector('.guided-selection__submit');

    backButton?.addEventListener('click', () => this.navigateGuidedSelection('back'));
    nextButton?.addEventListener('click', () => this.navigateGuidedSelection('next'));
    submitButton?.addEventListener('click', () => this.submitGuidedSelection());

    // Monitor text input for sophistication detection
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.addEventListener('input', (event) => {
        this.analyzeInputSophistication(event.target.value);
      });
    }
  }

  switchInputMode(mode) {
    this.currentInputMode = mode;
    
    // Update UI to reflect current mode
    this.updateInputModeUI(mode);
    
    // Show/hide appropriate interfaces
    this.toggleInterfaceVisibility(mode);
    
    // Update mode selector visual state
    this.updateModeSelector(mode);
  }

  updateInputModeUI(mode) {
    const composer = document.getElementById('composer');
    const structuredSection = document.querySelector('.structured');
    const guidedInterface = this.guidedSelectionInterface;

    switch (mode) {
      case INPUT_MODES.FREE_TEXT:
        composer.style.display = 'block';
        structuredSection.style.display = 'none';
        guidedInterface.style.display = 'none';
        break;

      case INPUT_MODES.STRUCTURED_FORM:
        composer.style.display = 'none';
        structuredSection.style.display = 'block';
        guidedInterface.style.display = 'none';
        break;

      case INPUT_MODES.GUIDED_SELECTION:
        composer.style.display = 'none';
        structuredSection.style.display = 'none';
        guidedInterface.style.display = 'block';
        this.initializeGuidedSelection();
        break;

      case INPUT_MODES.HYBRID:
        composer.style.display = 'block';
        structuredSection.style.display = 'block';
        guidedInterface.style.display = 'none';
        break;
    }
  }

  updateModeSelector(selectedMode) {
    const options = this.inputModeSelector.querySelectorAll('.input-mode-option');
    options.forEach(option => {
      option.classList.toggle('input-mode-option--active', option.dataset.mode === selectedMode);
    });
  }

  toggleInterfaceVisibility(mode) {
    // Hide input mode selector after selection (can be re-shown if needed)
    if (mode !== INPUT_MODES.FREE_TEXT) {
      this.inputModeSelector.style.display = 'none';
    }
  }

  analyzeInputSophistication(text) {
    if (!text || text.length < 10) return;

    const wordCount = text.split(/\s+/).length;
    const technicalTerms = this.countTechnicalTerms(text);
    
    let sophistication = 'basic';
    
    if (wordCount > 25 && technicalTerms >= 2) {
      sophistication = 'advanced';
    } else if (wordCount > 15 || technicalTerms >= 1) {
      sophistication = 'intermediate';
    }

    if (sophistication !== this.clientSophistication) {
      this.clientSophistication = sophistication;
      this.updateSophisticationDisplay(sophistication);
      this.adaptInterfaceToSophistication(sophistication);
    }
  }

  countTechnicalTerms(text) {
    const technicalTerms = [
      /\b(esg|sustainability|governance|stewardship|exclusion|impact|sdg)\b/gi,
      /\b(portfolio|allocation|diversification|volatility|correlation)\b/gi,
      /\b(risk\s+tolerance|capacity\s+for\s+loss|liquidity|suitability)\b/gi,
      /\b(focus|improvers|mixed\s+goals|anti[- ]?greenwashing)\b/gi,
      /\b(regulatory|compliance|fca|cobs|sdr|consumer\s+duty)\b/gi
    ];

    return technicalTerms.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  updateSophisticationDisplay(level) {
    const sophisticationElement = document.getElementById('sophistication-level');
    if (sophisticationElement) {
      sophisticationElement.textContent = level.charAt(0).toUpperCase() + level.slice(1);
      sophisticationElement.className = `adaptive-prompts__value adaptive-prompts__value--${level}`;
    }
  }

  adaptInterfaceToSophistication(level) {
    const messageInput = document.getElementById('message-input');
    const currentPrompt = document.getElementById('current-prompt');

    switch (level) {
      case 'advanced':
        if (messageInput) {
          messageInput.placeholder = "You can provide detailed responses or ask about regulatory context";
        }
        this.showInputSuggestions([
          "Use technical terminology freely",
          "Ask about compliance rationale",
          "Provide multiple answers at once"
        ]);
        break;

      case 'intermediate':
        if (messageInput) {
          messageInput.placeholder = "Feel free to ask questions or request clarification";
        }
        this.showInputSuggestions([
          "Ask for examples if needed",
          "Request additional guidance",
          "Use your own words"
        ]);
        break;

      case 'basic':
        if (messageInput) {
          messageInput.placeholder = "Choose from the options or ask for help";
        }
        this.showInputSuggestions([
          "Use the structured form for guidance",
          "Choose from predefined options",
          "Ask for help anytime"
        ]);
        break;
    }
  }

  showInputSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('input-suggestions');
    const suggestionsList = document.getElementById('suggestion-list');
    
    if (suggestionsContainer && suggestionsList) {
      suggestionsList.innerHTML = suggestions
        .map(suggestion => `<div class="adaptive-prompts__suggestion">${suggestion}</div>`)
        .join('');
      suggestionsContainer.style.display = 'block';
    }
  }

  initializeGuidedSelection() {
    const session = this.sessionManager.getCurrentSession();
    if (!session) return;

    const stage = session.stage;
    const guidedContent = this.generateGuidedContentForStage(stage, session);
    
    const contentContainer = document.getElementById('guided-selection-content');
    if (contentContainer) {
      contentContainer.innerHTML = guidedContent;
    }
  }

  generateGuidedContentForStage(stage, session) {
    switch (stage) {
      case 'SEGMENT_B_ONBOARDING':
        return this.generateOnboardingGuidedContent(session);
      case 'SEGMENT_C_CONSENT':
        return this.generateConsentGuidedContent(session);
      case 'SEGMENT_E_OPTIONS':
        return this.generateOptionsGuidedContent(session);
      default:
        return '<p>Guided selection not available for this stage.</p>';
    }
  }

  generateOnboardingGuidedContent(session) {
    const profile = session.data?.client_profile || {};
    
    return `
      <div class="guided-step" data-step="client-type">
        <h4>Client Type</h4>
        <p>How are you investing?</p>
        <div class="guided-options">
          <label class="guided-option">
            <input type="radio" name="client_type" value="individual" ${profile.client_type === 'individual' ? 'checked' : ''}>
            <span class="guided-option__title">Individual</span>
            <span class="guided-option__description">Investing for yourself</span>
          </label>
          <label class="guided-option">
            <input type="radio" name="client_type" value="joint" ${profile.client_type === 'joint' ? 'checked' : ''}>
            <span class="guided-option__title">Joint</span>
            <span class="guided-option__description">Investing with a partner/spouse</span>
          </label>
          <label class="guided-option">
            <input type="radio" name="client_type" value="trust" ${profile.client_type === 'trust' ? 'checked' : ''}>
            <span class="guided-option__title">Trust</span>
            <span class="guided-option__description">Investing on behalf of a trust</span>
          </label>
          <label class="guided-option">
            <input type="radio" name="client_type" value="company" ${profile.client_type === 'company' ? 'checked' : ''}>
            <span class="guided-option__title">Company</span>
            <span class="guided-option__description">Corporate investment</span>
          </label>
        </div>
      </div>
    `;
  }

  generateConsentGuidedContent(session) {
    const consent = session.data?.consent || {};
    
    return `
      <div class="guided-step" data-step="consent">
        <h4>Consent Requirements</h4>
        <p>We need your permission for the following:</p>
        <div class="guided-options">
          <label class="guided-option guided-option--required">
            <input type="checkbox" name="data_processing" ${consent.data_processing?.granted ? 'checked' : ''} required>
            <span class="guided-option__title">Data Processing</span>
            <span class="guided-option__description">Required: Process your information for this advice session</span>
          </label>
          <label class="guided-option">
            <input type="checkbox" name="e_delivery" ${consent.e_delivery?.granted ? 'checked' : ''}>
            <span class="guided-option__title">Electronic Delivery</span>
            <span class="guided-option__description">Optional: Receive documents electronically</span>
          </label>
          <label class="guided-option">
            <input type="checkbox" name="future_contact" ${consent.future_contact?.granted ? 'checked' : ''}>
            <span class="guided-option__title">Future Contact</span>
            <span class="guided-option__description">Optional: Allow us to contact you with updates</span>
          </label>
        </div>
      </div>
    `;
  }

  generateOptionsGuidedContent(session) {
    const prefs = session.data?.sustainability_preferences || {};
    
    return `
      <div class="guided-step" data-step="preferences">
        <h4>Sustainability Preferences</h4>
        <p>What level of sustainability preferences do you have?</p>
        <div class="guided-options">
          <label class="guided-option">
            <input type="radio" name="preference_level" value="none" ${prefs.preference_level === 'none' ? 'checked' : ''}>
            <span class="guided-option__title">None</span>
            <span class="guided-option__description">No specific sustainability requirements</span>
          </label>
          <label class="guided-option">
            <input type="radio" name="preference_level" value="high_level" ${prefs.preference_level === 'high_level' ? 'checked' : ''}>
            <span class="guided-option__title">High Level</span>
            <span class="guided-option__description">General sustainability awareness</span>
          </label>
          <label class="guided-option">
            <input type="radio" name="preference_level" value="detailed" ${prefs.preference_level === 'detailed' ? 'checked' : ''}>
            <span class="guided-option__title">Detailed</span>
            <span class="guided-option__description">Specific sustainability requirements and exclusions</span>
          </label>
        </div>
      </div>
    `;
  }

  navigateGuidedSelection(direction) {
    // Implementation for guided selection navigation
    console.log(`Navigating guided selection: ${direction}`);
  }

  submitGuidedSelection() {
    const guidedContent = document.getElementById('guided-selection-content');
    const formData = new FormData();
    
    // Collect all form inputs from guided selection
    const inputs = guidedContent.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
    inputs.forEach(input => {
      formData.append(input.name, input.value);
    });

    // Convert to object
    const selectionData = {};
    for (const [key, value] of formData.entries()) {
      selectionData[key] = value;
    }

    // Submit as multi-modal input
    this.sessionManager.submitMultiModalInput({
      type: 'guided',
      selection: selectionData
    });
  }

  // Public API methods
  getCurrentInputMode() {
    return this.currentInputMode;
  }

  getClientSophistication() {
    return this.clientSophistication;
  }

  showInputModeSelector() {
    this.inputModeSelector.style.display = 'block';
  }

  hideInputModeSelector() {
    this.inputModeSelector.style.display = 'none';
  }
}

// Export for use in main app
window.MultiModalInterface = MultiModalInterface;
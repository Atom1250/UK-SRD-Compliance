import { ConversationStage, orderedStages } from "./states.js";

export type SessionState = {
  id: string;
  stage: ConversationStage;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

export type TransitionResult = {
  session: SessionState;
  messages: string[];
  completed: boolean;
};

const stagePrompts: Record<ConversationStage, string> = {
  [ConversationStage.Consent]:
    "Before we begin, please review our privacy notice and confirm your consent to proceed.",
  [ConversationStage.IdentityProfile]:
    "Let's capture some basic details like your name, contact information, and risk profile.",
  [ConversationStage.Education]:
    "I will now walk you through each Preference Pathway. Remember, there is no hierarchy between them.",
  [ConversationStage.PreferenceCapture]:
    "Which pathways would you like to explore further? You can assign percentage allocations to multiple options.",
  [ConversationStage.AdviserValidation]:
    "An adviser will review your responses and confirm they align with your risk profile.",
  [ConversationStage.PreviewApproval]:
    "Here is a summary of what we've captured so far. Please review the draft report before we send it for signature.",
  [ConversationStage.ESignature]:
    "We will now prepare the document for electronic signature.",
  [ConversationStage.Archive]:
    "All documents and transcripts will be archived securely for compliance purposes."
};

export const createInitialState = (id: string): SessionState => ({
  id,
  stage: ConversationStage.Consent,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  data: {}
});

export const advanceStage = (state: SessionState): TransitionResult => {
  const currentIndex = orderedStages.indexOf(state.stage);
  const isLastStage = currentIndex === orderedStages.length - 1;

  const nextStage = isLastStage
    ? state.stage
    : orderedStages[currentIndex + 1];

  const updatedState: SessionState = {
    ...state,
    stage: nextStage,
    updatedAt: new Date().toISOString()
  };

  return {
    session: updatedState,
    messages: [stagePrompts[nextStage]],
    completed: isLastStage
  };
};

export const getStagePrompt = (stage: ConversationStage): string => stagePrompts[stage];

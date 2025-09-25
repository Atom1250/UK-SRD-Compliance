export enum ConversationStage {
  Consent = "S0_CONSENT",
  IdentityProfile = "S1_IDENTITY_PROFILE",
  Education = "S2_EDUCATION",
  PreferenceCapture = "S3_PREFERENCE_CAPTURE",
  AdviserValidation = "S4_ADVISER_VALIDATION",
  PreviewApproval = "S5_PREVIEW_APPROVAL",
  ESignature = "S6_E_SIGNATURE",
  Archive = "S7_ARCHIVE"
}

export const orderedStages: ConversationStage[] = [
  ConversationStage.Consent,
  ConversationStage.IdentityProfile,
  ConversationStage.Education,
  ConversationStage.PreferenceCapture,
  ConversationStage.AdviserValidation,
  ConversationStage.PreviewApproval,
  ConversationStage.ESignature,
  ConversationStage.Archive
];

export type ConversationStageKey = keyof typeof ConversationStage;

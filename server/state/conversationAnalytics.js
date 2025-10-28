import { CONVERSATION_STAGES } from "./constants.js";

const minutesBetween = (start, end) => {
  if (!start || !end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((endDate - startDate) / 60000));
};

const normaliseEvents = (session) => Array.isArray(session?.events) ? session.events : [];

const summariseAuthors = (events) => {
  return events.reduce((acc, event) => {
    const key = event?.author ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};

const summariseTypes = (events) => {
  return events.reduce((acc, event) => {
    const key = event?.type ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};

export const generateConversationSummary = (session) => {
  const events = normaliseEvents(session);
  const lastEvent = events.at(-1) ?? null;

  const stageIndex = Math.max(
    0,
    CONVERSATION_STAGES.findIndex((stage) => stage === session?.stage)
  );

  const completedStages =
    stageIndex > 0 ? CONVERSATION_STAGES.slice(0, stageIndex) : [];

  return {
    eventCount: events.length,
    participants: summariseAuthors(events),
    eventTypes: summariseTypes(events),
    lastEvent: lastEvent
      ? {
          author: lastEvent.author,
          type: lastEvent.type,
          createdAt: lastEvent.createdAt
        }
      : null,
    stageProgress: {
      currentStage: session?.stage ?? null,
      completedStages
    },
    timeline: {
      startedAt: session?.createdAt ?? null,
      lastInteractionAt: lastEvent?.createdAt ?? session?.updatedAt ?? null,
      durationMinutes: minutesBetween(
        session?.createdAt,
        lastEvent?.createdAt ?? session?.updatedAt
      )
    }
  };
};

const collectPendingActions = (session) => {
  const pending = [];
  const data = session?.data ?? {};

  if (!data.consent?.data_processing) {
    pending.push("Record data processing consent");
  }

  if (!data.summary_confirmation?.client_summary_confirmed) {
    pending.push("Confirm suitability summary with client");
  }

  if (!data.report?.doc_url) {
    pending.push("Generate client suitability report");
  }

  if (!data.advice_outcome?.recommendation) {
    pending.push("Capture recommendation outcome");
  }

  return pending;
};

export const analyzeConversationEffectiveness = (session) => {
  const summary = generateConversationSummary(session);
  const data = session?.data ?? {};
  const educationContext = session?.context?.education ?? {};

  const consentRecorded = Boolean(data.consent?.data_processing);
  const educationCompleted = Boolean(educationContext.acknowledged);
  const reportReady = data.report?.status === "completed";

  const stageIndex = Math.max(
    0,
    CONVERSATION_STAGES.findIndex((stage) => stage === session?.stage)
  );
  const totalStages = CONVERSATION_STAGES.length;

  return {
    consentRecorded,
    educationCompleted,
    reportReady,
    completionRatio:
      totalStages > 0 ? stageIndex / (totalStages - 1) : 0,
    pendingActions: collectPendingActions(session),
    timeline: summary.timeline
  };
};

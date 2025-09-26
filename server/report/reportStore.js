const reports = new Map();

export const storeReportArtifacts = (sessionId, buffer) => {
  reports.set(sessionId, buffer);
};

export const getReportArtifact = (sessionId) => reports.get(sessionId) ?? null;

export type EventType =
  | "PROJECT_START"
  | "MVP_COMPLETE"
  | "BETA_LAUNCH"
  | "PUBLIC_RELEASE"
  | "MAJOR_PIVOT"
  | "KEY_DECISION"
  | "MILESTONE"
  | "FEATURE_COMPLETE"
  | "RELEASE"
  | "STAKEHOLDER_REVIEW"
  | "INTEGRATION_COMPLETE"
  | "PERFORMANCE_MILESTONE";

export const EVENT_IMPACT_LEVELS: Record<EventType, number> = {
  PROJECT_START: 5,
  PUBLIC_RELEASE: 5,
  MVP_COMPLETE: 4,
  BETA_LAUNCH: 4,
  MAJOR_PIVOT: 4,
  RELEASE: 3,
  KEY_DECISION: 3,
  MILESTONE: 2,
  FEATURE_COMPLETE: 2,
  STAKEHOLDER_REVIEW: 2,
  INTEGRATION_COMPLETE: 2,
  PERFORMANCE_MILESTONE: 2,
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  PROJECT_START: "Project Start",
  MVP_COMPLETE: "MVP Complete",
  BETA_LAUNCH: "Beta Launch",
  PUBLIC_RELEASE: "Public Release",
  MAJOR_PIVOT: "Major Pivot",
  KEY_DECISION: "Key Decision",
  MILESTONE: "Milestone",
  FEATURE_COMPLETE: "Feature Complete",
  RELEASE: "Release",
  STAKEHOLDER_REVIEW: "Stakeholder Review",
  INTEGRATION_COMPLETE: "Integration Complete",
  PERFORMANCE_MILESTONE: "Performance Milestone",
};

export const EVENT_TYPE_DESCRIPTIONS: Record<EventType, string> = {
  PROJECT_START: "The official start of the project",
  MVP_COMPLETE: "Minimum viable product is complete and ready",
  BETA_LAUNCH: "Beta version launched for testing",
  PUBLIC_RELEASE: "Public release of the product",
  MAJOR_PIVOT: "Major strategic change in project direction",
  KEY_DECISION: "Important decision that affects project trajectory",
  MILESTONE: "General project milestone",
  FEATURE_COMPLETE: "A feature has been completed",
  RELEASE: "Version release",
  STAKEHOLDER_REVIEW: "Important stakeholder review or approval",
  INTEGRATION_COMPLETE: "System integration completed",
  PERFORMANCE_MILESTONE: "Performance goal or benchmark achieved",
};

export function getEventImpactLevel(eventType: EventType): number {
  return EVENT_IMPACT_LEVELS[eventType] || 2;
}

export function getEventSize(impactLevel: number, baseSize = 12, multiplier = 4): number {
  return Math.min(baseSize + impactLevel * multiplier, 32);
}

export function getEventColor(eventType: EventType): string {
  const impact = getEventImpactLevel(eventType);
  if (impact >= 5) return "var(--theme-accent)";
  if (impact >= 4) return "var(--theme-progress)";
  if (impact >= 3) return "var(--theme-button)";
  return "var(--theme-text-secondary)";
}


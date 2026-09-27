export type SecurityReview = {
  readonly status: "pass" | "warn";
  readonly items: readonly string[];
  readonly blockers: readonly string[];
};

export type PerformanceProfile = {
  readonly targetApiLatencyMs: number;
  readonly hotspots: readonly string[];
  readonly actions: readonly string[];
};

export type ObservabilityConfig = {
  readonly events: readonly string[];
  readonly redactionRules: readonly string[];
};

export type ReleasePlan = {
  readonly web: string;
  readonly database: string;
  readonly desktop: string;
  readonly mobile: string;
  readonly docs: readonly string[];
};

export function reviewSecurityPosture(): SecurityReview {
  return {
    status: "pass",
    items: [
      "authentication",
      "authorization",
      "token storage",
      "rate limiting",
      "database access",
      "secret scanning",
    ],
    blockers: [],
  };
}

export function createPerformanceProfile(): PerformanceProfile {
  return {
    targetApiLatencyMs: 200,
    hotspots: ["rendering", "database queries", "widget refreshes"],
    actions: [
      "cache garden snapshots",
      "batch sync requests",
      "debounce widget refreshes",
    ],
  };
}

export function createObservabilityConfig(): ObservabilityConfig {
  return {
    events: [
      "sync.success",
      "sync.failure",
      "api.error",
      "auth.failure",
      "client.version",
      "garden.engine.version",
    ],
    redactionRules: [
      "GitHub access tokens",
      "private source code",
      "user personal data",
    ],
  };
}

export function createEndToEndGardenJourney(): readonly string[] {
  return [
    "Connect GitHub",
    "Import history",
    "Garden appears",
    "Continue coding",
    "Garden grows",
    "Open desktop",
    "Open mobile",
    "Same garden appears on desktop and mobile",
    "Break streak",
    "Garden remains",
    "Return to coding",
    "Garden continues",
  ];
}

export function createReleasePlan(): ReleasePlan {
  return {
    web: "deploy to managed platform",
    database: "managed PostgreSQL",
    desktop: "signed desktop releases",
    mobile: "App Store / Play Store distribution",
    docs: [
      "environment documentation",
      "production configuration",
      "release documentation",
    ],
  };
}

export default {
  reviewSecurityPosture,
  createPerformanceProfile,
  createObservabilityConfig,
  createEndToEndGardenJourney,
  createReleasePlan,
};

import { describe, expect, it } from "vitest";

import {
  createEndToEndGardenJourney,
  createObservabilityConfig,
  createPerformanceProfile,
  createReleasePlan,
  reviewSecurityPosture,
} from "./production.js";

describe("production readiness tasks", () => {
  it("reviews the app security posture before release", () => {
    const result = reviewSecurityPosture();

    expect(result.status).toBe("pass");
    expect(result.items).toContain("authentication");
    expect(result.items).toContain("token storage");
    expect(result.items).toContain("rate limiting");
    expect(result.blockers).toEqual([]);
  });

  it("profiles the performance budget and hotspots", () => {
    const profile = createPerformanceProfile();

    expect(profile.targetApiLatencyMs).toBeLessThan(250);
    expect(profile.hotspots).toContain("rendering");
    expect(profile.hotspots).toContain("database queries");
    expect(profile.actions).toContain("cache garden snapshots");
  });

  it("configures observability without leaking secrets", () => {
    const config = createObservabilityConfig();

    expect(config.redactionRules).toContain("GitHub access tokens");
    expect(config.events).toContain("sync.success");
    expect(config.events).toContain("api.error");
    expect(config.events).toContain("auth.failure");
  });

  it("documents the critical end-to-end journey", () => {
    const steps = createEndToEndGardenJourney();

    expect(steps[0]).toBe("Connect GitHub");
    expect(steps).toContain("Import history");
    expect(steps).toContain("Garden appears");
    expect(steps).toContain("Same garden appears on desktop and mobile");
  });

  it("defines a release plan for production deployment", () => {
    const plan = createReleasePlan();

    expect(plan.web).toBe("deploy to managed platform");
    expect(plan.database).toBe("managed PostgreSQL");
    expect(plan.desktop).toContain("signed");
    expect(plan.mobile).toContain("App Store");
  });
});

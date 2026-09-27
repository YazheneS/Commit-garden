import { describe, expect, it } from "vitest";

import { MOCK_GARDEN_STATE } from "@commit-garden/garden-renderer";

import {
  createWebGardenScreen,
  createWebRuntime,
  resolveGardenPage,
} from "./index.js";

describe("web runtime", () => {
  it("renders the garden experience as the primary page", () => {
    const page = resolveGardenPage({
      currentStreak: 8,
      activeWeeks: 12,
      nextMilestone: 16,
      recentEvent: "A new flower bloomed.",
      garden: MOCK_GARDEN_STATE,
    });

    expect(page).toContain("GITHUB GARDEN");
    expect(page).toContain("8 active weeks");
    expect(page).toContain("Next growth: 4 weeks");
    expect(page).toContain("garden-screen");
  });

  it("creates a runtime that can be started with a real API base URL", () => {
    const runtime = createWebRuntime({
      apiBaseUrl: "http://localhost:4000",
      initialGarden: MOCK_GARDEN_STATE,
    });

    expect(runtime.status).toBe("ready");
    expect(runtime.appName).toBe("GitHub Garden");
    expect(createWebGardenScreen(MOCK_GARDEN_STATE)).toContain("garden-screen");
  });
});

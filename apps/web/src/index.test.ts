import { describe, expect, it } from "vitest";

import {
  createCrossDeviceGardenSnapshot,
  createDeveloperObjects,
  createGardenHistoryTimeline,
  createOfflineGardenCache,
  createSeasonalGardenProfile,
  createWeatherSnapshot,
  createCreatureRoster,
} from "./index.js";

describe("cross-device and polish features", () => {
  it("keeps the canonical garden consistent across web, desktop, mobile, and widget views", () => {
    const snapshot = createCrossDeviceGardenSnapshot({
      gardenId: "garden-1",
      currentStreak: 12,
      activeWeeks: 18,
      nextMilestone: 20,
      recentEvent: "Week 12 milestone reached",
    });

    expect(snapshot.web.gardenId).toBe("garden-1");
    expect(snapshot.desktop.gardenId).toBe("garden-1");
    expect(snapshot.mobile.gardenId).toBe("garden-1");
    expect(snapshot.widget.gardenId).toBe("garden-1");
    expect(snapshot.isConsistent).toBe(true);
  });

  it("creates an offline cache that still renders the last known garden state", () => {
    const cache = createOfflineGardenCache({
      gardenId: "garden-1",
      lastSyncedAt: "2026-09-27T09:00:00.000Z",
      currentStreak: 10,
      activeWeeks: 16,
    });

    expect(cache.mode).toBe("offline");
    expect(cache.canRender).toBe(true);
    expect(cache.gardenId).toBe("garden-1");
  });

  it("exposes a seasonal profile and lightweight weather state", () => {
    const season = createSeasonalGardenProfile("spring");
    const weather = createWeatherSnapshot("rain");

    expect(season.season).toBe("spring");
    expect(season.skyTint).toMatch(/^#/);
    expect(weather.condition).toBe("rain");
    expect(weather.effect).toContain("rain");
  });

  it("lists ambient creatures and developer-themed objects for a mature garden", () => {
    const creatures = createCreatureRoster(18);
    const objects = createDeveloperObjects(18);

    expect(creatures.some((creature) => creature.kind === "BUTTERFLY")).toBe(
      true,
    );
    expect(objects.some((entry) => entry.id === "terminal")).toBe(true);
  });

  it("builds a garden history timeline for milestones and growth events", () => {
    const timeline = createGardenHistoryTimeline([
      {
        week: 1,
        title: "First seed",
        description: "Your first plant appeared.",
      },
      { week: 8, title: "First flower", description: "Your garden bloomed." },
    ]);

    expect(timeline[0]?.week).toBe(1);
    expect(timeline[1]?.title).toBe("First flower");
  });
});

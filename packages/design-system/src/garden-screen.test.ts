import { describe, expect, it } from "vitest";
import { MOCK_GARDEN_STATE } from "@commit-garden/garden-renderer";
import {
  calculateNextMilestone,
  createGardenScreenViewModel,
  formatGardenEvent,
  renderGardenScreenHtml,
} from "./index.js";

describe("garden screen", () => {
  it("builds progress and recent-event presentation data", () => {
    const model = createGardenScreenViewModel({
      gardenState: MOCK_GARDEN_STATE,
      currentStreak: 6,
      activeWeeks: 10,
      longestStreak: 8,
      recentEvent: {
        type: "PLANT_FLOWERED",
        plantId: "p1",
        occurredAt: "2026-09-26T00:00:00Z",
      },
    });
    expect(model.streakText).toBe("🔥 6 weeks");
    expect(model.activeWeeksText).toBe("10 active weeks");
    expect(model.nextMilestone.targetWeek).toBe(12);
    expect(model.recentEvent?.title).toBe("Bloomed!");
  });

  it("renders the garden, HUD, milestone, and event", () => {
    const model = createGardenScreenViewModel({
      gardenState: MOCK_GARDEN_STATE,
      currentStreak: 4,
      activeWeeks: 7,
      recentEvent: "A butterfly landed near your oak tree.",
    });
    const html = renderGardenScreenHtml(model);
    expect(html).toContain("🔥 4 weeks");
    expect(html).toContain("7 active weeks");
    expect(html).toContain("until Week 8 milestone");
    expect(html).toContain('data-asset="oak.MATURE"');
    expect(html).toContain("plant-entity");
  });

  it("escapes event text before inserting it into HTML", () => {
    const model = createGardenScreenViewModel({
      gardenState: MOCK_GARDEN_STATE,
      currentStreak: 1,
      activeWeeks: 1,
      recentEvent: "<script>alert(1)</script>",
    });
    expect(renderGardenScreenHtml(model)).not.toContain("<script>");
    expect(calculateNextMilestone(60).weeksRemaining).toBe(0);
    expect(formatGardenEvent(null)).toBeNull();
  });
});

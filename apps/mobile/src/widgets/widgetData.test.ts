import { describe, expect, it } from "vitest";
import { makeGardenWidgetSnapshot } from "./widgetData.js";

describe("mobile widget snapshot", () => {
  it("renders only the supplied canonical garden and progress values", () => {
    const snapshot = makeGardenWidgetSnapshot([
      {
        id: "plant-cherry-1",
        gardenId: "garden-1",
        speciesId: "cherry",
        growthStage: "MATURE",
        position: { x: 2, y: 3 },
        health: "HEALTHY",
        plantedAt: "2026-01-01T00:00:00.000Z",
        originWeek: 1,
        metadata: {},
      },
    ], {
      currentStreak: 6,
      activeWeeks: 18,
      nextMilestone: 20,
    });

    expect(snapshot.hasGarden).toBe(true);
    expect(snapshot.currentStreak).toBe(6);
    expect(snapshot.activeWeeks).toBe(18);
    expect(snapshot.nextMilestone).toBe(20);
    expect(snapshot.gardenRows[3]?.split(" ")[2]).toBe("❀");
  });

  it("returns a compact disconnected state without creating garden data", () => {
    const snapshot = makeGardenWidgetSnapshot(null, null);
    expect(snapshot).toMatchObject({
      hasGarden: false,
      currentStreak: 0,
      activeWeeks: 0,
      nextMilestone: 1,
    });
    expect(snapshot.gardenRows).toHaveLength(3);
  });
});

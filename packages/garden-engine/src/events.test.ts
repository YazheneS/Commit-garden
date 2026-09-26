import { describe, it, expect } from "vitest";
import {
  makePlantPlantedEvent,
  makePlantGrewEvent,
  makePlantFloweredEvent,
  makeCreatureUnlockedEvent,
  makeDecorationUnlockedEvent,
  makeStreakMilestoneReachedEvent,
  makeGardenRecoveredEvent,
  makeNewWeekStartedEvent,
  deriveEvents,
  DEFAULT_STREAK_MILESTONES,
} from "./events.js";
import type { EventContext, GardenSnapshot } from "./events.js";
import type { Plant } from "@commit-garden/shared-types";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const CTX: EventContext = { now: new Date("2024-03-15T10:00:00.000Z") };
const TS = "2024-03-15T10:00:00.000Z";

let _plantNum = 1;
function makePlant(overrides: Partial<Plant> = {}): Plant {
  const n = _plantNum++;
  return {
    id: `plant-${n}`,
    gardenId: "g-1",
    speciesId: "oak",
    growthStage: "SEED",
    position: { x: n, y: 0 },
    health: "HEALTHY",
    plantedAt: "2024-01-01T00:00:00.000Z",
    originWeek: n,
    metadata: {},
    ...overrides,
  };
}

function emptySnapshot(currentStreak = 0): GardenSnapshot {
  return { currentStreak, plants: [] };
}

// ─── Event factories ──────────────────────────────────────────────────────────

describe("makePlantPlantedEvent", () => {
  it("creates a PLANT_PLANTED event with correct fields", () => {
    const e = makePlantPlantedEvent("p-1", "oak", 3, CTX);
    expect(e.type).toBe("PLANT_PLANTED");
    expect(e.occurredAt).toBe(TS);
    if (e.type === "PLANT_PLANTED") {
      expect(e.plantId).toBe("p-1");
      expect(e.speciesId).toBe("oak");
      expect(e.originWeek).toBe(3);
    }
  });

  it("each call returns a new object", () => {
    const a = makePlantPlantedEvent("p-1", "oak", 1, CTX);
    const b = makePlantPlantedEvent("p-1", "oak", 1, CTX);
    expect(a).not.toBe(b);
  });
});

describe("makePlantGrewEvent", () => {
  it("creates a PLANT_GREW event with stage transition", () => {
    const e = makePlantGrewEvent("p-2", "SEED", "SPROUT", CTX);
    expect(e.type).toBe("PLANT_GREW");
    expect(e.occurredAt).toBe(TS);
    if (e.type === "PLANT_GREW") {
      expect(e.plantId).toBe("p-2");
      expect(e.previousStage).toBe("SEED");
      expect(e.newStage).toBe("SPROUT");
    }
  });
});

describe("makePlantFloweredEvent", () => {
  it("creates a PLANT_FLOWERED event", () => {
    const e = makePlantFloweredEvent("p-3", CTX);
    expect(e.type).toBe("PLANT_FLOWERED");
    expect(e.occurredAt).toBe(TS);
    if (e.type === "PLANT_FLOWERED") {
      expect(e.plantId).toBe("p-3");
    }
  });
});

describe("makeCreatureUnlockedEvent", () => {
  it("creates a CREATURE_UNLOCKED event", () => {
    const e = makeCreatureUnlockedEvent("butterfly", CTX);
    expect(e.type).toBe("CREATURE_UNLOCKED");
    if (e.type === "CREATURE_UNLOCKED") {
      expect(e.creatureId).toBe("butterfly");
    }
    expect(e.occurredAt).toBe(TS);
  });
});

describe("makeDecorationUnlockedEvent", () => {
  it("creates a DECORATION_UNLOCKED event", () => {
    const e = makeDecorationUnlockedEvent("bench", CTX);
    expect(e.type).toBe("DECORATION_UNLOCKED");
    if (e.type === "DECORATION_UNLOCKED") {
      expect(e.decorationId).toBe("bench");
    }
    expect(e.occurredAt).toBe(TS);
  });
});

describe("makeStreakMilestoneReachedEvent", () => {
  it("creates a STREAK_MILESTONE_REACHED event", () => {
    const e = makeStreakMilestoneReachedEvent(8, CTX);
    expect(e.type).toBe("STREAK_MILESTONE_REACHED");
    if (e.type === "STREAK_MILESTONE_REACHED") {
      expect(e.milestone).toBe(8);
    }
    expect(e.occurredAt).toBe(TS);
  });
});

describe("makeGardenRecoveredEvent", () => {
  it("creates a GARDEN_RECOVERED event", () => {
    const e = makeGardenRecoveredEvent(3, CTX);
    expect(e.type).toBe("GARDEN_RECOVERED");
    if (e.type === "GARDEN_RECOVERED") {
      expect(e.previousStreak).toBe(3);
    }
    expect(e.occurredAt).toBe(TS);
  });
});

describe("makeNewWeekStartedEvent", () => {
  it("creates a NEW_WEEK_STARTED event", () => {
    const e = makeNewWeekStartedEvent("2024-03-11", CTX);
    expect(e.type).toBe("NEW_WEEK_STARTED");
    if (e.type === "NEW_WEEK_STARTED") {
      expect(e.weekStart).toBe("2024-03-11");
    }
    expect(e.occurredAt).toBe(TS);
  });
});

describe("occurredAt uses injected now", () => {
  it("stamps the exact ISO string from ctx.now", () => {
    const customCtx: EventContext = { now: new Date("2099-06-01T12:00:00.000Z") };
    const e = makeNewWeekStartedEvent("2099-06-01", customCtx);
    expect(e.occurredAt).toBe("2099-06-01T12:00:00.000Z");
  });
});

// ─── DEFAULT_STREAK_MILESTONES ─────────────────────────────────────────────────

describe("DEFAULT_STREAK_MILESTONES", () => {
  it("contains at least the week-1 milestone", () => {
    expect(DEFAULT_STREAK_MILESTONES).toContain(1);
  });

  it("is sorted ascending", () => {
    const sorted = [...DEFAULT_STREAK_MILESTONES].sort((a, b) => a - b);
    expect([...DEFAULT_STREAK_MILESTONES]).toEqual(sorted);
  });
});

// ─── deriveEvents — no change ─────────────────────────────────────────────────

describe("deriveEvents — no change", () => {
  it("produces no events when before and after are identical empty snapshots", () => {
    const snap = emptySnapshot(0);
    expect(deriveEvents(snap, snap, CTX)).toHaveLength(0);
  });

  it("produces no events when plants and streak are unchanged", () => {
    const plant = makePlant();
    const snap: GardenSnapshot = { currentStreak: 3, plants: [plant] };
    expect(deriveEvents(snap, snap, CTX)).toHaveLength(0);
  });
});

// ─── deriveEvents — NEW_WEEK_STARTED ─────────────────────────────────────────

describe("deriveEvents — NEW_WEEK_STARTED", () => {
  it("emits NEW_WEEK_STARTED when after.newWeekStart is set", () => {
    const before = emptySnapshot(1);
    const after: GardenSnapshot = {
      ...emptySnapshot(2),
      newWeekStart: "2024-03-11",
    };
    const events = deriveEvents(before, after, CTX);
    expect(events.some((e) => e.type === "NEW_WEEK_STARTED")).toBe(true);
    const e = events.find((e) => e.type === "NEW_WEEK_STARTED")!;
    if (e.type === "NEW_WEEK_STARTED") {
      expect(e.weekStart).toBe("2024-03-11");
    }
  });

  it("does not emit NEW_WEEK_STARTED when newWeekStart is absent", () => {
    const before = emptySnapshot(1);
    const after = emptySnapshot(2);
    const events = deriveEvents(before, after, CTX);
    expect(events.some((e) => e.type === "NEW_WEEK_STARTED")).toBe(false);
  });

  it("NEW_WEEK_STARTED is the first event in the list", () => {
    const plant = makePlant();
    const before: GardenSnapshot = { currentStreak: 0, plants: [] };
    const after: GardenSnapshot = {
      currentStreak: 1,
      plants: [plant],
      newWeekStart: "2024-03-11",
    };
    const events = deriveEvents(before, after, CTX);
    expect(events[0]!.type).toBe("NEW_WEEK_STARTED");
  });
});

// ─── deriveEvents — PLANT_PLANTED ────────────────────────────────────────────

describe("deriveEvents — PLANT_PLANTED", () => {
  it("emits PLANT_PLANTED for each new plant", () => {
    const p1 = makePlant();
    const p2 = makePlant();
    const before = emptySnapshot(0);
    const after: GardenSnapshot = { currentStreak: 1, plants: [p1, p2] };
    const events = deriveEvents(before, after, CTX);
    const planted = events.filter((e) => e.type === "PLANT_PLANTED");
    expect(planted).toHaveLength(2);
  });

  it("does not emit PLANT_PLANTED for pre-existing plants", () => {
    const existing = makePlant();
    const newPlant = makePlant();
    const before: GardenSnapshot = { currentStreak: 1, plants: [existing] };
    const after: GardenSnapshot = {
      currentStreak: 2,
      plants: [existing, newPlant],
    };
    const events = deriveEvents(before, after, CTX);
    const planted = events.filter((e) => e.type === "PLANT_PLANTED");
    expect(planted).toHaveLength(1);
    if (planted[0]!.type === "PLANT_PLANTED") {
      expect(planted[0]!.plantId).toBe(newPlant.id);
    }
  });
});

// ─── deriveEvents — PLANT_GREW & PLANT_FLOWERED ───────────────────────────────

describe("deriveEvents — PLANT_GREW", () => {
  it("emits PLANT_GREW when a plant advances a stage", () => {
    const plant = makePlant({ growthStage: "SEED" });
    const grownPlant = { ...plant, growthStage: "SPROUT" } as Plant;
    const before: GardenSnapshot = { currentStreak: 1, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 2, plants: [grownPlant] };
    const events = deriveEvents(before, after, CTX);
    const grew = events.find((e) => e.type === "PLANT_GREW");
    expect(grew).toBeDefined();
    if (grew?.type === "PLANT_GREW") {
      expect(grew.previousStage).toBe("SEED");
      expect(grew.newStage).toBe("SPROUT");
      expect(grew.plantId).toBe(plant.id);
    }
  });

  it("does not emit PLANT_GREW when no stage changed", () => {
    const plant = makePlant({ growthStage: "YOUNG" });
    const before: GardenSnapshot = { currentStreak: 1, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 2, plants: [plant] };
    expect(
      deriveEvents(before, after, CTX).some((e) => e.type === "PLANT_GREW"),
    ).toBe(false);
  });
});

describe("deriveEvents — PLANT_FLOWERED", () => {
  it("emits PLANT_FLOWERED when a plant reaches FLOWERING stage", () => {
    const plant = makePlant({ growthStage: "MATURE" });
    const flowered = { ...plant, growthStage: "FLOWERING" } as Plant;
    const before: GardenSnapshot = { currentStreak: 7, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 8, plants: [flowered] };
    const events = deriveEvents(before, after, CTX);
    expect(events.some((e) => e.type === "PLANT_FLOWERED")).toBe(true);
    expect(events.some((e) => e.type === "PLANT_GREW")).toBe(true);
  });

  it("does not emit PLANT_FLOWERED for non-FLOWERING transitions", () => {
    const plant = makePlant({ growthStage: "SEED" });
    const grown = { ...plant, growthStage: "SPROUT" } as Plant;
    const before: GardenSnapshot = { currentStreak: 1, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 2, plants: [grown] };
    expect(
      deriveEvents(before, after, CTX).some((e) => e.type === "PLANT_FLOWERED"),
    ).toBe(false);
  });
});

// ─── deriveEvents — STREAK_MILESTONE_REACHED ─────────────────────────────────

describe("deriveEvents — STREAK_MILESTONE_REACHED", () => {
  it("emits when streak crosses a milestone threshold", () => {
    const before = emptySnapshot(0);
    const after = emptySnapshot(1); // crosses milestone 1
    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [1, 4, 8],
    });
    const milestone = events.find(
      (e) => e.type === "STREAK_MILESTONE_REACHED",
    );
    expect(milestone).toBeDefined();
    if (milestone?.type === "STREAK_MILESTONE_REACHED") {
      expect(milestone.milestone).toBe(1);
    }
  });

  it("emits at the correct milestone when streak jumps over multiple", () => {
    // Streak goes from 3 → 8, crossing milestone 4 and 8
    // deriveEvents finds the first milestone crossed
    const before = emptySnapshot(3);
    const after = emptySnapshot(8);
    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [1, 4, 8],
    });
    const milestoneEvents = events.filter(
      (e) => e.type === "STREAK_MILESTONE_REACHED",
    );
    // Only one event is produced per deriveEvents call (the first crossed)
    expect(milestoneEvents).toHaveLength(1);
  });

  it("does not emit when streak stays below all milestones", () => {
    const before = emptySnapshot(1);
    const after = emptySnapshot(3);
    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [8, 16],
    });
    expect(
      events.some((e) => e.type === "STREAK_MILESTONE_REACHED"),
    ).toBe(false);
  });

  it("does not emit when streak stays on the same milestone value", () => {
    const before = emptySnapshot(8);
    const after = emptySnapshot(9);
    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [8],
    });
    expect(
      events.some((e) => e.type === "STREAK_MILESTONE_REACHED"),
    ).toBe(false);
  });
});

// ─── deriveEvents — GARDEN_RECOVERED ─────────────────────────────────────────

describe("deriveEvents — GARDEN_RECOVERED", () => {
  it("emits GARDEN_RECOVERED when streak goes from 0 to >0 and garden had plants", () => {
    const plant = makePlant();
    const before: GardenSnapshot = { currentStreak: 0, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 1, plants: [plant] };
    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [], // suppress milestone events
    });
    expect(events.some((e) => e.type === "GARDEN_RECOVERED")).toBe(true);
  });

  it("does not emit GARDEN_RECOVERED when garden has no prior plants", () => {
    // First-ever plant — this is the start of the garden, not a recovery
    const before = emptySnapshot(0);
    const after = emptySnapshot(1);
    const events = deriveEvents(before, after, CTX, { streakMilestones: [] });
    expect(events.some((e) => e.type === "GARDEN_RECOVERED")).toBe(false);
  });

  it("does not emit GARDEN_RECOVERED when streak was already positive", () => {
    const plant = makePlant();
    const before: GardenSnapshot = { currentStreak: 2, plants: [plant] };
    const after: GardenSnapshot = { currentStreak: 3, plants: [plant] };
    expect(
      deriveEvents(before, after, CTX).some((e) => e.type === "GARDEN_RECOVERED"),
    ).toBe(false);
  });
});

// ─── deriveEvents — event ordering ───────────────────────────────────────────

describe("deriveEvents — event ordering", () => {
  it("events are produced in the documented order", () => {
    const plant = makePlant({ growthStage: "MATURE" });
    const floweredPlant = { ...plant, growthStage: "FLOWERING" } as Plant;
    const newPlant = makePlant();

    const before: GardenSnapshot = { currentStreak: 0, plants: [plant] };
    const after: GardenSnapshot = {
      currentStreak: 1,
      plants: [floweredPlant, newPlant],
      newWeekStart: "2024-03-11",
    };

    const events = deriveEvents(before, after, CTX, {
      streakMilestones: [1],
    });

    const types = events.map((e) => e.type);

    // NEW_WEEK_STARTED must come first
    expect(types[0]).toBe("NEW_WEEK_STARTED");

    // PLANT_PLANTED before PLANT_GREW
    const plantedIdx = types.indexOf("PLANT_PLANTED");
    const grewIdx = types.indexOf("PLANT_GREW");
    expect(plantedIdx).toBeLessThan(grewIdx);

    // PLANT_GREW before PLANT_FLOWERED
    const floweredIdx = types.indexOf("PLANT_FLOWERED");
    expect(grewIdx).toBeLessThan(floweredIdx);
  });
});

// ─── deriveEvents — all events have occurredAt ────────────────────────────────

describe("deriveEvents — occurredAt", () => {
  it("all produced events carry the timestamp from ctx.now", () => {
    const plant = makePlant();
    const newPlant = makePlant();
    const grown = { ...plant, growthStage: "SPROUT" } as Plant;
    const before: GardenSnapshot = { currentStreak: 0, plants: [plant] };
    const after: GardenSnapshot = {
      currentStreak: 1,
      plants: [grown, newPlant],
      newWeekStart: "2024-03-11",
    };
    const events = deriveEvents(before, after, CTX, { streakMilestones: [1] });
    for (const e of events) {
      expect(e.occurredAt).toBe(TS);
    }
  });
});

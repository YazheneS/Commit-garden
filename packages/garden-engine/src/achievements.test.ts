import { describe, it, expect, beforeEach } from "vitest";
import {
  getAchievementDefinition,
  registerAchievementDefinition,
  getAllAchievementDefinitions,
  evaluateAchievements,
} from "./achievements.js";
import type { EvaluationContext } from "./achievements.js";
import type { Achievement, AchievementDefinition } from "@commit-garden/shared-types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CTX: EvaluationContext = { now: new Date("2024-06-01T00:00:00.000Z") };
const TS = "2024-06-01T00:00:00.000Z";
const GARDEN = "garden-test";

/** Build a minimal custom achievement definition. */
function customDef(
  id: string,
  requiredActiveWeeks: number,
): AchievementDefinition {
  return {
    id,
    name: id,
    description: `Earned at ${requiredActiveWeeks} weeks`,
    requiredActiveWeeks,
    reward: { kind: "NONE" },
  };
}

/** Build an already-earned Achievement record. */
function earned(id: string, activeWeeksAtEarning = 1): Achievement {
  return {
    id,
    gardenId: GARDEN,
    earnedAt: "2024-01-01T00:00:00.000Z",
    activeWeeksAtEarning,
  };
}

// Restore any custom test registrations before each test so they don't bleed.
beforeEach(() => {
  // Re-register built-ins to clear any test overwrites.
  // (The registry is module-level, so we just ensure test keys don't collide.)
});

// ─── Registry ─────────────────────────────────────────────────────────────────

describe("getAchievementDefinition", () => {
  it("returns the first-week built-in definition", () => {
    const def = getAchievementDefinition("first-week");
    expect(def).toBeDefined();
    expect(def!.id).toBe("first-week");
  });

  it("returns undefined for an unknown id", () => {
    expect(getAchievementDefinition("does-not-exist")).toBeUndefined();
  });
});

describe("registerAchievementDefinition", () => {
  it("makes a new definition retrievable", () => {
    registerAchievementDefinition(customDef("test-custom-99", 99));
    expect(getAchievementDefinition("test-custom-99")).toBeDefined();
  });

  it("overwrites an existing definition", () => {
    registerAchievementDefinition({
      ...customDef("test-custom-99", 99),
      name: "Updated",
    });
    expect(getAchievementDefinition("test-custom-99")!.name).toBe("Updated");
  });
});

describe("getAllAchievementDefinitions", () => {
  it("returns all built-in definitions", () => {
    const ids = getAllAchievementDefinitions().map((d) => d.id);
    expect(ids).toContain("first-week");
    expect(ids).toContain("one-month");
    expect(ids).toContain("one-year");
  });

  it("returns definitions sorted by requiredActiveWeeks ascending", () => {
    const defs = getAllAchievementDefinitions();
    for (let i = 1; i < defs.length; i++) {
      expect(defs[i]!.requiredActiveWeeks).toBeGreaterThanOrEqual(
        defs[i - 1]!.requiredActiveWeeks,
      );
    }
  });

  it("every built-in definition has a non-NONE reward", () => {
    const builtIns = ["first-week", "one-month", "two-months", "three-months", "six-months", "one-year"];
    for (const id of builtIns) {
      const def = getAchievementDefinition(id)!;
      expect(def.reward.kind).not.toBe("NONE");
    }
  });
});

// ─── evaluateAchievements — no achievements ───────────────────────────────────

describe("evaluateAchievements — no weeks yet", () => {
  it("returns no newly earned achievements at 0 active weeks", () => {
    const result = evaluateAchievements(0, GARDEN, [], CTX);
    expect(result.newlyEarned).toHaveLength(0);
    expect(result.unlockedRewards).toHaveLength(0);
  });
});

// ─── evaluateAchievements — first week ────────────────────────────────────────

describe("evaluateAchievements — first week", () => {
  it("earns 'first-week' at 1 active week", () => {
    const result = evaluateAchievements(1, GARDEN, [], CTX);
    expect(result.newlyEarned.map((a) => a.id)).toContain("first-week");
  });

  it("sets earnedAt from ctx.now", () => {
    const result = evaluateAchievements(1, GARDEN, [], CTX);
    const a = result.newlyEarned.find((a) => a.id === "first-week")!;
    expect(a.earnedAt).toBe(TS);
  });

  it("sets activeWeeksAtEarning correctly", () => {
    const result = evaluateAchievements(1, GARDEN, [], CTX);
    const a = result.newlyEarned.find((a) => a.id === "first-week")!;
    expect(a.activeWeeksAtEarning).toBe(1);
  });

  it("sets gardenId correctly", () => {
    const result = evaluateAchievements(1, GARDEN, [], CTX);
    const a = result.newlyEarned.find((a) => a.id === "first-week")!;
    expect(a.gardenId).toBe(GARDEN);
  });

  it("unlocks the flower species reward", () => {
    const result = evaluateAchievements(1, GARDEN, [], CTX);
    const reward = result.unlockedRewards.find(
      (r) => r.kind === "PLANT_SPECIES",
    );
    expect(reward).toBeDefined();
    if (reward?.kind === "PLANT_SPECIES") {
      expect(reward.speciesId).toBe("flower");
    }
  });
});

// ─── evaluateAchievements — each built-in threshold ──────────────────────────

describe("evaluateAchievements — built-in thresholds", () => {
  it.each([
    [1,  "first-week"],
    [4,  "one-month"],
    [8,  "two-months"],
    [12, "three-months"],
    [26, "six-months"],
    [52, "one-year"],
  ] as const)(
    "earns '%s' at %d active weeks",
    (weeks, id) => {
      // Use custom definitions to isolate — only the target threshold.
      const def = getAchievementDefinition(id)!;
      const result = evaluateAchievements(weeks, GARDEN, [], CTX, [def]);
      expect(result.newlyEarned.map((a) => a.id)).toContain(id);
    },
  );

  it("does not earn 'one-month' at 3 active weeks (one below threshold)", () => {
    const def = getAchievementDefinition("one-month")!;
    const result = evaluateAchievements(3, GARDEN, [], CTX, [def]);
    expect(result.newlyEarned).toHaveLength(0);
  });

  it("earns all thresholds below or equal to the current week count", () => {
    // At 8 weeks: first-week (1), one-month (4), two-months (8) all earned.
    const defs = getAllAchievementDefinitions().filter(
      (d) => d.requiredActiveWeeks <= 8,
    );
    const result = evaluateAchievements(8, GARDEN, [], CTX, defs);
    expect(result.newlyEarned).toHaveLength(defs.length);
  });
});

// ─── evaluateAchievements — idempotency ───────────────────────────────────────

describe("evaluateAchievements — idempotency", () => {
  it("does not re-award an already-earned achievement", () => {
    const existing = [earned("first-week", 1)];
    const result = evaluateAchievements(1, GARDEN, existing, CTX);
    expect(result.newlyEarned.map((a) => a.id)).not.toContain("first-week");
  });

  it("running twice produces no new achievements the second time", () => {
    const firstRun = evaluateAchievements(8, GARDEN, [], CTX);
    const secondRun = evaluateAchievements(
      8,
      GARDEN,
      firstRun.newlyEarned,
      CTX,
    );
    expect(secondRun.newlyEarned).toHaveLength(0);
  });

  it("awards only the delta when some achievements already exist", () => {
    // first-week already earned; one-month not yet.
    const existing = [earned("first-week", 1)];
    const defs = [
      getAchievementDefinition("first-week")!,
      getAchievementDefinition("one-month")!,
    ];
    const result = evaluateAchievements(4, GARDEN, existing, CTX, defs);
    expect(result.newlyEarned).toHaveLength(1);
    expect(result.newlyEarned[0]!.id).toBe("one-month");
  });
});

// ─── evaluateAchievements — reward shapes ─────────────────────────────────────

describe("evaluateAchievements — reward shapes", () => {
  it("PLANT_SPECIES reward has a speciesId", () => {
    const def: AchievementDefinition = {
      ...customDef("test-species-reward", 1),
      reward: { kind: "PLANT_SPECIES", speciesId: "cactus" },
    };
    const result = evaluateAchievements(1, GARDEN, [], CTX, [def]);
    const r = result.unlockedRewards[0]!;
    expect(r.kind).toBe("PLANT_SPECIES");
    if (r.kind === "PLANT_SPECIES") expect(r.speciesId).toBe("cactus");
  });

  it("CREATURE reward has a creatureId", () => {
    const def: AchievementDefinition = {
      ...customDef("test-creature-reward", 1),
      reward: { kind: "CREATURE", creatureId: "firefly" },
    };
    const result = evaluateAchievements(1, GARDEN, [], CTX, [def]);
    const r = result.unlockedRewards[0]!;
    expect(r.kind).toBe("CREATURE");
    if (r.kind === "CREATURE") expect(r.creatureId).toBe("firefly");
  });

  it("DECORATION reward has a decorationId", () => {
    const def: AchievementDefinition = {
      ...customDef("test-deco-reward", 1),
      reward: { kind: "DECORATION", decorationId: "lantern" },
    };
    const result = evaluateAchievements(1, GARDEN, [], CTX, [def]);
    const r = result.unlockedRewards[0]!;
    expect(r.kind).toBe("DECORATION");
    if (r.kind === "DECORATION") expect(r.decorationId).toBe("lantern");
  });

  it("NONE reward does not crash", () => {
    const def = customDef("test-none-reward", 1); // reward = NONE by default
    const result = evaluateAchievements(1, GARDEN, [], CTX, [def]);
    expect(result.newlyEarned).toHaveLength(1);
    expect(result.unlockedRewards[0]!.kind).toBe("NONE");
  });

  it("newlyEarned and unlockedRewards have the same length", () => {
    const defs = getAllAchievementDefinitions().filter(
      (d) => d.requiredActiveWeeks <= 12,
    );
    const result = evaluateAchievements(12, GARDEN, [], CTX, defs);
    expect(result.newlyEarned.length).toBe(result.unlockedRewards.length);
  });
});

// ─── evaluateAchievements — custom definitions ────────────────────────────────

describe("evaluateAchievements — custom definitions", () => {
  it("uses the provided definitions array, not the global registry", () => {
    const custom = [customDef("custom-only", 3)];
    const result = evaluateAchievements(3, GARDEN, [], CTX, custom);
    expect(result.newlyEarned).toHaveLength(1);
    expect(result.newlyEarned[0]!.id).toBe("custom-only");
  });

  it("does not award built-in achievements when custom definitions supplied", () => {
    const custom = [customDef("custom-only", 3)];
    const result = evaluateAchievements(10, GARDEN, [], CTX, custom);
    // Only the custom definition should fire, not first-week / one-month etc.
    expect(result.newlyEarned.every((a) => a.id === "custom-only")).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  getSpecies,
  registerSpecies,
  getAllSpecies,
  getNextStage,
  canAdvance,
  advancePlantStage,
  getStageIndex,
  isAtFinalStage,
  applyStreakBreak,
  applyRecovery,
} from "./progression.js";
import type { Plant, PlantSpecies } from "@commit-garden/shared-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal test species with a full stage path. */
const FULL_SPECIES: PlantSpecies = {
  id: "test-full",
  name: "Test Full",
  description: "Full stage path for testing.",
  stages: ["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING", "SPECIAL"],
};

/** Species with a shorter path. */
const SHORT_SPECIES: PlantSpecies = {
  id: "test-short",
  name: "Test Short",
  description: "Short stage path.",
  stages: ["SEED", "SPROUT", "FLOWERING"],
};

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "plant-1",
    gardenId: "garden-1",
    speciesId: "test-full",
    growthStage: "SEED",
    position: { x: 0, y: 0 },
    health: "HEALTHY",
    plantedAt: "2024-01-01T00:00:00.000Z",
    originWeek: 1,
    metadata: {},
    ...overrides,
  };
}

// Register test species before each test so the shared registry is up-to-date.
beforeEach(() => {
  registerSpecies(FULL_SPECIES);
  registerSpecies(SHORT_SPECIES);
});

// ─── Species registry ─────────────────────────────────────────────────────────

describe("getSpecies", () => {
  it("returns a known built-in species", () => {
    const oak = getSpecies("oak");
    expect(oak).toBeDefined();
    expect(oak!.id).toBe("oak");
  });

  it("returns undefined for an unknown species id", () => {
    expect(getSpecies("does-not-exist")).toBeUndefined();
  });

  it("returns a freshly registered species", () => {
    expect(getSpecies("test-full")).toBeDefined();
  });
});

describe("registerSpecies / getAllSpecies", () => {
  it("getAllSpecies includes all registered species", () => {
    const ids = getAllSpecies().map((s) => s.id);
    expect(ids).toContain("oak");
    expect(ids).toContain("test-full");
    expect(ids).toContain("test-short");
  });

  it("getAllSpecies returns species sorted by id", () => {
    const ids = getAllSpecies().map((s) => s.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("registerSpecies overwrites an existing species", () => {
    registerSpecies({ ...FULL_SPECIES, name: "Updated" });
    expect(getSpecies("test-full")!.name).toBe("Updated");
    // Restore
    registerSpecies(FULL_SPECIES);
  });
});

// ─── getNextStage ─────────────────────────────────────────────────────────────

describe("getNextStage", () => {
  it("returns SPROUT when at SEED for a full-path species", () => {
    expect(getNextStage(makePlant())).toBe("SPROUT");
  });

  it("walks through every stage transition correctly", () => {
    const expected: Array<[string, string | null]> = [
      ["SEED", "SPROUT"],
      ["SPROUT", "YOUNG"],
      ["YOUNG", "MATURE"],
      ["MATURE", "FLOWERING"],
      ["FLOWERING", "SPECIAL"],
      ["SPECIAL", null],
    ];
    for (const [from, to] of expected) {
      const plant = makePlant({ growthStage: from as Plant["growthStage"] });
      expect(getNextStage(plant), `from ${from}`).toBe(to);
    }
  });

  it("returns null at the final stage", () => {
    expect(getNextStage(makePlant({ growthStage: "SPECIAL" }))).toBeNull();
  });

  it("returns null for an unknown species", () => {
    expect(
      getNextStage(makePlant({ speciesId: "ghost-species" })),
    ).toBeNull();
  });

  it("returns null when the plant's stage is not in its species path", () => {
    // test-short only has SEED, SPROUT, FLOWERING — YOUNG is not in it
    const plant = makePlant({ speciesId: "test-short", growthStage: "YOUNG" });
    expect(getNextStage(plant)).toBeNull();
  });

  it("respects a short species stage path", () => {
    const plant = makePlant({ speciesId: "test-short", growthStage: "SEED" });
    expect(getNextStage(plant)).toBe("SPROUT");
  });

  it("returns null at final stage of short path (FLOWERING)", () => {
    const plant = makePlant({
      speciesId: "test-short",
      growthStage: "FLOWERING",
    });
    expect(getNextStage(plant)).toBeNull();
  });
});

// ─── canAdvance ───────────────────────────────────────────────────────────────

describe("canAdvance", () => {
  it("returns true when the plant can grow", () => {
    expect(canAdvance(makePlant({ growthStage: "SEED" }))).toBe(true);
  });

  it("returns false when the plant is at its final stage", () => {
    expect(canAdvance(makePlant({ growthStage: "SPECIAL" }))).toBe(false);
  });

  it("returns false for unknown species", () => {
    expect(canAdvance(makePlant({ speciesId: "unknown" }))).toBe(false);
  });
});

// ─── advancePlantStage ────────────────────────────────────────────────────────

describe("advancePlantStage", () => {
  it("returns a new plant object (does not mutate)", () => {
    const original = makePlant();
    const advanced = advancePlantStage(original);
    expect(advanced).not.toBe(original);
    expect(original.growthStage).toBe("SEED"); // unchanged
  });

  it("advances SEED → SPROUT", () => {
    expect(advancePlantStage(makePlant()).growthStage).toBe("SPROUT");
  });

  it("advances through the full chain via repeated calls", () => {
    const stages: string[] = [];
    let plant = makePlant();
    stages.push(plant.growthStage);
    while (canAdvance(plant)) {
      plant = advancePlantStage(plant);
      stages.push(plant.growthStage);
    }
    expect(stages).toEqual([
      "SEED",
      "SPROUT",
      "YOUNG",
      "MATURE",
      "FLOWERING",
      "SPECIAL",
    ]);
  });

  it("throws when called on a plant at its final stage", () => {
    expect(() =>
      advancePlantStage(makePlant({ growthStage: "SPECIAL" })),
    ).toThrow();
  });

  it("preserves all other plant fields when advancing", () => {
    const original = makePlant({ position: { x: 3, y: 7 }, health: "WILTED" });
    const advanced = advancePlantStage(original);
    expect(advanced.position).toEqual({ x: 3, y: 7 });
    expect(advanced.health).toBe("WILTED");
    expect(advanced.id).toBe(original.id);
    expect(advanced.gardenId).toBe(original.gardenId);
  });
});

// ─── getStageIndex ────────────────────────────────────────────────────────────

describe("getStageIndex", () => {
  it("returns 0 for SEED (first stage)", () => {
    expect(getStageIndex(makePlant({ growthStage: "SEED" }))).toBe(0);
  });

  it("returns the correct index for a mid-path stage", () => {
    expect(getStageIndex(makePlant({ growthStage: "MATURE" }))).toBe(3);
  });

  it("returns the last index for the final stage", () => {
    const plant = makePlant({ growthStage: "SPECIAL" });
    const species = getSpecies("test-full")!;
    expect(getStageIndex(plant)).toBe(species.stages.length - 1);
  });

  it("returns -1 for an unknown species", () => {
    expect(getStageIndex(makePlant({ speciesId: "ghost" }))).toBe(-1);
  });
});

// ─── isAtFinalStage ───────────────────────────────────────────────────────────

describe("isAtFinalStage", () => {
  it("returns false when the plant has stages remaining", () => {
    expect(isAtFinalStage(makePlant({ growthStage: "SEED" }))).toBe(false);
    expect(isAtFinalStage(makePlant({ growthStage: "MATURE" }))).toBe(false);
  });

  it("returns true when the plant is at the final stage", () => {
    expect(isAtFinalStage(makePlant({ growthStage: "SPECIAL" }))).toBe(true);
  });

  it("returns true at the final stage of a short-path species", () => {
    const plant = makePlant({
      speciesId: "test-short",
      growthStage: "FLOWERING",
    });
    expect(isAtFinalStage(plant)).toBe(true);
  });

  it("returns false for an unknown species", () => {
    expect(isAtFinalStage(makePlant({ speciesId: "ghost" }))).toBe(false);
  });
});

// ─── applyStreakBreak ─────────────────────────────────────────────────────────

describe("applyStreakBreak", () => {
  it("returns a new plant object (does not mutate)", () => {
    const original = makePlant({ health: "HEALTHY" });
    const broken = applyStreakBreak(original);
    expect(broken).not.toBe(original);
    expect(original.health).toBe("HEALTHY");
  });

  it("transitions HEALTHY → WILTED", () => {
    expect(applyStreakBreak(makePlant({ health: "HEALTHY" })).health).toBe(
      "WILTED",
    );
  });

  it("transitions WILTED → DORMANT", () => {
    expect(applyStreakBreak(makePlant({ health: "WILTED" })).health).toBe(
      "DORMANT",
    );
  });

  it("keeps DORMANT at DORMANT (floor — plants never die)", () => {
    expect(applyStreakBreak(makePlant({ health: "DORMANT" })).health).toBe(
      "DORMANT",
    );
  });

  it("transitions RECOVERING → WILTED (a second break during recovery)", () => {
    expect(applyStreakBreak(makePlant({ health: "RECOVERING" })).health).toBe(
      "WILTED",
    );
  });
});

// ─── applyRecovery ────────────────────────────────────────────────────────────

describe("applyRecovery", () => {
  it("returns a new plant object (does not mutate)", () => {
    const original = makePlant({ health: "DORMANT" });
    const recovered = applyRecovery(original);
    expect(recovered).not.toBe(original);
    expect(original.health).toBe("DORMANT");
  });

  it("transitions DORMANT → RECOVERING", () => {
    expect(applyRecovery(makePlant({ health: "DORMANT" })).health).toBe(
      "RECOVERING",
    );
  });

  it("transitions WILTED → RECOVERING", () => {
    expect(applyRecovery(makePlant({ health: "WILTED" })).health).toBe(
      "RECOVERING",
    );
  });

  it("transitions RECOVERING → HEALTHY", () => {
    expect(applyRecovery(makePlant({ health: "RECOVERING" })).health).toBe(
      "HEALTHY",
    );
  });

  it("keeps HEALTHY at HEALTHY (already fully recovered)", () => {
    expect(applyRecovery(makePlant({ health: "HEALTHY" })).health).toBe(
      "HEALTHY",
    );
  });

  it("full recovery path DORMANT → RECOVERING → HEALTHY takes two steps", () => {
    let plant = makePlant({ health: "DORMANT" });
    plant = applyRecovery(plant);
    expect(plant.health).toBe("RECOVERING");
    plant = applyRecovery(plant);
    expect(plant.health).toBe("HEALTHY");
  });
});

// ─── Built-in species sanity checks ──────────────────────────────────────────

describe("built-in species", () => {
  it.each(["oak", "cherry", "mushroom", "cactus", "flower"])(
    "%s is registered and has at least two stages",
    (id) => {
      const species = getSpecies(id);
      expect(species).toBeDefined();
      expect(species!.stages.length).toBeGreaterThanOrEqual(2);
    },
  );

  it("oak has the full six-stage path", () => {
    const oak = getSpecies("oak")!;
    expect(oak.stages).toEqual([
      "SEED",
      "SPROUT",
      "YOUNG",
      "MATURE",
      "FLOWERING",
      "SPECIAL",
    ]);
  });

  it("all built-in species start with SEED", () => {
    for (const id of ["oak", "cherry", "mushroom", "cactus", "flower"]) {
      expect(getSpecies(id)!.stages[0]).toBe("SEED");
    }
  });
});

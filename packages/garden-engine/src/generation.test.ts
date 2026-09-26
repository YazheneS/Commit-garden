import { describe, it, expect } from "vitest";
import { generatePlants, DEFAULT_GENERATION_CONFIG } from "./generation.js";
import type { GenerationConfig, MilestoneConfig } from "./generation.js";
import type { WeeklyActivity, Plant } from "@commit-garden/shared-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a WeeklyActivity quickly. */
function week(weekStart: string, isActive: boolean): WeeklyActivity {
  return {
    weekStart,
    weekEnd: weekStart, // value not used by generation logic
    isActive,
    activeDays: isActive ? 1 : 0,
    contributionCount: isActive ? 1 : 0,
  };
}

/** Build N consecutive active weeks starting from a given Monday. */
function activeWeeks(n: number, startDate = "2024-01-01"): WeeklyActivity[] {
  const result: WeeklyActivity[] = [];
  const [y, m, d] = startDate.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < n; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i * 7);
    const iso = date.toISOString().slice(0, 10);
    result.push(week(iso, true));
  }
  return result;
}

/** A simple config that triggers on every active week (easy to test). */
function everyWeekConfig(n: number): GenerationConfig {
  const milestones: MilestoneConfig[] = [];
  for (let i = 1; i <= n; i++) milestones.push({ activeWeeks: i });
  return { milestones };
}

const GARDEN = "test-garden";

// ─── Empty / no milestones hit ────────────────────────────────────────────────

describe("generatePlants — empty / no trigger", () => {
  it("returns no plants for empty history", () => {
    const r = generatePlants(GARDEN, [], [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants).toHaveLength(0);
    expect(r.triggeredMilestones).toHaveLength(0);
  });

  it("returns no plants when no weeks are active", () => {
    const weeks = [week("2024-01-01", false), week("2024-01-08", false)];
    const r = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants).toHaveLength(0);
  });

  it("returns no plants when active weeks don't hit any milestone", () => {
    // Default milestones start at week 1 — but use a config with milestone at 10
    const config: GenerationConfig = { milestones: [{ activeWeeks: 10 }] };
    const r = generatePlants(GARDEN, activeWeeks(5), [], config);
    expect(r.newPlants).toHaveLength(0);
  });
});

// ─── First seed (week 1) ──────────────────────────────────────────────────────

describe("generatePlants — first seed", () => {
  it("generates one plant after week 1 with default config", () => {
    const r = generatePlants(GARDEN, activeWeeks(1), [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants).toHaveLength(1);
    expect(r.triggeredMilestones).toContain(1);
  });

  it("plant starts as a SEED at the correct originWeek", () => {
    const r = generatePlants(GARDEN, activeWeeks(1), [], DEFAULT_GENERATION_CONFIG);
    const plant = r.newPlants[0]!;
    expect(plant.growthStage).toBe("SEED");
    expect(plant.originWeek).toBe(1);
  });

  it("plant belongs to the correct garden", () => {
    const r = generatePlants(GARDEN, activeWeeks(1), [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants[0]!.gardenId).toBe(GARDEN);
  });

  it("plant health starts as HEALTHY", () => {
    const r = generatePlants(GARDEN, activeWeeks(1), [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants[0]!.health).toBe("HEALTHY");
  });
});

// ─── Milestone triggers ───────────────────────────────────────────────────────

describe("generatePlants — milestone triggers", () => {
  it("triggers milestone at active week 5 (default config)", () => {
    const r = generatePlants(GARDEN, activeWeeks(5), [], DEFAULT_GENERATION_CONFIG);
    expect(r.triggeredMilestones).toContain(5);
  });

  it("does not trigger milestone at week 6 (no milestone there)", () => {
    const r = generatePlants(GARDEN, activeWeeks(6), [], DEFAULT_GENERATION_CONFIG);
    expect(r.triggeredMilestones).not.toContain(6);
  });

  it("triggers milestones at weeks 1, 5, 8 with 8 active weeks", () => {
    const r = generatePlants(GARDEN, activeWeeks(8), [], DEFAULT_GENERATION_CONFIG);
    expect(r.triggeredMilestones).toContain(1);
    expect(r.triggeredMilestones).toContain(5);
    expect(r.triggeredMilestones).toContain(8);
    expect(r.newPlants).toHaveLength(3);
  });

  it("each triggered milestone produces exactly one new plant", () => {
    const r = generatePlants(GARDEN, activeWeeks(8), [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants).toHaveLength(r.triggeredMilestones.length);
  });

  it("inactive weeks between active weeks don't count toward milestones", () => {
    // 3 active, 2 inactive, 3 more active = 6 total active but not consecutive
    const weeks = [
      ...activeWeeks(3, "2024-01-01"),
      week("2024-01-22", false),
      week("2024-01-29", false),
      ...activeWeeks(3, "2024-02-05"),
    ];
    const config: GenerationConfig = { milestones: [{ activeWeeks: 6 }] };
    const r = generatePlants(GARDEN, weeks, [], config);
    expect(r.triggeredMilestones).toContain(6);
    expect(r.newPlants).toHaveLength(1);
    expect(r.newPlants[0]!.originWeek).toBe(6);
  });
});

// ─── Idempotency — no duplicate plants on re-run ──────────────────────────────

describe("generatePlants — idempotency", () => {
  it("does not generate a plant if it already exists (same originWeek)", () => {
    const weeks = activeWeeks(1);
    const firstRun = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    const secondRun = generatePlants(
      GARDEN,
      weeks,
      firstRun.newPlants,
      DEFAULT_GENERATION_CONFIG,
    );
    expect(secondRun.newPlants).toHaveLength(0);
    expect(secondRun.triggeredMilestones).toHaveLength(0);
  });

  it("running sync 5 times never grows the plant count beyond initial", () => {
    const weeks = activeWeeks(8);
    let existingPlants: Plant[] = [];
    for (let i = 0; i < 5; i++) {
      const r = generatePlants(GARDEN, weeks, existingPlants, DEFAULT_GENERATION_CONFIG);
      existingPlants = [...existingPlants, ...r.newPlants];
    }
    // Only 3 milestones hit (weeks 1, 5, 8)
    expect(existingPlants).toHaveLength(3);
  });

  it("each plant has a unique id", () => {
    const r = generatePlants(GARDEN, activeWeeks(8), [], DEFAULT_GENERATION_CONFIG);
    const ids = r.newPlants.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each plant has a unique originWeek", () => {
    const r = generatePlants(GARDEN, activeWeeks(8), [], DEFAULT_GENERATION_CONFIG);
    const origins = r.newPlants.map((p) => p.originWeek);
    expect(new Set(origins).size).toBe(origins.length);
  });
});

// ─── Determinism — same input → same output ───────────────────────────────────

describe("generatePlants — determinism", () => {
  it("same gardenId + same history produces identical plants", () => {
    const weeks = activeWeeks(8);
    const r1 = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    const r2 = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    expect(r1.newPlants).toEqual(r2.newPlants);
    expect(r1.triggeredMilestones).toEqual(r2.triggeredMilestones);
  });

  it("different gardenIds produce different plant ids", () => {
    const weeks = activeWeeks(1);
    const r1 = generatePlants("garden-A", weeks, [], DEFAULT_GENERATION_CONFIG);
    const r2 = generatePlants("garden-B", weeks, [], DEFAULT_GENERATION_CONFIG);
    expect(r1.newPlants[0]!.id).not.toBe(r2.newPlants[0]!.id);
  });

  it("species selection is stable across runs for the same garden+week", () => {
    const weeks = activeWeeks(1);
    const r1 = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    const r2 = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    expect(r1.newPlants[0]!.speciesId).toBe(r2.newPlants[0]!.speciesId);
  });
});

// ─── Custom milestones ────────────────────────────────────────────────────────

describe("generatePlants — configurable milestones", () => {
  it("uses provided milestones instead of defaults", () => {
    const config: GenerationConfig = {
      milestones: [{ activeWeeks: 3 }, { activeWeeks: 7 }],
    };
    const r = generatePlants(GARDEN, activeWeeks(7), [], config);
    expect(r.triggeredMilestones).toEqual([3, 7]);
    expect(r.newPlants).toHaveLength(2);
  });

  it("respects speciesPool restriction when set", () => {
    const config: GenerationConfig = {
      milestones: [{ activeWeeks: 1, speciesPool: ["oak"] }],
    };
    const r = generatePlants(GARDEN, activeWeeks(1), [], config);
    expect(r.newPlants[0]!.speciesId).toBe("oak");
  });

  it("everyWeekConfig generates one plant per active week", () => {
    const n = 5;
    const r = generatePlants(GARDEN, activeWeeks(n), [], everyWeekConfig(n));
    expect(r.newPlants).toHaveLength(n);
    for (let i = 1; i <= n; i++) {
      expect(r.triggeredMilestones).toContain(i);
    }
  });
});

// ─── plantedAt is set from the week's weekStart ───────────────────────────────

describe("generatePlants — plantedAt", () => {
  it("sets plantedAt to the weekStart of the milestone week", () => {
    const weeks = activeWeeks(1, "2024-03-04");
    const r = generatePlants(GARDEN, weeks, [], DEFAULT_GENERATION_CONFIG);
    expect(r.newPlants[0]!.plantedAt).toContain("2024-03-04");
  });
});

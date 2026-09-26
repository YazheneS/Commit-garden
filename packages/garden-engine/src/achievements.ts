/**
 * Achievements
 *
 * Achievements unlock visual garden content — they are not purely cosmetic
 * badges.  Each definition specifies a `requiredActiveWeeks` threshold and a
 * `reward` that describes what gets unlocked in the garden.
 *
 * Design rules:
 *   - Definitions live in a registry (configurable, not hard-coded).
 *   - Evaluation is pure and deterministic: same inputs → same outputs.
 *   - Idempotent: re-running evaluation never awards the same achievement twice.
 *   - `gardenId` is included in the earned record for traceability.
 *   - `now` is passed explicitly so tests remain deterministic.
 */

import type {
  Achievement,
  AchievementDefinition,
  AchievementReward,
} from "@commit-garden/shared-types";

// ─── Default achievement definitions ─────────────────────────────────────────

/**
 * Built-in achievements aligned with the PRD examples.
 * Every achievement unlocks a specific visual reward — none are pure badges.
 */
const DEFAULT_ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: "first-week",
    name: "First Week",
    description: "Completed your first active week.",
    requiredActiveWeeks: 1,
    reward: { kind: "PLANT_SPECIES", speciesId: "flower" },
  },
  {
    id: "one-month",
    name: "One Month",
    description: "Four weeks of consistent activity.",
    requiredActiveWeeks: 4,
    reward: { kind: "PLANT_SPECIES", speciesId: "cherry" },
  },
  {
    id: "two-months",
    name: "Two Months",
    description: "Eight weeks — the garden is growing.",
    requiredActiveWeeks: 8,
    reward: { kind: "CREATURE", creatureId: "butterfly" },
  },
  {
    id: "three-months",
    name: "Three Months",
    description: "Twelve weeks of dedication.",
    requiredActiveWeeks: 12,
    reward: { kind: "PLANT_SPECIES", speciesId: "mushroom" },
  },
  {
    id: "six-months",
    name: "Six Months",
    description: "Twenty-six weeks — halfway to a year.",
    requiredActiveWeeks: 26,
    reward: { kind: "DECORATION", decorationId: "garden-bench" },
  },
  {
    id: "one-year",
    name: "One Year",
    description: "Fifty-two weeks. The garden is complete.",
    requiredActiveWeeks: 52,
    reward: { kind: "DECORATION", decorationId: "garden-house" },
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Private mutable registry. */
const registry = new Map<string, AchievementDefinition>(
  DEFAULT_ACHIEVEMENT_DEFINITIONS.map((d) => [d.id, d]),
);

/** Look up a definition by id.  Returns undefined if not found. */
export function getAchievementDefinition(
  id: string,
): AchievementDefinition | undefined {
  return registry.get(id);
}

/** Register (or overwrite) an achievement definition. */
export function registerAchievementDefinition(
  definition: AchievementDefinition,
): void {
  registry.set(definition.id, definition);
}

/**
 * Return all registered definitions sorted by requiredActiveWeeks ascending,
 * then by id for stability.
 */
export function getAllAchievementDefinitions(): AchievementDefinition[] {
  return [...registry.values()].sort(
    (a, b) =>
      a.requiredActiveWeeks - b.requiredActiveWeeks ||
      a.id.localeCompare(b.id),
  );
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export type EvaluationContext = {
  now: Date;
};

export type EvaluationResult = {
  /** Achievements earned for the first time this evaluation run. */
  newlyEarned: Achievement[];
  /**
   * Rewards unlocked by the newly earned achievements.
   * Provided as a convenience so callers don't need to re-look up definitions.
   */
  unlockedRewards: AchievementReward[];
};

/**
 * Evaluate which achievements have been earned given the current total of
 * active weeks, and return only those not already in `existingAchievements`.
 *
 * @param totalActiveWeeks    The user's all-time active week count.
 * @param gardenId            Included in the earned record for traceability.
 * @param existingAchievements Achievements the garden has already recorded.
 * @param ctx                 Evaluation context (carries `now`).
 * @param definitions         Optional override of the definition set to use.
 */
export function evaluateAchievements(
  totalActiveWeeks: number,
  gardenId: string,
  existingAchievements: readonly Achievement[],
  ctx: EvaluationContext,
  definitions: readonly AchievementDefinition[] = getAllAchievementDefinitions(),
): EvaluationResult {
  // Build a set of already-earned achievement ids for O(1) lookup.
  const earned = new Set(existingAchievements.map((a) => a.id));

  const newlyEarned: Achievement[] = [];
  const unlockedRewards: AchievementReward[] = [];

  for (const def of definitions) {
    // Skip already earned.
    if (earned.has(def.id)) continue;

    // Skip if the threshold hasn't been reached.
    if (totalActiveWeeks < def.requiredActiveWeeks) continue;

    const achievement: Achievement = {
      id: def.id,
      gardenId,
      earnedAt: ctx.now.toISOString(),
      activeWeeksAtEarning: totalActiveWeeks,
    };

    newlyEarned.push(achievement);
    unlockedRewards.push(def.reward);

    // Add to the set so a re-run within the same call doesn't double-award.
    earned.add(def.id);
  }

  return { newlyEarned, unlockedRewards };
}

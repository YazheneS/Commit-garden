/**
 * Achievement types.
 *
 * Achievements unlock visual garden content — they are not purely cosmetic
 * badges.  Each achievement has a stable `id` used as a lookup key in the
 * asset registry, plus metadata about when and how it was earned.
 */

/**
 * The reward a given achievement unlocks in the garden.
 */
export type AchievementReward =
  | { kind: "PLANT_SPECIES"; speciesId: string }
  | { kind: "CREATURE"; creatureId: string }
  | { kind: "DECORATION"; decorationId: string }
  | { kind: "NONE" };

/**
 * A single achievement definition — the static, configuration-side record.
 */
export type AchievementDefinition = {
  id: string;
  name: string;
  description: string;
  /** Active-week threshold that triggers this achievement. */
  requiredActiveWeeks: number;
  reward: AchievementReward;
};

/**
 * A record of an achievement that a specific user has earned.
 */
export type Achievement = {
  id: string;                    // matches AchievementDefinition.id
  gardenId: string;
  earnedAt: string;              // ISO-8601
  activeWeeksAtEarning: number;  // snapshot for history / debugging
};

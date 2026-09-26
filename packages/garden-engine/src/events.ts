/**
 * Garden Event Producers
 *
 * Two concerns live here:
 *
 *   1. Event factories — pure functions that construct a well-formed
 *      GardenEvent from the minimum required data.  Each factory stamps
 *      `occurredAt` from an explicitly passed `now` (never Date.now())
 *      to keep tests deterministic.
 *
 *   2. deriveEvents() — compares a "before" garden snapshot with an "after"
 *      snapshot and produces the correct set of domain events.  Callers
 *      (the sync pipeline, the garden engine) call this after a state
 *      transition to get the event log entry for that transition.
 *
 * Events are immutable value objects — factories always return new objects.
 */

import type {
  GardenEvent,
  GrowthStage,
  Plant,
} from "@commit-garden/shared-types";

// ─── Shared context ───────────────────────────────────────────────────────────

/** Context passed to every factory / deriver so `now` is never implicit. */
export type EventContext = {
  now: Date;
};

function ts(ctx: EventContext): string {
  return ctx.now.toISOString();
}

// ─── Event factories ──────────────────────────────────────────────────────────

export function makePlantPlantedEvent(
  plantId: string,
  speciesId: string,
  originWeek: number,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "PLANT_PLANTED",
    plantId,
    speciesId,
    originWeek,
    occurredAt: ts(ctx),
  };
}

export function makePlantGrewEvent(
  plantId: string,
  previousStage: GrowthStage,
  newStage: GrowthStage,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "PLANT_GREW",
    plantId,
    previousStage,
    newStage,
    occurredAt: ts(ctx),
  };
}

export function makePlantFloweredEvent(
  plantId: string,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "PLANT_FLOWERED",
    plantId,
    occurredAt: ts(ctx),
  };
}

export function makeCreatureUnlockedEvent(
  creatureId: string,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "CREATURE_UNLOCKED",
    creatureId,
    occurredAt: ts(ctx),
  };
}

export function makeDecorationUnlockedEvent(
  decorationId: string,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "DECORATION_UNLOCKED",
    decorationId,
    occurredAt: ts(ctx),
  };
}

export function makeStreakMilestoneReachedEvent(
  milestone: number,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "STREAK_MILESTONE_REACHED",
    milestone,
    occurredAt: ts(ctx),
  };
}

export function makeGardenRecoveredEvent(
  previousStreak: number,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "GARDEN_RECOVERED",
    previousStreak,
    occurredAt: ts(ctx),
  };
}

export function makeNewWeekStartedEvent(
  weekStart: string,
  ctx: EventContext,
): GardenEvent {
  return {
    type: "NEW_WEEK_STARTED",
    weekStart,
    occurredAt: ts(ctx),
  };
}

// ─── Garden snapshot (minimal — only what deriveEvents needs) ─────────────────

export type GardenSnapshot = {
  /** Current streak at the time of the snapshot. */
  currentStreak: number;
  /** All plants in the garden. */
  plants: readonly Plant[];
  /**
   * The most recent week that became active during this sync cycle.
   * Undefined when no new week started (e.g. mid-week re-sync).
   */
  newWeekStart?: string;
};

// ─── Streak milestone thresholds ─────────────────────────────────────────────

/**
 * Default streak values that produce a STREAK_MILESTONE_REACHED event.
 * Configurable so callers can override for tests or future tuning.
 */
export const DEFAULT_STREAK_MILESTONES: readonly number[] = [
  1, 4, 8, 12, 16, 20, 26, 52,
];

// ─── deriveEvents ─────────────────────────────────────────────────────────────

export type DeriveEventsOptions = {
  streakMilestones?: readonly number[];
};

/**
 * Compare a before/after pair of garden snapshots and return the domain events
 * that describe the transition.
 *
 * Order of events produced (when applicable):
 *   1. NEW_WEEK_STARTED
 *   2. PLANT_PLANTED       (one per new plant)
 *   3. PLANT_GREW          (one per plant that advanced a stage)
 *   4. PLANT_FLOWERED      (for plants that reached FLOWERING)
 *   5. STREAK_MILESTONE_REACHED
 *   6. GARDEN_RECOVERED    (streak went from 0 → >0 after a dormant period)
 *
 * @param before  Snapshot before the sync/transition.
 * @param after   Snapshot after the sync/transition.
 * @param ctx     Event context (carries `now`).
 * @param opts    Optional configuration overrides.
 */
export function deriveEvents(
  before: GardenSnapshot,
  after: GardenSnapshot,
  ctx: EventContext,
  opts: DeriveEventsOptions = {},
): GardenEvent[] {
  const events: GardenEvent[] = [];
  const milestones = opts.streakMilestones ?? DEFAULT_STREAK_MILESTONES;

  // 1. New week started
  if (after.newWeekStart) {
    events.push(makeNewWeekStartedEvent(after.newWeekStart, ctx));
  }

  // Build lookups for before/after plants.
  const beforeById = new Map(before.plants.map((p) => [p.id, p]));
  const afterById = new Map(after.plants.map((p) => [p.id, p]));

  // 2. Newly planted plants (present in after, absent in before).
  for (const plant of after.plants) {
    if (!beforeById.has(plant.id)) {
      events.push(
        makePlantPlantedEvent(plant.id, plant.speciesId, plant.originWeek, ctx),
      );
    }
  }

  // 3 & 4. Plants that advanced a stage.
  for (const afterPlant of after.plants) {
    const beforePlant = beforeById.get(afterPlant.id);
    if (!beforePlant) continue; // already covered by PLANT_PLANTED above
    if (beforePlant.growthStage === afterPlant.growthStage) continue;

    events.push(
      makePlantGrewEvent(
        afterPlant.id,
        beforePlant.growthStage,
        afterPlant.growthStage,
        ctx,
      ),
    );

    if (afterPlant.growthStage === "FLOWERING") {
      events.push(makePlantFloweredEvent(afterPlant.id, ctx));
    }
  }

  // 5. Streak milestone reached.
  //    Fire when the streak crossed a milestone threshold this transition.
  const crossedMilestone = milestones.find(
    (m) => after.currentStreak >= m && before.currentStreak < m,
  );
  if (crossedMilestone !== undefined) {
    events.push(makeStreakMilestoneReachedEvent(crossedMilestone, ctx));
  }

  // 6. Garden recovered — streak was 0 (or negative) and is now positive.
  if (before.currentStreak === 0 && after.currentStreak > 0) {
    // Only fire recovery if there were already plants (not the very first week).
    const hadPlants =
      before.plants.length > 0 ||
      after.plants.some((p) => !afterById.has(p.id) === false && beforeById.size > 0);
    if (hadPlants) {
      events.push(makeGardenRecoveredEvent(0, ctx));
    }
  }

  return events;
}

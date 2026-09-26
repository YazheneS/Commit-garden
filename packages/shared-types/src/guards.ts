/**
 * Runtime type guards for shared domain types.
 *
 * These are the only place where we cross from compile-time types into
 * runtime validation.  Useful for:
 *   - validating API responses before storing them
 *   - narrowing GardenEvent union branches
 *   - defensive assertions in tests
 *
 * Each guard follows the standard TypeScript predicate pattern:
 *   function isX(value: unknown): value is X
 */

import type {
  DailyActivity,
  WeeklyActivity,
  GardenEvent,
  GardenEventType,
  GrowthStage,
  PlantHealthState,
} from "./index.js";

// ─── Primitives ───────────────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isNonNegativeInteger(v: unknown): v is number {
  return isNumber(v) && Number.isInteger(v) && v >= 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── ISO date helpers ─────────────────────────────────────────────────────────

/** Matches YYYY-MM-DD */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns true for strings that look like calendar dates (YYYY-MM-DD). */
export function isCalendarDate(v: unknown): v is string {
  return isString(v) && DATE_RE.test(v);
}

/** Returns true for strings that look like ISO-8601 timestamps. */
export function isIsoTimestamp(v: unknown): v is string {
  if (!isString(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

// ─── GrowthStage ─────────────────────────────────────────────────────────────

const GROWTH_STAGES: readonly GrowthStage[] = [
  "SEED",
  "SPROUT",
  "YOUNG",
  "MATURE",
  "FLOWERING",
  "SPECIAL",
];

export function isGrowthStage(v: unknown): v is GrowthStage {
  return isString(v) && (GROWTH_STAGES as readonly string[]).includes(v);
}

// ─── PlantHealthState ─────────────────────────────────────────────────────────

const PLANT_HEALTH_STATES: readonly PlantHealthState[] = [
  "HEALTHY",
  "WILTED",
  "DORMANT",
  "RECOVERING",
];

export function isPlantHealthState(v: unknown): v is PlantHealthState {
  return (
    isString(v) && (PLANT_HEALTH_STATES as readonly string[]).includes(v)
  );
}

// ─── DailyActivity ────────────────────────────────────────────────────────────

export function isDailyActivity(v: unknown): v is DailyActivity {
  if (!isRecord(v)) return false;
  return (
    isCalendarDate(v["date"]) &&
    isNonNegativeInteger(v["contributionCount"]) &&
    typeof v["hasActivity"] === "boolean"
  );
}

// ─── WeeklyActivity ───────────────────────────────────────────────────────────

export function isWeeklyActivity(v: unknown): v is WeeklyActivity {
  if (!isRecord(v)) return false;
  return (
    isCalendarDate(v["weekStart"]) &&
    isCalendarDate(v["weekEnd"]) &&
    isNonNegativeInteger(v["activeDays"]) &&
    isNonNegativeInteger(v["contributionCount"]) &&
    typeof v["isActive"] === "boolean"
  );
}

// ─── GardenEvent ─────────────────────────────────────────────────────────────

const GARDEN_EVENT_TYPES: readonly GardenEventType[] = [
  "PLANT_PLANTED",
  "PLANT_GREW",
  "PLANT_FLOWERED",
  "CREATURE_UNLOCKED",
  "DECORATION_UNLOCKED",
  "STREAK_MILESTONE_REACHED",
  "GARDEN_RECOVERED",
  "NEW_WEEK_STARTED",
];

export function isGardenEventType(v: unknown): v is GardenEventType {
  return (
    isString(v) && (GARDEN_EVENT_TYPES as readonly string[]).includes(v)
  );
}

/**
 * Validates that a value is a well-formed GardenEvent.
 * Checks the shared shape (type + occurredAt); callers can then narrow
 * further with a switch on `event.type`.
 */
export function isGardenEvent(v: unknown): v is GardenEvent {
  if (!isRecord(v)) return false;
  return isGardenEventType(v["type"]) && isIsoTimestamp(v["occurredAt"]);
}

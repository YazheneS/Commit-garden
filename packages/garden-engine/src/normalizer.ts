/**
 * Activity Normalizer
 *
 * Converts an array of DailyActivity records into an array of WeeklyActivity
 * records, one entry per ISO calendar week (Monday–Sunday).
 *
 * Design rules:
 *  - Weeks run Monday → Sunday (ISO 8601 week convention).
 *  - Days absent from the input are treated as zero-contribution days.
 *  - An "active week" is configurable via `activeWeekMinDays` (default: 1).
 *  - The function is pure: it never calls `new Date()` internally; callers
 *    pass `now` so tests remain deterministic.
 *  - Input order does not matter; days are sorted internally.
 *  - Duplicate dates are merged by summing their contributionCounts.
 */

import type { DailyActivity, WeeklyActivity } from "@commit-garden/shared-types";

// ─── Configuration ────────────────────────────────────────────────────────────

export type NormalizerConfig = {
  /**
   * Minimum number of days with at least one contribution for a week to be
   * considered "active".  Defaults to 1 (any contribution during the week).
   */
  activeWeekMinDays: number;
};

const DEFAULT_CONFIG: NormalizerConfig = {
  activeWeekMinDays: 1,
};

// ─── Date helpers (pure, no side effects) ─────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string to a UTC midnight Date without relying on the
 * local timezone.
 */
function parseDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed
  const day = Number(dayStr);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Format a UTC Date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Return the Monday of the ISO week containing `date` (UTC).
 */
function toWeekMonday(date: Date): Date {
  // getUTCDay(): 0=Sun, 1=Mon, …, 6=Sat
  // ISO week: Mon=0 offset, Sun=6 offset
  const dow = date.getUTCDay(); // 0–6
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysFromMonday);
  return monday;
}

/**
 * Add `days` days to a UTC Date, returning a new Date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(date.getUTCDate() + days);
  return result;
}

// ─── Core implementation ──────────────────────────────────────────────────────

/**
 * Normalize an array of daily GitHub activity records into weekly summaries.
 *
 * @param days   Raw daily activity.  May be unsorted; duplicates are merged.
 * @param config Optional configuration overrides.
 * @returns      Sorted array of WeeklyActivity (oldest week first).
 */
export function normalizeActivity(
  days: readonly DailyActivity[],
  config: Partial<NormalizerConfig> = {},
): WeeklyActivity[] {
  if (days.length === 0) return [];

  const { activeWeekMinDays } = { ...DEFAULT_CONFIG, ...config };

  // Step 1: merge duplicate dates, keep the sum of contributionCounts.
  const merged = new Map<string, number>();
  for (const day of days) {
    merged.set(day.date, (merged.get(day.date) ?? 0) + day.contributionCount);
  }

  // Step 2: bucket each date into its ISO week (keyed by Monday date string).
  const weekBuckets = new Map<string, Map<string, number>>();
  for (const [dateStr, count] of merged) {
    const date = parseDate(dateStr);
    const monday = toWeekMonday(date);
    const weekKey = formatDate(monday);
    if (!weekBuckets.has(weekKey)) {
      weekBuckets.set(weekKey, new Map());
    }
    weekBuckets.get(weekKey)!.set(dateStr, count);
  }

  // Step 3: build a WeeklyActivity for each bucket.
  const weeks: WeeklyActivity[] = [];

  for (const [weekKey, dayMap] of weekBuckets) {
    const weekStart = parseDate(weekKey);
    const weekEnd = addDays(weekStart, 6); // Sunday

    let activeDays = 0;
    let contributionCount = 0;

    for (const [, count] of dayMap) {
      contributionCount += count;
      if (count > 0) activeDays++;
    }

    const isActive = activeDays >= activeWeekMinDays;

    weeks.push({
      weekStart: weekKey,
      weekEnd: formatDate(weekEnd),
      activeDays,
      contributionCount,
      isActive,
    });
  }

  // Step 4: sort oldest → newest.
  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return weeks;
}

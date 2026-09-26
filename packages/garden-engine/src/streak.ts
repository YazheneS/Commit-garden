/**
 * Streak Engine
 *
 * Calculates streak statistics from an array of WeeklyActivity records.
 *
 * Definitions:
 *   currentStreak   — consecutive active weeks ending at (or including) the
 *                     most recently completed week.  An incomplete current week
 *                     (weekEnd > now) is excluded from streak calculation so
 *                     that a user mid-week does not see their streak reset.
 *   longestStreak   — the all-time maximum consecutive active weeks.
 *   totalActiveWeeks — count of all weeks ever marked isActive.
 *
 * Design rules:
 *   - Pure function: no Date() calls internally; `now` is injected.
 *   - Weeks must be sorted oldest → newest (normalizeActivity guarantees this).
 *   - A gap of one or more inactive/missing weeks breaks the current streak.
 */

import type { WeeklyActivity } from "@commit-garden/shared-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreakResult = {
  /** Consecutive active weeks ending at the latest completed week. */
  currentStreak: number;
  /** All-time maximum consecutive active weeks. */
  longestStreak: number;
  /** Total number of weeks ever marked isActive. */
  totalActiveWeeks: number;
};

export type StreakOptions = {
  /**
   * The reference point for "now".  Used to determine whether the most recent
   * week is still incomplete.  Must be passed explicitly for determinism.
   */
  now: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD → UTC midnight Date. */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

// ─── Core implementation ──────────────────────────────────────────────────────

/**
 * Calculate streak statistics from a sorted array of WeeklyActivity records.
 *
 * @param weeks  Sorted oldest → newest (output of normalizeActivity).
 * @param opts   Must supply `now` for deterministic behaviour.
 */
export function calculateStreak(
  weeks: readonly WeeklyActivity[],
  opts: StreakOptions,
): StreakResult {
  if (weeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveWeeks: 0 };
  }

  const { now } = opts;

  // ── Step 1: drop the current (incomplete) week if its end is in the future.
  //    "In the future" means weekEnd > today (compare date strings only).
  const todayStr = formatDateUTC(now);

  let completedWeeks = weeks;
  const lastWeek = weeks[weeks.length - 1]!;
  if (lastWeek.weekEnd > todayStr) {
    completedWeeks = weeks.slice(0, -1);
  }

  if (completedWeeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveWeeks: 0 };
  }

  // ── Step 2: totalActiveWeeks — simple count over completed weeks.
  //    We count across all weeks, not just the streak, so historical activity
  //    is preserved even after a broken streak.
  let totalActiveWeeks = 0;
  for (const w of completedWeeks) {
    if (w.isActive) totalActiveWeeks++;
  }

  // ── Step 3: scan from newest → oldest to find currentStreak.
  //    We walk backwards and stop as soon as we hit an inactive week.
  //    Weeks are assumed contiguous (no fabricated gap-weeks); a missing week
  //    in the input simply means no activity was recorded, which still breaks
  //    the streak.  We detect gaps by comparing adjacent weekStart dates.
  let currentStreak = 0;
  for (let i = completedWeeks.length - 1; i >= 0; i--) {
    const week = completedWeeks[i]!;

    if (!week.isActive) break;

    // Check for a gap between this week and the next-newer week.
    // The previous iteration checked week[i+1]; now check continuity
    // between week[i] and week[i+1].
    if (i < completedWeeks.length - 1) {
      const newerWeek = completedWeeks[i + 1]!;
      const expectedPrevMonday = addDaysUTC(parseDate(newerWeek.weekStart), -7);
      const actualMonday = parseDate(week.weekStart);
      if (expectedPrevMonday.getTime() !== actualMonday.getTime()) {
        // Gap in the data — streak is broken.
        break;
      }
    }

    currentStreak++;
  }

  // ── Step 4: scan all completed weeks to find longestStreak.
  let longestStreak = 0;
  let runLength = 0;
  let prevWeekStart: string | null = null;

  for (const week of completedWeeks) {
    if (!week.isActive) {
      longestStreak = Math.max(longestStreak, runLength);
      runLength = 0;
      prevWeekStart = null;
      continue;
    }

    // Check continuity with the previous active week in the run.
    if (prevWeekStart !== null) {
      const expectedMonday = addDaysUTC(parseDate(prevWeekStart), 7);
      const actualMonday = parseDate(week.weekStart);
      if (expectedMonday.getTime() !== actualMonday.getTime()) {
        // Gap — end the current run.
        longestStreak = Math.max(longestStreak, runLength);
        runLength = 0;
      }
    }

    runLength++;
    prevWeekStart = week.weekStart;
  }
  longestStreak = Math.max(longestStreak, runLength);

  return { currentStreak, longestStreak, totalActiveWeeks };
}

// ─── Private date utilities ───────────────────────────────────────────────────

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(date.getUTCDate() + days);
  return result;
}

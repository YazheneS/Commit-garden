import { describe, it, expect } from "vitest";
import { calculateStreak } from "./streak.js";
import type { WeeklyActivity } from "@commit-garden/shared-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a WeeklyActivity where weekEnd = weekStart + 6 days.
 * `weekStart` must be a Monday (YYYY-MM-DD).
 */
function week(
  weekStart: string,
  isActive: boolean,
  activeDays = isActive ? 1 : 0,
  contributionCount = isActive ? 1 : 0,
): WeeklyActivity {
  const [y, m, d] = weekStart.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  return {
    weekStart,
    weekEnd: fmt(end),
    isActive,
    activeDays,
    contributionCount,
  };
}

/** A fixed "now" well past all test data so weeks are treated as completed. */
const FAR_FUTURE = new Date("2099-01-01T00:00:00Z");

// ─── Empty input ─────────────────────────────────────────────────────────────

describe("calculateStreak — empty input", () => {
  it("returns all zeros for empty weeks array", () => {
    expect(calculateStreak([], { now: FAR_FUTURE })).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalActiveWeeks: 0,
    });
  });
});

// ─── All inactive ─────────────────────────────────────────────────────────────

describe("calculateStreak — all inactive weeks", () => {
  it("returns zeros when no week is active", () => {
    const weeks = [
      week("2024-01-01", false),
      week("2024-01-08", false),
      week("2024-01-15", false),
    ];
    expect(calculateStreak(weeks, { now: FAR_FUTURE })).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalActiveWeeks: 0,
    });
  });
});

// ─── Single active week ───────────────────────────────────────────────────────

describe("calculateStreak — single active week", () => {
  it("returns streak=1 for one active week", () => {
    const result = calculateStreak([week("2024-03-04", true)], {
      now: FAR_FUTURE,
    });
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      totalActiveWeeks: 1,
    });
  });
});

// ─── First active week (no prior history) ────────────────────────────────────

describe("calculateStreak — first active week", () => {
  it("currentStreak=1, longestStreak=1 for a single brand-new week", () => {
    const now = new Date("2024-03-07T12:00:00Z"); // mid-week Thu
    // Week 2024-03-04 ends 2024-03-10 — still in the future at 'now'
    // So it's the incomplete current week and should be excluded.
    const result = calculateStreak([week("2024-03-04", true)], { now });
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalActiveWeeks).toBe(0);
  });

  it("counts the week once its end date has passed", () => {
    const now = new Date("2024-03-11T00:00:00Z"); // Monday after the week ends
    const result = calculateStreak([week("2024-03-04", true)], { now });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalActiveWeeks).toBe(1);
  });
});

// ─── Consecutive active weeks ─────────────────────────────────────────────────

describe("calculateStreak — consecutive active weeks", () => {
  const weeks = [
    week("2024-01-01", true),
    week("2024-01-08", true),
    week("2024-01-15", true),
    week("2024-01-22", true),
  ];

  it("currentStreak equals the total run", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).currentStreak).toBe(4);
  });

  it("longestStreak equals the total run", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).longestStreak).toBe(4);
  });

  it("totalActiveWeeks equals the total run", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).totalActiveWeeks).toBe(4);
  });
});

// ─── Broken streak ────────────────────────────────────────────────────────────

describe("calculateStreak — broken streak", () => {
  // 3 active, 1 inactive, 2 active
  const weeks = [
    week("2024-01-01", true),
    week("2024-01-08", true),
    week("2024-01-15", true),
    week("2024-01-22", false), // break
    week("2024-01-29", true),
    week("2024-02-05", true),
  ];

  it("currentStreak counts only the tail run after the break", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).currentStreak).toBe(2);
  });

  it("longestStreak captures the longest run (3) not the current (2)", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).longestStreak).toBe(3);
  });

  it("totalActiveWeeks counts all active weeks across breaks", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).totalActiveWeeks).toBe(5);
  });
});

// ─── Historical data — long history with multiple breaks ──────────────────────

describe("calculateStreak — historical data", () => {
  const weeks = [
    week("2023-01-02", true),
    week("2023-01-09", true),
    week("2023-01-16", false),
    week("2023-01-23", true),
    week("2023-01-30", true),
    week("2023-02-06", true),
    week("2023-02-13", true),
    week("2023-02-20", true), // run of 5
    week("2023-02-27", false),
    week("2023-03-06", true),
  ];

  it("longestStreak = 5 (the run of five weeks in Feb)", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).longestStreak).toBe(5);
  });

  it("currentStreak = 1 (only the last week is active after a break)", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).currentStreak).toBe(1);
  });

  it("totalActiveWeeks = 8", () => {
    expect(calculateStreak(weeks, { now: FAR_FUTURE }).totalActiveWeeks).toBe(8);
  });
});

// ─── Incomplete current week ──────────────────────────────────────────────────

describe("calculateStreak — incomplete current week", () => {
  // Weeks 1–3 completed and active; week 4 started but not yet ended.
  const completedWeeks = [
    week("2024-03-04", true),  // ends 2024-03-10
    week("2024-03-11", true),  // ends 2024-03-17
    week("2024-03-18", true),  // ends 2024-03-24
  ];
  const currentWeek = week("2024-03-25", true); // ends 2024-03-31
  const allWeeks = [...completedWeeks, currentWeek];

  it("excludes the current incomplete week from streak calculation", () => {
    // now = mid-week Wednesday March 27
    const now = new Date("2024-03-27T12:00:00Z");
    const result = calculateStreak(allWeeks, { now });
    // streak = 3 (the 3 completed weeks), not 4
    expect(result.currentStreak).toBe(3);
  });

  it("includes the current week once it is completed", () => {
    // now = Monday April 1 (the week has ended)
    const now = new Date("2024-04-01T00:00:00Z");
    const result = calculateStreak(allWeeks, { now });
    expect(result.currentStreak).toBe(4);
  });

  it("does not count an incomplete inactive week against the streak", () => {
    // Same setup but the current in-progress week has no activity yet
    const currentInactive = week("2024-03-25", false);
    const now = new Date("2024-03-27T12:00:00Z");
    const result = calculateStreak(
      [...completedWeeks, currentInactive],
      { now },
    );
    // The inactive incomplete week is excluded → streak is still 3
    expect(result.currentStreak).toBe(3);
  });
});

// ─── Gap detection (missing weeks in input) ───────────────────────────────────

describe("calculateStreak — gap detection", () => {
  it("treats a missing week in the input as a streak break", () => {
    // Weeks are not contiguous — there is a gap between Jan 15 and Jan 29
    const weeks = [
      week("2024-01-01", true),
      week("2024-01-08", true),
      week("2024-01-15", true),
      // 2024-01-22 is missing entirely
      week("2024-01-29", true),
      week("2024-02-05", true),
    ];
    const result = calculateStreak(weeks, { now: FAR_FUTURE });
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(3);
  });
});

// ─── Streak after recovery ────────────────────────────────────────────────────

describe("calculateStreak — recovery after dormancy", () => {
  it("starts a new streak after returning from inactivity", () => {
    const weeks = [
      week("2023-06-05", true),
      week("2023-06-12", true),
      week("2023-06-19", false), // break — garden goes dormant
      week("2023-06-26", false),
      week("2023-07-03", false),
      week("2023-07-10", true),  // user returns
      week("2023-07-17", true),
      week("2023-07-24", true),
    ];
    const result = calculateStreak(weeks, { now: FAR_FUTURE });
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3); // tie between first run (2) and recovery (3)
    expect(result.totalActiveWeeks).toBe(5);
  });
});

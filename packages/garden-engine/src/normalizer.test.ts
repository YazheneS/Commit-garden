import { describe, it, expect } from "vitest";
import { normalizeActivity } from "./normalizer.js";
import type { DailyActivity, WeeklyActivity } from "@commit-garden/shared-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a DailyActivity with sensible defaults. */
function day(
  date: string,
  contributionCount = 0,
): DailyActivity {
  return { date, contributionCount, hasActivity: contributionCount > 0 };
}

/** Assert only the fields we care about, ignoring the rest. */
function expectWeek(
  actual: WeeklyActivity,
  expected: Partial<WeeklyActivity>,
): void {
  for (const key of Object.keys(expected) as Array<keyof WeeklyActivity>) {
    expect(actual[key], `field "${key}"`).toEqual(expected[key]);
  }
}

// ─── Empty / trivial inputs ───────────────────────────────────────────────────

describe("normalizeActivity — empty input", () => {
  it("returns an empty array for no days", () => {
    expect(normalizeActivity([])).toEqual([]);
  });
});

// ─── Single day ───────────────────────────────────────────────────────────────

describe("normalizeActivity — single day", () => {
  it("wraps one active day into one week (Monday start)", () => {
    // 2024-03-06 is a Wednesday — its ISO week starts 2024-03-04 (Mon)
    const result = normalizeActivity([day("2024-03-06", 3)]);
    expect(result).toHaveLength(1);
    expectWeek(result[0]!, {
      weekStart: "2024-03-04",
      weekEnd: "2024-03-10",
      activeDays: 1,
      contributionCount: 3,
      isActive: true,
    });
  });

  it("marks a zero-contribution day as inactive", () => {
    const result = normalizeActivity([day("2024-03-06", 0)]);
    expect(result).toHaveLength(1);
    expectWeek(result[0]!, { isActive: false, activeDays: 0, contributionCount: 0 });
  });

  it("handles a Monday correctly (weekStart == day date)", () => {
    // 2024-03-04 is a Monday
    const result = normalizeActivity([day("2024-03-04", 1)]);
    expect(result[0]!.weekStart).toBe("2024-03-04");
    expect(result[0]!.weekEnd).toBe("2024-03-10");
  });

  it("handles a Sunday correctly (weekEnd == day date)", () => {
    // 2024-03-10 is a Sunday
    const result = normalizeActivity([day("2024-03-10", 1)]);
    expect(result[0]!.weekStart).toBe("2024-03-04");
    expect(result[0]!.weekEnd).toBe("2024-03-10");
  });
});

// ─── Full week ────────────────────────────────────────────────────────────────

describe("normalizeActivity — full week (7 days)", () => {
  // Week: 2024-03-04 (Mon) → 2024-03-10 (Sun)
  const fullWeek: DailyActivity[] = [
    day("2024-03-04", 2),
    day("2024-03-05", 0),
    day("2024-03-06", 3),
    day("2024-03-07", 1),
    day("2024-03-08", 0),
    day("2024-03-09", 4),
    day("2024-03-10", 0),
  ];

  it("produces exactly one WeeklyActivity", () => {
    expect(normalizeActivity(fullWeek)).toHaveLength(1);
  });

  it("sums contributionCount across all days", () => {
    const [w] = normalizeActivity(fullWeek);
    expect(w!.contributionCount).toBe(2 + 3 + 1 + 4);
  });

  it("counts only days with contributions as activeDays", () => {
    const [w] = normalizeActivity(fullWeek);
    expect(w!.activeDays).toBe(4); // 3 zero-contribution days excluded
  });

  it("marks the week as active (default threshold of 1)", () => {
    const [w] = normalizeActivity(fullWeek);
    expect(w!.isActive).toBe(true);
  });
});

// ─── Partial week ─────────────────────────────────────────────────────────────

describe("normalizeActivity — partial week (not all 7 days present)", () => {
  it("only counts days present in the input", () => {
    // Only Wednesday and Friday provided for the week of 2024-03-04
    const result = normalizeActivity([
      day("2024-03-06", 5),
      day("2024-03-08", 2),
    ]);
    expect(result).toHaveLength(1);
    expectWeek(result[0]!, {
      weekStart: "2024-03-04",
      weekEnd: "2024-03-10",
      activeDays: 2,
      contributionCount: 7,
    });
  });
});

// ─── Inactive weeks ───────────────────────────────────────────────────────────

describe("normalizeActivity — inactive weeks", () => {
  it("marks a week as inactive when all days have zero contributions", () => {
    const result = normalizeActivity([
      day("2024-03-04", 0),
      day("2024-03-05", 0),
    ]);
    expect(result[0]!.isActive).toBe(false);
  });

  it("respects custom activeWeekMinDays=3 threshold", () => {
    // Only 2 active days — should be inactive with threshold=3
    const result = normalizeActivity(
      [day("2024-03-04", 1), day("2024-03-05", 1)],
      { activeWeekMinDays: 3 },
    );
    expect(result[0]!.isActive).toBe(false);
  });

  it("marks week as active when activeDays meets the custom threshold", () => {
    const result = normalizeActivity(
      [day("2024-03-04", 1), day("2024-03-05", 1), day("2024-03-06", 1)],
      { activeWeekMinDays: 3 },
    );
    expect(result[0]!.isActive).toBe(true);
  });
});

// ─── Multi-week ───────────────────────────────────────────────────────────────

describe("normalizeActivity — multiple weeks", () => {
  const days: DailyActivity[] = [
    // Week 1: 2024-03-04
    day("2024-03-04", 2),
    day("2024-03-06", 3),
    // Week 2: 2024-03-11
    day("2024-03-11", 0),
    day("2024-03-12", 0),
    // Week 3: 2024-03-18
    day("2024-03-20", 5),
  ];

  it("produces one entry per calendar week", () => {
    expect(normalizeActivity(days)).toHaveLength(3);
  });

  it("returns weeks sorted oldest → newest", () => {
    const result = normalizeActivity(days);
    expect(result[0]!.weekStart).toBe("2024-03-04");
    expect(result[1]!.weekStart).toBe("2024-03-11");
    expect(result[2]!.weekStart).toBe("2024-03-18");
  });

  it("correctly marks week 1 as active", () => {
    expect(normalizeActivity(days)[0]!.isActive).toBe(true);
  });

  it("correctly marks week 2 as inactive (all zeros)", () => {
    expect(normalizeActivity(days)[1]!.isActive).toBe(false);
  });

  it("correctly marks week 3 as active", () => {
    expect(normalizeActivity(days)[2]!.isActive).toBe(true);
  });
});

// ─── Input order independence ─────────────────────────────────────────────────

describe("normalizeActivity — input order", () => {
  it("produces the same result regardless of input order", () => {
    const ordered: DailyActivity[] = [
      day("2024-03-04", 1),
      day("2024-03-11", 2),
      day("2024-03-18", 3),
    ];
    const reversed = [...ordered].reverse();
    expect(normalizeActivity(ordered)).toEqual(normalizeActivity(reversed));
  });
});

// ─── Duplicate dates ──────────────────────────────────────────────────────────

describe("normalizeActivity — duplicate dates", () => {
  it("merges duplicate dates by summing contributionCounts", () => {
    const result = normalizeActivity([
      day("2024-03-06", 3),
      day("2024-03-06", 5), // duplicate
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.contributionCount).toBe(8);
    expect(result[0]!.activeDays).toBe(1); // still one calendar day
  });
});

// ─── Week boundary: year boundary ─────────────────────────────────────────────

describe("normalizeActivity — year boundary", () => {
  it("handles a week that spans a year boundary (Dec → Jan)", () => {
    // 2023-12-31 is a Sunday; its ISO week starts 2023-12-25 (Mon)
    // 2024-01-01 is a Monday; it starts a new ISO week
    const result = normalizeActivity([
      day("2023-12-31", 2), // belongs to week starting 2023-12-25
      day("2024-01-01", 3), // belongs to week starting 2024-01-01
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]!.weekStart).toBe("2023-12-25");
    expect(result[1]!.weekStart).toBe("2024-01-01");
  });
});

// ─── Large gap between activity periods ──────────────────────────────────────

describe("normalizeActivity — gaps in activity", () => {
  it("does not fabricate weeks for periods with no input days", () => {
    // 10-week gap between the two active days
    const result = normalizeActivity([
      day("2024-01-08", 1), // week of 2024-01-08
      day("2024-03-18", 1), // week of 2024-03-18
    ]);
    // Only 2 weeks — no synthetic inactive weeks are created
    expect(result).toHaveLength(2);
    expect(result[0]!.weekStart).toBe("2024-01-08");
    expect(result[1]!.weekStart).toBe("2024-03-18");
  });
});

// ─── contributionCount consistency ───────────────────────────────────────────

describe("normalizeActivity — contributionCount consistency", () => {
  it("total contributionCount across all weeks equals sum of all input days", () => {
    const input: DailyActivity[] = [
      day("2024-03-04", 2),
      day("2024-03-06", 3),
      day("2024-03-11", 7),
      day("2024-03-20", 5),
    ];
    const totalInput = input.reduce((s, d) => s + d.contributionCount, 0);
    const result = normalizeActivity(input);
    const totalOutput = result.reduce((s, w) => s + w.contributionCount, 0);
    expect(totalOutput).toBe(totalInput);
  });
});

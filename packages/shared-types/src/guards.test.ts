import { describe, it, expect } from "vitest";
import {
  isCalendarDate,
  isIsoTimestamp,
  isGrowthStage,
  isPlantHealthState,
  isDailyActivity,
  isWeeklyActivity,
  isGardenEventType,
  isGardenEvent,
} from "./guards.js";
import type { DailyActivity, WeeklyActivity, GardenEvent } from "./index.js";

// ─── isCalendarDate ───────────────────────────────────────────────────────────

describe("isCalendarDate", () => {
  it("accepts a valid YYYY-MM-DD string", () => {
    expect(isCalendarDate("2024-01-15")).toBe(true);
  });

  it("rejects a datetime string", () => {
    expect(isCalendarDate("2024-01-15T10:00:00Z")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isCalendarDate("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isCalendarDate(20240115)).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
    expect(isCalendarDate(undefined)).toBe(false);
  });
});

// ─── isIsoTimestamp ───────────────────────────────────────────────────────────

describe("isIsoTimestamp", () => {
  it("accepts a full ISO-8601 timestamp", () => {
    expect(isIsoTimestamp("2024-01-15T10:00:00.000Z")).toBe(true);
  });

  it("accepts a date-only string (parseable as midnight UTC)", () => {
    expect(isIsoTimestamp("2024-01-15")).toBe(true);
  });

  it("rejects garbage strings", () => {
    expect(isIsoTimestamp("not-a-date")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isIsoTimestamp(null)).toBe(false);
    expect(isIsoTimestamp(42)).toBe(false);
  });
});

// ─── isGrowthStage ────────────────────────────────────────────────────────────

describe("isGrowthStage", () => {
  it.each(["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING", "SPECIAL"])(
    "accepts %s",
    (stage) => {
      expect(isGrowthStage(stage)).toBe(true);
    },
  );

  it("rejects lowercase variants", () => {
    expect(isGrowthStage("seed")).toBe(false);
  });

  it("rejects unknown strings", () => {
    expect(isGrowthStage("ANCIENT")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isGrowthStage(1)).toBe(false);
    expect(isGrowthStage(null)).toBe(false);
  });
});

// ─── isPlantHealthState ───────────────────────────────────────────────────────

describe("isPlantHealthState", () => {
  it.each(["HEALTHY", "WILTED", "DORMANT", "RECOVERING"])(
    "accepts %s",
    (state) => {
      expect(isPlantHealthState(state)).toBe(true);
    },
  );

  it("rejects unknown health states", () => {
    expect(isPlantHealthState("DEAD")).toBe(false);
  });
});

// ─── isDailyActivity ─────────────────────────────────────────────────────────

describe("isDailyActivity", () => {
  const valid: DailyActivity = {
    date: "2024-03-01",
    contributionCount: 5,
    hasActivity: true,
  };

  it("accepts a valid DailyActivity", () => {
    expect(isDailyActivity(valid)).toBe(true);
  });

  it("accepts a zero-contribution day", () => {
    const inactive: DailyActivity = {
      date: "2024-03-02",
      contributionCount: 0,
      hasActivity: false,
    };
    expect(isDailyActivity(inactive)).toBe(true);
  });

  it("rejects missing date field", () => {
    const { date: _date, ...rest } = valid;
    expect(isDailyActivity(rest)).toBe(false);
  });

  it("rejects negative contributionCount", () => {
    expect(isDailyActivity({ ...valid, contributionCount: -1 })).toBe(false);
  });

  it("rejects a datetime string for date", () => {
    expect(
      isDailyActivity({ ...valid, date: "2024-03-01T00:00:00Z" }),
    ).toBe(false);
  });

  it("rejects non-boolean hasActivity", () => {
    expect(isDailyActivity({ ...valid, hasActivity: 1 })).toBe(false);
  });

  it("rejects null", () => {
    expect(isDailyActivity(null)).toBe(false);
  });

  it("rejects an array", () => {
    expect(isDailyActivity([valid])).toBe(false);
  });
});

// ─── isWeeklyActivity ─────────────────────────────────────────────────────────

describe("isWeeklyActivity", () => {
  const valid: WeeklyActivity = {
    weekStart: "2024-03-04",
    weekEnd: "2024-03-10",
    activeDays: 3,
    contributionCount: 12,
    isActive: true,
  };

  it("accepts a valid WeeklyActivity", () => {
    expect(isWeeklyActivity(valid)).toBe(true);
  });

  it("accepts an inactive week with zero values", () => {
    const inactive: WeeklyActivity = {
      weekStart: "2024-03-11",
      weekEnd: "2024-03-17",
      activeDays: 0,
      contributionCount: 0,
      isActive: false,
    };
    expect(isWeeklyActivity(inactive)).toBe(true);
  });

  it("rejects missing weekStart", () => {
    const { weekStart: _ws, ...rest } = valid;
    expect(isWeeklyActivity(rest)).toBe(false);
  });

  it("rejects non-integer activeDays", () => {
    expect(isWeeklyActivity({ ...valid, activeDays: 1.5 })).toBe(false);
  });

  it("rejects negative contributionCount", () => {
    expect(isWeeklyActivity({ ...valid, contributionCount: -3 })).toBe(false);
  });
});

// ─── isGardenEventType ────────────────────────────────────────────────────────

describe("isGardenEventType", () => {
  it.each([
    "PLANT_PLANTED",
    "PLANT_GREW",
    "PLANT_FLOWERED",
    "CREATURE_UNLOCKED",
    "DECORATION_UNLOCKED",
    "STREAK_MILESTONE_REACHED",
    "GARDEN_RECOVERED",
    "NEW_WEEK_STARTED",
  ])("accepts %s", (t) => {
    expect(isGardenEventType(t)).toBe(true);
  });

  it("rejects unknown event types", () => {
    expect(isGardenEventType("PLANT_DIED")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isGardenEventType(null)).toBe(false);
  });
});

// ─── isGardenEvent ────────────────────────────────────────────────────────────

describe("isGardenEvent", () => {
  const validEvent: GardenEvent = {
    type: "PLANT_PLANTED",
    plantId: "plant-1",
    speciesId: "oak",
    originWeek: 1,
    occurredAt: "2024-03-04T10:00:00.000Z",
  };

  it("accepts a valid GardenEvent", () => {
    expect(isGardenEvent(validEvent)).toBe(true);
  });

  it("accepts any valid event type with a timestamp", () => {
    const milestone: GardenEvent = {
      type: "STREAK_MILESTONE_REACHED",
      milestone: 8,
      occurredAt: "2024-05-01T00:00:00.000Z",
    };
    expect(isGardenEvent(milestone)).toBe(true);
  });

  it("rejects an event with an unknown type", () => {
    expect(
      isGardenEvent({ type: "UNKNOWN", occurredAt: "2024-03-04T10:00:00Z" }),
    ).toBe(false);
  });

  it("rejects an event with a missing occurredAt", () => {
    const { occurredAt: _oa, ...rest } = validEvent;
    expect(isGardenEvent(rest)).toBe(false);
  });

  it("rejects an event with an invalid timestamp", () => {
    expect(
      isGardenEvent({ ...validEvent, occurredAt: "not-a-date" }),
    ).toBe(false);
  });

  it("rejects null", () => {
    expect(isGardenEvent(null)).toBe(false);
  });
});

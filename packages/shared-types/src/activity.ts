/**
 * Activity types.
 *
 * Raw GitHub contribution data is normalised into DailyActivity records
 * first, then aggregated into WeeklyActivity records.  The garden engine
 * operates exclusively on WeeklyActivity — it never touches raw API shapes.
 */

/**
 * A single calendar day of GitHub activity.
 *
 * `date`              — ISO-8601 calendar date (YYYY-MM-DD, no time component).
 * `contributionCount` — total contributions recorded by GitHub for this day.
 * `hasActivity`       — convenience flag; true when contributionCount > 0.
 */
export type DailyActivity = {
  date: string;            // YYYY-MM-DD
  contributionCount: number;
  hasActivity: boolean;
};

/**
 * A calendar week of aggregated GitHub activity.
 *
 * `weekStart` / `weekEnd` — ISO-8601 dates (YYYY-MM-DD) for Monday and Sunday.
 * `activeDays`            — number of days in the week that had activity.
 * `contributionCount`     — total contributions across all days in the week.
 * `isActive`              — true when the week meets the "active week" threshold
 *                           defined by the garden engine's progression config.
 *                           Stored here so consumers don't need to re-evaluate
 *                           the threshold.
 */
export type WeeklyActivity = {
  weekStart: string;       // YYYY-MM-DD (Monday)
  weekEnd: string;         // YYYY-MM-DD (Sunday)
  activeDays: number;
  contributionCount: number;
  isActive: boolean;
};

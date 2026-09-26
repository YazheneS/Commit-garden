import type { GardenEvent } from "@commit-garden/shared-types";

export const DEFAULT_PROGRESSION_MILESTONES = [
  1, 5, 8, 12, 16, 20, 26, 52,
] as const;

export type NextMilestoneInfo = {
  readonly targetWeek: number;
  readonly weeksRemaining: number;
  readonly progressRatio: number;
  readonly label: string;
};

export type FormattedEventInfo = {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
};

export function formatStreak(
  currentStreak: number,
  longestStreak?: number,
): string {
  if (currentStreak <= 0) {
    return longestStreak && longestStreak > 0
      ? `0 weeks (best: ${longestStreak}w)`
      : "0 active weeks";
  }
  return `🔥 ${currentStreak} ${currentStreak === 1 ? "week" : "weeks"}`;
}

export function formatActiveWeeks(activeWeeks: number): string {
  return `${activeWeeks} active ${activeWeeks === 1 ? "week" : "weeks"}`;
}

export function calculateNextMilestone(
  activeWeeks: number,
  milestones: readonly number[] = DEFAULT_PROGRESSION_MILESTONES,
): NextMilestoneInfo {
  const sorted = [...milestones].sort((a, b) => a - b);
  const targetWeek = sorted.find((milestone) => milestone > activeWeeks);
  if (targetWeek === undefined) {
    const finalMilestone = sorted[sorted.length - 1] ?? 52;
    return {
      targetWeek: finalMilestone,
      weeksRemaining: 0,
      progressRatio: 1,
      label: "All progression milestones achieved! 🎉",
    };
  }

  const targetIndex = sorted.indexOf(targetWeek);
  const previousWeek = sorted[targetIndex - 1] ?? 0;
  const span = targetWeek - previousWeek;
  const weeksRemaining = targetWeek - activeWeeks;
  const progressRatio =
    span > 0
      ? Math.min(1, Math.max(0, (activeWeeks - previousWeek) / span))
      : 0;
  return {
    targetWeek,
    weeksRemaining,
    progressRatio,
    label: `${weeksRemaining} ${weeksRemaining === 1 ? "week" : "weeks"} until Week ${targetWeek} milestone`,
  };
}

export function formatGardenEvent(
  event: GardenEvent | string | null | undefined,
): FormattedEventInfo | null {
  if (!event) return null;
  if (typeof event === "string") {
    return { title: "Garden Update", description: event, icon: "🌱" };
  }

  switch (event.type) {
    case "PLANT_PLANTED":
      return {
        title: "Seed Planted",
        description: `Planted new ${event.speciesId} in your garden`,
        icon: "🌱",
      };
    case "PLANT_GREW":
      return {
        title: "Plant Grew",
        description: `Advanced to ${event.newStage.toLowerCase()} stage`,
        icon: "🌿",
      };
    case "PLANT_FLOWERED":
      return {
        title: "Bloomed!",
        description: "Your plant has blossomed with vibrant flowers",
        icon: "🌸",
      };
    case "CREATURE_UNLOCKED":
      return {
        title: "Creature Discovered",
        description: `A wild ${event.creatureId} entered your garden`,
        icon: "🦋",
      };
    case "DECORATION_UNLOCKED":
      return {
        title: "Decoration Unlocked",
        description: `Unlocked ${event.decorationId} for your garden`,
        icon: "✨",
      };
    case "STREAK_MILESTONE_REACHED":
      return {
        title: "Streak Milestone!",
        description: `Reached a sustained streak of ${event.milestone} active weeks`,
        icon: "🔥",
      };
    case "GARDEN_RECOVERED":
      return {
        title: "Garden Recovered",
        description:
          "Consistency returned and your ecosystem is flourishing again",
        icon: "💚",
      };
    case "NEW_WEEK_STARTED":
      return {
        title: "New Week",
        description: `Week starting ${event.weekStart} has begun`,
        icon: "📅",
      };
  }
}

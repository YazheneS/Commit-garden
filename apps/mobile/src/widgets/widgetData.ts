import { buildRenderState } from "@commit-garden/garden-renderer";
import type { Plant } from "@commit-garden/shared-types";

export type GardenWidgetSnapshot = {
  readonly hasGarden: boolean;
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number | null;
  readonly gardenRows: readonly string[];
};

export function makeGardenWidgetSnapshot(
  plants: readonly Plant[] | null,
  progress: {
    readonly currentStreak: number;
    readonly activeWeeks: number;
    readonly nextMilestone: number | null;
  } | null,
): GardenWidgetSnapshot {
  if (!plants || !progress) {
    return {
      hasGarden: false,
      currentStreak: 0,
      activeWeeks: 0,
      nextMilestone: 1,
      gardenRows: ["· · · · ·", "· · · · ·", "· · · · ·"],
    };
  }
  const renderState = buildRenderState(plants, { gridWidth: 10, gridHeight: 7 });
  const rows = Array.from({ length: renderState.gridHeight }, () =>
    Array.from({ length: renderState.gridWidth }, () => "·"),
  );
  for (const plant of renderState.plants) {
    const glyph = plant.speciesId === "flower"
      ? "✿"
      : plant.speciesId === "mushroom"
        ? "◈"
        : plant.speciesId === "cherry"
          ? "❀"
          : plant.growthStage === "SEED"
            ? "•"
            : "♣";
    const row = rows[plant.row];
    if (row && plant.col >= 0 && plant.col < row.length) row[plant.col] = glyph;
  }
  return {
    hasGarden: true,
    currentStreak: progress.currentStreak,
    activeWeeks: progress.activeWeeks,
    nextMilestone: progress.nextMilestone,
    gardenRows: rows.map((row) => row.join(" ")),
  };
}

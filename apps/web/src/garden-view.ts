import { buildRenderState } from "@commit-garden/garden-renderer";
import type { Plant } from "@commit-garden/shared-types";
import type { GardenRenderState } from "@commit-garden/garden-renderer";

const GARDEN_GRID = { gridWidth: 10, gridHeight: 7 } as const;

/** Map canonical API plants into the shared renderer's view model. */
export function createGardenRenderState(
  plants: readonly Plant[],
): GardenRenderState {
  return buildRenderState(plants, GARDEN_GRID);
}

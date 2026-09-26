/**
 * Mock garden fixture
 *
 * A pre-built GardenRenderState for use in:
 *   - Unit and integration tests
 *   - Storybook / design-system previews
 *   - Initial UI scaffolding before real API data is wired up
 *
 * Represents a 10×6 garden with a handful of plants at various stages.
 */

import { buildRenderState } from "./render-state.js";
import type { GardenRenderState } from "./types.js";
import type { PlantLike } from "./render-state.js";

const MOCK_PLANTS: PlantLike[] = [
  {
    id: "mock-plant-1",
    speciesId: "oak",
    growthStage: "MATURE",
    health: "HEALTHY",
    position: { x: 1, y: 1 },
  },
  {
    id: "mock-plant-2",
    speciesId: "cherry",
    growthStage: "FLOWERING",
    health: "HEALTHY",
    position: { x: 4, y: 0 },
  },
  {
    id: "mock-plant-3",
    speciesId: "flower",
    growthStage: "SPROUT",
    health: "RECOVERING",
    position: { x: 7, y: 2 },
  },
  {
    id: "mock-plant-4",
    speciesId: "mushroom",
    growthStage: "SEED",
    health: "HEALTHY",
    position: { x: 2, y: 4 },
  },
  {
    id: "mock-plant-5",
    speciesId: "cactus",
    growthStage: "YOUNG",
    health: "WILTED",
    position: { x: 8, y: 3 },
  },
  {
    id: "mock-plant-6",
    speciesId: "oak",
    growthStage: "SPECIAL",
    health: "HEALTHY",
    position: { x: 5, y: 5 },
  },
];

/**
 * A ready-to-render mock GardenRenderState.
 * Frozen to prevent accidental mutation in tests.
 */
export const MOCK_GARDEN_STATE: GardenRenderState = buildRenderState(
  MOCK_PLANTS,
  {
    gridWidth: 10,
    gridHeight: 6,
    tileOverrides: [
      { col: 0, row: 5, variant: "WATER" },
      { col: 1, row: 5, variant: "WATER" },
      { col: 9, row: 0, variant: "STONE" },
    ],
  },
);

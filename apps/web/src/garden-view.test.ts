import { describe, expect, it } from "vitest";
import type { Plant } from "@commit-garden/shared-types";
import { createGardenRenderState } from "./garden-view.js";

const apiPlant: Plant = {
  id: "plant-api-1",
  gardenId: "garden-api-1",
  speciesId: "cherry",
  growthStage: "FLOWERING",
  position: { x: 4, y: 2 },
  health: "HEALTHY",
  plantedAt: "2026-09-01T00:00:00.000Z",
  originWeek: 8,
  metadata: {},
};

describe("web garden rendering", () => {
  it("renders an empty renderer scene without inventing a garden", () => {
    const state = createGardenRenderState([]);

    expect(state.plants).toEqual([]);
    expect(state.terrain).toHaveLength(state.gridWidth * state.gridHeight);
  });

  it("passes canonical API plants through the shared render-state builder", () => {
    const state = createGardenRenderState([apiPlant]);

    expect(state.plants).toHaveLength(1);
    expect(state.plants[0]).toMatchObject({
      id: "plant-api-1",
      speciesId: "cherry",
      growthStage: "FLOWERING",
      col: 4,
      row: 2,
    });
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MOCK_GARDEN_STATE, getPlantSprite, renderPixelGardenHtml, selectSpriteFrame } from "./index.js";

describe("pixel garden scene", () => {
  it("renders terrain, stable plant assets, and growth states", () => {
    const html = renderPixelGardenHtml(MOCK_GARDEN_STATE, { zoom: 1.5 });

    expect(html).toContain('aria-label="Pixel-art garden"');
    expect(html).toContain("pixel-tile-grass");
    expect(html).toContain('data-asset="oak.MATURE"');
    expect(html).toContain('data-asset="cherry.FLOWERING"');
    expect(html).toContain("scale(1.5)");
    expect(html).toContain("pixel-scene-animated");
    expect(html).toContain("background-image:url('/assets/plants.png')");
    expect(html).toContain("background-image:url('/assets/terrain.png')");
    expect(html).not.toContain("clip-path");
    expect(html).not.toContain("--plant-pattern");
  });

  it("selects the registered species, stage, and health frame deterministically", () => {
    const healthy = getPlantSprite({ speciesId: "oak", growthStage: "MATURE", health: "HEALTHY" });
    const wilted = getPlantSprite({ speciesId: "oak", growthStage: "MATURE", health: "WILTED" });
    const healthyFrame = healthy && selectSpriteFrame(healthy);
    const wiltedFrame = wilted && selectSpriteFrame(wilted);
    expect(healthyFrame?.frame).toBe(3);
    expect(wiltedFrame?.frame).toBe(9);
    expect(wiltedFrame?.url).toBe("/assets/plants.png");
    expect(wiltedFrame).not.toEqual(healthyFrame);
    const seedFrame = getPlantSprite({ speciesId: "mushroom", growthStage: "SEED", health: "HEALTHY" });
    const seedHtml = renderPixelGardenHtml({ ...MOCK_GARDEN_STATE, plants: MOCK_GARDEN_STATE.plants.filter((plant) => plant.speciesId === "mushroom") });
    expect(seedFrame?.frame).toBe(40);
    expect(seedHtml).toContain("background-position:-264px -80px");
  });

  it("uses stable render-state positions and applies camera transforms", () => {
    const defaultView = renderPixelGardenHtml(MOCK_GARDEN_STATE, { animate: false });
    const repeatedView = renderPixelGardenHtml(MOCK_GARDEN_STATE, { animate: false });
    const pannedView = renderPixelGardenHtml(MOCK_GARDEN_STATE, {
      animate: false,
      camera: { offsetX: 12, offsetY: 7, zoom: 2 },
    });
    expect(repeatedView).toBe(defaultView);
    expect(defaultView).toContain('data-asset="oak.MATURE"');
    expect(pannedView).toContain("transform:translate(-24px,-14px) scale(2)");
    expect(pannedView).toContain('data-asset="oak.MATURE"');
  });

  it("keeps garden progression, streaks, and GitHub rules outside the renderer", () => {
    const source = readFileSync(new URL("./pixel-scene.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/@commit-garden\/(garden-engine|github-client)/);
    expect(source).not.toMatch(/streak|progression|contribution|commit history/i);
  });

  it("supports a static, responsive scene for reduced motion", () => {
    const html = renderPixelGardenHtml(MOCK_GARDEN_STATE, {
      animate: false,
      className: "compact-garden",
    });

    expect(html).toContain("compact-garden");
    expect(html).not.toContain('class="pixel-scene pixel-scene-animated');
    expect(html).toContain("@media (max-width:600px)");
  });
});

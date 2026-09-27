import { getPlantSprite, getTileSprite } from "./sprites.js";
import type { CameraState } from "./camera.js";
import type { GardenRenderState, RenderPlant, TerrainTile } from "./types.js";

export type PixelSceneOptions = {
  readonly zoom?: number;
  readonly animate?: boolean;
  readonly className?: string;
  readonly camera?: CameraState;
};

const SHEET_URL: Readonly<Record<string, string>> = {
  "plants.png": "/assets/plants.png",
  "terrain.png": "/assets/terrain.png",
};
const PLANT_CELL = 32;
const PLANT_COLUMNS = 16;
const PLANT_ROWS = 6;
const TILE_CELL = 16;
const TILE_COLUMNS = 5;

export type SpriteFrameSelection = {
  readonly url: string;
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
};

export function selectSpriteFrame(sprite: { spriteSheet: string; frame: number; width: number; height: number }): SpriteFrameSelection | undefined {
  const url = SHEET_URL[sprite.spriteSheet];
  if (!url) return undefined;
  const plant = sprite.spriteSheet === "plants.png";
  const cell = plant ? PLANT_CELL : TILE_CELL;
  const columns = plant ? PLANT_COLUMNS : TILE_COLUMNS;
  return {
    url,
    frame: sprite.frame,
    x: (sprite.frame % columns) * cell,
    y: Math.floor(sprite.frame / columns) * cell,
    sheetWidth: columns * cell,
    sheetHeight: (plant ? PLANT_ROWS : 1) * cell,
  };
}

export function renderPixelGardenHtml(state: GardenRenderState, options: PixelSceneOptions = {}): string {
  const zoom = options.camera?.zoom ?? options.zoom ?? 1;
  const offsetX = options.camera?.offsetX ?? 0;
  const offsetY = options.camera?.offsetY ?? 0;
  const animationClass = options.animate === false ? "" : " pixel-scene-animated";
  const className = options.className ? ` ${escapeHtml(options.className)}` : "";
  const width = state.gridWidth * 16;
  const height = state.gridHeight * 16;
  const terrain = state.terrain.map(renderTerrainTile).join("");
  const plants = state.plants.map(renderPlant).join("");
  const creatures = (state.creatures ?? []).map((creature) =>
    `<span class="pixel-creature pixel-creature-${creature.kind.toLowerCase()}" style="left:${creature.worldX}px;top:${creature.worldY}px;opacity:${creature.alpha}" data-asset="${escapeHtml(creature.assetKey)}"></span>`,
  ).join("");
  return `<div class="pixel-scene${animationClass}${className}" style="--pixel-width:${width}px;--pixel-height:${height}px" role="img" aria-label="Pixel-art garden"><div class="pixel-scene-world" style="width:${width}px;height:${height}px;transform:translate(${-offsetX * zoom}px,${-offsetY * zoom}px) scale(${zoom})"><div class="pixel-terrain">${terrain}</div><div class="pixel-plants">${plants}</div><div class="pixel-creatures">${creatures}</div></div></div>${PIXEL_SCENE_STYLES}`;
}

function renderTerrainTile(tile: TerrainTile): string {
  const sprite = getTileSprite(tile);
  const frame = sprite && selectSpriteFrame(sprite);
  const style = frame
    ? `left:${tile.worldX}px;top:${tile.worldY}px;width:16px;height:16px;background-image:url('${frame.url}');background-size:${frame.sheetWidth}px ${frame.sheetHeight}px;background-position:-${frame.x}px -${frame.y}px`
    : `left:${tile.worldX}px;top:${tile.worldY}px`;
  return `<span class="pixel-tile pixel-tile-${tile.variant.toLowerCase()}" style="${style}" data-asset="tile.${tile.variant}"></span>`;
}

function renderPlant(plant: RenderPlant): string {
  const sprite = getPlantSprite(plant);
  const frame = sprite && selectSpriteFrame(sprite);
  const width = sprite?.width ?? 16;
  const height = sprite?.height ?? 16;
  const style = frame
    ? `left:${plant.worldX - width / 2}px;top:${plant.worldY - height}px;width:${width}px;height:${height}px;background-image:url('${frame.url}');background-size:${frame.sheetWidth}px ${frame.sheetHeight}px;background-position:-${frame.x + (PLANT_CELL - width) / 2}px -${frame.y + PLANT_CELL - height}px`
    : `left:${plant.worldX - width / 2}px;top:${plant.worldY - height}px;width:${width}px;height:${height}px`;
  const healthClass = ` pixel-plant-${plant.health.toLowerCase()}`;
  return `<span class="pixel-plant pixel-plant-${plant.growthStage.toLowerCase()}${healthClass}" style="${style}" data-asset="${escapeHtml(plant.assetKey)}" data-frame="${frame?.frame ?? "fallback"}" title="${escapeHtml(`${plant.speciesId} ${plant.growthStage.toLowerCase()}`)}"></span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

const PIXEL_SCENE_STYLES = `<style>.pixel-scene{position:relative;display:block;width:100%;height:100%;overflow:hidden;image-rendering:pixelated;touch-action:none}.pixel-scene-world{position:absolute;left:0;top:0;transform-origin:top left;image-rendering:pixelated}.pixel-terrain,.pixel-plants,.pixel-creatures{position:absolute;inset:0}.pixel-tile,.pixel-plant,.pixel-creature{position:absolute;display:block;image-rendering:pixelated;background-repeat:no-repeat}.pixel-tile{z-index:0}.pixel-plant{z-index:2}.pixel-creature{z-index:3;width:6px;height:6px;background:#f5d86b;box-shadow:4px 0 #f5d86b,0 4px #f5d86b,4px 4px #f5d86b}.pixel-creature-butterfly{background:#d17fa6;box-shadow:-4px 0 #d17fa6,4px 0 #d17fa6,0 4px #5f83b5}.pixel-scene-animated .pixel-plant-mature,.pixel-scene-animated .pixel-plant-flowering{animation:pixel-sway 2.8s steps(2,end) infinite}.pixel-scene-animated .pixel-creature{animation:pixel-float 2.2s steps(3,end) infinite}@keyframes pixel-sway{50%{transform:translateX(1px)}}@keyframes pixel-float{50%{transform:translate(3px,-3px)}}@media (max-width:600px){.pixel-scene{min-height:160px}}</style>`;

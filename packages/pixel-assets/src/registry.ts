/**
 * Sprite Registry
 *
 * Central asset registry for sprite metadata, animation manifests, and plant-state sprites.
 * Applications reference registered asset keys rather than direct file paths.
 */

import type { GrowthStage, PlantHealthState } from "@commit-garden/shared-types";
import { BUILTIN_SPRITES } from "./manifest.js";
import type { SpriteMetadata, SpriteType } from "./types.js";

// ─── Key Formatters ───────────────────────────────────────────────────────────

/**
 * Formats a plant asset key conforming to the established "{speciesId}.{growthStage}" format.
 */
export function formatPlantAssetKey(
  speciesId: string,
  growthStage: GrowthStage | string,
): string {
  return `${speciesId}.${growthStage}`;
}

/**
 * Formats a plant health variant asset key: "{speciesId}.{growthStage}.{health}".
 */
export function formatPlantHealthAssetKey(
  speciesId: string,
  growthStage: GrowthStage | string,
  health: PlantHealthState | string,
): string {
  return `${speciesId}.${growthStage}.${health}`;
}

// ─── Sprite Registry Class ────────────────────────────────────────────────────

export class SpriteRegistry {
  private readonly sprites = new Map<string, SpriteMetadata>();

  public constructor(initialSprites: readonly SpriteMetadata[] = BUILTIN_SPRITES) {
    this.registerMany(initialSprites);
  }

  /**
   * Registers a single sprite. Overwrites any existing sprite with the same ID.
   */
  public register(sprite: SpriteMetadata): void {
    this.sprites.set(sprite.id, sprite);
  }

  /**
   * Registers multiple sprites in batch.
   */
  public registerMany(sprites: readonly SpriteMetadata[]): void {
    for (const sprite of sprites) {
      this.sprites.set(sprite.id, sprite);
    }
  }

  /**
   * Retrieves a sprite by its asset ID.
   */
  public get(id: string): SpriteMetadata | undefined {
    return this.sprites.get(id);
  }

  /**
   * Checks whether a sprite with the given asset ID exists.
   */
  public has(id: string): boolean {
    return this.sprites.has(id);
  }

  /**
   * Returns all registered sprites, sorted by ID for determinism.
   */
  public getAll(): SpriteMetadata[] {
    return [...this.sprites.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Returns all sprites matching the given category/type.
   */
  public getByType(type: SpriteType): SpriteMetadata[] {
    return this.getAll().filter((s) => s.type === type);
  }

  /**
   * Resolves the appropriate sprite for a plant given its species, growth stage, and optional health.
   *
   * Resolution hierarchy:
   *   1. If health is specified and not "HEALTHY", checks for "{speciesId}.{growthStage}.{health}"
   *   2. Standard base asset key: "{speciesId}.{growthStage}"
   *   3. Safe fallback: "{speciesId}.SEED"
   *   4. undefined if no matching sprite exists
   */
  public resolvePlantSprite(
    speciesId: string,
    growthStage: GrowthStage | string,
    health?: PlantHealthState | string,
  ): SpriteMetadata | undefined {
    // 1. Check health variant if not healthy
    if (health && health !== "HEALTHY") {
      const healthKey = formatPlantHealthAssetKey(speciesId, growthStage, health);
      const healthSprite = this.sprites.get(healthKey);
      if (healthSprite) {
        return healthSprite;
      }
    }

    // 2. Check base stage
    const baseKey = formatPlantAssetKey(speciesId, growthStage);
    const baseSprite = this.sprites.get(baseKey);
    if (baseSprite) {
      return baseSprite;
    }

    // 3. Fallback to SEED
    const seedKey = formatPlantAssetKey(speciesId, "SEED");
    const seedSprite = this.sprites.get(seedKey);
    if (seedSprite) {
      return seedSprite;
    }

    return undefined;
  }

  /**
   * Clears all registered sprites.
   */
  public clear(): void {
    this.sprites.clear();
  }

  /**
   * Resets the registry to only include the built-in asset manifest.
   */
  public reset(): void {
    this.sprites.clear();
    this.registerMany(BUILTIN_SPRITES);
  }
}

// ─── Default Singleton Registry & Functions ───────────────────────────────────

const defaultRegistry = new SpriteRegistry();

/**
 * Creates a new isolated SpriteRegistry instance (useful for testing or custom packs).
 */
export function createSpriteRegistry(
  initialSprites?: readonly SpriteMetadata[],
): SpriteRegistry {
  return new SpriteRegistry(initialSprites);
}

/**
 * Registers a sprite with the global sprite registry.
 */
export function registerSprite(sprite: SpriteMetadata): void {
  defaultRegistry.register(sprite);
}

/**
 * Registers multiple sprites with the global sprite registry.
 */
export function registerSprites(sprites: readonly SpriteMetadata[]): void {
  defaultRegistry.registerMany(sprites);
}

/**
 * Looks up a sprite by its asset ID from the global registry.
 */
export function getSprite(id: string): SpriteMetadata | undefined {
  return defaultRegistry.get(id);
}

/**
 * Checks whether a sprite exists in the global registry.
 */
export function hasSprite(id: string): boolean {
  return defaultRegistry.has(id);
}

/**
 * Returns all sprites in the global registry.
 */
export function getAllSprites(): SpriteMetadata[] {
  return defaultRegistry.getAll();
}

/**
 * Returns all sprites of a specific category from the global registry.
 */
export function getSpritesByType(type: SpriteType): SpriteMetadata[] {
  return defaultRegistry.getByType(type);
}

/**
 * Resolves the active sprite metadata for a plant state from the global registry.
 */
export function resolvePlantSprite(
  speciesId: string,
  growthStage: GrowthStage | string,
  health?: PlantHealthState | string,
): SpriteMetadata | undefined {
  return defaultRegistry.resolvePlantSprite(speciesId, growthStage, health);
}

/**
 * Resets the global sprite registry to its default built-in manifest.
 */
export function resetSpriteRegistry(): void {
  defaultRegistry.reset();
}

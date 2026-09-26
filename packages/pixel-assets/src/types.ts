/**
 * Sprite system types
 *
 * Defines sprite metadata, animation frame contracts, and asset registry shapes.
 * Applications reference asset IDs and sprite metadata rather than file paths.
 */

import type { GrowthStage, PlantHealthState } from "@commit-garden/shared-types";

// ─── Sprite Categories ────────────────────────────────────────────────────────

export type SpriteType =
  | "plant"
  | "tile"
  | "creature"
  | "decoration"
  | "effect";

// ─── Anchor / Pivot ───────────────────────────────────────────────────────────

export type SpriteAnchor = {
  /** Normalized horizontal anchor point: 0.0 = left, 0.5 = center, 1.0 = right */
  readonly x: number;
  /** Normalized vertical anchor point: 0.0 = top, 0.5 = center, 1.0 = bottom */
  readonly y: number;
};

// ─── Animation Frames ─────────────────────────────────────────────────────────

export type AnimationFrame = {
  /** 0-based frame index within the sprite sheet */
  readonly frame: number;
  /** Duration of this frame in milliseconds */
  readonly durationMs: number;
};

export type SpriteAnimation = {
  /** Unique animation name (e.g. "idle", "sway", "fly", "glow") */
  readonly name: string;
  /** Ordered list of animation frames */
  readonly frames: readonly AnimationFrame[];
  /** Total duration of one complete cycle in milliseconds */
  readonly totalDurationMs: number;
  /** Whether the animation loops continuously (default: true) */
  readonly loop?: boolean | undefined;
};

// ─── Sprite Metadata ──────────────────────────────────────────────────────────

export type SpriteMetadata = {
  /** Unique asset/sprite ID, e.g. "oak.MATURE", "tile.GRASS", "butterfly.idle" */
  readonly id: string;
  /** Category of this sprite */
  readonly type: SpriteType;
  /** Sprite sheet identifier or filename (e.g. "plants.png", "terrain.png") */
  readonly spriteSheet: string;
  /** Default frame index (0-based) within the sprite sheet */
  readonly frame: number;
  /** Pixel width of the sprite frame */
  readonly width: number;
  /** Pixel height of the sprite frame */
  readonly height: number;
  /** Optional source x coordinate in the sprite sheet */
  readonly sourceX?: number | undefined;
  /** Optional source y coordinate in the sprite sheet */
  readonly sourceY?: number | undefined;
  /** Optional anchor/pivot point (default: { x: 0.5, y: 1.0 } for plants, { x: 0, y: 0 } for tiles) */
  readonly anchor?: SpriteAnchor | undefined;
  /** Optional animation definitions for this sprite */
  readonly animations?: Readonly<Record<string, SpriteAnimation>> | undefined;
  /** Optional extensible metadata */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
};

// ─── Specialized Plant Sprite Metadata ────────────────────────────────────────

export type PlantSpriteMetadata = SpriteMetadata & {
  readonly type: "plant";
  readonly speciesId: string;
  readonly growthStage: GrowthStage;
  readonly health?: PlantHealthState | undefined;
};

// ─── Specialized Tile Sprite Metadata ─────────────────────────────────────────

export type TileSpriteMetadata = SpriteMetadata & {
  readonly type: "tile";
  readonly variant: string;
};

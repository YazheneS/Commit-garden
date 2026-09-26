# GitHub Garden — Handover Document

**Date:** 2026-09-26
**Phase completed:** Phase 0 (Repository Foundation) + Phase 1 (Garden Engine) + Phase 2 partial (TASK-010 through TASK-012)
**Tasks completed:** TASK-001 through TASK-012 (12 of 43)
**Test suite:** 362 tests passing across 16 test files, 0 failures

---

## 1. Repository overview

The workspace is a **pnpm monorepo** at `c:\Users\YAZHENE\Documents\GitHub\Commit-garden`.

```
apps/
  web/          Next.js web application (scaffold only)
  desktop/      Tauri desktop companion (scaffold only)
  mobile/       React Native / Expo mobile (scaffold only)

packages/
  shared-types/     All domain TypeScript contracts + runtime guards
  garden-engine/    Core domain logic — the source of truth
  garden-renderer/  Pixel-art render state, Camera, and Animation systems
  github-client/    GitHub API integration (scaffold only)
  design-system/    Shared UI components (scaffold only)
  pixel-assets/     Sprite sheets, animation frames, and asset manifests

services/
  api/          Backend REST service (scaffold only)

database/
  migrations/   SQL migrations (empty, TASK-014)
  seeds/        Seed data (empty, TASK-014)

docs/
  PRD.md            Product Requirements Document
  ARCHITECTURE.md   System architecture
  AGENTS.md         Agent coding instructions
  TASKS.md          Full task list (43 tasks)
  HANDOVER.md       This document
```

---

## 2. Tooling & configuration

| Tool | Version pinned | Config file |
|---|---|---|
| pnpm | ≥ 9 (workspace) | `pnpm-workspace.yaml` |
| Node.js | ≥ 20 | `package.json` engines |
| TypeScript | ^5.7 | `tsconfig.base.json` |
| ESLint | ^9.25 | `eslint.config.js` (flat config) |
| Vitest | ^2.1 | `vitest.config.ts` |
| GitHub Actions CI | — | `.github/workflows/ci.yml` |

**TypeScript settings** (`tsconfig.base.json`):
- `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- `module: NodeNext`, `moduleResolution: NodeNext`
- All packages use `composite: true` project references

**ESLint rules in force:**
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-floating-promises: error`
- `@typescript-eslint/consistent-type-imports: error`
- `@typescript-eslint/no-unused-vars: error`
- `prefer-const: error`

**pnpm workspace notes:**
- `allowBuilds.esbuild: true` is set in `pnpm-workspace.yaml` (required by pnpm 11 for esbuild's native binary)
- ESLint uses `projectService` with `allowDefaultProject: ["*.ts"]` and `defaultProject: ./tsconfig.node.json` to handle root config files

---

## 3. Commands

```bash
pnpm install          # install all workspace dependencies
pnpm typecheck        # tsc --build --force across all project references
pnpm lint             # eslint . (slow ~90s due to typed rules on full project)
pnpm test             # vitest run (all packages, single pass)
pnpm test:watch       # vitest (watch mode)
pnpm clean            # tsc --build --clean
```

---

## 4. Completed tasks

### TASK-001 — Repository Bootstrap ✅

**What was built:**
- Full pnpm monorepo directory structure
- `pnpm-workspace.yaml` declaring all workspace packages
- Root `package.json` with `lint`, `typecheck`, `test`, `clean` scripts
- `tsconfig.base.json` (strict TS base), `tsconfig.json` (project references), `tsconfig.node.json` (root config files)
- `eslint.config.js` — flat ESLint config with typescript-eslint typed rules
- `vitest.config.ts` — root Vitest config, `passWithNoTests: true`
- `.env.example` — documents all required environment variables
- `.gitignore` — ignores `dist/`, `.env`, `*.tsbuildinfo`, etc.
- `README.md` — project overview and getting-started guide
- `.github/workflows/ci.yml` — GitHub Actions CI (install → typecheck → lint → test)
- Per-package `package.json` + `tsconfig.json` for all 10 workspace members
- Stub `src/index.ts` in every package
- `database/migrations/.gitkeep` and `database/seeds/.gitkeep`

**Acceptance criteria met:** install, typecheck, lint, test all exit 0.

---

### TASK-002 — Domain Types ✅

**Package:** `packages/shared-types`

**Files:**
- `src/user.ts` — `User`
- `src/garden.ts` — `Garden`, `GrowthStage`, `PlantHealthState`, `Plant`, `PlantPosition`, `PlantSpecies`
- `src/activity.ts` — `DailyActivity`, `WeeklyActivity`
- `src/events.ts` — `GardenEvent` (discriminated union of 8 subtypes), `GardenEventType`
- `src/achievement.ts` — `AchievementReward`, `AchievementDefinition`, `Achievement`
- `src/guards.ts` — runtime type guards for all key types
- `src/index.ts` — barrel re-export of all types and guards

**Key types:**

```ts
type GrowthStage = "SEED" | "SPROUT" | "YOUNG" | "MATURE" | "FLOWERING" | "SPECIAL";
type PlantHealthState = "HEALTHY" | "WILTED" | "DORMANT" | "RECOVERING";

type GardenEvent =
  | PlantPlantedEvent | PlantGrewEvent | PlantFloweredEvent
  | CreatureUnlockedEvent | DecorationUnlockedEvent
  | StreakMilestoneReachedEvent | GardenRecoveredEvent | NewWeekStartedEvent;

type AchievementReward =
  | { kind: "PLANT_SPECIES"; speciesId: string }
  | { kind: "CREATURE"; creatureId: string }
  | { kind: "DECORATION"; decorationId: string }
  | { kind: "NONE" };
```

**Runtime guards exported:** `isCalendarDate`, `isIsoTimestamp`, `isGrowthStage`, `isPlantHealthState`, `isDailyActivity`, `isWeeklyActivity`, `isGardenEventType`, `isGardenEvent`

**Tests:** 51 tests in `src/guards.test.ts`

---

### TASK-003 — Activity Normalizer ✅

**Package:** `packages/garden-engine`
**File:** `src/normalizer.ts`

**API:**
```ts
function normalizeActivity(
  days: readonly DailyActivity[],
  config?: Partial<NormalizerConfig>,
): WeeklyActivity[]

type NormalizerConfig = {
  activeWeekMinDays: number; // default: 1
}
```

**Behaviour:**
- Converts `DailyActivity[]` → `WeeklyActivity[]`
- Weeks are **Monday–Sunday** (ISO 8601)
- Sorts output oldest → newest
- Merges duplicate dates by summing `contributionCount`
- Configurable `activeWeekMinDays` threshold (default 1)
- No `new Date()` internally — pure function
- Does not fabricate gap weeks for missing activity periods

**Tests:** 23 tests in `src/normalizer.test.ts` (empty, single day Mon/Wed/Sun, full week, partial week, inactive, custom threshold, multi-week, input order independence, duplicate dates, year boundary, large gaps, contributionCount conservation)

---

### TASK-004 — Streak Engine ✅

**Package:** `packages/garden-engine`
**File:** `src/streak.ts`

**API:**
```ts
function calculateStreak(
  weeks: readonly WeeklyActivity[],
  opts: StreakOptions,
): StreakResult

type StreakOptions = { now: Date }

type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  totalActiveWeeks: number;
}
```

**Behaviour:**
- `currentStreak` — consecutive active weeks ending at the latest **completed** week
- An incomplete current week (`weekEnd > now`) is excluded so mid-week re-syncs don't reset the streak
- Detects gaps in input data (a missing week breaks the streak)
- `longestStreak` — all-time maximum run, scanned via a separate forward pass
- `totalActiveWeeks` — simple count, preserved across broken streaks
- Pure function — `now` is injected, no `Date.now()` internally

**Tests:** 19 tests in `src/streak.test.ts` (empty, all-inactive, single week, first week pre/post completion, consecutive, broken streak, historical multi-break, incomplete current week excluded then included, gap detection, recovery)

---

### TASK-005 — Plant Progression ✅

**Package:** `packages/garden-engine`
**File:** `src/progression.ts`

**API:**
```ts
// Stage navigation
function getNextStage(plant: Plant): GrowthStage | null
function canAdvance(plant: Plant): boolean
function advancePlantStage(plant: Plant): Plant   // throws if at final stage
function getStageIndex(plant: Plant): number
function isAtFinalStage(plant: Plant): boolean

// Health transitions
function applyStreakBreak(plant: Plant): Plant
function applyRecovery(plant: Plant): Plant

// Species registry
function getSpecies(id: string): PlantSpecies | undefined
function registerSpecies(species: PlantSpecies): void
function getAllSpecies(): PlantSpecies[]
```

**Built-in species (5):** `oak` (6 stages), `cherry` (5 stages), `mushroom` (4 stages), `cactus` (4 stages), `flower` (3 stages). All start at `SEED`.

**Health transition tables:**
```
Streak break:  HEALTHY → WILTED → DORMANT (floor, never destroyed)
               RECOVERING → WILTED
Recovery:      DORMANT → RECOVERING → HEALTHY
               WILTED → RECOVERING
```

All functions are **pure and immutable** — they return new Plant objects, never mutate.

**Tests:** 47 tests in `src/progression.test.ts`

---

### TASK-006 — Plant Generation ✅

**Package:** `packages/garden-engine`
**Files:** `src/prng.ts`, `src/generation.ts`

**PRNG (`src/prng.ts`):**
```ts
function createRng(seed: number): Rng
function seedFromString(key: string): number  // djb2 hash

type Rng = {
  next(): number        // float in [0, 1)
  nextInt(n: number): number  // integer in [0, n)
  pick<T>(arr: readonly T[]): T
}
```
Mulberry32 algorithm. Same seed always produces the same sequence.

**Generation (`src/generation.ts`):**
```ts
function generatePlants(
  gardenId: string,
  weeks: readonly WeeklyActivity[],
  existingPlants: readonly Plant[],
  config?: GenerationConfig,
): GenerationResult

type GenerationResult = {
  newPlants: Plant[];
  triggeredMilestones: number[];
}
```

**Default milestones (from PRD):** active weeks 1, 5, 8, 12, 16, 20, 26, 52

**Invariants:**
- **Deterministic:** same `gardenId` + same history → same plants
- **Idempotent:** running twice never creates duplicates (keyed by `originWeek`)
- **Configurable:** milestones live in `GenerationConfig`, not hard-coded
- Species selection seeded from `gardenId:originWeek` via `seedFromString`
- Plant positions left at `{x:0, y:0}` — placement is TASK-007's concern
- `speciesPool` per milestone optionally restricts eligible species

**Tests:** 14 PRNG tests + 23 generation tests

---

### TASK-007 — Garden Placement ✅

**Package:** `packages/garden-engine`
**File:** `src/placement.ts`

**API:**
```ts
function assignPlantPositions(
  gardenId: string,
  plants: readonly Plant[],
  config?: PlacementConfig,
): PlacementResult

type PlacementConfig = {
  gridWidth: number;         // default: 10
  gridHeight: number;        // default: 6
  reservedCells: readonly PlantPosition[];
}

type PlacementResult = {
  plants: Plant[];          // all placed plants, sorted by originWeek
  overflowPlants: Plant[];  // plants that couldn't fit (position = {x:-1, y:-1})
}

const OVERFLOW_POSITION: PlantPosition = { x: -1, y: -1 };
```

**Algorithm:** Fisher-Yates shuffle of free candidate cells, seeded from `gardenId:plantId:placement`. First shuffled free non-reserved cell wins.

**Invariants:**
- Plants with valid existing positions (`x >= 0, y >= 0`) are never moved (stability)
- No two plants occupy the same cell (collision avoidance)
- Reserved cells never assigned
- Grid overflow → `overflowPlants` (no crash)
- Deterministic: same garden + same plants → same layout
- Output sorted by `originWeek` ascending

**Tests:** 16 tests in `src/placement.test.ts`

---

### TASK-008 — Garden Events ✅

**Package:** `packages/garden-engine`
**File:** `src/events.ts`

**Event factories (8):**
```ts
makePlantPlantedEvent(plantId, speciesId, originWeek, ctx)
makePlantGrewEvent(plantId, previousStage, newStage, ctx)
makePlantFloweredEvent(plantId, ctx)
makeCreatureUnlockedEvent(creatureId, ctx)
makeDecorationUnlockedEvent(decorationId, ctx)
makeStreakMilestoneReachedEvent(milestone, ctx)
makeGardenRecoveredEvent(previousStreak, ctx)
makeNewWeekStartedEvent(weekStart, ctx)
```
All factories take `EventContext = { now: Date }` — never call `Date.now()` internally.

**`deriveEvents(before, after, ctx, opts)` — snapshot differ:**
```ts
type GardenSnapshot = {
  currentStreak: number;
  plants: readonly Plant[];
  newWeekStart?: string;
}
```
Produces events in documented order:
1. `NEW_WEEK_STARTED` (if `after.newWeekStart` set)
2. `PLANT_PLANTED` (plants in after but not before)
3. `PLANT_GREW` (plants with changed stage)
4. `PLANT_FLOWERED` (plants that reached FLOWERING)
5. `STREAK_MILESTONE_REACHED` (first milestone crossed this transition)
6. `GARDEN_RECOVERED` (streak 0 → >0 with existing plants)

**Default streak milestones:** `[1, 4, 8, 12, 16, 20, 26, 52]`

**Tests:** 32 tests in `src/events.test.ts`

---

### TASK-009 — Achievements ✅

**Package:** `packages/garden-engine`
**File:** `src/achievements.ts`

**API:**
```ts
function evaluateAchievements(
  totalActiveWeeks: number,
  gardenId: string,
  existingAchievements: readonly Achievement[],
  ctx: EvaluationContext,
  definitions?: readonly AchievementDefinition[],
): EvaluationResult

type EvaluationResult = {
  newlyEarned: Achievement[];
  unlockedRewards: AchievementReward[];
}

// Registry
function getAchievementDefinition(id: string): AchievementDefinition | undefined
function registerAchievementDefinition(def: AchievementDefinition): void
function getAllAchievementDefinitions(): AchievementDefinition[]  // sorted by threshold
```

**Built-in achievements (6):**

| id | Weeks | Reward |
|---|---|---|
| `first-week` | 1 | `PLANT_SPECIES: flower` |
| `one-month` | 4 | `PLANT_SPECIES: cherry` |
| `two-months` | 8 | `CREATURE: butterfly` |
| `three-months` | 12 | `PLANT_SPECIES: mushroom` |
| `six-months` | 26 | `DECORATION: garden-bench` |
| `one-year` | 52 | `DECORATION: garden-house` |

**Invariants:**
- Idempotent: re-running never re-awards an existing achievement
- `newlyEarned.length === unlockedRewards.length` always
- Custom `definitions` array overrides the registry (useful in tests)

**Tests:** 31 tests in `src/achievements.test.ts`

---

### TASK-010 — Renderer Prototype ✅

**Package:** `packages/garden-renderer`
**Files:** `src/types.ts`, `src/render-state.ts`, `src/camera.ts`, `src/mock.ts`

**Types (`src/types.ts`):**
```ts
const TILE_SIZE = 16; // pixels per grid cell

type TerrainTile = { col, row, variant, worldX, worldY }
type TileVariant = "GRASS" | "SOIL" | "PATH" | "WATER" | "STONE"

type RenderPlant = {
  id, speciesId, growthStage, health,
  col, row,
  worldX, worldY,   // centre of tile
  assetKey,         // e.g. "oak.MATURE"
}

type RenderEffect = { id, kind, worldX, worldY, ttlMs? }
type GardenRenderState = { gridWidth, gridHeight, terrain, plants, effects }
```

**`buildRenderState(plants, config, effects)` (`src/render-state.ts`):**
- Maps `PlantLike[]` (structural type — no engine import required) → `GardenRenderState`
- Generates terrain tiles (gridWidth × gridHeight), applying `tileOverrides`
- Excludes overflow plants (`position.x < 0`)
- Coerces unknown stage/health strings to safe defaults
- Sorts plants in painter's order (row asc, col asc)
- `assetKey = "{speciesId}.{growthStage}"`

**`Camera` (`src/camera.ts`):**
```ts
function createCamera(initial?, config?): Camera

// All methods are IMMUTABLE — return new Camera
camera.worldToScreen(point)   // world px → screen px
camera.screenToWorld(point)   // screen px → world px
camera.pan(dx, dy)
camera.zoomTo(newZoom, anchor?)  // anchor keeps world position fixed
camera.centreOn(worldPoint, viewport)
```
Zoom clamped to `[minZoom, maxZoom]` (default 0.5–4.0).

**`MOCK_GARDEN_STATE` (`src/mock.ts`):**
Pre-built 10×6 garden with 6 plants (oak/MATURE, cherry/FLOWERING, flower/SPROUT, mushroom/SEED, cactus/YOUNG, oak/SPECIAL) and tile overrides (WATER, STONE). Ready for use in tests and UI scaffolding.

**Tests:** 21 render-state tests + 26 camera tests

---

### TASK-011 — Sprite System ✅

**Packages:** `packages/pixel-assets`, `packages/garden-renderer`

**Files:**
- `packages/pixel-assets/src/types.ts` — `SpriteType`, `SpriteMetadata`, `AnimationFrame`, `SpriteAnimation`, `PlantSpriteMetadata`, `TileSpriteMetadata`
- `packages/pixel-assets/src/animation.ts` — `createAnimation`, `getAnimationFrame`, `getAnimationFrameIndex`
- `packages/pixel-assets/src/manifest.ts` — `BUILTIN_SPRITES`, `BUILTIN_PLANT_SPRITES`, `BUILTIN_TILE_SPRITES`, `BUILTIN_OTHER_SPRITES`
- `packages/pixel-assets/src/registry.ts` — `SpriteRegistry`, `resolvePlantSprite`, `getSprite`, `formatPlantAssetKey`
- `packages/garden-renderer/src/sprites.ts` — `getPlantSprite`, `getTileSprite`, `getSpriteForAssetKey`

**Behaviour:**
- Central asset registry mapping asset IDs (e.g. `oak.MATURE`, `tile.GRASS`, `creature.butterfly`) to frame metadata (`spriteSheet`, `frame`, `width`, `height`, anchor)
- Complete coverage for all 5 built-in plant species across all developmental stages (22 base stages) plus health state variants (`WILTED`, `DORMANT`)
- Pure, deterministic animation frame sampler (`getAnimationFrame`) handling looping and non-looping animations
- Decoupled lookup in `garden-renderer` resolving `RenderPlant` and `TerrainTile` directly to sprite assets

**Tests:** 54 tests across 4 test files (`pixel-assets/animation.test.ts` [12], `pixel-assets/manifest.test.ts` [7], `pixel-assets/registry.test.ts` [17], `garden-renderer/sprites.test.ts` [8])

---

### TASK-012 — Garden Animation ✅

**Package:** `packages/garden-renderer`

**Files:**
- `packages/garden-renderer/src/animation.ts` — `getDayNightState`, `samplePlantSway`, `createGrowthAnimation`, `sampleGrowthAnimation`, `createButterfly`, `createFirefly`, `sampleCreature`, `updateCreatures`
- `packages/garden-renderer/src/types.ts` — `TimeOfDay`, `DayNightState`, `CreatureKind`, `RenderCreature`, updated `GardenRenderState`
- `packages/garden-renderer/src/render-state.ts` — extended `buildRenderState` to accept `RenderOptions` (`creatures`, `dayNight`)

**Behaviour:**
- **Plant growth animation:** `createGrowthAnimation` / `sampleGrowthAnimation` computes smooth, lightweight scale and pop bounces when plants advance stages
- **Plant idle sway:** `samplePlantSway` provides gentle sinusoidal horizontal swaying for mature plants with position-derived phase offsets to avoid synchronous movement
- **Ambient creatures:** Butterflies flutter during daylight/dawn/dusk; fireflies drift with pulsing glow alpha at night
- **Day/night cycle:** `getDayNightState` maps 24-hour cycle to ambient light colors, intensity, and overlay tinting (`DAWN`, `DAY`, `DUSK`, `NIGHT`)
- Pure mathematical samplers with zero CPU/DOM rendering overhead

**Tests:** 15 tests in `packages/garden-renderer/src/animation.test.ts`

---

## 5. Architecture decisions made

| Decision | Rationale |
|---|---|
| All garden rules in `garden-engine` | Architecture requirement — no progression logic in UI or API |
| `now` always injected, never `new Date()` | Determinism in tests and synchronization |
| Weeks are Mon–Sun (ISO 8601) | Consistent across all timezones; UTC-only date arithmetic |
| Idempotency key = `(gardenId, originWeek)` | Prevents duplicate plants across repeated sync runs |
| Mulberry32 PRNG seeded from string keys | Fast, reproducible, no dependency on `Math.random()` |
| `PlantLike` structural type in renderer | Decouples `garden-renderer` from `garden-engine` imports |
| Camera immutable (returns new instance) | Safe to use in React state; no mutation bugs |
| `OVERFLOW_POSITION = {x:-1, y:-1}` sentinel | Graceful overflow without crashing; visible in debugging |
| Species stages data-driven per species | Allows mushroom/cactus/flower to have different paths from oak |
| Achievement rewards unlock visual content | Per PRD — not purely cosmetic badges |
| Asset key = `"{speciesId}.{growthStage}"` | Established format for sprite registry lookups with optional `.{health}` fallback |
| Pure mathematical animation samplers | Zero CPU overhead, no DOM/canvas coupling, easy to test |
| Position-derived phase offsets for sway | Prevents unnatural uniform swaying across neighboring plants |

---

## 6. What is NOT yet implemented

The following tasks remain from TASKS.md:

**Phase 2 — Pixel Garden (partial):**
- TASK-013 — Garden UI (garden screen with streak, active weeks, next milestone, recent event)

**Phase 3 — Backend:**
- TASK-014 — Database Schema (PostgreSQL tables: users, gardens, plants, events…)
- TASK-015 — API Foundation (authenticated REST endpoints)
- TASK-016 — Persistence and Sync (transactional updates, idempotent sync, versioning)

**Phase 4 — GitHub Integration:**
- TASK-017 — GitHub OAuth authentication
- TASK-018 — Contribution retrieval and normalization
- TASK-019 — GitHub sync pipeline (GitHub → normalizer → engine → database)
- TASK-020 — Historical import (first-connect backfill)

**Phase 5–10:** Web app, desktop companion, mobile app, widget, cross-device sync, offline mode, seasons, weather, creatures, developer objects, garden history, security review, performance, observability, E2E testing, release.

---

## 7. Test suite summary

| Package | Test file | Tests |
|---|---|---|
| `shared-types` | `guards.test.ts` | 51 |
| `garden-engine` | `normalizer.test.ts` | 23 |
| `garden-engine` | `streak.test.ts` | 19 |
| `garden-engine` | `progression.test.ts` | 47 |
| `garden-engine` | `prng.test.ts` | 14 |
| `garden-engine` | `generation.test.ts` | 23 |
| `garden-engine` | `placement.test.ts` | 16 |
| `garden-engine` | `events.test.ts` | 32 |
| `garden-engine` | `achievements.test.ts` | 31 |
| `garden-renderer` | `render-state.test.ts` | 21 |
| `garden-renderer` | `camera.test.ts` | 26 |
| `garden-renderer` | `sprites.test.ts` | 8 |
| `garden-renderer` | `animation.test.ts` | 15 |
| `pixel-assets` | `animation.test.ts` | 12 |
| `pixel-assets` | `manifest.test.ts` | 7 |
| `pixel-assets` | `registry.test.ts` | 17 |
| **Total** | **16 files** | **362** |

All 362 tests pass. Zero failures.

---

## 8. Recommended next steps

The natural continuation follows the task list in order:

1. **TASK-013 (Garden UI)** — connect the renderer to a web/desktop UI component, display mock data (streak, active weeks, next milestone, recent garden event).

2. **TASK-014 (Database Schema)** — PostgreSQL schema, migrations for relational persistence.

3. **TASK-015 (API Foundation)** — authenticated REST endpoints.

4. **TASK-016 (Persistence and Sync)** — transactional updates and idempotent sync.

5. **TASK-017 (GitHub Auth)** — GitHub OAuth in the API service. Unblocks TASK-018 and everything that follows.

The engine (TASK-002–009) is production-ready and fully tested. The renderer prototype (TASK-010) is headless and can be consumed by any UI framework. No task should need to revisit Phase 0 or Phase 1 unless a requirement changes.

---

## 9. Environment variables required

See `.env.example` in the repository root. Key variables:

```
GITHUB_CLIENT_ID        GitHub OAuth application client ID
GITHUB_CLIENT_SECRET    GitHub OAuth application client secret
DATABASE_URL            PostgreSQL connection string
SESSION_SECRET          JWT/session signing key (generate: openssl rand -base64 32)
NEXT_PUBLIC_API_URL     URL of the API service (used by the web app)
API_PORT / API_HOST     API service bind address
NODE_ENV                development | production
```

None of these are committed to the repository.

---

## 10. Known issues / watch-outs

| Issue | Notes |
|---|---|
| `pnpm lint` takes ~90s | ESLint uses typed rules (`projectService`) which requires full TS compilation. Not a failure — just slow on first run. Subsequent runs are faster. |
| Scaffold packages (`apps/*`, `services/api`, `packages/github-client`, etc.) export only `export {}` | These are intentional stubs. Do not add real code until the corresponding task is started. |
| `garden-renderer` has no canvas/draw code yet | The renderer layer (TASK-010–012) is intentionally headless — pure TypeScript data and math with no canvas coupling. Actual draw calls to a canvas surface will be wired in TASK-013 (Garden UI). |
| Placement overflow (`OVERFLOW_POSITION`) | Currently logs nothing — callers should inspect `overflowPlants` and warn if non-empty. The 10×6 default grid supports 60 plants; the PRD's default milestones top out at 8 plants for a full-year user. |
| Achievement registry is module-level mutable state | Tests use `registerAchievementDefinition` freely. If test isolation becomes a problem, extract the registry into a class or factory. The same applies to the species registry in `progression.ts`. |

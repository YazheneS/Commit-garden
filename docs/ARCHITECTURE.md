# GitHub Garden — Architecture

## 1. Architectural Goal

GitHub Garden is a multi-platform application with a shared domain model and a single canonical garden state.

The architecture must prevent platform-specific implementations from developing different garden behavior.

The central rule is:

> Garden behavior belongs to the domain engine, not to any UI.

---

# 2. High-Level Architecture

```text
                         ┌────────────────────┐
                         │       GitHub       │
                         │   GraphQL / Auth   │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ GitHub Integration │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Contribution       │
                         │ Normalizer         │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │   Garden Engine    │
                         │                    │
                         │ progression        │
                         │ streaks            │
                         │ plants             │
                         │ placement          │
                         │ events             │
                         │ achievements       │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │   Backend API      │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │    PostgreSQL      │
                         └─────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
               Web Client      Desktop Client  Mobile Client
                                                   │
                                                   ▼
                                            Mobile Widget
```

---

# 3. Monorepo

Recommended structure:

```text
github-garden/

├── apps/
│   ├── web/
│   ├── desktop/
│   └── mobile/
│
├── packages/
│   ├── garden-engine/
│   ├── garden-renderer/
│   ├── github-client/
│   ├── shared-types/
│   ├── design-system/
│   └── pixel-assets/
│
├── services/
│   └── api/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   └── tasks/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Use a workspace-based monorepo.

pnpm is the recommended package manager.

Turborepo may be added if build orchestration becomes useful, but it should not be introduced merely for fashion.

---

# 4. Recommended Technology

## Shared language

TypeScript.

## Web

React + Next.js.

## Desktop

Tauri.

If Tauri creates significant implementation friction for the agent or required desktop features, Electron is an acceptable fallback.

## Mobile

React Native with Expo where compatible with required widget functionality.

Native platform code may be added where widgets require it.

## Backend

TypeScript service.

## Database

PostgreSQL.

## Authentication

GitHub authentication.

## API

REST or typed RPC layer.

GraphQL is required for GitHub integration but does not need to be used internally for the application's own API.

## Rendering

Use a rendering system appropriate for pixel art.

Canvas/WebGL or DOM-based sprite rendering may be evaluated during implementation.

The renderer must remain independent from garden logic.

---

# 5. Package Responsibilities

## `garden-engine`

The source of truth for garden behavior.

Responsibilities:

* Contribution normalization
* Week calculation
* Streak calculation
* Progression
* Plant growth
* Plant generation
* Plant placement
* Achievements
* Garden events
* Garden state transitions

Must have no dependency on:

* React
* React Native
* Tauri
* Expo
* Browser APIs
* Native APIs
* Database clients
* GitHub SDKs

It should be a pure domain package wherever practical.

---

## `github-client`

Responsibilities:

* GitHub authentication integration
* GitHub API communication
* Contribution retrieval
* Mapping GitHub responses to normalized application data

It must not know how plants grow.

---

## `garden-renderer`

Responsibilities:

* Render garden state
* Render sprites
* Camera
* Animation
* Effects
* Day/night presentation
* Pixel-art rendering

It receives garden state.

It does not calculate streaks.

---

## `shared-types`

Contains shared TypeScript contracts.

Examples:

```ts
User
Garden
Plant
PlantSpecies
GardenEvent
Achievement
DailyActivity
WeeklyActivity
SyncState
```

---

## `pixel-assets`

Contains:

* Sprite sheets
* Tiles
* Animation frames
* Metadata
* Asset manifests

Do not hard-code asset paths throughout applications.

Use an asset registry.

---

## `api`

Responsibilities:

* Authentication session handling
* Garden retrieval
* Garden mutation
* Synchronization
* GitHub synchronization jobs
* Device registration
* Widget data
* User settings

The API should not contain duplicate garden rules.

It calls `garden-engine`.

---

# 6. Domain Model

## User

```ts
type User = {
  id: string;
  githubUserId: string;
  githubUsername: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## Garden

```ts
type Garden = {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  activeWeeks: number;
  progressionVersion: number;
  lastSyncedAt: string | null;
};
```

---

## Plant

```ts
type Plant = {
  id: string;
  gardenId: string;
  speciesId: string;
  growthStage: number;
  position: {
    x: number;
    y: number;
  };
  health: number;
  plantedAt: string;
  originWeek: number;
  metadata: Record<string, unknown>;
};
```

---

# 7. Determinism

Garden generation should be deterministic.

Given:

```text
same user
same normalized activity history
same progression rules
same progression version
```

the garden engine should produce the same result.

Use seeded randomness where variation is required.

Do not use unseeded random values for persistent placement.

---

# 8. Versioning

Garden rules must be versioned.

Example:

```ts
progressionVersion: 1
```

If progression behavior changes later, existing gardens must not unexpectedly change.

New rules should be introduced through explicit migration/version mechanisms.

---

# 9. Event Model

Use domain events.

Example:

```ts
type GardenEvent =
  | {
      type: "PLANT_PLANTED";
      plantId: string;
      occurredAt: string;
    }
  | {
      type: "PLANT_GROWN";
      plantId: string;
      previousStage: number;
      newStage: number;
      occurredAt: string;
    }
  | {
      type: "MILESTONE_REACHED";
      milestone: number;
      occurredAt: string;
    };
```

Events should be immutable.

---

# 10. Synchronization

The backend is the canonical source of persistent state.

Clients should maintain a local cache.

Synchronization strategy:

```text
Client starts
    ↓
Load cached garden
    ↓
Render immediately
    ↓
Request latest server state
    ↓
Compare versions
    ↓
Update local cache
    ↓
Render latest state
```

Use optimistic updates only when safe.

For MVP, server-authoritative synchronization is preferred.

---

# 11. Garden State Version

Every garden state should have a monotonically increasing version or equivalent synchronization marker.

Example:

```text
gardenVersion: 104
```

Client:

```text
local version = 103
server version = 104
```

Client downloads state 104.

---

# 12. Offline Strategy

Desktop and mobile clients should cache:

* Last garden state
* Relevant asset metadata
* User settings
* Recent events

The garden should remain viewable without internet.

GitHub synchronization requires connectivity.

---

# 13. GitHub Synchronization

The GitHub sync flow:

```text
GitHub authentication
       ↓
User identity
       ↓
Contribution query
       ↓
Normalize daily activity
       ↓
Calculate weekly activity
       ↓
Run garden engine
       ↓
Generate events
       ↓
Persist garden state
       ↓
Notify clients
```

The synchronization operation must be idempotent.

Running the same synchronization twice must not generate duplicate plants.

---

# 14. Idempotency

A synchronization operation should be keyed by a deterministic input such as:

```text
userId
activityHistoryHash
progressionVersion
```

or another equivalent mechanism.

Never create a second plant merely because the sync job was run twice.

---

# 15. Database

Initial relational structure:

```text
users
gardens
plants
garden_events
achievements
github_connections
sync_runs
device_registrations
user_settings
```

Possible later tables:

```text
garden_snapshots
notifications
shared_gardens
garden_visitors
```

Do not introduce these until required.

---

# 16. Authentication

GitHub authentication should be handled server-side where appropriate.

Sensitive credentials/tokens must never be stored in client source code.

Secrets belong in environment variables or the hosting platform's secret manager.

---

# 17. Security

Requirements:

* Validate all API input.
* Authenticate every private garden request.
* Authorize access by garden ownership.
* Encrypt sensitive credentials where stored.
* Never expose GitHub tokens to the renderer.
* Avoid logging access tokens.
* Avoid logging private user data.
* Apply rate limits to synchronization endpoints.
* Validate GitHub webhook/event data if webhooks are introduced later.

---

# 18. Rendering Architecture

The renderer receives:

```ts
GardenRenderState
```

rather than raw database records.

Example:

```ts
type GardenRenderState = {
  terrain: TerrainTile[];
  plants: RenderPlant[];
  creatures: RenderCreature[];
  effects: RenderEffect[];
};
```

This allows database schema changes without forcing UI changes.

---

# 19. Pixel Asset Architecture

Use an asset manifest.

Example:

```ts
{
  id: "plant.oak.stage3",
  type: "plant",
  spriteSheet: "plants.png",
  frame: 12,
  width: 16,
  height: 24
}
```

Applications should reference asset IDs rather than file paths.

---

# 20. Desktop Architecture

Desktop consists of:

```text
Tauri shell
    │
    ├── system tray
    ├── lifecycle
    ├── notifications
    ├── startup
    └── native integrations
          │
          ▼
      Web UI
          │
          ▼
    Garden Renderer
          │
          ▼
    Shared Garden State
```

Native functionality should remain thin.

Business logic must remain in shared packages.

---

# 21. Mobile Architecture

Mobile consists of:

```text
React Native application
        │
        ├── Garden screen
        ├── Progress screen
        ├── Settings
        └── Local cache
                │
                ▼
             API
```

Widget:

```text
Mobile Widget
      ↓
Widget data/cache
      ↓
Latest garden snapshot
```

The widget should not run the full garden engine.

---

# 22. Widget Data

Widgets should receive a small precomputed representation.

Example:

```ts
type WidgetGardenState = {
  imageOrSnapshotReference: string;
  currentStreak: number;
  activeWeeks: number;
  nextMilestone: number | null;
  generatedAt: string;
};
```

This minimizes widget complexity and battery use.

---

# 23. Performance

Desktop:

* Low CPU usage when idle
* Minimal memory usage
* No continuous polling
* Prefer scheduled/background synchronization

Mobile:

* Minimize background work
* Avoid continuous animation in widgets
* Use platform-supported widget refresh mechanisms

Garden animation should pause or reduce complexity when not visible.

---

# 24. Testing Architecture

## Unit tests

Required for:

* Streak calculation
* Week calculation
* Plant progression
* Plant generation
* Placement
* Achievements
* Event generation
* Deterministic seeded behavior

## Integration tests

Required for:

* GitHub normalization
* Synchronization
* Database persistence
* Authentication flow

## End-to-end tests

Required for critical journeys:

```text
Connect GitHub
→ import history
→ garden generated
→ synchronize
→ desktop renders
→ mobile renders
```

---

# 25. Testing Philosophy

The garden engine should have extremely strong test coverage.

The UI can change.

The visual style can change.

The garden rules should remain reliable.

---

# 26. Deployment

Suggested initial deployment:

```text
Web/API
→ managed cloud platform

Database
→ managed PostgreSQL

Desktop
→ signed desktop releases

Mobile
→ App Store / Play Store
```

Exact providers should remain configurable.

---

# 27. Observability

Production logging should capture:

* Sync success/failure
* API errors
* Authentication failures
* Client version
* Garden engine version

Do not log:

* GitHub access tokens
* Private source code
* unnecessary personal data

---

# 28. Architectural Rule

The most important architectural rule:

> No platform may independently implement garden progression.

If the desktop says a plant should grow after 5 weeks and mobile says it should grow after 6, the architecture has failed.

There must be one garden engine.

---

# 29. Future Architecture

Potential future additions:

```text
Event stream
     ↓
Garden simulation
     ↓
Multiple biomes
     ↓
Multiplayer
     ↓
Shared gardens
```

These must not complicate the MVP architecture prematurely.

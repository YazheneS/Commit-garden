# GitHub Garden — Task List

## How to use this file

Work on **one task at a time**.

Do not automatically start the next task after finishing one.

Before starting a task:

1. Read `PRD.md`
2. Read `ARCHITECTURE.md`
3. Read `AGENTS.md`
4. Read the specific task below
5. Inspect the existing repository
6. Implement only that task
7. Run tests, lint, and typecheck
8. Report what was changed

---

# Phase 0 — Repository Foundation

## TASK-001 — Repository Bootstrap

Create the initial monorepo structure.

### Create

```text
apps/
  web/
  desktop/
  mobile/

packages/
  garden-engine/
  garden-renderer/
  github-client/
  shared-types/
  design-system/
  pixel-assets/

services/
  api/

database/
  migrations/
  seeds/

docs/
```

### Requirements

* Configure pnpm workspace.
* Configure TypeScript.
* Configure shared package imports.
* Add linting.
* Add testing infrastructure.
* Add basic CI configuration.
* Add `.env.example`.
* Add a root `README.md`.

### Acceptance criteria

* Repository installs successfully.
* Workspace packages resolve correctly.
* TypeScript works.
* Lint works.
* Tests can run.
* No secrets are committed.

Do not implement GitHub authentication, garden logic, database logic, or UI yet.

---

# Phase 1 — Garden Engine

## TASK-002 — Domain Types

Create the shared domain types:

* User
* Garden
* Plant
* PlantSpecies
* GardenEvent
* Achievement
* DailyActivity
* WeeklyActivity

Add unit tests for important type-related behavior.

---

## TASK-003 — Activity Normalizer

Convert daily GitHub activity into weekly activity.

Handle:

* active weeks
* inactive weeks
* empty history
* week boundaries
* missing days

Add tests.

---

## TASK-004 — Streak Engine

Implement:

* current streak
* longest streak
* consecutive active weeks

Test:

* first active week
* consecutive weeks
* broken streak
* historical data
* incomplete current week

---

## TASK-005 — Plant Progression

Implement data-driven plant stages:

```text
seed
↓
sprout
↓
young
↓
mature
↓
flowering
```

Do not hard-code progression rules inside the UI.

Add tests.

---

## TASK-006 — Plant Generation

Create new plants when configured milestones are reached.

Requirements:

* deterministic
* idempotent
* no duplicate plants
* configurable milestones

Example:

```text
Week 1 → first seed
Week 5 → new seed
Week 12 → new species
Week 16 → tree
```

These values must remain configuration, not hard-coded business logic.

---

## TASK-007 — Garden Placement

Create deterministic garden placement.

Requirements:

* grid-based
* avoid collisions
* stable positions
* seeded variation

The same garden state should produce the same layout.

---

## TASK-008 — Garden Events

Implement domain events such as:

* PlantPlanted
* PlantGrew
* PlantFlowered
* StreakMilestoneReached
* NewWeekStarted
* GardenRecovered

Add tests.

---

## TASK-009 — Achievements

Implement achievements that unlock visual content.

Examples:

* First Week
* One Month
* Three Months
* Six Months
* One Year

Do not make achievements purely cosmetic badges; they can unlock garden elements.

---

# Phase 2 — Pixel Garden

## TASK-010 — Renderer Prototype

Create a pixel-art garden renderer using fake/mock garden data.

Show:

* ground
* plants
* pixel grid
* camera
* zoom

Do not connect GitHub yet.

---

## TASK-011 — Sprite System

Create:

* sprite registry
* sprite metadata
* animation frames
* plant state sprites

---

## TASK-012 — Garden Animation

Add:

* plant growth animation
* idle animation
* basic butterfly/firefly
* day/night visual changes

Keep animations lightweight.

---

## TASK-013 — Garden UI

Create the garden screen showing:

* garden
* current streak
* active weeks
* next milestone
* recent garden event

---

# Phase 3 — Backend

## TASK-014 — Database Schema

Create the initial database schema:

* users
* gardens
* plants
* garden_events
* achievements
* github_connections
* sync_runs
* device_registrations
* user_settings

---

## TASK-015 — API Foundation

Create authenticated API endpoints such as:

```text
GET  /garden
GET  /garden/events
GET  /garden/progress
GET  /user
POST /sync
```

---

## TASK-016 — Persistence and Sync

Implement:

* transactional updates
* idempotent synchronization
* garden versioning
* safe concurrent updates

Running the same sync twice must not create duplicate plants.

---

# Phase 4 — GitHub Integration

## TASK-017 — GitHub Authentication

Implement secure GitHub authentication.

Requirements:

* OAuth
* minimal permissions
* secure token storage
* no GitHub secrets in the client

---

## TASK-018 — Contribution Retrieval

Retrieve GitHub contribution/activity data.

Normalize it into the application's:

```text
DailyActivity
WeeklyActivity
```

Do not scrape GitHub HTML.

---

## TASK-019 — GitHub Sync Pipeline

Implement:

```text
GitHub
  ↓
Contribution data
  ↓
Normalizer
  ↓
Garden Engine
  ↓
Database
```

Test repeated synchronization.

---

## TASK-020 — Historical Import

When a user connects GitHub for the first time:

1. Retrieve historical contribution data.
2. Normalize it.
3. Run the garden engine.
4. Reconstruct the garden.
5. Save the canonical garden state.

---

# Phase 5 — Web App

## TASK-021 — Onboarding

Create:

```text
Landing page
    ↓
Connect GitHub
    ↓
Importing
    ↓
Your Garden
```

---

## TASK-022 — Connected Garden

Connect the web garden to the real backend.

The UI must render the canonical garden state.

---

## TASK-023 — Settings

Add settings for:

* account
* GitHub connection
* notifications
* garden preferences
* privacy

---

# Phase 6 — Desktop Companion

## TASK-024 — Desktop Shell

Create the Tauri desktop application.

---

## TASK-025 — Tray Integration

Add:

* system tray icon
* open garden
* sync
* quit

---

## TASK-026 — Desktop Garden

Create the small desktop companion.

It should:

* display the garden
* show streak
* use cached state
* sync in background
* work offline

---

## TASK-027 — Desktop Notifications

Add subtle notifications for meaningful milestones.

Avoid guilt-inducing notifications.

---

# Phase 7 — Mobile

## TASK-028 — Mobile App

Create screens:

```text
Garden
Progress
History
Settings
```

---

## TASK-029 — Mobile Sync

Connect the mobile app to the canonical backend garden.

Verify:

```text
Desktop change
      ↓
Backend
      ↓
Mobile
```

shows the same garden.

---

## TASK-030 — Mobile Widget

Create a home-screen widget showing:

* garden snapshot
* current streak
* active weeks
* next milestone

The widget should use a compact precomputed state.

---

## TASK-031 — Widget Refresh

Implement efficient widget refresh behavior.

Avoid unnecessary battery usage.

---

# Phase 8 — Cross-Device Sync

## TASK-032 — Cross-Device Consistency

Verify:

```text
Web
 ↓
Backend
 ↓
Desktop
 ↓
Mobile
 ↓
Widget
```

all represent the same canonical garden.

---

## TASK-033 — Offline Mode

Allow clients to:

* display cached garden
* work without network temporarily
* synchronize when connectivity returns

---

# Phase 9 — Garden Polish

## TASK-034 — Seasons

Add seasonal visual changes.

---

## TASK-035 — Weather

Add lightweight weather effects.

---

## TASK-036 — Creatures

Add creatures that appear as the ecosystem develops.

Examples:

* butterflies
* birds
* fireflies

---

## TASK-037 — Developer Objects

Add coding-themed garden objects.

Examples:

* laptop
* terminal
* keyboard
* coffee
* server
* Git branch
* bug/debugging objects

---

## TASK-038 — Garden History

Create a timeline showing important garden events.

Example:

```text
Week 1
🌱 First seed planted

Week 4
🌿 First mature plant

Week 8
🌸 First flower

Week 12
🌳 New species discovered
```

---

# Phase 10 — Production

## TASK-039 — Security Review

Review:

* authentication
* authorization
* GitHub tokens
* API security
* database access
* secrets
* rate limits

---

## TASK-040 — Performance

Optimize:

* desktop CPU usage
* mobile battery usage
* rendering
* API requests
* database queries
* widget refreshes

---

## TASK-041 — Observability

Add useful monitoring for:

* sync success/failure
* API errors
* authentication errors
* client version
* engine version

Never log secrets or private source code.

---

## TASK-042 — End-to-End Testing

Test the complete journey:

```text
Connect GitHub
      ↓
Import history
      ↓
Garden appears
      ↓
Continue coding
      ↓
Garden grows
      ↓
Open desktop
      ↓
Open mobile
      ↓
Same garden appears
      ↓
Break streak
      ↓
Garden remains
      ↓
Return to coding
      ↓
Garden continues
```

---

## TASK-043 — Release

Prepare:

* web deployment
* database deployment
* desktop builds
* mobile builds
* environment documentation
* production configuration
* release documentation

---

# Important Rule

Never tell the coding agent:

> "Build the entire GitHub Garden."

Instead, give it **one task**.

Start with:

> "Read PRD.md, ARCHITECTURE.md, AGENTS.md and TASKS.md. Start only with TASK-001. Do not implement TASK-002 or any later task."

After TASK-001 is finished and tested, you move to TASK-002.

# Phase 11 — Scaffold to Real Product

## Purpose

The previous 43 tasks established the architecture, domain logic, tests, and product foundation.

The repository currently passes:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The current baseline must be preserved.

The next phase is NOT a rewrite.

The goal is to turn scaffolded app packages and infrastructure abstractions into a genuinely runnable product.

---

# Critical Rule

Do NOT restart the project.

Do NOT recreate the garden engine.

Do NOT discard existing tests.

Do NOT replace working domain logic simply because the application layer is incomplete.

Reuse the existing:

* garden engine
* shared types
* renderer state
* API contracts
* GitHub integration abstractions
* synchronization logic
* tests
* task documentation

Replace scaffold-only implementations with real runtime implementations.

---

# Phase 11 Goal

At the end of this phase, a developer should be able to:

1. Start the application locally.
2. Open a real UI.
3. See a pixel-art garden.
4. Connect GitHub.
5. Retrieve real contribution activity.
6. Generate their garden.
7. See the garden persist.
8. Close and reopen the application.
9. See the same garden.
10. Run the desktop version.
11. Run the mobile version.
12. See the same garden state on mobile.

---

# TASK-044 — Repository Reality Audit

Before writing new code, inspect the existing repository.

Determine exactly which components are:

* production implementations
* test implementations
* mocks
* scaffolds
* placeholders
* in-memory implementations
* UI stubs

Create:

```text
docs/REALITY-AUDIT.md
```

Document:

```text
Component
Current implementation
Real/scaffold
What must change
Dependencies
```

Do not modify product behavior during this task.

Acceptance criteria:

* Every app package has been inspected.
* API implementation has been inspected.
* Repository/persistence layer has been inspected.
* GitHub integration has been inspected.
* Renderer has been inspected.
* Existing tests have been inspected.

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The baseline must remain green.

---

# TASK-045 — Real Web Runtime

Turn the web package from a scaffold into a real runnable web application.

Requirements:

* Real application entry point.
* Real routing.
* Real garden screen.
* Real loading state.
* Real error state.
* Real API integration.
* Real garden renderer.
* Real responsive layout.

The first page should be the garden experience rather than a developer/debug screen.

The user should be able to open the application and see:

```text
┌──────────────────────────────────┐
│          GITHUB GARDEN           │
│                                  │
│       🌳          🌸             │
│   🌿       🦋           🌱       │
│                                  │
│          🌿          🌳          │
│                                  │
│     8 ACTIVE WEEKS               │
│     NEXT GROWTH: 1 WEEK          │
└──────────────────────────────────┘
```

Use actual pixel assets rather than emoji in the final garden renderer.

Acceptance criteria:

* `pnpm dev` starts the web app.
* Browser displays the garden.
* Garden state comes from the existing domain model.
* No fake hard-coded garden is used as the primary implementation.
* Existing tests continue passing.

---

# TASK-046 — Real Pixel Garden Renderer

Replace any placeholder renderer with the actual pixel-art garden experience.

Requirements:

* Pixel-art tiles.
* Pixel-art plants.
* Grid.
* Stable plant positions.
* Growth stages.
* Camera.
* Zoom.
* Basic animation.
* Responsive rendering.

The renderer must consume garden state.

It must NOT calculate GitHub streaks or progression itself.

Acceptance criteria:

* A real garden is visually rendered.
* At least three plant species/states are visible.
* Plant positions remain stable.
* Growth stages are represented visually.
* Renderer works at desktop and mobile-sized viewports.

---

# TASK-047 — Real Backend Runtime

Turn the API scaffold into a runnable backend service.

Requirements:

* Real HTTP server.
* Real routes.
* Request validation.
* Authentication middleware.
* Error handling.
* CORS configuration where necessary.
* Health endpoint.

Implement:

```text
GET /health
GET /garden
GET /garden/progress
GET /garden/events
POST /sync
```

The API must use the existing domain engine rather than duplicating garden logic.

Acceptance criteria:

```text
GET /health
```

returns a successful health response.

The web application can communicate with the API.

---

# TASK-048 — Production Database

Replace the in-memory repository with a real PostgreSQL-backed repository.

Requirements:

* PostgreSQL connection.
* Migrations.
* User persistence.
* Garden persistence.
* Plant persistence.
* Event persistence.
* Achievement persistence.
* Sync-run persistence.

The existing repository abstraction should remain where practical.

The domain engine must remain database-independent.

Acceptance criteria:

* Database can be started locally.
* Migrations run successfully.
* User can be persisted.
* Garden can be persisted.
* Garden survives API restart.
* Existing tests remain green.

---

# TASK-049 — Local Development Environment

Create a simple local development environment.

The developer should be able to run something equivalent to:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

Document all required environment variables.

Create/update:

```text
.env.example
docs/LOCAL-DEVELOPMENT.md
```

Do not commit secrets.

---

# TASK-050 — Real GitHub OAuth

Replace GitHub authentication scaffolding with a real authentication flow.

Requirements:

* GitHub OAuth.
* Secure callback handling.
* Secure token storage.
* User creation/login.
* Session handling.
* Logout.

Do not expose GitHub tokens to the browser unnecessarily.

Acceptance criteria:

A real GitHub account can:

```text
Open app
→ Connect GitHub
→ Authorize
→ Return to app
→ Become authenticated
```

---

# TASK-051 — Real Contribution Synchronization

Connect the authenticated GitHub account to the existing garden engine.

Pipeline:

```text
GitHub
 ↓
Contribution API
 ↓
DailyActivity
 ↓
WeeklyActivity
 ↓
Streak calculation
 ↓
Garden engine
 ↓
Database
 ↓
UI
```

Requirements:

* Historical synchronization.
* Current activity.
* Idempotency.
* Error handling.
* Rate-limit handling.
* Sync timestamp.

Acceptance criteria:

A real GitHub account produces a real garden.

---

# TASK-052 — Historical Garden Generation

When a user first connects GitHub:

1. Fetch historical contribution data.
2. Normalize activity.
3. Calculate active weeks.
4. Generate plants.
5. Generate garden events.
6. Persist the result.
7. Display the resulting garden.

The garden should represent the user's actual coding history.

---

# TASK-053 — Real Desktop Application

Turn the desktop scaffold into a real desktop application.

Use the architecture already selected in the repository.

Requirements:

* Actual desktop window.
* System tray.
* Open garden.
* Close/minimize.
* Cached garden.
* API synchronization.
* Basic notifications.

The desktop app must use the same backend and garden state as the web application.

Acceptance criteria:

The developer can build and launch a real desktop application.

---

# TASK-054 — Desktop Ambient Mode

Create the lightweight desktop experience.

Requirements:

* Small window.
* Pixel garden.
* Current streak.
* Next milestone.
* Minimal CPU usage.
* Cached state.
* Background synchronization.

The desktop application should feel like an ambient companion rather than a dashboard.

---

# TASK-055 — Real Mobile Application

Turn the mobile scaffold into a real mobile application.

Required screens:

```text
Garden
Progress
History
Settings
```

Requirements:

* Real navigation.
* Authentication.
* API connection.
* Garden rendering.
* Cached garden.
* Loading/error states.

Acceptance criteria:

The mobile application can be launched on a real device or simulator and displays the user's garden.

---

# TASK-056 — Mobile Widget

Implement the actual mobile home-screen widget.

The widget should display:

```text
┌─────────────────┐
│  MY GARDEN      │
│                 │
│ 🌳 🌸 🌿        │
│ 🌱 🦋 🌱        │
│                 │
│ 8 week streak   │
└─────────────────┘
```

Requirements:

* Native widget integration where required.
* Cached/precomputed garden snapshot.
* Current streak.
* Active weeks.
* Next milestone.
* Efficient refresh.

The widget must NOT run the complete garden engine.

---

# TASK-057 — Cross-Platform Identity

Verify that one GitHub account maps to one canonical garden.

Test:

```text
GitHub account
      ↓
Backend user
      ↓
Garden
      ↓
Web
Desktop
Mobile
Widget
```

All clients must display the same garden.

---

# TASK-058 — Persistence Verification

Verify that the garden survives:

* browser refresh
* API restart
* database restart
* desktop restart
* mobile restart

No client may silently create a separate garden.

---

# TASK-059 — End-to-End Product Test

Create an automated or semi-automated end-to-end test covering:

```text
User
 ↓
GitHub authentication
 ↓
Contribution import
 ↓
Garden generation
 ↓
Database persistence
 ↓
Web rendering
 ↓
Desktop rendering
 ↓
Mobile rendering
```

Where external OAuth prevents fully automated testing, create a deterministic test environment/mock while separately documenting the manual production verification.

---

# TASK-060 — Deployment

Deploy the real product.

Required environments:

```text
Development
Staging
Production
```

Production should include:

* Web application
* API
* PostgreSQL
* Secure environment variables
* HTTPS
* Authentication configuration
* Monitoring
* Error logging

---

# TASK-061 — Desktop Release Build

Create real desktop release builds.

Verify:

* installation
* launch
* authentication
* garden rendering
* synchronization
* tray behavior

---

# TASK-062 — Mobile Release Build

Create real mobile release builds.

Verify:

* installation
* authentication
* garden rendering
* synchronization
* widget behavior

---

# TASK-063 — Production Verification

Perform a real-world verification using a real GitHub account.

Verify:

* OAuth
* contribution import
* garden generation
* persistence
* desktop
* mobile
* widget
* synchronization
* logout/login
* error recovery

Record results in:

```text
docs/PRODUCTION-VERIFICATION.md
```

---

# TASK-064 — Ship Readiness Review

Produce a final report covering:

* Core logic
* API
* Database
* Web
* Desktop
* Mobile
* Widget
* Authentication
* GitHub integration
* Security
* Performance
* Deployment
* Monitoring

Every area must be marked:

```text
READY
PARTIAL
NOT READY
```

The project may only be called "production-ready" if the evidence supports it.

---

# Phase 11 Definition of Done

Phase 11 is complete when a real developer can:

1. Open GitHub Garden.
2. Authenticate with GitHub.
3. Import their real GitHub history.
4. See their pixel-art garden.
5. Close the application.
6. Reopen it.
7. See the same garden.
8. Open the desktop companion.
9. See the same garden.
10. Open the mobile application.
11. See the same garden.
12. Add GitHub activity.
13. Synchronize.
14. See the garden progress.
15. See the same updated garden on other devices.
16. Add the widget to their phone.
17. See their garden from the widget.

Only after this is working should the project be described as a real MVP rather than a validated scaffold.

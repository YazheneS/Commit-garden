# GitHub Garden — Agent Instructions

## 1. Read First

Before modifying code, read:

1. `PRD.md`
2. `ARCHITECTURE.md`
3. `AGENTS.md`
4. The task file assigned to you
5. Relevant package documentation

Do not begin implementation before understanding the repository structure.

---

# 2. Product Definition

GitHub Garden is a persistent pixel-art ecosystem driven by GitHub coding consistency.

The core experience is:

```text
GitHub activity
      ↓
weekly consistency
      ↓
garden progression
      ↓
plants
      ↓
ecosystem
```

The same garden must exist across:

* Web
* Desktop
* Mobile
* Mobile widget

---

# 3. Highest-Priority Rule

## The garden engine is the source of truth.

Never implement garden-growth rules inside:

* React components
* React Native components
* Tauri code
* API route handlers
* Widget code
* Database triggers

Garden rules belong in:

```text
packages/garden-engine/
```

---

# 4. Before Coding

Inspect:

```text
package.json
pnpm-workspace.yaml
apps/
packages/
services/
database/
```

Determine:

* Existing architecture
* Existing dependencies
* Existing conventions
* Existing tests

Do not introduce a new framework if the repository already has a suitable solution.

---

# 5. Implementation Rules

## Prefer small changes

Do not rewrite large portions of the repository unless the task explicitly requires it.

## Do not modify unrelated files

If a task concerns:

```text
garden-engine
```

do not refactor:

```text
mobile
```

unless required.

## Preserve APIs

Do not change public interfaces without updating:

* Consumers
* Types
* Tests
* Documentation

---

# 6. TypeScript

Use strict TypeScript.

Avoid:

```ts
any
```

unless there is a documented reason.

Prefer explicit domain types.

Do not duplicate types between packages.

Shared types belong in:

```text
packages/shared-types/
```

---

# 7. Garden Engine

Garden engine functions should be deterministic.

Prefer pure functions.

Example:

```ts
calculateActiveWeeks(activity)
calculateStreak(weeks)
generateGarden(history, rules)
applyGardenEvent(state, event)
```

Avoid hidden state.

Avoid time-dependent behavior unless time is explicitly passed as an argument.

Bad:

```ts
const now = new Date();
```

Preferred:

```ts
calculateGarden(state, {
  now,
});
```

This makes testing deterministic.

---

# 8. Randomness

Never use uncontrolled randomness for persistent garden state.

If randomness is needed:

```text
seed → deterministic random generator
```

The same seed must generate the same result.

---

# 9. Persistence

Never persist UI-specific state as canonical garden state.

Canonical state includes:

* Plants
* Growth
* Positions
* Events
* Achievements
* Progression

Temporary UI state includes:

* Camera position
* Selected plant
* Open modal
* Animation frame

Keep those separate.

---

# 10. GitHub Integration

GitHub API calls belong in:

```text
packages/github-client/
```

or the designated backend integration layer.

Do not call GitHub directly from UI components.

Never expose GitHub secrets to clients.

Never scrape GitHub HTML unless explicitly approved as a temporary fallback.

---

# 11. Synchronization

Synchronization must be idempotent.

If the same GitHub contribution history is synchronized twice:

```text
before:
17 plants

sync

after:
17 plants
```

not:

```text
19 plants
```

---

# 12. Database

Database access belongs in the backend/data layer.

Do not place database queries inside visual components.

Do not expose raw database records directly to clients if a domain/API model is more appropriate.

---

# 13. Rendering

The renderer should consume domain/render state.

It should not calculate:

```text
current streak
active weeks
new plant
achievement
```

It should render the result of those calculations.

---

# 14. Pixel Art

Pixel art is a core product requirement.

Do not replace it with generic UI illustrations.

Maintain:

* consistent pixel scale
* consistent sprite dimensions
* consistent palette
* coherent lighting
* coherent outlines

Do not mix unrelated visual styles.

---

# 15. UX

The product should feel:

* Calm
* Alive
* Rewarding
* Personal

Avoid:

* Aggressive streak warnings
* Guilt-inducing notifications
* Excessive badges
* Gamification spam
* Constant notifications

A missed week should not feel like losing everything.

---

# 16. Desktop

Desktop should remain lightweight.

Do not implement:

* continuous polling
* unnecessary background loops
* expensive rendering while hidden

Use event-driven or scheduled synchronization where possible.

---

# 17. Mobile

Optimize for:

* Battery
* Startup time
* Network efficiency
* Small widget payloads

The mobile widget must not execute expensive garden simulation.

---

# 18. Error Handling

Errors should be explicit.

Never silently swallow failures.

Bad:

```ts
try {
  await sync();
} catch {}
```

Preferred:

```ts
try {
  await sync();
} catch (error) {
  logger.error("Garden sync failed", { error });
  throw error;
}
```

User-facing errors should be understandable.

---

# 19. Tests

Every new domain behavior must have tests.

For a new garden rule:

1. Add the rule.
2. Add unit tests.
3. Test boundary conditions.
4. Test repeated synchronization.
5. Test historical data.

Do not consider a feature complete without tests.

---

# 20. Required Checks

Before declaring a task complete, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

If these commands do not exist, determine the repository's equivalent commands.

If a check cannot run, report why.

Do not claim success if checks failed.

---

# 21. Git

Use small commits.

Commit messages should describe the actual change.

Examples:

```text
feat(garden): add deterministic plant progression
feat(github): normalize contribution calendar
feat(desktop): add system tray companion
fix(sync): prevent duplicate plant generation
test(garden): cover weekly progression
```

Do not create meaningless commits.

---

# 22. Agent Output

At the end of each task, report:

```text
Implemented:
- ...

Files changed:
- ...

Tests:
- ...

Checks:
- ...

Known issues:
- ...

Next recommended task:
- ...
```

Keep the report concise.

---

# 23. Scope Control

If a task says:

> Implement the garden engine.

Do not also implement:

* Authentication
* Mobile widgets
* Desktop tray
* Database migrations

unless required by the task.

Complete the requested scope first.

---

# 24. Architectural Changes

If implementation reveals that the architecture needs to change:

1. Stop before large refactoring.
2. Explain the problem.
3. Propose the smallest architectural change.
4. Update architecture documentation.
5. Then implement.

Do not silently redesign the system.

---

# 25. Dependencies

Before adding a dependency:

Ask:

1. Is it necessary?
2. Does the existing stack already solve this?
3. Is it maintained?
4. Does it materially increase bundle size?
5. Does it work on all required platforms?

Prefer fewer dependencies.

---

# 26. Security

Never commit:

* API keys
* OAuth secrets
* GitHub tokens
* database passwords
* private credentials

Use environment variables.

Provide `.env.example`.

---

# 27. Privacy

Do not store:

* Repository source code
* Git commit contents
* Private files

unless explicitly required by a future feature.

The MVP needs contribution metadata, not source code.

---

# 28. Design Decisions

When uncertain, prioritize:

1. Product requirements
2. Architecture
3. Existing repository conventions
4. Simplicity
5. Maintainability
6. Performance

Do not optimize prematurely.

---

# 29. Definition of Done

A task is complete only when:

* Implementation exists.
* Types pass.
* Tests pass.
* Lint passes.
* Relevant documentation is updated.
* No unrelated behavior was changed.
* The requested acceptance criteria are satisfied.

---

# 30. Final Principle

Build the smallest version that proves the product idea.

Do not turn GitHub Garden into an enormous engineering project before the garden itself is enjoyable.

The goal is not:

> "Build a technically impressive GitHub integration."

The goal is:

> "Make a developer want to come back tomorrow and see their garden grow."

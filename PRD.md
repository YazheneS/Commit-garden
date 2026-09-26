# GitHub Garden — Product Requirements Document

## 1. Product Overview

GitHub Garden is a cross-platform pixel-art companion that turns a user's long-term GitHub coding consistency into a persistent, growing digital garden.

The product connects to GitHub, observes contribution activity, and converts sustained coding consistency into plants, trees, flowers, creatures, structures, and eventually a complete pixel-art ecosystem.

The same garden must be available across:

* Desktop companion application
* Mobile application
* Mobile home-screen widget
* Optional web application for account setup and full-garden viewing

The core emotional goal is:

> "I keep building things, and my little world grows with me."

GitHub Garden is not intended to be a conventional productivity dashboard. The garden itself is the primary experience.

---

# 2. Product Vision

Create a calm, beautiful, developer-themed digital ecosystem that visually represents long-term coding consistency.

The user's GitHub activity should become something they can see and care about rather than merely a number or green contribution square.

The product should feel:

* Personal
* Alive
* Rewarding
* Calm
* Pixel-art focused
* Developer-oriented
* Persistent
* Cross-platform
* Non-punitive

---

# 3. Core Product Principles

## 3.1 The garden is persistent

Plants earned by the user should never be permanently destroyed because of a broken streak.

Missing activity can cause temporary states such as:

* Dormant
* Wilted
* Sleeping
* Autumnal

Returning to GitHub activity should allow the ecosystem to recover.

Historical progress must remain visible.

---

## 3.2 Long-term consistency matters more than commit volume

The product must not encourage meaningless commits.

The primary progression mechanism is based on sustained GitHub activity over time, especially consecutive active weeks.

Raw commit count may be used for secondary statistics or activity signals, but it must not be the sole mechanism for plant generation.

---

## 3.3 The garden should accumulate

The user's world should become richer over time.

Example:

Week 1:

```text
🌱
```

Week 4:

```text
🌱 🌿 🌸
```

Week 12:

```text
🌳 🌸 🌿 🌱 🦋 🌳
```

Week 52:

```text
A complete ecosystem
```

The user's history becomes the garden.

---

## 3.4 All platforms show the same garden

Desktop and mobile must never maintain separate garden states.

There is one canonical garden state.

Example:

```text
GitHub
   ↓
Garden Engine
   ↓
Cloud State
   ↓
Desktop
   ↓
Mobile
   ↓
Widget
```

If a plant grows on desktop, the mobile widget must eventually show the same plant.

---

## 3.5 Pixel art is the visual identity

The application should use a cohesive pixel-art visual language.

Avoid:

* Generic SaaS dashboards
* Photorealistic plants
* Generic 3D assets
* Emoji as the primary visual representation
* Corporate productivity aesthetics

The garden should feel like a small pixel-art game world built specifically for developers.

---

# 4. Target Users

## Primary user

A developer who:

* Uses GitHub regularly
* Wants to build coding consistency
* Enjoys games or gamification
* Likes pixel art
* Wants a lightweight desktop companion
* Wants quick visibility from their phone

## Secondary users

* Students learning software development
* Open-source contributors
* Indie hackers
* Coding hobbyists
* Developers who enjoy virtual pets or ambient desktop applications

---

# 5. MVP Scope

The first production milestone should contain:

1. GitHub authentication
2. GitHub contribution synchronization
3. Contribution-history normalization
4. Weekly consistency calculation
5. Garden progression engine
6. Pixel-art garden renderer
7. Persistent cloud garden state
8. Desktop companion
9. Mobile application
10. Mobile home-screen widget
11. Shared garden state between all clients
12. Basic plant progression
13. Basic garden events
14. Basic achievement system
15. Offline cached rendering

The MVP should NOT initially include:

* Multiplayer gardens
* Social feeds
* Public profiles
* Competitive leaderboards
* Complex AI-generated plants
* Marketplace
* NFTs
* Monetization
* User-created asset marketplace
* Complex weather simulation
* Procedural terrain generation

Those may be considered later.

---

# 6. User Journey

## First launch

User opens GitHub Garden.

They see:

```text
Welcome to your garden.

Your GitHub activity grows it.

[ Connect GitHub ]
```

User authenticates.

The application imports historical contribution data.

The system calculates the user's historical active weeks.

The garden is generated from that history.

Example:

```text
Your GitHub history
        ↓
18 active weeks
        ↓
🌳 🌿 🌸 🌱
```

The user enters the garden.

---

# 7. GitHub Integration

The application should use GitHub's supported API mechanisms rather than scraping the GitHub website.

The system should retrieve contribution history sufficient to determine:

* Contribution dates
* Contribution counts
* Contribution types where available
* Historical contribution calendar
* Current activity
* Relevant user identity

GitHub authentication must use an appropriate supported authentication mechanism.

The application must request only the permissions necessary for the product.

The application should not require users to paste long-lived personal access tokens into the UI.

---

# 8. Contribution Model

Raw GitHub activity should be normalized into an internal format.

Example:

```ts
type DailyActivity = {
  date: string;
  contributionCount: number;
  hasActivity: boolean;
};
```

The normalized data should then be converted into:

```ts
type WeeklyActivity = {
  weekStart: string;
  weekEnd: string;
  activeDays: number;
  contributionCount: number;
  isActive: boolean;
};
```

The exact definition of "active week" must be configurable in the garden engine.

Initial recommendation:

A week is active when the user has at least one qualifying GitHub contribution during that week.

The engine should allow future refinement without changing the UI.

---

# 9. Garden Progression

The garden is driven primarily by consecutive active weeks.

A configurable progression table should exist.

Initial example:

| Consecutive active weeks | Result                 |
| ------------------------ | ---------------------- |
| 1                        | Seed                   |
| 2                        | Sprout                 |
| 3                        | Young plant            |
| 4                        | Mature plant           |
| 5                        | New seed               |
| 8                        | Flower                 |
| 12                       | New species            |
| 16                       | Tree                   |
| 20                       | Creature               |
| 26                       | Garden decoration      |
| 52                       | Major ecosystem unlock |

These values are examples and must live in configuration rather than hard-coded UI logic.

---

# 10. Plant Growth

Each plant has stages.

Example:

```text
SEED
 ↓
SPROUT
 ↓
YOUNG
 ↓
MATURE
 ↓
FLOWERING
 ↓
SPECIAL
```

Plants should support species-specific growth paths.

Example:

```text
Seed
 ├── Oak
 ├── Cherry
 ├── Mushroom
 ├── Cactus
 └── Flower
```

The exact species system should be implemented in a data-driven manner.

---

# 11. Plant Generation

A new plant can be generated when the user reaches specified progression milestones.

Generation must be deterministic where possible.

The same garden history should result in the same garden state.

This is important for:

* Reproducibility
* Debugging
* Synchronization
* Data migration
* Testing

---

# 12. Garden Placement

Plants require positions.

Initial implementation:

* Fixed-size garden grid
* Grid-based placement
* Deterministic placement
* Collision avoidance
* Reserved areas for special objects

Example:

```text
0 1 2 3 4 5 6 7 8 9

. . . 🌳 . . . 🌸 . .
. 🌿 . . . 🌱 . . . .
. . . . 🦋 . . 🌿 . .
```

The placement algorithm should avoid randomly changing the positions of existing plants.

Once a plant is placed, its position should remain stable.

---

# 13. Garden Events

The engine should produce events such as:

```ts
type GardenEvent =
  | PlantPlanted
  | PlantGrew
  | PlantFlowered
  | CreatureUnlocked
  | DecorationUnlocked
  | StreakMilestoneReached
  | GardenRecovered
  | NewWeekStarted;
```

Events are useful for:

* Animations
* Notifications
* Activity history
* Debugging
* Future replay functionality

---

# 14. Garden State

The garden must contain:

* User identity
* Garden identity
* Current progression
* Current streak
* Longest streak
* Plants
* Plant positions
* Plant states
* Garden events
* Achievements
* Unlocks
* Garden settings
* Last synchronization time

---

# 15. Broken Streak Behavior

Breaking a streak must not destroy the garden.

Initial behavior:

* Existing plants remain.
* The garden can enter a dormant state.
* New growth pauses.
* Some plants may visually wilt.
* Returning activity can restore health.
* New consecutive weeks begin a new growth cycle.

The exact visual effects should be subtle.

The product should encourage returning rather than create guilt.

---

# 16. Desktop Product

The desktop application should behave like an ambient companion.

Required:

* System tray integration
* Small garden popup
* Full garden view
* Background synchronization
* Launch-on-startup option
* Notification support
* Offline cache
* GitHub connection state
* Garden synchronization state

The default desktop experience should be lightweight.

The user should not need to open a large application merely to see the garden.

---

# 17. Mobile Product

The mobile application should provide:

* Full garden view
* Garden history
* Progress information
* GitHub connection status
* Settings
* Achievements
* Widget configuration

The mobile application must use the same backend garden state as desktop.

---

# 18. Mobile Widget

The mobile widget should provide a compact view.

It should display:

* Current garden snapshot
* Current active-week count
* Current streak
* Latest progression
* Optional next milestone

Example:

```text
MY GARDEN

🌳 🌸 🌿
🌱 🦋 🌱

12 weeks
Next plant: 1 week
```

The widget must not attempt to independently calculate the garden.

It should render synchronized garden data.

---

# 19. Visual Design

## Style

Pixel art.

## Color

Use a restrained palette.

The garden should remain readable at small sizes.

## Animation

Animations should be subtle.

Examples:

* Leaves moving
* Butterfly movement
* Water movement
* Plant growth
* Fireflies
* Weather
* Day/night transition

Avoid excessive animation that drains battery or CPU.

---

# 20. Developer Theme

Developer-themed objects can eventually include:

* Laptop
* Terminal
* Keyboard
* Coffee cup
* Server
* Code symbols
* Branch
* Bug
* Debugging tools
* Tiny monitor
* Network objects

These should remain secondary to the garden.

The product is a garden, not a developer dashboard.

---

# 21. Seasons

Future feature.

Possible seasons:

* Spring
* Summer
* Autumn
* Winter

Season changes may affect:

* Background
* Plants
* Weather
* Ambient animations
* Available decorative objects

Existing plants must remain persistent.

---

# 22. Weather

Future feature.

Possible weather:

* Sunny
* Rain
* Snow
* Storm
* Fog
* Night

Weather should primarily affect presentation rather than punish the user.

---

# 23. Achievements

Achievements should unlock visual content.

Examples:

```text
7 active weeks
→ New plant species

14 active weeks
→ Butterfly

30 active weeks
→ Ancient tree

52 active weeks
→ Garden house
```

Avoid achievement systems that are purely numerical.

---

# 24. Offline Behavior

Clients should cache the most recent garden state.

If offline:

* Garden remains viewable.
* Cached garden is rendered.
* The UI clearly indicates stale synchronization if appropriate.
* No destructive changes are made.
* Synchronization occurs automatically when connectivity returns.

---

# 25. Privacy

The application should minimize stored GitHub information.

Do not store unnecessary repository contents.

Do not clone repositories.

Do not store source code.

Do not inspect private repository contents unless explicitly required by a future feature and explicitly authorized.

The initial product only needs contribution metadata necessary to calculate garden progression.

---

# 26. Success Criteria

MVP is successful if a user can:

1. Connect GitHub.
2. Import their history.
3. Immediately see a garden representing that history.
4. Continue coding for another week.
5. See the garden grow.
6. Close the desktop application.
7. Open their phone.
8. See the same garden in the mobile application/widget.
9. Break their streak without losing their garden.
10. Return and continue growing the ecosystem.

---

# 27. Non-Goals

The first version is not:

* A GitHub analytics platform
* A code-quality analyzer
* A developer ranking platform
* A social network
* A competitive leaderboard
* A commit spam tool
* A replacement for GitHub
* A project management tool

---

# 28. Long-Term Vision

The long-term product should feel like a persistent virtual world whose history is connected to the user's real development journey.

Potential future capabilities:

* Garden history replay
* Multiple garden biomes
* Rare species
* Special events
* Procedural ecosystem growth
* Soundscapes
* Seasonal events
* Garden sharing
* Public garden pages
* Optional social interaction
* Collaborative gardens
* More desktop integrations
* Wearable/ambient displays

The fundamental rule should remain:

> The garden grows because the developer keeps building.

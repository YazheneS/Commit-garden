# GitHub Garden

A cross-platform pixel-art companion that turns long-term GitHub coding consistency into a persistent, growing digital garden.

## Overview

GitHub Garden connects to GitHub, observes contribution activity, and converts sustained coding consistency into plants, trees, flowers, creatures, and eventually a complete pixel-art ecosystem — visible on desktop, mobile, and as a home-screen widget.

```
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

## Monorepo structure

```
apps/
  web/        — Next.js web application
  desktop/    — Tauri desktop companion
  mobile/     — React Native / Expo mobile app

packages/
  garden-engine/    — Core domain logic (streaks, progression, events)
  garden-renderer/  — Pixel-art garden renderer
  github-client/    — GitHub API integration
  shared-types/     — Shared TypeScript contracts
  design-system/    — Shared UI components
  pixel-assets/     — Sprite sheets, tiles, and asset manifests

services/
  api/          — Backend REST API

database/
  migrations/   — SQL migrations
  seeds/        — Seed data
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9

## Getting started

```bash
# Install all workspace dependencies
pnpm install

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run all tests
pnpm test
```

## Environment variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

See `.env.example` for documentation on each variable.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architectural overview.

## Product requirements

See [docs/PRD.md](docs/PRD.md) for the full product requirements document.

## Task list

See [docs/TASKS.md](docs/TASKS.md) for the implementation task list.

## Core principle

> The garden grows because the developer keeps building.

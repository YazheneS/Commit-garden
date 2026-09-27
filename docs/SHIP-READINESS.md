# Ship Readiness Review

**Date:** 2026-09-27  
**Decision:** **NOT READY TO SHIP**. Local PostgreSQL migrations and persistence across API/database restarts are verified, but deployment, real GitHub verification, complete visual web verification, actual renderer art, and native release evidence remain missing.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Core logic | READY | Deterministic garden engine and tests are present and preserved. |
| API | PARTIAL | The PostgreSQL-backed HTTP service returned persisted garden data after API and database restarts; real OAuth/account sync and production operation remain unverified. |
| Database | PARTIAL | Live migrations and garden persistence across API and PostgreSQL restarts are verified. Concurrent sync, backup/restore, and production database operation remain unverified. |
| Web | PARTIAL | Vite page and transformed entry/style return HTTP 200; API-backed states exist in source. The browser DOM/visual output and authenticated garden display were not inspected. The API and PostgreSQL were available during the audit; GitHub OAuth uses placeholders. |
| Garden renderer | PARTIAL | Render state preserves canonical plant position/species/stage and the HTML/CSS scene renders procedural blocky shapes. Sprite-sheet image files are absent and the camera is not wired into web interactions. |
| Desktop | PARTIAL | Tauri window/tray/cache/sync source exists; native build, install, launch and behavior are unverified. |
| Mobile | PARTIAL | Expo screens/auth/cache source and JS export configuration exist; no native device/simulator acceptance run is recorded. |
| Widget | PARTIAL | iOS and Android widget source/config plus compact snapshot tests exist; native widget build and refresh/render behavior are unverified. |
| Authentication | PARTIAL | State validation, token encryption, sessions, logout and mobile handoff have synthetic tests; real OAuth provider configuration is unverified. |
| GitHub integration | PARTIAL | OAuth and contribution GraphQL source exist; no real GitHub account sync has been performed. |
| Security | PARTIAL | Tokens are encrypted at rest and session IDs hashed in source; production secret handling, HTTPS, database access policy, threat review and rotation are not verified. |
| Performance | PARTIAL | Clients use cached snapshots and scheduled/on-foreground refresh source; native CPU, memory, network and battery use have not been measured. |
| Deployment | NOT READY | No target, infrastructure, development/staging/production environments, or deployed service exists in evidence. |
| Monitoring | NOT READY | No configured production monitoring/error logging service or live telemetry is evidenced. |

Passing lint, typecheck and tests establish source-level consistency. They do not establish the Phase 11 definition of done. Do not describe this repository as production-ready until the missing live, native, and operational evidence has been collected.

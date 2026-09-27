# Local development

## Prerequisites

- Node.js 20.6 or later (the API development commands use Node's `--env-file` option)
- pnpm 9 or later
- Docker Desktop with its engine running

## Start the web app

From the repository root, run:

```powershell
pnpm dev
```

This starts the Vite browser app at `http://localhost:5173/` and opens it in your default browser. It shows the shared renderer's empty pixel garden while loading. With the API unavailable, the page displays a clear service error and retry action; it never substitutes sample garden data.

Set `VITE_API_URL` in `.env` to point the browser app at the API. The default is `http://localhost:4000`.

## Start the database and API

From the repository root, in PowerShell:

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev:api
```

`pnpm db:up` starts a local PostgreSQL 16 container with a named volume. The migration command builds the API and applies SQL files from `database/migrations`, recording successful migrations in `schema_migrations`. It is safe to run again; already-recorded migrations are skipped. `pnpm dev:api` builds and starts the PostgreSQL-backed API on port 4000. Check it at `http://localhost:4000/health`. Run `pnpm dev` in a second terminal to open the browser client.

Stop the database with:

```powershell
pnpm db:down
```

The database volume is retained by `db:down`, so data remains for the next `db:up`. To intentionally remove local database contents, run `docker compose down --volumes`.

## Desktop and mobile clients

The desktop UI and native Tauri shell live in `apps/desktop`. Build and launch it with `pnpm --filter @commit-garden/desktop dev:tauri`; a Windows build requires Rust/Cargo, Microsoft C++ Build Tools, and WebView2. The client defaults to the API at `http://localhost:4000` and supports changing that address in Settings.

The Expo mobile app has Garden, Progress, History, and Settings tabs. Start Metro with `pnpm --filter @commit-garden/mobile start`; use `pnpm --filter @commit-garden/mobile android` or `ios` with the corresponding native SDK and simulator/device configured. On an Android emulator, set its API address to `http://10.0.2.2:4000`; a physical phone needs an API address reachable on the local network or over HTTPS.

Mobile OAuth redirects through `commitgarden://oauth`. Set `APP_ALLOWED_RETURN_URLS=commitgarden://oauth` on the API. The callback returns a short-lived one-use code, which the app exchanges for an expiring API session stored in the device keychain/keystore. Configure the GitHub OAuth callback as the API URL, not the mobile scheme.

## Environment variables

Copy `.env.example` to `.env`. Values in the example are local development placeholders and must not be used in a hosted environment.

| Variable | Purpose | Local value / requirement |
|---|---|---|
| `POSTGRES_DB` | Database created by the local PostgreSQL container | `commit_garden` |
| `POSTGRES_USER` | Local database role | `garden` |
| `POSTGRES_PASSWORD` | Local database password | Local-only placeholder; change if the port is exposed beyond this machine |
| `DATABASE_URL` | PostgreSQL connection used by the API and migration command | Must match the three PostgreSQL variables and local port 5432 |
| `PORT` | API listen port | `4000` |
| `CORS_ORIGIN` | Allowed browser/webview origins | Comma-separated origins from `.env.example` |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID | Not required until OAuth is configured |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application secret | Not required until OAuth is configured; keep secret |
| `GITHUB_REDIRECT_URI` | Registered OAuth callback | `http://localhost:4000/auth/github/callback` |
| `SESSION_SECRET` | Secret used to encrypt GitHub tokens and derive session hashes | Replace with a strong random value before enabling sessions |
| `VITE_API_URL` | Browser client API URL | `http://localhost:4000` |
| `APP_BASE_URL` | Default redirect after successful browser OAuth | `http://localhost:5173/` |
| `APP_ALLOWED_ORIGINS` | Additional webview origins allowed as OAuth return targets | Include only the web and Tauri origins you operate |
| `APP_ALLOWED_RETURN_URLS` | Exact custom-scheme OAuth return URLs for native clients | `commitgarden://oauth` |
| `NODE_ENV` | Runtime environment label | `development` |

The API process and migration command read `.env`; Docker Compose reads it for PostgreSQL configuration. `.env` is ignored by Git. Do not commit real credentials.

To enable OAuth, register a GitHub OAuth app with the callback URL above, then replace all three `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` placeholders. `SESSION_SECRET` must be at least 32 characters. The API stores GitHub access tokens encrypted with a key derived from this secret and stores only hashes of session IDs. Changing the secret invalidates sessions and prevents decrypting stored GitHub tokens; provide a token reauthorization path before rotating it.

## Current limits

- Docker Desktop must be running before `pnpm db:up`; this repository does not install or start Docker itself.
- `pnpm dev` launches the browser client. It can display its empty renderer scene without the API, but real garden data requires the PostgreSQL-backed API and a configured GitHub session.
- Desktop and mobile native launch still requires their platform toolchains.
- OAuth variables remain placeholders until a GitHub OAuth app is configured. For mobile sign-in, add the exact `commitgarden://oauth` return URL to the API allowlist.

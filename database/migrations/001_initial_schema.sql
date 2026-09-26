-- GitHub Garden initial relational schema.
-- Application-generated IDs remain text so the API can use deterministic IDs
-- without coupling persistence to a database-specific UUID implementation.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_user_id TEXT NOT NULL UNIQUE,
  github_username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gardens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= current_streak),
  active_weeks INTEGER NOT NULL DEFAULT 0 CHECK (active_weeks >= 0),
  progression_version INTEGER NOT NULL DEFAULT 1 CHECK (progression_version > 0),
  garden_version BIGINT NOT NULL DEFAULT 0 CHECK (garden_version >= 0),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plants (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  growth_stage TEXT NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  health TEXT NOT NULL,
  planted_at TIMESTAMPTZ NOT NULL,
  origin_week INTEGER NOT NULL CHECK (origin_week > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (garden_id, origin_week),
  UNIQUE (garden_id, position_x, position_y)
);

CREATE INDEX plants_garden_id_idx ON plants (garden_id);

CREATE TABLE garden_events (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (garden_id, id)
);

CREATE INDEX garden_events_garden_occurred_idx
  ON garden_events (garden_id, occurred_at DESC);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (garden_id, achievement_id)
);

CREATE TABLE github_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  github_user_id TEXT NOT NULL UNIQUE,
  encrypted_access_token TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  activity_history_hash TEXT NOT NULL,
  progression_version INTEGER NOT NULL CHECK (progression_version > 0),
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE (user_id, activity_history_hash, progression_version)
);

CREATE INDEX sync_runs_garden_started_idx ON sync_runs (garden_id, started_at DESC);

CREATE TABLE device_registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  device_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_type, device_token)
);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
import { createHash } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type {
  Achievement,
  GardenEvent,
  Plant,
  User,
} from "@commit-garden/shared-types";
import type { GardenProgress, GardenView } from "./types.js";
import type {
  GardenRepository,
  GardenTransaction,
  PersistedGarden,
} from "./repository.js";
import type { OAuthStore } from "./auth.js";

export type PostgresRepositoryOptions = {
  readonly connectionString?: string;
  readonly pool?: Pool;
};

type UserRow = QueryResultRow & {
  id: string;
  github_user_id: string;
  github_username: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type GardenRow = QueryResultRow & {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  active_weeks: number;
  progression_version: number;
  garden_version: string | number;
  last_synced_at: Date | string | null;
};

type PlantRow = QueryResultRow & {
  id: string;
  garden_id: string;
  species_id: string;
  growth_stage: Plant["growthStage"];
  position_x: number;
  position_y: number;
  health: Plant["health"];
  planted_at: Date | string;
  origin_week: number;
  metadata: Record<string, unknown>;
};

type EventRow = QueryResultRow & {
  id: string;
  event_type: GardenEvent["type"];
  payload: GardenEvent;
};

type AchievementRow = QueryResultRow & {
  achievement_id: string;
  garden_id: string;
  earned_at: Date | string;
  metadata: Record<string, unknown>;
};

type GardenViewRow = QueryResultRow & {
  user_id: string;
  github_user_id: string;
  github_username: string;
  user_created_at: Date | string;
  user_updated_at: Date | string;
  garden_id: string;
  garden_user_id: string;
  current_streak: number;
  longest_streak: number;
  active_weeks: number;
  progression_version: number;
  garden_version: string | number;
  last_synced_at: Date | string | null;
};

export class PostgresGardenRepository implements GardenRepository, OAuthStore {
  public readonly pool: Pool;

  public constructor(options: PostgresRepositoryOptions = {}) {
    const connectionString =
      options.connectionString ?? process.env["DATABASE_URL"];
    if (!options.pool && !connectionString) {
      throw new Error("DATABASE_URL is required for PostgreSQL persistence.");
    }
    this.pool =
      options.pool ??
      new Pool({ connectionString });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async getGarden(userId: string): Promise<GardenView | null> {
    return this.readGarden(this.pool, userId);
  }

  public async getProgress(userId: string): Promise<GardenProgress | null> {
    const view = await this.getGarden(userId);
    if (!view) return null;
    return {
      currentStreak: view.garden.currentStreak,
      longestStreak: view.garden.longestStreak,
      activeWeeks: view.garden.activeWeeks,
      gardenVersion: view.garden.gardenVersion,
      nextMilestone:
        [1, 5, 8, 12, 16, 20, 26, 52].find(
          (milestone) => milestone > view.garden.activeWeeks,
        ) ?? null,
    };
  }

  public async getEvents(
    userId: string,
  ): Promise<readonly GardenEvent[] | null> {
    const view = await this.getGarden(userId);
    return view?.events ?? null;
  }

  public async getUser(userId: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  public async persistGarden(view: GardenView): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO users (id, github_user_id, github_username, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET github_user_id = EXCLUDED.github_user_id, github_username = EXCLUDED.github_username, updated_at = EXCLUDED.updated_at",
        [view.user.id, view.user.githubUserId, view.user.githubUsername, view.user.createdAt, view.user.updatedAt],
      );
      await client.query(
        "INSERT INTO gardens (id, user_id, current_streak, longest_streak, active_weeks, progression_version, garden_version, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET current_streak = EXCLUDED.current_streak, longest_streak = EXCLUDED.longest_streak, active_weeks = EXCLUDED.active_weeks, progression_version = EXCLUDED.progression_version, garden_version = EXCLUDED.garden_version, last_synced_at = EXCLUDED.last_synced_at, updated_at = now()",
        [view.garden.id, view.garden.userId, view.garden.currentStreak, view.garden.longestStreak, view.garden.activeWeeks, view.garden.progressionVersion, view.garden.gardenVersion, view.garden.lastSyncedAt],
      );
      await persistPlants(client, view.plants);
      await persistEvents(client, view.garden.id, view.events);
      await persistAchievements(client, view.achievements);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async saveGitHubAccount(
    view: GardenView,
    encryptedAccessToken: string,
    scopes: readonly string[],
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const userResult = await client.query<{ id: string }>(
        "INSERT INTO users (id, github_user_id, github_username, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (github_user_id) DO UPDATE SET github_username = EXCLUDED.github_username, updated_at = EXCLUDED.updated_at RETURNING id",
        [view.user.id, view.user.githubUserId, view.user.githubUsername, view.user.createdAt, view.user.updatedAt],
      );
      const persistentUserId =
        userResult.rows[0]?.id ?? view.user.id;
      await client.query(
        "INSERT INTO gardens (id, user_id, current_streak, longest_streak, active_weeks, progression_version, garden_version, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id) DO NOTHING",
        [view.garden.id, persistentUserId, view.garden.currentStreak, view.garden.longestStreak, view.garden.activeWeeks, view.garden.progressionVersion, view.garden.gardenVersion, view.garden.lastSyncedAt],
      );
      await client.query(
        "INSERT INTO github_connections (id, user_id, github_user_id, encrypted_access_token, scopes) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET github_user_id = EXCLUDED.github_user_id, encrypted_access_token = EXCLUDED.encrypted_access_token, scopes = EXCLUDED.scopes, updated_at = now()",
        [`github-connection-${view.user.githubUserId}`, persistentUserId, view.user.githubUserId, encryptedAccessToken, [...scopes]],
      );
      await client.query("COMMIT");
      return persistentUserId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async createSession(
    userId: string,
    sessionHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.pool.query(
      "INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
      [sessionHash, userId, expiresAt],
    );
  }

  public async resolveSession(sessionHash: string): Promise<string | null> {
    const result = await this.pool.query<{ user_id: string }>(
      "SELECT user_id FROM user_sessions WHERE id = $1 AND expires_at > now()",
      [sessionHash],
    );
    return result.rows[0]?.user_id ?? null;
  }

  public async deleteSession(sessionHash: string): Promise<void> {
    await this.pool.query("DELETE FROM user_sessions WHERE id = $1", [sessionHash]);
  }

  public async getEncryptedAccessToken(userId: string): Promise<string | null> {
    const result = await this.pool.query<{ encrypted_access_token: string }>(
      "SELECT encrypted_access_token FROM github_connections WHERE user_id = $1",
      [userId],
    );
    return result.rows[0]?.encrypted_access_token ?? null;
  }

  public async createMobileAuthCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.pool.query(
      "INSERT INTO mobile_auth_codes (code_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [codeHash, userId, expiresAt],
    );
  }

  public async consumeMobileAuthCode(
    codeHash: string,
    now: Date,
  ): Promise<string | null> {
    const result = await this.pool.query<{ user_id: string }>(
      "DELETE FROM mobile_auth_codes WHERE code_hash = $1 AND expires_at > $2 RETURNING user_id",
      [codeHash, now],
    );
    // Remove expired entries too so they cannot accumulate indefinitely.
    await this.pool.query(
      "DELETE FROM mobile_auth_codes WHERE code_hash = $1 AND expires_at <= $2",
      [codeHash, now],
    );
    return result.rows[0]?.user_id ?? null;
  }

  public async transaction<T>(
    userId: string,
    callback: (transaction: GardenTransaction) => Promise<T> | T,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM gardens WHERE user_id = $1 FOR UPDATE", [userId]);
      const garden = await this.readGarden(client, userId);
      if (!garden) throw new Error("Garden not found");
      const transaction: GardenTransaction = {
        getGarden: async () =>
          (await this.readGarden(client, userId)) ?? garden,
        hasAppliedSync: async (activityHistoryHash) => {
          const result = await client.query(
            "SELECT 1 FROM sync_runs WHERE user_id = $1 AND activity_history_hash = $2 AND status = 'COMPLETED' LIMIT 1",
            [userId, activityHistoryHash],
          );
          return result.rowCount !== null && result.rowCount > 0;
        },
        markSyncApplied: async (activityHistoryHash) => {
          const id = `sync-${hash(`${userId}:${activityHistoryHash}`)}`;
          await client.query(
            "INSERT INTO sync_runs (id, user_id, garden_id, activity_history_hash, progression_version, status, completed_at) VALUES ($1, $2, $3, $4, $5, 'COMPLETED', now()) ON CONFLICT (user_id, activity_history_hash, progression_version) DO NOTHING",
            [
              id,
              userId,
              garden.garden.id,
              activityHistoryHash,
              garden.garden.progressionVersion,
            ],
          );
        },
        saveGarden: async (updatedGarden) => {
          await client.query(
            "UPDATE gardens SET current_streak = $1, longest_streak = $2, active_weeks = $3, garden_version = $4, last_synced_at = $5, updated_at = now() WHERE id = $6",
            [
              updatedGarden.currentStreak,
              updatedGarden.longestStreak,
              updatedGarden.activeWeeks,
              updatedGarden.gardenVersion,
              updatedGarden.lastSyncedAt,
              updatedGarden.id,
            ],
          );
        },
        savePlants: async (plants) => {
          await persistPlants(client, plants);
        },
        appendEvents: async (events) => {
          await persistEvents(client, garden.garden.id, events);
        },
        saveAchievements: async (achievements) => {
          await persistAchievements(client, achievements);
        },
      };
      const result = await callback(transaction);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async readGarden(
    executor: Pool | PoolClient,
    userId: string,
  ): Promise<GardenView | null> {
    const result = await executor.query<GardenViewRow>(
      "SELECT u.id AS user_id, u.github_user_id, u.github_username, u.created_at AS user_created_at, u.updated_at AS user_updated_at, g.id AS garden_id, g.user_id AS garden_user_id, g.current_streak, g.longest_streak, g.active_weeks, g.progression_version, g.garden_version, g.last_synced_at FROM users u JOIN gardens g ON g.user_id = u.id WHERE u.id = $1",
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const garden = mapGarden({
      id: row.garden_id,
      user_id: row.garden_user_id,
      current_streak: row.current_streak,
      longest_streak: row.longest_streak,
      active_weeks: row.active_weeks,
      progression_version: row.progression_version,
      garden_version: row.garden_version,
      last_synced_at: row.last_synced_at,
    });
    const plants = await executor.query<PlantRow>(
      "SELECT * FROM plants WHERE garden_id = $1 ORDER BY origin_week ASC",
      [garden.id],
    );
    const events = await executor.query<EventRow>(
      "SELECT id, event_type, payload FROM garden_events WHERE garden_id = $1 ORDER BY occurred_at DESC",
      [garden.id],
    );
    const achievements = await executor.query<AchievementRow>(
      "SELECT achievement_id, garden_id, earned_at, metadata FROM achievements WHERE garden_id = $1 ORDER BY earned_at ASC",
      [garden.id],
    );
    return {
      user: {
        id: row.user_id,
        githubUserId: row.github_user_id,
        githubUsername: row.github_username,
        createdAt: toIso(row.user_created_at),
        updatedAt: toIso(row.user_updated_at),
      },
      garden,
      plants: plants.rows.map(mapPlant),
      events: events.rows.map((event) => event.payload),
      achievements: achievements.rows.map(mapAchievement),
    };
  }
}

async function persistPlants(
  client: PoolClient,
  plants: readonly Plant[],
): Promise<void> {
  for (const plant of plants) {
    await client.query(
      "INSERT INTO plants (id, garden_id, species_id, growth_stage, position_x, position_y, health, planted_at, origin_week, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO UPDATE SET growth_stage = EXCLUDED.growth_stage, position_x = EXCLUDED.position_x, position_y = EXCLUDED.position_y, health = EXCLUDED.health, metadata = EXCLUDED.metadata",
      [plant.id, plant.gardenId, plant.speciesId, plant.growthStage, plant.position.x, plant.position.y, plant.health, plant.plantedAt, plant.originWeek, plant.metadata],
    );
  }
}

async function persistEvents(
  client: PoolClient,
  gardenId: string,
  events: readonly GardenEvent[],
): Promise<void> {
  for (const event of events) {
    const id = `${gardenId}:${hash(JSON.stringify(event))}`;
    await client.query(
      "INSERT INTO garden_events (id, garden_id, event_type, payload, occurred_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
      [id, gardenId, event.type, event, event.occurredAt],
    );
  }
}

async function persistAchievements(
  client: PoolClient,
  achievements: readonly Achievement[],
): Promise<void> {
  for (const achievement of achievements) {
    await client.query(
      "INSERT INTO achievements (id, garden_id, achievement_id, earned_at, metadata) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (garden_id, achievement_id) DO UPDATE SET earned_at = EXCLUDED.earned_at, metadata = EXCLUDED.metadata",
      [`${achievement.gardenId}:${achievement.id}`, achievement.gardenId, achievement.id, achievement.earnedAt, { activeWeeksAtEarning: achievement.activeWeeksAtEarning }],
    );
  }
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    githubUserId: row.github_user_id,
    githubUsername: row.github_username,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapGarden(row: GardenRow): PersistedGarden {
  return {
    id: row.id,
    userId: row.user_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    activeWeeks: row.active_weeks,
    progressionVersion: row.progression_version,
    lastSyncedAt: row.last_synced_at ? toIso(row.last_synced_at) : null,
    gardenVersion: Number(row.garden_version),
  };
}

function mapPlant(row: PlantRow): Plant {
  return {
    id: row.id,
    gardenId: row.garden_id,
    speciesId: row.species_id,
    growthStage: row.growth_stage,
    position: { x: row.position_x, y: row.position_y },
    health: row.health,
    plantedAt: toIso(row.planted_at),
    originWeek: row.origin_week,
    metadata: row.metadata,
  };
}

function mapAchievement(row: AchievementRow): Achievement {
  return {
    id: row.achievement_id,
    gardenId: row.garden_id,
    earnedAt: toIso(row.earned_at),
    activeWeeksAtEarning: Number(row.metadata["activeWeeksAtEarning"] ?? 0),
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

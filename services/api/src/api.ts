import {
  calculateStreak,
  assignPlantPositions,
  deriveEvents,
  generatePlants,
  evaluateAchievements,
} from "@commit-garden/garden-engine";
import type { GardenRepository } from "./repository.js";
import type { ApiRequest, ApiResponse, SyncInput } from "./types.js";
import { GitHubApiError } from "@commit-garden/github-client";

export type ServerSyncActivity = {
  readonly activityHistoryHash: string;
  readonly weeks: SyncInput["weeks"];
};

export type ApiServerOptions = {
  readonly syncContributions?: (
    userId: string,
    now: Date,
  ) => Promise<ServerSyncActivity | null>;
  readonly now?: () => Date;
};

export type Authenticator = (
  request: ApiRequest,
) => string | null | Promise<string | null>;

export type ApiServer = {
  handle(request: ApiRequest): Promise<ApiResponse>;
};

export function createApiServer(
  repository: GardenRepository,
  authenticate: Authenticator,
  options: ApiServerOptions = {},
): ApiServer {
  return {
    async handle(request) {
      if (request.method === "GET" && request.path === "/health") {
        return response(200, { status: "ok", service: "commit-garden-api" });
      }

      const userId = await authenticate(request);
      if (!userId) return response(401, { error: "Authentication required" });

      if (request.method === "GET" && request.path === "/garden") {
        return found(await repository.getGarden(userId));
      }
      if (request.method === "GET" && request.path === "/garden/events") {
        return found(await repository.getEvents(userId));
      }
      if (request.method === "GET" && request.path === "/garden/progress") {
        return found(await repository.getProgress(userId));
      }
      if (request.method === "GET" && request.path === "/user") {
        return found(await repository.getUser(userId));
      }
      if (request.method === "POST" && request.path === "/sync") {
        if (options.syncContributions) {
          const now = options.now?.() ?? new Date();
          try {
            const activity = await options.syncContributions(userId, now);
            if (!activity) {
              return response(409, { error: "Connect GitHub before syncing." });
            }
            return sync(repository, userId, {
              ...activity,
              now: now.toISOString(),
            });
          } catch (error) {
            const status =
              error instanceof GitHubApiError &&
              error.isRateLimit
                ? 429
                : 502;
            return response(status, {
              error:
                status === 429
                  ? "GitHub rate limit reached. Try again later."
                  : "GitHub contribution sync failed.",
              ...(error instanceof GitHubApiError && error.rateLimitResetAt
                ? { retryAt: error.rateLimitResetAt }
                : {}),
            });
          }
        }
        return sync(repository, userId, request.body);
      }
      return response(404, { error: "Route not found" });
    },
  };
}

async function sync(
  repository: GardenRepository,
  userId: string,
  body: unknown,
): Promise<ApiResponse> {
  const input = parseSyncInput(body);
  if (!input) return response(400, { error: "Invalid sync request" });

  try {
    const result = await repository.transaction(userId, async (transaction) => {
      const before = await transaction.getGarden();
      const duplicate = await transaction.hasAppliedSync(
        input.activityHistoryHash,
      );
      if (duplicate) {
        return {
          garden: before,
          createdPlantIds: [],
          createdEventIds: [],
          alreadyApplied: true,
        };
      }

      const streak = calculateStreak(input.weeks, { now: input.now });
      const generated = generatePlants(
        before.garden.id,
        input.weeks,
        before.plants,
      );
      const placed = assignPlantPositions(before.garden.id, [
        ...before.plants,
        ...generated.newPlants,
      ]);
      const afterGarden = {
        ...before.garden,
        currentStreak: streak.currentStreak,
        longestStreak: Math.max(
          before.garden.longestStreak,
          streak.longestStreak,
        ),
        activeWeeks: streak.totalActiveWeeks,
        gardenVersion: before.garden.gardenVersion + 1,
        lastSyncedAt: input.now.toISOString(),
      };
      const after = { ...before, garden: afterGarden, plants: placed.plants };
      const events = deriveEvents(
        { currentStreak: before.garden.currentStreak, plants: before.plants },
        { currentStreak: afterGarden.currentStreak, plants: after.plants },
        { now: input.now },
      );
      const achievementResult = evaluateAchievements(
        streak.totalActiveWeeks,
        afterGarden.id,
        before.achievements,
        { now: input.now },
      );
      await transaction.saveGarden(afterGarden);
      await transaction.savePlants(after.plants);
      await transaction.appendEvents(events);
      await transaction.saveAchievements(achievementResult.newlyEarned);
      await transaction.markSyncApplied(input.activityHistoryHash);
      return {
        garden: {
          ...after,
          achievements: [
            ...before.achievements,
            ...achievementResult.newlyEarned,
          ],
        },
        createdPlantIds: generated.newPlants.map((plant) => plant.id),
        createdEventIds: events.map(
          (event, index) => `${afterGarden.id}:${event.type}:${index}`,
        ),
        createdAchievementIds: achievementResult.newlyEarned.map(
          (achievement) => achievement.id,
        ),
        alreadyApplied: false,
      };
    });
    return response(200, result);
  } catch (error) {
    return response(404, {
      error: error instanceof Error ? error.message : "Sync failed",
    });
  }
}

export async function syncGardenFromHistory(
  repository: GardenRepository,
  userId: string,
  activityHistoryHash: string,
  weeks: SyncInput["weeks"],
  now: Date,
): Promise<ApiResponse> {
  return sync(repository, userId, {
    activityHistoryHash,
    weeks,
    now: now.toISOString(),
  });
}

function parseSyncInput(body: unknown): SyncInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (
    typeof value.activityHistoryHash !== "string" ||
    !Array.isArray(value.weeks)
  )
    return null;
  const now =
    value.now instanceof Date
      ? value.now
      : typeof value.now === "string"
        ? new Date(value.now)
        : null;
  if (!now || Number.isNaN(now.getTime())) return null;
  return {
    activityHistoryHash: value.activityHistoryHash,
    weeks: value.weeks as SyncInput["weeks"],
    now,
  };
}

function found(value: unknown): ApiResponse {
  return value === null
    ? response(404, { error: "Not found" })
    : response(200, value);
}

function response(status: number, body: unknown): ApiResponse {
  return { status, body };
}

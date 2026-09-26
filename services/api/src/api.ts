import {
  calculateStreak,
  assignPlantPositions,
  deriveEvents,
  generatePlants,
} from "@commit-garden/garden-engine";
import type { GardenRepository } from "./repository.js";
import type { ApiRequest, ApiResponse, SyncInput } from "./types.js";

export type Authenticator = (request: ApiRequest) => string | null;

export type ApiServer = {
  handle(request: ApiRequest): Promise<ApiResponse>;
};

export function createApiServer(
  repository: GardenRepository,
  authenticate: Authenticator,
): ApiServer {
  return {
    async handle(request) {
      const userId = authenticate(request);
      if (!userId) return response(401, { error: "Authentication required" });

      if (request.method === "GET" && request.path === "/garden") {
        return found(repository.getGarden(userId));
      }
      if (request.method === "GET" && request.path === "/garden/events") {
        return found(repository.getEvents(userId));
      }
      if (request.method === "GET" && request.path === "/garden/progress") {
        return found(repository.getProgress(userId));
      }
      if (request.method === "GET" && request.path === "/user") {
        return found(repository.getUser(userId));
      }
      if (request.method === "POST" && request.path === "/sync") {
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
    const result = await repository.transaction(userId, (transaction) => {
      const before = transaction.getGarden();
      const duplicate = transaction.hasAppliedSync(input.activityHistoryHash);
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
      transaction.saveGarden(afterGarden);
      transaction.savePlants(after.plants);
      transaction.appendEvents(events);
      transaction.markSyncApplied(input.activityHistoryHash);
      return {
        garden: after,
        createdPlantIds: generated.newPlants.map((plant) => plant.id),
        createdEventIds: events.map(
          (event, index) => `${afterGarden.id}:${event.type}:${index}`,
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

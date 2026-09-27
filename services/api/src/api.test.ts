import { describe, expect, it } from "vitest";
import type { GardenView } from "./types.js";
import { createApiServer } from "./api.js";
import { InMemoryGardenRepository } from "./repository.js";
import { GitHubApiError } from "@commit-garden/github-client";

const initialView: GardenView = {
  user: {
    id: "user-1",
    githubUserId: "github-1",
    githubUsername: "garden-user",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  garden: {
    id: "garden-1",
    userId: "user-1",
    currentStreak: 0,
    longestStreak: 0,
    activeWeeks: 0,
    progressionVersion: 1,
    gardenVersion: 0,
    lastSyncedAt: null,
  },
  plants: [],
  events: [],
  achievements: [],
};

const activeWeek = {
  weekStart: "2026-09-14",
  weekEnd: "2026-09-20",
  activeDays: 1,
  contributionCount: 1,
  isActive: true,
};

function createFixture() {
  const repository = new InMemoryGardenRepository();
  repository.seed(initialView);
  const api = createApiServer(repository, (request) =>
    request.headers?.authorization === "Bearer test" ? "user-1" : null,
  );
  return { repository, api };
}

describe("API foundation", () => {
  it("requires authentication for private routes", async () => {
    const { api } = createFixture();
    const response = await api.handle({ method: "GET", path: "/garden" });
    expect(response.status).toBe(401);
  });

  it("serves the garden, events, progress, and user routes", async () => {
    const { api } = createFixture();
    const request = { headers: { authorization: "Bearer test" } };

    expect(
      (await api.handle({ ...request, method: "GET", path: "/garden" })).status,
    ).toBe(200);
    expect(
      (await api.handle({ ...request, method: "GET", path: "/garden/events" }))
        .status,
    ).toBe(200);
    expect(
      (
        await api.handle({
          ...request,
          method: "GET",
          path: "/garden/progress",
        })
      ).status,
    ).toBe(200);
    expect(
      (await api.handle({ ...request, method: "GET", path: "/user" })).status,
    ).toBe(200);
  });

  it("applies the same sync only once and increments the garden version once", async () => {
    const { api, repository } = createFixture();
    const request = {
      method: "POST" as const,
      path: "/sync",
      headers: { authorization: "Bearer test" },
      body: {
        activityHistoryHash: "history-1",
        weeks: [activeWeek],
        now: "2026-09-27T12:00:00.000Z",
      },
    };

    const first = await api.handle(request);
    const second = await api.handle(request);
    const firstBody = first.body as {
      alreadyApplied: boolean;
      createdPlantIds: string[];
      createdAchievementIds: string[];
    };
    const secondBody = second.body as {
      alreadyApplied: boolean;
      createdPlantIds: string[];
    };
    const view = repository.getGarden("user-1");

    expect(first.status).toBe(200);
    expect(firstBody.alreadyApplied).toBe(false);
    expect(firstBody.createdPlantIds).toHaveLength(1);
    expect(secondBody.alreadyApplied).toBe(true);
    expect(secondBody.createdPlantIds).toHaveLength(0);
    expect(view?.garden.gardenVersion).toBe(1);
    expect(view?.plants).toHaveLength(1);
    expect(firstBody.createdAchievementIds).toEqual(["first-week"]);
    expect(view?.achievements.map((achievement) => achievement.id)).toEqual([
      "first-week",
    ]);
  });

  it("uses server-fetched contribution history and reports GitHub rate limits", async () => {
    const repository = new InMemoryGardenRepository();
    repository.seed(initialView);
    const api = createApiServer(
      repository,
      () => "user-1",
      {
        now: () => new Date("2026-09-27T12:00:00.000Z"),
        syncContributions: async () => ({
          activityHistoryHash: "server-history",
          weeks: [activeWeek],
        }),
      },
    );
    const result = await api.handle({
      method: "POST",
      path: "/sync",
      body: { activityHistoryHash: "forged", weeks: [], now: "invalid" },
    });
    expect(result.status).toBe(200);
    expect(repository.getGarden("user-1")?.garden.activeWeeks).toBe(1);

    const limitedApi = createApiServer(repository, () => "user-1", {
      syncContributions: async () => {
        throw new GitHubApiError(
          "rate limited",
          403,
          "2026-09-27T13:00:00.000Z",
          true,
        );
      },
    });
    const limited = await limitedApi.handle({
      method: "POST",
      path: "/sync",
    });
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({
      error: "GitHub rate limit reached. Try again later.",
      retryAt: "2026-09-27T13:00:00.000Z",
    });
  });

  it("rolls back a failed transaction", async () => {
    const { repository } = createFixture();
    await expect(
      repository.transaction("user-1", async (transaction) => {
        await transaction.saveGarden({
          ...initialView.garden,
          gardenVersion: 99,
        });
        throw new Error("forced failure");
      }),
    ).rejects.toThrow("forced failure");

    expect(repository.getGarden("user-1")?.garden.gardenVersion).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildGitHubOAuthUrl,
  createContributionSyncPlan,
  createGitHubOAuthUrl,
  exchangeCodeForToken,
  reconstructGardenFromGitHubHistory,
} from "./index.js";

describe("github-client auth", () => {
  it("builds a minimal GitHub OAuth URL without exposing secrets", () => {
    const url = buildGitHubOAuthUrl({
      clientId: "abc123",
      redirectUri: "http://localhost:3001/auth/callback",
      scopes: ["read:user"],
      state: "garden-state",
    });

    expect(url).toContain("https://github.com/login/oauth/authorize");
    expect(url).toContain("client_id=abc123");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fcallback",
    );
    expect(url).toContain("scope=read%3Auser");
    expect(url).toContain("state=garden-state");
    expect(url).not.toContain("secret");
  });

  it("rejects incomplete OAuth exchanges", async () => {
    await expect(
      exchangeCodeForToken({
        code: "",
        clientId: "abc123",
        clientSecret: "secret",
        redirectUri: "http://localhost:3001/auth/callback",
      }),
    ).rejects.toThrow();
  });
});

describe("github-client contribution sync", () => {
  it("normalizes historical contribution days into weekly summaries and a stable history hash", () => {
    const plan = createContributionSyncPlan(
      [
        { date: "2026-09-14", contributionCount: 2, hasActivity: true },
        { date: "2026-09-15", contributionCount: 1, hasActivity: true },
        { date: "2026-09-16", contributionCount: 0, hasActivity: false },
        { date: "2026-09-17", contributionCount: 3, hasActivity: true },
      ],
      { now: new Date("2026-09-27T12:00:00.000Z") },
    );

    expect(plan.dailyActivity).toHaveLength(4);
    expect(plan.weeklyActivity).toHaveLength(1);
    expect(plan.weeklyActivity[0]?.isActive).toBe(true);
    expect(plan.activityHistoryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.streak.currentStreak).toBeGreaterThanOrEqual(1);
  });

  it("reconstructs an initial garden state from historical GitHub activity", () => {
    const snapshot = reconstructGardenFromGitHubHistory(
      "garden-42",
      "user-42",
      [
        { date: "2026-09-14", contributionCount: 1, hasActivity: true },
        { date: "2026-09-21", contributionCount: 1, hasActivity: true },
      ],
      { now: new Date("2026-09-27T12:00:00.000Z") },
    );

    expect(snapshot.garden.id).toBe("garden-42");
    expect(snapshot.garden.userId).toBe("user-42");
    expect(snapshot.plants.length).toBeGreaterThanOrEqual(0);
    expect(snapshot.events).toEqual(expect.any(Array));
  });
});

it("exposes the canonical OAuth factory under the expected name", () => {
  const url = createGitHubOAuthUrl({
    clientId: "xyz",
    redirectUri: "http://localhost:3000/callback",
  });

  expect(url).toContain("client_id=xyz");
});

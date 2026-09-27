import { describe, expect, it } from "vitest";
import { request, type IncomingMessage } from "node:http";
import { createHash } from "node:crypto";
import { InMemoryGardenRepository } from "./repository.js";
import { createHttpServer } from "./runtime.js";
import { GitHubOAuthController } from "./auth.js";
import { syncGardenFromHistory } from "./api.js";
import type { GardenView } from "./types.js";

const canonicalGarden: GardenView = {
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

describe("API HTTP runtime", () => {
  it("serves health and authenticated garden routes over HTTP", async () => {
    const server = createHttpServer(new InMemoryGardenRepository(), {
      authenticate: (token) => (token === "test-token" ? "user-1" : null),
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const health = await getJson(address.port, "/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok", service: "commit-garden-api" });

    const unauthorized = await getJson(address.port, "/garden");
    expect(unauthorized.status).toBe(401);

    const authorized = await getJson(address.port, "/garden", "test-token");
    expect(authorized.status).toBe(404);

    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("validates malformed JSON and returns CORS headers", async () => {
    const server = createHttpServer(new InMemoryGardenRepository(), {
      authenticate: (token) => (token === "test-token" ? "user-1" : null),
      corsOrigin: "*",
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const result = await postJson(
      address.port,
      "/sync",
      "{broken",
      "test-token",
    );
    expect(result.status).toBe(400);
    expect(result.headers["access-control-allow-origin"]).toBe("*");

    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("exchanges a mobile one-time code for an API bearer session", async () => {
    const repository = new InMemoryGardenRepository();
    const code = "a".repeat(43);
    await repository.createMobileAuthCode(
      "user-1",
      createHash("sha256").update(code).digest("hex"),
      new Date(Date.now() + 60_000),
    );
    const oauth = new GitHubOAuthController(repository, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost:4000/auth/github/callback",
      sessionSecret: "a-test-session-secret-that-is-long-enough-123",
    });
    const server = createHttpServer(repository, { oauth });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const exchange = await postJson(
      address.port,
      "/auth/mobile/session",
      JSON.stringify({ code }),
    );
    expect(exchange.status).toBe(200);
    const token = (exchange.body as { token: string }).token;
    expect((await getJson(address.port, "/garden", token)).status).toBe(404);

    await postJson(address.port, "/auth/logout", "", token);
    expect((await getJson(address.port, "/garden", token)).status).toBe(401);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("serves one canonical garden to web cookie and mobile bearer sessions", async () => {
    const repository = new InMemoryGardenRepository();
    await repository.persistGarden(canonicalGarden);
    await repository.createSession(
      "user-1",
      createHash("sha256").update("web-session").digest("hex"),
      new Date(Date.now() + 60_000),
    );
    await repository.createSession(
      "user-1",
      createHash("sha256").update("mobile-session").digest("hex"),
      new Date(Date.now() + 60_000),
    );
    const oauth = new GitHubOAuthController(repository, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost:4000/auth/github/callback",
      sessionSecret: "a-test-session-secret-that-is-long-enough-123",
      secureCookies: false,
    });
    const server = createHttpServer(repository, { oauth });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const webGarden = await getJson(address.port, "/garden", undefined, "garden_session=web-session");
    const mobileGarden = await getJson(address.port, "/garden", "mobile-session");
    expect(webGarden.status).toBe(200);
    expect(mobileGarden.status).toBe(200);
    expect(webGarden.body).toEqual(mobileGarden.body);
    expect((webGarden.body as GardenView).garden.id).toBe("garden-1");

    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("runs a deterministic OAuth, history import, and garden generation journey", async () => {
    const repository = new InMemoryGardenRepository();
    const oauth = new GitHubOAuthController(repository, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost:4000/auth/github/callback",
      sessionSecret: "a-test-session-secret-that-is-long-enough-123",
      allowedReturnUrls: ["commitgarden://oauth"],
      secureCookies: false,
      fetchImpl: async (input) => {
        if (String(input).includes("login/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: "fixture-token", scope: "read:user" }), { status: 200 });
        }
        return new Response(JSON.stringify({ id: 7123, login: "fixture-gardener" }), { status: 200 });
      },
      onAuthenticated: async (userId, now) => {
        const imported = await syncGardenFromHistory(
          repository,
          userId,
          "fixture-history-v1",
          [{
            weekStart: "2026-09-14",
            weekEnd: "2026-09-20",
            activeDays: 2,
            contributionCount: 3,
            isActive: true,
          }],
          now,
        );
        if (imported.status !== 200) throw new Error("Fixture history import failed");
      },
    });
    const server = createHttpServer(repository, { oauth });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const start = await getJson(
      address.port,
      "/auth/github?return_to=commitgarden%3A%2F%2Foauth",
    );
    expect(start.status).toBe(302);
    const setCookies = start.headers["set-cookie"];
    if (!Array.isArray(setCookies)) throw new Error("OAuth state cookies missing");
    const stateCookie = setCookies
      .map((value) => value.split(";")[0])
      .join("; ");
    const state = new URL(String(start.headers.location)).searchParams.get("state");
    if (!state) throw new Error("OAuth state missing");

    const callback = await getJson(
      address.port,
      `/auth/github/callback?code=fixture-code&state=${encodeURIComponent(state)}`,
      undefined,
      stateCookie,
    );
    expect(callback.status).toBe(302);
    const callbackUrl = new URL(String(callback.headers.location));
    expect(callbackUrl.protocol).toBe("commitgarden:");
    expect(callbackUrl.searchParams.get("gardenSync")).toBe("complete");
    const mobileCode = callbackUrl.searchParams.get("code");
    if (!mobileCode) throw new Error("Mobile exchange code missing");

    const session = await postJson(
      address.port,
      "/auth/mobile/session",
      JSON.stringify({ code: mobileCode }),
    );
    expect(session.status).toBe(200);
    const token = (session.body as { token: string }).token;
    const gardenResponse = await getJson(address.port, "/garden", token);
    expect(gardenResponse.status).toBe(200);
    const garden = gardenResponse.body as GardenView;
    expect(garden.user.githubUsername).toBe("fixture-gardener");
    expect(garden.garden.activeWeeks).toBe(1);
    expect(garden.garden.gardenVersion).toBe(1);
    expect(garden.garden.lastSyncedAt).not.toBeNull();
    expect(garden.plants.length).toBeGreaterThan(0);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
});

function getJson(
  port: number,
  path: string,
  token?: string,
  cookie?: string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const headers = token || cookie
      ? {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { cookie } : {}),
        }
      : undefined;
    const requestOptions = {
      hostname: "127.0.0.1",
      port,
      path,
      method: "GET",
      headers,
    };
    const clientRequest = request(requestOptions, (response) =>
      collectResponse(response, resolve),
    );
    clientRequest.on("error", reject);
    clientRequest.end();
  });
}

function postJson(
  port: number,
  path: string,
  body: string,
  token?: string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const clientRequest = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => collectResponse(response, resolve),
    );
    clientRequest.on("error", reject);
    clientRequest.end(body);
  });
}

type HttpResult = {
  readonly status: number | undefined;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: unknown;
};

function collectResponse(
  response: IncomingMessage,
  resolve: (result: HttpResult) => void,
): void {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer) => chunks.push(chunk));
  response.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    resolve({
      status: response.statusCode,
      headers: response.headers,
      body: raw ? JSON.parse(raw) : null,
    });
  });
}

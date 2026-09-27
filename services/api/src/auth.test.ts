import { describe, expect, it } from "vitest";
import { InMemoryGardenRepository } from "./repository.js";
import { decryptGitHubToken, GitHubOAuthController } from "./auth.js";

describe("GitHub OAuth controller", () => {
  it("validates state, stores an encrypted token, establishes a session, and logs out", async () => {
    const repository = new InMemoryGardenRepository();
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url === "https://github.com/login/oauth/access_token") {
        return Response.json({
          access_token: "private-github-token",
          token_type: "bearer",
          scope: "read:user",
        });
      }
      if (url === "https://api.github.com/user") {
        return Response.json({ id: 452, login: "garden-user" });
      }
      return new Response(null, { status: 404 });
    };
    let initialSyncUser: string | null = null;
    const controller = new GitHubOAuthController(repository, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://garden.example/auth/github/callback",
      successRedirect: "https://garden.example/",
      sessionSecret: "a-test-session-secret-that-is-long-enough-123",
      secureCookies: true,
      fetchImpl,
      onAuthenticated: async (userId) => {
        initialSyncUser = userId;
      },
    });

    const start = await controller.handle({
      method: "GET",
      url: "/auth/github",
      headers: {},
    });
    expect(start?.status).toBe(302);
    const authorizeUrl = new URL(String(start?.headers["location"]));
    expect(authorizeUrl.hostname).toBe("github.com");
    expect(authorizeUrl.searchParams.get("scope")).toBe("read:user");
    const stateCookie = String(start?.headers["set-cookie"])
      .split(";")[0]
      ?.replace("github_oauth_state=", "");
    const state = authorizeUrl.searchParams.get("state");
    expect(state).toBeTruthy();

    const rejected = await controller.handle({
      method: "GET",
      url: "/auth/github/callback?code=code&state=wrong",
      headers: { cookie: `github_oauth_state=${stateCookie}` },
    });
    expect(rejected?.status).toBe(400);

    const callback = await controller.handle({
      method: "GET",
      url: `/auth/github/callback?code=code&state=${state}`,
      headers: { cookie: `github_oauth_state=${stateCookie}` },
    });
    expect(callback?.status).toBe(302);
    expect(initialSyncUser).toBe("github-452");
    expect(new URL(String(callback?.headers["location"])).searchParams.get("gardenSync")).toBe("complete");
    const sessionCookie = String(callback?.headers["set-cookie"])
      .split(",")
      .find((value) => value.includes("garden_session="));
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Secure");
    const rawSession = sessionCookie
      ?.split(";")[0]
      ?.replace("garden_session=", "");
    expect(await controller.resolveCookieSession(`garden_session=${rawSession}`)).toBe(
      "github-452",
    );

    const encrypted = await repository.getEncryptedAccessToken("github-452");
    expect(encrypted).not.toContain("private-github-token");
    expect(decryptGitHubToken(encrypted ?? "", "a-test-session-secret-that-is-long-enough-123")).toBe(
      "private-github-token",
    );

    await controller.handle({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: `garden_session=${rawSession}` },
    });
    expect(await controller.resolveCookieSession(`garden_session=${rawSession}`)).toBeNull();
  });

  it("exchanges an allowlisted mobile callback for a one-use bearer session", async () => {
    const repository = new InMemoryGardenRepository();
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input) === "https://github.com/login/oauth/access_token") {
        return Response.json({ access_token: "github-token", token_type: "bearer", scope: "read:user" });
      }
      if (String(input) === "https://api.github.com/user") {
        return Response.json({ id: 452, login: "garden-user" });
      }
      return new Response(null, { status: 404 });
    };
    const controller = new GitHubOAuthController(repository, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://garden.example/auth/github/callback",
      successRedirect: "https://garden.example/",
      allowedReturnUrls: ["commitgarden://oauth"],
      sessionSecret: "a-test-session-secret-that-is-long-enough-123",
      fetchImpl,
    });

    const start = await controller.handle({
      method: "GET",
      url: "/auth/github?return_to=commitgarden%3A%2F%2Foauth",
      headers: {},
    });
    const authUrl = new URL(String(start?.headers["location"]));
    const cookies = start?.headers["set-cookie"] as readonly string[];
    const stateCookie = cookies.find((value) => value.startsWith("github_oauth_state="));
    const returnCookie = cookies.find((value) => value.startsWith("garden_return_to="));
    const state = authUrl.searchParams.get("state");
    expect(stateCookie).toBeTruthy();
    expect(returnCookie).toBeTruthy();

    const callback = await controller.handle({
      method: "GET",
      url: `/auth/github/callback?code=code&state=${state}`,
      headers: {
        cookie: `${stateCookie?.split(";")[0]}; ${returnCookie?.split(";")[0]}`,
      },
    });
    const redirect = new URL(String(callback?.headers["location"]));
    expect(redirect.protocol).toBe("commitgarden:");
    const code = redirect.searchParams.get("code");
    expect(code).toBeTruthy();

    const exchange = await controller.handle({
      method: "POST",
      url: "/auth/mobile/session",
      headers: {},
      body: { code },
    });
    expect(exchange?.status).toBe(200);
    const token = (exchange?.body as { token: string }).token;
    expect(await controller.resolveSession(token)).toBe("github-452");
    const replay = await controller.handle({
      method: "POST",
      url: "/auth/mobile/session",
      headers: {},
      body: { code },
    });
    expect(replay?.status).toBe(401);
    await controller.handle({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(await controller.resolveSession(token)).toBeNull();
  });
});

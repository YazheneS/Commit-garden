import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { GardenView } from "./types.js";
import type { User } from "@commit-garden/shared-types";
import { createGitHubOAuthUrl, exchangeCodeForToken } from "@commit-garden/github-client";

export type OAuthStore = {
  saveGitHubAccount(
    view: GardenView,
    encryptedAccessToken: string,
    scopes: readonly string[],
  ): Promise<string>;
  createSession(userId: string, sessionHash: string, expiresAt: Date): Promise<void>;
  resolveSession(sessionHash: string): Promise<string | null>;
  deleteSession(sessionHash: string): Promise<void>;
  getEncryptedAccessToken(userId: string): Promise<string | null>;
  createMobileAuthCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void>;
  consumeMobileAuthCode(codeHash: string, now: Date): Promise<string | null>;
};

export type GitHubOAuthConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly successRedirect?: string;
  readonly allowedReturnOrigins?: readonly string[];
  readonly allowedReturnUrls?: readonly string[];
  readonly onAuthenticated?: (userId: string, now: Date) => Promise<void>;
  readonly sessionSecret: string;
  readonly secureCookies?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
};

export type AuthHttpRequest = {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: unknown;
};

export type AuthHttpResponse = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | readonly string[]>>;
  readonly body: unknown;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const STATE_TTL_SECONDS = 10 * 60;

export class GitHubOAuthController {
  private readonly now: () => Date;
  private readonly fetchImpl: typeof fetch;
  private readonly encryptionKey: Buffer;

  public constructor(
    private readonly store: OAuthStore,
    private readonly config: GitHubOAuthConfig,
  ) {
    if (!config.clientId.trim() || !config.clientSecret.trim()) {
      throw new Error("GitHub OAuth client credentials are required.");
    }
    if (config.sessionSecret.length < 32) {
      throw new Error("SESSION_SECRET must contain at least 32 characters.");
    }
    this.now = config.now ?? (() => new Date());
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.encryptionKey = createHash("sha256")
      .update(config.sessionSecret)
      .digest();
  }

  public async handle(request: AuthHttpRequest): Promise<AuthHttpResponse | null> {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET" && url.pathname === "/auth/github") {
      const state = randomBytes(32).toString("base64url");
      const returnTo = this.resolveReturnTarget(
        url.searchParams.get("return_to"),
      );
      return {
        status: 302,
        headers: {
          location: createGitHubOAuthUrl({
            clientId: this.config.clientId,
            redirectUri: this.config.redirectUri,
            scopes: ["read:user"],
            state,
          }),
          "set-cookie": [
            cookie("github_oauth_state", state, {
              secure: this.secureCookies,
              maxAge: STATE_TTL_SECONDS,
              path: "/auth/github/callback",
            }),
            cookie("garden_return_to", returnTo, {
              secure: this.secureCookies,
              maxAge: STATE_TTL_SECONDS,
              path: "/auth/github/callback",
            }),
          ],
          "cache-control": "no-store",
        },
        body: null,
      };
    }

    if (request.method === "GET" && url.pathname === "/auth/github/callback") {
      return this.callback(url, request.headers["cookie"] ?? "");
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      const bearer = request.headers["authorization"]?.startsWith("Bearer ")
        ? request.headers["authorization"].slice(7)
        : null;
      const sessionId = readCookie(request.headers["cookie"] ?? "", "garden_session") ?? bearer;
      if (sessionId) await this.store.deleteSession(sessionHash(sessionId));
      return {
        status: 204,
        headers: {
          "set-cookie": cookie("garden_session", "", {
            secure: this.secureCookies,
            maxAge: 0,
            path: "/",
            sameSite: "None",
          }),
          "cache-control": "no-store",
        },
        body: null,
      };
    }

    if (request.method === "POST" && url.pathname === "/auth/mobile/session") {
      const code = request.body && typeof request.body === "object"
        ? (request.body as Record<string, unknown>)["code"]
        : null;
      if (typeof code !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(code)) {
        return authError(400, "Invalid mobile sign-in code", []);
      }
      const now = this.now();
      const userId = await this.store.consumeMobileAuthCode(sessionHash(code), now);
      if (!userId) return authError(401, "Mobile sign-in code expired or already used", []);
      const sessionId = randomBytes(32).toString("base64url");
      const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
      await this.store.createSession(userId, sessionHash(sessionId), expiresAt);
      return {
        status: 200,
        headers: { "cache-control": "no-store" },
        body: { token: sessionId, expiresAt: expiresAt.toISOString() },
      };
    }

    return null;
  }

  public async resolveSession(sessionId: string): Promise<string | null> {
    return this.store.resolveSession(sessionHash(sessionId));
  }

  public async resolveCookieSession(cookieHeader: string): Promise<string | null> {
    const sessionId = readCookie(cookieHeader, "garden_session");
    return sessionId ? this.resolveSession(sessionId) : null;
  }

  private async callback(url: URL, rawCookie: string): Promise<AuthHttpResponse> {
    const state = url.searchParams.get("state") ?? "";
    const stateCookie = readCookie(rawCookie, "github_oauth_state") ?? "";
    const clearState = cookie("github_oauth_state", "", {
      secure: this.secureCookies,
      maxAge: 0,
      path: "/auth/github/callback",
    });
    const clearReturnTo = cookie("garden_return_to", "", {
      secure: this.secureCookies,
      maxAge: 0,
      path: "/auth/github/callback",
    });
    if (!state || !stateCookie || !safeEqual(state, stateCookie)) {
      return authError(400, "OAuth state validation failed", [clearState, clearReturnTo]);
    }
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error")) {
      return authError(400, "GitHub authorization was not completed", [clearState, clearReturnTo]);
    }

    try {
      const token = await exchangeCodeForToken(
        {
          code,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          redirectUri: this.config.redirectUri,
        },
        this.fetchImpl,
      );
      const profileResponse = await this.fetchImpl("https://api.github.com/user", {
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      });
      if (!profileResponse.ok) {
        throw new Error(`GitHub profile request failed (${profileResponse.status}).`);
      }
      const profile: unknown = await profileResponse.json();
      if (!isGitHubProfile(profile)) throw new Error("GitHub returned an invalid profile.");

      const now = this.now();
      const user: User = {
        id: `github-${profile.id}`,
        githubUserId: String(profile.id),
        githubUsername: profile.login,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      const view: GardenView = {
        user,
        garden: {
          id: `garden-${profile.id}`,
          userId: user.id,
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
      const persistentUserId = await this.store.saveGitHubAccount(
        view,
        encryptToken(token.accessToken, this.encryptionKey),
        token.scope?.split(/\s+/).filter(Boolean) ?? [],
      );

      const sessionId = randomBytes(32).toString("base64url");
      await this.store.createSession(
        persistentUserId,
        sessionHash(sessionId),
        new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
      );
      let syncState: "complete" | "pending" = "pending";
      if (this.config.onAuthenticated) {
        try {
          await this.config.onAuthenticated(persistentUserId, now);
          syncState = "complete";
        } catch {
          // Authentication remains valid; the client can retry synchronization.
        }
      }
      const successUrl = new URL(
        this.resolveReturnTarget(readCookie(rawCookie, "garden_return_to")),
        "http://localhost",
      );
      const returnTarget = this.resolveReturnTarget(
        readCookie(rawCookie, "garden_return_to"),
      );
      const isMobileReturn =
        this.config.allowedReturnUrls?.includes(returnTarget) ?? false;
      if (isMobileReturn) {
        const code = randomBytes(32).toString("base64url");
        await this.store.createMobileAuthCode(
          persistentUserId,
          sessionHash(code),
          new Date(now.getTime() + 60_000),
        );
        successUrl.searchParams.set("code", code);
      }
      successUrl.searchParams.set("gardenSync", syncState);
      return {
        status: 302,
        headers: {
          location: this.config.successRedirect || isMobileReturn
            ? successUrl.toString()
            : `${successUrl.pathname}${successUrl.search}${successUrl.hash}`,
          "set-cookie": [
            clearState,
            clearReturnTo,
            cookie("garden_session", sessionId, {
              secure: this.secureCookies,
              maxAge: SESSION_TTL_SECONDS,
              path: "/",
              sameSite: "None",
            }),
          ],
          "cache-control": "no-store",
        },
        body: null,
      };
    } catch {
      return authError(502, "GitHub sign-in could not be completed", [clearState, clearReturnTo]);
    }
  }

  private get secureCookies(): boolean {
    return this.config.secureCookies ?? true;
  }

  private resolveReturnTarget(value: string | null): string {
    const fallback = this.config.successRedirect ?? "/";
    if (!value) return fallback;
    try {
      const target = new URL(value, "http://localhost");
      const fallbackUrl = new URL(fallback, "http://localhost");
      const allowedOrigins = new Set([
        fallbackUrl.origin,
        ...(this.config.allowedReturnOrigins ?? []),
      ]);
      const exactAllowedUrl = (this.config.allowedReturnUrls ?? []).includes(
        target.toString(),
      );
      if (
        (!allowedOrigins.has(target.origin) && !exactAllowedUrl) ||
        !["http:", "https:", "tauri:", "commitgarden:"].includes(target.protocol) ||
        target.username.length > 0 ||
        target.password.length > 0
      ) {
        return fallback;
      }
      return target.toString();
    } catch {
      return fallback;
    }
  }
}

export function decryptGitHubToken(
  encrypted: string,
  sessionSecret: string,
): string {
  const [ivText, tagText, dataText] = encrypted.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Invalid encrypted token format.");
  const key = createHash("sha256").update(sessionSecret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

function sessionHash(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

function readCookie(header: string, name: string): string | null {
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(entry.slice(separator + 1).trim());
  }
  return null;
}

function cookie(
  name: string,
  value: string,
  options: {
    readonly secure: boolean;
    readonly maxAge: number;
    readonly path: string;
    readonly sameSite?: "Lax" | "None";
  },
): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=${options.sameSite ?? "Lax"}; Path=${options.path}; Max-Age=${options.maxAge}${options.secure ? "; Secure" : ""}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash) && left === right;
}

function isGitHubProfile(value: unknown): value is { id: number; login: string } {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return Number.isSafeInteger(profile["id"]) && typeof profile["login"] === "string";
}

function authError(
  status: number,
  message: string,
  clearCookies: readonly string[],
): AuthHttpResponse {
  return {
    status,
    headers: {
      "set-cookie": clearCookies,
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
    body: { error: message },
  };
}

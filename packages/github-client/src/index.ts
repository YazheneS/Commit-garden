import { createHash } from "node:crypto";
import {
  calculateStreak,
  generatePlants,
  normalizeActivity,
} from "@commit-garden/garden-engine";
import type {
  DailyActivity,
  Garden,
  Plant,
  User,
  WeeklyActivity,
} from "@commit-garden/shared-types";

export type GitHubOAuthUrlOptions = {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes?: readonly string[];
  readonly state?: string;
  readonly allowSignup?: boolean;
};

export type GitHubTokenExchangeRequest = {
  readonly code: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri?: string;
  readonly state?: string;
};

export type GitHubTokenResponse = {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly scope?: string;
  readonly expiresIn?: number;
  readonly refreshToken?: string;
};

export class GitHubApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimitResetAt?: string,
    public readonly isRateLimit = status === 429,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export type GitHubContributionQuery = {
  readonly username: string;
  readonly accessToken: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly fetchImpl?: typeof fetch;
};

export type ContributionSyncOptions = {
  readonly now?: Date;
};

export type ContributionSyncPlan = {
  readonly dailyActivity: readonly DailyActivity[];
  readonly weeklyActivity: readonly WeeklyActivity[];
  readonly activityHistoryHash: string;
  readonly streak: {
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly totalActiveWeeks: number;
  };
};

export type ReconstructedGardenSnapshot = {
  readonly user: User;
  readonly garden: Garden & { readonly gardenVersion: number };
  readonly plants: readonly Plant[];
  readonly events: readonly unknown[];
  readonly achievements: readonly unknown[];
  readonly activityHistoryHash: string;
  readonly weeklyActivity: readonly WeeklyActivity[];
};

export function createGitHubOAuthUrl(options: GitHubOAuthUrlOptions): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
  });

  const scopes = options.scopes?.filter((scope) => scope.trim().length > 0);
  if (scopes && scopes.length > 0) {
    params.set("scope", scopes.join(" "));
  }
  if (options.state) {
    params.set("state", options.state);
  }
  if (options.allowSignup !== undefined) {
    params.set("allow_signup", String(Boolean(options.allowSignup)));
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export const buildGitHubOAuthUrl = createGitHubOAuthUrl;

export async function exchangeCodeForToken(
  request: GitHubTokenExchangeRequest,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<GitHubTokenResponse> {
  const code = request.code?.trim();
  const clientId = request.clientId?.trim();
  const clientSecret = request.clientSecret?.trim();

  if (!code || !clientId || !clientSecret) {
    throw new Error(
      "GitHub OAuth exchange requires a non-empty code, clientId, and clientSecret.",
    );
  }

  const response = await fetchImpl(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: request.redirectUri,
        state: request.state,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub OAuth token exchange failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as Record<string, unknown> & {
    error?: string;
    error_description?: string;
  };

  if (payload.error) {
    throw new Error(payload.error_description ?? payload.error);
  }

  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;

  if (!accessToken) {
    throw new Error("GitHub OAuth exchange did not return an access token.");
  }

  return {
    accessToken,
    tokenType:
      typeof payload.token_type === "string" ? payload.token_type : "bearer",
    ...(typeof payload.scope === "string" ? { scope: payload.scope } : {}),
    ...(typeof payload.expires_in === "number"
      ? { expiresIn: payload.expires_in }
      : {}),
    ...(typeof payload.refresh_token === "string"
      ? { refreshToken: payload.refresh_token }
      : {}),
  } satisfies GitHubTokenResponse;
}

export async function fetchGitHubContributionData(
  options: GitHubContributionQuery,
): Promise<DailyActivity[]> {
  const username = options.username?.trim();
  if (!username) {
    throw new Error("GitHub contribution retrieval requires a username.");
  }
  if (!options.accessToken?.trim()) {
    throw new Error("GitHub contribution retrieval requires an access token.");
  }

  const fetcher = options.fetchImpl ?? globalThis.fetch;
  if (!fetcher) {
    throw new Error("No fetch implementation available for GitHub API access.");
  }

  const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`;
  const response = await fetcher("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  if (!response.ok) {
    const reset = response.headers.get("x-ratelimit-reset");
    const resetSeconds = reset ? Number(reset) : Number.NaN;
    const resetDate = new Date(resetSeconds * 1000);
    const rateLimitResetAt = Number.isFinite(resetDate.getTime())
      ? resetDate.toISOString()
      : undefined;
    throw new GitHubApiError(
      `GitHub contribution query failed with status ${response.status}.`,
      response.status,
      rateLimitResetAt,
      response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0",
    );
  }

  const payload = (await response.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            weeks?: Array<{
              contributionDays?: Array<{
                date: string;
                contributionCount: number;
              }>;
            }>;
          };
        };
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    const message = payload.errors[0]?.message ?? "GitHub GraphQL contribution query failed.";
    if (/rate limit/i.test(message)) {
      throw new GitHubApiError(message, 429, undefined, true);
    }
    throw new GitHubApiError(message, 502);
  }

  const days =
    payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks?.flatMap(
      (week) => week.contributionDays ?? [],
    ) ?? [];

  return days.map((day) => ({
    date: day.date,
    contributionCount: Number(day.contributionCount ?? 0),
    hasActivity: Number(day.contributionCount ?? 0) > 0,
  }));
}

export function createContributionSyncPlan(
  days: readonly DailyActivity[],
  options: ContributionSyncOptions = {},
): ContributionSyncPlan {
  const dailyActivity = [...days]
    .map((day) => ({
      date: day.date,
      contributionCount: Number(day.contributionCount ?? 0),
      hasActivity: Boolean(
        day.hasActivity ?? Number(day.contributionCount ?? 0) > 0,
      ),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const weeklyActivity = normalizeActivity(dailyActivity);
  const now = options.now ?? new Date();
  const streak = calculateStreak(weeklyActivity, { now });
  const activityHistoryHash = createHash("sha256")
    .update(
      JSON.stringify(
        dailyActivity.map((day) => ({
          date: day.date,
          contributionCount: day.contributionCount,
          hasActivity: day.hasActivity,
        })),
      ),
    )
    .digest("hex");

  return {
    dailyActivity,
    weeklyActivity,
    activityHistoryHash,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalActiveWeeks: streak.totalActiveWeeks,
    },
  };
}

export function reconstructGardenFromGitHubHistory(
  gardenId: string,
  userId: string,
  days: readonly DailyActivity[],
  options: ContributionSyncOptions = {},
): ReconstructedGardenSnapshot {
  const plan = createContributionSyncPlan(days, options);
  const now = options.now ?? new Date();
  const generated = generatePlants(gardenId, plan.weeklyActivity, []);

  const user: User = {
    id: userId,
    githubUserId: userId,
    githubUsername: "github-user",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const garden: Garden & { readonly gardenVersion: number } = {
    id: gardenId,
    userId,
    currentStreak: plan.streak.currentStreak,
    longestStreak: plan.streak.longestStreak,
    activeWeeks: plan.streak.totalActiveWeeks,
    progressionVersion: 1,
    gardenVersion: 0,
    lastSyncedAt: now.toISOString(),
  };

  return {
    user,
    garden,
    plants: generated.newPlants,
    events: [],
    achievements: [],
    activityHistoryHash: plan.activityHistoryHash,
    weeklyActivity: plan.weeklyActivity,
  };
}

export { normalizeActivity };

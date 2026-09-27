import { PostgresGardenRepository } from "./postgres.js";
import { startApiServer } from "./runtime.js";
import { GitHubOAuthController } from "./auth.js";
import { decryptGitHubToken } from "./auth.js";
import { syncGardenFromHistory } from "./api.js";
import {
  createContributionSyncPlan,
  fetchGitHubContributionData,
} from "@commit-garden/github-client";

const port = Number(process.env["PORT"] ?? 4000);
const repository = new PostgresGardenRepository();
await repository.pool.query("SELECT 1");
const clientId = process.env["GITHUB_CLIENT_ID"];
const clientSecret = process.env["GITHUB_CLIENT_SECRET"];
const sessionSecret = process.env["SESSION_SECRET"];
const oauthValues = [clientId, clientSecret, sessionSecret];
const oauthConfigured = oauthValues.some(
  (value) => value && !value.startsWith("replace-"),
);
if (
  oauthConfigured &&
  (oauthValues.some((value) => !value || value.startsWith("replace-")) ||
    !clientId?.trim() ||
    !clientSecret?.trim() ||
    !sessionSecret ||
    sessionSecret.length < 32)
) {
  throw new Error("GitHub OAuth requires client ID, client secret, and SESSION_SECRET of at least 32 characters.");
}
const loadSyncActivity = async (userId: string, now: Date) => {
  if (!sessionSecret) return null;
  const [user, encryptedToken] = await Promise.all([
    repository.getUser(userId),
    repository.getEncryptedAccessToken(userId),
  ]);
  if (!user || !encryptedToken) return null;
  const accessToken = decryptGitHubToken(encryptedToken, sessionSecret);
  const days = await fetchGitHubContributionData({
    username: user.githubUsername,
    accessToken,
  });
  const plan = createContributionSyncPlan(days, { now });
  return {
    activityHistoryHash: plan.activityHistoryHash,
    weeks: plan.weeklyActivity,
  };
};
const successRedirect = process.env["APP_BASE_URL"] ?? "http://localhost:5173/";
const allowedReturnOrigins = (process.env["APP_ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedReturnUrls = (process.env["APP_ALLOWED_RETURN_URLS"] ?? "")
  .split(",")
  .map((target) => target.trim())
  .filter(Boolean);
const oauth =
  oauthConfigured && clientId && clientSecret && sessionSecret
    ? new GitHubOAuthController(repository, {
        clientId,
        clientSecret,
        sessionSecret,
        redirectUri:
          process.env["GITHUB_REDIRECT_URI"] ??
          "http://localhost:4000/auth/github/callback",
        successRedirect,
        allowedReturnOrigins,
        allowedReturnUrls,
        onAuthenticated: async (userId, now) => {
          const activity = await loadSyncActivity(userId, now);
          if (!activity) throw new Error("GitHub connection was not persisted.");
          const result = await syncGardenFromHistory(
            repository,
            userId,
            activity.activityHistoryHash,
            activity.weeks,
            now,
          );
          if (result.status !== 200) throw new Error("Initial garden sync failed.");
        },
      })
    : undefined;
const syncContributions = oauth ? loadSyncActivity : undefined;
const server = await startApiServer(repository, port, {
  corsOrigin:
    process.env["CORS_ORIGIN"] ??
    "http://localhost:5173,http://localhost:1420,http://tauri.localhost,https://tauri.localhost,tauri://localhost",
  ...(oauth ? { oauth } : {}),
  ...(syncContributions ? { syncContributions } : {}),
});

console.log(`GitHub Garden API listening on http://localhost:${port}`);

const shutdown = (): void => {
  server.close(() => {
    void repository.close();
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

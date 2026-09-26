/**
 * User identity.
 *
 * Represents a GitHub Garden account. The canonical identifier is `id`;
 * `githubUserId` is the stable numeric ID returned by the GitHub API.
 */
export type User = {
  id: string;
  githubUserId: string;
  githubUsername: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
};

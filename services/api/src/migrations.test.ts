import { describe, expect, it } from "vitest";
import type { Pool, PoolClient } from "pg";
import { runMigrations } from "./migrations.js";

describe("runMigrations", () => {
  it("loads repository migrations and records each applied file", async () => {
    const statements: string[] = [];
    const client = {
      query: async (sql: string) => {
        statements.push(sql);
        return { rows: [], rowCount: 0 };
      },
      release: () => undefined,
    } as unknown as PoolClient;
    const pool = {
      query: async (sql: string) => {
        statements.push(sql);
        return { rows: [], rowCount: sql.startsWith("SELECT") ? 0 : null };
      },
      connect: async () => client,
    } as unknown as Pool;

    await expect(runMigrations(pool)).resolves.toEqual([
      "001_initial_schema.sql",
      "002_user_sessions.sql",
      "003_mobile_auth_codes.sql",
    ]);
    expect(
      statements.some((statement) => statement.includes("CREATE TABLE users")),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("INSERT INTO schema_migrations"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) => statement.includes("CREATE TABLE user_sessions")),
    ).toBe(true);
    expect(
      statements.some((statement) => statement.includes("CREATE TABLE mobile_auth_codes")),
    ).toBe(true);
  });
});

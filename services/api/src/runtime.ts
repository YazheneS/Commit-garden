import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createApiServer, type ServerSyncActivity } from "./api.js";
import type { GardenRepository } from "./repository.js";
import type { ApiRequest, ApiResponse } from "./types.js";
import type { GitHubOAuthController } from "./auth.js";

export type HttpRuntimeOptions = {
  readonly authenticate?: (token: string) => string | null;
  readonly corsOrigin?: string;
  readonly oauth?: GitHubOAuthController;
  readonly syncContributions?: (
    userId: string,
    now: Date,
  ) => Promise<ServerSyncActivity | null>;
  readonly now?: () => Date;
};

export function createHttpServer(
  repository: GardenRepository,
  options: HttpRuntimeOptions = {},
): Server {
  const api = createApiServer(repository, async (request) => {
    const header = request.headers?.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (token !== null) {
      const configuredUser = await options.authenticate?.(token);
      return configuredUser ?? options.oauth?.resolveSession(token) ?? null;
    }
    return options.oauth?.resolveCookieSession(request.headers?.cookie ?? "") ?? null;
  }, {
    ...(options.syncContributions
      ? { syncContributions: options.syncContributions }
      : {}),
    ...(options.now ? { now: options.now } : {}),
  });
  const corsOrigin = options.corsOrigin ?? "http://localhost:5173";

  return createServer((request, response) => {
    void handleHttpRequest(api, request, response, corsOrigin, options.oauth).catch(
      () => {
        if (!response.headersSent) {
          response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
        }
        response.end(JSON.stringify({ error: "Internal server error" }));
      },
    );
  });
}

export async function startApiServer(
  repository: GardenRepository,
  port = Number(process.env["PORT"] ?? 4000),
  options: HttpRuntimeOptions = {},
): Promise<Server> {
  const server = createHttpServer(repository, options);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return server;
}

async function handleHttpRequest(
  api: { handle(request: ApiRequest): Promise<ApiResponse> },
  request: IncomingMessage,
  response: ServerResponse,
  corsOrigin: string,
  oauth?: GitHubOAuthController,
): Promise<void> {
  const allowedOrigins = corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.origin;
  const wildcardOrigin = allowedOrigins.includes("*");
  const originAllowed =
    wildcardOrigin ||
    (typeof requestOrigin === "string" && allowedOrigins.includes(requestOrigin));
  if (originAllowed) {
    response.setHeader(
      "access-control-allow-origin",
      wildcardOrigin ? "*" : (requestOrigin ?? ""),
    );
  }
  if (originAllowed && !wildcardOrigin) {
    response.setHeader("access-control-allow-credentials", "true");
    response.setHeader("vary", "Origin");
  }
  response.setHeader(
    "access-control-allow-headers",
    "authorization, content-type",
  );
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(requestOrigin && !originAllowed ? 403 : 204);
    response.end();
    return;
  }

  const body = request.method === "POST"
    ? await readJsonBody(request)
    : { value: undefined };
  const authResponse = await oauth?.handle({
    method: request.method ?? "GET",
    url: request.url ?? "/",
    headers: toHeaders(request),
    ...(body.value !== undefined ? { body: body.value } : {}),
  });
  if (authResponse) {
    writeApiResponse(response, authResponse);
    return;
  }
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const apiResponse = await api.handle({
    method: request.method === "POST" ? "POST" : "GET",
    path,
    headers: toHeaders(request),
    ...(body.error
      ? { body: body.error }
      : body.value !== undefined
        ? { body: body.value }
        : {}),
  });

  writeApiResponse(response, apiResponse);
}

function writeApiResponse(
  response: ServerResponse,
  apiResponse: ApiResponse,
): void {
  for (const [name, value] of Object.entries(apiResponse.headers ?? {})) {
    response.setHeader(name, value);
  }
  if (!response.hasHeader("content-type")) {
    response.setHeader("content-type", "application/json; charset=utf-8");
  }
  response.writeHead(apiResponse.status);
  if (apiResponse.status === 204 || apiResponse.body === null) {
    response.end();
    return;
  }
  response.end(JSON.stringify(apiResponse.body));
}

function toHeaders(request: IncomingMessage): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers[key] = value;
  }
  return headers;
}

function readJsonBody(
  request: IncomingMessage,
): Promise<{ readonly value?: unknown; readonly error?: unknown }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve({ value: raw ? JSON.parse(raw) : undefined });
      } catch {
        resolve({ error: null });
      }
    });
    request.on("error", () => resolve({ error: null }));
  });
}

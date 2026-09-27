import {
  buildRenderState,
  renderPixelGardenHtml,
} from "@commit-garden/garden-renderer";
import type { Garden, Plant } from "@commit-garden/shared-types";

type ApiGarden = {
  readonly user: { readonly githubUsername: string };
  readonly garden: Garden & { readonly gardenVersion: number };
  readonly plants: readonly Plant[];
  readonly events: readonly { readonly type: string; readonly occurredAt: string }[];
};

type GardenProgress = {
  readonly activeWeeks: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly nextMilestone: number | null;
};

type CachedGarden = {
  readonly garden: ApiGarden;
  readonly progress: GardenProgress;
  readonly cachedAt: string;
};

type DesktopBridge = {
  readonly event?: {
    listen(
      event: string,
      callback: () => void,
    ): Promise<() => void>;
  };
  readonly notification?: {
    isPermissionGranted(): Promise<boolean>;
    requestPermission(): Promise<string>;
    sendNotification(notification: { readonly title: string; readonly body: string }): void;
  };
};

declare global {
  interface Window {
    readonly __TAURI__?: DesktopBridge;
  }
}

const API_BASE_KEY = "commit-garden-api-url";
const CACHE_KEY = "commit-garden-cached-snapshot";
const DEFAULT_API_URL = "http://localhost:4000";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Desktop app root is missing.");

const returnedSync = new URLSearchParams(window.location.search).get("gardenSync");
if (returnedSync) {
  history.replaceState(null, "", window.location.pathname);
  if (returnedSync === "pending") showNotice("Connected to GitHub. Initial garden sync is still pending.");
}

app.innerHTML = `
  <main class="app-shell">
    <header class="top-bar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">✿</span><div><p class="eyebrow">GITHUB GARDEN</p><h1>Your garden</h1></div></div>
      <button id="settings-toggle" class="icon-button" type="button" aria-label="Connection settings" title="Connection settings">•••</button>
    </header>
    <section id="settings" class="settings-panel" hidden>
      <label for="api-url">API address</label>
      <div class="settings-row"><input id="api-url" type="url" spellcheck="false"><button id="save-api-url" class="button button-secondary" type="button">Save</button></div>
      <p>Use the same GitHub Garden API as your other clients.</p>
    </section>
    <section id="garden-content" aria-live="polite"><div class="loading-state"><span class="loader" aria-hidden="true"></span><p>Waking the garden…</p></div></section>
    <footer class="bottom-bar"><span id="connection-state">Connecting…</span><button id="sync-button" class="button button-quiet" type="button" disabled>Sync now</button></footer>
    <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
  </main>
`;

const content = requiredElement<HTMLElement>("#garden-content");
const notice = requiredElement<HTMLElement>("#notice");
const syncButton = requiredElement<HTMLButtonElement>("#sync-button");
const connectionState = requiredElement<HTMLElement>("#connection-state");
const apiInput = requiredElement<HTMLInputElement>("#api-url");
const settingsPanel = requiredElement<HTMLElement>("#settings");
let isSyncing = false;

apiInput.value = getApiBaseUrl();
requiredElement<HTMLButtonElement>("#settings-toggle").addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
});
requiredElement<HTMLButtonElement>("#save-api-url").addEventListener("click", () => {
  try {
    const parsed = new URL(apiInput.value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Use an HTTP or HTTPS API address.");
    }
    localStorage.setItem(API_BASE_KEY, parsed.origin);
    settingsPanel.hidden = true;
    showNotice("API address saved. Refreshing garden…");
    void refreshGarden();
  } catch {
    showNotice("Enter a valid HTTP or HTTPS API address.", true);
  }
});
syncButton.addEventListener("click", () => void syncGarden());

void window.__TAURI__?.event?.listen("garden://sync", () => void syncGarden());
void refreshGarden();
window.addEventListener("focus", () => void refreshGarden());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void refreshGarden();
});
window.setInterval(() => {
  if (!document.hidden) void syncGarden();
}, 30 * 60 * 1000);

async function refreshGarden(): Promise<void> {
  connectionState.textContent = "Connecting…";
  syncButton.disabled = true;
  try {
    const [garden, progress] = await Promise.all([
      request<ApiGarden>("/garden"),
      request<GardenProgress>("/garden/progress"),
    ]);
    const snapshot = { garden, progress, cachedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    renderGarden(snapshot, false);
    connectionState.textContent = "Synced with your garden";
    syncButton.disabled = false;
  } catch (error) {
    const cached = readCache();
    if (cached) {
      renderGarden(cached, true);
      connectionState.textContent = "Offline · showing saved garden";
      syncButton.disabled = false;
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      renderConnectScreen();
      connectionState.textContent = "GitHub not connected";
      return;
    }
    renderError(error instanceof Error ? error.message : "API unavailable");
    connectionState.textContent = "Could not connect";
  }
}

async function syncGarden(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  syncButton.disabled = true;
  syncButton.textContent = "Syncing…";
  try {
    const nextMilestoneBeforeSync = readCache()?.progress.nextMilestone ?? null;
    const response = await fetch(apiUrl("/sync"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string; retryAt?: string } | null;
      const detail = body?.retryAt ? ` Try again after ${new Date(body.retryAt).toLocaleTimeString()}.` : "";
      throw new Error(`${body?.error ?? `Sync failed (${response.status}).`}${detail}`);
    }
    await refreshGarden();
    const updated = readCache();
    if (
      nextMilestoneBeforeSync !== null &&
      updated &&
      updated.progress.activeWeeks >= nextMilestoneBeforeSync
    ) {
      await notifyMilestone(nextMilestoneBeforeSync);
    }
    showNotice("Garden synchronized with GitHub.");
  } catch (error) {
    showNotice(error instanceof Error ? error.message : "Sync failed.", true);
  } finally {
    isSyncing = false;
    syncButton.disabled = false;
    syncButton.textContent = "Sync now";
  }
}

async function notifyMilestone(milestone: number): Promise<void> {
  const notification = window.__TAURI__?.notification;
  if (!notification) return;
  let granted = await notification.isPermissionGranted();
  if (!granted) granted = (await notification.requestPermission()) === "granted";
  if (granted) {
    notification.sendNotification({
      title: "Your garden grew",
      body: `${milestone} active weeks reached. A new garden milestone is in bloom.`,
    });
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: "include" });
  if (!response.ok) throw new ApiError(response.status, `Request failed (${response.status}).`);
  return await response.json() as T;
}

function renderGarden(snapshot: CachedGarden, isOffline: boolean): void {
  const plants = snapshot.garden.plants.map((plant) => ({
    ...plant,
    growthStage: plant.growthStage,
    health: plant.health,
  }));
  const renderState = buildRenderState(plants, { gridWidth: 10, gridHeight: 7 });
  const nextMilestone = snapshot.progress.nextMilestone;
  const weeksToNext = nextMilestone === null
    ? 0
    : Math.max(0, nextMilestone - snapshot.progress.activeWeeks);
  const lastEvent = snapshot.garden.events[0];
  content.innerHTML = `
    <div class="garden-heading"><div><p class="eyebrow">A WORLD THAT GROWS WITH YOU</p><h2>${escapeHtml(snapshot.garden.user.githubUsername)}’s garden</h2></div><span class="sync-dot ${isOffline ? "sync-dot-stale" : ""}" title="${isOffline ? "Offline snapshot" : "Up to date"}"></span></div>
    <div class="garden-frame">${renderPixelGardenHtml(renderState, { className: "desktop-garden", animate: !isOffline })}</div>
    <section class="stats-grid" aria-label="Garden progress">
      <article class="stat-card"><span class="stat-value">${snapshot.progress.currentStreak}</span><span class="stat-label">week streak</span></article>
      <article class="stat-card"><span class="stat-value">${snapshot.progress.activeWeeks}</span><span class="stat-label">active weeks</span></article>
      <article class="stat-card"><span class="stat-value">${weeksToNext}</span><span class="stat-label">weeks to next growth</span></article>
    </section>
    <div class="garden-note">${lastEvent ? escapeHtml(formatEvent(lastEvent.type)) : "Your garden is ready to grow."}${isOffline ? ` · Saved ${new Date(snapshot.cachedAt).toLocaleString()}` : ""}</div>
  `;
}

function renderConnectScreen(): void {
  content.innerHTML = `
    <section class="empty-state"><div class="seed-icon" aria-hidden="true">✿</div><p class="eyebrow">YOUR GARDEN IS WAITING</p><h2>Connect GitHub to grow it</h2><p>We’ll import your contribution history and keep one garden in sync across your devices.</p><button id="connect-github" class="button button-primary" type="button">Connect GitHub</button></section>
  `;
  requiredElement<HTMLButtonElement>("#connect-github").addEventListener("click", () => {
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.assign(`${getApiBaseUrl()}/auth/github?return_to=${returnTo}`);
  });
}

function renderError(message: string): void {
  content.innerHTML = `<section class="empty-state"><div class="seed-icon" aria-hidden="true">⌁</div><p class="eyebrow">GARDEN UNAVAILABLE</p><h2>Couldn’t reach your garden</h2><p>${escapeHtml(message)}</p><button id="retry" class="button button-secondary" type="button">Try again</button></section>`;
  requiredElement<HTMLButtonElement>("#retry").addEventListener("click", () => void refreshGarden());
}

function readCache(): CachedGarden | null {
  try {
    const value = localStorage.getItem(CACHE_KEY);
    return value ? JSON.parse(value) as CachedGarden : null;
  } catch {
    return null;
  }
}

function getApiBaseUrl(): string {
  return localStorage.getItem(API_BASE_KEY) ?? DEFAULT_API_URL;
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl().replace(/\/$/, "")}${path}`;
}

function showNotice(message: string, isError = false): void {
  notice.textContent = message;
  notice.classList.toggle("notice-error", isError);
  notice.hidden = false;
  window.setTimeout(() => { notice.hidden = true; }, 4500);
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing desktop element: ${selector}`);
  return element;
}

function formatEvent(type: string): string {
  return type.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

class ApiError extends Error {
  public constructor(public readonly status: number, message: string) {
    super(message);
  }
}

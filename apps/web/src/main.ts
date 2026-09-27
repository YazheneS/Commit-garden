import type {
  GardenProgress,
  GardenView,
} from "@commit-garden/shared-types";
import { renderPixelGardenHtml } from "@commit-garden/garden-renderer";
import { createCamera } from "@commit-garden/garden-renderer";
import type { Camera } from "@commit-garden/garden-renderer";
import { createGardenRenderState } from "./garden-view.js";
import "./styles.css";

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_URL = normalizeApiUrl(DEFAULT_API_URL);

const app = requireElement<HTMLElement>("#app");
app.innerHTML = `
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Commit Garden home">
        <span class="pixel-mark" aria-hidden="true"></span>
        <span><span class="brand-name">COMMIT GARDEN</span><span class="brand-caption">A little world that grows with you</span></span>
      </a>
      <div class="top-actions">
        <span id="connection-state" class="connection-state" role="status">Starting…</span>
        <button id="connect-button" class="button button-primary" type="button" hidden>Connect GitHub</button>
        <button id="sync-button" class="button button-secondary" type="button" hidden>Sync garden</button>
      </div>
    </header>
    <main>
      <div id="garden-viewport" class="garden-scene-frame" aria-label="Your pixel-art garden">
        <div id="garden-scene" class="garden-scene-canvas"></div>
        <div class="zoom-controls" role="group" aria-label="Garden view controls">
          <button id="zoom-out" type="button" aria-label="Zoom out" title="Zoom out">−</button>
          <output id="zoom-level" aria-live="polite">240%</output>
          <button id="zoom-in" type="button" aria-label="Zoom in" title="Zoom in">+</button>
          <button id="zoom-reset" type="button" aria-label="Reset garden view" title="Reset view">Reset</button>
        </div>
      </div>
      <section id="garden-content" class="garden-content" aria-live="polite" aria-busy="true">
        <div class="loading-card"><span class="loader" aria-hidden="true"></span><p>Waking the garden…</p></div>
      </section>
    </main>
    <footer class="footer-note"><span>YOUR ACTIVITY, ROOTED IN ONE SHARED GARDEN</span><span id="last-sync"></span></footer>
  </div>
`;

const scene = requireElement<HTMLElement>("#garden-scene");
const viewport = requireElement<HTMLElement>("#garden-viewport");
const content = requireElement<HTMLElement>("#garden-content");
const connectionState = requireElement<HTMLElement>("#connection-state");
const connectButton = requireElement<HTMLButtonElement>("#connect-button");
const syncButton = requireElement<HTMLButtonElement>("#sync-button");
const lastSync = requireElement<HTMLElement>("#last-sync");

let isSyncing = false;
const DEFAULT_ZOOM = 2.4;
let camera: Camera = createCamera({ zoom: DEFAULT_ZOOM });
let cameraInitialized = false;
let currentRenderState = createGardenRenderState([]);
let dragPoint: { x: number; y: number } | undefined;
renderScene(createGardenRenderState([]), false);

requireElement<HTMLButtonElement>("#zoom-in").addEventListener("click", () => zoomAtCenter(camera.state.zoom * 1.2));
requireElement<HTMLButtonElement>("#zoom-out").addEventListener("click", () => zoomAtCenter(camera.state.zoom / 1.2));
requireElement<HTMLButtonElement>("#zoom-reset").addEventListener("click", resetCamera);
viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const bounds = viewport.getBoundingClientRect();
  camera = camera.zoomTo(camera.state.zoom * Math.exp(-event.deltaY * 0.001), {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  });
  renderScene(currentRenderState, true);
}, { passive: false });
viewport.addEventListener("pointerdown", (event) => {
  if ((event.target as HTMLElement).closest(".zoom-controls")) return;
  dragPoint = { x: event.clientX, y: event.clientY };
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add("is-panning");
});
viewport.addEventListener("pointermove", (event) => {
  if (!dragPoint) return;
  const dx = event.clientX - dragPoint.x;
  const dy = event.clientY - dragPoint.y;
  dragPoint = { x: event.clientX, y: event.clientY };
  camera = camera.pan(-dx / camera.state.zoom, -dy / camera.state.zoom);
  renderScene(currentRenderState, true);
});
const stopPanning = (): void => { dragPoint = undefined; viewport.classList.remove("is-panning"); };
viewport.addEventListener("pointerup", stopPanning);
viewport.addEventListener("pointercancel", stopPanning);
window.addEventListener("resize", () => {
  if (!cameraInitialized) return;
  const bounds = viewport.getBoundingClientRect();
  const center = camera.screenToWorld({ x: bounds.width / 2, y: bounds.height / 2 });
  camera = camera.centreOn(center, { width: bounds.width, height: bounds.height });
  renderScene(currentRenderState, true);
});

connectButton.addEventListener("click", () => {
  const returnTo = encodeURIComponent(window.location.origin);
  window.location.assign(`${API_URL}/auth/github?return_to=${returnTo}`);
});
syncButton.addEventListener("click", () => void syncGarden());

const callbackStatus = new URLSearchParams(window.location.search).get("gardenSync");
if (callbackStatus) {
  window.history.replaceState(null, "", window.location.pathname);
  if (callbackStatus === "pending") {
    connectionState.textContent = "Connected; first garden sync is still running";
  }
}

void refreshGarden();
window.addEventListener("focus", () => void refreshGarden());

async function refreshGarden(): Promise<void> {
  setBusy(true);
  connectionState.textContent = "Growing your connection…";
  connectButton.hidden = true;
  syncButton.hidden = true;

  try {
    const [garden, progress] = await Promise.all([
      request<GardenView>("/garden"),
      request<GardenProgress>("/garden/progress"),
    ]);
    renderGarden(garden, progress);
    connectionState.textContent = "Your garden is up to date";
    syncButton.hidden = false;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      renderScene(createGardenRenderState([]), false);
      renderMessage(
        "Connect your GitHub",
        "Your garden is built from your own contribution history. Connect GitHub to load its plants and progress.",
        "empty",
      );
      connectionState.textContent = "Waiting for your GitHub garden";
      connectButton.hidden = false;
    } else {
      renderScene(createGardenRenderState([]), false);
      renderMessage(
        "The garden service is unavailable",
        `${errorMessage(error)} Check the API at ${API_URL}, then try again. The scene above is the renderer’s empty garden state; no sample garden data is being shown.`,
        "error",
        true,
      );
      connectionState.textContent = "Could not reach the garden service";
    }
  } finally {
    setBusy(false);
  }
}

async function syncGarden(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  syncButton.disabled = true;
  syncButton.textContent = "Syncing…";
  try {
    await request<unknown>("/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    await refreshGarden();
  } catch (error) {
    renderMessage("Sync didn’t finish", errorMessage(error), "error", true);
    connectionState.textContent = "Garden sync failed";
  } finally {
    isSyncing = false;
    syncButton.disabled = false;
    syncButton.textContent = "Sync garden";
  }
}

function renderGarden(garden: GardenView, progress: GardenProgress): void {
  renderScene(createGardenRenderState(garden.plants), true);
  const isEmpty = garden.plants.length === 0;
  const recentEvent = garden.events[0];
  const recentActivity = recentEvent
    ? `Latest garden event: ${formatEvent(recentEvent.type)}.`
    : "Your garden history will appear here as it grows.";
  const milestone = progress.nextMilestone === null
    ? "All current milestones reached"
    : `Next milestone: ${progress.nextMilestone} active weeks`;

  content.innerHTML = `
    <div class="garden-heading">
      <div><p class="eyebrow">A WORLD ROOTED IN YOUR HISTORY</p><h1>${escapeHtml(garden.user.githubUsername)}’s garden</h1></div>
      <span class="garden-version">Garden ${garden.garden.gardenVersion}</span>
    </div>
    ${isEmpty ? `<div class="message-card empty-card"><p class="eyebrow">FIRST GROWTH</p><h2>Your garden is ready</h2><p>No plants have grown yet. Sync your GitHub history when you’re ready.</p></div>` : ""}
    <section class="progress-row" aria-label="Garden progress">
      <article class="progress-card"><span class="progress-number">${progress.currentStreak}</span><span class="progress-label">week streak</span></article>
      <article class="progress-card"><span class="progress-number">${progress.activeWeeks}</span><span class="progress-label">active weeks</span></article>
      <article class="progress-card milestone-card"><span class="progress-label">${escapeHtml(milestone)}</span><span class="progress-detail">${escapeHtml(recentActivity)}</span></article>
    </section>
  `;
  lastSync.textContent = garden.garden.lastSyncedAt
    ? `Last tended ${formatDate(garden.garden.lastSyncedAt)}`
    : "Not synced yet";
}

function renderMessage(
  title: string,
  message: string,
  kind: "empty" | "error",
  retry = false,
): void {
  content.innerHTML = `
    <section class="message-card ${kind}-card">
      <p class="eyebrow">${kind === "error" ? "CONNECTION PAUSED" : "YOUR GARDEN IS WAITING"}</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${retry ? `<button id="retry-button" class="button button-secondary" type="button">Try again</button>` : ""}
    </section>
  `;
  content.querySelector<HTMLButtonElement>("#retry-button")?.addEventListener("click", () => void refreshGarden());
}

function renderScene(
  renderState: ReturnType<typeof createGardenRenderState>,
  animate: boolean,
): void {
  currentRenderState = renderState;
  const bounds = viewport.getBoundingClientRect();
  if (!cameraInitialized && bounds.width > 0 && bounds.height > 0) {
    camera = camera.centreOn(
      { x: renderState.gridWidth * 8, y: renderState.gridHeight * 8 },
      { width: bounds.width, height: bounds.height },
    );
    cameraInitialized = true;
  }
  scene.innerHTML = renderPixelGardenHtml(renderState, {
    className: "web-garden",
    animate,
    camera: camera.state,
  });
  requireElement<HTMLOutputElement>("#zoom-level").value = `${Math.round(camera.state.zoom * 100)}%`;
  requireElement<HTMLButtonElement>("#zoom-in").disabled = camera.state.zoom >= 4;
  requireElement<HTMLButtonElement>("#zoom-out").disabled = camera.state.zoom <= 0.5;
}

function zoomAtCenter(zoom: number): void {
  camera = camera.zoomTo(zoom, { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 });
  renderScene(currentRenderState, true);
}

function resetCamera(): void {
  const bounds = viewport.getBoundingClientRect();
  camera = createCamera({ zoom: DEFAULT_ZOOM }).centreOn(
    { x: currentRenderState.gridWidth * 8, y: currentRenderState.gridHeight * 8 },
    { width: bounds.width, height: bounds.height },
  );
  cameraInitialized = true;
  renderScene(currentRenderState, true);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch {
    throw new Error("The API could not be reached.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(response.status, payload?.error ?? `API request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

function normalizeApiUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.origin;
  } catch {
    return "http://localhost:4000";
  }
}

function setBusy(isBusy: boolean): void {
  content.setAttribute("aria-busy", String(isBusy));
  if (isBusy) {
    content.innerHTML = `<div class="loading-card"><span class="loader" aria-hidden="true"></span><p>Waking the garden…</p></div>`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleString();
}

function formatEvent(type: string): string {
  return type.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing web app element: ${selector}`);
  return element;
}

class ApiError extends Error {
  public constructor(public readonly status: number, message: string) {
    super(message);
  }
}

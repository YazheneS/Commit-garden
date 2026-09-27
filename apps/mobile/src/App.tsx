import AsyncStorageModule from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { buildRenderState } from "@commit-garden/garden-renderer";
import type { GardenRenderState } from "@commit-garden/garden-renderer";
import type { Garden, GardenEvent, Plant } from "@commit-garden/shared-types";
import { makeGardenWidgetSnapshot } from "./widgets/widgetData";
import { updateGardenWidget } from "./widgets/updateWidget";

WebBrowser.maybeCompleteAuthSession();

type ApiGarden = {
  readonly user: { readonly githubUsername: string };
  readonly garden: Garden & { readonly gardenVersion: number };
  readonly plants: readonly Plant[];
  readonly events: readonly GardenEvent[];
};

type Progress = {
  readonly activeWeeks: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly nextMilestone: number | null;
};

type Snapshot = {
  readonly garden: ApiGarden;
  readonly progress: Progress;
  readonly cachedAt: string;
};

type AppStateModel = {
  readonly snapshot: Snapshot | null;
  readonly token: string | null;
  readonly loading: boolean;
  readonly syncing: boolean;
  readonly error: string | null;
  readonly apiUrl: string;
};

const CACHE_KEY = "garden.snapshot.v1";
const API_URL_KEY = "garden.api-url.v1";
const SESSION_KEY = "garden.api-session.v1";
const DEFAULT_API_URL = "http://localhost:4000";
const Tabs = createBottomTabNavigator();
const asyncStorage = AsyncStorageModule as unknown as {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export default function App(): React.JSX.Element {
  const [model, setModel] = useState<AppStateModel>({
    snapshot: null,
    token: null,
    loading: true,
    syncing: false,
    error: null,
    apiUrl: DEFAULT_API_URL,
  });

  const refresh = useCallback(async (quiet = false): Promise<void> => {
    const [token, savedUrl, cached] = await Promise.all([
      SecureStore.getItemAsync(SESSION_KEY),
      asyncStorage.getItem(API_URL_KEY),
      asyncStorage.getItem(CACHE_KEY),
    ]);
    let snapshot: Snapshot | null = null;
    if (cached) {
      try { snapshot = JSON.parse(cached) as Snapshot; } catch { snapshot = null; }
    }
    const apiUrl = normalizeApiUrl(savedUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL);
    setModel((current) => ({
      ...current,
      token,
      apiUrl,
      ...(snapshot ? { snapshot } : {}),
      loading: !quiet && !snapshot,
      error: null,
    }));
    await updateGardenWidget(
      makeGardenWidgetSnapshot(snapshot?.garden.plants ?? null, snapshot?.progress ?? null),
    );
    if (!token) {
      setModel((current) => ({ ...current, token: null, apiUrl, loading: false }));
      return;
    }
    try {
      const [garden, progress] = await Promise.all([
        apiRequest<ApiGarden>(apiUrl, "/garden", token),
        apiRequest<Progress>(apiUrl, "/garden/progress", token),
      ]);
      const next = { garden, progress, cachedAt: new Date().toISOString() };
      await asyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
      await updateGardenWidget(makeGardenWidgetSnapshot(garden.plants, progress));
      setModel((current) => ({
        ...current,
        token,
        apiUrl,
        snapshot: next,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setModel((current) => ({
        ...current,
        token,
        apiUrl,
        loading: false,
        error: error instanceof Error ? error.message : "Could not load your garden.",
      }));
    }
  }, []);

  const sync = useCallback(async (): Promise<void> => {
    if (!model.token || model.syncing) return;
    setModel((current) => ({ ...current, syncing: true, error: null }));
    try {
      await apiRequest(model.apiUrl, "/sync", model.token, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      await refresh(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronization failed.";
      setModel((current) => ({ ...current, error: message }));
      Alert.alert("Garden sync failed", message);
    } finally {
      setModel((current) => ({ ...current, syncing: false }));
    }
  }, [model.apiUrl, model.syncing, model.token, refresh]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh(true);
    });
    return () => subscription.remove();
  }, [refresh]);

  const connect = useCallback(async (): Promise<void> => {
    try {
      const returnUrl = "commitgarden://oauth";
      const authUrl = `${model.apiUrl}/auth/github?return_to=${encodeURIComponent(returnUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type !== "success") return;
      const callback = new URL(result.url);
      const code = callback.searchParams.get("code");
      if (!code) throw new Error("The sign-in callback did not include a session code.");
      const session = await apiRequest<{ token: string }>(model.apiUrl, "/auth/mobile/session", null, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      await SecureStore.setItemAsync(SESSION_KEY, session.token);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub sign-in failed.";
      setModel((current) => ({ ...current, error: message }));
      Alert.alert("Could not connect GitHub", message);
    }
  }, [model.apiUrl, refresh]);

  const saveApiUrl = useCallback(async (value: string): Promise<void> => {
    try {
      const apiUrl = normalizeApiUrl(value);
      await asyncStorage.setItem(API_URL_KEY, apiUrl);
      setModel((current) => ({ ...current, apiUrl }));
      await refresh();
    } catch {
      Alert.alert("Invalid API address", "Enter a valid HTTP or HTTPS address.");
    }
  }, [refresh]);

  const logout = useCallback(async (): Promise<void> => {
    if (model.token) {
      await apiRequest(model.apiUrl, "/auth/logout", model.token, { method: "POST" }).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await asyncStorage.removeItem(CACHE_KEY);
    await updateGardenWidget(makeGardenWidgetSnapshot(null, null));
    setModel((current) => ({ ...current, token: null, snapshot: null, loading: false }));
  }, [model.apiUrl, model.token]);

  return (
    <NavigationContainer>
      <Tabs.Navigator screenOptions={{
        headerStyle: styles.navHeader,
        headerTintColor: palette.text,
        headerTitleStyle: styles.navTitle,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        sceneStyle: styles.scene,
      }}>
        <Tabs.Screen name="Garden">
          {() => <GardenScreen model={model} onConnect={connect} onSync={sync} />}
        </Tabs.Screen>
        <Tabs.Screen name="Progress">
          {() => <ProgressScreen snapshot={model.snapshot} />}
        </Tabs.Screen>
        <Tabs.Screen name="History">
          {() => <HistoryScreen snapshot={model.snapshot} />}
        </Tabs.Screen>
        <Tabs.Screen name="Settings">
          {() => <SettingsScreen model={model} onConnect={connect} onSaveApiUrl={saveApiUrl} onLogout={logout} />}
        </Tabs.Screen>
      </Tabs.Navigator>
    </NavigationContainer>
  );
}

function GardenScreen({ model, onConnect, onSync }: {
  readonly model: AppStateModel;
  readonly onConnect: () => void;
  readonly onSync: () => void;
}): React.JSX.Element {
  const snapshot = model.snapshot;
  if (model.loading && !snapshot) return <Centered><ActivityIndicator color={palette.accent} /><Text style={styles.body}>Loading your garden…</Text></Centered>;
  if (!model.token) return <Centered>
    <Text style={styles.kicker}>YOUR GARDEN IS WAITING</Text>
    <Text style={styles.title}>A little world grown from your coding</Text>
    <Text style={styles.body}>Connect GitHub to import your contribution history and create your garden.</Text>
    <ActionButton label="Connect GitHub" onPress={onConnect} />
    {model.error ? <Text style={styles.error}>{model.error}</Text> : null}
  </Centered>;
  if (!snapshot) return <Centered>
    <Text style={styles.title}>Your garden could not load</Text>
    <Text style={styles.body}>{model.error ?? "Check the API address in Settings and try again."}</Text>
    <ActionButton label="Try again" onPress={onSync} />
  </Centered>;

  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>A WORLD THAT GROWS WITH YOU</Text>
    <Text style={styles.title}>{snapshot.garden.user.githubUsername}’s garden</Text>
    <PixelGarden plants={snapshot.garden.plants} />
    <View style={styles.statRow}>
      <Stat value={snapshot.progress.currentStreak} label="week streak" />
      <Stat value={snapshot.progress.activeWeeks} label="active weeks" />
      <Stat value={weeksUntil(snapshot.progress)} label="to next growth" />
    </View>
    {model.error ? <Text style={styles.error}>{model.error} · Showing saved garden</Text> : null}
    <Text style={styles.muted}>Saved {new Date(snapshot.cachedAt).toLocaleString()}</Text>
    <ActionButton label={model.syncing ? "Syncing…" : "Sync with GitHub"} onPress={onSync} disabled={model.syncing} />
  </ScrollView>;
}

function ProgressScreen({ snapshot }: { readonly snapshot: Snapshot | null }): React.JSX.Element {
  if (!snapshot) return <Centered><Text style={styles.body}>Connect GitHub to see your progress.</Text></Centered>;
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>YOUR GROWING RHYTHM</Text>
    <Text style={styles.title}>Progress</Text>
    <Stat value={snapshot.progress.currentStreak} label="current week streak" large />
    <Stat value={snapshot.progress.longestStreak} label="longest week streak" large />
    <Stat value={snapshot.progress.activeWeeks} label="active weeks in your garden" large />
    <Text style={styles.body}>{snapshot.progress.nextMilestone === null
      ? "Every garden milestone is in bloom. Keep tending your garden."
      : `${snapshot.progress.nextMilestone - snapshot.progress.activeWeeks} active weeks until the next milestone.`}</Text>
  </ScrollView>;
}

function HistoryScreen({ snapshot }: { readonly snapshot: Snapshot | null }): React.JSX.Element {
  if (!snapshot) return <Centered><Text style={styles.body}>Connect GitHub to see garden history.</Text></Centered>;
  if (snapshot.garden.events.length === 0) return <Centered><Text style={styles.title}>The first chapter</Text><Text style={styles.body}>Your garden events will appear here as it grows.</Text></Centered>;
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>EVERY STEP BECOMES PART OF THE GARDEN</Text>
    <Text style={styles.title}>History</Text>
    {snapshot.garden.events.map((event, index) => <View key={`${event.type}-${event.occurredAt}-${index}`} style={styles.eventRow}>
      <View style={styles.eventDot} />
      <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.type.toLowerCase().replaceAll("_", " ")}</Text><Text style={styles.muted}>{new Date(event.occurredAt).toLocaleDateString()}</Text></View>
    </View>)}
  </ScrollView>;
}

function SettingsScreen({ model, onConnect, onSaveApiUrl, onLogout }: {
  readonly model: AppStateModel;
  readonly onConnect: () => void;
  readonly onSaveApiUrl: (value: string) => void;
  readonly onLogout: () => void;
}): React.JSX.Element {
  const [apiUrl, setApiUrl] = useState(model.apiUrl);
  useEffect(() => { setApiUrl(model.apiUrl); }, [model.apiUrl]);
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>YOUR CONNECTIONS</Text>
    <Text style={styles.title}>Settings</Text>
    <Text style={styles.label}>GitHub account</Text>
    <Text style={styles.body}>{model.snapshot?.garden.user.githubUsername ?? "Not connected"}</Text>
    {model.token
      ? <ActionButton label="Disconnect GitHub" secondary onPress={onLogout} />
      : <ActionButton label="Connect GitHub" onPress={onConnect} />}
    <Text style={styles.label}>Garden API address</Text>
    <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} placeholder="https://api.example.com" placeholderTextColor={palette.muted} />
    <ActionButton label="Save address" secondary onPress={() => onSaveApiUrl(apiUrl)} />
    <Text style={styles.muted}>On the Android emulator, use http://10.0.2.2:4000 to reach an API running on this computer.</Text>
  </ScrollView>;
}

function PixelGarden({ plants }: { readonly plants: readonly Plant[] }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const renderState: GardenRenderState = buildRenderState(plants, { gridWidth: 10, gridHeight: 7 });
  const unit = Math.max(2.2, Math.min(3.0, (width - 44) / (renderState.gridWidth * 16)));
  const tileSize = 16 * unit;
  const worldWidth = renderState.gridWidth * tileSize;
  const worldHeight = renderState.gridHeight * tileSize;
  return <View accessibilityLabel="Pixel-art garden" style={[styles.garden, { width: worldWidth, height: worldHeight }]}>
    {renderState.terrain.map((tile) => <View key={`tile-${tile.col}-${tile.row}`} style={{
      position: "absolute", left: tile.worldX * unit, top: tile.worldY * unit,
      width: tileSize, height: tileSize, backgroundColor: tile.variant === "GRASS" ? "#78a85b" : "#9a6a45",
      borderWidth: 0.5, borderColor: "#557d4e",
    }} />)}
    {renderState.plants.map((plant) => {
      const stageHeight = plant.growthStage === "SEED" ? 5 : plant.growthStage === "SPROUT" ? 11 : plant.growthStage === "YOUNG" ? 17 : 23;
      const color = plant.speciesId === "cherry" ? "#be7185" : plant.speciesId === "flower" ? "#e1c75c" : plant.speciesId === "mushroom" ? "#d88664" : "#6cae75";
      return <View key={plant.id} style={{ position: "absolute", left: plant.worldX * unit - 5, top: plant.worldY * unit - stageHeight, width: 10, height: stageHeight, alignItems: "center", justifyContent: "flex-end" }}>
        <View style={{ width: plant.growthStage === "SEED" ? 5 : 10, height: plant.growthStage === "SEED" ? 5 : stageHeight * 0.62, backgroundColor: color, borderWidth: 1, borderColor: "#305a3d" }} />
        <View style={{ width: 3, height: Math.max(3, stageHeight * 0.38), backgroundColor: "#4d7650" }} />
      </View>;
    })}
  </View>;
}

function Centered({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.centered}>{children}</View>;
}

function Stat({ value, label, large = false }: { readonly value: number; readonly label: string; readonly large?: boolean }): React.JSX.Element {
  return <View style={[styles.stat, large && styles.statLarge]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ActionButton({ label, onPress, disabled = false, secondary = false }: { readonly label: string; readonly onPress: () => void; readonly disabled?: boolean; readonly secondary?: boolean }): React.JSX.Element {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.action, secondary && styles.actionSecondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.actionSecondaryText]}>{label}</Text></Pressable>;
}

async function apiRequest<T>(apiUrl: string, path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  return await response.json() as T;
}

function normalizeApiUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Use HTTP or HTTPS.");
  return url.origin;
}

function weeksUntil(progress: Progress): number {
  return progress.nextMilestone === null ? 0 : Math.max(0, progress.nextMilestone - progress.activeWeeks);
}

const palette = { background: "#12241e", surface: "#1a3025", border: "#355541", text: "#edf5e9", muted: "#a9bca7", accent: "#c1e58f", danger: "#ef9b89" };
const styles = StyleSheet.create({
  scene: { backgroundColor: palette.background },
  navHeader: { backgroundColor: palette.background, borderBottomColor: palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { color: palette.text, fontSize: 16, fontWeight: "600" },
  tabBar: { backgroundColor: palette.background, borderTopColor: palette.border },
  page: { padding: 22, paddingBottom: 34, gap: 14 },
  centered: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: palette.background },
  kicker: { color: palette.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  title: { color: palette.text, fontSize: 24, fontWeight: "600", lineHeight: 31 },
  body: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  muted: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  error: { color: palette.danger, fontSize: 12 },
  label: { color: palette.text, fontSize: 12, fontWeight: "600", marginTop: 14 },
  garden: { position: "relative", alignSelf: "center", marginTop: 8, overflow: "hidden", borderRadius: 8, borderWidth: 5, borderColor: "#294536" },
  statRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, minHeight: 70, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.surface, padding: 10 },
  statLarge: { alignItems: "flex-start", minHeight: 74, paddingHorizontal: 16 },
  statValue: { color: palette.accent, fontSize: 24, fontVariant: ["tabular-nums"], fontWeight: "500" },
  statLabel: { color: palette.muted, fontSize: 10, textAlign: "center", marginTop: 2 },
  action: { alignSelf: "stretch", alignItems: "center", backgroundColor: palette.accent, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, marginTop: 6 },
  actionText: { color: "#15261d", fontSize: 13, fontWeight: "700" },
  actionSecondary: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  actionSecondaryText: { color: palette.text },
  disabled: { opacity: 0.55 },
  input: { color: palette.text, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  eventDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.accent },
  eventCopy: { gap: 4 },
  eventTitle: { color: palette.text, fontSize: 14, textTransform: "capitalize" },
});

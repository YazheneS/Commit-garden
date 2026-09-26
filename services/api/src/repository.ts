import type { GardenEvent, Plant, User } from "@commit-garden/shared-types";
import type { GardenProgress, GardenView } from "./types.js";

export type PersistedGarden = GardenView["garden"];

export type GardenRepository = {
  getGarden(userId: string): GardenView | null;
  getProgress(userId: string): GardenProgress | null;
  getEvents(userId: string): readonly GardenEvent[] | null;
  getUser(userId: string): User | null;
  transaction<T>(
    userId: string,
    callback: (transaction: GardenTransaction) => Promise<T> | T,
  ): Promise<T>;
};

export type GardenTransaction = {
  getGarden(): GardenView;
  hasAppliedSync(activityHistoryHash: string): boolean;
  markSyncApplied(activityHistoryHash: string): void;
  saveGarden(garden: PersistedGarden): void;
  savePlants(plants: readonly Plant[]): void;
  appendEvents(events: readonly GardenEvent[]): void;
};

type RepositoryState = {
  users: Map<string, User>;
  gardens: Map<string, PersistedGarden>;
  plants: Map<string, Plant>;
  events: Map<string, GardenEvent & { readonly id: string }>;
  syncFingerprints: Map<string, Set<string>>;
};

function cloneState(state: RepositoryState): RepositoryState {
  return {
    users: new Map(state.users),
    gardens: new Map(state.gardens),
    plants: new Map(state.plants),
    events: new Map(state.events),
    syncFingerprints: new Map(
      [...state.syncFingerprints].map(([userId, hashes]) => [
        userId,
        new Set(hashes),
      ]),
    ),
  };
}

export class InMemoryGardenRepository implements GardenRepository {
  private state: RepositoryState = {
    users: new Map(),
    gardens: new Map(),
    plants: new Map(),
    events: new Map(),
    syncFingerprints: new Map(),
  };

  private readonly locks = new Map<string, Promise<void>>();

  public seed(view: GardenView): void {
    this.state.users.set(view.user.id, view.user);
    this.state.gardens.set(view.user.id, view.garden);
    for (const plant of view.plants) this.state.plants.set(plant.id, plant);
    for (const event of view.events) {
      this.state.events.set(
        `${view.garden.id}:${event.occurredAt}:${event.type}`,
        {
          ...event,
          id: `${view.garden.id}:${event.occurredAt}:${event.type}`,
        },
      );
    }
  }

  public getGarden(userId: string): GardenView | null {
    const user = this.state.users.get(userId);
    const garden = this.state.gardens.get(userId);
    if (!user || !garden) return null;
    return this.buildView(user, garden);
  }

  public getProgress(userId: string): GardenProgress | null {
    const view = this.getGarden(userId);
    if (!view) return null;
    return {
      currentStreak: view.garden.currentStreak,
      longestStreak: view.garden.longestStreak,
      activeWeeks: view.garden.activeWeeks,
      gardenVersion: view.garden.gardenVersion,
      nextMilestone:
        [1, 5, 8, 12, 16, 20, 26, 52].find(
          (milestone) => milestone > view.garden.activeWeeks,
        ) ?? null,
    };
  }

  public getEvents(userId: string): readonly GardenEvent[] | null {
    const view = this.getGarden(userId);
    return view?.events ?? null;
  }

  public getUser(userId: string): User | null {
    return this.state.users.get(userId) ?? null;
  }

  public async transaction<T>(
    userId: string,
    callback: (transaction: GardenTransaction) => Promise<T> | T,
  ): Promise<T> {
    const previousLock = this.locks.get(userId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const currentLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(userId, currentLock);
    await previousLock;

    const backup = cloneState(this.state);
    try {
      const garden = this.getGarden(userId);
      if (!garden) throw new Error("Garden not found");
      const transaction: GardenTransaction = {
        getGarden: () => this.getGarden(userId) ?? garden,
        hasAppliedSync: (activityHistoryHash) =>
          this.state.syncFingerprints.get(userId)?.has(activityHistoryHash) ??
          false,
        markSyncApplied: (activityHistoryHash) => {
          const hashes =
            this.state.syncFingerprints.get(userId) ?? new Set<string>();
          hashes.add(activityHistoryHash);
          this.state.syncFingerprints.set(userId, hashes);
        },
        saveGarden: (updatedGarden) =>
          this.state.gardens.set(userId, updatedGarden),
        savePlants: (plants) => {
          for (const plant of plants) this.state.plants.set(plant.id, plant);
        },
        appendEvents: (events) => {
          for (const event of events) {
            const id = `${garden.garden.id}:${event.occurredAt}:${event.type}:${this.state.events.size}`;
            this.state.events.set(id, { ...event, id });
          }
        },
      };
      return await callback(transaction);
    } catch (error) {
      this.state = backup;
      throw error;
    } finally {
      release();
      if (this.locks.get(userId) === currentLock) this.locks.delete(userId);
    }
  }

  private buildView(user: User, garden: PersistedGarden): GardenView {
    const plants = [...this.state.plants.values()]
      .filter((plant) => plant.gardenId === garden.id)
      .sort((left, right) => left.originWeek - right.originWeek);
    const events = [...this.state.events.values()]
      .filter((event) => event.id.startsWith(`${garden.id}:`))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .map(({ id: _id, ...event }) => event);
    return { user, garden, plants, events, achievements: [] };
  }
}

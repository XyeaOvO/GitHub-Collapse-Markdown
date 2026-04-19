import { createUserscriptValueStore, type ValueStore } from "../platform/userscript";
import { arePageStatesEqual, createEmptyPageState, isEmptyPageState, normalizePageState } from "./page-state";
import type { LegacyPersistedState, PageState, PersistedState } from "./types";

const STORAGE_KEY = "ghcm-v5-state";

const defaultState: PersistedState = {
  version: 2,
  pages: {}
};

function cloneState<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export class StorageService {
  private state: PersistedState;
  private readonly store: ValueStore;

  constructor(store: ValueStore = createUserscriptValueStore()) {
    this.store = store;
    this.state = this.read();
  }

  getPageState(pageKey: string): PageState {
    return cloneState(this.state.pages[pageKey] ?? createEmptyPageState());
  }

  setPageState(pageKey: string, pageState: PageState): void {
    const normalized = normalizePageState(pageState);

    if (isEmptyPageState(normalized)) {
      if (!(pageKey in this.state.pages)) {
        return;
      }
      delete this.state.pages[pageKey];
      this.write();
      return;
    }

    if (arePageStatesEqual(this.state.pages[pageKey], normalized)) {
      return;
    }

    this.state.pages[pageKey] = normalized;
    this.write();
  }

  clearPage(pageKey: string): void {
    if (!(pageKey in this.state.pages)) {
      return;
    }
    delete this.state.pages[pageKey];
    this.write();
  }

  private read(): PersistedState {
    const stored = this.store.read<PersistedState | LegacyPersistedState | null>(STORAGE_KEY, null);
    if (!stored) {
      return cloneState(defaultState);
    }

    if ((stored as PersistedState).version === 2) {
      const current = stored as PersistedState;
      return {
        ...cloneState(defaultState),
        ...current,
        pages: normalizePages(current.pages)
      };
    }

    if ((stored as LegacyPersistedState).version === 1) {
      const legacy = stored as LegacyPersistedState;
      return {
        ...cloneState(defaultState),
        pages: normalizePages(legacy.pages)
      };
    }

    return cloneState(defaultState);
  }

  private write(): void {
    this.store.write(STORAGE_KEY, cloneState(this.state));
  }
}

function normalizePages(pages: Record<string, PageState> | undefined): Record<string, PageState> {
  const normalized: Record<string, PageState> = {};
  for (const [key, value] of Object.entries(pages ?? {})) {
    normalized[key] = normalizePageState(value);
  }
  return normalized;
}

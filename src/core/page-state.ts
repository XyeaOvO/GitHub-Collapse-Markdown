import type { PageState } from "./types";

export function createEmptyPageState(): PageState {
  return {
    collapsedByContainer: {}
  };
}

export function normalizePageState(pageState?: PageState): PageState {
  const collapsedByContainer: Record<string, string[]> = {};

  for (const [containerKey, collapsedKeys] of Object.entries(pageState?.collapsedByContainer ?? {})) {
    collapsedByContainer[containerKey] = [...collapsedKeys];
  }

  return {
    collapsedByContainer
  };
}

export function isEmptyPageState(pageState: PageState): boolean {
  return Object.values(pageState.collapsedByContainer).every((collapsedKeys) => collapsedKeys.length === 0);
}

export function serializePageState(pageState: PageState): string {
  return Object.entries(pageState.collapsedByContainer)
    .filter(([, collapsedKeys]) => collapsedKeys.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([containerKey, collapsedKeys]) => `${containerKey}:${collapsedKeys.join(",")}`)
    .join("|");
}

export function arePageStatesEqual(left: PageState | undefined, right: PageState | undefined): boolean {
  return serializePageState(normalizePageState(left)) === serializePageState(normalizePageState(right));
}

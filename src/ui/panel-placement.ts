import type { DockedPanelLayoutContext } from "../core/types";

export type PanelPlacement = "overlay" | "docked" | "inline";

export type ResolvedPanelPlacement =
  | { kind: "overlay" }
  | { kind: "inline"; host: HTMLElement }
  | { kind: "docked"; context: DockedPanelLayoutContext };

export interface PanelPlacementResolvers {
  resolveDockedLayout?: () => DockedPanelLayoutContext | null;
  resolveInlineHost?: () => HTMLElement | null;
}

export function resolvePanelPlacement(desktop: boolean, resolvers: PanelPlacementResolvers): ResolvedPanelPlacement {
  if (!desktop) {
    return { kind: "overlay" };
  }

  const dockedLayout = resolvers.resolveDockedLayout?.() ?? null;
  if (dockedLayout) {
    return {
      kind: "docked",
      context: dockedLayout
    };
  }

  const inlineHost = resolvers.resolveInlineHost?.() ?? null;
  if (inlineHost) {
    return {
      kind: "inline",
      host: inlineHost
    };
  }

  return { kind: "overlay" };
}

export function collectPlacementTargets(placement: ResolvedPanelPlacement): HTMLElement[] {
  if (placement.kind !== "docked") {
    return [];
  }

  const targets = [placement.context.host, placement.context.boundary].filter(
    (element): element is HTMLElement => Boolean(element)
  );

  return Array.from(new Set(targets));
}

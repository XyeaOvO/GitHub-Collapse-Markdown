import type { SiteAdapter } from "../core/types";

const RERENDER_EVENTS = ["turbo:load", "turbo:render", "pjax:end", "pageshow", "load"] as const;

interface AppLifecycleOptions {
  onRefreshRequested: () => void;
  onKeydown: (event: KeyboardEvent) => void;
  resolveMutationAdapter: () => SiteAdapter | null;
}

export class AppLifecycle {
  private observer: MutationObserver | null = null;

  constructor(private readonly options: AppLifecycleOptions) {}

  bind(signal: AbortSignal): void {
    RERENDER_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, () => this.options.onRefreshRequested(), {
        passive: true,
        signal
      });
    });

    document.addEventListener("keydown", (event) => this.options.onKeydown(event), {
      passive: false,
      signal
    });

    this.observer = new MutationObserver((mutations) => {
      const adapter = this.options.resolveMutationAdapter();
      if (!adapter) {
        return;
      }

      for (const mutation of mutations) {
        if (adapter.shouldRefreshForMutation(mutation)) {
          this.options.onRefreshRequested();
          return;
        }
      }
    });

    this.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

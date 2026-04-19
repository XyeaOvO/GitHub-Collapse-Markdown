import { adapters } from "../adapters";
import { hasSamePageDisplay, hasSamePageStructure, type PageVersion } from "../core/revisions";
import { StorageService } from "../core/storage";
import { injectUserscriptStyle, registerUserscriptMenuCommand } from "../platform/userscript";
import { styles } from "../ui/styles";
import { isEditableTarget } from "../utils/dom";
import { AppLifecycle } from "./app-lifecycle";
import { PageSession } from "./page-session";
import { findMatchingAdapter, resolvePageSession } from "./page-session-resolver";

export class GitHubCollapseMarkdownApp {
  private readonly storage = new StorageService();
  private readonly abortController = new AbortController();
  private readonly lifecycle = new AppLifecycle({
    onRefreshRequested: () => this.scheduleRefresh(),
    onKeydown: (event) => this.handleKeydown(event),
    resolveMutationAdapter: () => findMatchingAdapter(adapters, window.location)
  });
  private session: PageSession | null = null;
  private lastPageVersion: PageVersion | null = null;
  private refreshTimer = 0;
  private styleInjected = false;

  start(): void {
    this.injectStyles();
    this.registerMenuCommands();
    this.bindLifecycleEvents();
    this.refresh();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || !event.shiftKey) {
      return;
    }

    if (key === "m") {
      event.preventDefault();
      this.session?.togglePanel();
      return;
    }

    if (key === "c") {
      event.preventDefault();
      this.session?.collapseAll();
      return;
    }

    if (key === "e") {
      event.preventDefault();
      this.session?.expandAll();
    }
  }

  destroy(): void {
    this.cancelScheduledRefresh();
    this.abortController.abort();
    this.lifecycle.destroy();
    this.teardownSession();
  }

  private bindLifecycleEvents(): void {
    this.lifecycle.bind(this.abortController.signal);
  }

  private registerMenuCommands(): void {
    registerUserscriptMenuCommand("Toggle panel", () => this.session?.togglePanel());
    registerUserscriptMenuCommand("Collapse all", () => this.session?.collapseAll());
    registerUserscriptMenuCommand("Expand all", () => this.session?.expandAll());
    registerUserscriptMenuCommand("Clear current page memory", () => this.session?.clearPageMemory());
  }

  private injectStyles(): void {
    if (this.styleInjected) {
      return;
    }

    if (!injectUserscriptStyle(styles)) {
      const style = document.createElement("style");
      style.textContent = styles;
      document.head.append(style);
    }

    this.styleInjected = true;
  }

  private refresh(): void {
    const resolution = resolvePageSession(adapters, document, window.location);
    if (resolution.kind === "unsupported") {
      this.lastPageVersion = null;
      this.teardownSession();
      return;
    }

    if (resolution.kind === "empty") {
      this.lastPageVersion = resolution.version;
      this.teardownSession();
      return;
    }

    const { spec } = resolution;
    if (this.session && !this.session.isStale() && hasSamePageStructure(this.lastPageVersion, spec.version)) {
      if (!hasSamePageDisplay(this.lastPageVersion, spec.version)) {
        this.session.refreshDisplay(spec.document.headings, spec.version.display);
      }
      this.lastPageVersion = spec.version;
      return;
    }

    this.lastPageVersion = spec.version;
    this.teardownSession();
    this.session = new PageSession(
      spec.pageKey,
      spec.adapter,
      spec.document,
      this.storage
    );
    this.session.mount();
  }

  private scheduleRefresh(): void {
    this.cancelScheduledRefresh();
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = 0;
      this.refresh();
    }, 80);
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimer === 0) {
      return;
    }

    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = 0;
  }

  private teardownSession(): void {
    this.session?.destroy();
    this.session = null;
  }
}

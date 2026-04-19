import { PageSessionUI } from "./page-session-ui";
import { createEmptyPageState, serializePageState } from "../core/page-state";
import { CollapseEngine } from "../core/collapse-engine";
import { PageDocument } from "../core/page-document";
import { StorageService } from "../core/storage";
import type { HeadingRecord, PageState, SiteAdapter } from "../core/types";

export class PageSession {
  private readonly engine: CollapseEngine;
  private readonly ui: PageSessionUI;
  private readonly abortController = new AbortController();
  private readonly initialPageState: PageState;
  private lastPersistedStateRevision: string;
  private unsubscribeEngine: (() => void) | null = null;

  constructor(
    private readonly pageKey: string,
    private readonly adapter: SiteAdapter,
    private readonly document: PageDocument,
    private readonly storage: StorageService
  ) {
    this.initialPageState = this.storage.getPageState(this.pageKey);
    this.lastPersistedStateRevision = serializePageState(this.initialPageState);
    this.engine = new CollapseEngine(this.document, this.getInitialCollapsedKeys());
    this.ui = new PageSessionUI({
      adapter: this.adapter,
      engine: this.engine,
      document: this.document,
      onCollapseAll: () => this.engine.collapseAll(),
      onExpandAll: () => this.engine.expandAll(),
      onExpandTo: (key) => this.engine.expandTo(key)
    });
  }

  mount(): void {
    this.ui.mount(this.abortController.signal);
    this.unsubscribeEngine = this.engine.subscribe(() => this.handleEngineChange());
    this.handleEngineChange();
  }

  destroy(): void {
    this.abortController.abort();
    this.unsubscribeEngine?.();
    this.unsubscribeEngine = null;
    this.ui.destroy();
  }

  isStale(): boolean {
    return this.ui.isStale();
  }

  collapseAll(): void {
    this.engine.collapseAll();
  }

  expandAll(): void {
    this.engine.expandAll();
  }

  togglePanel(): void {
    this.ui.togglePanel();
  }

  clearPageMemory(): void {
    this.lastPersistedStateRevision = serializePageState(createEmptyPageState());
    this.storage.clearPage(this.pageKey);
    this.engine.expandAll();
  }

  refreshDisplay(headings: HeadingRecord[], displayRevision: string): void {
    this.ui.renderSnapshots(this.engine.getSnapshotsForHeadings(headings), displayRevision);
  }

  private getInitialCollapsedKeys(): string[] {
    return this.document.filterKnownHeadingKeys(
      this.document.containers.flatMap((container) => this.initialPageState.collapsedByContainer[container.key] ?? [])
    );
  }

  private handleEngineChange(): void {
    this.ui.renderSnapshots(this.engine.getSnapshots());
    this.persistState();
  }

  private persistState(): void {
    const nextPageState = this.buildPageState();
    const nextStateRevision = serializePageState(nextPageState);
    if (nextStateRevision === this.lastPersistedStateRevision) {
      return;
    }

    this.lastPersistedStateRevision = nextStateRevision;
    this.storage.setPageState(this.pageKey, nextPageState);
  }

  private buildPageState(): PageState {
    return {
      collapsedByContainer: Object.fromEntries(
        this.document.containers.map((container) => [
          container.key,
          this.engine.getCollapsedKeysForContainer(container.key)
        ])
      )
    };
  }
}

import { ActiveHeadingTracker } from "./active-heading-tracker";
import { buildHeadingDisplayRevision } from "../core/revisions";
import type { CollapseEngine } from "../core/collapse-engine";
import { PageDocument } from "../core/page-document";
import type { HeadingSnapshot, SiteAdapter } from "../core/types";
import { HeadingControls } from "../ui/heading-controls";
import { PanelUI } from "../ui/panel";
import type { PanelRenderState } from "../ui/panel-outline";
import { scrollToElementWithOffset } from "../utils/dom";

interface PageSessionUIOptions {
  adapter: SiteAdapter;
  engine: CollapseEngine;
  document: PageDocument;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onExpandTo: (key: string) => void;
}

export class PageSessionUI {
  private readonly controls: HeadingControls;
  private readonly panel: PanelUI;
  private readonly activeHeading: ActiveHeadingTracker;
  private panelState: PanelRenderState = {
    headings: [],
    activeHeadingKey: null,
    displayRevision: ""
  };

  constructor(private readonly options: PageSessionUIOptions) {
    this.controls = new HeadingControls(this.options.document, this.options.engine);
    this.panel = new PanelUI({
      onCollapseAll: this.options.onCollapseAll,
      onExpandAll: this.options.onExpandAll,
      onJump: (key) => this.jumpToHeading(key),
      resolveDockedLayout: () => this.options.adapter.getDockedPanelLayout?.(document) ?? null,
      resolveInlineHost: () => this.options.document.getPrimaryContainerElement()
    });
    this.activeHeading = new ActiveHeadingTracker({
      getStickyTop: () => this.options.adapter.getStickyHeaderOffset(document),
      resolveBinding: (key) => this.options.document.getBinding(key)
    });
  }

  mount(signal: AbortSignal): void {
    this.controls.mount(signal);
    this.panel.mount();
    this.activeHeading.bind(signal, () => this.panelState.headings, (activeHeadingKey) =>
      this.updatePanelState({ activeHeadingKey })
    );
  }

  destroy(): void {
    this.activeHeading.destroy();
    this.panel.destroy();
    this.controls.destroy();
  }

  isStale(): boolean {
    return (
      !this.panel.isConnected() ||
      this.options.document.getContainerElements().some((element) => !element.isConnected) ||
      !this.controls.isConnected()
    );
  }

  togglePanel(): void {
    this.panel.setOpen(!this.panel.isOpen());
  }

  renderSnapshots(
    snapshots: HeadingSnapshot[],
    displayRevision = buildHeadingDisplayRevision(snapshots)
  ): void {
    this.controls.sync(snapshots);
    this.activeHeading.sync(snapshots, true);
    this.updatePanelState({
      headings: snapshots,
      activeHeadingKey: this.activeHeading.getActiveHeadingKey(),
      displayRevision
    });
  }

  private jumpToHeading(key: string): void {
    const binding = this.options.document.getBinding(key);
    if (!binding) {
      return;
    }

    this.options.onExpandTo(key);
    scrollToElementWithOffset(binding.blockEl, this.options.adapter.getStickyHeaderOffset(document));
    this.activeHeading.setActiveHeadingKey(key, true);
    this.updatePanelState({
      activeHeadingKey: this.activeHeading.getActiveHeadingKey()
    });
  }

  private updatePanelState(patch: Partial<PanelRenderState>): void {
    this.panelState = {
      ...this.panelState,
      ...patch
    };
    this.panel.render(this.panelState);
  }
}

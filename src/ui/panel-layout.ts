import {
  applyDockedPanelFrame,
  clearDockedPanelFrame,
  computeDockedPanelFrame,
  measureDockedPanel,
  type DockedPanelFrameElements,
  type DockedPanelMeasureElements
} from "./panel-frame";
import {
  collectPlacementTargets,
  resolvePanelPlacement,
  type PanelPlacement,
  type PanelPlacementResolvers,
  type ResolvedPanelPlacement
} from "./panel-placement";

interface DockedPanelLayoutElements extends DockedPanelFrameElements, DockedPanelMeasureElements {}

export class DockedPanelLayout {
  private desktop = false;
  private open = false;
  private placement: ResolvedPanelPlacement = { kind: "overlay" };
  private positionRaf = 0;
  private resizeObserver: ResizeObserver | null = null;
  private layoutMutationObserver: MutationObserver | null = null;
  private observedDockElements: HTMLElement[] = [];
  private styledPrecedingDockRow: HTMLElement | null = null;
  private measurementDirty = true;

  constructor(
    private readonly elements: DockedPanelLayoutElements,
    private readonly resolvers: PanelPlacementResolvers
  ) {}

  bind(signal: AbortSignal): void {
    window.addEventListener("scroll", (event) => this.handleScroll(event), {
      signal,
      passive: true
    });
    document.addEventListener("scroll", (event) => this.handleScroll(event), {
      signal,
      passive: true,
      capture: true
    });
    signal.addEventListener("abort", () => this.disconnectLayoutObservers(), { once: true });
  }

  destroy(): void {
    window.cancelAnimationFrame(this.positionRaf);
    this.disconnectLayoutObservers();
    this.elements.dockRow.remove();
  }

  getPlacement(): PanelPlacement {
    return this.placement.kind;
  }

  refreshGeometry(): void {
    this.invalidateGeometry();
  }

  sync(desktop: boolean, open: boolean): void {
    this.desktop = desktop;
    this.open = open;
    this.placement = resolvePanelPlacement(this.desktop, this.resolvers);
    this.mountPlacement(this.placement);
    this.syncLayoutObservers(this.placement);
    this.syncPrecedingDockRow(this.placement);
    this.elements.root.style.setProperty(
      "--ghcm-sticky-top",
      `${this.placement.kind === "docked" ? this.placement.context.topOffset : 0}px`
    );
    this.invalidateGeometry();
  }

  private mountPlacement(placement: ResolvedPanelPlacement): void {
    if (placement.kind === "overlay") {
      this.mountOverlay();
      return;
    }

    if (placement.kind === "docked") {
      if (this.elements.root.parentElement !== this.elements.dockCell) {
        this.elements.dockCell.append(this.elements.root);
      }
      if (this.elements.dockRow.parentElement !== placement.context.host) {
        placement.context.host.append(this.elements.dockRow);
      }
      return;
    }

    this.elements.dockRow.remove();
    if (this.elements.root.parentElement !== placement.host || placement.host.firstElementChild !== this.elements.root) {
      placement.host.prepend(this.elements.root);
    }
  }

  private mountOverlay(): void {
    this.elements.dockRow.remove();
    if (this.elements.root.parentElement !== document.body) {
      document.body.append(this.elements.root);
    }
  }

  private handleScroll(event: Event): void {
    if (!this.shouldPositionDockedPanel()) {
      return;
    }

    if (event.target instanceof Node && this.elements.root.contains(event.target)) {
      return;
    }

    this.invalidateGeometry();
  }

  private syncLayoutObservers(placement: ResolvedPanelPlacement): void {
    const nextTargets = collectPlacementTargets(placement);
    const targetsUnchanged =
      nextTargets.length === this.observedDockElements.length &&
      nextTargets.every((element, index) => element === this.observedDockElements[index]);

    if (targetsUnchanged) {
      return;
    }

    this.disconnectLayoutObservers();
    this.observedDockElements = nextTargets;

    if (!nextTargets.length) {
      return;
    }

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.invalidateGeometry());
      nextTargets.forEach((element) => this.resizeObserver?.observe(element));
    }

    if (placement.kind === "docked") {
      this.layoutMutationObserver = new MutationObserver(() => {
        this.syncPrecedingDockRow(this.placement);
        this.invalidateGeometry();
      });
      this.layoutMutationObserver.observe(placement.context.host, {
        childList: true
      });
    }
  }

  private disconnectLayoutObservers(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.layoutMutationObserver?.disconnect();
    this.layoutMutationObserver = null;
    this.clearPrecedingDockRow();
    this.observedDockElements = [];
  }

  private invalidateGeometry(): void {
    this.measurementDirty = true;
    this.schedulePositionUpdate();
  }

  private schedulePositionUpdate(): void {
    window.cancelAnimationFrame(this.positionRaf);
    this.positionRaf = window.requestAnimationFrame(() => this.updateDockedPosition());
  }

  private shouldPositionDockedPanel(): boolean {
    return this.desktop && this.placement.kind === "docked" && this.open;
  }

  private syncPrecedingDockRow(placement: ResolvedPanelPlacement): void {
    this.clearPrecedingDockRow();

    if (placement.kind !== "docked") {
      return;
    }

    const previousRow = this.elements.dockRow.previousElementSibling;
    if (!(previousRow instanceof HTMLElement)) {
      return;
    }

    previousRow.classList.add("ghcm-preceding-dock-row");
    this.styledPrecedingDockRow = previousRow;
  }

  private clearPrecedingDockRow(): void {
    this.styledPrecedingDockRow?.classList.remove("ghcm-preceding-dock-row");
    this.styledPrecedingDockRow = null;
  }

  private updateDockedPosition(): void {
    if (!this.shouldPositionDockedPanel()) {
      clearDockedPanelFrame(this.elements);
      this.measurementDirty = false;
      return;
    }

    if (this.placement.kind !== "docked") {
      return;
    }

    if (!this.measurementDirty) {
      return;
    }

    this.measurementDirty = false;
    const measurement = measureDockedPanel(this.elements, this.placement.context);
    const frame = computeDockedPanelFrame(measurement, this.placement.context.topOffset, window.innerHeight);
    applyDockedPanelFrame(this.elements, frame);
  }
}

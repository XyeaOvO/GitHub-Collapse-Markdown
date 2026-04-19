import { DockedPanelLayout } from "./panel-layout";
import { PanelOutlineView, type PanelRenderState } from "./panel-outline";
import type { DockedPanelLayoutContext } from "../core/types";

const DESKTOP_BREAKPOINT = 1180;

interface PanelUIOptions {
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onJump: (key: string) => void;
  resolveDockedLayout?: () => DockedPanelLayoutContext | null;
  resolveInlineHost?: () => HTMLElement | null;
}

interface PanelDomRefs {
  dockRow: HTMLDivElement;
  dockCell: HTMLDivElement;
  root: HTMLDivElement;
  trigger: HTMLButtonElement;
  backdrop: HTMLButtonElement;
  panel: HTMLElement;
  outline: HTMLElement;
  collapseAllButton: HTMLButtonElement;
  expandAllButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
}

export class PanelUI {
  private readonly abortController = new AbortController();
  private readonly dom = createPanelDom();
  private readonly layout: DockedPanelLayout;
  private readonly outlineView: PanelOutlineView;
  private mounted = false;
  private desktop = false;
  private open = false;

  constructor(private readonly options: PanelUIOptions) {
    this.layout = new DockedPanelLayout(
      {
        dockRow: this.dom.dockRow,
        dockCell: this.dom.dockCell,
        root: this.dom.root,
        panel: this.dom.panel
      },
      {
        resolveDockedLayout: this.options.resolveDockedLayout,
        resolveInlineHost: this.options.resolveInlineHost
      }
    );
    this.outlineView = new PanelOutlineView(this.dom.outline);
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    this.mounted = true;
    document.body.append(this.dom.root);
    this.layout.bind(this.abortController.signal);
    this.bindEvents();
    this.handleViewportChange(true);
  }

  destroy(): void {
    this.abortController.abort();
    this.layout.destroy();
    this.outlineView.destroy();
    this.dom.root.remove();
    this.mounted = false;
  }

  isOpen(): boolean {
    return this.open;
  }

  isConnected(): boolean {
    return this.dom.root.isConnected;
  }

  setOpen(open: boolean): void {
    this.applyOpenState(open);
  }

  render(state: PanelRenderState): void {
    const structureChanged = this.outlineView.render(state);
    if (this.open) {
      this.outlineView.scheduleActiveItemVisibility(true);
    }
    if (structureChanged) {
      this.layout.refreshGeometry();
    }
  }

  private bindEvents(): void {
    this.dom.trigger.addEventListener("click", () => this.setOpen(!this.open), {
      signal: this.abortController.signal
    });
    this.dom.backdrop.addEventListener("click", () => this.setOpen(false), {
      signal: this.abortController.signal
    });
    this.dom.collapseAllButton.addEventListener("click", () => this.options.onCollapseAll(), {
      signal: this.abortController.signal
    });
    this.dom.expandAllButton.addEventListener("click", () => this.options.onExpandAll(), {
      signal: this.abortController.signal
    });
    this.dom.closeButton.addEventListener("click", () => this.setOpen(false), {
      signal: this.abortController.signal
    });
    this.dom.outline.addEventListener("click", (event) => this.handleOutlineClick(event), {
      signal: this.abortController.signal
    });
    window.addEventListener("resize", () => this.handleViewportChange(), {
      signal: this.abortController.signal,
      passive: true
    });
    window.addEventListener("keydown", (event) => this.handleKeydown(event), {
      signal: this.abortController.signal
    });
  }

  private handleOutlineClick(event: Event): void {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(".ghcm-outline-link");
    const key = button?.dataset.key;
    if (!key) {
      return;
    }

    this.options.onJump(key);
    if (!this.desktop) {
      this.setOpen(false);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && !this.desktop && this.open) {
      this.setOpen(false);
    }
  }

  private handleViewportChange(force = false): void {
    const nextDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    const nextOpen = force || nextDesktop !== this.desktop ? nextDesktop : this.open;
    if (force || nextDesktop !== this.desktop) {
      this.desktop = nextDesktop;
    }
    this.applyOpenState(nextOpen);
  }

  private applyOpenState(open: boolean): void {
    const becameOpen = open && !this.open;
    this.open = open;
    this.sync();
    if (becameOpen) {
      this.outlineView.scheduleActiveItemVisibility(true);
    }
  }

  private sync(): void {
    this.layout.sync(this.desktop, this.open);
    const placement = this.layout.getPlacement();
    const docked = placement === "docked";
    const inline = placement === "inline";
    const overlay = placement === "overlay";

    this.dom.root.classList.toggle("is-desktop", this.desktop);
    this.dom.root.classList.toggle("is-docked", docked);
    this.dom.root.classList.toggle("is-inline", inline);
    this.dom.root.classList.toggle("is-overlay", overlay);
    this.dom.trigger.classList.toggle("is-hidden", this.open);
    this.dom.panel.classList.toggle("is-open", this.open);
    this.dom.backdrop.classList.toggle("is-open", this.open && overlay);
    this.dom.closeButton.textContent = this.desktop ? "Hide" : "Close";
    this.dom.closeButton.classList.toggle("is-hidden", !this.open);
    this.dom.trigger.setAttribute("aria-expanded", String(this.open));
  }
}

function createPanelDom(): PanelDomRefs {
  const dockRow = document.createElement("div");
  dockRow.className = "ghcm-dock-row BorderGrid-row";

  const dockCell = document.createElement("div");
  dockCell.className = "ghcm-dock-cell BorderGrid-cell";

  const root = document.createElement("div");
  root.className = "ghcm-root";

  const cell = document.createElement("div");
  cell.className = "ghcm-cell";

  const trigger = createButton("ghcm-trigger", "Contents", "Toggle contents");
  const backdrop = createButton("ghcm-backdrop", "", "Close contents");
  const panel = document.createElement("aside");
  panel.className = "ghcm-panel";
  panel.setAttribute("aria-label", "Page contents");

  const collapseAllButton = createButton("ghcm-inline-action", "Collapse all");
  collapseAllButton.dataset.action = "collapse-all";

  const expandAllButton = createButton("ghcm-inline-action", "Expand all");
  expandAllButton.dataset.action = "expand-all";

  const closeButton = createButton("ghcm-inline-action ghcm-close-action", "Hide");

  const outline = document.createElement("nav");
  outline.className = "ghcm-outline";
  outline.setAttribute("aria-label", "Page contents");

  const shell = document.createElement("div");
  shell.className = "ghcm-sidebar-shell";

  const header = document.createElement("header");
  header.className = "ghcm-sidebar-header";

  const kicker = document.createElement("div");
  kicker.className = "ghcm-sidebar-kicker";
  kicker.textContent = "Contents";

  const toolbar = document.createElement("div");
  toolbar.className = "ghcm-sidebar-tools";
  toolbar.append(collapseAllButton, expandAllButton, closeButton);
  header.append(kicker, toolbar);

  const outlineShell = document.createElement("div");
  outlineShell.className = "ghcm-sidebar-outline";
  outlineShell.append(outline);

  shell.append(header, outlineShell);
  panel.append(shell);
  cell.append(trigger, panel);
  root.append(cell, backdrop);
  dockCell.append(root);
  dockRow.append(dockCell);

  return {
    dockRow,
    dockCell,
    root,
    trigger,
    backdrop,
    panel,
    outline,
    collapseAllButton,
    expandAllButton,
    closeButton
  };
}

function createButton(className: string, textContent: string, ariaLabel?: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = textContent;

  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
  }

  return button;
}

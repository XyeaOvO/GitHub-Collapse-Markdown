import type { HeadingSnapshot } from "../core/types";

export interface PanelRenderState {
  headings: HeadingSnapshot[];
  activeHeadingKey: string | null;
  displayRevision: string;
}

export class PanelOutlineView {
  private visibilityRaf = 0;
  private displayRevision = "";
  private activeHeadingKey: string | null = null;
  private readonly itemElements = new Map<string, HTMLButtonElement>();

  constructor(private readonly outline: HTMLElement) {}

  destroy(): void {
    window.cancelAnimationFrame(this.visibilityRaf);
  }

  render(state: PanelRenderState): boolean {
    const structureChanged = state.displayRevision !== this.displayRevision;
    if (structureChanged) {
      this.displayRevision = state.displayRevision;
      this.renderStructure(state.headings);
    }

    this.syncItemStates(state.headings);
    this.syncActiveHeading(state.activeHeadingKey);
    return structureChanged;
  }

  scheduleActiveItemVisibility(open: boolean): void {
    window.cancelAnimationFrame(this.visibilityRaf);
    if (!open) {
      return;
    }

    this.visibilityRaf = window.requestAnimationFrame(() => this.ensureActiveItemVisible());
  }

  private ensureActiveItemVisible(): void {
    const activeItem = this.outline.querySelector<HTMLElement>(".ghcm-outline-link.is-active");
    if (!activeItem) {
      return;
    }

    const outlineHeight = this.outline.clientHeight;
    const maxScrollTop = Math.max(this.outline.scrollHeight - outlineHeight, 0);
    if (outlineHeight <= 0 || maxScrollTop <= 0) {
      return;
    }

    const outlineRect = this.outline.getBoundingClientRect();
    const activeRect = activeItem.getBoundingClientRect();
    const itemCenter = activeRect.top - outlineRect.top + this.outline.scrollTop + activeRect.height / 2;
    const currentCenter = this.outline.scrollTop + outlineHeight / 2;
    const comfortBand = Math.max(outlineHeight * 0.14, 24);
    const delta = itemCenter - currentCenter;

    if (Math.abs(delta) <= comfortBand) {
      return;
    }

    const targetTop = clamp(itemCenter - outlineHeight / 2, 0, maxScrollTop);
    if (typeof this.outline.scrollTo === "function") {
      this.outline.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });
      return;
    }

    this.outline.scrollTop = targetTop;
  }

  private renderStructure(headings: HeadingSnapshot[]): void {
    this.itemElements.clear();
    this.outline.replaceChildren();
    this.activeHeadingKey = null;

    if (headings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ghcm-outline-empty";
      empty.textContent = "No headings found.";
      this.outline.append(empty);
      return;
    }

    const minLevel = headings.reduce((lowest, heading) => Math.min(lowest, heading.level), headings[0]?.level ?? 1);
    const showGroups = new Set(headings.map((heading) => heading.container.key)).size > 1;
    const fragment = document.createDocumentFragment();
    let currentGroupKey = "";
    let currentGroup: HTMLElement | null = null;

    headings.forEach((heading) => {
      if (showGroups && heading.container.key !== currentGroupKey) {
        currentGroupKey = heading.container.key;
        currentGroup = document.createElement("section");
        currentGroup.className = "ghcm-outline-group";

        const groupTitle = document.createElement("p");
        groupTitle.className = "ghcm-outline-group-title";
        groupTitle.textContent = heading.container.label;

        currentGroup.append(groupTitle);
        fragment.append(currentGroup);
      }

      const item = createOutlineItem(heading, Math.max(0, heading.level - minLevel));
      this.itemElements.set(heading.key, item);

      if (currentGroup) {
        currentGroup.append(item);
      } else {
        fragment.append(item);
      }
    });

    this.outline.append(fragment);
  }

  private syncItemStates(headings: HeadingSnapshot[]): void {
    headings.forEach((heading) => {
      const item = this.itemElements.get(heading.key);
      if (!item) {
        return;
      }

      item.title = heading.text;
      item.classList.toggle("is-muted", heading.hiddenByAncestor);
      item.classList.toggle("is-collapsed", heading.collapsed);
    });
  }

  private syncActiveHeading(activeHeadingKey: string | null): void {
    if (activeHeadingKey === this.activeHeadingKey) {
      return;
    }

    const previous = this.activeHeadingKey ? this.itemElements.get(this.activeHeadingKey) : null;
    previous?.classList.remove("is-active");
    previous?.removeAttribute("aria-current");

    this.activeHeadingKey = activeHeadingKey;

    const current = activeHeadingKey ? this.itemElements.get(activeHeadingKey) : null;
    current?.classList.add("is-active");
    current?.setAttribute("aria-current", "location");
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createOutlineItem(heading: HeadingSnapshot, depth: number): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "ghcm-outline-link";
  item.dataset.key = heading.key;
  item.dataset.level = String(heading.level);
  item.style.setProperty("--ghcm-depth", String(depth));

  const rail = document.createElement("span");
  rail.className = "ghcm-outline-rail";
  rail.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "ghcm-outline-label";
  label.textContent = heading.text;

  item.append(rail, label);
  return item;
}

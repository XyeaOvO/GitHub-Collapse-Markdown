import type { PageDocument } from "./page-document";
import type { HeadingRecord, HeadingSnapshot, HeadingState } from "./types";

type ChangeListener = () => void;

export class CollapseEngine {
  private readonly collapsedKeys = new Set<string>();
  private readonly states = new Map<string, HeadingState>();
  private readonly listeners = new Set<ChangeListener>();

  constructor(private readonly document: PageDocument, initialCollapsedKeys: string[]) {
    this.document.filterKnownHeadingKeys(initialCollapsedKeys).forEach((key) => this.collapsedKeys.add(key));
    this.recompute();
  }

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isCollapsed(key: string): boolean {
    return this.collapsedKeys.has(key);
  }

  getState(key: string): HeadingState {
    return this.states.get(key) ?? { collapsed: false, hiddenByAncestor: false };
  }

  getSnapshots(): HeadingSnapshot[] {
    return this.getSnapshotsForHeadings(this.document.headings);
  }

  getSnapshotsForHeadings(headings: HeadingRecord[]): HeadingSnapshot[] {
    return headings.map((heading) => ({
      ...heading,
      ...this.getState(heading.key)
    }));
  }

  toggle(key: string): void {
    if (this.collapsedKeys.has(key)) {
      this.collapsedKeys.delete(key);
    } else {
      this.collapsedKeys.add(key);
    }
    this.apply();
  }

  toggleWithSiblings(key: string): void {
    const shouldCollapse = !this.collapsedKeys.has(key);
    const siblingKeys = this.document.getSiblingKeys(key);

    for (const siblingKey of siblingKeys) {
      if (shouldCollapse) {
        this.collapsedKeys.add(siblingKey);
      } else {
        this.collapsedKeys.delete(siblingKey);
      }
    }

    this.apply();
  }

  collapseAll(): void {
    this.document.headings.forEach((heading) => this.collapsedKeys.add(heading.key));
    this.apply();
  }

  expandAll(): void {
    this.collapsedKeys.clear();
    this.apply();
  }

  expandTo(key: string): void {
    this.document.getHeadingPath(key).forEach((heading) => this.collapsedKeys.delete(heading.key));
    this.apply();
  }

  getCollapsedKeysForContainer(containerKey: string): string[] {
    return this.document.headings
      .filter((heading) => heading.container.key === containerKey && this.collapsedKeys.has(heading.key))
      .map((heading) => heading.key);
  }

  apply(): void {
    this.recompute();
    this.listeners.forEach((listener) => listener());
  }

  private recompute(): void {
    this.states.clear();
    const stack: Array<{ key: string; level: number }> = [];

    for (const heading of this.document.headings) {
      while (stack.length > 0 && heading.level <= stack[stack.length - 1].level) {
        stack.pop();
      }

      const collapsed = this.collapsedKeys.has(heading.key);
      const hiddenByAncestor = stack.length > 0;

      this.states.set(heading.key, {
        collapsed,
        hiddenByAncestor
      });

      if (collapsed) {
        stack.push({
          key: heading.key,
          level: heading.level
        });
      }
    }
  }
}

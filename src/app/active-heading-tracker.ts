import type { HeadingBinding, HeadingSnapshot } from "../core/types";

interface ActiveHeadingTrackerOptions {
  getStickyTop: () => number;
  resolveBinding: (key: string) => HeadingBinding | undefined;
}

interface HeadingPosition {
  key: string;
  top: number;
}

export class ActiveHeadingTracker {
  private activeHeadingKey: string | null = null;
  private rafHandle = 0;
  private positionsDirty = true;
  private positionsSignature = "";
  private headingPositions: HeadingPosition[] = [];

  constructor(private readonly options: ActiveHeadingTrackerOptions) {}

  bind(signal: AbortSignal, getSnapshots: () => HeadingSnapshot[], onChange: (activeHeadingKey: string | null) => void): void {
    const scheduleSync = () => {
      window.cancelAnimationFrame(this.rafHandle);
      this.rafHandle = window.requestAnimationFrame(() => {
        if (!this.sync(getSnapshots())) {
          return;
        }

        onChange(this.activeHeadingKey);
      });
    };

    window.addEventListener(
      "scroll",
      () => scheduleSync(),
      { signal, passive: true }
    );
    window.addEventListener(
      "resize",
      () => {
        this.positionsDirty = true;
        scheduleSync();
      },
      { signal, passive: true }
    );
  }

  destroy(): void {
    window.cancelAnimationFrame(this.rafHandle);
  }

  getActiveHeadingKey(): string | null {
    return this.activeHeadingKey;
  }

  setActiveHeadingKey(activeHeadingKey: string | null, force = false): boolean {
    if (!force && activeHeadingKey === this.activeHeadingKey) {
      return false;
    }

    this.activeHeadingKey = activeHeadingKey;
    return true;
  }

  sync(snapshots: HeadingSnapshot[], force = false): boolean {
    this.refreshHeadingPositions(snapshots);
    return this.setActiveHeadingKey(this.computeActiveHeadingKey(), force);
  }

  private refreshHeadingPositions(snapshots: HeadingSnapshot[]): void {
    const nextSignature = snapshots
      .map((heading) => `${heading.key}:${heading.hiddenByAncestor ? "hidden" : "visible"}`)
      .join("|");
    if (!this.positionsDirty && nextSignature === this.positionsSignature) {
      return;
    }

    this.positionsSignature = nextSignature;
    this.positionsDirty = false;
    this.headingPositions = snapshots.flatMap((heading) => {
      if (heading.hiddenByAncestor) {
        return [];
      }

      const binding = this.options.resolveBinding(heading.key);
      if (!binding) {
        return [];
      }

      return [
        {
          key: heading.key,
          top: window.scrollY + binding.blockEl.getBoundingClientRect().top
        }
      ];
    });
  }

  private computeActiveHeadingKey(): string | null {
    if (this.headingPositions.length === 0) {
      return null;
    }

    const threshold = window.scrollY + this.options.getStickyTop() + 8;
    let low = 0;
    let high = this.headingPositions.length - 1;
    let match = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.headingPositions[mid].top <= threshold) {
        match = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return match >= 0 ? this.headingPositions[match].key : null;
  }
}

import { buildSiblingBucketKey } from "./document-keys";
import type { ContainerRecord, HeadingBinding, HeadingRecord } from "./types";

interface PageDocumentOptions {
  containers: ContainerRecord[];
  headings: HeadingRecord[];
  containerElements: Array<{ key: string; element: HTMLElement }>;
  headingBindings: HeadingBinding[];
  headingPathKeys: Map<string, string[]>;
  siblingIndex: Map<string, string[]>;
}

export class PageDocument {
  readonly containers: ContainerRecord[];
  readonly headings: HeadingRecord[];
  private readonly containerElements = new Map<string, HTMLElement>();
  private readonly headingIndex = new Map<string, HeadingRecord>();
  private readonly headingBindings = new Map<string, HeadingBinding>();
  private readonly headingPathKeys = new Map<string, string[]>();
  private readonly siblingIndex = new Map<string, string[]>();

  constructor(options: PageDocumentOptions) {
    this.containers = options.containers;
    this.headings = options.headings;

    options.containerElements.forEach((container) => this.containerElements.set(container.key, container.element));
    options.headings.forEach((heading) => this.headingIndex.set(heading.key, heading));
    options.headingBindings.forEach((binding) => this.headingBindings.set(binding.key, binding));
    options.headingPathKeys.forEach((pathKeys, key) => this.headingPathKeys.set(key, pathKeys));
    options.siblingIndex.forEach((siblingKeys, key) => this.siblingIndex.set(key, siblingKeys));
  }

  findHeading(key: string): HeadingRecord | undefined {
    return this.headingIndex.get(key);
  }

  hasHeading(key: string): boolean {
    return this.headingIndex.has(key);
  }

  getBinding(key: string): HeadingBinding | undefined {
    return this.headingBindings.get(key);
  }

  getContainerElements(): HTMLElement[] {
    return [...this.containerElements.values()];
  }

  getPrimaryContainerElement(): HTMLElement | null {
    return this.containerElements.values().next().value ?? null;
  }

  filterKnownHeadingKeys(keys: string[]): string[] {
    return keys.filter((key) => this.hasHeading(key));
  }

  getHeadingPath(key: string): HeadingRecord[] {
    return (this.headingPathKeys.get(key) ?? [])
      .map((pathKey) => this.headingIndex.get(pathKey))
      .filter((heading): heading is HeadingRecord => Boolean(heading));
  }

  getSiblingKeys(key: string): string[] {
    const heading = this.findHeading(key);
    if (!heading) {
      return [];
    }

    return [...(this.siblingIndex.get(buildSiblingBucketKey(heading)) ?? [])];
  }
}

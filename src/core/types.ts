export type SiteId = "github" | "gist" | "docs";
export type ContainerKind = "markdown" | "comment" | "article";

export interface ContentContainer {
  key: string;
  label: string;
  kind: ContainerKind;
  element: HTMLElement;
}

export interface ContainerRecord {
  key: string;
  label: string;
  kind: ContainerKind;
}

export interface SiteAdapter {
  id: SiteId;
  matches(location: Location): boolean;
  getPageKey(location: Location): string;
  findContainers(document: Document): ContentContainer[];
  shouldRefreshForMutation(mutation: MutationRecord): boolean;
  getStickyHeaderOffset(document: Document): number;
  getDockedPanelLayout?(document: Document): DockedPanelLayoutContext | null;
}

export interface DockedPanelLayoutContext {
  host: HTMLElement;
  boundary?: HTMLElement | null;
  topOffset: number;
}

export interface HeadingRecord {
  key: string;
  anchor: string;
  level: number;
  text: string;
  container: ContainerRecord;
  parentKey: string | null;
}

export interface HeadingBinding {
  key: string;
  headingEl: HTMLHeadingElement;
  blockEl: HTMLElement;
  sectionEls: HTMLElement[];
}

export interface PageState {
  collapsedByContainer: Record<string, string[]>;
}

export interface PersistedState {
  version: 2;
  pages: Record<string, PageState>;
}

export interface LegacyPersistedState {
  version: 1;
  settings?: {
    memoryEnabled?: boolean;
  };
  pages?: Record<string, PageState>;
}

export interface HeadingState {
  collapsed: boolean;
  hiddenByAncestor: boolean;
}

export interface HeadingSnapshot extends HeadingRecord, HeadingState {}

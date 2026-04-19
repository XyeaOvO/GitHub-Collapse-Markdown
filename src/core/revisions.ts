import type { ContainerRecord, HeadingRecord, HeadingSnapshot, SiteId } from "./types";

type StructuredHeading =
  | Pick<HeadingRecord, "key" | "anchor" | "level" | "parentKey" | "text" | "container">
  | Pick<HeadingSnapshot, "key" | "anchor" | "level" | "parentKey" | "text" | "container">;
type StructuredContainer = Pick<ContainerRecord, "key" | "label" | "kind">;

export interface PageVersion {
  structure: string;
  display: string;
}

function serializeContainerIdentity(container: StructuredContainer): string {
  return `${container.key}:${container.kind}`;
}

function serializeContainerDisplay(container: StructuredContainer): string {
  return `${serializeContainerIdentity(container)}:${container.label}`;
}

function serializeHeadingIdentity(heading: StructuredHeading): string {
  return [
    heading.key,
    serializeContainerIdentity(heading.container),
    heading.anchor,
    heading.level,
    heading.parentKey ?? "root"
  ].join(":");
}

export function buildHeadingIdentityRevision(headings: StructuredHeading[]): string {
  return headings
    .map((heading) => serializeHeadingIdentity(heading))
    .join("|");
}

export function buildHeadingDisplayRevision(headings: StructuredHeading[]): string {
  return headings
    .map((heading) => `${serializeHeadingIdentity(heading)}:${serializeContainerDisplay(heading.container)}:${heading.text}`)
    .join("|");
}

export function buildPageIdentityRevision(siteId: SiteId, pageKey: string, headings: StructuredHeading[]): string {
  const headingRevision = buildHeadingIdentityRevision(headings);
  return `${siteId}:${pageKey}:${headingRevision || "empty"}`;
}

export function buildPageDisplayRevision(siteId: SiteId, pageKey: string, headings: StructuredHeading[]): string {
  const headingRevision = buildHeadingDisplayRevision(headings);
  return `${siteId}:${pageKey}:${headingRevision || "empty"}`;
}

export function buildPageVersion(siteId: SiteId, pageKey: string, headings: StructuredHeading[]): PageVersion {
  return {
    structure: buildPageIdentityRevision(siteId, pageKey, headings),
    display: buildPageDisplayRevision(siteId, pageKey, headings)
  };
}

export function hasSamePageStructure(left: PageVersion | null, right: PageVersion): boolean {
  return left?.structure === right.structure;
}

export function hasSamePageDisplay(left: PageVersion | null, right: PageVersion): boolean {
  return left?.display === right.display;
}

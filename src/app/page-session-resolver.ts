import type { PageDocument } from "../core/page-document";
import type { PageVersion } from "../core/revisions";
import { buildPageVersion } from "../core/revisions";
import type { SiteAdapter } from "../core/types";
import { buildDocument } from "../parsing/document-parser";

export interface PageSessionSpec {
  adapter: SiteAdapter;
  pageKey: string;
  version: PageVersion;
  document: PageDocument;
}

export type PageSessionResolution =
  | { kind: "unsupported" }
  | { kind: "empty"; version: PageVersion }
  | { kind: "ready"; spec: PageSessionSpec };

export function findMatchingAdapter(adapters: SiteAdapter[], location: Location): SiteAdapter | null {
  return adapters.find((candidate) => candidate.matches(location)) ?? null;
}

export function resolvePageSession(
  adapters: SiteAdapter[],
  document: Document,
  location: Location
): PageSessionResolution {
  const adapter = findMatchingAdapter(adapters, location);
  if (!adapter) {
    return { kind: "unsupported" };
  }

  const pageKey = adapter.getPageKey(location);
  const containers = adapter.findContainers(document);
  if (containers.length === 0) {
    return {
      kind: "empty",
      version: buildPageVersion(adapter.id, pageKey, [])
    };
  }

  const parsedDocument = buildDocument(containers);
  return {
    kind: "ready",
    spec: {
      adapter,
      pageKey,
      document: parsedDocument,
      version: buildPageVersion(adapter.id, pageKey, parsedDocument.headings)
    }
  };
}

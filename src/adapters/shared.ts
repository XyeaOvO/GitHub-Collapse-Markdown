import type { ContainerKind, ContentContainer, SiteId } from "../core/types";
import { hasHeadings } from "../parsing/heading-dom";
import { isManagedNode } from "../utils/dom";

export function getLocationPageKey(location: Location): string {
  return `${location.hostname}${location.pathname}${location.search}`;
}

export function queryContentCandidates(
  document: Document,
  selector: string,
  excludeSelector = ".ghcm-root, nav, aside, header, footer"
): HTMLElement[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
    .filter((element) => !element.closest(excludeSelector))
    .filter((element) => hasHeadings(element));

  return candidates.filter((element) => !candidates.some((other) => other !== element && element.contains(other)));
}

export function buildContentContainers(
  siteId: SiteId,
  candidates: HTMLElement[],
  describe: (element: HTMLElement, index: number) => {
    id: string;
    label: string;
    kind: ContainerKind;
  }
): ContentContainer[] {
  const uniqueCandidates = uniqueCandidateElements(candidates);
  return uniqueCandidates.map((element, index) => {
    const descriptor = describe(element, index);
    return {
      key: `${siteId}:${descriptor.id}`,
      label: descriptor.label,
      kind: descriptor.kind,
      element
    };
  });
}

export function findFirstContentCandidate(
  document: Document,
  selector: string,
  excludeSelector = ".ghcm-root, nav, aside, header, footer"
): HTMLElement | null {
  return queryContentCandidates(document, selector, excludeSelector)[0] ?? null;
}

export function describeStaticContainer(id: string, label: string, kind: ContainerKind) {
  return () => ({
    id,
    label,
    kind
  });
}

export function shouldRefreshForContentMutation(
  mutation: MutationRecord,
  contentRootSelector: string
): boolean {
  if (mutation.type !== "childList") {
    return false;
  }

  const target = mutation.target instanceof HTMLElement ? mutation.target : null;
  if (target?.closest(".ghcm-root")) {
    return false;
  }

  const changedNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  if (changedNodes.some((node) => isContentMutationNode(node, contentRootSelector))) {
    return true;
  }

  if (!target?.closest(contentRootSelector)) {
    return false;
  }

  return changedNodes.some((node) => !isManagedNode(node));
}

function isContentMutationNode(node: Node, contentRootSelector: string): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  if (isManagedNode(node)) {
    return false;
  }

  return Boolean(node.matches?.(contentRootSelector) || node.querySelector?.(contentRootSelector));
}

function uniqueCandidateElements(candidates: HTMLElement[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  return candidates.filter((element) => {
    if (seen.has(element)) {
      return false;
    }

    seen.add(element);
    return true;
  });
}

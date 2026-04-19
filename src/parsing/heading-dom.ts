import { normalizeWhitespace, slugify } from "../utils/strings";

export const HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";

export function getHeadingLevel(element: HTMLHeadingElement): number {
  return Number(element.tagName.slice(1));
}

export function getHeadingBlock(element: HTMLHeadingElement): HTMLElement {
  return element.closest(".markdown-heading") as HTMLElement ?? element;
}

export function getHeadingText(element: HTMLHeadingElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("a.anchor, .heading-link-symbol, svg, .octicon-link, .ghcm-heading-toggle")
    .forEach((node) => node.remove());
  return normalizeWhitespace(clone.textContent ?? "");
}

export function getHeadingAnchor(element: HTMLHeadingElement, fallbackIndex: number): string {
  const wrapperAnchor = element.closest(".markdown-heading")?.querySelector<HTMLAnchorElement>("a.anchor");
  if (wrapperAnchor?.hash) {
    return wrapperAnchor.hash.replace(/^#/, "");
  }

  const inlineAnchor =
    element.querySelector<HTMLAnchorElement>("a.anchor, a.heading-link") ??
    element.closest("h1,h2,h3,h4,h5,h6")?.querySelector<HTMLAnchorElement>("a.anchor, a.heading-link");

  if (inlineAnchor?.hash) {
    return inlineAnchor.hash.replace(/^#/, "");
  }

  if (element.id) {
    return element.id;
  }

  return slugify(getHeadingText(element)) || `heading-${fallbackIndex + 1}`;
}

export function queryHeadings(container: HTMLElement): HTMLHeadingElement[] {
  return Array.from(container.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR)).filter((heading) => {
    if (!getHeadingText(heading)) {
      return false;
    }
    if (heading.closest(".ghcm-root")) {
      return false;
    }
    if (heading.closest("nav, aside, header, footer, [data-container='toc']")) {
      return false;
    }
    return true;
  });
}

export function hasHeadings(container: HTMLElement): boolean {
  return queryHeadings(container).length > 0;
}

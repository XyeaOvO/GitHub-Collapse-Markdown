import { normalizeWhitespace } from "./strings";

export function scrollToElementWithOffset(element: HTMLElement, offset: number): void {
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth"
  });
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest("a, button, input, textarea, select, summary, details, [role='button']"));
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, [contenteditable=''], [contenteditable='true'], [role='textbox']"));
}

export function isManagedNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  if (node.classList.contains("ghcm-root") || node.classList.contains("ghcm-heading-toggle")) {
    return true;
  }

  return Array.from(node.classList).some((className) => className.startsWith("ghcm-"));
}

export function getSelectionText(): string {
  return normalizeWhitespace(window.getSelection?.()?.toString() ?? "");
}

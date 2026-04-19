import type { CollapseEngine } from "../core/collapse-engine";
import type { PageDocument } from "../core/page-document";
import type { HeadingBinding, HeadingRecord, HeadingSnapshot } from "../core/types";
import { getSelectionText, isInteractiveTarget } from "../utils/dom";

function createToggleButton(heading: HeadingRecord, collapsed: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghcm-heading-toggle";
  button.textContent = collapsed ? "▸" : "▾";
  button.setAttribute("aria-label", `Toggle section: ${heading.text}`);
  button.setAttribute("title", heading.text);
  return button;
}

export class HeadingControls {
  private readonly toggleElements = new Map<string, HTMLButtonElement>();

  constructor(private readonly document: PageDocument, private readonly engine: CollapseEngine) {}

  mount(signal: AbortSignal): void {
    this.document.headings.forEach((heading) => {
      const binding = this.document.getBinding(heading.key);
      if (!binding) {
        return;
      }

      const wrapped = binding.blockEl !== binding.headingEl;
      const toggleHeading = (useSiblings: boolean) => {
        if (useSiblings) {
          this.engine.toggleWithSiblings(heading.key);
        } else {
          this.engine.toggle(heading.key);
        }
      };

      binding.blockEl.classList.add("ghcm-heading-block");
      if (wrapped) {
        binding.blockEl.classList.add("ghcm-heading-block--wrapped");
      } else {
        binding.headingEl.classList.add("ghcm-heading-inline");
      }

      const button = createToggleButton(heading, this.engine.isCollapsed(heading.key));
      this.toggleElements.set(heading.key, button);
      binding.headingEl.prepend(button);

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleHeading(event.shiftKey);
        },
        { signal }
      );

      const clickTarget = wrapped ? binding.blockEl : binding.headingEl;
      clickTarget.addEventListener(
        "click",
        (event) => {
          if (getSelectionText() || isNativePermalinkTarget(binding, event.target) || isInteractiveTarget(event.target)) {
            return;
          }
          event.preventDefault();
          toggleHeading(event.shiftKey);
        },
        { signal }
      );
    });
  }

  sync(snapshots: HeadingSnapshot[]): void {
    snapshots.forEach((snapshot) => {
      const binding = this.document.getBinding(snapshot.key);
      if (!binding) {
        return;
      }

      binding.blockEl.classList.toggle("ghcm-hidden-by-parent", snapshot.hiddenByAncestor);
      binding.blockEl.classList.toggle("ghcm-collapsed", snapshot.collapsed);
      binding.blockEl.classList.toggle("ghcm-visible-heading", !snapshot.hiddenByAncestor);
      binding.blockEl.setAttribute("aria-expanded", String(!snapshot.collapsed));

      const toggle = this.toggleElements.get(snapshot.key);
      if (toggle) {
        toggle.textContent = snapshot.collapsed ? "▸" : "▾";
        toggle.setAttribute("title", snapshot.text);
        toggle.setAttribute(
          "aria-label",
          `${snapshot.collapsed ? "Expand" : "Collapse"} section: ${snapshot.text}`
        );
      }

      for (const element of binding.sectionEls) {
        element.classList.toggle("ghcm-section-hidden", snapshot.hiddenByAncestor || snapshot.collapsed);
      }
    });
  }

  isConnected(): boolean {
    return this.document.headings.every((heading) => {
      const binding = this.document.getBinding(heading.key);
      const toggle = this.toggleElements.get(heading.key);

      return Boolean(
        binding &&
        binding.headingEl.isConnected &&
        binding.blockEl.isConnected &&
        toggle?.isConnected
      );
    });
  }

  destroy(): void {
    this.document.headings.forEach((heading) => {
      const binding = this.document.getBinding(heading.key);
      if (!binding) {
        return;
      }

      this.toggleElements.get(heading.key)?.remove();
      this.toggleElements.delete(heading.key);
      binding.blockEl.classList.remove("ghcm-heading-block", "ghcm-heading-block--wrapped");
      binding.blockEl.classList.remove("ghcm-hidden-by-parent", "ghcm-collapsed", "ghcm-visible-heading");
      binding.blockEl.removeAttribute("aria-expanded");
      binding.headingEl.classList.remove("ghcm-heading-inline");
      binding.sectionEls.forEach((element) => element.classList.remove("ghcm-section-hidden"));
    });
  }
}

function isNativePermalinkTarget(binding: HeadingBinding, target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const permalink = target.closest("a.anchor, a.heading-link");
  return Boolean(permalink && binding.blockEl.contains(permalink));
}

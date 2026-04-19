import { describe, expect, it } from "vitest";
import { CollapseEngine } from "../src/core/collapse-engine";
import { buildDocument } from "../src/parsing/document-parser";
import type { ContentContainer } from "../src/core/types";
import { HeadingControls } from "../src/ui/heading-controls";
import { docsArticleFixture } from "./fixtures";

describe("docs heading controls", () => {
  it("does not collapse when clicking the native docs heading link", () => {
    document.body.innerHTML = docsArticleFixture;

    const container: ContentContainer = {
      key: "docs:article",
      label: "Docs Article",
      kind: "article",
      element: document.querySelector(".markdown-body") as HTMLElement
    };

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, []);
    const controller = new AbortController();
    const controls = new HeadingControls(pageDocument, engine);

    controls.mount(controller.signal);
    engine.apply();
    controls.sync(engine.getSnapshots());

    const heading = pageDocument.headings[0];
    const binding = pageDocument.getBinding(heading.key);
    const nativeLink = binding?.headingEl.querySelector("a.heading-link") as HTMLAnchorElement;
    nativeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(engine.isCollapsed(heading.key)).toBe(false);
    controller.abort();
    controls.destroy();
  });

  it("renders a dedicated toggle button for docs headings", () => {
    document.body.innerHTML = docsArticleFixture;

    const container: ContentContainer = {
      key: "docs:article",
      label: "Docs Article",
      kind: "article",
      element: document.querySelector(".markdown-body") as HTMLElement
    };

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, []);
    const controller = new AbortController();
    const controls = new HeadingControls(pageDocument, engine);

    controls.mount(controller.signal);
    engine.apply();
    controls.sync(engine.getSnapshots());

    const heading = pageDocument.headings[0];
    const binding = pageDocument.getBinding(heading.key);
    expect(binding?.headingEl.firstElementChild?.classList.contains("ghcm-heading-toggle")).toBe(true);

    const toggle = binding?.headingEl.querySelector(".ghcm-heading-toggle") as HTMLButtonElement | null;
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(engine.isCollapsed(heading.key)).toBe(true);
    controller.abort();
    controls.destroy();
  });
});

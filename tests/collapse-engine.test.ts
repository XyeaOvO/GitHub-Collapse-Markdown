import { describe, expect, it } from "vitest";
import { CollapseEngine } from "../src/core/collapse-engine";
import { buildDocument } from "../src/parsing/document-parser";
import type { ContentContainer } from "../src/core/types";
import { HeadingControls } from "../src/ui/heading-controls";

describe("CollapseEngine", () => {
  it("hides descendant headings when the parent is collapsed", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p id="first">alpha</p>
        <div class="markdown-heading"><h3 class="heading-element">Nested</h3><a class="anchor" href="#nested"></a></div>
        <p id="second">beta</p>
        <div class="markdown-heading"><h2 class="heading-element">Next</h2><a class="anchor" href="#next"></a></div>
        <p id="third">gamma</p>
      </article>
    `;

    const container: ContentContainer = {
      key: "github:readme",
      label: "README",
      kind: "markdown",
      element: document.querySelector(".markdown-body") as HTMLElement
    };

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, [pageDocument.headings[0].key]);
    const controls = new HeadingControls(pageDocument, engine);
    const controller = new AbortController();

    controls.mount(controller.signal);
    engine.apply();
    controls.sync(engine.getSnapshots());

    expect(engine.getState(pageDocument.headings[1].key).hiddenByAncestor).toBe(true);
    expect(document.getElementById("first")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(document.getElementById("second")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(document.getElementById("third")?.classList.contains("ghcm-section-hidden")).toBe(false);

    controller.abort();
    controls.destroy();
  });
});

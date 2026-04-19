import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveHeadingTracker } from "../src/app/active-heading-tracker";
import { buildDocument } from "../src/parsing/document-parser";
import { CollapseEngine } from "../src/core/collapse-engine";
import type { ContentContainer } from "../src/core/types";

function createContainer(markup: string): ContentContainer {
  document.body.innerHTML = markup;
  return {
    key: "github:readme",
    label: "README",
    kind: "markdown",
    element: document.querySelector(".markdown-body") as HTMLElement
  };
}

describe("ActiveHeadingTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("ignores hidden descendant headings when resolving the active heading", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading" id="intro-block"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p>alpha</p>
        <div class="markdown-heading" id="nested-block"><h3 class="heading-element">Nested</h3><a class="anchor" href="#nested"></a></div>
        <p>beta</p>
        <div class="markdown-heading" id="next-block"><h2 class="heading-element">Next</h2><a class="anchor" href="#next"></a></div>
        <p>gamma</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, [pageDocument.headings[0].key]);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.id === "intro-block") {
        return DOMRect.fromRect({ x: 0, y: 40, width: 100, height: 24 });
      }
      if (this.id === "nested-block") {
        return DOMRect.fromRect({ x: 0, y: 60, width: 100, height: 24 });
      }
      if (this.id === "next-block") {
        return DOMRect.fromRect({ x: 0, y: 220, width: 100, height: 24 });
      }

      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    });

    const tracker = new ActiveHeadingTracker({
      getStickyTop: () => 80,
      resolveBinding: (key) => pageDocument.getBinding(key)
    });

    expect(tracker.sync(engine.getSnapshots(), true)).toBe(true);

    expect(tracker.getActiveHeadingKey()).toBe(pageDocument.headings[0].key);
  });
});

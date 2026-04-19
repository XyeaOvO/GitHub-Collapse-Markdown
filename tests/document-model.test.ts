import { describe, expect, it } from "vitest";
import { buildDocument } from "../src/parsing/document-parser";
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

describe("PageDocument", () => {
  it("builds section boundaries from markdown headings", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p>alpha</p>
        <div class="markdown-heading"><h3 class="heading-element">Nested</h3><a class="anchor" href="#nested"></a></div>
        <p>beta</p>
        <div class="markdown-heading"><h2 class="heading-element">Next</h2><a class="anchor" href="#next"></a></div>
        <p>gamma</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    expect(pageDocument.headings).toHaveLength(3);
    expect(pageDocument.getBinding(pageDocument.headings[0].key)?.sectionEls).toHaveLength(3);
    expect(pageDocument.getBinding(pageDocument.headings[1].key)?.sectionEls).toHaveLength(1);
    expect(pageDocument.getBinding(pageDocument.headings[2].key)?.sectionEls).toHaveLength(1);
  });

  it("assigns nested heading blocks to ancestors but stops at the next peer heading", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p id="alpha">alpha</p>
        <div class="markdown-heading"><h3 class="heading-element">Nested</h3><a class="anchor" href="#nested"></a></div>
        <p id="beta">beta</p>
        <div class="markdown-heading"><h2 class="heading-element">Next</h2><a class="anchor" href="#next"></a></div>
        <p id="gamma">gamma</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const introSectionIds = pageDocument
      .getBinding(pageDocument.headings[0].key)
      ?.sectionEls.map((element) => element.id || element.querySelector(".heading-element")?.textContent?.trim());
    const nestedSectionIds = pageDocument
      .getBinding(pageDocument.headings[1].key)
      ?.sectionEls.map((element) => element.id || element.querySelector(".heading-element")?.textContent?.trim());

    expect(introSectionIds).toEqual(["alpha", "Nested", "beta"]);
    expect(nestedSectionIds).toEqual(["beta"]);
  });

  it("disambiguates duplicate plain headings without clobbering their keys", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <h2>Intro</h2>
        <p>alpha</p>
        <h2>Intro</h2>
        <p>beta</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);

    expect(pageDocument.headings.map((heading) => heading.key)).toEqual([
      "github:readme::intro",
      "github:readme::intro::2"
    ]);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { PageSession } from "../src/app/page-session";
import { buildDocument } from "../src/parsing/document-parser";
import { StorageService } from "../src/core/storage";
import type { ContentContainer, SiteAdapter } from "../src/core/types";

const adapter: SiteAdapter = {
  id: "github",
  matches: () => true,
  getPageKey: () => "github.com/test",
  findContainers: () => [],
  shouldRefreshForMutation: () => false,
  getStickyHeaderOffset: () => 0
};

function createContainer(markup: string): ContentContainer {
  document.body.innerHTML = markup;
  return {
    key: "github:readme",
    label: "README",
    kind: "markdown",
    element: document.querySelector(".markdown-body") as HTMLElement
  };
}

describe("PageSession", () => {
  let session: PageSession | null = null;

  afterEach(() => {
    session?.destroy();
    session = null;
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("restores collapsed headings from page memory on mount", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p id="intro-copy">alpha</p>
        <div class="markdown-heading"><h2 class="heading-element">Next</h2><a class="anchor" href="#next"></a></div>
        <p id="next-copy">beta</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const storage = new StorageService();
    storage.setPageState("github.com/test", {
      collapsedByContainer: {
        [container.key]: [pageDocument.headings[0].key]
      }
    });

    session = new PageSession("github.com/test", adapter, pageDocument, storage);
    session.mount();

    expect(document.getElementById("intro-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(document.getElementById("next-copy")?.classList.contains("ghcm-section-hidden")).toBe(false);
  });

  it("clears stored page memory and re-expands the current session", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p id="intro-copy">alpha</p>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const storage = new StorageService();
    storage.setPageState("github.com/test", {
      collapsedByContainer: {
        [container.key]: [pageDocument.headings[0].key]
      }
    });

    session = new PageSession("github.com/test", adapter, pageDocument, storage);
    session.mount();
    session.clearPageMemory();

    expect(storage.getPageState("github.com/test")).toEqual({
      collapsedByContainer: {}
    });
    expect(document.getElementById("intro-copy")?.classList.contains("ghcm-section-hidden")).toBe(false);
  });
});

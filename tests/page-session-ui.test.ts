import { afterEach, describe, expect, it } from "vitest";
import { PageSessionUI } from "../src/app/page-session-ui";
import { CollapseEngine } from "../src/core/collapse-engine";
import { buildDocument } from "../src/parsing/document-parser";
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

describe("PageSessionUI", () => {
  let abortController: AbortController | null = null;
  let ui: PageSessionUI | null = null;

  afterEach(() => {
    abortController?.abort();
    ui?.destroy();
    abortController = null;
    ui = null;
    document.body.innerHTML = "";
  });

  it("renders outline state directly from heading snapshots", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        <p>alpha</p>
        <div class="markdown-heading"><h3 class="heading-element">Nested</h3><a class="anchor" href="#nested"></a></div>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, []);

    abortController = new AbortController();
    ui = new PageSessionUI({
      adapter,
      engine,
      document: pageDocument,
      onCollapseAll: () => undefined,
      onExpandAll: () => undefined,
      onExpandTo: () => undefined
    });

    ui.mount(abortController.signal);
    ui.renderSnapshots(engine.getSnapshots());

    expect(document.querySelector(".ghcm-outline")?.textContent).toContain("Intro");
    expect(document.querySelector(".ghcm-outline")?.textContent).toContain("Nested");
    expect(ui.isStale()).toBe(false);
  });

  it("reports itself as stale when managed controls disappear from the DOM", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, []);

    abortController = new AbortController();
    ui = new PageSessionUI({
      adapter,
      engine,
      document: pageDocument,
      onCollapseAll: () => undefined,
      onExpandAll: () => undefined,
      onExpandTo: () => undefined
    });

    ui.mount(abortController.signal);
    ui.renderSnapshots(engine.getSnapshots());
    document.querySelector(".ghcm-heading-toggle")?.remove();

    expect(ui.isStale()).toBe(true);
  });

  it("reports itself as stale when the source markdown container leaves the DOM", () => {
    const container = createContainer(`
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
      </article>
    `);

    const pageDocument = buildDocument([container]);
    const engine = new CollapseEngine(pageDocument, []);

    abortController = new AbortController();
    ui = new PageSessionUI({
      adapter,
      engine,
      document: pageDocument,
      onCollapseAll: () => undefined,
      onExpandAll: () => undefined,
      onExpandTo: () => undefined
    });

    ui.mount(abortController.signal);
    ui.renderSnapshots(engine.getSnapshots());
    container.element.remove();

    expect(ui.isStale()).toBe(true);
  });
});

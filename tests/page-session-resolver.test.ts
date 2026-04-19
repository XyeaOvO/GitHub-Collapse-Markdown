import { afterEach, describe, expect, it } from "vitest";
import { resolvePageSession } from "../src/app/page-session-resolver";
import { adapters } from "../src/adapters";

describe("PageSessionResolver", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves a ready GitHub markdown session", () => {
    window.history.replaceState({}, "", "/nodejs/node/blob/main/README.md");
    document.body.innerHTML = `
      <article id="readme">
        <div class="markdown-body">
          <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
          <p>alpha</p>
        </div>
      </article>
    `;

    const resolution = resolvePageSession(
      adapters,
      document,
      new URL("https://github.com/nodejs/node/blob/main/README.md") as unknown as Location
    );

    expect(resolution.kind).toBe("ready");
    if (resolution.kind !== "ready") {
      return;
    }

    expect(resolution.spec.adapter.id).toBe("github");
    expect(resolution.spec.document.headings).toHaveLength(1);
    expect(resolution.spec.version.structure).toContain("github:github.com/nodejs/node/blob/main/README.md");
    expect(resolution.spec.version.display).toContain("README");
  });

  it("returns empty when the active adapter matches but no heading containers are present", () => {
    document.body.innerHTML = `<main><article><div class="markdown-body"><p>No headings</p></div></article></main>`;

    const resolution = resolvePageSession(
      adapters,
      document,
      new URL("https://docs.github.com/en/get-started") as unknown as Location
    );

    expect(resolution).toEqual({
      kind: "empty",
      version: {
        structure: "docs:docs.github.com/en/get-started:empty",
        display: "docs:docs.github.com/en/get-started:empty"
      }
    });
  });

  it("returns unsupported on the GitHub root home page even when markdown is present", () => {
    window.history.replaceState({}, "", "/");
    document.body.innerHTML = `
      <article id="readme">
        <div class="markdown-body">
          <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
          <p>alpha</p>
        </div>
      </article>
    `;

    const resolution = resolvePageSession(
      adapters,
      document,
      new URL("https://github.com/") as unknown as Location
    );

    expect(resolution).toEqual({ kind: "unsupported" });
  });
});

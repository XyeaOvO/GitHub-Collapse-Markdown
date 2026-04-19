import { describe, expect, it } from "vitest";
import { docsAdapter } from "../src/adapters/docs";
import { gistAdapter } from "../src/adapters/gist";
import { githubAdapter } from "../src/adapters/github";

function createLocation(url: string): Location {
  return new URL(url) as unknown as Location;
}

function createMutation({
  target,
  addedNodes = [],
  removedNodes = []
}: {
  target: Node;
  addedNodes?: Node[];
  removedNodes?: Node[];
}): MutationRecord {
  return {
    type: "childList",
    target,
    addedNodes,
    removedNodes
  } as unknown as MutationRecord;
}

describe("site adapters", () => {
  it("finds GitHub README and comment containers", () => {
    window.history.replaceState({}, "", "/nodejs/node/blob/main/README.md");
    document.body.innerHTML = `
      <div id="readme">
        <article class="markdown-body">
          <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
          <p>Hello</p>
        </article>
      </div>
      <div id="issuecomment-1">
        <div class="comment-body markdown-body js-comment-body">
          <div class="markdown-heading"><h3 class="heading-element">Comment title</h3><a class="anchor" href="#comment-title"></a></div>
          <p>World</p>
        </div>
      </div>
    `;

    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(2);
    expect(containers.map((container) => container.label)).toEqual(["README", "Comment 1"]);
    expect(containers.map((container) => container.key)).toEqual(["github:readme", "github:comment:1"]);
  });

  it("finds a GitHub pull request body container with a stable key", () => {
    window.history.replaceState({}, "", "/owner/repo/pull/42");
    document.body.innerHTML = `
      <div id="pullrequest-42">
        <article class="markdown-body">
          <div class="markdown-heading"><h2 class="heading-element">Summary</h2><a class="anchor" href="#summary"></a></div>
        </article>
      </div>
    `;

    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Issue / PR Body");
    expect(containers[0].key).toBe("github:pull-request-body");
  });

  it("prefers comment classification over pull request body classification when both ancestors exist", () => {
    window.history.replaceState({}, "", "/owner/repo/pull/42");
    document.body.innerHTML = `
      <div id="pullrequest-42">
        <div id="issuecomment-9">
          <article class="comment-body markdown-body">
            <div class="markdown-heading"><h2 class="heading-element">Reply</h2><a class="anchor" href="#reply"></a></div>
          </article>
        </div>
      </div>
    `;

    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Comment 1");
    expect(containers[0].kind).toBe("comment");
    expect(containers[0].key).toBe("github:comment:9");
  });

  it("finds a GitHub wiki container without falling back to generic document numbering", () => {
    window.history.replaceState({}, "", "/owner/repo/wiki/Home");
    document.body.innerHTML = `
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
      </article>
    `;

    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Wiki");
    expect(containers[0].key).toBe("github:wiki");
  });

  it("does not match the GitHub root home page", () => {
    document.body.innerHTML = `
      <div id="readme">
        <article class="markdown-body">
          <div class="markdown-heading"><h2 class="heading-element">Intro</h2><a class="anchor" href="#intro"></a></div>
        </article>
      </div>
    `;
    expect(githubAdapter.matches(createLocation("https://github.com/"))).toBe(false);
  });

  it("finds the docs article container", () => {
    document.body.innerHTML = `
      <div data-container="article">
        <div class="markdown-body">
          <h2 id="headings"><a class="heading-link" href="#headings">Headings<span class="heading-link-symbol"></span></a></h2>
          <p>Hello</p>
        </div>
      </div>
    `;

    const containers = docsAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Docs Article");
    expect(containers[0].key).toBe("docs:article");
  });

  it("numbers multiple gist markdown containers consistently", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">One</h2><a class="anchor" href="#one"></a></div>
      </article>
      <article class="markdown-body">
        <div class="markdown-heading"><h2 class="heading-element">Two</h2><a class="anchor" href="#two"></a></div>
      </article>
    `;

    const containers = gistAdapter.findContainers(document);
    expect(containers).toHaveLength(2);
    expect(containers.map((container) => container.label)).toEqual(["Gist", "Gist Section 2"]);
    expect(containers.map((container) => container.key)).toEqual(["gist:gist", "gist:gist:2"]);
  });

  it("matches current and legacy GitHub docs hosts", () => {
    expect(docsAdapter.matches(createLocation("https://docs.github.com/en"))).toBe(true);
    expect(docsAdapter.matches(createLocation("https://help.github.com/en"))).toBe(true);
    expect(docsAdapter.matches(createLocation("https://support.github.com/request/landing"))).toBe(true);
  });

  it("refreshes when unmanaged content changes inside a GitHub markdown container", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <p id="content">Hello</p>
      </article>
    `;

    const target = document.querySelector(".markdown-body") as HTMLElement;
    const addedParagraph = document.createElement("p");
    addedParagraph.textContent = "World";

    expect(
      githubAdapter.shouldRefreshForMutation(
        createMutation({
          target,
          addedNodes: [addedParagraph]
        })
      )
    ).toBe(true);
  });

  it("ignores ghcm-managed mutations inside a GitHub markdown container", () => {
    document.body.innerHTML = `
      <article class="markdown-body">
        <p id="content">Hello</p>
      </article>
    `;

    const target = document.querySelector(".markdown-body") as HTMLElement;
    const managedButton = document.createElement("button");
    managedButton.className = "ghcm-heading-toggle";

    expect(
      githubAdapter.shouldRefreshForMutation(
        createMutation({
          target,
          addedNodes: [managedButton]
        })
      )
    ).toBe(false);
  });

  it("refreshes when a docs article container is inserted later", () => {
    const wrapper = document.createElement("div");
    const article = document.createElement("div");
    article.innerHTML = `
      <div data-container="article">
        <div class="markdown-body">
          <h2 id="intro"><a class="heading-link" href="#intro">Intro<span class="heading-link-symbol"></span></a></h2>
        </div>
      </div>
    `;

    const articleRoot = article.firstElementChild as HTMLElement;
    expect(
      docsAdapter.shouldRefreshForMutation(
        createMutation({
          target: wrapper,
          addedNodes: [articleRoot]
        })
      )
    ).toBe(true);
  });
});

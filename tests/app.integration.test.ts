import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubCollapseMarkdownApp } from "../src/app/app";
import { PageSession } from "../src/app/page-session";
import {
  githubIssueBodyNestedMarkdownFixture,
  githubReadmeMarkdownFixture,
  githubReadmePageFixture
} from "./fixtures";

type GMStore = Map<string, unknown>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function installGMStubs(): GMStore {
  const store: GMStore = new Map();

  vi.stubGlobal("GM_addStyle", vi.fn());
  vi.stubGlobal("GM_registerMenuCommand", vi.fn());
  vi.stubGlobal("GM_getValue", vi.fn((key: string, fallback: unknown) => {
    return store.has(key) ? clone(store.get(key)) : fallback;
  }));
  vi.stubGlobal("GM_setValue", vi.fn((key: string, value: unknown) => {
    store.set(key, clone(value));
  }));

  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: vi.fn()
  });

  return store;
}

function dispatchClick(target: Element): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function dispatchShiftClick(target: Element): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
}

function setViewportHeight(height: number): void {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height
  });
}

function sleep(ms = 120): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

describe("GitHubCollapseMarkdownApp integration", () => {
  let app: GitHubCollapseMarkdownApp | null = null;

  beforeEach(() => {
    installGMStubs();
    localStorage.clear();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    setViewportWidth(1400);
    setViewportHeight(900);
    window.history.replaceState({}, "", "/nodejs/node/blob/main/README.md");
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("mounts controls and panel on a realistic GitHub markdown page", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.querySelector(".ghcm-trigger")).toBeTruthy();
    expect(document.querySelector(".ghcm-panel")).toBeTruthy();
    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(true);
    expect(document.querySelector(".ghcm-trigger")?.classList.contains("is-hidden")).toBe(true);
    expect(document.querySelectorAll(".ghcm-heading-toggle").length).toBe(6);
    expect(document.querySelector(".ghcm-dock-row")?.parentElement?.classList.contains("BorderGrid")).toBe(true);
    expect(document.querySelector(".ghcm-root")?.classList.contains("is-docked")).toBe(true);
    expect(document.querySelector(".ghcm-dock-row")?.classList.contains("BorderGrid-row")).toBe(true);
    expect(document.querySelector(".ghcm-dock-cell")?.classList.contains("BorderGrid-cell")).toBe(true);
    expect(document.querySelector(".BorderGrid > .BorderGrid-row")?.classList.contains("ghcm-preceding-dock-row")).toBe(true);
    const firstWrappedHeading = document.querySelector(".markdown-heading") as HTMLElement;
    const firstHeadingElement = firstWrappedHeading.querySelector(".heading-element") as HTMLElement;
    expect(firstHeadingElement.firstElementChild?.classList.contains("ghcm-heading-toggle")).toBe(true);
    expect(document.querySelector(".ghcm-search")).toBeFalsy();
    expect(document.querySelector("[data-setting='memory']")).toBeFalsy();
    expect(document.querySelector("[data-action='reset-page']")).toBeFalsy();
  });

  it("falls back to an inline contents block when no desktop sidebar host exists", () => {
    document.body.innerHTML = githubIssueBodyNestedMarkdownFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const root = document.querySelector(".ghcm-root") as HTMLElement;
    const inlineHost = document.querySelector(".NewMarkdownViewer-module__safe-html-box__ZT1eD") as HTMLElement;

    expect(root.classList.contains("is-inline")).toBe(true);
    expect(root.parentElement).toBe(inlineHost);
    expect(inlineHost.firstElementChild).toBe(root);
    expect(document.querySelector(".ghcm-sidebar-kicker")?.tagName).toBe("DIV");
    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(true);
    expect(document.querySelector(".ghcm-dock-row")).toBeFalsy();
  });

  it("prefers the pane wrapper bottom over the min-content pane when clamping the docked panel", () => {
    document.body.innerHTML = githubReadmePageFixture;
    Object.defineProperty(document.querySelector("header[role='banner']"), "offsetHeight", {
      configurable: true,
      value: 64
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-panel")) {
        return 630;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.matches("header[role='banner']")) {
        return 64;
      }
      if (this.classList.contains("ghcm-panel")) {
        return 630;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-dock-row")) {
        return DOMRect.fromRect({ x: 0, y: 40, width: 320, height: 0 });
      }
      if (this.classList.contains("ghcm-dock-cell")) {
        return DOMRect.fromRect({ x: 1080, y: 40, width: 320, height: 0 });
      }
      if (this.classList.contains("prc-PageLayout-PaneWrapper-pHPop")) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 700 });
      }
      if (this.classList.contains("prc-PageLayout-Pane-AyzHK")) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 180 });
      }

      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    });

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const root = document.querySelector(".ghcm-root") as HTMLElement;
    expect(root.classList.contains("is-floating")).toBe(true);
    expect(root.style.getPropertyValue("--ghcm-panel-top")).toBe("40px");
    expect(root.style.getPropertyValue("--ghcm-panel-height")).toBe("630px");
    expect(root.style.getPropertyValue("--ghcm-panel-max-height")).toBe("630px");
  });

  it("shifts the docked panel upward near the page end instead of only shrinking it", () => {
    document.body.innerHTML = githubReadmePageFixture;
    Object.defineProperty(document.querySelector("header[role='banner']"), "offsetHeight", {
      configurable: true,
      value: 64
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-panel")) {
        return 420;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.matches("header[role='banner']")) {
        return 64;
      }
      if (this.classList.contains("ghcm-panel")) {
        return 420;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-dock-row")) {
        return DOMRect.fromRect({ x: 0, y: -600, width: 320, height: 0 });
      }
      if (this.classList.contains("ghcm-dock-cell")) {
        return DOMRect.fromRect({ x: 1080, y: -600, width: 320, height: 0 });
      }
      if (this.classList.contains("prc-PageLayout-PaneWrapper-pHPop")) {
        return DOMRect.fromRect({ x: 1080, y: -700, width: 320, height: 1140 });
      }
      if (this.classList.contains("prc-PageLayout-Pane-AyzHK")) {
        return DOMRect.fromRect({ x: 1080, y: -700, width: 320, height: 180 });
      }

      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    });

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const root = document.querySelector(".ghcm-root") as HTMLElement;
    expect(root.classList.contains("is-floating")).toBe(true);
    expect(root.style.getPropertyValue("--ghcm-panel-top")).toBe("-10px");
    expect(root.style.getPropertyValue("--ghcm-panel-max-height")).toBe("420px");
  });

  it("recomputes the docked position when the GitHub sidebar reflows after mount", () => {
    document.body.innerHTML = githubReadmePageFixture;
    Object.defineProperty(document.querySelector("header[role='banner']"), "offsetHeight", {
      configurable: true,
      value: 64
    });

    let rowTop = 120;
    const sidebarHost = document.querySelector(
      "rails-partial[data-partial-name='codeViewRepoRoute.Sidebar'] .BorderGrid"
    ) as HTMLElement;
    const paneWrapper = document.querySelector(".prc-PageLayout-PaneWrapper-pHPop") as HTMLElement;

    class ResizeObserverMock {
      private static callback: ResizeObserverCallback | null = null;

      constructor(callback: ResizeObserverCallback) {
        ResizeObserverMock.callback = callback;
      }

      static emit(target: HTMLElement): void {
        if (!ResizeObserverMock.callback) {
          throw new Error("Resize observer callback was not registered");
        }

        ResizeObserverMock.callback(
          [
            {
              target,
              borderBoxSize: [],
              contentBoxSize: [],
              contentRect: DOMRect.fromRect(),
              devicePixelContentBoxSize: []
            } as unknown as ResizeObserverEntry
          ],
          {} as ResizeObserver
        );
      }

      observe(): void {}

      unobserve(): void {}

      disconnect(): void {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock as unknown as typeof ResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-panel")) {
        return 360;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.matches("header[role='banner']")) {
        return 64;
      }
      if (this.classList.contains("ghcm-panel")) {
        return 360;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-dock-row")) {
        return DOMRect.fromRect({ x: 0, y: rowTop, width: 320, height: 0 });
      }
      if (this.classList.contains("ghcm-dock-cell")) {
        return DOMRect.fromRect({ x: 1080, y: rowTop, width: 320, height: 0 });
      }
      if (this === paneWrapper) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 900 });
      }
      if (this.classList.contains("prc-PageLayout-Pane-AyzHK")) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 180 });
      }

      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    });

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const root = document.querySelector(".ghcm-root") as HTMLElement;
    expect(root.classList.contains("is-floating")).toBe(false);
    expect(root.style.getPropertyValue("--ghcm-panel-top")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-height")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-max-height")).toBe("");

    rowTop = 260;
    ResizeObserverMock.emit(sidebarHost);

    expect(root.classList.contains("is-floating")).toBe(false);
    expect(root.style.getPropertyValue("--ghcm-panel-top")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-height")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-max-height")).toBe("");
  });

  it("recomputes the docked position when scrolling changes the sidebar row geometry", () => {
    document.body.innerHTML = githubReadmePageFixture;
    Object.defineProperty(document.querySelector("header[role='banner']"), "offsetHeight", {
      configurable: true,
      value: 64
    });

    let rowTop = 280;
    const paneWrapper = document.querySelector(".prc-PageLayout-PaneWrapper-pHPop") as HTMLElement;

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-panel")) {
        return 360;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.matches("header[role='banner']")) {
        return 64;
      }
      if (this.classList.contains("ghcm-panel")) {
        return 360;
      }

      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ghcm-dock-row")) {
        return DOMRect.fromRect({ x: 0, y: rowTop, width: 320, height: 0 });
      }
      if (this.classList.contains("ghcm-dock-cell")) {
        return DOMRect.fromRect({ x: 1080, y: rowTop, width: 320, height: 0 });
      }
      if (this === paneWrapper) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 900 });
      }
      if (this.classList.contains("prc-PageLayout-Pane-AyzHK")) {
        return DOMRect.fromRect({ x: 1080, y: 0, width: 320, height: 180 });
      }

      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    });

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const root = document.querySelector(".ghcm-root") as HTMLElement;
    expect(root.classList.contains("is-floating")).toBe(false);
    expect(root.style.getPropertyValue("--ghcm-panel-top")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-height")).toBe("");
    expect(root.style.getPropertyValue("--ghcm-panel-max-height")).toBe("");

    rowTop = 5;
    document.dispatchEvent(new Event("scroll"));

    expect(root.classList.contains("is-floating")).toBe(true);
    expect(root.style.getPropertyValue("--ghcm-panel-height")).toBe("360px");
    expect(parseFloat(root.style.getPropertyValue("--ghcm-panel-max-height"))).toBeCloseTo(823, 5);
    expect(parseFloat(root.style.getPropertyValue("--ghcm-panel-top"))).toBeCloseTo(47, 5);
  });

  it("collapses the target section when a heading is clicked", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const releaseHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.includes("Release types")) as HTMLElement;
    const downloadHeading = Array.from(document.querySelectorAll("h3"))
      .find((heading) => heading.textContent?.includes("Download")) as HTMLElement;

    dispatchClick(releaseHeading);

    expect(releaseHeading.closest(".markdown-heading")?.classList.contains("ghcm-collapsed")).toBe(true);
    expect(document.getElementById("release-types-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(downloadHeading.closest(".markdown-heading")?.classList.contains("ghcm-hidden-by-parent")).toBe(true);
  });

  it("collapses the target section when the wrapped GitHub heading row is clicked", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const wrappedHeading = Array.from(document.querySelectorAll(".markdown-heading"))
      .find((heading) => heading.textContent?.includes("Release types")) as HTMLElement;

    dispatchClick(wrappedHeading);

    expect(wrappedHeading.classList.contains("ghcm-collapsed")).toBe(true);
    expect(document.getElementById("release-types-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
  });

  it("keeps the section expanded when the native anchor icon is clicked", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const supportAnchor = document.querySelector("a[href='#support']") as HTMLAnchorElement;
    dispatchClick(supportAnchor);

    expect(document.querySelector("#user-content-support")?.closest(".markdown-heading")?.classList.contains("ghcm-collapsed")).toBe(false);
    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(false);
  });

  it("supports core panel actions and renders a minimal outline", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const outlineText = document.querySelector(".ghcm-outline")?.textContent ?? "";
    expect(outlineText).toContain("Support");
    expect(outlineText).toContain("Nightly releases");

    const collapseAll = document.querySelector("[data-action='collapse-all']") as HTMLButtonElement;
    dispatchClick(collapseAll);
    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(document.getElementById("nightly-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);

    const expandAll = document.querySelector("[data-action='expand-all']") as HTMLButtonElement;
    dispatchClick(expandAll);
    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(false);
  });

  it("supports shift-click sibling collapse on same level headings", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const releaseHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.includes("Release types")) as HTMLElement;

    dispatchShiftClick(releaseHeading);

    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(document.getElementById("release-types-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
  });

  it("supports only the reduced core shortcuts", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    app.handleKeydown(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, shiftKey: true }));
    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);

    app.handleKeydown(new KeyboardEvent("keydown", { key: "e", ctrlKey: true, shiftKey: true }));
    expect(document.getElementById("support-copy")?.classList.contains("ghcm-section-hidden")).toBe(false);

    app.handleKeydown(new KeyboardEvent("keydown", { key: "m", ctrlKey: true, shiftKey: true }));
    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(false);
    expect(document.querySelector(".ghcm-trigger")?.classList.contains("is-hidden")).toBe(false);

    app.handleKeydown(new KeyboardEvent("keydown", { key: "m", ctrlKey: true, shiftKey: true }));
    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(true);
  });

  it("restores collapsed state from storage on remount", () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const releaseHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.includes("Release types")) as HTMLElement;
    const findDownloadHeading = () =>
      Array.from(document.querySelectorAll("h3"))
        .find((heading) => heading.textContent?.includes("Download")) as HTMLElement;

    dispatchClick(releaseHeading);
    app.destroy();

    document.body.innerHTML = githubReadmePageFixture;
    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.getElementById("release-types-copy")?.classList.contains("ghcm-section-hidden")).toBe(true);
    expect(findDownloadHeading().closest(".markdown-heading")?.classList.contains("ghcm-hidden-by-parent")).toBe(true);
  });

  it("mounts itself after markdown content is injected later", async () => {
    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.querySelector(".ghcm-trigger")).toBeFalsy();

    document.body.innerHTML = githubReadmePageFixture;
    await sleep(180);

    expect(document.querySelector(".ghcm-trigger")).toBeTruthy();
    expect(document.querySelectorAll(".ghcm-heading-toggle")).toHaveLength(6);
  });

  it("re-mounts controls after GitHub re-renders content inside an existing markdown container", async () => {
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.querySelectorAll(".ghcm-heading-toggle")).toHaveLength(6);

    const replacement = document.createElement("div");
    replacement.innerHTML = githubReadmeMarkdownFixture;
    const nextArticle = replacement.querySelector("article") as HTMLElement;
    const liveArticle = document.querySelector(".markdown-body") as HTMLElement;

    liveArticle.innerHTML = nextArticle.innerHTML;
    await sleep(180);

    expect(document.querySelectorAll(".ghcm-heading-toggle")).toHaveLength(6);
    expect(document.querySelector(".ghcm-trigger")).toBeTruthy();
  });

  it("updates outline text without remounting when only heading display text changes", async () => {
    document.body.innerHTML = githubReadmePageFixture;

    const mountSpy = vi.spyOn(PageSession.prototype, "mount");
    const destroySpy = vi.spyOn(PageSession.prototype, "destroy");

    app = new GitHubCollapseMarkdownApp();
    app.start();

    const supportHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.includes("Support")) as HTMLElement;
    const headingTextNode = Array.from(supportHeading.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    supportHeading.replaceChild(document.createTextNode("Community Support"), headingTextNode as ChildNode);
    await sleep(180);

    expect(document.querySelector(".ghcm-outline")?.textContent).toContain("Community Support");
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it("injects a single toggle per heading when GitHub issue bodies nest markdown-body containers", () => {
    document.body.innerHTML = githubIssueBodyNestedMarkdownFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.querySelectorAll("h2")).toHaveLength(2);
    expect(document.querySelectorAll(".ghcm-heading-toggle")).toHaveLength(2);
  });

  it("uses a drawer trigger on mobile screens", () => {
    setViewportWidth(390);
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(false);
    expect(document.querySelector(".ghcm-trigger")?.classList.contains("is-hidden")).toBe(false);
    expect(document.querySelector(".ghcm-root")?.parentElement).toBe(document.body);

    dispatchClick(document.querySelector(".ghcm-trigger") as HTMLElement);
    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(true);
  });

  it("closes the mobile drawer after jumping from the outline", () => {
    setViewportWidth(390);
    document.body.innerHTML = githubReadmePageFixture;

    app = new GitHubCollapseMarkdownApp();
    app.start();

    dispatchClick(document.querySelector(".ghcm-trigger") as HTMLElement);
    dispatchClick(document.querySelector(".ghcm-outline-link") as HTMLElement);

    expect(document.querySelector(".ghcm-panel")?.classList.contains("is-open")).toBe(false);
    expect(window.scrollTo).toHaveBeenCalled();
  });
});

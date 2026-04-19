// ==UserScript==
// @name        GitHub Collapse Markdown
// @version     5.1.0
// @description GitHub Markdown 标题折叠脚本，支持大纲、状态记忆与现代 GitHub 页面
// @license     MIT
// @author      Xyea
// @namespace   https://github.com/Xyea/GitHub-Collapse-Markdown
// @homepageURL https://github.com/Xyea/GitHub-Collapse-Markdown
// @supportURL  https://github.com/Xyea/GitHub-Collapse-Markdown/issues
// @match       https://github.com/*
// @match       https://gist.github.com/*
// @match       https://help.github.com/*
// @match       https://docs.github.com/*
// @match       https://support.github.com/*
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @noframes
// @icon        https://github.githubassets.com/pinned-octocat.svg
// ==/UserScript==

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/utils/strings.ts
  function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
  }
  function slugify(text) {
    return normalizeWhitespace(text).toLowerCase().replace(/[`'"!?.,()[\]{}:;<>/@#$%^&*+=~|\\]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  // src/parsing/heading-dom.ts
  var HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";
  function getHeadingLevel(element) {
    return Number(element.tagName.slice(1));
  }
  function getHeadingBlock(element) {
    return element.closest(".markdown-heading") ?? element;
  }
  function getHeadingText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("a.anchor, .heading-link-symbol, svg, .octicon-link, .ghcm-heading-toggle").forEach((node) => node.remove());
    return normalizeWhitespace(clone.textContent ?? "");
  }
  function getHeadingAnchor(element, fallbackIndex) {
    const wrapperAnchor = element.closest(".markdown-heading")?.querySelector("a.anchor");
    if (wrapperAnchor?.hash) {
      return wrapperAnchor.hash.replace(/^#/, "");
    }
    const inlineAnchor = element.querySelector("a.anchor, a.heading-link") ?? element.closest("h1,h2,h3,h4,h5,h6")?.querySelector("a.anchor, a.heading-link");
    if (inlineAnchor?.hash) {
      return inlineAnchor.hash.replace(/^#/, "");
    }
    if (element.id) {
      return element.id;
    }
    return slugify(getHeadingText(element)) || `heading-${fallbackIndex + 1}`;
  }
  function queryHeadings(container) {
    return Array.from(container.querySelectorAll(HEADING_SELECTOR)).filter((heading) => {
      if (!getHeadingText(heading)) {
        return false;
      }
      if (heading.closest(".ghcm-root")) {
        return false;
      }
      if (heading.closest("nav, aside, header, footer, [data-container='toc']")) {
        return false;
      }
      return true;
    });
  }
  function hasHeadings(container) {
    return queryHeadings(container).length > 0;
  }

  // src/utils/dom.ts
  function scrollToElementWithOffset(element, offset) {
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth"
    });
  }
  function isInteractiveTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return Boolean(target.closest("a, button, input, textarea, select, summary, details, [role='button']"));
  }
  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return Boolean(target.closest("input, textarea, [contenteditable=''], [contenteditable='true'], [role='textbox']"));
  }
  function isManagedNode(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }
    if (node.classList.contains("ghcm-root") || node.classList.contains("ghcm-heading-toggle")) {
      return true;
    }
    return Array.from(node.classList).some((className) => className.startsWith("ghcm-"));
  }
  function getSelectionText() {
    return normalizeWhitespace(window.getSelection?.()?.toString() ?? "");
  }

  // src/adapters/shared.ts
  function getLocationPageKey(location) {
    return `${location.hostname}${location.pathname}${location.search}`;
  }
  function queryContentCandidates(document2, selector, excludeSelector = ".ghcm-root, nav, aside, header, footer") {
    const candidates = Array.from(document2.querySelectorAll(selector)).filter((element) => !element.closest(excludeSelector)).filter((element) => hasHeadings(element));
    return candidates.filter((element) => !candidates.some((other) => other !== element && element.contains(other)));
  }
  function buildContentContainers(siteId, candidates, describe) {
    const uniqueCandidates = uniqueCandidateElements(candidates);
    return uniqueCandidates.map((element, index) => {
      const descriptor = describe(element, index);
      return {
        key: `${siteId}:${descriptor.id}`,
        label: descriptor.label,
        kind: descriptor.kind,
        element
      };
    });
  }
  function findFirstContentCandidate(document2, selector, excludeSelector = ".ghcm-root, nav, aside, header, footer") {
    return queryContentCandidates(document2, selector, excludeSelector)[0] ?? null;
  }
  function describeStaticContainer(id, label, kind) {
    return () => ({
      id,
      label,
      kind
    });
  }
  function shouldRefreshForContentMutation(mutation, contentRootSelector) {
    if (mutation.type !== "childList") {
      return false;
    }
    const target = mutation.target instanceof HTMLElement ? mutation.target : null;
    if (target?.closest(".ghcm-root")) {
      return false;
    }
    const changedNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
    if (changedNodes.some((node) => isContentMutationNode(node, contentRootSelector))) {
      return true;
    }
    if (!target?.closest(contentRootSelector)) {
      return false;
    }
    return changedNodes.some((node) => !isManagedNode(node));
  }
  function isContentMutationNode(node, contentRootSelector) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }
    if (isManagedNode(node)) {
      return false;
    }
    return Boolean(node.matches?.(contentRootSelector) || node.querySelector?.(contentRootSelector));
  }
  function uniqueCandidateElements(candidates) {
    const seen = /* @__PURE__ */ new Set();
    return candidates.filter((element) => {
      if (seen.has(element)) {
        return false;
      }
      seen.add(element);
      return true;
    });
  }

  // src/adapters/docs.ts
  var DOCS_HOSTS = /* @__PURE__ */ new Set(["docs.github.com", "help.github.com", "support.github.com"]);
  var DOCS_ARTICLE_SELECTOR = [
    "[data-container='article'] .markdown-body",
    "#article-contents .markdown-body",
    "main article .markdown-body",
    "main .markdown-body"
  ].join(", ");
  var docsAdapter = {
    id: "docs",
    matches(location) {
      return DOCS_HOSTS.has(location.hostname);
    },
    getPageKey(location) {
      return getLocationPageKey(location);
    },
    findContainers(document2) {
      const article = findFirstContentCandidate(document2, DOCS_ARTICLE_SELECTOR);
      if (!article) {
        return [];
      }
      return buildContentContainers("docs", [article], describeStaticContainer("article", "Docs Article", "article"));
    },
    shouldRefreshForMutation(mutation) {
      return shouldRefreshForContentMutation(mutation, DOCS_ARTICLE_SELECTOR);
    },
    getStickyHeaderOffset(document2) {
      const sticky = document2.querySelector("header[role='banner']");
      return (sticky?.offsetHeight ?? 80) + 24;
    }
  };

  // src/adapters/gist.ts
  var GIST_CONTENT_ROOT_SELECTOR = ".markdown-body";
  var gistAdapter = {
    id: "gist",
    matches(location) {
      return location.hostname === "gist.github.com";
    },
    getPageKey(location) {
      return getLocationPageKey(location);
    },
    findContainers(document2) {
      return buildContentContainers(
        "gist",
        queryContentCandidates(document2, GIST_CONTENT_ROOT_SELECTOR, ".ghcm-root"),
        (_element, index) => ({
          id: index === 0 ? "gist" : `gist:${index + 1}`,
          label: index === 0 ? "Gist" : `Gist Section ${index + 1}`,
          kind: "markdown"
        })
      );
    },
    shouldRefreshForMutation(mutation) {
      return shouldRefreshForContentMutation(mutation, GIST_CONTENT_ROOT_SELECTOR);
    },
    getStickyHeaderOffset(document2) {
      const sticky = document2.querySelector("header[role='banner'], .Header");
      return (sticky?.offsetHeight ?? 64) + 18;
    }
  };

  // src/adapters/github.ts
  var README_SELECTOR = "#readme";
  var ISSUE_BODY_SELECTOR = "[data-testid='issue-body']";
  var PR_BODY_SELECTOR = "[id^='pullrequest-']";
  var COMMENT_SELECTOR = "[id^='issuecomment-']";
  var WIKI_PATH_SEGMENT = "/wiki/";
  var STICKY_HEADER_SELECTOR = [
    "header[role='banner']",
    ".AppHeader",
    ".Header",
    ".prc-PageLayout-Header-0of-R"
  ].join(", ");
  var GITHUB_CONTENT_ROOT_SELECTOR = [
    "#readme .markdown-body",
    ".comment-body.markdown-body",
    ".js-comment-body.comment-body.markdown-body",
    ".markdown-body"
  ].join(", ");
  var GITHUB_DOCK_HOST_SELECTORS = [
    "rails-partial[data-partial-name='codeViewRepoRoute.Sidebar'] .BorderGrid",
    "rails-partial[data-partial-name='codeViewRepoRoute.Sidebar']",
    "[class*='PageLayout-Pane'] [data-partial-name='codeViewRepoRoute.Sidebar'] .BorderGrid",
    ".Layout-sidebar .BorderGrid",
    ".Layout-sidebar"
  ];
  var GITHUB_DOCK_BOUNDARY_SELECTORS = [
    "[class*='PageLayout-PaneWrapper']",
    "[class*='PageLayout-Pane-']",
    ".Layout-sidebar"
  ];
  function isGitHubRootHomePath(location) {
    return location.pathname === "/";
  }
  function isGitHubWikiPath(location) {
    return location.pathname.includes(WIKI_PATH_SEGMENT);
  }
  function describeGitHubContainer(element, location) {
    if (element.closest(README_SELECTOR)) {
      return {
        id: "readme",
        kind: "markdown",
        label: "README",
        variant: null
      };
    }
    const comment = element.closest(COMMENT_SELECTOR);
    if (comment?.id) {
      return {
        id: `comment:${comment.id.replace(/^issuecomment-/, "")}`,
        kind: "comment",
        label: "Comment",
        variant: "comment"
      };
    }
    if (element.closest(ISSUE_BODY_SELECTOR)) {
      return {
        id: "issue-body",
        kind: "markdown",
        label: "Issue / PR Body",
        variant: null
      };
    }
    if (element.closest(PR_BODY_SELECTOR)) {
      return {
        id: "pull-request-body",
        kind: "markdown",
        label: "Issue / PR Body",
        variant: null
      };
    }
    if (isGitHubWikiPath(location)) {
      return {
        id: "wiki",
        kind: "markdown",
        label: "Wiki",
        variant: null
      };
    }
    return {
      id: "document",
      kind: "markdown",
      label: "Document",
      variant: "document"
    };
  }
  var githubAdapter = {
    id: "github",
    matches(location) {
      return location.hostname === "github.com" && !isGitHubRootHomePath(location);
    },
    getPageKey(location) {
      return getLocationPageKey(location);
    },
    findContainers(document2) {
      const candidates = queryContentCandidates(document2, GITHUB_CONTENT_ROOT_SELECTOR);
      const counts = {
        comment: 0,
        document: 0
      };
      return buildContentContainers("github", candidates, (element) => {
        const descriptor = describeGitHubContainer(element, document2.location);
        const sequence = descriptor.variant ? ++counts[descriptor.variant] : 0;
        return {
          id: descriptor.variant === "document" ? `${descriptor.id}:${sequence}` : descriptor.id,
          label: descriptor.variant ? `${descriptor.label} ${sequence}` : descriptor.label,
          kind: descriptor.kind
        };
      });
    },
    shouldRefreshForMutation(mutation) {
      return shouldRefreshForContentMutation(mutation, GITHUB_CONTENT_ROOT_SELECTOR);
    },
    getStickyHeaderOffset(document2) {
      const sticky = document2.querySelector(STICKY_HEADER_SELECTOR);
      return (sticky?.offsetHeight ?? 72) + 18;
    },
    getDockedPanelLayout(document2) {
      const host = resolveGitHubDockHost(document2);
      if (!host) {
        return null;
      }
      return {
        host,
        boundary: resolveGitHubDockBoundary(host),
        topOffset: 47
      };
    }
  };
  function resolveGitHubDockHost(document2) {
    return queryFirst(document2, GITHUB_DOCK_HOST_SELECTORS);
  }
  function resolveGitHubDockBoundary(host) {
    return closestFirst(host, GITHUB_DOCK_BOUNDARY_SELECTORS);
  }
  function queryFirst(document2, selectors) {
    for (const selector of selectors) {
      const match = document2.querySelector(selector);
      if (match) {
        return match;
      }
    }
    return null;
  }
  function closestFirst(element, selectors) {
    for (const selector of selectors) {
      const match = element.closest(selector);
      if (match) {
        return match;
      }
    }
    return null;
  }

  // src/adapters/index.ts
  var adapters = [githubAdapter, gistAdapter, docsAdapter];

  // src/core/revisions.ts
  function serializeContainerIdentity(container) {
    return `${container.key}:${container.kind}`;
  }
  function serializeContainerDisplay(container) {
    return `${serializeContainerIdentity(container)}:${container.label}`;
  }
  function serializeHeadingIdentity(heading) {
    return [
      heading.key,
      serializeContainerIdentity(heading.container),
      heading.anchor,
      heading.level,
      heading.parentKey ?? "root"
    ].join(":");
  }
  function buildHeadingIdentityRevision(headings) {
    return headings.map((heading) => serializeHeadingIdentity(heading)).join("|");
  }
  function buildHeadingDisplayRevision(headings) {
    return headings.map((heading) => `${serializeHeadingIdentity(heading)}:${serializeContainerDisplay(heading.container)}:${heading.text}`).join("|");
  }
  function buildPageIdentityRevision(siteId, pageKey, headings) {
    const headingRevision = buildHeadingIdentityRevision(headings);
    return `${siteId}:${pageKey}:${headingRevision || "empty"}`;
  }
  function buildPageDisplayRevision(siteId, pageKey, headings) {
    const headingRevision = buildHeadingDisplayRevision(headings);
    return `${siteId}:${pageKey}:${headingRevision || "empty"}`;
  }
  function buildPageVersion(siteId, pageKey, headings) {
    return {
      structure: buildPageIdentityRevision(siteId, pageKey, headings),
      display: buildPageDisplayRevision(siteId, pageKey, headings)
    };
  }
  function hasSamePageStructure(left, right) {
    return left?.structure === right.structure;
  }
  function hasSamePageDisplay(left, right) {
    return left?.display === right.display;
  }

  // src/platform/userscript.ts
  function createUserscriptValueStore(storage = window.localStorage) {
    if (canUseGMValueStore()) {
      return {
        read(key, fallback) {
          return GM_getValue(key, fallback);
        },
        write(key, value) {
          GM_setValue(key, value);
        }
      };
    }
    return {
      read(key, fallback) {
        const raw = storage.getItem(key);
        if (!raw) {
          return fallback;
        }
        try {
          return JSON.parse(raw);
        } catch {
          return fallback;
        }
      },
      write(key, value) {
        storage.setItem(key, JSON.stringify(value));
      }
    };
  }
  function injectUserscriptStyle(css) {
    if (typeof GM_addStyle !== "function") {
      return false;
    }
    GM_addStyle(css);
    return true;
  }
  function registerUserscriptMenuCommand(name, listener) {
    if (typeof GM_registerMenuCommand !== "function") {
      return false;
    }
    GM_registerMenuCommand(name, listener);
    return true;
  }
  function canUseGMValueStore() {
    return typeof GM_getValue === "function" && typeof GM_setValue === "function";
  }

  // src/core/page-state.ts
  function createEmptyPageState() {
    return {
      collapsedByContainer: {}
    };
  }
  function normalizePageState(pageState) {
    const collapsedByContainer = {};
    for (const [containerKey, collapsedKeys] of Object.entries(pageState?.collapsedByContainer ?? {})) {
      collapsedByContainer[containerKey] = [...collapsedKeys];
    }
    return {
      collapsedByContainer
    };
  }
  function isEmptyPageState(pageState) {
    return Object.values(pageState.collapsedByContainer).every((collapsedKeys) => collapsedKeys.length === 0);
  }
  function serializePageState(pageState) {
    return Object.entries(pageState.collapsedByContainer).filter(([, collapsedKeys]) => collapsedKeys.length > 0).sort(([left], [right]) => left.localeCompare(right)).map(([containerKey, collapsedKeys]) => `${containerKey}:${collapsedKeys.join(",")}`).join("|");
  }
  function arePageStatesEqual(left, right) {
    return serializePageState(normalizePageState(left)) === serializePageState(normalizePageState(right));
  }

  // src/core/storage.ts
  var STORAGE_KEY = "ghcm-v5-state";
  var defaultState = {
    version: 2,
    pages: {}
  };
  function cloneState(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }
  var StorageService = class {
    constructor(store = createUserscriptValueStore()) {
      __publicField(this, "state");
      __publicField(this, "store");
      this.store = store;
      this.state = this.read();
    }
    getPageState(pageKey) {
      return cloneState(this.state.pages[pageKey] ?? createEmptyPageState());
    }
    setPageState(pageKey, pageState) {
      const normalized = normalizePageState(pageState);
      if (isEmptyPageState(normalized)) {
        if (!(pageKey in this.state.pages)) {
          return;
        }
        delete this.state.pages[pageKey];
        this.write();
        return;
      }
      if (arePageStatesEqual(this.state.pages[pageKey], normalized)) {
        return;
      }
      this.state.pages[pageKey] = normalized;
      this.write();
    }
    clearPage(pageKey) {
      if (!(pageKey in this.state.pages)) {
        return;
      }
      delete this.state.pages[pageKey];
      this.write();
    }
    read() {
      const stored = this.store.read(STORAGE_KEY, null);
      if (!stored) {
        return cloneState(defaultState);
      }
      if (stored.version === 2) {
        const current = stored;
        return {
          ...cloneState(defaultState),
          ...current,
          pages: normalizePages(current.pages)
        };
      }
      if (stored.version === 1) {
        const legacy = stored;
        return {
          ...cloneState(defaultState),
          pages: normalizePages(legacy.pages)
        };
      }
      return cloneState(defaultState);
    }
    write() {
      this.store.write(STORAGE_KEY, cloneState(this.state));
    }
  };
  function normalizePages(pages) {
    const normalized = {};
    for (const [key, value] of Object.entries(pages ?? {})) {
      normalized[key] = normalizePageState(value);
    }
    return normalized;
  }

  // src/ui/styles/base.ts
  var baseStyles = `
  .ghcm-root {
    all: initial;
    display: block;
    width: 100%;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      "Noto Sans",
      "Helvetica Neue",
      Arial,
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji";
    color: var(--fgColor-default, #1f2328);
    --ghcm-ink: var(--fgColor-default, #1f2328);
    --ghcm-ink-soft: var(--fgColor-muted, #59636e);
    --ghcm-ink-muted: var(--fgColor-muted, #656d76);
    --ghcm-line: var(--borderColor-default, #d0d7de);
    --ghcm-line-muted: var(--borderColor-muted, #d8dee4);
    --ghcm-surface: var(--bgColor-default, #ffffff);
    --ghcm-surface-subtle: var(--bgColor-muted, #f6f8fa);
    --ghcm-surface-accent: var(--bgColor-accent-muted, rgba(9, 105, 218, 0.08));
    --ghcm-shadow: rgba(31, 35, 40, 0.08);
    --ghcm-shadow-strong: rgba(31, 35, 40, 0.12);
    --ghcm-accent: var(--fgColor-accent, #0969da);
    --ghcm-h1: var(--fgColor-default, #24292f);
    --ghcm-h2: var(--fgColor-default, #24292f);
    --ghcm-h3: var(--fgColor-default, #24292f);
    --ghcm-h4: var(--fgColor-muted, #57606a);
    --ghcm-h5: var(--fgColor-muted, #57606a);
    --ghcm-h6: var(--fgColor-muted, #57606a);
  }

  .ghcm-root,
  .ghcm-root *,
  .ghcm-root *::before,
  .ghcm-root *::after {
    box-sizing: border-box;
  }

  .ghcm-cell {
    display: block;
    width: 100%;
  }

  .ghcm-dock-row,
  .ghcm-dock-cell {
    overflow: visible;
  }

  .ghcm-dock-row {
    border-top: 0 !important;
  }

  .ghcm-preceding-dock-row,
  .ghcm-preceding-dock-row > .BorderGrid-cell,
  .ghcm-preceding-dock-row > [class*="BorderGrid-cell"] {
    border-bottom: 0 !important;
  }

  .ghcm-dock-cell {
    border: 0 !important;
    padding: 0 !important;
  }

  .ghcm-root.is-docked {
    position: relative;
    top: auto;
    z-index: 2;
  }

  .ghcm-root.is-inline {
    margin: 0 0 24px;
  }

  .ghcm-section-hidden,
  .ghcm-hidden-by-parent {
    display: none !important;
  }
`;

  // src/ui/styles/headings.ts
  var headingStyles = `
  .ghcm-heading-block {
    position: relative;
    cursor: pointer;
  }

  .ghcm-heading-block--wrapped {
    display: block !important;
  }

  .ghcm-heading-inline {
    display: flex;
    align-items: center;
    gap: 0.42em;
  }

  .ghcm-visible-heading {
    scroll-margin-top: 120px;
  }

  .ghcm-collapsed > h1,
  .ghcm-collapsed > h2,
  .ghcm-collapsed > h3,
  .ghcm-collapsed > h4,
  .ghcm-collapsed > h5,
  .ghcm-collapsed > h6,
  .ghcm-collapsed .heading-element,
  .ghcm-collapsed.ghcm-heading-inline {
    opacity: 0.84;
  }

  .ghcm-heading-block--wrapped .heading-element {
    display: flex;
    align-items: center;
    gap: 0.32em;
    min-width: 0;
  }

  .ghcm-heading-toggle {
    appearance: none;
    box-sizing: border-box;
    flex: 0 0 auto;
    width: 1.18em;
    height: 1.18em;
    border: none;
    background: transparent;
    color: var(--ghcm-toggle-color, var(--ghcm-h4));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-size: 1em;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    cursor: pointer;
    transition: transform 140ms ease, color 140ms ease, opacity 140ms ease;
    opacity: 0.96;
    margin-right: 0.18em;
    padding: 0;
    vertical-align: middle;
  }

  .ghcm-heading-block--wrapped > h1,
  h1.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h1);
  }

  .ghcm-heading-block--wrapped > h2,
  h2.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h2);
  }

  .ghcm-heading-block--wrapped > h3,
  h3.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h3);
  }

  .ghcm-heading-block--wrapped > h4,
  h4.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h4);
  }

  .ghcm-heading-block--wrapped > h5,
  h5.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h5);
  }

  .ghcm-heading-block--wrapped > h6,
  h6.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h6);
  }

  .ghcm-heading-block:hover > .ghcm-heading-toggle,
  .ghcm-heading-block:hover .heading-element > .ghcm-heading-toggle,
  .ghcm-heading-toggle:hover {
    color: var(--ghcm-ink);
    opacity: 1;
  }

  .ghcm-heading-inline > .ghcm-heading-toggle:hover,
  .ghcm-heading-block--wrapped .heading-element > .ghcm-heading-toggle:hover {
    transform: translateY(-1px);
  }
`;

  // src/ui/styles/outline.ts
  var outlineStyles = `
  .ghcm-outline {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(101, 109, 118, 0.36) transparent;
  }

  .ghcm-outline::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .ghcm-outline::-webkit-scrollbar-track {
    background: transparent;
  }

  .ghcm-outline::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(101, 109, 118, 0.36);
  }

  .ghcm-outline::-webkit-scrollbar-thumb:hover {
    background: rgba(101, 109, 118, 0.5);
  }

  .ghcm-outline-group + .ghcm-outline-group {
    margin-top: 12px;
  }

  .ghcm-outline-group-title {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    line-height: 16px;
    color: var(--ghcm-ink-muted);
  }

  .ghcm-outline-link {
    --ghcm-level-accent: var(--ghcm-h4);
    appearance: none;
    display: grid;
    grid-template-columns: 2px minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    width: 100%;
    border: none;
    background: transparent;
    border-radius: 6px;
    padding: 5px 8px 5px calc(8px + (var(--ghcm-depth, 0) * 12px));
    cursor: pointer;
    text-align: left;
    transition: background-color 120ms ease, opacity 120ms ease;
  }

  .ghcm-outline-link[data-level="1"] {
    --ghcm-level-accent: var(--ghcm-h1);
  }

  .ghcm-outline-link[data-level="2"] {
    --ghcm-level-accent: var(--ghcm-h2);
  }

  .ghcm-outline-link[data-level="3"] {
    --ghcm-level-accent: var(--ghcm-h3);
  }

  .ghcm-outline-link[data-level="4"] {
    --ghcm-level-accent: var(--ghcm-h4);
  }

  .ghcm-outline-link[data-level="5"] {
    --ghcm-level-accent: var(--ghcm-h5);
  }

  .ghcm-outline-link[data-level="6"] {
    --ghcm-level-accent: var(--ghcm-h6);
  }

  .ghcm-outline-link:hover {
    background: var(--ghcm-surface-subtle);
  }

  .ghcm-outline-link.is-active {
    background: var(--ghcm-surface-accent);
  }

  .ghcm-outline-link.is-muted {
    opacity: 0.62;
  }

  .ghcm-outline-rail {
    display: block;
    min-height: 1.3em;
    border-radius: 999px;
    background: var(--ghcm-line);
    transition: background-color 120ms ease, opacity 120ms ease;
  }

  .ghcm-outline-link.is-collapsed .ghcm-outline-rail {
    background: var(--ghcm-line-muted);
  }

  .ghcm-outline-link.is-active .ghcm-outline-rail {
    background: var(--ghcm-level-accent);
  }

  .ghcm-outline-label {
    display: block;
    min-width: 0;
    color: var(--ghcm-ink-soft);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ghcm-outline-link.is-active .ghcm-outline-label {
    color: var(--ghcm-ink);
    font-weight: 600;
  }

  .ghcm-outline-empty {
    margin: 0;
    padding: 8px 0;
    color: var(--ghcm-ink-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .ghcm-root.is-overlay .ghcm-outline-link {
    border-radius: 8px;
    padding: 7px 10px 7px calc(10px + (var(--ghcm-depth, 0) * 14px));
  }

  .ghcm-root.is-overlay .ghcm-outline-label {
    font-size: 13px;
  }

  .ghcm-root.is-docked .ghcm-outline {
    gap: 1px;
  }

  .ghcm-root.is-docked .ghcm-outline-link {
    border-radius: 0;
    padding: 4px 0 4px calc(var(--ghcm-depth, 0) * 12px);
  }

  .ghcm-root.is-docked .ghcm-outline-group-title {
    margin-bottom: 4px;
  }
`;

  // src/ui/styles/panel.ts
  var panelStyles = `
  .ghcm-trigger,
  .ghcm-panel,
  .ghcm-backdrop {
    font-family: inherit;
  }

  .ghcm-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--ghcm-line);
    background: var(--ghcm-surface);
    color: var(--ghcm-ink-soft);
    border-radius: 6px;
    box-shadow: 0 1px 0 rgba(31, 35, 40, 0.04);
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  }

  .ghcm-trigger:hover {
    background: var(--ghcm-surface-subtle);
    color: var(--ghcm-ink);
  }

  .ghcm-trigger.is-hidden {
    display: none;
  }

  .ghcm-backdrop {
    appearance: none;
    border: 0;
    padding: 0;
    display: none;
  }

  .ghcm-panel {
    display: none;
    flex-direction: column;
    min-height: 0;
  }

  .ghcm-panel.is-open {
    display: flex;
  }

  .ghcm-root.is-overlay .ghcm-trigger {
    position: fixed;
    top: calc(80px + env(safe-area-inset-top, 0px));
    right: 16px;
    z-index: 2147483644;
  }

  .ghcm-root.is-overlay .ghcm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483643;
    display: block;
    background: rgba(27, 31, 36, 0.38);
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease;
  }

  .ghcm-root.is-overlay .ghcm-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .ghcm-root.is-overlay .ghcm-panel {
    position: fixed;
    top: calc(72px + env(safe-area-inset-top, 0px));
    right: 16px;
    bottom: 16px;
    width: min(320px, calc(100vw - 32px));
    z-index: 2147483644;
    background: var(--ghcm-surface);
    border: 1px solid var(--ghcm-line);
    border-radius: 12px;
    box-shadow:
      0 8px 24px var(--ghcm-shadow-strong),
      0 1px 0 rgba(31, 35, 40, 0.04);
    overflow: hidden;
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .ghcm-root.is-overlay .ghcm-panel.is-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .ghcm-root.is-docked .ghcm-panel {
    position: static;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    z-index: 2;
    border: none;
    background: var(--ghcm-surface);
    box-shadow: none;
    overflow: hidden;
    height: var(--ghcm-panel-height, auto);
    max-height: var(--ghcm-panel-max-height, none);
    will-change: auto;
  }

  .ghcm-root.is-docked.is-floating .ghcm-panel {
    position: fixed;
    top: var(--ghcm-panel-top, 0px);
    left: var(--ghcm-panel-left, 0px);
    width: var(--ghcm-panel-width, 100%);
  }

  .ghcm-root.is-inline .ghcm-panel {
    position: static;
    width: 100%;
    max-width: 100%;
    border: 1px solid var(--ghcm-line);
    border-radius: 6px;
    background: var(--ghcm-surface);
    box-shadow: 0 1px 0 rgba(31, 35, 40, 0.04);
    overflow: hidden;
  }

  .ghcm-sidebar-shell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--ghcm-surface);
  }

  .ghcm-root.is-docked .ghcm-sidebar-shell {
    height: 100%;
    max-height: inherit;
    background: var(--ghcm-surface);
    border-top: 1px solid var(--ghcm-line);
  }

  .ghcm-sidebar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--ghcm-line);
  }

  .ghcm-root.is-docked .ghcm-sidebar-header {
    display: block;
    padding: 16px 0;
  }

  .ghcm-sidebar-kicker {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    color: var(--ghcm-ink);
  }

  .ghcm-sidebar-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ghcm-root.is-docked .ghcm-sidebar-tools {
    margin-top: 4px;
    gap: 10px;
    justify-content: flex-start;
  }

  .ghcm-inline-action {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--ghcm-accent);
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    transition: color 120ms ease;
  }

  .ghcm-inline-action:hover {
    color: var(--ghcm-ink);
    text-decoration: underline;
  }

  .ghcm-inline-action.is-hidden {
    display: none;
  }

  .ghcm-sidebar-outline {
    flex: 1 1 auto;
    min-height: 0;
    padding: 12px;
  }

  .ghcm-root.is-docked .ghcm-sidebar-outline {
    overflow: hidden;
    padding: 16px 0 0;
  }

  .ghcm-root.is-inline .ghcm-sidebar-outline {
    max-height: min(45vh, 420px);
  }
`;

  // src/ui/styles/responsive.ts
  var responsiveStyles = `
  @media (max-width: 1179px) {
    .ghcm-root.is-overlay .ghcm-trigger {
      top: calc(76px + env(safe-area-inset-top, 0px));
      right: 14px;
    }

    .ghcm-root.is-overlay .ghcm-panel {
      right: 14px;
      top: calc(70px + env(safe-area-inset-top, 0px));
      bottom: 14px;
      width: min(320px, calc(100vw - 28px));
    }
  }

  @media (max-width: 599px) {
    .ghcm-root.is-overlay .ghcm-panel {
      width: calc(100vw - 20px);
      right: 10px;
      top: calc(66px + env(safe-area-inset-top, 0px));
      bottom: 10px;
    }

    .ghcm-sidebar-header {
      padding: 16px 16px 12px;
    }

    .ghcm-sidebar-outline {
      padding: 8px 12px 12px;
    }
  }
`;

  // src/ui/styles.ts
  var styles = [baseStyles, headingStyles, panelStyles, outlineStyles, responsiveStyles].join("\n");

  // src/app/app-lifecycle.ts
  var RERENDER_EVENTS = ["turbo:load", "turbo:render", "pjax:end", "pageshow", "load"];
  var AppLifecycle = class {
    constructor(options) {
      this.options = options;
      __publicField(this, "observer", null);
    }
    bind(signal) {
      RERENDER_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, () => this.options.onRefreshRequested(), {
          passive: true,
          signal
        });
      });
      document.addEventListener("keydown", (event) => this.options.onKeydown(event), {
        passive: false,
        signal
      });
      this.observer = new MutationObserver((mutations) => {
        const adapter = this.options.resolveMutationAdapter();
        if (!adapter) {
          return;
        }
        for (const mutation of mutations) {
          if (adapter.shouldRefreshForMutation(mutation)) {
            this.options.onRefreshRequested();
            return;
          }
        }
      });
      this.observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    destroy() {
      this.observer?.disconnect();
      this.observer = null;
    }
  };

  // src/app/active-heading-tracker.ts
  var ActiveHeadingTracker = class {
    constructor(options) {
      this.options = options;
      __publicField(this, "activeHeadingKey", null);
      __publicField(this, "rafHandle", 0);
      __publicField(this, "positionsDirty", true);
      __publicField(this, "positionsSignature", "");
      __publicField(this, "headingPositions", []);
    }
    bind(signal, getSnapshots, onChange) {
      const scheduleSync = () => {
        window.cancelAnimationFrame(this.rafHandle);
        this.rafHandle = window.requestAnimationFrame(() => {
          if (!this.sync(getSnapshots())) {
            return;
          }
          onChange(this.activeHeadingKey);
        });
      };
      window.addEventListener(
        "scroll",
        () => scheduleSync(),
        { signal, passive: true }
      );
      window.addEventListener(
        "resize",
        () => {
          this.positionsDirty = true;
          scheduleSync();
        },
        { signal, passive: true }
      );
    }
    destroy() {
      window.cancelAnimationFrame(this.rafHandle);
    }
    getActiveHeadingKey() {
      return this.activeHeadingKey;
    }
    setActiveHeadingKey(activeHeadingKey, force = false) {
      if (!force && activeHeadingKey === this.activeHeadingKey) {
        return false;
      }
      this.activeHeadingKey = activeHeadingKey;
      return true;
    }
    sync(snapshots, force = false) {
      this.refreshHeadingPositions(snapshots);
      return this.setActiveHeadingKey(this.computeActiveHeadingKey(), force);
    }
    refreshHeadingPositions(snapshots) {
      const nextSignature = snapshots.map((heading) => `${heading.key}:${heading.hiddenByAncestor ? "hidden" : "visible"}`).join("|");
      if (!this.positionsDirty && nextSignature === this.positionsSignature) {
        return;
      }
      this.positionsSignature = nextSignature;
      this.positionsDirty = false;
      this.headingPositions = snapshots.flatMap((heading) => {
        if (heading.hiddenByAncestor) {
          return [];
        }
        const binding = this.options.resolveBinding(heading.key);
        if (!binding) {
          return [];
        }
        return [
          {
            key: heading.key,
            top: window.scrollY + binding.blockEl.getBoundingClientRect().top
          }
        ];
      });
    }
    computeActiveHeadingKey() {
      if (this.headingPositions.length === 0) {
        return null;
      }
      const threshold = window.scrollY + this.options.getStickyTop() + 8;
      let low = 0;
      let high = this.headingPositions.length - 1;
      let match = -1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (this.headingPositions[mid].top <= threshold) {
          match = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return match >= 0 ? this.headingPositions[match].key : null;
    }
  };

  // src/ui/heading-controls.ts
  function createToggleButton(heading, collapsed) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghcm-heading-toggle";
    button.textContent = collapsed ? "▸" : "▾";
    button.setAttribute("aria-label", `Toggle section: ${heading.text}`);
    button.setAttribute("title", heading.text);
    return button;
  }
  var HeadingControls = class {
    constructor(document2, engine) {
      this.document = document2;
      this.engine = engine;
      __publicField(this, "toggleElements", /* @__PURE__ */ new Map());
    }
    mount(signal) {
      this.document.headings.forEach((heading) => {
        const binding = this.document.getBinding(heading.key);
        if (!binding) {
          return;
        }
        const wrapped = binding.blockEl !== binding.headingEl;
        const toggleHeading = (useSiblings) => {
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
    sync(snapshots) {
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
    isConnected() {
      return this.document.headings.every((heading) => {
        const binding = this.document.getBinding(heading.key);
        const toggle = this.toggleElements.get(heading.key);
        return Boolean(
          binding && binding.headingEl.isConnected && binding.blockEl.isConnected && toggle?.isConnected
        );
      });
    }
    destroy() {
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
  };
  function isNativePermalinkTarget(binding, target) {
    if (!(target instanceof Element)) {
      return false;
    }
    const permalink = target.closest("a.anchor, a.heading-link");
    return Boolean(permalink && binding.blockEl.contains(permalink));
  }

  // src/ui/panel-frame.ts
  var DOCKED_PANEL_BOUNDARY_BOTTOM_GAP = 30;
  var DOCKED_PANEL_VIEWPORT_BOTTOM_GAP = 16;
  function measureDockedPanel(elements, context) {
    const rowRect = elements.dockRow.getBoundingClientRect();
    const cellRect = elements.dockCell.getBoundingClientRect();
    const dockedBoundaryRect = context.boundary?.getBoundingClientRect();
    return {
      boundaryViewportBottom: dockedBoundaryRect ? dockedBoundaryRect.bottom - DOCKED_PANEL_BOUNDARY_BOTTOM_GAP : Number.POSITIVE_INFINITY,
      cellLeft: Math.max(cellRect.left, 0),
      cellWidth: Math.max(cellRect.width, 0),
      naturalPanelHeight: Math.max(elements.panel.scrollHeight, elements.panel.offsetHeight, 0),
      rowViewportTop: rowRect.top
    };
  }
  function computeDockedPanelFrame(measurement, topOffset, viewportHeight) {
    const viewportBottom = viewportHeight - DOCKED_PANEL_VIEWPORT_BOTTOM_GAP;
    const rowBoundedMaxHeight = Math.max(
      Math.min(viewportBottom - measurement.rowViewportTop, measurement.boundaryViewportBottom - measurement.rowViewportTop),
      0
    );
    const rowHeight = Math.max(Math.min(Math.ceil(measurement.naturalPanelHeight), Math.ceil(rowBoundedMaxHeight)), 0);
    if (measurement.rowViewportTop > topOffset) {
      return {
        mode: "flow",
        panelLeft: measurement.cellLeft,
        panelHeight: rowHeight,
        panelMaxHeight: rowBoundedMaxHeight,
        panelTop: measurement.rowViewportTop,
        panelWidth: measurement.cellWidth,
        rowHeight: 0
      };
    }
    const preferredHeight = Math.min(measurement.naturalPanelHeight, Math.max(viewportBottom - topOffset, 0));
    let panelTop = topOffset;
    if (measurement.boundaryViewportBottom < panelTop + preferredHeight) {
      panelTop = Math.max(measurement.rowViewportTop, measurement.boundaryViewportBottom - preferredHeight);
    }
    const panelMaxHeight = Math.max(Math.min(viewportBottom - panelTop, measurement.boundaryViewportBottom - panelTop), 0);
    const panelHeight = Math.max(Math.min(Math.ceil(measurement.naturalPanelHeight), Math.ceil(panelMaxHeight)), 0);
    return {
      mode: "fixed",
      panelLeft: measurement.cellLeft,
      panelHeight,
      panelMaxHeight,
      panelTop,
      panelWidth: measurement.cellWidth,
      rowHeight: panelHeight
    };
  }
  function applyDockedPanelFrame(elements, frame) {
    elements.root.classList.toggle("is-floating", frame.mode === "fixed");
    if (frame.mode === "fixed") {
      elements.root.style.setProperty("--ghcm-panel-height", `${frame.panelHeight}px`);
      elements.root.style.setProperty("--ghcm-panel-max-height", `${frame.panelMaxHeight}px`);
      elements.root.style.setProperty("--ghcm-panel-left", `${frame.panelLeft}px`);
      elements.root.style.setProperty("--ghcm-panel-top", `${frame.panelTop}px`);
      elements.root.style.setProperty("--ghcm-panel-width", `${frame.panelWidth}px`);
      elements.root.style.minHeight = frame.rowHeight > 0 ? `${frame.rowHeight}px` : "";
      elements.dockRow.style.minHeight = frame.rowHeight > 0 ? `${frame.rowHeight}px` : "";
      return;
    }
    elements.root.style.removeProperty("--ghcm-panel-height");
    elements.root.style.removeProperty("--ghcm-panel-max-height");
    elements.root.style.removeProperty("--ghcm-panel-left");
    elements.root.style.removeProperty("--ghcm-panel-top");
    elements.root.style.removeProperty("--ghcm-panel-width");
    elements.root.style.removeProperty("min-height");
    elements.dockRow.style.removeProperty("min-height");
  }
  function clearDockedPanelFrame(elements) {
    elements.root.classList.remove("is-floating");
    elements.root.style.removeProperty("--ghcm-panel-height");
    elements.root.style.removeProperty("--ghcm-panel-left");
    elements.root.style.removeProperty("--ghcm-panel-top");
    elements.root.style.removeProperty("--ghcm-panel-width");
    elements.root.style.removeProperty("--ghcm-panel-max-height");
    elements.root.style.removeProperty("min-height");
    elements.dockRow.style.removeProperty("min-height");
  }

  // src/ui/panel-placement.ts
  function resolvePanelPlacement(desktop, resolvers) {
    if (!desktop) {
      return { kind: "overlay" };
    }
    const dockedLayout = resolvers.resolveDockedLayout?.() ?? null;
    if (dockedLayout) {
      return {
        kind: "docked",
        context: dockedLayout
      };
    }
    const inlineHost = resolvers.resolveInlineHost?.() ?? null;
    if (inlineHost) {
      return {
        kind: "inline",
        host: inlineHost
      };
    }
    return { kind: "overlay" };
  }
  function collectPlacementTargets(placement) {
    if (placement.kind !== "docked") {
      return [];
    }
    const targets = [placement.context.host, placement.context.boundary].filter(
      (element) => Boolean(element)
    );
    return Array.from(new Set(targets));
  }

  // src/ui/panel-layout.ts
  var DockedPanelLayout = class {
    constructor(elements, resolvers) {
      this.elements = elements;
      this.resolvers = resolvers;
      __publicField(this, "desktop", false);
      __publicField(this, "open", false);
      __publicField(this, "placement", { kind: "overlay" });
      __publicField(this, "positionRaf", 0);
      __publicField(this, "resizeObserver", null);
      __publicField(this, "layoutMutationObserver", null);
      __publicField(this, "observedDockElements", []);
      __publicField(this, "styledPrecedingDockRow", null);
      __publicField(this, "measurementDirty", true);
    }
    bind(signal) {
      window.addEventListener("scroll", (event) => this.handleScroll(event), {
        signal,
        passive: true
      });
      document.addEventListener("scroll", (event) => this.handleScroll(event), {
        signal,
        passive: true,
        capture: true
      });
      signal.addEventListener("abort", () => this.disconnectLayoutObservers(), { once: true });
    }
    destroy() {
      window.cancelAnimationFrame(this.positionRaf);
      this.disconnectLayoutObservers();
      this.elements.dockRow.remove();
    }
    getPlacement() {
      return this.placement.kind;
    }
    refreshGeometry() {
      this.invalidateGeometry();
    }
    sync(desktop, open) {
      this.desktop = desktop;
      this.open = open;
      this.placement = resolvePanelPlacement(this.desktop, this.resolvers);
      this.mountPlacement(this.placement);
      this.syncLayoutObservers(this.placement);
      this.syncPrecedingDockRow(this.placement);
      this.elements.root.style.setProperty(
        "--ghcm-sticky-top",
        `${this.placement.kind === "docked" ? this.placement.context.topOffset : 0}px`
      );
      this.invalidateGeometry();
    }
    mountPlacement(placement) {
      if (placement.kind === "overlay") {
        this.mountOverlay();
        return;
      }
      if (placement.kind === "docked") {
        if (this.elements.root.parentElement !== this.elements.dockCell) {
          this.elements.dockCell.append(this.elements.root);
        }
        if (this.elements.dockRow.parentElement !== placement.context.host) {
          placement.context.host.append(this.elements.dockRow);
        }
        return;
      }
      this.elements.dockRow.remove();
      if (this.elements.root.parentElement !== placement.host || placement.host.firstElementChild !== this.elements.root) {
        placement.host.prepend(this.elements.root);
      }
    }
    mountOverlay() {
      this.elements.dockRow.remove();
      if (this.elements.root.parentElement !== document.body) {
        document.body.append(this.elements.root);
      }
    }
    handleScroll(event) {
      if (!this.shouldPositionDockedPanel()) {
        return;
      }
      if (event.target instanceof Node && this.elements.root.contains(event.target)) {
        return;
      }
      this.invalidateGeometry();
    }
    syncLayoutObservers(placement) {
      const nextTargets = collectPlacementTargets(placement);
      const targetsUnchanged = nextTargets.length === this.observedDockElements.length && nextTargets.every((element, index) => element === this.observedDockElements[index]);
      if (targetsUnchanged) {
        return;
      }
      this.disconnectLayoutObservers();
      this.observedDockElements = nextTargets;
      if (!nextTargets.length) {
        return;
      }
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.invalidateGeometry());
        nextTargets.forEach((element) => this.resizeObserver?.observe(element));
      }
      if (placement.kind === "docked") {
        this.layoutMutationObserver = new MutationObserver(() => {
          this.syncPrecedingDockRow(this.placement);
          this.invalidateGeometry();
        });
        this.layoutMutationObserver.observe(placement.context.host, {
          childList: true
        });
      }
    }
    disconnectLayoutObservers() {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.layoutMutationObserver?.disconnect();
      this.layoutMutationObserver = null;
      this.clearPrecedingDockRow();
      this.observedDockElements = [];
    }
    invalidateGeometry() {
      this.measurementDirty = true;
      this.schedulePositionUpdate();
    }
    schedulePositionUpdate() {
      window.cancelAnimationFrame(this.positionRaf);
      this.positionRaf = window.requestAnimationFrame(() => this.updateDockedPosition());
    }
    shouldPositionDockedPanel() {
      return this.desktop && this.placement.kind === "docked" && this.open;
    }
    syncPrecedingDockRow(placement) {
      this.clearPrecedingDockRow();
      if (placement.kind !== "docked") {
        return;
      }
      const previousRow = this.elements.dockRow.previousElementSibling;
      if (!(previousRow instanceof HTMLElement)) {
        return;
      }
      previousRow.classList.add("ghcm-preceding-dock-row");
      this.styledPrecedingDockRow = previousRow;
    }
    clearPrecedingDockRow() {
      this.styledPrecedingDockRow?.classList.remove("ghcm-preceding-dock-row");
      this.styledPrecedingDockRow = null;
    }
    updateDockedPosition() {
      if (!this.shouldPositionDockedPanel()) {
        clearDockedPanelFrame(this.elements);
        this.measurementDirty = false;
        return;
      }
      if (this.placement.kind !== "docked") {
        return;
      }
      if (!this.measurementDirty) {
        return;
      }
      this.measurementDirty = false;
      const measurement = measureDockedPanel(this.elements, this.placement.context);
      const frame = computeDockedPanelFrame(measurement, this.placement.context.topOffset, window.innerHeight);
      applyDockedPanelFrame(this.elements, frame);
    }
  };

  // src/ui/panel-outline.ts
  var PanelOutlineView = class {
    constructor(outline) {
      this.outline = outline;
      __publicField(this, "visibilityRaf", 0);
      __publicField(this, "displayRevision", "");
      __publicField(this, "activeHeadingKey", null);
      __publicField(this, "itemElements", /* @__PURE__ */ new Map());
    }
    destroy() {
      window.cancelAnimationFrame(this.visibilityRaf);
    }
    render(state) {
      const structureChanged = state.displayRevision !== this.displayRevision;
      if (structureChanged) {
        this.displayRevision = state.displayRevision;
        this.renderStructure(state.headings);
      }
      this.syncItemStates(state.headings);
      this.syncActiveHeading(state.activeHeadingKey);
      return structureChanged;
    }
    scheduleActiveItemVisibility(open) {
      window.cancelAnimationFrame(this.visibilityRaf);
      if (!open) {
        return;
      }
      this.visibilityRaf = window.requestAnimationFrame(() => this.ensureActiveItemVisible());
    }
    ensureActiveItemVisible() {
      const activeItem = this.outline.querySelector(".ghcm-outline-link.is-active");
      if (!activeItem) {
        return;
      }
      const outlineHeight = this.outline.clientHeight;
      const maxScrollTop = Math.max(this.outline.scrollHeight - outlineHeight, 0);
      if (outlineHeight <= 0 || maxScrollTop <= 0) {
        return;
      }
      const outlineRect = this.outline.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();
      const itemCenter = activeRect.top - outlineRect.top + this.outline.scrollTop + activeRect.height / 2;
      const currentCenter = this.outline.scrollTop + outlineHeight / 2;
      const comfortBand = Math.max(outlineHeight * 0.14, 24);
      const delta = itemCenter - currentCenter;
      if (Math.abs(delta) <= comfortBand) {
        return;
      }
      const targetTop = clamp(itemCenter - outlineHeight / 2, 0, maxScrollTop);
      if (typeof this.outline.scrollTo === "function") {
        this.outline.scrollTo({
          top: targetTop,
          behavior: "smooth"
        });
        return;
      }
      this.outline.scrollTop = targetTop;
    }
    renderStructure(headings) {
      this.itemElements.clear();
      this.outline.replaceChildren();
      this.activeHeadingKey = null;
      if (headings.length === 0) {
        const empty = document.createElement("p");
        empty.className = "ghcm-outline-empty";
        empty.textContent = "No headings found.";
        this.outline.append(empty);
        return;
      }
      const minLevel = headings.reduce((lowest, heading) => Math.min(lowest, heading.level), headings[0]?.level ?? 1);
      const showGroups = new Set(headings.map((heading) => heading.container.key)).size > 1;
      const fragment = document.createDocumentFragment();
      let currentGroupKey = "";
      let currentGroup = null;
      headings.forEach((heading) => {
        if (showGroups && heading.container.key !== currentGroupKey) {
          currentGroupKey = heading.container.key;
          currentGroup = document.createElement("section");
          currentGroup.className = "ghcm-outline-group";
          const groupTitle = document.createElement("p");
          groupTitle.className = "ghcm-outline-group-title";
          groupTitle.textContent = heading.container.label;
          currentGroup.append(groupTitle);
          fragment.append(currentGroup);
        }
        const item = createOutlineItem(heading, Math.max(0, heading.level - minLevel));
        this.itemElements.set(heading.key, item);
        if (currentGroup) {
          currentGroup.append(item);
        } else {
          fragment.append(item);
        }
      });
      this.outline.append(fragment);
    }
    syncItemStates(headings) {
      headings.forEach((heading) => {
        const item = this.itemElements.get(heading.key);
        if (!item) {
          return;
        }
        item.title = heading.text;
        item.classList.toggle("is-muted", heading.hiddenByAncestor);
        item.classList.toggle("is-collapsed", heading.collapsed);
      });
    }
    syncActiveHeading(activeHeadingKey) {
      if (activeHeadingKey === this.activeHeadingKey) {
        return;
      }
      const previous = this.activeHeadingKey ? this.itemElements.get(this.activeHeadingKey) : null;
      previous?.classList.remove("is-active");
      previous?.removeAttribute("aria-current");
      this.activeHeadingKey = activeHeadingKey;
      const current = activeHeadingKey ? this.itemElements.get(activeHeadingKey) : null;
      current?.classList.add("is-active");
      current?.setAttribute("aria-current", "location");
    }
  };
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function createOutlineItem(heading, depth) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ghcm-outline-link";
    item.dataset.key = heading.key;
    item.dataset.level = String(heading.level);
    item.style.setProperty("--ghcm-depth", String(depth));
    const rail = document.createElement("span");
    rail.className = "ghcm-outline-rail";
    rail.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "ghcm-outline-label";
    label.textContent = heading.text;
    item.append(rail, label);
    return item;
  }

  // src/ui/panel.ts
  var DESKTOP_BREAKPOINT = 1180;
  var PanelUI = class {
    constructor(options) {
      this.options = options;
      __publicField(this, "abortController", new AbortController());
      __publicField(this, "dom", createPanelDom());
      __publicField(this, "layout");
      __publicField(this, "outlineView");
      __publicField(this, "mounted", false);
      __publicField(this, "desktop", false);
      __publicField(this, "open", false);
      this.layout = new DockedPanelLayout(
        {
          dockRow: this.dom.dockRow,
          dockCell: this.dom.dockCell,
          root: this.dom.root,
          panel: this.dom.panel
        },
        {
          resolveDockedLayout: this.options.resolveDockedLayout,
          resolveInlineHost: this.options.resolveInlineHost
        }
      );
      this.outlineView = new PanelOutlineView(this.dom.outline);
    }
    mount() {
      if (this.mounted) {
        return;
      }
      this.mounted = true;
      document.body.append(this.dom.root);
      this.layout.bind(this.abortController.signal);
      this.bindEvents();
      this.handleViewportChange(true);
    }
    destroy() {
      this.abortController.abort();
      this.layout.destroy();
      this.outlineView.destroy();
      this.dom.root.remove();
      this.mounted = false;
    }
    isOpen() {
      return this.open;
    }
    isConnected() {
      return this.dom.root.isConnected;
    }
    setOpen(open) {
      this.applyOpenState(open);
    }
    render(state) {
      const structureChanged = this.outlineView.render(state);
      if (this.open) {
        this.outlineView.scheduleActiveItemVisibility(true);
      }
      if (structureChanged) {
        this.layout.refreshGeometry();
      }
    }
    bindEvents() {
      this.dom.trigger.addEventListener("click", () => this.setOpen(!this.open), {
        signal: this.abortController.signal
      });
      this.dom.backdrop.addEventListener("click", () => this.setOpen(false), {
        signal: this.abortController.signal
      });
      this.dom.collapseAllButton.addEventListener("click", () => this.options.onCollapseAll(), {
        signal: this.abortController.signal
      });
      this.dom.expandAllButton.addEventListener("click", () => this.options.onExpandAll(), {
        signal: this.abortController.signal
      });
      this.dom.closeButton.addEventListener("click", () => this.setOpen(false), {
        signal: this.abortController.signal
      });
      this.dom.outline.addEventListener("click", (event) => this.handleOutlineClick(event), {
        signal: this.abortController.signal
      });
      window.addEventListener("resize", () => this.handleViewportChange(), {
        signal: this.abortController.signal,
        passive: true
      });
      window.addEventListener("keydown", (event) => this.handleKeydown(event), {
        signal: this.abortController.signal
      });
    }
    handleOutlineClick(event) {
      const button = event.target?.closest(".ghcm-outline-link");
      const key = button?.dataset.key;
      if (!key) {
        return;
      }
      this.options.onJump(key);
      if (!this.desktop) {
        this.setOpen(false);
      }
    }
    handleKeydown(event) {
      if (event.key === "Escape" && !this.desktop && this.open) {
        this.setOpen(false);
      }
    }
    handleViewportChange(force = false) {
      const nextDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      const nextOpen = force || nextDesktop !== this.desktop ? nextDesktop : this.open;
      if (force || nextDesktop !== this.desktop) {
        this.desktop = nextDesktop;
      }
      this.applyOpenState(nextOpen);
    }
    applyOpenState(open) {
      const becameOpen = open && !this.open;
      this.open = open;
      this.sync();
      if (becameOpen) {
        this.outlineView.scheduleActiveItemVisibility(true);
      }
    }
    sync() {
      this.layout.sync(this.desktop, this.open);
      const placement = this.layout.getPlacement();
      const docked = placement === "docked";
      const inline = placement === "inline";
      const overlay = placement === "overlay";
      this.dom.root.classList.toggle("is-desktop", this.desktop);
      this.dom.root.classList.toggle("is-docked", docked);
      this.dom.root.classList.toggle("is-inline", inline);
      this.dom.root.classList.toggle("is-overlay", overlay);
      this.dom.trigger.classList.toggle("is-hidden", this.open);
      this.dom.panel.classList.toggle("is-open", this.open);
      this.dom.backdrop.classList.toggle("is-open", this.open && overlay);
      this.dom.closeButton.textContent = this.desktop ? "Hide" : "Close";
      this.dom.closeButton.classList.toggle("is-hidden", !this.open);
      this.dom.trigger.setAttribute("aria-expanded", String(this.open));
    }
  };
  function createPanelDom() {
    const dockRow = document.createElement("div");
    dockRow.className = "ghcm-dock-row BorderGrid-row";
    const dockCell = document.createElement("div");
    dockCell.className = "ghcm-dock-cell BorderGrid-cell";
    const root = document.createElement("div");
    root.className = "ghcm-root";
    const cell = document.createElement("div");
    cell.className = "ghcm-cell";
    const trigger = createButton("ghcm-trigger", "Contents", "Toggle contents");
    const backdrop = createButton("ghcm-backdrop", "", "Close contents");
    const panel = document.createElement("aside");
    panel.className = "ghcm-panel";
    panel.setAttribute("aria-label", "Page contents");
    const collapseAllButton = createButton("ghcm-inline-action", "Collapse all");
    collapseAllButton.dataset.action = "collapse-all";
    const expandAllButton = createButton("ghcm-inline-action", "Expand all");
    expandAllButton.dataset.action = "expand-all";
    const closeButton = createButton("ghcm-inline-action ghcm-close-action", "Hide");
    const outline = document.createElement("nav");
    outline.className = "ghcm-outline";
    outline.setAttribute("aria-label", "Page contents");
    const shell = document.createElement("div");
    shell.className = "ghcm-sidebar-shell";
    const header = document.createElement("header");
    header.className = "ghcm-sidebar-header";
    const kicker = document.createElement("div");
    kicker.className = "ghcm-sidebar-kicker";
    kicker.textContent = "Contents";
    const toolbar = document.createElement("div");
    toolbar.className = "ghcm-sidebar-tools";
    toolbar.append(collapseAllButton, expandAllButton, closeButton);
    header.append(kicker, toolbar);
    const outlineShell = document.createElement("div");
    outlineShell.className = "ghcm-sidebar-outline";
    outlineShell.append(outline);
    shell.append(header, outlineShell);
    panel.append(shell);
    cell.append(trigger, panel);
    root.append(cell, backdrop);
    dockCell.append(root);
    dockRow.append(dockCell);
    return {
      dockRow,
      dockCell,
      root,
      trigger,
      backdrop,
      panel,
      outline,
      collapseAllButton,
      expandAllButton,
      closeButton
    };
  }
  function createButton(className, textContent, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = textContent;
    if (ariaLabel) {
      button.setAttribute("aria-label", ariaLabel);
    }
    return button;
  }

  // src/app/page-session-ui.ts
  var PageSessionUI = class {
    constructor(options) {
      this.options = options;
      __publicField(this, "controls");
      __publicField(this, "panel");
      __publicField(this, "activeHeading");
      __publicField(this, "panelState", {
        headings: [],
        activeHeadingKey: null,
        displayRevision: ""
      });
      this.controls = new HeadingControls(this.options.document, this.options.engine);
      this.panel = new PanelUI({
        onCollapseAll: this.options.onCollapseAll,
        onExpandAll: this.options.onExpandAll,
        onJump: (key) => this.jumpToHeading(key),
        resolveDockedLayout: () => this.options.adapter.getDockedPanelLayout?.(document) ?? null,
        resolveInlineHost: () => this.options.document.getPrimaryContainerElement()
      });
      this.activeHeading = new ActiveHeadingTracker({
        getStickyTop: () => this.options.adapter.getStickyHeaderOffset(document),
        resolveBinding: (key) => this.options.document.getBinding(key)
      });
    }
    mount(signal) {
      this.controls.mount(signal);
      this.panel.mount();
      this.activeHeading.bind(
        signal,
        () => this.panelState.headings,
        (activeHeadingKey) => this.updatePanelState({ activeHeadingKey })
      );
    }
    destroy() {
      this.activeHeading.destroy();
      this.panel.destroy();
      this.controls.destroy();
    }
    isStale() {
      return !this.panel.isConnected() || this.options.document.getContainerElements().some((element) => !element.isConnected) || !this.controls.isConnected();
    }
    togglePanel() {
      this.panel.setOpen(!this.panel.isOpen());
    }
    renderSnapshots(snapshots, displayRevision = buildHeadingDisplayRevision(snapshots)) {
      this.controls.sync(snapshots);
      this.activeHeading.sync(snapshots, true);
      this.updatePanelState({
        headings: snapshots,
        activeHeadingKey: this.activeHeading.getActiveHeadingKey(),
        displayRevision
      });
    }
    jumpToHeading(key) {
      const binding = this.options.document.getBinding(key);
      if (!binding) {
        return;
      }
      this.options.onExpandTo(key);
      scrollToElementWithOffset(binding.blockEl, this.options.adapter.getStickyHeaderOffset(document));
      this.activeHeading.setActiveHeadingKey(key, true);
      this.updatePanelState({
        activeHeadingKey: this.activeHeading.getActiveHeadingKey()
      });
    }
    updatePanelState(patch) {
      this.panelState = {
        ...this.panelState,
        ...patch
      };
      this.panel.render(this.panelState);
    }
  };

  // src/core/collapse-engine.ts
  var CollapseEngine = class {
    constructor(document2, initialCollapsedKeys) {
      this.document = document2;
      __publicField(this, "collapsedKeys", /* @__PURE__ */ new Set());
      __publicField(this, "states", /* @__PURE__ */ new Map());
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      this.document.filterKnownHeadingKeys(initialCollapsedKeys).forEach((key) => this.collapsedKeys.add(key));
      this.recompute();
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    isCollapsed(key) {
      return this.collapsedKeys.has(key);
    }
    getState(key) {
      return this.states.get(key) ?? { collapsed: false, hiddenByAncestor: false };
    }
    getSnapshots() {
      return this.getSnapshotsForHeadings(this.document.headings);
    }
    getSnapshotsForHeadings(headings) {
      return headings.map((heading) => ({
        ...heading,
        ...this.getState(heading.key)
      }));
    }
    toggle(key) {
      if (this.collapsedKeys.has(key)) {
        this.collapsedKeys.delete(key);
      } else {
        this.collapsedKeys.add(key);
      }
      this.apply();
    }
    toggleWithSiblings(key) {
      const shouldCollapse = !this.collapsedKeys.has(key);
      const siblingKeys = this.document.getSiblingKeys(key);
      for (const siblingKey of siblingKeys) {
        if (shouldCollapse) {
          this.collapsedKeys.add(siblingKey);
        } else {
          this.collapsedKeys.delete(siblingKey);
        }
      }
      this.apply();
    }
    collapseAll() {
      this.document.headings.forEach((heading) => this.collapsedKeys.add(heading.key));
      this.apply();
    }
    expandAll() {
      this.collapsedKeys.clear();
      this.apply();
    }
    expandTo(key) {
      this.document.getHeadingPath(key).forEach((heading) => this.collapsedKeys.delete(heading.key));
      this.apply();
    }
    getCollapsedKeysForContainer(containerKey) {
      return this.document.headings.filter((heading) => heading.container.key === containerKey && this.collapsedKeys.has(heading.key)).map((heading) => heading.key);
    }
    apply() {
      this.recompute();
      this.listeners.forEach((listener) => listener());
    }
    recompute() {
      this.states.clear();
      const stack = [];
      for (const heading of this.document.headings) {
        while (stack.length > 0 && heading.level <= stack[stack.length - 1].level) {
          stack.pop();
        }
        const collapsed = this.collapsedKeys.has(heading.key);
        const hiddenByAncestor = stack.length > 0;
        this.states.set(heading.key, {
          collapsed,
          hiddenByAncestor
        });
        if (collapsed) {
          stack.push({
            key: heading.key,
            level: heading.level
          });
        }
      }
    }
  };

  // src/app/page-session.ts
  var PageSession = class {
    constructor(pageKey, adapter, document2, storage) {
      this.pageKey = pageKey;
      this.adapter = adapter;
      this.document = document2;
      this.storage = storage;
      __publicField(this, "engine");
      __publicField(this, "ui");
      __publicField(this, "abortController", new AbortController());
      __publicField(this, "initialPageState");
      __publicField(this, "lastPersistedStateRevision");
      __publicField(this, "unsubscribeEngine", null);
      this.initialPageState = this.storage.getPageState(this.pageKey);
      this.lastPersistedStateRevision = serializePageState(this.initialPageState);
      this.engine = new CollapseEngine(this.document, this.getInitialCollapsedKeys());
      this.ui = new PageSessionUI({
        adapter: this.adapter,
        engine: this.engine,
        document: this.document,
        onCollapseAll: () => this.engine.collapseAll(),
        onExpandAll: () => this.engine.expandAll(),
        onExpandTo: (key) => this.engine.expandTo(key)
      });
    }
    mount() {
      this.ui.mount(this.abortController.signal);
      this.unsubscribeEngine = this.engine.subscribe(() => this.handleEngineChange());
      this.handleEngineChange();
    }
    destroy() {
      this.abortController.abort();
      this.unsubscribeEngine?.();
      this.unsubscribeEngine = null;
      this.ui.destroy();
    }
    isStale() {
      return this.ui.isStale();
    }
    collapseAll() {
      this.engine.collapseAll();
    }
    expandAll() {
      this.engine.expandAll();
    }
    togglePanel() {
      this.ui.togglePanel();
    }
    clearPageMemory() {
      this.lastPersistedStateRevision = serializePageState(createEmptyPageState());
      this.storage.clearPage(this.pageKey);
      this.engine.expandAll();
    }
    refreshDisplay(headings, displayRevision) {
      this.ui.renderSnapshots(this.engine.getSnapshotsForHeadings(headings), displayRevision);
    }
    getInitialCollapsedKeys() {
      return this.document.filterKnownHeadingKeys(
        this.document.containers.flatMap((container) => this.initialPageState.collapsedByContainer[container.key] ?? [])
      );
    }
    handleEngineChange() {
      this.ui.renderSnapshots(this.engine.getSnapshots());
      this.persistState();
    }
    persistState() {
      const nextPageState = this.buildPageState();
      const nextStateRevision = serializePageState(nextPageState);
      if (nextStateRevision === this.lastPersistedStateRevision) {
        return;
      }
      this.lastPersistedStateRevision = nextStateRevision;
      this.storage.setPageState(this.pageKey, nextPageState);
    }
    buildPageState() {
      return {
        collapsedByContainer: Object.fromEntries(
          this.document.containers.map((container) => [
            container.key,
            this.engine.getCollapsedKeysForContainer(container.key)
          ])
        )
      };
    }
  };

  // src/core/document-keys.ts
  function buildSiblingBucketKey(heading) {
    return `${heading.container.key}::${heading.parentKey ?? "root"}::${heading.level}`;
  }
  function buildHeadingBaseKey(containerKey, anchor) {
    return `${containerKey}::${anchor}`;
  }
  function buildHeadingKey(containerKey, anchor, duplicateIndex) {
    const baseKey = buildHeadingBaseKey(containerKey, anchor);
    if (duplicateIndex === 0) {
      return baseKey;
    }
    return `${baseKey}::${duplicateIndex + 1}`;
  }

  // src/core/page-document.ts
  var PageDocument = class {
    constructor(options) {
      __publicField(this, "containers");
      __publicField(this, "headings");
      __publicField(this, "containerElements", /* @__PURE__ */ new Map());
      __publicField(this, "headingIndex", /* @__PURE__ */ new Map());
      __publicField(this, "headingBindings", /* @__PURE__ */ new Map());
      __publicField(this, "headingPathKeys", /* @__PURE__ */ new Map());
      __publicField(this, "siblingIndex", /* @__PURE__ */ new Map());
      this.containers = options.containers;
      this.headings = options.headings;
      options.containerElements.forEach((container) => this.containerElements.set(container.key, container.element));
      options.headings.forEach((heading) => this.headingIndex.set(heading.key, heading));
      options.headingBindings.forEach((binding) => this.headingBindings.set(binding.key, binding));
      options.headingPathKeys.forEach((pathKeys, key) => this.headingPathKeys.set(key, pathKeys));
      options.siblingIndex.forEach((siblingKeys, key) => this.siblingIndex.set(key, siblingKeys));
    }
    findHeading(key) {
      return this.headingIndex.get(key);
    }
    hasHeading(key) {
      return this.headingIndex.has(key);
    }
    getBinding(key) {
      return this.headingBindings.get(key);
    }
    getContainerElements() {
      return [...this.containerElements.values()];
    }
    getPrimaryContainerElement() {
      return this.containerElements.values().next().value ?? null;
    }
    filterKnownHeadingKeys(keys) {
      return keys.filter((key) => this.hasHeading(key));
    }
    getHeadingPath(key) {
      return (this.headingPathKeys.get(key) ?? []).map((pathKey) => this.headingIndex.get(pathKey)).filter((heading) => Boolean(heading));
    }
    getSiblingKeys(key) {
      const heading = this.findHeading(key);
      if (!heading) {
        return [];
      }
      return [...this.siblingIndex.get(buildSiblingBucketKey(heading)) ?? []];
    }
  };

  // src/parsing/document-parser.ts
  function buildDocument(containers) {
    const containerRecords = [];
    const headings = [];
    const headingBindings = [];
    const headingPathKeys = /* @__PURE__ */ new Map();
    const siblingIndex = /* @__PURE__ */ new Map();
    for (const container of containers) {
      const { containerRecord, records, bindings } = buildContainerDocument(container, headingPathKeys, siblingIndex);
      containerRecords.push(containerRecord);
      headings.push(...records);
      headingBindings.push(...bindings);
    }
    return new PageDocument({
      containers: containerRecords,
      headings,
      containerElements: containers.map((container) => ({ key: container.key, element: container.element })),
      headingBindings,
      headingPathKeys,
      siblingIndex
    });
  }
  function buildContainerDocument(container, headingPathKeys, siblingIndex) {
    const containerRecord = {
      key: container.key,
      label: container.label,
      kind: container.kind
    };
    const containerHeadings = queryHeadings(container.element);
    const records = [];
    const bindings = [];
    const ancestryStack = [];
    const duplicateHeadingCounts = /* @__PURE__ */ new Map();
    for (let index = 0; index < containerHeadings.length; index += 1) {
      const headingEl = containerHeadings[index];
      const level = getHeadingLevel(headingEl);
      const anchor = getHeadingAnchor(headingEl, index);
      const text = getHeadingText(headingEl);
      const duplicateIndex = duplicateHeadingCounts.get(anchor) ?? 0;
      duplicateHeadingCounts.set(anchor, duplicateIndex + 1);
      while (ancestryStack.length > 0 && level <= ancestryStack[ancestryStack.length - 1].level) {
        ancestryStack.pop();
      }
      const record = {
        key: buildHeadingKey(container.key, anchor, duplicateIndex),
        anchor,
        level,
        text,
        container: containerRecord,
        parentKey: ancestryStack[ancestryStack.length - 1]?.key ?? null
      };
      const binding = {
        key: record.key,
        headingEl,
        blockEl: getHeadingBlock(headingEl),
        sectionEls: []
      };
      records.push(record);
      bindings.push(binding);
      headingPathKeys.set(record.key, ancestryStack.map((heading) => heading.key));
      ancestryStack.push(record);
      const siblingBucketKey = buildSiblingBucketKey(record);
      const siblingKeys = siblingIndex.get(siblingBucketKey) ?? [];
      siblingKeys.push(record.key);
      siblingIndex.set(siblingBucketKey, siblingKeys);
    }
    populateSectionElements(container.element, records, bindings);
    return {
      containerRecord,
      records,
      bindings
    };
  }
  function populateSectionElements(containerElement, records, bindings) {
    if (records.length === 0) {
      return;
    }
    if (bindings.every((binding) => binding.blockEl.parentElement === containerElement)) {
      const headingIndexByBlock = /* @__PURE__ */ new Map();
      bindings.forEach((binding, index) => headingIndexByBlock.set(binding.blockEl, index));
      const openHeadingIndexes = [];
      for (const child of Array.from(containerElement.children)) {
        if (child.closest(".ghcm-root")) {
          continue;
        }
        const headingIndex = headingIndexByBlock.get(child);
        if (headingIndex === void 0) {
          openHeadingIndexes.forEach((index) => bindings[index].sectionEls.push(child));
          continue;
        }
        while (openHeadingIndexes.length > 0 && records[openHeadingIndexes[openHeadingIndexes.length - 1]].level >= records[headingIndex].level) {
          openHeadingIndexes.pop();
        }
        openHeadingIndexes.forEach((index) => bindings[index].sectionEls.push(child));
        openHeadingIndexes.push(headingIndex);
      }
      return;
    }
    const boundaryIndexes = computeBoundaryIndexes(records);
    for (let index = 0; index < bindings.length; index += 1) {
      const current = bindings[index];
      const boundaryIndex = boundaryIndexes[index];
      const boundary = boundaryIndex === null ? null : bindings[boundaryIndex].blockEl;
      let cursor = current.blockEl.nextElementSibling;
      while (cursor && cursor !== boundary) {
        if (!cursor.closest(".ghcm-root")) {
          current.sectionEls.push(cursor);
        }
        cursor = cursor.nextElementSibling;
      }
    }
  }
  function computeBoundaryIndexes(records) {
    const boundaryIndexes = new Array(records.length).fill(null);
    const nextHeadingIndexByLevel = new Array(7).fill(void 0);
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const currentLevel = records[index].level;
      let boundaryIndex;
      for (let level = 1; level <= currentLevel; level += 1) {
        const candidateIndex = nextHeadingIndexByLevel[level];
        if (candidateIndex === void 0) {
          continue;
        }
        if (boundaryIndex === void 0 || candidateIndex < boundaryIndex) {
          boundaryIndex = candidateIndex;
        }
      }
      boundaryIndexes[index] = boundaryIndex ?? null;
      nextHeadingIndexByLevel[currentLevel] = index;
    }
    return boundaryIndexes;
  }

  // src/app/page-session-resolver.ts
  function findMatchingAdapter(adapters2, location) {
    return adapters2.find((candidate) => candidate.matches(location)) ?? null;
  }
  function resolvePageSession(adapters2, document2, location) {
    const adapter = findMatchingAdapter(adapters2, location);
    if (!adapter) {
      return { kind: "unsupported" };
    }
    const pageKey = adapter.getPageKey(location);
    const containers = adapter.findContainers(document2);
    if (containers.length === 0) {
      return {
        kind: "empty",
        version: buildPageVersion(adapter.id, pageKey, [])
      };
    }
    const parsedDocument = buildDocument(containers);
    return {
      kind: "ready",
      spec: {
        adapter,
        pageKey,
        document: parsedDocument,
        version: buildPageVersion(adapter.id, pageKey, parsedDocument.headings)
      }
    };
  }

  // src/app/app.ts
  var GitHubCollapseMarkdownApp = class {
    constructor() {
      __publicField(this, "storage", new StorageService());
      __publicField(this, "abortController", new AbortController());
      __publicField(this, "lifecycle", new AppLifecycle({
        onRefreshRequested: () => this.scheduleRefresh(),
        onKeydown: (event) => this.handleKeydown(event),
        resolveMutationAdapter: () => findMatchingAdapter(adapters, window.location)
      }));
      __publicField(this, "session", null);
      __publicField(this, "lastPageVersion", null);
      __publicField(this, "refreshTimer", 0);
      __publicField(this, "styleInjected", false);
    }
    start() {
      this.injectStyles();
      this.registerMenuCommands();
      this.bindLifecycleEvents();
      this.refresh();
    }
    handleKeydown(event) {
      if (isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || !event.shiftKey) {
        return;
      }
      if (key === "m") {
        event.preventDefault();
        this.session?.togglePanel();
        return;
      }
      if (key === "c") {
        event.preventDefault();
        this.session?.collapseAll();
        return;
      }
      if (key === "e") {
        event.preventDefault();
        this.session?.expandAll();
      }
    }
    destroy() {
      this.cancelScheduledRefresh();
      this.abortController.abort();
      this.lifecycle.destroy();
      this.teardownSession();
    }
    bindLifecycleEvents() {
      this.lifecycle.bind(this.abortController.signal);
    }
    registerMenuCommands() {
      registerUserscriptMenuCommand("Toggle panel", () => this.session?.togglePanel());
      registerUserscriptMenuCommand("Collapse all", () => this.session?.collapseAll());
      registerUserscriptMenuCommand("Expand all", () => this.session?.expandAll());
      registerUserscriptMenuCommand("Clear current page memory", () => this.session?.clearPageMemory());
    }
    injectStyles() {
      if (this.styleInjected) {
        return;
      }
      if (!injectUserscriptStyle(styles)) {
        const style = document.createElement("style");
        style.textContent = styles;
        document.head.append(style);
      }
      this.styleInjected = true;
    }
    refresh() {
      const resolution = resolvePageSession(adapters, document, window.location);
      if (resolution.kind === "unsupported") {
        this.lastPageVersion = null;
        this.teardownSession();
        return;
      }
      if (resolution.kind === "empty") {
        this.lastPageVersion = resolution.version;
        this.teardownSession();
        return;
      }
      const { spec } = resolution;
      if (this.session && !this.session.isStale() && hasSamePageStructure(this.lastPageVersion, spec.version)) {
        if (!hasSamePageDisplay(this.lastPageVersion, spec.version)) {
          this.session.refreshDisplay(spec.document.headings, spec.version.display);
        }
        this.lastPageVersion = spec.version;
        return;
      }
      this.lastPageVersion = spec.version;
      this.teardownSession();
      this.session = new PageSession(
        spec.pageKey,
        spec.adapter,
        spec.document,
        this.storage
      );
      this.session.mount();
    }
    scheduleRefresh() {
      this.cancelScheduledRefresh();
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTimer = 0;
        this.refresh();
      }, 80);
    }
    cancelScheduledRefresh() {
      if (this.refreshTimer === 0) {
        return;
      }
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = 0;
    }
    teardownSession() {
      this.session?.destroy();
      this.session = null;
    }
  };

  // src/main.ts
  var app = new GitHubCollapseMarkdownApp();
  app.start();
  Object.assign(window, {
    ghcmApp: app
  });
})();

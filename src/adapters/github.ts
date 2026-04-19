import type { ContainerKind, SiteAdapter } from "../core/types";
import { buildContentContainers, getLocationPageKey, queryContentCandidates, shouldRefreshForContentMutation } from "./shared";

const README_SELECTOR = "#readme";
const ISSUE_BODY_SELECTOR = "[data-testid='issue-body']";
const PR_BODY_SELECTOR = "[id^='pullrequest-']";
const COMMENT_SELECTOR = "[id^='issuecomment-']";
const WIKI_PATH_SEGMENT = "/wiki/";
const STICKY_HEADER_SELECTOR = [
  "header[role='banner']",
  ".AppHeader",
  ".Header",
  ".prc-PageLayout-Header-0of-R"
].join(", ");
const GITHUB_CONTENT_ROOT_SELECTOR = [
  "#readme .markdown-body",
  ".comment-body.markdown-body",
  ".js-comment-body.comment-body.markdown-body",
  ".markdown-body"
].join(", ");
const GITHUB_DOCK_HOST_SELECTORS = [
  "rails-partial[data-partial-name='codeViewRepoRoute.Sidebar'] .BorderGrid",
  "rails-partial[data-partial-name='codeViewRepoRoute.Sidebar']",
  "[class*='PageLayout-Pane'] [data-partial-name='codeViewRepoRoute.Sidebar'] .BorderGrid",
  ".Layout-sidebar .BorderGrid",
  ".Layout-sidebar"
];
const GITHUB_DOCK_BOUNDARY_SELECTORS = [
  "[class*='PageLayout-PaneWrapper']",
  "[class*='PageLayout-Pane-']",
  ".Layout-sidebar"
];

type GitHubContainerVariant = "comment" | "document" | null;

interface GitHubContainerDescriptor {
  id: string;
  kind: ContainerKind;
  label: string;
  variant: GitHubContainerVariant;
}

function isGitHubRootHomePath(location: Location): boolean {
  return location.pathname === "/";
}

function isGitHubWikiPath(location: Location): boolean {
  return location.pathname.includes(WIKI_PATH_SEGMENT);
}

function describeGitHubContainer(element: HTMLElement, location: Location): GitHubContainerDescriptor {
  if (element.closest(README_SELECTOR)) {
    return {
      id: "readme",
      kind: "markdown",
      label: "README",
      variant: null
    };
  }

  const comment = element.closest<HTMLElement>(COMMENT_SELECTOR);
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

export const githubAdapter: SiteAdapter = {
  id: "github",
  matches(location) {
    return location.hostname === "github.com" && !isGitHubRootHomePath(location);
  },
  getPageKey(location) {
    return getLocationPageKey(location);
  },
  findContainers(document) {
    const candidates = queryContentCandidates(document, GITHUB_CONTENT_ROOT_SELECTOR);
    const counts = {
      comment: 0,
      document: 0
    };

    return buildContentContainers("github", candidates, (element) => {
      const descriptor = describeGitHubContainer(element, document.location);
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
  getStickyHeaderOffset(document) {
    const sticky = document.querySelector<HTMLElement>(STICKY_HEADER_SELECTOR);
    return (sticky?.offsetHeight ?? 72) + 18;
  },
  getDockedPanelLayout(document) {
    const host = resolveGitHubDockHost(document);
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

function resolveGitHubDockHost(document: Document): HTMLElement | null {
  return queryFirst(document, GITHUB_DOCK_HOST_SELECTORS);
}

function resolveGitHubDockBoundary(host: HTMLElement): HTMLElement | null {
  return closestFirst(host, GITHUB_DOCK_BOUNDARY_SELECTORS);
}

function queryFirst(document: Document, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const match = document.querySelector<HTMLElement>(selector);
    if (match) {
      return match;
    }
  }

  return null;
}

function closestFirst(element: HTMLElement, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const match = element.closest<HTMLElement>(selector);
    if (match) {
      return match;
    }
  }

  return null;
}

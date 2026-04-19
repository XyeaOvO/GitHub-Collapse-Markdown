import type { SiteAdapter } from "../core/types";
import {
  buildContentContainers,
  describeStaticContainer,
  findFirstContentCandidate,
  getLocationPageKey,
  shouldRefreshForContentMutation
} from "./shared";

const DOCS_HOSTS = new Set(["docs.github.com", "help.github.com", "support.github.com"]);
const DOCS_ARTICLE_SELECTOR = [
  "[data-container='article'] .markdown-body",
  "#article-contents .markdown-body",
  "main article .markdown-body",
  "main .markdown-body"
].join(", ");

export const docsAdapter: SiteAdapter = {
  id: "docs",
  matches(location) {
    return DOCS_HOSTS.has(location.hostname);
  },
  getPageKey(location) {
    return getLocationPageKey(location);
  },
  findContainers(document) {
    const article = findFirstContentCandidate(document, DOCS_ARTICLE_SELECTOR);
    if (!article) {
      return [];
    }

    return buildContentContainers("docs", [article], describeStaticContainer("article", "Docs Article", "article"));
  },
  shouldRefreshForMutation(mutation) {
    return shouldRefreshForContentMutation(mutation, DOCS_ARTICLE_SELECTOR);
  },
  getStickyHeaderOffset(document) {
    const sticky = document.querySelector<HTMLElement>("header[role='banner']");
    return (sticky?.offsetHeight ?? 80) + 24;
  }
};

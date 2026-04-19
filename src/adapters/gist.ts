import type { SiteAdapter } from "../core/types";
import { buildContentContainers, getLocationPageKey, queryContentCandidates, shouldRefreshForContentMutation } from "./shared";

const GIST_CONTENT_ROOT_SELECTOR = ".markdown-body";

export const gistAdapter: SiteAdapter = {
  id: "gist",
  matches(location) {
    return location.hostname === "gist.github.com";
  },
  getPageKey(location) {
    return getLocationPageKey(location);
  },
  findContainers(document) {
    return buildContentContainers(
      "gist",
      queryContentCandidates(document, GIST_CONTENT_ROOT_SELECTOR, ".ghcm-root"),
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
  getStickyHeaderOffset(document) {
    const sticky = document.querySelector<HTMLElement>("header[role='banner'], .Header");
    return (sticky?.offsetHeight ?? 64) + 18;
  }
};

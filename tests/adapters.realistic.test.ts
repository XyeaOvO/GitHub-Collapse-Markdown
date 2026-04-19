import { describe, expect, it } from "vitest";
import { docsAdapter } from "../src/adapters/docs";
import { gistAdapter } from "../src/adapters/gist";
import { githubAdapter } from "../src/adapters/github";
import {
  docsArticleFixture,
  gistPageFixture,
  githubCommentPageFixture,
  githubIssueBodyNestedMarkdownFixture,
  githubReadmePageFixture
} from "./fixtures";

describe("site adapters with realistic DOM fixtures", () => {
  it("finds a generic GitHub markdown container on modern blob pages", () => {
    document.body.innerHTML = githubReadmePageFixture;
    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Document 1");
    expect(containers[0].key).toBe("github:document:1");
  });

  it("finds GitHub issue or PR comment containers", () => {
    document.body.innerHTML = githubCommentPageFixture;
    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Comment 1");
    expect(containers[0].kind).toBe("comment");
    expect(containers[0].key).toBe("github:comment:1");
  });

  it("prefers the innermost GitHub issue body markdown container when markdown bodies are nested", () => {
    document.body.innerHTML = githubIssueBodyNestedMarkdownFixture;
    const containers = githubAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Issue / PR Body");
    expect(containers[0].element.className).toContain("NewMarkdownViewer-module__safe-html-box__ZT1eD");
    expect(containers[0].key).toBe("github:issue-body");
  });

  it("finds rendered gist markdown containers", () => {
    document.body.innerHTML = gistPageFixture;
    const containers = gistAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Gist");
    expect(containers[0].key).toBe("gist:gist");
  });

  it("finds the current docs article container", () => {
    document.body.innerHTML = docsArticleFixture;
    const containers = docsAdapter.findContainers(document);
    expect(containers).toHaveLength(1);
    expect(containers[0].label).toBe("Docs Article");
    expect(containers[0].key).toBe("docs:article");
  });
});

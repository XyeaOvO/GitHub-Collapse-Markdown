import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageService } from "../src/core/storage";

describe("StorageService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("migrates legacy v1 state without preserving removed settings", () => {
    localStorage.setItem(
      "ghcm-v5-state",
      JSON.stringify({
        version: 1,
        settings: {
          memoryEnabled: false
        },
        pages: {
          "github.com/nodejs/node/blob/main/README.md": {
            collapsedByContainer: {
              "github:readme": ["github:readme::intro"]
            }
          }
        }
      })
    );

    const storage = new StorageService();

    expect(storage.getPageState("github.com/nodejs/node/blob/main/README.md")).toEqual({
      collapsedByContainer: {
        "github:readme": ["github:readme::intro"]
      }
    });
  });

  it("removes empty page state without keeping a redundant persisted snapshot", () => {
    const storage = new StorageService();

    storage.setPageState("github.com/nodejs/node/blob/main/README.md", {
      collapsedByContainer: {
        "github:readme": []
      }
    });

    expect(localStorage.getItem("ghcm-v5-state")).toBeNull();
  });

  it("can persist through an injected value store without touching globals", () => {
    const writes: unknown[] = [];
    const storage = new StorageService({
      read: <T>(_key: string, fallback: T): T => fallback,
      write: vi.fn((_key: string, value: unknown) => {
        writes.push(value);
      })
    });

    storage.setPageState("github.com/nodejs/node/blob/main/README.md", {
      collapsedByContainer: {
        "github:readme": ["github:readme::intro"]
      }
    });

    expect(writes).toEqual([
      {
        version: 2,
        pages: {
          "github.com/nodejs/node/blob/main/README.md": {
            collapsedByContainer: {
              "github:readme": ["github:readme::intro"]
            }
          }
        }
      }
    ]);
  });

  it("skips writes when the next page state is identical", () => {
    const write = vi.fn();
    const storage = new StorageService({
      read: <T>(_key: string, fallback: T): T => fallback,
      write
    });

    storage.setPageState("github.com/nodejs/node/blob/main/README.md", {
      collapsedByContainer: {
        "github:readme": ["github:readme::intro"]
      }
    });
    storage.setPageState("github.com/nodejs/node/blob/main/README.md", {
      collapsedByContainer: {
        "github:readme": ["github:readme::intro"]
      }
    });

    expect(write).toHaveBeenCalledTimes(1);
  });
});

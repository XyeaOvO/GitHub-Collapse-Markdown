import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createUserscriptValueStore,
  injectUserscriptStyle,
  registerUserscriptMenuCommand
} from "../src/platform/userscript";

describe("userscript platform helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers GM value storage when GM APIs are available", () => {
    const gmGetValue = vi.fn((_key: string, fallback: unknown) => fallback);
    const gmSetValue = vi.fn();
    const fallbackStorage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };

    vi.stubGlobal("GM_getValue", gmGetValue);
    vi.stubGlobal("GM_setValue", gmSetValue);

    const store = createUserscriptValueStore(fallbackStorage);
    store.read("ghcm", null);
    store.write("ghcm", { ok: true });

    expect(gmGetValue).toHaveBeenCalledWith("ghcm", null);
    expect(gmSetValue).toHaveBeenCalledWith("ghcm", { ok: true });
    expect(fallbackStorage.getItem).not.toHaveBeenCalled();
    expect(fallbackStorage.setItem).not.toHaveBeenCalled();
  });

  it("falls back to localStorage-style JSON persistence when GM APIs are unavailable", () => {
    const data = new Map<string, string>();
    const fallbackStorage = {
      getItem: vi.fn((key: string) => data.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        data.set(key, value);
      })
    };
    const store = createUserscriptValueStore(fallbackStorage);

    store.write("ghcm", { ok: true });

    expect(data.get("ghcm")).toBe(JSON.stringify({ ok: true }));
    expect(store.read("ghcm", null)).toEqual({ ok: true });
  });

  it("exposes style and menu helpers as safe no-ops when GM APIs are missing", () => {
    expect(injectUserscriptStyle(".x{}")).toBe(false);
    expect(registerUserscriptMenuCommand("Example", () => undefined)).toBe(false);
  });

  it("delegates style and menu helpers to GM APIs when present", () => {
    const gmAddStyle = vi.fn();
    const gmRegisterMenuCommand = vi.fn();
    vi.stubGlobal("GM_addStyle", gmAddStyle);
    vi.stubGlobal("GM_registerMenuCommand", gmRegisterMenuCommand);

    expect(injectUserscriptStyle(".x{}")).toBe(true);
    expect(registerUserscriptMenuCommand("Example", () => undefined)).toBe(true);
    expect(gmAddStyle).toHaveBeenCalledWith(".x{}");
    expect(gmRegisterMenuCommand).toHaveBeenCalledWith("Example", expect.any(Function));
  });
});

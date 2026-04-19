export interface ValueStore {
  read<T>(key: string, fallback: T): T;
  write<T>(key: string, value: T): void;
}

export function createUserscriptValueStore(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): ValueStore {
  if (canUseGMValueStore()) {
    return {
      read<T>(key: string, fallback: T): T {
        return GM_getValue<T>(key, fallback);
      },
      write<T>(key: string, value: T): void {
        GM_setValue(key, value);
      }
    };
  }

  return {
    read<T>(key: string, fallback: T): T {
      const raw = storage.getItem(key);
      if (!raw) {
        return fallback;
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    write<T>(key: string, value: T): void {
      storage.setItem(key, JSON.stringify(value));
    }
  };
}

export function injectUserscriptStyle(css: string): boolean {
  if (typeof GM_addStyle !== "function") {
    return false;
  }

  GM_addStyle(css);
  return true;
}

export function registerUserscriptMenuCommand(name: string, listener: () => void): boolean {
  if (typeof GM_registerMenuCommand !== "function") {
    return false;
  }

  GM_registerMenuCommand(name, listener);
  return true;
}

function canUseGMValueStore(): boolean {
  return typeof GM_getValue === "function" && typeof GM_setValue === "function";
}

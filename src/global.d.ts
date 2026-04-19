declare function GM_addStyle(css: string): void;
declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_setValue<T>(key: string, value: T): void;
declare function GM_registerMenuCommand(name: string, listener: () => void): void;

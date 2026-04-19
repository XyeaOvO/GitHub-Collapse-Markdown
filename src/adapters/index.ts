import type { SiteAdapter } from "../core/types";
import { docsAdapter } from "./docs";
import { gistAdapter } from "./gist";
import { githubAdapter } from "./github";

export const adapters: SiteAdapter[] = [githubAdapter, gistAdapter, docsAdapter];

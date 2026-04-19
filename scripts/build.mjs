import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const mainFile = resolve(root, "main.js");
const distFile = resolve(root, "dist", "github-collapse-markdown.user.js");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const banner = `// ==UserScript==
// @name        GitHub Collapse Markdown
// @version     ${packageJson.version}
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
`;

const result = await esbuild.build({
  entryPoints: [resolve(root, "src", "main.ts")],
  format: "iife",
  target: ["es2020"],
  platform: "browser",
  charset: "utf8",
  sourcemap: false,
  logLevel: "info",
  bundle: true,
  write: false,
  banner: {
    js: banner
  }
});

const output = result.outputFiles?.[0];
if (!output) {
  throw new Error("esbuild did not produce an output file");
}

await mkdir(resolve(root, "dist"), { recursive: true });
await writeUserscriptOutputs(output.text);

async function writeUserscriptOutputs(content) {
  await Promise.all([
    writeFile(mainFile, content, "utf8"),
    writeFile(distFile, content, "utf8")
  ]);
}

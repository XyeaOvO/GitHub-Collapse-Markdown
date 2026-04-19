import { GitHubCollapseMarkdownApp } from "./app/app";

const app = new GitHubCollapseMarkdownApp();

app.start();

Object.assign(window, {
  ghcmApp: app
});

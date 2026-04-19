import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    environmentOptions: {
      jsdom: {
        url: "https://github.com/test-owner/test-repo"
      }
    }
  }
});

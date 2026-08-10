import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Node declares the Web Storage globals and leaves them undefined unless given
// --localstorage-file, and vitest's jsdom environment skips any window property
// the Node global already has. The versions lacking the globals reject the flag.
const execArgv =
  "localStorage" in globalThis ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(
          new URL("./apps/web-editor/src", import.meta.url),
        ),
      },
      // A workspace package resolves through its exports field to dist, so
      // without this a suite checks the last build, not the working tree.
      {
        find: /^@domorium\/([^/]+)$/,
        replacement: fileURLToPath(
          new URL("./packages/$1/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
  test: {
    poolOptions: {
      forks: { execArgv },
      threads: { execArgv },
    },
    exclude: [
      ...configDefaults.exclude,
      "**/.worktrees/**",
      "**/build/**",
      "**/.intellijPlatform/**",
    ],
  },
});

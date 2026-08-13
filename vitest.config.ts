import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Node declares the Web Storage globals and leaves them undefined unless given
// --localstorage-file, and vitest's jsdom environment skips any window property
// the Node global already has. The versions lacking the globals reject the flag.
const execArgv =
  "localStorage" in globalThis ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web-editor/src", import.meta.url)),
    },
  },
  test: {
    execArgv,
    exclude: [
      ...configDefaults.exclude,
      "**/.worktrees/**",
      "**/build/**",
      "**/.intellijPlatform/**",
    ],
  },
});

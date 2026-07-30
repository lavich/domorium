import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs", "es"],
      fileName: (format) => format === "es" ? "index.esm.js" : "index.cjs",
    },
    rollupOptions: {
      external: [
        "@codemirror/autocomplete",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/highlight",
        "@gedcom/language-service",
      ],
    },
  },
});

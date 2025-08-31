import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    sourcemap: "inline",
    minify: false,
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/browserServerMain.ts"),
      formats: ["iife"],
      name: "serverExportVar",
      fileName: () => "browserServerMain.js",
    },
    rollupOptions: {
      external: ["vscode"],
      output: {
        format: "iife",
        name: "serverExportVar",
        entryFileNames: "browserServerMain.js",
        dir: path.resolve(__dirname, "dist/server"),
      },
    },
  },
});

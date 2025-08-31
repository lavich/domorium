import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    sourcemap: "inline",
    minify: false,
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/browserClientMain.ts"),
      formats: ["cjs"],
      fileName: () => "browserClientMain.js",
    },
    rollupOptions: {
      external: ["vscode"],
      output: {
        format: "cjs",
        entryFileNames: "browserClientMain.js",
        dir: path.resolve(__dirname, "dist/client"),
      },
    },
  },
});

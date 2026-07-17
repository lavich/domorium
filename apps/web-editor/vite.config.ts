import { defineConfig } from "vite";

export default defineConfig({
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@domorium/lsp", "@domorium/validator"],
  },
});

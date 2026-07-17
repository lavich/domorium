import { defineConfig } from "vite";

export default defineConfig({
  base: "/domorium/",
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@domorium/lsp", "@domorium/validator"],
  },
});

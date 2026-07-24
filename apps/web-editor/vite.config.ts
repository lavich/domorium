import { defineConfig } from "vite";

export default defineConfig({
  base: "/gedcom/",
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["gedcom-lsp", "gedcom-validator"],
  },
});

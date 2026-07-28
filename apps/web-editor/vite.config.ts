import { defineConfig } from "vite";

export default defineConfig({
  base: "/gedcom/",
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@gedcom/language-server", "@gedcom/validator"],
  },
});

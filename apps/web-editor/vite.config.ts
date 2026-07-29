import { defineConfig } from "vite";

export default defineConfig({
  base: "/gedcom/",
  optimizeDeps: {
    exclude: ["@gedcom/validator"],
  },
});

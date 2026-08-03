import { defineConfig } from "vite";

export default defineConfig({
  base: "/domorium/",
  optimizeDeps: {
    exclude: ["@domorium/validator"],
  },
});

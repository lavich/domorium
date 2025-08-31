import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      // entry point of your library
      entry: resolve(__dirname, "src/index.ts"),
      // name: "MyLib", // UMD/Global name (если нужен)
      formats: ["cjs", "es"], // какие форматы собирать
      fileName: (format) => (format === "es" ? `index.esm.js` : `index.cjs.js`),
    },
    rollupOptions: {
      external: ["chevrotain", "ts-brand"], // не бандлим зависимости
    },
  },
});

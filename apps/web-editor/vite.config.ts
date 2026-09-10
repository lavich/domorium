import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";

import { PATHS } from "./src/site/paths";

/**
 * `vite build` writes only the editor's shell; the pages around it are rendered
 * from the route table by scripts/prerender-site.mjs. In development there is no
 * such step, so the same table answers the same paths here — otherwise `/` would
 * be a 404 until a production build.
 */
function sitePages(): Plugin {
  const rendered = new Set<string>(
    Object.values(PATHS).filter((path) => path !== PATHS.editor),
  );
  return {
    name: "domorium:site-pages",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const [requested = "/"] = (request.url ?? "/").split("?");
        const path = requested.endsWith("/") ? requested : `${requested}/`;
        if (!rendered.has(path)) {
          next();
          return;
        }
        server
          .ssrLoadModule("/src/site/entry-server.tsx")
          .then(async (site) => {
            const html = site.renderPath(path, {
              stylesheet: "/src/index.css",
            });
            response.setHeader("content-type", "text/html");
            response.end(await server.transformIndexHtml(requested, html));
          })
          .catch(next);
      });
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), sitePages()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // The prerender step locates the compiled stylesheet through the manifest.
    manifest: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./editor/index.html", import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ["@domorium/validator"],
  },
});

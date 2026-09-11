// The lint configuration declares no environment globals, so every built-in is
// imported by name.
import console from "node:console";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const app = fileURLToPath(new URL("..", import.meta.url));
const dist = join(app, "dist");

const manifest = JSON.parse(
  await readFile(join(dist, ".vite", "manifest.json"), "utf8"),
);
const [stylesheet] = manifest["editor/index.html"]?.css ?? [];
if (!stylesheet) {
  throw new Error("The client build emitted no stylesheet to link.");
}

const site = await import(new URL("../.ssr/entry-server.js", import.meta.url));
const options = { stylesheet: `/${stylesheet}` };
const written = [];

const write = async (path, contents) => {
  const file = join(dist, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, contents);
  written.push(path);
};

for (const page of site.pages) {
  const html = site.renderPath(page.path, options);
  // The editor's own path is answered by the shell Vite already built.
  if (html) {
    await write(join(page.path, "index.html"), html);
  }
}

await write("404.html", site.renderNotFound(options));
await write(
  "sitemap.xml",
  site.buildSitemap(site.pages, {
    lastmod: new Date().toISOString().slice(0, 10),
  }),
);
await write("robots.txt", site.buildRobots());

console.log(`Prerendered ${written.length} files: ${written.join(", ")}`);

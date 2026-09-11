// `vite.config.ts` imports this, and the config loads before any alias exists,
// so every import here is relative.
import { themeScript } from "../theme";

import { EDITOR_STRUCTURED_DATA } from "./schema";

const SHELL = 'class="app-shell"';

/**
 * The rendered pages get these from `document.tsx`. The editor's page is a
 * hand-written file, so the dev server and the build put them into its head
 * from the same modules instead.
 */
export function injectShellHead(html: string): string {
  if (!html.includes(SHELL)) {
    return html;
  }
  const tags = [
    `<script>${themeScript}</script>`,
    ...EDITOR_STRUCTURED_DATA.map(
      (entry) =>
        `<script type="application/ld+json">${JSON.stringify(entry)}</script>`,
    ),
  ];
  return html.replace("</head>", () => `  ${tags.join("\n    ")}\n  </head>`);
}

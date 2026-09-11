import type { ReactElement } from "react";

import { INTEGRATIONS } from "./integrations";
import { IntegrationPage } from "./IntegrationPage";
import { LandingPage } from "./LandingPage";
import { NotFoundPage } from "./NotFoundPage";
import { absolute, PATHS, type SitePath } from "./paths";
import {
  breadcrumb,
  EDITOR_SOFTWARE,
  EDITOR_STRUCTURED_DATA,
  software,
} from "./schema";
import { widgetScript } from "./widget";

export { absolute, PATHS, SITE_ORIGIN, type SitePath } from "./paths";

export interface SitePage {
  path: SitePath;
  title: string;
  description: string;
  structuredData: object[];
  /** Null where the application shell answers the path: `editor/index.html`. */
  body: ReactElement | null;
  /** Inline scripts this page needs, beyond the theme every page carries. */
  scripts?: string[];
}

export const pages: SitePage[] = [
  {
    path: PATHS.home,
    title: "Domorium — GEDCOM editor and validator",
    description:
      "Open, validate and edit GEDCOM files in your browser — nothing is uploaded. Domorium brings the same GEDCOM support to VS Code, Obsidian and JetBrains IDEs.",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Domorium",
        url: absolute(PATHS.home),
        description:
          "Editor tooling for GEDCOM: validation, autocomplete and navigation for .ged files.",
      },
      EDITOR_SOFTWARE,
    ],
    body: <LandingPage />,
    scripts: [widgetScript],
  },
  {
    path: PATHS.editor,
    title: "GEDCOM editor in the browser — Domorium",
    description:
      "Open a .ged file in your browser, read every structural problem on the line that caused it, and save it back. Nothing is uploaded and nothing is converted.",
    structuredData: EDITOR_STRUCTURED_DATA,
    body: null,
  },
  ...INTEGRATIONS.map((integration) => ({
    path: integration.path,
    title: integration.title,
    description: integration.description,
    structuredData: [
      software({
        name: integration.heading,
        description: integration.description,
        path: integration.path,
        operatingSystem: integration.operatingSystem,
        ...(integration.requirement ? { softwareRequirements: "Node.js" } : {}),
      }),
      breadcrumb(integration.heading, integration.path),
    ],
    body: <IntegrationPage integration={integration} />,
  })),
];

export const notFound = {
  title: "Page not found — Domorium",
  description:
    "There is no page at this address. The GEDCOM editor and the VS Code, Obsidian and JetBrains integrations are all one step away.",
  body: <NotFoundPage />,
};

export const pageAt = (path: string): SitePage | undefined =>
  pages.find((page) => page.path === path);

import type { ReactElement } from "react";

import { INTEGRATIONS } from "./integrations";
import { IntegrationPage } from "./IntegrationPage";
import { LandingPage } from "./LandingPage";
import { NotFoundPage } from "./NotFoundPage";
import { absolute, PATHS, SITE_ORIGIN, type SitePath } from "./paths";

export { absolute, PATHS, SITE_ORIGIN, type SitePath } from "./paths";

export interface SitePage {
  path: SitePath;
  title: string;
  description: string;
  structuredData: object[];
  /** Null where the application shell answers the path: `editor/index.html`. */
  body: ReactElement | null;
}

const publisher = {
  "@type": "Organization",
  name: "Domorium",
  url: SITE_ORIGIN,
};

const software = ({
  path,
  ...fields
}: {
  name: string;
  description: string;
  path: SitePath;
  operatingSystem: string;
  softwareRequirements?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "Genealogy",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher,
  url: absolute(path),
  ...fields,
});

const breadcrumb = (name: string, path: SitePath) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Domorium",
      item: absolute(PATHS.home),
    },
    { "@type": "ListItem", position: 2, name, item: absolute(path) },
  ],
});

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
      software({
        name: "Domorium GEDCOM Editor",
        description:
          "A browser editor for .ged files that parses and validates them on your own machine.",
        path: PATHS.editor,
        operatingSystem: "Web",
      }),
    ],
    body: <LandingPage />,
  },
  {
    path: PATHS.editor,
    title: "GEDCOM editor in the browser — Domorium",
    description:
      "Open a .ged file in your browser, read every structural problem on the line that caused it, and save it back. Nothing is uploaded and nothing is converted.",
    structuredData: [
      software({
        name: "Domorium GEDCOM Editor",
        description:
          "A browser editor for .ged files that parses and validates them on your own machine.",
        path: PATHS.editor,
        operatingSystem: "Web",
      }),
      breadcrumb("GEDCOM editor", PATHS.editor),
    ],
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

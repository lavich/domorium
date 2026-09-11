import { absolute, PATHS, SITE_ORIGIN, type SitePath } from "./paths";

const publisher = {
  "@type": "Organization",
  name: "Domorium",
  url: SITE_ORIGIN,
};

export const software = ({
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

export const breadcrumb = (name: string, path: SitePath) => ({
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

export const EDITOR_SOFTWARE = software({
  name: "Domorium GEDCOM Editor",
  description:
    "A browser editor for .ged files that parses and validates them on your own machine.",
  path: PATHS.editor,
  operatingSystem: "Web",
});

export const EDITOR_STRUCTURED_DATA = [
  EDITOR_SOFTWARE,
  breadcrumb("GEDCOM editor", PATHS.editor),
];

import { LINKS } from "@/constants/links";

import { PATHS, type SitePath } from "./paths";

export interface Integration {
  path: SitePath;
  /** The nav's label, and the anchor text a sibling page uses. */
  name: string;
  /** Per ADR-0007 a platform page leads with GEDCOM and the platform. */
  heading: string;
  title: string;
  description: string;
  lede: string;
  /** One line for the landing page's card. */
  note: string;
  features: string[];
  /** What the platform itself asks of the reader, or nothing. */
  requirement: string | null;
  install: { lead: string; command?: string; steps?: string[] };
  marketplace: { href: string; label: string };
  /** For the structured data, in schema.org's vocabulary. */
  operatingSystem: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    path: PATHS.vscode,
    name: "VS Code",
    note: "A web extension as well, so it runs in vscode.dev with no local runtime.",
    heading: "GEDCOM for Visual Studio Code",
    title: "GEDCOM for Visual Studio Code — Domorium",
    description:
      "GEDCOM language support for Visual Studio Code by Domorium: autocomplete, validation as you type, hover, go to definition and safe cross-reference rename.",
    lede: "Read and edit .ged and .gedcom files with structure-aware suggestions and diagnostics as you type. The extension runs as a web extension, so it works in vscode.dev with no local runtime.",
    features: [
      "Context-aware autocomplete that knows which tags are legal at this level, in this structure",
      "Real-time structural validation against the GEDCOM 5.5.1 and 7.0 specifications",
      "Syntax highlighting from the moment a file opens, refined by the language server once it connects",
      "GEDCOM highlighted inside a gedcom code block in Markdown",
      "Hover information for GEDCOM tags, and the record a cross-reference names",
      "Go to definition, find all references with read/write highlights, and safe atomic rename",
      "Quick fixes for broken references and invalid levels",
      "Code folding for records and nested structures",
    ],
    requirement: null,
    install: {
      lead: "Install it from the Marketplace, or from the command line:",
      command: "code --install-extension domorium.gedcom",
    },
    marketplace: {
      href: LINKS.vscode,
      label: "Get it on the Visual Studio Marketplace",
    },
    operatingSystem: "Windows, macOS, Linux, Web",
  },
  {
    path: PATHS.obsidian,
    name: "Obsidian",
    note: "Desktop and mobile. Vault files are edited in place, never converted to Markdown.",
    heading: "GEDCOM for Obsidian",
    title: "GEDCOM for Obsidian — Domorium",
    description:
      "GEDCOM language support for Obsidian by Domorium: autocomplete, validation as you type, hover and go to definition for the .ged files already in your vault.",
    lede: "Edit the GEDCOM files in your vault where they already live. Nothing is converted to Markdown, and the plugin works on desktop and on mobile.",
    features: [
      "Context-aware autocomplete that knows which tags are legal at this level, in this structure",
      "Real-time structural validation against the GEDCOM 5.5.1 and 7.0 specifications",
      "Semantic syntax highlighting",
      "Hover information for GEDCOM tags, and a preview of the record a cross-reference names",
      "Go to definition for cross-references",
      "Vault files are edited in place, never converted to another format",
    ],
    requirement: null,
    install: {
      lead: "Install it from Obsidian's own plugin browser:",
      steps: [
        "Settings → Community plugins → Browse",
        "Search for GEDCOM, then install and enable it",
      ],
    },
    marketplace: {
      href: LINKS.obsidian,
      label: "Get it from the Obsidian plugin directory",
    },
    operatingSystem: "Windows, macOS, Linux, Android, iOS",
  },
  {
    path: PATHS.jetbrains,
    name: "JetBrains",
    note: "Any IntelliJ-platform IDE. Needs Node.js on PATH.",
    heading: "GEDCOM for JetBrains IDEs",
    title: "GEDCOM for JetBrains IDEs — Domorium",
    description:
      "GEDCOM language support for JetBrains IDEs by Domorium: autocomplete, validation as you type, hover, go to definition and folding in any IntelliJ-platform IDE.",
    lede: "Read and edit .ged and .gedcom files in IntelliJ IDEA, PyCharm, WebStorm or any other IntelliJ-platform IDE, with diagnostics as you type.",
    features: [
      "Context-aware autocomplete that knows which tags are legal at this level, in this structure",
      "Real-time structural validation against the GEDCOM 5.5.1 and 7.0 specifications",
      "Semantic syntax highlighting",
      "Hover information for GEDCOM tags, and the record a cross-reference names",
      "Go to definition for cross-references",
      "Code folding for records and nested structures",
    ],
    requirement:
      "Requires Node.js on PATH. The GEDCOM language server ships with the plugin and runs on your machine.",
    install: {
      lead: "Install it from the JetBrains Marketplace, or from the IDE:",
      steps: [
        "Settings → Plugins → Marketplace",
        "Search for GEDCOM, then install it and restart the IDE",
      ],
    },
    marketplace: {
      href: LINKS.jetbrains,
      label: "Get it on the JetBrains Marketplace",
    },
    operatingSystem: "Windows, macOS, Linux",
  },
];

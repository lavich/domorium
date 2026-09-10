export const SITE_ORIGIN = "https://domorium.com";

/** Every path the site publishes. The order is the order of the sitemap. */
export const PATHS = {
  home: "/",
  editor: "/editor/",
  vscode: "/vscode/",
  obsidian: "/obsidian/",
  jetbrains: "/jetbrains/",
} as const;

export type SitePath = (typeof PATHS)[keyof typeof PATHS];

export const absolute = (path: SitePath) => `${SITE_ORIGIN}${path}`;

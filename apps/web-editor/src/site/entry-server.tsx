import {
  buildRobots,
  buildSitemap,
  renderDocument,
  renderNotFound,
} from "./document";
import { pageAt, pages } from "./routes";

export { buildRobots, buildSitemap, renderNotFound, pages };

/** The pages the build writes and the dev server answers; `/editor/` is not one. */
export function renderPath(
  path: string,
  options: { stylesheet: string },
): string | null {
  const page = pageAt(path);
  return page?.body ? renderDocument(page, options) : null;
}

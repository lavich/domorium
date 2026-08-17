import { describe, expect, it } from "vitest";

import { followLink } from "./followLink";

const inFolder = { path: "tree.ged", hasWorkspace: true };

describe("following a link out of a document", () => {
  it("resolves a path against the directory of the document that names it", () => {
    expect(
      followLink(
        { kind: "file-relative", targetText: "media/portrait.jpg" },
        inFolder,
      ),
    ).toEqual({ kind: "file", path: "media/portrait.jpg" });

    expect(
      followLink(
        { kind: "file-relative", targetText: "portrait.jpg" },
        {
          path: "media/people/anna.ged",
          hasWorkspace: true,
        },
      ),
    ).toEqual({ kind: "file", path: "media/people/portrait.jpg" });
  });

  it("reads a Windows separator, which an exported file may carry", () => {
    expect(
      followLink(
        { kind: "file-relative", targetText: "media\\portrait.jpg" },
        inFolder,
      ),
    ).toEqual({ kind: "file", path: "media/portrait.jpg" });
  });

  it("sends a web address to the browser", () => {
    expect(
      followLink(
        { kind: "http", targetText: "https://example.org/" },
        inFolder,
      ),
    ).toEqual({ kind: "web", url: "https://example.org/" });
  });

  // Without a folder there is nothing to resolve against, and saying so is
  // better than opening an empty tab.
  it("says a folder is needed where none was granted", () => {
    expect(
      followLink(
        { kind: "file-relative", targetText: "media/portrait.jpg" },
        {
          path: "tree.ged",
          hasWorkspace: false,
        },
      ),
    ).toEqual({
      kind: "refused",
      message: "Open a folder to reach media/portrait.jpg",
    });
  });

  it("refuses a path that climbs out of the granted folder", () => {
    expect(
      followLink(
        { kind: "file-relative", targetText: "../../keys/id_rsa" },
        { path: "media/tree.ged", hasWorkspace: true },
      ),
    ).toMatchObject({ kind: "refused" });
  });

  it("refuses an absolute path, which names a place the folder does not hold", () => {
    expect(
      followLink(
        { kind: "file-absolute", targetText: "/etc/passwd" },
        inFolder,
      ),
    ).toEqual({
      kind: "refused",
      message: "/etc/passwd lies outside the folder you granted",
    });
  });
});

import { GedcomDocument } from "@domorium/validator";
import { describe, expect, it } from "vitest";

import { documentLinks } from "./documentLinks";
import {
  decodeFileTarget,
  encodeFileTarget,
  retargetFileLinks,
} from "./retargetFileLinks";

function linksOf(text: string, dialect: "7.0" | "5.5.1") {
  const document = new GedcomDocument();
  document.createDocument(text);
  return documentLinks(document.getNodes(), dialect);
}

const GEDCOM7 = `0 HEAD
1 GEDC
2 VERS 7.0
0 @O1@ OBJE
1 FILE media/my%20photo.jpg
1 FILE media/other.jpg
0 @O2@ OBJE
1 FILE media/my%20photo.jpg
1 WWW https://example.org/my%20photo.jpg
0 TRLR`;

describe("reading and writing a file target", () => {
  it("decodes what GEDCOM 7 escapes, because a payload is a URI reference", () => {
    expect(decodeFileTarget("media/my%20photo.jpg", "7.0")).toBe(
      "media/my photo.jpg",
    );
    expect(decodeFileTarget("media/%D0%9C%D0%B0%D1%88%D0%B0.jpg", "7.0")).toBe(
      "media/Маша.jpg",
    );
  });

  it("escapes what cannot be written literally, and keeps the separators", () => {
    expect(encodeFileTarget("media/my photo.jpg", "7.0")).toBe(
      "media/my%20photo.jpg",
    );
    expect(encodeFileTarget("media/a#b?c.jpg", "7.0")).toBe(
      "media/a%23b%3Fc.jpg",
    );
  });

  it("leaves a 5.5.1 path alone: it is a path, not a URI reference", () => {
    expect(encodeFileTarget("media/my photo.jpg", "5.5.1")).toBe(
      "media/my photo.jpg",
    );
    expect(decodeFileTarget("media/my%20photo.jpg", "5.5.1")).toBe(
      "media/my%20photo.jpg",
    );
  });

  it("reads a half-written escape as the characters it is made of", () => {
    expect(decodeFileTarget("media/100%.jpg", "7.0")).toBe("media/100%.jpg");
  });
});

describe("a 5.5.1 path, which is a string and not a URI reference", () => {
  const version = 1;
  const windows = `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @O1@ OBJE
1 FILE media\\my photo.jpg
0 TRLR`;

  it("finds a file a Windows program wrote with backslashes", () => {
    const edit = retargetFileLinks({
      links: linksOf(windows, "5.5.1"),
      dialect: "5.5.1",
      from: "media/my photo.jpg",
      to: "media/renamed.jpg",
      version,
    });

    expect(edit.edits).toHaveLength(1);
    expect(edit.edits[0]?.newText).toBe("media/renamed.jpg");
  });

  it("keeps a backslash a character in GEDCOM 7, where it separates nothing", () => {
    const edit = retargetFileLinks({
      links: linksOf(
        "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE media/a%5Cb.jpg\n0 TRLR",
        "7.0",
      ),
      dialect: "7.0",
      from: "media/a/b.jpg",
      to: "media/x.jpg",
      version,
    });

    expect(edit.edits).toEqual([]);
  });
});

describe("retargeting the files a document points at", () => {
  const version = 7;

  it("rewrites every payload naming the file, and nothing else", () => {
    const edit = retargetFileLinks({
      links: linksOf(GEDCOM7, "7.0"),
      dialect: "7.0",
      from: "media/my photo.jpg",
      to: "media/renamed one.jpg",
      version,
    });

    expect(edit.version).toBe(version);
    expect(edit.edits).toHaveLength(2);
    expect(new Set(edit.edits.map((e) => e.newText))).toEqual(
      new Set(["media/renamed%20one.jpg"]),
    );
    expect(edit.edits.map((e) => e.range.start.line)).toEqual([4, 7]);
  });

  it("matches on the decoded path, so escaping is not the caller's problem", () => {
    const edit = retargetFileLinks({
      links: linksOf(GEDCOM7, "7.0"),
      dialect: "7.0",
      from: "media/my%20photo.jpg",
      to: "media/x.jpg",
      version,
    });

    expect(edit.edits).toEqual([]);
  });

  it("reads a target written as ./name as naming the same file", () => {
    const edit = retargetFileLinks({
      links: linksOf(
        "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE ./a.jpg\n0 TRLR",
        "7.0",
      ),
      dialect: "7.0",
      from: "a.jpg",
      to: "b.jpg",
      version,
    });

    expect(edit.edits).toHaveLength(1);
    expect(edit.edits[0]?.newText).toBe("b.jpg");
  });

  it("leaves a web address alone, whatever it happens to be named", () => {
    const edit = retargetFileLinks({
      links: linksOf(GEDCOM7, "7.0"),
      dialect: "7.0",
      from: "https://example.org/my photo.jpg",
      to: "media/x.jpg",
      version,
    });

    expect(edit.edits).toEqual([]);
  });

  it("answers with nothing when the document points at no such file", () => {
    const edit = retargetFileLinks({
      links: linksOf(GEDCOM7, "7.0"),
      dialect: "7.0",
      from: "media/absent.jpg",
      to: "media/x.jpg",
      version,
    });

    expect(edit.edits).toEqual([]);
  });
});

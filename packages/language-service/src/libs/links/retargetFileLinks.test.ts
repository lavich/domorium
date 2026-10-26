import { GedcomDocument } from "@domorium/validator";
import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
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

describe("moving a file, or saying why it cannot be written", () => {
  const gedcom = (vers: string, payloads: string[]) =>
    `0 HEAD\n1 GEDC\n2 VERS ${vers}\n0 @O1@ OBJE\n${payloads.map((p) => `1 FILE ${p}`).join("\n")}\n0 TRLR`;
  const move = (text: string, from: string, to: string) =>
    new GedcomLanguageService(text).moveFileLinks(from, to);
  const applied = (text: string, from: string, to: string) => {
    const result = move(text, from, to);
    if (!result.ok) {
      return result;
    }
    const lines = text.split("\n");
    for (const { range, newText } of result.edit.edits) {
      const line = lines[range.start.line] ?? "";
      lines[range.start.line] =
        line.slice(0, range.start.character) +
        newText +
        line.slice(range.end.character);
    }
    return lines.join("\n");
  };

  it("rewrites every payload naming the file, carrying the version", () => {
    const service = new GedcomLanguageService(
      gedcom("7.0", ["media/my%20photo.jpg", "media/my%20photo.jpg"]),
      3,
    );
    const result = service.moveFileLinks(
      "media/my photo.jpg",
      "media/our photo.jpg",
    );

    expect(result.ok && result.edit.version).toBe(3);
    expect(result.ok && result.edit.edits.map((e) => e.newText)).toEqual([
      "media/our%20photo.jpg",
      "media/our%20photo.jpg",
    ]);
  });

  it("finds a 5.5.1 path written with backslashes and may move it upwards", () => {
    expect(
      applied(
        gedcom("5.5.1", ["media\\photo.jpg"]),
        "media/photo.jpg",
        "../photos/photo.jpg",
      ),
    ).toBe(gedcom("5.5.1", ["../photos/photo.jpg"]));
  });

  it("answers an empty edit, not a refusal, when nothing names the file", () => {
    const result = move(
      gedcom("7.0", ["media/marie.jpg"]),
      "media/absent.jpg",
      "../photos/absent.jpg",
    );

    expect(result.ok && result.edit.edits).toEqual([]);
  });

  it("answers an empty edit in a document of no supported version", () => {
    const text = gedcom("4.0", ["media/marie.jpg"]);

    expect(move(text, "media/marie.jpg", "photos/marie.jpg")).toMatchObject({
      ok: true,
      edit: { edits: [] },
    });
    expect(move(text, "media/marie.jpg", "media/marie.jpg")).toMatchObject({
      ok: true,
      edit: { edits: [] },
    });
  });

  it("answers a move to the same place with one edit per payload, changing nothing", () => {
    const text = gedcom("7.0", ["%2E%2E/x.jpg", "  %2E%2E/x.jpg  "]);
    const result = move(text, "../x.jpg", "./../x.jpg");

    expect(result.ok && result.edit.edits).toHaveLength(2);
    expect(applied(text, "../x.jpg", "./../x.jpg")).toBe(text);
  });

  it.each([
    ["7.0", "../photos/marie.jpg"],
    ["7.0", "/photos/marie.jpg"],
    ["7.0", ""],
    ["7.0", "media/\uD800.jpg"],
    ["5.5.1", "C:/photos/marie.jpg"],
    ["5.5.1", "photos:marie.jpg"],
    ["5.5.1", "@x@.jpg"],
    ["5.5.1", "media/a\nb.jpg"],
    ["5.5.1", "media/a\u0000b.jpg"],
    ["5.5.1", "media/\uD800.jpg"],
    ["5.5.1", " marie.jpg"],
  ] as const)("refuses a %s move to %j", (vers, to) => {
    const result = move(
      gedcom(vers, ["media/marie.jpg"]),
      "media/marie.jpg",
      to,
    );

    expect(result).toEqual({
      ok: false,
      code: "unwritable-file-target",
      message: expect.stringContaining(JSON.stringify(to)),
    });
  });

  it.each([
    ["7.0", "media/a#b?c.jpg", "media/a%23b%3Fc.jpg"],
    ["7.0", "C:/x.jpg", "C%3A/x.jpg"],
    ["5.5.1", "@x.jpg", "@x.jpg"],
  ] as const)("writes a %s move to %j as %j", (vers, to, payload) => {
    expect(
      applied(gedcom(vers, ["media/marie.jpg"]), "media/marie.jpg", to),
    ).toBe(gedcom(vers, [payload]));
  });

  it("refuses through the service while the deprecated answer still writes it", () => {
    const service = new GedcomLanguageService(
      gedcom("7.0", ["media/marie.jpg"]),
    );

    expect(
      service.moveFileLinks("media/marie.jpg", "../photos/marie.jpg"),
    ).toMatchObject({ ok: false, code: "unwritable-file-target" });
    expect(
      service
        .retargetFileLinks("media/marie.jpg", "../photos/marie.jpg")
        .edits.map((e) => e.newText),
    ).toEqual(["../photos/marie.jpg"]);
  });
});

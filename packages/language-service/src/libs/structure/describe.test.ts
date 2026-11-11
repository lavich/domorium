import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { EditRefusal, StructureDescription } from "../../types";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];

function service(lines: string[]) {
  return new GedcomLanguageService(lines.join("\n"));
}

function described(result: StructureDescription | EditRefusal) {
  if ("ok" in result) {
    throw new Error(`refused: ${result.code}`);
  }
  return result;
}

const field = (description: StructureDescription, tag: string) =>
  description.fields.find((entry) => entry.tag === tag);

describe("describing the structure at a position", () => {
  const person = [
    ...G7,
    "0 @I1@ INDI",
    "1 NAME Anna /Lee/",
    "2 GIVN Anna",
    "2 SURN Lee",
    "2 _SOUNDEX L000",
    "0 TRLR",
  ];

  it("gives the same field id in both dialects and a different schema identifier", () => {
    const seven = described(
      service(person).describeStructure({ line: 4, character: 0 }),
    );
    const five = described(
      service([
        ...G551,
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        "0 TRLR",
      ]).describeStructure({ line: 6, character: 0 }),
    );

    expect(field(seven, "GIVN")?.id).toBe("INDI.NAME.GIVN");
    expect(field(five, "GIVN")?.id).toBe("INDI.NAME.GIVN");
    expect(field(seven, "GIVN")?.schemaId).not.toBe(
      field(five, "GIVN")?.schemaId,
    );
  });

  it("lists what the document holds with its value and ranges, and every field the dialect allows", () => {
    const description = described(
      service(person).describeStructure({ line: 4, character: 3 }),
    );

    expect(description.id).toBe("INDI.NAME");
    expect(field(description, "GIVN")?.occurrences).toEqual([
      {
        value: "Anna",
        range: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 11 },
        },
        subtreeRange: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 11 },
        },
      },
    ]);
    expect(field(description, "NICK")?.occurrences).toEqual([]);
    expect(field(description, "TYPE")?.payload.kind).toBe("enum");
    expect(description.value).toBe("Anna /Lee/");
    expect(description.version).toBe(0);
  });

  it("lists a custom tag apart from the fields", () => {
    const description = described(
      service(person).describeStructure({ line: 4, character: 0 }),
    );

    expect(description.fields.map((entry) => entry.tag)).not.toContain(
      "_SOUNDEX",
    );
    expect(description.undefinedOccurrences.map((entry) => entry.tag)).toEqual([
      "_SOUNDEX",
    ]);
  });

  it("describes the structure a continuation line continues", () => {
    const description = described(
      service([
        ...G7,
        "0 @I1@ INDI",
        "1 NOTE first",
        "2 CONT second",
        "0 TRLR",
      ]).describeStructure({ line: 5, character: 2 }),
    );

    expect(description.id).toBe("INDI.NOTE");
    expect(description.value).toBe("first\nsecond");
    expect(description.subtreeRange?.end).toEqual({ line: 5, character: 13 });
  });

  it("reads an escaped at sign of a text value as one", () => {
    const description = described(
      service([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME A /B/",
        "2 NICK @@home",
        "0 TRLR",
      ]).describeStructure({ line: 4, character: 0 }),
    );

    expect(field(description, "NICK")?.occurrences[0].value).toBe("@home");
  });

  it("describes what a person may gain, with nothing held", () => {
    const description = described(
      service([...G7, "0 @I1@ INDI", "0 TRLR"]).describeStructure(
        { line: 3, character: 0 },
        "NAME",
      ),
    );

    expect(description.id).toBe("INDI.NAME");
    expect(field(description, "GIVN")).toBeDefined();
    expect(
      description.fields.every((entry) => entry.occurrences.length === 0),
    ).toBe(true);
  });

  it("lists the records a pointer may name, with a label, and marks a reciprocal", () => {
    const description = described(
      service([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "0 @F2@ FAM",
        "0 TRLR",
      ]).describeStructure({ line: 3, character: 0 }),
    );

    const famc = field(description, "FAMC");
    expect(famc?.candidates?.map((entry) => entry.xref)).toEqual([
      "@F1@",
      "@F2@",
    ]);
    expect(famc?.candidates).toEqual([
      { xref: "@F1@", label: "Anna /Lee/" },
      { xref: "@F2@" },
    ]);
    expect(famc?.reciprocal).toBe(true);
    expect(field(description, "SOUR")?.reciprocal).toBe(false);
  });

  it("refuses a blank line", () => {
    const text = service([...G7, "0 @I1@ INDI", "", "0 TRLR"]);

    expect(text.describeStructure({ line: 4, character: 0 })).toMatchObject({
      ok: false,
      code: "not-a-structure",
    });
  });

  it("refuses a position on no structure", () => {
    const text = service(person);

    expect(text.describeStructure({ line: 99, character: 0 })).toMatchObject({
      ok: false,
      code: "not-a-structure",
    });
  });

  it("refuses a document with no dialect", () => {
    expect(
      new GedcomLanguageService(
        "0 @I1@ INDI\n1 NAME A /B/\n",
      ).describeStructure({
        line: 1,
        character: 0,
      }),
    ).toMatchObject({ ok: false, code: "no-dialect" });
  });

  it("refuses a tag the dialect does not have there", () => {
    const text = service([...G551, "0 @I1@ INDI", "0 TRLR"]);

    expect(
      text.describeStructure({ line: 5, character: 0 }, "TRAN"),
    ).toMatchObject({
      ok: false,
      code: "unknown-path",
    });
  });
});

describe("describing a structure by its schema path", () => {
  it("describes a translation that is not in the text, with the ids beginning at the path", () => {
    const description = described(
      service([...G7, "0 @I1@ INDI", "0 TRLR"]).describeSchemaPath(
        "INDI.NAME.TRAN",
      ),
    );

    expect(field(description, "LANG")).toMatchObject({
      id: "INDI.NAME.TRAN.LANG",
      required: true,
    });
    expect(
      description.fields.every((entry) => entry.occurrences.length === 0),
    ).toBe(true);
    expect(description.range).toBeUndefined();
  });

  it("refuses a path the dialect does not have", () => {
    expect(
      service([...G551, "0 @I1@ INDI", "0 TRLR"]).describeSchemaPath(
        "INDI.NAME.TRAN",
      ),
    ).toMatchObject({ ok: false, code: "unknown-path" });
  });
});

describe("the ranges of a structure that has children", () => {
  it("gives the line as the range and the subtree as the subtree range", () => {
    const description = described(
      service([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        "2 SURN Lee",
        "0 TRLR",
      ]).describeStructure({ line: 4, character: 0 }),
    );

    expect(description.range).toEqual({
      start: { line: 4, character: 0 },
      end: { line: 4, character: 17 },
    });
    expect(description.subtreeRange?.end).toEqual({ line: 6, character: 10 });
  });

  it("gives the line as the range of an occurrence that has children", () => {
    const description = described(
      service([
        ...G7,
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        "0 TRLR",
      ]).describeStructure({ line: 3, character: 0 }),
    );

    expect(field(description, "NAME")?.occurrences[0]).toMatchObject({
      range: { end: { line: 4, character: 17 } },
      subtreeRange: { end: { line: 5, character: 11 } },
    });
  });
});

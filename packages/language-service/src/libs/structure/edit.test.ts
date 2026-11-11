import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";
import type { EditRefusal, StructureEditResult } from "../../types";
import { applyEdits } from "../position/applyEdits";

const G7 = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
const G551 = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
];
const DIALECTS = [
  ["7.0", G7],
  ["5.5.1", G551],
] as const;

type Result = StructureEditResult | EditRefusal;

function accepted(result: Result): StructureEditResult {
  if (!result.ok) {
    throw new Error(`refused: ${result.code} ${result.message}`);
  }
  return result;
}

function refused(result: Result): EditRefusal {
  if (result.ok) {
    throw new Error("expected a refusal");
  }
  return result;
}

const textOf = (lines: string[], eol = "\n") => lines.join(eol);

function after(text: string, result: Result): string {
  return applyEdits(text, accepted(result).edit.edits);
}

function errorCodes(text: string): string[] {
  return new GedcomLanguageService(text)
    .getDiagnostics()
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.code);
}

const at = (line: number) => ({ line, character: 0 });

describe.each(DIALECTS)("editing a structure in %s", (dialect, header) => {
  const base = header.length;
  const named = [
    ...header,
    "0 @I1@ INDI",
    "1 NAME Anna /Lee/",
    "2 GIVN Anna",
    "2 _SOUNDEX L000",
    "2 NOTE a note",
    "1 SEX F",
    "0 TRLR",
  ];

  it("adds the first name of a person, its parts one level below", () => {
    const text = textOf([...header, "0 @I1@ INDI", "0 TRLR"]);
    const service = new GedcomLanguageService(text);

    const result = service.addStructure(
      at(base),
      "NAME",
      {
        value: "Anna /Lee/",
        children: [
          { tag: "GIVN", value: "Anna" },
          { tag: "SURN", value: "Lee" },
        ],
      },
      0,
    );

    const next = after(text, result);
    expect(next).toBe(
      textOf([
        ...header,
        "0 @I1@ INDI",
        "1 NAME Anna /Lee/",
        "2 GIVN Anna",
        "2 SURN Lee",
        "0 TRLR",
      ]),
    );
    expect(errorCodes(next)).toEqual(errorCodes(text));
  });

  it("places a second name after the first and its subtree", () => {
    const text = textOf(named);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.addStructure(at(base), "NAME", { value: "Bo /Lee/" }, 0),
    );

    expect(next.split("\n").slice(base, base + 7)).toEqual([
      "0 @I1@ INDI",
      "1 NAME Anna /Lee/",
      "2 GIVN Anna",
      "2 _SOUNDEX L000",
      "2 NOTE a note",
      "1 NAME Bo /Lee/",
      "1 SEX F",
    ]);
  });

  it("changes one value and leaves every other line, a custom tag included", () => {
    const text = textOf(named);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.setValue(at(base + 4), { value: "another note" }, 0),
    );

    expect(next.split("\n")).toEqual(
      named.map((line) =>
        line === "2 NOTE a note" ? "2 NOTE another note" : line,
      ),
    );
  });

  it("changes the value of a structure that has children and keeps them", () => {
    const text = textOf(named);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.setValue(at(base + 1), { value: "Bea /Lee/" }, 0),
    );

    expect(next.split("\n")).toEqual(
      named.map((line) =>
        line === "1 NAME Anna /Lee/" ? "1 NAME Bea /Lee/" : line,
      ),
    );
  });

  it("replaces a value and its continuation lines together", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NOTE one",
      "2 CONT two",
      "2 CONT three",
      "1 SEX F",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.setValue(at(base + 1), { value: "single" }, 0),
    );

    expect(next.split("\n").slice(base)).toEqual([
      "0 @I1@ INDI",
      "1 NOTE single",
      "1 SEX F",
      "0 TRLR",
    ]);
  });

  it("removes the last part of a name and keeps the name line", () => {
    const text = textOf([
      ...header,
      "0 @I1@ INDI",
      "1 NAME Anna /Lee/",
      "2 NICK Ann",
      "0 TRLR",
    ]);
    const service = new GedcomLanguageService(text);

    const next = after(text, service.removeStructure(at(base + 2), 0));

    expect(next.split("\n").slice(base)).toEqual([
      "0 @I1@ INDI",
      "1 NAME Anna /Lee/",
      "0 TRLR",
    ]);
  });

  it("deletes a name with the notes and everything beneath it", () => {
    const text = textOf(named);
    const service = new GedcomLanguageService(text);

    const next = after(text, service.removeStructure(at(base + 1), 0));

    expect(next.split("\n").slice(base)).toEqual([
      "0 @I1@ INDI",
      "1 SEX F",
      "0 TRLR",
    ]);
  });

  it("deletes a last structure of a text that has no final terminator", () => {
    const text = textOf([...header, "0 @I1@ INDI", "1 NAME A /B/", "2 NICK x"]);
    const service = new GedcomLanguageService(text);

    expect(after(text, service.removeStructure(at(base + 2), 0))).toBe(
      textOf([...header, "0 @I1@ INDI", "1 NAME A /B/"]),
    );
  });

  it("uses the terminator of the document", () => {
    const text = textOf(named, "\r\n");
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.addStructure(at(base), "NAME", { value: "Bo /Lee/" }, 0),
    );

    expect(next.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    expect(next).toContain("1 NAME Bo /Lee/\r\n1 SEX F");
  });

  it("puts an added line on its own line when the text has no final terminator", () => {
    const text = textOf([...header, "0 @I1@ INDI", "1 NAME A /B/"]);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.addStructure(at(base + 1), "NICK", { value: "Al" }, 0),
    );

    expect(next).toBe(
      textOf([...header, "0 @I1@ INDI", "1 NAME A /B/", "2 NICK Al"]),
    );
  });

  it("writes an at sign as the dialect does and a break as CONT", () => {
    const text = textOf(named);
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.setValue(at(base + 4), { value: "@first\nsecond@x" }, 0),
    );

    const lines = next.split("\n");
    expect(lines[base + 4]).toBe("2 NOTE @@first");
    expect(lines[base + 5]).toBe(
      dialect === "5.5.1" ? "3 CONT second@@x" : "3 CONT second@x",
    );
  });

  it("refuses a stale version", () => {
    const service = new GedcomLanguageService(textOf(named), 3);

    expect(
      refused(service.setValue(at(base + 2), { value: "x" }, 2)).code,
    ).toBe("stale-document");
  });

  it("refuses to remove a whole record and to give a person a value", () => {
    const service = new GedcomLanguageService(textOf(named));

    expect(refused(service.removeStructure(at(base), 0)).code).toBe(
      "record-edit-unsupported",
    );
    expect(refused(service.setValue(at(base), { value: "x" }, 0)).code).toBe(
      "value-not-allowed",
    );
  });

  it("refuses a position on no structure", () => {
    const service = new GedcomLanguageService(textOf(named));

    expect(refused(service.removeStructure(at(99), 0)).code).toBe(
      "not-a-structure",
    );
  });
});

describe.each(DIALECTS)(
  "reading back what was written in %s",
  (_dialect, header) => {
    const base = header.length;
    const read = (value: string) => {
      const text = textOf([...header, "0 @I1@ INDI", "1 NAME A /B/", "0 TRLR"]);
      const service = new GedcomLanguageService(text);
      const next = after(
        text,
        service.addStructure(at(base + 1), "NOTE", { value }, 0),
      );
      const description = new GedcomLanguageService(next).describeStructure(
        at(base + 1),
      );
      if ("ok" in description) {
        throw new Error(description.code);
      }
      return description.fields.find((entry) => entry.tag === "NOTE")
        ?.occurrences[0].value;
    };

    it.each([
      ["an at sign", "a@b and @c"],
      ["a line break", "first\nsecond"],
      ["a leading at sign on a second line", "first\n@second"],
      ["300 characters", "word ".repeat(70).trim()],
    ])("gives back a value with %s", (_what, value) => {
      expect(read(value)).toBe(value);
    });
  },
);

describe("a 5.5.1 field that is text or a pointer", () => {
  const base = G551.length;
  const text = textOf([
    ...G551,
    "0 @I1@ INDI",
    "1 NAME A /B/",
    "0 @N1@ NOTE",
    "0 TRLR",
  ]);

  it("writes text, escaped, when it is given as a value", () => {
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.addStructure(at(base + 1), "NOTE", { value: "@N1@ is text" }, 0),
    );

    expect(next.split("\n")[base + 2]).toBe("2 NOTE @@N1@@ is text");
  });

  it("writes a pointer as it is when it is given as a pointer", () => {
    const service = new GedcomLanguageService(text);

    const next = after(
      text,
      service.addStructure(at(base + 1), "NOTE", { pointer: "@N1@" }, 0),
    );

    expect(next.split("\n")[base + 2]).toBe("2 NOTE @N1@");
  });
});

describe.each([
  [
    "setValue",
    (service: GedcomLanguageService, line: number, version: number) =>
      service.setValue(at(line), { value: "x" }, version),
  ],
  [
    "removeStructure",
    (service: GedcomLanguageService, line: number, version: number) =>
      service.removeStructure(at(line), version),
  ],
  [
    "addStructure",
    (service: GedcomLanguageService, line: number, version: number) =>
      service.addStructure(at(line), "NICK", { value: "x" }, version),
  ],
])("%s", (_operation, act) => {
  const lines = [...G7, "0 @I1@ INDI", "1 NAME A /B/", "0 TRLR"];

  it("refuses a stale version", () => {
    expect(
      refused(act(new GedcomLanguageService(textOf(lines), 3), 4, 2)).code,
    ).toBe("stale-document");
  });

  it("refuses a document with no dialect", () => {
    const service = new GedcomLanguageService("0 @I1@ INDI\n1 NAME A /B/\n");

    expect(refused(act(service, 1, 0)).code).toBe("no-dialect");
  });

  it("refuses a position on no structure, a blank line included", () => {
    const service = new GedcomLanguageService(
      textOf([...G7, "0 @I1@ INDI", "", "0 TRLR"]),
    );

    expect(refused(act(service, 4, 0)).code).toBe("not-a-structure");
    expect(refused(act(service, 99, 0)).code).toBe("not-a-structure");
  });
});

it("refuses an edit in a document with no dialect", () => {
  const service = new GedcomLanguageService("0 @I1@ INDI\n1 NAME A /B/\n");

  expect(refused(service.removeStructure(at(1), 0)).code).toBe("no-dialect");
});

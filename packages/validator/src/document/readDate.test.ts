import { describe, expect, it } from "vitest";
import { GedcomDocument } from "./gedcomDocument";
import { GedcomErrorCode } from "../types/errors";

function documentIn(version: string, ...header: string[]): GedcomDocument {
  return new GedcomDocument().createDocument(
    ["0 HEAD", "1 GEDC", `2 VERS ${version}`, ...header, "0 TRLR", ""].join(
      "\n",
    ),
  );
}

const g7 = documentIn("7.0");
const g551 = documentIn("5.5.1");
const unversioned = new GedcomDocument().createDocument("0 HEAD\n0 TRLR");
const paf = new GedcomDocument().createDocument(
  "0 HEAD\n1 SYST PAF\n2 VERS 5.0\n1 GEDC\n2 VERS 5.5.1\n0 TRLR",
);

function dateDiagnostics(version: string, payload: string) {
  return new GedcomDocument()
    .createDocument(
      [
        "0 HEAD",
        "1 GEDC",
        `2 VERS ${version}`,
        "0 @I1@ INDI",
        "1 BIRT",
        `2 DATE ${payload}`,
        "0 TRLR",
        "",
      ].join("\n"),
    )
    .getErrors()
    .filter((error) => error.message.startsWith("Value for DATE"));
}

describe("reading a GEDCOM 7 date", () => {
  it("puts a year before the common era there, not in AD", () => {
    expect(g7.readDate("1401 BCE")?.dates).toStrictEqual([
      { calendar: "GREGORIAN", year: 1401, epoch: "BCE" },
    ]);
    expect(g7.readDate("12 AUG 1401 BCE")?.dates).toStrictEqual([
      {
        calendar: "GREGORIAN",
        day: 12,
        month: "AUG",
        year: 1401,
        epoch: "BCE",
      },
    ]);
  });

  it("keeps the calendar a year is counted in", () => {
    expect(g7.readDate("ABT HEBREW 5761")).toStrictEqual({
      modifier: "ABT",
      dates: [{ calendar: "HEBREW", year: 5761 }],
      text: "ABT HEBREW 5761",
    });
    expect(g7.readDate("HEBREW 11 SVN 7")?.dates).toStrictEqual([
      { calendar: "HEBREW", day: 11, month: "SVN", year: 7 },
    ]);
    expect(g7.readDate("ABT FRENCH_R 11 FLOR 92")?.dates).toStrictEqual([
      { calendar: "FRENCH_R", day: 11, month: "FLOR", year: 92 },
    ]);
    expect(g7.readDate("JULIAN 3 MAR 1721")?.dates).toStrictEqual([
      { calendar: "JULIAN", day: 3, month: "MAR", year: 1721 },
    ]);
  });

  it("gives each end of a range or period its own calendar", () => {
    expect(g7.readDate("FROM JULIAN 1670 TO 1800")).toStrictEqual({
      modifier: "FROM",
      dates: [
        { calendar: "JULIAN", year: 1670 },
        { calendar: "GREGORIAN", year: 1800 },
      ],
      text: "FROM JULIAN 1670 TO 1800",
    });
    expect(g7.readDate("BET JAN 1900 AND 1910")?.dates).toHaveLength(2);
    expect(g7.readDate("TO 1920")?.modifier).toBe("TO");
    expect(g7.readDate("FROM 1900")?.dates).toHaveLength(1);
  });

  it("names each modifier the grammar has", () => {
    for (const modifier of ["ABT", "CAL", "EST", "BEF", "AFT"]) {
      expect(g7.readDate(`${modifier} 1900`)?.modifier).toBe(modifier);
    }
    expect(g7.readDate("1900")).not.toHaveProperty("modifier");
  });

  it("reads an aliased month as the standard tag it stands for", () => {
    const aliased = documentIn(
      "7.0",
      "1 SCHMA",
      "2 TAG _JANV https://gedcom.io/terms/v7/month-JAN",
    );
    expect(aliased.readDate("1 _JANV 2000")?.dates[0]?.month).toBe("JAN");
  });

  it("keeps an extension calendar and epoch as written", () => {
    const extended = documentIn(
      "7.0",
      "1 SCHMA",
      "2 TAG _MAYA https://example.com/maya",
      "2 TAG _BAKTUN https://example.com/baktun",
    );
    expect(extended.readDate("_MAYA 13 _BAKTUN")?.dates).toStrictEqual([
      { calendar: "_MAYA", year: 13, epoch: "_BAKTUN" },
    ]);
  });

  it("trims the payload it is handed", () => {
    expect(g7.readDate(" 2000 ")?.text).toBe("2000");
  });

  it("declines what the diagnostics reject", () => {
    expect(g7.readDate("NOT A DATE")).toBeNull();
    expect(g7.readDate("32 FEB 2020")).toBeNull();
    expect(g7.readDate("29 FEB 1900")).toBeNull();
    expect(g7.readDate("@#DJULIAN@ 1700")).toBeNull();
    expect(g7.readDate("")).toBeNull();
  });
});

describe("reading a GEDCOM 5.5.1 date", () => {
  it("reads every spelling of the epoch as BCE", () => {
    for (const written of ["1401 BC", "1401 B.C.", "1401 BCE", "1401B.C."]) {
      expect(g551.readDate(written)?.dates).toStrictEqual([
        { calendar: "GREGORIAN", year: 1401, epoch: "BCE" },
      ]);
    }
  });

  it("names a calendar the way GEDCOM 7 does", () => {
    expect(g551.readDate("@#DFRENCH R@ 11 FLOR 92")?.dates).toStrictEqual([
      { calendar: "FRENCH_R", day: 11, month: "FLOR", year: 92 },
    ]);
    expect(
      g551
        .readDate("BET @#DJULIAN@ 1670 AND 1700")
        ?.dates.map((date) => date.calendar),
    ).toStrictEqual(["JULIAN", "GREGORIAN"]);
  });

  it("reads the later year of a dual year, across a century", () => {
    expect(g551.readDate("11 FEB 1750/51")?.dates[0]).toMatchObject({
      year: 1750,
      dualYear: 1751,
    });
    expect(g551.readDate("1699/00")?.dates[0]?.dualYear).toBe(1700);
  });

  it("names no later year where the digits are not the year that follows", () => {
    expect(g551.readDate("1750/50")?.dates[0]).not.toHaveProperty("dualYear");
    expect(g551.readDate("1750/49")?.dates[0]).not.toHaveProperty("dualYear");
    expect(g551.readDate("1750/51 B.C.")?.dates[0]).not.toHaveProperty(
      "dualYear",
    );
  });

  it("gives each end of a period the calendar its own escape names", () => {
    expect(
      g551.readDate("FROM @#DJULIAN@ 1670 TO @#DHEBREW@ 5500")?.dates,
    ).toStrictEqual([
      { calendar: "JULIAN", year: 1670 },
      { calendar: "HEBREW", year: 5500 },
    ]);
  });

  it("keeps a phrase apart from the date it interprets", () => {
    expect(
      g551.readDate("INT 1900 (about the turn of the century)"),
    ).toStrictEqual({
      modifier: "INT",
      dates: [{ calendar: "GREGORIAN", year: 1900 }],
      phrase: "about the turn of the century",
      text: "INT 1900 (about the turn of the century)",
    });
    expect(g551.readDate("(unknown)")).toStrictEqual({
      dates: [],
      phrase: "unknown",
      text: "(unknown)",
    });
  });

  it("declines a calendar the schema gives no months, though it is valid", () => {
    expect(dateDiagnostics("5.5.1", "@#DROMAN@ 5 AUC 1000")).toStrictEqual([]);
    expect(g551.readDate("@#DROMAN@ 5 AUC 1000")).toBeNull();
  });
});

describe("a year the calendar does not number", () => {
  it("declines year 0 in GEDCOM 7", () => {
    expect(g7.readDate("0")).toBeNull();
    expect(g7.readDate("0 BCE")).toBeNull();
  });

  it("declines year 0 in GEDCOM 5.5.1, however the epoch is spelled", () => {
    expect(g551.readDate("0")).toBeNull();
    expect(g551.readDate("0BC")).toBeNull();
    expect(g551.readDate("@#DJULIAN@ 1 JAN 0")).toBeNull();
  });

  it("reads year 0 in a calendar no specification says lacks one", () => {
    const declared = documentIn(
      "7.0",
      "1 SCHMA",
      "2 TAG _CAL https://example.com/calendar",
    );
    expect(declared.readDate("_CAL 0")?.dates).toStrictEqual([
      { calendar: "_CAL", year: 0 },
    ]);
  });
});

describe("the two dialects, where both read a date", () => {
  it.each([
    "7 NOV 1867",
    "ABT 1850",
    "BET 1850 AND 1860",
    "FROM 1850 TO 1860",
    "1401 BCE",
  ])("read %s alike", (payload) => {
    expect(g551.readDate(payload)).not.toBeNull();
    expect(g551.readDate(payload)).toStrictEqual(g7.readDate(payload));
  });

  it("read a Hebrew year alike, each in its own spelling", () => {
    expect(g7.readDate("HEBREW 5761")).not.toBeNull();
    expect(g551.readDate("@#DHEBREW@ 5761")?.dates).toStrictEqual(
      g7.readDate("HEBREW 5761")?.dates,
    );
  });
});

describe("which rules a document reads its dates by", () => {
  it("reads by either dialect where the header names no version", () => {
    expect(unversioned.readDate("7 NOV 1867")?.dates).toStrictEqual([
      { calendar: "GREGORIAN", day: 7, month: "NOV", year: 1867 },
    ]);
  });

  it("reads by either dialect in a Personal Ancestral File", () => {
    expect(paf.readDate("ABT 1850")).toStrictEqual({
      modifier: "ABT",
      dates: [{ calendar: "GREGORIAN", year: 1850 }],
      text: "ABT 1850",
    });
  });

  it("reads by either dialect in a version it does not check", () => {
    const read = documentIn("8.0").readDate("BET 1850 AND 1860");
    expect(read?.modifier).toBe("BET");
    expect(read?.dates.map((date) => date.year)).toEqual([1850, 1860]);
  });

  it("reads what only GEDCOM 5.5.1 writes, where no dialect is checked", () => {
    expect(
      unversioned.readDate("@#DJULIAN@ 12 FEB 1750/51")?.dates,
    ).toStrictEqual([
      {
        calendar: "JULIAN",
        day: 12,
        month: "FEB",
        year: 1750,
        dualYear: 1751,
      },
    ]);
  });

  it("reads what only GEDCOM 7 writes, where no dialect is checked", () => {
    expect(unversioned.readDate("FROM JULIAN 1670 TO 1800")).toStrictEqual({
      modifier: "FROM",
      dates: [
        { calendar: "JULIAN", year: 1670 },
        { calendar: "GREGORIAN", year: 1800 },
      ],
      text: "FROM JULIAN 1670 TO 1800",
    });
  });

  it("declines, where no dialect is checked, what neither dialect reads", () => {
    expect(unversioned.readDate("sometime in spring")).toBeNull();
    expect(unversioned.readDate("31 FEB 1900")).toBeNull();
    expect(unversioned.readDate("0 BCE")).toBeNull();
    expect(unversioned.readDate("JULIAN 31 FEB 1900")).toBeNull();
    expect(unversioned.readDate("JULIAN 0")).toBeNull();
  });

  it("reports nothing about a date where no dialect is checked", () => {
    const codes = (header: string) =>
      new GedcomDocument()
        .createDocument(`${header}0 @I1@ INDI\n1 BIRT\n2 DATE 31 FEB 0\n0 TRLR`)
        .getErrors()
        .map((error) => error.code);

    expect(codes("0 HEAD\n")).toEqual([GedcomErrorCode.UndeterminedVersion]);
    expect(codes("0 HEAD\n1 SYST PAF\n1 GEDC\n2 VERS 5.5\n")).toEqual([
      GedcomErrorCode.PersonalAncestralFile,
    ]);
    expect(codes("0 HEAD\n1 GEDC\n2 VERS 8.0\n")).toEqual([
      GedcomErrorCode.UnsupportedVersion,
    ]);
  });

  it("reads a substituted version by the schema it is checked against", () => {
    expect(documentIn("5.5").readDate("1401 B.C.")?.dates[0]?.epoch).toBe(
      "BCE",
    );
  });

  it("reads a fragment by the dialect it is given, and by no other", () => {
    const fragment = new GedcomDocument().createDocument("0 @I1@ INDI", {
      fragment: true,
      dialect: "5.5.1",
    });
    expect(fragment.readDate("@#DJULIAN@ 1700")?.dates[0]?.calendar).toBe(
      "JULIAN",
    );
    const g7fragment = new GedcomDocument().createDocument("0 @I1@ INDI", {
      fragment: true,
      dialect: "7.0",
    });
    expect(g7fragment.readDate("@#DJULIAN@ 1750")).toBeNull();
  });

  it("forgets the dialect of a text it has replaced", () => {
    const document = documentIn("5.5.1");
    document.createDocument("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR");
    expect(document.readDate("@#DJULIAN@ 1700")).toBeNull();
  });

  it("forgets the dialect of a text replaced by one with no version", () => {
    const document = documentIn("7.0");
    document.createDocument("0 HEAD\n0 TRLR");
    expect(document.readDate("@#DJULIAN@ 1700")?.dates[0]?.calendar).toBe(
      "JULIAN",
    );
  });
});

describe("agreement with the diagnostics", () => {
  const payloads = [
    "2000",
    "1 JAN 2000",
    "JAN 2000",
    "1 2000",
    "JAN",
    "ABT 1950",
    "BET 1900 AND 1910",
    "BET 1900",
    "FROM 1900 TO 1910",
    "TO 1920",
    "JULIAN 3 MAR 1721",
    "@#DJULIAN@ 3 MAR 1721",
    "1000 BCE",
    "1000 B.C.",
    "31 APR 2000",
    "29 FEB 2000",
    "29 FEB 1900",
    "29 FEB 1900 B.C.",
    "HEBREW 1 TSH 5761",
    "INT 1900 (circa)",
    "(unknown)",
    "1750/51",
    "AFT 1 JAN",
    "1750/50",
    "1  JAN 2000",
    "1\tJAN\t2000",
    "FROM @#DJULIAN@ 1670 TO @#DHEBREW@ 5500",
    "0",
    "0 BCE",
    "0BC",
    "BET JULIAN 0 AND 10",
    "30 FEB 0",
  ];

  for (const version of ["7.0", "5.5.1"]) {
    const document = version === "7.0" ? g7 : g551;
    it.each(payloads)(`reads %s in ${version} only where it is valid`, (p) => {
      const rejected = dateDiagnostics(version, p).some((error) =>
        [
          GedcomErrorCode.IncorrectValue,
          GedcomErrorCode.ImpossibleDay,
          GedcomErrorCode.ImpossibleYear,
        ].includes(error.code),
      );
      expect(document.readDate(p) === null).toBe(rejected);
    });
  }
});

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

describe("which rules a document reads its dates by", () => {
  it("reads none where the header names no version", () => {
    const undetermined = new GedcomDocument().createDocument("0 HEAD\n0 TRLR");
    expect(undetermined.readDate("2000")).toBeNull();
  });

  it("reads none in a version it does not check", () => {
    expect(documentIn("4.0").readDate("2000")).toBeNull();
    const paf = new GedcomDocument().createDocument(
      "0 HEAD\n1 SYST PAF\n2 VERS 5.0\n1 GEDC\n2 VERS 5.5.1\n0 TRLR",
    );
    expect(paf.readDate("2000")).toBeNull();
  });

  it("reads a substituted version by the schema it is checked against", () => {
    expect(documentIn("5.5").readDate("1401 B.C.")?.dates[0]?.epoch).toBe(
      "BCE",
    );
  });

  it("reads a fragment by the dialect it is given", () => {
    const fragment = new GedcomDocument().createDocument("0 @I1@ INDI", {
      fragment: true,
      dialect: "5.5.1",
    });
    expect(fragment.readDate("@#DJULIAN@ 1700")?.dates[0]?.calendar).toBe(
      "JULIAN",
    );
  });

  it("forgets the dialect of a text it has replaced", () => {
    const document = documentIn("7.0");
    document.createDocument("0 HEAD\n0 TRLR");
    expect(document.readDate("2000")).toBeNull();
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
  ];

  for (const version of ["7.0", "5.5.1"]) {
    const document = version === "7.0" ? g7 : g551;
    it.each(payloads)(`reads %s in ${version} only where it is valid`, (p) => {
      const rejected = dateDiagnostics(version, p).some((error) =>
        [
          GedcomErrorCode.IncorrectValue,
          GedcomErrorCode.ImpossibleDay,
        ].includes(error.code),
      );
      expect(document.readDate(p) === null).toBe(rejected);
    });
  }
});

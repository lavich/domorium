import { GedcomDocument } from "@domorium/validator";
import { describe, expect, it } from "vitest";

import { documentSymbols } from "./documentSymbols";

function symbols(text: string) {
  const document = new GedcomDocument();
  document.createDocument(text);
  return documentSymbols(document.getNodes());
}

describe("the label a record answers to", () => {
  it("names an individual by the name written beneath it", () => {
    expect(symbols("0 @I1@ INDI\n1 NAME Homer /Simpson/")[0]?.label).toBe(
      "Homer /Simpson/",
    );
  });

  it("names a source by its title", () => {
    expect(symbols("0 @S1@ SOUR\n1 TITL Parish register")[0]?.label).toBe(
      "Parish register",
    );
  });

  it("names a submitter and a repository by their name", () => {
    expect(symbols("0 @U1@ SUBM\n1 NAME Ada")[0]?.label).toBe("Ada");
    expect(symbols("0 @R1@ REPO\n1 NAME County archive")[0]?.label).toBe(
      "County archive",
    );
  });

  it("takes the first, so a second name does not rewrite the label", () => {
    expect(
      symbols("0 @I1@ INDI\n1 NAME Homer /Simpson/\n1 NAME Max /Power/")[0]
        ?.label,
    ).toBe("Homer /Simpson/");
  });

  it("leaves a record the format gives no name unlabelled", () => {
    expect(symbols("0 @F1@ FAM\n1 HUSB @I1@")[0]?.label).toBeUndefined();
    expect(symbols("0 HEAD\n1 GEDC")[0]?.label).toBeUndefined();
  });

  it("leaves the label off a line that is not a record", () => {
    const [record] = symbols("0 @I1@ INDI\n1 NAME Homer /Simpson/");

    expect(record?.children[0]?.label).toBeUndefined();
  });

  it("declines a name with nothing written after it", () => {
    expect(symbols("0 @I1@ INDI\n1 NAME")[0]?.label).toBeUndefined();
  });

  it("names a shared note by the text on its own line", () => {
    expect(symbols("0 @N1@ SNOTE Shared note 1")[0]?.label).toBe(
      "Shared note 1",
    );
    expect(symbols("0 @N1@ NOTE Note in 5.5.1")[0]?.label).toBe(
      "Note in 5.5.1",
    );
  });
});

describe("what a record is called by anything pointing at it", () => {
  it("is the identifier, not the text a shared note carries", () => {
    expect(symbols("0 @N1@ SNOTE Shared note 1")[0]?.detail).toBe("@N1@");
  });

  it("is the identifier for every other record too", () => {
    expect(symbols("0 @I1@ INDI\n1 NAME Homer /Simpson/")[0]?.detail).toBe(
      "@I1@",
    );
  });

  it("is still the payload on a line that is not a record", () => {
    expect(symbols("0 @I1@ INDI\n1 SEX M")[0]?.children[0]?.detail).toBe("M");
  });

  it("is what a line points at where a record points and says nothing", () => {
    expect(symbols("0 @F1@ FAM\n1 HUSB @I1@")[0]?.children[0]?.detail).toBe(
      "@I1@",
    );
  });
});

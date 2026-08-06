import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { GedcomDocument } from "./gedcomDocument";

const maximal70 = readFileSync(
  fileURLToPath(
    new URL("../../../../test-data/maximal70.ged", import.meta.url),
  ),
  "utf8",
);

describe("maximal70.ged", () => {
  // FamilySearch's own conformance file for GEDCOM 7. Every structural
  // diagnostic it provokes is a validator defect. The file also begins with a
  // UTF-8 BOM, which the lexer still reports — that is a separate task, so
  // LEXER diagnostics are filtered out rather than asserted away.
  test("produces no structural diagnostics", () => {
    const document = new GedcomDocument().createDocument(maximal70);

    const structural = document
      .getErrors()
      .filter((error) => error.code !== "LEXER");

    expect(structural).toEqual([]);
  });

  test("resolves the URI of an extension tag declared in its SCHMA", () => {
    const document = new GedcomDocument().createDocument(maximal70);

    const submitter = document
      .getNodes()
      .find((node) => node.tokens.POINTER?.value === "@U1@");
    const skype = submitter?.children.find(
      (node) => node.tokens.TAG?.value === "_SKYPEID",
    );

    expect(document.getLabel(skype!)).toBe(
      "Extension tag (http://xmlns.com/foaf/0.1/skypeID)",
    );
  });
});

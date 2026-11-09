import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";

const PEOPLE = 50_000;
const FAMILIES = 20_000;

function largeDocument() {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  let middle = 0;
  let last = 0;
  for (let i = 1; i <= PEOPLE; i += 1) {
    if (i === PEOPLE / 2) {
      middle = lines.length;
    }
    last = lines.length;
    lines.push(
      `0 @I${i}@ INDI`,
      `1 NAME Given${i} /Family${i}/`,
      `2 GIVN Given${i}`,
    );
  }
  for (let i = 1; i <= FAMILIES; i += 1) {
    lines.push(`0 @F${i}@ FAM`, `1 HUSB @I${i}@`);
  }
  lines.push("0 TRLR");
  return {
    service: new GedcomLanguageService(lines.join("\n") + "\n", 1),
    middle,
    last,
  };
}

describe("a large document", () => {
  const { service, middle, last } = largeDocument();

  it("describes a person with the candidates of its pointers", () => {
    const started = performance.now();
    const description = service.describeStructure({
      line: middle,
      character: 0,
    });
    const elapsed = performance.now() - started;

    expect(description).not.toHaveProperty("ok", false);
    expect(elapsed).toBeLessThan(1000);
  }, 120_000);

  it("checks a value without reading the diagnostics of the document", () => {
    const started = performance.now();
    const result = service.validateValue(
      { line: middle + 1, character: 0 },
      "TYPE",
      { value: "nonsense" },
    );
    const elapsed = performance.now() - started;

    expect(result).toMatchObject({ ok: true });
    expect(elapsed).toBeLessThan(200);
  });

  it("adds a structure to the last person", () => {
    const started = performance.now();
    const result = service.addStructure(
      { line: last, character: 0 },
      "NAME",
      { value: "A /B/" },
      1,
    );
    const elapsed = performance.now() - started;

    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  }, 120_000);
});

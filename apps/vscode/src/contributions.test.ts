import { semanticTokenLegend } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import contributed from "../package.json";

/*
 * A theme with no rule for a semantic type falls back to the TextMate scope VS
 * Code maps it to, and the default for `variable` is `variable.other.readwrite`,
 * which most themes leave the colour of ordinary text. The map names scopes to
 * fall back to instead. Its keys are semantic selectors, and a stale one is
 * ignored rather than reported — which is what this test is for.
 */
describe("the scopes a theme reaches a GEDCOM token by", () => {
  const [contribution] = contributed.contributes.semanticTokenScopes;
  const selectors = Object.keys(contribution.scopes);

  it("belongs to the language the extension contributes", () => {
    expect(contribution.language).toBe(
      contributed.contributes.languages[0]?.id,
    );
  });

  it("names types and modifiers the legend has", () => {
    for (const selector of selectors) {
      const [type, ...modifiers] = selector.split(".");
      expect(semanticTokenLegend.tokenTypes).toContain(type);
      for (const modifier of modifiers) {
        expect(semanticTokenLegend.tokenModifiers).toContain(modifier);
      }
    }
  });

  it("gives every selector somewhere to fall back to", () => {
    for (const selector of selectors) {
      expect(
        contribution.scopes[selector as keyof typeof contribution.scopes],
      ).not.toHaveLength(0);
    }
  });
});

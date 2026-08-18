import { semanticTokenLegend } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import contributed from "../package.json";
import { GEDCOM_DOCUMENTS } from "./documentSelector";

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

// #160: an extension that declares no trust support is disabled in Restricted
// Mode, and one that declares no virtual-workspace support is badged in
// github.dev — in both cases with no word about it in the editor.
describe("what the manifest says about where the extension may run", () => {
  it("supports an untrusted workspace, because it executes nothing from one", () => {
    expect(contributed.capabilities.untrustedWorkspaces).toEqual({
      supported: true,
    });
  });

  it("supports a virtual workspace as far as it can, and says what is missing", () => {
    const virtual = contributed.capabilities.virtualWorkspaces;
    expect(virtual.supported).toBe("limited");
    expect(virtual.description).toMatch(/link/i);
  });

  it("wakes for a folder holding GEDCOM, not only for an open file", () => {
    expect(contributed.activationEvents).toContain(
      "workspaceContains:**/*.ged",
    );
  });

  it("turns semantic highlighting on for GEDCOM, whatever the theme asks", () => {
    expect(
      contributed.contributes.configurationDefaults["[gedcom]"][
        "editor.semanticHighlighting.enabled"
      ],
    ).toBe(true);
  });
});

describe("the documents the client attaches to", () => {
  it("names the language and not one scheme, so a virtual file counts", () => {
    expect(GEDCOM_DOCUMENTS).toEqual([{ language: "gedcom" }]);
  });
});

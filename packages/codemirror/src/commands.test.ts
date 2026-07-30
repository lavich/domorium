import { EditorState, type TransactionSpec } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  findReferences,
  getDefinitionOffset,
  renameReference,
} from "./commands";
import { EditorLanguageService } from "./service";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 TRLR",
].join("\n");

describe("GEDCOM CodeMirror commands", () => {
  it("finds references and resolves their definition", () => {
    const use = text.lastIndexOf("@I1@") + 1;
    const state = EditorState.create({ doc: text, selection: { anchor: use } });
    const language = new EditorLanguageService();

    expect(findReferences(state, language)).toHaveLength(2);
    expect(getDefinitionOffset(state, language)).toBe(text.indexOf("@I1@"));
  });

  it("renames a declaration and all references atomically", () => {
    let state = EditorState.create({
      doc: text,
      selection: { anchor: text.lastIndexOf("@I1@") + 1 },
    });
    const target = {
      get state() {
        return state;
      },
      dispatch(spec: TransactionSpec) {
        state = state.update(spec).state;
      },
    };

    expect(renameReference(target, new EditorLanguageService(), "@I2@")).toBe(true);
    expect(state.doc.toString().match(/@I2@/g)).toHaveLength(2);
    expect(state.doc.toString()).not.toContain("@I1@");
  });
});

import { history, undo } from "@codemirror/commands";
import {
  EditorState,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  canRenameReference,
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

  it("reports whether the current selection can be renamed", () => {
    const language = new EditorLanguageService();
    const reference = EditorState.create({
      doc: text,
      selection: { anchor: text.lastIndexOf("@I1@") + 1 },
    });
    const whitespace = EditorState.create({
      doc: text,
      selection: { anchor: text.indexOf("HEAD") - 1 },
    });

    expect(canRenameReference(reference, language)).toBe(true);
    expect(canRenameReference(whitespace, language)).toBe(false);
  });

  it("renames atomically so one undo restores every reference", () => {
    let state = EditorState.create({
      doc: text,
      selection: { anchor: text.lastIndexOf("@I1@") + 1 },
      extensions: [history()],
    });
    const target = {
      get state() {
        return state;
      },
      dispatch(transaction: Transaction | TransactionSpec) {
        state =
          transaction instanceof Transaction
            ? transaction.state
            : state.update(transaction).state;
      },
    };

    expect(renameReference(target, new EditorLanguageService(), "@I2@")).toBe(
      true,
    );
    expect(state.doc.toString().match(/@I2@/g)).toHaveLength(2);
    expect(state.doc.toString()).not.toContain("@I1@");
    expect(undo(target)).toBe(true);
    expect(state.doc.toString()).toBe(text);
  });
});

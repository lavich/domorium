// @vitest-environment jsdom
import { CompletionContext } from "@codemirror/autocomplete";
import { cursorGroupForward, deleteGroupBackward } from "@codemirror/commands";
import { SearchQuery, selectNextOccurrence } from "@codemirror/search";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { completionSource, createGedcomExtensions } from "./extensions";
import { EditorLanguageService } from "./service";

const actions = { applyWorkspaceEdit: () => true };

function gedcomState(doc: string, anchor = 0): EditorState {
  return EditorState.create({
    doc,
    selection: { anchor },
    extensions: [
      createGedcomExtensions({ actions }),
      EditorState.allowMultipleSelections.of(true),
    ],
  });
}

function wordAt(state: EditorState, pos: number): string | null {
  const word = state.wordAt(pos);
  return word ? state.sliceDoc(word.from, word.to) : null;
}

let view: EditorView | undefined;

afterEach(() => {
  view?.destroy();
  view = undefined;
});

function gedcomView(doc: string, anchor: number): EditorView {
  view = new EditorView({
    parent: document.createElement("div"),
    state: gedcomState(doc, anchor),
  });
  return view;
}

describe("the GEDCOM preset's word characters", () => {
  it("takes @I1@ whole from its first at-sign to just after its last", () => {
    const line = "1 HUSB @I1@";
    const state = gedcomState(line);
    for (let pos = line.indexOf("@"); pos <= line.length; pos++) {
      expect(wordAt(state, pos), `at ${pos}`).toBe("@I1@");
    }
  });

  it("takes the xref that defines a record whole", () => {
    expect(wordAt(gedcomState("0 @F12@ FAM"), 4)).toBe("@F12@");
  });

  it("keeps an extension tag one word", () => {
    expect(wordAt(gedcomState("1 _UID 1234"), 4)).toBe("_UID");
  });

  it("joins an e-mail address at its at-sign but not at its dot", () => {
    expect(wordAt(gedcomState("1 EMAIL john@example.com"), 9)).toBe(
      "john@example",
    );
  });

  it("joins a calendar escape's closing at-sign but not its hash", () => {
    const line = "2 DATE @#DJULIAN@ 1 JAN 1700";
    expect(wordAt(gedcomState(line), line.indexOf("DJULIAN") + 1)).toBe(
      "DJULIAN@",
    );
  });

  it("takes escaped at-signs into the word", () => {
    expect(wordAt(gedcomState("1 NOTE @@I1@@"), 10)).toBe("@@I1@@");
  });

  it("leaves a document without the preset splitting at the at-sign", () => {
    expect(wordAt(EditorState.create({ doc: "1 HUSB @I1@" }), 9)).toBe("I1");
  });

  it("moves one word forward over the whole xref", () => {
    const editor = gedcomView("1 HUSB @I1@", 7);
    cursorGroupForward(editor);
    expect(editor.state.selection.main.head).toBe(11);
  });

  it("deletes one word backward as the whole xref", () => {
    const editor = gedcomView("1 HUSB @I1@", 11);
    deleteGroupBackward(editor);
    expect(editor.state.doc.toString()).toBe("1 HUSB ");
  });

  it("does not find I1 as a whole word inside @I1@", () => {
    const query = new SearchQuery({ search: "I1", wholeWord: true });
    const cursor = query.getCursor(gedcomState("1 HUSB @I1@"));
    expect(cursor.next().done).toBe(true);
  });

  it("selects the next occurrence of @I1@ whole", () => {
    const doc = "1 HUSB @I1@\n1 WIFE @I1@";
    const editor = gedcomView(doc, 9);
    selectNextOccurrence(editor);
    selectNextOccurrence(editor);
    expect(
      editor.state.selection.ranges.map((range) =>
        editor.state.sliceDoc(range.from, range.to),
      ),
    ).toEqual(["@I1@", "@I1@"]);
  });

  it("completes an at-sign already typed to one xref", () => {
    const doc = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "0 @F1@ FAM",
      "1 HUSB @I",
      "0 TRLR",
    ].join("\n");
    const pos = doc.indexOf("@I\n") + 2;
    let state = gedcomState(doc, pos);
    const result = completionSource(
      new EditorLanguageService(),
      new CompletionContext(state, pos, true),
    );
    const option = result?.options.find((item) => item.label === "@I1@");
    if (!result || typeof option?.apply !== "function") {
      throw new Error("no @I1@ completion");
    }
    const target = {
      get state() {
        return state;
      },
      dispatch(spec: TransactionSpec) {
        state = state.update(spec).state;
      },
    } as unknown as EditorView;
    option.apply(target, option, result.from, result.to ?? pos);
    expect(state.doc.line(6).text).toBe("1 HUSB @I1@");
  });
});

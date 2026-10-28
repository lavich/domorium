// @vitest-environment jsdom
import { EditorView } from "@codemirror/view";
import { HOVER_TIME_MS } from "@domorium/codemirror";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGedcomEditor } from "./createGedcomEditor";
import type { GedcomEditorHandle } from "./types";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Ada /Lovelace/",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 TRLR",
].join("\n");

let handle: GedcomEditorHandle | undefined;

afterEach(() => {
  handle?.destroy();
  handle = undefined;
  vi.useRealTimers();
});

const editor = (
  overrides: Partial<Parameters<typeof createGedcomEditor>[0]>,
) => {
  const parent = document.createElement("div");
  document.body.append(parent);
  handle = createGedcomEditor({
    parent,
    initialText: text,
    theme: "light",
    onChange: () => {},
    onStatusChange: () => {},
    onDiagnosticsChange: () => {},
    ...overrides,
  });
  return parent;
};

describe("createGedcomEditor", () => {
  // The editor's own plugins defer their work, but the host listener undid it:
  // it reparsed the whole document to refresh the problems panel on every
  // keystroke, which is the single most expensive thing on that path.
  it("does not refresh the problems panel on every keystroke", () => {
    vi.useFakeTimers();
    const onDiagnosticsChange = vi.fn();
    const parent = editor({ onDiagnosticsChange });
    onDiagnosticsChange.mockClear();

    const view = EditorView.findFromDOM(parent);
    expect(view).not.toBeNull();

    view!.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });
    expect(onDiagnosticsChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onDiagnosticsChange).toHaveBeenCalledOnce();
  });

  it("previews a record on hover, after the wait the tag tooltip uses", () => {
    vi.useFakeTimers();
    const parent = editor({});
    const view = EditorView.findFromDOM(parent)!;
    const pointer = text.indexOf("@I1@", text.indexOf("1 HUSB")) + 1;
    const posAtCoords = vi.spyOn(view, "posAtCoords").mockReturnValue(pointer);

    view.contentDOM.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 1 }),
    );
    expect(document.querySelector(".gedcom-record-preview")).toBeNull();

    vi.advanceTimersByTime(HOVER_TIME_MS);

    expect(document.querySelector(".gedcom-record-preview")?.textContent).toBe(
      "0 @I1@ INDI\n1 NAME Ada /Lovelace/",
    );
    posAtCoords.mockRestore();
  });

  // A copy of the whole document per keystroke costs in proportion to the
  // document — 37 ms per character at 15.6 MB — and the application does not
  // need it while the user types. It needs to know an edit happened, which
  // the event itself says.
  it("does not copy the document out on a keystroke", () => {
    const onChange = vi.fn();
    const parent = editor({ onChange });
    const view = EditorView.findFromDOM(parent)!;
    const sliceDoc = vi.spyOn(view.state.constructor.prototype, "sliceDoc");

    view.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });

    expect(onChange).toHaveBeenCalledOnce();
    expect(sliceDoc).not.toHaveBeenCalled();
    sliceDoc.mockRestore();
  });

  // Each theme was missing the identifier the other one had: the light left a
  // reference the colour of ordinary text, the dark a declaration.
  it.each(["light", "dark"] as const)(
    "tells a declared pointer, a reference and ordinary text apart in the %s theme",
    (theme) => {
      const parent = editor({ theme });
      const view = EditorView.findFromDOM(parent)!;
      const pointers = [
        ...parent.querySelectorAll("span.gedcom-token-variable"),
      ];
      const declared = "gedcom-token-declaration";
      const colourOf = (node: Element | null) =>
        node === null ? null : getComputedStyle(node).color;

      const text = colourOf(view.contentDOM);
      const declaration = colourOf(
        pointers.find((span) => span.classList.contains(declared)) ?? null,
      );
      const reference = colourOf(
        pointers.find((span) => !span.classList.contains(declared)) ?? null,
      );

      expect(declaration).not.toBeNull();
      expect(reference).not.toBeNull();
      expect(new Set([text, declaration, reference]).size).toBe(3);
    },
  );

  // Both themes think an underline says enough about a `link`, which left a
  // path the colour of the payload it sits in, or of a comment in the dark.
  it.each(["light", "dark"] as const)(
    "colours the path of a file apart from a payload and a web address in the %s theme",
    (theme) => {
      const parent = editor({
        theme,
        initialText: [
          "0 HEAD",
          "1 GEDC",
          "2 VERS 7.0",
          "0 @O1@ OBJE",
          "1 FILE media/portrait.png",
          "0 @R1@ REPO",
          "1 WWW https://example.org/",
          "0 TRLR",
        ].join("\n"),
      });
      // A link decorates the payload it names, so the coloured span is the
      // inner one — the one with nothing inside it.
      const painted = (content: string) =>
        [...parent.querySelectorAll("span")]
          .filter(
            (span) => span.textContent === content && !span.firstElementChild,
          )
          .map((span) => getComputedStyle(span).color);

      const [path] = painted("media/portrait.png");
      const [address] = painted("https://example.org/");
      const [payload] = painted("7.0");
      const [level] = painted("0");

      expect([path, address, payload, level].filter(Boolean)).toHaveLength(4);
      expect(new Set([path, address, payload, level]).size).toBe(4);
    },
  );

  // Download reads the text when it needs it, which is the reason the app can
  // stop being handed a copy on every keystroke.
  // Opened from the rail, the button holds the focus and the document still has
  // the caret, so a search that does not take it turns the next keystroke into
  // an edit to the file.
  it("puts the caret in the search field when search is opened", async () => {
    const parent = editor({});

    handle?.toggleSearch();

    await vi.waitFor(() => {
      const field = parent.querySelector("[main-field]");
      expect(field).not.toBeNull();
      expect(document.activeElement).toBe(field);
    });
  });

  it("closes the panel when the same control is pressed again", async () => {
    const parent = editor({});

    handle?.toggleSearch();
    await vi.waitFor(() =>
      expect(parent.querySelector(".cm-search")).not.toBeNull(),
    );
    handle?.toggleSearch();

    expect(parent.querySelector(".cm-search")).toBeNull();
  });

  it("offers no case, regexp or whole-word control", async () => {
    const parent = editor({});

    handle?.toggleSearch();

    await vi.waitFor(() =>
      expect(parent.querySelector("[main-field]")).not.toBeNull(),
    );
    expect(parent.querySelectorAll("input[type=checkbox]")).toHaveLength(0);
  });

  it("names every control it draws, for a pointer and for a reader", async () => {
    const parent = editor({});

    handle?.toggleSearch();

    await vi.waitFor(() =>
      expect(parent.querySelector("[main-field]")).not.toBeNull(),
    );
    const named = [...parent.querySelectorAll(".cm-search button")].map(
      (button) => button.getAttribute("aria-label"),
    );
    expect(named).toEqual([
      "Previous match",
      "Next match",
      "Select every match",
      "Replace this match",
      "Replace every match",
      "Close the search",
    ]);
  });

  it("hands out the current text on request", () => {
    const parent = editor({});
    const view = EditorView.findFromDOM(parent)!;

    view.dispatch({ changes: { from: 0, insert: "0 NOTE typed\n" } });

    expect(handle!.getText()).toBe("0 NOTE typed\n" + text);
  });
});

describe("following a link", () => {
  const follow = (header: string[], file: string) => {
    const onFollowLink = vi.fn();
    const lines = [...header, "0 @O1@ OBJE", `1 FILE ${file}`, "0 TRLR"];
    const parent = document.createElement("div");
    document.body.append(parent);
    handle = createGedcomEditor({
      parent,
      initialText: lines.join("\n"),
      theme: "light",
      onChange: () => {},
      onStatusChange: () => {},
      onDiagnosticsChange: () => {},
      onFollowLink,
    });
    const view = EditorView.findFromDOM(parent)!;
    // jsdom lays nothing out, so the click lands where the payload is.
    vi.spyOn(view, "posAtCoords").mockReturnValue(
      view.state.doc.line(lines.length - 1).to - 1,
    );
    view.contentDOM.dispatchEvent(
      new MouseEvent("click", { bubbles: true, ctrlKey: true, button: 0 }),
    );
    return onFollowLink;
  };

  it("passes the document's own dialect, without which every file link would be unreachable", () => {
    expect(
      follow(["0 HEAD", "1 GEDC", "2 VERS 7.0"], "a%20b.jpg"),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ targetText: "a%20b.jpg" }),
      "7.0",
    );
    handle?.destroy();
    expect(
      follow(
        ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "3 FORM LINEAGE-LINKED"],
        "a.jpg",
      ),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ targetText: "a.jpg" }),
      "5.5.1",
    );
  });
});

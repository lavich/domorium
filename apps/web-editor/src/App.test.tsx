// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { LINKS } from "./constants/links";
import type { GedcomEditorHandle } from "./editor/types";

vi.mock("./editor/GedcomEditor", () => ({
  GedcomEditor: forwardRef<
    GedcomEditorHandle,
    {
      initialText: string;
      onChange(): void;
      onDiagnosticsChange(diagnostics: []): void;
      onFollowLink(link: {
        kind: string;
        targetText: string;
        range: unknown;
      }): void;
    }
  >(function MockGedcomEditor(
    { initialText, onChange, onDiagnosticsChange, onFollowLink },
    ref,
  ) {
    // The real editor owns the document and hands it over on request, so the
    // mock does too — the change event carries nothing.
    const area = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => ({
      getText: () => area.current?.value ?? initialText,
      destroy: vi.fn(),
      focusDiagnostic: vi.fn(),
      setTheme: vi.fn(),
      openSearch: vi.fn(),
    }));
    return (
      <>
        <textarea
          ref={area}
          aria-label="GEDCOM editor"
          defaultValue={initialText}
          onChange={() => {
            onChange();
            onDiagnosticsChange([]);
          }}
        />
        {/* The real editor calls this when a reader follows a link. */}
        <button
          type="button"
          onClick={() =>
            onFollowLink({
              kind: "file-relative",
              targetText: "media/portrait.jpg",
              range: null,
            })
          }
        >
          follow the media link
        </button>
        <button
          type="button"
          onClick={() =>
            onFollowLink({
              kind: "http",
              targetText: "https://example.org/",
              range: null,
            })
          }
        >
          follow the web link
        </button>
      </>
    );
  }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("0 HEAD\n0 TRLR\n"),
    }),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders direct product links and a local-first editor", async () => {
    render(<App />);

    expect(
      (await screen.findByRole("link", { name: /VS Code/i })).getAttribute(
        "href",
      ),
    ).toBe(LINKS.vscode);
    expect(
      screen.getByRole("link", { name: /Obsidian/i }).getAttribute("href"),
    ).toBe(LINKS.obsidian);
    expect(
      screen.getByRole("link", { name: /JetBrains/i }).getAttribute("href"),
    ).toBe(LINKS.jetbrains);
    expect(
      screen.getByRole("link", { name: /GitHub/i }).getAttribute("href"),
    ).toBe(LINKS.github);
    expect(screen.getByLabelText("GEDCOM editor")).not.toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /open, validate and edit GEDCOM locally/i,
      }),
    ).not.toBeNull();
    expect(screen.getByRole("tab", { name: /example\.ged/i })).not.toBeNull();
    expect(
      screen.queryByRole("complementary", { name: /GEDCOM problems/i }),
    ).toBeNull();
  });

  // The application is no longer handed the text on every edit, so download
  // reads it from the editor. If that wiring is wrong the user silently saves
  // the document they started with.
  it("downloads what the editor holds now, not what it was opened with", async () => {
    const user = userEvent.setup();
    const written: string[] = [];
    vi.stubGlobal(
      "URL",
      Object.assign(Object.create(URL), {
        createObjectURL: (blob: Blob) => {
          written.push("pending");
          void blob.text().then((text) => {
            written[written.length - 1] = text;
          });
          return "blob:test";
        },
        revokeObjectURL: () => {},
      }),
    );
    render(<App />);

    const area = await screen.findByLabelText("GEDCOM editor");
    await user.clear(area);
    await user.type(area, "0 HEAD");
    await user.click(screen.getByRole("button", { name: "File" }));
    await user.click(
      await screen.findByRole("menuitem", { name: /download copy/i }),
    );

    await waitFor(() => expect(written[0]).toBe("0 HEAD"));
  });

  it("loads a GEDCOM file and protects modified work before reset", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");

    const input = screen.getByLabelText("Open GEDCOM file");
    await user.upload(input, new File(["0 HEAD\n0 TRLR"], "family.ged"));
    expect(
      await screen.findByRole("tab", { name: /family\.ged/i }),
    ).not.toBeNull();

    await user.clear(screen.getByLabelText("GEDCOM editor"));
    await user.type(screen.getByLabelText("GEDCOM editor"), "0 HEAD");
    expect(screen.getAllByLabelText("Unsaved changes").length).toBeGreaterThan(
      0,
    );

    await user.click(screen.getByRole("button", { name: "File" }));
    await user.click(
      await screen.findByRole("menuitem", { name: /reset to the example/i }),
    );
    expect(
      screen.getByRole("alertdialog", { name: /discard your changes/i }),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("tab", { name: /family\.ged/i })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "File" }));
    await user.click(
      await screen.findByRole("menuitem", { name: /reset to the example/i }),
    );
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /example\.ged/i })).not.toBeNull(),
    );
  });
});

/**
 * A stand-in for a granted directory, so the folder path can be walked in a test
 * at all: jsdom implements no picker and no file handles.
 */
function grantFolder(
  tree: Record<string, string>,
  permission: "granted" | "denied" = "granted",
) {
  const directory = (prefix: string): unknown => ({
    kind: "directory",
    name: prefix.split("/").filter(Boolean).at(-1) ?? "Webb Family",
    async *entries() {
      const seen = new Set<string>();
      for (const path of Object.keys(tree)) {
        if (!path.startsWith(prefix)) {
          continue;
        }
        const rest = path.slice(prefix.length);
        const cut = rest.indexOf("/");
        const name = cut < 0 ? rest : rest.slice(0, cut);
        if (!name || seen.has(name)) {
          continue;
        }
        seen.add(name);
        yield [name, { kind: cut < 0 ? "file" : "directory" }];
      }
    },
    getDirectoryHandle: (name: string) => {
      const nested = `${prefix}${name}/`;
      return Object.keys(tree).some((path) => path.startsWith(nested))
        ? Promise.resolve(directory(nested))
        : Promise.reject(new DOMException("no", "NotFoundError"));
    },
    getFileHandle: (name: string, init?: { create?: boolean }) => {
      const path = `${prefix}${name}`;
      if (!(path in tree) && !init?.create) {
        return Promise.reject(new DOMException("no", "NotFoundError"));
      }
      return Promise.resolve({
        getFile: () =>
          Promise.resolve(
            new File([tree[path] ?? ""], name, { type: "text/plain" }),
          ),
        createWritable: () =>
          Promise.resolve({
            write: (text: string) => {
              tree[path] = text;
              return Promise.resolve();
            },
            close: () => Promise.resolve(),
          }),
      });
    },
    queryPermission: () => Promise.resolve(permission),
    requestPermission: () => Promise.resolve(permission),
  });

  const root = directory("") as Record<string, unknown>;
  vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(root));

  /**
   * A file the reader picks in the save dialog. `inside` is what the platform
   * answers when asked whether that file sits under the granted folder — a handle
   * carries no path, so only the platform can say.
   */
  const chooseInSaveDialog = (name: string, inside: string[] | null) => {
    const handle = {
      kind: "file",
      name,
      createWritable: () =>
        Promise.resolve({
          write: (text: string) => {
            tree[inside ? inside.join("/") : `elsewhere/${name}`] = text;
            return Promise.resolve();
          },
          close: () => Promise.resolve(),
        }),
    };
    root.resolve = (asked: unknown) =>
      Promise.resolve(asked === handle ? inside : null);
    vi.stubGlobal("showSaveFilePicker", vi.fn().mockResolvedValue(handle));
  };

  const dismissSaveDialog = () => {
    root.resolve = () => Promise.resolve(null);
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn().mockRejectedValue(new DOMException("no", "AbortError")),
    );
  };

  return { chooseInSaveDialog, dismissSaveDialog };
}

/** The edit as the editor would report it: a change event carrying the new text. */
function typeIntoEditor(extra: string) {
  const area = screen.getByLabelText("GEDCOM editor") as HTMLTextAreaElement;
  fireEvent.change(area, { target: { value: `${area.value}${extra}` } });
}

describe("a granted folder", () => {
  // The explorer and the problems panel are shown on a wide window only, and the
  // suite above deliberately runs narrow. Answering `true` to every query is not
  // the same thing: a component asking `(pointer: coarse)` would then believe it
  // is on a touch screen and stop opening its menu on a click.
  beforeEach(() =>
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("min-width"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    ),
  );

  const folder = () =>
    grantFolder({
      "tree.ged": "0 HEAD\n0 TRLR\n",
      "notes.md": "# Anna\n",
      "media/portrait.jpg": "bytes",
    });

  it("lists what the folder holds and opens a note beside the document", async () => {
    folder();
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");

    await userEvent.click(screen.getByLabelText("Open a folder"));

    await waitFor(() => expect(screen.getByText("notes.md")).toBeTruthy());
    expect(screen.getByText("tree.ged")).toBeTruthy();
    expect(screen.getByText("media")).toBeTruthy();

    await userEvent.click(screen.getByText("notes.md"));

    await waitFor(() =>
      expect(screen.getByLabelText("Preview of notes.md")).toBeTruthy(),
    );
    expect(screen.getByRole("tab", { name: /notes\.md/ })).toBeTruthy();
  });

  it("opens the file a link in the document names", async () => {
    folder();
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await userEvent.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await userEvent.click(screen.getByText("tree.ged"));

    await userEvent.click(screen.getByText("follow the media link"));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /portrait\.jpg/ })).toBeTruthy(),
    );
  });

  // Without a folder there is nothing to resolve a path against.
  it("says a folder is needed to reach a file the document names", async () => {
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");

    await userEvent.click(screen.getByText("follow the media link"));

    await waitFor(() =>
      expect(
        screen.getByText("Open a folder to reach media/portrait.jpg"),
      ).toBeTruthy(),
    );
  });

  it("saves the edited document into the folder and clears the mark", async () => {
    const tree = { "tree.ged": "0 HEAD\n0 TRLR\n" };
    grantFolder(tree);
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await userEvent.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await userEvent.click(screen.getByText("tree.ged"));
    // The editor is remounted for the file just opened, so typing before that
    // lands goes into an editor about to be replaced.
    await screen.findByRole("tab", { name: /tree\.ged/ });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("GEDCOM editor") as HTMLTextAreaElement).value,
      ).toContain("0 TRLR"),
    );

    // `userEvent.type` has to click first, and its pointer checks find nothing
    // clickable in this layout under jsdom. The subject here is saving, so the
    // edit arrives as the change event the editor would have raised.
    typeIntoEditor("0 NOTE typed");
    await waitFor(() =>
      expect(screen.getByLabelText("Unsaved changes")).toBeTruthy(),
    );

    await userEvent.keyboard("{Meta>}s{/Meta}");

    await waitFor(() => expect(tree["tree.ged"]).toContain("0 NOTE typed"));
    await waitFor(() =>
      expect(screen.queryByLabelText("Unsaved changes")).toBeNull(),
    );
  });

  // The reader can be handed a folder to read and refuse to let it be written.
  it("says nothing was written where permission is refused, and keeps the mark", async () => {
    const tree = { "tree.ged": "0 HEAD\n0 TRLR\n" };
    grantFolder(tree, "denied");
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await userEvent.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await userEvent.click(screen.getByText("tree.ged"));
    await screen.findByRole("tab", { name: /tree\.ged/ });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("GEDCOM editor") as HTMLTextAreaElement).value,
      ).toContain("0 TRLR"),
    );
    typeIntoEditor("0 NOTE typed");
    await waitFor(() =>
      expect(screen.getByLabelText("Unsaved changes")).toBeTruthy(),
    );

    await userEvent.keyboard("{Meta>}s{/Meta}");

    await waitFor(() =>
      expect(screen.getByText(/open for reading only/)).toBeTruthy(),
    );
    expect(tree["tree.ged"]).toBe("0 HEAD\n0 TRLR\n");
    expect(screen.getByLabelText("Unsaved changes")).toBeTruthy();
  });

  it("saves as a name the reader chooses in the folder, and goes on against it", async () => {
    const user = userEvent.setup();
    const tree: Record<string, string> = { "tree.ged": "0 HEAD\n0 TRLR\n" };
    const { chooseInSaveDialog } = grantFolder(tree);
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await user.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await user.click(screen.getByText("tree.ged"));
    await screen.findByRole("tab", { name: /tree\.ged/ });
    typeIntoEditor("0 NOTE typed");

    chooseInSaveDialog("tree-cleaned.ged", ["tree-cleaned.ged"]);
    await user.keyboard("{Meta>}{Shift>}s{/Shift}{/Meta}");

    await waitFor(() =>
      expect(tree["tree-cleaned.ged"]).toContain("0 NOTE typed"),
    );
    expect(
      await screen.findByRole("tab", { name: /tree-cleaned\.ged/ }),
    ).toBeTruthy();
    // The file it was opened from is left as it was.
    expect(tree["tree.ged"]).toBe("0 HEAD\n0 TRLR\n");
  });

  it("says where a copy went when the reader chooses another folder", async () => {
    const user = userEvent.setup();
    const tree: Record<string, string> = { "tree.ged": "0 HEAD\n0 TRLR\n" };
    const { chooseInSaveDialog } = grantFolder(tree);
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await user.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await user.click(screen.getByText("tree.ged"));
    await screen.findByRole("tab", { name: /tree\.ged/ });
    typeIntoEditor("0 NOTE typed");

    chooseInSaveDialog("backup.ged", null);
    await user.keyboard("{Meta>}{Shift>}s{/Shift}{/Meta}");

    await waitFor(() => expect(screen.getByText(/still unsaved/)).toBeTruthy());
    expect(tree["elsewhere/backup.ged"]).toContain("0 NOTE typed");
    expect(screen.getByLabelText("Unsaved changes")).toBeTruthy();
  });

  it("writes nothing when the reader closes the save dialog", async () => {
    const user = userEvent.setup();
    const tree: Record<string, string> = { "tree.ged": "0 HEAD\n0 TRLR\n" };
    const { dismissSaveDialog } = grantFolder(tree);
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");
    await user.click(screen.getByLabelText("Open a folder"));
    await waitFor(() => expect(screen.getByText("tree.ged")).toBeTruthy());
    await user.click(screen.getByText("tree.ged"));
    await screen.findByRole("tab", { name: /tree\.ged/ });
    typeIntoEditor("0 NOTE typed");

    dismissSaveDialog();
    await user.keyboard("{Meta>}{Shift>}s{/Shift}{/Meta}");

    expect(Object.keys(tree)).toEqual(["tree.ged"]);
    expect(tree["tree.ged"]).toBe("0 HEAD\n0 TRLR\n");
  });

  it("sends a web address to the browser and opens no tab for it", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    render(<App />);
    await screen.findByLabelText("GEDCOM editor");

    await userEvent.click(screen.getByText("follow the web link"));

    expect(open).toHaveBeenCalledWith(
      "https://example.org/",
      "_blank",
      "noopener,noreferrer",
    );
    expect(screen.queryAllByRole("tab")).toHaveLength(1);
  });
});

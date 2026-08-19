## 1. The report on the file

- [x] 1.1 Declare `DocumentReport` in `apps/web-editor/src/editor/types.ts` as a
      union discriminated by `kind` — `gedcom` carrying `WebEditorStatus` and
      `WebDiagnostic[]`, `markdown` carrying its line count, `image` carrying
      format, dimensions and bytes. Give `OpenFile` a `report: DocumentReport | null`
      and the reducer a `{ type: "reported"; path; report }` action routed through
      `mapFile`. Ship with tests in `workspace.test.ts`: a report reaches its file,
      a report naming a file that is not open changes nothing, a report for one of
      two open files leaves the other's alone, `file-closed` forgets it, and
      reopening a closed file starts with none.

## 2. The pane

- [x] 2.1 Extract `DocumentPane.tsx` from `EditorWorkspace`: the tab strip, the
      surface, and the problems column beside the surface inside a horizontal
      `ResizablePanelGroup` with today's sizes. Render the group only where the
      active file is a GEDCOM file, the window is wide enough and the panel is
      open; otherwise render the surface alone. Ship with tests: with a GEDCOM tab
      active the `GEDCOM problems` region is present and lists that file's findings;
      activating a markdown or image tab removes it; a GEDCOM file with no report
      shows no findings rather than another file's.
- [x] 2.2 Leave `explorerOpen` and `problemsOpen` in `EditorWorkspace` and pass the
      active file's report down. Give `ActivityRail` a problem count that can be
      absent: no badge, `aria-disabled`, no toggle, and the button in its place.
      Ship with a test that the rail's count follows the active tab.

## 3. The surfaces report

- [x] 3.1 In `DocumentPane`, fold `onDiagnosticsChange` and `onStatusChange` from
      `GedcomEditor` into one `reported` dispatch carrying the active path. The
      editor's own props do not change — it reports what it knows, and the pane
      says which document it was about.
- [x] 3.2 Give `MarkdownPreview` and `ImagePreview` an `onReport` callback:
      markdown reports its kind; image reports format and bytes when the blob is
      read and dimensions from the loaded `img`. Report nothing where the image
      could not be read. Ship with tests in `FilePreview.test.tsx` for all three,
      and confirm the object URL is still released — the report must not outlive
      the preview that made it.

## 4. The status bar

- [x] 4.1 `StatusBar` takes a `DocumentReport | null` and switches on its kind:
      GEDCOM as it reads today; markdown as `Markdown · read-only`; image as
      format, dimensions and size; nothing open as the privacy line alone. Ship
      with a test per kind, including an image whose dimensions have not arrived.

## 5. The state that outlived its subject

- [x] 5.1 Remove `diagnostics` and `status` from `App.tsx` along with the props
      that carried them, and dispatch `reported` in their place. Confirm nothing
      outside the reducer holds either. `App.test.tsx` must pass unedited except
      where it asserts on props that no longer exist — that is the evidence the
      demo document still reports its version and its findings.

## 6. Documentation

- [x] 6.1 `apps/web-editor/README.md`, where it describes the problems panel: say
      that the panel and the status bar describe the file in front and that a note
      or a photograph states its own facts. Read the section afterwards and confirm
      it is true of the code.

## 7. Gate

- [x] 7.1 `npm run check`. **Ran in full, JDK present: 831 tests over 69 files,
      `check:jetbrains` built and tested. The two lint warnings it reports are in
      `packages/validator/scripts` and predate this change.**
- [x] 7.2 `npm run dev -w apps/web-editor`: **the example document reports through
      the reducer and reads `GEDCOM 7.0 · supported · Ln 1, Col 1 · 0 issues` with
      the panel beside it, confirming the pane's split and the report's route.
      Switching to a note or a photograph was not exercised in the browser: it
      needs a granted folder, and the picker answers only a real gesture. That
      path is covered by the pane, bar and reducer tests.**

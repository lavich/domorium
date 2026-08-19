## Why

The web editor holds several files at once — a granted folder brings photographs
and notes alongside the GEDCOM — but the version indicator and the problems panel
are fixtures of the window rather than parts of the file they describe.

Both live outside the editor pane in
[`EditorWorkspace.tsx`](../../../apps/web-editor/src/components/EditorWorkspace.tsx):
the pane holds the tabs and the surface, the problems panel is its sibling, and
the status bar sits below both. Neither knows which tab is in front. The values
they read are held one level higher again, in `App.tsx`, where
`onDiagnosticsChange` and `onStatusChange` are wired to the GEDCOM editor alone.

`surface()` renders `ImagePreview` or `MarkdownPreview` for a tab that is not a
GEDCOM file, and a preview sends no status and no diagnostics. Nothing clears what
the GEDCOM left behind, so with a picture in front of the reader the status bar
still reads `GEDCOM 5.5.1 · supported · 12 442 issues`, the problems panel still
stands open beside the picture listing another file's findings, and the activity
rail still carries the count as a badge.

The version and the findings are facts about one document. Held a level above it,
they outlive it.

## What Changes

- **The pane owns the split.** A new `DocumentPane` holds the tab strip, the
  surface and the problems column beside it. `EditorWorkspace` keeps what belongs
  to the window: the activity rail, the explorer and the status bar. The problems
  column exists only where the tab in front is a GEDCOM file, so a picture in front
  means no panel in the tree at all — not an empty one claiming the file is clean.
- **State per document.** `OpenFile` gains a `report`, and the workspace reducer
  gains a `reported` action carrying the path it describes. Switching tabs switches
  the report and closing a file forgets it, both by construction. A report arriving
  from a document already left is dropped rather than applied to its successor.
  `App.tsx` loses its `diagnostics` and `status` state and the two props that
  carried them down.
- **Every surface reports its own facts.** The GEDCOM editor keeps the two
  callbacks it has; a markdown preview reports that it is a note; an image preview
  reports its format, its size and — once the browser has decoded the bytes — the
  dimensions nothing measures today.
- **The status bar reads the active file's report and nothing else.** A GEDCOM tab
  reads as it does today; a note reads `Markdown · read-only`; a photograph reads
  `JPEG · 1 024 × 768 · 210 KB`; with nothing open, only the line that is true of
  the window: `read locally — nothing is uploaded`.
- **The rail states what it can count.** On a tab that is not a GEDCOM file the
  problems button loses its badge and is disabled, rather than disappearing and
  shifting the buttons above it. Whether the panel is open stays a preference of
  the window, so returning to a GEDCOM tab restores it where the reader left it.

Deliberately not answered here: `useMediaQuery` hand-rolled at the foot of
`EditorWorkspace`, the size of `App.tsx`, and the three disclosure idioms. Those
are #247 and #246, and this change is not the place to settle them.

## Capabilities

### New Capabilities

- `web-editor/document-scope`: the version, the findings and the position belong to
  the document they describe — shown for the file in front, forgotten with it.

### Modified Capabilities

None. `web-editor/file-preview` describes what a preview shows inside its own
frame, which this change does not touch; what the window says about the file in
front is the new capability's subject.

## Impact

- **Layers:** `apps/web-editor` only. No package below the adapter layer is
  touched, no new dependency is added, and the dependency direction still points
  down — the app consumes `@domorium/codemirror` and `@domorium/language-service`
  exactly as it did.
- **Editor hosts:** none. VS Code, JetBrains and Obsidian see no change; the
  browser editor is the only host with tabs.
- **Releases:** none. `apps/web-editor` is private and deploys from `main`; there
  is no version to bump, no tag and no changelog entry.
- **Documentation:** `apps/web-editor/README.md` where it describes the problems
  panel. `docs/architecture.md` is unaffected — no layer moves.

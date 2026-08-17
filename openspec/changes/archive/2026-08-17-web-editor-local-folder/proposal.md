## Why

The web editor opens one file at a time through a file input and gives it back
only as a download. A genealogy document is never alone: it names media beside
it, and a researcher keeps notes next to it. Today a `FILE` link in the document
resolves to nothing the editor can show, and saving means finding the downloaded
copy and putting it back over the original by hand — the step where work is lost.

Chromium can grant a page a folder and let it write into it, which is enough to
make the editor work on the material as it actually sits on disk.

## What Changes

- **A folder can be opened.** The editor asks for a directory, and the explorer
  lists what is in it — every file, not only `.ged`, with directories that expand.
- **A file in the tree opens in a tab.** A GEDCOM file opens in the editor; a
  markdown file and an image open as a preview, read-only.
- **A link inside a GEDCOM document opens the file it names.** `1 FILE
media/portrait.jpg` resolves against the folder and opens that image; the same
  for a path to a note. A link naming a file the folder does not hold says so
  instead of doing nothing.
- **The document can be saved to its own file.** Saving is explicit — a command
  and a shortcut — and writes the open GEDCOM document back where it came from.
  "Save as…" writes a new file in the folder.
- **Where a browser cannot grant a folder, the editor says so** and keeps what it
  has today: open a single file, download a copy. Safari and Firefox implement
  neither `showDirectoryPicker` nor writable file handles.

Not part of this change, though the mockups show them: remembering the folder
between visits, and noticing that a file changed on disk while it was open.

## Capabilities

### New Capabilities

The first specs in this repository. They are scoped by app, so a later change in
another host reads `obsidian/…` rather than colliding here.

- `web-editor/local-folder`: granting a folder, listing its contents, and opening
  a file from it — including the browsers where this is unavailable.
- `web-editor/file-preview`: showing a markdown file and an image, and following a
  link out of a GEDCOM document to the file it names.
- `web-editor/save-to-disk`: writing the open document back to its file, saving it
  under a new name, and the download that remains where writing is impossible.

### Modified Capabilities

None — no spec exists yet.

## Impact

**Layers.** `apps/web-editor` only, which is the top of the graph: it depends on
`@domorium/codemirror` and nothing depends on it. The direction still points down
and no package below the app changes. Following a `FILE` link needs no package
change either: `openDocumentLink` is already a callback the app supplies, and the
link it receives carries the kind and the path.

**Editor hosts.** The web editor alone. VS Code, the JetBrains IDEs and Obsidian
are untouched — each already reaches the file system through its own host, and
none of them shares this code.

**Code.** The document session becomes a workspace of several open files rather
than one document, which touches `App.tsx`, `documentSession.ts`, `fileActions.ts`
and the explorer, tabs and status bar components. New modules hold the folder: the
handle, the tree it produces, and reading and writing through it.

**Browser API.** File System Access — `showDirectoryPicker`,
`FileSystemDirectoryHandle`, `createWritable`, and the permission query that
precedes a write. Feature detection decides which of the two paths the editor
offers, and the tests need a fake for the handle: jsdom implements none of it.

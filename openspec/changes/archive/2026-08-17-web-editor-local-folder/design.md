## Context

The app holds one document at a time: a reducer with `initialText`, a file name and
a modified flag, filled by a file input and emptied by a download. See
proposal.md — Why for the motivation, and the three specs for the behaviour.

Two constraints shape everything below. The File System Access API exists in
Chromium and nowhere else, so every path through the app has to work without it.
And jsdom implements none of it, so any module that calls it directly is a module
the test suite cannot reach.

## Goals / Non-Goals

**Goals:**

- One seam for reaching files, so the folder and the single file are two
  implementations of the same thing rather than branches through the UI.
- A workspace of several open files with identity per tab, because the specs turn
  on identity: the same file chosen twice, unsaved edits on close.
- Path safety enforced where the root is known.

**Non-Goals:**

- Remembering a folder between visits, and noticing a file changed on disk. Both
  are named as out of scope in the proposal; the design leaves room for them by
  keeping the handle inside the gateway rather than in component state.
- Editing anything but GEDCOM. Preview state carries no dirty flag at all, so
  there is nothing to save and nothing to lose.
- Changing the folder's shape: nothing is created, renamed, moved or deleted. The
  only file the editor writes is the document it has open, and "save as" is the one
  file it brings into being.
- A second storage backend. Where the browser cannot grant a folder the editor
  degrades in what it offers, not in where it keeps things.

## Decisions

### A file gateway, with two implementations

The app depends on one narrow interface — list a directory, read a file as text,
read it as bytes, write text, create a file — and never on `window.showDirectoryPicker`.
Two implementations satisfy it: one backed by a granted directory handle, one
backed by a single chosen file plus a download.

_Why:_ it puts every call into the browser API in one module, makes the
unsupported-browser path a case of the same interface instead of a condition
sprinkled through components, and lets the tests use an in-memory tree.
_Alternative rejected:_ calling the API from components. Nothing about it is
reachable from jsdom, and the capability check would spread.

### The session becomes a workspace

`documentSession` grows from one document to a list of open files, each with its
own path, kind, and — for GEDCOM only — text and modified flag. The reducer shape
stays.

_Why:_ "the same file chosen twice brings the tab forward" and "closing a tab with
edits asks first" are statements about identity, which a single-document state
cannot express. _Alternative rejected:_ keeping one document and holding previews
beside it — the second tab kind would need its own bookkeeping anyway, and two
parallel notions of "what is open" is how a tab bar starts lying.

### Link resolution reuses what the language service already decided

The service classifies a payload as `http`, `file-relative` or `file-absolute` and
hands over the text; the LSP server already normalises Windows separators for its
own client. The app does not re-read payloads: it takes the kind and the path, and
adds only what it alone knows — the root the path must stay inside.

_Why:_ deciding what a `FILE` payload means is format knowledge and belongs in the
shared package; deciding which folder is allowed is host plumbing and belongs in
the host. _Alternative rejected:_ resolving inside the package — it would have to
be told the host's root, which pushes host concerns below the adapter layer.

### Writing through a writable stream, not a temp file of our own

`createWritable` writes to a swap file and commits when closed, which is exactly
the "previous content or new content, never a truncated mixture" the spec asks
for.

_Why:_ the platform already does the atomic dance; ours would be worse and would
leave litter on failure. _Trade-off:_ it requires a permission check before the
first write, and briefly leaves a swap file in the reader's folder.

### Capability detection happens once, at the edge

Whether folders are available is read once at startup and kept in state. Components
ask the state.

_Why:_ components stay pure and testable, and the "told only once" scenario has a
place to live.

### Spec paths are scoped by app

These are the repository's first specs, and they sit at `specs/web-editor/<capability>`.
A later change in another host reads `specs/obsidian/…` instead of colliding on a
bare `local-folder`.

This is a convention, not a decision expensive to reverse: three directories can be
moved while nothing references them, so it needs no ADR. If the repository later
grows specs shared by all hosts, the shared ones can sit at the top level without
disturbing these.

## Risks / Trade-offs

**The gateway fake drifts from the real API** → the folder-backed adapter stays
thin — five methods, no logic — so drift shows up as a compile error rather than a
passing test over a wrong world. The web editor has no browser test suite; this
change adds no way to catch a real-API regression automatically, and that is a
known gap rather than a solved problem.

**A file that is not UTF-8** → `File.text()` decodes as UTF-8, and a 5.5.1 file
declaring ANSEL would be mangled on read and the mangling written back on save.
The editor refuses to write a document whose declared character set it did not
decode, which turns silent corruption into a message. Reading such files properly
is a separate change, in the layer that knows `HEAD.CHAR`.

**A folder with thousands of entries** → directories are read when expanded, never
walked whole, so the cost follows what the reader opens.

**Large media** → a preview uses an object URL from the file handle rather than
reading the bytes into a string, so a 40 MB photograph costs a browser decode and
not a copy in the heap.

**The reader expects the folder to be remembered** → it will not be, until a later
change stores the handle. The empty state says so, rather than letting the reader
discover it by returning tomorrow.

**Permission is refused between reads** → the gateway surfaces the browser's error
and the workspace keeps the tab; nothing in the app assumes a handle stays usable.

**A previewed note carrying markup** → the preview renders no script and no raw
HTML, and names and paths are shown as text. The material comes from someone
else's export, so it is treated as content and never as something to run.

## Migration Plan

Nothing to migrate: the editor keeps no stored state, and this change adds none.

1. Ship the folder beside what the editor does today. With no folder granted, and
   in a browser that cannot grant one, every existing path behaves as before.
2. Roll back by removing the folder gateway and the explorer tree; the single-file
   path is untouched by this change and remains the fallback either way.

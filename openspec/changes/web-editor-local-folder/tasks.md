## 1. The seam for reaching files

- [x] 1.1 Define the file gateway interface in `apps/web-editor/src/workspace/` —
      list a directory, read text, read bytes, write text, create a file — with an
      in-memory implementation for tests and its own tests over that fake.
- [x] 1.2 Implement the folder-backed gateway over `FileSystemDirectoryHandle`,
      keeping it to those calls and no logic, with tests driving it through a stub
      handle.
- [x] 1.3 Implement the single-file gateway — the file input for reading, the
      download for writing — reusing what `fileActions.ts` already does, with tests
      showing both gateways satisfy the same interface.
- [x] 1.4 Detect folder support once at startup and expose it as state, with a test
      for each answer.

## 2. A workspace of open files

- [x] 2.1 Grow `documentSession` into a workspace: a list of open files, each with a
      path, a kind, and text and a modified flag for GEDCOM only. Tests cover
      opening, bringing an already-open file forward, and closing.
- [x] 2.2 Route a chosen file to its kind — GEDCOM to the editor, markdown and image
      to a preview, anything else refused with a message — with tests per kind
      including the refusal.
- [x] 2.3 Wire the tab bar and status bar to the workspace, with tests that a
      preview tab is never marked modified.
- [x] 2.4 Render markdown without executing a script or raw HTML it carries, and
      release an image's URL when its preview is replaced or closed, with tests for
      an embedded script and for a sequence of images.

## 3. The explorer

- [x] 3.1 Replace the explorer's single-name placeholder with a tree over the
      gateway: every entry regardless of extension, directories expanded on demand,
      names beginning with a dot omitted. Tests use the in-memory gateway.
- [x] 3.2 Show for each entry whether the editor can open it, and give the folder
      grant, its refusal and the unsupported-browser line their places in the panel,
      with tests for each state. A name is shown as text: a test covers an entry
      named with markup.
- [x] 3.3 Ask for a folder only from a reader's action, with a test that loading the
      page requests nothing.

## 4. Following a link out of a document

- [ ] 4.1 Resolve a `file-relative` link against the directory of the document that
      names it and open the file it names, taking the kind from the language
      service rather than re-reading the payload. Tests cover a hit and a miss.
- [ ] 4.2 Refuse a path that leaves the granted folder and an absolute path, with
      tests naming `../../keys/id_rsa` and `/etc/passwd`.
- [ ] 4.3 Keep a web address opening in a browser tab, with a test that no editor tab
      is added.

## 5. Saving

- [ ] 5.1 Save the open GEDCOM document through the gateway on an explicit command
      and the platform shortcut, clearing the modified flag; tests cover an edited
      document, an unchanged one, and that time passing writes nothing.
- [ ] 5.2 Ask for write permission before the first write and carry a refusal or a
      failure back to the reader with the tab still modified, with tests for both.
- [ ] 5.3 Add "save as" into the granted folder, continuing the session against the
      new file and confirming before replacing an existing name, with tests for
      both paths.
- [ ] 5.4 Refuse to write a document whose declared character set was not the one it
      was decoded with, with tests for a declared `ANSEL` and for `UTF-8`.
- [ ] 5.5 Fall back to downloading a copy where no folder is granted, with a test
      that says the original was not touched.
- [ ] 5.6 Offer saving only for a GEDCOM document, and writing to a file only where
      it came from a granted folder, with a test that a preview tab offers neither.

## 6. Not losing unsaved work

- [ ] 6.1 Ask before closing a tab with unsaved edits and before opening another
      folder, with tests for both.
- [ ] 6.2 Raise the browser's own warning when the page is left with unsaved edits,
      with a test over the handler rather than the browser.

## 7. Documentation

- [ ] 7.1 Update `apps/web-editor/README.md`: what the editor does with a folder,
      which browsers can grant one, that saving is explicit, and that the folder is
      not remembered between visits.
- [ ] 7.2 Add the app's file access to `docs/architecture.md` where it describes
      `apps/web-editor` — one line, since no layer moves and no package below the app
      changes.

## 8. Checks

- [ ] 8.1 No lower-layer package changed in this work, so nothing needs rebuilding;
      confirm that by running the app's tests against the published packages already
      installed.
- [ ] 8.2 Walk the folder path once by hand in a Chromium browser — grant, expand,
      open each kind, follow a link, save, refuse permission — since no automated test
      reaches the real API.
- [ ] 8.3 Run `npm run check` and record whether `check:jetbrains` ran or was skipped
      for lack of a JDK.

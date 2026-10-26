## Context

See proposal.md for why. `createServer` (`packages/language-server/src/createServer.ts:53`) keeps a `TextDocuments` of open documents and a `GedcomLanguageService` per URI in `cache`, which is filled on change and never emptied (`createServer.ts:333-338`). Its rename handler (`createServer.ts:146-176`) shows the shape of an answer: `documentChanges` with a versioned text document. `GedcomLanguageService.moveFileLinks(from, to)` takes plain paths relative to the document and answers `WorkspaceEditResult | EditRefusal`.

`vscode-languageclient` 11 sends `workspace/willRenameFiles` from its shared base client, so the browser client too, when the server registers `workspace.fileOperations.willRename`; it checks the filter with `fs.stat`, so folders never reach the server. VS Code fires the will- and did-rename events only for renames made in the editor or by `applyEdit`, not for changes on disk; `onDidRenameFiles` fires only once a rename has succeeded. LSP4IJ 0.20.1 sends the request from a VFS listener and waits 500 ms for the answer before going on without it.

## Goals / Non-Goals

**Goals:**

- A file renamed or moved in the editor is followed by every open GEDCOM document that names it relatively, in one edit applied with the rename.
- In VS Code, the reader is told about an open document that could not follow and about closed GEDCOM files that may still name the file, and is told nothing when neither applies.

**Non-Goals**, each a known gap filed as its own issue:

- Renaming a folder. The client never sends it, so neither the rewrite nor the closed-file warning happens.
- Renaming outside the editor: git, a terminal, another program.
- Absolute payloads (`C:\…`, `file:///…`). `moveFileLinks` rewrites relative links only; an absolute one is neither rewritten nor reported.
- Rewriting closed documents, which needs #157; and the closed-file warning in JetBrains.
- A JetBrains answer later than LSP4IJ's 500 ms, which it drops without a word.
- A workspace whose only GEDCOM files are named in mixed case (`.Ged`): the extension neither activates on it nor finds them.
- Moving a GEDCOM document by itself. Its own relative payloads then point elsewhere; that is a different edit.

## Decisions

### The standard request, not a custom one

`workspace/willRenameFiles` is answered before the file moves, and the host applies the edit as part of the rename. Any LSP client that implements file operations gets it with no client code. A custom request after `onDidRenameFiles` would reach VS Code alone and apply as a second step.

### Registration

`fileOperations.willRename.filters: [{ pattern: { glob: "**/*", matches: "file" } }]`. A `FILE` payload may name any kind of file, so the filter cannot narrow by extension. The cost of a rename that concerns no GEDCOM document is a scan of the open ones, each of which already has its links parsed.

### Which documents

The open documents are `documents.all()`, not `cache`, which keeps closed ones. A document's service is taken from `cache` only when its version equals the document's; otherwise one is built from the document's text. An edit computed from stale text would be applied to text it does not describe: the VS Code client drops the version in `documentChanges`.

### Paths

For a document `D` and a renamed file `F`, `from` is `F`'s old URI relative to `D`'s folder now, and `to` is `F`'s new URI relative to the folder `D` will be in: `D`'s own new URI if the same event renames `D`, else its current one. When `from` equals `to` the pair is skipped before `moveFileLinks` is asked, since its same-place answer is an edit per payload rather than none: moving a tree together with its photograph leaves the payload as it is and the document out of the answer. The edit is addressed to `D`'s current URI, which is what the host holds when it applies it.

Relative paths are computed on parsed URLs, which the browser worker has: same scheme and authority, or no path; path segments split on `/` and then percent-decoded; a Windows drive letter compared without case, after decoding `%3A`; `..` where `F` is outside the folder. A document on a scheme with no folders (`untitled:`) gives no path. GEDCOM 7 cannot write a `..` path, and `moveFileLinks` refuses it; 5.5.1 can, and does.

### The answer

The edit holds one versioned entry per document with changes. When no document has any, the answer is `null`, so a host has nothing to apply.

### Refusals

A refused document is left out of the edit. Once per request, the server sends `window/showMessage` of type Warning naming each such document and the renamed file by their decoded paths relative to the workspace folder that holds them, from `InitializeParams.workspaceFolders`, or in full where none does. One document that cannot follow does not stop the others.

### Closed files

The client listens to `workspace.onDidRenameFiles`, which fires once a rename has succeeded, so a cancelled or failed rename warns about nothing and the rename is never delayed. It drops renamed folders by `workspace.fs.stat` on the new URI. A scan still running when another rename arrives is restarted with the names of both, so the earlier one is not lost. One scan ends in at most one warning.

The scan lists `**/*.{ged,GED,gedcom,GEDCOM}` with `workspace.findFiles`, drops the documents in `workspace.textDocuments` with language `gedcom` — the set the server holds — and reads the rest with `workspace.fs.readFile`, one at a time. Each is decoded as UTF-16 when it starts with a UTF-16 byte-order mark, else as UTF-8; that is decoding text, not reading GEDCOM, and stays in the app. The extension activates on `.gedcom` as well as `.ged` workspaces.

`mentionsFile(text, path)` lives in `@domorium/language-service`, beside `decodeFileTarget`; `language-service/file-mention` is its contract. A line mentions the file when, trimmed and with its percent-escapes decoded leniently, it ends in the file's last path segment and that segment starts the line or follows a space, `/` or `\`. Decoding the line rather than encoding the name catches every spelling GEDCOM 7 allows, mixed escapes and lower-case hex included. It is a search, not a parse: it may count a line of a note that ends in the name, which errs towards telling. Known misses: a payload split by `CONC`, a file in ANSEL or another 8-bit character set where the name is not ASCII, and names that differ only in Unicode normalization.

## Risks / Trade-offs

- [Reading every closed GEDCOM file after each rename is slow in a large or remote workspace, and each file is held whole while it is searched.] → It runs after the rename, one file at a time, and never delays one. No size cap: a cap would be a silent miss.
- [Two warnings for one rename: the server's refusal and the client's closed files.] → Each appears only when it has something to say; one would need a custom notification, which the standard request was chosen to avoid.
- [The 500 ms LSP4IJ waits may not suffice for a very large open document.] → Links are already parsed per open document; recorded as a known gap.

## Migration Plan

Ships with the next VS Code and JetBrains releases. No data migrates.

## Implementation

- The server drops a document from `cache` when it closes, instead of checking a version the service does not expose; `cache` then holds exactly the open documents at their latest text, and the review's stale-edit failure cannot arise.
- The path arithmetic is `pathFromDocument` in `packages/language-server`. The warning names paths relative to the first workspace folder that contains them, else the URI.
- `apps/jetbrains/README.md` is unchanged until 3.1 shows the rename followed in a JetBrains IDE; the bytecode says it should.
- Known gaps filed: #454 folder renames, #455 renames outside the editor, #456 absolute payloads, #457 closed files in JetBrains, #458 the LSP4IJ 500 ms deadline, #459 mixed-case extensions.
- After code review: a document is refused as a whole, so a rename of several files never leaves it half rewritten; a document whose file moves somewhere no relative path reaches (another drive or scheme) is reported as refused rather than skipped; a renamed file whose name holds an escaped `/` or `\` gives no path, since a payload would split on it.
- The server reads each open document's links once per request and asks `moveFileLinks` only for a file whose name one of them ends in, so a large multi-file rename does not walk a large tree once per file.
- The closed-file scan skips a file it cannot read, excludes `node_modules`, names the files it found (relative to the workspace, three by name then a count), and a failed scan does not carry its names into the next one. `mentionsFile` also matches the raw line, for a 5.5.1 name that holds a `%`, and decodes escape by escape.
- The README claim that one undo reverts both was dropped until 3.3 checks it.

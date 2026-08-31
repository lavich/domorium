## 1. Classify what the format says a file is

- [x] 1.1 Add `src/libs/media/mediaKind.ts` exporting the classification of a declared format into `image | audio | video | document | unknown`, reading a GEDCOM 7 media type and a GEDCOM 5.5.1 closed-list format, and falling back to the file's extension. Verify with `mediaKind.test.ts` written first: `image/jpeg` → image, `audio/mpeg` → audio, `wav` → audio, `jpg` → image, `ole` → unknown, no format and `.png` → image, no format and `.xyz` → unknown
- [x] 1.2 Verify the 5.5.1 arm names the same seven formats the schema permits, by reading them from `g551validation.json` in the test rather than repeating the list, so a schema change fails the test

## 2. Answer for a file payload

- [x] 2.1 Add `src/libs/media/mediaAt.ts` with the query answering for a position on a file payload inside a multimedia record: the file as written, its link kind, the range of the payload, the classification, and the title beneath the file. Verify with `mediaAt.test.ts` written first, driven through a real `GedcomLanguageService` built from GEDCOM text rather than hand-built nodes
- [x] 2.2 Answer for the inline form GEDCOM 5.5.1 permits, where the file sits beneath a link that carries no pointer. Verify with a 5.5.1 document in the same test file
- [x] 2.3 Answer with nothing for a position on any line naming neither a file nor a multimedia link. Verify with a header line, a name line, and a pointer to a person

## 3. Answer for a multimedia link

- [x] 3.1 Resolve the pointer through `ReferenceIndex` and find the record's node from its declaration range, then take the first file in document order. Verify that a link answers with the file of the record it names
- [x] 3.2 Read the rectangle and the title from the link's own subordinate structures. Verify that two links naming one record answer with two different rectangles and the same file, which is the case #189 exists for
- [x] 3.3 Answer with nothing when the pointer resolves to no record, to a record that is not multimedia, or to a multimedia record carrying no file. Verify each with its own document

## 4. Refuse a rectangle that cannot be applied

- [x] 4.1 Answer with the file and no rectangle when height or width is zero or absent. Verify both cases, and verify the answer is the file rather than nothing
- [x] 4.2 Answer with the first file and no rectangle when the record carries several files. Verify with a two-file record, and assert the absence of the rectangle explicitly so the decision cannot drift silently
- [x] 4.3 Ignore a rectangle written in a GEDCOM 5.5.1 document, whose specification has none. Verify the answer names the file and no rectangle
- [x] 4.4 Do not throw on a rectangle whose numbers are not numbers, which the validator reports separately. Verify with `3 TOP abc` that the query answers rather than raising

## 5. Expose it

- [x] 5.1 Add `getMediaAt(position): MediaReference | null` to `GedcomLanguageService` beside `getRecordPreview`, and export `MediaReference` and its crop type from `src/types.ts` and the package index. Verify `npm run typecheck` passes and the type is present in the built `dist/index.d.ts`
- [x] 5.2 Fold the media answer into the hover the language server already builds, beside the record preview, so VS Code and JetBrains receive the whole image without a new LSP request. Verify by asserting the hover response for a file payload carries the image reference
- [x] 5.3 Add a changelog entry under `Unreleased` in `packages/language-service/CHANGELOG.md`, and one in `packages/language-server` if its behaviour changed. Verify `npm run check:docs` passes

## 6. Verify the whole

- [x] 6.1 Run `npm run check` and confirm it exits 0, reading the exit code directly rather than through a pipe, and say whether `check:jetbrains` ran or was skipped
- [x] 6.2 Run `npm run check:conformance` and confirm it does not move: this change reads the tree and reports nothing, so no diagnostic may change
- [x] 6.3 Exercise the query from a real `npm pack` tarball in a clean consumer, as AGENTS.md asks of a release, and confirm the type reaches a consumer and the query answers

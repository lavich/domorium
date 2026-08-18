## 1. The shared answer

- [x] 1.1 Add the preview to `@domorium/language-service`: a `RecordPreview` type in
      `src/types.ts` (record `Range`, pointer `Range`, `truncated`) and
      `getRecordPreview(position, { maxLines })` on `GedcomLanguageService`,
      implemented over `getDefinitionRanges` and `getFoldingRangeAt`, with the
      body in `src/libs/preview/`. Export both from `src/index.ts`. Ship with
      tests covering all six scenarios in the spec: target elsewhere, record
      longer than `maxLines`, record that fits, unresolved target, target
      declared on the hovered line, position not on a pointer.
- [x] 1.2 Rebuild the shared libraries — `npm run build:libs` — so `codemirror`
      and `language-server` compile against the new `dist` rather than stale
      output.

## 2. The CodeMirror adapter

- [x] 2.1 Replace the body of `findRecordPreview` in
      `packages/codemirror/src/recordPreview.ts` with a call to
      `getRecordPreview`, converting its ranges to offsets through
      `positionToOffset`. Keep the exported signature and the `RecordPreview`
      offset shape byte-for-byte, so `recordPreviewHover`, the Obsidian plugin and
      the web editor need no change. The existing tests must pass unedited — that
      is the evidence the signature held; add one asserting `maxLines` reaches the
      shared method.
- [x] 2.2 Confirm `toPreviewRuns`, `getRecordPreviewRuns` and the pointer
      decoration are untouched, and that nothing in `packages/language-service`
      imports from `@codemirror/*`.

## 3. The LSP hover

- [x] 3.1 In `packages/language-server/src/createServer.ts`, make `onHover` ask
      `getRecordPreview(position, { maxLines: 24 })` first — the same limit the
      CodeMirror hosts default to — and where it answers, return
      `MarkupKind.Markdown` carrying the record's text in a fence tagged `gedcom`,
      with the pointer's range as the hover range. Where it does not answer,
      return `service.getHover(position)` unchanged. Build the fence longer than
      the longest run of backticks in the record. Ship with tests for: hover on a
      resolved pointer, hover on a tag, hover on an unresolved pointer, and a
      record whose text contains a triple backtick.
- [x] 3.2 Confirm `packages/language-service` still declares no LSP dependency —
      `MarkupKind` is imported in `language-server` only.

## 4. Verify in the hosts

- [x] 4.1 VS Code: `npm run open -w apps/vscode`, hover an XREF in a `.ged` file,
      confirm the record appears and that hovering a tag still shows its
      documentation.
- [ ] 4.2 JetBrains: build and run the plugin, hover an XREF, and confirm LSP4IJ
      renders the fenced block legibly. This is the design's stated risk — if the
      block arrives unreadable, fall back to plain text for this host in the
      adapter and record why.
- [x] 4.3 Web editor: `npm run dev -w apps/web-editor`, hover an XREF, confirm the
      preview is the same record, cut at the same line, coloured as before.

## 5. Documentation

- [x] 5.1 `packages/language-service/README.md`: document `getRecordPreview` and
      add it to the usage example. Read the example afterwards and confirm every
      name in it still exists — nothing checks that mechanically.
- [x] 5.2 `packages/codemirror/README.md`: where it describes `findRecordPreview`,
      say that the answer now comes from the shared layer and that the colouring
      stays here.
- [x] 5.3 State the publish order in the pull request description: per ADR-0003
      and the precedent in #171, `language-service` is published before
      `codemirror`, and `codemirror`'s dependency range moves to that minor in the
      release pull request, not in this one. No version is bumped and no tag is
      created here.
- [x] 5.4 Read `docs/architecture.md` and confirm nothing there needs a change: no
      layer moves and no dependency direction changes, so the expectation is that
      it does not. If it names the record preview as CodeMirror's, correct it.

## 6. Gate

- [x] 6.1 `npm run check`. Record whether `check:jetbrains` ran or was skipped for
      lack of a JDK — skipped is not passed.

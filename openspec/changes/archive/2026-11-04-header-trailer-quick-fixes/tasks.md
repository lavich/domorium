## 1. Validator

- [x] 1.1 Add `missingTag` to the data of `VAL002` (a missing root `TRLR` only) and
      `missingHeader` to the data of `VAL012`, with a flag on `VersionResolution`, in the
      validator and the language-service `Diagnostic` types and the `validator` README; verify
      with a test per code that the field is present exactly where the spec says, and absent
      for another missing tag and for a header without a version
- [x] 1.2 Report a missing `TRLR` on the last GEDCOM line; verify with tests for a file
      ending with and without a terminator, with blank lines after the last record, with a
      stray line after it, and a test that another missing root tag keeps `0:0`
- [x] 1.3 Rebuild `validator`, run `npm run check:conformance -- --update` and read the
      diff: the records for `VAL002` and their digests change in position only

## 2. Language service

- [x] 2.1 Match a zero-width diagnostic by line, and keep the rule for a diagnostic with a
      width; verify with a test of a widened request, a test that a cursor at the edge of an
      xref still gets nothing, and the existing code-action tests passing unchanged
- [x] 2.2 Produce the trailer and the 7.0 header texts in one module of `language-service`;
      verify with unit tests for `\n`, `\r\n`, a last line with no terminator and blank lines
      after the last record
- [x] 2.3 Offer **Add trailer** and **Add a GEDCOM 7.0 header** from `getCodeActions`;
      verify with tests for each scenario of the `header-trailer-quick-fix` spec, including no
      action for a header without a version, and none for a hand-built missing-`TRLR`
      diagnostic over a document that has a `TRLR`
- [x] 2.4 Test the empty file end to end: apply the header action, then the trailer action,
      and verify the document has no diagnostics

## 3. Hosts and documentation

- [x] 3.1 Add a `language-server` test that a code action request over a missing-trailer
      diagnostic returns **Add trailer** with the edit, and that a stale range returns none,
      and a CodeMirror test through `getDiagnosticActions`
- [x] 3.2 Update the `language-service` and `validator` READMEs, `apps/web-editor`
      `src/site/abilities.ts` where it lists quick fixes, and the one-line feature lists;
      the changelogs wait for the release bump; verify with `npm run check:docs`
- [x] 3.3 Run `npm run check` and record whether `check:jetbrains` ran or was skipped for
      lack of a JDK
- [x] 3.4 Check both actions by hand in a JetBrains IDE and in VS Code on an empty file and
      on a file without a trailer, and record the result in the PR; no automated test reaches
      how those clients treat a diagnostic at the end of a file

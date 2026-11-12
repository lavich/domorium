## 1. Validator

- [ ] 1.1 Move the local-path rule of `gedcom7LocalFileKind` into the validator as an exported
      predicate naming `absolute`, `parent-folder`, `unescaped-character` or nothing, with
      tests of each reason in the validator; rebuild `validator`, make `documentLinks` read
      it, and verify that the `documentLinks`, `mediaAt`, `fileTargetPath` and
      `retargetFileLinks` tests pass unchanged
- [ ] 1.2 Add `VAL020` (`FileTargetUnsupported`, `{ tag, pathProblem }`) to `checkPayload` for
      a `type-FilePath` payload, trimmed, with no scheme of two or more characters, and type
      `pathProblem` in `GedcomError.data`; verify with the `diagnostic-facts` scenario, a
      URL, ` https://x/y.jpg`, ` ../x.jpg`, `C:\x.jpg`, a `TRAN` beneath a `FILE`, a 5.5.1
      `FILE` of `../x.jpg`, and that `getErrors` of a 7.0 file holding `1 FILE ../x.jpg` is
      unchanged
- [ ] 1.3 Export `KNOWN_FILE_EXTENSIONS` from the validator, the keys of `mediaKind.ts`'s
      table; rebuild `validator` and verify with a `language-service` test that the table's
      keys equal the set
- [ ] 1.4 Raise `VAL021` (`ToleratedForm`, warning, `{ tag }`) in place of `VAL005` for a
      `MULTIMEDIA_FORMAT` value that is a known extension; rewrite the test "still rejects a
      format the specification does not have" of `multimediaFormatCase.test.ts` to expect
      `VAL021` for `png` and `PNG` and `VAL005` for a misspelling; verify with the scenarios
      of `validator/media-form`, the `diagnostic-facts` one, and that 7.0 `FORM` and the 7.0
      `TYPE` of a `NAME` are unchanged
- [ ] 1.5 Report `tolerates: "file-extension"` on that enumeration in `payloadShape`; verify
      with the `structure-schema` scenario
- [ ] 1.6 Run `npm run check:conformance -- --update`, read the diff (`VAL005` becoming
      `VAL021` for known extensions only), and rewrite the note of
      `vendor-ancestris11-export.ged` in `scripts/vendor-corpus.json`
- [ ] 1.7 Add `VAL020` and `VAL021` to the code table and the facts table of the validator
      README, name the exported predicate and set there, correct the comment on
      `type-FilePath` at `rule-node.ts:214-218` if it no longer holds, and rebuild `validator`

## 2. Language service

- [ ] 2.1 Map `VAL020` to `file-target-unsupported` and add `VAL020` to
      `CHECKED_BEFORE_WRITING`, add `file-target-unsupported` to `EditRefusalCode` and
      `pathProblem` to `DiagnosticData`; verify with the scenarios of "A file path the
      dialect cannot carry is refused": `setValue`, `addStructure` with a `FILE` and with a
      `TRAN`, a leading space, an escaped and an unescaped `?`, `validateValue`, a URL and
      5.5.1
- [ ] 2.2 Map `VAL021` to `value-not-in-enum`; verify with the scenarios of "A 5.5.1 form
      outside the standard is written with a warning": `png` written with `VAL021` beside
      it, `jpg` with none, `jgp` refused, `validateValue` answering severity `warning`

## 3. Documentation and gate

- [ ] 3.1 Update the `language-service` README (`file-target-unsupported`, `pathProblem`,
      `encodeFileTarget` for a host holding a plain path, the tolerated form) and verify with
      `npm run check:docs`
- [ ] 3.2 Run the pass in `docs/prompts/docs-sync.md`, the TODO.md item "Schema:
      type-FilePath" among what it checks
- [ ] 3.3 Run `npm run check` and record whether `check:jetbrains` ran

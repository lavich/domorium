## 1. The pointer diagnostic

- [x] 1.1 In `packages/validator/src/validator/rule-node.ts`, `case "pointer"`:
      replace the `candidates?.length` and "declares none" branches with one message,
      `No FAM record carries @F1450@` — `No record carries @F1450@` where
      `fieldType.to` names no tag. Keep the two non-pointer-shaped messages and
      `error.data` exactly as they are. Delete the `getAvailableValues(tagType)` call
      from this path and the comment that explained its placement, since neither has
      a subject any more.
- [x] 1.2 Update the three pointer assertions in `rule-node.test.ts` (around lines
      933, 985, 1022) and confirm the `SEX` assertion at 1004 does not move — an
      enumeration keeping its listed set is what this change is distinguishing.
      Add a test that a document declaring no record of the required type at all
      reports the same sentence as one that declares others. Do not test the
      unnamed-type fallback: both shipped schemas map every pointer payload to a
      record tag, so no document reaches it.
- [x] 1.3 Confirm `formatValueSet` and `MAX_LISTED_VALUES` are now reachable only
      from `validateEnumeration`, and that nothing else in the package calls them.
- [x] 1.4 `npm run build:libs`, so `language-service` compiles against the new `dist`
      rather than stale output.

## 2. Choosing a plausible candidate

- [x] 2.1 Add `packages/language-service/src/libs/codeActions/nearestXref.ts`:
      `nearestXref(xref, candidates)` returning the single candidate at the minimum
      Levenshtein distance where that minimum is at most 2 and exactly one candidate
      sits there, and `undefined` otherwise. Compare the full text including the `@`
      delimiters. Abandon a candidate as soon as a row exceeds the cutoff of 3.
      Ship with tests, each named for the case it catches: a dropped character, a
      transposition, two candidates tied at the same distance, nothing within 2, an
      empty pool, and a candidate equal to the xref.

## 3. Naming a candidate

- [x] 3.1 In `packages/language-service/src/libs/symbols/recordLabel.ts`, add an
      optional `resolve: (xref: string) => ASTNode | undefined`. With it, `FAM` is
      named by resolving `HUSB` and `WIFE` to their records and joining the `NAME`
      payloads with `" / "`; one resolvable spouse gives that name alone, neither
      gives `undefined`. Rewrite the comment that explained why `FAM` was absent into
      the rule that now covers it. Every other record type behaves as before,
      resolver or not.
- [x] 3.2 Extend `recordLabel.test.ts`: a family named from both spouses, from one,
      unnamed when neither resolves, and still unnamed when no resolver is passed —
      that last one is the evidence `documentSymbols` did not change.

## 4. The actions

- [x] 4.1 Add `nodes: ASTNode[]` to `CodeActionContext` and pass
      `this.document.getNodes()` from `GedcomLanguageService.getCodeActions`, the same
      way `getHover` and `getDocumentSymbols` already receive it.
- [x] 4.2 Rewrite `unresolvedXrefActions` in
      `packages/language-service/src/libs/codeActions/codeActions.ts`: keep the
      existing candidate pool (single-declaration records of the required tag), pass
      it through `nearestXref`, and emit in order — creation, then at most one named
      replacement, then `@VOID@` where the dialect is `7.0`. Delete
      `MAX_REPLACEMENT_CHOICES` and the `choices` branch. Build the resolver's xref-to-node map lazily, only when a candidate is being named. Leave
      `CodeActionChoice` and `CodeAction.choices` in `src/types.ts`, and their
      handling in `codemirror` and `language-server`, untouched.
- [x] 4.3 Rewrite the two tests this inverts rather than deleting them: "returns
      choices instead of silently selecting among several records" (line 52) and
      "caps the replacement choices in a document full of candidates" (line 78) both
      become assertions that no replacement is offered rather than a guess. Add:
      creation ordered before the replacement; a named candidate; an unnamed one;
      `@VOID@` offered in 7.0, absent in 5.5.1, absent when the dialect is unknown.
      Confirm the existing tests for creation, revalidation and duplicate
      declarations still pass unedited.

## 5. Conformance

- [x] 5.1 `npm run check:conformance`, expecting it to pass with
      `scripts/conformance-corpus.json` and `scripts/vendor-corpus.json` unchanged —
      neither records a diagnostic's message, by the decision stated in
      `check-conformance.mjs`, so a wording change must be invisible to them. Do not
      pass `--update`: a diff here would mean a code moved with the message, and that
      is a defect to find rather than a record to accept. Report the totals in the
      pull request. Needs the network; say so if it could not run. **Passed with both
      files unchanged: 23 official files, 20 diagnostic-free, 8 diagnostics as
      recorded; 14 vendor exports, 3 diagnostic-free, 14 781 diagnostics as
      recorded.**

## 6. Documentation

- [x] 6.1 Changelog entry by hand in `packages/validator/CHANGELOG.md` and
      `packages/language-service/CHANGELOG.md`.
- [x] 6.2 `packages/language-service/README.md`: it has no code-actions section today
      and no exported signature moves, so nothing there is made untrue. Add a short
      section — matching "The record a pointer names" in length and voice — saying
      which actions an unresolved xref offers, in what order, and that a replacement
      appears only where one candidate is plausibly the one intended. Read the usage
      example afterwards and confirm every name in it still exists.
- [x] 6.3 State the publish order in the pull request description: per ADR-0003,
      `validator` before `language-service`. No version is bumped and no tag is
      created here.
- [x] 6.4 Check `TODO.md` for an item this completes, and confirm
      `docs/architecture.md` needs nothing — no layer moves and no dependency
      direction changes. **Neither needed a change: `TODO.md` holds no item for this,
      and `architecture.md` already lists code actions among the service's
      concerns.**
- [x] 6.5 Open the follow-up issue for creation writing the reciprocal pointer,
      referencing #249 and the `packages/mutations` entry in `docs/roadmap.md`, and
      link it from the pull request so the deferred half of #249 is not lost.
      **Opened as #268, including the `FAMS` question that `SEX` cannot always
      answer.**

## 7. Gate

- [x] 7.1 `npm run check`. Record whether `check:jetbrains` ran or was skipped for
      lack of a JDK — skipped is not passed. **Ran: a JDK was present and the Gradle
      build and tests succeeded, so no stage was skipped.**

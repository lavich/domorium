## 1. Baseline

- [x] 1.1 Fetch the corpora with `CONFORMANCE_CACHE=<scratch dir> npm run check:conformance`, add a scratch file of edge shapes (BOM, CR, LF-CR, CR-LF, no final newline, level-only lines, malformed lines), and with a temporary script outside the repository record every token and lexer error of all of them on the current lexer; verify the record is non-empty.

## 2. The fix

- [x] 2.1 Add a depth guard in `packages/validator/src/parser/lexer.test.ts` that wraps `handleModes` as design.md describes and lexes a document of every line shape — level only, level+tag, tag+value, tag+xref, tag+xref+trailing text, `TAG-x`, pointer only (mid-file and at end of file), pointer+tag, pointer+tag+value, pointer+tag+xref, pointer+tag+xref+trailing text, a delimiter with nothing after it on both kinds of line, a blank line, CR, LF, CR-LF, LF-CR, a BOM, no final newline, malformed lines; verify it fails on the current lexer.
- [x] 2.2 Add a differential test that keeps the current mode table as a fixture and compares both lexers over the named shapes, including `0 @S1@ SNOTE @VOID@ 1990 note` and `0 @F1@ FAM @I1@ @I2@`, and over generated lines; verify it passes against the unchanged lexer (both sides equal).
- [x] 2.3 Restructure the modes as design.md's table and add `LineEnd`; verify 2.1 and 2.2 pass and `npx vitest run packages/validator` passes unchanged.
- [x] 2.4 Re-run the script from 1.1 on the changed lexer; verify its output is identical to the baseline apart from the newline token's name, then delete the script.

## 3. Documentation and gate

- [x] 3.1 Add a changelog entry under `## Unreleased` in `packages/validator/CHANGELOG.md`; verify `npm run check:docs` passes.
- [x] 3.2 Run `npm run check:conformance`; verify every recorded diagnostic is unchanged.
- [x] 3.3 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK.

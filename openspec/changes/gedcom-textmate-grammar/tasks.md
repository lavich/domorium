## 1. The grammar

- [x] 1.1 Add `vscode-textmate` and `vscode-oniguruma` as devDependencies of
      `apps/vscode`, and a test helper that loads the WASM once and builds a
      `Registry` over the extension's own grammar files.
- [x] 1.2 Write `apps/vscode/src/grammar.test.ts` first, over the line shapes in
      the spec: `0 HEAD`, `2 VERS 7.0`, `0 @I1@ INDI`, `1 FAMS @F1@`,
      `1 NAME John /Doe/`, `1 SEX Male`, `1 _MYTAG something`,
      `2 DATE 1 JAN 2000`, `1 NOTE @@ escaped`, a leading-whitespace line, and a
      line of specification notation that must come back with no scope.
- [x] 1.3 Add `apps/vscode/syntaxes/gedcom.tmLanguage.json` — `source.gedcom`,
      three `match` patterns ordered record, pointer, line — until 1.2 passes.

## 2. The Markdown injection

- [x] 2.1 Extend `grammar.test.ts` with the fence cases from the spec: a
      ` ```gedcom ` fence, the same in upper case, a `~~~` fence, a fence
      indented under a list item, an info string with attributes after the
      language, and a ` ```json ` fence that must stay untouched. Assert
      `meta.embedded.block.gedcom` on the content.
- [x] 2.2 Add `apps/vscode/syntaxes/gedcom.markdown.json` —
      `markdown.gedcom.codeblock`, `injectionSelector: "L:text.html.markdown"`,
      the fence rule shaped after VS Code's own — until 2.1 passes.

## 3. The manifest and the agreement

- [x] 3.1 Extend `apps/vscode/src/contributions.test.ts`: every
      `contributes.grammars` path resolves to a file beside the manifest, the
      language-bound entry names the contributed language id, and the injected
      entry names `text.html.markdown` and maps `meta.embedded.block.gedcom` to
      `source.gedcom`.
- [x] 3.2 Add the agreement test over the token table in design.md — semantic
      type in the exported legend, grammar scope produced for a sample line, and
      the `semanticTokenScopes` fallback as that scope's prefix where one is
      declared.
- [x] 3.3 Add `contributes.grammars` to `apps/vscode/package.json` until 3.1 and
      3.2 pass.

## 4. Documentation

- [x] 4.1 Add the ` ```gedcom ` fences the change makes worthwhile:
      `apps/vscode/README.md` gains a GEDCOM sample showing what the extension
      colours.
- [x] 4.2 Add an `## Unreleased` entry to `apps/vscode/CHANGELOG.md` — colour
      before the server connects, colour in a Markdown fence, and the deliberate
      difference from github.com's colours.
- [ ] 4.3 Confirm no ADR is needed: ADR-0004 already records the vocabulary and
      already considered "a TextMate grammar instead of semantic tokens". This
      change adds one underneath rather than instead, which the record does not
      contradict. Say so in the pull request rather than writing a record.

## 5. Verification

- [x] 5.1 Package the extension with `npx vsce ls` (or `--no-dependencies`) and
      confirm both `syntaxes/` files are listed. **They were not.**
      `.vscodeignore` ignores `**` and names what to keep, so `!syntaxes/**` had
      to be added; a test now reads that file so the next directory is not lost
      the same way.
- [x] 5.2 Verified headlessly instead: screen capture is unavailable in this
      environment, so a script tokenizes a Markdown document with VS Code's own
      `markdown-basics` grammar, read from the installed application, with the
      injection registered through `getInjections`. The fence content comes back
      carrying `meta.embedded.block.gedcom` and the GEDCOM scopes; a ` ```json `
      fence and a ` ```unknownlang ` fence — the `fenced_code_block_unknown`
      path — come back untouched. That covers the injection priority, which is
      the part the committed tests cannot reach. A human still wants to look at
      the colours.
- [x] 5.3 `npm run check` passes: 67 test files, 841 tests, documentation checks
      over 54 Markdown files. `check:jetbrains` **ran** — a JDK is present and
      the Gradle build succeeded. The two ESLint `curly` warnings are
      pre-existing in `packages/validator/scripts/` and untouched here.

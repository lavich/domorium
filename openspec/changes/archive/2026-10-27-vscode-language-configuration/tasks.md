## 1. Configuration

- [x] 1.1 Add `apps/vscode/language-configuration.json` with the word pattern from design.md and `"comments": {}`, name it as `configuration` of the `gedcom` language in `apps/vscode/package.json`, and add `!language-configuration.json` to `apps/vscode/.vscodeignore`; verify with tests in `src/contributions.test.ts` that the manifest names an existing file and that `.vscodeignore` names it.
- [x] 1.2 Add `contributes.configurationDefaults["[gedcom]"]["editor.wordSeparators"]` to the manifest; verify with a test that it equals VS Code's default separator string without `@`.
- [x] 1.3 Add tests in `src/contributions.test.ts` for every scenario of `specs/vscode/language-configuration/spec.md` — words at positions (end inclusive) in `1 HUSB @I1@`, `0 @F12@ FAM`, `1 _UID 1234`, the words of `1 NAME John /Doe/` and `1 EMAIL john@example.com`, the separators applied to `john@example.com`, no comments, no pairs or rules; verify they pass, and that the xref ones fail against VS Code's default word pattern.

## 2. Documentation and gate

- [x] 2.1 Mention in `apps/vscode/README.md` (Features) that an xref is one word for selection, movement and completion, and add an entry under a new `## Unreleased` heading in `apps/vscode/CHANGELOG.md`; verify `npm run check:docs` passes.
- [x] 2.2 Build with `npm run build:vscode` and run `npx @vscode/vsce ls --no-dependencies` in `apps/vscode`; verify `language-configuration.json` is listed.
- [x] 2.3 Open an issue for the same `@` splitting in the web editor and the JetBrains plugin; verify it exists and is linked from the PR.
- [x] 2.4 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK. Ran: 1414 tests, `check:jetbrains` ran and passed.

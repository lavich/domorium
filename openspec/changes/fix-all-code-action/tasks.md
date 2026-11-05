## 1. Language service

- [ ] 1.1 Widen `CodeAction.kind`; add `fixAll` (header, level, trailer edits in that
      order, one revalidation, retry without level fixes) and export `isFixAllable` and
      `getFixAll` on the service; verify with unit tests for each scenario of the
      `fix-all` spec, including `\r\n`, an empty document, a stale version, and a document
      whose level fixes are refused as a set

## 2. Language server

- [ ] 2.1 Declare `source.fixAll`; honour `context.only` for both kinds; send the fix-all
      action with the document version and no diagnostics; verify with stdio tests for each
      scenario of the `fix-all-code-action` spec, and that the existing quick-fix tests
      pass unchanged

## 3. Documentation and gate

- [ ] 3.1 Update the `language-service` README (the method, the kind) and the one-line
      feature lists that name quick fixes; the changelogs wait for the release bump;
      verify with `npm run check:docs`
- [ ] 3.2 Run `npm run check` and record whether `check:jetbrains` ran or was skipped for
      lack of a JDK
- [ ] 3.3 Check by hand in VS Code (the command "Fix all auto-fixable problems", and
      `editor.codeActionsOnSave: {"source.fixAll": "explicit"}`) and in a JetBrains IDE on a
      file with no header and no trailer, and record the result in the PR; no automated
      test reaches how those clients list source actions

## Context

- `getCompletionItems` maps the validator's `{label, kind, detail}` and nothing else (`packages/language-service/src/libs/completion/completion.ts:14-24`). Its test asserts that no `insertText` is set (`completion.test.ts:37`).
- The service hands the validator only the line prefix (`languageService.ts:107-113,275-279`), but it holds the whole text, so the rest of the line is at hand.
- The server returns the items unchanged (`packages/language-server/src/createServer.ts:409-415`) and reads no client capability for completion (`createServer.ts:63-96`).
- CodeMirror computes `from` with `matchBefore(/[A-Z0-9_@]*$/i)` and lets `to` default to the cursor (`packages/codemirror/src/extensions.ts:155-183`). It matches options against the text between `from` and `to` (`@codemirror/autocomplete`, `CompletionResult.to`).
- What a completion can be: a tag (`[A-Za-z0-9_]`), an xref or `@VOID@`, an enumeration value (no set value contains whitespace in either schema), a date keyword, month, epoch or calendar, including the 5.5.1 escape `@#DJULIAN@`. A GEDCOM 7 multiselect payload separates its values with `, `.

## Goals / Non-Goals

**Goals:** every host writes exactly one token when a completion is accepted, whatever the typed prefix holds (`@`, `#`) and whatever follows the cursor. See proposal.md for the user's decision.

**Non-Goals:** snippets, documentation, sort order (#154); what the validator offers; the word pattern of VS Code (#470) and of JetBrains and the web editor for selection (#467).

## Decisions

### The service computes the range, from the line text

The token is the maximal run of characters that are neither whitespace nor `,` containing the cursor, where a cursor at either end of a run belongs to it. `insert` is `[run.start, cursor]`, `replace` is `[run.start, run.end]`. After a space with nothing following, both are empty at the cursor. One rule for every kind, because every value the validator offers is a single run under it. Kept in `language-service`, not the validator: it is about the text under the cursor, not the schema, and the validator's `GedcomCompletion` stays as it is.

Alternative rejected: a range per kind from the validator's own regexps (`TAG_PREFIX`, `VALUE_PREFIX`). It would put the token rule in two places and still need the text after the cursor, which the validator is not given.

### `textEdit` is protocol-shaped and always present

`{ newText: string; insert: Range; replace: Range }` is the shape of LSP's `InsertReplaceEdit`, declared in `src/types.ts` like the service's other protocol-shaped types. `newText` is the label. Always present, so an adapter never has to guess. Adding a field to a returned type is not breaking for a reader; a consumer that builds `CompletionItem` values itself would have to add it, and none in either repository does.

### The server degrades to a `TextEdit` over the replace range

LSP allows an `InsertReplaceEdit` only when the client declares `insertReplaceSupport`. The server records it from `initialize` and otherwise sends `{ range: replace, newText }`. Replace, not insert, because writing one token is the point of #468; a client that lets the user choose (VS Code) gets both ranges and keeps its own setting.

### CodeMirror filters on insert and applies over replace

The result's `from` is `insert.start` and `to` stays at the cursor, so matching keeps comparing what was typed. Each option's `apply` replaces from `from` to the replace end, carried as its distance past the cursor, which typing before the cursor does not change. A CodeMirror host has no insert/replace setting, so it takes the one that writes a single token.

Behaviour decision, not architecture: the contract lives in the three specs (ADR-0018).

## Risks / Trade-offs

- [VS Code in its default insert mode, cursor inside `@I1@`] → still writes `@I2@1@`; that is the user's chosen mode, and Shift+Enter replaces. Documented in the spec scenario.
- [A future value containing a space or comma] → the token rule would cut it; the spec states the rule so such a value fails a test, not a user.
- [LSP4IJ's handling of `InsertReplaceEdit`] → if it does not declare support, it gets the `TextEdit`; checked by hand in JetBrains after merge.

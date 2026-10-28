## Context

- `getCompletionItems` maps the validator's `{label, kind, detail}` and nothing else (`packages/language-service/src/libs/completion/completion.ts:14-24`). Its test asserts that no `insertText` is set (`completion.test.ts:34`).
- The service hands the validator only the line prefix (`languageService.ts:107-113,275-279`), but it holds the whole text, so the rest of the line is at hand.
- The server returns the items unchanged (`packages/language-server/src/createServer.ts:409-415`) and reads no client capability for completion (`createServer.ts:63-96`).
- CodeMirror computes `from` with `matchBefore(/[A-Z0-9_@]*$/i)` and lets `to` default to the cursor (`packages/codemirror/src/extensions.ts:155-183`). It matches options against the text between `from` and `to` (`@codemirror/autocomplete`, `CompletionResult.to`).
- What a completion can be: a tag (`[A-Za-z0-9_]`), an xref (`@[A-Za-z0-9_]+@`, `lexer.ts:76`) or `@VOID@`, an enumeration value (none contains whitespace or `,` in either schema), a date keyword, month, epoch (`B.C.`) or calendar. A 5.5.1 calendar is written as an escape, and one 5.5.1 calendar is named `FRENCH R`, so `@#DFRENCH R@` holds a space (`packages/validator/src/validator/calendars.ts:15-18`). A GEDCOM 7 multiselect payload separates its values with `, `.

## Goals / Non-Goals

**Goals:** every host writes exactly one token when a completion is accepted, whatever the typed prefix holds (`@`, `#`) and whatever follows the cursor. See proposal.md for the user's decision.

**Non-Goals:** snippets, documentation, sort order (#154); what the validator offers; the word pattern of VS Code (#470) and of JetBrains and the web editor for selection (#467).

## Decisions

### The service computes the range, from the line text

The token is, first, a 5.5.1 calendar escape — `@#D`, capitals, at most one space followed by one capital, then `@` — that contains the cursor or begins or ends at it; an escape still being typed, `@#` and what follows it up to the cursor with no closing `@`, counts from its `@#` and, for `replace`, runs on in the same form to a closing `@` if one follows. The name is narrower than the validator's `ESCAPE_SRC` (`[A-Z ]*`) on purpose: a name of any spaces would run from `@#DJ` across `AND` into the next escape of `BET @#DJ AND @#DGREGORIAN@`, and the only calendar with a space, `FRENCH R`, fits the narrower form. Otherwise it is the maximal run of characters that are neither whitespace nor `,` containing the cursor, where a cursor at either end of a run belongs to it. `insert` is `[token.start, cursor]`, `replace` is `[token.start, token.end]`. After a space with nothing following, both are empty at the cursor. Every value the validator offers is one token under this rule; the escape comes first because `FRENCH R` is the one value with a space in it. Kept in `language-service`, not the validator: it is about the text under the cursor, not the schema, and the validator's `GedcomCompletion` stays as it is.

Alternative rejected: a range per kind from the validator's own regexps (`TAG_PREFIX`, `VALUE_PREFIX`). It would put the token rule in two places and still need the text after the cursor, which the validator is not given.

### `textEdit` is protocol-shaped and always present

`{ newText: string; insert: Range; replace: Range }` is the shape of LSP's `InsertReplaceEdit`, declared in `src/types.ts` like the service's other protocol-shaped types. `newText` is the label. Always present, so an adapter never has to guess. Adding a field to a returned type is not breaking for a reader; a consumer that builds `CompletionItem` values itself would have to add it, and none in either repository does. Because `@domorium/codemirror` reads the field, its dependency range on `@domorium/language-service` moves to the release that ships it (today `^2.1.0` admits 2.2.0, which does not), and that release is published first.

### The server degrades to a `TextEdit` over the replace range

LSP allows an `InsertReplaceEdit` only when the client declares `insertReplaceSupport`. The server records it from `initialize`, reading the capability with optional chaining so that a client sending no capabilities counts as unsupported, and otherwise sends `{ range: replace, newText }`. Replace, not insert, because writing one token is the point of #468; a client that lets the user choose (VS Code) gets both ranges and keeps its own setting.

### CodeMirror filters on insert and applies over replace

The result's `from` is `insert.start` and `to` stays at the cursor, so matching keeps comparing what was typed. Each option's `apply` dispatches `insertCompletionText(state, label, from, to + tail)` annotated with `pickedCompletion.of(completion)` and `userEvent: "input.complete"`, the library's own path, where `tail` is `replace.end` minus the cursor. No `validFor` is set, so the source runs again on every keystroke and `tail` is always fresh. A CodeMirror host has no insert/replace setting, so it takes the one that writes a single token.

The guard that decides whether the list opens unasked (`extensions.ts:159-166`) is unchanged: typing `@#` or `,` still opens nothing until asked.

Behaviour decision, not architecture: the contract lives in the three specs (ADR-0018).

## Risks / Trade-offs

- [VS Code in its default insert mode, cursor inside `@I1@`] → still writes `@I2@1@`; that is the user's chosen mode, and Shift+Enter replaces. Documented in the spec scenario.
- [A future value containing a space or comma other than a calendar escape] → the token rule would cut it; the spec states the rule so such a value fails a test, not a user.
- [LSP4IJ's handling of `InsertReplaceEdit`] → if it does not declare support, it gets the `TextEdit`; checked by hand in JetBrains after merge.

## Implementation

- The `@domorium/language-service` floor in `packages/codemirror/package.json` is not raised here. Raising it above the workspace's own 2.2.0 would stop the workspace from installing; every earlier floor moved in its release PR (`5ac52a6`, `cfb7765`), and the CodeMirror CHANGELOG entry says this one must.
- The CodeMirror tests run the completion source and each option's `apply` against an `EditorState` behind a stand-in view, since `apply` reads only `view.state` and calls `view.dispatch`; the package's tests run without a DOM.
- The calendar escape is matched in the narrower form above, and a cursor before its first `@` belongs to it, after the code review found both `BET @#DJ AND @#DGREGORIAN@` and a cursor on `@#DFRENCH R@`'s first `@` cutting a date. A cursor past the end of the line is read as at its end.
- The `@codemirror/autocomplete` peer range stays `^6.0.0`, as `manifest.test.ts` requires (#220), though before 6.6.0 `insertCompletionText` replaced the wrong range when a result ended after the cursor, which `to + tail` does. Every host this repository knows ships 6.20.

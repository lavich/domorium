## Why

A completion item carries only a label (`packages/language-service/src/libs/completion/completion.ts:18-23`), so each client guesses which text it replaces, and every guess splits GEDCOM at `@`. In VS Code, `1 HUSB @I` plus `@I1@` writes `1 HUSB @@I1@`, and accepting `@I2@` with the cursor inside `@I1@` writes `@I2@1@`. A 5.5.1 calendar escape, `@#DJULIAN@`, is offered the same way (`packages/validator/src/completion/completion.ts:213`) and breaks the same way. CodeMirror takes the typed `@` (`packages/codemirror/src/extensions.ts:159`) but leaves the text after the cursor. Reported as lavich/domorium#468. The word pattern from #470 fixes only VS Code's replace mode over a whole xref.

## The requirement, as the user decided it

2026-10-28, asked whether the range should ride on every item, on pointers only, or be left to each client's word rules: **"Range on every item (Recommended)"** — language-service gives every item an insert range and a replace range; the server sends an `InsertReplaceEdit`, falling back to a `TextEdit` for a client without `insertReplaceSupport`; CodeMirror takes its range from it.

## What Changes

- `CompletionItem` in `@domorium/language-service` gains `textEdit: { newText, insert, replace }`, protocol-shaped. `insert` runs from the start of the token under the cursor to the cursor; `replace` runs from the same start to the token's end. A token is a run of characters that are neither whitespace nor `,`.
- `packages/language-server` sends that edit as an `InsertReplaceEdit` when the client declares `textDocument.completion.completionItem.insertReplaceSupport`, and otherwise as a `TextEdit` over the replace range.
- `@domorium/codemirror` filters against the insert range and, on accept, replaces the replace range.
- No breaking change. A new field on a returned type: minor releases of `@domorium/language-service` and `@domorium/codemirror`, made later by a separate release PR.

## Capabilities

### New Capabilities

- `language-service/completion-range`: the text a completion replaces, stated by the service.
- `language-server/completion-edit`: how that range reaches an LSP client.
- `codemirror/completion-apply`: how a CodeMirror host filters and applies a completion.

### Modified Capabilities

None. `vscode/language-configuration` keeps its word pattern; it still serves word-based suggestions and selection.

## Impact

- Layers: `language-service` (range), `language-server` and `codemirror` (adapters). Dependencies still point down; `language-service` keeps its own protocol-shaped type and gains no LSP dependency. `validator` is unchanged.
- Editor hosts: VS Code and JetBrains (through the server), the web editor and the Obsidian plugin (through `@domorium/codemirror`, after it is published). No host code changes in this repository.
- Docs: the `language-service` and `codemirror` READMEs and CHANGELOGs.

## Context

`gedcomLexerDefinition` (`packages/validator/src/parser/lexer.ts:100-115`) has
four modes. Two transitions push without a matching pop:

- `Newline` carries `push_mode: "main"` in every mode, so each line start adds a
  frame.
- After a pointer, `Tag` pushes `hasNotPointer` on top of `hasPointer`; a line
  with no value never pops either.

Chevrotain 13 keeps the stack in a local of `tokenizeInternal`
(`node_modules/chevrotain/lib/src/scan/lexer_public.js:291`). A token with both
`pop_mode` and `push_mode` is a transition and leaves the depth unchanged
(`lexer_public.js:296-301`); `Delimiter` already relies on that.

## Goals / Non-Goals

**Goals:**

- Stack depth bounded by a constant, independent of the document.
- An automated guard on that bound.

**Non-Goals:**

- Any change to the tokens, the grammar it implements, or lexing speed, which
  #80 measured as unaffected by the depth.

## Decisions

### Each line ends where it began, with pointer lines in modes of their own

Today, after a pointer, a closing `Xref` or `Value` pops back to `hasPointer`,
not to `main`, so whatever follows on that line is lexed in `hasPointer`
(`0 @F1@ FAM @I1@ @I2@` reads `@I2@` as a lexer error and a tag). Sending it to
`main` instead would change those tokens and drop a diagnostic, so pointer lines
get their own copies of the two value modes:

| mode                    | tokens                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `main`                  | BOM, `Newline` (no mode change), whitespace, `Level`, `Pointer` → push `hasPointer`, `Tag` → push `hasNotPointer`                         |
| `hasPointer`            | `LineEnd` (pop), whitespace, `Tag` → transition to `pointerNoValue`                                                                       |
| `hasNotPointer`         | `LineEnd`, `Delimiter` → transition to `afterDelimiter`, `Xref` (pop), `Value` (pop)                                                      |
| `afterDelimiter`        | `LineEnd`, `Xref` (pop), `Value` (pop)                                                                                                    |
| `pointerNoValue`        | `LineEnd`, `Delimiter` → transition to `pointerAfterDelimiter`, `Xref` → transition to `hasPointer`, `Value` → transition to `hasPointer` |
| `pointerAfterDelimiter` | `LineEnd`, `Xref` → transition to `hasPointer`, `Value` → transition to `hasPointer`                                                      |

`LineEnd` has `Newline`'s pattern and `line_breaks: true`, is skipped, and pops;
it has a name of its own so lexer output can tell the two apart. Every mode
other than `main` is exactly one frame above it, so the depth never exceeds two,
and a pop never reaches the last frame. Each transition reproduces where today's
pops land, so the tokens are the same.

Started in a mode other than `main`, the lexer would pop its last frame and
throw (`hasPointer`) or never return to `main` (the value modes), so
`ConfigurableLexer.tokenize` no longer takes an initial mode. No caller passed
one (`gedcomDocument.ts:76` is the only caller).

Alternatives: one `Newline` that pops and pushes `main` everywhere, which leaves
the pointer line's extra frame; and sending pointer lines to `main` after their
value, which changes the tokens as above.

### The token stream is proven unchanged on real files, once

Before the change, a temporary script records `(type, image, offset, line,
column)` for every token and every lexer error of the official GEDCOM 7 files
and the vendor exports the conformance check fetches; after it, the same script
must produce identical output. The script is not committed; the existing lexer
and parser tests and the conformance check remain the lasting guard.

## Risks / Trade-offs

- [A line shape the definition handles differently after the change] → the
  differential test over generated lines, the token-stream diff over both
  corpora, and the existing lexer tests.
- [The guard depends on a Chevrotain prototype method] → it asserts that it
  observed modes at all, so a rename fails the test instead of passing it.

## Implementation

- The baseline and after records covered 38 files (the 37 corpus files and one
  of edge shapes), 420,735 tokens and 2 lexer errors, and were byte-identical.
  Skipped tokens never reach the output, so the newline token's new name did
  not show at all.
- The depth guard read 1,700 on the old table for a 1,000-line document of
  every shape, and 2 on the new one.

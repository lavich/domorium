# 0004. Use the standard LSP semantic token vocabulary, coarsely applied

- **Status:** Accepted
- **Date:** recorded 2026-07-30, decided across earlier commits

## Context

This record was written after the fact to capture two related decisions already
in force: replace custom semantic token names with the standard vocabulary, and
keep the resulting mapping coarse rather than deriving payload types from the
schema.

Semantic highlighting works by returning token types that the editor maps to
theme colors. The mapping lives in the theme, not in this project — which means a
token type the theme has never heard of gets no color at all.

The original implementation used hand-rolled token type strings, including values
like `unknown` and `reference`. No editor theme recognizes those, so the tokens
they described were emitted and then silently dropped. Highlighting looked
partially broken in a way that no test caught, because the tokens were
structurally valid.

A second question followed. GEDCOM payload values carry type information in the
schema — some are numeric, some are enumerated, some are free text. Emitting a
different token type per payload type is possible: the validator knows the schema.
It was implemented, with `number` and `enumMember` types and an `isEnumValue`
helper on the document.

## Decision

**Use the vocabulary the protocol defines.** Token types and modifiers are limited
to the standard LSP names — `comment`, `keyword`, `string`, and the `declaration`
modifier — chosen so that every theme already has a color for them.

The names are declared locally by `@gedcom/language-service` rather than imported
from `vscode-languageserver-protocol`. That is not a departure from the decision
but a consequence of the layer boundary recorded in
[docs/architecture.md](../architecture.md): the language service must not depend on
an LSP runtime, so it restates the standard names instead of importing them. The
initial implementation imported the enums while semantic tokens still lived in
the LSP package; the later package split moved the behavior below that boundary.

**Keep the mapping coarse and syntactic.** One token type per lexical token kind.
Schema-aware per-value typing was implemented and then removed: payload values
receive no semantic token type at all.

## Consequences

Highlighting works in every theme without theme-side configuration, and it degrades
predictably: a token either has a standard type that themes color, or it has none.

Keeping the mapping syntactic keeps the semantic token path independent of schema
resolution. The alternative coupled highlighting to validation state, which meant
the color of a value could change as schema knowledge improved, and made the token
generator need the document rather than just the token stream.

The cost is expressive range. GEDCOM's own categories — a level number, a tag, an
XREF, a payload — do not map cleanly onto a vocabulary designed for programming
languages, so the coloring is an approximation. Payload values are not highlighted
at all, which is the most visible limitation and the thing most likely to prompt
someone to reopen this decision.

Adding a token type later is cheap; the constraint is only that it be a standard
name, and that the reason be stronger than "the schema makes it possible."

## Alternatives considered

**Custom token type names describing GEDCOM concepts.** The most accurate
vocabulary for this format — `level`, `tag`, `xref`, `payload` would each say
exactly what they are. Rejected because accuracy is worthless if nothing renders
it: themes color the standard set, and a custom name produces no color unless every
user writes theme rules by hand. This was the original implementation and was
replaced by the standard vocabulary described above.

**Schema-aware per-value token types.** Implemented, then removed. It genuinely
improved dense documents, where numeric and enumerated payloads stood out. Rejected
because it coupled highlighting to schema resolution for a cosmetic gain: the token
generator had to take the whole document, values changed color as validation
knowledge changed, and the extra branching had to be tested per payload type. The
cost sat in the hot path of every keystroke; the benefit was aesthetic.

**A TextMate grammar instead of semantic tokens.** Cheaper, and works with no
server. Rejected because the useful distinctions in GEDCOM — is this XREF a
declaration or a reference — are not decidable by a regular grammar, and the parser
that can decide them already exists.

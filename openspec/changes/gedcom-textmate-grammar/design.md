## Context

See proposal.md — Why. Two facts shape everything below.

`contributes.semanticTokenScopes` in `apps/vscode/package.json` already names the
TextMate scope each semantic type falls back to, and VS Code supplies the rest
from its own table (`comment` → `comment`, `keyword` → `keyword`, `string` →
`string`). So the scope every GEDCOM token is already painted through is known,
and the grammar has no freedom about scope names — only about how it recognises
the tokens.

The line shape is fixed by the lexer in `packages/validator/src/parser/lexer.ts`,
which is what produces the semantic tokens: a level of `[0-9]+`, an optional
record-defining `@[A-Za-z0-9_]+@`, a tag of `[A-Za-z0-9_]+`, and then either one
`@xref@` or a payload running to end of line. Leading whitespace is skipped in
its `main` mode, so a slightly indented file still gets semantic tokens.

## Goals / Non-Goals

**Goals:**

- One grammar recognising that one line shape, and no more.
- Byte-for-byte agreement of scopes with what the semantic tokens resolve to,
  enforced by a test rather than by a comment.
- A Markdown injection shaped like the ones VS Code ships, so a GEDCOM fence
  behaves like a CSS or JSON fence — tildes, indentation inside a list, an info
  string with attributes after the language.

**Non-Goals:**

- Any per-token knowledge: no tag list, no enumerated values, no date grammar, no
  `@@` or `@#…@` escapes, no surname slashes. Each of those would be a colour the
  semantic layer cannot reproduce.
- The other three hosts.
- A grammar for `.gdz` (a zip container, not text).

## Decisions

### The scope names are derived, not chosen

| GEDCOM token             | Semantic token         | Resolves through      | Grammar scope                 |
| ------------------------ | ---------------------- | --------------------- | ----------------------------- |
| level                    | `comment`              | VS Code's own table   | `comment.gedcom`              |
| record-defining `@xref@` | `variable.declaration` | `semanticTokenScopes` | `entity.name.function.gedcom` |
| tag                      | `keyword`              | VS Code's own table   | `keyword.gedcom`              |
| `@xref@` in a payload    | `variable`             | `semanticTokenScopes` | `entity.name.type.gedcom`     |
| payload                  | `string`               | VS Code's own table   | `string.gedcom`               |

Each grammar scope is the resolved scope plus one `.gedcom` segment. A theme rule
selects by scope prefix, so any rule that matches the resolved scope matches the
grammar's too — which is what makes the two layers land on the same colour and
the same font style. Adding a conventional middle segment (`comment.line.…`,
`keyword.other.…`) would break that: a theme is free to style `keyword.other`
differently from `keyword`, and then the file would recolour when the server
connected.

`comment` for a level is not a description of a level. It is the type ADR-0004
chose, for the reason recorded there, and the grammar's job here is to match it.

Alternative considered: the scope names from
[fguitton/vscode-gedcom](https://github.com/fguitton/vscode-gedcom), which is
what github.com renders GEDCOM through, so the colours would have matched what a
reader sees there. Rejected — see proposal.md — because it colours tags in seven
categories that semantic tokens flatten to one, and emits `invalid.illegal`
scopes from regex guesses at validity.

### Three `match` patterns, most specific first

`#record` (`level @xref@ TAG [payload]`), then `#pointer`
(`level TAG @xref@` with nothing after it), then `#line`
(`level TAG [payload]`). Each is one line-anchored `match` with named captures.

A line-at-a-time `match` is both the simplest thing that can express this and the
fastest: GEDCOM has no multi-line construct — `CONT` and `CONC` are ordinary tags
whose payload happens to continue a previous one — so there is no state to carry
between lines and no reason for `begin`/`end`.

Ordering carries the meaning. `#pointer` must precede `#line` or `1 FAMS @F1@`
would take the payload scope instead of the reference scope; the anchor `$` on
`#pointer` is what keeps `1 NOTE @N1@ and more` in `#line`, matching the lexer,
which reads that as an xref followed by a value only when nothing else follows.

Each pattern tolerates leading whitespace, because the lexer does.

Anything that matches none of the three — a blank line, prose in a mislabelled
fence, `1ABC DEF` — is left with no scope at all. That is the required behaviour,
not a gap: an uncoloured line says "not read" where a red one would say
"invalid", which is the validator's word and not the grammar's.

### The injection copies VS Code's own fence rule

`apps/vscode/syntaxes/gedcom.markdown.json` declares
`"injectionSelector": "L:text.html.markdown"` and holds one rule whose `begin`,
`end` and inner `while` are the shape of `fenced_code_block_<lang>` in
`markdown-basics/syntaxes/markdown.tmLanguage.json`, with `gedcom` substituted for
the language and `meta.embedded.block.gedcom` for the `contentName`.

Copying that shape rather than inventing one is what buys the awkward cases for
free: `~~~` fences, a fence indented under a list item (the `end` pattern
back-references the opening indent), more than three backticks, and an info
string carrying attributes after the language. The `L:` prefix puts the injection
ahead of the host's patterns, which is required to beat the
`fenced_code_block_unknown` catch-all.

The Mermaid extension's variant — a lookbehind on the fence characters — was read
and not copied; it is shorter but does not reproduce the indent back-reference.

The language is matched case-insensitively and exactly: `gedcom`, not `ged`.
Linguist gives GEDCOM no short alias, so github.com colours a ` ```gedcom `
fence and nothing else; matching more here would mean a fence that is coloured in
the editor and grey on GitHub.

### The grammar is tested by tokenizing, not by inspecting JSON

`vscode-textmate` and `vscode-oniguruma` become devDependencies of `apps/vscode`.
A test loads both grammar files into a `Registry`, tokenizes GEDCOM lines and
asserts the scope on each token — the same engine VS Code runs, so a passing test
means the editor does this too. Asserting on the JSON structure instead would
test that the file says what it says.

The injection grammar is loaded as a top-level grammar in that registry rather
than injected into a real Markdown grammar. That exercises the fence `begin`/`end`
and the `source.gedcom` include end to end without vendoring VS Code's Markdown
grammar, which is neither a package nor ours to copy. What is left untested by
tokenization — that the injection is wired to `text.html.markdown` at all — is a
manifest fact, and is asserted from `package.json` in `contributions.test.ts`
alongside the existing contribution tests: every `contributes.grammars` path
resolves to a file, the language-bound entry names the contributed language id,
and the injected entry names `text.html.markdown` and maps
`meta.embedded.block.gedcom`.

The agreement itself gets its own test, over one table naming the GEDCOM token,
its semantic type and its grammar scope. For each row: the semantic type is in
the legend `@domorium/language-service` exports, the grammar produces that scope
for a sample line, and — where `semanticTokenScopes` overrides the type — the
grammar's scope starts with the first scope it falls back to. The two rows
`semanticTokenScopes` does not cover are the ones VS Code resolves itself, so
they are pinned as constants with the table above as their reason.

## Risks / Trade-offs

**The colours will not match github.com** → Accepted, and stated in the
changelog entry. The alternative is a file that recolours the moment the server
connects, which is worse and is the thing the issue asks to avoid.

**A future edit to `semanticTokenScopes` silently breaks the agreement** → The
agreement test reads both sides from `package.json`, so an edit to one without
the other fails.

**A theme styles an intermediate scope segment** → Mitigated by adding exactly
one segment to the resolved scope, so no intermediate segment exists to be
styled differently. A theme that styles `comment.gedcom` specifically would be
styling this extension on purpose.

**`syntaxes/` is left out of the `.vsix`** → It was: `.vscodeignore` ignores `**`
and names what to keep, so `npx vsce ls` listed neither grammar until
`!syntaxes/**` was added. Left as it was, the published extension would have
highlighted exactly as much as one with no grammar, and every test here would
still have passed. So a test reads `.vscodeignore` and asserts that the directory
of each contributed grammar path is named there.

**Two more devDependencies** → Dev only, and neither reaches `dist`: the Vite
client and server builds read from `src`, and nothing in `src` imports them
outside the test. They are the same two packages VS Code itself tokenizes with.

**A grammar is a second parser, and it will drift from the lexer** → It will, at
the edges: `1ABC DEF` is three tokens to the lexer and none to the grammar. The
drift is bounded to malformed input, where the grammar's answer is "no colour"
and the server's arrives a moment later to correct it. The line shapes real files
contain are covered by tests over both.

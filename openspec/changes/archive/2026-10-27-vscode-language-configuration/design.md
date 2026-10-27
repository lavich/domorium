## Context

`apps/vscode/package.json` contributes the `gedcom` language with `id`,
`aliases`, `extensions` and `icon`, no `configuration`, and no
`configurationDefaults`. `.vscodeignore` excludes everything not listed;
`src/contributions.test.ts` already checks the manifest against the files it
names.

VS Code has two notions of a word:

- The language's word definition — the `wordPattern` of its language
  configuration — read by `getWordAtPosition`: word-based suggestions, and the
  range a completion replaces when the item carries none
  (`wordHelper.ts:10,37-45,168` on vscode main). The GEDCOM server's completion
  items carry no range (`packages/language-service/src/libs/completion/completion.ts:18-23`).
- `editor.wordSeparators`, a set of characters, read by double-click and word
  movement and deletion (`cursorWordOperations.ts:741-742`,
  `wordOperations.ts:48`). Its default contains `@`.

## Goals / Non-Goals

**Goals:** an xref is one word in both notions; GEDCOM declares no comment
syntax. See proposal.md — User's decision.

**Non-Goals:** auto-closing `@`, Enter or indentation rules, folding markers,
and other hosts.

## Decisions

### The word pattern is VS Code's default, with the xref tried first

```text
(@[A-Za-z0-9_]+@)|(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)
```

The second and third alternatives are VS Code's default word definition
(`DEFAULT_WORD_REGEXP`, `wordHelper.ts`), so everything but an xref behaves as
it does today; the xref alternative comes first, so `@I1@` wins over the
default's split at `@`. The character class is the lexer's xref token
(`packages/validator/src/parser/lexer.ts`). In the JSON file every backslash is
doubled and the backtick is not escaped; no `flags` are set, as `u` would reject
the default's escapes.

### Separators are a per-language default, not a language-configuration key

`contributes.configurationDefaults["[gedcom]"]["editor.wordSeparators"]` is VS
Code's default separator string with `@` removed. It is a default, so a user's
setting for `[gedcom]` or for the editor wins. A set of characters cannot say
"`@` joins only inside `@…@`", which is the e-mail trade-off the user accepted.

### Comments are declared empty, as documentation

`"comments": {}` behaves as no configuration does — Toggle Comment does nothing
either way (`lineCommentCommand.ts:91-94`) — and records that the absence is
intended, so nobody adds `#` or `//` later.

### Tests read the files as VS Code does

The test parses `language-configuration.json` with `JSON.parse` (it has no
comments), builds the `wordPattern` with the `g` flag, and takes the word at a
position as VS Code does: the match whose start is at or before the position and
whose end is at or after it. The separators test compares the default against VS
Code's default string, held in the test as the fixture it is derived from.

## Risks / Trade-offs

- [Both notions are exercised only through their regular expression and string,
  not inside VS Code] → the PR leaves a manual check in a real VS Code as what
  remains: double-click `@I1@`, Ctrl+←/→ across it, complete over it.
- [Double-clicking an e-mail address selects `john@example`] → accepted; a user
  can restore `@` in their own `[gedcom]` setting.

## Implementation

- The manifest already had `configurationDefaults["[gedcom]"]` (semantic
  highlighting); the separators joined that entry.
- The word pattern's default alternatives are written with the backtick and
  tilde unescaped; the class is the same as VS Code's.
- `npx @vscode/vsce ls --no-dependencies` lists `language-configuration.json`.
- The follow-up for the other hosts is #467.
- Code review found that completion inserts at the cursor by default and the
  server's items carry no range, so this change does not fix typing a new
  pointer; the README, changelog and spec say only what it does fix, and the
  server-side fix is #468.
- An at-sign now joins words everywhere, so `DJULIAN` in `@#DJULIAN@`
  double-clicks with its closing `@`; the changelog says so beside the e-mail
  case.

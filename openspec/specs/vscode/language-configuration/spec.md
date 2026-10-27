# vscode/language-configuration Specification

## Purpose

States how VS Code's own text handling — what a word is for suggestions,
completion, selection and movement, and what a comment is — treats a GEDCOM
document, where the language server is not involved.

## Requirements

### Requirement: An xref is one word to the language's word pattern

The extension SHALL contribute, for the `gedcom` language, a word pattern under
which an xref — `@`, one or more of `A-Z`, `a-z`, `0-9` and `_`, then `@` — is a
single word wherever it stands on the line, and under which other text splits as
VS Code's default word pattern splits it. A position at the end of a word
belongs to it, as in VS Code.

#### Scenario: An xref in a pointer payload

- **WHEN** the word at any position from the first `@` to the last `@` of
  `@I1@` in `1 HUSB @I1@` is taken by the word pattern
- **THEN** it is `@I1@`

#### Scenario: An xref that defines a record

- **WHEN** the word at a position inside `@F12@` in `0 @F12@ FAM` is taken by
  the word pattern
- **THEN** it is `@F12@`

#### Scenario: Replacing an existing xref with a completion

- **WHEN** a completion that carries no range of its own is accepted in VS
  Code's replace mode with the cursor inside `@I1@` in `1 HUSB @I1@`
- **THEN** the range it replaces, taken by the word pattern, is the whole
  `@I1@`

#### Scenario: An extension tag

- **WHEN** the word at a position inside `_UID` in `1 _UID 1234` is taken by the
  word pattern
- **THEN** it is `_UID`

#### Scenario: Words of a payload

- **WHEN** the words of `1 NAME John /Doe/` and of `1 EMAIL john@example.com`
  are listed by the word pattern
- **THEN** they are `1`, `NAME`, `John`, `Doe`, and `1`, `EMAIL`, `john`,
  `example`, `com`

### Requirement: An at-sign does not separate words for selection and movement

The extension SHALL default `editor.wordSeparators` for the `gedcom` language to
VS Code's default separators without `@`, so that double-click, word movement
and word deletion treat an xref as one word. A user's own setting SHALL take
precedence.

#### Scenario: The separators GEDCOM gets

- **WHEN** the extension's configuration defaults for `[gedcom]` are read
- **THEN** `editor.wordSeparators` is VS Code's default set with `@` removed and
  nothing else changed

#### Scenario: An at-sign that is not part of an xref

- **WHEN** the separators are applied to `john@example.com` and to
  `@#DJULIAN@`
- **THEN** `john@example` and `com` are words, as `.` still separates, and
  `DJULIAN@` is one, as `#` still separates

### Requirement: GEDCOM declares no comment syntax

The language configuration SHALL declare neither a line comment nor a block
comment.

#### Scenario: The comment syntax declared

- **WHEN** the language configuration is read
- **THEN** its `comments` declares no `lineComment` and no `blockComment`

### Requirement: Nothing is inserted on the user's behalf

The language configuration SHALL declare no auto-closing pairs, no surrounding
pairs, no indentation rules and no Enter rules.

#### Scenario: Typing an at-sign

- **WHEN** the language configuration is read
- **THEN** it declares no auto-closing pair for `@`, and no rule that inserts
  text on Enter

### Requirement: The configuration ships in the package

The extension manifest SHALL name the language configuration for the `gedcom`
language, and the packaged extension SHALL contain it.

#### Scenario: The packaged extension

- **WHEN** the extension is packaged
- **THEN** the language configuration the manifest names is in the package

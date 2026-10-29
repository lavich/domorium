## Purpose

States which characters the CodeMirror GEDCOM preset counts as part of a word,
and so what CodeMirror's own double-click, word movement and word deletion take
as one word in a GEDCOM document, where the language service is not involved.

## ADDED Requirements

### Requirement: An at-sign is a word character in a GEDCOM document

The GEDCOM preset (`createGedcomExtensions`) SHALL declare `@` a word character
for the document it is installed in, so that an xref is one word to
CodeMirror's word lookup, double-click, word movement and word deletion. Every
other character SHALL be categorised as CodeMirror categorises it without the
preset. The declaration SHALL come with the preset alone, without the
standalone editor preset, so that every host composing it gets it.

#### Scenario: An xref in a pointer payload

- **WHEN** the word at any position from the first `@` to just after the last
  `@` of `@I1@` in `1 HUSB @I1@` is taken in a state built from the GEDCOM
  preset alone
- **THEN** it is `@I1@`

#### Scenario: An xref that defines a record

- **WHEN** the word at a position inside `@F12@` in `0 @F12@ FAM` is taken
- **THEN** it is `@F12@`

#### Scenario: Moving and deleting by word over an xref

- **WHEN** the cursor stands just before `@I1@` in `1 HUSB @I1@` and moves one
  word forward, and, separately, stands at the end of that line and deletes
  one word backward
- **THEN** the cursor lands at the end of the line, and the line reads
  `1 HUSB `

#### Scenario: An extension tag

- **WHEN** the word at a position inside `_UID` in `1 _UID 1234` is taken
- **THEN** it is `_UID`

#### Scenario: An at-sign that is not part of an xref

- **WHEN** the word at a position inside `john` in `1 EMAIL john@example.com`,
  and at a position inside `DJULIAN` in `2 DATE @#DJULIAN@ 1 JAN 1700`, is
  taken
- **THEN** they are `john@example`, as `.` still separates, and `DJULIAN@`, as
  `#` still separates

#### Scenario: A document without the preset

- **WHEN** the word at a position inside `@I1@` in `1 HUSB @I1@` is taken in a
  state built without the GEDCOM preset
- **THEN** it is `I1`

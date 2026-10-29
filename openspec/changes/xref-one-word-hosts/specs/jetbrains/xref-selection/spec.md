## Purpose

States what the JetBrains plugin makes double-click and Extend Selection select
on an xref in a GEDCOM file, and which word handling it leaves to the platform,
where the language server is not involved.

## ADDED Requirements

### Requirement: Double-click and Extend Selection take an xref whole

In a GEDCOM file, selecting the word at the caret — by double-click, or by
Extend Selection from no selection or from a selection inside an xref — SHALL
select the whole xref when the caret is on one: `@`, one or more of `A-Z`,
`a-z`, `0-9` and `_`, then `@`. No narrower range inside the xref SHALL be
offered on the way. A caret just after the closing `@`, where the platform
takes the character before the caret, SHALL count as on the xref.

#### Scenario: An xref in a pointer payload

- **WHEN** the word is selected with the caret on any character of `@I1@` in
  `1 HUSB @I1@`, or at the end of that line
- **THEN** the selection is `@I1@`

#### Scenario: An xref that defines a record

- **WHEN** the word is selected with the caret inside `@F12@` in
  `0 @F12@ FAM`
- **THEN** the selection is `@F12@`

#### Scenario: A void pointer

- **WHEN** the word is selected with the caret inside `@VOID@` in
  `1 FAMC @VOID@`
- **THEN** the selection is `@VOID@`

#### Scenario: Extending a selection inside an xref

- **WHEN** `I` is selected in `@I1@` and Extend Selection is invoked
- **THEN** the selection is `@I1@`

### Requirement: Text that is not an xref selects as the platform selects it

The plugin SHALL NOT change word selection anywhere the caret is not on an
xref, nor in a file that is not a GEDCOM file. An at-sign outside an xref —
in an e-mail address, or in a GEDCOM 5.5.1 calendar escape such as
`@#DJULIAN@` — SHALL NOT join words.

#### Scenario: An e-mail address in a payload

- **WHEN** the word is selected with the caret inside `john` in
  `1 EMAIL john@example.com`
- **THEN** the selection is `john`

#### Scenario: A calendar escape

- **WHEN** the word is selected with the caret inside `DJULIAN` in
  `2 DATE @#DJULIAN@ 1 JAN 1700`
- **THEN** the selection is `DJULIAN`

#### Scenario: A plain text file

- **WHEN** the word is selected with the caret inside `@I1@` in a `.txt` file
  reading `1 HUSB @I1@`
- **THEN** the selection is `I1`

### Requirement: Word movement is the platform's, and documented as such

The plugin SHALL leave word movement and word deletion to the platform, which
stops at each `@` of an xref in a file of the plain-text language, and its
README SHALL name that as a known gap.

#### Scenario: The README

- **WHEN** the plugin's README is read
- **THEN** it says that double-click and Extend Selection take an xref whole,
  and that moving or deleting by word still stops at each `@`

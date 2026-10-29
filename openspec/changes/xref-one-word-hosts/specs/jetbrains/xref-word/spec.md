## Purpose

States how the JetBrains plugin makes the IDE's own word handling — double-click,
Extend and Shrink Selection, moving and deleting by word — treat an xref in a
GEDCOM file, where the language server is not involved.

## ADDED Requirements

### Requirement: What counts as an xref to the IDE's word handling

In a GEDCOM file, an xref SHALL be any run of `@`, one or more of `A-Z`, `a-z`,
`0-9` and `_`, then `@`, found left to right on the caret's line, wherever it
stands — in a pointer, a record's identifier or the text of a `NOTE`. An
at-sign that does not belong to such a run SHALL NOT join words. For selecting
the word, the caret SHALL count as on an xref when the character after it is one
of the xref's, or when it stands just after the closing `@` at the end of a line
or before whitespace; just after the closing `@` before any other character,
such as `)`, it SHALL NOT.

#### Scenario: Escaped at-signs

- **WHEN** the word is selected with the caret on `b` in `1 NOTE a@@b@@c`, and
  with the caret on `I` in `1 NOTE @@I1@@`
- **THEN** the selections are `@b@` and `@I1@`

#### Scenario: An xref before punctuation

- **WHEN** the word is selected with the caret just after the closing `@` in
  `1 NOTE (@I1@)`
- **THEN** the selection is not `@I1@`: the caret is on `)`, and no range of the
  xref is offered

### Requirement: Double-click and Extend Selection take an xref whole

In a GEDCOM file, selecting the word at the caret — by double-click, or by
Extend Selection from no selection or from a selection inside an xref — SHALL
select the whole xref when the caret is on one, and no narrower range inside
it SHALL be offered on the way. Shrink Selection from the whole xref SHALL NOT
stop at a range inside it. Each caret SHALL be handled on its own.

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

#### Scenario: Shrinking from an xref

- **WHEN** `@I1@` is selected, after Extend Selection from a caret inside it,
  and Shrink Selection is invoked
- **THEN** nothing inside `@I1@` is selected

#### Scenario: Two carets

- **WHEN** Extend Selection is invoked with one caret inside `@I1@` and another
  inside `@F1@` in a GEDCOM file
- **THEN** `@I1@` and `@F1@` are selected whole

### Requirement: Moving by word never stops inside an xref

In a GEDCOM file, moving the caret one word forward or backward — with or
without extending the selection, and in either CamelHumps mode — SHALL NOT
leave the caret strictly inside an xref. From inside an xref it SHALL land on
the xref's edge in the direction of travel. A stop the platform would make
strictly inside an xref SHALL move to that xref's edge in the direction of
travel. When the plugin moves the caret itself, the plain variants SHALL clear
the selection, and the extending variants SHALL select from where the
selection was anchored before the move to the new caret. Every other stop SHALL
be the platform's. Each caret SHALL be handled on its own.

#### Scenario: Forward over an xref

- **WHEN** the caret stands just before `@I1@` in `1 HUSB @I1@`, or inside it,
  and moves one word forward
- **THEN** it lands at the end of the line

#### Scenario: Backward over an xref

- **WHEN** the caret stands at the end of `1 HUSB @I1@`, or inside `@I1@`, and
  moves one word backward
- **THEN** it lands just before `@I1@`

#### Scenario: Extending the selection by word

- **WHEN** the caret stands just before `@I1@` in `1 HUSB @I1@` and moves one
  word forward while extending the selection
- **THEN** the selection is `@I1@`

#### Scenario: Moving from inside an xref with a selection

- **WHEN** `I` is selected in `@I1@`, with the caret after it, and the caret
  moves one word forward, once without and once while extending the selection
- **THEN** without extending, nothing is selected and the caret is just after
  `@I1@`; extending, the selection runs from just before `I` to just after
  `@I1@`

#### Scenario: CamelHumps

- **WHEN** the caret stands just before `@I1@` in `1 HUSB @I1@` and moves one
  word forward in the CamelHumps mode other than the editor's setting
- **THEN** it lands at the end of the line

#### Scenario: Two carets

- **WHEN** one caret stands just before `@I1@` in `1 HUSB @I1@` and another
  just before `@F1@` in `1 FAMS @F1@`, and both move one word forward
- **THEN** each lands at the end of its line

#### Scenario: An e-mail address

- **WHEN** the caret moves one word forward, and one word backward, from each
  position of `1 EMAIL john@example.com` in a GEDCOM file
- **THEN** it lands where it lands in a plain text file with the same line

### Requirement: Deleting by word takes the xref's side of the caret

In a GEDCOM file, with no selection, deleting one word backward with the caret
inside an xref or
just after its closing `@` SHALL delete from the xref's opening `@` to the
caret; deleting one word forward with the caret on an xref SHALL delete from
the caret to the end of the xref. Both SHALL hold in either CamelHumps mode.
With a selection, or anywhere else, each SHALL do what the platform does.

#### Scenario: Deleting an xref backward

- **WHEN** the caret stands at the end of `1 HUSB @I1@` and one word is deleted
  backward
- **THEN** the line reads `1 HUSB `

#### Scenario: Deleting an xref forward

- **WHEN** the caret stands just before `@I1@` in `1 HUSB @I1@` and one word is
  deleted forward
- **THEN** the line reads `1 HUSB `

#### Scenario: Deleting inside an xref

- **WHEN** the caret stands between `@I` and `1@` in `1 HUSB @I1@`, and one word
  is deleted backward
- **THEN** the line reads `1 HUSB 1@`

#### Scenario: Deleting in the other CamelHumps mode

- **WHEN** the caret stands at the end of `1 HUSB @I1@` and one word is deleted
  backward, and, separately, just before `@I1@` and one word is deleted
  forward, each in the CamelHumps mode other than the editor's setting
- **THEN** the line reads `1 HUSB ` both times

#### Scenario: Deleting with a selection

- **WHEN** `HUSB @I` is selected in `1 HUSB @I1@`, with the caret after it, and
  one word is deleted backward
- **THEN** the selection is deleted and the line reads `1 1@`, as the platform
  deletes a selection first

#### Scenario: An e-mail address

- **WHEN** one word is deleted backward, and forward, at each position of
  `1 EMAIL john@example.com` in a GEDCOM file
- **THEN** the line reads as it does after the same deletion in a plain text
  file

### Requirement: Every word movement and word deletion action is covered

The behaviour above SHALL hold for each of the platform's twelve word actions:
next and previous word, each with and without extending the selection and in
either CamelHumps mode, and delete to word start and to word end, each in
either CamelHumps mode.

#### Scenario: Each action over an xref

- **WHEN** each of the twelve actions is run in `1 HUSB @I1@`, forward ones
  with the caret just before `@I1@` and backward ones at the end of the line
- **THEN** the movements land on the far edge of `@I1@`, the extending ones
  with `@I1@` selected, and the deletions leave `1 HUSB `

### Requirement: Other text and other files are the platform's

The plugin SHALL NOT change any of these actions where the caret is not on an
xref, nor in a file that is not a GEDCOM file.

#### Scenario: A calendar escape

- **WHEN** the word is selected with the caret inside `DJULIAN` in
  `2 DATE @#DJULIAN@ 1 JAN 1700`
- **THEN** the selection is `DJULIAN`

#### Scenario: An e-mail address

- **WHEN** the word is selected with the caret inside `john` in
  `1 EMAIL john@example.com`
- **THEN** the selection is `john`

#### Scenario: A plain text file

- **WHEN** the word is selected with the caret inside `@I1@`, and the caret
  moves one word forward from just before it, in a `.txt` file reading
  `1 HUSB @I1@`
- **THEN** the selection is `I1`, and the caret stops where the platform stops
  without the plugin

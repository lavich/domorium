## ADDED Requirements

### Requirement: Every completion item states the text it replaces

`getCompletionItems` SHALL give every item a `textEdit` of `newText`, `insert` and `replace`, where `newText` is the item's label. The token under the cursor SHALL be the maximal run, on the cursor's line, of characters that are neither whitespace nor `,`, that contains the cursor or ends or begins at it. `insert` SHALL run from the token's start to the cursor, and `replace` from the token's start to its end. With no such token, both SHALL be empty at the cursor.

#### Scenario: An at-sign already typed

- **WHEN** completions are asked at the end of `1 HUSB @I`
- **THEN** the item `@I1@` has `insert` and `replace` both covering `@I`, so accepting it writes `1 HUSB @I1@`

#### Scenario: The cursor inside an existing xref

- **WHEN** completions are asked between `@I` and `1@` in `1 HUSB @I1@`
- **THEN** `insert` covers `@I` and `replace` covers `@I1@`

#### Scenario: A calendar escape

- **WHEN** completions are asked at the end of `2 DATE @#DJ` in a 5.5.1 document
- **THEN** the item `@#DJULIAN@` replaces `@#DJ`

#### Scenario: Nothing typed after a space

- **WHEN** completions are asked at the end of `1 SEX `
- **THEN** `insert` and `replace` are empty at the cursor

#### Scenario: A tag

- **WHEN** completions are asked between `BI` and `RT` in `1 BIRT`
- **THEN** `insert` covers `BI` and `replace` covers `BIRT`

#### Scenario: A value in a list

- **WHEN** completions are asked at the end of `1 RESN CONFIDENTIAL, LO` in a GEDCOM 7 document
- **THEN** `insert` and `replace` cover `LO` and nothing before the comma

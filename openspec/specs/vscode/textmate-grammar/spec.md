# vscode/textmate-grammar Specification

## Purpose

Gives the VS Code extension a static syntax layer for GEDCOM, so a file carries
colour before and without a language server, and so a GEDCOM code fence in
Markdown — which no language server can reach — carries colour at all.

## Requirements

### Requirement: GEDCOM is coloured with no language server

The extension SHALL contribute a grammar for the `gedcom` language that colours a
GEDCOM line from its text alone, requiring no connection, no response and no
document analysis.

A GEDCOM line is `level [@xref@] TAG [payload]`. Each of those four parts SHALL
carry its own scope.

#### Scenario: A file is opened before the server connects

- **WHEN** a `.ged` file is opened and the language server has not yet answered
- **THEN** its levels, tags, pointers and payloads are already coloured

#### Scenario: A host that runs no server at all

- **WHEN** the extension runs where the language server cannot start
- **THEN** GEDCOM is still coloured

#### Scenario: A record-defining line

- **GIVEN** the line `0 @I1@ INDI`
- **THEN** `0`, `@I1@` and `INDI` each carry a scope, and the scope on `@I1@`
  is not the scope a pointer in a payload carries

#### Scenario: A line pointing at a record

- **GIVEN** the line `1 FAMS @F1@`
- **THEN** `@F1@` carries the payload-pointer scope rather than the payload scope

#### Scenario: A line carrying text

- **GIVEN** the line `1 NAME John /Doe/`
- **THEN** `John /Doe/` carries one payload scope as a whole, with no further
  structure picked out inside it

### Requirement: The static layer and the semantic layer paint alike

For every GEDCOM token that both layers describe, the scope the grammar gives it
SHALL be the scope that its semantic token type resolves to. A file SHALL NOT
visibly change appearance when the language server connects, and SHALL NOT
change back when it disconnects.

Two consequences are normative, not incidental:

- The grammar SHALL NOT distinguish tags from one another. Every tag carries the
  one scope that the `keyword` semantic type resolves to, because that is the
  only type semantic tokens give a tag.
- The grammar SHALL NOT pick out structure inside a payload — a date, a surname,
  a calendar escape — because semantic tokens give a payload one type.

#### Scenario: The server connects

- **WHEN** semantic tokens arrive for a document the grammar has already coloured
- **THEN** no token changes colour

#### Scenario: A payload whose meaning the grammar could guess

- **GIVEN** the line `2 DATE 1 JAN 2000`
- **THEN** the payload is coloured as a payload, and `JAN` is not coloured as a
  month

#### Scenario: The fallback scopes are changed

- **WHEN** the scope a semantic token type falls back to is changed
- **THEN** the grammar disagrees with it, and that disagreement is reported

### Requirement: A GEDCOM code fence in Markdown is coloured

The extension SHALL inject a grammar into Markdown that colours the content of a
fenced code block whose language is `gedcom`, and SHALL declare that content as
embedded GEDCOM so the editor treats it as GEDCOM rather than as prose.

The fence language SHALL be matched without regard to case. It SHALL NOT be
matched loosely: a fence whose language is something else keeps whatever
highlighting it had.

#### Scenario: A GEDCOM fence

- **GIVEN** a Markdown file containing a fence opened as ` ```gedcom `
- **THEN** the lines inside it are coloured exactly as they would be in a `.ged`
  file

#### Scenario: The same fence in upper case

- **GIVEN** a fence opened as ` ```GEDCOM `
- **THEN** it is coloured the same way

#### Scenario: A fence in another language

- **GIVEN** a fence opened as ` ```json ` or ` ```text `
- **THEN** the GEDCOM grammar does not colour it

#### Scenario: A tilde fence, or a fence indented inside a list

- **GIVEN** a GEDCOM fence opened with tildes, or indented under a list item
- **THEN** it is coloured, and the closing fence ends the block

### Requirement: The grammar judges nothing

The grammar SHALL NOT report a line, a tag or a value as invalid, and SHALL NOT
carry any list of tags, enumerated values or value formats. What is valid GEDCOM
is answered by the validator, against a resolved version of the specification,
and a second answer derived from a regular expression would contradict it.

Content the grammar does not recognise SHALL be left uncoloured rather than
marked as an error.

#### Scenario: A value the validator would reject

- **GIVEN** the line `1 SEX Male`
- **THEN** `Male` is coloured as an ordinary payload, and the grammar reports
  nothing about it

#### Scenario: An extension tag

- **GIVEN** the line `1 _MYTAG something`
- **THEN** `_MYTAG` carries the same scope as any other tag

#### Scenario: A fence that is not GEDCOM at all

- **GIVEN** a ` ```gedcom ` fence whose content is specification notation
  rather than GEDCOM lines
- **THEN** the lines it cannot read are left plain, and nothing is marked invalid

### Requirement: The grammar reaches the published extension

The grammar files SHALL be part of the packaged extension. A change to packaging
that leaves them out SHALL fail the repository's checks rather than ship an
extension that silently highlights nothing.

#### Scenario: The extension is packaged

- **WHEN** the extension is packaged for publication
- **THEN** every file named by `contributes.grammars` is present in the package

#### Scenario: A contribution names a file that is not there

- **WHEN** a grammar path in the manifest does not resolve to a file
- **THEN** the checks fail and name the path

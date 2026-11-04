# language-service/header-trailer-quick-fix Specification

## Purpose

TBD - created by archiving change header-trailer-quick-fixes. Update Purpose after archive.

## Requirements

### Requirement: A missing trailer is added

For a diagnostic that reports a missing `TRLR`, the service SHALL offer one action,
**Add trailer**, that inserts `0 TRLR` at the very end of the text, as the last record. It SHALL use the line
terminator the document already uses, and SHALL start a new line first where the text does
not end with one. The inserted `0 TRLR` is itself followed by a terminator.

#### Scenario: A file that stops before its trailer

- **WHEN** a file ends with `1 NAME A /B/` and a terminator and has no `0 TRLR`
- **THEN** **Add trailer** inserts `0 TRLR` and a terminator after that line

#### Scenario: A last line without a terminator

- **WHEN** the last line is `1 NAME A /B/` with no terminator after it
- **THEN** **Add trailer** inserts a terminator, then `0 TRLR`, then a terminator

#### Scenario: Blank lines after the last record

- **WHEN** the file ends with `1 NAME A /B/` and two blank lines
- **THEN** **Add trailer** inserts `0 TRLR` after the blank lines, at the end of the text

#### Scenario: The document's own terminator

- **WHEN** the document uses `\r\n`
- **THEN** every terminator the action inserts is `\r\n`

### Requirement: A missing header is added for GEDCOM 7.0 only

For a diagnostic that reports a missing `HEAD`, the service SHALL offer one action, named
for the version it writes, that inserts a `HEAD` with the version `7.0` before the first
record. It SHALL NOT offer an action for any other version, because a `5.5.1` header needs
a submitter record and a character set, and choosing those is the author's.

#### Scenario: A file with no header

- **WHEN** the file begins with `0 @I1@ INDI`
- **THEN** **Add a GEDCOM 7.0 header** inserts `0 HEAD`, `1 GEDC` and `2 VERS 7.0`, each
  followed by a terminator, before that line

#### Scenario: A header that names no version

- **WHEN** the file has `0 HEAD` and no `HEAD.GEDC.VERS`
- **THEN** no action is offered

### Requirement: An empty file can be completed in two actions

The actions SHALL be offered for an empty document, so that applying the header action and
then the trailer action leaves a document with no diagnostics.

#### Scenario: From nothing to a valid file

- **WHEN** the document is empty and **Add a GEDCOM 7.0 header** is applied
- **THEN** **Add trailer** is offered for the diagnostic that follows
- **AND** once it is applied the document has no diagnostics

### Requirement: An action is offered only for the diagnostic it answers

Neither action SHALL be offered for any other diagnostic, and neither SHALL be offered when
the text it would add is already there.

#### Scenario: A trailer that exists

- **WHEN** a diagnostic that reports a missing `TRLR` is presented for a document that has
  a `0 TRLR`
- **THEN** **Add trailer** is not offered

#### Scenario: A zero-width diagnostic does not widen the other actions

- **WHEN** the cursor is on the first or the last character of an unresolved xref
- **THEN** the actions offered are the ones offered before this capability existed

### Requirement: A diagnostic without a width is answered on its line

A diagnostic whose range has no width SHALL be answered by a request on the same line, since
a host may widen an empty marker to a character before it asks. A diagnostic with a width
keeps the rule it had.

#### Scenario: A request widened by the host

- **WHEN** the document has no header and the host asks for actions over the first character
- **THEN** **Add a GEDCOM 7.0 header** is offered

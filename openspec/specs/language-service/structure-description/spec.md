# language-service/structure-description Specification

## Purpose

States how the service describes the structure at a position so that an editor can draw a
form for it without knowing GEDCOM tags: its fields, their rules, and what the document
already holds.

## Requirements

### Requirement: The structure at a position is described

The service SHALL describe the innermost structure whose line contains the position, or,
when the position is on a continuation line, the structure it continues. The description
SHALL give the document's version, the range of the structure and its own field id.

Every field SHALL carry an id, a dialect-neutral path made of the tags from the record
down to it, such as `INDI.NAME.GIVN`, the tag, whether it is required, the most
occurrences it allows (none for unbounded), and its payload kind with whether the
structure's own payload is required, whether its value may hold a line break, and whether a
line break is the ordinary case for it. A field SHALL also carry the identifier the dialect's
schema gives it, as data beside the id and not in its place.

A field whose payload is a pointer, or text or a pointer, SHALL list the records of the
required type the document holds, each with its xref and the label the service gives the
record elsewhere, so that a caller can offer them. A field SHALL say
whether the pointer it holds has a reciprocal on the other record.

A host SHALL be able to choose its labels by id alone.

#### Scenario: The same field in both dialects

- **WHEN** a 5.5.1 document and a 7.0 document each hold an `INDI.NAME`
- **THEN** the field for `GIVN` has the id `INDI.NAME.GIVN` in both
- **AND** its schema identifier differs

#### Scenario: A pointer lists its candidates

- **WHEN** the structure is an `INDI` and the field is `FAMC`
- **THEN** the field lists every `FAM` record of the document by xref
- **AND** each is listed with its xref and a label
- **AND** it is marked as having a reciprocal

#### Scenario: A position on a continuation line

- **WHEN** the position is on a `CONT` line beneath a `NOTE`
- **THEN** the description is that of the `NOTE`

#### Scenario: A position that is on no structure

- **WHEN** the position is past the last line or on a blank line
- **THEN** the service refuses with `not-a-structure`

#### Scenario: A document with no dialect

- **WHEN** the document was checked against no dialect
- **THEN** the service refuses with `no-dialect`

### Requirement: What the document already holds is reported with ranges

For each field, the description SHALL list the occurrences already in the document, in
document order. Each occurrence SHALL carry the range of its line and of its whole subtree,
and its logical value: continuation lines joined, and an escaped at sign of a text value
read as one.
Every field the dialect allows SHALL appear whether or not it is held, so that a caller can
draw the empty ones.

A tag the dialect does not define, including an extension tag, SHALL NOT appear among the
fields; the occurrences of such tags SHALL be listed apart, so that a caller sees that
they exist and leaves them as written.

#### Scenario: A name with two parts

- **WHEN** an `INDI.NAME` holds `GIVN Anna` and `SURN Lee`
- **THEN** the `GIVN` field lists one occurrence with the value `Anna` and its range
- **AND** the `NICK` field lists none

#### Scenario: A value of several lines

- **WHEN** a `NOTE` is written as a line and a `CONT` beneath it
- **THEN** the occurrence's value is both lines joined by a line break
- **AND** its subtree range covers the continuation

#### Scenario: A custom tag

- **WHEN** an `INDI.NAME` holds a `_SOUNDEX` line
- **THEN** it is listed with the occurrences of undefined tags and not among the fields

#### Scenario: A structure that is not there yet

- **WHEN** the position is on an `INDI` with no `NAME` and the caller asks about `NAME`
- **THEN** the field list is that of a name and every field has no occurrences

### Requirement: A structure can be described by its schema path

The service SHALL describe the fields of a structure by a schema path from a record, such
as `INDI.NAME.TRAN.LANG`, with no position, in the document's dialect. The description
SHALL be that of a structure with no occurrences, with the same field ids, payload detail
and pointer candidates as a described position.

#### Scenario: A translation of a name that is not there

- **WHEN** the path is `INDI.NAME.TRAN` in a 7.0 document that holds no `NAME`
- **THEN** every field of a translation is listed with no occurrences
- **AND** the ids begin `INDI.NAME.TRAN.`

#### Scenario: A path the dialect does not have

- **WHEN** the path is `INDI.NAME.TRAN` in a 5.5.1 document
- **THEN** the service refuses with `unknown-path`

### Requirement: An extension line is described as a structure with no known fields

The service SHALL describe a line whose tag is an extension tag, or a line beneath one, as a
structure marked as an extension: its id is the path of its tags, its payload is text, it
lists no fields, and the lines beneath it are listed with the occurrences of undefined
tags. An extension line the service can set or remove SHALL be one it can describe, and a
structure asked about beneath one by its tag SHALL be described the same way.

#### Scenario: A custom line

- **WHEN** the position is on `1 _MILITARY Cavalry`
- **THEN** the description is marked as an extension, with the value `Cavalry` and no fields

#### Scenario: A line beneath a custom line

- **WHEN** the position is on a `2 DATE` beneath `1 _MILITARY`
- **THEN** the description is marked as an extension, with the id `INDI._MILITARY.DATE`

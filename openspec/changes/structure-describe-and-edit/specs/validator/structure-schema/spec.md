## Purpose

States what a parsed document can tell a caller about the structure at a node: which
substructures the dialect it was checked against allows there, how often, and what each
one's payload is. A host reads this instead of keeping its own copy of the standard.

## ADDED Requirements

### Requirement: The fields a structure may hold are readable

For a node of a document checked against a dialect, the document SHALL report every
substructure the dialect allows beneath it. For each, it SHALL report the tag, the
minimum and the maximum number of occurrences (a maximum of none meaning unbounded),
and the kind of payload. The kind SHALL be one of a closed list: text, a non-negative
integer, a boolean, an enumeration with its permitted values, an enumeration that takes
several, a pointer with the tag of the record it points to, text or a pointer (as a
5.5.1 `NOTE` or `SOUR` may be written), a structure with no payload, a date, a date period, an
exact date, a time, an age, a language tag, a media type, a latitude, a longitude, a
personal name, or a tag definition. It SHALL also report whether the structure's own
payload is required, which it is when the dialect does not admit an empty payload.

The document SHALL report the kind and nothing of the rule behind it: the grammar of a
date or an age stays with the validator.

The report SHALL be that of the dialect the document was checked against, so that the
same structure differs between 5.5.1 and 7.0 as the standards differ. For a document
checked against no dialect the document SHALL report nothing.

#### Scenario: A name in 7.0

- **WHEN** the node is an `INDI.NAME` of a 7.0 document
- **THEN** the fields include `GIVN`, `SURN`, `NPFX`, `NSFX`, `SPFX`, `NICK`, `TYPE`,
  `TRAN`, `NOTE`, `SNOTE` and `SOUR`
- **AND** `TYPE` is an enumeration that lists its permitted values

#### Scenario: A name in 5.5.1

- **WHEN** the node is an `INDI.NAME` of a 5.5.1 document
- **THEN** the fields include `FONE` and `ROMN` and no `TRAN`
- **AND** `GIVN` allows one occurrence at most
- **AND** `NOTE` is reported as text or a pointer to a note record

#### Scenario: A required field

- **WHEN** the dialect requires a substructure beneath the node
- **THEN** its minimum is one

#### Scenario: Kinds a widget can be chosen by

- **WHEN** the node is an `INDI.BIRT` of a 7.0 document
- **THEN** `DATE` is a date and `PLAC` is text
- **AND** a pointer field reports the tag of the record it points to

#### Scenario: A required payload

- **WHEN** the node is an `INDI.NAME` of a 7.0 document
- **THEN** its payload is reported as required

#### Scenario: A document with no dialect

- **WHEN** the document's version could not be resolved to a dialect
- **THEN** no fields are reported

### Requirement: A payload is escaped and read back by the rules of its dialect

The package SHALL escape a payload for writing and read it back, by the dialect and the
kind of the field. A text payload SHALL have its at signs written as `@@`: every one in
5.5.1, and one at the start of a line in 7.0. Only text is escaped, text being the string kind and a list of text; a pointer, a date, a date
period, an exact date, a time, an age, a personal name, a language tag, a media type and the
other kinds SHALL be written as given, because several of them use the at sign in their own
grammar. Reading SHALL undo the
escape for a text payload and change nothing in the others. The value a caller sets and
the value it reads back SHALL be the same.

#### Scenario: An at sign in text in 5.5.1

- **WHEN** the text `a@b` is escaped for a 5.5.1 field of text kind
- **THEN** it is written `a@@b` and read back as `a@b`

#### Scenario: An at sign in text in 7.0

- **WHEN** the text `a@b` and the text `@home` are escaped for a 7.0 field of text kind
- **THEN** the first is written `a@b` and the second `@@home`

#### Scenario: A pointer and a calendar escape

- **WHEN** `@S1@` is escaped for a pointer, and `@#DJULIAN@ 3 MAR 1721` for a 5.5.1 date
- **THEN** both are written as given

### Requirement: A structure that does not exist yet can be asked about

The document SHALL answer for a tag beneath a node as well as for a node already in the
text, so that a caller can ask what an `INDI` may gain before it holds a `NAME`.

#### Scenario: A person with no name

- **WHEN** an `INDI` record holds no `NAME`
- **THEN** asking about `NAME` beneath it reports the fields of a name and its payload kind

### Requirement: A structure can be asked about by its schema path

The document SHALL answer for a path of tags from a record, such as `INDI.NAME.TRAN.LANG`,
with no node at all, in the dialect it was checked against, so that a caller can draw the
fields of a structure beneath one that is not in the text.

#### Scenario: Two levels that do not exist yet

- **WHEN** a 7.0 document holds an `INDI` with no `NAME` and the path is `INDI.NAME.TRAN`
- **THEN** the fields of a translation are reported, among them `LANG` as required

#### Scenario: A path the dialect does not have

- **WHEN** the path is `INDI.NAME.TRAN` in a 5.5.1 document
- **THEN** nothing is reported

## MODIFIED Requirements

### Requirement: The fields a structure may hold are readable

For a node of a document checked against a dialect, the document SHALL report every
substructure the dialect allows beneath it. For each, it SHALL report the tag, the
minimum and the maximum number of occurrences (a maximum of none meaning unbounded),
and the kind of payload. The kind SHALL be one of a closed list: text, a non-negative
integer, a boolean, an enumeration with its permitted values, an enumeration that takes
several, a pointer with the tag of the record it points to, text or a pointer (as a
5.5.1 `NOTE` or `SOUR` may be written), a structure with no payload, a date, a date period, an
exact date, a time, an age, a language tag, a media type, a latitude, a longitude, a
personal name, or a tag definition. An enumeration whose values outside its permitted ones the validator
tolerates as file extensions, with a warning rather than an error, SHALL say so beside its
permitted values; no other enumeration SHALL. It SHALL also report whether the structure's own
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

#### Scenario: An enumeration that tolerates file extensions

- **WHEN** the node is an `OBJE.FILE` of a 5.5.1 document
- **THEN** `FORM` is an enumeration that lists `bmp`, `gif`, `jpg`, `ole`, `pcx`, `tif` and
  `wav` and says that it tolerates file extensions
- **AND** the `TYPE` of a 7.0 `NAME` does not say so

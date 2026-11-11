# language-service/structure-edit Specification

## Purpose

States how the service adds, changes and removes one substructure at a position, so that
an editor can write a form's input into the text without knowing where a line goes, how
it is escaped, or what the dialect forbids, and without touching a line it did not mean to.

## Requirements

### Requirement: Three operations return an edit or a refusal

The service SHALL add a substructure beneath a structure, set the value of an existing
substructure, and remove an existing substructure with everything beneath it. Each SHALL
take the version the caller read and return either an edit at the document's current
version, with the problems the edit leaves, or a refusal with a code.

An edit SHALL touch only the lines it must: the lines it adds, the lines it replaces, or
the lines it removes. It SHALL NOT change the text of any other line, an undefined or
extension tag among them.

#### Scenario: The first name of a person

- **WHEN** a name with `GIVN Anna` and `SURN Lee` is added to an `INDI` that has none
- **THEN** the edit inserts a `NAME` line one level below the record and its two parts one
  level below that
- **AND** applying it leaves a document with no new error

#### Scenario: A second name

- **WHEN** a name is added to an `INDI` that already has a `NAME`
- **THEN** the new `NAME` is placed after the existing one and its subtree

#### Scenario: Changing one part

- **WHEN** the value of one `NICK` is set
- **THEN** the edit replaces only that value and no other line

#### Scenario: Changing a value that has continuation lines

- **WHEN** the value of a `NOTE` written as a line and two `CONT` lines is set to one line
- **THEN** the edit replaces the line and removes its continuation lines
- **AND** the lines beneath them are unchanged

#### Scenario: A record is not edited as a whole

- **WHEN** the position of `removeStructure` or `setValue` is a record such as an `INDI`
- **THEN** the service refuses with `record-edit-unsupported`

#### Scenario: Removing the last part of a name

- **WHEN** the only substructure of a `NAME` is removed
- **THEN** the `NAME` line stays with its payload

#### Scenario: Deleting a name that has notes

- **WHEN** an `INDI.NAME` with a `NOTE` and a `SOUR` beneath it is removed
- **THEN** the edit removes the `NAME` line and every line beneath it and no other line

#### Scenario: A custom tag is left alone

- **WHEN** a `NAME` holds a `_SOUNDEX` line and its `GIVN` is set
- **THEN** the `_SOUNDEX` line is unchanged and keeps its place

### Requirement: A line lands at the right level and place

A line SHALL be written one level below its parent. A substructure whose tag the parent
already holds SHALL be placed after the last of them and its subtree; any other SHALL be
placed after the last line of the parent's subtree. The document's line terminator SHALL
be used, and the edit SHALL begin on a fresh line where the text before it has none.

#### Scenario: A document with `\r\n`

- **WHEN** a substructure is added to a document written with `\r\n`
- **THEN** every terminator the edit inserts is `\r\n`

#### Scenario: A record that ends the file with no terminator

- **WHEN** the structure is the last in a text with no final terminator
- **THEN** the added line is on its own line and the text still ends as it did

### Requirement: Values are written as the dialect writes them

A value with line breaks SHALL be written as the line and `CONT` lines, the continuation
lines directly beneath the line and before its other children. In 5.5.1 a value whose line
would pass 255 characters, counting the level, the tag, the delimiters and the terminator,
SHALL be continued with `CONC` lines, split where no piece starts
or ends with a space and never inside an escaped at sign or a surrogate pair; 7.0 has no
`CONC`, and its lines SHALL NOT be split. A text value SHALL be escaped by the rules of
`validator/structure-schema`, each line of it on its own; a pointer, a date and a date
period SHALL be written as given. A field that may be text or a pointer in 5.5.1 SHALL be
given as one or the other by the caller, so that the service never guesses. Reading the
written value back SHALL give the value that was set.

#### Scenario: A value with a line break

- **WHEN** a `NOTE` value of two lines is added
- **THEN** it is written as the `NOTE` line and one `CONT`
- **AND** the description reads the two lines back

#### Scenario: A value with an at sign

- **WHEN** a `NICK` of `a@b` is added to a 5.5.1 document
- **THEN** the line reads `a@@b`
- **AND** the description reads `a@b` back

#### Scenario: A pointer is not escaped

- **WHEN** a `SOUR` pointer to `@S1@`, a record the document holds, is added to a 5.5.1 `NAME`
- **THEN** the line reads `@S1@`

#### Scenario: A 5.5.1 calendar date is not escaped

- **WHEN** a `DATE` of `@#DJULIAN@ 3 MAR 1721` is set on a 5.5.1 `BIRT`
- **THEN** the line is written as given and the edit is returned

#### Scenario: A long value in 5.5.1 and in 7.0

- **WHEN** a text value of 300 characters is set in a 5.5.1 document and in a 7.0 document
- **THEN** the 5.5.1 text is continued with `CONC` lines, none longer than 255 characters with its level, tag and
  terminator
- **AND** the 7.0 text is one line
- **AND** the description reads the 300 characters back

### Requirement: A name payload stays consistent with its parts

When a name is added with `GIVN` or `SURN` and no payload, the service SHALL write the
payload as the given name and the surname between slashes. When `GIVN` or `SURN` of an
existing `NAME` is set, the service SHALL replace the one piece of the payload that held
the old value, the given name before the slashes or the surname between them, and no other
character of it, so that a prefix, a suffix and an author's spacing stay. It SHALL leave the
payload as written where the old value is not found in that place. A part set to an empty
value SHALL take its piece out of the payload with the space beside it: an empty given name
leaves the surname between slashes, and an empty surname takes the slashes away.

#### Scenario: A name added with both parts

- **WHEN** a name is added with `GIVN Anna` and `SURN Lee` and no payload
- **THEN** the `NAME` payload is `Anna /Lee/`

#### Scenario: A surname changed

- **WHEN** `SURN` is set to `Poe` on a `NAME Anna /Lee/` holding `SURN Lee`
- **THEN** the payload becomes `Anna /Poe/`

#### Scenario: A prefix and a suffix stay

- **WHEN** `SURN` is set to `Poe` on a `NAME Dr. Anna /de Lee/ Jr.` holding `SURN de Lee`
- **THEN** the payload becomes `Dr. Anna /Poe/ Jr.`

#### Scenario: An emptied given name

- **WHEN** `GIVN` is set to the empty value on a `NAME Maria /Curie/` holding `GIVN Maria`
- **THEN** the payload becomes `/Curie/`

#### Scenario: An emptied surname

- **WHEN** `SURN` is set to the empty value on a `NAME Maria /Curie/` holding `SURN Curie`
- **THEN** the payload becomes `Maria`

#### Scenario: A payload the author wrote differently

- **WHEN** `SURN` is set on a `NAME` whose slashes do not hold the old `SURN`
- **THEN** the payload is unchanged

### Requirement: A value that breaks a rule is refused with the rule

Before it returns an edit the service SHALL check the text the edit produces with the same
rules as the diagnostics. A problem the validator reports as an error SHALL be returned as a
refusal when it is new, and so SHALL an unknown tag, which the validator reports as a
warning. A problem it reports as a warning or as information SHALL otherwise be returned
beside the edit and SHALL NOT refuse it.

A problem whose range starts on a line the edit writes is new, except a missing required
substructure, which is judged only by the count below. A problem elsewhere is new
only when the parent of the touched structure, in the text after the edit, holds more of
that kind than it did before, so that an old problem does not refuse an unrelated part, and
one more occurrence than allowed is not hidden by an equal message already there. A structure beneath `HEAD` is compared over the whole document,
since a change to the version or the schema declaration reaches elsewhere.

The refusal SHALL carry a code that names the rule, enough to choose a message without
reading text. A new error that no code below names SHALL be refused as `rule-violation`,
with the validator's own code in `diagnosticCode`. Every refusal that comes from a
diagnostic SHALL carry that code, so that a caller can tell an impossible day from another
failure of the same datatype, and SHALL carry the diagnostic's `data` where it has any, so
that a caller can write its own message from the facts rather than from the English one.

| Code                             | When                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| `unknown-field`                  | the dialect defines no such substructure here                         |
| `cardinality-exceeded`           | one more occurrence than the dialect allows                           |
| `value-not-in-enum`              | a value outside the permitted values                                  |
| `payload-datatype`               | a value that fails its datatype, an impossible day or year among them |
| `value-spans-lines`              | a line break in a value that keeps to one line                        |
| `value-required`                 | no value where one is required                                        |
| `unresolved-pointer`             | a pointer to a record the document does not hold                      |
| `required-field-missing`         | the edit would leave out a required substructure                      |
| `rule-violation`                 | another new error, with `diagnosticCode` of the rule                  |
| `not-a-structure`                | the position is on no structure                                       |
| `no-dialect`                     | the document was checked against no dialect                           |
| `unknown-path`                   | the schema path does not exist in the dialect                         |
| `record-edit-unsupported`        | the edit sets or removes a whole record                               |
| `reciprocal-pointer-unsupported` | the edit writes a pointer that has a reciprocal                       |
| `stale-document`                 | the version is not the document's                                     |

#### Scenario: A value outside an enumeration

- **WHEN** a `TYPE` of `nonsense` is added to a 7.0 `NAME`
- **THEN** the service refuses with `value-not-in-enum`

#### Scenario: A second occurrence of a field that may occur once

- **WHEN** a second `GIVN` is added to a 5.5.1 `NAME`
- **THEN** the service refuses with `cardinality-exceeded`

#### Scenario: A tag the dialect does not define

- **WHEN** `TRAN` is added to a 5.5.1 `NAME`
- **THEN** the service refuses with `unknown-field`

#### Scenario: A warning passes

- **WHEN** an edit leaves a problem the validator reports as a warning
- **THEN** the edit is returned and the problem is listed beside it

#### Scenario: A problem that was already there

- **WHEN** a `NAME` already has an error and an unrelated part of it is set
- **THEN** the edit is returned

#### Scenario: One more occurrence where there are already too many

- **WHEN** a 5.5.1 `NAME` already holds two `GIVN` and a third is added
- **THEN** the service refuses with `cardinality-exceeded`

#### Scenario: A bad value replaced by another bad value

- **WHEN** an invalid `TYPE` is set to another invalid `TYPE`
- **THEN** the service refuses with `value-not-in-enum`

#### Scenario: An impossible day

- **WHEN** a `DATE` of `31 FEB 1900` is set on a `BIRT`
- **THEN** the service refuses with `payload-datatype`
- **AND** its `diagnosticCode` is the validator's code for an impossible day
- **AND** its `data` is `{ day: 31, month: "FEB", monthLength: 28 }`

#### Scenario: The facts of a missing field

- **WHEN** the only `LANG` of a `TRAN` of a 7.0 `NAME` is removed
- **THEN** the refusal carries `{ missingTag: "LANG", parentTag: "TRAN" }` in `data`

#### Scenario: The facts of a pointer to nothing

- **WHEN** a `SOUR` of `@S9@` is added to a 7.0 `NAME` in a document with no such record
- **THEN** the service refuses with `unresolved-pointer`
- **AND** its `data` is `{ xref: "@S9@", requiredRecordTag: "SOUR" }`

#### Scenario: Removing a required field

- **WHEN** the only `LANG` of a `TRAN` of a 7.0 `NAME` is removed
- **THEN** the service refuses with `required-field-missing`

#### Scenario: A required field that was already missing

- **WHEN** a `TRAN` of a 7.0 `NAME` has no `LANG` and a `NICK` is added to the `TRAN`
- **THEN** the edit is returned

### Requirement: A line break is refused where the value may not span lines

A value with a line break for a field whose value may not hold one SHALL be refused with
`value-spans-lines` by `addStructure`, `setValue` and `validateValue`, children given to
`addStructure` included, and SHALL NOT be written as `CONT` lines.

#### Scenario: A date over two lines

- **WHEN** a `DATE` is set to `1 JAN` and `1900` on two lines
- **THEN** the service refuses with `value-spans-lines`, not with the code of a malformed date
- **AND** `validateValue` answers the same code for that value

#### Scenario: A note over two lines

- **WHEN** a `NOTE` is set to two lines
- **THEN** the edit is returned with a `CONT` line

### Requirement: A value can be checked without an edit

The service SHALL check one value for a field, given the structure and the tag, and return
the problems the value has as codes of the table above, without building an edit and
without taking a version. It SHALL name the rules that depend on the value alone: an
unknown field, one more occurrence than allowed, a value outside an enumeration, a value
that fails its datatype, a missing required value. The same value SHALL then be accepted or
refused by the operation that writes it for those rules; the operation stays the authority
and may refuse for a rule that depends on the rest of the document. Each problem SHALL
carry the `data` of the diagnostic it comes from, as a refusal does.

#### Scenario: A value outside an enumeration, asked while typing

- **WHEN** `nonsense` is checked as a `TYPE` of a 7.0 `NAME`
- **THEN** the answer carries `value-not-in-enum` and no edit is built

#### Scenario: A valid value

- **WHEN** `Anna` is checked as a `GIVN` of a 7.0 `NAME`
- **THEN** the answer carries no problem

#### Scenario: One occurrence too many

- **WHEN** a value is checked for a `GIVN` of a 5.5.1 `NAME` that already holds one
- **THEN** the answer carries `cardinality-exceeded`

#### Scenario: A tag in the wrong case, asked while typing

- **WHEN** a value is checked for the tag `nick` of a 7.0 `NAME`
- **THEN** the answer carries `unknown-field` with `{ meantTag: "NICK" }` in `data`

### Requirement: A pointer with a reciprocal is not written one-sided

A pointer that the standard pairs with a pointer on the record it names, such as `FAMC` and
`FAMS` of a person, the `FAMC` of every event that has one (`BIRT`, `CHR`, `ADOP`, `SLGC` and the others the scheme lists), and `CHIL`, `HUSB` and `WIFE` of a
family, SHALL be described as having
a reciprocal. Adding, setting or removing it, or removing a structure that holds one
beneath it, SHALL be refused with `reciprocal-pointer-unsupported` and change nothing,
until the service writes both sides of the pair.

#### Scenario: A child family added to a person

- **WHEN** a `FAMC` is added to an `INDI`
- **THEN** the service refuses with `reciprocal-pointer-unsupported`

#### Scenario: A child family added to a birth

- **WHEN** a `FAMC` is added to a `BIRT`
- **THEN** the service refuses with `reciprocal-pointer-unsupported`

#### Scenario: A pointer with no reciprocal

- **WHEN** a `SOUR` pointer to a record the document holds is added to a `NAME` of a 5.5.1 document
- **THEN** the edit is returned

### Requirement: A stale edit is refused

A request made for a version other than the document's SHALL be refused with
`stale-document` and change nothing, as for `rename`.

#### Scenario: The text changed after it was read

- **WHEN** the caller read version 3 and the document is at version 4
- **THEN** the service refuses with `stale-document`

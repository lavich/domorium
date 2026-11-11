## ADDED Requirements

### Requirement: The value of a record's opening line can be set

`setValue` at the opening line of a record SHALL write the record's value where the
standard gives that kind of record one: a shared note in 7.0, a note record in 5.5.1, and a
record whose tag is an extension tag. The identifier and the tag SHALL stay as written; only
the value changes. The value SHALL be written as any other value: a line break as a `CONT`
one level below, a long 5.5.1 line continued with `CONC` where the grammar continues it, and
the record's old continuation lines replaced as a whole, every other line beneath the record
left in place. A record whose tag is neither a standard record tag nor an extension tag
SHALL be refused with `unknown-field`, as a line the dialect does not define.

#### Scenario: A shared note set to one line and to two

- **WHEN** `0 @N1@ SNOTE First line` in a 7.0 document is set to `Other` and then to two lines
- **THEN** the first edit writes `0 @N1@ SNOTE Other`
- **AND** the second writes the first line on the opening line and the second as `1 CONT`

#### Scenario: A 5.5.1 note record with continuation lines

- **WHEN** a 5.5.1 `0 @N1@ NOTE a` with a `1 CONC` and a `1 CONT` and a `1 SOUR @S1@` beneath
  it, in a document that holds the record `@S1@`, is set to one line
- **THEN** the opening line and its continuation lines are replaced by one line
- **AND** the `1 SOUR @S1@` line is unchanged

#### Scenario: A custom record

- **WHEN** `0 @P1@ _PLAN Custom value` is set to `Another value`
- **THEN** the edit writes `0 @P1@ _PLAN Another value`

#### Scenario: A record of an unknown standard-looking tag

- **WHEN** `0 @X1@ FOO value` is set to another value
- **THEN** the service refuses with `unknown-field`

#### Scenario: A stale edit of a record

- **WHEN** the caller read an older version than the document's
- **THEN** `setValue` at a record's opening line refuses with `stale-document`

### Requirement: A value is refused where the structure takes none

Where the standard gives a structure no payload descriptor, a record such as an `INDI`, a
`FAM`, a `SOUR`, a `REPO`, an `OBJE`, a `SUBM`, `HEAD` or `TRLR`, or a substructure such as
`MAP` or a citation's `DATA`, `setValue` and `addStructure` SHALL refuse a non-empty value with
`value-not-allowed`, carrying the check's code `VAL018` and `{ tag }` in `data`, and
`validateValue` SHALL answer that code. The description of such a structure SHALL already say
it, with the payload kind `none`. An empty value there SHALL NOT be refused; a value of spaces
SHALL be. The 5.5.1 `EVEN`, of a family or a person, SHALL take a value, as the standard's
`EVENT_DESCRIPTOR` is "usually assigned to the EVEN tag".

#### Scenario: A value for a person

- **WHEN** `setValue` is asked to write a value on the opening line of an `INDI`
- **THEN** the service refuses with `value-not-allowed`

#### Scenario: A value for the header

- **WHEN** `setValue` is asked to write a value on `0 HEAD`
- **THEN** the service refuses with `value-not-allowed`

#### Scenario: A value for a map

- **WHEN** `setValue` is asked to write `oops` on a `3 MAP`
- **THEN** the service refuses with `value-not-allowed` and the text is unchanged

#### Scenario: A 5.5.1 family event with a description

- **WHEN** `1 EVEN Common Law` is added to a 5.5.1 `FAM`
- **THEN** the edit is returned

#### Scenario: A structure added with no value where it takes none

- **WHEN** a `MAP` with `LATI` and `LONG` and no value is added
- **THEN** the edit is returned

### Requirement: An emptied record keeps a value or a substructure

Setting the value of a record's opening line to the empty value SHALL be refused with
`value-required` where the dialect requires the value, and, in 7.0, where the record would
be left with neither a value nor a substructure, which 7.0 forbids of every structure; the
second refusal carries the check's code `VAL019` and `{ tag }` in `data`. A record that takes
no value, such as `TRLR`, SHALL NOT be refused an empty value. A substructure set to the empty
value keeps the behaviour of the other requirements, a part of a name among them.

#### Scenario: An emptied 7.0 shared note with nothing beneath it

- **WHEN** `0 @N1@ SNOTE First line` with no line beneath it is set to the empty value
- **THEN** the service refuses with `value-required`

#### Scenario: An emptied 7.0 shared note with a source beneath it

- **WHEN** `0 @N1@ SNOTE First line` with a `1 SOUR @S1@` beneath it, in a document that
  holds the record `@S1@`, is set to the empty value
- **THEN** the edit is returned

#### Scenario: An emptied 5.5.1 note record

- **WHEN** a 5.5.1 `0 @N1@ NOTE a` is set to the empty value
- **THEN** the service refuses with `value-required`

## MODIFIED Requirements

### Requirement: Three operations return an edit or a refusal

The service SHALL add a substructure beneath a structure, set the value of an existing
substructure or of a record's opening line, and remove an existing substructure with
everything beneath it. Each SHALL
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

- **WHEN** the position of `removeStructure` is a record such as an `INDI` or an `SNOTE`
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
diagnostic, or from the check of a value before it is written (`VAL017`, `VAL018`, `VAL019`),
SHALL carry that code, so that a caller can tell an impossible day from another
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
| `value-not-allowed`              | a value for a structure the standard gives no value                   |
| `record-edit-unsupported`        | the edit removes a whole record                                       |
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

### Requirement: A value can be checked without an edit

The service SHALL check one value for a field, given the structure and the tag, or for the
opening line of a record when the position is that line and the check replaces its value,
and return
the problems the value has as codes of the table above, without building an edit and
without taking a version. It SHALL name the rules that depend on the value alone: an
unknown field, one more occurrence than allowed, a value outside an enumeration, a value
that fails its datatype, a missing required value, a line break where the value keeps to
one line, a value for a structure that takes none, and an emptied record left with nothing. The same value SHALL then be accepted or
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

#### Scenario: The text of a shared note, asked before it is written

- **WHEN** a value is checked for the opening line `0 @N1@ SNOTE First line` of a 7.0 document
  in place of its value
- **THEN** the answer carries no problem for `Second text`

#### Scenario: A value for a map, asked before it is written

- **WHEN** `oops` is checked for a `3 MAP` in place of its value
- **THEN** the answer carries `value-not-allowed`

#### Scenario: A value for a person, asked before it is written

- **WHEN** a value is checked for the opening line of an `INDI` in place of its value
- **THEN** the answer carries `value-not-allowed`

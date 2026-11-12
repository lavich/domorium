## ADDED Requirements

### Requirement: A file path the dialect cannot carry is refused

Where a GEDCOM 7 structure's payload is a file path — a `FILE`, or the `TRAN` beneath it —
`setValue` and `addStructure`, children given to `addStructure` included, SHALL refuse a
value that is a local path the service does not read as a relative file, with
`file-target-unsupported`, carrying the check's code `VAL020` and its facts in `data`, and
`validateValue` SHALL answer that code. The value SHALL be judged with its surrounding
spaces trimmed, as the document's links read it. A local path is a value with no URI scheme
of two or more characters, so that a Windows drive letter is a path. The service SHALL
refuse it where it starts with `/` or `\` or a drive letter, holds a `..` segment, or holds
`\`, `?`, `#` or `:` unescaped, so that a local path `setValue` writes is one the document's
links read as a relative file. The value SHALL be taken as GEDCOM 7 spells it, a URI
reference: the service SHALL NOT escape it, and a caller holding a plain path escapes it
first. A value with a URI scheme SHALL be written as before, whether or not the links read
it. A 5.5.1 file path SHALL NOT be refused for these rules, since 5.5.1 reads `..` and `\` as
a path and an absolute path as a file. A file that already holds such a path SHALL NOT be
given a diagnostic for it.

#### Scenario: A path that leaves the file's folder

- **WHEN** `setValue` is asked to write `../x.jpg` on a `1 FILE media/a.jpg` of a 7.0 `OBJE`
- **THEN** the service refuses with `file-target-unsupported` and the text is unchanged
- **AND** its `diagnosticCode` is `VAL020` and its `data` is
  `{ tag: "FILE", pathProblem: "parent-folder" }`

#### Scenario: A path within the file's folder

- **WHEN** `setValue` is asked to write `media/x.jpg` on that `FILE`
- **THEN** the edit is returned

#### Scenario: A file added with a path that leaves the folder

- **WHEN** `addStructure` adds a `FILE` of `../x.jpg` with a `FORM` of `image/jpeg` to a 7.0
  `OBJE`
- **THEN** the service refuses with `file-target-unsupported`

#### Scenario: A Windows path

- **WHEN** `addStructure` adds a `FILE` of `C:\photos\x.jpg` with a `FORM` to a 7.0 `OBJE`
- **THEN** the service refuses with `file-target-unsupported` and `pathProblem` `absolute`

#### Scenario: A URL

- **WHEN** `setValue` is asked to write `https://example.com/x.jpg` on a 7.0 `FILE`
- **THEN** the edit is returned

#### Scenario: A path with a space before it

- **WHEN** `setValue` is asked to write ` ../x.jpg` on a 7.0 `FILE`
- **THEN** the service refuses with `file-target-unsupported`

#### Scenario: An escaped character

- **WHEN** `setValue` is asked to write `media/a%3Fb.jpg` on a 7.0 `FILE`
- **THEN** the edit is returned
- **AND** for `media/a?b.jpg` the service refuses with `pathProblem` `unescaped-character`

#### Scenario: The file of a translation

- **WHEN** `addStructure` adds a `TRAN` of `../x.pdf` with a `FORM` beneath a 7.0 `FILE`
- **THEN** the service refuses with `file-target-unsupported` and `{ tag: "TRAN" }` in `data`

#### Scenario: A 5.5.1 path that climbs

- **WHEN** `setValue` is asked to write `../x.jpg` on a 5.5.1 `FILE`
- **THEN** the edit is returned

#### Scenario: A path checked before it is written

- **WHEN** `validateValue` checks `../x.jpg` for a 7.0 `FILE` in place of its value
- **THEN** the answer carries `file-target-unsupported` with `diagnosticCode` `VAL020`

### Requirement: A 5.5.1 form outside the standard is written with a warning

Where a 5.5.1 `FORM` is set or added with a value outside the standard's set that is a
known file extension, the service SHALL return the edit with the validator's `VAL021`
warning beside it, and `validateValue` SHALL answer that problem with the code
`value-not-in-enum`, the severity `warning` and `diagnosticCode` `VAL021`. A value that is
no known file extension SHALL be refused with `value-not-in-enum`, as before.

#### Scenario: A PNG form

- **WHEN** `setValue` is asked to write `png` on a `2 FORM jpg` of a 5.5.1 `OBJE` `FILE`
- **THEN** the edit is returned with a `VAL021` warning beside it

#### Scenario: A form of the standard

- **WHEN** `setValue` is asked to write `jpg` on that `FORM`
- **THEN** the edit is returned with no warning

#### Scenario: A misspelt form

- **WHEN** `setValue` is asked to write `jgp` on that `FORM`
- **THEN** the service refuses with `value-not-in-enum` and `diagnosticCode` `VAL005`

#### Scenario: A PNG form, asked while typing

- **WHEN** `validateValue` checks `png` for that `FORM` in place of its value
- **THEN** the answer carries `value-not-in-enum` with severity `warning` and
  `diagnosticCode` `VAL021`

## MODIFIED Requirements

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
diagnostic, or from the check of a value before it is written (`VAL017`, `VAL018`, `VAL019`,
`VAL020`), SHALL carry that code, so that a caller can tell an impossible day from another
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
| `file-target-unsupported`        | a file path the dialect cannot carry                                  |
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
one line, a value for a structure that takes none, an emptied record left with nothing, and
a file path the dialect cannot carry. The same value SHALL then be accepted or
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

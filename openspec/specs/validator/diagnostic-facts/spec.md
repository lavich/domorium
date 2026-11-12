# validator/diagnostic-facts Specification

## Purpose

States which facts a diagnostic carries in `data` beside its message, so that a host can
write its own message, in its reader's language, without parsing the English one.

## Requirements

### Requirement: A diagnostic carries the facts its message names

The validator SHALL record in `data` the facts that the message of these diagnostics
names, wherever it raises them, in documents checked as GEDCOM 7 and as GEDCOM 5.5.1, and
in the problems `checkPayload` answers. The code, the message, the level and the range of
each diagnostic SHALL stay as they are.

| Code              | `data`                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `VAL014`          | `day`, `month`, and `monthLength`, the days that month has                                                     |
| `VAL016`          | `year` and `calendar`                                                                                          |
| `VAL002`          | `missingTag`, and `parentTag` where the missing structure has a parent                                         |
| `VAL001`          | `meantTag`, only where the tag is a standard tag written in the wrong case                                     |
| `VAL008`          | `tag`, the undeclared extension tag                                                                            |
| `VAL018`          | `tag`, the structure that takes no value                                                                       |
| `VAL019`          | `tag`, the record a 7.0 empty value would leave with nothing                                                   |
| `VAL020`          | `tag`, the structure holding the path, and `pathProblem`: `absolute`, `parent-folder` or `unescaped-character` |
| `VAL021`          | `tag`, the structure holding the form                                                                          |
| `unresolved-xref` | `xref` and `requiredRecordTag`, as before                                                                      |

A `VAL002` for a line that has no tag at all names nothing and SHALL carry no `data`.
`pathProblem` SHALL be `absolute` for a path that starts with `/`, `\` or a drive letter,
otherwise `parent-folder` for a path with a `..` segment, otherwise `unescaped-character`, for a path holding `\`, `?`, `#` or `:`.

#### Scenario: An impossible day

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 31 FEB 1900`
- **THEN** its `VAL014` carries `{ day: 31, month: "FEB", monthLength: 28 }`

#### Scenario: An impossible year

- **WHEN** a document declaring `2 VERS 7.0` has `2 DATE 1 JAN 0`
- **THEN** its `VAL016` carries `{ year: 0, calendar: "GREGORIAN" }`

#### Scenario: A missing required substructure

- **WHEN** a 7.0 `NAME` has a `TRAN` with no `LANG`
- **THEN** the `VAL002` carries `{ missingTag: "LANG", parentTag: "TRAN" }`

#### Scenario: A missing trailer

- **WHEN** a document ends without `0 TRLR`
- **THEN** the `VAL002` carries `{ missingTag: "TRLR" }` and no `parentTag`

#### Scenario: A tag in the wrong case

- **WHEN** a 7.0 `NAME` holds `2 nick Bob`
- **THEN** the `VAL001` carries `{ meantTag: "NICK" }`
- **AND** a `VAL001` for `2 NONSENSE x` carries no `meantTag`

#### Scenario: An undeclared extension tag

- **WHEN** a 7.0 document with no `HEAD.SCHMA` has `1 _X value` under a person
- **THEN** the `VAL008` carries `{ tag: "_X" }`

#### Scenario: A payload checked without a document

- **WHEN** `checkPayload` is asked about `31 FEB 1900` for a `DATE`
- **THEN** the problem carries `{ day: 31, month: "FEB", monthLength: 28 }`

#### Scenario: A value for a structure that takes none

- **WHEN** `checkPayload` is asked about a value for a `MAP` beneath a `PLAC`
- **THEN** its `VAL018` carries `{ tag: "MAP" }`

#### Scenario: A file path that leaves the folder

- **WHEN** `checkPayload` is asked about `../x.jpg` for a 7.0 `FILE`
- **THEN** its `VAL020` carries `{ tag: "FILE", pathProblem: "parent-folder" }`
- **AND** for `/x.jpg` it carries `pathProblem` `absolute`, and for `a?b.jpg` `unescaped-character`

#### Scenario: A tolerated form

- **WHEN** a 5.5.1 document has `2 FORM png` beneath an `OBJE`'s `FILE`
- **THEN** its `VAL021` carries `{ tag: "FORM" }`

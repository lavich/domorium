## ADDED Requirements

### Requirement: A relative FILE payload resolves by its dialect's rules

`resolveFileTarget(documentPath, targetText, dialect)` SHALL return the root-relative path that `targetText`, read as a relative `FILE` payload of a document at the root-relative `documentPath`, names. In GEDCOM 7 it SHALL percent-decode each segment as `decodeFileTarget` does and separate segments only at `/`; in any other dialect it SHALL leave the text as written and separate at both `/` and `\`. Empty and `.` segments SHALL be dropped and `..` SHALL remove the preceding segment. It SHALL return `null` when a `..` would climb above the root, and for a target that begins with `/`, `\` or a drive such as `C:`.

#### Scenario: A path beside the document

- **WHEN** `photos/marie.jpg` is resolved for `family/tree.ged` in GEDCOM 7
- **THEN** the result is `family/photos/marie.jpg`

#### Scenario: A percent escape in GEDCOM 7

- **WHEN** `photos/my%20photo.jpg` is resolved for `tree.ged` in GEDCOM 7
- **THEN** the result is `photos/my photo.jpg`

#### Scenario: A backslash in 5.5.1

- **WHEN** `..\shared\photo.jpg` is resolved for `family/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `shared/photo.jpg`

#### Scenario: A backslash in GEDCOM 7

- **WHEN** `a\b.jpg` is resolved for `tree.ged` in GEDCOM 7
- **THEN** the result is `a\b.jpg`

#### Scenario: Above the root

- **WHEN** `../../photo.jpg` is resolved for `family/tree.ged` in either dialect
- **THEN** the result is `null`

#### Scenario: Not relative

- **WHEN** `/photos/a.jpg` or `C:\photos\a.jpg` is resolved in GEDCOM 5.5.1
- **THEN** the result is `null`

### Requirement: A path is spelled from the document's folder

`relativeFilePath(documentPath, path)` SHALL return the plain relative path from the folder of the root-relative `documentPath` to the root-relative `path`: one `..` for each folder of the document below the longest shared folder prefix, then the remaining segments of `path`, joined with `/`. Resolving the result in a dialect that writes it unescaped SHALL give `path` back.

#### Scenario: A file in a sibling folder

- **WHEN** `shared/photo.jpg` is spelled for `family/tree.ged`
- **THEN** the result is `../shared/photo.jpg`

#### Scenario: A file beside the document

- **WHEN** `family/photo.jpg` is spelled for `family/tree.ged`
- **THEN** the result is `photo.jpg`

#### Scenario: The round trip

- **WHEN** `shared/photo.jpg` is spelled for `family/tree.ged` and the result resolved for `family/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `shared/photo.jpg`

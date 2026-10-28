## ADDED Requirements

### Requirement: A relative FILE payload resolves by its dialect's rules

`resolveFileTarget(documentPath, targetText, dialect)` SHALL return the root-relative path that `targetText`, read as a `FILE` payload of a document at the root-relative `documentPath`, names, or `null`.

It SHALL return `null` unless `fileLinkKind(targetText, dialect)` is `file-relative`, so that the payloads it resolves are exactly those `documentLinks` reports as relative. Otherwise it SHALL split `targetText` into segments — at `/` in GEDCOM 7, at `/` and `\` in any other dialect — and only then, in GEDCOM 7, percent-decode each segment as `decodeFileTarget` does, leaving a segment with a malformed escape as written. Starting from the folder of `documentPath`, empty and `.` segments SHALL be dropped and, outside GEDCOM 7, `..` SHALL remove the preceding segment. It SHALL return `null` when a `..` would climb above the root, when a decoded segment is `.` or `..` or contains `/` or `\`, and when the result is the root folder itself.

#### Scenario: A path beside the document

- **WHEN** `photos/marie.jpg` is resolved for `family/tree.ged` in GEDCOM 7
- **THEN** the result is `family/photos/marie.jpg`

#### Scenario: A percent escape in GEDCOM 7

- **WHEN** `photos/my%20photo.jpg` is resolved for `tree.ged` in GEDCOM 7
- **THEN** the result is `photos/my photo.jpg`

#### Scenario: A malformed escape in GEDCOM 7

- **WHEN** `a%20b%zz.jpg` is resolved for `tree.ged` in GEDCOM 7
- **THEN** the result is `a%20b%zz.jpg`

#### Scenario: An escape that would make a separator or a parent

- **WHEN** `a%2Fb.jpg`, `a%5Cb.jpg` or `%2E%2E/x.jpg` is resolved for `family/tree.ged` in GEDCOM 7
- **THEN** the result is `null`

#### Scenario: A backslash in 5.5.1

- **WHEN** `..\shared\photo.jpg` is resolved for `family/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `shared/photo.jpg`

#### Scenario: A backslash in GEDCOM 7

- **WHEN** `a\b.jpg` is resolved for `tree.ged` in GEDCOM 7
- **THEN** the result is `null`, as `documentLinks` reports no link for it

#### Scenario: Climbing in 5.5.1

- **WHEN** `../../photo.jpg` is resolved for `a/b/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `photo.jpg`

#### Scenario: Above the root

- **WHEN** `../../photo.jpg` is resolved for `family/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `null`

#### Scenario: A parent segment in GEDCOM 7

- **WHEN** `../photo.jpg` is resolved for `family/tree.ged` in GEDCOM 7
- **THEN** the result is `null`, as `documentLinks` reports no link for it

#### Scenario: Not relative

- **WHEN** `/photos/a.jpg` or `C:\photos\a.jpg` is resolved in GEDCOM 5.5.1
- **THEN** the result is `null`

#### Scenario: The folder itself

- **WHEN** `./` or `a/..` is resolved for `tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `null`

#### Scenario: No dialect

- **WHEN** `photo.jpg` is resolved with no dialect
- **THEN** the result is `null`

### Requirement: A path is spelled from the document's folder

`relativeFilePath(documentPath, path)` SHALL return the plain relative path from the folder of the root-relative `documentPath` to the root-relative `path`: one `..` for each folder of the document below the longest shared folder prefix, then the remaining segments of `path`, joined with `/`. For a `path` whose names contain neither `\` nor `%`, resolving the result in GEDCOM 5.5.1 SHALL give `path` back.

#### Scenario: A file in a sibling folder

- **WHEN** `shared/photo.jpg` is spelled for `family/tree.ged`
- **THEN** the result is `../shared/photo.jpg`

#### Scenario: A file beside the document

- **WHEN** `family/photo.jpg` is spelled for `family/tree.ged`
- **THEN** the result is `photo.jpg`

#### Scenario: The round trip

- **WHEN** `shared/photo.jpg` is spelled for `family/tree.ged` and the result resolved for `family/tree.ged` in GEDCOM 5.5.1
- **THEN** the result is `shared/photo.jpg`

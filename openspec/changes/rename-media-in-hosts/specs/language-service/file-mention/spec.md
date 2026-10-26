## Purpose

Answering whether a GEDCOM text mentions a file by name, without parsing it, for a host that must say which unopened documents may name a file.

## ADDED Requirements

### Requirement: A line ending in the file's name mentions it

`@domorium/language-service` SHALL answer, for a text and a plain path, whether some
line of the text, trimmed and with its percent-escapes decoded, ends in the last
segment of the path, where that segment starts the line or follows a space, `/` or
`\`. An escape that does not decode SHALL be read as the characters it is made of.

#### Scenario: The name as written

- **WHEN** the path is `media/marie.jpg` and a line is `1 FILE photos/marie.jpg`
- **THEN** the text mentions it

#### Scenario: The name as GEDCOM 7 escapes it

- **WHEN** the path is `media/my photo.jpg` and a line is `1 FILE media/my%20photo.jpg`, or `1 FILE media/my%20photo.jpg` with any escape written in lower-case hex
- **THEN** the text mentions it

#### Scenario: A 5.5.1 path with backslashes

- **WHEN** the path is `marie.jpg` and a line is `1 FILE C:\photos\marie.jpg`
- **THEN** the text mentions it

#### Scenario: A longer name ending the same way

- **WHEN** the path is `marie.jpg` and the only line ending in it is `1 FILE anne-marie.jpg`
- **THEN** the text does not mention it

#### Scenario: The name in the middle of a line

- **WHEN** the path is `marie.jpg` and the only line containing it is `1 NOTE marie.jpg was scanned`
- **THEN** the text does not mention it

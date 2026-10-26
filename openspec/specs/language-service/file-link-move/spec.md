# language-service/file-link-move Specification

## Purpose

Rewriting the `FILE` payloads of one document that name a file which moved, and refusing a move whose new place the document's dialect cannot write as a link.

## Requirements

### Requirement: Moving a file rewrites every payload that names it

`@domorium/language-service` SHALL answer a move from one path to another, both
relative to the document and written as plain paths, with an edit replacing every
relative `FILE` payload that names the old path by the payload naming the new one,
spelled as the document's dialect spells it. The edit SHALL carry the document's
version.

#### Scenario: A GEDCOM 7 photograph renamed in its folder

- **WHEN** a GEDCOM 7 document has two payloads `media/my%20photo.jpg` and the move is from `media/my photo.jpg` to `media/our photo.jpg`
- **THEN** the answer is an edit replacing both payloads with `media/our%20photo.jpg`, carrying the document's version

#### Scenario: A GEDCOM 5.5.1 path written with backslashes

- **WHEN** a 5.5.1 document has the payload `media\photo.jpg` and the move is from `media/photo.jpg` to `../photos/photo.jpg`
- **THEN** the answer is an edit replacing it with `../photos/photo.jpg`

#### Scenario: Nothing names the moved file

- **WHEN** no payload in the document names the old path, whatever the new one is
- **THEN** the answer is an edit with no changes, not a refusal

#### Scenario: A move to the place the file already is

- **WHEN** a GEDCOM 7 document has two payloads `%2E%2E/x.jpg` and the move is from `../x.jpg` to `../x.jpg`
- **THEN** the answer is not a refusal, and is an edit replacing each of the two payloads with its own text

### Requirement: A move the dialect cannot write is refused

When at least one payload names the old path and the payload for the new path
would not be read back by the same package, line and link reading both, as one
relative link naming the new path, the
service SHALL refuse with the code `unwritable-file-target` and a message naming the
new path, and SHALL NOT answer an edit. The rule SHALL be the one used to read
links, so that no move is written that reading would reject.

#### Scenario: A GEDCOM 7 file moved above the document's folder

- **WHEN** a GEDCOM 7 document names `media/marie.jpg` and the move is to `../photos/marie.jpg`
- **THEN** the answer is a refusal with the code `unwritable-file-target`

#### Scenario: A GEDCOM 7 file moved to an absolute path

- **WHEN** a GEDCOM 7 document names `media/marie.jpg` and the move is to `/photos/marie.jpg`
- **THEN** the answer is a refusal with the code `unwritable-file-target`

#### Scenario: A GEDCOM 5.5.1 file moved to a drive path

- **WHEN** a 5.5.1 document names `media/marie.jpg` and the move is to `C:/photos/marie.jpg`
- **THEN** the answer is a refusal with the code `unwritable-file-target`

#### Scenario: A GEDCOM 5.5.1 path the line could not carry

- **WHEN** a 5.5.1 document names `media/marie.jpg` and the move is to `@x@.jpg`, or to a path containing a line break
- **THEN** the answer is a refusal with the code `unwritable-file-target`

#### Scenario: A GEDCOM 5.5.1 path with surrounding spaces

- **WHEN** a 5.5.1 document names `media/marie.jpg` and the move is to ` marie.jpg`
- **THEN** the answer is a refusal with the code `unwritable-file-target`

#### Scenario: Characters GEDCOM 7 escapes are not a reason to refuse

- **WHEN** a GEDCOM 7 document names `media/marie.jpg` and the move is to `media/a#b?c.jpg`
- **THEN** the answer is an edit writing `media/a%23b%3Fc.jpg`

### Requirement: The existing retarget answer is unchanged

The existing method that answers a move with an edit alone SHALL keep answering
exactly as before, including for a move this capability refuses, and SHALL be
documented as deprecated in favor of the answer that can refuse.

#### Scenario: The deprecated method still writes what it wrote

- **WHEN** a GEDCOM 7 document names `media/marie.jpg` and the existing method is asked to move it to `../photos/marie.jpg`
- **THEN** it answers an edit writing `../photos/marie.jpg`, as it did before this change

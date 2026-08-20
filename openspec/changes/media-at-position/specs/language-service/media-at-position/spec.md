## Purpose

Answering, for one position in a GEDCOM document, the media that line refers to: the file as written, how to read it, what the format says the file is, the caption the author gave it, and the rectangle of it a multimedia link names.

## ADDED Requirements

### Requirement: A position on a file payload answers with that file

`@domorium/language-service` SHALL answer, for a position on the payload naming a
file, with that file: the payload as the document wrote it, how that text is to be
read, the range it occupies, what the format says the file is, and the caption
written beneath it. This holds inside a multimedia record and beneath a multimedia
link carrying the file directly, which GEDCOM 5.5.1 permits.

The answer SHALL name no rectangle here, because a rectangle belongs to a link and
not to a file.

#### Scenario: The payload of a file in a multimedia record

- **WHEN** the position is on the payload of `1 FILE media/family.jpg` inside a multimedia record
- **THEN** the answer names `media/family.jpg`, says how to read it, says the format calls it an image, and names no rectangle

#### Scenario: A caption written beneath the file

- **WHEN** that file carries a title of its own
- **THEN** the answer carries that title

#### Scenario: The inline form GEDCOM 5.5.1 permits

- **WHEN** the position is on a file payload beneath a multimedia link that carries no pointer
- **THEN** the answer names that file, in a 5.5.1 document as in a 7.0 one

### Requirement: A position on a multimedia link answers with the file it names and the rectangle it asks for

`@domorium/language-service` SHALL answer, for a position on the pointer payload of
a multimedia link, with the file of the record that pointer names, together with the
rectangle and the caption written beneath the link itself.

The rectangle and the caption SHALL be read from the link and not from the record, so
two links naming one record answer with two different rectangles and one file.

#### Scenario: A link naming a rectangle

- **WHEN** the position is on the pointer of a multimedia link whose subordinate structures name a rectangle
- **THEN** the answer names the file from the record the pointer resolves to, and the rectangle from the link

#### Scenario: Two links to one photograph

- **WHEN** two multimedia links name the same record and each names a different rectangle
- **THEN** each position answers with its own rectangle and the same file

#### Scenario: The caption belongs to the link

- **WHEN** a link carries a title and the file in the record carries a different one
- **THEN** the answer from the link's position carries the link's title

### Requirement: A rectangle that cannot be applied is not named

A rectangle SHALL be named only where it can be applied. Where it cannot, the answer
SHALL still name the file, so that a host shows the whole image rather than nothing.

The document SHALL be the only source of that judgement: a rectangle is unusable when
it has no extent, when the record carries more than one file and the format does not
say which the rectangle belongs to, or when the dialect describes no rectangle at
all.

#### Scenario: A rectangle with no extent

- **WHEN** a link names a rectangle whose height or width is zero, or omits one of them
- **THEN** the answer names the file and names no rectangle

#### Scenario: A record carrying several files

- **WHEN** a link names a rectangle and the record it points at carries more than one file
- **THEN** the answer names the first file in document order and names no rectangle, because the format does not say which file the rectangle belongs to

#### Scenario: A rectangle in a dialect that has none

- **WHEN** a GEDCOM 5.5.1 document carries a rectangle beneath a multimedia link, which its specification does not describe
- **THEN** the answer names no rectangle

### Requirement: The answer says what the format says the file is

The answer SHALL classify the file as an image, audio, video, a document, or unknown.

The classification SHALL follow what the document states rather than what a host can
render, reading a GEDCOM 7 media type or a GEDCOM 5.5.1 format from the closed list
its specification permits. Where the document declares no format, the file's
extension SHALL be the last resort, and the answer SHALL be unknown where the
extension says nothing.

#### Scenario: A media type in GEDCOM 7

- **WHEN** a file declares a media type naming an image
- **THEN** the answer classifies it as an image

#### Scenario: The closed format list of GEDCOM 5.5.1

- **WHEN** a 5.5.1 file declares a format from the list its specification permits
- **THEN** the answer classifies a sound format as audio, a picture format as an image, and an embedded-object format as unknown

#### Scenario: Nothing declared

- **WHEN** a file declares no format
- **THEN** the answer classifies it from the file's extension, and as unknown where the extension says nothing

### Requirement: A position that refers to no media answers with nothing

The answer SHALL be nothing where the position names no media, where a pointer
resolves to no record, where it resolves to a record that is not multimedia, and
where a multimedia record carries no file. Nothing SHALL be reported as a
diagnostic: an unresolved pointer is already the validator's to report.

#### Scenario: A line that is not about media

- **WHEN** the position is on any line that names no file and no multimedia link
- **THEN** there is no answer

#### Scenario: A pointer naming nothing

- **WHEN** the position is on a multimedia link whose pointer resolves to no record
- **THEN** there is no answer

#### Scenario: A pointer naming something that is not media

- **WHEN** the position is on a link whose pointer resolves to a record that is not a multimedia record
- **THEN** there is no answer

#### Scenario: A multimedia record with no file

- **WHEN** the position is on a link whose record carries no file
- **THEN** there is no answer

### Requirement: The answer describes, and does not fetch or resolve

The answer SHALL carry the file as the document wrote it, together with how that text
is to be read, and nothing more.

Reading a file, resolving it against a workspace, reaching the network, and measuring
an image SHALL remain the caller's. In particular a rectangle SHALL be carried as
written even where it names an extent larger than its image, because the extent of an
image is not knowable from the document.

#### Scenario: A file named by a URL

- **WHEN** a file payload names a URL
- **THEN** the answer carries it and says it is a URL, and nothing is fetched

#### Scenario: A path relative to the document

- **WHEN** a file payload names a path relative to the document
- **THEN** the answer carries that path as written and says how it is to be read

#### Scenario: A rectangle larger than the image

- **WHEN** a rectangle names an extent larger than the image it refers to
- **THEN** the answer names the rectangle as written, because the extent of an image is not knowable from the document

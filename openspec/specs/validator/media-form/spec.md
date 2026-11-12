# validator/media-form Specification

## Purpose

States how the validator reads a 5.5.1 multimedia `FORM` that names a file format the
standard's closed list leaves out, as real exports write `png`, `jpeg` or `pdf` there.

## Requirements

### Requirement: A known file extension is a tolerated 5.5.1 form

Where a 5.5.1 document gives a multimedia `FORM` (the standard's `MULTIMEDIA_FORMAT`,
beneath the `FILE` of a multimedia record or of a multimedia link) a value outside `[bmp gif jpg ole pcx tif wav]`, the
validator SHALL report it as a warning, `VAL021`, when the value, compared without case, is
a file extension the service knows the kind of (an image, a sound, a video or a document),
and as the error `VAL005`, as before, when it is not. A value of the standard's set SHALL be
reported by neither, in any case. `checkPayload` SHALL answer the same for a value about to
be written. GEDCOM 7, whose `FORM` is a media type, SHALL be unchanged.

#### Scenario: A PNG form

- **WHEN** a 5.5.1 document has `2 FORM png` beneath an `OBJE`'s `FILE`
- **THEN** it is reported as the warning `VAL021` and not as `VAL005`

#### Scenario: A form in upper case

- **WHEN** a 5.5.1 document has `2 FORM PDF` beneath an `OBJE`'s `FILE`
- **THEN** it is reported as the warning `VAL021`

#### Scenario: A misspelt form

- **WHEN** a 5.5.1 document has `2 FORM jgp` beneath an `OBJE`'s `FILE`
- **THEN** it is reported as the error `VAL005`

#### Scenario: A form of the standard

- **WHEN** a 5.5.1 document has `2 FORM jpg` beneath an `OBJE`'s `FILE`
- **THEN** no diagnostic is reported for it

#### Scenario: A form checked before it is written

- **WHEN** `checkPayload` is asked about `jpeg` for a 5.5.1 `FORM`
- **THEN** it answers `VAL021` at the level `warning`

## ADDED Requirements

### Requirement: An absent trailer is reported where it belongs

Where a document whose version is determined has no `TRLR` record, the validator SHALL
report the missing `TRLR` on the last GEDCOM line of the document, covering that line's
text, and SHALL carry the name of the missing tag so a host can offer an action without
parsing the message.

A line that is not a GEDCOM line, and blank lines, are not the last line for this purpose.
A document whose version is determined always has a GEDCOM line, so the range is never empty.

#### Scenario: A file that stops before its trailer

- **WHEN** a GEDCOM 7.0 file ends with `1 NAME A /B/` and has no `0 TRLR`
- **THEN** one diagnostic names the missing `TRLR`
- **AND** its range is the text of the `1 NAME A /B/` line
- **AND** it carries `TRLR` as the missing tag

#### Scenario: Blank lines or garbage after the last record

- **WHEN** the file ends with `1 NAME A /B/` followed by blank lines, or by a line that is
  not a GEDCOM line
- **THEN** the range is still the text of the `1 NAME A /B/` line

#### Scenario: Other missing root tags keep their place

- **WHEN** a different required root tag is missing
- **THEN** its diagnostic is reported where it was before this capability existed

### Requirement: A missing header is told apart from a header without a version

The validator SHALL report that the document has no `HEAD` record separately from a `HEAD`
that names no version. Both continue to be reported as the version being undetermined; the
first carries, in addition, the fact that the header is absent.

#### Scenario: A file with no header

- **WHEN** the first record is `0 @I1@ INDI`
- **THEN** the undetermined-version diagnostic carries that the header is missing

#### Scenario: An empty file

- **WHEN** the document is empty
- **THEN** the undetermined-version diagnostic carries that the header is missing

#### Scenario: A header without a version

- **WHEN** the document has `0 HEAD` and no `HEAD.GEDC.VERS`
- **THEN** the undetermined-version diagnostic does not carry that the header is missing

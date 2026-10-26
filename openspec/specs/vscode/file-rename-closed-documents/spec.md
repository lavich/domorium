# vscode/file-rename-closed-documents Specification

## Purpose

Telling the reader of VS Code that closed GEDCOM files in the workspace may still name a file renamed in the editor, since only open documents are rewritten.

## Requirements

### Requirement: Closed GEDCOM files that mention a renamed file are reported

Once files have been renamed in the editor, the VS Code extension SHALL count the
GEDCOM files in the workspace that are not open as GEDCOM documents and whose text
mentions a renamed file by name, and SHALL
show one warning for the whole rename naming the renamed files and those GEDCOM
files, when there are any. A file that cannot be read SHALL be skipped, not end the
count. It SHALL show nothing when the count is zero, and
SHALL NOT delay the rename while counting.

#### Scenario: A closed tree names the photograph

- **WHEN** `media/marie.jpg` is renamed and a closed `archive.ged` in the workspace has a line ending in `marie.jpg`
- **THEN** a warning names `archive.ged` and `marie.jpg`

#### Scenario: A closed tree escapes the name

- **WHEN** `media/my photo.jpg` is renamed and a closed GEDCOM 7 file contains `my%20photo.jpg`
- **THEN** it is counted

#### Scenario: A closed tree in UTF-16

- **WHEN** a closed 5.5.1 file starting with a UTF-16 byte-order mark contains the name
- **THEN** it is counted

#### Scenario: Nothing closed mentions it

- **WHEN** no closed GEDCOM file mentions the renamed file's name
- **THEN** nothing is shown

#### Scenario: A second rename while the first is being counted

- **WHEN** `a.jpg` is renamed, then `b.jpg` before the closed files are all read, and a closed file mentions only `a.jpg`
- **THEN** a warning is still shown for it

#### Scenario: Several files in one rename

- **WHEN** one rename moves two photographs and closed files mention each
- **THEN** one warning is shown for the rename

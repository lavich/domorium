# web-editor/follow-file-link Specification

## Purpose

Following a FILE link in the web editor to the file the library resolves, and telling the user why a link cannot be followed when it climbs out of the granted folder or names nothing.

## Requirements

### Requirement: The web editor opens the file a relative payload names by its dialect

When a `file-relative` link is followed in a granted folder, the web editor SHALL open the path `resolveFileTarget` gives for the document's path, the link's text and the document's dialect, and SHALL open nothing and show a notice when it gives `null`: that the path lies outside the granted folder when it climbs above it, and otherwise that the file cannot be reached.

#### Scenario: A GEDCOM 7 escape

- **WHEN** `1 FILE photos/my%20photo.jpg` is followed in a GEDCOM 7 document at the folder's root
- **THEN** the editor opens `photos/my photo.jpg`

#### Scenario: A 5.5.1 backslash

- **WHEN** `1 FILE photos\a.jpg` is followed in a GEDCOM 5.5.1 document at `family/tree.ged`
- **THEN** the editor opens `family/photos/a.jpg`

#### Scenario: An escaped backslash in GEDCOM 7

- **WHEN** `1 FILE a%5Cb.jpg` is followed in a GEDCOM 7 document
- **THEN** nothing is opened and a notice says the file cannot be reached

#### Scenario: Out of the folder

- **WHEN** `1 FILE ../../a.jpg` is followed in a GEDCOM 5.5.1 document at `family/tree.ged`
- **THEN** nothing is opened and the notice says the path lies outside the granted folder

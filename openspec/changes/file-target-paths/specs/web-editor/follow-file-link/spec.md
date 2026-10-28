## ADDED Requirements

### Requirement: The web editor opens the file a relative payload names by its dialect

When a `file-relative` link is followed in a granted folder, the web editor SHALL open the path `resolveFileTarget` gives for the document's path, the link's text and the document's dialect, and SHALL refuse with a notice that the path lies outside the granted folder when it gives `null`.

#### Scenario: A GEDCOM 7 escape

- **WHEN** `1 FILE photos/my%20photo.jpg` is followed in a GEDCOM 7 document at the folder's root
- **THEN** the editor opens `photos/my photo.jpg`

#### Scenario: A 5.5.1 backslash

- **WHEN** `1 FILE photos\a.jpg` is followed in a GEDCOM 5.5.1 document at `family/tree.ged`
- **THEN** the editor opens `family/photos/a.jpg`

#### Scenario: Out of the folder

- **WHEN** `1 FILE ../../a.jpg` is followed in a document at `family/tree.ged`
- **THEN** nothing is opened and the notice says the path lies outside the granted folder

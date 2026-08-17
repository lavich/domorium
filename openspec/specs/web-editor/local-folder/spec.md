# web-editor/local-folder Specification

## Purpose

Lets a reader work on the material where it already lives: a folder on their own
computer, with the GEDCOM document and everything beside it, rather than a single
file copied into the page.

## Requirements

### Requirement: A folder can be granted

The editor SHALL let the reader grant a folder from their computer, and after the
grant it SHALL list what that folder holds. It SHALL ask for a folder only in
answer to something the reader did, never on load.

#### Scenario: The reader grants a folder

- **WHEN** the reader chooses to open a folder and the browser grants it
- **THEN** the explorer lists the folder's entries and names the folder it is
  showing

#### Scenario: The reader dismisses the request

- **WHEN** the reader closes the browser's folder request without choosing
- **THEN** nothing changes: the editor keeps whatever was open and reports no
  error

#### Scenario: The page asks for nothing by itself

- **WHEN** the editor loads
- **THEN** no folder request appears until the reader asks for one

#### Scenario: The reader refuses read access

- **WHEN** the browser reports that permission to read the folder was refused
- **THEN** the editor says the folder was not granted and offers to ask again

### Requirement: The tree lists every file, not only GEDCOM

The explorer SHALL list every entry in the granted folder regardless of its
extension, and SHALL let a directory be expanded to show its own entries.

#### Scenario: A folder of mixed material

- **WHEN** the granted folder holds `tree.ged`, `notes.md`, `media/` and
  `receipt.pdf`
- **THEN** all four appear, `media/` can be expanded, and each entry shows
  whether the editor can open it

#### Scenario: An entry the editor cannot open

- **WHEN** the reader chooses an entry the editor has no view for, such as
  `receipt.pdf`
- **THEN** no tab opens and the editor says it cannot show that kind of file

#### Scenario: Entries the operating system hides

- **WHEN** the folder holds an entry whose name begins with a dot
- **THEN** that entry is not listed

### Requirement: A file opens in a tab of its own

Choosing a file in the tree SHALL open it in a tab, and the tab SHALL be the kind
the file calls for: a GEDCOM document opens in the editor, other supported kinds
open as a preview.

#### Scenario: Opening a GEDCOM file

- **WHEN** the reader chooses `tree.ged`
- **THEN** it opens in the editor, with validation and highlighting, and the
  status bar names the version it declares

#### Scenario: The same file chosen twice

- **WHEN** the reader chooses a file that already has a tab
- **THEN** that tab is brought forward and the file is not read again

### Requirement: A browser without folder access says so

Where the browser implements no folder access, the editor SHALL say so plainly
and SHALL keep working on a single file: opening one by choosing it, and giving it
back as a download.

#### Scenario: Safari or Firefox

- **WHEN** the editor loads in a browser that does not implement
  `showDirectoryPicker`
- **THEN** opening a folder is not offered, a short line says which browsers can
  do it, and opening a single file is offered instead

#### Scenario: The reader is told only once

- **WHEN** the reader has already been told that their browser cannot grant a
  folder
- **THEN** the explanation does not interrupt them again in the same visit

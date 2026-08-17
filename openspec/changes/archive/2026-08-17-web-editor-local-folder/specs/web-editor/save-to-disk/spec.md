## Purpose

Puts the edited document back where it came from, so that a correction made in
the editor is a correction on disk — without the round trip through a downloads
folder, which is where a genealogist's work goes missing.

## ADDED Requirements

### Requirement: Saving is explicit

The editor SHALL write the open GEDCOM document to disk only when the reader asks,
by a command and by the platform's save shortcut. It SHALL NOT write on a timer,
on blur, or on closing a tab.

#### Scenario: Saving an edited document

- **WHEN** the reader has edited `tree.ged` from the granted folder and asks to
  save
- **THEN** the file on disk holds the edited text, and the tab is no longer marked
  modified

#### Scenario: Saving a document with nothing to save

- **WHEN** the reader asks to save a document they have not edited
- **THEN** nothing is written and the editor says the document is unchanged

#### Scenario: Time passes with edits in the buffer

- **WHEN** the reader edits and then leaves the editor alone
- **THEN** the file on disk stays as it was until they ask to save

### Requirement: Saving is offered only where it can be done

The save command SHALL be available only for a GEDCOM document, and writing to a
file SHALL be offered only where that document came from a granted folder.

#### Scenario: A preview is in front

- **WHEN** the tab in front shows a markdown file or an image
- **THEN** saving is not offered, because a preview has nothing to save

### Requirement: Writing needs permission, and refusal loses nothing

Before the first write to a folder the editor SHALL obtain permission to write
it. Where permission is refused or a write fails, the document SHALL remain open
and marked modified, and the editor SHALL say what happened.

#### Scenario: Permission to write is refused

- **WHEN** the browser reports that write permission was refused
- **THEN** nothing is written, the tab stays modified, and the editor says the
  folder is open for reading only

#### Scenario: A write that fails midway

- **WHEN** the write cannot be completed — the disk is full, the file was removed
- **THEN** the file on disk is either its previous content or the new content, never
  a truncated mixture, and the editor reports the failure

### Requirement: A document can be saved under a name the reader chooses

The editor SHALL let the reader save the open document as a new file, asking the
browser for the folder and the name rather than choosing either itself. Where the
file they choose lies inside the granted folder, the session SHALL continue
against it.

#### Scenario: Saving into the granted folder

- **WHEN** the reader saves `tree.ged` and chooses `tree-cleaned.ged` in the
  folder they granted
- **THEN** the new file appears in the explorer, the tab now names it, and the
  original file is left as it was

#### Scenario: Saving somewhere else

- **WHEN** the reader chooses a folder other than the one they granted
- **THEN** the file is written there, the editor says where it went, and the
  document in front stays the one it was — still unsaved, because its own file
  was not written

#### Scenario: The name is already taken

- **WHEN** the name the reader chooses already exists
- **THEN** the browser's own replace warning stands in the way, and nothing is
  written unless they accept it

#### Scenario: The reader closes the dialog

- **WHEN** the reader dismisses the browser's save dialog
- **THEN** nothing is written and nothing is said

### Requirement: Without a folder, saving still gives the file back

Where no folder has been granted — because the browser cannot, or because the
reader opened a single file — asking to save SHALL download a copy, which is what
the editor does today.

#### Scenario: A single file opened in Safari

- **WHEN** the reader opened one file without a folder and asks to save
- **THEN** a copy is downloaded and the editor says the original was not touched

### Requirement: Unsaved work is not lost silently

Where the reader would lose an edited document — closing its tab, opening another
folder, leaving the page — the editor SHALL say which document is unsaved and ask
before discarding it.

#### Scenario: Closing a tab with edits

- **WHEN** the reader closes the tab of a document with unsaved edits
- **THEN** they are asked whether to save, discard, or keep the tab open

#### Scenario: Leaving the page with edits

- **WHEN** the reader navigates away or closes the browser tab with unsaved edits
- **THEN** the browser's own warning is raised before the page is left

### Requirement: A document the editor could not decode SHALL NOT be written back

Where the document declares a character set the editor did not decode it with, the
editor SHALL refuse to write and SHALL say why, rather than writing back text it
may have mangled on the way in.

#### Scenario: A 5.5.1 file declaring ANSEL

- **WHEN** the open document declares `1 CHAR ANSEL` and was read as UTF-8
- **THEN** saving is refused with a line naming the declared character set, and the
  file on disk is untouched

#### Scenario: A file declaring UTF-8

- **WHEN** the open document declares `1 CHAR UTF-8`, or declares nothing
- **THEN** saving proceeds as usual

## Purpose

Keeps what the editor says about a document — its GEDCOM version, its findings,
the position in it — attached to that document, so that a reader looking at a
photograph is not told the version and the issue count of the file they left.

## ADDED Requirements

### Requirement: The window describes the file in front

The status bar, the problems panel and the activity rail SHALL describe the tab
that is active, and nothing else. Where the active tab is not a GEDCOM file, no
version, no issue count and no problems panel SHALL be shown — neither a stale one
nor an empty one implying the file was checked and found clean.

#### Scenario: Switching from a GEDCOM file to a photograph

- **WHEN** a GEDCOM document with findings is open and the reader activates an
  image tab
- **THEN** the status bar states no version and no issue count, no problems panel
  stands beside the image, and the activity rail carries no count

#### Scenario: Switching back to the GEDCOM file

- **WHEN** the reader activates the GEDCOM tab again
- **THEN** its version, its position and its findings are shown again, and the
  problems panel returns if the reader had it open

#### Scenario: Two GEDCOM files open at once

- **WHEN** two GEDCOM documents are open and the reader switches between them
- **THEN** each tab shows its own version and its own findings, and neither shows
  the other's

#### Scenario: Nothing open

- **WHEN** no file is open
- **THEN** the status bar states only that files are read locally and nothing is
  uploaded

### Requirement: A document's report belongs to that document

What a surface reports about a document SHALL be kept against the path of that
document. A report naming a file that is not open SHALL be discarded, and closing
a file SHALL forget what was reported about it.

#### Scenario: A report arriving after the reader has moved on

- **WHEN** a report names a document that has been closed, or one the reader has
  already switched away from
- **THEN** it is discarded rather than shown for the document now in front

#### Scenario: Closing and reopening a file

- **WHEN** the reader closes a GEDCOM tab and opens the same file again
- **THEN** nothing is shown from the earlier session with it until the document is
  checked afresh

### Requirement: The problems panel is part of the document's frame

The problems panel SHALL live inside the pane that holds the tab strip and the
document, beside the GEDCOM surface, rather than as a sibling of that pane. Whether
it is open SHALL remain a choice about the window, kept across tabs, and it SHALL
be shown only where the active tab is a GEDCOM file and the window is wide enough
for panels.

#### Scenario: Closing the panel on one file and opening another

- **WHEN** the reader closes the problems panel, activates an image tab, then
  activates a GEDCOM tab
- **THEN** the panel is still closed, because closing it was a decision about the
  window

#### Scenario: A window too narrow for panels

- **WHEN** the window is narrower than the width at which panels are shown
- **THEN** no problems panel is shown, whatever the active tab is

### Requirement: The rail counts only what it can count

The activity rail's problems control SHALL show the number of findings for the
active document, and where the active tab is not a GEDCOM file it SHALL keep its
place in the rail without a count and without acting.

#### Scenario: A photograph in front

- **WHEN** the active tab is an image or a note
- **THEN** the problems control shows no badge, cannot be pressed, and has not
  moved from where it was

### Requirement: A previewed file states its own facts

A tab showing a note or a photograph SHALL state what is true of that file in the
status bar: for a note that it is markdown and read-only, for a photograph its
format, its dimensions and its size.

#### Scenario: A note in front

- **WHEN** the active tab is a markdown file
- **THEN** the status bar states that it is markdown and read-only

#### Scenario: A photograph in front

- **WHEN** the active tab is an image and it has been read
- **THEN** the status bar states its format, its pixel dimensions and its size

#### Scenario: A photograph that cannot be read

- **WHEN** the image's bytes cannot be read or decoded
- **THEN** the status bar claims no dimensions and no format, and the editor keeps
  running

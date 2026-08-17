## Purpose

Shows the material a GEDCOM document points at — the photograph a record names,
the note kept beside it — so that following a link answers the question instead of
leaving the reader to hunt through a file manager.

## ADDED Requirements

### Requirement: A markdown file and an image can be viewed

The editor SHALL show a markdown file and an image from the granted folder, and
both SHALL be read-only: neither can be edited or saved.

#### Scenario: Viewing a note

- **WHEN** the reader opens `notes.md`
- **THEN** its text is shown, the tab is not marked modified, and typing into it
  changes nothing

#### Scenario: Viewing a photograph

- **WHEN** the reader opens `media/portrait.jpg`
- **THEN** the image is shown scaled to fit the tab, with its name and size

#### Scenario: A file that claims to be an image and is not

- **WHEN** the file's bytes cannot be decoded as an image
- **THEN** the tab says the image could not be read, and the editor keeps running

### Requirement: A previewed file is content, never markup to run

A markdown file, and every name and path the explorer shows, come from outside the
editor. Rendered markdown MUST NOT execute a script or raw HTML it carries, and a
file name or path MUST be shown as text rather than as markup.

#### Scenario: A note carrying a script

- **WHEN** a markdown file contains `<script>` or `<img src=x onerror=…>`
- **THEN** the preview shows the text of it and nothing is executed

#### Scenario: A file named like markup

- **WHEN** the folder holds a file whose name contains `<b>` or a quotation mark
- **THEN** the explorer shows that name as written, with no effect on the page

### Requirement: A preview releases what it held

Leaving or replacing an image preview SHALL release the URL it was shown through,
so the memory a photograph took is not held for the rest of the session.

#### Scenario: Opening one photograph after another

- **WHEN** the reader opens ten images in turn
- **THEN** only the one on screen is held, and the previous URLs have been released

### Requirement: A link inside a GEDCOM document opens the file it names

A link to a file in the open GEDCOM document SHALL resolve against the directory
of the document that names it, and following it SHALL open that file in a tab.

#### Scenario: Following a media link

- **WHEN** the open document is `tree.ged` in the granted folder and the reader
  follows `1 FILE media/portrait.jpg`
- **THEN** `media/portrait.jpg` from that folder opens as an image preview

#### Scenario: The named file is missing

- **WHEN** the path a link names does not exist in the folder
- **THEN** no tab opens, and the editor says which path it looked for

#### Scenario: No folder has been granted

- **WHEN** the document was opened as a single file, without a folder
- **THEN** following a file link says that a folder is needed to reach it

### Requirement: A path SHALL NOT reach outside the granted folder

A path that resolves outside the folder the reader granted MUST NOT be read, and
the editor SHALL say why rather than failing silently.

#### Scenario: A path climbing out of the folder

- **WHEN** a document names `../../keys/id_rsa` or an absolute path such as
  `/etc/passwd`
- **THEN** nothing is read, and the editor says the path lies outside the granted
  folder

### Requirement: A web address keeps opening in the browser

A link to a web address SHALL continue to open in a new browser tab, unchanged by
the presence of a folder.

#### Scenario: Following a WWW value

- **WHEN** the reader follows `1 WWW https://example.org/`
- **THEN** it opens in a new browser tab, and no tab is added inside the editor

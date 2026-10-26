# language-server/file-rename Specification

## Purpose

Rewriting, when a host renames or moves a file in the editor, the `FILE` payloads of open GEDCOM documents that name it, as part of the rename, and saying which documents could not follow.

## Requirements

### Requirement: Renaming a file rewrites the open documents that name it

The language server SHALL register for notice of files about to be renamed and
SHALL answer each notice with one edit rewriting, in every open GEDCOM document,
each relative `FILE` payload that names a renamed file so that it names the file's
new place, as that document's dialect spells it. The old place SHALL be taken
relative to the document's folder, and the new place relative to the folder the
document will be in after the same notice. Only documents with changes SHALL
appear, each at the version it has; with none, the server SHALL answer no edit.

#### Scenario: A photograph renamed beside the document

- **WHEN** an open GEDCOM 7 document `tree.ged` has `1 FILE media/marie.jpg` and `media/marie.jpg` beside it is renamed to `media/marie curie.jpg`
- **THEN** the answer is an edit for `tree.ged`, at the version it has, writing `media/marie%20curie.jpg`

#### Scenario: Two documents in different folders

- **WHEN** `family/tree.ged` names `media/a.jpg` and `other.ged` at the root names `family/media/a.jpg`, both open, and `family/media/a.jpg` is renamed to `family/media/b.jpg`
- **THEN** the edit rewrites the first to `media/b.jpg` and the second to `family/media/b.jpg`

#### Scenario: The document moves with the photograph

- **WHEN** an open `tree.ged` names `marie.jpg` and one notice moves both `tree.ged` and `marie.jpg` into `archive/`
- **THEN** the answer is no edit: the payload still names the file

#### Scenario: A rename no open document concerns

- **WHEN** a file no open document names is renamed
- **THEN** the answer is no edit and nothing is shown

#### Scenario: A document that is no longer open

- **WHEN** a document that named the file was opened, edited and closed before the rename
- **THEN** the answer does not touch it

### Requirement: A document that cannot follow is reported, and does not stop the others

When an open document names a renamed file but its dialect cannot write the new
place, the server SHALL leave that document unchanged, SHALL still answer the edit
for every other document, and SHALL show one warning per notice naming each
document left unchanged by its path within the workspace.

#### Scenario: A GEDCOM 7 document and a photograph moved above its folder

- **WHEN** an open GEDCOM 7 document `family/tree.ged` names `media/marie.jpg` and the file is moved to `photos/marie.jpg` at the root
- **THEN** the edit leaves `family/tree.ged` unchanged and a warning names `family/tree.ged`

#### Scenario: A 5.5.1 document beside it follows

- **WHEN** in the same rename an open 5.5.1 document in `family/` names the same file
- **THEN** that document is rewritten to `../photos/marie.jpg` and is not named in the warning

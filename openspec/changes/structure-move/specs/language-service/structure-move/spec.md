## Purpose

States how the service moves one substructure among the siblings of its parent and which
slots it may take, so that an editor can reorder the rows of a form by dragging, with the
file as the only source of the order.

## ADDED Requirements

### Requirement: A structure moves among its siblings as one block

The service SHALL move the substructure on a position's line to a target slot among the
substructures of the same parent: before a given sibling, or after the last of them. A line
of the structure and any of its continuation lines SHALL name the structure; a line of a
sibling or of one of the sibling's continuation lines SHALL name that sibling.

The move SHALL take the version the caller read and return either an edit at the document's
current version, with no warnings, or a refusal with a code. The structure's
own line, every line beneath it and its continuation lines SHALL move together, keep their
order and their text, their own line terminators included, and keep their level. The edit SHALL touch no other line: the lines
between the old place and the new one, undefined and extension tags among them, SHALL be
left as written. The document's line terminator SHALL be used, and a text that ended with no
final terminator SHALL still end with none.

#### Scenario: The second name becomes the preferred one

- **WHEN** the second `NAME` of an `INDI` is moved before the first, in a 5.5.1 and in a 7.0
  document
- **THEN** the second `NAME` and its subtree come first, followed by the first `NAME` and its
  subtree
- **AND** no other line of the text changes

#### Scenario: An event among the others

- **WHEN** the `DEAT` of a person that writes `BIRT`, `RESI` and `DEAT` is moved before the
  `RESI`
- **THEN** the person writes `BIRT`, `DEAT`, `RESI`, each with its subtree

#### Scenario: A structure with substructures and a continuation

- **WHEN** a `NOTE` written as a line, a `CONT` line and a `SOUR` beneath it is moved to the end
  of its siblings
- **THEN** the three lines are written after the last sibling's subtree, in their order and
  with their text

#### Scenario: A custom line

- **WHEN** a `_MILITARY` line with a `DATE` beneath it is moved before the `BIRT` of a person
- **THEN** both lines move unchanged

#### Scenario: Before the first sibling of a parent with a continuation

- **WHEN** a `SOUR` is moved before the first substructure of a `NOTE` whose value has a `CONT`
  line
- **THEN** the `SOUR` is written after the `CONT` line, which stays where it was

#### Scenario: The last structure of a text with no final terminator

- **WHEN** the last line of a text with no final terminator is a `NICK` and it is moved before
  its first sibling
- **THEN** the text ends with what was the line before the `NICK`, again with no terminator

#### Scenario: A document with `\r\n`

- **WHEN** a structure of a document written with `\r\n` is moved
- **THEN** every terminator the edit inserts is `\r\n`

#### Scenario: A pointer with a reciprocal

- **WHEN** the second `FAMC` of a person, or a `CHIL` of a family, is moved before its first
  sibling of the same tag
- **THEN** the edit is returned, and every pointer and its reciprocal stay as written

### Requirement: A move that keeps the order is an empty edit

After the version and the dialect are checked, a target that leaves the structure where it is, the structure itself or the sibling right
after it, or the end when the structure is already the last sibling, SHALL be answered with
an edit holding no text edits and no warnings, not with a refusal.

#### Scenario: Onto itself

- **WHEN** a structure is moved before itself
- **THEN** the edit holds no text edits

#### Scenario: The last sibling to the end

- **WHEN** the last substructure of a record is moved to the end
- **THEN** the edit holds no text edits

### Requirement: A move is refused with a code

The service SHALL refuse a move, and change nothing, with:

- `not-a-structure` when the position's line holds no structure, or its parent is a line with
  no level or no tag;
- `record-edit-unsupported` when the position is a record's opening line;
- `not-a-sibling` when the target's line is not a line of a substructure of the same parent,
  such as a line beneath a sibling, the parent itself, a structure under another parent, a
  continuation line of the parent, or a line holding no structure;
- `no-dialect` when the document was checked against no dialect;
- `stale-document` when the version the caller read is not the document's;
- `reading-changed` when the document after the move would be read otherwise, as the next
  requirement states.

No order of siblings SHALL be refused or warned about for its own sake, in either dialect: a
`GEDC` may move within a 7.0 `HEAD`, a `SCHMA` after an extension tag, a `CHIL` out of birth
order.

#### Scenario: A target under another parent

- **WHEN** a `NAME` of one `INDI` is moved before the `NAME` of another
- **THEN** the service refuses with `not-a-sibling`

#### Scenario: A target beneath a sibling

- **WHEN** a `NAME` is moved before the `GIVN` of another `NAME` of the same person
- **THEN** the service refuses with `not-a-sibling`

#### Scenario: A record

- **WHEN** the position is the opening line of an `INDI`
- **THEN** the service refuses with `record-edit-unsupported`

#### Scenario: A stale version

- **WHEN** the caller read version 3 and the document is at version 4
- **THEN** the service refuses with `stale-document`

#### Scenario: `GEDC` in a 7.0 header

- **WHEN** the `GEDC` of a 7.0 `HEAD` is moved after the `SOUR` that follows it
- **THEN** the edit is returned with no warnings

### Requirement: A move does not change how the document is read

A move SHALL be revalidated over the whole document. When the document after the move would
be read otherwise than before it, with another version resolution (a file read as a Personal
Ancestral File, or no longer read as one), another dialect, or diagnostics that differ as a
multiset of code and message, the move SHALL be refused with `reading-changed` and change
nothing. Otherwise the edit SHALL carry no warnings. A problem the moved structure or its
siblings already had SHALL neither refuse the move nor be reported.

#### Scenario: The diagnostics stay

- **WHEN** a structure of a document with diagnostics is moved among its siblings
- **THEN** the diagnostics of the moved text are those of the original, each by code and
  message
- **AND** the edit's warnings are empty

#### Scenario: A structure that already has an error

- **WHEN** a `BIRT` whose `DATE` is not a date is moved before another event
- **THEN** the edit is returned with no warnings

#### Scenario: A system named before the version

- **WHEN** the `GEDC` of a 7.0 `HEAD` is moved after a `SYST` that follows it
- **THEN** the service refuses with `reading-changed`

#### Scenario: Two versions

- **WHEN** a `GEDC` holds `VERS 7.0` and then `VERS 5.5.1`, and the second is moved before the
  first
- **THEN** the service refuses with `reading-changed`

#### Scenario: A tag declared twice

- **WHEN** a 7.0 `SCHMA` declares `_X` first as an unknown URI and then as the standard
  `DATE`, the document holds `1 _X nonsense`, and the second declaration is moved before the
  first
- **THEN** the service refuses with `reading-changed`

#### Scenario: Siblings at a wrong level

- **WHEN** a `BIRT` writes `3 DATE 1900` and then `2 PLAC x`, and the `PLAC` is moved before
  the `DATE`
- **THEN** the service refuses with `reading-changed`

### Requirement: The slots of a move are described before it

The service SHALL describe, for the substructure on a position's line, the document's
version, the structure's line range and subtree range, and every slot it may take in file
order: before each substructure of the same parent, a line with no tag and a continuation line
excluded, and then the end. Each slot SHALL carry the target that takes it, in the form the
move accepts, and SHALL say whether taking it changes the order. A move at that version to a
listed slot SHALL NOT be refused for its place; it MAY be refused with `reading-changed`, and
a move to a slot that changes nothing SHALL be the empty edit.

The description SHALL be refused with `not-a-structure`, `record-edit-unsupported` or
`no-dialect` where a move from that position would be.

#### Scenario: Three events

- **WHEN** the move of the `RESI` of a person that writes `BIRT`, `RESI` and `DEAT` is described
- **THEN** the slots are before `BIRT`, before `RESI`, before `DEAT` and the end
- **AND** only before `RESI` and before `DEAT` say the order stays

#### Scenario: An only child

- **WHEN** the move of the only substructure of a `NAME` is described
- **THEN** the slots are before itself and the end, and neither changes the order

#### Scenario: A line with no tag among the siblings

- **WHEN** a record holds a line `1` with no tag between two events and the move of one event
  is described
- **THEN** no slot is before the line with no tag

#### Scenario: Every slot moves

- **WHEN** a move is made to each slot of a description of each substructure outside `HEAD`
  of a fixture whose lines are all at their right level
- **THEN** none is refused

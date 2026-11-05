## ADDED Requirements

### Requirement: One action applies every fix that needs no choice

The service SHALL offer one action of kind `source.fixAll`, titled **Fix all safe
problems**, whose edit applies together the **Add trailer** fix, the **Add a GEDCOM 7.0
header** fix and the **Change level to N** fix for every current diagnostic that has one.
It SHALL NOT include a fix that depends on a choice, such as replacing, creating or voiding
an unresolved pointer. The edit SHALL be at the document's current version.

#### Scenario: Several problems, one edit

- **WHEN** a document has no header, no trailer and two lines whose level is wrong
- **THEN** one action is offered
- **AND** applying its edit leaves a document with no diagnostics

#### Scenario: An empty document

- **WHEN** the document is empty
- **THEN** the action's edit inserts the header and then the trailer
- **AND** the document has no diagnostics once it is applied

#### Scenario: An unresolved pointer is left alone

- **WHEN** the only diagnostic is an unresolved pointer
- **THEN** no action is offered

#### Scenario: The document's own terminator

- **WHEN** the document uses `\r\n`
- **THEN** every terminator the action inserts is `\r\n`

### Requirement: The combined result is checked

The service SHALL revalidate the text the edit produces and offer the action only if the
number of diagnostics falls and no diagnostic code occurs more often than before. If the
level fixes break that, the service SHALL offer the action without them. If nothing remains
to fix, it SHALL offer none.

#### Scenario: Level fixes that do not hold together

- **WHEN** applying every **Change level to N** edit would leave more diagnostics of one
  code than there were
- **THEN** the action is offered without the level fixes, or not at all

#### Scenario: Nothing to fix

- **WHEN** the document has no diagnostics with a safe fix
- **THEN** no action is offered

### Requirement: A stale request is refused

A request made for a version other than the document's SHALL be refused as stale, as for a
quick fix.

#### Scenario: The document moved on

- **WHEN** fix-all is requested for version 3 and the document is at version 4
- **THEN** the answer is a `stale-document` refusal and no edit

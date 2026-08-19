# language-service/xref-quick-fix Specification

## Purpose

States which actions are offered for an unresolved xref and in what order, so that
the action honouring what the author wrote comes first, and so that no offered action
can silently attach a person to the wrong family.

## Requirements

### Requirement: A replacement is offered only where it is plausible

The service SHALL offer at most one replacement for an unresolved xref, and SHALL
choose it by how near the candidate is to the xref the author wrote.

A candidate SHALL be offered only where it is nearer to that xref than every other
candidate, and within a small edit distance of it. Where two candidates are equally
near, or where the nearest is not near enough, the service SHALL offer no replacement
at all.

Offering a candidate unrelated to the failing xref is forbidden. Applied, it attaches
a record to an unrelated one, the document then validates clean, and nothing points
at the mistake again — so silence is the correct answer whenever the tool cannot know.

#### Scenario: A typo with one near candidate

- **WHEN** the xref is `@F1450@` and `@F145@` is the only candidate within a small
  edit distance
- **THEN** a single replacement with `@F145@` is offered

#### Scenario: Two candidates equally near

- **WHEN** the xref is `@F1450@` and both `@F145@` and `@F1451@` are equally near
- **THEN** no replacement is offered, because choosing between two families is not
  the tool's to do

#### Scenario: A document full of candidates, none of them near

- **WHEN** the xref resembles no record in the document
- **THEN** no replacement is offered, however many records of the required type exist

#### Scenario: Browsing is not a quick fix's job

- **WHEN** the document declares many records of the required type
- **THEN** the actions never present a list of them to choose from; completion inside
  an xref already offers them, filtered as the reader types

#### Scenario: A record declared twice

- **WHEN** a candidate xref is declared by more than one record
- **THEN** it is not offered as a replacement, because which record it names is
  itself in doubt

### Requirement: An offered candidate is named

Where a replacement is offered, the action SHALL name the record as well as its xref,
so the reader has something to choose on.

A family SHALL be named by its spouses. Where a record cannot be named, the action
SHALL offer the xref alone rather than a placeholder.

#### Scenario: A family with two spouses

- **WHEN** the offered candidate is a `FAM` whose `HUSB` and `WIFE` both resolve to
  records carrying a name
- **THEN** the action names the candidate by both names

#### Scenario: A family with one spouse recorded

- **WHEN** only one of `HUSB` and `WIFE` resolves to a record carrying a name
- **THEN** the action names the candidate by that name alone

#### Scenario: A record that cannot be named

- **WHEN** the offered candidate carries nothing to name it by
- **THEN** the action offers the xref alone

#### Scenario: The document outline is unaffected

- **WHEN** the document symbols are requested
- **THEN** they are exactly what they were before this capability existed

### Requirement: Creating the record the author named comes first

Where an xref resolves nowhere and a record of that type can be created, that action
SHALL be offered before any replacement, because the author wrote an identifier for a
record they mean to have.

The created record SHALL be kept only where the document still validates with it,
unchanged from before this capability existed.

#### Scenario: An xref resolving nowhere, with a near candidate as well

- **WHEN** creation is possible and a plausible replacement was also found
- **THEN** creation is offered first and the replacement second

#### Scenario: A record type that cannot be created bare

- **WHEN** the required record type has a payload the service cannot supply
- **THEN** no creation is offered, and the actions are whatever else applies

### Requirement: GEDCOM 7 offers the empty pointer, and 5.5.1 does not

Where the document is GEDCOM 7, the service SHALL offer to replace an unresolved xref
with the empty pointer the specification provides for a deliberately absent target.
It SHALL be offered last, because it discards the identifier the author wrote.

Where the document is GEDCOM 5.5.1, that action SHALL NOT be offered. The version has
no such value, and the result would fail to validate.

#### Scenario: An unresolved xref in a GEDCOM 7 document

- **WHEN** actions are requested for an unresolved xref and the dialect is 7.0
- **THEN** an action replacing it with the empty pointer is offered, after the others

#### Scenario: An unresolved xref in a GEDCOM 5.5.1 document

- **WHEN** actions are requested for an unresolved xref and the dialect is 5.5.1
- **THEN** no empty-pointer action is offered

#### Scenario: A document whose version does not resolve

- **WHEN** the dialect is unknown
- **THEN** no empty-pointer action is offered, because which spelling would be
  accepted is unknown

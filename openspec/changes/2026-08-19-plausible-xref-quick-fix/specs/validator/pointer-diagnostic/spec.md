## Purpose

States what an unresolved pointer's diagnostic says, so that a reader learns the one
fact about the line they are looking at, and so that the closed-set vocabulary stays
reserved for sets that are actually closed.

## ADDED Requirements

### Requirement: An unresolved pointer is reported as a fact about the document

Where a payload is an xref and no record of the required type carries it, the
validator SHALL report that no record of that type carries that xref, naming both.

The diagnostic SHALL NOT list the xrefs that do exist, in whole or in part, and SHALL
NOT state how many were omitted. The set of pointer targets is the population of the
document, and a sample of it is not information about the line that failed.

#### Scenario: An xref naming no record of the required type

- **WHEN** `FAMC` carries `@F1450@` and no `FAM` record in the document declares it
- **THEN** the diagnostic says that no `FAM` record carries `@F1450@`
- **AND** it names no other xref

#### Scenario: A document that declares no record of the required type at all

- **WHEN** `SOUR` carries `@S1@` and the document declares no `SOUR` record whatsoever
- **THEN** the diagnostic is the same sentence as when other `SOUR` records exist,
  because the reader's next action is the same either way

#### Scenario: A pointer whose schema names no target record type

- **WHEN** the failing pointer's type does not resolve to a record tag
- **THEN** the diagnostic says that no record carries that xref, naming the xref and
  no type

#### Scenario: The data a quick fix reads is unchanged

- **WHEN** an unresolved xref is reported
- **THEN** the diagnostic still carries the xref and the required record tag, so a
  host can offer actions without parsing the message

### Requirement: A payload that is not a pointer keeps its own diagnostic

An xref that names nothing and a payload that is not an xref at all are different
defects, and the validator SHALL keep reporting them differently. The second is what
a program writes when it puts a URL or a title where a citation belongs, and there
the shape is what is wrong.

#### Scenario: A payload that is not xref-shaped

- **WHEN** a pointer's payload is present and is not written as `@xref@`
- **THEN** the diagnostic says the value should be a pointer to that record type,
  written as `@xref@`, unchanged from before this capability existed

#### Scenario: A pointer with neither payload nor children

- **WHEN** a required pointer has no payload and no substructure
- **THEN** the diagnostic is the same as for a payload of the wrong shape

### Requirement: The closed-set voice is reserved for closed sets

Where a value must come from an enumerated set, the validator SHALL keep listing that
set, because the list is the whole answer. It SHALL NOT use that phrasing for a
pointer.

#### Scenario: An enumeration

- **WHEN** `SEX` carries a value outside its enumerated set
- **THEN** the diagnostic lists the permitted values, unchanged from before this
  capability existed

#### Scenario: The two are not confused

- **WHEN** any pointer fails to resolve
- **THEN** the diagnostic does not use the phrase reserved for enumerated sets

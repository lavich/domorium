## Purpose

Measures the validator against files real genealogy programs wrote, rather than
against fixtures written to be validated, so that what the tooling says about a
real export is known, recorded, and visibly changed when it changes.

## ADDED Requirements

### Requirement: The corpus is fetched, never carried

The check SHALL read every corpus file from its upstream location at check time
and SHALL NOT keep a copy in this repository. What this repository holds is the
record: for each file, where it comes from, under which licence, a content hash,
and the diagnostics it is expected to produce.

Two things follow, and both are intended. Licences that would govern
redistribution — copyleft, or a permission limited to non-commercial use — never
apply, because nothing is redistributed. And other people's family data is not
republished by this project.

#### Scenario: A corpus file is checked

- **WHEN** the check runs against a recorded corpus entry
- **THEN** the file is read from its upstream location, its content hash is
  compared with the recorded one, and no copy is written to disk

#### Scenario: A file that cannot be read

- **WHEN** a corpus file cannot be fetched
- **THEN** the check fails and names the file, rather than skipping it and
  reporting success over the remainder

#### Scenario: A file that changed upstream

- **WHEN** the bytes at a recorded location no longer match the recorded hash
- **THEN** the check fails, naming both hashes, and says that the new file has to
  be read before the record is renewed

### Requirement: Every corpus entry names its origin and its licence

Each entry SHALL record where the file came from before it reached the location
being fetched — the program that exported it and the corpus that collected it —
and the licence that corpus states for it.

An entry SHALL address bytes that cannot change under it: a location pinned to an
upstream revision, not to a moving branch.

#### Scenario: Reading the record

- **WHEN** a reader asks where a corpus file came from
- **THEN** the record names the exporting program and version where the upstream
  corpus states it, the corpus the file was collected by, and its licence

#### Scenario: The upstream branch moves

- **WHEN** the upstream corpus gains further commits
- **THEN** the recorded locations still address the same bytes, and the check
  neither fails nor silently reads something else

### Requirement: A high-volume file has an expectation a person can read

A corpus file may produce thousands of diagnostics. For such a file the
expectation SHALL be recorded as a count per diagnostic code together with a
digest of the diagnostics themselves, so that a change is legible as a change in
counts, while a rearrangement that leaves the counts equal is still caught.

The wording of a diagnostic SHALL NOT form part of any expectation: a message is
meant to get clearer, and an improvement must not read as a regression.

#### Scenario: A file with thousands of diagnostics

- **WHEN** the expectation for such a file is recorded
- **THEN** it states how many diagnostics of each code the file produces, and a
  digest over them, rather than one entry per diagnostic

#### Scenario: A change in what the validator reports

- **WHEN** a code is reported fewer or more times than recorded
- **THEN** the check fails and states the code with both counts

#### Scenario: The same counts over different places

- **WHEN** the counts per code are unchanged but the diagnostics fall elsewhere
  in the file
- **THEN** the check fails, because the digest no longer matches

#### Scenario: A diagnostic is reworded

- **WHEN** only the text of a diagnostic message changes
- **THEN** the check passes

### Requirement: Today's behaviour is recorded, including what looks wrong

The record SHALL hold what the validator does now, not what it ought to do. Where
a recorded diagnostic is believed to be the validator's own defect, the entry
SHALL say so and name where that defect is tracked.

This keeps the corpus a measurement rather than a wish, and makes a later fix
appear here as a count going down.

#### Scenario: A recorded diagnostic that is a suspected defect

- **WHEN** an entry records diagnostics believed to come from a defect in the
  validator
- **THEN** the entry names the issue tracking it, and the check still passes
  while the defect is present

#### Scenario: The defect is fixed

- **WHEN** the validator stops reporting those diagnostics
- **THEN** the check fails until the record is renewed, so the improvement is
  acknowledged rather than absorbed

### Requirement: The check stays outside the offline gate

The corpus check needs a network and SHALL NOT be part of the repository's
offline check. It SHALL run as its own step in continuous integration, and SHALL
report what it covered when it passes.

#### Scenario: The offline gate runs

- **WHEN** the repository's own check is run with no network
- **THEN** it does not attempt to fetch the corpus and does not fail for the lack
  of it

#### Scenario: The corpus check passes

- **WHEN** every recorded file matches its record
- **THEN** the check reports how many files it read and how many diagnostics it
  compared

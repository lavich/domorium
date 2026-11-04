## Why

A file with no `0 TRLR`, or none of `0 HEAD`, is reported but cannot be repaired, although
there is only one correct thing to write. The author of a new or truncated file has to
remember the lines and type them. Today `0 TRLR` missing gives `VAL002` at `0:0` and
`HEAD` missing gives only `VAL012` ("no version in HEAD.GEDC.VERS") at `0:0`, which does
not say a header is absent.

The user's requirement, 2026-11-04: "да" to offering quick fixes for a missing `TRLR` and
a missing `HEAD`, starting with those two. A missing final newline is not part of this
change: no diagnostic reports it today, and the editors' own final-newline setting covers it.

## What Changes

- The validator marks `VAL002` for a missing `TRLR` with the tag it lacks, and reports it
  on the last line of the document rather than at the first.
- The validator marks `VAL012` with the fact that the file has no `HEAD` record at all, as
  against a `HEAD` that names no version.
- The language service offers **Add trailer** for the first and **Add a GEDCOM 7.0 header**
  for the second. Each inserts the lines in the document's own line terminator.
- No fix is offered for a `HEAD` that exists and names no version, for any other version
  than 7.0, or for any other missing tag.

### Proposed scope

Only these two actions. The header and trailer texts are produced in one place so a later
"new file" command can reuse them; that command is not part of this change.

## Capabilities

### New Capabilities

- `validator/header-trailer-diagnostics`: what the diagnostics for an absent `HEAD` and an
  absent `TRLR` carry and where they sit.
- `language-service/header-trailer-quick-fix`: which actions are offered for them, what they
  insert, and where.

### Modified Capabilities

None.

## Impact

- Layers: `validator` (diagnostic data and range), `language-service` (code actions).
  `language-server` and `codemirror` forward diagnostics and actions unchanged; the
  dependency direction still points down.
- Hosts: VS Code, JetBrains, Obsidian and the web editor all gain the two actions through
  the shared service. The diagnostic for a missing `TRLR` moves from the first line to the
  last, which every host shows.
- No new dependency, no protocol change, no version of any package decided here.

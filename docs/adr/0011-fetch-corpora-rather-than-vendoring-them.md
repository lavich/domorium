# 0011. Fetch test corpora rather than vendoring them

- **Status:** Superseded by [0013](0013-cache-the-fetched-corpora-in-ci.md)
- **Date:** 2026-08-18

## Context

Two corpora measure the validator against files this project did not write: the
23 official FamilySearch GEDCOM 7.0 test files, and unmodified exports from real
genealogy programs collected by [cacack/gedcom-go](https://github.com/cacack/gedcom-go)
in its `testdata/` directory. Together they are about 2.9 MB, dominated by one
2.4 MB MyHeritage Family Tree Builder 8 export.

Their licensing is not one thing. The official suite states no licence at all,
unlike the specification repository beside it, which is Apache-2.0. The vendor
collection is mixed per file: `MIT OR CC0-1.0` for the vintage exports it took
from `D-Jeffrey/gedcom-samples`, MIT for the current exports its author made and
for the files from `frizbog/gedcom4j`, Unlicense for the structural quirk files
from `gedcom7code/test-files`, GPL-2.0 for files taken from Gramps, and one suite
offered for non-commercial use only.

These are also real families' records. The collecting corpus redacts submitter
contact details before carrying a file, but the genealogical content is real.

What a corpus check actually needs from the files is reproducibility: that the
bytes checked today are the bytes checked tomorrow, and that a change in them is
visible rather than silent.

## Decision

No corpus file is copied into this repository, however permissive its licence.
Each file is fetched into memory at check time from a location pinned to a full
upstream revision, and what is committed is the record: provenance, licence, a
SHA-256, and the diagnostics the file is expected to produce.

`scripts/check-conformance.mjs` enforces the parts a rule cannot: a file that
cannot be read is a failure rather than a skip, a hash that no longer matches
fails and names both hashes, and a location that carries no full revision is
refused before it is fetched.

## Consequences

Reproducibility comes from the recorded hash and the pin rather than from
possession, so it is not weakened. Licences that govern redistribution —
copyleft, or permission limited to non-commercial use — never apply, because
nothing is redistributed, and no attribution table has to be kept true as the
corpus grows. Other people's family data is not republished by this project.

The costs are real. The check needs a network, so it stays out of `npm run check`
and runs as its own CI job. If an upstream repository disappears, the check fails
by name and the entries have to be re-pointed at the originals — the loss is
visible, which is the point. Adding a file is two steps rather than one: record
the location and revision, then re-record with `--update`.

This binds any corpus added later, not only these two.

## Alternatives considered

**Vendor the permissively licensed subset, fetch the rest.** Three rules instead
of one — MIT redistribution carries the notice and licence text, CC0 carries
nothing, GPL-2.0 and non-commercial cannot be carried at all — plus an
attribution table someone has to keep true on every addition. The file most worth
having is 2.4 MB and permissively licensed, so this rule would put it in this
repository's history for good, where a delete does not remove it.

**Vendor everything and accept the licence risk.** Rejected on the family-data
ground alone, before the licence question.

**Fetch each file from its own original upstream.** The curation is the thing
being used: it names the exporting program and version per file, gives the files
intelligible names, and redacts submitter contact details. The originals have
none of that.

**Pin to a branch instead of a revision.** An upstream edit would then read as
our regression, and the recorded hash would race the fetch rather than guard it.

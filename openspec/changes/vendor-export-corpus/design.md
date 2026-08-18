## Context

See proposal.md for why. What shapes the approach is that most of this already
exists: `scripts/check-conformance.mjs` fetches 23 official GEDCOM 7.0 files into
memory, hashes them, runs the validator through its published entry point, and
compares the result against `scripts/conformance-corpus.json`, where each entry is
a hash and a sorted list of `"<line> <level> <code>"` strings. Its header states
why nothing is copied — the upstream states no licence — and why a failed fetch is
a failure rather than a skip.

Three properties of that design are worth keeping and are assumed below: the
message text is deliberately not part of an expectation, a moved expectation is a
failure in both directions, and the check lives outside `npm run check` because
that has to work on a plane.

What does not fit is volume. One vendor export produces 12 762 diagnostics. The
existing shape would put 12 762 strings into a JSON file and turn any change in
the validator into an unreadable diff, which would make `--update` a rubber stamp.

## Goals / Non-Goals

**Goals:**

- One mechanism for both corpora, not two scripts that drift.
- An expectation for a high-volume file that a reviewer can read in a diff.
- A record that says where each file came from and under what licence, pinned so
  the bytes cannot move.

**Non-Goals:**

- Fixing anything the corpus reports. Suspected defects are recorded and tracked.
- Byte-level decoding. Files whose point is ANSEL or CP437 need a decision about
  who decodes them before a corpus entry means anything.
- Performance measurement. `scripts/generate-gedcom.mjs` and issues #152 and #210
  own that; the upstream 48 MB file adds nothing but CI minutes.
- Moving behaviour into a package. This is repository tooling; no package gains
  code, and the script keeps consuming `@domorium/validator` through its entry
  point.

## Decisions

### Fetch every file, including the ones whose licence would let us copy them

The upstream corpus is mixed: `MIT OR CC0-1.0` for the vintage vendor exports,
MIT for exports the corpus author made themselves, Unlicense for the structural
quirk files, GPL-2.0 for files taken from Gramps, and one suite offered for
non-commercial use only.

Copying the permissive subset and fetching the rest was considered and rejected:

- MIT redistribution carries the notice and the licence text with it, CC0 carries
  nothing, GPL-2.0 and non-commercial cannot be carried at all. That is three
  rules and an attribution table someone has to keep true on every addition.
- The file we most want is 2.4 MB and is one of the permissive ones, so the rule
  would put it in this repository's history for good.
- These are real families' records. Not republishing them costs us nothing.
- Reproducibility, the real reason to vendor, is already answered by the recorded
  hash, and is strengthened here by pinning.

The cost is that the check needs a network and fails when a file cannot be read.
Both were already true.

This is a repository-wide policy about corpora rather than a detail of one script,
and the reverse direction is the expensive one — a file committed once stays in
history — so it gets an ADR.

### Fetch from the corpus that curated the files, pinned to a commit

Each file could be fetched from its own original upstream. Fetching from the
curating corpus instead is chosen because the curation is the thing we are using:
it names the exporting program and version per file, gives the files intelligible
names, and redacts personal contact details from submitter records before
carrying them. The originals have none of that.

Every recorded location is pinned to an upstream commit, so a later commit there
cannot change what we read, and the recorded hash guards the pin rather than
racing it. A branch URL would make an upstream edit look like our regression.

If that repository disappears, the check fails by name and we re-point the entries
at the originals. A silent skip is what must not happen, and does not.

### Two shapes of expectation, chosen per entry rather than by a threshold

An entry records either

- `expected`: the sorted `"<line> <level> <code>"` list used today, for files
  whose output a person can read; or
- `summary`: `{ total, byCode, digest }` — the count per code, and a digest over
  the same normalised diagnostics, for files that produce thousands.

The digest covers level, code, line and column, and never the message: it catches
a rearrangement that leaves the counts equal, while a reworded message stays free
to improve. Which shape an entry uses is recorded in the entry, so `--update`
renews it in place and cannot quietly switch a file to the weaker record.

A single shape was considered in both directions. Per-diagnostic for everything
gives 12 762 lines of JSON and an unreviewable diff; summary for everything throws
away the per-line precision the official suite has today, which is the more
valuable of the two.

### A second corpus file, one script

`scripts/vendor-corpus.json` beside the existing `scripts/conformance-corpus.json`,
both read by the same script. The entries carry different metadata — provenance,
licence, suspected-defect notes — and mixing them would mean rewriting the
existing records to gain fields only the new ones use. The console summary reads
better separated too: what is official conformance and what is the world.

### Record what the validator does today, defects included

Four things found while measuring look like our own defects rather than the files'.
Each gets an issue, is referenced from the entry that records it, and is fixed
elsewhere:

| What                                                                                                                                         | Where seen                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `AGE <8y` rejected, `AGE < 8y` accepted; `8Y` and `child` rejected                                                                           | 24 of 40 AGE payloads in the 5.5.1 age-keyword file |
| An unresolved pointer prints a set of several hundred xrefs (#190)                                                                           | 622 findings in the MyHeritage export               |
| `unresolved-xref`, `invalid-level`, `LEXER` sit beside `VAL001…VAL015`, so "code names a section of the specification" (#151) has exceptions | the code vocabulary itself                          |
| A lexer warning on the at-sign quirk file, which exists to be read                                                                           | `xref-case.ged`                                     |

Recording them keeps the corpus a measurement instead of a wish, and a fix then
shows up here as a count going down, which is exactly the signal wanted.

### The first set

Thirteen files, about 2.9 MB, chosen so each teaches something different: the
MyHeritage Family Tree Builder 8 export for volume and vendor idiom; Legacy 10 and
Family Origins 5.0 for dates and for a file that resolves as 5.5; Ancestris 11 for
events asserting nothing; the five current exports of one seed tree — Ancestry,
FamilySearch, Gramps, MyHeritage, RootsMagic — because the same twenty records
through five programs is a controlled comparison; the custom-tag torture file for
extensions; and the four structural quirk files for at-signs, xref case, AGE
keywords and dual years.

## Risks / Trade-offs

- **`--update` becomes a habit rather than a decision** → the summary shape keeps
  the diff to a few numbers per file, and a failure names the code and both
  counts, so renewing a record without reading it is a visible act.
- **Upstream repository vanishes** → the check fails by name; entries are
  re-pointed at the originals. Pinning means it cannot change under us first.
- **Someone adds an unpinned location later** → the script rejects a location that
  does not carry a full upstream revision.
- **CI minutes and network flakiness** → one job, already path-filtered, about
  2.9 MB, dominated by a single file.
- **A recorded number that is wrong from the start** → the record is what the
  validator does, so it cannot be wrong about that; where it records a suspected
  defect, the entry says so and names the issue.
- **CI logs carry other people's data** → the record holds codes and positions,
  never payloads. Failure output prints messages, which name tags and xrefs rather
  than the values in the file.

## Migration Plan

Additive. Rollback is deleting the corpus file and its step; the existing official
corpus and its records are untouched.

## Why

Nothing in this repository measures the validator against a file a real program
wrote. `check:conformance` covers 23 official GEDCOM 7.0 test files, and every
genealogy program in use still exports 5.5.1.

What that costs, measured against real exports:

| File                             | Lines   | Findings | What dominates                          |
| -------------------------------- | ------- | -------- | --------------------------------------- |
| MyHeritage Family Tree Builder 8 | 105 707 | 12 762   | `VAL001` ×11 617 — `RIN` under an event |
| Legacy 10                        | 18 348  | 1 349    | `VAL004` ×1 015 — dates                 |
| Family Origins 5.0               | 9 191   | 745      | `VAL004` ×648 — dates                   |
| Ancestris 11                     | 6 217   | 160      | `VAL010` ×81 — events asserting nothing |
| A synthetic "MyHeritage" fixture | 94      | 0        | nothing                                 |

The last row is why this is worth doing: a fixture written to look like a vendor
export teaches nothing. A real one says that 91% of our output on it is a single
true statement repeated 11 617 times.

Looking at these files by hand for an afternoon also surfaced, without trying:

- `AGE <8y` is rejected while `AGE < 8y` is accepted — the modifier is read only
  with a space after it, and real files omit it.
- A real export carries 2 982 `FAMS` pointers against 2 863 `FAM` records: 119
  dangling pointers nobody had reported.
- The current FamilySearch export writes two `HEAD.NOTE` lines, which 5.5.1
  allows once.
- #190 reproduces at scale: one unresolved pointer prints a set of several
  hundred xrefs into the message.

None of that is knowable from fixtures we write ourselves, and none of it is
visible again tomorrow unless the numbers are recorded.

## What Changes

- Extend the recorded-corpus check to a second source: real exports from real
  programs, fetched at check time and **never copied into this repository**.
- Record provenance and licence per file, and pin each URL to an upstream commit
  so the bytes cannot move under the recorded hash.
- Add a second shape of expectation for high-volume files — counts per code plus
  a digest — so a file with 12 762 findings has an expectation a reviewer can
  read and a diff that says `VAL001 11 617 → 43`.
- Keep the existing rules: a file that cannot be fetched is a failure, not a
  skip, and the check stays out of `npm run check` because it needs network.
- Record today's behaviour as-is, including the findings that are probably our
  own defects. Each of those gets an issue; **fixing them is not part of this
  change**, and every fix will show up here as a number going down.

Out of scope, deliberately: the upstream 48 MB scale file (performance is #152
and #210, and `scripts/generate-gedcom.mjs` already makes a file that size);
byte-encoding fixtures, which need a decision about who decodes ANSEL before
they mean anything; and the malformed set, which our parser tests already cover.

## Capabilities

### New Capabilities

- `conformance/vendor-corpus`: the validator is measured against unmodified
  exports from real genealogy programs, with the corpus fetched rather than
  carried, and today's diagnostics recorded so a change in them is visible.

### Modified Capabilities

None. No existing spec describes the conformance check.

## Impact

- **Layers:** no package changes at all. `scripts/check-conformance.mjs`, a
  corpus file beside it, and the existing `conformance` job in
  `.github/workflows/ci.yml`. The script consumes `@domorium/validator` through
  its published entry point, as it does today, so the dependency direction still
  points down and nothing points back up.
- **Editor hosts:** none affected. No host, extension or plugin sees any of this;
  it is a repository check.
- **Licence and privacy:** nothing is redistributed, so the mixed licences
  upstream (MIT, CC0-1.0, Unlicense, GPL-2.0, one "non-commercial use" suite)
  never attach to us, and other people's family data stays where it is.

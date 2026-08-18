## 1. The record

- [ ] 1.1 Write `scripts/vendor-corpus.json` with the thirteen entries design.md
      names: a location pinned to an upstream revision, a `sha256`, the exporting
      program and version, the corpus that collected the file and its licence, and
      an empty expectation for now. No file is copied into the repository.
- [ ] 1.2 Note on each entry that records a suspected defect of ours which issue
      tracks it, once 4.1 has filed them.

## 2. The check

- [ ] 2.1 Teach `scripts/check-conformance.mjs` to read a second corpus, keeping
      one code path: same fetch, same hash comparison, same "a file that cannot be
      read is a failure" rule, and a console summary that reports the two corpora
      separately.
- [ ] 2.2 Refuse a location that does not carry a full upstream revision, so an
      unpinned entry cannot be added later. Test it.
- [ ] 2.3 Add the `summary` expectation shape — total, count per code, and a digest
      over level, code, line and column — chosen by what the entry already records
      rather than by a threshold, and renewed in place by `--update`. Test that a
      changed count fails naming both counts, that equal counts over moved
      diagnostics still fail, and that a reworded message passes.
- [ ] 2.4 Extract the parts worth testing — normalising diagnostics, the digest,
      comparing an expectation — so they can be unit-tested from a colocated
      `*.test.ts`, which is the first test the `scripts/` directory carries.

## 3. Recording today's behaviour

- [ ] 3.1 Run `npm run check:conformance -- --update`, read the recorded numbers
      against what design.md measured, and commit the record. A number that
      disagrees with the design is a finding, not a typo to smooth over.
- [ ] 3.2 Give each high-volume entry a one-line note saying what dominates it, so
      the record can be read without running it.

## 4. What the corpus found

- [ ] 4.1 File an issue per suspected defect from the design's table: the `AGE`
      modifier read only with a space after it, the code vocabulary that is three
      vocabularies, and the lexer warning on the at-sign file. Reference #190 and
      #151 rather than duplicating them. Fix nothing here.

## 5. Documentation and CI

- [ ] 5.1 Extend the header comment of `scripts/check-conformance.mjs`: the second
      corpus, why nothing is vendored however permissive the licence, and what the
      two expectation shapes are for.
- [ ] 5.2 Write `docs/adr/0011-fetch-corpora-rather-than-vendoring-them.md` from
      `docs/adr/template.md` and add its row to the index. No layer moves, so
      `docs/architecture.md` is untouched; no package version changes, so no
      changelog entry.
- [ ] 5.3 Make the `conformance` job in `.github/workflows/ci.yml` run against both
      corpora and fire when either corpus file or the script changes.

## 6. Checks

- [ ] 6.1 Run `npm run check:conformance` from a clean checkout and confirm it
      passes, reports both corpora, and takes an acceptable time.
- [ ] 6.2 Confirm `npm run check` neither fetches anything nor fails without a
      network.
- [ ] 6.3 Run `npm run check` and record whether `check:jetbrains` ran or was
      skipped for lack of a JDK.

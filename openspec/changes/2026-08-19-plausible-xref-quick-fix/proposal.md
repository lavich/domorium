## Why

On a MyHeritage export from the vendor corpus one diagnostic appears 621 times, and
each occurrence looks like this:

```
Value for FAMC should be in set [@F70@, @F75@, @F76@, @F77@, @F78@, @F81@,
  @F82@, @F83@, @F84@, @F85@, … 2853 more]

  Replace with @F285@      Replace with @F286@      Replace with @F287@
  Replace with @F78@       Replace with @F75@       Replace with @F76@
  Replace with @F209@      Replace with @F77@       Replace with @F214@
  Replace with @F81@
  Create FAM record @F1450@
```

Three separate things are wrong, and they get worse the more real the file is.

**The ten replacements are arbitrary.**
[`codeActions.ts`](../../../packages/language-service/src/libs/codeActions/codeActions.ts)
takes every record of the required tag in index order and cuts the first ten:

```ts
const candidates = Array.from(context.index.entries())
  .filter(({ declarations }) => declarations.length === 1)
  .map(({ declarations }) => declarations[0])
  .filter((declaration) => declaration.recordTag === recordTag);
…
choices: candidates.slice(0, MAX_REPLACEMENT_CHOICES).map(…)
```

Nothing about those ten relates to the xref that failed; they are the first ten
families in the file. In genealogy that is not merely unhelpful. Clicking one
attaches a person to a family of strangers, the document then validates clean, and
nothing points at the mistake again. A wrong quick fix is worse than none.

**The message speaks enumeration language about a pointer.** `formatValueSet` is
called for enumerations at [`rule-node.ts:427`](../../../packages/validator/src/validator/rule-node.ts)
and for pointers at `rule-node.ts:721`. "should be in set […]" is exact for a closed
vocabulary — `SEX` is `M|F|U|X`, and listing all four _is_ the answer. For a pointer
the set is the population of the file, so ten of 2 863 plus "… 2853 more" is not
information. The true statement about that line is that no `FAM` record carries
`@F1450@`.

**The action that reads the author's intent is last.** The author wrote `@F1450@`;
that names a family they mean to have. `Create FAM record @F1450@` respects it, and
it sits under ten random replacements.

#190 reports the same message from the other side — the voice, and the listing of
1 707 xrefs. This change fixes the pointer half of it at the source.

## What Changes

- **The pointer diagnostic states a fact instead of listing a set.** Where an xref
  names no record of the required type, the message becomes
  `No FAM record carries @F1450@`. The set listing goes away for pointers, and
  `formatValueSet` stays where it is exact — enumerations, and nothing else.
- **The "declares none" variant is folded into that one sentence.** With no
  candidates left to name, `getAvailableValues` leaves the pointer path entirely —
  on the file above that is 621 index scans that no longer happen, which is the
  payload complaint answered at its source rather than trimmed downstream.
- **A replacement is offered only when it is plausible.** One candidate, chosen by
  edit distance against the xref the author actually wrote: the nearest candidate
  when it is nearest by itself and within distance 2, and nothing at all on a tie
  or when everything is farther. `MAX_REPLACEMENT_CHOICES` and the ten-way
  `choices` array go away. Browsing 2 863 records is completion's job, and
  completion inside `@…@` already offers them, filtered as the reader types.
- **A candidate that is offered is named.** `Replace with @F285@ — Gascoigne /
Wardle`. `recordLabel` gains an optional resolver so that a `FAM` can be named by
  its spouses, which is the one record type it deliberately could not name before.
- **Creation comes first** where the xref resolves nowhere, because it is the action
  that reads what the author wrote.
- **GEDCOM 7 gains `@VOID@`** — the deliberately-empty pointer the specification
  provides — offered last, because it discards the identifier the author typed.
  5.5.1 has no such value and is offered no such action.

## Capabilities

### New Capabilities

- `validator/pointer-diagnostic`: an unresolved pointer is reported as a sentence
  about this document, and the closed-set vocabulary is reserved for closed sets.
- `language-service/xref-quick-fix`: the actions offered for an unresolved xref are
  ordered by what the author wrote, and a replacement is offered only where one is
  plausible enough to be safe.

### Modified Capabilities

None. No existing spec describes diagnostics or code actions.

## Impact

- **Layers:** `validator` changes a message it already emits; `language-service`
  changes how it chooses and orders code actions and gains `nodes` in its code
  action context, which it already holds. Neither gains a dependency, and the
  direction still points down. No editor API and no LSP type appears below the
  adapter layer.
- **Editor hosts:** all four see the new message and the new actions, and none needs
  a line of code. `codemirror` and `language-server` keep handling `CodeAction.choices`;
  nothing in `language-service` produces it after this change, and pruning that
  optional field from two published packages is a breaking change that belongs to
  its own decision, not this one.
- **Conformance:** no re-recording. Neither corpus holds a diagnostic's message —
  `check-conformance.mjs` records codes, counts and a digest precisely because
  "pinning it would make every improvement read as a regression". So the evidence
  wanted here is the check passing _unchanged_: same 14 781 diagnostics, same codes,
  proving the wording moved and what fires did not.
- **Releases:** two publishing units are touched. `@domorium/language-service`
  depends on `@domorium/validator` by version range, so per ADR-0003 `validator`
  publishes first. No version is bumped and no tag is created in this change.
- **Documentation:** a changelog entry for each package. No exported signature moves
  — `recordLabel` is internal, and `CodeAction` keeps its shape — so the
  `language-service` README carries no obligation here; it gains a short section on
  the actions anyway, at the granularity it already documents the record preview.

## Deliberately not in this change

`Create FAM record @F1450@` still writes only `0 @F1450@ FAM` above the trailer. The
issue also asks it to write the reciprocal pointer — `FAMC` → `CHIL`, `FAMS` →
`HUSB` or `WIFE`, and that last pair needs `SEX`, which a real file may not carry.
That is the one piece of #249 that can silently invent genealogy rather than merely
fail to help, it is squarely the `packages/mutations` work on the roadmap, and it
gets its own issue rather than riding along here. Creation already revalidates the
document it produces, so what ships is correct as far as it goes and incomplete in a
way that is stated.

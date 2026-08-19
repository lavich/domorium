## Context

See proposal.md — Why. The constraints that shape the approach:

- A wrong quick fix in genealogy is worse than none. An arbitrary replacement is
  applied, validates clean, and is then unfindable. Every decision below resolves
  toward offering nothing.
- `formatValueSet` has two callers with opposite needs. Enumerations are closed and
  small, and listing them is the whole answer; pointers are open and file-sized, and
  listing them is noise. One template cannot serve both.
- `ReferenceIndex` stores an `ASTToken` per occurrence and not the node, on purpose:
  its own comment puts a document of 200k individuals at a million occurrences. The
  resolver a label needs cannot come from there.
- `recordLabel` has no `FAM` entry by deliberate choice, and says so: "A family is
  missing because it is known by its spouses, and those are pointers to other
  records." Naming a family means resolving pointers, which is why it stopped.
- `CodeAction` has no `isPreferred`. Order in the array is the only way to say which
  action matters, and it is what all four hosts render.
- Neither conformance corpus records a diagnostic's message, by decision: the
  wording is meant to get clearer, and pinning it would make every improvement read
  as a regression. A wording change must therefore leave both corpora untouched.

## Goals / Non-Goals

**Goals:**

- The message states the one fact about the line: this xref names no record of that
  type.
- A replacement is offered only where it is a typo correction, and never where it
  would be a guess between two families.
- An offered candidate can be read: a name, not just an identifier.
- The actions are ordered so that the one honouring what the author wrote is first.

**Non-Goals:**

- Browsing the file's records from a diagnostic. Completion inside `@…@` already
  does that, filtered as the reader types, and it is the right place for it.
- Creation writing the reciprocal pointer. See proposal.md — Deliberately not in
  this change.
- The wider re-voicing of `in parent X` and the rest of #190. This change fixes one
  message; that issue is a sweep.
- Removing `CodeAction.choices` from the published types.

## Decisions

### The pointer branch loses the set, and the lookup behind it

`rule-node.ts`, `case "pointer"`, keeps three situations and gives each one sentence:

| Situation                                          | Message                                                                                | Code              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------- |
| xref present, names no record of the required type | `No FAM record carries @F1450@`                                                        | `unresolved-xref` |
| payload present but not xref-shaped                | `Value for SOUR should be a pointer to a SOUR record, written as "@xref@"` — unchanged | `missing-ref`     |
| payload and children both absent                   | as above — unchanged                                                                   | `missing-ref`     |

The `candidates?.length` branch and the "names no `FAM` record, and this document
declares none" branch collapse into the first row, which means the
`getAvailableValues(tagType)` call leaves this path. The existing comment there
explains that the call is placed inside the failure branch because it is only needed
to name candidates; with no candidates to name it is needed nowhere, and the comment
goes with it. `error.data` keeps `{ xref, requiredRecordTag }` unchanged, so the code
action wiring is untouched.

`fieldType.to` is optional in the type, so the "no record carries" wording without a
type stays as its fallback — but both shipped schemas map all 17 pointer payloads to a
record tag, and every one of those tags resolves, so no document reaches it. It is not
given a test, because there is no defect for the test to catch.

_What is lost:_ the reader no longer learns that the document declares no `FAM` at
all. The actions say it better — no replacement offered means nothing is near, and
`Create FAM record @F1450@` arriving first is the fix either way. Restoring the
variant would mean scanning the record index for every failing pointer to produce a
clause the actions already imply.

`formatValueSet` and `MAX_LISTED_VALUES` stay, reachable only from
`validateEnumeration`. That is the point: the closed-set voice survives where it is
exact.

### One nearest xref, or none

A new `nearestXref(xref, candidates)` in
`packages/language-service/src/libs/codeActions/nearestXref.ts` returns the single
candidate at the minimum Levenshtein distance when that minimum is at most 2 and
exactly one candidate sits there, and `undefined` otherwise — on a tie, or when
everything is farther, or when the pool is empty.

Distance 2 rather than 1 because a transposition costs two (`@F154@` for `@F145@`) and
so does a doubled digit, and both are the same slip as the dropped digit that costs
one. Uniqueness rather than "the best of several" because the tie is exactly the case
where the tool cannot know, and `@F1450@` sitting one edit from both `@F145@` and
`@F1451@` is not rare in a file that numbers records sequentially.

Compared on the full text including the `@` delimiters. They are constant across
every candidate, so they cannot change the ordering, and comparing what the reader
sees keeps the rule statable in a test name.

Implemented with a cutoff at 3: a candidate is abandoned as soon as every cell in a
row exceeds it. The pool is 2 863 short strings and this runs on a quick-fix request
for one range, not over every diagnostic in the file.

_Alternative considered:_ offer the nearest three. Rejected — three arbitrary
families are the same defect as ten, at less volume. The count was never the problem.

_Alternative considered:_ a prefix or numeric-suffix heuristic instead of edit
distance. Rejected — it assumes `@F` plus digits, and vendor files carry
UUID-shaped and name-shaped xrefs. Edit distance makes no assumption about the shape.

### `recordLabel` gains a resolver; only the code actions pass one

```ts
recordLabel(node: ASTNode, resolve?: (xref: string) => ASTNode | undefined): string | undefined
```

Given a resolver, `FAM` reads its `HUSB` and `WIFE` children, resolves each to its
`INDI`, and joins the `NAME` payloads with `" / "`. One resolvable spouse gives that
name alone; neither gives `undefined`, and the action is the bare
`Replace with @F285@`. Every other record type is unaffected, resolver or not.

This keeps genealogy naming in the one shared place the invariant asks for. A
`candidateLabel` local to `codeActions` would be a second answer to "what is this
record called", and the two would drift.

`documentSymbols` keeps calling `recordLabel(node)` with no resolver, so the outline
and its tests do not move. Whether families should be named there too is a real
question and a separate change; it is a one-argument decision once this exists.

_Where the resolver comes from:_ `CodeActionContext` gains `nodes: ASTNode[]` —
the same `document.getNodes()` that `getHover` and `documentSymbols` already receive
— and `codeActions` builds a `Map<xref, ASTNode>` over the record declarations
lazily, only when it is about to name a candidate. Not from `ReferenceIndex`: that
holds tokens rather than nodes for the memory reason recorded in its own comment, and
widening it to retain nodes would pay that cost on every document to serve a quick
fix on one line.

### Order says what matters, because nothing else can

For `unresolved-xref`:

1. `Create FAM record @F1450@` — first where the xref resolves nowhere. Mechanics
   unchanged: inserted above `TRLR`, gated on `canCreateBareRecord`, and kept only
   if the document revalidates.
2. `Replace with @F145@ — Gascoigne / Wardle` — only where `nearestXref` answered.
3. `Point at nothing (@VOID@)` — only where the dialect is `7.0`.

`@VOID@` last because it is the one action that throws away the identifier the author
typed. It is offered at all because the specification provides it for exactly this
situation — a pointer the author means to be empty — and the validator already
accepts it (`rule-node.ts:697`). 5.5.1 has no such value, so offering it there would
produce a document that fails to validate on the next keystroke.

### No new ADR

Nothing here is expensive to reverse. A message is a string, an ordering is an array,
and the distance rule is one function with its own tests. The layering decision — the
resolver injected into `recordLabel` rather than nodes retained in `ReferenceIndex` —
is recorded above and does not change a boundary.

## Risks / Trade-offs

- **A reader who relied on the listing to browse the file loses it** → completion
  inside `@…@` offers the same records, filtered as they type, and does not need a
  diagnostic to be present. This is the trade the issue asks for.
- **Edit distance offers a plausible wrong family** → uniqueness within distance 2 is
  narrow, but not proof. It cannot be: nothing in the file distinguishes a typo from
  a deliberate reference to a record that was never exported. What it does guarantee
  is that the offer is _about_ the xref the author wrote, which the current ten are
  not, and that a near-tie produces silence.
- **Naming a candidate reads other records** → two resolutions and two `NAME` reads,
  on a request for one range. It does not touch the index build, which is what #210
  is about.
- **A wording change could move what fires** → the corpora record codes and counts
  and not messages, so `check:conformance` passing with both files untouched is the
  proof that it did not. A moved count would mean a code changed along with the
  message, and that is the defect to find.
- **Two packages ship in sequence** → `validator` before `language-service`, per
  ADR-0003. The release stays a separate, deliberate act.

## Migration Plan

1. `validator`: the three messages and their tests, then `npm run build:libs` so
   `language-service` compiles against the new `dist`.
2. `language-service`: `nearestXref`, the resolver on `recordLabel`, the rewritten
   actions, `nodes` on the context, and tests for each.
3. `npm run check:conformance`, which must pass with both corpus files unchanged.
4. Changelogs and README, then `npm run check`.

Rollback is local to each: the message is one branch in one `case`, and the actions
are one function.

## Open Questions

None blocking. Two follow-ups are named rather than left implicit: the reciprocal
pointer on creation (its own issue), and whether `documentSymbols` should pass the
resolver so families are named in the outline too.

## 1. Language service

- [x] 1.1 Add `MoveTarget`, `MoveSlot` and `MoveDescription` to `types.ts`, `not-a-sibling` and
      `reading-changed` to `EditRefusalCode`, and export the types from `index.ts`; verify with
      `npm run typecheck -w packages/language-service`
- [x] 1.2 Export `gate`, `removeLines` and `isContinuation` from `edit.ts`; verify that
      `edit.test.ts` and the other structure tests pass unchanged
- [x] 1.3 `libs/structure/move.ts` with `slotsOf`, `describeMove` and `moveStructure`, wired
      into `GedcomLanguageService`; verify with `move.test.ts` covering, for 5.5.1 and 7.0,
      the scenarios of "A structure moves among its siblings as one block" and "A move that
      keeps the order is an empty edit", and besides them: a move to the end where the last
      sibling's subtree ends a text with no final terminator, a file mixing `\n` and `\r\n`
      whose moved lines keep their bytes, a stray `CONT` of the parent after the last sibling,
      and a move of a substructure of `HEAD`
- [x] 1.4 Refusals; verify with tests for every scenario of "A move is refused with a code",
      `not-a-structure` (a position on no structure, a structure under a line with no
      level, and one under a line with a level and no tag) and `no-dialect` included, a stale or no-dialect request for a slot that keeps the
      order, and the `describeMove` refusals
- [x] 1.5 Revalidation of the reading; verify with the scenarios of "A move does not change how
      the document is read", the diagnostics compared by code and message over the whole
      document
- [x] 1.6 Description; verify with the scenarios of "The slots of a move are described before
      it", the last one a test that moves to every slot of every substructure outside `HEAD`
      of a fixture with diagnostics, every line at its right level, in both dialects, and
      expects no refusal

## 2. Documentation and gate

- [x] 2.1 Add `describeMove` and `moveStructure` to the "Describing and editing a structure"
      section of the `language-service` README with a usage example and `reading-changed`, add
      reordering to the service's abilities in `docs/architecture.md`, and read every name
      against the code; verify with `npm run check:docs`
- [x] 2.2 Run the pass in `docs/prompts/docs-sync.md`
- [x] 2.3 Run `npm run check` and record whether `check:jetbrains` ran or was skipped for
      lack of a JDK

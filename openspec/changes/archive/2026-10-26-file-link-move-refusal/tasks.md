## 1. The refusal

- [x] 1.1 Add `unwritable-file-target` to `EditRefusalCode` in `packages/language-service/src/types.ts`. Verify with `npm run typecheck`
- [x] 1.2 In `src/libs/links/retargetFileLinks.ts`, add the move answering `WorkspaceEditResult | EditRefusal`: it reuses the existing filter; answers an empty edit when nothing matches; answers each payload replaced by its own text when `to` normalizes to `from`; otherwise refuses unless the round trip in design.md holds, and refuses rather than throws when encoding fails. Verify with tests written first in `retargetFileLinks.test.ts`, one per spec scenario, both dialects
- [x] 1.3 Add `moveFileLinks(from, to)` to `GedcomLanguageService`, and mark `retargetFileLinks` `@deprecated` naming it. Verify with a test through a real `GedcomLanguageService` that a GEDCOM 7 move to `../photos/marie.jpg` is refused while the deprecated method still writes it

## 2. Documentation

- [x] 2.1 `packages/language-service/README.md`: a short section on moving a file, with the refusal and the `moveFileLinks(from, from)` recipe for counting what stayed behind. Verify with `npm run check:docs`
- [x] 2.2 `packages/language-service/CHANGELOG.md`: an `## Unreleased` entry naming the new method, the new refusal code and the deprecation. Verify by reading it against the spec

## 3. Gate

- [x] 3.1 Rebuild with `npm run build -w packages/language-service`, so a consumer importing from `dist` sees the method. Verify that `dist` declares `moveFileLinks`
- [x] 3.2 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK. Ran: 1315 tests, and `check:jetbrains` ran with a JDK

## 1. Script

- [x] 1.1 Add `src/site/versions.tsx` exporting the inline ES5 script: the four sources with their prefixes, waiting for `DOMContentLoaded` unless the document is already parsed, the version check, the 5-second timeout, `referrerPolicy: "no-referrer"`, the session cache that keeps versions and not failures. Verify with `versions.test.ts` written first against jsdom with a stubbed `fetch`, running the script before setting the body and then firing `DOMContentLoaded` as `widgetScript.test.ts` does: each source's answer fills its slots; an error, a timeout, `retired badge` and a markup value leave the slot hidden; a kept version makes no request; a failure is asked again; a throwing `sessionStorage` still shows versions; only sources with a slot are asked; the requested URLs are exactly the four in design.md

## 2. Slots

- [x] 2.1 Render the hidden slots inside the landing card's `released` badge, the landing page's "On npm" link, and the product chip on `IntegrationPage`. Verify with a render test that each page carries the slots it should, and that its text without scripts is unchanged
- [x] 2.2 Attach the script to the landing page and the three integration pages in `routes.tsx`, and rewrite `routes.test.tsx`'s "carries no page script where there is nothing to arm" so that pages with slots carry the versions script and `/editor/` and the 404 page carry none. Verify with that test

## 3. The GitHub link

- [x] 3.1 Draw GitHub's mark in `Marks.tsx` and use it in the header's project link and the footer's GitHub link; name it in the footer's trademark note. Verify with `routes.test.tsx`: on every page, the header's and footer's links to the repository carry the mark

## 4. Record and check

- [x] 4.1 Write ADR-0017 from `docs/adr/template.md` with the rule for page scripts that ask a third party, add its row to `docs/adr/README.md`, and add a line naming shields.io to what the pages run in `apps/web-editor/README.md`. Verify with `npm run check:docs`
- [ ] 4.2 Build the site (`npm run build -w apps/web-editor`), serve `dist`, and see the versions on `/` and `/vscode/` in a browser, then with shields.io blocked see the pages unchanged; record it in the PR
- [x] 4.3 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK Ran: 1360 tests, and `check:jetbrains` ran with a JDK

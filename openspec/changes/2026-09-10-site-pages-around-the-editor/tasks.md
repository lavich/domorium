## 1. The route table and the document

- [x] 1.1 Add `src/site/routes.tsx`: one entry per page — path, title, description,
      the JSON-LD it carries, and the component for its body — with the paths as
      exported constants so nothing spells one out twice. Add `src/site/document.tsx`
      with the two pure functions the build needs: `renderDocument(page, { stylesheet })`
      and `buildSitemap(pages)`. Ship with tests in `src/site/document.test.tsx` and
      `src/site/routes.test.tsx` covering: every title unique and within what a
      listing shows, every description unique and within its bounds, canonical
      absolute and slash-terminated, JSON-LD parsing as JSON, the sitemap listing
      exactly the declared paths, and every internal link a page renders being a
      declared path.

## 2. The pages

- [x] 2.1 Add the shared chrome under `src/site/` — a nav and a footer used by every
      page, reading `LINKS` for the outbound addresses and carrying the FamilySearch
      independence notice — and the landing page: the heading, the prose, **Open the
      editor**, the three integration cards, what the validator checks, and the
      footer's internal links. Ship with a test asserting the landing page renders
      the heading, the editor link, and a link to each integration page.
- [x] 2.2 Add `/vscode/`, `/obsidian/` and `/jetbrains/`, each leading with GEDCOM and
      the platform per ADR-0007. Take the feature lists and install instructions from
      `apps/vscode/README.md` and `apps/jetbrains/README.md` — every claim on the page
      has to be one those files already make. Ship with a test per page asserting the
      heading names the platform, the marketplace link is the one in `LINKS`, and the
      sibling pages and the editor are linked.

## 3. The build

- [x] 3.1 Move `index.html` to `editor/index.html` and confirm the editor still loads
      the example from the site root. Turn on `build.manifest`, add
      `src/site/entry-server.tsx`, add the dev middleware that renders a page path
      through `ssrLoadModule`, and add `scripts/prerender-site.mjs` writing each page,
      `sitemap.xml`, `robots.txt` and `404.html` into `dist`. Wire the three build
      steps into the app's `build` script with the SSR output outside `dist`. Verify
      the built tree: five HTML files at the expected paths, one stylesheet linked by
      all of them, no React in the static pages' payload, and `.ssr/` absent from
      `dist`.
- [x] 3.2 Read `dist/sitemap.xml`, `dist/robots.txt` and `dist/404.html` and confirm
      the absolute URLs are `https://domorium.com/…`, the sitemap names the five
      pages, and `robots.txt` points at it.

## 4. The editor's header

- [x] 4.1 Point the header's VS Code, Obsidian and JetBrains links at the internal
      pages and drop their `target="_blank"`; the marketplace links stay in
      `src/constants/links.ts`, read now by those pages. Update the header's tests to
      the new destinations — the assertion that a marketplace URL is rendered moves to
      the page tests of task 2.2.

## 4b. The theme on every page

- [x] 4b.1 Move the storage key and the pre-paint script into `src/theme.ts`, add
      `nextTheme` and the click handling to it, and have `ThemeProvider` import the
      key so one place holds it. Render a single cycling button in the pages'
      header, hidden by CSS until the script has set `data-theme-choice`, with one
      icon per choice. Ship with tests: `nextTheme` cycling and reading an unknown
      value as the first choice, and the script itself run against a real DOM —
      applying a stored choice, following the system, cycling and remembering on a
      click, labelling the button once the body is parsed, ignoring a click
      elsewhere, and staying silent where storage is refused.

## 4c. The chosen visual direction

- [x] 4c.1 Build the chosen direction into the pages: the editor drawn as a panel
      (`src/site/EditorPreview.tsx`) beside the claim, panels and cards for the rest,
      a pill for the version badge, and Space Grotesk as `--font-heading` across the
      domain with Roboto Slab removed from the dependencies and the base face moved to
      the sans. Express it in the app's tokens so both themes hold, and check the
      landing page, an integration page and the editor in a browser, light and dark.

## 4d. Equals, and a phone

- [x] 4d.1 Point the hero's second action at the section listing every place rather
      than at one integration, and ship the test that keeps it there. Lay the pages
      out for a narrow screen: a single scrolling navigation row of thumb-height
      targets, full-width actions, halved vertical rhythm, and the editor panel
      without its explorer column. Check 390 px, 768 px and desktop in a browser.

## 4e. The editor on the landing page

- [x] 4e.1 Add the widget: the drawn editor in a frame it fills, a link to
      `/editor/` that an inline script upgrades into an `<iframe>` of
      `/editor/?embed=1`, and a second link that takes the frame full screen
      through the Fullscreen API. Give a page its own `scripts`, declared in the
      route table. Ship with tests run against a real DOM in the page's order —
      script first, body after — covering the exchange, the single load, both
      full-screen paths and a page without a widget.
- [x] 4e.2 Teach the editor the embedded mode: `?embed=1` drops the wordmark, the
      product links and the theme control and keeps the File menu, with a test in
      `App.test.tsx`. Keep the status bar to one line on a narrow viewport, which
      is what the frame is. Write ADR-0015 superseding ADR-0014's claim that the
      pages ship no client-side JavaScript, and add its row to the index.

## 4f. The Stitch design

- [x] 4f.1 Rebuild the pages in the mockup the reader chose: paper and charcoal
      with a forest-green pill for every action, a hero whose collage is three
      drawn editor windows, a card per extension carrying its own window and a row
      of ability chips, the live widget under "A reference implementation", and a
      dark closing banner. Scope the palette to `.site` so the editor keeps its
      own, fix the drawn windows dark through `.editor-mock`, and drop the display
      face so `--font-heading` is the sans.
- [x] 4f.2 Keep the copy true where the mockup invented: no Neovim, Sublime Text
      or Visual Studio integrations, no "Beta" on a released plugin, no Obsidian
      notes with backlinks, no invented diagnostics or record counts. The fourth
      card offers what does exist instead — `@domorium/codemirror` and
      `@domorium/validator` on npm — and the drawn windows show the example file
      with the validator's own message.

## 4g. What differs between the places

- [x] 4g.1 Read the capabilities out of the code rather than the READMEs — the
      server's declared capabilities, the CodeMirror bundle's extensions, the VS
      Code manifest's grammars, the JetBrains plugin's registrations — and the
      Obsidian plugin's own repository, since it is not in this tree. Put them in
      `src/site/abilities.ts` as a shared list and a table of differences, with
      short chip forms, and leave unverified cells unclaimed.
- [x] 4g.2 Show it on the landing page: the shared list beside a table of only
      the differences, the table scrolling inside itself on a narrow screen, and
      the cards' chips derived from the same data. Ship with tests holding the
      table honest — nothing true everywhere in it, every column non-empty, every
      named place published — and asserting the pages render both halves.

## 4h. Photographs of each place

- [x] 4h.1 Fix the recipe before shooting anything, and write it beside the shots
      so a frame can be made again: the window at 1000x640 points, the
      application's own dark theme, a font size large enough that the code still
      reads when the page shows the frame at a little over half size, and
      `simpsons70.ged` — the example the site already serves — as the file on
      screen. Capture by window id rather than by screen rectangle, so no
      neighbouring window can wander into frame. Written to
      `apps/web-editor/scripts/shots/README.md`. **Obsidian is the exception: it
      is photographed in the plugin's own demo vault, whose notes, media and
      cropped photograph are the thing being shown.**
- [x] 4h.2 Shoot three frames per place, each one a row `abilities.ts` marks for
      it. VS Code: completion into a record and the warning it clears, the
      unresolved `@F0009@` with the validator's own message and its quick fix,
      GEDCOM highlighted inside a Markdown `gedcom` block. Obsidian: the record a
      cross-reference names, previewed from a note and then followed into the
      file; the photograph cropped to the rectangle the record asks for; the tree
      open in the plugin's editor inside the vault. WebStorm, since no IntelliJ
      IDEA is installed and the page is about JetBrains IDEs as a family: go to
      definition from a person to the family that names them, every line that
      names one record, and the whole file folded to its records.
- [x] 4h.3 Record the first frame of each series, encode `mp4` and `webm` from it
      and a `webp` poster of a moment that says what the clip is about, and keep
      every still as `webp` at twice the size the page draws it. Every asset is
      1280x820; a platform page carries about 660 KB of them.
- [x] 4h.4 Declare them in `src/site/shots.ts` next to `abilities.ts` — path,
      caption, alt text as prose, intrinsic size — and render them through
      `src/site/Photographs.tsx`, a `scroll-snap` carousel of `<figure>`s with
      anchor dots, a reachable scroller and the reduced-motion swap. It takes the
      place of the drawn window in the platform page's hero. The component is
      not `Shots.tsx`: a case-insensitive filesystem resolves `./shots` to it
      rather than to the data beside it, and the component comes back undefined.
- [x] 4h.5 Ship with tests: every published place has its three frames, every
      file a frame names exists in `public/` and nothing there goes unused, alt
      text is present and is not a copy of the caption, and the platform page
      renders every caption, every alt text and the reduced-motion pair.
- [ ] 4h.6 Follow up on what the shooting verified: **Find Usages does surface
      the language server's references in a JetBrains IDE** — five results for one
      cross-reference, one definition and four references. `abilities.ts` leaves
      that cell empty as unverified, and the page says an unmarked cell means
      exactly that. The row can now be claimed for JetBrains, and rename should
      be checked the same way before it is.

- [x] 4h.7 Take the drawings off the landing page too, and delete them: the
      hero's collage shows the three windows photographed, each card shows a
      crop of one frame — a whole window at 300 pixels is a picture of nothing —
      and the widget that runs the editor stands on a photograph of the editor
      rather than a drawing of it, taken through the same `/editor/?embed=1` the
      frame loads. `mocks.tsx` and `EditorPreview.tsx` are gone; `.editor-mock`
      stays, since it is what makes a photographed window dark whatever the
      reader chose.
- [x] 4h.8 Drive the carousel with a radio per frame rather than an anchor per
      frame. An anchor is a fragment navigation, so every click on a dot dragged
      the page down to put that frame at the top of the viewport; a radio never
      navigates, and it brings an active dot and arrow keys with it.
- [x] 4h.9 Reshoot the JetBrains series: the first three frames came out light.
      Forcing `ExperimentalDark` in `laf.xml` does not hold — Settings Sync puts
      the account's theme back at startup — and reading the frames by eye missed
      it. The recipe now says to sample a pixel and check.

## 5. The social card

- [x] 5.1 Add `public/og.svg` and the `public/og.png` rendered from it at 1200×630,
      and reference the PNG from every page's `og:image` and `twitter:image`. Note in
      the README that the PNG is made from the SVG by hand and that no build step
      depends on either.

## 6. Documentation

- [x] 6.1 Write the ADR for the URL change from `docs/adr/template.md` — the editor is
      served from `/editor/` and the domain root is a page — and add its row to
      `docs/adr/README.md`.
- [x] 6.2 Update `apps/web-editor/README.md`: what the app now emits, the route table
      as the place a page is declared, and the three build steps. Update
      `docs/architecture.md` where it describes the web editor. Point the web-editor
      links in `README.md`, `apps/vscode/README.md` and `apps/jetbrains/README.md` at
      `https://domorium.com/editor/`, and read each one afterwards to confirm it still
      reads true.

## 7. After the deploy

- [ ] 7.1 Verify the domain in Google Search Console — a DNS `TXT` record at the
      registrar covers the whole domain; the HTML-file method needs a token committed
      to `public/`. Then submit `https://domorium.com/sitemap.xml`, request indexing
      for the five URLs, and read the rendered HTML each returns in URL Inspection to
      confirm the crawler sees the prose and not the gutter. Record what was submitted
      in the pull request; nothing here changes code.

## 8. Gate

- [x] 8.1 `npm run check`. Record whether `check:jetbrains` ran or was skipped for lack
      of a JDK — skipped is not passed. **Ran in full: lint clean (two warnings, both
      pre-existing in `packages/validator/scripts`), 1173 tests pass, docs checks pass,
      and `check:jetbrains` ran against a JDK and succeeded.**

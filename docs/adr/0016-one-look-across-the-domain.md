# 0016. Wear one palette and one header across the domain

- **Status:** Accepted
- **Date:** 2026-09-11
- Supersedes: [0014](0014-a-site-around-the-editor.md) for the claim that
  `/editor/` is the application shell unchanged

## Context

ADR-0014 published a site around the editor and left the editor as it was. The
pages took a palette of their own — warm paper, charcoal, forest green — scoped
to the element `PageShell` renders, and the editor kept the neutral ground and
indigo primary it had been built on. Two headers followed from that: the pages'
row of wordmark, navigation and theme, and the editor's row of a File menu, a
centred strapline and a line of ghost buttons.

A reader crosses between them in one click, and the crossing showed. The ground
changed colour, the header changed shape, and the navigation just used was not
there to use again. The shell also had no width to stop at: on a wide monitor
the rail stood against one edge and the problems panel against the other, and
the only band that grew was the document's own column, with the text at one end
of it.

The editor's page was the one page whose head is written by hand rather than
rendered from the route table. It carried the title, the description and the
canonical URL that table declares, and neither the theme script every other
page carries nor the structured data the same table declares for it.

## Decision

The pages and the editor wear one palette and one header.

- The paper palette is the domain's, defined once on `:root` and `.dark`. No
  second set is scoped to the pages. What keeps tokens of its own is what stands
  for someone else's window: the drawn mockups' `--mock-*`.
- `src/site/Chrome.tsx` holds the header, and `/editor/` renders the component
  the pages render — the same wordmark, navigation, project link and theme
  button, marked at its own address the way every page is. It spans the window
  there as it does everywhere, and only the workspace under it is held to a
  column. The editor's strapline becomes the page's heading, which a reader who
  cannot see a shell still needs.
- The header carries no call to the editor. It named a page that is now one of
  its own addresses, and the navigation leads there from every page, that one
  included.
- The File menu leaves the header for the left of the tab row, which is there
  whatever side panel is open and however narrow the window is.
- The workspace stops where a page's prose stops — `max-w-6xl`, the utility the
  pages set their own columns with — centred on the page's ground.
- `?embed=1` takes the header off altogether: the page around the frame carries
  it, and the File menu the frame keeps is in the tab row. `App.test.tsx` holds
  that.
- `injectShellHead` puts the theme script and the declared structured data into
  `editor/index.html`, in development and in the build, from the same modules
  the rendered pages read. The script owns the choice on every page now, and
  `ThemeProvider` follows the class it sets rather than setting one of its own.

## Consequences

The domain reads as one product, and the frame on the landing page gains it
too — the embedded editor no longer sits on the page as a white rectangle.

The editor is drawn in a palette it was not designed in. Its primary is forest
green rather than indigo, and the syntax colours `@domorium/codemirror` ships
now sit on paper rather than on near-white; they carry, and a change to them is
from here on a change to how the whole domain looks rather than to the editor
alone.

The theme is a cycling button in the editor rather than a menu, so reaching a
named choice can take two clicks instead of one, and the editor is drawn in the
light theme if the head script is ever missing rather than reading the choice
itself. On a phone the header stacks into two rows as the pages' does, which a
shell one screen tall can ill afford — but the File menu does not stack with it,
so opening and saving stay one tap away.

The landing page keeps its own call to the editor; a reader on a platform page
now reaches it through the navigation rather than through a button in the corner.

Held to the pages' column, the document's own band is around 550px with the
explorer and the problems panel both open — enough for a line of GEDCOM and less
than an editor in its own window would take. Closing a panel gives it back.

`editor/index.html` is no longer the whole of what `/editor/` serves, so reading
that file understates the page. The photographs of this project's own editor
were taken again; the plugins' were not, because nothing about them changed.

## Alternatives considered

**Unify the header and keep both palettes.** Rejected: colour is the first thing
the crossing shows, and one header drawn in two palettes states the seam rather
than closing it.

**Stack the site's header above the editor's own.** Rejected: two bars, and 56px
taken from a viewport the application already fills with panels.

**Put the File menu in the Explorer panel's header.** Rejected: that panel shares
its slot with Search and Problems and is not rendered below 768px, so the menu
would be gone exactly when a reader reached for Save.

**Leave the shell full width, as an IDE is.** Rejected for what it does at
2560px, where the document's column is the only band that grows. Filling the
window is what an application does; stopping where the prose stops is what a
page of this site does, and this is a page of this site.

**Stop the shell at a width of its own, wider than the pages'.** Rejected: a
number no page shares is a number that drifts, and a workspace wider than the
column the header's own content sits in reads as two columns rather than one.

**Copy the theme script and the structured data into the shell by hand, held to
the modules by a test.** Rejected: the test would fail on every edit to either,
and the only way to make it pass would be to copy again — which is what the test
is there to prevent.

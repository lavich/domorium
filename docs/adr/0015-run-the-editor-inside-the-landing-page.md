# 0015. Run the editor inside the landing page, when the reader asks

- **Status:** Accepted
- **Date:** 2026-09-10
- Supersedes: [0014](0014-a-site-around-the-editor.md) for the claim that the
  pages ship no client-side JavaScript

## Context

ADR-0014 published a static site around the editor and said its pages "ship no
client-side JavaScript". That was true of the framework — the pages are rendered
to HTML at build time and nothing hydrates — and it stopped being true of the
page as a whole: the theme is resolved before the first paint by an inline
script, because a reader who chose dark should not meet a white flash.

The landing page led with a drawing of the editor. A drawing is honest about
what the product looks like and dishonest about what it is: the product's whole
claim is that it opens your file and finds the line that breaks it, and the
editor is one URL away on the same domain.

Loading the application on the landing page is not free. The bundle is over a
megabyte of JavaScript, most visitors came to read rather than to edit, and
Google weighs how fast a page becomes usable.

## Decision

The landing page runs the real editor, in place, when the reader asks for it.

- The drawn editor stays as the page's first paint and as what a crawler reads.
- Its control is a link to `/editor/`. An inline script in the page's head
  intercepts the click and replaces the drawing with an `<iframe>` of
  `/editor/?embed=1`; with no script the link takes the reader to the editor.
- A second control takes the frame full screen through the Fullscreen API, and
  is a link to `/editor/` where that is refused.
- `?embed=1` is a supported entry point: the editor keeps its File menu and
  leaves the wordmark, the product links and the theme control to the page
  around the frame.
- The pages therefore carry inline scripts of their own — the theme on every
  page, the widget on the landing page — and no framework runtime.

## Consequences

The landing page's claim can be tested by the reader without leaving it, and
without costing every other visitor the bundle. The frame is same-origin, so
the editor inside it reads the same theme, opens the same example, and gets the
browser's file pickers.

`?embed=1` is now part of the editor's contract with the site: a change to the
header's chrome has to keep it, and the test in `App.test.tsx` says so. The
editor is also rendered at a size it was not designed for, which is why the
full-screen control exists and why its status bar drops the "read locally" note
when the viewport is narrow.

ADR-0014's "ship no client-side JavaScript" no longer describes the pages. What
holds is the weaker and more useful rule this record puts in its place: the
pages ship no framework runtime, and any script they carry is small, inline,
and an enhancement of markup that works without it.

## Alternatives considered

**Load the editor with the page.** Rejected: it makes every visitor pay for the
application, including on a phone, to serve the few who came to edit. One click
is a smaller cost than a slow first paint.

**Mount the editor into the page as a component rather than a frame.**
Rejected: the landing page would need the framework, a client entry and a
hydration boundary, and the editor would then exist twice on the domain in two
configurations.

**Keep the drawing and the link only.** Rejected as the status quo the change
set out to fix: the page shows the product without letting anyone try it.

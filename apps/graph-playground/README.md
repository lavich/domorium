# Graph playground

A sandbox for the genealogy graph view. Not published, not deployed, and not part of
any release — it exists to try layout and projection ideas on a graph large enough to
misbehave before either idea earns a place in a shared package.

```sh
npm run dev -w apps/graph-playground
```

## What it shows

A GEDCOM file, drawn as a tree. **Open a GEDCOM file** reads one from disk; nothing
leaves the page. It opens on `public/simpsons70.ged` so there is something to look at
before you have picked a file.

One branch is on screen at a time: the focused person's ancestors, their descendants,
and their siblings, as absolutely positioned `div`s.

Beside each of them sits the person they married — joined not to each other but to a
small circle between them, the union itself, which is what the children then descend
from. That is the shape a `FAM` record already has, and it keeps a couple's children on
one line out of one point instead of two fans crossing each other.

Behind a partner there is nothing. A partner is drawn so there is somewhere to go next:
choose one and the family they came from unfolds, while the family you came from folds
away to spouses again. Unfolding every partner's pedigree at once would put most of the
file back on screen.

## Reading the file

`@domorium/validator` parses; `gedcom.ts` maps its AST onto the three things this view
needs — who exists, who married whom, whose child is whose:

| GEDCOM              | here                        |
| ------------------- | --------------------------- |
| `0 @X@ INDI`        | a person, keyed by the xref |
| `1 NAME Ada /King/` | the name; `King` the family |
| `FAM` `HUSB`/`WIFE` | partners of each other      |
| `FAM` `CHIL`        | a child of both of them     |

GEDCOM keeps the two halves apart — an `INDI` says who somebody is, a `FAM` says who
married whom — so parents and partners are read off the families, never off the people.
A record with no `NAME` still becomes a person under its xref, and a file with no `INDI`
records draws nothing rather than failing.

That mapping is genealogy logic living in an app, which the repository's invariants
allow only while there is exactly one consumer. A second one — the VS Code extension,
the web editor — means moving it down into the shared package the roadmap calls
`packages/graph`, not copying it.

## Colour

Each card is tinted by the family its owner belongs to, which is the surname the
slashes in a `NAME` mark out. Colour never carries identity alone: the name is written
on every card in ink, which is also the relief the palette's light-mode contrast
warning asks for.

The eight hues are the validated categorical palette in fixed slot order, not cycled
and not generated; a ninth family takes the neutral slot rather than a made-up hue.
Both modes were run through the palette validator against this page's own surfaces and
pass every gate — light `#fafaf9`, dark `#1c1917`.

## Pointing and choosing

Rebuilding the frame is disorienting, so it happens only when asked for. The two halves
of the interaction are deliberately unequal:

| Gesture         | Does                          | Moves anything? |
| --------------- | ----------------------------- | --------------- |
| Point, or arrow | dims what choosing would drop | no              |
| Click, or Enter | a new focus, a new layout     | yes             |

A cursor crossing the page passes over a dozen cards on its way somewhere, and none of
those are requests. So pointing only answers "what survives if I choose here" — the
pointed-at person's relatives stay lit, everyone a choice would drop fades to 15%.
Cards do not move.

The keyboard gets the same bargain rather than a lesser one. Up and down walk to a
parent or a child, left and right along the row — which is where siblings, partners and
cousins all sit. Enter is the keyboard's click. Choosing leaves the keyboard on the card
that was chosen, so a walk carries on from where it re-centred instead of starting over.

## How a frame is built

```text
bloodline(focus) → relatives → subgraph → computeLayout → render
  ancestors,        plus their  a smaller  where they go   cards and
  descendants,      partners      graph                      edges
  siblings
```

Only a choice runs it. Pointing runs `relatives` alone and hands the result to
`GraphView.highlight`, which writes one attribute per card and touches no coordinate.

The layout sees only the branch, so the people left out reserve none of the space they
would have taken: a lone line of ancestors collapses to a single column instead of
sitting in the gap its cousins left behind.

Descendants are laid out downward from the focus, ancestors upward. That is not a
symmetry for its own sake: drawn downward a pedigree _converges_, every line of
ancestors running into the same person, and an algorithm that hands its space to leaves
gives the generations above none of their own, so their edges cross. Walked upward the
same pedigree diverges — one person, two parents, four grandparents — and the tidy
layout handles it. The ancestors are then slid across as a block until the focus lands
where the downward pass had already put it.

Siblings are moved back alongside the focus afterwards. They hang from the union the
pedigree parked directly overhead, and the downward pass had left them past the far end
of the focus's own descendants, so those lines had to reach across everything between.

A couple is laid out as one unit, straddling the point their children hang from.
Marriage weaves the families together, though, so a spouse from another line can be
dealt a column inside their in-laws' range; rather than a cleverer layout, each row is
swept left to right and anyone too close to their neighbour is pushed along. That is
what the long diagonal edges are — the price of not letting two cards stack.

Family circles are not laid out at all. `render` puts one midway between each visible
couple, which is the point their children were already centred under. A child whose
other parent is off the frame has no union to hang from and keeps a plain line to the
parent that is on it.

Rows never move. `y` is the generation, and a person belongs below their parents and
level with the person they married. Neither rule alone is enough: counting down from
parentless people would put a spouse who married into the fourth generation in the
first, because the parents they arrived with have no parents of their own on file. So
`generations` settles both rules together, then lifts parentless people to sit just
above their own children.

Columns do move, and the frame is slid sideways so that the person just chosen lands
back on the column they already held. They are the one fixed point; everyone else goes
wherever the fresh layout puts them, over a 300ms transition.

The one exception is the left edge: a branch reaching further left than the anchor
allows would be dealt negative coordinates and clipped away, so there the edge wins and
the anchor moves with everyone else. On the right there is no such conflict — the canvas
grows to fit and never shrinks back.

## The address bar holds the state

Who the frame is built around is the whole of the state worth keeping, so it lives in
the URL as `?person=<xref>` — pushed on every choice, read back on load, and re-read on
`popstate`. An id the file does not have falls back to the first root, which is also
what happens when a different file is opened.

That makes back and forward walk the people already visited, which is the way out of a
branch that narrowed too far. Arrow keys deliberately leave no trace: they move the
selection, not the frame, and a history entry per keystroke would bury the choices.

## Not done here

Travel is limited to what is drawn: to reach someone the frame dropped, there has to be
a path to them through the cards on screen. Spouses make that path exist most of the
time — they are the doors into the families that married in — but there is no reset, no
search, and no way back to a family no visible marriage leads to.

A pedigree with a shared ancestor — cousins married somewhere back — is a DAG rather
than a tree, and no drawing of it avoids crossings. The layout makes no attempt at that
case.

Every child is assumed to have at most two parents and every person at most one
partner, which is what lets the layout treat a couple as one unit. Remarriage, divorce,
adoption and the rest of what a `FAM` record can say are ignored, as are dates, places,
sources and media. Nothing here validates the file — diagnostics are the language
service's job, and this view does not ask for them.

`fixture.ts` generates a family for the tests, as GEDCOM text rather than as a graph,
so the tests come in through `readGedcom` — the only door the app itself has. A real
file small enough to keep in a test is too small to catch a layout that falls apart at
scale: the one bundled with the app holds eleven people, and the collisions this has
caught needed seventy.

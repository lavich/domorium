# Graph playground

A sandbox for the genealogy graph view. Not published, not deployed, and not part of
any release — it exists to try layout and projection ideas on a graph large enough to
misbehave before either idea earns a place in a shared package.

```sh
npm run dev -w apps/graph-playground
```

## What it shows

Seventy-odd mock people over five generations, laid out as absolutely positioned
`div`s. One branch is on screen at a time: the pointed-at person's ancestors, their
descendants, and their siblings.

Beside each of them sits the person they married — joined not to each other but to a
small circle between them, the union itself, which is what the children then descend
from. It is the shape a GEDCOM `FAM` record already has, and it keeps a couple's
children on one line out of one point instead of two fans crossing each other.

Behind a partner there is nothing. A partner is drawn so there is somewhere to go next: point at one
and they become the focus, and only then does the family they came from unfold, while
the family you came from folds away to spouses again. The mock has eight founding
lineages married into each other, so there is always another pedigree waiting behind a
partner; unfolding them all at once would put half the graph back on screen.

Each card is tinted by the family line its owner belongs to — inherited from one
parent, the way a surname is, and named on the card itself. Colour never carries
identity alone here: the name is written on every card in ink, which is also the
relief the palette's light-mode contrast warning asks for.

The eight hues are the validated categorical palette in fixed slot order, not cycled
and not generated; a ninth line would take the neutral slot rather than a made-up hue.
Both modes were run through the palette validator against this page's own surfaces and
pass every gate — light `#fafaf9`, dark `#1c1917`.

The mock alternates which parent's name the children take. Always the first and the
lines that married in would die out immediately: an earlier version put one name on 48
of the 72 people and left four lines with a single member, which is nothing to colour.
Eight names now cover 4 to 15 people each.

## Pointing and choosing

Rebuilding the frame is disorienting, so it happens only when asked for. The two
halves of the interaction are deliberately unequal:

| Gesture | Costs                        | Moves anything? |
| ------- | ---------------------------- | --------------- |
| Point   | dims what a click would drop | no              |
| Click   | a new focus, a new layout    | yes             |

A cursor crossing the page passes over a dozen cards on its way somewhere, and none of
those are requests. So pointing only answers "what survives if I click here" — the
hovered person's relatives stay lit, everyone the click would drop fades to 15%. Cards
do not move. Clicking is what re-centres, and it is the only thing that does.

The keyboard gets the same bargain rather than a lesser one. Up and down walk to a
parent or a child, left and right along the row — which is where siblings, partners
and cousins all sit — and each step only moves the selection and its preview. Enter is
the keyboard's click. Choosing leaves the keyboard on the card that was chosen, so a
walk carries on from where it re-centred instead of starting over.

## How a frame is built

```text
bloodline(focus) → relatives → subgraph → computeLayout → render
  ancestors,        plus their  a smaller  where they go   cards and
  descendants,      partners      graph                      edges
  siblings
```

Only a click runs it. Pointing runs `relatives` alone and hands the result to
`GraphView.highlight`, which writes one attribute per card and touches no coordinate.

Family circles are not laid out. `render` puts one midway between each visible couple,
which is the point their children were already centred under, so the layout never has
to know they exist. A child whose other parent is off the frame has no union to hang
from and keeps a plain line to the parent that is on it.

Every step runs again on each hover, and the layout sees only the branch, so the
people left out reserve none of the space they would have taken: a lone line of
ancestors collapses to a single column instead of sitting in the gap its cousins left
behind.

Descendants are laid out downward from the focus, ancestors upward. That is not a
symmetry for its own sake: drawn downward a pedigree _converges_, every line of
ancestors running into the same person, and an algorithm that hands its space to
leaves gives the generations above none of their own, so their edges cross. Walked
upward the same pedigree diverges — one person, two parents, four grandparents — and
the tidy layout handles it. The ancestors are then slid across as a block until the
focus lands where the downward pass had already put it.

Siblings are moved back alongside the focus afterwards. They hang from the union the
pedigree parked directly overhead, and the downward pass had left them past the far
end of the focus's own descendants, so those lines had to reach across everything in
between.

A couple is laid out as one unit, straddling the point their children hang from, and
their children centre under that point. Marriage weaves the lineages together, though,
so a spouse borrowed from another family can be dealt a column inside their in-laws'
range; rather than a cleverer layout, each row is swept left to right and anyone too
close to their neighbour is pushed along. That is what the long diagonal edges are —
the price of not letting two cards stack.

Rows never move. `y` is the generation, counted over the whole graph rather than
inside the branch — a partner is shown without the parents they came from, and depth
counted locally would hoist them to the top row as a rootless person.
Columns do move, and the frame is slid sideways so that the person under the cursor
lands back on the column they already held. They are the one fixed point; everyone
else goes wherever the fresh layout puts them, over a 300ms transition. Holding the
pointed-at card still is also what stops it sliding out from under the pointer and
triggering the next hover on its own.

The one exception is the left edge: a branch that reaches further left than the anchor
allows would be dealt negative coordinates and clipped away, so there the edge wins and
the anchor moves with everyone else. On the right there is no such conflict — the
canvas grows to fit and never shrinks back.

The mock data comes from a repeating pattern rather than a random one, so the same
tree comes back on every reload.

Every spouse in it marries in from a family the tree has never met, bringing the two
parents they came from. Growing a mock the obvious way — pairing people out of the same
generation — marries cousins by the third generation, and a pedigree with a shared
ancestor is no longer a tree: two lines run into one person and no drawing of it avoids
crossings. Surnames are reused for unrelated incomers, so two families can share a name
without sharing blood.

That also decides how a row is numbered. A person belongs below their parents and level
with the person they married, and neither rule alone is enough: counting down from
parentless people would put a spouse who married into the fourth generation in the
first, because the parents they arrived with are roots too. `generations` settles both
rules together, then lifts parentless people to sit just above their own children.

A pedigree with a shared ancestor — cousins married somewhere back — is a DAG rather
than a tree, and no drawing of it avoids crossings. The mock no longer contains one, so
the layout is untested against that case and makes no attempt at it.

Real GEDCOM input, more than one marriage per person, divorce and other relationship
kinds, panning and zooming. Every child here has exactly two parents and every person
at most one partner, which is what lets the layout treat a couple as one unit.

## The address bar holds the state

Who the frame is built around is the whole of the state worth keeping, so it lives in
the URL as `?person=<id>` — pushed on every choice, read back on load, and re-read on
`popstate`. An id nobody has falls back to the first root.

That makes back and forward walk the people already visited, which is the way out of a
branch that narrowed too far, and it makes a frame something you can send someone.
Arrow keys deliberately leave no trace: they move the selection, not the frame, and a
history entry per keystroke would bury the choices among them.

## Not done here

Travel is still limited to what is drawn: to reach someone the frame dropped, there
has to be a path to them through the cards on screen. Spouses make that path exist
most of the time — they are the doors into the families that married in — but there is
no reset, no search, and no way back to a lineage no visible marriage leads to.

import "./style.css";
import { familyGraph } from "./fixture";
import { rootsOf, subgraph, type PersonId } from "./graph";
import { computeLayout, generations } from "./layout";
import { relatives } from "./projection";
import { renderGraph } from "./render";

const root = document.querySelector<HTMLElement>("#graph");
const caption = document.querySelector<HTMLElement>("#caption");
if (!root || !caption) {
  throw new Error("the page is missing #graph or #caption");
}

const PARAM = "person";
const generation = generations(familyGraph);

// The whole of the state worth keeping is who the frame is built around, so the
// address bar can hold all of it. Which also buys back and forward for free, and they
// are the way out of a branch that has narrowed too far.
const addressed = (): PersonId | null => {
  const id = new URLSearchParams(location.search).get(PARAM);
  return id !== null && familyGraph.people.has(id) ? id : null;
};

// Drawing is the expensive half: the layout runs over the branch alone, so the people
// left out do not reserve the space they would have taken up, and everyone still on
// screen is dealt a fresh column.
const draw = (id: PersonId): void => {
  const branch = subgraph(familyGraph, relatives(familyGraph, id));
  view.update(computeLayout(branch, generation, id), id);
  caption.textContent = `${familyGraph.people.get(id)?.name} — ${branch.people.size} relatives of ${familyGraph.people.size}, click or arrow-key around, Enter re-centres`;
};

let current = addressed() ?? rootsOf(familyGraph)[0];

const choose = (id: PersonId): void => {
  // Re-choosing whoever the frame is already built around would draw the same picture
  // and leave a history entry that goes nowhere.
  if (id === current) {
    return;
  }
  current = id;
  history.pushState(null, "", `?${PARAM}=${id}`);
  draw(id);
};

// Pointing is the cheap half, and it is deliberately unable to move anything. What it
// lights up is the answer to "what survives if I click here": the relatives measured
// against the whole graph, of which the reader sees the part already on screen.
const point = (id: PersonId | null): void => {
  view.highlight(id === null ? null : relatives(familyGraph, id));
};

const view = renderGraph(root, familyGraph, computeLayout(familyGraph), {
  point,
  choose,
});

addEventListener("popstate", () => {
  current = addressed() ?? rootsOf(familyGraph)[0];
  draw(current);
});

history.replaceState(null, "", `?${PARAM}=${current}`);
draw(current);

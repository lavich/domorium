import "./style.css";
import { readGedcom } from "./gedcom";
import { rootsOf, subgraph, type Graph, type PersonId } from "./graph";
import { computeLayout, generations } from "./layout";
import { relatives } from "./projection";
import { renderGraph, type GraphView } from "./render";

const need = <T extends Element>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`the page is missing ${selector}`);
  }
  return found;
};

const root = need<HTMLElement>("#graph");
const caption = need<HTMLElement>("#caption");
const file = need<HTMLInputElement>("#file");

const PARAM = "person";
const SAMPLE = "/simpsons70.ged";

interface Document {
  readonly graph: Graph;
  readonly generation: ReadonlyMap<PersonId, number>;
  readonly view: GraphView;
}

let open: Document | null = null;

// The whole of the state worth keeping is who the frame is built around, so the
// address bar can hold all of it. Which also buys back and forward for free, and they
// are the way out of a branch that has narrowed too far. Ids come from the file, so a
// link only means anything alongside the file it was taken from.
const addressed = (graph: Graph): PersonId | null => {
  const id = new URLSearchParams(location.search).get(PARAM);
  return id !== null && graph.people.has(id) ? id : null;
};

// Drawing is the expensive half: the layout runs over the branch alone, so the people
// left out do not reserve the space they would have taken up, and everyone still on
// screen is dealt a fresh column.
const draw = (id: PersonId): void => {
  if (!open) {
    return;
  }
  const branch = subgraph(open.graph, relatives(open.graph, id));
  open.view.update(computeLayout(branch, open.generation, id), id);
  caption.textContent = `${open.graph.people.get(id)?.name} — ${branch.people.size} relatives of ${open.graph.people.size}, click or arrow-key around, Enter re-centres`;
};

let current: PersonId | null = null;

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
  if (open) {
    open.view.highlight(id === null ? null : relatives(open.graph, id));
  }
};

function show(graph: Graph, from: PersonId | null): void {
  const start = from ?? rootsOf(graph)[0];
  if (start === undefined) {
    root.replaceChildren();
    caption.textContent = "That file has no INDI records to draw.";
    open = null;
    return;
  }
  open = {
    graph,
    generation: generations(graph),
    view: renderGraph(root, graph, computeLayout(graph), { point, choose }),
  };
  current = start;
  history.replaceState(null, "", `?${PARAM}=${start}`);
  draw(start);
}

file.addEventListener("change", async () => {
  const chosen = file.files?.[0];
  if (chosen) {
    // A different file means different ids, so whoever the address bar names belongs
    // to the file that has just been closed.
    show(readGedcom(await chosen.text()), null);
  }
});

addEventListener("popstate", () => {
  if (open) {
    current = addressed(open.graph) ?? rootsOf(open.graph)[0];
    draw(current);
  }
});

const sample = readGedcom(await (await fetch(SAMPLE)).text());
show(sample, addressed(sample));

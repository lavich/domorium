import {
  childrenOf,
  parentsOf,
  partnersOf,
  siblingsOf,
  type Graph,
  type PersonId,
} from "./graph";

// Everyone the focused person shares blood with: the line they descend from, the line
// descending from them, and the siblings beside them. Nobody else is drawn at all, so
// this set is also the set the layout runs over.
export function bloodline(graph: Graph, focus: PersonId): Set<PersonId> {
  return new Set<PersonId>([
    focus,
    ...closure(focus, (id) => parentsOf(graph, id)),
    ...closure(focus, (id) => childrenOf(graph, id)),
    ...siblingsOf(graph, focus),
  ]);
}

// The bloodline plus the person married to each of them, and nothing behind those
// partners. A partner is drawn so there is something to point at — pointing at one
// makes them the focus, and only then does the family they came from unfold. Bringing
// their pedigree along now would put a second tree on screen the reader did not ask
// for.
export function relatives(graph: Graph, focus: PersonId): Set<PersonId> {
  const blood = bloodline(graph, focus);
  return new Set<PersonId>([
    ...blood,
    ...[...blood].flatMap((id) => [...partnersOf(graph, id)]),
  ]);
}

function closure(
  start: PersonId,
  step: (id: PersonId) => readonly PersonId[],
): Set<PersonId> {
  const found = new Set<PersonId>();
  const queue = [...step(start)];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (found.has(id)) {
      continue;
    }
    found.add(id);
    queue.push(...step(id));
  }
  return found;
}

export type PersonId = string;

export interface Person {
  readonly id: PersonId;
  readonly name: string;
  // The family line the person belongs to, inherited from one parent.
  readonly lineage: string;
  readonly parents: readonly PersonId[];
  readonly partners: readonly PersonId[];
}

export interface Graph {
  readonly people: ReadonlyMap<PersonId, Person>;
  readonly children: ReadonlyMap<PersonId, readonly PersonId[]>;
}

export function buildGraph(people: readonly Person[]): Graph {
  const byId = new Map(people.map((person) => [person.id, person]));
  const children = new Map<PersonId, PersonId[]>(
    people.map((person) => [person.id, []]),
  );
  for (const person of people) {
    for (const parent of person.parents) {
      children.get(parent)?.push(person.id);
    }
  }
  return { people: byId, children };
}

export const childrenOf = (graph: Graph, id: PersonId): readonly PersonId[] =>
  graph.children.get(id) ?? [];

export const parentsOf = (graph: Graph, id: PersonId): readonly PersonId[] =>
  graph.people.get(id)?.parents ?? [];

export const partnersOf = (graph: Graph, id: PersonId): readonly PersonId[] =>
  graph.people.get(id)?.partners ?? [];

export const rootsOf = (graph: Graph): PersonId[] =>
  [...graph.people.values()]
    .filter((person) => person.parents.length === 0)
    .map((person) => person.id);

// Everyone left out takes their links with them, so a kept person whose parent was
// dropped becomes a root of the smaller graph rather than a child of nobody.
export function subgraph(graph: Graph, keep: ReadonlySet<PersonId>): Graph {
  return buildGraph(
    [...graph.people.values()]
      .filter((person) => keep.has(person.id))
      .map((person) => ({
        ...person,
        parents: person.parents.filter((parent) => keep.has(parent)),
        partners: person.partners.filter((partner) => keep.has(partner)),
      })),
  );
}

// The children a couple had together, which is what a family card stands for. A child
// of only one of them belongs to some other union and hangs from that one instead.
export const childrenOfCouple = (
  graph: Graph,
  one: PersonId,
  other: PersonId,
): readonly PersonId[] =>
  childrenOf(graph, one).filter((child) =>
    parentsOf(graph, child).includes(other),
  );

// Half-siblings count: one shared parent is one shared bloodline.
export function siblingsOf(graph: Graph, id: PersonId): Set<PersonId> {
  const siblings = new Set<PersonId>();
  for (const parent of parentsOf(graph, id)) {
    for (const child of childrenOf(graph, parent)) {
      if (child !== id) {
        siblings.add(child);
      }
    }
  }
  return siblings;
}

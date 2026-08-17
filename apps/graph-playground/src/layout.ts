import {
  childrenOf,
  parentsOf,
  partnersOf,
  rootsOf,
  siblingsOf,
  type Graph,
  type PersonId,
} from "./graph";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const COLUMN = 132;
export const ROW = 116;

// Leaves take the next free column and a parent centres over its children. A couple is
// placed as one: the pair straddles the point their children hang from, half a column
// either side, because two people centred on the same children would otherwise be
// dealt the same coordinate and sit on top of each other.
export function computeLayout(
  graph: Graph,
  // Which row each person belongs on. Worked out from the whole graph rather than
  // from `graph`, because a branch shows partners without the parents they came from,
  // and depth counted inside the branch would hoist such a partner to the top row.
  generation: ReadonlyMap<PersonId, number> = generations(graph),
  // Whose pedigree to unfold upward. Without one, everybody is laid out downward and
  // the generations above the focus tangle.
  focus?: PersonId,
): Map<PersonId, Point> {
  const positions = new Map<PersonId, Point>();
  let nextColumn = 0;

  const place = (id: PersonId): number => {
    // A child of two parents is reached twice. Without this the second visit would
    // hand out a second column and, deeper down, double the work at every generation.
    const known = positions.get(id);
    if (known) {
      return known.x;
    }

    const spouse = partnersOf(graph, id).find(
      (partner) => graph.people.has(partner) && !positions.has(partner),
    );
    const children = childrenOf(graph, id);
    const centre =
      children.length > 0
        ? middle(children.map((child) => place(child)))
        : column(spouse === undefined ? 1 : 2);

    const y = (generation.get(id) ?? 0) * ROW;
    if (spouse === undefined) {
      positions.set(id, { x: centre, y });
      return centre;
    }
    positions.set(id, { x: centre - COLUMN / 2, y });
    positions.set(spouse, {
      x: centre + COLUMN / 2,
      y: (generation.get(spouse) ?? 0) * ROW,
    });
    return centre - COLUMN / 2;
  };

  // A couple of leaves needs two columns, and its centre falls between them.
  const column = (width: number): number => {
    const centre = (nextColumn + (width - 1) / 2) * COLUMN;
    nextColumn += width;
    return centre;
  };

  for (const root of rootsOf(graph)) {
    place(root);
  }
  if (focus !== undefined) {
    pedigree(graph, focus, generation, positions);
    gather(graph, focus, positions);
  }
  return separate(positions);
}

// Drawn downward a pedigree converges: every line of ancestors runs into the same
// person, so an algorithm that hands its space to leaves leaves the generations above
// with none of their own, and their edges cross. Walked upward from the focus the same
// pedigree diverges again — one person, two parents, four grandparents — which is the
// shape the tidy layout is good at. So ancestors are placed in that direction and then
// slid across until the focus sits where the downward pass had already put them.
function pedigree(
  graph: Graph,
  focus: PersonId,
  generation: ReadonlyMap<PersonId, number>,
  positions: Map<PersonId, Point>,
): void {
  const above = new Map<PersonId, number>();
  let nextColumn = 0;

  const climb = (id: PersonId): number => {
    const known = above.get(id);
    if (known !== undefined) {
      return known;
    }
    // Set before climbing: bad data with a cycle stops here instead of hanging.
    above.set(id, 0);
    const parents = parentsOf(graph, id).filter((parent) =>
      graph.people.has(parent),
    );
    const x =
      parents.length === 0 ? nextColumn++ * COLUMN : middle(parents.map(climb));
    above.set(id, x);
    return x;
  };

  const shift = (positions.get(focus)?.x ?? 0) - climb(focus);
  for (const [id, x] of above) {
    if (id !== focus) {
      positions.set(id, {
        x: x + shift,
        y: (generation.get(id) ?? 0) * ROW,
      });
    }
  }
}

// Siblings hang from the same union as the focus, which the pedigree has parked
// directly above it. The downward pass had put them past the far end of the focus's own
// descendants, so the lines from that union had to reach across everything in between.
// Bringing them back alongside is what uncrosses them; each keeps their partner, so a
// couple is moved as a couple.
function gather(
  graph: Graph,
  focus: PersonId,
  positions: Map<PersonId, Point>,
): void {
  const home = positions.get(focus);
  if (!home) {
    return;
  }
  let cursor = home.x - COLUMN;
  for (const sibling of siblingsOf(graph, focus)) {
    if (!positions.has(sibling)) {
      continue;
    }
    const partner = partnersOf(graph, sibling).find((id) => positions.has(id));
    if (partner !== undefined) {
      positions.set(partner, { x: cursor, y: home.y });
      cursor -= COLUMN;
    }
    positions.set(sibling, { x: cursor, y: home.y });
    cursor -= COLUMN;
  }
}

// Marriage weaves the lineages together, so a spouse borrowed from another family can
// be handed a column inside their in-laws' range and leave two unrelated couples
// centred on the same point. Rather than a layout clever enough to avoid that, each
// row is swept left to right and anyone too close to their neighbour is pushed along.
// It costs the exact centring of a parent over its children, which the diagonal edges
// then show.
function separate(positions: Map<PersonId, Point>): Map<PersonId, Point> {
  const rows = new Map<number, PersonId[]>();
  for (const [id, point] of positions) {
    rows.set(point.y, [...(rows.get(point.y) ?? []), id]);
  }

  for (const [y, ids] of rows) {
    const sorted = ids.sort(
      (one, other) =>
        (positions.get(one)?.x ?? 0) - (positions.get(other)?.x ?? 0) ||
        one.localeCompare(other),
    );
    let limit = -Infinity;
    for (const id of sorted) {
      const x = Math.max(positions.get(id)?.x ?? 0, limit);
      positions.set(id, { x, y });
      limit = x + COLUMN;
    }
  }
  return positions;
}

const middle = (xs: readonly number[]): number =>
  (Math.min(...xs) + Math.max(...xs)) / 2;

// A row per generation. Two rules decide it, and neither alone is enough: a person
// belongs below their parents, and level with the person they married. Counting down
// from parentless people only would put a spouse who married into the fourth
// generation in the first, because the parents they brought with them are roots too;
// so parentless people are afterwards lifted to sit just above their own children.
export function generations(graph: Graph): Map<PersonId, number> {
  const depth = new Map<PersonId, number>(
    [...graph.people.keys()].map((id) => [id, 0]),
  );
  const of = (id: PersonId): number => depth.get(id) ?? 0;

  for (let pass = 0; pass < graph.people.size; pass += 1) {
    let moved = false;
    const settle = (id: PersonId, value: number): void => {
      if (value !== of(id)) {
        depth.set(id, value);
        moved = true;
      }
    };

    for (const [id, person] of graph.people) {
      for (const parent of person.parents) {
        settle(id, Math.max(of(id), of(parent) + 1));
      }
      for (const partner of person.partners) {
        settle(id, Math.max(of(id), of(partner)));
      }
    }
    for (const [id, person] of graph.people) {
      const children = childrenOf(graph, id);
      if (person.parents.length === 0 && children.length > 0) {
        settle(id, Math.min(...children.map(of)) - 1);
      }
    }
    if (!moved) {
      break;
    }
  }
  return depth;
}

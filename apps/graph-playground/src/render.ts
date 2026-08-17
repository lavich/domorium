import {
  childrenOf,
  childrenOfCouple,
  parentsOf,
  partnersOf,
  type Graph,
  type PersonId,
} from "./graph";
import type { Point } from "./layout";

const NODE_WIDTH = 116;
const NODE_HEIGHT = 44;
const PADDING = 40;

export interface GraphView {
  // Only the people the layout has a point for are drawn. `anchor` is the person just
  // chosen: the frame is positioned so that they do not move.
  update(layout: ReadonlyMap<PersonId, Point>, anchor: PersonId): void;
  // Dim everyone outside `lit`, or restore the whole frame when it is null. Nothing
  // moves — this is the cheap half of the interaction.
  highlight(lit: ReadonlySet<PersonId> | null): void;
}

export interface Pointer {
  // The cursor has come to rest on someone, or left them.
  point(id: PersonId | null): void;
  // Someone has been chosen, which is the only thing that rebuilds the frame.
  choose(id: PersonId): void;
}

export function renderGraph(
  root: HTMLElement,
  graph: Graph,
  // The whole graph's layout, used for nothing but the canvas size. Sizing the page
  // to the widest possible branch keeps the scroll position from lurching every time
  // a narrower branch is drawn.
  extent: ReadonlyMap<PersonId, Point>,
  pointer: Pointer,
): GraphView {
  root.replaceChildren();
  root.style.width = `${span(extent).width + NODE_WIDTH + PADDING * 2}px`;
  root.style.height = `${span(extent).height + NODE_HEIGHT + PADDING * 2}px`;
  const edgeLayer = root.appendChild(document.createElement("div"));

  // Colour slots are handed out in the order the lines first appear, and there are
  // only eight. A ninth family gets the neutral slot rather than a made-up hue that
  // would read as one of the eight.
  const lineages = [
    ...new Set([...graph.people.values()].map((person) => person.lineage)),
  ];

  const nodes = new Map<PersonId, HTMLElement>();
  for (const [id, person] of graph.people) {
    const slot = lineages.indexOf(person.lineage);
    const element = document.createElement("div");
    element.className = "person";
    element.dataset.lineage = slot < 8 ? String(slot) : "other";
    element.textContent = person.name;
    element.tabIndex = 0;
    element.addEventListener("pointerenter", () => pointer.point(id));
    element.addEventListener("pointerleave", () => pointer.point(null));
    element.addEventListener("focus", () => pointer.point(id));
    element.addEventListener("blur", () => pointer.point(null));
    element.addEventListener("click", () => pointer.choose(id));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pointer.choose(id);
        return;
      }
      const next = step(id, event.key);
      if (next !== undefined) {
        event.preventDefault();
        nodes.get(next)?.focus();
      }
    });
    nodes.set(id, root.appendChild(element));
  }

  const placed = new Map<PersonId, Point>();
  let edges: { one: PersonId; other: PersonId; element: HTMLElement }[] = [];

  // Up and down walk the tree; left and right walk the row, which is what siblings,
  // partners and cousins all share. Moving only moves the selection — rebuilding the
  // frame stays behind Enter, the same bargain the mouse gets.
  const step = (from: PersonId, key: string): PersonId | undefined => {
    const here = placed.get(from);
    if (!here) {
      return undefined;
    }
    const nearest = (candidates: Iterable<PersonId>): PersonId | undefined =>
      [...candidates]
        .map((id) => ({ id, at: placed.get(id) }))
        .filter((candidate) => candidate.at !== undefined)
        .sort(
          (one, other) =>
            Math.abs((one.at?.x ?? 0) - here.x) -
            Math.abs((other.at?.x ?? 0) - here.x),
        )[0]?.id;

    if (key === "ArrowUp") {
      return nearest(parentsOf(graph, from));
    }
    if (key === "ArrowDown") {
      return nearest(childrenOf(graph, from));
    }
    if (key !== "ArrowLeft" && key !== "ArrowRight") {
      return undefined;
    }
    return nearest(
      [...placed]
        .filter(([, at]) =>
          key === "ArrowLeft"
            ? at.y === here.y && at.x < here.x
            : at.y === here.y && at.x > here.x,
        )
        .map(([id]) => id),
    );
  };

  return {
    update(layout, anchor) {
      const shift = horizontalShift(layout, anchor, placed);
      const at = (id: PersonId): Point | null => {
        const point = layout.get(id);
        return point ? { x: point.x + shift, y: point.y + PADDING } : null;
      };

      // Grow to fit, never shrink: a canvas that narrowed would drag the scroll
      // position with it every time a smaller branch was drawn.
      const needed =
        Math.max(...[...layout.values()].map((point) => point.x)) +
        shift +
        NODE_WIDTH / 2 +
        PADDING;
      root.style.width = `${Math.max(needed, parseFloat(root.style.width))}px`;

      placed.clear();
      for (const [id, element] of nodes) {
        const point = at(id);
        element.hidden = point === null;
        element.dataset.focus = id === anchor ? "on" : "off";
        if (point) {
          placed.set(id, point);
          element.style.left = `${point.x - NODE_WIDTH / 2}px`;
          element.style.top = `${point.y}px`;
        }
      }

      edges = [];
      const hung = new Set<PersonId>();

      for (const id of layout.keys()) {
        const from = at(id);
        for (const partner of partnersOf(graph, id)) {
          const to = at(partner);
          // Once per couple, not once per spouse.
          if (!from || !to || id > partner) {
            continue;
          }
          const hub = { x: (from.x + to.x) / 2, y: from.y + NODE_HEIGHT / 2 };
          edges.push(
            { one: id, other: partner, element: familyElement(hub) },
            {
              one: id,
              other: partner,
              element: line(waist(from), hub, "edge partner"),
            },
            {
              one: id,
              other: partner,
              element: line(waist(to), hub, "edge partner"),
            },
          );
          for (const child of childrenOfCouple(graph, id, partner)) {
            const target = at(child);
            if (target) {
              hung.add(child);
              edges.push({
                one: id,
                other: child,
                element: line(hub, target, "edge"),
              });
            }
          }
        }
      }

      // Whoever the family cards did not account for — a child one of whose parents is
      // off the frame — still needs a line to the parent that is on it.
      for (const id of layout.keys()) {
        const from = at(id);
        if (!from) {
          continue;
        }
        for (const child of childrenOf(graph, id)) {
          const to = at(child);
          if (to && !hung.has(child)) {
            edges.push({
              one: id,
              other: child,
              element: line(below(from), to, "edge"),
            });
          }
        }
      }

      edgeLayer.replaceChildren(...edges.map(({ element }) => element));
      this.highlight(null);
      // The card just chosen keeps the keyboard, so the arrows carry on from there.
      // Without preventScroll, re-centring would also yank the page around.
      nodes.get(anchor)?.focus({ preventScroll: true });
    },

    highlight(lit) {
      for (const [id, element] of nodes) {
        element.dataset.lit = lit === null || lit.has(id) ? "on" : "off";
      }
      for (const { one, other, element } of edges) {
        element.dataset.lit =
          lit === null || (lit.has(one) && lit.has(other)) ? "on" : "off";
      }
    },
  };
}

// The whole frame slides so that the person under the cursor lands back on the column
// they already occupied. Everyone else takes whatever the fresh layout gives them; the
// one being pointed at is the only fixed point, which is also what keeps the card from
// sliding out from under the pointer and firing the next hover by itself.
//
// The left edge wins over the anchor: a branch wider on that side than the anchor
// allows would otherwise be dealt negative coordinates and get clipped away. There is
// no matching clamp on the right, because the canvas grows instead.
function horizontalShift(
  layout: ReadonlyMap<PersonId, Point>,
  anchor: PersonId,
  placed: ReadonlyMap<PersonId, Point>,
): number {
  const xs = [...layout.values()].map((point) => point.x);
  const flush = PADDING + NODE_WIDTH / 2 - Math.min(...xs);
  const anchored = placed.get(anchor)?.x;
  const wanted =
    anchored === undefined ? flush : anchored - (layout.get(anchor)?.x ?? 0);
  return Math.max(wanted, flush);
}

const span = (layout: ReadonlyMap<PersonId, Point>) => {
  const points = [...layout.values()];
  return {
    width:
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
    height: Math.max(...points.map((p) => p.y)),
  };
};

const below = (point: Point): Point => ({
  x: point.x,
  y: point.y + NODE_HEIGHT,
});
const waist = (point: Point): Point => ({
  x: point.x,
  y: point.y + NODE_HEIGHT / 2,
});

function familyElement(at: Point): HTMLElement {
  const element = document.createElement("div");
  element.className = "family";
  element.style.left = `${at.x}px`;
  element.style.top = `${at.y}px`;
  return element;
}

function line(from: Point, to: Point, className: string): HTMLElement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const element = document.createElement("div");
  element.className = className;
  element.style.left = `${from.x}px`;
  element.style.top = `${from.y}px`;
  element.style.width = `${Math.hypot(dx, dy)}px`;
  element.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  return element;
}

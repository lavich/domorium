import { buildGraph, type Graph, type Person, type PersonId } from "./graph";

const GIVEN_NAMES = [
  "Ada",
  "Boris",
  "Clara",
  "Dmitri",
  "Elena",
  "Felix",
  "Greta",
  "Hugo",
  "Irina",
  "Jonas",
  "Klara",
  "Lev",
  "Maja",
  "Nikolai",
  "Olga",
  "Pavel",
  "Rosa",
  "Semyon",
  "Tanya",
  "Uwe",
];

// One founding couple's worth of lineages per pair, so every marriage joins two
// families that were unrelated until it happened. That is what gives a partner a
// pedigree of their own to unfold beside yours.
const SURNAMES = [
  "Abbott",
  "Bergman",
  "Castellan",
  "Duval",
  "Eriksen",
  "Fontaine",
  "Grimaldi",
  "Halvorsen",
];

// Repeating instead of random: a layout is only worth looking at twice if the second
// look shows the same tree. Uneven on purpose, so sibling groups differ in size.
const CHILD_COUNTS = [3, 2, 4, 2, 3];

interface Draft {
  readonly id: PersonId;
  readonly name: string;
  readonly parents: PersonId[];
  readonly partners: PersonId[];
  readonly lineage: string;
}

export function generateFamily(size: number): Person[] {
  const drafts: Draft[] = [];
  let nextName = 0;

  const add = (parents: PersonId[], lineage: string): Draft => {
    const draft = {
      id: `P${drafts.length + 1}`,
      name: `${GIVEN_NAMES[drafts.length % GIVEN_NAMES.length]} ${lineage}`,
      parents,
      partners: [],
      lineage,
    };
    drafts.push(draft);
    return draft;
  };

  const marry = (one: Draft, other: Draft): void => {
    one.partners.push(other.id);
    other.partners.push(one.id);
  };

  // Every spouse comes from a family this one has never met, bringing the parents they
  // came from. Pairing people out of the same generation instead — the obvious way to
  // grow a mock — marries cousins within three generations, and a pedigree with a
  // shared ancestor is no longer a tree: its lines cannot be drawn without crossing.
  // The surnames run out and start again, so two families can share a name without
  // sharing any blood, exactly as they do outside.
  const marriesIn = (): Draft => {
    const father = add([], SURNAMES[nextName++ % SURNAMES.length]);
    const mother = add([], SURNAMES[nextName++ % SURNAMES.length]);
    marry(father, mother);
    return add([father.id, mother.id], father.lineage);
  };

  const founder = add([], SURNAMES[nextName++ % SURNAMES.length]);
  const consort = marriesIn();
  marry(founder, consort);
  let generation: [Draft, Draft][] = [[founder, consort]];

  while (generation.length > 0 && drafts.length < size) {
    const next: [Draft, Draft][] = [];
    for (const [one, other] of generation) {
      const count = CHILD_COUNTS[drafts.length % CHILD_COUNTS.length];
      for (let n = 0; n < count && drafts.length < size; n += 1) {
        // Alternate which side the children take their name from, so the families
        // that marry in are not painted over by the one they married into.
        const child = add(
          [one.id, other.id],
          n % 2 === 0 ? one.lineage : other.lineage,
        );
        // A marriage costs three more people. Out of room, the child stays single
        // and the line ends there, which is how a real file peters out too.
        if (drafts.length + 3 <= size) {
          const spouse = marriesIn();
          marry(child, spouse);
          next.push([child, spouse]);
        }
      }
    }
    generation = next;
  }

  return drafts.map(({ id, name, lineage, parents, partners }) => ({
    id,
    name,
    lineage,
    parents,
    partners,
  }));
}

export const familyGraph: Graph = buildGraph(generateFamily(72));

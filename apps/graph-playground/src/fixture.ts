// A generated family, for the tests only. A real file small enough to keep in a test
// is too small to catch a layout that falls apart at scale — the one bundled with the
// app holds eleven people, and the collisions this has caught needed seventy — and one
// big enough to catch it is too big to read. It is emitted as GEDCOM rather than built
// as a graph so the tests come in through `readGedcom`, the only door the app has.

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

interface Individual {
  readonly id: string;
  readonly name: string;
}

interface Family {
  readonly id: string;
  readonly spouses: readonly [string, string];
  readonly children: string[];
}

interface Spouse {
  readonly person: Individual;
  readonly surname: string;
}

export function generateGedcom(size: number): string {
  const individuals: Individual[] = [];
  const families: Family[] = [];
  let nextSurname = 0;

  const surname = (): string => SURNAMES[nextSurname++ % SURNAMES.length];

  const born = (family: string): Spouse => {
    const person = {
      id: `@I${individuals.length + 1}@`,
      name: `${GIVEN_NAMES[individuals.length % GIVEN_NAMES.length]} /${family}/`,
    };
    individuals.push(person);
    return { person, surname: family };
  };

  const wed = (one: Spouse, other: Spouse): Family => {
    const family = {
      id: `@F${families.length + 1}@`,
      spouses: [one.person.id, other.person.id] as [string, string],
      children: [],
    };
    families.push(family);
    return family;
  };

  // Every spouse comes from a family this one has never met, bringing the parents they
  // came from. Pairing people out of the same generation instead — the obvious way to
  // grow a mock — marries cousins within three generations, and a pedigree with a
  // shared ancestor is no longer a tree: its lines cannot be drawn without crossing.
  // The surnames run out and start again, so two families can share a name without
  // sharing any blood, exactly as they do outside.
  const marriesIn = (): Spouse => {
    const father = born(surname());
    const mother = born(surname());
    const child = born(father.surname);
    wed(father, mother).children.push(child.person.id);
    return child;
  };

  const founder = born(surname());
  const consort = marriesIn();
  let generation = [
    { one: founder, other: consort, home: wed(founder, consort) },
  ];

  while (generation.length > 0 && individuals.length < size) {
    const next: typeof generation = [];
    for (const { one, other, home } of generation) {
      const count = CHILD_COUNTS[individuals.length % CHILD_COUNTS.length];
      for (let n = 0; n < count && individuals.length < size; n += 1) {
        // Alternate which side the children take their name from, so the families
        // that marry in are not painted over by the one they married into.
        const child = born(n % 2 === 0 ? one.surname : other.surname);
        home.children.push(child.person.id);
        // A marriage costs three more people. Out of room, the child stays single
        // and the line ends there, which is how a real file peters out too.
        if (individuals.length + 3 <= size) {
          const spouse = marriesIn();
          next.push({ one: child, other: spouse, home: wed(child, spouse) });
        }
      }
    }
    generation = next;
  }

  return [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    ...individuals.flatMap(({ id, name }) => [
      `0 ${id} INDI`,
      `1 NAME ${name}`,
    ]),
    ...families.flatMap(({ id, spouses, children }) => [
      `0 ${id} FAM`,
      `1 HUSB ${spouses[0]}`,
      `1 WIFE ${spouses[1]}`,
      ...children.map((child) => `1 CHIL ${child}`),
    ]),
    "0 TRLR",
    "",
  ].join("\n");
}

export const familyGedcom = generateGedcom(72);

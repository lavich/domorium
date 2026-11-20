import { PATHS, type SitePath } from "./paths";

/**
 * A frame may only show an ability `abilities.ts` marks for that place: a
 * picture cannot claim what the comparison denies. `scripts/shots/README.md`
 * is the recipe that makes a replacement frame match.
 */
export interface Shot {
  /** The basename under `public/shots`, without an extension. */
  name: string;
  /** A moving frame ships `.mp4` and `.webm` beside the `.webp` poster. */
  motion?: true;
  caption: string;
  alt: string;
}

export const SHOT_WIDTH = 1280;
export const SHOT_HEIGHT = 820;

export const CARD_WIDTH = 900;
export const CARD_HEIGHT = 576;

export interface Card {
  /** The basename under `public/shots`, without an extension. */
  name: string;
  alt: string;
}

const SHOTS: Record<string, Shot[]> = {
  [PATHS.vscode]: [
    {
      name: "vscode-1",
      motion: true,
      caption: "A tag completed, and the warning it clears",
      alt: "Visual Studio Code with simpsons70.ged open. Typing 1 BIR offers BIRT and BURI with their meanings; accepting BIRT leaves a warning that the tag asserts nothing, and adding 2 DATE 24 MAY 1899 under it clears the file to no problems.",
    },
    {
      name: "vscode-2",
      caption: "A pointer that names nothing, and the fix for it",
      alt: "A cross-reference @F0009@ underlined in red inside Abraham Simpson's record, with the message “No FAM record carries @F0009@ (unresolved-xref)” and links to view the problem or apply a quick fix.",
    },
    {
      name: "vscode-3",
      caption: "GEDCOM inside a Markdown note, coloured and checked",
      alt: "A Markdown file about Abraham Simpson with a fenced gedcom block, its levels, tags and cross-reference coloured as they are in a .ged file.",
    },
  ],
  [PATHS.obsidian]: [
    {
      name: "obsidian-1",
      motion: true,
      caption: "A family graph, and the branch of one person",
      alt: "curie.ged open in Obsidian as a family graph, its cards tinted by surname. Resting on Marie Skłodowska-Curie fades everyone outside her branch; choosing her opens her record card in the sidebar, and Branch narrows the graph to her parents, her husband, her daughters and their families.",
    },
    {
      name: "obsidian-2",
      caption: "Lives on a timeline, and the links of one",
      alt: "The Curie family as a timeline from 1820 to 2040, each person a bar from birth to death. Marie Skłodowska-Curie's bar is selected, with arrows falling from her parents' bars to her birth and from her to the births of Irène and Ève.",
    },
    {
      name: "obsidian-3",
      caption: "A record edited in its card, not only in the source",
      alt: "The people of curie.ged as a list with years, places and sources, beside Pierre Curie's record card: his birth unfolded to its date and place, and his occupation open in a field with buttons to remove the line, add a field and drag it into place.",
    },
  ],
  [PATHS.jetbrains]: [
    {
      name: "jetbrains-1",
      motion: true,
      caption: "From a person to the family that names them",
      alt: "WebStorm with simpsons70.ged open. Go to definition on the cross-reference in Abraham Simpson's FAMS line jumps to the family record that holds his wife and son, and the back gesture returns to where it started.",
    },
    {
      name: "jetbrains-2",
      caption: "Every line that names one record",
      alt: "The Find tool window listing the five usages of @F0002@ in the file — one definition and four references — with the record previewed beside the list.",
    },
    {
      name: "jetbrains-3",
      caption: "The whole file folded to its records",
      alt: "Every record in simpsons70.ged collapsed to a single line, so the file reads as a list of the Simpsons and Bouviers and the families joining them.",
    },
  ],
};

/**
 * A card is too narrow to read a whole window in, so it shows a crop of one
 * frame, taken over the part that carries the claim.
 */
const CARDS: Record<string, Card> = {
  [PATHS.vscode]: {
    name: "vscode-card",
    alt: "A completion list open in Visual Studio Code over Abraham Simpson's record, offering BIRT and BURI with their meanings beside them.",
  },
  [PATHS.obsidian]: {
    name: "obsidian-card",
    alt: "Marie Skłodowska-Curie selected in Obsidian's family graph, between Pierre Curie and her daughters, beside her record card listing her names, birth, death, occupation and families.",
  },
  [PATHS.jetbrains]: {
    name: "jetbrains-card",
    alt: "Every record of a GEDCOM file folded to one line each in WebStorm, listing the Simpsons and the Bouviers by name.",
  },
};

/** Stands where ADR-0015 has the editor itself run, once a reader asks. */
export const EDITOR_POSTER = {
  name: "editor",
  dark: "editor-dark",
  width: 1100,
  height: 929,
  alt: "The Domorium editor in a browser with example.ged open, a broken cross-reference marked on line 23, and a problems panel reading “No FAM record carries @F0009@”.",
};

export function shotsOf(path: SitePath): Shot[] {
  return SHOTS[path] ?? [];
}

export function cardOf(path: SitePath): Card | null {
  return CARDS[path] ?? null;
}

export const ALL_CARDS: { path: SitePath; card: Card }[] = Object.entries(
  CARDS,
).map(([path, card]) => ({ path: path as SitePath, card }));

export const ALL_SHOTS: { path: SitePath; shot: Shot }[] = Object.entries(
  SHOTS,
).flatMap(([path, shots]) =>
  shots.map((shot) => ({ path: path as SitePath, shot })),
);

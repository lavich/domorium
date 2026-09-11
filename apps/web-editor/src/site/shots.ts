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
      caption: "A link in a note, and the record behind it",
      alt: "A note about Marie Skłodowska-Curie in an Obsidian vault. Resting on the link to her record shows the whole record without opening anything; following it opens curie.ged at that record.",
    },
    {
      name: "obsidian-2",
      caption: "The photograph, cropped to the part the record asks for",
      alt: "The lines 1 OBJE @O5@ and 2 CROP with TOP 40, LEFT 30, HEIGHT 240 and WIDTH 130, beside a preview of the family photograph cropped to that rectangle and captioned “Marie, on the left”.",
    },
    {
      name: "obsidian-3",
      caption: "The tree edited in the vault, not converted to it",
      alt: "curie.ged open in Obsidian's file explorer beside the vault's notes, Marie Skłodowska-Curie's record indented by level, and a status bar reading “GEDCOM 7.0 · no problems”.",
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
    alt: "A photograph previewed in Obsidian, cropped to one person and captioned “Marie, on the left”, beside the CROP lines of the record that asks for that rectangle.",
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

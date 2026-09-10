import { PATHS, type SitePath } from "./paths";

/** Every place the language service is met, in the order the table shows them. */
export const PLACES: { path: SitePath; label: string }[] = [
  { path: PATHS.vscode, label: "VS Code" },
  { path: PATHS.obsidian, label: "Obsidian" },
  { path: PATHS.jetbrains, label: "JetBrains" },
  { path: PATHS.editor, label: "Browser" },
];

/**
 * True of every place, because one language service answers for all of them.
 * Anything here is deliberately absent from the table below: a row of four
 * marks tells a reader nothing.
 */
export const SHARED_ABILITIES = [
  "Autocomplete that knows which tags are legal at this level, in this structure",
  "Validation against the GEDCOM 5.5.1 and 7.0 specifications, as you type",
  "Semantic highlighting of levels, tags and cross-references",
  "Hover: what a tag means, and the record a cross-reference names",
  "Go to definition from a cross-reference to its record",
  "Quick fixes for broken references and invalid levels",
  "Folding of records and nested structures",
  "Clickable web links and links to files beside the document",
];

export interface Ability {
  label: string;
  /** The same ability, short enough for a row of chips. */
  chip?: string;
  /**
   * Where it exists. `true` marks it; a string marks it and says how, where the
   * honest answer needs words. A place absent from the map is a place where
   * this was not verified — under-claiming is the rule.
   */
  where: Partial<Record<SitePath, true | string>>;
}

export const DISTINCT_ABILITIES: Ability[] = [
  {
    label: "Find all references, with read and write highlights",
    chip: "Find references",
    where: { [PATHS.vscode]: true, [PATHS.obsidian]: true },
  },
  {
    label: "Safe cross-reference rename, as one undoable edit",
    chip: "Safe rename",
    where: { [PATHS.vscode]: true, [PATHS.obsidian]: true },
  },
  {
    label: "An outline of the records in the document",
    chip: "Outline",
    where: { [PATHS.vscode]: true },
  },
  {
    label: "Colour from the moment a file opens, before the server connects",
    chip: "Colour on open",
    where: { [PATHS.vscode]: true },
  },
  {
    label: "GEDCOM highlighted and checked inside a fenced code block",
    chip: "Fenced blocks",
    where: { [PATHS.vscode]: "in Markdown", [PATHS.obsidian]: "in notes" },
  },
  {
    label: "Indentation hints on nested lines",
    chip: "Indentation hints",
    where: {
      [PATHS.vscode]: true,
      [PATHS.obsidian]: true,
      [PATHS.editor]: true,
    },
  },
  {
    label: "The photograph a record points at, shown where it is named",
    chip: "Photograph preview",
    where: {
      [PATHS.vscode]: "on hover",
      [PATHS.obsidian]: "cropped to the region",
    },
  },
  {
    label: "A note or photograph opened beside the document",
    chip: "Preview beside the file",
    where: { [PATHS.obsidian]: true, [PATHS.editor]: true },
  },
  {
    label: "A link from a note straight to a record",
    chip: "Note to record links",
    where: { [PATHS.obsidian]: "vault link or obsidian:// URL" },
  },
  {
    label: "A whole folder at once, written back in place",
    chip: "A whole folder",
    where: {
      [PATHS.obsidian]: "your vault",
      [PATHS.editor]: "a folder you grant",
    },
  },
  {
    label: "A problems panel that folds repeats of one finding and counts them",
    chip: "Grouped problems",
    where: { [PATHS.editor]: true },
  },
  {
    label: "Any IntelliJ-platform IDE",
    chip: "Any IntelliJ IDE",
    where: { [PATHS.jetbrains]: true },
  },
  {
    label: "The language server bundled with the plugin, running locally",
    chip: "Bundled server",
    where: { [PATHS.jetbrains]: true },
  },
  {
    label: "Typo inspection kept off tags and identifiers",
    chip: "No typo noise",
    where: { [PATHS.jetbrains]: true },
  },
  {
    label: "Desktop and mobile",
    where: { [PATHS.obsidian]: true },
  },
  {
    label: "No Node.js needed on your machine",
    chip: "No Node.js",
    where: {
      [PATHS.vscode]: "a web extension too",
      [PATHS.obsidian]: true,
      [PATHS.editor]: true,
    },
  },
];

/** What only this place does, short enough for a row of chips. */
export function abilitiesOf(path: SitePath): Ability[] {
  return DISTINCT_ABILITIES.filter((ability) => path in ability.where);
}

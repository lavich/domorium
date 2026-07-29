import {
  HighlightStyle,
  StreamLanguage,
  type StreamParser,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

export type GedcomSyntaxRole =
  | "level"
  | "xrefDeclaration"
  | "xref"
  | "tag"
  | "value";

export interface GedcomSyntaxToken {
  from: number;
  to: number;
  role: GedcomSyntaxRole;
}

export function classifyGedcomLine(line: string): GedcomSyntaxToken[] {
  const match = /^(\d+)[ \t]+(?:(@[A-Za-z0-9_]+@)[ \t]+)?([A-Z0-9_]+)(?:[ \t]+(.+))?$/.exec(line);
  if (!match) {
    return [];
  }
  const tokens: GedcomSyntaxToken[] = [];
  addMatch(tokens, match[1], 0, "level");
  const tagStart = match[1].length + line.slice(match[1].length).search(/\S/);
  let cursor = tagStart;
  if (match[2]) {
    addMatch(tokens, match[2], cursor, "xrefDeclaration");
    cursor = line.indexOf(match[3], cursor + match[2].length);
  }
  addMatch(tokens, match[3], cursor, "tag");
  if (match[4]) {
    const valueStart = line.indexOf(match[4], cursor + match[3].length);
    addMatch(
      tokens,
      match[4],
      valueStart,
      /^@[A-Za-z0-9_]+@$/.test(match[4]) ? "xref" : "value",
    );
  }
  return tokens;
}

function addMatch(
  tokens: GedcomSyntaxToken[],
  value: string,
  from: number,
  role: GedcomSyntaxRole,
): void {
  tokens.push({ from, to: from + value.length, role });
}

interface ParserState {
  tokens: GedcomSyntaxToken[];
  index: number;
}

const parser: StreamParser<ParserState> = {
  startState: () => ({ tokens: [], index: 0 }),
  token(stream, state) {
    if (stream.sol()) {
      state.tokens = classifyGedcomLine(stream.string);
      state.index = 0;
    }
    const next = state.tokens[state.index];
    if (!next) {
      stream.skipToEnd();
      return null;
    }
    if (stream.pos < next.from) {
      stream.pos = next.from;
      return null;
    }
    stream.pos = next.to;
    state.index += 1;
    return tokenStyle(next.role);
  },
};

function tokenStyle(role: GedcomSyntaxRole): string | null {
  if (role === "level") {
    return "comment";
  }
  if (role === "xref" || role === "xrefDeclaration") {
    return "keyword";
  }
  if (role === "tag") {
    return "string";
  }
  return null;
}

export const gedcomLanguage = StreamLanguage.define(parser);

export const gedcomSyntaxHighlighting = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.comment, color: "#6a9955" },
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.string, color: "#ce9178" },
]));

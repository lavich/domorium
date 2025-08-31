import { createToken, Lexer, ILexingResult, ILexerConfig } from "chevrotain";
import { IMultiModeLexerDefinition } from "@chevrotain/types";

export enum TokenNames {
  LEVEL = "LEVEL",
  POINTER = "POINTER",
  TAG = "TAG",
  XREF = "XREF",
  VALUE = "VALUE",
}

const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
});

const Newline = createToken({
  name: "Newline",
  pattern: /\r?\n/,
  group: Lexer.SKIPPED,
  line_breaks: true,
  push_mode: "main",
});

// --- GEDCOM ---
export const Level = createToken({
  name: TokenNames.LEVEL,
  pattern: /[0-9]+/,
  start_chars_hint: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
});

export const Pointer = createToken({
  name: TokenNames.POINTER,
  pattern: /@[A-Za-z0-9_]+@/,
  start_chars_hint: ["@"],
  push_mode: "hasPointer",
});

export const Tag = createToken({
  name: TokenNames.TAG,
  pattern: /[A-Z0-9_]+/,
  start_chars_hint: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"],
});

export const Xref = createToken({
  name: TokenNames.XREF,
  pattern: /@[A-Za-z0-9_]+@/,
  start_chars_hint: ["@"],
  pop_mode: true,
});

export const Value = createToken({
  name: TokenNames.VALUE,
  pattern: /.+/,
  line_breaks: false,
  pop_mode: true,
});

export const gedcomLexerDefinition: IMultiModeLexerDefinition = {
  defaultMode: "main",
  modes: {
    main: [
      Newline,
      WhiteSpace,
      Level,
      Pointer,
      { ...Tag, PUSH_MODE: "hasNotPointer" },
    ],
    hasPointer: [Newline, WhiteSpace, { ...Tag, POP_MODE: true }],
    hasNotPointer: [Newline, WhiteSpace, Xref, Value],
  },
};

export const tokens = {
  Level,
  Pointer,
  Tag,
  Xref,
  Value,
};

export interface ConfigurableLexerOptions extends ILexerConfig {
  // TODO Make pull request to chevrotain
  zeroBased?: boolean;
}

export class ConfigurableLexer extends Lexer {
  private readonly zeroBased: boolean;

  constructor(config?: ConfigurableLexerOptions) {
    super(gedcomLexerDefinition, config);
    this.zeroBased = config?.zeroBased ?? false;
  }

  override tokenize(text: string, initialMode?: string): ILexingResult {
    const result = super.tokenize(text, initialMode);

    if (this.zeroBased) {
      result.tokens.forEach((t) => {
        if (t.startLine != null) {
          t.startLine -= 1;
        }
        if (t.startColumn != null) {
          t.startColumn -= 1;
        }
        if (t.endLine != null) {
          t.endLine -= 1;
        }
        if (t.endColumn != null) {
          t.endColumn -= 1;
        }
      });
      result.errors.forEach((e) => {
        if (e.line != null) {
          e.line -= 1;
        }
        if (e.column != null) {
          e.column -= 1;
        }
      });
    }

    return result;
  }
}

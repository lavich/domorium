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

// Exactly one space delimits a tag from its value; the rest belong to the
// value. Hence one character, and a mode without this rule to move into —
// staying would match again and eat the indentation. Popping as well as
// pushing keeps the mode stack from growing a frame per line.
const Delimiter = createToken({
  name: "Delimiter",
  pattern: /[ \t]/,
  group: Lexer.SKIPPED,
  pop_mode: true,
  push_mode: "afterDelimiter",
});

const Newline = createToken({
  name: "Newline",
  // Two-character forms first, so CR-LF is one terminator. See #251.
  pattern: /\r\n|\n\r|\r|\n/,
  group: Lexer.SKIPPED,
  line_breaks: true,
  push_mode: "main",
});

// A UTF-8 byte order mark, which the specification permits and most real files
// carry. Skipping it as a token rather than stripping it from the text is what
// keeps every offset in the document truthful: removing one character up front
// would move every range after it by one, and diagnostics are placed by offset.
//
// Matched only at offset 0. Elsewhere U+FEFF is a zero-width no-break space and
// belongs to whatever it sits in — `anychar` is %x09-10FFFF, so it is legal
// inside a payload, and one at the start of some line in the middle of a file is
// worth reporting rather than silently eating.
const ByteOrderMark = createToken({
  name: "ByteOrderMark",
  pattern: (text, startOffset) =>
    startOffset === 0 && text.charCodeAt(0) === 0xfeff ? ["﻿"] : null,
  start_chars_hint: ["﻿"],
  line_breaks: false,
  group: Lexer.SKIPPED,
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

// A tag holds A-Z, 0-9 and underscore, and one written otherwise is read as
// written rather than truncated at the first letter that does not belong: the
// validator says which tag is meant. See #252.
export const Tag = createToken({
  name: TokenNames.TAG,
  pattern: /[A-Za-z0-9_]+/,
  start_chars_hint: [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_",
  ],
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
      ByteOrderMark,
      Newline,
      WhiteSpace,
      Level,
      Pointer,
      { ...Tag, PUSH_MODE: "hasNotPointer" },
    ],
    // A record-defining pointer line (e.g. "0 @I1@ INDI") is followed by
    // TAG, and then optionally by an Xref/Value just like the no-pointer
    // case below (e.g. "0 @N1@ SNOTE <shared note text>" in GEDCOM 7) — so
    // TAG here pushes into the same "hasNotPointer" mode rather than
    // popping straight back, or a trailing value would be mis-tokenized.
    hasPointer: [Newline, WhiteSpace, { ...Tag, PUSH_MODE: "hasNotPointer" }],
    hasNotPointer: [Newline, Delimiter, Xref, Value],
    afterDelimiter: [Newline, Xref, Value],
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

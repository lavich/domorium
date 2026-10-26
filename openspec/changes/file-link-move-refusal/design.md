## Context

See proposal.md for why. `retargetFileLinks` (`packages/language-service/src/libs/links/retargetFileLinks.ts:48`) filters the document's links for `file-relative` ones whose decoded, normalized target equals `from`, and replaces each with `encodeFileTarget(to)`. `fileLinkKind` (`documentLinks.ts:15`) decides how a payload is read, and `documentLinks` applies it to parsed nodes. `rename()` already answers `WorkspaceEditResult | EditRefusal` (`types.ts:60-86`).

## Goals / Non-Goals

**Goals:**

- One rule for reading and writing a `FILE` payload.
- A host learns that a move could not be written without knowing which dialect forbids what.

**Non-Goals:**

- Changing `retargetFileLinks`. It stays as it is until a major release removes it.
- Resolving paths against the document (#380) or reaching closed documents (#157).
- A 5.5.1 payload continued with `CONC`. `documentLinks` reads its first line only, so a move neither finds nor counts it; that is a reading limit shared with `retargetFileLinks`, and belongs with the reader.
- The 255-character line limit of 5.5.1. A long path is written on one line; splitting it is the job of a writer that knows `CONC` (#381).
- Wiring the method into any host (#260 for VS Code, a separate change for Obsidian).

## Decisions

### The rule is a round trip through the reader

The payload to write is `encodeFileTarget(to, dialect)`. The move is writable when a one-line document `0 @O1@ OBJE` / `1 FILE <payload>`, parsed by `GedcomDocument` and read by `documentLinks` in the document's dialect, yields exactly one link, of kind `file-relative`, whose decoded and normalized target equals the normalized `to`.

That catches every way a written payload can come back different, without listing them: the lexer reading a 5.5.1 payload such as `@x@` as a pointer, a line break splitting the line, trimming, and whatever `fileLinkKind` does not take as relative. In GEDCOM 7, `encodeFileTarget` escapes everything but unreserved characters and `/`; `.` survives, so what remains to refuse there is a `..` segment, a leading `/`, and an empty path.

Alternatives: checking `fileLinkKind(payload)` alone, or a list of forbidden patterns per dialect. Both were rejected in review: they do not model the lexer or the round trip, and a list is a second copy of the reading rule, the drift #188 reports.

The lexer does not judge characters, so one check comes before the round trip: a `to` with an unpaired surrogate or a control character other than tab is refused in both dialects. GEDCOM 7 would escape a control character, but `encodeURIComponent` throws on a lone surrogate, and 5.5.1 would write either as it is, to be saved as other characters or none.

### Refuse only when something would be written

A host calls the method for every open document after a file moves, and most documents do not name that file. With no payload naming `from`, the answer is an empty edit, not a refusal. A refusal therefore means "this document names the file and cannot be made to name its new place".

### A move to the same place changes nothing, and counts

When `to` normalizes to `from`, nothing moves. The answer is an edit replacing each payload that names the file by its own text, taken from the document rather than from `targetText`, which is trimmed where the range is not, without the writability check: re-encoding would damage a payload such as `%2E%2E/x.jpg`, which reads as a link but whose decoded path GEDCOM 7 could not write. A host counts what a refused move would have left behind with `moveFileLinks(from, from)`; that answer never refuses. The Obsidian plugin counts this way today with the old method.

Alternative: a `stranded` count on the refusal, or a separate counting query. Rejected: the first makes this refusal a different shape from every other one, the second adds a method for what an identity move already answers.

### No `expectedVersion`

`rename()` and `getCodeActions()` take one because they answer a position the host saw at some version. A move answers a file-system event and names no position, so there is nothing for the host to have seen. The edit still carries `version`, and the host applies it against that, as it does with `retargetFileLinks` today.

### Name and code

`moveFileLinks`, because the event is a file being moved or renamed, and `retarget` is taken. `unwritable-file-target`, beside `invalid-new-id`: the target is a valid path, the dialect just cannot write it here.

## Risks / Trade-offs

- [A consumer that switches exhaustively over `EditRefusalCode` stops compiling on 2.3.0.] → Neither this repository nor `domorium-obsidian` does. The changelog names the new code.
- [Two methods do nearly the same thing until the next major.] → Both use the same filter, and the deprecated one's doc comment names its replacement.
- [Parsing a one-line document per move costs a parse.] → One small parse per document per file event, against a full document already parsed.

## Migration Plan

Release `@domorium/language-service` 2.3.0 in its own PR after this lands. Then the Obsidian plugin replaces its `..` check with the refusal and moves to `^2.3.0`.

## Implementation

- A 5.5.1 `to` containing `\` is not refused, though review proposed it: `normalize` already treats `\` as a separator in a plain 5.5.1 path on both sides of a move, so `a\b` names `a/b`.
- The character check before the round trip came from code review, as did taking the unchanged text of a same-place move from the document: `targetText` is trimmed, and replacing a padded payload with it deleted the padding.

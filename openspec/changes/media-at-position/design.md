## Context

See proposal.md — Why.

`GedcomLanguageService` already answers one question by position and returns a small record or nothing: `getRecordPreview(position, { maxLines }): RecordPreview | null`. That is the shape to follow, with one difference that matters. `RecordPreview` returns _ranges_ and lets the host read the text itself; a media answer cannot, because the file may be named on a different line from the position asked about, and a rectangle is numbers rather than text.

What the two dialects offer is not symmetric, and the schemas say so:

|                        | GEDCOM 7                              | GEDCOM 5.5.1                                           |
| ---------------------- | ------------------------------------- | ------------------------------------------------------ |
| file payload           | `type-FilePath`                       | `xsd:string`                                           |
| what it is             | `FORM` is a media type (`image/jpeg`) | `FORM` is a closed list: `bmp gif jpg ole pcx tif wav` |
| a rectangle            | `OBJE > CROP {0:1}` on the link       | none                                                   |
| files per record       | `FILE {1:M}`                          | `FILE {1:M}`                                           |
| alternative renditions | `FILE > TRAN {0:M}`                   | none                                                   |

`FORM.TYPE` in 5.5.1 is `SOURCE_MEDIA_TYPE` — `PHOTO`, `AUDIO`, `BOOK`, `CARD`. It describes the _source_, not the file's format, so it is not the signal for "is this an image". `FORM` is.

`GedcomDocument.pointers` went private in #283, so a pointer is resolved through `ReferenceIndex`, which is what it exists for.

## Goals / Non-Goals

**Goals:**

- One position query, answering for both dialects, that a host can use without knowing GEDCOM.
- The format questions answered once here rather than three times in three hosts: what kind of file this is, and whether a rectangle can be applied.
- Testable without a host: the classification is a pure function over what the document declares.

**Non-Goals:**

- Reading a file, resolving it against a workspace, or reaching the network. The answer describes; the caller fetches.
- Clamping a rectangle to an image. #189 asked for this and it is not possible here — the extent of an image is not in the document. Only a host holding the image can clamp, and the spec says the rectangle is returned as written.
- Alternative renditions (`TRAN`). One image is what a host needs today; the array can come when something asks for it.
- Deciding whether a host should show a popover, or one popover or two. lavich/domorium-obsidian#85 lists that as its own open question and the layer must not pre-empt it.

## Decisions

**A query of its own rather than a widened `DocumentLink`.** #189 posed this as the open question; the constraints answer it. `getDocumentLinks()` takes no position and returns every link in the document — computing a media answer for all of them would resolve every pointer to its record for nothing, and the answer's shape differs from a link's. _Alternative considered:_ fold it into the record-preview family as `getPreviewAt(position)` returning a tagged union. Rejected: it couples two unrelated answers, and it decides "one popover or two" on the host's behalf, which #85 reserves.

**Classification by kind, not a boolean.** The answer says `image | audio | video | document | unknown`. _Alternative considered:_ `isImage: boolean`, the only question a host asks today — rejected because an icon for a PDF or a player for a `wav` then needs a release round. _Alternative considered:_ returning `form` and `medi` raw — rejected because #189's point is that three hosts should not each parse media types.

**A rectangle is named only when it can be applied.** Zero or missing extent, and a record carrying several files, both yield a file without a rectangle. _Alternative considered:_ return the rectangle with a `usable` flag — rejected as two paths where one will do. _Alternative considered:_ for several files, return the first with its rectangle — rejected because `TRAN` is how GEDCOM 7 expresses "the same file again", so several `FILE` under one record are probably _different_ pictures, and naming a rectangle of the first would be a confident wrong answer rather than an honest silence.

**The first file in document order, when a record carries several.** Deterministic, and paired with dropping the rectangle it cannot mislead. A host shows one picture instead of none.

**Resolution through `ReferenceIndex`.** `at(position)` gives the occurrence, `get(id)` its declarations, and the record's node is found from its declaration range with the existing `findNodeByTagAtPosition`. Not a preference: `document.pointers` is private as of #283.

**Placement.** `src/libs/media/mediaAt.ts` beside `libs/links`, `libs/hover`, `libs/definition`, with the classification in its own file so it can be tested against both dialects' vocabularies without building a document.

## Risks / Trade-offs

**The crop reaches two hosts of four** → Not mitigable here, and not a defect of this design. A VS Code hover renders Markdown without CSS; LSP4IJ renders JetBrains hovers through Swing's HTML, which is roughly HTML 3.2. Both can show the whole image. The layer returns the rectangle to everyone and lets each host use what it can.

**`file-relative` is nearly useless in the web editor** → A browser cannot read a file beside the document unless a directory handle was granted. Recorded rather than solved: the web editor's usable case is `http`, which is the inverse of Obsidian's.

**Classification from an extension can be wrong** → It is the last resort, only where the document declares no format, and `unknown` is the answer when the extension says nothing. A wrong guess shows the wrong affordance, not wrong data.

**Several files under one record silently lose their rectangle** → The alternative was a confidently wrong rectangle. A validator diagnostic for "a rectangle on a link to a record of several files" would make the loss visible, and is worth its own issue rather than this change.

## Migration Plan

Additive: a new method and new exported types, no existing shape changed. A minor release of `@domorium/language-service`. `packages/language-server` gains the media answer inside the `onHover` response it already builds, so no LSP capability changes and no client work is required for VS Code or JetBrains to receive the whole image.

Rollback is deleting the method; nothing depends on it until a host asks.

## Open Questions

- Whether `@domorium/codemirror` should re-export `MediaReference`. It re-exports types a host needs, and the answer follows the first consumer rather than leading it.
- Whether a rectangle on a link to a multi-file record deserves a diagnostic. A question for the validator, not for this query.

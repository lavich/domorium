# Changelog

All notable changes to `@domorium/language-service` are documented here.

## Unreleased

- **A `FORM` of `constructor` no longer answers with something that is not a
  media kind.** The tables `getMediaAt` consults to decide whether a file is an
  `image`, `audio`, `video`, a `document` or `unknown` were indexed by text the
  document supplies, and reached `Object.prototype` on the way, so a 5.5.1 file
  declaring `2 FORM constructor` — or naming a file whose extension is
  `constructor` or `__proto__` — was answered with an inherited member instead
  of one of the five kinds `MediaKind` names. The declared format and the
  extension are now both read from a table with no prototype, so an unrecognised
  format falls through to the extension as it always should have, and an
  unrecognised extension is `unknown` (#330).

## 2.1.0

- **`getMediaAt(position)` answers what media a line refers to.** A host that
  wants to show a photograph on hover had only `DocumentLink`, which carries a
  target and says nothing about whether it names an image or which part of one a
  reference points at. The new query answers for one position with the file as
  the document wrote it, how that text is to be read, what the format says the
  file is — `image`, `audio`, `video`, `document` or `unknown` — the caption the
  author gave it, and the rectangle a multimedia link asks for. Both dialects
  answer: GEDCOM 7 reads `FORM` as a media type and `CROP` from the link, and
  5.5.1 reads `FORM` from the closed list its specification permits, including
  the inline form with `FILE` beneath `OBJE`.
- **A rectangle is named only where it can be applied.** GEDCOM 7 puts `CROP` on
  the multimedia _link_, so one group photograph referenced by five people
  carries five different rectangles, and each position answers with its own. A
  rectangle with no extent, one written in 5.5.1 — whose specification describes
  none — and one on a link to a record carrying several files all yield the file
  without a rectangle, so a host shows the whole image rather than nothing.
  Clamping a rectangle to its image stays with whoever holds the file: the extent
  of an image is not knowable from the document.
- `MediaReference`, `MediaCrop` and `MediaKind` are exported. Nothing existing
  changed shape, and `getDocumentLinks` is untouched.

## 2.0.0 - 2026-08-20

Carries `@domorium/validator` 2.0.0, whose `GedcomDocument` this package
re-exports, so the members that version removes are gone from here too.

- **An unresolved pointer offers one replacement, or none, and creation comes
  first.** The quick fixes for an unresolved XREF were the first ten records of the
  required type in index order, related to the failing pointer only by their tag. In
  genealogy that is worse than offering nothing: clicking one attaches a person to a
  family of strangers, the document then validates clean, and nothing points at the
  mistake again. A replacement is now offered only where one candidate is nearer to
  the XREF the author wrote than every other and within two edits of it — `@F145@`
  for `@F1450@` — and nothing is offered where two are equally near. Browsing the
  file's records stays with completion inside `@…@`, which filters as the reader
  types.
- **An offered record is named.** `Replace with @F285@ — Gascoigne / Wardle`. A
  family carries no name of its own, so it is named by its spouses; a record with
  nothing to name it by is offered by its XREF alone. The document outline is
  unchanged.
- **Creating the record the author named is offered first**, and in GEDCOM 7
  `@VOID@` — the pointer the specification provides for a target deliberately left
  out — is offered last. GEDCOM 5.5.1 has no such value and is offered no such
  action.

## 1.5.1 - 2026-08-18

- **A line is read by every terminator 5.5.1 allows.** Splitting on `\r?\n` read a
  document written with CR as one line, so the line under a diagnostic, the line
  being completed, and the line holding `TRLR` were all wrong there. A created
  record is also written with the terminator the file already uses, rather than
  with LF into a file that has none.

## 1.5.0 - 2026-08-15

- **A token is typed by what it is.** A tag is `keyword`, an identifier is
  `variable`, and a payload is `string` — where a tag used to be `string`, an
  identifier `keyword`, and a payload nothing at all, so the text after a tag
  carried no token and no host could colour it. The level stays `comment` for want
  of a truer name: it is the line's structure rather than its content.
  `POINTER` keeps the `declaration` modifier, which is what tells a record's own
  identifier from a reference to it.
- The legend is what an editor's theme is written against, so this changes what a
  file looks like in every host: a tag takes the colour a theme holds for a
  keyword, an identifier the one it holds for a variable, and a payload the one
  for a string.

## 1.4.0 - 2026-08-14

- **A shared note is a record with an identifier, and `detail` now says so.** The
  one declaration that carries a payload on its own line — `0 @N1@ SNOTE text`,
  and `NOTE` in 5.5.1 — read that text as the symbol's `detail`, where every
  other record reads its `@N1@`. Anything looking a record up by what `detail`
  says never found a shared note. The text moves to `label`, beside the name of a
  person and the title of a source.

## 1.3.0 - 2026-08-12

- **A caret touching the end of a token now resolves it.** Placed immediately
  after the closing `@` of a pointer — where it lands after typing one, or after
  `End` — go to definition, find references, rename, hover and completion all
  declined in silence. A position names the boundary between two characters, and
  both edges of a token are on it; GEDCOM puts a space between tokens, so no
  boundary belongs to two.
- **Document symbols carry a label**: the name of a person, the title of a
  source, where the format gives a record one. `name` is still the tag. A host
  building a list of records no longer has to read a `NAME` payload itself.
- **`retargetFileLinks` answers with the edits that point a document at a file
  that moved.** A GEDCOM 7 `FILE` payload is a URI reference and a 5.5.1 one is a
  path, so the same rename is spelled differently in each; `decodeFileTarget` and
  `encodeFileTarget` are that rule alone, for a host resolving a link rather than
  rewriting one — reading a payload raw sent it looking for a file with a percent
  sign in its name.
- `getDocument()` returns the parsed document behind every answer, for a question
  this package does not answer.
- Requires `@domorium/validator` 1.6.0 or newer: a fragment is parsed with the
  option that release adds, and an older one ignores it in silence.

## 1.2.0 - 2026-08-10

- **File links follow the resolved version instead of a version test of their
  own.** Two consequences. `2 VERS  5.5.1`, with a second space after the tag,
  read as GEDCOM 7, so an absolute path — legal in 5.5.1 — stopped being a link;
  it is one again. And a version no schema describes was given GEDCOM 7 path
  rules, so a 4.0 file was told its version cannot be checked against any
  specification and offered file links in the same breath; it now gets none,
  `WWW` included, since that `WWW` means a web address is itself something only
  a specification says.
- The record-creation quick fix reads the same resolution. Nothing reaches it for
  an unsupported version today, because no unresolved reference is reported for
  one, but the fall-through was to the GEDCOM 7 record set.
- New on `GedcomLanguageService`: `getVersionResolution()`, so a host can report
  which version was detected and what was done about it. `VersionResolution` is
  re-exported.
- Requires `@domorium/validator` 1.5.0 or later.

## 1.1.0 - 2026-08-07

- `Hover.contents.kind` is now `"plaintext"` where it was `"markdown"`. This
  narrows a published type, which ordinarily calls for a major version; it is a
  minor here because the old value was never true. Two of the four hosts render
  hover text by assigning it to `textContent`, so markup arrived as literal
  asterisks on screen. Code that compares the field against `"markdown"` will no
  longer type-check — the comparison was already describing something the
  package did not do. Widening it back means answering for those two hosts first.
- Offer at most ten replacements for an unresolved xref. Every host flattens the
  choices into one flat action menu, so a document-sized list of them was a wall
  of UI; completion still offers every xref, filtered as you type.
- Give semantic tokens character offsets and derive line and character only when
  asked, so a caller that works in offsets — every editor adapter does — never
  pays for the conversion.
- Find the occurrence under the cursor by binary search rather than by scanning,
  and read a token's range once when colouring it.
- Requires `@domorium/validator` 1.2.0 or newer: semantic tokens read the
  `startOffset` that release adds.

## 1.0.0 - 2026-08-05

- First stable release. `GedcomLanguageService` and the protocol-shaped types in
  `src/types.ts` are now the package's committed public API: a breaking change to
  them requires a major version.
- No behavioral change from 0.2.0.

## 0.2.0 - 2026-08-03

- Move the package from `@gedcom/language-service` to
  `@domorium/language-service` as part of the Domorium rebrand.
- Replace the validator dependency with `@domorium/validator`.

## 0.1.2 - 2026-07-24

- Move the public package to the `@gedcom/language-service` organization scope.
- Replace the validator dependency with `@gedcom/validator`.

## 0.1.1 - 2026-07-23

- Add schema-aware XREF references and read/write document highlights.
- Add safe, versioned XREF rename with collision, duplicate, and stale-document protection.
- Add HTTP and GEDCOM-version-aware local file links.
- Add narrowly scoped quick fixes for unresolved references and invalid levels.
- Preserve token ranges and unrelated source text in all generated edits.

## 0.1.0 - 2026-07-21

- Initial public release.
- Provide diagnostics, completion, hover, definitions, folding, document symbols, semantic tokens, and indentation for GEDCOM editors.
- Expose editor-independent types without an LSP runtime dependency.

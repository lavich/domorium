# Changelog

All notable changes to `@domorium/language-service` are documented here.

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

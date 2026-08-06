# 0008. Accept extension tags and leave their subtrees unvalidated

- **Status:** Accepted
- **Date:** 2026-08-06

## Context

GEDCOM reserves tags beginning with an underscore for applications to define
their own structures. GEDCOM 5.5.1 permits them with no registration mechanism
at all. GEDCOM 7 adds `HEAD.SCHMA`, whose `TAG` substructures map each extension
tag to a URI that gives it meaning, and expects a document to declare every
extension tag it uses.

The validator had no concept of them. Every `_`-prefixed tag failed the
`substructure` lookup and was reported as `Unknown tag`, including the
`_SKYPEID` and `_JABBERID` tags in FamilySearch's own conformance file
`maximal70.ged`, which declares both in its SCHMA block.

What a URI means is knowable only to whoever minted it. Nothing in the document,
and nothing the validator can fetch, says what payload an extension carries or
what may nest beneath it.

## Decision

Accept any `_`-prefixed tag in any context, with unbounded cardinality, and
validate nothing inside its subtree.

A GEDCOM 7 document that uses an extension tag absent from `HEAD.SCHMA` gets a
warning (`VAL008`) at each occurrence. A GEDCOM 5.5.1 document gets none: that
version has no SCHMA structure, so there is no standard for it to fall short of.
A document whose version cannot be determined is treated as GEDCOM 7, matching
the schema the validator already defaults to.

The declarations themselves are validated: a `TAG` payload must be an
underscore-prefixed tag followed by an absolute URI, and declaring the same tag
twice is a warning (`VAL009`).

## Consequences

Real-world files stop drowning in false positives — every major genealogy
application emits extension tags, and until now each one produced a warning.

The cost is a blind spot with a hard edge. Anything nested under an extension
tag is unvalidated, so a typo like `2 DTAE 1900` inside an extension is silently
accepted, and completion offers nothing there. This is not a gap to be closed
later by trying harder: closing it would require knowing the extension's
definition, which means resolving its URI over the network and trusting what
comes back. That is a different product.

Two diagnostic codes, `VAL008` and `VAL009`, join the committed public surface
described in the `@domorium/validator` 1.0.0 changelog entry, and consumers may
filter on them.

## Alternatives considered

**Synthesise schema entries for declared tags.** On reading SCHMA, write each
declared tag into a cloned schema so validation, hover and completion work with
no special cases. Rejected: an extension tag is legal in any context, so the
entry would have to be injected into every one of roughly five hundred
`substructure` records, and the clone would be rebuilt on every keystroke.
`g7validation.json` is an imported singleton and must not be mutated. And
undeclared tags would still need a separate branch.

**Warn on every undeclared extension tag regardless of version.** Rejected: it
would fire on essentially every GEDCOM 5.5.1 file in existence, where such tags
are unconditionally legal, and a warning that is always wrong trains people to
ignore warnings.

**Accept all extension tags silently.** Rejected: it discards the one piece of
machine-readable information GEDCOM 7 offers about extensions, and with it the
URI that makes hover useful and the list that makes completion possible.

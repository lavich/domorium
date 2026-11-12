## Why

The Obsidian plugin's media editor (lavich/domorium-obsidian#260) chooses a medium's `FILE`
from the vault and updates its `FORM` in the same edit, through the structure edits of #522 /
#529. Issue #531 reports two answers of the service that such an editor cannot build on.

`setValue` on a 7.0 `1 FILE media/a.jpg` writes `../outside/b.jpg` with no refusal and no
warning. The value is written as given (`escapePayload` touches only `text`,
`packages/validator/src/payload/escape.ts:11`), and the validator reads `type-FilePath` as a
plain string (`packages/validator/src/validator/rule-node.ts:222`). Yet the service itself
reads such a payload as no file at all: `gedcom7LocalFileKind` rejects a leading `/`, and
`\`, `?`, `#`, `:` or a `..` segment anywhere
(`packages/language-service/src/libs/links/documentLinks.ts:83-95`), and `moveFileLinks`
refuses to write a target that does not read back that way, with `unwritable-file-target`
(`packages/language-service/src/libs/links/retargetFileLinks.ts:94-101`). Two operations of
one service disagree on what a 7.0 `FILE` may hold, and the plugin keeps a rule of its own
(`file-out-of-reach`) to cover the gap.

In 5.5.1, `FORM` is the closed set `[bmp gif jpg ole pcx tif wav]`
(`g551validation.json:1340`, compared without case, `rule-node.ts:96`), and `png` is a
`VAL005` error. Since 5.5.1 requires a `FORM` beneath a `FILE`, an editor on top of the
service cannot attach a PNG, PDF or MP4 to a 5.5.1 medium at all, though exports in the wild
(Gramps, MyHeritage, Ancestry, Ancestris) write those forms routinely: the vendor corpus
records `png ×10` and `pdf ×2` in the Ancestris export alone (`vendor-ancestris11-export.ged`) (`scripts/vendor-corpus.json`).

## What Changes

- `setValue`, `addStructure` (children included) and `validateValue` refuse a GEDCOM 7
  `FILE` (or `TRAN` beneath it) payload that names a local path the service cannot read as a file, with a code of
  their own, `file-target-unsupported`, and the facts in `data`. The validator answers it,
  for a value about to be written only, as `VAL020`. A URL keeps being written as before, and
  5.5.1, whose paths may climb with `..`, is untouched.
- The local-path rule moves from `language-service` into `validator`, which both the check
  and `documentLinks` then read, so the two answers cannot drift. The value is taken as GEDCOM
  spells it; a host holding a plain path escapes it with `encodeFileTarget` first.
- In 5.5.1, a `FORM` outside the standard's set that is a known file extension (`png`,
  `jpeg`, `pdf`, `mp4`, …) is a warning with a code of its own, `VAL021`, in every document
  and in `checkPayload`, rather than the `VAL005` error. A value that is no known extension
  (`nonsense`, a misspelling) stays `VAL005`. The table of known extensions moves from
  `language-service` into `validator` as a set, and `language-service` keeps the kinds and a
  test that the two agree.
- The description of an enumeration that tolerates file extensions says so, beside its
  permitted values.

The user's decisions, 2026-11-12, on the two options put for each point of #531:

- `FILE`: "Только редактирование (Recommended)" — refuse in `setValue`, `addStructure` and
  `validateValue` only; no diagnostic for a file that already holds such a path.
- 5.5.1 `FORM`: "Предупреждение (Recommended)" — a known file extension outside the list is
  written with a warning of a code of its own; a misspelling stays a refusal; the vendor
  corpus is re-recorded.

### Out of scope

A diagnostic for a 7.0 `FILE` already in a file; a percent-escaped dot, separator or colon
such as `%2E%2E/x.jpg`; the 5.5.1 values `moveFileLinks` refuses and `setValue` keeps writing
(`@`, surrounding spaces); reading a tolerated 5.5.1 form in the media kind; checking that a URL is well formed (the
TODO item "Web link validation"), and offering the nearest permitted form.

## Capabilities

### New Capabilities

- `validator/media-form`: a 5.5.1 `FORM` that is a known file extension outside the
  standard's set is a warning of its own, and a misspelt one stays an error.

### Modified Capabilities

- `language-service/structure-edit`: `file-target-unsupported` joins the refusals and the
  checks of `validateValue`; a `FILE` or `TRAN` path the dialect cannot carry is refused; a
  tolerated 5.5.1 form is written with a warning.
- `validator/diagnostic-facts`: `VAL020` and `VAL021` carry their facts in `data`.
- `validator/structure-schema`: an enumeration reports that it tolerates file extensions.

## Impact

- Layers: `validator` (`checkPayload`, the enumeration check, the description of an
  enumeration, the local-path rule and the set of known extensions, now exported, and
  `pathProblem` in `GedcomError.data`) and
  `language-service` (`setValue`, `addStructure`, `validateValue`, `documentLinks` and
  `DiagnosticData` gaining `pathProblem`). The dependency direction still points down.
- Hosts: every host shows a 5.5.1 `FORM png` as a warning, `VAL021`, where it showed an
  error — VS Code and JetBrains through the language server, the web editor through
  `codemirror`, the Obsidian plugin. The `FILE` refusal reaches only callers of the
  structure edits, which no host in this repository is; the Obsidian plugin is one.
- `EditRefusalCode` widens by `file-target-unsupported`; `PayloadKind`'s enumeration gains
  an optional field. `npm run check:conformance` is re-recorded for the vendor corpus. No
  version of any package is decided here.

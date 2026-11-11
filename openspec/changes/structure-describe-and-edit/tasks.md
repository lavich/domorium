## 1. Validator

- [x] 1.1 Add to `GedcomDocument` the read of the fields of a node, of a tag beneath a
      node, and of a schema path (tag, min and max with `parseCardinality`, payload kind
      from the closed list including the 5.5.1 text-or-pointer kind and none, enum values,
      pointer target, and whether the payload is required by the rule behind `VAL003`),
      keyed on "validated against a dialect", not on `getDialect()`; export its types and
      verify with unit tests for each scenario of the `structure-schema` spec in both
      dialects, including an `INDI` with no `NAME`, the path `INDI.NAME.TRAN`, and a
      fragment document given a dialect by its options
- [x] 1.2 Add to `GedcomDocument` the check of one payload for a field (the rules that
      depend on the value and the field alone, and cardinality against a count of
      occurrences the caller gives) without parsing the document; verify with a test per
      rule of the `validateValue` requirement; the work includes a synthetic node for one
      payload and lifting the unknown-tag, cardinality and sibling-count logic out of the
      validator's loop into a function shared with the validator itself; if the check cannot
      run on a payload alone, stop and revise `design.md` before 3.6
- [x] 1.3 Add the escape and the unescape of a text payload by dialect, none for a pointer,
      a date or a date period, exported from `validator`; check the 5.5.1 and 7.0 rules
      (every `@` against a leading `@`, and whether 7.0 escapes each continuation line)
      against the standards and the conformance corpora, and verify with the scenarios of
      the escape requirement, including `@S1@` and `@#DJULIAN@ 3 MAR 1721`
- [x] 1.4 Rebuild `validator` and verify the language service resolves the new exports from
      `dist`

## 2. Language service: description

- [x] 2.1 Add a locator from a position to the innermost structure (a value, a level, a
      `CONT` line map to their structure) by offset, and `describeStructure`: field ids as
      tag paths with the schema identifier beside, payload detail, occurrences with line and
      subtree ranges and values read through the unescape, undefined and extension tags
      listed apart, pointer candidates with `recordLabel` cached per parse, the reciprocal
      mark; verify with tests for each scenario of the `structure-description` spec,
      including a position on no structure and a document with no dialect
- [x] 2.2 Add `describeSchemaPath` over the same field shape and verify with the two
      scenarios of its requirement in both dialects

## 3. Language service: edits

- [x] 3.1 Add the value writer (`CONT`, `CONC` in 5.5.1 only past 255 characters, never
      splitting an escaped `@` or a surrogate pair or leaving a space at a split, escaping
      by kind through the validator) and verify by round-tripping through the writer and the
      description in both dialects: a value with a line break, an at sign, a pointer, a
      5.5.1 calendar date, 300 characters, and a text-or-pointer field given each way
- [x] 3.2 Add `addStructure`, `setValue` and `removeStructure` with placement, line
      terminator, edits that touch only their own lines, a value with continuation lines
      replaced together, `record-edit-unsupported`, and `stale-document`, `not-a-structure` and `no-dialect`; verify with the
      scenarios of the `structure-edit` spec: first name, second name, change one part,
      change a value with continuation lines, remove the last part, delete a name with
      notes, custom `_TAG`, `\r\n`, no final terminator, a record, stale version, in both
      dialects
- [x] 3.3 Add the revalidation check: a diagnostic on a line the edit writes is new, one
      elsewhere in the structure is new when the count of its code has grown, a structure
      beneath `HEAD` is compared over the document; new errors and unknown tags refuse
      with the mapped code or `rule-violation` and `diagnosticCode`, warnings and
      information return beside the edit; widen `EditRefusalCode`, add `diagnosticCode` and
      `StructureEditResult`; verify with a test per code the validator can produce in the
      table, a warning that passes, an old error with an unrelated edit, a third `GIVN`, a
      bad value replaced by another bad value, `31 FEB` in both dialects, removing `LANG` of
      a 7.0 `NAME.TRAN`, and adding a `NICK` to a `TRAN` that already lacks `LANG`
- [x] 3.4 Add the policy registry and the `INDI.NAME` entry; verify with the four
      scenarios of the name-payload requirement and a name added with parts
- [x] 3.5 Add the list of reciprocal pairs to the registry after reading the scheme for any
      pointer between records of different types (including the `FAMC` of events), refuse
      every operation on them, and on a structure holding one, with
      `reciprocal-pointer-unsupported`, and verify with the scenarios of the reciprocal
      requirement
- [x] 3.6 Add `validateValue` over the validator check of 1.2 and verify with the scenarios
      of its requirement and a test that the same values give the same codes through
      `validateValue` and through `addStructure`

## 4. Documentation and gate

- [x] 4.1 Export the new types and methods from the `language-service` index and from
      `validator`, document them in the `language-service` README with a usage example for
      a name form that states the order the caller keeps (update the service, describe,
      edit, and describe again after a `stale-document` refusal, since a live editor
      changes under an open form) and in the `validator` README (what a document answers), update the
      language-service feature list in `docs/architecture.md`, and verify with
      `npm run check:docs`
- [x] 4.2 Time `describeStructure` and `addStructure` on the large document of the timing
      tests and record the figures in the PR
- [x] 4.3 Run `npm run check` and record whether `check:jetbrains` ran or was skipped for
      lack of a JDK

## 5. Revision after #524

- [x] 5.1 Report `lineBreaks` and `prose` for every field in `validator` (7.0 by the Text
      datatype, 5.5.1 by the list of types its grammar continues), make `checkPayload`
      report a line break where `lineBreaks` is false as `VAL004`, and verify with the
      scenarios of the line-break requirement of `structure-schema` and a `checkPayload` test
- [x] 5.2 Pass both through the description, refuse a line break where the value may not
      hold one in `addStructure` (children included) and `setValue`, and verify with the
      scenarios of the line-break requirement of `structure-edit` in both dialects
- [x] 5.3 Take an emptied `GIVN` or `SURN` out of the `NAME` payload and verify with the two
      scenarios of the name-payload requirement
- [x] 5.4 Describe an extension line and a line beneath it, and verify with the two
      scenarios of the extension requirement of `structure-description`
- [x] 5.5 Update both READMEs, rebuild, run `npm run check`, and record whether
      `check:jetbrains` ran

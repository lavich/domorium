## 1. Validator

- [ ] 1.1 Answer the root type for an empty path in `typeAtPath`, and add to `checkPayload`
      `VAL018` (`ValueNotAllowed`, `{ tag }`, keyed on a `null` payload type, the 5.5.1
      family `EVEN` exempted) and `VAL019` (`EmptyStructure`, `{ tag }`, an empty value on a
      7.0 record that takes one and holds only continuation lines); verify with tests for a
      `MAP`, an `INDI` record, `TRLR` with an empty value, a 7.0 `SNOTE` record with and
      without a child, a 5.5.1 family `EVEN`, and the two scenarios of the
      `diagnostic-facts` delta
- [ ] 1.2 Verify that `getDiagnostics` of a file holding `3 MAP oops` and of one holding an
      empty `0 @N1@ SNOTE` is unchanged, and that `npm run check:conformance` is as recorded
- [ ] 1.3 Add `VAL018` and `VAL019` to the code table and the facts table of the validator
      README, and rebuild `validator`

## 2. Language service

- [ ] 2.1 Map `VAL018` to `value-not-allowed` and `VAL019` to `value-required` in
      `refusalCodes.ts`, and add `value-not-allowed` to `EditRefusalCode`
- [ ] 2.2 `setValue` at a record's opening line through the record's own shape, the head
      written with its identifier, continuation lines replaced, other children kept, the
      record as the revalidation scope, no name policy; verify with the scenarios of "The
      value of a record's opening line can be set", the unknown-tag record included
- [ ] 2.3 Refuse from the `checkPayload` answer in `setValue` and `addStructure` (children
      included) for `VAL018` and `VAL019`; verify with the scenarios of "A value is refused
      where the structure takes none" and "An emptied record keeps a value or a
      substructure", and that the emptied 7.0 `GIVN` tests of #524 still pass
- [ ] 2.4 `validateValue` with `replacing` at a record's opening line; verify with the
      scenarios added to "A value can be checked without an edit", the `MAP` one included
- [ ] 2.5 Split the test that refuses `setValue` and `removeStructure` at a record: `setValue`
      now writes, `removeStructure` still refuses with `record-edit-unsupported`

## 3. Documentation and gate

- [ ] 3.1 Update the `language-service` README (record values, `value-not-allowed`, the
      emptied-record rule, the `SCHMA` alias gap) and verify with `npm run check:docs`
- [ ] 3.2 Run `npm run check` and record whether `check:jetbrains` ran

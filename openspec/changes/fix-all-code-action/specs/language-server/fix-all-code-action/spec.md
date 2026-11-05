## ADDED Requirements

### Requirement: The server declares and answers source.fixAll

The server SHALL declare `source.fixAll` among its `codeActionKinds`, and SHALL answer a
code action request with the service's fix-all action as a code action of that kind, whose
edit carries the document version, with no diagnostics attached.

#### Scenario: Fix on save

- **WHEN** a client asks for code actions with `only: ["source.fixAll"]` over a document
  with no trailer and no header
- **THEN** it receives one action of kind `source.fixAll` and no `quickfix`
- **AND** its edit adds the header and the trailer

### Requirement: The only filter selects the actions

A kind in `context.only` SHALL match a kind equal to it or beginning with it and a dot.
The server SHALL return `quickfix` actions only when `only` is absent or matches
`quickfix`, and the fix-all action only when `only` matches `source.fixAll`, or when
`only` is absent and the request's diagnostics include one that fix-all would fix.

#### Scenario: Only quick fixes

- **WHEN** the request has `only: ["quickfix"]`
- **THEN** no `source.fixAll` action is returned and the fix-all is not computed

#### Scenario: The parent kind

- **WHEN** the request has `only: ["source"]`
- **THEN** the fix-all action is returned

#### Scenario: A lightbulb on a line with a fixable problem

- **WHEN** the request has no `only` and names a missing-trailer diagnostic
- **THEN** the quick fix **Add trailer** and the fix-all action are both returned

#### Scenario: A lightbulb elsewhere

- **WHEN** the request has no `only` and names only an unresolved pointer
- **THEN** no fix-all action is returned

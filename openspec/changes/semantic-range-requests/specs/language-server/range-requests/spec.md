## Purpose

Bounding the inlay hints and semantic tokens the language server builds to the part of a document a client asks about, and offering each client the semantic token requests it declared it can make.

## ADDED Requirements

### Requirement: Inlay hints are built for the requested range

The server SHALL answer `textDocument/inlayHint` with the hints of the level-0 records that overlap the request's range, and SHALL NOT build hints for any other record. A record that overlaps the range SHALL be answered whole, including lines outside the range.

The scenarios below use this document, lines numbered from 0:

```text
0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 1 JAN 1900
0 @I2@ INDI
1 NAME Jane /Doe/
0 TRLR
```

#### Scenario: A range over one record

- **WHEN** inlay hints are asked for lines 7 to 8
- **THEN** the only hint is the one on line 8

#### Scenario: A range inside a larger record

- **WHEN** inlay hints are asked for line 5 alone
- **THEN** the hints are those on lines 4, 5 and 6, the whole of `@I1@`

#### Scenario: A range over the whole document

- **WHEN** inlay hints are asked from the start of line 0 to the end of line 9, as LSP4IJ asks
- **THEN** the hints are those on lines 1, 2, 4, 5, 6 and 8, as when the range was ignored

### Requirement: Semantic tokens are offered by range to a client that can ask by range

In its `initialize` result the server SHALL offer `semanticTokensProvider` with `range: true` and without `full` when the client declared `textDocument.semanticTokens.requests.range` as `true` or as an object. Otherwise it SHALL offer `full: true` and `range: false`. The legend SHALL be the same in both.

#### Scenario: A client that can ask by range

- **WHEN** a client that declared semantic token requests `{ range: true, full: { delta: true } }` initializes, as VS Code does
- **THEN** the server offers `range: true` and does not offer `full`

#### Scenario: A client that can ask only for the whole document

- **WHEN** a client that declared semantic token requests `{ range: false, full: true }` initializes, as LSP4IJ does
- **THEN** the server offers `full: true` and `range: false`

#### Scenario: A client that declared nothing

- **WHEN** a client that declared no capabilities initializes
- **THEN** the server offers `full: true` and `range: false`

### Requirement: Semantic tokens are built for the range asked

The server SHALL answer `textDocument/semanticTokens/range` with the tokens of the level-0 records that overlap the request's range, and SHALL NOT build tokens for any other record. It SHALL answer `textDocument/semanticTokens/full` with the tokens of the whole document, whichever requests it offered.

#### Scenario: A range request

- **WHEN** semantic tokens are asked for lines 7 to 8 of the document above
- **THEN** every token is on line 7 or 8, and both lines have tokens

#### Scenario: A full request

- **WHEN** semantic tokens are asked for the whole document above
- **THEN** every line from 0 to 9 has tokens, as before this change

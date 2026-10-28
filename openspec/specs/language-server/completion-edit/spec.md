# language-server/completion-edit Specification

## Purpose

Sending each completion item's replacement to an LSP client in the form the client declared it understands: an insert-and-replace edit when it supports one, a plain text edit otherwise.

## Requirements

### Requirement: A completion reaches the client with the range the service states

The server SHALL send each completion item with the service's `textEdit`. When the client declared `textDocument.completion.completionItem.insertReplaceSupport` in `initialize`, it SHALL send an `InsertReplaceEdit` with the service's `insert` and `replace`; otherwise it SHALL send a `TextEdit` whose range is the service's `replace`.

#### Scenario: A client with insert-replace support

- **WHEN** a client that declared `insertReplaceSupport` asks for completions at the end of `1 HUSB @I`
- **THEN** the item `@I1@` carries a `textEdit` with `newText` `@I1@` and `insert` and `replace` both covering `@I`

#### Scenario: A client without it

- **WHEN** a client that did not declare `insertReplaceSupport` asks for completions between `@I` and `1@` in `1 HUSB @I1@`
- **THEN** the item `@I2@` carries a `textEdit` with `newText` `@I2@` and a `range` covering `@I1@`

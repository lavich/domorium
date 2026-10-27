## Why

The GEDCOM lexer's mode stack grows by one to two frames per line and is never
unwound until `tokenize` returns (#80): 3.56 million frames on a 50 MB export,
an estimated tens of megabytes of peak memory during the lex, on exactly the
large files this project aims to keep workable. Nobody put that linear term
there on purpose.

## What Changes

- Every line leaves the lexer in its `main` mode with nothing above it: the
  stack is never deeper than two frames, whatever the length of the document.
- The tokens the lexer produces — types, images, offsets, lines, columns and
  errors — are unchanged for every input.
- A test guards the depth through the lexer's mode-handling hook, without
  patching the library.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No observable behaviour changes: the stack depth is internal, and the
token stream is the same. The change sets `skip_specs`.

## Impact

- Layers: `@domorium/validator` only (`src/parser/lexer.ts`). Every consumer
  above it is unaffected.
- Hosts: none see a difference beyond lower peak memory on large files.
- Release: a patch of `@domorium/validator` with a changelog entry, when
  released.

# language-service/record-preview Specification

## Purpose

Answers the question "what does this pointer point at" once, in the shared layer,
so that every host — whether it embeds CodeMirror or speaks LSP — can show the
reader the record an XREF names without computing the answer itself.

## Requirements

### Requirement: The record a pointer names is answered from the shared layer

`@domorium/language-service` SHALL answer, for a position in the document, the
record that the pointer at that position names: the range the record occupies, the
range of the pointer itself, and whether the record was cut short.

The answer SHALL contain no editor type. It is expressed in the positions and
ranges the package already uses, so a host that has never heard of CodeMirror can
consume it.

The caller SHALL state how many lines it is able to show, and the answer SHALL be
cut to that many lines, reporting that it was cut.

#### Scenario: A pointer whose target exists

- **WHEN** the position is on a pointer and the record it names is declared
  elsewhere in the document
- **THEN** the answer names the range from the start of the record's declaration
  through the end of the last line the caller can show, together with the range of
  the pointer

#### Scenario: A record longer than the caller can show

- **WHEN** the record extends past the number of lines the caller stated
- **THEN** the answer is cut to that many lines and says that it was cut

#### Scenario: A record that fits

- **WHEN** the record ends within the number of lines the caller stated
- **THEN** the answer covers the whole record and says it was not cut

#### Scenario: A pointer with nothing to point at

- **WHEN** the position is on a pointer whose target is not declared anywhere in
  the document
- **THEN** there is no answer

#### Scenario: A pointer whose target is already in view

- **WHEN** the position is on a pointer declared on the same line as the record it
  names
- **THEN** there is no answer, because showing the reader the line they are
  already pointing at tells them nothing

#### Scenario: A position that is not on a pointer

- **WHEN** the position is on a tag, a value, or a level number
- **THEN** there is no answer

### Requirement: An LSP host shows the record on hover

Where the hovered position is on a pointer, the language server SHALL send the text
of the record that pointer names, so that VS Code and a JetBrains IDE show it
without either plugin implementing the feature.

Where the hovered position is not on a pointer, the server SHALL keep sending what
it sends today — the documentation for the tag under the cursor.

#### Scenario: Hovering a pointer in an LSP host

- **WHEN** the reader hovers an XREF whose record is declared elsewhere in the file
- **THEN** the hover shows the text of that record, marked up so the host renders
  it as a block of GEDCOM rather than as prose

#### Scenario: Hovering a tag in an LSP host

- **WHEN** the reader hovers a tag
- **THEN** the hover shows the tag's documentation, unchanged from before this
  capability existed

#### Scenario: Hovering a pointer that resolves to nothing

- **WHEN** the reader hovers an XREF whose target is not declared in the file
- **THEN** the hover does not claim a record, and whatever the tag hover would have
  said is what is shown

### Requirement: Markup is the adapter's decision, not the shared layer's

The hover that `@domorium/language-service` returns SHALL remain plain text.
Turning a record into markup for a host that renders markup SHALL happen in the
adapter that speaks to that host.

A CodeMirror host renders hover contents as text; markup emitted below the adapter
would reach the reader as its own source. This requirement is what keeps that from
recurring.

#### Scenario: The shared layer is asked for a hover

- **WHEN** any caller asks `@domorium/language-service` for the hover at a position
- **THEN** the contents it returns are plain text, carrying no markup for a host to
  interpret

### Requirement: The CodeMirror hosts keep the preview they have

The Obsidian plugin and the web editor SHALL show the same preview, for the same
document and the same position, as they showed before this capability existed —
including the colouring of the record by semantic token, which remains the
CodeMirror layer's work.

#### Scenario: The same document and position in a CodeMirror host

- **WHEN** a reader in the Obsidian plugin or the web editor points at a pointer
- **THEN** the preview shown is the same record, cut at the same line, coloured the
  same way as before

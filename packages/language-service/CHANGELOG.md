# Changelog

All notable changes to `@domorium/language-service` are documented here.

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

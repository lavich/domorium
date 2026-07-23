# Changelog

All notable changes to `@domorium/validator` are documented here.

## 0.1.2 - 2026-07-23

- Expose schema-aware pointer target metadata for editor features.
- Distinguish valid GEDCOM record declarations from nested structures and header/trailer lines.
- Expose the AST-detected GEDCOM version to downstream language tooling.

## 0.1.1 - 2026-07-21

- Upgrade to Chevrotain 12 to remove vulnerable `lodash-es` runtime dependencies.
- Require Node.js 22 or newer when using the package directly in Node.js.

## 0.1.0 - 2026-07-21

- Initial public release.
- Parse GEDCOM 5.5.1 and GEDCOM 7 documents into an AST.
- Validate structure, cardinality, payloads, and references.
- Provide completion data for GEDCOM-aware editors.

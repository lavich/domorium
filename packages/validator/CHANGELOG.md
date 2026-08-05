# Changelog

All notable changes to `@domorium/validator` are documented here.

## 1.0.0 - 2026-08-05

- First stable release. `GedcomDocument` and the diagnostic shapes it returns are
  now the package's committed public API: a breaking change to them requires a
  major version.
- No behavioral change from 0.2.0.

## 0.2.0 - 2026-08-03

- Move the package from `@gedcom/validator` to `@domorium/validator` as part of
  the Domorium rebrand.
- Add the FamilySearch GEDCOM specification notice to the published package.

## 0.1.3 - 2026-07-24

- Move the public package to the `@gedcom/validator` organization scope.
- Update repository metadata and documentation for the GEDCOM project.

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

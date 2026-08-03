# 0006. Use Domorium as the product identity

- Status: Accepted
- Date: 2026-08-03

## Context

The project was published under names derived directly from GEDCOM: the
`@gedcom` npm scope, GEDCOM-only Marketplace names, and repositories named
`gedcom` and `gedcom-obsidian`. GEDCOM is the format the software supports, but
using it as the whole product identity makes the independent project difficult
to distinguish from the specification and its steward.

The editor integrations and shared libraries also form one product family. A
stable umbrella name is needed for current tools and future genealogy features
that may extend beyond source-file editing.

## Decision

Use **Domorium** as the product and publisher identity, with GEDCOM retained as
the descriptive name of the supported format.

- Publish shared packages under `@domorium`.
- Use `domorium.gedcom` for the VS Code and JetBrains plugin identities.
- Use `domorium-gedcom` for the Obsidian plugin identity.
- Use `lavich/domorium` and `lavich/domorium-obsidian` for the repositories.
- Present editor products as **Domorium — GEDCOM Tools**.
- Keep format-specific API names such as `GedcomDocument`,
  `GedcomLanguageService`, and the `gedcom` editor language identifier.

The project must identify itself as independent from FamilySearch and retain
the notices required by specification-derived material.

## Consequences

The new npm scopes and Marketplace identifiers are new distribution identities.
Existing packages and plugins cannot provide an ordinary in-place update; their
old listings need deprecation or migration notices when the new releases are
published.

Consumers must replace `@gedcom/*` dependencies with `@domorium/*`. Source API
names do not change, because they describe the GEDCOM format rather than the
former product branding.

## Alternatives considered

**Keep GEDCOM as the product name.** Rejected because it remains difficult to
distinguish the project from the format and can imply an official relationship.

**Rename format-specific APIs to Domorium.** Rejected because names such as
`DomoriumDocument` would obscure the actual data format and create unnecessary
API churn.

# 0007. Present editor products as GEDCOM

- Status: Accepted
- Date: 2026-08-04
- Supersedes: [0006](0006-domorium-product-identity.md) for editor display names

## Context

ADR 0006 established Domorium as the stable identity for repositories,
publishers, package scopes, and Marketplace IDs. It also prescribed
**Domorium — GEDCOM Tools** as the display name for editor integrations.

People discover editor support by searching for the language or format they
need. A brand-first display name makes the supported GEDCOM format less
immediate, while the publisher, identifier, description, and visual identity
already provide space for the Domorium brand.

## Decision

Present the VS Code, JetBrains, and Obsidian editor products as **GEDCOM**.
Describe them as "GEDCOM language support by Domorium."

Domorium remains the ecosystem and publisher identity. Keep the permanent IDs
`domorium.gedcom` for VS Code and JetBrains, `domorium` for Obsidian, the
`@domorium` npm scope, and the `lavich/domorium*` repositories unchanged.

## Consequences

Legacy Marketplace listings that already use **GEDCOM** must first be renamed
and marked as legacy. Existing users then receive an explicit migration path to
the Domorium-owned IDs without destroying installation history.

Repository-level documentation may lead with Domorium when discussing the
whole ecosystem. Platform-specific documentation leads with GEDCOM and credits
Domorium as its publisher.

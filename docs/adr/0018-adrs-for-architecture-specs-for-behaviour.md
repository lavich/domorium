# 0018. Keep ADRs for architecture; a behaviour contract lives in its OpenSpec spec

- **Status:** Accepted
- **Date:** 2026-10-27
- Supersedes: [0001](0001-record-architecture-decisions.md) for the bar a record
  must clear, and [0002](0002-documentation-in-repository.md) for where a
  behaviour decision and its rejected alternatives are kept

## Context

ADR-0001 sets the bar for a record at reversal cost: anything expensive to undo
belongs in `docs/adr/`. ADR-0002 makes plans and designs temporary, so reasoning
that outlives a task had nowhere durable to go but an ADR.

Since then every change has gone through OpenSpec, and its artefacts are not
temporary. A change's proposal, design and tasks are committed with the work and
kept under `openspec/changes/archive/` once it lands; its requirements are merged
into `openspec/specs/<capability>/spec.md`, which states with scenarios what the
system does and is updated by every later change that touches it.

A public API's behaviour is expensive to reverse — consumers come to rely on it —
so under ADR-0001's bar every such change also needs an ADR. That record repeats
what the spec states as a requirement and what the design states as reasoning,
and it is the one of the three that is never updated: a later change edits the
spec and leaves the record describing the old contract until someone supersedes
it.

## Decision

An ADR records a decision about the shape of the project, not about what one
part of it does: package boundaries and dependency direction, protocols and file
formats, release topology and publishing, toolchain and dependency commitments,
and how the project itself is worked on.

A decision about behaviour — what a public API answers, what a diagnostic
reports, what a host shows — is kept in OpenSpec, however expensive it is to
reverse: the requirement and its scenarios in the capability's spec, and the
reasoning and rejected alternatives in the change's `design.md`, which stays in
the archive. A design that would otherwise prompt an ADR says in one line where
the contract lives instead.

Where a behaviour decision also moves a boundary, adds a format or changes how
something is released, that part is an ADR as before.

## Consequences

- A behaviour contract has one durable home that later changes keep current,
  instead of a spec and a record that drift apart.
- The rejected alternatives of a behaviour decision are found in the archived
  change that made it, not in `docs/adr/`. A reader looking for why an API
  behaves as it does starts from the spec and its change history.
- `docs/adr/` gets fewer, larger records, and the boundary between the two homes
  is a judgement: a contract that constrains how packages relate is
  architecture, even if it reads like behaviour.
- `AGENTS.md`, `CONTRIBUTING.md`, `openspec/config.yaml`, the docs-sync prompt,
  the feature-flow skill and this directory's index state the new bar.

## Alternatives considered

- **Keep the reversal-cost bar.** Every public-API change then carries an ADR
  that repeats its spec and goes stale when the spec moves on.
- **Drop ADRs and keep everything in OpenSpec.** Architecture decisions are not
  capabilities: a package boundary or a release mechanism has no scenarios a
  spec can state, and those records are the ones a new contributor reads first.
- **Write ADRs for behaviour but let them be edited.** Gives up the immutability
  ADR-0001 relies on for history, and still keeps two copies of one contract.

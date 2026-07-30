# 0003. Publish shared packages independently via OIDC Trusted Publishing

- **Status:** Accepted
- **Date:** 2026-07-21, recorded 2026-07-30

## Context

This record was reconstructed from a design document that was deleted when the
work shipped (`docs/superpowers/specs/2026-07-21-npm-package-publishing-design.md`,
recoverable as `git show 18cf461:<path>`). The decisions below are in force in the
repository today; only their rationale was missing. Details that were specific to
the one-time rollout are deliberately not carried over.

The standalone Obsidian plugin lives in its own repository and originally carried
copied sources of the shared validator and language-service workspaces. Copied
source has no version boundary: a fix in this repository reached the plugin only
by another copy, divergence was invisible, and neither side could state which
revision of the shared logic it was built against.

Two shared libraries are genuinely reusable outside this repository — the parser
and validator, and the editor-independent language features. The LSP adapter is
not: it exists to bridge one specific protocol to specific editor hosts.

Publishing to a registry requires publish credentials in CI, which is where the
security question enters: a long-lived registry token stored as a repository
secret is a standing credential that can be exfiltrated and used from anywhere.

At the time of the decision the packages were scoped `@domorium/*`. They were later
renamed to `@gedcom/*`; the scope name is not part of this decision.

## Decision

Publish the two reusable libraries as public npm packages, and have the Obsidian
repository consume them as ordinary versioned dependencies instead of copying
source.

**Independent versioning.** Each package carries its own semantic version, its own
changelog, and its own release tag family (`validator-v*.*.*`,
`language-service-v*.*.*`). The language service declares a compatible released
range of the validator. npm workspaces continue to link the packages locally
during development, so the monorepo workflow is unaffected. Below `1.0.0`,
consumers pin a minor range such as `^0.1.0` and breaking changes raise the minor
version.

**The LSP adapter stays internal.** It is a transport adapter, not a reusable
library, and is consumed only inside this repository.

**OIDC Trusted Publishing, no stored token.** Each release workflow authenticates
to npm through GitHub Actions OIDC with `id-token: write`, which also produces
provenance automatically. No long-lived npm publishing token exists in repository
secrets.

**The workflow refuses to publish a release it cannot verify.** Before publishing
it checks that the git tag version matches the selected package's `package.json`
version exactly, installs from the lock file, runs lint, typecheck and tests,
builds the package with its workspace dependencies, and inspects the result with
`npm pack --dry-run` so only intended files ship. Any mismatch or failure stops
the run before it reaches the registry.

**Library releases never trigger a plugin release.** The Obsidian repository keeps
its own version, changelog, tag, and release workflow. Dependabot opens weekly
dependency update pull requests there; they are not merged or released
automatically, and its CI must pass typecheck, tests, and a production bundle
first.

## Consequences

The Obsidian plugin — and any other consumer — builds against a named version
rather than a snapshot of copied files, and `package-lock.json` pins the whole
resolved graph, so its builds are reproducible.

There is no publish credential to steal. A compromised repository secret cannot be
used to publish, because there is no such secret; provenance lets consumers verify
that a published artifact came from this repository's workflow.

The costs are the ones inherent to registry publishing. A release is now a
deliberate act with a tag, a version bump, and a changelog entry, rather than a
copy. npm versions are immutable, so a bad release is corrected by publishing a
new version, never by overwriting. And a change that spans a library and the
plugin now takes two releases in order, which is slower than editing copied source
but is the property that makes the boundary real.

Independent versions mean the compatibility range in the language service has to
be maintained deliberately whenever its minimum validator version changes.
Nothing enforces this automatically.

## Alternatives considered

**Keep copying source into the Obsidian repository.** No registry, no release
process, no version negotiation. Rejected because it was the status quo and had
already produced the problem: no version boundary, invisible divergence, and no
way for either repository to state what it was built against.

**A long-lived npm token in repository secrets.** The conventional setup, and
simpler to configure than OIDC. Rejected because it is a standing credential
usable from anywhere by anyone who obtains it, where OIDC issues a short-lived
identity scoped to the workflow run and yields provenance as a side effect.

**One version for all packages, released together.** Simpler to reason about, and
common in monorepos. Rejected because it forces meaningless version bumps on a
package that did not change, and makes a consumer that needs only the parser
absorb the release cadence of everything else.

**Git submodules, git dependencies, or GitHub Packages.** Avoid the public
registry. Rejected because none of them offer semver resolution to an external
consumer the way npm does, and the public registry is where a genealogy-tooling
library is actually discoverable.

**Publish the LSP adapter too, for symmetry.** Rejected: it has no consumer
outside this repository, and publishing it would create a compatibility surface
to maintain for no benefit.

# 0005. Keep the Obsidian plugin in its own repository

- **Status:** Accepted
- **Date:** recorded 2026-07-30, decided earlier

## Context

This record was written after the fact; the decision is in force and visible in the
root README, which points at
[lavich/gedcom-obsidian](https://github.com/lavich/gedcom-obsidian) as a separately
released plugin.

The Obsidian plugin is an editor host like the VS Code extension and the JetBrains
plugin, and those two live in this repository as `apps/*`. The question was whether
Obsidian should join them.

Obsidian differs from the other hosts in ways that are not about GEDCOM. It has its
own release channel with a community plugin review process, its own manifest and
versioning expectations, a mobile target, and a plugin API that changes on its own
schedule. Its build produces a plugin bundle, not a language server or a marketplace
package.

The plugin originally carried copied sources of the shared packages, which is the
problem [0003](0003-independent-package-publishing.md) addressed: no version
boundary, invisible divergence, no way to say what a build contained.

## Decision

The Obsidian plugin lives in its own repository and consumes the shared packages as
published npm dependencies.

This repository is the source of truth for everything editor-independent: parsing,
validation, language features, and the CodeMirror adaptation. The Obsidian
repository owns only what is Obsidian-specific — the view and its lifecycle, vault
persistence, plugin settings and commands, notices, and opening vault-relative and
external links.

The boundary has a practical test: behavior that another CodeMirror host would also
need belongs in `@gedcom/codemirror` in this repository, not in the plugin. When the
plugin turns out to hold such behavior, the fix is to move it down, not to duplicate
it.

The plugin keeps its own version, changelog, tags, and release workflow. Publishing
a shared package never releases the plugin.

## Consequences

Each side releases on the cadence its own ecosystem demands. Obsidian's review
process cannot delay a validator fix reaching VS Code, and a library release does
not force a plugin submission.

This repository's CI stays free of the Obsidian toolchain and mobile concerns, and
the plugin repository stays small enough to be reviewed as what it is: an
integration layer.

The costs are the ones a split always brings. A change that spans both takes two
pull requests in two repositories, in order, with a publish between them — which is
why the local `npm pack` tarball step exists, to validate the integration before the
version is permanent. Contributors must know where a given behavior belongs, and
that knowledge is exactly what the boundary test above is for.

Cross-repository work is coordinated through issues and pull requests. Durable
decisions remain documented in the repository that owns the affected boundary;
temporary cross-repository plans are not committed as project documentation.

## Alternatives considered

**Add `apps/obsidian` to this monorepo.** Consistent with the other hosts, one
checkout, atomic cross-cutting changes, no publish step in the middle. Rejected
because it drags a foreign release process and a mobile build target into a
repository whose CI already covers three platforms, and because the community plugin
review cycle would then gate a repository that also releases to npm and two
marketplaces.

**Keep copying shared sources into the plugin.** No registry dependency and no
publish ordering. Rejected for the reasons in
[0003](0003-independent-package-publishing.md): it was the status quo and it had
already produced silent divergence.

**A git submodule for the shared packages.** Keeps one source of truth without a
registry. Rejected because it offers no semver resolution, and because it makes the
plugin repository's checkout and CI markedly harder to reason about than an npm
dependency does.

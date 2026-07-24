# npm Package Publishing Design

## Goal

Publish the project's editor-independent GEDCOM libraries as public npm packages so that the standalone Obsidian repository can consume versioned releases instead of maintaining copied source code.

## Packages

The main `gedcom` repository remains the source of truth for two independently versioned packages:

- `gedcom-validator`
- `gedcom-language-service`

The unscoped package names stay concise and directly describe their GEDCOM-focused responsibilities. Package descriptions and keywords provide npm search discoverability.

Each package has its own version and changelog. `gedcom-language-service` declares a compatible released version range of `gedcom-validator`. npm workspaces continue to connect the local packages during monorepo development.

## Release Tags and Workflows

Releases use package-specific semantic-version tags:

- `validator-vX.Y.Z`
- `language-service-vX.Y.Z`

A dedicated GitHub Actions workflow handles each tag family. Before publishing, it:

1. Verifies that the tag version exactly matches the selected package's `package.json` version.
2. Installs dependencies from the lock file.
3. Runs linting, type checking, and tests relevant to the libraries.
4. Builds the selected package and its required workspace dependencies.
5. Inspects the package with `npm pack --dry-run` so only intended files are shipped.
6. Publishes the package publicly to npm.

Publishing uses npm Trusted Publishing through GitHub Actions OIDC, with provenance enabled automatically. The workflow uses a GitHub-hosted runner, a supported Node and npm version, `id-token: write`, and no long-lived npm publishing token.

Any version mismatch, failed check, failed build, or invalid package content stops the workflow before registry publication. npm package versions are immutable; correcting a failed release requires a new version rather than overwriting an existing publication.

## Initial npm Setup

The npm user `lavich` publishes the two unscoped packages publicly. Their availability is confirmed immediately before the first release, and the first public packages are published with `--access public`.

Authentication is completed by the user through npm's browser-based login and 2FA flow. Passwords and one-time codes are not shared. After the packages exist, each package is configured on npmjs.com with the main repository's publishing workflow as its Trusted Publisher. Traditional publishing tokens are not stored in GitHub.

## Obsidian Consumption

The standalone `lavich/gedcom-obsidian` repository removes its copied `packages/validator` and `packages/language-service` workspaces. Its application declares `gedcom-language-service` as a normal npm dependency. `gedcom-validator` is declared directly only if the Obsidian source imports its public API; otherwise it remains a transitive dependency.

The committed `package-lock.json` pins the complete resolved dependency graph, producing reproducible CI and release builds.

Dependabot checks npm dependencies weekly and opens version-update pull requests. Updates are not merged or released automatically. The Obsidian CI must pass type checking, tests, and a production bundle before a dependency update is merged.

Updating a shared library never creates an Obsidian release automatically. Obsidian retains its own version, changelog, release tag, and GitHub release workflow.

## Versioning Policy

The packages use independent semantic versions:

- Patch releases contain compatible fixes.
- Minor releases add backward-compatible public API features.
- Major releases contain breaking public API changes.

While a package is below `1.0.0`, consumers use a minor-pinned range such as `^0.1.0`; breaking changes require increasing the minor version. Dependency ranges in `gedcom-language-service` are updated whenever its minimum compatible validator version changes.

## Verification

The implementation is complete when:

- Both packages can be packed with only their runtime files, declarations, README, license, and package metadata.
- A clean external test project can install and import both public package formats.
- Main-repository applications continue to build and test through workspaces.
- The Obsidian repository builds and tests without copied shared package sources.
- Dependabot is configured for npm dependencies in the Obsidian repository.
- Release workflows reject mismatched tags and versions.
- Published packages show their public visibility and provenance on npmjs.com.

## Out of Scope

- Publishing `gedcom-lsp`; it remains an internal transport adapter.
- Automatically merging Dependabot pull requests.
- Automatically releasing Obsidian when a dependency changes.
- Git submodules, Git dependencies, GitHub Packages, or source-copy synchronization.

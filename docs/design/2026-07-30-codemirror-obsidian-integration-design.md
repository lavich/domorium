# CodeMirror Package and Obsidian Integration Design

- **Status:** In progress
- **Started:** 2026-07-30

The work proceeds in the order the sections below are written: prepare and validate
the package locally against a real tarball, publish it, then move the Obsidian
repository onto the published version. Release gates and the tarball requirement
are project-wide rules and live in [AGENTS.md](../../AGENTS.md).

## Goal

Publish the shared GEDCOM CodeMirror integration as
`@gedcom/codemirror@0.1.0`, validate the publishable artifact locally in the
standalone Obsidian plugin, and then release a plugin version that consumes the
published package.

The local validation and production installation paths must exercise the same
package contents and dependency boundaries.

## Scope

The main `domorium` repository remains the source of truth for editor-independent
GEDCOM behavior:

- `@gedcom/language-service` owns GEDCOM language features.
- `@gedcom/codemirror` adapts those features to CodeMirror 6.

The standalone `domorium-obsidian` repository owns only Obsidian integration:

- `GedcomView` and its lifecycle;
- vault persistence;
- plugin settings and commands;
- Obsidian notices;
- opening external URLs and vault-relative file links.

The Obsidian repository will remove its duplicated CodeMirror extensions,
position conversion, language-service lifecycle, and workspace-edit application.
Vault path resolution and link routing remain in the plugin because they depend
on host semantics.

## Package Boundary

`@gedcom/codemirror` must not import `obsidian` or know about vaults. Its public
API provides:

- `EditorLanguageService`;
- `createGedcomExtensions` and the standalone extension preset;
- position and range conversion;
- workspace-edit conversion and atomic application;
- definition, reference navigation, and rename commands;
- callback interfaces for applying edits and opening document links.

The Obsidian plugin constructs one `EditorLanguageService` per `GedcomView`,
creates its editor extensions through the package, and supplies host callbacks.
It adds its own CodeMirror update listener to synchronize the view with
Obsidian's `TextFileView` persistence lifecycle.

CodeMirror packages and `@lezer/highlight` remain peer dependencies of
`@gedcom/codemirror`. The plugin retains compatible direct CodeMirror
dependencies, and its esbuild configuration keeps CodeMirror external. This
ensures the plugin and shared package use the host's single CodeMirror runtime
instead of bundling a second copy.

## Editor Data Flow

1. `GedcomView` creates an `EditorLanguageService`.
2. `GedcomView.createState` applies the source document's line separator,
   installs `createGedcomExtensions`, and adds the Obsidian persistence listener.
3. Shared extensions update the language service from the current CodeMirror
   document snapshot.
4. Diagnostics, completion, hover, folding, semantic highlighting, definition
   navigation, and reference highlighting are derived from that snapshot.
5. Rename and quick-fix operations produce a versioned `WorkspaceEdit`.
6. `@gedcom/codemirror` validates the edit against the current document version
   and applies all changes in one CodeMirror transaction, preserving one-step
   undo.
7. Document-link navigation is sent to the plugin callback. The plugin opens
   HTTP links externally or resolves relative file links without allowing them
   to escape the vault.

Changing plugin settings rebuilds the editor state while retaining the document
and cursor position. LF and CRLF documents retain their original line separator.

## Error Handling

Stale, invalid, reversed, or overlapping workspace edits are rejected without
changing the document. An edit batch is either applied atomically or not
applied.

Failures in host callbacks must not break CodeMirror's lint or navigation UI.
The plugin reports host-specific failures, such as an unavailable vault file,
through an Obsidian `Notice`. Unsafe relative paths are not opened.

Before removing the plugin's duplicate implementations, tests in the shared
package will capture any behavior that exists only in the current plugin,
including completion-kind mapping, callback failure containment, reference
editing, atomic undo, and CRLF preservation.

## Package Preparation

`packages/codemirror/package.json` will be prepared for a public scoped package:

- remove `private`;
- retain version `0.1.0` for the initial release;
- add repository, homepage, bugs, license, author, and search metadata;
- include only `dist`, package metadata, README, CHANGELOG, and LICENSE;
- add `publishConfig.access: public`;
- add a `prepack` build;
- ensure the build first produces any required workspace dependency artifacts.

The package must expose working ESM, CommonJS, and TypeScript declaration
entries. `npm pack --dry-run` and the real tarball contents must agree with the
intended file list.

## Local Integration Flow

Local validation uses `npm pack`, not `npm link` or a direct source-directory
dependency. A tarball exercises the same exports, declarations, peer
dependencies, and included files as the npm release.

1. Run all relevant checks and build `@gedcom/codemirror`.
2. Create the package tarball.
3. Install that tarball in `domorium-obsidian` and commit its lockfile resolution
   only on the integration branch.
4. Replace plugin imports with `@gedcom/codemirror`.
5. Remove duplicated shared editor code and retain the Obsidian adapters.
6. Run the plugin's complete automated check.
7. Inspect the production bundle to confirm CodeMirror is not bundled twice.
8. Perform the manual Obsidian smoke test.

The temporary tarball dependency is not merged as the production dependency.

## Automated Verification

The main repository must pass:

- lint;
- TypeScript checks;
- unit tests;
- production package build;
- `npm pack --dry-run`;
- installation of the real tarball in a clean temporary consumer;
- ESM, CommonJS, and declaration-resolution checks from that consumer.

The Obsidian repository must pass:

- clean dependency installation;
- lint;
- TypeScript checks;
- unit tests;
- production build;
- bundle inspection for duplicated CodeMirror runtime code.

## Manual Obsidian Smoke Test

The local tarball build and final npm build are each tested for:

- opening, editing, saving, and reopening a GEDCOM file;
- diagnostics and quick fixes;
- completion;
- hover information;
- folding and indentation hints;
- definition and next-reference navigation;
- reference rename followed by a single undo;
- HTTP and vault-relative document links;
- settings changes;
- LF and CRLF preservation.

## npm Release

A package-specific GitHub Actions workflow responds only to tags matching
`codemirror-vX.Y.Z`. It:

1. checks that the tag version equals `packages/codemirror/package.json`;
2. installs dependencies from the committed lockfile;
3. runs the relevant repository checks;
4. builds the package and required workspace dependencies;
5. inspects the pack result;
6. publishes publicly with npm Trusted Publishing and provenance.

The workflow uses GitHub Actions OIDC and does not store a long-lived npm token.
The npm package must first be configured with that workflow as its Trusted
Publisher. A failed or incorrect release is corrected with a new package
version because published npm versions are immutable.

## Obsidian Production Release

After `@gedcom/codemirror@0.1.0` is available from npm:

1. replace the tarball dependency with
   `"@gedcom/codemirror": "^0.1.0"`;
2. regenerate the lockfile through a clean registry installation;
3. run the complete automated suite and repeat the manual smoke test;
4. update the plugin version, changelog, `manifest.json`, and `versions.json`;
5. release the plugin through its existing tag-based workflow.

Publishing the shared package does not automatically release the Obsidian
plugin. The plugin version is selected during implementation based on the
user-visible changes included in that release.

## Completion Criteria

The work is complete when:

- `@gedcom/codemirror@0.1.0` is publicly installable with npm provenance;
- its ESM, CommonJS, types, peer dependencies, and package contents are verified;
- the Obsidian plugin contains no duplicated shared CodeMirror integration;
- both tarball and registry installations pass the same automated and manual
  checks;
- the production bundle uses one CodeMirror runtime;
- the released plugin consumes `@gedcom/codemirror` from npm.

## Out of Scope

- moving Obsidian vault or UI behavior into the shared package;
- using `npm link`, Git dependencies, GitHub Packages, or copied source;
- automatically publishing Obsidian after a package release;
- unrelated editor or language-service refactoring.

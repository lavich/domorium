# CodeMirror Package and Obsidian Integration Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-30-codemirror-obsidian-integration-design.md`

**Repositories:**

- `/Users/user004/Projects/domorium`
- `/Users/user004/Projects/domorium-obsidian`

**Target releases:**

- `@gedcom/codemirror@0.1.0`
- A separately versioned Obsidian plugin release, selected after the integrated
  behavior is known.

## Working Rules

- Make package work in `domorium` before changing the Obsidian repository.
- Use a real `npm pack` tarball for local integration.
- Keep CodeMirror dependencies external and single-instanced.
- Preserve user changes in either worktree.
- Use focused commits at the checkpoints below.
- Do not create npm or Obsidian release tags until all automated and manual
  checks pass and the user explicitly approves publication.

## Task 1: Capture the Obsidian-only Shared Behavior in Package Tests

**Repository:** `domorium`

**Files:**

- Modify `packages/codemirror/src/extensions.test.ts`
- Modify `packages/codemirror/src/service.test.ts`
- Modify `packages/codemirror/src/commands.test.ts` if command coverage is the
  clearest location

**Steps:**

1. Compare the updated Obsidian implementations in:
   - `src/editor/extensions.ts`
   - `src/editor/service.ts`
   - `src/editor/referenceExtensions.test.ts`
2. Add failing or missing package tests for:
   - completion-kind mapping used by the current plugin;
   - callback failures not escaping lint/navigation handlers;
   - stale, invalid, reversed, and overlapping workspace edits;
   - atomic rename and one-step undo;
   - reference highlights after a selection change;
   - CRLF preservation where responsibility belongs to the shared API.
3. Run only the package tests:

   ```sh
   npm test --workspace packages/codemirror -- --run
   ```

4. Make the smallest shared-package changes needed for behavior parity.
5. Re-run the focused tests and typecheck:

   ```sh
   npm test --workspace packages/codemirror -- --run
   npm run typecheck --workspace packages/codemirror
   ```

**Checkpoint commit:**

```text
test(codemirror): cover Obsidian integration behavior
```

## Task 2: Prepare `@gedcom/codemirror` for Public Packaging

**Repository:** `domorium`

**Files:**

- Modify `packages/codemirror/package.json`
- Add `packages/codemirror/README.md`
- Add `packages/codemirror/CHANGELOG.md`
- Add `packages/codemirror/LICENSE`
- Modify `package-lock.json`

**Steps:**

1. Align package metadata with `@gedcom/language-service`:
   - remove `"private": true`;
   - retain version `0.1.0`;
   - add keywords, homepage, bugs, repository directory, license, author, and
     Node engine;
   - add `"publishConfig": { "access": "public" }`;
   - include `dist`, `package.json`, README, CHANGELOG, and LICENSE;
   - add `prepack`;
   - add a build-dependencies script if a clean package build requires
     `@gedcom/language-service` artifacts.
2. Document:
   - installation;
   - required CodeMirror peer dependencies;
   - `createGedcomExtensions`;
   - host callbacks;
   - the distinction between shared and standalone extensions.
3. State the initial `0.1.0` public API in the changelog.
4. Regenerate the root lockfile through npm.
5. Build and inspect:

   ```sh
   npm run build --workspace packages/codemirror
   npm pack --dry-run --workspace packages/codemirror
   ```

6. Verify that source, tests, coverage, and workspace-only files are absent from
   the tarball manifest.

**Checkpoint commit:**

```text
chore(codemirror): prepare public npm package
```

## Task 3: Add Release Automation and Package-Consumer Verification

**Repository:** `domorium`

**Files:**

- Modify `.github/workflows/release-npm.yml`
- Add a focused consumer verification script under
  `packages/codemirror/scripts/` if shell-only verification would be brittle
- Modify `packages/codemirror/package.json` if the script needs a package command

**Steps:**

1. Extend the release workflow tag filter with `codemirror-v*.*.*`.
2. Extend package selection with `codemirror`.
3. Reuse the existing checks for:
   - tag version equality;
   - tagged commit ancestry from `main`;
   - clean npm install;
   - repository verification;
   - package build;
   - pack inspection;
   - public Trusted Publishing.
4. Add a pre-publication consumer test that:
   - creates a temporary directory;
   - packs the workspace;
   - installs the tarball plus compatible CodeMirror peers;
   - imports the ESM entry;
   - requires the CommonJS entry;
   - compiles a TypeScript import using the declarations.
5. Ensure temporary output is outside the repository and cleaned up on success
   and failure.
6. Run the consumer test locally and lint any new scripts or workflow-adjacent
   code.

**Checkpoint commit:**

```text
ci: add codemirror npm release workflow
```

## Task 4: Produce and Record the Local Candidate Tarball

**Repository:** `domorium`

**Files:** no committed tarball

**Steps:**

1. Confirm both repositories are clean before integration.
2. Run the complete TypeScript-side quality gate:

   ```sh
   npm run check:typescript
   npm run build --workspace packages/codemirror
   npm pack --dry-run --workspace packages/codemirror
   ```

3. Pack into a dedicated temporary directory, not into either worktree.
4. Record:
   - tarball absolute path;
   - SHA-256 checksum;
   - `npm pack --json` file manifest.
5. Use that exact immutable tarball for all first-pass Obsidian work.

No commit is created for the tarball.

## Task 5: Integrate the Tarball into Obsidian

**Repository:** `domorium-obsidian`

**Files:**

- Modify `package.json`
- Modify `package-lock.json`
- Modify `src/GedcomView.ts`
- Modify or replace `src/editor/service.ts`
- Delete `src/editor/extensions.ts`
- Delete `src/editor/positions.ts`
- Delete or rewrite tests that only test deleted duplicates
- Add focused tests for the retained Obsidian adapters

**Steps:**

1. Install the candidate tarball as `@gedcom/codemirror`.
2. Keep compatible direct `@codemirror/*` dependencies because they satisfy the
   package peers and Obsidian/esbuild externals.
3. Update `GedcomView` to import:
   - `EditorLanguageService`;
   - `createGedcomExtensions`;
   - shared commands and coordinate helpers where appropriate;
   - shared workspace-edit application.
4. Preserve these host-owned responsibilities:
   - `EditorState.lineSeparator`;
   - `EditorView.updateListener` and `requestSave`;
   - vault-relative path safety;
   - HTTP and vault file opening;
   - Obsidian `Notice` messages;
   - view settings and lifecycle.
5. Delete the duplicate extension, position, and language-service code after all
   callers have moved.
6. Rewrite tests so package behavior is not retested in the plugin. Retain tests
   for:
   - vault-relative path resolution;
   - routing to external URLs versus vault files;
   - unsafe path rejection;
   - Obsidian adapter behavior.
7. Run:

   ```sh
   npm run check
   ```

8. Inspect `dist/main.js` and the esbuild metafile or equivalent build evidence
   to confirm the shared package did not embed a second CodeMirror runtime.

**Checkpoint commit:**

```text
refactor: consume shared CodeMirror package
```

The commit may temporarily reference the local tarball only on the integration
branch. It is not the production dependency commit.

## Task 6: Run the Local Obsidian Smoke Test

**Repository:** `domorium-obsidian`

**Prerequisite:** the candidate tarball integration passes `npm run check`.

**Steps:**

1. Install the production build into a disposable Obsidian test vault.
2. Test:
   - open, edit, save, close, and reopen a GEDCOM file;
   - diagnostics and each relevant quick-fix path;
   - completion and hover;
   - folding and indentation hints;
   - definition and next-reference navigation;
   - rename followed by one undo;
   - HTTP link opening;
   - valid and invalid vault-relative links;
   - settings changes without losing text or cursor;
   - LF and CRLF files.
3. Record any regression with a minimal reproducible fixture.
4. Fix shared defects in `domorium`, repack a new checksum-addressed candidate,
   reinstall it, and repeat Tasks 4–6.
5. Fix only host-specific defects in `domorium-obsidian`.

**Gate:** ask the user to approve npm publication after the smoke-test report.

## Task 7: Publish `@gedcom/codemirror@0.1.0`

**External state change — requires explicit user approval.**

**Repository:** `domorium`

**Steps:**

1. Merge the package changes to `main` and confirm CI is green.
2. Confirm `@gedcom/codemirror` exists in the npm `@gedcom` scope or perform the
   required first-package setup without sharing credentials or 2FA codes.
3. Configure `.github/workflows/release-npm.yml` as the npm Trusted Publisher for
   `@gedcom/codemirror`.
4. Create and push the immutable tag:

   ```text
   codemirror-v0.1.0
   ```

5. Monitor the release workflow through completion.
6. Verify npm visibility, version, provenance, dependency metadata, and packed
   files.
7. Install the registry package into a fresh temporary consumer and repeat the
   ESM/CommonJS/types checks.

## Task 8: Replace the Tarball with the Registry Dependency

**Repository:** `domorium-obsidian`

**Files:**

- Modify `package.json`
- Modify `package-lock.json`

**Steps:**

1. Replace the tarball specifier with:

   ```json
   "@gedcom/codemirror": "^0.1.0"
   ```

2. Delete `node_modules` only after resolving its exact repository-local path,
   then run a clean `npm ci` from the regenerated lockfile.
3. Run:

   ```sh
   npm run check
   ```

4. Repeat the bundle inspection.
5. Repeat the manual smoke test against the registry installation.
6. Verify the lockfile contains the npm registry package and its integrity hash,
   with no local file path.

**Checkpoint commit:**

```text
chore: use published CodeMirror package
```

## Task 9: Prepare and Release the Obsidian Plugin

**Repository:** `domorium-obsidian`

**Files:**

- Modify `package.json`
- Modify `package-lock.json`
- Modify `manifest.json`
- Modify `versions.json`
- Modify `CHANGELOG.md`

**Steps:**

1. Select the plugin version:
   - patch if behavior is intentionally unchanged and the release is only the
     internal package migration;
   - minor if the final integration includes user-visible editor improvements.
2. Keep all version-bearing files consistent.
3. Describe the user-visible changes in the changelog; do not expose internal
   migration detail as a feature unless useful to maintainers.
4. Run a clean:

   ```sh
   npm ci
   npm run check
   ```

5. Inspect the release artifact contents.
6. Merge to `main` and confirm CI.
7. Ask for explicit user approval before creating and pushing the plugin tag.
8. Monitor the existing release workflow.
9. Verify the GitHub release assets and perform a final install from those
   assets in the test vault.

## Final Evidence

The completion report must include:

- main-repository commits and CI result;
- Obsidian-repository commits and CI result;
- npm package URL, version, and provenance status;
- tarball and registry consumer-test results;
- automated test/build results for both repositories;
- bundle single-runtime evidence;
- manual smoke-test checklist;
- Obsidian release tag and asset verification.

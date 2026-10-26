## Why

Rename a photograph in Obsidian and the `OBJE.FILE` payloads that name it follow. Rename it in VS Code or a JetBrains IDE and they break: the shared layer can write the edit, and no host but Obsidian asks for it. Reported as lavich/domorium#260. Its prerequisite #188 is merged (#451): `moveFileLinks` now refuses a move the dialect cannot write instead of writing it.

## The requirement, as the user decided it

2026-10-26, three decisions.

- How to wire it: **"LSP willRenameFiles (Recommended)"** — the standard `workspace/willRenameFiles` request in the shared language server, rather than `workspace.onDidRenameFiles` in the VS Code client as the issue proposed.
- What to tell the reader about what was not rewritten: **"Отказы + закрытые .ged (Recommended)"** — warn about open documents that could not be rewritten (the #188 refusal) and about closed GEDCOM files in the workspace that were not checked; say nothing when there is nothing to say.

- On the known gaps the review found — closed files in JetBrains, absolute payloads, folder renames, renames outside the editor — **"Вернуть на доработку (Recommended)"**, whose meaning was: keep this scope, name each gap in the design and the hosts' READMEs, and file an issue for each.

## What Changes

- `packages/language-server` registers `workspace.fileOperations.willRename` for files and answers `workspace/willRenameFiles` with one `WorkspaceEdit` covering every open GEDCOM document that names a renamed file, or `null` when none does. Each document's old and new paths come from `moveFileLinks`, relative to the document's folder before and after the rename. The host applies the edit together with the rename.
- Where an open document names the file but cannot be made to name its new place, the server leaves it out, answers the edit for the others, and shows one warning naming the documents left unchanged.
- `@domorium/language-service` gains `mentionsFile(text, path)`: whether a line of a GEDCOM text ends in a file's name, as written or percent-escaped. It joins the unreleased 2.3.0.
- The VS Code client, once a rename has happened, counts the workspace's closed GEDCOM files that mention a renamed file's name, and if any do, shows one warning saying they may still name it.

## Capabilities

### New Capabilities

- `language-server/file-rename`: rewriting, when a file is renamed or moved in the editor, the `FILE` payloads of open GEDCOM documents that name it, and reporting the documents that could not be rewritten.
- `vscode/file-rename-closed-documents`: telling the reader that closed GEDCOM files in the workspace may still name a renamed file.
- `language-service/file-mention`: whether a GEDCOM text mentions a file by name, without parsing it.

### Modified Capabilities

None. `language-service/file-link-move` (being archived by #452) is used, not changed.

## Impact

- Layers: `packages/language-server` (adapter) gains a request handler and URI-to-path arithmetic; `packages/language-service` gains a pure text query; `apps/vscode` gains a rename listener calling it through the `language-server` re-export. Dependencies still point down.
- Hosts: VS Code (desktop and web) gets the rewrite and both warnings. JetBrains gets the rewrite and the refusal warning: LSP4IJ 0.20.1 sends `workspace/willRenameFiles` from a VFS listener and applies the answer if it comes within 500 ms (verified in its bytecode by review). It gets no closed-file warning. The web editor and Obsidian are unchanged.
- Releases: `apps/vscode` and `apps/jetbrains` need a version and a changelog entry when this ships, written in their release PR.

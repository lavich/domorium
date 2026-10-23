---
name: feature-flow
description: Use when the user asks for a new capability or a substantial change "through our flow", "via openspec", "with agent review", or invokes feature-flow — any Domorium change that should go from idea to merge through an OpenSpec proposal, an Orca worktree and independent reviews.
---

# Feature flow: OpenSpec → Orca worktree → cross-review

[AGENTS.md](../../../AGENTS.md) and [openspec/config.yaml](../../../openspec/config.yaml)
hold the project rules this flow relies on — layers, invariants, the check gate,
commits, comments, documentation. Read them first; this skill only orders the work.

Every edit, commit and push in this flow happens in an Orca worktree — the plan,
the implementation, fixes after review. The main checkout stays on `main` and only
pulls. To continue a branch that already exists on the remote:
`orca worktree create --name <name> --no-parent --setup run --base-branch origin/<branch> --json`,
then push with `git push origin HEAD:<branch>` — Orca names the local branch
differently.

Report to the user briefly, in their language. Decisions that change what a user of
an editor host sees — diagnostics, quick fixes, hover, the site — are the user's.

## 1. Discussion

- Ground the request in the code, the GEDCOM specification and the conformance
  corpora: numbers and `file:line`, not impressions. Offer 2–3 options with a
  recommendation, naming the layers and editor hosts each touches.
- Record the user's decision verbatim with its date; it goes into the proposal.

## 2. Plan: OpenSpec in an Orca worktree

- Worktree from a fresh `main`:
  `orca worktree create --name <change> --no-parent --setup run --json`.
- Create the change with the `openspec-propose` skill: `openspec new change <name>`,
  then proposal, design, specs and tasks, each from
  `openspec instructions <artifact> --change <name> --json`. Artifacts are in
  English with SHALL/MUST. The proposal keeps the user's requirement apart from the
  proposed scope; every task names its check.
- If the change depends on another open change, say so and give the archive order
  in the first line of `tasks.md`. A MODIFIED requirement restates the full text as
  it stands after the change that archives first.
- A decision expensive to reverse also gets an ADR from `docs/adr/template.md`.
- `openspec validate <name> --strict` and
  `npx prettier --check openspec/changes/<name>` pass.
- Worktree status: `orca worktree set --worktree path:<path> --comment "…" --json`.

## 3. Cross-review of the plan

- An independent reviewer — a subagent or a separate agent session (for example
  `orca worktree create --agent codex`) — strictly read-only, scratch files outside
  the repository. Its task: check every claim of the plan against the code
  (`file:line`); find gaps, contradictions between artifacts, overlaps with other
  open changes in `openspec/changes/`, and breaches of the AGENTS.md invariants,
  `docs/architecture.md` or an accepted ADR. Output: Blocking / Serious / Minor, each
  with a failure scenario and a fix.
- Verify the most surprising findings yourself. Take contested decisions to the
  user, fix the rest; review again if the fixes are large.
- The plan may land on `main` as its own PR (only `openspec/changes/<name>`), and
  only with the user's permission.

## 4. Implementation

- A fresh worktree from `main`; if `main` has moved on, `git rebase origin/main`
  before starting.
- Run the tests before touching anything. Work through `tasks.md` in order, a test
  with each task; record deviations from the design under an "Implementation"
  heading in `design.md`; tick `- [x]`.
- After changing a lower-layer package, rebuild it before testing its consumers.
- The gate is `npm run check`. Say whether `check:jetbrains` ran or was skipped for
  lack of a JDK. A changed diagnostic also needs `npm run check:conformance`,
  re-recorded with `-- --update` and the diff read.
- A changed screen in `apps/web-editor`: check it with a screenshot from a temporary
  script, then delete the script. Stale photographs under `public/shots` are retaken
  with [the runbook](../../../apps/web-editor/scripts/shots/README.md).
- Before the PR, run the pass in [docs/prompts/docs-sync.md](../../../docs/prompts/docs-sync.md).

## 5. Cross-review of the code

- Two independent reviewers in parallel, split by area — for example the shared
  packages (`validator`, `language-service`, layering and invariants) and the
  adapters and hosts (`language-server`, `codemirror`, `apps/*`, tests, docs) —
  read-only, over the uncommitted diff.
- Prove each blocking finding with a test that fails without the fix and passes
  with it. Fix, then the full gate again.

## 6. PR and merge

- Commit, `git push`, `gh pr create` with what was done, the checks run, and what
  is left (usually a check inside a real editor host).
- Merge only on the user's explicit permission for this PR. Permission for an
  earlier task or PR does not carry over. Watch `gh pr checks <n> --watch` in the
  background, report the result and wait. With permission and every check passing:
  `gh pr merge <n> --squash`.
- After the merge: `git pull --ff-only` in the main checkout, worktree status
  `completed`; remove merged worktrees with `orca worktree rm` once they hold no
  uncommitted changes.
- Archive the change in its own PR: `openspec archive <name>`, committed as
  `chore(openspec): archive <name>`.
- If the change should ship, say which release units need a version bump and a
  changelog entry. Never create or push a release tag without explicit approval.

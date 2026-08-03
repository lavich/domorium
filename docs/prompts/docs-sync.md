# Prompt: documentation sync

A prompt for any coding assistant, kept as plain Markdown so it is not tied to one
tool. Paste it, or reference this file.

Use it before opening a pull request, after `npm run check:docs` passes. That script
catches mechanical drift — unformatted or lint-failing Markdown, a broken link or
anchor, a missing README, a version with no changelog entry, an ADR missing from the
index. This prompt covers what a script cannot judge: whether the words are still
true. Code examples fall entirely on this side of the line — nothing verifies them.

---

Compare this branch against `main` and find places where the code and the
documentation disagree. Work from the diff, not from assumptions.

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

Check each of the following and report what you find before changing anything:

1. **Public API.** For every package whose exports changed, does its `README.md`
   still describe the current API? Check every identifier the example imports against
   the package's `src/index.ts` — no tooling does this, so a renamed export survives
   in the documentation until someone reads it. Then ask the harder question: is the
   example still the way you would actually use the API, or merely still valid?

2. **Layer boundaries.** Did any change alter what depends on what, or move behavior
   between packages? If so, `docs/architecture.md` needs updating — including the
   dependency diagram and the invariants list.

3. **Invariants.** Does the diff violate anything listed under Invariants in
   `AGENTS.md` or `docs/architecture.md`? A violation is usually a sign the code is
   at the wrong layer, not that the invariant is wrong. Report it rather than
   quietly relaxing the document.

4. **Decisions.** Does the diff embody a choice that would be expensive to reverse —
   a boundary, a format, a protocol, a release mechanism, a dependency commitment?
   If yes, it needs an ADR in `docs/adr/`, written from the template. If it
   contradicts an existing ADR, that record is superseded by a new one; existing
   records are never edited.

5. **Temporary planning.** Did brainstorming or an implementation plan produce
   reasoning that outlives the task? Record durable decisions in an ADR,
   structural facts in `docs/architecture.md`, and user-visible changes in the
   relevant `CHANGELOG.md`. Do not commit the temporary planning document itself.

6. **Contributor-facing commands.** Did any script, check, or build step change in a
   way that makes `CONTRIBUTING.md` or a README wrong?

7. **Stale claims.** Look for documentation that was true when written and is not
   now: counts, file paths, "currently", "not yet supported", "planned".

Then make the smallest set of edits that makes the documentation true. Do not add
documentation the change does not require — volume is not the goal. Finish by running
`npm run check:docs`.
